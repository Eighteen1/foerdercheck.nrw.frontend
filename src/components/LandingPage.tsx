import React from "react";
import { useNavigate } from "react-router-dom";
import { Container, Row, Col, Button } from "react-bootstrap";
import { useAuth } from '../contexts/AuthContext';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className="relative min-h-screen bg-white">
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
            font-weight: 300;
            font-family: 'Roboto';
            font-style: normal;
          }
          .blue-corner-text.long {
            margin-top: 200px;
            font-size: 30px;
            display: block;
            font-weight: 300;
            font-family: 'Roboto';
            text-align: center;
          }
          .blue-corner-text.short {
            display: none;
            margin-top: 50px;
            font-size: 28px;
            font-weight: 300;
            font-family: 'Roboto';
            text-align: center;
          }
          @media (max-width: 980px) {
            .blue-corner {
              width: 35%;
              height: 140px;
              top: -50px;
              left: -5%;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .blue-corner-text.long {
              display: none !important;
            }
            .blue-corner-text.short {
              display: block !important;
              margin-bottom: 0;
              position: relative;
              font-weight: 300;
            }
          }
          @media (max-width: 600px) {
            .blue-corner {
              display: none;
            }
          }
          
          /* Responsive styles for the landing page */
          @media (max-width: 991px) {
            .landing-image-col {
              display: none;
            }
            .landing-text-col {
              width: 100%;
              text-align: center;
              padding: 0 20px;
            }
            .landing-button-container {
              align-items: center;
            }
            .landing-button {
              width: 100% !important;
              max-width: 400px;
            }
          }
          
          /* Add spacing between image and text */
          @media (min-width: 992px) and (max-width: 1050px) {
            .landing-text-col {
              padding-left: 40px !important;
            }
            .landing-image-col {
              padding-right: 0;
            }
            .landing-text-col h2,
            .landing-text-col p {
              padding-left: 0;
            }
          }
          
          @media (min-width: 1051px) {
            .landing-text-col {
              padding-left: 30px;
            }
            .landing-image-col {
              padding-right: 30px;
            }
            /* Ensure all text content respects the spacing */
            .landing-text-col h2,
            .landing-text-col p {
              padding-left: 15px;
            }
          }
        `}
      </style>

      <div className="blue-corner">
        <span className="blue-corner-text long">FÖRDERCHECK.NRW</span>
        <span className="blue-corner-text short">FC.NRW</span>
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
          <Col md={6} className="d-none d-lg-flex justify-content-center align-items-center landing-image-col">
            <img
              src="/images/landingpage_image.png"
              alt="Wohnraumförderung"
              className="img-fluid rounded shadow"
              style={{ maxWidth: "500px" }}
            />
          </Col>

          {/* Right side - Text & Button */}
          <Col md={12} lg={6} className="d-flex flex-column justify-content-center text-center text-lg-start landing-text-col">
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
            <div className="d-flex flex-column gap-3 landing-button-container">
              <Button
                onClick={() => navigate("/application-types")}
                className={`border-0 py-3 fw-regular font-['Roboto'] landing-button ${isAuthenticated ? 'bg-[#D7DAEA] text-black' : 'bg-[#064497] text-white'}`}
                style={{ width: '400px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)' }}
              >
                ZU DEN ANTRÄGEN
              </Button>

              {isAuthenticated ? (
                <Button 
                  onClick={() => navigate('/personal-space')}
                  className="py-3 fw-regular font-['Roboto'] text-white landing-button"
                  style={{ backgroundColor: '#064497', border: 'none', width: '400px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)' }}
                >
                  ZUM PERSÖNLICHEN BEREICH
                </Button>
              ) : (
                <Button 
                  onClick={() => navigate('/login')}
                  className="py-3 fw-regular font-['Roboto'] text-black landing-button"
                  style={{ backgroundColor: '#D7DAEA', border: 'none', width: '400px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)' }}
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
