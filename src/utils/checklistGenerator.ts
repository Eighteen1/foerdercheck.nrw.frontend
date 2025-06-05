import { ChecklistItem } from '../types/checklist';
import { supabase } from '../lib/supabase';

export async function generateChecklistItems(applicationId: string, residentId: string): Promise<ChecklistItem[]> {
  try {
    // Fetch all necessary data for checklist generation
    const [
      { data: applicationData, error: appError },
      { data: userData, error: userError },
      { data: financialData, error: financialError }
    ] = await Promise.all([
      // Get application type and basic info
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
    if (userError) throw new Error('Failed to fetch user data');
    if (financialError) console.warn('No financial data found for user:', financialError);

    const checklistItems: ChecklistItem[] = [];

    // 1. Income Check
    const incomeErrors = findIncomeErrors(financialData, userData);
    checklistItems.push({
      id: 'income-check',
      title: 'Angegebenes Einkommen stimmt mit den Eingereichten Unterlagen überein',
      systemStatus: incomeErrors.length > 0 ? 'wrong' : 'undefined',
      agentStatus: 'undefined',
      systemComment: generateIncomeComment(financialData),
      systemErrors: incomeErrors,
      linkedForms: ['einkommenserklaerung'],
      linkedDocs: [
        ...(userData && userData.document_status && typeof userData.document_status === 'object' && 'gehaltsabrechnung' in userData.document_status ? ['gehaltsabrechnung'] : [])
      ],
      agentNotes: null
    });

    // 2. Document Completeness
    checklistItems.push({
      id: 'document-completeness',
      title: 'Dokumentenprüfung',
      systemStatus: checkDocumentCompleteness(userData.document_status),
      agentStatus: 'undefined',
      systemComment: generateDocumentComment(userData.document_status),
      systemErrors: findDocumentErrors(userData.document_status),
      linkedForms: [],
      linkedDocs: getRequiredDocuments(applicationData?.type),
      agentNotes: null
    });

    // 3. Personal Information
    checklistItems.push({
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

    // 4. Hauptantrag Completeness
    checklistItems.push({
      id: 'hauptantrag-completeness',
      title: 'Hauptantrag Vollständigkeitt',
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

    // 5. Einkommenserklärung Completeness
    checklistItems.push({
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

    // Add more checklist items based on application type
    if (applicationData?.type === 'neubau') {
      checklistItems.push({
        id: 'construction-check',
        title: 'Bauprüfung',
        systemStatus: 'undefined',
        agentStatus: 'undefined',
        systemComment: 'Bauunterlagen werden geprüft',
        systemErrors: [],
        linkedForms: ['bauantrag'],
        linkedDocs: ['construction-plans'],
        agentNotes: null
      });
    }

    // Add more checklist items based on application type
    if (userData?.is_married) {
        const heiratsurkundeErrors = generateHeiratsurkundeError(userData);
        const hasHeiratsurkunde = userData && userData.document_status && typeof userData.document_status === 'object' && 'heiratsurkunde' in userData.document_status;
        checklistItems.push({
          id: 'hereitsurkunde-beigefügt',
          title: 'Gültige Hereitsurkunde beigefügt',
          systemStatus: heiratsurkundeErrors.length > 0 ? 'wrong' : 'undefined',
          agentStatus: 'undefined',
          systemComment: generateHeiratsurkundeComment(userData),
          systemErrors: heiratsurkundeErrors,
          linkedForms: ['hauptantrag'],
          linkedDocs: hasHeiratsurkunde ? ['heiratsurkunde'] : [],
          agentNotes: null
        });
      }

    return checklistItems;
  } catch (error) {
    console.error('Error generating checklist items:', error);
    throw error;
  }
}

// Helper functions for checking different aspects
function checkIncomeStatus(financialData: any): 'correct' | 'wrong' | 'undefined' {
  if (!financialData) return 'undefined';
  
  // Add your income validation logic here
  // Example:
  const income = parseFloat(financialData.prior_year_earning || '0');
  const threshold = 5000; // Example threshold
  
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
    // continue to check for gehaltsabrechnung
  }

  // Add your income validation logic here
  // Example:
  const income = parseFloat(financialData?.monthly_income || '0');
  const threshold = 5000;
  
  if (income > threshold) {
    errors.push(`Haushaltseinkommen (${income.toLocaleString('de-DE')}€) liegt über der Obergrenze von ${threshold.toLocaleString('de-DE')}€`);
  }

  // Check for gehaltsabrechnung in userData.document_status
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

  // Define the required document keys
  const requiredDocs = ['lageplan', 'bauzeichnung', 'grundbuchblatt', 'geburtsurkunde', 'personalausweis', 'steuerbescheid', 'einkommenserklaerung', 'sonstige'];
  const uploadedDocs = Object.keys(documentData);
  console.log('uploadedDocs:', uploadedDocs);

  // Find missing documents
  const missingDocs = requiredDocs.filter(doc => !uploadedDocs.includes(doc));
  missingDocs.forEach(doc => {
    errors.push(`Fehlendes Dokument: ${doc}`);
  });

  return errors;
}

function checkPersonalInfo(userData: any): 'correct' | 'wrong' | 'undefined' {
  if (!userData) return 'undefined';
  
  // Add your personal info validation logic here
  // Example:
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

  // Add your personal info validation logic here
  // Example:
  const requiredFields = ['firstname', 'lastname', 'email', 'phone'];
  const missingFields = requiredFields.filter(field => !userData[field]);
  
  missingFields.forEach(field => {
    errors.push(`Fehlendes Feld: ${field}`);
  });
  
  return errors;
}

function getRequiredDocuments(applicationType: string): string[] {
  // Return required documents based on application type
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

// Checks for the existence of 'heiratsurkunde' in userData.documents and returns a comment
function generateHeiratsurkundeComment(userData: any): string {
  if (!userData || !userData.document_status || typeof userData.document_status !== 'object') {
    return 'Keine Dokumente vorhanden';
  }
  if ('heiratsurkunde' in userData.document_status) {
    return 'Heiratsurkunde bzw. Lebenspartnerschaftsurkunde wurde hochgeladen.';
  } else {
    return 'Die Antragstellenden haben angegeben, in einer eingetragenen Lebenspartnerschaft zu leben; jedoch wurde weder eine Heiratsurkunde noch eine Lebenspartnerschaftsurkunde hochgeladen.';
  }
}

// Checks for the existence of 'heiratsurkunde' in userData.documents and returns an error array
function generateHeiratsurkundeError(userData: any): string[] {
  if (!userData || !userData.document_status || typeof userData.document_status !== 'object') {
    return ['Keine Dokumente vorhanden'];
  }
  if ('heiratsurkunde' in userData.document_status) {
    return [];
  } else {
    return ['Heiratsurkunde bzw. Lebenspartnerschaftsurkunde fehlt'];
  }
} 