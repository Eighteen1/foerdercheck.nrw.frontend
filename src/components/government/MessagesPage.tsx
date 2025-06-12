import React, { useState, useEffect } from 'react';
import { Table, Button, Badge, Spinner, Alert, Modal } from 'react-bootstrap';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Message {
  id: string;
  recipient_id: string;
  sender_id: string | null;
  type: 'system' | 'team';
  category: string;
  title: string;
  content: string;
  is_read: boolean;
  created_at: string;
  metadata: any;
  sender?: {
    name: string | null;
    email: string;
  };
}

const MessagesPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [activeType, setActiveType] = useState<'system' | 'team'>('team');

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('No user session');

      const { data, error } = await supabase
        .from('messages')
        .select(`*, sender:sender_id(name, email)`)
        .eq('recipient_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      setError('Fehler beim Laden der Nachrichten');
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev => prev.map(msg =>
        msg.id === messageId ? { ...msg, is_read: true } : msg
      ));
    } catch (err) {
      setError('Fehler beim Aktualisieren der Nachricht');
      console.error('Error marking message as read:', err);
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      setSuccess('Nachricht erfolgreich gelöscht');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Fehler beim Löschen der Nachricht');
      console.error('Error deleting message:', err);
    }
  };

  const handleMessageClick = (message: Message) => {
    setSelectedMessage(message);
    setShowModal(true);
    if (!message.is_read) {
      handleMarkAsRead(message.id);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedMessage(null);
  };

  const getMessageStatus = (message: Message) => {
    return (
      <div style={{
        width: 14,
        height: 14,
        borderRadius: '50%',
        background: message.is_read ? '#6c757d' : '#2196f3',
        display: 'inline-block',
        verticalAlign: 'middle',
      }} />
    );
  };

  // Filter messages by activeType
  const filteredMessages = messages.filter(m => m.type === activeType);
  const newCountTeam = messages.filter(m => m.type === 'team' && !m.is_read).length;
  const newCountSystem = messages.filter(m => m.type === 'system' && !m.is_read).length;

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '200px' }}>
        <Spinner animation="border" style={{ color: '#064497' }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" onClose={() => setSuccess(null)} dismissible>
          {success}
        </Alert>
      )}

      {/* Top switch buttons */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <button
          className={`tab-switch-btn${activeType === 'team' ? ' selected' : ''}`}
          onClick={() => setActiveType('team')}
        >
          Team Nachrichten <span style={{ color: '#2196f3', fontWeight: 500, fontSize: 22, marginLeft: 8 }}>{newCountTeam}</span>
        </button>
        <button
          className={`tab-switch-btn${activeType === 'system' ? ' selected' : ''}`}
          onClick={() => setActiveType('system')}
        >
          System Nachrichten <span style={{ color: '#2196f3', fontWeight: 500, fontSize: 22, marginLeft: 8 }}>{newCountSystem}</span>
        </button>
      </div>

      <p style={{ marginBottom: 16, color: '#666', marginTop: 16 }}>
        Wählen Sie eine Nachricht aus, um den vollständigen Inhalt anzuzeigen. Ungelesene Nachrichten sind blau markiert.
      </p>

      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 32 }}>
        <div style={{ overflowX: 'auto' }}>
          <Table hover responsive className="align-middle">
            <thead style={{ background: '#F7F8FA' }}>
              <tr>
                <th style={{ width: 50, textAlign: 'center' }}>Status</th>
                <th>Datum</th>
                <th>Betreff</th>
                <th>Absender</th>
                <th style={{ width: 50, textAlign: 'center' }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {filteredMessages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-5">
                    <Alert variant="secondary" className="mb-0">Keine Nachrichten vorhanden</Alert>
                  </td>
                </tr>
              ) : (
                filteredMessages.map((message) => (
                  <tr 
                    key={message.id}
                    onClick={() => handleMessageClick(message)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                      {getMessageStatus(message)}
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>
                      {format(new Date(message.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>{message.title}</td>
                    <td style={{ verticalAlign: 'middle' }}>
                      {message.type === 'system'
                        ? 'System'
                        : message.sender?.name
                          ? `${message.sender.name} (${message.sender.email})`
                          : message.sender?.email || '-'}
                    </td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(message.id);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#d32f2f',
                          cursor: 'pointer',
                          padding: 8,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                        title="Löschen"
                      >
                        <span className="material-icons" style={{ fontSize: 20 }}>delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </div>

      {/* Message Detail Modal */}
      <Modal show={showModal} onHide={handleCloseModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{selectedMessage?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: 8 }}>
              Von: {selectedMessage?.type === 'system'
                ? 'System'
                : selectedMessage?.sender?.name
                  ? `${selectedMessage.sender.name} (${selectedMessage.sender.email})`
                  : selectedMessage?.sender?.email || '-'}
            </div>
            <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: 16 }}>
              Datum: {selectedMessage?.created_at ? format(new Date(selectedMessage.created_at), 'dd.MM.yyyy HH:mm', { locale: de }) : '-'}
            </div>
            <div style={{ whiteSpace: 'pre-wrap' }}>
              {selectedMessage?.content}
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            style={{
              backgroundColor: '#d32f2f',
              color: 'white',
              border: 'none'
            }}
            onClick={() => {
              if (selectedMessage) {
                handleDelete(selectedMessage.id);
                handleCloseModal();
              }
            }}
          >
            Löschen
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default MessagesPage; 