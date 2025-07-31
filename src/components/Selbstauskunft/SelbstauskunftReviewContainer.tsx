import React, { useState, useEffect, useRef } from 'react';
import { Container, Modal, Form, Button, Spinner } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, ensureUserFinancialsExists } from '../../lib/supabase';
import { formatCurrencyForDisplay, safeFormatCurrencyForDisplay } from '../../utils/currencyUtils';
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
  wheinachtsgeld_next12?: string;
  urlaubsgeld_next12?: string;
  incomeagriculture?: string;
  incomerent?: string;
  hastaxfreeunterhaltincome?: boolean;
  hastaxableunterhaltincome?: boolean;
  incomeunterhalttaxfree?: string;
  incomeunterhalttaxable?: string;
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
        wheinachtsgeld_next12: financialData?.hasSalaryIncome ? safeFormatCurrencyForDisplay(financialData.wheinachtsgeld_next12) : '',
        urlaubsgeld_next12: financialData?.hasSalaryIncome ? safeFormatCurrencyForDisplay(financialData.urlaubsgeld_next12) : '',
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
        incomeagriculture: financialData?.hasagricultureincome ? safeFormatCurrencyForDisplay(financialData.incomeagriculture) : '',
        incomerent: financialData?.hasrentincome ? safeFormatCurrencyForDisplay(financialData.incomerent) : '',
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
        incomeunterhalttaxable: safeFormatCurrencyForDisplay(financialData?.incomeunterhalttaxable)
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
            wheinachtsgeld_next12: fin.hasSalaryIncome ? safeFormatCurrencyForDisplay(fin.wheinachtsgeld_next12) : '',
            urlaubsgeld_next12: fin.hasSalaryIncome ? safeFormatCurrencyForDisplay(fin.urlaubsgeld_next12) : '',
            monthlynetsalary: fin.hasSalaryIncome ? safeFormatCurrencyForDisplay(fin.monthlynetsalary) : '',
            otheremploymentmonthlynetincome: fin.hasSalaryIncome ? (fin.otheremploymentmonthlynetincome || []) : [],  
            hastaxfreeunterhaltincome: !!fin.hastaxfreeunterhaltincome,
            hastaxableunterhaltincome: !!fin.hastaxableunterhaltincome,
            incomeunterhalttaxfree: fin.hastaxfreeunterhaltincome ? safeFormatCurrencyForDisplay(fin.incomeunterhalttaxfree) : '',
            incomeunterhalttaxable: fin.hastaxableunterhaltincome ? safeFormatCurrencyForDisplay(fin.incomeunterhalttaxable) : '',
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
            incomeagriculture: fin.hasagricultureincome ? safeFormatCurrencyForDisplay(fin.incomeagriculture) : '',
            incomerent: fin.hasrentincome ? safeFormatCurrencyForDisplay(fin.incomerent) : '',
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
    </div>
  );
};

export default SelbstauskunftReviewContainer; 