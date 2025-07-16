import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Alert, Button, ProgressBar, Spinner } from 'react-bootstrap';
import { supabase } from '../lib/supabase';

interface DocumentRequest {
  token: string;
  document_type_id: string;
  applicant_type: string;
  applicant_number: number | null;
  applicant_name?: string;
  custom_message: string;
  application_id: string;
  resident_id: string;
  expires_at: string;
}

const DOCUMENT_TYPES: { [id: string]: {title: string, description: string} } = {
  'meldebescheinigung': {title: 'Meldebescheinigung', description: 'Meldebescheinigung von allen Personen, die das Förderobjekt nach Fertigstellung beziehen sollen'},
  'bauzeichnung': {title: 'Bauzeichnung', description: 'Bauzeichnung (im Maßstab 1:100 mit eingezeichneter Möbelstellung)'},
  'lageplan': {title: 'Lageplan', description: 'Lageplan nach den Vorschriften Bau NRW (2018)'},
  'grundbuchblattkopie': {title: 'Grundbuchblattkopie', description: 'Grundbuchblattkopie nach neuestem Stand'},
  'baugenehmigung_vorbescheid': {title: 'Baugenehmigung oder Vorbescheid', description: 'Baugenehmigung oder Vorbescheid gemäß § 7 BauO NRW (2018)'},
  'bergsenkungsGebiet_erklaerung': {title: 'Erklärung der Bergbaugesellschaft', description: 'Erklärung der Bergbaugesellschaft über die Notwendigkeit von baulichen Anpassungs- und Sicherungsmaßnahmen'},
  'neubau_kaufvertrag': {title: 'Grundstückskaufvertrag/Entwurf des Kaufvertrags', description: 'Bei Neubau: Grundstückskaufvertrag/Entwurf des Kaufvertrags.'},
  'erbbaurechtsvertrag': {title: 'Erbbaurechtsvertrag', description: 'Vollständige Kopie des Erbbaurechtsvertrages'},
  'kaufvertrag': {title: 'Entwurf des Kaufvertrags', description: 'Entwurf des Kaufvertrags'},
  'standortbedingte_mehrkosten': {title: 'Nachweis für standortbedingte Mehrkosten', description: 'Gutachten, Rechnungen oder Kostenvoranschläge'},
  'haswoodconstructionloan': {title: 'Nachweis: Zusatzdarlehen für Bauen mit Holz', description: 'Nachweis: Zusatzdarlehen für Bauen mit Holz'},
  'beg40standard_cert': {title: 'Nachweis: Zusatzdarlehen für BEG Effizienzstandard 40', description: 'Nachweis: Zusatzdarlehen für BEG Effizienzstandard 40'},
  'pregnancy_cert': {title: 'Schwangerschafts Nachweis', description: 'Nachweis über die Schwangerschaft'},
  'marriage_cert': {title: 'Heiratsurkunde/Lebenspartnerschaftsurkunde', description: 'Aktuelle Heiratsurkunde oder Lebenspartnerschaftsurkunde'},
  'disability_cert': {title: 'Nachweis über die Schwerbehinderteneigenschaft/GdB', description: 'Nachweis über die Schwerbehinderteneigenschaft/Grad der Behinderung (GdB)'},
  'vollmacht_cert': {title: 'Vollmachtsurkunde', description: 'Vollmachtsurkunde für die bevollmächtigte Person/Firma'},
  'lohn_gehaltsbescheinigungen': {title: 'Lohn-/Gehaltsbescheinigungen', description: 'Lohn-/Gehaltsbescheinigungen'},
  'einkommenssteuerbescheid': {title: 'Letzter Einkommenssteuerbescheid', description: 'Letzter Einkommenssteuerbescheid'},
  'einkommenssteuererklaerung': {title: 'Letzte Einkommenssteuererklärung', description: 'Letzte Einkommenssteuererklärung'},
  'rentenbescheid': {title: 'Rentenbescheid/Versorgungsbezüge', description: 'Aktueller Rentenbescheid/aktueller Bescheid über Versorgungsbezüge'},
  'arbeitslosengeldbescheid': {title: 'Arbeitslosengeldbescheid', description: 'Arbeitslosengeldbescheid'},
  'werbungskosten_nachweis': {title: 'Nachweis Werbungskosten', description: 'Nachweis über erhöhte Werbungskosten (z. B. Steuerbescheid, Bestätigung Finanzamt)'},
  'kinderbetreuungskosten_nachweis': {title: 'Nachweis Kinderbetreuungskosten', description: 'Nachweis über die geleisteten Kinderbetreuungskosten'},
  'unterhaltsverpflichtung_nachweis': {title: 'Nachweis Unterhaltsverpflichtung', description: 'Nachweis über die gesetzliche Unterhaltsverpflichtung und Höhe der Unterhaltszahlungen'},
  'unterhaltsleistungen_nachweis': {title: 'Nachweis Unterhaltsleistungen', description: 'Nachweis über erhaltene Unterhaltsleistungen/Unterhaltsvorschuss'},
  'krankengeld_nachweis': {title: 'Nachweis Krankengeld', description: 'Nachweis über erhaltenes Krankengeld'},
  'elterngeld_nachweis': {title: 'Nachweis Elterngeld', description: 'Nachweis über erhaltenes Elterngeld'},
  'guv_euer_nachweis': {title: 'Gewinn- und Verlustrechnung (GuV)/Einnahmenüberschussrechnung (EÜR)', description: 'Gewinn- und Verlustrechnung (GuV)/Einnahmenüberschussrechnung (EÜR)'},
  'ausbildungsfoerderung_nachweis': {title: 'Leistungen der Ausbildungsförderung (BAföG, Berufsausbildungsbeihilfe SGB III)', description: 'Leistungen der Ausbildungsförderung (BAföG, Berufsausbildungsbeihilfe SGB III) (optional)'},
  'sonstige_dokumente': {title: 'Sonstige Dokumente', description: 'Weitere relevante Dokumente'}
};

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

const UploadDocumentPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [documentRequest, setDocumentRequest] = useState<DocumentRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Load document request details
  useEffect(() => {
    const loadDocumentRequest = async () => {
      if (!token) {
        setError('Ungültiger Token.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${BACKEND_URL}/api/document-request/${token}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Dokumentenanfrage nicht gefunden oder bereits bearbeitet.');
          } else if (response.status === 410) {
            setError('Dokumentenanfrage ist abgelaufen.');
          } else if (response.status === 409) {
            const data = await response.json().catch(() => ({}));
            setError(data.detail || 'Dokument-Upload nicht möglich. Der Antrag wurde bereits entschieden.');
          } else {
            setError('Fehler beim Laden der Dokumentenanfrage.');
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        setDocumentRequest(data);
      } catch (err) {
        setError('Fehler beim Laden der Dokumentenanfrage.');
      } finally {
        setLoading(false);
      }
    };

    loadDocumentRequest();
  }, [token]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (50MB limit)
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        setError(`Die Datei ist zu groß. Maximale Größe: 50MB. Ihre Datei: ${(file.size / 1024 / 1024).toFixed(1)}MB`);
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentRequest || !token) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Progress simulation
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + Math.random() * 20, 90));
      }, 200);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('token', token);

      // Upload file through backend
      const response = await fetch(`${BACKEND_URL}/api/upload-requested-document-file`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (response.status === 409) {
          throw new Error(data.detail || 'Dokument-Upload nicht möglich. Der Antrag wurde bereits entschieden.');
        }
        throw new Error(data.detail || 'Fehler beim Hochladen des Dokuments.');
      }

      setUploadProgress(100);

      // Brief delay to show 100% completion
      await new Promise(resolve => setTimeout(resolve, 500));

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Hochladen des Dokuments.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  if (loading) {
    return (
      <div className="relative bg-gray-50 min-h-screen">
        <Container className="py-5">
          <div className="text-center">
            <Spinner animation="border" style={{ color: '#064497' }} />
            <p className="mt-3">Lade Dokumentenanfrage...</p>
          </div>
        </Container>
      </div>
    );
  }

  if (error && !documentRequest) {
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
            </Card.Body>
          </Card>
        </Container>
      </div>
    );
  }

  if (success) {
    return (
      <div className="relative bg-gray-50 min-h-screen">
        <Container className="py-5">
          <Card className="mx-auto border-0 shadow-lg" style={{ maxWidth: '600px' }}>
            <Card.Body className="text-center">
              <div className="mb-3">
                <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '3rem' }}></i>
              </div>
              <h4 className="text-success mb-3">Dokument erfolgreich hochgeladen!</h4>
              <p>Das Dokument wurde erfolgreich an Ihren Sachbearbeiter übermittelt.</p>
            </Card.Body>
          </Card>
        </Container>
      </div>
    );
  }

  if (!documentRequest) return null;

  const documentInfo = DOCUMENT_TYPES[documentRequest.document_type_id] || {
    title: documentRequest.document_type_id,
    description: 'Dokument wurde angefordert'
  };

  const getApplicantName = () => {
    if (documentRequest.applicant_type === 'general') {
      return 'Allgemeine Dokumente';
    } else if (documentRequest.applicant_type === 'hauptantragsteller') {
      return 'Hauptantragsteller';
    } else {
      // For applicant type, we need to get the full name from the backend
      // The backend should now provide the full name in the response
      return documentRequest.applicant_name || `Antragsteller ${documentRequest.applicant_number || 'Unbekannt'}`;
    }
  };

  const expiresAt = new Date(documentRequest.expires_at);
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
              <h4 className="text-warning mb-3">Anfrage abgelaufen</h4>
              <p>Diese Dokumentenanfrage ist am {expiresAt.toLocaleDateString()} abgelaufen.</p>
              <p>Bitte wenden Sie sich an Ihren Sachbearbeiter für eine neue Anfrage.</p>
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
          
          /* Hide file type icons */
          .file-display {
            display: flex;
            align-items: center;
            padding: 16px;
            background: #e8f5e8;
            border-radius: 12px;
            border: 1px solid #d4edda;
          }
          
          .file-display::before {
            content: '';
            width: 0;
            height: 0;
            display: none;
          }
          
          .file-display * {
            -webkit-appearance: none;
            -moz-appearance: none;
            appearance: none;
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
      
      {/* Blue corner design */}
      <div className="blue-corner">
        <span className="blue-corner-text long">DOKUMENTE HOCHLADEN</span>
        <span className="blue-corner-text short">DOKUMENTE</span>
      </div>
      
      <Container className="py-5 pt-32">
        <Card className="mx-auto border-0 shadow-lg mt-32" style={{ maxWidth: '800px', backgroundColor: '#ffffff' }}>
          <Card.Body className="p-5">
            {/* Document Info */}
            <div className="mb-4 p-4" style={{ backgroundColor: '#f8f9fa', borderRadius: '12px', border: '1px solid #e9ecef' }}>
              <h5 style={{ color: '#064497', marginBottom: '0.5rem', fontWeight: '500', fontSize: '1.5rem' }}>{documentInfo.title}</h5>
              <p className="text-muted mb-2" style={{ lineHeight: '1.6' }}>{documentInfo.description}</p>
              <div className="row">
                <div className="col-md-6">
                  <p className="mb-1"><strong>Für:</strong> {getApplicantName()}</p>
                </div>
                <div className="col-md-6">
                  <p className="mb-0"><strong>Gültig bis:</strong> {expiresAt.toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Custom Message */}
            {documentRequest.custom_message && (
              <Alert variant="info" className="border-0" style={{ backgroundColor: '#e7f3ff', borderRadius: '12px' }}>
                <div className="d-flex align-items-start">
                  <div>
                    <strong>Nachricht vom Sachbearbeiter:</strong><br />
                    {documentRequest.custom_message}
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

            {/* File Selection */}
            <div className="mb-4">
              <label className="form-label fw-semibold mb-3 mt-2" style={{ color: '#000000' }}>Datei auswählen</label>
              <div className="custom-file-input">
                <input
                  type="file"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.HEIC"
                />
                <div className="custom-file-label">
                  <i className="bi bi-cloud-upload"></i>
                  <span>Datei auswählen oder hierher ziehen</span>
                </div>
              </div>
              <div className="form-text mt-2" style={{ fontSize: '0.9rem' }}>
                Erlaubte Dateiformate: PDF, JPEG, PNG, DOC, DOCX, XLS, XLSX, HEIC. Maximale Größe: 50MB
              </div>
            </div>

            {/* Selected File Info */}
            {selectedFile && (
              <div className="mb-4 file-display">
                <div className="d-flex align-items-center w-100">
                  <i className="bi bi-file-earmark text-success me-3" style={{ fontSize: '1.8rem' }}></i>
                  <div className="flex-grow-1">
                    <div className="fw-semibold" style={{ fontSize: '1.1rem' }}>{selectedFile.name}</div>
                    <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                  <div className="text-success">
                    <i className="bi bi-check-circle-fill" style={{ fontSize: '1.5rem' }}></i>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {uploading && (
              <div className="mb-4 p-4" style={{ backgroundColor: '#f8f9fa', borderRadius: '12px' }}>
                <div className="d-flex justify-content-between mb-3">
                  <span className="fw-semibold">Upload-Fortschritt</span>
                  <span className="fw-semibold" style={{ color: '#064497' }}>{Math.round(uploadProgress)}%</span>
                </div>
                <ProgressBar now={uploadProgress} className="progress" />
              </div>
            )}

            {/* Upload Button */}
            <div className="text-center">
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="px-5 py-3 fw-regular"
                style={{ 
                  backgroundColor: '#064497', 
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1.1rem',
                  boxShadow: '0 4px 12px rgba(6, 68, 151, 0.2)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = '#0a5cb8';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(6, 68, 151, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = '#064497';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(6, 68, 151, 0.2)';
                  }
                }}
              >
                {uploading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Wird hochgeladen...
                  </>
                ) : (
                  <>
                    Dokument hochladen
                  </>
                )}
              </Button>
            </div>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default UploadDocumentPage; 