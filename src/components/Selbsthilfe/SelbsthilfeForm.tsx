import React, { useState, useEffect } from 'react';
import { Form, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import AddressInput from '../common/AddressInput';
import CurrencyInput from '../common/CurrencyInput';

// Email validation function
const isValidEmail = (email: string): boolean => {
  if (!email) return false;
  
  // Basic email regex pattern
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

// Add styles
const styles = `
  .form-check-input:checked {
    background-color: #064497 !important;
    border-color: #064497 !important;
  }
  .add-person-btn {
    color: #064497;
    border-color: #064497;
    display: inline-block;
  }
  .add-person-btn:hover, .add-person-btn:focus {
    background-color: #064497 !important;
    color: #fff !important;
  }
  .section-header {
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    background-color: #f8f9fa;
    border-radius: 0.375rem;
    margin-bottom: 1rem;
    transition: background-color 0.2s ease;
  }
  .section-header:hover {
    background-color: #e9ecef;
  }
  .section-header h3 {
    margin: 0;
    font-size: 1.1rem;
  }
  .section-content {
    padding: 1rem;
    margin-bottom: 1rem;
  }
  .expand-icon {
    transition: transform 0.2s ease;
  }
  .expand-icon.expanded {
    transform: rotate(180deg);
  }
  .cost-table-header {
    background-color: #f8f9fa;
    padding: 0.75rem;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
    font-weight: 600;
    border: 1px solid #e9ecef;
  }
  .cost-table-row {
    padding: 0.8rem;
  }
  .cost-section-wrapper {
    background-color: #ffffff;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
    overflow: hidden;
  }
  .cost-table-total {
    background-color: #064497;
    color: white;
    padding: 1rem;
    border-radius: 0.5rem;
    margin-top: 1rem;
    font-weight: 600;
  }
  .job-type-cell {
    width: 100%;
    height: 58px;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
    background-color: #f8f9fa;
    border-radius: 0.375rem;
    padding: 1rem 0.75rem;
    color: #000000;
    display: flex;
    align-items: center;
    border: 1px solid #ced4da;
  }
  .job-type-cell-editable {
    background-color: #ffffff;
  }
  .helper-card {
    background-color: #ffffff;
    border-radius: 0.5rem;
    padding: 1.5rem;
    margin-bottom: 1rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  }
  .job-chip {
    background: #eaf2fb;
    color: #064497;
    border-radius: 5px;
    padding: 6px 12px;
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 15px;
    font-weight: 500;
    margin: 2px;
  }
  .job-chip-remove {
    background: none;
    border: none;
    color: #d32f2f;
    margin-left: 4px;
    cursor: pointer;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 24px;
    width: 24px;
  }
`;

interface Helper {
  id: string;
  name: string;
  surname: string;
  jobNumbers: string[];
  hours: string;
  email: string;
  jobTitle: string;
  address: {
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
  };
}

interface SelbsthilfeData {
  willProvideSelfHelp: boolean | null;
  address: {
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
  };
  mainApplicantWillHelp: boolean | null;
  costBreakdown: any;
  totals: {
    totalMaterialkosten: number;
    totalLohnkosten: number;
    totalSelbsthilfe: number;
  };
}

interface Props {
  data: SelbsthilfeData;
  helpers: Helper[];
  onChange: (data: Partial<SelbsthilfeData>) => void;
  onHelpersChange: (helpers: Helper[]) => void;
  showValidation: boolean;
  isReadOnly?: boolean;
  hauptantragSelbsthilfe?: number | null;
}

const renderTooltip = (text: string) => (
  <Tooltip id="button-tooltip">
    {text}
  </Tooltip>
);

// Job types for the cost breakdown
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
  { key: 'sonstige', label: '1.15 Sonstige Gebäudearbeiten', number: '1.15', isEditable: true, placeholder: 'Sonstige Gebäudearbeiten' },
  { key: 'gartenanlagen', label: '2.1 Gartenanlagen', number: '2.1' },
  { key: 'wegeflaeche', label: '2.2 Wegefläche/Terrasse', number: '2.2' },
  { key: 'sonstigeAussen1', label: '2.3 Sonstige Außenanlagen', number: '2.3', isEditable: true, placeholder: 'Sonstige Außenanlagen' },
  { key: 'sonstigeAussen2', label: '2.4 Weitere Außenanlagen', number: '2.4', isEditable: true, placeholder: 'Weitere Außenanlagen' },
  { key: 'architektur', label: '3.1 Architekturleistungen', number: '3.1' },
  { key: 'verwaltung', label: '3.2 Verwaltungsleistungen', number: '3.2' },
  { key: 'sonstigeBaunebenkosten1', label: '3.3 Sonstige Baunebenkosten', number: '3.3', isEditable: true, placeholder: 'Sonstige Baunebenkosten' },
  { key: 'sonstigeBaunebenkosten2', label: '3.4 Weitere Baunebenkosten', number: '3.4', isEditable: true, placeholder: 'Weitere Baunebenkosten' }
];

const SelbsthilfeForm: React.FC<Props> = ({ data, helpers, onChange, onHelpersChange, showValidation, isReadOnly = false, hauptantragSelbsthilfe }) => {
  const [expandedSection, setExpandedSection] = useState<string>('');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? '' : section);
  };

  // Helper function to generate unique IDs
  const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Format currency for display in totals
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(value);
  };

  // Get message based on selbsthilfe logic
  const getSelbsthilfeMessage = () => {
    if (hauptantragSelbsthilfe === null || hauptantragSelbsthilfe === undefined) {
      // No selbsthilfe data from Hauptantrag yet
      if (data.willProvideSelfHelp === false) {
        return {
          type: 'info',
          message: 'Wenn Sie keine Selbsthilfe erbringen, müssen Sie dieses Formular nicht ausfüllen. Klicken Sie auf "Speichern und verlassen", um dieses Formular abzuschließen. Bitte vergessen Sie nicht, den Selbsthilfe-Betrag in Schritt 6 des Hauptantrags mit 0,00 € anzugeben.'
        };
      }
      return null;
    }

    if (hauptantragSelbsthilfe > 0) {
      if (data.willProvideSelfHelp === true) {
        return {
          type: 'info',
          message: `Sie haben im Hauptantrag einen Selbsthilfe-Betrag von ${formatCurrency(hauptantragSelbsthilfe)} angegeben.`
        };
      }
    } else if (hauptantragSelbsthilfe === 0) {
      if (data.willProvideSelfHelp === false) {
        return {
          type: 'success',
          message: 'Da Sie keine Selbsthilfeleistung im Hauptantrag angegeben haben, brauchen Sie dieses Formular nicht auszufüllen. Klicken Sie auf "Speichern und verlassen", um dieses Formular abzuschließen. Falls Sie Selbsthilfe erbringen, passen Sie bitte den Selbsthilfe-Betrag in Schritt 6 des Hauptantrags an.'
        };
      } else if (data.willProvideSelfHelp === true) {
        return {
          type: 'info',
          message: 'Sie haben die Selbsthilfeleistung im Hauptantrag mit 0,00 € angegeben. Bitte ändern Sie den Betrag in Schritt 6 des Hauptantrags, falls Sie Selbsthilfeleistungen erbringen.'
        };
      }
    }

    return null;
  };

  // Calculate totals whenever cost breakdown changes
  useEffect(() => {
    const totals = {
      totalMaterialkosten: 0,
      totalLohnkosten: 0,
      totalSelbsthilfe: 0
    };

    Object.values(data.costBreakdown || {}).forEach((entry: any) => {
      if (entry) {
        // Extract raw cent values and divide by 100 to get actual euro amounts
        const materialkosten = Number((entry.materialkosten || '0').replace(/[^0-9]/g, '')) / 100 || 0;
        const lohnkosten = Number((entry.lohnkosten || '0').replace(/[^0-9]/g, '')) / 100 || 0;
        const selbsthilfe = Number((entry.selbsthilfe || '0').replace(/[^0-9]/g, '')) / 100 || 0;
        
        totals.totalMaterialkosten += materialkosten;
        totals.totalLohnkosten += lohnkosten;
        totals.totalSelbsthilfe += selbsthilfe;
      }
    });

    onChange({ ...data, totals });
  }, [data.costBreakdown]);

  // Update cost breakdown entry
  const updateCostEntry = (jobKey: string, field: string, value: string) => {
    const updatedCostBreakdown = {
      ...(data.costBreakdown || {}),
      [jobKey]: {
        ...(data.costBreakdown?.[jobKey] || {}),
        [field]: value
      }
    };
    onChange({ ...data, costBreakdown: updatedCostBreakdown });
  };

  // Add new helper
  const addHelper = () => {
    const newHelper: Helper = {
      id: generateId(),
      name: '',
      surname: '',
      jobNumbers: [],
      hours: '',
      email: '',
      jobTitle: '',
      address: {
        street: '',
        houseNumber: '',
        postalCode: '',
        city: ''
      }
    };
    onHelpersChange([...helpers, newHelper]);
  };

  // Remove helper
  const removeHelper = (helperId: string) => {
    onHelpersChange(helpers.filter(helper => helper.id !== helperId));
  };

  // Update helper
  const updateHelper = (helperId: string, updates: Partial<Helper>) => {
    const updatedHelpers = helpers.map(helper =>
      helper.id === helperId ? { ...helper, ...updates } : helper
    );
    onHelpersChange(updatedHelpers);
  };

  // Update helper address
  const updateHelperAddress = (helperId: string, address: Helper['address']) => {
    updateHelper(helperId, { address });
  };

  // Add job number for helper
  const addJobNumber = (helperId: string, jobNumber: string) => {
    const helper = helpers.find(h => h.id === helperId);
    if (!helper || helper.jobNumbers.includes(jobNumber)) return;

    const jobNumbers = [...helper.jobNumbers, jobNumber];
    updateHelper(helperId, { jobNumbers });
  };

  // Remove job number for helper
  const removeJobNumber = (helperId: string, jobNumber: string) => {
    const helper = helpers.find(h => h.id === helperId);
    if (!helper) return;

    const jobNumbers = helper.jobNumbers.filter(jn => jn !== jobNumber);
    updateHelper(helperId, { jobNumbers });
  };

  // Validation functions
  const validateField = (fieldName: string): boolean => {
    if (!showValidation) return false;

    switch (fieldName) {
      case 'willProvideSelfHelp':
        // Check if field is not set
        if (data.willProvideSelfHelp === null || data.willProvideSelfHelp === undefined) return true;
        // Check for inconsistency with Hauptantrag selbsthilfe amount
        if (hauptantragSelbsthilfe !== null && hauptantragSelbsthilfe !== undefined && hauptantragSelbsthilfe > 0 && data.willProvideSelfHelp === false) return true;
        return false;
      case 'mainApplicantWillHelp':
        return data.willProvideSelfHelp === true && (data.mainApplicantWillHelp === null || data.mainApplicantWillHelp === undefined);
      case 'address.street':
        return data.willProvideSelfHelp === true && !data.address.street?.trim();
      case 'address.houseNumber':
        return data.willProvideSelfHelp === true && !data.address.houseNumber?.trim();
      case 'address.postalCode':
        return data.willProvideSelfHelp === true && (!data.address.postalCode?.trim() || !/^\d{5}$/.test(data.address.postalCode));
      case 'address.city':
        return data.willProvideSelfHelp === true && !data.address.city?.trim();
      default:
        return false;
    }
  };

  const getFieldErrorMessage = (fieldName: string): string | undefined => {
    if (!showValidation) return undefined;

    switch (fieldName) {
      case 'willProvideSelfHelp':
        // Check for inconsistency with Hauptantrag selbsthilfe amount
        if (hauptantragSelbsthilfe !== null && hauptantragSelbsthilfe !== undefined && hauptantragSelbsthilfe > 0 && data.willProvideSelfHelp === false) {
          return `Sie haben im Hauptantrag einen Selbsthilfe-Betrag von ${formatCurrency(hauptantragSelbsthilfe)} angegeben. Falls Sie Selbsthilfe zur Finanzierung des Projekts erbringen, wählen Sie bitte "Ja" aus.`;
        }
        return 'Bitte geben Sie an, ob Sie Selbsthilfeleistungen erbringen werden';
      case 'mainApplicantWillHelp':
        return 'Bitte geben Sie an, ob Sie sich an den Selbsthilfeleistungen beteiligen werden';
      case 'address.street':
        return 'Straße ist erforderlich';
      case 'address.houseNumber':
        return 'Hausnummer ist erforderlich';
      case 'address.postalCode':
        if (!data.address.postalCode?.trim()) return 'Postleitzahl ist erforderlich';
        if (!/^\d{5}$/.test(data.address.postalCode)) return 'Die Postleitzahl muss aus genau 5 Ziffern bestehen';
        return undefined;
      case 'address.city':
        return 'Ort ist erforderlich';
      default:
        return undefined;
    }
  };

  // Cost validation functions
  const validateCostField = (jobKey: string, field: string): boolean => {
    if (!showValidation || data.willProvideSelfHelp !== true) return false;
    
    const entry = data.costBreakdown?.[jobKey];
    if (!entry) return false;

    // Check if any field in this row has a value
    const hasDescription = entry.description && entry.description.trim();
    const hasMaterialkosten = entry.materialkosten && entry.materialkosten.trim();
    const hasLohnkosten = entry.lohnkosten && entry.lohnkosten.trim();
    const hasSelbsthilfe = entry.selbsthilfe && entry.selbsthilfe.trim();
    
    const hasAnyValue = hasDescription || hasMaterialkosten || hasLohnkosten || hasSelbsthilfe;
    
    if (!hasAnyValue) return false;

    // If any field has a value, all required fields must have values
    if (field === 'description') {
      const jobType = JOB_TYPES.find(jt => jt.key === jobKey);
      return (jobType?.isEditable ?? false) && !hasDescription;
    }
    if (field === 'materialkosten') return !hasMaterialkosten;
    if (field === 'lohnkosten') return !hasLohnkosten;
    if (field === 'selbsthilfe') return !hasSelbsthilfe;
    
    return false;
  };

  const validateCostLogic = (jobKey: string, field: string): boolean => {
    if (!showValidation || data.willProvideSelfHelp !== true) return false;
    
    const entry = data.costBreakdown?.[jobKey];
    if (!entry) return false;

    // Check if Materialkosten + Lohnkosten < Selbsthilfe
    if (field === 'materialkosten' || field === 'lohnkosten') {
      const materialkosten = Number((entry.materialkosten || '0').replace(/[^0-9]/g, '')) / 100 || 0;
      const lohnkosten = Number((entry.lohnkosten || '0').replace(/[^0-9]/g, '')) / 100 || 0;
      const selbsthilfe = Number((entry.selbsthilfe || '0').replace(/[^0-9]/g, '')) / 100 || 0;
      
      return selbsthilfe > 0 && (materialkosten + lohnkosten) < selbsthilfe;
    }
    
    return false;
  };

  // Helper validation functions
  const validateHelperField = (helper: Helper, field: string): boolean => {
    if (!showValidation || data.willProvideSelfHelp !== true) return false;
    
    // Don't validate main applicant if they won't help
    if (helper.id === 'main_applicant' && data.mainApplicantWillHelp !== true) return false;
    
    // Check if helper has any data entered OR if it's the main applicant (should always be validated if helping)
    const hasAnyData = helper.name?.trim() || helper.surname?.trim() || helper.email?.trim() || 
                      helper.jobTitle?.trim() || helper.jobNumbers.length > 0 || helper.hours?.trim();
    
    const isMainApplicant = helper.id === 'main_applicant';
    
    // For main applicant, always validate if they will help. For others, only validate if they have data
    if (!isMainApplicant && !hasAnyData) return false;
    
    switch (field) {
      case 'name':
        return !helper.name?.trim();
      case 'surname':
        return !helper.surname?.trim();
      case 'email':
        return !helper.email?.trim() || !isValidEmail(helper.email);
      case 'jobTitle':
        return !helper.jobTitle?.trim();
      case 'jobNumbers':
        return helper.jobNumbers.length === 0;
      case 'hours':
        return !helper.hours?.trim();
      case 'address.street':
        return !helper.address.street?.trim();
      case 'address.houseNumber':
        return !helper.address.houseNumber?.trim();
      case 'address.postalCode':
        return !helper.address.postalCode?.trim() || !/^\d{5}$/.test(helper.address.postalCode);
      case 'address.city':
        return !helper.address.city?.trim();
      default:
        return false;
    }
  };

  // Get all helper validation errors
  const getHelperValidationErrors = () => {
    if (!showValidation || data.willProvideSelfHelp !== true) return [];
    
    const errors: string[] = [];
    
    helpers.forEach((helper, index) => {
      // Skip main applicant if they won't help
      if (index === 0 && data.mainApplicantWillHelp !== true) return;
      
      const helperType = index === 0 ? 'Hauptantragsteller' : `Helfer ${index}`;
      
      // Check if helper has any data entered OR if it's the main applicant
      const hasAnyData = helper.name?.trim() || helper.surname?.trim() || helper.email?.trim() || 
                        helper.jobTitle?.trim() || helper.jobNumbers.length > 0 || helper.hours?.trim();
      
      const isMainApplicant = index === 0;
      
      // For main applicant, always validate if they will help. For others, only validate if they have data
      if (isMainApplicant || hasAnyData) {
        if (!helper.name?.trim()) {
          errors.push(`${helperType}: Vorname fehlt`);
        }
        if (!helper.surname?.trim()) {
          errors.push(`${helperType}: Nachname fehlt`);
        }
        if (!helper.email?.trim()) {
          errors.push(`${helperType}: E-Mail fehlt`);
        } else if (!isValidEmail(helper.email)) {
          errors.push(`${helperType}: Bitte geben Sie eine gültige E-Mail-Adresse ein`);
        }
        if (!helper.jobTitle?.trim()) {
          errors.push(`${helperType}: Beruf fehlt`);
        }
        if (helper.jobNumbers.length === 0) {
          errors.push(`${helperType}: Mindestens eine Arbeitsnummer muss ausgewählt werden`);
        }
        if (!helper.hours?.trim()) {
          errors.push(`${helperType}: Anzahl der Stunden fehlt`);
        }

        // Address validation
        if (!helper.address.street?.trim()) {
          errors.push(`${helperType}: Straße der Adresse fehlt`);
        }
        if (!helper.address.houseNumber?.trim()) {
          errors.push(`${helperType}: Hausnummer der Adresse fehlt`);
        }
        if (!helper.address.postalCode?.trim()) {
          errors.push(`${helperType}: Postleitzahl der Adresse fehlt`);
        } else if (!/^\d{5}$/.test(helper.address.postalCode)) {
          errors.push(`${helperType}: Postleitzahl muss aus genau 5 Ziffern bestehen`);
        }
        if (!helper.address.city?.trim()) {
          errors.push(`${helperType}: Ort der Adresse fehlt`);
        }

        // Check if selected job numbers have corresponding costs defined
        helper.jobNumbers.forEach(jobNumber => {
          const jobType = JOB_TYPES.find(jt => jt.number === jobNumber);
          if (jobType) {
            const entry = data.costBreakdown?.[jobType.key];
            const hasSelbsthilfe = entry?.selbsthilfe && entry.selbsthilfe.trim();
            if (!hasSelbsthilfe) {
              errors.push(`${helperType}: Für ausgewählte Arbeit "${jobType.label}" sind keine Selbsthilfekosten definiert`);
            }
          }
        });
      }
    });
    
    return errors;
  };

  const getHelperEmailErrorMessage = (helper: Helper, helperType: string): string => {
    if (!helper.email?.trim()) {
      return `${helperType}: E-Mail fehlt`;
    } else if (!isValidEmail(helper.email)) {
      return `${helperType}: Bitte geben Sie eine gültige E-Mail-Adresse ein`;
    }
    return '';
  };

  const getCostValidationErrors = () => {
    if (!showValidation || data.willProvideSelfHelp !== true) return [];
    
    const errors: string[] = [];
    
    // Check if any selbsthilfe costs are defined at all
    const hasAnySelbsthilfe = JOB_TYPES.some(jobType => {
      const entry = data.costBreakdown?.[jobType.key];
      return entry?.selbsthilfe && entry.selbsthilfe.trim();
    });

    if (!hasAnySelbsthilfe) {
      errors.push('Es müssen mindestens für eine Arbeitsart Selbsthilfekosten angegeben werden');
    }

    // Check if total Selbsthilfe matches Hauptantrag amount
    if (hauptantragSelbsthilfe !== null && hauptantragSelbsthilfe !== undefined) {
      const totalSelbsthilfe = data.totals?.totalSelbsthilfe || 0;
      if (totalSelbsthilfe !== hauptantragSelbsthilfe) {
        errors.push(`Die Summe der Selbsthilfeleistungen (${formatCurrency(totalSelbsthilfe)}) weicht von Ihrer Angabe im Hauptantrag ab (${formatCurrency(hauptantragSelbsthilfe)}). Bitte korrigieren Sie die Beträge oder passen Sie den Selbsthilfe-Betrag in Schritt 6 des Hauptantrags an.`);
      }
    }
    
    JOB_TYPES.forEach(jobType => {
      const entry = data.costBreakdown?.[jobType.key];
      if (!entry) return;

      const hasDescription = entry.description && entry.description.trim();
      const hasMaterialkosten = entry.materialkosten && entry.materialkosten.trim();
      const hasLohnkosten = entry.lohnkosten && entry.lohnkosten.trim();
      const hasSelbsthilfe = entry.selbsthilfe && entry.selbsthilfe.trim();
      
      const hasAnyValue = hasDescription || hasMaterialkosten || hasLohnkosten || hasSelbsthilfe;
      
      if (hasAnyValue) {
        // Check if all required fields are filled
        if (jobType.isEditable && !hasDescription) {
          errors.push(`${jobType.label}: Beschreibung ist erforderlich`);
        }
        if (!hasMaterialkosten) {
          errors.push(`${jobType.label}: Materialkosten sind erforderlich`);
        }
        if (!hasLohnkosten) {
          errors.push(`${jobType.label}: Lohnkosten sind erforderlich`);
        }
        if (!hasSelbsthilfe) {
          errors.push(`${jobType.label}: Selbsthilfe ist erforderlich`);
        }
        
        // Check cost logic
        if (hasMaterialkosten && hasLohnkosten && hasSelbsthilfe) {
          const materialkosten = Number((entry.materialkosten || '0').replace(/[^0-9]/g, '')) / 100 || 0;
          const lohnkosten = Number((entry.lohnkosten || '0').replace(/[^0-9]/g, '')) / 100 || 0;
          const selbsthilfe = Number((entry.selbsthilfe || '0').replace(/[^0-9]/g, '')) / 100 || 0;
          
          if (selbsthilfe > 0 && (materialkosten + lohnkosten) < selbsthilfe) {
            errors.push(`${jobType.label}: Selbsthilfe (${formatCurrency(selbsthilfe)}) kann nicht höher sein als Material- und Lohnkosten zusammen (${formatCurrency(materialkosten + lohnkosten)})`);
          }
        }
      }
    });
    
    return errors;
  };

  // Helper function to render section header
  const renderSectionHeader = (id: string, title: string) => (
    <div 
      className="section-header" 
      onClick={() => toggleSection(id)}
    >
      <div className="d-flex align-items-center gap-2">
        <h3 className="text-xl font-medium text-[#000000] mb-0">{title}</h3>
      </div>
      <div className={`expand-icon ${expandedSection === id ? 'expanded' : ''}`}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 10L12 15L17 10" stroke="#064497" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );

  return (
    <Form>
      <style>
        {styles}
      </style>

      {/* Initial Question */}
      <div className="mb-5">
        <div className="d-flex align-items-center mb-3">
          <div className="flex-grow-1">
            <Form.Label className="mb-0" style={{ fontSize: '1.1rem', fontWeight: '500' }}>
              Werden Sie zur Finanzierung Ihres Bauvorhabens Selbsthilfeleistungen erbringen?
            </Form.Label>
          </div>
          <div className="d-flex gap-3 ms-5">
            <Form.Check
              inline
              type="radio"
              label="Ja"
              name="willProvideSelfHelp"
              checked={data.willProvideSelfHelp === true}
              onChange={() => onChange({ ...data, willProvideSelfHelp: true })}
              className="custom-radio"
              disabled={isReadOnly}
            />
            <Form.Check
              inline
              type="radio"
              label="Nein"
              name="willProvideSelfHelp"
              checked={data.willProvideSelfHelp === false}
              onChange={() => onChange({ ...data, willProvideSelfHelp: false })}
              className="custom-radio"
              disabled={isReadOnly}
            />
          </div>
        </div>
        {validateField('willProvideSelfHelp') && (
          <div className="text-danger mt-1">{getFieldErrorMessage('willProvideSelfHelp')}</div>
        )}
        
        {/* Show selbsthilfe-related messages */}
        {(() => {
          const message = getSelbsthilfeMessage();
          if (!message) return null;
          
          const alertClass = message.type === 'error' ? 'alert-danger' : 
                           message.type === 'success' ? 'alert-success' : 'alert-info';
          
          return (
            <div className={`alert ${alertClass} mt-3`} role="alert">
              <div className="d-flex align-items-start">
                <div className="flex-grow-1">
                  {message.message}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Rest of form only shows if providing self help */}
      {data.willProvideSelfHelp === true && (
        <>
          {/* Address Section */}
          <div className="mb-5">
            <div className="d-flex align-items-center gap-2 mb-4">
              <h4 className="mb-0 text-[#000000] font-semibold italic">Adresse des Förderobjekts</h4>
              <OverlayTrigger
                placement="right"
                overlay={renderTooltip("Geben Sie die Adresse des Förderobjekts ein")}
              >
                <Button
                  variant="outline-secondary"
                  className="rounded-circle p-0 d-flex align-items-center justify-content-center"
                  style={{
                    width: '20px',
                    height: '20px',
                    color: '#064497',
                    borderColor: '#D7DAEA',
                    backgroundColor: '#D7DAEA'
                  }}
                >
                  ?
                </Button>
              </OverlayTrigger>
            </div>

            <AddressInput
              value={data.address}
              onChange={(address) => onChange({ ...data, address })}
              isInvalid={{
                street: validateField('address.street'),
                houseNumber: validateField('address.houseNumber'),
                postalCode: validateField('address.postalCode'),
                city: validateField('address.city')
              }}
              errorMessages={{
                street: getFieldErrorMessage('address.street'),
                houseNumber: getFieldErrorMessage('address.houseNumber'),
                postalCode: getFieldErrorMessage('address.postalCode'),
                city: getFieldErrorMessage('address.city')
              }}
              state="NRW"
              disabled={isReadOnly}
            />
          </div>

          {/* Section 1: Cost Breakdown */}
          {renderSectionHeader('1', '1. Aufsetellung Selbsthilfeleistungens')}
          {expandedSection === '1' && (
            <div className="section-content">
              {/* Table Header */}
              <div className="cost-table-header">
                <div className="row g-0">
                  <div className="col-md-4 text-center fw-bold">Art der Arbeiten</div>
                  <div className="col-md-2 text-center fw-bold">Veranschlagte Kosten<br/>Materialkosten</div>
                  <div className="col-md-2 text-center fw-bold">Veranschlagte Kosten<br/>Lohnkosten</div>
                  <div className="col-md-4 text-center fw-bold">Davon werden als<br/>Selbsthilfe erbracht</div>
                </div>
              </div>
            {/* Section 1.1: Building Costs */}
            <div className="cost-section-wrapper">
              <div className="d-flex align-items-center gap-2 mb-3 p-3 pb-0">
                <h4 className="mb-0 text-[#000000] font-semibold italic">1. Kosten des Gebäudes</h4>
                <OverlayTrigger
                  placement="right"
                  overlay={renderTooltip("Kosten für alle Arbeiten am Gebäude selbst")}
                >
                  <Button
                    variant="outline-secondary"
                    className="rounded-circle p-0 d-flex align-items-center justify-content-center"
                    style={{
                      width: '20px',
                      height: '20px',
                      color: '#064497',
                      borderColor: '#D7DAEA',
                      backgroundColor: '#D7DAEA'
                    }}
                  >
                    ?
                  </Button>
                </OverlayTrigger>
              </div>
              {/* Building Costs (1.1 - 1.15) */}
              {JOB_TYPES.filter(jobType => jobType.number.startsWith('1.')).map((jobType) => (
                <div key={jobType.key} className="cost-table-row">
                  <div className="row g-3 align-items-center">
                    <div className="col-md-4">
                      {jobType.isEditable ? (
                        <Form.Floating>
                          <Form.Control
                            type="text"
                            placeholder={jobType.placeholder || "Bezeichnung der Arbeit"}
                            value={data.costBreakdown?.[jobType.key]?.description || ''}
                            onChange={(e) => updateCostEntry(jobType.key, 'description', e.target.value)}
                            disabled={isReadOnly}
                            isInvalid={validateCostField(jobType.key, 'description')}
                          />
                          <label>{jobType.number} {jobType.placeholder || "Bezeichnung der Arbeit"}</label>
                        </Form.Floating>
                      ) : (
                        <div className="job-type-cell">
                          {jobType.label}
                        </div>
                      )}
                    </div>
                    <div className="col-md-2">
                      <CurrencyInput
                        value={data.costBreakdown?.[jobType.key]?.materialkosten || ''}
                        onChange={(value) => updateCostEntry(jobType.key, 'materialkosten', value)}
                        placeholder="Materialkosten"
                        label="Materialkosten"
                        disabled={isReadOnly}
                        isInvalid={validateCostField(jobType.key, 'materialkosten') || validateCostLogic(jobType.key, 'materialkosten')}
                      />
                    </div>
                    <div className="col-md-2">
                      <CurrencyInput
                        value={data.costBreakdown?.[jobType.key]?.lohnkosten || ''}
                        onChange={(value) => updateCostEntry(jobType.key, 'lohnkosten', value)}
                        placeholder="Lohnkosten"
                        label="Lohnkosten"
                        disabled={isReadOnly}
                        isInvalid={validateCostField(jobType.key, 'lohnkosten') || validateCostLogic(jobType.key, 'lohnkosten')}
                      />
                    </div>
                    <div className="col-md-4">
                      <CurrencyInput
                        value={data.costBreakdown?.[jobType.key]?.selbsthilfe || ''}
                        onChange={(value) => updateCostEntry(jobType.key, 'selbsthilfe', value)}
                        placeholder="Selbsthilfe"
                        label="Selbsthilfe"
                        disabled={isReadOnly}
                        isInvalid={validateCostField(jobType.key, 'selbsthilfe')}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

              {/* Section 1.2: Outdoor Facilities */}
              <div className="cost-section-wrapper">
                <div className="d-flex align-items-center gap-2 mb-3 p-3 pb-0">
                  <h4 className="mb-0 text-[#000000] font-semibold italic">2. Außenanlagen</h4>
                  <OverlayTrigger
                    placement="right"
                    overlay={renderTooltip("Kosten für Gartenanlagen und Außenbereiche")}
                  >
                    <Button
                      variant="outline-secondary"
                      className="rounded-circle p-0 d-flex align-items-center justify-content-center"
                      style={{
                        width: '20px',
                        height: '20px',
                        color: '#064497',
                        borderColor: '#D7DAEA',
                        backgroundColor: '#D7DAEA'
                      }}
                    >
                      ?
                    </Button>
                  </OverlayTrigger>
                </div>

                {/* Outdoor Facilities (2.1 - 2.4) */}
                {JOB_TYPES.filter(jobType => jobType.number.startsWith('2.')).map((jobType) => (
                  <div key={jobType.key} className="cost-table-row">
                    <div className="row g-3 align-items-center">
                      <div className="col-md-4">
                        {jobType.isEditable ? (
                          <Form.Floating>
                            <Form.Control
                              type="text"
                              placeholder={jobType.placeholder || "Bezeichnung der Arbeit"}
                              value={data.costBreakdown?.[jobType.key]?.description || ''}
                              onChange={(e) => updateCostEntry(jobType.key, 'description', e.target.value)}
                              disabled={isReadOnly}
                              isInvalid={validateCostField(jobType.key, 'description')}
                            />
                            <label>{jobType.number} {jobType.placeholder || "Bezeichnung der Arbeit"}</label>
                          </Form.Floating>
                        ) : (
                          <div className="job-type-cell">
                            {jobType.label}
                          </div>
                        )}
                      </div>
                      <div className="col-md-2">
                        <CurrencyInput
                          value={data.costBreakdown?.[jobType.key]?.materialkosten || ''}
                          onChange={(value) => updateCostEntry(jobType.key, 'materialkosten', value)}
                          placeholder="Materialkosten"
                          label="Materialkosten"
                          disabled={isReadOnly}
                          isInvalid={validateCostField(jobType.key, 'materialkosten') || validateCostLogic(jobType.key, 'materialkosten')}
                        />
                      </div>
                      <div className="col-md-2">
                        <CurrencyInput
                          value={data.costBreakdown?.[jobType.key]?.lohnkosten || ''}
                          onChange={(value) => updateCostEntry(jobType.key, 'lohnkosten', value)}
                          placeholder="Lohnkosten"
                          label="Lohnkosten"
                          disabled={isReadOnly}
                          isInvalid={validateCostField(jobType.key, 'lohnkosten') || validateCostLogic(jobType.key, 'lohnkosten')}
                        />
                      </div>
                      <div className="col-md-4">
                        <CurrencyInput
                          value={data.costBreakdown?.[jobType.key]?.selbsthilfe || ''}
                          onChange={(value) => updateCostEntry(jobType.key, 'selbsthilfe', value)}
                          placeholder="Selbsthilfe"
                          label="Selbsthilfe"
                          disabled={isReadOnly}
                          isInvalid={validateCostField(jobType.key, 'selbsthilfe')}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Section 1.3: Construction Overhead Costs */}
              <div className="cost-section-wrapper">
                <div className="d-flex align-items-center gap-2 mb-3 p-3 pb-0">
                  <h4 className="mb-0 text-[#000000] font-semibold italic">3. Baunebenkosten</h4>
                  <OverlayTrigger
                    placement="right"
                    overlay={renderTooltip("Kosten für Planung, Verwaltung und sonstige Baunebenkosten")}
                  >
                    <Button
                      variant="outline-secondary"
                      className="rounded-circle p-0 d-flex align-items-center justify-content-center"
                      style={{
                        width: '20px',
                        height: '20px',
                        color: '#064497',
                        borderColor: '#D7DAEA',
                        backgroundColor: '#D7DAEA'
                      }}
                    >
                      ?
                    </Button>
                  </OverlayTrigger>
                </div>

                {/* Construction Overhead Costs (3.1 - 3.4) */}
                {JOB_TYPES.filter(jobType => jobType.number.startsWith('3.')).map((jobType) => (
                  <div key={jobType.key} className="cost-table-row">
                    <div className="row g-3 align-items-center">
                      <div className="col-md-4">
                        {jobType.isEditable ? (
                          <Form.Floating>
                            <Form.Control
                              type="text"
                              placeholder={jobType.placeholder || "Bezeichnung der Arbeit"}
                              value={data.costBreakdown?.[jobType.key]?.description || ''}
                              onChange={(e) => updateCostEntry(jobType.key, 'description', e.target.value)}
                              disabled={isReadOnly}
                              isInvalid={validateCostField(jobType.key, 'description')}
                            />
                            <label>{jobType.number} {jobType.placeholder || "Bezeichnung der Arbeit"}</label>
                          </Form.Floating>
                        ) : (
                          <div className="job-type-cell">
                            {jobType.label}
                          </div>
                        )}
                      </div>
                      <div className="col-md-2">
                        <CurrencyInput
                          value={data.costBreakdown?.[jobType.key]?.materialkosten || ''}
                          onChange={(value) => updateCostEntry(jobType.key, 'materialkosten', value)}
                          placeholder="Materialkosten"
                          label="Materialkosten"
                          disabled={isReadOnly}
                          isInvalid={validateCostField(jobType.key, 'materialkosten') || validateCostLogic(jobType.key, 'materialkosten')}
                        />
                      </div>
                      <div className="col-md-2">
                        <CurrencyInput
                          value={data.costBreakdown?.[jobType.key]?.lohnkosten || ''}
                          onChange={(value) => updateCostEntry(jobType.key, 'lohnkosten', value)}
                          placeholder="Lohnkosten"
                          label="Lohnkosten"
                          disabled={isReadOnly}
                          isInvalid={validateCostField(jobType.key, 'lohnkosten') || validateCostLogic(jobType.key, 'lohnkosten')}
                        />
                      </div>
                      <div className="col-md-4">
                        <CurrencyInput
                          value={data.costBreakdown?.[jobType.key]?.selbsthilfe || ''}
                          onChange={(value) => updateCostEntry(jobType.key, 'selbsthilfe', value)}
                          placeholder="Selbsthilfe"
                          label="Selbsthilfe"
                          disabled={isReadOnly}
                          isInvalid={validateCostField(jobType.key, 'selbsthilfe')}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals Row */}
              <div className="cost-table-total">
                <div className="row g-0">
                  <div className="col-md-4 text-center">
                    <strong>4. Summen</strong>
                  </div>
                  <div className="col-md-2 text-center">
                    <strong>{formatCurrency(data.totals?.totalMaterialkosten || 0)}</strong>
                  </div>
                  <div className="col-md-2 text-center">
                    <strong>{formatCurrency(data.totals?.totalLohnkosten || 0)}</strong>
                  </div>
                  <div className="col-md-4 text-center">
                    <strong>{formatCurrency(data.totals?.totalSelbsthilfe || 0)}</strong>
                  </div>
                </div>
              </div>

              {/* Cost Validation Errors */}
              {getCostValidationErrors().length > 0 && (
                <div className="alert alert-danger mt-3" role="alert">
                  <h6><strong>Bitte korrigieren Sie folgende Fehler in der Kostenaufstellung:</strong></h6>
                  <ul className="mb-0">
                    {getCostValidationErrors().map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Section 2: Helpers */}
          {renderSectionHeader('2', '2. Angaben zu den Helfern')}
          {expandedSection === '2' && (
            <div className="section-content">
                <div className="mb-9" style={{ fontSize: '1rem', color: '#222' }}>
                 Bitte fügen Sie alle Helfer hinzu welche sich unwiderruflich verpflichten an dem vorgenannten Förderobjekt unentgeltlich Leistungen zu erbringen. Von allen Helfern ist eine Unterschrift erforderlich. Jeder Helfer wird eine Anfrage zur digital Unterschrift per mail erhalten, füllen Sie die emai adressen bitte gewissenhaft aus. 
                </div>
              {/* Main Applicant Participation Question */}
              <div className="mb-5">
                <div className="d-flex align-items-center mb-3">
                  <div className="flex-grow-1">
                    <Form.Label>
                      Der Hauptantragsteller (Ich) werde mich an den Selbsthilfeleistungen beteiligen
                    </Form.Label>
                  </div>
                  <div className="d-flex gap-3 ms-5">
                    <Form.Check
                      inline
                      type="radio"
                      label="Ja"
                      name="mainApplicantWillHelp"
                      checked={data.mainApplicantWillHelp === true}
                      onChange={() => onChange({ ...data, mainApplicantWillHelp: true })}
                      className="custom-radio"
                      disabled={isReadOnly}
                    />
                    <Form.Check
                      inline
                      type="radio"
                      label="Nein"
                      name="mainApplicantWillHelp"
                      checked={data.mainApplicantWillHelp === false}
                      onChange={() => onChange({ ...data, mainApplicantWillHelp: false })}
                      className="custom-radio"
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
                {(validateField('mainApplicantWillHelp') === true) && (
                  <div className="text-danger mt-1">{getFieldErrorMessage('mainApplicantWillHelp')}</div>
                )}
              </div>

              {helpers.map((helper: Helper, index: number) => {
                // Only show main applicant if they will help
                if (index === 0 && data.mainApplicantWillHelp !== true) {
                  return null;
                }
                
                return (
                  <div key={helper.id} className="helper-card">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0" style={{ color: '#064497', fontSize: '1rem', fontWeight: '600' }}>
                        {index === 0 ? 'Hauptantragsteller (Sie)' : `Helfer ${index}`}
                      </h5>
                      {index > 0 && !isReadOnly && (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => removeHelper(helper.id)}
                        >
                          Helfer entfernen
                        </Button>
                      )}
                    </div>

                    {/* Name and Surname */}
                    <div className="row g-3 mb-3">
                      <div className="col-md-6">
                        <Form.Floating>
                          <Form.Control
                            type="text"
                            placeholder="Vorname"
                            value={helper.name}
                            onChange={(e) => updateHelper(helper.id, { name: e.target.value })}
                            disabled={isReadOnly}
                            isInvalid={validateHelperField(helper, 'name')}
                          />
                          <label>Vorname</label>
                        </Form.Floating>
                      </div>
                      <div className="col-md-6">
                        <Form.Floating>
                          <Form.Control
                            type="text"
                            placeholder="Nachname"
                            value={helper.surname}
                            onChange={(e) => updateHelper(helper.id, { surname: e.target.value })}
                            disabled={isReadOnly}
                            isInvalid={validateHelperField(helper, 'surname')}
                          />
                          <label>Nachname</label>
                        </Form.Floating>
                      </div>
                    </div>

                    {/* Email and Job Title */}
                    <div className="row g-3 mb-3">
                      <div className="col-md-6">
                        <Form.Floating>
                          <Form.Control
                            type="email"
                            placeholder="E-Mail-Adresse"
                            value={helper.email}
                            onChange={(e) => updateHelper(helper.id, { email: e.target.value })}
                            disabled={isReadOnly}
                            isInvalid={validateHelperField(helper, 'email')}
                          />
                          <label>E-Mail-Adresse</label>
                          {validateHelperField(helper, 'email') && (
                            <Form.Control.Feedback type="invalid">
                              {getHelperEmailErrorMessage(helper, index === 0 ? 'Hauptantragsteller' : `Helfer ${index}`)}
                            </Form.Control.Feedback>
                          )}
                        </Form.Floating>
                      </div>
                      <div className="col-md-6">
                        <Form.Floating>
                          <Form.Control
                            type="text"
                            placeholder="Beruf (z.B. Handwerker, Lehrer, etc.)"
                            value={helper.jobTitle}
                            onChange={(e) => updateHelper(helper.id, { jobTitle: e.target.value })}
                            disabled={isReadOnly}
                            isInvalid={validateHelperField(helper, 'jobTitle')}
                          />
                          <label>Beruf (z.B. Handwerker, Lehrer, etc.)</label>
                        </Form.Floating>
                      </div>
                    </div>

                    {/* Job Numbers Dynamic Dropdown */}
                    <div className="mb-3">
                      <Form.Label style={{ color: '#000000', fontSize: '0.9rem', fontWeight: '600', fontStyle: 'italic' }}>
                        Auszuführende Selbst­hilfeleistungen (von 1.1 bis 3.4):
                      </Form.Label>
                      <div className="row g-2 mb-2">
                        <div className="col-8">
                          <Form.Select
                            value=""
                            onChange={e => {
                              if (e.target.value) {
                                addJobNumber(helper.id, e.target.value);
                              }
                            }}
                            disabled={isReadOnly}
                            style={{ 
                              height: '58px',
                              borderColor: validateHelperField(helper, 'jobNumbers') ? '#dc3545' : ''
                            }}
                          >
                            <option value="">Art der Arbeit auswählen...</option>
                            {JOB_TYPES
                              .filter(jobType => !helper.jobNumbers.includes(jobType.number))
                              .map(jobType => (
                                <option key={jobType.number} value={jobType.number}>
                                  {jobType.label}
                                </option>
                              ))}
                          </Form.Select>
                        </div>
                        <div className="col-4">
                          <Form.Floating>
                            <Form.Control
                              type="number"
                              placeholder="Anzahl der Stunden (Gesamt)"
                              value={helper.hours}
                              onChange={(e) => updateHelper(helper.id, { hours: e.target.value })}
                              disabled={isReadOnly}
                              style={{ height: '58px' }}
                              isInvalid={validateHelperField(helper, 'hours')}
                            />
                            <label>Anzahl der Stunden  (Gesamt)</label>
                          </Form.Floating>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                        {helper.jobNumbers.map(jobNumber => {
                          const jobType = JOB_TYPES.find(jt => jt.number === jobNumber);
                          return (
                            <span key={jobNumber} className="job-chip">
                              {jobType ? jobType.label : jobNumber}
                              {!isReadOnly && (
                                <button 
                                  onClick={() => removeJobNumber(helper.id, jobNumber)} 
                                  className="job-chip-remove"
                                  title="Entfernen"
                                >
                                  ×
                                </button>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Address */}
                    <div className="mb-3">
                      <Form.Label style={{ color: '#000000', fontSize: '0.9rem', fontWeight: '600', fontStyle: 'italic' }}>Adresse:</Form.Label>
                      <AddressInput
                        value={helper.address}
                        onChange={(address) => updateHelperAddress(helper.id, address)}
                        state="NRW"
                        disabled={isReadOnly}
                        isInvalid={{
                          street: validateHelperField(helper, 'address.street'),
                          houseNumber: validateHelperField(helper, 'address.houseNumber'),
                          postalCode: validateHelperField(helper, 'address.postalCode'),
                          city: validateHelperField(helper, 'address.city')
                        }}
                        errorMessages={{
                          street: validateHelperField(helper, 'address.street') ? 'Straße ist erforderlich' : undefined,
                          houseNumber: validateHelperField(helper, 'address.houseNumber') ? 'Hausnummer ist erforderlich' : undefined,
                          postalCode: validateHelperField(helper, 'address.postalCode') ? 
                            (!helper.address.postalCode?.trim() ? 'Postleitzahl ist erforderlich' : 'Die Postleitzahl muss aus genau 5 Ziffern bestehen') : undefined,
                          city: validateHelperField(helper, 'address.city') ? 'Ort ist erforderlich' : undefined
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Add Helper Button */}
              {!isReadOnly && helpers.length < 7 && (
                <Button
                  variant="outline-primary"
                  className="add-person-btn mt-3"
                  onClick={addHelper}
                >
                  + Helfer hinzufügen
                </Button>
              )}

              {/* Helper Validation Errors */}
              {getHelperValidationErrors().length > 0 && (
                <div className="alert alert-danger mt-3" role="alert">
                  <h6><strong>Bitte korrigieren Sie folgende Fehler bei den Helfern:</strong></h6>
                  <ul className="mb-0">
                    {getHelperValidationErrors().map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Form>
  );
};

export default SelbsthilfeForm; 