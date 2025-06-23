import React, { useState, useEffect } from 'react';
import { Form, Button, OverlayTrigger, Tooltip, Modal } from 'react-bootstrap';
import CurrencyInput from '../../common/CurrencyInput';
import WeitereEinkuenfteMultiSelect from '../../common/WeitereEinkuenfteMultiSelect';

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

interface WeitereEinkuenfte {
  selectedTypes: string[];
}

interface WeitereEinkuenfte2 {
  selectedTypes: string[];
}

interface MainFinancials {
  id: number;
  title?: string;
  firstName: string;
  lastName: string;
  // Core employment income fields (matching database structure)
  hasSalaryIncome: boolean | null;
  // All Selbstauskunft fields matching database columns
  wheinachtsgeld_next12?: string;
  urlaubsgeld_next12?: string;
  incomeagriculture?: string;
  incomerent?: string;
  hastaxfreeunterhaltincome?: boolean;
  hastaxableunterhaltincome?: boolean;
  incomeunterhalttaxfree?: string;
  incomeunterhalttaxable?: string;
  ispayingincometax?: boolean;
  ispayinghealthinsurance?: boolean;
  ispayingpension?: boolean;
  ispayingunterhalt: boolean | null;
  unterhaltszahlungenTotal?: any;
  _tempUnterhaltszahlungen?: any; // Temporary storage for unterhaltszahlungenTotal data when ispayingunterhalt is false
  hasbusinessincome?: boolean;
  hasagricultureincome?: boolean;
  hasrentincome?: boolean;
  haspensionincome?: boolean;
  hascapitalincome?: boolean;
  monthlynetsalary?: string;
  otheremploymentmonthlynetincome?: any;
  yearlyselfemployednetincome?: string;
  yearlybusinessnetincome?: string;
  yearlycapitalnetincome?: string;
  pensionmonthlynetincome?: any;
  _tempPensionmonthlynetincome?: any; // Temporary storage for pensionmonthlynetincome data when haspensionincome is false
  haskindergeldincome?: boolean;
  monthlykindergeldnetincome?: string;
  haspflegegeldincome?: boolean;
  monthlypflegegeldnetincome?: string;
  haselterngeldincome?: boolean;
  monthlyelterngeldnetincome?: string;
  hasothernetincome?: boolean;
  othermonthlynetincome?: any;
  betragotherinsurancetaxexpenses?: any;
  ispayingloans: boolean | null;
  loans?: any;
  _tempLoans?: any; // Temporary storage for loans data when ispayingloans is false
  ispayingzwischenkredit: boolean | null;
  zwischenkredit?: any;
  _tempZwischenkredit?: any; // Temporary storage for zwischenkredit data when ispayingzwischenkredit is false
  hasotherzahlungsverpflichtung: boolean | null;
  otherzahlungsverpflichtung?: any;
  _tempOtherzahlungsverpflichtung?: any; // Temporary storage for otherzahlungsverpflichtung data when hasotherzahlungsverpflichtung is false
  hasBausparvertraege: boolean | null;
  hasRentenversicherung: boolean | null;
  institutbausparvertraege?: string;
  sparratebausparvertraege?: string;
  _tempBausparvertraege?: { institut: string; sparrate: string }; // Temporary storage for Bausparverträge data when hasBausparvertraege is false
  institutkapitalrentenversicherung?: string;
  praemiekapitalrentenversicherung?: string;
  expensespayable?: string;
  bankoverdraft?: string;
  debtpayable?: string;
  hasbuergschaft: boolean | null;
  weitereEinkuenfte?: WeitereEinkuenfte;
  weitereEinkuenfte2?: WeitereEinkuenfte2;
  _tempRentenversicherung?: { institut: string; praemie: string }; // Temporary storage for Rentenversicherung data when hasRentenversicherung is false
}

const renderTooltip = (text: string) => (
  <Tooltip id="button-tooltip">
    {text}
  </Tooltip>
);

interface Props {
  data: MainFinancials;
  onChange: (data: Partial<MainFinancials>) => void;
  showValidation: boolean;
  expandSectionKey?: string | null;
  onSectionExpanded?: () => void;
  isReadOnly?: boolean;
  sectionRefs?: Record<string, React.RefObject<HTMLDivElement>>;
}

const sectionKeys = ['1', '2', '3', '4'];

const SelbstauskunftForm: React.FC<Props> = ({ data, onChange, showValidation, expandSectionKey, onSectionExpanded, isReadOnly = false, sectionRefs }) => {
  const [expandedSection, setExpandedSection] = useState<string>('1');
  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? '' : section);
  };

  // Helper function to validate if a date is in the future
  const isDateInFuture = (dateString: string): boolean => {
    if (!dateString) return true; // Empty dates are handled by required validation
    const inputDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
    return inputDate > today;
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
      default:
        return undefined;
    }
  };

  // Helper function to render section header (modeled after EinkommenserklaerungForm, no tooltip)
  const renderSectionHeader = (id: string, title: string) => (
    <div 
      className="section-header" 
      onClick={() => toggleSection(id)}
      data-section={id}
      ref={sectionRefs && sectionRefs[id] ? sectionRefs[id] : undefined}
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

  // Expand section when expandSectionKey changes
  useEffect(() => {
    if (expandSectionKey) {
      setExpandedSection(expandSectionKey);
      if (onSectionExpanded) {
        setTimeout(onSectionExpanded, 0);
      }
    }
  }, [expandSectionKey, onSectionExpanded]);

  // Initialize sonstiges array when selected for the first time
  useEffect(() => {
    if (data.weitereEinkuenfte2?.selectedTypes?.includes('sonstiges') && 
        (!data.othermonthlynetincome || data.othermonthlynetincome.length === 0)) {
      onChange({ othermonthlynetincome: [{ type: '', amount: '' }] });
    }
  }, [data.weitereEinkuenfte2?.selectedTypes, data.othermonthlynetincome, onChange]);

  return (
    <Form>
       <style>
        {styles}
      </style>
      {/* Existing personal information content */}
      <div className="mb-4" style={{ backgroundColor: '#f8f9fa', borderRadius: '0.375rem', padding: '1rem' }}>
            <div className="d-flex align-items-center gap-2 mb-4 mt-2">
              <h3 className="mb-0 text-[#000000] font-semibold italic" style={{ fontSize: '1rem' }}>Angaben zur Person</h3>
              <OverlayTrigger
                placement="right"
                overlay={renderTooltip("Bitte geben Sie Ihre persönlichen Daten ein")}
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
              />
              <Form.Check
                inline
                type="radio"
                label="Frau"
                name="title"
                checked={data.title === 'Frau'}
                onChange={() => onChange({ ...data, title: 'Frau' })}
              />
              <Form.Check
                inline
                type="radio"
                label="ohne Anrede"
                name="title"
                checked={data.title === 'ohne Anrede'}
                onChange={() => onChange({ ...data, title: 'ohne Anrede' })}
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
                  />
                  <label>Name</label>
                  <Form.Control.Feedback type="invalid">
                    {getFieldErrorMessage('lastName')}
                  </Form.Control.Feedback>
                </Form.Floating>
              </div>
            </div>
          </div>
      {/* Section 1: Nettoeinkommen */}
      {renderSectionHeader('1', '1. Nettoeinkommen')}
      {expandedSection === '1' && (
        <div className="section-content">
          {/* 1.1 Nettoeinkommen aus nicht selbständiger Arbeit */}
          <div className="mb-4">
          <h3 className="text-xl font-medium text-[#000000] mb-3">
            1.1 Nettoeinkommen aus nicht selbständiger Arbeit</h3>
            <div className="d-flex align-items-center mb-3">
              <div className="flex-grow-1">
                <Form.Label>
                  Erzielen Sie Einkünfte aus nichtselbstständiger Arbeit?
                </Form.Label>
              </div>
              <div className="d-flex gap-3">
                <Form.Check
                  inline
                  type="radio"
                  label="Ja"
                  name="hasSalaryIncome"
                  checked={data.hasSalaryIncome === true}
                  onChange={() => onChange({ ...data, hasSalaryIncome: true })}
                  className="custom-radio"
                />
                <Form.Check
                  inline
                  type="radio"
                  label="Nein"
                  name="hasEmploymentIncome"
                  checked={data.hasSalaryIncome === false}
                  onChange={() => onChange({ ...data, hasSalaryIncome: false })}
                  className="custom-radio"
                />
              </div>
            </div>
            {showValidation && data.hasSalaryIncome === null && (
              <div className="text-danger mt-1">Bitte geben Sie an, ob Sie Einkünfte aus nichtselbstständiger Arbeit erzielen</div>
            )}
            {data.hasSalaryIncome === true && (
              <div className="mt-4">
                {/* Employment Income Table */}
                <div className="mb-4">
                  {/* Table Headers */}
                  <div className="row g-3 align-items-end mb-2">
                    <div className="col-md-4"></div>
                    <div className="col-md-4 fw-regular text-start">Jahresbetrag</div>
                    <div className="col-md-4 fw-regular text-start">Monatlich</div>
                  </div>
                  
                  {/* Lohn/Gehalt row */}
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
                        Lohn/Gehalt
                      </div>
                    </div>
                    <div className="col-md-4">
                      {/* Empty space */}
                    </div>
                    <div className="col-md-4">
                      <CurrencyInput
                        value={data.monthlynetsalary || ''}
                        onChange={val => onChange({ monthlynetsalary: val })}
                        placeholder="Monatliches Nettoeinkommen"
                        label="Monatliches Nettoeinkommen (€)"
                      />
                    </div>
                  </div>
                  
                  {/* Weihnachtsgeld row */}
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
                        value={data.wheinachtsgeld_next12 || ''}
                        onChange={val => onChange({ wheinachtsgeld_next12: val })}
                        placeholder="Jahresbetrag"
                        label="Jahresbetrag"
                      />
                    </div>
                    <div className="col-md-4">
                      <Form.Control
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
                        type="text"
                        value={data.wheinachtsgeld_next12 ? (parseFloat(data.wheinachtsgeld_next12.replace(/\./g, '').replace(',', '.')) / 12).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) : ''}
                        disabled
                        placeholder="Monatlich (automatisch)"
                      />
                    </div>
                  </div>
                  
                  {/* Urlaubsgeld row */}
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
                        value={data.urlaubsgeld_next12 || ''}
                        onChange={val => onChange({ urlaubsgeld_next12: val })}
                        placeholder="Jahresbetrag"
                        label="Jahresbetrag"
                      />
                    </div>
                    <div className="col-md-4">
                      <Form.Control
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
                        type="text"
                        value={data.urlaubsgeld_next12 ? (parseFloat(data.urlaubsgeld_next12.replace(/\./g, '').replace(',', '.')) / 12).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) : ''}
                        disabled
                        placeholder="Monatlich (automatisch)"
                      />
                    </div>
                  </div>
                  
                  {/* Validation errors for employment income (Lohn/Gehalt, Weihnachtsgeld, Urlaubsgeld) */}
                  {showValidation && data.hasSalaryIncome === true && (() => {
                    const errors: string[] = [];
                    if (!data.monthlynetsalary) {
                      errors.push('Lohn/Gehalt: Monatliches Nettoeinkommen ist erforderlich');
                    }
                    if (!data.wheinachtsgeld_next12) {
                      errors.push('Weihnachtsgeld: Jahresbetrag ist erforderlich');
                    }
                    if (!data.urlaubsgeld_next12) {
                      errors.push('Urlaubsgeld: Jahresbetrag ist erforderlich');
                    }
                    return errors.length > 0 ? (
                      <div className="alert alert-danger mt-3" role="alert">
                        {errors.map((error: string, idx: number) => (
                          <div key={idx}>{error}</div>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
                {/* Sonstige Beträge */}
                <div className="mb-2 mt-4">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span className="fw-medium">Sonstige Beträge z.B. Zuschläge, Prämien etc.</span>
                    <OverlayTrigger
                      placement="right"
                      overlay={<Tooltip>Fügen Sie weitere Einkommensarten hinzu, z.B. Zuschläge, Prämien etc.</Tooltip>}
                    >
                      <Button
                        variant="outline-secondary"
                        className="rounded-circle p-0 d-flex align-items-center justify-content-center"
                        style={{ width: '20px', height: '20px', color: '#064497', borderColor: '#D7DAEA', backgroundColor: '#D7DAEA' }}
                        onClick={e => e.stopPropagation()}
                      >
                        ?
                      </Button>
                    </OverlayTrigger>
                  </div>
                  {(data.otheremploymentmonthlynetincome || []).map((item: { type: string; amount: string }, idx: number) => (
                    <div key={idx}>
                      {/* Delete button above each row */}
                      <div className="d-flex justify-content-end mb-1">
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => {
                            const currentOther = [...(data.otheremploymentmonthlynetincome || [])];
                            currentOther.splice(idx, 1);
                            onChange({ otheremploymentmonthlynetincome: currentOther });
                          }}
                        >
                          Löschen
                        </Button>
                      </div>
                      {/* Table row matching the main table structure */}
                      <div className="row g-3 align-items-end mb-2">
                        <div className="col-md-4">
                          <Form.Floating>
                            <Form.Control
                              type="text"
                              placeholder="Art des Betrags"
                              value={item.type || ''}
                              onChange={e => {
                                const currentOther = [...(data.otheremploymentmonthlynetincome || [])];
                                currentOther[idx] = { ...item, type: e.target.value };
                                onChange({ otheremploymentmonthlynetincome: currentOther });
                              }}
                            />
                            <label>Art des Betrags</label>
                          </Form.Floating>
                        </div>
                        <div className="col-md-4">
                          <CurrencyInput
                            value={item.amount || ''}
                            onChange={val => {
                              const currentOther = [...(data.otheremploymentmonthlynetincome || [])];
                              currentOther[idx] = { ...item, amount: val };
                              onChange({ otheremploymentmonthlynetincome: currentOther });
                            }}
                            placeholder="Jahresbetrag"
                            label="Jahresbetrag (€)"
                          />
                        </div>
                        <div className="col-md-4">
                          <Form.Control
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
                            type="text"
                            value={item.amount ? (parseFloat(item.amount.replace(/\./g, '').replace(',', '.')) / 12).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) : ''}
                            disabled
                            placeholder="Monatlich (automatisch)"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline-primary"
                    className="add-person-btn mt-2"
                    onClick={() => {
                      const currentOther = [...(data.otheremploymentmonthlynetincome || []), { type: '', amount: '' }];
                      onChange({ otheremploymentmonthlynetincome: currentOther });
                    }}
                  >
                    + Sonstige Beträge
                  </Button>
                  {/* Sonstige Beträge validation errors below the button */}
                  {showValidation && data.hasSalaryIncome === true && (data.otheremploymentmonthlynetincome || []).length > 0 && (() => {
                    const sonstigeErrors: string[] = [];
                    (data.otheremploymentmonthlynetincome || []).forEach((item: { type: string; amount: string }, idx: number) => {
                      if (!item.type) {
                        sonstigeErrors.push(`Sonstige Beträge ${idx + 1}: Art des Betrags fehlt`);
                      }
                      if (!item.amount) {
                        sonstigeErrors.push(`Sonstige Beträge ${idx + 1}: Jahresbetrag fehlt`);
                      }
                    });
                    return sonstigeErrors.length > 0 ? (
                      <div className="alert alert-danger mt-3" role="alert">
                        {sonstigeErrors.map((error: string, idx: number) => (
                          <div key={idx}>{error}</div>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            )}
          </div>
          {/* 1.2 Weitere Nettoeinkommen Jahresbeträge */}
          <div className="mb-4">
            <h3 className="text-xl font-medium text-[#000000] mb-3">
              1.2 Weitere Nettoeinkommen Jahresbeträge</h3>
            <div className="mb-4">
              <div className="d-flex align-items-start gap-4">
                <div className="text-black flex-grow-1 mb-4" style={{ fontSize: '1rem', maxWidth: '80%' }}>
                  Klicken Sie auf '+ Weiteres Einkommen hinzufügen', um zusätzliche Einnahmen anzugeben, z. B. aus selbständiger Tätigkeit oder Rentenbezügen.
                </div>
                {!isReadOnly && (
                  <div className="flex-shrink-0">
                    <WeitereEinkuenfteMultiSelect
                      options={[
                        { value: 'gewerbe', label: 'Einkünfte aus Gewerbebetrieb/selbstständiger Arbeit' },
                        { value: 'landforst', label: 'Einkünfte aus Land- und Forstwirtschaft' },
                        { value: 'kapital', label: 'Kapitalvermögen' },
                        { value: 'vermietung', label: 'Einkünfte aus Vermietung und Verpachtung' }
                      ]}
                      value={data.weitereEinkuenfte?.selectedTypes || []}
                      onChange={(selected: string[]) => onChange({
                        ...data,
                        weitereEinkuenfte: {
                          ...data.weitereEinkuenfte,
                          selectedTypes: selected
                        }
                      })}
                      placeholder="+ Weiteres Einkommen hinzufügen"
                    />
                  </div>
                )}
              </div>
              
              {/* Render income fields based on selection */}
              {(data.weitereEinkuenfte?.selectedTypes || []).length > 0 && (
                <div className="mb-4">
                  {/* Table Headers */}
                  <div className="row g-3 align-items-end mb-2">
                    <div className="col-md-4"></div>
                    <div className="col-md-4 fw-regular text-start">Jahresbetrag</div>
                    <div className="col-md-4 fw-regular text-start">Monatlich</div>
                  </div>
                  
                  {/* Gewerbe/Selbständige Arbeit - 2 rows */}
                  {data.weitereEinkuenfte?.selectedTypes?.includes('gewerbe') && (
                    <>
                      {/* Gewerbebetrieb row */}
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
                            Aus Gewerbebetrieb
                          </div>
                        </div>
                        <div className="col-md-4">
                          <CurrencyInput
                            value={data.yearlybusinessnetincome || ''}
                            onChange={val => onChange({ yearlybusinessnetincome: val })}
                            placeholder="Jahresbetrag"
                            label="Jahresbetrag"
                          />
                        </div>
                        <div className="col-md-4">
                          <Form.Control
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
                            type="text"
                            value={data.yearlybusinessnetincome ? (parseFloat(data.yearlybusinessnetincome.replace(/\./g, '').replace(',', '.')) / 12).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) : ''}
                            disabled
                            placeholder="Monatlich (automatisch)"
                          />
                        </div>
                      </div>
                      
                      {/* Selbständige Tätigkeit row */}
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
                            Aus selbständiger Tätigkeit
                          </div>
                        </div>
                        <div className="col-md-4">
                          <CurrencyInput
                            value={data.yearlyselfemployednetincome || ''}
                            onChange={val => onChange({ yearlyselfemployednetincome: val })}
                            placeholder="Jahresbetrag"
                            label="Jahresbetrag"
                          />
                        </div>
                        <div className="col-md-4">
                          <Form.Control
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
                            type="text"
                            value={data.yearlyselfemployednetincome ? (parseFloat(data.yearlyselfemployednetincome.replace(/\./g, '').replace(',', '.')) / 12).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) : ''}
                            disabled
                            placeholder="Monatlich (automatisch)"
                          />
                        </div>
                      </div>
                    </>
                  )}
                  
                  {/* Land- und Forstwirtschaft row */}
                  {data.weitereEinkuenfte?.selectedTypes?.includes('landforst') && (
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
                          Aus Land- und Forstwirtschaft
                        </div>
                      </div>
                      <div className="col-md-4">
                        <CurrencyInput
                          value={data.incomeagriculture || ''}
                          onChange={val => onChange({ incomeagriculture: val })}
                          placeholder="Jahresbetrag"
                          label="Jahresbetrag"
                        />
                      </div>
                      <div className="col-md-4">
                        <Form.Control
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
                          type="text"
                          value={data.incomeagriculture ? (parseFloat(data.incomeagriculture.replace(/\./g, '').replace(',', '.')) / 12).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) : ''}
                          disabled
                          placeholder="Monatlich (automatisch)"
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Kapitalvermögen row */}
                  {data.weitereEinkuenfte?.selectedTypes?.includes('kapital') && (
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
                          Aus Kapitalvermögen
                        </div>
                      </div>
                      <div className="col-md-4">
                        <CurrencyInput
                          value={data.yearlycapitalnetincome || ''}
                          onChange={val => onChange({ yearlycapitalnetincome: val })}
                          placeholder="Jahresbetrag"
                          label="Jahresbetrag"
                        />
                      </div>
                      <div className="col-md-4">
                        <Form.Control
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
                          type="text"
                          value={data.yearlycapitalnetincome ? (parseFloat(data.yearlycapitalnetincome.replace(/\./g, '').replace(',', '.')) / 12).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) : ''}
                          disabled
                          placeholder="Monatlich (automatisch)"
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Vermietung und Verpachtung row */}
                  {data.weitereEinkuenfte?.selectedTypes?.includes('vermietung') && (
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
                          Aus Vermietung und Verpachtung
                        </div>
                      </div>
                      <div className="col-md-4">
                        <CurrencyInput
                          value={data.incomerent || ''}
                          onChange={val => onChange({ incomerent: val })}
                          placeholder="Jahresbetrag"
                          label="Jahresbetrag"
                        />
                      </div>
                      <div className="col-md-4">
                        <Form.Control
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
                          type="text"
                          value={data.incomerent ? (parseFloat(data.incomerent.replace(/\./g, '').replace(',', '.')) / 12).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) : ''}
                          disabled
                          placeholder="Monatlich (automatisch)"
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Validation errors for weitere Einkünfte */}
                  {showValidation && (() => {
                    const errors: string[] = [];
                    if (data.weitereEinkuenfte?.selectedTypes?.includes('gewerbe') && !data.yearlybusinessnetincome && !data.yearlyselfemployednetincome) {
                      errors.push('Bei Gewerbebetrieb/selbstständiger Arbeit muss mindestens ein Betrag angegeben werden');
                    }
                    if (data.weitereEinkuenfte?.selectedTypes?.includes('landforst') && !data.incomeagriculture) {
                      errors.push('Land- und Forstwirtschaft: Jahresbetrag ist erforderlich');
                    }
                    if (data.weitereEinkuenfte?.selectedTypes?.includes('kapital') && !data.yearlycapitalnetincome) {
                      errors.push('Kapitalvermögen: Jahresbetrag ist erforderlich');
                    }
                    if (data.weitereEinkuenfte?.selectedTypes?.includes('vermietung') && !data.incomerent) {
                      errors.push('Vermietung und Verpachtung: Jahresbetrag ist erforderlich');
                    }
                    return errors.length > 0 ? (
                      <div className="alert alert-danger mt-3" role="alert">
                        {errors.map((error: string, idx: number) => (
                          <div key={idx}>{error}</div>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Placeholders for other sections */}
      {renderSectionHeader('2', '2. Bezüge und Weitere Einkünfte')}
      {expandedSection === '2' && (
        <div className="section-content">
          <div className="mb-4">
          <h3 className="text-xl font-medium text-[#000000] mb-3">
            2.1  Rentenbezüge/Versorgungsbezüge (netto)</h3>
            <div className="d-flex align-items-center mb-3">
              <div className="flex-grow-1">
                <Form.Label>
                  Beziehen Sie Rentenbezüge/Versorgungsbezüge z.B: Altersrente, Unfallrente, Lebensversicherung, Pension?
                </Form.Label>
              </div>
              <div className="d-flex gap-3">
                <Form.Check
                  inline
                  type="radio"
                  label="Ja"
                  name="hasPensionIncome"
                  checked={data.haspensionincome === true}
                  onChange={() => onChange({ 
                    ...data, 
                    haspensionincome: true,
                    pensionmonthlynetincome: data._tempPensionmonthlynetincome || data.pensionmonthlynetincome || [{ type: '', amount: '' }],
                    _tempPensionmonthlynetincome: undefined // Clear temporary storage
                  })}
                  className="custom-radio"
                />
                <Form.Check
                  inline
                  type="radio"
                  label="Nein"
                  name="hasPensionIncome"
                  checked={data.haspensionincome === false}
                  onChange={() => onChange({ 
                    ...data, 
                    haspensionincome: false,
                    _tempPensionmonthlynetincome: data.pensionmonthlynetincome, // Save current data to temporary storage
                    pensionmonthlynetincome: []
                  })}
                  className="custom-radio"
                />
              </div>
            </div>
            {showValidation && data.haspensionincome === null && (
              <div className="text-danger mt-1">Bitte geben Sie an, ob Sie Rentenbezüge/Versorgungsbezüge beziehen</div>
            )}
            {data.haspensionincome === true && (
              <div className="mt-4">
                {/* Pension Income Table */}
                <div className="mb-4">
                  {/* Table Headers */}
                  <div className="row g-3 align-items-end mb-2">
                    <div className="col-md-4"></div>
                    <div className="col-md-4"></div>
                  </div>
                  
                  {/* Default pension row - always visible when haspensionincome is true */}
                  <div className="row g-3 align-items-end mb-2">
                    <div className="col-md-8">
                      <Form.Floating>
                        <Form.Control
                          type="text"
                          placeholder="Rentenart"
                          value={data.pensionmonthlynetincome?.[0]?.type || ''}
                          onChange={e => {
                            const currentPension = data.pensionmonthlynetincome || [{ type: '', amount: '' }];
                            const newPension = [...currentPension];
                            newPension[0] = { ...newPension[0], type: e.target.value };
                            onChange({ pensionmonthlynetincome: newPension });
                          }}
                        />
                        <label>Rentenart</label>
                      </Form.Floating>
                    </div>
                    <div className="col-md-4">
                      <CurrencyInput
                        value={data.pensionmonthlynetincome?.[0]?.amount || ''}
                        onChange={val => {
                          const currentPension = data.pensionmonthlynetincome || [{ type: '', amount: '' }];
                          const newPension = [...currentPension];
                          newPension[0] = { ...newPension[0], amount: val };
                          onChange({ pensionmonthlynetincome: newPension });
                        }}
                        placeholder="Monatliches Nettoeinkommen"
                        label="Monatliches Nettoeinkommen (€)"
                      />
                    </div>
                  </div>
                  
                  {/* Additional pension rows */}
                  {(data.pensionmonthlynetincome || []).slice(1).map((item: { type: string; amount: string }, idx: number) => (
                    <div key={idx + 1}>
                      {/* Delete button above the monthly input field */}
                      <div className="d-flex justify-content-end mb-1">
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => {
                            const newPension = [...(data.pensionmonthlynetincome || [])];
                            newPension.splice(idx + 1, 1);
                            onChange({ pensionmonthlynetincome: newPension });
                          }}
                        >
                          Löschen
                        </Button>
                      </div>
                      {/* Table row */}
                      <div className="row g-3 align-items-end mb-2">
                        <div className="col-md-8">
                          <Form.Floating>
                            <Form.Control
                              type="text"
                              placeholder="Rentenart"
                              value={item.type || ''}
                              onChange={e => {
                                const newPension = [...(data.pensionmonthlynetincome || [])];
                                newPension[idx + 1] = { ...item, type: e.target.value };
                                onChange({ pensionmonthlynetincome: newPension });
                              }}
                            />
                            <label>Rentenart</label>
                          </Form.Floating>
                        </div>
                        <div className="col-md-4">
                          <CurrencyInput
                            value={item.amount || ''}
                            onChange={val => {
                              const newPension = [...(data.pensionmonthlynetincome || [])];
                              newPension[idx + 1] = { ...item, amount: val };
                              onChange({ pensionmonthlynetincome: newPension });
                            }}
                            placeholder="Monatliches Nettoeinkommen"
                            label="Monatliches Nettoeinkommen (€)"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Add button */}
                  <Button
                    variant="outline-primary"
                    className="add-person-btn mt-2"
                    onClick={() => {
                      const currentPension = data.pensionmonthlynetincome || [{ type: '', amount: '' }];
                      const newPension = [...currentPension, { type: '', amount: '' }];
                      onChange({ pensionmonthlynetincome: newPension });
                    }}
                  >
                    + Rentenart hinzufügen
                  </Button>
                  
                  {/* Validation errors for pension income */}
                  {showValidation && data.haspensionincome === true && (() => {
                    // Always validate at least one row
                    const pensionRows = (data.pensionmonthlynetincome && data.pensionmonthlynetincome.length > 0)
                      ? data.pensionmonthlynetincome
                      : [{ type: '', amount: '' }];
                    const errors = pensionRows.map((item: { type: string; amount: string }, idx: number) => {
                      const rowErrors: string[] = [];
                      if (!item.type) {
                        rowErrors.push(`Rentenart ${idx + 1}: Rentenart fehlt`);
                      }
                      if (!item.amount) {
                        rowErrors.push(`Rentenart ${idx + 1}: Monatliches Nettoeinkommen fehlt`);
                      }
                      return rowErrors;
                    }).flat();
                    return errors.length > 0 ? (
                      <div className="alert alert-danger mt-3" role="alert">
                        {errors.map((error: string, idx: number) => (
                          <div key={idx}>{error}</div>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            )}
          </div>
           {/* 2.2 Weitere Einkünfte */}
          <div className="mb-4">
            <h3 className="text-xl font-medium text-[#000000] mb-3">
              2.2 Weitere Einkünfte</h3>
            <div className="mb-4">
              <div className="d-flex align-items-start gap-4">
                <div className="text-black flex-grow-1 mb-4" style={{ fontSize: '1rem', maxWidth: '80%' }}>
                  Klicken Sie auf ‚+ Weitere Einkünfte hinzufügen', um zusätzliche Einkünfte anzugeben, soweit sie nicht in den oben aufgeführten Beträgen enthalten sind. Beispiele: Kindergeld, Unterhaltsleistungen, etc.
                </div>
                {!isReadOnly && (
                  <div className="flex-shrink-0">
                    <WeitereEinkuenfteMultiSelect
                      options={[
                        { value: 'kindergeld', label: 'Kindergeld' },
                        { value: 'pflegegeld', label: 'Pflegegeld' },
                        { value: 'unterhaltsteuerfrei', label: 'Unterhaltsleistungen steuerfrei' },
                        { value: 'unterhaltsteuerpflichtig', label: 'Unterhaltsleistungen steuerpflichtig' },
                        { value: 'elterngeld', label: 'Elterngeld/Erziehungsgeld' },
                        { value: 'sonstiges', label: 'Sonstiges' }
                      ]}
                      value={data.weitereEinkuenfte2?.selectedTypes || []}
                      onChange={(selected: string[]) => onChange({
                        ...data,
                        weitereEinkuenfte2: {
                          ...data.weitereEinkuenfte2,
                          selectedTypes: selected
                        }
                      })}
                      placeholder="+ Weitere Einkünfte hinzufügen"
                    />
                  </div>
                )}
              </div>
              
              {/* Render income fields based on selection */}
              {(data.weitereEinkuenfte2?.selectedTypes || []).length > 0 && (
                <div className="mb-4">
                  {/* Table Headers */}
                  <div className="row g-3 align-items-end mb-2">
                    <div className="col-md-8"></div>
                  </div>
                  
                  {/* Kindergeld row */}
                  {data.weitereEinkuenfte2?.selectedTypes?.includes('kindergeld') && (
                    <div className="row g-3 align-items-end mb-2">
                      <div className="col-md-8 fw-medium text-black">
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
                          Kindergeld
                        </div>
                      </div>
                      <div className="col-md-4">
                        <CurrencyInput
                          value={data.monthlykindergeldnetincome || ''}
                          onChange={val => onChange({ monthlykindergeldnetincome: val })}
                          placeholder="Monatliches Nettoeinkommen"
                          label="Monatliches Nettoeinkommen (€)"
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Pflegegeld row */}
                  {data.weitereEinkuenfte2?.selectedTypes?.includes('pflegegeld') && (
                    <div className="row g-3 align-items-end mb-2">
                      <div className="col-md-8 fw-medium text-black">
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
                          Pflegegeld
                        </div>
                      </div>
                      <div className="col-md-4">
                        <CurrencyInput
                          value={data.monthlypflegegeldnetincome || ''}
                          onChange={val => onChange({ monthlypflegegeldnetincome: val })}
                          placeholder="Monatliches Nettoeinkommen"
                          label="Monatliches Nettoeinkommen (€)"
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Unterhaltsleistungen steuerfrei row */}
                  {data.weitereEinkuenfte2?.selectedTypes?.includes('unterhaltsteuerfrei') && (
                    <div className="row g-3 align-items-end mb-2">
                      <div className="col-md-8 fw-medium text-black">
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
                          Unterhaltsleistungen steuerfrei
                        </div>
                      </div>
                      <div className="col-md-4">
                        <CurrencyInput
                          value={data.incomeunterhalttaxfree || ''}
                          onChange={val => onChange({ incomeunterhalttaxfree: val })}
                          placeholder="Monatliches Nettoeinkommen"
                          label="Monatliches Nettoeinkommen (€)"
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Unterhaltsleistungen steuerpflichtig row */}
                  {data.weitereEinkuenfte2?.selectedTypes?.includes('unterhaltsteuerpflichtig') && (
                    <div className="row g-3 align-items-end mb-2">
                      <div className="col-md-8 fw-medium text-black">
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
                          Unterhaltsleistungen steuerpflichtig
                        </div>
                      </div>
                      <div className="col-md-4">
                        <CurrencyInput
                          value={data.incomeunterhalttaxable || ''}
                          onChange={val => onChange({ incomeunterhalttaxable: val })}
                          placeholder="Monatliches Nettoeinkommen"
                          label="Monatliches Nettoeinkommen (€)"
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Elterngeld/Erziehungsgeld row */}
                  {data.weitereEinkuenfte2?.selectedTypes?.includes('elterngeld') && (
                    <div className="row g-3 align-items-end mb-2">
                      <div className="col-md-8 fw-medium text-black">
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
                          Elterngeld/Erziehungsgeld
                        </div>
                      </div>
                      <div className="col-md-4">
                        <CurrencyInput
                          value={data.monthlyelterngeldnetincome || ''}
                          onChange={val => onChange({ monthlyelterngeldnetincome: val })}
                          placeholder="Monatliches Nettoeinkommen"
                          label="Monatliches Nettoeinkommen (€)"
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Sonstiges - Multiple rows with add/delete functionality */}
                  {data.weitereEinkuenfte2?.selectedTypes?.includes('sonstiges') && (
                    <div className="mb-4">
                      {/* Initial sonstige row - always visible when sonstiges is selected */}
                      <div className="row g-3 align-items-end mb-2">
                        <div className="col-md-8">
                          <Form.Floating>
                            <Form.Control
                              type="text"
                              placeholder="Art des Einkommens"
                              value={data.othermonthlynetincome?.[0]?.type || ''}
                              onChange={e => {
                                const currentOther = data.othermonthlynetincome || [];
                                const updatedOther = currentOther.length > 0 ? [...currentOther] : [{ type: '', amount: '' }];
                                updatedOther[0] = { ...updatedOther[0], type: e.target.value };
                                onChange({ othermonthlynetincome: updatedOther });
                              }}
                            />
                            <label>Art des Einkommens</label>
                          </Form.Floating>
                        </div>
                        <div className="col-md-4">
                          <CurrencyInput
                            value={data.othermonthlynetincome?.[0]?.amount || ''}
                            onChange={val => {
                              const currentOther = data.othermonthlynetincome || [];
                              const updatedOther = currentOther.length > 0 ? [...currentOther] : [{ type: '', amount: '' }];
                              updatedOther[0] = { ...updatedOther[0], amount: val };
                              onChange({ othermonthlynetincome: updatedOther });
                            }}
                            placeholder="Monatliches Nettoeinkommen"
                            label="Monatliches Nettoeinkommen (€)"
                          />
                        </div>
                      </div>
                      
                      {/* Additional sonstige rows */}
                      {(data.othermonthlynetincome || []).slice(1).map((item: { type: string; amount: string }, idx: number) => (
                        <div key={idx + 1}>
                          {/* Delete button above the row */}
                          <div className="d-flex justify-content-end mb-1">
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => {
                                const currentOther = [...(data.othermonthlynetincome || [])];
                                currentOther.splice(idx + 1, 1);
                                onChange({ othermonthlynetincome: currentOther });
                              }}
                            >
                              Löschen
                            </Button>
                          </div>
                          {/* Table row */}
                          <div className="row g-3 align-items-end mb-2">
                            <div className="col-md-8">
                              <Form.Floating>
                                <Form.Control
                                  type="text"
                                  placeholder="Art des Einkommens"
                                  value={item.type || ''}
                                  onChange={e => {
                                    const currentOther = [...(data.othermonthlynetincome || [])];
                                    currentOther[idx + 1] = { ...item, type: e.target.value };
                                    onChange({ othermonthlynetincome: currentOther });
                                  }}
                                />
                                <label>Art des Einkommens</label>
                              </Form.Floating>
                            </div>
                            <div className="col-md-4">
                              <CurrencyInput
                                value={item.amount || ''}
                                onChange={val => {
                                  const currentOther = [...(data.othermonthlynetincome || [])];
                                  currentOther[idx + 1] = { ...item, amount: val };
                                  onChange({ othermonthlynetincome: currentOther });
                                }}
                                placeholder="Monatliches Nettoeinkommen"
                                label="Monatliches Nettoeinkommen (€)"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Add button for sonstige */}
                      <Button
                        variant="outline-primary"
                        className="add-person-btn mt-2"
                        onClick={() => {
                          const currentOther = data.othermonthlynetincome || [];
                          const updatedOther = [...currentOther, { type: '', amount: '' }];
                          onChange({ othermonthlynetincome: updatedOther });
                        }}
                      >
                        + Sonstiges Einkommen hinzufügen
                      </Button>
                    </div>
                  )}
                  
                  {/* Validation errors for weitere Einkünfte 2 */}
                  {showValidation && (() => {
                    const errors: string[] = [];
                    
                    // Validate Kindergeld
                    if (data.weitereEinkuenfte2?.selectedTypes?.includes('kindergeld') && !data.monthlykindergeldnetincome) {
                      errors.push('Kindergeld: Monatliches Nettoeinkommen ist erforderlich');
                    }
                    
                    // Validate Pflegegeld
                    if (data.weitereEinkuenfte2?.selectedTypes?.includes('pflegegeld') && !data.monthlypflegegeldnetincome) {
                      errors.push('Pflegegeld: Monatliches Nettoeinkommen ist erforderlich');
                    }
                    
                    // Validate Unterhaltsleistungen steuerfrei
                    if (data.weitereEinkuenfte2?.selectedTypes?.includes('unterhaltsteuerfrei') && !data.incomeunterhalttaxfree) {
                      errors.push('Unterhaltsleistungen steuerfrei: Monatliches Nettoeinkommen ist erforderlich');
                    }
                    
                    // Validate Unterhaltsleistungen steuerpflichtig
                    if (data.weitereEinkuenfte2?.selectedTypes?.includes('unterhaltsteuerpflichtig') && !data.incomeunterhalttaxable) {
                      errors.push('Unterhaltsleistungen steuerpflichtig: Monatliches Nettoeinkommen ist erforderlich');
                    }
                    
                    // Validate Elterngeld
                    if (data.weitereEinkuenfte2?.selectedTypes?.includes('elterngeld') && !data.monthlyelterngeldnetincome) {
                      errors.push('Elterngeld/Erziehungsgeld: Monatliches Nettoeinkommen ist erforderlich');
                    }
                    
                    // Validate Sonstiges
                    if (data.weitereEinkuenfte2?.selectedTypes?.includes('sonstiges')) {
                      const otherIncome = data.othermonthlynetincome || [];
                      // If array is empty, we need at least one row for validation
                      const itemsToValidate = otherIncome.length > 0 ? otherIncome : [{ type: '', amount: '' }];
                      
                      const sonstigeErrors = itemsToValidate.map((item: { type: string; amount: string }, idx: number) => {
                        const rowErrors: string[] = [];
                        if (!item.type) {
                          rowErrors.push(`Sonstiges Einkommen ${idx + 1}: Art des Einkommens fehlt`);
                        }
                        if (!item.amount) {
                          rowErrors.push(`Sonstiges Einkommen ${idx + 1}: Monatliches Nettoeinkommen fehlt`);
                        }
                        return rowErrors;
                      }).flat();
                      errors.push(...sonstigeErrors);
                    }
                    
                    return errors.length > 0 ? (
                      <div className="alert alert-danger mt-3" role="alert">
                        {errors.map((error: string, idx: number) => (
                          <div key={idx}>{error}</div>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {renderSectionHeader('3', '3. Monatliche Belastungen')}
      {expandedSection === '3' && (
        <div className="section-content">
          <div className="mb-4">
            <h3 className="text-xl font-medium text-[#000000] mb-3">
              3.1 Steuern, Sozialversicherungsbeiträge und Beiträge mit entsprechender Zweckbestimmung</h3>
            <div className="mb-4">
              <div className="d-flex align-items-start gap-4">
                <div className="text-black flex-grow-1 mb-1" style={{ fontSize: '1rem', maxWidth: '80%' }}>
                  Klicken Sie auf '+ Steuern und Beiträge hinzufügen', um Steuern, Sozialversicherungsbeiträge und Beiträge mit entsprechender Zweckbestimmung wie Krankenversicherung, Pflegeversicherung hinzuzufügen, soweit sie nicht bereits unter Ziffer 1 berücksichtigt wurden
                </div>
                {!isReadOnly && (
                  <div className="flex-shrink-0">
                    <Button
                      variant="outline-primary"
                      className="rounded-pill px-4 py-2 mb-0"
                      style={{ minWidth: 260, fontWeight: 500, backgroundColor: '#064497', color: '#fff', borderColor: '#064497', boxShadow: '0 2px 8px rgba(6,68,151,0.08)' }}
                      onClick={() => {
                        const currentTaxes = data.betragotherinsurancetaxexpenses || [];
                        const updatedTaxes = [...currentTaxes, { type: '', amount: '' }];
                        onChange({ betragotherinsurancetaxexpenses: updatedTaxes });
                      }}
                    >
                      + Steuern und Beiträge hinzufügen
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Render tax/contribution fields */}
              {(data.betragotherinsurancetaxexpenses || []).length > 0 && (
                <div className="mb-4">
                  {/* Table Headers */}
                  <div className="row g-3 align-items-end mb-2">
                    <div className="col-md-8"></div>
                  </div>
                  
                  {/* Tax/Contribution rows */}
                  {(data.betragotherinsurancetaxexpenses || []).map((item: { type: string; amount: string }, idx: number) => (
                    <div key={idx}>
                      {/* Delete button above the monthly input field */}
                      <div className="d-flex justify-content-end mb-1">
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => {
                            const currentTaxes = [...(data.betragotherinsurancetaxexpenses || [])];
                            currentTaxes.splice(idx, 1);
                            onChange({ betragotherinsurancetaxexpenses: currentTaxes });
                          }}
                        >
                          Löschen
                        </Button>
                      </div>
                      {/* Table row */}
                      <div className="row g-3 align-items-end mb-2">
                        <div className="col-md-8">
                          <Form.Floating>
                            <Form.Control
                              type="text"
                              placeholder="Art der Steuer bzw. Beitrag"
                              value={item.type || ''}
                              onChange={e => {
                                const currentTaxes = [...(data.betragotherinsurancetaxexpenses || [])];
                                currentTaxes[idx] = { ...item, type: e.target.value };
                                onChange({ betragotherinsurancetaxexpenses: currentTaxes });
                              }}
                            />
                            <label>Art der Steuer bzw. Beitrag</label>
                          </Form.Floating>
                        </div>
                        <div className="col-md-4">
                          <CurrencyInput
                            value={item.amount || ''}
                            onChange={val => {
                              const currentTaxes = [...(data.betragotherinsurancetaxexpenses || [])];
                              currentTaxes[idx] = { ...item, amount: val };
                              onChange({ betragotherinsurancetaxexpenses: currentTaxes });
                            }}
                            placeholder="Monatlicher Betrag"
                            label="Monatlicher Betrag (€)"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Validation errors for taxes and contributions */}
                  {showValidation && (() => {
                    const taxErrors = (data.betragotherinsurancetaxexpenses || []).map((item: { type: string; amount: string }, idx: number) => {
                      const rowErrors: string[] = [];
                      if (!item.type) {
                        rowErrors.push(`Steuer/Beitrag ${idx + 1}: Art der Steuer bzw. Beitrag fehlt`);
                      }
                      if (!item.amount) {
                        rowErrors.push(`Steuer/Beitrag ${idx + 1}: Monatlicher Betrag fehlt`);
                      }
                      return rowErrors;
                    }).flat();
                    
                    return taxErrors.length > 0 ? (
                      <div className="alert alert-danger mt-3" role="alert">
                        {taxErrors.map((error: string, idx: number) => (
                          <div key={idx}>{error}</div>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          </div>
          {/* 3.2 Laufende monatliche Belastungen */}
          <div className="mb-4">
          <h3 className="text-xl font-medium text-[#000000] mb-3">
            3.2 Laufende monatliche Belastungen</h3>
            <div className="d-flex align-items-center mb-3 mt-4">
              <div className="flex-grow-1">
                <Form.Label className="d-flex align-items-center gap-2">
                  Haben Sie laufende Kredite, wie Kleinkredite, Anschaffungsdarlehen, Ratenkäufe etc.?
                <OverlayTrigger
                  placement="right"
                  overlay={renderTooltip("Bitte geben Sie an, ob Sie laufende Kredite haben, z.B. Kleinkredite, Anschaffungsdarlehen, Ratenkäufe etc.")}
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
                </Form.Label>
              </div>
              <div className="d-flex gap-3">
                <Form.Check
                  inline
                  type="radio"
                  label="Ja"
                  name="ispayingloans"
                  checked={data.ispayingloans === true}
                  onChange={() => onChange({ 
                    ...data, 
                    ispayingloans: true,
                    loans: data._tempLoans || data.loans || [{ description: '', duration: '', amount: '' }],
                    _tempLoans: undefined // Clear temporary storage
                  })}
                  className="custom-radio"
                />
                <Form.Check
                  inline
                  type="radio"
                  label="Nein"
                  name="ispayingloans"
                  checked={data.ispayingloans === false}
                  onChange={() => onChange({ 
                    ...data, 
                    ispayingloans: false,
                    _tempLoans: data.loans, // Save current data to temporary storage
                    loans: null
                  })}
                  className="custom-radio"
                />
              </div>
            </div>
            {showValidation && data.ispayingloans === null && (
              <div className="text-danger mt-1">Bitte geben Sie an, ob Sie laufende Kredite haben</div>
            )}
            {data.ispayingloans === true && (
              <div className="mt-4">
                {/* Loans Table */}
                <div className="mb-4">
                  {/* Default loan row - always visible when ispayingloans is true */}
                  <div className="row g-3 align-items-end mb-2">
                    <div className="col-md-4">
                      <Form.Floating>
                        <Form.Control
                          type="text"
                          placeholder="Kredit Beschreibung"
                          value={data.loans?.[0]?.description || ''}
                          onChange={e => {
                            const currentLoans = data.loans || [{ description: '', duration: '', amount: '' }];
                            const newLoans = [...currentLoans];
                            newLoans[0] = { ...newLoans[0], description: e.target.value };
                            onChange({ loans: newLoans });
                          }}
                        />
                        <label>Kredit Beschreibung</label>
                      </Form.Floating>
                    </div>
                    <div className="col-md-4">
                      <Form.Floating>
                        <Form.Control
                          type="date"
                          placeholder="Laufzeit bis"
                          value={data.loans?.[0]?.duration || ''}
                          onChange={e => {
                            const currentLoans = data.loans || [{ description: '', duration: '', amount: '' }];
                            const newLoans = [...currentLoans];
                            newLoans[0] = { ...newLoans[0], duration: e.target.value };
                            onChange({ loans: newLoans });
                          }}
                        />
                        <label>Laufzeit bis</label>
                      </Form.Floating>
                    </div>
                    <div className="col-md-4">
                      <CurrencyInput
                        value={data.loans?.[0]?.amount || ''}
                        onChange={val => {
                          const currentLoans = data.loans || [{ description: '', duration: '', amount: '' }];
                          const newLoans = [...currentLoans];
                          newLoans[0] = { ...newLoans[0], amount: val };
                          onChange({ loans: newLoans });
                        }}
                        placeholder="Monatlicher Betrag"
                        label="Monatlicher Betrag (€)"
                      />
                    </div>
                  </div>
                  
                  {/* Additional loan rows */}
                  {(data.loans || []).slice(1).map((item: { description: string; duration: string; amount: string }, idx: number) => (
                    <div key={idx + 1}>
                      {/* Delete button above the monthly input field */}
                      <div className="d-flex justify-content-end mb-1">
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => {
                            const newLoans = [...(data.loans || [])];
                            newLoans.splice(idx + 1, 1);
                            onChange({ loans: newLoans });
                          }}
                        >
                          Löschen
                        </Button>
                      </div>
                      {/* Table row */}
                      <div className="row g-3 align-items-end mb-2">
                        <div className="col-md-4">
                          <Form.Floating>
                            <Form.Control
                              type="text"
                              placeholder="Kredit Beschreibung"
                              value={item.description || ''}
                              onChange={e => {
                                const newLoans = [...(data.loans || [])];
                                newLoans[idx + 1] = { ...item, description: e.target.value };
                                onChange({ loans: newLoans });
                              }}
                            />
                            <label>Kredit Beschreibung</label>
                          </Form.Floating>
                        </div>
                        <div className="col-md-4">
                          <Form.Floating>
                            <Form.Control
                              type="date"
                              placeholder="Laufzeit bis"
                              value={item.duration || ''}
                              onChange={e => {
                                const newLoans = [...(data.loans || [])];
                                newLoans[idx + 1] = { ...item, duration: e.target.value };
                                onChange({ loans: newLoans });
                              }}
                            />
                            <label>Laufzeit bis</label>
                          </Form.Floating>
                        </div>
                        <div className="col-md-4">
                          <CurrencyInput
                            value={item.amount || ''}
                            onChange={val => {
                              const newLoans = [...(data.loans || [])];
                              newLoans[idx + 1] = { ...item, amount: val };
                              onChange({ loans: newLoans });
                            }}
                            placeholder="Monatlicher Betrag"
                            label="Monatlicher Betrag (€)"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Add button */}
                  <Button
                    variant="outline-primary"
                    className="add-person-btn mt-2"
                    onClick={() => {
                      const currentLoans = data.loans || [{ description: '', duration: '', amount: '' }];
                      const newLoans = [...currentLoans, { description: '', duration: '', amount: '' }];
                      onChange({ loans: newLoans });
                    }}
                  >
                    + Weitere Kredite angeben
                  </Button>
                  
                  {/* Validation errors for loans */}
                  {showValidation && data.ispayingloans === true && (() => {
                    // Always validate at least one row
                    const loanRows = (data.loans && data.loans.length > 0)
                      ? data.loans
                      : [{ description: '', duration: '', amount: '' }];
                    const errors = loanRows.map((item: { description: string; duration: string; amount: string }, idx: number) => {
                      const rowErrors: string[] = [];
                      if (!item.description) {
                        rowErrors.push(`Kredit ${idx + 1}: Kredit Beschreibung fehlt`);
                      }
                      if (!item.duration) {
                        rowErrors.push(`Kredit ${idx + 1}: Laufzeit bis fehlt`);
                      } else if (!isDateInFuture(item.duration)) {
                        rowErrors.push(`Kredit ${idx + 1}: Laufzeit bis muss in der Zukunft liegen`);
                      }
                      if (!item.amount) {
                        rowErrors.push(`Kredit ${idx + 1}: Monatlicher Betrag fehlt`);
                      }
                      return rowErrors;
                    }).flat();
                    return errors.length > 0 ? (
                      <div className="alert alert-danger mt-3" role="alert">
                        {errors.map((error: string, idx: number) => (
                          <div key={idx}>{error}</div>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            )}
            <div className="d-flex align-items-center mb-3 mt-4">
              <div className="flex-grow-1">
                <Form.Label className="d-flex align-items-center gap-2">
                  Haben Sie einen laufenden Zwischenkredit für Bauspardarlehen?
                <OverlayTrigger
                  placement="right"
                  overlay={renderTooltip("Bitte gebne Sie an ob Sie einen laufenden Zwischenkredit für Bauspardarlehen haben.")}
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
                </Form.Label>
              </div>
              <div className="d-flex gap-3">
                <Form.Check
                  inline
                  type="radio"
                  label="Ja"
                  name="ispayingzwischenkredit"
                  checked={data.ispayingzwischenkredit === true}
                  onChange={() => onChange({ 
                    ...data, 
                    ispayingzwischenkredit: true,
                    zwischenkredit: data._tempZwischenkredit || data.zwischenkredit || [{ duration: '', amount: '' }],
                    _tempZwischenkredit: undefined // Clear temporary storage
                  })}
                  className="custom-radio"
                />
                <Form.Check
                  inline
                  type="radio"
                  label="Nein"
                  name="ispayingzwischenkredit"
                  checked={data.ispayingzwischenkredit === false}
                  onChange={() => onChange({ 
                    ...data, 
                    ispayingzwischenkredit: false,
                    _tempZwischenkredit: data.zwischenkredit, // Save current data to temporary storage
                    zwischenkredit: null
                  })}
                  className="custom-radio"
                />
              </div>
            </div>
            {showValidation && data.ispayingzwischenkredit === null && (
              <div className="text-danger mt-1">Bitte gebne Sie an ob Sie einen laufenden Zwischenkredit für Bauspardarlehen haben</div>
            )}
            {data.ispayingzwischenkredit === true && (
              <div className="mt-4">
                {/* Zwischenkredit Table */}
                <div className="mb-4">
                  {/* Table Headers */}
                  <div className="row g-3 align-items-end mb-2">
                    <div className="col-md-4"></div>
                    <div className="col-md-4"></div>
                    <div className="col-md-4"></div>
                  </div>
                  
                  {/* Zwischenkredit row */}
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
                        Zwischenkredit für Bauspardarlehen
                      </div>
                    </div>
                    <div className="col-md-4">
                      <Form.Floating>
                        <Form.Control
                          type="date"
                          placeholder="Laufzeit bis"
                          value={data.zwischenkredit?.[0]?.duration || ''}
                          onChange={e => {
                            const currentZwischenkredit = data.zwischenkredit || [{ duration: '', amount: '' }];
                            const newZwischenkredit = [...currentZwischenkredit];
                            newZwischenkredit[0] = { ...newZwischenkredit[0], duration: e.target.value };
                            onChange({ zwischenkredit: newZwischenkredit });
                          }}
                        />
                        <label>Laufzeit bis</label>
                      </Form.Floating>
                    </div>
                    <div className="col-md-4">
                      <CurrencyInput
                        value={data.zwischenkredit?.[0]?.amount || ''}
                        onChange={val => {
                          const currentZwischenkredit = data.zwischenkredit || [{ duration: '', amount: '' }];
                          const newZwischenkredit = [...currentZwischenkredit];
                          newZwischenkredit[0] = { ...newZwischenkredit[0], amount: val };
                          onChange({ zwischenkredit: newZwischenkredit });
                        }}
                        placeholder="Monatlicher Betrag"
                        label="Monatlicher Betrag (€)"
                      />
                    </div>
                  </div>
                  
                  {/* Validation errors for zwischenkredit */}
                  {showValidation && data.ispayingzwischenkredit === true && (() => {
                    // Always validate at least one row
                    const zwischenRows = (data.zwischenkredit && data.zwischenkredit.length > 0)
                      ? data.zwischenkredit
                      : [{ duration: '', amount: '' }];
                    const errors = zwischenRows.map((item: { duration: string; amount: string }, idx: number) => {
                      const rowErrors: string[] = [];
                      if (!item.duration) {
                        rowErrors.push(`Zwischenkredit: Laufzeit bis fehlt`);
                      } else if (!isDateInFuture(item.duration)) {
                        rowErrors.push(`Zwischenkredit: Laufzeit bis muss in der Zukunft liegen`);
                      }
                      if (!item.amount) {
                        rowErrors.push(`Zwischenkredit: Monatlicher Betrag fehlt`);
                      }
                      return rowErrors;
                    }).flat();
                    return errors.length > 0 ? (
                      <div className="alert alert-danger mt-3" role="alert">
                        {errors.map((error: string, idx: number) => (
                          <div key={idx}>{error}</div>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            )}
            <div className="d-flex align-items-center mb-3 mt-4">
              <div className="flex-grow-1">
                <Form.Label className="d-flex align-items-center gap-2">
                  Zahlen Sie Unterhalt?
                <OverlayTrigger
                  placement="right"
                  overlay={renderTooltip("Bitte geben Sie an, ob Sie Unterhalt zahlen.")}
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
                </Form.Label>
              </div>
              <div className="d-flex gap-3">
                <Form.Check
                  inline
                  type="radio"
                  label="Ja"
                  name="ispayingunterhalt"
                  checked={data.ispayingunterhalt === true}
                  onChange={() => onChange({ 
                    ...data, 
                    ispayingunterhalt: true,
                    unterhaltszahlungenTotal: data._tempUnterhaltszahlungen || data.unterhaltszahlungenTotal || [{ description: '', duration: '', amountTotal: '' }],
                    _tempUnterhaltszahlungen: undefined // Clear temporary storage
                  })}
                  className="custom-radio"
                />
                <Form.Check
                  inline
                  type="radio"
                  label="Nein"
                  name="ispayingunterhalt"
                  checked={data.ispayingunterhalt === false}
                  onChange={() => onChange({ 
                    ...data, 
                    ispayingunterhalt: false,
                    _tempUnterhaltszahlungen: data.unterhaltszahlungenTotal, // Save current data to temporary storage
                    unterhaltszahlungenTotal: null
                  })}
                  className="custom-radio"
                />
              </div>
            </div>
            {showValidation && data.ispayingunterhalt === null && (
              <div className="text-danger mt-1">Bitte geben Sie an, ob Sie Unterhalt zahlen</div>
            )}
            {data.ispayingunterhalt === true && (
              <div className="mt-4">
                {/* Unterhalt Table */}
                <div className="mb-4">
                  {/* Table Headers */}
                  <div className="row g-3 align-items-end mb-2">
                    <div className="col-md-4"></div>
                    <div className="col-md-4"></div>
                    <div className="col-md-4"></div>
                  </div>
                  
                  {/* Unterhalt row */}
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
                        Unterhaltsverpflichtungen
                      </div>
                    </div>
                    <div className="col-md-4">
                      <Form.Floating>
                        <Form.Control
                          type="date"
                          placeholder="Laufzeit bis"
                          value={data.unterhaltszahlungenTotal?.[0]?.duration || ''}
                          onChange={e => {
                            const currentUnterhalt = data.unterhaltszahlungenTotal || [{ description: '', duration: '', amountTotal: '' }];
                            const newUnterhalt = [...currentUnterhalt];
                            newUnterhalt[0] = { ...newUnterhalt[0], duration: e.target.value };
                            onChange({ unterhaltszahlungenTotal: newUnterhalt });
                          }}
                        />
                        <label>Laufzeit bis</label>
                      </Form.Floating>
                    </div>
                    <div className="col-md-4">
                      <CurrencyInput
                        value={data.unterhaltszahlungenTotal?.[0]?.amountTotal || ''}
                        onChange={val => {
                          const currentUnterhalt = data.unterhaltszahlungenTotal || [{ description: '', duration: '', amountTotal: '' }];
                          const newUnterhalt = [...currentUnterhalt];
                          newUnterhalt[0] = { ...newUnterhalt[0], amountTotal: val };
                          onChange({ unterhaltszahlungenTotal: newUnterhalt });
                        }}
                        placeholder="Monatlicher Betrag"
                        label="Monatlicher Betrag (€)"
                      />
                    </div>
                  </div>
                  
                  {/* Validation errors for unterhalt */}
                  {showValidation && data.unterhaltszahlungenTotal && (() => {
                    const errors = data.unterhaltszahlungenTotal.map((item: { duration: string; amountTotal: string }, idx: number) => {
                      const rowErrors: string[] = [];
                      if (!item.duration) {
                        rowErrors.push(`Unterhalt: Laufzeit bis fehlt`);
                      } else if (!isDateInFuture(item.duration)) {
                        rowErrors.push(`Unterhalt: Laufzeit bis muss in der Zukunft liegen`);
                      }
                      if (!item.amountTotal) {
                        rowErrors.push(`Unterhalt: Monatlicher Betrag fehlt`);
                      }
                      return rowErrors;
                    }).flat();
                    
                    return errors.length > 0 ? (
                      <div className="alert alert-danger mt-3" role="alert">
                        {errors.map((error: string, idx: number) => (
                          <div key={idx}>{error}</div>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            )}
            <div className="d-flex align-items-center mb-3 mt-4">
              <div className="flex-grow-1">
                <Form.Label className="d-flex align-items-center gap-2">
                  Möchten Sie sonstige Zahlungsverpflichtung angeben?
                <OverlayTrigger
                  placement="right"
                  overlay={renderTooltip("Bitte geben Sie an, ob Sie sonstige Zahlungsverpflichtungen haben.")}
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
                </Form.Label>
              </div>
              <div className="d-flex gap-3">
                <Form.Check
                  inline
                  type="radio"
                  label="Ja"
                  name="hasotherzahlungsverpflichtung"
                  checked={data.hasotherzahlungsverpflichtung === true}
                  onChange={() => onChange({ 
                    ...data, 
                    hasotherzahlungsverpflichtung: true,
                    otherzahlungsverpflichtung: data._tempOtherzahlungsverpflichtung || data.otherzahlungsverpflichtung || [{ type: '', duration: '', amount: '' }],
                    _tempOtherzahlungsverpflichtung: undefined // Clear temporary storage
                  })}
                  className="custom-radio"
                />
                <Form.Check
                  inline
                  type="radio"
                  label="Nein"
                  name="hasotherzahlungsverpflichtung"
                  checked={data.hasotherzahlungsverpflichtung === false}
                  onChange={() => onChange({ 
                    ...data, 
                    hasotherzahlungsverpflichtung: false,
                    _tempOtherzahlungsverpflichtung: data.otherzahlungsverpflichtung, // Save current data to temporary storage
                    otherzahlungsverpflichtung: []
                  })}
                  className="custom-radio"
                />
              </div>
            </div>
            {showValidation && data.hasotherzahlungsverpflichtung === null && (
              <div className="text-danger mt-1">Bitte geben Sie an, ob Sie sonstige Zahlungsverpflichtungen haben</div>
            )}
            {data.hasotherzahlungsverpflichtung === true && (
              <div className="mt-4">
                {/* Sonstige Zahlungsverpflichtungen Table */}
                <div className="mb-4">
                  {/* Table Headers */}
                  <div className="row g-3 align-items-end mb-2">
                    <div className="col-md-4"></div>
                    <div className="col-md-4"></div>
                    <div className="col-md-4"></div>
                  </div>
                  
                  {/* Default sonstige zahlungsverpflichtung row - always visible when hasotherzahlungsverpflichtung is true */}
                  <div className="row g-3 align-items-end mb-2">
                    <div className="col-md-4">
                      <Form.Floating>
                        <Form.Control
                          type="text"
                          placeholder="Art der Zahlungsverpflichtung"
                          value={data.otherzahlungsverpflichtung?.[0]?.type || ''}
                          onChange={e => {
                            const currentOther = data.otherzahlungsverpflichtung || [{ type: '', duration: '', amount: '' }];
                            const newOther = [...currentOther];
                            newOther[0] = { ...newOther[0], type: e.target.value };
                            onChange({ otherzahlungsverpflichtung: newOther });
                          }}
                        />
                        <label>Art der Zahlungsverpflichtung</label>
                      </Form.Floating>
                    </div>
                    <div className="col-md-4">
                      <Form.Floating>
                        <Form.Control
                          type="date"
                          placeholder="Laufzeit bis"
                          value={data.otherzahlungsverpflichtung?.[0]?.duration || ''}
                          onChange={e => {
                            const currentOther = data.otherzahlungsverpflichtung || [{ type: '', duration: '', amount: '' }];
                            const newOther = [...currentOther];
                            newOther[0] = { ...newOther[0], duration: e.target.value };
                            onChange({ otherzahlungsverpflichtung: newOther });
                          }}
                        />
                        <label>Laufzeit bis</label>
                      </Form.Floating>
                    </div>
                    <div className="col-md-4">
                      <CurrencyInput
                        value={data.otherzahlungsverpflichtung?.[0]?.amount || ''}
                        onChange={val => {
                          const currentOther = data.otherzahlungsverpflichtung || [{ type: '', duration: '', amount: '' }];
                          const newOther = [...currentOther];
                          newOther[0] = { ...newOther[0], amount: val };
                          onChange({ otherzahlungsverpflichtung: newOther });
                        }}
                        placeholder="Monatlicher Betrag"
                        label="Monatlicher Betrag (€)"
                      />
                    </div>
                  </div>
                  
                  {/* Additional sonstige zahlungsverpflichtung rows */}
                  {(data.otherzahlungsverpflichtung || []).slice(1).map((item: { type: string; duration: string; amount: string }, idx: number) => (
                    <div key={idx + 1}>
                      {/* Delete button above the monthly input field */}
                      <div className="d-flex justify-content-end mb-1">
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => {
                            const newOther = [...(data.otherzahlungsverpflichtung || [])];
                            newOther.splice(idx + 1, 1);
                            onChange({ otherzahlungsverpflichtung: newOther });
                          }}
                        >
                          Löschen
                        </Button>
                      </div>
                      {/* Table row */}
                      <div className="row g-3 align-items-end mb-2">
                        <div className="col-md-4">
                          <Form.Floating>
                            <Form.Control
                              type="text"
                              placeholder="Art der Zahlungsverpflichtung"
                              value={item.type || ''}
                              onChange={e => {
                                const newOther = [...(data.otherzahlungsverpflichtung || [])];
                                newOther[idx + 1] = { ...item, type: e.target.value };
                                onChange({ otherzahlungsverpflichtung: newOther });
                              }}
                            />
                            <label>Art der Zahlungsverpflichtung</label>
                          </Form.Floating>
                        </div>
                        <div className="col-md-4">
                          <Form.Floating>
                            <Form.Control
                              type="date"
                              placeholder="Laufzeit bis"
                              value={item.duration || ''}
                              onChange={e => {
                                const newOther = [...(data.otherzahlungsverpflichtung || [])];
                                newOther[idx + 1] = { ...item, duration: e.target.value };
                                onChange({ otherzahlungsverpflichtung: newOther });
                              }}
                            />
                            <label>Laufzeit bis</label>
                          </Form.Floating>
                        </div>
                        <div className="col-md-4">
                          <CurrencyInput
                            value={item.amount || ''}
                            onChange={val => {
                              const newOther = [...(data.otherzahlungsverpflichtung || [])];
                              newOther[idx + 1] = { ...item, amount: val };
                              onChange({ otherzahlungsverpflichtung: newOther });
                            }}
                            placeholder="Monatlicher Betrag"
                            label="Monatlicher Betrag (€)"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Add button */}
                  <Button
                    variant="outline-primary"
                    className="add-person-btn mt-2"
                    onClick={() => {
                      const currentOther = data.otherzahlungsverpflichtung || [{ type: '', duration: '', amount: '' }];
                      const newOther = [...currentOther, { type: '', duration: '', amount: '' }];
                      onChange({ otherzahlungsverpflichtung: newOther });
                    }}
                  >
                    + Weitere Zahlungsverpflichtung angeben
                  </Button>
                  
                  {/* Validation errors for sonstige zahlungsverpflichtung */}
                  {showValidation && data.otherzahlungsverpflichtung && (() => {
                    const errors = data.otherzahlungsverpflichtung.map((item: { type: string; duration: string; amount: string }, idx: number) => {
                      const rowErrors: string[] = [];
                      if (!item.type) {
                        rowErrors.push(`Zahlungsverpflichtung ${idx + 1}: Art der Zahlungsverpflichtung fehlt`);
                      }
                      if (!item.duration) {
                        rowErrors.push(`Zahlungsverpflichtung ${idx + 1}: Laufzeit bis fehlt`);
                      } else if (!isDateInFuture(item.duration)) {
                        rowErrors.push(`Zahlungsverpflichtung ${idx + 1}: Laufzeit bis muss in der Zukunft liegen`);
                      }
                      if (!item.amount) {
                        rowErrors.push(`Zahlungsverpflichtung ${idx + 1}: Monatlicher Betrag fehlt`);
                      }
                      return rowErrors;
                    }).flat();
                    
                    return errors.length > 0 ? (
                      <div className="alert alert-danger mt-3" role="alert">
                        {errors.map((error: string, idx: number) => (
                          <div key={idx}>{error}</div>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            )}
          </div>
          {/* 3.2 Laufende monatliche Belastungen */}
          <div className="mb-4">
            <h3 className="text-xl font-medium text-[#000000] mb-3">
              3.3 Sparraten und Versicherungsprämien</h3>
              <div className="d-flex align-items-center mb-3 mt-4">
              <div className="flex-grow-1">
                <Form.Label className="d-flex align-items-center gap-2">
                  Zahlen Sie monatlich Sparraten für Bausparverträge?
                <OverlayTrigger
                  placement="right"
                  overlay={renderTooltip("Bitte geben Sie an ob Sie monatlich Sparraten für Bausparverträge zahlen.")}
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
                </Form.Label>
              </div>
              <div className="d-flex gap-3">
                <Form.Check
                  inline
                  type="radio"
                  label="Ja"
                  name="hasBausparvertraege"
                  checked={data.hasBausparvertraege === true}
                  onChange={() => onChange({ 
                    ...data, 
                    hasBausparvertraege: true,
                    institutbausparvertraege: data._tempBausparvertraege?.institut || data.institutbausparvertraege || '',
                    sparratebausparvertraege: data._tempBausparvertraege?.sparrate || data.sparratebausparvertraege || '',
                    _tempBausparvertraege: undefined // Clear temporary storage
                  })}
                  className="custom-radio"
                />
                <Form.Check
                  inline
                  type="radio"
                  label="Nein"
                  name="hasBausparvertraege"
                  checked={data.hasBausparvertraege === false}
                  onChange={() => onChange({ 
                    ...data, 
                    hasBausparvertraege: false,
                    _tempBausparvertraege: { 
                      institut: data.institutbausparvertraege || '', 
                      sparrate: data.sparratebausparvertraege || '' 
                    } // Save current data to temporary storage
                  })}
                  className="custom-radio"
                />
              </div>
            </div>
            {showValidation && data.hasBausparvertraege === null && (
              <div className="text-danger mt-1">Bitte geben Sie an ob Sie monatlich Sparraten für Bausparverträge zahlen</div>
            )}
            {data.hasBausparvertraege === true && (
              <div className="mt-4">
                {/* Bausparverträge Table */}
                <div className="mb-4">
                  {/* Table Headers */}
                  <div className="row g-3 align-items-end mb-2">
                    <div className="col-md-8"></div>
                    <div className="col-md-4"></div>
                  </div>
                  
                  {/* Bausparverträge row */}
                  <div className="row g-3 align-items-end mb-2">
                    <div className="col-md-8">
                      <Form.Floating>
                        <Form.Control
                          type="text"
                          placeholder="Institut"
                          value={data.institutbausparvertraege || ''}
                          onChange={e => onChange({ institutbausparvertraege: e.target.value })}
                        />
                        <label>Institut</label>
                      </Form.Floating>
                    </div>
                    <div className="col-md-4">
                      <CurrencyInput
                        value={data.sparratebausparvertraege || ''}
                        onChange={val => onChange({ sparratebausparvertraege: val })}
                        placeholder="Monatlicher Betrag"
                        label="Monatlicher Betrag (€)"
                      />
                    </div>
                  </div>
                  
                  {/* Validation errors for Bausparverträge */}
                  {showValidation && (() => {
                    const errors: string[] = [];
                    if (!data.institutbausparvertraege) {
                      errors.push('Bausparverträge: Institut fehlt');
                    }
                    if (!data.sparratebausparvertraege) {
                      errors.push('Bausparverträge: Monatlicher Betrag fehlt');
                    }
                    
                    return errors.length > 0 ? (
                      <div className="alert alert-danger mt-3" role="alert">
                        {errors.map((error: string, idx: number) => (
                          <div key={idx}>{error}</div>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            )}
             <div className="d-flex align-items-center mb-3 mt-4">
              <div className="flex-grow-1">
                <Form.Label className="d-flex align-items-center gap-2">
                  Zahlen Sie monatlich Prämien für Kapitallebens- und Rentenversicherungen?
                <OverlayTrigger
                  placement="right"
                  overlay={renderTooltip("Bitte geben Sie an ob Sie monatlich Prämien für Kapitallebens- und Rentenversicherungen zahlen.")}
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
                </Form.Label>
              </div>
              <div className="d-flex gap-3">
                <Form.Check
                  inline
                  type="radio"
                  label="Ja"
                  name="hasRentenversicherung"
                  checked={data.hasRentenversicherung === true}
                  onChange={() => onChange({ 
                    ...data, 
                    hasRentenversicherung: true,
                    institutkapitalrentenversicherung: data._tempRentenversicherung?.institut || data.institutkapitalrentenversicherung || '',
                    praemiekapitalrentenversicherung: data._tempRentenversicherung?.praemie || data.praemiekapitalrentenversicherung || '',
                    _tempRentenversicherung: undefined // Clear temporary storage
                  })}
                  className="custom-radio"
                />
                <Form.Check
                  inline
                  type="radio"
                  label="Nein"
                  name="hasRentenversicherung"
                  checked={data.hasRentenversicherung === false}
                  onChange={() => onChange({ 
                    ...data, 
                    hasRentenversicherung: false,
                    _tempRentenversicherung: { 
                      institut: data.institutkapitalrentenversicherung || '', 
                      praemie: data.praemiekapitalrentenversicherung || '' 
                    } // Save current data to temporary storage
                  })}
                  className="custom-radio"
                />
              </div>
            </div>
            {showValidation && data.hasRentenversicherung === null && (
              <div className="text-danger mt-1">Bitte geben Sie an ob Sie monatlich Prämien für Kapitallebens- und Rentenversicherungen zahlen</div>
            )}
            {data.hasRentenversicherung === true && (
              <div className="mt-4">
                {/* Rentenversicherung Table */}
                <div className="mb-4">
                  {/* Table Headers */}
                  <div className="row g-3 align-items-end mb-2">
                    <div className="col-md-8"></div>
                    <div className="col-md-4"></div>
                  </div>
                  
                  {/* Rentenversicherung row */}
                  <div className="row g-3 align-items-end mb-2">
                    <div className="col-md-8">
                      <Form.Floating>
                        <Form.Control
                          type="text"
                          placeholder="Institut"
                          value={data.institutkapitalrentenversicherung || ''}
                          onChange={e => onChange({ institutkapitalrentenversicherung: e.target.value })}
                        />
                        <label>Institut</label>
                      </Form.Floating>
                    </div>
                    <div className="col-md-4">
                      <CurrencyInput
                        value={data.praemiekapitalrentenversicherung || ''}
                        onChange={val => onChange({ praemiekapitalrentenversicherung: val })}
                        placeholder="Monatlicher Betrag"
                        label="Monatlicher Betrag (€)"
                      />
                    </div>
                  </div>
                  
                  {/* Validation errors for Rentenversicherung */}
                  {showValidation && (() => {
                    const errors: string[] = [];
                    if (!data.institutkapitalrentenversicherung) {
                      errors.push('Rentenversicherung: Institut fehlt');
                    }
                    if (!data.praemiekapitalrentenversicherung) {
                      errors.push('Rentenversicherung: Monatlicher Betrag fehlt');
                    }
                    
                    return errors.length > 0 ? (
                      <div className="alert alert-danger mt-3" role="alert">
                        {errors.map((error: string, idx: number) => (
                          <div key={idx}>{error}</div>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            )}
            </div>
        </div>
      )}
      {renderSectionHeader('4', '4. Weitere Angaben')}
      {expandedSection === '4' && (
        <div className="section-content">
          <div className="mb-4">
            {/* Unbezahlte Rechnungen */}
            <div className="row g-3 align-items-center mb-2">
              <div className="col-md-8">
                <div className="d-flex align-items-center gap-2">
                  <span>Unbezahlte Rechnungen in Höhe von insgesamt</span>
                  <OverlayTrigger
                    placement="right"
                    overlay={renderTooltip("Geben Sie hier die Summe aller Rechnungen an, die Sie noch nicht bezahlt haben.")}
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
              </div>
              <div className="col-md-4">
                <CurrencyInput
                  value={data.expensespayable || ''}
                  onChange={val => onChange({ expensespayable: val })}
                  placeholder="Betrag"
                  label="Betrag (€)"
                />
              </div>
            </div>

            {/* Kontoüberziehung */}
            <div className="row g-3 align-items-center mb-2">
              <div className="col-md-8">
                <div className="d-flex align-items-center gap-2">
                  <span>Kontoüberziehung zurzeit</span>
                  <OverlayTrigger
                    placement="right"
                    overlay={renderTooltip("Geben Sie an, um welchen Betrag Ihr Konto aktuell überzogen ist.")}
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
              </div>
              <div className="col-md-4">
                <CurrencyInput
                  value={data.bankoverdraft || ''}
                  onChange={val => onChange({ bankoverdraft: val })}
                  placeholder="Betrag"
                  label="Betrag (€)"
                />
              </div>
            </div>

            {/* Bestehende Schulden */}
            <div className="row g-3 align-items-center mb-2">
              <div className="col-md-8">
                <div className="d-flex align-items-center gap-2">
                  <span>Bestehende Schulden, die zurzeit nicht bedient werden (können)</span>
                  <OverlayTrigger
                    placement="right"
                    overlay={renderTooltip("Falls Sie Schulden haben, für die Sie aktuell keine Raten zahlen, geben Sie hier die Gesamtsumme an.")}
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
              </div>
              <div className="col-md-4">
                <CurrencyInput
                  value={data.debtpayable || ''}
                  onChange={val => onChange({ debtpayable: val })}
                  placeholder="Betrag"
                  label="Betrag (€)"
                />
              </div>
            </div>

            {/* Bürgschaft */}
            <div className="d-flex align-items-center mb-3 mt-4">
              <div className="flex-grow-1">
                <Form.Label className="d-flex align-items-center gap-2">
                  Ich/Wir habe(n) eine Bürgschaft übernommen.
                  <OverlayTrigger
                    placement="right"
                    overlay={renderTooltip("Bitte geben Sie an, ob Sie für die Verbindlichkeiten einer anderen Person eine Bürgschaft übernommen haben.")}
                  >
                    <Button
                      variant="outline-secondary"
                      className="rounded-circle p-0 d-flex align-items-center justify-content-center"
                      style={{ width: '20px', height: '20px', color: '#064497', borderColor: '#D7DAEA', backgroundColor: '#D7DAEA' }}
                    >
                      ?
                    </Button>
                  </OverlayTrigger>
                </Form.Label>
              </div>
              <div className="d-flex gap-3">
                <Form.Check
                  inline
                  type="radio"
                  label="Ja"
                  name="hasbuergschaft"
                  checked={data.hasbuergschaft === true}
                  onChange={() => onChange({ hasbuergschaft: true })}
                  className="custom-radio"
                />
                <Form.Check
                  inline
                  type="radio"
                  label="Nein"
                  name="hasbuergschaft"
                  checked={data.hasbuergschaft === false}
                  onChange={() => onChange({ hasbuergschaft: false })}
                  className="custom-radio"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </Form>
  );
};

export { sectionKeys };
export default SelbstauskunftForm; 