import { supabase } from '../lib/supabase';

// Interfaces for value-document mappings
export interface ValueField {
  id: string;
  label: string;
  description: string;
  dataType: 'currency' | 'number' | 'date' | 'text';
  isRequired: boolean;
  sourceForm: 'user_financials' | 'both';
  calculationMethod?: 'monthly' | 'yearly' | 'daily';
  isArray?: boolean;
}

export interface DocumentMapping {
  documentTypeId: string;
  documentTitle: string;
  documentCategory: string;
  extractionPaths: string[];
  confidence: 'high' | 'medium' | 'low';
  isRequired: boolean;
  supportsMultiple: boolean;
}

export interface ValueDocumentMapping {
  valueField: ValueField;
  documentMappings: DocumentMapping[];
  priority: number; // 1 = highest priority
}

export interface RequiredValue {
  valueField: ValueField;
  isPresent: boolean;
  currentValue?: any;
  needsExtraction: boolean;
  priority: number;
  personId: string;
  personName: string;
  personType: 'hauptantragsteller' | 'additional_applicant' | 'household_member';
  personUuid?: string;
}

export interface DocumentToScan {
  documentTypeId: string;
  documentTitle: string;
  documentCategory: string;
  applicantType: 'general' | 'hauptantragsteller' | 'applicant';
  applicantUuid?: string;
  applicantNumber?: number;
  extractionPaths: string[];
  confidence: 'high' | 'medium' | 'low';
  isRequired: boolean;
  supportsMultiple: boolean;
  priority: number;
}

export interface MappingResult {
  requiredValues: RequiredValue[];
  documentsToScan: DocumentToScan[];
  totalValuesNeeded: number;
  totalDocumentsToScan: number;
}

export class DocumentValueMappingService {
  private residentId: string;
  private applicationId: string;

  constructor(residentId: string, applicationId: string) {
    this.residentId = residentId;
    this.applicationId = applicationId;
  }

  /**
   * Main method to determine required values and map them to documents
   */
  async determineRequiredValuesAndDocuments(): Promise<MappingResult> {
    try {
      // Fetch form data
      const { userData, financialData, additionalApplicants, householdMembers } = await this.fetchFormData();
      
      // Get all value-document mappings
      const valueDocumentMappings = this.getValueDocumentMappings();
      
      // Determine which values are required based on form data for each person
      const requiredValues = this.determineRequiredValuesPerPerson(
        userData,
        financialData, 
        additionalApplicants,
        householdMembers,
        valueDocumentMappings
      );
      
      // Map required values to documents that need to be scanned
      const documentsToScan = this.mapValuesToDocuments(requiredValues, valueDocumentMappings);
      
      return {
        requiredValues,
        documentsToScan,
        totalValuesNeeded: requiredValues.filter(v => v.needsExtraction).length,
        totalDocumentsToScan: documentsToScan.length
      };
    } catch (error) {
      console.error('Error determining required values and documents:', error);
      throw error;
    }
  }

  /**
   * Fetch all relevant form data
   */
  private async fetchFormData() {
    // Load user data (contains household information)
    const { data: userData, error: userError } = await supabase
      .from('user_data')
      .select('*')
      .eq('id', this.residentId)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      throw userError;
    }

    // Load financial data for the main applicant
    const { data: financialData, error: financialError } = await supabase
      .from('user_financials')
      .select('*')
      .eq('user_id', this.residentId)
      .single();

    if (financialError) {
      console.error('Error fetching financial data:', financialError);
      throw financialError;
    }

    // Get additional applicants/household members from user_data
    const additionalApplicants = userData.additionalApplicants || [];
    const householdMembers = userData.householdMembers || [];

    return {
      userData,
      financialData,
      additionalApplicants,
      householdMembers
    };
  }

  /**
   * Get all value-document mappings
   */
  private getValueDocumentMappings(): ValueDocumentMapping[] {
    return [
      // Employment Income Mappings
      {
        valueField: {
          id: 'monthlynetsalary',
          label: 'Monatliches Nettoeinkommen',
          description: 'Nettolohn aus Gehaltsabrechnung',
          dataType: 'currency',
          isRequired: true,
          sourceForm: 'user_financials',
          calculationMethod: 'monthly'
        },
        documentMappings: [
          {
            documentTypeId: 'lohn_gehaltsbescheinigungen',
            documentTitle: 'Lohn-/Gehaltsbescheinigungen',
            documentCategory: 'Applicant',
            extractionPaths: ['net_salary', 'netto_lohn', 'netto_gehalt'],
            confidence: 'high',
            isRequired: true,
            supportsMultiple: true
          }
        ],
        priority: 1
      },
      {
        valueField: {
          id: 'weihnachtsgeld_next12_net',
          label: 'Weihnachtsgeld (nächste 12 Monate)',
          description: 'Weihnachtsgeld aus Gehaltsabrechnung',
          dataType: 'currency',
          isRequired: false,
          sourceForm: 'user_financials',
          calculationMethod: 'yearly'
        },
        documentMappings: [
          {
            documentTypeId: 'lohn_gehaltsbescheinigungen',
            documentTitle: 'Lohn-/Gehaltsbescheinigungen',
            documentCategory: 'Applicant',
            extractionPaths: ['weihnachtsgeld', 'christmas_bonus', 'holiday_bonus'],
            confidence: 'high',
            isRequired: false,
            supportsMultiple: true
          }
        ],
        priority: 2
      },
      {
        valueField: {
          id: 'urlaubsgeld_next12_net',
          label: 'Urlaubsgeld (nächste 12 Monate)',
          description: 'Urlaubsgeld aus Gehaltsabrechnung',
          dataType: 'currency',
          isRequired: false,
          sourceForm: 'user_financials',
          calculationMethod: 'yearly'
        },
        documentMappings: [
          {
            documentTypeId: 'lohn_gehaltsbescheinigungen',
            documentTitle: 'Lohn-/Gehaltsbescheinigungen',
            documentCategory: 'Applicant',
            extractionPaths: ['urlaubsgeld', 'vacation_pay', 'holiday_pay'],
            confidence: 'high',
            isRequired: false,
            supportsMultiple: true
          }
        ],
        priority: 2
      },
      {
        valueField: {
          id: 'otheremploymentmonthlynetincome',
          label: 'Sonstige Einkünfte aus nichtselbstständiger Arbeit',
          description: 'Sonstige Einkünfte aus Gehaltsabrechnung',
          dataType: 'currency',
          isRequired: false,
          sourceForm: 'user_financials',
          calculationMethod: 'monthly'
        },
        documentMappings: [
          {
            documentTypeId: 'lohn_gehaltsbescheinigungen',
            documentTitle: 'Lohn-/Gehaltsbescheinigungen',
            documentCategory: 'Applicant',
            extractionPaths: ['other_income', 'sonstige_einkuenfte', 'additional_income'],
            confidence: 'medium',
            isRequired: false,
            supportsMultiple: true
          }
        ],
        priority: 3
      },

      // Business Income Mappings
      {
        valueField: {
          id: 'incomebusiness',
          label: 'Einkünfte aus Gewerbebetrieb',
          description: 'Gewinn aus GuV/EÜR',
          dataType: 'currency',
          isRequired: false,
          sourceForm: 'user_financials',
          calculationMethod: 'yearly'
        },
        documentMappings: [
          {
            documentTypeId: 'guv_euer_nachweis',
            documentTitle: 'GuV/EÜR Nachweis',
            documentCategory: 'Applicant',
            extractionPaths: ['gewinn', 'profit', 'net_income', 'einkommen'],
            confidence: 'high',
            isRequired: false,
            supportsMultiple: true
          },
          {
            documentTypeId: 'einkommenssteuerbescheid',
            documentTitle: 'Einkommenssteuerbescheid',
            documentCategory: 'Applicant',
            extractionPaths: ['gewerbe_einkommen', 'business_income'],
            confidence: 'medium',
            isRequired: false,
            supportsMultiple: false
          }
        ],
        priority: 2
      },
      {
        valueField: {
          id: 'incomeagriculture',
          label: 'Einkünfte aus Land-/Forstwirtschaft',
          description: 'Gewinn aus GuV/EÜR',
          dataType: 'currency',
          isRequired: false,
          sourceForm: 'user_financials',
          calculationMethod: 'yearly'
        },
        documentMappings: [
          {
            documentTypeId: 'guv_euer_nachweis',
            documentTitle: 'GuV/EÜR Nachweis',
            documentCategory: 'Applicant',
            extractionPaths: ['landwirtschaft_gewinn', 'agriculture_profit', 'forstwirtschaft_gewinn'],
            confidence: 'high',
            isRequired: false,
            supportsMultiple: true
          }
        ],
        priority: 2
      },

      // Rental Income Mappings
      {
        valueField: {
          id: 'incomerent',
          label: 'Einkünfte aus Vermietung und Verpachtung',
          description: 'Mieteinnahmen aus Steuerbescheid/Steuererklärung',
          dataType: 'currency',
          isRequired: false,
          sourceForm: 'user_financials',
          calculationMethod: 'yearly'
        },
        documentMappings: [
          {
            documentTypeId: 'einkommenssteuerbescheid',
            documentTitle: 'Einkommenssteuerbescheid',
            documentCategory: 'Applicant',
            extractionPaths: ['mieteinnahmen', 'rental_income', 'verpachtung'],
            confidence: 'high',
            isRequired: false,
            supportsMultiple: false
          },
          {
            documentTypeId: 'einkommenssteuererklaerung',
            documentTitle: 'Einkommenssteuererklärung',
            documentCategory: 'Applicant',
            extractionPaths: ['mieteinnahmen', 'rental_income', 'verpachtung'],
            confidence: 'medium',
            isRequired: false,
            supportsMultiple: false
          }
        ],
        priority: 2
      },

      // Pension Income Mappings
      {
        valueField: {
          id: 'incomepension',
          label: 'Einkünfte aus Renten/Versorgungsbezügen',
          description: 'Rente aus Rentenbescheid',
          dataType: 'currency',
          isRequired: false,
          sourceForm: 'user_financials',
          calculationMethod: 'monthly'
        },
        documentMappings: [
          {
            documentTypeId: 'rentenbescheid',
            documentTitle: 'Rentenbescheid/Versorgungsbezüge',
            documentCategory: 'Applicant',
            extractionPaths: ['rente', 'pension', 'versorgungsbezug', 'monthly_pension'],
            confidence: 'high',
            isRequired: false,
            supportsMultiple: true
          }
        ],
        priority: 2
      },

      // Unemployment Benefits Mappings
      {
        valueField: {
          id: 'incomeablg',
          label: 'Arbeitslosengeld',
          description: 'Arbeitslosengeld aus Bescheid',
          dataType: 'currency',
          isRequired: false,
          sourceForm: 'user_financials',
          calculationMethod: 'monthly'
        },
        documentMappings: [
          {
            documentTypeId: 'arbeitslosengeldbescheid',
            documentTitle: 'Arbeitslosengeldbescheid',
            documentCategory: 'Applicant',
            extractionPaths: ['arbeitslosengeld', 'unemployment_benefit', 'alg'],
            confidence: 'high',
            isRequired: false,
            supportsMultiple: false
          }
        ],
        priority: 2
      },

      // Maintenance Income Mappings
      {
        valueField: {
          id: 'incomeunterhalttaxfree',
          label: 'Steuerfreie Unterhaltsleistungen',
          description: 'Steuerfreier Unterhalt aus Nachweis',
          dataType: 'currency',
          isRequired: false,
          sourceForm: 'user_financials',
          calculationMethod: 'monthly'
        },
        documentMappings: [
          {
            documentTypeId: 'unterhaltsleistungen_nachweis',
            documentTitle: 'Nachweis Unterhaltsleistungen',
            documentCategory: 'Applicant',
            extractionPaths: ['unterhalt_steuerfrei', 'tax_free_maintenance', 'unterhaltsleistung'],
            confidence: 'high',
            isRequired: false,
            supportsMultiple: true
          }
        ],
        priority: 2
      },
      {
        valueField: {
          id: 'incomeunterhalttaxable_net',
          label: 'Steuerpflichtige Unterhaltsleistungen (netto)',
          description: 'Steuerpflichtiger Unterhalt aus Nachweis',
          dataType: 'currency',
          isRequired: false,
          sourceForm: 'user_financials',
          calculationMethod: 'monthly'
        },
        documentMappings: [
          {
            documentTypeId: 'unterhaltsleistungen_nachweis',
            documentTitle: 'Nachweis Unterhaltsleistungen',
            documentCategory: 'Applicant',
            extractionPaths: ['unterhalt_steuerpflichtig', 'taxable_maintenance', 'unterhalt_netto'],
            confidence: 'high',
            isRequired: false,
            supportsMultiple: true
          }
        ],
        priority: 2
      },

      // Child Benefit Mappings
      {
        valueField: {
          id: 'monthlykindergeldnetincome',
          label: 'Monatliches Kindergeld (netto)',
          description: 'Kindergeld aus Nachweis',
          dataType: 'currency',
          isRequired: false,
          sourceForm: 'user_financials',
          calculationMethod: 'monthly'
        },
        documentMappings: [
          {
            documentTypeId: 'kindergeld_nachweis',
            documentTitle: 'Kindergeld Nachweis',
            documentCategory: 'Applicant',
            extractionPaths: ['kindergeld', 'child_benefit', 'kindergeld_monatlich'],
            confidence: 'high',
            isRequired: false,
            supportsMultiple: true
          }
        ],
        priority: 2
      },

      // Care Benefit Mappings
      {
        valueField: {
          id: 'monthlypflegegeldnetincome',
          label: 'Monatliches Pflegegeld (netto)',
          description: 'Pflegegeld aus Nachweis',
          dataType: 'currency',
          isRequired: false,
          sourceForm: 'user_financials',
          calculationMethod: 'monthly'
        },
        documentMappings: [
          {
            documentTypeId: 'pflegegeld_nachweis',
            documentTitle: 'Pflegegeld Nachweis',
            documentCategory: 'Applicant',
            extractionPaths: ['pflegegeld', 'care_benefit', 'pflegegeld_monatlich'],
            confidence: 'high',
            isRequired: false,
            supportsMultiple: true
          }
        ],
        priority: 2
      },

      // Parental Benefit Mappings
      {
        valueField: {
          id: 'monthlyelterngeldnetincome',
          label: 'Monatliches Elterngeld (netto)',
          description: 'Elterngeld aus Nachweis',
          dataType: 'currency',
          isRequired: false,
          sourceForm: 'user_financials',
          calculationMethod: 'monthly'
        },
        documentMappings: [
          {
            documentTypeId: 'elterngeld_nachweis',
            documentTitle: 'Elterngeld Nachweis',
            documentCategory: 'Applicant',
            extractionPaths: ['elterngeld', 'parental_benefit', 'elterngeld_monatlich'],
            confidence: 'high',
            isRequired: false,
            supportsMultiple: true
          }
        ],
        priority: 2
      },

      // Other Income Mappings
      {
        valueField: {
          id: 'othermonthlynetincome',
          label: 'Sonstige monatliche Nettoeinkommen',
          description: 'Sonstige Einkommen aus Nachweisen',
          dataType: 'currency',
          isRequired: false,
          sourceForm: 'user_financials',
          calculationMethod: 'monthly',
          isArray: true
        },
        documentMappings: [
          {
            documentTypeId: 'sonstige_einkommen_nachweis',
            documentTitle: 'Nachweis sonstige Einkommen',
            documentCategory: 'Applicant',
            extractionPaths: ['sonstige_einkommen', 'other_income', 'additional_income'],
            confidence: 'medium',
            isRequired: false,
            supportsMultiple: true
          }
        ],
        priority: 3
      },

      // Capital Income Mappings
      {
        valueField: {
          id: 'capitalIncome',
          label: 'Kapitalerträge',
          description: 'Kapitalerträge aus Nachweisen',
          dataType: 'currency',
          isRequired: false,
          sourceForm: 'user_financials',
          calculationMethod: 'yearly'
        },
        documentMappings: [
          {
            documentTypeId: 'kapitalertraege_nachweis',
            documentTitle: 'Nachweis Kapitalerträge',
            documentCategory: 'Applicant',
            extractionPaths: ['kapitalertraege', 'capital_gains', 'zinsen', 'dividenden'],
            confidence: 'medium',
            isRequired: false,
            supportsMultiple: true
          }
        ],
        priority: 3
      },

      // Business/Self-Employment Income Mappings
      {
        valueField: {
          id: 'yearlybusinessnetincome',
          label: 'Jährliches Gewerbeeinkommen (netto)',
          description: 'Gewerbeeinkommen aus GuV/EÜR',
          dataType: 'currency',
          isRequired: false,
          sourceForm: 'user_financials',
          calculationMethod: 'yearly'
        },
        documentMappings: [
          {
            documentTypeId: 'guv_euer_nachweis',
            documentTitle: 'GuV/EÜR Nachweis',
            documentCategory: 'Applicant',
            extractionPaths: ['gewerbe_gewinn', 'business_profit', 'gewerbe_einkommen'],
            confidence: 'high',
            isRequired: false,
            supportsMultiple: true
          }
        ],
        priority: 2
      },
      {
        valueField: {
          id: 'yearlyselfemployednetincome',
          label: 'Jährliches selbstständiges Einkommen (netto)',
          description: 'Selbstständiges Einkommen aus GuV/EÜR',
          dataType: 'currency',
          isRequired: false,
          sourceForm: 'user_financials',
          calculationMethod: 'yearly'
        },
        documentMappings: [
          {
            documentTypeId: 'guv_euer_nachweis',
            documentTitle: 'GuV/EÜR Nachweis',
            documentCategory: 'Applicant',
            extractionPaths: ['selbststaendig_gewinn', 'self_employed_profit', 'freiberufler_gewinn'],
            confidence: 'high',
            isRequired: false,
            supportsMultiple: true
          }
        ],
        priority: 2
      },

      // Expense Mappings
      {
        valueField: {
          id: 'betragotherinsurancetaxexpenses',
          label: 'Sonstige Versicherungs- und Steuerausgaben',
          description: 'Versicherungs- und Steuerausgaben aus Nachweisen',
          dataType: 'currency',
          isRequired: false,
          sourceForm: 'user_financials',
          calculationMethod: 'monthly',
          isArray: true
        },
        documentMappings: [
          {
            documentTypeId: 'versicherung_steuer_nachweis',
            documentTitle: 'Nachweis Versicherungen und Steuern',
            documentCategory: 'Applicant',
            extractionPaths: ['versicherung', 'steuer', 'insurance', 'tax'],
            confidence: 'medium',
            isRequired: false,
            supportsMultiple: true
          }
        ],
        priority: 3
      },
      {
        valueField: {
          id: 'loans',
          label: 'Darlehen',
          description: 'Darlehensraten aus Nachweisen',
          dataType: 'currency',
          isRequired: false,
          sourceForm: 'user_financials',
          calculationMethod: 'monthly',
          isArray: true
        },
        documentMappings: [
          {
            documentTypeId: 'darlehen_nachweis',
            documentTitle: 'Nachweis Darlehen',
            documentCategory: 'Applicant',
            extractionPaths: ['darlehen', 'loan', 'kredit', 'credit'],
            confidence: 'high',
            isRequired: false,
            supportsMultiple: true
          }
        ],
        priority: 2
      },
      {
        valueField: {
          id: 'zwischenkredit',
          label: 'Zwischenkredit',
          description: 'Zwischenkreditraten aus Nachweisen',
          dataType: 'currency',
          isRequired: false,
          sourceForm: 'user_financials',
          calculationMethod: 'monthly',
          isArray: true
        },
        documentMappings: [
          {
            documentTypeId: 'zwischenkredit_nachweis',
            documentTitle: 'Nachweis Zwischenkredit',
            documentCategory: 'Applicant',
            extractionPaths: ['zwischenkredit', 'bridge_loan', 'interim_credit'],
            confidence: 'high',
            isRequired: false,
            supportsMultiple: true
          }
        ],
        priority: 2
      },
      {
        valueField: {
          id: 'unterhaltszahlungenTotal',
          label: 'Unterhaltszahlungen',
          description: 'Unterhaltszahlungen aus Nachweisen',
          dataType: 'currency',
          isRequired: false,
          sourceForm: 'user_financials',
          calculationMethod: 'monthly',
          isArray: true
        },
        documentMappings: [
          {
            documentTypeId: 'unterhaltszahlungen_nachweis',
            documentTitle: 'Nachweis Unterhaltszahlungen',
            documentCategory: 'Applicant',
            extractionPaths: ['unterhaltszahlung', 'maintenance_payment', 'alimony'],
            confidence: 'high',
            isRequired: false,
            supportsMultiple: true
          }
        ],
        priority: 2
      },
      {
        valueField: {
          id: 'otherzahlungsverpflichtung',
          label: 'Sonstige Zahlungsverpflichtungen',
          description: 'Sonstige Zahlungsverpflichtungen aus Nachweisen',
          dataType: 'currency',
          isRequired: false,
          sourceForm: 'user_financials',
          calculationMethod: 'monthly',
          isArray: true
        },
        documentMappings: [
          {
            documentTypeId: 'zahlungsverpflichtungen_nachweis',
            documentTitle: 'Nachweis Zahlungsverpflichtungen',
            documentCategory: 'Applicant',
            extractionPaths: ['zahlungsverpflichtung', 'payment_obligation', 'verpflichtung'],
            confidence: 'medium',
            isRequired: false,
            supportsMultiple: true
          }
        ],
        priority: 3
      },
      {
        valueField: {
          id: 'sparratebausparvertraege',
          label: 'Bausparvertrag Sparrate',
          description: 'Bausparvertrag Sparrate aus Nachweis',
          dataType: 'currency',
          isRequired: false,
          sourceForm: 'user_financials',
          calculationMethod: 'monthly'
        },
        documentMappings: [
          {
            documentTypeId: 'bausparvertrag_nachweis',
            documentTitle: 'Nachweis Bausparvertrag',
            documentCategory: 'Applicant',
            extractionPaths: ['bausparvertrag', 'building_society', 'sparrate'],
            confidence: 'high',
            isRequired: false,
            supportsMultiple: true
          }
        ],
        priority: 2
      },
      {
        valueField: {
          id: 'praemiekapitalrentenversicherung',
          label: 'Kapitalrentenversicherung Prämie',
          description: 'Kapitalrentenversicherung Prämie aus Nachweis',
          dataType: 'currency',
          isRequired: false,
          sourceForm: 'user_financials',
          calculationMethod: 'monthly'
        },
        documentMappings: [
          {
            documentTypeId: 'rentenversicherung_nachweis',
            documentTitle: 'Nachweis Rentenversicherung',
            documentCategory: 'Applicant',
            extractionPaths: ['rentenversicherung', 'pension_insurance', 'praemie'],
            confidence: 'high',
            isRequired: false,
            supportsMultiple: true
          }
        ],
        priority: 2
      }
    ];
  }

  /**
   * Determine which values are required based on form data for each person
   */
  private determineRequiredValuesPerPerson(
    userData: any,
    financialData: any,
    additionalApplicants: any[],
    householdMembers: any[],
    valueDocumentMappings: ValueDocumentMapping[]
  ): RequiredValue[] {
    const requiredValues: RequiredValue[] = [];

    // Process main applicant (Hauptantragsteller)
    const mainApplicantValues = this.processPersonValues(
      userData,
      financialData,
      'hauptantragsteller',
      'Hauptantragsteller',
      valueDocumentMappings
    );
    requiredValues.push(...mainApplicantValues);

    // Process additional applicants
    for (const applicant of additionalApplicants) {
      if (applicant.hasIncome || applicant.hasFinancialData) {
        const applicantValues = this.processPersonValues(
          applicant,
          applicant.financialData || {},
          'additional_applicant',
          this.getPersonName(applicant),
          valueDocumentMappings,
          applicant.uuid
        );
        requiredValues.push(...applicantValues);
      }
    }

    // Process household members with income
    for (const member of householdMembers) {
      if (member.hasIncome || member.hasFinancialData) {
        const memberValues = this.processPersonValues(
          member,
          member.financialData || {},
          'household_member',
          this.getPersonName(member),
          valueDocumentMappings,
          member.uuid
        );
        requiredValues.push(...memberValues);
      }
    }

    return requiredValues;
  }

  /**
   * Process values for a specific person
   */
  private processPersonValues(
    personData: any,
    personFinancialData: any,
    personType: 'hauptantragsteller' | 'additional_applicant' | 'household_member',
    personName: string,
    valueDocumentMappings: ValueDocumentMapping[],
    personUuid?: string
  ): RequiredValue[] {
    const personValues: RequiredValue[] = [];

    for (const mapping of valueDocumentMappings) {
      const { valueField } = mapping;
      const isPresent = this.checkValuePresentForPerson(valueField, personFinancialData);
      const currentValue = this.getCurrentValueForPerson(valueField, personFinancialData);
      const needsExtraction = !isPresent && valueField.isRequired;

      personValues.push({
        valueField,
        isPresent,
        currentValue,
        needsExtraction,
        priority: mapping.priority,
        personId: personUuid || personData.id || 'main',
        personName,
        personType,
        personUuid
      });
    }

    return personValues;
  }

  /**
   * Get person name from person data
   */
  private getPersonName(personData: any): string {
    if (personData.firstName && personData.lastName) {
      return `${personData.firstName} ${personData.lastName}`;
    }
    if (personData.firstname && personData.lastname) {
      return `${personData.firstname} ${personData.lastname}`;
    }
    if (personData.name) {
      return personData.name;
    }
    return 'Unbekannte Person';
  }

  /**
   * Check if a value is present in the person's financial data
   */
  private checkValuePresentForPerson(valueField: ValueField, personFinancialData: any): boolean {
    if (!personFinancialData) return false;

    const value = this.getNestedValue(personFinancialData, valueField.id);
    return value !== null && value !== undefined && value !== '';
  }

  /**
   * Get current value from person's financial data
   */
  private getCurrentValueForPerson(valueField: ValueField, personFinancialData: any): any {
    if (!personFinancialData) return null;

    const value = this.getNestedValue(personFinancialData, valueField.id);
    return value !== null && value !== undefined && value !== '' ? value : null;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  /**
   * Map required values to documents that need to be scanned
   */
  private mapValuesToDocuments(
    requiredValues: RequiredValue[],
    valueDocumentMappings: ValueDocumentMapping[]
  ): DocumentToScan[] {
    const documentsToScan: DocumentToScan[] = [];
    const documentMap = new Map<string, DocumentToScan>();

    for (const requiredValue of requiredValues) {
      if (!requiredValue.needsExtraction) continue;

      const mapping = valueDocumentMappings.find(m => m.valueField.id === requiredValue.valueField.id);
      if (!mapping) continue;

      for (const docMapping of mapping.documentMappings) {
        // Create document entry for this specific person
        const key = `${docMapping.documentTypeId}_${requiredValue.personType}_${requiredValue.personUuid || requiredValue.personId}`;
        
        if (!documentMap.has(key)) {
          const documentToScan: DocumentToScan = {
            documentTypeId: docMapping.documentTypeId,
            documentTitle: docMapping.documentTitle,
            documentCategory: docMapping.documentCategory,
            applicantType: this.mapPersonTypeToApplicantType(requiredValue.personType),
            applicantUuid: requiredValue.personUuid,
            applicantNumber: this.getApplicantNumber(requiredValue),
            extractionPaths: [...docMapping.extractionPaths],
            confidence: docMapping.confidence,
            isRequired: docMapping.isRequired,
            supportsMultiple: docMapping.supportsMultiple,
            priority: mapping.priority
          };
          
          documentMap.set(key, documentToScan);
        } else {
          // Merge extraction paths if document already exists
          const existing = documentMap.get(key)!;
            existing.extractionPaths = Array.from(new Set([...existing.extractionPaths, ...docMapping.extractionPaths]));
          existing.priority = Math.min(existing.priority, mapping.priority);
        }
      }
    }

    return Array.from(documentMap.values()).sort((a, b) => a.priority - b.priority);
  }

  /**
   * Map person type to applicant type for document scanning
   */
  private mapPersonTypeToApplicantType(personType: 'hauptantragsteller' | 'additional_applicant' | 'household_member'): 'general' | 'hauptantragsteller' | 'applicant' {
    switch (personType) {
      case 'hauptantragsteller':
        return 'hauptantragsteller';
      case 'additional_applicant':
        return 'applicant';
      case 'household_member':
        return 'applicant';
      default:
        return 'general';
    }
  }

  /**
   * Get applicant number for document scanning
   */
  private getApplicantNumber(requiredValue: RequiredValue): number | undefined {
    // This would typically be derived from the person's position in the household
    // For now, return undefined for main applicant, 1+ for others
    if (requiredValue.personType === 'hauptantragsteller') {
      return undefined;
    }
    // In a real implementation, you'd determine this from the person's order
    return 1;
  }


  /**
   * Get document status for a specific application
   */
  async getDocumentStatus(): Promise<any> {
    const { data } = await supabase
      .from('applications')
      .select('user_data')
      .eq('id', this.applicationId)
      .single();

    return data?.user_data?.document_status || {};
  }

  /**
   * Check if a document type is uploaded for an applicant
   */
  async isDocumentUploaded(documentTypeId: string, applicantType: string, applicantUuid?: string): Promise<boolean> {
    const documentStatus = await this.getDocumentStatus();
    const applicantKey = applicantType === 'general' ? 'general' : 
                        applicantType === 'hauptantragsteller' ? 'hauptantragsteller' : 
                        applicantUuid || 'unknown';
    
    const applicantDocs = documentStatus[applicantKey];
    if (!applicantDocs) return false;
    
    const documentFiles = applicantDocs[documentTypeId];
    return documentFiles && Array.isArray(documentFiles) && documentFiles.length > 0;
  }
}
