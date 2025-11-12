import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Alert, Button, ProgressBar, Spinner, Form, Modal } from 'react-bootstrap';
import { supabase, ensureUserFinancialsExists } from '../lib/supabase';
import { sendMessage, sendNewApplicationNotification } from '../utils/messages';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

interface PDFInfo {
  id: string;
  title: string;
  description: string;
  requires_signatures: boolean;
  signature_count: number;
  is_selbsthilfe: boolean;
  helpers: any[];
  uploaded?: boolean;
  filename?: string;
  uploaded_at?: string;
}

interface SignatureUploadData {
  token: string;
  user_id: string;
  user_email: string;
  user_name: string;
  pdfs_info: PDFInfo[];
  created_at: string;
  expires_at: string;
  status: string;
}

const SignatureUploadPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [uploadData, setUploadData] = useState<SignatureUploadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [uploadedDocs, setUploadedDocs] = useState<{ [key: string]: { filename: string; uploaded_at: string } }>({});
  const [success, setSuccess] = useState(false);
  const [showUploadWarningDialog, setShowUploadWarningDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [statusCheckLoading, setStatusCheckLoading] = useState(false);

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();
  }, []);

  // Check application status (only if user is authenticated)
  const checkApplicationStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_data')
        .select('application_status')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error checking application status:', error);
        return null;
      }

      return data?.application_status || null;
    } catch (err) {
      console.error('Error checking application status:', err);
      return null;
    }
  };

  // Load signature upload data
  useEffect(() => {
    const loadSignatureUploadData = async () => {
      if (!token) {
        setError('Ungültiger Token.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${BACKEND_URL}/pdf/signature-upload/${token}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Unterschriften-Upload nicht gefunden oder bereits abgeschlossen.');
          } else if (response.status === 410) {
            setError('Der Upload-Link ist abgelaufen.');
          } else {
            setError('Fehler beim Laden der Upload-Informationen.');
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        setUploadData(data);
        
        // Check application status if user is authenticated
        if (isAuthenticated && data.user_id) {
          setStatusCheckLoading(true);
          const status = await checkApplicationStatus(data.user_id);
          setApplicationStatus(status);
          setStatusCheckLoading(false);
          
          // If status is not 'signing' and not null, show warning but don't block
          if (status !== null && status !== 'signing') {
            console.warn(`Application status is '${status}', not 'signing'. Some operations may be limited.`);
          }
        }
        
        // Load existing uploaded documents from the signature_documents data
        if (data.pdfs_info) {
          const existingUploads: { [key: string]: { filename: string; uploaded_at: string } } = {};
          data.pdfs_info.forEach((pdf: PDFInfo) => {
            if (pdf.uploaded) {
              // Extract filename from the document info if available
              existingUploads[pdf.id] = {
                filename: pdf.filename || `${pdf.title}.pdf`,
                uploaded_at: pdf.uploaded_at || new Date().toISOString()
              };
            }
          });
          setUploadedDocs(existingUploads);
        }
      } catch (err) {
        setError('Fehler beim Laden der Upload-Informationen.');
      } finally {
        setLoading(false);
      }
    };

    loadSignatureUploadData();
  }, [token, isAuthenticated]);

  // Periodic status check for authenticated users
  useEffect(() => {
    if (!isAuthenticated || !uploadData?.user_id || !applicationStatus) return;

    const interval = setInterval(async () => {
      const currentStatus = await checkApplicationStatus(uploadData.user_id);
      if (currentStatus !== applicationStatus) {
        setApplicationStatus(currentStatus);
        if (currentStatus !== null && currentStatus !== 'signing') {
          console.warn(`Application status changed to '${currentStatus}'. Some operations may be limited.`);
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated, uploadData?.user_id, applicationStatus]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>, pdfId: string) => {
    // Check application status for authenticated users only if status is available
    if (isAuthenticated && applicationStatus !== null && applicationStatus !== 'signing') {
      setError('Dokumente können nur hochgeladen werden, wenn der Antragsstatus "Unterschriften erforderlich" ist.');
      return;
    }
    
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`Die Datei ist zu groß. Maximale Größe: 50MB. Ihre Datei: ${(file.size / 1024 / 1024).toFixed(1)}MB`);
      return;
    }

    // Clear any previous errors
    setError(null);

    // Auto-upload the file immediately
    await handleUpload(pdfId, file);
  };

  const handleUpload = async (pdfId: string, file?: File) => {
    let fileToUpload = file;
    
    if (!fileToUpload) {
      const fileInput = document.getElementById(`file-${pdfId}`) as HTMLInputElement;
      fileToUpload = fileInput?.files?.[0];
    }
    
    if (!fileToUpload || !token) return;

    setUploading(prev => ({ ...prev, [pdfId]: true }));
    setUploadProgress(prev => ({ ...prev, [pdfId]: 0 }));
    setError(null);

    try {
      // Progress simulation
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => ({
          ...prev,
          [pdfId]: Math.min(prev[pdfId] + Math.random() * 20, 90)
        }));
      }, 200);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('token', token);
      formData.append('pdf_id', pdfId);

      // Upload file through backend
      const response = await fetch(`${BACKEND_URL}/pdf/upload-signed-document`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Fehler beim Hochladen des unterschriebenen Dokuments.');
      }

      const result = await response.json();
      setUploadProgress(prev => ({ ...prev, [pdfId]: 100 }));

      // Brief delay to show 100% completion
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update uploaded docs with success status
      // At this point, fileToUpload is guaranteed to be defined since we checked it above
      setUploadedDocs(prev => ({
        ...prev,
        [pdfId]: { 
          filename: fileToUpload!.name, 
          uploaded_at: new Date().toISOString()
        }
      }));

      // Check if all documents are uploaded
      if (result.all_documents_uploaded) {
        
      }

    } catch (err: any) {
      setError(err.message || 'Fehler beim Hochladen des unterschriebenen Dokuments.');
    } finally {
      setUploading(prev => ({ ...prev, [pdfId]: false }));
      setUploadProgress(prev => ({ ...prev, [pdfId]: 0 }));
    }
  };

  const handleRemoveDocument = async (pdfId: string) => {
    // Check application status for authenticated users only if status is available
    if (isAuthenticated && applicationStatus !== null && applicationStatus !== 'signing') {
      setError('Dokumente können nur bearbeitet werden, wenn der Antragsstatus "Unterschriften erforderlich" ist.');
      return;
    }
    
    if (!token) return;

    try {
      if (isAuthenticated) {
        // Use frontend logic for authenticated users
        if (!uploadData?.user_id) return;

        // Get the current signature documents from user_data
        const { data: userData, error: fetchError } = await supabase
          .from('user_data')
          .select('signature_documents')
          .eq('id', uploadData.user_id)
          .single();
        
        if (fetchError) {
          console.error('Error fetching signature documents:', fetchError);
          return;
        }
        
        const signatureDocs = userData?.signature_documents || {};
        const documentToRemove = signatureDocs[pdfId];
        
        if (documentToRemove && documentToRemove.uploaded && documentToRemove.file_path) {
          // Delete the file from storage
          console.log(`🗑️ Deleting file from storage: ${documentToRemove.file_path}`);
          
          const { error: storageError } = await supabase.storage
            .from('documents')
            .remove([documentToRemove.file_path]);
          
          if (storageError) {
            console.error('Error deleting file from storage:', storageError);
          } else {
            console.log('✅ Successfully deleted file from storage');
          }
          
          // Try to clean up empty folders (best effort)
          try {
            const folderPath = documentToRemove.file_path.split('/').slice(0, -1).join('/');
            const { data: remainingFiles } = await supabase.storage
              .from('documents')
              .list(folderPath);
            
            if (remainingFiles && remainingFiles.length === 0) {
              // Folder is empty, try to remove it
              try {
                await supabase.storage
                  .from('documents')
                  .remove([`${folderPath}/`]);
              } catch (folderError) {
                console.warn('Could not remove empty folder:', folderError);
              }
            }
          } catch (folderError) {
            console.warn('Could not check folder contents:', folderError);
          }
        }
        
        // Update the signature_documents JSON to remove the uploaded file data
        const updatedSignatureDocs = { ...signatureDocs };
        if (updatedSignatureDocs[pdfId]) {
          // Reset the document to not uploaded state
          updatedSignatureDocs[pdfId] = {
            ...updatedSignatureDocs[pdfId],
            uploaded: false,
            filename: undefined,
            file_path: undefined,
            file_size: undefined,
            uploaded_at: undefined
          };
        }
        
        // Update the user_data table
        const { error: updateError } = await supabase
          .from('user_data')
          .update({
            signature_documents: updatedSignatureDocs,
            updated_at: new Date().toISOString()
          })
          .eq('id', uploadData.user_id);
        
        if (updateError) {
          console.error('Error updating signature documents:', updateError);
          return;
        }
      } else {
        // Use backend endpoint for unauthenticated users
        const formData = new FormData();
        formData.append('token', token!);
        formData.append('pdf_id', pdfId);

        const response = await fetch(`${BACKEND_URL}/remove-signed-document`, {
          method: 'DELETE',
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.detail || 'Fehler beim Entfernen des Dokuments.');
        }
      }
      
      // Remove the uploaded document from local state
      setUploadedDocs(prev => {
        const newDocs = { ...prev };
        delete newDocs[pdfId];
        return newDocs;
      });

      // Reset the file input
      const fileInput = document.getElementById(`file-${pdfId}`) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      
      console.log('✅ Successfully removed document:', pdfId);
      
    } catch (error: any) {
      console.error('Error removing document:', error);
      setError(error.message || 'Fehler beim Entfernen des Dokuments. Bitte versuchen Sie es erneut.');
    }
  };

  const handleSubmitApplication = async () => {
    // Check application status for authenticated users only if status is available
    if (isAuthenticated && applicationStatus !== null && applicationStatus !== 'signing') {
      setError('Antrag kann nur eingereicht werden, wenn der Status "Unterschriften erforderlich" ist.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (isAuthenticated) {
        // Use frontend logic for authenticated users
        // Get user ID from upload data
        if (!uploadData?.user_id) {
          throw new Error('Benutzer-ID nicht gefunden.');
        }

        // Get city information for the submission
        let cityId = null;
        let cityName = '';
        
        // Try to get city info and foerder variante from user_data
        const { data: userData, error: userError } = await supabase
          .from('user_data')
          .select('signature_city_id')
          .eq('id', uploadData.user_id)
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
          .eq('user_id', uploadData.user_id)
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
              .eq('id', uploadData.user_id)
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
          await ensureUserFinancialsExists(uploadData.user_id);
        } catch (financialsError) {
          console.warn('Failed to ensure user_financials exists, continuing with application submission:', financialsError);
        }

        // Insert into applications with 'submitted' status
        const { data, error: appError } = await supabase
          .from('applications')
          .insert({
            resident_id: uploadData.user_id,
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

        // Create registry entry for the new application
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            const registryResponse = await fetch(`${BACKEND_URL}/api/registry/create-entry`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({
                application_id: data[0].id
              })
            });
            
            if (!registryResponse.ok) {
              console.warn('Failed to create registry entry:', await registryResponse.text());
            } else {
              console.log('Successfully created registry entry');
            }
          }
        } catch (registryError) {
          console.warn('Error creating registry entry:', registryError);
          // Don't fail the submission if registry creation fails
        }

        // Update user_data status to submitted
        const { error: updateError } = await supabase
          .from('user_data')
          .update({ 
            application_status: 'submitted'
          })
          .eq('id', uploadData.user_id);

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
                const tokenResponse = await fetch(`${BACKEND_URL}/api/system/token`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  }
                });
                if (!tokenResponse.ok) {
                  throw new Error('Failed to get system tokenn');
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

        // Show success message
        setSuccess(true);
        
        // Only redirect to personal space if user is authenticated
        if (isAuthenticated) {
          setTimeout(() => {
            navigate('/personal-space', { state: { from: 'signature-upload', refresh: true } });
          }, 2000);
        }
      } else {
        // Use backend endpoint for unauthenticated users
        const formData = new FormData();
        formData.append('token', token!);

        const response = await fetch(`${BACKEND_URL}/submit-application-with-token`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.detail || 'Fehler beim Einreichen des Antrags.');
        }

        const result = await response.json();
        console.log('Successfully submitted application via backend:', result);

        // Show success message
        setSuccess(true);
      }
      
    } catch (error: any) {
      setError('Fehler beim Einreichen des Antrags: ' + (error.message || 'Unbekannter Fehler'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitApplicationWithWarning = () => {
    // Check application status for authenticated users only if status is available
    if (isAuthenticated && applicationStatus !== null && applicationStatus !== 'signing') {
      setError('Antrag kann nur eingereicht werden, wenn der Status "Unterschriften erforderlich" ist.');
      return;
    }
    
    if (allDocumentsUploaded()) {
      handleSubmitApplication();
    } else {
      setShowUploadWarningDialog(true);
    }
  };

  const handleContinueWithSubmission = () => {
    // Check application status for authenticated users only if status is available
    if (isAuthenticated && applicationStatus !== null && applicationStatus !== 'signing') {
      setError('Antrag kann nur eingereicht werden, wenn der Status "Unterschriften erforderlich" ist.');
      setShowUploadWarningDialog(false);
      return;
    }
    
    handleSubmitApplication();
    setShowUploadWarningDialog(false);
  };

  const allDocumentsUploaded = () => {
    return uploadData?.pdfs_info.length === Object.keys(uploadedDocs).length;
  };

  // Date formatting function
  function formatDate(dateString: string) {
    if (!dateString) return "-";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "-";
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  }

  if (loading || statusCheckLoading) {
    return (
      <div className="relative bg-gray-50 min-h-screen">
        <Container className="py-5">
          <div className="text-center">
            <Spinner animation="border" style={{ color: '#064497' }} />
            <p className="mt-3">
              {loading ? 'Lade Upload-Informationen...' : 'Überprüfe Antragsstatus...'}
            </p>
          </div>
        </Container>
      </div>
    );
  }

  if (error && !uploadData) {
    return (
      <div className="relative bg-gray-50 min-h-screen">
        <Container className="py-5">
          <Card className="mx-auto border-0 shadow-lg" style={{ maxWidth: '600px' }}>
            <Card.Body className="text-center">
              <div className="mb-3">
                <i className="bi bi-exclamation-triangle-fill text-danger" style={{ fontSize: '3rem' }}></i>
              </div>
              <h4 className="text-danger mb-3">Fehler</h4>
              <p>{error}</p>
              <div className="mt-4">
                {isAuthenticated && (
                  <Button
                    onClick={() => navigate('/personal-space')}
                    style={{ 
                      backgroundColor: '#064497', 
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px 24px'
                    }}
                  >
                    <i className="bi bi-person-circle me-2"></i>
                    Zum persönlichen Bereich
                  </Button>
                )}
              </div>
            </Card.Body>
          </Card>
        </Container>
      </div>
    );
  }

  // Success state - show success UI instead of auto-redirect for unauthenticated users
  if (success) {
    return (
      <div className="relative bg-gray-50 min-h-screen">
        <Container className="py-5">
          <Card className="mx-auto border-0 shadow-lg" style={{ maxWidth: '600px' }}>
            <Card.Body className="text-center">
              <div className="mb-3">
                <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '3rem' }}></i>
              </div>
              <h4 className="text-success mb-3">Antrag erfolgreich eingereicht!</h4>
              <p>Alle ihre Angaben, hochgeladenen Dokumente und Formulare wurden erfolgreich an ihre Bewilligungsbehörde weitergeleitet. Sie können den Status Ihres Antrags im persönlichen Bereich nachverfolgen. Sie können diesen Tab nun schließen.</p>
              <p className="text-muted small mt-3">Vielen Dank, dass Sie Fördercheck.NRW verwenden.</p>
              {isAuthenticated && (
                <div className="mt-4">
                  <Button
                    onClick={() => navigate('/personal-space', { state: { from: 'signature-upload', refresh: true } })}
                    style={{ 
                      backgroundColor: '#064497', 
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px 24px'
                    }}
                  >
                    <i className="bi bi-person-circle me-2"></i>
                    Zum persönlichen Bereich
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Container>
      </div>
    );
  }

  if (!uploadData) return null;

  const expiresAt = new Date(uploadData.expires_at);
  const isExpired = new Date() > expiresAt;

  if (isExpired) {
    return (
      <div className="relative bg-gray-50 min-h-screen">
        <Container className="py-5">
          <Card className="mx-auto border-0 shadow-lg" style={{ maxWidth: '600px' }}>
            <Card.Body className="text-center">
              <div className="mb-3">
                <i className="bi bi-clock-fill text-warning" style={{ fontSize: '3rem' }}></i>
              </div>
              <h4 className="text-warning mb-3">Upload-Link abgelaufen</h4>
              <p>Dieser Upload-Link ist am {formatDate(expiresAt.toISOString())} abgelaufen.</p>
              <p>Bitte wenden Sie sich an Ihren Sachbearbeiter für einen neuen Link.</p>
            </Card.Body>
          </Card>
        </Container>
      </div>
    );
  }

  return (
    <div className="relative bg-gray-50 min-h-screen">
      <style>
        {`
          /* Blue corner design */
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
          
          /* Custom file input styling */
          .custom-file-input {
            position: relative;
            display: inline-block;
            cursor: pointer;
            width: 100%;
          }
          
          .custom-file-input input[type="file"] {
            position: absolute;
            opacity: 0;
            width: 100%;
            height: 100%;
            cursor: pointer;
          }
          
          .custom-file-label {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 12px 24px;
            background: #fff;
            border: 2px dashed #064497;
            border-radius: 8px;
            color: #064497;
            font-weight: 500;
            transition: all 0.3s ease;
            min-height: 60px;
          }
          
          .custom-file-label:hover {
            background: #f8f9fa;
            border-color: #0a5cb8;
          }
          
          .custom-file-label i {
            margin-right: 8px;
            font-size: 1.2rem;
          }
          
          /* Progress bar styling */
          .progress-bar {
            background-color: #064497 !important;
          }
          
          .progress {
            background-color: #e9ecef;
            border-radius: 0.5rem;
            height: 10px;
          }
          
          /* File display styling */
          .file-display {
            display: flex;
            align-items: center;
            padding: 16px;
            background: #f5f5f5;
            border-radius: 12px;
            border: 1px solid #e0e0e0;
          }
          
          /* Responsive design */
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
      
      
      <Container className="py-5">
        {/* Header with Personal Space Button - only show if authenticated */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center">
            <div className="ml-2">
              <h1 style={{ color: '#064497', fontWeight: '500', fontSize: '2rem', margin: 0 }}>
                Unterschriften hochladen
              </h1>
              <p style={{ color: '#757575', margin: '8px 0 0 0' }}>
                Für: {uploadData.user_name || 'Antragsteller/in'}
              </p>
            </div>
          </div>
          {isAuthenticated && (
            <Button
              onClick={() => navigate('/personal-space', { state: { from: 'signature-upload', refresh: true } })}
              style={{ 
                backgroundColor: '#1e3a8a', 
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px'
              }}
            >
              <i className="bi bi-person-circle me-2"></i>
              Persönlicher Bereich
            </Button>
          )}
        </div>

        <Card className="border-0 shadow-lg" style={{ backgroundColor: '#ffffff' }}>
          <Card.Body className="p-5">
            {/* Header Info */}
            <div className="mb-4 p-4" style={{ backgroundColor: '#f8f9fa', borderRadius: '12px', border: '1px solid #e9ecef' }}>
              <div className="row">
                <div className="col-md-6">
                  <p className="mb-1"><strong>E-Mail:</strong> {uploadData.user_email}</p>
                </div>
                <div className="col-md-6">
                  <p className="mb-0"><strong>Gültig bis:</strong> {formatDate(uploadData.expires_at)}</p>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <Alert variant="info" className="border-0" style={{ backgroundColor: '#e7f3ff', borderRadius: '12px' }}>
              <div className="d-flex align-items-start">
                <div>
                  Laden Sie für jedes der folgenden Dokumente die unterschriebene Version hoch. 
                  Vergewissen Sie sich, dass alle Unterschriften vorhanden sind, bevor Sie Ihren Antrag einreichen. Sie können die generierten PDFs im persönlichen Bereich erneut herunterladen.
                </div>
              </div>
            </Alert>

            {/* Status Warning Banner for authenticated users */}
            {isAuthenticated && applicationStatus !== null && applicationStatus !== 'signing' && (
              <Alert variant="warning" className="border-0" style={{ backgroundColor: '#fef3c7', borderRadius: '12px' }}>
                <div className="d-flex align-items-start">
                  <i className="bi bi-exclamation-triangle-fill text-warning me-3" style={{ fontSize: '1.2rem', marginTop: '2px' }}></i>
                  <div>
                    <strong>Achtung:</strong> Diese Seite ist nur verfügbar, wenn Ihr Antrag den Status "Unterschriften erforderlich" hat. 
                    Alle Funktionen sind deaktiviert.
                  </div>
                </div>
              </Alert>
            )}

            {/* Error Display */}
            {error && (
              <Alert variant="danger" className="border-0" style={{ backgroundColor: '#fef2f2', borderRadius: '12px' }}>
                <div className="d-flex align-items-start">
                  <i className="bi bi-exclamation-triangle-fill text-danger me-3" style={{ fontSize: '1.2rem', marginTop: '2px' }}></i>
                  <div>{error}</div>
                </div>
              </Alert>
            )}

            {/* PDF Upload Forms */}
            <div className="space-y-4">
              {uploadData.pdfs_info.map((pdf, index) => (
                <div key={pdf.id} className="mb-4 p-4 border rounded" style={{ backgroundColor: '#f8f9fa' }}>
                  <div className="row align-items-center">
                    <div className="col-md-8">
                      <h6 className="mb-2">{pdf.title}</h6>
                      <p className="text-muted small mb-2">{pdf.description}</p>
                      
                      {/* Signature requirements */}
                      <div className="d-flex align-items-center mb-2">
                        <i className="bi bi-pen-fill text-[#064497] me-2"></i>
                        <span className="text-[#064497] small">
                          {pdf.signature_count} Unterschrift{pdf.signature_count > 1 ? 'en' : ''} erforderlich
                        </span>
                      </div>
                    </div>
                    
                    <div className="col-md-4">
                      {/* File Selection - only show if no document is uploaded */}
                      {!uploadedDocs[pdf.id] && (
                        <div className="mb-3">
                          <div className="custom-file-input">
                            <input
                              id={`file-${pdf.id}`}
                              type="file"
                              onChange={(e) => handleFileSelect(e, pdf.id)}
                              disabled={uploading[pdf.id] || (isAuthenticated && applicationStatus !== null && applicationStatus !== 'signing')}
                              accept=".pdf,.jpg,.jpeg,.png,.HEIC"
                            />
                            <div className="custom-file-label">
                              <i className="bi bi-cloud-upload"></i>
                              <span>Datei auswählen</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Upload Progress */}
                      {uploading[pdf.id] && (
                        <div className="mt-3">
                          <div className="d-flex justify-content-between mb-2">
                            <span className="small">Upload-Fortschritt</span>
                            <span className="small" style={{ color: '#064497' }}>
                              {Math.round(uploadProgress[pdf.id] || 0)}%
                            </span>
                          </div>
                          <ProgressBar 
                            now={uploadProgress[pdf.id] || 0} 
                            className="progress" 
                            style={{ height: '8px' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Selected File Info */}
                  {uploadedDocs[pdf.id] && (
                    <div className="mt-3 file-display">
                      <div className="d-flex align-items-center w-100">
                        <i className="bi bi-file-earmark text-success me-3" style={{ fontSize: '1.5rem' }}></i>
                        <div className="flex-grow-1">
                          <div className="fw-semibold">{uploadedDocs[pdf.id].filename}</div>
                          <div className="text-muted small">
                            Hochgeladen am {formatDate(uploadedDocs[pdf.id].uploaded_at)}
                          </div>
                        </div>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleRemoveDocument(pdf.id)}
                          disabled={isAuthenticated && applicationStatus !== null && applicationStatus !== 'signing'}
                          style={{ 
                            borderRadius: '6px',
                            opacity: (isAuthenticated && applicationStatus !== null && applicationStatus !== 'signing') ? 0.6 : 1
                          }}
                        >
                          <i className="bi bi-trash"></i>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-4 p-4" style={{ backgroundColor: '#f8f9fa', borderRadius: '12px' }}>
              <div className="row text-center">
                <div className="col-md-4">
                  <div className="h4 mb-1" style={{ 
                    color: '#ffffff', 
                    fontWeight: '500',
                    backgroundColor: '#1e3a8a',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    display: 'inline-block'
                  }}>{uploadData.pdfs_info.length}</div>
                  <div className="small text-muted">Dokumente insgesamt</div>
                </div>
                <div className="col-md-4">
                  <div className="h4 mb-1" style={{ 
                    color: '#064497', 
                    fontWeight: '500',
                    backgroundColor: '#ffffff',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    display: 'inline-block',
                  }}>{Object.keys(uploadedDocs).length}</div>
                  <div className="small text-muted">Hochgeladen</div>
                </div>
                <div className="col-md-4">
                  <div className="h4 mb-1" style={{ 
                    color: '#000000', 
                    fontWeight: '500',
                    backgroundColor: '#ffffff',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    display: 'inline-block',
                  }}>{uploadData.pdfs_info.length - Object.keys(uploadedDocs).length}</div>
                  <div className="small text-muted">Ausstehend</div>
                </div>
              </div>
            </div>

            {/* Submit Application Button */}
            <div className="mt-4 text-center">
              <Button
                onClick={handleSubmitApplicationWithWarning}
                className="px-5 py-3"
                disabled={isSubmitting || success || (isAuthenticated && applicationStatus !== null && applicationStatus !== 'signing')}
                style={{ 
                  backgroundColor: allDocumentsUploaded() ? '#064497' : '#D7DAEA', 
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1.1rem',
                  color: allDocumentsUploaded() ? '#ffffff' : '#000000',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  opacity: (isSubmitting || success || (isAuthenticated && applicationStatus !== null && applicationStatus !== 'signing')) ? 0.6 : 1
                }}
              >
                {isSubmitting ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Wird eingereicht...
                  </>
                ) : success ? (
                  <>
                    <i className="bi bi-check-circle me-2"></i>
                    Antrag eingereicht
                  </>
                ) : (isAuthenticated && applicationStatus !== null && applicationStatus !== 'signing') ? (
                  <>
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    Status nicht korrekt
                  </>
                ) : (
                  <>
                    <i className="bi bi-send me-2"></i>
                    Antrag einreichen
                  </>
                )}
              </Button>
              <p className="text-muted small mt-4">
                Sie können Ihren Antrag auch einreichen, wenn nicht alle Dokumente hochgeladen wurden.
              </p>
            </div>
          </Card.Body>
        </Card>
      </Container>

      {/* Upload Warning Dialog */}
      <Modal show={showUploadWarningDialog} onHide={() => setShowUploadWarningDialog(false)} centered>
        <Modal.Header>
          <Modal.Title>Warnung: Unvollständige Unterschriften</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Sie haben noch nicht alle unterschriebenen Dokumente hochgeladen. Dies kann dazu führen, dass Ihr Antrag nicht bewilligt wird. Möchten Sie trotzdem fortfahren?</p>
          {isAuthenticated && applicationStatus !== null && applicationStatus !== 'signing' && (
            <Alert variant="warning" className="mt-3">
              <i className="bi bi-exclamation-triangle me-2"></i>
              <strong>Hinweis:</strong> Der Antragsstatus ist nicht korrekt. Die Einreichung wird nicht möglich sein.
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={handleContinueWithSubmission}
            disabled={isAuthenticated && applicationStatus !== null && applicationStatus !== 'signing'}
          >
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
      {isSubmitting && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" 
            style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.9)', 
              zIndex: 99999 
            }}>
          <div className="text-center">
            <Spinner animation="border" role="status" style={{ width: '3rem', height: '3rem', color: '#064497' }}>
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <div className="mt-3" style={{ color: '#064497' }}>Antrag wird eingereicht...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignatureUploadPage;
