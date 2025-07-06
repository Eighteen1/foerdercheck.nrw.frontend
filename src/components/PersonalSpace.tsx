import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Container, Row, Col, Button, Modal, Form, Spinner } from "react-bootstrap";
import { useAuth } from "../contexts/AuthContext";
import { supabase, storeEligibilityData, checkDocumentCheckStatus, ensureUserFinancialsExists } from "../lib/supabase";
import postcodeMap from '../utils/postcode_map.json';
import { AssignmentRule } from '../types/city';
import { sendMessage, sendNewApplicationNotification } from '../utils/messages';

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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const TYPE_LABELS: Record<string, string> = {
  "neubau": "Neubau Eigenheim",
  "ersterwerb-eigenheim": "Ersterwerb Eigenheim",
  "bestandserwerb-eigenheim": "Bestandserwerb Eigenheim",
  "bestandserwerb-wohnung": "Bestandserwerb Eigentumswohnung",
  "ersterwerb-wohnung": "Ersterwerb Eigentumswohnung",
  "nutzungsaenderung": "Nutzungsänderung"
};

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
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationResult, setValidationResult] = useState<'success' | 'warning' | null>(null);
  const [handInStep, setHandInStep] = useState<'validation' | 'city' | 'sign' | null>(null);
  const [cityInfo, setCityInfo] = useState<{ name: string; id: string } | null>(null);
  const [cityDropdown, setCityDropdown] = useState('');
  const [objectData, setObjectData] = useState<any>(null);
  const [foerderVariante, setFoerderVariante] = useState('');
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus>('pending');
  const [handInError, setHandInError] = useState<string | null>(null);

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
            .select('hauptantrag_progress, einkommenserklarung_progress, selbstauskunft_progress, application_status')
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
            if (data.application_status) {
              setApplicationStatus(data.application_status as ApplicationStatus);
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

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      const fetchStatusAndObject = async () => {
        setIsLoading(true);
        try {
          // Fetch object_data for address and foerderVariante
          const { data: objData, error: objError } = await supabase
            .from('object_data')
            .select('obj_postal_code, foerderVariante')
            .eq('user_id', user.id)
            .single();
          if (objData) {
            setObjectData(objData);
            setFoerderVariante(objData.foerderVariante || '');
          }
        } catch (e) {
          // ignore
        } finally {
          setIsLoading(false);
        }
      };
      fetchStatusAndObject();
    }
  }, [isAuthenticated, user?.id]);

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

  const handleSelbstauskunft = () => {
    if (!isAuthenticated) {
      setShowRegistrationModal(true);
      return;
    }
    navigate('/selbstauskunft', { state: { from: 'personal-space' } });
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
      onClick: handleSelbstauskunft
    }
  ];

  const handleValidate = () => {
    if (!isAuthenticated) {
      setShowRegistrationModal(true);
      return;
    }
    // Check progress
    if (formProgress.hauptantrag === 100 && formProgress.einkommenserklarung === 100) {
      setValidationResult('success');
    } else {
      setValidationResult('warning');
    }
    setHandInStep('validation');
    setShowValidationModal(true);
  };

  const handleHandIn = async () => {
    setHandInStep('city');
    setHandInError(null);
    setIsLoading(true);
    try {
      // Fetch latest object_data if not already loaded
      let obj = objectData;
      if (!obj && user?.id) {
        try {
          const { data: objData, error: objError } = await supabase
            .from('object_data')
            .select('obj_postal_code, foerderVariante')
            .eq('user_id', user.id)
            .single();
          
          if (!objError && objData) {
            obj = objData;
            setObjectData(objData);
            setFoerderVariante(objData?.foerderVariante || '');
          }
        } catch (fetchError) {
          console.warn('Failed to fetch object data:', fetchError);
          // Continue without object data - user can still select city manually
        }
      }
      const postcode = obj?.obj_postal_code;
      if (!postcode) {
        setCityInfo(null);
        setHandInStep('city');
        setIsLoading(false);
        return;
      }
      const city = postcodeMap[postcode as keyof typeof postcodeMap];
      if (city) {
        setCityInfo(city);
        setCityDropdown(city.id);
      } else {
        setCityInfo(null);
        setCityDropdown('');
      }
      setHandInStep('city');
    } catch (e) {
      setHandInError('Fehler beim Laden der Objektadresse.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignAndSubmit = async () => {
    setIsLoading(true);
    setHandInError(null);
    try {
      let cityId = cityInfo?.id || cityDropdown;
      let cityName = cityInfo?.name || (cityDropdown ? 'Rhein-Kreis Neuss' : '');
      if (!cityId) {
        setHandInError('Bitte wählen Sie einen Kreis/Stadt aus.');
        setIsLoading(false);
        return;
      }
  
      // Get city settings to check assignment rules
      const { data: cityData, error: cityError } = await supabase
        .from('cities')
        .select('settings')
        .eq('id', cityId)
        .single();

      if (cityError) throw cityError;

      let assignedAgent = null;
      if (cityData?.settings?.assignmentRules) {
        const { filterType, rules } = cityData.settings.assignmentRules;

        try {
          // Get user data for household size and employment type
          const { data: userData, error: userError } = await supabase
            .from('user_data')
            .select('adult_count, child_count, employment')
            .eq('id', user?.id)
            .single();

          // Get object data for postcode
          const { data: objectData, error: objectError } = await supabase
            .from('object_data')
            .select('obj_postal_code')
            .eq('user_id', user?.id)
            .single();

          // Only proceed with assignment if we have the required data
          if (!userError && !objectError && userData && objectData) {
            // Determine assigned agent based on filter type
            switch (filterType) {
              case 'type':
                if (foerderVariante && rules[foerderVariante]) {
                  assignedAgent = rules[foerderVariante];
                }
                break;
              case 'postcode':
                if (objectData.obj_postal_code && rules[objectData.obj_postal_code]) {
                  assignedAgent = rules[objectData.obj_postal_code];
                }
                break;
              case 'household':
                const adultCount = userData.adult_count || 0;
                const childCount = userData.child_count || 0;
                
                // Format adult count
                const adultKey = adultCount >= 3 ? '3+' : adultCount.toString();
                // Format child count
                const childKey = childCount >= 3 ? '3+' : childCount.toString();
                
                // Create the rule key in format "adultCount_childCount"
                const ruleKey = `${adultKey}_${childKey}`;
                if (rules[ruleKey]) {
                  assignedAgent = rules[ruleKey];
                }
                break;
              case 'employment':
                if (userData.employment && rules[userData.employment]) {
                  assignedAgent = rules[userData.employment];
                }
                break;
            }
          }
          // If any error occurred or data is missing, assignedAgent remains null
          // This allows the application to be submitted without assignment
        } catch (assignmentError) {
          console.warn('Assignment logic failed, proceeding without assignment:', assignmentError);
          // Continue without assignment - assignedAgent remains null
        }
      }

      // Log assignment result for debugging
      if (!assignedAgent) {
        console.log('Application submitted without assignment due to missing data or assignment rules');
      }

      // Ensure user_financials table exists for the user
      if (user?.id) {
        try {
          await ensureUserFinancialsExists(user.id);
        } catch (financialsError) {
          console.warn('Failed to ensure user_financials exists, continuing with application submission:', financialsError);
          // Continue with application submission even if user_financials creation fails
        }
      }

      console.log('Attempting to insert application with data:', {
        resident_id: user?.id,
        city_id: cityId,
        type: foerderVariante,
        status: 'new',
        assigned_agent: assignedAgent
      });
  
      // Insert into applications
      const { data, error: appError } = await supabase
        .from('applications')
        .insert({
          resident_id: user?.id,
          city_id: cityId,
          type: foerderVariante,
          status: 'new',
          assigned_agent: assignedAgent
        })
        .select();
  
      if (appError) {
        console.error('Application insert error:', appError);
        throw appError;
      }
  
      console.log('Successfully inserted application:', data);
  
      // Update user_data
      const { error: userError } = await supabase
        .from('user_data')
        .update({ application_status: 'submitted' })
        .eq('id', user?.id);
  
      if (userError) {
        console.error('User data update error:', userError);
        throw userError;
      }

      // Send notifications
      if (assignedAgent) {
        // Get assigned agent's settings
        const { data: assignedAgentData, error: assignedAgentError } = await supabase
          .from('agents')
          .select('name, email, settings')
          .eq('id', assignedAgent)
          .single();

        if (!assignedAgentError && assignedAgentData) {
          const formattedType = TYPE_LABELS[foerderVariante] || foerderVariante;
          const messageContent = `Ein neuer Antrag vom Typ "${formattedType}" (ID: ${data[0].id}) wurde Ihnen zugewiesen.`;

          // Send in-app message
          await sendMessage({
            recipient_id: assignedAgent,
            type: 'system',
            category: 'application_assigned',
            title: 'Neuer Antrag zugewiesen',
            content: messageContent,
            metadata: { application_id: data[0].id }
          });

          // Send email if enabled
          const shouldSendEmail = assignedAgentData.settings?.notifications?.emailNotifications?.applicationAssigned === true;
          if (shouldSendEmail) {
            try {
              // Get a system token
              const tokenResponse = await fetch(`${BACKEND_URL}/api/system/token`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                }
              });
              if (!tokenResponse.ok) {
                throw new Error('Failed to get system token');
              }
              const { token } = await tokenResponse.json();

              const response = await fetch(`${BACKEND_URL}/api/send-assignment-message`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  to_email: assignedAgentData.email,
                  to_name: assignedAgentData.name,
                  from_email: 'system@foerdercheck.nrw',
                  from_name: 'Fördercheck.NRW',
                  title: 'Neuer Antrag zugewiesen',
                  content: messageContent
                }),
              });

              if (!response.ok) {
                console.error('Failed to send assignment email notification');
              }
            } catch (error) {
              console.error('Error sending assignment email:', error);
            }
          }
        }
      }

      // Send notifications to other team members about new application
      await sendNewApplicationNotification(data[0].id, cityId, assignedAgent);
  
      setApplicationStatus('submitted');
      setShowValidationModal(false);
    } catch (e) {
      console.error('Full error object:', e);
      setHandInError('Fehler beim Einreichen des Antrags.');
    } finally {
      setIsLoading(false);
    }
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
          <div className="rounded p-5 shadow-lg" style={{ background: '#f8f9fa', maxWidth: 500 }}>
            <h2 className="mb-4 text-[#064497]">Antrag eingereicht</h2>
            <p className="mb-4">Ihr Antrag wurde erfolgreich eingereicht und befindet sich nun in der Prüfung. Änderungen sind aktuell nicht mehr möglich. Sie werden per E-Mail über den weiteren Verlauf informiert.</p>
            
            <div className="mb-4 p-3 rounded" style={{ 
              background: '#ffffff', 
              border: '1px solid #e0e0e0',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
            }}>
              <h6 className="mb-2 text-muted">Status Ihres Antrags:</h6>
              <div className="d-flex align-items-center">
                <div className="me-2" style={{ 
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '50%', 
                  background: '#064497' 
                }}></div>
                <span style={{ color: '#064497', fontWeight: 500 }}>
                  {STATUS_DISPLAY[applicationStatus]}
                </span>
              </div>
            </div>

            <div className="d-flex flex-column gap-3">
              <Button 
                style={{ background: '#064497', border: 'none' }} 
                onClick={() => navigate('/view-application')}
              >
                Eingereichten Antrag Einsehen
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

      <Modal show={showValidationModal} onHide={() => setShowValidationModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Prüfung Ihrer Angaben</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {handInStep === 'validation' && (
            <>
              {validationResult === 'success' ? (
                <div className="alert alert-success mb-3">Alle erforderlichen Formulare sind vollständig ausgefüllt. Sie können Ihren Antrag jetzt einreichen.</div>
              ) : (
                <div className="alert alert-warning mb-3">Nicht alle Formulare sind vollständig ausgefüllt. Sie können trotzdem fortfahren, aber wir empfehlen, alle Angaben zu vervollständigen.</div>
              )}
              <div className="d-flex justify-content-end gap-2">
                <Button variant="secondary" onClick={() => setShowValidationModal(false)}>Schließen</Button>
                <Button
                  style={{ background: validationResult === 'success' ? '#064497' : '#D7DAEA', color: validationResult === 'success' ? '#fff' : '#000', border: 'none' }}
                  onClick={handleHandIn}
                >
                  Antrag einreichen
                </Button>
              </div>
            </>
          )}
          {handInStep === 'city' && (
            <>
              {isLoading ? (
                <div className="text-center"><Spinner animation="border" /></div>
              ) : (
                <>
                  {objectData?.obj_postal_code ? (
                    cityInfo ? (
                      <div className="alert alert-success mb-3">Ihr Antrag wird an die Bewilligungsbehörde <b>{cityInfo.name}</b> gesendet.</div>
                    ) : (
                      <div className="alert alert-danger mb-3">Leider befindet sich Ihr Objekt in einem nicht unterstützten Kreis / Stadt.</div>
                    )
                  ) : (
                    <>
                      <div className="alert alert-warning mb-3">Sie haben keine vollständige Adresse Ihres Förderobjekts definiert.</div>
                      <Form.Group className="mb-3">
                        <Form.Label>Kreis/Stadt auswählen</Form.Label>
                        <Form.Select value={cityDropdown} onChange={e => setCityDropdown(e.target.value)}>
                          <option value="">Bitte wählen...</option>
                          <option value="03e8b85b-1a8f-47ca-a4bb-c486c77e695a">Rhein-Kreis Neuss</option>
                        </Form.Select>
                      </Form.Group>
                    </>
                  )}
                  {handInError && <div className="alert alert-danger mb-2">{handInError}</div>}
                  <div className="d-flex justify-content-end gap-2">
                    <Button variant="secondary" onClick={() => setShowValidationModal(false)}>Abbrechen</Button>
                    <Button
                      style={{ background: '#064497', color: '#fff', border: 'none' }}
                      onClick={() => setHandInStep('sign')}
                      disabled={(!cityInfo && !cityDropdown)}
                    >
                      Weiter zur Signatur
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
          {handInStep === 'sign' && (
            <>
              <div className="alert alert-info mb-3">Bitte bestätigen Sie die Einreichung Ihres Antrags. (Die digitale Signatur wird in Kürze verfügbar sein.)</div>
              {handInError && <div className="alert alert-danger mb-2">{handInError}</div>}
              <div className="d-flex justify-content-end gap-2">
                <Button variant="secondary" onClick={() => setShowValidationModal(false)}>Abbrechen</Button>
                <Button
                  style={{ background: '#064497', color: '#fff', border: 'none' }}
                  onClick={handleSignAndSubmit}
                  disabled={isLoading}
                >
                  Antrag jetzt einreichen
                </Button>
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default PersonalSpace;