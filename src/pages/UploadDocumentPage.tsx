import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Alert, Button, ProgressBar, Spinner } from 'react-bootstrap';
import { supabase } from '../lib/supabase';

interface DocumentRequest {
  token: string;
  document_type_id: string;
  applicant_type: string;
  applicant_number: number | null;
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
      // Determine applicant key for file path
      let applicantKey: string;
      if (documentRequest.applicant_type === 'general') {
        applicantKey = 'general';
      } else if (documentRequest.applicant_type === 'hauptantragsteller') {
        applicantKey = 'hauptantragsteller';
      } else {
        applicantKey = `applicant_${documentRequest.applicant_number}`;
      }

      // Create file path
      const filePath = `${documentRequest.resident_id}/${applicantKey}/${documentRequest.document_type_id}/${selectedFile.name}`;

      // Progress simulation
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + Math.random() * 20, 90));
      }, 200);

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile, {
          upsert: true
        });

      clearInterval(progressInterval);

      if (uploadError) {
        throw uploadError;
      }

      setUploadProgress(100);

      // Brief delay to show 100% completion
      await new Promise(resolve => setTimeout(resolve, 500));

      // Call backend to update document status
      const response = await fetch(`${BACKEND_URL}/api/upload-requested-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          file_name: selectedFile.name,
          file_path: filePath,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Fehler beim Speichern des Dokuments.');
      }

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
      <Container className="py-5">
        <div className="text-center">
          <Spinner animation="border" style={{ color: '#064497' }} />
          <p className="mt-3">Lade Dokumentenanfrage...</p>
        </div>
      </Container>
    );
  }

  if (error && !documentRequest) {
    return (
      <Container className="py-5">
        <Card className="mx-auto" style={{ maxWidth: '600px' }}>
          <Card.Body className="text-center">
            <div className="mb-3">
              <i className="bi bi-exclamation-triangle-fill text-danger" style={{ fontSize: '3rem' }}></i>
            </div>
            <h4 className="text-danger mb-3">Fehler</h4>
            <p>{error}</p>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  if (success) {
    return (
      <Container className="py-5">
        <Card className="mx-auto" style={{ maxWidth: '600px' }}>
          <Card.Body className="text-center">
            <div className="mb-3">
              <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '3rem' }}></i>
            </div>
            <h4 className="text-success mb-3">Dokument erfolgreich hochgeladen!</h4>
            <p>Das Dokument wurde erfolgreich an Ihren Sachbearbeiter übermittelt.</p>
          </Card.Body>
        </Card>
      </Container>
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
      return `Antragsteller ${documentRequest.applicant_number}`;
    }
  };

  const expiresAt = new Date(documentRequest.expires_at);
  const isExpired = new Date() > expiresAt;

  if (isExpired) {
    return (
      <Container className="py-5">
        <Card className="mx-auto" style={{ maxWidth: '600px' }}>
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
    );
  }

  return (
    <Container className="py-5">
      <Card className="mx-auto" style={{ maxWidth: '800px' }}>
        <Card.Header style={{ backgroundColor: '#064497', color: 'white' }}>
          <h3 className="mb-0">Dokument hochladen</h3>
        </Card.Header>
        <Card.Body>
          {/* Document Info */}
          <div className="mb-4 p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <h5 style={{ color: '#064497', marginBottom: '0.5rem' }}>{documentInfo.title}</h5>
            <p className="text-muted mb-2">{documentInfo.description}</p>
            <p className="mb-1"><strong>Für:</strong> {getApplicantName()}</p>
            <p className="mb-0"><strong>Gültig bis:</strong> {expiresAt.toLocaleDateString()}</p>
          </div>

          {/* Custom Message */}
          {documentRequest.custom_message && (
            <Alert variant="info">
              <strong>Nachricht vom Sachbearbeiter:</strong><br />
              {documentRequest.custom_message}
            </Alert>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="danger">{error}</Alert>
          )}

          {/* File Selection */}
          <div className="mb-4">
            <label className="form-label">Datei auswählen</label>
            <input
              type="file"
              className="form-control"
              onChange={handleFileSelect}
              disabled={uploading}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            />
            <div className="form-text">
              Erlaubte Dateiformate: PDF, JPEG, PNG, DOC, DOCX. Maximale Größe: 50MB
            </div>
          </div>

          {/* Selected File Info */}
          {selectedFile && (
            <div className="mb-4 p-3" style={{ backgroundColor: '#e8f5e8', borderRadius: '8px' }}>
              <div className="d-flex align-items-center">
                <i className="bi bi-file-earmark text-success me-2" style={{ fontSize: '1.5rem' }}></i>
                <div>
                  <div><strong>{selectedFile.name}</strong></div>
                  <div className="text-muted">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="mb-4">
              <div className="d-flex justify-content-between mb-2">
                <span>Upload-Fortschritt</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <ProgressBar now={uploadProgress} style={{ height: '8px' }} />
            </div>
          )}

          {/* Upload Button */}
          <div className="text-center">
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              style={{
                backgroundColor: '#064497',
                border: 'none',
                padding: '12px 32px',
                fontSize: '1.1rem',
                fontWeight: 'bold'
              }}
            >
              {uploading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Wird hochgeladen...
                </>
              ) : (
                'Dokument hochladen'
              )}
            </Button>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default UploadDocumentPage; 