import { supabase } from '../lib/supabase';

// Interfaces for the extraction service
export interface ValueToDocumentMapping {
  valueId: string;
  documentId?: string; // undefined if value cannot be extracted from documents
  searchTerms: string[];
  isRequired: boolean;
  calculationType: 'household_income' | 'available_monthly_income' | 'both';
  dataType: 'currency' | 'number' | 'date' | 'text' | 'boolean';
  calculationMethod?: 'monthly' | 'yearly' | 'daily';
  isArray?: boolean;
}

export interface PersonValueRequirement {
  personId: string;
  personName: string;
  personType: 'hauptantragsteller' | 'additional_applicant';
  personUuid?: string;
  requiredValues: ValueToDocumentMapping[];
}

export interface DocumentExtractionTask {
  documentId: string;
  documentTitle: string;
  personId: string;
  personName: string;
  personType: 'hauptantragsteller' | 'additional_applicant';
  personUuid?: string;
  applicantKey: string; // For document_status lookup
  valuesToExtract: {
    valueId: string;
    searchTerms: string[];
    calculationType: 'household_income' | 'available_monthly_income' | 'both';
    dataType: 'currency' | 'number' | 'date' | 'text' | 'boolean';
    isRequired: boolean;
  }[];
}

export interface ExtractionPlan {
  householdIncomeRequirements: PersonValueRequirement[];
  availableMonthlyIncomeRequirements: PersonValueRequirement[];
  consolidatedExtractionTasks: DocumentExtractionTask[];
  totalPersons: number;
  totalDocumentsToScan: number;
  totalValuesToExtract: number;
}

export class DocumentValueExtractionService {
  private residentId: string;
  private applicationId: string;

  constructor(residentId: string, applicationId: string) {
    this.residentId = residentId;
    this.applicationId = applicationId;
  }

  /**
   * Main method to create extraction plan
   */
  async createExtractionPlan(): Promise<ExtractionPlan> {
    try {
      // 1. Get all people (Hauptantragsteller & Household Members with Income)
      const people = await this.getAllPeopleWithIncome();
      
      // 2. Determine required values for household income calculation per person
      const householdIncomeRequirements = await this.determineHouseholdIncomeRequirements(people);
      
      // 3. Determine required values for available monthly income calculation per person
      const availableMonthlyIncomeRequirements = await this.determineAvailableMonthlyIncomeRequirements(people);
      
      // 4. Consolidate and create extraction tasks per document
      const consolidatedExtractionTasks = this.consolidateExtractionTasks(
        householdIncomeRequirements,
        availableMonthlyIncomeRequirements
      );
      
      return {
        householdIncomeRequirements,
        availableMonthlyIncomeRequirements,
        consolidatedExtractionTasks,
        totalPersons: people.length,
        totalDocumentsToScan: consolidatedExtractionTasks.length,
        totalValuesToExtract: consolidatedExtractionTasks.reduce(
          (total, task) => total + task.valuesToExtract.length, 
          0
        )
      };
    } catch (error) {
      console.error('Error creating extraction plan:', error);
      throw error;
    }
  }

  /**
   * Get all people with income (main applicant + household members)
   */
  private async getAllPeopleWithIncome() {
    const { data: userData, error: userError } = await supabase
      .from('user_data')
      .select('id, firstname, lastname, noIncome, weitere_antragstellende_personen')
      .eq('id', this.residentId)
      .single();

    if (userError) throw userError;

    const { data: financialData, error: financialError } = await supabase
      .from('user_financials')
      .select('*')
      .eq('user_id', this.residentId)
      .single();

    if (financialError) throw financialError;

    const people: Array<{
      id: string;
      name: string;
      type: 'hauptantragsteller' | 'additional_applicant';
      uuid?: string;
      hasIncome: boolean;
      financialData: any;
      personData: any;
    }> = [];

    // Add main applicant if they have income
    if (!userData.noIncome) {
      people.push({
        id: 'main_applicant',
        name: `${userData.firstname || 'Hauptantragsteller'} ${userData.lastname || ''}`.trim(),
        type: 'hauptantragsteller',
        hasIncome: true,
        financialData: financialData,
        personData: userData
      });
    }

    // Add additional applicants/household members with income
    const weiterePersonen = userData.weitere_antragstellende_personen || {};
    const additionalFinancials = financialData.additional_applicants_financials || {};

    // Handle both array and object formats
    let personEntries: Array<[string, any]>;
    if (Array.isArray(weiterePersonen)) {
      personEntries = weiterePersonen.map((person: any, index: number) => [
        person.id || `legacy_${index}`, 
        person
      ]);
    } else {
      personEntries = Object.entries(weiterePersonen);
    }

    personEntries.forEach(([uuid, person]) => {
      // Skip if not part of household or has no income
      if (person.notHousehold || person.noIncome) return;

      const personFinancialData = additionalFinancials[uuid];
      if (personFinancialData) {
        people.push({
          id: uuid,
          name: `${person.firstName || 'Person'} ${person.lastName || ''}`.trim(),
          type: 'additional_applicant',
          uuid: uuid,
          hasIncome: true,
          financialData: personFinancialData,
          personData: person
        });
      }
    });

    return people;
  }

  /**
   * Get value-to-document mapping based on the provided table
   */
  private getValueToDocumentMapping(): ValueToDocumentMapping[] {
    return [
      // Household Income Calculation Values
      {
        valueId: 'prior_year_earning',
        documentId: 'lohn_gehaltsbescheinigungen',
        searchTerms: ['gross_salary', 'year', 'month', 'isMonthly'],
        isRequired: false,
        calculationType: 'household_income',
        dataType: 'currency'
      },
      {
        valueId: 'prior_year',
        documentId: 'lohn_gehaltsbescheinigungen',
        searchTerms: ['year'],
        isRequired: false,
        calculationType: 'household_income',
        dataType: 'number'
      },
      {
        valueId: 'wheinachtsgeld_last12',
        documentId: 'lohn_gehaltsbescheinigungen',
        searchTerms: ['wheinachtsgeld_gross'],
        isRequired: false,
        calculationType: 'household_income',
        dataType: 'currency'
      },
      {
        valueId: 'urlaubsgeld_last12',
        documentId: 'lohn_gehaltsbescheinigungen',
        searchTerms: ['urlaubsgeld_gross', 'year', 'month'],
        isRequired: false,
        calculationType: 'household_income',
        dataType: 'currency'
      },
      {
        valueId: 'otherincome_last12',
        documentId: 'lohn_gehaltsbescheinigungen',
        searchTerms: ['other_income', 'year', 'month', 'isRecurring', 'isMonthly'],
        isRequired: false,
        calculationType: 'household_income',
        dataType: 'currency'
      },
      {
        valueId: 'incomebusiness',
        documentId: 'guv_euer_nachweis',
        searchTerms: ['annual_gross_income', 'year', 'month', 'isMonthly'],
        isRequired: false,
        calculationType: 'household_income',
        dataType: 'currency'
      },
      {
        valueId: 'incomeagriculture',
        documentId: 'guv_euer_nachweis',
        searchTerms: ['annual_gross_income', 'year', 'month', 'isMonthly'],
        isRequired: false,
        calculationType: 'household_income',
        dataType: 'currency'
      },
      {
        valueId: 'incomerent',
        documentId: 'einkommenssteuerbescheid',
        searchTerms: ['annual_gross_income', 'year', 'month', 'isMonthly'],
        isRequired: false,
        calculationType: 'household_income',
        dataType: 'currency'
      },
      {
        valueId: 'incomerent',
        documentId: 'einkommenssteuererklaerung',
        searchTerms: ['annual_gross_income', 'year', 'month', 'isMonthly'],
        isRequired: false,
        calculationType: 'household_income',
        dataType: 'currency'
      },
      {
        valueId: 'incomepension',
        documentId: 'rentenbescheid',
        searchTerms: ['gross_payment', 'year', 'isMonthly', 'rentenart'],
        isRequired: false,
        calculationType: 'household_income',
        dataType: 'currency'
      },
      {
        valueId: 'incomeablg',
        documentId: 'arbeitslosengeldbescheid',
        searchTerms: ['gross_payment', 'year', 'isMonthly', 'timeframe'],
        isRequired: false,
        calculationType: 'household_income',
        dataType: 'currency'
      },
      {
        valueId: 'incomeforeign',
        documentId: 'nachweis_ausland',
        searchTerms: ['annual_gross_income', 'year', 'isMonthly'],
        isRequired: false,
        calculationType: 'household_income',
        dataType: 'currency'
      },
      {
        valueId: 'incomeunterhalttaxfree',
        documentId: 'unterhaltsleistungen_nachweis',
        searchTerms: ['payment', 'year', 'isMonthly', 'laufzeit'],
        isRequired: false,
        calculationType: 'household_income',
        dataType: 'currency'
      },
      {
        valueId: 'incomeunterhalttaxable',
        documentId: 'unterhaltsleistungen_nachweis',
        searchTerms: ['gross_payment', 'year', 'isMonthly', 'laufzeit'],
        isRequired: false,
        calculationType: 'household_income',
        dataType: 'currency'
      },
      {
        valueId: 'incomeothers',
        documentId: undefined, // Not possible to extract
        searchTerms: [],
        isRequired: false,
        calculationType: 'household_income',
        dataType: 'currency'
      },
      {
        valueId: 'incomepauschal',
        documentId: 'lohn_gehaltsbescheinigungen',
        searchTerms: ['gross_salary', 'year', 'month', 'isMonthly'],
        isRequired: false,
        calculationType: 'household_income',
        dataType: 'currency'
      },
      {
        valueId: 'werbungskosten',
        documentId: 'werbungskosten_nachweis',
        searchTerms: ['yearly_amount', 'year', 'month', 'isMonthly'],
        isRequired: false,
        calculationType: 'household_income',
        dataType: 'currency'
      },
      {
        valueId: 'kinderbetreuungskosten',
        documentId: 'kinderbetreuungskosten_nachweis',
        searchTerms: ['amount', 'year', 'month', 'isMonthly', 'isRecurring'],
        isRequired: false,
        calculationType: 'household_income',
        dataType: 'currency'
      },
      {
        valueId: 'unterhaltszahlungen',
        documentId: 'unterhaltsverpflichtung_nachweis',
        searchTerms: ['amount', 'year', 'isMonthly', 'laufzeit'],
        isRequired: false,
        calculationType: 'household_income',
        dataType: 'currency'
      },

      // Available Monthly Income Calculation Values
      {
        valueId: 'monthlynetsalary',
        documentId: 'lohn_gehaltsbescheinigungen',
        searchTerms: ['net_salary', 'netto_lohn', 'netto_gehalt', 'monatlich'],
        isRequired: false,
        calculationType: 'available_monthly_income',
        dataType: 'currency'
      },
      {
        valueId: 'wheinachtsgeld_next12_net',
        documentId: 'lohn_gehaltsbescheinigungen',
        searchTerms: ['weihnachtsgeld_netto', 'christmas_bonus_net', 'jahresbetrag'],
        isRequired: false,
        calculationType: 'available_monthly_income',
        dataType: 'currency'
      },
      {
        valueId: 'urlaubsgeld_next12_net',
        documentId: 'lohn_gehaltsbescheinigungen',
        searchTerms: ['urlaubsgeld_netto', 'vacation_pay_net', 'jahresbetrag'],
        isRequired: false,
        calculationType: 'available_monthly_income',
        dataType: 'currency'
      },
      {
        valueId: 'otheremploymentmonthlynetincome',
        documentId: 'lohn_gehaltsbescheinigungen',
        searchTerms: ['other_income_net', 'sonstige_einkuenfte_netto', 'additional_income_net'],
        isRequired: false,
        calculationType: 'available_monthly_income',
        dataType: 'currency',
        isArray: true
      },
      {
        valueId: 'incomeagriculture_net',
        documentId: 'guv_euer_nachweis',
        searchTerms: ['agriculture_net_income', 'landwirtschaft_netto', 'jahresbetrag'],
        isRequired: false,
        calculationType: 'available_monthly_income',
        dataType: 'currency'
      },
      {
        valueId: 'incomerent_net',
        documentId: 'einkommenssteuerbescheid',
        searchTerms: ['rental_income_net', 'mieteinnahmen_netto', 'jahresbetrag'],
        isRequired: false,
        calculationType: 'available_monthly_income',
        dataType: 'currency'
      },
      {
        valueId: 'yearlycapitalnetincome',
        documentId: 'nachweis_kapitalertraege',
        searchTerms: ['capital_income_net', 'kapitalertraege_netto', 'year', 'isMonthly', 'einmalzahlung'],
        isRequired: false,
        calculationType: 'available_monthly_income',
        dataType: 'currency'
      },
      {
        valueId: 'yearlybusinessnetincome',
        documentId: 'guv_euer_nachweis',
        searchTerms: ['business_net_income', 'gewerbe_netto', 'jahresbetrag'],
        isRequired: false,
        calculationType: 'available_monthly_income',
        dataType: 'currency'
      },
      {
        valueId: 'yearlyselfemployednetincome',
        documentId: 'guv_euer_nachweis',
        searchTerms: ['self_employed_net_income', 'selbststaendig_netto', 'jahresbetrag'],
        isRequired: false,
        calculationType: 'available_monthly_income',
        dataType: 'currency'
      },
      {
        valueId: 'pensionmonthlynetincome',
        documentId: 'rentenbescheid',
        searchTerms: ['pension_net_amount', 'rente_netto', 'monatlich', 'rentenart'],
        isRequired: false,
        calculationType: 'available_monthly_income',
        dataType: 'currency',
        isArray: true
      },
      {
        valueId: 'incomeunterhalttaxfree',
        documentId: 'unterhaltsleistungen_nachweis',
        searchTerms: ['maintenance_net_amount', 'unterhalt_netto', 'monatlich'],
        isRequired: false,
        calculationType: 'available_monthly_income',
        dataType: 'currency'
      },
      {
        valueId: 'incomeunterhalttaxable_net',
        documentId: 'unterhaltsleistungen_nachweis',
        searchTerms: ['maintenance_net_amount', 'unterhalt_netto', 'monatlich'],
        isRequired: false,
        calculationType: 'available_monthly_income',
        dataType: 'currency'
      },
      {
        valueId: 'monthlykindergeldnetincome',
        documentId: 'kindergeld_nachweis',
        searchTerms: ['kindergeld_amount', 'child_benefit', 'monatlich'],
        isRequired: false,
        calculationType: 'available_monthly_income',
        dataType: 'currency'
      },
      {
        valueId: 'monthlypflegegeldnetincome',
        documentId: 'pflegegeld_nachweis',
        searchTerms: ['pflegegeld_amount', 'care_benefit', 'monatlich'],
        isRequired: false,
        calculationType: 'available_monthly_income',
        dataType: 'currency'
      },
      {
        valueId: 'monthlyelterngeldnetincome',
        documentId: 'elterngeld_nachweis',
        searchTerms: ['elterngeld_amount', 'parental_benefit', 'monatlich'],
        isRequired: false,
        calculationType: 'available_monthly_income',
        dataType: 'currency'
      },
      {
        valueId: 'othermonthlynetincome',
        documentId: 'sonstige_einkommen_nachweis',
        searchTerms: ['other_income_net', 'sonstige_einkommen_netto', 'monatlich'],
        isRequired: false,
        calculationType: 'available_monthly_income',
        dataType: 'currency',
        isArray: true
      },
      {
        valueId: 'betragotherinsurancetaxexpenses',
        documentId: 'versicherung_steuer_nachweis',
        searchTerms: ['insurance_amount', 'tax_amount', 'versicherung', 'steuer', 'monatlich'],
        isRequired: false,
        calculationType: 'available_monthly_income',
        dataType: 'currency',
        isArray: true
      },
      {
        valueId: 'loans',
        documentId: 'darlehen_nachweis',
        searchTerms: ['loan_amount', 'darlehen_betrag', 'monatlich', 'laufzeit'],
        isRequired: false,
        calculationType: 'available_monthly_income',
        dataType: 'currency',
        isArray: true
      },
      {
        valueId: 'zwischenkredit',
        documentId: 'zwischenkredit_nachweis',
        searchTerms: ['credit_amount', 'kredit_betrag', 'monatlich', 'laufzeit'],
        isRequired: false,
        calculationType: 'available_monthly_income',
        dataType: 'currency',
        isArray: true
      },
      {
        valueId: 'unterhaltszahlungenTotal',
        documentId: 'unterhaltsverpflichtung_nachweis',
        searchTerms: ['payment_amount_total', 'unterhalt_gesamt', 'monatlich', 'laufzeit'],
        isRequired: false,
        calculationType: 'available_monthly_income',
        dataType: 'currency',
        isArray: true
      },
      {
        valueId: 'otherzahlungsverpflichtung',
        documentId: 'zahlungsverpflichtungen_nachweis',
        searchTerms: ['obligation_amount', 'verpflichtung_betrag', 'monatlich', 'laufzeit'],
        isRequired: false,
        calculationType: 'available_monthly_income',
        dataType: 'currency',
        isArray: true
      },
      {
        valueId: 'sparratebausparvertraege',
        documentId: 'bausparvertrag_nachweis',
        searchTerms: ['savings_rate', 'sparrate', 'monatlich'],
        isRequired: false,
        calculationType: 'available_monthly_income',
        dataType: 'currency'
      },
      {
        valueId: 'praemiekapitalrentenversicherung',
        documentId: 'rentenversicherung_nachweis',
        searchTerms: ['premium_amount', 'praemie', 'monatlich'],
        isRequired: false,
        calculationType: 'available_monthly_income',
        dataType: 'currency'
      }
    ];
  }

  /**
   * Determine required values for household income calculation per person
   */
  private async determineHouseholdIncomeRequirements(people: any[]): Promise<PersonValueRequirement[]> {
    const requirements: PersonValueRequirement[] = [];
    const valueMapping = this.getValueToDocumentMapping();
    const householdIncomeValues = valueMapping.filter(v => 
      v.calculationType === 'household_income' || v.calculationType === 'both'
    );

    for (const person of people) {
      const personRequirements: ValueToDocumentMapping[] = [];
      const financialData = person.financialData;

      // Follow ValidationService logic for household income calculation
      
      // Employment income - check if person has regular income
      if (financialData.isEarningRegularIncome) {
        // Prior year earning + prior year
        if (this.hasValue(financialData.prior_year_earning)) {
          personRequirements.push(...householdIncomeValues.filter(v => 
            ['prior_year_earning', 'prior_year'].includes(v.valueId)
          ));
        }
        
        // Sonderzuwendungen (bonuses)
        if (this.hasValue(financialData.wheinachtsgeld_last12)) {
          personRequirements.push(...householdIncomeValues.filter(v => 
            v.valueId === 'wheinachtsgeld_last12'
          ));
        }
        
        if (this.hasValue(financialData.urlaubsgeld_last12)) {
          personRequirements.push(...householdIncomeValues.filter(v => 
            v.valueId === 'urlaubsgeld_last12'
          ));
        }
        
        if (this.hasValue(financialData.otherincome_last12)) {
          personRequirements.push(...householdIncomeValues.filter(v => 
            v.valueId === 'otherincome_last12'
          ));
        }
      }

      // Business income
      if (this.hasValue(financialData.incomebusiness)) {
        personRequirements.push(...householdIncomeValues.filter(v => 
          v.valueId === 'incomebusiness'
        ));
      }

      // Agriculture income
      if (this.hasValue(financialData.incomeagriculture)) {
        personRequirements.push(...householdIncomeValues.filter(v => 
          v.valueId === 'incomeagriculture'
        ));
      }

      // Rental income
      if (this.hasValue(financialData.incomerent)) {
        personRequirements.push(...householdIncomeValues.filter(v => 
          v.valueId === 'incomerent'
        ));
      }

      // Pension income
      if (this.hasValue(financialData.incomepension)) {
        personRequirements.push(...householdIncomeValues.filter(v => 
          v.valueId === 'incomepension'
        ));
      }

      // Unemployment benefits
      if (this.hasValue(financialData.incomeablg)) {
        personRequirements.push(...householdIncomeValues.filter(v => 
          v.valueId === 'incomeablg'
        ));
      }

      // Foreign income
      if (this.hasValue(financialData.incomeforeign)) {
        personRequirements.push(...householdIncomeValues.filter(v => 
          v.valueId === 'incomeforeign'
        ));
      }

      // Maintenance income (tax-free)
      if (this.hasValue(financialData.incomeunterhalttaxfree)) {
        personRequirements.push(...householdIncomeValues.filter(v => 
          v.valueId === 'incomeunterhalttaxfree'
        ));
      }

      // Maintenance income (taxable)
      if (this.hasValue(financialData.incomeunterhalttaxable)) {
        personRequirements.push(...householdIncomeValues.filter(v => 
          v.valueId === 'incomeunterhalttaxable'
        ));
      }

      // Pauschal income
      if (this.hasValue(financialData.incomepauschal)) {
        personRequirements.push(...householdIncomeValues.filter(v => 
          v.valueId === 'incomepauschal'
        ));
      }

      // Deductible expenses
      if (financialData.isEarningRegularIncome && this.hasValue(financialData.werbungskosten)) {
        personRequirements.push(...householdIncomeValues.filter(v => 
          v.valueId === 'werbungskosten'
        ));
      }

      if (this.hasValue(financialData.kinderbetreuungskosten)) {
        personRequirements.push(...householdIncomeValues.filter(v => 
          v.valueId === 'kinderbetreuungskosten'
        ));
      }

      if (financialData.ispayingunterhalt && this.hasValue(financialData.unterhaltszahlungen)) {
        personRequirements.push(...householdIncomeValues.filter(v => 
          v.valueId === 'unterhaltszahlungen'
        ));
      }

      if (personRequirements.length > 0) {
        requirements.push({
          personId: person.id,
          personName: person.name,
          personType: person.type,
          personUuid: person.uuid,
          requiredValues: personRequirements
        });
      }
    }

    return requirements;
  }

  /**
   * Determine required values for available monthly income calculation per person
   */
  private async determineAvailableMonthlyIncomeRequirements(people: any[]): Promise<PersonValueRequirement[]> {
    const requirements: PersonValueRequirement[] = [];
    const valueMapping = this.getValueToDocumentMapping();
    const availableIncomeValues = valueMapping.filter(v => 
      v.calculationType === 'available_monthly_income' || v.calculationType === 'both'
    );

    for (const person of people) {
      const personRequirements: ValueToDocumentMapping[] = [];
      const financialData = person.financialData;

      // Follow ValidationService logic for available monthly income calculation

      // Salary-related income (if hasSalaryIncome is true)
      if (financialData.hasSalaryIncome) {
        if (this.hasValue(financialData.monthlynetsalary)) {
          personRequirements.push(...availableIncomeValues.filter(v => 
            v.valueId === 'monthlynetsalary'
          ));
        }

        if (this.hasValue(financialData.wheinachtsgeld_next12_net)) {
          personRequirements.push(...availableIncomeValues.filter(v => 
            v.valueId === 'wheinachtsgeld_next12_net'
          ));
        }

        if (this.hasValue(financialData.urlaubsgeld_next12_net)) {
          personRequirements.push(...availableIncomeValues.filter(v => 
            v.valueId === 'urlaubsgeld_next12_net'
          ));
        }

        if (this.hasArrayValue(financialData.otheremploymentmonthlynetincome)) {
          personRequirements.push(...availableIncomeValues.filter(v => 
            v.valueId === 'otheremploymentmonthlynetincome'
          ));
        }
      }

      // Agriculture income
      if (financialData.hasagricultureincome && this.hasValue(financialData.incomeagriculture_net)) {
        personRequirements.push(...availableIncomeValues.filter(v => 
          v.valueId === 'incomeagriculture_net'
        ));
      }

      // Rent income
      if (financialData.hasrentincome && this.hasValue(financialData.incomerent_net)) {
        personRequirements.push(...availableIncomeValues.filter(v => 
          v.valueId === 'incomerent_net'
        ));
      }

      // Capital income
      if (financialData.hascapitalincome && this.hasValue(financialData.yearlycapitalnetincome)) {
        personRequirements.push(...availableIncomeValues.filter(v => 
          v.valueId === 'yearlycapitalnetincome'
        ));
      }

      // Business income
      if (financialData.hasbusinessincome) {
        if (this.hasValue(financialData.yearlybusinessnetincome)) {
          personRequirements.push(...availableIncomeValues.filter(v => 
            v.valueId === 'yearlybusinessnetincome'
          ));
        }
        
        if (this.hasValue(financialData.yearlyselfemployednetincome)) {
          personRequirements.push(...availableIncomeValues.filter(v => 
            v.valueId === 'yearlyselfemployednetincome'
          ));
        }
      }

      // Pension income
      if (financialData.haspensionincome && this.hasArrayValue(financialData.pensionmonthlynetincome)) {
        personRequirements.push(...availableIncomeValues.filter(v => 
          v.valueId === 'pensionmonthlynetincome'
        ));
      }

      // Maintenance income
      if (financialData.hastaxfreeunterhaltincome && this.hasValue(financialData.incomeunterhalttaxfree)) {
        personRequirements.push(...availableIncomeValues.filter(v => 
          v.valueId === 'incomeunterhalttaxfree'
        ));
      }

      if (financialData.hastaxableunterhaltincome && this.hasValue(financialData.incomeunterhalttaxable_net)) {
        personRequirements.push(...availableIncomeValues.filter(v => 
          v.valueId === 'incomeunterhalttaxable_net'
        ));
      }


      // Care benefit
      if (financialData.haspflegegeldincome && this.hasValue(financialData.monthlypflegegeldnetincome)) {
        personRequirements.push(...availableIncomeValues.filter(v => 
          v.valueId === 'monthlypflegegeldnetincome'
        ));
      }

      // Parental benefit
      if (financialData.haselterngeldincome && this.hasValue(financialData.monthlyelterngeldnetincome)) {
        personRequirements.push(...availableIncomeValues.filter(v => 
          v.valueId === 'monthlyelterngeldnetincome'
        ));
      }

      // Expenses
      if (this.hasArrayValue(financialData.betragotherinsurancetaxexpenses)) {
        personRequirements.push(...availableIncomeValues.filter(v => 
          v.valueId === 'betragotherinsurancetaxexpenses'
        ));
      }

      if (financialData.ispayingunterhalt && this.hasArrayValue(financialData.unterhaltszahlungenTotal)) {
        personRequirements.push(...availableIncomeValues.filter(v => 
          v.valueId === 'unterhaltszahlungenTotal'
        ));
      }

      //No Documetns
      /*
      // Other income
      if (financialData.hasothernetincome && this.hasArrayValue(financialData.othermonthlynetincome)) {
        personRequirements.push(...availableIncomeValues.filter(v => 
          v.valueId === 'othermonthlynetincome'
        ));
      }

      if (financialData.ispayingloans && this.hasArrayValue(financialData.loans)) {
        personRequirements.push(...availableIncomeValues.filter(v => 
          v.valueId === 'loans'
        ));
      }

      if (financialData.ispayingzwischenkredit && this.hasArrayValue(financialData.zwischenkredit)) {
        personRequirements.push(...availableIncomeValues.filter(v => 
          v.valueId === 'zwischenkredit'
        ));
      }

      if (financialData.hasotherzahlungsverpflichtung && this.hasArrayValue(financialData.otherzahlungsverpflichtung)) {
        personRequirements.push(...availableIncomeValues.filter(v => 
          v.valueId === 'otherzahlungsverpflichtung'
        ));
      }

      if (financialData.hasBausparvertraege && this.hasValue(financialData.sparratebausparvertraege)) {
        personRequirements.push(...availableIncomeValues.filter(v => 
          v.valueId === 'sparratebausparvertraege'
        ));
      }

      if (financialData.hasRentenversicherung && this.hasValue(financialData.praemiekapitalrentenversicherung)) {
        personRequirements.push(...availableIncomeValues.filter(v => 
          v.valueId === 'praemiekapitalrentenversicherung'
        ));
      }*/

    //Not required
   
     /*
      // Child benefit
      if (financialData.haskindergeldincome && this.hasValue(financialData.monthlykindergeldnetincome)) {
        personRequirements.push(...availableIncomeValues.filter(v => 
          v.valueId === 'monthlykindergeldnetincome'
        ));
      }
      */

      if (personRequirements.length > 0) {
        requirements.push({
          personId: person.id,
          personName: person.name,
          personType: person.type,
          personUuid: person.uuid,
          requiredValues: personRequirements
        });
      }
    }

    return requirements;
  }

  /**
   * Consolidate extraction tasks per document to avoid scanning same document multiple times
   */
  private consolidateExtractionTasks(
    householdIncomeRequirements: PersonValueRequirement[],
    availableMonthlyIncomeRequirements: PersonValueRequirement[]
  ): DocumentExtractionTask[] {
    const taskMap = new Map<string, DocumentExtractionTask>();

    // Helper function to process requirements
    const processRequirements = (requirements: PersonValueRequirement[], calculationType: 'household_income' | 'available_monthly_income') => {
      for (const personReq of requirements) {
        for (const valueReq of personReq.requiredValues) {
          if (!valueReq.documentId) continue; // Skip values that can't be extracted

          const applicantKey = personReq.personType === 'hauptantragsteller' 
            ? 'hauptantragsteller' 
            : `applicant_${personReq.personUuid}`;
          
          const taskKey = `${valueReq.documentId}_${personReq.personId}`;

          if (!taskMap.has(taskKey)) {
            taskMap.set(taskKey, {
              documentId: valueReq.documentId,
              documentTitle: this.getDocumentTitle(valueReq.documentId),
              personId: personReq.personId,
              personName: personReq.personName,
              personType: personReq.personType,
              personUuid: personReq.personUuid,
              applicantKey: applicantKey,
              valuesToExtract: []
            });
          }

          const task = taskMap.get(taskKey)!;
          
          // Check if this value is already in the task
          const existingValue = task.valuesToExtract.find(v => v.valueId === valueReq.valueId);
          if (existingValue) {
            // Merge search terms and calculation types
            existingValue.searchTerms = Array.from(new Set([...existingValue.searchTerms, ...valueReq.searchTerms]));
            if (existingValue.calculationType !== 'both') {
              existingValue.calculationType = existingValue.calculationType === calculationType ? calculationType : 'both';
            }
          } else {
            // Add new value to extract
            task.valuesToExtract.push({
              valueId: valueReq.valueId,
              searchTerms: [...valueReq.searchTerms],
              calculationType: calculationType,
              dataType: valueReq.dataType,
              isRequired: valueReq.isRequired
            });
          }
        }
      }
    };

    // Process both calculation types
    processRequirements(householdIncomeRequirements, 'household_income');
    processRequirements(availableMonthlyIncomeRequirements, 'available_monthly_income');

    return Array.from(taskMap.values());
  }

  /**
   * Helper function to check if a value exists and is not empty
   */
  private hasValue(value: any): boolean {
    return value !== null && value !== undefined && value !== '' && value !== 0;
  }

  /**
   * Helper function to check if an array value exists and has items
   */
  private hasArrayValue(value: any): boolean {
    return Array.isArray(value) && value.length > 0 && value.some(item => 
      item && (item.amount || item.amountTotal) && this.hasValue(item.amount || item.amountTotal)
    );
  }

  /**
   * Get document title by document ID
   */
  private getDocumentTitle(documentId: string): string {
    const titles: Record<string, string> = {
      'lohn_gehaltsbescheinigungen': 'Lohn-/Gehaltsbescheinigungen',
      'guv_euer_nachweis': 'GuV/EÜR Nachweis',
      'einkommenssteuerbescheid': 'Einkommenssteuerbescheid',
      'einkommenssteuererklaerung': 'Einkommenssteuererklärung',
      'rentenbescheid': 'Rentenbescheid',
      'arbeitslosengeldbescheid': 'Arbeitslosengeldbescheid',
      'nachweis_ausland': 'Nachweis Ausländische Einkünfte',
      'unterhaltsleistungen_nachweis': 'Nachweis Unterhaltsleistungen',
      'werbungskosten_nachweis': 'Nachweis Werbungskosten',
      'kinderbetreuungskosten_nachweis': 'Nachweis Kinderbetreuungskosten',
      'unterhaltsverpflichtung_nachweis': 'Nachweis Unterhaltsverpflichtung',
      'nachweis_kapitalertraege': 'Nachweis Kapitalerträge',
      'kindergeld_nachweis': 'Kindergeld Nachweis',
      'pflegegeld_nachweis': 'Pflegegeld Nachweis',
      'elterngeld_nachweis': 'Elterngeld Nachweis',
      'sonstige_einkommen_nachweis': 'Nachweis sonstige Einkommen',
      'versicherung_steuer_nachweis': 'Nachweis Versicherungen und Steuern',
      'darlehen_nachweis': 'Nachweis Darlehen',
      'zwischenkredit_nachweis': 'Nachweis Zwischenkredit',
      'zahlungsverpflichtungen_nachweis': 'Nachweis Zahlungsverpflichtungen',
      'bausparvertrag_nachweis': 'Nachweis Bausparvertrag',
      'rentenversicherung_nachweis': 'Nachweis Rentenversicherung'
    };
    
    return titles[documentId] || documentId;
  }

  /**
   * Get document status for the application
   */
  async getDocumentStatus(): Promise<any> {
    const { data } = await supabase
      .from('user_data')
      .select('document_status')
      .eq('id', this.residentId)
      .single();

    return data?.document_status || {};
  }

  /**
   * Check if a document is uploaded for a specific person
   */
  async isDocumentUploadedForPerson(documentId: string, applicantKey: string): Promise<boolean> {
    const documentStatus = await this.getDocumentStatus();
    const applicantDocs = documentStatus[applicantKey];
    if (!applicantDocs) return false;
    
    const documentFiles = applicantDocs[documentId];
    return documentFiles && Array.isArray(documentFiles) && documentFiles.some((file: any) => file.uploaded);
  }

  /**
   * Get uploaded document paths for a specific person and document type
   */
  async getUploadedDocumentPaths(documentId: string, applicantKey: string): Promise<string[]> {
    const documentStatus = await this.getDocumentStatus();
    const applicantDocs = documentStatus[applicantKey];
    if (!applicantDocs) return [];
    
    const documentFiles = applicantDocs[documentId] || [];
    return documentFiles
      .filter((file: any) => file.uploaded)
      .map((file: any) => file.filePath);
  }

  /**
   * Generate extraction summary for OCR/AI processing
   */
  async generateExtractionSummary(): Promise<{
    householdIncome: Record<string, Record<string, { docid?: string; searchTerms: string[] }>>;
    availableMonthlyIncome: Record<string, Record<string, { docid?: string; searchTerms: string[] }>>;
    valuesPerPerson: Record<string, Record<string, { docid?: string; searchTerms: string[] }>>;
  }> {
    const extractionPlan = await this.createExtractionPlan();
    
    // Create household income JSON structure
    const householdIncome: Record<string, Record<string, { docid?: string; searchTerms: string[] }>> = {};
    
    for (const personReq of extractionPlan.householdIncomeRequirements) {
      householdIncome[personReq.personName] = {};
      
      for (const valueReq of personReq.requiredValues) {
        householdIncome[personReq.personName][valueReq.valueId] = {
          docid: valueReq.documentId,
          searchTerms: valueReq.searchTerms
        };
      }
    }

    // Create available monthly income JSON structure
    const availableMonthlyIncome: Record<string, Record<string, { docid?: string; searchTerms: string[] }>> = {};
    
    for (const personReq of extractionPlan.availableMonthlyIncomeRequirements) {
      availableMonthlyIncome[personReq.personName] = {};
      
      for (const valueReq of personReq.requiredValues) {
        availableMonthlyIncome[personReq.personName][valueReq.valueId] = {
          docid: valueReq.documentId,
          searchTerms: valueReq.searchTerms
        };
      }
    }

    // Create consolidated values per person JSON structure
    const valuesPerPerson: Record<string, Record<string, { docid?: string; searchTerms: string[] }>> = {};
    
    for (const task of extractionPlan.consolidatedExtractionTasks) {
      // Initialize person object if it doesn't exist
      if (!valuesPerPerson[task.personName]) {
        valuesPerPerson[task.personName] = {};
      }
      
      for (const value of task.valuesToExtract) {
        if (!valuesPerPerson[task.personName][value.valueId]) {
          valuesPerPerson[task.personName][value.valueId] = {
            docid: task.documentId,
            searchTerms: value.searchTerms
          };
        } else {
          // Merge search terms if value already exists
          const existing = valuesPerPerson[task.personName][value.valueId];
          existing.searchTerms = Array.from(new Set([...existing.searchTerms, ...value.searchTerms]));
        }
      }
    }

    return {
      householdIncome,
      availableMonthlyIncome,
      valuesPerPerson
    };
  }

  /**
   * Generate document-centric extraction structure for OCR/AI processing
   * This structure is optimized for document scanning and data extraction
   */
  async generateDocumentExtractionStructure(): Promise<Record<string, any>> {
    const extractionPlan = await this.createExtractionPlan();
    const documentStatus = await this.getDocumentStatus();
    
    const result: Record<string, any> = {};
    
    // Process each person
    for (const personReq of [...extractionPlan.householdIncomeRequirements, ...extractionPlan.availableMonthlyIncomeRequirements]) {
      const personKey = personReq.personType === 'hauptantragsteller' ? 'main_applicant' : personReq.personId;
      
      if (!result[personKey]) {
        result[personKey] = {};
      }
      
      // Group values by document type
      const documentGroups: Record<string, string[]> = {};
      
      for (const valueReq of personReq.requiredValues) {
        if (!valueReq.documentId) continue;
        
        if (!documentGroups[valueReq.documentId]) {
          documentGroups[valueReq.documentId] = [];
        }
        documentGroups[valueReq.documentId].push(valueReq.valueId);
      }
      
      // Process each document type for this person
      for (const [documentType, valueIds] of Object.entries(documentGroups)) {
        const applicantKey = personReq.personType === 'hauptantragsteller' ? 'hauptantragsteller' : `applicant_${personReq.personUuid}`;
        const uploadedFiles = documentStatus[applicantKey]?.[documentType] || [];
        
        // Always include the document type, even if no files are uploaded
        if (!result[personKey][documentType]) {
          result[personKey][documentType] = {
            extractionComplete: false,
            relevantValues: Array.from(new Set(valueIds)), // Remove duplicates
            numberOfFiles: uploadedFiles.length
          };
        } else {
          // Merge relevantValues if document type already exists
          const existingValues = result[personKey][documentType].relevantValues || [];
          const mergedValues = Array.from(new Set([...existingValues, ...valueIds]));
          result[personKey][documentType].relevantValues = mergedValues;
        }
        
        // Only process uploaded files if they exist
        if (uploadedFiles.length > 0) {
          // Process each uploaded file
          for (const file of uploadedFiles) {
            if (!file.uploaded) continue;
            
            const fileName = file.fileName;
            if (!result[personKey][documentType][fileName]) {
              result[personKey][documentType][fileName] = {
                confidence: "",
                methodUsed: "",
                filePath: file.filePath,
                uploadedAt: file.uploadedAt
              };
            }
            
            // Initialize value structure for this file
            for (const valueId of valueIds) {
              if (!result[personKey][documentType][fileName][valueId]) {
                result[personKey][documentType][fileName][valueId] = this.createValueStructure(valueId);
              }
            }
          }
        }
      }
    }
    
    return result;
  }

  /**
   * Create standardized value structure based on value type
   */
  private createValueStructure(valueId: string): any {
    // Define value structure based on common patterns
    const baseStructure = {
      gross_value: "",
      net_value: "",
      year: "",
      month: "",
      isMonthly: null,
      isRecurring: null,
      laufzeit: "",
      confidence: ""
    };
    
    // Customize structure based on value type
    switch (valueId) {
      case 'prior_year_earning':
      case 'wheinachtsgeld_last12':
      case 'urlaubsgeld_last12':
      case 'otherincome_last12':
      case 'incomebusiness':
      case 'incomeagriculture':
      case 'incomerent':
      case 'incomepension':
      case 'incomeablg':
      case 'incomeforeign':
      case 'incomeunterhalttaxfree':
      case 'incomeunterhalttaxable':
      case 'incomepauschal':
        return {
          gross_value: "",
          year: "",
          month: "",
          isMonthly: null,
          confidence: ""
        };
        
      case 'monthlynetsalary':
      case 'wheinachtsgeld_next12_net':
      case 'urlaubsgeld_next12_net':
      case 'otheremploymentmonthlynetincome':
      case 'incomeagriculture_net':
      case 'incomerent_net':
      case 'yearlycapitalnetincome':
      case 'yearlybusinessnetincome':
      case 'yearlyselfemployednetincome':
      case 'pensionmonthlynetincome':
      case 'incomeunterhalttaxfree':
      case 'incomeunterhalttaxable_net':
      case 'monthlykindergeldnetincome':
      case 'monthlypflegegeldnetincome':
      case 'monthlyelterngeldnetincome':
      case 'othermonthlynetincome':
        return {
          net_value: "",
          year: "",
          month: "",
          isMonthly: null,
          confidence: ""
        };
        
      case 'werbungskosten':
      case 'kinderbetreuungskosten':
      case 'unterhaltszahlungen':
      case 'unterhaltszahlungenTotal':
        return {
          amount: "",
          year: "",
          month: "",
          isMonthly: null,
          isRecurring: null,
          laufzeit: "",
          confidence: ""
        };
        
      case 'betragotherinsurancetaxexpenses':
      case 'loans':
      case 'zwischenkredit':
      case 'otherzahlungsverpflichtung':
      case 'sparratebausparvertraege':
      case 'praemiekapitalrentenversicherung':
        return {
          amount: "",
          year: "",
          month: "",
          isMonthly: null,
          laufzeit: "",
          confidence: ""
        };
        
      case 'prior_year':
        return {
          year: "",
          confidence: ""
        };
        
      default:
        return baseStructure;
    }
  }

  /**
   * Update extraction structure with OCR results
   * This method can be called after OCR processing to populate the structure with extracted data
   */
  async updateExtractionStructureWithResults(
    extractionStructure: Record<string, any>,
    personKey: string,
    documentType: string,
    fileName: string,
    valueId: string,
    extractedData: any
  ): Promise<void> {
    try {
      if (extractionStructure[personKey]?.[documentType]?.[fileName]?.[valueId]) {
        // Update the specific value with extracted data
        const valueStructure = extractionStructure[personKey][documentType][fileName][valueId];
        
        // Map extracted data to the structure
        Object.keys(extractedData).forEach(key => {
          if (valueStructure.hasOwnProperty(key)) {
            valueStructure[key] = extractedData[key];
          }
        });
        
        // Update confidence and method used at file level
        if (extractedData.confidence) {
          extractionStructure[personKey][documentType][fileName].confidence = extractedData.confidence;
        }
        if (extractedData.methodUsed) {
          extractionStructure[personKey][documentType][fileName].methodUsed = extractedData.methodUsed;
        }
        
        console.log(`Updated ${valueId} for ${fileName} with extracted data:`, extractedData);
      } else {
        console.warn(`Could not find structure for ${personKey}/${documentType}/${fileName}/${valueId}`);
      }
    } catch (error) {
      console.error('Error updating extraction structure:', error);
    }
  }

  /**
   * Get extraction summary from populated structure
   * This method extracts the final values from the populated structure for calculations
   */
  getExtractionSummaryFromStructure(extractionStructure: Record<string, any>): Record<string, any> {
    const summary: Record<string, any> = {};
    
    for (const [personKey, personData] of Object.entries(extractionStructure)) {
      summary[personKey] = {};
      
      for (const [documentType, docData] of Object.entries(personData)) {
        if (typeof docData === 'object' && docData !== null && 'relevantValues' in docData) {
          // This is a document type entry
          summary[personKey][documentType] = {};
          const relevantValues = (docData as any).relevantValues as string[];
          
          for (const [fileName, fileData] of Object.entries(docData)) {
            if (typeof fileData === 'object' && fileData !== null && 'filePath' in fileData) {
              // This is a file entry
              const fileDataTyped = fileData as any;
              for (const valueId of relevantValues) {
                if (fileDataTyped[valueId]) {
                  if (!summary[personKey][documentType][valueId]) {
                    summary[personKey][documentType][valueId] = [];
                  }
                  
                  summary[personKey][documentType][valueId].push({
                    fileName: fileName,
                    filePath: fileDataTyped.filePath,
                    data: fileDataTyped[valueId],
                    confidence: fileDataTyped.confidence || '',
                    methodUsed: fileDataTyped.methodUsed || ''
                  });
                }
              }
            }
          }
        }
      }
    }
    
    return summary;
  }

  /**
   * Save extraction structure to database
   * This method stores the extraction structure in the applications table for later use
   */
  async saveExtractionStructureToDatabase(extractionStructure: Record<string, any>): Promise<void> {
    try {
      const { error } = await supabase
        .from('applications')
        .update({
          extraction_structure: extractionStructure,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.applicationId);

      if (error) {
        console.error('Error saving extraction structure to database:', error);
        throw error;
      }

      console.log('Extraction structure saved to database successfully');
    } catch (error) {
      console.error('Error saving extraction structure:', error);
      throw error;
    }
  }

  /**
   * Load extraction structure from database
   * This method retrieves the stored extraction structure from the applications table
   */
  async loadExtractionStructureFromDatabase(): Promise<Record<string, any> | null> {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('extraction_structure')
        .eq('id', this.applicationId)
        .single();

      if (error) {
        console.error('Error loading extraction structure from database:', error);
        return null;
      }

      return data?.extraction_structure || null;
    } catch (error) {
      console.error('Error loading extraction structure:', error);
      return null;
    }
  }
}
