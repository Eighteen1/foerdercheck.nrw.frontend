import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Button, Alert, Container, Spinner } from "react-bootstrap";
import { NRW_CITIES } from "../../utils/cityList";
import { supabase } from "../../lib/supabase"; // adjust import path as needed

const GovernmentLogin: React.FC = () => {
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // 1. Sign in with Supabase
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !data.user) {
      setError("Falsche Zugangsdaten.");
      setLoading(false);
      return;
    }

    // 2. Check city in user metadata (government account)
    const userCity = data.user.user_metadata?.city;
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
  };

  return (
    <div className="relative min-h-screen bg-white d-flex align-items-center justify-content-center">
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
            font-family: 'Roboto';
          }
        `}
      </style>
      <div className="blue-corner">
        <span className="blue-corner-text">FÖRDERCHECK.NRW</span>
      </div>
      <Container style={{ maxWidth: 400, zIndex: 3 }}>
        <h2 className="mb-4 text-center" style={{ color: "#064497", fontWeight: 700 }}>Stadtverwaltung Login</h2>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={handleLogin}>
          <Form.Group className="mb-3">
            <Form.Label>Stadt</Form.Label>
            <Form.Select value={city} onChange={e => setCity(e.target.value)} required>
              <option value="">Bitte wählen...</option>
              {NRW_CITIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>E-Mail</Form.Label>
            <Form.Control
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="username"
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
            />
          </Form.Group>
          <Button
            type="submit"
            style={{
              backgroundColor: "#064497",
              color: "#fff",
              border: "none",
              width: "100%",
              fontWeight: 500,
              fontSize: 18,
              padding: "10px 0",
              borderRadius: 8,
              boxShadow: "0 4px 8px rgba(0,0,0,0.15)"
            }}
            disabled={loading}
          >
            {loading ? <Spinner animation="border" size="sm" /> : "Anmelden"}
          </Button>
        </Form>
      </Container>
    </div>
  );
};

export default GovernmentLogin; 