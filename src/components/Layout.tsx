import React from 'react';
import { useLocation } from 'react-router-dom';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  
  // Get the current component's handleNavigation function if it exists
  const currentComponent = React.Children.only(children) as React.ReactElement;
  const handleNavigation = currentComponent.props?.handleNavigation;

  return (
    <div className="min-h-screen d-flex flex-column">
      <main className="flex-grow-1">
        {children}
      </main>
      <Footer onNavigate={handleNavigation} />
    </div>
  );
};

export default Layout; 