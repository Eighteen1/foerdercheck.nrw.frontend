import React, { useState } from 'react';
import { Container, Button, Alert } from 'react-bootstrap';

const MobileWarningPage: React.FC = () => {
  const [hasAccepted, setHasAccepted] = useState(false);

  const handleContinue = () => {
    // Store the user's choice to continue on mobile
    localStorage.setItem('mobileWarningAccepted', 'true');
    setHasAccepted(true);
    // Redirect to the main page
    window.location.href = '/';
  };

  const handleGoBack = () => {
    // Go back to previous page or close the tab
    window.history.back();
  };

  if (hasAccepted) {
    return null; // Component will unmount after redirect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Container className="max-w-lg">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          {/* Warning Icon */}
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg 
                className="w-8 h-8 text-yellow-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
                />
              </svg>
            </div>
          </div>

          {/* Warning Message */}
          <h2 className="text-2xl font-bold text-[#064497] mb-4">
            Mobile Gerät erkannt
          </h2>
          
          <div className="text-gray-700 mb-6 space-y-3">
            <p className="text-lg">
              Sie verwenden Fördercheck.NRW auf einem mobilen Gerät.
            </p>
            <p>
              <strong>Wir empfehlen dringend die Verwendung eines Computers oder Tablets</strong> für die optimale Nutzung der Anwendung.
            </p>
            <p className="text-sm text-gray-600">
              Die Anwendung ist für größere Bildschirme optimiert und bietet auf mobilen Geräten möglicherweise nicht die beste Benutzererfahrung.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              variant="primary"
              onClick={handleContinue}
              className="w-full bg-[#064497] border-0 py-3 text-lg font-medium"
            >
              Trotzdem fortfahren
            </Button>
            
            <Button
              variant="outline-secondary"
              onClick={handleGoBack}
              className="w-full py-2"
            >
              Zurück
            </Button>
          </div>

          {/* Additional Info */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Tipp:</strong> Für die beste Erfahrung verwenden Sie einen Desktop-Computer oder ein Tablet mit mindestens 10 Zoll Bildschirmdiagonale.
            </p>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default MobileWarningPage;
