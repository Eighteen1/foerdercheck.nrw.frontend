import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Form, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
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
    }
  };

  return (
    <div className="relative min-h-screen bg-white">
      {/* Bottom right quadrant of ellipse */}
      <div className="absolute top-[-170px] left-[-25%] w-[70%] h-[300px] bg-[#064497] rounded-[50%]"></div>

      {/* Main heading */}
      <div className="absolute top-12 start-9">
        <h1 className="display-6 fw-regular text-[#ffffff] mb-2 font-['Roboto']">
          FÖRDERCHECK.NRW
        </h1>
      </div>

      <Container className="relative z-10 pt-40 px-4">
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-6 text-center text-[#064497]">Anmelden</h2>
          
          {message && (
            <Alert variant={message.type === 'success' ? 'success' : 'danger'} className="mb-4">
              {message.text}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
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
              className="w-full bg-[#064497] hover:bg-[#0B66E6] text-white py-2 rounded"
            >
              Anmelden
            </Button>
          </Form>
        </div>
      </Container>
    </div>
  );
};

export default LoginPage; 