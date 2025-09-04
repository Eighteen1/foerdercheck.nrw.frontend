import { supabase } from '../lib/supabase';

export interface UserTypeInfo {
  isAgent: boolean;
  isResident: boolean;
  userType: 'agent' | 'resident' | 'unknown';
  agentData?: {
    name: string | null;
    city: string | null;
    role: string | null;
  };
}

/**
 * Check if the current authenticated user is an agent or resident
 * @returns Promise<UserTypeInfo> - Information about the user type
 */
export const checkUserType = async (): Promise<UserTypeInfo> => {
  try {
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.warn('Session error in checkUserType:', sessionError);
      return {
        isAgent: false,
        isResident: false,
        userType: 'unknown'
      };
    }
    
    if (!session?.user) {
      return {
        isAgent: false,
        isResident: false,
        userType: 'unknown'
      };
    }

    const userId = session.user.id;
    console.log('Checking user type for user ID:', userId);

    // Check if user is an agent by looking in agents table
    const { data: agentData, error: agentError } = await supabase
      .from('agents')
      .select('name, city_id, role')
      .eq('id', userId)
      .single();

    if (agentData && !agentError) {
      console.log('User found in agents table:', agentData);
      // User is an agent, get city name
      let cityName = null;
      if (agentData.city_id) {
        const { data: cityData } = await supabase
          .from('cities')
          .select('name')
          .eq('id', agentData.city_id)
          .single();
        cityName = cityData?.name || null;
      }

      return {
        isAgent: true,
        isResident: false,
        userType: 'agent',
        agentData: {
          name: agentData.name,
          city: cityName,
          role: agentData.role
        }
      };
    }

    // If user has city metadata, they're likely an agent (even if not in agents table yet)
    if (session.user.user_metadata?.city) {
      console.log('User has city metadata, treating as agent:', session.user.user_metadata);
      return {
        isAgent: true,
        isResident: false,
        userType: 'agent',
        agentData: {
          name: session.user.user_metadata?.name || null,
          city: session.user.user_metadata?.city || null,
          role: session.user.user_metadata?.role || null
        }
      };
    }

    // Check if user is a resident by looking in user_data table
    const { data: userData, error: userError } = await supabase
      .from('user_data')
      .select('id')
      .eq('id', userId)
      .single();

    if (userData && !userError) {
      console.log('User found in user_data table');
      return {
        isAgent: false,
        isResident: true,
        userType: 'resident'
      };
    }

    // Default case: unknown user type (new user who hasn't been added to any table yet)
    console.log('User not found in any table, type: unknown');
    return {
      isAgent: false,
      isResident: false,
      userType: 'unknown'
    };

  } catch (error) {
    console.error('Error checking user type:', error);
    return {
      isAgent: false,
      isResident: false,
      userType: 'unknown'
    };
  }
};
