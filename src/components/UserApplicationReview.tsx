import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import UserFormsDocsPanel from './UserFormsDocsPanel';

const UserApplicationReview: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [openForms, setOpenForms] = useState<string[]>([]);
  const [openDocuments, setOpenDocuments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);

  console.log('UserApplicationReview component loaded:', {
    user: user?.id,
    isLoading,
    error
  });

  // Simple test to verify component is mounting
  useEffect(() => {
    console.log('UserApplicationReview component mounted successfully');
    return () => {
      console.log('UserApplicationReview component unmounting');
    };
  }, []);

  // Check if user has submitted application and fetch application ID
  useEffect(() => {
    console.log('UserApplicationReview useEffect triggered');
    const checkApplicationStatus = async () => {
      if (!user?.id) {
        console.log('No user ID, returning');
        return;
      }

      try {
        console.log('Checking application status for user:', user.id);
        
        // First check user_data table for application status
        const { data: userData, error: userError } = await supabase
          .from('user_data')
          .select('application_status')
          .eq('id', user.id)
          .single();

        if (userError) {
          console.error('Error fetching user data:', userError);
          setError('Fehler beim Laden des Antragsstatus');
          return;
        }

        console.log('Application status data:', userData);
        if (userData?.application_status === 'pending') {
          console.log('Application not submitted, redirecting to personal-space');
          // Redirect to personal space if application is not submitted
          navigate('/personal-space', { state: { from: 'view-application' } });
          return;
        }

        // If application is submitted, fetch the application ID from applications table
        console.log('Fetching application ID from applications table');
        const { data: applicationData, error: applicationError } = await supabase
          .from('applications')
          .select('id, submitted_at')
          .eq('resident_id', user.id)
          .order('submitted_at', { ascending: false })
          .limit(1)
          .single();

        if (applicationError) {
          console.error('Error fetching application data:', applicationError);
          // Don't set error here, just log it - the application might still be viewable
          console.log('Could not fetch application ID, but continuing');
        } else {
          console.log('Application data fetched:', applicationData);
          setApplicationId(applicationData?.id || null);
        }

        console.log('Application status is submitted, setting loading to false');
        setIsLoading(false);
      } catch (err) {
        console.error('Error checking application status:', err);
        setError('Fehler beim Laden des Antragsstatus');
      }
    };

    checkApplicationStatus();
  }, [user?.id, navigate]);

  const handleCloseForm = (formId: string) => {
    setOpenForms(prev => prev.filter(id => id !== formId));
  };

  const handleCloseDocument = (docId: string) => {
    setOpenDocuments(prev => prev.filter(id => id !== docId));
  };

  const handlePopOut = (id: string, type: 'form' | 'doc') => {
    if (type === 'form') {
      // Close any previously open forms and documents
      setOpenForms([]);
      setOpenDocuments([]);
      // Open the new form
      setOpenForms([id]);
    } else {
      // Close any previously open forms and documents
      setOpenForms([]);
      setOpenDocuments([]);
      // Open the new document
      setOpenDocuments([id]);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#f8f9fa'
      }}>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#064497] mb-4">Laden...</h2>
          <p className="text-gray-600">Bitte warten Sie einen Moment.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#f8f9fa'
      }}>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Fehler</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/personal-space', { state: { from: 'view-application' } })}
            style={{
              padding: '12px 24px',
              background: '#064497',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Zurück zum persönlichen Bereich
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      height: 'calc(100vh)', // Reduced to eliminate white strip
      background: '#f7f8fa', // Same light gray as UserFormsDocsPanel
      margin: '0',
      padding: '0'
    }}>
      {/* Header */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e0e0e0',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
        flexShrink: 0
      }}>
        <div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#064497',
            margin: 0
          }}>
            Eingereichter Antrag
            {applicationId && (
              <span style={{
                fontSize: '18px',
                fontWeight: '400',
                color: '#666',
                marginLeft: '12px'
              }}>
                (ID: {applicationId})
              </span>
            )}
          </h1>
          <p style={{
            fontSize: '16px',
            color: '#666',
            margin: '4px 0 0 0'
          }}>
            Hier können Sie alle Ihre eingereichten Formulare und Dokumente einsehen
          </p>
        </div>
        <button
          onClick={() => navigate('/personal-space', { state: { from: 'view-application' } })}
          style={{
            padding: '12px 24px',
            background: '#064497',
            color: '#fff',
            border: '2px solid #064497',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgb(0, 0, 0, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#064497';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#064497';
          }}
        >
          <span style={{ fontSize: '18px' }}>←</span>
          Zurück
        </button>
      </div>

      {/* Main Content - UserFormsDocsPanel */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', background: '#f7f8fa' }}>
        <UserFormsDocsPanel 
          openForms={openForms} 
          openDocuments={openDocuments} 
          onCloseForm={handleCloseForm} 
          onCloseDocument={handleCloseDocument} 
          onPopOut={handlePopOut} 
          residentId={user?.id}
          sidebarInitiallyVisible={true}
        />
      </div>
    </div>
  );
};

export default UserApplicationReview;
