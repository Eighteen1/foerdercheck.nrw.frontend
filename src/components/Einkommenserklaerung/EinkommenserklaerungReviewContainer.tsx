import React, { useState, useEffect } from 'react';
import { Container, Modal, Form, Button } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
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

interface AdditionalApplicantFinancials extends MainFinancials {}

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

  useEffect(() => {
    loadSavedData();
  }, [residentId]);

  const loadSavedData = async () => {
    if (!residentId) return;

    setIsLoading(true);
    try {
      // Load user data
      const { data: userData, error: userError } = await supabase
        .from('user_data')
        .select('*')
        .eq('id', residentId)
        .single();

      if (userError) {
        console.error('Error loading user data:', userError);
        return;
      }
      
      // Set showValidation based on shouldShowErrorEink from database
      const shouldShowError = userData?.should_show_error_einkommenserklaerung ?? false;
      setShowValidation(shouldShowError);

      // Load financial data
      const { data: financialData, error: financialError } = await supabase
        .from('user_financials')
        .select('*')
        .eq('user_id', residentId)
        .single();

      if (financialError) {
        console.error('Error loading financial data:', financialError);
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
        const additionalApplicantsData = userData.weitere_antragstellende_personen.map((person: any) => ({
          title: person.title || '',
          firstName: person.firstName || '',
          lastName: person.lastName || '',
          street: person.street || '',
          houseNumber: person.houseNumber || '',
          postalCode: person.postalCode || '',
          city: person.city || ''
        }));

        const additionalFinancials = financialData?.additional_applicants_financials || [];
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
                for (let i = 11; i >= 0; i--) {
                  const month = (endMonth - i + 12) % 12;
                  const year = endYear - (endMonth < i ? 1 : 0);
                  const key = `${year}-${month}`;
                  
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
        <div className="applicant-switcher">
          <button
            onClick={() => setCurrentApplicantIndex(0)}
            className={currentApplicantIndex === 0 ? 'active' : ''}
          >
            Hauptantragsteller
          </button>
          {additionalApplicants.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentApplicantIndex(index + 1)}
              className={currentApplicantIndex === index + 1 ? 'active' : ''}
            >
              {`Antragsteller ${index + 1}`}
            </button>
          ))}
        </div>
        <div className="search-container">
          <button onClick={() => setShowSearchModal(true)}>
            <span className="material-icons">search</span>
          </button>
        </div>
      </div>
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