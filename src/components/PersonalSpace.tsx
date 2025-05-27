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
  const [agbAccepted, setAgbAccepted] = useState(false);
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
    if (!agbAccepted) {
      setMessage({
        type: 'error',
        text: 'Bitte akzeptieren Sie die AGB, um fortzufahren.'
      });
      return;
    }
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

  const handleEinkommenserklaerung = () => {
    if (!isAuthenticated) {
      setShowRegistrationModal(true);
      return;
    }
    navigate('/einkommenserklaerung', { state: { from: 'personal-space' } });
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
      onClick: handleEinkommenserklaerung
    },
    { 
      title: "SELBSTAUSKUNFT", 
      progress: formProgress.selbstauskunft,
      onClick: () => {} // To be implemented
    }
  ];

  return (
    <div className="relative bg-white flex flex-col">
      <style>
        {`
          .form-check-input:checked {
            background-color: #064497 !important;
            border-color: #064497 !important;
          }
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
        `}
      </style>

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

      <div className="blue-corner">
        <span className="blue-corner-text long">FÖRDERCHECK.NRW</span>
        <span className="blue-corner-text short">FC.NRW</span>
      </div>

      {/* Main content */}
      <Container className="pt-24">
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
                  backgroundColor: '#f8f9fa',
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
                      style={{ backgroundColor: '#D7DAEA', color: '#000000', border: 'none', boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)' }}
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
      <div className="w-100 py-5 mt-auto" style={{ 
        backgroundColor: '#f8f9fa',
        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.05)'
      }}>
        <div className="text-center px-4">
          <h3 className="text-[#064497] mb-3 fw-semibold" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)' }}>
            Bereit Zum Einreichen?
          </h3>
          <p className="text-dark mb-4" style={{ 
            fontSize: '1.1rem',
            lineHeight: '1.6',
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            Überprüfen Sie jetzt alle Ihre Angaben und Dokumente auf Vollständigkeit. 
            Sie erhalten eine detaillierte Übersicht über vollständige und fehlende Angaben.
            Die Prüfung ist unverbindlich und führt nicht zur automatischen Einreichung. Sie können ihre Angaben jederzeit ändern und belibig oft prüfen.
          </p>
          <Button
            className="px-5 py-2 fw-regular text-[#FFFFFF]"
            style={{ 
              backgroundColor: '#064497', 
              border: '2px solid #064497', 
              width: '300px', 
              boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)',
              opacity: 1,
              fontSize: '1.1rem'
            }}
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
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                id="agb-checkbox"
                label={
                  <span>
                    Ich habe die{' '}
                    <a 
                      href="https://www.xn--frdercheck-nrw-vpb.com/datenschutzerklarung/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: '#064497', textDecoration: 'underline' }}
                    >
                      Allgemeine Geschäftsbedingungen
                    </a>
                    {' '}gelesen und bin mit ihnen einverstanden
                  </span>
                }
                checked={agbAccepted}
                onChange={(e) => setAgbAccepted(e.target.checked)}
                disabled={emailSubmitted}
                className="custom-checkbox"
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