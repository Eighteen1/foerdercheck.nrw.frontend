import { ChecklistItem } from '../types/checklist';
import { supabase } from '../lib/supabase';

// Document Category Mapping - maps document IDs to their storage categories
export const DOCUMENT_CATEGORY_MAPPING: Record<string, string> = {
  // General Documents
  'meldebescheinigung': 'general',
  'bauzeichnung': 'general',
  'lageplan': 'general',
  'grundbuchblattkopie': 'general',
  'baugenehmigung_vorbescheid': 'general',
  'bergsenkungsGebiet_erklaerung': 'general',
  'neubau_kaufvertrag': 'general',
  'erbbaurechtsvertrag': 'general',
  'kaufvertrag': 'general',
  'standortbedingte_mehrkosten': 'general',
  'haswoodconstructionloan': 'general',
  'beg40standard_cert': 'general',
  'pregnancy_cert': 'general',
  'marriage_cert': 'general',
  'heiratsurkunde': 'general', // Legacy compatibility
  'disability_cert': 'general',
  'vollmacht_cert': 'general',
  
  // Applicant Documents (these will be stored per applicant)
  'lohn_gehaltsbescheinigungen': 'applicant',
  'gehaltsabrechnung': 'applicant', // Legacy compatibility
  'einkommenssteuerbescheid': 'applicant',
  'einkommenssteuererklaerung': 'applicant',
  'rentenbescheid': 'applicant',
  'arbeitslosengeldbescheid': 'applicant',
  'werbungskosten_nachweis': 'applicant',
  'kinderbetreuungskosten_nachweis': 'applicant',
  'unterhaltsverpflichtung_nachweis': 'applicant',
  'unterhaltsleistungen_nachweis': 'applicant',
  'krankengeld_nachweis': 'applicant',
  'elterngeld_nachweis': 'applicant',
  'guv_euer_nachweis': 'applicant',
  'ausbildungsfoerderung_nachweis': 'applicant',
  'sonstige_dokumente': 'applicant'
};

// Helper function to get available document buttons with multiple file support
export function getAvailableDocumentButtons(
  documentIds: string[], 
  documentStatus: any, 
  applicantKey: string
): { id: string; label: string }[] {
  const buttons: { id: string; label: string }[] = [];
  
  documentIds.forEach(docId => {
    const category = DOCUMENT_CATEGORY_MAPPING[docId];
    let searchKey = applicantKey;
    
    // If document belongs to general category, always search in 'general'
    if (category === 'general') {
      searchKey = 'general';
    }
    
    // Check if document exists in the structure
    const documentFiles = documentStatus?.[searchKey]?.[docId];
    
    if (documentFiles && Array.isArray(documentFiles) && documentFiles.length > 0) {
      // Filter only uploaded files
      const uploadedFiles = documentFiles.filter((file: any) => file.uploaded);
      
      if (uploadedFiles.length === 1) {
        // Single file - use document ID as button ID
        buttons.push({
          id: `${searchKey}_${docId}_0`,
          label: getDocumentLabel(docId)
        });
      } else if (uploadedFiles.length > 1) {
        // Multiple files - create numbered buttons
        uploadedFiles.forEach((file: any, index: number) => {
          buttons.push({
            id: `${searchKey}_${docId}_${index}`,
            label: `${getDocumentLabel(docId)} (${index + 1})`
          });
        });
      }
    }
  });
  
  return buttons;
}

// Helper function to get document label
function getDocumentLabel(docId: string): string {
  const labels: Record<string, string> = {
    'meldebescheinigung': 'Meldebescheinigung',
    'gehaltsabrechnung': 'Gehaltsabrechnung',
    'lohn_gehaltsbescheinigungen': 'Lohn-/Gehaltsbescheinigungen',
    'einkommenssteuerbescheid': 'Einkommenssteuerbescheid',
    'bauzeichnung': 'Bauzeichnung',
    'lageplan': 'Lageplan',
    'heiratsurkunde': 'Heiratsurkunde',
    'marriage_cert': 'Heiratsurkunde/Lebenspartnerschaftsurkunde',
    'unterhaltsleistungen_nachweis': 'Nachweis Unterhaltsleistungen',
    'guv_euer_nachweis': 'Gewinn- und Verlustrechnung (GuV)/EÜR',
    'unterhaltsverpflichtung_nachweis': 'Nachweis Unterhaltsverpflichtung',
    'einkommenssteuererklaerung': 'Einkommenssteuererklärung'
  };
  
  return labels[docId] || docId;
}

// Helper function to find missing documents and generate errors
export function getMissingDocumentErrors(
  requiredDocIds: string[], 
  documentStatus: any, 
  applicantKey: string
): string[] {
  const errors: string[] = [];
  
  requiredDocIds.forEach(docId => {
    const category = DOCUMENT_CATEGORY_MAPPING[docId];
    let searchKey = applicantKey;
    
    // If document belongs to general category, always search in 'general'
    if (category === 'general') {
      searchKey = 'general';
    }
    
    // Check if document exists and has uploaded files
    const documentFiles = documentStatus?.[searchKey]?.[docId];
    const hasUploadedFiles = documentFiles && 
      Array.isArray(documentFiles) && 
      documentFiles.some((file: any) => file.uploaded);
    
    if (!hasUploadedFiles) {
      errors.push(`Fehlendes Dokument: ${getDocumentLabel(docId)}`);
    }
  });
  
  return errors;
}

// Modified function to generate applicant-specific checklist items
export async function generateChecklistItems(applicationId: string, residentId: string): Promise<ChecklistItem[]> {
  try {
    // Fetch all required data in parallel
    const [
      { data: applicationData, error: appError },
      { data: userData, error: userError },
      { data: financialData, error: financialError }
    ] = await Promise.all([
      // Get application data
      supabase
        .from('applications')
        .select('type, status')
        .eq('id', applicationId)
        .single(),
      
      // Get user data including personal info
      supabase
        .from('user_data')
        .select('*')
        .eq('id', residentId)
        .single(),
      
      // Get financial data
      supabase
        .from('user_financials')
        .select('*')
        .eq('user_id', residentId)
        .single()
    ]);

    if (appError) throw new Error('Failed to fetch application data');
    if (userError) {
      console.warn('Failed to fetch user data, using fallback values:', userError);
    }
    if (financialError) console.warn('No financial data found for user:', financialError);

    const checklistItems: ChecklistItem[] = [];

    // Get list of all applicants
    const applicants = getApplicantList(userData, financialData);

    // Generate checklist items for each applicant
    for (const applicant of applicants) {
      const applicantItems = generateApplicantSpecificItems(
        applicant, 
        userData, 
        financialData, 
        applicationData?.type
      );
      checklistItems.push(...applicantItems);
    }

    // Add general checklist items (not applicant-specific)
    const generalItems = generateGeneralChecklistItems(userData, applicationData?.type);
    checklistItems.push(...generalItems);

    return checklistItems;
  } catch (error) {
    console.error('Error generating checklist items:', error);
    throw error;
  }
}

// Helper function to get list of applicants
function getApplicantList(userData: any, financialData: any): Array<{key: string, name: string, type: 'hauptantragsteller' | 'applicant', number?: number}> {
  const applicants = [];
  
  // Always include hauptantragsteller
  applicants.push({
    key: 'hauptantragsteller',
    name: 'Hauptantragsteller',
    type: 'hauptantragsteller' as const
  });
  
  // Add additional applicants based on financial data
  if (financialData?.additional_applicants_financials && Array.isArray(financialData.additional_applicants_financials)) {
    financialData.additional_applicants_financials.forEach((applicant: any, index: number) => {
      const applicantNumber = index + 2;
      applicants.push({
        key: `applicant_${applicantNumber}`,
        name: `Antragsteller ${applicantNumber}`,
        type: 'applicant' as const,
        number: applicantNumber
      });
    });
  }
  
  return applicants;
}

// Generate applicant-specific checklist items
function generateApplicantSpecificItems(
  applicant: {key: string, name: string, type: 'hauptantragsteller' | 'applicant', number?: number},
  userData: any,
  financialData: any,
  applicationType?: string
): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  
  // Get relevant financial data for this applicant
  let applicantFinancialData = financialData;
  if (applicant.type === 'applicant' && applicant.number) {
    const index = applicant.number - 2;
    applicantFinancialData = financialData?.additional_applicants_financials?.[index] || {};
  }
  
  // Income Check for this applicant
  const incomeErrors = findIncomeErrorsForApplicant(applicantFinancialData, userData, applicant.key);
  const requiredIncomeDocIds = getRequiredIncomeDocuments(applicantFinancialData);
  
  items.push({
    id: `income-check_${applicant.key}`,
    title: `Angegebenes Einkommen stimmt mit den eingereichten Unterlagen überein (${applicant.name})`,
    systemStatus: incomeErrors.length > 0 ? 'wrong' : 'undefined',
    agentStatus: 'undefined',
    systemComment: generateIncomeCommentForApplicant(applicantFinancialData),
    systemErrors: incomeErrors, // Only non-document errors here
    linkedForms: ['einkommenserklaerung'],
    linkedDocs: requiredIncomeDocIds, // Just the base document type IDs
    agentNotes: null
  });

  return items;
}

// Generate general checklist items (not applicant-specific)
function generateGeneralChecklistItems(userData: any, applicationType?: string): ChecklistItem[] {
  const items: ChecklistItem[] = [];

  // Document Completeness (General Documents)
  const generalDocIds = ['meldebescheinigung', 'bauzeichnung', 'lageplan'];
  
  items.push({
    id: 'document-completeness_general',
    title: 'Allgemeine Dokumentenprüfung',
    systemStatus: 'undefined',
    agentStatus: 'undefined',
    systemComment: 'Allgemeine Dokumente werden geprüft',
    systemErrors: [], // Will be populated dynamically by UI
    linkedForms: [],
    linkedDocs: generalDocIds, // Just the base document type IDs
    agentNotes: null
  });

  // Personal Information
  items.push({
    id: 'personal-info',
    title: 'Persönliche Informationen',
    systemStatus: checkPersonalInfo(userData),
    agentStatus: 'undefined',
    systemComment: generatePersonalInfoComment(userData),
    systemErrors: findPersonalInfoErrors(userData),
    linkedForms: ['hauptantrag'],
    linkedDocs: [],
    agentNotes: null
  });

  // Hauptantrag Completeness
  items.push({
    id: 'hauptantrag-completeness',
    title: 'Hauptantrag Vollständigkeit',
    systemStatus: userData?.hauptantrag_progress === 100 ? 'correct' : 'wrong',
    agentStatus: 'undefined',
    systemComment: userData?.hauptantrag_progress === 100
      ? 'Der Antrag wurde vollständig ausgefüllt'
      : 'Der Antrag wurde nicht vollständig ausgefüllt',
    systemErrors: userData?.hauptantrag_progress === 100
      ? []
      : [`Der Antrag wurde nur zu ${userData?.hauptantrag_progress ?? 0}% ausgefüllt`],
    linkedForms: ['hauptantrag'],
    linkedDocs: [],
    agentNotes: null
  });

  // Einkommenserklärung Completeness
  items.push({
    id: 'einkommenserklaerung-completeness',
    title: 'Einkommenserklärung Vollständigkeit',
    systemStatus: userData?.einkommenserklarung_progress === 100 ? 'correct' : 'wrong',
    agentStatus: 'undefined',
    systemComment: userData?.einkommenserklarung_progress === 100
      ? 'Der Antrag wurde vollständig ausgefüllt'
      : 'Der Antrag wurde nicht vollständig ausgefüllt',
    systemErrors: userData?.einkommenserklarung_progress === 100
      ? []
      : [`Der Antrag wurde nur zu ${userData?.einkommenserklarung_progress ?? 0}% ausgefüllt`],
    linkedForms: ['einkommenserklaerung'],
    linkedDocs: [],
    agentNotes: null
  });

  // Marriage certificate check
  if (userData?.is_married) {
    const marriageDocIds = ['marriage_cert', 'heiratsurkunde']; // Support both new and legacy IDs
    
    items.push({
      id: 'marriage-certificate_general',
      title: 'Gültige Heiratsurkunde beigefügt',
      systemStatus: 'undefined',
      agentStatus: 'undefined',
      systemComment: 'Prüfung der Heiratsurkunde',
      systemErrors: [], // Will be populated dynamically by UI
      linkedForms: ['hauptantrag'],
      linkedDocs: marriageDocIds, // Just the base document type IDs
      agentNotes: null
    });
  }

  // Construction check for Neubau
  if (applicationType === 'neubau') {
    items.push({
      id: 'construction-check',
      title: 'Bauprüfung',
      systemStatus: 'undefined',
      agentStatus: 'undefined',
      systemComment: 'Bauunterlagen werden geprüft',
      systemErrors: [],
      linkedForms: ['bauantrag'],
      linkedDocs: [], // Would be populated with actual construction documents
      agentNotes: null
    });
  }

  return items;
}

// Helper functions for applicant-specific income checking
function findIncomeErrorsForApplicant(financialData: any, userData: any, applicantKey: string): string[] {
  const errors: string[] = [];
  if (!financialData) {
    errors.push('Keine Einkommensdaten vorhanden');
    return errors;
  }

  // Income validation logic
  const income = parseFloat(financialData?.monthly_income || '0');
  const threshold = 5000;
  
  if (income > threshold) {
    errors.push(`Haushaltseinkommen (${income.toLocaleString('de-DE')}€) liegt über der Obergrenze von ${threshold.toLocaleString('de-DE')}€`);
  }

  return errors;
}

function generateIncomeCommentForApplicant(financialData: any): string {
  if (!financialData) return 'Keine Einkommensdaten verfügbar';
  
  const income = parseFloat(financialData.monthly_income || '0');
  return `Haushaltseinkommen: ${income.toLocaleString('de-DE')}€ pro Monat`;
}

function getRequiredIncomeDocuments(financialData: any): string[] {
  const requiredDocs: string[] = [];
  
  if (!financialData) return requiredDocs;
  
  if (financialData.hasSalaryIncome === true || financialData.isEarningRegularIncome === true) {
    requiredDocs.push('lohn_gehaltsbescheinigungen'); // Support both new and legacy
  }
  
  if (financialData.hasrentincome === true) {
    requiredDocs.push('einkommenssteuerbescheid', 'einkommenssteuererklaerung');
  }
  
  if (financialData.haspensionincome === true) {
    requiredDocs.push('rentenbescheid');
  }
  
  // Add more document requirements based on financial data...
  
  return requiredDocs;
}

// Keep existing helper functions for backward compatibility
function checkIncomeStatus(financialData: any): 'correct' | 'wrong' | 'undefined' {
  if (!financialData) return 'undefined';
  
  const income = parseFloat(financialData.prior_year_earning || '0');
  const threshold = 5000;
  
  if (income === 0) return 'undefined';
  return income <= threshold ? 'correct' : 'wrong';
}

function generateIncomeComment(financialData: any): string {
  if (!financialData) return 'Keine Einkommensdaten verfügbar';
  
  const income = parseFloat(financialData.monthly_income || '0');
  return `Haushaltseinkommen: ${income.toLocaleString('de-DE')}€ pro Monat`;
}

function findIncomeErrors(financialData: any, userData: any): string[] {
  const errors: string[] = [];
  if (!financialData) {
    errors.push('Keine Einkommensdaten vorhanden');
  }

  const income = parseFloat(financialData?.monthly_income || '0');
  const threshold = 5000;
  
  if (income > threshold) {
    errors.push(`Haushaltseinkommen (${income.toLocaleString('de-DE')}€) liegt über der Obergrenze von ${threshold.toLocaleString('de-DE')}€`);
  }

  // Legacy check - keeping for backward compatibility
  if (!userData || !userData.document_status || typeof userData.document_status !== 'object' || !('gehaltsabrechnung' in userData.document_status)) {
    errors.push('Gehaltsabrechnung fehlt');
  }

  return errors;
}

function checkDocumentCompleteness(documentData: any): 'correct' | 'wrong' | 'undefined' {
  if (!documentData || typeof documentData !== 'object') {
    return 'undefined';
  }

  const requiredDocs = ['lageplan', 'bauzeichnung', 'grundbuchblatt', 'geburtsurkunde', 'personalausweis', 'steuerbescheid', 'einkommenserklaerung', 'sonstige'];
  const uploadedDocs = Object.keys(documentData);

  const missingDocs = requiredDocs.filter(doc => !uploadedDocs.includes(doc));
  return missingDocs.length === 0 ? 'correct' : 'wrong';
}

function generateDocumentComment(documentData: any): string {
  if (!documentData) return 'Keine Dokumente hochgeladen';
  
  const uploadedCount = documentData.length;
  return `${uploadedCount} Dokument${uploadedCount !== 1 ? 'e' : ''} hochgeladen`;
}

function findDocumentErrors(documentData: any): string[] {
  const errors: string[] = [];
  if (!documentData || typeof documentData !== 'object') {
    errors.push('Keine Dokumente hochgeladen');
    return errors;
  }

  const requiredDocs = ['lageplan', 'bauzeichnung', 'grundbuchblatt', 'geburtsurkunde', 'personalausweis', 'steuerbescheid', 'einkommenserklaerung', 'sonstige'];
  const uploadedDocs = Object.keys(documentData);

  const missingDocs = requiredDocs.filter(doc => !uploadedDocs.includes(doc));
  missingDocs.forEach(doc => {
    errors.push(`Fehlendes Dokument: ${doc}`);
  });

  return errors;
}

function checkPersonalInfo(userData: any): 'correct' | 'wrong' | 'undefined' {
  if (!userData) return 'undefined';
  
  const requiredFields = ['firstname', 'lastname', 'email', 'phone'];
  const missingFields = requiredFields.filter(field => !userData[field]);
  
  return missingFields.length === 0 ? 'correct' : 'wrong';
}

function generatePersonalInfoComment(userData: any): string {
  if (!userData) return 'Keine persönlichen Daten verfügbar';
  
  return `${userData.firstname} ${userData.lastname}`;
}

function findPersonalInfoErrors(userData: any): string[] {
  const errors: string[] = [];
  if (!userData) {
    errors.push('Keine persönlichen Daten vorhanden');
    return errors;
  }

  const requiredFields = ['firstname', 'lastname', 'email', 'phone'];
  const missingFields = requiredFields.filter(field => !userData[field]);
  
  missingFields.forEach(field => {
    errors.push(`Fehlendes Feld: ${field}`);
  });
  
  return errors;
}

function getRequiredDocuments(applicationType: string): string[] {
  const baseDocs = ['lageplan', 'bauzeichnung', 'grundbuchblatt'];
  
  switch (applicationType) {
    case 'neubau':
      return [...baseDocs, 'construction-plans', 'building-permit'];
    case 'ersterwerb-eigenheim':
      return [...baseDocs, 'property-deed', 'purchase-contract'];
    default:
      return baseDocs;
  }
}

// Legacy functions for backward compatibility
function generateHeiratsurkundeComment(userData: any): string {
  if (!userData || !userData.document_status || typeof userData.document_status !== 'object') {
    return 'Keine Dokumente vorhanden';
  }
  if ('heiratsurkunde' in userData.document_status || 'marriage_cert' in userData.document_status) {
    return 'Heiratsurkunde bzw. Lebenspartnerschaftsurkunde wurde hochgeladen.';
  } else {
    return 'Die Antragstellenden haben angegeben, in einer eingetragenen Lebenspartnerschaft zu leben; jedoch wurde weder eine Heiratsurkunde noch eine Lebenspartnerschaftsurkunde hochgeladen.';
  }
}

function generateHeiratsurkundeError(userData: any): string[] {
  if (!userData || !userData.document_status || typeof userData.document_status !== 'object') {
    return ['Keine Dokumente vorhanden'];
  }
  if ('heiratsurkunde' in userData.document_status || 'marriage_cert' in userData.document_status) {
    return [];
  } else {
    return ['Heiratsurkunde bzw. Lebenspartnerschaftsurkunde fehlt'];
  }
} 