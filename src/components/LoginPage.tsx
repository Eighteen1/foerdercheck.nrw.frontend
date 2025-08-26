import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    
    try {
      // Check if user exists first
      const checkUserResponse = await fetch('https://foerdercheck-backend.onrender.com/api/user/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!checkUserResponse.ok) {
        throw new Error('Fehler beim Überprüfen des Kontos');
      }

      const checkUserData = await checkUserResponse.json();
      
      if (!checkUserData.exists) {
        setMessage({
          type: 'error',
          text: 'Kein Konto mit dieser E-Mail-Adresse gefunden. Bitte erstellen Sie zuerst ein Konto.'
        });
        setIsLoading(false);
        return;
      }

      // User exists, proceed with login
      await login(email);
      setMessage({
        type: 'success',
        text: 'Ein Login-Link wurde an Ihre E-Mail-Adresse gesendet. Bitte überprüfen Sie Ihren Posteingang.'
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    
    try {
      // Check if user already exists
      const checkUserResponse = await fetch('https://foerdercheck-backend.onrender.com/api/user/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!checkUserResponse.ok) {
        throw new Error('Fehler beim Überprüfen des Kontos');
      }

      const checkUserData = await checkUserResponse.json();
      
      if (checkUserData.exists) {
        setMessage({
          type: 'error',
          text: 'Ein Konto mit dieser E-Mail-Adresse existiert bereits. Bitte melden Sie sich an oder verwenden Sie eine andere E-Mail-Adresse.'
        });
        setIsLoading(false);
        return;
      }

      // Create user through backend
      const createUserResponse = await fetch('https://foerdercheck-backend.onrender.com/api/user/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          firstName, 
          lastName 
        }),
      });

      if (!createUserResponse.ok) {
        const errorData = await createUserResponse.json();
        // If it's a duplicate user error, show the specific message
        if (createUserResponse.status === 409) {
          setMessage({
            type: 'error',
            text: errorData.detail || 'Ein Konto mit dieser E-Mail-Adresse existiert bereits. Bitte melden Sie sich an oder verwenden Sie eine andere E-Mail-Adresse.'
          });
          setIsLoading(false);
          return;
        }
        throw new Error(errorData.detail || errorData.message || 'Fehler beim Erstellen des Kontos');
      }

      const { user } = await createUserResponse.json();
      
      if (user?.id) {
        // Store user data in user_data table
        const storeUserDataResponse = await fetch('https://foerdercheck-backend.onrender.com/api/user/store-user-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            email,
            firstName,
            lastName
          }),
        });

        if (!storeUserDataResponse.ok) {
          const errorData = await storeUserDataResponse.json();
          throw new Error(errorData.message || 'Fehler beim Speichern der Benutzerdaten');
        }
      }
      
      setMessage({
        type: 'success',
        text: 'Ihr Konto wurde erfolgreich erstellt! Eine Bestätigungs-E-Mail wurde an Ihre E-Mail-Adresse gesendet. Bitte überprüfen Sie Ihren Posteingang oder Spam-Ordner und bestätigen Sie Ihre E-Mail-Adresse.'
      });
      
      // Reset form
      setFirstName('');
      setLastName('');
      setEmail('');
      
      // Switch back to login view after successful signup
      /*setTimeout(() => {
        setIsLoginView(true);
        setMessage(null);
      }, 3000);*/
      
    } catch (error) {
      console.error('Error during signup:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const switchToSignup = () => {
    setIsLoginView(false);
    setMessage(null);
    setEmail('');
  };

  const switchToLogin = () => {
    setIsLoginView(true);
    setMessage(null);
    setFirstName('');
    setLastName('');
    setEmail('');
  };

  const navigateToApplicationTypes = () => {
    navigate('/application-types');
  };

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

      <Container className="relative z-10 pt-32 px-4 pb-10">
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-6 text-center text-[#064497]">
            {isLoginView ? 'Anmelden' : 'Konto erstellen'}
          </h2>
          
          {message && (
            <Alert variant={message.type === 'success' ? 'success' : 'danger'} className="mb-4">
              {message.text}
            </Alert>
          )}

          {isLoginView ? (
            // Login Form
            <Form onSubmit={handleLoginSubmit}>
              <Form.Group className="mb-4">
                <Form.Label>E-Mail-Adresse</Form.Label>
                <Form.Control
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ihre@email.de"
                  required
                  className="border-2"
                />
              </Form.Group>

              <Button 
                type="submit" 
                className="w-100 bg-[#064497] hover:bg-[#0B66E6] text-white py-2 rounded mb-3"
                disabled={isLoading}
              >
                Anmelden
              </Button>

              <Button 
                type="button"
                className="w-100 bg-[#D7DAEA] hover:bg-[#D7DAEA] text-black py-2 rounded"
                onClick={switchToSignup}
              >
                Konto erstellen
              </Button>
            </Form>
          ) : (
            // Signup Form
            <>
              <div className="mb-4 p-3 bg-light rounded">
                <p className="mb-2 small text-muted">
                  <strong>Info:</strong> Aktuell ist nur der Antrag zur Förderung von selbstgenutztem Wohneigentum verfügbar.
                </p>
                <p className="mb-2 small text-muted">
                  Sie können auch eine Vorab-Chancen-Prüfung durchführen, bevor Sie sich registrieren.
                </p>
                <Button 
                  variant="link" 
                  className="p-0 text-decoration-none"
                  onClick={navigateToApplicationTypes}
                  style={{ color: '#064497' }}
                >
                  Zur Chancen-Prüfung →
                </Button>
              </div>

              <Form onSubmit={handleSignupSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Vorname</Form.Label>
                  <Form.Control
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ihr Vorname"
                    required
                    className="border-2"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Nachname</Form.Label>
                  <Form.Control
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ihr Nachname"
                    required
                    className="border-2"
                  />
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>E-Mail-Adresse</Form.Label>
                  <Form.Control
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ihre@email.de"
                    required
                    className="border-2"
                  />
                </Form.Group>

                <Button 
                  type="submit" 
                  className="w-100 bg-[#064497] hover:bg-[#0B66E6] text-white py-2 rounded mb-3"
                  disabled={isLoading}
                >
                  Konto erstellen
                </Button>

                <Button 
                  type="button"
                  className="w-100 bg-[#D7DAEA] hover:bg-[#D7DAEA] text-black py-2 rounded"
                  onClick={switchToLogin}
                >
                  Zurück zum Login
                </Button>
              </Form>
            </>
          )}
        </div>
      </Container>
    </div>
  );
};

export default LoginPage; 