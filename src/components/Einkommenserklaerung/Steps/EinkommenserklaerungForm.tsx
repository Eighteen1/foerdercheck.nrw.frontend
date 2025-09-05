import React, { useEffect, useState } from 'react';
import { Form, Button, OverlayTrigger, Tooltip, Modal, Row, Col } from 'react-bootstrap';
import AddressInput from '../../common/AddressInput';
import CurrencyInput from '../../common/CurrencyInput';
import WeitereEinkuenfteMultiSelect from '../../common/WeitereEinkuenfteMultiSelect';
import GeneralDatePicker from '../../common/GeneralDatePicker';

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
`;

interface Props {
  data: any;
  onChange: (data: any) => void;
  isMainApplicant: boolean;
  showValidation: boolean;
  sonderzuwendungenFieldErrors?: any;
  isReadOnly?: boolean;
}

const renderTooltip = (text: string) => (
  <Tooltip id="button-tooltip">
    {text}
  </Tooltip>
);

// Add label and tooltip mapping for income types
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
const typeTooltips: Record<string, string> = {
  renten: 'Brutto-Einkommen aus Alters-, Erwerbsunfähigkeits-, Berufsunfähigkeitsrenten, Renten an Witwen, Witwer und Waisen, Betriebs-/Werksrenten, Zusatzversorgung',
  vermietung: 'Brutto-Einkünfte aus Vermietung und Verpachtung von Immobilien oder Grundstücken.',
  gewerbe: 'Brutto-Gewinne aus selbstständiger Tätigkeit oder Gewerbebetrieb.',
  landforst: 'Brutto-Gewinne aus Land- und Forstwirtschaft.',
  sonstige: 'Sonstige Einkünfte gemäß § 22 EStG sowie Unterhaltsvorschuss.',
  unterhaltsteuerfrei: 'Steuerfreie Unterhaltsleistungen.',
  unterhaltsteuerpflichtig: 'Brutto-Steuerpflichtige Unterhaltsleistungen.',
  ausland: 'Brutto-Einkünfte aus ausländischen Quellen.',
  pauschal: 'Vom Arbeitgeber pauschal besteuerter Arbeitslohn (z. B. Minijob).',
  arbeitslosengeld: 'Brutto-Leistungen wie Arbeitslosengeld, ggf. Zeitraum angeben.',
};

// Add below typeTooltips:
const additionalChangeTypeLabels: Record<string, string> = {
  // Will be used for display in the modal and section
  werbungskosten: 'Werbungskosten',
  kinderbetreuungskosten: 'Kinderbetreuungskosten',
  unterhaltszahlungen: 'Unterhaltszahlungen',
  // All types from typeLabels are already covered
};

const EinkommenserklaerungForm: React.FC<Props> = ({ 
  data, 
  onChange, 
  isMainApplicant,
  showValidation = false,
  sonderzuwendungenFieldErrors,
  isReadOnly = false
}) => {
  // Add state for expanded section
  const [expandedSection, setExpandedSection] = useState<string>('');

    // Date validation helper functions
    const isValidFutureDate = (date: string): boolean => {
      if (!date) return false;
    
      const inputDate = new Date(date);
      const now = new Date();
    
      // Calculate 12 months (1 year) in the past and future from today
      const minDate = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
      const maxDate = new Date(now.getFullYear(), now.getMonth() + 12, now.getDate());
    
      return inputDate >= minDate && inputDate <= maxDate;
    };

  const getDateValidationError = (date: string): string => {
    if (!date) return 'Bitte geben Sie das Datum an.';
    if (!isValidFutureDate(date)) {
      return 'Das Datum darf weder mehr als 12 Monate in der Vergangenheit noch mehr als 12 Monate in der Zukunft liegen';
    }
    return '';
  };

  // Employment date validation helper functions
  const isValidEmploymentStartDate = (date: string): boolean => {
    if (!date) return false;
    
    const inputDate = new Date(date);
    const now = new Date();
    const minDate = new Date(now.getFullYear() - 100, now.getMonth(), now.getDate());
    
    return inputDate <= now && inputDate >= minDate;
  };

  const isValidContractEndDate = (date: string): boolean => {
    if (!date) return false;
    
    const inputDate = new Date(date);
    const now = new Date();
    const minDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const maxDate = new Date(now.getFullYear() + 100, now.getMonth(), now.getDate());
    
    return inputDate >= minDate && inputDate <= maxDate;
  };

  const getEmploymentStartDateValidationError = (date: string): string => {
    if (!date) return 'Bitte geben Sie das Datum an.';
    if (!isValidEmploymentStartDate(date)) {
      return 'Bitte geben Sie ein valides Datum an.';
    }
    return '';
  };

  const getContractEndDateValidationError = (date: string): string => {
    if (!date) return 'Bitte geben Sie das Datum an.';
    if (!isValidContractEndDate(date)) {
      return 'Bitte geben Sie ein valides Datum an.';
    }
    return '';
  };
  // Function to toggle section
  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? '' : section);
  };

  const validateField = (fieldName: string): boolean => {
    if (!showValidation) return false;

    switch (fieldName) {
      case 'title':
        return !data.title;
      case 'firstName':
        return !data.firstName;
      case 'lastName':
        return !data.lastName;
      case 'street':
        return !data.street;
      case 'houseNumber':
        return !data.houseNumber;
      case 'postalCode':
        return !data.postalCode || !/^\d{5}$/.test(data.postalCode);
      case 'city':
        return !data.city;
      case 'incomeYear':
        return data.hasEmploymentIncome && !data.incomeYear;
      case 'incomeYearAmount':
        return data.hasEmploymentIncome && !data.incomeYearAmount;
      case 'incomeEndMonth':
        return data.hasEmploymentIncome && !data.incomeEndMonth;
      case 'incomeEndYear':
        return data.hasEmploymentIncome && !data.incomeEndYear;
      default:
        return false;
    }
  };

  const getFieldErrorMessage = (fieldName: string): string | undefined => {
    if (!showValidation) return undefined;

    switch (fieldName) {
      case 'title':
        return !data.title ? 'Titel ist erforderlich' : undefined;
      case 'firstName':
        return !data.firstName ? 'Vorname ist erforderlich' : undefined;
      case 'lastName':
        return !data.lastName ? 'Name ist erforderlich' : undefined;
      case 'street':
        return !data.street ? 'Straße ist erforderlich' : undefined;
      case 'houseNumber':
        return !data.houseNumber ? 'Hausnummer ist erforderlich' : undefined;
      case 'postalCode':
        if (!data.postalCode) return 'Postleitzahl ist erforderlich';
        if (!/^\d{5}$/.test(data.postalCode)) return 'Die Postleitzahl muss aus genau 5 Ziffern bestehen';
        return undefined;
      case 'city':
        return !data.city ? 'Ort ist erforderlich' : undefined;
      case 'incomeYear':
        return data.hasEmploymentIncome && !data.incomeYear ? 'Jahr für steuerpflichtige Einkünfte ist erforderlich' : undefined;
      case 'incomeYearAmount':
        return data.hasEmploymentIncome && !data.incomeYearAmount ? 'Jahresbetrag für steuerpflichtige Einkünfte ist erforderlich' : undefined;
      case 'incomeEndMonth':
        return data.hasEmploymentIncome && !data.incomeEndMonth ? 'Letzter Monat ist erforderlich' : undefined;
      case 'incomeEndYear':
        return data.hasEmploymentIncome && !data.incomeEndYear ? 'Jahr für letzter Monat ist erforderlich' : undefined;
      default:
        return undefined;
    }
  };

  // Preset letzter Monat and Jahr to last full month on initial render
  useEffect(() => {
    if (data.incomeEndMonth === undefined || data.incomeEndMonth === '' || data.incomeEndYear === undefined || data.incomeEndYear === '') {
      const now = new Date();
      let month = now.getMonth() - 1; // last full month (0-based)
      let year = now.getFullYear();
      if (month < 0) {
        month = 11;
        year -= 1;
      }
      onChange({
        ...data,
        incomeEndMonth: month.toString(),
        incomeEndYear: year.toString(),
      });
    }
  }, []); // only run on mount

  // Auto-set monthly/yearly values for types that have restrictions
  useEffect(() => {
    if (data.additionalIncomeChanges?.changes) {
      let hasChanges = false;
      const newChanges = { ...data.additionalIncomeChanges.changes };
      
      Object.keys(newChanges).forEach(type => {
        const change = newChanges[type];
        const defaultValue = getDefaultValueForType(type);
        
        if ((change.isNewIncomeMonthly === null || change.isNewIncomeMonthly === undefined) && defaultValue !== null) {
          newChanges[type] = {
            ...change,
            isNewIncomeMonthly: defaultValue,
          };
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        onChange({
          ...data,
          additionalIncomeChanges: {
            ...data.additionalIncomeChanges,
            changes: newChanges,
          },
        });
      }
    }
  }, [data.additionalIncomeChanges?.selectedTypes]); // Run when selected types change

  // Helper: Monthly income errors
  const getMonthlyIncomeErrors = () => {
    if (!showValidation || !data.hasEmploymentIncome) return [];
    const errors: string[] = [];
    const endMonth = parseInt(data.incomeEndMonth ?? '');
    const endYear = parseInt(data.incomeEndYear ?? '');
    if (!isNaN(endMonth) && !isNaN(endYear)) {
      for (let i = 11; i >= 0; i--) {
        let monthIdx = endMonth - i;
        let year = endYear;
        if (monthIdx < 0) {
          monthIdx += 12;
          year -= 1;
        }
        const key = `${year}-${monthIdx}`;
        if (!data.monthlyIncome?.[key]) {
          const label = `${['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'][monthIdx]} ${year}`;
          errors.push(`Einkommen für ${label} ist erforderlich`);
        }
      }
    }
    return errors;
  };

  // Helper: Sonderzuwendungen errors (now expects an array of errors for each field)
  const getSonderzuwendungenFieldErrors = (errorsObj: any) => {
    // errorsObj: { vergangen: {weihnachtsgeld: [], urlaubsgeld: [], sonstige: []}, kommend: {...} }
    const allErrors: string[] = [];
    if (!errorsObj) return allErrors;
    ['vergangen', 'kommend'].forEach(period => {
      ['weihnachtsgeld', 'urlaubsgeld', 'sonstige'].forEach(field => {
        if (errorsObj?.[period]?.[field]) {
          allErrors.push(...errorsObj[period][field]);
        }
      });
    });
    return allErrors;
  };

  // Helper: Validate Sonderzuwendungen fields
  const getSonderzuwendungenValidationErrors = () => {
    if (!showValidation || !data.hasEmploymentIncome) return [];
    
    // Don't run internal validation if external errors exist to avoid duplicates
    const externalErrors = getSonderzuwendungenFieldErrors(sonderzuwendungenFieldErrors);
    if (externalErrors.length > 0) return [];
    
    const errors: string[] = [];
    const fields = ['weihnachtsgeld', 'urlaubsgeld', 'sonstige'];
    const periods = ['vergangen', 'kommend'];
    
    periods.forEach(period => {
      fields.forEach(field => {
        const value = data[`sonderzuwendungen${period.charAt(0).toUpperCase() + period.slice(1)}`]?.[field];
        if (!value || value === '') {
          const periodLabel = period === 'vergangen' ? 'vergangenen' : 'kommenden';
          const fieldLabel = field === 'weihnachtsgeld' ? 'Weihnachtsgeld' : 
                           field === 'urlaubsgeld' ? 'Urlaubsgeld' : 'sonstige Leistungen';
          errors.push(`${fieldLabel} für die ${periodLabel} 12 Monate ist erforderlich`);
        }
      });
    });
    
    return errors;
  };

  // Helper: Address errors
  const addressErrors = {
    street: getFieldErrorMessage('street') || '',
    houseNumber: getFieldErrorMessage('houseNumber') || '',
    postalCode: getFieldErrorMessage('postalCode') || '',
    city: getFieldErrorMessage('city') || '',
  };
  const addressInvalid = {
    street: validateField('street'),
    houseNumber: validateField('houseNumber'),
    postalCode: validateField('postalCode'),
    city: validateField('city'),
  };

  const [showChangeTypesModal, setShowChangeTypesModal] = useState(false);
  const [tempSelectedChangeTypes, setTempSelectedChangeTypes] = useState<string[]>([]);

  // Reset tempSelectedChangeTypes when modal opens
  useEffect(() => {
    if (showChangeTypesModal) {
      setTempSelectedChangeTypes(data.additionalIncomeChanges?.selectedTypes || []);
    }
  }, [showChangeTypesModal, data.additionalIncomeChanges?.selectedTypes]);

  // Compute all possible change types
  const weitereTypes = data.weitereEinkuenfte?.selectedTypes || [];
  const costTypes: string[] = [];
  if (data.werbungskosten) costTypes.push('werbungskosten');
  if (data.kinderbetreuungskosten) costTypes.push('kinderbetreuungskosten');
  if (data.unterhaltszahlungen && data.unterhaltszahlungen.length > 0) costTypes.push('unterhaltszahlungen');
  
  // Include existing change types that might have been removed from weitereEinkuenfte
  const existingChangeTypes = Object.keys(data.additionalIncomeChanges?.changes || {});
  
  const allChangeTypes = [...weitereTypes, ...costTypes, ...existingChangeTypes];

  // Remove duplicates
  const uniqueChangeTypes = Array.from(new Set(allChangeTypes));

  // Modal UI
  const renderChangeTypesModal = () => (
    <Modal show={showChangeTypesModal} onHide={() => setShowChangeTypesModal(false)} centered>
      <Modal.Header closeButton>
        <Modal.Title>Änderung auswählen {isMainApplicant ? '(Hauptantragsteller)' : '(Weiterer Antragsteller)'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex flex-column gap-2">
          {uniqueChangeTypes.length === 0 && (
            <div className="text-muted">Keine auswählbaren Felder vorhanden.</div>
          )}
          {uniqueChangeTypes.map(type => (
            <Form.Check
              key={type}
              type="checkbox"
              id={`change-type-${type}`}
              label={typeLabels[type] || additionalChangeTypeLabels[type] || type}
              checked={tempSelectedChangeTypes.includes(type)}
              onChange={e => {
                if (e.target.checked) {
                  setTempSelectedChangeTypes([...tempSelectedChangeTypes, type]);
                } else {
                  setTempSelectedChangeTypes(tempSelectedChangeTypes.filter(t => t !== type));
                }
              }}
            />
          ))}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="primary"
          style={{ backgroundColor: '#064497', border: 'none' }}
          onClick={() => {
            // Remove changes for unselected types
            const newChanges = { ...data.additionalIncomeChanges?.changes };
            Object.keys(newChanges).forEach(type => {
              if (!tempSelectedChangeTypes.includes(type)) {
                delete newChanges[type];
              }
            });
            onChange({
              ...data,
              additionalIncomeChanges: {
                ...data.additionalIncomeChanges,
                selectedTypes: tempSelectedChangeTypes,
                changes: newChanges,
              },
            });
            setShowChangeTypesModal(false);
          }}
        >
          Übernehmen
        </Button>
      </Modal.Footer>
    </Modal>
  );

  // Helper function to render section header
  const renderSectionHeader = (id: string, title: string, tooltip?: string) => (
    <div 
      className="section-header" 
      onClick={() => toggleSection(id)}
      data-section={id}
    >
      <div className="d-flex align-items-center gap-2">
        <h3 className="text-xl font-medium text-[#000000] mb-0">{title}</h3>
        {tooltip && (
          <OverlayTrigger
            placement="right"
            overlay={renderTooltip(tooltip)}
          >
            <Button
              variant="outline-secondary"
              className="rounded-circle p-0 d-flex align-items-center justify-content-center"
              style={{ width: '20px', height: '20px', color: '#064497', borderColor: '#D7DAEA', backgroundColor: '#D7DAEA' }}
              onClick={(e) => e.stopPropagation()}
            >
              ?
            </Button>
          </OverlayTrigger>
        )}
      </div>
      <div className={`expand-icon ${expandedSection === id ? 'expanded' : ''}`}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 10L12 15L17 10" stroke="#064497" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );

  // Calculate Sonderzuwendungen errors
  const externalErrors = getSonderzuwendungenFieldErrors(sonderzuwendungenFieldErrors);
  const validationErrors = getSonderzuwendungenValidationErrors();
  const allSonderzuwendungenErrors = [...externalErrors, ...validationErrors];

  // Helper function to parse German number format (e.g., "1.234,56 €" -> 1234.56)
  const parseGermanNumber = (value: string): number => {
    if (!value) return 0;
    // Remove currency symbol and spaces
    let cleaned = value.replace(/[€\s]/g, '');
    // Remove all dots (thousands separators)
    cleaned = cleaned.replace(/\./g, '');
    // Replace comma with dot for decimal
    cleaned = cleaned.replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  // Helper function to get current value for a given type
  const getCurrentValueForType = (type: string): number => {
    // Handle weitereEinkuenfte types
    if (data.weitereEinkuenfte?.selectedTypes?.includes(type)) {
      const weitereData = (data.weitereEinkuenfte as any)[type];
      if (weitereData?.betrag) {
        return parseGermanNumber(weitereData.betrag);
      }
    }
    
    // Handle cost types
    switch (type) {
      case 'werbungskosten':
        return parseGermanNumber(data.werbungskosten || '0');
      case 'kinderbetreuungskosten':
        return parseGermanNumber(data.kinderbetreuungskosten || '0');
      case 'unterhaltszahlungen':
        if (data.unterhaltszahlungen && data.unterhaltszahlungen.length > 0) {
          return data.unterhaltszahlungen.reduce((sum: number, item: any) => {
            return sum + parseGermanNumber(item.amount || '0');
          }, 0);
        }
        return 0;
      default:
        return 0;
    }
  };

  // Helper function to validate increase/decrease radio button against actual values
  const validateIncreaseDecreaseRadio = (type: string, change: any): string | null => {
    if (typeof change.increase !== 'boolean' || !change.newAmount) {
      return null; // Let other validations handle missing values
    }
    
    // For types that have turnus options, check if the turnus values match
    if (type === 'ausland' || type === 'arbeitslosengeld') {
      const originalTurnus = data.weitereEinkuenfte?.[type]?.turnus;
      const changeTurnus = change.isNewIncomeMonthly === true ? 'monatlich' : change.isNewIncomeMonthly === false ? 'jährlich' : null;
      
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
    
    const currentValue = getCurrentValueForType(type);
    const newValue = parseGermanNumber(change.newAmount);
    
    if (change.increase === true && newValue <= currentValue) {
      return 'Ihr neuer Betrag ist geringer als oder gleich dem alten Betrag.';
    }
    
    if (change.increase === false && newValue >= currentValue) {
      return 'Ihr neuer Betrag ist größer als oder gleich dem alten Betrag.';
    }
    
    return null;
  };

  // Helper function to determine which radio button should be disabled based on type
  const getDisabledRadioOptions = (type: string): { disableMonthly: boolean; disableYearly: boolean } => {
    // Types that should only allow yearly (disable monthly)
    const yearlyOnlyTypes = ['vermietung', 'gewerbe', 'landforst', 'sonstige', 'werbungskosten', 'kinderbetreuungskosten'];
    
    // Types that should only allow monthly (disable yearly)
    const monthlyOnlyTypes = ['renten', 'unterhaltsteuerfrei', 'unterhaltsteuerpflichtig', 'pauschal', 'unterhaltszahlungen'];
    
    // Types that allow both (no restrictions)
    const bothAllowedTypes = ['ausland', 'arbeitslosengeld'];
    
    if (yearlyOnlyTypes.includes(type)) {
      return { disableMonthly: true, disableYearly: false };
    } else if (monthlyOnlyTypes.includes(type)) {
      return { disableMonthly: false, disableYearly: true };
    } else {
      // For bothAllowedTypes or any other type, allow both
      return { disableMonthly: false, disableYearly: false };
    }
  };

  // Helper function to get the appropriate default value for a type when one option is disabled
  const getDefaultValueForType = (type: string): boolean | null => {
    const { disableMonthly, disableYearly } = getDisabledRadioOptions(type);
    
    if (disableMonthly && !disableYearly) {
      return false; // Yearly only
    } else if (disableYearly && !disableMonthly) {
      return true; // Monthly only
    } else {
      return null; // Both options available, no default
    }
  };

  return (
    <Form>
      <style>
        {styles}
      </style>

      {/* Persönliche Angaben Section */}
      {renderSectionHeader('personal', 'Persönliche Angaben')}
      {expandedSection === 'personal' && (
        <div className="section-content">
          {/* Existing personal information content */}
          <div className="mb-4">
            <div className="d-flex align-items-center gap-2 mb-4">
              <h3 className="mb-0 text-[#000000] font-semibold italic" style={{ fontSize: '1rem' }}>Angaben zur Person</h3>
              <OverlayTrigger
                placement="right"
                overlay={renderTooltip("Bitte geben Sie Ihre persönlichen Daten ein. Ihre Angaben aus dem Hauptantrag bzw. der Haushaltsauskunft werden hier übernommen.") }
              >
                <Button
                  variant="outline-secondary"
                  className="rounded-circle p-0 d-flex align-items-center justify-content-center"
                  style={{ width: '20px', height: '20px', color: '#064497', borderColor: '#D7DAEA', backgroundColor: '#D7DAEA' }}
                >
                  ?
                </Button>
              </OverlayTrigger>
            </div>
            {/* Anrede radio buttons row */}
            <div className="mb-3">
              <Form.Check
                inline
                type="radio"
                label="Herr"
                name="title"
                checked={data.title === 'Herr'}
                onChange={() => onChange({ ...data, title: 'Herr' })}
                disabled={isReadOnly}
              />
              <Form.Check
                inline
                type="radio"
                label="Frau"
                name="title"
                checked={data.title === 'Frau'}
                onChange={() => onChange({ ...data, title: 'Frau' })}
                disabled={isReadOnly}
              />
              <Form.Check
                inline
                type="radio"
                label="ohne Anrede"
                name="title"
                checked={data.title === 'ohne Anrede'}
                onChange={() => onChange({ ...data, title: 'ohne Anrede' })}
                disabled={isReadOnly}
              />
              <div style={{ minHeight: 0 }}>
                {validateField('title') && (
                  <div className="text-danger mt-1">{getFieldErrorMessage('title')}</div>
                )}
              </div>
            </div>
            <div className="row g-3">
              <div className="col-md-6">
                <Form.Floating>
                  <Form.Control
                    type="text"
                    placeholder="Vorname"
                    value={data.firstName || ''}
                    onChange={(e) => onChange({ ...data, firstName: e.target.value })}
                    isInvalid={validateField('firstName')}
                    disabled={isReadOnly}
                  />
                  <label>Vorname</label>
                  <Form.Control.Feedback type="invalid">
                    {getFieldErrorMessage('firstName')}
                  </Form.Control.Feedback>
                </Form.Floating>
              </div>
              <div className="col-md-6">
                <Form.Floating>
                  <Form.Control
                    type="text"
                    placeholder="Name"
                    value={data.lastName || ''}
                    onChange={(e) => onChange({ ...data, lastName: e.target.value })}
                    isInvalid={validateField('lastName')}
                    disabled={isReadOnly}
                  />
                  <label>Name</label>
                  <Form.Control.Feedback type="invalid">
                    {getFieldErrorMessage('lastName')}
                  </Form.Control.Feedback>
                </Form.Floating>
              </div>
            </div>
          </div>

          {/* Address Section */}
          <div className="mb-4">
            <div className="d-flex align-items-center gap-2 mb-4">
              <h3 className="mb-0 text-[#000000] font-semibold italic" style={{ fontSize: '1rem' }}>Adresse</h3>
              <OverlayTrigger
                placement="right"
                overlay={renderTooltip("Bitte geben Sie Ihre vollständige Adresse ein. Die Adresse bezieht sich auf ihren aktuellen Wohnsitz nicht zwangsläufig auf die Adresse des Förderobjekts.")}
              >
                <Button
                  variant="outline-secondary"
                  className="rounded-circle p-0 d-flex align-items-center justify-content-center"
                  style={{ width: '20px', height: '20px', color: '#064497', borderColor: '#D7DAEA', backgroundColor: '#D7DAEA' }}
                >
                  ?
                </Button>
              </OverlayTrigger>
            </div>
            <AddressInput
              value={{
                street: data.street || '',
                houseNumber: data.houseNumber || '',
                postalCode: data.postalCode || '',
                city: data.city || ''
              }}
              onChange={(address) => {
                onChange({
                  ...data,
                  street: address.street,
                  houseNumber: address.houseNumber,
                  postalCode: address.postalCode,
                  city: address.city
                });
              }}
              isInvalid={{
                street: validateField('street'),
                houseNumber: validateField('houseNumber'),
                postalCode: validateField('postalCode'),
                city: validateField('city')
              }}
              errorMessages={{
                street: getFieldErrorMessage('street'),
                houseNumber: getFieldErrorMessage('houseNumber'),
                postalCode: getFieldErrorMessage('postalCode'),
                city: getFieldErrorMessage('city')
              }}
              state="NRW"
              disabled={isReadOnly}
            />
          </div>
        </div>
      )}

      {/* Einkommensangaben Section */}
      {renderSectionHeader('income', 'Einkommensangaben')}
      {expandedSection === 'income' && (
        <div className="section-content">
          {/* Existing income information content */}
          <div className="mb-4">
            <div className="d-flex align-items-center mb-3">
              <div className="flex-grow-1">
                <Form.Label>
                  Erzielen Sie Einkünfte aus nichtselbstständiger Arbeit/Versorgungsbezüge?
                </Form.Label>
              </div>
              <div className="d-flex gap-3">
                <Form.Check
                  inline
                  type="radio"
                  label="Ja"
                  name="hasEmploymentIncome"
                  checked={data.hasEmploymentIncome === true}
                  onChange={() => onChange({ ...data, hasEmploymentIncome: true })}
                  className="custom-radio"
                  disabled={isReadOnly}
                />
                <Form.Check
                  inline
                  type="radio"
                  label="Nein"
                  name="hasEmploymentIncome"
                  checked={data.hasEmploymentIncome === false}
                  onChange={() => onChange({ ...data, hasEmploymentIncome: false })}
                  className="custom-radio"
                  disabled={isReadOnly}
                />
              </div>
            </div>
            {showValidation && (data.hasEmploymentIncome === null || data.hasEmploymentIncome === undefined) && (
              <div className="text-danger mt-1">Bitte geben Sie an, ob Sie Einkünfte aus nichtselbstständiger Arbeit/Versorgungsbezüge erzielen</div>
            )}

            {data.hasEmploymentIncome === true && (
              <div className="mt-4">
                {/* Steuerpflichtige Einkünfte im Kalenderjahr vor Antragstellung */}
                <div className="mb-3">
                  <div className="d-flex align-items-center gap-2 mb-4">
                    <h3 className="mb-0 text-[#000000] font-semibold italic">Steuerpflichtige Einkünfte im Kalenderjahr vor Antragstellung (inklusive Sonderzuwendungen)</h3>
                    <OverlayTrigger
                      placement="right"
                      overlay={renderTooltip("Wählen Sie das Jahr und geben Sie den Jahresbetrag an. Der Betrag bezeiht sich auf das Brutto-Jahreseinkommen aus nicht selbstständiger Arbeit/Versorgungsbezügen inklusive aller Sonderzuwendungen wie Weihnachtsgeld, Urlaubsgeld etc. Damit der Betrag gewertet werden kann, muss das Jahr dem letzten Kalenderjahr vor Antragstellung ensprechen.") }
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
                  <div className="row g-3">
                    <div className="col-md-6">
                      <Form.Floating>
                        <Form.Select
                          value={data.incomeYear || ''}
                          onChange={(e) => onChange({ ...data, incomeYear: e.target.value })}
                          isInvalid={validateField('incomeYear')}
                          disabled={isReadOnly}
                        >
                          <option value="">Jahr wählen</option>
                          {[2025, 2024, 2023, 2022, 2021, 2020].map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </Form.Select>
                        <label>Jahr</label>
                        <Form.Control.Feedback type="invalid">
                          {getFieldErrorMessage('incomeYear')}
                        </Form.Control.Feedback>
                      </Form.Floating>
                    </div>
                    <div className="col-md-6">
                      <CurrencyInput
                        value={data.incomeYearAmount || ''}
                        onChange={(value) => onChange({ ...data, incomeYearAmount: value })}
                        isInvalid={validateField('incomeYearAmount')}
                        placeholder="Jahresbetrag"
                        label="Jahresbetrag"
                        disabled={isReadOnly}
                      />
                      {validateField('incomeYearAmount') && (
                        <div className="text-danger mt-1">{getFieldErrorMessage('incomeYearAmount')}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Einkünfte der letzten 12 Monate */}
                <div className="mb-3 mt-4">
                  <div className="d-flex align-items-center gap-2 mb-4">
                    <h3 className="mb-0 text-[#000000] font-semibold italic">Einkünfte der letzten 12 Monate (ohne Sonderzuwendungen und steuerfreie Einnahmen)</h3>
                    <OverlayTrigger
                      placement="right"
                      overlay={renderTooltip("Wählen Sie den letzten vergangenen Monat des Betrachtungszeitraums. Die 12 Monate werden automatisch generiert. Wenn Sie den Antrag beispielsweise am 15. September stellen, wählen Sie August als letzten Monat. Geben Sie bitte ihr Brutto-Einkommen aus nicht selbstständiger Arbeit/Versorgungsbezügen für jeden Monat des Betrachtungszeitraums ein (exklusive Sonderzuwendungen).") }
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
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <Form.Floating>
                        <Form.Select
                          value={data.incomeEndMonth || ''}
                          onChange={(e) => onChange({ ...data, incomeEndMonth: e.target.value })}
                          isInvalid={validateField('incomeEndMonth')}
                          disabled={isReadOnly}
                        >
                          <option value="">Monat wählen</option>
                          {[
                            'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
                            'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
                          ].map((m, idx) => (
                            <option key={m} value={idx}>{m}</option>
                          ))}
                        </Form.Select>
                        <label>Letzter Monat</label>
                        <Form.Control.Feedback type="invalid">
                          {getFieldErrorMessage('incomeEndMonth')}
                        </Form.Control.Feedback>
                      </Form.Floating>
                    </div>
                    <div className="col-md-6">
                      <Form.Floating>
                        <Form.Select
                          value={data.incomeEndYear || ''}
                          onChange={(e) => onChange({ ...data, incomeEndYear: e.target.value })}
                          isInvalid={validateField('incomeEndYear')}
                          disabled={isReadOnly}
                        >
                          <option value="">Jahr wählen</option>
                          {[2025, 2024, 2023, 2022, 2021, 2020].map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </Form.Select>
                        <label>Jahr</label>
                        <Form.Control.Feedback type="invalid">
                          {getFieldErrorMessage('incomeEndYear')}
                        </Form.Control.Feedback>
                      </Form.Floating>
                    </div>
                  </div>
                  {/* 12 months income fields */}
                  <div className="row g-2">
                    <div className="col-12">
                      <div className="d-flex flex-column gap-2">
                        {(() => {
                          const months = [
                            'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
                            'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
                          ];
                          const endMonth = parseInt(data.incomeEndMonth ?? '');
                          const endYear = parseInt(data.incomeEndYear ?? '');
                          if (isNaN(endMonth) || isNaN(endYear)) return null;
                          const fields = [];
                          for (let i = 11; i >= 0; i--) {
                            let monthIdx = endMonth - i;
                            let year = endYear;
                            if (monthIdx < 0) {
                              monthIdx += 12;
                              year -= 1;
                            }
                            const label = `${months[monthIdx]} ${year}`;
                            const key = `${year}-${monthIdx}`;
                            fields.push(
                              <div className="row g-3" key={key}>
                                <div className="col-md-6 d-flex align-items-center">
                                  <Form.Floating style={{ width: '100%' }}>
                                    <Form.Control
                                      type="text"
                                      placeholder="Monat"
                                      value={label}
                                      disabled
                                    />
                                    <label>Monat</label>
                                  </Form.Floating>
                                </div>
                                <div className="col-md-6">
                                  <CurrencyInput
                                    value={data.monthlyIncome?.[key] || ''}
                                    onChange={(val) => {
                                      onChange({
                                        ...data,
                                        monthlyIncome: {
                                          ...(data.monthlyIncome || {}),
                                          [key]: val
                                        }
                                      });
                                    }}
                                    placeholder="Einkommen"
                                    label="Einkommen"
                                    disabled={isReadOnly}
                                  />
                                </div>
                              </div>
                            );
                          }
                          return fields;
                        })()}
                      </div>
                    </div>
                  </div>
                  {/* Bundled error for monthly income */}
                  {getMonthlyIncomeErrors().length > 0 && (
                    <div className="alert alert-danger mt-3" role="alert">
                      {getMonthlyIncomeErrors().map((err, idx) => (
                        <div key={idx}>{err}</div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Sonderzuwendungen section */}
                <div className="mb-9 mt-9">
                  <div className="d-flex align-items-center gap-2 mb-4">
                    <h3 className="mt-0 text-[#000000] font-semibold italic">Steuerpflichtige Sonderzuwendungen</h3>
                    <OverlayTrigger
                      placement="right"
                      overlay={renderTooltip("Tragen Sie hier die Brutto Beträge der Sonderzahlungen wie Weihnachtsgeld, Urlaubsgeld oder sonstige Leistungen ein, welche Sie neben ihrem Lohn/Gehalt von ihrem Arbeitgeber erhalten. Jeweils für die vergangenen und kommenden 12 Monate.")}
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
                   <div className="row g-3 align-items-end mb-2">
                    <div className="col-md-4"></div>
                    <div className="col-md-4 fw-regular text-start">Vergangene 12 Monate</div>
                    <div className="col-md-4 fw-regular text-start">Kommende 12 Monate</div>
                  </div> 
                  {/* Weihnachtsgeld */}
                  <div className="row g-3 align-items-end mb-2">
                    <div className="col-md-4 fw-medium text-black">
                      <div 
                        style={{ 
                          width: '100%',
                          height: '58px',
                          boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)',
                          backgroundColor: '#f8f9fa',
                          borderRadius: '0.375rem',
                          padding: '1rem 0.75rem',
                          color: '#000000',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        Weihnachtsgeld
                      </div>
                    </div>
                    <div className="col-md-4">
                      <CurrencyInput
                        value={data.sonderzuwendungenVergangen?.weihnachtsgeld || ''}
                        onChange={(val) => onChange({
                          ...data,
                          sonderzuwendungenVergangen: {
                            ...(data.sonderzuwendungenVergangen || {}),
                            weihnachtsgeld: val
                          }
                        })}
                        placeholder="Betrag"
                        label="Betrag"
                        disabled={isReadOnly}
                      />
                    </div>
                    <div className="col-md-4">
                      <CurrencyInput
                        value={data.sonderzuwendungenKommend?.weihnachtsgeld || ''}
                        onChange={(val) => onChange({
                          ...data,
                          sonderzuwendungenKommend: {
                            ...(data.sonderzuwendungenKommend || {}),
                            weihnachtsgeld: val
                          }
                        })}
                        placeholder="Betrag"
                        label="Betrag"
                        disabled={isReadOnly}
                      />
                    </div>
                  </div>
                  {/* Urlaubsgeld */}
                  <div className="row g-3 align-items-end mb-2">
                  <div className="col-md-4 fw-medium text-black">
                      <div 
                        style={{ 
                          width: '100%',
                          height: '58px',
                          boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)',
                          backgroundColor: '#f8f9fa',
                          borderRadius: '0.375rem',
                          padding: '1rem 0.75rem',
                          color: '#000000',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        Urlaubsgeld
                      </div>
                    </div>
                    <div className="col-md-4">
                      <CurrencyInput
                        value={data.sonderzuwendungenVergangen?.urlaubsgeld || ''}
                        onChange={(val) => onChange({
                          ...data,
                          sonderzuwendungenVergangen: {
                            ...(data.sonderzuwendungenVergangen || {}),
                            urlaubsgeld: val
                          }
                        })}
                        placeholder="Betrag"
                        label="Betrag"
                        disabled={isReadOnly}
                      />
                    </div>
                    <div className="col-md-4">
                      <CurrencyInput
                        value={data.sonderzuwendungenKommend?.urlaubsgeld || ''}
                        onChange={(val) => onChange({
                          ...data,
                          sonderzuwendungenKommend: {
                            ...(data.sonderzuwendungenKommend || {}),
                            urlaubsgeld: val
                          }
                        })}
                        placeholder="Betrag"
                        label="Betrag"
                        disabled={isReadOnly}
                      />
                    </div>
                  </div>
                  {/* sonstige Leistungen */}
                  <div className="row g-3 align-items-end mb-2">
                  <div className="col-md-4 fw-medium text-black">
                      <div 
                        style={{ 
                          width: '100%',
                          height: '58px',
                          boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)',
                          backgroundColor: '#f8f9fa',
                          borderRadius: '0.375rem',
                          padding: '1rem 0.75rem',
                          color: '#000000',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        sonstige Leistungen
                      </div>
                    </div>
                    <div className="col-md-4">
                      <CurrencyInput
                        value={data.sonderzuwendungenVergangen?.sonstige || ''}
                        onChange={(val) => onChange({
                          ...data,
                          sonderzuwendungenVergangen: {
                            ...(data.sonderzuwendungenVergangen || {}),
                            sonstige: val
                          }
                        })}
                        placeholder="Betrag"
                        label="Betrag"
                        disabled={isReadOnly}
                      />
                    </div>
                    <div className="col-md-4">
                      <CurrencyInput
                        value={data.sonderzuwendungenKommend?.sonstige || ''}
                        onChange={(val) => onChange({
                          ...data,
                          sonderzuwendungenKommend: {
                            ...(data.sonderzuwendungenKommend || {}),
                            sonstige: val
                          }
                        })}
                        placeholder="Betrag"
                        label="Betrag"
                        disabled={isReadOnly}
                      />
                    </div>
                  </div>
                  {/* Bundled error for Sonderzuwendungen (if needed) */}
                  {allSonderzuwendungenErrors.length > 0 && (
                    <div className="alert alert-danger mt-3" role="alert">
                      {allSonderzuwendungenErrors.map((err, idx) => (
                        <div key={idx}>{err}</div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Änderung der Einkünfte */}
                <div className="mb-4">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <h3 className="mb-0 text-[#000000] font-semibold italic">Änderung der Einkünfte</h3>
                    <OverlayTrigger
                      placement="right"
                      overlay={renderTooltip("Geben Sie an, ob sich Ihr Einkommen in den nächsten bzw. den letzten 12 Monaten ändert/geändert hat. Falls ja, machen Sie bitte genaue Angaben.")}
                    >
                      <Button
                        variant="outline-secondary"
                        className="rounded-circle p-0 d-flex align-items-center justify-content-center"
                        style={{ width: '20px', height: '20px', color: '#064497', borderColor: '#D7DAEA', backgroundColor: '#D7DAEA' }}
                      >
                        ?
                      </Button>
                    </OverlayTrigger>
                  </div>
                  <div className="d-flex align-items-center mb-3">
                    <div className="flex-grow-1">
                      <Form.Label>
                        Bei den vorstehend aufgeführten Einkünften haben sich unbefristete Veränderungen
                        ergeben beziehungsweise werden sich in den nächsten zwölf Monaten mit Sicherheit
                        unbefristete Veränderungen ergeben
                      </Form.Label>
                    </div>
                    <div className="d-flex gap-3 ms-5">
                      <Form.Check
                        inline
                        type="radio"
                        label="Ja"
                        name="willChangeIncome"
                        checked={data.willChangeIncome === true}
                        onChange={() => onChange({ ...data, willChangeIncome: true })}
                        className="custom-radio"
                        disabled={isReadOnly}
                      />
                      <Form.Check
                        inline
                        type="radio"
                        label="Nein"
                        name="willChangeIncome"
                        checked={data.willChangeIncome === false}
                        onChange={() => onChange({ ...data, willChangeIncome: false })}
                        className="custom-radio"
                        disabled={isReadOnly}
                      />
                    </div>
                  </div>
                  {showValidation && (data.willChangeIncome === null || data.willChangeIncome === undefined) && (
                    <div className="text-danger mt-1">Bitte geben Sie an, ob sich Ihr Einkommen ändern wird.</div>
                  )}
                  {data.willChangeIncome === true && (
                    <>
                      <div className="row g-3 mb-3">
                        <div className="col-md-6">
                          <GeneralDatePicker
                            value={data.incomeChangeDate || ''}
                            onChange={(date) => onChange({ ...data, incomeChangeDate: date })}
                            label="Datum der Änderung"
                            isInvalid={showValidation && (!data.incomeChangeDate || !isValidFutureDate(data.incomeChangeDate))}
                            disabled={isReadOnly}
                            minDate={new Date(new Date().getFullYear() -1, new Date().getMonth(), new Date().getDate())}
                            maxDate={new Date(new Date().getFullYear() + 2, new Date().getMonth(), new Date().getDate())}
                          />
                          {showValidation && getDateValidationError(data.incomeChangeDate) && (
                            <div className="text-danger mt-1">
                              {getDateValidationError(data.incomeChangeDate)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mb-3 d-flex align-items-center">
                        <div className="flex-grow-1">
                          <Form.Label className="mb-0">Wird sich Ihr Einkommen erhöhen oder verringern?</Form.Label>
                        </div>
                        <div className="d-flex gap-3 ms-5">
                          <Form.Check
                            inline
                            type="radio"
                            label="Erhöhen"
                            name="willChangeIncrease"
                            checked={data.willChangeIncrease === true}
                            onChange={() => onChange({ ...data, willChangeIncrease: true })}
                            disabled={isReadOnly}
                          />
                          <Form.Check
                            inline
                            type="radio"
                            label="Verringern"
                            name="willChangeIncrease"
                            checked={data.willChangeIncrease === false}
                            onChange={() => onChange({ ...data, willChangeIncrease: false })}
                            disabled={isReadOnly}
                          />
                        </div>
                      </div>
                      {showValidation && (data.willChangeIncrease === null || data.willChangeIncrease === undefined) && (
                        <div className="text-danger mt-1 mb-3">Bitte geben Sie an, ob sich ihr Einkommen erhöht oder verringert.</div>
                      )}
                      <div className="row g-3 mb-3 align-items-end">
                        <div className="col-md-6">
                          <CurrencyInput
                            value={data.newIncome || ''}
                            onChange={val => onChange({ ...data, newIncome: val })}
                            placeholder="Neuer Betrag pro Monat/Jahr"
                            label="Neuer Betrag pro Monat/Jahr"
                            isInvalid={showValidation && !data.newIncome}
                            disabled={isReadOnly}
                          />
                          {showValidation && !data.newIncome && (
                            <div className="text-danger mt-1">Bitte geben Sie den neuen Betrag an.</div>
                          )}
                        </div>
                      </div>
                      <div className="mb-3 d-flex align-items-center">
                        <div className="flex-grow-1">
                          <Form.Label className="mb-0">Zeitraum für den neuen Betrag auswählen:</Form.Label>
                        </div>
                        <div className="d-flex gap-3 ms-5">
                          <Form.Check
                            inline
                            type="radio"
                            label="pro Monat"
                            name="isNewIncomeMonthly"
                            checked={data.isNewIncomeMonthly === true}
                            onChange={() => onChange({ ...data, isNewIncomeMonthly: true })}
                            disabled={isReadOnly}
                          />
                          <Form.Check
                            inline
                            type="radio"
                            label="pro Jahr"
                            name="isNewIncomeMonthly"
                            checked={data.isNewIncomeMonthly === false}
                            onChange={() => onChange({ ...data, isNewIncomeMonthly: false })}
                            disabled={isReadOnly}
                          />
                        </div>
                      </div>
                      {showValidation && (data.isNewIncomeMonthly === null || data.isNewIncomeMonthly === undefined) && (
                        <div className="text-danger mt-1 mb-3">Bitte geben Sie an, ob der neue Betrag monatlich oder jährlich ist.</div>
                      )}
                      <div className="mb-3">
                        <Form.Floating>
                          <Form.Control
                            as="textarea"
                            style={{ minHeight: 80 }}
                            placeholder="Begründung"
                            value={data.newIncomeReason || ''}
                            onChange={e => onChange({ ...data, newIncomeReason: e.target.value })}
                            isInvalid={showValidation && !data.newIncomeReason}
                            disabled={isReadOnly}
                          />
                          <label>Begründung</label>
                          <Form.Control.Feedback type="invalid">
                            Bitte geben Sie eine Begründung für die Einkommensänderung an.
                          </Form.Control.Feedback>
                        </Form.Floating>
                      </div>
                    </>
                  )}
                </div>

                {/* Beschäftigungsverhältnisse */}
                <div className="mb-4 mt-3">
                  <div className="d-flex align-items-center gap-2 mb-4">
                    <h3 className="mb-0 text-[#000000] font-semibold italic">Beschäftigungsverhältnisse</h3>
                    <OverlayTrigger
                      placement="right"
                      overlay={renderTooltip("Geben Sie den Beginn Ihrer Beschäftigung und die Art des Vertrags an.")}
                    >
                      <Button
                        variant="outline-secondary"
                        className="rounded-circle p-0 d-flex align-items-center justify-content-center"
                        style={{ width: '20px', height: '20px', color: '#064497', borderColor: '#D7DAEA', backgroundColor: '#D7DAEA' }}
                      >
                        ?
                      </Button>
                    </OverlayTrigger>
                  </div>
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <GeneralDatePicker
                        value={data.startEmployment || ''}
                        onChange={(date) => onChange({ ...data, startEmployment: date })}
                        label="Beschäftigt seit"
                        isInvalid={showValidation && (!data.startEmployment || !isValidEmploymentStartDate(data.startEmployment))}
                        disabled={isReadOnly}
                        minDate={new Date(new Date().getFullYear() - 110, new Date().getMonth(), new Date().getDate())}
                        maxDate={new Date()}
                      />
                      {showValidation && getEmploymentStartDateValidationError(data.startEmployment) && (
                        <div className="text-danger mt-1">
                          {getEmploymentStartDateValidationError(data.startEmployment)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mb-1 d-flex align-items-center">
                    <div className="flex-grow-1">
                      <Form.Label className="mb-0">Ist Ihr Arbeitsvertrag befristet oder unbefristet?</Form.Label>
                    </div>
                    <div className="d-flex gap-3 ms-5">
                      <Form.Check
                        inline
                        type="radio"
                        label="unbefristet"
                        name="isContractLimited"
                        checked={data.isContractLimited === false}
                        onChange={() => onChange({ ...data, isContractLimited: false, endOfContract: '' })}
                        disabled={isReadOnly}
                      />
                      <Form.Check
                        inline
                        type="radio"
                        label="befristet bis"
                        name="isContractLimited"
                        checked={data.isContractLimited === true}
                        onChange={() => onChange({ ...data, isContractLimited: true })}
                        disabled={isReadOnly}
                      />
                    </div>
                  </div>
                  {showValidation && (data.isContractLimited === null || data.isContractLimited === undefined) && (
                    <div className="text-danger mt-3">Bitte geben Sie an, ob Ihr Vertrag befristet oder unbefristet ist.</div>
                  )}
                  {data.isContractLimited === true && (
                    <div className="row g-3 mt-2">
                      <div className="col-md-6">
                        <GeneralDatePicker
                          value={data.endOfContract || ''}
                          onChange={(date) => onChange({ ...data, endOfContract: date })}
                          label="Vertragsende"
                          isInvalid={showValidation && (!data.endOfContract || !isValidContractEndDate(data.endOfContract))}
                          disabled={isReadOnly}
                          minDate={new Date(new Date().getFullYear() - 2, new Date().getMonth(), new Date().getDate())}
                          maxDate={new Date(new Date().getFullYear() + 120, new Date().getMonth(), new Date().getDate())}
                        />
                        {showValidation && getContractEndDateValidationError(data.endOfContract) && (
                          <div className="text-danger mt-1">
                            {getContractEndDateValidationError(data.endOfContract)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Weitere Einkünfte Section */}
      {renderSectionHeader('additional-income', 'Weitere Einkünfte')}
      {expandedSection === 'additional-income' && (
        <div className="section-content">
          {/* Existing additional income content */}
          <div className="mb-4">
            <div className="d-flex align-items-start gap-4">
              <div className="text-black flex-grow-1 mb-4" style={{ fontSize: '1rem', maxWidth: '80%' }}>
                Klicken Sie auf ‚+ Weitere Einkünfte hinzufügen‘, um zusätzliche Einnahmen anzugeben, z. B. aus selbständiger Tätigkeit oder Rentenbezügen.
              </div>
              {!isReadOnly && (
                <div className="flex-shrink-0">
                  <WeitereEinkuenfteMultiSelect
                    options={[
                      { value: 'renten', label: 'Renten' },
                      { value: 'vermietung', label: 'Einkünfte aus Vermietung und Verpachtung' },
                      { value: 'gewerbe', label: 'Einkünfte aus Gewerbebetrieb/selbstständiger Arbeit' },
                      { value: 'landforst', label: 'Einkünfte aus Land- und Forstwirtschaft' },
                      { value: 'sonstige', label: 'Sonstige Einkünfte' },
                      { value: 'unterhaltsteuerfrei', label: 'Unterhaltsleistungen steuerfrei' },
                      { value: 'unterhaltsteuerpflichtig', label: 'Unterhaltsleistungen steuerpflichtig' },
                      { value: 'ausland', label: 'Ausländische Einkünfte' },
                      { value: 'pauschal', label: 'Vom Arbeitgeber pauschal besteuerter Arbeitslohn' },
                      { value: 'arbeitslosengeld', label: 'Arbeitslosengeld' },
                    ]}
                    value={data.weitereEinkuenfte?.selectedTypes || []}
                    onChange={selected => {
                      // Get the currently selected types
                      const currentSelectedTypes = data.weitereEinkuenfte?.selectedTypes || [];
                      
                      // Find types that were removed
                      const removedTypes = currentSelectedTypes.filter((type: string) => !selected.includes(type));
                      
                      // Clean up additional income changes for removed types
                      const newChanges = { ...data.additionalIncomeChanges?.changes };
                      removedTypes.forEach((type: string) => {
                        delete newChanges[type];
                      });
                      
                      // Update selected types in additional income changes
                      const currentChangeTypes = data.additionalIncomeChanges?.selectedTypes || [];
                      const newSelectedChangeTypes = currentChangeTypes.filter((type: string) => !removedTypes.includes(type));
                      
                      onChange({
                        ...data,
                        weitereEinkuenfte: {
                          ...data.weitereEinkuenfte,
                          selectedTypes: selected
                        },
                        additionalIncomeChanges: {
                          ...data.additionalIncomeChanges,
                          selectedTypes: newSelectedChangeTypes,
                          changes: newChanges
                        }
                      });
                    }}
                    placeholder="+ Weitere Einkünfte hinzufügen"
                    disabled={isReadOnly}
                  />
                </div>
              )}
            </div>
          </div>
          {/* Render dynamic fields for each selected type */}
          <div className="d-flex flex-column gap-4">
            {(data.weitereEinkuenfte?.selectedTypes || []).map((type: string) => (
              <div className="bg-white" key={type}>
                <div className="d-flex align-items-center gap-2 mb-4">
                  <h3 className="mb-0 text-[#000000] font-semibold italic">{typeLabels[type]}</h3>
                  <OverlayTrigger
                    placement="right"
                    overlay={<Tooltip>{typeTooltips[type]}</Tooltip>}
                  >
                    <Button
                      variant="outline-secondary"
                      className="rounded-circle p-0 d-flex align-items-center justify-content-center"
                      style={{ width: '20px', height: '20px', color: '#064497', borderColor: '#D7DAEA', backgroundColor: '#D7DAEA' }}
                    >
                      ?
                    </Button>
                  </OverlayTrigger>
                </div>
                {/* Fields for this type */}
                {(() => {
                  switch (type) {
                    case 'renten':
                      return <>
                        <CurrencyInput
                          value={data.weitereEinkuenfte?.renten?.betrag || ''}
                          onChange={val => onChange({
                            ...data,
                            weitereEinkuenfte: {
                              ...data.weitereEinkuenfte,
                              renten: { betrag: val, turnus: 'monatlich' }
                            }
                          })}
                          placeholder="Betrag monatlich"
                          label="Renten (monatlich)"
                          isInvalid={showValidation && data.weitereEinkuenfte?.selectedTypes?.includes('renten') && !data.weitereEinkuenfte?.renten?.betrag}
                          disabled={isReadOnly}
                        />
                        {showValidation && data.weitereEinkuenfte?.selectedTypes?.includes('renten') && !data.weitereEinkuenfte?.renten?.betrag && (
                          <div className="text-danger mt-1">Betrag für Renten ist erforderlich</div>
                        )}
                      </>;
                    case 'vermietung':
                      return <>
                        <Form.Floating className="mb-2">
                          <Form.Select
                            value={data.weitereEinkuenfte?.vermietung?.jahr || ''}
                            onChange={e => onChange({
                              ...data,
                              weitereEinkuenfte: {
                                ...data.weitereEinkuenfte,
                                vermietung: {
                                  ...data.weitereEinkuenfte?.vermietung,
                                  jahr: e.target.value
                                }
                              }
                            })}
                            isInvalid={showValidation && data.weitereEinkuenfte?.selectedTypes?.includes('vermietung') && !data.weitereEinkuenfte?.vermietung?.jahr}
                            disabled={isReadOnly}
                          >
                            <option value="">Jahr wählen</option>
                            {[2025, 2024, 2023, 2022, 2021, 2020].map(y => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </Form.Select>
                          <label>Jahr</label>
                          <Form.Control.Feedback type="invalid">
                            Jahr ist erforderlich
                          </Form.Control.Feedback>
                        </Form.Floating>
                        <CurrencyInput
                          value={data.weitereEinkuenfte?.vermietung?.betrag || ''}
                          onChange={val => onChange({
                            ...data,
                            weitereEinkuenfte: {
                              ...data.weitereEinkuenfte,
                              vermietung: {
                                ...data.weitereEinkuenfte?.vermietung,
                                betrag: val
                              }
                            }
                          })}
                          placeholder="Betrag jährlich"
                          label="Vermietung/Verpachtung (jährlich)"
                          isInvalid={showValidation && data.weitereEinkuenfte?.selectedTypes?.includes('vermietung') && !data.weitereEinkuenfte?.vermietung?.betrag}
                          disabled={isReadOnly}
                        />
                        {showValidation && data.weitereEinkuenfte?.selectedTypes?.includes('vermietung') && (!data.weitereEinkuenfte?.vermietung?.jahr || !data.weitereEinkuenfte?.vermietung?.betrag) && (
                          <div className="text-danger mt-1">Jahr und Betrag für Vermietung/Verpachtung sind erforderlich</div>
                        )}
                      </>;
                    case 'gewerbe':
                      return <>
                        <Form.Floating className="mb-2">
                          <Form.Select
                            value={data.weitereEinkuenfte?.gewerbe?.jahr || ''}
                            onChange={e => onChange({
                              ...data,
                              weitereEinkuenfte: {
                                ...data.weitereEinkuenfte,
                                gewerbe: {
                                  ...data.weitereEinkuenfte?.gewerbe,
                                  jahr: e.target.value
                                }
                              }
                            })}
                            isInvalid={showValidation && data.weitereEinkuenfte?.selectedTypes?.includes('gewerbe') && !data.weitereEinkuenfte?.gewerbe?.jahr}
                            disabled={isReadOnly}
                          >
                            <option value="">Jahr wählen</option>
                            {[2025, 2024, 2023, 2022, 2021, 2020].map(y => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </Form.Select>
                          <label>Jahr</label>
                          <Form.Control.Feedback type="invalid">
                            Jahr ist erforderlich
                          </Form.Control.Feedback>
                        </Form.Floating>
                        <CurrencyInput
                          value={data.weitereEinkuenfte?.gewerbe?.betrag || ''}
                          onChange={val => onChange({
                            ...data,
                            weitereEinkuenfte: {
                              ...data.weitereEinkuenfte,
                              gewerbe: {
                                ...data.weitereEinkuenfte?.gewerbe,
                                betrag: val
                              }
                            }
                          })}
                          placeholder="Betrag jährlich"
                          label="Gewerbebetrieb/selbstständige Arbeit (jährlich)"
                          isInvalid={showValidation && data.weitereEinkuenfte?.selectedTypes?.includes('gewerbe') && !data.weitereEinkuenfte?.gewerbe?.betrag}
                          disabled={isReadOnly}
                        />
                        {showValidation && data.weitereEinkuenfte?.selectedTypes?.includes('gewerbe') && (!data.weitereEinkuenfte?.gewerbe?.jahr || !data.weitereEinkuenfte?.gewerbe?.betrag) && (
                          <div className="text-danger mt-1">Jahr und Betrag für Gewerbebetrieb/selbstständige Arbeit sind erforderlich</div>
                        )}
                      </>;
                    case 'landforst':
                      return <>
                        <Form.Floating className="mb-2">
                          <Form.Select
                            value={data.weitereEinkuenfte?.landforst?.jahr || ''}
                            onChange={e => onChange({
                              ...data,
                              weitereEinkuenfte: {
                                ...data.weitereEinkuenfte,
                                landforst: {
                                  ...data.weitereEinkuenfte?.landforst,
                                  jahr: e.target.value
                                }
                              }
                            })}
                            isInvalid={showValidation && data.weitereEinkuenfte?.selectedTypes?.includes('landforst') && !data.weitereEinkuenfte?.landforst?.jahr}
                            disabled={isReadOnly}
                          >
                            <option value="">Jahr wählen</option>
                            {[2025, 2024, 2023, 2022, 2021, 2020].map(y => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </Form.Select>
                          <label>Jahr</label>
                          <Form.Control.Feedback type="invalid">
                            Jahr ist erforderlich
                          </Form.Control.Feedback>
                        </Form.Floating>
                        <CurrencyInput
                          value={data.weitereEinkuenfte?.landforst?.betrag || ''}
                          onChange={val => onChange({
                            ...data,
                            weitereEinkuenfte: {
                              ...data.weitereEinkuenfte,
                              landforst: {
                                ...data.weitereEinkuenfte?.landforst,
                                betrag: val
                              }
                            }
                          })}
                          placeholder="Betrag jährlich"
                          label="Land- und Forstwirtschaft (jährlich)"
                          isInvalid={showValidation && data.weitereEinkuenfte?.selectedTypes?.includes('landforst') && !data.weitereEinkuenfte?.landforst?.betrag}
                          disabled={isReadOnly}
                        />
                        {showValidation && data.weitereEinkuenfte?.selectedTypes?.includes('landforst') && (!data.weitereEinkuenfte?.landforst?.jahr || !data.weitereEinkuenfte?.landforst?.betrag) && (
                          <div className="text-danger mt-1">Jahr und Betrag für Land- und Forstwirtschaft sind erforderlich</div>
                        )}
                      </>;
                    case 'sonstige':
                      return <>
                        <Form.Floating className="mb-2">
                          <Form.Select
                            value={data.weitereEinkuenfte?.sonstige?.jahr || ''}
                            onChange={e => onChange({
                              ...data,
                              weitereEinkuenfte: {
                                ...data.weitereEinkuenfte,
                                sonstige: {
                                  ...data.weitereEinkuenfte?.sonstige,
                                  jahr: e.target.value
                                }
                              }
                            })}
                            isInvalid={showValidation && data.weitereEinkuenfte?.selectedTypes?.includes('sonstige') && !data.weitereEinkuenfte?.sonstige?.jahr}
                            disabled={isReadOnly}
                          >
                            <option value="">Jahr wählen</option>
                            {[2025, 2024, 2023, 2022, 2021, 2020].map(y => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </Form.Select>
                          <label>Jahr</label>
                          <Form.Control.Feedback type="invalid">
                            Jahr ist erforderlich
                          </Form.Control.Feedback>
                        </Form.Floating>
                        <CurrencyInput
                          value={data.weitereEinkuenfte?.sonstige?.betrag || ''}
                          onChange={val => onChange({
                            ...data,
                            weitereEinkuenfte: {
                              ...data.weitereEinkuenfte,
                              sonstige: {
                                ...data.weitereEinkuenfte?.sonstige,
                                betrag: val
                              }
                            }
                          })}
                          placeholder="Betrag jährlich"
                          label="Sonstige Einkünfte (jährlich)"
                          isInvalid={showValidation && data.weitereEinkuenfte?.selectedTypes?.includes('sonstige') && !data.weitereEinkuenfte?.sonstige?.betrag}
                          disabled={isReadOnly}
                        />
                        {showValidation && data.weitereEinkuenfte?.selectedTypes?.includes('sonstige') && (!data.weitereEinkuenfte?.sonstige?.jahr || !data.weitereEinkuenfte?.sonstige?.betrag) && (
                          <div className="text-danger mt-1">Jahr und Betrag für Sonstige Einkünfte sind erforderlich</div>
                        )}
                      </>;
                    case 'unterhaltsteuerfrei':
                      return <>
                        <CurrencyInput
                          value={data.weitereEinkuenfte?.unterhaltsteuerfrei?.betrag || ''}
                          onChange={val => onChange({
                            ...data,
                            weitereEinkuenfte: {
                              ...data.weitereEinkuenfte,
                              unterhaltsteuerfrei: { betrag: val }
                            }
                          })}
                          placeholder="Betrag monatlich"
                          label="Unterhaltsleistungen steuerfrei (monatlich)"
                          isInvalid={showValidation && data.weitereEinkuenfte?.selectedTypes?.includes('unterhaltsteuerfrei') && !data.weitereEinkuenfte?.unterhaltsteuerfrei?.betrag}
                          disabled={isReadOnly}
                        />
                        {showValidation && data.weitereEinkuenfte?.selectedTypes?.includes('unterhaltsteuerfrei') && !data.weitereEinkuenfte?.unterhaltsteuerfrei?.betrag && (
                          <div className="text-danger mt-1">Betrag für Unterhaltsleistungen steuerfrei ist erforderlich</div>
                        )}
                      </>;
                    case 'unterhaltsteuerpflichtig':
                      return <>
                        <CurrencyInput
                          value={data.weitereEinkuenfte?.unterhaltsteuerpflichtig?.betrag || ''}
                          onChange={val => onChange({
                            ...data,
                            weitereEinkuenfte: {
                              ...data.weitereEinkuenfte,
                              unterhaltsteuerpflichtig: { betrag: val }
                            }
                          })}
                          placeholder="Betrag monatlich"
                          label="Unterhaltsleistungen steuerpflichtig (monatlich)"
                          isInvalid={showValidation && data.weitereEinkuenfte?.selectedTypes?.includes('unterhaltsteuerpflichtig') && !data.weitereEinkuenfte?.unterhaltsteuerpflichtig?.betrag}
                          disabled={isReadOnly}
                        />
                        {showValidation && data.weitereEinkuenfte?.selectedTypes?.includes('unterhaltsteuerpflichtig') && !data.weitereEinkuenfte?.unterhaltsteuerpflichtig?.betrag && (
                          <div className="text-danger mt-1">Betrag für Unterhaltsleistungen steuerpflichtig ist erforderlich</div>
                        )}
                      </>;
                    case 'ausland':
                      return (
                        <>
                          <CurrencyInput
                            value={data.weitereEinkuenfte?.ausland?.betrag || ''}
                            onChange={val => onChange({
                              ...data,
                              weitereEinkuenfte: {
                                ...data.weitereEinkuenfte,
                                ausland: {
                                  ...data.weitereEinkuenfte?.ausland,
                                  betrag: val
                                }
                              }
                            })}
                            placeholder="Betrag"
                            label="Ausländische Einkünfte"
                            isInvalid={showValidation && data.weitereEinkuenfte?.selectedTypes?.includes('ausland') && !data.weitereEinkuenfte?.ausland?.betrag}
                            disabled={isReadOnly}
                          />
                          <div className="d-flex gap-2 mt-2">
                            <Form.Check
                              type="radio"
                              label="monatlich"
                              name={`ausland-turnus-${type}`}
                              checked={data.weitereEinkuenfte?.ausland?.turnus === 'monatlich'}
                              onChange={() => onChange({
                                ...data,
                                weitereEinkuenfte: {
                                  ...data.weitereEinkuenfte,
                                  ausland: {
                                    ...data.weitereEinkuenfte?.ausland,
                                    turnus: 'monatlich',
                                    jahr: '' // clear year if switching to monatlich
                                  }
                                }
                              })}
                              disabled={isReadOnly}
                            />
                            <Form.Check
                              type="radio"
                              label="jährlich"
                              name={`ausland-turnus-${type}`}
                              checked={data.weitereEinkuenfte?.ausland?.turnus === 'jährlich'}
                              onChange={() => onChange({
                                ...data,
                                weitereEinkuenfte: {
                                  ...data.weitereEinkuenfte,
                                  ausland: {
                                    ...data.weitereEinkuenfte?.ausland,
                                    turnus: 'jährlich'
                                  }
                                }
                              })}
                              disabled={isReadOnly}
                            />
                          </div>
                          {data.weitereEinkuenfte?.ausland?.turnus === 'jährlich' && (
                            <Form.Floating className="mb-2 mt-2">
                              <Form.Select
                                value={data.weitereEinkuenfte?.ausland?.jahr || ''}
                                onChange={e => onChange({
                                  ...data,
                                  weitereEinkuenfte: {
                                    ...data.weitereEinkuenfte,
                                    ausland: {
                                      ...data.weitereEinkuenfte?.ausland,
                                      jahr: e.target.value
                                    }
                                  }
                                })}
                                isInvalid={showValidation && data.weitereEinkuenfte?.selectedTypes?.includes('ausland') && !data.weitereEinkuenfte?.ausland?.jahr}
                                disabled={isReadOnly}
                              >
                                <option value="">Jahr wählen</option>
                                {[2025, 2024, 2023, 2022, 2021, 2020].map(y => (
                                  <option key={y} value={y}>{y}</option>
                                ))}
                              </Form.Select>
                              <label>Jahr</label>
                              <Form.Control.Feedback type="invalid">
                                Jahr ist erforderlich
                              </Form.Control.Feedback>
                            </Form.Floating>
                          )}
                          {showValidation && data.weitereEinkuenfte?.selectedTypes?.includes('ausland') && (
                            (data.weitereEinkuenfte?.ausland?.turnus === 'jährlich'
                              ? (!data.weitereEinkuenfte?.ausland?.jahr || !data.weitereEinkuenfte?.ausland?.betrag || !data.weitereEinkuenfte?.ausland?.turnus)
                              : (!data.weitereEinkuenfte?.ausland?.betrag || !data.weitereEinkuenfte?.ausland?.turnus)
                            ) && (
                            <div className="text-danger mt-1">
                              {data.weitereEinkuenfte?.ausland?.turnus === 'jährlich'
                                ? 'Jahr, Betrag und Zeitraum für Ausländische Einkünfte sind erforderlich'
                                : 'Betrag und Zeitraum für Ausländische Einkünfte sind erforderlich'}
                            </div>
                          ))}
                        </>
                      );
                    case 'pauschal':
                      return <>
                        <CurrencyInput
                          value={data.weitereEinkuenfte?.pauschal?.betrag || ''}
                          onChange={val => onChange({
                            ...data,
                            weitereEinkuenfte: {
                              ...data.weitereEinkuenfte,
                              pauschal: { betrag: val, turnus: 'monatlich' }
                            }
                          })}
                          placeholder="Betrag monatlich"
                          label="Pauschal besteuerter Arbeitslohn (monatlich)"
                          isInvalid={showValidation && data.weitereEinkuenfte?.selectedTypes?.includes('pauschal') && !data.weitereEinkuenfte?.pauschal?.betrag}
                          disabled={isReadOnly}
                        />
                        {showValidation && data.weitereEinkuenfte?.selectedTypes?.includes('pauschal') && !data.weitereEinkuenfte?.pauschal?.betrag && (
                          <div className="text-danger mt-1">Betrag für pauschal besteuerten Arbeitslohn ist erforderlich</div>
                        )}
                      </>;
                    case 'arbeitslosengeld':
                      return <>
                        <CurrencyInput
                          value={data.weitereEinkuenfte?.arbeitslosengeld?.betrag || ''}
                          onChange={val => onChange({
                            ...data,
                            weitereEinkuenfte: {
                              ...data.weitereEinkuenfte,
                              arbeitslosengeld: {
                                ...data.weitereEinkuenfte?.arbeitslosengeld,
                                betrag: val
                              }
                            }
                          })}
                          placeholder="Betrag"
                          label="Arbeitslosengeld"
                          isInvalid={showValidation && data.weitereEinkuenfte?.selectedTypes?.includes('arbeitslosengeld') && !data.weitereEinkuenfte?.arbeitslosengeld?.betrag}
                          disabled={isReadOnly}
                        />
                        <div className="d-flex gap-2 mt-2">
                          <Form.Check
                            type="radio"
                            label="täglich"
                            name={`arbeitslosengeld-turnus-${type}`}
                            checked={data.weitereEinkuenfte?.arbeitslosengeld?.turnus === 'täglich'}
                            onChange={() => onChange({
                              ...data,
                              weitereEinkuenfte: {
                                ...data.weitereEinkuenfte,
                                arbeitslosengeld: {
                                  ...data.weitereEinkuenfte?.arbeitslosengeld,
                                  turnus: 'täglich'
                                }
                              }
                            })}
                            disabled={isReadOnly}
                          />
                          <Form.Check
                            type="radio"
                            label="monatlich"
                            name={`arbeitslosengeld-turnus-${type}`}
                            checked={data.weitereEinkuenfte?.arbeitslosengeld?.turnus === 'monatlich'}
                            onChange={() => onChange({
                              ...data,
                              weitereEinkuenfte: {
                                ...data.weitereEinkuenfte,
                                arbeitslosengeld: {
                                  ...data.weitereEinkuenfte?.arbeitslosengeld,
                                  turnus: 'monatlich'
                                }
                              }
                            })}
                            disabled={isReadOnly}
                          />
                          <Form.Check
                            type="radio"
                            label="jährlich"
                            name={`arbeitslosengeld-turnus-${type}`}
                            checked={data.weitereEinkuenfte?.arbeitslosengeld?.turnus === 'jährlich'}
                            onChange={() => onChange({
                              ...data,
                              weitereEinkuenfte: {
                                ...data.weitereEinkuenfte,
                                arbeitslosengeld: {
                                  ...data.weitereEinkuenfte?.arbeitslosengeld,
                                  turnus: 'jährlich'
                                }
                              }
                            })}
                            disabled={isReadOnly}
                          />
                        </div>
                        {showValidation && data.weitereEinkuenfte?.selectedTypes?.includes('arbeitslosengeld') && (!data.weitereEinkuenfte?.arbeitslosengeld?.betrag || !data.weitereEinkuenfte?.arbeitslosengeld?.turnus) && (
                          <div className="text-danger mt-1">Betrag und Zeitraum für Arbeitslosengeld sind erforderlich</div>
                        )}
                      </>;
                    default:
                      return null;
                  }
                })()}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kosten, Zahlungen, und Abgaben Section */}
      {renderSectionHeader('costs', 'Kosten, Zahlungen, und Abgaben')}
      {expandedSection === 'costs' && (
        <div className="section-content">
          {/* Existing costs content */}
          <div className="mb-4">
            {/* Werbungskosten */}
            {data.hasEmploymentIncome && (
              <div className="mb-4">
                <div className="d-flex align-items-center gap-2 mb-4">
                  <h3 className="mb-0 text-[#000000] font-semibold italic">Werbungskosten</h3>
                  <OverlayTrigger
                    placement="right"
                    overlay={renderTooltip("Geben Sie hier Ihre Werbungskosten an, die im Zusammenhang mit Ihrer Erwerbstätigkeit stehen. Vergessen Sie nicht entsprechende Nachweise unter „Dokumente Hochladen“ (Schritt 4) einzureichen.")}
                  >
                    <Button
                      variant="outline-secondary"
                      className="rounded-circle p-0 d-flex align-items-center justify-content-center"
                      style={{ width: '20px', height: '20px', color: '#064497', borderColor: '#D7DAEA', backgroundColor: '#D7DAEA' }}
                    >
                      ?
                    </Button>
                  </OverlayTrigger>
                </div>
                <CurrencyInput
                  value={data.werbungskosten || ''}
                  onChange={val => onChange({ ...data, werbungskosten: val })}
                  placeholder="Betrag jährlich"
                  label="Werbungskosten (jährlich)"
                  isInvalid={showValidation && data.hasEmploymentIncome && !data.werbungskosten}
                  disabled={isReadOnly}
                />
                {showValidation && data.hasEmploymentIncome && !data.werbungskosten && (
                  <div className="text-danger mt-1">Bitte geben Sie Ihre Werbungskosten an.</div>
                )}
              </div>
            )}

            {/* Kinderbetreuungskosten */}
            <div className="mb-4">
              <div className="d-flex align-items-center gap-2 mb-4">
                <h3 className="mb-0 text-[#000000] font-semibold italic">Kinderbetreuungskosten (falls vorhanden)</h3>
                <OverlayTrigger
                  placement="right"
                  overlay={renderTooltip("Geben Sie hier die Kosten für die Betreuung Ihrer Kinder an. Vergessen Sie nicht entsprechende Nachweise unter „Dokumente Hochladen“ (Schritt 4) einzureichen.")}
                >
                  <Button
                    variant="outline-secondary"
                    className="rounded-circle p-0 d-flex align-items-center justify-content-center"
                    style={{ width: '20px', height: '20px', color: '#064497', borderColor: '#D7DAEA', backgroundColor: '#D7DAEA' }}
                  >
                    ?
                  </Button>
                </OverlayTrigger>
              </div>
              <CurrencyInput
                value={data.kinderbetreuungskosten || ''}
                onChange={val => onChange({ ...data, kinderbetreuungskosten: val })}
                placeholder="Betrag jährlich"
                label="Kinderbetreuungskosten (jährlich)"
                disabled={isReadOnly}
              />
            </div>

            {/* Steuern, Kranken- und Rentenversicherung */}
            <div className="mb-4">
              <div className="d-flex align-items-center gap-2 mb-4">
                <h3 className="mb-0 text-[#000000] font-semibold italic">Steuern, Kranken- und Rentenversicherung</h3>
                <OverlayTrigger
                  placement="right"
                  overlay={renderTooltip("Geben Sie an, ob Sie Steuern und Versicherungsbeiträge zahlen. Für jede der drei Checkboxen wird ein pauschalierter Betrag von 12% von ihrem Brutto-Jahreseinkommen abgezogen.")}
                >
                  <Button
                    variant="outline-secondary"
                    className="rounded-circle p-0 d-flex align-items-center justify-content-center"
                    style={{ width: '20px', height: '20px', color: '#064497', borderColor: '#D7DAEA', backgroundColor: '#D7DAEA' }}
                  >
                    ?
                  </Button>
                </OverlayTrigger>
              </div>
              <div className="d-flex flex-column gap-3">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <Form.Label className="mb-0">Zahlen Sie Einkommens- und Lohnsteuer?</Form.Label>
                  </div>
                  <div className="d-flex gap-3 ms-5">
                    <Form.Check
                      inline
                      type="radio"
                      label="Ja"
                      name="ispayingincometax"
                      checked={data.ispayingincometax === true}
                      onChange={() => onChange({ ...data, ispayingincometax: true })}
                      disabled={isReadOnly}
                    />
                    <Form.Check
                      inline
                      type="radio"
                      label="Nein"
                      name="ispayingincometax"
                      checked={data.ispayingincometax === false}
                      onChange={() => onChange({ ...data, ispayingincometax: false })}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
                {(showValidation && data.ispayingincometax === null || data.ispayingincometax === undefined) && (
                    <div className="text-danger mt-1">Bitte geben Sie an, ob Sie Einkommensteuer zahlen</div>
                  )}
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <Form.Label className="mb-0">Zahlen Sie Beiträge zu einer Krankenversicherung?</Form.Label>
                  </div>
                  <div className="d-flex gap-3 ms-5">
                    <Form.Check
                      inline
                      type="radio"
                      label="Ja"
                      name="ispayinghealthinsurance"
                      checked={data.ispayinghealthinsurance === true}
                      onChange={() => onChange({ ...data, ispayinghealthinsurance: true })}
                      disabled={isReadOnly}
                    />
                    <Form.Check
                      inline
                      type="radio"
                      label="Nein"
                      name="ispayinghealthinsurance"
                      checked={data.ispayinghealthinsurance === false}
                      onChange={() => onChange({ ...data, ispayinghealthinsurance: false })}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
                {(showValidation && data.ispayinghealthinsurance === null || data.ispayinghealthinsurance === undefined) && (
                    <div className="text-danger mt-1">Bitte geben Sie an, ob Sie Krankenversicherung zahlen</div>
                  )}
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <Form.Label className="mb-0">Zahlen Sie Beiträge zur gesetzlichen Rentenversicherung oder zu ähnlichen Einrichtungen mit
                    entsprechender Zweckbindung? </Form.Label>
                  </div>
                  <div className="d-flex gap-3 ms-5">
                    <Form.Check
                      inline
                      type="radio"
                      label="Ja"
                      name="ispayingpension"
                      checked={data.ispayingpension === true}
                      onChange={() => onChange({ ...data, ispayingpension: true })}
                      disabled={isReadOnly}
                    />
                    <Form.Check
                      inline
                      type="radio"
                      label="Nein"
                      name="ispayingpension"
                      checked={data.ispayingpension === false}
                      onChange={() => onChange({ ...data, ispayingpension: false })}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
                {(showValidation && data.ispayingpension === null || data.ispayingpension === undefined) && (
                    <div className="text-danger mt-1">Bitte geben Sie an, ob Sie Rentenversicherung o. Ä. zahlen</div>
                  )}
              </div>
            </div>

            {/* Unterhaltszahlungen */}
            <div className="mb-4">
              <div className="d-flex align-items-center gap-2 mb-4">
                <h3 className="mb-0 text-[#000000] font-semibold italic">Unterhaltszahlungen</h3>
                <OverlayTrigger
                  placement="right"
                  overlay={renderTooltip("Geben Sie an, ob Sie Unterhalt zahlen und an wen.")}
                >
                  <Button
                    variant="outline-secondary"
                    className="rounded-circle p-0 d-flex align-items-center justify-content-center"
                    style={{ width: '20px', height: '20px', color: '#064497', borderColor: '#D7DAEA', backgroundColor: '#D7DAEA' }}
                  >
                    ?
                  </Button>
                </OverlayTrigger>
              </div>
              <div className="d-flex align-items-center mb-3">
                <div className="flex-grow-1">
                  <Form.Label className="mb-0">Erbringen Sie Unterhaltszahlungen im Rahmen einer gesetzlichen Verpflichtung?</Form.Label>
                </div>
                <div className="d-flex gap-3 ms-5">
                  <Form.Check
                    inline
                    type="radio"
                    label="Ja"
                    name="ispayingunterhalt"
                    checked={data.ispayingunterhalt === true}
                    onChange={() => onChange({ 
                      ...data, 
                      ispayingunterhalt: true,
                      unterhaltszahlungen: data.unterhaltszahlungen?.length ? data.unterhaltszahlungen : [{ name: '', amount: '' }]
                    })}
                    disabled={isReadOnly}
                  />
                  <Form.Check
                    inline
                    type="radio"
                    label="Nein"
                    name="ispayingunterhalt"
                    checked={data.ispayingunterhalt === false}
                    onChange={() => onChange({ ...data, ispayingunterhalt: false, unterhaltszahlungen: [] })}
                    disabled={isReadOnly}
                  />
                </div>
              </div>
              {showValidation && (data.ispayingunterhalt === null || data.ispayingunterhalt === undefined) && (
                <div className="text-danger mt-1">Bitte geben Sie an, ob Sie Unterhalt zahlen.</div>
              )}
              {data.ispayingunterhalt === true && (
                <div className="d-flex flex-column gap-3">
                  {(data.unterhaltszahlungen || []).map((zahlung: { name: string; amount: string }, index: number) => (
                    <div key={index} className="mb-1">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="mb-0">Person {index + 1}</h5>
                        {index > 0 && (
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => {
                              const newZahlungen = [...(data.unterhaltszahlungen || [])];
                              newZahlungen.splice(index, 1);
                              onChange({ ...data, unterhaltszahlungen: newZahlungen });
                            }}
                          >
                            Löschen
                          </Button>
                        )}
                      </div>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <Form.Floating>
                            <Form.Control
                              type="text"
                              placeholder="Name"
                              value={zahlung.name || ''}
                              onChange={e => {
                                const newZahlungen = [...(data.unterhaltszahlungen || [])];
                                newZahlungen[index] = { ...zahlung, name: e.target.value };
                                onChange({ ...data, unterhaltszahlungen: newZahlungen });
                              }}
                              isInvalid={showValidation && !zahlung.name}
                              disabled={isReadOnly}
                            />
                            <label>Name des Empfängers</label>
                            <Form.Control.Feedback type="invalid">
                              Name des Empfängers ist erforderlich
                            </Form.Control.Feedback>
                          </Form.Floating>
                        </div>
                        <div className="col-md-6">
                          <CurrencyInput
                            value={zahlung.amount || ''}
                            onChange={val => {
                              const newZahlungen = [...(data.unterhaltszahlungen || [])];
                              newZahlungen[index] = { ...zahlung, amount: val };
                              onChange({ ...data, unterhaltszahlungen: newZahlungen });
                            }}
                            placeholder="Betrag monatlich"
                            label="Unterhaltszahlung (monatlich)"
                            isInvalid={showValidation && !zahlung.amount}
                            disabled={isReadOnly}
                          />
                          {showValidation && !zahlung.amount && (
                            <div className="text-danger mt-1">Betrag ist erforderlich</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="mt-1 d-inline-block">
                    {!isReadOnly && (
                      <Button
                        variant="outline-primary"
                        onClick={() => {
                          const newZahlungen = [...(data.unterhaltszahlungen || []), { name: '', amount: '' }];
                          onChange({ ...data, unterhaltszahlungen: newZahlungen });
                        }}
                        className="add-person-btn"
                        style={{ width: 'auto', minWidth: 0 }}
                      >
                        + Person hinzufügen
                      </Button>
                    )}
                  </div>
                  {showValidation && data.ispayingunterhalt === true && (!data.unterhaltszahlungen || data.unterhaltszahlungen.length === 0) && (
                    <div className="text-danger mt-1">Bitte fügen Sie mindestens eine Person hinzu.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Änderung der weiteren Einkünfte Section */}
      {renderSectionHeader('changes', 'Änderung der weiteren Einkünfte, Kosten und Zahlungen')}
      {expandedSection === 'changes' && (
        <div className="section-content">
          {/* Existing changes content */}
          <div className="mb-4">
            <div className="d-flex align-items-start gap-4">
              <div className="text-black flex-grow-1 mb-4" style={{ fontSize: '1rem', maxWidth: '80%' }}>
               Sollten sich innerhalb der nächsten 12 Monate Änderungen bei den angegebenen weiteren Einkünften, Ausgaben oder Zahlungsverpflichtungen ergeben, machen Sie bitte entsprechende Angaben zu den geplanten Änderungen.
              </div>
              {!isReadOnly && (
                <div className="flex-shrink-0">
                  <Button
                    variant="outline-primary"
                    className="rounded-pill px-4 py-2 mb-2"
                    onClick={() => setShowChangeTypesModal(true)}
                    style={{ minWidth: 260, fontWeight: 500, backgroundColor: '#064497', color: '#fff', borderColor: '#064497', boxShadow: '0 2px 8px rgba(6,68,151,0.08)' }}
                  >
                    + Änderung angeben/entfernen
                  </Button>
                </div>
              )}
            </div>
          </div>
          {/* For each selected type, show the change form */}
          {(data.additionalIncomeChanges?.selectedTypes || []).map((type: string) => {
            const change = data.additionalIncomeChanges?.changes?.[type] || {};
            return (
              <div key={type} className="mb-3 border rounded p-3 bg-light">
                <div className="mb-2 fw-bold">{typeLabels[type] || additionalChangeTypeLabels[type] || type}</div>
                <div className="row g-3 mt-1">
                  <div className="col-md-6">
                    <GeneralDatePicker
                      value={change.date || ''}
                      onChange={(date) => {
                        onChange({
                          ...data,
                          additionalIncomeChanges: {
                            ...data.additionalIncomeChanges,
                            changes: {
                              ...data.additionalIncomeChanges?.changes,
                              [type]: {
                                ...change,
                                date: date,
                              }
                            }
                          }
                        });
                      }}
                      label="Datum der Änderung"
                      isInvalid={showValidation && (!change.date || !isValidFutureDate(change.date))}
                      disabled={isReadOnly}
                      minDate={new Date(new Date().getFullYear() -1, new Date().getMonth(), new Date().getDate())}
                      maxDate={new Date(new Date().getFullYear() + 2, new Date().getMonth(), new Date().getDate())}
                    />
                    {showValidation && getDateValidationError(change.date) && (
                      <div className="text-danger mt-1">
                        {getDateValidationError(change.date)}
                      </div>
                    )}
                  </div>
                  <div className="col-md-6">
                    <CurrencyInput
                      value={change.newAmount || ''}
                      onChange={val => {
                        onChange({
                          ...data,
                          additionalIncomeChanges: {
                            ...data.additionalIncomeChanges,
                            changes: {
                              ...data.additionalIncomeChanges?.changes,
                              [type]: {
                                ...change,
                                newAmount: val,
                              }
                            }
                          }
                        });
                      }}
                      placeholder="Neuer Betrag"
                      label="Neuer Betrag"
                      isInvalid={showValidation && (!change.newAmount)}
                      disabled={isReadOnly}
                    />
                    {showValidation && !change.newAmount && (
                      <div className="text-danger mt-1">Bitte geben Sie den neuen Betrag an.</div>
                    )}
                  </div>
                  {/* Radio button for Erhöhen/Verringern - now full width below the two fields */}
                  <div className="col-12 mt-2">
                    <div className="d-flex align-items-center">
                      <div className="flex-grow-1">
                        <Form.Label className="mb-2 mt-2">Wird sich Ihr Einkommen erhöhen oder verringern?</Form.Label>
                      </div>
                      <div className="d-flex gap-3 ms-5">
                        <Form.Check
                          inline
                          type="radio"
                          label="Erhöhen"
                          name={`increase-${type}`}
                          checked={change.increase === true}
                          onChange={() => {
                            onChange({
                              ...data,
                              additionalIncomeChanges: {
                                ...data.additionalIncomeChanges,
                                changes: {
                                  ...data.additionalIncomeChanges?.changes,
                                  [type]: {
                                    ...change,
                                    increase: true,
                                  }
                                }
                              }
                            });
                          }}
                          disabled={isReadOnly}
                        />
                        <Form.Check
                          inline
                          type="radio"
                          label="Verringern"
                          name={`increase-${type}`}
                          checked={change.increase === false}
                          onChange={() => {
                            onChange({
                              ...data,
                              additionalIncomeChanges: {
                                ...data.additionalIncomeChanges,
                                changes: {
                                  ...data.additionalIncomeChanges?.changes,
                                  [type]: {
                                    ...change,
                                    increase: false,
                                  }
                                }
                              }
                            });
                          }}
                          disabled={isReadOnly}
                        />
                      </div>
                    </div>
                    {showValidation && (typeof change.increase !== 'boolean' || validateIncreaseDecreaseRadio(type, change)) && (
                      <div className="text-danger mt-1">
                        {typeof change.increase !== 'boolean' 
                          ? 'Bitte geben Sie an, ob sich Ihr Einkommen erhöht oder verringert.'
                          : validateIncreaseDecreaseRadio(type, change)
                        }
                      </div>
                    )}
                  </div>
                  {/* Radio button for monthly/yearly - now full width below the increase/decrease question */}
                  <div className="col-12 mt-2">
                    <div className="d-flex align-items-center">
                      <div className="flex-grow-1">
                        <Form.Label className="mb-2 mt-2">Zeitraum für den neuen Betrag auswählen:</Form.Label>
                      </div>
                      <div className="d-flex gap-3 ms-5">
                        {(() => {
                          const { disableMonthly, disableYearly } = getDisabledRadioOptions(type);
                          return (
                            <>
                              <Form.Check
                                inline
                                type="radio"
                                label="pro Monat"
                                name={`isNewIncomeMonthly-${type}`}
                                checked={change.isNewIncomeMonthly === true}
                                onChange={() => {
                                  onChange({
                                    ...data,
                                    additionalIncomeChanges: {
                                      ...data.additionalIncomeChanges,
                                      changes: {
                                        ...data.additionalIncomeChanges?.changes,
                                        [type]: {
                                          ...change,
                                          isNewIncomeMonthly: true,
                                        }
                                      }
                                    }
                                  });
                                }}
                                disabled={isReadOnly || disableMonthly}
                              />
                              <Form.Check
                                inline
                                type="radio"
                                label="pro Jahr"
                                name={`isNewIncomeMonthly-${type}`}
                                checked={change.isNewIncomeMonthly === false}
                                onChange={() => {
                                  onChange({
                                    ...data,
                                    additionalIncomeChanges: {
                                      ...data.additionalIncomeChanges,
                                      changes: {
                                        ...data.additionalIncomeChanges?.changes,
                                        [type]: {
                                          ...change,
                                          isNewIncomeMonthly: false,
                                        }
                                      }
                                    }
                                  });
                                }}
                                disabled={isReadOnly || disableYearly}
                              />
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    {showValidation && (change.isNewIncomeMonthly === null || change.isNewIncomeMonthly === undefined) && (
                      <div className="text-danger mt-1">Bitte geben Sie an, den Zeitraum für den neuen Betrag an.</div>
                    )}
                  </div>
                  {/* Begründung field below, full width */}
                  <div className="col-12 mt-3">
                    <Form.Floating>
                      <Form.Control
                        as="textarea"
                        style={{ minHeight: 60 }}
                        placeholder="Begründung"
                        value={change.reason || ''}
                        onChange={e => {
                          onChange({
                            ...data,
                            additionalIncomeChanges: {
                              ...data.additionalIncomeChanges,
                              changes: {
                                ...data.additionalIncomeChanges?.changes,
                                [type]: {
                                  ...change,
                                  reason: e.target.value,
                                }
                              }
                            }
                          });
                        }}
                        isInvalid={showValidation && (!change.reason)}
                        disabled={isReadOnly}
                      />
                      <label>Begründung</label>
                      <Form.Control.Feedback type="invalid">
                        Bitte geben Sie eine Begründung an.
                      </Form.Control.Feedback>
                    </Form.Floating>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Gesetzliche Angaben Section */}
      {renderSectionHeader('legal', 'Gesetzliche Angaben')}
      {expandedSection === 'legal' && (
        <div className="section-content">
          <div className="mb-12 mt-0">
            <div className="mb-3" style={{ fontSize: '1rem', color: '#222' }}>
              Ich versichere, dass die vorstehenden Erklärungen richtig und vollständig sind. Mir ist bekannt, dass falsche Angaben in dieser Erklärung und in den ergänzenden Unterlagen strafbar sein können. Ich ermächtige das angegebene zuständige Finanzamt Auskunft über meine Einkommensverhältnisse zu erteilen.
            </div>
            <div className="row g-3 mb-2">
              <div className="col-md-6">
                <Form.Floating>
                  <Form.Control
                    type="text"
                    placeholder="Zuständiges Finanzamt"
                    value={data.finanzamt || ''}
                    onChange={e => onChange({ ...data, finanzamt: e.target.value })}
                    isInvalid={showValidation && !data.finanzamt}
                    disabled={isReadOnly}
                  />
                  <label>Zuständiges Finanzamt</label>
                  <Form.Control.Feedback type="invalid">
                    Zuständiges Finanzamt ist erforderlich
                  </Form.Control.Feedback>
                </Form.Floating>
              </div>
              <div className="col-md-6">
                <Form.Floating>
                  <Form.Control
                    type="text"
                    placeholder="Steuer-ID"
                    value={data.steuerid || ''}
                    onChange={e => onChange({ ...data, steuerid: e.target.value })}
                    isInvalid={showValidation && !data.steuerid}
                    disabled={isReadOnly}
                  />
                  <label>Steuer-ID</label>
                  <Form.Control.Feedback type="invalid">
                    Steuer-ID ist erforderlich
                  </Form.Control.Feedback>
                </Form.Floating>
              </div>
            </div>
            <div className="mt-3 mb-1" style={{ fontSize: '0.98rem', color: '#555', fontStyle: 'italic' }}>
            Bei begründeten Zweifeln an der Richtigkeit Ihrer Angaben kann die Bewilligungsbehörde gemäß § 14 Abs. 5 WFNG NRW eine Auskunft von Ihrem Arbeitgeber verlangen. Vor einem Auskunftsersuchen wird Ihnen Gelegenheit zur Stellungnahme gegeben. Bitte beachten Sie, dass Sie bei der Einreichung dieses Antrags um eine digitale Unterschrift gebeten werden.
            </div>
          </div>
        </div>
      )}

      {renderChangeTypesModal()}
    </Form>
  );
};

export default EinkommenserklaerungForm; 