import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Container, Row, Col, Button, Modal, Form, Spinner } from "react-bootstrap";
import { useAuth } from "../contexts/AuthContext";
import { supabase, storeEligibilityData, checkDocumentCheckStatus } from "../lib/supabase";
import ApplicationTimeline from "./PersonalSpace/ApplicationTimeline";
import OutstandingDocumentsInfo from "./PersonalSpace/OutstandingDocumentsInfo";
import FinalStatusMessage from "./PersonalSpace/FinalStatusMessage";
import SignatureDocumentsStatus from "./PersonalSpace/SignatureDocumentsStatus";
import { fetchOutstandingDocumentRequests, OutstandingDocumentRequest } from "../utils/outstandingRequests";
import { ensureUserFinancialsExists } from "../lib/supabase";
import { sendMessage, sendNewApplicationNotification } from "../utils/messages";
import "./PersonalSpace/ApplicationTimeline.css";
import { User } from '@supabase/supabase-js';
import PopupInfoDialog from "./common/PopupInfoDialog";

// Extend the Supabase User type with our custom properties
interface ExtendedUser extends User {
  signature_token?: string;
}

// Add material icons support
const materialIcons = document.createElement('link');
materialIcons.rel = 'stylesheet';
materialIcons.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
document.head.appendChild(materialIcons);




const STATUS_DISPLAY = {
  pending: 'Ausstehend',
  signing: 'Unterschriften erforderlich',
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
  const [extendedUser, setExtendedUser] = useState<ExtendedUser | null>(null);
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
  const [showResetConfirmationModal, setShowResetConfirmationModal] = useState(false);
  const [showTakeBackConfirmationModal, setShowTakeBackConfirmationModal] = useState(false);
  const [allSignatureDocumentsUploaded, setAllSignatureDocumentsUploaded] = useState(false);
  const [showUploadWarningDialog, setShowUploadWarningDialog] = useState(false);
  const [isSubmittingApplication, setIsSubmittingApplication] = useState(false);
  const [showPopupInfoDialog, setShowPopupInfoDialog] = useState(false);



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

  // Message handling useEffect - placed after fetchProgress is defined
  useEffect(() => {
    // Listen for messages from validation page
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'HAND_IN_SUCCESS') {
        // Update application status when hand-in is successful
        setApplicationStatus('submitted');
        // Refresh data to show updated status
        // Note: fetchProgress will be called in the next useEffect when user.id changes
      }
    };

    // Listen for localStorage changes (fallback for when postMessage doesn't work)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'handInSuccess' && event.newValue) {
        try {
          const data = JSON.parse(event.newValue);
          if (data.type === 'HAND_IN_SUCCESS') {
            // Update application status when hand-in is successful
            setApplicationStatus('submitted');
            // Clear the localStorage message
            localStorage.removeItem('handInSuccess');
          }
        } catch (error) {
          console.error('Error parsing handInSuccess data:', error);
        }
      }
    };

    // Check for existing handInSuccess message on component mount
    const checkHandInSuccess = () => {
      const handInSuccess = localStorage.getItem('handInSuccess');
      if (handInSuccess) {
        try {
          const data = JSON.parse(handInSuccess);
          if (data.type === 'HAND_IN_SUCCESS') {
            // Update application status when hand-in is successful
            setApplicationStatus('submitted');
            // Clear the localStorage message
            localStorage.removeItem('handInSuccess');
          }
        } catch (error) {
          console.error('Error parsing handInSuccess data:', error);
        }
      }
    };

    // Check on mount
    checkHandInSuccess();

    window.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Refresh data when application status changes to submitted
  useEffect(() => {
    if (user?.id && applicationStatus === 'submitted') {
      // Refresh progress data to show updated status
      const refreshData = async () => {
        try {
          const { data, error } = await supabase
            .from('user_data')
            .select('hauptantrag_progress, einkommenserklarung_progress, selbstauskunft_progress, haushaltsauskunft_progress, document_progress, application_status, application_status_timeline')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error('Error refreshing data:', error);
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
          console.error('Error refreshing data:', error);
        }
      };

      refreshData();
    }
  }, [user?.id, applicationStatus]);

  // Refresh data when navigating from signature-upload page
  useEffect(() => {
    if (user?.id && location.state?.from === 'signature-upload' && location.state?.refresh) {
      const refreshData = async () => {
        setIsLoading(true);
        try {
          const { data, error } = await supabase
            .from('user_data')
            .select('hauptantrag_progress, einkommenserklarung_progress, selbstauskunft_progress, haushaltsauskunft_progress, document_progress, application_status, application_status_timeline')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error('Error refreshing data:', error);
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
          console.error('Error refreshing data:', error);
        } finally {
          setIsLoading(false);
        }
      };

      refreshData();
      
      // Clear the refresh flag to prevent unnecessary refreshes
      navigate(location.pathname, { replace: true, state: { from: 'signature-upload' } });
    }
  }, [user?.id, location.state, navigate]);

  // Auto-hide popup info dialog when user navigates away and back
  useEffect(() => {
    if (showPopupInfoDialog) {
      const handleVisibilityChange = () => {
        if (document.hidden) {
          // User navigated away, hide the dialog when they come back
          const handleFocus = () => {
            setShowPopupInfoDialog(false);
            window.removeEventListener('focus', handleFocus);
          };
          window.addEventListener('focus', handleFocus);
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [showPopupInfoDialog]);

  // Listen for messages from ValidationPage when signature PDFs are sent
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SIGNATURE_PDFS_SENT') {
        console.log('Received signature PDFs sent message:', event.data);
        // Update application status to signing
        setApplicationStatus('signing');
        // Refresh extended user data to get the signature_token
        if (user?.id) {
          fetchExtendedUserData();
        }
      }
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'signaturePdfsSent') {
        try {
          const data = JSON.parse(event.newValue || '{}');
          if (data.type === 'SIGNATURE_PDFS_SENT') {
            console.log('Received signature PDFs sent message from localStorage:', data);
            setApplicationStatus('signing');
            if (user?.id) {
              fetchExtendedUserData();
            }
          }
        } catch (err) {
          console.error('Error parsing signature PDFs sent message:', err);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user?.id]);

  // Security measure: Refresh page when returning to tab if status is "signing"
  useEffect(() => {
    if (applicationStatus !== 'signing') {
      return;
    }

    let isRefreshing = false;
    let lastVisibilityChange = Date.now();

    const handleVisibilityChange = () => {
      const now = Date.now();
      
      // If the page becomes visible again and it's been more than 1 second since last change
      if (!document.hidden && now - lastVisibilityChange > 1000) {
        // Check if we're not already being refreshed by other components
        const isBeingRefreshedByOtherComponents = 
          location.state?.from === 'signature-upload' || 
          location.state?.from === 'validation' ||
          location.state?.refresh === true;
        
        if (!isBeingRefreshedByOtherComponents && !isRefreshing) {
          console.log('Security refresh: User returned to tab with signing status, refreshing page');
          isRefreshing = true;
          
          // Small delay to ensure any pending state updates are processed
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }
      }
      
      lastVisibilityChange = now;
    };

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also listen for focus events as a fallback
    const handleWindowFocus = () => {
      const now = Date.now();
      
      if (now - lastVisibilityChange > 1000) {
        const isBeingRefreshedByOtherComponents = 
          location.state?.from === 'signature-upload' || 
          location.state?.from === 'validation' ||
          location.state?.refresh === true;
        
        if (!isBeingRefreshedByOtherComponents && !isRefreshing) {
          console.log('Security refresh: Window focused with signing status, refreshing page');
          isRefreshing = true;
          
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }
      }
      
      lastVisibilityChange = now;
    };

    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [applicationStatus, location.state]);

  // Initial fetch of extended user data
  useEffect(() => {
    if (user?.id) {
      fetchExtendedUserData();
    }
  }, [user?.id]);

  const fetchExtendedUserData = async () => {
    if (user?.id) {
      try {
        const { data, error } = await supabase
          .from('user_data')
          .select('signature_token')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          setExtendedUser({
            ...user,
            signature_token: data.signature_token
          });
        } else {
          setExtendedUser(user as ExtendedUser);
        }
      } catch (err) {
        console.error('Error fetching extended user data:', err);
        setExtendedUser(user as ExtendedUser);
      }
    }
  };

  // Handler for signature document status changes
  const handleSignatureDocumentsStatusChange = (allDocumentsUploaded: boolean) => {
    setAllSignatureDocumentsUploaded(allDocumentsUploaded);
  };

  // Handler for application submission with warning dialog
  const handleSubmitApplicationWithWarning = () => {
    if (!allSignatureDocumentsUploaded) {
      setShowUploadWarningDialog(true);
    } else {
      handleSubmitApplication();
    }
  };

  // Handler for continuing with application submission despite missing documents
  const handleContinueWithSubmission = () => {
    setShowUploadWarningDialog(false);
    handleSubmitApplication();
  };

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

  const handleValidate = async () => {
    if (!isAuthenticated) {
      setShowRegistrationModal(true);
      return;
    }
    
    if (!user?.id) {
      console.error('PersonalSpace: No user ID available for validation');
      return;
    }
    
    try {
      // Get secure access token from backend
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'}/api/validation/verify-access`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to get validation access:', errorData);
        alert('Fehler beim Öffnen der Validierungsseite. Bitte versuchen Sie es erneut.');
        return;
      }
      
      const { access_token } = await response.json();
      
      // Open validation page with secure token in new tab
      const validationUrl = `/validation?token=${access_token}`;
      
      // Create a temporary link element and trigger it to avoid popup blockers
      // This method is treated as user-initiated navigation, not a popup
      // Unlike window.open(), this approach doesn't trigger popup blockers in Safari/Chrome
      const tempLink = document.createElement('a');
      tempLink.href = validationUrl;
      tempLink.target = '_blank';
      tempLink.rel = 'noopener noreferrer';
      tempLink.style.display = 'none';
      
      // Add to DOM, click, and remove
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);
      
      // Show info dialog about potential popup blocking
      setShowPopupInfoDialog(true);
      
    } catch (error) {
      console.error('Error getting validation access:', error);
      alert('Fehler beim Öffnen der Validierungsseite. Bitte versuchen Sie es erneut.');
    }
  };

  const handleSubmitApplication = async () => {
    if (!user?.id) {
      alert('Kein Benutzer gefunden. Bitte melden Sie sich erneut an.');
      return;
    }

    setIsSubmittingApplication(true);
    try {
      // Get city information for the submission
      let cityId = null;
      let cityName = '';
      
      // Try to get city info and foerder variante from user_data
      const { data: userData, error: userError } = await supabase
        .from('user_data')
        .select('signature_city_id')
        .eq('id', user.id)
        .single();

      if (!userError && userData?.signature_city_id) {
        cityId = userData.signature_city_id;
        cityName = 'Selected City'; // We'll get the actual name if needed
      } else {
        // Fallback: prompt user to select city
        const cityInput = prompt('Bitte geben Sie die Stadt-ID ein:');
        if (!cityInput) {
          alert('Stadt-Auswahl ist erforderlich.');
          return;
        }
        cityId = cityInput;
      }

      // Get object data for postcode
      const { data: objectData, error: objectError } = await supabase
        .from('object_data')
        .select('obj_postal_code, foerderVariante')
        .eq('user_id', user.id)
        .single();

      if (objectError) {
        console.warn('Object data not found, proceeding without foerder variante');
      }

      // Get city settings to check assignment rules
      const { data: cityData, error: cityError } = await supabase
        .from('cities')
        .select('settings')
        .eq('id', cityId)
        .single();

      if (cityError) {
        console.warn('City settings not found, proceeding without assignment rules');
      }

      let assignedAgent = null;
      if (cityData?.settings?.assignmentRules) {
        const { filterType, rules } = cityData.settings.assignmentRules;

        try {
          // Get user data for household size and employment type
          const { data: userDataForAssignment, error: userErrorForAssignment } = await supabase
            .from('user_data')
            .select('adult_count, child_count, employment')
            .eq('id', user.id)
            .single();

          // Only proceed with assignment if we have the required data
          if (!userErrorForAssignment && !objectError && userDataForAssignment && objectData) {
            // Determine assigned agent based on filter type
            switch (filterType) {
              case 'type':
                if (objectData?.foerderVariante && rules[objectData.foerderVariante]) {
                  assignedAgent = rules[objectData.foerderVariante];
                }
                break;
              case 'postcode':
                if (objectData.obj_postal_code && rules[objectData.obj_postal_code]) {
                  assignedAgent = rules[objectData.obj_postal_code];
                }
                break;
              case 'household':
                const adultCount = userDataForAssignment.adult_count || 0;
                const childCount = userDataForAssignment.child_count || 0;
                
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
                if (userDataForAssignment.employment && rules[userDataForAssignment.employment]) {
                  assignedAgent = rules[userDataForAssignment.employment];
                }
                break;
            }
          }
        } catch (assignmentError) {
          console.warn('Assignment logic failed, proceeding without assignment:', assignmentError);
        }
      }

      // Ensure user_financials table exists for the user
      try {
        await ensureUserFinancialsExists(user.id);
      } catch (financialsError) {
        console.warn('Failed to ensure user_financials exists, continuing with application submission:', financialsError);
      }

      // Insert into applications with 'submitted' status
      const { data, error: appError } = await supabase
        .from('applications')
        .insert({
          resident_id: user.id,
          city_id: cityId,
          type: objectData?.foerderVariante || '',
          status: 'new',
          assigned_agent: assignedAgent
        })
        .select();

      if (appError) {
        console.error('Application insert error:', appError);
        throw appError;
      }

      console.log('Successfully inserted application:', data);

      // Update user_data status to submitted
      const { error: updateError } = await supabase
        .from('user_data')
        .update({ 
          application_status: 'submitted'
        })
        .eq('id', user.id);

      if (updateError) {
        console.warn('Failed to update user_data status:', updateError);
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
          const formattedType = objectData?.foerderVariante || '';
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
              const tokenResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'}/api/system/token`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                }
              });
              if (!tokenResponse.ok) {
                throw new Error('Failed to get system token');
              }
              const { token } = await tokenResponse.json();

              const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'}/api/send-assignment-message`, {
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

      // Update local state
      setApplicationStatus('submitted');
      
    } catch (error: any) {
      console.error('Error submitting application:', error);
      alert('Fehler beim Einreichen des Antrags: ' + (error.message || 'Unbekannter Fehler'));
    } finally {
      setIsSubmittingApplication(false);
    }
  };

  // Function to reset application from signing state back to pending
  const handleResetApplication = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      
      // Get current signature documents to delete uploaded files
      const { data: userData, error: fetchError } = await supabase
        .from('user_data')
        .select('signature_documents')
        .eq('id', user.id)
        .single();
      
      if (fetchError) {
        console.error('Error fetching signature documents:', fetchError);
        return;
      }
      
      const signatureDocs = userData?.signature_documents || {};
      
      // Delete uploaded documents from storage
      const filesToDelete: string[] = [];
      Object.values(signatureDocs).forEach((doc: any) => {
        if (doc.uploaded && doc.file_path) {
          filesToDelete.push(doc.file_path);
        }
      });
      
      if (filesToDelete.length > 0) {
        console.log(`🗑️ Deleting ${filesToDelete.length} uploaded signature documents`);
        
        // Delete files from storage in batches
        const batchSize = 10;
        for (let i = 0; i < filesToDelete.length; i += batchSize) {
          const batch = filesToDelete.slice(i, i + batchSize);
          const { error: storageError } = await supabase.storage
            .from('documents')
            .remove(batch);
          
          if (storageError) {
            console.error('Error deleting files from storage:', storageError);
          }
        }
        
        // Try to remove empty folders (this is a best effort - Supabase may not support folder deletion)
        const uniqueFolders = new Set<string>();
        filesToDelete.forEach(filePath => {
          const folderPath = filePath.split('/').slice(0, -1).join('/');
          uniqueFolders.add(folderPath);
        });
        
        // Remove any remaining files in these folders
        for (const folder of Array.from(uniqueFolders)) {
          try {
            const { data: remainingFiles } = await supabase.storage
              .from('documents')
              .list(folder);
            
            if (remainingFiles && remainingFiles.length > 0) {
              const filePaths = remainingFiles.map(file => `${folder}/${file.name}`);
              await supabase.storage
                .from('documents')
                .remove(filePaths);
            }
          } catch (error) {
            console.warn('Could not clean up folder:', folder, error);
          }
        }
      }
      
      // Reset all signature-related columns in user_data table
      const { error: updateError } = await supabase
        .from('user_data')
        .update({
          application_status: 'pending',
          signature_city_id: null,
          signature_type: null,
          signature_status: null,
          signature_token: null,
          signature_documents: null,
          signature_created_at: null,
          signature_expires_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (updateError) {
        console.error('Error resetting signature columns:', updateError);
        return;
      }
      
      // Reset local state
      setApplicationStatus('pending');
      setShowResetConfirmationModal(false);
      
      // Show success message
      setMessage({
        type: 'success',
        text: 'Antrag erfolgreich zurückgesetzt. Sie können Ihre Daten nun erneut bearbeiten.'
      });
      
      console.log('✅ Successfully reset application from signing state to pending');
      
    } catch (error) {
      console.error('Error during application reset:', error);
      setMessage({
        type: 'error',
        text: 'Fehler beim Zurücksetzen des Antrags. Bitte versuchen Sie es erneut.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle take-back of submitted application
  const handleTakeBackApplication = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      
      // First, find and remove the most recent application from the applications table
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
      
      // Get current signature documents to delete uploaded files
      const { data: userData, error: userDataError } = await supabase
        .from('user_data')
        .select('signature_documents')
        .eq('id', user.id)
        .single();
      
      if (userDataError) {
        console.error('Error fetching signature documents:', userDataError);
        return;
      }
      
      const signatureDocs = userData?.signature_documents || {};
      
      // Delete uploaded documents from storage
      const filesToDelete: string[] = [];
      Object.values(signatureDocs).forEach((doc: any) => {
        if (doc.uploaded && doc.file_path) {
          filesToDelete.push(doc.file_path);
        }
      });
      
      if (filesToDelete.length > 0) {
        console.log(`🗑️ Deleting ${filesToDelete.length} uploaded signature documents`);
        
        // Delete files from storage in batches
        const batchSize = 10;
        for (let i = 0; i < filesToDelete.length; i += batchSize) {
          const batch = filesToDelete.slice(i, i + batchSize);
          const { error: storageError } = await supabase.storage
            .from('documents')
            .remove(batch);
          
          if (storageError) {
            console.error('Error deleting files from storage:', storageError);
          }
        }
        
        // Try to remove empty folders (this is a best effort - Supabase may not support folder deletion)
        const uniqueFolders = new Set<string>();
        filesToDelete.forEach(filePath => {
          const folderPath = filePath.split('/').slice(0, -1).join('/');
          uniqueFolders.add(folderPath);
        });
        
        // Remove any remaining files in these folders
        for (const folder of Array.from(uniqueFolders)) {
          try {
            const { data: remainingFiles } = await supabase.storage
              .from('documents')
              .list(folder);
            
            if (remainingFiles && remainingFiles.length > 0) {
              const filePaths = remainingFiles.map(file => `${folder}/${file.name}`);
              await supabase.storage
                .from('documents')
                .remove(filePaths);
            }
          } catch (error) {
            console.warn('Could not clean up folder:', folder, error);
          }
        }
      }
      
      // Reset application status and all signature-related columns in user_data table
      const { error: updateError } = await supabase
        .from('user_data')
        .update({
          application_status: 'pending',
          signature_city_id: null,
          signature_type: null,
          signature_status: null,
          signature_token: null,
          signature_documents: null,
          signature_created_at: null,
          signature_expires_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (updateError) {
        console.error('Error resetting signature columns:', updateError);
        return;
      }
      
      // Reset local state
      setApplicationStatus('pending');
      setShowTakeBackConfirmationModal(false);
      
      // Show success message
      setMessage({
        type: 'success',
        text: 'Einreichung erfolgreich rückgängig gemacht. Sie können Ihren Antrag nun erneut bearbeiten.'
      });
      
      console.log('✅ Successfully took back submitted application');
      
    } catch (error) {
      console.error('Error during application take-back:', error);
      setMessage({
        type: 'error',
        text: 'Fehler beim Rückgängig machen der Einreichung. Bitte versuchen Sie es erneut.'
      });
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
          
          .reset-modal {
            z-index: 100000 !important;
          }
          .reset-modal .modal-dialog {
            z-index: 100000 !important;
          }
        `}
      </style>

      

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

      {/* Application Submission Loading Overlay */}
      {isSubmittingApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
        style={{ 
          backdropFilter: 'blur(4px)',
          zIndex: 1060 // Higher than Bootstrap modal's default z-index of 1055
        }}>
          <div className="text-center" style={{ background: '#ffffff', borderRadius: '12px', padding: '3rem', boxShadow: '0 4px 24px rgba(0,0,0,0.12)', border: '1px solid #e0e0e0', maxWidth: '500px' }}>
            <div className="mb-4">
             <Spinner animation="border" role="status" style={{ width: '3rem', height: '3rem', color: '#064497' }}>
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            </div>
            <h3 className="mb-3" style={{ color: '#064497', fontWeight: '500', fontSize: '1.5rem' }}>
              Antrag wird eingereicht...
            </h3>
            <p className="mb-0" style={{ color: '#757575', fontSize: '1rem', lineHeight: '1.5' }}>
              Bitte warten Sie, während Ihr Antrag verarbeitet wird. Dies kann einige Momente dauern.
            </p>
          </div>
        </div>
      )}

      {/* Signing Status Overlay */}
      {applicationStatus === 'signing' && !showResetConfirmationModal && !showUploadWarningDialog && !isSubmittingApplication && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(255,255,255,0.9)',
          zIndex: 99999,
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div className="h-100 d-flex flex-column" style={{ background: '#ffffff', borderRadius: '8px', padding: '2.5rem', boxShadow: '0 2px 16px rgba(0,0,0,0.08)', border: '1px solid #e0e0e0' }}>
            <div className="mb-5">
              <h2 className="mb-3" style={{ color: '#064497', fontWeight: '500', fontSize: '1.75rem', letterSpacing: '-0.01em' }}>Unterschriften erforderlich</h2>
              <p className="mb-0" style={{ color: '#757575', fontSize: '1rem', lineHeight: '1.5', maxWidth: '85%' }}>
                Ihre Antragsformulare wurden per E-Mail gesendet. Bitte drucken Sie alle PDFs aus, sammeln Sie die erforderlichen Unterschriften und laden Sie die unterschriebenen Dokumente hoch.
              </p>
            </div>
            
            <div className="flex-grow-1 d-flex gap-5">
              {/* Left Column - Signature Documents Status */}
              <div className="flex-fill">
                <SignatureDocumentsStatus user={extendedUser || user} onStatusChange={handleSignatureDocumentsStatusChange} />
              </div>
              
              {/* Right Column - Action Buttons */}
              <div className="flex-fill d-flex flex-column justify-content-center" style={{ maxWidth: '400px' }}>
                <div className="d-flex flex-column gap-1">
                  <Button 
                    className="mb-3 w-100"
                    style={{ 
                      background: allSignatureDocumentsUploaded ? '#D7DAEA' : '#064497', 
                      border: 'none',
                      borderRadius: '6px',
                      padding: '16px 24px',
                      fontSize: '1rem',
                      fontWeight: '500',
                      letterSpacing: '0.02em',
                      color: allSignatureDocumentsUploaded ? '#000000' : '#ffffff',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                    }}
                    onClick={() => {
                      if (extendedUser?.signature_token) {
                        window.open(`/signature-upload/${extendedUser.signature_token}`, '_blank');
                      }
                    }}
                  >
                    Unterschriebene Dokumente hochladen
                  </Button>
                  
                  <Button 
                    className="mb-4 w-100"
                    style={{ 
                      background: allSignatureDocumentsUploaded ? '#064497' : '#D7DAEA', 
                      border: 'none',
                      borderRadius: '6px',
                      padding: '16px 24px',
                      fontSize: '1rem',
                      fontWeight: '500',
                      letterSpacing: '0.02em',
                      color: allSignatureDocumentsUploaded ? '#ffffff' : '#000000',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                    }} 
                    onClick={handleSubmitApplicationWithWarning}
                  >
                    Antrag einreichen
                  </Button>

                  <div className="mt-1 pt-4" style={{ borderTop: '1px solid #e0e0e0' }}>
                    <Button 
                      className="mb-3 w-100"
                      variant="outline-primary"
                      style={{ 
                        borderRadius: '6px',
                        padding: '14px 20px',
                        fontSize: '0.95rem',
                        fontWeight: '400',
                        borderColor: '#9e9e9e',
                        color: '#064497',
                        backgroundColor: '#fff',
                        transition: 'all 0.15s ease',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                      }}
                      onClick={async () => {
                        try {
                          setIsLoading(true);
                          // Get the current session token from Supabase
                          const { data: { session } } = await supabase.auth.getSession();
                          if (!session?.access_token) {
                            throw new Error('Keine gültige Sitzung gefunden. Bitte melden Sie sich erneut an.');
                            setIsLoading(false);
                          }

                          // Call the backend endpoint to generate and download all forms
                          const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'}/pdf/generate-all-forms-selbsthilfe`, {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${session.access_token}`,
                            },
                          });

                          if (!response.ok) {
                            const errorData = await response.json().catch(() => ({}));
                            throw new Error(errorData.detail || 'Fehler beim Generieren der Dokumente.');
                            setIsLoading(false);
                          }

                          // Get the ZIP file as a blob
                          const blob = await response.blob();
                          
                          // Create a download link and trigger download
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `alle_dokumente_${user?.id || 'user'}.zip`;
                          document.body.appendChild(a);
                          a.click();
                          
                          // Clean up
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                          
                          console.log('Documents downloaded successfully');
                        } catch (error) {
                          console.error('Error downloading documents:', error);
                          setIsLoading(false);
                          // You might want to show a toast or error message here
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                    >
                      Dokumente erneut herunterladen
                    </Button>
                    
                    <Button 
                      className="mb-3 w-100"
                      variant="outline-secondary"
                      style={{ 
                        borderRadius: '6px',
                        padding: '14px 20px',
                        fontSize: '0.95rem',
                        fontWeight: '400',
                        borderColor: '#9e9e9e',
                        color: '#064497',
                        backgroundColor: '#fff',
                        transition: 'all 0.15s ease',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                      }}
                      onClick={() => setShowResetConfirmationModal(true)}
                    >
                      Antrag weiterbearbeiten
                    </Button>
                    
                    <Button 
                      className="w-100"
                      variant="outline-secondary"
                      style={{ 
                        borderRadius: '6px',
                        padding: '14px 20px',
                        fontSize: '0.95rem',
                        fontWeight: '400',
                        borderColor: '#9e9e9e',
                        color: '#064497',
                        backgroundColor: '#fff',
                        transition: 'all 0.15s ease',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                      }}
                      onClick={() => logout()}
                    >
                      Abmelden
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Other Status Overlays */}
      {applicationStatus !== 'pending' && applicationStatus !== 'signing' && !showTakeBackConfirmationModal && (
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
              
              {/* Take-back button - only for submitted status */}
              {applicationStatus === 'submitted' && (
                <Button 
                  style={{ background: '#D7DAEA', color: '#000000', border: 'none' }} 
                  onClick={() => setShowTakeBackConfirmationModal(true)}
                >
                  Einreichung Rückgängig machen
                </Button>
              )}
              
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


      {/* Reset Application Confirmation Modal */}
      {/* Debug: Modal state is {showResetConfirmationModal ? 'true' : 'false'} */}
      <Modal show={showResetConfirmationModal} onHide={() => setShowResetConfirmationModal(true)} centered dialogClassName="reset-modal">
        <Modal.Header>
          <Modal.Title>Antrag weiterbearbeiten</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="alert alert-warning">
            <strong>Achtung!</strong> Wenn Sie den Antrag weiter bearbeiten möchten, werden alle hochgeladenen unterschriebenen Dokumente gelöscht und die PDFs müssen neu generiert werden. Ihre restlichen Angaben bleiben erhalten.
          </div>
          <p>Möchten Sie wirklich fortfahren? Diese Aktion kann nicht rückgängig gemacht werden.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowResetConfirmationModal(false)}
          >
            Abbrechen
          </Button>
          <Button 
            variant="danger" 
            onClick={handleResetApplication}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Zurücksetzen...
              </>
            ) : (
              'Antrag zurücksetzen'
            )}
          </Button> 
        </Modal.Footer>
      </Modal>

      {/* Take-Back Application Confirmation Modal */}
      <Modal show={showTakeBackConfirmationModal} onHide={() => setShowTakeBackConfirmationModal(false)} centered dialogClassName="reset-modal">
        <Modal.Header>
          <Modal.Title>Einreichung Rückgängig machen</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="alert alert-warning">
            <strong>Achtung!</strong> Wenn Sie die Einreichung zurücknehmen, werden alle hochgeladenen, unterschriebenen Dokumente gelöscht. Der Antrag wird aus der Prüfung entfernt, und die PDFs müssen neu generiert werden. Ihre übrigen Angaben bleiben erhalten. Sollten Sie Änderungen an Ihren Angaben vorgenommen haben, müssen die entsprechenden Formulare erneut unterschrieben werden.
          </div>
          <p>Möchten Sie wirklich fortfahren? Diese Aktion kann nicht rückgängig gemacht werden.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowTakeBackConfirmationModal(false)}
          >
            Abbrechen
          </Button>
          <Button 
            variant="danger" 
            onClick={handleTakeBackApplication}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Rückgängig machen...
              </>
            ) : (
              'Einreichung Rückgängig machen'
            )}
          </Button> 
        </Modal.Footer>
      </Modal>

      {/* Upload Warning Dialog */}
      <Modal show={showUploadWarningDialog} onHide={() => setShowUploadWarningDialog(false)} centered>
        <Modal.Header>
          <Modal.Title>Warnung: Unvollständige Unterschriften</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Sie haben noch nicht alle Unterschrieben Dokumente hochgeladen. Dies kann dazu führen, dass Ihr Antrag nicht bewilligt wird. Möchten Sie trotzdem fortfahren?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleContinueWithSubmission}>
            Fortfahren
          </Button>
          <Button 
            style={{ background: '#064497', color: '#ffffff', border: 'none' }} 
            onClick={() => setShowUploadWarningDialog(false)}>
            Abbrechen
          </Button>
        </Modal.Footer>
      </Modal>



    {/* Loading Overlay */}
    {isLoading && (
            <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" 
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                  zIndex: 99999 
                }}>
              <div className="text-center">
                <Spinner animation="border" role="status" style={{ width: '3rem', height: '3rem', color: '#064497' }}>
                  <span className="visually-hidden">Loading...</span>
                </Spinner>
                <div className="mt-3" style={{ color: '#064497' }}>Bitte warten...</div>
              </div>
            </div>
          )}

      {/* Popup Info Dialog */}
      <PopupInfoDialog
        show={showPopupInfoDialog}
        onHide={() => setShowPopupInfoDialog(false)}
      />

    </div>
  );
};

export default PersonalSpace;