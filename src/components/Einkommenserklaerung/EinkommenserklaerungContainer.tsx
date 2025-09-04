import React, { useState, useEffect } from 'react';
import { Container, Button, Modal, Spinner, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, ensureUserFinancialsExists } from '../../lib/supabase';
import { formatCurrencyForDisplay, formatCurrencyForDatabase, safeFormatCurrencyForDatabase, safeNumericToString, safeFormatCurrencyForDisplay, safeNumericToDatabase, safeAreaToDatabase, safeAreaToString, isValidAreaValue } from '../../utils/currencyUtils';
import EinkommenserklaerungForm from './Steps/EinkommenserklaerungForm';
import './EinkommenserklaerungContainer.css';
import PDFDownloadButton from '../PDFDownload/PDFDownloadButton';

interface WeitereEinkuenfte {
  selectedTypes: string[];
  renten?: { betrag: string; turnus: 'monatlich' };
  vermietung?: { betrag: string; jahr: string };
  gewerbe?: { betrag: string; jahr: string };
  landforst?: { betrag: string; jahr: string };
  sonstige?: { betrag: string; jahr: string };
  unterhaltsteuerfrei?: { betrag: string };
  unterhaltsteuerpflichtig?: { betrag: string };
  ausland?: { betrag: string; jahr: string; turnus: 'monatlich' | 'jährlich' };
  pauschal?: { betrag: string; turnus: 'monatlich' };
  arbeitslosengeld?: { betrag: string; turnus: 'täglich' | 'monatlich' | 'jährlich' };
}

interface AdditionalIncomeChange {
  selectedTypes: string[];
  changes: {
    [type: string]: {
      date: string;
      newAmount: string;
      reason: string;
      increase?: boolean;
      isNewIncomeMonthly?: boolean | null;
    };
  };
}

interface AdditionalApplicantFinancials {
  originalPersonId?: string; // Add UUID tracking field
  title: string;
  firstName: string;
  lastName: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  hasEmploymentIncome?: boolean | null;
  incomeYear: string;
  incomeYearAmount: string;
  incomeEndMonth: string;
  incomeEndYear: string;
  monthlyIncome: Record<string, any>;
  sonderzuwendungenVergangen: Record<string, any>;
  sonderzuwendungenKommend: Record<string, any>;
  willChangeIncome?: boolean | null;
  incomeChangeDate?: string;
  willChangeIncrease?: boolean | null;
  newIncome?: string;
  isNewIncomeMonthly?: boolean | null;
  newIncomeReason?: string;
  startEmployment?: string;
  isContractLimited?: boolean | null;
  endOfContract?: string;
  weitereEinkuenfte?: WeitereEinkuenfte;
  // New fields
  werbungskosten?: string;
  kinderbetreuungskosten?: string;
  ispayingincometax: boolean | null;
  ispayinghealthinsurance?: boolean | null;
  ispayingpension?: boolean | null;
  ispayingunterhalt?: boolean | null;
  unterhaltszahlungen?: Array<{ name: string; amount: string }>;
  additionalIncomeChanges?: AdditionalIncomeChange;
  finanzamt?: string;
  steuerid?: string;
}

interface MainFinancials {
  title: string;
  firstName: string;
  lastName: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  hasEmploymentIncome?: boolean | null;
  incomeYear: string;
  incomeYearAmount: string;
  incomeEndMonth: string;
  incomeEndYear: string;
  monthlyIncome: Record<string, any>;
  sonderzuwendungenVergangen: Record<string, any>;
  sonderzuwendungenKommend: Record<string, any>;
  willChangeIncome?: boolean | null;
  incomeChangeDate?: string;
  willChangeIncrease?: boolean | null;
  newIncome?: string;
  isNewIncomeMonthly?: boolean | null;
  newIncomeReason?: string;
  startEmployment?: string;
  isContractLimited?: boolean | null;
  endOfContract?: string;
  weitereEinkuenfte?: WeitereEinkuenfte;
  // New fields
  werbungskosten?: string;
  kinderbetreuungskosten?: string;
  ispayingincometax: boolean | null;
  ispayinghealthinsurance?: boolean | null;
  ispayingpension?: boolean | null;
  ispayingunterhalt?: boolean | null;
  unterhaltszahlungen?: Array<{ name: string; amount: string }>;
  additionalIncomeChanges?: AdditionalIncomeChange;
  finanzamt?: string;
  steuerid?: string;
}

// Add label and tooltip mapping for income types (copied from EinkommenserklaerungForm)
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

// Add search terms for each section
const sectionSearchTerms = {
  personal: [
    "Persönliche Angaben",
    "Titel",
    "Name",
    "Vorname",
    "Adresse",
    "Straße",
    "Hausnummer",
    "Postleitzahl",
    "Ort"
  ],
  income: [
    "Einkommensangaben",
    "Einkünfte",
    "Arbeit",
    "Versorgungsbezüge",
    "Jahresbetrag",
    "Monatseinkommen",
    "Sonderzuwendungen",
    "Beschäftigungsbeginn",
    "Vertrag",
    "Befristet",
    "Unbefristet"
  ],
  'additional-income': [
    "Weitere Einkünfte",
    "Renten",
    "Vermietung",
    "Verpachtung",
    "Gewerbebetrieb",
    "Selbstständige Arbeit",
    "Landwirtschaft",
    "Forstwirtschaft",
    "Sonstige Einkünfte",
    "Unterhaltsleistungen",
    "Ausländische Einkünfte",
    "Arbeitslosengeld"
  ],
  costs: [
    "Kosten",
    "Zahlungen",
    "Abgaben",
    "Werbungskosten",
    "Einkommensteuer",
    "Krankenversicherung",
    "Rentenversicherung",
    "Unterhalt"
  ],
  changes: [
    "Änderungen",
    "Einkünfte",
    "Kosten",
    "Zahlungen",
    "Änderungsdatum",
    "Neuer Betrag",
    "Begründung"
  ],
  legal: [
    "Gesetzliche Angaben",
    "Finanzamt",
    "Steuer-ID",
    "Erklärung",
    "Versicherung"
  ]
};

// Add interface for search results
interface SearchResult {
  section: string;
  matches: string[];
}

interface EinkommenserklaerungContainerProps {
  residentId?: string;
}

const initialAdditionalIncomeChanges: AdditionalIncomeChange = {
  selectedTypes: [],
  changes: {},
};

// Generate UUID helper function
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

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

const EinkommenserklaerungContainer: React.FC<EinkommenserklaerungContainerProps> = ({ residentId }) => {
  const initialMainFinancials: MainFinancials = {
    title: '',
    firstName: '',
    lastName: '',
    street: '',
    houseNumber: '',
    postalCode: '',
    city: '',
    hasEmploymentIncome: null,
    incomeYear: '',
    incomeYearAmount: '',
    incomeEndMonth: '',
    incomeEndYear: '',
    monthlyIncome: {},
    sonderzuwendungenVergangen: {},
    sonderzuwendungenKommend: {},
    willChangeIncome: null,
    incomeChangeDate: '',
    willChangeIncrease: null,
    newIncome: '',
    isNewIncomeMonthly: null,
    newIncomeReason: '',
    startEmployment: '',
    isContractLimited: null,
    endOfContract: '',
    weitereEinkuenfte: {
      selectedTypes: [],
      renten: undefined,
      vermietung: undefined,
      gewerbe: undefined,
      landforst: undefined,
      sonstige: undefined,
      unterhaltsteuerfrei: undefined,
      unterhaltsteuerpflichtig: undefined,
      ausland: undefined,
      pauschal: undefined,
      arbeitslosengeld: undefined,
    },
    werbungskosten: '',
    kinderbetreuungskosten: '',
    ispayingincometax: null,
    ispayinghealthinsurance: null,
    ispayingpension: null,
    ispayingunterhalt: null,
    unterhaltszahlungen: [],
    additionalIncomeChanges: initialAdditionalIncomeChanges,
    finanzamt: '',
    steuerid: '',
  };

  const [mainFinancials, setMainFinancials] = useState<MainFinancials>(initialMainFinancials);
  const [additionalApplicants, setAdditionalApplicants] = useState<AdditionalApplicantFinancials[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [pendingSection, setPendingSection] = useState<string | null>(null);

  // Validation state variables
  const [validationErrors, setValidationErrors] = useState<ApplicantErrors>({});
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [hasValidatedOnce, setHasValidatedOnce] = useState(false);
  const [sonderzuwendungenFieldErrors, setSonderzuwendungenFieldErrors] = useState<Record<number, string[]>>({});

  const { user } = useAuth();
  const navigate = useNavigate();

  // Sync hasUnsavedChanges with sessionStorage for routing protection
  useEffect(() => {
    if (hasUnsavedChanges) {
      sessionStorage.setItem('einkommenserklaerung_has_unsaved_changes', 'true');
      console.log('*** SETTING EINKOMMENSERKLAERUNG UNSAVED CHANGES FLAG IN SESSIONSTORAGE ***');
    } else {
      sessionStorage.removeItem('einkommenserklaerung_has_unsaved_changes');
      console.log('*** REMOVING EINKOMMENSERKLAERUNG UNSAVED CHANGES FLAG FROM SESSIONSTORAGE ***');
    }
    
    // Cleanup function to remove flag when component unmounts
    return () => {
      sessionStorage.removeItem('einkommenserklaerung_has_unsaved_changes');
      sessionStorage.removeItem('einkommenserklaerung_valid_navigation');
      console.log('*** CLEANING UP EINKOMMENSERKLAERUNG UNSAVED CHANGES FLAG ON COMPONENT UNMOUNT ***');
    };
  }, [hasUnsavedChanges]);

  // Handle browser back/forward navigation directly in the component
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      console.log('*** EINKOMMENSERKLAERUNG COMPONENT: POPSTATE EVENT FIRED ***');
      
      if (hasUnsavedChanges) {
        console.log('*** EINKOMMENSERKLAERUNG COMPONENT: UNSAVED CHANGES DETECTED - SHOWING CONFIRMATION ***');
        
        // Show confirmation dialog first
        const confirmed = window.confirm(
          'Sie haben ungespeicherte Änderungen. Wenn Sie fortfahren, gehen diese verloren. Möchten Sie trotzdem fortfahren?'
        );
        
        if (!confirmed) {
          console.log('*** EINKOMMENSERKLAERUNG COMPONENT: USER CANCELLED - PREVENTING NAVIGATION ***');
          // Prevent the default navigation and push current state back
          e.preventDefault();
          window.history.pushState(null, '', window.location.href);
          
          // Set navigation flag to prevent routing protection from redirecting
          const navigationKey = `einkommenserklaerung_navigation_${Date.now()}`;
          sessionStorage.setItem('einkommenserklaerung_valid_navigation', navigationKey);
          console.log('*** EINKOMMENSERKLAERUNG COMPONENT: SETTING NAVIGATION FLAG AFTER CANCELLING POPSTATE ***');
        } else {
          console.log('*** EINKOMMENSERKLAERUNG COMPONENT: USER CONFIRMED - ALLOWING NAVIGATION ***');
          
          // Clean up navigation flag since user is leaving
          sessionStorage.removeItem('einkommenserklaerung_valid_navigation');
          
          // Clear unsaved changes immediately
          setHasUnsavedChanges(false);
          
          // Don't prevent the default - let the navigation proceed naturally
          console.log('*** EINKOMMENSERKLAERUNG COMPONENT: ALLOWING NATURAL NAVIGATION ***');
          navigate('/personal-space', { state: { from: 'einkommenserklaerung' } });
        }
      } else {
        console.log('*** EINKOMMENSERKLAERUNG COMPONENT: NO UNSAVED CHANGES - ALLOWING NAVIGATION ***');
        // Don't interfere with navigation when there are no unsaved changes
        // The user should be able to navigate normally
      }
    };
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'Sie haben ungespeicherte Änderungen. Sind Sie sicher, dass Sie die Seite verlassen möchten?';
        return 'Sie haben ungespeicherte Änderungen. Sind Sie sicher, dass Sie die Seite verlassen möchten?';
      }
    };
    
    // Only add popstate listener and push history state when there are unsaved changes
    if (hasUnsavedChanges) {
      console.log('*** EINKOMMENSERKLAERUNG COMPONENT: ADDING POPSTATE LISTENER FOR UNSAVED CHANGES ***');
      // Push initial state to enable popstate detection
      window.history.pushState(null, '', window.location.href);
      
      // Add popstate listener
      window.addEventListener('popstate', handlePopState);
    }
    
    // Always add beforeunload listener
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Cleanup
    return () => {
      // Always remove popstate listener to prevent memory leaks
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // Helper function to get applicant display name
  const getApplicantDisplayName = (applicant: MainFinancials | AdditionalApplicantFinancials, index: number): string => {
    if (index === 0) {
      return 'Hauptantragsteller';
    }
    
    const firstName = applicant.firstName || '';
    const lastName = applicant.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    
    if (fullName) {
      return `${fullName}`;
    } else {
      return `Person ${index + 1}`;
    }
  };

  useEffect(() => {
    if (pendingSection !== null) {
      setTimeout(() => {
        const formRef = document.querySelector(`#applicant-${selectedIndex}`);
        if (formRef) {
          const sectionHeader = formRef.querySelector(`[data-section="${pendingSection}"]`) as HTMLDivElement;
          if (sectionHeader) {
            sectionHeader.click();
          }
        }
        setPendingSection(null);
      }, 0);
    }
  }, [selectedIndex, pendingSection]);

  // Load data from Supabase
  useEffect(() => {
    const loadSavedData = async () => {
      if (!user?.id && !residentId) return;

      setIsLoading(true);
      try {
        const userId = residentId || user?.id;
        if (!userId) return;

        // Load user data
        const { data: userData, error: userError } = await supabase
          .from('user_data')
          .select('*')
          .eq('id', userId)
          .single();

        if (userError) {
          console.error('Error loading user data:', userError);
          return;
        }
        
        // Set showValidation based on shouldShowErrorEink from database
        const shouldShowError = userData?.should_show_error_einkommenserklaerung ?? false;
        console.log('Setting shouldShowError to:', shouldShowError);
        setShowValidation(shouldShowError);

        // Load financial data
        const { data: financialData, error: financialError } = await supabase
          .from('user_financials')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (financialError) {
          console.error('Error loading financial data:', financialError);
          //return;
        }

        // Set main applicant data
        setMainFinancials({
          title: userData?.title || '',
          firstName: userData?.firstname || '',
          lastName: userData?.lastname || '',
          street: userData?.person_street || '',
          houseNumber: userData?.person_housenumber || '',
          postalCode: userData?.person_postalcode || '',
          city: userData?.person_city || '',
          hasEmploymentIncome: financialData?.isEarningRegularIncome ?? null,
          incomeYear: financialData?.prior_year || '',
          incomeYearAmount: safeFormatCurrencyForDisplay(financialData.prior_year_earning),
          incomeEndMonth: financialData?.end_month_past12 || '',
          incomeEndYear: financialData?.end_year_past12 || '',
          monthlyIncome: (() => {
            const monthlyIncome: Record<string, any> = {};
            const endMonth = parseInt(financialData?.end_month_past12 || '0');
            const endYear = parseInt(financialData?.end_year_past12 || '0');
            
            if (!isNaN(endMonth) && !isNaN(endYear)) {
              // Add all 12 months
              for (let i = 11; i >= 0; i--) {
                const month = (endMonth - i + 12) % 12;
                const year = endYear - (endMonth < i ? 1 : 0);
                const key = `${year}-${month}`;
                
                // Map database fields to monthly income
                const monthData = {
                  '0': financialData?.income_month1,
                  '1': financialData?.income_month2,
                  '2': financialData?.income_month3,
                  '3': financialData?.income_month4,
                  '4': financialData?.income_month5,
                  '5': financialData?.income_month6,
                  '6': financialData?.income_month7,
                  '7': financialData?.income_month8,
                  '8': financialData?.income_month9,
                  '9': financialData?.income_month10,
                  '10': financialData?.income_month11,
                  '11': financialData?.income_month12
                }[11 - i];

                monthlyIncome[key] = safeFormatCurrencyForDisplay(monthData);
              }
            }
            return monthlyIncome;
          })(),
          sonderzuwendungenVergangen: {
            weihnachtsgeld:  safeFormatCurrencyForDisplay(financialData.wheinachtsgeld_last12) ,
            urlaubsgeld: safeFormatCurrencyForDisplay(financialData.urlaubsgeld_last12),
            sonstige: safeFormatCurrencyForDisplay(financialData.otherincome_last12)
          },
          sonderzuwendungenKommend: {
            weihnachtsgeld: safeFormatCurrencyForDisplay(financialData.wheinachtsgeld_next12),
            urlaubsgeld:  safeFormatCurrencyForDisplay(financialData.urlaubsgeld_next12),
            sonstige: safeFormatCurrencyForDisplay(financialData.otherincome_next12) 
          },
          willChangeIncome: financialData?.willchangeincome ?? null,
          incomeChangeDate: financialData?.incomechangedate || '',
          willChangeIncrease: financialData?.willchangeincrease ?? null,
          newIncome: safeFormatCurrencyForDisplay(financialData.newincome),
          isNewIncomeMonthly: financialData?.isnewincomemonthly ?? null,
          newIncomeReason: financialData?.newincomereason || '',
          startEmployment: financialData?.startemployment || '',
          isContractLimited: financialData?.iscontractlimited ?? null,
          endOfContract: financialData?.endofcontract || '',
          // Add new fields
          werbungskosten: safeFormatCurrencyForDisplay(financialData.werbungskosten),
          kinderbetreuungskosten:  safeFormatCurrencyForDisplay(financialData.kinderbetreuungskosten),
          ispayingincometax: financialData?.ispayingincometax,
          ispayinghealthinsurance: financialData?.ispayinghealthinsurance,
          ispayingpension: financialData?.ispayingpension,
          ispayingunterhalt: financialData?.ispayingunterhalt,
          unterhaltszahlungen: financialData?.unterhaltszahlungen || [],
          additionalIncomeChanges: financialData?.addition_change_inincome ? JSON.parse(financialData.addition_change_inincome) : initialAdditionalIncomeChanges,
          weitereEinkuenfte: {
            selectedTypes: ([
              financialData?.haspensionincome ? 'renten' : null,
              financialData?.hasrentincome ? 'vermietung' : null,
              financialData?.hasbusinessincome ? 'gewerbe' : null,
              financialData?.hasagricultureincome ? 'landforst' : null,
              financialData?.hasothercome ? 'sonstige' : null,
              financialData?.hastaxfreeunterhaltincome ? 'unterhaltsteuerfrei' : null,
              financialData?.hastaxableunterhaltincome ? 'unterhaltsteuerpflichtig' : null,
              financialData?.hasforeignincome ? 'ausland' : null,
              financialData?.haspauschalincome ? 'pauschal' : null,
              financialData?.hasablgincome ? 'arbeitslosengeld' : null,
            ].filter(Boolean)) as string[],
            renten: financialData?.haspensionincome ? { betrag: safeFormatCurrencyForDisplay(financialData.incomepension), turnus: 'monatlich' } : undefined,
            vermietung: financialData?.hasrentincome ? { betrag:  safeFormatCurrencyForDisplay(financialData.incomerent), jahr: financialData.incomerentyear ? String(financialData.incomerentyear) : '' } : undefined,
            gewerbe: financialData?.hasbusinessincome ? { betrag: safeFormatCurrencyForDisplay(financialData.incomebusiness), jahr: financialData.incomebusinessyear ? String(financialData.incomebusinessyear) : '' } : undefined,
            landforst: financialData?.hasagricultureincome ? { betrag: safeFormatCurrencyForDisplay(financialData.incomeagriculture), jahr: financialData.incomeagricultureyear ? String(financialData.incomeagricultureyear) : '' } : undefined,
            sonstige: financialData?.hasothercome ? { betrag: safeFormatCurrencyForDisplay(financialData.incomeothers), jahr: financialData.incomeothersyear ? String(financialData.incomeothersyear) : '' } : undefined,
            unterhaltsteuerfrei: financialData?.hastaxfreeunterhaltincome ? { betrag: safeFormatCurrencyForDisplay(financialData.incomeunterhalttaxfree) } : undefined,
            unterhaltsteuerpflichtig: financialData?.hastaxableunterhaltincome ? { betrag: safeFormatCurrencyForDisplay(financialData.incomeunterhalttaxable) } : undefined,
            ausland: financialData?.hasforeignincome ? { betrag: safeFormatCurrencyForDisplay(financialData.incomeforeign), jahr: financialData.incomeforeignyear ? String(financialData.incomeforeignyear) : '', turnus: financialData.incomeforeignmonthly ? 'monatlich' : 'jährlich' } : undefined,
            pauschal: financialData?.haspauschalincome ? { betrag: safeFormatCurrencyForDisplay(financialData.incomepauschal), turnus: 'monatlich' } : undefined,
            arbeitslosengeld: financialData?.hasablgincome && (financialData.incomealbgtype === 0 || financialData.incomealbgtype === 1 || financialData.incomealbgtype === 2)
              ? {
                  betrag: safeFormatCurrencyForDisplay(financialData.incomeablg),
                  turnus: financialData.incomealbgtype === 0 ? 'täglich' : financialData.incomealbgtype === 1 ? 'monatlich' : 'jährlich',
                }
              : undefined,
          },
          finanzamt: financialData?.finanzamt || '',
          steuerid: financialData?.steuerid || '',
        });

        // Load additional applicants data
        if (userData?.weitere_antragstellende_personen) {
          // Load additional applicants data (UUID-based structure)
          const weiterePersonenData = userData.weitere_antragstellende_personen || {};
          console.log('Loading weitere_antragstellende_personen:', weiterePersonenData);
          let weiterePersonenObj: Record<string, any> = {};
          
          // Handle backwards compatibility: convert array to UUID-based object if needed
          if (Array.isArray(weiterePersonenData)) {
            console.log('Converting from legacy array format');
            // Legacy array format - convert to UUID-based object
            weiterePersonenData.forEach((person: any, index: number) => {
              const uuid = person.id || `legacy_${index}`;
              weiterePersonenObj[uuid] = { ...person, id: uuid };
            });
          } else {
            console.log('Using UUID-based object format');
            // Already UUID-based object format
            weiterePersonenObj = weiterePersonenData;
          }

          console.log('Processed weiterePersonenObj:', weiterePersonenObj);

          // Load financial data - also convert to UUID-based if needed
          const additionalFinancialsData = financialData?.additional_applicants_financials || {};
          console.log('Loading additional_applicants_financials:', additionalFinancialsData);
          let additionalFinancialsObj: Record<string, any> = {};
          
          if (Array.isArray(additionalFinancialsData)) {
            console.log('Converting financial data from legacy array format');
            // Legacy array format - match by index to UUID
            const personUuids = Object.keys(weiterePersonenObj);
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
          
          console.log('Processed additionalFinancialsObj:', additionalFinancialsObj);

          // Check for all persons and log their status
          const allPersons = Object.entries(weiterePersonenObj);
          console.log(`Found ${allPersons.length} total persons in weitere_antragstellende_personen`);
          
          allPersons.forEach(([uuid, person]: [string, any]) => {
            console.log(`Person ${uuid}:`, {
              name: `${person.firstName} ${person.lastName}`,
              noIncome: person.noIncome,
              notHousehold: person.notHousehold,
              hasApplicantData: !!(person.title || person.firstName || person.lastName)
            });
          });

          const applicantEntries = Object.entries(weiterePersonenObj).filter(([uuid, person]: [string, any]) => {
            const noIncome = person.noIncome;
            const notHousehold = person.notHousehold;
            const shouldInclude = noIncome !== true && notHousehold !== true; // Exclude if noIncome or notHousehold is true
            
            console.log(`Person ${uuid} (${person.firstName} ${person.lastName}):`, {
              noIncome: person.noIncome,
              notHousehold: person.notHousehold,
              shouldInclude,
              reason: 
                noIncome === true
                  ? 'Excluded: noIncome is true'
                  : notHousehold === true
                    ? 'Excluded: notHousehold is true'
                    : 'Included: neither noIncome nor notHousehold is true'
            });
            
            return shouldInclude;
          });

          console.log('Filtered applicant entries:', applicantEntries);
          // Merge personal and financial data
          const mergedApplicants: AdditionalApplicantFinancials[] = applicantEntries.map(([uuid, person]: [string, any], index: number) => {
            const financialData = additionalFinancialsObj[uuid] || {};
            console.log(`Creating merged applicant for ${uuid}:`, { person, financialData });
            
            if (!financialData) return {
              originalPersonId: uuid,
              title: person.title || '',
              firstName: person.firstName || '',
              lastName: person.lastName || '',
              street: person.street || '',
              houseNumber: person.houseNumber || '',
              postalCode: person.postalCode || '',
              city: person.city || '',
              hasEmploymentIncome: null,
              incomeYear: '',
              incomeYearAmount: '',
              incomeEndMonth: '',
              incomeEndYear: '',
              monthlyIncome: {},
              sonderzuwendungenVergangen: {},
              sonderzuwendungenKommend: {},
              willChangeIncome: null,
              incomeChangeDate: '',
              willChangeIncrease: null,
              newIncome: '',
              isNewIncomeMonthly: null,
              newIncomeReason: '',
              startEmployment: '',
              isContractLimited: null,
              endOfContract: '',
              weitereEinkuenfte: {
                selectedTypes: [],
                renten: undefined,
                vermietung: undefined,
                gewerbe: undefined,
                landforst: undefined,
                sonstige: undefined,
                unterhaltsteuerfrei: undefined,
                unterhaltsteuerpflichtig: undefined,
                ausland: undefined,
                pauschal: undefined,
                arbeitslosengeld: undefined,
              },
              werbungskosten: '',
              kinderbetreuungskosten: '',
              ispayingincometax: null,
              ispayinghealthinsurance: null,
              ispayingpension: null,
              ispayingunterhalt: null,
              unterhaltszahlungen: [],
              additionalIncomeChanges: initialAdditionalIncomeChanges,
              finanzamt: '',
              steuerid: '',
            };

            return {
              originalPersonId: uuid,
              title: person.title || '',
              firstName: person.firstName || '',
              lastName: person.lastName || '',
              street: person.street || '',
              houseNumber: person.houseNumber || '',
              postalCode: person.postalCode || '',
              city: person.city || '',
              hasEmploymentIncome: financialData.isEarningRegularIncome ?? null,
              incomeYear: financialData.prior_year || '',
              incomeYearAmount: safeFormatCurrencyForDisplay(financialData.prior_year_earning),
              incomeEndMonth: financialData.end_month_past12 || '',
              incomeEndYear: financialData.end_year_past12 || '',
              monthlyIncome: (() => {
                const monthlyIncome: Record<string, any> = {};
                const endMonth = parseInt(financialData?.end_month_past12 || '0');
                const endYear = parseInt(financialData?.end_year_past12 || '0');
                
                if (!isNaN(endMonth) && !isNaN(endYear)) {
                  // Add all 12 months
                  for (let i = 11; i >= 0; i--) {
                    const month = (endMonth - i + 12) % 12;
                    const year = endYear - (endMonth < i ? 1 : 0);
                    const key = `${year}-${month}`;
                    
                    // Map database fields to monthly income
                    const monthData = {
                      '0': financialData?.income_month1,
                      '1': financialData?.income_month2,
                      '2': financialData?.income_month3,
                      '3': financialData?.income_month4,
                      '4': financialData?.income_month5,
                      '5': financialData?.income_month6,
                      '6': financialData?.income_month7,
                      '7': financialData?.income_month8,
                      '8': financialData?.income_month9,
                      '9': financialData?.income_month10,
                      '10': financialData?.income_month11,
                      '11': financialData?.income_month12
                    }[11 - i];

                    monthlyIncome[key] = safeFormatCurrencyForDisplay(monthData);
                  }
                }
                return monthlyIncome;
              })(),
              sonderzuwendungenVergangen: {
                weihnachtsgeld: safeFormatCurrencyForDisplay(financialData.wheinachtsgeld_last12),
                urlaubsgeld: safeFormatCurrencyForDisplay(financialData.urlaubsgeld_last12),
                sonstige: safeFormatCurrencyForDisplay(financialData.otherincome_last12)
              },
              sonderzuwendungenKommend: {
                weihnachtsgeld: safeFormatCurrencyForDisplay(financialData.wheinachtsgeld_next12),
                urlaubsgeld: safeFormatCurrencyForDisplay(financialData.urlaubsgeld_next12),
                sonstige: safeFormatCurrencyForDisplay(financialData.otherincome_next12)
              },
              willChangeIncome: financialData?.willchangeincome ?? null,
              incomeChangeDate: financialData?.incomechangedate || '',
              willChangeIncrease: financialData?.willchangeincrease ?? null,
              newIncome: safeFormatCurrencyForDisplay(financialData.newincome),
              isNewIncomeMonthly: financialData?.isnewincomemonthly ?? null,
              newIncomeReason: financialData?.newincomereason || '',
              startEmployment: financialData?.startemployment || '',
              isContractLimited: financialData?.iscontractlimited ?? null,
              endOfContract: financialData?.endofcontract || '',
              werbungskosten: safeFormatCurrencyForDisplay(financialData?.werbungskosten),
              kinderbetreuungskosten: safeFormatCurrencyForDisplay(financialData?.kinderbetreuungskosten),
              ispayingincometax: financialData?.ispayingincometax,
              ispayinghealthinsurance: financialData?.ispayinghealthinsurance,
              ispayingpension: financialData?.ispayingpension,
              ispayingunterhalt: financialData?.ispayingunterhalt,
              unterhaltszahlungen: financialData?.unterhaltszahlungen || [],
              additionalIncomeChanges: financialData?.addition_change_inincome ? JSON.parse(financialData.addition_change_inincome) : initialAdditionalIncomeChanges,
              weitereEinkuenfte: {
                selectedTypes: ([
                  financialData?.haspensionincome ? 'renten' : null,
                  financialData?.hasrentincome ? 'vermietung' : null,
                  financialData?.hasbusinessincome ? 'gewerbe' : null,
                  financialData?.hasagricultureincome ? 'landforst' : null,
                  financialData?.hasothercome ? 'sonstige' : null,
                  financialData?.hastaxfreeunterhaltincome ? 'unterhaltsteuerfrei' : null,
                  financialData?.hastaxableunterhaltincome ? 'unterhaltsteuerpflichtig' : null,
                  financialData?.hasforeignincome ? 'ausland' : null,
                  financialData?.haspauschalincome ? 'pauschal' : null,
                  financialData?.hasablgincome ? 'arbeitslosengeld' : null,
                ].filter(Boolean)) as string[],
                renten: financialData?.haspensionincome ? { betrag: safeFormatCurrencyForDisplay(financialData.incomepension), turnus: 'monatlich' as const } : undefined,
                vermietung: financialData?.hasrentincome ? { betrag: safeFormatCurrencyForDisplay(financialData.incomerent), jahr: financialData.incomerentyear ? String(financialData.incomerentyear) : '' } : undefined,
                gewerbe: financialData?.hasbusinessincome ? { betrag: safeFormatCurrencyForDisplay(financialData.incomebusiness), jahr: financialData.incomebusinessyear ? String(financialData.incomebusinessyear) : '' } : undefined,
                landforst: financialData?.hasagricultureincome ? { betrag: safeFormatCurrencyForDisplay(financialData.incomeagriculture), jahr: financialData.incomeagricultureyear ? String(financialData.incomeagricultureyear) : '' } : undefined,
                sonstige: financialData?.hasothercome ? { betrag: safeFormatCurrencyForDisplay(financialData.incomeothers), jahr: financialData.incomeothersyear ? String(financialData.incomeothersyear) : '' } : undefined,
                unterhaltsteuerfrei: financialData?.hastaxfreeunterhaltincome ? { betrag: safeFormatCurrencyForDisplay(financialData.incomeunterhalttaxfree) } : undefined,
                unterhaltsteuerpflichtig: financialData?.hastaxableunterhaltincome ? { betrag: safeFormatCurrencyForDisplay(financialData.incomeunterhalttaxable) } : undefined,
                ausland: financialData?.hasforeignincome ? { betrag: safeFormatCurrencyForDisplay(financialData.incomeforeign), jahr: financialData.incomeforeignyear ? String(financialData.incomeforeignyear) : '', turnus: (financialData.incomeforeignmonthly ? 'monatlich' : 'jährlich') as 'monatlich' | 'jährlich' } : undefined,
                pauschal: financialData?.haspauschalincome ? { betrag: safeFormatCurrencyForDisplay(financialData.incomepauschal), turnus: 'monatlich' as const } : undefined,
                arbeitslosengeld: financialData?.hasablgincome && (financialData.incomealbgtype === 0 || financialData.incomealbgtype === 1 || financialData.incomealbgtype === 2)
                  ? {
                      betrag: safeFormatCurrencyForDisplay(financialData.incomeablg),
                      turnus: (financialData.incomealbgtype === 0 ? 'täglich' : financialData.incomealbgtype === 1 ? 'monatlich' : 'jährlich') as 'täglich' | 'monatlich' | 'jährlich',
                    }
                  : undefined,
              },
              finanzamt: financialData?.finanzamt || '',
              steuerid: financialData?.steuerid || '',
            };
          });

          console.log('Final mergedApplicants:', mergedApplicants);
          setAdditionalApplicants(mergedApplicants);
        }

        setHasUnsavedChanges(false);
      } catch (error) {
        console.error('Error loading saved data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedData();
  }, [user?.id, residentId]);

  // Save data to Supabase
  const saveData = async (navigateAfterSave: boolean = false) => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found');
        return;
      }

      // Ensure user_financials table exists for the user
      try {
        await ensureUserFinancialsExists(user.id);
      } catch (financialsError) {
        console.warn('Failed to ensure user_financials exists, continuing with save:', financialsError);
        // Continue with save even if user_financials creation fails
      }

      // Calculate progress
      const einkommenserklarungProgress = calculateProgress();
      console.log('Progress calculation completed:', einkommenserklarungProgress);

      // First, get existing user data to preserve other fields
      const { data: existingUserData, error: fetchError } = await supabase
        .from('user_data')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        console.error('Error fetching existing user data:', fetchError);
        return;
      }

      // Get existing financial data to preserve fields from other forms (like unterhaltszahlungenTotal from Selbstauskunft)
      const { data: existingFinancialData, error: fetchFinancialError } = await supabase
        .from('user_financials')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchFinancialError && fetchFinancialError.code !== 'PGRST116') {
        console.error('Error fetching existing financial data:', fetchFinancialError);
        return;
      }

      // Update user_data with personal information
      const { error: userError } = await supabase
        .from('user_data')
        .update({
          // Main applicant data
          title: mainFinancials.title,
          firstname: mainFinancials.firstName,
          lastname: mainFinancials.lastName,
          person_street: mainFinancials.street,
          person_housenumber: mainFinancials.houseNumber,
          person_postalcode: mainFinancials.postalCode,
          person_city: mainFinancials.city,
          einkommenserklarung_progress: einkommenserklarungProgress,
          
          // Additional applicants data - preserve existing data and only update address fields
          weitere_antragstellende_personen: (() => {
            // Work with UUID-based structure
            const existingPersonsObj = existingUserData?.weitere_antragstellende_personen || {};
            const updatedPersonsObj = { ...existingPersonsObj };
            
            // Handle backwards compatibility: convert array to UUID-based object if needed
            if (Array.isArray(existingPersonsObj)) {
              // Legacy array format - convert to UUID-based object
              existingPersonsObj.forEach((person: any, index: number) => {
                const uuid = person.id || `legacy_${index}`;
                updatedPersonsObj[uuid] = { ...person, id: uuid };
              });
            }

            // Update with current additional applicants data
            additionalApplicants.forEach(applicant => {
              const uuid = applicant.originalPersonId || generateUUID();
              const existingPerson = updatedPersonsObj[uuid] || {};
              
              updatedPersonsObj[uuid] = {
                ...existingPerson, // Preserve all existing fields
                id: uuid,
                title: applicant.title,
                firstName: applicant.firstName,
                lastName: applicant.lastName,
                street: applicant.street,
                houseNumber: applicant.houseNumber,
                postalCode: applicant.postalCode,
                city: applicant.city,
              };
            });

            return Object.keys(updatedPersonsObj).length > 0 ? updatedPersonsObj : null;
          })()
        })
        .eq('id', user.id);

      if (userError) throw userError;

      // Prepare the main applicant data
      const mainApplicantData = {
        user_id: user.id,
        isEarningRegularIncome: mainFinancials.hasEmploymentIncome,
        prior_year: mainFinancials.hasEmploymentIncome ? mainFinancials.incomeYear : null,
        prior_year_earning: mainFinancials.hasEmploymentIncome ? (mainFinancials.incomeYearAmount ? safeFormatCurrencyForDatabase(mainFinancials.incomeYearAmount) : null) : null,
        end_month_past12: mainFinancials.hasEmploymentIncome ? mainFinancials.incomeEndMonth : null,
        end_year_past12: mainFinancials.hasEmploymentIncome ? mainFinancials.incomeEndYear : null,
        income_month1: mainFinancials.hasEmploymentIncome ? (() => {
          const month = (parseInt(mainFinancials.incomeEndMonth) - 11 + 12) % 12;
          const year = parseInt(mainFinancials.incomeEndYear) - (parseInt(mainFinancials.incomeEndMonth) < 11 ? 1 : 0);
          return mainFinancials.monthlyIncome?.[`${year}-${month}`] ? safeFormatCurrencyForDatabase(mainFinancials.monthlyIncome[`${year}-${month}`]) : null;
        })() : null,
        income_month2: mainFinancials.hasEmploymentIncome ? (() => {
          const month = (parseInt(mainFinancials.incomeEndMonth) - 10 + 12) % 12;
          const year = parseInt(mainFinancials.incomeEndYear) - (parseInt(mainFinancials.incomeEndMonth) < 10 ? 1 : 0);
          return mainFinancials.monthlyIncome?.[`${year}-${month}`] ? safeFormatCurrencyForDatabase(mainFinancials.monthlyIncome[`${year}-${month}`]) : null;
        })() : null,
        income_month3: mainFinancials.hasEmploymentIncome ? (() => {
          const month = (parseInt(mainFinancials.incomeEndMonth) - 9 + 12) % 12;
          const year = parseInt(mainFinancials.incomeEndYear) - (parseInt(mainFinancials.incomeEndMonth) < 9 ? 1 : 0);
          return mainFinancials.monthlyIncome?.[`${year}-${month}`] ? safeFormatCurrencyForDatabase(mainFinancials.monthlyIncome[`${year}-${month}`]) : null;
        })() : null,
        income_month4: mainFinancials.hasEmploymentIncome ? (() => {
          const month = (parseInt(mainFinancials.incomeEndMonth) - 8 + 12) % 12;
          const year = parseInt(mainFinancials.incomeEndYear) - (parseInt(mainFinancials.incomeEndMonth) < 8 ? 1 : 0);
          return mainFinancials.monthlyIncome?.[`${year}-${month}`] ? safeFormatCurrencyForDatabase(mainFinancials.monthlyIncome[`${year}-${month}`]) : null;
        })() : null,
        income_month5: mainFinancials.hasEmploymentIncome ? (() => {
          const month = (parseInt(mainFinancials.incomeEndMonth) - 7 + 12) % 12;
          const year = parseInt(mainFinancials.incomeEndYear) - (parseInt(mainFinancials.incomeEndMonth) < 7 ? 1 : 0);
          return mainFinancials.monthlyIncome?.[`${year}-${month}`] ? safeFormatCurrencyForDatabase(mainFinancials.monthlyIncome[`${year}-${month}`]) : null;
        })() : null,
        income_month6: mainFinancials.hasEmploymentIncome ? (() => {
          const month = (parseInt(mainFinancials.incomeEndMonth) - 6 + 12) % 12;
          const year = parseInt(mainFinancials.incomeEndYear) - (parseInt(mainFinancials.incomeEndMonth) < 6 ? 1 : 0);
          return mainFinancials.monthlyIncome?.[`${year}-${month}`] ? safeFormatCurrencyForDatabase(mainFinancials.monthlyIncome[`${year}-${month}`]) : null;
        })() : null,
        income_month7: mainFinancials.hasEmploymentIncome ? (() => {
          const month = (parseInt(mainFinancials.incomeEndMonth) - 5 + 12) % 12;
          const year = parseInt(mainFinancials.incomeEndYear) - (parseInt(mainFinancials.incomeEndMonth) < 5 ? 1 : 0);
          return mainFinancials.monthlyIncome?.[`${year}-${month}`] ? safeFormatCurrencyForDatabase(mainFinancials.monthlyIncome[`${year}-${month}`]) : null;
        })() : null,
        income_month8: mainFinancials.hasEmploymentIncome ? (() => {
          const month = (parseInt(mainFinancials.incomeEndMonth) - 4 + 12) % 12;
          const year = parseInt(mainFinancials.incomeEndYear) - (parseInt(mainFinancials.incomeEndMonth) < 4 ? 1 : 0);
          return mainFinancials.monthlyIncome?.[`${year}-${month}`] ? safeFormatCurrencyForDatabase(mainFinancials.monthlyIncome[`${year}-${month}`]) : null;
        })() : null,
        income_month9: mainFinancials.hasEmploymentIncome ? (() => {
          const month = (parseInt(mainFinancials.incomeEndMonth) - 3 + 12) % 12;
          const year = parseInt(mainFinancials.incomeEndYear) - (parseInt(mainFinancials.incomeEndMonth) < 3 ? 1 : 0);
          return mainFinancials.monthlyIncome?.[`${year}-${month}`] ? safeFormatCurrencyForDatabase(mainFinancials.monthlyIncome[`${year}-${month}`]) : null;
        })() : null,
        income_month10: mainFinancials.hasEmploymentIncome ? (() => {
          const month = (parseInt(mainFinancials.incomeEndMonth) - 2 + 12) % 12;
          const year = parseInt(mainFinancials.incomeEndYear) - (parseInt(mainFinancials.incomeEndMonth) < 2 ? 1 : 0);
          return mainFinancials.monthlyIncome?.[`${year}-${month}`] ? safeFormatCurrencyForDatabase(mainFinancials.monthlyIncome[`${year}-${month}`]) : null;
        })() : null,
        income_month11: mainFinancials.hasEmploymentIncome ? (() => {
          const month = (parseInt(mainFinancials.incomeEndMonth) - 1 + 12) % 12;
          const year = parseInt(mainFinancials.incomeEndYear) - (parseInt(mainFinancials.incomeEndMonth) < 1 ? 1 : 0);
          return mainFinancials.monthlyIncome?.[`${year}-${month}`] ? safeFormatCurrencyForDatabase(mainFinancials.monthlyIncome[`${year}-${month}`]) : null;
        })() : null,
        income_month12: mainFinancials.hasEmploymentIncome ? (() => {
          const month = parseInt(mainFinancials.incomeEndMonth);
          const year = parseInt(mainFinancials.incomeEndYear);
          return mainFinancials.monthlyIncome?.[`${year}-${month}`] ? safeFormatCurrencyForDatabase(mainFinancials.monthlyIncome[`${year}-${month}`]) : null;
        })() : null,
        wheinachtsgeld_last12: mainFinancials.hasEmploymentIncome ? (mainFinancials.sonderzuwendungenVergangen?.weihnachtsgeld ? safeFormatCurrencyForDatabase(mainFinancials.sonderzuwendungenVergangen.weihnachtsgeld) : null) : null,
        wheinachtsgeld_next12: mainFinancials.hasEmploymentIncome ? (mainFinancials.sonderzuwendungenKommend?.weihnachtsgeld ? safeFormatCurrencyForDatabase(mainFinancials.sonderzuwendungenKommend.weihnachtsgeld) : null) : null,
        urlaubsgeld_last12: mainFinancials.hasEmploymentIncome ? (mainFinancials.sonderzuwendungenVergangen?.urlaubsgeld ? safeFormatCurrencyForDatabase(mainFinancials.sonderzuwendungenVergangen.urlaubsgeld) : null) : null,
        urlaubsgeld_next12: mainFinancials.hasEmploymentIncome ? (mainFinancials.sonderzuwendungenKommend?.urlaubsgeld ? safeFormatCurrencyForDatabase(mainFinancials.sonderzuwendungenKommend.urlaubsgeld) : null) : null,
        otherincome_last12: mainFinancials.hasEmploymentIncome ? (mainFinancials.sonderzuwendungenVergangen?.sonstige ? safeFormatCurrencyForDatabase(mainFinancials.sonderzuwendungenVergangen.sonstige) : null) : null,
        otherincome_next12: mainFinancials.hasEmploymentIncome ? (mainFinancials.sonderzuwendungenKommend?.sonstige ? safeFormatCurrencyForDatabase(mainFinancials.sonderzuwendungenKommend.sonstige) : null) : null,
        willchangeincome: mainFinancials.hasEmploymentIncome ? mainFinancials.willChangeIncome : null,
        incomechangedate: (mainFinancials.hasEmploymentIncome && mainFinancials.willChangeIncome) ? (mainFinancials.incomeChangeDate || null) : null,
        willchangeincrease: (mainFinancials.hasEmploymentIncome && mainFinancials.willChangeIncome) ? mainFinancials.willChangeIncrease : null,
        newincome: (mainFinancials.hasEmploymentIncome && mainFinancials.willChangeIncome) ? (mainFinancials.newIncome ? safeFormatCurrencyForDatabase(mainFinancials.newIncome) : null) : null,
        isnewincomemonthly: (mainFinancials.hasEmploymentIncome && mainFinancials.willChangeIncome) ? mainFinancials.isNewIncomeMonthly : null,
        newincomereason: (mainFinancials.hasEmploymentIncome && mainFinancials.willChangeIncome) ? (mainFinancials.newIncomeReason || null) : null,
        startemployment: mainFinancials.hasEmploymentIncome ? (mainFinancials.startEmployment || null) : null,
        iscontractlimited: mainFinancials.hasEmploymentIncome ? mainFinancials.isContractLimited : null,
        endofcontract: (mainFinancials.hasEmploymentIncome && mainFinancials.isContractLimited) ? (mainFinancials.endOfContract || null) : null,
        haspensionincome: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('renten') || false,
        incomepension: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('renten')
          ? (mainFinancials.weitereEinkuenfte?.renten?.betrag ? safeFormatCurrencyForDatabase(mainFinancials.weitereEinkuenfte.renten.betrag) : null)
          : null,
        hasrentincome: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('vermietung') || false,
        incomerent: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('vermietung')
          ? (mainFinancials.weitereEinkuenfte?.vermietung?.betrag ? safeFormatCurrencyForDatabase(mainFinancials.weitereEinkuenfte.vermietung.betrag) : null)
          : null,
        incomerentyear: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('vermietung')
          ? (mainFinancials.weitereEinkuenfte?.vermietung?.jahr || null)
          : null,
        hasbusinessincome: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('gewerbe') || false,
        incomebusiness: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('gewerbe')
          ? (mainFinancials.weitereEinkuenfte?.gewerbe?.betrag ? safeFormatCurrencyForDatabase(mainFinancials.weitereEinkuenfte.gewerbe.betrag) : null)
          : null,
        incomebusinessyear: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('gewerbe')
          ? (mainFinancials.weitereEinkuenfte?.gewerbe?.jahr || null)
          : null,
        hasagricultureincome: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('landforst') || false,
        incomeagriculture: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('landforst')
          ? (mainFinancials.weitereEinkuenfte?.landforst?.betrag ? safeFormatCurrencyForDatabase(mainFinancials.weitereEinkuenfte.landforst.betrag) : null)
          : null,
        incomeagricultureyear: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('landforst')
          ? (mainFinancials.weitereEinkuenfte?.landforst?.jahr || null)
          : null,
        hasothercome: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('sonstige') || false,
        incomeothers: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('sonstige')
          ? (mainFinancials.weitereEinkuenfte?.sonstige?.betrag ? safeFormatCurrencyForDatabase(mainFinancials.weitereEinkuenfte.sonstige.betrag) : null)
          : null,
        incomeothersyear: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('sonstige')
          ? (mainFinancials.weitereEinkuenfte?.sonstige?.jahr || null)
          : null,
        hastaxfreeunterhaltincome: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('unterhaltsteuerfrei') || false,
        incomeunterhalttaxfree: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('unterhaltsteuerfrei')
          ? (mainFinancials.weitereEinkuenfte?.unterhaltsteuerfrei?.betrag ? safeFormatCurrencyForDatabase(mainFinancials.weitereEinkuenfte.unterhaltsteuerfrei.betrag) : null)
          : null,
        hastaxableunterhaltincome: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('unterhaltsteuerpflichtig') || false,
        incomeunterhalttaxable: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('unterhaltsteuerpflichtig')
          ? (mainFinancials.weitereEinkuenfte?.unterhaltsteuerpflichtig?.betrag ? safeFormatCurrencyForDatabase(mainFinancials.weitereEinkuenfte.unterhaltsteuerpflichtig.betrag) : null)
          : null,
        hasforeignincome: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('ausland') || false,
        incomeforeign: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('ausland')
          ? (mainFinancials.weitereEinkuenfte?.ausland?.betrag ? safeFormatCurrencyForDatabase(mainFinancials.weitereEinkuenfte.ausland.betrag) : null)
          : null,
        incomeforeignyear: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('ausland') && mainFinancials.weitereEinkuenfte?.ausland?.turnus === 'jährlich'
          ? (mainFinancials.weitereEinkuenfte?.ausland?.jahr || null)
          : null,
        incomeforeignmonthly: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('ausland')
          ? (mainFinancials.weitereEinkuenfte?.ausland?.turnus === 'monatlich' ? true : mainFinancials.weitereEinkuenfte?.ausland?.turnus === 'jährlich' ? false : null)
          : null,
        haspauschalincome: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('pauschal') || false,
        incomepauschal: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('pauschal')
          ? (mainFinancials.weitereEinkuenfte?.pauschal?.betrag ? safeFormatCurrencyForDatabase(mainFinancials.weitereEinkuenfte.pauschal.betrag) : null)
          : null,
        hasablgincome: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('arbeitslosengeld') || false,
        incomeablg: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('arbeitslosengeld')
          ? (mainFinancials.weitereEinkuenfte?.arbeitslosengeld?.betrag ? safeFormatCurrencyForDatabase(mainFinancials.weitereEinkuenfte.arbeitslosengeld.betrag) : null)
          : null,
        incomealbgtype: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('arbeitslosengeld')
          ? (mainFinancials.weitereEinkuenfte?.arbeitslosengeld?.turnus === 'täglich' ? 0 : mainFinancials.weitereEinkuenfte?.arbeitslosengeld?.turnus === 'monatlich' ? 1 : mainFinancials.weitereEinkuenfte?.arbeitslosengeld?.turnus === 'jährlich' ? 2 : null)
          : null,
        // Add new fields
        werbungskosten: mainFinancials.werbungskosten ? safeFormatCurrencyForDatabase(mainFinancials.werbungskosten) : null,
        kinderbetreuungskosten: mainFinancials.kinderbetreuungskosten ? safeFormatCurrencyForDatabase(mainFinancials.kinderbetreuungskosten) : null,
        ispayingincometax: mainFinancials.ispayingincometax,
        ispayinghealthinsurance: mainFinancials.ispayinghealthinsurance,
        ispayingpension: mainFinancials.ispayingpension,
        ispayingunterhalt: mainFinancials.ispayingunterhalt,
        unterhaltszahlungen: mainFinancials.unterhaltszahlungen || [],
        addition_change_inincome: mainFinancials.additionalIncomeChanges ? JSON.stringify(mainFinancials.additionalIncomeChanges) : null,
        finanzamt: mainFinancials.finanzamt || null,
        steuerid: mainFinancials.steuerid || null,
      };

      // Prepare additional applicants data
      const additionalApplicantsData = additionalApplicants.map(applicant => ({
        isEarningRegularIncome: applicant.hasEmploymentIncome,
        prior_year: applicant.hasEmploymentIncome ? applicant.incomeYear : null,
        prior_year_earning: applicant.hasEmploymentIncome ? (applicant.incomeYearAmount ? safeFormatCurrencyForDatabase(applicant.incomeYearAmount) : null) : null,
        end_month_past12: applicant.hasEmploymentIncome ? applicant.incomeEndMonth : null,
        end_year_past12: applicant.hasEmploymentIncome ? applicant.incomeEndYear : null,
        income_month1: applicant.hasEmploymentIncome ? (() => {
          const month = (parseInt(applicant.incomeEndMonth) - 11 + 12) % 12;
          const year = parseInt(applicant.incomeEndYear) - (parseInt(applicant.incomeEndMonth) < 11 ? 1 : 0);
          return applicant.monthlyIncome?.[`${year}-${month}`] ? safeFormatCurrencyForDatabase(applicant.monthlyIncome[`${year}-${month}`]) : null;
        })() : null,
        income_month2: applicant.hasEmploymentIncome ? (() => {
          const month = (parseInt(applicant.incomeEndMonth) - 10 + 12) % 12;
          const year = parseInt(applicant.incomeEndYear) - (parseInt(applicant.incomeEndMonth) < 10 ? 1 : 0);
          return applicant.monthlyIncome?.[`${year}-${month}`] ? safeFormatCurrencyForDatabase(applicant.monthlyIncome[`${year}-${month}`]) : null;
        })() : null,
        income_month3: applicant.hasEmploymentIncome ? (() => {
          const month = (parseInt(applicant.incomeEndMonth) - 9 + 12) % 12;
          const year = parseInt(applicant.incomeEndYear) - (parseInt(applicant.incomeEndMonth) < 9 ? 1 : 0);
          return applicant.monthlyIncome?.[`${year}-${month}`] ? safeFormatCurrencyForDatabase(applicant.monthlyIncome[`${year}-${month}`]) : null;
        })() : null,
        income_month4: applicant.hasEmploymentIncome ? (() => {
          const month = (parseInt(applicant.incomeEndMonth) - 8 + 12) % 12;
          const year = parseInt(applicant.incomeEndYear) - (parseInt(applicant.incomeEndMonth) < 8 ? 1 : 0);
          return applicant.monthlyIncome?.[`${year}-${month}`] ? safeFormatCurrencyForDatabase(applicant.monthlyIncome[`${year}-${month}`]) : null;
        })() : null,
        income_month5: applicant.hasEmploymentIncome ? (() => {
          const month = (parseInt(applicant.incomeEndMonth) - 7 + 12) % 12;
          const year = parseInt(applicant.incomeEndYear) - (parseInt(applicant.incomeEndMonth) < 7 ? 1 : 0);
          return applicant.monthlyIncome?.[`${year}-${month}`] ? safeFormatCurrencyForDatabase(applicant.monthlyIncome[`${year}-${month}`]) : null;
        })() : null,
        income_month6: applicant.hasEmploymentIncome ? (() => {
          const month = (parseInt(applicant.incomeEndMonth) - 6 + 12) % 12;
          const year = parseInt(applicant.incomeEndYear) - (parseInt(applicant.incomeEndMonth) < 6 ? 1 : 0);
          return applicant.monthlyIncome?.[`${year}-${month}`] ? safeFormatCurrencyForDatabase(applicant.monthlyIncome[`${year}-${month}`]) : null;
        })() : null,
        income_month7: applicant.hasEmploymentIncome ? (() => {
          const month = (parseInt(applicant.incomeEndMonth) - 5 + 12) % 12;
          const year = parseInt(applicant.incomeEndYear) - (parseInt(applicant.incomeEndMonth) < 5 ? 1 : 0);
          return applicant.monthlyIncome?.[`${year}-${month}`] ? safeFormatCurrencyForDatabase(applicant.monthlyIncome[`${year}-${month}`]) : null;
        })() : null,
        income_month8: applicant.hasEmploymentIncome ? (() => {
          const month = (parseInt(applicant.incomeEndMonth) - 4 + 12) % 12;
          const year = parseInt(applicant.incomeEndYear) - (parseInt(applicant.incomeEndMonth) < 4 ? 1 : 0);
          return applicant.monthlyIncome?.[`${year}-${month}`] ? safeFormatCurrencyForDatabase(applicant.monthlyIncome[`${year}-${month}`]) : null;
        })() : null,
        income_month9: applicant.hasEmploymentIncome ? (() => {
          const month = (parseInt(applicant.incomeEndMonth) - 3 + 12) % 12;
          const year = parseInt(applicant.incomeEndYear) - (parseInt(applicant.incomeEndMonth) < 3 ? 1 : 0);
          return applicant.monthlyIncome?.[`${year}-${month}`] ? safeFormatCurrencyForDatabase(applicant.monthlyIncome[`${year}-${month}`]) : null;
        })() : null,
        income_month10: applicant.hasEmploymentIncome ? (() => {
          const month = (parseInt(applicant.incomeEndMonth) - 2 + 12) % 12;
          const year = parseInt(applicant.incomeEndYear) - (parseInt(applicant.incomeEndMonth) < 2 ? 1 : 0);
          return applicant.monthlyIncome?.[`${year}-${month}`] ? safeFormatCurrencyForDatabase(applicant.monthlyIncome[`${year}-${month}`]) : null;
        })() : null,
        income_month11: applicant.hasEmploymentIncome ? (() => {
          const month = (parseInt(applicant.incomeEndMonth) - 1 + 12) % 12;
          const year = parseInt(applicant.incomeEndYear) - (parseInt(applicant.incomeEndMonth) < 1 ? 1 : 0);
          return applicant.monthlyIncome?.[`${year}-${month}`] ? safeFormatCurrencyForDatabase(applicant.monthlyIncome[`${year}-${month}`]) : null;
        })() : null,
        income_month12: applicant.hasEmploymentIncome ? (() => {
          const month = parseInt(applicant.incomeEndMonth);
          const year = parseInt(applicant.incomeEndYear);
          return applicant.monthlyIncome?.[`${year}-${month}`] ? safeFormatCurrencyForDatabase(applicant.monthlyIncome[`${year}-${month}`]) : null;
        })() : null,
        wheinachtsgeld_last12: applicant.hasEmploymentIncome ? (applicant.sonderzuwendungenVergangen?.weihnachtsgeld ? safeFormatCurrencyForDatabase(applicant.sonderzuwendungenVergangen.weihnachtsgeld) : null) : null,
        wheinachtsgeld_next12: applicant.hasEmploymentIncome ? (applicant.sonderzuwendungenKommend?.weihnachtsgeld ? safeFormatCurrencyForDatabase(applicant.sonderzuwendungenKommend.weihnachtsgeld) : null) : null,
        urlaubsgeld_last12: applicant.hasEmploymentIncome ? (applicant.sonderzuwendungenVergangen?.urlaubsgeld ? safeFormatCurrencyForDatabase(applicant.sonderzuwendungenVergangen.urlaubsgeld) : null) : null,
        urlaubsgeld_next12: applicant.hasEmploymentIncome ? (applicant.sonderzuwendungenKommend?.urlaubsgeld ? safeFormatCurrencyForDatabase(applicant.sonderzuwendungenKommend.urlaubsgeld) : null) : null,
        otherincome_last12: applicant.hasEmploymentIncome ? (applicant.sonderzuwendungenVergangen?.sonstige ? safeFormatCurrencyForDatabase(applicant.sonderzuwendungenVergangen.sonstige) : null) : null,
        otherincome_next12: applicant.hasEmploymentIncome ? (applicant.sonderzuwendungenKommend?.sonstige ? safeFormatCurrencyForDatabase(applicant.sonderzuwendungenKommend.sonstige) : null) : null,
        willchangeincome: applicant.hasEmploymentIncome ? applicant.willChangeIncome : null,
        incomechangedate: (applicant.hasEmploymentIncome && applicant.willChangeIncome) ? (applicant.incomeChangeDate || null) : null,
        willchangeincrease: (applicant.hasEmploymentIncome && applicant.willChangeIncome) ? applicant.willChangeIncrease : null,
        newincome: (applicant.hasEmploymentIncome && applicant.willChangeIncome) ? (applicant.newIncome ? safeFormatCurrencyForDatabase(applicant.newIncome) : null) : null,
        isnewincomemonthly: (applicant.hasEmploymentIncome && applicant.willChangeIncome) ? applicant.isNewIncomeMonthly : null,
        newincomereason: (applicant.hasEmploymentIncome && applicant.willChangeIncome) ? (applicant.newIncomeReason || null) : null,
        startemployment: applicant.hasEmploymentIncome ? (applicant.startEmployment || null) : null,
        iscontractlimited: applicant.hasEmploymentIncome ? applicant.isContractLimited : null,
        endofcontract: (applicant.hasEmploymentIncome && applicant.isContractLimited) ? (applicant.endOfContract || null) : null,
        haspensionincome: applicant.weitereEinkuenfte?.selectedTypes?.includes('renten') || false,
        incomepension: applicant.weitereEinkuenfte?.selectedTypes?.includes('renten')
          ? (applicant.weitereEinkuenfte?.renten?.betrag ? safeFormatCurrencyForDatabase(applicant.weitereEinkuenfte.renten.betrag) : null)
          : null,
        hasrentincome: applicant.weitereEinkuenfte?.selectedTypes?.includes('vermietung') || false,
        incomerent: applicant.weitereEinkuenfte?.selectedTypes?.includes('vermietung')
          ? (applicant.weitereEinkuenfte?.vermietung?.betrag ? safeFormatCurrencyForDatabase(applicant.weitereEinkuenfte.vermietung.betrag) : null)
          : null,
        incomerentyear: applicant.weitereEinkuenfte?.selectedTypes?.includes('vermietung')
          ? (applicant.weitereEinkuenfte?.vermietung?.jahr || null)
          : null,
        hasbusinessincome: applicant.weitereEinkuenfte?.selectedTypes?.includes('gewerbe') || false,
        incomebusiness: applicant.weitereEinkuenfte?.selectedTypes?.includes('gewerbe')
          ? (applicant.weitereEinkuenfte?.gewerbe?.betrag ? safeFormatCurrencyForDatabase(applicant.weitereEinkuenfte.gewerbe.betrag) : null)
          : null,
        incomebusinessyear: applicant.weitereEinkuenfte?.selectedTypes?.includes('gewerbe')
          ? (applicant.weitereEinkuenfte?.gewerbe?.jahr || null)
          : null,
        hasagricultureincome: applicant.weitereEinkuenfte?.selectedTypes?.includes('landforst') || false,
        incomeagriculture: applicant.weitereEinkuenfte?.selectedTypes?.includes('landforst')
          ? (applicant.weitereEinkuenfte?.landforst?.betrag ? safeFormatCurrencyForDatabase(applicant.weitereEinkuenfte.landforst.betrag) : null)
          : null,
        incomeagricultureyear: applicant.weitereEinkuenfte?.selectedTypes?.includes('landforst')
          ? (applicant.weitereEinkuenfte?.landforst?.jahr || null)
          : null,
        hasothercome: applicant.weitereEinkuenfte?.selectedTypes?.includes('sonstige') || false,
        incomeothers: applicant.weitereEinkuenfte?.selectedTypes?.includes('sonstige')
          ? (applicant.weitereEinkuenfte?.sonstige?.betrag ? safeFormatCurrencyForDatabase(applicant.weitereEinkuenfte.sonstige.betrag) : null)
          : null,
        incomeothersyear: applicant.weitereEinkuenfte?.selectedTypes?.includes('sonstige')
          ? (applicant.weitereEinkuenfte?.sonstige?.jahr || null)
          : null,
        hastaxfreeunterhaltincome: applicant.weitereEinkuenfte?.selectedTypes?.includes('unterhaltsteuerfrei') || false,
        incomeunterhalttaxfree: applicant.weitereEinkuenfte?.selectedTypes?.includes('unterhaltsteuerfrei')
          ? (applicant.weitereEinkuenfte?.unterhaltsteuerfrei?.betrag ? safeFormatCurrencyForDatabase(applicant.weitereEinkuenfte.unterhaltsteuerfrei.betrag) : null)
          : null,
        hastaxableunterhaltincome: applicant.weitereEinkuenfte?.selectedTypes?.includes('unterhaltsteuerpflichtig') || false,
        incomeunterhalttaxable: applicant.weitereEinkuenfte?.selectedTypes?.includes('unterhaltsteuerpflichtig')
          ? (applicant.weitereEinkuenfte?.unterhaltsteuerpflichtig?.betrag ? safeFormatCurrencyForDatabase(applicant.weitereEinkuenfte.unterhaltsteuerpflichtig.betrag) : null)
          : null,
        hasforeignincome: applicant.weitereEinkuenfte?.selectedTypes?.includes('ausland') || false,
        incomeforeign: applicant.weitereEinkuenfte?.selectedTypes?.includes('ausland')
          ? (applicant.weitereEinkuenfte?.ausland?.betrag ? safeFormatCurrencyForDatabase(applicant.weitereEinkuenfte.ausland.betrag) : null)
          : null,
        incomeforeignyear: applicant.weitereEinkuenfte?.selectedTypes?.includes('ausland') && applicant.weitereEinkuenfte?.ausland?.turnus === 'jährlich'
          ? (applicant.weitereEinkuenfte?.ausland?.jahr || null)
          : null,
        incomeforeignmonthly: applicant.weitereEinkuenfte?.selectedTypes?.includes('ausland')
          ? (applicant.weitereEinkuenfte?.ausland?.turnus === 'monatlich' ? true : applicant.weitereEinkuenfte?.ausland?.turnus === 'jährlich' ? false : null)
          : null,
        haspauschalincome: applicant.weitereEinkuenfte?.selectedTypes?.includes('pauschal') || false,
        incomepauschal: applicant.weitereEinkuenfte?.selectedTypes?.includes('pauschal')
          ? (applicant.weitereEinkuenfte?.pauschal?.betrag ? safeFormatCurrencyForDatabase(applicant.weitereEinkuenfte.pauschal.betrag) : null)
          : null,
        hasablgincome: applicant.weitereEinkuenfte?.selectedTypes?.includes('arbeitslosengeld') || false,
        incomeablg: applicant.weitereEinkuenfte?.selectedTypes?.includes('arbeitslosengeld')
          ? (applicant.weitereEinkuenfte?.arbeitslosengeld?.betrag ? safeFormatCurrencyForDatabase(applicant.weitereEinkuenfte.arbeitslosengeld.betrag) : null)
          : null,
        incomealbgtype: applicant.weitereEinkuenfte?.selectedTypes?.includes('arbeitslosengeld')
          ? (applicant.weitereEinkuenfte?.arbeitslosengeld?.turnus === 'täglich' ? 0 : applicant.weitereEinkuenfte?.arbeitslosengeld?.turnus === 'monatlich' ? 1 : applicant.weitereEinkuenfte?.arbeitslosengeld?.turnus === 'jährlich' ? 2 : null)
          : null,
        // Add new fields
        werbungskosten: applicant.werbungskosten ? safeFormatCurrencyForDatabase(applicant.werbungskosten) : null,
        kinderbetreuungskosten: applicant.kinderbetreuungskosten ? safeFormatCurrencyForDatabase(applicant.kinderbetreuungskosten) : null,
        ispayingincometax: applicant.ispayingincometax,
        ispayinghealthinsurance: applicant.ispayinghealthinsurance,
        ispayingpension: applicant.ispayingpension,
        ispayingunterhalt: applicant.ispayingunterhalt,
        unterhaltszahlungen: applicant.unterhaltszahlungen || [],
        addition_change_inincome: applicant.additionalIncomeChanges ? JSON.stringify(applicant.additionalIncomeChanges) : null,
        finanzamt: applicant.finanzamt || null,
        steuerid: applicant.steuerid || null,
      }));

      // Merge with existing data to preserve fields from Selbstauskunft (like unterhaltszahlungenTotal)
      const updateData = {
        ...existingFinancialData, // Preserve all existing data
        ...mainApplicantData, // Override with Einkommenserklaerung data
        additional_applicants_financials: (() => {
          // Prepare UUID-based additional_applicants_financials object
          const existingAdditionalFinancials = existingFinancialData?.additional_applicants_financials || {};
          let updatedAdditionalFinancials: Record<string, any> = {};
          
          // Handle backwards compatibility: convert array to UUID-based object if needed
          if (Array.isArray(existingAdditionalFinancials)) {
            // Legacy array format - convert to UUID-based object using person UUIDs
            const personUuids = Object.keys(existingUserData?.weitere_antragstellende_personen || {});
            existingAdditionalFinancials.forEach((fin: any, index: number) => {
              if (personUuids[index]) {
                updatedAdditionalFinancials[personUuids[index]] = fin;
              }
            });
          } else {
            // Already UUID-based object format
            updatedAdditionalFinancials = { ...existingAdditionalFinancials };
          }

          // Update with current additional applicants financial data
          additionalApplicants.forEach(applicant => {
            const uuid = applicant.originalPersonId || generateUUID();
            const existingFinancialData = updatedAdditionalFinancials[uuid] || {};
            const newFinancialData = additionalApplicantsData.find((_, index) => 
              additionalApplicants[index].originalPersonId === uuid
            ) || {};
            
            updatedAdditionalFinancials[uuid] = {
              ...existingFinancialData, // Preserve existing financial data from other forms
              ...newFinancialData // Override with new Einkommenserklaerung data
            };
          });

          return Object.keys(updatedAdditionalFinancials).length > 0 ? updatedAdditionalFinancials : null;
        })()
      };

      // Save main applicant data and additional applicants financial data
      const { error: mainError } = await supabase
        .from('user_financials')
        .upsert(updateData);

      if (mainError) {
        console.error('Error saving main applicant data:', mainError);
        return;
      }

      // Backup save to localStorage
      localStorage.setItem('einkommenserklaerung_data', JSON.stringify({
        mainFinancials,
        additionalApplicants
      }));

      setHasUnsavedChanges(false);
      setShowModal(true);

      if (navigateAfterSave) {
        navigate('/personal-space');
      }
    } catch (error) {
      console.error('Error saving data:', error);
    } finally {
      setIsLoading(false);
    }
  };

   // State for info modal
   const [showInfoModal, setShowInfoModal] = useState(false);
   const [infoModalType, setInfoModalType] = useState<'add' | 'remove'>('add');

  const handleAddApplicant = () => {
   /* setAdditionalApplicants([
      ...additionalApplicants,
      {
        originalPersonId: generateUUID(),
        title: '',
        firstName: '',
        lastName: '',
        street: '',
        houseNumber: '',
        postalCode: '',
        city: '',
        hasEmploymentIncome: null,
        incomeYear: '',
        incomeYearAmount: '',
        incomeEndMonth: '',
        incomeEndYear: '',
        monthlyIncome: {},
        sonderzuwendungenVergangen: {},
        sonderzuwendungenKommend: {},
        willChangeIncome: null,
        incomeChangeDate: '',
        willChangeIncrease: null,
        newIncome: '',
        isNewIncomeMonthly: null,
        newIncomeReason: '',
        startEmployment: '',
        isContractLimited: null,
        endOfContract: '',
        weitereEinkuenfte: {
          selectedTypes: [],
          renten: undefined,
          vermietung: undefined,
          gewerbe: undefined,
          landforst: undefined,
          sonstige: undefined,
          unterhaltsteuerfrei: undefined,
          unterhaltsteuerpflichtig: undefined,
          ausland: undefined,
          pauschal: undefined,
          arbeitslosengeld: undefined,
        },
        werbungskosten: '',
        kinderbetreuungskosten: '',
        ispayingincometax: null,
        ispayinghealthinsurance: null,
        ispayingpension: null,
        ispayingunterhalt: null,
        unterhaltszahlungen: [],
        additionalIncomeChanges: initialAdditionalIncomeChanges,
        finanzamt: '',
        steuerid: '',
      }
    ]);
    setSelectedIndex(additionalApplicants.length + 1);*/
    setInfoModalType('add');
    setShowInfoModal(true);
  };

  const handleRemoveApplicant = (index: number) => {
    /*const updated = additionalApplicants.filter((_, i) => i !== index);
    setAdditionalApplicants(updated);
    setSelectedIndex(0);*/
    setInfoModalType('remove');
    setShowInfoModal(true);
  };

  const validateSonderzuwendungen = (applicant: MainFinancials | AdditionalApplicantFinancials, isMainApplicant: boolean) => {
    const sonderzuwendungenFieldErrors: any = { vergangen: {}, kommend: {} };
    
    if (applicant.hasEmploymentIncome) {
      const v = applicant.sonderzuwendungenVergangen || {};
      const k = applicant.sonderzuwendungenKommend || {};
      
      if (!v.weihnachtsgeld) {
        sonderzuwendungenFieldErrors.vergangen.weihnachtsgeld = ['Vergangene 12 Monate: Weihnachtsgeld ist erforderlich'];
      }
      if (!v.urlaubsgeld) {
        sonderzuwendungenFieldErrors.vergangen.urlaubsgeld = ['Vergangene 12 Monate: Urlaubsgeld ist erforderlich'];
      }
      if (!v.sonstige) {
        sonderzuwendungenFieldErrors.vergangen.sonstige = ['Vergangene 12 Monate: sonstige Leistungen sind erforderlich'];
      }
      if (!k.weihnachtsgeld) {
        sonderzuwendungenFieldErrors.kommend.weihnachtsgeld = ['Kommende 12 Monate: Weihnachtsgeld ist erforderlich'];
      }
      if (!k.urlaubsgeld) {
        sonderzuwendungenFieldErrors.kommend.urlaubsgeld = ['Kommende 12 Monate: Urlaubsgeld ist erforderlich'];
      }
      if (!k.sonstige) {
        sonderzuwendungenFieldErrors.kommend.sonstige = ['Kommende 12 Monate: sonstige Leistungen sind erforderlich'];
      }
    }

    return sonderzuwendungenFieldErrors;
  };

  const handleApplicantChange = (index: number, data: any) => {
    if (index === 0) {
      setMainFinancials(data);
      if (showValidation) {
        const newSonderzuwendungenFieldErrors = validateSonderzuwendungen(data, true);
        setSonderzuwendungenFieldErrors(prev => ({
          ...prev,
          0: newSonderzuwendungenFieldErrors
        }));
      }
    } else {
      const updated = [...additionalApplicants];
      updated[index - 1] = data;
      setAdditionalApplicants(updated);
      if (showValidation) {
        const newSonderzuwendungenFieldErrors = validateSonderzuwendungen(data, false);
        setSonderzuwendungenFieldErrors(prev => ({
          ...prev,
          [index]: newSonderzuwendungenFieldErrors
        }));
      }
    }
    setHasUnsavedChanges(true);
  };

  const getCurrentApplicant = () => {
    if (selectedIndex === 0) return mainFinancials;
    return additionalApplicants[selectedIndex - 1];
  };

  const handleSearch = (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    Object.entries(sectionSearchTerms).forEach(([section, terms]) => {
      const matches = terms.filter(term => 
        term.toLowerCase().includes(lowerQuery)
      );

      if (matches.length > 0) {
        results.push({
          section,
          matches
        });
      }
    });

    setSearchResults(results);
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    handleSearch(value);
  };

  const navigateToSection = (section: string) => {
    expandSection(selectedIndex, section);
    setShowSearchModal(false);
  };

  const handleToggleValidation = async () => {
    const newShowValidation = !showValidation;
    setShowValidation(newShowValidation);
    
    if (user?.id) {
      try {
        const { error } = await supabase
          .from('user_data')
          .update({ 
            should_show_error_einkommenserklaerung: newShowValidation,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (error) {
          console.error('Error updating shouldShowErrorEinkommenserklaerung:', error);
          setShowValidation(!newShowValidation);
        }
      } catch (error) {
        console.error('Error in handleToggleValidation:', error);
        setShowValidation(!newShowValidation);
      }
    }
  };

  // Section keys
  const sectionKeys = ['personal', 'income', 'additional-income', 'costs', 'changes', 'legal'] as const;
  type SectionKey = typeof sectionKeys[number];
  type SectionErrors = Record<SectionKey, string[]>;
  type ApplicantErrors = Record<string, SectionErrors>;

  const sectionTitles: Record<SectionKey, string> = {
    personal: 'Persönliche Angaben',
    income: 'Einkommensangaben',
    'additional-income': 'Weitere Einkünfte',
    costs: 'Kosten, Zahlungen, und Abgaben',
    changes: 'Änderung der weiteren Einkünfte, Kosten und Zahlungen',
    legal: 'Gesetzliche Angaben',
  };

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
  const getCurrentValueForType = (applicant: MainFinancials | AdditionalApplicantFinancials, type: string): number => {
    // Handle weitereEinkuenfte types
    if (applicant.weitereEinkuenfte?.selectedTypes?.includes(type)) {
      const weitereData = (applicant.weitereEinkuenfte as any)[type];
      if (weitereData?.betrag) {
        return parseGermanNumber(weitereData.betrag);
      }
    }
    
    // Handle cost types
    switch (type) {
      case 'werbungskosten':
        return parseGermanNumber(applicant.werbungskosten || '0');
      case 'kinderbetreuungskosten':
        return parseGermanNumber(applicant.kinderbetreuungskosten || '0');
      case 'unterhaltszahlungen':
        if (applicant.unterhaltszahlungen && applicant.unterhaltszahlungen.length > 0) {
          return applicant.unterhaltszahlungen.reduce((sum: number, item: any) => {
            return sum + parseGermanNumber(item.amount || '0');
          }, 0);
        }
        return 0;
      default:
        return 0;
    }
  };

  // Helper function to validate increase/decrease radio button against actual values
  const validateIncreaseDecreaseRadio = (applicant: MainFinancials | AdditionalApplicantFinancials, type: string, change: any): string | null => {
    if (typeof change.increase !== 'boolean' || !change.newAmount) {
      return null; // Let other validations handle missing values
    }
    
    // For types that have turnus options, check if the turnus values match
    if (type === 'ausland' || type === 'arbeitslosengeld') {
      const originalTurnus = applicant.weitereEinkuenfte?.[type]?.turnus;
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
    
    const currentValue = getCurrentValueForType(applicant, type);
    const newValue = parseGermanNumber(change.newAmount);
    
    const typeLabel = typeLabels[type] || additionalChangeTypeLabels[type] || type;
    
    if (change.increase === true && newValue <= currentValue) {
      return `${typeLabel}: Ihr neuer Betrag ist geringer als oder gleich dem alten Betrag.`;
    }
    
    if (change.increase === false && newValue >= currentValue) {
      return `${typeLabel}: Ihr neuer Betrag ist größer als oder gleich dem alten Betrag.`;
    }
    
    return null;
  };

  const validateForm = () => {

    const errors: ApplicantErrors = {};
    const newSonderzuwendungenFieldErrors: Record<number, any> = {};

    // --- Main Applicant ---
    const mainSectionErrors: SectionErrors = {
      personal: [], income: [], 'additional-income': [], costs: [], changes: [], legal: []
    };
    // Section: personal
    if (!mainFinancials.title) mainSectionErrors.personal.push('Titel ist erforderlich');
    if (!mainFinancials.firstName) mainSectionErrors.personal.push('Vorname ist erforderlich');
    if (!mainFinancials.lastName) mainSectionErrors.personal.push('Name ist erforderlich');
    if (!mainFinancials.street) mainSectionErrors.personal.push('Straße ist erforderlich');
    if (!mainFinancials.houseNumber) mainSectionErrors.personal.push('Hausnummer ist erforderlich');
    if (!mainFinancials.postalCode) mainSectionErrors.personal.push('Postleitzahl ist erforderlich');
    else if (!/^\d{5}$/.test(mainFinancials.postalCode)) mainSectionErrors.personal.push('Die Postleitzahl muss aus genau 5 Ziffern bestehen');
    if (!mainFinancials.city) mainSectionErrors.personal.push('Ort ist erforderlich');

    // Section: income
    if (mainFinancials.hasEmploymentIncome === null) mainSectionErrors.income.push('Bitte geben Sie an, ob Sie Einkünfte aus nichtselbstständiger Arbeit/Versorgungsbezüge erzielen');
    if (mainFinancials.hasEmploymentIncome) {
      if (!mainFinancials.incomeYear) mainSectionErrors.income.push('Jahr für steuerpflichtige Einkünfte ist erforderlich');
      if (!mainFinancials.incomeYearAmount) mainSectionErrors.income.push('Jahresbetrag für steuerpflichtige Einkünfte ist erforderlich');
      if (!mainFinancials.incomeEndMonth) mainSectionErrors.income.push('Letzter Monat ist erforderlich');
      if (!mainFinancials.incomeEndYear) mainSectionErrors.income.push('Jahr für letzter Monat ist erforderlich');
      const endMonth = parseInt(mainFinancials.incomeEndMonth);
      const endYear = parseInt(mainFinancials.incomeEndYear);
      if (!isNaN(endMonth) && !isNaN(endYear)) {
        for (let i = 11; i >= 0; i--) {
          const month = (endMonth - i + 12) % 12;
          const year = endYear - (endMonth < i ? 1 : 0);
          const key = `${year}-${month}`;
          if (!mainFinancials.monthlyIncome?.[key]) {
            mainSectionErrors.income.push(`Einkommen für ${new Date(year, month).toLocaleString('de-DE', { month: 'long', year: 'numeric' })} ist erforderlich`);
          }
        }
      }
      // Sonderzuwendungen
      const mainSonderzuwendungenErrors = validateSonderzuwendungen(mainFinancials, true);
      newSonderzuwendungenFieldErrors[0] = mainSonderzuwendungenErrors;
      Object.values(mainSonderzuwendungenErrors.vergangen).forEach((arr) => (arr as string[]).forEach((e: string) => mainSectionErrors.income.push(e)));
      Object.values(mainSonderzuwendungenErrors.kommend).forEach((arr) => (arr as string[]).forEach((e: string) => mainSectionErrors.income.push(e)));
      // Änderung der Einkünfte
      if (mainFinancials.willChangeIncome === null) mainSectionErrors.income.push('Bitte geben Sie an, ob sich Ihr Einkommen ändern wird.');
      if (mainFinancials.willChangeIncome) {
        if (!mainFinancials.incomeChangeDate) {
          mainSectionErrors.income.push('Bitte geben Sie das Datum der Einkommensänderung an.');
        } else if (!isValidFutureDate(mainFinancials.incomeChangeDate)) {
          mainSectionErrors.income.push('Das Datum der Einkommensänderung darf nicht mehr als 12 Monate in der Vergangenheit liegen und nicht mehr als 12 Monate in der Zukunft.');
        }
        if (mainFinancials.willChangeIncrease === null) mainSectionErrors.income.push('Bitte geben Sie an, ob das Einkommen steigt oder sinkt.');
        if (!mainFinancials.newIncome) mainSectionErrors.income.push('Bitte geben Sie den neuen Betrag an.');
        if (mainFinancials.isNewIncomeMonthly === null) mainSectionErrors.income.push('Bitte geben Sie an, ob der neue Betrag monatlich oder jährlich ist.');
        if (!mainFinancials.newIncomeReason) mainSectionErrors.income.push('Bitte geben Sie eine Begründung für die Einkommensänderung an.');
      }
      if (!mainFinancials.startEmployment) {
        mainSectionErrors.income.push('Bitte geben Sie das Beschäftigungsbeginn-Datum an.');
      } else if (!isValidEmploymentStartDate(mainFinancials.startEmployment)) {
        mainSectionErrors.income.push('Bitte geben Sie ein valides Datum an.');
      }
      if (mainFinancials.isContractLimited === null) mainSectionErrors.income.push('Bitte geben Sie an, ob Ihr Vertrag befristet oder unbefristet ist.');
      if (mainFinancials.isContractLimited && !mainFinancials.endOfContract) {
        mainSectionErrors.income.push('Bitte geben Sie das Ende des befristeten Vertrags an.');
      } else if (mainFinancials.isContractLimited && mainFinancials.endOfContract && !isValidContractEndDate(mainFinancials.endOfContract)) {
        mainSectionErrors.income.push('Bitte geben Sie ein valides Datum an.');
      }
    }
    // Section: additional-income
    if (mainFinancials.weitereEinkuenfte?.selectedTypes) {
      mainFinancials.weitereEinkuenfte.selectedTypes.forEach(type => {
        switch (type) {
          case 'renten':
            if (!mainFinancials.weitereEinkuenfte?.renten?.betrag) mainSectionErrors['additional-income'].push('Betrag für Renten ist erforderlich');
            break;
          case 'vermietung':
            if (!mainFinancials.weitereEinkuenfte?.vermietung?.jahr || !mainFinancials.weitereEinkuenfte?.vermietung?.betrag) mainSectionErrors['additional-income'].push('Jahr und Betrag für Vermietung/Verpachtung sind erforderlich');
            break;
          case 'gewerbe':
            if (!mainFinancials.weitereEinkuenfte?.gewerbe?.jahr || !mainFinancials.weitereEinkuenfte?.gewerbe?.betrag) mainSectionErrors['additional-income'].push('Jahr und Betrag für Gewerbebetrieb/selbstständige Arbeit sind erforderlich');
            break;
          case 'landforst':
            if (!mainFinancials.weitereEinkuenfte?.landforst?.jahr || !mainFinancials.weitereEinkuenfte?.landforst?.betrag) mainSectionErrors['additional-income'].push('Jahr und Betrag für Land- und Forstwirtschaft sind erforderlich');
            break;
          case 'sonstige':
            if (!mainFinancials.weitereEinkuenfte?.sonstige?.jahr || !mainFinancials.weitereEinkuenfte?.sonstige?.betrag) mainSectionErrors['additional-income'].push('Jahr und Betrag für Sonstige Einkünfte sind erforderlich');
            break;
          case 'unterhaltsteuerfrei':
            if (!mainFinancials.weitereEinkuenfte?.unterhaltsteuerfrei?.betrag) mainSectionErrors['additional-income'].push('Betrag für Unterhaltsleistungen steuerfrei ist erforderlich');
            break;
          case 'unterhaltsteuerpflichtig':
            if (!mainFinancials.weitereEinkuenfte?.unterhaltsteuerpflichtig?.betrag) mainSectionErrors['additional-income'].push('Betrag für Unterhaltsleistungen steuerpflichtig ist erforderlich');
            break;
          case 'ausland':
            if (!mainFinancials.weitereEinkuenfte?.ausland?.turnus) {
              mainSectionErrors['additional-income'].push('Turnus für Ausländische Einkünfte ist erforderlich');
            } else if (mainFinancials.weitereEinkuenfte?.ausland?.turnus === 'jährlich') {
              if (!mainFinancials.weitereEinkuenfte?.ausland?.jahr || !mainFinancials.weitereEinkuenfte?.ausland?.betrag) {
                mainSectionErrors['additional-income'].push('Jahr und Betrag für Ausländische Einkünfte sind erforderlich');
              }
            } else if (mainFinancials.weitereEinkuenfte?.ausland?.turnus === 'monatlich') {
              if (!mainFinancials.weitereEinkuenfte?.ausland?.betrag) {
                mainSectionErrors['additional-income'].push('Betrag für Ausländische Einkünfte ist erforderlich');
              }
            }
            break;
          case 'pauschal':
            if (!mainFinancials.weitereEinkuenfte?.pauschal?.betrag) mainSectionErrors['additional-income'].push('Betrag für pauschal besteuerten Arbeitslohn ist erforderlich');
            break;
          case 'arbeitslosengeld':
            if (!mainFinancials.weitereEinkuenfte?.arbeitslosengeld?.betrag || !mainFinancials.weitereEinkuenfte?.arbeitslosengeld?.turnus) mainSectionErrors['additional-income'].push('Betrag und Zeitraum für Arbeitslosengeld sind erforderlich');
            break;
          default:
            break;
        }
      });
    }
    // Section: costs
    if (mainFinancials.hasEmploymentIncome && !mainFinancials.werbungskosten) mainSectionErrors.costs.push('Werbungskosten sind erforderlich');
    if (mainFinancials.ispayingincometax === null) mainSectionErrors.costs.push('Bitte geben Sie an, ob Sie Einkommensteuer zahlen');
    if (mainFinancials.ispayinghealthinsurance === null) mainSectionErrors.costs.push('Bitte geben Sie an, ob Sie Krankenversicherung zahlen');
    if (mainFinancials.ispayingpension === null) mainSectionErrors.costs.push('Bitte geben Sie an, ob Sie Rentenversicherung zahlen');
    if (mainFinancials.ispayingunterhalt === null) mainSectionErrors.costs.push('Bitte geben Sie an, ob Sie Unterhalt zahlen');
    if (mainFinancials.ispayingunterhalt === true && (!mainFinancials.unterhaltszahlungen || mainFinancials.unterhaltszahlungen.length === 0)) {
      mainSectionErrors.costs.push('Bitte fügen Sie mindestens eine Person für Unterhaltszahlungen hinzu');
    }
    if (mainFinancials.ispayingunterhalt === true && Array.isArray(mainFinancials.unterhaltszahlungen)) {
      mainFinancials.unterhaltszahlungen.forEach((zahlung, idx) => {
        if (!zahlung.name) mainSectionErrors.costs.push(`Name für Person ${idx + 1} bei Unterhaltszahlungen ist erforderlich`);
        if (!zahlung.amount) mainSectionErrors.costs.push(`Betrag für Person ${idx + 1} bei Unterhaltszahlungen ist erforderlich`);
      });
    }
    // Section: changes
    if (mainFinancials.additionalIncomeChanges?.selectedTypes?.length) {
      mainFinancials.additionalIncomeChanges.selectedTypes.forEach(type => {
        const change: any = mainFinancials.additionalIncomeChanges?.changes?.[type] || {};
        if (!change.date) {
          mainSectionErrors.changes.push(`Bitte geben Sie das Änderungsdatum für ${typeLabels[type] || additionalChangeTypeLabels[type] || type} an.`);
        } else if (!isValidFutureDate(change.date)) {
          mainSectionErrors.changes.push(`Das Änderungsdatum für ${typeLabels[type] || additionalChangeTypeLabels[type] || type} darf weder mehr als 12 Monate in der Vergangenheit noch mehr als 12 Monate in der Zukunft liegen.`);
        }
        if (!change.newAmount) mainSectionErrors.changes.push(`Bitte geben Sie den neuen Betrag für ${typeLabels[type] || additionalChangeTypeLabels[type] || type} an.`);
        if (typeof change.increase !== 'boolean') {
          mainSectionErrors.changes.push(`Bitte geben Sie an, ob sich das Einkommen für ${typeLabels[type] || additionalChangeTypeLabels[type] || type} erhöht oder verringert.`);
        } else {
          const radioValidationError = validateIncreaseDecreaseRadio(mainFinancials, type, change);
          if (radioValidationError) {
            mainSectionErrors.changes.push(radioValidationError);
          }
        }
        if (change.isNewIncomeMonthly === null || change.isNewIncomeMonthly === undefined) mainSectionErrors.changes.push(`Bitte geben Sie an, ob der neue Betrag für ${typeLabels[type] || additionalChangeTypeLabels[type] || type} monatlich oder jährlich ist.`);
        if (!change.reason) mainSectionErrors.changes.push(`Bitte geben Sie eine Begründung für die Änderung bei ${typeLabels[type] || additionalChangeTypeLabels[type] || type} an.`);
      });
    }
    // Section: legal
    if (!mainFinancials.finanzamt) mainSectionErrors.legal.push('Zuständiges Finanzamt ist erforderlich');
    if (!mainFinancials.steuerid) mainSectionErrors.legal.push('Steuer-ID ist erforderlich');

    errors[getApplicantDisplayName(mainFinancials, 0)] = mainSectionErrors;

    // --- Additional Applicants ---
    additionalApplicants.forEach((applicant, index) => {
      const applicantSectionErrors: SectionErrors = {
        personal: [], income: [], 'additional-income': [], costs: [], changes: [], legal: []
      };
      // Section: personal
      if (!applicant.title) applicantSectionErrors.personal.push('Titel ist erforderlich');
      if (!applicant.firstName) applicantSectionErrors.personal.push('Vorname ist erforderlich');
      if (!applicant.lastName) applicantSectionErrors.personal.push('Name ist erforderlich');
      if (!applicant.street) applicantSectionErrors.personal.push('Straße ist erforderlich');
      if (!applicant.houseNumber) applicantSectionErrors.personal.push('Hausnummer ist erforderlich');
      if (!applicant.postalCode) applicantSectionErrors.personal.push('Postleitzahl ist erforderlich');
      else if (!/^\d{5}$/.test(applicant.postalCode)) applicantSectionErrors.personal.push('Die Postleitzahl muss aus genau 5 Ziffern bestehen');
      if (!applicant.city) applicantSectionErrors.personal.push('Ort ist erforderlich');
      // Section: income
      if (applicant.hasEmploymentIncome === null) applicantSectionErrors.income.push('Bitte geben Sie an, ob Sie Einkünfte aus nichtselbstständiger Arbeit/Versorgungsbezüge erzielen');
      if (applicant.hasEmploymentIncome) {
        if (!applicant.incomeYear) applicantSectionErrors.income.push('Jahr für steuerpflichtige Einkünfte ist erforderlich');
        if (!applicant.incomeYearAmount) applicantSectionErrors.income.push('Jahresbetrag für steuerpflichtige Einkünfte ist erforderlich');
        if (!applicant.incomeEndMonth) applicantSectionErrors.income.push('Letzter Monat ist erforderlich');
        if (!applicant.incomeEndYear) applicantSectionErrors.income.push('Jahr für letzter Monat ist erforderlich');
        const endMonth = parseInt(applicant.incomeEndMonth);
        const endYear = parseInt(applicant.incomeEndYear);
        if (!isNaN(endMonth) && !isNaN(endYear)) {
          for (let i = 11; i >= 0; i--) {
            const month = (endMonth - i + 12) % 12;
            const year = endYear - (endMonth < i ? 1 : 0);
            const key = `${year}-${month}`;
            if (!applicant.monthlyIncome?.[key]) {
              applicantSectionErrors.income.push(`Einkommen für ${new Date(year, month).toLocaleString('de-DE', { month: 'long', year: 'numeric' })} ist erforderlich`);
            }
          }
        }
        // Sonderzuwendungen
        const additionalSonderzuwendungenErrors = validateSonderzuwendungen(applicant, false);
        newSonderzuwendungenFieldErrors[index + 1] = additionalSonderzuwendungenErrors;
        Object.values(additionalSonderzuwendungenErrors.vergangen).forEach((arr) => (arr as string[]).forEach((e: string) => applicantSectionErrors.income.push(e)));
        Object.values(additionalSonderzuwendungenErrors.kommend).forEach((arr) => (arr as string[]).forEach((e: string) => applicantSectionErrors.income.push(e)));
        if (applicant.willChangeIncome === null) applicantSectionErrors.income.push('Bitte geben Sie an, ob sich das Einkommen ändern wird.');
        if (applicant.willChangeIncome) {
          if (!applicant.incomeChangeDate) {
            applicantSectionErrors.income.push('Bitte geben Sie das Datum der Einkommensänderung an.');
          } else if (!isValidFutureDate(applicant.incomeChangeDate)) {
            applicantSectionErrors.income.push('Das Datum der Einkommensänderung darf nicht  mehr als 12 Monate in der Vergangenheit liegen und nicht mehr als 12 Monate in der Zukunft.');
          }
          if (applicant.willChangeIncrease === null) applicantSectionErrors.income.push('Bitte geben Sie an, ob sich ihr Einkommen erhöht oder verringert.');
          if (!applicant.newIncome) applicantSectionErrors.income.push('Bitte geben Sie den neuen Betrag an.');
          if (applicant.isNewIncomeMonthly === null) applicantSectionErrors.income.push('Bitte geben Sie an, ob der neue Betrag monatlich oder jährlich ist.');
          if (!applicant.newIncomeReason) applicantSectionErrors.income.push('Bitte geben Sie eine Begründung für die Einkommensänderung an.');
        }
        if (!applicant.startEmployment) {
          applicantSectionErrors.income.push('Bitte geben Sie das Beschäftigungsbeginn-Datum an.');
        } else if (!isValidEmploymentStartDate(applicant.startEmployment)) {
          applicantSectionErrors.income.push('Bitte geben Sie ein valides Datum an.');
        }
        if (applicant.isContractLimited === null) applicantSectionErrors.income.push('Bitte geben Sie an, ob der Vertrag befristet oder unbefristet ist.');
        if (applicant.isContractLimited && !applicant.endOfContract) {
          applicantSectionErrors.income.push('Bitte geben Sie das Ende des befristeten Vertrags an.');
        } else if (applicant.isContractLimited && applicant.endOfContract && !isValidContractEndDate(applicant.endOfContract)) {
          applicantSectionErrors.income.push('Bitte geben Sie ein valides Datum an.');
        }
      }
      // Section: additional-income
      if (applicant.weitereEinkuenfte?.selectedTypes) {
        applicant.weitereEinkuenfte.selectedTypes.forEach(type => {
          switch (type) {
            case 'renten':
              if (!applicant.weitereEinkuenfte?.renten?.betrag) applicantSectionErrors['additional-income'].push('Betrag für Renten ist erforderlich');
              break;
            case 'vermietung':
              if (!applicant.weitereEinkuenfte?.vermietung?.jahr || !applicant.weitereEinkuenfte?.vermietung?.betrag) applicantSectionErrors['additional-income'].push('Jahr und Betrag für Vermietung/Verpachtung sind erforderlich');
              break;
            case 'gewerbe':
              if (!applicant.weitereEinkuenfte?.gewerbe?.jahr || !applicant.weitereEinkuenfte?.gewerbe?.betrag) applicantSectionErrors['additional-income'].push('Jahr und Betrag für Gewerbebetrieb/selbstständige Arbeit sind erforderlich');
              break;
            case 'landforst':
              if (!applicant.weitereEinkuenfte?.landforst?.jahr || !applicant.weitereEinkuenfte?.landforst?.betrag) applicantSectionErrors['additional-income'].push('Jahr und Betrag für Land- und Forstwirtschaft sind erforderlich');
              break;
            case 'sonstige':
              if (!applicant.weitereEinkuenfte?.sonstige?.jahr || !applicant.weitereEinkuenfte?.sonstige?.betrag) applicantSectionErrors['additional-income'].push('Jahr und Betrag für Sonstige Einkünfte sind erforderlich');
              break;
            case 'unterhaltsteuerfrei':
              if (!applicant.weitereEinkuenfte?.unterhaltsteuerfrei?.betrag) applicantSectionErrors['additional-income'].push('Betrag für Unterhaltsleistungen steuerfrei ist erforderlich');
              break;
            case 'unterhaltsteuerpflichtig':
              if (!applicant.weitereEinkuenfte?.unterhaltsteuerpflichtig?.betrag) applicantSectionErrors['additional-income'].push('Betrag für Unterhaltsleistungen steuerpflichtig ist erforderlich');
              break;
            case 'ausland':
              if (!applicant.weitereEinkuenfte?.ausland?.turnus) {
                applicantSectionErrors['additional-income'].push('Turnus für Ausländische Einkünfte ist erforderlich');
              } else if (applicant.weitereEinkuenfte?.ausland?.turnus === 'jährlich') {
                if (!applicant.weitereEinkuenfte?.ausland?.jahr || !applicant.weitereEinkuenfte?.ausland?.betrag) {
                  applicantSectionErrors['additional-income'].push('Jahr und Betrag für Ausländische Einkünfte sind erforderlich');
                }
              } else if (applicant.weitereEinkuenfte?.ausland?.turnus === 'monatlich') {
                if (!applicant.weitereEinkuenfte?.ausland?.betrag) {
                  applicantSectionErrors['additional-income'].push('Betrag für Ausländische Einkünfte ist erforderlich');
                }
              }
              break;
            case 'pauschal':
              if (!applicant.weitereEinkuenfte?.pauschal?.betrag) applicantSectionErrors['additional-income'].push('Betrag für pauschal besteuerten Arbeitslohn ist erforderlich');
              break;
            case 'arbeitslosengeld':
              if (!applicant.weitereEinkuenfte?.arbeitslosengeld?.betrag || !applicant.weitereEinkuenfte?.arbeitslosengeld?.turnus) applicantSectionErrors['additional-income'].push('Betrag und Zeitraum für Arbeitslosengeld sind erforderlich');
              break;
            default:
              break;
          }
        });
      }
      // Section: costs
      if (applicant.hasEmploymentIncome && !applicant.werbungskosten) applicantSectionErrors.costs.push('Werbungskosten sind erforderlich');
      if (applicant.ispayingincometax === null) applicantSectionErrors.costs.push('Bitte geben Sie an, ob Sie Einkommensteuer zahlen');
      if (applicant.ispayinghealthinsurance === null) applicantSectionErrors.costs.push('Bitte geben Sie an, ob Sie Krankenversicherung zahlen');
      if (applicant.ispayingpension === null) applicantSectionErrors.costs.push('Bitte geben Sie an, ob Sie Rentenversicherung zahlen');
      if (applicant.ispayingunterhalt === null) applicantSectionErrors.costs.push('Bitte geben Sie an, ob Sie Unterhalt zahlen');
      if (applicant.ispayingunterhalt === true && (!applicant.unterhaltszahlungen || applicant.unterhaltszahlungen.length === 0)) {
        applicantSectionErrors.costs.push('Bitte fügen Sie mindestens eine Person für Unterhaltszahlungen hinzu');
      }
      if (applicant.ispayingunterhalt === true && Array.isArray(applicant.unterhaltszahlungen)) {
        applicant.unterhaltszahlungen.forEach((zahlung, idx) => {
          if (!zahlung.name) applicantSectionErrors.costs.push(`Name für Person ${idx + 1} bei Unterhaltszahlungen ist erforderlich`);
          if (!zahlung.amount) applicantSectionErrors.costs.push(`Betrag für Person ${idx + 1} bei Unterhaltszahlungen ist erforderlich`);
        });
      }
      // Section: changes
      if (applicant.additionalIncomeChanges?.selectedTypes?.length) {
        applicant.additionalIncomeChanges.selectedTypes.forEach(type => {
          const change: any = applicant.additionalIncomeChanges?.changes?.[type] || {};
          if (!change.date) {
            applicantSectionErrors.changes.push(`Bitte geben Sie das Änderungsdatum für ${typeLabels[type] || additionalChangeTypeLabels[type] || type} an.`);
          } else if (!isValidFutureDate(change.date)) {
            applicantSectionErrors.changes.push(`Das Änderungsdatum für ${typeLabels[type] || additionalChangeTypeLabels[type] || type} darf nicht mehr als 12 Monate in der Vergangenheit liegen und nicht mehr als 12 Monate in der Zukunft.`);
          }
          if (!change.newAmount) applicantSectionErrors.changes.push(`Bitte geben Sie den neuen Betrag für ${typeLabels[type] || additionalChangeTypeLabels[type] || type} an.`);
          if (typeof change.increase !== 'boolean') {
            applicantSectionErrors.changes.push(`Bitte geben Sie an, ob sich das Einkommen für ${typeLabels[type] || additionalChangeTypeLabels[type] || type} erhöht oder verringert.`);
          } else {
            const radioValidationError = validateIncreaseDecreaseRadio(applicant, type, change);
            if (radioValidationError) {
              applicantSectionErrors.changes.push(radioValidationError);
            }
          }
          if (change.isNewIncomeMonthly === null || change.isNewIncomeMonthly === undefined) applicantSectionErrors.changes.push(`Bitte geben Sie an, ob der neue Betrag für ${typeLabels[type] || additionalChangeTypeLabels[type] || type} monatlich oder jährlich ist.`);
          if (!change.reason) applicantSectionErrors.changes.push(`Bitte geben Sie eine Begründung für die Änderung bei ${typeLabels[type] || additionalChangeTypeLabels[type] || type} an.`);
        });
      }
      // Section: legal
      if (!applicant.finanzamt) applicantSectionErrors.legal.push('Zuständiges Finanzamt ist erforderlich');
      if (!applicant.steuerid) applicantSectionErrors.legal.push('Steuer-ID ist erforderlich');
      errors[getApplicantDisplayName(applicant, index + 1)] = applicantSectionErrors;
    });

    setValidationErrors(errors);
    setShowValidationModal(Object.values(errors).some(sectionObj => Object.values(sectionObj).some(arr => arr.length > 0)));
    setShowSuccessModal(Object.values(errors).every(sectionObj => Object.values(sectionObj).every(arr => arr.length === 0)));
    setShowValidation(true);
    setHasValidatedOnce(true);
    setSonderzuwendungenFieldErrors(newSonderzuwendungenFieldErrors);
  };

  // Add state for modal content
  const [modalContent, setModalContent] = useState<{
    title: string;
    body: React.ReactNode;
  }>({
    title: '',
    body: ''
  });

  // Add this function to handle section expansion
  const expandSection = (applicantIndex: number, section: string) => {
    const formRef = document.querySelector(`#applicant-${applicantIndex}`);
    if (formRef) {
      const sectionHeader = formRef.querySelector(`[data-section="${section}"]`) as HTMLDivElement;
      if (sectionHeader) {
        sectionHeader.click();
      }
    }
  };

  // Force re-render when applicant names change to update button labels
  useEffect(() => {
    // This effect will trigger a re-render when any applicant's firstName or lastName changes
    // The getApplicantDisplayName function will be called again with updated names
  }, [mainFinancials.firstName, mainFinancials.lastName, ...additionalApplicants.map(a => [a.firstName, a.lastName]).flat()]);

  const handleMainFinancialsChange = (data: MainFinancials) => {
    setMainFinancials(data);
  };

  const getCurrentApplicantSectionErrors = () => {
    const applicantKey = selectedIndex === 0 ? 'Hauptantragsteller' : `Person ${selectedIndex + 1}`;
    const sectionErrors = validationErrors[applicantKey] || {};
    return Object.values(sectionErrors).flat();
  };

  const calculateProgress = () => {
    let totalPotentialFields = 0;
    let actualErrors = 0;

    // Helper function to validate Sonderzuwendungen
    const validateSonderzuwendungen = (applicant: any, isMain: boolean) => {
      let totalFields = 0;
      let errorCount = 0;

      if (applicant.hasEmploymentIncome) {
        // Vergangene Sonderzuwendungen (3 fields)
        if (applicant.sonderzuwendungenVergangen) {
          totalFields += 3; // Weihnachtsgeld, Urlaubsgeld, Sonstige
          if (!applicant.sonderzuwendungenVergangen.weihnachtsgeld) errorCount++;
          if (!applicant.sonderzuwendungenVergangen.urlaubsgeld) errorCount++;
          if (!applicant.sonderzuwendungenVergangen.sonstige) errorCount++;
        }

        // Kommende Sonderzuwendungen (3 fields)
        if (applicant.sonderzuwendungenKommend) {
          totalFields += 3; // Weihnachtsgeld, Urlaubsgeld, Sonstige
          if (!applicant.sonderzuwendungenKommend.weihnachtsgeld) errorCount++;
          if (!applicant.sonderzuwendungenKommend.urlaubsgeld) errorCount++;
          if (!applicant.sonderzuwendungenKommend.sonstige) errorCount++;
        }
      }

      return { totalFields, errorCount };
    };

    // --- Main Applicant ---
    // Personal section (7 fields)
    totalPotentialFields += 7;
    if (!mainFinancials.title) actualErrors++;
    if (!mainFinancials.firstName) actualErrors++;
    if (!mainFinancials.lastName) actualErrors++;
    if (!mainFinancials.street) actualErrors++;
    if (!mainFinancials.houseNumber) actualErrors++;
    if (!mainFinancials.postalCode) actualErrors++;
    if (!mainFinancials.city) actualErrors++;

    // Income section
    totalPotentialFields++; // hasEmploymentIncome
    if (mainFinancials.hasEmploymentIncome === null) actualErrors++;

    if (mainFinancials.hasEmploymentIncome) {
      // Base employment fields (4)
      totalPotentialFields += 4;
      if (!mainFinancials.incomeYear) actualErrors++;
      if (!mainFinancials.incomeYearAmount) actualErrors++;
      if (!mainFinancials.incomeEndMonth) actualErrors++;
      if (!mainFinancials.incomeEndYear) actualErrors++;

      // Monthly income fields
      const endMonth = parseInt(mainFinancials.incomeEndMonth);
      const endYear = parseInt(mainFinancials.incomeEndYear);
      if (!isNaN(endMonth) && !isNaN(endYear)) {
        for (let i = 11; i >= 0; i--) {
          const month = (endMonth - i + 12) % 12;
          const year = endYear - (endMonth < i ? 1 : 0);
          const key = `${year}-${month}`;
          totalPotentialFields++;
          if (!mainFinancials.monthlyIncome?.[key]) actualErrors++;
        }
      }

      // Sonderzuwendungen
      const sonderzuwendungenValidation = validateSonderzuwendungen(mainFinancials, true);
      totalPotentialFields += sonderzuwendungenValidation.totalFields;
      actualErrors += sonderzuwendungenValidation.errorCount;

      // Income change fields
      totalPotentialFields++; // willChangeIncome
      if (mainFinancials.willChangeIncome === null) actualErrors++;

      if (mainFinancials.willChangeIncome) {
        totalPotentialFields += 5;
        if (!mainFinancials.incomeChangeDate || !isValidFutureDate(mainFinancials.incomeChangeDate)) actualErrors++;
        if (mainFinancials.willChangeIncrease === null) actualErrors++;
        if (!mainFinancials.newIncome) actualErrors++;
        if (mainFinancials.isNewIncomeMonthly === null) actualErrors++;
        if (!mainFinancials.newIncomeReason) actualErrors++;
      }

              // Employment details
        totalPotentialFields += 2;
        if (!mainFinancials.startEmployment || !isValidEmploymentStartDate(mainFinancials.startEmployment)) actualErrors++;
        if (mainFinancials.isContractLimited === null) actualErrors++;
        if (mainFinancials.isContractLimited) {
          totalPotentialFields++;
          if (!mainFinancials.endOfContract || !isValidContractEndDate(mainFinancials.endOfContract)) actualErrors++;
        }
    }

    // Additional income section
    if (mainFinancials.weitereEinkuenfte?.selectedTypes) {
      mainFinancials.weitereEinkuenfte.selectedTypes.forEach(type => {
        switch (type) {
          case 'renten':
            totalPotentialFields++;
            if (!mainFinancials.weitereEinkuenfte?.renten?.betrag) actualErrors++;
            break;
          case 'vermietung':
            totalPotentialFields += 2;
            if (!mainFinancials.weitereEinkuenfte?.vermietung?.jahr) actualErrors++;
            if (!mainFinancials.weitereEinkuenfte?.vermietung?.betrag) actualErrors++;
            break;
          case 'gewerbe':
            totalPotentialFields += 2;
            if (!mainFinancials.weitereEinkuenfte?.gewerbe?.jahr) actualErrors++;
            if (!mainFinancials.weitereEinkuenfte?.gewerbe?.betrag) actualErrors++;
            break;
          case 'landforst':
            totalPotentialFields += 2;
            if (!mainFinancials.weitereEinkuenfte?.landforst?.jahr) actualErrors++;
            if (!mainFinancials.weitereEinkuenfte?.landforst?.betrag) actualErrors++;
            break;
          case 'sonstige':
            totalPotentialFields += 2;
            if (!mainFinancials.weitereEinkuenfte?.sonstige?.jahr) actualErrors++;
            if (!mainFinancials.weitereEinkuenfte?.sonstige?.betrag) actualErrors++;
            break;
          case 'unterhaltsteuerfrei':
            totalPotentialFields++;
            if (!mainFinancials.weitereEinkuenfte?.unterhaltsteuerfrei?.betrag) actualErrors++;
            break;
          case 'unterhaltsteuerpflichtig':
            totalPotentialFields++;
            if (!mainFinancials.weitereEinkuenfte?.unterhaltsteuerpflichtig?.betrag) actualErrors++;
            break;
          case 'ausland':
            totalPotentialFields++;
            if (!mainFinancials.weitereEinkuenfte?.ausland?.turnus) actualErrors++;
            if (mainFinancials.weitereEinkuenfte?.ausland?.turnus === 'jährlich') {
              totalPotentialFields += 2;
              if (!mainFinancials.weitereEinkuenfte?.ausland?.jahr) actualErrors++;
              if (!mainFinancials.weitereEinkuenfte?.ausland?.betrag) actualErrors++;
            } else if (mainFinancials.weitereEinkuenfte?.ausland?.turnus === 'monatlich') {
              totalPotentialFields++;
              if (!mainFinancials.weitereEinkuenfte?.ausland?.betrag) actualErrors++;
            }
            break;
          case 'pauschal':
            totalPotentialFields++;
            if (!mainFinancials.weitereEinkuenfte?.pauschal?.betrag) actualErrors++;
            break;
          case 'arbeitslosengeld':
            totalPotentialFields += 2;
            if (!mainFinancials.weitereEinkuenfte?.arbeitslosengeld?.betrag) actualErrors++;
            if (!mainFinancials.weitereEinkuenfte?.arbeitslosengeld?.turnus) actualErrors++;
            break;
        }
      });
    }

    // Costs section
    if (mainFinancials.hasEmploymentIncome) {
      totalPotentialFields++;
      if (!mainFinancials.werbungskosten) actualErrors++;
    }

    totalPotentialFields += 4; // Basic cost questions
    if (mainFinancials.ispayingincometax === null) actualErrors++;
    if (mainFinancials.ispayinghealthinsurance === null) actualErrors++;
    if (mainFinancials.ispayingpension === null) actualErrors++;
    if (mainFinancials.ispayingunterhalt === null) actualErrors++;

    if (mainFinancials.ispayingunterhalt === true) {
      totalPotentialFields++;
      if (!mainFinancials.unterhaltszahlungen || mainFinancials.unterhaltszahlungen.length === 0) actualErrors++;
      
      if (Array.isArray(mainFinancials.unterhaltszahlungen)) {
        mainFinancials.unterhaltszahlungen.forEach(zahlung => {
          totalPotentialFields += 2;
          if (!zahlung.name) actualErrors++;
          if (!zahlung.amount) actualErrors++;
        });
      }
    }

    // Changes section
    if (mainFinancials.additionalIncomeChanges?.selectedTypes?.length) {
      mainFinancials.additionalIncomeChanges.selectedTypes.forEach(type => {
        const change: any = mainFinancials.additionalIncomeChanges?.changes?.[type] || {};
        totalPotentialFields += 5;
        if (!change.date || !isValidFutureDate(change.date)) actualErrors++;
        if (!change.newAmount) actualErrors++;
        if (typeof change.increase !== 'boolean') {
          actualErrors++;
        } else {
          const radioValidationError = validateIncreaseDecreaseRadio(mainFinancials, type, change);
          if (radioValidationError) {
            actualErrors++;
          }
        }
        if (change.isNewIncomeMonthly === null || change.isNewIncomeMonthly === undefined) actualErrors++;
        if (!change.reason) actualErrors++;
      });
    }

    // Legal section (2 fields)
    totalPotentialFields += 2;
    if (!mainFinancials.finanzamt) actualErrors++;
    if (!mainFinancials.steuerid) actualErrors++;

    // --- Additional Applicants ---
    additionalApplicants.forEach(applicant => {
      // Personal section (7 fields)
      totalPotentialFields += 7;
      if (!applicant.title) actualErrors++;
      if (!applicant.firstName) actualErrors++;
      if (!applicant.lastName) actualErrors++;
      if (!applicant.street) actualErrors++;
      if (!applicant.houseNumber) actualErrors++;
      if (!applicant.postalCode) actualErrors++;
      if (!applicant.city) actualErrors++;

      // Income section
      totalPotentialFields++; // hasEmploymentIncome
      if (applicant.hasEmploymentIncome === null) actualErrors++;

      if (applicant.hasEmploymentIncome) {
        // Base employment fields (4)
        totalPotentialFields += 4;
        if (!applicant.incomeYear) actualErrors++;
        if (!applicant.incomeYearAmount) actualErrors++;
        if (!applicant.incomeEndMonth) actualErrors++;
        if (!applicant.incomeEndYear) actualErrors++;

        // Monthly income fields
        const endMonth = parseInt(applicant.incomeEndMonth);
        const endYear = parseInt(applicant.incomeEndYear);
        if (!isNaN(endMonth) && !isNaN(endYear)) {
          for (let i = 11; i >= 0; i--) {
            const month = (endMonth - i + 12) % 12;
            const year = endYear - (endMonth < i ? 1 : 0);
            const key = `${year}-${month}`;
            totalPotentialFields++;
            if (!applicant.monthlyIncome?.[key]) actualErrors++;
          }
        }

        // Sonderzuwendungen
        const sonderzuwendungenValidation = validateSonderzuwendungen(applicant, false);
        totalPotentialFields += sonderzuwendungenValidation.totalFields;
        actualErrors += sonderzuwendungenValidation.errorCount;

        // Income change fields
        totalPotentialFields++; // willChangeIncome
        if (applicant.willChangeIncome === null) actualErrors++;

        if (applicant.willChangeIncome) {
          totalPotentialFields += 5;
          if (!applicant.incomeChangeDate || !isValidFutureDate(applicant.incomeChangeDate)) actualErrors++;
          if (applicant.willChangeIncrease === null) actualErrors++;
          if (!applicant.newIncome) actualErrors++;
          if (applicant.isNewIncomeMonthly === null) actualErrors++;
          if (!applicant.newIncomeReason) actualErrors++;
        }

        // Employment details
        totalPotentialFields += 2;
        if (!applicant.startEmployment || !isValidEmploymentStartDate(applicant.startEmployment)) actualErrors++;
        if (applicant.isContractLimited === null) actualErrors++;
        if (applicant.isContractLimited) {
          totalPotentialFields++;
          if (!applicant.endOfContract || !isValidContractEndDate(applicant.endOfContract)) actualErrors++;
        }
      }

      // Additional income section
      if (applicant.weitereEinkuenfte?.selectedTypes) {
        applicant.weitereEinkuenfte.selectedTypes.forEach(type => {
          switch (type) {
            case 'renten':
              totalPotentialFields++;
              if (!applicant.weitereEinkuenfte?.renten?.betrag) actualErrors++;
              break;
            case 'vermietung':
              totalPotentialFields += 2;
              if (!applicant.weitereEinkuenfte?.vermietung?.jahr) actualErrors++;
              if (!applicant.weitereEinkuenfte?.vermietung?.betrag) actualErrors++;
              break;
            case 'gewerbe':
              totalPotentialFields += 2;
              if (!applicant.weitereEinkuenfte?.gewerbe?.jahr) actualErrors++;
              if (!applicant.weitereEinkuenfte?.gewerbe?.betrag) actualErrors++;
              break;
            case 'landforst':
              totalPotentialFields += 2;
              if (!applicant.weitereEinkuenfte?.landforst?.jahr) actualErrors++;
              if (!applicant.weitereEinkuenfte?.landforst?.betrag) actualErrors++;
              break;
            case 'sonstige':
              totalPotentialFields += 2;
              if (!applicant.weitereEinkuenfte?.sonstige?.jahr) actualErrors++;
              if (!applicant.weitereEinkuenfte?.sonstige?.betrag) actualErrors++;
              break;
            case 'unterhaltsteuerfrei':
              totalPotentialFields++;
              if (!applicant.weitereEinkuenfte?.unterhaltsteuerfrei?.betrag) actualErrors++;
              break;
            case 'unterhaltsteuerpflichtig':
              totalPotentialFields++;
              if (!applicant.weitereEinkuenfte?.unterhaltsteuerpflichtig?.betrag) actualErrors++;
              break;
            case 'ausland':
              totalPotentialFields++;
              if (!applicant.weitereEinkuenfte?.ausland?.turnus) actualErrors++;
              if (applicant.weitereEinkuenfte?.ausland?.turnus === 'jährlich') {
                totalPotentialFields += 2;
                if (!applicant.weitereEinkuenfte?.ausland?.jahr) actualErrors++;
                if (!applicant.weitereEinkuenfte?.ausland?.betrag) actualErrors++;
              } else if (applicant.weitereEinkuenfte?.ausland?.turnus === 'monatlich') {
                totalPotentialFields++;
                if (!applicant.weitereEinkuenfte?.ausland?.betrag) actualErrors++;
              }
              break;
            case 'pauschal':
              totalPotentialFields++;
              if (!applicant.weitereEinkuenfte?.pauschal?.betrag) actualErrors++;
              break;
            case 'arbeitslosengeld':
              totalPotentialFields += 2;
              if (!applicant.weitereEinkuenfte?.arbeitslosengeld?.betrag) actualErrors++;
              if (!applicant.weitereEinkuenfte?.arbeitslosengeld?.turnus) actualErrors++;
              break;
          }
        });
      }

      // Costs section
      if (applicant.hasEmploymentIncome) {
        totalPotentialFields++;
        if (!applicant.werbungskosten) actualErrors++;
      }

      totalPotentialFields += 4; // Basic cost questions
      if (applicant.ispayingincometax === null) actualErrors++;
      if (applicant.ispayinghealthinsurance === null) actualErrors++;
      if (applicant.ispayingpension === null) actualErrors++;
      if (applicant.ispayingunterhalt === null) actualErrors++;

      if (applicant.ispayingunterhalt === true) {
        totalPotentialFields++;
        if (!applicant.unterhaltszahlungen || applicant.unterhaltszahlungen.length === 0) actualErrors++;
        
        if (Array.isArray(applicant.unterhaltszahlungen)) {
          applicant.unterhaltszahlungen.forEach(zahlung => {
            totalPotentialFields += 2;
            if (!zahlung.name) actualErrors++;
            if (!zahlung.amount) actualErrors++;
          });
        }
      }

      // Changes section
      if (applicant.additionalIncomeChanges?.selectedTypes?.length) {
        applicant.additionalIncomeChanges.selectedTypes.forEach(type => {
          const change: any = applicant.additionalIncomeChanges?.changes?.[type] || {};
          totalPotentialFields += 5;
          if (!change.date || !isValidFutureDate(change.date)) actualErrors++;
          if (!change.newAmount) actualErrors++;
          if (typeof change.increase !== 'boolean') {
            actualErrors++;
          } else {
            const radioValidationError = validateIncreaseDecreaseRadio(applicant, type, change);
            if (radioValidationError) {
              actualErrors++;
            }
          }
          if (change.isNewIncomeMonthly === null || change.isNewIncomeMonthly === undefined) actualErrors++;
          if (!change.reason) actualErrors++;
        });
      }

      // Legal section (2 fields)
      totalPotentialFields += 2;
      if (!applicant.finanzamt) actualErrors++;
      if (!applicant.steuerid) actualErrors++;
    });

    // Calculate progress percentage
    const einkommenserklarungProgress = totalPotentialFields > 0 
      ? Math.round(((totalPotentialFields - actualErrors) / totalPotentialFields) * 100)
      : 100;

    return einkommenserklarungProgress;
  };

  return (
    <div className="einkommenserklaerung-container">
      <style>
        {`
          .search-modal {
            max-width: 600px;
            width: 90%;
          }
          .blue-corner {
            position: absolute;
            top: -170px;
            left: -10%;
            width: 55%;
            height: 300px;
            background: #064497;
            border-radius: 50%;
            z-index: 2;
            pointer-events: none;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            overflow: visible;
          }
          .blue-corner-text {
            pointer-events: auto;
            text-align: center;
            color: #ffffff;
            font-weight: 300;
            width: 100%;
            position: relative;
            font-weight: 300;
            font-family: 'Roboto';
            font-style: normal;
            margin-top: 200px;
            font-size: 30px;
            display: block;
          }
          @media (max-width: 1040px) {
            .blue-corner {
              width: 35%;
              height: 140px;
              top: -50px;
              left: -5%;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .blue-corner-text {
              margin-top: 0;
              margin-bottom: 0;
              position: relative;
              font-weight: 300;
            }
          }
          @media (max-width: 1040px) {
            .blue-corner {
              display: none;
            }
          }
        `}
      </style>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" 
             style={{ 
               backgroundColor: 'rgba(255, 255, 255, 0.9)', 
               zIndex: 9999 
             }}>
          <div className="text-center">
            <Spinner animation="border" role="status" style={{ width: '3rem', height: '3rem', color: '#064497' }}>
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <div className="mt-3" style={{ color: '#064497' }}>Bitte warten...</div>
          </div>
        </div>
      )}



      {/* Header ellipse */}
      <div className="blue-corner">
        <span className="blue-corner-text">EINKOMMENSERKLÄRUNG</span>
      </div>

      {/* Toggle Switch and Search Icon */}
      <div className="absolute top-12 end-9">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 d-flex">
          <Button
            variant="link"
            className="p-3"
            onClick={() => setShowSearchModal(true)}
            style={{ color: '#064497' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Button>
          
          <div className="border-start border-white/20" style={{ margin: '0.5rem 0' }}></div>
          
          <Button
            variant="link"
            className={`p-3 ${hasUnsavedChanges ? 'fw-medium' : ''}`}
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.preventDefault();
              saveData(false);
            }}
            style={{ 
              color: hasUnsavedChanges ? '#064497' : '#6c757d',
              textDecoration: 'none',
              fontSize: '0.9rem'
            } as React.CSSProperties}
          >
            Speichern
          </Button>

          <PDFDownloadButton formType="einkommenserklarung" /> 
          
          <div className="border-start border-white/20" style={{ margin: '0.5rem 0' }}></div>
          
          <div className="d-flex align-items-center gap-2 px-3">
            <Form.Check
              type="switch"
              id="validation-toggle"
              checked={showValidation}
              onChange={handleToggleValidation}
              className="mb-0"
              style={{
                '--bs-form-switch-bg': 'rgba(255, 255, 255, 0.3)',
                '--bs-form-switch-color': '#064497',
                '--bs-form-switch-checked-bg': '#064497',
                '--bs-form-switch-checked-color': '#ffffff',
                '--bs-form-switch-width': '3em',
                '--bs-form-switch-height': '1.5em',
                '--bs-form-switch-padding-start': '2.5em',
                '--bs-form-switch-padding-end': '0.5em',
                '--bs-form-switch-border-radius': '2em',
                '--bs-form-switch-transition': 'all 0.2s ease-in-out'
              } as React.CSSProperties}
            />
            <label 
              htmlFor="validation-toggle" 
              className="text-black mb-0 fw-medium"
              style={{ fontSize: '0.9rem', userSelect: 'none'}}
            >
              Fehler anzeigen
            </label>
          </div>
        </div>
      </div>

      <Container className="pt-44">
        {/* Person Selection Buttons */}
        <div style={{ height: '120px', display: 'flex', alignItems: 'center' }}>
          <div className="person-scroll-outer mb-8">
            <div 
              className="scroll-container"
              style={{ minHeight: '80px' }}
            >
              {/* Main Applicant Button */}
              <Button
                variant={selectedIndex === 0 ? 'primary' : 'outline-primary'}
                className="rounded-pill px-4 py-2 flex-shrink-0"
                style={{ 
                  backgroundColor: selectedIndex === 0 ? '#064497' : '#D7DAEA',
                  border: 'none',
                  color: selectedIndex === 0 ? 'white' : 'black',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  minWidth: '200px'
                }}
                onClick={() => setSelectedIndex(0)}
              >
                Hauptantragsteller
              </Button>

              {/* Additional Applicants Buttons */}
              {additionalApplicants.map((applicant, index) => (
                <div key={index} className="d-flex align-items-center gap-3 flex-shrink-0">
                  <Button
                    variant={selectedIndex === index + 1 ? 'primary' : 'outline-primary'}
                    className="rounded-pill px-4 py-2"
                    style={{ 
                      backgroundColor: selectedIndex === index + 1 ? '#064497' : '#D7DAEA',
                      border: 'none',
                      color: selectedIndex === index + 1 ? 'white' : 'black',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      minWidth: '200px'
                    }}
                    onClick={() => setSelectedIndex(index + 1)}
                  >
                    {getApplicantDisplayName(applicant, index + 1)}
                  </Button>
                  <Button
                    variant="link"
                    className="text-danger p-0 flex-shrink-0"
                    onClick={() => handleRemoveApplicant(index)}
                    style={{ 
                      minWidth: 'auto',
                      boxShadow: 'none'
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 18L18 6M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </Button>
                </div>
              ))}

              {/* Add Person Button */}
              <Button 
                variant="outline-primary"
                onClick={handleAddApplicant}
                className="rounded-pill px-4 py-2 flex-shrink-0"
                style={{ 
                  backgroundColor: 'white',
                  border: 'none',
                  color: '#064497',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  minWidth: '200px'
                }}
              >
                Person Hinzufügen +
              </Button>
            </div>
          </div>
        </div>

        {/* Applicant Form (only selected) */}
        <div id={`applicant-${selectedIndex}`}>
          <EinkommenserklaerungForm
            data={getCurrentApplicant()}
            onChange={data => handleApplicantChange(selectedIndex, data)}
            isMainApplicant={selectedIndex === 0}
            showValidation={showValidation}
            sonderzuwendungenFieldErrors={sonderzuwendungenFieldErrors[selectedIndex]}
          />
        </div>

        {/* Bottom Buttons */}
        <div className="d-flex flex-column align-items-center mt-4 gap-3">
          <Button 
            variant="primary"
            onClick={validateForm}
            disabled={isLoading}
            style={{ 
              backgroundColor: '#064497',
              border: 'none',
              padding: '0.75rem 2rem',
              minWidth: '120px'
            }}
          >
            {isLoading ? <Spinner animation="border" size="sm" /> : 'PRÜFEN'}
          </Button>
          <Button 
            variant="link"
            onClick={() => saveData(true)}
            disabled={isLoading}
            className="text-decoration-underline mb-5 mt-3"
            style={{ color: 'black' }}
          >
            Speichern und zum persönlichen Bereich
          </Button>
        </div>
      </Container>

      {/* Search Modal */}
      <Modal show={showSearchModal} onHide={() => setShowSearchModal(false)} centered dialogClassName="search-modal">
        <Modal.Header closeButton>
          <Modal.Title>Suchen</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-4">
            <Form.Control
              type="text"
              placeholder="Suchen Sie nach Begriffen..."
              value={searchQuery}
              onChange={handleSearchInputChange}
              className="form-control"
              style={{ fontSize: '0.9rem' }}
            />
            {searchQuery.length > 0 && searchQuery.length < 3 && (
              <Form.Text className="text-muted">
                Bitte geben Sie mindestens 3 Zeichen ein
              </Form.Text>
            )}
          </Form.Group>

          {searchResults.length > 0 ? (
            <div className="search-results">
              {searchResults.map((result) => (
                <div key={result.section} className="mb-3 p-3 border rounded">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h5 className="mb-0">{sectionTitles[result.section as keyof typeof sectionTitles]}</h5>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigateToSection(result.section)}
                      style={{ backgroundColor: '#064497', border: 'none' }}
                    >
                      Zum Abschnitt
                    </Button>
                  </div>
                  <div className="matches">
                    {result.matches.map((match, index) => (
                      <span key={index} className="badge bg-light text-dark me-2 mb-2">
                        {match}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery.length >= 3 ? (
            <div className="text-center text-muted">
              Keine Ergebnisse gefunden
            </div>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            onClick={() => setShowSearchModal(false)}
            style={{ backgroundColor: '#064497', border: 'none' }}
          >
            Schließen
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Validation Modal */}
      <Modal show={showValidationModal} onHide={() => setShowValidationModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Bitte korrigieren Sie die folgenden Fehler</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="error-list">
            {Object.entries(validationErrors).map(([applicant, sectionErrors], index) => {
              // Only show if this applicant has any errors
              const hasErrors = Object.values(sectionErrors).some(arr => arr.length > 0);
              if (!hasErrors) return null;
              
              // Find the applicant index based on the display name
              const findApplicantIndex = (displayName: string): number => {
                if (displayName === 'Hauptantragsteller') {
                  return 0;
                }
                
                // For additional applicants, find by matching the display name
                for (let i = 0; i < additionalApplicants.length; i++) {
                  const applicantDisplayName = getApplicantDisplayName(additionalApplicants[i], i + 1);
                  if (applicantDisplayName === displayName) {
                    return i + 1;
                  }
                }
                
                // Fallback: try to extract from "Person X" format if still using old format
                const match = displayName.match(/Person (\d+)/);
                if (match) {
                  return parseInt(match[1]) - 1;
                }
                
                return 0; // Default fallback
              };
              
              const applicantIndex = findApplicantIndex(applicant);
              
              return (
                <div key={applicant} className="mb-3">
                  {/* Person Headline and Button (outside red background) */}
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h5 className="text-black mb-0 fw-medium">{applicant}</h5>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => {
                        setShowValidationModal(false);
                        setSelectedIndex(applicantIndex);
                        setPendingSection(null);
                      }}
                      style={{ backgroundColor: '#064497', color: '#fff', border: 'none' }}
                    >
                      Zur Person
                    </Button>
                  </div>
                  {/* Red background only for error list */}
                  <div className="alert alert-danger mb-0">
                    {Object.entries(sectionErrors as SectionErrors).map(([section, sectionErrs]) =>
                      sectionErrs.length > 0 && (
                        <div key={section} className="mb-3">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <h6 className="text-danger mb-0">{sectionTitles[section as SectionKey]}:</h6>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => {
                                setShowValidationModal(false);
                                setSelectedIndex(applicantIndex);
                                setPendingSection(section);
                              }}
                              style={{ borderColor: '#FFFFFF', color: '#064497' }}
                              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              Zum Abschnitt springen
                            </Button>
                          </div>
                          <ul className="mb-0 ps-3">
                            {sectionErrs.map((error, errorIndex) => (
                              <li key={errorIndex} className="mb-2">
                                {error}
                                {errorIndex < sectionErrs.length - 1 && (
                                  <hr className="my-2 border-danger opacity-25" />
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )
                    )}
                  </div>
                  {/* Divider between persons */}
                  {index < Object.keys(validationErrors).length - 1 && (
                    <hr className="my-3 border-gray-300 opacity-50" />
                  )}
                </div>
              );
            })}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            onClick={() => setShowValidationModal(false)}
            style={{ backgroundColor: '#064497', border: 'none' }}
          >
            Schließen
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Success Modal */}
      <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Glückwunsch!</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="alert alert-success mb-0">
            <p className="mb-3">Ihre Eingaben sind vollständig und stimmen mit den regulären Anforderungen überein.</p>
            <p className="mb-3">Sie können Ihre ausgefüllten Formulare im persönlichen Bereich querprüfen und anschließend einreichen.</p>
            <p className="text-muted small mb-0">Hinweis: Wir sind per Gesetz verpflichtet, das Einreichen aller Anträge zu ermöglichen, auch wenn diese Fehler enthalten.</p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <div className="d-flex justify-content-center align-items-center w-100">
            <Button 
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.preventDefault();
                setShowSuccessModal(false);
                saveData(true);
              }}
              style={{ backgroundColor: '#064497', border: 'none' }}
            >
              Speichern und zum persönlichen Bereich
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* Save Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header>
          <Modal.Title>Gespeichert</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="alert alert-success mb-0">Ihre Angaben wurden gespeichert.</div>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={() => setShowModal(false)} style={{ backgroundColor: '#064497', border: 'none' }}>Schließen</Button>
        </Modal.Footer>
      </Modal>

        {/* Info Modal for Add/Remove Applicants */}
        <Modal show={showInfoModal} onHide={() => setShowInfoModal(false)} centered>
        <Modal.Header>
          <Modal.Title>
            {infoModalType === 'add' ? 'Person hinzufügen' : 'Person entfernen'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-4">
            <p>
              Alle Mitglieder Ihres Haushalts, die ein eigenes Einkommen haben, 
              müssen die Einkommenserklärung und Selbstauskunft ausfüllen.
            </p>
            <div className="my-3" />
            <p>
              Falls Sie Ihre Haushaltsangaben ändern möchten, können Sie diese 
              im Schritt 2 des persönlichen Bereichs unter "Haushaltsauskunft" anpassen.
            </p>
          </div>
          
          <div className="d-flex flex-column gap-3">
            <Button
              variant="outline-primary"
              onClick={() => {
                setShowInfoModal(false);
                navigate('/personal-space');
              }}
              className="text-start p-3"
              style={{ borderColor: '#064497', color: '#064497', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D7DAEA'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div className="fw-bold mb-1">
                Zum persönlichen Bereich
              </div>
              <div className="text-muted small">
                Hier können Sie alle Ihre Formulare einsehen und verwalten.
              </div>
            </Button>
            
            <Button
              variant="outline-secondary"
              onClick={() => {
                setShowInfoModal(false);
                navigate('/haushaltsauskunft');
              }}
              className="text-start p-3"
              style={{ borderColor: '#064497', color: '#064497', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D7DAEA'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div className="fw-bold mb-1">
                Zur Haushaltsauskunft
              </div>
              <div className="text-muted small">
                Hier können Sie Ihre Haushaltsmitglieder verwalten und deren Einkommensstatus anpassen.
              </div>
            </Button>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowInfoModal(false)}
          >
            Abbrechen
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default EinkommenserklaerungContainer; 