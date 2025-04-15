import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  isAuthenticated: boolean;
  email: string | null;
  register: (email: string) => Promise<void>;
  login: (email: string) => Promise<void>;
  logout: () => void;
  verifyEmail: (token: string) => Promise<void>;
  validateLogin: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for stored authentication state
    const storedEmail = localStorage.getItem('userEmail');
    const storedToken = localStorage.getItem('token');
    
    if (storedEmail && storedToken) {
      // Verify the token is still valid
      fetch('http://localhost:8000/api/auth/validate', {
        headers: {
          'Authorization': `Bearer ${storedToken}`
        }
      })
        .then(response => {
          if (response.ok) {
            setEmail(storedEmail);
            setIsAuthenticated(true);
          } else {
            // Token is invalid, clear stored data
            localStorage.removeItem('userEmail');
            localStorage.removeItem('token');
            setEmail(null);
            setIsAuthenticated(false);
          }
        })
        .catch(error => {
          console.error('Token validation error:', error);
          localStorage.removeItem('userEmail');
          localStorage.removeItem('token');
          setEmail(null);
          setIsAuthenticated(false);
        });
    }
  }, []);

  const register = async (email: string) => {
    console.log('Attempting registration for email:', email);
    try {
      const response = await fetch('http://localhost:8000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('Registration failed:', data);
        throw new Error(data.detail || 'Failed to send verification email');
      }

      console.log('Registration successful, verification email sent');
      // Store email for later use
      setEmail(email);
      localStorage.setItem('userEmail', email);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const login = async (email: string) => {
    console.log('Attempting login for email:', email);
    try {
      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('Login failed:', data);
        throw new Error(data.detail || 'Failed to send login link');
      }

      console.log('Login link sent successfully');
      // Store email for later use
      setEmail(email);
      localStorage.setItem('userEmail', email);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/auth/verify/${token}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to verify email');
      }
      // After successful verification, redirect to login
      navigate('/login');
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  };

  const validateLogin = useCallback(async (token: string) => {
    console.log('Starting validateLogin with token:', token);
    try {
      // Check if we already have a valid token
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        console.log('Found existing token, skipping validation');
        return;
      }

      // Check if this token has already been used
      const usedToken = localStorage.getItem('usedToken');
      if (usedToken === token) {
        console.log('Token already used, skipping validation');
        return;
      }

      const response = await fetch(`http://localhost:8000/api/auth/login/${token}`);
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Login validation failed:', data);
        throw new Error(data.detail || 'Failed to validate login');
      }

      console.log('Login validation successful:', data);
      
      // Store the new session token and email
      if (data.token && data.email) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userEmail', data.email);
        localStorage.setItem('usedToken', token); // Mark token as used
        setEmail(data.email);
        setIsAuthenticated(true);
        navigate('/personal-space');
      } else {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Login validation error:', error);
      throw error;
    }
  }, [navigate]);

  const logout = () => {
    setIsAuthenticated(false);
    setEmail(null);
    localStorage.removeItem('userEmail');
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        email,
        register,
        login,
        logout,
        verifyEmail,
        validateLogin,
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