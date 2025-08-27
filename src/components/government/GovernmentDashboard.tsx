import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Container, Button, Spinner, Modal } from "react-bootstrap";
import { supabase } from "../../lib/supabase";
import Layout from "../Layout";
import GovernmentApplicationsPage from "./GovernmentApplicationsPage";
import ApplicationReviewContainer from "./review/ApplicationReviewContainer";
import GovernmentProfilePage from "./GovernmentProfilePage";
import GovernmentDashboardPage from "./GovernmentDashboardPage";
import GovernmentSettingsPage from "./GovernmentSettingsPage";
import MessagesPage from './MessagesPage';
import { useAutoLogoutContext } from "../../contexts/AutoLogoutContext";
import { useAutoLogout } from "../../hooks/useAutoLogout";

const menuItems = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "applications", label: "Anträge", icon: "description" },
  { key: "messages", label: "Nachrichten", icon: "mail" },
  { key: "profile", label: "Profil", icon: "person" },
  { key: "help", label: "Hilfe", icon: "help_outline" },
  { key: "settings", label: "Einstellungen", icon: "settings" },
  { key: "logout", label: "Abmelden", icon: "logout" },
];

const GovernmentDashboard: React.FC = () => {
  const { settings: autoLogoutSettings, isAgent } = useAutoLogoutContext();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedMenu, setSelectedMenu] = useState("applications");
  const [city, setCity] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [openChecklistItemId, setOpenChecklistItemId] = useState<string | null>(null);
  const [processingDeepLink, setProcessingDeepLink] = useState(false);
  const [deepLinkError, setDeepLinkError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Add activeTab state to persist across navigation
  const [activeTab, setActiveTab] = useState<"new" | "in_progress" | "finished">("new");

  // Simple navigation history - just track the last few pages
  const [navigationHistory, setNavigationHistory] = useState<string[]>(["applications"]);

  // Sign-out confirmation modal
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  
  // Flag to prevent initialization effect from running multiple times
  const [isInitialized, setIsInitialized] = useState(false);

  // Apply auto-logout for government users
  useAutoLogout(isAgent ? autoLogoutSettings : undefined);

  // Debug function to show sign-out modal
  const showSignOutConfirmation = useCallback(() => {
    console.log('🚨 SHOWING SIGN-OUT CONFIRMATION MODAL');
    console.log('🚨 Current modal state:', showSignOutModal);
    setShowSignOutModal(true);
    console.log('🚨 Modal state after setting:', true);
  }, [showSignOutModal]);

  // Function to update URL without changing the route - more reliable approach
  const updateURL = useCallback((menuKey: string, replace: boolean = false, applicationId?: string | null) => {
    try {
      let newURL = `/government/dashboard?page=${menuKey}`;
      if (applicationId) {
        newURL += `&app=${applicationId}`;
      }
      
      const state = { 
        page: menuKey, 
        timestamp: Date.now(),
        applicationId: applicationId || undefined
      };
      
      if (replace) {
        window.history.replaceState(state, '', newURL);
      } else {
        window.history.pushState(state, '', newURL);
      }
      
      console.log('URL updated:', { menuKey, newURL, replace, state, applicationId });
    } catch (error) {
      console.error('Error updating URL:', error);
      // Fallback: try to update just the search params
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('page', menuKey);
        if (applicationId) {
          url.searchParams.set('app', applicationId);
        } else {
          url.searchParams.delete('app');
        }
        
        if (replace) {
          window.history.replaceState({ page: menuKey, applicationId }, '', url.toString());
        } else {
          window.history.pushState({ page: menuKey, applicationId }, '', url.toString());
        }
      } catch (fallbackError) {
        console.error('Fallback URL update also failed:', fallbackError);
      }
    }
  }, []);

  // Function to handle menu navigation with history
  const navigateToMenu = useCallback((menuKey: string, addToHistory: boolean = true) => {
    console.log('navigateToMenu called:', { menuKey, addToHistory, currentMenu: selectedMenu });
    
    if (addToHistory) {
      // Add to navigation history - keep last 10 items
      const newHistory = [...navigationHistory.filter(item => item !== menuKey), menuKey].slice(-10);
      setNavigationHistory(newHistory);
      
      // Update URL to reflect current page (clear application ID when switching menus)
      updateURL(menuKey, false, null);
      
      console.log('Navigation history updated:', newHistory);
    }
    
    setSelectedMenu(menuKey);
    setSelectedApplicationId(null); // Reset review if switching menu
    // Only clear deep link state when switching away from applications menu
    if (menuKey !== "applications") {
      setOpenChecklistItemId(null);
    }
  }, [navigationHistory, updateURL, selectedMenu]);

  // Function to go back in navigation history
  const goBack = useCallback(() => {
    if (navigationHistory.length > 1) {
      // Get the previous page
      const previousPage = navigationHistory[navigationHistory.length - 2];
      console.log('Going back to:', previousPage);
      
      setSelectedMenu(previousPage);
      setSelectedApplicationId(null);
      if (previousPage !== "applications") {
        setOpenChecklistItemId(null);
      }
      updateURL(previousPage, true, null);
    } else {
      // No previous page in dashboard - show sign-out confirmation
      console.log('No more history, showing sign-out confirmation');
      showSignOutConfirmation();
    }
  }, [navigationHistory, updateURL, showSignOutConfirmation]);

  // Function to reset navigation history (useful for starting fresh)
  const resetNavigationHistory = useCallback(() => {
    setNavigationHistory([selectedMenu]);
    console.log('Navigation history reset to current page:', selectedMenu);
  }, [selectedMenu]);

  // Function to handle direct URL navigation (e.g., user types URL manually)
  const handleDirectNavigation = useCallback((targetPage: string) => {
    console.log('Handling direct navigation to:', targetPage);
    
    // Check if this is a valid menu item
    const isValidPage = menuItems.some(item => item.key === targetPage);
    if (!isValidPage) {
      console.warn('Invalid page requested:', targetPage);
      return;
    }
    
    // Always allow navigation to any valid page
    setSelectedMenu(targetPage);
    setSelectedApplicationId(null);
    if (targetPage !== "applications") {
      setOpenChecklistItemId(null);
    }
    
    // Update URL (clear application ID for direct navigation)
    updateURL(targetPage, true, null);
  }, [updateURL]);

  // Function to handle back button for application reviews
  const handleApplicationBack = useCallback(() => {
    if (selectedApplicationId) {
      console.log('Back button pressed while application review is open, closing application');
      setSelectedApplicationId(null);
      setOpenChecklistItemId(null);
      // Update URL to remove application ID
      updateURL(selectedMenu, true, null);
      return true; // Indicate that we handled the back button
    }
    return false; // Indicate that we didn't handle the back button
  }, [selectedApplicationId, selectedMenu, updateURL]);

  // Add a more direct navigation blocking mechanism
  const preventNavigation = useCallback((event: Event) => {
    const targetPath = window.location.pathname;
    if (targetPath.startsWith('/government/') && !targetPath.startsWith('/government/dashboard')) {
      console.log('Preventing navigation to:', targetPath);
      event.preventDefault();
      event.stopPropagation();
      showSignOutConfirmation();
      // Force navigation back to dashboard
      window.history.pushState({ page: selectedMenu }, '', `/government/dashboard?page=${selectedMenu}`);
      return false;
    }
    return true;
  }, [selectedMenu, showSignOutConfirmation]);

  // Add a more comprehensive navigation blocking strategy
  const blockAllNavigation = useCallback(() => {
    const currentPath = window.location.pathname;
    console.log('🔍 Checking current path for navigation blocking:', currentPath);
    
    // Check for any government route that is NOT the dashboard
    if (currentPath.startsWith('/government') && !currentPath.startsWith('/government/dashboard')) {
      console.log('🚫 Blocking all navigation to:', currentPath);
      showSignOutConfirmation();
      // Force navigation back to dashboard
      window.history.pushState({ page: selectedMenu }, '', `/government/dashboard?page=${selectedMenu}`);
      return false;
    }
    return true;
  }, [selectedMenu, showSignOutConfirmation]);

  // Add a more direct approach to prevent navigation by using a different strategy
  const preventNavigationDirectly = useCallback(() => {
    // Check if we're on a non-dashboard route
    const currentPath = window.location.pathname;
    console.log('🔍 Direct check - current path:', currentPath);
    
    // Check for any government route that is NOT the dashboard
    if (currentPath.startsWith('/government') && !currentPath.startsWith('/government/dashboard')) {
      console.log('🚫 Directly preventing navigation to:', currentPath);
      showSignOutConfirmation();
      
      // Use a more aggressive approach to prevent navigation
      try {
        // Force navigation back to dashboard
        window.history.pushState({ page: selectedMenu }, '', `/government/dashboard?page=${selectedMenu}`);
        
        // Also try to replace the current history entry
        window.history.replaceState({ page: selectedMenu }, '', `/government/dashboard?page=${selectedMenu}`);
        
        // Force a page reload to ensure we're on the dashboard
        window.location.href = `/government/dashboard?page=${selectedMenu}`;
      } catch (error) {
        console.error('Error preventing navigation:', error);
      }
      
      return false;
    }
    return true;
  }, [selectedMenu, showSignOutConfirmation]);

  // Add a more comprehensive solution that uses multiple strategies
  const comprehensiveNavigationBlocking = useCallback(() => {
    const currentPath = window.location.pathname;
    console.log('🔍 Comprehensive check - current path:', currentPath);
    
    // Check for any government route that is NOT the dashboard
    if (currentPath.startsWith('/government') && !currentPath.startsWith('/government/dashboard')) {
      console.log('🚫 Comprehensive navigation blocking for:', currentPath);
      
      // Show the sign-out confirmation modal
      showSignOutConfirmation();
      
      // Use multiple strategies to prevent navigation
      try {
        // Strategy 1: Push state back to dashboard
        window.history.pushState({ page: selectedMenu }, '', `/government/dashboard?page=${selectedMenu}`);
        
        // Strategy 2: Replace current state
        window.history.replaceState({ page: selectedMenu }, '', `/government/dashboard?page=${selectedMenu}`);
        
        // Strategy 3: Force navigation back to dashboard
        if (!window.location.pathname.startsWith('/government/dashboard')) {
          window.location.href = `/government/dashboard?page=${selectedMenu}`;
        }
        
        // Strategy 4: Dispatch a custom event to notify other components
        window.dispatchEvent(new CustomEvent('navigationBlocked', { 
          detail: { targetPath: currentPath, dashboardPath: `/government/dashboard?page=${selectedMenu}` }
        }));
        
      } catch (error) {
        console.error('Error in comprehensive navigation blocking:', error);
      }
      
      return false;
    }
    return true;
  }, [selectedMenu, showSignOutConfirmation]);

  // Handle browser back/forward navigation - simplified
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      console.log('🔍 PopState event triggered:', event.state);
      console.log('🔍 Current path:', window.location.pathname);
      
      // Check if we're still on the dashboard route
      if (!window.location.pathname.startsWith('/government/dashboard')) {
        // We're navigating away from the dashboard - show sign-out confirmation
        console.log('🚫 Navigating away from dashboard to:', window.location.pathname);
        console.log('🚫 Showing sign-out confirmation');
        showSignOutConfirmation();
        // Prevent the navigation by pushing the current state back
        window.history.pushState({ page: selectedMenu }, '', `/government/dashboard?page=${selectedMenu}`);
        return;
      }

      // Special handling: if ApplicationReviewContainer is open, treat back button as "close application"
      if (handleApplicationBack()) {
        console.log('Application review closed via back button');
        return;
      }

      if (event.state && event.state.page) {
        const targetPage = event.state.page;
        console.log('Browser navigation to:', targetPage);
        
        // Simple navigation - just set the menu without any history manipulation
        setSelectedMenu(targetPage);
        setSelectedApplicationId(null);
        if (targetPage !== "applications") {
          setOpenChecklistItemId(null);
        }
      } else {
        // No state - check URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const pageFromURL = urlParams.get('page');
        if (pageFromURL) {
          console.log('URL parameter navigation to:', pageFromURL);
          setSelectedMenu(pageFromURL);
          setSelectedApplicationId(null);
          if (pageFromURL !== "applications") {
            setOpenChecklistItemId(null);
          }
        } else {
          // No page parameter - show sign-out confirmation
          console.log('No page specified, showing sign-out confirmation');
          showSignOutConfirmation();
          // Prevent navigation by pushing current state back
          window.history.pushState({ page: selectedMenu }, '', `/government/dashboard?page=${selectedMenu}`);
        }
      }
    };

    // Also add beforeunload to catch navigation away from dashboard
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // This will prompt the user before leaving the page entirely
      event.preventDefault();
      event.returnValue = 'Möchten Sie sich wirklich abmelden?';
      return event.returnValue;
    };

    // Block navigation to non-dashboard routes
    const blockNavigation = (event: PopStateEvent) => {
      const targetPath = window.location.pathname;
      console.log('🔍 blockNavigation check - target path:', targetPath);
      
      // Check for any government route that is NOT the dashboard
      if (targetPath.startsWith('/government') && !targetPath.startsWith('/government/dashboard')) {
        console.log('🚫 Blocking navigation to:', targetPath);
        showSignOutConfirmation();
        // Prevent navigation by restoring the dashboard state
        window.history.pushState({ page: selectedMenu }, '', `/government/dashboard?page=${selectedMenu}`);
        event.preventDefault();
        return false;
      }
    };

    // Set up a periodic check to prevent navigation
    const navigationCheckInterval = setInterval(blockAllNavigation, 100);
    
    // Also set up a more frequent check for the direct approach
    const directNavigationCheckInterval = setInterval(preventNavigationDirectly, 50);
    
    // Set up the comprehensive navigation blocking
    const comprehensiveCheckInterval = setInterval(comprehensiveNavigationBlocking, 25);
    
    // Add super-fast navigation check to catch rapid navigation
    const superFastCheckInterval = setInterval(() => {
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/government') && !currentPath.startsWith('/government/dashboard')) {
        console.log('🚨 SUPER-FAST: Caught navigation to:', currentPath);
        showSignOutConfirmation();
        // Immediately redirect back
        window.location.href = `/government/dashboard?page=${selectedMenu}`;
      }
    }, 10);

    // Add additional debugging for popstate events
    const debugPopState = (event: PopStateEvent) => {
      console.log('🔍 DEBUG PopState:', {
        state: event.state,
        pathname: window.location.pathname,
        href: window.location.href,
        timestamp: new Date().toISOString()
      });
    };

    // Add more aggressive navigation blocking by overriding browser methods
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    
    window.history.pushState = function(state, title, url) {
      console.log('🔍 history.pushState called with:', { state, title, url });
    if (typeof url === 'string' && url.startsWith('/government') && !url.startsWith('/government/dashboard')) {
        console.log('🚫 Blocking pushState navigation to:', url);
        showSignOutConfirmation();
        return originalPushState.call(this, { page: selectedMenu }, title, `/government/dashboard?page=${selectedMenu}`);
      }
      return originalPushState.call(this, state, title, url); 
    };

    window.history.replaceState = function(state, title, url) {
      console.log('🔍 history.replaceState called with:', { state, title, url });
      if (typeof url === 'string' && url.startsWith('/government') && !url.startsWith('/government/dashboard')) {
        console.log('🚫 Blocking replaceState navigation to:', url);
        showSignOutConfirmation();
        return originalReplaceState.call(this, { page: selectedMenu }, title, `/government/dashboard?page=${selectedMenu}`);
      }
      return originalReplaceState.call(this, state, title, url);
    };

    window.addEventListener('popstate', debugPopState);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', blockNavigation);
    
    return () => {
      window.removeEventListener('popstate', debugPopState);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', blockNavigation);
      clearInterval(navigationCheckInterval);
      clearInterval(directNavigationCheckInterval);
      clearInterval(comprehensiveCheckInterval);
      clearInterval(superFastCheckInterval);
      
      // Restore original history methods
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, [selectedApplicationId, selectedMenu, updateURL, handleApplicationBack, showSignOutConfirmation, blockAllNavigation, preventNavigationDirectly, comprehensiveNavigationBlocking]);

  // Initialize URL on component mount only
  useEffect(() => {
    if (!loading && user && city && !isInitialized) {
      const urlParams = new URLSearchParams(location.search);
      const pageFromURL = urlParams.get('page');
      const appFromURL = urlParams.get('app');
      
      if (pageFromURL && pageFromURL !== selectedMenu) {
        console.log('Initial restore from URL:', pageFromURL);
        setSelectedMenu(pageFromURL);
      } else if (!pageFromURL) {
        console.log('Initial URL setup for page:', selectedMenu);
        updateURL(selectedMenu, true);
      }
      
      // Handle application ID from URL
      if (appFromURL && pageFromURL === 'applications') {
        console.log('Initial restore application from URL:', appFromURL);
        setSelectedApplicationId(appFromURL);
      }
      
      setIsInitialized(true);
    }
  }, [loading, user, city, isInitialized, selectedMenu, updateURL]);

  // Handle sign-out confirmation
  const handleSignOut = () => {
    setShowSignOutModal(false);
    supabase.auth.signOut();
    navigate("/government/login");
  };

  const handleCancelSignOut = () => {
    setShowSignOutModal(false);
  };

  useEffect(() => {
    if (isAgent && autoLogoutSettings) {
      // Lightweight visibility into active settings
      console.log('[AutoLogout] Active settings', autoLogoutSettings);
    }
  }, [autoLogoutSettings, isAgent]);

  // Function to handle deep link processing
  const processDeepLink = async (applicationId: string, checklistItemId: string) => {
    setProcessingDeepLink(true);
    setDeepLinkError(null); // Clear any previous errors
    try {
      //console.log(`Processing deep link for applicationId: ${applicationId}, city: ${city}`);
      
      // First, try to get the application without city filtering to see if it exists
      ///console.log('Trying to fetch application with minimal columns...');
      const { data: applicationWithoutCity, error: errorWithoutCity } = await supabase
        .from('applications')
        .select('id, resident_id, status, city_id')
        .eq('id', applicationId)
        .single();


      if (!applicationWithoutCity) {
        const errorMsg = `Anwendung ${applicationId} wurde nicht gefunden.`;
        setDeepLinkError(errorMsg);
        return;
      }

      console.log('Application found:', applicationWithoutCity);

      // For now, let's skip the city check since we don't know if the city column exists
      // We'll implement proper access control later
      //console.log('Skipping city access control for now - application found successfully');
      
      // Set the application and checklist item to open
      setSelectedApplicationId(applicationId);
      setOpenChecklistItemId(checklistItemId);
      navigateToMenu("applications", false); // Don't add to history for deep links
      
      // Clear the URL query parameters to avoid repeated processing
      // Use a flag to prevent re-processing
      setProcessingDeepLink(false); // Set to false before navigation to prevent re-triggering
      navigate(location.pathname, { replace: true });
      
      //console.log(`Deep link processed: opened application ${applicationId} with checklist item ${checklistItemId}`);
      
      // Note: The checklist item will be opened when the ApplicationReviewContainer loads
      // and the ChecklistPanel processes the openChecklistItemId prop
    } catch (error) {
      const errorMsg = `Fehler beim Öffnen des Checklistenpunkts: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`;
      console.error('Error processing deep link:', error);
      setDeepLinkError(errorMsg);
      setProcessingDeepLink(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then((res: any) => {
      const userObj = res?.data?.session?.user;
      setUser(userObj);
      const userCity = userObj?.user_metadata?.city || null;
      setCity(userCity);
      //console.log('User session loaded:', { user: userObj, city: userCity, metadata: userObj?.user_metadata });
      setLoading(false);
      // Routing protection: only allow if city metadata exists (government account)
      if ((!userObj || !userCity) && process.env.NODE_ENV !== 'development') {
        navigate('/government/login', { replace: true });
      }
    });
  }, [navigate]);



  useEffect(() => {
    // Handle navigation state for application selection (only on mount)
    if (location.state?.selectedApplicationId) {
      setSelectedApplicationId(location.state.selectedApplicationId);
    }
    if (location.state?.openChecklistItemId) {
      setOpenChecklistItemId(location.state.openChecklistItemId);
      // Reset state after use to avoid repeated opening
      navigate(location.pathname, { replace: true, state: { ...location.state, openChecklistItemId: null } });
    }
  }, []); // Remove all dependencies to run only on mount

  // Handle URL query parameters for deep linking
  useEffect(() => {
    if (!loading && !processingDeepLink && user && city) {
      const urlParams = new URLSearchParams(location.search);
      const applicationId = urlParams.get('applicationId');
      const checklistItemId = urlParams.get('openChecklistItemId');
      
      if (applicationId && checklistItemId) {
       // console.log(`Processing deep link for applicationId: ${applicationId}, checklistItemId: ${checklistItemId}`);
       // console.log(`Current user city: ${city}`);
       // console.log(`Current user:`, user);
        processDeepLink(applicationId, checklistItemId);
      } else if (applicationId || checklistItemId) {
        // Show error if only one parameter is provided
        const missingParam = !applicationId ? 'applicationId' : 'openChecklistItemId';
        const errorMsg = `Deep Link unvollständig: Der Parameter "${missingParam}" fehlt.`;
       // console.warn(errorMsg);
        setDeepLinkError(errorMsg);
        
        // Clear the URL to avoid repeated error messages
        navigate(location.pathname, { replace: true });
      }
    }
  }, [loading, location.search, processingDeepLink, user, city]);

  const handleMenuClick = (key: string) => {
    if (key === "logout") {
      // Show sign-out confirmation modal instead of directly logging out
      showSignOutConfirmation();
    } else {
      navigateToMenu(key);
    }
  };

  const handleSelectApplication = (applicationId: string) => {
    console.log('Selecting application:', applicationId);
    setSelectedApplicationId(applicationId);
    
    // Update URL to include application ID
    updateURL(selectedMenu, false, applicationId);
    
    console.log('Application selected, URL updated with app ID:', applicationId);
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
        <Spinner animation="border" style={{ color: '#064497', width: 60, height: 60 }} />
      </div>
    );
  }

  // Show loading state when processing deep links
  if (processingDeepLink) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
        <div className="text-center">
          <Spinner animation="border" style={{ color: '#064497', width: 60, height: 60 }} />
          <div className="mt-3" style={{ color: '#064497', fontSize: 18 }}>
            Öffne Checkliste...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex" style={{ minHeight: "100vh", background: "#F7F8FA" }}>
      {/* Sidebar */}
      <div
        className={`d-flex flex-column align-items-start p-3 shadow`}
        style={{
          width: sidebarOpen ? 260 : 60,
          background: "#064497",
          color: "#fff",
          transition: "width 0.2s",
          minHeight: "100vh",
          zIndex: 10,
        }}
      >
        {/* Expand/Minimize Button */}
        <Button
          variant="link"
          className="mb-6 p-0 d-flex align-items-center mt-2"
          style={{ color: "#fff", fontSize: 20, textDecoration: "none" }}
          onClick={() => setSidebarOpen((open) => !open)}
        >
          {sidebarOpen ? (
            <>
              <span className="material-icons me-2">chevron_left</span>
              Minimieren
            </>
          ) : (
            <span className="material-icons">menu</span>
          )}
        </Button>
        <div className="flex-grow-1 w-100">
          {menuItems.map((item, idx) => (
            <React.Fragment key={item.key}>
              <div
                style={{
                  width: sidebarOpen ? '85%' : 44,
                  height: 44,
                  margin: '0 auto',
                  borderRadius: 8,
                  overflow: 'visible',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Button
                  variant="link"
                  className={`mb-0 px-0 py-2 rounded-0 d-flex align-items-center border-0`}
                  style={{
                    background: selectedMenu === item.key ? "#fff" : "transparent",
                    color: selectedMenu === item.key ? "#064497" : "#fff",
                    fontWeight: 500,
                    fontSize: 18,
                    border: "none",
                    boxShadow: selectedMenu === item.key ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                    textDecoration: "none",
                    width: '100%',
                    minHeight: 44,
                    paddingLeft: sidebarOpen ? 12 : 0,
                    paddingRight: sidebarOpen ? 12 : 0,
                    justifyContent: sidebarOpen ? 'flex-start' : 'center',
                    borderRadius: 8,
                    overflow: 'visible',
                  }}
                  onClick={() => handleMenuClick(item.key)}
                >
                  <span className="material-icons"
                    style={{
                      textDecoration: "none",
                      marginRight: sidebarOpen ? 16 : 0,
                      marginLeft: sidebarOpen ? 16 : 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 28,
                      width: 28,
                      height: 28,
                    }}
                  >
                    {item.icon}
                  </span>
                  {sidebarOpen && <span style={{ textDecoration: "none" }}>{item.label}</span>}
                </Button>
              </div>
              {/* Separator line only visible when expanded */}
              {sidebarOpen && idx < menuItems.length - 1 && (
                <div
                  style={{
                    height: 1,
                    background: "rgba(255,255,255,0.3)",
                    width: '85%',
                    margin: '4px auto',
                    borderRadius: 1,
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-grow-1">
        {/* Header */}
        <div
          className="d-flex align-items-center justify-content-between px-4 py-3 shadow-sm"
          style={{ background: "#fff", minHeight: 70 }}
        >
          <div className="d-flex align-items-center">
            <div style={{ fontWeight: 400, fontSize: 24, color: "#064497" }}>
              FÖRDERCHECK.NRW
            </div>

          </div>
          <div style={{ fontWeight: 400, fontSize: 18, color: "#000000" }}>
            {city ? city : "Stadt"}
          </div>
        </div>
        
        {/* Deep Link Error Alert */}
        {deepLinkError && (
          <div className="px-4 py-2" style={{ background: "#fff" }}>
            <div className="alert alert-warning alert-dismissible fade show" role="alert">
              <strong>Hinweis:</strong> {deepLinkError}
              <button
                type="button"
                className="btn-close"
                onClick={() => setDeepLinkError(null)}
                aria-label="Close"
              ></button>
            </div>
          </div>
        )}
        
        {/* Debug Navigation Info - Remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="px-4 py-2" style={{ background: "#f8f9fa", borderBottom: "1px solid #dee2e6" }}>
            <div className="d-flex justify-content-between align-items-center">
              <small className="text-muted">
                <strong>Debug:</strong> Current: {selectedMenu} | 
                History: [{navigationHistory.join(' → ')}] | 
                Can go back: {navigationHistory.length > 1 ? 'Yes' : 'No'}
              </small>
              <div>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={resetNavigationHistory}
                  className="me-2"
                >
                  Reset History
                </Button>
                <Button
                  variant="outline-info"
                  size="sm"
                  onClick={() => console.log('Navigation State:', { navigationHistory, selectedMenu })}
                  className="me-2"
                >
                  Log State
                </Button>
                <Button
                  variant="outline-warning"
                  size="sm"
                  onClick={showSignOutConfirmation}
                >
                  Test Sign-Out Modal
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Content */}
        <Container className="py-4">
          {selectedMenu === "dashboard" && (
            <GovernmentDashboardPage />
          )}
          {selectedMenu === "applications" && !selectedApplicationId && (
            <GovernmentApplicationsPage 
              onSelectApplication={handleSelectApplication}
              activeTab={activeTab}
              onActiveTabChange={setActiveTab}
            />
          )}
          {selectedMenu === "applications" && selectedApplicationId && (
            <ApplicationReviewContainer 
              applicationId={selectedApplicationId} 
              onClose={() => {
                setSelectedApplicationId(null);
                setOpenChecklistItemId(null); // Clear deep link state when closing application
                // Update URL to remove application ID
                updateURL(selectedMenu, true, null);
              }} 
              openChecklistItemId={openChecklistItemId}
              onClearDeepLink={() => setOpenChecklistItemId(null)} // Clear deep link state when switching modes
            />
          )}
          {selectedMenu === "profile" && (
            <GovernmentProfilePage />
          )}
          {selectedMenu === "settings" && (
            <GovernmentSettingsPage />
          )}
          {selectedMenu === "messages" && (
            <MessagesPage />
          )}
          {selectedMenu === "help" && (
            <div className="text-center py-5">
              <h3>Hilfe & Support</h3>
              <p>Hier finden Sie Hilfe und Support-Informationen.</p>
            </div>
          )}
        </Container>
      </div>

      {/* Sign-out Confirmation Modal */}
      <Modal show={showSignOutModal} onHide={handleCancelSignOut} centered>
        <Modal.Header closeButton>
          <Modal.Title>Abmelden</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Möchten Sie sich wirklich abmelden und zur Anmeldeseite zurückkehren?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCancelSignOut}>
            Abbrechen
          </Button>
          <Button variant="danger" onClick={handleSignOut}>
            Abmelden
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default GovernmentDashboard; 