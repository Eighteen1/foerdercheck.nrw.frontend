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

  // Helper function to check if navigation is coming from within the app
  const isDirectAccess = () => !location.state?.from;

  // Handle document pages access
  if (location.pathname === '/document-check' || location.pathname === '/document-upload') {
    if (!isAuthenticated) {
      return <Navigate to="/" replace state={{ from: location }} />;
    }
    if (isDirectAccess()) {
      return <Navigate to="/personal-space" replace />;
    }
  }

  // Handle personal space access
  if (location.pathname === '/personal-space') {
    if (!isAuthenticated) {
      return <Navigate to="/" replace state={{ from: location }} />;
    }
  }

  // Handle result page access
  if (location.pathname === '/ic-results') {
    if (isAuthenticated) {
      // If authenticated, redirect to personal space unless coming from initial check
      if (location.state?.from !== 'initial-check') {
        return <Navigate to="/personal-space" replace state={{ 
          from: 'ic-results',
          ...location.state 
        }} />;
      }
    } else {
      // If not authenticated and direct access, redirect to initial check
      if (isDirectAccess()) {
        return <Navigate to="/initial-check" replace />;
      }
    }
  }

  // Handle authentication requirement for other protected routes
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

export default RoutingProtection; 