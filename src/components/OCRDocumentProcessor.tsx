import React, { useState, useCallback } from 'react';
import { Button, Card, Alert, Spinner, Modal, Form, Row, Col } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';

interface ExtractedData {
  gross_salary?: number;
  net_salary?: number;
  monthly_income?: number;
  yearly_income?: number;
  employer_name?: string;
  employee_name?: string;
  period?: string;
  raw_text?: string;
}

interface ValidationResult {
  is_valid: boolean;
  discrepancy_percentage: number;
  recommended_value: number;
  validation_message: string;
}

interface OCRProcessResponse {
  success: boolean;
  extracted_data: ExtractedData;
  validation_result: ValidationResult;
  confidence_score: number;
  extraction_method: string;
  message: string;
}

interface OCRDocumentProcessorProps {
  documentType: string;
  userEnteredIncome?: number;
  onIncomeExtracted: (extractedIncome: number, confidence: number) => void;
  onValidationResult: (isValid: boolean, recommendedValue: number) => void;
  onFileSelect?: (file: File) => void;
  className?: string;
  testMode?: boolean;
}

const OCRDocumentProcessor: React.FC<OCRDocumentProcessorProps> = ({
  documentType,
  userEnteredIncome,
  onIncomeExtracted,
  onValidationResult,
  onFileSelect,
  className = "",
  testMode = false
}) => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(0);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/tiff', 'image/bmp'];
      if (!allowedTypes.includes(file.type)) {
        setError('Unsupported file type. Please upload PDF, PNG, JPG, JPEG, TIFF, or BMP files.');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 50 * 1024 * 1024) {
        setError('File size too large. Please upload files smaller than 10MB.');
        return;
      }

      setUploadedFile(file);
      setError(null);
      setExtractedData(null);
      setValidationResult(null);
      
      // Call the onFileSelect callback if provided
      if (onFileSelect) {
        onFileSelect(file);
      }
    }
  }, []);

  const processDocument = async () => {
    if (!uploadedFile) return;
    
    // In test mode, we don't need user authentication
    if (!testMode && !user) return;

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('document_type', documentType);
      
      if (userEnteredIncome !== undefined) {
        formData.append('user_entered_income', userEnteredIncome.toString());
      }

      // Use test endpoint if in test mode
      const endpoint = testMode ? '/api/ocr/test-process-document' : '/api/ocr/process-document';
      
      const headers: HeadersInit = {};
      if (!testMode && user) {
        headers['Authorization'] = `Bearer ${(user as any).access_token || user.id}`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to process document');
      }

      const result: OCRProcessResponse = await response.json();
      
      if (result.success) {
        setExtractedData(result.extracted_data);
        setValidationResult(result.validation_result);
        setConfidence(result.confidence_score);
        
        // Notify parent components
        const extractedIncome = result.extracted_data.monthly_income || 
                               result.extracted_data.net_salary || 
                               result.extracted_data.gross_salary;
        
        if (extractedIncome) {
          onIncomeExtracted(extractedIncome, result.confidence_score);
        }
        
        if (result.validation_result) {
          onValidationResult(result.validation_result.is_valid, result.validation_result.recommended_value);
        }
      } else {
        setError(result.message || 'Failed to process document');
      }
    } catch (err) {
      console.error('OCR processing error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return 'N/A';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-success';
    if (score >= 0.6) return 'text-warning';
    return 'text-danger';
  };

  const getConfidenceBadge = (score: number) => {
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'warning';
    return 'danger';
  };

  return (
    <div className={`${className}`}>
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0 text-[#064497]">
            <i className="bi bi-file-text me-2"></i>
            Dokument-OCR Verarbeitung
          </h5>
          <small className="text-muted">
            Laden Sie Ihr Dokument hoch, um Einkommensdaten automatisch zu extrahieren und zu verifizieren.
          </small>
        </Card.Header>
        <Card.Body>
          {/* File Upload */}
          <Form.Group className="mb-3">
            <Form.Label>Dokument auswählen</Form.Label>
            <Form.Control
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp"
              onChange={handleFileUpload}
              disabled={isProcessing}
            />
            <Form.Text className="text-muted">
              Unterstützte Formate: PDF, PNG, JPG, JPEG, TIFF, BMP (max. 10MB)
            </Form.Text>
          </Form.Group>

          {/* Upload Button */}
          <Button
            onClick={processDocument}
            disabled={!uploadedFile || isProcessing}
            className="w-100 mb-3"
            style={{ backgroundColor: '#064497', border: 'none' }}
          >
            {isProcessing ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Verarbeitung läuft...
              </>
            ) : (
              'Dokument verarbeiten'
            )}
          </Button>

          {/* Error Display */}
          {error && (
            <Alert variant="danger" className="mb-3">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
            </Alert>
          )}

          {/* Results Display */}
          {extractedData && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0">Extrahierte Daten</h6>
                <span className={`badge bg-${getConfidenceBadge(confidence)}`}>
                  {Math.round(confidence * 100)}% Vertrauen
                </span>
              </div>

              <Row>
                {/* Income Data */}
                <Col md={6}>
                  <h6 className="text-muted mb-2">Einkommensdaten</h6>
                  <div className="mb-2">
                    <small className="text-muted">Bruttolohn:</small>
                    <div className={`fw-bold ${getConfidenceColor(confidence)}`}>
                      {formatCurrency(extractedData.gross_salary)}
                    </div>
                  </div>
                  <div className="mb-2">
                    <small className="text-muted">Nettolohn:</small>
                    <div className={`fw-bold ${getConfidenceColor(confidence)}`}>
                      {formatCurrency(extractedData.net_salary)}
                    </div>
                  </div>
                  <div className="mb-2">
                    <small className="text-muted">Monatliches Einkommen:</small>
                    <div className={`fw-bold ${getConfidenceColor(confidence)}`}>
                      {formatCurrency(extractedData.monthly_income)}
                    </div>
                  </div>
                  <div className="mb-2">
                    <small className="text-muted">Jährliches Einkommen:</small>
                    <div className={`fw-bold ${getConfidenceColor(confidence)}`}>
                      {formatCurrency(extractedData.yearly_income)}
                    </div>
                  </div>
                </Col>

                {/* Document Info */}
                <Col md={6}>
                  <h6 className="text-muted mb-2">Dokumentinformationen</h6>
                  <div className="mb-2">
                    <small className="text-muted">Arbeitgeber:</small>
                    <div className="fw-bold">
                      {extractedData.employer_name || 'N/A'}
                    </div>
                  </div>
                  <div className="mb-2">
                    <small className="text-muted">Mitarbeiter:</small>
                    <div className="fw-bold">
                      {extractedData.employee_name || 'N/A'}
                    </div>
                  </div>
                  <div className="mb-2">
                    <small className="text-muted">Zeitraum:</small>
                    <div className="fw-bold">
                      {extractedData.period || 'N/A'}
                    </div>
                  </div>
                  <div className="mb-2">
                    <small className="text-muted">Methode:</small>
                    <div className="fw-bold">
                      {extractedData.raw_text ? 'OCR' : 'Text-Extraktion'}
                    </div>
                  </div>
                </Col>
              </Row>

              {/* Validation Result */}
              {validationResult && (
                <Alert variant={validationResult.is_valid ? "success" : "danger"} className="mt-3">
                  <i className={`bi bi-${validationResult.is_valid ? 'check-circle' : 'exclamation-triangle'}-fill me-2`}></i>
                  {validationResult.validation_message}
                  {!validationResult.is_valid && (
                    <div className="mt-2">
                      <small>
                        <strong>Empfohlener Wert:</strong> {formatCurrency(validationResult.recommended_value)}<br/>
                        <strong>Abweichung:</strong> {validationResult.discrepancy_percentage.toFixed(1)}%
                      </small>
                    </div>
                  )}
                </Alert>
              )}

              {/* Raw Text Toggle */}
              {extractedData.raw_text && (
                <div className="mt-3">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => setShowRawText(!showRawText)}
                    className="w-100"
                  >
                    {showRawText ? (
                      <>
                        <i className="bi bi-eye-slash me-2"></i>
                        Rohtext ausblenden
                      </>
                    ) : (
                      <>
                        <i className="bi bi-eye me-2"></i>
                        Rohtext anzeigen
                      </>
                    )}
                  </Button>
                  
                  {showRawText && (
                    <div className="mt-2 p-3 bg-light rounded">
                      <pre className="mb-0 small text-muted" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {extractedData.raw_text}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default OCRDocumentProcessor;