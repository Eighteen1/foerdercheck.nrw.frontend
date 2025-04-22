import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const PasswordProtectionMiddleware: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isAdminAuthenticated = localStorage.getItem('isAdminAuthenticated') === 'true';

  // Allow access to the password protection page itself
  if (location.pathname === '/password-protection') {
    return <>{children}</>;
  }

  // If not authenticated, redirect to password protection
  if (!isAdminAuthenticated) {
    return <Navigate to="/password-protection" replace />;
  }

  // If authenticated, allow access to the requested page
  return <>{children}</>;
};

export default PasswordProtectionMiddleware; 