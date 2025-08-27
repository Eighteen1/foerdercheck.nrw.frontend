import React, { ReactNode, useEffect, useState } from 'react';
import { useAutoLogout } from '../../hooks/useAutoLogout';
import { useAutoLogoutContext } from '../../contexts/AutoLogoutContext';
import { supabase } from '../../lib/supabase';
import { getTokenInfo } from '../../utils/jwtUtils';

interface AutoLogoutWrapperProps {
  children: ReactNode;
}

export const AutoLogoutWrapper: React.FC<AutoLogoutWrapperProps> = ({ children }) => {
  const { settings } = useAutoLogoutContext();
  const [showTokenWarning, setShowTokenWarning] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<string>('');
  
  // Apply auto-logout logic
  useAutoLogout(settings);

  // Monitor for JWT token errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Check if the error is related to JWT token expiration
      if (event.error?.message?.includes('InvalidJWTToken') || 
          event.error?.message?.includes('JWT expired') ||
          event.message?.includes('InvalidJWTToken')) {
        
        console.debug('[AutoLogoutWrapper] JWT token error detected');
        setShowTokenWarning(true);
        
        // Auto-hide warning after 5 seconds
        setTimeout(() => {
          setShowTokenWarning(false);
        }, 5000);
      }
    };

    // Listen for unhandled promise rejections (which often contain JWT errors)
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('InvalidJWTToken') ||
          event.reason?.message?.includes('JWT expired')) {
        
        console.debug('[AutoLogoutWrapper] Unhandled JWT token rejection detected');
        setShowTokenWarning(true);
        
        // Auto-hide warning after 5 seconds
        setTimeout(() => {
          setShowTokenWarning(false);
        }, 5000);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Check current token status
  const checkCurrentTokenStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const tokenInfo = getTokenInfo(session.access_token);
        if (tokenInfo.valid) {
          setTokenStatus(`Token läuft ab in ${tokenInfo.formattedTime}`);
        } else {
          setTokenStatus('Token ungültig');
        }
      } else {
        setTokenStatus('Keine aktive Sitzung');
      }
    } catch (error) {
      setTokenStatus('Fehler beim Prüfen des Tokens');
    }
  };

  // Handle manual token refresh
  const handleRefreshToken = async () => {
    try {
      setShowTokenWarning(false);
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error || !data.session) {
        console.debug('[AutoLogoutWrapper] Token refresh failed, redirecting to login');
        window.location.href = '/government/login';
      } else {
        console.debug('[AutoLogoutWrapper] Token refreshed successfully');
        // Reload the page to ensure all components use the new token
        window.location.reload();
      }
    } catch (error) {
      console.error('[AutoLogoutWrapper] Error refreshing token:', error);
      window.location.href = '/government/login';
    }
  };

  // Check token status when warning is shown
  useEffect(() => {
    if (showTokenWarning) {
      checkCurrentTokenStatus();
    }
  }, [showTokenWarning]);

  return (
    <>
      {children}
      
      {/* JWT Token Warning Modal */}
      {showTokenWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Sitzungswarnung
                </h3>
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Ihr Sitzungstoken ist abgelaufen oder läuft bald ab. Sie können ihn aktualisieren, um weiterzuarbeiten, oder Sie werden automatisch abgemeldet.
              </p>
              {tokenStatus && (
                <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600">
                  <strong>Status:</strong> {tokenStatus}
                </div>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleRefreshToken}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sitzung erneuern
              </button>
              <button
                onClick={() => setShowTokenWarning(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
