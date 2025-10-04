import React, { useState } from 'react';
import { Card, Alert, Button, Row, Col } from 'react-bootstrap';
import OCRDocumentProcessor from './OCRDocumentProcessor';
import { ocrService } from '../services/ocrService';

const OCRTestComponent: React.FC = () => {
  const [debugMode, setDebugMode] = useState(false);
  const [debugResult, setDebugResult] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Test handlers that will print the variables
  const handleIncomeExtracted = (extractedIncome: number, confidence: number) => {
    console.log('=== onIncomeExtracted called ===');
    console.log('extractedIncome:', extractedIncome);
    console.log('confidence:', confidence);
    console.log('Type of extractedIncome:', typeof extractedIncome);
    console.log('Type of confidence:', typeof confidence);
    console.log('================================');
  };

  const handleValidationResult = (isValid: boolean, recommendedValue: number) => {
    console.log('=== onValidationResult called ===');
    console.log('isValid:', isValid);
    console.log('recommendedValue:', recommendedValue);
    console.log('Type of isValid:', typeof isValid);
    console.log('Type of recommendedValue:', typeof recommendedValue);
    console.log('=================================');
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setDebugResult(null);
  };

  const runDebugMode = async () => {
    if (!selectedFile) return;
    
    try {
      const result = await ocrService.debugProcessDocument(selectedFile);
      setDebugResult(result);
      console.log('=== DEBUG RESULT ===');
      console.log(JSON.stringify(result, null, 2));
      console.log('===================');
    } catch (error) {
      console.error('Debug processing failed:', error);
      setDebugResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  return (
    <div className="container mt-4">
      <Card>
        <Card.Header>
          <Row className="align-items-center">
            <Col>
              <h4>OCR Component Test</h4>
              <p className="mb-0 text-muted">
                This component tests the OCR functionality and prints callback variables to the console.
                Open your browser's developer console to see the printed values.
              </p>
            </Col>
            <Col xs="auto">
              <Button
                variant={debugMode ? "success" : "outline-secondary"}
                onClick={() => setDebugMode(!debugMode)}
              >
                {debugMode ? "Exit Debug Mode" : "Enable Debug Mode"}
              </Button>
            </Col>
          </Row>
        </Card.Header>
        <Card.Body>
          <Alert variant="info" className="mb-3">
            <strong>Instructions:</strong>
            <ol className="mb-0 mt-2">
              <li>Open your browser's developer console (F12)</li>
              <li>Upload a document using the OCR component below</li>
              <li>Process the document</li>
              <li>Check the console for printed variables from the callback functions</li>
              {debugMode && (
                <li><strong>Debug Mode:</strong> Use the debug button to get detailed OCR processing information</li>
              )}
            </ol>
          </Alert>

          <OCRDocumentProcessor
            documentType="lohn_gehaltsbescheinigungen"
            userEnteredIncome={2500}
            onIncomeExtracted={handleIncomeExtracted}
            onValidationResult={handleValidationResult}
            onFileSelect={handleFileSelect}
            testMode={true}
          />

          {debugMode && selectedFile && (
            <div className="mt-4">
              <Card>
                <Card.Header>
                  <h5>Debug Mode</h5>
                  <p className="mb-0 text-muted">
                    Selected file: {selectedFile.name} ({selectedFile.size} bytes)
                  </p>
                </Card.Header>
                <Card.Body>
                  <Button 
                    variant="primary" 
                    onClick={runDebugMode}
                    className="mb-3"
                  >
                    Run Debug Processing
                  </Button>
                  
                  {debugResult && (
                    <div>
                      <h6>Debug Results:</h6>
                      <pre className="bg-light p-3 rounded" style={{ maxHeight: '400px', overflow: 'auto' }}>
                        {JSON.stringify(debugResult, null, 2)}
                      </pre>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default OCRTestComponent;
