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
            <button 
              onClick={() => handleNavigation('/impressum')}
              className="text-white text-decoration-none bg-transparent border-0"
            >
              Impressum
            </button>
            <button 
              onClick={() => handleNavigation('/datenschutz')}
              className="text-white text-decoration-none bg-transparent border-0"
            >
              Datenschutz
            </button>
            <button 
              onClick={() => handleNavigation('/kontakt')}
              className="text-white text-decoration-none bg-transparent border-0"
            >
              Kontakt
            </button>
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer; 