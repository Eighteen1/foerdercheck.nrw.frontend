import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { Container, Row, Col, Form, Button, OverlayTrigger, Tooltip } from "react-bootstrap";
import CurrencyInput from './common/CurrencyInput';

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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

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

    // If authenticated, go directly to personal space
    if (isAuthenticated) {
      navigate('/personal-space', { state: formData });
    } else {
      // If not authenticated, go to results page
      navigate('/ic-results', { state: formData });
    }
  };

  return (
    <div className="relative min-h-screen bg-white">
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
      
      <div className="blue-corner">
        <span className="blue-corner-text long">FÖRDERCHECK.NRW</span>
        <span className="blue-corner-text short">FC.NRW</span>
      </div>

      <Container className="relative z-10 pt-40 px-4">
        <h2 className="mb-4 text-[#064497] font-['Roboto'] text-4xl text-center">Förderfähigkeitsprüfer</h2>
        <p className="mb-4 text-[#000000] text-center">
          Dieser kurze Fragebogen unterstützt uns dabei zu ermitteln, ob Ihr Haushalteinkommen im förderfähigen Rahmen liegt.
        </p>

        <Form onSubmit={handleCheck}>
          <div className="d-flex align-items-center gap-2">
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
                className="custom-checkbox"
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
                className="custom-checkbox"
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
                className="custom-checkbox"
              />
            </Col>
          </Row>
          <div className="d-flex align-items-center gap-2">
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
              <CurrencyInput
                value={grossIncome}
                onChange={setGrossIncome}
                placeholder="Brutto-Jahreseinkommen in €"
                label="Brutto-Jahreseinkommen in €"
              />
            </Col>
            <Col>
              <CurrencyInput
                value={netIncome}
                onChange={setNetIncome}
                placeholder="Netto-Jahreseinkommen in €"
                label="Netto-Jahreseinkommen in €"
              />
            </Col>
          </Row>

          <Button 
            type="submit" 
            className="w-full bg-[#064497] hover:bg-[#0B66E6] text-white py-2 rounded mt-4 mb-12"
          >
            PRÜFEN
          </Button>
        </Form>
      </Container>
      <div className="pb-4"></div>
    </div>
  );
};

export default InitialCheckPage;
