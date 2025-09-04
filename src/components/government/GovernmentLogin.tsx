import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Button, Alert, Container, Spinner } from "react-bootstrap";
import { NRW_CITIES } from "../../utils/cityList";
import { supabase } from "../../lib/supabase";
import { checkUserType, UserTypeInfo } from "../../utils/userTypeChecker";
import WrongPortalModal from "../common/WrongPortalModal";

const GovernmentLogin: React.FC = () => {
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showMfaInput, setShowMfaInput] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [session, setSession] = useState<any>(null);
  const [userTypeInfo, setUserTypeInfo] = useState<UserTypeInfo | null>(null);
  const [showWrongPortalModal, setShowWrongPortalModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserTypeOnMount = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const userType = await checkUserType();
          setUserTypeInfo(userType);
          
          // If user is a resident, show the wrong portal modal
          if (userType.isResident) {
            setShowWrongPortalModal(true);
          }
        }
      } catch (error) {
        console.error('Error checking user type:', error);
      }
    };

    checkUserTypeOnMount();
  }, []);

  const handleRedirectToResident = () => {
    navigate('/');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Sign in with Supabase
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError("Falsche Zugangsdaten.");
        setLoading(false);
        return;
      }

      // 2. Check if MFA is required
      const { data: mfaData, error: factorsError } = await supabase.auth.mfa.listFactors();
      
      if (factorsError) throw factorsError;

      const hasMfa = mfaData?.totp?.length > 0;
      
      if (hasMfa) {
        // Store session and show MFA input
        setSession(data.session);
        setShowMfaInput(true);
        setLoading(false);
        return;
      }

      // If no MFA, proceed with normal login checks
      const userCity = data.user?.user_metadata?.city;
      if (!userCity) {
        setError("Dieses Konto ist kein Stadtverwaltungs-Account.");
        setLoading(false);
        return;
      }
      if (userCity !== city) {
        setError("Die ausgewählte Stadt stimmt nicht mit Ihrem Benutzerkonto überein.");
        setLoading(false);
        return;
      }

      // 3. Success: redirect to dashboard
      navigate("/government/dashboard");
    } catch (err) {
      setError("Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.");
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!session) {
        setError("Sitzung abgelaufen. Bitte melden Sie sich erneut an.");
        return;
      }

      // Get the TOTP factor
      const { data: mfaData, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;

      const totpFactor = mfaData?.totp?.[0];
      if (!totpFactor) {
        setError("Kein MFA-Faktor gefunden.");
        return;
      }

      // Challenge the factor
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id
      });

      if (challengeError) throw challengeError;

      // Verify the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code: mfaCode
      });

      if (verifyError) {
        setError("Ungültiger Code. Bitte versuchen Sie es erneut.");
        return;
      }

      // Success: redirect to dashboard
      navigate("/government/dashboard");
    } catch (err) {
      setError("Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.");
      console.error('MFA verification error:', err);
    } finally {
      setLoading(false);
    }
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
      {loading && (
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

      <Container className="relative z-10 pt-40 px-4">
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-6 text-center text-[#064497]">
            {showMfaInput ? "Zwei-Faktor-Authentifizierung" : "Verwaltungsportal Login"}
          </h2>
          
          {error && (
            <Alert variant="danger" className="mb-4">
              {error}
            </Alert>
          )}

          {!showMfaInput ? (
            <Form onSubmit={handleLogin}>
              <Form.Group className="mb-4">
                <Form.Label>Stadt / Kreis</Form.Label>
                <Form.Select 
                  value={city} 
                  onChange={e => setCity(e.target.value)} 
                  required
                  className="border-2"
                >
                  <option value="">Bitte wählen...</option>
                  {NRW_CITIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label>E-Mail-Adresse</Form.Label>
                <Form.Control
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  className="border-2"
                  placeholder="ihre@email.de"
                />
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label>Passwort</Form.Label>
                <Form.Control
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="border-2"
                />
              </Form.Group>

              <Button 
                type="submit" 
                className="w-full bg-[#064497] hover:bg-[#0B66E6] text-white py-2 rounded"
                disabled={loading}
              >
                Anmelden
              </Button>
            </Form>
          ) : (
            <Form onSubmit={handleMfaVerification}>
              <Form.Group className="mb-4">
                <Form.Label>Authentifizierungscode</Form.Label>
                <Form.Control
                  type="text"
                  value={mfaCode}
                  onChange={e => setMfaCode(e.target.value)}
                  required
                  className="border-2"
                  placeholder="Code aus Ihrer Authenticator-App"
                  autoComplete="one-time-code"
                />
              </Form.Group>

              <div className="d-flex flex-column gap-2">
                <Button 
                  type="submit" 
                  className="w-full bg-[#064497] hover:bg-[#0B66E6] text-white py-2 rounded"
                  disabled={loading}
                >
                  Verifizieren
                </Button>
                <Button 
                  type="button" 
                  variant="outline-secondary"
                  className="w-full"
                  onClick={() => {
                    setShowMfaInput(false);
                    setSession(null);
                    setMfaCode("");
                  }}
                  disabled={loading}
                >
                  Zurück
                </Button>
              </div>
            </Form>
          )}
        </div>
      </Container>

      {/* Wrong Portal Modal */}
      <WrongPortalModal
        show={showWrongPortalModal}
        onHide={() => setShowWrongPortalModal(false)}
        userType="resident"
        onRedirect={handleRedirectToResident}
      />
    </div>
  );
};

export default GovernmentLogin; 