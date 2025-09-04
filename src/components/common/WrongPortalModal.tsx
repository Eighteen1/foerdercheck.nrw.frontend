import React from 'react';
import { Modal, Button } from 'react-bootstrap';

interface WrongPortalModalProps {
  show: boolean;
  onHide: () => void;
  userType: 'agent' | 'resident';
  agentData?: {
    name: string | null;
    city: string | null;
    role: string | null;
  };
  onRedirect: () => void;
}

const WrongPortalModal: React.FC<WrongPortalModalProps> = ({
  show,
  onHide,
  userType,
  agentData,
  onRedirect
}) => {
  const isAgent = userType === 'agent';
  
  const getTitle = () => {
    if (isAgent) {
      return 'Falsches Portal - Sie sind als Sachbearbeiter angemeldet';
    }
    return 'Falsches Portal - Sie sind als Antragsteller angemeldet';
  };

  const getMessage = () => {
    if (isAgent) {
      const cityName = agentData?.city || 'Ihrer Stadt';
      const roleName = agentData?.role === 'admin' ? 'Administrator' : 
                      agentData?.role === 'owner' ? 'Eigentümer' : 'Sachbearbeiter';
      
      return `Sie sind derzeit als Sachbearbeiter einer Bewilligungsbehörde angemeldet. 
              Sie befinden sich im Portal für Antragsteller. 
              Möchten Sie zum Verwaltungsportal wechseln?`;
    }
    
    return 'Sie sind derzeit als Antragsteller angemeldet. Sie befinden sich im Verwaltungsportal. Möchten Sie zum Antragsteller-Portal wechseln?';
  };

  const getRedirectButtonText = () => {
    if (isAgent) {
      return 'Zum Verwaltungsportal';
    }
    return 'Zum Antragsteller-Portal';
  };

  const getRedirectUrl = () => {
    if (isAgent) {
      return '/government';
    }
    return '/';
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="text-[#064497]">
          {getTitle()}
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        <p className="mb-0">
          {getMessage()}
        </p>
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Hier bleiben
        </Button>
        <Button 
          variant="primary" 
          onClick={() => {
            onRedirect();
            onHide();
          }}
          style={{ backgroundColor: '#064497', borderColor: '#064497' }}
        >
          {getRedirectButtonText()}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default WrongPortalModal;
