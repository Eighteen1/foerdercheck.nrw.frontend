import React, { useState, useEffect, useRef } from 'react';
import { Container, Button, Modal, Spinner, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatCurrencyForDisplay, formatCurrencyForDatabase } from '../../utils/currencyUtils';
import SelbstauskunftForm, { sectionKeys as selbstauskunftSectionKeys } from './Steps/SelbstauskunftForm';
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

interface SelbstauskunftContainerProps {
  residentId?: string;
}

// Validation interfaces (following EK pattern)
interface SectionErrors {
  '1': string[];
  '2': string[];
  '3': string[];
  '4': string[];
}

interface ApplicantErrors {
  [applicantName: string]: SectionErrors;
}

const initialMainFinancials: MainFinancials = {
  id: 1,
  title: '',
  firstName: '',
  lastName: '',
  hasSalaryIncome: null,
  wheinachtsgeld_next12: '',
  urlaubsgeld_next12: '',
  incomeagriculture: '',
  incomerent: '',
  hastaxfreeunterhaltincome: false,
  hastaxableunterhaltincome: false,
  ispayingunterhalt: false,
  unterhaltszahlungenTotal: [],
  hasbusinessincome: false,
  hasagricultureincome: false,
  hasrentincome: false,
  haspensionincome: false,
  hascapitalincome: false,
  monthlynetsalary: '',
  otheremploymentmonthlynetincome: [],
  yearlyselfemployednetincome: '',
  yearlybusinessnetincome: '',
  yearlycapitalnetincome: '',
  pensionmonthlynetincome: [],
  haskindergeldincome: false,
  monthlykindergeldnetincome: '',
  haspflegegeldincome: false,
  monthlypflegegeldnetincome: '',
  haselterngeldincome: false,
  monthlyelterngeldnetincome: '',
  hasothernetincome: false,
  othermonthlynetincome: [],
  betragotherinsurancetaxexpenses: [],
  ispayingloans: null,
  loans: [],
  ispayingzwischenkredit: null,
  zwischenkredit: [],
  hasotherzahlungsverpflichtung: null,
  hasBausparvertraege: null,
  hasRentenversicherung: null,
  otherzahlungsverpflichtung: [],
  institutbausparvertraege: '',
  sparratebausparvertraege: '',
  institutkapitalrentenversicherung: '',
  praemiekapitalrentenversicherung: '',
  expensespayable: '',
  bankoverdraft: '',
  debtpayable: '',
  hasbuergschaft: null,
  weitereEinkuenfte: {
    selectedTypes: []
  },
  weitereEinkuenfte2: {
    selectedTypes: [],
  },
  incomeunterhalttaxfree: '',
  incomeunterhalttaxable: ''
};

// Add search terms for each section (aligned with EK pattern)
const sectionSearchTerms = {
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
    "Renten",
    "Pension",
    "Kindergeld",
    "Pflegegeld",
    "Unterhalt",
    "Unterhaltsleistungen",
    "Steuerfrei",
    "Steuerpflichtig",
    "Elterngeld",
    "Andere"
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
    "Kredit",
    "Zwischenkredit",
    "Zahlungsverpflichtung",
    "Bausparvertrag",
    "Kapitalrentenversicherung"
  ],
  '4': [
    "Weitere Angaben",
    "Verbindlichkeiten",
    "Kontoüberziehung",
    "Schulden",
    "Bürgschaft",
    "Sonstige Angaben"
  ]
};

// Add interface for search results
interface SearchResult {
  section: string;
  matches: string[];
}

const sectionTitles = [
  'Nettoeinkommen',
  'Bezüge und Weitere Einkünfte',
  'Monatliche Belastungen',
  'Weitere Angaben',
];
const sectionKeys = ['1', '2', '3', '4'];

const sectionTitleMap: Record<string, string> = {
  '1': 'Nettoeinkommen',
  '2': 'Bezüge und Weitere Einkünfte',
  '3': 'Monatliche Belastungen',
  '4': 'Weitere Angaben',
};

const SelbstauskunftContainer: React.FC<SelbstauskunftContainerProps> = ({ residentId }) => {
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

  // Validation state variables (following EK pattern)
  const [validationErrors, setValidationErrors] = useState<ApplicantErrors>({});
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [hasValidatedOnce, setHasValidatedOnce] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  // Load data from Supabase (aligned with EK pattern)
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
          setIsLoading(false);
          return;
        }

        // Set showValidation based on shouldShowErrorSelbst from database
        const shouldShowError = userData?.should_show_error_selbstauskunft ?? false;
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
          setIsLoading(false);
          return;
        }

        // Set main applicant data (direct mapping like EK)
        setMainFinancials({
          id: 1,
          title: userData?.title || '',
          firstName: userData?.firstname || '',
          lastName: userData?.lastname || '',
          hasSalaryIncome: financialData?.hasSalaryIncome ?? null,
          // Extended fields for Selbstauskunft - salary-related fields only if hasSalaryIncome is true
          wheinachtsgeld_next12: financialData?.hasSalaryIncome && financialData?.wheinachtsgeld_next12 ? formatCurrencyForDisplay(financialData.wheinachtsgeld_next12) : '',
          urlaubsgeld_next12: financialData?.hasSalaryIncome && financialData?.urlaubsgeld_next12 ? formatCurrencyForDisplay(financialData.urlaubsgeld_next12) : '',
          monthlynetsalary: financialData?.hasSalaryIncome && financialData?.monthlynetsalary ? formatCurrencyForDisplay(financialData.monthlynetsalary) : '',
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
          yearlyselfemployednetincome: financialData?.hasbusinessincome && financialData?.yearlyselfemployednetincome ? formatCurrencyForDisplay(financialData.yearlyselfemployednetincome) : '',
          yearlybusinessnetincome: financialData?.hasbusinessincome && financialData?.yearlybusinessnetincome ? formatCurrencyForDisplay(financialData.yearlybusinessnetincome) : '',
          yearlycapitalnetincome: financialData?.hascapitalincome && financialData?.yearlycapitalnetincome ? formatCurrencyForDisplay(financialData.yearlycapitalnetincome) : '',
          incomeagriculture: financialData?.hasagricultureincome && financialData?.incomeagriculture ? formatCurrencyForDisplay(financialData.incomeagriculture) : '',
          incomerent: financialData?.hasrentincome && financialData?.incomerent ? formatCurrencyForDisplay(financialData.incomerent) : '',
          pensionmonthlynetincome: financialData?.haspensionincome ? (financialData?.pensionmonthlynetincome || []) : [],
          haskindergeldincome: !!financialData?.haskindergeldincome,
          monthlykindergeldnetincome: financialData?.monthlykindergeldnetincome ? formatCurrencyForDisplay(financialData.monthlykindergeldnetincome) : '',
          haspflegegeldincome: !!financialData?.haspflegegeldincome,
          monthlypflegegeldnetincome: financialData?.monthlypflegegeldnetincome ? formatCurrencyForDisplay(financialData.monthlypflegegeldnetincome) : '',
          haselterngeldincome: !!financialData?.haselterngeldincome,
          monthlyelterngeldnetincome: financialData?.monthlyelterngeldnetincome ? formatCurrencyForDisplay(financialData.monthlyelterngeldnetincome) : '',
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
          sparratebausparvertraege: financialData?.hasBausparvertraege ? financialData?.sparratebausparvertraege ? formatCurrencyForDisplay(financialData.sparratebausparvertraege) : '' : '',
          institutkapitalrentenversicherung: financialData?.hasRentenversicherung ? financialData?.institutkapitalrentenversicherung || '' : '',
          praemiekapitalrentenversicherung: financialData?.hasRentenversicherung ? financialData?.praemiekapitalrentenversicherung ? formatCurrencyForDisplay(financialData.praemiekapitalrentenversicherung) : '' : '',
          expensespayable: financialData?.expensespayable ? formatCurrencyForDisplay(financialData.expensespayable) : '',
          bankoverdraft: financialData?.bankoverdraft ? formatCurrencyForDisplay(financialData.bankoverdraft) : '',
          debtpayable: financialData?.debtpayable ? formatCurrencyForDisplay(financialData.debtpayable) : '',
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
          incomeunterhalttaxfree: financialData?.incomeunterhalttaxfree ? formatCurrencyForDisplay(financialData.incomeunterhalttaxfree) : '',
          incomeunterhalttaxable: financialData?.incomeunterhalttaxable ? formatCurrencyForDisplay(financialData.incomeunterhalttaxable) : ''
        });

        // Load additional applicants data (similar to EK pattern)
        if (userData?.weitere_antragstellende_personen) {
          const weitere = userData.weitere_antragstellende_personen || [];
          const additionalFinancials = financialData.additional_applicants_financials || [];
          
          const mergedApplicants = weitere.map((person: any, index: number) => {
            const fin = additionalFinancials?.[index] || {};
            
            return {
              id: index + 2,
              title: person.title || '',
              firstName: person.firstName || '',
              lastName: person.lastName || '',
              hasSalaryIncome: fin.hasSalaryIncome ?? null,
              // Extended fields for Selbstauskunft - salary-related fields only if hasSalaryIncome is true
              wheinachtsgeld_next12: fin.hasSalaryIncome && fin.wheinachtsgeld_next12 ? formatCurrencyForDisplay(fin.wheinachtsgeld_next12) : '',
              urlaubsgeld_next12: fin.hasSalaryIncome && fin.urlaubsgeld_next12 ? formatCurrencyForDisplay(fin.urlaubsgeld_next12) : '',
              monthlynetsalary: fin.hasSalaryIncome && fin.monthlynetsalary ? formatCurrencyForDisplay(fin.monthlynetsalary) : '',
              otheremploymentmonthlynetincome: fin.hasSalaryIncome ? (fin.otheremploymentmonthlynetincome || []) : [],  
              hastaxfreeunterhaltincome: !!fin.hastaxfreeunterhaltincome,
              hastaxableunterhaltincome: !!fin.hastaxableunterhaltincome,
              incomeunterhalttaxfree: fin.hastaxfreeunterhaltincome && fin.incomeunterhalttaxfree ? formatCurrencyForDisplay(fin.incomeunterhalttaxfree) : '',
              incomeunterhalttaxable: fin.hastaxableunterhaltincome && fin.incomeunterhalttaxable ? formatCurrencyForDisplay(fin.incomeunterhalttaxable) : '',
              ispayingunterhalt: fin.ispayingunterhalt === null ? null : !!fin.ispayingunterhalt,
              unterhaltszahlungenTotal: fin.ispayingunterhalt ? (fin.unterhaltszahlungenTotal || []) : null,
              hasbusinessincome: !!fin.hasbusinessincome,
              hasagricultureincome: !!fin.hasagricultureincome,
              hasrentincome: !!fin.hasrentincome,
              haspensionincome: !!fin.haspensionincome,
              hascapitalincome: !!fin.hascapitalincome,
              yearlyselfemployednetincome: fin.hasbusinessincome && fin.yearlyselfemployednetincome ? formatCurrencyForDisplay(fin.yearlyselfemployednetincome) : '',
              yearlybusinessnetincome: fin.hasbusinessincome && fin.yearlybusinessnetincome ? formatCurrencyForDisplay(fin.yearlybusinessnetincome) : '',
              yearlycapitalnetincome: fin.hascapitalincome && fin.yearlycapitalnetincome ? formatCurrencyForDisplay(fin.yearlycapitalnetincome) : '',
              incomeagriculture: fin.hasagricultureincome && fin.incomeagriculture ? formatCurrencyForDisplay(fin.incomeagriculture) : '',
              incomerent: fin.hasrentincome && fin.incomerent ? formatCurrencyForDisplay(fin.incomerent) : '',
              pensionmonthlynetincome: fin.haspensionincome ? (fin.pensionmonthlynetincome || []) : [],
              haskindergeldincome: !!fin.haskindergeldincome,
              monthlykindergeldnetincome: fin.monthlykindergeldnetincome ? formatCurrencyForDisplay(fin.monthlykindergeldnetincome) : '',
              haspflegegeldincome: !!fin.haspflegegeldincome,
              monthlypflegegeldnetincome: fin.monthlypflegegeldnetincome ? formatCurrencyForDisplay(fin.monthlypflegegeldnetincome) : '',
              haselterngeldincome: !!fin.haselterngeldincome,
              monthlyelterngeldnetincome: fin.monthlyelterngeldnetincome ? formatCurrencyForDisplay(fin.monthlyelterngeldnetincome) : '',
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
              sparratebausparvertraege: fin.hasBausparvertraege && fin.sparratebausparvertraege ? formatCurrencyForDisplay(fin.sparratebausparvertraege) : '',
              institutkapitalrentenversicherung: fin.hasRentenversicherung ? (fin.institutkapitalrentenversicherung || '') : '',
              praemiekapitalrentenversicherung: fin.hasRentenversicherung && fin.praemiekapitalrentenversicherung ? formatCurrencyForDisplay(fin.praemiekapitalrentenversicherung) : '',
              expensespayable: fin.expensespayable ? formatCurrencyForDisplay(fin.expensespayable) : '',
              bankoverdraft: fin.bankoverdraft ? formatCurrencyForDisplay(fin.bankoverdraft) : '',
              debtpayable: fin.debtpayable ? formatCurrencyForDisplay(fin.debtpayable) : '',
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

        setIsLoading(false);
      } catch (error) {
        console.error('Error loading saved data:', error);
        setIsLoading(false);
      }
    };

    loadSavedData();
  }, [user?.id, residentId]);

  // Applicant Management (aligned with EK pattern)
  const handleAddApplicant = () => {
    const newApplicant: AdditionalApplicantFinancials = {
      ...initialMainFinancials,
      id: additionalApplicants.length + 2,
    };
    setAdditionalApplicants((prev) => [...prev, newApplicant]);
    setSelectedIndex(additionalApplicants.length + 1);
  };

  const handleRemoveApplicant = (index: number) => {
    if (index === 0) return; // Can't remove main applicant
    setAdditionalApplicants((prev) => prev.filter((_, i) => i !== index - 1));
    setSelectedIndex(0);
  };

  const handleMainFinancialsChange = (data: MainFinancials) => {
    setMainFinancials(data);
    setHasUnsavedChanges(true);
  };

  const handleApplicantChange = (index: number, data: any) => {
    // Synchronize boolean flags with selected income types
    if (data.weitereEinkuenfte?.selectedTypes) {
      data.hasbusinessincome = data.weitereEinkuenfte.selectedTypes.includes('gewerbe');
      data.hasagricultureincome = data.weitereEinkuenfte.selectedTypes.includes('landforst');
      data.hascapitalincome = data.weitereEinkuenfte.selectedTypes.includes('kapital');
      data.hasrentincome = data.weitereEinkuenfte.selectedTypes.includes('vermietung');
    }
    if (data.weitereEinkuenfte2?.selectedTypes) {
      data.hastaxfreeunterhaltincome = data.weitereEinkuenfte2.selectedTypes.includes('unterhaltsteuerfrei');
      data.hastaxableunterhaltincome = data.weitereEinkuenfte2.selectedTypes.includes('unterhaltsteuerpflichtig');
      data.haskindergeldincome = data.weitereEinkuenfte2.selectedTypes.includes('kindergeld');
      data.haspflegegeldincome = data.weitereEinkuenfte2.selectedTypes.includes('pflegegeld');
      data.haselterngeldincome = data.weitereEinkuenfte2.selectedTypes.includes('elterngeld');
      data.hasothernetincome = data.weitereEinkuenfte2.selectedTypes.includes('sonstiges');
    }

    if (index === 0) {
      // Main applicant
      setMainFinancials((prev) => ({ ...prev, ...data }));
    } else {
      // Additional applicant
      setAdditionalApplicants((prev) =>
        prev.map((a, i) => (i === index - 1 ? { ...a, ...data } : a))
      );
    }
    setHasUnsavedChanges(true);
  };

  const getCurrentApplicant = () => {
    return selectedIndex === 0 ? mainFinancials : additionalApplicants[selectedIndex - 1];
  };

  // Save/Validation/Progress (aligned with EK pattern)
  const saveData = async (navigateAfterSave = false) => {
    setIsLoading(true);
    try {
      const userId = residentId || user?.id;
      if (!userId) {
        console.error('No user id found');
        setIsLoading(false);
        return;
      }

      // Calculate progress
      const selbstauskunftProgress = calculateProgress();
      console.log('Selbstauskunft Progress calculation completed:', selbstauskunftProgress);

      // Get existing user_data to preserve other fields
      const { data: existingUserData } = await supabase
        .from('user_data')
        .select('*')
        .eq('id', userId)
        .single();

      // Get existing financial data to preserve fields from other forms
      const { data: existingFinancialData } = await supabase
        .from('user_financials')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Update user_data
      const { error: userDataError } = await supabase
        .from('user_data')
        .update({
          title: mainFinancials.title || null,
          firstname: mainFinancials.firstName || null,
          lastname: mainFinancials.lastName || null,
          selbstauskunft_progress: selbstauskunftProgress,
          weitere_antragstellende_personen: additionalApplicants.map((a, idx) => {
            const existingPerson = existingUserData?.weitere_antragstellende_personen?.[idx] || {};
            return {
              ...existingPerson,
              title: a.title || existingPerson.title || null,
              firstname: a.firstName || existingPerson.firstname || null,
              lastname: a.lastName || existingPerson.lastname || null,
            };
          })
        })
        .eq('id', userId);

      // Convert currency strings back to numbers for database
      const convertFinancialData = (applicant: MainFinancials | AdditionalApplicantFinancials) => {
        const hasTaxFreeUnterhalt = applicant.weitereEinkuenfte2?.selectedTypes?.includes('unterhaltsteuerfrei') || false;
        const hasTaxableUnterhalt = applicant.weitereEinkuenfte2?.selectedTypes?.includes('unterhaltsteuerpflichtig') || false;
        const hasKindergeld = applicant.weitereEinkuenfte2?.selectedTypes?.includes('kindergeld') || false;
        const hasPflegegeld = applicant.weitereEinkuenfte2?.selectedTypes?.includes('pflegegeld') || false;
        const hasElterngeld = applicant.weitereEinkuenfte2?.selectedTypes?.includes('elterngeld') || false;
        const hasOtherNetIncome = applicant.weitereEinkuenfte2?.selectedTypes?.includes('sonstiges') || false;

        return {
          hasSalaryIncome: applicant.hasSalaryIncome,
          // Salary-related fields only if hasSalaryIncome is true
          wheinachtsgeld_next12: applicant.hasSalaryIncome && applicant.wheinachtsgeld_next12 ? formatCurrencyForDatabase(applicant.wheinachtsgeld_next12) : null,
          urlaubsgeld_next12: applicant.hasSalaryIncome && applicant.urlaubsgeld_next12 ? formatCurrencyForDatabase(applicant.urlaubsgeld_next12) : null,
          monthlynetsalary: applicant.hasSalaryIncome && applicant.monthlynetsalary ? formatCurrencyForDatabase(applicant.monthlynetsalary) : null,
          otheremploymentmonthlynetincome: applicant.hasSalaryIncome ? (applicant.otheremploymentmonthlynetincome || []) : null,
          incomeagriculture: applicant.incomeagriculture ? formatCurrencyForDatabase(applicant.incomeagriculture) : null,
          incomerent: applicant.incomerent ? formatCurrencyForDatabase(applicant.incomerent) : null,
          hastaxfreeunterhaltincome: hasTaxFreeUnterhalt,
          incomeunterhalttaxfree: hasTaxFreeUnterhalt && applicant.incomeunterhalttaxfree ? formatCurrencyForDatabase(applicant.incomeunterhalttaxfree) : null,
          hastaxableunterhaltincome: hasTaxableUnterhalt,
          incomeunterhalttaxable: hasTaxableUnterhalt && applicant.incomeunterhalttaxable ? formatCurrencyForDatabase(applicant.incomeunterhalttaxable) : null,
          ispayingunterhalt: applicant.ispayingunterhalt === null ? null : !!applicant.ispayingunterhalt,
          unterhaltszahlungenTotal: applicant.ispayingunterhalt ? (applicant.unterhaltszahlungenTotal || []) : null,
          hasbusinessincome: applicant.weitereEinkuenfte?.selectedTypes?.includes('gewerbe') || false,
          hasagricultureincome: applicant.weitereEinkuenfte?.selectedTypes?.includes('landforst') || false,
          hasrentincome: applicant.weitereEinkuenfte?.selectedTypes?.includes('vermietung') || false,
          haspensionincome: applicant.haspensionincome || false,
          hascapitalincome: applicant.weitereEinkuenfte?.selectedTypes?.includes('kapital') || false,
          yearlyselfemployednetincome: applicant.yearlyselfemployednetincome ? formatCurrencyForDatabase(applicant.yearlyselfemployednetincome) : null,
          yearlybusinessnetincome: applicant.yearlybusinessnetincome ? formatCurrencyForDatabase(applicant.yearlybusinessnetincome) : null,
          yearlycapitalnetincome: applicant.yearlycapitalnetincome ? formatCurrencyForDatabase(applicant.yearlycapitalnetincome) : null,
          pensionmonthlynetincome: applicant.haspensionincome ? (applicant.pensionmonthlynetincome || []) : null,
          haskindergeldincome: hasKindergeld,
          monthlykindergeldnetincome: hasKindergeld && applicant.monthlykindergeldnetincome ? formatCurrencyForDatabase(applicant.monthlykindergeldnetincome) : null,
          haspflegegeldincome: hasPflegegeld,
          monthlypflegegeldnetincome: hasPflegegeld && applicant.monthlypflegegeldnetincome ? formatCurrencyForDatabase(applicant.monthlypflegegeldnetincome) : null,
          haselterngeldincome: hasElterngeld,
          monthlyelterngeldnetincome: hasElterngeld && applicant.monthlyelterngeldnetincome ? formatCurrencyForDatabase(applicant.monthlyelterngeldnetincome) : null,
          hasothernetincome: hasOtherNetIncome,
          othermonthlynetincome: hasOtherNetIncome ? (applicant.othermonthlynetincome || []) : null,
          betragotherinsurancetaxexpenses: applicant.betragotherinsurancetaxexpenses || [],
          ispayingloans: applicant.ispayingloans === null ? null : !!applicant.ispayingloans,
          loans: applicant.ispayingloans ? (applicant.loans || []) : null,
          ispayingzwischenkredit: applicant.ispayingzwischenkredit === null ? null : !!applicant.ispayingzwischenkredit,
          zwischenkredit: applicant.ispayingzwischenkredit ? (applicant.zwischenkredit || []) : null,
          hasotherzahlungsverpflichtung: applicant.hasotherzahlungsverpflichtung === null ? null : !!applicant.hasotherzahlungsverpflichtung,
          otherzahlungsverpflichtung: applicant.hasotherzahlungsverpflichtung ? (applicant.otherzahlungsverpflichtung || []) : null,
          hasBausparvertraege: applicant.hasBausparvertraege === null ? null : !!applicant.hasBausparvertraege,
          hasRentenversicherung: applicant.hasRentenversicherung === null ? null : !!applicant.hasRentenversicherung,
          institutbausparvertraege: applicant.hasBausparvertraege ? (applicant.institutbausparvertraege || '') : '',
          sparratebausparvertraege: applicant.hasBausparvertraege && applicant.sparratebausparvertraege ? formatCurrencyForDatabase(applicant.sparratebausparvertraege) : null,
          institutkapitalrentenversicherung: applicant.hasRentenversicherung ? (applicant.institutkapitalrentenversicherung || '') : '',
          praemiekapitalrentenversicherung: applicant.hasRentenversicherung && applicant.praemiekapitalrentenversicherung ? formatCurrencyForDatabase(applicant.praemiekapitalrentenversicherung) : null,
          expensespayable: applicant.expensespayable ? formatCurrencyForDatabase(applicant.expensespayable) : null,
          bankoverdraft: applicant.bankoverdraft ? formatCurrencyForDatabase(applicant.bankoverdraft) : null,
          debtpayable: applicant.debtpayable ? formatCurrencyForDatabase(applicant.debtpayable) : null,
          hasbuergschaft: applicant.hasbuergschaft,
        };
      };

      // Prepare the update data by merging with existing data to preserve fields from other forms
      const mainApplicantData = convertFinancialData(mainFinancials);
      const additionalApplicantsData = additionalApplicants.map(a => convertFinancialData(a));

      // Merge with existing data to preserve fields from Einkommenserklaerung
      const updateData = {
        ...existingFinancialData, // Preserve all existing data
        ...mainApplicantData, // Override with Selbstauskunft data
        additional_applicants_financials: additionalApplicantsData.map((newData, index) => {
          const existingAdditionalData = existingFinancialData?.additional_applicants_financials?.[index] || {};
          return {
            ...existingAdditionalData, // Preserve existing additional applicant data
            ...newData // Override with new Selbstauskunft data
          };
        })
      };

      // Update user_financials
      const { error: financialsError } = await supabase
        .from('user_financials')
        .update(updateData)
        .eq('user_id', userId);

      setIsLoading(false);
      if (userDataError || financialsError) {
        console.error('Save error:', userDataError || financialsError);
        return;
      }
      setShowModal(true);
      setHasUnsavedChanges(false);
      if (navigateAfterSave) {
        navigate('/personal-space');
      }
    } catch (error) {
      console.error('Error saving data:', error);
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    const errors: ApplicantErrors = {};

    // Helper function to validate if a date is in the future
    const isDateInFuture = (dateString: string): boolean => {
      if (!dateString) return true; // Empty dates are handled by required validation
      const inputDate = new Date(dateString);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
      return inputDate > today;
    };

    // --- Main Applicant ---
    const mainSectionErrors: SectionErrors = {
      '1': [], '2': [], '3': [], '4': []
    };

    // Section 1: Nettoeinkommen
    if (mainFinancials.hasSalaryIncome === null) {
      mainSectionErrors['1'].push('Bitte geben Sie an, ob Sie Einkünfte aus nichtselbstständiger Arbeit erzielen');
    }
    if (mainFinancials.hasSalaryIncome === true) {
      if (!mainFinancials.monthlynetsalary) {
        mainSectionErrors['1'].push('Lohn/Gehalt: Monatliches Nettoeinkommen ist erforderlich');
      }
      if (!mainFinancials.wheinachtsgeld_next12) {
        mainSectionErrors['1'].push('Weihnachtsgeld: Jahresbetrag ist erforderlich');
      }
      if (!mainFinancials.urlaubsgeld_next12) {
        mainSectionErrors['1'].push('Urlaubsgeld: Jahresbetrag ist erforderlich');
      }
      // Validate sonstige beträge
      if (mainFinancials.otheremploymentmonthlynetincome && Array.isArray(mainFinancials.otheremploymentmonthlynetincome)) {
        mainFinancials.otheremploymentmonthlynetincome.forEach((item: any, idx: number) => {
          if (!item.type) {
            mainSectionErrors['1'].push(`Sonstige Beträge ${idx + 1}: Art des Betrags fehlt`);
          }
          if (!item.amount) {
            mainSectionErrors['1'].push(`Sonstige Beträge ${idx + 1}: Jahresbetrag fehlt`);
          }
        });
      }
    }

    // Validate weitere Einkünfte (Section 1.2)
    if (mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('gewerbe') && !mainFinancials.yearlybusinessnetincome && !mainFinancials.yearlyselfemployednetincome) {
      mainSectionErrors['1'].push('Bei Gewerbebetrieb/selbstständiger Arbeit muss mindestens ein Betrag angegeben werden');
    }
    if (mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('landforst') && !mainFinancials.incomeagriculture) {
      mainSectionErrors['1'].push('Land- und Forstwirtschaft: Jahresbetrag ist erforderlich');
    }
    if (mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('kapital') && !mainFinancials.yearlycapitalnetincome) {
      mainSectionErrors['1'].push('Kapitalvermögen: Jahresbetrag ist erforderlich');
    }
    if (mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('vermietung') && !mainFinancials.incomerent) {
      mainSectionErrors['1'].push('Vermietung und Verpachtung: Jahresbetrag ist erforderlich');
    }

    // Section 2: Bezüge und Weitere Einkünfte
    if (mainFinancials.haspensionincome === null) {
      mainSectionErrors['2'].push('Bitte geben Sie an, ob Sie Rentenbezüge/Versorgungsbezüge beziehen');
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
        if (!item.amount) {
          rowErrors.push(`Rentenart ${idx + 1}: Monatliches Nettoeinkommen fehlt`);
        }
        return rowErrors;
      }).flat();
      mainSectionErrors['2'].push(...pensionErrors);
    }

    // Validate weitere Einkünfte 2 (Section 2.2)
    if (mainFinancials.weitereEinkuenfte2?.selectedTypes?.includes('kindergeld') && !mainFinancials.monthlykindergeldnetincome) {
      mainSectionErrors['2'].push('Kindergeld: Monatliches Nettoeinkommen ist erforderlich');
    }
    if (mainFinancials.weitereEinkuenfte2?.selectedTypes?.includes('pflegegeld') && !mainFinancials.monthlypflegegeldnetincome) {
      mainSectionErrors['2'].push('Pflegegeld: Monatliches Nettoeinkommen ist erforderlich');
    }
    if (mainFinancials.weitereEinkuenfte2?.selectedTypes?.includes('unterhaltsteuerfrei') && !mainFinancials.incomeunterhalttaxfree) {
      mainSectionErrors['2'].push('Unterhaltsleistungen steuerfrei: Monatliches Nettoeinkommen ist erforderlich');
    }
    if (mainFinancials.weitereEinkuenfte2?.selectedTypes?.includes('unterhaltsteuerpflichtig') && !mainFinancials.incomeunterhalttaxable) {
      mainSectionErrors['2'].push('Unterhaltsleistungen steuerpflichtig: Monatliches Nettoeinkommen ist erforderlich');
    }
    if (mainFinancials.weitereEinkuenfte2?.selectedTypes?.includes('elterngeld') && !mainFinancials.monthlyelterngeldnetincome) {
      mainSectionErrors['2'].push('Elterngeld/Erziehungsgeld: Monatliches Nettoeinkommen ist erforderlich');
    }
    if (mainFinancials.weitereEinkuenfte2?.selectedTypes?.includes('sonstiges')) {
      const otherIncome = mainFinancials.othermonthlynetincome || [];
      const itemsToValidate = otherIncome.length > 0 ? otherIncome : [{ type: '', amount: '' }];
      const sonstigeErrors = itemsToValidate.map((item: any, idx: number) => {
        const rowErrors: string[] = [];
        if (!item.type) {
          rowErrors.push(`Sonstiges Einkommen ${idx + 1}: Art des Einkommens fehlt`);
        }
        if (!item.amount) {
          rowErrors.push(`Sonstiges Einkommen ${idx + 1}: Monatliches Nettoeinkommen fehlt`);
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
        if (!item.amount) {
          rowErrors.push(`Steuer/Beitrag ${idx + 1}: Monatlicher Betrag fehlt`);
        }
        return rowErrors;
      }).flat();
      mainSectionErrors['3'].push(...taxErrors);
    }

    // Validate loans
    if (mainFinancials.ispayingloans === null) {
      mainSectionErrors['3'].push('Bitte geben Sie an, ob Sie laufende Kredite haben');
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
        if (!item.amount) {
          rowErrors.push(`Kredit ${idx + 1}: Monatlicher Betrag fehlt`);
        }
        return rowErrors;
      }).flat();
      mainSectionErrors['3'].push(...loanErrors);
    }

    // Validate zwischenkredit
    if (mainFinancials.ispayingzwischenkredit === null) {
      mainSectionErrors['3'].push('Bitte geben Sie an, ob Sie einen laufenden Zwischenkredit für Bauspardarlehen haben');
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
        if (!item.amount) {
          rowErrors.push(`Zwischenkredit: Monatlicher Betrag fehlt`);
        }
        return rowErrors;
      }).flat();
      mainSectionErrors['3'].push(...zwischenErrors);
    }

    // Validate unterhalt
    if (mainFinancials.ispayingunterhalt === null) {
      mainSectionErrors['3'].push('Bitte geben Sie an, ob Sie Unterhalt zahlen');
    }
    if (mainFinancials.ispayingunterhalt === true && mainFinancials.unterhaltszahlungenTotal) {
      const unterhaltErrors = mainFinancials.unterhaltszahlungenTotal.map((item: any, idx: number) => {
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
      mainSectionErrors['3'].push(...unterhaltErrors);
    }

    // Validate other payment obligations
    if (mainFinancials.hasotherzahlungsverpflichtung === null) {
      mainSectionErrors['3'].push('Bitte geben Sie an, ob Sie sonstige Zahlungsverpflichtungen haben');
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
        if (!item.amount) {
          rowErrors.push(`Zahlungsverpflichtung ${idx + 1}: Monatlicher Betrag fehlt`);
        }
        return rowErrors;
      }).flat();
      mainSectionErrors['3'].push(...otherErrors);
    }

    // Validate Bausparverträge
    if (mainFinancials.hasBausparvertraege === null) {
      mainSectionErrors['3'].push('Bitte geben Sie an, ob Sie monatlich Sparraten für Bausparverträge zahlen');
    }
    if (mainFinancials.hasBausparvertraege === true) {
      if (!mainFinancials.institutbausparvertraege) {
        mainSectionErrors['3'].push('Bausparverträge: Institut fehlt');
      }
      if (!mainFinancials.sparratebausparvertraege) {
        mainSectionErrors['3'].push('Bausparverträge: Monatlicher Betrag fehlt');
      }
    }

    // Validate Rentenversicherung
    if (mainFinancials.hasRentenversicherung === null) {
      mainSectionErrors['3'].push('Bitte geben Sie an, ob Sie monatlich Prämien für Kapitallebens- und Rentenversicherungen zahlen');
    }
    if (mainFinancials.hasRentenversicherung === true) {
      if (!mainFinancials.institutkapitalrentenversicherung) {
        mainSectionErrors['3'].push('Rentenversicherung: Institut fehlt');
      }
      if (!mainFinancials.praemiekapitalrentenversicherung) {
        mainSectionErrors['3'].push('Rentenversicherung: Monatlicher Betrag fehlt');
      }
    }

    // Section 4: Weitere Angaben
    // No required fields in section 4, but hasbuergschaft is optional

    errors['Antragstellende Person 1'] = mainSectionErrors;

    // --- Additional Applicants ---
    additionalApplicants.forEach((applicant, index) => {
      const applicantSectionErrors: SectionErrors = {
        '1': [], '2': [], '3': [], '4': []
      };

      // Section 1: Nettoeinkommen
      if (applicant.hasSalaryIncome === null) {
        applicantSectionErrors['1'].push('Bitte geben Sie an, ob Sie Einkünfte aus nichtselbstständiger Arbeit erzielen');
      }
      if (applicant.hasSalaryIncome === true) {
        if (!applicant.monthlynetsalary) {
          applicantSectionErrors['1'].push('Lohn/Gehalt: Monatliches Nettoeinkommen ist erforderlich');
        }
        if (!applicant.wheinachtsgeld_next12) {
          applicantSectionErrors['1'].push('Weihnachtsgeld: Jahresbetrag ist erforderlich');
        }
        if (!applicant.urlaubsgeld_next12) {
          applicantSectionErrors['1'].push('Urlaubsgeld: Jahresbetrag ist erforderlich');
        }
        // Validate sonstige beträge
        if (applicant.otheremploymentmonthlynetincome && Array.isArray(applicant.otheremploymentmonthlynetincome)) {
          applicant.otheremploymentmonthlynetincome.forEach((item: any, idx: number) => {
            if (!item.type) {
              applicantSectionErrors['1'].push(`Sonstige Beträge ${idx + 1}: Art des Betrags fehlt`);
            }
            if (!item.amount) {
              applicantSectionErrors['1'].push(`Sonstige Beträge ${idx + 1}: Jahresbetrag fehlt`);
            }
          });
        }
      }

      // Validate weitere Einkünfte (Section 1.2)
      if (applicant.weitereEinkuenfte?.selectedTypes?.includes('gewerbe') && !applicant.yearlybusinessnetincome && !applicant.yearlyselfemployednetincome) {
        applicantSectionErrors['1'].push('Bei Gewerbebetrieb/selbstständiger Arbeit muss mindestens ein Betrag angegeben werden');
      }
      if (applicant.weitereEinkuenfte?.selectedTypes?.includes('landforst') && !applicant.incomeagriculture) {
        applicantSectionErrors['1'].push('Land- und Forstwirtschaft: Jahresbetrag ist erforderlich');
      }
      if (applicant.weitereEinkuenfte?.selectedTypes?.includes('kapital') && !applicant.yearlycapitalnetincome) {
        applicantSectionErrors['1'].push('Kapitalvermögen: Jahresbetrag ist erforderlich');
      }
      if (applicant.weitereEinkuenfte?.selectedTypes?.includes('vermietung') && !applicant.incomerent) {
        applicantSectionErrors['1'].push('Vermietung und Verpachtung: Jahresbetrag ist erforderlich');
      }

      // Section 2: Bezüge und Weitere Einkünfte
      if (applicant.haspensionincome === null) {
        applicantSectionErrors['2'].push('Bitte geben Sie an, ob Sie Rentenbezüge/Versorgungsbezüge beziehen');
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
          if (!item.amount) {
            rowErrors.push(`Rentenart ${idx + 1}: Monatliches Nettoeinkommen fehlt`);
          }
          return rowErrors;
        }).flat();
        applicantSectionErrors['2'].push(...pensionErrors);
      }

      // Validate weitere Einkünfte 2 (Section 2.2)
      if (applicant.weitereEinkuenfte2?.selectedTypes?.includes('kindergeld') && !applicant.monthlykindergeldnetincome) {
        applicantSectionErrors['2'].push('Kindergeld: Monatliches Nettoeinkommen ist erforderlich');
      }
      if (applicant.weitereEinkuenfte2?.selectedTypes?.includes('pflegegeld') && !applicant.monthlypflegegeldnetincome) {
        applicantSectionErrors['2'].push('Pflegegeld: Monatliches Nettoeinkommen ist erforderlich');
      }
      if (applicant.weitereEinkuenfte2?.selectedTypes?.includes('unterhaltsteuerfrei') && !applicant.incomeunterhalttaxfree) {
        applicantSectionErrors['2'].push('Unterhaltsleistungen steuerfrei: Monatliches Nettoeinkommen ist erforderlich');
      }
      if (applicant.weitereEinkuenfte2?.selectedTypes?.includes('unterhaltsteuerpflichtig') && !applicant.incomeunterhalttaxable) {
        applicantSectionErrors['2'].push('Unterhaltsleistungen steuerpflichtig: Monatliches Nettoeinkommen ist erforderlich');
      }
      if (applicant.weitereEinkuenfte2?.selectedTypes?.includes('elterngeld') && !applicant.monthlyelterngeldnetincome) {
        applicantSectionErrors['2'].push('Elterngeld/Erziehungsgeld: Monatliches Nettoeinkommen ist erforderlich');
      }
      if (applicant.weitereEinkuenfte2?.selectedTypes?.includes('sonstiges')) {
        const otherIncome = applicant.othermonthlynetincome || [];
        const itemsToValidate = otherIncome.length > 0 ? otherIncome : [{ type: '', amount: '' }];
        const sonstigeErrors = itemsToValidate.map((item: any, idx: number) => {
          const rowErrors: string[] = [];
          if (!item.type) {
            rowErrors.push(`Sonstiges Einkommen ${idx + 1}: Art des Einkommens fehlt`);
          }
          if (!item.amount) {
            rowErrors.push(`Sonstiges Einkommen ${idx + 1}: Monatliches Nettoeinkommen fehlt`);
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
          if (!item.amount) {
            rowErrors.push(`Steuer/Beitrag ${idx + 1}: Monatlicher Betrag fehlt`);
          }
          return rowErrors;
        }).flat();
        applicantSectionErrors['3'].push(...taxErrors);
      }

      // Validate loans
      if (applicant.ispayingloans === null) {
        applicantSectionErrors['3'].push('Bitte geben Sie an, ob Sie laufende Kredite haben');
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
          if (!item.amount) {
            rowErrors.push(`Kredit ${idx + 1}: Monatlicher Betrag fehlt`);
          }
          return rowErrors;
        }).flat();
        applicantSectionErrors['3'].push(...loanErrors);
      }

      // Validate zwischenkredit
      if (applicant.ispayingzwischenkredit === null) {
        applicantSectionErrors['3'].push('Bitte geben Sie an, ob Sie einen laufenden Zwischenkredit für Bauspardarlehen haben');
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
          if (!item.amount) {
            rowErrors.push(`Zwischenkredit: Monatlicher Betrag fehlt`);
          }
          return rowErrors;
        }).flat();
        applicantSectionErrors['3'].push(...zwischenErrors);
      }

      // Validate unterhalt
      if (applicant.ispayingunterhalt === null) {
        applicantSectionErrors['3'].push('Bitte geben Sie an, ob Sie Unterhalt zahlen');
      }
      if (applicant.ispayingunterhalt === true && applicant.unterhaltszahlungenTotal) {
        const unterhaltErrors = applicant.unterhaltszahlungenTotal.map((item: any, idx: number) => {
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
        applicantSectionErrors['3'].push(...unterhaltErrors);
      }

      // Validate other payment obligations
      if (applicant.hasotherzahlungsverpflichtung === null) {
        applicantSectionErrors['3'].push('Bitte geben Sie an, ob Sie sonstige Zahlungsverpflichtungen haben');
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
          if (!item.amount) {
            rowErrors.push(`Zahlungsverpflichtung ${idx + 1}: Monatlicher Betrag fehlt`);
          }
          return rowErrors;
        }).flat();
        applicantSectionErrors['3'].push(...otherErrors);
      }

      // Validate Bausparverträge
      if (applicant.hasBausparvertraege === null) {
        applicantSectionErrors['3'].push('Bitte geben Sie an, ob Sie monatlich Sparraten für Bausparverträge zahlen');
      }
      if (applicant.hasBausparvertraege === true) {
        if (!applicant.institutbausparvertraege) {
          applicantSectionErrors['3'].push('Bausparverträge: Institut fehlt');
        }
        if (!applicant.sparratebausparvertraege) {
          applicantSectionErrors['3'].push('Bausparverträge: Monatlicher Betrag fehlt');
        }
      }

      // Validate Rentenversicherung
      if (applicant.hasRentenversicherung === null) {
        applicantSectionErrors['3'].push('Bitte geben Sie an, ob Sie monatlich Prämien für Kapitallebens- und Rentenversicherungen zahlen');
      }
      if (applicant.hasRentenversicherung === true) {
        if (!applicant.institutkapitalrentenversicherung) {
          applicantSectionErrors['3'].push('Rentenversicherung: Institut fehlt');
        }
        if (!applicant.praemiekapitalrentenversicherung) {
          applicantSectionErrors['3'].push('Rentenversicherung: Monatlicher Betrag fehlt');
        }
      }

      errors[`Antragstellende Person ${index + 2}`] = applicantSectionErrors;
    });

    setValidationErrors(errors);
    setShowValidationModal(Object.values(errors).some(sectionObj => Object.values(sectionObj).some(arr => arr.length > 0)));
    setShowSuccessModal(Object.values(errors).every(sectionObj => Object.values(sectionObj).every(arr => arr.length === 0)));
    setShowValidation(true);
    setHasValidatedOnce(true);
  };

  const calculateProgress = () => {
    let totalPotentialFields = 0;
    let actualErrors = 0;

    // Helper: is date in future (copied from validateForm)
    const isDateInFuture = (dateString: string): boolean => {
      if (!dateString) return true;
      const inputDate = new Date(dateString);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return inputDate > today;
    };

    // Helper: count for sonstige arrays
    const countArrayFields = (arr: any[], fields: string[]) => {
      let total = 0, errors = 0;
      arr.forEach((item: any) => {
        fields.forEach((f) => {
          total++;
          if (!item[f]) errors++;
        });
      });
      return { total, errors };
    };

    // --- Main Applicant ---
    const main = mainFinancials;
    // Section 1: Nettoeinkommen
    totalPotentialFields++; // hasSalaryIncome
    if (main.hasSalaryIncome === null) actualErrors++;
    if (main.hasSalaryIncome === true) {
      totalPotentialFields += 3; // monthlynetsalary, wheinachtsgeld_next12, urlaubsgeld_next12
      if (!main.monthlynetsalary) actualErrors++;
      if (!main.wheinachtsgeld_next12) actualErrors++;
      if (!main.urlaubsgeld_next12) actualErrors++;
      // sonstige beträge
      if (main.otheremploymentmonthlynetincome && Array.isArray(main.otheremploymentmonthlynetincome)) {
        const { total, errors } = countArrayFields(main.otheremploymentmonthlynetincome, ['type', 'amount']);
        totalPotentialFields += total;
        actualErrors += errors;
      }
    }
    // weitere Einkünfte (Section 1.2)
    if (main.weitereEinkuenfte?.selectedTypes?.includes('gewerbe')) {
      totalPotentialFields += 2;
      if (!main.yearlybusinessnetincome && !main.yearlyselfemployednetincome) actualErrors++;
      if (!main.yearlybusinessnetincome) actualErrors++;
      if (!main.yearlyselfemployednetincome) actualErrors++;
    }
    if (main.weitereEinkuenfte?.selectedTypes?.includes('landforst')) {
      totalPotentialFields++;
      if (!main.incomeagriculture) actualErrors++;
    }
    if (main.weitereEinkuenfte?.selectedTypes?.includes('kapital')) {
      totalPotentialFields++;
      if (!main.yearlycapitalnetincome) actualErrors++;
    }
    if (main.weitereEinkuenfte?.selectedTypes?.includes('vermietung')) {
      totalPotentialFields++;
      if (!main.incomerent) actualErrors++;
    }
    // Section 2: Bezüge und Weitere Einkünfte
    totalPotentialFields++; // haspensionincome
    if (main.haspensionincome === null) actualErrors++;
    if (main.haspensionincome === true) {
      // pensionmonthlynetincome
      const pensionRows = (main.pensionmonthlynetincome && main.pensionmonthlynetincome.length > 0)
        ? main.pensionmonthlynetincome : [{ type: '', amount: '' }];
      const { total, errors } = countArrayFields(pensionRows, ['type', 'amount']);
      totalPotentialFields += total;
      actualErrors += errors;
    }
    // weitere Einkünfte 2 (Section 2.2)
    if (main.weitereEinkuenfte2?.selectedTypes?.includes('kindergeld')) {
      totalPotentialFields++;
      if (!main.monthlykindergeldnetincome) actualErrors++;
    }
    if (main.weitereEinkuenfte2?.selectedTypes?.includes('pflegegeld')) {
      totalPotentialFields++;
      if (!main.monthlypflegegeldnetincome) actualErrors++;
    }
    if (main.weitereEinkuenfte2?.selectedTypes?.includes('unterhaltsteuerfrei')) {
      totalPotentialFields++;
      if (!main.incomeunterhalttaxfree) actualErrors++;
    }
    if (main.weitereEinkuenfte2?.selectedTypes?.includes('unterhaltsteuerpflichtig')) {
      totalPotentialFields++;
      if (!main.incomeunterhalttaxable) actualErrors++;
    }
    if (main.weitereEinkuenfte2?.selectedTypes?.includes('elterngeld')) {
      totalPotentialFields++;
      if (!main.monthlyelterngeldnetincome) actualErrors++;
    }
    if (main.weitereEinkuenfte2?.selectedTypes?.includes('sonstiges')) {
      const otherIncome = main.othermonthlynetincome || [];
      const itemsToValidate = otherIncome.length > 0 ? otherIncome : [{ type: '', amount: '' }];
      const { total, errors } = countArrayFields(itemsToValidate, ['type', 'amount']);
      totalPotentialFields += total;
      actualErrors += errors;
    }
    // Section 3: Monatliche Belastungen
    if (main.betragotherinsurancetaxexpenses && Array.isArray(main.betragotherinsurancetaxexpenses)) {
      const { total, errors } = countArrayFields(main.betragotherinsurancetaxexpenses, ['type', 'amount']);
      totalPotentialFields += total;
      actualErrors += errors;
    }
    totalPotentialFields++; // ispayingloans
    if (main.ispayingloans === null) actualErrors++;
    if (main.ispayingloans === true) {
      const loanRows = (main.loans && main.loans.length > 0) ? main.loans : [{ description: '', duration: '', amount: '' }];
      const { total, errors } = countArrayFields(loanRows, ['description', 'duration', 'amount']);
      totalPotentialFields += total;
      actualErrors += errors;
      // duration must be in future
      loanRows.forEach((item: any) => {
        totalPotentialFields++;
        if (item.duration && !isDateInFuture(item.duration)) actualErrors++;
      });
    }
    totalPotentialFields++; // ispayingzwischenkredit
    if (main.ispayingzwischenkredit === null) actualErrors++;
    if (main.ispayingzwischenkredit === true) {
      const zwischenRows = (main.zwischenkredit && main.zwischenkredit.length > 0) ? main.zwischenkredit : [{ duration: '', amount: '' }];
      const { total, errors } = countArrayFields(zwischenRows, ['duration', 'amount']);
      totalPotentialFields += total;
      actualErrors += errors;
      zwischenRows.forEach((item: any) => {
        totalPotentialFields++;
        if (item.duration && !isDateInFuture(item.duration)) actualErrors++;
      });
    }
    totalPotentialFields++; // ispayingunterhalt
    if (main.ispayingunterhalt === null) actualErrors++;
    if (main.ispayingunterhalt === true && main.unterhaltszahlungenTotal) {
      const unterhaltRows = main.unterhaltszahlungenTotal;
      const { total, errors } = countArrayFields(unterhaltRows, ['duration', 'amountTotal']);
      totalPotentialFields += total;
      actualErrors += errors;
      unterhaltRows.forEach((item: any) => {
        totalPotentialFields++;
        if (item.duration && !isDateInFuture(item.duration)) actualErrors++;
      });
    }
    totalPotentialFields++; // hasotherzahlungsverpflichtung
    if (main.hasotherzahlungsverpflichtung === null) actualErrors++;
    if (main.hasotherzahlungsverpflichtung === true && main.otherzahlungsverpflichtung) {
      const otherRows = main.otherzahlungsverpflichtung;
      const { total, errors } = countArrayFields(otherRows, ['type', 'duration', 'amount']);
      totalPotentialFields += total;
      actualErrors += errors;
      otherRows.forEach((item: any) => {
        totalPotentialFields++;
        if (item.duration && !isDateInFuture(item.duration)) actualErrors++;
      });
    }
    totalPotentialFields++; // hasBausparvertraege
    if (main.hasBausparvertraege === null) actualErrors++;
    if (main.hasBausparvertraege === true) {
      totalPotentialFields += 2;
      if (!main.institutbausparvertraege) actualErrors++;
      if (!main.sparratebausparvertraege) actualErrors++;
    }
    totalPotentialFields++; // hasRentenversicherung
    if (main.hasRentenversicherung === null) actualErrors++;
    if (main.hasRentenversicherung === true) {
      totalPotentialFields += 2;
      if (!main.institutkapitalrentenversicherung) actualErrors++;
      if (!main.praemiekapitalrentenversicherung) actualErrors++;
    }
    // Section 4: Weitere Angaben (no required fields)

    // --- Additional Applicants ---
    additionalApplicants.forEach((applicant) => {
      // Section 1: Nettoeinkommen
      totalPotentialFields++;
      if (applicant.hasSalaryIncome === null) actualErrors++;
      if (applicant.hasSalaryIncome === true) {
        totalPotentialFields += 3;
        if (!applicant.monthlynetsalary) actualErrors++;
        if (!applicant.wheinachtsgeld_next12) actualErrors++;
        if (!applicant.urlaubsgeld_next12) actualErrors++;
        if (applicant.otheremploymentmonthlynetincome && Array.isArray(applicant.otheremploymentmonthlynetincome)) {
          const { total, errors } = countArrayFields(applicant.otheremploymentmonthlynetincome, ['type', 'amount']);
          totalPotentialFields += total;
          actualErrors += errors;
        }
      }
      if (applicant.weitereEinkuenfte?.selectedTypes?.includes('gewerbe')) {
        totalPotentialFields += 2;
        if (!applicant.yearlybusinessnetincome && !applicant.yearlyselfemployednetincome) actualErrors++;
        if (!applicant.yearlybusinessnetincome) actualErrors++;
        if (!applicant.yearlyselfemployednetincome) actualErrors++;
      }
      if (applicant.weitereEinkuenfte?.selectedTypes?.includes('landforst')) {
        totalPotentialFields++;
        if (!applicant.incomeagriculture) actualErrors++;
      }
      if (applicant.weitereEinkuenfte?.selectedTypes?.includes('kapital')) {
        totalPotentialFields++;
        if (!applicant.yearlycapitalnetincome) actualErrors++;
      }
      if (applicant.weitereEinkuenfte?.selectedTypes?.includes('vermietung')) {
        totalPotentialFields++;
        if (!applicant.incomerent) actualErrors++;
      }
      // Section 2: Bezüge und Weitere Einkünfte
      totalPotentialFields++;
      if (applicant.haspensionincome === null) actualErrors++;
      if (applicant.haspensionincome === true) {
        const pensionRows = (applicant.pensionmonthlynetincome && applicant.pensionmonthlynetincome.length > 0)
          ? applicant.pensionmonthlynetincome : [{ type: '', amount: '' }];
        const { total, errors } = countArrayFields(pensionRows, ['type', 'amount']);
        totalPotentialFields += total;
        actualErrors += errors;
      }
      if (applicant.weitereEinkuenfte2?.selectedTypes?.includes('kindergeld')) {
        totalPotentialFields++;
        if (!applicant.monthlykindergeldnetincome) actualErrors++;
      }
      if (applicant.weitereEinkuenfte2?.selectedTypes?.includes('pflegegeld')) {
        totalPotentialFields++;
        if (!applicant.monthlypflegegeldnetincome) actualErrors++;
      }
      if (applicant.weitereEinkuenfte2?.selectedTypes?.includes('unterhaltsteuerfrei')) {
        totalPotentialFields++;
        if (!applicant.incomeunterhalttaxfree) actualErrors++;
      }
      if (applicant.weitereEinkuenfte2?.selectedTypes?.includes('unterhaltsteuerpflichtig')) {
        totalPotentialFields++;
        if (!applicant.incomeunterhalttaxable) actualErrors++;
      }
      if (applicant.weitereEinkuenfte2?.selectedTypes?.includes('elterngeld')) {
        totalPotentialFields++;
        if (!applicant.monthlyelterngeldnetincome) actualErrors++;
      }
      if (applicant.weitereEinkuenfte2?.selectedTypes?.includes('sonstiges')) {
        const otherIncome = applicant.othermonthlynetincome || [];
        const itemsToValidate = otherIncome.length > 0 ? otherIncome : [{ type: '', amount: '' }];
        const { total, errors } = countArrayFields(itemsToValidate, ['type', 'amount']);
        totalPotentialFields += total;
        actualErrors += errors;
      }
      // Section 3: Monatliche Belastungen
      if (applicant.betragotherinsurancetaxexpenses && Array.isArray(applicant.betragotherinsurancetaxexpenses)) {
        const { total, errors } = countArrayFields(applicant.betragotherinsurancetaxexpenses, ['type', 'amount']);
        totalPotentialFields += total;
        actualErrors += errors;
      }
      totalPotentialFields++;
      if (applicant.ispayingloans === null) actualErrors++;
      if (applicant.ispayingloans === true) {
        const loanRows = (applicant.loans && applicant.loans.length > 0) ? applicant.loans : [{ description: '', duration: '', amount: '' }];
        const { total, errors } = countArrayFields(loanRows, ['description', 'duration', 'amount']);
        totalPotentialFields += total;
        actualErrors += errors;
        loanRows.forEach((item: any) => {
          totalPotentialFields++;
          if (item.duration && !isDateInFuture(item.duration)) actualErrors++;
        });
      }
      totalPotentialFields++;
      if (applicant.ispayingzwischenkredit === null) actualErrors++;
      if (applicant.ispayingzwischenkredit === true) {
        const zwischenRows = (applicant.zwischenkredit && applicant.zwischenkredit.length > 0) ? applicant.zwischenkredit : [{ duration: '', amount: '' }];
        const { total, errors } = countArrayFields(zwischenRows, ['duration', 'amount']);
        totalPotentialFields += total;
        actualErrors += errors;
        zwischenRows.forEach((item: any) => {
          totalPotentialFields++;
          if (item.duration && !isDateInFuture(item.duration)) actualErrors++;
        });
      }
      totalPotentialFields++;
      if (applicant.ispayingunterhalt === null) actualErrors++;
      if (applicant.ispayingunterhalt === true && applicant.unterhaltszahlungenTotal) {
        const unterhaltRows = applicant.unterhaltszahlungenTotal;
        const { total, errors } = countArrayFields(unterhaltRows, ['duration', 'amountTotal']);
        totalPotentialFields += total;
        actualErrors += errors;
        unterhaltRows.forEach((item: any) => {
          totalPotentialFields++;
          if (item.duration && !isDateInFuture(item.duration)) actualErrors++;
        });
      }
      totalPotentialFields++;
      if (applicant.hasotherzahlungsverpflichtung === null) actualErrors++;
      if (applicant.hasotherzahlungsverpflichtung === true && applicant.otherzahlungsverpflichtung) {
        const otherRows = applicant.otherzahlungsverpflichtung;
        const { total, errors } = countArrayFields(otherRows, ['type', 'duration', 'amount']);
        totalPotentialFields += total;
        actualErrors += errors;
        otherRows.forEach((item: any) => {
          totalPotentialFields++;
          if (item.duration && !isDateInFuture(item.duration)) actualErrors++;
        });
      }
      totalPotentialFields++;
      if (applicant.hasBausparvertraege === null) actualErrors++;
      if (applicant.hasBausparvertraege === true) {
        totalPotentialFields += 2;
        if (!applicant.institutbausparvertraege) actualErrors++;
        if (!applicant.sparratebausparvertraege) actualErrors++;
      }
      totalPotentialFields++;
      if (applicant.hasRentenversicherung === null) actualErrors++;
      if (applicant.hasRentenversicherung === true) {
        totalPotentialFields += 2;
        if (!applicant.institutkapitalrentenversicherung) actualErrors++;
        if (!applicant.praemiekapitalrentenversicherung) actualErrors++;
      }
      // Section 4: Weitere Angaben (no required fields)
    });

    const selbstauskunftProgress = totalPotentialFields > 0
      ? Math.round(((totalPotentialFields - actualErrors) / totalPotentialFields) * 100)
      : 100;

    console.log('Selbstauskunft Progress calculation completed:', selbstauskunftProgress);
    return selbstauskunftProgress;
  };

  // Search logic (aligned with EK pattern)
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
    setPendingSection(section);
    setShowSearchModal(false);
  };

  // Pass expandSection to SelbstauskunftForm
  const [expandSectionKey, setExpandSectionKey] = useState<string | null>(null);
  useEffect(() => {
    if (pendingSection) {
      setExpandSectionKey(pendingSection);
      setPendingSection(null);
    }
  }, [pendingSection]);

  // Handle toggle validation (aligned with EK pattern)
  const handleToggleValidation = async () => {
    const newShowValidation = !showValidation;
    setShowValidation(newShowValidation);
    
    if (user?.id) {
      try {
        const { error } = await supabase
          .from('user_data')
          .update({ 
            should_show_error_selbstauskunft: newShowValidation,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (error) {
          console.error('Error updating shouldShowErrorSelbstauskunft:', error);
          setShowValidation(!newShowValidation);
        }
      } catch (error) {
        console.error('Error in handleToggleValidation:', error);
        setShowValidation(!newShowValidation);
      }
    }
  };

  const calculateApplicantIncome = (applicant: MainFinancials | AdditionalApplicantFinancials) => {
    let total = 0;

    // Salary-related income only if hasSalaryIncome is true
    if (applicant.hasSalaryIncome) {
      // Monthly net salary
      const salary = applicant.monthlynetsalary || '';
      total += parseFloat(salary.replace(/\./g, '').replace(',', '.')) || 0;

      // Christmas bonus (divided by 12 for monthly)
      const christmasBonus = applicant.wheinachtsgeld_next12 || '';
      total += (parseFloat(christmasBonus.replace(/\./g, '').replace(',', '.')) || 0) / 12;

      // Vacation bonus (divided by 12 for monthly)
      const vacationBonus = applicant.urlaubsgeld_next12 || '';
      total += (parseFloat(vacationBonus.replace(/\./g, '').replace(',', '.')) || 0) / 12;

      // Other employment monthly net income (each euro value divided by 12)
      if (applicant.otheremploymentmonthlynetincome && Array.isArray(applicant.otheremploymentmonthlynetincome)) {
        applicant.otheremploymentmonthlynetincome.forEach((income: any) => {
          if (income.amount) {
            total += (parseFloat(income.amount.toString().replace(/\./g, '').replace(',', '.')) || 0) / 12;
          }
        });
      }
    }

    // Agriculture income (divided by 12 for monthly)
    if (applicant.hasagricultureincome) {
      const agricultureIncome = applicant.incomeagriculture || '';
      total += (parseFloat(agricultureIncome.replace(/\./g, '').replace(',', '.')) || 0) / 12;
    }

    // Rent income (divided by 12 for monthly)
    if (applicant.hasrentincome) {
      const rentIncome = applicant.incomerent || '';
      total += (parseFloat(rentIncome.replace(/\./g, '').replace(',', '.')) || 0) / 12;
    }
    
    // Yearly capital net income (divided by 12 for monthly)
    if (applicant.hascapitalincome) {
      const capitalIncome = applicant.yearlycapitalnetincome || '';
      total += (parseFloat(capitalIncome.replace(/\./g, '').replace(',', '.')) || 0) / 12;
    }

    // Yearly business net income (divided by 12 for monthly)
    if (applicant.hasbusinessincome) {
      const businessIncome = applicant.yearlybusinessnetincome || '';
      total += (parseFloat(businessIncome.replace(/\./g, '').replace(',', '.')) || 0) / 12;
    // Yearly self-employed net income (divided by 12 for monthly)
      const selfEmployedIncome = applicant.yearlyselfemployednetincome || '';
      total += (parseFloat(selfEmployedIncome.replace(/\./g, '').replace(',', '.')) || 0) / 12;
    }

    // Pension monthly net income (each euro value)
    if (applicant.haspensionincome) {
      if (applicant.pensionmonthlynetincome && Array.isArray(applicant.pensionmonthlynetincome)) {
        applicant.pensionmonthlynetincome.forEach((pension: any) => {
          if (pension.amount) {
            total += parseFloat(pension.amount.toString().replace(/\./g, '').replace(',', '.')) || 0;
          }
        });
      }
    }

    // Tax-free maintenance income
    if (applicant.hastaxfreeunterhaltincome) {
      const taxFreeMaintenance = applicant.incomeunterhalttaxfree || '';
      total += parseFloat(taxFreeMaintenance.replace(/\./g, '').replace(',', '.')) || 0;
    }

    // Taxable maintenance income
    if (applicant.hastaxableunterhaltincome) {
      const taxableMaintenance = applicant.incomeunterhalttaxable || '';
      total += parseFloat(taxableMaintenance.replace(/\./g, '').replace(',', '.')) || 0;
    }

    // Monthly child benefit net income
    if (applicant.haskindergeldincome) {
      const childBenefit = applicant.monthlykindergeldnetincome || '';
      total += parseFloat(childBenefit.replace(/\./g, '').replace(',', '.')) || 0;
    }

    // Monthly care benefit net income
    if (applicant.haspflegegeldincome) {
      const careBenefit = applicant.monthlypflegegeldnetincome || '';
      total += parseFloat(careBenefit.replace(/\./g, '').replace(',', '.')) || 0;
    }

    // Monthly parental benefit net income
    if (applicant.haselterngeldincome) {
      const parentalBenefit = applicant.monthlyelterngeldnetincome || '';
      total += parseFloat(parentalBenefit.replace(/\./g, '').replace(',', '.')) || 0;
    }

    // Other monthly net income (each euro value)
    if (applicant.hasothernetincome) {
      if (applicant.othermonthlynetincome && Array.isArray(applicant.othermonthlynetincome)) {
        applicant.othermonthlynetincome.forEach((income: any) => {
          if (income.amount) {
            total += parseFloat(income.amount.toString().replace(/\./g, '').replace(',', '.')) || 0;
          }
        });
      }
    }

    return total;
  };

  const calculateApplicantExpenses = (applicant: MainFinancials | AdditionalApplicantFinancials) => {
    let total = 0;

    // Other insurance and tax expenses (each euro value)
    if (applicant.betragotherinsurancetaxexpenses && Array.isArray(applicant.betragotherinsurancetaxexpenses)) {
      applicant.betragotherinsurancetaxexpenses.forEach((expense: any) => {
        if (expense.amount) {
          total += parseFloat(expense.amount.toString().replace(/\./g, '').replace(',', '.')) || 0;
        }
      });
    }

    // Loans (each euro value)
    if (applicant.loans && Array.isArray(applicant.loans)) {
      applicant.loans.forEach((loan: any) => {
        if (loan.amount) {
          total += parseFloat(loan.amount.toString().replace(/\./g, '').replace(',', '.')) || 0;
        }
      });
    }

    // Bridge loan
    if (applicant.zwischenkredit && Array.isArray(applicant.zwischenkredit)) {
      applicant.zwischenkredit.forEach((credit: any) => {
        if (credit.amount) {
          total += parseFloat(credit.amount.toString().replace(/\./g, '').replace(',', '.')) || 0;
        }
      });
    }

    // Maintenance payments total
    if (applicant.unterhaltszahlungenTotal && Array.isArray(applicant.unterhaltszahlungenTotal)) {
      applicant.unterhaltszahlungenTotal.forEach((payment: any) => {
        if (payment.amountTotal) {
          total += parseFloat(payment.amountTotal.toString().replace(/\./g, '').replace(',', '.')) || 0;
        }
      });
    }

    // Other payment obligations (each euro value)
    if (applicant.otherzahlungsverpflichtung && Array.isArray(applicant.otherzahlungsverpflichtung)) {
      applicant.otherzahlungsverpflichtung.forEach((obligation: any) => {
        if (obligation.amount) {
          total += parseFloat(obligation.amount.toString().replace(/\./g, '').replace(',', '.')) || 0;
        }
      });
    }

    // Building society savings rate
    if (applicant.hasBausparvertraege) {
      const buildingSocietyRate = applicant.sparratebausparvertraege || '';
      total += parseFloat(buildingSocietyRate.replace(/\./g, '').replace(',', '.')) || 0;
    }

    // Capital pension insurance premium
    if (applicant.hasRentenversicherung) {
      const capitalPensionPremium = applicant.praemiekapitalrentenversicherung || '';
      total += parseFloat(capitalPensionPremium.replace(/\./g, '').replace(',', '.')) || 0;
    }

    return total;
  };

  // Section refs for smooth scroll
  const sectionRefs = React.useMemo(() => {
    const refs: Record<string, React.RefObject<HTMLDivElement>> = {};
    selbstauskunftSectionKeys.forEach(key => {
      refs[key] = React.createRef<HTMLDivElement>();
    });
    return refs;
  }, [selectedIndex]);

  // Smooth scroll to section when pendingSection changes
  useEffect(() => {
    if (pendingSection) {
      setExpandSectionKey(pendingSection);
      setTimeout(() => {
        const ref = sectionRefs[pendingSection];
        if (ref && ref.current) {
          ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        setPendingSection(null);
      }, 100); // Wait for expand
    }
  }, [pendingSection, sectionRefs]);

  return (
    <div className="selbstauskunft-container">
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
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: 'rgba(255,255,255,0.9)', zIndex: 9999 }}>
          <Spinner animation="border" role="status" style={{ width: '3rem', height: '3rem', color: '#064497' }}>
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      )}
      {/* Header ellipse */}
      <div className="blue-corner">
        <span className="blue-corner-text">SELBSTAUSKUNFT</span>
      </div>
      {/* Top Bar */}
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
            className={`p-3${hasUnsavedChanges ? ' fw-medium' : ''}`}
            onClick={() => saveData()}
            style={{ color: hasUnsavedChanges ? '#064497' : '#6c757d', textDecoration: 'none', fontSize: '0.9rem' }}
          >
            Speichern
          </Button>
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
            <label htmlFor="validation-toggle" className="text-black mb-0 fw-medium" style={{ fontSize: '0.9rem', userSelect: 'none'}}>Fehler anzeigen</label>
          </div>
        </div>
      </div>
      <Container className="pt-44">
        {/* Applicant Buttons */}
        <div style={{ height: '120px', display: 'flex', alignItems: 'center' }}>
          <div className="person-scroll-outer mb-8">
            <div className="scroll-container" style={{ minHeight: '80px' }}>
              {/* Main applicant button */}
              <div className="d-flex align-items-center gap-3 flex-shrink-0">
                <Button
                  variant={selectedIndex === 0 ? 'primary' : 'outline-primary'}
                  className="rounded-pill px-4 py-2 flex-shrink-0"
                  style={{ backgroundColor: selectedIndex === 0 ? '#064497' : '#D7DAEA', border: 'none', color: selectedIndex === 0 ? 'white' : 'black', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', minWidth: '200px' }}
                  onClick={() => setSelectedIndex(0)}
                >
                  Antragstellende Person 1
                </Button>
              </div>
              {/* Additional applicant buttons */}
              {additionalApplicants.map((a, idx) => (
                <div key={a.id} className="d-flex align-items-center gap-3 flex-shrink-0">
                  <Button
                    variant={selectedIndex === idx + 1 ? 'primary' : 'outline-primary'}
                    className="rounded-pill px-4 py-2 flex-shrink-0"
                    style={{ backgroundColor: selectedIndex === idx + 1 ? '#064497' : '#D7DAEA', border: 'none', color: selectedIndex === idx + 1 ? 'white' : 'black', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', minWidth: '200px' }}
                    onClick={() => setSelectedIndex(idx + 1)}
                  >
                    Antragstellende Person {idx + 2}
                  </Button>
                  <Button variant="link" className="text-danger p-0 flex-shrink-0" onClick={() => handleRemoveApplicant(idx + 1)} style={{ minWidth: 'auto', boxShadow: 'none' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 18L18 6M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </Button>
                </div>
              ))}
              <Button variant="outline-primary" onClick={handleAddApplicant} className="rounded-pill px-4 py-2 flex-shrink-0" style={{ backgroundColor: 'white', border: 'none', color: '#064497', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', minWidth: '200px' }}>Person Hinzufügen +</Button>
            </div>
          </div>
        </div>
        {/* Applicant Form (selected) */}
        <div id={`applicant-${selectedIndex}`}>
          <SelbstauskunftForm
            data={getCurrentApplicant()}
            onChange={data => handleApplicantChange(selectedIndex, data)}
            showValidation={showValidation}
            expandSectionKey={expandSectionKey}
            onSectionExpanded={() => setExpandSectionKey(null)}
            isReadOnly={false}
            sectionRefs={sectionRefs}
          />
        </div>
        {/* Sum Section (below all applicants) */}
        <div className="mt-5 p-4" style={{ borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', backgroundColor: '#f8f9fa', marginBottom: '100px' }}>
          <h4 style={{ marginBottom: '2rem', fontWeight: 'bold' }}>Zusammenfassung der Einkünfte und Belastungen</h4>
          
          {/* Income Summary */}
          <div className="mb-4">
            <h5 style={{ color: '#064497', marginBottom: '1rem', fontWeight: 400 }}>Einkünfte (1.1 - 2.2)</h5>
            
            {[mainFinancials, ...additionalApplicants].map((applicant, index) => {
              const applicantIncome = calculateApplicantIncome(applicant);
              return (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', marginBottom: '0.5rem', backgroundColor: 'white', border: '1px solid #dee2e6', borderLeft: '4px solid #064497', borderRadius: '5px' }}>
                  <span>{index === 0 ? 'Antragstellende Person 1' : `Antragstellende Person ${index + 1}`}:</span>
                  <span style={{ color: '#064497', fontWeight: 'bold' }}>
                    {applicantIncome.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
              );
            })}
            
            {additionalApplicants.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1rem', marginTop: '0.5rem', backgroundColor: '#064497', color: 'white', borderRadius: '5px', fontWeight: 'bold' }}>
                <span>Gesamtsumme Einkünfte:</span>
                <span>
                  {([mainFinancials, ...additionalApplicants].reduce((total, applicant) => 
                    total + calculateApplicantIncome(applicant), 0
                  )).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                </span>
              </div>
            )}
          </div>

          {/* Expenses Summary */}
          <div className="mb-4">
            <h5 style={{ color: '#dc3545', marginBottom: '1rem', fontWeight: 400 }}>Monatliche Belastungen (3.1 - 3.3)</h5>
            
            {[mainFinancials, ...additionalApplicants].map((applicant, index) => {
              const applicantExpenses = calculateApplicantExpenses(applicant);
              return (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', marginBottom: '0.5rem', backgroundColor: 'white', border: '1px solid #dee2e6', borderLeft: '4px solid #dc3545', borderRadius: '5px' }}>
                  <span>{index === 0 ? 'Antragstellende Person 1' : `Antragstellende Person ${index + 1}`}:</span>
                  <span style={{ color: '#dc3545', fontWeight: 'bold' }}>
                    {applicantExpenses.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
              );
            })}
            
            {additionalApplicants.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1rem', marginTop: '0.5rem', backgroundColor: '#dc3545', color: 'white', borderRadius: '5px', fontWeight: 'bold' }}>
                <span>Gesamtsumme Belastungen:</span>
                <span>
                  {([mainFinancials, ...additionalApplicants].reduce((total, applicant) => 
                    total + calculateApplicantExpenses(applicant), 0
                  )).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                </span>
              </div>
            )}
          </div>

          {/* Net Income Summary */}
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #dee2e6', textAlign: 'right' }}>
            <div style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Verfügbares Einkommen:</div>
            <div style={{ color: '#000000', fontWeight: 'bold', fontSize: '1.75rem' }}>
              {(() => {
                const totalIncome = [mainFinancials, ...additionalApplicants].reduce((total, applicant) => total + calculateApplicantIncome(applicant), 0);
                const totalExpenses = [mainFinancials, ...additionalApplicants].reduce((total, applicant) => total + calculateApplicantExpenses(applicant), 0);
                return (totalIncome - totalExpenses).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
              })()}
            </div>
          </div>
        </div>
        {/* Bottom Buttons */}
        <div className="d-flex flex-column align-items-center mt-6 gap-3">
          <Button variant="primary" onClick={validateForm} disabled={isLoading} style={{ backgroundColor: '#064497', border: 'none', padding: '0.75rem 2rem', minWidth: '120px' }}>
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
                    <h5 className="mb-0">{sectionTitleMap[result.section]}</h5>
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
                        const applicantIndex = parseInt(applicant.split(' ')[2]) - 1;
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
                            <h6 className="text-danger mb-0">{sectionTitleMap[section as keyof typeof sectionTitleMap]}:</h6>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => {
                                setShowValidationModal(false);
                                const applicantIndex = parseInt(applicant.split(' ')[2]) - 1;
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
              onClick={() => { setShowSuccessModal(false); saveData(true); }}
              style={{ backgroundColor: '#064497', border: 'none', minWidth: 260 }}
            >
              Speichern und zum persönlichen Bereich
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default SelbstauskunftContainer; 