import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Create a context to track unsaved changes across components
export const UnsavedChangesContext = React.createContext<{
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
}>({
  hasUnsavedChanges: false,
  setHasUnsavedChanges: () => {}
});

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
  
  // Check for unsaved changes in localStorage as a fallback
  const checkForUnsavedChanges = () => {
    try {
      console.log('*** checkForUnsavedChanges called ***');
      console.log('*** Current path:', currentPath, '***');
      console.log('*** Checking localStorage for hauptantragFormData... ***');
      
      const hauptantragData = localStorage.getItem('hauptantragFormData');
      console.log('*** Raw localStorage data:', hauptantragData, '***');
      console.log('*** Found data in localStorage:', !!hauptantragData, '***');
      
      if (hauptantragData) {
        const parsed = JSON.parse(hauptantragData);
        console.log('*** Parsed data:', parsed, '***');
        
        // Check if there are any non-empty fields that indicate unsaved changes
        const hasChanges = Object.values(parsed).some(step => 
          step && typeof step === 'object' && 
          Object.values(step).some(value => 
            value && typeof value === 'string' && value.trim() !== ''
          )
        );
        
        console.log('*** Has changes detected:', hasChanges, '***');
        return hasChanges;
      }
      console.log('*** No localStorage data found ***');
      return false;
    } catch (error) {
      console.error('*** Error checking for unsaved changes:', error, '***');
      return false;
    }
  };
  
  // Enhanced check that also considers sessionStorage flags
  const hasUnsavedChangesOnHauptantrag = () => {
    console.log('*** hasUnsavedChangesOnHauptantrag called for path:', currentPath, '***');
    
    // Only check for unsaved changes if we're on the hauptantrag page
    if (currentPath !== '/hauptantrag') {
      console.log('*** NOT ON HAUPTANTRAG PAGE - SKIPPING UNSAVED CHANGES CHECK ***');
      return false;
    }
    
    // First check if we have a sessionStorage flag indicating unsaved changes
    const hasUnsavedFlag = sessionStorage.getItem('hauptantrag_has_unsaved_changes');
    console.log('*** SESSIONSTORAGE FLAG:', hasUnsavedFlag, '***');
    
    if (hasUnsavedFlag === 'true') {
      console.log('*** UNSAVED CHANGES FLAG DETECTED IN SESSIONSTORAGE ***');
      return true;
    }
    
    // Fallback to localStorage check
    const localStorageResult = checkForUnsavedChanges();
    console.log('*** LOCALSTORAGE FALLBACK RESULT:', localStorageResult, '***');
    return localStorageResult;
  };

  // Enhanced check for einkommenserklaerung page
  const hasUnsavedChangesOnEinkommenserklaerung = () => {
    console.log('*** hasUnsavedChangesOnEinkommenserklaerung called for path:', currentPath, '***');
    
    // Only check for unsaved changes if we're on the einkommenserklaerung page
    if (currentPath !== '/einkommenserklaerung') {
      console.log('*** NOT ON EINKOMMENSERKLAERUNG PAGE - SKIPPING UNSAVED CHANGES CHECK ***');
      return false;
    }
    
    // Check if we have a sessionStorage flag indicating unsaved changes
    const hasUnsavedFlag = sessionStorage.getItem('einkommenserklaerung_has_unsaved_changes');
    console.log('*** EINKOMMENSERKLAERUNG SESSIONSTORAGE FLAG:', hasUnsavedFlag, '***');
    
    if (hasUnsavedFlag === 'true') {
      console.log('*** EINKOMMENSERKLAERUNG UNSAVED CHANGES FLAG DETECTED IN SESSIONSTORAGE ***');
      return true;
    }
    
    return false;
  };

  // Enhanced check for selbstauskunft page
  const hasUnsavedChangesOnSelbstauskunft = () => {
    console.log('*** hasUnsavedChangesOnSelbstauskunft called for path:', currentPath, '***');
    
    // Only check for unsaved changes if we're on the selbstauskunft page
    if (currentPath !== '/selbstauskunft') {
      console.log('*** NOT ON SELBSTAUSKUNFT PAGE - SKIPPING UNSAVED CHANGES CHECK ***');
      return false;
    }
    
    // Check if we have a sessionStorage flag indicating unsaved changes
    const hasUnsavedFlag = sessionStorage.getItem('selbstauskunft_has_unsaved_changes');
    console.log('*** SELBSTAUSKUNFT SESSIONSTORAGE FLAG:', hasUnsavedFlag, '***');
    
    if (hasUnsavedFlag === 'true') {
      console.log('*** SELBSTAUSKUNFT UNSAVED CHANGES FLAG DETECTED IN SESSIONSTORAGE ***');
      return true;
    }
    
    return false;
  };

  // Enhanced check for haushaltsauskunft page
  const hasUnsavedChangesOnHaushaltsauskunft = () => {
    console.log('*** hasUnsavedChangesOnHaushaltsauskunft called for path:', currentPath, '***');
    
    // Only check for unsaved changes if we're on the haushaltsauskunft page
    if (currentPath !== '/haushaltsauskunft') {
      console.log('*** NOT ON HAUSHALTSAUSKUNFT PAGE - SKIPPING UNSAVED CHANGES CHECK ***');
      return false;
    }
    
    // Check if we have a sessionStorage flag indicating unsaved changes
    const hasUnsavedFlag = sessionStorage.getItem('haushaltsauskunft_has_unsaved_changes');
    console.log('*** HAUSHALTSAUSKUNFT SESSIONSTORAGE FLAG:', hasUnsavedFlag, '***');
    
    if (hasUnsavedFlag === 'true') {
      console.log('*** HAUSHALTSAUSKUNFT UNSAVED CHANGES FLAG DETECTED IN SESSIONSTORAGE ***');
      return true;
    }
    
    return false;
  };

  // Enhanced check for selbsthilfe page
  const hasUnsavedChangesOnSelbsthilfe = () => {
    console.log('*** hasUnsavedChangesOnSelbsthilfe called for path:', currentPath, '***');
    
    // Only check for unsaved changes if we're on the selbsthilfe page
    if (currentPath !== '/selbsthilfe') {
      console.log('*** NOT ON SELBSTHILFE PAGE - SKIPPING UNSAVED CHANGES CHECK ***');
      return false;
    }
    
    // Check if we have a sessionStorage flag indicating unsaved changes
    const hasUnsavedFlag = sessionStorage.getItem('selbsthilfe_has_unsaved_changes');
    console.log('*** SELBSTHILFE SESSIONSTORAGE FLAG:', hasUnsavedFlag, '***');
    
    if (hasUnsavedFlag === 'true') {
      console.log('*** SELBSTHILFE UNSAVED CHANGES FLAG DETECTED IN SESSIONSTORAGE ***');
      return true;
    }
    
    return false;
  };

  // Enhanced check for wofiv page
  const hasUnsavedChangesOnWofiv = () => {
    console.log('*** hasUnsavedChangesOnWofiv called for path:', currentPath, '***');
    
    // Only check for unsaved changes if we're on the wofiv page
    if (currentPath !== '/wofiv') {
      console.log('*** NOT ON WOFIV PAGE - SKIPPING UNSAVED CHANGES CHECK ***');
      return false;
    }
    
    // Check if we have a sessionStorage flag indicating unsaved changes
    const hasUnsavedFlag = sessionStorage.getItem('wofiv_has_unsaved_changes');
    console.log('*** WOFIV SESSIONSTORAGE FLAG:', hasUnsavedFlag, '***');
    
    if (hasUnsavedFlag === 'true') {
      console.log('*** WOFIV UNSAVED CHANGES FLAG DETECTED IN SESSIONSTORAGE ***');
      return true;
    }
    
    return false;
  };

  // Enhanced check for din277 page
  const hasUnsavedChangesOnDin277 = () => {
    console.log('*** hasUnsavedChangesOnDin277 called for path:', currentPath, '***');
    
    // Only check for unsaved changes if we're on the din277 page
    if (currentPath !== '/din277') {
      console.log('*** NOT ON DIN277 PAGE - SKIPPING UNSAVED CHANGES CHECK ***');
      return false;
    }
    
    // Check if we have a sessionStorage flag indicating unsaved changes
    const hasUnsavedFlag = sessionStorage.getItem('din277_has_unsaved_changes');
    console.log('*** DIN277 SESSIONSTORAGE FLAG:', hasUnsavedFlag, '***');
    
    if (hasUnsavedFlag === 'true') {
      console.log('*** DIN277 UNSAVED CHANGES FLAG DETECTED IN SESSIONSTORAGE ***');
      return true;
    }
    
    return false;
  };

  // Global navigation guard for unsaved changes
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only check for unsaved changes if we're on the hauptantrag page
      if (window.location.pathname === '/hauptantrag') {
        const hasUnsavedChanges = hasUnsavedChangesOnHauptantrag();
        if (hasUnsavedChanges) {
          e.preventDefault();
          e.returnValue = 'Sie haben ungespeicherte Änderungen. Sind Sie sicher, dass Sie die Seite verlassen möchten?';
          return 'Sie haben ungespeicherte Änderungen. Sind Sie sicher, dass Sie die Seite verlassen möchten?';
        }
      }
    };
    


    // Note: Popstate handling is now done at the component level for hauptantrag
    // to prevent conflicts with routing protection
    console.log('*** ROUTING PROTECTION: POPSTATE HANDLING DISABLED - HANDLED BY COMPONENTS ***');

    // Note: Popstate handling is now done at the component level for hauptantrag
    // to prevent conflicts with routing protection
    console.log('*** ROUTING PROTECTION: POPSTATE HANDLING DISABLED - HANDLED BY COMPONENTS ***');
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
  
  // Clean up hauptantrag navigation flag when leaving the page
  React.useEffect(() => {
    if (currentPath !== '/hauptantrag') {
      sessionStorage.removeItem('hauptantrag_valid_navigation');
      console.log('*** CLEANING UP HAUPTANTRAG NAVIGATION FLAG ***');
    }
    
    // Clean up einkommenserklaerung navigation flag when leaving the page
    if (currentPath !== '/einkommenserklaerung') {
      sessionStorage.removeItem('einkommenserklaerung_valid_navigation');
      console.log('*** CLEANING UP EINKOMMENSERKLAERUNG NAVIGATION FLAG ***');
    }
    
    // Clean up selbstauskunft navigation flag when leaving the page
    if (currentPath !== '/selbstauskunft') {
      sessionStorage.removeItem('selbstauskunft_valid_navigation');
      console.log('*** CLEANING UP SELBSTAUSKUNFT NAVIGATION FLAG ***');
    }
    
    // Clean up haushaltsauskunft navigation flag when leaving the page
    if (currentPath !== '/haushaltsauskunft') {
      sessionStorage.removeItem('haushaltsauskunft_valid_navigation');
      console.log('*** CLEANING UP HAUSHALTSAUSKUNFT NAVIGATION FLAG ***');
    }
    
    // Clean up selbsthilfe navigation flag when leaving the page
    if (currentPath !== '/selbsthilfe') {
      sessionStorage.removeItem('selbsthilfe_valid_navigation');
      console.log('*** CLEANING UP SELBSTHILFE NAVIGATION FLAG ***');
    }
    
    // Clean up wofiv navigation flag when leaving the page
    if (currentPath !== '/wofiv') {
      sessionStorage.removeItem('wofiv_valid_navigation');
      console.log('*** CLEANING UP WOFIV NAVIGATION FLAG ***');
    }
    
    // Clean up din277 navigation flag when leaving the page
    if (currentPath !== '/din277') {
      sessionStorage.removeItem('din277_valid_navigation');
      console.log('*** CLEANING UP DIN277 NAVIGATION FLAG ***');
    }
  }, [currentPath]);

  // Check if we're in development environment
  const isDevelopment = process.env.NODE_ENV === 'development';
  //const isDevelopment = false;
  // Block government users (with city metadata) from resident pages
  if (user && user.user_metadata?.city && !isDevelopment) {
    // If government user is trying to access the government landing page, redirect to dashboard
    if (currentPath === '/government') {
      return <Navigate to="/government/dashboard" replace />;
    }
    // For other resident pages, redirect to government login
    if (!currentPath.startsWith('/government')) {
      return <Navigate to="/government/login" replace />;
    }
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
  const isDirectAccess = () => {
    console.log('*** isDirectAccess called for path:', currentPath, '***');
    console.log('*** Location state:', location.state, '***');
    
    // If there's a from state, it's not direct access
    if (location.state?.from) {
      console.log('*** Has from state - NOT direct access ***');
      return false;
    }
    
    // Special case for hauptantrag: if user has unsaved changes and we're on hauptantrag page,
    // treat this as valid navigation (not direct access) to prevent redirect loops
    if (currentPath === '/hauptantrag') {
      console.log('*** Checking hauptantrag special case ***');
      const hasUnsavedChanges = hasUnsavedChangesOnHauptantrag();
      const hasValidNavigationFlag = sessionStorage.getItem('hauptantrag_valid_navigation');
      
      console.log('*** HAUPTANTRAG SPECIAL CASE - hasUnsavedChanges:', hasUnsavedChanges, 'hasValidNavigationFlag:', hasValidNavigationFlag, '***');
      
      if (hasUnsavedChanges && hasValidNavigationFlag) {
        console.log('*** HAUPTANTRAG: TREATING AS VALID NAVIGATION DUE TO UNSAVED CHANGES ***');
        return false; // Not direct access
      }
    }
    
    // Special case for einkommenserklaerung: if user has unsaved changes and we're on einkommenserklaerung page,
    // treat this as valid navigation (not direct access) to prevent redirect loops
    if (currentPath === '/einkommenserklaerung') {
      console.log('*** Checking einkommenserklaerung special case ***');
      const hasUnsavedChanges = hasUnsavedChangesOnEinkommenserklaerung();
      const hasValidNavigationFlag = sessionStorage.getItem('einkommenserklaerung_valid_navigation');
      
      console.log('*** EINKOMMENSERKLAERUNG SPECIAL CASE - hasUnsavedChanges:', hasUnsavedChanges, 'hasValidNavigationFlag:', hasValidNavigationFlag, '***');
      
      if (hasUnsavedChanges && hasValidNavigationFlag) {
        console.log('*** EINKOMMENSERKLAERUNG: TREATING AS VALID NAVIGATION DUE TO UNSAVED CHANGES ***');
        return false; // Not direct access
      }
    }
    
    // Special case for selbstauskunft: if user has unsaved changes and we're on selbstauskunft page,
    // treat this as valid navigation (not direct access) to prevent redirect loops
    if (currentPath === '/selbstauskunft') {
      console.log('*** Checking selbstauskunft special case ***');
      const hasUnsavedChanges = hasUnsavedChangesOnSelbstauskunft();
      const hasValidNavigationFlag = sessionStorage.getItem('selbstauskunft_valid_navigation');
      
      console.log('*** SELBSTAUSKUNFT SPECIAL CASE - hasUnsavedChanges:', hasUnsavedChanges, 'hasValidNavigationFlag:', hasValidNavigationFlag, '***');
      
      if (hasUnsavedChanges && hasValidNavigationFlag) {
        console.log('*** SELBSTAUSKUNFT: TREATING AS VALID NAVIGATION DUE TO UNSAVED CHANGES ***');
        return false; // Not direct access
      }
    }
    
    // Special case for haushaltsauskunft: if user has unsaved changes and we're on haushaltsauskunft page,
    // treat this as valid navigation (not direct access) to prevent redirect loops
    if (currentPath === '/haushaltsauskunft') {
      console.log('*** Checking haushaltsauskunft special case ***');
      const hasUnsavedChanges = hasUnsavedChangesOnHaushaltsauskunft();
      const hasValidNavigationFlag = sessionStorage.getItem('haushaltsauskunft_valid_navigation');
      
      console.log('*** HAUSHALTSAUSKUNFT SPECIAL CASE - hasUnsavedChanges:', hasUnsavedChanges, 'hasValidNavigationFlag:', hasValidNavigationFlag, '***');
      
      if (hasUnsavedChanges && hasValidNavigationFlag) {
        console.log('*** HAUSHALTSAUSKUNFT: TREATING AS VALID NAVIGATION DUE TO UNSAVED CHANGES ***');
        return false; // Not direct access
      }
    }
    
    // Special case for selbsthilfe: if user has unsaved changes and we're on selbsthilfe page,
    // treat this as valid navigation (not direct access) to prevent redirect loops
    if (currentPath === '/selbsthilfe') {
      console.log('*** Checking selbsthilfe special case ***');
      const hasUnsavedChanges = hasUnsavedChangesOnSelbsthilfe();
      const hasValidNavigationFlag = sessionStorage.getItem('selbsthilfe_valid_navigation');
      
      console.log('*** SELBSTHILFE SPECIAL CASE - hasUnsavedChanges:', hasUnsavedChanges, 'hasValidNavigationFlag:', hasValidNavigationFlag, '***');
      
      if (hasUnsavedChanges && hasValidNavigationFlag) {
        console.log('*** SELBSTHILFE: TREATING AS VALID NAVIGATION DUE TO UNSAVED CHANGES ***');
        return false; // Not direct access
      }
    }
    
    // Special case for wofiv: if user has unsaved changes and we're on wofiv page,
    // treat this as valid navigation (not direct access) to prevent redirect loops
    if (currentPath === '/wofiv') {
      console.log('*** Checking wofiv special case ***');
      const hasUnsavedChanges = hasUnsavedChangesOnWofiv();
      const hasValidNavigationFlag = sessionStorage.getItem('wofiv_valid_navigation');
      
      console.log('*** WOFIV SPECIAL CASE - hasUnsavedChanges:', hasUnsavedChanges, 'hasValidNavigationFlag:', hasValidNavigationFlag, '***');
      
      if (hasUnsavedChanges && hasValidNavigationFlag) {
        console.log('*** WOFIV: TREATING AS VALID NAVIGATION DUE TO UNSAVED CHANGES ***');
        return false; // Not direct access
      }
    }
    
    // Special case for din277: if user has unsaved changes and we're on din277 page,
    // treat this as valid navigation (not direct access) to prevent redirect loops
    if (currentPath === '/din277') {
      console.log('*** Checking din277 special case ***');
      const hasUnsavedChanges = hasUnsavedChangesOnDin277();
      const hasValidNavigationFlag = sessionStorage.getItem('din277_valid_navigation');
      
      console.log('*** DIN277 SPECIAL CASE - hasUnsavedChanges:', hasUnsavedChanges, 'hasValidNavigationFlag:', hasValidNavigationFlag, '***');
      
      if (hasUnsavedChanges && hasValidNavigationFlag) {
        console.log('*** DIN277: TREATING AS VALID NAVIGATION DUE TO UNSAVED CHANGES ***');
        return false; // Not direct access
      }
    }
    
    console.log('*** IS direct access ***');
    return true; // Direct access
  };

  // First, handle authentication requirements
  if (requireAuth && !isAuthenticated && !isDevelopment) {
    console.log('Redirecting due to auth requirement:', {
      requireAuth,
      isAuthenticated,
      currentPath
    });
    return <Navigate to="/" replace state={{ from: currentPath }} />;
  }

  // Special handling for government dashboard
  if (currentPath === '/government/dashboard') {
    console.log('Government dashboard access check:', {
      isAuthenticated,
      userMetadata: user?.user_metadata,
      hasCity: !!user?.user_metadata?.city,
      from: location.state?.from
    });
    
    // Only allow access if user has city metadata (government user) or in development
    if (!user?.user_metadata?.city && !isDevelopment) {
      console.log('Redirecting from dashboard - not a government user');
      return <Navigate to="/government/login" replace state={{ from: currentPath }} />;
    }
  }

  // Handle specific routes based on authentication and navigation source
  switch (currentPath) {
    case '/government/dashboard':
      console.log('Government dashboard switch case:', {
        isAuthenticated,
        from: location.state?.from,
        isDirectAccess: isDirectAccess(),
        currentPath,
        locationState: location.state
      });
      
      // Allow navigation from government messages page
      const dashboardFromPage = location.state?.from;
      if (dashboardFromPage === '/government/messages') {
        console.log('Allowing navigation from government messages to dashboard');
        break;
      }
      
      // Allow direct access to government dashboard for government users
      if (user?.user_metadata?.city || isDevelopment) {
        console.log('Allowing government dashboard access');
        break;
      }
      
      // Redirect non-government users
      console.log('Redirecting non-government user from dashboard');
      return <Navigate to="/government/login" replace state={{ from: currentPath }} />;

    case '/document-check':
    case '/document-upload':
    case '/hauptantrag':
    case '/einkommenserklaerung':
    case '/selbstauskunft':
    case '/wofiv':
    case '/din277':
    case '/selbsthilfe':
    case '/haushaltsauskunft':
    case '/view-application':
    case '/validation':
      console.log(`${currentPath} access check:`, {
        isAuthenticated,
        from: location.state?.from,
        isDirectAccess: isDirectAccess(),
        currentPath,
        locationState: location.state
      });
      if (!isAuthenticated && !isDevelopment) {
        console.log(`Redirecting from ${currentPath} - not authenticated`);
        return <Navigate to="/" replace state={{ from: currentPath }} />;
      }
      
      // Define allowed navigation sources for each page
      const allowedSources = {
        '/document-upload': ['document-check', 'wofiv', 'din277', 'selbsthilfe', 'hauptantrag', 'einkommenserklaerung', 'selbstauskunft', 'haushaltsauskunft', 'personal-space'],
        '/document-check': ['personal-space'],
        '/hauptantrag': ['document-upload', 'personal-space', 'validation'],
        '/einkommenserklaerung': ['document-upload', 'personal-space', 'validation'],
        '/selbstauskunft': ['document-upload', 'personal-space', 'validation'],
        '/wofiv': ['document-upload', 'personal-space', 'validation'],
        '/din277': ['document-upload', 'personal-space', 'validation'],
        '/selbsthilfe': ['document-upload', 'personal-space', 'validation'],
        '/haushaltsauskunft': ['document-upload', 'personal-space', 'validation'],
        '/view-application': ['personal-space'],
        '/validation': ['personal-space'] // Requires secure token parameter for access
      };
      
      // Check if navigation is from an allowed source
      const fromPage = location.state?.from;
      const allowedForCurrentPage = allowedSources[currentPath as keyof typeof allowedSources] || [];
      
      console.log(`${currentPath} routing check:`, {
        fromPage,
        allowedForCurrentPage,
        isAllowed: fromPage && allowedForCurrentPage.includes(fromPage),
        isDirectAccess: isDirectAccess()
      });
      
      // Allow navigation if coming from an allowed source or if in development
      if (fromPage && allowedForCurrentPage.includes(fromPage)) {
        console.log(`Allowing navigation to ${currentPath} from ${fromPage}`);
        
        // Set navigation flag for hauptantrag to prevent redirect loops
        if (currentPath === '/hauptantrag') {
          const navigationKey = `hauptantrag_navigation_${Date.now()}`;
          sessionStorage.setItem('hauptantrag_valid_navigation', navigationKey);
          console.log('*** SETTING HAUPTANTRAG NAVIGATION FLAG ***');
        }
        
        // Set navigation flag for einkommenserklaerung to prevent redirect loops
        if (currentPath === '/einkommenserklaerung') {
          const navigationKey = `einkommenserklaerung_navigation_${Date.now()}`;
          sessionStorage.setItem('einkommenserklaerung_valid_navigation', navigationKey);
          console.log('*** SETTING EINKOMMENSERKLAERUNG NAVIGATION FLAG ***');
        }
        
        // Set navigation flag for selbstauskunft to prevent redirect loops
        if (currentPath === '/selbstauskunft') {
          const navigationKey = `selbstauskunft_navigation_${Date.now()}`;
          sessionStorage.setItem('selbstauskunft_valid_navigation', navigationKey);
          console.log('*** SETTING SELBSTAUSKUNFT NAVIGATION FLAG ***');
        }
        
        // Set navigation flag for haushaltsauskunft to prevent redirect loops
        if (currentPath === '/haushaltsauskunft') {
          const navigationKey = `haushaltsauskunft_navigation_${Date.now()}`;
          sessionStorage.setItem('haushaltsauskunft_valid_navigation', navigationKey);
          console.log('*** SETTING HAUSHALTSAUSKUNFT NAVIGATION FLAG ***');
        }
        
        // Set navigation flag for selbsthilfe to prevent redirect loops
        if (currentPath === '/selbsthilfe') {
          const navigationKey = `selbsthilfe_navigation_${Date.now()}`;
          sessionStorage.setItem('selbsthilfe_valid_navigation', navigationKey);
          console.log('*** SETTING SELBSTHILFE NAVIGATION FLAG ***');
        }
        
        // Set navigation flag for wofiv to prevent redirect loops
        if (currentPath === '/wofiv') {
          const navigationKey = `wofiv_navigation_${Date.now()}`;
          sessionStorage.setItem('wofiv_valid_navigation', navigationKey);
          console.log('*** SETTING WOFIV NAVIGATION FLAG ***');
        }
        
        // Set navigation flag for din277 to prevent redirect loops
        if (currentPath === '/din277') {
          const navigationKey = `din277_navigation_${Date.now()}`;
          sessionStorage.setItem('din277_valid_navigation', navigationKey);
          console.log('*** SETTING DIN277 NAVIGATION FLAG ***');
        }
        
        break;
      }
      
      // Special case for validation page: allow access if secure token parameter is present
      if (currentPath === '/validation' && isDirectAccess()) {
        const urlParams = new URLSearchParams(location.search);
        if (urlParams.has('token')) {
          console.log('Allowing validation page access - opened with secure token parameter');
          break;
        }
      }
      
      // Special handling for hauptantrag: check for unsaved changes before blocking direct access
      if (currentPath === '/hauptantrag' && isDirectAccess() && !isDevelopment) {
        console.log('*** HAUPTANTRAG DIRECT ACCESS - CHECKING FOR UNSAVED CHANGES ***');
        const hasUnsavedChanges = hasUnsavedChangesOnHauptantrag();
        console.log('*** UNSAVED CHANGES RESULT:', hasUnsavedChanges, '***');
        
        if (hasUnsavedChanges) {
          console.log('*** UNSAVED CHANGES FOUND - ALLOWING ACCESS TO HAUPTANTRAG ***');
          // If there are unsaved changes, allow access to hauptantrag
          // This prevents the redirect loop when user cancels navigation
          
          // Set navigation flag to prevent future redirect loops
          const navigationKey = `hauptantrag_navigation_${Date.now()}`;
          sessionStorage.setItem('hauptantrag_valid_navigation', navigationKey);
          console.log('*** SETTING HAUPTANTRAG NAVIGATION FLAG FOR UNSAVED CHANGES ***');
          
          break;
        } else {
          console.log('*** NO UNSAVED CHANGES - WILL REDIRECT ***');
        }
      }
      
      // Special handling for einkommenserklaerung: check for unsaved changes before blocking direct access
      if (currentPath === '/einkommenserklaerung' && isDirectAccess() && !isDevelopment) {
        console.log('*** EINKOMMENSERKLAERUNG DIRECT ACCESS - CHECKING FOR UNSAVED CHANGES ***');
        const hasUnsavedChanges = hasUnsavedChangesOnEinkommenserklaerung();
        console.log('*** UNSAVED CHANGES RESULT:', hasUnsavedChanges, '***');
        
        if (hasUnsavedChanges) {
          console.log('*** UNSAVED CHANGES FOUND - ALLOWING ACCESS TO EINKOMMENSERKLAERUNG ***');
          // If there are unsaved changes, allow access to einkommenserklaerung
          // This prevents the redirect loop when user cancels navigation
          
          // Set navigation flag to prevent future redirect loops
          const navigationKey = `einkommenserklaerung_navigation_${Date.now()}`;
          sessionStorage.setItem('einkommenserklaerung_valid_navigation', navigationKey);
          console.log('*** SETTING EINKOMMENSERKLAERUNG NAVIGATION FLAG FOR UNSAVED CHANGES ***');
          
          break;
        } else {
          console.log('*** NO UNSAVED CHANGES - WILL REDIRECT ***');
        }
      }
      
      // Special handling for selbstauskunft: check for unsaved changes before blocking direct access
      if (currentPath === '/selbstauskunft' && isDirectAccess() && !isDevelopment) {
        console.log('*** SELBSTAUSKUNFT DIRECT ACCESS - CHECKING FOR UNSAVED CHANGES ***');
        const hasUnsavedChanges = hasUnsavedChangesOnSelbstauskunft();
        console.log('*** UNSAVED CHANGES RESULT:', hasUnsavedChanges, '***');
        
        if (hasUnsavedChanges) {
          console.log('*** UNSAVED CHANGES FOUND - ALLOWING ACCESS TO SELBSTAUSKUNFT ***');
          // If there are unsaved changes, allow access to selbstauskunft
          // This prevents the redirect loop when user cancels navigation
          
          // Set navigation flag to prevent future redirect loops
          const navigationKey = `selbstauskunft_navigation_${Date.now()}`;
          sessionStorage.setItem('selbstauskunft_valid_navigation', navigationKey);
          console.log('*** SETTING SELBSTAUSKUNFT NAVIGATION FLAG FOR UNSAVED CHANGES ***');
          
          break;
        } else {
          console.log('*** NO UNSAVED CHANGES - WILL REDIRECT ***');
        }
      }
      
      // Special handling for haushaltsauskunft: check for unsaved changes before blocking direct access
      if (currentPath === '/haushaltsauskunft' && isDirectAccess() && !isDevelopment) {
        console.log('*** HAUSHALTSAUSKUNFT DIRECT ACCESS - CHECKING FOR UNSAVED CHANGES ***');
        const hasUnsavedChanges = hasUnsavedChangesOnHaushaltsauskunft();
        console.log('*** UNSAVED CHANGES RESULT:', hasUnsavedChanges, '***');
        
        if (hasUnsavedChanges) {
          console.log('*** UNSAVED CHANGES FOUND - ALLOWING ACCESS TO HAUSHALTSAUSKUNFT ***');
          // If there are unsaved changes, allow access to haushaltsauskunft
          // This prevents the redirect loop when user cancels navigation
          
          // Set navigation flag to prevent future redirect loops
          const navigationKey = `haushaltsauskunft_navigation_${Date.now()}`;
          sessionStorage.setItem('haushaltsauskunft_valid_navigation', navigationKey);
          console.log('*** SETTING HAUSHALTSAUSKUNFT NAVIGATION FLAG FOR UNSAVED CHANGES ***');
          
          break;
        } else {
          console.log('*** NO UNSAVED CHANGES - WILL REDIRECT ***');
        }
      }
      
      // Special handling for selbsthilfe: check for unsaved changes before blocking direct access
      if (currentPath === '/selbsthilfe' && isDirectAccess() && !isDevelopment) {
        console.log('*** SELBSTHILFE DIRECT ACCESS - CHECKING FOR UNSAVED CHANGES ***');
        const hasUnsavedChanges = hasUnsavedChangesOnSelbsthilfe();
        console.log('*** UNSAVED CHANGES RESULT:', hasUnsavedChanges, '***');
        
        if (hasUnsavedChanges) {
          console.log('*** UNSAVED CHANGES FOUND - ALLOWING ACCESS TO SELBSTHILFE ***');
          // If there are unsaved changes, allow access to selbsthilfe
          // This prevents the redirect loop when user cancels navigation
          
          // Set navigation flag to prevent future redirect loops
          const navigationKey = `selbsthilfe_navigation_${Date.now()}`;
          sessionStorage.setItem('selbsthilfe_valid_navigation', navigationKey);
          console.log('*** SETTING SELBSTHILFE NAVIGATION FLAG FOR UNSAVED CHANGES ***');
          
          break;
        } else {
          console.log('*** NO UNSAVED CHANGES - WILL REDIRECT ***');
        }
      }
      
      // Special handling for wofiv: check for unsaved changes before blocking direct access
      if (currentPath === '/wofiv' && isDirectAccess() && !isDevelopment) {
        console.log('*** WOFIV DIRECT ACCESS - CHECKING FOR UNSAVED CHANGES ***');
        const hasUnsavedChanges = hasUnsavedChangesOnWofiv();
        console.log('*** UNSAVED CHANGES RESULT:', hasUnsavedChanges, '***');
        
        if (hasUnsavedChanges) {
          console.log('*** UNSAVED CHANGES FOUND - ALLOWING ACCESS TO WOFIV ***');
          // If there are unsaved changes, allow access to wofiv
          // This prevents the redirect loop when user cancels navigation
          
          // Set navigation flag to prevent future redirect loops
          const navigationKey = `wofiv_navigation_${Date.now()}`;
          sessionStorage.setItem('wofiv_valid_navigation', navigationKey);
          console.log('*** SETTING WOFIV NAVIGATION FLAG FOR UNSAVED CHANGES ***');
          
          break;
        } else {
          console.log('*** NO UNSAVED CHANGES - WILL REDIRECT ***');
        }
      }
      
      // Special handling for din277: check for unsaved changes before blocking direct access
      if (currentPath === '/din277' && isDirectAccess() && !isDevelopment) {
        console.log('*** DIN277 DIRECT ACCESS - CHECKING FOR UNSAVED CHANGES ***');
        const hasUnsavedChanges = hasUnsavedChangesOnDin277();
        console.log('*** UNSAVED CHANGES RESULT:', hasUnsavedChanges, '***');
        
        if (hasUnsavedChanges) {
          console.log('*** UNSAVED CHANGES FOUND - ALLOWING ACCESS TO DIN277 ***');
          // If there are unsaved changes, allow access to din277
          // This prevents the redirect loop when user cancels navigation
          
          // Set navigation flag to prevent future redirect loops
          const navigationKey = `din277_navigation_${Date.now()}`;
          sessionStorage.setItem('din277_valid_navigation', navigationKey);
          console.log('*** SETTING DIN277 NAVIGATION FLAG FOR UNSAVED CHANGES ***');
          
          break;
        } else {
          console.log('*** NO UNSAVED CHANGES - WILL REDIRECT ***');
        }
      }
      

      
      // Block direct access to protected pages (except in development)
      if (isDirectAccess() && !isDevelopment) {
        console.log('=== DIRECT ACCESS BLOCKED - REDIRECTING TO PERSONAL SPACE ===');
        console.log(`*** FINAL REDIRECT: ${currentPath} -> personal-space ***`);
        return <Navigate to="/personal-space" replace state={{ from: currentPath }} />;
      }
      
      // Temporary bypass for view-application in development
      if (currentPath === '/view-application' && isDevelopment) {
        console.log('Development mode: allowing direct access to view-application');
        break;
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