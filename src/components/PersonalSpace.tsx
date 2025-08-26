import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Container, Row, Col, Button, Modal, Form, Spinner } from "react-bootstrap";
import { useAuth } from "../contexts/AuthContext";
import { supabase, storeEligibilityData, checkDocumentCheckStatus } from "../lib/supabase";
import ApplicationTimeline from "./PersonalSpace/ApplicationTimeline";
import OutstandingDocumentsInfo from "./PersonalSpace/OutstandingDocumentsInfo";
import FinalStatusMessage from "./PersonalSpace/FinalStatusMessage";
import { fetchOutstandingDocumentRequests, OutstandingDocumentRequest } from "../utils/outstandingRequests";
import "./PersonalSpace/ApplicationTimeline.css";

// Add material icons support
const materialIcons = document.createElement('link');
materialIcons.rel = 'stylesheet';
materialIcons.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
document.head.appendChild(materialIcons);




const STATUS_DISPLAY = {
  pending: 'Ausstehend',
  submitted: 'An Bewilligungsbehörde Übermittelt',
  in_progress: 'In Bearbeitung',
  documents_requested: 'Dokumente Angefordert',
  documents_received: 'Dokumente Erhalten',
  rejected: 'Abgelehnt',
  approved: 'Bewilligt'
} as const;

type ApplicationStatus = keyof typeof STATUS_DISPLAY;



const PersonalSpace: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, email, logout, login, user } = useAuth();
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string, isHtml?: boolean } | null>(null);
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [agbAccepted, setAgbAccepted] = useState(false);
  const [eligibilityData, setEligibilityData] = useState<any>(null);
  const [formProgress, setFormProgress] = useState<{ [key: string]: number }>({
    hauptantrag: 0,
    haushaltsauskunft: 0,
    einkommenserklarung: 0,
    selbstauskunft: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus>('pending');
  const [applicationTimeline, setApplicationTimeline] = useState<Record<string, string>>({});
  const [outstandingRequests, setOutstandingRequests] = useState<OutstandingDocumentRequest[]>([]);
  const [outstandingRequestsLoading, setOutstandingRequestsLoading] = useState(false);
  const [outstandingRequestsError, setOutstandingRequestsError] = useState<string | null>(null);

  useEffect(() => {
    // Listen for messages from validation page
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'HAND_IN_SUCCESS') {
        // Update application status when hand-in is successful
        setApplicationStatus('submitted');
        // You can add additional success handling here if needed
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

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
            .select('hauptantrag_progress, einkommenserklarung_progress, selbstauskunft_progress, haushaltsauskunft_progress, document_progress, application_status, application_status_timeline')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error('Error fetching progress:', error);
            return;
          }

          if (data) {
            setFormProgress({
              hauptantrag: data.hauptantrag_progress || 0,
              haushaltsauskunft: data.haushaltsauskunft_progress || 0,
              einkommenserklarung: data.einkommenserklarung_progress || 0,
              selbstauskunft: data.selbstauskunft_progress || 0,
              document_progress: data.document_progress || 0
            });
            if (data.application_status) {
              setApplicationStatus(data.application_status as ApplicationStatus);
            }
            if (data.application_status_timeline) {
              setApplicationTimeline(data.application_status_timeline);
            }
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

  // Fetch outstanding document requests when status is documents_requested
  useEffect(() => {
    if (user?.id && applicationStatus === 'documents_requested') {
      const fetchOutstandingRequests = async () => {
        setOutstandingRequestsLoading(true);
        setOutstandingRequestsError(null);
        try {
          const requests = await fetchOutstandingDocumentRequests(user.id);
          setOutstandingRequests(requests);
        } catch (error) {
          console.error('Error fetching outstanding requests:', error);
          setOutstandingRequestsError('Fehler beim Laden der Dokumentenanfragen.');
        } finally {
          setOutstandingRequestsLoading(false);
        }
      };

      fetchOutstandingRequests();
    }
  }, [user?.id, applicationStatus]);



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
        // Try to get the error message from the response
        let errorMessage = 'Failed to create user';
        let isEmailExistsError = false;
        
        try {
          const errorData = await createUserResponse.json();
          console.log('Backend error response:', errorData);
          
          // Check for error message in different possible fields
          errorMessage = errorData.message || errorData.detail || errorMessage;
          
          // Check if the error message indicates email already exists
          if (errorMessage.includes('existiert bereits') || errorMessage.includes('bereits registriert')) {
            isEmailExistsError = true;
          }
        } catch (e) {
          console.log('Could not parse error response as JSON:', e);
          // If we can't parse the response, check if it's a 500 error which might indicate email already exists
          if (createUserResponse.status === 500) {
            errorMessage = 'Ein Konto mit dieser E-Mail-Adresse existiert bereits. Bitte melden Sie sich an oder verwenden Sie eine andere E-Mail-Adresse.';
            isEmailExistsError = true;
          }
        }
        
        // Create a custom error with additional context
        const customError = new Error(errorMessage) as Error & { isEmailExists?: boolean };
        customError.isEmailExists = isEmailExistsError;
        throw customError;
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
            email: emailInput,
            eligibilityData: eligibilityData
          }),
        });

        if (!storeDataResponse.ok) {
          const errorData = await storeDataResponse.json();
          throw new Error(errorData.message || 'Failed to store eligibility data');
        }
        
        setMessage({
          type: 'success',
          text: 'Eine Bestätigungs-E-Mail wurde an Ihre E-Mail-Adresse gesendet. Bitte überprüfen Sie Ihren Posteingang oder Spam-Ordner und bestätigen Sie Ihre E-Mail-Adresse.'
        });
        
        setEmailSubmitted(true);
        localStorage.setItem('pendingEligibilityData', JSON.stringify(eligibilityData));
      }
    } catch (error) {
      console.error('Error during registration:', error);
      
      // Check if it's an email already exists error
      if (error instanceof Error && (error as any).isEmailExists) {
        setMessage({
          type: 'error',
          text: 'Ein Konto mit dieser E-Mail-Adresse existiert bereits. Bitte ',
          isHtml: true
        });
      } else {
        setMessage({
          type: 'error',
          text: error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten.'
        });
      }
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
    navigate('/document-upload', { state: { from: 'personal-space' } });
    
    /*if (!user?.id) {
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
    }*/
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

  const handleSelbstauskunft = () => {
    if (!isAuthenticated) {
      setShowRegistrationModal(true);
      return;
    }
    navigate('/selbstauskunft', { state: { from: 'personal-space' } });
  };

  const handleHaushaltsauskunft = () => {
    if (!isAuthenticated) {
      setShowRegistrationModal(true);
      return;
    }
    navigate('/haushaltsauskunft', { state: { from: 'personal-space' } });
  };

  const handleValidate = () => {
    if (!isAuthenticated) {
      setShowRegistrationModal(true);
      return;
    }
    
    // Open validation page in new tab
    const validationUrl = `/validation?residentId=${user?.id}`;
    window.open(validationUrl, '_blank');
  };





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
      <Container className="pt-24 pb-6">
        <div className="d-flex justify-content-end align-items-center mb-4">
          <h2 className="text-[#064497] text-3xl mb-0">Wilkommen In Ihrem Persönlichem Bereich</h2>
        </div>
        
        <p className="text-right italic mb-5">
          Hier können Sie die erforderlichen Dokumente hochladen, die Antragsformulare bearbeiten und abschicken.
        </p>

        {/* Account Section - Full Width */}
        <div 
          className="rounded p-4 mb-5" 
          style={{ 
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            backgroundColor: '#f8f9fa',
            border: '1px solid #e9ecef'
          }}
        >
          {isAuthenticated ? (
            <Row className="align-items-center">
              <Col md={8}>
                <h6 className="mb-2 fw-medium" style={{ color: '#064497' }}>Ihr Konto</h6>
                <p className="mb-0">
                  Ihre E-Mail-Adresse: <strong>{email}</strong>
                </p>
              </Col>
              <Col md={4} className="text-end">
                <Button
                  onClick={logout}
                  className="px-4 py-2"
                  style={{ backgroundColor: '#D7DAEA', color: '#000000', border: 'none', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}
                >
                  Abmelden
                </Button>
              </Col>
            </Row>
          ) : (
            <Row className="align-items-center">
              <Col md={8}>
                <h6 className="mb-2 fw-medium" style={{ color: '#064497' }}>
                  {emailSubmitted ? 'Bestätigen Sie ihr Konto' : 'Konto erstellen'}
                </h6>
                <p className="mb-0">
                  {emailSubmitted 
                    ? 'Schauen Sie in ihr E-Mail postfach oder Spam Ordner um fortzufahren'
                    : 'Erstellen Sie ein Konto, um alle Funktionen nutzen zu können.'}
                </p>
              </Col>
              <Col md={4} className="text-end">
                <Button
                  onClick={handleModalOpen}
                  className="px-4 py-2"
                  style={{ 
                    backgroundColor: '#064497',
                    color: '#ffffff',
                    border: 'none', 
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  {emailSubmitted ? 'E-Mail Ändern / Erneut Versuchen' : 'Konto erstellen'}
                </Button>
              </Col>
            </Row>
          )}
        </div>

        {/* Form Cards - 2x2 Grid */}
        <h5 className="mb-4">Füllen Sie die Formulare aus:</h5>
        
        <Row className="g-4">
          {/* Card 1: Hauptantrag */}
          <Col lg={6}>
            <div className="h-100" style={{
              background: '#f8f9fa',
              border: isAuthenticated ? '1px solid #dee2e6' : '1px solid #dee2e6',
              borderRadius: '12px',
              padding: '1.5rem',
              transition: 'all 0.3s ease',
              boxShadow: isAuthenticated ? '0 4px 12px rgba(6, 68, 151, 0.1)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
              opacity: isAuthenticated ? 1 : 0.7
            }}>
              <div className="d-flex align-items-center mb-3">
                <div className="me-3" style={{
                  background: isAuthenticated ? '#064497' : '#6c757d',
                  color: 'white',
                  borderRadius: '50%',
                  width: '35px',
                  height: '35px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  boxShadow: isAuthenticated ? 'inset 0 3px 6px rgba(0, 0, 0, 0.1), inset 0 -1px 4px rgba(0, 0, 0, 0.4)' : 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
                }}>1</div>
                <div className="flex-grow-1">
                  <h6 className="mb-1">Hauptantrag</h6>
                  <small className="text-muted">Grundlegende Angaben zu Ihrem Förderantrag</small>
                </div>
                <div className="text-end">
                  <div style={{
                    background: '#ffffff',
                    border: isAuthenticated ? '1px solid #064497' : '1px solid #dee2e6',
                    borderRadius: '50%',
                    width: '50px',
                    height: '50px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'regular',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                    color: isAuthenticated ? '#064497' : '#2d2d2d'
                  }}>
                    {formProgress.hauptantrag}%
                  </div>
                </div>
              </div>
              <Button
                className="w-100 py-2"
                style={{ 
                  backgroundColor: isAuthenticated ? '#064497' : '#808080', 
                  border: 'none', 
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  minHeight: '38px',
                  opacity: isAuthenticated ? 1 : 0.7
                }}
                onClick={handleHauptantrag}
                disabled={!isAuthenticated}
              >
                BEARBEITEN
              </Button>
            </div>
          </Col>

          {/* Card 2: Haushaltszusammensetzung */}
          <Col lg={6}>
            <div className="h-100" style={{
              background: '#f8f9fa',
              border: isAuthenticated ? '1px solid #dee2e6' : '1px solid #dee2e6',
              borderRadius: '12px',
              padding: '1.5rem',
              transition: 'all 0.3s ease',
              boxShadow: isAuthenticated ? '0 4px 12px rgba(6, 68, 151, 0.1)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
              opacity: isAuthenticated ? 1 : 0.7
            }}>
              <div className="d-flex align-items-center mb-3">
                <div className="me-3" style={{
                  background: isAuthenticated ? '#064497' : '#6c757d',
                  color: 'white',
                  borderRadius: '50%',
                  width: '35px',
                  height: '35px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  boxShadow: isAuthenticated ? 'inset 0 3px 6px rgba(0, 0, 0, 0.1), inset 0 -1px 4px rgba(0, 0, 0, 0.4)' : 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
                }}>2</div>
                <div className="flex-grow-1">
                  <h6 className="mb-1">Haushaltsauskunft</h6>
                  <small className="text-muted">Angaben zu allen Haushaltsmitgliedern</small>
                </div>
                <div className="text-end">
                  <div style={{
                    background: '#ffffff',
                    border: isAuthenticated ? '1px solid #064497' : '1px solid #dee2e6',
                    borderRadius: '50%',
                    width: '50px',
                    height: '50px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'regular',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                    color: isAuthenticated ? '#064497' : '#2d2d2d'
                  }}>
                    {formProgress.haushaltsauskunft}%
                  </div>
                </div>
              </div>
              <Button
                className="w-100 py-2"
                style={{ 
                  backgroundColor: isAuthenticated ? '#064497' : '#808080', 
                  border: 'none', 
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  minHeight: '38px',
                  opacity: isAuthenticated ? 1 : 0.7
                }}
                onClick={handleHaushaltsauskunft}
                disabled={!isAuthenticated}
              >
                BEARBEITEN
              </Button>
            </div>
          </Col>

          {/* Card 3: Financial Forms */}
          <Col lg={6}>
            <div className="h-100" style={{
              background: '#f8f9fa',
              border: isAuthenticated ? '1px solid #dee2e6' : '1px solid #dee2e6',
              borderRadius: '12px',
              padding: '1.5rem',
              transition: 'all 0.3s ease',
              boxShadow: (isAuthenticated && formProgress.haushaltsauskunft === 100) ? '0 4px 12px rgba(6, 68, 151, 0.1)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
              opacity: (isAuthenticated) ? 1 : 0.6
            }}>
              <div className="d-flex align-items-center mb-3">
                <div className="me-3" style={{
                  background: (isAuthenticated && formProgress.haushaltsauskunft === 100) ? '#064497' : '#6c757d',
                  color: 'white',
                  borderRadius: '50%',
                  width: '35px',
                  height: '35px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  boxShadow: isAuthenticated ? 'inset 0 3px 6px rgba(0, 0, 0, 0.1), inset 0 -1px 4px rgba(0, 0, 0, 0.4)' : 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
                }}>3</div>
                <div className="flex-grow-1">
                  <h6 className="mb-1">Einkommenserklärung & Selbstauskunft</h6>
                  <small className="text-muted">Detaillierte Finanzangaben</small>
                </div>
                <div className="text-end">
                  {formProgress.haushaltsauskunft === 100 && (
                  <div className="d-flex gap-2">
                    <div style={{
                      background: '#ffffff',
                      border: isAuthenticated ? '1px solid #064497' : '1px solid #dee2e6',
                      borderRadius: '50%',
                      width: '50px',
                      height: '50px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'regular',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                      color: isAuthenticated ? '#064497' : '#2d2d2d'
                    }}>
                      {formProgress.einkommenserklarung}%
                    </div>
                    <div style={{
                      background: isAuthenticated ? '#D7DAEA' : '#ffffff',
                      border: isAuthenticated ? '1px solidrgb(90, 90, 90)' : '1px solid #dee2e6',
                      borderRadius: '50%',
                      width: '50px',
                      height: '50px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'regular',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                      color: '#2d2d2d'
                    }}>
                      {formProgress.selbstauskunft}%
                    </div>
                  </div>
                         )}
                </div>
              </div>

              {isAuthenticated && formProgress.haushaltsauskunft < 100 ? (
                <div className="alert alert-warning d-flex align-items-center justify-content-center" style={{ 
                  fontSize: '0.8rem',
                  minHeight: '38px',
                  paddingTop: '0.5rem',
                  paddingBottom: '0.5rem',
                  margin: 0
                }}>
                  Bitte vervollständigen Sie zuerst die Haushaltsauskunft (2.)
                </div>
              ) : (
                <div className="d-flex gap-2">
                  <Button
                    className="flex-fill py-2"
                    style={{ 
                      backgroundColor: (isAuthenticated && formProgress.haushaltsauskunft === 100) ? '#064497' : '#808080', 
                      border: 'none', 
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      fontWeight: '500',
                      minHeight: '38px',
                      opacity: (isAuthenticated && formProgress.haushaltsauskunft === 100) ? 1 : 0.7
                    }}
                    onClick={handleEinkommenserklaerung}
                    disabled={!isAuthenticated || formProgress.haushaltsauskunft < 100}
                  >
                    Einkommenserklärung
                  </Button>
                  <Button
                    className="flex-fill py-2"
                    style={{ 
                      backgroundColor: (isAuthenticated && formProgress.haushaltsauskunft === 100) ? '#D7DAEA' : '#808080', 
                      border: 'none', 
                      color: isAuthenticated ? 'black' : '#ffffff',
                      fontSize: '0.85rem',
                      fontWeight: '500',
                      minHeight: '38px',
                      opacity: (isAuthenticated && formProgress.haushaltsauskunft === 100) ? 1 : 0.7
                    }}
                    onClick={handleSelbstauskunft}
                    disabled={!isAuthenticated || formProgress.haushaltsauskunft < 100}
                  >
                    Selbstauskunft
                  </Button>
                </div>
              )}
            </div>
          </Col>

          {/* Card 4: Documents */}
          <Col lg={6}>
            <div className="h-100" style={{
              background: '#f8f9fa',
              border: isAuthenticated ? '1px solid #dee2e6' : '1px solid #dee2e6',
              borderRadius: '12px',
              padding: '1.5rem',
              transition: 'all 0.3s ease',
              boxShadow: isAuthenticated ? '0 4px 12px rgba(6, 68, 151, 0.1)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
              opacity: isAuthenticated ? 1 : 0.7
            }}>
              <div className="d-flex align-items-center mb-3">
                <div className="me-3" style={{
                  background: isAuthenticated ? '#064497' : '#6c757d',
                  color: 'white',
                  borderRadius: '50%',
                  width: '35px',
                  height: '35px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  boxShadow: isAuthenticated ? 'inset 0 3px 6px rgba(0, 0, 0, 0.1), inset 0 -1px 4px rgba(0, 0, 0, 0.4)' : 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
                }}>4</div>
                <div className="flex-grow-1">
                  <h6 className="mb-1">Dokumente Hochladen</h6>
                  <small className="text-muted">Erforderliche Unterlagen verwalten</small>
                </div>
                <div className="text-end">
                  <div style={{
                    background: '#ffffff',
                    border: isAuthenticated ? '1px solid #064497' : '1px solid #dee2e6',
                    borderRadius: '50%',
                    width: '50px',
                    height: '50px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'regular',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                    color: isAuthenticated ? '#064497' : '#2d2d2d'
                  }}>
                    {formProgress.document_progress}%
                  </div>
                </div>
              </div>
              <Button
                className="w-100 py-2"
                style={{ 
                  backgroundColor: isAuthenticated ? '#064497' : '#808080', 
                  border: 'none', 
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  minHeight: '38px',
                  opacity: isAuthenticated ? 1 : 0.7
                }}
                onClick={handleDocumentUpload}
                disabled={!isAuthenticated}
              >
                BEARBEITEN
              </Button>
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
          {applicationStatus === 'submitted' ? (
            <Button
              className="px-5 py-2 fw-regular text-[#FFFFFF] mb-3"
              style={{ 
                backgroundColor: '#064497', 
                border: '2px solid #064497', 
                width: '300px', 
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)',
                opacity: 1,
                fontSize: '1.1rem'
              }}
              onClick={() => navigate('/view-application')}
            >
              EINGEREICHTEN ANTRAG EINSEHEN
            </Button>
          ) : (
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
              onClick={handleValidate}
            >
              PRÜFEN
            </Button>
          )}
        </div>
      </div>

      {applicationStatus !== 'pending' && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(255,255,255,0.98)',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div className="rounded p-5 shadow-lg" style={{ background: '#f8f9fa', maxWidth: 700, width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 className="mb-4 text-[#064497]">Antrag eingereicht</h2>
            <p className="mb-4">Ihr Antrag wurde erfolgreich eingereicht und befindet sich nun in der Prüfung. Änderungen sind aktuell nicht mehr möglich. Sie werden per E-Mail über den weiteren Verlauf informiert.</p>
            
            {/* Application Timeline */}
            <ApplicationTimeline 
              currentStatus={applicationStatus} 
              timeline={applicationTimeline} 
            />
            
            {/* Outstanding Documents Info - only show for documents_requested status and when there are outstanding requests */}
            {applicationStatus === 'documents_requested' && (
              <OutstandingDocumentsInfo
                outstandingRequests={outstandingRequests}
                isLoading={outstandingRequestsLoading}
                error={outstandingRequestsError}
              />
            )}
            
            {/* Final Status Message - only show for approved/rejected status */}
            {(applicationStatus === 'approved' || applicationStatus === 'rejected') && (
              <FinalStatusMessage
                status={applicationStatus}
                timeline={applicationTimeline}
              />
            )}

            <div className="d-flex flex-column gap-3">
              <Button 
                style={{ background: '#064497', border: 'none' }} 
                onClick={() => {
                  console.log('Eingereichten Antrag Einsehen button clicked');
                  console.log('Navigating to /view-application with state:', { from: 'personal-space' });
                  navigate('/view-application', { state: { from: 'personal-space' } });
                }}
              >
                Eingereichten Antrag Einsehen
              </Button>
              
              {/* Take-back button - always visible */}
              <Button 
                style={{ background: '#D7DAEA', color: '#000000', border: 'none' }} 
                onClick={async () => {
                  // Check if application can be taken back
                  if (applicationStatus !== 'submitted') {
                    // Show warning modal instead of taking back
                    alert('Ihr Antrag befindet sich bereits in Bearbeitung. Bei Fragen oder Änderungswünschen wenden Sie sich bitte direkt an die Bewilligungsbehörde.');
                    return;
                  }
                  
                  try {
                    // First, find and remove the most recent application from the applications table
                    if (user?.id) {
                      // Get the most recent application for this user
                      const { data: applications, error: fetchError } = await supabase
                        .from('applications')
                        .select('id')
                        .eq('resident_id', user.id)
                        .order('submitted_at', { ascending: false })
                        .limit(1);
                      
                      if (fetchError) {
                        console.error('Error fetching applications:', fetchError);
                        return;
                      }
                      
                      if (applications && applications.length > 0) {
                        const applicationId = applications[0].id;
                        
                        // Delete the application from the applications table
                        const { error: deleteError } = await supabase
                          .from('applications')
                          .delete()
                          .eq('id', applicationId);
                        
                        if (deleteError) {
                          console.error('Error deleting application:', deleteError);
                          return;
                        }
                        
                        console.log('Successfully deleted application:', applicationId);
                      }
                    }
                    
                    // Reset application status to pending in the database
                    if (user?.id) {
                      const { error } = await supabase
                        .from('user_data')
                        .update({ application_status: 'pending' })
                        .eq('id', user.id);
                      
                      if (error) {
                        console.error('Error resetting application status:', error);
                      }
                    }
                    
                    // Reset local state
                    setApplicationStatus('pending');
                    
                    // Reload the page
                    //window.location.reload();
                  } catch (error) {
                    console.error('Error during reset:', error);
                  }
                }}
              >
                Einreichung Rückgängig machen
              </Button>
              
              <Button 
                style={{ background: '#D7DAEA', color: '#000000', border: 'none' }} 
                onClick={() => logout()}
              >
                Abmelden
              </Button>
            </div>
          </div>
        </div>
      )}

      <Modal show={showRegistrationModal} onHide={() => setShowRegistrationModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Konto erstellen</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {message && (
            <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} mb-3`}>
              {message.isHtml ? (
                <>
                  {message.text}
                  <a 
                    href="/login" 
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/login');
                    }}
                    style={{ color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }}
                  >
                    melden Sie sich an
                  </a>
                  {' oder verwenden Sie eine andere E-Mail-Adresse.'}
                </>
              ) : (
                message.text
              )}
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