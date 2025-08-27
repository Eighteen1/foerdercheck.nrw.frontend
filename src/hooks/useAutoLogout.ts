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

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const logout = useCallback(async () => {
    try {
      console.debug('[AutoLogout] Triggering logout due to inactivity or token expiration');
      await supabase.auth.signOut();
      // Redirect to government login (agents area)
      window.location.href = '/government/login';
    } catch (error) {
      console.error('Error during auto-logout:', error);
    }
  }, []);

  // Check if JWT token is expired or about to expire
  const checkTokenExpiration = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        // No session, trigger logout
        console.debug('[AutoLogout] No session found, logging out');
        logout();
        return;
      }

      // Use utility functions to check token status
      const token = session.access_token;
      const tokenInfo = getTokenInfo(token);
      
      if (!tokenInfo.valid) {
        console.debug('[AutoLogout] Invalid token format, logging out');
        logout();
        return;
      }
      
      if (tokenInfo.isExpired) {
        console.debug('[AutoLogout] Token already expired, logging out');
        logout();
        return;
      }
      
      // Check if token expires in the next 5 minutes
      if (isTokenExpiringSoon(token, 300)) {
        console.debug('[AutoLogout] Token expiring soon, attempting refresh', {
          timeUntilExpiration: tokenInfo.formattedTime
        });
        
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error || !data.session) {
          console.debug('[AutoLogout] Token refresh failed, logging out');
          logout();
          return;
        }
        
        console.debug('[AutoLogout] Token refreshed successfully');
      } else {
        console.debug('[AutoLogout] Token is valid', {
          timeUntilExpiration: tokenInfo.formattedTime
        });
      }
    } catch (error) {
      console.error('[AutoLogout] Error checking token expiration:', error);
      // If we can't check the token, it's safer to logout
      logout();
    }
  }, [logout]);

  const startTimer = useCallback(() => {
    if (!settings?.enabled || !settings?.timeout_minutes) {
      return;
    }

    const timeoutMs = settings.timeout_minutes * 60 * 1000;
    console.debug('[AutoLogout] Timer started', { timeout_minutes: settings.timeout_minutes });

    const checkInactivity = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;

      if (timeSinceLastActivity >= timeoutMs) {
        logout();
      } else {
        // Schedule next check
        timeoutRef.current = setTimeout(checkInactivity, 1000); // Check every second
      }
    };

    timeoutRef.current = setTimeout(checkInactivity, 1000);
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
    // Check token every 2 minutes
    const checkToken = () => {
      checkTokenExpiration();
      tokenCheckRef.current = setTimeout(checkToken, 2 * 60 * 1000);
    };
    
    // Start first check after 1 minute
    tokenCheckRef.current = setTimeout(checkToken, 60 * 1000);
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
        console.debug('[AutoLogout] Tab became visible, checking token');
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
