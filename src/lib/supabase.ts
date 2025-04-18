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
      .update({
        adult_count: eligibilityData.adultCount,
        child_count: eligibilityData.childCount,
        is_disabled: eligibilityData.isDisabled,
        is_married: eligibilityData.isMarried,
        is_retired: eligibilityData.isRetired,
        gross_income: eligibilityData.grossIncome,
        net_income: eligibilityData.netIncome,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error storing eligibility data:', error);
    throw error;
  }
}; 