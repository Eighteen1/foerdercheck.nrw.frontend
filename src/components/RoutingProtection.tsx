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
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  // Check if we're in development environment
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Block government users (with city metadata) from resident pages
  if (user && user.user_metadata?.city && !isDevelopment) {
    return <Navigate to="/government/login" replace />;
  }

  console.log('RoutingProtection Debug:', {
    currentPath,
    isAuthenticated,
    isLoading,
    locationState: location.state,
    requireAuth,
    redirectTo,
    isDevelopment
  });

  // Show loading state while auth is being initialized
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#064497] mb-4">Laden...</h2>
          <p className="text-gray-600">Bitte warten Sie einen Moment.</p>
        </div>
      </div>
    );
  }

  // Helper function to check if navigation is coming from within the app
  const isDirectAccess = () => !location.state?.from;

  // First, handle authentication requirements
  if (requireAuth && !isAuthenticated && !isDevelopment) {
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
    case '/hauptantrag':
    case '/einkommenserklaerung':
    case '/selbstauskunft':
    case '/wofiv':
    case '/din277':
      if (!isAuthenticated && !isDevelopment) {
        console.log('Redirecting from protected pages - not authenticated');
        return <Navigate to="/" replace state={{ from: currentPath }} />;
      }
      // Allow navigation between protected pages
      if (isDirectAccess() && !location.state?.from?.includes('document-') && !location.state?.from?.includes('hauptantrag') && !location.state?.from?.includes('einkommenserklaerung') && !location.state?.from?.includes('selbstauskunft') && !location.state?.from?.includes('wofiv') && !location.state?.from?.includes('din277') && !isDevelopment) {
        console.log('Redirecting from protected pages - direct access');
        return <Navigate to="/personal-space" replace />;
      }
      break;

    case '/personal-space':
      console.log('Personal space access check:', {
        isAuthenticated,
        from: location.state?.from,
        isDirectAccess: isDirectAccess()
      });
      if (!isAuthenticated && location.state?.from !== 'ic-results' && !isDevelopment) {
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
        if (isDirectAccess() && !isDevelopment) {
          console.log('Redirecting from IC Results to initial check - direct access');
          return <Navigate to="/initial-check" replace />;
        }
      }
      break;
  }

  return <>{children}</>;
};

export default RoutingProtection; 