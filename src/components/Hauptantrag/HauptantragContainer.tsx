import React, { useState, useEffect } from 'react';
import { Container, Button, Modal, Spinner, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatCurrencyForDisplay, formatCurrencyForDatabase } from '../../utils/currencyUtils';
import Step1_PersonalInfo from './Steps/Step1_PersonalInfo';
import Step2_HouseholdInfo from './Steps/Step2_HouseholdInfo';
import Step3_Objektdetails from './Steps/Step3_Objektdetails';
import Step4_Eigentumsverhaeltnisse from './Steps/Step4_Eigentumsverhaeltnisse';
import Step5_Kostenaufstellung from './Steps/Step5_Kostenaufstellung';
import Step6_Finanzierungsmittel, { Fremddarlehen } from './Steps/Step6_Finanzierungsmittel';
// Import search icon
import { IconType } from 'react-icons';
import { IconBaseProps } from 'react-icons';

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
      zusatzlicheKosten: string;
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
}

interface SearchResult {
  step: number;
  matches: string[];
}

const HauptantragContainer: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ [key: number]: string[] }>({});
  const [showValidation, setShowValidation] = useState(false);
  const [hasValidatedOnce, setHasValidatedOnce] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
        street: '',
        houseNumber: '',
        postalCode: '',
        city: '',
        phone: '',
        email: '',
        employment: {
          type: '',
          details: ''
        }
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
        hasWoodConstructionLoan: null
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
        zusatzlicheKosten: ''
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

  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

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

  // Load saved data from Supabase
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
          return; // Exit if we can't load user data
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

        // Calculate total costs from cost data
        let totalCosts = 0;
        if (costData) {
          const isNeubau = objectData?.foerderVariante === 'neubau';
          const isBestandserwerbOrErsterwerb = objectData?.foerderVariante?.includes('bestandserwerb') || objectData?.foerderVariante?.includes('ersterwerb');
          const showBaukosten = isNeubau || objectData?.foerderVariante === 'nutzungsaenderung';

          // Add Baugrundstück costs if Neubau
          if (isNeubau) {
            if (costData.grundstueck_kaufpreis) totalCosts += costData.grundstueck_kaufpreis;
            if (costData.grundstueck_wert) totalCosts += costData.grundstueck_wert;
            if (costData.erschliessungskosten) totalCosts += costData.erschliessungskosten;
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
              // Additional applicants
              ...(userData?.weitere_antragstellende_personen || []).map((person: AdditionalPerson) => ({
                title: person.title || '',
                firstName: person.firstName || '',
                lastName: person.lastName || '',
                nationality: person.nationality || '',
                birthDate: person.birthDate || '',
                street: person.street || '',
                houseNumber: person.houseNumber || '',
                postalCode: person.postalCode || '',
                city: person.city || '',
                phone: person.phone || '',
                email: person.email || '',
                employment: {
                  type: person.employment?.type || '',
                  details: person.employment?.details || ''
                }
              }))
            ]
          },
          step2: {
            adultCount: userData?.adult_count || '',
            childCount: userData?.child_count || '',
            isDisabled: userData?.is_disabled ?? null,
            isMarried: userData?.is_married ?? null,
            hasAdditionalAssets: userData?.hasadditionalassets ?? null,
            hasDoubleSubsidy: userData?.hasdoublesubsidy ?? null,
            childrenAges: userData?.childrenages || '',
            disabledAdultsCount: userData?.disabledadultscount || '',
            disabledChildrenCount: userData?.disabledchildrencount || '',
            additionalAssetsDetails: userData?.additionalassetsdetails || '',
            hasRepaidSubsidy: userData?.hasrepaidsubsidy ?? null,
            subsidyAmount: userData?.subsidyamount ? formatCurrencyForDisplay(userData.subsidyamount) : '',
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
            objektDetailsAllgemein: {
              wohnflaecheSelbstgenutzt: objectData?.wohnflaeche_selbstgenutzt || '',
              gesamtWohnflaeche: objectData?.gesamt_wohnflaeche || '',
              anzahlZimmer: objectData?.anzahl_zimmer || '',
              anzahlGaragen: objectData?.anzahl_garagen || '',
              gewerbeflaeche: {
                hasGewerbeflaeche: objectData?.has_gewerbeflaeche ?? null,
                flaeche: objectData?.has_gewerbeflaeche ? objectData?.gewerbeflaeche || '' : ''
              },
              ertraege: {
                hasErtraege: objectData?.has_ertraege ?? null,
                vermieteteWohnung: objectData?.has_ertraege ? formatCurrencyForDisplay(objectData?.vermietete_wohnung) || '' : '',
                vermieteteGarage: objectData?.has_ertraege ? formatCurrencyForDisplay(objectData?.vermietete_garage) || '' : ''
              },
              barrierefrei: objectData?.barrierefrei ?? null,
              begEffizienzhaus40Standard: objectData?.beg_effizienzhaus_40_standard ?? null,
              hasLocationCostLoan: objectData?.haslocationcostloan ?? null,
              hasWoodConstructionLoan: objectData?.haswoodconstructionloan ?? null
            },
            objektDetailsEigentumswohnung: {
              anzahlVollgeschosse: (objectData?.foerderVariante === 'bestandserwerb-wohnung' || objectData?.foerderVariante === 'ersterwerb-wohnung') ? objectData?.anzahl_vollgeschosse || '' : '',
              wohnungenAmHauseingang: (objectData?.foerderVariante === 'bestandserwerb-wohnung' || objectData?.foerderVariante === 'ersterwerb-wohnung') ? objectData?.wohnungen_am_hauseingang || '' : '',
              lageImGebaeude: (objectData?.foerderVariante === 'bestandserwerb-wohnung' || objectData?.foerderVariante === 'ersterwerb-wohnung') ? objectData?.lage_im_gebaeude || '' : '',
              lageImGeschoss: (objectData?.foerderVariante === 'bestandserwerb-wohnung' || objectData?.foerderVariante === 'ersterwerb-wohnung') ? objectData?.lage_im_geschoss || '' : ''
            },
            objektDetailsNeubauErsterwerb: {
              baugenehmigungErforderlich: (objectData?.foerderVariante === 'neubau' || objectData?.foerderVariante === 'ersterwerb-eigenheim' || objectData?.foerderVariante === 'ersterwerb-wohnung') ? objectData?.baugenehmigung_erforderlich : null,
              baugenehmigung: {
                wurdeErteilt: (objectData?.foerderVariante === 'neubau' || objectData?.foerderVariante === 'ersterwerb-eigenheim' || objectData?.foerderVariante === 'ersterwerb-wohnung') ? objectData?.baugenehmigung_wurde_erteilt : null,
                erteilungsDatum: (objectData?.foerderVariante === 'neubau' || objectData?.foerderVariante === 'ersterwerb-eigenheim' || objectData?.foerderVariante === 'ersterwerb-wohnung') && objectData?.baugenehmigung_wurde_erteilt ? objectData?.erteilungs_datum || '' : '',
                aktenzeichen: (objectData?.foerderVariante === 'neubau' || objectData?.foerderVariante === 'ersterwerb-eigenheim' || objectData?.foerderVariante === 'ersterwerb-wohnung') && objectData?.baugenehmigung_wurde_erteilt ? objectData?.aktenzeichen || '' : '',
                erteilungsBehoerde: (objectData?.foerderVariante === 'neubau' || objectData?.foerderVariante === 'ersterwerb-eigenheim' || objectData?.foerderVariante === 'ersterwerb-wohnung') && objectData?.baugenehmigung_wurde_erteilt ? objectData?.erteilungs_behoerde || '' : ''
              },
              bauanzeige: {
                wurdeEingereicht: (objectData?.foerderVariante === 'neubau' || objectData?.foerderVariante === 'ersterwerb-eigenheim' || objectData?.foerderVariante === 'ersterwerb-wohnung') ? objectData?.bauanzeige_wurde_eingereicht : null,
                einreichungsDatum: (objectData?.foerderVariante === 'neubau' || objectData?.foerderVariante === 'ersterwerb-eigenheim' || objectData?.foerderVariante === 'ersterwerb-wohnung') && objectData?.bauanzeige_wurde_eingereicht ? objectData?.bauanzeige_einreichungs_datum || '' : ''
              },
              bauarbeiten: {
                wurdeBegonnen: (objectData?.foerderVariante === 'neubau' || objectData?.foerderVariante === 'ersterwerb-eigenheim' || objectData?.foerderVariante === 'ersterwerb-wohnung') ? objectData?.bauarbeiten_wurde_begonnen : null,
                beginnDatum: (objectData?.foerderVariante === 'neubau' || objectData?.foerderVariante === 'ersterwerb-eigenheim' || objectData?.foerderVariante === 'ersterwerb-wohnung') && objectData?.bauarbeiten_wurde_begonnen ? objectData?.bauarbeiten_beginn_datum || '' : ''
              }
            },
            objektDetailsBestandserwerb: {
              baujahr: (objectData?.foerderVariante === 'bestandserwerb-wohnung' || objectData?.foerderVariante === 'bestandserwerb-eigenheim') ? objectData?.bestandserwerb_baujahr || '' : ''
            }
          },
          step4: {
            eigentumsverhaeltnis: objectData?.eigentumsverhaeltnis ?? null,
            kaufvertrag: {
              wurdeAbgeschlossen: objectData?.kaufvertrag_wurde_abgeschlossen ?? null,
              abschlussDatum: objectData?.kaufvertrag_abschluss_datum || ''
            },
            erbbaurecht: objectData?.erbbaurecht ?? null,
            restlaufzeitErbbaurecht: objectData?.restlaufzeit_erbbaurecht || '',
            grundbuch: {
              type: objectData?.grundbuch_type || '',
              amtsgericht: objectData?.grundbuch_amtsgericht || '',
              ortGrundbuch: objectData?.ort_grundbuch || '',
              gemarkung: objectData?.grundbuch_gemarkung || '',
              blatt: objectData?.grundbuch_blatt || '',
              flur: objectData?.grundbuch_flur || '',
              flurstueck: objectData?.grundbuch_flurstueck || '',
              flurstueckNeu: objectData?.grundbuch_flurstueck_neu || '',
              grundstuecksgroesse: objectData?.grundstuecksgroesse || ''
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
              kaufpreis: costData?.grundstueck_kaufpreis ? formatCurrencyForDisplay(costData.grundstueck_kaufpreis) : '',
              wert: costData?.grundstueck_wert ? formatCurrencyForDisplay(costData.grundstueck_wert) : '',
              erschliessungskosten: costData?.erschliessungskosten ? formatCurrencyForDisplay(costData.erschliessungskosten) : '',
              standortbedingteMehrkosten: costData?.standortbedingte_mehrkosten ? formatCurrencyForDisplay(costData.standortbedingte_mehrkosten) : ''
            },
            kaufpreis: {
              kaufpreis: costData?.kaufpreis ? formatCurrencyForDisplay(costData.kaufpreis) : ''
            },
            baukosten: {
              kostenGebaeude: costData?.kosten_gebaeude ? formatCurrencyForDisplay(costData.kosten_gebaeude) : '',
              besondereBauausfuhrung: costData?.besondere_bauausfuehrung ? formatCurrencyForDisplay(costData.besondere_bauausfuehrung) : '',
              wertVorhandenerGebaude: costData?.wert_vorhandener_gebaeude ? formatCurrencyForDisplay(costData.wert_vorhandener_gebaeude) : '',
              kostenAussenanlagen: costData?.kosten_aussenanlagen ? formatCurrencyForDisplay(costData.kosten_aussenanlagen) : '',
              kostenArchitekt: costData?.kosten_architekt ? formatCurrencyForDisplay(costData.kosten_architekt) : ''
            },
            nebenkosten: {
              erwerbsnebenkosten: costData?.erwerbsnebenkosten ? formatCurrencyForDisplay(costData.erwerbsnebenkosten) : '',
              verwaltungsleistungen: costData?.verwaltungsleistungen ? formatCurrencyForDisplay(costData.verwaltungsleistungen) : '',
              beschaffungDauerfinanzierung: costData?.beschaffung_dauerfinanzierung ? formatCurrencyForDisplay(costData.beschaffung_dauerfinanzierung) : '',
              beschaffungZwischenfinanzierung: costData?.beschaffung_zwischenfinanzierung ? formatCurrencyForDisplay(costData.beschaffung_zwischenfinanzierung) : '',
              sonstigeNebenkosten: costData?.sonstige_nebenkosten ? formatCurrencyForDisplay(costData.sonstige_nebenkosten) : '',
              zusatzlicheKosten: costData?.zusaetzliche_kosten ? formatCurrencyForDisplay(costData.zusaetzliche_kosten) : ''
            },
            gesamtkosten: formatCurrencyForDisplay(totalCosts)
          },
          step6: {
            fremddarlehen: financeData?.fremddarlehen ? financeData.fremddarlehen.map((darlehen: Fremddarlehen) => ({
              ...darlehen,
              nennbetrag: formatCurrencyForDisplay(darlehen.nennbetrag)
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
                nennbetrag: financeData?.grunddarlehen_nennbetrag ? formatCurrencyForDisplay(financeData.grunddarlehen_nennbetrag) : '',
                tilgungsnachlass: ''
              },
              zusatzdarlehen: {
                familienbonus: {
                  nennbetrag: financeData?.zusatzdarlehen_familienbonus_nennbetrag ? formatCurrencyForDisplay(financeData.zusatzdarlehen_familienbonus_nennbetrag) : '',
                  tilgungsnachlass: ''
                },
                barrierefreiheit: {
                  nennbetrag: financeData?.zusatzdarlehen_barrierefreiheit_nennbetrag ? formatCurrencyForDisplay(financeData.zusatzdarlehen_barrierefreiheit_nennbetrag) : '',
                  tilgungsnachlass: ''
                },
                bauenMitHolz: {
                  nennbetrag: financeData?.zusatzdarlehen_bauen_mit_holz_nennbetrag ? formatCurrencyForDisplay(financeData.zusatzdarlehen_bauen_mit_holz_nennbetrag) : '',
                  tilgungsnachlass: ''
                },
                standortbedingteMehrkosten: {
                  nennbetrag: financeData?.zusatzdarlehen_standortbedingte_mehrkosten_nennbetrag ? formatCurrencyForDisplay(financeData.zusatzdarlehen_standortbedingte_mehrkosten_nennbetrag) : '',
                  tilgungsnachlass: ''
                },
                begEffizienzhaus40Standard: {
                  nennbetrag: financeData?.zusatzdarlehen_effizienzhaus40_nennbetrag ? formatCurrencyForDisplay(financeData.zusatzdarlehen_effizienzhaus40_nennbetrag) : '',
                  tilgungsnachlass: ''
                }
              },
              summeNennbetrag: '',
              summeTilgungsnachlass: ''
            },
            ergaenzungsdarlehen: {
              nennbetrag: financeData?.ergaenzungsdarlehen_nennbetrag ? formatCurrencyForDisplay(financeData.ergaenzungsdarlehen_nennbetrag) : ''
            },
            eigenleistung: {
              eigeneGeldmittel: financeData?.eigene_geldmittel ? formatCurrencyForDisplay(financeData.eigene_geldmittel) : '',
              zuschüsse: financeData?.zuschuesse ? formatCurrencyForDisplay(financeData.zuschuesse) : '',
              selbsthilfe: financeData?.selbsthilfe ? formatCurrencyForDisplay(financeData.selbsthilfe) : '',
              wertVorhandenerGebaeudeteile: financeData?.wert_vorhandener_gebaeudeteile ? formatCurrencyForDisplay(financeData.wert_vorhandener_gebaeudeteile) : '',
              wertBaugrundstück: financeData?.wert_baugrundstueck ? formatCurrencyForDisplay(financeData.wert_baugrundstueck) : '',
              summeEigenleistung: ''
            },
            gesamtbetraege: ''
          }
        };

        setFormData(loadedFormData);
      } catch (error) {
        console.error('Error loading saved data:', error);
      } finally {
        setIsLoading(false);
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

  const handleSave = async () => {
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
      
      console.log('Saving to Supabase...');
      // Save progress to Supabase user_data table
      const { error: userError } = await supabase
        .from('user_data')
        .update({
          // Main applicant data
          title: mainApplicant.title || null,
          firstname: mainApplicant.firstName || null,
          lastname: mainApplicant.lastName || null,
          nationality: mainApplicant.nationality || null,
          birthDate: mainApplicant.birthDate || null,
          person_street: mainApplicant.street || null,
          person_housenumber: mainApplicant.houseNumber || null,
          person_postalcode: mainApplicant.postalCode || null,
          person_city: mainApplicant.city || null,
          phone: mainApplicant.phone || null,
          email: mainApplicant.email || null,
          employment: mainApplicant.employment?.type || null,
          branche: mainApplicant.employment?.details || null,
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
          
          // Additional applicants data
          weitere_antragstellende_personen: formData.step1.persons.length > 1 ? 
            formData.step1.persons.slice(1).map(person => ({
              title: person.title || null,
              firstName: person.firstName || null,
              lastName: person.lastName || null,
              nationality: person.nationality || null,
              birthDate: person.birthDate || null,
              street: person.street || null,
              houseNumber: person.houseNumber || null,
              postalCode: person.postalCode || null,
              city: person.city || null,
              phone: person.phone || null,
              email: person.email || null,
              employment: {
                type: person.employment?.type || null,
                details: person.employment?.details || null
              }
            })) : null,

          // Step 2 data
          adult_count: formData.step2.adultCount || null,
          child_count: formData.step2.childCount || null,
          is_disabled: formData.step2.isDisabled,
          is_married: formData.step2.isMarried,
          hasadditionalassets: formData.step2.hasAdditionalAssets,
          hasdoublesubsidy: formData.step2.hasDoubleSubsidy,
          childrenages: formData.step2.childrenAges || null,
          disabledadultscount: formData.step2.isDisabled ? formData.step2.disabledAdultsCount || null : null,
          disabledchildrencount: formData.step2.isDisabled ? formData.step2.disabledChildrenCount || null : null,
          additionalassetsdetails: formData.step2.hasAdditionalAssets ? formData.step2.additionalAssetsDetails || null : null,
          hasrepaidsubsidy: formData.step2.hasDoubleSubsidy ? formData.step2.hasRepaidSubsidy : null,
          subsidyamount: formData.step2.hasDoubleSubsidy ? formatCurrencyForDatabase(formData.step2.subsidyAmount) : null,
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
          haslocationcostloan: (formData.step3.foerderVariante === 'neubau' || formData.step3.foerderVariante?.includes('ersterwerb')) ? formData.step3.objektDetailsAllgemein.hasLocationCostLoan : null,
          haswoodconstructionloan: formData.step3.objektDetailsAllgemein.hasWoodConstructionLoan,
          obj_street: formData.step3.address.street || null,
          obj_house_number: formData.step3.address.houseNumber || null,
          obj_postal_code: formData.step3.address.postalCode || null,
          obj_city: formData.step3.address.city || null,
          foerderVariante: formData.step3.foerderVariante || null,
          wohnflaeche_selbstgenutzt: formData.step3.objektDetailsAllgemein.wohnflaecheSelbstgenutzt || null,
          gesamt_wohnflaeche: formData.step3.objektDetailsAllgemein.gesamtWohnflaeche || null,
          anzahl_zimmer: formData.step3.objektDetailsAllgemein.anzahlZimmer || null,
          anzahl_garagen: formData.step3.objektDetailsAllgemein.anzahlGaragen || null,
          has_gewerbeflaeche: formData.step3.objektDetailsAllgemein.gewerbeflaeche.hasGewerbeflaeche,
          gewerbeflaeche: formData.step3.objektDetailsAllgemein.gewerbeflaeche.hasGewerbeflaeche ? formData.step3.objektDetailsAllgemein.gewerbeflaeche.flaeche || null : null,
          has_ertraege: formData.step3.objektDetailsAllgemein.ertraege.hasErtraege,
          vermietete_wohnung: formData.step3.objektDetailsAllgemein.ertraege.hasErtraege ? formatCurrencyForDatabase(formData.step3.objektDetailsAllgemein.ertraege.vermieteteWohnung) || null : null,
          vermietete_garage: formData.step3.objektDetailsAllgemein.ertraege.hasErtraege ? formatCurrencyForDatabase(formData.step3.objektDetailsAllgemein.ertraege.vermieteteGarage) || null : null,
          barrierefrei: (formData.step3.foerderVariante === 'neubau' || formData.step3.foerderVariante?.includes('ersterwerb')) ? formData.step3.objektDetailsAllgemein.barrierefrei : null,
          beg_effizienzhaus_40_standard: (formData.step3.foerderVariante === 'neubau' || formData.step3.foerderVariante?.includes('ersterwerb')) ? formData.step3.objektDetailsAllgemein.begEffizienzhaus40Standard : null,

          // Conditional fields based on foerderVariante
          anzahl_vollgeschosse: (formData.step3.foerderVariante === 'bestandserwerb-wohnung' || formData.step3.foerderVariante === 'ersterwerb-wohnung') ? formData.step3.objektDetailsEigentumswohnung.anzahlVollgeschosse || null : null,
          wohnungen_am_hauseingang: (formData.step3.foerderVariante === 'bestandserwerb-wohnung' || formData.step3.foerderVariante === 'ersterwerb-wohnung') ? formData.step3.objektDetailsEigentumswohnung.wohnungenAmHauseingang || null : null,
          lage_im_gebaeude: (formData.step3.foerderVariante === 'bestandserwerb-wohnung' || formData.step3.foerderVariante === 'ersterwerb-wohnung') ? formData.step3.objektDetailsEigentumswohnung.lageImGebaeude || null : null,
          lage_im_geschoss: (formData.step3.foerderVariante === 'bestandserwerb-wohnung' || formData.step3.foerderVariante === 'ersterwerb-wohnung') ? formData.step3.objektDetailsEigentumswohnung.lageImGeschoss || null : null,

          // Conditional fields for Neubau/Ersterwerb
          baugenehmigung_erforderlich: (formData.step3.foerderVariante === 'neubau' || formData.step3.foerderVariante === 'ersterwerb-eigenheim' || formData.step3.foerderVariante === 'ersterwerb-wohnung') ? formData.step3.objektDetailsNeubauErsterwerb.baugenehmigungErforderlich : null,
          baugenehmigung_wurde_erteilt: (formData.step3.foerderVariante === 'neubau' || formData.step3.foerderVariante === 'ersterwerb-eigenheim' || formData.step3.foerderVariante === 'ersterwerb-wohnung') ? formData.step3.objektDetailsNeubauErsterwerb.baugenehmigung.wurdeErteilt : null,
          erteilungs_datum: (formData.step3.foerderVariante === 'neubau' || formData.step3.foerderVariante === 'ersterwerb-eigenheim' || formData.step3.foerderVariante === 'ersterwerb-wohnung') && formData.step3.objektDetailsNeubauErsterwerb.baugenehmigung.wurdeErteilt ? formData.step3.objektDetailsNeubauErsterwerb.baugenehmigung.erteilungsDatum || null : null,
          aktenzeichen: (formData.step3.foerderVariante === 'neubau' || formData.step3.foerderVariante === 'ersterwerb-eigenheim' || formData.step3.foerderVariante === 'ersterwerb-wohnung') && formData.step3.objektDetailsNeubauErsterwerb.baugenehmigung.wurdeErteilt ? formData.step3.objektDetailsNeubauErsterwerb.baugenehmigung.aktenzeichen || null : null,
          erteilungs_behoerde: (formData.step3.foerderVariante === 'neubau' || formData.step3.foerderVariante === 'ersterwerb-eigenheim' || formData.step3.foerderVariante === 'ersterwerb-wohnung') && formData.step3.objektDetailsNeubauErsterwerb.baugenehmigung.wurdeErteilt ? formData.step3.objektDetailsNeubauErsterwerb.baugenehmigung.erteilungsBehoerde || null : null,
          bauanzeige_wurde_eingereicht: (formData.step3.foerderVariante === 'neubau' || formData.step3.foerderVariante === 'ersterwerb-eigenheim' || formData.step3.foerderVariante === 'ersterwerb-wohnung') ? formData.step3.objektDetailsNeubauErsterwerb.bauanzeige.wurdeEingereicht : null,
          bauanzeige_einreichungs_datum: (formData.step3.foerderVariante === 'neubau' || formData.step3.foerderVariante === 'ersterwerb-eigenheim' || formData.step3.foerderVariante === 'ersterwerb-wohnung') && formData.step3.objektDetailsNeubauErsterwerb.bauanzeige.wurdeEingereicht ? formData.step3.objektDetailsNeubauErsterwerb.bauanzeige.einreichungsDatum || null : null,
          bauarbeiten_wurde_begonnen: (formData.step3.foerderVariante === 'neubau' || formData.step3.foerderVariante === 'ersterwerb-eigenheim' || formData.step3.foerderVariante === 'ersterwerb-wohnung') ? formData.step3.objektDetailsNeubauErsterwerb.bauarbeiten.wurdeBegonnen : null,
          bauarbeiten_beginn_datum: (formData.step3.foerderVariante === 'neubau' || formData.step3.foerderVariante === 'ersterwerb-eigenheim' || formData.step3.foerderVariante === 'ersterwerb-wohnung') && formData.step3.objektDetailsNeubauErsterwerb.bauarbeiten.wurdeBegonnen ? formData.step3.objektDetailsNeubauErsterwerb.bauarbeiten.beginnDatum || null : null,

          // Conditional field for Bestandserwerb
          bestandserwerb_baujahr: (formData.step3.foerderVariante === 'bestandserwerb-wohnung' || formData.step3.foerderVariante === 'bestandserwerb-eigenheim') ? formData.step3.objektDetailsBestandserwerb.baujahr || null : null,

          // Step 4 data
          eigentumsverhaeltnis: formData.step4.eigentumsverhaeltnis,
          kaufvertrag_wurde_abgeschlossen: formData.step4.kaufvertrag.wurdeAbgeschlossen,
          kaufvertrag_abschluss_datum: formData.step4.kaufvertrag.wurdeAbgeschlossen ? (formData.step4.kaufvertrag.abschlussDatum || null) : null,
          erbbaurecht: formData.step4.eigentumsverhaeltnis ? formData.step4.erbbaurecht : null,
          restlaufzeit_erbbaurecht: formData.step4.eigentumsverhaeltnis && formData.step4.erbbaurecht ? (formData.step4.restlaufzeitErbbaurecht || null) : null,
          grundbuch_type: formData.step4.grundbuch.type,
          grundbuch_amtsgericht: formData.step4.grundbuch.amtsgericht,
          ort_grundbuch: formData.step4.grundbuch.ortGrundbuch,
          grundbuch_gemarkung: formData.step4.grundbuch.gemarkung,
          grundbuch_blatt: formData.step4.grundbuch.blatt,
          grundbuch_flur: formData.step4.grundbuch.flur,
          grundbuch_flurstueck: formData.step4.grundbuch.flurstueck,
          grundbuch_flurstueck_neu: formData.step4.grundbuch.flurstueckNeu,
          grundstuecksgroesse: formData.step4.grundbuch.grundstuecksgroesse ? parseFloat(formData.step4.grundbuch.grundstuecksgroesse) : null,
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
          grundstueck_kaufpreis: formData.step3.foerderVariante === 'neubau' ? formatCurrencyForDatabase(formData.step5.baugrundstuck.kaufpreis) : null,
          grundstueck_wert: formData.step3.foerderVariante === 'neubau' ? formatCurrencyForDatabase(formData.step5.baugrundstuck.wert) : null,
          erschliessungskosten: formData.step3.foerderVariante === 'neubau' ? formatCurrencyForDatabase(formData.step5.baugrundstuck.erschliessungskosten) : null,
          standortbedingte_mehrkosten: formData.step3.foerderVariante === 'neubau' ? formatCurrencyForDatabase(formData.step5.baugrundstuck.standortbedingteMehrkosten) : null,

          // Kaufpreis (only for bestandserwerb or ersterwerb)
          kaufpreis: (formData.step3.foerderVariante.includes('bestandserwerb') || formData.step3.foerderVariante.includes('ersterwerb')) 
            ? formatCurrencyForDatabase(formData.step5.kaufpreis.kaufpreis) 
            : null,

          // Baukosten (only for Neubau or Nutzungsänderung)
          kosten_gebaeude: formData.step3.foerderVariante === 'neubau' ? formatCurrencyForDatabase(formData.step5.baukosten.kostenGebaeude) : null,
          besondere_bauausfuehrung: (formData.step3.foerderVariante === 'neubau' || formData.step3.foerderVariante === 'nutzungsaenderung') 
            ? formatCurrencyForDatabase(formData.step5.baukosten.besondereBauausfuhrung) 
            : null,
          wert_vorhandener_gebaeude: (formData.step3.foerderVariante === 'neubau' || formData.step3.foerderVariante === 'nutzungsaenderung') 
            ? formatCurrencyForDatabase(formData.step5.baukosten.wertVorhandenerGebaude) 
            : null,
          kosten_aussenanlagen: (formData.step3.foerderVariante === 'neubau' || formData.step3.foerderVariante === 'nutzungsaenderung') 
            ? formatCurrencyForDatabase(formData.step5.baukosten.kostenAussenanlagen) 
            : null,
          kosten_architekt: (formData.step3.foerderVariante === 'neubau' || formData.step3.foerderVariante === 'nutzungsaenderung') 
            ? formatCurrencyForDatabase(formData.step5.baukosten.kostenArchitekt) 
            : null,

          // Nebenkosten (always saved)
          erwerbsnebenkosten: formatCurrencyForDatabase(formData.step5.nebenkosten.erwerbsnebenkosten),
          verwaltungsleistungen: formatCurrencyForDatabase(formData.step5.nebenkosten.verwaltungsleistungen),
          beschaffung_dauerfinanzierung: formatCurrencyForDatabase(formData.step5.nebenkosten.beschaffungDauerfinanzierung),
          beschaffung_zwischenfinanzierung: formatCurrencyForDatabase(formData.step5.nebenkosten.beschaffungZwischenfinanzierung),
          sonstige_nebenkosten: formatCurrencyForDatabase(formData.step5.nebenkosten.sonstigeNebenkosten),
          zusaetzliche_kosten: formatCurrencyForDatabase(formData.step5.nebenkosten.zusatzlicheKosten),
          
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
            nennbetrag: formatCurrencyForDatabase(darlehen.nennbetrag)
          })),

          // NRW Bank data
          grunddarlehen_nennbetrag: formatCurrencyForDatabase(formData.step6.darlehenNRWBank.grunddarlehen.nennbetrag),
          
          // Zusatzdarlehen data - only save if conditions are met
          zusatzdarlehen_familienbonus_nennbetrag: parseInt(formData.step2.childCount) > 0 ? 
            formatCurrencyForDatabase(formData.step6.darlehenNRWBank.zusatzdarlehen.familienbonus.nennbetrag) : null,
          
          zusatzdarlehen_bauen_mit_holz_nennbetrag: formData.step3.objektDetailsAllgemein.hasWoodConstructionLoan ? 
            formatCurrencyForDatabase(formData.step6.darlehenNRWBank.zusatzdarlehen.bauenMitHolz.nennbetrag) : null,

          zusatzdarlehen_barrierefreiheit_nennbetrag: (formData.step3.objektDetailsAllgemein.barrierefrei && (formData.step3.foerderVariante === 'neubau' || formData.step3.foerderVariante?.includes('ersterwerb'))) ? 
            formatCurrencyForDatabase(formData.step6.darlehenNRWBank.zusatzdarlehen.barrierefreiheit.nennbetrag) : null,
          
          zusatzdarlehen_standortbedingte_mehrkosten_nennbetrag: (formData.step3.objektDetailsAllgemein.hasLocationCostLoan && (formData.step3.foerderVariante === 'neubau' || formData.step3.foerderVariante?.includes('ersterwerb'))) ? 
            formatCurrencyForDatabase(formData.step6.darlehenNRWBank.zusatzdarlehen.standortbedingteMehrkosten.nennbetrag) : null,
          
          zusatzdarlehen_effizienzhaus40_nennbetrag: (formData.step3.objektDetailsAllgemein.begEffizienzhaus40Standard && (formData.step3.foerderVariante === 'neubau' || formData.step3.foerderVariante?.includes('ersterwerb'))) ? 
            formatCurrencyForDatabase(formData.step6.darlehenNRWBank.zusatzdarlehen.begEffizienzhaus40Standard.nennbetrag) : null,

          // Ergänzungsdarlehen - only save if hasSupplementaryLoan is true
          ergaenzungsdarlehen_nennbetrag: formData.step2.hasSupplementaryLoan ? 
            formatCurrencyForDatabase(formData.step6.ergaenzungsdarlehen.nennbetrag) : null,

          // Eigenleistung data
          eigene_geldmittel: formatCurrencyForDatabase(formData.step6.eigenleistung.eigeneGeldmittel),
          zuschuesse: formatCurrencyForDatabase(formData.step6.eigenleistung.zuschüsse),
          selbsthilfe: formatCurrencyForDatabase(formData.step6.eigenleistung.selbsthilfe),
          
          // Conditional Eigenleistung fields
          wert_vorhandener_gebaeudeteile: (formData.step3.foerderVariante === 'neubau' || formData.step3.foerderVariante === 'nutzungsaenderung') ? 
            formatCurrencyForDatabase(formData.step6.eigenleistung.wertVorhandenerGebaeudeteile) : null,
          
          wert_baugrundstueck: formData.step3.foerderVariante === 'neubau' ? 
            formatCurrencyForDatabase(formData.step6.eigenleistung.wertBaugrundstück) : null,
          
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (financeError) throw financeError;

      // Also save to local storage as backup
      localStorage.setItem('hauptantragFormData', JSON.stringify(formData));

      // If we get here, all saves were successful
      console.log('All saves completed successfully');
      
      // Navigate to personal space
      navigate('/personal-space');
    } catch (error) {
      console.error('Error saving form data:', error);
      // Fallback to local storage if Supabase save fails
      localStorage.setItem('hauptantragFormData', JSON.stringify(formData));
      // Don't navigate on error
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (stepKey: keyof FormData, data: any) => {
    setFormData(prev => ({
      ...prev,
      [stepKey]: data
    }));
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
      if (!person.nationality) errors[1].push(`Person ${index + 1}: Staatsangehörigkeit ist erforderlich`);
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
      if (!person.employment.type) errors[1].push(`Person ${index + 1}: Beschäftigungsart ist erforderlich`);
      if ((person.employment.type == 'sole-trader' || person.employment.type == 'business-owner' || person.employment.type == 'freelancer' || person.employment.type == 'farmer' || person.employment.type == 'private-income') && !person.employment.details) errors[1].push(`Person ${index + 1}: Branche ist erforderlich`);
    });
    if (formData.step1.representative.hasRepresentative === null) errors[1].push('Bitte geben Sie an, ob Sie einen Bevollmächtigten angeben wollen');
    if (formData.step1.representative.isCompany === null && formData.step1.representative.hasRepresentative == true) errors[1].push('Bitte geben Sie an, ob es sich um eine Firma handelt');
    // Representative Company Info
    if (!formData.step1.representative.companyName && formData.step1.representative.isCompany == true) errors[1].push('Bitte geben Sie den Namen der Bevollmächtigten Firma ein');
    if (!formData.step1.representative.postboxCity && formData.step1.representative.isCompany == true) errors[1].push('Bitte geben Sie den Ort des Postfachs der Bevollmächtigten Firma ein');
    if (!formData.step1.representative.postboxPostcode && formData.step1.representative.isCompany == true) errors[1].push('Bitte geben Sie die Postleitzahl des Postfachs der Bevollmächtigten Firma ein');
    // Representative Personal Info
    if (!formData.step1.representative.title && formData.step1.representative.isCompany == false) errors[1].push('Bitte geben Sie den Titel des Bevollmächtigten ein');
    if (!formData.step1.representative.firstName && formData.step1.representative.isCompany == false) errors[1].push('Bitte geben Sie den Vornamen des Bevollmächtigten ein');
    if (!formData.step1.representative.lastName && formData.step1.representative.isCompany == false) errors[1].push('Bitte geben Sie den Nachnamen des Bevollmächtigten ein');
    if (!formData.step1.representative.street && formData.step1.representative.isCompany == false) errors[1].push('Bitte geben Sie die Straße des Bevollmächtigten ein');
    if (!formData.step1.representative.houseNumber && formData.step1.representative.isCompany == false) errors[1].push('Bitte geben Sie die Hausnummer des Bevollmächtigten ein');
    if (!formData.step1.representative.postalCode && formData.step1.representative.isCompany == false) errors[1].push('Bitte geben Sie die Postleitzahl des Bevollmächtigten ein');
    if (!formData.step1.representative.city && formData.step1.representative.isCompany == false) errors[1].push('Bitte geben Sie die Stadt des Bevollmächtigten ein');
    if (!formData.step1.representative.phone && formData.step1.representative.isCompany == false) errors[1].push('Bitte geben Sie die Telefonnummer des Bevollmächtigten ein');
    if (!formData.step1.representative.email && formData.step1.representative.isCompany == false) errors[1].push('Bitte geben Sie die E-Mail des Bevollmächtigten ein');

    // Validate Step 2
    errors[2] = [];
    if (!formData.step2.adultCount) errors[2].push('Bitte geben Sie die Anzahl der Erwachsenen ein');
    if (parseInt(formData.step2.adultCount) < 0) errors[2].push('Die Anzahl der Erwachsenen darf nicht negativ sein');
    if (parseInt(formData.step2.adultCount) === 0) errors[2].push('Die Anzahl der Erwachsenen darf nicht 0 sein');
    if (!formData.step2.childCount) errors[2].push('Bitte geben Sie die Anzahl der Kinder ein');
    if (parseInt(formData.step2.childCount) < 0) errors[2].push('Die Anzahl der Kinder darf nicht negativ sein');
    if (parseInt(formData.step2.childCount) > 0 && !formData.step2.childrenAges) errors[2].push('Bitte geben Sie das Alter der Kinder ein');
    // Check if any child age is greater than 17
    if (formData.step2.childrenAges) {
      const ages = formData.step2.childrenAges.split(',').map(age => parseInt(age.trim()));
      if (ages.some(age => age > 17)) {
        errors[2].push('Volljährige Personen zählen als Erwachsene');
      }
    }

    if (formData.step2.isDisabled == null) errors[2].push('Bitte geben Sie an, ob behinderte Menschen in dem Haushalt leben');
    if (formData.step2.isDisabled === true) {
      const totalDisabled = parseInt(formData.step2.disabledAdultsCount || '0') + parseInt(formData.step2.disabledChildrenCount || '0');
      const totalHousehold = parseInt(formData.step2.adultCount || '0') + parseInt(formData.step2.childCount || '0');
      if (totalDisabled <= 0) {
        errors[2].push('Bitte geben Sie die Anzahl der behinderten Menschen in ihrem Haushalt ein');
      }
      if (totalDisabled > totalHousehold) {
        errors[2].push('Die Anzahl der behinderten Menschen kann nicht größer sein als die Gesamtanzahl der Haushaltsmitglieder');
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
        errors[2].push('Bitte geben Sie den Betrag der Fördermittel ein');
      }
      if (!formData.step2.subsidyFileNumber) {
        errors[2].push('Bitte geben Sie das Aktenzeichen ein');
      }
      if (!formData.step2.subsidyAuthority) {
        errors[2].push('Bitte geben Sie die Bewilligungsbehörde ein');
      }
    }

    // Check supplementary loan
    if (formData.step2.hasSupplementaryLoan === null) {
      errors[2].push('Bitte geben Sie an, ob Sie ein Ergänzungsdarlehen der NRW.BANK beantragen');
    }

    // Validate Step 3
    errors[3] = [];
    
    // Address validation
    if (!formData.step3.address.street) errors[3].push('Bitte geben Sie die Straße ein');
    if (!formData.step3.address.houseNumber) errors[3].push('Bitte geben Sie die Hausnummer ein');
    if (!formData.step3.address.postalCode) errors[3].push('Bitte geben Sie die Postleitzahl ein');
    else {
      const postalCode = formData.step3.address.postalCode;
      const validStartNumbers = ['32', '33', '34', '37', '40', '41', '42', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '57', '58', '59'];
      
      if (!/^\d{5}$/.test(postalCode)) {
        errors[3].push('Die Postleitzahl muss aus genau 5 Ziffern bestehen');
      } else if (!validStartNumbers.includes(postalCode.substring(0, 2))) {
        errors[3].push('Die Postleitzahl muss sich in Nordrhein-Westfalen befinden');
      }
    }
    if (!formData.step3.address.city) errors[3].push('Bitte geben Sie die Stadt ein');

    // FoerderVariante validation
    if (!formData.step3.foerderVariante) {
      errors[3].push('Bitte wählen Sie eine Förderungsvariante aus');
    }

    // ObjektDetailsAllgemein validation
    if (!formData.step3.objektDetailsAllgemein.wohnflaecheSelbstgenutzt) errors[3].push('Bitte geben Sie die selbstgenutzte Wohnfläche ein');
    if (!formData.step3.objektDetailsAllgemein.gesamtWohnflaeche) errors[3].push('Bitte geben Sie die Gesamtwohnfläche ein');
    if (!formData.step3.objektDetailsAllgemein.anzahlZimmer) errors[3].push('Bitte geben Sie die Anzahl der Zimmer ein');
    if (!formData.step3.objektDetailsAllgemein.anzahlGaragen) errors[3].push('Bitte geben Sie die Anzahl der Garagen ein');

    // Gewerbefläche validation
    if (formData.step3.objektDetailsAllgemein.gewerbeflaeche.hasGewerbeflaeche === null) {
      errors[3].push('Bitte geben Sie an, ob eine Gewerbefläche vorhanden ist');
    }
    if (formData.step3.objektDetailsAllgemein.gewerbeflaeche.hasGewerbeflaeche === true && !formData.step3.objektDetailsAllgemein.gewerbeflaeche.flaeche) {
      errors[3].push('Bitte geben Sie die Größe der Gewerbefläche ein');
    }

    // Erträge validation
    if (formData.step3.objektDetailsAllgemein.ertraege.hasErtraege === null) {
      errors[3].push('Bitte geben Sie an, ob Erträge vorhanden sind');
    }
    if (formData.step3.objektDetailsAllgemein.ertraege.hasErtraege === true) {
      if (!formData.step3.objektDetailsAllgemein.ertraege.vermieteteWohnung && !formData.step3.objektDetailsAllgemein.ertraege.vermieteteGarage) {
        errors[3].push('Bitte geben Sie mindestens einen Ertragswert ein (vermietete Wohnung oder Garage)');
      }
    }
    if (formData.step3.objektDetailsAllgemein.hasWoodConstructionLoan === null) {
      errors[3].push('Bitte geben Sie an, ob Sie ein Zusatzdarlehen für Bauen mit Holz beantragen');
    }

    // Eigentumswohnung validation
    if (formData.step3.foerderVariante?.includes('wohnung')) {
      if (!formData.step3.objektDetailsEigentumswohnung.anzahlVollgeschosse) errors[3].push('Bitte geben Sie die Anzahl der Vollgeschosse ein');
      if (!formData.step3.objektDetailsEigentumswohnung.wohnungenAmHauseingang) errors[3].push('Bitte geben Sie die Anzahl der Wohnungen am Hauseingang ein');
      if (!formData.step3.objektDetailsEigentumswohnung.lageImGebaeude) errors[3].push('Bitte geben Sie die Lage im Gebäude ein');
      if (!formData.step3.objektDetailsEigentumswohnung.lageImGeschoss) errors[3].push('Bitte geben Sie die Lage im Geschoss ein');
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
          if (!formData.step3.objektDetailsNeubauErsterwerb.baugenehmigung.erteilungsDatum) errors[3].push('Bitte geben Sie das Erteilungsdatum der Baugenehmigung ein');
          if (!formData.step3.objektDetailsNeubauErsterwerb.baugenehmigung.aktenzeichen) errors[3].push('Bitte geben Sie das Aktenzeichen der Baugenehmigung ein');
          if (!formData.step3.objektDetailsNeubauErsterwerb.baugenehmigung.erteilungsBehoerde) errors[3].push('Bitte geben Sie die erteilende Behörde der Baugenehmigung ein');
        }
      }

      if (formData.step3.objektDetailsNeubauErsterwerb.bauanzeige.wurdeEingereicht === null) {
        errors[3].push('Bitte geben Sie an, ob eine Bauanzeige eingereicht wurde');
      }

      if (formData.step3.objektDetailsNeubauErsterwerb.bauanzeige.wurdeEingereicht === true && !formData.step3.objektDetailsNeubauErsterwerb.bauanzeige.einreichungsDatum) {
        errors[3].push('Bitte geben Sie das Einreichungsdatum der Bauanzeige ein');
      }

      if (formData.step3.objektDetailsNeubauErsterwerb.bauarbeiten.wurdeBegonnen === null) {
        errors[3].push('Bitte geben Sie an, ob die Bauarbeiten begonnen wurden');
      }

      if (formData.step3.objektDetailsNeubauErsterwerb.bauarbeiten.wurdeBegonnen === true && !formData.step3.objektDetailsNeubauErsterwerb.bauarbeiten.beginnDatum) {
        errors[3].push('Bitte geben Sie das Datum des Baubeginns ein');
      }
    }

    // Bestandserwerb validation
    if (formData.step3.foerderVariante?.includes('bestandserwerb') && !formData.step3.objektDetailsBestandserwerb.baujahr) {
      errors[3].push('Bitte geben Sie das Baujahr ein');
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
        errors[4].push('Bitte geben Sie das Abschlussdatum des Kaufvertrags ein');
      }
    }

    // Erbbaurecht validation - only if eigentumsverhaeltnis is true
    if (formData.step4.eigentumsverhaeltnis === true) {
      if (formData.step4.erbbaurecht === null) {
        errors[4].push('Bitte geben Sie an, ob Erbbaurecht vorhanden ist');
      }
      if (formData.step4.erbbaurecht === true && !formData.step4.restlaufzeitErbbaurecht) {
        errors[4].push('Bitte geben Sie die Restlaufzeit des Erbbaurechts ein');
      }
    }

    // Grundbuch validation - only if eigentumsverhaeltnis is true
    if (formData.step4.eigentumsverhaeltnis === true) {
      if (!formData.step4.grundbuch.type) {
        errors[4].push('Bitte wählen Sie einen Grundbuchtyp aus');
      }
      if (!formData.step4.grundbuch.amtsgericht) {
        errors[4].push('Bitte geben Sie das Amtsgericht ein');
      }
      if (!formData.step4.grundbuch.ortGrundbuch) {
        errors[4].push('Bitte geben Sie den Ort des Grundbuchs ein');
      }
      if (!formData.step4.grundbuch.gemarkung) {
        errors[4].push('Bitte geben Sie die Gemarkung ein');
      }
      if (!formData.step4.grundbuch.blatt) {
        errors[4].push('Bitte geben Sie das Blatt ein');
      }
      if (!formData.step4.grundbuch.flur) {
        errors[4].push('Bitte geben Sie die Flur ein');
      }
      if (!formData.step4.grundbuch.flurstueck) {
        errors[4].push('Bitte geben Sie das Flurstück ein');
      }
      if (!formData.step4.grundbuch.grundstuecksgroesse) {
        errors[4].push('Bitte geben Sie die Grundstücksgröße ein');
      }
    }

    // Baulasten validation
    if (formData.step4.baulasten.vorhanden === null) {
      errors[4].push('Bitte geben Sie an, ob Baulasten vorhanden sind');
    }
    if (formData.step4.baulasten.vorhanden === true && !formData.step4.baulasten.art) {
      errors[4].push('Bitte geben Sie die Art der Baulasten ein');
    }

    // Altlasten validation
    if (formData.step4.altlasten.vorhanden === null) {
      errors[4].push('Bitte geben Sie an, ob Altlasten vorhanden sind');
    }
    if (formData.step4.altlasten.vorhanden === true && !formData.step4.altlasten.art) {
      errors[4].push('Bitte geben Sie die Art der Altlasten ein');
    }

    // Validate Step 5
    errors[5] = [];
    
    // Baugrundstück validation for Neubau
    if (formData.step3.foerderVariante === 'neubau') {
      if (!formData.step5.baugrundstuck.kaufpreis) errors[5].push('Bitte geben Sie den Kaufpreis des Baugrundstücks ein (0,00€ wenn nicht vorhanden)');
      if (!formData.step5.baugrundstuck.wert) errors[5].push('Bitte geben Sie den Wert des Baugrundstücks ein (0,00€ wenn nicht vorhanden)');
      if (!formData.step5.baugrundstuck.erschliessungskosten) errors[5].push('Bitte geben Sie die Erschließungskosten ein (0,00€ wenn nicht vorhanden)');
      if (!formData.step5.baugrundstuck.standortbedingteMehrkosten) errors[5].push('Bitte geben Sie die standortbedingten Mehrkosten ein (0,00€ wenn nicht vorhanden)');
    }

    // Kaufpreis validation for Bestandserwerb or Ersterwerb
    if (formData.step3.foerderVariante?.includes('bestandserwerb') || formData.step3.foerderVariante?.includes('ersterwerb')) {
      if (!formData.step5.kaufpreis.kaufpreis) errors[5].push('Bitte geben Sie den Kaufpreis ein');
    }

    // Baukosten validation for Neubau or Nutzungsänderung
    if (formData.step3.foerderVariante === 'neubau' || formData.step3.foerderVariante === 'nutzungsaenderung') {
      if (formData.step3.foerderVariante === 'neubau' && !formData.step5.baukosten.kostenGebaeude) {
        errors[5].push('Bitte geben Sie die Kosten des Gebäudes ein');
      }
      if (!formData.step5.baukosten.besondereBauausfuhrung) errors[5].push('Bitte geben Sie die besondere Bauausführung ein (0,00€ wenn nicht vorhanden)');
      if (!formData.step5.baukosten.wertVorhandenerGebaude) errors[5].push('Bitte geben Sie den Wert vorhandener Gebäudeteile ein (0,00€ wenn nicht vorhanden)');
      if (!formData.step5.baukosten.kostenAussenanlagen) errors[5].push('Bitte geben Sie die Kosten der Außenanlagen ein (0,00€ wenn nicht vorhanden)');
      if (!formData.step5.baukosten.kostenArchitekt) errors[5].push('Bitte geben Sie die Kosten der Architekten- und Ingenieurleistungen ein (0,00€ wenn nicht vorhanden)');
    }

    // Nebenkosten validation (always required)
    if (!formData.step5.nebenkosten.erwerbsnebenkosten) errors[5].push('Bitte geben Sie die Erwerbsnebenkosten ein (0,00€ wenn nicht vorhanden)');
    if (!formData.step5.nebenkosten.verwaltungsleistungen) errors[5].push('Bitte geben Sie die Kosten der Verwaltungsleistungen ein (0,00€ wenn nicht vorhanden)');
    if (!formData.step5.nebenkosten.beschaffungDauerfinanzierung) errors[5].push('Bitte geben Sie die Kosten der Beschaffung der Dauerfinanzierungsmittel ein (0,00€ wenn nicht vorhanden)');
    if (!formData.step5.nebenkosten.beschaffungZwischenfinanzierung) errors[5].push('Bitte geben Sie die Kosten der Beschaffung und Verzinsung der Zwischenfinanzierung ein (0,00€ wenn nicht vorhanden)');
    if (!formData.step5.nebenkosten.sonstigeNebenkosten) errors[5].push('Bitte geben Sie die sonstigen Nebenkosten ein (0,00€ wenn nicht vorhanden)');
    if (!formData.step5.nebenkosten.zusatzlicheKosten) errors[5].push('Bitte geben Sie die zusätzlichen Kosten ein (0,00€ wenn nicht vorhanden)');

    // Validate Step 6
    errors[6] = [];

    // Validate Fremddarlehen fields
    formData.step6.fremddarlehen.forEach((darlehen, index) => {
      // Check if any field has a value (excluding the id field)
      const hasAnyValue = Object.entries(darlehen)
        .filter(([key]) => key !== 'id') // Exclude the id field from the check
        .some(([_, value]) => value !== '');
      
      if (hasAnyValue) {
        if (!darlehen.darlehenGeber) errors[6].push(`Fremddarlehen ${index + 1}: Bitte geben Sie den Darlehensgeber ein`);
        if (!darlehen.nennbetrag) errors[6].push(`Fremddarlehen ${index + 1}: Bitte geben Sie den Nennbetrag ein`);
        if (!darlehen.zinssatz) errors[6].push(`Fremddarlehen ${index + 1}: Bitte geben Sie den Zinssatz ein`);
        if (!darlehen.auszahlung) errors[6].push(`Fremddarlehen ${index + 1}: Bitte geben Sie die Auszahlung ein`);
        if (!darlehen.tilgung) errors[6].push(`Fremddarlehen ${index + 1}: Bitte geben Sie die Tilgung ein`);
      }
    });

    // Validate Ergänzungsdarlehen if hasSupplementaryLoan is true
    if (formData.step2.hasSupplementaryLoan === true) {
      if (!formData.step6.ergaenzungsdarlehen.nennbetrag) {
        errors[6].push('Bitte geben Sie den Nennbetrag des Ergänzungsdarlehens ein');
      }
    } else {
      // Validate NRW Bank Darlehen
      if (!formData.step6.darlehenNRWBank.grunddarlehen.nennbetrag) {
        errors[6].push('Bitte geben Sie den Nennbetrag des Grunddarlehens ein');
      }

      // Validate Familienbonus if childCount > 0
      if (parseInt(formData.step2.childCount) > 0 && !formData.step6.darlehenNRWBank.zusatzdarlehen.familienbonus.nennbetrag) {
        errors[6].push('Bitte geben Sie den Nennbetrag des Familienbonus ein (0,00€ wenn nicht vorhanden)');
      }
      // Validate Bauen mit Holz
      if (formData.step3.objektDetailsAllgemein.hasWoodConstructionLoan === true && !formData.step6.darlehenNRWBank.zusatzdarlehen.bauenMitHolz.nennbetrag) {
        errors[6].push('Bitte geben Sie den Nennbetrag für Bauen mit Holz ein (0,00€ wenn nicht vorhanden)');
      }
      // Validate Barrierefreiheit if barrierefrei is true
      if ((formData.step3.foerderVariante === 'neubau' || formData.step3.foerderVariante?.includes('ersterwerb')) && 
          formData.step3.objektDetailsAllgemein.barrierefrei === true && 
          !formData.step6.darlehenNRWBank.zusatzdarlehen.barrierefreiheit.nennbetrag) {
        errors[6].push('Bitte geben Sie den Nennbetrag für Barrierefreiheit ein (0,00€ wenn nicht vorhanden)');
      }
      // Validate Standortbedingte Mehrkosten
      if ((formData.step3.foerderVariante === 'neubau' || formData.step3.foerderVariante?.includes('ersterwerb')) && 
          formData.step3.objektDetailsAllgemein.hasLocationCostLoan === true && 
          !formData.step6.darlehenNRWBank.zusatzdarlehen.standortbedingteMehrkosten.nennbetrag) {
        errors[6].push('Bitte geben Sie den Nennbetrag für standortbedingte Mehrkosten ein (0,00€ wenn nicht vorhanden)');
      }

      // Validate BEG Effizienzhaus 40 Standard if begEffizienzhaus40Standard is true
      if ((formData.step3.foerderVariante === 'neubau' || formData.step3.foerderVariante?.includes('ersterwerb')) && 
          formData.step3.objektDetailsAllgemein.begEffizienzhaus40Standard === true && 
          !formData.step6.darlehenNRWBank.zusatzdarlehen.begEffizienzhaus40Standard.nennbetrag) {
        errors[6].push('Bitte geben Sie den Nennbetrag für BEG Effizienzhaus 40 Standard ein (0,00€ wenn nicht vorhanden)');
      }
    }

    // Validate Eigenleistung fields (always required)
    if (!formData.step6.eigenleistung.eigeneGeldmittel) errors[6].push('Bitte geben Sie die eigenen Geldmittel ein (0,00€ wenn nicht vorhanden)');
    if (!formData.step6.eigenleistung.zuschüsse) errors[6].push('Bitte geben Sie die Zuschüsse ein (0,00€ wenn nicht vorhanden)');
    if (!formData.step6.eigenleistung.selbsthilfe) errors[6].push('Bitte geben Sie die Selbsthilfe ein (0,00€ wenn nicht vorhanden)');

    // Validate wertBaugrundstück if foerderVariante is "neubau"
    if (formData.step3.foerderVariante === 'neubau' && !formData.step6.eigenleistung.wertBaugrundstück) {
      errors[6].push('Bitte geben Sie den Wert des Baugrundstücks ein (0,00€ wenn nicht vorhanden)');
    }

    // Validate wertVorhandenerGebaeudeteile if foerderVariante is "neubau" or "nutzungsaenderung"
    if ((formData.step3.foerderVariante === 'neubau' || formData.step3.foerderVariante === 'nutzungsaenderung') && !formData.step6.eigenleistung.wertVorhandenerGebaeudeteile) {
      errors[6].push('Bitte geben Sie den Wert vorhandener Gebäudeteile ein (0,00€ wenn nicht vorhanden)');
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

    return true;
  };

  const calculateProgress = () => {
    let totalPotentialFields = 0;
    let actualErrors = 0;

    // Step 1: Personal Information
    // Count required fields for each person (12 base fields + 1 conditional)
    formData.step1.persons.forEach(person => {
      // Base required fields (12)
      totalPotentialFields += 12;
      if (!person.title) actualErrors++;
      if (!person.firstName) actualErrors++;
      if (!person.lastName) actualErrors++;
      if (!person.birthDate) actualErrors++;
      if (!person.nationality) actualErrors++;
      if (!person.street) actualErrors++;
      if (!person.houseNumber) actualErrors++;
      if (!person.postalCode) actualErrors++;
      if (!person.city) actualErrors++;
      if (!person.phone) actualErrors++;
      if (!person.email) actualErrors++;
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
      } else {
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
      }else if(!validStartNumbers.includes(postalCode.substring(0, 2))){  actualErrors++;
      }
    }
    if (!formData.step3.address.city) actualErrors++;

    // FoerderVariante is always required
    totalPotentialFields++;
    if (!formData.step3.foerderVariante) actualErrors++;

    // Base object details (4)
    totalPotentialFields += 4;
    if (!formData.step3.objektDetailsAllgemein.wohnflaecheSelbstgenutzt) actualErrors++;
    if (!formData.step3.objektDetailsAllgemein.gesamtWohnflaeche) actualErrors++;
    if (!formData.step3.objektDetailsAllgemein.anzahlZimmer) actualErrors++;
    if (!formData.step3.objektDetailsAllgemein.anzahlGaragen) actualErrors++;

    // Gewerbefläche
    totalPotentialFields++;
    if (formData.step3.objektDetailsAllgemein.gewerbeflaeche.hasGewerbeflaeche === null) actualErrors++;
    if (formData.step3.objektDetailsAllgemein.gewerbeflaeche.hasGewerbeflaeche) {
      totalPotentialFields++;
      if (!formData.step3.objektDetailsAllgemein.gewerbeflaeche.flaeche) actualErrors++;
    }

    // Erträge
    totalPotentialFields++;
    if (formData.step3.objektDetailsAllgemein.ertraege.hasErtraege === null) actualErrors++;
    if (formData.step3.objektDetailsAllgemein.ertraege.hasErtraege) {
      totalPotentialFields += 1;
      if (!formData.step3.objektDetailsAllgemein.ertraege.vermieteteWohnung && !formData.step3.objektDetailsAllgemein.ertraege.vermieteteGarage) actualErrors++;
    }

    // Wood construction loan
    totalPotentialFields++;
    if (formData.step3.objektDetailsAllgemein.hasWoodConstructionLoan === null) actualErrors++;

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
      }

      // Bauarbeiten
      totalPotentialFields++;
      if (formData.step3.objektDetailsNeubauErsterwerb.bauarbeiten.wurdeBegonnen === null) actualErrors++;
      if (formData.step3.objektDetailsNeubauErsterwerb.bauarbeiten.wurdeBegonnen) {
        totalPotentialFields++;
        if (!formData.step3.objektDetailsNeubauErsterwerb.bauarbeiten.beginnDatum) actualErrors++;
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
      if (!formData.step4.grundbuch.grundstuecksgroesse) actualErrors++;
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
    if (formData.step3.foerderVariante === 'neubau') {
      totalPotentialFields += 4;
      if (!formData.step5.baugrundstuck.kaufpreis) actualErrors++;
      if (!formData.step5.baugrundstuck.wert) actualErrors++;
      if (!formData.step5.baugrundstuck.erschliessungskosten) actualErrors++;
      if (!formData.step5.baugrundstuck.standortbedingteMehrkosten) actualErrors++;
    }

    if (formData.step3.foerderVariante?.includes('bestandserwerb') || formData.step3.foerderVariante?.includes('ersterwerb')) {
      totalPotentialFields++;
      if (!formData.step5.kaufpreis.kaufpreis) actualErrors++;
    }

    if (formData.step3.foerderVariante === 'neubau' || formData.step3.foerderVariante === 'nutzungsaenderung') {
      totalPotentialFields += 4;
      if (!formData.step5.baukosten.besondereBauausfuhrung) actualErrors++;
      if (!formData.step5.baukosten.wertVorhandenerGebaude) actualErrors++;
      if (!formData.step5.baukosten.kostenAussenanlagen) actualErrors++;
      if (!formData.step5.baukosten.kostenArchitekt) actualErrors++;
    }
    if (formData.step3.foerderVariante === 'neubau'){
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
    if (!formData.step5.nebenkosten.zusatzlicheKosten) actualErrors++;

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
    } else {
      totalPotentialFields++;
      if (!formData.step6.darlehenNRWBank.grunddarlehen.nennbetrag) actualErrors++;

      // Conditional Zusatzdarlehen fields
      if (parseInt(formData.step2.childCount) > 0) {
        totalPotentialFields++;
        if (!formData.step6.darlehenNRWBank.zusatzdarlehen.familienbonus.nennbetrag) actualErrors++;
      }
      if (formData.step3.objektDetailsAllgemein.hasWoodConstructionLoan) {
        totalPotentialFields++;
        if (!formData.step6.darlehenNRWBank.zusatzdarlehen.bauenMitHolz.nennbetrag) actualErrors++;
      }
      if ((formData.step3.foerderVariante === 'neubau' || formData.step3.foerderVariante?.includes('ersterwerb')) && 
          formData.step3.objektDetailsAllgemein.barrierefrei) {
        totalPotentialFields++;
        if (!formData.step6.darlehenNRWBank.zusatzdarlehen.barrierefreiheit.nennbetrag) actualErrors++;
      }
      if ((formData.step3.foerderVariante === 'neubau' || formData.step3.foerderVariante?.includes('ersterwerb')) && 
          formData.step3.objektDetailsAllgemein.hasLocationCostLoan) {
        totalPotentialFields++;
        if (!formData.step6.darlehenNRWBank.zusatzdarlehen.standortbedingteMehrkosten.nennbetrag) actualErrors++;
      }
      if ((formData.step3.foerderVariante === 'neubau' || formData.step3.foerderVariante?.includes('ersterwerb')) && 
          formData.step3.objektDetailsAllgemein.begEffizienzhaus40Standard) {
        totalPotentialFields++;
        if (!formData.step6.darlehenNRWBank.zusatzdarlehen.begEffizienzhaus40Standard.nennbetrag) actualErrors++;
      }
    }

    // Eigenleistung base fields (3)
    totalPotentialFields += 3;
    if (!formData.step6.eigenleistung.eigeneGeldmittel) actualErrors++;
    if (!formData.step6.eigenleistung.zuschüsse) actualErrors++;
    if (!formData.step6.eigenleistung.selbsthilfe) actualErrors++;

    // Conditional Eigenleistung fields
    if (formData.step3.foerderVariante === 'neubau') {
      totalPotentialFields++;
      if (!formData.step6.eigenleistung.wertBaugrundstück) actualErrors++;
    }
    if (formData.step3.foerderVariante === 'neubau' || formData.step3.foerderVariante === 'nutzungsaenderung') {
      totalPotentialFields++;
      if (!formData.step6.eigenleistung.wertVorhandenerGebaeudeteile) actualErrors++;
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
            barrierefrei={formData.step3.objektDetailsAllgemein.barrierefrei}
            begEffizienzhaus40Standard={formData.step3.objektDetailsAllgemein.begEffizienzhaus40Standard}
            hasSupplementaryLoan={formData.step2.hasSupplementaryLoan}
            hasLocationCostLoan={formData.step3.objektDetailsAllgemein.hasLocationCostLoan}
            hasWoodConstructionLoan={formData.step3.objektDetailsAllgemein.hasWoodConstructionLoan}
            showValidation={showValidation}
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

  return (
    <div className="hauptantrag-container">
      <style>
        {`
          .search-modal {
            max-width: 800px;
            width: 90%;
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
      <div className="absolute top-[-170px] left-[-25%] w-[70%] h-[300px] bg-[#064497] rounded-[50%]"></div>
      
      {/* Main heading */}
      <div className="absolute top-12 start-9">
        <h1 className="display-6 fw-regular text-[#ffffff] mb-2 font-['Roboto']">
          Hauptantrag
        </h1>
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
          
          <div className="d-flex align-items-center gap-3 px-3">
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
            onClick={handleSave}
            className="text-decoration-underline mb-5 mt-3"
            style={{ color: 'black' }}
          >
            Speichern und später fortsetzen
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
                  <h5 className="text-danger mb-2">Schritt {step}:</h5>
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
    </div>
  );
};

export default HauptantragContainer; 

