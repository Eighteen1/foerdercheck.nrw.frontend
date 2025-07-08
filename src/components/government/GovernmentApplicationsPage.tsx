import React, { useEffect, useState } from "react";
import { Table, Button, ButtonGroup, Form, Spinner, Alert, Dropdown, Modal } from "react-bootstrap";
import { supabase } from "../../lib/supabase";
import { useNavigate } from 'react-router-dom';
import { sendApplicationAssignedMessage, sendApplicationReassignedMessage, sendApplicationUnassignedMessage, sendSharedApplicationMessage } from '../../utils/messages';

// Add CSS styling for checkboxes
const styles = `
  .form-check-input:checked {
    background-color: #064497 !important;
    border-color: #064497 !important;
  }
`;

// Add style tag to document head
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

const STATUS_LABELS = {
  new: "Neue Anträge",
  in_progress: "In Bearbeitung",
  document_requested: "In Bearbeitung",
  document_received: "In Bearbeitung",
  rejected: "Geprüfte Anträge",
  approved: "Geprüfte Anträge",
};

const IN_PROGRESS_STATUSES = ["in_progress", "document_requested", "document_received"];
const FINISHED_STATUSES = ["rejected", "approved"];

const DEFAULT_AGENT_TEXT = "Nicht zugewiesen";

const TYPE_LABELS: Record<string, string> = {
  "neubau": "Neubau Eigenheim",
  "ersterwerb-eigenheim": "Ersterwerb Eigenheim",
  "bestandserwerb-eigenheim": "Bestandserwerb Eigenheim",
  "bestandserwerb-wohnung": "Bestandserwerb Eigentumswohnung",
  "ersterwerb-wohnung": "Ersterwerb Eigentumswohnung",
  "nutzungsaenderung": "Nutzungsänderung"
};



function formatDate(dateString: string) {
  if (!dateString) return "-";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

const cardShadow = "0 2px 8px rgba(0,0,0,0.08)";

interface GovernmentApplicationsPageProps {
  onSelectApplication?: (applicationId: string) => void;
}

const GovernmentApplicationsPage: React.FC<GovernmentApplicationsPageProps> = ({ onSelectApplication }) => {
  const [activeTab, setActiveTab] = useState<"new" | "in_progress" | "finished">("new");
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ new: 0, in_progress: 0, finished: 0 });
  const [filters, setFilters] = useState({
    id: "",
    submitted_at: "",
    updated_at: "",
    review_progress: "",
    status: "",
    type: "",
    assigned_agent: "",
    finished_at: "",
    result: "",
  });
  const [agents, setAgents] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [agentMap, setAgentMap] = useState<Record<string, { name: string; email: string }>>({});
  const [selectedApplicationIds, setSelectedApplicationIds] = useState<string[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchType, setSearchType] = useState<"id" | "name" | "email" | "phone" | "address">("id");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchCommitted, setSearchCommitted] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [userRole, setUserRole] = useState<'admin' | 'agent' | 'readonly' | 'owner'>('readonly');
  const [hasExistingAssignments, setHasExistingAssignments] = useState(false);
  const [existingAssignments, setExistingAssignments] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedShareAgents, setSelectedShareAgents] = useState<any[]>([]);
  const [shareAgentToAdd, setShareAgentToAdd] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const navigate = useNavigate();

  // Load current user and agents for their city
  useEffect(() => {
    const fetchUserAndAgents = async () => {
      const session = await supabase.auth.getSession();
      const userObj = session?.data?.session?.user;
      setUser(userObj);
      if (!userObj) return;
      // Get agent row for current user
      const { data: agentData } = await supabase
        .from("agents")
        .select("id, city_id")
        .eq("id", userObj.id)
        .single();
      const cityId = agentData?.city_id;
      if (!cityId) return;
      // Get all agents for this city
      const { data: allAgents } = await supabase
        .from("agents")
        .select("id, name, email")
        .eq("city_id", cityId);
      setAgents(allAgents || []);
      // Build map for quick lookup
      const map: Record<string, { name: string; email: string }> = {};
      (allAgents || []).forEach(a => {
        map[a.id] = { name: a.name, email: a.email };
      });
      setAgentMap(map);
    };
    fetchUserAndAgents();
  }, []);

  useEffect(() => {
    const fetchApplications = async () => {
      setLoading(true);
      try {
        // First fetch applications
        const { data: apps, error: appsError } = await supabase
          .from("applications")
          .select("id, status, submitted_at, updated_at, review_progress, type, assigned_agent, finished_at, resident_id")
          .order("submitted_at", { ascending: false });

        if (appsError) throw appsError;

        // Then fetch user data for all applications
        const residentIds = apps?.map(app => app.resident_id).filter(Boolean) || [];
        const { data: userData, error: userError } = await supabase
          .from("user_data")
          .select("id, firstname, lastname, email, phone")
          .in("id", residentIds);

        if (userError) throw userError;

        // Fetch object data for all applications
        const { data: objectData, error: objectError } = await supabase
          .from("object_data")
          .select("user_id, obj_street, obj_house_number, obj_postal_code, obj_city")
          .in("user_id", residentIds);

        if (objectError) throw objectError;

        // Create maps for quick lookup
        const userMap = new Map(userData?.map(user => [user.id, user]) || []);
        const objectMap = new Map(objectData?.map(obj => [obj.user_id, obj]) || []);

        // Combine the data
        const combinedData = apps?.map(app => ({
          ...app,
          user_data: userMap.get(app.resident_id),
          object_data: objectMap.get(app.resident_id)
        })) || [];

        setApplications(combinedData);
      } catch (error) {
        console.error("Error fetching applications:", error);
        setApplications([]);
      } finally {
        setLoading(false);
      }
    };
    fetchApplications();
  }, []);

  useEffect(() => {
    // Calculate counts for each tab
    const newCount = applications.filter((a) => a.status === "new").length;
    const inProgressCount = applications.filter((a) => IN_PROGRESS_STATUSES.includes(a.status)).length;
    const finishedCount = applications.filter((a) => FINISHED_STATUSES.includes(a.status)).length;
    setCounts({ new: newCount, in_progress: inProgressCount, finished: finishedCount });
  }, [applications]);

  // Get unique types and agent IDs from applications for dropdowns
  const typeOptions = Array.from(new Set(applications.map(a => a.type).filter(Boolean)));
  const agentOptions = Array.from(new Set(applications.map(a => a.assigned_agent).filter(Boolean)));

  // Filter applications for the active tab
  const filteredApplications = applications
    .filter((a) => {
      if (activeTab === "new") return a.status === "new";
      if (activeTab === "in_progress") return IN_PROGRESS_STATUSES.includes(a.status);
      if (activeTab === "finished") return FINISHED_STATUSES.includes(a.status);
      return false;
    })
    .filter((a) => {
      // Column filters
      return (
        (!filters.id || a.id?.toLowerCase().includes(filters.id.toLowerCase())) &&
        (!filters.submitted_at || (a.submitted_at && formatDate(a.submitted_at).includes(filters.submitted_at))) &&
        (activeTab !== "in_progress" || !filters.updated_at || (a.updated_at && formatDate(a.updated_at).includes(filters.updated_at))) &&
        (activeTab === "finished" ? (!filters.finished_at || (a.finished_at && formatDate(a.finished_at).includes(filters.finished_at))) : true) &&
        (activeTab === "finished" ? (!filters.result || (filters.result === "approved" && a.status === "approved") || (filters.result === "rejected" && a.status === "rejected")) : true) &&
        (activeTab !== "in_progress" || !filters.review_progress || (() => {
          const val = Number(a.review_progress) || 0;
          if (!filters.review_progress) return true;
          const [min, max] = filters.review_progress.split("-").map(Number);
          return val >= min && val <= max;
        })()) &&
        (activeTab !== "in_progress" || !filters.status || a.status === filters.status) &&
        (!filters.type || a.type === filters.type) &&
        (!filters.assigned_agent || a.assigned_agent === filters.assigned_agent)
      );
    });

  // Checkbox logic
  const allSelected = filteredApplications.length > 0 && filteredApplications.every(app => selectedApplicationIds.includes(app.id));
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedApplicationIds(filteredApplications.map(app => app.id));
    } else {
      setSelectedApplicationIds([]);
    }
  };
  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedApplicationIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id));
  };

  // Layout constants
  const cardWidth = "32%";
  const cardGap = "2%";

  const progressOptions = [
    { label: "0-20%", value: "0-20" },
    { label: "21-40%", value: "21-40" },
    { label: "41-60%", value: "41-60" },
    { label: "61-80%", value: "61-80" },
    { label: "81-100%", value: "81-100" },
  ];
  const statusOptions = [
    { label: "In Bearbeitung", value: "in_progress" },
    { label: "Dokumente angefragt", value: "document_requested" },
    { label: "Dokumente erhalten", value: "document_received" },
  ];

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchCommitted(true);
    setSearchLoading(true);
    try {
      let query;
      
      // First, find matching user_data or object_data based on search type
      switch (searchType) {
        case "id":
          // Direct search in applications table
          const { data: appData, error: appError } = await supabase
            .from("applications")
            .select("id, status, submitted_at, type, resident_id")
            .ilike("id", `%${searchQuery}%`);
          
          if (appError) throw appError;
          query = appData;
          break;

        case "name":
          // Search in user_data first
          const { data: nameData, error: nameError } = await supabase
            .from("user_data")
            .select("id")
            .or(`firstname.ilike.%${searchQuery}%,lastname.ilike.%${searchQuery}%`);
          
          if (nameError) throw nameError;
          if (!nameData?.length) {
            setSearchResults([]);
            return;
          }
          
          // Then get applications for these users
          const { data: nameAppData, error: nameAppError } = await supabase
            .from("applications")
            .select("id, status, submitted_at, type, resident_id")
            .in("resident_id", nameData.map(u => u.id));
          
          if (nameAppError) throw nameAppError;
          query = nameAppData;
          break;

        case "email":
          // Search in user_data first
          const { data: emailData, error: emailError } = await supabase
            .from("user_data")
            .select("id")
            .ilike("email", `%${searchQuery}%`);
          
          if (emailError) throw emailError;
          if (!emailData?.length) {
            setSearchResults([]);
            return;
          }
          
          // Then get applications for these users
          const { data: emailAppData, error: emailAppError } = await supabase
            .from("applications")
            .select("id, status, submitted_at, type, resident_id")
            .in("resident_id", emailData.map(u => u.id));
          
          if (emailAppError) throw emailAppError;
          query = emailAppData;
          break;

        case "phone":
          // Search in user_data first
          const { data: phoneData, error: phoneError } = await supabase
            .from("user_data")
            .select("id")
            .ilike("phone", `%${searchQuery}%`);
          
          if (phoneError) throw phoneError;
          if (!phoneData?.length) {
            setSearchResults([]);
            return;
          }
          
          // Then get applications for these users
          const { data: phoneAppData, error: phoneAppError } = await supabase
            .from("applications")
            .select("id, status, submitted_at, type, resident_id")
            .in("resident_id", phoneData.map(u => u.id));
          
          if (phoneAppError) throw phoneAppError;
          query = phoneAppData;
          break;

        case "address":
          // Search in object_data first
          const { data: addressData, error: addressError } = await supabase
            .from("object_data")
            .select("user_id")
            .or(
              `obj_street.ilike.%${searchQuery}%,` +
              `obj_house_number.ilike.%${searchQuery}%,` +
              `obj_postal_code.ilike.%${searchQuery}%,` +
              `obj_city.ilike.%${searchQuery}%`
            );
          
          if (addressError) throw addressError;
          if (!addressData?.length) {
            setSearchResults([]);
            return;
          }
          
          // Then get applications for these users
          const { data: addressAppData, error: addressAppError } = await supabase
            .from("applications")
            .select("id, status, submitted_at, type, resident_id")
            .in("resident_id", addressData.map(o => o.user_id));
          
          if (addressAppError) throw addressAppError;
          query = addressAppData;
          break;
      }

      if (!query?.length) {
        setSearchResults([]);
        return;
      }

      // Get user data for all found applications
      const residentIds = query.map(app => app.resident_id).filter(Boolean);
      const { data: userData, error: userError } = await supabase
        .from("user_data")
        .select("id, firstname, lastname, email, phone")
        .in("id", residentIds);

      if (userError) throw userError;

      // Get object data for all found applications
      const { data: objectData, error: objectError } = await supabase
        .from("object_data")
        .select("user_id, obj_street, obj_house_number, obj_postal_code, obj_city")
        .in("user_id", residentIds);

      if (objectError) throw objectError;

      // Create maps for quick lookup
      const userMap = new Map(userData?.map(user => [user.id, user]) || []);
      const objectMap = new Map(objectData?.map(obj => [obj.user_id, obj]) || []);

      // Combine the data
      const combinedResults = query.map(app => ({
        ...app,
        user_data: userMap.get(app.resident_id),
        object_data: objectMap.get(app.resident_id)
      }));

      setSearchResults(combinedResults);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Add this effect to clear search results when searchQuery is empty
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      setSearchCommitted(false);
    }
  }, [searchQuery]);

  // Add this after the existing useEffect hooks
  useEffect(() => {
    const fetchUserRole = async () => {
      const session = await supabase.auth.getSession();
      const userObj = session?.data?.session?.user;
      if (!userObj) return;
      
      const { data: agentData } = await supabase
        .from("agents")
        .select("role")
        .eq("id", userObj.id)
        .single();
        
      if (agentData) {
        setUserRole(agentData.role);
      }
    };
    
    fetchUserRole();
  }, []);

  // Add this function to check for existing assignments
  const checkExistingAssignments = () => {
    const appsWithAssignments = filteredApplications
      .filter(app => selectedApplicationIds.includes(app.id) && app.assigned_agent)
      .map(app => app.id);
      
    setHasExistingAssignments(appsWithAssignments.length > 0);
    setExistingAssignments(appsWithAssignments);
  };

  // Add this function to handle assignment
  const handleAssign = async () => {
    if (!selectedAgent || selectedApplicationIds.length === 0) return;

    setIsAssigning(true);
    try {
      // Get current assignments for all selected applications
      const { data: currentAssignments, error: assignmentsError } = await supabase
        .from('applications')
        .select('id, assigned_agent')
        .in('id', selectedApplicationIds);

      if (assignmentsError) throw assignmentsError;

      // Process each application individually
      for (const application of currentAssignments) {
        const oldAgentId = application.assigned_agent;
        const newAgentId = selectedAgent === 'unassign' ? null : selectedAgent;

        // Update the assignment
        const { error: updateError } = await supabase
          .from('applications')
          .update({ assigned_agent: newAgentId })
          .eq('id', application.id);

        if (updateError) throw updateError;

        // Send appropriate messages based on the assignment change
        if (newAgentId) {
          // Case 1: New assignment
          if (!oldAgentId) {
            await sendApplicationAssignedMessage(newAgentId, user?.id || '', application.id);
          }
          // Case 2: Reassignment
          else {
            await sendApplicationReassignedMessage(oldAgentId, newAgentId, user?.id || '', application.id);
          }
        }
        // Case 3: Unassignment
        else if (oldAgentId) {
          await sendApplicationUnassignedMessage(oldAgentId, user?.id || '', application.id);
        }
      }

      // Refresh the applications list
      const { data: apps, error: appsError } = await supabase
        .from("applications")
        .select("id, status, submitted_at, updated_at, review_progress, type, assigned_agent, finished_at, resident_id")
        .order("submitted_at", { ascending: false });
        
      if (appsError) throw appsError;
      
      setApplications(apps || []);
      setSelectedApplicationIds([]);
      setSelectedAgent('');
      setShowAssignModal(false);
    } catch (err) {
      console.error('Error assigning applications:', err);
    } finally {
      setIsAssigning(false);
    }
  };

  // Helper for plural/singular
  const getShareIntro = (agentName: string, appIds: string[]) => {
    if (appIds.length === 1) {
      return `Ein Team-Mitglied hat den Antrag "${appIds[0]}" mit folgender Nachricht an Sie geteilt:`;
    } else {
      return `Ein Team-Mitglied hat die Anträge ${appIds.map(id => `"${id}"`).join(", ")} mit folgender Nachricht an Sie geteilt:`;
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Top status cards */}
      <div style={{ display: "flex", gap: cardGap, marginBottom: 24, width: "100%", justifyContent: "space-between" }}>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            background: activeTab === "new" ? "#eaf1fd" : "#fff",
            color: activeTab === "new" ? "#064497" : "#222",
            borderRadius: 16,
            boxShadow: cardShadow,
            padding: "24px 0 20px 0",
            textAlign: "center",
            cursor: "pointer",
            border: activeTab === "new" ? "2px solid #1976d2" : "1px solid #e0e0e0",
            fontWeight: 400,
            fontSize: 22,
            transition: "all 0.15s"
          }}
          onClick={() => {
            setActiveTab("new");
            setSelectedApplicationIds([]);
          }}
        >
          Neue Anträge <span style={{ fontWeight: 500, fontSize: 22, marginLeft: 8 }}>{counts.new}</span>
        </div>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            background: activeTab === "in_progress" ? "#eaf1fd" : "#fff",
            color: activeTab === "in_progress" ? "#064497" : "#222",
            borderRadius: 16,
            boxShadow: cardShadow,
            padding: "24px 0 20px 0",
            textAlign: "center",
            cursor: "pointer",
            border: activeTab === "in_progress" ? "2px solid #1976d2" : "1px solid #e0e0e0",
            fontWeight: 400,
            fontSize: 22,
            transition: "all 0.15s"
          }}
          onClick={() => {
            setActiveTab("in_progress");
            setSelectedApplicationIds([]);
          }}
        >
          In Bearbeitung <span style={{ fontWeight: 500, fontSize: 22, marginLeft: 8 }}>{counts.in_progress}</span>
        </div>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            background: activeTab === "finished" ? "#eaf1fd" : "#fff",
            color: activeTab === "finished" ? "#064497" : "#222",
            borderRadius: 16,
            boxShadow: cardShadow,
            padding: "24px 0 20px 0",
            textAlign: "center",
            cursor: "pointer",
            border: activeTab === "finished" ? "2px solid #1976d2" : "1px solid #e0e0e0",
            fontWeight: 400,
            fontSize: 22,
            transition: "all 0.15s"
          }}
          onClick={() => {
            setActiveTab("finished");
            setSelectedApplicationIds([]);
          }}
        >
          Geprüfte Anträge <span style={{ fontWeight: 500, fontSize: 22, marginLeft: 8 }}>{counts.finished}</span>
        </div>
      </div>

      {/* Header row above table container */}
      <div className="d-flex align-items-center justify-content-between mb-0" style={{ width: "100%" }}>
        <h4 style={{ color: "#000000", fontWeight: 600, marginBottom: 0, marginLeft: 12 }}>Übersicht</h4>
        <div className="d-flex align-items-center gap-2">
          <Button 
            variant="link" 
            style={{ color: "#064497", fontSize: 22 }}
            onClick={() => setShowSearchModal(true)}
          >
            <span className="material-icons">search</span>
          </Button>
          <Button 
            variant="link" 
            style={{ color: selectedApplicationIds.length > 0 ? "#064497" : "#b0b0b0", fontSize: 22 }} 
            disabled={selectedApplicationIds.length === 0}
            onClick={() => setShowShareModal(true)}
          >
            <span className="material-icons">share</span>
          </Button>
          {activeTab !== "finished" && (
            <Button 
              variant="link" 
              style={{ 
                color: selectedApplicationIds.length > 0 ? "#064497" : "#b0b0b0", 
                fontSize: 22 
              }} 
              disabled={selectedApplicationIds.length === 0 || userRole === 'readonly'}
              onClick={() => {
                checkExistingAssignments();
                setShowAssignModal(true);
              }}
            >
              <span className="material-icons">assignment_ind</span>
            </Button>
          )}
        </div>
      </div>

      {/* Table container */}
      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", padding: 32 }}>
        <div style={{ overflowX: "auto" }}>
          <Table hover responsive style={{ minWidth: 900, background: "#fff" }}>
            {activeTab === "in_progress" ? (
              <thead style={{ background: "#F7F8FA" }}>
                <tr>
                  <th style={{ width: 48, textAlign: "center" }}>
                    <Form.Check
                      type="checkbox"
                      checked={allSelected}
                      onChange={e => handleSelectAll(e.target.checked)}
                      style={{ marginLeft: 0 }}
                    />
                  </th>
                  <th style={{ minWidth: 180 }}>
                    Antragsnummer
                    <Form.Control
                      size="sm"
                      type="text"
                      placeholder="Filtern..."
                      value={filters.id}
                      onChange={e => setFilters(f => ({ ...f, id: e.target.value }))}
                      className="mt-1"
                    />
                  </th>
                  <th style={{ minWidth: 180 }}>
                    Zugewiesen an
                    <Form.Select
                      size="sm"
                      value={filters.assigned_agent}
                      onChange={e => setFilters(f => ({ ...f, assigned_agent: e.target.value }))}
                      className="mt-1"
                    >
                      <option value="">Alle</option>
                      <option value="null">Nicht zugewiesen</option>
                      {agents.map(agent => (
                        <option key={agent.id} value={agent.id}>{agent.name ? agent.name : agent.email}</option>
                      ))}
                    </Form.Select>
                  </th>
                  <th style={{ minWidth: 140 }}>
                    Antragsdatum
                    <Form.Control
                      size="sm"
                      type="text"
                      placeholder="TT/MM/JJJJ"
                      value={filters.submitted_at}
                      onChange={e => setFilters(f => ({ ...f, submitted_at: e.target.value }))}
                      className="mt-1"
                    />
                  </th>
                  <th style={{ minWidth: 140 }}>
                    Letzte Änderung
                    <Form.Control
                      size="sm"
                      type="text"
                      placeholder="TT/MM/JJJJ"
                      value={filters.updated_at}
                      onChange={e => setFilters(f => ({ ...f, updated_at: e.target.value }))}
                      className="mt-1"
                    />
                  </th>
                  <th style={{ minWidth: 120 }}>
                    Fortschritt
                    <Form.Select
                      size="sm"
                      value={filters.review_progress}
                      onChange={e => setFilters(f => ({ ...f, review_progress: e.target.value }))}
                      className="mt-1"
                    >
                      <option value="">Alle</option>
                      {progressOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </Form.Select>
                  </th>
                  <th style={{ minWidth: 160 }}>
                    Status
                    <Form.Select
                      size="sm"
                      value={filters.status}
                      onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                      className="mt-1"
                    >
                      <option value="">Alle</option>
                      {statusOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </Form.Select>
                  </th>
                </tr>
              </thead>
            ) : activeTab === "finished" ? (
              <thead style={{ background: "#F7F8FA" }}>
                <tr>
                  <th style={{ width: 48, textAlign: "center" }}>
                    <Form.Check
                      type="checkbox"
                      checked={allSelected}
                      onChange={e => handleSelectAll(e.target.checked)}
                      style={{ marginLeft: 0 }}
                    />
                  </th>
                  <th style={{ minWidth: 180 }}>
                    Antragsnummer
                    <Form.Control
                      size="sm"
                      type="text"
                      placeholder="Filtern..."
                      value={filters.id}
                      onChange={e => setFilters(f => ({ ...f, id: e.target.value }))}
                      className="mt-1"
                    />
                  </th>
                  <th style={{ minWidth: 140 }}>
                    Antragsdatum
                    <Form.Control
                      size="sm"
                      type="text"
                      placeholder="TT/MM/JJJJ"
                      value={filters.submitted_at}
                      onChange={e => setFilters(f => ({ ...f, submitted_at: e.target.value }))}
                      className="mt-1"
                    />
                  </th>
                  <th style={{ minWidth: 140 }}>
                    Prüfungsdatum
                    <Form.Control
                      size="sm"
                      type="text"
                      placeholder="TT/MM/JJJJ"
                      value={filters.finished_at}
                      onChange={e => setFilters(f => ({ ...f, finished_at: e.target.value }))}
                      className="mt-1"
                    />
                  </th>
                  <th style={{ minWidth: 160 }}>
                    Prüfergebnis
                    <Form.Select
                      size="sm"
                      value={filters.result}
                      onChange={e => setFilters(f => ({ ...f, result: e.target.value }))}
                      className="mt-1"
                    >
                      <option value="">Alle</option>
                      <option value="approved">Bewilligt</option>
                      <option value="rejected">Abgelehnt</option>
                    </Form.Select>
                  </th>
                </tr>
              </thead>
            ) : (
              <thead style={{ background: "#F7F8FA" }}>
                <tr>
                  <th style={{ width: 48, textAlign: "center" }}>
                    <Form.Check
                      type="checkbox"
                      checked={allSelected}
                      onChange={e => handleSelectAll(e.target.checked)}
                      style={{ marginLeft: 0 }}
                    />
                  </th>
                  <th style={{ minWidth: 180 }}>
                    Antragsnummer
                    <Form.Control
                      size="sm"
                      type="text"
                      placeholder="Filtern..."
                      value={filters.id}
                      onChange={e => setFilters(f => ({ ...f, id: e.target.value }))}
                      className="mt-1"
                    />
                  </th>
                  <th style={{ minWidth: 140 }}>
                    Antragsdatum
                    <Form.Control
                      size="sm"
                      type="text"
                      placeholder="TT/MM/JJJJ"
                      value={filters.submitted_at}
                      onChange={e => setFilters(f => ({ ...f, submitted_at: e.target.value }))}
                      className="mt-1"
                    />
                  </th>
                  <th style={{ minWidth: 160 }}>
                    Vorhaben
                    <Form.Select
                      size="sm"
                      value={filters.type}
                      onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
                      className="mt-1"
                    >
                      <option value="">Alle</option>
                      {typeOptions.map(type => (
                        <option key={type} value={type}>{TYPE_LABELS[type] || type}</option>
                      ))}
                    </Form.Select>
                  </th>
                  <th style={{ minWidth: 180 }}>
                    Zugewiesen an
                    <Form.Select
                      size="sm"
                      value={filters.assigned_agent}
                      onChange={e => setFilters(f => ({ ...f, assigned_agent: e.target.value }))}
                      className="mt-1"
                    >
                      <option value="">Alle</option>
                      <option value="null">Nicht zugewiesen</option>
                      {agents.map(agent => (
                        <option key={agent.id} value={agent.id}>{agent.name ? agent.name : agent.email}</option>
                      ))}
                    </Form.Select>
                  </th>
                </tr>
              </thead>
            )}
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={activeTab === "in_progress" ? 6 : 5} className="text-center py-5">
                    <Spinner animation="border" style={{ color: "#064497" }} />
                  </td>
                </tr>
              ) : filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === "in_progress" ? 7 : 5} className="text-center py-5">
                    <Alert variant="secondary" className="mb-0">Keine Einträge gefunden.</Alert>
                  </td>
                </tr>
              ) : activeTab === "in_progress" ? (
                filteredApplications.map((app) => (
                  <tr
                    key={app.id}
                    style={{ cursor: "pointer" }}
                    onClick={e => {
                      if ((e.target as HTMLElement).tagName !== 'INPUT') {
                        if (onSelectApplication) {
                          onSelectApplication(app.id);
                        } else {
                          navigate(`/government/review/${app.id}`);
                        }
                      }
                    }}
                  >
                    <td style={{ textAlign: "center" }}>
                      <Form.Check
                        type="checkbox"
                        checked={selectedApplicationIds.includes(app.id)}
                        onChange={e => handleSelectOne(app.id, e.target.checked)}
                      />
                    </td>
                    <td>{app.id}</td>
                    <td>{app.assigned_agent ? (agentMap[app.assigned_agent]?.name || agentMap[app.assigned_agent]?.email || DEFAULT_AGENT_TEXT) : DEFAULT_AGENT_TEXT}</td>
                    <td>{formatDate(app.submitted_at)}</td>
                    <td>{formatDate(app.updated_at)}</td>
                    <td>
                      <div style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 40,
                        height: 40,
                        border: "1px solid #064497",
                        borderRadius: "50%",
                        color: "#064497",
                        fontWeight: 400,
                        fontSize: 16,
                      }}>
                        {app.review_progress ? `${app.review_progress}%` : "-"}
                      </div>
                    </td>
                    <td>
                      {app.status === "in_progress" && "In Bearbeitung"}
                      {app.status === "document_requested" && "Dokumente angefragt"}
                      {app.status === "document_received" && "Dokumente erhalten"}
                    </td>
                  </tr>
                ))
              ) : activeTab === "finished" ? (
                filteredApplications.map((app) => (
                  <tr
                    key={app.id}
                    style={{ cursor: "pointer" }}
                    onClick={e => {
                      if ((e.target as HTMLElement).tagName !== 'INPUT') {
                        if (onSelectApplication) {
                          onSelectApplication(app.id);
                        } else {
                          navigate(`/government/review/${app.id}`);
                        }
                      }
                    }}
                  >
                    <td style={{ textAlign: "center" }}>
                      <Form.Check
                        type="checkbox"
                        checked={selectedApplicationIds.includes(app.id)}
                        onChange={e => handleSelectOne(app.id, e.target.checked)}
                      />
                    </td>
                    <td>{app.id}</td>
                    <td>{formatDate(app.submitted_at)}</td>
                    <td>{formatDate(app.finished_at)}</td>
                    <td>
                      {app.status === "approved" ? (
                        <span style={{ background: '#e6f4ea', color: '#388e3c', borderRadius: 14, padding: '4px 14px', fontWeight: 600, fontSize: 15, minWidth: 120, display: 'inline-block', textAlign: 'center' }}>Bewilligt</span>
                      ) : app.status === "rejected" ? (
                        <span style={{ background: '#fdecea', color: '#d32f2f', borderRadius: 14, padding: '4px 14px', fontWeight: 600, fontSize: 15, minWidth: 120, display: 'inline-block', textAlign: 'center' }}>Abgelehnt</span>
                      ) : (
                        <span style={{ background: '#f2f2f2', color: '#757575', borderRadius: 14, padding: '4px 14px', fontWeight: 600, fontSize: 15, minWidth: 120, display: 'inline-block', textAlign: 'center' }}>-</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                filteredApplications.map((app) => (
                  <tr
                    key={app.id}
                    style={{ cursor: "pointer" }}
                    onClick={e => {
                      if ((e.target as HTMLElement).tagName !== 'INPUT') {
                        if (onSelectApplication) {
                          onSelectApplication(app.id);
                        } else {
                          navigate(`/government/review/${app.id}`);
                        }
                      }
                    }}
                  >
                    <td style={{ textAlign: "center" }}>
                      <Form.Check
                        type="checkbox"
                        checked={selectedApplicationIds.includes(app.id)}
                        onChange={e => handleSelectOne(app.id, e.target.checked)}
                      />
                    </td>
                    <td>{app.id}</td>
                    <td>{formatDate(app.submitted_at)}</td>
                    <td>{TYPE_LABELS[app.type] || app.type || "-"}</td>
                    <td>{app.assigned_agent ? (agentMap[app.assigned_agent]?.name || agentMap[app.assigned_agent]?.email || DEFAULT_AGENT_TEXT) : DEFAULT_AGENT_TEXT}</td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </div>

      {/* Search Modal */}
      <Modal show={showSearchModal} onHide={() => setShowSearchModal(false)} centered size="lg">
        <Modal.Header closeButton={false}>
          <Modal.Title>Antragssuche</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex flex-column gap-4">
            <Form.Group>
              <Form.Label>Suchkriterium</Form.Label>
              <Form.Select 
                value={searchType} 
                onChange={(e) => {
                  setSearchType(e.target.value as any);
                  setSearchQuery("");
                  setSearchResults([]);
                  setSearchCommitted(false);
                }}
              >
                <option value="id">Antragsnummer</option>
                <option value="name">Name Hauptantragsteller</option>
                <option value="email">Email Adresse Hauptantragsteller</option>
                <option value="phone">Telefonnummer Hauptantragsteller</option>
                <option value="address">Objekt Adresse</option>
              </Form.Select>
            </Form.Group>

            <Form.Group>
              <Form.Label>Suchbegriff</Form.Label>
              <div className="d-flex gap-2">
                <Form.Control
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Geben Sie Ihren Suchbegriff ein..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button 
                  variant="primary" 
                  onClick={handleSearch}
                  disabled={searchLoading || !searchQuery.trim()}
                  style={{ backgroundColor: '#064497', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40 }}
                >
                  {searchLoading ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    <span className="material-icons" style={{ margin: 'auto' }}>search</span>
                  )}
                </Button>
              </div>
            </Form.Group>

            {searchResults.length > 0 && (
              <div className="mt-3">
                <h6 className="mb-3">Suchergebnisse</h6>
                <div className="table-responsive">
                  <Table hover>
                    <thead>
                      <tr>
                        <th>Antragsnummer</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Telefon</th>
                        <th>Adresse</th>
                        <th>Aktion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResults.map((result) => (
                        <tr key={result.id}>
                          <td>{result.id}</td>
                          <td>
                            {result.user_data?.firstname} {result.user_data?.lastname}
                          </td>
                          <td>{result.user_data?.email || '-'}</td>
                          <td>{result.user_data?.phone || '-'}</td>
                          <td>
                            {result.object_data ? 
                              `${result.object_data.obj_street || ''} ${result.object_data.obj_house_number || ''}, ${result.object_data.obj_postal_code || ''} ${result.object_data.obj_city || ''}` 
                              : '-'}
                          </td>
                          <td>
                            <Button
                              variant="primary"
                              size="sm"
                              style={{ borderRadius: 5, padding: '2px 16px', fontWeight: 500, backgroundColor: '#064497', border: 'none' }}
                              onClick={() => {
                                setShowSearchModal(false);
                                if (onSelectApplication) {
                                  onSelectApplication(result.id);
                                } else {
                                  navigate(`/government/review/${result.id}`);
                                }
                              }}
                            >
                              Öffnen
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </div>
            )}

            {searchCommitted && !searchLoading && searchResults.length === 0 && (
              <Alert variant="secondary" className="mb-0">
                Keine Ergebnisse gefunden.
              </Alert>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowSearchModal(false)}
          >
            Schließen
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Assign Modal */}
      <Modal show={showAssignModal} onHide={() => !isAssigning && setShowAssignModal(false)} centered>
        <Modal.Header closeButton={!isAssigning}>
          <Modal.Title>Anträge zuweisen</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {isAssigning ? (
            <div style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              background: 'rgba(255, 255, 255, 0.8)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              zIndex: 1
            }}>
              <div style={{ textAlign: 'center' }}>
                <Spinner animation="border" style={{ color: '#064497', marginBottom: 16 }} />
                <div style={{ color: '#064497' }}>Anträge werden zugewiesen...</div>
              </div>
            </div>
          ) : null}
          <Form>
            <Form.Group>
              <Form.Label>Sachbearbeiter auswählen</Form.Label>
              <Form.Select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                disabled={isAssigning}
              >
                <option value="">Bitte wählen...</option>
                {(userRole === 'admin' || userRole === 'owner') && (
                  <option value="unassign">Zuweisung aufheben</option>
                )}
                {agents
                  .filter(agent => {
                    // For admin/owner roles, show all agents
                    if (userRole === 'admin' || userRole === 'owner') {
                      return true;
                    }
                    // For agent role, only show themselves
                    if (userRole === 'agent') {
                      return agent.id === user?.id;
                    }
                    // For readonly role, show no agents
                    return false;
                  })
                  .map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name || agent.email}
                    </option>
                  ))}
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowAssignModal(false)}
            disabled={isAssigning}
          >
            Abbrechen
          </Button>
          <Button 
            variant="primary" 
            onClick={handleAssign}
            disabled={!selectedAgent || isAssigning || userRole === 'readonly'}
            style={{ background: '#064497', border: 'none' }}
          >
            {selectedAgent === 'unassign' ? 'Zuweisung aufheben' : 'Zuweisen'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Share Modal */}
      <Modal show={showShareModal} onHide={() => !isSharing && setShowShareModal(false)} centered>
        <Modal.Header>
          <Modal.Title>Anträge teilen</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {isSharing ? (
            <div style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              background: 'rgba(255, 255, 255, 0.8)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              zIndex: 1
            }}>
              <div style={{ textAlign: 'center' }}>
                <Spinner animation="border" style={{ color: '#064497', marginBottom: 16 }} />
                <div style={{ color: '#064497' }}>Anträge werden geteilt...</div>
              </div>
            </div>
          ) : null}
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Sachbearbeiter auswählen</Form.Label>
              {/* Show selected application IDs as chips */}
              <div style={{ marginBottom: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {selectedApplicationIds.map(id => (
                  <span key={id} style={{ background: '#eaf2fb', color: '#064497', borderRadius: 5, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 15, fontWeight: 500 }}>
                    <span className="material-icons" style={{ fontSize: 18 }}>description</span>
                    {id}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <Form.Select
                  value={shareAgentToAdd}
                  onChange={e => {
                    const agent = agents.find(a => a.id === e.target.value);
                    if (agent && !selectedShareAgents.some(a => a.id === agent.id)) {
                      setSelectedShareAgents(prev => [...prev, agent]);
                      setShareAgentToAdd("");
                    } else {
                      setShareAgentToAdd("");
                    }
                  }}
                  disabled={isSharing}
                  style={{ width: '100%' }}
                >
                  <option value="">Sachbearbeiter auswählen...</option>
                  {agents
                    .filter(agent => agent.id !== user?.id && !selectedShareAgents.some(a => a.id === agent.id))
                    .map(agent => (
                      <option key={agent.id} value={agent.id}>{agent.name || agent.email}</option>
                    ))}
                </Form.Select>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                {selectedShareAgents.map(agent => (
                  <span key={agent.id} style={{ background: '#eaf2fb', color: '#064497', borderRadius: 5, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 15, fontWeight: 500 }}>
                    <span className="material-icons" style={{ fontSize: 18 }}>person</span>
                    {agent.name || agent.email}
                    <button onClick={() => setSelectedShareAgents(prev => prev.filter(a => a.id !== agent.id))} style={{ background: 'none', border: 'none', color: '#d32f2f', marginLeft: 4, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 24, width: 24 }} title="Entfernen">
                      <span className="material-icons" style={{ fontSize: 22, display: 'block' }}>close</span>
                    </button>
                  </span>
                ))}
              </div>
            </Form.Group>
            <Form.Group>
              <Form.Label>Nachricht (optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
                placeholder="Fügen Sie hier eine Nachricht hinzu..."
                disabled={isSharing}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowShareModal(false)}
            disabled={isSharing}
          >
            Abbrechen
          </Button>
          <Button 
            variant="primary" 
            onClick={async () => {
              if (selectedShareAgents.length === 0) return;
              setIsSharing(true);
              try {
                for (const agent of selectedShareAgents) {
                  const senderName = user?.name ? `${user.name} (${user.email})` : user?.email || '';
                  // In-app message (sender-focused, plural aware)
                  const isPlural = selectedApplicationIds.length > 1;
                  const appList = selectedApplicationIds.map(id => `"${id}"`).join(isPlural ? ', ' : '');
                  const appListWithAnd = isPlural ? appList.replace(/, ([^,]*)$/, ' & $1') : appList;
                  const inAppMsg = isPlural
                    ? `${senderName} hat Ihnen die Anträge ${appListWithAnd} geteilt.\n\nNachricht: ${shareMessage}`
                    : `${senderName} hat Ihnen den Antrag ${appListWithAnd} geteilt.\n\nNachricht: ${shareMessage}`;
                  await sendSharedApplicationMessage(agent.id, user?.id || '', selectedApplicationIds, inAppMsg, {
                    toName: agent.name,
                    appIds: selectedApplicationIds,
                    customMessage: shareMessage
                  });
                }
                setShowShareModal(false);
                setSelectedShareAgents([]);
                setShareMessage("");
              } catch (err) {
                console.error('Error sharing applications:', err);
              } finally {
                setIsSharing(false);
              }
            }}
            disabled={selectedShareAgents.length === 0 || isSharing}
            style={{ background: '#064497', border: 'none' }}
          >
            Teilen
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default GovernmentApplicationsPage; 