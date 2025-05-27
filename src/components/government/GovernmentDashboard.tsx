import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Button, Spinner } from "react-bootstrap";
import { supabase } from "../../lib/supabase";

const menuItems = [
  { key: "applications", label: "Anträge" },
  { key: "profile", label: "Profil" },
  { key: "settings", label: "Einstellungen" },
  { key: "logout", label: "Abmelden" },
];

const GovernmentDashboard: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedMenu, setSelectedMenu] = useState("applications");
  const [city, setCity] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then((res: any) => {
      const userObj = res?.data?.session?.user;
      setUser(userObj);
      setCity(userObj?.user_metadata?.city || null);
      setLoading(false);
      // Routing protection: if not authenticated and not in development, redirect
      if (!userObj && process.env.NODE_ENV !== 'development') {
        navigate('/government/login', { replace: true });
      }
    });
  }, [navigate]);

  const handleMenuClick = (key: string) => {
    if (key === "logout") {
      supabase.auth.signOut();
      navigate("/government/login");
    } else {
      setSelectedMenu(key);
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
        <Button
          variant="link"
          className="mb-4 p-0"
          style={{ color: "#fff", fontSize: 28, textDecoration: "none" }}
          onClick={() => setSidebarOpen((open) => !open)}
        >
          <span className="material-icons">{sidebarOpen ? "menu_open" : "menu"}</span>
        </Button>
        <div className="mb-5" style={{ fontWeight: 700, fontSize: 22, letterSpacing: 1 }}>
          {sidebarOpen ? "FÖRDERCHECK.NRW" : "FC"}
        </div>
        <div className="flex-grow-1 w-100">
          {menuItems.map((item) => (
            <Button
              key={item.key}
              variant="link"
              className={`w-100 text-start mb-2 px-3 py-2 rounded ${
                selectedMenu === item.key ? "bg-white text-[#064497]" : "text-white"
              }`}
              style={{
                background: selectedMenu === item.key ? "#fff" : "transparent",
                color: selectedMenu === item.key ? "#064497" : "#fff",
                fontWeight: 500,
                fontSize: 18,
                border: "none",
                boxShadow: selectedMenu === item.key ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
              }}
              onClick={() => handleMenuClick(item.key)}
            >
              {item.label}
            </Button>
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
          <div style={{ fontWeight: 700, fontSize: 24, color: "#064497" }}>
            FÖRDERCHECK.NRW
          </div>
          <div style={{ fontWeight: 500, fontSize: 18, color: "#064497" }}>
            {city ? city : "Stadt"}
          </div>
        </div>
        {/* Content */}
        <Container className="py-4">
          {selectedMenu === "applications" && (
            <div>
              <h2 style={{ color: "#064497" }}>Anträge Übersicht</h2>
              <p>Hier sehen Sie alle Anträge für Ihre Stadt.</p>
              {/* TODO: Application table goes here */}
            </div>
          )}
          {selectedMenu === "profile" && (
            <div>
              <h2 style={{ color: "#064497" }}>Profil</h2>
              <p>Name: {user?.email}</p>
              <p>Stadt: {city}</p>
            </div>
          )}
          {selectedMenu === "settings" && (
            <div>
              <h2 style={{ color: "#064497" }}>Einstellungen</h2>
              <p>Hier können Sie Ihre Einstellungen anpassen.</p>
            </div>
          )}
        </Container>
      </div>
    </div>
  );
};

export default GovernmentDashboard; 