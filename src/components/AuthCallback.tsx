import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, storeEligibilityData } from '../lib/supabase';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          navigate('/login');
          return;
        }

        if (session?.user) {
          console.error('User is authenticated, redirect to personal space');
          // Get pending eligibility data from localStorage
          const pendingData = localStorage.getItem('pendingEligibilityData');
          
          if (pendingData) {
            // Store the data in the database
            await storeEligibilityData(session.user.id, JSON.parse(pendingData));
            // Clear the temporary storage
            localStorage.removeItem('pendingEligibilityData');
          }
          
          navigate('/personal-space');
        } else {
          console.error('User is not authenticated, redirect to login');
          navigate('/login');
        }
      } catch (error) {
        console.error('Error handling auth callback:', error);
        navigate('/login');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[#064497] mb-4">Anmeldung wird verarbeitet...</h2>
        <p className="text-gray-600">Bitte warten Sie einen Moment.</p>
      </div>
    </div>
  );
};

export default AuthCallback; 