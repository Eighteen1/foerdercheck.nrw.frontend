import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface AutoLogoutSettings {
  enabled: boolean;
  timeout_minutes: number;
}

interface AutoLogoutContextType {
  settings: AutoLogoutSettings | undefined;
  updateSettings: (newSettings: AutoLogoutSettings) => Promise<void>;
  loading: boolean;
  isAgent: boolean;
}

const AutoLogoutContext = createContext<AutoLogoutContextType | undefined>(undefined);

export const useAutoLogoutContext = () => {
  const context = useContext(AutoLogoutContext);
  if (context === undefined) {
    throw new Error('useAutoLogoutContext must be used within an AutoLogoutProvider');
  }
  return context;
};

interface AutoLogoutProviderProps {
  children: ReactNode;
}

function normalizeAgentSettings(raw: any): { full: any; autoLogout: AutoLogoutSettings; changed: boolean } {
  const DEFAULT: AutoLogoutSettings = { enabled: false, timeout_minutes: 30 };
  if (!raw || typeof raw !== 'object') {
    return { full: { auto_logout: DEFAULT }, autoLogout: DEFAULT, changed: true };
  }
  const fullCopy: any = { ...raw };
  let changed = false;

  // If legacy top-level keys exist, move them under auto_logout
  const hasTopEnabled = Object.prototype.hasOwnProperty.call(fullCopy, 'enabled');
  const hasTopTimeout = Object.prototype.hasOwnProperty.call(fullCopy, 'timeout_minutes');

  if (!fullCopy.auto_logout) {
    fullCopy.auto_logout = { ...DEFAULT };
    changed = true;
  }

  if (hasTopEnabled) {
    fullCopy.auto_logout.enabled = !!fullCopy.enabled;
    delete fullCopy.enabled;
    changed = true;
  }
  if (hasTopTimeout) {
    const t = parseInt(fullCopy.timeout_minutes, 10);
    fullCopy.auto_logout.timeout_minutes = isNaN(t) ? DEFAULT.timeout_minutes : t;
    delete fullCopy.timeout_minutes;
    changed = true;
  }

  // Ensure defaults
  if (typeof fullCopy.auto_logout.enabled !== 'boolean') {
    fullCopy.auto_logout.enabled = DEFAULT.enabled;
    changed = true;
  }
  if (
    typeof fullCopy.auto_logout.timeout_minutes !== 'number' ||
    fullCopy.auto_logout.timeout_minutes < 1 ||
    fullCopy.auto_logout.timeout_minutes > 1440
  ) {
    fullCopy.auto_logout.timeout_minutes = DEFAULT.timeout_minutes;
    changed = true;
  }

  return { full: fullCopy, autoLogout: fullCopy.auto_logout as AutoLogoutSettings, changed };
}

export const AutoLogoutProvider: React.FC<AutoLogoutProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AutoLogoutSettings | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [isAgent, setIsAgent] = useState<boolean>(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('agents')
          .select('settings')
          .eq('id', session.user.id)
          .maybeSingle();

        if (error) throw error;

        // Not an agent: no row in agents table
        if (!data) {
          setIsAgent(false);
          setSettings(undefined);
          return;
        }

        setIsAgent(true);
        const { full, autoLogout, changed } = normalizeAgentSettings(data?.settings);
        setSettings(autoLogout);

        // Persist normalization if we changed the structure
        if (changed) {
          await supabase.from('agents').update({ settings: full }).eq('id', session.user.id);
        }
      } catch (error) {
        console.error('Error fetching auto-logout settings:', error);
        // On error, disable auto-logout rather than forcing defaults
        setIsAgent(false);
        setSettings(undefined);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        fetchSettings();
      } else if (event === 'SIGNED_OUT') {
        setSettings(undefined);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const updateSettings = async (newSettings: AutoLogoutSettings) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('No user session');
      if (!isAgent) throw new Error('Not an agent');

      // Fetch full settings from DB to merge correctly
      const { data, error } = await supabase
        .from('agents')
        .select('settings')
        .eq('id', session.user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Agent not found');

      const { full } = normalizeAgentSettings(data?.settings);
      const updatedFull = { ...full, auto_logout: { ...newSettings } };

      const { error: updateError } = await supabase
        .from('agents')
        .update({ settings: updatedFull })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      setSettings(newSettings);
    } catch (error) {
      console.error('Error updating auto-logout settings:', error);
      throw error;
    }
  };

  const value: AutoLogoutContextType = {
    settings,
    updateSettings,
    loading,
    isAgent
  };

  return (
    <AutoLogoutContext.Provider value={value}>
      {children}
    </AutoLogoutContext.Provider>
  );
};
