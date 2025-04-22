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

  console.log('RoutingProtection Debug:', {
    currentPath,
    isAuthenticated,
    locationState: location.state,
    requireAuth,
    redirectTo
  });

  // Helper function to check if navigation is coming from within the app
  const isDirectAccess = () => !location.state?.from;

  // First, handle authentication requirements
  if (requireAuth && !isAuthenticated) {
    console.log('Redirecting due to auth requirement:', {
      requireAuth,
      isAuthenticated,
      currentPath
    });
    return <Navigate to="/" replace state={{ from: currentPath }} />;
  }

  // Handle specific routes based on authentication and navigation source
  switch (currentPath) {
    case '/document-check':
    case '/document-upload':
      if (!isAuthenticated) {
        console.log('Redirecting from document pages - not authenticated');
        return <Navigate to="/" replace state={{ from: currentPath }} />;
      }
      if (isDirectAccess()) {
        console.log('Redirecting from document pages - direct access');
        return <Navigate to="/personal-space" replace />;
      }
      break;

    case '/personal-space':
      console.log('Personal space access check:', {
        isAuthenticated,
        from: location.state?.from,
        isDirectAccess: isDirectAccess()
      });
      if (!isAuthenticated && location.state?.from !== 'ic-results') {
        console.log('Redirecting from personal space - not authenticated and not from results');
        return <Navigate to="/" replace state={{ from: currentPath }} />;
      }
      break;

    case '/ic-results':
      console.log('IC Results access check:', {
        isAuthenticated,
        from: location.state?.from
      });
      if (isAuthenticated) {
        // Allow access if coming from initial check
        if (location.state?.from === 'initial-check') {
          break;
        }
        // Otherwise redirect to personal space
        console.log('Redirecting from IC Results to personal space - authenticated');
        return <Navigate to="/personal-space" replace state={{ 
          from: 'ic-results',
          ...location.state 
        }} />;
      } else {
        // If not authenticated and direct access, redirect to initial check
        if (isDirectAccess()) {
          console.log('Redirecting from IC Results to initial check - direct access');
          return <Navigate to="/initial-check" replace />;
        }
      }
      break;
  }

  return <>{children}</>;
};

export default RoutingProtection; 