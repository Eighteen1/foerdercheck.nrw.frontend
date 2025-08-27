/**
 * JWT Token utility functions for managing authentication tokens
 */

export interface JWTPayload {
  exp: number;
  iat: number;
  sub: string;
  email?: string;
  [key: string]: any;
}

/**
 * Decode a JWT token and return its payload
 */
export const decodeJWT = (token: string): JWTPayload | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT token:', error);
    return null;
  }
};

/**
 * Check if a JWT token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  const payload = decodeJWT(token);
  if (!payload) return true;
  
  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp < currentTime;
};

/**
 * Check if a JWT token will expire within the specified time (in seconds)
 */
export const isTokenExpiringSoon = (token: string, bufferSeconds: number = 300): boolean => {
  const payload = decodeJWT(token);
  if (!payload) return true;
  
  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp - currentTime < bufferSeconds;
};

/**
 * Get the time until token expiration in seconds
 */
export const getTimeUntilExpiration = (token: string): number => {
  const payload = decodeJWT(token);
  if (!payload) return 0;
  
  const currentTime = Math.floor(Date.now() / 1000);
  return Math.max(0, payload.exp - currentTime);
};

/**
 * Format the time until expiration in a human-readable format
 */
export const formatTimeUntilExpiration = (token: string): string => {
  const seconds = getTimeUntilExpiration(token);
  
  if (seconds === 0) return 'Expired';
  
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

/**
 * Validate JWT token structure
 */
export const isValidJWTFormat = (token: string): boolean => {
  if (!token || typeof token !== 'string') return false;
  
  const parts = token.split('.');
  return parts.length === 3 && 
         parts.every(part => part.length > 0) &&
         /^[A-Za-z0-9+/=]+$/.test(parts[1]); // Base64 validation for payload
};

/**
 * Get token information for debugging
 */
export const getTokenInfo = (token: string) => {
  if (!isValidJWTFormat(token)) {
    return { valid: false, error: 'Invalid JWT format' };
  }
  
  const payload = decodeJWT(token);
  if (!payload) {
    return { valid: false, error: 'Could not decode payload' };
  }
  
  const currentTime = Math.floor(Date.now() / 1000);
  const isExpired = payload.exp < currentTime;
  const timeUntilExpiration = Math.max(0, payload.exp - currentTime);
  
  return {
    valid: true,
    isExpired,
    timeUntilExpiration,
    formattedTime: formatTimeUntilExpiration(token),
    issuedAt: new Date(payload.iat * 1000).toISOString(),
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    subject: payload.sub,
    email: payload.email,
    payload
  };
};
