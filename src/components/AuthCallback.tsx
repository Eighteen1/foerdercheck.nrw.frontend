import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, storeEligibilityData } from '../lib/supabase';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      console.log('AuthCallback: Starting callback handling');
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('AuthCallback: Session check result:', {
          hasSession: !!session,
          error,
          user: session?.user
        });

        if (error) {
          console.error('AuthCallback: Error getting session:', error);
          navigate('/login');
          return;
        }

        if (session?.user) {
          console.log('AuthCallback: User is authenticated, redirect to personal space');
          // Get pending eligibility data from localStorage
          const pendingData = localStorage.getItem('pendingEligibilityData');
          console.log('AuthCallback: Pending eligibility data:', pendingData);
          
          if (pendingData) {
            try {
              // Check if user already has eligibility data
              const { data: existingData, error: fetchError } = await supabase
                .from('user_data')
                .select('adult_count, child_count, is_disabled, is_married, is_retired, gross_income, net_income')
                .eq('id', session.user.id)
                .single();

              console.log('AuthCallback: Existing data check result:', {
                hasExistingData: !!existingData,
                error: fetchError
              });

              if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
                throw fetchError;
              }

              // Only store if no existing data
              if (!existingData?.adult_count) {
                console.log('AuthCallback: Storing eligibility data');
                await storeEligibilityData(session.user.id, JSON.parse(pendingData), session.user.email);
              }
              
              // Clear the temporary storage regardless
              localStorage.removeItem('pendingEligibilityData');
            } catch (error) {
              console.error('AuthCallback: Error handling eligibility data:', error);
              // Continue to personal space even if there's an error with eligibility data
            }
          }
          
          navigate('/personal-space');
        } else {
          console.log('AuthCallback: User is not authenticated, redirect to login');
          navigate('/login');
        }
      } catch (error) {
        console.error('AuthCallback: Error in auth callback:', error);
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