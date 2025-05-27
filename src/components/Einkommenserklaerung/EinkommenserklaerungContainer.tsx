import React, { useState, useEffect } from 'react';
import { Container, Button, Modal, Spinner, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatCurrencyForDisplay, formatCurrencyForDatabase } from '../../utils/currencyUtils';
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

interface AdditionalApplicantFinancials {
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
  // New fields
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
  // New fields
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

const EinkommenserklaerungContainer: React.FC = () => {
  const initialAdditionalIncomeChanges: AdditionalIncomeChange = {
    selectedTypes: [],
    changes: {},
  };

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
  const [showModal, setShowModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ApplicantErrors>({});
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hasValidatedOnce, setHasValidatedOnce] = useState(false);
  const [sonderzuwendungenFieldErrors, setSonderzuwendungenFieldErrors] = useState<Record<number, any>>({
    0: {vergangen: {}, kommend: {}} // Main applicant
  });
  const [pendingSection, setPendingSection] = useState<string | null>(null);

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
      if (!user?.id) return;

      setIsLoading(true);
      try {
        // Load user data
        const { data: userData, error: userError } = await supabase
          .from('user_data')
          .select('*')
          .eq('id', user.id)
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
          .eq('user_id', user.id)
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
          // Add new fields
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
          // First, get the personal data from user_data
          const additionalApplicantsData = userData.weitere_antragstellende_personen.map((person: any) => ({
            title: person.title || '',
            firstName: person.firstName || '',
            lastName: person.lastName || '',
            street: person.street || '',
            houseNumber: person.houseNumber || '',
            postalCode: person.postalCode || '',
            city: person.city || ''
          }));

          // Get additional applicants financial data from user_financials
          const additionalFinancials = financialData?.additional_applicants_financials || [];

          // Merge personal and financial data
          const mergedApplicants = additionalApplicantsData.map((applicant: AdditionalApplicantFinancials, index: number) => {
            const financialData = additionalFinancials?.[index];
            if (!financialData) return applicant;

            return {
              ...applicant,
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
            };
          });

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
  }, [user?.id]);

  // Save data to Supabase
  const saveData = async (navigateAfterSave: boolean = false) => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found');
        return;
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

      // Update user_data with personal information
      const { error: userError } = await supabase
        .from('user_data')
        .update({
          // Main applicant data
          title: mainFinancials.title || null,
          firstname: mainFinancials.firstName || null,
          lastname: mainFinancials.lastName || null,
          person_street: mainFinancials.street || null,
          person_housenumber: mainFinancials.houseNumber || null,
          person_postalcode: mainFinancials.postalCode || null,
          person_city: mainFinancials.city || null,
          einkommenserklarung_progress: einkommenserklarungProgress,
          
          // Additional applicants data - preserve existing data and only update address fields
          weitere_antragstellende_personen: additionalApplicants.map((applicant, index) => {
            // Get existing person data if available
            const existingPerson = existingUserData?.weitere_antragstellende_personen?.[index] || {};
            
            return {
              ...existingPerson, // Preserve all existing fields
              title: applicant.title || existingPerson.title || null,
              firstName: applicant.firstName || existingPerson.firstName || null,
              lastName: applicant.lastName || existingPerson.lastName || null,
              street: applicant.street || existingPerson.street || null,
              houseNumber: applicant.houseNumber || existingPerson.houseNumber || null,
              postalCode: applicant.postalCode || existingPerson.postalCode || null,
              city: applicant.city || existingPerson.city || null,
              finanzamt: applicant.finanzamt || existingPerson.finanzamt || null,
              steuerid: applicant.steuerid || existingPerson.steuerid || null,
            };
          })
        })
        .eq('id', user.id);

      if (userError) throw userError;

      // Save main applicant data and additional applicants financial data
      const { error: mainError } = await supabase
        .from('user_financials')
        .upsert({
          user_id: user.id,
          isEarningRegularIncome: mainFinancials.hasEmploymentIncome,
          prior_year: mainFinancials.incomeYear,
          prior_year_earning: mainFinancials.incomeYearAmount ? formatCurrencyForDatabase(mainFinancials.incomeYearAmount) : null,
          end_month_past12: mainFinancials.incomeEndMonth,
          end_year_past12: mainFinancials.incomeEndYear,
          income_month1: (() => {
            const month = (parseInt(mainFinancials.incomeEndMonth) - 11 + 12) % 12;
            const year = parseInt(mainFinancials.incomeEndYear) - (parseInt(mainFinancials.incomeEndMonth) < 11 ? 1 : 0);
            return mainFinancials.monthlyIncome?.[`${year}-${month}`] ? formatCurrencyForDatabase(mainFinancials.monthlyIncome[`${year}-${month}`]) : null;
          })(),
          income_month2: (() => {
            const month = (parseInt(mainFinancials.incomeEndMonth) - 10 + 12) % 12;
            const year = parseInt(mainFinancials.incomeEndYear) - (parseInt(mainFinancials.incomeEndMonth) < 10 ? 1 : 0);
            return mainFinancials.monthlyIncome?.[`${year}-${month}`] ? formatCurrencyForDatabase(mainFinancials.monthlyIncome[`${year}-${month}`]) : null;
          })(),
          income_month3: (() => {
            const month = (parseInt(mainFinancials.incomeEndMonth) - 9 + 12) % 12;
            const year = parseInt(mainFinancials.incomeEndYear) - (parseInt(mainFinancials.incomeEndMonth) < 9 ? 1 : 0);
            return mainFinancials.monthlyIncome?.[`${year}-${month}`] ? formatCurrencyForDatabase(mainFinancials.monthlyIncome[`${year}-${month}`]) : null;
          })(),
          income_month4: (() => {
            const month = (parseInt(mainFinancials.incomeEndMonth) - 8 + 12) % 12;
            const year = parseInt(mainFinancials.incomeEndYear) - (parseInt(mainFinancials.incomeEndMonth) < 8 ? 1 : 0);
            return mainFinancials.monthlyIncome?.[`${year}-${month}`] ? formatCurrencyForDatabase(mainFinancials.monthlyIncome[`${year}-${month}`]) : null;
          })(),
          income_month5: (() => {
            const month = (parseInt(mainFinancials.incomeEndMonth) - 7 + 12) % 12;
            const year = parseInt(mainFinancials.incomeEndYear) - (parseInt(mainFinancials.incomeEndMonth) < 7 ? 1 : 0);
            return mainFinancials.monthlyIncome?.[`${year}-${month}`] ? formatCurrencyForDatabase(mainFinancials.monthlyIncome[`${year}-${month}`]) : null;
          })(),
          income_month6: (() => {
            const month = (parseInt(mainFinancials.incomeEndMonth) - 6 + 12) % 12;
            const year = parseInt(mainFinancials.incomeEndYear) - (parseInt(mainFinancials.incomeEndMonth) < 6 ? 1 : 0);
            return mainFinancials.monthlyIncome?.[`${year}-${month}`] ? formatCurrencyForDatabase(mainFinancials.monthlyIncome[`${year}-${month}`]) : null;
          })(),
          income_month7: (() => {
            const month = (parseInt(mainFinancials.incomeEndMonth) - 5 + 12) % 12;
            const year = parseInt(mainFinancials.incomeEndYear) - (parseInt(mainFinancials.incomeEndMonth) < 5 ? 1 : 0);
            return mainFinancials.monthlyIncome?.[`${year}-${month}`] ? formatCurrencyForDatabase(mainFinancials.monthlyIncome[`${year}-${month}`]) : null;
          })(),
          income_month8: (() => {
            const month = (parseInt(mainFinancials.incomeEndMonth) - 4 + 12) % 12;
            const year = parseInt(mainFinancials.incomeEndYear) - (parseInt(mainFinancials.incomeEndMonth) < 4 ? 1 : 0);
            return mainFinancials.monthlyIncome?.[`${year}-${month}`] ? formatCurrencyForDatabase(mainFinancials.monthlyIncome[`${year}-${month}`]) : null;
          })(),
          income_month9: (() => {
            const month = (parseInt(mainFinancials.incomeEndMonth) - 3 + 12) % 12;
            const year = parseInt(mainFinancials.incomeEndYear) - (parseInt(mainFinancials.incomeEndMonth) < 3 ? 1 : 0);
            return mainFinancials.monthlyIncome?.[`${year}-${month}`] ? formatCurrencyForDatabase(mainFinancials.monthlyIncome[`${year}-${month}`]) : null;
          })(),
          income_month10: (() => {
            const month = (parseInt(mainFinancials.incomeEndMonth) - 2 + 12) % 12;
            const year = parseInt(mainFinancials.incomeEndYear) - (parseInt(mainFinancials.incomeEndMonth) < 2 ? 1 : 0);
            return mainFinancials.monthlyIncome?.[`${year}-${month}`] ? formatCurrencyForDatabase(mainFinancials.monthlyIncome[`${year}-${month}`]) : null;
          })(),
          income_month11: (() => {
            const month = (parseInt(mainFinancials.incomeEndMonth) - 1 + 12) % 12;
            const year = parseInt(mainFinancials.incomeEndYear) - (parseInt(mainFinancials.incomeEndMonth) < 1 ? 1 : 0);
            return mainFinancials.monthlyIncome?.[`${year}-${month}`] ? formatCurrencyForDatabase(mainFinancials.monthlyIncome[`${year}-${month}`]) : null;
          })(),
          income_month12: (() => {
            const month = parseInt(mainFinancials.incomeEndMonth);
            const year = parseInt(mainFinancials.incomeEndYear);
            return mainFinancials.monthlyIncome?.[`${year}-${month}`] ? formatCurrencyForDatabase(mainFinancials.monthlyIncome[`${year}-${month}`]) : null;
          })(),
          wheinachtsgeld_last12: mainFinancials.sonderzuwendungenVergangen?.weihnachtsgeld ? formatCurrencyForDatabase(mainFinancials.sonderzuwendungenVergangen.weihnachtsgeld) : null,
          wheinachtsgeld_next12: mainFinancials.sonderzuwendungenKommend?.weihnachtsgeld ? formatCurrencyForDatabase(mainFinancials.sonderzuwendungenKommend.weihnachtsgeld) : null,
          urlaubsgeld_last12: mainFinancials.sonderzuwendungenVergangen?.urlaubsgeld ? formatCurrencyForDatabase(mainFinancials.sonderzuwendungenVergangen.urlaubsgeld) : null,
          urlaubsgeld_next12: mainFinancials.sonderzuwendungenKommend?.urlaubsgeld ? formatCurrencyForDatabase(mainFinancials.sonderzuwendungenKommend.urlaubsgeld) : null,
          otherincome_last12: mainFinancials.sonderzuwendungenVergangen?.sonstige ? formatCurrencyForDatabase(mainFinancials.sonderzuwendungenVergangen.sonstige) : null,
          otherincome_next12: mainFinancials.sonderzuwendungenKommend?.sonstige ? formatCurrencyForDatabase(mainFinancials.sonderzuwendungenKommend.sonstige) : null,
          willchangeincome: mainFinancials.willChangeIncome,
          incomechangedate: mainFinancials.incomeChangeDate || null,
          willchangeincrease: mainFinancials.willChangeIncrease,
          newincome: mainFinancials.newIncome ? formatCurrencyForDatabase(mainFinancials.newIncome) : null,
          isnewincomemonthly: mainFinancials.isNewIncomeMonthly,
          newincomereason: mainFinancials.newIncomeReason || null,
          startemployment: mainFinancials.startEmployment || null,
          iscontractlimited: mainFinancials.isContractLimited,
          endofcontract: mainFinancials.endOfContract || null,
          haspensionincome: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('renten') || false,
          incomepension: mainFinancials.weitereEinkuenfte?.renten?.betrag ? formatCurrencyForDatabase(mainFinancials.weitereEinkuenfte.renten.betrag) : null,
          hasrentincome: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('vermietung') || false,
          incomerent: mainFinancials.weitereEinkuenfte?.vermietung?.betrag ? formatCurrencyForDatabase(mainFinancials.weitereEinkuenfte.vermietung.betrag) : null,
          incomerentyear: mainFinancials.weitereEinkuenfte?.vermietung?.jahr || null,
          hasbusinessincome: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('gewerbe') || false,
          incomebusiness: mainFinancials.weitereEinkuenfte?.gewerbe?.betrag ? formatCurrencyForDatabase(mainFinancials.weitereEinkuenfte.gewerbe.betrag) : null,
          incomebusinessyear: mainFinancials.weitereEinkuenfte?.gewerbe?.jahr || null,
          hasagricultureincome: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('landforst') || false,
          incomeagriculture: mainFinancials.weitereEinkuenfte?.landforst?.betrag ? formatCurrencyForDatabase(mainFinancials.weitereEinkuenfte.landforst.betrag) : null,
          incomeagricultureyear: mainFinancials.weitereEinkuenfte?.landforst?.jahr || null,
          hasothercome: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('sonstige') || false,
          incomeothers: mainFinancials.weitereEinkuenfte?.sonstige?.betrag ? formatCurrencyForDatabase(mainFinancials.weitereEinkuenfte.sonstige.betrag) : null,
          incomeothersyear: mainFinancials.weitereEinkuenfte?.sonstige?.jahr || null,
          hastaxfreeunterhaltincome: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('unterhaltsteuerfrei') || false,
          incomeunterhalttaxfree: mainFinancials.weitereEinkuenfte?.unterhaltsteuerfrei?.betrag ? formatCurrencyForDatabase(mainFinancials.weitereEinkuenfte.unterhaltsteuerfrei.betrag) : null,
          hastaxableunterhaltincome: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('unterhaltsteuerpflichtig') || false,
          incomeunterhalttaxable: mainFinancials.weitereEinkuenfte?.unterhaltsteuerpflichtig?.betrag ? formatCurrencyForDatabase(mainFinancials.weitereEinkuenfte.unterhaltsteuerpflichtig.betrag) : null,
          hasforeignincome: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('ausland') || false,
          incomeforeign: mainFinancials.weitereEinkuenfte?.ausland?.betrag ? formatCurrencyForDatabase(mainFinancials.weitereEinkuenfte.ausland.betrag) : null,
          incomeforeignyear: mainFinancials.weitereEinkuenfte?.ausland?.turnus === 'jährlich' ? (mainFinancials.weitereEinkuenfte?.ausland?.jahr || null) : null,
          incomeforeignmonthly: mainFinancials.weitereEinkuenfte?.ausland?.turnus === 'monatlich' ? true : mainFinancials.weitereEinkuenfte?.ausland?.turnus === 'jährlich' ? false : null,
          haspauschalincome: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('pauschal') || false,
          incomepauschal: mainFinancials.weitereEinkuenfte?.pauschal?.betrag ? formatCurrencyForDatabase(mainFinancials.weitereEinkuenfte.pauschal.betrag) : null,
          hasablgincome: mainFinancials.weitereEinkuenfte?.selectedTypes?.includes('arbeitslosengeld') || false,
          incomeablg: mainFinancials.weitereEinkuenfte?.arbeitslosengeld?.betrag ? formatCurrencyForDatabase(mainFinancials.weitereEinkuenfte.arbeitslosengeld.betrag) : null,
          incomealbgtype: mainFinancials.weitereEinkuenfte?.arbeitslosengeld?.turnus === 'täglich' ? 0 : mainFinancials.weitereEinkuenfte?.arbeitslosengeld?.turnus === 'monatlich' ? 1 : mainFinancials.weitereEinkuenfte?.arbeitslosengeld?.turnus === 'jährlich' ? 2 : null,
          // Add new fields
          werbungskosten: mainFinancials.werbungskosten ? formatCurrencyForDatabase(mainFinancials.werbungskosten) : null,
          kinderbetreuungskosten: mainFinancials.kinderbetreuungskosten ? formatCurrencyForDatabase(mainFinancials.kinderbetreuungskosten) : null,
          ispayingincometax: mainFinancials.ispayingincometax,
          ispayinghealthinsurance: mainFinancials.ispayinghealthinsurance,
          ispayingpension: mainFinancials.ispayingpension,
          ispayingunterhalt: mainFinancials.ispayingunterhalt,
          unterhaltszahlungen: mainFinancials.unterhaltszahlungen || [],
          addition_change_inincome: mainFinancials.additionalIncomeChanges ? JSON.stringify(mainFinancials.additionalIncomeChanges) : null,
          finanzamt: mainFinancials.finanzamt || null,
          steuerid: mainFinancials.steuerid || null,
          // Add additional applicants financial data as JSONB
          additional_applicants_financials: additionalApplicants.map(applicant => ({
            isEarningRegularIncome: applicant.hasEmploymentIncome,
            prior_year: applicant.incomeYear,
            prior_year_earning: applicant.incomeYearAmount ? formatCurrencyForDatabase(applicant.incomeYearAmount) : null,
            end_month_past12: applicant.incomeEndMonth,
            end_year_past12: applicant.incomeEndYear,
            income_month1: (() => {
              const month = (parseInt(applicant.incomeEndMonth) - 11 + 12) % 12;
              const year = parseInt(applicant.incomeEndYear) - (parseInt(applicant.incomeEndMonth) < 11 ? 1 : 0);
              return applicant.monthlyIncome?.[`${year}-${month}`] ? formatCurrencyForDatabase(applicant.monthlyIncome[`${year}-${month}`]) : null;
            })(),
            income_month2: (() => {
              const month = (parseInt(applicant.incomeEndMonth) - 10 + 12) % 12;
              const year = parseInt(applicant.incomeEndYear) - (parseInt(applicant.incomeEndMonth) < 10 ? 1 : 0);
              return applicant.monthlyIncome?.[`${year}-${month}`] ? formatCurrencyForDatabase(applicant.monthlyIncome[`${year}-${month}`]) : null;
            })(),
            income_month3: (() => {
              const month = (parseInt(applicant.incomeEndMonth) - 9 + 12) % 12;
              const year = parseInt(applicant.incomeEndYear) - (parseInt(applicant.incomeEndMonth) < 9 ? 1 : 0);
              return applicant.monthlyIncome?.[`${year}-${month}`] ? formatCurrencyForDatabase(applicant.monthlyIncome[`${year}-${month}`]) : null;
            })(),
            income_month4: (() => {
              const month = (parseInt(applicant.incomeEndMonth) - 8 + 12) % 12;
              const year = parseInt(applicant.incomeEndYear) - (parseInt(applicant.incomeEndMonth) < 8 ? 1 : 0);
              return applicant.monthlyIncome?.[`${year}-${month}`] ? formatCurrencyForDatabase(applicant.monthlyIncome[`${year}-${month}`]) : null;
            })(),
            income_month5: (() => {
              const month = (parseInt(applicant.incomeEndMonth) - 7 + 12) % 12;
              const year = parseInt(applicant.incomeEndYear) - (parseInt(applicant.incomeEndMonth) < 7 ? 1 : 0);
              return applicant.monthlyIncome?.[`${year}-${month}`] ? formatCurrencyForDatabase(applicant.monthlyIncome[`${year}-${month}`]) : null;
            })(),
            income_month6: (() => {
              const month = (parseInt(applicant.incomeEndMonth) - 6 + 12) % 12;
              const year = parseInt(applicant.incomeEndYear) - (parseInt(applicant.incomeEndMonth) < 6 ? 1 : 0);
              return applicant.monthlyIncome?.[`${year}-${month}`] ? formatCurrencyForDatabase(applicant.monthlyIncome[`${year}-${month}`]) : null;
            })(),
            income_month7: (() => {
              const month = (parseInt(applicant.incomeEndMonth) - 5 + 12) % 12;
              const year = parseInt(applicant.incomeEndYear) - (parseInt(applicant.incomeEndMonth) < 5 ? 1 : 0);
              return applicant.monthlyIncome?.[`${year}-${month}`] ? formatCurrencyForDatabase(applicant.monthlyIncome[`${year}-${month}`]) : null;
            })(),
            income_month8: (() => {
              const month = (parseInt(applicant.incomeEndMonth) - 4 + 12) % 12;
              const year = parseInt(applicant.incomeEndYear) - (parseInt(applicant.incomeEndMonth) < 4 ? 1 : 0);
              return applicant.monthlyIncome?.[`${year}-${month}`] ? formatCurrencyForDatabase(applicant.monthlyIncome[`${year}-${month}`]) : null;
            })(),
            income_month9: (() => {
              const month = (parseInt(applicant.incomeEndMonth) - 3 + 12) % 12;
              const year = parseInt(applicant.incomeEndYear) - (parseInt(applicant.incomeEndMonth) < 3 ? 1 : 0);
              return applicant.monthlyIncome?.[`${year}-${month}`] ? formatCurrencyForDatabase(applicant.monthlyIncome[`${year}-${month}`]) : null;
            })(),
            income_month10: (() => {
              const month = (parseInt(applicant.incomeEndMonth) - 2 + 12) % 12;
              const year = parseInt(applicant.incomeEndYear) - (parseInt(applicant.incomeEndMonth) < 2 ? 1 : 0);
              return applicant.monthlyIncome?.[`${year}-${month}`] ? formatCurrencyForDatabase(applicant.monthlyIncome[`${year}-${month}`]) : null;
            })(),
            income_month11: (() => {
              const month = (parseInt(applicant.incomeEndMonth) - 1 + 12) % 12;
              const year = parseInt(applicant.incomeEndYear) - (parseInt(applicant.incomeEndMonth) < 1 ? 1 : 0);
              return applicant.monthlyIncome?.[`${year}-${month}`] ? formatCurrencyForDatabase(applicant.monthlyIncome[`${year}-${month}`]) : null;
            })(),
            income_month12: (() => {
              const month = parseInt(applicant.incomeEndMonth);
              const year = parseInt(applicant.incomeEndYear);
              return applicant.monthlyIncome?.[`${year}-${month}`] ? formatCurrencyForDatabase(applicant.monthlyIncome[`${year}-${month}`]) : null;
            })(),
            wheinachtsgeld_last12: applicant.sonderzuwendungenVergangen?.weihnachtsgeld ? formatCurrencyForDatabase(applicant.sonderzuwendungenVergangen.weihnachtsgeld) : null,
            wheinachtsgeld_next12: applicant.sonderzuwendungenKommend?.weihnachtsgeld ? formatCurrencyForDatabase(applicant.sonderzuwendungenKommend.weihnachtsgeld) : null,
            urlaubsgeld_last12: applicant.sonderzuwendungenVergangen?.urlaubsgeld ? formatCurrencyForDatabase(applicant.sonderzuwendungenVergangen.urlaubsgeld) : null,
            urlaubsgeld_next12: applicant.sonderzuwendungenKommend?.urlaubsgeld ? formatCurrencyForDatabase(applicant.sonderzuwendungenKommend.urlaubsgeld) : null,
            otherincome_last12: applicant.sonderzuwendungenVergangen?.sonstige ? formatCurrencyForDatabase(applicant.sonderzuwendungenVergangen.sonstige) : null,
            otherincome_next12: applicant.sonderzuwendungenKommend?.sonstige ? formatCurrencyForDatabase(applicant.sonderzuwendungenKommend.sonstige) : null,
            willchangeincome: applicant.willChangeIncome,
            incomechangedate: applicant.incomeChangeDate || null,
            willchangeincrease: applicant.willChangeIncrease,
            newincome: applicant.newIncome ? formatCurrencyForDatabase(applicant.newIncome) : null,
            isnewincomemonthly: applicant.isNewIncomeMonthly,
            newincomereason: applicant.newIncomeReason || null,
            startemployment: applicant.startEmployment || null,
            iscontractlimited: applicant.isContractLimited,
            endofcontract: applicant.endOfContract || null,
            haspensionincome: applicant.weitereEinkuenfte?.selectedTypes?.includes('renten') || false,
            incomepension: applicant.weitereEinkuenfte?.renten?.betrag ? formatCurrencyForDatabase(applicant.weitereEinkuenfte.renten.betrag) : null,
            hasrentincome: applicant.weitereEinkuenfte?.selectedTypes?.includes('vermietung') || false,
            incomerent: applicant.weitereEinkuenfte?.vermietung?.betrag ? formatCurrencyForDatabase(applicant.weitereEinkuenfte.vermietung.betrag) : null,
            incomerentyear: applicant.weitereEinkuenfte?.vermietung?.jahr || null,
            hasbusinessincome: applicant.weitereEinkuenfte?.selectedTypes?.includes('gewerbe') || false,
            incomebusiness: applicant.weitereEinkuenfte?.gewerbe?.betrag ? formatCurrencyForDatabase(applicant.weitereEinkuenfte.gewerbe.betrag) : null,
            incomebusinessyear: applicant.weitereEinkuenfte?.gewerbe?.jahr || null,
            hasagricultureincome: applicant.weitereEinkuenfte?.selectedTypes?.includes('landforst') || false,
            incomeagriculture: applicant.weitereEinkuenfte?.landforst?.betrag ? formatCurrencyForDatabase(applicant.weitereEinkuenfte.landforst.betrag) : null,
            incomeagricultureyear: applicant.weitereEinkuenfte?.landforst?.jahr || null,
            hasothercome: applicant.weitereEinkuenfte?.selectedTypes?.includes('sonstige') || false,
            incomeothers: applicant.weitereEinkuenfte?.sonstige?.betrag ? formatCurrencyForDatabase(applicant.weitereEinkuenfte.sonstige.betrag) : null,
            incomeothersyear: applicant.weitereEinkuenfte?.sonstige?.jahr || null,
            hastaxfreeunterhaltincome: applicant.weitereEinkuenfte?.selectedTypes?.includes('unterhaltsteuerfrei') || false,
            incomeunterhalttaxfree: applicant.weitereEinkuenfte?.unterhaltsteuerfrei?.betrag ? formatCurrencyForDatabase(applicant.weitereEinkuenfte.unterhaltsteuerfrei.betrag) : null,
            hastaxableunterhaltincome: applicant.weitereEinkuenfte?.selectedTypes?.includes('unterhaltsteuerpflichtig') || false,
            incomeunterhalttaxable: applicant.weitereEinkuenfte?.unterhaltsteuerpflichtig?.betrag ? formatCurrencyForDatabase(applicant.weitereEinkuenfte.unterhaltsteuerpflichtig.betrag) : null,
            hasforeignincome: applicant.weitereEinkuenfte?.selectedTypes?.includes('ausland') || false,
            incomeforeign: applicant.weitereEinkuenfte?.ausland?.betrag ? formatCurrencyForDatabase(applicant.weitereEinkuenfte.ausland.betrag) : null,
            incomeforeignyear: applicant.weitereEinkuenfte?.ausland?.turnus === 'jährlich' ? (applicant.weitereEinkuenfte?.ausland?.jahr || null) : null,
            incomeforeignmonthly: applicant.weitereEinkuenfte?.ausland?.turnus === 'monatlich' ? true : applicant.weitereEinkuenfte?.ausland?.turnus === 'jährlich' ? false : null,
            haspauschalincome: applicant.weitereEinkuenfte?.selectedTypes?.includes('pauschal') || false,
            incomepauschal: applicant.weitereEinkuenfte?.pauschal?.betrag ? formatCurrencyForDatabase(applicant.weitereEinkuenfte.pauschal.betrag) : null,
            hasablgincome: applicant.weitereEinkuenfte?.selectedTypes?.includes('arbeitslosengeld') || false,
            incomeablg: applicant.weitereEinkuenfte?.arbeitslosengeld?.betrag ? formatCurrencyForDatabase(applicant.weitereEinkuenfte.arbeitslosengeld.betrag) : null,
            incomealbgtype: applicant.weitereEinkuenfte?.arbeitslosengeld?.turnus === 'täglich' ? 0 : applicant.weitereEinkuenfte?.arbeitslosengeld?.turnus === 'monatlich' ? 1 : applicant.weitereEinkuenfte?.arbeitslosengeld?.turnus === 'jährlich' ? 2 : null,
            // Add new fields
            werbungskosten: applicant.werbungskosten ? formatCurrencyForDatabase(applicant.werbungskosten) : null,
            kinderbetreuungskosten: applicant.kinderbetreuungskosten ? formatCurrencyForDatabase(applicant.kinderbetreuungskosten) : null,
            ispayingincometax: applicant.ispayingincometax,
            ispayinghealthinsurance: applicant.ispayinghealthinsurance,
            ispayingpension: applicant.ispayingpension,
            ispayingunterhalt: applicant.ispayingunterhalt,
            unterhaltszahlungen: applicant.unterhaltszahlungen || [],
            addition_change_inincome: applicant.additionalIncomeChanges ? JSON.stringify(applicant.additionalIncomeChanges) : null,
            finanzamt: applicant.finanzamt || null,
            steuerid: applicant.steuerid || null,
          }))
        });

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

  const handleAddApplicant = () => {
    setAdditionalApplicants([
      ...additionalApplicants,
      {
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
    setSelectedIndex(additionalApplicants.length + 1);
  };

  const handleRemoveApplicant = (index: number) => {
    const updated = additionalApplicants.filter((_, i) => i !== index);
    setAdditionalApplicants(updated);
    setSelectedIndex(0);
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
    // TODO: Implement search functionality
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    handleSearch(value);
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
        if (!mainFinancials.incomeChangeDate) mainSectionErrors.income.push('Bitte geben Sie das Datum der Einkommensänderung an.');
        if (mainFinancials.willChangeIncrease === null) mainSectionErrors.income.push('Bitte geben Sie an, ob das Einkommen steigt oder sinkt.');
        if (!mainFinancials.newIncome) mainSectionErrors.income.push('Bitte geben Sie den neuen Betrag an.');
        if (mainFinancials.isNewIncomeMonthly === null) mainSectionErrors.income.push('Bitte geben Sie an, ob der neue Betrag monatlich oder jährlich ist.');
        if (!mainFinancials.newIncomeReason) mainSectionErrors.income.push('Bitte geben Sie eine Begründung für die Einkommensänderung an.');
      }
      if (!mainFinancials.startEmployment) mainSectionErrors.income.push('Bitte geben Sie das Beschäftigungsbeginn-Datum an.');
      if (mainFinancials.isContractLimited === null) mainSectionErrors.income.push('Bitte geben Sie an, ob Ihr Vertrag befristet oder unbefristet ist.');
      if (mainFinancials.isContractLimited && !mainFinancials.endOfContract) mainSectionErrors.income.push('Bitte geben Sie das Ende des befristeten Vertrags an.');
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
        if (!change.date) mainSectionErrors.changes.push(`Bitte geben Sie das Änderungsdatum für ${typeLabels[type] || additionalChangeTypeLabels[type] || type} an.`);
        if (!change.newAmount) mainSectionErrors.changes.push(`Bitte geben Sie den neuen Betrag für ${typeLabels[type] || additionalChangeTypeLabels[type] || type} an.`);
        if (typeof change.increase !== 'boolean') mainSectionErrors.changes.push(`Bitte geben Sie an, ob sich das Einkommen für ${typeLabels[type] || additionalChangeTypeLabels[type] || type} erhöht oder verringert.`);
        if (!change.reason) mainSectionErrors.changes.push(`Bitte geben Sie eine Begründung für die Änderung bei ${typeLabels[type] || additionalChangeTypeLabels[type] || type} an.`);
      });
    }
    // Section: legal
    if (!mainFinancials.finanzamt) mainSectionErrors.legal.push('Zuständiges Finanzamt ist erforderlich');
    if (!mainFinancials.steuerid) mainSectionErrors.legal.push('Steuer-ID ist erforderlich');

    errors['Antragstellende Person 1'] = mainSectionErrors;

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
          if (!applicant.incomeChangeDate) applicantSectionErrors.income.push('Bitte geben Sie das Datum der Einkommensänderung an.');
          if (applicant.willChangeIncrease === null) applicantSectionErrors.income.push('Bitte geben Sie an, ob sich ihr Einkommen erhöht oder verringert.');
          if (!applicant.newIncome) applicantSectionErrors.income.push('Bitte geben Sie den neuen Betrag an.');
          if (applicant.isNewIncomeMonthly === null) applicantSectionErrors.income.push('Bitte geben Sie an, ob der neue Betrag monatlich oder jährlich ist.');
          if (!applicant.newIncomeReason) applicantSectionErrors.income.push('Bitte geben Sie eine Begründung für die Einkommensänderung an.');
        }
        if (!applicant.startEmployment) applicantSectionErrors.income.push('Bitte geben Sie das Beschäftigungsbeginn-Datum an.');
        if (applicant.isContractLimited === null) applicantSectionErrors.income.push('Bitte geben Sie an, ob der Vertrag befristet oder unbefristet ist.');
        if (applicant.isContractLimited && !applicant.endOfContract) applicantSectionErrors.income.push('Bitte geben Sie das Ende des befristeten Vertrags an.');
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
          if (!change.date) applicantSectionErrors.changes.push(`Bitte geben Sie das Änderungsdatum für ${typeLabels[type] || additionalChangeTypeLabels[type] || type} an.`);
          if (!change.newAmount) applicantSectionErrors.changes.push(`Bitte geben Sie den neuen Betrag für ${typeLabels[type] || additionalChangeTypeLabels[type] || type} an.`);
          if (typeof change.increase !== 'boolean') applicantSectionErrors.changes.push(`Bitte geben Sie an, ob sich das Einkommen für ${typeLabels[type] || additionalChangeTypeLabels[type] || type} erhöht oder verringert.`);
          if (!change.reason) applicantSectionErrors.changes.push(`Bitte geben Sie eine Begründung für die Änderung bei ${typeLabels[type] || additionalChangeTypeLabels[type] || type} an.`);
        });
      }
      // Section: legal
      if (!applicant.finanzamt) applicantSectionErrors.legal.push('Zuständiges Finanzamt ist erforderlich');
      if (!applicant.steuerid) applicantSectionErrors.legal.push('Steuer-ID ist erforderlich');
      errors[`Antragstellende Person ${index + 2}`] = applicantSectionErrors;
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

  const handleMainFinancialsChange = (data: MainFinancials) => {
    setMainFinancials(data);
  };

  const getCurrentApplicantSectionErrors = () => {
    const applicantKey = selectedIndex === 0 ? 'Antragstellende Person 1' : `Antragstellende Person ${selectedIndex + 1}`;
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
        if (!mainFinancials.incomeChangeDate) actualErrors++;
        if (mainFinancials.willChangeIncrease === null) actualErrors++;
        if (!mainFinancials.newIncome) actualErrors++;
        if (mainFinancials.isNewIncomeMonthly === null) actualErrors++;
        if (!mainFinancials.newIncomeReason) actualErrors++;
      }

      // Employment details
      totalPotentialFields += 2;
      if (!mainFinancials.startEmployment) actualErrors++;
      if (mainFinancials.isContractLimited === null) actualErrors++;
      if (mainFinancials.isContractLimited) {
        totalPotentialFields++;
        if (!mainFinancials.endOfContract) actualErrors++;
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
        totalPotentialFields += 4;
        if (!change.date) actualErrors++;
        if (!change.newAmount) actualErrors++;
        if (typeof change.increase !== 'boolean') actualErrors++;
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
          if (!applicant.incomeChangeDate) actualErrors++;
          if (applicant.willChangeIncrease === null) actualErrors++;
          if (!applicant.newIncome) actualErrors++;
          if (applicant.isNewIncomeMonthly === null) actualErrors++;
          if (!applicant.newIncomeReason) actualErrors++;
        }

        // Employment details
        totalPotentialFields += 2;
        if (!applicant.startEmployment) actualErrors++;
        if (applicant.isContractLimited === null) actualErrors++;
        if (applicant.isContractLimited) {
          totalPotentialFields++;
          if (!applicant.endOfContract) actualErrors++;
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
          totalPotentialFields += 4;
          if (!change.date) actualErrors++;
          if (!change.newAmount) actualErrors++;
          if (typeof change.increase !== 'boolean') actualErrors++;
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
            max-width: 800px;
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
                Antragstellende Person 1
              </Button>

              {/* Additional Applicants Buttons */}
              {additionalApplicants.map((_, index) => (
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
                    Antragstellende Person {index + 2}
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
      <Modal show={showSearchModal} onHide={() => setShowSearchModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Suchen</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Control
            type="text"
            placeholder="Suchen..."
            value={searchQuery}
            onChange={handleSearchInputChange}
          />
          {searchResults.length > 0 && (
            <div className="mt-3">
              {searchResults.map((result, index) => (
                <div key={index} className="p-2 border-bottom">
                  {result}
                </div>
              ))}
            </div>
          )}
        </Modal.Body>
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
                            <h6 className="text-danger mb-0">{sectionTitles[section as SectionKey]}:</h6>
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
    </div>
  );
};

export default EinkommenserklaerungContainer; 