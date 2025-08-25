import { supabase } from '../lib/supabase';

export interface OutstandingDocumentRequest {
  token: string;
  document_type_id: string;
  document_title: string;
  document_description: string;
  applicant_type: string;
  applicant_uuid: string | null;
  applicant_name: string;
  custom_message: string;
  requested_by: string;
  requesting_agent_name: string;
  requested_at: string;
  expires_at: string;
  is_expired: boolean;
}

export const fetchOutstandingDocumentRequests = async (userId: string): Promise<OutstandingDocumentRequest[]> => {
  try {
    // First, get the application_id for this user
    const { data: applications, error: appError } = await supabase
      .from('applications')
      .select('id')
      .eq('resident_id', userId)
      .order('submitted_at', { ascending: false })
      .limit(1);

    if (appError) {
      console.error('Error fetching applications:', appError);
      throw appError;
    }

    if (!applications || applications.length === 0) {
      console.log('No applications found for user:', userId);
      return [];
    }

    const applicationId = applications[0].id;

    // Now fetch outstanding document requests for this application
    // Only select columns that actually exist in the document_requests table
    const { data: requests, error: reqError } = await supabase
      .from('document_requests')
      .select(`
        token,
        document_type_id,
        applicant_type,
        applicant_uuid,
        applicant_name,
        custom_message,
        requested_by,
        requested_at,
        expires_at
      `)
      .eq('application_id', applicationId)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false });

    if (reqError) {
      console.error('Error fetching document requests:', reqError);
      throw reqError;
    }

    if (!requests) {
      return [];
    }

    // Process the data to add missing fields and is_expired field
    const now = new Date();
    return requests.map(request => {
      // Generate document title and description from document_type_id
      const documentTitle = getDocumentTitle(request.document_type_id);
      const documentDescription = getDocumentDescription(request.document_type_id);
      
      return {
        ...request,
        document_title: documentTitle,
        document_description: documentDescription,
        requesting_agent_name: 'Bewilligungsbehörde', // Default value since we don't have agent info
        is_expired: new Date(request.expires_at) < now
      };
    });

  } catch (error) {
    console.error('Error in fetchOutstandingDocumentRequests:', error);
    throw error;
  }
};

// Helper function to get document title from document_type_id
const getDocumentTitle = (documentTypeId: string): string => {
  const documentTitles: Record<string, string> = {
    // General Documents
    'meldebescheinigung': 'Meldebescheinigung',
    'bauzeichnung': 'Bauzeichnung',
    'lageplan': 'Lageplan',
    'grundbuchblattkopie': 'Grundbuchblattkopie',
    'baugenehmigung_vorbescheid': 'Baugenehmigung oder Vorbescheid',
    'bergsenkungsGebiet_erklaerung': 'Erklärung der Bergbaugesellschaft',
    'neubau_kaufvertrag': 'Grundstückskaufvertrag/Entwurf des Kaufvertrags',
    'erbbaurechtsvertrag': 'Erbbaurechtsvertrag',
    'kaufvertrag': 'Entwurf des Kaufvertrags',
    'standortbedingte_mehrkosten': 'Nachweis für standortbedingte Mehrkosten',
    'haswoodconstructionloan': 'Nachweis: Zusatzdarlehen für Bauen mit Holz',
    'beg40standard_cert': 'Nachweis: Zusatzdarlehen für BEG Effizienzstandard 40',
    'pregnancy-cert': 'Schwangerschafts Nachweis',
    'marriage_cert': 'Heiratsurkunde/Lebenspartnerschaftsurkunde',
    'nachweis_disability': 'Nachweis über die Schwerbehinderteneigenschaft/GdB',
    'pflegegrad_nachweis': 'Nachweis der Pflegebedürftigkeit',
    'vollmacht-cert': 'Vollmachtsurkunde',
    'nachweis_darlehen': 'Darlehenszusage(n)',
    'eigenkapital_nachweis': 'Nachweis Eigenkapital',
    
    // Applicant Documents
    'lohn_gehaltsbescheinigungen': 'Lohn-/Gehaltsbescheinigungen',
    'einkommenssteuerbescheid': 'Letzter Einkommenssteuerbescheid',
    'einkommenssteuererklaerung': 'Letzte Einkommenssteuererklärung',
    'rentenbescheid': 'Rentenbescheid/Versorgungsbezüge',
    'arbeitslosengeldbescheid': 'Arbeitslosengeldbescheid',
    'werbungskosten_nachweis': 'Nachweis Werbungskosten',
    'kinderbetreuungskosten_nachweis': 'Nachweis Kinderbetreuungskosten',
    'unterhaltsverpflichtung_nachweis': 'Nachweis Unterhaltsverpflichtung',
    'unterhaltsleistungen_nachweis': 'Nachweis Unterhaltsleistungen',
    'krankengeld_nachweis': 'Nachweis Krankengeld',
    'elterngeld_nachweis': 'Nachweis Elterngeld',
    'guv_euer_nachweis': 'Gewinn- und Verlustrechnung (GuV)/Einnahmenüberschussrechnung (EÜR)',
    'ausbildungsfoerderung_nachweis': 'Leistungen der Ausbildungsförderung (BAföG, Berufsausbildungsbeihilfe SGB III)',
    'sonstige_dokumente': 'Sonstige Dokumente',
    'freiwillige_krankenversicherung_nachweis': 'Nachweis über freiwillige Beiträge zur Krankenversicherung',
    'freiwillige_versicherungsbeitraege_nachweis': 'Nachweis über freiwillige Renten- und Lebensversicherungsbeiträge'
  };
  
  return documentTitles[documentTypeId] || documentTypeId;
};

// Helper function to get document description from document_type_id
const getDocumentDescription = (documentTypeId: string): string => {
  const documentDescriptions: Record<string, string> = {
    // General Documents
    'meldebescheinigung': 'Meldebescheinigung von allen Personen, die das Förderobjekt nach Fertigstellung beziehen sollen',
    'bauzeichnung': 'Bauzeichnung (im Maßstab 1:100 mit eingezeichneter Möbelstellung)',
    'lageplan': 'Lageplan nach den Vorschriften Bau NRW (2018)',
    'grundbuchblattkopie': 'Grundbuchblattkopie nach neuestem Stand',
    'baugenehmigung_vorbescheid': 'Baugenehmigung oder Vorbescheid gemäß § 7 BauO NRW (2018)',
    'bergsenkungsGebiet_erklaerung': 'Erklärung der Bergbaugesellschaft über die Notwendigkeit von baulichen Anpassungs- und Sicherungsmaßnahmen',
    'neubau_kaufvertrag': 'Bei Neubau: Grundstückskaufvertrag/Entwurf des Kaufvertrags.',
    'erbbaurechtsvertrag': 'Vollständige Kopie des Erbbaurechtsvertrages',
    'kaufvertrag': 'Entwurf des Kaufvertrags',
    'standortbedingte_mehrkosten': 'Gutachten, Rechnungen oder Kostenvoranschläge',
    'haswoodconstructionloan': 'Nachweis: Zusatzdarlehen für Bauen mit Holz',
    'beg40standard_cert': 'Nachweis: Zusatzdarlehen für BEG Effizienzstandard 40',
    'pregnancy-cert': 'Nachweis über die Schwangerschaft',
    'marriage_cert': 'Aktuelle Heiratsurkunde oder Lebenspartnerschaftsurkunde',
    'nachweis_disability': 'Nachweis über die Schwerbehinderteneigenschaft/Grad der Behinderung (GdB). Wie z.B. Schwerbehindertenausweis oder Feststellungsbescheid nach § 152 Abs. 1 SGB IX',
    'pflegegrad_nachweis': 'Nachweis über die in der Haushaltsauskunft ausgewiesene Pflegebedürftigkeit/Pflegegrad',
    'vollmacht-cert': 'Vollmachtsurkunde für die bevollmächtigte Person/Firma',
    'nachweis_darlehen': 'Darlehenszusage(n) von Banken oder anderen Kreditgebern',
    'eigenkapital_nachweis': 'Nachweis über verfügbares Eigenkapital (z.B. Bankauszüge, Sparbücher, Wertpapiere)',
    
    // Applicant Documents
    'lohn_gehaltsbescheinigungen': 'Lohn-/Gehaltsbescheinigungen',
    'einkommenssteuerbescheid': 'Letzter Einkommenssteuerbescheid',
    'einkommenssteuererklaerung': 'Letzte Einkommenssteuererklärung',
    'rentenbescheid': 'Aktueller Rentenbescheid/aktueller Bescheid über Versorgungsbezüge',
    'arbeitslosengeldbescheid': 'Arbeitslosengeldbescheid',
    'werbungskosten_nachweis': 'Nachweis über erhöhte Werbungskosten (z. B. Steuerbescheid, Bestätigung Finanzamt)',
    'kinderbetreuungskosten_nachweis': 'Nachweis über die geleisteten Kinderbetreuungskosten',
    'unterhaltsverpflichtung_nachweis': 'Nachweis über die gesetzliche Unterhaltsverpflichtung und Höhe der Unterhaltszahlungen',
    'unterhaltsleistungen_nachweis': 'Nachweis über erhaltene Unterhaltsleistungen/Unterhaltsvorschuss',
    'krankengeld_nachweis': 'Nachweis über erhaltenes Krankengeld',
    'elterngeld_nachweis': 'Nachweis über erhaltenes Elterngeld',
    'guv_euer_nachweis': 'Gewinn- und Verlustrechnung (GuV)/Einnahmenüberschussrechnung (EÜR)',
    'ausbildungsfoerderung_nachweis': 'Leistungen der Ausbildungsförderung (BAföG, Berufsausbildungsbeihilfe SGB III) (optional)',
    'sonstige_dokumente': 'Weitere relevante Dokumente',
    'freiwillige_krankenversicherung_nachweis': 'Nachweis über freiwillige Beiträge zur Krankenversicherung',
    'freiwillige_versicherungsbeitraege_nachweis': 'Nachweis über freiwillige Renten- und Lebensversicherungsbeiträge'
  };
  
  return documentDescriptions[documentTypeId] || 'Dokument wurde angefordert';
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return "-";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, '0');
  const changeMonth = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${changeMonth}.${year} ${hours}:${minutes}`;
};
