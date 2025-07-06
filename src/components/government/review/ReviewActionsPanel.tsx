import React, { useRef, useState, useEffect } from 'react';
import { Modal, Button, Spinner, Collapse, Form } from 'react-bootstrap';
import { supabase } from '../../../lib/supabase';
import type { ChecklistItem } from '../../../types/checklist';
import { sendSharedApplicationMessage } from '../../../utils/messages';

// Add styles
const styles = `
  .menu-button {
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border-radius: 4px;
    transition: background-color 0.2s;
  }
  .menu-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  .menu-item {
    width: 100%;
    padding: 12px 16px;
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
    color: #333;
    font-size: 14px;
    transition: background-color 0.2s;
  }
  .menu-item:hover {
    background-color: #f5f5f5;
  }
`;

type ReviewActionsPanelProps = {
  applicationType: string;
  applicationId: string;
  progress: number; // Fortschritt in Prozent (0-100)
  onRequestDocs: () => void;
  onFinishReview: () => void;
  onContactApplicant?: () => void;
  onShareApplication?: () => void;
  onClose: () => void;
};

const circleSize = 44;
const strokeWidth = 5;
const radius = (circleSize - strokeWidth) / 2;
const circumference = 2 * Math.PI * radius;

const TYPE_LABELS: Record<string, string> = {
  "neubau": "Neubau Eigenheim",
  "ersterwerb-eigenheim": "Ersterwerb Eigenheim",
  "bestandserwerb-eigenheim": "Bestandserwerb Eigenheim",
  "bestandserwerb-wohnung": "Bestandserwerb Eigentumswohnung",
  "ersterwerb-wohnung": "Ersterwerb Eigentumswohnung",
  "nutzungsaenderung": "Nutzungsänderung"
};

// Document types for request modal
const DOCUMENT_TYPES: { [id: string]: {title: string, description: string, category: string, supports_multiple?: boolean} } = {
  // General Documents
  'meldebescheinigung': {
    title: 'Meldebescheinigung',
    description: 'Meldebescheinigung von allen Personen, die das Förderobjekt nach Fertigstellung beziehen sollen',
    category: 'General',
    supports_multiple: true
  },
  'bauzeichnung': {
    title: 'Bauzeichnung',
    description: 'Bauzeichnung (im Maßstab 1:100 mit eingezeichneter Möbelstellung)',
    category: 'General',
    supports_multiple: true
  },
  'lageplan': {
    title: 'Lageplan',
    description: 'Lageplan nach den Vorschriften Bau NRW (2018)',
    category: 'General',
    supports_multiple: true
  },
  'grundbuchblattkopie': {
    title: 'Grundbuchblattkopie',
    description: 'Grundbuchblattkopie nach neuestem Stand',
    category: 'General'
  },
  'baugenehmigung_vorbescheid': {
    title: 'Baugenehmigung oder Vorbescheid',
    description: 'Baugenehmigung oder Vorbescheid gemäß § 7 BauO NRW (2018)',
    category: 'General'
  },
  'bergsenkungsGebiet_erklaerung': {
    title: 'Erklärung der Bergbaugesellschaft',
    description: 'Erklärung der Bergbaugesellschaft über die Notwendigkeit von baulichen Anpassungs- und Sicherungsmaßnahmen',
    category: 'General',
    supports_multiple: true
  },
  'neubau_kaufvertrag': {
    title: 'Grundstückskaufvertrag/Entwurf des Kaufvertrags',
    description: 'Bei Neubau: Grundstückskaufvertrag/Entwurf des Kaufvertrags.',
    category: 'General'
  },
  'erbbaurechtsvertrag': {
    title: 'Erbbaurechtsvertrag',
    description: 'Vollständige Kopie des Erbbaurechtsvertrages',
    category: 'General'
  },
  'kaufvertrag': {
    title: 'Entwurf des Kaufvertrags',
    description: 'Entwurf des Kaufvertrags',
    category: 'General'
  },
  'standortbedingte_mehrkosten': {
    title: 'Nachweis für standortbedingte Mehrkosten',
    description: 'Gutachten, Rechnungen oder Kostenvoranschläge',
    category: 'General',
    supports_multiple: true
  },
  'haswoodconstructionloan': {
    title: 'Nachweis: Zusatzdarlehen für Bauen mit Holz',
    description: 'Nachweis: Zusatzdarlehen für Bauen mit Holz',
    category: 'General',
    supports_multiple: true
  },
  'beg40standard_cert': {
    title: 'Nachweis: Zusatzdarlehen für BEG Effizienzstandard 40',
    description: 'Nachweis: Zusatzdarlehen für BEG Effizienzstandard 40',
    category: 'General',
    supports_multiple: true
  },
  'pregnancy_cert': {
    title: 'Schwangerschafts Nachweis',
    description: 'Nachweis über die Schwangerschaft',
    category: 'General',
    supports_multiple: true
  },
  'marriage_cert': {
    title: 'Heiratsurkunde/Lebenspartnerschaftsurkunde',
    description: 'Aktuelle Heiratsurkunde oder Lebenspartnerschaftsurkunde',
    category: 'General',
    supports_multiple: true
  },
  'disability_cert': {
    title: 'Nachweis über die Schwerbehinderteneigenschaft/GdB',
    description: 'Nachweis über die Schwerbehinderteneigenschaft/Grad der Behinderung (GdB)',
    category: 'General',
    supports_multiple: true
  },
  'vollmacht_cert': {
    title: 'Vollmachtsurkunde',
    description: 'Vollmachtsurkunde für die bevollmächtigte Person/Firma',
    category: 'General',
    supports_multiple: true
  },
  // Applicant Documents
  'lohn_gehaltsbescheinigungen': {
    title: 'Lohn-/Gehaltsbescheinigungen',
    description: 'Lohn-/Gehaltsbescheinigungen',
    category: 'Applicant',
    supports_multiple: true
  },
  'einkommenssteuerbescheid': {
    title: 'Letzter Einkommenssteuerbescheid',
    description: 'Letzter Einkommenssteuerbescheid',
    category: 'Applicant'
  },
  'einkommenssteuererklaerung': {
    title: 'Letzte Einkommenssteuererklärung',
    description: 'Letzte Einkommenssteuererklärung',
    category: 'Applicant'
  },
  'rentenbescheid': {
    title: 'Rentenbescheid/Versorgungsbezüge',
    description: 'Aktueller Rentenbescheid/aktueller Bescheid über Versorgungsbezüge',
    category: 'Applicant',
    supports_multiple: true
  },
  'arbeitslosengeldbescheid': {
    title: 'Arbeitslosengeldbescheid',
    description: 'Arbeitslosengeldbescheid',
    category: 'Applicant'
  },
  'werbungskosten_nachweis': {
    title: 'Nachweis Werbungskosten',
    description: 'Nachweis über erhöhte Werbungskosten (z. B. Steuerbescheid, Bestätigung Finanzamt)',
    category: 'Applicant',
    supports_multiple: true
  },
  'kinderbetreuungskosten_nachweis': {
    title: 'Nachweis Kinderbetreuungskosten',
    description: 'Nachweis über die geleisteten Kinderbetreuungskosten',
    category: 'Applicant',
    supports_multiple: true
  },
  'unterhaltsverpflichtung_nachweis': {
    title: 'Nachweis Unterhaltsverpflichtung',
    description: 'Nachweis über die gesetzliche Unterhaltsverpflichtung und Höhe der Unterhaltszahlungen',
    category: 'Applicant',
    supports_multiple: true
  },
  'unterhaltsleistungen_nachweis': {
    title: 'Nachweis Unterhaltsleistungen',
    description: 'Nachweis über erhaltene Unterhaltsleistungen/Unterhaltsvorschuss',
    category: 'Applicant',
    supports_multiple: true
  },
  'krankengeld_nachweis': {
    title: 'Nachweis Krankengeld',
    description: 'Nachweis über erhaltenes Krankengeld',
    category: 'Applicant'
  },
  'elterngeld_nachweis': {
    title: 'Nachweis Elterngeld',
    description: 'Nachweis über erhaltenes Elterngeld',
    category: 'Applicant'
  },
  'guv_euer_nachweis': {
    title: 'Gewinn- und Verlustrechnung (GuV)/Einnahmenüberschussrechnung (EÜR)',
    description: 'Gewinn- und Verlustrechnung (GuV)/Einnahmenüberschussrechnung (EÜR)',
    category: 'Applicant',
    supports_multiple: true
  },
  'ausbildungsfoerderung_nachweis': {
    title: 'Leistungen der Ausbildungsförderung (BAföG, Berufsausbildungsbeihilfe SGB III)',
    description: 'Leistungen der Ausbildungsförderung (BAföG, Berufsausbildungsbeihilfe SGB III) (optional)',
    category: 'Applicant',
    supports_multiple: true
  },
  'sonstige_dokumente': {
    title: 'Sonstige Dokumente',
    description: 'Weitere relevante Dokumente',
    category: 'Applicant',
    supports_multiple: true
  }
};

// Add Section type
type SectionKey = 'correct' | 'wrong' | 'undefined';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

const ReviewActionsPanel: React.FC<ReviewActionsPanelProps> = ({
  applicationType,
  applicationId,
  progress,
  onRequestDocs,
  onFinishReview,
  onContactApplicant,
  onShareApplication,
  onClose
}) => {
  const isComplete = progress >= 100;
  const progressValue = Math.max(0, Math.min(progress, 100));
  const offset = circumference - (progressValue / 100) * circumference;

  // Responsive breakpoints
  const [showFullButton, setShowFullButton] = useState(true); // Button with text
  const [showId, setShowId] = useState(true); // Application ID
  const [showPanel, setShowPanel] = useState(true); // Whole panel
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Modal state
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoData, setInfoData] = useState<any>(null);
  const [infoError, setInfoError] = useState<string | null>(null);

  // New state for the finish review modal and checklist grouping
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [finishChecklist, setFinishChecklist] = useState<ChecklistItem[]>([]);
  const [finishLoading, setFinishLoading] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({});

  // Add state for decision, note, and submission loading/error
  const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [decisionSuccess, setDecisionSuccess] = useState(false);

  // Add state for share modal and checklist items
  const [showShareModal, setShowShareModal] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareChecklistItems, setShareChecklistItems] = useState<ChecklistItem[]>([]);
  const [selectedShareChecklistItems, setSelectedShareChecklistItems] = useState<ChecklistItem[]>([]);
  const [shareMessage, setShareMessage] = useState('');
  const [shareAgentToAdd, setShareAgentToAdd] = useState('');
  const [selectedShareAgents, setSelectedShareAgents] = useState<Array<{ id: string; name: string | null; email: string }>>([]);
  const [agents, setAgents] = useState<Array<{ id: string; name: string | null; email: string }>>([]);

  // Add state for contact applicant modal
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactEmail, setContactEmail] = useState<string | null>(null);
  const [contactName, setContactName] = useState<string | null>(null);
  const [contactMessage, setContactMessage] = useState('');
  const [contactSending, setContactSending] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactSuccess, setContactSuccess] = useState(false);

  // Add state for document request modal
  const [showDocumentRequestModal, setShowDocumentRequestModal] = useState(false);
  const [documentRequestLoading, setDocumentRequestLoading] = useState(false);
  const [documentRequestError, setDocumentRequestError] = useState<string | null>(null);
  const [documentRequestSuccess, setDocumentRequestSuccess] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState('');
  const [selectedApplicantType, setSelectedApplicantType] = useState<'general' | 'hauptantragsteller' | 'applicant'>('general');
  const [selectedApplicantNumber, setSelectedApplicantNumber] = useState<number>(2);
  const [documentRequestMessage, setDocumentRequestMessage] = useState('');
  const [availableApplicants, setAvailableApplicants] = useState<Array<{key: string, name: string, type: 'general' | 'hauptantragsteller' | 'applicant', number?: number}>>([]);

  // Copy to clipboard logic
  const [copied, setCopied] = useState(false);
  const handleCopyEmail = () => {
    if (contactEmail) {
      navigator.clipboard.writeText(contactEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  // Responsive logic using ResizeObserver
  useEffect(() => {
    if (!panelRef.current) return;
    const node = panelRef.current;
    const observer = new window.ResizeObserver(entries => {
      for (let entry of entries) {
        const width = entry.contentRect.width;
        setShowFullButton(width > 500); // Show full button if width > 600px
        setShowId(width > 450);          // Show ID if width > 450px
        setShowPanel(width > 200);       // Show panel if width > 180px
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };

  const handleAction = (action: () => void) => {
    action();
    setIsMenuOpen(false);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch info for modal
  const fetchInfoData = async () => {
    setInfoLoading(true);
    setInfoError(null);
    try {
      // 1. Fetch application
      const { data: app, error: appError } = await supabase
        .from('applications')
        .select('id, type, resident_id, assigned_agent, last_edit_agent, updated_at, submitted_at')
        .eq('id', applicationId)
        .single();
      if (appError) throw appError;
      // 2. Fetch user_data
      const { data: user, error: userError } = await supabase
        .from('user_data')
        .select('*')
        .eq('id', app.resident_id)
        .single();
      if (userError) throw userError;
      // 3. Fetch object_data
      const { data: obj, error: objError } = await supabase
        .from('object_data')
        .select('*')
        .eq('user_id', app.resident_id)
        .single();
      // 4. Fetch assigned agent
      let assignedAgent = null;
      if (app.assigned_agent) {
        const { data: agentData } = await supabase
          .from('agents')
          .select('name, email')
          .eq('id', app.assigned_agent)
          .single();
        assignedAgent = agentData;
      }
      // 5. Fetch last edit agent
      let lastEditAgent = null;
      if (app.last_edit_agent) {
        const { data: agentData } = await supabase
          .from('agents')
          .select('name, email')
          .eq('id', app.last_edit_agent)
          .single();
        lastEditAgent = agentData;
      }
      setInfoData({ app, user, obj, assignedAgent, lastEditAgent });
    } catch (err: any) {
      setInfoError('Fehler beim Laden der Antragsinformationen.');
    } finally {
      setInfoLoading(false);
    }
  };

  const handleOpenInfo = () => {
    setShowInfoModal(true);
    fetchInfoData();
  };
  const handleCloseInfo = () => setShowInfoModal(false);

  // Helper to group checklist items by agentStatus
  const groupChecklistItems = (items: ChecklistItem[]) => {
    const groups = { correct: [] as ChecklistItem[], wrong: [] as ChecklistItem[], undefined: [] as ChecklistItem[] };
    items.forEach(item => {
      const status = item.agentStatus || 'undefined';
      if (status === 'correct') groups.correct.push(item);
      else if (status === 'wrong') groups.wrong.push(item);
      else groups.undefined.push(item);
    });
    return groups;
  };

  // Handler to open the finish modal and fetch checklist data
  const handleOpenFinishModal = async () => {
    setShowFinishModal(true);
    setFinishLoading(true);
    setFinishError(null);
    try {
      // Fetch review_data from applications
      const { data, error } = await supabase
        .from('applications')
        .select('review_data')
        .eq('id', applicationId)
        .single();
      if (error) throw error;
      const checklistItems: ChecklistItem[] = data?.review_data?.checklistItems || [];
      setFinishChecklist(checklistItems);
      setExpandedSections({});
    } catch (err) {
      setFinishError('Fehler beim Laden der Checkliste.');
      setFinishChecklist([]);
    } finally {
      setFinishLoading(false);
    }
  };

  const handleCloseFinishModal = () => {
    setShowFinishModal(false);
    setDecision(null);
    setDecisionNote('');
    setDecisionLoading(false);
    setDecisionError(null);
  };

  // Update handleSubmitDecision to call the backend endpoint
  const handleSubmitDecision = async () => {
    setDecisionLoading(true);
    setDecisionError(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/application/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          application_id: applicationId,
          decision,
          note: decisionNote,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Fehler beim Absenden der Entscheidung.');
      }
      setShowFinishModal(false);
      setDecision(null);
      setDecisionNote('');
      setDecisionSuccess(true);
    } catch (err: any) {
      setDecisionError(err.message || 'Fehler beim Absenden der Entscheidung.');
    } finally {
      setDecisionLoading(false);
    }
  };

  // Button content logic
  const getButtonContent = () => {
    if (!showFullButton) {
      // Only show dropdown icon (no text)
      return null;
    }
    return isComplete ? 'Prüfung Abschließen' : 'Dokumente Nachfordern';
  };

  // Add function to fetch checklist items
  const fetchChecklistItems = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('review_data')
        .eq('id', applicationId)
        .single();
      
      if (error) throw error;
      
      const checklistItems: ChecklistItem[] = data?.review_data?.checklistItems || [];
      setShareChecklistItems(checklistItems);
    } catch (err) {
      console.error('Error fetching checklist items:', err);
    }
  };

  // Add function to fetch agents
  const fetchAgents = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('agents')
        .select('id, name, email')
        .neq('id', session.user.id);

      if (error) throw error;
      setAgents(data || []);
    } catch (err) {
      console.error('Error fetching agents:', err);
    }
  };

  // Add function to handle opening share modal
  const handleOpenShareModal = async () => {
    setShowShareModal(true);
    await Promise.all([fetchChecklistItems(), fetchAgents()]);
  };

  // Add function to handle closing share modal
  const handleCloseShareModal = () => {
    setShowShareModal(false);
    setSelectedShareChecklistItems([]);
    setShareMessage('');
    setShareAgentToAdd('');
    setSelectedShareAgents([]);
  };

  // Add function to handle sharing
  const handleShare = async () => {
    if (selectedShareAgents.length === 0) return;
    setIsSharing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('No user session');

      for (const agent of selectedShareAgents) {
        const senderName = session.user.user_metadata?.name 
          ? `${session.user.user_metadata.name} (${session.user.email})` 
          : session.user.email;

        // Create message content with checklist items
        const checklistItemsText = selectedShareChecklistItems.length > 0
          ? `\n\nAusgewählte Checklistenpunkte:\n${selectedShareChecklistItems.map(item => `- ${item.title}`).join('\n')}`
          : '';

        const messageContent = `${senderName} hat Ihnen den Antrag "${applicationId}" geteilt.${checklistItemsText}\n\nNachricht: ${shareMessage}`;

        await sendSharedApplicationMessage(
          agent.id,
          session.user.id,
          [applicationId],
          messageContent,
          {
            toName: agent.name || undefined,
            appIds: [applicationId],
            customMessage: shareMessage + (checklistItemsText ? `\n\nAusgewählte Checklistenpunkte:\n${selectedShareChecklistItems.map(item => `- ${item.title}`).join('\n')}` : ''),
          },
          selectedShareChecklistItems.length > 0 ? selectedShareChecklistItems.map(item => ({ id: item.id, title: item.title })) : undefined
        );
      }
      handleCloseShareModal();
    } catch (err) {
      console.error('Error sharing application:', err);
    } finally {
      setIsSharing(false);
    }
  };

  // Refactor: always fetch applicant info when opening contact modal
  const handleOpenContactModal = async () => {
    setContactError(null);
    setContactSuccess(false);
    setContactMessage('');
    setContactEmail(null);
    setContactName(null);
    setShowContactModal(true);
    setInfoLoading(true);
    try {
      // Always fetch fresh info
      const { data: app, error: appError } = await supabase
        .from('applications')
        .select('id, type, resident_id')
        .eq('id', applicationId)
        .single();
      if (appError || !app) throw new Error('Fehler beim Laden der Antragsdaten.');
      const { data: user, error: userError } = await supabase
        .from('user_data')
        .select('*')
        .eq('id', app.resident_id)
        .single();
      if (userError || !user || !user.email) {
        setContactEmail(null);
        setContactError('Für diesen Antragsteller ist keine E-Mail-Adresse hinterlegt. Eine Kontaktaufnahme per E-Mail ist nicht möglich.');
      } else {
        setContactEmail(user.email);
        setContactName((user.firstname || '') + (user.lastname ? ' ' + user.lastname : ''));
      }
    } catch {
      setContactEmail(null);
      setContactError('Fehler beim Laden der Antragsdaten.');
    } finally {
      setInfoLoading(false);
    }
  };

  const handleCloseContactModal = () => {
    setShowContactModal(false);
    setContactMessage('');
    setContactError(null);
    setContactSuccess(false);
  };

  const handleSendContactMessage = async () => {
    if (!contactEmail) return;
    setContactSending(true);
    setContactError(null);
    setContactSuccess(false);
    try {
      // Get agent info from supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Kein Agenten-Login gefunden.');
      const agentName = session.user.user_metadata?.name || null;
      const agentEmail = session.user.email;
      // Call backend endpoint
      const response = await fetch(`${BACKEND_URL}/api/contact-applicant-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          to_email: contactEmail,
          to_name: contactName,
          from_email: agentEmail,
          from_name: agentName,
          content: contactMessage,
        })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Fehler beim Senden der Nachricht.');
      }
      setContactSuccess(true);
      setContactMessage('');
    } catch (err: any) {
      setContactError(err.message || 'Fehler beim Senden der Nachricht.');
    } finally {
      setContactSending(false);
    }
  };

  // Document request handlers
  const handleOpenDocumentRequestModal = async () => {
    setDocumentRequestError(null);
    setDocumentRequestSuccess(false);
    setSelectedDocumentType('');
    setSelectedApplicantType('general');
    setSelectedApplicantNumber(2);
    setDocumentRequestMessage('');
    setShowDocumentRequestModal(true);

    // Load available applicants
    try {
      const { data: app, error: appError } = await supabase
        .from('applications')
        .select('id, resident_id')
        .eq('id', applicationId)
        .single();
      if (appError || !app) throw new Error('Fehler beim Laden der Antragsdaten.');

      const { data: userData, error: userError } = await supabase
        .from('user_data')
        .select('weitere_antragstellende_personen')
        .eq('id', app.resident_id)
        .single();
      
      const applicants: Array<{key: string, name: string, type: 'general' | 'hauptantragsteller' | 'applicant', number?: number}> = [
        { key: 'general', name: 'Allgemeine Dokumente', type: 'general' as const },
        { key: 'hauptantragsteller', name: 'Hauptantragsteller', type: 'hauptantragsteller' as const }
      ];

      // Add additional applicants if they exist
      if (userData?.weitere_antragstellende_personen && Array.isArray(userData.weitere_antragstellende_personen)) {
        userData.weitere_antragstellende_personen.forEach((_: any, index: number) => {
          const applicantNumber = index + 2;
          applicants.push({
            key: `applicant_${applicantNumber}`,
            name: `Antragsteller ${applicantNumber}`,
            type: 'applicant' as const,
            number: applicantNumber
          });
        });
      }

      setAvailableApplicants(applicants);
    } catch (error) {
      console.error('Error loading applicants:', error);
      setAvailableApplicants([
        { key: 'general', name: 'Allgemeine Dokumente', type: 'general' as const },
        { key: 'hauptantragsteller', name: 'Hauptantragsteller', type: 'hauptantragsteller' as const }
      ]);
    }
  };

  const handleCloseDocumentRequestModal = () => {
    setShowDocumentRequestModal(false);
    setSelectedDocumentType('');
    setSelectedApplicantType('general');
    setSelectedApplicantNumber(2);
    setDocumentRequestMessage('');
    setDocumentRequestError(null);
    setDocumentRequestSuccess(false);
  };

  const handleSendDocumentRequest = async () => {
    if (!selectedDocumentType) return;
    
    setDocumentRequestLoading(true);
    setDocumentRequestError(null);
    setDocumentRequestSuccess(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Kein Agenten-Login gefunden.');

      const response = await fetch(`${BACKEND_URL}/api/request-documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          application_id: applicationId,
          document_type_id: selectedDocumentType,
          applicant_type: selectedApplicantType,
          applicant_number: selectedApplicantType === 'applicant' ? selectedApplicantNumber : null,
          custom_message: documentRequestMessage,
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Fehler beim Senden der Dokumentenanfrage.');
      }

      setDocumentRequestSuccess(true);
      setSelectedDocumentType('');
      setSelectedApplicantType('general');
      setSelectedApplicantNumber(2);
      setDocumentRequestMessage('');
    } catch (err: any) {
      setDocumentRequestError(err.message || 'Fehler beim Senden der Dokumentenanfrage.');
    } finally {
      setDocumentRequestLoading(false);
    }
  };

  // Handle document request
  const handleRequestDocs = () => {
    handleOpenDocumentRequestModal();
  };

  return (
    <div
      ref={panelRef}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        background: '#ffffff',
        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
        borderRadius: 10,
        padding: '0 16px',
        minHeight: 0,
        height: 72,
        gap: 0,
        width: '100%',
        opacity: showPanel ? 1 : 0,
        pointerEvents: showPanel ? 'auto' : 'none',
      }}
    >
      <style>{styles}</style>
      {/* Left: Info */}
      <div style={{ flex: 2, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 0 }}>
        {showId && (
          <div style={{ fontWeight: 700, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{applicationId}</div>
        )}
        <button
          onClick={handleOpenInfo}
          style={{ background: 'none', border: 'none', padding: 0, marginLeft: 6, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          title="Antragsinfo anzeigen"
        >
          <span className="material-icons" style={{ color: '#064497', fontSize: 22 }}>info</span>
        </button>
      </div>
      {/* Separator */}
      <div style={{ width: 1, background: '#e0e0e0', height: 48, margin: '12px 10px' }} />
      {/* Center: Circular Progress */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <svg width={circleSize} height={circleSize}>
          <circle
            cx={circleSize / 2}
            cy={circleSize / 2}
            r={radius}
            fill="none"
            stroke="#e0e0e0"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={circleSize / 2}
            cy={circleSize / 2}
            r={radius}
            fill="none"
            stroke="#064497"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s' }}
          />
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="13"
            fontWeight="bold"
            fill="#064497"
          >
            {progressValue}%
          </text>
        </svg>
      </div>
      {/* Separator */}
      <div style={{ width: 1, background: '#e0e0e0', height: 48, margin: '12px 10px' }} />
      {/* Right: Actions */}
      <div style={{ flex: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end', gap: 0, minWidth: 0, position: 'relative', marginLeft: 8 }}>
        <button
          ref={buttonRef}
          style={{
            minWidth: showFullButton ? 200 : 44,
            height: 44,
            background: isComplete ? '#388e3c' : '#064497',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '10px 16px',
            fontWeight: 500,
            fontSize: 15,
            cursor: 'pointer',
            marginBottom: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: `0 1px 3px rgba(${isComplete ? '56, 142, 60' : '6, 68, 151'}, 0.08)`
          }}
          onClick={showFullButton ? (isComplete ? handleOpenFinishModal : handleRequestDocs) : undefined}
        >
          {getButtonContent()}
          {/* Only show dropdown icon if not showing full button */}
          {showFullButton ? (
            <div onClick={handleMenuClick} className="menu-button">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: isMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <path d="M7 10L12 15L17 10" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          ) : (
            <div onClick={handleMenuClick} className="menu-button">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: isMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <path d="M7 10L12 15L17 10" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
        </button>

        {isMenuOpen && (
          <div
            ref={menuRef}
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              backgroundColor: '#fff',
              borderRadius: '6px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              minWidth: 200,
              zIndex: 1000,
              marginTop: '4px'
            }}
          >
            {/* On narrow screens, show both actions. On wide screens, show only the alternative action. */}
            {!showFullButton ? (
              <>
                <button
                  onClick={() => handleAction(handleRequestDocs)}
                  className="menu-item"
                >
                  Dokumente Nachfordern
                </button>
                <button
                  onClick={() => handleAction(handleOpenFinishModal)}
                  className="menu-item"
                >
                  Prüfung Abschließen
                </button>
              </>
            ) : (
              isComplete ? (
                <button
                  onClick={() => handleAction(handleOpenFinishModal)}
                  className="menu-item"
                >
                  Prüfung Abschließen
                </button>
              ) : (
                <button
                  onClick={() => handleAction(handleOpenFinishModal)}
                  className="menu-item"
                >
                  Prüfung Abschließen
                </button>
              )
            )}
            <button
              onClick={handleOpenContactModal}
              className="menu-item"
            >
              Antragsteller Kontaktieren
            </button>
            <button
              onClick={() => handleAction(handleOpenShareModal)}
              className="menu-item"
            >
              Antrag teilen
            </button>
          </div>
        )}
      </div>
      {/* Modal for info */}
      <Modal show={showInfoModal} onHide={handleCloseInfo} centered>
        <Modal.Header>
          <Modal.Title>Antragsdetails</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {infoLoading ? (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 120 }}>
              <Spinner animation="border" style={{ color: '#064497', width: 48, height: 48 }} />
            </div>
          ) : infoError ? (
            <div className="alert alert-danger">{infoError}</div>
          ) : infoData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><b>Antragsnummer:</b> {infoData.app?.id || '-'}</div>
              <div><b>Typ:</b> {TYPE_LABELS[infoData.app?.type] || infoData.app?.type || '-'}</div>
              <div><b>Hauptantragsteller:</b> {infoData.user?.firstname || ''} {infoData.user?.lastname || ''}</div>
              <div><b>Email:</b> {infoData.user?.email || '-'}</div>
              <div><b>Telefon:</b> {infoData.user?.phone || '-'}</div>
              <div><b>Adresse Antragsteller:</b> {infoData.user ? `${infoData.user.person_street || ''} ${infoData.user.person_housenumber || ''}, ${infoData.user.person_postalcode || ''} ${infoData.user.person_city || ''}` : '-'}</div>
              <div><b>Objektadresse:</b> {infoData.obj ? `${infoData.obj.obj_street || ''} ${infoData.obj.obj_house_number || ''}, ${infoData.obj.obj_postal_code || ''} ${infoData.obj.obj_city || ''}` : '-'}</div>
              <div><b>Zugewiesener Sachbearbeiter:</b> {infoData.assignedAgent ? `${infoData.assignedAgent.name || ''} (${infoData.assignedAgent.email || '-'})` : '-'}</div>
              <div><b>Letzter Bearbeiter:</b> {infoData.lastEditAgent ? `${infoData.lastEditAgent.name || ''} (${infoData.lastEditAgent.email || '-'})` : '-'}</div>
              <div><b>Antragsdatum:</b> {infoData.app?.submitted_at ? new Date(infoData.app.submitted_at).toLocaleString() : '-'}</div>
              <div><b>Letzte Änderung:</b> {infoData.app?.updated_at ? new Date(infoData.app.updated_at).toLocaleString() : '-'}</div>
            </div>
          ) : (
            <div>Keine Daten gefunden.</div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseInfo}>Schließen</Button>
        </Modal.Footer>
      </Modal>
      {/* New modal for finish review */}
      <Modal show={showFinishModal || decisionSuccess} onHide={decisionSuccess ? onClose : handleCloseFinishModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{decisionSuccess ? 'Prüfung erfolgreich abgeschlossen' : 'Prüfung abschließen'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {decisionSuccess ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280, padding: 32 }}>
              <div style={{ background: '#e6f4ea', borderRadius: '50%', width: 90, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <span className="material-icons" style={{ color: '#388e3c', fontSize: 54 }}>check_circle</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#388e3c', marginBottom: 16, textAlign: 'center' }}>
                Entscheidung erfolgreich übermittelt!
              </div>
              <Button variant="success" size="lg" style={{ minWidth: 220, fontWeight: 600, fontSize: 18, marginTop: 12 }} onClick={onClose}>
                Zurück zur Übersicht
              </Button>
            </div>
          ) : (
            <div style={{ padding: 0 }}>
              <div style={{ marginBottom: 20, color: '#333', fontSize: 18, fontWeight: 500 }}>
                Bitte überprüfen Sie die Ergebnisse der Checkliste, bevor Sie eine Entscheidung treffen.
              </div>
              {/* Checklist groups as cards with badges */}
              {(() => {
                const groups = groupChecklistItems(finishChecklist);
                const sections: { key: SectionKey; label: string; color: string }[] = [
                  { key: 'correct', label: 'Korrekte Angaben', color: '#388e3c' },
                  { key: 'wrong', label: 'Fehlerhafte Angaben', color: '#d32f2f' },
                  { key: 'undefined', label: 'Ungeprüfte Angaben', color: '#757575' },
                ];
                return <>
                  <div style={{ display: 'block', marginBottom: 24 }}>
                    {sections.filter(sec => groups[sec.key as SectionKey].length > 0).map(sec => (
                      <div key={sec.key} style={{ marginBottom: 18, background: '#fff', border: `2px solid ${sec.color}22`, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                        <div
                          style={{
                            display: 'flex', alignItems: 'center', padding: '16px 22px', cursor: 'pointer', borderRadius: 12, fontWeight: 600, fontSize: 18, gap: 16, background: '#f7f7f7', borderBottom: `1px solid ${sec.color}22`,
                          }}
                          onClick={() => setExpandedSections(prev => ({ ...prev, [sec.key]: !prev[sec.key] }))}
                        >
                          <span style={{ fontWeight: 700, fontSize: 22, color: sec.color, minWidth: 32, textAlign: 'right', display: 'inline-block', background: sec.color + '22', borderRadius: 12, padding: '4px 16px' }}>{groups[sec.key as SectionKey].length}</span>
                          <span style={{ color: '#bdbdbd', fontWeight: 400, fontSize: 22, margin: '0 8px' }}>|</span>
                          <span style={{ color: sec.color }}>{sec.label}</span>
                          <span className="material-icons" style={{ marginLeft: 'auto', fontSize: 26, color: '#757575' }}>
                            {expandedSections[sec.key] ? 'expand_less' : 'expand_more'}
                          </span>
                        </div>
                        <Collapse in={!!expandedSections[sec.key]}>
                          <div style={{ visibility: 'visible' }}>
                            <ul style={{ margin: 0, padding: '14px 32px', listStyle: 'disc', color: '#333', fontSize: 16 }}>
                              {groups[sec.key as SectionKey].map((item: ChecklistItem) => (
                                <li key={item.id} style={{ marginBottom: 6 }}>{item.title}</li>
                              ))}
                            </ul>
                          </div>
                        </Collapse>
                      </div>
                    ))}
                  </div>
                  {/* Decision buttons and note input */}
                  <div style={{ marginTop: 32, marginBottom: 8, display: 'flex', gap: 18, justifyContent: 'center' }}>
                    <Button
                      variant={decision === 'approved' ? 'success' : 'outline-success'}
                      style={{
                        minWidth: 200,
                        fontWeight: 600,
                        fontSize: 18,
                        boxShadow: decision === 'approved' ? '0 2px 8px #388e3c22' : '0 2px 8px rgba(0,0,0,0.10)',
                        background: decision === 'approved' ? undefined : '#fff',
                        color: decision === 'approved' ? undefined : '#388e3c',
                        borderRadius: 5,
                        border: decision === 'approved' ? undefined : 'none',
                        transition: 'all 0.2s',
                      }}
                      onClick={() => setDecision('approved')}
                      disabled={decisionLoading}
                    >
                      Antrag Bewilligen
                    </Button>
                    <Button
                      variant={decision === 'rejected' ? 'danger' : 'outline-danger'}
                      style={{
                        minWidth: 200,
                        fontWeight: 600,
                        fontSize: 18,
                        boxShadow: decision === 'rejected' ? '0 2px 8px #d32f2f22' : '0 2px 8px rgba(0,0,0,0.10)',
                        background: decision === 'rejected' ? undefined : '#fff',
                        color: decision === 'rejected' ? undefined : '#d32f2f',
                        borderRadius: 5,
                        border: decision === 'rejected' ? undefined : 'none',
                        transition: 'all 0.2s',
                      }}
                      onClick={() => setDecision('rejected')}
                      disabled={decisionLoading}
                    >
                      Antrag Ablehnen
                    </Button>
                  </div>
                  {decision && (
                    <div style={{ marginTop: 22, background: '#f7f7f7', borderRadius: 10, padding: 18 }}>
                      <div style={{ marginBottom: 10, color: '#333', fontWeight: 500, fontSize: 16 }}>
                        Notiz zur Entscheidung (optional, wird an den Antragsteller gesendet):
                      </div>
                      <textarea
                        value={decisionNote}
                        onChange={e => setDecisionNote(e.target.value)}
                        rows={3}
                        style={{ width: '100%', borderRadius: 8, border: '1.5px solid #bdbdbd', padding: 12, fontSize: 16, marginBottom: 10, background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                        placeholder="Hier können Sie eine Notiz zur Entscheidung hinzufügen..."
                        disabled={decisionLoading}
                      />
                      {decisionError && <div className="alert alert-danger" style={{ marginBottom: 10 }}>{decisionError}</div>}
                      <Button
                        variant={decision === 'approved' ? 'success' : 'danger'}
                        style={{ minWidth: 200, fontWeight: 600, fontSize: 18, marginTop: 6 }}
                        onClick={handleSubmitDecision}
                        disabled={decisionLoading}
                      >
                        {decisionLoading ? (
                          <Spinner animation="border" size="sm" style={{ marginRight: 8 }} />
                        ) : null}
                        Entscheidung absenden
                      </Button>
                    </div>
                  )}
                </>;
              })()}
            </div>
          )}
        </Modal.Body>
        {!decisionSuccess && (
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseFinishModal}>Schließen</Button>
          </Modal.Footer>
        )}
      </Modal>
      {/* Share Modal */}
      <Modal show={showShareModal} onHide={() => !isSharing && handleCloseShareModal()} centered>
        <Modal.Header>
          <Modal.Title>Antrag teilen</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {isSharing ? (
            <div style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              background: 'rgba(255, 255, 255, 0.8)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              zIndex: 1
            }}>
              <div style={{ textAlign: 'center' }}>
                <Spinner animation="border" style={{ color: '#064497', marginBottom: 16 }} />
                <div style={{ color: '#064497' }}>Antrag wird geteilt...</div>
              </div>
            </div>
          ) : null}
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Sachbearbeiter auswählen</Form.Label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <Form.Select
                  value={shareAgentToAdd}
                  onChange={e => {
                    const agent = agents.find(a => a.id === e.target.value);
                    if (agent && !selectedShareAgents.some(a => a.id === agent.id)) {
                      setSelectedShareAgents(prev => [...prev, agent]);
                      setShareAgentToAdd("");
                    } else {
                      setShareAgentToAdd("");
                    }
                  }}
                  disabled={isSharing}
                  style={{ width: '100%' }}
                >
                  <option value="">Sachbearbeiter auswählen...</option>
                  {agents
                    .filter(agent => !selectedShareAgents.some(a => a.id === agent.id))
                    .map(agent => (
                      <option key={agent.id} value={agent.id}>{agent.name || agent.email}</option>
                    ))}
                </Form.Select>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                {selectedShareAgents.map(agent => (
                  <span key={agent.id} style={{ background: '#eaf2fb', color: '#064497', borderRadius: 5, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 15, fontWeight: 500 }}>
                    <span className="material-icons" style={{ fontSize: 18 }}>person</span>
                    {agent.name || agent.email}
                    <button onClick={() => setSelectedShareAgents(prev => prev.filter(a => a.id !== agent.id))} style={{ background: 'none', border: 'none', color: '#d32f2f', marginLeft: 4, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 24, width: 24 }} title="Entfernen">
                      <span className="material-icons" style={{ fontSize: 22, display: 'block' }}>close</span>
                    </button>
                  </span>
                ))}
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Checklistenpunkte auswählen (optional)</Form.Label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <Form.Select
                  value={selectedShareChecklistItems.length > 0 ? selectedShareChecklistItems[selectedShareChecklistItems.length - 1].id : ''}
                  onChange={e => {
                    const item = shareChecklistItems.find(i => i.id === e.target.value);
                    if (item && !selectedShareChecklistItems.some(i => i.id === item.id)) {
                      setSelectedShareChecklistItems(prev => [...prev, item]);
                    }
                  }}
                  disabled={isSharing}
                  style={{ width: '100%' }}
                >
                  <option value="">Checklistenpunkt auswählen...</option>
                  {shareChecklistItems
                    .filter(item => !selectedShareChecklistItems.some(i => i.id === item.id))
                    .map(item => (
                      <option key={item.id} value={item.id}>{item.title}</option>
                    ))}
                </Form.Select>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                {selectedShareChecklistItems.map(item => (
                  <span key={item.id} style={{ background: '#eaf2fb', color: '#064497', borderRadius: 5, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 15, fontWeight: 500 }}>
                    <span className="material-icons" style={{ fontSize: 18 }}>checklist</span>
                    {item.title}
                    <button onClick={() => setSelectedShareChecklistItems(prev => prev.filter(i => i.id !== item.id))} style={{ background: 'none', border: 'none', color: '#d32f2f', marginLeft: 4, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 24, width: 24 }} title="Entfernen">
                      <span className="material-icons" style={{ fontSize: 22, display: 'block' }}>close</span>
                    </button>
                  </span>
                ))}
              </div>
            </Form.Group>

            <Form.Group>
              <Form.Label>Nachricht (optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
                placeholder="Fügen Sie hier eine Nachricht hinzu..."
                disabled={isSharing}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={handleCloseShareModal}
            disabled={isSharing}
          >
            Abbrechen
          </Button>
          <Button 
            variant="primary" 
            onClick={handleShare}
            disabled={selectedShareAgents.length === 0 || isSharing}
            style={{ background: '#064497', border: 'none' }}
          >
            Teilen
          </Button>
        </Modal.Footer>
      </Modal>
      {/* Contact Applicant Modal */}
      <Modal show={showContactModal} onHide={handleCloseContactModal} centered size="lg">
        <Modal.Header>
          <Modal.Title>Antragsteller Kontaktieren</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {infoLoading ? (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 120 }}>
              <Spinner animation="border" style={{ color: '#064497', width: 48, height: 48 }} />
            </div>
          ) : contactError ? (
            <div className="alert alert-danger">{contactError}</div>
          ) : contactSuccess ? (
            <div className="alert alert-success" style={{ fontSize: 18, textAlign: 'center', padding: 24 }}>
              Die Nachricht wurde erfolgreich an den Antragsteller gesendet.
            </div>
          ) : contactEmail ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ fontSize: 17, color: '#333' }}>
                Sie können den Antragsteller unter folgender E-Mail-Adresse kontaktieren:
                <div style={{ fontWeight: 600, fontSize: 18, color: '#064497', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {contactEmail}
                  <button
                    onClick={handleCopyEmail}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 4, display: 'flex', alignItems: 'center' }}
                    title="E-Mail-Adresse kopieren"
                    aria-label="E-Mail-Adresse kopieren"
                    type="button"
                  >
                    <span className="material-icons" style={{ fontSize: 20, color: copied ? '#388e3c' : '#064497' }}>
                      {copied ? 'check' : 'content_copy'}
                    </span>
                  </button>
                  {copied && <span style={{ color: '#388e3c', fontSize: 14, marginLeft: 2 }}>Kopiert!</span>}
                </div>
              </div>
              <div style={{ fontSize: 16, color: '#444', background: '#f7f7f7', borderRadius: 8, padding: 12 }}>
                Alternativ können Sie dem Antragsteller eine Nachricht senden. <b>Bitte beachten Sie:</b> Eine direkte Antwort auf diese E-Mail ist nicht möglich. Der Antragsteller kann Sie nur über die im Portal angegebenen Kontaktmöglichkeiten erreichen.
              </div>
              <Form.Group>
                <Form.Label>Nachricht an den Antragsteller</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={contactMessage}
                  onChange={e => setContactMessage(e.target.value)}
                  placeholder="Geben Sie hier Ihre Nachricht ein..."
                  disabled={contactSending}
                  style={{ fontSize: 16, borderRadius: 8, border: '1.5px solid #bdbdbd', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                />
              </Form.Group>
              {contactError && <div className="alert alert-danger">{contactError}</div>}
            </div>
          ) : (
            <div>Keine E-Mail-Adresse für den Antragsteller gefunden.</div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseContactModal} disabled={contactSending}>Schließen</Button>
          <Button
            variant="primary"
            onClick={handleSendContactMessage}
            disabled={!contactEmail || !contactMessage.trim() || contactSending}
            style={{ background: '#064497', border: 'none' }}
          >
            {contactSending ? <Spinner animation="border" size="sm" style={{ marginRight: 8 }} /> : null}
            Senden
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Document Request Modal */}
      <Modal show={showDocumentRequestModal} onHide={handleCloseDocumentRequestModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Dokumente nachfordern</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {documentRequestSuccess ? (
            <div className="text-center py-4">
              <div style={{ color: '#388e3c', fontSize: '48px', marginBottom: '16px' }}>
                <span className="material-icons" style={{ fontSize: '48px' }}>check_circle</span>
              </div>
              <h4 style={{ color: '#388e3c', marginBottom: '16px' }}>Anfrage erfolgreich gesendet!</h4>
              <p>Der Antragsteller wurde per E-Mail über die angeforderten Dokumente informiert.</p>
            </div>
          ) : (
            <div>
              <div className="mb-3">
                <label className="form-label">Dokumenttyp auswählen</label>
                <select
                  className="form-select"
                  value={selectedDocumentType}
                  onChange={(e) => setSelectedDocumentType(e.target.value)}
                  disabled={documentRequestLoading}
                >
                  <option value="">Bitte wählen Sie ein Dokument aus...</option>
                  {Object.entries(DOCUMENT_TYPES).map(([id, doc]) => (
                    <option key={id} value={id}>{doc.title}</option>
                  ))}
                </select>
              </div>

              {selectedDocumentType && DOCUMENT_TYPES[selectedDocumentType] && (
                <div className="mb-3 p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                  <strong>{DOCUMENT_TYPES[selectedDocumentType].title}</strong>
                  <p className="mb-0 text-muted" style={{ fontSize: '14px' }}>
                    {DOCUMENT_TYPES[selectedDocumentType].description}
                  </p>
                </div>
              )}

              {availableApplicants.length > 2 && DOCUMENT_TYPES[selectedDocumentType]?.category === 'Applicant' && (
                <div className="mb-3">
                  <label className="form-label">Für welchen Antragsteller?</label>
                  <select
                    className="form-select"
                    value={selectedApplicantType === 'applicant' ? `applicant_${selectedApplicantNumber}` : selectedApplicantType}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.startsWith('applicant_')) {
                        setSelectedApplicantType('applicant');
                        setSelectedApplicantNumber(parseInt(value.split('_')[1]));
                                             } else {
                         setSelectedApplicantType(value as 'general' | 'hauptantragsteller');
                       }
                    }}
                    disabled={documentRequestLoading}
                  >
                    {availableApplicants
                      .filter(applicant => 
                        DOCUMENT_TYPES[selectedDocumentType]?.category === 'General' || 
                        applicant.type !== 'general'
                      )
                      .map(applicant => (
                        <option key={applicant.key} value={applicant.key}>
                          {applicant.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="mb-3">
                <label className="form-label">Nachricht an den Antragsteller (optional)</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={documentRequestMessage}
                  onChange={(e) => setDocumentRequestMessage(e.target.value)}
                  placeholder="Zusätzliche Informationen oder Anweisungen für den Antragsteller..."
                  disabled={documentRequestLoading}
                />
              </div>

              {documentRequestError && (
                <div className="alert alert-danger mb-3">{documentRequestError}</div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          {documentRequestSuccess ? (
            <Button onClick={handleCloseDocumentRequestModal} style={{ backgroundColor: '#064497', border: 'none' }}>
              Schließen
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={handleCloseDocumentRequestModal} disabled={documentRequestLoading}>
                Abbrechen
              </Button>
              <Button 
                onClick={handleSendDocumentRequest}
                disabled={!selectedDocumentType || documentRequestLoading}
                style={{ backgroundColor: '#064497', border: 'none' }}
              >
                {documentRequestLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Wird gesendet...
                  </>
                ) : (
                  'Anfrage senden'
                )}
              </Button>
            </>
          )}
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ReviewActionsPanel; 