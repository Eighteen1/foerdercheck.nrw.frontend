import React, { useState } from 'react';
import { Button, Alert, Card, Row, Col } from 'react-bootstrap';
import OCRDocumentProcessor from './OCRDocumentProcessor';

interface DocumentUploadWithOCRProps {
  fieldId: string;
  documentType: string;
  title: string;
  description: string;
  onFileUpload: (fieldId: string, file: File) => void;
  onIncomeExtracted?: (extractedIncome: number, confidence: number) => void;
  userEnteredIncome?: number;
  className?: string;
}

const DocumentUploadWithOCR: React.FC<DocumentUploadWithOCRProps> = ({
  fieldId,
  documentType,
  title,
  description,
  onFileUpload,
  onIncomeExtracted,
  userEnteredIncome,
  className = ""
}) => {
  const [showOCR, setShowOCR] = useState(false);
  const [extractedIncome, setExtractedIncome] = useState<number | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState<number>(0);

  const handleIncomeExtracted = (income: number, confidence: number) => {
    setExtractedIncome(income);
    setOcrConfidence(confidence);
    if (onIncomeExtracted) {
      onIncomeExtracted(income, confidence);
    }
  };

  const handleValidationResult = (isValid: boolean, recommendedValue: number) => {
    if (!isValid && recommendedValue !== userEnteredIncome) {
      // Show warning about discrepancy
      console.log(`OCR detected discrepancy: User entered ${userEnteredIncome}, OCR found ${recommendedValue}`);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload(fieldId, file);
    }
  };

  // Only show OCR for income-related documents
  const isIncomeDocument = ['lohn_gehaltsbescheinigungen', 'einkommenssteuerbescheid', 'rentenbescheid'].includes(documentType);

  return (
    <div className={className}>
      <Card className="mb-3">
        <Card.Header>
          <h6 className="mb-0 text-[#064497]">{title}</h6>
          <small className="text-muted">{description}</small>
        </Card.Header>
        <Card.Body>
          {/* Regular File Upload */}
          <div className="mb-3">
            <input
              id={`file-input-${fieldId}`}
              type="file"
              onChange={handleFileUpload}
              className="form-control"
              accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp"
            />
          </div>

          {/* OCR Toggle for Income Documents */}
          {isIncomeDocument && (
            <div className="mb-3">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id={`ocr-toggle-${fieldId}`}
                  checked={showOCR}
                  onChange={(e) => setShowOCR(e.target.checked)}
                />
                <label className="form-check-label" htmlFor={`ocr-toggle-${fieldId}`}>
                  <i className="bi bi-robot me-1"></i>
                  Automatische Einkommenserkennung aktivieren
                </label>
              </div>
              <small className="text-muted">
                Aktivieren Sie diese Option, um Einkommensdaten automatisch aus dem Dokument zu extrahieren.
              </small>
            </div>
          )}

          {/* OCR Results Summary */}
          {extractedIncome && (
            <Alert variant="info" className="mb-3">
              <i className="bi bi-info-circle-fill me-2"></i>
              <strong>OCR-Ergebnis:</strong> {new Intl.NumberFormat('de-DE', {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: 2,
              }).format(extractedIncome)} 
              <span className={`ms-2 badge bg-${ocrConfidence >= 0.8 ? 'success' : ocrConfidence >= 0.6 ? 'warning' : 'danger'}`}>
                {Math.round(ocrConfidence * 100)}% Vertrauen
              </span>
            </Alert>
          )}

          {/* OCR Document Processor */}
          {showOCR && isIncomeDocument && (
            <OCRDocumentProcessor
              documentType={documentType}
              userEnteredIncome={userEnteredIncome}
              onIncomeExtracted={handleIncomeExtracted}
              onValidationResult={handleValidationResult}
            />
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default DocumentUploadWithOCR;
