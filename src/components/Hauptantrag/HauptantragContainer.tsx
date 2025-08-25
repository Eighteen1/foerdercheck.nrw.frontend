import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Container, Button, Modal, Spinner, Form } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { completelyRemovePerson } from '../../lib/personCleanup';
import { formatCurrencyForDisplay, formatCurrencyForDatabase, safeFormatCurrencyForDatabase, safeNumericToString, safeFormatCurrencyForDisplay, safeNumericToDatabase, safeAreaToDatabase, safeAreaToString, isValidAreaValue } from '../../utils/currencyUtils';
import Step1_PersonalInfo from './Steps/Step1_PersonalInfo';
import Step2_HouseholdInfo from './Steps/Step2_HouseholdInfo';
import Step3_Objektdetails from './Steps/Step3_Objektdetails';
import Step4_Eigentumsverhaeltnisse from './Steps/Step4_Eigentumsverhaeltnisse';
import Step5_Kostenaufstellung from './Steps/Step5_Kostenaufstellung';
import Step6_Finanzierungsmittel, { Fremddarlehen } from './Steps/Step6_Finanzierungsmittel';
import PDFDownloadButton from '../PDFDownload/PDFDownloadButton';
import { getMaxLimitForPostcode } from '../../utils/postcodeValidation';

// Import search icon



interface FormData {
  step1: {
    representative: {
      hasRepresentative: boolean | null;
      isCompany: boolean | null;
      companyName?: string;
      postboxPostcode?: string;
      postboxCity?: string;
      title?: string;
      firstName?: string;
      lastName?: string;
      street?: string;
      houseNumber?: string;
      postalCode?: string;
      city?: string;
      phone?: string;
      email?: string;
    };
    persons: Array<{
      title: string;
      firstName: string;
      lastName: string;
      nationality: string;
      birthDate: string;
      steuerid: string;
      street: string;
      houseNumber: string;
      postalCode: string;
      city: string;
      phone: string;
      email: string;
      employment: {
        type: string;
        details: string;
      };
      isApplicant?: boolean; // Add isApplicant field
      originalPersonId?: string; // Add to track which existing person this came from
    }>;
  };
  step2: {
    adultCount: string;
    childCount: string;
    isDisabled: boolean | null;
    isMarried: boolean | null;
    hasAdditionalAssets: boolean | null;
    hasDoubleSubsidy: boolean | null;
    childrenAges: string;
    disabledAdultsCount: string;
    disabledChildrenCount: string;
    additionalAssetsDetails: string;
    hasRepaidSubsidy: boolean | null;
    subsidyAmount: string;
    subsidyFileNumber: string;
    subsidyAuthority: string;
    hasSupplementaryLoan: boolean | null;
  };
  step3: {
    address: {
      street: string;
      houseNumber: string;
      postalCode: string;
      city: string;
    };
    foerderVariante: string;
    objektart: string;
    objektDetailsAllgemein: {
      wohnflaecheSelbstgenutzt: string;
      gesamtWohnflaeche: string;
      anzahlZimmer: string;
      anzahlGaragen: string;
      gewerbeflaeche: {
        hasGewerbeflaeche: boolean | null;
        flaeche: string;
      };
      ertraege: {
        hasErtraege: boolean | null;
        vermieteteWohnung: string;
        vermieteteGarage: string;
      };
      barrierefrei: boolean | null;
      begEffizienzhaus40Standard: boolean | null;
      hasLocationCostLoan: boolean | null;
      hasWoodConstructionLoan: boolean | null;
      bergsenkungsGebiet: boolean | null;
    };
    objektDetailsEigentumswohnung: {
      anzahlVollgeschosse: string;
      wohnungenAmHauseingang: string;
      lageImGebaeude: string;
      lageImGeschoss: string;
    };
    objektDetailsNeubauErsterwerb: {
      baugenehmigungErforderlich: boolean | null;
      baugenehmigung: {
        wurdeErteilt: boolean | null;
        erteilungsDatum: string;
        aktenzeichen: string;
        erteilungsBehoerde: string;
      };
      bauanzeige: {
        wurdeEingereicht: boolean | null;
        einreichungsDatum: string;
      };
      bauarbeiten: {
        wurdeBegonnen: boolean | null;
        beginnDatum: string;
      };
    };
    objektDetailsBestandserwerb: {
      baujahr: string;
    };
  };
  step4: {
    eigentumsverhaeltnis: boolean | null;
    kaufvertrag: {
      wurdeAbgeschlossen: boolean | null;
      abschlussDatum: string;
    };
    erbbaurecht: boolean | null;
    restlaufzeitErbbaurecht: string;
    grundbuch: {
      type: string;
      amtsgericht: string;
      ortGrundbuch: string;
      gemarkung: string;
      blatt: string;
      flur: string;
      flurstueck: string;
      flurstueckNeu: string;
      grundstuecksgroesse: string;
    };
    baulasten: {
      vorhanden: boolean | null;
      art: string;
    };
    altlasten: {
      vorhanden: boolean | null;
      art: string;
    };
  };
  step5: {
    baugrundstuck: {
      kaufpreis: string;
      wert: string;
      erschliessungskosten: string;
      standortbedingteMehrkosten: string;
    };
    kaufpreis: {
      kaufpreis: string;
    };
    baukosten: {
      kostenGebaeude: string;
      besondereBauausfuhrung: string;
      wertVorhandenerGebaude: string;
      kostenAussenanlagen: string;
      kostenArchitekt: string;
    };
    nebenkosten: {
      erwerbsnebenkosten: string;
      verwaltungsleistungen: string;
      beschaffungDauerfinanzierung: string;
      beschaffungZwischenfinanzierung: string;
      sonstigeNebenkosten: string;
      zusaetzlicheKosten: string;
    };
    gesamtkosten: string;
  };
  step6: {
    fremddarlehen: Array<{
      id: string;
      darlehenGeber: string;
      nennbetrag: string;
      zinssatz: string;
      auszahlung: string;
      tilgung: string;
    }>;
    darlehenNRWBank: {
      grunddarlehen: {
        nennbetrag: string;
        tilgungsnachlass: string;
      };
      zusatzdarlehen: {
        familienbonus: {
          nennbetrag: string;
          tilgungsnachlass: string;
        };
        barrierefreiheit: {
          nennbetrag: string;
          tilgungsnachlass: string;
        };
        bauenMitHolz: {
          nennbetrag: string;
          tilgungsnachlass: string;
        };
        standortbedingteMehrkosten: {
          nennbetrag: string;
          tilgungsnachlass: string;
        };
        begEffizienzhaus40Standard: {
          nennbetrag: string;
          tilgungsnachlass: string;
        };
      };
      summeNennbetrag: string;
      summeTilgungsnachlass: string;
    };
    ergaenzungsdarlehen: {
      nennbetrag: string;
    };
    eigenleistung: {
      eigeneGeldmittel: string;
      zuschüsse: string;
      selbsthilfe: string;
      wertVorhandenerGebaeudeteile: string;
      wertBaugrundstück: string;
      summeEigenleistung: string;
    };
    gesamtbetraege: string;
  };
  // Add other step interfaces as we create them
}

interface AdditionalPerson {
  title: string;
  firstName: string;
  lastName: string;
  nationality: string;
  birthDate: string;
  steuerid: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
  employment: {
    type: string;
    details: string;
  };
  isApplicant?: boolean; // Add isApplicant field
}

interface SearchResult {
  step: number;
  matches: string[];
}

// Email validation function
const isValidEmail = (email: string): boolean => {
  if (!email) return false;
  
  // Basic email regex pattern
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

const HauptantragContainer: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  
  // All state declarations grouped together
  const [currentStep, setCurrentStep] = useState(1);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ [key: number]: string[] }>({});
  const [showValidation, setShowValidation] = useState(false);
  const [hasValidatedOnce, setHasValidatedOnce] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const loadingLockRef = useRef(false); // Use ref instead of state to prevent useCallback recreation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [personToDelete, setPersonToDelete] = useState<{
    index: number;
    person: any;
    hasHouseholdData: boolean;
  } | null>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selbsthilfeData, setSelbsthilfeData] = useState<{willProvideSelfHelp: boolean | null, totals: {totalSelbsthilfe: number}} | null>(null);

  // Generate UUID helper function
  const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
  const [formData, setFormData] = useState<FormData>({
    step1: {
      representative: {
        hasRepresentative: null,
        isCompany: null,
        companyName: '',
        postboxPostcode: '',
        postboxCity: '',
        title: '',
        firstName: '',
        lastName: '',
        street: '',
        houseNumber: '',
        postalCode: '',
        city: '',
        phone: '',
        email: ''
      },
      persons: [{
        title: '',
        firstName: '',
        lastName: '',
        nationality: '',
        birthDate: '',
        steuerid: '',
        street: '',
        houseNumber: '',
        postalCode: '',
        city: '',
        phone: '',
        email: '',
        employment: {
          type: '',
          details: ''
        },
        isApplicant: true // Main applicant is always an applicant
      }]
    },
    step2: {
      adultCount: '',
      childCount: '',
      isDisabled: null,
      isMarried: null,
      hasAdditionalAssets: null,
      hasDoubleSubsidy: null,
      childrenAges: '',
      disabledAdultsCount: '',
      disabledChildrenCount: '',
      additionalAssetsDetails: '',
      hasRepaidSubsidy: null,
      subsidyAmount: '',
      subsidyFileNumber: '',
      subsidyAuthority: '',
      hasSupplementaryLoan: null
    },
    step3: {
      address: {
        street: '',
        houseNumber: '',
        postalCode: '',
        city: ''
      },
      foerderVariante: '',
      objektart: '',
      objektDetailsAllgemein: {
        wohnflaecheSelbstgenutzt: '',
        gesamtWohnflaeche: '',
        anzahlZimmer: '',
        anzahlGaragen: '',
        gewerbeflaeche: {
          hasGewerbeflaeche: null,
          flaeche: ''
        },
        ertraege: {
          hasErtraege: null,
          vermieteteWohnung: '',
          vermieteteGarage: ''
        },
        barrierefrei: null,
        begEffizienzhaus40Standard: null,
        hasLocationCostLoan: null,
        hasWoodConstructionLoan: null,
        bergsenkungsGebiet: null
      },
      objektDetailsEigentumswohnung: {
        anzahlVollgeschosse: '',
        wohnungenAmHauseingang: '',
        lageImGebaeude: '',
        lageImGeschoss: ''
      },
      objektDetailsNeubauErsterwerb: {
        baugenehmigungErforderlich: null,
        baugenehmigung: {
          wurdeErteilt: null,
          erteilungsDatum: '',
          aktenzeichen: '',
          erteilungsBehoerde: ''
        },
        bauanzeige: {
          wurdeEingereicht: null,
          einreichungsDatum: ''
        },
        bauarbeiten: {
          wurdeBegonnen: null,
          beginnDatum: ''
        }
      },
      objektDetailsBestandserwerb: {
        baujahr: ''
      }
    },
    step4: {
      eigentumsverhaeltnis: null,
      kaufvertrag: {
        wurdeAbgeschlossen: null,
        abschlussDatum: '',
      },
      erbbaurecht: null,
      restlaufzeitErbbaurecht: '',
      grundbuch: {
        type: '',
        amtsgericht: '',
        ortGrundbuch: '',
        gemarkung: '',
        blatt: '',
        flur: '',
        flurstueck: '',
        flurstueckNeu: '',
        grundstuecksgroesse: '',
      },
      baulasten: {
        vorhanden: null,
        art: '',
      },
      altlasten: {
        vorhanden: null,
        art: '',
      },
    },
    step5: {
      baugrundstuck: {
        kaufpreis: '',
        wert: '',
        erschliessungskosten: '',
        standortbedingteMehrkosten: ''
      },
      kaufpreis: {
        kaufpreis: ''
      },
      baukosten: {
        kostenGebaeude: '',
        besondereBauausfuhrung: '',
        wertVorhandenerGebaude: '',
        kostenAussenanlagen: '',
        kostenArchitekt: ''
      },
      nebenkosten: {
        erwerbsnebenkosten: '',
        verwaltungsleistungen: '',
        beschaffungDauerfinanzierung: '',
        beschaffungZwischenfinanzierung: '',
        sonstigeNebenkosten: '',
        zusaetzlicheKosten: ''
      },
      gesamtkosten: ''
    },
    step6: {
      fremddarlehen: [{
        id: '1',
        darlehenGeber: '',
        nennbetrag: '',
        zinssatz: '',
        auszahlung: '',
        tilgung: ''
      }],
      darlehenNRWBank: {
        grunddarlehen: {
          nennbetrag: '',
          tilgungsnachlass: ''
        },
        zusatzdarlehen: {
          familienbonus: {
            nennbetrag: '',
            tilgungsnachlass: ''
          },
          barrierefreiheit: {
            nennbetrag: '',
            tilgungsnachlass: ''
          },
          bauenMitHolz: {
            nennbetrag: '',
            tilgungsnachlass: ''
          },
          standortbedingteMehrkosten: {
            nennbetrag: '',
            tilgungsnachlass: ''
          },
          begEffizienzhaus40Standard: {
            nennbetrag: '',
            tilgungsnachlass: ''
          }
        },
        summeNennbetrag: '',
        summeTilgungsnachlass: ''
      },
      ergaenzungsdarlehen: {
        nennbetrag: ''
      },
      eigenleistung: {
        eigeneGeldmittel: '',
        zuschüsse: '',
        selbsthilfe: '',
        wertVorhandenerGebaeudeteile: '',
        wertBaugrundstück: '',
        summeEigenleistung: ''
      },
      gesamtbetraege: ''
    }
  });

  // Search terms for each step
  const stepSearchTerms = {
    1: [
      "Persönliche Angaben",
      "Antragsteller",
      "Bevollmächtigter",
      "Firma",
      "Name",
      "Adresse",
      "Telefon",
      "E-Mail",
      "Beschäftigung"
    ],
    2: [
      "Persönliche Verhältnisse",
      "Haushalt",
      "Erwachsene",
      "Kinder",
      "Behinderung",
      "Ehe",
      "Vermögen",
      "Fördermittel",
      "Doppelförderung",
      "Ergänzungsdarlehen"
    ],
    3: [
      "Objektdetails",
      "Adresse",
      "Wohnfläche",
      "Zimmer",
      "Garage",
      "Gewerbefläche",
      "Erträge",
      "Barrierefrei",
      "Baugenehmigung",
      "Bauanzeige",
      "Bauarbeiten",
      "Baujahr",
      "Bauen mit Holz",
      "Standortbedingte Mehrkosten",
      "BEG Effizienzhaus 40 Standard",
      "Neubau Eigenheim",
      "Bestandserwerb Eigentumswohnung",
      "Ersterwerb Eigentumswohnung",
      "Bestandserwerb Eigenheim",
      "Ersterwerb Eigenheim",
      "Neubau Eigentumswohnung",
      "Nutzungsänderung"
    ],
    4: [
      "Eigentumsverhältnisse",
      "Eigentum",
      "Kaufvertrag",
      "Erbbaurecht",
      "Grundbuch",
      "Baulasten",
      "Altlasten"
    ],
    5: [
      "Kostenaufstellung",
      "Baugrundstück",
      "Kaufpreis",
      "Baukosten",
      "Nebenkosten",
      "Erschließungskosten",
      "Architektenkosten"
    ],
    6: [
      "Finanzierungsmittel",
      "Fremddarlehen",
      "Grunddarlehen",
      "Zusatzdarlehen",
      "Eigenleistung",
      "Familienbonus",
      "Barrierefreiheit",
      "Holzbau"
    ]
  };

  const handleSearch = (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    Object.entries(stepSearchTerms).forEach(([step, terms]) => {
      const matches = terms.filter(term => 
        term.toLowerCase().includes(lowerQuery)
      );

      if (matches.length > 0) {
        results.push({
          step: parseInt(step),
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

  const navigateToStep = (step: number) => {
    setCurrentStep(step);
    setShowSearchModal(false);
  };

  // Handle URL step parameter
  useEffect(() => {
    const stepParam = searchParams.get('step');
    if (stepParam) {
      const stepNumber = parseInt(stepParam, 10);
      if (stepNumber >= 1 && stepNumber <= 6) {
        setCurrentStep(stepNumber);
        console.log('Setting current step from URL parameter:', stepNumber);
      }
    }
  }, [searchParams]);

  // Load saved data from Supabase
  useEffect(() => {
    const loadSavedData = async () => {
      // Early return if no user - don't start loading
      if (!user?.id) {
        console.log('No user ID, skipping data load');
        return;
      }

      // Prevent concurrent loading operations
      if (loadingLockRef.current) {
        console.log('Loading already in progress, skipping');
        return;
      }

      console.log('Starting data load for user:', user.id);
      loadingLockRef.current = true;
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
          return; // This will go to finally block
        }

        console.log('Loaded user data:', userData);
        
        // Set showValidation based on shouldShowErrorHaupt from database
        // Default to false if undefined
        const shouldShowError = userData?.should_show_error_haupt ?? false;
        console.log('Setting shouldShowError to:', shouldShowError);
        setShowValidation(shouldShowError);
        setHasValidatedOnce(shouldShowError);

        // Load object data
        const { data: objectData, error: objectError } = await supabase
          .from('object_data')
          .select('*')
          .eq('user_id', user.id)
          .single();

        // Load cost data
        const { data: costData, error: costError } = await supabase
          .from('cost_structure')
          .select('*')
          .eq('user_id', user.id)
          .single();

        // Load finance data
        const { data: financeData, error: financeError } = await supabase
          .from('finance_structure')
          .select('*')
          .eq('user_id', user.id)
          .single();

        // Load financial data for steuerid
        const { data: userFinancials, error: userFinancialsError } = await supabase
          .from('user_financials')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (userFinancialsError && userFinancialsError.code !== 'PGRST116') {
          console.error('Error loading user financials data:', userFinancialsError);
        }

        // Load selbsthilfe data
        const { data: selbsthilfeObjectData, error: selbsthilfeError } = await supabase
          .from('object_data')
          .select('selbsthilfe_angaben')
          .eq('user_id', user.id)
          .single();

        if (selbsthilfeError && selbsthilfeError.code !== 'PGRST116') {
          console.error('Error loading selbsthilfe data:', selbsthilfeError);
        }

        // Set selbsthilfe data if available
        if (selbsthilfeObjectData?.selbsthilfe_angaben) {
          setSelbsthilfeData(selbsthilfeObjectData.selbsthilfe_angaben);
        }

        // Calculate total costs from cost data
        let totalCosts = 0;
        if (costData) {
          const isNeubau = objectData?.foerderVariante.includes('neubau');
          const isBestandserwerbOrErsterwerb = objectData?.foerderVariante?.includes('bestandserwerb') || objectData?.foerderVariante?.includes('ersterwerb');
          const showBaukosten = isNeubau || objectData?.foerderVariante === 'nutzungsaenderung';

          // Add Baugrundstück costs if Neubau (excluding standortbedingteMehrkosten)
          if (isNeubau) {
            if (costData.grundstueck_kaufpreis) totalCosts += costData.grundstueck_kaufpreis;
            if (costData.grundstueck_wert) totalCosts += costData.grundstueck_wert;
            if (costData.erschliessungskosten) totalCosts += costData.erschliessungskosten;
          }

          // Add Standortbedingte Mehrkosten if Neubau or Ersterwerb with hasLocationCostLoan
          if ((isNeubau || objectData?.foerderVariante?.includes('ersterwerb')) && objectData?.haslocationcostloan) {
            if (costData.standortbedingte_mehrkosten) totalCosts += costData.standortbedingte_mehrkosten;
          }

          // Add Kaufpreis if Bestandserwerb or Ersterwerb
          if (isBestandserwerbOrErsterwerb && costData.kaufpreis) {
            totalCosts += costData.kaufpreis;
          }

          // Add Baukosten if Neubau or Nutzungsänderung
          if (showBaukosten) {
            if (costData.kosten_gebaeude) totalCosts += costData.kosten_gebaeude;
            if (costData.besondere_bauausfuehrung) totalCosts += costData.besondere_bauausfuehrung;
            if (costData.wert_vorhandener_gebaeude) totalCosts += costData.wert_vorhandener_gebaeude;
            if (costData.kosten_aussenanlagen) totalCosts += costData.kosten_aussenanlagen;
            if (costData.kosten_architekt) totalCosts += costData.kosten_architekt;
          }

          // Always add Nebenkosten
          if (costData.erwerbsnebenkosten) totalCosts += costData.erwerbsnebenkosten;
          if (costData.verwaltungsleistungen) totalCosts += costData.verwaltungsleistungen;
          if (costData.beschaffung_dauerfinanzierung) totalCosts += costData.beschaffung_dauerfinanzierung;
          if (costData.beschaffung_zwischenfinanzierung) totalCosts += costData.beschaffung_zwischenfinanzierung;
          if (costData.sonstige_nebenkosten) totalCosts += costData.sonstige_nebenkosten;
          if (costData.zusaetzliche_kosten) totalCosts += costData.zusaetzliche_kosten;
        }

        // Reconstruct the form data from the database fields
        const loadedFormData: FormData = {
          ...formData,
          step1: {
            representative: {
              hasRepresentative: userData?.hasauthorizedperson ?? null,
              isCompany: userData?.hasauthorizedperson ? userData?.iscompany : null,
              companyName: userData?.bevollmaechtigte?.companyName || '',
              postboxPostcode: userData?.bevollmaechtigte?.postboxPostcode || '',
              postboxCity: userData?.bevollmaechtigte?.postboxCity || '',
              title: userData?.bevollmaechtigte?.title || '',
              firstName: userData?.bevollmaechtigte?.firstName || '',
              lastName: userData?.bevollmaechtigte?.lastName || '',
              street: userData?.bevollmaechtigte?.street || '',
              houseNumber: userData?.bevollmaechtigte?.houseNumber || '',
              postalCode: userData?.bevollmaechtigte?.postalCode || '',
              city: userData?.bevollmaechtigte?.city || '',
              phone: userData?.bevollmaechtigte?.phone || '',
              email: userData?.bevollmaechtigte?.email || ''
            },
            persons: [
              // Main applicant
              {
                title: userData?.title || '',
                firstName: userData?.firstname || '',
                lastName: userData?.lastname || '',
                nationality: userData?.nationality || '',
                birthDate: userData?.birthDate || '',
                steuerid: userFinancials?.steuerid || '',
                street: userData?.person_street || '',
                houseNumber: userData?.person_housenumber || '',
                postalCode: userData?.person_postalcode || '',
                city: userData?.person_city || '',
                phone: userData?.phone || '',
                email: userData?.email || '',
                employment: {
                  type: userData?.employment || '',
                  details: userData?.branche || ''
                }
              },
              // Additional applicants - convert UUID-based object to array
              ...Object.entries(userData?.weitere_antragstellende_personen || {})
                .filter(([uuid, person]: [string, any]) => person.isApplicant === true)
                .map(([uuid, person]: [string, any]) => {
                  // Get steuerid for this specific person from additional_applicants_financials
                  const personFinancials = userFinancials?.additional_applicants_financials?.[uuid] || {};
                  const personSteuerid = personFinancials.steuerid || '';
                  
                  return {
                    title: person.title || '',
                    firstName: person.firstName || '',
                    lastName: person.lastName || '',
                    nationality: person.nationality || '',
                    birthDate: person.birthDate || '',
                    steuerid: personSteuerid,
                    street: person.street || '',
                    houseNumber: person.houseNumber || '',
                    postalCode: person.postalCode || '',
                    city: person.city || '',
                    phone: person.phone || '',
                    email: person.email || '',
                    employment: {
                      type: person.employment?.type || '',
                      details: person.employment?.details || ''
                    },
                    isApplicant: person.isApplicant, // Preserve isApplicant field
                    originalPersonId: uuid // Store the UUID for tracking
                  };
                })
            ]
          },
          step2: {
            adultCount: safeNumericToString(userData?.adult_count),
            childCount: safeNumericToString(userData?.child_count),
            isDisabled: userData?.is_disabled ?? null,
            isMarried: userData?.is_married ?? null,
            hasAdditionalAssets: userData?.hasadditionalassets ?? null,
            hasDoubleSubsidy: userData?.hasdoublesubsidy ?? null,
            childrenAges: userData?.childrenages || '',
            disabledAdultsCount: safeNumericToString(userData?.disabledadultscount),
            disabledChildrenCount: safeNumericToString(userData?.disabledchildrencount),
            additionalAssetsDetails: userData?.additionalassetsdetails || '',
            hasRepaidSubsidy: userData?.hasrepaidsubsidy ?? null,
            subsidyAmount: safeFormatCurrencyForDisplay(userData?.subsidyamount),
            subsidyFileNumber: userData?.subsidyfilenumber || '',
            subsidyAuthority: userData?.subsidyauthority || '',
            hasSupplementaryLoan: userData?.hassupplementaryloan ?? null
          },
          step3: {
            address: {
              street: objectData?.obj_street || '',
              houseNumber: objectData?.obj_house_number || '',
              postalCode: objectData?.obj_postal_code || '',
              city: objectData?.obj_city || ''
            },
            foerderVariante: objectData?.foerderVariante || '',
            objektart: objectData?.objektart || '',
            objektDetailsAllgemein: {
                      wohnflaecheSelbstgenutzt: safeAreaToString(objectData?.wohnflaeche_selbstgenutzt),
        gesamtWohnflaeche: safeAreaToString(objectData?.gesamt_wohnflaeche),
              anzahlZimmer: safeNumericToString(objectData?.anzahl_zimmer),
              anzahlGaragen: safeNumericToString(objectData?.anzahl_garagen),
              gewerbeflaeche: {
                hasGewerbeflaeche: objectData?.has_gewerbeflaeche ?? null,
                flaeche: objectData?.has_gewerbeflaeche ? safeAreaToString(objectData?.gewerbeflaeche) : ''
              },
              ertraege: {
                hasErtraege: objectData?.has_ertraege ?? null,
                vermieteteWohnung: objectData?.has_ertraege ? safeFormatCurrencyForDisplay(objectData?.vermietete_wohnung) : '',
                vermieteteGarage: objectData?.has_ertraege ? safeFormatCurrencyForDisplay(objectData?.vermietete_garage) : ''
              },
              barrierefrei: objectData?.barrierefrei ?? null,
              begEffizienzhaus40Standard: objectData?.beg_effizienzhaus_40_standard ?? null,
              hasLocationCostLoan: objectData?.haslocationcostloan ?? null,
              hasWoodConstructionLoan: objectData?.haswoodconstructionloan ?? null,
              bergsenkungsGebiet: objectData?.bergsenkungsGebiet ?? null
            },
            objektDetailsEigentumswohnung: {
              anzahlVollgeschosse: (objectData?.foerderVariante === 'bestandserwerb-wohnung' || objectData?.foerderVariante === 'ersterwerb-wohnung') ? safeNumericToString(objectData?.anzahl_vollgeschosse) : '',
              wohnungenAmHauseingang: (objectData?.foerderVariante === 'bestandserwerb-wohnung' || objectData?.foerderVariante === 'ersterwerb-wohnung') ? safeNumericToString(objectData?.wohnungen_am_hauseingang) : '',
              lageImGebaeude: (objectData?.foerderVariante === 'bestandserwerb-wohnung' || objectData?.foerderVariante === 'ersterwerb-wohnung') ? objectData?.lage_im_gebaeude || '' : '',
              lageImGeschoss: (objectData?.foerderVariante === 'bestandserwerb-wohnung' || objectData?.foerderVariante === 'ersterwerb-wohnung') ? objectData?.lage_im_geschoss || '' : ''
            },
            objektDetailsNeubauErsterwerb: {
              baugenehmigungErforderlich: (objectData?.foerderVariante.includes('neubau') || objectData?.foerderVariante === 'ersterwerb-eigenheim' || objectData?.foerderVariante === 'ersterwerb-wohnung') ? objectData?.baugenehmigung_erforderlich : null,
              baugenehmigung: {
                wurdeErteilt: (objectData?.foerderVariante.includes('neubau') || objectData?.foerderVariante === 'ersterwerb-eigenheim' || objectData?.foerderVariante === 'ersterwerb-wohnung') ? objectData?.baugenehmigung_wurde_erteilt : null,
                erteilungsDatum: (objectData?.foerderVariante.includes('neubau') || objectData?.foerderVariante === 'ersterwerb-eigenheim' || objectData?.foerderVariante === 'ersterwerb-wohnung') && objectData?.baugenehmigung_wurde_erteilt ? objectData?.erteilungs_datum || '' : '',
                aktenzeichen: (objectData?.foerderVariante.includes('neubau') || objectData?.foerderVariante === 'ersterwerb-eigenheim' || objectData?.foerderVariante === 'ersterwerb-wohnung') && objectData?.baugenehmigung_wurde_erteilt ? objectData?.aktenzeichen || '' : '',
                erteilungsBehoerde: (objectData?.foerderVariante.includes('neubau') || objectData?.foerderVariante === 'ersterwerb-eigenheim' || objectData?.foerderVariante === 'ersterwerb-wohnung') && objectData?.baugenehmigung_wurde_erteilt ? objectData?.erteilungs_behoerde || '' : ''
              },
              bauanzeige: {
                wurdeEingereicht: (objectData?.foerderVariante.includes('neubau') || objectData?.foerderVariante === 'ersterwerb-eigenheim' || objectData?.foerderVariante === 'ersterwerb-wohnung') ? objectData?.bauanzeige_wurde_eingereicht : null,
                einreichungsDatum: (objectData?.foerderVariante.includes('neubau') || objectData?.foerderVariante === 'ersterwerb-eigenheim' || objectData?.foerderVariante === 'ersterwerb-wohnung') && objectData?.bauanzeige_wurde_eingereicht ? objectData?.bauanzeige_einreichungs_datum || '' : ''
              },
              bauarbeiten: {
                wurdeBegonnen: (objectData?.foerderVariante.includes('neubau') || objectData?.foerderVariante === 'ersterwerb-eigenheim' || objectData?.foerderVariante === 'ersterwerb-wohnung') ? objectData?.bauarbeiten_wurde_begonnen : null,
                beginnDatum: (objectData?.foerderVariante.includes('neubau') || objectData?.foerderVariante === 'ersterwerb-eigenheim' || objectData?.foerderVariante === 'ersterwerb-wohnung') && objectData?.bauarbeiten_wurde_begonnen ? objectData?.bauarbeiten_beginn_datum || '' : ''
              }
            },
            objektDetailsBestandserwerb: {
              baujahr: (objectData?.foerderVariante === 'bestandserwerb-wohnung' || objectData?.foerderVariante === 'bestandserwerb-eigenheim') ? safeNumericToString(objectData?.bestandserwerb_baujahr) : ''
            }
          },
          step4: {
            eigentumsverhaeltnis: objectData?.eigentumsverhaeltnis ?? null,
            kaufvertrag: {
              wurdeAbgeschlossen: objectData?.kaufvertrag_wurde_abgeschlossen ?? null,
              abschlussDatum: objectData?.kaufvertrag_abschluss_datum || ''
            },
            erbbaurecht: objectData?.erbbaurecht ?? null,
            restlaufzeitErbbaurecht: safeNumericToString(objectData?.restlaufzeit_erbbaurecht),
            grundbuch: {
              type: objectData?.grundbuch_type || '',
              amtsgericht: objectData?.grundbuch_amtsgericht || '',
              ortGrundbuch: objectData?.ort_grundbuch || '',
              gemarkung: objectData?.grundbuch_gemarkung || '',
              blatt: objectData?.grundbuch_blatt || '',
              flur: objectData?.grundbuch_flur || '',
              flurstueck: objectData?.grundbuch_flurstueck || '',
              flurstueckNeu: objectData?.grundbuch_flurstueck_neu || '',
              grundstuecksgroesse: safeAreaToString(objectData?.grundstuecksgroesse)
            },
            baulasten: {
              vorhanden: objectData?.baulasten_vorhanden ?? null,
              art: objectData?.baulasten_art || ''
            },
            altlasten: {
              vorhanden: objectData?.altlasten_vorhanden ?? null,
              art: objectData?.altlasten_art || ''
            }
          },
          step5: {
            baugrundstuck: {
              kaufpreis: safeFormatCurrencyForDisplay(costData?.grundstueck_kaufpreis),
              wert: safeFormatCurrencyForDisplay(costData?.grundstueck_wert),
              erschliessungskosten: safeFormatCurrencyForDisplay(costData?.erschliessungskosten),
              standortbedingteMehrkosten: safeFormatCurrencyForDisplay(costData?.standortbedingte_mehrkosten)
            },
            kaufpreis: {
              kaufpreis: safeFormatCurrencyForDisplay(costData?.kaufpreis)
            },
            baukosten: {
              kostenGebaeude: safeFormatCurrencyForDisplay(costData?.kosten_gebaeude),
              besondereBauausfuhrung: safeFormatCurrencyForDisplay(costData?.besondere_bauausfuehrung),
              wertVorhandenerGebaude: safeFormatCurrencyForDisplay(costData?.wert_vorhandener_gebaeude),
              kostenAussenanlagen: safeFormatCurrencyForDisplay(costData?.kosten_aussenanlagen),
              kostenArchitekt: safeFormatCurrencyForDisplay(costData?.kosten_architekt)
            },
            nebenkosten: {
              erwerbsnebenkosten: safeFormatCurrencyForDisplay(costData?.erwerbsnebenkosten),
              verwaltungsleistungen: safeFormatCurrencyForDisplay(costData?.verwaltungsleistungen),
              beschaffungDauerfinanzierung: safeFormatCurrencyForDisplay(costData?.beschaffung_dauerfinanzierung),
              beschaffungZwischenfinanzierung: safeFormatCurrencyForDisplay(costData?.beschaffung_zwischenfinanzierung),
              sonstigeNebenkosten: safeFormatCurrencyForDisplay(costData?.sonstige_nebenkosten),
              zusaetzlicheKosten: safeFormatCurrencyForDisplay(costData?.zusaetzliche_kosten)
            },
            gesamtkosten: formatCurrencyForDisplay(totalCosts)
          },
          step6: {
            fremddarlehen: financeData?.fremddarlehen ? financeData.fremddarlehen.map((darlehen: Fremddarlehen) => ({
              ...darlehen,
              nennbetrag: safeFormatCurrencyForDisplay(darlehen.nennbetrag)
            })) : [{
              id: '1',
              darlehenGeber: '',
              nennbetrag: '',
              zinssatz: '',
              auszahlung: '',
              tilgung: ''
            }],
            darlehenNRWBank: {
              grunddarlehen: {
                nennbetrag: safeFormatCurrencyForDisplay(financeData?.grunddarlehen_nennbetrag),
                tilgungsnachlass: ''
              },
              zusatzdarlehen: {
                familienbonus: {
                  nennbetrag: safeFormatCurrencyForDisplay(financeData?.zusatzdarlehen_familienbonus_nennbetrag),
                  tilgungsnachlass: ''
                },
                barrierefreiheit: {
                  nennbetrag: safeFormatCurrencyForDisplay(financeData?.zusatzdarlehen_barrierefreiheit_nennbetrag),
                  tilgungsnachlass: ''
                },
                bauenMitHolz: {
                  nennbetrag: safeFormatCurrencyForDisplay(financeData?.zusatzdarlehen_bauen_mit_holz_nennbetrag),
                  tilgungsnachlass: ''
                },
                standortbedingteMehrkosten: {
                  nennbetrag: safeFormatCurrencyForDisplay(financeData?.zusatzdarlehen_standortbedingte_mehrkosten_nennbetrag),
                  tilgungsnachlass: ''
                },
                begEffizienzhaus40Standard: {
                  nennbetrag: safeFormatCurrencyForDisplay(financeData?.zusatzdarlehen_effizienzhaus40_nennbetrag),
                  tilgungsnachlass: ''
                }
              },
              summeNennbetrag: '',
              summeTilgungsnachlass: ''
            },
            ergaenzungsdarlehen: {
              nennbetrag: safeFormatCurrencyForDisplay(financeData?.ergaenzungsdarlehen_nennbetrag)
            },
            eigenleistung: {
              eigeneGeldmittel: safeFormatCurrencyForDisplay(financeData?.eigene_geldmittel),
              zuschüsse: safeFormatCurrencyForDisplay(financeData?.zuschuesse),
              selbsthilfe: safeFormatCurrencyForDisplay(financeData?.selbsthilfe),
              wertVorhandenerGebaeudeteile: safeFormatCurrencyForDisplay(financeData?.wert_vorhandener_gebaeudeteile),
              wertBaugrundstück: safeFormatCurrencyForDisplay(financeData?.wert_baugrundstueck),
              summeEigenleistung: ''
            },
            gesamtbetraege: ''
          }
        };

        setFormData(loadedFormData);
        console.log('Data load completed successfully');
      } catch (error) {
        console.error('Error loading saved data:', error);
      } finally {
        // Always reset loading state
        setIsLoading(false);
        loadingLockRef.current = false;
        console.log('Loading state and lock reset');
      }
    };

    loadSavedData();
  }, [user?.id]); // Only run when user ID changes

  const totalSteps = 6;

  const handleNext = async () => {
    if (currentStep === totalSteps) {
      // If we're on the last step, validate the form
      validateForm();
      
      // If validation is triggered, save should_show_error_haupt to true
      if (user?.id) {
        try {
          await supabase
            .from('user_data')
            .update({ 
              should_show_error_haupt: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
          
          // Update local state
          setShowValidation(true);
          setHasValidatedOnce(true);
        } catch (error) {
          console.error('Error updating shouldShowErrorHaupt:', error);
        }
      }
    } else {
      // For all other steps, just move to next step
      setCurrentStep(currentStep + 1);
      setShowValidation(hasValidatedOnce);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setShowValidation(hasValidatedOnce);
    }
  };

  const handleSave = async (navigateAfterSave: boolean = false) => {
    console.log('handleSave function called');
    
    if (!user?.id) {
      console.error('No user ID found');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Calculating hauptantrag progress...');
      // Calculate hauptantrag progress
      const hauptantragProgress = calculateProgress();
      console.log('Progress calculation completed:', hauptantragProgress);

      // Get the first person's data (main applicant)
      const mainApplicant = formData.step1.persons[0];
      
      // Load existing user data to preserve non-applicant people
      const { data: existingUserData, error: existingUserError } = await supabase
        .from('user_data')
        .select('weitere_antragstellende_personen')
        .eq('id', user.id)
        .single();

      // Load existing user financials data to preserve other financial fields
      const { data: existingUserFinancials, error: existingUserFinancialsError } = await supabase
        .from('user_financials')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (existingUserFinancialsError && existingUserFinancialsError.code !== 'PGRST116') {
        console.error('Error loading user financials data:', existingUserFinancialsError);
      }
      
      if (existingUserError && existingUserError.code !== 'PGRST116') {
        console.error('Error loading existing user data:', existingUserError);
      }
      
      // Work with UUID-based structure
      const existingPersonsObj = existingUserData?.weitere_antragstellende_personen || {};
      const updatedPersonsObj = { ...existingPersonsObj };
      
      // Process each additional applicant (skip main applicant at index 0)
      if (formData.step1.persons.length > 1) {
        formData.step1.persons.slice(1).forEach(person => {
          let personUUID: string;
          
          if (person.originalPersonId && existingPersonsObj[person.originalPersonId]) {
            // This person already exists - update their data
            personUUID = person.originalPersonId;
            const existingPerson = existingPersonsObj[personUUID];
            
            // Merge existing data with new applicant data
            updatedPersonsObj[personUUID] = {
              ...existingPerson, // Keep all original household data
              // Update with new applicant data
              title: person.title,
              firstName: person.firstName,
              lastName: person.lastName,
              nationality: person.nationality,
              birthDate: person.birthDate,
              street: person.street,
              houseNumber: person.houseNumber,
              postalCode: person.postalCode,
              city: person.city,
              phone: person.phone,
              email: person.email,
              employment: {
                type: person.employment?.type,
                details: person.employment?.details
              },
              isApplicant: true // Mark as applicant
            };
          } else {
            // This is a completely new person - generate UUID
            personUUID = person.originalPersonId || generateUUID();
            
            updatedPersonsObj[personUUID] = {
              title: person.title,
              firstName: person.firstName,
              lastName: person.lastName,
              nationality: person.nationality,
              birthDate: person.birthDate,
              street: person.street,
              houseNumber: person.houseNumber,
              postalCode: person.postalCode,
              city: person.city,
              phone: person.phone,
              email: person.email,
              employment: {
                type: person.employment?.type,
                details: person.employment?.details
              },
              isApplicant: true
            };
          }
        });
      }
      
      console.log('Saving to Supabase...');
      // Save progress to Supabase user_data table
      const { error: userError } = await supabase
        .from('user_data')
        .update({
          // Main applicant data
          title: mainApplicant.title,
          firstname: mainApplicant.firstName,
          lastname: mainApplicant.lastName,
          nationality: mainApplicant.nationality,
          birthDate: mainApplicant.birthDate,
          person_street: mainApplicant.street,
          person_housenumber: mainApplicant.houseNumber,
          person_postalcode: mainApplicant.postalCode,
          person_city: mainApplicant.city,
          phone: mainApplicant.phone,
          email: mainApplicant.email,
          employment: mainApplicant.employment?.type,
          branche: mainApplicant.employment?.details,
          hasauthorizedperson: formData.step1.representative.hasRepresentative,
          iscompany: formData.step1.representative.hasRepresentative ? formData.step1.representative.isCompany : null,
          hauptantrag_progress: hauptantragProgress, // Renamed to be specific to hauptantrag
          
          // Representative data
          bevollmaechtigte: formData.step1.representative.hasRepresentative ? {
            companyName: formData.step1.representative.companyName || null,
            postboxPostcode: formData.step1.representative.postboxPostcode || null,
            postboxCity: formData.step1.representative.postboxCity || null,
            title: formData.step1.representative.title || null,
            firstName: formData.step1.representative.firstName || null,
            lastName: formData.step1.representative.lastName || null,
            street: formData.step1.representative.street || null,
            houseNumber: formData.step1.representative.houseNumber || null,
            postalCode: formData.step1.representative.postalCode || null,
            city: formData.step1.representative.city || null,
            phone: formData.step1.representative.phone || null,
            email: formData.step1.representative.email || null
          } : null,
          
          // Additional applicants data - use UUID-based structure
          weitere_antragstellende_personen: Object.keys(updatedPersonsObj).length > 0 ? updatedPersonsObj : null,

          // Step 2 data
          adult_count: safeNumericToDatabase(formData.step2.adultCount),
          child_count: safeNumericToDatabase(formData.step2.childCount),
          is_disabled: formData.step2.isDisabled,
          is_married: formData.step2.isMarried,
          hasadditionalassets: formData.step2.hasAdditionalAssets,
          hasdoublesubsidy: formData.step2.hasDoubleSubsidy,
          childrenages: formData.step2.childrenAges || null,
          disabledadultscount: formData.step2.isDisabled ? safeNumericToDatabase(formData.step2.disabledAdultsCount) : null,
          disabledchildrencount: formData.step2.isDisabled ? safeNumericToDatabase(formData.step2.disabledChildrenCount) : null,
          additionalassetsdetails: formData.step2.hasAdditionalAssets ? formData.step2.additionalAssetsDetails || null : null,
          hasrepaidsubsidy: formData.step2.hasDoubleSubsidy ? formData.step2.hasRepaidSubsidy : null,
          subsidyamount: formData.step2.hasDoubleSubsidy ? safeFormatCurrencyForDatabase(formData.step2.subsidyAmount) : null,
          subsidyfilenumber: formData.step2.hasDoubleSubsidy ? formData.step2.subsidyFileNumber || null : null,
          subsidyauthority: formData.step2.hasDoubleSubsidy ? formData.step2.subsidyAuthority || null : null,
          hassupplementaryloan: formData.step2.hasSupplementaryLoan,
          
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (userError) throw userError;

      // Save Step 3 and 4 data to object_data table
      const { error: objectError } = await supabase
        .from('object_data')
        .upsert({
          user_id: user.id,
          // Step 3 data
          haslocationcostloan: (formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante?.includes('ersterwerb')) ? formData.step3.objektDetailsAllgemein.hasLocationCostLoan : null,
          haswoodconstructionloan: formData.step3.objektDetailsAllgemein.hasWoodConstructionLoan,
          bergsenkungsGebiet: formData.step3.objektDetailsAllgemein.bergsenkungsGebiet,
          obj_street: formData.step3.address.street || null,
          obj_house_number: formData.step3.address.houseNumber || null,
          obj_postal_code: formData.step3.address.postalCode || null,
          obj_city: formData.step3.address.city || null,
          foerderVariante: formData.step3.foerderVariante || null,
          objektart: (!formData.step3.foerderVariante)
            ? null
            : (formData.step3.foerderVariante === 'bestandserwerb-wohnung' || formData.step3.foerderVariante === 'ersterwerb-wohnung')
              ? 'wohnung'
              : formData.step3.objektart || null,
          wohnflaeche_selbstgenutzt: safeAreaToDatabase(formData.step3.objektDetailsAllgemein.wohnflaecheSelbstgenutzt),
          gesamt_wohnflaeche: safeAreaToDatabase(formData.step3.objektDetailsAllgemein.gesamtWohnflaeche),
          anzahl_zimmer: safeNumericToDatabase(formData.step3.objektDetailsAllgemein.anzahlZimmer),
          anzahl_garagen: safeNumericToDatabase(formData.step3.objektDetailsAllgemein.anzahlGaragen),
          has_gewerbeflaeche: formData.step3.objektDetailsAllgemein.gewerbeflaeche.hasGewerbeflaeche,
          gewerbeflaeche: formData.step3.objektDetailsAllgemein.gewerbeflaeche.hasGewerbeflaeche ? safeAreaToDatabase(formData.step3.objektDetailsAllgemein.gewerbeflaeche.flaeche) : null,
          has_ertraege: formData.step3.objektDetailsAllgemein.ertraege.hasErtraege,
          vermietete_wohnung: formData.step3.objektDetailsAllgemein.ertraege.hasErtraege ? safeFormatCurrencyForDatabase(formData.step3.objektDetailsAllgemein.ertraege.vermieteteWohnung) : null,
          vermietete_garage: formData.step3.objektDetailsAllgemein.ertraege.hasErtraege ? safeFormatCurrencyForDatabase(formData.step3.objektDetailsAllgemein.ertraege.vermieteteGarage) : null,
          barrierefrei: (formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante?.includes('ersterwerb')) ? formData.step3.objektDetailsAllgemein.barrierefrei : null,
          beg_effizienzhaus_40_standard: (formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante?.includes('ersterwerb')) ? formData.step3.objektDetailsAllgemein.begEffizienzhaus40Standard : null,

          // Conditional fields based on foerderVariante
          anzahl_vollgeschosse: (formData.step3.foerderVariante === 'bestandserwerb-wohnung' || formData.step3.foerderVariante === 'ersterwerb-wohnung') ? safeNumericToDatabase(formData.step3.objektDetailsEigentumswohnung.anzahlVollgeschosse) : null,
          wohnungen_am_hauseingang: (formData.step3.foerderVariante === 'bestandserwerb-wohnung' || formData.step3.foerderVariante === 'ersterwerb-wohnung') ? safeNumericToDatabase(formData.step3.objektDetailsEigentumswohnung.wohnungenAmHauseingang) : null,
          lage_im_gebaeude: (formData.step3.foerderVariante === 'bestandserwerb-wohnung' || formData.step3.foerderVariante === 'ersterwerb-wohnung') ? formData.step3.objektDetailsEigentumswohnung.lageImGebaeude || null : null,
          lage_im_geschoss: (formData.step3.foerderVariante === 'bestandserwerb-wohnung' || formData.step3.foerderVariante === 'ersterwerb-wohnung') ? formData.step3.objektDetailsEigentumswohnung.lageImGeschoss || null : null,

          // Conditional fields for Neubau/Ersterwerb
          baugenehmigung_erforderlich: (formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante === 'ersterwerb-eigenheim' || formData.step3.foerderVariante === 'ersterwerb-wohnung') ? formData.step3.objektDetailsNeubauErsterwerb.baugenehmigungErforderlich : null,
          baugenehmigung_wurde_erteilt: (formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante === 'ersterwerb-eigenheim' || formData.step3.foerderVariante === 'ersterwerb-wohnung') ? formData.step3.objektDetailsNeubauErsterwerb.baugenehmigung.wurdeErteilt : null,
          erteilungs_datum: (formData.step3.foerderVariante.includes('neubau')|| formData.step3.foerderVariante === 'ersterwerb-eigenheim' || formData.step3.foerderVariante === 'ersterwerb-wohnung') && formData.step3.objektDetailsNeubauErsterwerb.baugenehmigung.wurdeErteilt ? formData.step3.objektDetailsNeubauErsterwerb.baugenehmigung.erteilungsDatum || null : null,
          aktenzeichen: (formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante === 'ersterwerb-eigenheim' || formData.step3.foerderVariante === 'ersterwerb-wohnung') && formData.step3.objektDetailsNeubauErsterwerb.baugenehmigung.wurdeErteilt ? formData.step3.objektDetailsNeubauErsterwerb.baugenehmigung.aktenzeichen || null : null,
          erteilungs_behoerde: (formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante === 'ersterwerb-eigenheim' || formData.step3.foerderVariante === 'ersterwerb-wohnung') && formData.step3.objektDetailsNeubauErsterwerb.baugenehmigung.wurdeErteilt ? formData.step3.objektDetailsNeubauErsterwerb.baugenehmigung.erteilungsBehoerde || null : null,
          bauanzeige_wurde_eingereicht: (formData.step3.foerderVariante.includes('neubau')|| formData.step3.foerderVariante === 'ersterwerb-eigenheim' || formData.step3.foerderVariante === 'ersterwerb-wohnung') ? formData.step3.objektDetailsNeubauErsterwerb.bauanzeige.wurdeEingereicht : null,
          bauanzeige_einreichungs_datum: (formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante === 'ersterwerb-eigenheim' || formData.step3.foerderVariante === 'ersterwerb-wohnung') && formData.step3.objektDetailsNeubauErsterwerb.bauanzeige.wurdeEingereicht ? formData.step3.objektDetailsNeubauErsterwerb.bauanzeige.einreichungsDatum || null : null,
          bauarbeiten_wurde_begonnen: (formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante === 'ersterwerb-eigenheim' || formData.step3.foerderVariante === 'ersterwerb-wohnung') ? formData.step3.objektDetailsNeubauErsterwerb.bauarbeiten.wurdeBegonnen : null,
          bauarbeiten_beginn_datum: (formData.step3.foerderVariante.includes('neubau')|| formData.step3.foerderVariante === 'ersterwerb-eigenheim' || formData.step3.foerderVariante === 'ersterwerb-wohnung') && formData.step3.objektDetailsNeubauErsterwerb.bauarbeiten.wurdeBegonnen ? formData.step3.objektDetailsNeubauErsterwerb.bauarbeiten.beginnDatum || null : null,

          // Conditional field for Bestandserwerb
          bestandserwerb_baujahr: (formData.step3.foerderVariante === 'bestandserwerb-wohnung' || formData.step3.foerderVariante === 'bestandserwerb-eigenheim') ? safeNumericToDatabase(formData.step3.objektDetailsBestandserwerb.baujahr) : null,

          // Step 4 data
          eigentumsverhaeltnis: formData.step4.eigentumsverhaeltnis,
          kaufvertrag_wurde_abgeschlossen: formData.step4.kaufvertrag.wurdeAbgeschlossen,
          kaufvertrag_abschluss_datum: formData.step4.kaufvertrag.wurdeAbgeschlossen ? (formData.step4.kaufvertrag.abschlussDatum || null) : null,
          erbbaurecht: formData.step4.eigentumsverhaeltnis ? formData.step4.erbbaurecht : null,
          restlaufzeit_erbbaurecht: formData.step4.eigentumsverhaeltnis && formData.step4.erbbaurecht ? safeNumericToDatabase(formData.step4.restlaufzeitErbbaurecht) : null,
          grundbuch_type: (() => {
            const erbbaurecht = formData.step4.erbbaurecht;
            const grundbuchType = formData.step4.grundbuch.type;
            
            // If erbbaurecht is true, only erbbau types are valid
            if (erbbaurecht === true && formData.step4.eigentumsverhaeltnis === true) {
              const validErbbauTypes = ['erbbaugrundbuch', 'wohnungserbbaugrundbuch', 'teileigentumserbbaugrundbuch'];
              if (!validErbbauTypes.includes(grundbuchType)) {
                return null;
              }
            }
            
            // If erbbaurecht is explicitly false, only non-erbbau types are valid
            if (erbbaurecht === false) {
              const validNonErbbauTypes = ['grundbuch', 'wohnungsgrundbuch', 'teileigentumsgrundbuch'];
              if (!validNonErbbauTypes.includes(grundbuchType)) {
                return null;
              }
            }
            
            return grundbuchType;
          })(),
          grundbuch_amtsgericht: formData.step4.grundbuch.amtsgericht,
          ort_grundbuch: formData.step4.grundbuch.ortGrundbuch,
          grundbuch_gemarkung: formData.step4.grundbuch.gemarkung,
          grundbuch_blatt: formData.step4.grundbuch.blatt,
          grundbuch_flur: formData.step4.grundbuch.flur,
          grundbuch_flurstueck: formData.step4.grundbuch.flurstueck,
          grundbuch_flurstueck_neu: formData.step4.grundbuch.flurstueckNeu,
          grundstuecksgroesse: safeAreaToDatabase(formData.step4.grundbuch.grundstuecksgroesse),
          baulasten_vorhanden: formData.step4.baulasten.vorhanden,
          baulasten_art: formData.step4.baulasten.vorhanden ? formData.step4.baulasten.art : null,
          altlasten_vorhanden: formData.step4.altlasten.vorhanden,
          altlasten_art: formData.step4.altlasten.vorhanden ? formData.step4.altlasten.art : null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (objectError) throw objectError;

      // Save Step 5 data to cost_structure table
      const { error: costError } = await supabase
        .from('cost_structure')
        .upsert({
          user_id: user.id,
          // Baugrundstück (only for Neubau)
          grundstueck_kaufpreis: formData.step3.foerderVariante.includes('neubau') ? safeFormatCurrencyForDatabase(formData.step5.baugrundstuck.kaufpreis) : null,
          grundstueck_wert: formData.step3.foerderVariante.includes('neubau') ? safeFormatCurrencyForDatabase(formData.step5.baugrundstuck.wert) : null,
          erschliessungskosten: formData.step3.foerderVariante.includes('neubau') ? safeFormatCurrencyForDatabase(formData.step5.baugrundstuck.erschliessungskosten) : null,
          standortbedingte_mehrkosten: ((formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante.includes('ersterwerb')) && formData.step3.objektDetailsAllgemein.hasLocationCostLoan) ? safeFormatCurrencyForDatabase(formData.step5.baugrundstuck.standortbedingteMehrkosten) : null,

          // Kaufpreis (only for bestandserwerb or ersterwerb)
          kaufpreis: (formData.step3.foerderVariante.includes('bestandserwerb') || formData.step3.foerderVariante.includes('ersterwerb')) 
            ? safeFormatCurrencyForDatabase(formData.step5.kaufpreis.kaufpreis) 
            : null,

          // Baukosten (only for Neubau or Nutzungsänderung)
          kosten_gebaeude: formData.step3.foerderVariante.includes('neubau') ? safeFormatCurrencyForDatabase(formData.step5.baukosten.kostenGebaeude) : null,
          besondere_bauausfuehrung: (formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante === 'nutzungsaenderung') 
            ? safeFormatCurrencyForDatabase(formData.step5.baukosten.besondereBauausfuhrung) 
            : null,
          wert_vorhandener_gebaeude: (formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante === 'nutzungsaenderung') 
            ? safeFormatCurrencyForDatabase(formData.step5.baukosten.wertVorhandenerGebaude) 
            : null,
          kosten_aussenanlagen: (formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante === 'nutzungsaenderung') 
            ? safeFormatCurrencyForDatabase(formData.step5.baukosten.kostenAussenanlagen) 
            : null,
          kosten_architekt: (formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante === 'nutzungsaenderung') 
            ? safeFormatCurrencyForDatabase(formData.step5.baukosten.kostenArchitekt) 
            : null,

          // Nebenkosten (always saved)
          erwerbsnebenkosten: safeFormatCurrencyForDatabase(formData.step5.nebenkosten.erwerbsnebenkosten),
          verwaltungsleistungen: safeFormatCurrencyForDatabase(formData.step5.nebenkosten.verwaltungsleistungen),
          beschaffung_dauerfinanzierung: safeFormatCurrencyForDatabase(formData.step5.nebenkosten.beschaffungDauerfinanzierung),
          beschaffung_zwischenfinanzierung: safeFormatCurrencyForDatabase(formData.step5.nebenkosten.beschaffungZwischenfinanzierung),
          sonstige_nebenkosten: safeFormatCurrencyForDatabase(formData.step5.nebenkosten.sonstigeNebenkosten),
          zusaetzliche_kosten: safeFormatCurrencyForDatabase(formData.step5.nebenkosten.zusaetzlicheKosten),
          
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (costError) throw costError;

      // Save Step 6 data to finance_structure table
      const { error: financeError } = await supabase
        .from('finance_structure')
        .upsert({
          user_id: user.id,
          // Save Fremddarlehen as JSONB
          fremddarlehen: formData.step6.fremddarlehen.map((darlehen: Fremddarlehen) => ({
            ...darlehen,
            nennbetrag: safeFormatCurrencyForDatabase(darlehen.nennbetrag)
          })),

          // NRW Bank data - only save if hasSupplementaryLoan is not true
          grunddarlehen_nennbetrag: !formData.step2.hasSupplementaryLoan ? 
            safeFormatCurrencyForDatabase(formData.step6.darlehenNRWBank.grunddarlehen.nennbetrag) : null,
          
          // Zusatzdarlehen data - only save if hasSupplementaryLoan is not true and conditions are met
          zusatzdarlehen_familienbonus_nennbetrag: (!formData.step2.hasSupplementaryLoan && parseInt(formData.step2.childCount) > 0) ? 
            safeFormatCurrencyForDatabase(formData.step6.darlehenNRWBank.zusatzdarlehen.familienbonus.nennbetrag) : null,
          
          zusatzdarlehen_bauen_mit_holz_nennbetrag: (!formData.step2.hasSupplementaryLoan && formData.step3.objektDetailsAllgemein.hasWoodConstructionLoan) ? 
            safeFormatCurrencyForDatabase(formData.step6.darlehenNRWBank.zusatzdarlehen.bauenMitHolz.nennbetrag) : null,

          zusatzdarlehen_barrierefreiheit_nennbetrag: (!formData.step2.hasSupplementaryLoan && formData.step3.objektDetailsAllgemein.barrierefrei && (formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante?.includes('ersterwerb'))) ? 
            safeFormatCurrencyForDatabase(formData.step6.darlehenNRWBank.zusatzdarlehen.barrierefreiheit.nennbetrag) : null,
          
          zusatzdarlehen_standortbedingte_mehrkosten_nennbetrag: (!formData.step2.hasSupplementaryLoan && formData.step3.objektDetailsAllgemein.hasLocationCostLoan && (formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante?.includes('ersterwerb'))) ? 
            safeFormatCurrencyForDatabase(formData.step6.darlehenNRWBank.zusatzdarlehen.standortbedingteMehrkosten.nennbetrag) : null,
          
          zusatzdarlehen_effizienzhaus40_nennbetrag: (!formData.step2.hasSupplementaryLoan && formData.step3.objektDetailsAllgemein.begEffizienzhaus40Standard && (formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante?.includes('ersterwerb'))) ? 
            safeFormatCurrencyForDatabase(formData.step6.darlehenNRWBank.zusatzdarlehen.begEffizienzhaus40Standard.nennbetrag) : null,

          // Ergänzungsdarlehen - only save if hasSupplementaryLoan is true
          ergaenzungsdarlehen_nennbetrag: formData.step2.hasSupplementaryLoan ? 
            safeFormatCurrencyForDatabase(formData.step6.ergaenzungsdarlehen.nennbetrag) : null,

          // Eigenleistung data
          eigene_geldmittel: safeFormatCurrencyForDatabase(formData.step6.eigenleistung.eigeneGeldmittel),
          zuschuesse: safeFormatCurrencyForDatabase(formData.step6.eigenleistung.zuschüsse),
          selbsthilfe: safeFormatCurrencyForDatabase(formData.step6.eigenleistung.selbsthilfe),
          
          // Conditional Eigenleistung fields
          wert_vorhandener_gebaeudeteile: (formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante === 'nutzungsaenderung') ? 
            safeFormatCurrencyForDatabase(formData.step6.eigenleistung.wertVorhandenerGebaeudeteile) : null,
          
          wert_baugrundstueck: formData.step3.foerderVariante.includes('neubau') ? 
            safeFormatCurrencyForDatabase(formData.step6.eigenleistung.wertBaugrundstück) : null,
          
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (financeError) throw financeError;

      // Save steuerid data to user_financials table
      const { error: saveUserFinancialsError } = await supabase
        .from('user_financials')
        .upsert({
          user_id: user.id,
          steuerid: mainApplicant.steuerid || null,
          additional_applicants_financials: (() => {
            // Get existing additional_applicants_financials data
            const existingAdditionalFinancials = existingUserFinancials?.additional_applicants_financials || {};
            const updatedAdditionalFinancials = { ...existingAdditionalFinancials };
            
            // Update steuerid for each additional applicant
            formData.step1.persons.slice(1).forEach(person => {
              if (person.originalPersonId) {
                const existingPersonFinancials = updatedAdditionalFinancials[person.originalPersonId] || {};
                updatedAdditionalFinancials[person.originalPersonId] = {
                  ...existingPersonFinancials,
                  steuerid: person.steuerid || null
                };
              }
            });
            
            return Object.keys(updatedAdditionalFinancials).length > 0 ? updatedAdditionalFinancials : null;
          })(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (saveUserFinancialsError) throw saveUserFinancialsError;

      // Also save to local storage as backup
      localStorage.setItem('hauptantragFormData', JSON.stringify(formData));

      // If we get here, all saves were successful
      console.log('All saves completed successfully');
      setHasUnsavedChanges(false);
      
      // Navigate to personal space only if navigateAfterSave is true
      if (navigateAfterSave) {
        navigate('/personal-space');
      }
    } catch (error) {
      console.error('Error saving form data:', error);
      // Fallback to local storage if Supabase save fails
      localStorage.setItem('hauptantragFormData', JSON.stringify(formData));
      // Don't navigate on error
    } finally {
      setIsLoading(false);
      loadingLockRef.current = false;
      console.log('Loading state and lock reset');
    }
  };

  const updateFormData = (stepKey: keyof FormData, data: any) => {
    setFormData(prev => ({
      ...prev,
      [stepKey]: data
    }));
    setHasUnsavedChanges(true);
  };



  // Check if person has household data by looking for behinderungsgrad
  const checkIfPersonHasHouseholdData = async (personId: string): Promise<boolean> => {
    if (!user?.id) return false;
    
    try {
      const { data: userData, error } = await supabase
        .from('user_data')
        .select('weitere_antragstellende_personen')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error checking household data:', error);
        return false;
      }

      const weiterePersonen = userData?.weitere_antragstellende_personen || {};
      const person = weiterePersonen[personId];
      
      // Check if person has behinderungsgrad set (indicates they were added to household)
      return person && person.behinderungsgrad !== undefined && person.behinderungsgrad !== null;
    } catch (error) {
      console.error('Error checking household data:', error);
      return false;
    }
  };

  // Modified delete person function with useCallback
  const deletePerson = useCallback(async (index: number) => {
    const person = formData.step1.persons[index];
    if (!person?.originalPersonId) {
      // New person without originalPersonId - just remove directly from UI
      const updatedPersons = formData.step1.persons.filter((_, i) => i !== index);
      updateFormData('step1', {
        ...formData.step1,
        persons: updatedPersons
      });
      return;
    }

    // Check if person has household data
    const hasHouseholdData = await checkIfPersonHasHouseholdData(person.originalPersonId);
    
    if (hasHouseholdData) {
      // Show modal with options - add defensive check
      try {
        setPersonToDelete({
          index,
          person,
          hasHouseholdData
        });
        setShowDeleteModal(true);
      } catch (error) {
        console.error('Error setting delete modal state:', error);
        // Fallback: directly remove the person
        const updatedPersons = formData.step1.persons.filter((_, i) => i !== index);
        updateFormData('step1', {
          ...formData.step1,
          persons: updatedPersons
        });
      }
    } else {
      // No household data - remove completely from database and UI
      if (!user?.id) return;
      
      setIsLoading(true);
      try {
        // Load current database data
        const { data: userData, error } = await supabase
          .from('user_data')
          .select('weitere_antragstellende_personen')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error loading user data:', error);
          return;
        }

        const weiterePersonen = userData?.weitere_antragstellende_personen || {};
        const updatedPersonsObj = { ...weiterePersonen };

        // Remove the person completely from the JSON
        delete updatedPersonsObj[person.originalPersonId];

        // Update the database
        await supabase
          .from('user_data')
          .update({
            weitere_antragstellende_personen: Object.keys(updatedPersonsObj).length > 0 ? updatedPersonsObj : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        // Update the UI
        const updatedPersons = formData.step1.persons.filter((_, i) => i !== index);
        updateFormData('step1', {
          ...formData.step1,
          persons: updatedPersons
        });

        setHasUnsavedChanges(true);
      } catch (error) {
        console.error('Error removing person:', error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [formData.step1.persons, user?.id]); // Only include data dependencies, state setters are stable

  // Handle deletion modal options with useCallback
  const handleDeleteOption = useCallback(async (option: 'remove-applicant' | 'remove-completely') => {
    if (!personToDelete || !user?.id) return;
    
    setIsLoading(true);
    try {
      const { data: userData, error } = await supabase
        .from('user_data')
        .select('weitere_antragstellende_personen')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading user data:', error);
        return;
      }

      const weiterePersonen = userData?.weitere_antragstellende_personen || {};
      const updatedPersonsObj = { ...weiterePersonen };

      if (option === 'remove-applicant') {
        // Set isApplicant to false but keep all other data
        if (updatedPersonsObj[personToDelete.person.originalPersonId]) {
          updatedPersonsObj[personToDelete.person.originalPersonId] = {
            ...updatedPersonsObj[personToDelete.person.originalPersonId],
            isApplicant: false
          };
        }
      } else if (option === 'remove-completely') {
        // Remove the person completely from the JSON and all related data
        await completelyRemovePerson(user.id, personToDelete.person.originalPersonId);
        delete updatedPersonsObj[personToDelete.person.originalPersonId];
      }

      // Update the database
      await supabase
        .from('user_data')
        .update({
          weitere_antragstellende_personen: Object.keys(updatedPersonsObj).length > 0 ? updatedPersonsObj : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      // Update the form data by removing the person from the UI
      const updatedPersons = formData.step1.persons.filter((_, i) => i !== personToDelete.index);
      updateFormData('step1', {
        ...formData.step1,
        persons: updatedPersons
      });

      setShowDeleteModal(false);
      setPersonToDelete(null);
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error('Error handling delete option:', error);
    } finally {
      setIsLoading(false);
    }
  }, [personToDelete, user?.id, formData.step1, updateFormData]);

  // Date validation helper function
  const isValidDate = (date: string): boolean => {
    if (!date) return false;
    
    const inputDate = new Date(date);
    const now = new Date();
    const minDate = new Date(now.getFullYear() - 20, now.getMonth(), now.getDate());
    
    return inputDate <= now && inputDate >= minDate;
  };

  // Simple inline function to get postcode validation data
  const getPostcodeValidationData = (postcode: string) => {
    // Use the imported function to get the actual max limit based on postcode
    const maxLimit = getMaxLimitForPostcode(postcode);
    return { maxLimit };
  };

  const validateForm = () => {
    setShowValidation(true);
    setHasValidatedOnce(true);
    const errors: Record<number, string[]> = {};

    // Validate Step 1
    errors[1] = [];
    formData.step1.persons.forEach((person, index) => {
      if (!person.title) errors[1].push(`Person ${index + 1}: Titel ist erforderlich`);
      if (!person.firstName) errors[1].push(`Person ${index + 1}: Vorname ist erforderlich`);
      if (!person.lastName) errors[1].push(`Person ${index + 1}: Name ist erforderlich`);
      if (!person.birthDate) errors[1].push(`Person ${index + 1}: Geburtsdatum ist erforderlich`);
      else {
        const date = new Date(person.birthDate);
        const now = new Date();
        const minDate = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate());
        const maxDate = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate());
        
        if (date < minDate || date > maxDate) {
          errors[1].push(`Person ${index + 1}: Geburtsdatum liegt außerhalb des gültigen Bereichs (Antragsteller muss mindestens 18 Jahre alt und nicht älter als 120 Jahre sein)`);
        }
      }
      if (!person.nationality) errors[1].push(`Person ${index + 1}: Staatsangehörigkeit ist erforderlich`);
      if (!person.steuerid) errors[1].push(`Person ${index + 1}: Steuer-ID ist erforderlich`);
      if (!person.street) errors[1].push(`Person ${index + 1}: Straße ist erforderlich`);
      if (!person.houseNumber) errors[1].push(`Person ${index + 1}: Hausnummer ist erforderlich`);
      if (!person.postalCode) errors[1].push(`Person ${index + 1}: Postleitzahl ist erforderlich`);
      else {
        if (!/^\d{5}$/.test(person.postalCode)) {
          errors[1].push(`Person ${index + 1}: Die Postleitzahl muss aus genau 5 Ziffern bestehen`);
        } 
      }

      if (!person.city) errors[1].push(`Person ${index + 1}: Ort ist erforderlich`);
      if (!person.phone) errors[1].push(`Person ${index + 1}: Telefonnummer ist erforderlich`);
      if (!person.email) errors[1].push(`Person ${index + 1}: E-Mail ist erforderlich`);
      else if (!isValidEmail(person.email)) errors[1].push(`Person ${index + 1}: Bitte geben Sie eine gültige E-Mail-Adresse an`);
      if (!person.employment.type) errors[1].push(`Person ${index + 1}: Beschäftigungsart ist erforderlich`);
      if ((person.employment.type == 'sole-trader' || person.employment.type == 'business-owner' || person.employment.type == 'freelancer' || person.employment.type == 'farmer' || person.employment.type == 'private-income') && !person.employment.details) errors[1].push(`Person ${index + 1}: Branche ist erforderlich`);
    });
    if (formData.step1.representative.hasRepresentative === null) errors[1].push('Bitte geben Sie an, ob Sie einen Bevollmächtigten angeben wollen');
    if (formData.step1.representative.hasRepresentative === true) {
      if (formData.step1.representative.isCompany === null) errors[1].push('Bitte geben Sie an, ob es sich um eine Firma handelt');
      // Representative Company Info
      if (formData.step1.representative.isCompany === true) {
        if (!formData.step1.representative.companyName) errors[1].push('Bitte geben Sie den Namen der Bevollmächtigten Firma an');
        if (!formData.step1.representative.postboxCity) errors[1].push('Bitte geben Sie den Ort des Postfachs der Bevollmächtigten Firma an');
        if (!formData.step1.representative.postboxPostcode) errors[1].push('Bitte geben Sie die Postleitzahl des Postfachs der Bevollmächtigten Firma an');
      }
      // Representative Personal Info
      if (formData.step1.representative.isCompany === false) {
        if (!formData.step1.representative.title) errors[1].push('Bitte geben Sie den Titel des Bevollmächtigten an');
        if (!formData.step1.representative.firstName) errors[1].push('Bitte geben Sie den Vornamen des Bevollmächtigten an');
        if (!formData.step1.representative.lastName) errors[1].push('Bitte geben Sie den Nachnamen des Bevollmächtigten an');
        if (!formData.step1.representative.street) errors[1].push('Bitte geben Sie die Straße des Bevollmächtigten an');
        if (!formData.step1.representative.houseNumber) errors[1].push('Bitte geben Sie die Hausnummer des Bevollmächtigten an');
        if (!formData.step1.representative.postalCode) errors[1].push('Bitte geben Sie die Postleitzahl des Bevollmächtigten an');
        if (!formData.step1.representative.city) errors[1].push('Bitte geben Sie die Stadt des Bevollmächtigten an');
        if (!formData.step1.representative.phone) errors[1].push('Bitte geben Sie die Telefonnummer des Bevollmächtigten an');
        if (!formData.step1.representative.email) errors[1].push('Bitte geben Sie die E-Mail des Bevollmächtigten an');
        else if (!isValidEmail(formData.step1.representative.email)) errors[1].push('Bitte geben Sie eine gültige E-Mail-Adresse für den Bevollmächtigten an');
      }
    }

    // Validate Step 2
    errors[2] = [];
    if (!formData.step2.adultCount) errors[2].push('Bitte geben Sie die Anzahl der Erwachsenen an');
    if (parseInt(formData.step2.adultCount) < 0) errors[2].push('Die Anzahl der Erwachsenen darf nicht negativ sein');
    if (parseInt(formData.step2.adultCount) === 0) errors[2].push('Die Anzahl der Erwachsenen darf nicht 0 sein');
    if (!formData.step2.childCount) errors[2].push('Bitte geben Sie die Anzahl der Kinder an');
    if (parseInt(formData.step2.childCount) < 0) errors[2].push('Die Anzahl der Kinder darf nicht negativ sein');
    if (parseInt(formData.step2.childCount) > 0 && !formData.step2.childrenAges) errors[2].push('Bitte geben Sie das Alter der Kinder an');
    // Check if any child age is greater than 17
    if (formData.step2.childrenAges) {
      const ages = formData.step2.childrenAges.split(',').map(age => parseInt(age.trim()));
      if (ages.some(age => age > 17)) {
        errors[2].push('Volljährige Personen zählen als Erwachsene');
      }
    }

    if (formData.step2.isDisabled == null) errors[2].push('Bitte geben Sie an, ob behinderte Menschen in dem Haushalt leben');
    if (formData.step2.isDisabled === true) {
      const totaladults = parseInt(formData.step2.adultCount || '0');
      const totalkids = parseInt(formData.step2.childCount || '0');
      const disabledadults = parseInt(formData.step2.disabledAdultsCount || '0');
      const disabledkids = parseInt(formData.step2.disabledChildrenCount || '0');
      const totalDisabled = disabledadults + disabledkids;
      const totalHousehold = totaladults + totalkids;
      if (totalDisabled <= 0) {
        errors[2].push('Bitte geben Sie die Anzahl der behinderten Menschen in ihrem Haushalt an');
      }
      if (totalDisabled > totalHousehold) {
        errors[2].push('Die Anzahl der behinderten Menschen kann nicht größer sein als die Gesamtanzahl der Haushaltsmitglieder');
      }else{
        if (disabledadults > totaladults) {
          errors[2].push('Die Anzahl der behinderten Erwachsenen kann nicht größer sein als die Anzahl der Erwachsenen');
        }
        if (disabledkids > totalkids) {
          errors[2].push('Die Anzahl der behinderten Kinder kann nicht größer sein als die Anzahl der Kinder');
        }
      }
    }
    // Check marriage status
    if (formData.step2.isMarried === null) {
      errors[2].push('Bitte geben Sie an, ob Sie verheiratet sind oder in einer eingetragenen Lebenspartnerschaft leben');
    }
    // Check additional assets
    if (formData.step2.hasAdditionalAssets === null) {
      errors[2].push('Bitte geben Sie an, ob weiteres Vermögen vorhanden ist');
    }
    if (formData.step2.hasAdditionalAssets === true && !formData.step2.additionalAssetsDetails) {
      errors[2].push('Bitte beschreiben Sie das weitere Vermögen');
    }
    // Check double subsidy
    if (formData.step2.hasDoubleSubsidy === null) {
      errors[2].push('Bitte geben Sie an, ob Sie bereits Eigentümer eines geförderten Eigenheims oder einer geförderten Eigentumswohnung sind/waren');
    }
    if (formData.step2.hasDoubleSubsidy === true) {
      if (formData.step2.hasRepaidSubsidy === null) {
        errors[2].push('Bitte geben Sie an, ob die Fördermittel bereits zurückgezahlt wurden');
      }
      if (!formData.step2.subsidyAmount) {
        errors[2].push('Bitte geben Sie den Betrag der Fördermittel an');
      } else {
        const amount = parseFloat(formData.step2.subsidyAmount.replace(/[^\d.,]/g, '').replace(',', '.'));
        if (isNaN(amount) || amount <= 0) {
          errors[2].push('Der Betrag der Fördermittel muss größer als 0,00 € sein');
        }
      }
      if (!formData.step2.subsidyFileNumber) {
        errors[2].push('Bitte geben Sie das Aktenzeichen an');
      }
      if (!formData.step2.subsidyAuthority) {
        errors[2].push('Bitte geben Sie die Bewilligungsbehörde an');
      }
    }

    // Check supplementary loan
    if (formData.step2.hasSupplementaryLoan === null) {
      errors[2].push('Bitte geben Sie an, ob Sie ein Ergänzungsdarlehen der NRW.BANK beantragen');
    }

    // Validate Step 3
    errors[3] = [];
    
    // Address validation
    if (!formData.step3.address.street) errors[3].push('Bitte geben Sie die Straße an');
    if (!formData.step3.address.houseNumber) errors[3].push('Bitte geben Sie die Hausnummer an');
    if (!formData.step3.address.postalCode) errors[3].push('Bitte geben Sie die Postleitzahl an');
    else {
      const postalCode = formData.step3.address.postalCode;
      const validStartNumbers = ['32', '33', '34', '37', '40', '41', '42', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '57', '58', '59'];
      
      if (!/^\d{5}$/.test(postalCode)) {
        errors[3].push('Die Postleitzahl muss aus genau 5 Ziffern bestehen');
      } else if (!validStartNumbers.includes(postalCode.substring(0, 2))) {
        errors[3].push('Die Postleitzahl muss sich in Nordrhein-Westfalen befinden');
      }
    }
    if (!formData.step3.address.city) errors[3].push('Bitte geben Sie die Stadt an');

    // FoerderVariante validation
    if (!formData.step3.foerderVariante) {
      errors[3].push('Bitte wählen Sie eine Förderungsvariante aus');
    }

     // Objektart validation
     if(formData.step3.foerderVariante){
      if (!formData.step3.foerderVariante?.includes('wohnung')) {
        if (!formData.step3.objektart) {
          errors[3].push('Bitte wählen Sie eine Objektart aus');
        }
      }
    }

    // ObjektDetailsAllgemein validation
    if (!isValidAreaValue(formData.step3.objektDetailsAllgemein.wohnflaecheSelbstgenutzt)) errors[3].push('Bitte geben Sie die selbstgenutzte Wohnfläche an');
    if (!isValidAreaValue(formData.step3.objektDetailsAllgemein.gesamtWohnflaeche)) errors[3].push('Bitte geben Sie die Wohnfläche der zweiten Wohneinheit an, bzw. 0, wenn keine zweite Wohneinheit vorhanden ist');
    if (!formData.step3.objektDetailsAllgemein.anzahlZimmer) errors[3].push('Bitte geben Sie die Anzahl der Zimmer an');
    if (!formData.step3.objektDetailsAllgemein.anzahlGaragen) errors[3].push('Bitte geben Sie die Anzahl der Garagen an');

    // Gewerbefläche validation
    if (formData.step3.objektDetailsAllgemein.gewerbeflaeche.hasGewerbeflaeche === null) {
      errors[3].push('Bitte geben Sie an, ob eine Gewerbefläche vorhanden ist');
    }
    if (formData.step3.objektDetailsAllgemein.gewerbeflaeche.hasGewerbeflaeche === true && !isValidAreaValue(formData.step3.objektDetailsAllgemein.gewerbeflaeche.flaeche)) {
      errors[3].push('Bitte geben Sie die Größe der Gewerbefläche an');
    }

    // Erträge validation
    if (formData.step3.objektDetailsAllgemein.ertraege.hasErtraege === null) {
      errors[3].push('Bitte geben Sie an, ob Erträge vorhanden sind');
    }
    if (formData.step3.objektDetailsAllgemein.ertraege.hasErtraege === true) {
      if (!formData.step3.objektDetailsAllgemein.ertraege.vermieteteWohnung && !formData.step3.objektDetailsAllgemein.ertraege.vermieteteGarage) {
        errors[3].push('Bitte geben Sie mindestens einen Ertragswert ein (vermietete Wohnung oder Garage)');
      } else {
        // Check if both values are not null and sum is greater than 0
        const wohnungValue = formData.step3.objektDetailsAllgemein.ertraege.vermieteteWohnung || '';
        const garageValue = formData.step3.objektDetailsAllgemein.ertraege.vermieteteGarage || '';
        
        if (wohnungValue || garageValue) {
          const parseCurrencyValue = (value: string): number => {
            if (!value) return 0;
            return parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
          };
          
          const wohnungAmount = parseCurrencyValue(wohnungValue);
          const garageAmount = parseCurrencyValue(garageValue);
          const totalAmount = wohnungAmount + garageAmount;
          
          if (totalAmount <= 0) {
            errors[3].push('Die Summe der Ertragswerte muss größer als 0,00 € sein');
          }
        }
      }
    }
    if (formData.step3.objektDetailsAllgemein.hasWoodConstructionLoan === null) {
      errors[3].push('Bitte geben Sie an, ob Sie ein Zusatzdarlehen für Bauen mit Holz beantragen');
    }

    // Bergsenkungsgebiet validation - only for neubau, ersterwerb, or nutzungsänderung
    if (formData.step3.foerderVariante?.includes('neubau') || formData.step3.foerderVariante?.includes('ersterwerb') || formData.step3.foerderVariante === 'nutzungsaenderung') {
      if (formData.step3.objektDetailsAllgemein.bergsenkungsGebiet === null) {
        errors[3].push('Bitte geben Sie an, ob sich das Objekt in einem Bergsenkungsgebiet befindet');
      }
    }

    // Eigentumswohnung validation
    if (formData.step3.foerderVariante?.includes('wohnung')) {
      if (!formData.step3.objektDetailsEigentumswohnung.anzahlVollgeschosse) errors[3].push('Bitte geben Sie die Anzahl der Vollgeschosse an');
      if (!formData.step3.objektDetailsEigentumswohnung.wohnungenAmHauseingang) errors[3].push('Bitte geben Sie die Anzahl der Wohnungen am Hauseingang an');
      if (!formData.step3.objektDetailsEigentumswohnung.lageImGebaeude) errors[3].push('Bitte geben Sie die Lage im Gebäude an');
      if (!formData.step3.objektDetailsEigentumswohnung.lageImGeschoss) errors[3].push('Bitte geben Sie die Lage im Geschoss an');
    }

    // Neubau/Ersterwerb validation
    if (formData.step3.foerderVariante?.includes('neubau') || formData.step3.foerderVariante?.includes('ersterwerb')) {
        // Barrierefrei and BEG validation
      if (formData.step3.objektDetailsAllgemein.barrierefrei === null) {
        errors[3].push('Bitte geben Sie an, ob das Objekt barrierefrei ist');
      }
      if (formData.step3.objektDetailsAllgemein.begEffizienzhaus40Standard === null) {
        errors[3].push('Bitte geben Sie an, ob das Objekt dem BEG Effizienzhaus 40 Standard entspricht');
      }
      if (formData.step3.objektDetailsAllgemein.hasLocationCostLoan === null) {
        errors[3].push('Bitte geben Sie an, ob Sie ein Zusatzdarlehen für standortbedingte Mehrkosten beantragen');
      }
      if (formData.step3.objektDetailsNeubauErsterwerb.baugenehmigungErforderlich === null) {
        errors[3].push('Bitte geben Sie an, ob eine Baugenehmigung erforderlich ist');
      }

      if (formData.step3.objektDetailsNeubauErsterwerb.baugenehmigungErforderlich === true) {
        if (formData.step3.objektDetailsNeubauErsterwerb.baugenehmigung.wurdeErteilt === null) {
          errors[3].push('Bitte geben Sie an, ob die Baugenehmigung erteilt wurde');
        }

        if (formData.step3.objektDetailsNeubauErsterwerb.baugenehmigung.wurdeErteilt === true) {
          if (!formData.step3.objektDetailsNeubauErsterwerb.baugenehmigung.erteilungsDatum) {
            errors[3].push('Bitte geben Sie das Erteilungsdatum der Baugenehmigung an');
          } else if (!isValidDate(formData.step3.objektDetailsNeubauErsterwerb.baugenehmigung.erteilungsDatum)) {
            errors[3].push('Das Erteilungsdatum darf weder in der Zukunft noch mehr als 20 Jahre in der Vergangenheit liegen');
          }
          if (!formData.step3.objektDetailsNeubauErsterwerb.baugenehmigung.aktenzeichen) errors[3].push('Bitte geben Sie das Aktenzeichen der Baugenehmigung an');
          if (!formData.step3.objektDetailsNeubauErsterwerb.baugenehmigung.erteilungsBehoerde) errors[3].push('Bitte geben Sie die erteilende Behörde der Baugenehmigung an');
        }
      }

      if (formData.step3.objektDetailsNeubauErsterwerb.bauanzeige.wurdeEingereicht === null) {
        errors[3].push('Bitte geben Sie an, ob eine Bauanzeige eingereicht wurde');
      }

      if (formData.step3.objektDetailsNeubauErsterwerb.bauanzeige.wurdeEingereicht === true) {
        if (!formData.step3.objektDetailsNeubauErsterwerb.bauanzeige.einreichungsDatum) {
          errors[3].push('Bitte geben Sie das Einreichungsdatum der Bauanzeige an');
        } else if (!isValidDate(formData.step3.objektDetailsNeubauErsterwerb.bauanzeige.einreichungsDatum)) {
          errors[3].push('Das Einreichungsdatum darf weder in der Zukunft noch mehr als 20 Jahre in der Vergangenheit liegen');
        }
      }

      if (formData.step3.objektDetailsNeubauErsterwerb.bauarbeiten.wurdeBegonnen === null) {
        errors[3].push('Bitte geben Sie an, ob die Bauarbeiten begonnen wurden');
      }

      if (formData.step3.objektDetailsNeubauErsterwerb.bauarbeiten.wurdeBegonnen === true) {
        if (!formData.step3.objektDetailsNeubauErsterwerb.bauarbeiten.beginnDatum) {
          errors[3].push('Bitte geben Sie das Datum des Baubeginns an');
        } else if (!isValidDate(formData.step3.objektDetailsNeubauErsterwerb.bauarbeiten.beginnDatum)) {
          errors[3].push('Das Datum des Baubeginns darf weder in der Zukunft noch mehr als 20 Jahre in der Vergangenheit liegen');
        }
      }
    }

    // Bestandserwerb validation
    if (formData.step3.foerderVariante?.includes('bestandserwerb') && !formData.step3.objektDetailsBestandserwerb.baujahr) {
      errors[3].push('Bitte geben Sie das Baujahr an');
    }

    // Validate Step 4
    errors[4] = [];
    
    // Eigentumsverhältnisse validation
    if (formData.step4.eigentumsverhaeltnis === null) {
      errors[4].push('Bitte geben Sie an, ob das Objekt im Eigentum der antragstellenden Person(en) ist');
    }

    if (formData.step4.eigentumsverhaeltnis === false) {
      if (formData.step4.kaufvertrag.wurdeAbgeschlossen === null) {
        errors[4].push('Bitte geben Sie an, ob der Kaufvertrag abgeschlossen wurde');
      }
      if (formData.step4.kaufvertrag.wurdeAbgeschlossen === true && !formData.step4.kaufvertrag.abschlussDatum) {
        errors[4].push('Bitte geben Sie das Abschlussdatum des Kaufvertrags an');
      } else if (formData.step4.kaufvertrag.wurdeAbgeschlossen === true && formData.step4.kaufvertrag.abschlussDatum && !isValidDate(formData.step4.kaufvertrag.abschlussDatum)) {
        errors[4].push('Das Abschlussdatum des Kaufvertrags darf weder in der Zukunft noch mehr als 20 Jahre in der Vergangenheit liegen');
      }
    }

    // Erbbaurecht validation - only if eigentumsverhaeltnis is true
    if (formData.step4.eigentumsverhaeltnis === true) {
      if (formData.step4.erbbaurecht === null) {
        errors[4].push('Bitte geben Sie an, ob Erbbaurecht vorhanden ist');
      }
      if (formData.step4.erbbaurecht === true && !formData.step4.restlaufzeitErbbaurecht) {
        errors[4].push('Bitte geben Sie die Restlaufzeit des Erbbaurechts an');
      }
    }

    // Grundbuch validation - only if eigentumsverhaeltnis is true
    if (formData.step4.eigentumsverhaeltnis === true) {
      if (!formData.step4.grundbuch.type) {
        errors[4].push('Bitte wählen Sie einen Grundbuchtyp aus');
      }
      if (!formData.step4.grundbuch.amtsgericht) {
        errors[4].push('Bitte geben Sie das Amtsgericht an');
      }
      if (!formData.step4.grundbuch.ortGrundbuch) {
        errors[4].push('Bitte geben Sie den Ort des Grundbuchs an');
      }
      if (!formData.step4.grundbuch.gemarkung) {
        errors[4].push('Bitte geben Sie die Gemarkung an');
      }
      if (!formData.step4.grundbuch.blatt) {
        errors[4].push('Bitte geben Sie das Blatt an');
      }
      if (!formData.step4.grundbuch.flur) {
        errors[4].push('Bitte geben Sie die Flur an');
      }
      if (!formData.step4.grundbuch.flurstueck) {
        errors[4].push('Bitte geben Sie das Flurstück an');
      }
      if (!formData.step4.grundbuch.grundstuecksgroesse || !isValidAreaValue(formData.step4.grundbuch.grundstuecksgroesse)) {
        errors[4].push('Bitte geben Sie die Grundstücksgröße an');
      }
    }

    // Baulasten validation
    if (formData.step4.baulasten.vorhanden === null) {
      errors[4].push('Bitte geben Sie an, ob Baulasten vorhanden sind');
    }
    if (formData.step4.baulasten.vorhanden === true && !formData.step4.baulasten.art) {
      errors[4].push('Bitte geben Sie die Art der Baulasten an');
    }

    // Altlasten validation
    if (formData.step4.altlasten.vorhanden === null) {
      errors[4].push('Bitte geben Sie an, ob Altlasten vorhanden sind');
    }
    if (formData.step4.altlasten.vorhanden === true && !formData.step4.altlasten.art) {
      errors[4].push('Bitte geben Sie die Art der Altlasten an');
    }

    // Validate Step 5
    errors[5] = [];
    
    // Baugrundstück validation for Neubau
    if (formData.step3.foerderVariante.includes('neubau')) {
      if (!formData.step5.baugrundstuck.kaufpreis) errors[5].push('Bitte geben Sie den Kaufpreis des Baugrundstücks an (0,00€ wenn nicht vorhanden)');
      if (!formData.step5.baugrundstuck.wert) errors[5].push('Bitte geben Sie den Wert des Baugrundstücks an (0,00€ wenn nicht vorhanden)');
      if (!formData.step5.baugrundstuck.erschliessungskosten) errors[5].push('Bitte geben Sie die Erschließungskosten an (0,00€ wenn nicht vorhanden)');
    }

    // Standortbedingte Mehrkosten validation for Neubau or Ersterwerb with hasLocationCostLoan
    if ((formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante.includes('ersterwerb')) && formData.step3.objektDetailsAllgemein.hasLocationCostLoan) {
      if (!formData.step5.baugrundstuck.standortbedingteMehrkosten) errors[5].push('Bitte geben Sie die förderfähigen standortbedingten Mehrkosten an (0,00€ wenn nicht vorhanden)');
    }

    // Kaufpreis validation for Bestandserwerb or Ersterwerb
    if (formData.step3.foerderVariante?.includes('bestandserwerb') || formData.step3.foerderVariante?.includes('ersterwerb')) {
      if (!formData.step5.kaufpreis.kaufpreis) errors[5].push('Bitte geben Sie den Kaufpreis an');
    }

    // Baukosten validation for Neubau or Nutzungsänderung
    if (formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante === 'nutzungsaenderung') {
      if (formData.step3.foerderVariante.includes('neubau') && !formData.step5.baukosten.kostenGebaeude) {
        errors[5].push('Bitte geben Sie die Kosten des Gebäudes an');
      }
      if (!formData.step5.baukosten.besondereBauausfuhrung) errors[5].push('Bitte geben Sie die besondere Bauausführung an (0,00€ wenn nicht vorhanden)');
      if (!formData.step5.baukosten.wertVorhandenerGebaude) errors[5].push('Bitte geben Sie den Wert vorhandener Gebäudeteile an (0,00€ wenn nicht vorhanden)');
      if (!formData.step5.baukosten.kostenAussenanlagen) errors[5].push('Bitte geben Sie die Kosten der Außenanlagen an (0,00€ wenn nicht vorhanden)');
      if (!formData.step5.baukosten.kostenArchitekt) errors[5].push('Bitte geben Sie die Kosten der Architekten- und Ingenieurleistungen an (0,00€ wenn nicht vorhanden)');
    }

    // Nebenkosten validation (always required)
    if (!formData.step5.nebenkosten.erwerbsnebenkosten) errors[5].push('Bitte geben Sie die Erwerbsnebenkosten an (0,00€ wenn nicht vorhanden)');
    if (!formData.step5.nebenkosten.verwaltungsleistungen) errors[5].push('Bitte geben Sie die Kosten der Verwaltungsleistungen an (0,00€ wenn nicht vorhanden)');
    if (!formData.step5.nebenkosten.beschaffungDauerfinanzierung) errors[5].push('Bitte geben Sie die Kosten der Beschaffung der Dauerfinanzierungsmittel an (0,00€ wenn nicht vorhanden)');
    if (!formData.step5.nebenkosten.beschaffungZwischenfinanzierung) errors[5].push('Bitte geben Sie die Kosten der Beschaffung und Verzinsung der Zwischenfinanzierung an (0,00€ wenn nicht vorhanden)');
    if (!formData.step5.nebenkosten.sonstigeNebenkosten) errors[5].push('Bitte geben Sie die sonstigen Nebenkosten an (0,00€ wenn nicht vorhanden)');
    if (!formData.step5.nebenkosten.zusaetzlicheKosten) errors[5].push('Bitte geben Sie die zusätzlichen Kosten an (0,00€ wenn nicht vorhanden)');

    // Validate Step 6
    errors[6] = [];

    // Validate Fremddarlehen fields
    formData.step6.fremddarlehen.forEach((darlehen, index) => {
      // Check if any field has a value (excluding the id field)
      const hasAnyValue = Object.entries(darlehen)
        .filter(([key]) => key !== 'id') // Exclude the id field from the check
        .some(([_, value]) => value !== '');
      
      if (hasAnyValue) {
        if (!darlehen.darlehenGeber) errors[6].push(`Fremddarlehen ${index + 1}: Bitte geben Sie den Darlehensgeber an`);
        if (!darlehen.nennbetrag) errors[6].push(`Fremddarlehen ${index + 1}: Bitte geben Sie den Nennbetrag an`);
        if (!darlehen.zinssatz) errors[6].push(`Fremddarlehen ${index + 1}: Bitte geben Sie den Zinssatz an`);
        if (!darlehen.auszahlung) errors[6].push(`Fremddarlehen ${index + 1}: Bitte geben Sie die Auszahlung an`);
        if (!darlehen.tilgung) errors[6].push(`Fremddarlehen ${index + 1}: Bitte geben Sie die Tilgung an`);
      }
    });

    // Validate Ergänzungsdarlehen if hasSupplementaryLoan is true
    if (formData.step2.hasSupplementaryLoan === true) {
      if (!formData.step6.ergaenzungsdarlehen.nennbetrag) {
        errors[6].push('Bitte geben Sie den Nennbetrag des Ergänzungsdarlehens an');
      } else {
        // Validate Ergänzungsdarlehen limits (max 50K, min 2K)
        const getNumericValue = (value: string) => Number(value.replace(/[^0-9]/g, ''));
        const formatCurrency = (value: number): string => {
          return new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2
          }).format(value/100);
        };
        const ergaenzungsdarlehenValue = getNumericValue(formData.step6.ergaenzungsdarlehen.nennbetrag);
        const maxErgaenzungsdarlehen = 5000000; // 50,000 EUR in cents
        const minErgaenzungsdarlehen = 200000; // 2,000 EUR in cents
        
        if (ergaenzungsdarlehenValue > maxErgaenzungsdarlehen) {
          errors[6].push(`Ergänzungsdarlehen darf maximal 50.000,00€ betragen (aktuell: ${formatCurrency(ergaenzungsdarlehenValue)})`);
        }
        if (ergaenzungsdarlehenValue < minErgaenzungsdarlehen) {
          errors[6].push(`Ergänzungsdarlehen muss mindestens 2.000,00€ betragen (aktuell: ${formatCurrency(ergaenzungsdarlehenValue)})`);
        }
      }
    } else {
      // Validate NRW Bank Darlehen
      if (!formData.step6.darlehenNRWBank.grunddarlehen.nennbetrag) {
        errors[6].push('Bitte geben Sie den Nennbetrag des Grunddarlehens an');
      } else {
        // Validate Grunddarlehen limit based on postcode
        const getNumericValue = (value: string) => Number(value.replace(/[^0-9]/g, ''));
        const formatCurrencyLocal = (value: number): string => {
          return new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2
          }).format(value/100);
        };
        
        // Validate Grunddarlehen limit based on postcode
        const grunddarlehenValue = getNumericValue(formData.step6.darlehenNRWBank.grunddarlehen.nennbetrag);
        
        // Get postcode validation data
        const postcodeValidation = getPostcodeValidationData(formData.step3.address.postalCode);
        const maxGrunddarlehen = postcodeValidation.maxLimit; // Dynamic limit based on postcode
        
        if (grunddarlehenValue > maxGrunddarlehen) {
          errors[6].push(`Grunddarlehen darf maximal ${formatCurrencyLocal(maxGrunddarlehen)} betragen (aktuell: ${formatCurrencyLocal(grunddarlehenValue)})`);
        }
      }

      // Validate Familienbonus if childCount > 0
      if (parseInt(formData.step2.childCount) > 0 && !formData.step6.darlehenNRWBank.zusatzdarlehen.familienbonus.nennbetrag) {
        errors[6].push('Bitte geben Sie den Nennbetrag des Familienbonus an (0,00€ wenn nicht vorhanden)');
      } else if (parseInt(formData.step2.childCount) > 0 && formData.step6.darlehenNRWBank.zusatzdarlehen.familienbonus.nennbetrag) {
        // Validate Familienbonus limit (max (childCount + disabledAdultsCount) * 24K)
        const getNumericValue = (value: string) => Number(value.replace(/[^0-9]/g, ''));
        const formatCurrency = (value: number): string => {
          return new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2
          }).format(value/100);
        };
        const familienbonusValue = getNumericValue(formData.step6.darlehenNRWBank.zusatzdarlehen.familienbonus.nennbetrag);
        const totalEligibleCount = parseInt(formData.step2.childCount) + parseInt(formData.step2.disabledAdultsCount || '0');
        const maxFamilienbonus = totalEligibleCount * 2400000; // 24,000 EUR per person in cents
        
        if (familienbonusValue > maxFamilienbonus) {
          errors[6].push(`Familienbonus darf maximal ${formatCurrency(maxFamilienbonus)} betragen (${totalEligibleCount} berechtigte Personen × 24.000,00€, aktuell: ${formatCurrency(familienbonusValue)})`);
        }
      }
      // Validate Bauen mit Holz
      if (formData.step3.objektDetailsAllgemein.hasWoodConstructionLoan === true && !formData.step6.darlehenNRWBank.zusatzdarlehen.bauenMitHolz.nennbetrag) {
        errors[6].push('Bitte geben Sie den Nennbetrag für Bauen mit Holz an (0,00€ wenn nicht vorhanden)');
      } else if (formData.step3.objektDetailsAllgemein.hasWoodConstructionLoan === true && formData.step6.darlehenNRWBank.zusatzdarlehen.bauenMitHolz.nennbetrag) {
        // Validate Bauen mit Holz limit (max 17,000 EUR)
        const getNumericValue = (value: string) => Number(value.replace(/[^0-9]/g, ''));
        const formatCurrency = (value: number): string => {
          return new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2
          }).format(value/100);
        };
        const holzValue = getNumericValue(formData.step6.darlehenNRWBank.zusatzdarlehen.bauenMitHolz.nennbetrag);
        const maxHolz = 1700000; // 17,000 EUR in cents
        
        if (holzValue > maxHolz) {
          errors[6].push(`Bauen mit Holz darf maximal 17.000,00€ betragen (aktuell: ${formatCurrency(holzValue)})`);
        }
      }
      // Validate Barrierefreiheit if barrierefrei is true
      if ((formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante?.includes('ersterwerb')) && 
          formData.step3.objektDetailsAllgemein.barrierefrei === true && 
          !formData.step6.darlehenNRWBank.zusatzdarlehen.barrierefreiheit.nennbetrag) {
        errors[6].push('Bitte geben Sie den Nennbetrag für Barrierefreiheit an (0,00€ wenn nicht vorhanden)');
      } else if ((formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante?.includes('ersterwerb')) && 
          formData.step3.objektDetailsAllgemein.barrierefrei === true && 
          formData.step6.darlehenNRWBank.zusatzdarlehen.barrierefreiheit.nennbetrag) {
        // Validate Barrierefreiheit limit (max 11,500 EUR)
        const getNumericValue = (value: string) => Number(value.replace(/[^0-9]/g, ''));
        const formatCurrency = (value: number): string => {
          return new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2
          }).format(value/100);
        };
        const barrierefreiValue = getNumericValue(formData.step6.darlehenNRWBank.zusatzdarlehen.barrierefreiheit.nennbetrag);
        const maxBarrierefrei = 1150000; // 11,500 EUR in cents
        
        if (barrierefreiValue > maxBarrierefrei) {
          errors[6].push(`Barrierefreiheit darf maximal 11.500,00€ betragen (aktuell: ${formatCurrency(barrierefreiValue)})`);
        }
      }
      // Validate Standortbedingte Mehrkosten
      if ((formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante?.includes('ersterwerb')) && 
          formData.step3.objektDetailsAllgemein.hasLocationCostLoan === true && 
          !formData.step6.darlehenNRWBank.zusatzdarlehen.standortbedingteMehrkosten.nennbetrag) {
        errors[6].push('Bitte geben Sie den Nennbetrag für standortbedingte Mehrkosten an (0,00€ wenn nicht vorhanden)');
      } else if ((formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante?.includes('ersterwerb')) && 
          formData.step3.objektDetailsAllgemein.hasLocationCostLoan === true && 
          formData.step6.darlehenNRWBank.zusatzdarlehen.standortbedingteMehrkosten.nennbetrag) {
        // Validate Standortbedingte Mehrkosten limit (max 25,000 EUR)
        const getNumericValue = (value: string) => Number(value.replace(/[^0-9]/g, ''));
        const formatCurrency = (value: number): string => {
          return new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2
          }).format(value/100);
        };
        const standortValue = getNumericValue(formData.step6.darlehenNRWBank.zusatzdarlehen.standortbedingteMehrkosten.nennbetrag);
        const maxStandort = 2500000; // 25,000 EUR in cents
        
        if (standortValue > maxStandort) {
          errors[6].push(`Das Zusatzdarlehn für standortbedingte Mehrkosten darf maximal 25.000,00€ betragen (aktuell: ${formatCurrency(standortValue)})`);
        } else if (formData.step5.baugrundstuck.standortbedingteMehrkosten) {
          const costValue = getNumericValue(formData.step5.baugrundstuck.standortbedingteMehrkosten);
          const maxZusatzdarlehen = Math.round(costValue * 0.75);
          
          if (standortValue > maxZusatzdarlehen) {
            errors[6].push(`Der Nennbetrag des Zusatzdarlehens für standortbedingte Mehrkosten darf maximal 75 % der angegebenen förderfähigen standortbedingten Mehrkosten betragen (maximal ${formatCurrency(maxZusatzdarlehen)}, aktuell: ${formatCurrency(standortValue)})`);
          }
        }
      }

      // Validate BEG Effizienzhaus 40 Standard if begEffizienzhaus40Standard is true
      if ((formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante?.includes('ersterwerb')) && 
          formData.step3.objektDetailsAllgemein.begEffizienzhaus40Standard === true && 
          !formData.step6.darlehenNRWBank.zusatzdarlehen.begEffizienzhaus40Standard.nennbetrag) {
        errors[6].push('Bitte geben Sie den Nennbetrag für BEG Effizienzhaus 40 Standard an (0,00€ wenn nicht vorhanden)');
      } else if ((formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante?.includes('ersterwerb')) && 
          formData.step3.objektDetailsAllgemein.begEffizienzhaus40Standard === true && 
          formData.step6.darlehenNRWBank.zusatzdarlehen.begEffizienzhaus40Standard.nennbetrag) {
        // Validate BEG Effizienzhaus 40 Standard limit (max 30,000 EUR)
        const getNumericValue = (value: string) => Number(value.replace(/[^0-9]/g, ''));
        const formatCurrency = (value: number): string => {
          return new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2
          }).format(value/100);
        };
        const begValue = getNumericValue(formData.step6.darlehenNRWBank.zusatzdarlehen.begEffizienzhaus40Standard.nennbetrag);
        const maxBeg = 3000000; // 30,000 EUR in cents
        
        if (begValue > maxBeg) {
          errors[6].push(`BEG Effizienzhaus 40 Standard darf maximal 30.000,00€ betragen (aktuell: ${formatCurrency(begValue)})`);
        }
      }
    }

    // Validate Eigenleistung fields (always required)
    if (!formData.step6.eigenleistung.eigeneGeldmittel) errors[6].push('Bitte geben Sie die eigenen Geldmittel an (0,00€ wenn nicht vorhanden)');
    if (!formData.step6.eigenleistung.zuschüsse) errors[6].push('Bitte geben Sie die Zuschüsse an (0,00€ wenn nicht vorhanden)');
    if (!formData.step6.eigenleistung.selbsthilfe) errors[6].push('Bitte geben Sie die Selbsthilfe an (0,00€ wenn nicht vorhanden)');

    // Validate wertBaugrundstück if foerderVariante is "neubau"
    if (formData.step3.foerderVariante.includes('neubau') && !formData.step6.eigenleistung.wertBaugrundstück) {
      errors[6].push('Bitte geben Sie den Wert des Baugrundstücks an (0,00€ wenn nicht vorhanden)');
    }

    // Validate wertVorhandenerGebaeudeteile if foerderVariante is "neubau" or "nutzungsaenderung"
    if ((formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante === 'nutzungsaenderung') && !formData.step6.eigenleistung.wertVorhandenerGebaeudeteile) {
      errors[6].push('Bitte geben Sie den Wert vorhandener Gebäudeteile an (0,00€ wenn nicht vorhanden)');
    }

    // Validate Selbsthilfe consistency with Selbsthilfe form
    if (selbsthilfeData && 
        selbsthilfeData.willProvideSelfHelp === true && 
        formData.step6.eigenleistung.selbsthilfe) {
      const getNumericValue = (value: string) => Number(value.replace(/[^0-9]/g, ''));
      const formatCurrency = (value: number): string => {
        return new Intl.NumberFormat('de-DE', {
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: 2
        }).format(value/100);
      };
      
      const selbsthilfeInHauptantrag = getNumericValue(formData.step6.eigenleistung.selbsthilfe); // in cents
      const selbsthilfeInSelbsthilfeForm = Math.round((selbsthilfeData.totals?.totalSelbsthilfe || 0) * 100); // convert euros to cents
      
      if (selbsthilfeInHauptantrag !== selbsthilfeInSelbsthilfeForm) {
        errors[6].push(`Angegebener Selbsthilfe-Betrag (${formatCurrency(selbsthilfeInHauptantrag)}) stimmt nicht mit der angegebenen Selbsthilfeleistung im Selbsthilfe-Formular überein (${formatCurrency(selbsthilfeInSelbsthilfeForm)})`);
      }
    }

    // Add validation for Eigenleistung and Gesamtbeträge errors
    const { eigenleistungSum, gesamtbetraege, getNumericValue, formatCurrency } = calculateFinancialSums();

    // Validate Eigenleistung (7.5% of Gesamtkosten)
    const gesamtkostenValue = getNumericValue(formData.step5.gesamtkosten);
    const minEigenleistung = Math.round(gesamtkostenValue * 0.075);
    if (eigenleistungSum < minEigenleistung) {
      errors[6].push(`Die Eigenleistung muss mind. 7,5% der Gesamtkosten (${formatCurrency(minEigenleistung)}) entsprechen.`);
    }

    // Validate total equals Gesamtkosten (now including Eigenleistung for validation)
    const totalWithEigenleistung = gesamtbetraege + eigenleistungSum;
    const difference = totalWithEigenleistung - gesamtkostenValue;
    if (Math.abs(difference) > 1) {
      errors[6].push(`Die Summe aus Eigenleistung und Gesamtfinanzierung (${formatCurrency(totalWithEigenleistung)}) müssen den Gesamtkosten (${formatCurrency(gesamtkostenValue)}) entsprechen. Differenz: ${formatCurrency(difference)}`);
    }

    // Filter out empty error arrays
    const filteredErrors = Object.fromEntries(
      Object.entries(errors).filter(([_, errorArray]) => errorArray.length > 0)
    );

    if (Object.keys(filteredErrors).length > 0) {
      setValidationErrors(filteredErrors);
      setShowValidationModal(true);
      return false;
    }

    setShowSuccessModal(true);
    return true;
  };

  const calculateProgress = () => {
    let totalPotentialFields = 0;
    let actualErrors = 0;

    // Step 1: Personal Information
    // Count required fields for each person (13 base fields + 1 conditional)
    formData.step1.persons.forEach(person => {
      // Base required fields (13)
      totalPotentialFields += 13;
      if (!person.title) actualErrors++;
      if (!person.firstName) actualErrors++;
      if (!person.lastName) actualErrors++;
      if (!person.birthDate) actualErrors++;
      else {
        const date = new Date(person.birthDate);
        const now = new Date();
        const minDate = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate());
        const maxDate = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate());
        
        if (date < minDate || date > maxDate) actualErrors++;
      }
      if (!person.nationality) actualErrors++;
      if (!person.steuerid) actualErrors++;
      if (!person.street) actualErrors++;
      if (!person.houseNumber) actualErrors++;
      if (!person.postalCode) actualErrors++;
      if (!person.city) actualErrors++;
      if (!person.phone) actualErrors++;
      if (!person.email) actualErrors++;
      else if (!isValidEmail(person.email)) actualErrors++;
      if (!person.employment.type) actualErrors++;

      // Conditional field (employment.details)
      if (['sole-trader', 'business-owner', 'freelancer', 'farmer', 'private-income'].includes(person.employment.type)) {
        totalPotentialFields++;
        if (!person.employment.details) actualErrors++;
      }
    });

    // Representative fields
    // hasRepresentative is always required
    totalPotentialFields++;
    if (formData.step1.representative.hasRepresentative === null) actualErrors++;

    if (formData.step1.representative.hasRepresentative) {
      // isCompany is required if hasRepresentative is true
      totalPotentialFields++;
      if (formData.step1.representative.isCompany === null) actualErrors++;

      if (formData.step1.representative.isCompany) {
        // Company fields (3 required)
        totalPotentialFields += 3;
        if (!formData.step1.representative.companyName) actualErrors++;
        if (!formData.step1.representative.postboxCity) actualErrors++;
        if (!formData.step1.representative.postboxPostcode) actualErrors++;
      } 
      
      if (formData.step1.representative.isCompany === false){
        // Personal representative fields (11 required)
        totalPotentialFields += 11;
        if (!formData.step1.representative.title) actualErrors++;
        if (!formData.step1.representative.firstName) actualErrors++;
        if (!formData.step1.representative.lastName) actualErrors++;
        if (!formData.step1.representative.street) actualErrors++;
        if (!formData.step1.representative.houseNumber) actualErrors++;
        if (!formData.step1.representative.postalCode) actualErrors++;
        if (!formData.step1.representative.city) actualErrors++;
        if (!formData.step1.representative.phone) actualErrors++;
        if (!formData.step1.representative.email) actualErrors++;
        else if (!isValidEmail(formData.step1.representative.email)) actualErrors++;
      }
    }

    // Step 2: Household Information
    // Base required fields (4)
    totalPotentialFields += 4;
    if (!formData.step2.adultCount) actualErrors++;
    if (!formData.step2.childCount) actualErrors++;
    if (formData.step2.isDisabled === null) actualErrors++;
    if (formData.step2.isMarried === null) actualErrors++;

    // Conditional fields based on childCount
    if (parseInt(formData.step2.childCount) > 0) {
      totalPotentialFields++;
      if (!formData.step2.childrenAges) actualErrors++;
    }

    // Conditional fields based on isDisabled
    if (formData.step2.isDisabled) {
      const totalDisabled = parseInt(formData.step2.disabledAdultsCount || '0') + parseInt(formData.step2.disabledChildrenCount || '0');
      const totalHousehold = parseInt(formData.step2.adultCount || '0') + parseInt(formData.step2.childCount || '0');
      totalPotentialFields += 1;
      if (totalDisabled <= 0 || totalDisabled > totalHousehold) actualErrors++;
      else {
        const disabledAdults = parseInt(formData.step2.disabledAdultsCount || '0');
        const disabledChildren = parseInt(formData.step2.disabledChildrenCount || '0');
        const totalAdults = parseInt(formData.step2.adultCount || '0');
        const totalChildren = parseInt(formData.step2.childCount || '0');
        
        if (disabledAdults > totalAdults) actualErrors++;
        if (disabledChildren > totalChildren) actualErrors++;
      }
    }

    // Additional assets
    totalPotentialFields++;
    if (formData.step2.hasAdditionalAssets === null) actualErrors++;
    if (formData.step2.hasAdditionalAssets) {
      totalPotentialFields++;
      if (!formData.step2.additionalAssetsDetails) actualErrors++;
    }

    // Double subsidy
    totalPotentialFields++;
    if (formData.step2.hasDoubleSubsidy === null) actualErrors++;
    if (formData.step2.hasDoubleSubsidy) {
      totalPotentialFields += 4;
      if (formData.step2.hasRepaidSubsidy === null) actualErrors++;
      if (!formData.step2.subsidyAmount) actualErrors++;
      else {
        const amount = parseFloat(formData.step2.subsidyAmount.replace(/[^\d.,]/g, '').replace(',', '.'));
        if (isNaN(amount) || amount <= 0) actualErrors++;
      }
      if (!formData.step2.subsidyFileNumber) actualErrors++;
      if (!formData.step2.subsidyAuthority) actualErrors++;
    }

    // Supplementary loan
    totalPotentialFields++;
    if (formData.step2.hasSupplementaryLoan === null) actualErrors++;

    // Step 3: Object Details
    // Base address fields (4)
    totalPotentialFields += 4;
    if (!formData.step3.address.street) actualErrors++;
    if (!formData.step3.address.houseNumber) actualErrors++;
    if (!formData.step3.address.postalCode) actualErrors++;
    else {
      const postalCode = formData.step3.address.postalCode;
      const validStartNumbers = ['32', '33', '34', '37', '40', '41', '42', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '57', '58', '59'];
      
      if (!/^\d{5}$/.test(postalCode)){ actualErrors++;
      }else if(!validStartNumbers.includes(postalCode.substring(0, 2))) {  actualErrors++;
      }
    }
    if (!formData.step3.address.city) actualErrors++;

    // FoerderVariante is always required
    totalPotentialFields++;
    if (!formData.step3.foerderVariante) actualErrors++;

    // Base object details (4)
    totalPotentialFields += 4;
    if (!isValidAreaValue(formData.step3.objektDetailsAllgemein.wohnflaecheSelbstgenutzt)) actualErrors++;
    if (!isValidAreaValue(formData.step3.objektDetailsAllgemein.gesamtWohnflaeche)) actualErrors++;
    if (!formData.step3.objektDetailsAllgemein.anzahlZimmer) actualErrors++;
    if (!formData.step3.objektDetailsAllgemein.anzahlGaragen) actualErrors++;

    // Gewerbefläche
    totalPotentialFields++;
    if (formData.step3.objektDetailsAllgemein.gewerbeflaeche.hasGewerbeflaeche === null) actualErrors++;
    if (formData.step3.objektDetailsAllgemein.gewerbeflaeche.hasGewerbeflaeche) {
      totalPotentialFields++;
      if (!isValidAreaValue(formData.step3.objektDetailsAllgemein.gewerbeflaeche.flaeche)) actualErrors++;
    }

    // Erträge
    totalPotentialFields++;
    if (formData.step3.objektDetailsAllgemein.ertraege.hasErtraege === null) actualErrors++;
    if (formData.step3.objektDetailsAllgemein.ertraege.hasErtraege) {
      totalPotentialFields += 1;
      if (!formData.step3.objektDetailsAllgemein.ertraege.vermieteteWohnung && !formData.step3.objektDetailsAllgemein.ertraege.vermieteteGarage) actualErrors++;
      else {
        // Check if sum is greater than 0
        const wohnungValue = formData.step3.objektDetailsAllgemein.ertraege.vermieteteWohnung || '';
        const garageValue = formData.step3.objektDetailsAllgemein.ertraege.vermieteteGarage || '';
        
        if (wohnungValue || garageValue) {
          const parseCurrencyValue = (value: string): number => {
            if (!value) return 0;
            return parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
          };
          
          const wohnungAmount = parseCurrencyValue(wohnungValue);
          const garageAmount = parseCurrencyValue(garageValue);
          const totalAmount = wohnungAmount + garageAmount;
          
          if (totalAmount <= 0) actualErrors++;
        }
      }
    }

    // Wood construction loan
    totalPotentialFields++;
    if (formData.step3.objektDetailsAllgemein.hasWoodConstructionLoan === null) actualErrors++;

    // Bergsenkungsgebiet validation - only for neubau, ersterwerb, or nutzungsänderung
    if (formData.step3.foerderVariante?.includes('neubau') || formData.step3.foerderVariante?.includes('ersterwerb') || formData.step3.foerderVariante === 'nutzungsaenderung') {
      totalPotentialFields++;
      if (formData.step3.objektDetailsAllgemein.bergsenkungsGebiet === null) actualErrors++;
    }


     // Objektart validation
     if(formData.step3.foerderVariante){
      if (!formData.step3.foerderVariante?.includes('wohnung')) {
        totalPotentialFields += 1;
        if (!formData.step3.objektart) {
          actualErrors++;
        }
      }
    }

    // Conditional fields based on foerderVariante
    if (formData.step3.foerderVariante?.includes('wohnung')) {
      totalPotentialFields += 4;
      if (!formData.step3.objektDetailsEigentumswohnung.anzahlVollgeschosse) actualErrors++;
      if (!formData.step3.objektDetailsEigentumswohnung.wohnungenAmHauseingang) actualErrors++;
      if (!formData.step3.objektDetailsEigentumswohnung.lageImGebaeude) actualErrors++;
      if (!formData.step3.objektDetailsEigentumswohnung.lageImGeschoss) actualErrors++;
    }

    if (formData.step3.foerderVariante?.includes('neubau') || formData.step3.foerderVariante?.includes('ersterwerb')) {
      totalPotentialFields += 3;
      if (formData.step3.objektDetailsAllgemein.barrierefrei === null) actualErrors++;
      if (formData.step3.objektDetailsAllgemein.begEffizienzhaus40Standard === null) actualErrors++;
      if (formData.step3.objektDetailsAllgemein.hasLocationCostLoan === null) actualErrors++;

      // Baugenehmigung
      totalPotentialFields++;
      if (formData.step3.objektDetailsNeubauErsterwerb.baugenehmigungErforderlich === null) actualErrors++;
      if (formData.step3.objektDetailsNeubauErsterwerb.baugenehmigungErforderlich) {
        totalPotentialFields++;
        if (formData.step3.objektDetailsNeubauErsterwerb.baugenehmigung.wurdeErteilt === null) actualErrors++;
        if (formData.step3.objektDetailsNeubauErsterwerb.baugenehmigung.wurdeErteilt) {
          totalPotentialFields += 3;
          if (!formData.step3.objektDetailsNeubauErsterwerb.baugenehmigung.erteilungsDatum) actualErrors++;
          else if (!isValidDate(formData.step3.objektDetailsNeubauErsterwerb.baugenehmigung.erteilungsDatum)) actualErrors++;
          if (!formData.step3.objektDetailsNeubauErsterwerb.baugenehmigung.aktenzeichen) actualErrors++;
          if (!formData.step3.objektDetailsNeubauErsterwerb.baugenehmigung.erteilungsBehoerde) actualErrors++;
        }
      }

      // Bauanzeige
      totalPotentialFields++;
      if (formData.step3.objektDetailsNeubauErsterwerb.bauanzeige.wurdeEingereicht === null) actualErrors++;
      if (formData.step3.objektDetailsNeubauErsterwerb.bauanzeige.wurdeEingereicht) {
        totalPotentialFields++;
        if (!formData.step3.objektDetailsNeubauErsterwerb.bauanzeige.einreichungsDatum) actualErrors++;
        else if (!isValidDate(formData.step3.objektDetailsNeubauErsterwerb.bauanzeige.einreichungsDatum)) actualErrors++;
      }

      // Bauarbeiten
      totalPotentialFields++;
      if (formData.step3.objektDetailsNeubauErsterwerb.bauarbeiten.wurdeBegonnen === null) actualErrors++;
      if (formData.step3.objektDetailsNeubauErsterwerb.bauarbeiten.wurdeBegonnen) {
        totalPotentialFields++;
        if (!formData.step3.objektDetailsNeubauErsterwerb.bauarbeiten.beginnDatum) actualErrors++;
        else if (!isValidDate(formData.step3.objektDetailsNeubauErsterwerb.bauarbeiten.beginnDatum)) actualErrors++;
      }
    }

    if (formData.step3.foerderVariante?.includes('bestandserwerb')) {
      totalPotentialFields++;
      if (!formData.step3.objektDetailsBestandserwerb.baujahr) actualErrors++;
    }

    // Step 4: Ownership
    totalPotentialFields++;
    if (formData.step4.eigentumsverhaeltnis === null) actualErrors++;

    if (!formData.step4.eigentumsverhaeltnis) {
      totalPotentialFields++;
      if (formData.step4.kaufvertrag.wurdeAbgeschlossen === null) actualErrors++;
      if (formData.step4.kaufvertrag.wurdeAbgeschlossen) {
        totalPotentialFields++;
        if (!formData.step4.kaufvertrag.abschlussDatum) actualErrors++;
        else if (!isValidDate(formData.step4.kaufvertrag.abschlussDatum)) actualErrors++;
      }
    } else {
      totalPotentialFields++;
      if (formData.step4.erbbaurecht === null) actualErrors++;
      if (formData.step4.erbbaurecht) {
        totalPotentialFields++;
        if (!formData.step4.restlaufzeitErbbaurecht) actualErrors++;
      }

      // Grundbuch (9 fields)
      totalPotentialFields += 8;
      if (!formData.step4.grundbuch.type) actualErrors++;
      if (!formData.step4.grundbuch.amtsgericht) actualErrors++;
      if (!formData.step4.grundbuch.ortGrundbuch) actualErrors++;
      if (!formData.step4.grundbuch.gemarkung) actualErrors++;
      if (!formData.step4.grundbuch.blatt) actualErrors++;
      if (!formData.step4.grundbuch.flur) actualErrors++;
      if (!formData.step4.grundbuch.flurstueck) actualErrors++;
      if (!formData.step4.grundbuch.grundstuecksgroesse || !isValidAreaValue(formData.step4.grundbuch.grundstuecksgroesse)) actualErrors++;
    }

    // Baulasten
    totalPotentialFields++;
    if (formData.step4.baulasten.vorhanden === null) actualErrors++;
    if (formData.step4.baulasten.vorhanden) {
      totalPotentialFields++;
      if (!formData.step4.baulasten.art) actualErrors++;
    }

    // Altlasten
    totalPotentialFields++;
    if (formData.step4.altlasten.vorhanden === null) actualErrors++;
    if (formData.step4.altlasten.vorhanden) {
      totalPotentialFields++;
      if (!formData.step4.altlasten.art) actualErrors++;
    }

    // Step 5: Costs
    if (formData.step3.foerderVariante.includes('neubau')) {
      totalPotentialFields += 4;
      if (!formData.step5.baugrundstuck.kaufpreis) actualErrors++;
      if (!formData.step5.baugrundstuck.wert) actualErrors++;
      if (!formData.step5.baugrundstuck.erschliessungskosten) actualErrors++;
    }

    // Standortbedingte Mehrkosten progress calculation for Neubau or Ersterwerb with hasLocationCostLoan
    if ((formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante.includes('ersterwerb')) && formData.step3.objektDetailsAllgemein.hasLocationCostLoan) {
      totalPotentialFields++;
      if (!formData.step5.baugrundstuck.standortbedingteMehrkosten) actualErrors++;
    }

    if (formData.step3.foerderVariante?.includes('bestandserwerb') || formData.step3.foerderVariante?.includes('ersterwerb')) {
      totalPotentialFields++;
      if (!formData.step5.kaufpreis.kaufpreis) actualErrors++;
    }

    if (formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante === 'nutzungsaenderung') {
      totalPotentialFields += 4;
      if (!formData.step5.baukosten.besondereBauausfuhrung) actualErrors++;
      if (!formData.step5.baukosten.wertVorhandenerGebaude) actualErrors++;
      if (!formData.step5.baukosten.kostenAussenanlagen) actualErrors++;
      if (!formData.step5.baukosten.kostenArchitekt) actualErrors++;
    }
    if (formData.step3.foerderVariante.includes('neubau')){
      totalPotentialFields += 1;
      if(!formData.step5.baukosten.kostenGebaeude) actualErrors++;
    }

    // Nebenkosten (always required)
    totalPotentialFields += 6;
    if (!formData.step5.nebenkosten.erwerbsnebenkosten) actualErrors++;
    if (!formData.step5.nebenkosten.verwaltungsleistungen) actualErrors++;
    if (!formData.step5.nebenkosten.beschaffungDauerfinanzierung) actualErrors++;
    if (!formData.step5.nebenkosten.beschaffungZwischenfinanzierung) actualErrors++;
    if (!formData.step5.nebenkosten.sonstigeNebenkosten) actualErrors++;
    if (!formData.step5.nebenkosten.zusaetzlicheKosten) actualErrors++;

    // Step 6: Financing
    // Check each Fremddarlehen
    formData.step6.fremddarlehen.forEach(darlehen => {
      const hasAnyValue = Object.entries(darlehen)
        .filter(([key]) => key !== 'id')
        .some(([_, value]) => value !== '');
      
      if (hasAnyValue) {
        totalPotentialFields += 5;
        if (!darlehen.darlehenGeber) actualErrors++;
        if (!darlehen.nennbetrag) actualErrors++;
        if (!darlehen.zinssatz) actualErrors++;
        if (!darlehen.auszahlung) actualErrors++;
        if (!darlehen.tilgung) actualErrors++;
      }
    });

    if (formData.step2.hasSupplementaryLoan) {
      totalPotentialFields++;
      if (!formData.step6.ergaenzungsdarlehen.nennbetrag) actualErrors++;
      else {
        // Check Ergänzungsdarlehen limits
        const getNumericValue = (value: string) => Number(value.replace(/[^0-9]/g, ''));
        const ergaenzungsdarlehenValue = getNumericValue(formData.step6.ergaenzungsdarlehen.nennbetrag);
        const maxErgaenzungsdarlehen = 5000000; // 50,000 EUR in cents
        const minErgaenzungsdarlehen = 200000; // 2,000 EUR in cents
        
        if (ergaenzungsdarlehenValue > maxErgaenzungsdarlehen || ergaenzungsdarlehenValue < minErgaenzungsdarlehen) {
          actualErrors++;
        }
      }
    } else {
      totalPotentialFields++;
      if (!formData.step6.darlehenNRWBank.grunddarlehen.nennbetrag) actualErrors++;
      else {
        // Check Grunddarlehen limit
        const getNumericValue = (value: string) => Number(value.replace(/[^0-9]/g, ''));
        const grunddarlehenValue = getNumericValue(formData.step6.darlehenNRWBank.grunddarlehen.nennbetrag);
        
        // Get postcode validation data for dynamic limit
        const postcodeValidation = getPostcodeValidationData(formData.step3.address.postalCode);
        const maxGrunddarlehen = postcodeValidation.maxLimit; // Dynamic limit based on postcode
        
        if (grunddarlehenValue > maxGrunddarlehen) {
          actualErrors++;
        }
      }

      // Conditional Zusatzdarlehen fields
      if (parseInt(formData.step2.childCount) > 0) {
        totalPotentialFields++;
        if (!formData.step6.darlehenNRWBank.zusatzdarlehen.familienbonus.nennbetrag) actualErrors++;
        else {
          // Check Familienbonus limit
          const getNumericValue = (value: string) => Number(value.replace(/[^0-9]/g, ''));
          const familienbonusValue = getNumericValue(formData.step6.darlehenNRWBank.zusatzdarlehen.familienbonus.nennbetrag);
          const totalEligibleCount = parseInt(formData.step2.childCount) + parseInt(formData.step2.disabledAdultsCount || '0');
          const maxFamilienbonus = totalEligibleCount * 2400000; // 24,000 EUR per person in cents
          
          if (familienbonusValue > maxFamilienbonus) {
            actualErrors++;
          }
        }
      }
      if (formData.step3.objektDetailsAllgemein.hasWoodConstructionLoan) {
        totalPotentialFields++;
        if (!formData.step6.darlehenNRWBank.zusatzdarlehen.bauenMitHolz.nennbetrag) actualErrors++;
        else {
          // Check Bauen mit Holz limit
          const getNumericValue = (value: string) => Number(value.replace(/[^0-9]/g, ''));
          const holzValue = getNumericValue(formData.step6.darlehenNRWBank.zusatzdarlehen.bauenMitHolz.nennbetrag);
          const maxHolz = 1700000; // 17,000 EUR in cents
          
          if (holzValue > maxHolz) {
            actualErrors++;
          }
        }
      }
      if ((formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante?.includes('ersterwerb')) && 
          formData.step3.objektDetailsAllgemein.barrierefrei) {
        totalPotentialFields++;
        if (!formData.step6.darlehenNRWBank.zusatzdarlehen.barrierefreiheit.nennbetrag) actualErrors++;
        else {
          // Check Barrierefreiheit limit
          const getNumericValue = (value: string) => Number(value.replace(/[^0-9]/g, ''));
          const barrierefreiValue = getNumericValue(formData.step6.darlehenNRWBank.zusatzdarlehen.barrierefreiheit.nennbetrag);
          const maxBarrierefrei = 1150000; // 11,500 EUR in cents
          
          if (barrierefreiValue > maxBarrierefrei) {
            actualErrors++;
          }
        }
      }
      if ((formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante?.includes('ersterwerb')) && 
          formData.step3.objektDetailsAllgemein.hasLocationCostLoan) {
        totalPotentialFields++;
        if (!formData.step6.darlehenNRWBank.zusatzdarlehen.standortbedingteMehrkosten.nennbetrag) actualErrors++;
        else {
          // Check Standortbedingte Mehrkosten limit
          const getNumericValue = (value: string) => Number(value.replace(/[^0-9]/g, ''));
          const standortValue = getNumericValue(formData.step6.darlehenNRWBank.zusatzdarlehen.standortbedingteMehrkosten.nennbetrag);
          const maxStandort = 2500000; // 25,000 EUR in cents
          
          if (standortValue > maxStandort) {
            actualErrors++;
          } else if (formData.step5.baugrundstuck.standortbedingteMehrkosten) {
            const costValue = getNumericValue(formData.step5.baugrundstuck.standortbedingteMehrkosten);
            const maxZusatzdarlehen = Math.round(costValue * 0.75);
            
            if (standortValue > maxZusatzdarlehen) {
              actualErrors++;
            }
          }
        }
      }
      if ((formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante?.includes('ersterwerb')) && 
          formData.step3.objektDetailsAllgemein.begEffizienzhaus40Standard) {
        totalPotentialFields++;
        if (!formData.step6.darlehenNRWBank.zusatzdarlehen.begEffizienzhaus40Standard.nennbetrag) actualErrors++;
        else {
          // Check BEG Effizienzhaus 40 Standard limit
          const getNumericValue = (value: string) => Number(value.replace(/[^0-9]/g, ''));
          const begValue = getNumericValue(formData.step6.darlehenNRWBank.zusatzdarlehen.begEffizienzhaus40Standard.nennbetrag);
          const maxBeg = 3000000; // 30,000 EUR in cents
          
          if (begValue > maxBeg) {
            actualErrors++;
          }
        }
      }
    }

    // Eigenleistung base fields (3)
    totalPotentialFields += 3;
    if (!formData.step6.eigenleistung.eigeneGeldmittel) actualErrors++;
    if (!formData.step6.eigenleistung.zuschüsse) actualErrors++;
    
    // Selbsthilfe field - check for either missing value OR mismatch with Selbsthilfe form
    let selbsthilfeHasError = false;
    if (!formData.step6.eigenleistung.selbsthilfe) {
      selbsthilfeHasError = true;
    } else if (selbsthilfeData && 
               selbsthilfeData.willProvideSelfHelp === true) {
      const getNumericValue = (value: string) => Number(value.replace(/[^0-9]/g, ''));
      const selbsthilfeInHauptantrag = getNumericValue(formData.step6.eigenleistung.selbsthilfe); // in cents
      const selbsthilfeInSelbsthilfeForm = Math.round((selbsthilfeData.totals?.totalSelbsthilfe || 0) * 100); // convert euros to cents
      
      if (selbsthilfeInHauptantrag !== selbsthilfeInSelbsthilfeForm) {
        selbsthilfeHasError = true;
      }
    }
    if (selbsthilfeHasError) actualErrors++;

    // Conditional Eigenleistung fields
    if (formData.step3.foerderVariante.includes('neubau')) {
      totalPotentialFields++;
      if (!formData.step6.eigenleistung.wertBaugrundstück) actualErrors++;
    }
    if (formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante === 'nutzungsaenderung') {
      totalPotentialFields++;
      if (!formData.step6.eigenleistung.wertVorhandenerGebaeudeteile) actualErrors++;
    }

    // Add validation for Eigenleistung and Gesamtbeträge errors
    const { eigenleistungSum, gesamtbetraege, getNumericValue } = calculateFinancialSums();

    // Validate Eigenleistung (7.5% of Gesamtkosten)
    const gesamtkostenValue = getNumericValue(formData.step5.gesamtkosten);
    const minEigenleistung = Math.round(gesamtkostenValue * 0.075);
    if (eigenleistungSum < minEigenleistung) {
      actualErrors++;
    }

    // Validate total equals Gesamtkosten (now including Eigenleistung for validation)
    const totalWithEigenleistung = gesamtbetraege + eigenleistungSum;
    const difference = totalWithEigenleistung - gesamtkostenValue;
    if (Math.abs(difference) > 1) {
      actualErrors++;
    }

    console.log('Total potential fields:', totalPotentialFields);
    console.log('Total actual errors:', actualErrors);

    // Calculate progress percentage
    const hauptantragProgress = totalPotentialFields > 0 
      ? Math.round(((totalPotentialFields - actualErrors) / totalPotentialFields) * 100)
      : 100;

    console.log('Calculated hauptantrag progress:', hauptantragProgress, '%');

    return hauptantragProgress;
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1_PersonalInfo
            formData={formData.step1}
            updateFormData={(data) => updateFormData('step1', data)}
            showValidation={showValidation}
            deletePerson={deletePerson}
          />
        );
      case 2:
        return (
          <Step2_HouseholdInfo
            formData={formData.step2}
            updateFormData={(data) => updateFormData('step2', data)}
            showValidation={showValidation}
          />
        );
      case 3:
        return (
          <Step3_Objektdetails
            formData={formData.step3}
            updateFormData={(data) => updateFormData('step3', data)}
            showValidation={showValidation}
          />
        );
      case 4:
        return (
          <Step4_Eigentumsverhaeltnisse
            formData={formData.step4}
            updateFormData={(data) => updateFormData('step4', data)}
            showValidation={showValidation}
          />
        );
      case 5:
        return (
          <Step5_Kostenaufstellung
            formData={formData.step5}
            updateFormData={(data) => updateFormData('step5', data)}
            foerderVariante={formData.step3.foerderVariante}
            showValidation={showValidation}
            hasLocationCostLoan={formData.step3.objektDetailsAllgemein.hasLocationCostLoan}
          />
        );
      case 6:
        return (
          <Step6_Finanzierungsmittel
            formData={formData.step6}
            updateFormData={(data) => updateFormData('step6', data)}
            foerderVariante={formData.step3.foerderVariante}
            gesamtkosten={formData.step5.gesamtkosten}
            childCount={formData.step2.childCount}
            disabledAdultsCount={formData.step2.disabledAdultsCount}
            barrierefrei={formData.step3.objektDetailsAllgemein.barrierefrei}
            begEffizienzhaus40Standard={formData.step3.objektDetailsAllgemein.begEffizienzhaus40Standard}
            hasSupplementaryLoan={formData.step2.hasSupplementaryLoan}
            hasLocationCostLoan={formData.step3.objektDetailsAllgemein.hasLocationCostLoan}
            hasWoodConstructionLoan={formData.step3.objektDetailsAllgemein.hasWoodConstructionLoan}
            showValidation={showValidation}
            selbsthilfeData={selbsthilfeData}
            postcode={formData.step3.address.postalCode}
            standortbedingteMehrkosten={formData.step5.baugrundstuck.standortbedingteMehrkosten}
          />
        );
      default:
        return <div>Step not implemented yet</div>;
    }
  };

  const getStepTitle = (step: number) => {
    switch (step) {
      case 1:
        return "Persönliche Angaben zu den Antragstellern";
      case 2:
        return "Persönliche Verhältnisse";
      case 3:
        return "Objektdetails";
      case 4:
        return "Eigentumsverhältnisse";
      case 5:
        return "Kostenaufstellung";
      case 6:
        return "Aufstellung der Finanzierungsmittel";
      default:
        return "";
    }
  };

  const handleToggleValidation = async () => {
    const newShowValidation = !showValidation;
    setShowValidation(newShowValidation);
    
    if (user?.id) {
      try {
        console.log('Updating shouldShowErrorHaupt to:', newShowValidation);
        const { error } = await supabase
          .from('user_data')
          .update({ 
            should_show_error_haupt: newShowValidation,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (error) {
          console.error('Error updating shouldShowErrorHaupt:', error);
          // Revert the state if the update failed
          setShowValidation(!newShowValidation);
        }
      } catch (error) {
        console.error('Error in handleToggleValidation:', error);
        // Revert the state if the update failed
        setShowValidation(!newShowValidation);
      }
          }
    };

  // Helper function to calculate Eigenleistung and Gesamtbeträge sums
  const calculateFinancialSums = () => {
    // Helper functions for validation
    const getNumericValue = (value: string) => Number(value.replace(/[^0-9]/g, ''));
    const formatCurrency = (value: number): string => {
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2
      }).format(value/100);
    };

    // Calculate Eigenleistung sum
    let eigenleistungSum = 0;
    
    // Always include these values
    eigenleistungSum += getNumericValue(formData.step6.eigenleistung.eigeneGeldmittel);
    eigenleistungSum += getNumericValue(formData.step6.eigenleistung.zuschüsse);
    eigenleistungSum += getNumericValue(formData.step6.eigenleistung.selbsthilfe);

    // Only include these values if foerderVariante is "neubau"
    if (formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante === 'nutzungsaenderung') {
      eigenleistungSum += getNumericValue(formData.step6.eigenleistung.wertVorhandenerGebaeudeteile);
    }
    if (formData.step3.foerderVariante.includes('neubau')) {
      eigenleistungSum += getNumericValue(formData.step6.eigenleistung.wertBaugrundstück);
    }

    // Calculate total financing (excluding Eigenleistung)
    const fremddarlehenSum = formData.step6.fremddarlehen.reduce((sum, darlehen) => 
      sum + getNumericValue(darlehen.nennbetrag), 0);
    
    let nrwBankNennbetrag = getNumericValue(formData.step6.darlehenNRWBank.grunddarlehen.nennbetrag);

    // Add Familienbonus if childCount > 0
    if (parseInt(formData.step2.childCount) > 0) {
      nrwBankNennbetrag += getNumericValue(formData.step6.darlehenNRWBank.zusatzdarlehen.familienbonus.nennbetrag);
    }

    // Add Bauen mit Holz if hasWoodConstructionLoan is true
    if (formData.step3.objektDetailsAllgemein.hasWoodConstructionLoan) {
      nrwBankNennbetrag += getNumericValue(formData.step6.darlehenNRWBank.zusatzdarlehen.bauenMitHolz.nennbetrag);
    }

    // Check if we're in neubau or ersterwerb
    const isNeubauOrErsterwerb = formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante.includes('ersterwerb');

    // Add Barrierefreiheit if applicable
    if (isNeubauOrErsterwerb && formData.step3.objektDetailsAllgemein.barrierefrei) {
      nrwBankNennbetrag += getNumericValue(formData.step6.darlehenNRWBank.zusatzdarlehen.barrierefreiheit.nennbetrag);
    }

    // Add Standortbedingte Mehrkosten if applicable
    if (isNeubauOrErsterwerb && formData.step3.objektDetailsAllgemein.hasLocationCostLoan) {
      nrwBankNennbetrag += getNumericValue(formData.step6.darlehenNRWBank.zusatzdarlehen.standortbedingteMehrkosten.nennbetrag);
    }

    // Add BEG Effizienzhaus 40 Standard if applicable
    if (isNeubauOrErsterwerb && formData.step3.objektDetailsAllgemein.begEffizienzhaus40Standard) {
      nrwBankNennbetrag += getNumericValue(formData.step6.darlehenNRWBank.zusatzdarlehen.begEffizienzhaus40Standard.nennbetrag);
    }

    const ergaenzungsdarlehenSum = getNumericValue(formData.step6.ergaenzungsdarlehen.nennbetrag);

    // Gesamtbeträge now only includes loan amounts
    const gesamtbetraege = fremddarlehenSum + nrwBankNennbetrag + ergaenzungsdarlehenSum;

    return {
      eigenleistungSum,
      gesamtbetraege,
      getNumericValue,
      formatCurrency
    };
  };
 
  return (
    <div className="hauptantrag-container">
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
          @media (max-width: 750px) {
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
          @media (max-width: 750px) {
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
               backgroundColor: 'rgba(255, 255, 255, 1.0)', 
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

      {/*<PDFDownloadButton formType="hauptantrag" />*/}

      {/* Header ellipse */}
      <div className="blue-corner">
        <span className="blue-corner-text">HAUPTANTRAG</span>
      </div>
      
      {/* Main heading - Removing this as it's now part of the blue corner */}
      
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
              handleSave(false);
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
              style={{ fontSize: '0.9rem', userSelect: 'none' }}
            >
              Fehler anzeigen
            </label>
          </div>
        </div>
      </div>

      <Container className="pt-32">
        {/* Step title */}
        <div className="text-center mb-8">
          <h3 className="text-1xl font-regular text-gray-800">
            {getStepTitle(currentStep)}
          </h3>
        </div>

        {/* Progress indicators */}
        <div className="d-flex justify-content-center mb-5">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div 
              key={i} 
              className="d-flex flex-column align-items-center mx-2"
              onClick={() => setCurrentStep(i + 1)}
              style={{ cursor: 'pointer' }}
            >
              <div
                className={`w-16 h-3 rounded-full transition-all duration-300 ${
                  i + 1 <= currentStep 
                    ? 'bg-[#064497] shadow-md' 
                    : 'bg-[#D7DAEA] shadow-inner'
                }`}
                style={{
                  boxShadow: i + 1 <= currentStep 
                    ? '0 4px 6px rgba(0, 0, 0, 0.1)' 
                    : 'inset 0 2px 4px rgba(0, 0, 0, 0.1)'
                }}
              />
              {i + 1 === currentStep && (
                <span className="mt-2 text-sm font-medium text-gray-600">
                  Schritt {i + 1}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        {renderStep()}

        {/* Navigation buttons */}
        <div className="d-flex flex-column align-items-center gap-3 mt-5">
          <div className="d-flex gap-3">
            <Button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              style={{ backgroundColor: currentStep === 1 ? '#D7DAEA' : '#064497', border: 'none' }}
            >
              ZURÜCK
            </Button>

            <Button
              onClick={handleNext}
              style={{ backgroundColor: '#064497', border: 'none' }}
            >
              {currentStep === totalSteps ? 'PRÜFEN' : 'WEITER'}
            </Button>
          </div>

          <Button
            variant="link"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.preventDefault();
              handleSave(true);
            }}
            className="text-decoration-underline mb-5 mt-3"
            style={{ color: 'black' }}
          >
            Speichern und zum persönlichen Bereich
          </Button>
        </div>
      </Container>

      <Modal show={showValidationModal} onHide={() => setShowValidationModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Bitte korrigieren Sie die folgenden Fehler</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="alert alert-danger mb-0">
            <div className="error-list">
              {Object.entries(validationErrors).map(([step, errors], index) => (
                <div key={step} className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h5 className="text-danger mb-0">Schritt {step}:</h5>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => {
                        setShowValidationModal(false);
                        navigateToStep(parseInt(step));
                      }}
                      style={{ borderColor: '#FFFFFF', color: '#064497' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      Zum Schritt {step} springen
                    </Button>
                  </div>
                  <ul className="mb-0 ps-3">
                    {errors.map((error, errorIndex) => (
                      <li key={errorIndex} className="mb-2">
                        {error}
                        {errorIndex < errors.length - 1 && (
                          <hr className="my-2 border-danger opacity-25" />
                        )}
                      </li>
                    ))}
                  </ul>
                  {index < Object.keys(validationErrors).length - 1 && (
                    <hr className="my-3 border-danger opacity-50" />
                  )}
                </div>
              ))}
            </div>
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
                handleSave(true);
              }}
              style={{ backgroundColor: '#064497', border: 'none' }}
            >
              Speichern und zum persönlichen Bereich
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

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
                <div key={result.step} className="mb-3 p-3 border rounded">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h5 className="mb-0">Schritt {result.step}: {getStepTitle(result.step)}</h5>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigateToStep(result.step)}
                      style={{ backgroundColor: '#064497', border: 'none' }}
                    >
                      Zum Schritt
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

      {/* Delete Person Modal */}
      <Modal 
        show={showDeleteModal === true} 
        onHide={() => {
          try {
            setShowDeleteModal(false);
          } catch (error) {
            console.error('Error hiding delete modal:', error);
          }
        }} 
        centered
      >
        <Modal.Header>
          <Modal.Title>Antragsteller entfernen</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-4">
            <p>
              Sie möchten <strong>
                {personToDelete?.person?.firstName || 'Unbekannte'} {personToDelete?.person?.lastName || 'Person'}
              </strong> als Antragsteller entfernen.
            </p>
            <p>
              Da diese Person bereits in der Haushaltsauskunft erfasst wurde, 
              können Sie zwischen den folgenden Optionen wählen:
            </p>
          </div>
          
          <div className="d-flex flex-column gap-3">
            <Button
              variant="outline-primary"
              onClick={() => {
                try {
                  handleDeleteOption('remove-applicant');
                } catch (error) {
                  console.error('Error in remove-applicant:', error);
                }
              }}
              disabled={isLoading}
              className="text-start p-3"
              style={{ borderColor: '#064497', color: '#064497', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D7DAEA'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div className="fw-bold mb-1">
                Nur als Antragsteller entfernen
              </div>
              <div className="text-muted small">
                Die Person bleibt als Haushaltsmitglied erhalten und kann weiterhin 
                in der Haushaltsauskunft und anderen Formularen verwendet werden.
              </div>
            </Button>
            
            <Button
              variant="outline-danger"
              onClick={() => {
                try {
                  handleDeleteOption('remove-completely');
                } catch (error) {
                  console.error('Error in remove-completely:', error);
                }
              }}
              disabled={isLoading}
              className="text-start p-3"
              style={{ borderColor: '#dc3545', color: '#dc3545', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D7DAEA'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div className="fw-bold mb-1">
                Komplett entfernen
              </div>
              <div className="text-muted small">
                Die Person wird vollständig entfernt und ist nicht mehr in der 
                Haushaltsauskunft, Einkommenserklärung oder anderen Formularen verfügbar.
              </div>
            </Button>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => {
              try {
                setShowDeleteModal(false);
              } catch (error) {
                console.error('Error closing delete modal:', error);
              }
            }}
            disabled={isLoading}
          >
            Abbrechen
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default HauptantragContainer; 

