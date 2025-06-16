import { supabase } from '../lib/supabase';

// Add backend URL constant
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

// Add TYPE_LABELS at the top of the file
const TYPE_LABELS: Record<string, string> = {
  "neubau": "Neubau Eigenheim",
  "ersterwerb-eigenheim": "Ersterwerb Eigenheim",
  "bestandserwerb-eigenheim": "Bestandserwerb Eigenheim",
  "bestandserwerb-wohnung": "Bestandserwerb Eigentumswohnung",
  "ersterwerb-wohnung": "Ersterwerb Eigentumswohnung",
  "nutzungsaenderung": "Nutzungsänderung"
};

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

export const sendSharedApplicationMessage = async (
  recipientId: string,
  senderId: string,
  applicationIds: string[],
  comment?: string,
  emailData?: { toName?: string; appIds: string[]; customMessage: string },
  checklistItems?: { id: string; title: string }[]
) => {
  try {
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

    // Plural/singular logic
    const isPlural = applicationIds.length > 1;
    const appList = applicationIds.map(id => `"${id}"`).join(isPlural ? ', ' : '');
    const appListWithAnd = isPlural ? appList.replace(/, ([^,]*)$/, ' & $1') : appList;
    const inAppTitle = isPlural ? 'Anträge geteilt' : 'Antrag geteilt';
    const inAppIntro = isPlural
      ? `${senderData.name ? `${senderData.name} (${senderData.email})` : senderData.email} hat Ihnen die Anträge ${appListWithAnd} geteilt.`
      : `${senderData.name ? `${senderData.name} (${senderData.email})` : senderData.email} hat Ihnen den Antrag ${appListWithAnd} geteilt.`;
    const messageContent = comment
      ? comment
      : `${inAppIntro}\n\nNachricht: ${emailData?.customMessage || ''}`;

    // Send internal message
    const metadata: any = { application_id: applicationIds };
    if (checklistItems && checklistItems.length > 0) {
      metadata.checklist_items = checklistItems;
    }
    const messageSent = await sendMessage({
      recipient_id: recipientId,
      sender_id: senderId,
      type: 'team',
      category: 'shared_application',
      title: inAppTitle,
      content: messageContent,
      metadata
    });

    // Check if email notifications are enabled for shared applications
    const shouldSendEmail = recipientData.settings?.notifications?.emailNotifications?.applicationShared === true;

    // Send email if enabled
    if (shouldSendEmail) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No access token available in session');
        throw new Error('No access token available');
      }
      const jwtToken = session.access_token;

      // Compose email content
      let emailContent = messageContent;
      let emailTitle = inAppTitle;
      if (emailData) {
        const greeting = emailData.toName ? `Sehr geehrte/r ${emailData.toName},` : 'Guten Tag,';
        const isPluralEmail = emailData.appIds.length > 1;
        const appListEmailHtml = emailData.appIds.map(id => `<b>"${id}"</b>`).join(isPluralEmail ? ', ' : '');
        const appListWithAndEmail = isPluralEmail ? appListEmailHtml.replace(/, ([^,]*)$/, ' & $1') : appListEmailHtml;
        const senderInfo = senderData.name ? `${senderData.name} (${senderData.email})` : senderData.email;
        const intro = isPluralEmail
          ? `\n\n${senderInfo} hat die Anträge ${appListWithAndEmail} mit folgender Nachricht an Sie geteilt:`
          : `\n\n${senderInfo} hat den Antrag ${appListWithAndEmail} mit folgender Nachricht an Sie geteilt:`;
        const closing = `\n\nDies ist eine automatisch generierte E-Mail. Bitte antworten Sie nicht auf diese E-Mail.\n\nWenn Sie mit dem Absender in Kontakt treten möchten, wenden Sie sich bitte direkt an ${senderInfo}.\n\nMit freundlichen Grüßen,\nFördercheck.NRW`;
        emailContent = `${greeting}${intro}\n\n<i style="color: #064497">${emailData.customMessage}</i>${closing}`;
        emailTitle = isPluralEmail ? 'Anträge geteilt' : 'Antrag geteilt';
      }

      const response = await fetch(`${BACKEND_URL}/api/send-shared-application-message`, {
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
          title: emailTitle,
          content: emailContent,
          application_id: applicationIds.join(', '),
          checklist_items: checklistItems
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
    console.error('Error in sendSharedApplicationMessage:', err);
    return false;
  }
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

    // Get old agent's info and settings
    const { data: oldAgentData, error: oldAgentError } = await supabase
      .from('agents')
      .select('name, email, settings')
      .eq('id', oldAgentId)
      .single();

    if (oldAgentError) throw oldAgentError;

    // Get new agent's info and settings
    const { data: newAgentData, error: newAgentError } = await supabase
      .from('agents')
      .select('name, email, settings')
      .eq('id', newAgentId)
      .single();

    if (newAgentError) throw newAgentError;

    const senderName = senderData.name ? `${senderData.name} (${senderData.email})` : senderData.email;
    const oldAgentName = oldAgentData.name ? `${oldAgentData.name} (${oldAgentData.email})` : oldAgentData.email;
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

      // Check if old agent has email notifications enabled
      const shouldSendEmailToOldAgent = oldAgentData.settings?.notifications?.emailNotifications?.applicationAssigned === true;

      // Send email to old agent if enabled
      if (shouldSendEmailToOldAgent) {
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
            to_email: oldAgentData.email,
            to_name: oldAgentData.name,
            from_email: senderData.email,
            from_name: senderData.name,
            title: 'Antrag neu zugewiesen',
            content: content
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Failed to send email notification to old agent:', errorData);
          throw new Error(errorData.detail || 'Failed to send email notification to old agent');
        }
      }
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

      // Check if new agent has email notifications enabled
      const shouldSendEmailToNewAgent = newAgentData.settings?.notifications?.emailNotifications?.applicationAssigned === true;

      // Send email to new agent if enabled
      if (shouldSendEmailToNewAgent) {
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
          console.error('Failed to send email notification to new agent:', errorData);
          throw new Error(errorData.detail || 'Failed to send email notification to new agent');
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

export const sendNewApplicationNotification = async (applicationId: string, cityId: string, assignedAgentId: string | null) => {
  try {
    // Get all agents for the city
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('id, name, email, settings')
      .eq('city_id', cityId);

    if (agentsError) throw agentsError;

    // Get application details
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('type, resident_id')
      .eq('id', applicationId)
      .single();

    if (appError) throw appError;

    // Get resident details
    const { data: resident, error: residentError } = await supabase
      .from('user_data')
      .select('firstname, lastname')
      .eq('id', application.resident_id)
      .single();

    if (residentError) throw residentError;

    const residentName = `${resident.firstname} ${resident.lastname}`.trim();
    const formattedType = TYPE_LABELS[application.type] || application.type;

    // Get assigned agent details if there is one
    let assignedAgentName = null;
    if (assignedAgentId) {
      const { data: assignedAgent, error: assignedAgentError } = await supabase
        .from('agents')
        .select('name, email')
        .eq('id', assignedAgentId)
        .single();

      if (!assignedAgentError && assignedAgent) {
        assignedAgentName = assignedAgent.name 
          ? `${assignedAgent.name} (${assignedAgent.email})`
          : assignedAgent.email;
      }
    }

    // Get system token
    const tokenResponse = await fetch(`${BACKEND_URL}/api/system/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!tokenResponse.ok) {
      throw new Error('Failed to get system token');
    }
    const { token } = await tokenResponse.json();

    // Send notifications to each agent based on their settings
    for (const agent of agents) {
      // Skip if this is the assigned agent
      if (agent.id === assignedAgentId) continue;

      const settings = agent.settings?.notifications || {};
      const shouldSendInApp = settings.newApplications?.enabled === true;
      const shouldSendEmail = settings.newApplications?.email === true;

      if (shouldSendInApp || shouldSendEmail) {
        const assignmentInfo = assignedAgentName 
          ? `Der Antrag wurde ${assignedAgentName} zugewiesen.`
          : 'Der Antrag wurde noch keinem Sachbearbeiter zugewiesen.';

        const messageContent = `Ein neuer Antrag vom Typ "${formattedType}" (ID: ${applicationId}) wurde eingereicht von ${residentName}. ${assignmentInfo}`;

        // Send in-app message if enabled
        if (shouldSendInApp) {
          await sendMessage({
            recipient_id: agent.id,
            type: 'system',
            category: 'new_application',
            title: 'Neuer Antrag eingegangen',
            content: messageContent,
            metadata: { application_id: applicationId }
          });
        }

        // Send email if enabled
        if (shouldSendEmail) {
          const response = await fetch(`${BACKEND_URL}/api/send-new-application-message`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              to_email: agent.email,
              to_name: agent.name,
              from_email: 'system@foerdercheck.nrw',
              from_name: 'Fördercheck.NRW',
              title: 'Neuer Antrag eingegangen',
              content: messageContent
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Failed to send email notification:', errorData);
            throw new Error(errorData.detail || 'Failed to send email notification');
          }
        }
      }
    }

    return true;
  } catch (err) {
    console.error('Error in sendNewApplicationNotification:', err);
    return false;
  }
}; 