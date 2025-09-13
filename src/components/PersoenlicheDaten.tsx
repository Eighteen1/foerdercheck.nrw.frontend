import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Button, Alert, Modal, Spinner, Form } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const PersoenlicheDaten: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [applicationStatus, setApplicationStatus] = useState<string>('pending');
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isAgent, setIsAgent] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Check if user is an agent by looking at user metadata
    const checkUserRole = async () => {
      if (user?.user_metadata?.city) {
        setIsAgent(true);
        return;
      }
      setIsAgent(false);
    };

    // Fetch application status
    const fetchApplicationStatus = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('user_data')
          .select('application_status')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching application status:', error);
          return;
        }

        if (data?.application_status) {
          setApplicationStatus(data.application_status);
        }
      } catch (error) {
        console.error('Error in fetchApplicationStatus:', error);
      }
    };

    checkUserRole();
    fetchApplicationStatus();
  }, [isAuthenticated, user, navigate]);

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'LÖSCHEN') {
      setMessage({
        type: 'error',
        text: 'Bitte geben Sie "LÖSCHEN" ein, um die Löschung zu bestätigen.'
      });
      return;
    }

    if (applicationStatus !== 'pending') {
      setMessage({
        type: 'error',
        text: 'Ihr Antrag wurde bereits eingereicht und kann nicht gelöscht werden. Bitte kontaktieren Sie uns für weitere Unterstützung.'
      });
      return;
    }

    setIsLoading(true);
    try {
      if (!user?.id) throw new Error('Keine Benutzer-ID gefunden');

      // Get the current session to get the access token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error('Keine gültige Sitzung gefunden');
      }

      // Call the backend API to delete the user account
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'}/api/user/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Fehler beim Löschen des Kontos');
      }

      setMessage({
        type: 'success',
        text: 'Ihr Konto und alle zugehörigen Daten wurden erfolgreich gelöscht.'
      });

      // Logout and redirect after successful deletion
      setTimeout(() => {
        logout();
        if (isAgent) {
          navigate('/government');
        } else {
          navigate('/');
        }
      }, 2000);

    } catch (error) {
      console.error('Error deleting account:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Ein Fehler ist beim Löschen des Kontos aufgetreten. Bitte versuchen Sie es später erneut.'
      });
    } finally {
      setIsLoading(false);
      setShowDeleteModal(false);
      setDeleteConfirmation('');
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="relative min-h-screen bg-white">
      <style>
        {`
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

      {/* Loading Overlay */}
      {isLoading && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" 
             style={{ 
               backgroundColor: 'rgba(255, 255, 255, 0.9)', 
               zIndex: 9999 
             }}>
          <div className="text-center">
            <Spinner animation="border" role="status" style={{ width: '3rem', height: '3rem', color: '#064497' }}>
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <div className="mt-3" style={{ color: '#064497' }}>Bitte warten...</div>
          </div>
        </div>
      )}

      <div className="blue-corner">
        <span className="blue-corner-text long">FÖRDERCHECK.NRW</span>
        <span className="blue-corner-text short">FC.NRW</span>
      </div>

      <Container className="relative z-10 pt-40 px-4 pb-10">
        <div className="mx-auto bg-white p-6 rounded-lg shadow-sm" style={{ maxWidth: '100%' }}>
          <h2 className="text-2xl font-bold mb-5 text-center text-[#064497]" style={{ fontSize: '1.5rem', fontWeight: '600' }}>Persönliche Daten</h2>
          
          {message && (
            <Alert variant={message.type === 'success' ? 'success' : 'danger'} className="mb-4">
              {message.text}
            </Alert>
          )}

          {/* Agent Warning - Only show for agents */}
          {isAgent && (
            <div className="bg-warning bg-opacity-10 border border-warning border-opacity-25 rounded p-4 mb-4">
              <h6 className="text-warning fw-semibold mb-2">Hinweis</h6>
              <p className="text-muted mb-0">
                Als Sachbearbeiter haben Sie keinen Zugriff auf diese Funktionen. 
                Diese Seite ist nur für antragstellende Benutzer verfügbar.
              </p>
            </div>
          )}

          {/* Regular User Content - Only show for non-agents */}
          {!isAgent && (
            <>
              {/* Info Box */}
              <div className="bg-light border border-light rounded p-4 mb-4" style={{ backgroundColor: '#f8f9fa', borderColor: '#e9ecef' }}>
                <h6 className="text-dark fw-semibold mb-2" style={{ fontSize: '1.1rem' }}>Kontoverwaltung</h6>
                <p className="text-muted mb-0" style={{ lineHeight: '1.6' }}>
                     Hier können Sie Ihr Konto und alle zugehörigen Daten löschen. Diese Funktion ist nur für antragstellende Benutzer verfügbar, welche ihren Antrag noch nicht eingereicht haben. Ihre Daten werden gemäß unserer <a href="https://www.fördercheck-nrw.com/datenschutzerklarung/" target="_blank" rel="noopener noreferrer" className="text-primary text-decoration-underline">Datenschutzerklärung</a> verarbeitet. Sofern Sie Ihren Antrag bereits eingereicht haben, können Sie sich an ihre Bewilligungsbehörde bzw. Fördercheck.NRW wenden.
                </p>
              </div>

              {/* Account Information */}
              <div className="bg-white p-4 mb-4">
                <h6 className="text-dark fw-semibold mb-2" style={{ fontSize: '1.1rem' }}>Ihr Konto</h6>
                <p className="text-dark mb-2" style={{ lineHeight: '1.6' }}>
                  <strong>E-Mail:</strong> {user?.email}
                </p>
                <p className="text-dark mb-0" style={{ lineHeight: '1.6' }}>
                  <strong>Antragsstatus:</strong> {applicationStatus === 'pending' ? 'Ausstehend' : 'Eingereicht'}
                </p>
              </div>

              {/* Delete Account Section */}
              <div className=" p-4 mb-4" >
                <h6 className="text-dark fw-semibold mb-3" style={{ fontSize: '1.1rem' }}>Konto löschen</h6>
                
                {applicationStatus !== 'pending' ? (
                  <div className="mb-4">
                    <p className="text-muted mb-3" style={{ lineHeight: '1.6' }}>
                      <strong>Wichtiger Hinweis:</strong> Ihr Antrag wurde bereits eingereicht und befindet sich in Bearbeitung. 
                      Das Löschen Ihres Kontos ist zu diesem Zeitpunkt nicht möglich, da dies den Arbeitsablauf der Bewilligungsbehörden stören würde.
                    </p>
                    <p className="text-muted mb-0" style={{ lineHeight: '1.6' }}>
                      Bei Fragen oder Änderungswünschen kontaktieren Sie uns bitte direkt:
                      <br />
                      <strong>E-Mail:</strong>{' '}
                      <a 
                        href="mailto:kontakt@fördercheck-nrw.com" 
                        className="text-primary text-decoration-underline"
                      >
                        kontakt@foerdercheck-nrw.com
                      </a>
                    </p>
                  </div>
                ) : (
                  <div className="mb-4">
                    <p className="text-muted mb-3" style={{ lineHeight: '1.6' }}>
                      <strong>Achtung:</strong> Das Löschen Ihres Kontos ist eine unwiderrufliche Aktion. 
                      Alle Ihre Daten, einschließlich hochgeladener Dokumente, werden permanent gelöscht.
                    </p>
                    <p className="text-muted mb-0" style={{ lineHeight: '1.6' }}>
                      Diese Aktion kann nicht rückgängig gemacht werden.
                    </p>
                  </div>
                )}

                <Button
                  variant="danger"
                  onClick={() => setShowDeleteModal(true)}
                  disabled={applicationStatus !== 'pending'}
                  className="w-100"
                >
                  Konto löschen
                </Button>
              </div>
            </>
          )}

          {/* Navigation Buttons */}
          <div className="d-flex gap-3 mt-4">
          {!isAgent && (
            <Button
              onClick={() => navigate('/personal-space')}
              className="w-full py-2 rounded focus:outline-none focus:ring-0 focus:ring-offset-0 shadow-md bg-[#D7DAEA] hover:bg-[#D7DAEA] text-black"
            >
              Zurück zum Persönlichen Bereich
            </Button>
            )}
            <Button
              onClick={logout}
              className="w-full py-2 rounded focus:outline-none focus:ring-0 focus:ring-offset-0 shadow-md bg-[#064497] hover:bg-[#064497] text-whit"
            >
              Abmelden
            </Button>
          </div>
        </div>
      </Container>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header>
          <Modal.Title className="text-black">Konto Löschen</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-4">
            <p className="text-danger mb-3">
              <strong>Warnung:</strong> Diese Aktion kann nicht rückgängig gemacht werden!
            </p>
            <p className="mb-3">
              Folgende Daten werden permanent gelöscht:
            </p>
            <ul className="mb-3">
              <li>• Alle Ihre persönlichen Daten</li>
              <li>• Antragsformulare und Fortschritte</li>
              <li>• Hochgeladene Dokumente</li>
              <li>• Ihr Benutzerkonto</li>
            </ul>
            <p className="mb-3">
              Geben Sie <strong>LÖSCHEN</strong> ein, um die Aktion zu bestätigen:
            </p>
            <Form.Control
              type="text"
              value={deleteConfirmation}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeleteConfirmation(e.target.value)}
              placeholder="LÖSCHEN eingeben"
              className="form-control-lg"
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Abbrechen
          </Button>
          <Button 
            variant="danger" 
            onClick={handleDeleteAccount}
            disabled={deleteConfirmation !== 'LÖSCHEN' || isLoading}
          >
            {isLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Wird gelöscht...
              </>
            ) : (
              'Konto endgültig löschen'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default PersoenlicheDaten;
