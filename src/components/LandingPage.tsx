import React from "react";
import { useNavigate } from "react-router-dom";
import { Container, Row, Col, Button } from "react-bootstrap";
import { useAuth } from '../contexts/AuthContext';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className="relative min-h-screen bg-white">
      {/* Bottom right quadrant of ellipse */}
      <div className="absolute top-[-170px] left-[-25%] w-[70%] h-[300px] bg-[#064497] rounded-[50%]"></div>

      {/* Main heading */}
      <div className="absolute top-12 start-9">
        <h1 className="display-6 fw-regular text-[#ffffff] mb-2 font-['Roboto']">
          FÖRDERCHECK.NRW
        </h1>
      </div>

      {/* Words in the top right */}
      <div className="absolute top-8 end-8 text-[#064497] text-end fw-medium font-['Roboto'] text-xl">
        <p className="mb-0">SCHNELL.</p>
        <p className="mb-0">EINFACH.</p>
        <p className="mb-0">EFFIZIENT.</p>
      </div>

      {/* Main content layout */}
      <Container className="min-h-screen d-flex align-items-center py-5">
        <Row className="w-100 g-4">
          {/* Left side - Image */}
          <Col md={6} className="d-flex justify-content-center align-items-center">
            <img
              src="/images/landingpage_image.webp"
              alt="Wohnraumförderung"
              className="img-fluid rounded shadow"
              style={{ maxWidth: "500px" }}
            />
          </Col>

          {/* Right side - Text & Button */}
          <Col md={6} className="d-flex flex-column justify-content-center">
            <h2 className="display-4 fw-regulat text-[#064497] mb-4 font-['Roboto']">
              Ihr Weg zur Wohnraumförderung - Jetzt Digital!
            </h2>
            <p
              className="mb-4 fw-normal"
              style={{
                fontSize: 20,
                marginBottom: 24,
                color: '#222',
                fontFamily: 'Roboto, Arial, sans-serif',
              }}
            >
              Wir vereinfachen den Prozess der Wohnförderung. Füllen Sie Ihren Antrag
              bequem von zu Hause aus und sparen Sie wertvolle Zeit. Unser
              benutzerfreundliches Online-Formular führt Sie Schritt für Schritt
              durch den Antragsprozess.
            </p>
            <div className="d-flex flex-column gap-3">
              <Button
                onClick={() => navigate("/application-types")}
                className={`border-0 py-3 fw-regular font-['Roboto'] ${isAuthenticated ? 'bg-[#D7DAEA] text-black' : 'bg-[#064497] text-white'}`}
                style={{ width: '400px' }}
              >
                ZU DEN ANTRÄGEN
              </Button>

              {isAuthenticated ? (
                <Button 
                  onClick={() => navigate('/personal-space')}
                  className="py-3 fw-regular font-['Roboto'] text-white"
                  style={{ backgroundColor: '#064497', border: 'none', width: '400px' }}
                >
                  ZUM PERSÖNLICHEN BEREICH
                </Button>
              ) : (
                <Button 
                  onClick={() => navigate('/login')}
                  className="py-3 fw-regular font-['Roboto'] text-black"
                  style={{ backgroundColor: '#D7DAEA', border: 'none', width: '400px' }}
                >
                  ANMELDEN
                </Button>
              )}
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default LandingPage;
