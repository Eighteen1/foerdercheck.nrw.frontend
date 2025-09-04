import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'foerdercheck-frontend'
    }
  }
});

// Global error handler for JWT token errors
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.debug('[Supabase] Token refreshed successfully');
  }
});

// Add global error interceptor to handle JWT errors gracefully
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  try {
    const response = await originalFetch(...args);
    
    // Check if the response contains JWT-related errors
    if (!response.ok) {
      const responseText = await response.text();
      
      // Check for JWT token errors
      if (responseText.includes('InvalidJWTToken') || 
          responseText.includes('JWT expired') ||
          responseText.includes('invalid_token')) {
        
        console.debug('[Supabase] JWT token error detected, attempting to refresh session');
        
        try {
          // Try to refresh the session
          const { data, error } = await supabase.auth.refreshSession();
          
          if (error || !data.session) {
            console.debug('[Supabase] Session refresh failed');
            
            // Only redirect to login if we're not already on a public page or login page
            const currentPath = window.location.pathname;
            const isPublicPage = currentPath === '/' || 
                                currentPath === '/government' || 
                                currentPath === '/government/login' ||
                                currentPath === '/auth/callback' ||
                                currentPath === '/login' ||
                                currentPath === '/verify' ||
                                currentPath === '/application-types' ||
                                currentPath === '/password-protection' ||
                                currentPath === '/initial-check' ||
                                currentPath === '/ic-results' ||
                                currentPath.startsWith('/verify/');
            
            if (!isPublicPage) {
              console.debug('[Supabase] Redirecting to login from protected page');
              window.location.href = '/government/login';
            } else {
              console.debug('[Supabase] On public page, not redirecting to login');
            }
            
            return response;
          }
          
          // If refresh successful, retry the original request
          console.debug('[Supabase] Session refreshed, retrying request');
          return await originalFetch(...args);
        } catch (refreshError) {
          console.debug('[Supabase] Session refresh error:', refreshError);
          
          // Only redirect to login if we're not already on a public page or login page
          const currentPath = window.location.pathname;
          const isPublicPage = currentPath === '/' || 
                              currentPath === '/government' || 
                              currentPath === '/government/login' ||
                              currentPath === '/auth/callback' ||
                              currentPath === '/login' ||
                              currentPath === '/verify' ||
                              currentPath === '/application-types' ||
                              currentPath === '/password-protection' ||
                              currentPath === '/initial-check' ||
                              currentPath === '/ic-results' ||
                              currentPath.startsWith('/verify/');
          
          if (!isPublicPage) {
            console.debug('[Supabase] Redirecting to login from protected page after refresh error');
            window.location.href = '/government/login';
          } else {
            console.debug('[Supabase] On public page, not redirecting to login after refresh error');
          }
          
          return response;
        }
      }
    }
    
    return response;
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.debug('[Supabase] Network error, checking session status');
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          // Only redirect to login if we're not already on a public page or login page
          const currentPath = window.location.pathname;
          const isPublicPage = currentPath === '/' || 
                              currentPath === '/government' || 
                              currentPath === '/government/login' ||
                              currentPath === '/auth/callback' ||
                              currentPath === '/login' ||
                              currentPath === '/verify' ||
                              currentPath === '/application-types' ||
                              currentPath === '/password-protection' ||
                              currentPath === '/initial-check' ||
                              currentPath === '/ic-results' ||
                              currentPath.startsWith('/verify/');
          
          if (!isPublicPage) {
            console.debug('[Supabase] No session found, redirecting to login from protected page');
            window.location.href = '/government/login';
          } else {
            console.debug('[Supabase] No session found, but on public page - not redirecting');
          }
        }
      } catch (sessionError) {
        console.debug('[Supabase] Session check failed:', sessionError);
        
        // Only redirect to login if we're not already on a public page or login page
        const currentPath = window.location.pathname;
        const isPublicPage = currentPath === '/' || 
                            currentPath === '/government' || 
                            currentPath === '/government/login' ||
                            currentPath === '/auth/callback' ||
                            currentPath === '/login' ||
                            currentPath === '/verify' ||
                            currentPath === '/application-types' ||
                            currentPath === '/password-protection' ||
                            currentPath === '/initial-check' ||
                            currentPath === '/ic-results' ||
                            currentPath.startsWith('/verify/');
        
        if (!isPublicPage) {
          console.debug('[Supabase] Session check failed, redirecting to login from protected page');
          window.location.href = '/government/login';
        } else {
          console.debug('[Supabase] Session check failed, but on public page - not redirecting');
        }
      }
    }
    
    throw error;
  }
};

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

export const storeEligibilityData = async (userId: string, data: any, email?: string) => {
  // Get the current user's email if not provided
  let userEmail = email;
  if (!userEmail) {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Error getting user:', userError);
      throw userError;
    }
    userEmail = user?.email;
  }

  const { error } = await supabase
    .from('user_data')
    .upsert({
      id: userId,
      email: userEmail,  // Set the email field to the authenticated user's email
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
    console.error('Error storing eligibility dataa:', error);
    throw error;
  }
};

export const storeDocumentCheckData = async (userId: string, documentCheckData: any) => {
  try {
    // Get the current user's email
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Error getting user:', userError);
      throw userError;
    }

    // First, upsert the user_data table with the answers
    const { data: userData, error: userDataError } = await supabase
      .from('user_data')
      .upsert({
        id: userId,
        email: user?.email,  // Set the email field to the authenticated user's email
        hasinheritanceright: documentCheckData.answers.hasInheritanceRight,
        hasbegstandardloan: documentCheckData.answers.hasBEGStandardLoan,
        ispregnant: documentCheckData.answers.isPregnant,
        hasauthorizedperson: documentCheckData.answers.hasAuthorizedPerson,
        is_married: documentCheckData.answers.isMarried,
        is_disabled: documentCheckData.answers.isDisabled,
        completeddoccheck: true,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (userDataError) throw userDataError;

    // Update or insert the foerderVariante and loan-related fields in object_data
    const { data: objectData, error: objectError } = await supabase
      .from('object_data')
      .upsert({
        user_id: userId,
        foerderVariante: documentCheckData.foerderVariante,
        haslocationcostloan: documentCheckData.answers.hasLocationCostLoan,
        haswoodconstructionloan: documentCheckData.answers.hasWoodConstructionLoan
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
      .select(`
        foerderVariante,
        haslocationcostloan,
        haswoodconstructionloan
        `)
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
        hasLocationCostLoan: objectData?.haslocationcostloan,
        hasWoodConstructionLoan: objectData?.haswoodconstructionloan,
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

    // Get the current user's email
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Error getting user:', userError);
      throw userError;
    }

    const { error: updateError } = await supabase
      .from('user_data')
      .upsert({
        id: userId,
        email: user?.email,  // Set the email field to the authenticated user's email
        document_status: documentStatus,
        updated_at: new Date().toISOString()
      });

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

    // Get the current user's email
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Error getting user:', userError);
      throw userError;
    }

    const { error: updateError } = await supabase
      .from('user_data')
      .upsert({
        id: userId,
        email: user?.email,  // Set the email field to the authenticated user's email
        document_status: documentStatus,
        updated_at: new Date().toISOString()
      });

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

export const ensureUserFinancialsExists = async (userId: string) => {
  try {
    // Use upsert to ensure a record exists - this will create one if it doesn't exist
    // or update an existing one (though with empty values, it won't change anything)
    const { error: upsertError } = await supabase
      .from('user_financials')
      .upsert({
        user_id: userId,
        // All fields will be null/empty by default
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id' // This assumes there's a unique constraint on user_id
      });

    if (upsertError) {
      // If there's no unique constraint on user_id, we'll get an error
      // In that case, try a different approach - check if any record exists
      if (upsertError.code === '42703' || upsertError.message?.includes('user_id')) {
        console.log('No unique constraint on user_id, checking if any record exists...');
        
        const { data: existingRecords, error: checkError } = await supabase
          .from('user_financials')
          .select('id')
          .eq('user_id', userId)
          .limit(1);

        if (checkError) {
          console.error('Error checking user_financials records:', checkError);
          throw checkError;
        }

        if (existingRecords && existingRecords.length > 0) {
          console.log('user_financials record already exists for user:', userId);
          return true;
        } else {
          // No record exists, create one
          const { error: insertError } = await supabase
            .from('user_financials')
            .insert({
              user_id: userId,
              // All fields will be null/empty by default
            });

          if (insertError) {
            console.error('Error creating user_financials record:', insertError);
            throw insertError;
          }

          console.log('Successfully created empty user_financials record');
          return true;
        }
      }
      
      // For other errors, log and throw
      console.error('Error upserting user_financials record:', upsertError);
      throw upsertError;
    }

    console.log('Successfully ensured user_financials record exists');
    return true;
  } catch (error) {
    console.error('Error in ensureUserFinancialsExists:', error);
    throw error;
  }
}; 