import React from 'react';
import { Container } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';

interface FooterProps {
  onNavigate?: (path: string) => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path: string) => {
    if (onNavigate && location.pathname === '/document-check') {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  return (
    <footer className="bg-[#064497] text-white py-4 mt-auto">
      <Container>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">FÖRDERCHECK.NRW</h5>
            <p className="mb-0 small">© 2024 Alle Rechte vorbehalten</p>
          </div>
          <div className="d-flex gap-4">
            <a 
              href="https://www.fördercheck-nrw.com/impressum/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white text-decoration-none"
            >
              Impressum
            </a>
            <a 
              href="https://www.fördercheck-nrw.com/datenschutzerklarung/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white text-decoration-none"
            >
              Datenschutz
            </a>
            <a 
              href="https://www.fördercheck-nrw.com/kontakt/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white text-decoration-none"
            >
              Kontakt
            </a>
            <button
              onClick={() => handleNavigation('/persoenliche-daten')}
              className="text-white text-decoration-none border-0 bg-transparent p-0"
              style={{ cursor: 'pointer' }}
            >
              Persönliche Daten
            </button>
            <button
              onClick={() => handleNavigation('/government')}
              className="text-white text-decoration-none border-0 bg-transparent p-0"
              style={{ cursor: 'pointer' }}
            >
              Zum Verwaltungsportal
            </button>
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer; 