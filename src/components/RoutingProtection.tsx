import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface RoutingProtectionProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
  requireInitialCheck?: boolean;
}

const RoutingProtection: React.FC<RoutingProtectionProps> = ({
  children,
  requireAuth = false,
  redirectTo = '/',
  requireInitialCheck = false
}) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  // Helper function to check if navigation is coming from within the app
  const isDirectAccess = () => !location.state?.from;

  // First, handle authentication requirements
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/" replace state={{ from: currentPath }} />;
  }

  // Handle specific routes based on authentication and navigation source
  switch (currentPath) {
    case '/document-check':
    case '/document-upload':
      if (!isAuthenticated) {
        return <Navigate to="/" replace state={{ from: currentPath }} />;
      }
      if (isDirectAccess()) {
        return <Navigate to="/personal-space" replace />;
      }
      break;

    case '/personal-space':
      if (!isAuthenticated && location.state?.from !== 'ic-results') {
        return <Navigate to="/" replace state={{ from: currentPath }} />;
      }
      break;

    case '/ic-results':
      if (isAuthenticated) {
        // Allow access if coming from initial check
        if (location.state?.from === 'initial-check') {
          break;
        }
        // Otherwise redirect to personal space
        return <Navigate to="/personal-space" replace state={{ 
          from: 'ic-results',
          ...location.state 
        }} />;
      } else {
        // If not authenticated and direct access, redirect to initial check
        if (isDirectAccess()) {
          return <Navigate to="/initial-check" replace />;
        }
      }
      break;
  }

  return <>{children}</>;
};

export default RoutingProtection; 