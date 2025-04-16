import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

export const signInWithMagicLink = async (email: string) => {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw error;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const storeEligibilityData = async (userId: string, eligibilityData: any) => {
  try {
    const { data, error } = await supabase
      .from('user_data')
      .insert([
        {
          id: userId,
          eligibility_data: eligibilityData,
          created_at: new Date().toISOString(),
          application_status: 'pending'
        }
      ]);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error storing eligibility data:', error);
    throw error;
  }
}; 