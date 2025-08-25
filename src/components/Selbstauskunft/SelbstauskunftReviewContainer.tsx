import React, { useState, useEffect, useRef } from 'react';
import { Container, Modal, Form, Button, Spinner } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, ensureUserFinancialsExists } from '../../lib/supabase';
import { formatCurrencyForDisplay, safeFormatCurrencyForDisplay, isCurrencyEmptyOrZero } from '../../utils/currencyUtils';
import SelbstauskunftForm from './Steps/SelbstauskunftForm';
import '../Einkommenserklaerung/EinkommenserklaerungContainer.css';

interface WeitereEinkuenfte {
  selectedTypes: string[];
}

interface WeitereEinkuenfte2 {
  selectedTypes: string[];
}

interface MainFinancials {
  id: number;
  title: string;
  firstName: string;
  lastName: string;
  // Core employment income fields (matching database structure)
  hasSalaryIncome: boolean | null;
  // All Selbstauskunft fields matching database columns
  wheinachtsgeld_next12_net?: string;
  urlaubsgeld_next12_net?: string;
  incomeagriculture_net?: string;
  incomerent_net?: string;
  hastaxfreeunterhaltincome?: boolean;
  hastaxableunterhaltincome?: boolean;
  incomeunterhalttaxfree?: string;
  incomeunterhalttaxable_net?: string;
  ispayingunterhalt: boolean | null;
  unterhaltszahlungenTotal?: any;
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
  ispayingzwischenkredit: boolean | null;
  zwischenkredit?: any;
  hasotherzahlungsverpflichtung: boolean | null;
  otherzahlungsverpflichtung?: any;
  institutbausparvertraege?: string;
  sparratebausparvertraege?: string;
  institutkapitalrentenversicherung?: string;
  praemiekapitalrentenversicherung?: string;
  expensespayable?: string;
  bankoverdraft?: string;
  debtpayable?: string;
  hasbuergschaft: boolean | null;
  hasBausparvertraege: boolean | null;
  hasRentenversicherung: boolean | null;
  weitereEinkuenfte?: WeitereEinkuenfte;
  weitereEinkuenfte2?: WeitereEinkuenfte2;
}

interface AdditionalApplicantFinancials extends MainFinancials {
  // Same structure as MainFinancials for consistency
}

interface SearchResult {
  section: string;
  matches: string[];
}

// Add search terms for each section (aligned with Selbstauskunft pattern)
const sectionSearchTerms: Record<string, string[]> = {
  '1': [
    "Nettoeinkommen",
    "Einkommen",
    "Arbeit",
    "Gehalt",
    "Selbständig",
    "Geschäft",
    "Gewerbebetrieb",
    "Landwirtschaft",
    "Forstwirtschaft",
    "Kapitalvermögen",
    "Vermietung",
    "Verpachtung",
    "Weihnachtsgeld",
    "Urlaubsgeld",
    "Sonstige"
  ],
  '2': [
    "Bezüge",
    "Weitere Einkünfte",
    "Altersrente",
    "Unfallrente",
    "Lebensversicherung",
    "Renten",
    "Pension",
    "Kindergeld",
    "Pflegegeld",
    "Unterhalt",
    "Unterhaltsleistungen",
    "Steuerfrei",
    "Steuerpflichtig",
    "Elterngeld",
    "Erziehungsgeld",
    "Lastenzuschuss"
  ],
  '3': [
    "Monatliche Belastungen",
    "Ausgaben",
    "Krankenversicherung",
    "Rentenversicherung",
    "Einkommensteuer",
    "Versicherung",
    "Steuer",
    "Darlehen",
    "Kredite",
    "Anschaffungsdarlehen",
    "Kleinkredite",
    "Ratenkäufe",
    "Zwischenkredit",
    "Bauspardarlehen",
    "Unterhaltsleistungen",
    "Unterhaltsverpflichtungen",
    "Zahlungsverpflichtung",
    "Bausparvertrag",
    "Kapitalrentenversicherung",
    "Sparraten",
    "Prämien",
    "Rentenversicherungen",
    "Kapitallebensversicherungen"
  ],
  '4': [
    "Weitere Angaben",
    "Kontoüberziehung",
    "Unbezahlte Rechnungen",
    "Kontoüberziehung",
    "Schulden",
    "Bürgschaft"
  ]
};

const sectionTitles: Record<string, string> = {
  '1': 'Nettoeinkommen',
  '2': 'Bezüge und Weitere Einkünfte',
  '3': 'Monatliche Belastungen',
  '4': 'Weitere Angaben',
};

// Validation interfaces (following Selbstauskunft pattern)
interface SectionErrors {
  '1': string[];
  '2': string[];
  '3': string[];
  '4': string[];
}

interface ApplicantErrors {
  [applicantName: string]: SectionErrors;
}

const sectionTitleMap: Record<string, string> = {
  '1': 'Nettoeinkommen',
  '2': 'Bezüge und Weitere Einkünfte',
  '3': 'Monatliche Belastungen',
  '4': 'Weitere Angaben',
};

interface SelbstauskunftReviewContainerProps {
  residentId: string;
}

const SelbstauskunftReviewContainer: React.FC<SelbstauskunftReviewContainerProps> = ({ residentId }) => {
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

  // Validation state variables (following Selbstauskunft pattern)
  const [validationErrors, setValidationErrors] = useState<ApplicantErrors>({});
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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
    // Early return if no residentId - don't start loading
    if (!residentId) {
      console.log('No residentId, skipping data load');
      return;
    }

    console.log('Starting data load for residentId:', residentId);
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
        return; // This will go to finally block
      }

      console.log('Loaded user data:', userData);
      
      // Set showValidation based on shouldShowErrorSelbst from database
      setShowValidation(true);

      // Load financial data
      const { data: financialData, error: financialError } = await supabase
        .from('user_financials')
        .select('*')
        .eq('user_id', residentId)
        .single();

      if (financialError) {
        console.error('Error loading financial data:', financialError);
        return; // This will go to finally block
      }

      // Set main applicant data (direct mapping like EK)
      setMainFinancials({
        id: 1,
        title: userData?.title || '',
        firstName: userData?.firstname || '',
        lastName: userData?.lastname || '',
        hasSalaryIncome: financialData?.hasSalaryIncome ?? null,
        // Extended fields for Selbstauskunft - salary-related fields only if hasSalaryIncome is true
        wheinachtsgeld_next12_net: financialData?.hasSalaryIncome ? safeFormatCurrencyForDisplay(financialData.wheinachtsgeld_next12_net) : '',
        urlaubsgeld_next12_net: financialData?.hasSalaryIncome ? safeFormatCurrencyForDisplay(financialData.urlaubsgeld_next12_net) : '',
        monthlynetsalary: financialData?.hasSalaryIncome ? safeFormatCurrencyForDisplay(financialData.monthlynetsalary) : '',
        otheremploymentmonthlynetincome: financialData?.hasSalaryIncome ? (financialData?.otheremploymentmonthlynetincome || []) : [],
        hastaxfreeunterhaltincome: !!financialData?.hastaxfreeunterhaltincome,
        hastaxableunterhaltincome: !!financialData?.hastaxableunterhaltincome,
        ispayingunterhalt: financialData?.ispayingunterhalt === null ? null : !!financialData?.ispayingunterhalt,
        unterhaltszahlungenTotal: financialData?.ispayingunterhalt ? (financialData?.unterhaltszahlungenTotal || []) : null,
        hasbusinessincome: !!financialData?.hasbusinessincome,
        hasagricultureincome: !!financialData?.hasagricultureincome,
        hasrentincome: !!financialData?.hasrentincome,
        haspensionincome: !!financialData?.haspensionincome,
        hascapitalincome: !!financialData?.hascapitalincome,
        yearlyselfemployednetincome: financialData?.hasbusinessincome ? safeFormatCurrencyForDisplay(financialData.yearlyselfemployednetincome) : '',
        yearlybusinessnetincome: financialData?.hasbusinessincome ? safeFormatCurrencyForDisplay(financialData.yearlybusinessnetincome) : '',
        yearlycapitalnetincome: financialData?.hascapitalincome ? safeFormatCurrencyForDisplay(financialData.yearlycapitalnetincome) : '',
        incomeagriculture_net: financialData?.hasagricultureincome ? safeFormatCurrencyForDisplay(financialData.incomeagriculture_net) : '',
        incomerent_net: financialData?.hasrentincome ? safeFormatCurrencyForDisplay(financialData.incomerent_net) : '',
        pensionmonthlynetincome: financialData?.haspensionincome ? (financialData?.pensionmonthlynetincome || []) : [],
        haskindergeldincome: !!financialData?.haskindergeldincome,
        monthlykindergeldnetincome: safeFormatCurrencyForDisplay(financialData?.monthlykindergeldnetincome),
        haspflegegeldincome: !!financialData?.haspflegegeldincome,
        monthlypflegegeldnetincome: safeFormatCurrencyForDisplay(financialData?.monthlypflegegeldnetincome),
        haselterngeldincome: !!financialData?.haselterngeldincome,
        monthlyelterngeldnetincome: safeFormatCurrencyForDisplay(financialData?.monthlyelterngeldnetincome),
        hasothernetincome: !!financialData?.hasothernetincome,
        othermonthlynetincome: financialData?.othermonthlynetincome || [],
        betragotherinsurancetaxexpenses: financialData?.betragotherinsurancetaxexpenses || [],
        ispayingloans: financialData?.ispayingloans === null ? null : !!financialData?.ispayingloans,
        loans: financialData?.loans || [],
        ispayingzwischenkredit: financialData?.ispayingzwischenkredit === null ? null : !!financialData?.ispayingzwischenkredit,
        zwischenkredit: financialData?.zwischenkredit || [],
        hasotherzahlungsverpflichtung: financialData?.hasotherzahlungsverpflichtung === null ? null : !!financialData?.hasotherzahlungsverpflichtung,
        hasBausparvertraege: financialData?.hasBausparvertraege === null ? null : !!financialData?.hasBausparvertraege,
        hasRentenversicherung: financialData?.hasRentenversicherung === null ? null : !!financialData?.hasRentenversicherung,
        otherzahlungsverpflichtung: financialData?.hasotherzahlungsverpflichtung ? (financialData?.otherzahlungsverpflichtung || []) : null,
        institutbausparvertraege: financialData?.hasBausparvertraege ? financialData?.institutbausparvertraege || '' : '',
        sparratebausparvertraege: financialData?.hasBausparvertraege ? safeFormatCurrencyForDisplay(financialData.sparratebausparvertraege) : '',
        institutkapitalrentenversicherung: financialData?.hasRentenversicherung ? financialData?.institutkapitalrentenversicherung || '' : '',
        praemiekapitalrentenversicherung: financialData?.hasRentenversicherung ? safeFormatCurrencyForDisplay(financialData.praemiekapitalrentenversicherung) : '',
        expensespayable: safeFormatCurrencyForDisplay(financialData?.expensespayable),
        bankoverdraft: safeFormatCurrencyForDisplay(financialData?.bankoverdraft),
        debtpayable: safeFormatCurrencyForDisplay(financialData?.debtpayable),
        hasbuergschaft: financialData?.hasbuergschaft ?? null,
        weitereEinkuenfte: {
          selectedTypes: ([
            financialData?.hasbusinessincome ? 'gewerbe' : null,
            financialData?.hasagricultureincome ? 'landforst' : null,
            financialData?.hascapitalincome ? 'kapital' : null,
            financialData?.hasrentincome ? 'vermietung' : null
          ].filter(Boolean)) as string[]
        },
        weitereEinkuenfte2: {
          selectedTypes: ([
            financialData?.hastaxfreeunterhaltincome ? 'unterhaltsteuerfrei' : null,
            financialData?.hastaxableunterhaltincome ? 'unterhaltsteuerpflichtig' : null,
            financialData?.haskindergeldincome ? 'kindergeld' : null,
            financialData?.haspflegegeldincome ? 'pflegegeld' : null,
            financialData?.haselterngeldincome ? 'elterngeld' : null,
            financialData?.hasothernetincome ? 'sonstiges' : null
          ].filter(Boolean)) as string[]
        },
        incomeunterhalttaxfree: safeFormatCurrencyForDisplay(financialData?.incomeunterhalttaxfree),
        incomeunterhalttaxable_net: safeFormatCurrencyForDisplay(financialData?.incomeunterhalttaxable_net)
      });

      // Load additional applicants data (UUID-based structure)
      if (userData?.weitere_antragstellende_personen) {
       {/* const weitere = userData.weitere_antragstellende_personen || [];
        const additionalFinancials = financialData.additional_applicants_financials || [];
        
        const mergedApplicants = weitere.map((person: any, index: number) => {
          const fin = additionalFinancials?.[index] || {};
          */}

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
          const additionalFinancialsData = financialData.additional_applicants_financials || {};
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
          
          const mergedApplicants = applicantEntries.map(([uuid, person]: [string, any], index: number) => {
              const fin = additionalFinancialsObj[uuid] || {};
              console.log(`Creating merged applicant for ${uuid}:`, { person, fin });
          
          return {
            id: index + 2,
            title: person.title || '',
            firstName: person.firstName || '',
            lastName: person.lastName || '',
            hasSalaryIncome: fin.hasSalaryIncome ?? null,
            // Extended fields for Selbstauskunft - salary-related fields only if hasSalaryIncome is true
            wheinachtsgeld_next12_net: fin.hasSalaryIncome ? safeFormatCurrencyForDisplay(fin.wheinachtsgeld_next12_net) : '',
            urlaubsgeld_next12_net: fin.hasSalaryIncome ? safeFormatCurrencyForDisplay(fin.urlaubsgeld_next12_net) : '',
            monthlynetsalary: fin.hasSalaryIncome ? safeFormatCurrencyForDisplay(fin.monthlynetsalary) : '',
            otheremploymentmonthlynetincome: fin.hasSalaryIncome ? (fin.otheremploymentmonthlynetincome || []) : [],  
            hastaxfreeunterhaltincome: !!fin.hastaxfreeunterhaltincome,
            hastaxableunterhaltincome: !!fin.hastaxableunterhaltincome,
            incomeunterhalttaxfree: fin.hastaxfreeunterhaltincome ? safeFormatCurrencyForDisplay(fin.incomeunterhalttaxfree) : '',
            incomeunterhalttaxable_net: fin.hastaxableunterhaltincome ? safeFormatCurrencyForDisplay(fin.incomeunterhalttaxable_net) : '',
            ispayingunterhalt: fin.ispayingunterhalt === null ? null : !!fin.ispayingunterhalt,
            unterhaltszahlungenTotal: fin.ispayingunterhalt ? (fin.unterhaltszahlungenTotal || []) : null,
            hasbusinessincome: !!fin.hasbusinessincome,
            hasagricultureincome: !!fin.hasagricultureincome,
            hasrentincome: !!fin.hasrentincome,
            haspensionincome: !!fin.haspensionincome,
            hascapitalincome: !!fin.hascapitalincome,
            yearlyselfemployednetincome: fin.hasbusinessincome ? safeFormatCurrencyForDisplay(fin.yearlyselfemployednetincome) : '',
            yearlybusinessnetincome: fin.hasbusinessincome ? safeFormatCurrencyForDisplay(fin.yearlybusinessnetincome) : '',
            yearlycapitalnetincome: fin.hascapitalincome ? safeFormatCurrencyForDisplay(fin.yearlycapitalnetincome) : '',
            incomeagriculture_net: fin.hasagricultureincome ? safeFormatCurrencyForDisplay(fin.incomeagriculture_net) : '',
            incomerent_net: fin.hasrentincome ? safeFormatCurrencyForDisplay(fin.incomerent_net) : '',
            pensionmonthlynetincome: fin.haspensionincome ? (fin.pensionmonthlynetincome || []) : [],
            haskindergeldincome: !!fin.haskindergeldincome,
            monthlykindergeldnetincome: safeFormatCurrencyForDisplay(fin.monthlykindergeldnetincome),
            haspflegegeldincome: !!fin.haspflegegeldincome,
            monthlypflegegeldnetincome: safeFormatCurrencyForDisplay(fin.monthlypflegegeldnetincome),
            haselterngeldincome: !!fin.haselterngeldincome,
            monthlyelterngeldnetincome: safeFormatCurrencyForDisplay(fin.monthlyelterngeldnetincome),
            hasothernetincome: !!fin.hasothernetincome,
            othermonthlynetincome: fin.othermonthlynetincome || [],
            betragotherinsurancetaxexpenses: fin.betragotherinsurancetaxexpenses || [],
            ispayingloans: fin.ispayingloans === null ? null : !!fin.ispayingloans,
            loans: fin.loans || [],
            ispayingzwischenkredit: fin.ispayingzwischenkredit === null ? null : !!fin.ispayingzwischenkredit,
            zwischenkredit: fin.zwischenkredit || [],
            hasotherzahlungsverpflichtung: fin.hasotherzahlungsverpflichtung === null ? null : !!fin.hasotherzahlungsverpflichtung,
            otherzahlungsverpflichtung: fin.hasotherzahlungsverpflichtung ? (fin.otherzahlungsverpflichtung || []) : null,
            hasBausparvertraege: fin.hasBausparvertraege === null ? null : !!fin.hasBausparvertraege,
            hasRentenversicherung: fin.hasRentenversicherung === null ? null : !!fin.hasRentenversicherung,
            institutbausparvertraege: fin.hasBausparvertraege ? (fin.institutbausparvertraege || '') : '',
            sparratebausparvertraege: fin.hasBausparvertraege ? safeFormatCurrencyForDisplay(fin.sparratebausparvertraege) : '',
            institutkapitalrentenversicherung: fin.hasRentenversicherung ? (fin.institutkapitalrentenversicherung || '') : '',
            praemiekapitalrentenversicherung: fin.hasRentenversicherung ? safeFormatCurrencyForDisplay(fin.praemiekapitalrentenversicherung) : '',
            expensespayable: safeFormatCurrencyForDisplay(fin.expensespayable),
            bankoverdraft: safeFormatCurrencyForDisplay(fin.bankoverdraft),
            debtpayable: safeFormatCurrencyForDisplay(fin.debtpayable),
            hasbuergschaft: fin.hasbuergschaft ?? null,
            weitereEinkuenfte: {
              selectedTypes: ([
                fin.hasbusinessincome ? 'gewerbe' : null,
                fin.hasagricultureincome ? 'landforst' : null,
                fin.hascapitalincome ? 'kapital' : null,
                fin.hasrentincome ? 'vermietung' : null
              ].filter(Boolean)) as string[]
            },
            weitereEinkuenfte2: {
              selectedTypes: ([
                fin.hastaxfreeunterhaltincome ? 'unterhaltsteuerfrei' : null,
                fin.hastaxableunterhaltincome ? 'unterhaltsteuerpflichtig' : null,
                fin.haskindergeldincome ? 'kindergeld' : null,
                fin.haspflegegeldincome ? 'pflegegeld' : null,
                fin.haselterngeldincome ? 'elterngeld' : null,
                fin.hasothernetincome ? 'sonstiges' : null
              ].filter(Boolean)) as string[]
            }
          };
        });
        
        setAdditionalApplicants(mergedApplicants);
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    } finally {
      // Always reset loading state
      setIsLoading(false);
      console.log('Loading state reset');
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

  // Validation helper functions
  const isDateInFuture = (dateString: string): boolean => {
    if (!dateString) return true; // Empty dates are handled by required validation
    const inputDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
    return inputDate > today;
  };

  // Validation function
  const validateForm = () => {
    const errors: ApplicantErrors = {};

    // --- Main Applicant ---
    if (mainFinancials) {
      const mainSectionErrors: SectionErrors = {
        '1': [], '2': [], '3': [], '4': []
      };

      // Section 1: Nettoeinkommen
      if (mainFinancials.hasSalaryIncome === null) {
        mainSectionErrors['1'].push('Es wurde nicht angegeben, ob der Antragsteller Einkünfte aus nichtselbstständiger Arbeit erzielt');
      }
      if (mainFinancials.hasSalaryIncome === true) {
        if (!mainFinancials.monthlynetsalary) {
          mainSectionErrors['1'].push('Lohn/Gehalt: Monatliches Nettoeinkommen fehlt');
        }
        if (!mainFinancials.wheinachtsgeld_next12_net) {
          mainSectionErrors['1'].push('Weihnachtsgeld: Jahresbetrag fehlt');
        }
        if (!mainFinancials.urlaubsgeld_next12_net) {
          mainSectionErrors['1'].push('Urlaubsgeld: Jahresbetrag fehlt');
        }
        // Validate sonstige beträge
        if (mainFinancials.otheremploymentmonthlynetincome && Array.isArray(mainFinancials.otheremploymentmonthlynetincome)) {
          mainFinancials.otheremploymentmonthlynetincome.forEach((item: any, idx: number) => {
            if (!item.type) {
              mainSectionErrors['1'].push(`Sonstige Beträge ${idx + 1}: Art des Betrags fehlt`);
            }
            if (isCurrencyEmptyOrZero(item.amount)) {
              mainSectionErrors['1'].push(`Sonstige Beträge ${idx + 1}: Jahresbetrag fehlt oder ist 0`);
            }
          });
        }
      }

      // Validate weitere Einkünfte (Section 1.2)
      if (mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('gewerbe') && isCurrencyEmptyOrZero(mainFinancials.yearlybusinessnetincome) && isCurrencyEmptyOrZero(mainFinancials.yearlyselfemployednetincome)) {
        mainSectionErrors['1'].push('Summe aus Gewerbebetrieb/selbstständiger Arbeit muss größer als 0 sein');
      }
      if (mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('landforst') && isCurrencyEmptyOrZero(mainFinancials.incomeagriculture_net)) {
        mainSectionErrors['1'].push('Land- und Forstwirtschaft: Jahresbetrag fehlt oder ist 0');
      }
      if (mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('kapital') && isCurrencyEmptyOrZero(mainFinancials.yearlycapitalnetincome)) {
        mainSectionErrors['1'].push('Kapitalvermögen: Jahresbetrag fehlt oder ist 0');
      }
      if (mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('vermietung') && isCurrencyEmptyOrZero(mainFinancials.incomerent_net)) {
        mainSectionErrors['1'].push('Vermietung und Verpachtung: Jahresbetrag fehlt oder ist 0');
      }

      // Section 2: Bezüge und Weitere Einkünfte
      if (mainFinancials.haspensionincome === null) {
        mainSectionErrors['2'].push('Es wurde nicht angegeben, ob der Antragsteller Rentenbezüge/Versorgungsbezüge bezieht');
      }
      if (mainFinancials.haspensionincome === true) {
        const pensionRows = (mainFinancials.pensionmonthlynetincome && mainFinancials.pensionmonthlynetincome.length > 0)
          ? mainFinancials.pensionmonthlynetincome
          : [{ type: '', amount: '' }];
        const pensionErrors = pensionRows.map((item: any, idx: number) => {
          const rowErrors: string[] = [];
          if (!item.type) {
            rowErrors.push(`Rentenart ${idx + 1}: Rentenart fehlt`);
          }
          if (isCurrencyEmptyOrZero(item.amount)) {
            rowErrors.push(`Rentenart ${idx + 1}: Monatliches Nettoeinkommen fehlt oder ist 0`);
          }
          return rowErrors;
        }).flat();
        mainSectionErrors['2'].push(...pensionErrors);
      }

      // Validate weitere Einkünfte 2 (Section 2.2)
      if (mainFinancials.weitereEinkuenfte2?.selectedTypes?.includes('kindergeld') && isCurrencyEmptyOrZero(mainFinancials.monthlykindergeldnetincome)) {
        mainSectionErrors['2'].push('Kindergeld: Monatliches Nettoeinkommen fehlt oder ist 0');
      }
      if (mainFinancials.weitereEinkuenfte2?.selectedTypes?.includes('pflegegeld') && isCurrencyEmptyOrZero(mainFinancials.monthlypflegegeldnetincome)) {
        mainSectionErrors['2'].push('Pflegegeld: Monatliches Nettoeinkommen fehlt oder ist 0');
      }
      if (mainFinancials.weitereEinkuenfte2?.selectedTypes?.includes('unterhaltsteuerfrei') && isCurrencyEmptyOrZero(mainFinancials.incomeunterhalttaxfree)) {
        mainSectionErrors['2'].push('Unterhaltsleistungen steuerfrei: Monatliches Nettoeinkommen fehlt oder ist 0');
      }
      if (mainFinancials.weitereEinkuenfte2?.selectedTypes?.includes('unterhaltsteuerpflichtig') && isCurrencyEmptyOrZero(mainFinancials.incomeunterhalttaxable_net)) {
        mainSectionErrors['2'].push('Unterhaltsleistungen steuerpflichtig: Monatliches Nettoeinkommen fehlt oder ist 0');
      }
      if (mainFinancials.weitereEinkuenfte2?.selectedTypes?.includes('elterngeld') && isCurrencyEmptyOrZero(mainFinancials.monthlyelterngeldnetincome)) {
        mainSectionErrors['2'].push('Elterngeld/Erziehungsgeld: Monatliches Nettoeinkommen fehlt oder ist 0');
      }
      if (mainFinancials.weitereEinkuenfte2?.selectedTypes?.includes('sonstiges')) {
        const otherIncome = mainFinancials.othermonthlynetincome || [];
        const itemsToValidate = otherIncome.length > 0 ? otherIncome : [{ type: '', amount: '' }];
        const sonstigeErrors = itemsToValidate.map((item: any, idx: number) => {
          const rowErrors: string[] = [];
          if (!item.type) {
            rowErrors.push(`Sonstiges Einkommen ${idx + 1}: Art des Einkommens fehlt`);
          }
          if (isCurrencyEmptyOrZero(item.amount)) {
            rowErrors.push(`Sonstiges Einkommen ${idx + 1}: Monatliches Nettoeinkommen fehlt oder ist 0`);
          }
          return rowErrors;
        }).flat();
        mainSectionErrors['2'].push(...sonstigeErrors);
      }

      // Section 3: Monatliche Belastungen
      // Validate taxes and contributions
      if (mainFinancials.betragotherinsurancetaxexpenses && Array.isArray(mainFinancials.betragotherinsurancetaxexpenses)) {
        const taxErrors = mainFinancials.betragotherinsurancetaxexpenses.map((item: any, idx: number) => {
          const rowErrors: string[] = [];
          if (!item.type) {
            rowErrors.push(`Steuer/Beitrag ${idx + 1}: Art der Steuer bzw. Beitrag fehlt`);
          }
          if (isCurrencyEmptyOrZero(item.amount)) {
            rowErrors.push(`Steuer/Beitrag ${idx + 1}: Monatlicher Betrag fehlt oder ist 0`);
          }
          return rowErrors;
        }).flat();
        mainSectionErrors['3'].push(...taxErrors);
      }

      // Validate loans
      if (mainFinancials.ispayingloans === null) {
        mainSectionErrors['3'].push('Es wurde nicht angegeben, ob der Antragsteller laufende Kredite hat');
      }
      if (mainFinancials.ispayingloans === true) {
        const loanRows = (mainFinancials.loans && mainFinancials.loans.length > 0)
          ? mainFinancials.loans
          : [{ description: '', duration: '', amount: '' }];
        const loanErrors = loanRows.map((item: any, idx: number) => {
          const rowErrors: string[] = [];
          if (!item.description) {
            rowErrors.push(`Kredit ${idx + 1}: Kredit Beschreibung fehlt`);
          }
          if (!item.duration) {
            rowErrors.push(`Kredit ${idx + 1}: Laufzeit bis fehlt`);
          } else if (!isDateInFuture(item.duration)) {
            rowErrors.push(`Kredit ${idx + 1}: Laufzeit bis muss in der Zukunft liegen`);
          }
          if (isCurrencyEmptyOrZero(item.amount)) {
            rowErrors.push(`Kredit ${idx + 1}: Monatlicher Betrag fehlt oder ist 0`);
          }
          return rowErrors;
        }).flat();
        mainSectionErrors['3'].push(...loanErrors);
      }

      // Validate zwischenkredit
      if (mainFinancials.ispayingzwischenkredit === null) {
        mainSectionErrors['3'].push('Es wurde nicht angegeben, ob der Antragsteller einen laufenden Zwischenkredit für Bauspardarlehen hat');
      }
      if (mainFinancials.ispayingzwischenkredit === true) {
        const zwischenRows = (mainFinancials.zwischenkredit && mainFinancials.zwischenkredit.length > 0)
          ? mainFinancials.zwischenkredit
          : [{ duration: '', amount: '' }];
        const zwischenErrors = zwischenRows.map((item: any, idx: number) => {
          const rowErrors: string[] = [];
          if (!item.duration) {
            rowErrors.push(`Zwischenkredit: Laufzeit bis fehlt`);
          } else if (!isDateInFuture(item.duration)) {
            rowErrors.push(`Zwischenkredit: Laufzeit bis muss in der Zukunft liegen`);
          }
          if (isCurrencyEmptyOrZero(item.amount)) {
            rowErrors.push(`Zwischenkredit: Monatlicher Betrag fehlt oder ist 0`);
          }
          return rowErrors;
        }).flat();
        mainSectionErrors['3'].push(...zwischenErrors);
      }

      // Validate unterhalt
      if (mainFinancials.ispayingunterhalt === null) {
        mainSectionErrors['3'].push('Es wurde nicht angegeben, ob der Antragsteller Unterhalt zahlt');
      }
      if (mainFinancials.ispayingunterhalt === true && mainFinancials.unterhaltszahlungenTotal) {
        const unterhaltErrors = mainFinancials.unterhaltszahlungenTotal.map((item: any, idx: number) => {
          const rowErrors: string[] = [];
          if (!item.duration) {
            rowErrors.push(`Unterhalt: Laufzeit bis fehlt`);
          } else if (!isDateInFuture(item.duration)) {
            rowErrors.push(`Unterhalt: Laufzeit bis muss in der Zukunft liegen`);
          }
          if (isCurrencyEmptyOrZero(item.amountTotal)) {
            rowErrors.push(`Unterhalt: Monatlicher Betrag fehlt oder ist 0`);
          }
          return rowErrors;
        }).flat();
        mainSectionErrors['3'].push(...unterhaltErrors);
      }

      // Validate other payment obligations
      if (mainFinancials.hasotherzahlungsverpflichtung === null) {
        mainSectionErrors['3'].push('Es wurde nicht angegeben, ob der Antragsteller sonstige Zahlungsverpflichtungen hat');
      }
      if (mainFinancials.hasotherzahlungsverpflichtung === true && mainFinancials.otherzahlungsverpflichtung) {
        const otherErrors = mainFinancials.otherzahlungsverpflichtung.map((item: any, idx: number) => {
          const rowErrors: string[] = [];
          if (!item.type) {
            rowErrors.push(`Zahlungsverpflichtung ${idx + 1}: Art der Zahlungsverpflichtung fehlt`);
          }
          if (!item.duration) {
            rowErrors.push(`Zahlungsverpflichtung ${idx + 1}: Laufzeit bis fehlt`);
          } else if (!isDateInFuture(item.duration)) {
            rowErrors.push(`Zahlungsverpflichtung ${idx + 1}: Laufzeit bis muss in der Zukunft liegen`);
          }
          if (isCurrencyEmptyOrZero(item.amount)) {
            rowErrors.push(`Zahlungsverpflichtung ${idx + 1}: Monatlicher Betrag fehlt oder ist 0`);
          }
          return rowErrors;
        }).flat();
        mainSectionErrors['3'].push(...otherErrors);
      }

      // Validate Bausparverträge
      if (mainFinancials.hasBausparvertraege === null) {
        mainSectionErrors['3'].push('Es wurde nicht angegeben, ob der Antragsteller monatlich Sparraten für Bausparverträge zahlt');
      }
      if (mainFinancials.hasBausparvertraege === true) {
        if (!mainFinancials.institutbausparvertraege) {
          mainSectionErrors['3'].push('Bausparverträge: Institut fehlt');
        }
        if (isCurrencyEmptyOrZero(mainFinancials.sparratebausparvertraege)) {
          mainSectionErrors['3'].push('Bausparverträge: Monatlicher Betrag fehlt oder ist 0');
        }
      }

      // Validate Rentenversicherung
      if (mainFinancials.hasRentenversicherung === null) {
        mainSectionErrors['3'].push('Es wurde nicht angegeben, ob der Antragsteller monatlich Prämien für Kapitallebens- und Rentenversicherungen zahlt');
      }
      if (mainFinancials.hasRentenversicherung === true) {
        if (!mainFinancials.institutkapitalrentenversicherung) {
          mainSectionErrors['3'].push('Rentenversicherung: Institut fehlt');
        }
        if (isCurrencyEmptyOrZero(mainFinancials.praemiekapitalrentenversicherung)) {
          mainSectionErrors['3'].push('Rentenversicherung: Monatlicher Betrag fehlt oder ist 0');
        }
      }

      errors[getApplicantDisplayName(mainFinancials, 0)] = mainSectionErrors;
    }

    // --- Additional Applicants ---
    additionalApplicants.forEach((applicant, index) => {
      const applicantSectionErrors: SectionErrors = {
        '1': [], '2': [], '3': [], '4': []
      };

      // Section 1: Nettoeinkommen
      if (applicant.hasSalaryIncome === null) {
        applicantSectionErrors['1'].push('Es wurde nicht angegeben, ob der Antragsteller Einkünfte aus nichtselbstständiger Arbeit erzielt');
      }
      if (applicant.hasSalaryIncome === true) {
        if (!applicant.monthlynetsalary) {
          applicantSectionErrors['1'].push('Lohn/Gehalt: Monatliches Nettoeinkommen fehlt');
        }
        if (!applicant.wheinachtsgeld_next12_net) {
          applicantSectionErrors['1'].push('Weihnachtsgeld: Jahresbetrag fehlt');
        }
        if (!applicant.urlaubsgeld_next12_net) {
          applicantSectionErrors['1'].push('Urlaubsgeld: Jahresbetrag fehlt');
        }
        // Validate sonstige beträge
        if (applicant.otheremploymentmonthlynetincome && Array.isArray(applicant.otheremploymentmonthlynetincome)) {
          applicant.otheremploymentmonthlynetincome.forEach((item: any, idx: number) => {
            if (!item.type) {
              applicantSectionErrors['1'].push(`Sonstige Beträge ${idx + 1}: Art des Betrags fehlt`);
            }
            if (isCurrencyEmptyOrZero(item.amount)) {
              applicantSectionErrors['1'].push(`Sonstige Beträge ${idx + 1}: Jahresbetrag fehlt oder ist 0`);
            }
          });
        }
      }

      // Validate weitere Einkünfte (Section 1.2)
      if (applicant.weitereEinkuenfte?.selectedTypes?.includes('gewerbe') && isCurrencyEmptyOrZero(applicant.yearlybusinessnetincome) && isCurrencyEmptyOrZero(applicant.yearlyselfemployednetincome)) {
        applicantSectionErrors['1'].push('Summe aus Gewerbebetrieb/selbstständiger Arbeit muss größer als 0 sein');
      }
      if (applicant.weitereEinkuenfte?.selectedTypes?.includes('landforst') && isCurrencyEmptyOrZero(applicant.incomeagriculture_net)) {
        applicantSectionErrors['1'].push('Land- und Forstwirtschaft: Jahresbetrag fehlt oder ist 0');
      }
      if (applicant.weitereEinkuenfte?.selectedTypes?.includes('kapital') && isCurrencyEmptyOrZero(applicant.yearlycapitalnetincome)) {
        applicantSectionErrors['1'].push('Kapitalvermögen: Jahresbetrag fehlt oder ist 0');
      }
      if (applicant.weitereEinkuenfte?.selectedTypes?.includes('vermietung') && isCurrencyEmptyOrZero(applicant.incomerent_net)) {
        applicantSectionErrors['1'].push('Vermietung und Verpachtung: Jahresbetrag fehlt oder ist 0');
      }

      // Section 2: Bezüge und Weitere Einkünfte
      if (applicant.haspensionincome === null) {
        applicantSectionErrors['2'].push('Es wurde nicht angegeben, ob der Antragsteller Rentenbezüge/Versorgungsbezüge bezieht');
      }
      if (applicant.haspensionincome === true) {
        const pensionRows = (applicant.pensionmonthlynetincome && applicant.pensionmonthlynetincome.length > 0)
          ? applicant.pensionmonthlynetincome
          : [{ type: '', amount: '' }];
        const pensionErrors = pensionRows.map((item: any, idx: number) => {
          const rowErrors: string[] = [];
          if (!item.type) {
            rowErrors.push(`Rentenart ${idx + 1}: Rentenart fehlt`);
          }
          if (isCurrencyEmptyOrZero(item.amount)) {
            rowErrors.push(`Rentenart ${idx + 1}: Monatliches Nettoeinkommen fehlt oder ist 0`);
          }
          return rowErrors;
        }).flat();
        applicantSectionErrors['2'].push(...pensionErrors);
      }

      // Validate weitere Einkünfte 2 (Section 2.2)
      if (applicant.weitereEinkuenfte2?.selectedTypes?.includes('kindergeld') && isCurrencyEmptyOrZero(applicant.monthlykindergeldnetincome)) {
        applicantSectionErrors['2'].push('Kindergeld: Monatliches Nettoeinkommen fehlt oder ist 0');
      }
      if (applicant.weitereEinkuenfte2?.selectedTypes?.includes('pflegegeld') && isCurrencyEmptyOrZero(applicant.monthlypflegegeldnetincome)) {
        applicantSectionErrors['2'].push('Pflegegeld: Monatliches Nettoeinkommen fehlt oder ist 0');
      }
      if (applicant.weitereEinkuenfte2?.selectedTypes?.includes('unterhaltsteuerfrei') && isCurrencyEmptyOrZero(applicant.incomeunterhalttaxfree)) {
        applicantSectionErrors['2'].push('Unterhaltsleistungen steuerfrei: Monatliches Nettoeinkommen fehlt oder ist 0');
      }
      if (applicant.weitereEinkuenfte2?.selectedTypes?.includes('unterhaltsteuerpflichtig') && isCurrencyEmptyOrZero(applicant.incomeunterhalttaxable_net)) {
        applicantSectionErrors['2'].push('Unterhaltsleistungen steuerpflichtig: Monatliches Nettoeinkommen fehlt oder ist 0');
      }
      if (applicant.weitereEinkuenfte2?.selectedTypes?.includes('elterngeld') && isCurrencyEmptyOrZero(applicant.monthlyelterngeldnetincome)) {
        applicantSectionErrors['2'].push('Elterngeld/Erziehungsgeld: Monatliches Nettoeinkommen fehlt oder ist 0');
      }
      if (applicant.weitereEinkuenfte2?.selectedTypes?.includes('sonstiges')) {
        const otherIncome = applicant.othermonthlynetincome || [];
        const itemsToValidate = otherIncome.length > 0 ? otherIncome : [{ type: '', amount: '' }];
        const sonstigeErrors = itemsToValidate.map((item: any, idx: number) => {
          const rowErrors: string[] = [];
          if (!item.type) {
            rowErrors.push(`Sonstiges Einkommen ${idx + 1}: Art des Einkommens fehlt`);
          }
          if (isCurrencyEmptyOrZero(item.amount)) {
            rowErrors.push(`Sonstiges Einkommen ${idx + 1}: Monatliches Nettoeinkommen fehlt oder ist 0`);
          }
          return rowErrors;
        }).flat();
        applicantSectionErrors['2'].push(...sonstigeErrors);
      }

      // Section 3: Monatliche Belastungen
      // Validate taxes and contributions
      if (applicant.betragotherinsurancetaxexpenses && Array.isArray(applicant.betragotherinsurancetaxexpenses)) {
        const taxErrors = applicant.betragotherinsurancetaxexpenses.map((item: any, idx: number) => {
          const rowErrors: string[] = [];
          if (!item.type) {
            rowErrors.push(`Steuer/Beitrag ${idx + 1}: Art der Steuer bzw. Beitrag fehlt`);
          }
          if (isCurrencyEmptyOrZero(item.amount)) {
            rowErrors.push(`Steuer/Beitrag ${idx + 1}: Monatlicher Betrag fehlt oder ist 0`);
          }
          return rowErrors;
        }).flat();
        applicantSectionErrors['3'].push(...taxErrors);
      }

      // Validate loans
      if (applicant.ispayingloans === null) {
        applicantSectionErrors['3'].push('Es wurde nicht angegeben, ob der Antragsteller laufende Kredite hat');
      }
      if (applicant.ispayingloans === true) {
        const loanRows = (applicant.loans && applicant.loans.length > 0)
          ? applicant.loans
          : [{ description: '', duration: '', amount: '' }];
        const loanErrors = loanRows.map((item: any, idx: number) => {
          const rowErrors: string[] = [];
          if (!item.description) {
            rowErrors.push(`Kredit ${idx + 1}: Kredit Beschreibung fehlt`);
          }
          if (!item.duration) {
            rowErrors.push(`Kredit ${idx + 1}: Laufzeit bis fehlt`);
          } else if (!isDateInFuture(item.duration)) {
            rowErrors.push(`Kredit ${idx + 1}: Laufzeit bis muss in der Zukunft liegen`);
          }
          if (isCurrencyEmptyOrZero(item.amount)) {
            rowErrors.push(`Kredit ${idx + 1}: Monatlicher Betrag fehlt oder ist 0`);
          }
          return rowErrors;
        }).flat();
        applicantSectionErrors['3'].push(...loanErrors);
      }

      // Validate zwischenkredit
      if (applicant.ispayingzwischenkredit === null) {
        applicantSectionErrors['3'].push('Es wurde nicht angegeben, ob der Antragsteller einen laufenden Zwischenkredit für Bauspardarlehen hat');
      }
      if (applicant.ispayingzwischenkredit === true) {
        const zwischenRows = (applicant.zwischenkredit && applicant.zwischenkredit.length > 0)
          ? applicant.zwischenkredit
          : [{ duration: '', amount: '' }];
        const zwischenErrors = zwischenRows.map((item: any, idx: number) => {
          const rowErrors: string[] = [];
          if (!item.duration) {
            rowErrors.push(`Zwischenkredit: Laufzeit bis fehlt`);
          } else if (!isDateInFuture(item.duration)) {
            rowErrors.push(`Zwischenkredit: Laufzeit bis muss in der Zukunft liegen`);
          }
          if (isCurrencyEmptyOrZero(item.amount)) {
            rowErrors.push(`Zwischenkredit: Monatlicher Betrag fehlt oder ist 0`);
          }
          return rowErrors;
        }).flat();
        applicantSectionErrors['3'].push(...zwischenErrors);
      }

      // Validate unterhalt
      if (applicant.ispayingunterhalt === null) {
        applicantSectionErrors['3'].push('Es wurde nicht angegeben, ob der Antragsteller Unterhalt zahlt');
      }
      if (applicant.ispayingunterhalt === true && applicant.unterhaltszahlungenTotal) {
        const unterhaltErrors = applicant.unterhaltszahlungenTotal.map((item: any, idx: number) => {
          const rowErrors: string[] = [];
          if (!item.duration) {
            rowErrors.push(`Unterhalt: Laufzeit bis fehlt`);
          } else if (!isDateInFuture(item.duration)) {
            rowErrors.push(`Unterhalt: Laufzeit bis muss in der Zukunft liegen`);
          }
          if (isCurrencyEmptyOrZero(item.amountTotal)) {
            rowErrors.push(`Unterhalt: Monatlicher Betrag fehlt oder ist 0`);
          }
          return rowErrors;
        }).flat();
        applicantSectionErrors['3'].push(...unterhaltErrors);
      }

      // Validate other payment obligations
      if (applicant.hasotherzahlungsverpflichtung === null) {
        applicantSectionErrors['3'].push('Es wurde nicht angegeben, ob der Antragsteller sonstige Zahlungsverpflichtungen hat');
      }
      if (applicant.hasotherzahlungsverpflichtung === true && applicant.otherzahlungsverpflichtung) {
        const otherErrors = applicant.otherzahlungsverpflichtung.map((item: any, idx: number) => {
          const rowErrors: string[] = [];
          if (!item.type) {
            rowErrors.push(`Zahlungsverpflichtung ${idx + 1}: Art der Zahlungsverpflichtung fehlt`);
          }
          if (!item.duration) {
            rowErrors.push(`Zahlungsverpflichtung ${idx + 1}: Laufzeit bis fehlt`);
          } else if (!isDateInFuture(item.duration)) {
            rowErrors.push(`Zahlungsverpflichtung ${idx + 1}: Laufzeit bis muss in der Zukunft liegen`);
          }
          if (isCurrencyEmptyOrZero(item.amount)) {
            rowErrors.push(`Zahlungsverpflichtung ${idx + 1}: Monatlicher Betrag fehlt oder ist 0`);
          }
          return rowErrors;
        }).flat();
        applicantSectionErrors['3'].push(...otherErrors);
      }

      // Validate Bausparverträge
      if (applicant.hasBausparvertraege === null) {
        applicantSectionErrors['3'].push('Es wurde nicht angegeben, ob der Antragsteller monatlich Sparraten für Bausparverträge zahlt');
      }
      if (applicant.hasBausparvertraege === true) {
        if (!applicant.institutbausparvertraege) {
          applicantSectionErrors['3'].push('Bausparverträge: Institut fehlt');
        }
        if (isCurrencyEmptyOrZero(applicant.sparratebausparvertraege)) {
          applicantSectionErrors['3'].push('Bausparverträge: Monatlicher Betrag fehlt oder ist 0');
        }
      }

      // Validate Rentenversicherung
      if (applicant.hasRentenversicherung === null) {
        applicantSectionErrors['3'].push('Es wurde nicht angegeben, ob der Antragsteller monatlich Prämien für Kapitallebens- und Rentenversicherungen zahlt');
      }
      if (applicant.hasRentenversicherung === true) {
        if (!applicant.institutkapitalrentenversicherung) {
          applicantSectionErrors['3'].push('Rentenversicherung: Institut fehlt');
        }
        if (isCurrencyEmptyOrZero(applicant.praemiekapitalrentenversicherung)) {
          applicantSectionErrors['3'].push('Rentenversicherung: Monatlicher Betrag fehlt oder ist 0');
        }
      }

      errors[getApplicantDisplayName(applicant, index + 1)] = applicantSectionErrors;
    });

    setValidationErrors(errors);
    const hasAnyErrors = Object.values(errors).some(sectionObj => Object.values(sectionObj).some(arr => arr.length > 0));
    setShowValidationModal(hasAnyErrors);
    setShowSuccessModal(!hasAnyErrors);
  };

  if (isLoading) {
    return <div>Formular lädt...</div>;
  }

  return (
    <div className="selbstauskunft-review-container">
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
            {getCurrentApplicant() && (
                <SelbstauskunftForm
                    data={getCurrentApplicant()!}
                    onChange={() => {}} // No-op since this is read-only
                    showValidation={showValidation}
                    isReadOnly={true}
                />
            )}
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
              <p className="mb-3"><strong>Die Selbstauskunft ist vollständig und entspricht den Anforderungen.</strong></p>
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

export default SelbstauskunftReviewContainer; 