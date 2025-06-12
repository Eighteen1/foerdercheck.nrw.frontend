import { supabase } from '../lib/supabase';

// Add backend URL constant
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

export interface MessageData {
  recipient_id: string;
  sender_id?: string;
  type: 'system' | 'team';
  category: string;
  title: string;
  content: string;
  metadata?: any;
}

export const sendMessage = async (messageData: MessageData) => {
  try {
    const { error } = await supabase
      .from('messages')
      .insert([messageData]);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error sending message:', err);
    return false;
  }
};

// Helper functions for common message types
export const sendNewApplicationMessage = async (recipientId: string, applicationId: string) => {
  return sendMessage({
    recipient_id: recipientId,
    type: 'system',
    category: 'new_application',
    title: 'Neuer Antrag eingegangen',
    content: 'Ein neuer Antrag wurde eingereicht und wartet auf Ihre Bearbeitung.',
    metadata: { application_id: applicationId }
  });
};

export const sendSharedApplicationMessage = async (recipientId: string, senderId: string, applicationId: string) => {
  return sendMessage({
    recipient_id: recipientId,
    sender_id: senderId,
    type: 'team',
    category: 'shared_application',
    title: 'Antrag geteilt',
    content: 'Ein Antrag wurde mit Ihnen geteilt.',
    metadata: { application_id: applicationId }
  });
};

export const sendPasswordReminderMessage = async (recipientId: string, senderId: string, content?: string) => {
  try {
    // Get recipient's settings and info
    const { data: recipientData, error: recipientError } = await supabase
      .from('agents')
      .select('email, name, settings')
      .eq('id', recipientId)
      .single();

    if (recipientError) throw recipientError;

    // Get sender's info
    const { data: senderData, error: senderError } = await supabase
      .from('agents')
      .select('email, name')
      .eq('id', senderId)
      .single();

    if (senderError) throw senderError;

    // Check if email notifications are enabled for admin messages
    const shouldSendEmail = recipientData.settings?.notifications?.emailNotifications?.adminMessage === true;

    // Send internal message
    const messageSent = await sendMessage({
      recipient_id: recipientId,
      sender_id: senderId,
      type: 'team',
      category: 'password_reminder',
      title: 'Passwort-Erneuerung erforderlich',
      content: content || 'Bitte aktualisieren Sie Ihr Passwort aus Sicherheitsgründen.'
    });

    // Send email if enabled
    if (shouldSendEmail) {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session:', session); // Debug log
      
      if (!session?.access_token) {
        console.error('No access token available in session');
        throw new Error('No access token available');
      }

      // Get the JWT token from the session
      const jwtToken = session.access_token;
      console.log('Sending request with token:', jwtToken.substring(0, 20) + '...'); // Debug log

      const response = await fetch(`${BACKEND_URL}/api/send-admin-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({
          to_email: recipientData.email,
          to_name: recipientData.name,
          from_email: senderData.email,
          from_name: senderData.name,
          title: 'Passwort-Erneuerung erforderlich',
          content: content || 'Bitte aktualisieren Sie Ihr Passwort aus Sicherheitsgründen.'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to send email notification:', errorData);
        throw new Error(errorData.detail || 'Failed to send email notification');
      }
    }

    return messageSent;
  } catch (err) {
    console.error('Error in sendPasswordReminderMessage:', err);
    return false;
  }
};

export const sendMFAReminderMessage = async (recipientId: string, senderId: string, content?: string) => {
  try {
    // Get recipient's settings and info
    const { data: recipientData, error: recipientError } = await supabase
      .from('agents')
      .select('email, name, settings')
      .eq('id', recipientId)
      .single();

    if (recipientError) throw recipientError;

    // Get sender's info
    const { data: senderData, error: senderError } = await supabase
      .from('agents')
      .select('email, name')
      .eq('id', senderId)
      .single();

    if (senderError) throw senderError;

    // Check if email notifications are enabled for admin messages
    const shouldSendEmail = recipientData.settings?.notifications?.emailNotifications?.adminMessage === true;

    // Send internal message
    const messageSent = await sendMessage({
      recipient_id: recipientId,
      sender_id: senderId,
      type: 'team',
      category: 'mfa_reminder',
      title: 'MFA-Einrichtung erforderlich',
      content: content || 'Bitte richten Sie die Zwei-Faktor-Authentifizierung ein, um Ihr Konto zu schützen.'
    });

    // Send email if enabled
    if (shouldSendEmail) {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session:', session); // Debug log
      
      if (!session?.access_token) {
        console.error('No access token available in session');
        throw new Error('No access token available');
      }

      // Get the JWT token from the session
      const jwtToken = session.access_token;
      console.log('Sending request with token:', jwtToken.substring(0, 20) + '...'); // Debug log

      const response = await fetch(`${BACKEND_URL}/api/send-admin-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({
          to_email: recipientData.email,
          to_name: recipientData.name,
          from_email: senderData.email,
          from_name: senderData.name,
          title: 'MFA-Einrichtung erforderlich',
          content: content || 'Bitte richten Sie die Zwei-Faktor-Authentifizierung ein, um Ihr Konto zu schützen.'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to send email notification:', errorData);
        throw new Error(errorData.detail || 'Failed to send email notification');
      }
    }

    return messageSent;
  } catch (err) {
    console.error('Error in sendMFAReminderMessage:', err);
    return false;
  }
};

export const sendApplicationAssignedMessage = async (recipientId: string, senderId: string, applicationId: string) => {
  try {
    // Don't send message if assigning to self
    if (recipientId === senderId) return true;

    // Get recipient's settings and info
    const { data: recipientData, error: recipientError } = await supabase
      .from('agents')
      .select('name, email, settings')
      .eq('id', recipientId)
      .single();

    if (recipientError) throw recipientError;

    // Get sender's info
    const { data: senderData, error: senderError } = await supabase
      .from('agents')
      .select('name, email')
      .eq('id', senderId)
      .single();

    if (senderError) throw senderError;

    const senderName = senderData.name ? `${senderData.name} (${senderData.email})` : senderData.email;
    const messageContent = `Ihr Administrator ${senderName} hat Ihnen den Antrag zugewiesen: ${applicationId}`;

    // Send internal message
    const messageSent = await sendMessage({
      recipient_id: recipientId,
      sender_id: senderId,
      type: 'team',
      category: 'application_assigned',
      title: 'Neuer Antrag zugewiesen',
      content: messageContent,
      metadata: { application_id: applicationId }
    });

    // Check if email notifications are enabled for application assignments
    const shouldSendEmail = recipientData.settings?.notifications?.emailNotifications?.applicationAssigned === true;

    // Send email if enabled
    if (shouldSendEmail) {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.error('No access token available in session');
        throw new Error('No access token available');
      }

      const jwtToken = session.access_token;

      const response = await fetch(`${BACKEND_URL}/api/send-assignment-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({
          to_email: recipientData.email,
          to_name: recipientData.name,
          from_email: senderData.email,
          from_name: senderData.name,
          title: 'Neuer Antrag zugewiesen',
          content: messageContent
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to send email notification:', errorData);
        throw new Error(errorData.detail || 'Failed to send email notification');
      }
    }

    return messageSent;
  } catch (err) {
    console.error('Error in sendApplicationAssignedMessage:', err);
    return false;
  }
};

export const sendApplicationReassignedMessage = async (oldAgentId: string, newAgentId: string, senderId: string, applicationId: string) => {
  try {
    // Get sender's info
    const { data: senderData, error: senderError } = await supabase
      .from('agents')
      .select('name, email, role')
      .eq('id', senderId)
      .single();

    if (senderError) throw senderError;

    // Get new agent's info
    const { data: newAgentData, error: newAgentError } = await supabase
      .from('agents')
      .select('name, email, settings')
      .eq('id', newAgentId)
      .single();

    if (newAgentError) throw newAgentError;

    const senderName = senderData.name ? `${senderData.name} (${senderData.email})` : senderData.email;
    const newAgentName = newAgentData.name ? `${newAgentData.name} (${newAgentData.email})` : newAgentData.email;

    // Send message to old agent if not self
    if (oldAgentId !== senderId) {
      let content = '';
      if (senderData.role === 'admin' || senderData.role === 'owner') {
        content = `Ihr Administrator ${senderName} hat den Antrag an ${newAgentName} neu zugewiesen: ${applicationId}. Sie sind nicht mehr für diesen Antrag zuständig.`;
      } else if (senderData.role === 'agent') {
        content = `Ihr Team Mitglied ${senderName} hat den Antrag ${applicationId} an sich Selber zugewiesen. Sie sind nicht mehr für diesen Antrag zuständig.`;
      }

      await sendMessage({
        recipient_id: oldAgentId,
        sender_id: senderId,
        type: 'team',
        category: 'application_reassigned',
        title: 'Antrag neu zugewiesen',
        content: content,
        metadata: { application_id: applicationId }
      });
    }

    // Send message to new agent only if not self-assignment
    if (newAgentId !== senderId) {
      let content = '';
      if (senderData.role === 'admin' || senderData.role === 'owner') {
        content = `Ihr Administrator ${senderName} hat Ihnen den Antrag zugewiesen: ${applicationId}`;
      } else if (senderData.role === 'agent') {
        content = `Ihr Team Mitglied ${senderName} hat den Antrag ${applicationId} an sich zugewiesen.`;
      }

      const messageSent = await sendMessage({
        recipient_id: newAgentId,
        sender_id: senderId,
        type: 'team',
        category: 'application_assigned',
        title: 'Antrag zugewiesen',
        content: content,
        metadata: { application_id: applicationId }
      });

      // Check if email notifications are enabled for application assignments
      const shouldSendEmail = newAgentData.settings?.notifications?.emailNotifications?.applicationAssigned === true;

      // Send email if enabled
      if (shouldSendEmail) {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          console.error('No access token available in session');
          throw new Error('No access token available');
        }

        const jwtToken = session.access_token;

        const response = await fetch(`${BACKEND_URL}/api/send-assignment-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
          },
          body: JSON.stringify({
            to_email: newAgentData.email,
            to_name: newAgentData.name,
            from_email: senderData.email,
            from_name: senderData.name,
            title: 'Antrag zugewiesen',
            content: content
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Failed to send email notification:', errorData);
          throw new Error(errorData.detail || 'Failed to send email notification');
        }
      }

      return messageSent;
    }

    return true;
  } catch (err) {
    console.error('Error in sendApplicationReassignedMessage:', err);
    return false;
  }
};

export const sendApplicationUnassignedMessage = async (oldAgentId: string, senderId: string, applicationId: string) => {
  try {
    // Don't send message if unassigning from self
    if (oldAgentId === senderId) return true;

    // Get recipient's settings and info
    const { data: recipientData, error: recipientError } = await supabase
      .from('agents')
      .select('name, email, settings')
      .eq('id', oldAgentId)
      .single();

    if (recipientError) throw recipientError;

    // Get sender's info
    const { data: senderData, error: senderError } = await supabase
      .from('agents')
      .select('name, email')
      .eq('id', senderId)
      .single();

    if (senderError) throw senderError;

    const senderName = senderData.name ? `${senderData.name} (${senderData.email})` : senderData.email;
    const messageContent = `Ihr Administrator ${senderName} hat die Zuweisung für den Antrag aufgehoben: ${applicationId}. Sie sind nicht mehr für diesen Antrag zuständig.`;

    // Send internal message
    const messageSent = await sendMessage({
      recipient_id: oldAgentId,
      sender_id: senderId,
      type: 'team',
      category: 'application_unassigned',
      title: 'Antrag nicht mehr zugewiesen',
      content: messageContent,
      metadata: { application_id: applicationId }
    });

    // Check if email notifications are enabled for application assignments
    const shouldSendEmail = recipientData.settings?.notifications?.emailNotifications?.applicationAssigned === true;

    // Send email if enabled
    if (shouldSendEmail) {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.error('No access token available in session');
        throw new Error('No access token available');
      }

      const jwtToken = session.access_token;

      const response = await fetch(`${BACKEND_URL}/api/send-assignment-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({
          to_email: recipientData.email,
          to_name: recipientData.name,
          from_email: senderData.email,
          from_name: senderData.name,
          title: 'Antrag nicht mehr zugewiesen',
          content: messageContent
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to send email notification:', errorData);
        throw new Error(errorData.detail || 'Failed to send email notification');
      }
    }

    return messageSent;
  } catch (err) {
    console.error('Error in sendApplicationUnassignedMessage:', err);
    return false;
  }
}; 