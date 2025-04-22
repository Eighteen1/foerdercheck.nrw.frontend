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

  // If authentication is required and user is not authenticated, redirect to landing page
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  // Handle document pages access
  if (location.pathname === '/document-check' || location.pathname === '/document-upload') {
    if (!isAuthenticated) {
      return <Navigate to="/" replace state={{ from: location }} />;
    }
    // If authenticated and accessing directly (no state), redirect to personal space
    if (!location.state?.from) {
      return <Navigate to="/personal-space" replace />;
    }
  }

  // Handle result page access
  if (location.pathname === '/ic-results') {
    // If authenticated, always redirect to personal space
    if (isAuthenticated) {
      return <Navigate to="/personal-space" replace state={{ 
        from: 'initial-check',
        ...location.state 
      }} />;
    }
    // If not authenticated and accessing directly (no state), redirect to initial check
    if (!location.state?.from) {
      return <Navigate to="/initial-check" replace />;
    }
  }

  return <>{children}</>;
};

export default RoutingProtection; 