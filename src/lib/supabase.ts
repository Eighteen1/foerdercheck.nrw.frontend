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

export const storeEligibilityData = async (userId: string, data: any) => {
  const { error } = await supabase
    .from('user_data')
    .upsert({
      id: userId,
      adult_count: data.adultCount,
      child_count: data.childCount,
      is_disabled: data.isDisabled,
      is_married: data.isMarried,
      is_retired: data.isRetired,
      gross_income: data.grossIncome,
      net_income: data.netIncome,
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error('Error storing eligibility data:', error);
    throw error;
  }
};

export const storeDocumentCheckData = async (userId: string, documentCheckData: any) => {
  try {
    // First, update the user_data table with the answers
    const { data: userData, error: userError } = await supabase
      .from('user_data')
      .update({
        hasinheritanceright: documentCheckData.answers.hasInheritanceRight,
        haslocationcostloan: documentCheckData.answers.hasLocationCostLoan,
        haswoodconstructionloan: documentCheckData.answers.hasWoodConstructionLoan,
        hasbegstandardloan: documentCheckData.answers.hasBEGStandardLoan,
        ispregnant: documentCheckData.answers.isPregnant,
        hasauthorizedperson: documentCheckData.answers.hasAuthorizedPerson,
        is_married: documentCheckData.answers.isMarried,
        is_disabled: documentCheckData.answers.isDisabled,
        completeddoccheck: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (userError) throw userError;

    // Then, update or insert the foerderVariante in object_data
    const { data: objectData, error: objectError } = await supabase
      .from('object_data')
      .upsert({
        user_id: userId,
        foerderVariante: documentCheckData.foerderVariante,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (objectError) throw objectError;

    return { userData, objectData };
  } catch (error) {
    console.error('Error storing document check data:', error);
    throw error;
  }
};

export const getDocumentCheckData = async (userId: string) => {
  try {
    // Get data from user_data table
    const { data: userData, error: userError } = await supabase
      .from('user_data')
      .select(`
        hasinheritanceright,
        haslocationcostloan,
        haswoodconstructionloan,
        hasbegstandardloan,
        ispregnant,
        hasauthorizedperson,
        is_married,
        is_disabled,
        document_status
      `)
      .eq('id', userId)
      .single();

    if (userError) throw userError;
    
    // Get foerderVariante from object_data table
    const { data: objectData, error: objectError } = await supabase
      .from('object_data')
      .select('foerderVariante')
      .eq('user_id', userId)
      .single();

    if (objectError && objectError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw objectError;
    }
    
    if (!userData) return null;

    return {
      foerderVariante: objectData?.foerderVariante || '',
      answers: {
        hasInheritanceRight: userData.hasinheritanceright,
        hasLocationCostLoan: userData.haslocationcostloan,
        hasWoodConstructionLoan: userData.haswoodconstructionloan,
        hasBEGStandardLoan: userData.hasbegstandardloan,
        isPregnant: userData.ispregnant,
        hasAuthorizedPerson: userData.hasauthorizedperson,
        isMarried: userData.is_married,
        isDisabled: userData.is_disabled
      },
      documentStatus: userData.document_status || {}
    };
  } catch (error) {
    console.error('Error getting document check data:', error);
    throw error;
  }
};

export const getUserDocuments = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_documents')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user documents:', error);
    return [];
  }

  return data;
};

export const uploadDocument = async (userId: string, documentId: string, file: File) => {
  try {
    const filePath = `${userId}/${documentId}/${file.name}`;

    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    // Get current document_status
    const { data: userData, error: fetchError } = await supabase
      .from('user_data')
      .select('document_status')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;

    // Update document status in user_data
    const documentStatus = {
      ...(userData?.document_status || {}),
      [documentId]: {
        uploaded: true,
        fileName: file.name,
        filePath: filePath,
        uploadedAt: new Date().toISOString()
      }
    };

    const { error: updateError } = await supabase
      .from('user_data')
      .update({
        document_status: documentStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    return { filePath, publicUrl };
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
};

export const removeDocument = async (userId: string, documentId: string, fileName: string) => {
  try {
    const filePath = `${userId}/${documentId}/${fileName}`;

    // Remove file from storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([filePath]);

    if (storageError) throw storageError;

    // Get current document_status
    const { data: userData, error: fetchError } = await supabase
      .from('user_data')
      .select('document_status')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;

    // Update document status in user_data
    const documentStatus = userData?.document_status || {};
    delete documentStatus[documentId];

    const { error: updateError } = await supabase
      .from('user_data')
      .update({
        document_status: documentStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) throw updateError;
  } catch (error) {
    console.error('Error removing document:', error);
    throw error;
  }
};

export const checkDocumentCheckStatus = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_data')
      .select('completeddoccheck')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data?.completeddoccheck || false;
  } catch (error) {
    console.error('Error checking document check status:', error);
    return false;
  }
}; 