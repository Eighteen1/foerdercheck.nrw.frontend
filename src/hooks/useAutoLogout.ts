import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { isTokenExpired, isTokenExpiringSoon, getTokenInfo } from '../utils/jwtUtils';

interface AutoLogoutSettings {
  enabled: boolean;
  timeout_minutes: number;
}

export const useAutoLogout = (settings: AutoLogoutSettings | undefined) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const tokenCheckRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef<boolean>(false);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      // Redirect to government login (agents area)
      window.location.href = '/government/login';
    } catch (error) {
      console.error('[useAutoLogout] Error during auto-logout:', error);
    }
  }, []);

  // Check if JWT token is expired or about to expire
  const checkTokenExpiration = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
              if (!session?.access_token) {
          // No session, trigger logout
          logout();
          return;
        }

      // Use utility functions to check token status
      const token = session.access_token;
      const tokenInfo = getTokenInfo(token);
      
      if (!tokenInfo.valid) {
        logout();
        return;
      }
      
      if (tokenInfo.isExpired) {
        logout();
        return;
      }
      
      // Check if token expires in the next 5 minutes
      if (isTokenExpiringSoon(token, 300)) {
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error || !data.session) {
          logout();
          return;
        }
        
      } else {
      }
    } catch (error) {
      console.error('[useAutoLogout] Error checking token expiration:', error);
      // If we can't check the token, it's safer to logout
      logout();
    }
  }, [logout]);

  const startTimer = useCallback(() => {
    if (!settings?.enabled || !settings?.timeout_minutes) {
      return;
    }

    const timeoutMs = settings.timeout_minutes * 60 * 1000;

    const checkInactivity = () => {
      // Don't check inactivity on public pages
      const currentPath = window.location.pathname;
      const isPublicPage = currentPath === '/' || 
                          currentPath === '/government' || 
                          currentPath === '/government/login' ||
                          currentPath === '/auth/callback' ||
                          currentPath === '/login' ||
                          currentPath === '/verify' ||
                          currentPath === '/application-types' ||
                          currentPath === '/password-protection' ||
                          currentPath === '/initial-check' ||
                          currentPath === '/ic-results' ||
                          currentPath.startsWith('/verify/');
      
      if (isPublicPage) {
        // Still schedule next check in case user navigates to protected page
        timeoutRef.current = setTimeout(checkInactivity, 1000);
        return;
      }
      
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;

      if (timeSinceLastActivity >= timeoutMs) {
        logout();
      } else {
        // Schedule next check
        timeoutRef.current = setTimeout(checkInactivity, 1000); // Check every second
      }
    };

    // Start first check after 1 second, but add extra delay if this is the first time the hook is enabled
    const initialDelay = isInitializedRef.current ? 1000 : 5 * 60 * 1000; // 5 minutes on first run
    timeoutRef.current = setTimeout(checkInactivity, initialDelay);
  }, [settings, logout]);

  const stopTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (tokenCheckRef.current) {
      clearTimeout(tokenCheckRef.current);
      tokenCheckRef.current = null;
    }
  }, []);

  // Start token expiration checking
  const startTokenChecking = useCallback(() => {
    // Don't check tokens on public pages
    const currentPath = window.location.pathname;
    const isPublicPage = currentPath === '/' || 
                        currentPath === '/government' || 
                        currentPath === '/government/login' ||
                        currentPath === '/auth/callback' ||
                        currentPath === '/login' ||
                        currentPath === '/verify' ||
                        currentPath === '/application-types' ||
                        currentPath === '/password-protection' ||
                        currentPath === '/initial-check' ||
                        currentPath === '/ic-results' ||
                        currentPath.startsWith('/verify/');
    
    if (isPublicPage) {
      // Still schedule next check in case user navigates to protected page
      tokenCheckRef.current = setTimeout(checkTokenExpiration, 2 * 60 * 1000);
      return;
    }
    
    // Check token every 2 minutes
    const checkToken = () => {
      // Don't check tokens on public pages
      const currentPath = window.location.pathname;
      const isPublicPage = currentPath === '/' || 
                          currentPath === '/government' || 
                          currentPath === '/government/login' ||
                          currentPath === '/auth/callback' ||
                          currentPath === '/login' ||
                          currentPath === '/verify' ||
                          currentPath === '/application-types' ||
                          currentPath === '/password-protection' ||
                          currentPath === '/initial-check' ||
                          currentPath === '/ic-results' ||
                          currentPath.startsWith('/verify/');
      
      if (isPublicPage) {
        // Still schedule next check in case user navigates to protected page
        tokenCheckRef.current = setTimeout(checkToken, 2 * 60 * 1000);
        return;
      }
      
      checkTokenExpiration();
      tokenCheckRef.current = setTimeout(checkToken, 2 * 60 * 1000);
    };
    
    // Start first check after 1 minute, but add extra delay if this is the first time the hook is enabled
    const initialDelay = isInitializedRef.current ? 60 * 1000 : 5 * 60 * 1000; // 5 minutes on first run
    tokenCheckRef.current = setTimeout(checkToken, initialDelay);
    isInitializedRef.current = true;
  }, [checkTokenExpiration]);

  useEffect(() => {
    if (settings?.enabled && settings?.timeout_minutes) {
      startTimer();
      startTokenChecking();
    } else {
      stopTimer();
    }

    return () => {
      stopTimer();
    };
  }, [settings, startTimer, startTokenChecking, stopTimer]);

  useEffect(() => {
    // Track user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      resetTimer();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [resetTimer]);

  // Check token when tab becomes visible (user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Don't check tokens on public pages, especially login pages
        const currentPath = window.location.pathname;
        const isPublicPage = currentPath === '/' || 
                            currentPath === '/government' || 
                            currentPath === '/government/login' ||
                            currentPath === '/auth/callback' ||
                            currentPath === '/login' ||
                            currentPath === '/verify' ||
                            currentPath === '/application-types' ||
                            currentPath === '/password-protection' ||
                            currentPath === '/initial-check' ||
                            currentPath === '/ic-results' ||
                            currentPath.startsWith('/verify/');
        
        if (isPublicPage) {
          return;
        }
        
        checkTokenExpiration();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkTokenExpiration]);

  return {
    resetTimer,
    startTimer,
    stopTimer
  };
};
