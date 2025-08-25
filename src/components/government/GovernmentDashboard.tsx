import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Container, Button, Spinner } from "react-bootstrap";
import { supabase } from "../../lib/supabase";
import Layout from "../Layout";
import GovernmentApplicationsPage from "./GovernmentApplicationsPage";
import ApplicationReviewContainer from "./review/ApplicationReviewContainer";
import GovernmentProfilePage from "./GovernmentProfilePage";
import GovernmentDashboardPage from "./GovernmentDashboardPage";
import GovernmentSettingsPage from "./GovernmentSettingsPage";
import MessagesPage from './MessagesPage';

const menuItems = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "applications", label: "Anträge", icon: "description" },
  { key: "messages", label: "Nachrichten", icon: "mail" },
  { key: "profile", label: "Profil", icon: "person" },
  { key: "help", label: "Hilfe", icon: "help_outline" },
  { key: "settings", label: "Einstellungen", icon: "settings" },
  { key: "logout", label: "Abmelden", icon: "logout" },
];

const GovernmentDashboard: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedMenu, setSelectedMenu] = useState("applications");
  const [city, setCity] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [openChecklistItemId, setOpenChecklistItemId] = useState<string | null>(null);
  const [processingDeepLink, setProcessingDeepLink] = useState(false);
  const [deepLinkError, setDeepLinkError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Function to handle deep link processing
  const processDeepLink = async (applicationId: string, checklistItemId: string) => {
    setProcessingDeepLink(true);
    setDeepLinkError(null); // Clear any previous errors
    try {
      //console.log(`Processing deep link for applicationId: ${applicationId}, city: ${city}`);
      
      // First, try to get the application without city filtering to see if it exists
      ///console.log('Trying to fetch application with minimal columns...');
      const { data: applicationWithoutCity, error: errorWithoutCity } = await supabase
        .from('applications')
        .select('id, resident_id, status, city_id')
        .eq('id', applicationId)
        .single();


      if (!applicationWithoutCity) {
        const errorMsg = `Anwendung ${applicationId} wurde nicht gefunden.`;
        setDeepLinkError(errorMsg);
        return;
      }

      console.log('Application found:', applicationWithoutCity);

      // For now, let's skip the city check since we don't know if the city column exists
      // We'll implement proper access control later
      //console.log('Skipping city access control for now - application found successfully');
      
      // Set the application and checklist item to open
      setSelectedApplicationId(applicationId);
      setOpenChecklistItemId(checklistItemId);
      setSelectedMenu("applications");
      
      // Clear the URL query parameters to avoid repeated processing
      // Use a flag to prevent re-processing
      setProcessingDeepLink(false); // Set to false before navigation to prevent re-triggering
      navigate(location.pathname, { replace: true });
      
      //console.log(`Deep link processed: opened application ${applicationId} with checklist item ${checklistItemId}`);
      
      // Note: The checklist item will be opened when the ApplicationReviewContainer loads
      // and the ChecklistPanel processes the openChecklistItemId prop
    } catch (error) {
      const errorMsg = `Fehler beim Öffnen des Checklistenpunkts: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`;
      console.error('Error processing deep link:', error);
      setDeepLinkError(errorMsg);
      setProcessingDeepLink(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then((res: any) => {
      const userObj = res?.data?.session?.user;
      setUser(userObj);
      const userCity = userObj?.user_metadata?.city || null;
      setCity(userCity);
      //console.log('User session loaded:', { user: userObj, city: userCity, metadata: userObj?.user_metadata });
      setLoading(false);
      // Routing protection: only allow if city metadata exists (government account)
      if ((!userObj || !userCity) && process.env.NODE_ENV !== 'development') {
        navigate('/government/login', { replace: true });
      }
    });
  }, [navigate]);



  useEffect(() => {
    // Handle navigation state for application selection
    if (location.state?.selectedMenu) {
      setSelectedMenu(location.state.selectedMenu);
    }
    if (location.state?.selectedApplicationId) {
      setSelectedApplicationId(location.state.selectedApplicationId);
    }
    if (location.state?.openChecklistItemId) {
      setOpenChecklistItemId(location.state.openChecklistItemId);
      // Reset state after use to avoid repeated opening
      navigate(location.pathname, { replace: true, state: { ...location.state, openChecklistItemId: null } });
    }
  }, [location.state, location.pathname, navigate]);

  // Handle URL query parameters for deep linking
  useEffect(() => {
    if (!loading && !processingDeepLink && user && city) {
      const urlParams = new URLSearchParams(location.search);
      const applicationId = urlParams.get('applicationId');
      const checklistItemId = urlParams.get('openChecklistItemId');
      
      if (applicationId && checklistItemId) {
       // console.log(`Processing deep link for applicationId: ${applicationId}, checklistItemId: ${checklistItemId}`);
       // console.log(`Current user city: ${city}`);
       // console.log(`Current user:`, user);
        processDeepLink(applicationId, checklistItemId);
      } else if (applicationId || checklistItemId) {
        // Show error if only one parameter is provided
        const missingParam = !applicationId ? 'applicationId' : 'openChecklistItemId';
        const errorMsg = `Deep Link unvollständig: Der Parameter "${missingParam}" fehlt.`;
       // console.warn(errorMsg);
        setDeepLinkError(errorMsg);
        
        // Clear the URL to avoid repeated error messages
        navigate(location.pathname, { replace: true });
      }
    }
  }, [loading, location.search, processingDeepLink, user, city]);

  const handleMenuClick = (key: string) => {
    if (key === "logout") {
      supabase.auth.signOut();
      navigate("/government/login");
    } else {
      setSelectedMenu(key);
      setSelectedApplicationId(null); // Reset review if switching menu
      // Only clear deep link state when switching away from applications menu
      if (key !== "applications") {
        setOpenChecklistItemId(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
        <Spinner animation="border" style={{ color: '#064497', width: 60, height: 60 }} />
      </div>
    );
  }

  // Show loading state when processing deep links
  if (processingDeepLink) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
        <div className="text-center">
          <Spinner animation="border" style={{ color: '#064497', width: 60, height: 60 }} />
          <div className="mt-3" style={{ color: '#064497', fontSize: 18 }}>
            Öffne Checkliste...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex" style={{ minHeight: "100vh", background: "#F7F8FA" }}>
      {/* Sidebar */}
      <div
        className={`d-flex flex-column align-items-start p-3 shadow`}
        style={{
          width: sidebarOpen ? 260 : 60,
          background: "#064497",
          color: "#fff",
          transition: "width 0.2s",
          minHeight: "100vh",
          zIndex: 10,
        }}
      >
        {/* Expand/Minimize Button */}
        <Button
          variant="link"
          className="mb-6 p-0 d-flex align-items-center mt-2"
          style={{ color: "#fff", fontSize: 20, textDecoration: "none" }}
          onClick={() => setSidebarOpen((open) => !open)}
        >
          {sidebarOpen ? (
            <>
              <span className="material-icons me-2">chevron_left</span>
              Minimieren
            </>
          ) : (
            <span className="material-icons">menu</span>
          )}
        </Button>
        <div className="flex-grow-1 w-100">
          {menuItems.map((item, idx) => (
            <React.Fragment key={item.key}>
              <div
                style={{
                  width: sidebarOpen ? '85%' : 44,
                  height: 44,
                  margin: '0 auto',
                  borderRadius: 8,
                  overflow: 'visible',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Button
                  variant="link"
                  className={`mb-0 px-0 py-2 rounded-0 d-flex align-items-center border-0`}
                  style={{
                    background: selectedMenu === item.key ? "#fff" : "transparent",
                    color: selectedMenu === item.key ? "#064497" : "#fff",
                    fontWeight: 500,
                    fontSize: 18,
                    border: "none",
                    boxShadow: selectedMenu === item.key ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                    textDecoration: "none",
                    width: '100%',
                    minHeight: 44,
                    paddingLeft: sidebarOpen ? 12 : 0,
                    paddingRight: sidebarOpen ? 12 : 0,
                    justifyContent: sidebarOpen ? 'flex-start' : 'center',
                    borderRadius: 8,
                    overflow: 'visible',
                  }}
                  onClick={() => handleMenuClick(item.key)}
                >
                  <span className="material-icons"
                    style={{
                      textDecoration: "none",
                      marginRight: sidebarOpen ? 16 : 0,
                      marginLeft: sidebarOpen ? 16 : 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 28,
                      width: 28,
                      height: 28,
                    }}
                  >
                    {item.icon}
                  </span>
                  {sidebarOpen && <span style={{ textDecoration: "none" }}>{item.label}</span>}
                </Button>
              </div>
              {/* Separator line only visible when expanded */}
              {sidebarOpen && idx < menuItems.length - 1 && (
                <div
                  style={{
                    height: 1,
                    background: "rgba(255,255,255,0.3)",
                    width: '85%',
                    margin: '4px auto',
                    borderRadius: 1,
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-grow-1">
        {/* Header */}
        <div
          className="d-flex align-items-center justify-content-between px-4 py-3 shadow-sm"
          style={{ background: "#fff", minHeight: 70 }}
        >
          <div style={{ fontWeight: 400, fontSize: 24, color: "#064497" }}>
            FÖRDERCHECK.NRW
          </div>
          <div style={{ fontWeight: 400, fontSize: 18, color: "#000000" }}>
            {city ? city : "Stadt"}
          </div>
        </div>
        
        {/* Deep Link Error Alert */}
        {deepLinkError && (
          <div className="px-4 py-2" style={{ background: "#fff" }}>
            <div className="alert alert-warning alert-dismissible fade show" role="alert">
              <strong>Hinweis:</strong> {deepLinkError}
              <button
                type="button"
                className="btn-close"
                onClick={() => setDeepLinkError(null)}
                aria-label="Close"
              ></button>
            </div>
          </div>
        )}
        
        {/* Content */}
        <Container className="py-4">
          {selectedMenu === "dashboard" && (
            <GovernmentDashboardPage />
          )}
          {selectedMenu === "applications" && !selectedApplicationId && (
            <GovernmentApplicationsPage 
              onSelectApplication={setSelectedApplicationId} 
            />
          )}
          {selectedMenu === "applications" && selectedApplicationId && (
            <ApplicationReviewContainer 
              applicationId={selectedApplicationId} 
              onClose={() => {
                setSelectedApplicationId(null);
                setOpenChecklistItemId(null); // Clear deep link state when closing application
              }} 
              openChecklistItemId={openChecklistItemId}
              onClearDeepLink={() => setOpenChecklistItemId(null)} // Clear deep link state when switching modes
            />
          )}
          {selectedMenu === "profile" && (
            <GovernmentProfilePage />
          )}
          {selectedMenu === "settings" && (
            <GovernmentSettingsPage />
          )}
          {selectedMenu === "messages" && (
            <MessagesPage />
          )}
        </Container>
      </div>
    </div>
  );
};

export default GovernmentDashboard; 