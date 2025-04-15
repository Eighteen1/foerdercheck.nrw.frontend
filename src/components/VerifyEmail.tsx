import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Button } from 'react-bootstrap';

const VerifyEmail: React.FC = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Ungültiger Verifizierungslink.');
        return;
      }

      try {
        const response = await fetch(`http://localhost:8000/api/auth/verify/${token}`);
        const data = await response.json();
        
        if (response.ok) {
          setStatus('success');
          setMessage('Ihre E-Mail-Adresse wurde erfolgreich bestätigt.');
          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.detail || 'Ein Fehler ist aufgetreten.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
      }
    };

    verifyEmail();
  }, [token, navigate]);

  return (
    <div className="relative min-h-screen bg-white">
      <div className="absolute top-[-170px] left-[-25%] w-[70%] h-[300px] bg-[#064497] rounded-[50%]"></div>
      
      <Container className="relative z-10 pt-40 px-4 text-center">
        <h2 className="mb-4 text-[#064497] font-['Roboto'] text-4xl">
          {status === 'loading' && 'E-Mail wird bestätigt...'}
          {status === 'success' && 'E-Mail bestätigt'}
          {status === 'error' && 'Fehler bei der Bestätigung'}
        </h2>
        
        <p className="mb-4">{message}</p>

        {status === 'error' && (
          <Button 
            variant="primary" 
            onClick={() => navigate('/login')}
            className="mt-4"
          >
            Zurück zum Login
          </Button>
        )}
      </Container>
    </div>
  );
};

export default VerifyEmail; 