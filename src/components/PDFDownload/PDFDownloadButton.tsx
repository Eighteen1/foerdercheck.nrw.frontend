import React, { useState } from 'react';
import { Button, Spinner, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface PDFDownloadButtonProps {
  formType: 'haushalt' | 'hauptantrag' | 'einkommenserklarung' | 'selbstauskunft' | 'selbsthilfe' | 'all';
  variant?: 'primary' | 'outline-primary' | 'secondary' | 'outline-secondary';
  size?: 'sm' | 'lg';
  className?: string;
  children?: React.ReactNode;
  showIcon?: boolean;
}

const PDFDownloadButton: React.FC<PDFDownloadButtonProps> = ({
  formType,
  variant = 'outline-primary',
  size = 'lg',
  className = '',
  children,
  showIcon = true
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const getFormTypeLabel = (type: string) => {
    switch (type) {
      case 'haushalt':
        return 'Haushaltsauskunft';
      case 'hauptantrag':
        return 'Hauptantrag';
      case 'einkommenserklarung':
        return 'Einkommenserklärung';
      case 'selbstauskunft':
        return 'Selbstauskunft';
      case 'selbsthilfe':
        return 'Selbsthilfe';
      case 'all':
        return 'Alle Formulare';
      default:
        return 'Formular';
    }
  };

  const getFormTypeIcon = (type: string) => {
    switch (type) {
      case 'haushalt':
        return '🏠';
      case 'hauptantrag':
        return '📋';
      case 'einkommenserklarung':
        return '💰';
      case 'selbstauskunft':
        return '📊';
      case 'selbsthilfe':
        return '🔧';
      case 'all':
        return '📄';
      default:
        return '📄';
    }
  };

  const handleDownload = async () => {
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      // Get the current session token from Supabase
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        throw new Error('No valid session found');
      }

      // Get the API base URL from environment or use relative path
      const apiBaseUrl = process.env.REACT_APP_BACKEND_URL || '';
      
      // Make API call to generate PDF
      const response = await fetch(`${apiBaseUrl}/pdf/generate-${formType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get the PDF blob
      const pdfBlob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${formType}_form_${user.id}.pdf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error downloading PDF:', error);
      // You could show a toast notification here
      alert('Fehler beim Herunterladen der PDF. Bitte versuchen Sie es erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  const buttonContent = (
    <>
      {isLoading ? (
        <>
          <Spinner
            as="span"
            animation="border"
            size="sm"
            role="status"
            aria-hidden="true"
            className="me-2"
          />
          PDF wird erstellt...
        </>
      ) : (
        <>
          {showIcon && <span className="me-2">{getFormTypeIcon(formType)}</span>}
          {children || `${getFormTypeLabel(formType)} herunterladen`}
        </>
      )}
    </>
  );

  const tooltipText = `Laden Sie das ausgefüllte ${getFormTypeLabel(formType)}-Formular als PDF herunter. Das PDF entspricht dem offiziellen Papierformular und kann für digitale Unterschriften verwendet werden.`;

  return (
    <OverlayTrigger
      placement="top"
      overlay={<Tooltip id={`pdf-download-${formType}-tooltip`}>{tooltipText}</Tooltip>}
    >
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleDownload}
        disabled={isLoading}
        style={{
          backgroundColor: variant === 'outline-primary' ? 'transparent' : undefined,
          borderColor: variant === 'outline-primary' ? '#064497' : undefined,
          color: variant === 'outline-primary' ? '#064497' : undefined,
        }}
      >
        {buttonContent}
      </Button>
    </OverlayTrigger>
  );
};

export default PDFDownloadButton; 