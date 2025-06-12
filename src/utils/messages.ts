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
      if (!session?.access_token) throw new Error('No access token available');

      const response = await fetch(`${BACKEND_URL}/api/send-admin-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
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
        console.error('Failed to send email notification');
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
      if (!session?.access_token) throw new Error('No access token available');

      const response = await fetch(`${BACKEND_URL}/api/send-admin-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
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
        console.error('Failed to send email notification');
      }
    }

    return messageSent;
  } catch (err) {
    console.error('Error in sendMFAReminderMessage:', err);
    return false;
  }
}; 