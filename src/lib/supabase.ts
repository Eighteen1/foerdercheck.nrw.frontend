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

export const storeDocumentCheckData = async (userId: string, documentCheckData: any) => {
  try {
    const { data, error } = await supabase
      .from('user_data')
      .update({
        propertytype: documentCheckData.propertyType,
        hasinheritanceright: documentCheckData.answers.hasInheritanceRight,
        haslocationcostloan: documentCheckData.answers.hasLocationCostLoan,
        haswoodconstructionloan: documentCheckData.answers.hasWoodConstructionLoan,
        hasbegstandardloan: documentCheckData.answers.hasBEGStandardLoan,
        ispregnant: documentCheckData.answers.isPregnant,
        hasauthorizedperson: documentCheckData.answers.hasAuthorizedPerson,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error storing document check data:', error);
    throw error;
  }
};

export const getDocumentCheckData = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_data')
      .select(`
        propertytype,
        hasinheritanceright,
        haslocationcostloan,
        haswoodconstructionloan,
        hasbegstandardloan,
        ispregnant,
        hasauthorizedperson,
        is_married,
        is_disabled
      `)
      .eq('id', userId)
      .single();

    if (error) throw error;
    
    if (!data) return null;

    return {
      propertyType: data.propertytype,
      answers: {
        hasInheritanceRight: data.hasinheritanceright,
        hasLocationCostLoan: data.haslocationcostloan,
        hasWoodConstructionLoan: data.haswoodconstructionloan,
        hasBEGStandardLoan: data.hasbegstandardloan,
        isPregnant: data.ispregnant,
        hasAuthorizedPerson: data.hasauthorizedperson,
        isMarried: data.is_married,
        isDisabled: data.is_disabled
      }
    };
  } catch (error) {
    console.error('Error getting document check data:', error);
    throw error;
  }
}; 