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

  // If initial check is required and user is not authenticated, redirect to initial check
  if (requireInitialCheck && !isAuthenticated) {
    return <Navigate to="/initial-check" replace state={{ from: location }} />;
  }

  // If user is authenticated and trying to access result page directly, redirect to personal space
  if (isAuthenticated && location.pathname === '/ic-results') {
    return <Navigate to="/personal-space" replace />;
  }

  // If user is authenticated and trying to access document pages directly, redirect to personal space
  if (isAuthenticated && (location.pathname === '/document-check' || location.pathname === '/document-upload')) {
    return <Navigate to="/personal-space" replace />;
  }

  return <>{children}</>;
};

export default RoutingProtection; 