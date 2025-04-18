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
          console.log('User is authenticated, redirect to personal space');
          // Get pending eligibility data from localStorage
          const pendingData = localStorage.getItem('pendingEligibilityData');
          
          if (pendingData) {
            try {
              // Check if user already has eligibility data
              const { data: existingData, error: fetchError } = await supabase
                .from('user_data')
                .select('eligibility_data')
                .eq('id', session.user.id)
                .single();

              if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
                throw fetchError;
              }

              // Only store if no existing data
              if (!existingData?.eligibility_data) {
                await storeEligibilityData(session.user.id, JSON.parse(pendingData));
              }
              
              // Clear the temporary storage regardless
              localStorage.removeItem('pendingEligibilityData');
            } catch (error) {
              console.error('Error handling eligibility data:', error);
              // Continue to personal space even if there's an error with eligibility data
            }
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