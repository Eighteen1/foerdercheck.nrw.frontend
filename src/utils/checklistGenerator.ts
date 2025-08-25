import { ChecklistItem } from '../types/checklist';
import { supabase } from '../lib/supabase';
import { safeFormatCurrencyForDisplay } from './currencyUtils';
import { ValidationService } from '../services/validationService';

// Helper function to check if Krankengeld exists in othermonthlynetincome
const hasKrankengeldIncome = (othermonthlynetincome: any): boolean => {
  if (!othermonthlynetincome || !Array.isArray(othermonthlynetincome)) {
    return false;
  }
  
  return othermonthlynetincome.some((income: any) => {
    if (!income || !income.type || typeof income.type !== 'string') {
      return false;
    }
    
    // Normalize the type string for comparison (lowercase, trim, remove special characters)
    const normalizedType = income.type.toLowerCase().trim().replace(/[^\w\s]/g, '');
    
    // Check for various spellings and variations of "Krankengeld"
    const krankengeldVariations = [
      'krankengeld',
      'kranken geld',
      'krank geld',
      'kg',             // abbreviation
      'krankengelt',    // typo
      'krankengald',    // typo
      'krangengeld',    // typo
      'krankengel',     // typo
      'krangeld'        // typo
    ];
    
    return krankengeldVariations.some(variation => 
      normalizedType.includes(variation) || 
      variation.includes(normalizedType)
    );
  });
};

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
  'pregnancy-cert': 'general',
  'marriage_cert': 'general',
  'heiratsurkunde': 'general', // Legacy compatibility
  'nachweis_disability': 'applicant',
  'pflegegrad_nachweis': 'applicant',
  'vollmacht-cert': 'general',
  'nachweis_darlehen': 'general',
  'eigenkapital_nachweis': 'general',
  
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
  'freiwillige_versicherungsbeitraege_nachweis': 'applicant',
  'freiwillige_krankenversicherung_nachweis': 'applicant',
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
    'rentenbescheid': 'Rentenbescheid',
    'einkommenssteuererklaerung': 'Einkommenssteuererklärung',
    'arbeitslosengeldbescheid': 'Arbeitslosengeldbescheid',
    'werbungskosten_nachweis': 'Nachweis Werbungskosten',
    'kinderbetreuungskosten_nachweis': 'Nachweis Kinderbetreuungskosten',
    'krankengeld_nachweis': 'Nachweis Krankengeld',
    'elterngeld_nachweis': 'Nachweis Elterngeld',
    'ausbildungsfoerderung_nachweis': 'Nachweis Ausbildungsförderung',
    'sonstige_dokumente': 'Sonstige Dokumente',
    'nachweis_darlehen': 'Darlehenszusage(n)',
    'eigenkapital_nachweis': 'Nachweis Eigenkapital',
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
    'nachweis_disability': 'Nachweis über die Schwerbehinderteneigenschaft/GdB',
    'pflegegrad_nachweis': 'Nachweis der Pflegebedürftigkeit',
    'vollmacht-cert': 'Vollmachtsurkunde'
  };
  
  return labels[docId] || docId;
}

// Helper function to determine required financial documents based on finance structure
function getRequiredFinancialDocuments(financeStructureData: any): string[] {
  const requiredDocs: string[] = [];
  
  // Eigenkapital is always required
  requiredDocs.push('eigenkapital_nachweis');
  
  // Check if fremddarlehen exists and has at least one entry
  if (financeStructureData?.fremddarlehen && Array.isArray(financeStructureData.fremddarlehen)) {
    const hasValidFremddarlehen = financeStructureData.fremddarlehen.some((darlehen: any) => {
      // Check if the darlehen has any meaningful data (not just empty strings or null values)
      return darlehen && (
        darlehen.darlehenGeber?.trim() ||
        darlehen.nennbetrag?.trim() ||
        darlehen.zinssatz?.trim() ||
        darlehen.auszahlung?.trim() ||
        darlehen.tilgung?.trim()
      );
    });
    
    if (hasValidFremddarlehen) {
      requiredDocs.push('nachweis_darlehen');
    }
  }
  
  return requiredDocs;
}

// Exported function to get required financial documents for government components
export function getRequiredFinancialDocumentsForGovernment(financeStructureData: any): string[] {
  return getRequiredFinancialDocuments(financeStructureData);
}

// Modified function to generate applicant-specific checklist items
export async function generateChecklistItems(applicationId: string, residentId: string): Promise<ChecklistItem[]> {
  try {
    // Fetch all required data in parallel
    const [
      { data: applicationData, error: appError },
      { data: userData, error: userError },
      { data: financialData, error: financialError },
      { data: financeStructureData, error: financeStructureError }
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
      
      // Get financial data from user_financials table
      supabase
        .from('user_financials')
        .select('*')
        .eq('user_id', residentId)
        .single(),
      
      // Get finance structure data for loan-related documents
      supabase
        .from('finance_structure')
        .select('*')
        .eq('user_id', residentId)
        .single()
    ]);

    if (appError) throw new Error('Failed to fetch application data');
    if (userError) {
      console.warn('Failed to fetch user data, using fallback values:', userError);
    }
    if (financialError) console.warn('No financial data found for user:', financialError);
    if (financeStructureError) console.warn('No finance structure data found for user:', financeStructureError);

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
    const generalItems = await generateGeneralChecklistItems(userData, applicationData?.type, financeStructureData, residentId);
    checklistItems.push(...generalItems);

    return checklistItems;
  } catch (error) {
    console.error('Error generating checklist items:', error);
    throw error;
  }
}

// Helper function to get applicant list with UID-based naming
function getApplicantList(userData: any, financialData: any): Array<{key: string, name: string, type: 'hauptantragsteller' | 'applicant', uuid?: string}> {
  const applicants = [];
  
  // Always include hauptantragsteller
  applicants.push({
    key: 'hauptantragsteller',
    name: 'Hauptantragsteller',
    type: 'hauptantragsteller' as const
  });
  
  // Add additional applicants based on weitere_antragstellende_personen
  if (userData?.weitere_antragstellende_personen) {
    const weiterePersonen = userData.weitere_antragstellende_personen;
    let personCount = 0;
    
    Object.entries(weiterePersonen).forEach(([uuid, person]: [string, any]) => {
      personCount++;
      const firstName = person.firstName || person.firstname || '';
      const lastName = person.lastName || person.lastname || '';
      
      let name;
      if (firstName && lastName) {
        const firstTwo = firstName.substring(0, 2);
        const lastOne = lastName.substring(0, 1);
        name = `Person ${firstTwo}.${lastOne}.`;
      } else {
        name = `Person ${personCount + 1}`;
      }
      
      applicants.push({
        key: `applicant_${uuid}`,
        name: name,
        type: 'applicant' as const,
        uuid: uuid
      });
    });
  }
  
  return applicants;
}

// Generate applicant-specific checklist items
function generateApplicantSpecificItems(
  applicant: {key: string, name: string, type: 'hauptantragsteller' | 'applicant', uuid?: string},
  userData: any,
  financialData: any,
  applicationType?: string
): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  
  // Get relevant financial data for this applicant
  let applicantFinancialData = financialData;
  if (applicant.type === 'applicant' && applicant.uuid) {
    // First try to get financial data from financialData.additional_applicants_financials
    if (financialData?.additional_applicants_financials) {
      const additionalFinancialsData = financialData.additional_applicants_financials;
      let additionalFinancialsObj: Record<string, any> = {};
      
      // Handle backwards compatibility: convert array to UUID-based object if needed
      if (Array.isArray(additionalFinancialsData)) {
        console.log('Converting financial data from legacy array format for checklist generation');
        // Legacy array format - match by index to UUID
        const personUuids = Object.keys(userData?.weitere_antragstellende_personen || {});
        additionalFinancialsData.forEach((fin: any, index: number) => {
          if (personUuids[index]) {
            additionalFinancialsObj[personUuids[index]] = fin;
          }
        });
      } else {
        console.log('Using UUID-based financial data format for checklist generation');
        // Already UUID-based object format
        additionalFinancialsObj = additionalFinancialsData;
      }
      
      // Use financial data from the additional_applicants_financials structure
      if (additionalFinancialsObj[applicant.uuid]) {
        applicantFinancialData = additionalFinancialsObj[applicant.uuid];
        console.log(`Found financial data for applicant ${applicant.uuid}:`, applicantFinancialData);
      }
    }
    
    // Fallback: try to get financial data from userData.weitere_antragstellende_personen
    if (!applicantFinancialData || applicantFinancialData === financialData) {
      const weiterePersonen = userData?.weitere_antragstellende_personen;
      if (weiterePersonen && weiterePersonen[applicant.uuid]) {
        applicantFinancialData = weiterePersonen[applicant.uuid];
        console.log(`Using fallback financial data for applicant ${applicant.uuid}:`, applicantFinancialData);
      }
    }
  }
  
  // Skip if applicant is not part of household (but allow noIncome applicants for disability/care validation)
  if (applicant.type === 'applicant' && applicant.uuid) {
    const weiterePersonen = userData?.weitere_antragstellende_personen;
    const applicantInfo = weiterePersonen?.[applicant.uuid];
    if (applicantInfo?.notHousehold === true) {
      return items; // No validation items needed for this applicant
    }
  }
  
  // Check if applicant has no income (used for skipping financial validations but not disability/care)
  const hasNoIncome = applicant.type === 'applicant' && applicant.uuid 
    ? userData?.weitere_antragstellende_personen?.[applicant.uuid]?.noIncome === true
    : userData?.noIncome === true;

  // Add document validation items for this applicant
  // Always generate validation items (including for noIncome applicants who might have disability/care documents)
  const documentStatus = userData?.document_status || {};
  const validationItems = generateApplicantDocumentValidationItems(
    applicant,
    applicantFinancialData,
    userData,
    documentStatus
  );
  console.log(`Generated ${validationItems.length} validation items for applicant ${applicant.key}:`, validationItems.map(item => item.id));
  items.push(...validationItems);

  return items;
}

// Helper function to determine required documents (adapted from validationService)
export async function determineRequiredDocuments(residentId: string): Promise<{
  general: string[];
  hauptantragsteller: string[];
  additionalApplicants: { [applicantUuid: string]: string[] };
}> {
  try {
    // Get the user's document check data from user_data table
    const { data: userData, error: checkError } = await supabase
      .from('user_data')
      .select(`
        hasinheritanceright,
        ispregnant,
        hasauthorizedperson,
        is_married,
        is_disabled,
        employment,
        weitere_antragstellende_personen,
        noIncome,
        main_behinderungsgrad,
        main_pflegegrad,
        hassupplementaryloan
      `)
      .eq('id', residentId)
      .single();

    if (checkError) throw checkError;

    // Get foerderVariante from object_data table
    const { data: objectData, error: objectError } = await supabase
      .from('object_data')
      .select(`
        foerderVariante,
        haslocationcostloan,
        haswoodconstructionloan,
        eigentumsverhaeltnis,
        baugenehmigung_erforderlich,
        bergsenkungsGebiet,
        erbbaurecht,
        barrierefrei,
        beg_effizienzhaus_40_standard
      `)
      .eq('user_id', residentId)
      .single();

    if (objectError && objectError.code !== 'PGRST116') {
      throw objectError;
    }

    // Get financial data from user_financials table
    const { data: financialData, error: financialError } = await supabase
      .from('user_financials')
      .select('*')
      .eq('user_id', residentId)
      .single();

    if (financialError && financialError.code !== 'PGRST116') {
      console.error('Error loading financial data:', financialError);
    }

    // Get finance structure data for loan-related documents
    const { data: financeStructureData, error: financeStructureError } = await supabase
      .from('finance_structure')
      .select('*')
      .eq('user_id', residentId)
      .single();

    if (financeStructureError && financeStructureError.code !== 'PGRST116') {
      console.error('Error loading finance structure data:', financeStructureError);
    }

    // Get cost structure data for cost-related documents
    const { data: costStructureData, error: costStructureError } = await supabase
      .from('cost_structure')
      .select('*')
      .eq('user_id', residentId)
      .single();

    if (costStructureError && costStructureError.code !== 'PGRST116') {
      console.error('Error loading cost structure data:', costStructureError);
    }

    const result: {
      general: string[];
      hauptantragsteller: string[];
      additionalApplicants: { [applicantUuid: string]: string[] };
    } = {
      general: [] as string[],
      hauptantragsteller: [] as string[],
      additionalApplicants: {} as { [applicantUuid: string]: string[] }
    };

    // General documents (always required)
    result.general.push('meldebescheinigung');

    // Financial documents from finance_structure
    // Eigenkapital is always required
    result.general.push('eigenkapital_nachweis');
    
    // Check if fremddarlehen exists and has at least one entry
    if (financeStructureData?.fremddarlehen && Array.isArray(financeStructureData.fremddarlehen)) {
      const hasValidFremddarlehen = financeStructureData.fremddarlehen.some((darlehen: any) => {
        // Check if the darlehen has any meaningful data (not just empty strings or null values)
        return darlehen && (
          darlehen.darlehenGeber?.trim() ||
          darlehen.nennbetrag?.trim() ||
          darlehen.zinssatz?.trim() ||
          darlehen.auszahlung?.trim() ||
          darlehen.tilgung?.trim()
        );
      });
      
      if (hasValidFremddarlehen) {
        result.general.push('nachweis_darlehen');
      }
    }else if(userData?.hassupplementaryloan === true){
      result.general.push('nachweis_darlehen');
    }

    // Conditional general documents based on object data
    if (objectData?.foerderVariante?.includes('neubau') || (objectData?.foerderVariante?.includes('ersterwerb') && objectData?.barrierefrei === true && financeStructureData?.zusatzdarlehen_barrierefreiheit_nennbetrag > 0)) {
      result.general.push('bauzeichnung');
    }
    // Conditional general documents based on object data
    if (objectData?.foerderVariante?.includes('neubau')) {
      result.general.push('lageplan');
    }

    if (objectData?.eigentumsverhaeltnis) {
      result.general.push('grundbuchblattkopie');
    }

    if (['neubau', 'neubau-wohnung', 'ersterwerb-wohnung', 'ersterwerb-eigenheim'].includes(objectData?.foerderVariante) && objectData?.baugenehmigung_erforderlich) {
      result.general.push('baugenehmigung_vorbescheid');
    }

    if (['neubau', 'neubau-wohnung', 'ersterwerb-wohnung', 'ersterwerb-eigenheim', 'nutzungsaenderung'].includes(objectData?.foerderVariante) && objectData?.bergsenkungsGebiet) {
      result.general.push('bergsenkungsGebiet_erklaerung');
    }

    if (objectData?.foerderVariante?.includes('neubau')) {
      result.general.push('neubau_kaufvertrag');
    }

    if (objectData?.erbbaurecht) {
      result.general.push('erbbaurechtsvertrag');
    }

    if (objectData?.foerderVariante?.includes('ersterwerb') || objectData?.foerderVariante?.includes('bestandserwerb')) {
      result.general.push('kaufvertrag');
    }

    if ((objectData?.foerderVariante?.includes('neubau') || objectData?.foerderVariante?.includes('ersterwerb')) && objectData?.haslocationcostloan && financeStructureData?.zusatzdarlehen_standortbedingte_mehrkosten_nennbetrag > 0) {
      result.general.push('standortbedingte_mehrkosten');
    }

    if (objectData?.haswoodconstructionloan && financeStructureData?.zusatzdarlehen_bauen_mit_holz_nennbetrag > 0) {
      result.general.push('haswoodconstructionloan');
    }

    if ((objectData?.foerderVariante?.includes('neubau') || objectData?.foerderVariante?.includes('ersterwerb')) && objectData?.beg_effizienzhaus_40_standard && financeStructureData?.zusatzdarlehen_effizienzhaus40_nennbetrag > 0) {
      result.general.push('beg40standard_cert');
    }

    if (userData?.ispregnant) {
      result.general.push('pregnancy-cert');
    }

    if (userData?.is_married) {
      result.general.push('marriage_cert');
    }

    if (userData?.hasauthorizedperson) {
      result.general.push('vollmacht-cert');
    }

    // Main applicant disability and care level documents
    if (userData?.main_behinderungsgrad && parseFloat(userData.main_behinderungsgrad) > 0) {
      result.hauptantragsteller.push('nachweis_disability');
    }
    
    if (userData?.main_pflegegrad && parseFloat(userData.main_pflegegrad) > 0) {
      result.hauptantragsteller.push('pflegegrad_nachweis');
    }

    // Main applicant financial documents
    if (financialData) {
      if (userData?.noIncome !== true) {
        if (financialData.hasSalaryIncome === true || financialData.isEarningRegularIncome === true) {
          result.hauptantragsteller.push('lohn_gehaltsbescheinigungen');
        }

        if (financialData.hasrentincome === true) {
          result.hauptantragsteller.push('einkommenssteuerbescheid', 'einkommenssteuererklaerung');
        }

        if (financialData.haspensionincome === true) {
          result.hauptantragsteller.push('rentenbescheid');
        }

        if (financialData.hasablgincome === true) {
          result.hauptantragsteller.push('arbeitslosengeldbescheid');
        }

        if ((financialData.hasSalaryIncome === true || financialData.isEarningRegularIncome === true) && 
            financialData.werbungskosten && parseFloat(financialData.werbungskosten) > 0) {
          result.hauptantragsteller.push('werbungskosten_nachweis');
        }

        if (financialData.kinderbetreuungskosten && parseFloat(financialData.kinderbetreuungskosten) > 0) {
          result.hauptantragsteller.push('kinderbetreuungskosten_nachweis');
        }

        if (financialData.ispayingunterhalt === true) {
          result.hauptantragsteller.push('unterhaltsverpflichtung_nachweis');
        }

        if (financialData.hastaxfreeunterhaltincome === true || financialData.hastaxableunterhaltincome === true) {
          result.hauptantragsteller.push('unterhaltsleistungen_nachweis');
        }

        if (hasKrankengeldIncome(financialData.othermonthlynetincome)) {
          result.hauptantragsteller.push('krankengeld_nachweis');
        }

        if (financialData.haselterngeldincome === true) {
          result.hauptantragsteller.push('elterngeld_nachweis');
        }

        if (financialData.hasbusinessincome === true || financialData.hasagricultureincome === true) {
          result.hauptantragsteller.push('guv_euer_nachweis');
        }

      }

      // Additional applicants financial documents - UUID-based structure
      if (financialData.additional_applicants_financials) {
        const additionalFinancialsData = financialData.additional_applicants_financials;
        let additionalFinancialsObj: Record<string, any> = {};
        
        // Handle backwards compatibility: convert array to UUID-based object if needed
        if (Array.isArray(additionalFinancialsData)) {
          console.log('Converting financial data from legacy array format');
          // Legacy array format - match by index to UUID
          const personUuids = Object.keys(userData?.weitere_antragstellende_personen || {});
          additionalFinancialsData.forEach((fin: any, index: number) => {
            if (personUuids[index]) {
              additionalFinancialsObj[personUuids[index]] = fin;
            }
          });
        } else {
          console.log('Using UUID-based financial data format');
          // Already UUID-based object format
          additionalFinancialsObj = additionalFinancialsData;
        }

        // Process each additional applicant
        Object.entries(additionalFinancialsObj).forEach(([uuid, applicantFinancials]: [string, any]) => {
          result.additionalApplicants[uuid] = [];

          // Check employment type from weitere_antragstellende_personen
          const weiterePersonenData = userData?.weitere_antragstellende_personen || {};
          let weiterePersonenObj: Record<string, any> = {};
          
          // Handle backwards compatibility: convert array to UUID-based object if needed
          if (Array.isArray(weiterePersonenData)) {
            weiterePersonenData.forEach((person: any, index: number) => {
              const personUuid = person.id || `legacy_${index}`;
              weiterePersonenObj[personUuid] = { ...person, id: personUuid };
            });
          } else {
            weiterePersonenObj = weiterePersonenData;
          }

          const additionalApplicant = weiterePersonenObj[uuid];

          // Skip if not part of household
          if (additionalApplicant?.notHousehold === true) {
            return;
          }

          // Financial documents (only for applicants with income)
          if (additionalApplicant?.noIncome !== true) {
            if (applicantFinancials.hasSalaryIncome === true || applicantFinancials.isEarningRegularIncome === true) {
              result.additionalApplicants[uuid].push('lohn_gehaltsbescheinigungen');
            }

            if (applicantFinancials.hasrentincome === true) {
              result.additionalApplicants[uuid].push('einkommenssteuerbescheid', 'einkommenssteuererklaerung');
            }

            if (applicantFinancials.haspensionincome === true) {
              result.additionalApplicants[uuid].push('rentenbescheid');
            }

            if (applicantFinancials.hasablgincome === true) {
              result.additionalApplicants[uuid].push('arbeitslosengeldbescheid');
            }

            if ((applicantFinancials.hasSalaryIncome === true || applicantFinancials.isEarningRegularIncome === true) && 
                applicantFinancials.werbungskosten && parseFloat(applicantFinancials.werbungskosten) > 0) {
              result.additionalApplicants[uuid].push('werbungskosten_nachweis');
            }

            if (applicantFinancials.kinderbetreuungskosten && parseFloat(applicantFinancials.kinderbetreuungskosten) > 0) {
              result.additionalApplicants[uuid].push('kinderbetreuungskosten_nachweis');
            }

            if (applicantFinancials.ispayingunterhalt === true) {
              result.additionalApplicants[uuid].push('unterhaltsverpflichtung_nachweis');
            }

            if (applicantFinancials.hastaxfreeunterhaltincome === true || applicantFinancials.hastaxableunterhaltincome === true) {
              result.additionalApplicants[uuid].push('unterhaltsleistungen_nachweis');
            }

            if (hasKrankengeldIncome(applicantFinancials.othermonthlynetincome)) {
              result.additionalApplicants[uuid].push('krankengeld_nachweis');
            }

            if (applicantFinancials.haselterngeldincome === true) {
              result.additionalApplicants[uuid].push('elterngeld_nachweis');
            }

            if (applicantFinancials.hasbusinessincome === true || applicantFinancials.hasagricultureincome === true) {
              result.additionalApplicants[uuid].push('guv_euer_nachweis');
            }
          }

          // Disability and care level documents (regardless of income status)
          if (additionalApplicant?.behinderungsgrad && parseFloat(additionalApplicant.behinderungsgrad) > 0) {
            result.additionalApplicants[uuid].push('nachweis_disability');
          }
          
          if (additionalApplicant?.pflegegrad && parseFloat(additionalApplicant.pflegegrad) > 0) {
            result.additionalApplicants[uuid].push('pflegegrad_nachweis');
          }
        });
      }
    }

    return result;
  } catch (error) {
    console.error('Error determining required documents:', error);
    return { general: [], hauptantragsteller: [], additionalApplicants: {} };
  }
}

// Generate general checklist items (not applicant-specific)
async function generateGeneralChecklistItems(userData: any, applicationType?: string, financeStructureData?: any, residentId?: string): Promise<ChecklistItem[]> {
  const items: ChecklistItem[] = [];

  // Get document status for completeness check - declare once at the beginning
  const documentStatus = userData?.document_status || {};

  // Get object data for document validation if residentId is provided
  let objectData: any = null;
  let costStructureData: any = null;
  
  if (residentId) {
    try {
      const { data, error } = await supabase
        .from('object_data')
        .select('*')
        .eq('user_id', residentId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.warn('Error loading object data for document validation:', error);
      } else {
        objectData = data;
      }
    } catch (error) {
      console.warn('Error fetching object data for document validation:', error);
    }

    try {
      const { data: costData, error: costError } = await supabase
        .from('cost_structure')
        .select('*')
        .eq('user_id', residentId)
        .single();
      
      if (costError && costError.code !== 'PGRST116') {
        console.warn('Error loading cost structure data for document validation:', costError);
      } else {
        costStructureData = costData;
      }
    } catch (error) {
      console.warn('Error fetching cost structure data for document validation:', error);
    }
  }

  // Hauptantrag Completeness
  items.push({
    id: 'hauptantrag-completeness',
    title: 'Hauptantrag Vollständigkeit',
    systemStatus: userData?.hauptantrag_progress === 100 ? 'correct' : 'wrong',
    agentStatus: 'undefined',
    systemComment: userData?.hauptantrag_progress === 100
      ? 'Das Formular wurde vollständig ausgefüllt'
      : 'Das Formular wurde nicht vollständig ausgefüllt. Klicken Sie auf den blauen Button, um die fehlenden Angaben einzusehen.',
    systemErrors: userData?.hauptantrag_progress === 100
      ? []
      : [`Das Formular wurde nur zu ${userData?.hauptantrag_progress ?? 0}% ausgefüllt`],
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
      ? 'Das Formular wurde vollständig ausgefüllt'
      : 'Das Formular wurde nicht vollständig ausgefüllt. Klicken Sie auf den blauen Button, um die fehlenden Angaben einzusehen.',
    systemErrors: userData?.einkommenserklarung_progress === 100
      ? []
      : [`Das Formular wurde nur zu ${userData?.einkommenserklarung_progress ?? 0}% ausgefüllt`],
    linkedForms: ['einkommenserklaerung'],
    linkedDocs: [],
    agentNotes: null
  });
  
  // Selbstauskunft Completeness
  items.push({
    id: 'selbstauskunft-completeness',
    title: 'Selbstauskunft Vollständigkeit',
    systemStatus: userData?.selbstauskunft_progress === 100 ? 'correct' : 'wrong',
    agentStatus: 'undefined',
    systemComment: userData?.selbstauskunft_progress === 100
      ? 'Das Formular wurde vollständig ausgefüllt'
      : 'Das Formular wurde nicht vollständig ausgefüllt. Klicken Sie auf den blauen Button, um die fehlenden Angaben einzusehen.',
    systemErrors: userData?.selbstauskunft_progress === 100
      ? []
      : [`Das Formular wurde nur zu ${userData?.selbstauskunft_progress ?? 0}% ausgefüllt`],
    linkedForms: ['selbstauskunft'],
    linkedDocs: [],
    agentNotes: null
  });

  // Haushaltsauskunft Completeness
  items.push({
    id: 'haushaltsauskunft-completeness',
    title: 'Haushaltsauskunft Vollständigkeit (Anlage zur Einkommenserklärung)',
    systemStatus: userData?.haushaltsauskunft_progress === 100 ? 'correct' : 'wrong',
    agentStatus: 'undefined',
    systemComment: userData?.haushaltsauskunft_progress === 100
      ? 'Das Formular wurde vollständig ausgefüllt'
      : 'Das Formular wurde nicht vollständig ausgefüllt. Klicken Sie auf den blauen Button, um die fehlenden Angaben einzusehen.',
    systemErrors: userData?.haushaltsauskunft_progress === 100
      ? []
      : [`Das Formular wurde nur zu ${userData?.haushaltsauskunft_progress ?? 0}% ausgefüllt`],
    linkedForms: ['haushaltsauskunft'],
    linkedDocs: [],
    agentNotes: null
  });

  // Household Income, Income Group, Available Monthly Income, and Additional Financial Criteria Validation
  if (residentId) {
    try {
      const validationService = new ValidationService(residentId);
      
      // Execute validations sequentially to ensure proper dependency order
      // 1. First calculate household income
      const householdIncomeSection = await validationService.calculateHouseholdIncomeForChecklist();
      
      // 2. Then determine income group (this sets the eligibility result)
      const incomeGroupSection = await validationService.determineIncomeGroupForChecklist();
      
      // 3. Calculate available monthly income (independent)
      const availableIncomeSection = await validationService.calculateAvailableMonthlyIncomeForChecklist();
      
      // 4. Finally validate additional financial criteria (depends on income group)
      const additionalFinancialSection = await validationService.validateAdditionalFinancialCriteriaForChecklist();
      
      // 5. Validate cross-checks between forms
      const crossChecksSection = await validationService.validateCrossChecksForChecklist();
      
      // Collect income bounds errors to show in household income calculation
      const incomeBoundsErrors: string[] = [];
      if (incomeGroupSection.errors && incomeGroupSection.errors.length > 0) {
        // Filter for income bounds related errors
        const boundsErrors = incomeGroupSection.errors.filter(error => 
          error.includes('überschreitet') || 
          error.includes('über der') || 
          error.includes('über den') ||
          error.includes('nicht förderfähig')
        );
        // Rephrase applicant-specific messages to be agent-appropriate
        const rephrasedBoundsErrors = boundsErrors.map(error => rephraseApplicantMessage(error));
        incomeBoundsErrors.push(...rephrasedBoundsErrors);
      }
      
      // Combine household income errors with income bounds errors
      const allHouseholdIncomeErrors = [
        ...(householdIncomeSection.errors || []),
        ...incomeBoundsErrors
      ];
      
      // Determine system status for household income calculation
      let householdIncomeStatus: 'correct' | 'wrong' | 'undefined' = 'undefined';
      if (allHouseholdIncomeErrors.length > 0) {
        householdIncomeStatus = 'wrong';
      } else if (householdIncomeSection.warnings.length === 0 && householdIncomeSection.calculations && householdIncomeSection.calculations.length > 0) {
        householdIncomeStatus = 'correct';
      }
      
      // Format calculations for household income display
      let householdIncomeComment = 'xyzreg.Dieser Checklistenpunkt dient der Veranschaulichung der Berechnung des Haushaltseinkommens. Die unten aufgeführten verwandten Prüfpunkte unterstützen Sie dabei, die Richtigkeit der gemachten Angaben anhand der eingereichten Nachweise zu überprüfen. Die Berechnung erfolgt auf Grundlage der Angaben in der Einkommenserklärung, der Haushaltsauskunft und dem Hauptantrag. \n\n';
      if (householdIncomeSection.calculations && householdIncomeSection.calculations.length > 0) {
        householdIncomeComment = householdIncomeComment + householdIncomeSection.calculations.join('\n');
      }
      
      if (!householdIncomeComment) {
        householdIncomeComment = 'Haushaltseinkommens-Berechnung konnte nicht durchgeführt werden.';
      }

      if(householdIncomeStatus === 'correct'){
        householdIncomeComment = householdIncomeComment + '\n ✓ Das Haushalts-Einkommen wurde erfolgreich berechnet. Bitte überprüfen Sie die Berechnung und die verwandten Prüfpunkte.';
      }
      
      /* Add income bounds information to comment if there are bounds errors
      if (incomeBoundsErrors.length > 0) {
        householdIncomeComment += '\n\n⚠️ Einkommensgrenzen überschritten:';
        householdIncomeComment += '\n' + incomeBoundsErrors.join('\n');
      }*/
      
      // Create household income calculation checklist item
      items.push({
        id: 'household-income-calculation',
        title: 'Haushaltseinkommens Berechnung',
        systemStatus: householdIncomeStatus,
        agentStatus: 'undefined',
        systemComment: householdIncomeComment,
        systemErrors: allHouseholdIncomeErrors,
        systemWarnings: householdIncomeSection.warnings || [],
        linkedForms: ['einkommenserklaerung', 'haushaltsauskunft', 'hauptantrag'],
        linkedDocs: [],
        agentNotes: null
      });
      
      // Determine system status for income group validation
      let incomeGroupStatus: 'correct' | 'wrong' | 'undefined' = 'undefined';
      if (incomeGroupSection.errors && incomeGroupSection.errors.length > 0) {
        incomeGroupStatus = 'wrong';
      } else if (incomeGroupSection.warnings.length === 0 && incomeGroupSection.calculations && incomeGroupSection.calculations.length > 0) {
        incomeGroupStatus = 'correct';
      }
      
      // Format calculations for income group display
      let incomeGroupComment = 'xyzreg.Dieser Checklistenpunkt dient der Veranschaulichung der Berechnung der Einkommensgruppe. Bitte schauen Sie sich den unten aufgeführten verwandten Prüfpunkt zur Haushaltseinkommens-Berechnung an. \n\n';
      if (incomeGroupSection.calculations && incomeGroupSection.calculations.length > 0) {
        // Filter out group-related messages to avoid duplication with success message
        const filteredCalculations = incomeGroupSection.calculations.filter(calc => 
          !calc.includes('Sie erfüllen die Voraussetzungen für Gruppe') &&
          !calc.startsWith('Einkommensgruppe:')
        );
        incomeGroupComment = incomeGroupComment + filteredCalculations.join('\n');
      }
      
      if (!incomeGroupComment) {
        incomeGroupComment = 'Einkommensgruppen-Bestimmung konnte nicht durchgeführt werden.';
      }

      if(incomeGroupStatus === 'correct'){
        // Find the group information from calculations
        let groupInfo = '';
        if (incomeGroupSection.calculations) {
          const groupCalculation = incomeGroupSection.calculations.find(calc => calc.startsWith('Einkommensgruppe:'));
          if (groupCalculation) {
            groupInfo = ` - ${groupCalculation}`;
          }
        }
        incomeGroupComment = incomeGroupComment + `\n ✓ Die Einkommensgruppen-Bestimmung wurde erfolgreich durchgeführt${groupInfo}. Bitte überprüfen Sie die Berechnung und die verwandten Prüfpunkte.`;
      }
      
      // Create income group validation checklist item
      items.push({
        id: 'income-group-calculation',
        title: 'Erechnetes Haushalts-Einkommen liegt in gültiger Einkommensgruppe',
        systemStatus: incomeGroupStatus,
        agentStatus: 'undefined',
        systemComment: incomeGroupComment,
        systemErrors: (incomeGroupSection.errors || []).map(error => rephraseApplicantMessage(error)),
        systemWarnings: incomeGroupSection.warnings || [],
        linkedForms: [ 'hauptantrag', 'haushaltsauskunft', 'einkommenserklaerung', 'selbstauskunft'],
        linkedDocs: [],
        agentNotes: null
      });

      // Determine system status for available monthly income calculation
      let availableIncomeStatus: 'correct' | 'wrong' | 'undefined' = 'undefined';
      if (availableIncomeSection.errors && availableIncomeSection.errors.length > 0) {
        availableIncomeStatus = 'wrong';
      } else if (availableIncomeSection.warnings.length === 0 && availableIncomeSection.calculations && availableIncomeSection.calculations.length > 0) {
        availableIncomeStatus = 'correct';
      }
      
      // Format calculations for available monthly income display
      let availableIncomeComment = 'xyzreg.Dieser Checklistenpunkt dient der Veranschaulichung der Berechnung des verfügbaren Monatseinkommens. Die unten aufgeführten verwandten Prüfpunkte unterstützen Sie dabei, die Richtigkeit der gemachten Angaben anhand der eingereichten Nachweise zu überprüfen. Die Berechnung erfolgt auf Grundlage der Angaben in der Selbstauskunft. \n\n';
      if (availableIncomeSection.calculations && availableIncomeSection.calculations.length > 0) {
        availableIncomeComment = availableIncomeComment + availableIncomeSection.calculations.join('\n');
      }
      
      if (!availableIncomeComment) {
        availableIncomeComment = 'Berechnung des verfügbaren Monatseinkommens konnte nicht durchgeführt werden.';
      }

      if(availableIncomeStatus === 'correct'){
        availableIncomeComment = availableIncomeComment + '\n ✓ Das verfügbare Monatseinkommen wurde erfolgreich berechnet. Bitte überprüfen Sie die Berechnung.';
      }
      
      // Create available monthly income calculation checklist item
      items.push({
        id: 'available-monthly-income-calculation',
        title: 'Berechnung des verfügbaren Monatseinkommens',
        systemStatus: availableIncomeStatus,
        agentStatus: 'undefined',
        systemComment: availableIncomeComment,
        systemErrors: availableIncomeSection.errors || [],
        systemWarnings: availableIncomeSection.warnings || [],
        linkedForms: ['selbstauskunft'],
        linkedDocs: [],
        agentNotes: null
      });

      // Determine system status for additional financial criteria validation
      let additionalFinancialStatus: 'correct' | 'wrong' | 'undefined' = 'undefined';
      if (additionalFinancialSection.errors && additionalFinancialSection.errors.length > 0) {
        additionalFinancialStatus = 'wrong';
      } else if (additionalFinancialSection.warnings.length === 0 && additionalFinancialSection.calculations && additionalFinancialSection.calculations.length > 0) {
        additionalFinancialStatus = 'correct';
      }
      
      // Format calculations for additional financial criteria display
      let additionalFinancialComment = 'xyzreg.Dieser Checklistenpunkt dient der Validierung der Einhaltung der Obergrenze des Grunddarlehens. Bitte schauen Sie sich den unten aufgeführten verwandten Prüfpunkt zur ermittelung der Einkommensgruppe an. \n\n';
      if (additionalFinancialSection.calculations && additionalFinancialSection.calculations.length > 0) {
        additionalFinancialComment = additionalFinancialComment + additionalFinancialSection.calculations.join('\n');
      }
      
      if (!additionalFinancialComment) {
        additionalFinancialComment = 'Validierung der Darlehensgrenze konnte nicht durchgeführt werden.';
      }

      if(additionalFinancialStatus === 'correct'){
        additionalFinancialComment = additionalFinancialComment + '\n ✓ Die Darlehensgrenze wurde erfolgreich validiert. Bitte überprüfen Sie die Berechnung und die verwandten Prüfpunkte.';
      }
      
      if(userData?.hassupplementaryloan != true){
        // Create additional financial criteria validation checklist item
        items.push({
          id: 'additional-financial-criteria-calculation',
          title: 'Grunddarlehen Obergrenze wurde eingehalten',
          systemStatus: additionalFinancialStatus,
          agentStatus: 'undefined',
          systemComment: additionalFinancialComment,
          systemErrors: additionalFinancialSection.errors || [],
          systemWarnings: additionalFinancialSection.warnings || [],
          linkedForms: ['hauptantrag', 'haushaltsauskunft', 'einkommenserklaerung'],
          linkedDocs: [],
          agentNotes: null
        });
      }
      
      // Determine system status for cross-checks validation
      let crossChecksStatus: 'correct' | 'wrong' | 'undefined' = 'undefined';
      if (crossChecksSection.errors && crossChecksSection.errors.length > 0) {
        crossChecksStatus = 'wrong';
      } else if (crossChecksSection.warnings.length === 0) {
        crossChecksStatus = 'correct';
      }
      
      // Create cross-checks validation checklist item
      items.push({
        id: 'cross-checks-validation',
        title: 'Übergreifende Prüfungen zwischen Formularen',
        systemStatus: crossChecksStatus,
        agentStatus: 'undefined',
        systemComment: 'Dieser Checklistenpunkt dient der Validierung der Konsistenz zwischen verschiedenen Formularen. Es werden folgende übergreifende Prüfungen durchgeführt:\n\n' +
          '• Haushaltsgröße und -zusammensetzung zwischen Hauptantrag und Haushaltsauskunft\n' +
          '• Anzahl der behinderten Personen zwischen Formularen\n' +
          '• Netto- vs. Brutto-Einkommen Validierung\n' +
          '• Gehalt und Unterhaltszahlungen Konsistenz\n' +
          '• Selbsthilfe Eigentumsmaßnahmen Konsistenz zwischen Formularen\n\n' +
          (crossChecksStatus === 'correct' ? 'Alle übergreifenden Prüfungen wurden erfolgreich validiert. Bitte überprüfen Sie die Ergebnisse.' : ''),
        systemErrors: crossChecksSection.errors || [],
        systemWarnings: crossChecksSection.warnings || [],
        linkedForms: ['hauptantrag', 'haushaltsauskunft', 'einkommenserklaerung', 'selbsthilfeleistungen'],
        linkedDocs: [],
        agentNotes: null
      });
      
    } catch (error) {
      console.warn('Error calculating household income, income group, available monthly income, additional financial criteria, and cross-checks for checklist:', error);
      
      // Create error items for all five
      items.push({
        id: 'household-income-calculation',
        title: 'Haushaltseinkommens-Berechnung',
        systemStatus: 'wrong',
        agentStatus: 'undefined',
        systemComment: 'Fehler bei der Haushaltseinkommens-Berechnung. Bitte überprüfen Sie die Eingabedaten.',
        systemErrors: [`Berechnungsfehler: ${error}`],
        linkedForms: ['einkommenserklaerung', 'haushaltsauskunft', 'hauptantrag'],
        linkedDocs: [],
        agentNotes: null
      });
      
      items.push({
        id: 'income-group-calculation',
        title: 'Erechnetes Haushalts-Einkommen liegt in gültiger Einkommensgruppe',
        systemStatus: 'wrong',
        agentStatus: 'undefined',
        systemComment: 'Fehler bei der Einkommensgruppen-Validierung. Bitte überprüfen Sie die Eingabedaten.',
        systemErrors: [`Validierungsfehler: ${error}`],
        linkedForms: ['hauptantrag', 'haushaltsauskunft', 'einkommenserklaerung', 'selbstauskunft'],
        linkedDocs: [],
        agentNotes: null
      });

      items.push({
        id: 'available-monthly-income-calculation',
        title: 'Berechnung des verfügbaren Monatseinkommens',
        systemStatus: 'wrong',
        agentStatus: 'undefined',
        systemComment: 'Fehler bei der Berechnung des verfügbaren Monatseinkommens. Bitte überprüfen Sie die Eingabedaten.',
        systemErrors: [`Berechnungsfehler: ${error}`],
        linkedForms: ['selbstauskunft'],
        linkedDocs: [],
        agentNotes: null
      });
      if(userData?.hassupplementaryloan != true){
        items.push({
          id: 'additional-financial-criteria-calculation',
          title: 'Grunddarlehen Obergrenze wurde eingehalten',
          systemStatus: 'wrong',
          agentStatus: 'undefined',
          systemComment: 'Fehler bei der Validierung der Darlehensgrenze. Bitte überprüfen Sie die Eingabedaten.',
          systemErrors: [`Validierungsfehler: ${error}`],
          linkedForms: ['hauptantrag', 'haushaltsauskunft', 'einkommenserklaerung'],
          linkedDocs: [],
          agentNotes: null
        });
      }
      
      // Create error item for cross-checks validation
      items.push({
        id: 'cross-checks-validation',
        title: 'Übergreifende Prüfungen zwischen Formularen',
        systemStatus: 'wrong',
        agentStatus: 'undefined',
        systemComment: 'Fehler bei den übergreifenden Prüfungen. Bitte überprüfen Sie die Eingabedaten.',
        systemErrors: [`Validierungsfehler: ${error}`],
        linkedForms: ['hauptantrag', 'haushaltsauskunft', 'einkommenserklaerung', 'selbsthilfeleistungen'],
        linkedDocs: [],
        agentNotes: null
      });
    }
  }

  // Berechnung der Wohn- und Nutzfläche nach WoFIV Completeness
  items.push({
    id: 'wofiv-completeness',
    title: 'Berechnung der Wohn- und Nutzfläche nach WoFIV Vollständigkeit',
    systemStatus: userData?.berechnung_woFIV_progress === 100 ? 'correct' : 'wrong',
    agentStatus: 'undefined',
    systemComment: userData?.berechnung_woFIV_progress === 100
      ? 'Das Formular wurde vollständig ausgefüllt'
      : 'Das Formular wurde nicht vollständig ausgefüllt. Klicken Sie auf den blauen Button, um die fehlenden Angaben einzusehen.',
    systemErrors: userData?.berechnung_woFIV_progress === 100
      ? []
      : [`Das Formular wurde nur zu ${userData?.berechnung_woFIV_progress ?? 0}% ausgefüllt`],
    linkedForms: ['wofiv'],
    linkedDocs: [],
    agentNotes: null
  });

  // Berechnung des Brutto-Rauminhalts des Gebäudes nach DIN 277 Completeness
  items.push({
    id: 'din277-completeness',
    title: 'Berechnung des Brutto-Rauminhalts des Gebäudes nach DIN 277 Vollständigkeit',
    systemStatus: userData?.berechnung_din277_progress === 100 ? 'correct' : 'wrong',
    agentStatus: 'undefined',
    systemComment: userData?.berechnung_din277_progress === 100
      ? 'Das Formular wurde vollständig ausgefüllt'
      : 'Das Formular wurde nicht vollständig ausgefüllt. Klicken Sie auf den blauen Button, um die fehlenden Angaben einzusehen.',
    systemErrors: userData?.berechnung_din277_progress === 100
      ? []
      : [`Das Formular wurde nur zu ${userData?.berechnung_din277_progress ?? 0}% ausgefüllt`],
    linkedForms: ['din277'],
    linkedDocs: [],
    agentNotes: null
  });

  // Selbsthilfe Eigentumsmaßnahmen Completeness
  items.push({
    id: 'selbsthilfe-completeness',
    title: 'Selbsthilfe Eigentumsmaßnahmen Vollständigkeit',
    systemStatus: userData?.selbsthilfe_progress === 100 ? 'correct' : 'wrong',
    agentStatus: 'undefined',
    systemComment: userData?.selbsthilfe_progress === 100
      ? 'Das Formular wurde vollständig ausgefüllt'
      : 'Das Formular wurde nicht vollständig ausgefüllt. Klicken Sie auf den blauen Button, um die fehlenden Angaben einzusehen.',
    systemErrors: userData?.selbsthilfe_progress === 100
      ? []
      : [`Das Formular wurde nur zu ${userData?.selbsthilfe_progress ?? 0}% ausgefüllt`],
    linkedForms: ['selbsthilfeleistungen'],
    linkedDocs: [],
    agentNotes: null
  });
   // Selbsthilfe Eigentumsmaßnahmen Completeness
   let selbsthilfeIsBelieveablecomment =  userData?.selbsthilfe_progress === 100
   ? 'Das Selbsthilfe Eigentumsmaßnahmen Formular wurde vollständig ausgefüllt'
   : 'Das Selbsthilfe Eigentumsmaßnahmen Formular wurde nicht vollständig ausgefüllt. Klicken Sie auf den blauen Button, um die fehlenden Angaben einzusehen.';

   // Selbsthilfe Eigentumsmaßnahmen Glaubwürdigkeit - only add if willProvideSelfHelp is true
   if (objectData?.selbsthilfe_angaben?.willProvideSelfHelp === true) {
     const totalSelbsthilfe = objectData?.selbsthilfe_angaben?.totals?.totalSelbsthilfe;
     const formattedAmount = totalSelbsthilfe !== undefined && totalSelbsthilfe !== null
       ? safeFormatCurrencyForDisplay(totalSelbsthilfe)
       : '(Betrag nicht verfügbar)';
     
     items.push({
       id: 'selbsthilfe-isbelieveable',
       title: 'Selbsthilfe Eigentumsmaßnahmen sind glaubwürdig',
       systemStatus: 'undefined',
       agentStatus: 'undefined',
       systemComment: `Der Antragsteller hat angegeben, Selbsthilfemaßnahmen in Höhe von ${formattedAmount} zu erbringen. \n\n Bitte prüfen Sie, ob die Angaben der antragstellenden Person glaubhaft sind und ob der Wert der Selbsthilfearbeiten dem Wert der dadurch ersparten Unternehmensleistungen entspricht. \n\n` + selbsthilfeIsBelieveablecomment,
       systemErrors: [],
       linkedForms: ['selbsthilfeleistungen', 'hauptantrag'],
       linkedDocs: [],
       agentNotes: null
     });
   }
  // Zusatzdarlehen Familienbonus validation
  if (userData?.hassupplementaryloan != true && 
      parseInt(userData?.child_count || '0') > 0 && 
      financeStructureData?.zusatzdarlehen_familienbonus_nennbetrag > 0) {
    
    // Calculate the maximum allowed familienbonus
    const totalEligibleCount = parseInt(userData?.child_count || '0') + parseInt(userData?.disabledadultscount || '0');
    const maxFamilienbonus = totalEligibleCount * 24000.00; 
    const familienbonusValue = financeStructureData?.zusatzdarlehen_familienbonus_nennbetrag;
    
    // Check if the familienbonus exceeds the limit
    const isWithinLimit = familienbonusValue <= maxFamilienbonus;

    const docs = generateFullDocumentIds(['meldebescheinigung'], 'general', documentStatus);
  

    let commentPerson = 'Berrechtigte Personen:\n';
      
    // Check for business income from Einkommenserklärung
    if (userData?.child_count > 0) {
      commentPerson += `• ${userData?.child_count} Kind(er)\n`;
    }
    let disabilityDocs: string[] = [];
    if (userData?.disabledadultscount > 0) {
      commentPerson += `• ${userData?.disabledadultscount} Schwerbehinderte(r) Erwachsene(r) \n`;
      disabilityDocs = generateDisabilityDocumentIds(userData, documentStatus);
    }
    
    
    items.push({
      id: 'familienbonus_darlehens_isvalid',
      title: 'Zusatzdarlehen Familienbonus - Gültigkeitsprüfung',
      systemStatus: isWithinLimit ? 'undefined' : 'wrong',
      agentStatus: 'undefined',
      systemComment: isWithinLimit
        ? `Der Familienbonus in Höhe von ${safeFormatCurrencyForDisplay(familienbonusValue)} liegt innerhalb des erlaubten Limits von ${safeFormatCurrencyForDisplay(maxFamilienbonus)} (${totalEligibleCount} berechtigte Person(en) × 24.000,00€).\n ${commentPerson} \n Zu Prüfen: Hauptantrag (Schritt 2 & 6), die Anlage zur Einkommenserklärung, sowie die Nachweise der berechtigten Personen`
        : `Der Familienbonus in Höhe von ${safeFormatCurrencyForDisplay(familienbonusValue)} überschreitet das erlaubte Limit von ${safeFormatCurrencyForDisplay(maxFamilienbonus)} (${totalEligibleCount} berechtigte Person(en) × 24.000,00€).\n ${commentPerson} \n Zu Prüfen: Hauptantrag (Schritt 2 & 6), die Anlage zur Einkommenserklärung, sowie die Nachweise der berechtigten Personen`,
      systemErrors: isWithinLimit
        ? []
        : [`Familienbonus darf maximal ${safeFormatCurrencyForDisplay(maxFamilienbonus)} betragen (${totalEligibleCount} berechtigte Person(en) × 24.000,00€, aktuell: ${safeFormatCurrencyForDisplay(familienbonusValue)})`],
      linkedForms: ['hauptantrag', 'haushaltsauskunft'],
      linkedDocs: docs.length > 0 ? [...docs, ...disabilityDocs] : ['meldebescheinigung', ...disabilityDocs],
      agentNotes: null
    });
  }
  // Zusatzdarlehen Barrierefreiheit validation
  if (userData?.hassupplementaryloan != true && 
      (objectData?.foerderVariante.includes('neubau') || objectData?.foerderVariante.includes('ersterwerb')) &&
      objectData?.barrierefrei === true && 
      financeStructureData?.zusatzdarlehen_barrierefreiheit_nennbetrag > 0) {
  
    const barrierefreiValue = financeStructureData?.zusatzdarlehen_barrierefreiheit_nennbetrag;
    
    // Check if the familienbonus exceeds the limit
    const isWithinLimit = barrierefreiValue <= 11500.00;

    const docs = generateFullDocumentIds(['bauzeichnung'], 'general', documentStatus);

    items.push({
      id: 'barrierefreiheit_darlehens_isvalid',
      title: 'Zusatzdarlehen Barrierefreiheit - Gültigkeitsprüfung',
      systemStatus: isWithinLimit ? 'undefined' : 'wrong',
      agentStatus: 'undefined',
      systemComment: isWithinLimit
        ? `Das Zusatzdarlehen für Barrierefreiheit in Höhe von ${safeFormatCurrencyForDisplay(barrierefreiValue)} liegt innerhalb des erlaubten Limits von 11.500,00€.\n Zu Prüfen: Hauptantrag (Schritt 3 & 6), sowie die eingereichte Bauzeichnung o. Ä.`
        : `Das Zusatzdarlehen für Barrierefreiheit in Höhe von ${safeFormatCurrencyForDisplay(barrierefreiValue)} überschreitet das erlaubte Limit von 11.500,00€.\n Zu Prüfen: Hauptantrag (Schritt 3 & 6), sowie die eingereichte Bauzeichnung o. Ä.`,
      systemErrors: isWithinLimit
        ? []
        : [`Das Zusatzdarlehen für Barrierefreiheit darf maximal 11.500,00€ betragen, aktuell: ${safeFormatCurrencyForDisplay(barrierefreiValue)}`],
      linkedForms: ['hauptantrag'],
      linkedDocs: docs.length > 0 ? docs : ['bauzeichnung'],
      agentNotes: null
    });
  }
  // Zusatzdarlehen BEG 40 validation
  if (userData?.hassupplementaryloan != true && 
    (objectData?.foerderVariante.includes('neubau') || objectData?.foerderVariante.includes('ersterwerb')) &&
    objectData?.beg_effizienzhaus_40_standard === true && 
    financeStructureData?.zusatzdarlehen_effizienzhaus40_nennbetrag > 0) {

    const beg40Value = financeStructureData?.zusatzdarlehen_effizienzhaus40_nennbetrag;
    
    // Check if the familienbonus exceeds the limit
    const isWithinLimit = beg40Value <= 30000.00;

    const docs = generateFullDocumentIds(['beg40standard_cert'], 'general', documentStatus);

    items.push({
      id: 'beg40standard_darlehens_isvalid',
      title: 'Zusatzdarlehen BEG Effizienzhaus 40 Standard - Gültigkeitsprüfung',
      systemStatus: isWithinLimit ? 'undefined' : 'wrong',
      agentStatus: 'undefined',
      systemComment: isWithinLimit
        ? `Das Zusatzdarlehen für BEG Effizienzhaus 40 Standard in Höhe von ${safeFormatCurrencyForDisplay(beg40Value)} liegt innerhalb des erlaubten Limits von 30.000,00€.\n Zu Prüfen: Hauptantrag (Schritt 3 & 6), sowie die eingereichten Nachweise o. Ä.`
        : `Das Zusatzdarlehen für BEG Effizienzhaus 40 Standard in Höhe von ${safeFormatCurrencyForDisplay(beg40Value)} überschreitet das erlaubte Limit von 30.000,00€.\n Zu Prüfen: Hauptantrag (Schritt 3 & 6), sowie die eingereichte Nachweise o. Ä.`,
      systemErrors: isWithinLimit
        ? []
        : [`Das Zusatzdarlehen für BEG Effizienzhaus 40 Standard darf maximal 30.000,00€ betragen, aktuell: ${safeFormatCurrencyForDisplay(beg40Value)}`],
      linkedForms: ['hauptantrag'],
      linkedDocs: docs.length > 0 ? docs : ['beg40standard_cert'],
      agentNotes: null
    });
  }
  // Zusatzdarlehen Standortbedingte Mehrkosten validation
  if (userData?.hassupplementaryloan != true && 
    (objectData?.foerderVariante.includes('neubau') || objectData?.foerderVariante.includes('ersterwerb')) &&
    objectData?.haslocationcostloan === true && 
    financeStructureData?.zusatzdarlehen_standortbedingte_mehrkosten_nennbetrag > 0) {

    const standortValue = financeStructureData?.zusatzdarlehen_standortbedingte_mehrkosten_nennbetrag;
    const costValue = costStructureData?.standortbedingte_mehrkosten;

    // Check if the familienbonus exceeds the limit
    let isWithinLimit = true;
    let errorMessages = [];
    
    if(standortValue > 25000.00){
      isWithinLimit = false;
      errorMessages.push(`Das Zusatzdarlehen für standortbedingte Mehrkosten darf maximal 25.000,00€ betragen, aktuell: ${safeFormatCurrencyForDisplay(standortValue)}`);
    }
    
    if (costValue && standortValue > (costValue * 0.75)) {
      isWithinLimit = false;
      errorMessages.push(`Der Nennbetrag des Zusatzdarlehens für standortbedingte Mehrkosten darf maximal 75% der angegebenen förderfähigen standortbedingten Mehrkosten betragen (maximal ${safeFormatCurrencyForDisplay(costValue * 0.75)}, aktuell: ${safeFormatCurrencyForDisplay(standortValue)})`);
    }

    const docs = generateFullDocumentIds(['standortbedingte_mehrkosten'], 'general', documentStatus);

    items.push({
      id: 'standortbedingte_mehrkosten_darlehens_isvalid',
      title: 'Zusatzdarlehen standortbedingte Mehrkosten - Gültigkeitsprüfung',
      systemStatus: isWithinLimit ? 'undefined' : 'wrong',
      agentStatus: 'undefined',
      systemComment: isWithinLimit
        ? `Das Zusatzdarlehen für standortbedingte Mehrkosten in Höhe von ${safeFormatCurrencyForDisplay(standortValue)} liegt innerhalb der erlaubten Limits:\n- Maximal 25.000,00€\n- Maximal 75% der förderfähigen standortbedingten Mehrkosten (${costValue ? safeFormatCurrencyForDisplay(costValue) : 'nicht angegeben'})\n\nZu Prüfen: Hauptantrag (Schritt 3, 5 & 6), sowie die eingereichten Nachweise o. Ä.`
        : `Das Zusatzdarlehen für standortbedingte Mehrkosten in Höhe von ${safeFormatCurrencyForDisplay(standortValue)} überschreitet die erlaubten Limits:\n- Maximal 25.000,00€\n- Maximal 75% der förderfähigen standortbedingten Mehrkosten (${costValue ? safeFormatCurrencyForDisplay(costValue) : 'nicht angegeben'})\n\nZu Prüfen: Hauptantrag (Schritt 3, 5 & 6), sowie die eingereichten Nachweise o. Ä.`,
      systemErrors: isWithinLimit ? [] : errorMessages,
      linkedForms: ['hauptantrag'],
      linkedDocs: docs.length > 0 ? docs : ['standortbedingte_mehrkosten'],
      agentNotes: null
    });
  }

  // Zusatzdarlehen Bauen mit Holz validation
  if (userData?.hassupplementaryloan != true && 
    objectData?.haswoodconstructionloan === true && 
    financeStructureData?.zusatzdarlehen_bauen_mit_holz_nennbetrag > 0) {

    const holzValue = financeStructureData?.zusatzdarlehen_bauen_mit_holz_nennbetrag;
    
    // Check if the familienbonus exceeds the limit
    const isWithinLimit = holzValue <= 17000.00;

    const docs = generateFullDocumentIds(['haswoodconstructionloan'], 'general', documentStatus);

    items.push({
      id: 'bauen_mit_holz_darlehens_isvalid',
      title: 'Zusatzdarlehen Bauen mit Holz - Gültigkeitsprüfung',
      systemStatus: isWithinLimit ? 'undefined' : 'wrong',
      agentStatus: 'undefined',
      systemComment: isWithinLimit
        ? `Das Zusatzdarlehen für Bauen mit Holz in Höhe von ${safeFormatCurrencyForDisplay(holzValue)} liegt innerhalb des erlaubten Limits von 17.000,00€.\n Zu Prüfen: Hauptantrag (Schritt 3 & 6), sowie die eingereichten Nachweise o. Ä. zur erechnung des tatsächlich förderfähigen Betrags`
        : `Das Zusatzdarlehen für Bauen mit Holz in Höhe von ${safeFormatCurrencyForDisplay(holzValue)} überschreitet das erlaubte Limit von 17.000,00€.\n Zu Prüfen: Hauptantrag (Schritt 3 & 6), sowie die eingereichte Nachweise o. Ä. zur erechnung des tatsächlich förderfähigen Betrags`,
      systemErrors: isWithinLimit
        ? []
        : [`Das Zusatzdarlehen für Bauen mit Holz Standard darf maximal 17.000,00€ betragen, aktuell: ${safeFormatCurrencyForDisplay(holzValue)}`],
      linkedForms: ['hauptantrag'],
      linkedDocs: docs.length > 0 ? docs : ['haswoodconstructionloan'],
      agentNotes: null
    });
  }
  // Ergänzungsdarlehen validation
  if (userData?.hassupplementaryloan === true ) {

    const darlehenValue = financeStructureData?.ergaenzungsdarlehen_nennbetrag;
    
   // Check if the familienbonus exceeds the limit
   let isWithinLimit = true;
   let errorMessages = [];
   
   if(darlehenValue > 50000.00){
     isWithinLimit = false;
     errorMessages.push(`Das Ergänzungsdarlehen darf maximal 50.000,00€ betragen, aktuell: ${safeFormatCurrencyForDisplay(darlehenValue)}`);
   }
   
   if (darlehenValue && (darlehenValue > 0 && darlehenValue < 2000.00)) {
     isWithinLimit = false;
     errorMessages.push(`Der Ergänzungsdarlehen muss mindestens 2.000,00€ betragen, aktuell ${safeFormatCurrencyForDisplay(darlehenValue)}`);
   }
   if(!darlehenValue || darlehenValue === 0){
    isWithinLimit = false;
    errorMessages.push(`Ein Ergänzungsdarlehen wurde beantragt, jedoch wurde kein Ergänzungsdarlehen eingegeben`);
   }

    const docs = generateFullDocumentIds(['nachweis_darlehen'], 'general', documentStatus);

    items.push({
      id: 'ergaenzungs_darlehens_isvalid',
      title: 'Ergänzungsdarlehen - Gültigkeitsprüfung',
      systemStatus: isWithinLimit ? 'undefined' : 'wrong',
      agentStatus: 'undefined',
      systemComment: isWithinLimit
        ? `Das Ergänzungsdarlehen in Höhe von ${safeFormatCurrencyForDisplay(darlehenValue)} liegt innerhalb des erlaubten Limits von 2.000,00€ - 50.000,00€.\n Zu Prüfen: Hauptantrag (Schritt 2 unf 6), sowie die eingereichten Nachweise o. Ä.`
        : `Das Ergänzungsdarlehen in Höhe von ${safeFormatCurrencyForDisplay(darlehenValue)} liegt außerhalb des erlaubten Limits von 2.000,00€ - 50.000,00€.\n Zu Prüfen: Hauptantrag (Schritt 2 und 6), sowie die eingereichte Nachweise o. Ä.`,
      systemErrors: isWithinLimit ? [] : errorMessages,
      linkedForms: ['hauptantrag'],
      linkedDocs: docs.length > 0 ? docs : ['nachweis_darlehen'],
      agentNotes: null
    });
  }
     // Document Completeness (General Documents)
  if (!residentId) {
    console.error('residentId is required for document completeness check');
    return items;
  }
  

  try {
    // Get actual required documents based on applicant data
    const requiredDocuments = await determineRequiredDocuments(residentId);
    
    // Get document status for completeness check - already declared at function beginning
    
    // Check document completeness using the actual required documents
    const documentCompleteness = checkDocumentCompletenessWithRequiredDocs(documentStatus, requiredDocuments);
    const documentErrors = findDocumentErrorsWithRequiredDocs(documentStatus, requiredDocuments, userData);
    
    // Generate list of uploaded documents with proper formatting and get linkedDocs
    const { comment: uploadedDocsComment, linkedDocs: uploadedDocsList } = generateUploadedDocumentsList(requiredDocuments, documentStatus, userData);
    
    // Generate system comment based on completeness and uploaded documents
    let systemComment: string;
    if (documentCompleteness === 'correct') {
      if (uploadedDocsComment) {
        systemComment = `Alle erforderlichen Dokumente wurden hochgeladen:\n\n${uploadedDocsComment}`;
      } else {
        systemComment = 'Alle erforderlichen Dokumente wurden hochgeladen';
      }
    } else {
      if (uploadedDocsComment) {
        systemComment = `Es fehlen noch erforderliche Dokumente\n\nBereits hochgeladen:\n${uploadedDocsComment}`;
      } else {
        systemComment = 'Es fehlen noch erforderliche Dokumente';
      }
    }
    
    items.push({
      id: 'document-completeness_general',
      title: 'Dokumentenprüfung - Vollständigkeit',
      systemStatus: documentCompleteness,
      agentStatus: 'undefined',
      systemComment: systemComment,
      systemErrors: documentErrors,
      linkedForms: [],
      linkedDocs: uploadedDocsList, // Use the properly formatted document IDs
      agentNotes: null
    });
  } catch (error) {
    console.error('Error checking document completeness:', error);
    items.push({
      id: 'document-completeness_general',
      title: 'Dokumentenprüfung - Vollständigkeit',
      systemStatus: 'wrong',
      agentStatus: 'undefined',
      systemComment: 'Fehler bei der Dokumentenprüfung',
      systemErrors: ['Fehler bei der Dokumentenprüfung'],
      linkedForms: [],
      linkedDocs: [],
      agentNotes: null
    });
  }

  // Additional checklist item for non-required uploaded documents
  try {
    // Get actual required documents based on applicant data
    const requiredDocuments = await determineRequiredDocuments(residentId);
    
    // Generate list of non-required uploaded documents
    const { comment: nonRequiredDocsComment, linkedDocs: nonRequiredDocsList } = generateNonRequiredUploadedDocumentsList(requiredDocuments, documentStatus, userData);
    
    // Only add the checklist item if there are non-required documents
    if (nonRequiredDocsList.length > 0) {
      items.push({
        id: 'document-non-required_general_isvalid',
        title: 'Zusätzlich hochgeladene Dokumente (nicht erforderlich)',
        systemStatus: 'undefined',
        agentStatus: 'undefined',
        systemComment: `Dieser Checklisten Punkt dient als Übersicht über die eingereichten Dokumente welche anhand der eingereichten Daten nicht erforderlich sind. \n Sie brauchen die Prüfung nicht zwingend mit Gültig oder Ungültig zu beantworten. \n\n Die folgenden Dokumente wurden zusätzlich hochgeladen:\n\n${nonRequiredDocsComment}`,
        systemErrors: [],
        linkedForms: [],
        linkedDocs: nonRequiredDocsList,
        agentNotes: null
      });
    }
  } catch (error) {
    console.error('Error checking non-required documents:', error);
    // Don't add an error item for non-required documents as it's not critical
  }

  // Add document validation items for general documents
  if (objectData) {
    // documentStatus already declared at function beginning
    const validationItems = generateGeneralDocumentValidationItems(
      userData,
      objectData,
      financeStructureData,
      costStructureData,
      documentStatus
    );
    items.push(...validationItems);
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

// Helper function to check document completeness with required documents
export function checkDocumentCompletenessWithRequiredDocs(
  documentData: any, 
  requiredDocuments: { general: string[]; hauptantragsteller: string[]; additionalApplicants: { [uuid: string]: string[] } }
): 'correct' | 'wrong' | 'undefined' {
  if (!documentData || typeof documentData !== 'object') {
    return 'undefined';
  }

  // Helper function to check if a document type has uploaded files
  const hasUploadedFiles = (documentTypeId: string, applicantKey: string): boolean => {
    const applicantDocs = documentData[applicantKey] || {};
    const files = applicantDocs[documentTypeId] || [];
    return files.some((file: any) => file.uploaded === true);
  };

  // Check general documents
  const generalDocsComplete = requiredDocuments.general.every(docId => hasUploadedFiles(docId, 'general'));
  
  // Check main applicant documents
  const mainApplicantDocsComplete = requiredDocuments.hauptantragsteller.every(docId => hasUploadedFiles(docId, 'hauptantragsteller'));
  
  // Check additional applicants documents
  let additionalApplicantsComplete = true;
  Object.entries(requiredDocuments.additionalApplicants).forEach(([uuid, requiredDocs]) => {
    const applicantKey = `applicant_${uuid}`;
    const applicantDocsComplete = requiredDocs.every(docId => hasUploadedFiles(docId, applicantKey));
    if (!applicantDocsComplete) {
      additionalApplicantsComplete = false;
    }
  });

  return (generalDocsComplete && mainApplicantDocsComplete && additionalApplicantsComplete) ? 'correct' : 'wrong';
}

// Helper function to generate list of uploaded documents with proper formatting
export function generateUploadedDocumentsList(
  requiredDocuments: { general: string[]; hauptantragsteller: string[]; additionalApplicants: { [uuid: string]: string[] } },
  documentStatus: any,
  userData?: any
): { comment: string; linkedDocs: string[] } {
  const linkedDocs: string[] = [];
  const categoryCounts: { [key: string]: number } = {};
  
  // Helper function to get applicant label
  const getApplicantLabel = (applicantKey: string): string => {
    if (applicantKey === 'general') return 'Allgemeine Dokumente';
    if (applicantKey === 'hauptantragsteller') {
      // Try to get name from userData, fallback to "Hauptantragsteller"
      if (userData?.firstname && userData?.lastname) {
        return `Dokumente für ${userData.firstname} ${userData.lastname}`;
      }
      return 'Dokumente für Hauptantragsteller';
    }
    
    if (applicantKey.startsWith('applicant_')) {
      const uuid = applicantKey.replace('applicant_', '');
      const weiterePersonen = userData?.weitere_antragstellende_personen;
      
      if (weiterePersonen && weiterePersonen[uuid]) {
        const person = weiterePersonen[uuid];
        const firstName = person.firstName || person.firstname || '';
        const lastName = person.lastName || person.lastname || '';
        
        if (firstName && lastName) {
          return `Dokumente für ${firstName} ${lastName}`;
        } else {
          // Count position in weitere_antragstellende_personen
          const personEntries = Object.entries(weiterePersonen);
          const personIndex = personEntries.findIndex(([key]) => key === uuid);
          const personNumber = personIndex + 2; // +2 because main applicant is 1
          return `Dokumente für Person ${personNumber}`;
        }
      }
      return `Dokumente für Person ${uuid.substring(0, 8)}`;
    }
    
    return applicantKey;
  };

  // Helper function to count uploaded files for a document type and generate linkedDocs
  const processDocumentType = (documentTypeId: string, applicantKey: string) => {
    const applicantDocs = documentStatus[applicantKey] || {};
    const files = applicantDocs[documentTypeId] || [];
    const uploadedFiles = files.filter((file: any) => file.uploaded === true);
    
    if (uploadedFiles.length > 0) {
      // Add to category count
      if (!categoryCounts[applicantKey]) {
        categoryCounts[applicantKey] = 0;
      }
      categoryCounts[applicantKey] += uploadedFiles.length;
      
      // Generate linkedDocs for each uploaded file
      uploadedFiles.forEach((file: any, index: number) => {
        const docId = `${applicantKey}_${documentTypeId}_${index}`;
        linkedDocs.push(docId);
      });
    }
  };

  // Check general documents
  requiredDocuments.general.forEach(docId => {
    processDocumentType(docId, 'general');
  });
  
  // Check main applicant documents
  requiredDocuments.hauptantragsteller.forEach(docId => {
    processDocumentType(docId, 'hauptantragsteller');
  });
  
  // Check additional applicants documents
  Object.entries(requiredDocuments.additionalApplicants).forEach(([uuid, requiredDocs]) => {
    const applicantKey = `applicant_${uuid}`;
    requiredDocs.forEach(documentId => {
      processDocumentType(documentId, applicantKey);
    });
  });
  
  // Generate comment with counts for each category
  const commentParts: string[] = [];
  
  // Add general documents count
  if (categoryCounts['general'] && categoryCounts['general'] > 0) {
    commentParts.push(`${getApplicantLabel('general')} (${categoryCounts['general']})`);
  }
  
  // Add main applicant documents count
  if (categoryCounts['hauptantragsteller'] && categoryCounts['hauptantragsteller'] > 0) {
    commentParts.push(`${getApplicantLabel('hauptantragsteller')} (${categoryCounts['hauptantragsteller']})`);
  }
  
  // Add additional applicants documents count
  Object.entries(requiredDocuments.additionalApplicants).forEach(([uuid, requiredDocs]) => {
    const applicantKey = `applicant_${uuid}`;
    if (categoryCounts[applicantKey] && categoryCounts[applicantKey] > 0) {
      commentParts.push(`${getApplicantLabel(applicantKey)} (${categoryCounts[applicantKey]})`);
    }
  });
  
  return {
    comment: commentParts.join(', '),
    linkedDocs: linkedDocs
  };
}

// Helper function to find non-required uploaded documents
export function generateNonRequiredUploadedDocumentsList(
  requiredDocuments: { general: string[]; hauptantragsteller: string[]; additionalApplicants: { [uuid: string]: string[] } },
  documentStatus: any,
  userData?: any
): { comment: string; linkedDocs: string[] } {
  const linkedDocs: string[] = [];
  const nonRequiredDocs: { applicantKey: string; docTypeId: string; files: any[] }[] = [];
  
  // Helper function to get applicant label
  const getApplicantLabel = (applicantKey: string): string => {
    if (applicantKey === 'general') return 'Allgemein';
    if (applicantKey === 'hauptantragsteller') {
      // Try to get name from userData, fallback to "Hauptantragsteller"
      if (userData?.firstname && userData?.lastname) {
        return `${userData.firstname} ${userData.lastname}`;
      }
      return 'Hauptantragsteller';
    }
    
    if (applicantKey.startsWith('applicant_')) {
      const uuid = applicantKey.replace('applicant_', '');
      const weiterePersonen = userData?.weitere_antragstellende_personen;
      
      if (weiterePersonen && weiterePersonen[uuid]) {
        const person = weiterePersonen[uuid];
        const firstName = person.firstName || person.firstname || '';
        const lastName = person.lastName || person.lastname || '';
        
        if (firstName && lastName) {
          return `${firstName} ${lastName}`;
        } else {
          // Count position in weitere_antragstellende_personen
          const personEntries = Object.entries(weiterePersonen);
          const personIndex = personEntries.findIndex(([key]) => key === uuid);
          const personNumber = personIndex + 2; // +2 because main applicant is 1
          return `Person ${personNumber}`;
        }
      }
      return `Person ${uuid.substring(0, 8)}`;
    }
    
    return applicantKey;
  };

  // Helper function to get document title
  const getDocumentTitle = (documentId: string): string => {
    const titles: Record<string, string> = {
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
      'heiratsurkunde': 'Heiratsurkunde/Lebenspartnerschaftsurkunde',
      'nachweis_disability': 'Nachweis über die Schwerbehinderteneigenschaft/GdB',
      'pflegegrad_nachweis': 'Nachweis der Pflegebedürftigkeit',
      'vollmacht-cert': 'Vollmachtsurkunde',
      'nachweis_darlehen': 'Darlehenszusage(n)',
      'eigenkapital_nachweis': 'Nachweis Eigenkapital',
      'lohn_gehaltsbescheinigungen': 'Lohn-/Gehaltsbescheinigungen',
      'gehaltsabrechnung': 'Lohn-/Gehaltsbescheinigungen',
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
      'freiwillige_versicherungsbeitraege_nachweis': 'Nachweis freiwillige Versicherungsbeiträge',
      'freiwillige_krankenversicherung_nachweis': 'Nachweis freiwillige Krankenversicherung',
      'ausbildungsfoerderung_nachweis': 'Leistungen der Ausbildungsförderung (BAföG, Berufsausbildungsbeihilfe SGB III)',
      'sonstige_dokumente': 'Sonstige Dokumente'
    };
    return titles[documentId] || documentId;
  };

  // Create a flat list of all required documents for easy lookup
  const allRequiredDocs = new Set<string>();
  
  // Add general required documents
  requiredDocuments.general.forEach(docId => {
    allRequiredDocs.add(`general_${docId}`);
  });
  
  // Add hauptantragsteller required documents
  requiredDocuments.hauptantragsteller.forEach(docId => {
    allRequiredDocs.add(`hauptantragsteller_${docId}`);
  });
  
  // Add additional applicants required documents
  Object.entries(requiredDocuments.additionalApplicants).forEach(([uuid, requiredDocs]) => {
    const applicantKey = `applicant_${uuid}`;
    requiredDocs.forEach(docId => {
      allRequiredDocs.add(`${applicantKey}_${docId}`);
    });
  });

  // Check all uploaded documents to find non-required ones
  if (documentStatus && typeof documentStatus === 'object') {
    Object.entries(documentStatus).forEach(([applicantKey, applicantDocs]: [string, any]) => {
      if (!applicantDocs || typeof applicantDocs !== 'object') return;
      
      Object.entries(applicantDocs).forEach(([docTypeId, files]: [string, any]) => {
        if (!Array.isArray(files)) return;
        
        // Check if this document type is required for this applicant
        const docKey = `${applicantKey}_${docTypeId}`;
        const isRequired = allRequiredDocs.has(docKey);
        
        if (!isRequired) {
          // Filter only uploaded files
          const uploadedFiles = files.filter((file: any) => file.uploaded);
          
          if (uploadedFiles.length > 0) {
            nonRequiredDocs.push({
              applicantKey,
              docTypeId,
              files: uploadedFiles
            });
            
            // Generate linkedDocs for each uploaded file
            uploadedFiles.forEach((file: any, index: number) => {
              const docId = `${applicantKey}_${docTypeId}_${index}`;
              linkedDocs.push(docId);
            });
          }
        }
      });
    });
  }

  // Generate comment listing all non-required documents
  if (nonRequiredDocs.length === 0) {
    return {
      comment: '',
      linkedDocs: []
    };
  }

  const commentParts: string[] = [];
  
  nonRequiredDocs.forEach(({ applicantKey, docTypeId, files }) => {
    const applicantLabel = getApplicantLabel(applicantKey);
    const docTitle = getDocumentTitle(docTypeId);
    
    if (files.length === 1) {
      commentParts.push(`• ${docTitle} (${applicantLabel})`);
    } else {
      commentParts.push(`• ${docTitle} (${files.length} Dateien) (${applicantLabel})`);
    }
  });

  return {
    comment: commentParts.join('\n'),
    linkedDocs: linkedDocs
  };
}

// Helper function to find document errors with required documents
export function findDocumentErrorsWithRequiredDocs(
  documentData: any,
  requiredDocuments: { general: string[]; hauptantragsteller: string[]; additionalApplicants: { [uuid: string]: string[] } },
  userData: any
): string[] {
  const errors: string[] = [];
  if (!documentData || typeof documentData !== 'object') {
    errors.push('Keine Dokumente hochgeladen');
    return errors;
  }

  // Helper function to get document title
  const getDocumentTitle = (documentId: string): string => {
    const titles: Record<string, string> = {
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
      'sonstige_dokumente': 'Sonstige Dokumente'
    };
    return titles[documentId] || documentId;
  };

  // Helper function to check if a document type has uploaded files
  const hasUploadedFiles = (documentTypeId: string, applicantKey: string): boolean => {
    const applicantDocs = documentData[applicantKey] || {};
    const files = applicantDocs[documentTypeId] || [];
    return files.some((file: any) => file.uploaded === true);
  };

  // Check general documents
  requiredDocuments.general.forEach(docId => {
    if (!hasUploadedFiles(docId, 'general')) {
      errors.push(`Allgemein: ${getDocumentTitle(docId)} fehlt`);
    }
  });

  // Check main applicant documents
  requiredDocuments.hauptantragsteller.forEach(docId => {
    if (!hasUploadedFiles(docId, 'hauptantragsteller')) {
      errors.push(`Hauptantragsteller: ${getDocumentTitle(docId)} fehlt`);
    }
  });

  // Check additional applicants documents
  Object.entries(requiredDocuments.additionalApplicants).forEach(([uuid, requiredDocs]) => {
    requiredDocs.forEach(documentId => {
      const applicantKey = `applicant_${uuid}`;
      if (!hasUploadedFiles(documentId, applicantKey)) {
        // Get applicant name for better error message from userData
        const weiterePersonen = userData?.weitere_antragstellende_personen || {};
        let applicantName = `Person (${uuid.substring(0, 8)})`;
        
        // Handle both array and object formats
        if (Array.isArray(weiterePersonen)) {
          const personIndex = Object.keys(weiterePersonen).indexOf(uuid);
          const person = weiterePersonen[personIndex];
          if (person?.firstName && person?.lastName) {
            applicantName = `${person.firstName} ${person.lastName}`;
          }
        } else if (weiterePersonen[uuid]) {
          const person = weiterePersonen[uuid];
          if (person.firstName && person.lastName) {
            applicantName = `${person.firstName} ${person.lastName}`;
          }
        }
        
        errors.push(`${applicantName}: ${getDocumentTitle(documentId)} fehlt`);
      }
    });
  });

  return errors;
}


// Document validation configuration for general documents
interface DocumentValidationRule {
  documentId: string;
  displayTitle: string;
  condition: (userData: any, objectData: any, financeStructureData: any, costStructureData: any) => boolean;
  reasonComment: (userData: any, objectData: any, financeStructureData: any, costStructureData: any) => string;
  linkedForm: string[]; // Changed from [string] to string[]
}

// Configuration for general document validation rules
const GENERAL_DOCUMENT_VALIDATION_RULES: DocumentValidationRule[] = [
  {
    documentId: 'meldebescheinigung',
    displayTitle: 'Meldebescheinigung stimmt mit den Angaben überein',
    condition: (userData: any, objectData: any, financeStructureData: any, costStructureData: any) => true, // Always required
    reasonComment: (userData: any, objectData: any, financeStructureData: any, costStructureData: any) => {
      const householdMembers: string[] = [];
      
      // Add main applicant from user_data table
      if (userData?.firstname && userData?.lastname) {
        householdMembers.push(`${userData.firstname} ${userData.lastname}`);
      }
      
      // Add additional household members from weitere_antragstellende_personen
      if (userData?.weitere_antragstellende_personen) {
        Object.values(userData.weitere_antragstellende_personen).forEach((person: any) => {
          // Filter out people with notHousehold flag set to true
          if (!person.notHousehold && person.firstName && person.lastName) {
            householdMembers.push(`${person.firstName} ${person.lastName}`);
          }
        });
      }
      
      if (householdMembers.length === 0) {
        return 'Keine Haushaltsmitglieder gefunden.';
      }
      
      let comment = 'Laut Antrag wurden folgende Personen als Haushaltsmitglieder angegeben:\n\n';
      
      householdMembers.forEach((member, index) => {
        comment += `• ${member}`;
        if (index < householdMembers.length - 1) {
          comment += '\n';
        }
      });
      
      comment += '\n\nZu prüfen: Meldebescheinigung stimmt mit den Angaben in der Haushaltsauskunft überein.';
      
      return comment;
    },
    linkedForm: ['haushaltsauskunft','hauptantrag']
  },
  {
    documentId: 'eigenkapital_nachweis',
    displayTitle: 'Eigenkapitalnachweis stimmt mit den Angaben überein',
    condition: (userData: any, objectData: any, financeStructureData: any, costStructureData: any) => true, // Always required
    reasonComment: (userData: any, objectData: any, financeStructureData: any, costStructureData: any) => {
      const eigenkapitalItems: string[] = [];
      
      // Always show these items if they exist and are greater than 0
      if (financeStructureData?.eigene_geldmittel && parseFloat(financeStructureData.eigene_geldmittel) > 0) {
        eigenkapitalItems.push(`Eigene Geldmittel: ${safeFormatCurrencyForDisplay(financeStructureData.eigene_geldmittel)}`);
      }
      
      if (financeStructureData?.zuschuesse && parseFloat(financeStructureData.zuschuesse) > 0) {
        eigenkapitalItems.push(`Zuschüsse: ${safeFormatCurrencyForDisplay(financeStructureData.zuschuesse)}`);
      }
      
      if (financeStructureData?.selbsthilfe && parseFloat(financeStructureData.selbsthilfe) > 0) {
        eigenkapitalItems.push(`Selbsthilfe: ${safeFormatCurrencyForDisplay(financeStructureData.selbsthilfe)}`);
      }
      
      // Only show these items for specific foerderVariante types
      if (objectData?.foerderVariante) {
        const foerderVariante = objectData.foerderVariante;
        
        // wert_vorhandener_gebaeudeteile only for neubau or nutzungsaenderung
        if ((foerderVariante.includes('neubau') || foerderVariante === 'nutzungsaenderung') && 
            financeStructureData?.wert_vorhandener_gebaeudeteile && 
            parseFloat(financeStructureData.wert_vorhandener_gebaeudeteile) > 0) {
          eigenkapitalItems.push(`Wert vorhandener Gebäudeteile: ${safeFormatCurrencyForDisplay(financeStructureData.wert_vorhandener_gebaeudeteile)}`);
        }
        
        // wert_baugrundstueck only for neubau
        if (foerderVariante.includes('neubau') && 
            financeStructureData?.wert_baugrundstueck && 
            parseFloat(financeStructureData.wert_baugrundstueck) > 0) {
          eigenkapitalItems.push(`Wert Baugrundstück: ${safeFormatCurrencyForDisplay(financeStructureData.wert_baugrundstueck)}`);
        }
      }
      
      if (eigenkapitalItems.length === 0) {
        return 'Es wurde kein Eigenkapital im Hauptantrag angegeben.';
      }
      
      let comment = 'Der Antragsteller hat folgende Eigenkapitalquellen angegeben:\n\n';
      
      eigenkapitalItems.forEach((item, index) => {
        comment += `• ${item}`;
        if (index < eigenkapitalItems.length - 1) {
          comment += '\n';
        }
      });
      
      comment += '\n\nZu prüfen: Eigenkapitalnachweis stimmt mit den Angaben im Hauptantrag (Schritt 6) überein.';
      
      return comment;
    },
    linkedForm: ['hauptantrag', 'selbsthilfeleistungen']
  },
  {
    documentId: 'nachweis_darlehen',
    displayTitle: 'Darlehenszusage(n) stimmt/stimmen mit den Angaben überein',
    condition: (userData: any, objectData: any, financeStructureData: any) => {
      if (financeStructureData?.fremddarlehen && Array.isArray(financeStructureData.fremddarlehen)) {
        return financeStructureData.fremddarlehen.some((darlehen: any) => {
          return darlehen && (
            darlehen.darlehenGeber?.trim() ||
            darlehen.nennbetrag?.trim() ||
            darlehen.zinssatz?.trim() ||
            darlehen.auszahlung?.trim() ||
            darlehen.tilgung?.trim()
          );
        });
      }
      return false;
    },
    reasonComment: (userData: any, objectData: any, financeStructureData: any) => {
      if (!financeStructureData?.fremddarlehen || !Array.isArray(financeStructureData.fremddarlehen)) {
        return 'Der Antragsteller hat angegeben, Fremddarlehen zu verwenden.';
      }

      const validDarlehen = financeStructureData.fremddarlehen.filter((darlehen: any) => 
        darlehen && (
          darlehen.darlehenGeber?.trim() ||
          darlehen.nennbetrag?.trim() ||
          darlehen.zinssatz?.trim() ||
          darlehen.auszahlung?.trim() ||
          darlehen.tilgung?.trim()
        )
      );

      if (validDarlehen.length === 0) {
        return 'Der Antragsteller hat angegeben, Fremddarlehen zu verwenden.';
      }

      // Determine the correct article based on number of darlehen
      let articleText: string;
      if (validDarlehen.length === 1) {
        articleText = 'ein Fremddarlehen';
      } else if (validDarlehen.length === 2) {
        articleText = 'zwei Fremddarlehen';
      } else if (validDarlehen.length === 3) {
        articleText = 'drei Fremddarlehen';
      } else {
        articleText = `${validDarlehen.length} Fremddarlehen`;
      }

      let comment = `Der Antragsteller hat ${articleText} angegeben:\n\n`;

      validDarlehen.forEach((darlehen: any, index: number) => {
        const darlehenNumber = index + 1;
        let darlehenInfo = `Darlehen ${darlehenNumber}: `;
        
        // Add darlehenGeber if available
        if (darlehen.darlehenGeber?.trim()) {
          darlehenInfo += darlehen.darlehenGeber.trim();
        } else {
          darlehenInfo += 'Darlehensgeber nicht angegeben';
        }
        
        // Add nennbetrag if available
        if (darlehen.nennbetrag?.trim()) {
          darlehenInfo += `, Nennbetrag: ${safeFormatCurrencyForDisplay(darlehen.nennbetrag)}`;
        } else {
          darlehenInfo += ', Nennbetrag: nicht angegeben';
        }
        
        // Add zinssatz if available
        if (darlehen.zinssatz?.trim()) {
          darlehenInfo += `, Zinssatz: ${darlehen.zinssatz.trim()}%`;
        } else {
          darlehenInfo += ', Zinssatz: nicht angegeben';
        }
        
        // Add auszahlung if available
        if (darlehen.auszahlung?.trim()) {
          darlehenInfo += `, Auszahlung: ${darlehen.auszahlung.trim()}%`;
        } else {
          darlehenInfo += ', Auszahlung: nicht angegeben';
        }
        
        // Add tilgung if available
        if (darlehen.tilgung?.trim()) {
          darlehenInfo += `, Tilgung: ${darlehen.tilgung.trim()}%`;
        } else {
          darlehenInfo += ', Tilgung: nicht angegeben';
        }
        
        comment += `• ${darlehenInfo}`;
        if (index < validDarlehen.length - 1) {
          comment += '\n';
        }
      });
      
      comment += '\n\nZu prüfen: Darlehenszusage(n) stimmt/stimmen mit den Angaben im Hauptantrag (Schritt 6) überein.';
      
      return comment;
    },
    linkedForm: ['hauptantrag']
  },
  {
    documentId: 'bauzeichnung',
    displayTitle: 'Bauzeichnung stimmt mit den Angaben überein',
    condition: (userData: any, objectData: any, financeStructureData: any, costStructureData: any) => objectData?.foerderVariante?.includes('neubau'),
    reasonComment: (userData: any, objectData: any, financeStructureData: any, costStructureData: any) => 'Der Antragsteller hat angegeben, ein Neubauvorhaben zu planen. Zu prüfen: Bauzeichnung stimmt mit den Angaben im Hauptantrag (Schritt 3), sowie der WoFIV und BRI Berechnung überein.',
    linkedForm: ['hauptantrag', 'berechnungwofiv', 'berechnungrauminhalt']
  },
  {
    documentId: 'lageplan',
    displayTitle: 'Lageplan stimmt mit den Angaben überein',
    condition: (userData: any, objectData: any, financeStructureData: any, costStructureData: any) => objectData?.foerderVariante?.includes('neubau'),
    reasonComment: (userData: any, objectData: any, financeStructureData: any, costStructureData: any) => 'Der Antragsteller hat angegeben, ein Neubauvorhaben zu planen. Zu prüfen: Lageplan stimmt mit den Angaben im Hauptantrag (Schritt 3), sowie der WoFIV und BRI Berechnung überein.',
    linkedForm: ['hauptantrag', 'berechnungwofiv', 'berechnungrauminhalt']
  },
  {
    documentId: 'baugenehmigung_vorbescheid',
    displayTitle: 'Baugenehmigung/Vorbescheid stimmt mit den Angaben überein',
    condition: (userData: any, objectData: any, financeStructureData: any, costStructureData: any) => 
      ['neubau', 'neubau-wohnung', 'ersterwerb-wohnung', 'ersterwerb-eigenheim'].includes(objectData?.foerderVariante) && 
      objectData?.baugenehmigung_erforderlich,
    reasonComment: (userData: any, objectData: any, financeStructureData: any, costStructureData: any) => {
      if (!objectData?.baugenehmigung_erforderlich) {
        return 'Der Antragsteller hat angegeben, dass eine Baugenehmigung erforderlich ist.';
      }

      let comment = 'Im Hauptantrag (Schritt 3) wurde angegeben, dass eine Baugenehmigung erforderlich ist.\n\n';
      
      if (objectData.baugenehmigung_wurde_erteilt === true) {
        comment += 'Status: Baugenehmigung wurde erteilt\n\n';
        comment += 'Details der Baugenehmigung:\n\n';
        
        if (objectData.erteilungs_datum?.trim()) {
          const date = new Date(objectData.erteilungs_datum);
          const formattedDate = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
          comment += `• Erteilungsdatum: ${formattedDate}`;
        } else {
          comment += '• Erteilungsdatum: nicht angegeben';
        }
        
        if (objectData.aktenzeichen?.trim()) {
          comment += '\n• Aktenzeichen: ' + objectData.aktenzeichen.trim();
        } else {
          comment += '\n• Aktenzeichen: nicht angegeben';
        }
        
        if (objectData.erteilungs_behoerde?.trim()) {
          comment += '\n• Erteilende Behörde: ' + objectData.erteilungs_behoerde.trim();
        } else {
          comment += '\n• Erteilende Behörde: nicht angegeben';
        }
        
        comment += '\n\nZu prüfen: Baugenehmigung/Vorbescheid stimmt mit den Angaben im Hauptantrag (Schritt 3) überein.';
        
      } else {
        comment += 'Status: Baugenehmigung ist erforderlich, wurde jedoch noch nicht erteilt\n\n';
        comment += 'Zu prüfen: Baugenehmigung/Vorbescheid liegt vor und stimmt mit den Angaben im Hauptantrag (Schritt 3) überein.';
      }
      
      return comment;
    },
    linkedForm: ['hauptantrag']
  },
  {
    documentId: 'bergsenkungsGebiet_erklaerung',
    displayTitle: 'Erklärung der Bergbaugesellschaft ist gültig',
    condition: (userData: any, objectData: any, financeStructureData: any, costStructureData: any) => 
      ['neubau', 'neubau-wohnung', 'ersterwerb-wohnung', 'ersterwerb-eigenheim', 'nutzungsaenderung'].includes(objectData?.foerderVariante) && 
      objectData?.bergsenkungsGebiet,
    reasonComment: (userData: any, objectData: any, financeStructureData: any, costStructureData: any) => 'Der Antragsteller hat im Schritt 3 des Hauptantrags angegeben, dass sich das Objekt in einem Bergsenkungsgebiet befindet.',
    linkedForm: ['hauptantrag']
  },
  {
    documentId: 'erbbaurechtsvertrag',
    displayTitle: 'Erbbaurechtsvertrag stimmt mit den Angaben überein',
    condition: (userData: any, objectData: any, financeStructureData: any, costStructureData: any) => objectData?.erbbaurecht,
    reasonComment: (userData: any, objectData: any, financeStructureData: any, costStructureData: any) => {
      if (!objectData?.erbbaurecht) {
        return 'Der Antragsteller hat angegeben, dass ein Erbbaurecht vorliegt.';
      }

      let comment = 'Im Hauptantrag (Schritt 4) wurde angegeben, dass sich das Objekt im Eigentum der antragstellenden Person(en) befindet und dass ein Erbbaurecht vorhanden ist.\n\n';
      
      comment += 'Erbbaurecht Details:\n\n';
      
      if (objectData.restlaufzeit_erbbaurecht) {
        comment += `• Restlaufzeit des Erbbaurechts: ${objectData.restlaufzeit_erbbaurecht} Jahre`;
      } else {
        comment += '• Restlaufzeit des Erbbaurechts: nicht angegeben';
      }
      
      comment += '\n\nZu prüfen: Erbbaurechtsvertrag stimmt mit den Angaben im Hauptantrag (Schritt 4) überein.';
      
      return comment;
    },
    linkedForm: ['hauptantrag']
  },
  {
    documentId: 'grundbuchblattkopie',
    displayTitle: 'Grundbuchblattkopie stimmt mit den Angaben überein',
    condition: (userData: any, objectData: any, financeStructureData: any, costStructureData: any) => objectData?.eigentumsverhaeltnis,
    reasonComment: (userData: any, objectData: any, financeStructureData: any, costStructureData: any) => {
      if (!objectData?.eigentumsverhaeltnis) {
        return 'Der Antragsteller hat angegeben, dass sich das Objekt im Eigentum befindet.';
      }

      let comment = 'Im Hauptantrag (Schritt 4) wurde angegeben, dass sich das Objekt im Eigentum der antragstellenden Person(en) befindet. Folgende Grundbuchdaten wurden angegeben:\n\n';
      
      // Grundbuch type information
      if (objectData.grundbuch_type) {
        const grundbuchTypeLabels: { [key: string]: string } = {
          'grundbuch': 'Grundbuch',
          'wohnungsgrundbuch': 'Wohnungsgrundbuch',
          'teileigentumsgrundbuch': 'Teileigentumsgrundbuch',
          'erbbaugrundbuch': 'Erbbaugrundbuch',
          'wohnungserbbaugrundbuch': 'Wohnungserbbaugrundbuch',
          'teileigentumserbbaugrundbuch': 'Teileigentumserbbaugrundbuch'
        };
        
        const typeLabel = grundbuchTypeLabels[objectData.grundbuch_type] || objectData.grundbuch_type;
        comment += `Grundbuchtyp: ${typeLabel}\n\n`;
      } else {
        comment += 'Grundbuchtyp: nicht angegeben\n\n';
      }
      
      // Grundbuch details
      comment += 'Grundbuchdaten:\n\n';
      
      if (objectData.grundbuch_amtsgericht?.trim()) {
        comment += `• Amtsgericht: ${objectData.grundbuch_amtsgericht.trim()}`;
      } else {
        comment += '• Amtsgericht: nicht angegeben';
      }
      
      if (objectData.ort_grundbuch?.trim()) {
        comment += '\n• Ort des Grundbuchs: ' + objectData.ort_grundbuch.trim();
      } else {
        comment += '\n• Ort des Grundbuchs: nicht angegeben';
      }
      
      if (objectData.grundbuch_gemarkung?.trim()) {
        comment += '\n• Gemarkung: ' + objectData.grundbuch_gemarkung.trim();
      } else {
        comment += '\n• Gemarkung: nicht angegeben';
      }
      
      if (objectData.grundbuch_blatt?.trim()) {
        comment += '\n• Blatt: ' + objectData.grundbuch_blatt.trim();
      } else {
        comment += '\n• Blatt: nicht angegeben';
      }
      
      if (objectData.grundbuch_flur?.trim()) {
        comment += '\n• Flur: ' + objectData.grundbuch_flur.trim();
      } else {
        comment += '\n• Flur: nicht angegeben';
      }
      
      if (objectData.grundbuch_flurstueck?.trim()) {
        comment += '\n• Flurstück(e): ' + objectData.grundbuch_flurstueck.trim();
      } else {
        comment += '\n• Flurstück(e): nicht angegeben';
      }
      
      if (objectData.grundbuch_flurstueck_neu?.trim()) {
        comment += '\n• Flurstück(e) neu: ' + objectData.grundbuch_flurstueck_neu.trim();
      } else {
        comment += '\n• Flurstück(e) neu: nicht angegeben';
      }
      
      if (objectData.grundstuecksgroesse) {
        comment += '\n• Grundstücksgröße: ' + objectData.grundstuecksgroesse + ' m²';
      } else {
        comment += '\n• Grundstücksgröße: nicht angegeben';
      }
      
      comment += '\n\nZu prüfen: Grundbuchblattkopie stimmt mit den Angaben im Hauptantrag (Schritt 4) überein.';
      
      return comment;
    },
    linkedForm: ['hauptantrag']
  },
  {
    documentId: 'neubau_kaufvertrag',
    displayTitle: 'Grundstückskaufvertrag stimmt mit den Angaben überein',
    condition: (userData: any, objectData: any, financeStructureData: any, costStructureData: any) => objectData?.foerderVariante?.includes('neubau'),
    reasonComment: (userData: any, objectData: any, financeStructureData: any, costStructureData: any) => {
      let comment = 'Der Antragsteller hat angegeben, ein Neubauvorhaben zu planen.\n\n';
      
      // Eigentumsverhältnis information
      if (objectData?.eigentumsverhaeltnis !== null && objectData?.eigentumsverhaeltnis !== undefined) {
        comment += `• Eigentumsverhältnis: ${objectData.eigentumsverhaeltnis ? 'Im Eigentum des Antragstellers' : 'Noch nicht im Eigentum des Antragstellers'}\n`;
      } else {
        comment += '• Eigentumsverhältnis: nicht angegeben\n';
      }
      
      // Kaufvertrag information
      if (objectData?.kaufvertrag_wurde_abgeschlossen !== null && objectData?.kaufvertrag_wurde_abgeschlossen !== undefined) {
        comment += `• Kaufvertrag: ${objectData.kaufvertrag_wurde_abgeschlossen ? 'wurde abgeschlossen' : 'wird abgeschlossen'}\n`;
        
        if (objectData.kaufvertrag_wurde_abgeschlossen && objectData?.kaufvertrag_abschluss_datum) {
          const date = new Date(objectData.kaufvertrag_abschluss_datum);
          const formattedDate = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
          comment += `• Kaufvertrag Abschlussdatum: ${formattedDate}\n`;
        } else if (objectData.kaufvertrag_wurde_abgeschlossen) {
          comment += '• Kaufvertrag Abschlussdatum: nicht angegeben\n';
        }
      } else {
        comment += '• Kaufvertrag: nicht angegeben\n';
      }
      
      comment += '\n';
      
      // Financial figures from step 5 (cost_structure table)
      comment += 'Finanzielle Angaben (Schritt 5):\n';
      
      if (costStructureData?.grundstueck_kaufpreis) {
        comment += `• Grundstück Kaufpreis: ${safeFormatCurrencyForDisplay(costStructureData.grundstueck_kaufpreis)}\n`;
      } else {
        comment += '• Grundstück Kaufpreis: nicht angegeben\n';
      }
      
      if (costStructureData?.grundstueck_wert) {
        comment += `• Grundstück Wert: ${safeFormatCurrencyForDisplay(costStructureData.grundstueck_wert)}\n`;
      } else {
        comment += '• Grundstück Wert: nicht angegeben\n';
      }
      
      if (costStructureData?.erschliessungskosten) {
        comment += `• Erschließungskosten: ${safeFormatCurrencyForDisplay(costStructureData.erschliessungskosten)}\n`;
      } else {
        comment += '• Erschließungskosten: nicht angegeben\n';
      }
      
      comment += '\nHinweis: Nebenkosten und standortbedingte Mehrkosten sind in dieser Übersicht ausgeschlossen.\n';
      
      comment += '\nZu prüfen: Grundstückskaufvertrag stimmt mit den Angaben im Hauptantrag (Schritt 4 und 5) überein.';
      
      return comment;
    },
    linkedForm: ['hauptantrag']
  },

  {
    documentId: 'kaufvertrag',
    displayTitle: 'Kaufvertrag stimmt mit den Angaben überein',
    condition: (userData: any, objectData: any, financeStructureData: any, costStructureData: any) => 
      objectData?.foerderVariante?.includes('ersterwerb') || objectData?.foerderVariante?.includes('bestandserwerb'),
    reasonComment: (userData: any, objectData: any, financeStructureData: any, costStructureData: any) => {
      let comment = 'Der Antragsteller hat angegeben, eine Immobilie zu erwerben.\n\n';
      
      // Eigentumsverhältnis information
      if (objectData?.eigentumsverhaeltnis !== null && objectData?.eigentumsverhaeltnis !== undefined) {
        comment += `• Eigentumsverhältnis: ${objectData.eigentumsverhaeltnis ? 'Im Eigentum des Antragstellers' : 'Noch nicht im Eigentum des Antragstellers'}\n`;
      } else {
        comment += '• Eigentumsverhältnis: nicht angegeben\n';
      }
      
      // Kaufvertrag information
      if (objectData?.kaufvertrag_wurde_abgeschlossen !== null && objectData?.kaufvertrag_wurde_abgeschlossen !== undefined) {
        comment += `• Kaufvertrag: ${objectData.kaufvertrag_wurde_abgeschlossen ? 'wurde abgeschlossen' : 'wird abgeschlossen'}\n`;
        
        if (objectData.kaufvertrag_wurde_abgeschlossen && objectData?.kaufvertrag_abschluss_datum) {
          const date = new Date(objectData.kaufvertrag_abschluss_datum);
          const formattedDate = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
          comment += `• Kaufvertrag Abschlussdatum: ${formattedDate}\n`;
        } else if (objectData.kaufvertrag_wurde_abgeschlossen) {
          comment += '• Kaufvertrag Abschlussdatum: nicht angegeben\n';
        }
      } else {
        comment += '• Kaufvertrag: nicht angegeben\n';
      }
      
      comment += '\n';
      
      // Financial figures from step 5 (cost_structure table)
      comment += 'Finanzielle Angaben (Schritt 5):\n';
      
      if (costStructureData?.kaufpreis) {
        comment += `• Kaufpreis: ${safeFormatCurrencyForDisplay(costStructureData.kaufpreis)}\n`;
      } else {
        comment += '• Kaufpreis: nicht angegeben\n';
      }
      
      comment += '\nHinweis: Nebenkosten sind in dieser Übersicht ausgeschlossen.\n';
      
      comment += '\nZu prüfen: Kaufvertrag stimmt mit den Angaben im Hauptantrag (Schritt 4 und 5) überein.';
      
      return comment;
    },
    linkedForm: ['hauptantrag']
  },
  /*{
    documentId: 'standortbedingte_mehrkosten',
    displayTitle: 'Nachweis standortbedingte Mehrkosten stimmt mit den Angaben überein',
    condition: (userData: any, objectData: any, financeStructureData: any, costStructureData: any) => objectData?.haslocationcostloan,
    reasonComment: (userData: any, objectData: any, financeStructureData: any, costStructureData: any) => 'Der Antragsteller hat angegeben, standortbedingte Mehrkosten zu haben.',
    linkedForm: ['hauptantrag']
  },
  {
    documentId: 'haswoodconstructionloan',
    displayTitle: 'Nachweis Zusatzdarlehen für Bauen mit Holz stimmt mit den Angaben überein',
    condition: (userData: any, objectData: any, financeStructureData: any, costStructureData: any) => objectData?.haswoodconstructionloan,
    reasonComment: (userData: any, objectData: any, financeStructureData: any, costStructureData: any) => 'Der Antragsteller hat angegeben, mit Holz zu bauen und ein Zusatzdarlehen zu beantragen.',
    linkedForm: ['hauptantrag']
  },
  /*{
    documentId: 'beg40standard_cert',
    displayTitle: 'Nachweis BEG Effizienzstandard 40 stimmt mit den Angaben überein',
    condition: (userData: any, objectData: any, financeStructureData: any, costStructureData: any) => userData?.hasbegstandardloan,
    reasonComment: (userData: any, objectData: any, financeStructureData: any, costStructureData: any) => 'Der Antragsteller hat angegeben, den BEG Effizienzstandard 40 zu erreichen.',
    linkedForm: ['hauptantrag']
  },*/
  {
    documentId: 'pregnancy-cert',
    displayTitle: 'Schwangerschaftsnachweis stimmt mit den Angaben überein',
    condition: (userData: any, objectData: any, financeStructureData: any, costStructureData: any) => userData?.ispregnant,
    reasonComment: (userData: any, objectData: any, financeStructureData: any, costStructureData: any) => 
      'In der Haushaltsauskunft wurde angegeben, dass eine Antragstellende schwanger ist.',
    linkedForm: ['haushaltsauskunft']
  },
  {
    documentId: 'marriage_cert',
    displayTitle: 'Heiratsurkunde/Lebenspartnerschaftsurkunde stimmt mit den Angaben überein',
    condition: (userData: any, objectData: any, financeStructureData: any, costStructureData: any) => userData?.is_married,
    reasonComment: (userData: any, objectData: any, financeStructureData: any, costStructureData: any) => 
      'Im Hauptantrag wurde angegeben, dass eine Ehe oder eingetragene Lebenspartnerschaft besteht.',
    linkedForm: ['hauptantrag']
  },  
  {
    documentId: 'vollmacht-cert',
    displayTitle: 'Vollmachtsurkunde stimmt mit den Angaben überein',
    condition: (userData: any, objectData: any, financeStructureData: any, costStructureData: any) => userData?.hasauthorizedperson,
    reasonComment: (userData: any, objectData: any, financeStructureData: any, costStructureData: any) => {
      if (!userData?.bevollmaechtigte) {
        return 'Im Hauptantrag wurde angegeben, dass der Antrag durch einen bevollmächtigten gestellt wird. Jedoch wurden keine Angaben zu einer bevollmächtigten Person/Firma gemacht.';
      }

      const bevollmaechtigte = userData.bevollmaechtigte;
      const isCompany = userData.iscompany;
      
      let comment = 'Im Hauptantrag (Schritt 1) wurde angegeben, dass der Antrag durch einen bevollmächtigten gestellt wird.\n\n';
      
      if (isCompany) {
        comment += 'Bevollmächtigte Firma:\n\n';
        
        // Company information
        if (bevollmaechtigte.companyName?.trim()) {
          comment += `• Firmenname: ${bevollmaechtigte.companyName.trim()}`;
        } else {
          comment += '• Firmenname: nicht angegeben';
        }
        
        // Postbox information (company specific)
        if (bevollmaechtigte.postboxPostcode?.trim() || bevollmaechtigte.postboxCity?.trim()) {
          comment += '\n• Postfach: ';
          if (bevollmaechtigte.postboxPostcode?.trim()) {
            comment += `${bevollmaechtigte.postboxPostcode.trim()}`;
          }
          if (bevollmaechtigte.postboxCity?.trim()) {
            comment += `, ${bevollmaechtigte.postboxCity.trim()}`;
          }
        } else {
          comment += '\n• Postfach: nicht angegeben';
        }
        
      } else {
        comment += 'Bevollmächtigte Person:\n\n';
        
        // Personal information
        if (bevollmaechtigte.title?.trim()) {
          comment += `• Anrede: ${bevollmaechtigte.title.trim()}`;
        } else {
          comment += '• Anrede: nicht angegeben';
        }
        
        if (bevollmaechtigte.firstName?.trim() || bevollmaechtigte.lastName?.trim()) {
          comment += '\n• Name: ';
          if (bevollmaechtigte.firstName?.trim()) {
            comment += `${bevollmaechtigte.firstName.trim()}`;
          }
          if (bevollmaechtigte.lastName?.trim()) {
            comment += ` ${bevollmaechtigte.lastName.trim()}`;
          }
        } else {
          comment += '\n• Name: nicht angegeben';
        }
        
        // Address information
        if (bevollmaechtigte.street?.trim() || bevollmaechtigte.houseNumber?.trim()) {
          comment += '\n• Adresse: ';
          if (bevollmaechtigte.street?.trim()) {
            comment += `${bevollmaechtigte.street.trim()}`;
          }
          if (bevollmaechtigte.houseNumber?.trim()) {
            comment += ` ${bevollmaechtigte.houseNumber.trim()}`;
          }
        } else {
          comment += '\n• Adresse: nicht angegeben';
        }
        
        if (bevollmaechtigte.postalCode?.trim() || bevollmaechtigte.city?.trim()) {
          comment += '\n• PLZ/Ort: ';
          if (bevollmaechtigte.postalCode?.trim()) {
            comment += `${bevollmaechtigte.postalCode.trim()}`;
          }
          if (bevollmaechtigte.city?.trim()) {
            comment += `, ${bevollmaechtigte.city.trim()}`;
          }
        } else {
          comment += '\n• PLZ/Ort: nicht angegeben';
        }

         // Contact information (common for both)
        if (bevollmaechtigte.phone?.trim()) {
          comment += '\n• Telefon: ' + bevollmaechtigte.phone.trim();
        } else {
          comment += '\n• Telefon: nicht angegeben';
        }
        
        if (bevollmaechtigte.email?.trim()) {
          comment += '\n• E-Mail: ' + bevollmaechtigte.email.trim();
        } else {
          comment += '\n• E-Mail: nicht angegeben';
        }
      }
      
      comment += '\n\nZu prüfen: Vollmachtsurkunde stimmt mit den Angaben im Hauptantrag (Schritt 1) überein.';
      
      return comment;
    },
    linkedForm: ['hauptantrag']
  }
];

// Helper function to check if a document is uploaded
function isDocumentUploaded(documentId: string, documentStatus: any): boolean {
  const generalDocs = documentStatus?.general || {};
  const files = generalDocs[documentId] || [];
  return files.some((file: any) => file.uploaded === true);
}

// Helper function to generate full document IDs with indexes for uploaded files
function generateFullDocumentIds(documentIds: string[], applicantKey: string, documentStatus: any): string[] {
  const fullDocIds: string[] = [];
  
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
      // Filter only uploaded files and generate full IDs
      const uploadedFiles = documentFiles.filter((file: any) => file.uploaded);
      uploadedFiles.forEach((file: any, index: number) => {
        fullDocIds.push(`${searchKey}_${docId}_${index}`);
      });
    }
  });
  
  return fullDocIds;
}

// Helper function to generate disability document IDs for all applicants with disability degree >= 50
function generateDisabilityDocumentIds(userData: any, documentStatus: any): string[] {
  const disabilityDocIds: string[] = [];
  
  // Helper function to calculate age from birth date
  const calculateAge = (birthDateString: string): number => {
    if (!birthDateString) return -2;
    
    try {
      const birthDate = new Date(birthDateString);
      const today = new Date();
      
      // If birth date is in the future (pregnant), return -1
      if (birthDate > today) {
        return -1;
      }
      
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age;
    } catch (error) {
      return -2; // Use -2 for truly missing/invalid birth dates
    }
  };
  
  // Check main applicant's disability degree
  if (userData?.main_behinderungsgrad) {
    const mainBehinderungsgrad = parseFloat(userData.main_behinderungsgrad);
    if (!isNaN(mainBehinderungsgrad) && mainBehinderungsgrad >= 50) {
      // Check age - only include if 18 or older
      const mainApplicantAge = calculateAge(userData.birthDate);
      if (mainApplicantAge >= 18) {
        // Check if document exists and is uploaded
        const mainDocFiles = documentStatus?.hauptantragsteller?.nachweis_disability;
        if (mainDocFiles && Array.isArray(mainDocFiles) && mainDocFiles.length > 0) {
          // Filter only uploaded files and generate full IDs
          const uploadedFiles = mainDocFiles.filter((file: any) => file.uploaded);
          uploadedFiles.forEach((file: any, index: number) => {
            disabilityDocIds.push(`hauptantragsteller_nachweis_disability_${index}`);
          });
        } else {
          // Document not uploaded yet, but still required - add placeholder
          disabilityDocIds.push('hauptantragsteller_nachweis_disability_0');
        }
      }
    }
  }
  
  // Check additional applicants' disability degrees
  if (userData?.weitere_antragstellende_personen && typeof userData.weitere_antragstellende_personen === 'object') {
    Object.entries(userData.weitere_antragstellende_personen).forEach(([uuid, person]: [string, any]) => {
      if (person && person.behinderungsgrad) {
        const personBehinderungsgrad = parseFloat(person.behinderungsgrad);
        if (!isNaN(personBehinderungsgrad) && personBehinderungsgrad >= 50) {
          // Check age - only include if 18 or older
          const personAge = calculateAge(person.birthDate);
          if (personAge >= 18) {
            const searchKey = `applicant_${uuid}`;
            // Check if document exists and is uploaded
            const personDocFiles = documentStatus?.[searchKey]?.nachweis_disability;
            if (personDocFiles && Array.isArray(personDocFiles) && personDocFiles.length > 0) {
              // Filter only uploaded files and generate full IDs
              const uploadedFiles = personDocFiles.filter((file: any) => file.uploaded);
              uploadedFiles.forEach((file: any, index: number) => {
                disabilityDocIds.push(`${searchKey}_nachweis_disability_${index}`);
              });
            } else {
              // Document not uploaded yet, but still required - add placeholder
              disabilityDocIds.push(`${searchKey}_nachweis_disability_0`);
            }
          }
        }
      }
    });
  }
  
  return disabilityDocIds;
}

// Helper function to generate document validation checklist items for general documents
export function generateGeneralDocumentValidationItems(
  userData: any,
  objectData: any,
  financeStructureData: any,
  costStructureData: any,
  documentStatus: any
): ChecklistItem[] {
  const items: ChecklistItem[] = [];

  GENERAL_DOCUMENT_VALIDATION_RULES.forEach(rule => {
    // Check if this document is required based on the condition
    if (rule.condition(userData, objectData, financeStructureData, costStructureData)) {
      const isUploaded = isDocumentUploaded(rule.documentId, documentStatus);
      
      // Determine system status and errors
      let systemStatus: 'correct' | 'wrong' | 'undefined' = 'undefined';
      const systemErrors: string[] = [];
      
      if (!isUploaded) {
        systemStatus = 'wrong';
        //systemErrors.push(`${getDocumentLabel(rule.documentId)} fehlt`);
      }

      // Generate full document IDs with indexes for uploaded files
      const fullDocumentIds = generateFullDocumentIds([rule.documentId], 'general', documentStatus);
      
      // Generate the checklist item
      items.push({
        id: `${rule.documentId}_isvalid`,
        title: rule.displayTitle,
        systemStatus: systemStatus,
        agentStatus: 'undefined',
        systemComment: rule.reasonComment(userData, objectData, financeStructureData, costStructureData),
        systemErrors: systemErrors,
        linkedForms: rule.linkedForm, // Now rule.linkedForm is already a string array
        linkedDocs: fullDocumentIds.length > 0 ? fullDocumentIds : [rule.documentId], // Use full IDs if available, fallback to base ID
        agentNotes: null
      });
    }
  });

  return items;
} 

// Document validation configuration for applicant-specific documents
interface ApplicantDocumentValidationRule {
  documentId: string;
  displayTitle: string;
  condition: (applicantFinancialData: any, userData: any, applicantInfo: any) => boolean;
  reasonComment: (applicantFinancialData: any, userData: any, applicantInfo: any) => string;
  linkedForm: string[] | ((applicantFinancialData: any) => string[]); // Changed to return string[]
  linkedDocs?: string[]; // Optional array of document IDs to link to this rule
}

// Helper function to check if an applicant has no income
const hasNoIncomeStatus = (applicantInfo: any, userData: any): boolean => {
  if (applicantInfo?.type === 'hauptantragsteller') {
    return userData?.noIncome === true;
  } else {
    return applicantInfo?.noIncome === true;
  }
};

// Configuration for applicant-specific document validation rules
const APPLICANT_DOCUMENT_VALIDATION_RULES: ApplicantDocumentValidationRule[] = [
  {
    documentId: 'lohn_gehaltsbescheinigungen',
    displayTitle: 'Lohn-/Gehaltsbescheinigungen stimmen mit den Angaben überein',
    condition: (applicantFinancialData: any, userData: any, applicantInfo: any) => 
      !hasNoIncomeStatus(applicantInfo, userData) && 
      (applicantFinancialData?.hasSalaryIncome === true || applicantFinancialData?.isEarningRegularIncome === true),
    reasonComment: (applicantFinancialData: any) => {
      const hasSalary = applicantFinancialData?.hasSalaryIncome === true;
      const hasRegular = applicantFinancialData?.isEarningRegularIncome === true;
      let base = 'Die Person hat in ihrer Einkommenserklärung bzw. Selbstauskunft angegeben, Einkünfte aus nichtselbstständiger Arbeit bzw. aus Versorgungsbezügen zu erzielen.\n\n';
      if (hasSalary && hasRegular) {
        base += 'Zu prüfen: Die Einkommensangaben in der Einkommenserklärung & Abschnitt 1.1 der Selbstauskunft.';
      } else if (hasRegular) {
        base += 'Zu prüfen: Die Einkommensangaben in der Einkommenserklärung.';
      } else if (hasSalary) {
        base += 'Zu prüfen: Abschnitt 1.1 der Selbstauskunft.';
      }
      return base;
    },
    linkedForm: (applicantFinancialData: any) => {
      const forms: string[] = [];
      if (applicantFinancialData?.isEarningRegularIncome === true) forms.push('einkommenserklaerung');
      if (applicantFinancialData?.hasSalaryIncome === true) forms.push('selbstauskunft');
      return forms;
    }
  },
  {
    documentId: 'einkommenssteuerbescheid',
    displayTitle: 'Einkommenssteuerbescheid/Einkommenssteuererklärung stimmt mit den Angaben überein',
    condition: (applicantFinancialData: any, userData: any, applicantInfo: any) => 
      !hasNoIncomeStatus(applicantInfo, userData) && applicantFinancialData?.hasrentincome === true,
    reasonComment: (applicantFinancialData: any) => {
      const einkommenserklaerungAmount = applicantFinancialData?.incomerent;
      const selbstauskunftAmount = applicantFinancialData?.incomerent_net;
      var einkommenserklaerungAmountYear = applicantFinancialData?.incomerentyear;
      if (einkommenserklaerungAmountYear === null) {
        einkommenserklaerungAmountYear = '(Jahr nicht angegeben)';
      }

      
      let comment = 'Die Person hat in der Einkommenserklärung und Selbstauskunft angegeben, Einkünfte aus Vermietung und Verpachtung zu erzielen.\n\n';
      
      // Add Einkommenserklärung amount if available
      if (einkommenserklaerungAmount) {
        comment += `• Einkommenserklärung (Weitere Einkünfte): ${safeFormatCurrencyForDisplay(einkommenserklaerungAmount)} Gewinn im Jahr ${einkommenserklaerungAmountYear}\n`;
      } else {
        comment += `• Einkommenserklärung (Weitere Einkünfte): Inkomplette Angaben\n`;
      }
      
      // Add Selbstauskunft amount if available
      if (selbstauskunftAmount) {
        comment += `• Selbstauskunft (Abschnitt 1.2): ${safeFormatCurrencyForDisplay(selbstauskunftAmount)} netto pro Jahr\n`;
      } else {
        comment += `• Selbstauskunft (Abschnitt 1.2): Inkomplette Angaben\n`;
      }
      
      comment += '\nZu prüfen: Weitere Einkünfte in der Einkommenserklärung & Abschnitt 1.2 der Selbstauskunft.';
      
      return comment;
    },
    linkedForm: ['einkommenserklaerung', 'selbstauskunft'],
    linkedDocs: ['einkommenssteuerbescheid', 'einkommenssteuererklaerung']
  },
  {
    documentId: 'rentenbescheid',
    displayTitle: 'Rentenbescheid stimmt mit den Angaben überein',
    condition: (applicantFinancialData: any, userData: any, applicantInfo: any) => 
      !hasNoIncomeStatus(applicantInfo, userData) && applicantFinancialData?.haspensionincome === true,
    reasonComment: (applicantFinancialData: any) => {
      const einkommenserklaerungAmount = applicantFinancialData?.incomepension;
      const selbstauskunftAmounts = applicantFinancialData?.pensionmonthlynetincome || [];
      
      let comment = 'Die Person hat in der Einkommenserklärung und Selbstauskunft angegeben, Einkünfte aus Renten u./od. Versorgungsbezügen zu erzielen.\n\n';
      
      // Add Einkommenserklärung amount if available
      if (einkommenserklaerungAmount) {
        comment += `• Einkommenserklärung (Weitere Einkünfte): ${safeFormatCurrencyForDisplay(einkommenserklaerungAmount)} pro Monat\n`;
      } else {
        comment += `• Einkommenserklärung (Weitere Einkünfte): Inkomplette Angaben\n`;
      }
      
      // Calculate sum of Selbstauskunft amounts if available
      if (selbstauskunftAmounts && Array.isArray(selbstauskunftAmounts) && selbstauskunftAmounts.length > 0) {
        const sum = selbstauskunftAmounts.reduce((total: number, pension: any) => {
          const amount = parseFloat(pension.amount.toString().replace(/\./g, '').replace(',', '.')) || 0;
          return total + amount;
        }, 0);
        
        if (sum >= 0) {
          comment += `• Selbstauskunft (Abschnitt 2.1): ${safeFormatCurrencyForDisplay(sum)} pro Monat\n`;
        } else {
          comment += `• Selbstauskunft (Abschnitt 2.1): Inkomplette Angaben\n`;
        }
      } else {
        comment += `• Selbstauskunft (Abschnitt 2.1): Inkomplette Angaben\n`;
      }
      
      comment += '\nZu prüfen: Weitere Einkünfte in der Einkommenserklärung & Abschnitt 2.1 der Selbstauskunft.';
      
      return comment;
    },
    linkedForm: ['einkommenserklaerung', 'selbstauskunft']
  },
  {
    documentId: 'arbeitslosengeldbescheid',
    displayTitle: 'Arbeitslosengeldbescheid stimmt mit den Angaben überein',
    condition: (applicantFinancialData: any, userData: any, applicantInfo: any) => 
      !hasNoIncomeStatus(applicantInfo, userData) && applicantFinancialData?.hasablgincome === true,
    reasonComment: (applicantFinancialData: any) => {
      const amount = applicantFinancialData?.incomeablg;
      const turnusType = applicantFinancialData?.incomealbgtype;
      
      let turnusText = '';
      if (turnusType === 0) {
        turnusText = 'pro Tag';
      } else if (turnusType === 1) {
        turnusText = 'pro Monat';
      } else if (turnusType === 2) {
        turnusText = 'pro Jahr';
      } else {
        turnusText = '(kein Turnus angegeben)';
      }
      
      const amountText = amount ? `${parseFloat(amount).toLocaleString('de-DE')}€ ${turnusText}` : '(Betrag nicht angegeben)';
      
      return `Die Person hat im Abschnitt „Weitere Einkünfte" der Einkommenserklärung angegeben, Arbeitslosengeld in Höhe von ${amountText} zu beziehen.`;
    },
    linkedForm: ['einkommenserklaerung']
  },
  {
    documentId: 'werbungskosten_nachweis',
    displayTitle: 'Werbungskosten stimmen mit den Angaben überein',
    condition: (applicantFinancialData: any, userData: any, applicantInfo: any) => 
      !hasNoIncomeStatus(applicantInfo, userData) && 
      (applicantFinancialData?.hasSalaryIncome === true || applicantFinancialData?.isEarningRegularIncome === true) && 
      applicantFinancialData?.werbungskosten && parseFloat(applicantFinancialData.werbungskosten) > 0,
    reasonComment: (applicantFinancialData: any) => 
      `Die Person hat im Abschnitt „Kosten, Zahlungen und Abgaben" der Einkommenserklärung Werbungskosten in Höhe von ${safeFormatCurrencyForDisplay(applicantFinancialData.werbungskosten)} ausgewiesen.`,
    linkedForm: ['einkommenserklaerung']
  },
  {
    documentId: 'kinderbetreuungskosten_nachweis',
    displayTitle: 'Nachweis Kinderbetreuungskosten stimmt mit den Angaben überein',
    condition: (applicantFinancialData: any, userData: any, applicantInfo: any) => 
      !hasNoIncomeStatus(applicantInfo, userData) && 
      applicantFinancialData?.kinderbetreuungskosten && parseFloat(applicantFinancialData.kinderbetreuungskosten) > 0,
    reasonComment: (applicantFinancialData: any) => 
      `Der Antragsteller hat im Abschnitt „Kosten, Zahlungen und Abgaben" der Einkommenserklärung Kinderbetreuungskosten in Höhe von ${safeFormatCurrencyForDisplay(applicantFinancialData.kinderbetreuungskosten)} ausgewiesen.`,
    linkedForm: ['einkommenserklaerung']
  },
  {
    documentId: 'unterhaltsverpflichtung_nachweis',
    displayTitle: 'Nachweis Unterhaltsverpflichtung stimmt mit den Angaben überein',
    condition: (applicantFinancialData: any, userData: any, applicantInfo: any) => 
      !hasNoIncomeStatus(applicantInfo, userData) && applicantFinancialData?.ispayingunterhalt === true,
    reasonComment: (applicantFinancialData: any) => {
      const einkommenserklaerungAmounts = applicantFinancialData?.unterhaltszahlungen || [];
      const selbstauskunftAmounts = applicantFinancialData?.unterhaltszahlungenTotal || [];
      
      let comment = 'Die Person hat in der Einkommenserklärung und Selbstauskunft angegeben, Unterhalt zu zahlen.\n\n';
      
      // Calculate sum of Einkommenserklärung amounts if available
      if (einkommenserklaerungAmounts && Array.isArray(einkommenserklaerungAmounts) && einkommenserklaerungAmounts.length > 0) {
        const sum = einkommenserklaerungAmounts.reduce((total: number, zahlung: any) => {
          const amount = parseFloat(zahlung.amount.toString().replace(/\./g, '').replace(',', '.')) || 0;
          return total + amount;
        }, 0);
        
        if (sum >= 0) {
          comment += `• Einkommenserklärung (Kosten, Zahlungen und Abgaben): ${safeFormatCurrencyForDisplay(sum)} pro Monat\n`;
        } else {
          comment += `• Einkommenserklärung (Kosten, Zahlungen und Abgaben): Inkomplette Angaben\n`;
        }
      } else {
        comment += `• Einkommenserklärung (Kosten, Zahlungen und Abgaben): Inkomplette Angaben\n`;
      }
      
      // Calculate sum of Selbstauskunft amounts if available
      if (selbstauskunftAmounts && Array.isArray(selbstauskunftAmounts) && selbstauskunftAmounts.length > 0) {
        const sum = selbstauskunftAmounts.reduce((total: number, zahlung: any) => {
          const amount = parseFloat(zahlung.amountTotal.toString().replace(/\./g, '').replace(',', '.')) || 0;
          return total + amount;
        }, 0);
        
        if (sum > 0) {
          comment += `• Selbstauskunft (Abschnitt 3.2): ${safeFormatCurrencyForDisplay(sum)} pro Monat\n`;
        } else {
          comment += `• Selbstauskunft (Abschnitt 3.2): Inkomplette Angaben\n`;
        }
      } else {
        comment += `• Selbstauskunft (Abschnitt 3.2): Inkomplette Angaben\n`;
      }
      
      comment += '\nZu prüfen: Kosten, Zahlungen und Abgaben in der Einkommenserklärung & Abschnitt 3.2 der Selbstauskunft.';
      
      return comment;
    },
    linkedForm: ['einkommenserklaerung', 'selbstauskunft']
  },
  {
    documentId: 'unterhaltsleistungen_nachweis',
    displayTitle: 'Nachweis Unterhaltsleistungen stimmt mit den Angaben überein',
    condition: (applicantFinancialData: any, userData: any, applicantInfo: any) => 
      !hasNoIncomeStatus(applicantInfo, userData) && 
      (applicantFinancialData?.hastaxfreeunterhaltincome === true || applicantFinancialData?.hastaxableunterhaltincome === true),
    reasonComment: (applicantFinancialData: any) => {
      let comment = 'Die Person hat in der Einkommenserklärung und Selbstauskunft angegeben, Unterhaltsleistungen zu erhalten.\n\n';
      
      // Check for tax-free unterhalt income (present in both forms)
      if (applicantFinancialData?.hastaxfreeunterhaltincome === true) {
        const amount = applicantFinancialData?.incomeunterhalttaxfree;
        
        if (amount) {
          comment += `• Steuerfreie Unterhaltsleistungen: ${safeFormatCurrencyForDisplay(amount)} pro Monat (Einkommenserklärung & Selbstauskunft)\n`;
        } else {
          comment += `• Steuerfreie Unterhaltsleistungen: Inkomplette Angaben\n`;
        }
      }
      
      // Check for taxable unterhalt income
      if (applicantFinancialData?.hastaxableunterhaltincome === true) {
        const einkommenserklaerungAmount = applicantFinancialData?.incomeunterhalttaxable;
        const selbstauskunftAmount = applicantFinancialData?.incomeunterhalttaxable_net;
        
        if (einkommenserklaerungAmount) {
          comment += `• Steuerpflichtige Unterhaltsleistungen in der Einkommenserklärung (Weitere Einkünfte): ${safeFormatCurrencyForDisplay(einkommenserklaerungAmount)} brutto pro Monat\n`;
        } else {
          comment += `• Steuerpflichtige Unterhaltsleistungen in der Einkommenserklärung (Weitere Einkünfte): Inkomplette Angaben\n`;
        }
        
        if (selbstauskunftAmount) {
          comment += `• Steuerpflichtige Unterhaltsleistungen in der Selbstauskunft (Abschnitt 2.2): ${safeFormatCurrencyForDisplay(selbstauskunftAmount)} netto pro Monat\n`;
        } else {
          comment += `• Steuerpflichtige Unterhaltsleistungen in der Selbstauskunft (Abschnitt 2.2): Inkomplette Angaben\n`;
        }
      }
      
      comment += '\nZu prüfen: Weitere Einkünfte in der Einkommenserklärung & Abschnitt 2.2 der Selbstauskunft.';
      
      return comment;
    },
    linkedForm: ['einkommenserklaerung', 'selbstauskunft']
  },
  {
    documentId: 'krankengeld_nachweis',
    displayTitle: 'Nachweis Krankengeld stimmt mit den Angaben überein',
    condition: (applicantFinancialData: any, userData: any, applicantInfo: any) => 
      !hasNoIncomeStatus(applicantInfo, userData) && hasKrankengeldIncome(applicantFinancialData?.othermonthlynetincome),
    reasonComment: (applicantFinancialData: any) => {
      const otherIncome = applicantFinancialData?.othermonthlynetincome;
      
      if (!otherIncome || !Array.isArray(otherIncome)) {
        return 'Der Antragsteller hat im Abschnitt 2.2 der Selbstauskunft unter sonstige Einkünfte Krankengeld angegeben, aber der Betrag wurde nicht angegeben.';
      }
      
      // Find the Krankengeld entry using the same logic as hasKrankengeldIncome
      const krankengeldEntry = otherIncome.find((income: any) => {
        if (!income || !income.type || typeof income.type !== 'string') {
          return false;
        }
        
        const normalizedType = income.type.toLowerCase().trim().replace(/[^\w\s]/g, '');
        const krankengeldVariations = [
          'krankengeld',
          'kranken geld',
          'krank geld',
          'kg',
          'krankengelt',
          'krankengald',
          'krangengeld',
          'krankengel',
          'krangeld'
        ];
        
        return krankengeldVariations.some(variation => 
          normalizedType.includes(variation) || 
          variation.includes(normalizedType)
        );
      });
      
      if (krankengeldEntry && krankengeldEntry.amount) {
        return `Der Antragsteller hat im Abschnitt 2.2 der Selbstauskunft unter sonstige Einkünfte Krankengeld in Höhe von ${krankengeldEntry.amount} angegeben.`;
      } else {
        return 'Der Antragsteller hat im Abschnitt 2.2 der Selbstauskunft unter sonstige Einkünfte Krankengeld erwähnt, aber der Betrag wurde nicht angegeben.';
      }
    },
    linkedForm: ['selbstauskunft', 'einkommenserklaerung']
  },
  {
    documentId: 'elterngeld_nachweis',
    displayTitle: 'Nachweis Elterngeld stimmt mit den Angaben überein',
    condition: (applicantFinancialData: any, userData: any, applicantInfo: any) => 
      !hasNoIncomeStatus(applicantInfo, userData) && applicantFinancialData?.haselterngeldincome === true,
    reasonComment: (applicantFinancialData: any) => 
      applicantFinancialData?.monthlyelterngeldnetincome 
        ? `Die Person hat im Abschnitt Abschnitt 2.2 der Selbstauskunft Elterngeld in Höhe von ${safeFormatCurrencyForDisplay(applicantFinancialData.monthlyelterngeldnetincome)} pro Monat ausgewiesen.`
        : 'Die Person hat in der Selbstauskunft angegeben, Elterngeld zu beziehen, aber der Betrag wurde nicht angegeben.',
    linkedForm: ['selbstauskunft']
  },
  {
    documentId: 'guv_euer_nachweis',
    displayTitle: 'Gewinn- und Verlustrechnung (GuV)/EÜR stimmt mit den Angaben überein',
    condition: (applicantFinancialData: any, userData: any, applicantInfo: any) => 
      !hasNoIncomeStatus(applicantInfo, userData) && 
      (applicantFinancialData?.hasbusinessincome === true || applicantFinancialData?.hasagricultureincome === true),
    reasonComment: (applicantFinancialData: any) => {
      let comment = 'Die Person hat in der Einkommenserklärung und Selbstauskunft angegeben, Einkommen aus Gewerbebetrieb/selbstständiger Arbeit oder Land-/Forstwirtschaft zu haben.\n\n';
      
      // Check for business income from Einkommenserklärung
      if (applicantFinancialData?.hasbusinessincome === true) {
        const businessAmount = applicantFinancialData?.incomebusiness;
        const businessYear = applicantFinancialData?.incomebusinessyear;
        
        if (businessAmount) {
          const yearText = businessYear ? ` im Jahr ${businessYear}` : '(Jahr nicht angegeben)';
          comment += `• Einkünfte aus Gewerbebetrieb/selbstständiger Arbeit in der Einkommenserklärung (Weitere Einkünfte): ${safeFormatCurrencyForDisplay(businessAmount)} Gewinn${yearText}\n`;
        } else {
          comment += `• Einkünfte aus Gewerbebetrieb/selbstständiger Arbeit in der Einkommenserklärung (Weitere Einkünfte): Inkomplette Angaben\n`;
        }
      }

      if (applicantFinancialData?.hasbusinessincome === true) {
        const businessAmount = applicantFinancialData?.yearlybusinessnetincome;
        
        if (businessAmount && parseFloat(businessAmount) > 0) {
          comment += `• Einkünfte aus Gewerbebetrieb in der Selbstauskunft (Abschnitt 1.2): ${safeFormatCurrencyForDisplay(businessAmount)} netto pro Jahr\n`;
        } 
      }

      if (applicantFinancialData?.hasbusinessincome === true) {
        const selfAmount = applicantFinancialData?.yearlyselfemployednetincome;
        
        if (selfAmount && parseFloat(selfAmount) > 0) {
          comment += `• Einkünfte aus selbstständiger Arbeit in der Selbstauskunft (Abschnitt 1.2): ${safeFormatCurrencyForDisplay(selfAmount)} netto pro Jahr\n`;
        } 
      }
      
      // Check for agriculture income from Einkommenserklärung
      if (applicantFinancialData?.hasagricultureincome === true) {
        const agricultureAmount = applicantFinancialData?.incomeagriculture;
        const agricultureYear = applicantFinancialData?.incomeagricultureyear;
        
        if (agricultureAmount) {
          const yearText = agricultureYear ? ` im Jahr ${agricultureYear}` : '(Jahr nicht angegeben)';
          comment += `• Einkünfte aus Land-/Forstwirtschaft in der Einkommenserklärung (Weitere Einkünfte): ${safeFormatCurrencyForDisplay(agricultureAmount)} Gewinn${yearText}\n`;
        } else {
          comment += `• Einkünfte aus Land-/Forstwirtschaft in der Einkommenserklärung (Weitere Einkünfte): Inkomplette Angaben\n`;
        }
      }
      
      // Check for agriculture income from Selbstauskunft
      if (applicantFinancialData?.hasagricultureincome === true) {
        const agricultureNet = applicantFinancialData?.incomeagriculture_net;
        
        if (agricultureNet && parseFloat(agricultureNet) > 0) {
          comment += `• Einkünfte aus Land-/Forstwirtschaft in der Selbstauskunft (Abschnitt 1.2): ${safeFormatCurrencyForDisplay(agricultureNet)} netto pro Jahr\n`;
        } else {
          comment += `• Einkünfte aus Land-/Forstwirtschaft in der Selbstauskunft (Abschnitt 1.2): Inkomplette Angaben\n`;
        }
      }
      
      comment += '\nZu prüfen: Weitere Einkünfte in der Einkommenserklärung & Abschnitte 1.2 der Selbstauskunft.';
      
      return comment;
    },
    linkedForm: ['einkommenserklaerung', 'selbstauskunft']
  },
  {
    documentId: 'nachweis_disability',
    displayTitle: 'Nachweis des Grades der Behinderung stimmt mit den Angaben überein',
    condition: (applicantFinancialData: any, userData: any, applicantInfo: any) => {
      // For main applicant, check userData.main_behinderungsgrad
      if (applicantInfo?.type === 'hauptantragsteller') {
        return userData?.main_behinderungsgrad && parseFloat(userData.main_behinderungsgrad) > 0;
      }
      // For additional applicants, check applicantInfo.behinderungsgrad
      return applicantInfo?.behinderungsgrad && parseFloat(applicantInfo.behinderungsgrad) > 0;
    },
    reasonComment: (applicantFinancialData: any, userData: any, applicantInfo: any) => {
      if (applicantInfo?.type === 'hauptantragsteller') {
        const grad = userData?.main_behinderungsgrad || '0';
        return `Der Hauptantragsteller hat in der Haushaltsauskunft einen Behinderungsgrad von ${grad}% angegeben.`;
      } else {
        const grad = applicantInfo?.behinderungsgrad || '0';
        const name = applicantInfo?.name || 'Die Person';
        return `${name} hat in der Haushaltsauskunft einen Behinderungsgrad von ${grad}% angegeben.`;
      }
    },
    linkedForm: ['haushaltsauskunft']
  },
  {
    documentId: 'pflegegrad_nachweis',
    displayTitle: 'Nachweis Pflegebedürftigkeit stimmt mit den Angaben überein',
    condition: (applicantFinancialData: any, userData: any, applicantInfo: any) => {
      // For main applicant, check userData.main_pflegegrad
      if (applicantInfo?.type === 'hauptantragsteller') {
        return userData?.main_pflegegrad && parseFloat(userData.main_pflegegrad) > 0;
      }
      // For additional applicants, check applicantInfo.pflegegrad
      return applicantInfo?.pflegegrad && parseFloat(applicantInfo.pflegegrad) > 0;
    },
    reasonComment: (applicantFinancialData: any, userData: any, applicantInfo: any) => {
      if (applicantInfo?.type === 'hauptantragsteller') {
        const grad = userData?.main_pflegegrad || '0';
        return `Der Hauptantragsteller hat in der Haushaltsauskunft einen Pflegegrad von ${grad} angegeben.`;
      } else {
        const grad = applicantInfo?.pflegegrad || '0';
        const name = applicantInfo?.name || 'Die Person';
        return `${name} hat in der Haushaltsauskunft einen Pflegegrad von ${grad} angegeben.`;
      }
    },
    linkedForm: ['haushaltsauskunft']
  }
];

// Additional checklist items for application-specific documents that are uploaded but can't be determined as 100% required
// These documents are created when uploaded, regardless of form data, for agent review
const ADDITIONAL_APPLICANT_DOCUMENT_ITEMS: {
  documentId: string;
  displayTitle: string;
  reasonComment: (applicantInfo: any) => string;
  linkedForm: string[];
  incomeDependent: boolean; // Whether this document should only be shown for applicants with income
  additionalCondition?: (applicantFinancialData: any) => boolean; // Additional condition to check
}[] = [
  {
    documentId: 'freiwillige_krankenversicherung_nachweis',
    displayTitle: 'Nachweis über freiwillige Beiträge zur Krankenversicherung',
    reasonComment: (applicantInfo: any) => {
      const name = applicantInfo?.name || 'Die Person';
      return `${name} hat einen Nachweis über freiwillige Beiträge zur Krankenversicherung hochgeladen. Bitte prüfen Sie die Angaben in der Einkommenserklärung und Selbstauskunft auf Übereinstimmung.`;
    },
    linkedForm: ['einkommenserklaerung', 'selbstauskunft'],
    incomeDependent: true
  },
  {
    documentId: 'freiwillige_versicherungsbeitraege_nachweis',
    displayTitle: 'Nachweis über freiwillige Renten- und Lebensversicherungsbeiträge',
    reasonComment: (applicantInfo: any) => {
      const name = applicantInfo?.name || 'Die Person';
      return `${name} hat einen Nachweis über freiwillige Renten- und Lebensversicherungsbeiträge hochgeladen. Bitte prüfen Sie die Angaben in der Einkommenserklärung und Selbstauskunft auf Übereinstimmung.`;
    },
    linkedForm: ['einkommenserklaerung', 'selbstauskunft'],
    incomeDependent: true
  },
  {
    documentId: 'ausbildungsfoerderung_nachweis',
    displayTitle: 'Leistungen der Ausbildungsförderung (BAföG, Berufsausbildungsbeihilfe SGB III)',
    reasonComment: (applicantInfo: any) => {
      const name = applicantInfo?.name || 'Die Person';
      return `${name} hat einen Nachweis über Leistungen der Ausbildungsförderung hochgeladen. Bitte prüfen Sie die Angaben in der Einkommenserklärung und Selbstauskunft auf Übereinstimmung.`;
    },
    linkedForm: ['einkommenserklaerung', 'selbstauskunft'],
    incomeDependent: true
  },
  {
    documentId: 'krankengeld_nachweis',
    displayTitle: 'Nachweis Krankengeld stimmt mit den Angaben überein',
    reasonComment: (applicantInfo: any) => {
      const name = applicantInfo?.name || 'Die Person';
      return `${name} hat einen Nachweis über Krankengeld hochgeladen. Bitte prüfen Sie die Angaben in der Einkommenserklärung und Selbstauskunft auf Übereinstimmung.`;
    },
    linkedForm: ['einkommenserklaerung', 'selbstauskunft'],
    incomeDependent: true,
    additionalCondition: (applicantFinancialData: any) => !hasKrankengeldIncome(applicantFinancialData?.othermonthlynetincome)
  }
];

// Helper function to check if an applicant document is uploaded
function isApplicantDocumentUploaded(documentId: string, applicantKey: string, documentStatus: any): boolean {
  const applicantDocs = documentStatus?.[applicantKey] || {};
  const files = applicantDocs[documentId] || [];
  return files.some((file: any) => file.uploaded === true);
}

// Helper function to check if multiple applicant documents are uploaded
function areApplicantDocumentsUploaded(documentIds: string[], applicantKey: string, documentStatus: any): boolean {
  return documentIds.every(docId => isApplicantDocumentUploaded(docId, applicantKey, documentStatus));
}

// Helper function to find missing applicant documents
function findMissingApplicantDocuments(documentIds: string[], applicantKey: string, documentStatus: any): string[] {
  const missingDocs: string[] = [];
  documentIds.forEach(docId => {
    if (!isApplicantDocumentUploaded(docId, applicantKey, documentStatus)) {
      missingDocs.push(getDocumentLabel(docId));
    }
  });
  return missingDocs;
}

// Helper function to generate document validation checklist items for applicant-specific documents
export function generateApplicantDocumentValidationItems(
  applicant: {key: string, name: string, type: 'hauptantragsteller' | 'applicant', uuid?: string},
  applicantFinancialData: any,
  userData: any,
  documentStatus: any
): ChecklistItem[] {
  const items: ChecklistItem[] = [];

  // Get applicant info for all applicants
  let applicantInfo = applicantFinancialData || {};
  if (applicant.type === 'hauptantragsteller') {
    // For main applicant, create an info object with the type and data from userData
    applicantInfo = {
      type: 'hauptantragsteller',
      name: 'Hauptantragsteller',
      ...applicantFinancialData
    };
  } else if (applicant.type === 'applicant' && applicant.uuid) {
    // For additional applicants, get info from weitere_antragstellende_personen
    const weiterePersonen = userData?.weitere_antragstellende_personen;
    if (weiterePersonen && weiterePersonen[applicant.uuid]) {
      applicantInfo = {
        type: 'applicant',
        name: applicant.name,
        ...weiterePersonen[applicant.uuid],
        // Merge any financial data if available
        ...(applicantFinancialData || {})
      };
    }
  }

  console.log(`Evaluating validation rules for applicant ${applicant.key} with financial data:`, applicantFinancialData);
  
  // First, process the standard validation rules
  APPLICANT_DOCUMENT_VALIDATION_RULES.forEach(rule => {
    // Check if this document is required based on the condition
    const isRequired = rule.condition(applicantFinancialData, userData, applicantInfo);
    console.log(`Rule ${rule.documentId} for ${applicant.key}: required = ${isRequired}`);
    if (isRequired) {
      console.log(`Rule ${rule.documentId} is required for ${applicant.key}. Condition details:`, {
        applicantType: applicantInfo?.type,
        hasDisability: applicantInfo?.type === 'hauptantragsteller' ? userData?.main_behinderungsgrad : applicantInfo?.behinderungsgrad,
        hasCareLevel: applicantInfo?.type === 'hauptantragsteller' ? userData?.main_pflegegrad : applicantInfo?.pflegegrad,
        employment: applicantInfo?.type === 'hauptantragsteller' ? userData?.employment : applicantInfo?.employment?.type
      });
    }
    
    if (isRequired) {
      // Determine which documents to check for this rule
      const documentsToCheck = rule.linkedDocs || [rule.documentId];
      
      // Check if all required documents are uploaded
      const allDocumentsUploaded = areApplicantDocumentsUploaded(documentsToCheck, applicant.key, documentStatus);
      
      // Determine system status and errors
      let systemStatus: 'correct' | 'wrong' | 'undefined' = 'undefined';
      const systemErrors: string[] = [];
      
      if (!allDocumentsUploaded) {
        systemStatus = 'wrong';
        const missingDocs = findMissingApplicantDocuments(documentsToCheck, applicant.key, documentStatus);
        if (missingDocs.length === 1) {
          systemErrors.push(`${missingDocs[0]} fehlt`);
        } else if (missingDocs.length > 1) {
          systemErrors.push(`${missingDocs.join(', ')} fehlen`);
        }
      }

      // Handle dynamic linkedForm (can be string array or function returning string array)
      let linkedForms: string[];
      if (typeof rule.linkedForm === 'function') {
        linkedForms = rule.linkedForm(applicantFinancialData);
      } else {
        linkedForms = rule.linkedForm;
      }

      // Generate full document IDs with indexes for uploaded files
      const fullDocumentIds = generateFullDocumentIds(documentsToCheck, applicant.key, documentStatus);
      
      // Generate the checklist item
      items.push({
        id: `${rule.documentId}_${applicant.key}_isvalid`,
        title: `${rule.displayTitle} (${applicant.name})`,
        systemStatus: systemStatus,
        agentStatus: 'undefined',
        systemComment: rule.reasonComment(applicantFinancialData, userData, applicantInfo),
        systemErrors: [],
        linkedForms: linkedForms,
        linkedDocs: fullDocumentIds.length > 0 ? fullDocumentIds : documentsToCheck, // Use full IDs if available, fallback to base IDs
        agentNotes: null
      });
    }
  });

  // Then, process additional document items that are uploaded but can't be determined as 100% required
  ADDITIONAL_APPLICANT_DOCUMENT_ITEMS.forEach(item => {
    // Check if this document is uploaded for this applicant
    const isUploaded = isApplicantDocumentUploaded(item.documentId, applicant.key, documentStatus);
    
    if (isUploaded) {
      // Check if this document should be shown based on income dependency
      let shouldShow = true;
      
      if (item.incomeDependent) {
        // For income-dependent documents, check if applicant has no income
        const hasNoIncome = applicant.type === 'applicant' && applicant.uuid 
          ? userData?.weitere_antragstellende_personen?.[applicant.uuid]?.noIncome === true
          : userData?.noIncome === true;
        
        shouldShow = !hasNoIncome;
      }
      
      // Check additional condition if specified
      if (shouldShow && item.additionalCondition) {
        shouldShow = item.additionalCondition(applicantFinancialData);
      }
      
      if (shouldShow) {
        // Generate full document IDs with indexes for uploaded files
        const fullDocumentIds = generateFullDocumentIds([item.documentId], applicant.key, documentStatus);
        
        // Generate the checklist item for uploaded documents that need agent review
        items.push({
          id: `${item.documentId}_${applicant.key}_isvalid`,
          title: `${item.displayTitle} (${applicant.name})`,
          systemStatus: 'undefined', // Always undefined for these items as they need agent review
          agentStatus: 'undefined',
          systemComment: item.reasonComment(applicantInfo),
          systemErrors: [], // No system errors for uploaded documents
          linkedForms: item.linkedForm,
          linkedDocs: fullDocumentIds.length > 0 ? fullDocumentIds : [item.documentId], // Use full IDs if available, fallback to base ID
          agentNotes: null
        });
      }
    }
  });

  return items;
}

/**
 * Rephrases applicant-specific error messages to be more general and agent-appropriate
 * @param message The original applicant-specific message
 * @returns A rephrased message suitable for agent review
 */
function rephraseApplicantMessage(message: string): string {
  // Replace "Ihr" (your) with "Das" (the) for income-related messages
  if (message.includes('Ihr Brutto- und Nettoeinkommen')) {
    return 'Das Brutto- und Nettoeinkommen liegt über den zulässigen Grenzen.';
  }
  if (message.includes('Ihr Bruttoeinkommen')) {
    return 'Das Bruttoeinkommen liegt über der zulässigen Grenze.';
  }
  if (message.includes('Ihr Nettoeinkommen')) {
    return 'Das Nettoeinkommen liegt über der zulässigen Grenze.';
  }
  
  // Replace "Sie erfüllen" (you fulfill) with "Die Voraussetzungen werden erfüllt" (requirements are fulfilled)
  if (message.includes('Sie erfüllen die Voraussetzungen für Gruppe A')) {
    return 'Die Voraussetzungen für Gruppe A werden erfüllt.';
  }
  if (message.includes('Sie erfüllen die Voraussetzungen für Gruppe B')) {
    return 'Die Voraussetzungen für Gruppe B werden erfüllt.';
  }
  
  // For other messages, replace "Ihr" with "Das" where appropriate
  return message.replace(/^Ihr\s/, 'Das ');
}

