import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Container, Row, Col, Button, Modal, Form } from "react-bootstrap";
import { useAuth } from "../contexts/AuthContext";
import { supabase, storeEligibilityData } from "../lib/supabase";

const PersonalSpace: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, email, logout, login } = useAuth();
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [eligibilityData, setEligibilityData] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      // Check if we have eligibility data from the result page
      const data = location.state?.eligibilityData;
      if (data) {
        setEligibilityData(data);
        setShowRegistrationModal(true);
      } else {
        // Check localStorage for pending data
        const pendingData = localStorage.getItem('pendingEligibilityData');
        if (pendingData) {
          setEligibilityData(JSON.parse(pendingData));
          setShowRegistrationModal(true);
        }
      }
    }
  }, [isAuthenticated, location.state]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // First, create the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: emailInput,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) throw authError;

      if (authData.user && eligibilityData) {
        // Store the eligibility data in the database
        await storeEligibilityData(authData.user.id, eligibilityData);
        
        setMessage({
          type: 'success',
          text: 'Ein Login-Link wurde an Ihre E-Mail-Adresse gesendet. Bitte überprüfen Sie Ihren Posteingang.'
        });
        
        // Clear the temporary storage
        localStorage.removeItem('pendingEligibilityData');
      }
    } catch (error) {
      console.error('Error during registration:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten.'
      });
    }
  };

  const handleDocumentUpload = () => {
    if (!isAuthenticated) {
      setShowRegistrationModal(true);
      return;
    }
    navigate('/document-check');
  };

  const formSections = [
    { title: "EINKOMMENSERKLÄRUNG", progress: 0 },
    { title: "SELBSTAUSKUNFT", progress: 0 },
    { title: "HAUPTANTRAG", progress: 0 },
  ];

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

      {/* Main content */}
      <Container className="pt-32">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="text-[#064497] text-3xl mb-0">Wilkommen In Ihrem Persönlichem Bereich</h2>
          <Button
            onClick={logout}
            className="px-4 py-2"
            style={{ backgroundColor: '#808080', border: 'none' }}
          >
            Abmelden
          </Button>
        </div>
        
        <p className="text-right italic mb-5">
          Hier können Sie die erforderlichen Dokumente hochladen, die Antragsformulare bearbeiten und abschicken.
        </p>

        <Row className="mt-5">
          <Col md={6}>
            <h5 className="mb-4">Klicken Sie auf die Schaltflächen, um zu den jeweiligen Formularen zu gelangen:</h5>
            
            {formSections.map((section, index) => (
              <div key={index} className="d-flex align-items-center mb-4">
                <Button
                  className="flex-grow-1 py-3 me-3"
                  style={{ backgroundColor: '#064497', border: 'none' }}
                >
                  {section.title}
                </Button>
                <div className="border rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: '45px', height: '45px' }}>
                  {section.progress}%
                </div>
              </div>
            ))}
          </Col>

          <Col md={6}>
            <div className="text-center">
              <h5 className="mb-4">Klicken Sie hier um ihre Dokumentente hochzuladen und zu verwalten:</h5>
              <div className="d-flex align-items-center justify-content-center mb-4">
                <Button
                  className="flex-grow-1 py-3 me-3"
                  style={{ backgroundColor: '#064497', border: 'none' }}
                  onClick={handleDocumentUpload}
                >
                  DOKUMENTE HOCHLADEN
                </Button>
                <div className="border rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: '45px', height: '45px' }}>
                  0%
                </div>
              </div>

              <div className="mt-5">
                <p className="mb-4">
                  Ihre E-Mail-Adresse: <strong>{email}</strong>
                </p>
              </div>
            </div>
          </Col>
        </Row>

        <div className="text-center mt-5">
          <Button
            className="px-5 py-2"
            style={{ backgroundColor: '#808080', border: 'none' }}
          >
            PRÜFEN
          </Button>
        </div>
      </Container>

      <Modal show={showRegistrationModal} onHide={() => setShowRegistrationModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Konto erstellen</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {message && (
            <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} mb-3`}>
              {message.text}
            </div>
          )}
          <p>Um fortzufahren, geben Sie bitte Ihre E-Mail-Adresse ein, um ein Konto zu erstellen.</p>
          <Form onSubmit={handleEmailSubmit}>
            <Form.Group className="mb-3">
              <Form.Control
                type="email"
                placeholder="E-Mail-Adresse"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
              />
            </Form.Group>
            <Button type="submit" className="w-100" style={{ backgroundColor: '#064497', border: 'none' }}>
              Konto erstellen
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default PersonalSpace;