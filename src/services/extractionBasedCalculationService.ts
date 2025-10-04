import { supabase } from '../lib/supabase';

/**
 * Value with metadata about its source
 */
export interface ValueWithMetadata {
  value: number;
  source: 'extracted' | 'form' | 'manual';
  documentIds?: string[]; // Document IDs if extracted (e.g., ["hauptantragsteller_lohn_gehaltsbescheinigungen_0"])
  confidence?: number; // Average confidence if extracted from multiple docs
  editable: boolean; // Whether agent can edit this value
}

/**
 * Calculation line for display
 */
export interface CalculationLine {
  type: 'person_header' | 'income_item' | 'expense_item' | 'subtotal' | 'total' | 'validation';
  label: string;
  value?: ValueWithMetadata;
  personId?: string; // 'main' or UUID for additional applicants
  personName?: string;
}

/**
 * Service for extraction-based calculations
 * Mirrors ValidationService logic but uses extraction_structure first, falls back to form data
 */
export class ExtractionBasedCalculationService {
  private residentId: string;

  constructor(residentId: string) {
    this.residentId = residentId;
  }

  /**
   * Calculate available monthly income using extraction data with fallback to form data
   */
  async calculateAvailableMonthlyIncome(
    extractionStructure: any
  ): Promise<{
    calculations: CalculationLine[];
    errors: string[];
    warnings: string[];
    totalIncome: number;
    totalExpenses: number;
    availableIncome: number;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const calculations: CalculationLine[] = [];

    try {
      // Fetch user data and financial data
      const [
        { data: userData, error: userError },
        { data: financialData, error: financialError }
      ] = await Promise.all([
        supabase.from('user_data').select('*').eq('id', this.residentId).single(),
        supabase.from('user_financials').select('*').eq('user_id', this.residentId).single()
      ]);

      if (userError || !userData) {
        errors.push('Benutzerdaten konnten nicht geladen werden');
        return { calculations, errors, warnings, totalIncome: 0, totalExpenses: 0, availableIncome: 0 };
      }

      if (financialError || !financialData) {
        errors.push('Finanzdaten konnten nicht geladen werden');
        return { calculations, errors, warnings, totalIncome: 0, totalExpenses: 0, availableIncome: 0 };
      }

      let totalHouseholdIncome = 0;
      let totalHouseholdExpenses = 0;

      // Calculate for main applicant
      if (userData?.noIncome !== true) {
        const personName = userData.firstname && userData.lastname 
          ? `${userData.firstname} ${userData.lastname}`
          : 'Hauptantragsteller';
        
        const { income, expenses, incomeLines, expenseLines } = await this.calculatePersonIncome(
          'main_applicant',
          personName,
          financialData,
          extractionStructure
        );

        totalHouseholdIncome += income;
        totalHouseholdExpenses += expenses;

        // Add person header
        calculations.push({
          type: 'person_header',
          label: personName,
          personId: 'main',
          personName: personName
        });

        // Add income and expense lines
        calculations.push(...incomeLines);
        calculations.push(...expenseLines);

        // Add person subtotal
        calculations.push({
          type: 'subtotal',
          label: 'Überschuss',
          value: {
            value: income - expenses,
            source: 'form', // Computed value
            editable: false
          },
          personId: 'main'
        });
      }

      // Calculate for additional applicants
      if (financialData?.additional_applicants_financials && userData?.weitere_antragstellende_personen) {
        const additionalFinancials = financialData.additional_applicants_financials;
        const additionalPersons = userData.weitere_antragstellende_personen;

        for (const [uuid, person] of Object.entries(additionalPersons) as [string, any][]) {
          const applicantFinancials = additionalFinancials[uuid];
          if (!applicantFinancials) continue;

          // Skip if not household or no income
          if (person?.notHousehold === true || person?.noIncome === true) continue;

          const personName = person.firstName && person.lastName
            ? `${person.firstName} ${person.lastName}`
            : `Person ${uuid.substring(0, 8)}`;

          const { income, expenses, incomeLines, expenseLines } = await this.calculatePersonIncome(
            uuid,
            personName,
            applicantFinancials,
            extractionStructure
          );

          totalHouseholdIncome += income;
          totalHouseholdExpenses += expenses;

          // Add person header
          calculations.push({
            type: 'person_header',
            label: personName,
            personId: uuid,
            personName: personName
          });

          // Add income and expense lines
          calculations.push(...incomeLines);
          calculations.push(...expenseLines);

          // Add person subtotal
          calculations.push({
            type: 'subtotal',
            label: 'Überschuss',
            value: {
              value: income - expenses,
              source: 'form',
              editable: false
            },
            personId: uuid
          });
        }
      }

      // Add household totals
      calculations.push({
        type: 'total',
        label: 'Gesamt Einnahmen',
        value: {
          value: totalHouseholdIncome,
          source: 'form',
          editable: false
        }
      });

      calculations.push({
        type: 'total',
        label: 'Gesamt Ausgaben',
        value: {
          value: totalHouseholdExpenses,
          source: 'form',
          editable: false
        }
      });

      const totalAvailableIncome = totalHouseholdIncome - totalHouseholdExpenses;

      calculations.push({
        type: 'total',
        label: 'Verfügbares Monatseinkommen gesamt',
        value: {
          value: totalAvailableIncome,
          source: 'form',
          editable: false
        }
      });

      // Validate against minimum requirement
      const adultCount = parseInt(userData.adult_count) || 0;
      const childCount = parseInt(userData.child_count) || 0;
      const totalHouseholdMembers = adultCount + childCount;

      if (totalHouseholdMembers > 0) {
        let minimumRequired = 0;
        if (totalHouseholdMembers === 1) {
          minimumRequired = 990;
        } else if (totalHouseholdMembers === 2) {
          minimumRequired = 1270;
        } else {
          minimumRequired = 1270 + (totalHouseholdMembers - 2) * 320;
        }

        calculations.push({
          type: 'validation',
          label: `Mindestbedarf für ${totalHouseholdMembers}-Personen-Haushalt`,
          value: {
            value: minimumRequired,
            source: 'form',
            editable: false
          }
        });

        const surplus = totalAvailableIncome - minimumRequired;
        if (surplus < 0) {
          errors.push(`Mindestbedarf nicht erfüllt (Fehlbetrag: ${this.formatCurrency(Math.abs(surplus))})`);
        }
      }

      return {
        calculations,
        errors,
        warnings,
        totalIncome: totalHouseholdIncome,
        totalExpenses: totalHouseholdExpenses,
        availableIncome: totalAvailableIncome
      };

    } catch (error) {
      errors.push(`Fehler bei der Berechnung: ${error}`);
      return { calculations, errors, warnings, totalIncome: 0, totalExpenses: 0, availableIncome: 0 };
    }
  }

  /**
   * Calculate income and expenses for a single person
   */
  private async calculatePersonIncome(
    personId: string,
    personName: string,
    financialData: any,
    extractionStructure: any
  ): Promise<{
    income: number;
    expenses: number;
    incomeLines: CalculationLine[];
    expenseLines: CalculationLine[];
  }> {
    const incomeLines: CalculationLine[] = [];
    const expenseLines: CalculationLine[] = [];
    let totalIncome = 0;
    let totalExpenses = 0;

    // Get person's extraction data
    const personExtractionKey = personId === 'main_applicant' ? 'main_applicant' : personId;
    const personExtraction = extractionStructure?.[personExtractionKey];

    // INCOME CALCULATIONS

    // 1. Monthly net salary
    if (financialData.hasSalaryIncome) {
      const salaryValue = await this.resolveValue(
        'monthlynetsalary',
        financialData.monthlynetsalary,
        personExtraction,
        personId
      );
      
      totalIncome += salaryValue.value;
      incomeLines.push({
        type: 'income_item',
        label: 'Monatliches Nettogehalt',
        value: salaryValue,
        personId
      });

      // Christmas bonus (divided by 12)
      const christmasValue = await this.resolveValue(
        'wheinachtsgeld_next12_net',
        financialData.wheinachtsgeld_next12_net,
        personExtraction,
        personId
      );
      var christmasMonthly = christmasValue.value
      if(christmasValue.source === 'form') {
        christmasMonthly = christmasValue.value / 12;
      }
      totalIncome += christmasMonthly;
      incomeLines.push({
        type: 'income_item',
        label: 'Weihnachtsgeld (pro Monat)',
        value: {
          ...christmasValue,
          value: christmasMonthly
        },
        personId
      });

      // Vacation bonus (divided by 12)
      const vacationValue = await this.resolveValue(
        'urlaubsgeld_next12_net',
        financialData.urlaubsgeld_next12_net,
        personExtraction,
        personId
      );
      var vacationMonthly = vacationValue.value / 12;
      if(vacationValue.source === 'form') {
        vacationMonthly = vacationValue.value / 12;
      }
      totalIncome += vacationMonthly;
      incomeLines.push({
        type: 'income_item',
        label: 'Urlaubsgeld (pro Monat)',
        value: {
          ...vacationValue,
          value: vacationMonthly
        },
        personId
      });
    }

    //-> Sonstiges Einkommen (Aus nichtselbständiger Arbeit)

    ///-> Agriculture Income

    // -> Rent Income

    // -> Capital Income
    
    //-> Business Income

    // 2. Pension income
    if (financialData.haspensionincome && financialData.pensionmonthlynetincome) {
      const pensionTotal = Array.isArray(financialData.pensionmonthlynetincome)
        ? financialData.pensionmonthlynetincome.reduce((sum: number, p: any) => sum + this.parseCurrency(p.amount), 0)
        : 0;
      
      totalIncome += pensionTotal;
      incomeLines.push({
        type: 'income_item',
        label: 'Renten-/Versorgungsbezüge',
        value: {
          value: pensionTotal,
          source: 'form', // TODO: Add extraction logic for pension
          editable: true
        },
        personId
      });
    }

    // 3. Other income types (Unterhalt, Kindergeld, Elterngeld, etc.)
    if (financialData.hastaxfreeunterhaltincome) {
      const value = this.parseCurrency(financialData.incomeunterhalttaxfree);
      totalIncome += value;
      incomeLines.push({
        type: 'income_item',
        label: 'Steuerfreie Unterhaltsleistungen',
        value: { value, source: 'form', editable: true },
        personId
      });
    }
    // -> Taxable Unterhaltsleistungen

    if (financialData.haskindergeldincome) {
      const value = this.parseCurrency(financialData.monthlykindergeldnetincome);
      totalIncome += value;
      incomeLines.push({
        type: 'income_item',
        label: 'Kindergeld',
        value: { value, source: 'form', editable: true },
        personId
      });
    }

    // -> Pflegegeld

    // -> Elterngeld

    // -> Other income

    // EXPENSE CALCULATIONS

    // 1. Loans
    if (financialData.loans && Array.isArray(financialData.loans)) {
      const loansTotal = financialData.loans.reduce((sum: number, loan: any) => 
        sum + this.parseCurrency(loan.amount), 0);
      
      totalExpenses += loansTotal;
      expenseLines.push({
        type: 'expense_item',
        label: 'Darlehensrückzahlungen',
        value: {
          value: loansTotal,
          source: 'form',
          editable: true
        },
        personId
      });
    }

    // -> Zwischenkredit

    // 2. Maintenance payments
    if (financialData.unterhaltszahlungenTotal && Array.isArray(financialData.unterhaltszahlungenTotal)) {
      const maintenanceTotal = financialData.unterhaltszahlungenTotal.reduce((sum: number, payment: any) => 
        sum + this.parseCurrency(payment.amountTotal), 0);
      
      totalExpenses += maintenanceTotal;
      expenseLines.push({
        type: 'expense_item',
        label: 'Unterhaltszahlungen',
        value: {
          value: maintenanceTotal,
          source: 'form',
          editable: true
        },
        personId
      });
    }

    // -> Other payment obligations

    // 3. Insurance premiums
    if (financialData.hasRentenversicherung) {
      const value = this.parseCurrency(financialData.praemiekapitalrentenversicherung);
      totalExpenses += value;
      expenseLines.push({
        type: 'expense_item',
        label: 'Kapital-/Rentenversicherung',
        value: { value, source: 'form', editable: true },
        personId
      });
    }

    if (financialData.hasBausparvertraege) {
      const value = this.parseCurrency(financialData.sparratebausparvertraege);
      totalExpenses += value;
      expenseLines.push({
        type: 'expense_item',
        label: 'Bausparverträge',
        value: { value, source: 'form', editable: true },
        personId
      });
    }

    return {
      income: totalIncome,
      expenses: totalExpenses,
      incomeLines,
      expenseLines
    };
  }

  /**
   * Resolve a value: check extraction_structure first, fall back to form data
   */
  private async resolveValue(
    fieldName: string,
    formValue: any,
    personExtraction: any,
    personId: string
  ): Promise<ValueWithMetadata> {
    // Try to find value in extraction structure
    if (personExtraction) {
      // Look through all document types for this person
      for (const [docType, docData] of Object.entries(personExtraction) as [string, any][]) {
        if (!docData || typeof docData !== 'object') continue;

        // Look through all files in this document type
        for (const [fileName, fileData] of Object.entries(docData) as [string, any][]) {
          if (fileName === 'numberOfFiles' || fileName === 'relevantValues' || fileName === 'extractionComplete') {
            continue;
          }

          // Check if this file has the field we're looking for
          if (fileData && fileData[fieldName]) {
            const extractedData = fileData[fieldName];
            let extractedValue = 0;

            // Parse the extracted value based on field type
            if (fieldName === 'monthlynetsalary') {
              extractedValue = this.parseCurrency(extractedData.net_value || extractedData.amount);
            } else if (fieldName.includes('next12_net') || fieldName.includes('last12')) {
              extractedValue = this.parseCurrency(extractedData.net_value || extractedData.amount);
            } else {
              extractedValue = this.parseCurrency(extractedData.amount || extractedData);
            }

            // Only use if we got a valid value
            if (extractedValue > 0) {
              const applicantPrefix = personId === 'main_applicant' ? 'hauptantragsteller' : `applicant_${personId}`;
              const documentId = `${applicantPrefix}_${docType}_0`;

              return {
                value: extractedValue,
                source: 'extracted',
                documentIds: [documentId],
                confidence: parseFloat(extractedData.confidence) || undefined,
                editable: true
              };
            }
          }
        }
      }
    }

    // Fall back to form data
    const parsedValue = this.parseCurrency(formValue);
    return {
      value: parsedValue,
      source: 'form',
      editable: true
    };
  }

  /**
   * Parse currency value (handles both string and number formats)
   */
  private parseCurrency(value: any): number {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Remove currency symbols and spaces
      let cleaned = value.replace(/[€\s]/g, '');
      
      // Determine format by checking for both dot and comma
      const hasDot = cleaned.includes('.');
      const hasComma = cleaned.includes(',');
      
      if (hasDot && hasComma) {
        // German format: 1.200,00 (dot = thousands, comma = decimal)
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else if (hasComma && !hasDot) {
        // German decimal format: 1200,00 (comma = decimal)
        cleaned = cleaned.replace(',', '.');
      } else if (hasDot && !hasComma) {
        // Check if dot is decimal separator by looking at digits after it
        // If exactly 2 digits after dot at the end, it's likely decimal (e.g., 250.00)
        // Otherwise it might be thousands separator (e.g., 1.200)
        const dotIndex = cleaned.lastIndexOf('.');
        const afterDot = cleaned.substring(dotIndex + 1);
        if (afterDot.length <= 2 && dotIndex > 0) {
          // Decimal separator format: 250.00
          // Keep as is
        } else {
          // Thousands separator format: 1.200
          cleaned = cleaned.replace(/\./g, '');
        }
      }
      
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  /**
   * Format currency for display
   */
  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(value);
  }
}
