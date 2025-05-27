import React from "react";
import { useNavigate } from "react-router-dom";
import { Button, Container } from "react-bootstrap";

const GovernmentLanding: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-white d-flex align-items-center justify-content-center">
      <style>
        {`
          .blue-corner {
            position: absolute;
            top: -170px;
            left: -10%;
            width: 55%;
            height: 300px;
            background: #064497;
            border-radius: 50%;
            z-index: 2;
            pointer-events: none;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            overflow: visible;
          }
          .blue-corner-text {
            pointer-events: auto;
            text-align: center;
            color: #ffffff;
            font-weight: 300;
            width: 100%;
            position: relative;
            font-family: 'Roboto';
          }
        `}
      </style>
      <div className="blue-corner">
        <span className="blue-corner-text">FÖRDERCHECK.NRW</span>
      </div>
      <Container className="text-center" style={{ zIndex: 3 }}>
        <h1 className="mb-4" style={{ color: "#064497", fontWeight: 700 }}>Stadtverwaltung Zugang</h1>
        <p className="mb-5" style={{ color: "#222", fontSize: 20 }}>
          Melden Sie sich an, um Anträge Ihrer Stadt zu verwalten.
        </p>
        <Button
          onClick={() => navigate("/government/login")}
          style={{
            backgroundColor: "#064497",
            color: "#fff",
            border: "none",
            fontWeight: 500,
            fontSize: 18,
            padding: "12px 40px",
            borderRadius: 8,
            boxShadow: "0 4px 8px rgba(0,0,0,0.15)"
          }}
        >
          Anmelden
        </Button>
      </Container>
    </div>
  );
};

export default GovernmentLanding; 