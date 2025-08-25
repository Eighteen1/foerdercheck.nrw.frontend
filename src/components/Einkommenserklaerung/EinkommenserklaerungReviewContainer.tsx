import React, { useState, useEffect, useRef } from 'react';
import { Container, Modal, Form, Button } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, ensureUserFinancialsExists } from '../../lib/supabase';
import { safeFormatCurrencyForDisplay } from '../../utils/currencyUtils';
import EinkommenserklaerungForm from './Steps/EinkommenserklaerungForm';
import './EinkommenserklaerungContainer.css';

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
    };
  };
}

interface MainFinancials {
  title: string;
  firstName: string;
  lastName: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  hasEmploymentIncome: boolean | null;
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
  werbungskosten?: string;
  kinderbetreuungskosten?: string;
  ispayingincometax?: boolean | null;
  ispayinghealthinsurance?: boolean | null;
  ispayingpension?: boolean | null;
  ispayingunterhalt?: boolean | null;
  unterhaltszahlungen?: Array<{ name: string; amount: string }>;
  additionalIncomeChanges?: AdditionalIncomeChange;
  finanzamt?: string;
  steuerid?: string;
}

interface AdditionalApplicantFinancials extends MainFinancials {
  originalPersonId?: string;
}

interface SearchResult {
  section: string;
  matches: string[];
}

// Add search terms for each section
const sectionSearchTerms: Record<string, string[]> = {
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

const sectionTitles: Record<string, string> = {
  personal: 'Persönliche Angaben',
  income: 'Einkommensangaben',
  'additional-income': 'Weitere Einkünfte',
  costs: 'Kosten, Zahlungen, und Abgaben',
  changes: 'Änderung der weiteren Einkünfte, Kosten und Zahlungen',
  legal: 'Gesetzliche Angaben',
};

const initialAdditionalIncomeChanges: AdditionalIncomeChange = {
  selectedTypes: [],
  changes: {}
};

interface EinkommenserklaerungReviewContainerProps {
  residentId: string;
}

// Validation interfaces (following EinkommenserklaerungContainer pattern)
interface SectionErrors {
  personal: string[];
  income: string[];
  'additional-income': string[];
  costs: string[];
  changes: string[];
  legal: string[];
}

interface ApplicantErrors {
  [applicantName: string]: SectionErrors;
}

// Add label and tooltip mapping for income types (copied from EinkommenserklaerungContainer)
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

const sectionTitleMap: Record<string, string> = {
  personal: 'Persönliche Angaben',
  income: 'Einkommensangaben',
  'additional-income': 'Weitere Einkünfte',
  costs: 'Kosten, Zahlungen, und Abgaben',
  changes: 'Änderung der weiteren Einkünfte, Kosten und Zahlungen',
  legal: 'Gesetzliche Angaben',
};

const EinkommenserklaerungReviewContainer: React.FC<EinkommenserklaerungReviewContainerProps> = ({ residentId }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [mainFinancials, setMainFinancials] = useState<MainFinancials | null>(null);
  const [additionalApplicants, setAdditionalApplicants] = useState<AdditionalApplicantFinancials[]>([]);
  const [currentApplicantIndex, setCurrentApplicantIndex] = useState(0);
  const [showValidation, setShowValidation] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollHintTimeout = useRef<any>(null);

  // Validation state variables (following EinkommenserklaerungContainer pattern)
  const [validationErrors, setValidationErrors] = useState<ApplicantErrors>({});
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [sonderzuwendungenFieldErrors, setSonderzuwendungenFieldErrors] = useState<Record<number, any>>({});

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
    loadSavedData();
  }, [residentId]);

  useEffect(() => {
    const checkOverflow = () => {
      const el = scrollRef.current;
      if (el && el.scrollWidth > el.clientWidth) {
        setShowScrollHint(true);
        if (scrollHintTimeout.current) clearTimeout(scrollHintTimeout.current);
        scrollHintTimeout.current = setTimeout(() => setShowScrollHint(false), 6500);
      } else {
        setShowScrollHint(false);
      }
    };
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => {
      window.removeEventListener('resize', checkOverflow);
      if (scrollHintTimeout.current) clearTimeout(scrollHintTimeout.current);
    };
  }, [mainFinancials, additionalApplicants]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      if (showScrollHint) setShowScrollHint(false);
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [showScrollHint]);

  const loadSavedData = async () => {
    if (!residentId) return;

    setIsLoading(true);
    try {
      // Ensure user_financials table exists for the user
      try {
        await ensureUserFinancialsExists(residentId);
      } catch (financialsError) {
        console.warn('Failed to ensure user_financials exists, continuing with load:', financialsError);
        // Continue with load even if user_financials creation fails
      }

      // Load user data
      const { data: userData, error: userError } = await supabase
        .from('user_data')
        .select('*')
        .eq('id', residentId)
        .single();

      if (userError) {
        console.error('Error loading user data:', userError);
        // Create empty user data structure instead of returning
        setMainFinancials({
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
          sonderzuwendungenVergangen: {
            weihnachtsgeld: '',
            urlaubsgeld: '',
            sonstige: ''
          },
          sonderzuwendungenKommend: {
            weihnachtsgeld: '',
            urlaubsgeld: '',
            sonstige: ''
          },
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
            selectedTypes: []
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
        });
        setAdditionalApplicants([]);
        setIsLoading(false);
        return;
      }
      
      // Set showValidation based on shouldShowErrorEink from database
      // const shouldShowError = userData?.should_show_error_einkommenserklaerung ?? false;
      // setShowValidation(shouldShowError);
      setShowValidation(true);

      // Load financial data
      const { data: financialData, error: financialError } = await supabase
        .from('user_financials')
        .select('*')
        .eq('user_id', residentId)
        .single();

      if (financialError) {
        console.error('Error loading financial data:', financialError);
        // Create empty financial data structure instead of returning
        const emptyFinancialData = {
          isEarningRegularIncome: null,
          prior_year: '',
          prior_year_earning: null,
          end_month_past12: '',
          end_year_past12: '',
          income_month1: null,
          income_month2: null,
          income_month3: null,
          income_month4: null,
          income_month5: null,
          income_month6: null,
          income_month7: null,
          income_month8: null,
          income_month9: null,
          income_month10: null,
          income_month11: null,
          income_month12: null,
          wheinachtsgeld_last12: null,
          urlaubsgeld_last12: null,
          otherincome_last12: null,
          wheinachtsgeld_next12: null,
          urlaubsgeld_next12: null,
          otherincome_next12: null,
          willchangeincome: null,
          incomechangedate: '',
          willchangeincrease: null,
          newincome: null,
          isnewincomemonthly: null,
          newincomereason: '',
          startemployment: '',
          iscontractlimited: null,
          endofcontract: '',
          werbungskosten: null,
          kinderbetreuungskosten: null,
          ispayingincometax: null,
          ispayinghealthinsurance: null,
          ispayingpension: null,
          ispayingunterhalt: null,
          unterhaltszahlungen: [],
          addition_change_inincome: initialAdditionalIncomeChanges,
          haspensionincome: false,
          hasrentincome: false,
          hasbusinessincome: false,
          hasagricultureincome: false,
          hasothercome: false,
          hastaxfreeunterhaltincome: false,
          hastaxableunterhaltincome: false,
          hasforeignincome: false,
          haspauschalincome: false,
          hasablgincome: false,
          incomepension: null,
          incomerent: null,
          incomerentyear: null,
          incomebusiness: null,
          incomebusinessyear: null,
          incomeagriculture: null,
          incomeagricultureyear: null,
          incomeothers: null,
          incomeothersyear: null,
          incomeunterhalttaxfree: null,
          incomeunterhalttaxable: null,
          incomeforeign: null,
          incomeforeignyear: null,
          incomeforeignmonthly: false,
          incomepauschal: null,
          incomeablg: null,
          incomealbgtype: null,
          additional_applicants_financials: [],
          finanzamt: '',
          steuerid: '',
        };
        
        // Set main applicant data with empty financial data
        setMainFinancials({
          title: userData?.title || '',
          firstName: userData?.firstname || '',
          lastName: userData?.lastname || '',
          street: userData?.person_street || '',
          houseNumber: userData?.person_housenumber || '',
          postalCode: userData?.person_postalcode || '',
          city: userData?.person_city || '',
          hasEmploymentIncome: emptyFinancialData.isEarningRegularIncome,
          incomeYear: emptyFinancialData.prior_year,
          incomeYearAmount: safeFormatCurrencyForDisplay(emptyFinancialData.prior_year_earning),
          incomeEndMonth: emptyFinancialData.end_month_past12,
          incomeEndYear: emptyFinancialData.end_year_past12,
          monthlyIncome: {},
          sonderzuwendungenVergangen: {
            weihnachtsgeld: safeFormatCurrencyForDisplay(emptyFinancialData.wheinachtsgeld_last12),
            urlaubsgeld: safeFormatCurrencyForDisplay(emptyFinancialData.urlaubsgeld_last12),
            sonstige: safeFormatCurrencyForDisplay(emptyFinancialData.otherincome_last12)
          },
          sonderzuwendungenKommend: {
            weihnachtsgeld: safeFormatCurrencyForDisplay(emptyFinancialData.wheinachtsgeld_next12),
            urlaubsgeld: safeFormatCurrencyForDisplay(emptyFinancialData.urlaubsgeld_next12),
            sonstige: safeFormatCurrencyForDisplay(emptyFinancialData.otherincome_next12)
          },
          willChangeIncome: emptyFinancialData.willchangeincome,
          incomeChangeDate: emptyFinancialData.incomechangedate,
          willChangeIncrease: emptyFinancialData.willchangeincrease,
          newIncome: safeFormatCurrencyForDisplay(emptyFinancialData.newincome),
          isNewIncomeMonthly: emptyFinancialData.isnewincomemonthly,
          newIncomeReason: emptyFinancialData.newincomereason,
          startEmployment: emptyFinancialData.startemployment,
          isContractLimited: emptyFinancialData.iscontractlimited,
          endOfContract: emptyFinancialData.endofcontract,
          werbungskosten: safeFormatCurrencyForDisplay(emptyFinancialData.werbungskosten),
          kinderbetreuungskosten: safeFormatCurrencyForDisplay(emptyFinancialData.kinderbetreuungskosten),
          ispayingincometax: emptyFinancialData.ispayingincometax,
          ispayinghealthinsurance: emptyFinancialData.ispayinghealthinsurance,
          ispayingpension: emptyFinancialData.ispayingpension,
          ispayingunterhalt: emptyFinancialData.ispayingunterhalt,
          unterhaltszahlungen: emptyFinancialData.unterhaltszahlungen || [],
          additionalIncomeChanges: emptyFinancialData.addition_change_inincome || initialAdditionalIncomeChanges,
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
          finanzamt: emptyFinancialData.finanzamt,
          steuerid: emptyFinancialData.steuerid,
        });

        // Load additional applicants data with empty financial data
        if (userData?.weitere_antragstellende_personen) {
          // Handle UUID-based structure for additional applicants
          const weiterePersonenData = userData.weitere_antragstellende_personen || {};
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

          // Filter out persons with noIncome = true
          const applicantEntries = Object.entries(weiterePersonenObj).filter(([uuid, person]: [string, any]) => {
            const noIncome = person.noIncome;
            const notHousehold = person.notHousehold;
            return noIncome !== true && notHousehold !== true; // Include if not explicitly set to true
          });

          const additionalApplicantsData = applicantEntries.map(([uuid, person]: [string, any]) => ({
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
            sonderzuwendungenVergangen: {
              weihnachtsgeld: '',
              urlaubsgeld: '',
              sonstige: ''
            },
            sonderzuwendungenKommend: {
              weihnachtsgeld: '',
              urlaubsgeld: '',
              sonstige: ''
            },
            willChangeIncome: null,
            incomeChangeDate: '',
            willChangeIncrease: null,
            newIncome: '',
            isNewIncomeMonthly: null,
            newIncomeReason: '',
            startEmployment: '',
            isContractLimited: null,
            endOfContract: '',
            werbungskosten: '',
            kinderbetreuungskosten: '',
            ispayingincometax: null,
            ispayinghealthinsurance: null,
            ispayingpension: null,
            ispayingunterhalt: null,
            unterhaltszahlungen: [],
            additionalIncomeChanges: initialAdditionalIncomeChanges,
            weitereEinkuenfte: {
              selectedTypes: []
            },
            finanzamt: '',
            steuerid: '',
          }));

          setAdditionalApplicants(additionalApplicantsData);
        } else {
          setAdditionalApplicants([]);
        }
        
        setIsLoading(false);
        return;
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
        incomeYearAmount: safeFormatCurrencyForDisplay(financialData?.prior_year_earning),
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
          weihnachtsgeld: safeFormatCurrencyForDisplay(financialData?.wheinachtsgeld_last12),
          urlaubsgeld: safeFormatCurrencyForDisplay(financialData?.urlaubsgeld_last12),
          sonstige: safeFormatCurrencyForDisplay(financialData?.otherincome_last12)
        },
        sonderzuwendungenKommend: {
          weihnachtsgeld: safeFormatCurrencyForDisplay(financialData?.wheinachtsgeld_next12),
          urlaubsgeld: safeFormatCurrencyForDisplay(financialData?.urlaubsgeld_next12),
          sonstige: safeFormatCurrencyForDisplay(financialData?.otherincome_next12)
        },
        willChangeIncome: financialData?.willchangeincome ?? null,
        incomeChangeDate: financialData?.incomechangedate || '',
        willChangeIncrease: financialData?.willchangeincrease ?? null,
        newIncome: safeFormatCurrencyForDisplay(financialData?.newincome),
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
          renten: financialData?.haspensionincome ? { betrag: safeFormatCurrencyForDisplay(financialData.incomepension), turnus: 'monatlich' } : undefined,
          vermietung: financialData?.hasrentincome ? { betrag: safeFormatCurrencyForDisplay(financialData.incomerent), jahr: financialData.incomerentyear ? String(financialData.incomerentyear) : '' } : undefined,
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
            newIncome: safeFormatCurrencyForDisplay(financialData?.newincome),
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
    } catch (error) {
      console.error('Error loading saved data:', error);
    } finally {
      setIsLoading(false);
    }
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
    // Expand and scroll to the section
    const sectionElement = document.querySelector(`[data-section="${section}"]`);
    if (sectionElement) {
      (sectionElement as HTMLElement).click();
      sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setShowSearchModal(false);
  };

  const getCurrentApplicant = () => {
    if (currentApplicantIndex === 0) {
      return mainFinancials;
    }
    return additionalApplicants[currentApplicantIndex - 1];
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
      return `${typeLabel}: Der neue Betrag ist geringer als oder gleich dem alten Betrag.`;
    }
    
    if (change.increase === false && newValue >= currentValue) {
      return `${typeLabel}: Der neue Betrag ist größer als oder gleich dem alten Betrag.`;
    }
    
    return null;
  };

  const validateSonderzuwendungen = (applicant: MainFinancials | AdditionalApplicantFinancials, isMainApplicant: boolean) => {
    const sonderzuwendungenFieldErrors: any = { vergangen: {}, kommend: {} };
    
    if (applicant.hasEmploymentIncome) {
      const v = applicant.sonderzuwendungenVergangen || {};
      const k = applicant.sonderzuwendungenKommend || {};
      
      if (!v.weihnachtsgeld) {
        sonderzuwendungenFieldErrors.vergangen.weihnachtsgeld = ['Vergangene 12 Monate: Weihnachtsgeld wurde nicht angegeben'];
      }
      if (!v.urlaubsgeld) {
        sonderzuwendungenFieldErrors.vergangen.urlaubsgeld = ['Vergangene 12 Monate: Urlaubsgeld wurde nicht angegeben'];
      }
      if (!v.sonstige) {
        sonderzuwendungenFieldErrors.vergangen.sonstige = ['Vergangene 12 Monate: sonstige Leistungen wurden nicht angegeben'];
      }
      if (!k.weihnachtsgeld) {
        sonderzuwendungenFieldErrors.kommend.weihnachtsgeld = ['Kommende 12 Monate: Weihnachtsgeld wurde nicht angegeben'];
      }
      if (!k.urlaubsgeld) {
        sonderzuwendungenFieldErrors.kommend.urlaubsgeld = ['Kommende 12 Monate: Urlaubsgeld wurde nicht angegeben'];
      }
      if (!k.sonstige) {
        sonderzuwendungenFieldErrors.kommend.sonstige = ['Kommende 12 Monate: sonstige Leistungen wurden nicht angegeben'];
      }
    }

    return sonderzuwendungenFieldErrors;
  };

  // Validation function
  const validateForm = () => {
    const errors: ApplicantErrors = {};
    const newSonderzuwendungenFieldErrors: Record<number, any> = {};

    // --- Main Applicant ---
    if (mainFinancials) {
      const mainSectionErrors: SectionErrors = {
        personal: [], income: [], 'additional-income': [], costs: [], changes: [], legal: []
      };
      
      // Section: personal
      if (!mainFinancials.title) mainSectionErrors.personal.push('Titel wurde nicht angegeben');
      if (!mainFinancials.firstName) mainSectionErrors.personal.push('Vorname wurde nicht angegeben');
      if (!mainFinancials.lastName) mainSectionErrors.personal.push('Name wurde nicht angegeben');
      if (!mainFinancials.street) mainSectionErrors.personal.push('Straße wurde nicht angegeben');
      if (!mainFinancials.houseNumber) mainSectionErrors.personal.push('Hausnummer wurde nicht angegeben');
      if (!mainFinancials.postalCode) mainSectionErrors.personal.push('Postleitzahl wurde nicht angegeben');
      else if (!/^\d{5}$/.test(mainFinancials.postalCode)) mainSectionErrors.personal.push('Die Postleitzahl besteht nicht aus genau 5 Ziffern');
      if (!mainFinancials.city) mainSectionErrors.personal.push('Ort wurde nicht angegeben');

      // Section: income
      if (mainFinancials.hasEmploymentIncome === null) mainSectionErrors.income.push('Es wurde nicht angegeben, ob der Antragsteller Einkünfte aus nichtselbstständiger Arbeit/Versorgungsbezüge erzielt');
      if (mainFinancials.hasEmploymentIncome) {
        if (!mainFinancials.incomeYear) mainSectionErrors.income.push('Jahr für steuerpflichtige Einkünfte wurde nicht angegeben');
        if (!mainFinancials.incomeYearAmount) mainSectionErrors.income.push('Jahresbetrag für steuerpflichtige Einkünfte wurde nicht angegeben');
        if (!mainFinancials.incomeEndMonth) mainSectionErrors.income.push('Letzter Monat wurde nicht angegeben');
        if (!mainFinancials.incomeEndYear) mainSectionErrors.income.push('Jahr für letzter Monat wurde nicht angegeben');
        const endMonth = parseInt(mainFinancials.incomeEndMonth);
        const endYear = parseInt(mainFinancials.incomeEndYear);
        if (!isNaN(endMonth) && !isNaN(endYear)) {
          for (let i = 11; i >= 0; i--) {
            const month = (endMonth - i + 12) % 12;
            const year = endYear - (endMonth < i ? 1 : 0);
            const key = `${year}-${month}`;
            if (!mainFinancials.monthlyIncome?.[key]) {
              mainSectionErrors.income.push(`Einkommen für ${new Date(year, month).toLocaleString('de-DE', { month: 'long', year: 'numeric' })} wurde nicht angegeben`);
            }
          }
        }
        // Sonderzuwendungen
        const mainSonderzuwendungenErrors = validateSonderzuwendungen(mainFinancials, true);
        newSonderzuwendungenFieldErrors[0] = mainSonderzuwendungenErrors;
        Object.values(mainSonderzuwendungenErrors.vergangen).forEach((arr) => (arr as string[]).forEach((e: string) => mainSectionErrors.income.push(e)));
        Object.values(mainSonderzuwendungenErrors.kommend).forEach((arr) => (arr as string[]).forEach((e: string) => mainSectionErrors.income.push(e)));
        // Änderung der Einkünfte
        if (mainFinancials.willChangeIncome === null) mainSectionErrors.income.push('Es wurde nicht angegeben, ob sich das Einkommen des Antragstellers ändern wird.');
        if (mainFinancials.willChangeIncome) {
          if (!mainFinancials.incomeChangeDate) {
            mainSectionErrors.income.push('Das Datum der Einkommensänderung wurde nicht angegeben.');
          } else if (!isValidFutureDate(mainFinancials.incomeChangeDate)) {
            mainSectionErrors.income.push('Das Datum der Einkommensänderung liegt außerhalb des gültigen Bereichs (nicht mehr als 12 Monate in der Vergangenheit und nicht mehr als 12 Monate in der Zukunft).');
          }
          if (mainFinancials.willChangeIncrease === null) mainSectionErrors.income.push('Es wurde nicht angegeben, ob das Einkommen steigt oder sinkt.');
          if (!mainFinancials.newIncome) mainSectionErrors.income.push('Der neue Betrag wurde nicht angegeben.');
          if (mainFinancials.isNewIncomeMonthly === null) mainSectionErrors.income.push('Es wurde nicht angegeben, ob der neue Betrag monatlich oder jährlich ist.');
          if (!mainFinancials.newIncomeReason) mainSectionErrors.income.push('Die Begründung für die Einkommensänderung wurde nicht angegeben.');
        }
        if (!mainFinancials.startEmployment) {
          mainSectionErrors.income.push('Das Beschäftigungsbeginn-Datum wurde nicht angegeben.');
        } else if (!isValidEmploymentStartDate(mainFinancials.startEmployment)) {
          mainSectionErrors.income.push('Das angegebene Beschäftigungsbeginn-Datum ist nicht gültig.');
        }
        if (mainFinancials.isContractLimited === null) mainSectionErrors.income.push('Es wurde nicht angegeben, ob der Vertrag befristet oder unbefristet ist.');
        if (mainFinancials.isContractLimited && !mainFinancials.endOfContract) {
          mainSectionErrors.income.push('Das Ende des befristeten Vertrags wurde nicht angegeben.');
        } else if (mainFinancials.isContractLimited && mainFinancials.endOfContract && !isValidContractEndDate(mainFinancials.endOfContract)) {
          mainSectionErrors.income.push('Das angegebene Vertragsende-Datum ist nicht gültig.');
        }
      }
      // Section: additional-income
      if (mainFinancials.weitereEinkuenfte?.selectedTypes) {
        mainFinancials.weitereEinkuenfte.selectedTypes.forEach(type => {
          switch (type) {
            case 'renten':
              if (!mainFinancials.weitereEinkuenfte?.renten?.betrag) mainSectionErrors['additional-income'].push('Betrag für Renten wurde nicht angegeben');
              break;
            case 'vermietung':
              if (!mainFinancials.weitereEinkuenfte?.vermietung?.jahr || !mainFinancials.weitereEinkuenfte?.vermietung?.betrag) mainSectionErrors['additional-income'].push('Jahr und Betrag für Vermietung/Verpachtung wurden nicht angegeben');
              break;
            case 'gewerbe':
              if (!mainFinancials.weitereEinkuenfte?.gewerbe?.jahr || !mainFinancials.weitereEinkuenfte?.gewerbe?.betrag) mainSectionErrors['additional-income'].push('Jahr und Betrag für Gewerbebetrieb/selbstständige Arbeit wurden nicht angegeben');
              break;
            case 'landforst':
              if (!mainFinancials.weitereEinkuenfte?.landforst?.jahr || !mainFinancials.weitereEinkuenfte?.landforst?.betrag) mainSectionErrors['additional-income'].push('Jahr und Betrag für Land- und Forstwirtschaft wurden nicht angegeben');
              break;
            case 'sonstige':
              if (!mainFinancials.weitereEinkuenfte?.sonstige?.jahr || !mainFinancials.weitereEinkuenfte?.sonstige?.betrag) mainSectionErrors['additional-income'].push('Jahr und Betrag für Sonstige Einkünfte wurden nicht angegeben');
              break;
            case 'unterhaltsteuerfrei':
              if (!mainFinancials.weitereEinkuenfte?.unterhaltsteuerfrei?.betrag) mainSectionErrors['additional-income'].push('Betrag für Unterhaltsleistungen steuerfrei wurde nicht angegeben');
              break;
            case 'unterhaltsteuerpflichtig':
              if (!mainFinancials.weitereEinkuenfte?.unterhaltsteuerpflichtig?.betrag) mainSectionErrors['additional-income'].push('Betrag für Unterhaltsleistungen steuerpflichtig wurde nicht angegeben');
              break;
            case 'ausland':
              if (!mainFinancials.weitereEinkuenfte?.ausland?.turnus) {
                mainSectionErrors['additional-income'].push('Turnus für Ausländische Einkünfte wurde nicht angegeben');
              } else if (mainFinancials.weitereEinkuenfte?.ausland?.turnus === 'jährlich') {
                if (!mainFinancials.weitereEinkuenfte?.ausland?.jahr || !mainFinancials.weitereEinkuenfte?.ausland?.betrag) {
                  mainSectionErrors['additional-income'].push('Jahr und Betrag für Ausländische Einkünfte wurden nicht angegeben');
                }
              } else if (mainFinancials.weitereEinkuenfte?.ausland?.turnus === 'monatlich') {
                if (!mainFinancials.weitereEinkuenfte?.ausland?.betrag) {
                  mainSectionErrors['additional-income'].push('Betrag für Ausländische Einkünfte wurde nicht angegeben');
                }
              }
              break;
            case 'pauschal':
              if (!mainFinancials.weitereEinkuenfte?.pauschal?.betrag) mainSectionErrors['additional-income'].push('Betrag für pauschal besteuerten Arbeitslohn wurde nicht angegeben');
              break;
            case 'arbeitslosengeld':
              if (!mainFinancials.weitereEinkuenfte?.arbeitslosengeld?.betrag || !mainFinancials.weitereEinkuenfte?.arbeitslosengeld?.turnus) mainSectionErrors['additional-income'].push('Betrag und Zeitraum für Arbeitslosengeld wurden nicht angegeben');
              break;
            default:
              break;
          }
        });
      }
      // Section: costs
      if (mainFinancials.hasEmploymentIncome && !mainFinancials.werbungskosten) mainSectionErrors.costs.push('Werbungskosten wurden nicht angegeben');
      if (mainFinancials.ispayingincometax === null) mainSectionErrors.costs.push('Es wurde nicht angegeben, ob der Antragsteller Einkommensteuer zahlt');
      if (mainFinancials.ispayinghealthinsurance === null) mainSectionErrors.costs.push('Es wurde nicht angegeben, ob der Antragsteller Krankenversicherung zahlt');
      if (mainFinancials.ispayingpension === null) mainSectionErrors.costs.push('Es wurde nicht angegeben, ob der Antragsteller Rentenversicherung zahlt');
      if (mainFinancials.ispayingunterhalt === null) mainSectionErrors.costs.push('Es wurde nicht angegeben, ob der Antragsteller Unterhalt zahlt');
      if (mainFinancials.ispayingunterhalt === true && (!mainFinancials.unterhaltszahlungen || mainFinancials.unterhaltszahlungen.length === 0)) {
        mainSectionErrors.costs.push('Es wurde keine Person für Unterhaltszahlungen hinzugefügt');
      }
      if (mainFinancials.ispayingunterhalt === true && Array.isArray(mainFinancials.unterhaltszahlungen)) {
        mainFinancials.unterhaltszahlungen.forEach((zahlung, idx) => {
          if (!zahlung.name) mainSectionErrors.costs.push(`Name für Person ${idx + 1} bei Unterhaltszahlungen wurde nicht angegeben`);
          if (!zahlung.amount) mainSectionErrors.costs.push(`Betrag für Person ${idx + 1} bei Unterhaltszahlungen wurde nicht angegeben`);
        });
      }
      // Section: changes
      if (mainFinancials.additionalIncomeChanges?.selectedTypes?.length) {
        mainFinancials.additionalIncomeChanges.selectedTypes.forEach(type => {
          const change: any = mainFinancials.additionalIncomeChanges?.changes?.[type] || {};
          if (!change.date) {
            mainSectionErrors.changes.push(`Das Änderungsdatum für ${typeLabels[type] || additionalChangeTypeLabels[type] || type} wurde nicht angegeben.`);
          } else if (!isValidFutureDate(change.date)) {
            mainSectionErrors.changes.push(`Das Änderungsdatum für ${typeLabels[type] || additionalChangeTypeLabels[type] || type} liegt außerhalb des gültigen Bereichs (nicht mehr als 12 Monate in der Vergangenheit und nicht mehr als 12 Monate in der Zukunft).`);
          }
          if (!change.newAmount) mainSectionErrors.changes.push(`Der neue Betrag für ${typeLabels[type] || additionalChangeTypeLabels[type] || type} wurde nicht angegeben.`);
          if (typeof change.increase !== 'boolean') {
            mainSectionErrors.changes.push(`Es wurde nicht angegeben, ob sich das Einkommen für ${typeLabels[type] || additionalChangeTypeLabels[type] || type} erhöht oder verringert.`);
          } else {
            const radioValidationError = validateIncreaseDecreaseRadio(mainFinancials, type, change);
            if (radioValidationError) {
              mainSectionErrors.changes.push(radioValidationError);
            }
          }
          if (change.isNewIncomeMonthly === null || change.isNewIncomeMonthly === undefined) mainSectionErrors.changes.push(`Es wurde nicht angegeben, ob der neue Betrag für ${typeLabels[type] || additionalChangeTypeLabels[type] || type} monatlich oder jährlich ist.`);
          if (!change.reason) mainSectionErrors.changes.push(`Die Begründung für die Änderung bei ${typeLabels[type] || additionalChangeTypeLabels[type] || type} wurde nicht angegeben.`);
        });
      }
      // Section: legal
      if (!mainFinancials.finanzamt) mainSectionErrors.legal.push('Zuständiges Finanzamt wurde nicht angegeben');
      if (!mainFinancials.steuerid) mainSectionErrors.legal.push('Steuer-ID wurde nicht angegeben');

      errors[getApplicantDisplayName(mainFinancials, 0)] = mainSectionErrors;
    }

    // --- Additional Applicants ---
    additionalApplicants.forEach((applicant, index) => {
      const applicantSectionErrors: SectionErrors = {
        personal: [], income: [], 'additional-income': [], costs: [], changes: [], legal: []
      };
      // Section: personal
      if (!applicant.title) applicantSectionErrors.personal.push('Titel wurde nicht angegeben');
      if (!applicant.firstName) applicantSectionErrors.personal.push('Vorname wurde nicht angegeben');
      if (!applicant.lastName) applicantSectionErrors.personal.push('Name wurde nicht angegeben');
      if (!applicant.street) applicantSectionErrors.personal.push('Straße wurde nicht angegeben');
      if (!applicant.houseNumber) applicantSectionErrors.personal.push('Hausnummer wurde nicht angegeben');
      if (!applicant.postalCode) applicantSectionErrors.personal.push('Postleitzahl wurde nicht angegeben');
      else if (!/^\d{5}$/.test(applicant.postalCode)) applicantSectionErrors.personal.push('Die Postleitzahl besteht nicht aus genau 5 Ziffern');
      if (!applicant.city) applicantSectionErrors.personal.push('Ort wurde nicht angegeben');
      // Section: income
      if (applicant.hasEmploymentIncome === null) applicantSectionErrors.income.push('Es wurde nicht angegeben, ob der Antragsteller Einkünfte aus nichtselbstständiger Arbeit/Versorgungsbezüge erzielt');
      if (applicant.hasEmploymentIncome) {
        if (!applicant.incomeYear) applicantSectionErrors.income.push('Jahr für steuerpflichtige Einkünfte wurde nicht angegeben');
        if (!applicant.incomeYearAmount) applicantSectionErrors.income.push('Jahresbetrag für steuerpflichtige Einkünfte wurde nicht angegeben');
        if (!applicant.incomeEndMonth) applicantSectionErrors.income.push('Letzter Monat wurde nicht angegeben');
        if (!applicant.incomeEndYear) applicantSectionErrors.income.push('Jahr für letzter Monat wurde nicht angegeben');
        const endMonth = parseInt(applicant.incomeEndMonth);
        const endYear = parseInt(applicant.incomeEndYear);
        if (!isNaN(endMonth) && !isNaN(endYear)) {
          for (let i = 11; i >= 0; i--) {
            const month = (endMonth - i + 12) % 12;
            const year = endYear - (endMonth < i ? 1 : 0);
            const key = `${year}-${month}`;
            if (!applicant.monthlyIncome?.[key]) {
              applicantSectionErrors.income.push(`Einkommen für ${new Date(year, month).toLocaleString('de-DE', { month: 'long', year: 'numeric' })} wurde nicht angegeben`);
            }
          }
        }
        // Sonderzuwendungen
        const additionalSonderzuwendungenErrors = validateSonderzuwendungen(applicant, false);
        newSonderzuwendungenFieldErrors[index + 1] = additionalSonderzuwendungenErrors;
        Object.values(additionalSonderzuwendungenErrors.vergangen).forEach((arr) => (arr as string[]).forEach((e: string) => applicantSectionErrors.income.push(e)));
        Object.values(additionalSonderzuwendungenErrors.kommend).forEach((arr) => (arr as string[]).forEach((e: string) => applicantSectionErrors.income.push(e)));
        if (applicant.willChangeIncome === null) applicantSectionErrors.income.push('Es wurde nicht angegeben, ob sich das Einkommen des Antragstellers ändern wird.');
        if (applicant.willChangeIncome) {
          if (!applicant.incomeChangeDate) {
            applicantSectionErrors.income.push('Das Datum der Einkommensänderung wurde nicht angegeben.');
          } else if (!isValidFutureDate(applicant.incomeChangeDate)) {
            applicantSectionErrors.income.push('Das Datum der Einkommensänderung liegt außerhalb des gültigen Bereichs (nicht mehr als 12 Monate in der Vergangenheit und nicht mehr als 12 Monate in der Zukunft).');
          }
          if (applicant.willChangeIncrease === null) applicantSectionErrors.income.push('Es wurde nicht angegeben, ob sich das Einkommen erhöht oder verringert.');
          if (!applicant.newIncome) applicantSectionErrors.income.push('Der neue Betrag wurde nicht angegeben.');
          if (applicant.isNewIncomeMonthly === null) applicantSectionErrors.income.push('Es wurde nicht angegeben, ob der neue Betrag monatlich oder jährlich ist.');
          if (!applicant.newIncomeReason) applicantSectionErrors.income.push('Die Begründung für die Einkommensänderung wurde nicht angegeben.');
        }
        if (!applicant.startEmployment) {
          applicantSectionErrors.income.push('Das Beschäftigungsbeginn-Datum wurde nicht angegeben.');
        } else if (!isValidEmploymentStartDate(applicant.startEmployment)) {
          applicantSectionErrors.income.push('Das angegebene Beschäftigungsbeginn-Datum ist nicht gültig.');
        }
        if (applicant.isContractLimited === null) applicantSectionErrors.income.push('Es wurde nicht angegeben, ob der Vertrag befristet oder unbefristet ist.');
        if (applicant.isContractLimited && !applicant.endOfContract) {
          applicantSectionErrors.income.push('Das Ende des befristeten Vertrags wurde nicht angegeben.');
        } else if (applicant.isContractLimited && applicant.endOfContract && !isValidContractEndDate(applicant.endOfContract)) {
          applicantSectionErrors.income.push('Das angegebene Vertragsende-Datum ist nicht gültig.');
        }
      }
      // Section: additional-income
      if (applicant.weitereEinkuenfte?.selectedTypes) {
        applicant.weitereEinkuenfte.selectedTypes.forEach(type => {
          switch (type) {
            case 'renten':
              if (!applicant.weitereEinkuenfte?.renten?.betrag) applicantSectionErrors['additional-income'].push('Betrag für Renten wurde nicht angegeben');
              break;
            case 'vermietung':
              if (!applicant.weitereEinkuenfte?.vermietung?.jahr || !applicant.weitereEinkuenfte?.vermietung?.betrag) applicantSectionErrors['additional-income'].push('Jahr und Betrag für Vermietung/Verpachtung wurden nicht angegeben');
              break;
            case 'gewerbe':
              if (!applicant.weitereEinkuenfte?.gewerbe?.jahr || !applicant.weitereEinkuenfte?.gewerbe?.betrag) applicantSectionErrors['additional-income'].push('Jahr und Betrag für Gewerbebetrieb/selbstständige Arbeit wurden nicht angegeben');
              break;
            case 'landforst':
              if (!applicant.weitereEinkuenfte?.landforst?.jahr || !applicant.weitereEinkuenfte?.landforst?.betrag) applicantSectionErrors['additional-income'].push('Jahr und Betrag für Land- und Forstwirtschaft wurden nicht angegeben');
              break;
            case 'sonstige':
              if (!applicant.weitereEinkuenfte?.sonstige?.jahr || !applicant.weitereEinkuenfte?.sonstige?.betrag) applicantSectionErrors['additional-income'].push('Jahr und Betrag für Sonstige Einkünfte wurden nicht angegeben');
              break;
            case 'unterhaltsteuerfrei':
              if (!applicant.weitereEinkuenfte?.unterhaltsteuerfrei?.betrag) applicantSectionErrors['additional-income'].push('Betrag für Unterhaltsleistungen steuerfrei wurde nicht angegeben');
              break;
            case 'unterhaltsteuerpflichtig':
              if (!applicant.weitereEinkuenfte?.unterhaltsteuerpflichtig?.betrag) applicantSectionErrors['additional-income'].push('Betrag für Unterhaltsleistungen steuerpflichtig wurde nicht angegeben');
              break;
            case 'ausland':
              if (!applicant.weitereEinkuenfte?.ausland?.turnus) {
                applicantSectionErrors['additional-income'].push('Turnus für Ausländische Einkünfte wurde nicht angegeben');
              } else if (applicant.weitereEinkuenfte?.ausland?.turnus === 'jährlich') {
                if (!applicant.weitereEinkuenfte?.ausland?.jahr || !applicant.weitereEinkuenfte?.ausland?.betrag) {
                  applicantSectionErrors['additional-income'].push('Jahr und Betrag für Ausländische Einkünfte wurden nicht angegeben');
                }
              } else if (applicant.weitereEinkuenfte?.ausland?.turnus === 'monatlich') {
                if (!applicant.weitereEinkuenfte?.ausland?.betrag) {
                  applicantSectionErrors['additional-income'].push('Betrag für Ausländische Einkünfte wurde nicht angegeben');
                }
              }
              break;
            case 'pauschal':
              if (!applicant.weitereEinkuenfte?.pauschal?.betrag) applicantSectionErrors['additional-income'].push('Betrag für pauschal besteuerten Arbeitslohn wurde nicht angegeben');
              break;
            case 'arbeitslosengeld':
              if (!applicant.weitereEinkuenfte?.arbeitslosengeld?.betrag || !applicant.weitereEinkuenfte?.arbeitslosengeld?.turnus) applicantSectionErrors['additional-income'].push('Betrag und Zeitraum für Arbeitslosengeld wurden nicht angegeben');
              break;
            default:
              break;
          }
        });
      }
      // Section: costs
      if (applicant.hasEmploymentIncome && !applicant.werbungskosten) applicantSectionErrors.costs.push('Werbungskosten wurden nicht angegeben');
      if (applicant.ispayingincometax === null) applicantSectionErrors.costs.push('Es wurde nicht angegeben, ob der Antragsteller Einkommensteuer zahlt');
      if (applicant.ispayinghealthinsurance === null) applicantSectionErrors.costs.push('Es wurde nicht angegeben, ob der Antragsteller Krankenversicherung zahlt');
      if (applicant.ispayingpension === null) applicantSectionErrors.costs.push('Es wurde nicht angegeben, ob der Antragsteller Rentenversicherung zahlt');
      if (applicant.ispayingunterhalt === null) applicantSectionErrors.costs.push('Es wurde nicht angegeben, ob der Antragsteller Unterhalt zahlt');
      if (applicant.ispayingunterhalt === true && (!applicant.unterhaltszahlungen || applicant.unterhaltszahlungen.length === 0)) {
        applicantSectionErrors.costs.push('Es wurde keine Person für Unterhaltszahlungen hinzugefügt');
      }
      if (applicant.ispayingunterhalt === true && Array.isArray(applicant.unterhaltszahlungen)) {
        applicant.unterhaltszahlungen.forEach((zahlung, idx) => {
          if (!zahlung.name) applicantSectionErrors.costs.push(`Name für Person ${idx + 1} bei Unterhaltszahlungen wurde nicht angegeben`);
          if (!zahlung.amount) applicantSectionErrors.costs.push(`Betrag für Person ${idx + 1} bei Unterhaltszahlungen wurde nicht angegeben`);
        });
      }
      // Section: changes
      if (applicant.additionalIncomeChanges?.selectedTypes?.length) {
        applicant.additionalIncomeChanges.selectedTypes.forEach(type => {
          const change: any = applicant.additionalIncomeChanges?.changes?.[type] || {};
          if (!change.date) {
            applicantSectionErrors.changes.push(`Das Änderungsdatum für ${typeLabels[type] || additionalChangeTypeLabels[type] || type} wurde nicht angegeben.`);
          } else if (!isValidFutureDate(change.date)) {
            applicantSectionErrors.changes.push(`Das Änderungsdatum für ${typeLabels[type] || additionalChangeTypeLabels[type] || type} liegt außerhalb des gültigen Bereichs (nicht mehr als 12 Monate in der Vergangenheit und nicht mehr als 12 Monate in der Zukunft).`);
          }
          if (!change.newAmount) applicantSectionErrors.changes.push(`Der neue Betrag für ${typeLabels[type] || additionalChangeTypeLabels[type] || type} wurde nicht angegeben.`);
          if (typeof change.increase !== 'boolean') {
            applicantSectionErrors.changes.push(`Es wurde nicht angegeben, ob sich das Einkommen für ${typeLabels[type] || additionalChangeTypeLabels[type] || type} erhöht oder verringert.`);
          } else {
            const radioValidationError = validateIncreaseDecreaseRadio(applicant, type, change);
            if (radioValidationError) {
              applicantSectionErrors.changes.push(radioValidationError);
            }
          }
          if (change.isNewIncomeMonthly === null || change.isNewIncomeMonthly === undefined) applicantSectionErrors.changes.push(`Es wurde nicht angegeben, ob der neue Betrag für ${typeLabels[type] || additionalChangeTypeLabels[type] || type} monatlich oder jährlich ist.`);
          if (!change.reason) applicantSectionErrors.changes.push(`Die Begründung für die Änderung bei ${typeLabels[type] || additionalChangeTypeLabels[type] || type} wurde nicht angegeben.`);
        });
      }
      // Section: legal
      if (!applicant.finanzamt) applicantSectionErrors.legal.push('Zuständiges Finanzamt wurde nicht angegeben');
      if (!applicant.steuerid) applicantSectionErrors.legal.push('Steuer-ID wurde nicht angegeben');
      errors[getApplicantDisplayName(applicant, index + 1)] = applicantSectionErrors;
    });

    setValidationErrors(errors);
    const hasAnyErrors = Object.values(errors).some(sectionObj => Object.values(sectionObj).some(arr => arr.length > 0));
    setShowValidationModal(hasAnyErrors);
    setShowSuccessModal(!hasAnyErrors);
    setSonderzuwendungenFieldErrors(newSonderzuwendungenFieldErrors);
  };

  if (isLoading) {
    return <div>Formular lädt...</div>;
  }

  return (
    <div className="einkommenserklaerung-review-container">
        <style>
        {`
          .search-modal {
            max-width: 600px;
            width: 90%;
          }
          .error-button {
            color: #dc3545 !important;
          }
          .error-button:hover {
            background: #f8d7da !important;
          }
        `}
        </style>
        <div className="review-header">
        <div className="search-container gap-2">
                <button onClick={() => setShowSearchModal(true)} title="Suchen">
                    <span className="material-icons" style={{ color: '#064497' }}>search</span>
                </button>
                <button onClick={validateForm} title="Validierung anzeigen">
                    <span className="material-icons error-button">error</span>
                </button>
            </div>
            <div style={{ position: 'relative', flex: 1 }}>
              <div className="step-scrollbar" ref={scrollRef}>
                <button
                    onClick={() => setCurrentApplicantIndex(0)}
                    className={
                        'applicant-switcher-button' + (currentApplicantIndex === 0 ? ' active' : '')
                    }
                >
                    Hauptantragsteller
                </button>
                {additionalApplicants.map((applicant, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentApplicantIndex(index + 1)}
                        className={
                            'applicant-switcher-button' + (currentApplicantIndex === index + 1 ? ' active' : '')
                        }
                    >
                        {getApplicantDisplayName(applicant, index + 1)}
                    </button>
                ))}
              </div>
            </div>
        </div>
        {/* SCROLL HINT BELOW HEADER */}
        {showScrollHint && (
          <div style={{
            position: 'relative',
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            zIndex: 20,
            marginTop: 4
          }}>
            <div style={{
              position: 'relative',
              background: '#fff',
              color: '#222',
              borderRadius: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,0.13)',
              padding: '10px 18px 10px 14px',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              minWidth: 320,
              maxWidth: 420,
              border: '1px solid #f3b13c',
            }}>
              <span className="material-icons" style={{ color: '#f3b13c', fontSize: 28, marginRight: 10 }}>info</span>
              <span>Scrollen Sie nach rechts, um alle Schritte zu sehen.</span>
              {/* Arrow */}
              <span style={{
                position: 'absolute',
                top: -12,
                left: '10%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '10px solid transparent',
                borderRight: '10px solid transparent',
                borderBottom: '12px solid #fff',
                filter: 'drop-shadow(0 -2px 2px rgba(0,0,0,0.07))',
                zIndex: 1
              }} />
              {/* Arrow border for outline */}
              <span style={{
                position: 'absolute',
                top: -14,
                left: '10%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '11px solid transparent',
                borderRight: '11px solid transparent',
                borderBottom: '14px solid #f3b13c',
                zIndex: 0
              }} />
            </div>
          </div>
        )}
        <div className="form-content">
            <EinkommenserklaerungForm
                data={getCurrentApplicant()}
                onChange={() => {}} // No-op since this is read-only
                isMainApplicant={currentApplicantIndex === 0}
                showValidation={showValidation}
                isReadOnly={true}
            />
        </div>

        <Modal show={showSearchModal} onHide={() => setShowSearchModal(false)} centered dialogClassName="search-modal">
            <Modal.Header closeButton>
                <Modal.Title>Im Formular Suchen</Modal.Title>
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
            <Modal.Title>Validierung: Gefundene Fehler</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="error-list">
              {Object.entries(validationErrors).map(([applicant, sectionErrors], index) => {
                // Only show if this applicant has any errors
                const hasErrors = Object.values(sectionErrors).some(arr => arr.length > 0);
                if (!hasErrors) return null;
                
                return (
                  <div key={applicant} className="mb-3">
                    {/* Person Headline */}
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h5 className="text-black mb-0 fw-medium">{applicant}</h5>
                    </div>
                    {/* Red background only for error list */}
                    <div className="alert alert-danger mb-0">
                      {Object.entries(sectionErrors as SectionErrors).map(([section, sectionErrs]) =>
                        sectionErrs.length > 0 && (
                          <div key={section} className="mb-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <h6 className="text-danger mb-0">{sectionTitleMap[section as keyof typeof sectionTitleMap]}:</h6>
                            </div>
                            <ul className="mb-0 ps-3">
                              {sectionErrs.map((error: string, errorIndex: number) => (
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
            <Modal.Title>Validierung erfolgreich</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="alert alert-success mb-0">
              <p className="mb-3"><strong>Die Einkommenserklärung ist vollständig und entspricht den Anforderungen.</strong></p>
              <p className="mb-3">Alle erforderlichen Angaben sind vorhanden und die Formulardaten sind korrekt ausgefüllt.</p>
              <p className="text-muted small mb-0">Hinweis: Diese Validierung dient der Überprüfung der Formularvollständigkeit für die Bearbeitung.</p>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <div className="d-flex justify-content-center align-items-center w-100">
              <Button 
                onClick={() => setShowSuccessModal(false)}
                style={{ backgroundColor: '#064497', border: 'none', minWidth: 260 }}
              >
                Schließen
              </Button>
            </div>
          </Modal.Footer>
        </Modal>
    </div>
  );
};

export default EinkommenserklaerungReviewContainer; 