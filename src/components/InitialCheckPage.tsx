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
                  Hier geben Sie die Anzahl der Personen in Ihrem Haushalt an (Erwachsene ab 18 Jahren, Kinder unter 18 Jahren) und ob Sie in einer eingetragenen Lebenspartnerschaft leben, Rentner sind oder eine Behinderung bzw. Pflegebedürftigkeit im Haushalt vorliegt, da dies die Einkommensgrenzen beeinflusst.
                </Tooltip>
              }
            >
              <Button 
                variant="outline-secondary"
                className="rounded-circle p-0 d-flex align-items-center justify-content-center"
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
                label="Haben einige der Personen in Ihrem Haushalt eine Behinderung oder Pflegebedürftigkeit?"
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
                  Bitte geben Sie Ihr ungefähres Brutto-Jahreseinkommen Ihres Haushalts (z. B. Lohn, Gehalt, Rente, Unterhalt, selbstständige Einkünfte, Vermietungseinkommen) sowie Ihr ungefähres Netto-Jahreseinkommen Ihres Haushalts (nach Abzug von Steuern, Versicherungen, Werbungskosten, Kinderbetreuungskosten, Unterhaltszahlungen etc.) in € an.
                </Tooltip>
              }
            >
              <Button 
                variant="outline-secondary"
                className="rounded-circle p-0 d-flex align-items-center justify-content-center"
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
                placeholder="Ungefähres Brutto-Jahreseinkommen in €"
                label="Ungefähres Brutto-Jahreseinkommen in €"
              />
            </Col>
            <Col>
              <CurrencyInput
                value={netIncome}
                onChange={setNetIncome}
                placeholder="Ungefähres Netto-Jahreseinkommen in €"
                label="Ungefähres Netto-Jahreseinkommen in €"
              />
            </Col>
          </Row>

          {/* Hint box explaining net income calculation */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800 mb-2">
                  Hinweis zum Netto-Jahreseinkommen
                </h3>
                <div className="text-sm text-blue-700">
                  <p className="mb-2">
                    Wenn Sie den vollständigen Antrag stellen, wird Ihr Netto-Jahreseinkommen für diesen Antrag automatisch berechnet und kann von Ihrem tatsächlichen Nettoeinkommen abweichen. Für diesen Förderfähigkeitsprüfer genügt daher eine Schätzung des Netto-Haushaltseinkommens.
                  </p>
                  <p className="mb-2 font-medium">Berechnung erfolgt durch:</p>
                  <ul className="list-disc list-inside space-y-1 text-s">
                    <li><strong>Abzüge (je 12%):</strong> Einkommensteuer, Krankenversicherung, Rentenversicherung</li>
                    <li><strong>Freibeträge:</strong> 102€ pro Einkommensart (Rente, Arbeitslosengeld, Unterhalt)</li>
                    <li><strong>Freibeträge:</strong> 1.230€ für Auslandseinkommen oder Pauschalversteuerung</li>
                    <li><strong>Abzugsfähige Ausgaben:</strong> Werbungskosten, Kinderbetreuungskosten, Unterhaltszahlungen</li>
                    <li><strong>Haushaltsfreibeträge:</strong> Pflegegrad, Behinderungsgrad, Ehepaar-Freibetrag</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-[#064497] hover:bg-[#0B66E6] text-white py-2 rounded mt-4 mb-3"
          >
            PRÜFEN
          </Button>
          
          <Button 
            onClick={() => navigate('/application-types', { replace: true })}
            className="w-full bg-[#D7DAEA] hover:bg-[#D7DAEA] text-black py-2 rounded focus:outline-none focus:ring-0 focus:ring-offset-0 shadow-md mb-12"
            style={{ outline: 'none' }}
          >
            ZURÜCK
          </Button>
        </Form>
      </Container>
      <div className="pb-4"></div>
    </div>
  );
};

export default InitialCheckPage;
