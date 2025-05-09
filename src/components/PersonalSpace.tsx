import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Container, Row, Col, Button, Modal, Form } from "react-bootstrap";
import { useAuth } from "../contexts/AuthContext";
import { supabase, storeEligibilityData, checkDocumentCheckStatus } from "../lib/supabase";

const PersonalSpace: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, email, logout, login, user } = useAuth();
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [eligibilityData, setEligibilityData] = useState<any>(null);
  const [formProgress, setFormProgress] = useState<{ [key: string]: number }>({
    hauptantrag: 0,
    einkommenserklarung: 0,
    selbstauskunft: 0
  });

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
    } else if (user?.id) {
      // Fetch progress data from the database
      const fetchProgress = async () => {
        try {
          const { data, error } = await supabase
            .from('user_data')
            .select('hauptantrag_progress, einkommenserklarung_progress, selbstauskunft_progress')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error('Error fetching progress:', error);
            return;
          }

          if (data) {
            setFormProgress({
              hauptantrag: data.hauptantrag_progress || 0,
              einkommenserklarung: data.einkommenserklarung_progress || 0,
              selbstauskunft: data.selbstauskunft_progress || 0
            });
          }
        } catch (error) {
          console.error('Error in fetchProgress:', error);
        }
      };

      fetchProgress();
    }
  }, [isAuthenticated, location.state, user?.id]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Create user through backend
      const createUserResponse = await fetch('https://foerdercheck-backend.onrender.com/api/user/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: emailInput }),
      });

      if (!createUserResponse.ok) {
        throw new Error('Failed to create user');
      }

      const { user } = await createUserResponse.json();
      
      if (user?.id && location.state?.eligibilityData) {
        // Ensure all required fields are present and properly typed
        const eligibilityData = {
          adultCount: parseInt(location.state.eligibilityData.adultCount),
          childCount: parseInt(location.state.eligibilityData.childCount),
          isDisabled: Boolean(location.state.eligibilityData.isDisabled),
          isMarried: Boolean(location.state.eligibilityData.isMarried),
          isRetired: Boolean(location.state.eligibilityData.isRetired),
          grossIncome: parseFloat(location.state.eligibilityData.grossIncome),
          netIncome: parseFloat(location.state.eligibilityData.netIncome)
        };

        // Store eligibility data through backend
        const storeDataResponse = await fetch('https://foerdercheck-backend.onrender.com/api/user/store-eligibility', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            eligibilityData: eligibilityData
          }),
        });

        if (!storeDataResponse.ok) {
          const errorData = await storeDataResponse.json();
          throw new Error(errorData.message || 'Failed to store eligibility data');
        }
        
        setMessage({
          type: 'success',
          text: 'Eine Bestätigungs-E-Mail wurde an Ihre E-Mail-Adresse gesendet. Bitte überprüfen Sie Ihren Posteingang und bestätigen Sie Ihre E-Mail-Adresse.'
        });
        
        // Store eligibility data temporarily in localStorage
        localStorage.setItem('pendingEligibilityData', JSON.stringify(eligibilityData));
        
        // Close the modal but stay on the current page
        setShowRegistrationModal(false);
      }
    } catch (error) {
      console.error('Error during registration:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten.'
      });
    }
  };

  const handleDocumentUpload = async () => {
    if (!isAuthenticated) {
      setShowRegistrationModal(true);
      return;
    }

    if (!user?.id) {
      console.error('No user ID found');
      navigate('/document-check', { state: { from: 'personal-space' } });
      return;
    }

    try {
      const isDocumentCheckCompleted = await checkDocumentCheckStatus(user.id);
      if (isDocumentCheckCompleted) {
        navigate('/document-upload', { state: { from: 'personal-space' } });
      } else {
        navigate('/document-check', { state: { from: 'personal-space' } });
      }
    } catch (error) {
      console.error('Error checking document check status:', error);
      // Default to document-check if there's an error
      navigate('/document-check', { state: { from: 'personal-space' } });
    }
  };

  const handleHauptantrag = () => {
    if (!isAuthenticated) {
      setShowRegistrationModal(true);
      return;
    }
    navigate('/hauptantrag', { state: { from: 'personal-space' } });
  };

  const formSections = [
    { 
      title: "HAUPTANTRAG", 
      progress: formProgress.hauptantrag,
      onClick: handleHauptantrag
    },
    { 
      title: "EINKOMMENSERKLÄRUNG", 
      progress: formProgress.einkommenserklarung,
      onClick: () => {} // To be implemented
    },
    { 
      title: "SELBSTAUSKUNFT", 
      progress: formProgress.selbstauskunft,
      onClick: () => {} // To be implemented
    }
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
                  onClick={section.onClick}
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