import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Container, Button } from 'react-bootstrap';

// Type definitions
type EligibilityResult = {
  eligible: boolean;
  group: string;
  reason: string;
  details: {
    adjustedGrossA: number;
    adjustedNetA: number;
    adjustedGrossB: number;
    adjustedNetB: number;
    childBonus: {
      grossA: number;
      netA: number;
      grossB: number;
      netB: number;
    };
  };
};

const ResultPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [eligibilityResult, setEligibilityResult] = useState<EligibilityResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkEligibility = async () => {
      try {
        const { 
          adultCount, 
          childCount, 
          isDisabled, 
          isMarried, 
          isRetired, 
          grossIncome, 
          netIncome 
        } = location.state || {};

        // Validate required data
        if (!adultCount || !childCount || grossIncome === undefined || netIncome === undefined) {
          throw new Error('Missing required form data');
        }

        // Parse income values (remove currency formatting and convert to number)
        const parsedGrossIncome = parseFloat(grossIncome.replace(/\./g, '').replace(',', '.'));
        const parsedNetIncome = parseFloat(netIncome.replace(/\./g, '').replace(',', '.'));

        if (isNaN(parsedGrossIncome) || isNaN(parsedNetIncome)) {
          throw new Error('Invalid income values');
        }

        const requestData = {
          adultCount: parseInt(adultCount),
          childCount: parseInt(childCount),
          isDisabled,
          isMarried,
          isRetired,
          grossIncome: parsedGrossIncome,
          netIncome: parsedNetIncome,
        };

        console.log('Sending request to backend:', requestData);

        const response = await fetch('https://foerdercheck-backend.onrender.com/api/check-eligibility', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(requestData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          console.error('Server response error:', {
            status: response.status,
            statusText: response.statusText,
            errorData
          });
          throw new Error(errorData?.detail || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Received response from backend:', result);
        setEligibilityResult(result);
      } catch (err) {
        console.error('Error checking eligibility:', err);
        setError(err instanceof Error ? err.message : 'An error occurred while checking eligibility');
      } finally {
        setLoading(false);
      }
    };

    checkEligibility();
  }, [location.state]);

  const handleProceedToPersonalSpace = () => {
    // If we have eligibility data, pass it to personal space
    const state = {
      from: 'ic-results',
      eligibilityData: eligibilityResult ? {
        adultCount: location.state.adultCount,
        childCount: location.state.childCount,
        isDisabled: location.state.isDisabled,
        isMarried: location.state.isMarried,
        isRetired: location.state.isRetired,
        grossIncome: location.state.grossIncome,
        netIncome: location.state.netIncome
      } : undefined
    };

    navigate('/personal-space', { state });
  };

  const blueCornerStyle = `
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
  `;

  if (loading) {
    return (
      <div className="relative min-h-screen bg-white">
        <div className="absolute top-[-170px] left-[-25%] w-[70%] h-[300px] bg-[#064497] rounded-[50%]"></div>
        <Container className="relative z-10 pt-40 px-4 text-center">
          <h2 className="mb-4 text-[#064497] font-['Roboto'] text-4xl">Laden...</h2>
        </Container>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative min-h-screen bg-white">
        <div className="absolute top-[-170px] left-[-25%] w-[70%] h-[300px] bg-[#064497] rounded-[50%]"></div>
        <Container className="relative z-10 pt-40 px-4 text-center">
          <h2 className="mb-4 text-red-600 font-['Roboto'] text-4xl">Fehler</h2>
          <p className="text-red-600">{error}</p>
          <p className="text-sm text-gray-600 mt-2">
            Bitte stellen Sie sicher, dass der Server läuft und versuchen Sie es erneut.
          </p>
          <Button 
            onClick={() => navigate('/')}
            className="mt-4 w-full bg-[#064497] hover:bg-[#0B66E6] text-white py-2 rounded"
          >
            Zurück zum Start
          </Button>
        </Container>
      </div>
    );
  }

  if (!eligibilityResult) {
    return (
      <div className="relative min-h-screen bg-white">
        <div className="absolute top-[-170px] left-[-25%] w-[70%] h-[300px] bg-[#064497] rounded-[50%]"></div>
        <Container className="relative z-10 pt-40 px-4 text-center">
          <h2 className="mb-4 text-[#064497] font-['Roboto'] text-4xl">Keine Ergebnisse verfügbar</h2>
          <Button 
            onClick={() => navigate('/')}
            className="mt-4 w-full bg-[#064497] hover:bg-[#0B66E6] text-white py-2 rounded"
          >
            Zurück zum Start
          </Button>
        </Container>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-white">
      <style>{blueCornerStyle}</style>
      <div className="blue-corner">
        <span className="blue-corner-text long">FÖRDERCHECK.NRW</span>
        <span className="blue-corner-text short">FC.NRW</span>
      </div>

      <Container className="relative z-10 pt-40 px-4 text-center">
        <h2 className="mb-4 text-[#064497] font-['Roboto'] text-4xl">
          {eligibilityResult.group}
        </h2>
        
        <div className={`p-4 rounded-lg mb-4 ${
          eligibilityResult.eligible 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          <p className="text-xl font-semibold mb-3">{eligibilityResult.reason}</p>
          
          <div className="mt-4 text-left">
            <p><strong>Einkommensgrenzen:</strong></p>
            <ul>
              <li>Brutto Grenze Gruppe A: {eligibilityResult.details.adjustedGrossA.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</li>
              <li>Netto Grenze Gruppe A: {eligibilityResult.details.adjustedNetA.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</li>
              <li>Brutto Grenze Gruppe B: {eligibilityResult.details.adjustedGrossB.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</li>
              <li>Netto Grenze Gruppe B: {eligibilityResult.details.adjustedNetB.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</li>
            </ul>
            
            <p className="mt-3"><strong>Ihre Eingaben:</strong></p>
            <ul>
              <li>Anzahl Erwachsene: {location.state.adultCount}</li>
              <li>Anzahl Kinder: {location.state.childCount}</li>
              <li>Bruttoeinkommen: {location.state.grossIncome}</li>
              <li>Nettoeinkommen: {location.state.netIncome}</li>
              {location.state.isMarried && <li>Verheiratet: Ja</li>}
              {location.state.isRetired && <li>Rentner: Ja</li>}
              {location.state.isDisabled && <li>Schwerbehindert: Ja</li>}
            </ul>
          </div>
        </div>

        <p className="text-gray-700 mb-4">
          Per Gesetz sind wir verpflichtet, jedem die Chance zu geben, einen vollständigen Antrag stellen zu lassen. 
          {!eligibilityResult.eligible && ` Basierend auf Ihrer Haushaltsgröße und dem angegebenen Einkommen besteht eine erhöhte Wahrscheinlichkeit, dass Ihr Antrag abgelehnt wird.`}
        </p>

        <div className="flex flex-col gap-3">
          <Button 
            onClick={handleProceedToPersonalSpace}
            className={`w-full py-2 rounded focus:outline-none focus:ring-0 focus:ring-offset-0 shadow-md ${
              eligibilityResult.eligible 
                ? 'bg-[#064497] hover:bg-[#0B66E6] text-white' 
                : 'bg-[#D7DAEA] hover:bg-[#D7DAEA] text-black'
            }`}
            style={{ outline: 'none' }}
          >
            Antrag fortfahren
          </Button>

          <Button 
            onClick={() => navigate('/initial-check')}
            className={`w-full py-2 rounded focus:outline-none focus:ring-0 focus:ring-offset-0 shadow-md mb-12 ${
              eligibilityResult.eligible 
                ? 'bg-[#D7DAEA] hover:bg-[#D7DAEA] text-black'
                : 'bg-[#064497] hover:bg-[#0B66E6] text-white'
            }`}
            style={{ outline: 'none' }}
          >
            Neue Prüfung starten
          </Button>
        </div>
      </Container>
      <div className="pb-8"></div>
    </div>
  );
};

export default ResultPage;