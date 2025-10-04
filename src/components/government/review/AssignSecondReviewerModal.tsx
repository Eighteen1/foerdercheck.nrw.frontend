import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner } from 'react-bootstrap';
import { supabase } from '../../../lib/supabase';

interface Agent {
  id: string;
  name: string;
  email: string;
}

interface AssignSecondReviewerModalProps {
  show: boolean;
  onHide: () => void;
  onAssign: (assignedAgentId: string) => Promise<void>;
  checklistItemTitle: string;
}

const AssignSecondReviewerModal: React.FC<AssignSecondReviewerModalProps> = ({
  show,
  onHide,
  onAssign,
  checklistItemTitle,
}) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show) {
      fetchAgents();
    }
  }, [show]);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('agents')
        .select('id, name, email')
        .neq('id', session.user.id);

      if (error) throw error;
      setAgents(data || []);
    } catch (err) {
      console.error('Error fetching agents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedAgent) return;

    try {
      setIsAssigning(true);
      await onAssign(selectedAgent);
      handleClose();
    } catch (error) {
      console.error('Error assigning second reviewer:', error);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleClose = () => {
    if (!isAssigning) {
      setSelectedAgent('');
      onHide();
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header>
        <Modal.Title>Zweiten Prüfer auswählen</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {isAssigning && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(255, 255, 255, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <Spinner animation="border" style={{ color: '#064497', marginBottom: 16 }} />
              <div style={{ color: '#064497' }}>Zweiter Prüfer wird zugewiesen...</div>
            </div>
          </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <strong>Checklistenpunkt:</strong>
          <div style={{ color: '#666', marginTop: 4 }}>{checklistItemTitle}</div>
        </div>
        <Form>
          <Form.Group>
            <Form.Label>Sachbearbeiter auswählen</Form.Label>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <Spinner animation="border" size="sm" style={{ color: '#064497' }} />
              </div>
            ) : (
              <Form.Select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                disabled={isAssigning}
              >
                <option value="">Sachbearbeiter auswählen...</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name || agent.email}
                  </option>
                ))}
              </Form.Select>
            )}
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={isAssigning}>
          Abbrechen
        </Button>
        <Button
          variant="primary"
          onClick={handleAssign}
          disabled={!selectedAgent || isAssigning}
          style={{ background: '#064497', border: 'none' }}
        >
          Zuweisen
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AssignSecondReviewerModal;

