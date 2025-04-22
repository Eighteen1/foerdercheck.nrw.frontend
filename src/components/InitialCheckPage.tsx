import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { Container, Row, Col, Form, Button, OverlayTrigger, Tooltip } from "react-bootstrap";

const InitialCheckPage: React.FC = () => {
  const navigate = useNavigate();
  
  // State to manage form inputs
  const [adultCount, setAdultCount] = useState<string>('');
  const [childCount, setChildCount] = useState<string>('');
  const [isDisabled, setIsDisabled] = useState<boolean>(false);
  const [isMarried, setIsMarried] = useState<boolean>(false);
  const [isRetired, setIsRetired] = useState<boolean>(false);
  const [grossIncome, setGrossIncome] = useState<string>('');
  const [netIncome, setNetIncome] = useState<string>('');

  // Handle form submission
  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation 
    if (!adultCount || !childCount || !grossIncome || !netIncome) {
      alert('Bitte füllen Sie alle Pflichtfelder aus.');
      return;
    }

    const formData = {
      adultCount, 
      childCount, 
      isDisabled,
      isMarried,
      isRetired,
      grossIncome, 
      netIncome,
      from: 'initial-check'
    };

    // Always navigate to ic-results first
    navigate('/ic-results', { state: formData });
  };

  return (
    <div className="relative min-h-screen bg-white">
      {/* Bottom right quadrant of ellipse */}
      <div className="absolute top-[-170px] left-[-25%] w-[70%] h-[300px] bg-[#064497] rounded-[50%]"></div>
      
      {/* Main heading */}
      <div className="absolute top-12 start-9">
        <h1 className="display-6 fw-regular text-[#ffffff] mb-2 font-['Roboto']">
          Fördercheck.NRW
        </h1>
      </div>

      <Container className="relative z-10 pt-40 px-4">
        <h2 className="mb-4 text-[#064497] font-['Roboto'] text-4xl text-center">Förderfähigkeitsprüfer</h2>
        <p className="mb-4 text-[#000000] text-center">
          Dieser kurze Fragebogen unterstützt uns dabei zu ermitteln, ob Ihr Haushalteinkommen im förderfähigen Rahmen liegt.
        </p>

        <Form onSubmit={handleCheck}>
          <div className="d-flex align-items-center gap-4">
            <h3 className="pt-8 mb-4 text-[#000000] font-semibold italic">Angaben zu Ihrem Haushalt</h3>
            <OverlayTrigger
              placement="right"
              overlay={
                <Tooltip id="household-tooltip">
                  Hier geben Sie die Anzahl der Personen in Ihrem Haushalt an. Erwachsene sind Personen ab 18 Jahren. Kinder sind Personen unter 18 Jahren.
                </Tooltip>
              }
            >
              <Button 
                variant="outline-secondary"
                className="rounded-circle p-0 d-flex align-items-center justify-content-center font-semibold"
                style={{ 
                  width: '20px', 
                  height: '20px',
                  color: '#064497',
                  borderColor: '#D7DAEA',
                  backgroundColor: '#D7DAEA',
                  marginTop: '4px'
                }}
              >
                ?
              </Button>
            </OverlayTrigger>
          </div>
          <Row className="mb-3">
            <Col>
              <Form.Floating>
                <Form.Control 
                  type="number" 
                  placeholder="Anzahl Erwachsene" 
                  value={adultCount}
                  onChange={(e) => setAdultCount(e.target.value)}
                  required 
                />
                <label>Anzahl Erwachsene</label>
              </Form.Floating>
            </Col>
            <Col>
              <Form.Floating>
                <Form.Control 
                  type="number" 
                  placeholder="Anzahl Kinder" 
                  value={childCount}
                  onChange={(e) => setChildCount(e.target.value)}
                  required 
                />
                <label>Anzahl Kinder</label>
              </Form.Floating>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col>
              <Form.Check 
                type="checkbox"
                label="Sind einige der Personen schwerbehindert?"
                checked={isDisabled}
                onChange={(e) => setIsDisabled(e.target.checked)}
              />
            </Col>
          </Row>

          <Row className="mb-3">
            <Col>
              <Form.Check 
                type="checkbox"
                label="Antragstellende sind verheiratet/leben in einer eingetragenen Lebenspartnerschaft"
                checked={isMarried}
                onChange={(e) => setIsMarried(e.target.checked)}
              />
            </Col>
          </Row>

          <Row className="mb-3">
            <Col>
              <Form.Check 
                type="checkbox"
                label="Befinden Sie sich in Rente?"
                checked={isRetired}
                onChange={(e) => setIsRetired(e.target.checked)}
              />
            </Col>
          </Row>
          <div className="d-flex align-items-center gap-4">
          <h3 className="pt-8 mb-4 text-[#000000] font-semibold italic">Angaben zu Ihrem Haushaltseinkommen</h3>
          <OverlayTrigger
              placement="right"
              overlay={
                <Tooltip id="household-tooltip">
                  Hier geben Sie die Anzahl der Personen in Ihrem Haushalt an. Erwachsene sind Personen ab 18 Jahren. Kinder sind Personen unter 18 Jahren.
                </Tooltip>
              }
            >
              <Button 
                variant="outline-secondary"
                className="rounded-circle p-0 d-flex align-items-center justify-content-center font-semibold"
                style={{ 
                  width: '20px', 
                  height: '20px',
                  color: '#064497',
                  borderColor: '#D7DAEA',
                  backgroundColor: '#D7DAEA',
                  marginTop: '4px'
                }}
              >
                ?
              </Button>
            </OverlayTrigger>
          </div>
          <Row className="mb-3">
            <Col>
              <Form.Floating>
                <Form.Control 
                  type="text"
                  placeholder="Brutto-Jahreseinkommen in €"
                  value={grossIncome}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    if (value === '') {
                      setGrossIncome('');
                      return;
                    }
                    const numberValue = Number(value);
                    const formattedValue = new Intl.NumberFormat('de-DE', {
                      style: 'currency',
                      currency: 'EUR',
                      minimumFractionDigits: 2
                    }).format(numberValue/100);
                    setGrossIncome(formattedValue);
                  }}
                  required
                />
                <label>Brutto-Jahreseinkommen in €</label>
              </Form.Floating>
            </Col>
            <Col>
              <Form.Floating>
                <Form.Control 
                  type="text" 
                  placeholder="Netto-Jahreseinkommen in €" 
                  value={netIncome}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    if (value === '') {
                      setNetIncome('');
                      return;
                    }
                    const numberValue = Number(value);
                    const formattedValue = new Intl.NumberFormat('de-DE', {
                      style: 'currency',
                      currency: 'EUR',
                      minimumFractionDigits: 2
                    }).format(numberValue/100);
                    setNetIncome(formattedValue);
                  }}
                  required 
                />
                <label>Netto-Jahreseinkommen in €</label>
              </Form.Floating>
            </Col>
          </Row>

          <Button 
            type="submit" 
            className="w-full bg-[#064497] hover:bg-[#0B66E6] text-white py-2 rounded"
          >
            PRÜFEN
          </Button>
        </Form>
      </Container>
    </div>
  );
};

export default InitialCheckPage;
