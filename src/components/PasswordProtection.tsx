import React, { useState } from 'react';
import { Container, Form, Button, Alert } from 'react-bootstrap';

const PasswordProtection: React.FC = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Get the admin password from environment variables
      const adminPassword = process.env.REACT_APP_ADMIN_PASSWORD;

      if (!adminPassword) {
        throw new Error('Admin password not configured');
      }

      if (adminPassword === password) {
        // Store the authentication in localStorage
        localStorage.setItem('isAdminAuthenticated', 'true');
        window.location.href = '/';
      } else {
        setError('Ungültiges Passwort');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Container className="max-w-md">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-center text-[#064497] mb-6">
            Passwortschutz
          </h2>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-4">
              <Form.Label>Passwort</Form.Label>
              <Form.Control
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Form.Group>

            {error && (
              <Alert variant="danger" className="mb-4">
                {error}
              </Alert>
            )}

            <Button
              variant="primary"
              type="submit"
              className="w-full bg-[#064497] border-0"
              disabled={isLoading}
            >
              {isLoading ? 'Wird überprüft...' : 'Zugang gewähren'}
            </Button>
          </Form>
        </div>
      </Container>
    </div>
  );
};

export default PasswordProtection; 