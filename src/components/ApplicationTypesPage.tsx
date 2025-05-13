import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'react-bootstrap';

const ApplicationTypesPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100vw',
        background: '#fff',
        margin: 0,
        padding: 0,
        fontFamily: 'Roboto, Arial, sans-serif',
      }}
    >
      {/* Left Side: Title and Description */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-end',
          paddingRight: 48,
          paddingLeft: 0,
          paddingTop: 0,
          paddingBottom: 0,
        }}
      >
        <div style={{ maxWidth: 650 }}>
          <h2 className="display-4 fw-regular text-[#064497] mb-4 font-['Roboto']">
            Auswahl der Wohnraumförderung
          </h2>
          <p
            className="mb-4 fw-normal"
            style={{
              fontSize: 20,
              marginBottom: 24,
              color: '#222',
              fontFamily: 'Roboto, Arial, sans-serif',
            }}
          >
            Bei uns stehen Ihnen zwei unterschiedliche Wohnraumförderungen zur Auswahl. Bitte wählen Sie die Förderung, die zu Ihrer Situation passt.
          </p>
          <p
            className="fw-normal"
            style={{
              fontSize: 20,
              marginBottom: 0,
              color: '#222',
              fontFamily: 'Roboto, Arial, sans-serif',
            }}
          >
            Der Antrag zur Förderung von selbstgenutztem Wohneigentum richtet sich an Haushalte mit niedrigem bis mittlerem Einkommen, die Unterstützung bei der Finanzierung eines Eigenheims benötigen.
          </p>
          <p
            className="fw-normal"
            style={{
              fontSize: 20,
              fontStyle: 'italic',
              marginTop: 32,
              color: '#222',
              fontFamily: 'Roboto, Arial, sans-serif',
            }}
          >
            Der Antrag für Mietwohnungen und Gruppenwohnungen wird ab Juli 2025 verfügbar sein. Wir arbeiten intensiv daran, diese Förderung bereitzustellen, damit Sie in Zukunft Unterstützung bei der Schaffung von neuem Wohnraum beantragen können.
          </p>
        </div>
      </div>

      {/* Right Side: Two Equal Height Cards */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          minWidth: 420,
          maxWidth: 600,
        }}
      >
        {/* Top Card: Blue */}
        <div
          style={{
            flex: 1,
            background: '#064497',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            borderBottom: '4px solid #fff',
            fontFamily: 'Roboto, Arial, sans-serif',
          }}
        >
          <div
            className="fw-regular"
            style={{ fontSize: 30, marginBottom: 36, fontWeight: 300, fontFamily: 'Roboto, Arial, sans-serif', textAlign: 'center' }}
          >
            Selbst genutztes<br />Wohneigentum
          </div>
          <Button
            variant="light"
            size="lg"
            style={{
              color: '#20468A',
              background: '#fff',
              border: 'none',
              fontWeight: 500,
              minWidth: 220,
              fontSize: 18,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              fontFamily: 'Roboto, Arial, sans-serif',
            }}
            onClick={() => navigate('/initial-check')}
            className="fw-regular"
          >
            ANTRAG STARTEN
          </Button>
        </div>

        {/* Bottom Card: Light Gray */}
        <div
          style={{
            flex: 1,
            background: '#ECECEC',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#20468A',
            fontFamily: 'Roboto, Arial, sans-serif',
          }}
        >
          <div
            className="fw-regular"
            style={{ fontSize: 30, marginBottom: 36, fontWeight: 300, fontFamily: 'Roboto, Arial, sans-serif', textAlign: 'center' }}
          >
            Mietwohnungen und<br />Gruppenwohnungen
          </div>
          <Button
            variant="secondary"
            size="lg"
            disabled
            style={{
              background: '#B8C2D1',
              color: '#fff',
              border: 'none',
              minWidth: 220,
              fontSize: 18,
              fontWeight: 500,
              opacity: 1,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              fontFamily: 'Roboto, Arial, sans-serif',
            }}
            className="fw-regular"
          >
            ANTRAG STARTEN
          </Button>
          <div
            className="fw-normal"
            style={{ fontSize: 16, color: '#6B6B6B', marginTop: 22, fontFamily: 'Roboto, Arial, sans-serif' }}
          >
            Dieser Antrag steht Ihnen ab Juli 2025 zur Verfügung.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicationTypesPage;