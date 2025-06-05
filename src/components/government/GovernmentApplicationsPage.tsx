import React, { useEffect, useState } from "react";
import { Table, Button, ButtonGroup, Form, Spinner, Alert, Dropdown } from "react-bootstrap";
import { supabase } from "../../lib/supabase";
import { useNavigate } from 'react-router-dom';

const STATUS_LABELS = {
  new: "Neue Anträge",
  in_progress: "In Bearbeitung",
  documents_requested: "In Bearbeitung",
  documents_received: "In Bearbeitung",
  rejected: "Geprüfte Anträge",
  approved: "Geprüfte Anträge",
};

const IN_PROGRESS_STATUSES = ["in_progress", "documents_requested", "documents_received"];
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
  });
  const [agents, setAgents] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [agentMap, setAgentMap] = useState<Record<string, { name: string; email: string }>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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
      let { data, error } = await supabase
        .from("applications")
        .select("id, status, submitted_at, updated_at, review_progress, type, assigned_agent")
        .order("submitted_at", { ascending: false });
      if (error) {
        setApplications([]);
        setLoading(false);
        return;
      }
      setApplications(data || []);
      setLoading(false);
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
  const allSelected = filteredApplications.length > 0 && filteredApplications.every(app => selectedIds.includes(app.id));
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredApplications.map(app => app.id));
    } else {
      setSelectedIds([]);
    }
  };
  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id));
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
    { label: "Dokumente angefragt", value: "documents_requested" },
    { label: "Dokumente erhalten", value: "documents_received" },
  ];

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
          onClick={() => setActiveTab("new")}
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
          onClick={() => setActiveTab("in_progress")}
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
          onClick={() => setActiveTab("finished")}
        >
          Geprüfte Anträge <span style={{ fontWeight: 500, fontSize: 22, marginLeft: 8 }}>{counts.finished}</span>
        </div>
      </div>

      {/* Header row above table container */}
      <div className="d-flex align-items-center justify-content-between mb-0" style={{ width: "100%" }}>
        <h4 style={{ color: "#000000", fontWeight: 600, marginBottom: 0, marginLeft: 12 }}>Übersicht</h4>
        <div className="d-flex align-items-center gap-2">
          <Button variant="link" style={{ color: "#064497", fontSize: 22 }}>
            <span className="material-icons">search</span>
          </Button>
          <Button variant="link" style={{ color: selectedIds.length > 0 ? "#064497" : "#b0b0b0", fontSize: 22 }} disabled={selectedIds.length === 0}>
            <span className="material-icons">share</span>
          </Button>
          <Button variant="link" style={{ color: "#064497", fontSize: 22 }}>
            <span className="material-icons">settings</span>
          </Button>
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
                      style={{ marginLeft: 8 }}
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
            ) : (
              <thead style={{ background: "#F7F8FA" }}>
                <tr>
                  <th style={{ width: 48, textAlign: "center" }}>
                    <Form.Check
                      type="checkbox"
                      checked={allSelected}
                      onChange={e => handleSelectAll(e.target.checked)}
                      style={{ marginLeft: 8 }}
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
                  <td colSpan={activeTab === "in_progress" ? 6 : 5} className="text-center py-5">
                    <Alert variant="info" className="mb-0">Keine Einträge gefunden.</Alert>
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
                        checked={selectedIds.includes(app.id)}
                        onChange={e => handleSelectOne(app.id, e.target.checked)}
                      />
                    </td>
                    <td>{app.id}</td>
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
                      {app.status === "documents_requested" && "Dokumente angefragt"}
                      {app.status === "documents_received" && "Dokumente erhalten"}
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
                        checked={selectedIds.includes(app.id)}
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
    </div>
  );
};

export default GovernmentApplicationsPage; 