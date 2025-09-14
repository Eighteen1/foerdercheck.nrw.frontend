import { supabase } from '../lib/supabase';
import {
  createValidationSection,
  createEnhancedValidationSection,
  validateRequiredField,
  validateEmailField,
  validatePostalCodeField,
  validateDateField,
  validateCurrencyField,
  validateAreaField,
  isValidEmail,
  isValidPostalCode,
  isValidDate,
  isValidFutureDate,
  isValidEmploymentStartDate,
  isValidContractEndDate,
  isValidAreaValue,
  parseGermanNumber,
  formatCurrency,
  formatCurrencyFromEuros,
  getNumericValue,
  ValidationSection,
  NavigationButton
} from '../utils/validationHelpers';
import { getPostcodeValidation } from '../utils/postcodeValidation';

export class ValidationService {
  private residentId: string;

  constructor(residentId: string) {
    this.residentId = residentId;
  }

  async performComprehensiveValidation(): Promise<ValidationSection[]> {
    try {
      // Fetch all form data
      const [
        hauptantragData,
        einkommenserklarungData,
        selbstauskunftData,
        selbsthilfeData,
        din277Data,
        wofivData,
        documentsData
      ] = await Promise.all([
        this.fetchHauptantragData(),
        this.fetchEinkommenserklarungData(),
        this.fetchSelbstauskunftData(),
        this.fetchSelbsthilfeData(),
        this.fetchDin277Data(),
        this.fetchWofivData(),
        this.fetchDocumentsData()
      ]);

      // Perform validation for each section
      const hauptantragSections = this.validateHauptantrag(hauptantragData);
      const einkommenserklarungSections = this.validateEinkommenserklarung(einkommenserklarungData);
      const selbstauskunftSections = this.validateSelbstauskunft(selbstauskunftData);
      const selbsthilfeSections = this.validateSelbsthilfe(selbsthilfeData);
      const documentsSections = await this.validateDocuments(documentsData);
      
      const financialRequirementsSections = await this.validateFinancialRequirements(hauptantragData, einkommenserklarungData, selbstauskunftData);
      
      const sections: ValidationSection[] = [
        ...financialRequirementsSections,
        this.validateCrossChecks(hauptantragData, einkommenserklarungData, selbsthilfeData),
        ...documentsSections,
        ...hauptantragSections,
        ...einkommenserklarungSections,
        ...selbstauskunftSections,
        ...selbsthilfeSections,
        this.validateDin277(din277Data),
        this.validateWofiv(wofivData),
      ];

      return sections;
    } catch (error) {
      console.error('Validation error:', error);
      throw error;
    }
  }

  /**
   * Public method to calculate only the household income section
   * This method can be called from the checklistGenerator to get household income calculations
   * without running the full comprehensive validation
   */
  async calculateHouseholdIncomeForChecklist(): Promise<ValidationSection> {
    try {
      // Fetch only the required data for household income calculation
      const [hauptantragData, einkommenserklarungData] = await Promise.all([
        this.fetchHauptantragData(),
        this.fetchEinkommenserklarungData()
      ]);

      // Check if we have required data
      if (!hauptantragData || !einkommenserklarungData) {
        return createValidationSection('financial-household-income', 'Berechnung des Haushalts-Einkommen', ['Erforderliche Daten für die Haushaltseinkommens-Berechnung sind nicht verfügbar'], []);
      }

      // Call the existing private calculateHouseholdIncome method
      return await this.calculateHouseholdIncome(hauptantragData, einkommenserklarungData);
    } catch (error) {
      console.error('Household income calculation error:', error);
      return createValidationSection('financial-household-income', 'Berechnung des Haushalts-Einkommen', [`Fehler bei der Haushaltseinkommens-Berechnung: ${error}`], []);
    }
  }

  /**
   * Public method to determine income group for checklist generation
   */
  async determineIncomeGroupForChecklist(): Promise<ValidationSection> {
    try {
      // Fetch only the required data for income group determination
      const [hauptantragData, einkommenserklarungData] = await Promise.all([
        this.fetchHauptantragData(),
        this.fetchEinkommenserklarungData()
      ]);

      // Check if we have required data
      if (!hauptantragData || !einkommenserklarungData) {
        return createValidationSection('financial-income-group', 'Bestimmung der Einkommensgruppe', ['Erforderliche Daten für die Einkommensgruppen-Bestimmung sind nicht verfügbar'], []);
      }

      // First calculate household income to get the required results
      const householdIncomeSection = await this.calculateHouseholdIncome(hauptantragData, einkommenserklarungData);
      
      // Check if household income calculation was successful
      if (householdIncomeSection.errors && householdIncomeSection.errors.length > 0) {
        return createValidationSection('financial-income-group', 'Bestimmung der Einkommensgruppe', ['Haushaltseinkommen konnte nicht berechnet werden. Einkommensgruppen-Bestimmung nicht möglich.'], []);
      }

      // Call the existing private determineIncomeGroup method
      const incomeGroupSection = await this.determineIncomeGroup(hauptantragData, einkommenserklarungData, householdIncomeSection);
      
      // Add the positive eligibility message to calculations if available
      if ((this as any).eligibilityResult && (this as any).eligibilityResult.eligible) {
        const positiveMessage = (this as any).eligibilityResult.reason;
        const group = (this as any).eligibilityResult.group;
        if (positiveMessage) {
          // Ensure calculations array exists
          if (!incomeGroupSection.calculations) {
            incomeGroupSection.calculations = [];
          }
          // Add the positive message if it's not already there
          if (!incomeGroupSection.calculations.includes(positiveMessage)) {
            incomeGroupSection.calculations.push(positiveMessage);
          }
          // Also add the specific group information
          if (group && group !== 'Nicht Förderungsfähig') {
            const groupInfo = `Einkommensgruppe: ${group}`;
            if (!incomeGroupSection.calculations.includes(groupInfo)) {
              incomeGroupSection.calculations.push(groupInfo);
            }
          }
        }
      }
      
      return incomeGroupSection;
    } catch (error) {
      console.error('Income group determination error:', error);
      return createValidationSection('financial-income-group', 'Bestimmung der Einkommensgruppe', [`Fehler bei der Einkommensgruppen-Bestimmung: ${error}`], []);
    }
  }

  /**
   * Public method to calculate available monthly income for checklist generation
   */
  async calculateAvailableMonthlyIncomeForChecklist(): Promise<ValidationSection> {
    try {
      // Fetch only the required data for available monthly income calculation
      const selbstauskunftData = await this.fetchSelbstauskunftData();

      // Check if we have required data
      if (!selbstauskunftData) {
        return createValidationSection('financial-available-income', 'Verfügbares Monatseinkommen', ['Erforderliche Daten für die Berechnung des verfügbaren Monatseinkommens sind nicht verfügbar'], []);
      }

      // Call the existing private calculateAvailableMonthlyIncome method
      return await this.calculateAvailableMonthlyIncome(selbstauskunftData);
    } catch (error) {
      console.error('Available monthly income calculation error:', error);
      return createValidationSection('financial-available-income', 'Verfügbares Monatseinkommen', [`Fehler bei der Berechnung des verfügbaren Monatseinkommens: ${error}`], []);
    }
  }

  /**
   * Public method to validate additional financial criteria for checklist generation
   */
  async validateAdditionalFinancialCriteriaForChecklist(): Promise<ValidationSection> {
    try {
      // Fetch only the required data for additional financial criteria validation
      const [hauptantragData, einkommenserklarungData] = await Promise.all([
        this.fetchHauptantragData(),
        this.fetchEinkommenserklarungData()
      ]);

      // Check if we have required data
      if (!hauptantragData || !einkommenserklarungData) {
        return createValidationSection('financial-additional', 'Einhaltung der Darlehensgrenze', ['Erforderliche Daten für die Validierung der Darlehensgrenze sind nicht verfügbar'], []);
      }

      // Check if income group determination has been completed and eligibility results are available
      if (!(this as any).eligibilityResult) {
        return createValidationSection('financial-additional', 'Einhaltung der Darlehensgrenze', ['Einkommensgruppen-Bestimmung muss zuerst durchgeführt werden. Führen Sie zuerst die Prüfung im persönlichen Bereich aus.'], []);
      }

      // Call the existing private validateAdditionalFinancialCriteria method
      return this.validateAdditionalFinancialCriteria(hauptantragData, einkommenserklarungData);
    } catch (error) {
      console.error('Additional financial criteria validation error:', error);
      return createValidationSection('financial-additional', 'Einhaltung der Darlehensgrenze', [`Fehler bei der Validierung der Darlehensgrenze: ${error}`], []);
    }
  }

  /**
   * Public method to validate cross-checks for checklist generation
   */
  async validateCrossChecksForChecklist(): Promise<ValidationSection> {
    try {
      // Fetch only the required data for cross-checks validation
      const [hauptantragData, einkommenserklarungData, selbsthilfeData] = await Promise.all([
        this.fetchHauptantragData(),
        this.fetchEinkommenserklarungData(),
        this.fetchSelbsthilfeData()
      ]);

      // Check if we have required data
      if (!hauptantragData || !einkommenserklarungData) {
        return createValidationSection('cross-checks', 'Übergreifende Prüfungen', ['Erforderliche Daten für die übergreifenden Prüfungen sind nicht verfügbar'], []);
      }

      // Call the existing private validateCrossChecks method
      return this.validateCrossChecks(hauptantragData, einkommenserklarungData, selbsthilfeData);
    } catch (error) {
      console.error('Cross-checks validation error:', error);
      return createValidationSection('cross-checks', 'Übergreifende Prüfungen', [`Fehler bei den übergreifenden Prüfungen: ${error}`], []);
    }
  }

  // Data fetching methods
  private async fetchHauptantragData() {
    try {
      // Load user data
      const { data: userData, error: userError } = await supabase
        .from('user_data')
        .select('*')
        .eq('id', this.residentId)
        .single();

      if (userError) throw userError;

      // Load object data
      const { data: objectData, error: objectError } = await supabase
        .from('object_data')
        .select('*')
        .eq('user_id', this.residentId)
        .single();

      // Don't throw error if object data doesn't exist yet
      if (objectError && objectError.code !== 'PGRST116') throw objectError;

      // Load cost data
      const { data: costData, error: costError } = await supabase
        .from('cost_structure')
        .select('*')
        .eq('user_id', this.residentId)
        .single();

      // Don't throw error if cost data doesn't exist yet
      if (costError && costError.code !== 'PGRST116') throw costError;

      // Load finance data
      const { data: financeData, error: financeError } = await supabase
        .from('finance_structure')
        .select('*')
        .eq('user_id', this.residentId)
        .single();

      // Don't throw error if finance data doesn't exist yet
      if (financeError && financeError.code !== 'PGRST116') throw financeError;

      // Load user financials for steuerid
      const { data: userFinancials, error: userFinancialsError } = await supabase
        .from('user_financials')
        .select('*')
        .eq('user_id', this.residentId)
        .single();

      // Don't throw error if user financials doesn't exist yet
      if (userFinancialsError && userFinancialsError.code !== 'PGRST116') throw userFinancialsError;

          return {
      userData: userData || {},
      objectData: objectData || {},
      costData: costData || {},
      financeData: financeData || {},
      userFinancials: userFinancials || {}
    };
    } catch (error) {
      console.error('Error fetching Hauptantrag data:', error);
      return null;
    }
  }

  private async fetchEinkommenserklarungData() {
    try {
      // Load user data
      const { data: userData, error: userError } = await supabase
        .from('user_data')
        .select('*')
        .eq('id', this.residentId)
        .single();

      if (userError) throw userError;

      // Load financial data
      const { data: financialData, error: financialError } = await supabase
        .from('user_financials')
        .select('*')
        .eq('user_id', this.residentId)
        .single();

      if (financialError) throw financialError;

      return {
        userData,
        financialData
      };
    } catch (error) {
      console.error('Error fetching Einkommenserklärung data:', error);
      return null;
    }
  }

  private async fetchSelbstauskunftData() {
    try {
      // Load user data
      const { data: userData, error: userError } = await supabase
        .from('user_data')
        .select('*')
        .eq('id', this.residentId)
        .single();

      if (userError) throw userError;

      // Load financial data
      const { data: financialData, error: financialError } = await supabase
        .from('user_financials')
        .select('*')
        .eq('user_id', this.residentId)
        .single();

      if (financialError) throw financialError;

      return {
        userData,
        financialData
      };
    } catch (error) {
      console.error('Error fetching Selbstauskunft data:', error);
      return null;
    }
  }

  private async fetchSelbsthilfeData() {
    try {
      // Load user data
      const { data: userData, error: userError } = await supabase
        .from('user_data')
        .select('should_show_error_selbsthilfe, firstname, lastname, person_street, person_housenumber, person_postalcode, person_city, email, employment_title')
        .eq('id', this.residentId)
        .single();

      if (userError) throw userError;

      // Load object data for form content and object address
      const { data: objectData, error: objectError } = await supabase
        .from('object_data')
        .select('selbsthilfe_angaben, selbsthilfe_helfer, obj_street, obj_house_number, obj_postal_code, obj_city')
        .eq('user_id', this.residentId)
        .single();

      if (objectError) throw objectError;

      // Load finance data to get selbsthilfe amount from Hauptantrag
      const { data: financeData, error: financeError } = await supabase
        .from('finance_structure')
        .select('selbsthilfe')
        .eq('user_id', this.residentId)
        .single();

      if (financeError) throw financeError;

      return {
        userData,
        objectData,
        financeData,
        totals: objectData?.selbsthilfe_angaben?.totals || {}
      };
    } catch (error) {
      console.error('Error fetching Selbsthilfe data:', error);
      return null;
    }
  }

  private async fetchDin277Data() {
    try {
      // Load object data for DIN 277 calculations
      const { data: objectData, error: objectError } = await supabase
        .from('object_data')
        .select('berechnung_din277')
        .eq('user_id', this.residentId)
        .single();

      if (objectError) throw objectError;

      return {
        objectData
      };
    } catch (error) {
      console.error('Error fetching DIN 277 data:', error);
      return null;
    }
  }

  private async fetchWofivData() {
    try {
      // Load object data for WoFIV calculations
      const { data: objectData, error: objectError } = await supabase
        .from('object_data')
        .select('berechnung_woFIV')
        .eq('user_id', this.residentId)
        .single();

      if (objectError) throw objectError;

      return {
        objectData
      };
    } catch (error) {
      console.error('Error fetching WoFIV data:', error);
      return null;
    }
  }

  private async fetchDocumentsData() {
    try {
      // Load documents data
      const { data: documentsData, error: documentsError } = await supabase
        .from('user_data')
        .select('*')
        .eq('id', this.residentId);

      if (documentsError) throw documentsError;

      return documentsData || [];
    } catch (error) {
      console.error('Error fetching documents data:', error);
      return [];
    }
  }

  // Validation methods for each form
  private validateHauptantrag(data: any): ValidationSection[] {
    const sections: ValidationSection[] = [];
    
    if (!data) {
      sections.push(createValidationSection('hauptantrag', 'Hauptantrag', ['Hauptantrag-Daten nicht gefunden'], []));
      return sections;
    }

    const { userData, objectData, costData, financeData, userFinancials } = data;

    // Helper function to validate currency fields from database
    const validateCurrencyField = (value: any, fieldName: string, errors: string[]): void => {
      if (value === null || value === undefined || value === '') {
        errors.push(`${fieldName} ist erforderlich`);
      }
    };

    // Helper function to validate required fields
    const validateRequiredField = (value: any, fieldName: string, errors: string[]): void => {
      if (value === null || value === undefined || value === '') {
        errors.push(`${fieldName} ist erforderlich`);
      }
    };

    // Helper function to validate numeric fields
    const validateNumericField = (value: any, fieldName: string, errors: string[], minValue: number = 0): void => {
      if (value === null || value === undefined || value === '') {
        errors.push(`${fieldName} ist erforderlich`);
      } else {
        const numValue = parseInt(value);
        if (isNaN(numValue) || numValue < minValue) {
          errors.push(`${fieldName} muss ein gültiger Wert sein`);
        }
      }
    };

    // Helper function to validate email
    const validateEmail = (email: string, fieldName: string, errors: string[]): void => {
      if (!email) {
        errors.push(`${fieldName} ist erforderlich`);
      } else if (!isValidEmail(email)) {
        errors.push(`${fieldName} ist ungültig`);
      }
    };

    // Helper function to validate postal code
    const validatePostalCode = (postalCode: string, fieldName: string, errors: string[]): void => {
      if (!postalCode) {
        errors.push(`${fieldName} ist erforderlich`);
      } else if (!/^\d{5}$/.test(postalCode)) {
        errors.push(`${fieldName} muss aus genau 5 Ziffern bestehen`);
      }
    };

    // Helper function to validate birth date
    const validateBirthDate = (birthDate: string, fieldName: string, errors: string[]): void => {
      if (!birthDate) {
        errors.push(`${fieldName} ist erforderlich`);
      } else {
        const date = new Date(birthDate);
        const now = new Date();
        const minDate = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate());
        const maxDate = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate());
        
        if (date < minDate || date > maxDate) {
          errors.push(`${fieldName} liegt außerhalb des gültigen Bereichs (Antragsteller muss mindestens 18 Jahre alt und nicht älter als 120 Jahre sein)`);
        }
      }
    };

    // Helper function to validate area values
    const validateAreaField = (value: any, fieldName: string, errors: string[]): void => {
      if (value === null || value === undefined || value === '') {
        errors.push(`${fieldName} ist erforderlich`);
      } else if (!isValidAreaValue(value)) {
        errors.push(`${fieldName} muss ein gültiger Flächenwert sein`);
      }
    };

    // Helper function to get numeric value from currency string
    const getNumericValue = (value: any): number => {
      if (value === null || value === undefined || value === '') return 0;
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        return Number(value.replace(/[^0-9]/g, '')) || 0;
      }
      return 0;
    };

    // Helper function to format currency for display
    const formatCurrency = (value: number): string => {
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2
      }).format(value / 100);
    };

    // Helper function to get postcode validation data
    const getPostcodeValidationData = (postcode: string) => {
      const validation = getPostcodeValidation(postcode);
      return {
        maxLimit: validation.limits.maxLimit
      };
    };

    // Step 1 validation - Personal information
    const step1Errors: string[] = [];
    const step1Warnings: string[] = [];
    
    if (userData) {
      // Main applicant validation
      validateRequiredField(userData.title, 'Hauptantragsteller: Titel', step1Errors);
      validateRequiredField(userData.firstname, 'Hauptantragsteller: Vorname', step1Errors);
      validateRequiredField(userData.lastname, 'Hauptantragsteller: Name', step1Errors);
      validateBirthDate(userData.birthDate, 'Hauptantragsteller: Geburtsdatum', step1Errors);
      validateRequiredField(userData.nationality, 'Hauptantragsteller: Staatsangehörigkeit', step1Errors);
      validateRequiredField(userFinancials?.steuerid, 'Hauptantragsteller: Steuer-ID', step1Errors);
      validateRequiredField(userData.person_street, 'Hauptantragsteller: Straße', step1Errors);
      validateRequiredField(userData.person_housenumber, 'Hauptantragsteller: Hausnummer', step1Errors);
      validatePostalCode(userData.person_postalcode, 'Hauptantragsteller: Postleitzahl', step1Errors);
      validateRequiredField(userData.person_city, 'Hauptantragsteller: Ort', step1Errors);
      validateRequiredField(userData.phone, 'Hauptantragsteller: Telefonnummer', step1Errors);
      validateEmail(userData.email, 'Hauptantragsteller: E-Mail', step1Errors);
      validateRequiredField(userData.employment, 'Hauptantragsteller: Beschäftigungsart', step1Errors);
      
      // Additional applicants validation
      if (userData.weitere_antragstellende_personen) {
        Object.entries(userData.weitere_antragstellende_personen).forEach(([uuid, person]: [string, any], index: number) => {
          if (person.isApplicant) {
            const personFinancials = userFinancials?.additional_applicants_financials?.[uuid] || {};
            validateRequiredField(person.title, `Zusätzlicher Antragsteller ${index + 1}: Titel`, step1Errors);
            validateRequiredField(person.firstName, `Zusätzlicher Antragsteller ${index + 1}: Vorname`, step1Errors);
            validateRequiredField(person.lastName, `Zusätzlicher Antragsteller ${index + 1}: Name`, step1Errors);
            validateBirthDate(person.birthDate, `Zusätzlicher Antragsteller ${index + 1}: Geburtsdatum`, step1Errors);
            validateRequiredField(person.nationality, `Zusätzlicher Antragsteller ${index + 1}: Staatsangehörigkeit`, step1Errors);
            validateRequiredField(personFinancials.steuerid, `Zusätzlicher Antragsteller ${index + 1}: Steuer-ID`, step1Errors);
            validateRequiredField(person.street, `Zusätzlicher Antragsteller ${index + 1}: Straße`, step1Errors);
            validateRequiredField(person.houseNumber, `Zusätzlicher Antragsteller ${index + 1}: Hausnummer`, step1Errors);
            validatePostalCode(person.postalCode, `Zusätzlicher Antragsteller ${index + 1}: Postleitzahl`, step1Errors);
            validateRequiredField(person.city, `Zusätzlicher Antragsteller ${index + 1}: Ort`, step1Errors);
            validateRequiredField(person.phone, `Zusätzlicher Antragsteller ${index + 1}: Telefonnummer`, step1Errors);
            validateEmail(person.email, `Zusätzlicher Antragsteller ${index + 1}: E-Mail`, step1Errors);
            validateRequiredField(person.employment?.type, `Zusätzlicher Antragsteller ${index + 1}: Beschäftigungsart`, step1Errors);
          }
        });
      }

      // Representative validation
      if (userData.hasauthorizedperson === null) {
        step1Errors.push('Bitte geben Sie an, ob Sie einen Bevollmächtigten angeben wollen');
      } else if (userData.hasauthorizedperson === true) {
        if (userData.iscompany === null) {
          step1Errors.push('Bitte geben Sie an, ob es sich um eine Firma handelt');
        } else if (userData.iscompany === true) {
          // Representative Company Info
          validateRequiredField(userData.bevollmaechtigte?.companyName, 'Name der Bevollmächtigten Firma', step1Errors);
          validateRequiredField(userData.bevollmaechtigte?.postboxCity, 'Ort des Postfachs der Bevollmächtigten Firma', step1Errors);
          validateRequiredField(userData.bevollmaechtigte?.postboxPostcode, 'Postleitzahl des Postfachs der Bevollmächtigten Firma', step1Errors);
        } else if (userData.iscompany === false) {
          // Representative Personal Info
          validateRequiredField(userData.bevollmaechtigte?.title, 'Titel des Bevollmächtigten', step1Errors);
          validateRequiredField(userData.bevollmaechtigte?.firstName, 'Vorname des Bevollmächtigten', step1Errors);
          validateRequiredField(userData.bevollmaechtigte?.lastName, 'Nachname des Bevollmächtigten', step1Errors);
          validateRequiredField(userData.bevollmaechtigte?.street, 'Straße des Bevollmächtigten', step1Errors);
          validateRequiredField(userData.bevollmaechtigte?.houseNumber, 'Hausnummer des Bevollmächtigten', step1Errors);
          validatePostalCode(userData.bevollmaechtigte?.postalCode, 'Postleitzahl des Bevollmächtigten', step1Errors);
          validateRequiredField(userData.bevollmaechtigte?.city, 'Stadt des Bevollmächtigten', step1Errors);
          validateRequiredField(userData.bevollmaechtigte?.phone, 'Telefonnummer des Bevollmächtigten', step1Errors);
          validateEmail(userData.bevollmaechtigte?.email, 'E-Mail des Bevollmächtigten', step1Errors);
        }
      }
    }
    
    sections.push(createValidationSection('hauptantrag-step1', 'Schritt 1: Persönliche Informationen', step1Errors, step1Warnings));

    // Step 2 validation - Household information
    const step2Errors: string[] = [];
    const step2Warnings: string[] = [];
    
    if (userData) {
      validateNumericField(userData.adult_count, 'Anzahl der Erwachsenen', step2Errors);
      if (userData.adult_count) {
        const adultCount = parseInt(userData.adult_count);
        if (adultCount === 0) step2Errors.push('Die Anzahl der Erwachsenen darf nicht 0 sein');
      }
      
      validateNumericField(userData.child_count, 'Anzahl der Kinder', step2Errors);
      
      // Check if any child age is greater than 17
      if (userData.childrenages) {
        const ages = userData.childrenages.split(',').map((age: string) => parseInt(age.trim()));
        if (ages.some((age: number) => age > 17)) {
          step2Errors.push('Volljährige Personen zählen als Erwachsene');
        }
      }
      
      if (userData.is_disabled === null) step2Errors.push('Bitte geben Sie an, ob behinderte Menschen in dem Haushalt leben');
      if (userData.is_disabled === true) {
        const totaladults = parseInt(userData.adult_count || '0');
        const totalkids = parseInt(userData.child_count || '0');
        const disabledadults = parseInt(userData.disabledadultscount || '0');
        const disabledkids = parseInt(userData.disabledchildrencount || '0');
        const totalDisabled = disabledadults + disabledkids;
        const totalHousehold = totaladults + totalkids;
        if (totalDisabled <= 0) {
          step2Errors.push('Bitte geben Sie die Anzahl der behinderten Menschen in ihrem Haushalt ein');
        }
        if (totalDisabled > totalHousehold) {
          step2Errors.push('Die Anzahl der behinderten Menschen kann nicht größer sein als die Gesamtanzahl der Haushaltsmitglieder');
        } else {
          if (disabledadults > totaladults) {
            step2Errors.push('Die Anzahl der behinderten Erwachsenen kann nicht größer sein als die Anzahl der Erwachsenen');
          }
          if (disabledkids > totalkids) {
            step2Errors.push('Die Anzahl der behinderten Kinder kann nicht größer sein als die Anzahl der Kinder');
          }
        }
      }
      
      // Check marriage status
      if (userData.is_married === null) {
        step2Errors.push('Bitte geben Sie an, ob Sie verheiratet sind oder in einer eingetragenen Lebenspartnerschaft leben');
      }
      
      // Check additional assets
      if (userData.hasadditionalassets === null) {
        step2Errors.push('Bitte geben Sie an, ob weiteres Vermögen vorhanden ist');
      }
      if (userData.hasadditionalassets === true && !userData.additionalassetsdetails) {
        step2Errors.push('Bitte beschreiben Sie das weitere Vermögen');
      }
      
      // Check double subsidy
      if (userData.hasdoublesubsidy === null) {
        step2Errors.push('Bitte geben Sie an, ob Sie bereits Eigentümer eines geförderten Eigenheims oder einer geförderten Eigentumswohnung sind/waren');
      }
      if (userData.hasdoublesubsidy === true) {
        if (userData.hasrepaidsubsidy === null) {
          step2Errors.push('Bitte geben Sie an, ob die Fördermittel bereits zurückgezahlt wurden');
        }
        if (!userData.subsidyamount) {
          step2Errors.push('Bitte geben Sie den Betrag der Fördermittel ein');
        } else {
          let amount: number;
          if (typeof userData.subsidyamount === 'number') {
            amount = userData.subsidyamount;
          } else if (typeof userData.subsidyamount === 'string') {
            amount = parseFloat(userData.subsidyamount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
          } else {
            amount = 0;
          }
          if (isNaN(amount) || amount <= 0) {
            step2Errors.push('Der Betrag der Fördermittel muss größer als 0,00 € sein');
          }
        }
        if (!userData.subsidyfilenumber) {
          step2Errors.push('Bitte geben Sie das Aktenzeichen ein');
        }
        if (!userData.subsidyauthority) {
          step2Errors.push('Bitte geben Sie die Bewilligungsbehörde ein');
        }
      }

      // Check supplementary loan
      if (userData.hassupplementaryloan === null) {
        step2Errors.push('Bitte geben Sie an, ob Sie ein Ergänzungsdarlehen der NRW.BANK beantragen');
      }
    }
    
    sections.push(createValidationSection('hauptantrag-step2', 'Schritt 2: Haushaltsinformationen', step2Errors, step2Warnings));

    // Step 3 validation - Object details
    const step3Errors: string[] = [];
    const step3Warnings: string[] = [];
    
    if (objectData && Object.keys(objectData).length > 0) {
      // Address validation
      validateRequiredField(objectData.obj_street, 'Straße', step3Errors);
      validateRequiredField(objectData.obj_house_number, 'Hausnummer', step3Errors);
      validatePostalCode(objectData.obj_postal_code, 'Postleitzahl', step3Errors);
      if (objectData.obj_postal_code) {
        const postalCode = objectData.obj_postal_code;
        const validStartNumbers = ['32', '33', '34', '37', '40', '41', '42', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '57', '58', '59'];
        
        if (!validStartNumbers.includes(postalCode.substring(0, 2))) {
          step3Errors.push('Die Postleitzahl muss sich in Nordrhein-Westfalen befinden');
        }
      }
      validateRequiredField(objectData.obj_city, 'Stadt', step3Errors);

      // FoerderVariante validation
      validateRequiredField(objectData.foerderVariante, 'Förderungsvariante', step3Errors);
      
      // Objektart validation
      if (objectData.foerderVariante && !objectData.foerderVariante.includes('wohnung')) {
        validateRequiredField(objectData.objektart, 'Objektart', step3Errors);
      }

      // ObjektDetailsAllgemein validation
      validateAreaField(objectData.wohnflaeche_selbstgenutzt, 'selbstgenutzte Wohnfläche', step3Errors);
      validateAreaField(objectData.gesamt_wohnflaeche, 'Wohnfläche der zweiten Wohneinheit', step3Errors);
      validateRequiredField(objectData.anzahl_zimmer, 'Anzahl der Zimmer', step3Errors);
      validateRequiredField(objectData.anzahl_garagen, 'Anzahl der Garagen', step3Errors);

      // Gewerbefläche validation
      if (objectData.has_gewerbeflaeche === null) {
        step3Errors.push('Bitte geben Sie an, ob eine Gewerbefläche vorhanden ist');
      }
      if (objectData.has_gewerbeflaeche === true) {
        validateAreaField(objectData.gewerbeflaeche, 'Größe der Gewerbefläche', step3Errors);
      }

      // Erträge validation
      if (objectData.has_ertraege === null) {
        step3Errors.push('Bitte geben Sie an, ob Erträge vorhanden sind');
      }
      if (objectData.has_ertraege === true) {
        if (!objectData.vermietete_wohnung && !objectData.vermietete_garage) {
          step3Errors.push('Bitte geben Sie mindestens einen Ertragswert ein (vermietete Wohnung oder Garage)');
        } else {
          // Check if both values are not null and sum is greater than 0
          const wohnungValue = objectData.vermietete_wohnung || '';
          const garageValue = objectData.vermietete_garage || '';
          
          if (wohnungValue || garageValue) {
            const parseCurrencyValue = (value: any): number => {
              if (!value) return 0;
              if (typeof value === 'number') return value;
              if (typeof value === 'string') {
                return parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
              }
              return 0;
            };
            
            const wohnungAmount = parseCurrencyValue(wohnungValue);
            const garageAmount = parseCurrencyValue(garageValue);
            const totalAmount = wohnungAmount + garageAmount;
            
            if (totalAmount <= 0) {
              step3Errors.push('Die Summe der Ertragswerte muss größer als 0,00 € sein');
            }
          }
        }
      }

      // Wood construction loan validation
      if (objectData.haswoodconstructionloan === null) {
        step3Errors.push('Bitte geben Sie an, ob Sie ein Zusatzdarlehen für Bauen mit Holz beantragen');
      }

      // Bergsenkungsgebiet validation - only for neubau, ersterwerb, or nutzungsänderung
      if (objectData.foerderVariante?.includes('neubau') || objectData.foerderVariante?.includes('ersterwerb') || objectData.foerderVariante === 'nutzungsaenderung') {
        if (objectData.bergsenkungsGebiet === null) {
          step3Errors.push('Bitte geben Sie an, ob sich das Objekt in einem Bergsenkungsgebiet befindet');
        }
      }

      // Eigentumswohnung validation
      if (objectData.foerderVariante?.includes('wohnung')) {
        validateRequiredField(objectData.anzahl_vollgeschosse, 'Anzahl der Vollgeschosse', step3Errors);
        validateRequiredField(objectData.wohnungen_am_hauseingang, 'Anzahl der Wohnungen am Hauseingang', step3Errors);
        validateRequiredField(objectData.lage_im_gebaeude, 'Lage im Gebäude', step3Errors);
        validateRequiredField(objectData.lage_im_geschoss, 'Lage im Geschoss', step3Errors);
      }

      // Neubau/Ersterwerb validation
      if (objectData.foerderVariante?.includes('neubau') || objectData.foerderVariante?.includes('ersterwerb')) {
        // Barrierefrei and BEG validation
        if (objectData.barrierefrei === null) {
          step3Errors.push('Bitte geben Sie an, ob das Objekt barrierefrei ist');
        }
        if (objectData.beg_effizienzhaus_40_standard === null) {
          step3Errors.push('Bitte geben Sie an, ob das Objekt dem BEG Effizienzhaus 40 Standard entspricht');
        }
        if (objectData.haslocationcostloan === null) {
          step3Errors.push('Bitte geben Sie an, ob Sie ein Zusatzdarlehen für standortbedingte Mehrkosten beantragen');
        }

        // Building permit validation
        if (objectData.baugenehmigung_erforderlich === null) {
          step3Errors.push('Bitte geben Sie an, ob eine Baugenehmigung erforderlich ist');
        }

        if (objectData.baugenehmigung_erforderlich === true) {
          if (objectData.baugenehmigung_wurde_erteilt === null) {
            step3Errors.push('Bitte geben Sie an, ob die Baugenehmigung erteilt wurde');
          }

          if (objectData.baugenehmigung_wurde_erteilt === true) {
            validateRequiredField(objectData.erteilungs_datum, 'Erteilungsdatum der Baugenehmigung', step3Errors);
            validateRequiredField(objectData.aktenzeichen, 'Aktenzeichen der Baugenehmigung', step3Errors);
            validateRequiredField(objectData.erteilungs_behoerde, 'erteilende Behörde der Baugenehmigung', step3Errors);
          }
        }

        // Building notice validation
        if (objectData.bauanzeige_wurde_eingereicht === null) {
          step3Errors.push('Bitte geben Sie an, ob eine Bauanzeige eingereicht wurde');
        }

        if (objectData.bauanzeige_wurde_eingereicht === true) {
          validateRequiredField(objectData.bauanzeige_einreichungs_datum, 'Einreichungsdatum der Bauanzeige', step3Errors);
        }

        // Construction work validation
        if (objectData.bauarbeiten_wurde_begonnen === null) {
          step3Errors.push('Bitte geben Sie an, ob die Bauarbeiten begonnen wurden');
        }

        if (objectData.bauarbeiten_wurde_begonnen === true) {
          validateRequiredField(objectData.bauarbeiten_beginn_datum, 'Datum des Baubeginns', step3Errors);
        }
      }

      // Bestandserwerb validation
      if (objectData.foerderVariante?.includes('bestandserwerb') && !objectData.bestandserwerb_baujahr) {
        step3Errors.push('Bitte geben Sie das Baujahr ein');
      }
    }
    
    sections.push(createValidationSection('hauptantrag-step3', 'Schritt 3: Objektdetails', step3Errors, step3Warnings));

    // Step 4 validation - Ownership
    const step4Errors: string[] = [];
    const step4Warnings: string[] = [];
    
    if (objectData && Object.keys(objectData).length > 0) {
      // Eigentumsverhältnisse validation
      if (objectData.eigentumsverhaeltnis === null) {
        step4Errors.push('Bitte geben Sie an, ob das Objekt im Eigentum der antragstellenden Person(en) ist');
      }

      if (objectData.eigentumsverhaeltnis === false) {
        if (objectData.kaufvertrag_wurde_abgeschlossen === null) {
          step4Errors.push('Bitte geben Sie an, ob der Kaufvertrag abgeschlossen wurde');
        }
        if (objectData.kaufvertrag_wurde_abgeschlossen === true && !objectData.kaufvertrag_abschluss_datum) {
          step4Errors.push('Bitte geben Sie das Abschlussdatum des Kaufvertrags ein');
        }
      }

      // Erbbaurecht validation - only if eigentumsverhaeltnis is true
      if (objectData.eigentumsverhaeltnis === true) {
        if (objectData.erbbaurecht === null) {
          step4Errors.push('Bitte geben Sie an, ob Erbbaurecht vorhanden ist');
        }
        if (objectData.erbbaurecht === true && !objectData.restlaufzeit_erbbaurecht) {
          step4Errors.push('Bitte geben Sie die Restlaufzeit des Erbbaurechts ein');
        }
      }

      // Grundbuch validation - only if eigentumsverhaeltnis is true
      if (objectData.eigentumsverhaeltnis === true) {
        validateRequiredField(objectData.grundbuch_type, 'Grundbuchtyp', step4Errors);
        validateRequiredField(objectData.grundbuch_amtsgericht, 'Amtsgericht', step4Errors);
        validateRequiredField(objectData.ort_grundbuch, 'Ort des Grundbuchs', step4Errors);
        validateRequiredField(objectData.grundbuch_gemarkung, 'Gemarkung', step4Errors);
        validateRequiredField(objectData.grundbuch_blatt, 'Blatt', step4Errors);
        validateRequiredField(objectData.grundbuch_flur, 'Flur', step4Errors);
        validateRequiredField(objectData.grundbuch_flurstueck, 'Flurstück', step4Errors);
        validateAreaField(objectData.grundstuecksgroesse, 'Grundstücksgröße', step4Errors);
      }

      // Baulasten validation
      if (objectData.baulasten_vorhanden === null) {
        step4Errors.push('Bitte geben Sie an, ob Baulasten vorhanden sind');
      }
      if (objectData.baulasten_vorhanden === true && !objectData.baulasten_art) {
        step4Errors.push('Bitte geben Sie die Art der Baulasten ein');
      }

      // Altlasten validation
      if (objectData.altlasten_vorhanden === null) {
        step4Errors.push('Bitte geben Sie an, ob Altlasten vorhanden sind');
      }
      if (objectData.altlasten_vorhanden === true && !objectData.altlasten_art) {
        step4Errors.push('Bitte geben Sie die Art der Altlasten ein');
      }
    }
    
    sections.push(createValidationSection('hauptantrag-step4', 'Schritt 4: Eigentumsverhältnisse', step4Errors, step4Warnings));

    // Step 5 validation - Costs
    const step5Errors: string[] = [];
    const step5Warnings: string[] = [];
    
    if (costData && Object.keys(costData).length > 0) {
      const isNeubau = objectData?.foerderVariante?.includes('neubau');
      const isBestandserwerbOrErsterwerb = objectData?.foerderVariante?.includes('bestandserwerb') || objectData?.foerderVariante?.includes('ersterwerb');
      
      // Baugrundstück validation for Neubau
      if (isNeubau) {
        validateCurrencyField(costData.grundstueck_kaufpreis, 'Kaufpreis des Baugrundstücks', step5Errors);
        validateCurrencyField(costData.grundstueck_wert, 'Wert des Baugrundstücks', step5Errors);
        validateCurrencyField(costData.erschliessungskosten, 'Erschließungskosten', step5Errors);
      }

      // Standortbedingte Mehrkosten validation for Neubau or Ersterwerb with hasLocationCostLoan
      if ((isNeubau || objectData?.foerderVariante?.includes('ersterwerb')) && objectData?.haslocationcostloan) {
        validateCurrencyField(costData.standortbedingte_mehrkosten, 'Förderfähige standortbedingte Mehrkosten', step5Errors);
      }
      
      // Kaufpreis validation for Bestandserwerb or Ersterwerb
      if (isBestandserwerbOrErsterwerb) {
        validateCurrencyField(costData.kaufpreis, 'Kaufpreis', step5Errors);
      }
      
      // Baukosten validation for Neubau or Nutzungsänderung
      if (isNeubau || objectData?.foerderVariante === 'nutzungsaenderung') {
        if (isNeubau) {
          validateCurrencyField(costData.kosten_gebaeude, 'Kosten des Gebäudes', step5Errors);
        }
        validateCurrencyField(costData.besondere_bauausfuehrung, 'besondere Bauausführung', step5Errors);
        validateCurrencyField(costData.wert_vorhandener_gebaeude, 'Wert vorhandener Gebäudeteile', step5Errors);
        validateCurrencyField(costData.kosten_aussenanlagen, 'Kosten der Außenanlagen', step5Errors);
        validateCurrencyField(costData.kosten_architekt, 'Kosten der Architekten- und Ingenieurleistungen', step5Errors);
      }
      
      // Nebenkosten validation (always required)
      validateCurrencyField(costData.erwerbsnebenkosten, 'Erwerbsnebenkosten', step5Errors);
      validateCurrencyField(costData.verwaltungsleistungen, 'Kosten der Verwaltungsleistungen', step5Errors);
      validateCurrencyField(costData.beschaffung_dauerfinanzierung, 'Kosten der Beschaffung der Dauerfinanzierungsmittel', step5Errors);
      validateCurrencyField(costData.beschaffung_zwischenfinanzierung, 'Kosten der Beschaffung und Verzinsung der Zwischenfinanzierung', step5Errors);
      validateCurrencyField(costData.sonstige_nebenkosten, 'sonstigen Nebenkosten', step5Errors);
      validateCurrencyField(costData.zusaetzliche_kosten, 'zusätzlichen Kosten', step5Errors);
    }
    
    sections.push(createValidationSection('hauptantrag-step5', 'Schritt 5: Kostenaufstellung', step5Errors, step5Warnings));

    // Step 6 validation - Financing
    const step6Errors: string[] = [];
    const step6Warnings: string[] = [];
    
    if (financeData && Object.keys(financeData).length > 0) {
      // Fremddarlehen validation
      if (financeData.fremddarlehen) {
        financeData.fremddarlehen.forEach((darlehen: any, index: number) => {
          // Check if any field has a value (excluding the id field)
          const hasAnyValue = Object.entries(darlehen)
            .filter(([key]) => key !== 'id') // Exclude the id field from the check
            .some(([_, value]) => value !== '' && value !== null && value !== undefined);
          
          if (hasAnyValue) {
            validateRequiredField(darlehen.darlehenGeber, `Fremddarlehen ${index + 1}: Darlehensgeber`, step6Errors);
            validateRequiredField(darlehen.nennbetrag, `Fremddarlehen ${index + 1}: Nennbetrag`, step6Errors);
            validateRequiredField(darlehen.zinssatz, `Fremddarlehen ${index + 1}: Zinssatz`, step6Errors);
            validateRequiredField(darlehen.auszahlung, `Fremddarlehen ${index + 1}: Auszahlung`, step6Errors);
            validateRequiredField(darlehen.tilgung, `Fremddarlehen ${index + 1}: Tilgung`, step6Errors);
          }
        });
      }
      
      // Ergänzungsdarlehen validation if hasSupplementaryLoan is true
      if (userData?.hassupplementaryloan === true) {
        validateCurrencyField(financeData.ergaenzungsdarlehen_nennbetrag, 'Nennbetrag des Ergänzungsdarlehens', step6Errors);
        if (financeData.ergaenzungsdarlehen_nennbetrag) {
          const ergaenzungsdarlehenValue = getNumericValue(financeData.ergaenzungsdarlehen_nennbetrag);
          const maxErgaenzungsdarlehen = 5000000; // 50,000 EUR in cents
          const minErgaenzungsdarlehen = 200000; // 2,000 EUR in cents
          
          if (ergaenzungsdarlehenValue > maxErgaenzungsdarlehen) {
            step6Errors.push(`Ergänzungsdarlehen darf maximal 50.000,00€ betragen (aktuell: ${formatCurrency(ergaenzungsdarlehenValue)})`);
          }
          if (ergaenzungsdarlehenValue < minErgaenzungsdarlehen) {
            step6Errors.push(`Ergänzungsdarlehen muss mindestens 2.000,00€ betragen (aktuell: ${formatCurrency(ergaenzungsdarlehenValue)})`);
          }
        }
      } else {
        // NRW Bank Darlehen validation
        validateCurrencyField(financeData.grunddarlehen_nennbetrag, 'Nennbetrag des Grunddarlehens', step6Errors);
        if (financeData.grunddarlehen_nennbetrag) {
          const grunddarlehenValue = ((): number => {
            const v = financeData.grunddarlehen_nennbetrag;
            if (v === null || v === undefined || v === '') return 0;
            if (typeof v === 'number') return v;
            if (typeof v === 'string') return getNumericValue(v);
            return 0;
          })();
          
          // Get postcode validation data
          const postcodeValidation = getPostcodeValidationData(objectData?.obj_postal_code || '');
          const maxGrunddarlehen = postcodeValidation.maxLimit; // Dynamic limit based on postcode
          
          if (grunddarlehenValue > maxGrunddarlehen) {
            step6Errors.push(`Grunddarlehen darf maximal ${formatCurrency(maxGrunddarlehen)} betragen (aktuell: ${formatCurrencyFromEuros(grunddarlehenValue)})`);
          }
        }

        // Familienbonus validation if childCount > 0
        if (parseInt(userData?.child_count || '0') > 0) {
          validateCurrencyField(financeData.zusatzdarlehen_familienbonus_nennbetrag, 'Nennbetrag des Familienbonus', step6Errors);
          if (financeData.zusatzdarlehen_familienbonus_nennbetrag) {
            const familienbonusValue = getNumericValue(financeData.zusatzdarlehen_familienbonus_nennbetrag);
            const totalEligibleCount = parseInt(userData?.child_count || '0') + parseInt(userData?.disabledadultscount || '0');
            const maxFamilienbonus = totalEligibleCount * 24000; // 24,000 EUR per person in euros
            
            if (familienbonusValue > maxFamilienbonus) {
              step6Errors.push(`Familienbonus darf maximal ${formatCurrencyFromEuros(maxFamilienbonus)} betragen (${totalEligibleCount} berechtigte Personen × 24.000,00€, aktuell: ${formatCurrencyFromEuros(familienbonusValue)})`);
            }
          }
        }

        // Bauen mit Holz validation
        if (objectData?.haswoodconstructionloan === true) {
          validateCurrencyField(financeData.zusatzdarlehen_bauen_mit_holz_nennbetrag, 'Nennbetrag für Bauen mit Holz', step6Errors);
          if (financeData.zusatzdarlehen_bauen_mit_holz_nennbetrag) {
            const holzValue = getNumericValue(financeData.zusatzdarlehen_bauen_mit_holz_nennbetrag);
            const maxHolz = 17000; // 17,000 EUR in euros
            
            if (holzValue > maxHolz) {
              step6Errors.push(`Bauen mit Holz darf maximal 17.000,00€ betragen (aktuell: ${formatCurrencyFromEuros(holzValue)})`);
            }
          }
        }

        // Barrierefreiheit validation
        if ((objectData?.foerderVariante?.includes('neubau') || objectData?.foerderVariante?.includes('ersterwerb')) && 
            objectData?.barrierefrei === true) {
          validateCurrencyField(financeData.zusatzdarlehen_barrierefreiheit_nennbetrag, 'Nennbetrag für Barrierefreiheit', step6Errors);
          if (financeData.zusatzdarlehen_barrierefreiheit_nennbetrag) {
            const barrierefreiValue = getNumericValue(financeData.zusatzdarlehen_barrierefreiheit_nennbetrag);
            const maxBarrierefrei = 11500; // 11,500 EUR in euros
            
            if (barrierefreiValue > maxBarrierefrei) {
              step6Errors.push(`Barrierefreiheit darf maximal 11.500,00€ betragen (aktuell: ${formatCurrencyFromEuros(barrierefreiValue)})`);
            }
          }
        }

        // Standortbedingte Mehrkosten validation
        if ((objectData?.foerderVariante?.includes('neubau') || objectData?.foerderVariante?.includes('ersterwerb')) && 
            objectData?.haslocationcostloan === true) {
          validateCurrencyField(financeData.zusatzdarlehen_standortbedingte_mehrkosten_nennbetrag, 'Nennbetrag für standortbedingte Mehrkosten', step6Errors);
          if (financeData.zusatzdarlehen_standortbedingte_mehrkosten_nennbetrag) {
            const standortValue = getNumericValue(financeData.zusatzdarlehen_standortbedingte_mehrkosten_nennbetrag);
            const maxStandort = 25000; // 25,000 EUR in euros
            
            if (standortValue > maxStandort) {
              step6Errors.push(`Das Zusatzdarlehn für standortbedingte Mehrkosten darf maximal 25.000,00€ betragen (aktuell: ${formatCurrencyFromEuros(standortValue)})`);
            } else if (costData?.standortbedingte_mehrkosten) {
              const costValue = getNumericValue(costData.standortbedingte_mehrkosten);
              const maxZusatzdarlehen = costValue * 0.75;
              
              if (standortValue > maxZusatzdarlehen) {
                step6Errors.push(`Der Nennbetrag des Zusatzdarlehens für standortbedingte Mehrkosten darf maximal 75 % der angegebenen förderfähigen standortbedingten Mehrkosten betragen (maximal ${formatCurrencyFromEuros(maxZusatzdarlehen)}, aktuell: ${formatCurrencyFromEuros(standortValue)})`);
              }
            }
          }
        }

        // BEG Effizienzhaus 40 Standard validation
        if ((objectData?.foerderVariante?.includes('neubau') || objectData?.foerderVariante?.includes('ersterwerb')) && 
            objectData?.beg_effizienzhaus_40_standard === true) {
          validateCurrencyField(financeData.zusatzdarlehen_effizienzhaus40_nennbetrag, 'Nennbetrag für BEG Effizienzhaus 40 Standard', step6Errors);
          if (financeData.zusatzdarlehen_effizienzhaus40_nennbetrag) {
            const begValue = getNumericValue(financeData.zusatzdarlehen_effizienzhaus40_nennbetrag);
            const maxBeg = 30000; // 30,000 EUR in euros
            
            if (begValue > maxBeg) {
              step6Errors.push(`BEG Effizienzhaus 40 Standard darf maximal 30.000,00€ betragen (aktuell: ${formatCurrencyFromEuros(begValue)})`);
            }
          }
        }
      }

      // Eigenleistung validation (always required)
      validateCurrencyField(financeData.eigene_geldmittel, 'eigene Geldmittel', step6Errors);
      validateCurrencyField(financeData.zuschuesse, 'Zuschüsse', step6Errors);
      validateCurrencyField(financeData.selbsthilfe, 'Selbsthilfe', step6Errors);

      // Conditional Eigenleistung fields
      if (objectData?.foerderVariante?.includes('neubau')) {
        validateCurrencyField(financeData.wert_baugrundstueck, 'Wert des Baugrundstücks', step6Errors);
      }

      if (objectData?.foerderVariante?.includes('neubau') || objectData?.foerderVariante === 'nutzungsaenderung') {
        validateCurrencyField(financeData.wert_vorhandener_gebaeudeteile, 'Wert vorhandener Gebäudeteile', step6Errors);
      }

      // Validate Eigenleistung and Gesamtbeträge consistency
      if (costData && financeData) {
        // Calculate Eigenleistung sum
        let eigenleistungSum = 0;
        
        // Always include these values (database values are in cents, so multiply by 100)
        eigenleistungSum += (financeData.eigene_geldmittel || 0) * 100;
        eigenleistungSum += (financeData.zuschuesse || 0) * 100;
        eigenleistungSum += (financeData.selbsthilfe || 0) * 100;

        // Only include these values if foerderVariante is "neubau" or "nutzungsaenderung"
        if (objectData?.foerderVariante?.includes('neubau') || objectData?.foerderVariante === 'nutzungsaenderung') {
          eigenleistungSum += (financeData.wert_vorhandener_gebaeudeteile || 0) * 100;
        }
        if (objectData?.foerderVariante?.includes('neubau')) {
          eigenleistungSum += (financeData.wert_baugrundstueck || 0) * 100;
        }
        
        // Calculate total financing (excluding Eigenleistung)
        let fremddarlehenSum = 0;
        if (financeData.fremddarlehen) {
          fremddarlehenSum = financeData.fremddarlehen.reduce((sum: number, darlehen: any) => {
            // fremddarlehen.nennbetrag is in currency format (e.g., "123,45€"), so we need to parse it correctly
            const parseCurrencyValue = (value: any): number => {
              if (!value) return 0;
              if (typeof value === 'number') return value;
              if (typeof value === 'string') {
                // Remove currency symbols and convert comma to dot, then multiply by 100 to get cents
                return Math.round(parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.')) * 100) || 0;
              }
              return 0;
            };
            return sum + parseCurrencyValue(darlehen.nennbetrag);
          }, 0);
        }
        
        // Database values are stored as integers (cents), so we multiply by 100 to get the correct value
        let nrwBankNennbetrag = (financeData.grunddarlehen_nennbetrag || 0) * 100;

        // Add Familienbonus if childCount > 0
        if (parseInt(userData?.child_count || '0') > 0) {
          nrwBankNennbetrag += (financeData.zusatzdarlehen_familienbonus_nennbetrag || 0) * 100;
        }

        // Add Bauen mit Holz if hasWoodConstructionLoan is true
        if (objectData?.haswoodconstructionloan === true) {
          nrwBankNennbetrag += (financeData.zusatzdarlehen_bauen_mit_holz_nennbetrag || 0) * 100;
        }

        // Check if we're in neubau or ersterwerb
        const isNeubauOrErsterwerb = objectData?.foerderVariante?.includes('neubau') || objectData?.foerderVariante?.includes('ersterwerb');

        // Add Barrierefreiheit if applicable
        if (isNeubauOrErsterwerb && objectData?.barrierefrei === true) {
          nrwBankNennbetrag += (financeData.zusatzdarlehen_barrierefreiheit_nennbetrag || 0) * 100;
        }

        // Add Standortbedingte Mehrkosten if applicable
        if (isNeubauOrErsterwerb && objectData?.haslocationcostloan === true) {
          nrwBankNennbetrag += (financeData.zusatzdarlehen_standortbedingte_mehrkosten_nennbetrag || 0) * 100;
        }

        // Add BEG Effizienzhaus 40 Standard if applicable
        if (isNeubauOrErsterwerb && objectData?.beg_effizienzhaus_40_standard === true) {
          nrwBankNennbetrag += (financeData.zusatzdarlehen_effizienzhaus40_nennbetrag || 0) * 100;
        }

        const ergaenzungsdarlehenSum = (financeData.ergaenzungsdarlehen_nennbetrag || 0) * 100;

        // Gesamtbeträge now only includes loan amounts
        const gesamtbetraege = fremddarlehenSum + nrwBankNennbetrag + ergaenzungsdarlehenSum;

        // Calculate gesamtkosten dynamically from cost data (like in step 5)
        let gesamtkostenValue = 0;
        const isNeubau = objectData?.foerderVariante?.includes('neubau');
        const isBestandserwerbOrErsterwerb = objectData?.foerderVariante?.includes('bestandserwerb') || objectData?.foerderVariante?.includes('ersterwerb');
        const showBaukosten = isNeubau || objectData?.foerderVariante === 'nutzungsaenderung';

        // Only include Baugrundstück if it's Neubau
        if (isNeubau) {
          if (costData.grundstueck_kaufpreis) gesamtkostenValue += (costData.grundstueck_kaufpreis || 0) * 100;
          if (costData.grundstueck_wert) gesamtkostenValue += (costData.grundstueck_wert || 0) * 100;
          if (costData.erschliessungskosten) gesamtkostenValue += (costData.erschliessungskosten || 0) * 100;
        }

         // Add Standortbedingte Mehrkosten if Neubau or Ersterwerb with hasLocationCostLoan
         if ((isNeubau || objectData?.foerderVariante?.includes('ersterwerb')) && objectData?.haslocationcostloan) {
          if (costData.standortbedingte_mehrkosten) gesamtkostenValue += (costData.standortbedingte_mehrkosten || 0) * 100;
        }

        // Only include Kaufpreis if it's Bestandserwerb or Ersterwerb
        if (isBestandserwerbOrErsterwerb) {
          if (costData.kaufpreis) gesamtkostenValue += (costData.kaufpreis || 0) * 100;
        }

        // Only include Baukosten if it's Neubau or Nutzungsänderung
        if (showBaukosten) {
          if (costData.kosten_gebaeude) gesamtkostenValue += (costData.kosten_gebaeude || 0) * 100;
          if (costData.besondere_bauausfuehrung) gesamtkostenValue += (costData.besondere_bauausfuehrung || 0) * 100;
          if (costData.wert_vorhandener_gebaeude) gesamtkostenValue += (costData.wert_vorhandener_gebaeude || 0) * 100;
          if (costData.kosten_architekt) gesamtkostenValue += (costData.kosten_architekt || 0) * 100;
          if (costData.kosten_aussenanlagen) gesamtkostenValue += (costData.kosten_aussenanlagen || 0) * 100;
        }

        if (costData.erwerbsnebenkosten) gesamtkostenValue += (costData.erwerbsnebenkosten || 0) * 100;
        if (costData.verwaltungsleistungen) gesamtkostenValue += (costData.verwaltungsleistungen || 0) * 100;
        if (costData.beschaffung_dauerfinanzierung) gesamtkostenValue += (costData.beschaffung_dauerfinanzierung || 0) * 100;
        if (costData.beschaffung_zwischenfinanzierung) gesamtkostenValue += (costData.beschaffung_zwischenfinanzierung || 0) * 100;
        if (costData.sonstige_nebenkosten) gesamtkostenValue += (costData.sonstige_nebenkosten || 0) * 100;
        if (costData.zusaetzliche_kosten) gesamtkostenValue += (costData.zusaetzliche_kosten || 0) * 100;
        // Always include Nebenkosten (these fields need to be added to cost_structure table)
        // For now, we'll skip this validation until the database schema is complete

        // Validate Eigenleistung (7.5% of Gesamtkosten)
        const minEigenleistung = Math.round(gesamtkostenValue * 0.075);
        if (eigenleistungSum < minEigenleistung) {
          step6Errors.push(`Die Eigenleistung muss mind. 7,5% der Gesamtkosten (${formatCurrency(minEigenleistung)}) entsprechen.`);
        }
        
        // Validate total equals Gesamtbeträge (now including Eigenleistung for validation)
        const totalWithEigenleistung = gesamtbetraege + eigenleistungSum;
        const difference = totalWithEigenleistung - gesamtkostenValue;
        if (Math.abs(difference) > 1) {
          step6Errors.push(`Die Summe aus Eigenleistung und Gesamtfinanzierung (${formatCurrency(totalWithEigenleistung)}) müssen den Gesamtkosten (${formatCurrency(gesamtkostenValue)}) entsprechen. Differenz: ${formatCurrency(difference)}`);
        }
      }
    }
    
    sections.push(createValidationSection('hauptantrag-step6', 'Schritt 6: Finanzierungsmittel', step6Errors, step6Warnings));

    return sections;
  }

  private validateEinkommenserklarung(data: any): ValidationSection[] {
    const sections: ValidationSection[] = [];

    if (!data) {
      sections.push(createValidationSection('einkommenserklarung', 'Einkommenserklärung', ['Einkommenserklärung-Daten nicht gefunden'], []));
      return sections;
    }

    const { userData, financialData } = data;

    // Type labels for validation messages
    const typeLabels: Record<string, string> = {
      renten: 'Renten',
      vermietung: 'Einkünfte aus Vermietung und Verpachtung',
      gewerbe: 'Einkünfte aus Gewerbebetrieb/selbstständiger Arbeit',
      landforst: 'Einkünfte aus Land- und Forstwirtschaft',
      sonstige: 'Sonstige Einkünfte',
      unterhaltsteuerfrei: 'Unterhaltsleistungen steuerfrei',
      unterhaltsteuerpflichtig: 'Unterhaltsleistungen steuerpflichtig',
      ausland: 'Ausländische Einkünfte',
      pauschal: 'Vom Arbeitgeber pauschal besteuerter Arbeitslohn',
      arbeitslosengeld: 'Arbeitslosengeld',
    };

    const additionalChangeTypeLabels: Record<string, string> = {
      werbungskosten: 'Werbungskosten',
      kinderbetreuungskosten: 'Kinderbetreuungskosten',
      unterhaltszahlungen: 'Unterhaltszahlungen',
    };



    // Helper function to get current value for a type from database schema
    const getCurrentValueForType = (financialData: any, type: string): number => {
      switch (type) {
        case 'renten':
          return financialData.incomepension ? parseGermanNumber(financialData.incomepension) : 0;
        case 'vermietung':
          return financialData.incomerent ? parseGermanNumber(financialData.incomerent) : 0;
        case 'gewerbe':
          return financialData.incomebusiness ? parseGermanNumber(financialData.incomebusiness) : 0;
        case 'landforst':
          return financialData.incomeagriculture ? parseGermanNumber(financialData.incomeagriculture) : 0;
        case 'sonstige':
          return financialData.incomeothers ? parseGermanNumber(financialData.incomeothers) : 0;
        case 'unterhaltsteuerfrei':
          return financialData.incomeunterhalttaxfree ? parseGermanNumber(financialData.incomeunterhalttaxfree) : 0;
        case 'unterhaltsteuerpflichtig':
          return financialData.incomeunterhalttaxable ? parseGermanNumber(financialData.incomeunterhalttaxable) : 0;
        case 'ausland':
          return financialData.incomeforeign ? parseGermanNumber(financialData.incomeforeign) : 0;
        case 'pauschal':
          return financialData.incomepauschal ? parseGermanNumber(financialData.incomepauschal) : 0;
        case 'arbeitslosengeld':
          return financialData.incomeablg ? parseGermanNumber(financialData.incomeablg) : 0;
        case 'werbungskosten':
          return financialData.werbungskosten ? parseGermanNumber(financialData.werbungskosten) : 0;
        case 'kinderbetreuungskosten':
          return financialData.kinderbetreuungskosten ? parseGermanNumber(financialData.kinderbetreuungskosten) : 0;
        case 'unterhaltszahlungen':
          if (financialData.unterhaltszahlungen && financialData.unterhaltszahlungen.length > 0) {
            return financialData.unterhaltszahlungen.reduce((sum: number, item: any) => {
              return sum + parseGermanNumber(item.amount || '0');
            }, 0);
          }
          return 0;
        default:
          return 0;
      }
    };

    // Helper function to validate increase/decrease radio button against actual values
    const validateIncreaseDecreaseRadio = (financialData: any, type: string, change: any): string | null => {


      // Helper function to parse currency values (following Selbstauskunft container logic)
      const parseCurrencyValue = (value: any): number => {
        if (!value) return 0;
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          // Handle database format (e.g., "1200.00") vs German format (e.g., "1.200,00 €")
          if (value.includes('€') || value.includes(',')) {
            // German format: remove € and convert comma to dot
            const cleaned = value.replace(/[€\s]/g, '').replace(/\./g, '').replace(',', '.');
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? 0 : parsed;
          } else {
            // Database format: already has dot as decimal separator
            const parsed = parseFloat(value);
            return isNaN(parsed) ? 0 : parsed;
          }
        }
        return 0;
      };
      
      if (typeof change.increase !== 'boolean' || !change.newAmount) {
        return null; // Let other validations handle missing values
      }
      
      // For types that have turnus options, check if the turnus values match
      if (type === 'ausland' || type === 'arbeitslosengeld') {
        let originalTurnus: string | null = null;
        if (type === 'ausland') {
          originalTurnus = financialData.incomeforeignmonthly === true ? 'monatlich' : 
                          financialData.incomeforeignmonthly === false ? 'jährlich' : null;
        } else if (type === 'arbeitslosengeld') {
          if (financialData.incomealbgtype === 0) originalTurnus = 'täglich';
          else if (financialData.incomealbgtype === 1) originalTurnus = 'monatlich';
          else if (financialData.incomealbgtype === 2) originalTurnus = 'jährlich';
        }
        
        const changeTurnus = change.isNewIncomeMonthly === true ? 'monatlich' : 
                           change.isNewIncomeMonthly === false ? 'jährlich' : null;
        
        // If either turnus is null/undefined, don't validate
        if (!originalTurnus || changeTurnus === null) {
          return null;
        }
        
        // For arbeitslosengeld, if original is 'täglich', don't validate (no matching option in change)
        if (type === 'arbeitslosengeld' && originalTurnus === 'täglich') {
          return null;
        }
        
        // If turnus values don't match, don't validate
        if (originalTurnus !== changeTurnus) {
          return null;
        }
      }
      
      const currentValue = getCurrentValueForType(financialData, type);
      
      
      const newValue = parseCurrencyValue(change.newAmount);
      
      const typeLabel = typeLabels[type] || additionalChangeTypeLabels[type] || type;
      
      if (change.increase === true && newValue <= currentValue) {
        return `${typeLabel}: Ihr neuer Betrag ist geringer als oder gleich dem alten Betrag. ${newValue} <= ${currentValue}`;
      }
      
      if (change.increase === false && newValue >= currentValue) {
        return `${typeLabel}: Ihr neuer Betrag ist größer als oder gleich dem alten Betrag.`;
      }
      
      return null;
    };

    // Helper function to get person name or fallback
    const getPersonTitle = (person: any, index: number, isMainApplicant: boolean = false): string => {
      if (isMainApplicant) {
          if (person.firstname && person.lastname) {
            return `${person.firstname} ${person.lastname}`;
          }
          return 'Hauptantragsteller';
        } else {
          if (person.firstName && person.lastName) {
            return `${person.firstName} ${person.lastName}`;
          }
          return `Person ${index + 2}`;
        }
      };

    // Main applicant validation
    if (userData && financialData) {
      // Check if main applicant has noIncome set to true
      if (userData.noIncome === true) {
        // Skip validation for main applicant if they have no income
        return sections;
      }

      const personTitle = getPersonTitle(userData, 0, true);
      
      // Personal information section
      const personalErrors: string[] = [];
      validateRequiredField(userData.title, 'Titel', personalErrors);
      validateRequiredField(userData.firstname, 'Vorname', personalErrors);
      validateRequiredField(userData.lastname, 'Name', personalErrors);
      validateRequiredField(userData.person_street, 'Straße', personalErrors);
      validateRequiredField(userData.person_housenumber, 'Hausnummer', personalErrors);
      validatePostalCodeField(userData.person_postalcode, 'Postleitzahl', personalErrors);
      validateRequiredField(userData.person_city, 'Ort', personalErrors);

      // Employment income section
      const incomeErrors: string[] = [];
      if (financialData.isEarningRegularIncome === null) {
        incomeErrors.push('Bitte geben Sie an, ob Sie Einkünfte aus nichtselbstständiger Arbeit/Versorgungsbezüge erzielen');
  }
      
      if (financialData.isEarningRegularIncome) {
        validateRequiredField(financialData.prior_year, 'Jahr für steuerpflichtige Einkünfte', incomeErrors);
        validateRequiredField(financialData.prior_year_earning, 'Jahresbetrag für steuerpflichtige Einkünfte', incomeErrors);
        validateRequiredField(financialData.end_month_past12, 'Letzter Monat', incomeErrors);
        validateRequiredField(financialData.end_year_past12, 'Jahr für letzter Monat', incomeErrors);
        
        // Validate monthly income fields
        const monthlyFields = [
          'income_month1', 'income_month2', 'income_month3', 'income_month4',
          'income_month5', 'income_month6', 'income_month7', 'income_month8',
          'income_month9', 'income_month10', 'income_month11', 'income_month12'
        ];
        
        monthlyFields.forEach((field, index) => {
          validateCurrencyField(financialData[field], `Einkommen für Monat ${index + 1}`, incomeErrors);
        });

        // Sonderzuwendungen validation
        validateCurrencyField(financialData.wheinachtsgeld_last12, 'Der Betrag für das Weihnachtsgeld der vergangenen 12 Monate', incomeErrors);
        validateCurrencyField(financialData.wheinachtsgeld_next12, 'Der Betrag für das Weihnachtsgeld der kommenden 12 Monate', incomeErrors);
        validateCurrencyField(financialData.urlaubsgeld_last12, 'Der Betrag für das Urlaubsgeld der vergangenen 12 Monate', incomeErrors);
        validateCurrencyField(financialData.urlaubsgeld_next12, 'Der Betrag für das Urlaubsgeld der kommenden 12 Monate', incomeErrors);
        validateCurrencyField(financialData.otherincome_last12, 'Der Betrag für sonstige Leistungen der vergangenen 12 Monate', incomeErrors);
        validateCurrencyField(financialData.otherincome_next12, 'Der Betrag für sonstige Leistungen der kommenden 12 Monate', incomeErrors);

        // Income change validation
        if (financialData.willchangeincome === null) {
          incomeErrors.push('Bitte geben Sie an, ob sich Ihr Einkommen ändern wird.');
        }
        
        if (financialData.willchangeincome) {
          if (!financialData.incomechangedate) {
            incomeErrors.push('Bitte geben Sie das Datum der Einkommensänderung an.');
          } else if (!isValidFutureDate(financialData.incomechangedate)) {
            incomeErrors.push('Das Datum der Einkommensänderung darf nicht mehr als 12 Monate in der Vergangenheit liegen und nicht mehr als 12 Monate in der Zukunft.');
          }
          
          if (financialData.willchangeincrease === null) {
            incomeErrors.push('Bitte geben Sie an, ob das Einkommen steigt oder sinkt.');
          }
          validateCurrencyField(financialData.newincome, 'Neuer Betrag', incomeErrors);
          
          if (financialData.isnewincomemonthly === null) {
            incomeErrors.push('Bitte geben Sie an, ob der neue Betrag monatlich oder jährlich ist.');
          }
          
          if (!financialData.newincomereason) {
            incomeErrors.push('Bitte geben Sie eine Begründung für die Einkommensänderung an.');
          }
        }

        // Employment validation
        if (!financialData.startemployment) {
          incomeErrors.push('Bitte geben Sie das Beschäftigungsbeginn-Datum an.');
        } else if (!isValidEmploymentStartDate(financialData.startemployment)) {
          incomeErrors.push('Bitte geben Sie ein valides Datum an.');
        }
        
        if (financialData.iscontractlimited === null) {
          incomeErrors.push('Bitte geben Sie an, ob Ihr Vertrag befristet oder unbefristet ist.');
        }
        
        if (financialData.iscontractlimited && !financialData.endofcontract) {
          incomeErrors.push('Bitte geben Sie das Ende des befristeten Vertrags an.');
        } else if (financialData.iscontractlimited && financialData.endofcontract && !isValidContractEndDate(financialData.endofcontract)) {
          incomeErrors.push('Bitte geben Sie ein valides Datum an.');
        }
      }

      // Additional income section
      const additionalIncomeErrors: string[] = [];
      if (financialData.haspensionincome) {
        validateCurrencyField(financialData.incomepension, 'Betrag für Renten', additionalIncomeErrors);
      }
      
      if (financialData.hasrentincome) {
        validateRequiredField(financialData.incomerentyear, 'Jahr für Vermietung/Verpachtung', additionalIncomeErrors);
        validateCurrencyField(financialData.incomerent, 'Betrag für Vermietung/Verpachtung', additionalIncomeErrors);
      }
      
      if (financialData.hasbusinessincome) {
        validateRequiredField(financialData.incomebusinessyear, 'Jahr für Gewerbebetrieb/selbstständige Arbeit', additionalIncomeErrors);
        validateCurrencyField(financialData.incomebusiness, 'Betrag für Gewerbebetrieb/selbstständige Arbeit', additionalIncomeErrors);
      }
      
      if (financialData.hasagricultureincome) {
        validateRequiredField(financialData.incomeagricultureyear, 'Jahr für Land- und Forstwirtschaft', additionalIncomeErrors);
        validateCurrencyField(financialData.incomeagriculture, 'Betrag für Land- und Forstwirtschaft', additionalIncomeErrors);
      }
      
      if (financialData.hasothercome) {
        validateRequiredField(financialData.incomeothersyear, 'Jahr für Sonstige Einkünfte', additionalIncomeErrors);
        validateCurrencyField(financialData.incomeothers, 'Betrag für Sonstige Einkünfte', additionalIncomeErrors);
      }
      
      if (financialData.hastaxfreeunterhaltincome) {
        validateCurrencyField(financialData.incomeunterhalttaxfree, 'Betrag für Unterhaltsleistungen steuerfrei', additionalIncomeErrors);
      }
      
      if (financialData.hastaxableunterhaltincome) {
        validateCurrencyField(financialData.incomeunterhalttaxable, 'Betrag für Unterhaltsleistungen steuerpflichtig', additionalIncomeErrors);
      }
      
      if (financialData.hasforeignincome) {
        if (financialData.incomeforeignmonthly === null) {
          additionalIncomeErrors.push('Turnus für Ausländische Einkünfte ist erforderlich');
        } else if (financialData.incomeforeignmonthly === false) { // jährlich
          validateRequiredField(financialData.incomeforeignyear, 'Jahr für Ausländische Einkünfte', additionalIncomeErrors);
          validateCurrencyField(financialData.incomeforeign, 'Betrag für Ausländische Einkünfte', additionalIncomeErrors);
        } else if (financialData.incomeforeignmonthly === true) { // monatlich
          validateCurrencyField(financialData.incomeforeign, 'Betrag für Ausländische Einkünfte', additionalIncomeErrors);
        }
      }
      
      if (financialData.haspauschalincome) {
        validateCurrencyField(financialData.incomepauschal, 'Betrag für pauschal besteuerten Arbeitslohn', additionalIncomeErrors);
      }
      
      if (financialData.hasablgincome) {
        validateRequiredField(financialData.incomeablg, 'Betrag für Arbeitslosengeld', additionalIncomeErrors);
        validateRequiredField(financialData.incomealbgtype, 'Zeitraum für Arbeitslosengeld', additionalIncomeErrors);
      }

      // Costs section
      const costsErrors: string[] = [];
      if (financialData.isEarningRegularIncome) {
        validateCurrencyField(financialData.werbungskosten, 'Werbungskosten', costsErrors);
      }
      
      if (financialData.ispayingincometax === null) {
        costsErrors.push('Bitte geben Sie an, ob Sie Einkommensteuer zahlen');
      }
      
      if (financialData.ispayinghealthinsurance === null) {
        costsErrors.push('Bitte geben Sie an, ob Sie Krankenversicherung zahlen');
      }
      
      if (financialData.ispayingpension === null) {
        costsErrors.push('Bitte geben Sie an, ob Sie Rentenversicherung zahlen');
      }
      
      if (financialData.ispayingunterhalt === null) {
        costsErrors.push('Bitte geben Sie an, ob Sie Unterhalt zahlen');
      }
      
      if (financialData.ispayingunterhalt === true) {
        if (!financialData.unterhaltszahlungen || financialData.unterhaltszahlungen.length === 0) {
          costsErrors.push('Bitte fügen Sie mindestens eine Person für Unterhaltszahlungen hinzu');
        } else {
          financialData.unterhaltszahlungen.forEach((zahlung: any, idx: number) => {
            if (!zahlung.name) {
              costsErrors.push(`Name für Person ${idx + 1} bei Unterhaltszahlungen ist erforderlich`);
            }
            if (!zahlung.amount) {
              costsErrors.push(`Betrag für Person ${idx + 1} bei Unterhaltszahlungen ist erforderlich`);
            }
          });
        }
      }

      // Changes section
      const changesErrors: string[] = [];
      if (financialData.addition_change_inincome) {
        try {
          const additionalChanges = JSON.parse(financialData.addition_change_inincome);
          if (additionalChanges.selectedTypes && additionalChanges.selectedTypes.length > 0) {
            additionalChanges.selectedTypes.forEach((type: string) => {
              const change = additionalChanges.changes?.[type] || {};
              const typeLabel = typeLabels[type] || additionalChangeTypeLabels[type] || type;
              
              if (!change.date) {
                changesErrors.push(`Bitte geben Sie das Änderungsdatum für ${typeLabel} an.`);
              } else if (!isValidFutureDate(change.date)) {
                changesErrors.push(`Das Änderungsdatum für ${typeLabel} darf nicht mehr als 12 Monate in der Vergangenheit liegen und nicht mehr als 12 Monate in der Zukunft.`);
              }
              validateCurrencyField(change.newAmount, `Neuer Betrag für ${typeLabel}`, changesErrors);
              if (typeof change.increase !== 'boolean') {
                changesErrors.push(`Bitte geben Sie an, ob sich das Einkommen für ${typeLabel} erhöht oder verringert.`);
              } else {
                const radioValidationError = validateIncreaseDecreaseRadio(financialData, type, change);
                if (radioValidationError) {
                  changesErrors.push(radioValidationError);
                }
              }
              if (change.isNewIncomeMonthly === null || change.isNewIncomeMonthly === undefined) {
                changesErrors.push(`Bitte geben Sie an, ob der neue Betrag für ${typeLabel} monatlich oder jährlich ist.`);
              }
              if (!change.reason) {
                changesErrors.push(`Bitte geben Sie eine Begründung für die Änderung bei ${typeLabel} an.`);
              }
            });
          }
        } catch (e) {
          changesErrors.push('Ungültige Daten für Einkommensänderungen');
        }
      }

      // Legal section
      const legalErrors: string[] = [];
      validateRequiredField(financialData.finanzamt, 'Zuständiges Finanzamt', legalErrors);
      validateRequiredField(financialData.steuerid, 'Steuer-ID', legalErrors);

      // Add main applicant sections
      sections.push(createValidationSection(`einkommenserklarung-${personTitle.replace(/\s+/g, '')}-personal`, `${personTitle}:Persönliche Angaben`, personalErrors, []));
      sections.push(createValidationSection(`einkommenserklarung-${personTitle.replace(/\s+/g, '')}-income`, `${personTitle}:Einkommensangaben`, incomeErrors, []));
      sections.push(createValidationSection(`einkommenserklarung-${personTitle.replace(/\s+/g, '')}-additional-income`, `${personTitle}:Weitere Einkünfte`, additionalIncomeErrors, []));
      sections.push(createValidationSection(`einkommenserklarung-${personTitle.replace(/\s+/g, '')}-costs`, `${personTitle}:Kosten, Zahlungen, und Abgaben`, costsErrors, []));
      sections.push(createValidationSection(`einkommenserklarung-${personTitle.replace(/\s+/g, '')}-changes`, `${personTitle}:Änderung der weiteren Einkünfte, Kosten und Zahlungen`, changesErrors, []));
      sections.push(createValidationSection(`einkommenserklarung-${personTitle.replace(/\s+/g, '')}-legal`, `${personTitle}:Gesetzliche Angaben`, legalErrors, []));
    }

    // Additional applicants validation
    if (financialData?.additional_applicants_financials && userData?.weitere_antragstellende_personen) {
      const additionalFinancials = financialData.additional_applicants_financials;
      const additionalPersons = userData.weitere_antragstellende_personen;
      
      // Handle both array and object formats for backwards compatibility
      let personEntries: Array<[string, any]>;
      if (Array.isArray(additionalPersons)) {
        personEntries = additionalPersons.map((person: any, index: number) => [index.toString(), person]);
      } else {
        personEntries = Object.entries(additionalPersons);
      }
      
      personEntries.forEach((entry, index) => {
        const [uuid, person] = entry;
        const applicantFinancials = additionalFinancials[uuid];
        if (!applicantFinancials) return;

        // Check if additional applicant has noIncome set to true
        if (person.noIncome === true) {
          // Skip validation for this additional applicant if they have no income
          return;
        }

        const personTitle = getPersonTitle(person, index);

        // Personal information section
        const personalErrors: string[] = [];
        validateRequiredField(person.title, 'Titel', personalErrors);
        validateRequiredField(person.firstName, 'Vorname', personalErrors);
        validateRequiredField(person.lastName, 'Name', personalErrors);
        validateRequiredField(person.street, 'Straße', personalErrors);
        validateRequiredField(person.houseNumber, 'Hausnummer', personalErrors);
        validatePostalCodeField(person.postalCode, 'Postleitzahl', personalErrors);
        validateRequiredField(person.city, 'Ort', personalErrors);

        // Employment income section
        const incomeErrors: string[] = [];
        if (applicantFinancials.isEarningRegularIncome === null) {
          incomeErrors.push('Bitte geben Sie an, ob Einkünfte aus nichtselbstständiger Arbeit erzielt werden');
        }
        
        if (applicantFinancials.isEarningRegularIncome) {
          validateRequiredField(applicantFinancials.prior_year, 'Jahr für steuerpflichtige Einkünfte', incomeErrors);
          validateRequiredField(applicantFinancials.prior_year_earning, 'Jahresbetrag für steuerpflichtige Einkünfte', incomeErrors);
          validateRequiredField(applicantFinancials.end_month_past12, 'Letzter Monat', incomeErrors);
          validateRequiredField(applicantFinancials.end_year_past12, 'Jahr für letzter Monat', incomeErrors);
          
          // Validate monthly income fields
          const monthlyFields = [
            'income_month1', 'income_month2', 'income_month3', 'income_month4',
            'income_month5', 'income_month6', 'income_month7', 'income_month8',
            'income_month9', 'income_month10', 'income_month11', 'income_month12'
          ];
          
          monthlyFields.forEach((field, monthIndex) => {
            validateCurrencyField(applicantFinancials[field], `Einkommen für Monat ${monthIndex + 1}`, incomeErrors);
          });

          // Sonderzuwendungen validation
          validateCurrencyField(applicantFinancials.wheinachtsgeld_last12, 'Der Betrag für das Weihnachtsgeld der vergangenen 12 Monate', incomeErrors);
          validateCurrencyField(applicantFinancials.wheinachtsgeld_next12, 'Der Betrag für das Weihnachtsgeld der kommenden 12 Monate', incomeErrors);
          validateCurrencyField(applicantFinancials.urlaubsgeld_last12, 'Der Betrag für das Urlaubsgeld der vergangenen 12 Monate', incomeErrors);
          validateCurrencyField(applicantFinancials.urlaubsgeld_next12, 'Der Betrag für das Urlaubsgeld der kommenden 12 Monate', incomeErrors);
          validateCurrencyField(applicantFinancials.otherincome_last12, 'Der Betrag für sonstige Leistungen der vergangenen 12 Monate', incomeErrors);
          validateCurrencyField(applicantFinancials.otherincome_next12, 'Der Betrag für sonstige Leistungen der kommenden 12 Monate', incomeErrors);

          // Employment validation
          if (!applicantFinancials.startemployment) {
            incomeErrors.push('Bitte geben Sie das Beschäftigungsbeginn-Datum an.');
          } else if (!isValidEmploymentStartDate(applicantFinancials.startemployment)) {
            incomeErrors.push('Bitte geben Sie ein valides Datum an.');
          }
          
          if (applicantFinancials.iscontractlimited === null) {
            incomeErrors.push('Bitte geben Sie an, ob der Vertrag befristet oder unbefristet ist.');
          }
          
          if (applicantFinancials.iscontractlimited && !applicantFinancials.endofcontract) {
            incomeErrors.push('Bitte geben Sie das Ende des befristeten Vertrags an.');
          } else if (applicantFinancials.iscontractlimited && applicantFinancials.endofcontract && !isValidContractEndDate(applicantFinancials.endofcontract)) {
            incomeErrors.push('Bitte geben Sie ein valides Datum an.');
          }

          // Income change validation
          if (applicantFinancials.willchangeincome === null) {
            incomeErrors.push('Bitte geben Sie an, ob sich das Einkommen ändern wird.');
          }
          
          if (applicantFinancials.willchangeincome) {
            if (!applicantFinancials.incomechangedate) {
              incomeErrors.push('Bitte geben Sie das Datum der Einkommensänderung an.');
            } else if (!isValidFutureDate(applicantFinancials.incomechangedate)) {
              incomeErrors.push('Das Datum der Einkommensänderung darf nicht mehr als 12 Monate in der Vergangenheit liegen und nicht mehr als 12 Monate in der Zukunft.');
            }
            
            if (applicantFinancials.willchangeincrease === null) {
              incomeErrors.push('Bitte geben Sie an, ob sich das Einkommen erhöht oder verringert.');
            }
            
            validateCurrencyField(applicantFinancials.newincome, 'Neuer Betrag', incomeErrors);
            
            if (applicantFinancials.isnewincomemonthly === null) {
              incomeErrors.push('Bitte geben Sie an, ob der neue Betrag monatlich oder jährlich ist.');
            }
            
            if (!applicantFinancials.newincomereason) {
              incomeErrors.push('Bitte geben Sie eine Begründung für die Einkommensänderung an.');
            }
          }
        }

        // Additional income section
        const additionalIncomeErrors: string[] = [];
        if (applicantFinancials.haspensionincome) {
          validateCurrencyField(applicantFinancials.incomepension, 'Betrag für Renten', additionalIncomeErrors);
        }
        
        if (applicantFinancials.hasrentincome) {
          validateRequiredField(applicantFinancials.incomerentyear, 'Jahr für Vermietung/Verpachtung', additionalIncomeErrors);
          validateCurrencyField(applicantFinancials.incomerent, 'Betrag für Vermietung/Verpachtung', additionalIncomeErrors);
        }
        
        if (applicantFinancials.hasbusinessincome) {
          validateRequiredField(applicantFinancials.incomebusinessyear, 'Jahr für Gewerbebetrieb/selbstständige Arbeit', additionalIncomeErrors);
          validateCurrencyField(applicantFinancials.incomebusiness, 'Betrag für Gewerbebetrieb/selbstständige Arbeit', additionalIncomeErrors);
        }
        
        if (applicantFinancials.hasagricultureincome) {
          validateRequiredField(applicantFinancials.incomeagricultureyear, 'Jahr für Land- und Forstwirtschaft', additionalIncomeErrors);
          validateCurrencyField(applicantFinancials.incomeagriculture, 'Betrag für Land- und Forstwirtschaft', additionalIncomeErrors);
        }
        
        if (applicantFinancials.hasothercome) {
          validateRequiredField(applicantFinancials.incomeothersyear, 'Jahr für Sonstige Einkünfte', additionalIncomeErrors);
          validateCurrencyField(applicantFinancials.incomeothers, 'Betrag für Sonstige Einkünfte', additionalIncomeErrors);
        }
        
        if (applicantFinancials.hastaxfreeunterhaltincome) {
          validateCurrencyField(applicantFinancials.incomeunterhalttaxfree, 'Betrag für Unterhaltsleistungen steuerfrei', additionalIncomeErrors);
        }
        
        if (applicantFinancials.hastaxableunterhaltincome) {
          validateCurrencyField(applicantFinancials.incomeunterhalttaxable, 'Betrag für Unterhaltsleistungen steuerpflichtig', additionalIncomeErrors);
        }
        
        if (applicantFinancials.hasforeignincome) {
          if (applicantFinancials.incomeforeignmonthly === null) {
            additionalIncomeErrors.push('Turnus für Ausländische Einkünfte ist erforderlich');
          } else if (applicantFinancials.incomeforeignmonthly === false) { // jährlich
            validateRequiredField(applicantFinancials.incomeforeignyear, 'Jahr für Ausländische Einkünfte', additionalIncomeErrors);
          }
          validateCurrencyField(applicantFinancials.incomeforeign, 'Betrag für Ausländische Einkünfte', additionalIncomeErrors);
        }
        
        if (applicantFinancials.haspauschalincome) {
          validateCurrencyField(applicantFinancials.incomepauschal, 'Betrag für pauschal besteuerten Arbeitslohn', additionalIncomeErrors);
        }
        
        if (applicantFinancials.hasablgincome) {
          validateRequiredField(applicantFinancials.incomeablg, 'Betrag für Arbeitslosengeld', additionalIncomeErrors);
          validateRequiredField(applicantFinancials.incomealbgtype, 'Zeitraum für Arbeitslosengeld', additionalIncomeErrors);
        }

        // Costs section
        const costsErrors: string[] = [];
        if (applicantFinancials.isEarningRegularIncome) {
          validateCurrencyField(applicantFinancials.werbungskosten, 'Werbungskosten', costsErrors);
        }
        
        if (applicantFinancials.ispayingincometax === null) {
          costsErrors.push('Bitte geben Sie an, ob Einkommensteuer gezahlt wird');
        }
        
        if (applicantFinancials.ispayinghealthinsurance === null) {
          costsErrors.push('Bitte geben Sie an, ob Krankenversicherung gezahlt wird');
        }
        
        if (applicantFinancials.ispayingpension === null) {
          costsErrors.push('Bitte geben Sie an, ob Rentenversicherung gezahlt wird');
        }
        
        if (applicantFinancials.ispayingunterhalt === null) {
          costsErrors.push('Bitte geben Sie an, ob Unterhalt gezahlt wird');
        }
        
        if (applicantFinancials.ispayingunterhalt === true) {
          if (!applicantFinancials.unterhaltszahlungen || applicantFinancials.unterhaltszahlungen.length === 0) {
            costsErrors.push('Bitte fügen Sie mindestens eine Person für Unterhaltszahlungen hinzu');
          } else {
            applicantFinancials.unterhaltszahlungen.forEach((zahlung: any, idx: number) => {
              if (!zahlung.name) {
                costsErrors.push(`Name für Person ${idx + 1} bei Unterhaltszahlungen ist erforderlich`);
              }
              if (!zahlung.amount) {
                costsErrors.push(`Betrag für Person ${idx + 1} bei Unterhaltszahlungen ist erforderlich`);
              }
            });
          }
        }

        // Changes section
        const changesErrors: string[] = [];
        if (applicantFinancials.addition_change_inincome) {
          try {
            const additionalChanges = JSON.parse(applicantFinancials.addition_change_inincome);
            if (additionalChanges.selectedTypes && additionalChanges.selectedTypes.length > 0) {
              additionalChanges.selectedTypes.forEach((type: string) => {
                const change = additionalChanges.changes?.[type] || {};
                const typeLabel = typeLabels[type] || additionalChangeTypeLabels[type] || type;
                
                if (!change.date) {
                  changesErrors.push(`Bitte geben Sie das Änderungsdatum für ${typeLabel} an.`);
                } else if (!isValidFutureDate(change.date)) {
                  changesErrors.push(`Das Änderungsdatum für ${typeLabel} darf nicht mehr als 12 Monate in der Vergangenheit liegen und nicht mehr als 12 Monate in der Zukunft.`);
                }
                validateCurrencyField(change.newAmount, `Neuer Betrag für ${typeLabel}`, changesErrors);
                if (typeof change.increase !== 'boolean') {
                  changesErrors.push(`Bitte geben Sie an, ob sich das Einkommen für ${typeLabel} erhöht oder verringert.`);
                } else {
                  const radioValidationError = validateIncreaseDecreaseRadio(applicantFinancials, type, change);
                  if (radioValidationError) {
                    changesErrors.push(radioValidationError);
                  }
                }
                if (change.isNewIncomeMonthly === null || change.isNewIncomeMonthly === undefined) {
                  changesErrors.push(`Bitte geben Sie an, ob der neue Betrag für ${typeLabel} monatlich oder jährlich ist.`);
                }
                if (!change.reason) {
                  changesErrors.push(`Bitte geben Sie eine Begründung für die Änderung bei ${typeLabel} an.`);
                }
              });
            }
          } catch (e) {
            changesErrors.push('Ungültige Daten für Einkommensänderungen');
          }
        }

        // Legal section
        const legalErrors: string[] = [];
        validateRequiredField(applicantFinancials.finanzamt, 'Zuständiges Finanzamt', legalErrors);
        validateRequiredField(applicantFinancials.steuerid, 'Steuer-ID', legalErrors);

        // Add additional applicant sections
        sections.push(createValidationSection(`einkommenserklarung-${personTitle.replace(/\s+/g, '')}-personal`, `${personTitle}:Persönliche Angaben`, personalErrors, []));
        sections.push(createValidationSection(`einkommenserklarung-${personTitle.replace(/\s+/g, '')}-income`, `${personTitle}:Einkommensangaben`, incomeErrors, []));
        sections.push(createValidationSection(`einkommenserklarung-${personTitle.replace(/\s+/g, '')}-additional-income`, `${personTitle}:Weitere Einkünfte`, additionalIncomeErrors, []));
        sections.push(createValidationSection(`einkommenserklarung-${personTitle.replace(/\s+/g, '')}-costs`, `${personTitle}:Kosten, Zahlungen, und Abgaben`, costsErrors, []));
        sections.push(createValidationSection(`einkommenserklarung-${personTitle.replace(/\s+/g, '')}-changes`, `${personTitle}:Änderung der weiteren Einkünfte, Kosten und Zahlungen`, changesErrors, []));
        sections.push(createValidationSection(`einkommenserklarung-${personTitle.replace(/\s+/g, '')}-legal`, `${personTitle}:Gesetzliche Angaben`, legalErrors, []));
      });
    }

    return sections;
  }

  private validateSelbstauskunft(data: any): ValidationSection[] {
    const sections: ValidationSection[] = [];

    if (!data) {
      sections.push(createValidationSection('selbstauskunft', 'Selbstauskunft', ['Selbstauskunft-Daten nicht gefunden'], []));
      return sections;
    }

    const { userData, financialData } = data;

    // Helper function to check if currency is empty or zero
    const isCurrencyEmptyOrZero = (value: any): boolean => {
      if (!value) return true;
      const numValue = parseGermanNumber(value);
      return numValue <= 0;
    };

    // Helper function to validate if a date is in the future
    const isDateInFuture = (dateString: string): boolean => {
      if (!dateString) return true; // Empty dates are handled by required validation
      const inputDate = new Date(dateString);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
      return inputDate > today;
    };

    // Helper function to get person title
    const getPersonTitle = (person: any, index: number, isMainApplicant: boolean = false): string => {
      if (isMainApplicant) {
        if (person.firstname && person.lastname) {
          return `${person.firstname} ${person.lastname}`;
        }
        return 'Hauptantragsteller';
      } else {
        if (person.firstName && person.lastName) {
          return `${person.firstName} ${person.lastName}`;
        }
        return `Person ${index + 2}`;
      }
    };



    // Main applicant validation
    if (userData && financialData) {
      // Check if main applicant has noIncome set to true
      if (userData.noIncome === true) {
        // Skip validation for main applicant if they have no income
        return sections;
      }

      const personTitle = getPersonTitle(userData, 0, true);

      // Section 1: Nettoeinkommen
      const section1Errors: string[] = [];
      if (financialData.hasSalaryIncome === null) {
        section1Errors.push('Bitte geben Sie an, ob Sie Einkünfte aus nichtselbstständiger Arbeit erzielen');
      }
      if (financialData.hasSalaryIncome === true) {
        validateCurrencyField(financialData.monthlynetsalary, 'Lohn/Gehalt: Monatliches Nettoeinkommen', section1Errors);
        validateCurrencyField(financialData.wheinachtsgeld_next12_net, 'Weihnachtsgeld: Jahresbetrag', section1Errors);
        validateCurrencyField(financialData.urlaubsgeld_next12_net, 'Urlaubsgeld: Jahresbetrag', section1Errors);
        
        // Validate sonstige beträge
        if (financialData.otheremploymentmonthlynetincome && Array.isArray(financialData.otheremploymentmonthlynetincome)) {
          financialData.otheremploymentmonthlynetincome.forEach((item: any, idx: number) => {
            if (!item.type) {
              section1Errors.push(`Sonstige Beträge ${idx + 1}: Art des Betrags fehlt`);
            }
            if (isCurrencyEmptyOrZero(item.amount)) {
              section1Errors.push(`Sonstige Beträge ${idx + 1}: Jahresbetrag fehlt oder ist 0`);
            }
          });
        }
      }

      // Validate weitere Einkünfte (Section 1.2)
      if (financialData.hasbusinessincome && 
          isCurrencyEmptyOrZero(financialData.yearlybusinessnetincome) && 
          isCurrencyEmptyOrZero(financialData.yearlyselfemployednetincome)) {
        section1Errors.push('Summe aus Gewerbebetrieb/selbstständiger Arbeit muss größer als 0 sein');
      }
      if (financialData.hasagricultureincome && isCurrencyEmptyOrZero(financialData.incomeagriculture_net)) {
        section1Errors.push('Land- und Forstwirtschaft: Jahresbetrag fehlt oder ist 0');
      }
      if (financialData.hascapitalincome && isCurrencyEmptyOrZero(financialData.yearlycapitalnetincome)) {
        section1Errors.push('Kapitalvermögen: Jahresbetrag fehlt oder ist 0');
      }
      if (financialData.hasrentincome && isCurrencyEmptyOrZero(financialData.incomerent_net)) {
        section1Errors.push('Vermietung und Verpachtung: Jahresbetrag fehlt oder ist 0');
      }

      // Section 2: Bezüge und Weitere Einkünfte
      const section2Errors: string[] = [];
      if (financialData.haspensionincome === null) {
        section2Errors.push('Bitte geben Sie an, ob Sie Rentenbezüge/Versorgungsbezüge beziehen');
      }
      if (financialData.haspensionincome === true) {
        const pensionRows = (financialData.pensionmonthlynetincome && financialData.pensionmonthlynetincome.length > 0)
          ? financialData.pensionmonthlynetincome
          : [{ type: '', amount: '' }];
        pensionRows.forEach((item: any, idx: number) => {
          if (!item.type) {
            section2Errors.push(`Rentenart ${idx + 1}: Rentenart fehlt`);
          }
          if (isCurrencyEmptyOrZero(item.amount)) {
            section2Errors.push(`Rentenart ${idx + 1}: Monatliches Nettoeinkommen fehlt oder ist 0`);
          }
        });
      }

      // Validate weitere Einkünfte 2 (Section 2.2)
      if (financialData.haskindergeldincome && isCurrencyEmptyOrZero(financialData.monthlykindergeldnetincome)) {
        section2Errors.push('Kindergeld: Monatliches Nettoeinkommen fehlt oder ist 0');
      }
      if (financialData.haspflegegeldincome && isCurrencyEmptyOrZero(financialData.monthlypflegegeldnetincome)) {
        section2Errors.push('Pflegegeld: Monatliches Nettoeinkommen fehlt oder ist 0');
      }
      if (financialData.hastaxfreeunterhaltincome && isCurrencyEmptyOrZero(financialData.incomeunterhalttaxfree)) {
        section2Errors.push('Unterhaltsleistungen steuerfrei: Monatliches Nettoeinkommen fehlt oder ist 0');
      }
      if (financialData.hastaxableunterhaltincome && isCurrencyEmptyOrZero(financialData.incomeunterhalttaxable_net)) {
        section2Errors.push('Unterhaltsleistungen steuerpflichtig: Monatliches Nettoeinkommen fehlt oder ist 0');
      }
      if (financialData.haselterngeldincome && isCurrencyEmptyOrZero(financialData.monthlyelterngeldnetincome)) {
        section2Errors.push('Elterngeld/Erziehungsgeld: Monatliches Nettoeinkommen fehlt oder ist 0');
  }
      if (financialData.hasothernetincome) {
        const otherIncome = financialData.othermonthlynetincome || [];
        const itemsToValidate = otherIncome.length > 0 ? otherIncome : [{ type: '', amount: '' }];
        itemsToValidate.forEach((item: any, idx: number) => {
          if (!item.type) {
            section2Errors.push(`Sonstiges Einkommen ${idx + 1}: Art des Einkommens fehlt`);
          }
          if (isCurrencyEmptyOrZero(item.amount)) {
            section2Errors.push(`Sonstiges Einkommen ${idx + 1}: Monatliches Nettoeinkommen fehlt oder ist 0`);
          }
        });
      }

      // Section 3: Monatliche Belastungen
      const section3Errors: string[] = [];
      
      // Validate taxes and contributions
      if (financialData.betragotherinsurancetaxexpenses && Array.isArray(financialData.betragotherinsurancetaxexpenses)) {
        financialData.betragotherinsurancetaxexpenses.forEach((item: any, idx: number) => {
          if (!item.type) {
            section3Errors.push(`Steuer/Beitrag ${idx + 1}: Art der Steuer bzw. Beitrag fehlt`);
          }
          if (isCurrencyEmptyOrZero(item.amount)) {
            section3Errors.push(`Steuer/Beitrag ${idx + 1}: Monatlicher Betrag fehlt oder ist 0`);
          }
        });
      }

      // Validate loans
      if (financialData.ispayingloans === null) {
        section3Errors.push('Bitte geben Sie an, ob Sie laufende Kredite haben');
      }
      if (financialData.ispayingloans === true) {
        const loanRows = (financialData.loans && financialData.loans.length > 0)
          ? financialData.loans
          : [{ description: '', duration: '', amount: '' }];
        loanRows.forEach((item: any, idx: number) => {
          if (!item.description) {
            section3Errors.push(`Kredit ${idx + 1}: Kredit Beschreibung fehlt`);
          }
          if (!item.duration) {
            section3Errors.push(`Kredit ${idx + 1}: Laufzeit bis fehlt`);
          } else if (!isDateInFuture(item.duration)) {
            section3Errors.push(`Kredit ${idx + 1}: Laufzeit bis muss in der Zukunft liegen`);
          }
          if (isCurrencyEmptyOrZero(item.amount)) {
            section3Errors.push(`Kredit ${idx + 1}: Monatlicher Betrag fehlt oder ist 0`);
          }
        });
      }

      // Validate zwischenkredit
      if (financialData.ispayingzwischenkredit === null) {
        section3Errors.push('Bitte geben Sie an, ob Sie einen laufenden Zwischenkredit für Bauspardarlehen haben');
      }
      if (financialData.ispayingzwischenkredit === true) {
        const zwischenRows = (financialData.zwischenkredit && financialData.zwischenkredit.length > 0)
          ? financialData.zwischenkredit
          : [{ duration: '', amount: '' }];
        zwischenRows.forEach((item: any, idx: number) => {
          if (!item.duration) {
            section3Errors.push(`Zwischenkredit: Laufzeit bis fehlt`);
          } else if (!isDateInFuture(item.duration)) {
            section3Errors.push(`Zwischenkredit: Laufzeit bis muss in der Zukunft liegen`);
          }
          if (isCurrencyEmptyOrZero(item.amount)) {
            section3Errors.push(`Zwischenkredit: Monatlicher Betrag fehlt oder ist 0`);
          }
        });
      }

      // Validate unterhalt
      if (financialData.ispayingunterhalt === null) {
        section3Errors.push('Bitte geben Sie an, ob Sie Unterhalt zahlen');
      }
      if (financialData.ispayingunterhalt === true && financialData.unterhaltszahlungenTotal) {
        financialData.unterhaltszahlungenTotal.forEach((item: any, idx: number) => {
          if (!item.duration) {
            section3Errors.push(`Unterhalt: Laufzeit bis fehlt`);
          } else if (!isDateInFuture(item.duration)) {
            section3Errors.push(`Unterhalt: Laufzeit bis muss in der Zukunft liegen`);
          }
          if (isCurrencyEmptyOrZero(item.amountTotal)) {
            section3Errors.push(`Unterhalt: Monatlicher Betrag fehlt oder ist 0`);
          }
        });
      }

      // Validate other payment obligations
      if (financialData.hasotherzahlungsverpflichtung === null) {
        section3Errors.push('Bitte geben Sie an, ob Sie sonstige Zahlungsverpflichtungen haben');
      }
      if (financialData.hasotherzahlungsverpflichtung === true && financialData.otherzahlungsverpflichtung) {
        financialData.otherzahlungsverpflichtung.forEach((item: any, idx: number) => {
          if (!item.type) {
            section3Errors.push(`Zahlungsverpflichtung ${idx + 1}: Art der Zahlungsverpflichtung fehlt`);
          }
          if (!item.duration) {
            section3Errors.push(`Zahlungsverpflichtung ${idx + 1}: Laufzeit bis fehlt`);
          } else if (!isDateInFuture(item.duration)) {
            section3Errors.push(`Zahlungsverpflichtung ${idx + 1}: Laufzeit bis muss in der Zukunft liegen`);
          }
          if (isCurrencyEmptyOrZero(item.amount)) {
            section3Errors.push(`Zahlungsverpflichtung ${idx + 1}: Monatlicher Betrag fehlt oder ist 0`);
          }
        });
      }

      // Validate Bausparverträge
      if (financialData.hasBausparvertraege === null) {
        section3Errors.push('Bitte geben Sie an, ob Sie monatlich Sparraten für Bausparverträge zahlen');
      }
      if (financialData.hasBausparvertraege === true) {
        if (!financialData.institutbausparvertraege) {
          section3Errors.push('Bausparverträge: Institut fehlt');
        }
        if (isCurrencyEmptyOrZero(financialData.sparratebausparvertraege)) {
          section3Errors.push('Bausparverträge: Monatlicher Betrag fehlt oder ist 0');
        }
      }

      // Validate Rentenversicherung
      if (financialData.hasRentenversicherung === null) {
        section3Errors.push('Bitte geben Sie an, ob Sie monatlich Prämien für Kapitallebens- und Rentenversicherungen zahlen');
      }
      if (financialData.hasRentenversicherung === true) {
        if (!financialData.institutkapitalrentenversicherung) {
          section3Errors.push('Rentenversicherung: Institut fehlt');
        }
        if (isCurrencyEmptyOrZero(financialData.praemiekapitalrentenversicherung)) {
          section3Errors.push('Rentenversicherung: Monatlicher Betrag fehlt oder ist 0');
        }
      }

      // Section 4: Weitere Angaben
      const section4Errors: string[] = [];
      // No required fields in section 4, but hasbuergschaft is optional

      // Add main applicant sections
      sections.push(createValidationSection(`selbstauskunft-${personTitle.replace(/\s+/g, '')}-section1`, `${personTitle}: Nettoeinkommen`, section1Errors, []));
      sections.push(createValidationSection(`selbstauskunft-${personTitle.replace(/\s+/g, '')}-section2`, `${personTitle}: Bezüge und Weitere Einkünfte`, section2Errors, []));
      sections.push(createValidationSection(`selbstauskunft-${personTitle.replace(/\s+/g, '')}-section3`, `${personTitle}: Monatliche Belastungen`, section3Errors, []));
      sections.push(createValidationSection(`selbstauskunft-${personTitle.replace(/\s+/g, '')}-section4`, `${personTitle}: Weitere Angaben`, section4Errors, []));
    }

    // Additional applicants validation
    if (financialData?.additional_applicants_financials && userData?.weitere_antragstellende_personen) {
      const additionalFinancials = financialData.additional_applicants_financials;
      const additionalPersons = userData.weitere_antragstellende_personen;
      
      // Handle both array and object formats for backwards compatibility
      let personEntries: Array<[string, any]>;
      if (Array.isArray(additionalPersons)) {
        personEntries = additionalPersons.map((person: any, index: number) => [index.toString(), person]);
      } else {
        personEntries = Object.entries(additionalPersons);
      }
      
      personEntries.forEach((entry, index) => {
        const [uuid, person] = entry;
        const applicantFinancials = additionalFinancials[uuid];
        if (!applicantFinancials) return;

        // Check if additional applicant has noIncome set to true
        if (person.noIncome === true) {
          // Skip validation for this additional applicant if they have no income
          return;
        }

        const personTitle = getPersonTitle(person, index);

        // Section 1: Nettoeinkommen
        const section1Errors: string[] = [];
        if (applicantFinancials.hasSalaryIncome === null) {
          section1Errors.push('Bitte geben Sie an, ob Sie Einkünfte aus nichtselbstständiger Arbeit erzielen');
        }
        if (applicantFinancials.hasSalaryIncome === true) {
          validateCurrencyField(applicantFinancials.monthlynetsalary, 'Lohn/Gehalt: Monatliches Nettoeinkommen', section1Errors);
          validateCurrencyField(applicantFinancials.wheinachtsgeld_next12_net, 'Weihnachtsgeld: Jahresbetrag', section1Errors);
          validateCurrencyField(applicantFinancials.urlaubsgeld_next12_net, 'Urlaubsgeld: Jahresbetrag', section1Errors);
          
          // Validate sonstige beträge
          if (applicantFinancials.otheremploymentmonthlynetincome && Array.isArray(applicantFinancials.otheremploymentmonthlynetincome)) {
            applicantFinancials.otheremploymentmonthlynetincome.forEach((item: any, idx: number) => {
              if (!item.type) {
                section1Errors.push(`Sonstige Beträge ${idx + 1}: Art des Betrags fehlt`);
              }
              if (isCurrencyEmptyOrZero(item.amount)) {
                section1Errors.push(`Sonstige Beträge ${idx + 1}: Jahresbetrag fehlt oder ist 0`);
              }
            });
          }
        }

        // Validate weitere Einkünfte (Section 1.2)
        if (applicantFinancials.hasbusinessincome && 
            isCurrencyEmptyOrZero(applicantFinancials.yearlybusinessnetincome) && 
            isCurrencyEmptyOrZero(applicantFinancials.yearlyselfemployednetincome)) {
          section1Errors.push('Summe aus Gewerbebetrieb/selbstständiger Arbeit muss größer als 0 sein');
        }
        if (applicantFinancials.hasagricultureincome && isCurrencyEmptyOrZero(applicantFinancials.incomeagriculture_net)) {
          section1Errors.push('Land- und Forstwirtschaft: Jahresbetrag fehlt oder ist 0');
        }
        if (applicantFinancials.hascapitalincome && isCurrencyEmptyOrZero(applicantFinancials.yearlycapitalnetincome)) {
          section1Errors.push('Kapitalvermögen: Jahresbetrag fehlt oder ist 0');
        }
        if (applicantFinancials.hasrentincome && isCurrencyEmptyOrZero(applicantFinancials.incomerent_net)) {
          section1Errors.push('Vermietung und Verpachtung: Jahresbetrag fehlt oder ist 0');
        }

        // Section 2: Bezüge und Weitere Einkünfte
        const section2Errors: string[] = [];
        if (applicantFinancials.haspensionincome === null) {
          section2Errors.push('Bitte geben Sie an, ob Sie Rentenbezüge/Versorgungsbezüge beziehen');
        }
        if (applicantFinancials.haspensionincome === true) {
          const pensionRows = (applicantFinancials.pensionmonthlynetincome && applicantFinancials.pensionmonthlynetincome.length > 0)
            ? applicantFinancials.pensionmonthlynetincome
            : [{ type: '', amount: '' }];
          pensionRows.forEach((item: any, idx: number) => {
            if (!item.type) {
              section2Errors.push(`Rentenart ${idx + 1}: Rentenart fehlt`);
            }
            if (isCurrencyEmptyOrZero(item.amount)) {
              section2Errors.push(`Rentenart ${idx + 1}: Monatliches Nettoeinkommen fehlt oder ist 0`);
            }
          });
        }

        // Validate weitere Einkünfte 2 (Section 2.2)
        if (applicantFinancials.haskindergeldincome && isCurrencyEmptyOrZero(applicantFinancials.monthlykindergeldnetincome)) {
          section2Errors.push('Kindergeld: Monatliches Nettoeinkommen fehlt oder ist 0');
        }
        if (applicantFinancials.haspflegegeldincome && isCurrencyEmptyOrZero(applicantFinancials.monthlypflegegeldnetincome)) {
          section2Errors.push('Pflegegeld: Monatliches Nettoeinkommen fehlt oder ist 0');
        }
        if (applicantFinancials.hastaxfreeunterhaltincome && isCurrencyEmptyOrZero(applicantFinancials.incomeunterhalttaxfree)) {
          section2Errors.push('Unterhaltsleistungen steuerfrei: Monatliches Nettoeinkommen fehlt oder ist 0');
        }
        if (applicantFinancials.hastaxableunterhaltincome && isCurrencyEmptyOrZero(applicantFinancials.incomeunterhalttaxable_net)) {
          section2Errors.push('Unterhaltsleistungen steuerpflichtig: Monatliches Nettoeinkommen fehlt oder ist 0');
        }
        if (applicantFinancials.haselterngeldincome && isCurrencyEmptyOrZero(applicantFinancials.monthlyelterngeldnetincome)) {
          section2Errors.push('Elterngeld/Erziehungsgeld: Monatliches Nettoeinkommen fehlt oder ist 0');
        }
        if (applicantFinancials.hasothernetincome) {
          const otherIncome = applicantFinancials.othermonthlynetincome || [];
          const itemsToValidate = otherIncome.length > 0 ? otherIncome : [{ type: '', amount: '' }];
          itemsToValidate.forEach((item: any, idx: number) => {
            if (!item.type) {
              section2Errors.push(`Sonstiges Einkommen ${idx + 1}: Art des Einkommens fehlt`);
            }
            if (isCurrencyEmptyOrZero(item.amount)) {
              section2Errors.push(`Sonstiges Einkommen ${idx + 1}: Monatliches Nettoeinkommen fehlt oder ist 0`);
            }
          });
        }

        // Section 3: Monatliche Belastungen
        const section3Errors: string[] = [];
        
        // Validate taxes and contributions
        if (applicantFinancials.betragotherinsurancetaxexpenses && Array.isArray(applicantFinancials.betragotherinsurancetaxexpenses)) {
          applicantFinancials.betragotherinsurancetaxexpenses.forEach((item: any, idx: number) => {
            if (!item.type) {
              section3Errors.push(`Steuer/Beitrag ${idx + 1}: Art der Steuer bzw. Beitrag fehlt`);
            }
            if (isCurrencyEmptyOrZero(item.amount)) {
              section3Errors.push(`Steuer/Beitrag ${idx + 1}: Monatlicher Betrag fehlt oder ist 0`);
            }
          });
        }

        // Validate loans
        if (applicantFinancials.ispayingloans === null) {
          section3Errors.push('Bitte geben Sie an, ob Sie laufende Kredite haben');
        }
        if (applicantFinancials.ispayingloans === true) {
          const loanRows = (applicantFinancials.loans && applicantFinancials.loans.length > 0)
            ? applicantFinancials.loans
            : [{ description: '', duration: '', amount: '' }];
          loanRows.forEach((item: any, idx: number) => {
            if (!item.description) {
              section3Errors.push(`Kredit ${idx + 1}: Kredit Beschreibung fehlt`);
            }
            if (!item.duration) {
              section3Errors.push(`Kredit ${idx + 1}: Laufzeit bis fehlt`);
            } else if (!isDateInFuture(item.duration)) {
              section3Errors.push(`Kredit ${idx + 1}: Laufzeit bis muss in der Zukunft liegen`);
            }
            if (isCurrencyEmptyOrZero(item.amount)) {
              section3Errors.push(`Kredit ${idx + 1}: Monatlicher Betrag fehlt oder ist 0`);
            }
          });
        }

        // Validate zwischenkredit
        if (applicantFinancials.ispayingzwischenkredit === null) {
          section3Errors.push('Bitte geben Sie an, ob Sie einen laufenden Zwischenkredit für Bauspardarlehen haben');
        }
        if (applicantFinancials.ispayingzwischenkredit === true) {
          const zwischenRows = (applicantFinancials.zwischenkredit && applicantFinancials.zwischenkredit.length > 0)
            ? applicantFinancials.zwischenkredit
            : [{ duration: '', amount: '' }];
          zwischenRows.forEach((item: any, idx: number) => {
            if (!item.duration) {
              section3Errors.push(`Zwischenkredit: Laufzeit bis fehlt`);
            } else if (!isDateInFuture(item.duration)) {
              section3Errors.push(`Zwischenkredit: Laufzeit bis muss in der Zukunft liegen`);
            }
            if (isCurrencyEmptyOrZero(item.amount)) {
              section3Errors.push(`Zwischenkredit: Monatlicher Betrag fehlt oder ist 0`);
            }
          });
        }

        // Validate unterhalt
        if (applicantFinancials.ispayingunterhalt === null) {
          section3Errors.push('Bitte geben Sie an, ob Sie Unterhalt zahlen');
        }
        if (applicantFinancials.ispayingunterhalt === true && applicantFinancials.unterhaltszahlungenTotal) {
          applicantFinancials.unterhaltszahlungenTotal.forEach((item: any, idx: number) => {
            if (!item.duration) {
              section3Errors.push(`Unterhalt: Laufzeit bis fehlt`);
            } else if (!isDateInFuture(item.duration)) {
              section3Errors.push(`Unterhalt: Laufzeit bis muss in der Zukunft liegen`);
            }
            if (isCurrencyEmptyOrZero(item.amountTotal)) {
              section3Errors.push(`Unterhalt: Monatlicher Betrag fehlt oder ist 0`);
            }
          });
        }

        // Validate other payment obligations
        if (applicantFinancials.hasotherzahlungsverpflichtung === null) {
          section3Errors.push('Bitte geben Sie an, ob Sie sonstige Zahlungsverpflichtungen haben');
        }
        if (applicantFinancials.hasotherzahlungsverpflichtung === true && applicantFinancials.otherzahlungsverpflichtung) {
          applicantFinancials.otherzahlungsverpflichtung.forEach((item: any, idx: number) => {
            if (!item.type) {
              section3Errors.push(`Zahlungsverpflichtung ${idx + 1}: Art der Zahlungsverpflichtung fehlt`);
            }
            if (!item.duration) {
              section3Errors.push(`Zahlungsverpflichtung ${idx + 1}: Laufzeit bis fehlt`);
            } else if (!isDateInFuture(item.duration)) {
              section3Errors.push(`Zahlungsverpflichtung ${idx + 1}: Laufzeit bis muss in der Zukunft liegen`);
            }
            if (isCurrencyEmptyOrZero(item.amount)) {
              section3Errors.push(`Zahlungsverpflichtung ${idx + 1}: Monatlicher Betrag fehlt oder ist 0`);
            }
          });
        }

        // Validate Bausparverträge
        if (applicantFinancials.hasBausparvertraege === null) {
          section3Errors.push('Bitte geben Sie an, ob Sie monatlich Sparraten für Bausparverträge zahlen'); 
        }
        if (applicantFinancials.hasBausparvertraege === true) {
          if (!applicantFinancials.institutbausparvertraege) {
            section3Errors.push('Bausparverträge: Institut fehlt');
          }
          if (isCurrencyEmptyOrZero(applicantFinancials.sparratebausparvertraege)) {
            section3Errors.push('Bausparverträge: Monatlicher Betrag fehlt oder ist 0');
          }
        }

        // Validate Rentenversicherung
        if (applicantFinancials.hasRentenversicherung === null) {
          section3Errors.push('Bitte geben Sie an, ob Sie monatlich Prämien für Kapitallebens- und Rentenversicherungen zahlen');
        }
        if (applicantFinancials.hasRentenversicherung === true) {
          if (!applicantFinancials.institutkapitalrentenversicherung) {
            section3Errors.push('Rentenversicherung: Institut fehlt');
          }
          if (isCurrencyEmptyOrZero(applicantFinancials.praemiekapitalrentenversicherung)) {
            section3Errors.push('Rentenversicherung: Monatlicher Betrag fehlt oder ist 0');
          }
        }

        // Section 4: Weitere Angaben
        const section4Errors: string[] = [];
        // No required fields in section 4, but hasbuergschaft is optional

        // Add additional applicant sections
        sections.push(createValidationSection(`selbstauskunft-${personTitle.replace(/\s+/g, '')}-section1`, `${personTitle}: Nettoeinkommen`, section1Errors, []));
        sections.push(createValidationSection(`selbstauskunft-${personTitle.replace(/\s+/g, '')}-section2`, `${personTitle}: Bezüge und Weitere Einkünfte`, section2Errors, []));
        sections.push(createValidationSection(`selbstauskunft-${personTitle.replace(/\s+/g, '')}-section3`, `${personTitle}: Monatliche Belastungen`, section3Errors, []));
        sections.push(createValidationSection(`selbstauskunft-${personTitle.replace(/\s+/g, '')}-section4`, `${personTitle}: Weitere Angaben`, section4Errors, []));
      });
    }

    return sections;
  }

  private validateSelbsthilfe(data: any): ValidationSection[] {
    const sections: ValidationSection[] = [];

    if (!data) {
      sections.push(createValidationSection('selbsthilfe-allgemein', 'Allgemein', ['Selbsthilfe-Daten nicht gefunden'], []));
      return sections;
    }

    const { userData, objectData, financeData } = data;
    const selbsthilfeData = objectData?.selbsthilfe_angaben;

    // Initialize error arrays for each section
    const allgemeinErrors: string[] = [];
    const aufstellungErrors: string[] = [];
    const helferErrors: string[] = [];

    // Check if will provide self help is answered
    if (!selbsthilfeData || selbsthilfeData.willProvideSelfHelp === null || selbsthilfeData.willProvideSelfHelp === undefined) {
      allgemeinErrors.push('Es wurde nicht angegeben, ob Selbsthilfeleistungen erbracht werden');
    } else if (financeData?.selbsthilfe !== null && financeData.selbsthilfe > 0 && selbsthilfeData.willProvideSelfHelp === false) {
      // Check for inconsistency with Hauptantrag selbsthilfe amount
      const formatCurrency = (value: number): string => {
        return new Intl.NumberFormat('de-DE', {
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: 2
        }).format(value);
      };
      allgemeinErrors.push(`Im Hauptantrag wurde ein Selbsthilfe-Betrag von ${formatCurrency(financeData.selbsthilfe)} angegeben, aber es wurde "Nein" bei Selbsthilfeleistungen gewählt.`);
    }

    // If providing self help, validate the rest
    if (selbsthilfeData?.willProvideSelfHelp === true) {
      // Check if main applicant will help is answered
      if (selbsthilfeData.mainApplicantWillHelp === null || selbsthilfeData.mainApplicantWillHelp === undefined) {
        allgemeinErrors.push('Es wurde nicht angegeben, ob sich der Hauptantragsteller an den Selbsthilfeleistungen beteiligt');
      }

      // Address validation
      if (!objectData?.obj_street?.trim()) {
        allgemeinErrors.push('Straße des Förderobjekts fehlt');
      }
      if (!objectData?.obj_house_number?.trim()) {
        allgemeinErrors.push('Hausnummer des Förderobjekts fehlt');
      }
      if (!objectData?.obj_postal_code?.trim()) {
        allgemeinErrors.push('Postleitzahl des Förderobjekts fehlt');
      } else if (!/^\d{5}$/.test(objectData.obj_postal_code)) {
        allgemeinErrors.push('Die Postleitzahl des Förderobjekts ist ungültig (muss 5 Ziffern haben)');
      }
      if (!objectData?.obj_city?.trim()) {
        allgemeinErrors.push('Ort des Förderobjekts fehlt');
      }

      // Cost validation
      const costBreakdown = selbsthilfeData?.costBreakdown;
      const JOB_TYPES = [
        { key: 'erdarbeiten', label: '1.1 Erdarbeiten', number: '1.1' },
        { key: 'maurerarbeiten', label: '1.2 Maurerarbeiten Fundamente', number: '1.2' },
        { key: 'putzStuck', label: '1.3 Putz- und Stuckarbeiten', number: '1.3' },
        { key: 'fliesenPlatten', label: '1.4 Fliesen- und Plattenarbeiten', number: '1.4' },
        { key: 'zimmererarbeiten', label: '1.5 Zimmererarbeiten', number: '1.5' },
        { key: 'dachdeckerarbeiten', label: '1.6 Dachdeckerarbeiten', number: '1.6' },
        { key: 'klempnerarbeiten', label: '1.7 Klempnerarbeiten', number: '1.7' },
        { key: 'tischlerarbeiten', label: '1.8 Tischlerarbeiten', number: '1.8' },
        { key: 'schlosserarbeiten', label: '1.9 Schlosserarbeiten', number: '1.9' },
        { key: 'anstrichTapezier', label: '1.10 Anstrich- und Tapezierarbeiten', number: '1.10' },
        { key: 'zentralheizung', label: '1.11 Zentralheizungen', number: '1.11' },
        { key: 'sanitaer', label: '1.12 Sanitäre Installation', number: '1.12' },
        { key: 'fussboden', label: '1.13 Fußboden, Teppichbelag', number: '1.13' },
        { key: 'elektro', label: '1.14 Elektroarbeiten', number: '1.14' },
        { key: 'sonstige', label: '1.15 Sonstige Gebäudearbeiten', number: '1.15', isEditable: true },
        { key: 'gartenanlagen', label: '2.1 Gartenanlagen', number: '2.1' },
        { key: 'wegeflaeche', label: '2.2 Wegefläche/Terrasse', number: '2.2' },
        { key: 'sonstigeAussen1', label: '2.3 Sonstige Außenanlagen', number: '2.3', isEditable: true },
        { key: 'sonstigeAussen2', label: '2.4 Weitere Außenanlagen', number: '2.4', isEditable: true },
        { key: 'architektur', label: '3.1 Architekturleistungen', number: '3.1' },
        { key: 'verwaltung', label: '3.2 Verwaltungsleistungen', number: '3.2' },
        { key: 'sonstigeBaunebenkosten1', label: '3.3 Sonstige Baunebenkosten', number: '3.3', isEditable: true },
        { key: 'sonstigeBaunebenkosten2', label: '3.4 Weitere Baunebenkosten', number: '3.4', isEditable: true }
      ];
      
      if (costBreakdown) {
        const hasAnySelbsthilfe = JOB_TYPES.some(jobType => {
          const entry = costBreakdown[jobType.key as keyof typeof costBreakdown];
          return entry?.selbsthilfe && entry.selbsthilfe.trim();
        });

        if (!hasAnySelbsthilfe) {
          aufstellungErrors.push('Es müssen mindestens für eine Arbeitsart Selbsthilfekosten angegeben werden');
        }

        // Validate individual cost fields
        JOB_TYPES.forEach(jobType => {
          const entry = costBreakdown[jobType.key as keyof typeof costBreakdown];
          if (!entry) return;

          const hasDescription = (entry as any).description && (entry as any).description.trim();
          const hasMaterialkosten = entry.materialkosten && entry.materialkosten.trim();
          const hasLohnkosten = entry.lohnkosten && entry.lohnkosten.trim();
          const hasSelbsthilfe = entry.selbsthilfe && entry.selbsthilfe.trim();
          
          const hasAnyValue = hasDescription || hasMaterialkosten || hasLohnkosten || hasSelbsthilfe;
          
          if (hasAnyValue) {
            if (jobType.isEditable && !hasDescription) {
              aufstellungErrors.push(`${jobType.label}: Beschreibung fehlt`);
            }
            if (!hasMaterialkosten) {
              aufstellungErrors.push(`${jobType.label}: Materialkosten fehlen`);
            }
            if (!hasLohnkosten) {
              aufstellungErrors.push(`${jobType.label}: Lohnkosten fehlen`);
            }
            if (!hasSelbsthilfe) {
              aufstellungErrors.push(`${jobType.label}: Selbsthilfe-Angabe fehlt`);
            }
            
            // Check cost logic
            if (hasMaterialkosten && hasLohnkosten && hasSelbsthilfe) {
              const parseCurrencyValue = (value: any): number => {
                if (!value) return 0;
                if (typeof value === 'number') return value / 100;
                if (typeof value === 'string') {
                  return Number(value.replace(/[^0-9]/g, '')) / 100 || 0;
                }
                return 0;
              };
              
              const materialkosten = parseCurrencyValue(entry.materialkosten);
              const lohnkosten = parseCurrencyValue(entry.lohnkosten);
              const selbsthilfe = parseCurrencyValue(entry.selbsthilfe);
              
              if (selbsthilfe > 0 && (materialkosten + lohnkosten) < selbsthilfe) {
                const formatCurrency = (value: number): string => {
                  return new Intl.NumberFormat('de-DE', {
                    style: 'currency',
                    currency: 'EUR',
                    minimumFractionDigits: 2
                  }).format(value);
                };
                aufstellungErrors.push(`${jobType.label}: Selbsthilfe (${formatCurrency(selbsthilfe)}) ist höher als Material- und Lohnkosten zusammen (${formatCurrency(materialkosten + lohnkosten)})`);
              }
            }
          }
        });

        // Check if total Selbsthilfe matches Hauptantrag amount
        if (financeData?.selbsthilfe !== null && financeData.selbsthilfe !== undefined) {
          const totalSelbsthilfe = selbsthilfeData.totals?.totalSelbsthilfe || 0;
          if (totalSelbsthilfe !== financeData.selbsthilfe) {
            const formatCurrency = (value: number): string => {
              return new Intl.NumberFormat('de-DE', {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: 2
              }).format(value);
            };
            aufstellungErrors.push(`Die Gesamtsumme der Selbsthilfeleistungen (${formatCurrency(totalSelbsthilfe)}) weicht von der Angabe im Hauptantrag ab (${formatCurrency(financeData.selbsthilfe)})`);
          }
        }
      }

      // Validate helpers
      const helpers = objectData?.selbsthilfe_helfer || [];
      helpers.forEach((helper: any, index: number) => {
        // Skip main applicant if they won't help
        if (index === 0 && selbsthilfeData.mainApplicantWillHelp !== true) return;
        
        const helperType = index === 0 ? 'Hauptantragsteller' : `Helfer ${index}`;
        
        const isMainApplicant = index === 0;
        
        // For main applicant, merge data from user_data and selbsthilfe_helfer
        let helperData = helper;
        if (isMainApplicant && userData) {
          helperData = {
            ...helper,
            name: userData.firstname || '',
            surname: userData.lastname || '',
            email: userData.email || '',
            jobTitle: userData.employment_title || '',
            address: {
              street: userData.person_street || '',
              houseNumber: userData.person_housenumber || '',
              postalCode: userData.person_postalcode || '',
              city: userData.person_city || ''
            }
          };
        }
        
        // Check if helper has any data entered OR if it's the main applicant
        const hasAnyData = helperData.name?.trim() || helperData.surname?.trim() || helperData.email?.trim() || 
                          helperData.jobTitle?.trim() || helperData.jobNumbers?.length > 0 || helperData.hours?.trim();
        
        // For main applicant, always validate if they will help. For others, only validate if they have data
        if (isMainApplicant || hasAnyData) {
          if (!helperData.name?.trim()) {
            helferErrors.push(`${helperType}: Vorname fehlt`);
          }
          if (!helperData.surname?.trim()) {
            helferErrors.push(`${helperType}: Nachname fehlt`);
          }
          if (!helperData.email?.trim()) {
            helferErrors.push(`${helperType}: E-Mail-Adresse fehlt`);
          } else if (!isValidEmail(helperData.email)) {
            helferErrors.push(`${helperType}: Bitte geben Sie eine gültige E-Mail-Adresse ein`);
          }
          if (!helperData.jobTitle?.trim()) {
            helferErrors.push(`${helperType}: Berufsangabe fehlt`);
          }
          if (!helperData.jobNumbers || helperData.jobNumbers.length === 0) {
            helferErrors.push(`${helperType}: Keine Arbeitsnummern ausgewählt`);
          }
          if (!helperData.hours?.trim()) {
            helferErrors.push(`${helperType}: Stundenanzahl fehlt`);
          }

          // Address validation
          if (!helperData.address?.street?.trim()) {
            helferErrors.push(`${helperType}: Straße der Adresse fehlt`);
          }
          if (!helperData.address?.houseNumber?.trim()) {
            helferErrors.push(`${helperType}: Hausnummer der Adresse fehlt`);
          }
          if (!helperData.address?.postalCode?.trim()) {
            helferErrors.push(`${helperType}: Postleitzahl der Adresse fehlt`);
          } else if (!/^\d{5}$/.test(helperData.address.postalCode)) {
            helferErrors.push(`${helperType}: Postleitzahl der Adresse ist ungültig`);
          }
          if (!helperData.address?.city?.trim()) {
            helferErrors.push(`${helperType}: Ort der Adresse fehlt`);
          }

          // Check if selected job numbers have corresponding costs defined
          if (helperData.jobNumbers) {
            helperData.jobNumbers.forEach((jobNumber: string) => {
              const jobType = JOB_TYPES.find(jt => jt.number === jobNumber);
              if (jobType && costBreakdown) {
                const entry = costBreakdown[jobType.key as keyof typeof costBreakdown];
                const hasSelbsthilfe = entry?.selbsthilfe && entry.selbsthilfe.trim();
                if (!hasSelbsthilfe) {
                  helferErrors.push(`${helperType}: Für ausgewählte Arbeit "${jobType.label}" sind keine Selbsthilfekosten definiert`);
                }
              }
            });
          }
        }
      });
    }

    // Create sections for each category
    sections.push(createValidationSection('selbsthilfe-allgemein', 'Allgemein', allgemeinErrors, []));
    sections.push(createValidationSection('selbsthilfe-aufstellung', 'Aufstellung Selbsthilfeleistungen', aufstellungErrors, []));
    sections.push(createValidationSection('selbsthilfe-helfer', 'Angaben zu den Helfern', helferErrors, []));

    return sections;
  }

  private validateDin277(data: any): ValidationSection {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data || !data.objectData) {
      errors.push('DIN 277-Daten nicht gefunden');
      return createValidationSection('din277', 'Berechnung des Brutto-Rauminhalts des Gebäudes nach DIN 277', errors, warnings);
    }

    // Extract the DIN 277 data from the objectData
    const din277Data = data.objectData.berechnung_din277;

    if (!din277Data) {
      errors.push('DIN 277-Berechnungsdaten nicht gefunden');
      return createValidationSection('din277', 'Berechnung des Brutto-Rauminhalts des Gebäudes nach DIN 277', errors, warnings);
    }

    // Validate that at least one building level exists
    if (!din277Data.buildingLevels || din277Data.buildingLevels.length === 0) {
      errors.push('Mindestens ein Geschoss muss angelegt werden');
    }

    // Check if any data was entered
    const hasData = din277Data.buildingLevels?.some((level: any) => 
      level.volumeElements?.length > 0 && level.volumeElements.some((element: any) => 
        element.label?.trim() || element.length_m || element.width_m || element.height_m
      )
    );

    if (!hasData) {
      errors.push('Bitte fügen Sie mindestens ein Volumenelement hinzu');
    }

    // Validate building levels
    din277Data.buildingLevels?.forEach((level: any, levelIdx: number) => {
      if (!level.name?.trim()) {
        errors.push(`Geschoss ${levelIdx + 1}: Name ist erforderlich`);
      }

      // Validate volume elements in level
      level.volumeElements?.forEach((element: any, elementIdx: number) => {
        if (!element.label?.trim()) {
          errors.push(`${level.name} - Element ${elementIdx + 1}: Bezeichnung ist erforderlich`);
        }
        
        if (!element.length_m) {
          errors.push(`${level.name} - ${element.label}: Länge ist erforderlich`);
        } else {
          // Check for zero values in length_m
          const length = parseFloat((element.length_m || '0').replace(',', '.')) || 0;
          if (length === 0) {
            errors.push(`${level.name} - ${element.label}: Länge darf nicht 0 m betragen`);
          }
        }
        
        if (!element.width_m) {
          errors.push(`${level.name} - ${element.label}: Breite ist erforderlich`);
        } else {
          // Check for zero values in width_m
          const width = parseFloat((element.width_m || '0').replace(',', '.')) || 0;
          if (width === 0) {
            errors.push(`${level.name} - ${element.label}: Breite darf nicht 0 m betragen`);
          }
        }
        
        if (element.hasSlopedRoof) {
          if (!element.traufhoehe) {
            errors.push(`${level.name} - ${element.label}: Traufhöhe ist erforderlich`);
          } else {
            // Check for zero values in traufhoehe
            const traufhoehe = parseFloat((element.traufhoehe || '0').replace(',', '.')) || 0;
            if (traufhoehe === 0) {
              errors.push(`${level.name} - ${element.label}: Traufhöhe darf nicht 0 m betragen`);
            }
          }
          
          if (!element.firsthoehe) {
            errors.push(`${level.name} - ${element.label}: Firsthöhe ist erforderlich`);
          } else {
            // Check for zero values in firsthoehe
            const firsthoehe = parseFloat((element.firsthoehe || '0').replace(',', '.')) || 0;
            if (firsthoehe === 0) {
              errors.push(`${level.name} - ${element.label}: Firsthöhe darf nicht 0 m betragen`);
            }
          }
        } else {
          if (!element.height_m) {
            errors.push(`${level.name} - ${element.label}: Höhe ist erforderlich`);
          } else {
            // Check for zero values in height_m
            const height = parseFloat((element.height_m || '0').replace(',', '.')) || 0;
            if (height === 0) {
              errors.push(`${level.name} - ${element.label}: Höhe darf nicht 0 m betragen`);
            }
          }
        }
      });
    });

    return createValidationSection('din277', 'Berechnung des Brutto-Rauminhalts des Gebäudes nach DIN 277', errors, warnings);
  }

  private validateWofiv(data: any): ValidationSection {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data || !data.objectData) {
      errors.push('WoFIV-Daten nicht gefunden');
      return createValidationSection('wofiv', 'Berechnung der Wohn- und Nutzfläche nach WoFIV', errors, warnings);
    }

    // Extract the WoFIV data from the objectData
    const wofivData = data.objectData.berechnung_woFIV;

    if (!wofivData) {
      errors.push('WoFIV-Berechnungsdaten nicht gefunden');
      return createValidationSection('wofiv', 'Berechnung der Wohn- und Nutzfläche nach WoFIV', errors, warnings);
    }

    // Validate that at least one floor exists
    if (!wofivData.wohnflaecheFloors || wofivData.wohnflaecheFloors.length === 0) {
      errors.push('Mindestens ein Geschoss muss angelegt werden');
    }

    // Check if any data was entered
    const hasWohnflaecheData = wofivData.wohnflaecheFloors?.some((floor: any) => 
      floor.rooms?.length > 0 && floor.rooms.some((room: any) => 
        room.name?.trim() || room.type || room.totalArea
      )
    );

    const hasNutzflaecheData = wofivData.nutzflaecheRooms?.some((room: any) => 
      room.name?.trim() || room.type || room.totalArea
    );

    if (!hasWohnflaecheData && !hasNutzflaecheData) {
      errors.push('Bitte fügen Sie mindestens einen Raum hinzu');
    }

    // Validate floor names
    wofivData.wohnflaecheFloors?.forEach((floor: any, floorIdx: number) => {
      if (!floor.name?.trim()) {
        errors.push(`Geschoss ${floorIdx + 1}: Name ist erforderlich`);
      }

      // Validate rooms in floor
      floor.rooms?.forEach((room: any, roomIdx: number) => {
        if (!room.name?.trim()) {
          errors.push(`${floor.name} - Raum ${roomIdx + 1}: Raumname ist erforderlich`);
        }
        if (!room.type) {
          errors.push(`${floor.name} - ${room.name}: Raumtyp ist erforderlich`);
        }
        if (!room.totalArea) {
          errors.push(`${floor.name} - ${room.name}: Gesamtfläche ist erforderlich`);
        } else {
          // Check for zero values in totalArea
          const totalArea = parseFloat((room.totalArea || '0').replace(',', '.')) || 0;
          if (totalArea === 0) {
            errors.push(`${floor.name} - ${room.name}: Gesamtfläche darf nicht 0 m² betragen`);
          }
        }

        // Validate Dachschräge calculations
        if (room.hasDachschraege && room.totalArea) {
          const totalArea = parseFloat((room.totalArea || '0').replace(',', '.')) || 0;
          const under1m = parseFloat((room.areaUnder1m || '0').replace(',', '.')) || 0;
          const area1to2m = parseFloat((room.area1to2m || '0').replace(',', '.')) || 0;
          const over2m = parseFloat((room.areaOver2m || '0').replace(',', '.')) || 0;
          
          // Check for zero values in Dachschräge fields
          if (under1m === 0 && area1to2m === 0 && over2m === 0) {
            errors.push(`${floor.name} - ${room.name}: Bei Dachschräge müssen mindestens eine Teilfläche größer als 0 m² angegeben werden`);
          }
          
          const sumSubAreas = under1m + area1to2m + over2m;
          const tolerance = 0.01;
          
          if (Math.abs(sumSubAreas - totalArea) > tolerance) {
            errors.push(`${floor.name} - ${room.name}: Dachschrägen-Teilflächen (${sumSubAreas.toFixed(2)} m²) stimmen nicht mit Gesamtfläche (${totalArea.toFixed(2)} m²) überein`);
          }
        }
      });
    });

    // Validate Nutzfläche rooms
    wofivData.nutzflaecheRooms?.forEach((room: any, roomIdx: number) => {
      if (!room.name?.trim()) {
        errors.push(`Nutzfläche - Raum ${roomIdx + 1}: Raumname ist erforderlich`);
      }
      if (!room.type) {
        errors.push(`Nutzfläche - ${room.name}: Raumtyp ist erforderlich`);
      }
      if (!room.totalArea) {
        errors.push(`Nutzfläche - ${room.name}: Gesamtfläche ist erforderlich`);
      } else {
        // Check for zero values in totalArea
        const totalArea = parseFloat((room.totalArea || '0').replace(',', '.')) || 0;
        if (totalArea === 0) {
          errors.push(`Nutzfläche - ${room.name}: Gesamtfläche darf nicht 0 m² betragen`);
        }
      }
    });

    return createValidationSection('wofiv', 'Berechnung der Wohn- und Nutzfläche nach WoFIV', errors, warnings);
  }

  private async validateDocuments(documents: any[]): Promise<ValidationSection[]> {
    const sections: ValidationSection[] = [];

    try {
      // Fetch required documents data (similar to DocumentUpload logic)
      const requiredDocuments = await this.determineRequiredDocuments();
      
      // Fetch uploaded documents from user_data
      const { data: userData, error: userError } = await supabase
        .from('user_data')
        .select('document_status, firstname, lastname, weitere_antragstellende_personen')
        .eq('id', this.residentId)
        .single();

      if (userError) {
        sections.push(createValidationSection('documents', 'Dokumente', ['Fehler beim Laden der Dokumente'], []));
        return sections;
      }

      const documentStatus = userData?.document_status || {};
      const mainApplicantName = userData?.firstname && userData?.lastname 
        ? `${userData.firstname} ${userData.lastname}` 
        : 'Hauptantragsteller';

      // Helper function to check if a document type has uploaded files
      const hasUploadedFiles = (documentTypeId: string, applicantKey: string): boolean => {
        const applicantDocs = documentStatus[applicantKey] || {};
        const files = applicantDocs[documentTypeId] || [];
        return files.some((file: any) => file.uploaded === true);
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

      // 1. Validate General Documents
      const generalErrors: string[] = [];
      requiredDocuments.general.forEach(documentId => {
        if (!hasUploadedFiles(documentId, 'general')) {
          generalErrors.push(`${getDocumentTitle(documentId)} fehlt`);
        }
      });

      // Always create section for general documents, even if no errors
      if (requiredDocuments.general.length > 0) {
        // Sort errors alphabetically to match document upload field order
        generalErrors.sort();
        sections.push(createValidationSection('documents-general', 'Allgemeine Dokumente', generalErrors, []));
      }

      // 2. Validate Main Applicant Documents
      const mainApplicantErrors: string[] = [];
      requiredDocuments.hauptantragsteller.forEach(documentId => {
        if (!hasUploadedFiles(documentId, 'hauptantragsteller')) {
          mainApplicantErrors.push(`${getDocumentTitle(documentId)} fehlt`);
        }
      });

      // Always create section for main applicant documents, even if no errors
      if (requiredDocuments.hauptantragsteller.length > 0) {
        // Sort errors alphabetically to match document upload field order
        mainApplicantErrors.sort();
        sections.push(createValidationSection('documents-main-applicant', mainApplicantName, mainApplicantErrors, []));
      }

      // 3. Validate Additional Applicants Documents
      const additionalApplicantsData = userData?.weitere_antragstellende_personen || {};
      let additionalApplicantsObj: Record<string, any> = {};

      // Handle backwards compatibility: convert array to UUID-based object if needed
      if (Array.isArray(additionalApplicantsData)) {
        additionalApplicantsData.forEach((person: any, index: number) => {
          const personUuid = person.id || `legacy_${index}`;
          additionalApplicantsObj[personUuid] = { ...person, id: personUuid };
        });
      } else {
        additionalApplicantsObj = additionalApplicantsData;
      }

      // Process each additional applicant
      Object.entries(requiredDocuments.additionalApplicants).forEach(([uuid, requiredDocs]) => {
        const applicant = additionalApplicantsObj[uuid];
        const applicantName = applicant?.firstName && applicant?.lastName 
          ? `${applicant.firstName} ${applicant.lastName}` 
          : `Person ${Object.keys(additionalApplicantsObj).indexOf(uuid) + 2}`;

        const applicantErrors: string[] = [];
        requiredDocs.forEach(documentId => {
          const applicantKey = `applicant_${uuid}`;
          if (!hasUploadedFiles(documentId, applicantKey)) {
            applicantErrors.push(`${getDocumentTitle(documentId)} fehlt`);
          }
        });

        // Always create section for additional applicant documents, even if no errors
        if (requiredDocs.length > 0) {
          // Sort errors alphabetically to match document upload field order
          applicantErrors.sort();
          sections.push(createValidationSection(`documents-applicant-${uuid}`, applicantName, applicantErrors, []));
        }
      });

      // If no errors found, add a success section
      if (sections.length === 0) {
        sections.push(createValidationSection('documents', 'Dokumente', [], ['Alle erforderlichen Dokumente wurden hochgeladen']));
      }

      return sections;
    } catch (error) {
      console.error('Error validating documents:', error);
      sections.push(createValidationSection('documents', 'Dokumente', ['Fehler bei der Dokumentenprüfung'], []));
      return sections;
    }
  }

  // Helper method to determine required documents (adapted from DocumentUpload)
  private async determineRequiredDocuments(): Promise<{
    general: string[];
    hauptantragsteller: string[];
    additionalApplicants: { [applicantUuid: string]: string[] };
  }> {
    try {
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
        .eq('id', this.residentId)
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
        .eq('user_id', this.residentId)
        .single();

      if (objectError && objectError.code !== 'PGRST116') {
        throw objectError;
      }

      // Get financial data from user_financials table
      const { data: financialData, error: financialError } = await supabase
        .from('user_financials')
        .select('*')
        .eq('user_id', this.residentId)
        .single();

      if (financialError && financialError.code !== 'PGRST116') {
        console.error('Error loading financial data:', financialError);
      }

      // Get finance structure data for loan-related documents
      const { data: financeStructureData, error: financeStructureError } = await supabase
        .from('finance_structure')
        .select('*')
        .eq('user_id', this.residentId)
        .single();

      if (financeStructureError && financeStructureError.code !== 'PGRST116') {
        console.error('Error loading finance structure data:', financeStructureError);
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
      if (objectData?.foerderVariante?.includes('neubau') || (objectData?.foerderVariante?.includes('ersterwerb') && objectData?.barrierefrei === true) && financeStructureData?.zusatzdarlehen_barrierefreiheit_nennbetrag > 0) {
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

        // First, process all additional applicants for disability and care level documents
        // This ensures we check all persons regardless of whether they have financial data
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

        // Process all additional applicants for disability and care level documents
        Object.entries(weiterePersonenObj).forEach(([uuid, additionalApplicant]: [string, any]) => {
          // Initialize the array for this person if it doesn't exist
          if (!result.additionalApplicants[uuid]) {
            result.additionalApplicants[uuid] = [];
          }
          
          // Additional applicant disability and care level documents
          if (additionalApplicant?.behinderungsgrad && parseFloat(additionalApplicant.behinderungsgrad) > 0) {
            result.additionalApplicants[uuid].push('nachweis_disability');
          }
          
          if (additionalApplicant?.pflegegrad && parseFloat(additionalApplicant.pflegegrad) > 0) {
            result.additionalApplicants[uuid].push('pflegegrad_nachweis');
          }
        });

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

          // Process each additional applicant for income-related documents
          Object.entries(additionalFinancialsObj).forEach(([uuid, applicantFinancials]: [string, any]) => {
            // Ensure the array exists for this person
            if (!result.additionalApplicants[uuid]) {
              result.additionalApplicants[uuid] = [];
            }

            const additionalApplicant = weiterePersonenObj[uuid];

            if (additionalApplicant?.noIncome !== true && additionalApplicant?.notHousehold !== true) {
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
          });
        }
      }

      return result;
    } catch (error) {
      console.error('Error determining required documents:', error);
      return { general: [], hauptantragsteller: [], additionalApplicants: {} };
    }
  }

  private async validateFinancialRequirements(hauptantragData: any, einkommenserklarungData: any, selbstauskunftData?: any): Promise<ValidationSection[]> {
    const sections: ValidationSection[] = [];

    // Check if we have required data
    if (!hauptantragData || !einkommenserklarungData) {
      sections.push(createValidationSection('financial-requirements', 'Finanzielle Anforderungen', ['Erforderliche Daten für die finanzielle Prüfung sind nicht verfügbar'], []));
      return sections;
    }

    // 1. Household Income Calculation Section
    const householdIncomeSection = await this.calculateHouseholdIncome(hauptantragData, einkommenserklarungData);
    sections.push(householdIncomeSection);

    // 2. Available Monthly Income Section (from Selbstauskunft)
    const availableIncomeSection = await this.calculateAvailableMonthlyIncome(selbstauskunftData);
    sections.push(availableIncomeSection);

    // 3. Income Group Determination Section
    const incomeGroupSection = await this.determineIncomeGroup(hauptantragData, einkommenserklarungData, householdIncomeSection);
    sections.push(incomeGroupSection);

    // 4. Additional Financial Validation Section
    const additionalValidationSection = this.validateAdditionalFinancialCriteria(hauptantragData, einkommenserklarungData);
    sections.push(additionalValidationSection);



    return sections;
  }

  private async calculateHouseholdIncome(hauptantragData: any, einkommenserklarungData: any): Promise<ValidationSection> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const calculations: string[] = [];

    try {
      // Helper function to parse currency values
      const parseCurrencyValue = (value: any): number => {
        if (!value) return 0;
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          // Handle database format (e.g., "1200.00") vs German format (e.g., "1.200,00 €")
          if (value.includes('€') || value.includes(',')) {
            // German format: remove € and convert comma to dot
            const cleaned = value.replace(/[€\s]/g, '').replace(/\./g, '').replace(',', '.');
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? 0 : parsed;
          } else {
            // Database format: already has dot as decimal separator
            const parsed = parseFloat(value);
            return isNaN(parsed) ? 0 : parsed;
          }
        }
        return 0;
      };

      // Fetch household composition data from user_data table
      const { data: householdData, error: householdError } = await supabase
        .from('user_data')
        .select('firstname, lastname, adult_count, child_count, weitere_antragstellende_personen, is_married, main_pflegegrad, main_behinderungsgrad, noIncome')
        .eq('id', this.residentId)
        .single();

      if (householdError) {
        errors.push('Fehler beim Laden der Haushaltsdaten');
        return this.createCalculationSection('financial-household-income', 'Berechnung des Haushalts-Einkommen', calculations, errors, warnings);
      }

      const householdMembers: Array<{
        id: string;
        name: string;
        personData: any;
        financialData: any | null;
        isMainApplicant: boolean;
        pflegegrad?: string;
        behinderungsgrad?: string;
        hasIncome: boolean;
      }> = [];

      // Check if einkommenserklarungData has the expected structure
      const financialData = einkommenserklarungData?.financialData;

      // Process additional household members
      const weiterePersonenData = householdData.weitere_antragstellende_personen || {};
      let weiterePersonenObj: Record<string, any> = {};

      // Handle backwards compatibility: convert array to UUID-based object if needed
      if (Array.isArray(weiterePersonenData)) {
        weiterePersonenData.forEach((person: any, index: number) => {
          const uuid = person.id || `legacy_${index}`;
          weiterePersonenObj[uuid] = { ...person, id: uuid };
        });
      } else {
        weiterePersonenObj = weiterePersonenData;
      }

      // Add main applicant (always include if not marked as notHousehold)
      const mainApplicantHasIncome = !householdData.noIncome;
      householdMembers.push({
        id: 'main_applicant',
        name: `${householdData.firstname || 'Hauptantragsteller'} ${householdData.lastname || ''}`.trim(),
        personData: householdData,
        financialData: financialData || null,
        isMainApplicant: true,
        pflegegrad: householdData.main_pflegegrad,
        behinderungsgrad: householdData.main_behinderungsgrad,
        hasIncome: mainApplicantHasIncome
      });

      // Add additional household members (only those who are part of the household)
      const additionalFinancials = financialData?.additional_applicants_financials || {};
      Object.entries(weiterePersonenObj).forEach(([uuid, person]: [string, any]) => {
        // Skip persons who are not part of the household
        if (person.notHousehold) {
          return;
        }

        const personFinancialData = additionalFinancials[uuid] || null;
        const personHasIncome = !person.noIncome;
        
        householdMembers.push({
          id: uuid,
          name: `${person.firstName || 'Person'} ${person.lastName || ''}`.trim(),
          personData: person,
          financialData: personFinancialData,
          isMainApplicant: false,
          pflegegrad: person.pflegegrad,
          behinderungsgrad: person.behinderungsgrad,
          hasIncome: personHasIncome
        });
      });

       // Check if Einkommenserklärung has validation errors
       const einkommenserklarungValidationSections = this.validateEinkommenserklarung(einkommenserklarungData);
       const hasEinkommenserklarungErrors = einkommenserklarungValidationSections.some(section => 
         section.errors && section.errors.length > 0
       );
      if (hasEinkommenserklarungErrors) {
        warnings.push('Die Einkommenserklärung ist unvollständig. Die Berechnung des Haushalts-Einkommens basiert auf den verfügbaren Daten, kann aber ungenau sein.');
      }

      if (householdMembers.length === 0) {
        errors.push('Keine Haushaltsmitglieder gefunden');
        return this.createCalculationSection('financial-household-income', 'Berechnung des Haushalts-Einkommen', calculations, errors, warnings);
      }

      // Separate members with and without income for different calculations
      const membersWithIncome = householdMembers.filter(member => member.hasIncome);
      const membersWithoutIncome = householdMembers.filter(member => !member.hasIncome);

      calculations.push(`Haushaltsmitglieder insgesamt: ${householdMembers.length}`);
      calculations.push(`xyz .- Mit Einkommen: ${membersWithIncome.length}`);
      calculations.push(`xyz .- Ohne Einkommen: ${membersWithoutIncome.length}`);
      calculations.push('');

      calculations.push('Einkommensberechnung der Haushaltsmitglieder');
      calculations.push('');

      // Check if financial data is available for members who should have income
      if (membersWithIncome.length > 0 && !financialData) {
        errors.push('Finanzielle Daten nicht verfügbar für Haushaltsmitglieder mit Einkommen');
        errors.push('Bitte stellen Sie sicher, dass die Einkommensdaten vollständig ausgefüllt sind');
        return this.createCalculationSection('financial-household-income', 'Berechnung des Haushalts-Einkommen', calculations, errors, warnings);
      }

      let totalGrossHouseholdIncome = 0;
      let totalAdjustedHouseholdIncome = 0;

      // Calculate income only for household members who have income
      for (const member of membersWithIncome) {
        const { name, financialData, isMainApplicant, personData, hasIncome } = member;
        
        // Skip if member doesn't have income (redundant check since we're iterating membersWithIncome)
        if (!hasIncome) continue;

        // Skip if financial data is missing for someone who should have income
        if (!financialData) {
          warnings.push(`${name}: Keine Einkommensdaten verfügbar trotz Einkommen-Flag`);
          continue;
        }
        
        calculations.push(`- ${name} -`);
        
        // 1. Calculate Gross Annual Income
        let grossAnnualIncome = 0;
        const incomeDetails: string[] = [];

        // Employment income calculation based on new logic
        if (financialData.isEarningRegularIncome) {
          const employmentIncome = this.calculateYearlyEmploymentIncome(financialData, incomeDetails, warnings, name);
          grossAnnualIncome += employmentIncome;
        }

        // Business/self-employment income (yearly by default)
        grossAnnualIncome += this.calculateAdditionalIncomeType(
          financialData,
          'Gewerbeeinkommen',
          'incomebusiness',
          incomeDetails,
          warnings,
          name,
          'incomebusinessyear',
          false, // yearly by default
          false // not daily
        );

        // Agriculture/forestry income (yearly by default)
        grossAnnualIncome += this.calculateAdditionalIncomeType(
          financialData,
          'Land-/Forstwirtschaft',
          'incomeagriculture',
          incomeDetails,
          warnings,
          name,
          'incomeagricultureyear',
          false, // yearly by default
          false // not daily
        );

        // Rental income (yearly by default)
        grossAnnualIncome += this.calculateAdditionalIncomeType(
          financialData,
          'Vermietungseinkommen',
          'incomerent',
          incomeDetails,
          warnings,
          name,
          'incomerentyear',
          false, // yearly by default
          false // not daily
        );

        // Pension income (monthly by default)
        grossAnnualIncome += this.calculateAdditionalIncomeType(
          financialData,
          'Renteneinkommen',
          'incomepension',
          incomeDetails,
          warnings,
          name,
          undefined, // no year field for pension
          true, // monthly by default
          false // not daily
        );

        // Unemployment benefits (ALG I)
        const algType = financialData.incomealbgtype;
        const isDaily = algType === 0;
        const isMonthly = algType === 1;
        grossAnnualIncome += this.calculateAdditionalIncomeType(
          financialData,
          'Arbeitslosengeld',
          'incomeablg',
          incomeDetails,
          warnings,
          name,
          undefined, // no year field for ALG
          isMonthly,
          isDaily
        );

        // Foreign income (can be yearly or monthly - needs to be defined)
        const isForeignMonthly = financialData.incomeforeignmonthly;
        if (financialData.incomeforeign && parseCurrencyValue(financialData.incomeforeign) > 0 && isForeignMonthly === null) {
          warnings.push(`${name}: Auslandseinkommen: Turnus (monatlich/jährlich) muss definiert werden`);
        } else {
          grossAnnualIncome += this.calculateAdditionalIncomeType(
            financialData,
            'Auslandseinkommen',
            'incomeforeign',
            incomeDetails,
            warnings,
            name,
            'incomeforeignyear',
            isForeignMonthly,
            false // not daily
          );
        }

        // Maintenance payments (tax-free, monthly by default)
        grossAnnualIncome += this.calculateAdditionalIncomeType(
          financialData,
          'Unterhaltsteuerfrei',
          'incomeunterhalttaxfree',
          incomeDetails,
          warnings,
          name,
          undefined, // no year field for maintenance
          true, // monthly by default
          false // not daily
        );

        // Maintenance payments (taxable, monthly by default)
        grossAnnualIncome += this.calculateAdditionalIncomeType(
          financialData,
          'Unterhaltssteuerpflichtig',
          'incomeunterhalttaxable',
          incomeDetails,
          warnings,
          name,
          undefined, // no year field for maintenance
          true, // monthly by default
          false // not daily
        );

        // Keep variables for allowance calculation (used later)
        const maintenanceTaxFree = parseCurrencyValue(financialData.incomeunterhalttaxfree);
        const maintenanceTaxable = parseCurrencyValue(financialData.incomeunterhalttaxable);

        // Other income (yearly by default)
        grossAnnualIncome += this.calculateAdditionalIncomeType(
          financialData,
          'Sonstige Einkünfte',
          'incomeothers',
          incomeDetails,
          warnings,
          name,
          'incomeothersyear',
          false, // yearly by default
          false // not daily
        );

        // Pauschal income (mini-jobs, yearly by default)
        grossAnnualIncome += this.calculateAdditionalIncomeType(
          financialData,
          'Pauschaleinkommen (Mini-Jobs)',
          'incomepauschal',
          incomeDetails,
          warnings,
          name,
          undefined, // no year field for pauschal
          false, // not monthly
          false // not daily
        );

        if (incomeDetails.length > 0) {
          calculations.push('Bruttojahreseinkommen:');
          incomeDetails.forEach(detail => calculations.push(`${detail}`));
        }
        calculations.push(`Summe Bruttojahreseinkommen: ${this.formatCurrency(grossAnnualIncome)}`);

        // 2. Calculate Adjusted (Net) Income with mandatory deductions
        let adjustedIncome = grossAnnualIncome;

        // Apply mandatory deductions based on actual insurance/tax payment status
        let deductionPercentage = 0;
        let deductionDetails: string[] = [];
        
        if (financialData.ispayingincometax) {
          deductionPercentage += 0.12;
          deductionDetails.push('Einkommensteuer (12%)');
        }
        
        if (financialData.ispayinghealthinsurance) {
          deductionPercentage += 0.12;
          deductionDetails.push('Krankenversicherung (12%)');
        }
        
        if (financialData.ispayingpension) {
          deductionPercentage += 0.12;
          deductionDetails.push('Rentenversicherung (12%)');
        }
        
        const mandatoryDeductions = grossAnnualIncome * deductionPercentage;
        adjustedIncome -= mandatoryDeductions;
        
        if (deductionDetails.length > 0) {
          calculations.push(`Abzug Steuern/Sozialabgaben (${(deductionPercentage * 100).toFixed(0)}%): -${this.formatCurrency(mandatoryDeductions)}`);
          calculations.push(`xyz .- ${deductionDetails.join(', ')}`);
        } else {
          calculations.push('xyz .Keine Abzüge für Steuern/Sozialabgaben (alle Optionen deaktiviert)');
        }

        // Apply standard allowances per income source
        let allowancesApplied = 0;
        let allowanceDetails: string[] = [];

        // €102/year deduction for income types under §22 EStG (pensions, unemployment, child support)
        // Apply per income source that qualifies
        let estgAllowanceCount = 0;
        
        if (financialData.incomepension && parseCurrencyValue(financialData.incomepension) > 0) {
          estgAllowanceCount++;
          allowanceDetails.push(`xyz .Freibetrag §22 EStG (Rente): -${this.formatCurrency(102)}`);
        }
        
        if (financialData.incomeablg && parseCurrencyValue(financialData.incomeablg) > 0) {
          estgAllowanceCount++;
          allowanceDetails.push(`xyz .Freibetrag §22 EStG (Arbeitslosengeld): -${this.formatCurrency(102)}`);
        }
        
        if (maintenanceTaxFree > 0) {
          estgAllowanceCount++;
          allowanceDetails.push(`xyz .Freibetrag §22 EStG (Unterhalt steuerfrei): -${this.formatCurrency(102)}`);
        }
        
        if (maintenanceTaxable > 0) {
          estgAllowanceCount++;
          allowanceDetails.push(`xyz .Freibetrag §22 EStG (Unterhalt steuerpflichtig): -${this.formatCurrency(102)}`);
        }
        
        const estgAllowanceTotal = estgAllowanceCount * 102;
        allowancesApplied += estgAllowanceTotal;

        // €1,230/year deduction for foreign income or flat-taxed mini-jobs
        // Apply per income source that qualifies
        let foreignPauschalAllowanceCount = 0;
        
        if (financialData.incomeforeign && parseCurrencyValue(financialData.incomeforeign) > 0) {
          foreignPauschalAllowanceCount++;
          allowanceDetails.push(`xyz .Freibetrag Ausland/Pauschal (Auslandseinkommen): -${this.formatCurrency(1230)}`);
        }
        
        if (financialData.incomepauschal && parseCurrencyValue(financialData.incomepauschal) > 0) {
          foreignPauschalAllowanceCount++;
          allowanceDetails.push(`xyz .Freibetrag Ausland/Pauschal (Pauschalversteuerung): -${this.formatCurrency(1230)}`);
        }
        
        const foreignPauschalAllowanceTotal = foreignPauschalAllowanceCount * 1230;
        allowancesApplied += foreignPauschalAllowanceTotal;

        // Add allowance details to calculations
        allowanceDetails.forEach(detail => calculations.push(detail));

        adjustedIncome = Math.max(0, adjustedIncome - allowancesApplied);

        // 3. Apply deductible expenses (Werbekosten, Kinderbetreuungskosten, Unterhaltszahlungen)
        let totalDeductibleExpenses = 0;
        let expenseDetails: string[] = [];

        // Calculate Werbekosten (only for people with regular employment income)
        if (financialData.isEarningRegularIncome) {
          const werbungskosten = this.calculateDeductibleExpenses(
            financialData,
            'Werbungskosten',
            'werbungskosten',
            expenseDetails,
            warnings,
            name,
            false // yearly value
          );
          totalDeductibleExpenses += werbungskosten;
        }

        // Calculate Kinderbetreuungskosten
        const kinderbetreuungskosten = this.calculateDeductibleExpenses(
          financialData,
          'Kinderbetreuungskosten',
          'kinderbetreuungskosten',
          expenseDetails,
          warnings,
          name,
          false // yearly value
        );
        totalDeductibleExpenses += kinderbetreuungskosten;

        // Calculate Unterhaltszahlungen
        const unterhaltszahlungen = this.calculateDeductibleExpenses(
          financialData,
          'Unterhaltszahlungen',
          'unterhaltszahlungen',
          expenseDetails,
          warnings,
          name,
          true // monthly array value
        );
        totalDeductibleExpenses += unterhaltszahlungen;

        // Add expense details to calculations if any
        if (expenseDetails.length > 0) {
          calculations.push('Abzugsfähige Ausgaben:');
          expenseDetails.forEach(detail => calculations.push(`${detail}`));
          calculations.push(`Summe abzugsfähige Ausgaben: -${this.formatCurrency(totalDeductibleExpenses)}`);
        }

        // Apply deductible expenses to adjusted income
        adjustedIncome = Math.max(0, adjustedIncome - totalDeductibleExpenses);
        calculations.push(`Bereinigtes Jahreseinkommen: ${this.formatCurrency(adjustedIncome)}`);
        calculations.push('');

        totalGrossHouseholdIncome += grossAnnualIncome;
        totalAdjustedHouseholdIncome += adjustedIncome;
      }

      // Add information about members without income
      if (membersWithoutIncome.length > 0) {
        calculations.push('Haushaltsmitglieder ohne Einkommen');
        membersWithoutIncome.forEach(member => {
          calculations.push(`- ${member.name} (kein Einkommen)`);
        });
        calculations.push('');
      }

      // 3. Calculate total household income
      calculations.push('Summe der Haushalts-Einkommen ohne Freibeträge');
      calculations.push(`Brutto-Haushaltseinkommen: ${this.formatCurrency(totalGrossHouseholdIncome)}`);
      calculations.push(`Bereinigtes Haushaltseinkommen: ${this.formatCurrency(totalAdjustedHouseholdIncome)}`);
      calculations.push('');

      // 4. Apply household-level tax-free allowances (for ALL household members)
      calculations.push('Freibeträge (alle Haushaltsmitglieder)');
      let totalHouseholdAllowances = 0;

      // Check for care levels and disability allowances for ALL household members
      for (const member of householdMembers) {
        const { name, personData, isMainApplicant, hasIncome } = member;
        const pflegegrad = isMainApplicant ? personData.main_pflegegrad : personData.pflegegrad;
        const behinderungsgrad = isMainApplicant ? personData.main_behinderungsgrad : personData.behinderungsgrad;

        let memberAllowance = 0;
        
        const pflegegradNum = parseInt(pflegegrad) || 0;
        const behinderungsgradNum = parseInt(behinderungsgrad) || 0;

        // Apply allowances based on care level and disability grade
        // Priority order: highest allowances first to avoid overlaps
        
        const incomeStatus = hasIncome ? '' : ' (kein Einkommen)';
        
        if (pflegegradNum === 5) {
          // 5.830 € for Pflegegrad 5
          memberAllowance = 5830;
          calculations.push(`${name}${incomeStatus} - Pflegegrad 5: ${this.formatCurrency(5830)}`);
        } else if (pflegegradNum === 4 && behinderungsgradNum >= 80) {
          // 5.830 € for Pflegegrad 4 with GdB ≥80
          memberAllowance = 5830;
          calculations.push(`${name}${incomeStatus} - Pflegegrad 4 + GdB ≥80: ${this.formatCurrency(5830)}`);
        } else if (pflegegradNum === 4) {
          // 4.500 € for Pflegegrad 4 (without high GdB)
          memberAllowance = 4500;
          calculations.push(`${name}${incomeStatus} - Pflegegrad 4: ${this.formatCurrency(4500)}`);
        } else if (behinderungsgradNum === 100) {
          // 4.500 € for GdB 100
          memberAllowance = 4500;
          calculations.push(`${name}${incomeStatus} - GdB 100: ${this.formatCurrency(4500)}`);
        } else if ((pflegegradNum >= 2 && pflegegradNum <= 3) && behinderungsgradNum >= 80) {
          // 4.500 € for Pflegegrad 2-3 with GdB ≥80
          memberAllowance = 4500;
          calculations.push(`${name}${incomeStatus} - Pflegegrad ${pflegegradNum} + GdB ≥80: ${this.formatCurrency(4500)}`);
        } else if ((pflegegradNum >= 2 && pflegegradNum <= 3) && behinderungsgradNum < 80) {
          // 2.100 € for Pflegegrad 2-3 with GdB <80
          memberAllowance = 2100;
          calculations.push(`${name}${incomeStatus} - Pflegegrad ${pflegegradNum} + GdB <80: ${this.formatCurrency(2100)}`);
        } else if (pflegegradNum === 1 && behinderungsgradNum >= 80) {
          // 2.100 € for Pflegegrad 1 with GdB ≥80
          memberAllowance = 2100;
          calculations.push(`${name}${incomeStatus} - Pflegegrad 1 + GdB ≥80: ${this.formatCurrency(2100)}`);
        } else if (pflegegradNum === 3) {
          // 1.330 € for Pflegegrad 3 (without combinations above)
          memberAllowance = 1330;
          calculations.push(`${name}${incomeStatus} - Pflegegrad 3: ${this.formatCurrency(1330)}`);
        } else if (behinderungsgradNum >= 80 && behinderungsgradNum <= 99) {
          // 1.330 € for GdB 80-99 (without Pflegegrad combinations)
          memberAllowance = 1330;
          calculations.push(`${name}${incomeStatus} - GdB 80-99: ${this.formatCurrency(1330)}`);
        } else if (pflegegradNum === 1 && behinderungsgradNum > 0 && behinderungsgradNum < 80) {
          // 1.330 € for Pflegegrad 1 with GdB <80
          memberAllowance = 1330;
          calculations.push(`${name}${incomeStatus} - Pflegegrad 1 + GdB <80: ${this.formatCurrency(1330)}`);
        } else if (pflegegradNum === 2) {
          // 665 € for Pflegegrad 2 (without combinations above)
          memberAllowance = 665;
          calculations.push(`${name}${incomeStatus} - Pflegegrad 2: ${this.formatCurrency(665)}`);
        } else if (behinderungsgradNum >= 50 && behinderungsgradNum <= 79) {
          // 665 € for GdB 50-79 (without Pflegegrad combinations)
          memberAllowance = 665;
          calculations.push(`${name}${incomeStatus} - GdB 50-79: ${this.formatCurrency(665)}`);
        } else if (pflegegradNum === 1) {
          // 330 € for Pflegegrad 1 (without GdB)
          memberAllowance = 330;
          calculations.push(`${name}${incomeStatus} - Pflegegrad 1: ${this.formatCurrency(330)}`);
        }

        totalHouseholdAllowances += memberAllowance;
      }

      // Check for married couple allowance (only for 2-person household)
      const adultCount = parseInt(householdData.adult_count) || 1;
      const childCount = parseInt(householdData.child_count) || 0;
      const totalHouseholdSize = adultCount + childCount;
      
      if (totalHouseholdSize === 2 && householdData.is_married) {
        totalHouseholdAllowances += 4000;
        calculations.push(`Ehepaar-Freibetrag (2-Personen-Haushalt): ${this.formatCurrency(4000)}`);
      }

      // TODO: Add maintenance obligations allowance (up to €8,000) when this data becomes available
      // This would require additional data about external maintenance payments

      if (totalHouseholdAllowances === 0) {
        calculations.push('Keine steuerfreien Freibeträge anwendbar');
      }

      // Calculate final adjusted household income
      const finalAdjustedHouseholdIncome = Math.max(0, totalAdjustedHouseholdIncome - totalHouseholdAllowances);

      calculations.push('');
      calculations.push('Bereinigtes Haushalts-Einkommen');
     /// calculations.push(`Brutto-Haushaltseinkommen: ${this.formatCurrency(totalGrossHouseholdIncome)}`);
      calculations.push(`Bereinigtes Haushaltseinkommen (vor Freibeträgen): ${this.formatCurrency(totalAdjustedHouseholdIncome)}`);
      calculations.push(`Steuerfreie Freibeträge gesamt: -${this.formatCurrency(totalHouseholdAllowances)}`);
      calculations.push(`Finales bereinigtes Haushaltseinkommen: ${this.formatCurrency(finalAdjustedHouseholdIncome)}`);

      // Store results for use in other sections
      (this as any).householdIncomeResults = {
        grossHouseholdIncome: totalGrossHouseholdIncome,
        adjustedHouseholdIncome: totalAdjustedHouseholdIncome,
        finalAdjustedHouseholdIncome: finalAdjustedHouseholdIncome,
        totalAllowances: totalHouseholdAllowances,
        householdSize: totalHouseholdSize,
        adultCount,
        childCount
      };

    } catch (error) {
      errors.push(`Fehler bei der Haushaltseinkommens-Berechnung: ${error}`);
    }

    const title = 'Berechnung des Haushalts-Einkommen';
    return this.createCalculationSection('financial-household-income', title, calculations, errors, warnings);
  }

  private async calculateAvailableMonthlyIncome(selbstauskunftData?: any): Promise<ValidationSection> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const calculations: string[] = [];

    try {
      calculations.push('Verfügbares Monatseinkommen');

      if (!selbstauskunftData) {
        errors.push('Selbstauskunft-Daten sind für diese Berechnung erforderlich');
        return this.createCalculationSection('financial-available-income', 'Verfügbares Monatseinkommen', calculations, errors, warnings);
      }

      // Check if Selbstauskunft has validation errors
      const selbstauskunftValidationSections = this.validateSelbstauskunft(selbstauskunftData);
      const hasSelbstauskunftErrors = selbstauskunftValidationSections.some(section => 
        section.errors && section.errors.length > 0
      );
      
      if (hasSelbstauskunftErrors) {
        warnings.push('Die Selbstauskunft ist unvollständig. Die Berechnung des verfügbaren Einkommens basiert auf den verfügbaren Daten, kann aber ungenau sein.');
      }

      // Helper function to parse currency values (following Selbstauskunft container logic)
      const parseCurrencyValue = (value: any): number => {
        if (!value) return 0;
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          // Handle database format (e.g., "1200.00") vs German format (e.g., "1.200,00 €")
          if (value.includes('€') || value.includes(',')) {
            // German format: remove € and convert comma to dot
            const cleaned = value.replace(/[€\s]/g, '').replace(/\./g, '').replace(',', '.');
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? 0 : parsed;
          } else {
            // Database format: already has dot as decimal separator
            const parsed = parseFloat(value);
            return isNaN(parsed) ? 0 : parsed;
          }
        }
        return 0;
      };

      // Function to calculate income for a single applicant (based on container logic)
      const calculateApplicantIncome = (applicant: any) => {
        let total = 0;

        // Salary-related income only if hasSalaryIncome is true
        if (applicant.hasSalaryIncome) {
          // Monthly net salary
          const salary = applicant.monthlynetsalary || '';
          total += parseCurrencyValue(salary);

          // Christmas bonus (divided by 12 for monthly)
          const christmasBonus = applicant.wheinachtsgeld_next12_net || '';
          total += parseCurrencyValue(christmasBonus) / 12;

          // Vacation bonus (divided by 12 for monthly)
          const vacationBonus = applicant.urlaubsgeld_next12_net || '';
          total += parseCurrencyValue(vacationBonus) / 12;

          // Other employment monthly net income (each euro value divided by 12)
          if (applicant.otheremploymentmonthlynetincome && Array.isArray(applicant.otheremploymentmonthlynetincome)) {
            applicant.otheremploymentmonthlynetincome.forEach((income: any) => {
              if (income.amount) {
                total += parseCurrencyValue(income.amount) / 12;
              }
            });
          }
        }

        // Agriculture income (divided by 12 for monthly)
        if (applicant.hasagricultureincome) {
          const agricultureIncome = applicant.incomeagriculture_net || '';
          total += parseCurrencyValue(agricultureIncome) / 12;
        }

        // Rent income (divided by 12 for monthly)
        if (applicant.hasrentincome) {
          const rentIncome = applicant.incomerent_net || '';
          total += parseCurrencyValue(rentIncome) / 12;
        }
        
        // Yearly capital net income (divided by 12 for monthly)
        if (applicant.hascapitalincome) {
          const capitalIncome = applicant.yearlycapitalnetincome || '';
          total += parseCurrencyValue(capitalIncome) / 12;
        }

        // Yearly business net income (divided by 12 for monthly)
        if (applicant.hasbusinessincome) {
          const businessIncome = applicant.yearlybusinessnetincome || '';
          total += parseCurrencyValue(businessIncome) / 12;
          // Yearly self-employed net income (divided by 12 for monthly)
          const selfEmployedIncome = applicant.yearlyselfemployednetincome || '';
          total += parseCurrencyValue(selfEmployedIncome) / 12;
        }

        // Pension monthly net income (each euro value)
        if (applicant.haspensionincome) {
          if (applicant.pensionmonthlynetincome && Array.isArray(applicant.pensionmonthlynetincome)) {
            applicant.pensionmonthlynetincome.forEach((pension: any) => {
              if (pension.amount) {
                total += parseCurrencyValue(pension.amount);
              }
            });
          }
        }

        // Tax-free maintenance income
        if (applicant.hastaxfreeunterhaltincome) {
          const taxFreeMaintenance = applicant.incomeunterhalttaxfree || '';
          total += parseCurrencyValue(taxFreeMaintenance);
        }

        // Taxable maintenance income
        if (applicant.hastaxableunterhaltincome) {
          const taxableMaintenance = applicant.incomeunterhalttaxable_net || '';
          total += parseCurrencyValue(taxableMaintenance);
        }

        // Monthly child benefit net income
        if (applicant.haskindergeldincome) {
          const childBenefit = applicant.monthlykindergeldnetincome || '';
          total += parseCurrencyValue(childBenefit);
        }

        // Monthly care benefit net income
        if (applicant.haspflegegeldincome) {
          const careBenefit = applicant.monthlypflegegeldnetincome || '';
          total += parseCurrencyValue(careBenefit);
        }

        // Monthly parental benefit net income
        if (applicant.haselterngeldincome) {
          const parentalBenefit = applicant.monthlyelterngeldnetincome || '';
          total += parseCurrencyValue(parentalBenefit);
        }

        // Other monthly net income (each euro value)
        if (applicant.hasothernetincome) {
          if (applicant.othermonthlynetincome && Array.isArray(applicant.othermonthlynetincome)) {
            applicant.othermonthlynetincome.forEach((income: any) => {
              if (income.amount) {
                total += parseCurrencyValue(income.amount);
              }
            });
          }
        }

        return total;
      };

      // Function to calculate expenses for a single applicant (based on container logic)
      const calculateApplicantExpenses = (applicant: any) => {
        let total = 0;

        // Other insurance and tax expenses (each euro value)
        if (applicant.betragotherinsurancetaxexpenses && Array.isArray(applicant.betragotherinsurancetaxexpenses)) {
          applicant.betragotherinsurancetaxexpenses.forEach((expense: any) => {
            if (expense.amount) {
              total += parseCurrencyValue(expense.amount);
            }
          });
        }

        // Loans (each euro value)
        if (applicant.loans && Array.isArray(applicant.loans)) {
          applicant.loans.forEach((loan: any) => {
            if (loan.amount) {
              total += parseCurrencyValue(loan.amount);
            }
          });
        }

        // Bridge loan
        if (applicant.zwischenkredit && Array.isArray(applicant.zwischenkredit)) {
          applicant.zwischenkredit.forEach((credit: any) => {
            if (credit.amount) {
              total += parseCurrencyValue(credit.amount);
            }
          });
        }

        // Maintenance payments total
        if (applicant.unterhaltszahlungenTotal && Array.isArray(applicant.unterhaltszahlungenTotal)) {
          applicant.unterhaltszahlungenTotal.forEach((payment: any) => {
            if (payment.amountTotal) {
              total += parseCurrencyValue(payment.amountTotal);
            }
          });
        }

        // Other payment obligations (each euro value)
        if (applicant.otherzahlungsverpflichtung && Array.isArray(applicant.otherzahlungsverpflichtung)) {
          applicant.otherzahlungsverpflichtung.forEach((obligation: any) => {
            if (obligation.amount) {
              total += parseCurrencyValue(obligation.amount);
            }
          });
        }

        // Building society savings rate
        if (applicant.hasBausparvertraege) {
          const buildingSocietyRate = applicant.sparratebausparvertraege || '';
          total += parseCurrencyValue(buildingSocietyRate);
        }

        // Capital pension insurance premium
        if (applicant.hasRentenversicherung) {
          const capitalPensionPremium = applicant.praemiekapitalrentenversicherung || '';
          total += parseCurrencyValue(capitalPensionPremium);
        }

        return total;
      };

      // Get person name helper
      const getPersonName = (person: any, index: number, isMain: boolean = false) => {
        if (isMain) {
          if (person.firstname && person.lastname) {
            return `${person.firstname} ${person.lastname}`;
          }
          return 'Hauptantragsteller';
        } else {
          if (person.firstName && person.lastName) {
            return `${person.firstName} ${person.lastName}`;
          }
          return `Person ${index + 2}`;
        }
      };

      const { userData, financialData } = selbstauskunftData;
      let totalHouseholdIncome = 0;
      let totalHouseholdExpenses = 0;

      // Calculate for main applicant
      if (financialData && userData?.noIncome !== true) {
        const personName = getPersonName(userData || {}, 0, true);
        const personIncome = calculateApplicantIncome(financialData);
        const personExpenses = calculateApplicantExpenses(financialData);
        const personAvailable = personIncome - personExpenses;

        totalHouseholdIncome += personIncome;
        totalHouseholdExpenses += personExpenses;

        // Add calculation lines for main applicant
        calculations.push(`- ${personName} -`);
        calculations.push(`Einnahmen: ${this.formatCurrency(personIncome)}`);
        calculations.push(`Ausgaben: ${this.formatCurrency(personExpenses)}`);
        calculations.push(`Überschuss: ${this.formatCurrency(personAvailable)}`);
        calculations.push('');
      } 

      // Calculate for additional applicants
      if (financialData?.additional_applicants_financials && userData?.weitere_antragstellende_personen) {
        const additionalFinancials = financialData.additional_applicants_financials;
        const additionalPersons = userData.weitere_antragstellende_personen;
        
        // Handle both array and object formats for backwards compatibility
        let personEntries: Array<[string, any]>;
        if (Array.isArray(additionalPersons)) {
          personEntries = additionalPersons.map((person: any, index: number) => [index.toString(), person]);
        } else {
          personEntries = Object.entries(additionalPersons);
        }
        
        personEntries.forEach((entry, index) => {
          const [uuid, person] = entry;
          const applicantFinancials = additionalFinancials[uuid];
          if (!applicantFinancials) return;

          const personName = getPersonName(person, index);

          // Exclude if marked as not part of household or has no income
          const isNotHousehold = person?.notHousehold === true;
          const hasNoIncome = person?.noIncome === true;
          if (isNotHousehold || hasNoIncome) {
            return;
          }

          const personIncome = calculateApplicantIncome(applicantFinancials);
          const personExpenses = calculateApplicantExpenses(applicantFinancials);
          const personAvailable = personIncome - personExpenses;

          totalHouseholdIncome += personIncome;
          totalHouseholdExpenses += personExpenses;

          // Add calculation lines for additional applicant
          calculations.push(`- ${personName} -`);
          calculations.push(`Einnahmen: ${this.formatCurrency(personIncome)}`);
          calculations.push(`Ausgaben: ${this.formatCurrency(personExpenses)}`);
          calculations.push(`Überschuss: ${this.formatCurrency(personAvailable)}`);
          calculations.push('');
        });
      }

      // Calculate total household available income
      const totalAvailableIncome = totalHouseholdIncome - totalHouseholdExpenses;

      // Add household summary calculations
      calculations.push('Haushaltssumme');
      calculations.push(`Gesamt Einnahmen: ${this.formatCurrency(totalHouseholdIncome)}`);
      calculations.push(`Gesamt Ausgaben: ${this.formatCurrency(totalHouseholdExpenses)}`);
      calculations.push(`Verfügbares Monatseinkommen gesamt: ${this.formatCurrency(totalAvailableIncome)}`);
      calculations.push('');

      // Fetch household composition from user_data for validation
      try {
        const { data: userDataForHousehold, error: userError } = await supabase
          .from('user_data')
          .select('adult_count, child_count')
          .eq('id', this.residentId)
          .single();

        if (!userError && userDataForHousehold) {
          const adultCount = parseInt(userDataForHousehold.adult_count) || 0;
          const childCount = parseInt(userDataForHousehold.child_count) || 0;
          const totalHouseholdMembers = adultCount + childCount;
          if (totalHouseholdMembers === 0) {
            warnings.push('Haushaltsgröße nicht verfügbar - Prüfung der Tragbarkeit der Belastung nicht möglich. Die Haushaltsgröße ergibt sich aus Schritt 2 des Hauptantrags.');
          } else if (adultCount === 0) {
            warnings.push('Keine Erwachsenen im Haushalt - Prüfung der Tragbarkeit der Belastung nicht möglich. Die Haushaltsgröße ergibt sich aus Schritt 2 des Hauptantrags.');
          }

          // Calculate minimum required income based on household size
          let minimumRequired = 0;
          if (totalHouseholdMembers === 1) {
            minimumRequired = 990;
          } else if (totalHouseholdMembers === 2) {
            minimumRequired = 1270;
          } else if (totalHouseholdMembers > 2) {
            minimumRequired = 1270 + (totalHouseholdMembers - 2) * 320;
          }

          // Add minimum requirement to calculations
          calculations.push(`Mindestbedarf für ${totalHouseholdMembers}-Personen-Haushalt: ${this.formatCurrency(minimumRequired)}`);
          //calculations.push(`: ${this.formatCurrency(totalAvailableIncome - minimumRequired)}`);

          const surplus = totalAvailableIncome - minimumRequired;
          if (surplus >= 0) {
            calculations.push(`✓ Mindestbedarf erfüllt (Überschuss: ${this.formatCurrency(surplus)})`);
          } else {
            errors.push(`Mindestbedarf nicht erfüllt (Fehlbetrag: ${this.formatCurrency(Math.abs(surplus))})`);
          }

          // Store results for use in other sections
          (this as any).availableIncomeResults = {
            totalAvailableIncome,
            minimumRequired,
            householdSize: totalHouseholdMembers,
            adultCount,
            childCount,
            meetsMinimumRequirement: surplus >= 0
          };
        } else {
          warnings.push('Haushaltsgrößendaten nicht verfügbar - Prüfung der Tragbarkeit der Belastung nicht möglich');
        }
      } catch (error) {
        warnings.push(`Fehler beim Abrufen der Haushaltsdaten: ${error}`);
      }

      // Basic validation regardless of household data
      if (totalAvailableIncome < 0) {
        errors.push('Das verfügbare Einkommen ist negativ - die Ausgaben übersteigen die Einnahmen');
      } else if (totalAvailableIncome < 990) {
        warnings.push('Das verfügbare Einkommen ist geringer als der Mindestbedarf für einen 1-Personen-Haushalt');
      }

    } catch (error) {
      errors.push(`Fehler bei der Berechnung des verfügbaren Einkommens: ${error}`);
    }

    const title = 'Verfügbares Monatseinkommen';
    return this.createCalculationSection('financial-available-income', title, calculations, errors, warnings);
  }

  private async determineIncomeGroup(hauptantragData: any, einkommenserklarungData: any, householdIncomeSection: ValidationSection): Promise<ValidationSection> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const calculations: string[] = [];

    try {
      // Get the calculated household income results from the previous calculation
      const results = (this as any).householdIncomeResults;
      if (!results) {
        errors.push('Haushaltseinkommen muss zuerst berechnet werden');
        return this.createCalculationSection('financial-income-group', 'Einkommensgruppe', calculations, errors, warnings);
      }else{
         // Check if Einkommenserklärung has validation errors
       const einkommenserklarungValidationSections = this.validateEinkommenserklarung(einkommenserklarungData);
       const hasEinkommenserklarungErrors = einkommenserklarungValidationSections.some(section => 
         section.errors && section.errors.length > 0
       );
      if (hasEinkommenserklarungErrors) {
        warnings.push('Die Einkommenserklärung ist unvollständig. Die Berechnung der Einkommensgruppe basiert auf den verfügbaren Daten, kann aber ungenau sein.');
      }
      }

      const { grossHouseholdIncome, finalAdjustedHouseholdIncome, adultCount, childCount } = results;
      
      // Fetch household composition data to get is_married status
      const { data: householdData, error: householdError } = await supabase
        .from('user_data')
        .select('is_married')
        .eq('id', this.residentId)
        .single();

      if (householdError) {
        errors.push('Fehler beim Laden der Haushaltsdaten');
        return this.createCalculationSection('financial-income-group', 'Einkommensgruppe', calculations, errors, warnings);
      }

      const isMarried = householdData.is_married || false;
      calculations.push(`Haushaltszusammensetzung`);
      // Show household composition and income information
      calculations.push(`Anzahl Erwachsene: ${adultCount}`);
      calculations.push(`Anzahl Kinder: ${childCount}`);
      calculations.push(`Verheiratet: ${isMarried ? 'Ja' : 'Nein'}`);
      
      const retiredHousehold = await (this as any).isRetiredHousehold();
      calculations.push(`Rentner-Haushalt: ${retiredHousehold ? 'Ja' : 'Nein'}`);
      const baseType = retiredHousehold ? 'retired' : 'base';

      if (retiredHousehold && childCount > 0) {
        warnings.push('Derzeit werden bei der Ermittlung der Einkommensgrenzen für Rentnerhaushalte keine im Haushalt lebenden Kinder berücksichtigt. In solchen Fällen kann das tatsächlich zulässige Einkommen höher liegen als die aktuell angegebenen Grenzwerte.');
      }

      calculations.push(`Berechnetes Haushalts-Einkommen`);
      calculations.push(`Jahreseinkommen Brutto: ${this.formatCurrency(grossHouseholdIncome)}`);
      calculations.push(`Bereinigtes Haushalts-Einkommen: ${this.formatCurrency(finalAdjustedHouseholdIncome)}`);

      // Eligibility criteria (exact same values as backend main.py)
      const ELIGIBILITY_CRITERIA_NO_KIDS = {
        1: { // Single adult
          "base": {"grossA": 38011, "netA": 23540, "grossB": 52724, "netB": 32956},
          "retired": {"grossA": 31076, "netA": 23540, "grossB": 40911, "netB": 32956}
        },
        2: { // Two adults
          "base": {"grossA": 51777, "netA": 28350, "grossB": 69496, "netB": 39690},
          "retired": {"grossA": 42668, "netA": 28350, "grossB": 56244, "netB": 39690}
        }
      };

      const ELIGIBILITY_CRITERIA_WITH_KIDS = {
        1: { // Single adult with kids
          "base": {"grossA": 53121, "netA": 29210, "grossB": 71377, "netB": 40894},
          "retired": {"grossA": 31076, "netA": 23540, "grossB": 40911, "netB": 32956}
        },
        2: { // Two adults with kids
          "base": {"grossA": 57074, "netA": 35740, "grossB": 79411, "netB": 50036},
          "retired": {"grossA": 42668, "netA": 28350, "grossB": 56244, "netB": 39690}
        }
      };

      const CHILD_BONUS = {
        "single": { // Single parent household
          "grossA": 5297, "netA": 7390, "grossB": 9916, "netB": 10346
        },
        "couple": { // Two-parent household
          "grossA": 11547, "netA": 7390, "grossB": 16166, "netB": 10346
        }
      };

      const MARRIAGE_BONUS = 4000; // Marriage bonus for 2-person household

      // Validate input (same validation as backend)
      if (adultCount < 1 || adultCount > 2 || childCount < 0) {
        errors.push('Ungültige Eingabedaten. Anzahl Erwachsene muss 1 oder 2 sein, Anzahl Kinder muss ≥ 0 sein.');
        return this.createCalculationSection('financial-income-group', 'Einkommensgruppe', calculations, errors, warnings);
      }

      // Validate income values (same validation as backend)
      if (grossHouseholdIncome <= 0 || finalAdjustedHouseholdIncome <= 0) {
        errors.push('Das Einkommen muss größer als 0 sein.');
        return this.createCalculationSection('financial-income-group', 'Einkommensgruppe', calculations, errors, warnings);
      }

      // Determine which base criteria to use based on whether there are kids (same logic as backend)
      let base: any;
      let childGrossBonusA = 0;
      let childNetBonusA = 0;
      let childGrossBonusB = 0;
      let childNetBonusB = 0;

      if (childCount === 0) {
        base = ELIGIBILITY_CRITERIA_NO_KIDS[adultCount as keyof typeof ELIGIBILITY_CRITERIA_NO_KIDS][baseType as 'base' | 'retired'];
        childGrossBonusA = 0;
        childNetBonusA = 0;
        childGrossBonusB = 0;
        childNetBonusB = 0;
      } else {
        base = ELIGIBILITY_CRITERIA_WITH_KIDS[adultCount as keyof typeof ELIGIBILITY_CRITERIA_WITH_KIDS][baseType as 'base' | 'retired'];
        // Calculate bonus only for additional children beyond the first
        const additionalChildren = Math.max(0, childCount - 1);
        // Use different bonus amounts based on whether it's a single parent or couple
        const bonusType = adultCount === 1 ? "single" : "couple";
        childGrossBonusA = additionalChildren * CHILD_BONUS[bonusType]["grossA"];
        childNetBonusA = additionalChildren * CHILD_BONUS[bonusType]["netA"];
        childGrossBonusB = additionalChildren * CHILD_BONUS[bonusType]["grossB"];
        childNetBonusB = additionalChildren * CHILD_BONUS[bonusType]["netB"];
      }

      // Add marriage bonus to gross income if applicable (same logic as backend)
      const marriageBonus = isMarried ? MARRIAGE_BONUS : 0;

      // Calculate adjusted limits (same calculation as backend)
      const adjustedLimits = {
        "grossA": base["grossA"] + childGrossBonusA + marriageBonus,
        "netA": base["netA"] + childNetBonusA,
        "grossB": base["grossB"] + childGrossBonusB + marriageBonus,
        "netB": base["netB"] + childNetBonusB
      };
      calculations.push(`Grenzen für ihre Haushaltszusammensetzung`);
      // Show only the calculated limits
      calculations.push(`Gruppe A Mögliches Jahreseinkommen Brutto: ${this.formatCurrency(adjustedLimits["grossA"])}`);
      calculations.push(`Gruppe A Gesetzliche Einkommensgrenze: ${this.formatCurrency(adjustedLimits["netA"])}`);
      calculations.push(`Gruppe B Mögliches Jahreseinkommen Brutto: ${this.formatCurrency(adjustedLimits["grossB"])}`);
      calculations.push(`Gruppe B Gesetzliche Einkommensgrenze: ${this.formatCurrency(adjustedLimits["netB"])}`);

      // Determine eligibility (exact same logic as backend)
      let group = '';
      let eligible = false;
      let reason = '';

      // First check if income is within Group A limits (same logic as backend)
      const grossWithinA = grossHouseholdIncome <= adjustedLimits["grossA"];
      const netWithinA = finalAdjustedHouseholdIncome <= adjustedLimits["netA"];
      
      if (grossWithinA && netWithinA) {
        group = 'Gruppe A';
        eligible = true;
        reason = 'Sie erfüllen die Voraussetzungen für Gruppe A.';
      } else {
        // Then check if income exceeds Group B limits (not eligible) - same logic as backend
        if (grossHouseholdIncome > adjustedLimits["grossB"] || finalAdjustedHouseholdIncome > adjustedLimits["netB"]) {
          // Determine the specific reason for ineligibility (same logic as backend)
          if (grossHouseholdIncome > adjustedLimits["grossB"] && finalAdjustedHouseholdIncome > adjustedLimits["netB"]) {
            reason = 'Ihr Brutto- und Nettoeinkommen liegen über den zulässigen Grenzen.';
          } else if (grossHouseholdIncome > adjustedLimits["grossB"]) {
            reason = 'Ihr Bruttoeinkommen liegt über der zulässigen Grenze.';
          } else {
            reason = 'Ihr Nettoeinkommen liegt über der zulässigen Grenze.';
          }
          
          group = 'Nicht Förderungsfähig';
          eligible = false;
        } else {
          // If we get here, income must be within Group B limits (same logic as backend)
          group = 'Gruppe B';
          eligible = true;
          reason = 'Sie erfüllen die Voraussetzungen für Gruppe B.';
        }
      }

      // Store the eligibility result for potential use in other sections
      (this as any).eligibilityResult = {
        group,
        eligible,
        reason,
        details: {
          adjustedGrossA: adjustedLimits["grossA"],
          adjustedNetA: adjustedLimits["netA"],
          adjustedGrossB: adjustedLimits["grossB"],
          adjustedNetB: adjustedLimits["netB"],
          childBonus: {
            grossA: childGrossBonusA,
            netA: childNetBonusA,
            grossB: childGrossBonusB,
            netB: childNetBonusB
          }
        }
      };

    } catch (error) {
      errors.push(`Fehler bei der Einkommensgruppen-Bestimmung: ${error}`);
    }

    const title = 'Bestimmung der Einkommensgruppe';
    return this.createCalculationSection('financial-income-group', title, calculations, errors, warnings);
  }

  private validateAdditionalFinancialCriteria(hauptantragData: any, einkommenserklarungData: any): ValidationSection {
    const errors: string[] = [];
    const warnings: string[] = [];
    const calculations: string[] = [];

    try {
      calculations.push('Ermittlung der Grunddarlehensgrenze');

      // Basic data presence checks
      const financeData = hauptantragData?.financeData || {};
      const objectData = hauptantragData?.objectData || {};
      const userData = hauptantragData?.userData || {};

      if (!financeData) {
        errors.push('Finanzdaten (Schritt 6) konnten nicht geladen werden.');
      }
      if (!objectData) {
        errors.push('Objektdaten (Adresse) konnten nicht geladen werden.');
      }
      if (userData?.hassupplementaryloan === true) {
        calculations.push('Grunddarlehen nicht relevant, da ein Ergänzungsdarlehen beantragt wird.');
        return this.createCalculationSection('financial-additional', 'Einhaltung der Darlehensgrenze', calculations, errors, warnings);
      } else if (errors.length > 0) {
        return this.createCalculationSection('financial-additional', 'Einhaltung der Darlehensgrenze', calculations, errors, warnings);
      }

      // Parse Grunddarlehen (store as cents)
      const parseCurrencyToCents = (value: any): number => {
        if (value === null || value === undefined || value === '') return 0;
        if (typeof value === 'number') return Math.round(value * 100);
        if (typeof value === 'string') return getNumericValue(value);
        return 0;
      };
      const grunddarlehenCents = parseCurrencyToCents(financeData.grunddarlehen_nennbetrag);
      if (!grunddarlehenCents || grunddarlehenCents <= 0) {
        warnings.push('Nennbetrag des Grunddarlehens wurde noch nicht angegeben.');
      }

      // Determine postcode-based limits (A/B) using cost category
      const postcode: string = objectData?.obj_postal_code || '';
      const { costCategory, limits } = getPostcodeValidation(postcode);
      const limitA = limits.categoryA; // cents
      const limitB = limits.categoryB; // cents

      calculations.push(`Postleitzahl: ${postcode || '—'}`);
      calculations.push(`Kostenkategorie: K${costCategory}`);
      calculations.push(`Zulässige Obergrenzen je Gruppe – A: ${formatCurrency(limitA)}, B: ${formatCurrency(limitB)}`);

      // Income group result must have been computed earlier in determineIncomeGroup
      const eligibilityResult = (this as any).eligibilityResult as
        | { group: string; eligible: boolean; reason: string }
        | undefined;

      if (!eligibilityResult) {
        warnings.push('Einkommensgruppe wurde noch nicht bestimmt. Führen Sie zuerst die Prüfung im persönlichen Bereich aus.');
        return this.createCalculationSection('financial-additional', 'Einhaltung der Darlehensgrenze', calculations, errors, warnings);
      }

      const groupLabel = eligibilityResult.group; // 'Gruppe A' | 'Gruppe B' | 'Nicht Förderungsfähig'
      calculations.push(`Ermittelte Einkommensgruppe: ${groupLabel}`);

      if (groupLabel === 'Nicht Förderungsfähig') {
        // If not eligible, any Grunddarlehen is not permitted
        if (grunddarlehenCents && grunddarlehenCents > 0) {
          errors.push('Der Haushalt ist aktuell nicht förderfähig. Ein Grunddarlehen ist daher nicht zulässig.');
        } else {
          warnings.push('Der Haushalt ist aktuell nicht förderfähig.');
        }
        return this.createCalculationSection('financial-additional', 'Einhaltung der Darlehensgrenze', calculations, errors, warnings);
      }

      // Choose correct limit based on income group
      const activeLimit = groupLabel === 'Gruppe A' ? limitA : limitB;
      calculations.push(`Angewendete Darlehensgrenze (${groupLabel}): ${formatCurrency(activeLimit)}`);

      if (grunddarlehenCents && grunddarlehenCents > 0) {
        calculations.push(`Beantragtes Grunddarlehen: ${formatCurrency(grunddarlehenCents)}`);
        if (grunddarlehenCents > activeLimit) {
          errors.push(
            `Grunddarlehen überschreitet die zulässige Grenze für ${groupLabel} in Kostenkategorie K${costCategory}: ` +
              `${formatCurrency(activeLimit)} erlaubt, aktuell ${formatCurrency(grunddarlehenCents)}.`
          );
        } else {
          calculations.push('✓ Grunddarlehen liegt innerhalb der zulässigen Grenze');
        }
      }
    } catch (error) {
      errors.push(`Fehler bei der Validierung zusätzlicher Kriterien: ${error}`);
    }

    const title = 'Einhaltung der Darlehensgrenze';
    return this.createCalculationSection('financial-additional', title, calculations, errors, warnings);
  }

  // Helper method to create calculation sections with both errors and calculations
  private createCalculationSection(id: string, title: string, calculations: string[], errors: string[], warnings: string[]): ValidationSection {
    // Determine navigation buttons based on section type
    const navigationButtons: NavigationButton[] = [];
    
    if (id.includes('household-income')) {
      navigationButtons.push({
        label: 'Zur Einkommenserklärung',
        action: '/einkommenserklaerung',
        type: 'primary'
      },
      {
      label: 'Zum Hauptantrag',
      action: '/hauptantrag?step=2',
      type: 'primary'
      },
      {
      label: 'Zur Haushaltsauskunft',
      action: '/haushaltsauskunft',
      type: 'primary'
      });
    } else if (id.includes('available-income')) {
      navigationButtons.push(
        {
        label: 'Zur Selbstauskunft',
        action: '/selbstauskunft',
        type: 'primary'
        },
        {
        label: 'Zum Hauptantrag',
        action: '/hauptantrag?step=2',
        type: 'primary'
        }
    );
    } else if (id.includes('income-group')) {
      navigationButtons.push(
        {
          label: 'Zum Hauptantrag',
          action: '/hauptantrag?step=2',
          type: 'primary'
        },
        {
          label: 'Zur Einkommenserklärung',
          action: '/einkommenserklaerung',
          type: 'secondary'
        },
        {
          label: 'Zur Selbstauskunft',
          action: '/selbstauskunft',
          type: 'primary'
        }
      );
    } else if (id.includes('financial-additional')) {
      navigationButtons.push(
        {
          label: 'Zum Hauptantrag',
          action: '/hauptantrag?step=6',
          type: 'primary'
        },
        {
          label: 'Zur Einkommenserklärung',
          action: '/einkommenserklaerung',
          type: 'secondary'
        },
       {
        label: 'Zur Haushaltsauskunft',
        action: '/haushaltsauskunft',
        type: 'primary'
        }
      );
    }

    // Create success messages for successful calculations
    const successMessages: string[] = [];
    if (errors.length === 0 && calculations.length > 0) {
      if (id.includes('household-income')) {
        successMessages.push('Haushalts-Einkommen erfolgreich berechnet');
      } else if (id.includes('available-income')) {
        successMessages.push('Verfügbares Monatseinkommen erfolgreich ermittelt');
      } else if (id.includes('income-group')) {
        const eligibility = (this as any).eligibilityResult;
        if (eligibility?.eligible && eligibility?.reason) {
          successMessages.push(eligibility.reason);
        } else if (eligibility && eligibility.reason) {
          errors.push(eligibility.reason);
        }
      }
    }

    return createEnhancedValidationSection(
      id,
      title,
      calculations,
      errors,
      warnings,
      successMessages,
      navigationButtons
    );
  }

  // Determine if the household is a retired household based on user_data employment and fallback to user_financials
  private async isRetiredHousehold(): Promise<boolean> {
    try {
      const { data: userData, error: userError } = await supabase
        .from('user_data')
        .select('employment, noIncome, weitere_antragstellende_personen')
        .eq('id', this.residentId)
        .single();

      if (userError) {
        return false;
      }

      const weiterePersonenRaw = userData?.weitere_antragstellende_personen || {};
      const weiterePersonen: Record<string, any> = Array.isArray(weiterePersonenRaw)
        ? Object.fromEntries(weiterePersonenRaw.map((p: any, idx: number) => [p.id || `legacy_${idx}`, p]))
        : (weiterePersonenRaw || {});

      type PersonInfo = { isMain: boolean; employment?: any; notHousehold?: boolean; noIncome?: boolean };
      const persons: PersonInfo[] = [];

      persons.push({ isMain: true, employment: userData?.employment, noIncome: userData?.noIncome });

      Object.values(weiterePersonen).forEach((p: any) => {
        persons.push({
          isMain: false,
          employment: p?.employment?.type ?? p?.employment,
          notHousehold: p?.notHousehold === true,
          noIncome: p?.noIncome === true,
        });
      });

      const candidates = persons.filter(p => p.notHousehold !== true && p.noIncome !== true);

      if (candidates.length === 0) {
        return false;
      }

      const allExplicitRetired = candidates.length > 0 && candidates.every(p => {
        const emp = typeof p.employment === 'string' ? p.employment : p?.employment?.type;
        return emp === 'retired';
      });
      if (allExplicitRetired) {
        return true;
      }

      const someoneNonRetired = candidates.some(p => {
        const emp = typeof p.employment === 'string' ? p.employment : p?.employment?.type;
        return emp && emp !== 'retired';
      });
      if (someoneNonRetired) {
        return false;
      }

      const { data: financialData, error: finError } = await supabase
        .from('user_financials')
        .select('*')
        .eq('user_id', this.residentId)
        .single();
      if (finError) {
        return false;
      }

      const mainHasPension = Number(financialData?.incomepension || 0) > 0 && financialData?.haspensionincome === true;
      const mainHasRegularEmployment = financialData?.hasSalaryIncome === true;

      const additionalFin: Record<string, any> = financialData?.additional_applicants_financials || {};
      const consideredAdditionalUuids = Object.entries(weiterePersonen)
        .filter(([_, p]: [string, any]) => p?.notHousehold !== true && p?.noIncome !== true)
        .map(([uuid]) => uuid);

      const additionalAllPension = consideredAdditionalUuids.every(uuid => {
        const fin = additionalFin[uuid] || {};
        const hasPension = Number(fin?.incomepension || 0) > 0 && fin?.haspensionincome === true;
        const hasRegular = fin?.hasSalaryIncome === true;
        return hasPension && !hasRegular;
      });

      const includesMain = candidates.some(p => p.isMain);
      const mainOk = includesMain ? (mainHasPension && !mainHasRegularEmployment) : true;

      return mainOk && additionalAllPension;
    } catch {
      return false;
    }
  }

  private calculateYearlyEmploymentIncome(financialData: any, incomeDetails: string[], warnings: string[], personName: string): number {
    const parseCurrencyValue = (value: any): number => {
      if (!value) return 0;
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        // Handle database format (e.g., "1200.00") vs German format (e.g., "1.200,00 €")
        if (value.includes('€') || value.includes(',')) {
          // German format: remove € and convert comma to dot
          const cleaned = value.replace(/[€\s]/g, '').replace(/\./g, '').replace(',', '.');
          const parsed = parseFloat(cleaned);
          return isNaN(parsed) ? 0 : parsed;
        } else {
          // Database format: already has dot as decimal separator
          const parsed = parseFloat(value);
          return isNaN(parsed) ? 0 : parsed;
        }
      }
      return 0;
    };

    const getCurrentYear = (): number => {
      return new Date().getFullYear();
    };

    const getMonth = (dateString: string): number => {
      if (!dateString) return 0;
      const date = new Date(dateString);
      return date.getMonth() + 1; // Convert to 1-12
    };

    const isDataMoreThan3MonthsOld = (endMonth: string, endYear: string): boolean => {
      if (!endMonth || !endYear) return true;
      
      const endDate = new Date(parseInt(endYear), parseInt(endMonth) - 1, 1);
      const currentDate = new Date();
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(currentDate.getMonth() - 3);
      
      return endDate < threeMonthsAgo;
    };
    
    // Helper to check if prior_year_earning is from last calendar year
    const isPriorYearLastCalendarYear = (priorYear: string | number): boolean => {
      const year = typeof priorYear === 'string' ? parseInt(priorYear) : priorYear;
      return year === getCurrentYear() - 1;
    };

    // Case 1: Use prior_year_earning if available and valid
    if (financialData.prior_year_earning && 
        parseCurrencyValue(financialData.prior_year_earning) > 0 && 
        !financialData.willchangeincome) {
      
      const priorYearEarning = parseCurrencyValue(financialData.prior_year_earning);
      const priorYear = financialData.prior_year || '0';
      const currentYear = getCurrentYear();
      
      if (isPriorYearLastCalendarYear(priorYear)) {
        // Valid prior year - include in calculation
        incomeDetails.push(`xyz .Vorjahreseinkommen (${priorYear}): ${this.formatCurrency(priorYearEarning)}`);
        return priorYearEarning;
      } else {
        // Invalid prior year - add warning but continue to Case 2 for monthly calculation
        warnings.push(`${personName}: Vorjahreseinkommen ist nicht vom letzten Kalenderjahr (${currentYear - 1})`);
        incomeDetails.push(`xyz .Vorjahreseinkommen (${priorYear}): ${this.formatCurrency(priorYearEarning)} (Nicht berücksichtigt)`);
        // Don't return here - continue to Case 2
      }
    }

    // Case 2: Calculate from monthly data if prior_year_earning is not available/valid OR not from last calendar year
    if ((!financialData.prior_year_earning || parseCurrencyValue(financialData.prior_year_earning) === 0 || !isPriorYearLastCalendarYear(financialData.prior_year)) &&
        !financialData.willchangeincome &&
        !isDataMoreThan3MonthsOld(financialData.end_month_past12, financialData.end_year_past12)) {
      
              // Add warning if prior year exists but is not from last calendar year (only if not already added in Case 1)
        if (financialData.prior_year_earning && parseCurrencyValue(financialData.prior_year_earning) > 0 && !isPriorYearLastCalendarYear(financialData.prior_year)) {
          const priorYear = financialData.prior_year || '0';
          const currentYear = getCurrentYear();
          // Only add this warning if it wasn't already added in Case 1
          if (!warnings.some(w => w.includes('Vorjahreseinkommen ist nicht vom letzten Kalenderjahr'))) {
            warnings.push(`${personName}: Vorjahreseinkommen (${priorYear}) ist nicht vom letzten Kalenderjahr (${currentYear - 1}) - verwende Monatsberechnung`);
          }
          if (!incomeDetails.some(d => d.includes('Vorjahreseinkommen') && d.includes('(Nicht berücksichtigt)'))) {
            incomeDetails.push(`xyz .Vorjahreseinkommen (${priorYear}): ${this.formatCurrency(parseCurrencyValue(financialData.prior_year_earning))} (Nicht berücksichtigt)`);
          }
        }
      
      let totalMonthlyIncome = 0;
      let monthsWithData = 0;

      // Sum up all monthly incomes
      for (let i = 1; i <= 12; i++) {
        const monthlyValue = parseCurrencyValue(financialData[`income_month${i}`]);
        if (monthlyValue > 0) {
          totalMonthlyIncome += monthlyValue;
          monthsWithData++;
        }
      }

      // Add Sonderzuwendungen for last 12 months
      const weihnachtsgeld = parseCurrencyValue(financialData.wheinachtsgeld_last12);
      const urlaubsgeld = parseCurrencyValue(financialData.urlaubsgeld_last12);
      const sonstigeEinkuenfte = parseCurrencyValue(financialData.otherincome_last12);
      
      const totalSonderzuwendungen = weihnachtsgeld + urlaubsgeld + sonstigeEinkuenfte;
      const totalEmploymentIncome = totalMonthlyIncome + totalSonderzuwendungen;

      incomeDetails.push(`xyz .Monatseinkommen (${monthsWithData} Monate): ${this.formatCurrency(totalMonthlyIncome)}`);
      if (totalSonderzuwendungen > 0) {
        incomeDetails.push(`xyz .Sonderzuwendungen: ${this.formatCurrency(totalSonderzuwendungen)}`);
      }
      incomeDetails.push(`xyz .Gesamt Beschäftigungseinkommen: ${this.formatCurrency(totalEmploymentIncome)}`);
      
      return totalEmploymentIncome;
    }

    // Case 3: Income will change
    if (financialData.willchangeincome) {
      const changeDate = financialData.incomechangedate;
      let isValidChangeDate = true;
      let changeDateWarning = '';

      if (!changeDate) {
        isValidChangeDate = false;
        changeDateWarning = 'Einkommensänderungsdatum fehlt für Projektion';
      } else {
        const changeMonth = getMonth(changeDate);
        if (changeMonth === 0) {
          isValidChangeDate = false;
          changeDateWarning = 'Ungültiges Einkommensänderungsdatum';
        } else if (!isValidFutureDate(changeDate)) {
          isValidChangeDate = false;
          changeDateWarning = 'Das Datum der Einkommensänderung liegt mehr als 12 Monate in der Vergangenheit oder mehr als 12 Monate in der Zukunft und ist somit ungültig - verwende Monatsberechnung';
        }
      }

      // If change date is invalid, fall back to Case 2 calculation
      if (!isValidChangeDate) {
        warnings.push(`${personName}: ${changeDateWarning}`);
        if (!isDataMoreThan3MonthsOld(financialData.end_month_past12, financialData.end_year_past12)) {
          let totalMonthlyIncome = 0;
          let monthsWithData = 0;
          for (let i = 1; i <= 12; i++) {
            const monthlyValue = parseCurrencyValue(financialData[`income_month${i}`]);
            if (monthlyValue > 0) {
              totalMonthlyIncome += monthlyValue;
              monthsWithData++;
            }
          }
          const weihnachtsgeld = parseCurrencyValue(financialData.wheinachtsgeld_last12);
          const urlaubsgeld = parseCurrencyValue(financialData.urlaubsgeld_last12);
          const sonstigeEinkuenfte = parseCurrencyValue(financialData.otherincome_last12);
          const totalSonderzuwendungen = weihnachtsgeld + urlaubsgeld + sonstigeEinkuenfte;
          const totalEmploymentIncome = totalMonthlyIncome + totalSonderzuwendungen;
          incomeDetails.push(`xyz .Monatseinkommen (${monthsWithData} Monate): ${this.formatCurrency(totalMonthlyIncome)}`);
          if (totalSonderzuwendungen > 0) {
            incomeDetails.push(`xyz .Sonderzuwendungen: ${this.formatCurrency(totalSonderzuwendungen)}`);
          }
          incomeDetails.push(`xyz .Gesamt Beschäftigungseinkommen: ${this.formatCurrency(totalEmploymentIncome)}`);
          return totalEmploymentIncome;
        } else {
          warnings.push(`${personName}: Daten sind zu alt für Monatsberechnung`);
          return 0;
        }
      }

      // --- New day-accurate projection ---
      const applicationDate = new Date(); // could be passed explicitly
      const change = new Date(changeDate);

      const daysInYear = 365; // adjust for leap years if needed
      const msPerDay = 1000 * 60 * 60 * 24;

      const projectionEnd = new Date(applicationDate);
      projectionEnd.setFullYear(projectionEnd.getFullYear() + 1);

      let oldDays = 0;
      let newDays = 0;

      if (change > applicationDate && change <= projectionEnd) {
        // Change in the future: old income until change date, new after
        oldDays = Math.floor((change.getTime() - applicationDate.getTime()) / msPerDay);
        if (oldDays < 0) oldDays = 0;
        if (oldDays > daysInYear) oldDays = daysInYear;
        newDays = daysInYear - oldDays;
      } else {
        // Change already happened or out of range in the past year → all new income
        oldDays = 0;
        newDays = daysInYear;
      }

      // Step 1: Average old monthly income (past 12 months)
      let totalOldMonthlyIncome = 0;
      let monthsWithOldData = 0;
      for (let i = 1; i <= 12; i++) {
        const val = parseCurrencyValue(financialData[`income_month${i}`]);
        if (val > 0) {
          totalOldMonthlyIncome += val;
          monthsWithOldData++;
        }
      }
      const averageOldDaily = monthsWithOldData > 0
        ? (totalOldMonthlyIncome / monthsWithOldData) * 12 / daysInYear
        : 0;

      // Step 2: New monthly income → daily
      let newMonthlyIncome = parseCurrencyValue(financialData.newincome);
      if (!financialData.isnewincomemonthly) {
        newMonthlyIncome = newMonthlyIncome / 12;
      }
      const newDailyIncome = newMonthlyIncome * 12 / daysInYear;

      // Step 3: Bonuses for next 12 months → daily
      const weihnachtsgeldNext = parseCurrencyValue(financialData.wheinachtsgeld_next12);
      const urlaubsgeldNext = parseCurrencyValue(financialData.urlaubsgeld_next12);
      const sonstigeNext = parseCurrencyValue(financialData.otherincome_next12);
      const totalSonderNext12 = weihnachtsgeldNext + urlaubsgeldNext + sonstigeNext;
      const dailySonderNext = totalSonderNext12 / daysInYear;

      // Step 4: Final projection
      const projectedIncome = (averageOldDaily * oldDays) + (newDailyIncome * newDays) + (dailySonderNext * daysInYear);

      // Breakdown
      incomeDetails.push(`xyz .Hochgerechnetes Jahreseinkommen (ab Antragstellung): ${this.formatCurrency(projectedIncome)}`);
      incomeDetails.push(`xyz .- Altes Einkommen (${oldDays} Tage): ${this.formatCurrency(averageOldDaily * oldDays)}`);
      incomeDetails.push(`xyz .- Neues Einkommen (${newDays} Tage): ${this.formatCurrency(newDailyIncome * newDays)}`);
      incomeDetails.push(`xyz .- Sonderzuwendungen (nächste 12 Monate): ${this.formatCurrency(totalSonderNext12)}`);

      return projectedIncome;
    }

  

    // Default case: no employment income data available
    return 0;
  }

  // Helper method to format currency
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  private validateCrossChecks(hauptantragData: any, einkommenserklarungData: any, selbsthilfeData: any): ValidationSection {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Cross-check 1: Household size consistency
    this.validateHouseholdSizeConsistency(hauptantragData, errors, warnings);

    // Cross-check 2: Household composition consistency
    this.validateHouseholdComposition(hauptantragData, errors, warnings);

    // Cross-check 3: Disabled counts consistency between forms
    this.validateDisabledCountsConsistency(hauptantragData, errors, warnings);

    // Cross-check 4: Net vs. Gross Validation
    this.validateNetVsGrossValidation(einkommenserklarungData, errors, warnings);

    // Cross-check 5: Salary and Maintenance Consistency
    this.validateSalaryAndMaintenanceConsistency(einkommenserklarungData, errors, warnings);

    // Cross-check 6: Selbsthilfe sum consistency between forms
    this.validateSelbsthilfeSumConsistency(hauptantragData, selbsthilfeData, errors, warnings);

 

    return createValidationSection('cross-checks', 'Übergreifende Prüfungen', errors, warnings);
  }

  /**
   * Validates household size consistency between Hauptantrag and HaushaltForm
   * Checks if adultCount + childCount equals the actual number of household members
   */
  private validateHouseholdSizeConsistency(hauptantragData: any, errors: string[], warnings: string[]): void {
    if (!hauptantragData?.userData) {
      warnings.push('Hauptantrag-Daten nicht verfügbar für Haushaltsgrößen-Prüfung');
      return;
    }

    const userData = hauptantragData.userData;
    const declaredAdultCount = userData.adult_count;
    const declaredChildCount = userData.child_count;
    const weiterePersonen = userData.weitere_antragstellende_personen || {};

    // Check if the declared counts are available
    if (declaredAdultCount === null || declaredAdultCount === undefined || 
        declaredChildCount === null || declaredChildCount === undefined) {
      warnings.push('Überprüfung der Haushaltsgröße: Haushaltsgröße im Hauptantrag nicht vollständig angegeben');
    }

    // Calculate actual household members from weitere_antragstellende_personen
    let actualHouseholdMembers = 0;
    let excludedPersons = 0;
    let excludedPersonDetails: string[] = [];

    // Count main applicant (always included unless marked as notHousehold)
    if (userData.notHousehold !== true) {
      actualHouseholdMembers++;
    } else {
      excludedPersons++;
      excludedPersonDetails.push('Hauptantragsteller (nicht im Haushalt)');
    }

    // Process additional persons
    if (typeof weiterePersonen === 'object' && weiterePersonen !== null) {
      Object.entries(weiterePersonen).forEach(([uuid, person]: [string, any]) => {
        const notHousehold = person.notHousehold === true;
        
        if (notHousehold) {
          excludedPersons++;
          excludedPersonDetails.push(`${person.firstName || 'Unbekannt'} ${person.lastName || ''} (nicht im Haushalt)`);
        } else {
          actualHouseholdMembers++;
        }
      });
    }

    // Calculate expected total from declared counts
    const declaredTotal = (declaredAdultCount || 0) + (declaredChildCount || 0);

    // Compare declared vs actual
    if (declaredTotal !== actualHouseholdMembers) {
      const errorMessage = `Haushaltsgröße stimmt nicht überein: ` +
        `Im Hauptantrag angegeben: ${declaredTotal} Personen (${declaredAdultCount || 0} Erwachsene, ${declaredChildCount || 0} Kinder), ` +
        `Haushalt laut Haushaltsauskunft: ${actualHouseholdMembers} Personen`;
      
      if (Math.abs(declaredTotal - actualHouseholdMembers) <= 1) {
        warnings.push(errorMessage);
      } else {
        errors.push(errorMessage);
      }
    }

    // Add information about excluded persons if any
    if (excludedPersons > 0) {
      warnings.push(`${excludedPersons} Person(en) vom Haushalt ausgeschlossen: ${excludedPersonDetails.join(', ')}`);
    }

    // Add success message if everything matches
   // if (declaredTotal === actualHouseholdMembers && excludedPersons === 0) {
     // warnings.push(`Haushaltsgröße stimmt überein: ${actualHouseholdMembers} Personen korrekt angegeben`);
   // }

  }

  /**
   * Validates household composition consistency between Hauptantrag and actual birth dates
   * Checks if adult_count and child_count match the age-based categorization from birth dates
   */
  private validateHouseholdComposition(hauptantragData: any, errors: string[], warnings: string[]): void {
    if (!hauptantragData?.userData) {
      warnings.push('Hauptantrag-Daten nicht verfügbar für Haushaltszusammensetzung-Prüfung');
      return;
    }

    const userData = hauptantragData.userData;
    const declaredAdultCount = userData.adult_count;
    const declaredChildCount = userData.child_count;
    const weiterePersonen = userData.weitere_antragstellende_personen || {};

    // Check if the declared counts are available
    if (declaredAdultCount === null || declaredAdultCount === undefined || 
        declaredChildCount === null || declaredChildCount === undefined) {
      warnings.push('Überprüfung der Haushaltszusammensetzung: Erwachsene/Kinder-Anzahl im Hauptantrag nicht vollständig angegeben');
    }

    // Calculate actual adult/child counts based on birth dates
    let actualAdults = 0;
    let actualChildren = 0;
    let unbornChildren = 0;
    let missingBirthDates: string[] = [];
    let personDetails: string[] = [];

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

    // Check main applicant
    if (userData.notHousehold !== true) {
      const mainApplicantBirthDate = userData.birthDate;
      if (mainApplicantBirthDate) {
        const age = calculateAge(mainApplicantBirthDate);
        if (age >= 0) {
          if (age >= 18) {
            actualAdults++;
            personDetails.push(`Hauptantragsteller: ${age} Jahre (Erwachsener)`);
          } else {
            actualChildren++;
            personDetails.push(`Hauptantragsteller: ${age} Jahre (Kind)`);
          }
        } else if (age === -1) {
          // Unborn child (pregnant woman)
          unbornChildren++;
          personDetails.push(`Hauptantragsteller: Ungeboren (Schwanger)`);
        } else if (age < -1) {
          // Only add to missing if birth date is more than 12 months in the past
          missingBirthDates.push('Hauptantragsteller');
        }
      } else {
        missingBirthDates.push('Hauptantragsteller');
      }
    }

    // Process additional persons
    if (typeof weiterePersonen === 'object' && weiterePersonen !== null) {
      Object.entries(weiterePersonen).forEach(([uuid, person]: [string, any]) => {
        const notHousehold = person.notHousehold === true;
        
        if (!notHousehold) {
          const birthDate = person.birthDate;
          if (birthDate) {
            const age = calculateAge(birthDate);
            if (age >= 0) {
              if (age >= 18) {
                actualAdults++;
                personDetails.push(`${person.firstName || 'Unbekannt'} ${person.lastName || ''}: ${age} Jahre (Erwachsener)`);
              } else {
                actualChildren++;
                personDetails.push(`${person.firstName || 'Unbekannt'} ${person.lastName || ''}: ${age} Jahre (Kind)`);
              }
            } else if (age === -1) {
              // Unborn child (pregnant woman)
              unbornChildren++;
              personDetails.push(`${person.firstName || 'Unbekannt'} ${person.lastName || ''}: Ungeboren (Schwanger)`);
            } else if (age < -1) {
              // Only add to missing if birth date is more than 12 months in the past
              missingBirthDates.push(`${person.firstName || 'Unbekannt'} ${person.lastName || ''}`);
            }
          } else {
            missingBirthDates.push(`${person.firstName || 'Unbekannt'} ${person.lastName || ''}`);
          }
        }
      });
    }

    // Compare declared vs actual composition
    if (declaredAdultCount !== actualAdults || declaredChildCount !== actualChildren) {
      const styledAC = actualAdults === null || actualAdults === undefined ? '--' : actualAdults;
      const styledCC = actualChildren === null || actualChildren === undefined ? '--' : actualChildren;
      const styleddAC = declaredAdultCount === null || declaredAdultCount === undefined ? '--' : declaredAdultCount;
      const styleddCC = declaredChildCount === null || declaredChildCount === undefined ? '--' : declaredChildCount;
      
      // Format children count to include unborn children if any
      let formattedActualChildren = styledCC;
      if (unbornChildren > 0) {
        formattedActualChildren = `${actualChildren + unbornChildren} Kinder (Davon ${unbornChildren} Ungeboren)`;
      }else{
        formattedActualChildren = `${actualChildren} Kinder`;
      }
      
      const errorMessage = `Haushaltszusammensetzung stimmt nicht überein: ` +
        `Im Hauptantrag angegeben: ${styleddAC} Erwachsene, ${styleddCC} Kinder, ` +
        `Laut Geburtsdaten: ${styledAC} Erwachsene, ${formattedActualChildren}`;
        errors.push(errorMessage);
    }

    // Add warnings for missing birth dates
    if (missingBirthDates.length > 0) {
      warnings.push(`Geburtsdaten fehlen für: ${missingBirthDates.join(', ')}`);
    }

    // Add detailed person information if there are discrepancies
    if (declaredAdultCount !== actualAdults || declaredChildCount !== actualChildren) {
      warnings.push(`Detaillierte Altersaufstellung: ${personDetails.join('; ')}`);
    }
    
    // Add information about unborn children if any
    if (unbornChildren > 0) {
      warnings.push(`Ungeborene Kinder werden in der Gesamtanzahl berücksichtigt: ${unbornChildren} ungeboren`);
    }
  }

  /**
   * Validates disabled counts consistency between Hauptantrag and HaushaltForm
   * Checks if disabledAdultsCount and disabledChildrenCount match the actual count of persons
   * with behinderungsgrad >= 50 (Schwerbehindert) based on age categorization
   */
  private validateDisabledCountsConsistency(hauptantragData: any, errors: string[], warnings: string[]): void {
    if (!hauptantragData?.userData) {
      warnings.push('Hauptantrag-Daten nicht verfügbar zur Prüfung der Schwerbehinderten Angaben');
      return;
    }

    const userData = hauptantragData.userData;
    const declaredDisabledAdultsCount = userData.disabledadultscount;
    const declaredDisabledChildrenCount = userData.disabledchildrencount;
    const isDisabled = userData.is_disabled;
    const weiterePersonen = userData.weitere_antragstellende_personen || {};

    // Check if the declared disabled counts are available

    if(isDisabled === true){  
      if (declaredDisabledAdultsCount === null || declaredDisabledAdultsCount === undefined || 
          declaredDisabledChildrenCount === null || declaredDisabledChildrenCount === undefined) {
        warnings.push('Überprüfung der Schwerbehinderten im Haushalt: Behindertenanzahl im Hauptantrag nicht vollständig angegeben');
      }
    }else if (isDisabled === null || isDisabled === undefined ){  
      warnings.push('Überprüfung der Schwerbehinderten im Haushalt: Es ist nicht angegeben, ob der sich schwerbehinderte im Haushalt befinden');
    }
    // Calculate actual disabled counts based on behinderungsgrad and age
    let actualDisabledAdults = 0;
    let actualDisabledChildren = 0;
    let missingBehinderungsgrad: string[] = [];
    let personDetails: string[] = [];

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

    // Check main applicant
    if (userData.notHousehold !== true) {
      const mainApplicantBehinderungsgrad = userData.main_behinderungsgrad;
      const mainApplicantBirthDate = userData.birthDate;
      
      if (mainApplicantBehinderungsgrad !== null && mainApplicantBehinderungsgrad !== undefined) {
        const behinderungsgrad = Number(mainApplicantBehinderungsgrad);
        if (behinderungsgrad >= 50) {
          const age = calculateAge(mainApplicantBirthDate);
          if (age >= 0) {
            if (age >= 18) {
              actualDisabledAdults++;
              personDetails.push(`Hauptantragsteller: ${behinderungsgrad}% (Erwachsener, schwerbehindert)`);
            } else {
              actualDisabledChildren++;
              personDetails.push(`Hauptantragsteller: ${behinderungsgrad}% (Kind, schwerbehindert)`);
            }
          } else if (age === -1) {
            // Unborn child (pregnant woman) - don't count as disabled yet
            personDetails.push(`Hauptantragsteller: ${behinderungsgrad}% (Ungeboren, nicht als behindert gezählt)`);
          } else {
            // If age can't be determined, assume adult (main applicant is typically adult)
            actualDisabledAdults++;
            personDetails.push(`Hauptantragsteller: ${behinderungsgrad}% (Alter unbekannt, als Erwachsener gezählt)`);
          }
        }
      } else {
        missingBehinderungsgrad.push('Hauptantragsteller');
      }
    }

    // Process additional persons
    if (typeof weiterePersonen === 'object' && weiterePersonen !== null) {
      Object.entries(weiterePersonen).forEach(([uuid, person]: [string, any]) => {
        const notHousehold = person.notHousehold === true;
        
        if (!notHousehold) {
          const behinderungsgrad = person.behinderungsgrad;
          const birthDate = person.birthDate;
          
          if (behinderungsgrad !== null && behinderungsgrad !== undefined && behinderungsgrad !== '') {
            const gradValue = Number(behinderungsgrad);
            if (gradValue >= 50) {
              const age = calculateAge(birthDate);
              if (age >= 0) {
                if (age >= 18) {
                  actualDisabledAdults++;
                  personDetails.push(`${person.firstName || 'Unbekannt'} ${person.lastName || ''}: ${gradValue}% (Erwachsener, schwerbehindert)`);
                } else {
                  actualDisabledChildren++;
                  personDetails.push(`${person.firstName || 'Unbekannt'} ${person.lastName || ''}: ${gradValue}% (Kind, schwerbehindert)`);
                }
              } else if (age === -1) {
                // Unborn child (pregnant woman) - don't count as disabled yet
                personDetails.push(`${person.firstName || 'Unbekannt'} ${person.lastName || ''}: ${gradValue}% (Ungeboren, nicht als behindert gezählt)`);
              } else {
                // If age can't be determined, assume adult
                actualDisabledAdults++;
                personDetails.push(`${person.firstName || 'Unbekannt'} ${person.lastName || ''}: ${gradValue}% (Alter unbekannt, als Erwachsener gezählt)`);
              }
            }
          } else {
            missingBehinderungsgrad.push(`${person.firstName || 'Unbekannt'} ${person.lastName || ''}`);
          }
        }
      });
    }

    // Compare declared vs actual disabled counts
    if(isDisabled === true){
      if (declaredDisabledAdultsCount !== actualDisabledAdults || declaredDisabledChildrenCount !== actualDisabledChildren) {
        const styledDAC = actualDisabledAdults === null || actualDisabledAdults === undefined ? '--' : actualDisabledAdults;
        const styledDCC = actualDisabledChildren === null || actualDisabledChildren === undefined ? '--' : actualDisabledChildren;
        const styleddDAC = declaredDisabledAdultsCount === null || declaredDisabledAdultsCount === undefined ? '--' : declaredDisabledAdultsCount;
        const styleddDCC = declaredDisabledChildrenCount === null || declaredDisabledChildrenCount === undefined ? '--' : declaredDisabledChildrenCount;
        
        const errorMessage = `Schwerbehindertenanzahl stimmt nicht überein: ` +
          `Im Hauptantrag angegeben: ${styleddDAC} schwerbehinderte Erwachsene, ${styleddDCC} schwerbehinderte Kinder, ` +
          `Laut Haushaltsauskunft: ${styledDAC} schwerbehinderte Erwachsene, ${styledDCC} schwerbehinderte Kinder`;
        
        errors.push(errorMessage);
      }
   }

    // Add warnings for missing behinderungsgrad data
    if (missingBehinderungsgrad.length > 0) {
      warnings.push(`Behinderungsgrad fehlt für: ${missingBehinderungsgrad.join(', ')}`);
    }

    // Check if is_disabled flag is consistent with actual disabled persons
    const hasDisabledPersons = (actualDisabledAdults + actualDisabledChildren) > 0;
    if (userData.is_disabled === true && !hasDisabledPersons) {
      errors.push(
        'Im Hauptantrag ist angegeben, dass schwerbehinderte Personen im Haushalt leben. In der Haushaltsauskunft wurden jedoch keine Personen mit einem Behinderungsgrad von mindestens 50 % gefunden.'
      );
    } else if (userData.is_disabled === false && hasDisabledPersons) {
      errors.push(
        'Im Hauptantrag ist angegeben, dass keine schwerbehinderten Personen im Haushalt leben. In der Haushaltsauskunft wurden jedoch Personen mit einem Behinderungsgrad von mindestens 50 % gefunden.'
      );
    }
    
  }

  /**
   * Validates selbsthilfe sum consistency between Hauptantrag and Selbsthilfe form
   * Checks if the selbsthilfe sum from the form matches the one column value in Hauptantrag
   */
  private validateSelbsthilfeSumConsistency(hauptantragData: any, selbsthilfeData: any, errors: string[], warnings: string[]): void {
    if (!hauptantragData?.financeData || !selbsthilfeData) {
      warnings.push('Selbsthilfe-Summen-Prüfung: Hauptantrag- oder Selbsthilfe-Daten nicht verfügbar');
      return;
    }

    const hauptantragSelbsthilfe = hauptantragData.financeData.selbsthilfe;

    // Calculate the total selbsthilfe sum from the form
    const formSelbsthilfeSum = selbsthilfeData.totals?.totalSelbsthilfe || 0;
    
    if (Math.abs(formSelbsthilfeSum - hauptantragSelbsthilfe) > 0.01) { // Allow for small rounding differences
      const errorMessage = `Selbsthilfe-Summen stimmen nicht überein: ` +
        `Selbsthilfe Eigentumsmaßnahmen: ${formSelbsthilfeSum.toFixed(2)} €, ` +
        `Hauptantrag (Selbsthilfe): ${hauptantragSelbsthilfe.toFixed(2)} €`;
      
      errors.push(errorMessage);
    }
  }



  /**
   * Validates income consistency between Hauptantrag and Einkommenserklärung
   * Checks if income amounts are consistent across forms
   */
  private validateIncomeConsistency(hauptantragData: any, einkommenserklarungData: any, errors: string[], warnings: string[]): void {
    if (!hauptantragData?.userData || !einkommenserklarungData?.financialData) {
      warnings.push('Daten für Einkommens-Konsistenzprüfung nicht vollständig verfügbar');
      return;
    }

    const userData = hauptantragData.userData;
    const financialData = einkommenserklarungData.financialData;

    // Check main applicant income consistency
    const hauptantragGrossIncome = userData.gross_income;
    const hauptantragNetIncome = userData.net_income;

    if (hauptantragGrossIncome !== null && hauptantragGrossIncome !== undefined) {
      // Compare with Einkommenserklärung data if available
      const einkommenserklarungGrossIncome = financialData.gross_income;
      
      if (einkommenserklarungGrossIncome !== null && einkommenserklarungGrossIncome !== undefined) {
        const difference = Math.abs(Number(hauptantragGrossIncome) - Number(einkommenserklarungGrossIncome));
        const percentageDifference = (difference / Number(hauptantragGrossIncome)) * 100;
        
        if (percentageDifference > 10) { // More than 10% difference
          warnings.push(`Bruttoeinkommen weicht zwischen Hauptantrag (${this.formatCurrency(Number(hauptantragGrossIncome))}) und Einkommenserklärung (${this.formatCurrency(Number(einkommenserklarungGrossIncome))}) ab (Differenz: ${this.formatCurrency(difference)})`);
        }
      }
    }

    // Check if employment status is consistent
    const hauptantragEmployment = userData.employment_title;
    const einkommenserklarungEmployment = financialData.employment_title;
    
    if (hauptantragEmployment && einkommenserklarungEmployment && 
        hauptantragEmployment !== einkommenserklarungEmployment) {
      warnings.push(`Beschäftigung weicht zwischen Hauptantrag ("${hauptantragEmployment}") und Einkommenserklärung ("${einkommenserklarungEmployment}") ab`);
    }
  }

  /**
   * Validates address consistency between different forms
   * Checks if addresses are consistent across Hauptantrag, Einkommenserklärung, and Selbsthilfe
   */
  private calculateAdditionalIncomeType(
    financialData: any,
    incomeType: string,
    incomeField: string,
    incomeDetails: string[],
    warnings: string[],
    personName: string,
    yearField?: string,
    isMonthly: boolean = false,
    isDaily: boolean = false
  ): number {
    const parseCurrencyValue = (value: any): number => {
      if (!value) return 0;
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        // Handle database format (e.g., "1200.00") vs German format (e.g., "1.200,00 €")
        if (value.includes('€') || value.includes(',')) {
          // German format: remove € and convert comma to dot
          const cleaned = value.replace(/[€\s]/g, '').replace(/\./g, '').replace(',', '.');
          const parsed = parseFloat(cleaned);
          return isNaN(parsed) ? 0 : parsed;
        } else {
          // Database format: already has dot as decimal separator
          const parsed = parseFloat(value);
          return isNaN(parsed) ? 0 : parsed;
        }
      }
      return 0;
    };

    const getCurrentYear = (): number => {
      return new Date().getFullYear();
    };

    const getMonth = (dateString: string): number => {
      if (!dateString) return 0;
      const date = new Date(dateString);
      return date.getMonth() + 1; // Convert to 1-12
    };

    // Helper to check if year is from last calendar year
    const isLastCalendarYear = (year: string | number): boolean => {
      const yearNum = typeof year === 'string' ? parseInt(year) : year;
      return yearNum === getCurrentYear() - 1;
    };

    // Get the change data for this income type
    // Map database field names to change type keys
    const fieldToChangeTypeMap: Record<string, string> = {
      'incomebusiness': 'gewerbe',
      'incomeagriculture': 'landforst',
      'incomerent': 'vermietung',
      'incomepension': 'renten',
      'incomeablg': 'arbeitslosengeld',
      'incomeforeign': 'ausland',
      'incomeothers': 'sonstige',
      'incomepauschal': 'pauschal',
      'incomeunterhalttaxfree': 'unterhaltsteuerpflichtig',
      'incomeunterhalttaxable': 'unterhaltsteuerpflichtig'
    };
    
    const changeTypeKey = fieldToChangeTypeMap[incomeField];
    
    // Parse the JSON string if needed
    let parsedChangeData = null;
    try {
      parsedChangeData = typeof financialData.addition_change_inincome === 'string' 
        ? JSON.parse(financialData.addition_change_inincome)
        : financialData.addition_change_inincome;
    } catch (e) {
      console.error('Error parsing addition_change_inincome:', e);
    }
    
    const changeData = changeTypeKey && parsedChangeData ? parsedChangeData.changes?.[changeTypeKey] : null;
    const willChange = changeTypeKey && parsedChangeData?.selectedTypes?.includes(changeTypeKey);

    // If no income value AND no change planned, don't show in calculation
    const currentValue = parseCurrencyValue(financialData[incomeField]);
    if (currentValue === 0 && !willChange) {
      return 0;
    }

    // Case 1: No change and valid year (if yearly income)
    if (!willChange) {
      if (yearField && financialData[yearField]) {
        const year = financialData[yearField];
        if (isLastCalendarYear(year)) {
          // Valid year - include in calculation
          let annualValue = currentValue;
          if (isMonthly) {
            annualValue = currentValue * 12;
          } else if (isDaily) {
            annualValue = currentValue * 365;
          }
          incomeDetails.push(`xyz .${incomeType} (${year}): ${this.formatCurrency(annualValue)}`);
          return annualValue;
        } else {
          // Invalid year - show but don't add to total
          let annualValue = currentValue;
          if (isMonthly) {
            annualValue = currentValue * 12;
          } else if (isDaily) {
            annualValue = currentValue * 365;
          }
          incomeDetails.push(`${incomeType} (${year}): ${this.formatCurrency(annualValue)} (Nicht berücksichtigt)`);
          return 0;
        }
      } else {
        // No year field or no year specified - assume current year
        let annualValue = currentValue;
        if (isMonthly) {
          annualValue = currentValue * 12;
        } else if (isDaily) {
          annualValue = currentValue * 365;
        }
        incomeDetails.push(`xyz .${incomeType}: ${this.formatCurrency(annualValue)}`);
        return annualValue;
      }
    }

    // Case 2: Income will change - validate change date
    if (willChange) {
      const changeDate = changeData.date;
      let isValidChangeDate = true;
      let changeDateWarning = '';
      
      if (!changeDate) {
        isValidChangeDate = false;
        changeDateWarning = `${incomeType} Änderungsdatum fehlt für Projektion`;
      } else {
        const changeMonth = getMonth(changeDate);
        if (changeMonth === 0) {
          isValidChangeDate = false;
          changeDateWarning = `Ungültiges ${incomeType} Änderungsdatum`;
        } else if (!isValidFutureDate(changeDate)) {
          isValidChangeDate = false;
          changeDateWarning = `Das ${incomeType} Änderungsdatum liegt mehr als 12 Monate in der Vergangenheit oder mehr als 12 Monate in der Zukunft und ist somit ungültig`;
        }
      }

      // If change date is invalid, fall back to current value calculation
      if (!isValidChangeDate) {
        warnings.push(`${personName}: ${changeDateWarning}`);
        
        // Use current value as fallback
        let annualValue = currentValue;
        if (isMonthly) {
          annualValue = currentValue * 12;
        } else if (isDaily) {
          annualValue = currentValue * 365;
        }
        incomeDetails.push(`xyz .${incomeType} (Alter Betrag, da Änderungsdatum ungültig): ${this.formatCurrency(annualValue)}`);
        return annualValue;
      }

      // Proceed with change projection calculation
      const applicationDate = new Date();
      const change = new Date(changeDate);

      const daysInYear = 365; // optionally check leap year
      const msPerDay = 1000 * 60 * 60 * 24;

      // Bound the projection to exactly 12 months from application date
      const projectionEnd = new Date(applicationDate);
      projectionEnd.setFullYear(projectionEnd.getFullYear() + 1);

      let oldDays = 0;
      let newDays = 0;

      if (change > applicationDate && change <= projectionEnd) {
        // Future change within 12 months
        oldDays = Math.floor((change.getTime() - applicationDate.getTime()) / msPerDay);
        if (oldDays < 0) oldDays = 0;
        if (oldDays > daysInYear) oldDays = daysInYear;
        newDays = daysInYear - oldDays;
      } else if (
        change < applicationDate &&
        change >= new Date(applicationDate.getFullYear() - 1, applicationDate.getMonth(), applicationDate.getDate())
      ) {
        // Past change within last 12 months
        newDays = Math.floor((projectionEnd.getTime() - change.getTime()) / msPerDay);
        if (newDays < 0) newDays = 0;
        if (newDays > daysInYear) newDays = daysInYear;
        oldDays = daysInYear - newDays;
      } else {
        // Outside ±12 months window — fallback: all new income
        warnings.push(`${personName}: ${incomeType}: Änderungsdatum liegt nicht im relevanten Zeitraum (±12 Monate)`);
        oldDays = 0;
        newDays = daysInYear;
      }

      // Calculate old annual income
      let oldAnnualIncome = currentValue;
      if (isMonthly) {
        oldAnnualIncome = currentValue * 12;
      } else if (isDaily) {
        oldAnnualIncome = currentValue * daysInYear;
      }

      // Get new income value and convert to annual
      let newIncome = parseCurrencyValue(changeData.newAmount);
      let newAnnualIncome = newIncome;

      // Handle special cases for income types
      if (incomeField === 'incomeforeign') {
        const newIsMonthly = changeData.isNewIncomeMonthly;
        if (newIsMonthly === null || newIsMonthly === undefined) {
          warnings.push(`${personName}: ${incomeType} Änderung: Turnus (monatlich/jährlich) muss definiert werden`);
          let annualValue = currentValue;
          if (isMonthly) annualValue = currentValue * 12;
          incomeDetails.push(`xyz .${incomeType} (Alter Betrag, da Änderungsdatum ungültig): ${this.formatCurrency(annualValue)}`);
          return annualValue;
        }
        if (newIsMonthly) newAnnualIncome = newIncome * 12;
      } else if (incomeField === 'incomeablg') {
        const newIsMonthly = changeData.isNewIncomeMonthly;
        const newIsDaily = changeData.isNewIncomeDaily;
        if (newIsDaily) newAnnualIncome = newIncome * daysInYear;
        else if (newIsMonthly) newAnnualIncome = newIncome * 12;
      } else {
        if (changeData.isNewIncomeMonthly) newAnnualIncome = newIncome * 12;
      }

      // Calculate projected income using day weights
      const dailyOldIncome = oldAnnualIncome / daysInYear;
      const dailyNewIncome = newAnnualIncome / daysInYear;

      const projectedIncome = dailyOldIncome * oldDays + dailyNewIncome * newDays;

      // Add breakdown
      incomeDetails.push(`xyz .Hochgerechnetes ${incomeType} (ab Antragstellung): ${this.formatCurrency(projectedIncome)}`);
      incomeDetails.push(`xyz .- Altes ${incomeType} (${oldDays} Tage): ${this.formatCurrency(dailyOldIncome * oldDays)}`);
      incomeDetails.push(`xyz .- Neues ${incomeType} (${newDays} Tage): ${this.formatCurrency(dailyNewIncome * newDays)}`);

      return projectedIncome;
    }

    // Default case: no valid calculation possible
    return 0;
  }

  /**
   * Helper function to calculate deductible expenses with change projection logic
   * 
   * This function handles the complex logic for calculating deductible expenses like
   * Werbekosten, Kinderbetreuungskosten, and Unterhaltszahlungen, including change projections.
   * 
   * @param financialData - The financial data object containing expense fields and change data
   * @param expenseType - Display name for the expense type (used in calculation details)
   * @param expenseField - Database field name for the expense value (e.g., 'werbungskosten')
   * @param expenseDetails - Array to append calculation details to
   * @param warnings - Array to append warnings to
   * @param isMonthlyArray - Whether the expense is stored as a monthly array (like unterhaltszahlungen)
   * @returns The calculated annual expense amount to deduct from adjusted income
   */
  private calculateDeductibleExpenses(
    financialData: any,
    expenseType: string,
    expenseField: string,
    expenseDetails: string[],
    warnings: string[],
    personName: string,
    isMonthlyArray: boolean = false
  ): number {
    const parseCurrencyValue = (value: any): number => {
      if (!value) return 0;
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        // Handle database format (e.g., "1200.00") vs German format (e.g., "1.200,00 €")
        if (value.includes('€') || value.includes(',')) {
          // German format: remove € and convert comma to dot
          const cleaned = value.replace(/[€\s]/g, '').replace(/\./g, '').replace(',', '.');
          const parsed = parseFloat(cleaned);
          return isNaN(parsed) ? 0 : parsed;
        } else {
          // Database format: already has dot as decimal separator
          const parsed = parseFloat(value);
          return isNaN(parsed) ? 0 : parsed;
        }
      }
      return 0;
    };

    const getCurrentYear = (): number => {
      return new Date().getFullYear();
    };

    const getMonth = (dateString: string): number => {
      if (!dateString) return 0;
      const date = new Date(dateString);
      return date.getMonth() + 1; // Convert to 1-12
    };

    // Get the change data for this expense type
    // Map database field names to change type keys
    const fieldToChangeTypeMap: Record<string, string> = {
      'werbungskosten': 'werbungskosten',
      'kinderbetreuungskosten': 'kinderbetreuungskosten',
      'unterhaltszahlungen': 'unterhaltszahlungen'
    };
    
    const changeTypeKey = fieldToChangeTypeMap[expenseField];
    
    // Parse the JSON string if needed
    let parsedChangeData = null;
    try {
      parsedChangeData = typeof financialData.addition_change_inincome === 'string' 
        ? JSON.parse(financialData.addition_change_inincome)
        : financialData.addition_change_inincome;
    } catch (e) {
      console.error('Error parsing addition_change_inincome:', e);
    }
    
    const changeData = changeTypeKey && parsedChangeData ? parsedChangeData.changes?.[changeTypeKey] : null;
    const willChange = changeTypeKey && parsedChangeData?.selectedTypes?.includes(changeTypeKey);

    // Calculate current value
    let currentValue = 0;
    if (isMonthlyArray) {
      // For unterhaltszahlungen - sum all monthly payments
      const payments = financialData[expenseField] || [];
      if (Array.isArray(payments)) {
        currentValue = payments.reduce((sum: number, payment: any) => {
          return sum + parseCurrencyValue(payment.amount);
        }, 0);
      }
    } else {
      // For yearly values like werbungskosten and kinderbetreuungskosten
      currentValue = parseCurrencyValue(financialData[expenseField]);
    }

    // If no expense value AND no change planned, don't show in calculation
    if (currentValue === 0 && !willChange) {
      return 0;
    }

    // Case 1: No change - use current value
    if (!willChange) {
      let annualValue = currentValue;
      if (isMonthlyArray) {
        annualValue = currentValue * 12; // Convert monthly to annual
      }
      expenseDetails.push(`xyz .${expenseType}: ${this.formatCurrency(annualValue)}`);
      return annualValue;
    }

    // Case 2: Expense will change - validate change date
    if (willChange) {
      const changeDate = changeData.date;
      let isValidChangeDate = true;
      let changeDateWarning = '';
      
      if (!changeDate) {
        isValidChangeDate = false;
        changeDateWarning = `${expenseType} Änderungsdatum fehlt für Projektion`;
      } else {
        const changeMonth = getMonth(changeDate);
        if (changeMonth === 0) {
          isValidChangeDate = false;
          changeDateWarning = `Ungültiges ${expenseType} Änderungsdatum`;
        } else if (!isValidFutureDate(changeDate)) {
          isValidChangeDate = false;
          changeDateWarning = `Das ${expenseType} Änderungsdatum liegt mehr als 12 Monate in der Vergangenheit oder mehr als 12 Monate in der Zukunft und ist somit ungültig`;
        }
      }

      // If change date is invalid, fall back to current value calculation
      if (!isValidChangeDate) {
        warnings.push(`${personName}: ${changeDateWarning}`);
        
        let annualValue = currentValue;
        if (isMonthlyArray) {
          annualValue = currentValue * 12;
        }
        expenseDetails.push(`xyz .${expenseType} (Alter Betrag, da Änderungsdatum ungültig): ${this.formatCurrency(annualValue)}`);
        return annualValue;
      }

      // Proceed with change projection calculation
      const applicationDate = new Date();
      const change = new Date(changeDate);

      const daysInYear = 365; // optionally check leap year
      const msPerDay = 1000 * 60 * 60 * 24;

      // Bound the projection to exactly 12 months from application date
      const projectionEnd = new Date(applicationDate);
      projectionEnd.setFullYear(projectionEnd.getFullYear() + 1);

      let oldDays = 0;
      let newDays = 0;

      if (change > applicationDate && change <= projectionEnd) {
        // Future change within 12 months
        oldDays = Math.floor((change.getTime() - applicationDate.getTime()) / msPerDay);
        if (oldDays < 0) oldDays = 0;
        if (oldDays > daysInYear) oldDays = daysInYear;
        newDays = daysInYear - oldDays;
      } else if (
        change < applicationDate &&
        change >= new Date(applicationDate.getFullYear() - 1, applicationDate.getMonth(), applicationDate.getDate())
      ) {
        // Past change within last 12 months
        newDays = Math.floor((projectionEnd.getTime() - change.getTime()) / msPerDay);
        if (newDays < 0) newDays = 0;
        if (newDays > daysInYear) newDays = daysInYear;
        oldDays = daysInYear - newDays;
      } else {
        // Outside ±12 months window — fallback: all new expense
        warnings.push(`${personName}: ${expenseType}: Änderungsdatum liegt nicht im relevanten Zeitraum (±12 Monate)`);
        oldDays = 0;
        newDays = daysInYear;
      }

      // Calculate old annual expense
      let oldAnnualExpense = currentValue;
      if (isMonthlyArray) {
        oldAnnualExpense = currentValue * 12;
      }

      // Get new expense value and convert to annual
      let newExpense = parseCurrencyValue(changeData.newAmount);
      let newAnnualExpense = newExpense;

      // Handle monthly vs yearly new amounts
      if (changeData.isNewIncomeMonthly) {
        newAnnualExpense = newExpense * 12;
      }

      // Calculate projected expense using day weights
      const dailyOldExpense = oldAnnualExpense / daysInYear;
      const dailyNewExpense = newAnnualExpense / daysInYear;

      const projectedExpense = dailyOldExpense * oldDays + dailyNewExpense * newDays;

      // Add breakdown
      expenseDetails.push(`xyz .Hochgerechnete ${expenseType} (ab Antragstellung): ${this.formatCurrency(projectedExpense)}`);
      expenseDetails.push(`xyz .- Alte ${expenseType} (${oldDays} Tage): ${this.formatCurrency(dailyOldExpense * oldDays)}`);
      expenseDetails.push(`xyz .- Neue ${expenseType} (${newDays} Tage): ${this.formatCurrency(dailyNewExpense * newDays)}`);

      return projectedExpense;
    }

    // Default case: no valid calculation possible
    return 0;
  }

  /**
   * Validates net vs gross values between Einkommenserklärung and Selbstauskunft
   * Checks if net values are higher than gross values for various income types
   */
  private validateNetVsGrossValidation(einkommenserklarungData: any, errors: string[], warnings: string[]): void {
    if (!einkommenserklarungData?.userData || !einkommenserklarungData?.financialData) {
      warnings.push('Einkommenserklärung-Daten nicht verfügbar für Netto-Brutto-Überprüfung');
      return;
    }

    // We need to fetch Selbstauskunft data to compare with Einkommenserklärung data
    // For now, we'll compare within the same form since both gross and net values are stored there
    const userData = einkommenserklarungData.userData;
    const financialData = einkommenserklarungData.financialData;
    const weiterePersonen = userData.weitere_antragstellende_personen || {};

    // Helper function to parse currency values
    const parseCurrencyValue = (value: any): number => {
      if (value === null || value === undefined || value === '') return 0;
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const cleaned = value.replace(/[^\d.,-]/g, '').replace(',', '.');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };

    // Helper function to format currency
    const formatCurrency = (value: number): string => {
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value);
    };

    // Validate main applicant
    this.validatePersonNetVsGross(
      financialData,
      'Hauptantragsteller',
      errors,
      warnings,
      parseCurrencyValue,
      formatCurrency
    );

    // Validate additional applicants
    if (financialData?.additional_applicants_financials && Object.keys(weiterePersonen).length > 0) {
      Object.entries(weiterePersonen).forEach(([uuid, person]: [string, any]) => {
        const personFinancials = financialData.additional_applicants_financials[uuid];
        if (personFinancials) {
          const personName = `${person.firstName || 'Unbekannt'} ${person.lastName || ''}`;
          this.validatePersonNetVsGross(
            personFinancials, // Person's financial data containing both gross and net values
            personName,
            errors,
            warnings,
            parseCurrencyValue,
            formatCurrency
          );
        }
      });
    }
  }

  /**
   * Validates net vs gross values for a specific person
   */
  private validatePersonNetVsGross(
    financialData: any,
    personName: string,
    errors: string[],
    warnings: string[],
    parseCurrencyValue: (value: any) => number,
    formatCurrency: (value: number) => string
  ): void {
    // Define the field pairs to compare (gross vs net)
    const fieldPairs = [
      { gross: 'wheinachtsgeld_next12', net: 'wheinachtsgeld_next12_net', label: 'Weihnachtsgeld' },
      { gross: 'urlaubsgeld_next12', net: 'urlaubsgeld_next12_net', label: 'Urlaubsgeld' },
      { gross: 'incomeunterhalttaxable', net: 'incomeunterhalttaxable_net', label: 'Steuerpflichtiges Unterhaltseinkommen' },
      { gross: 'incomerent', net: 'incomerent_net', label: 'Mieteinkommen' },
      { gross: 'incomeagriculture', net: 'incomeagriculture_net', label: 'Landwirtschaftseinkommen' }
    ];

    // Check each field pair
    fieldPairs.forEach(({ gross, net, label }) => {
      const grossValue = parseCurrencyValue(financialData[gross]);
      const netValue = parseCurrencyValue(financialData[net]);

      if (grossValue > 0 && netValue > 0 && netValue > grossValue) {
        const errorMessage = `${personName}: ${label} Netto-Wert (Selbstauskunft) (${formatCurrency(netValue)}) ist höher als Brutto-Wert (Einkommenserklärung) (${formatCurrency(grossValue)})`;
        errors.push(errorMessage);
      }
    });

    // Special case for business income (combined from two fields)
    const grossBusiness = parseCurrencyValue(financialData.incomebusiness);
    const netBusiness = parseCurrencyValue(financialData.yearlyselfemployednetincome) + 
                       parseCurrencyValue(financialData.yearlybusinessnetincome);

    if (grossBusiness > 0 && netBusiness > 0 && netBusiness > grossBusiness) {
      const errorMessage = `${personName}: Die Netto Summe der Einkünfte aus Gewerbebetrieb/selbstständiger Arbeit (Selbstauskunft) (${formatCurrency(netBusiness)}) ist höher als der Brutto-Wert (Einkommenserklärung) (${formatCurrency(grossBusiness)})`;
      errors.push(errorMessage);
    }
  }

  /**
   * Validates salary income consistency and maintenance payment consistency
   * Checks: 1) Salary income flags consistency, 2) Monthly salary gap analysis, 3) Maintenance payment amounts
   */
  private validateSalaryAndMaintenanceConsistency(einkommenserklarungData: any, errors: string[], warnings: string[]): void {
    if (!einkommenserklarungData?.userData || !einkommenserklarungData?.financialData) {
      warnings.push('Einkommenserklärung-Daten nicht verfügbar für Gehalts- und Unterhalts-Überprüfung');
      return;
    }

    const userData = einkommenserklarungData.userData;
    const financialData = einkommenserklarungData.financialData;
    const weiterePersonen = userData.weitere_antragstellende_personen || {};

    // Helper function to parse currency values
    const parseCurrencyValue = (value: any): number => {
      if (value === null || value === undefined || value === '') return 0;
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const cleaned = value.replace(/[^\d.,-]/g, '').replace(',', '.');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };

    // Helper function to format currency
    const formatCurrency = (value: number): string => {
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value);
    };

    // Helper function to calculate average monthly gross salary from income_month1-12
    const calculateAverageMonthlyGrossSalary = (financials: any): number => {
      let total = 0;
      let count = 0;
      
      for (let i = 1; i <= 12; i++) {
        const monthValue = parseCurrencyValue(financials[`income_month${i}`]);
        if (monthValue > 0) {
          total += monthValue;
          count++;
        }
      }
      
      return count > 0 ? total / count : 0;
    };

    // Helper function to extract total amount from unterhaltszahlungen JSON
    const extractUnterhaltszahlungenTotal = (unterhaltszahlungen: any): number => {
      if (!unterhaltszahlungen || !Array.isArray(unterhaltszahlungen)) return 0;
      
      return unterhaltszahlungen.reduce((total: number, item: any) => {
        if (item && typeof item === 'object' && item.amount) {
          return total + parseCurrencyValue(item.amount);
        }
        return total;
      }, 0);
    };

    // Helper function to extract amountTotal from unterhaltszahlungenTotal JSON
    const extractUnterhaltszahlungenTotalAmount = (unterhaltszahlungenTotal: any): number => {
      if (!unterhaltszahlungenTotal) return 0;
      
      // Handle case where it's an array
      if (Array.isArray(unterhaltszahlungenTotal)) {
        if (unterhaltszahlungenTotal.length > 0 && unterhaltszahlungenTotal[0].amountTotal) {
          return parseCurrencyValue(unterhaltszahlungenTotal[0].amountTotal);
        }
        return 0;
      }
      
      // Handle case where it's a single object
      if (typeof unterhaltszahlungenTotal === 'object' && unterhaltszahlungenTotal.amountTotal) {
        return parseCurrencyValue(unterhaltszahlungenTotal.amountTotal);
      }
      
      return 0;
    };

    // Validate main applicant
    this.validatePersonSalaryAndMaintenance(
      financialData,
      'Hauptantragsteller',
      errors,
      warnings,
      parseCurrencyValue,
      formatCurrency,
      calculateAverageMonthlyGrossSalary,
      extractUnterhaltszahlungenTotal,
      extractUnterhaltszahlungenTotalAmount
    );

    // Validate additional applicants
    if (financialData?.additional_applicants_financials && Object.keys(weiterePersonen).length > 0) {
      Object.entries(weiterePersonen).forEach(([uuid, person]: [string, any]) => {
        const personFinancials = financialData.additional_applicants_financials[uuid];
        if (personFinancials) {
          const personName = `${person.firstName || 'Unbekannt'} ${person.lastName || ''}`;
          this.validatePersonSalaryAndMaintenance(
            personFinancials,
            personName,
            errors,
            warnings,
            parseCurrencyValue,
            formatCurrency,
            calculateAverageMonthlyGrossSalary,
            extractUnterhaltszahlungenTotal,
            extractUnterhaltszahlungenTotalAmount
          );
        }
      });
    }
  }

  /**
   * Validates salary and maintenance consistency for a specific person
   */
  private validatePersonSalaryAndMaintenance(
    financialData: any,
    personName: string,
    errors: string[],
    warnings: string[],
    parseCurrencyValue: (value: any) => number,
    formatCurrency: (value: number) => string,
    calculateAverageMonthlyGrossSalary: (financials: any) => number,
    extractUnterhaltszahlungenTotal: (unterhaltszahlungen: any) => number,
    extractUnterhaltszahlungenTotalAmount: (unterhaltszahlungenTotal: any) => number
  ): void {
    
    // Check 1: Salary income flags consistency
    const hasSalaryIncome = financialData.hasSalaryIncome === true;
    const hasEmploymentIncome = financialData.isEarningRegularIncome === true;
    
    if (hasSalaryIncome && hasEmploymentIncome === false) {
      const errorMessage = `${personName}: Widerspruch bei Gehaltseinkommen: In der Selbstauskunft wurde "Erzielen Sie Einkünfte aus nichtselbstständiger Arbeit?" mit "Ja" beantwortet, aber in der Einkommenserklärung wurde "Erzielen Sie Einkünfte aus nichtselbstständiger Arbeit/Versorgungsbezüge?" mit "Nein" beantwortet`;
      errors.push(errorMessage);
    }

    // Check 2: Monthly salary gap analysis (only if both flags are true)
    if (hasSalaryIncome && hasEmploymentIncome) {
      const monthlyNetSalary = parseCurrencyValue(financialData.monthlynetsalary);
      const averageMonthlyGrossSalary = calculateAverageMonthlyGrossSalary(financialData);
      
      if (monthlyNetSalary > 0 && averageMonthlyGrossSalary > 0) {
        // Check if net salary is smaller than gross salary (should be normal)
        if (monthlyNetSalary > averageMonthlyGrossSalary) {
          const warningMessage = `${personName}: Monatliches Nettogehalt (Selbstauskunft) (${formatCurrency(monthlyNetSalary)}) ist höher als das durchschnittliche monatliche Bruttogehalt (Einkommenserklärung) (${formatCurrency(averageMonthlyGrossSalary)}) - bitte überprüfen (Änderung der Einkünfte wurden nicht Berücksichtigt)`;
          warnings.push(warningMessage);
        }
        
        // Check if net salary is way bigger than gross salary (shouldn't happen)
        if (monthlyNetSalary < averageMonthlyGrossSalary * 0.5) {
          const warningMessage = `${personName}: Monatliches Nettogehalt (Selbstauskunft) (${formatCurrency(monthlyNetSalary)}) ist weniger als 50% des durchschnittlichen monatlichen Bruttogehalts (Einkommenserklärung) (${formatCurrency(averageMonthlyGrossSalary)}) - bitte überprüfen (Änderung der Einkünfte wurden nicht Berücksichtigt)`;
          warnings.push(warningMessage);
        }
      }
    }

    // Check 3: Maintenance payment consistency
    const ispayingunterhalt = financialData.ispayingunterhalt === true;
    console.log('ispayingunterhalt', ispayingunterhalt);
    if (ispayingunterhalt) {

      const einkommenserklarungUnterhaltszahlungen = financialData.unterhaltszahlungen;
      const selbstauskunftUnterhaltszahlungenTotal = financialData.unterhaltszahlungenTotal;
      
      const einkommenserklarungTotal = extractUnterhaltszahlungenTotal(einkommenserklarungUnterhaltszahlungen);
      const selbstauskunftTotal = extractUnterhaltszahlungenTotalAmount(selbstauskunftUnterhaltszahlungenTotal);

      if (einkommenserklarungTotal > 0 && selbstauskunftTotal > 0) {
        // Check if Selbstauskunft total is bigger than Einkommenserklärung sum
        if (selbstauskunftTotal > einkommenserklarungTotal) {
          const warningMessage = `${personName}: Unterhaltszahlungen in der Selbstauskunft (${formatCurrency(selbstauskunftTotal)}) sind höher als die Summe der Einzelzahlungen in der Einkommenserklärung (${formatCurrency(einkommenserklarungTotal)})`;
          warnings.push(warningMessage);
        }
        
        // Check if Selbstauskunft total is more than 30% less than Einkommenserklärung sum
        if (selbstauskunftTotal < einkommenserklarungTotal * 0.7) {
          const warningMessage = `${personName}: Unterhaltszahlungen in der Selbstauskunft (${formatCurrency(selbstauskunftTotal)}) sind mehr als 30% niedriger als die Summe der Einzelzahlungen in der Einkommenserklärung (${formatCurrency(einkommenserklarungTotal)})`;
          warnings.push(warningMessage);
        }
      }
    }
  }
}