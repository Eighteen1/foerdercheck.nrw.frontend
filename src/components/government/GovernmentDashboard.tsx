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
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then((res: any) => {
      const userObj = res?.data?.session?.user;
      setUser(userObj);
      setCity(userObj?.user_metadata?.city || null);
      setLoading(false);
      // Routing protection: only allow if city metadata exists (government account)
      if ((!userObj || !userObj.user_metadata?.city) && process.env.NODE_ENV !== 'development') {
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

  const handleMenuClick = (key: string) => {
    if (key === "logout") {
      supabase.auth.signOut();
      navigate("/government/login");
    } else {
      setSelectedMenu(key);
      setSelectedApplicationId(null); // Reset review if switching menu
    }
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
        <Spinner animation="border" style={{ color: '#064497', width: 60, height: 60 }} />
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
        {/* Content */}
        <Container className="py-4">
          {selectedMenu === "dashboard" && (
            <GovernmentDashboardPage />
          )}
          {selectedMenu === "applications" && !selectedApplicationId && (
            <GovernmentApplicationsPage onSelectApplication={setSelectedApplicationId} />
          )}
          {selectedMenu === "applications" && selectedApplicationId && (
            <ApplicationReviewContainer applicationId={selectedApplicationId} onClose={() => setSelectedApplicationId(null)} openChecklistItemId={openChecklistItemId} />
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