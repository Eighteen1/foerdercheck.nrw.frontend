import React, { useState, useEffect, useRef } from 'react';
import { Container, Modal, Form, Button } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, ensureUserFinancialsExists } from '../../lib/supabase';
import { formatCurrencyForDisplay } from '../../utils/currencyUtils';
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
          incomeYearAmount: emptyFinancialData.prior_year_earning ? formatCurrencyForDisplay(emptyFinancialData.prior_year_earning) : '',
          incomeEndMonth: emptyFinancialData.end_month_past12,
          incomeEndYear: emptyFinancialData.end_year_past12,
          monthlyIncome: {},
          sonderzuwendungenVergangen: {
            weihnachtsgeld: emptyFinancialData.wheinachtsgeld_last12 ? formatCurrencyForDisplay(emptyFinancialData.wheinachtsgeld_last12) : '',
            urlaubsgeld: emptyFinancialData.urlaubsgeld_last12 ? formatCurrencyForDisplay(emptyFinancialData.urlaubsgeld_last12) : '',
            sonstige: emptyFinancialData.otherincome_last12 ? formatCurrencyForDisplay(emptyFinancialData.otherincome_last12) : ''
          },
          sonderzuwendungenKommend: {
            weihnachtsgeld: emptyFinancialData.wheinachtsgeld_next12 ? formatCurrencyForDisplay(emptyFinancialData.wheinachtsgeld_next12) : '',
            urlaubsgeld: emptyFinancialData.urlaubsgeld_next12 ? formatCurrencyForDisplay(emptyFinancialData.urlaubsgeld_next12) : '',
            sonstige: emptyFinancialData.otherincome_next12 ? formatCurrencyForDisplay(emptyFinancialData.otherincome_next12) : ''
          },
          willChangeIncome: emptyFinancialData.willchangeincome,
          incomeChangeDate: emptyFinancialData.incomechangedate,
          willChangeIncrease: emptyFinancialData.willchangeincrease,
          newIncome: emptyFinancialData.newincome ? formatCurrencyForDisplay(emptyFinancialData.newincome) : '',
          isNewIncomeMonthly: emptyFinancialData.isnewincomemonthly,
          newIncomeReason: emptyFinancialData.newincomereason,
          startEmployment: emptyFinancialData.startemployment,
          isContractLimited: emptyFinancialData.iscontractlimited,
          endOfContract: emptyFinancialData.endofcontract,
          werbungskosten: emptyFinancialData.werbungskosten ? formatCurrencyForDisplay(emptyFinancialData.werbungskosten) : '',
          kinderbetreuungskosten: emptyFinancialData.kinderbetreuungskosten ? formatCurrencyForDisplay(emptyFinancialData.kinderbetreuungskosten) : '',
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
        hasEmploymentIncome: financialData?.isEarningRegularIncome || null,
        incomeYear: financialData?.prior_year || '',
        incomeYearAmount: financialData?.prior_year_earning ? formatCurrencyForDisplay(financialData.prior_year_earning) : '',
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

              if (monthData) {
                monthlyIncome[key] = formatCurrencyForDisplay(monthData);
              }
            }
          }
          return monthlyIncome;
        })(),
        sonderzuwendungenVergangen: {
          weihnachtsgeld: financialData?.wheinachtsgeld_last12 ? formatCurrencyForDisplay(financialData.wheinachtsgeld_last12) : '',
          urlaubsgeld: financialData?.urlaubsgeld_last12 ? formatCurrencyForDisplay(financialData.urlaubsgeld_last12) : '',
          sonstige: financialData?.otherincome_last12 ? formatCurrencyForDisplay(financialData.otherincome_last12) : ''
        },
        sonderzuwendungenKommend: {
          weihnachtsgeld: financialData?.wheinachtsgeld_next12 ? formatCurrencyForDisplay(financialData.wheinachtsgeld_next12) : '',
          urlaubsgeld: financialData?.urlaubsgeld_next12 ? formatCurrencyForDisplay(financialData.urlaubsgeld_next12) : '',
          sonstige: financialData?.otherincome_next12 ? formatCurrencyForDisplay(financialData.otherincome_next12) : ''
        },
        willChangeIncome: financialData?.willchangeincome ?? null,
        incomeChangeDate: financialData?.incomechangedate || '',
        willChangeIncrease: financialData?.willchangeincrease ?? null,
        newIncome: financialData?.newincome ? formatCurrencyForDisplay(financialData.newincome) : '',
        isNewIncomeMonthly: financialData?.isnewincomemonthly ?? null,
        newIncomeReason: financialData?.newincomereason || '',
        startEmployment: financialData?.startemployment || '',
        isContractLimited: financialData?.iscontractlimited ?? null,
        endOfContract: financialData?.endofcontract || '',
        werbungskosten: financialData?.werbungskosten ? formatCurrencyForDisplay(financialData.werbungskosten) : '',
        kinderbetreuungskosten: financialData?.kinderbetreuungskosten ? formatCurrencyForDisplay(financialData.kinderbetreuungskosten) : '',
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
          renten: financialData?.haspensionincome ? { betrag: financialData.incomepension ? formatCurrencyForDisplay(financialData.incomepension) : '', turnus: 'monatlich' } : undefined,
          vermietung: financialData?.hasrentincome ? { betrag: financialData.incomerent ? formatCurrencyForDisplay(financialData.incomerent) : '', jahr: financialData.incomerentyear ? String(financialData.incomerentyear) : '' } : undefined,
          gewerbe: financialData?.hasbusinessincome ? { betrag: financialData.incomebusiness ? formatCurrencyForDisplay(financialData.incomebusiness) : '', jahr: financialData.incomebusinessyear ? String(financialData.incomebusinessyear) : '' } : undefined,
          landforst: financialData?.hasagricultureincome ? { betrag: financialData.incomeagriculture ? formatCurrencyForDisplay(financialData.incomeagriculture) : '', jahr: financialData.incomeagricultureyear ? String(financialData.incomeagricultureyear) : '' } : undefined,
          sonstige: financialData?.hasothercome ? { betrag: financialData.incomeothers ? formatCurrencyForDisplay(financialData.incomeothers) : '', jahr: financialData.incomeothersyear ? String(financialData.incomeothersyear) : '' } : undefined,
          unterhaltsteuerfrei: financialData?.hastaxfreeunterhaltincome ? { betrag: financialData.incomeunterhalttaxfree ? formatCurrencyForDisplay(financialData.incomeunterhalttaxfree) : '' } : undefined,
          unterhaltsteuerpflichtig: financialData?.hastaxableunterhaltincome ? { betrag: financialData.incomeunterhalttaxable ? formatCurrencyForDisplay(financialData.incomeunterhalttaxable) : '' } : undefined,
          ausland: financialData?.hasforeignincome ? { betrag: financialData.incomeforeign ? formatCurrencyForDisplay(financialData.incomeforeign) : '', jahr: financialData.incomeforeignyear ? String(financialData.incomeforeignyear) : '', turnus: financialData.incomeforeignmonthly ? 'monatlich' : 'jährlich' } : undefined,
          pauschal: financialData?.haspauschalincome ? { betrag: financialData.incomepauschal ? formatCurrencyForDisplay(financialData.incomepauschal) : '', turnus: 'monatlich' } : undefined,
          arbeitslosengeld: financialData?.hasablgincome && (financialData.incomealbgtype === 0 || financialData.incomealbgtype === 1 || financialData.incomealbgtype === 2)
            ? {
                betrag: financialData.incomeablg ? formatCurrencyForDisplay(financialData.incomeablg) : '',
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
            hasEmploymentIncome: financialData.isEarningRegularIncome,
            incomeYear: financialData.prior_year || '',
            incomeYearAmount: financialData.prior_year_earning ? formatCurrencyForDisplay(financialData.prior_year_earning) : '',
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

                  if (monthData) {
                    monthlyIncome[key] = formatCurrencyForDisplay(monthData);
                  }
                }
              }
              return monthlyIncome;
            })(),
            sonderzuwendungenVergangen: {
              weihnachtsgeld: financialData.wheinachtsgeld_last12 ? formatCurrencyForDisplay(financialData.wheinachtsgeld_last12) : '',
              urlaubsgeld: financialData.urlaubsgeld_last12 ? formatCurrencyForDisplay(financialData.urlaubsgeld_last12) : '',
              sonstige: financialData.otherincome_last12 ? formatCurrencyForDisplay(financialData.otherincome_last12) : ''
            },
            sonderzuwendungenKommend: {
              weihnachtsgeld: financialData.wheinachtsgeld_next12 ? formatCurrencyForDisplay(financialData.wheinachtsgeld_next12) : '',
              urlaubsgeld: financialData.urlaubsgeld_next12 ? formatCurrencyForDisplay(financialData.urlaubsgeld_next12) : '',
              sonstige: financialData.otherincome_next12 ? formatCurrencyForDisplay(financialData.otherincome_next12) : ''
            },
            willChangeIncome: financialData?.willchangeincome ?? null,
            incomeChangeDate: financialData?.incomechangedate || '',
            willChangeIncrease: financialData?.willchangeincrease ?? null,
            newIncome: financialData?.newincome ? formatCurrencyForDisplay(financialData.newincome) : '',
            isNewIncomeMonthly: financialData?.isnewincomemonthly ?? null,
            newIncomeReason: financialData?.newincomereason || '',
            startEmployment: financialData?.startemployment || '',
            isContractLimited: financialData?.iscontractlimited ?? null,
            endOfContract: financialData?.endofcontract || '',
            werbungskosten: financialData?.werbungskosten ? formatCurrencyForDisplay(financialData?.werbungskosten) : '',
            kinderbetreuungskosten: financialData?.kinderbetreuungskosten ? formatCurrencyForDisplay(financialData?.kinderbetreuungskosten) : '',
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
              renten: financialData?.haspensionincome ? { betrag: financialData.incomepension ? formatCurrencyForDisplay(financialData.incomepension) : '', turnus: 'monatlich' as const } : undefined,
              vermietung: financialData?.hasrentincome ? { betrag: financialData.incomerent ? formatCurrencyForDisplay(financialData.incomerent) : '', jahr: financialData.incomerentyear ? String(financialData.incomerentyear) : '' } : undefined,
              gewerbe: financialData?.hasbusinessincome ? { betrag: financialData.incomebusiness ? formatCurrencyForDisplay(financialData.incomebusiness) : '', jahr: financialData.incomebusinessyear ? String(financialData.incomebusinessyear) : '' } : undefined,
              landforst: financialData?.hasagricultureincome ? { betrag: financialData.incomeagriculture ? formatCurrencyForDisplay(financialData.incomeagriculture) : '', jahr: financialData.incomeagricultureyear ? String(financialData.incomeagricultureyear) : '' } : undefined,
              sonstige: financialData?.hasothercome ? { betrag: financialData.incomeothers ? formatCurrencyForDisplay(financialData.incomeothers) : '', jahr: financialData.incomeothersyear ? String(financialData.incomeothersyear) : '' } : undefined,
              unterhaltsteuerfrei: financialData?.hastaxfreeunterhaltincome ? { betrag: financialData.incomeunterhalttaxfree ? formatCurrencyForDisplay(financialData.incomeunterhalttaxfree) : '' } : undefined,
              unterhaltsteuerpflichtig: financialData?.hastaxableunterhaltincome ? { betrag: financialData.incomeunterhalttaxable ? formatCurrencyForDisplay(financialData.incomeunterhalttaxable) : '' } : undefined,
              ausland: financialData?.hasforeignincome ? { betrag: financialData.incomeforeign ? formatCurrencyForDisplay(financialData.incomeforeign) : '', jahr: financialData.incomeforeignyear ? String(financialData.incomeforeignyear) : '', turnus: (financialData.incomeforeignmonthly ? 'monatlich' : 'jährlich') as 'monatlich' | 'jährlich' } : undefined,
              pauschal: financialData?.haspauschalincome ? { betrag: financialData.incomepauschal ? formatCurrencyForDisplay(financialData.incomepauschal) : '', turnus: 'monatlich' as const } : undefined,
              arbeitslosengeld: financialData?.hasablgincome && (financialData.incomealbgtype === 0 || financialData.incomealbgtype === 1 || financialData.incomealbgtype === 2)
                ? {
                    betrag: financialData.incomeablg ? formatCurrencyForDisplay(financialData.incomeablg) : '',
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
        `}
        </style>
        <div className="review-header">
        <div className="search-container">
                <button onClick={() => setShowSearchModal(true)} title="Suchen">
                    <span className="material-icons" style={{ color: '#064497' }}>search</span>
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
    </div>
  );
};

export default EinkommenserklaerungReviewContainer; 