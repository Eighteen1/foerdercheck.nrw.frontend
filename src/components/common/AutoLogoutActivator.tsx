import React from 'react';
import { useAutoLogout } from '../../hooks/useAutoLogout';
import { useAutoLogoutContext } from '../../contexts/AutoLogoutContext';

const AutoLogoutActivator: React.FC = () => {
  const { settings, isAgent } = useAutoLogoutContext();
  // Only activate for agents
  useAutoLogout(isAgent ? settings : undefined);
  return null;
};

export default AutoLogoutActivator;
