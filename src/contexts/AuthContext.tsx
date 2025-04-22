import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  isAuthenticated: boolean;
  email: string | null;
  user: User | null;
  login: (email: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('AuthProvider: Initializing auth state');
    
    // Check for existing session
    const checkSession = async () => {
      console.log('AuthProvider: Checking for existing session');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      console.log('AuthProvider: Session check result:', {
        hasSession: !!session,
        error,
        user: session?.user
      });

      if (session) {
        console.log('AuthProvider: Setting authenticated state');
        setIsAuthenticated(true);
        setEmail(session.user.email ?? null);
        setUser(session.user);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('AuthProvider: Auth state changed:', {
        event,
        hasSession: !!session,
        user: session?.user
      });
      
      setIsAuthenticated(!!session);
      setEmail(session?.user.email ?? null);
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string) => {
    try {
      console.log('AuthProvider: Attempting login for email:', email);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      console.log('AuthProvider: Login OTP sent successfully');
    } catch (error) {
      console.error('AuthProvider: Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('AuthProvider: Attempting logout');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setIsAuthenticated(false);
      setEmail(null);
      setUser(null);
      navigate('/');
      console.log('AuthProvider: Logout successful');
    } catch (error) {
      console.error('AuthProvider: Logout error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        email,
        user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 