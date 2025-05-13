import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Container, Row, Col, Button, Modal, Form, Spinner } from "react-bootstrap";
import { useAuth } from "../contexts/AuthContext";
import { supabase, storeEligibilityData, checkDocumentCheckStatus } from "../lib/supabase";

const PersonalSpace: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, email, logout, login, user } = useAuth();
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [eligibilityData, setEligibilityData] = useState<any>(null);
  const [formProgress, setFormProgress] = useState<{ [key: string]: number }>({
    hauptantrag: 0,
    einkommenserklarung: 0,
    selbstauskunft: 0
  });
  const [isLoading, setIsLoading] = useState(false);

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
        setIsLoading(true);
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
        } finally {
          setIsLoading(false);
        }
      };

      fetchProgress();
    }
  }, [isAuthenticated, location.state, user?.id]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
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
          text: 'Eine Bestätigungs-E-Mail wurde an Ihre E-Mail-Adresse gesendet. Bitte überprüfen Sie Ihren Posteingang oder Spam-Ordnerund bestätigen Sie Ihre E-Mail-Adresse.'
        });
        
        setEmailSubmitted(true);
        localStorage.setItem('pendingEligibilityData', JSON.stringify(eligibilityData));
      }
    } catch (error) {
      console.error('Error during registration:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalOpen = () => {
    setShowRegistrationModal(true);
    setMessage(null);
    setEmailSubmitted(false);
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
    <div className="relative bg-white flex flex-col">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" 
             style={{ 
               backgroundColor: 'rgba(255, 255, 255, 0.9)', 
               zIndex: 9999 
             }}>
          <div className="text-center">
            <Spinner animation="border" role="status" style={{ width: '3rem', height: '3rem', color: '#064497' }}>
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <div className="mt-3" style={{ color: '#064497' }}>Bitte warten...</div>
          </div>
        </div>
      )}

      {/* Bottom right quadrant of ellipse */}
      <div className="absolute top-[-170px] left-[-25%] w-[70%] h-[300px] bg-[#064497] rounded-[50%]"></div>

      {/* Main heading */}
      <div className="absolute top-12 start-9">
        <h1 className="display-6 fw-regular text-[#ffffff] mb-2 font-['Roboto']">
          FÖRDERCHECK.NRW
        </h1>
      </div>

      {/* Main content */}
      <Container className="pt-20">
        <div className="d-flex justify-content-end align-items-center mb-4">
          <h2 className="text-[#064497] text-3xl mb-0">Wilkommen In Ihrem Persönlichem Bereich</h2>
        </div>
        
        <p className="text-right italic mb-5">
          Hier können Sie die erforderlichen Dokumente hochladen, die Antragsformulare bearbeiten und abschicken.
        </p>

        <Row className="mt-16">
          <Col md={6}>
            <h5 className="mb-4">Klicken Sie auf die Schaltflächen, um zu den jeweiligen Formularen zu gelangen:</h5>
            
            {formSections.map((section, index) => (
              <div key={index} className="d-flex align-items-center mb-12">
                <Button
                  className="flex-grow-1 py-3 me-3"
                  style={{ 
                    backgroundColor: isAuthenticated ? '#064497' : '#808080', 
                    border: 'none', 
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                    opacity: isAuthenticated ? 1 : 0.7
                  }}
                  onClick={section.onClick}
                >
                  {section.title}
                </Button>
                <div className="border rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: '55px', height: '55px', color: '#064497', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}>
                  {section.progress}%
                </div>
              </div>
            ))}
          </Col>

          <Col md={6}>
            <div className="text-center">
              <h5 className="mb-4">Klicken Sie hier um ihre Dokumentente hochzuladen und zu verwalten:</h5>
              <div className="d-flex align-items-center justify-content-center mb-12">
                <Button
                  className="flex-grow-1 py-3 me-3"
                  style={{ 
                    backgroundColor: isAuthenticated ? '#064497' : '#808080', 
                    border: 'none', 
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                    opacity: isAuthenticated ? 1 : 0.7
                  }}
                  onClick={handleDocumentUpload}
                >
                  DOKUMENTE HOCHLADEN
                </Button>
                <div className="border rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: '55px', height: '55px', color: '#064497', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}>
                  0%
                </div>
              </div>

              <div 
                className="rounded p-4 mb-4" 
                style={{ 
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
                  backgroundColor: '#ECECEC',
                }}
              >
                {isAuthenticated ? (
                  <>
                    <h6 className="text-start mb-3 fw-medium" style={{ color: '#064497' }}>Ihr Konto</h6>
                    <p className="text-start mb-3">
                      Ihre E-Mail-Adresse: <strong>{email}</strong>
                    </p>
                    <Button
                      onClick={logout}
                      className="w-100 py-2"
                      style={{ backgroundColor: '#064497', color: '#FFFFFF', border: 'none', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)' }}
                    >
                      Abmelden
                    </Button>
                  </>
                ) : (
                  <>
                    <h6 className="text-start mb-3 fw-medium" style={{ color: '#064497' }}>
                      {emailSubmitted ? 'Bestätigen Sie ihr Konto' : 'Konto erstellen'}
                    </h6>
                    <p className="text-start mb-3">
                      {emailSubmitted 
                        ? 'Schauen Sie in ihr E-Mail postfach oder Spam Ordner um fortzufahren'
                        : 'Erstellen Sie ein Konto, um alle Funktionen nutzen zu können.'}
                    </p>
                    <Button
                      onClick={handleModalOpen}
                      className="w-100 py-2"
                      style={{ 
                        backgroundColor: '#064497',
                        border: 'none', 
                        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
                      }}
                    >
                      {emailSubmitted ? 'E-Mail Ändern / Erneut Versuchen' : 'Konto erstellen'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Col>
        </Row>
      </Container>

      {/* Footer section with consistent spacing */}
      <div className="w-100 py-4 mt-auto">
        <div className="text-center">
          <Button
            className="px-5 py-2"
            style={{ backgroundColor: '#808080', border: 'none', width: '300px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)', opacity: 0.7 }}
          >
            PRÜFEN
          </Button>
        </div>
      </div>

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
            <Form.Group className="mb-3 mt-3">
              <Form.Control
                type="email"
                placeholder="E-Mail-Adresse"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                disabled={emailSubmitted}
              />
            </Form.Group>
            <Button 
              type="submit" 
              className="w-100" 
              style={{ 
                backgroundColor: emailSubmitted ? '#808080' : '#064497', 
                border: 'none', 
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                opacity: emailSubmitted ? 0.7 : 1
              }}
              disabled={emailSubmitted}
            >
              Konto erstellen
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default PersonalSpace;