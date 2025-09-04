import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const MobileDetectionMiddleware: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  
  // Check if user has already accepted the mobile warning
  const mobileWarningAccepted = localStorage.getItem('mobileWarningAccepted') === 'true';
  
  // Allow access to the mobile warning page itself
  if (location.pathname === '/mobile-warning') {
    return <>{children}</>;
  }

  // Function to detect if the device is a mobile phone (not tablet)
  const isMobilePhone = (): boolean => {
    // Check if user agent indicates mobile
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    
    // Common mobile phone user agent patterns
    const mobileRegex = /Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile.*Safari/i;
    
    // Check if it's a mobile device
    const isMobile = mobileRegex.test(userAgent);
    
    // Additional check: screen size to distinguish phones from tablets
    // Phones typically have width < 768px and height < 1024px
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const isSmallScreen = screenWidth < 768 || (screenWidth < 1024 && screenHeight < 1024);
    
    // Check for touch capability (mobile phones have touch)
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // It's a mobile phone if:
    // 1. User agent indicates mobile AND
    // 2. Screen is small (phone-sized) AND
    // 3. Has touch capability
    return isMobile && isSmallScreen && hasTouch;
  };

  // If it's a mobile phone and user hasn't accepted the warning, show warning
  if (isMobilePhone() && !mobileWarningAccepted) {
    return <Navigate to="/mobile-warning" replace />;
  }

  // If not a mobile phone or user has accepted warning, allow access
  return <>{children}</>;
};

export default MobileDetectionMiddleware;
