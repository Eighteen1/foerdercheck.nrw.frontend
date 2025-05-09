import React, { useState, useEffect } from 'react';
import { Container, Button, Modal } from 'react-bootstrap';
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
// Import other steps as they are created

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

const HauptantragContainer: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ [key: number]: string[] }>({});
  const [showValidation, setShowValidation] = useState(false);
  const [hasValidatedOnce, setHasValidatedOnce] = useState(false);
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

  // Load saved data from Supabase
  useEffect(() => {
    const loadSavedData = async () => {
      if (!user?.id) return;

      try {
        const { data: userData, error: userError } = await supabase
          .from('user_data')
          .select('*')
          .eq('id', user.id)
          .single();

        if (userError) throw userError;
        if (!userData) return;

        const { data: objectData, error: objectError } = await supabase
          .from('object_data')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (objectError) throw objectError;

        const { data: costData, error: costError } = await supabase
          .from('cost_structure')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (costError && costError.code !== 'PGRST116') throw costError; // PGRST116 is "no rows returned"

        const { data: financeData, error: financeError } = await supabase
          .from('finance_structure')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (financeError && financeError.code !== 'PGRST116') throw financeError;

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
              hasRepresentative: userData.hasauthorizedperson,
              isCompany: userData.hasauthorizedperson ? userData.iscompany : null,
              companyName: userData.bevollmaechtigte?.companyName || '',
              postboxPostcode: userData.bevollmaechtigte?.postboxPostcode || '',
              postboxCity: userData.bevollmaechtigte?.postboxCity || '',
              title: userData.bevollmaechtigte?.title || '',
              firstName: userData.bevollmaechtigte?.firstName || '',
              lastName: userData.bevollmaechtigte?.lastName || '',
              street: userData.bevollmaechtigte?.street || '',
              houseNumber: userData.bevollmaechtigte?.houseNumber || '',
              postalCode: userData.bevollmaechtigte?.postalCode || '',
              city: userData.bevollmaechtigte?.city || '',
              phone: userData.bevollmaechtigte?.phone || '',
              email: userData.bevollmaechtigte?.email || ''
            },
            persons: [
              // Main applicant
              {
                title: userData.title || '',
                firstName: userData.firstname || '',
                lastName: userData.lastname || '',
                nationality: userData.nationality || '',
                birthDate: userData.birthDate || '',
                street: userData.person_street || '',
                houseNumber: userData.person_housenumber || '',
                postalCode: userData.person_postalcode || '',
                city: userData.person_city || '',
                phone: userData.phone || '',
                email: userData.email || '',
                employment: {
                  type: userData.employment || '',
                  details: userData.branche || ''
                }
              },
              // Additional applicants
              ...(userData.weitere_antragstellende_personen || []).map((person: AdditionalPerson) => ({
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
            adultCount: userData.adult_count || '',
            childCount: userData.child_count || '',
            isDisabled: userData.is_disabled,
            isMarried: userData.is_married,
            hasAdditionalAssets: userData.hasadditionalassets,
            hasDoubleSubsidy: userData.hasdoublesubsidy,
            childrenAges: userData.childrenages || '',
            disabledAdultsCount: userData.disabledadultscount || '',
            disabledChildrenCount: userData.disabledchildrencount || '',
            additionalAssetsDetails: userData.additionalassetsdetails || '',
            hasRepaidSubsidy: userData.hasrepaidsubsidy,
            subsidyAmount: formatCurrencyForDisplay(userData.subsidyamount),
            subsidyFileNumber: userData.subsidyfilenumber || '',
            subsidyAuthority: userData.subsidyauthority || '',
            hasSupplementaryLoan: userData.hassupplementaryloan
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
                hasGewerbeflaeche: objectData?.has_gewerbeflaeche,
                flaeche: objectData?.has_gewerbeflaeche ? objectData?.gewerbeflaeche || '' : ''
              },
              ertraege: {
                hasErtraege: objectData?.has_ertraege,
                vermieteteWohnung: objectData?.has_ertraege ? formatCurrencyForDisplay(objectData?.vermietete_wohnung) || '' : '',
                vermieteteGarage: objectData?.has_ertraege ? formatCurrencyForDisplay(objectData?.vermietete_garage) || '' : ''
              },
              barrierefrei: objectData?.barrierefrei,
              begEffizienzhaus40Standard: objectData?.beg_effizienzhaus_40_standard,
              hasLocationCostLoan: objectData?.haslocationcostloan,
              hasWoodConstructionLoan: objectData?.haswoodconstructionloan
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
            eigentumsverhaeltnis: objectData?.eigentumsverhaeltnis,
            kaufvertrag: {
              wurdeAbgeschlossen: objectData?.kaufvertrag_wurde_abgeschlossen,
              abschlussDatum: objectData?.kaufvertrag_abschluss_datum || ''
            },
            erbbaurecht: objectData?.erbbaurecht,
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
              vorhanden: objectData?.baulasten_vorhanden,
              art: objectData?.baulasten_art || ''
            },
            altlasten: {
              vorhanden: objectData?.altlasten_vorhanden,
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
      }
    };

    loadSavedData();
  }, [user?.id]); // Only run when user ID changes

  const totalSteps = 6;

  const handleNext = () => {
    if (currentStep === totalSteps) {
      // If we're on the last step, validate the form
      validateForm();
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
    } catch (error) {
      console.error('Error saving form data:', error);
      // Fallback to local storage if Supabase save fails
      localStorage.setItem('hauptantragFormData', JSON.stringify(formData));
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
    // Get all potential validation errors without showing them
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
    if (formData.step2.isMarried === null) {
      errors[2].push('Bitte geben Sie an, ob Sie verheiratet sind oder in einer eingetragenen Lebenspartnerschaft leben');
    }
    if (formData.step2.hasAdditionalAssets === null) {
      errors[2].push('Bitte geben Sie an, ob weiteres Vermögen vorhanden ist');
    }
    if (formData.step2.hasAdditionalAssets === true && !formData.step2.additionalAssetsDetails) {
      errors[2].push('Bitte beschreiben Sie das weitere Vermögen');
    }
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

    // Validate Step 3
    errors[3] = [];
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
    if (!formData.step3.foerderVariante) {
      errors[3].push('Bitte wählen Sie eine Förderungsvariante aus');
    }
    if (!formData.step3.objektDetailsAllgemein.wohnflaecheSelbstgenutzt) errors[3].push('Bitte geben Sie die selbstgenutzte Wohnfläche ein');
    if (!formData.step3.objektDetailsAllgemein.gesamtWohnflaeche) errors[3].push('Bitte geben Sie die Gesamtwohnfläche ein');
    if (!formData.step3.objektDetailsAllgemein.anzahlZimmer) errors[3].push('Bitte geben Sie die Anzahl der Zimmer ein');
    if (!formData.step3.objektDetailsAllgemein.anzahlGaragen) errors[3].push('Bitte geben Sie die Anzahl der Garagen ein');
    if (formData.step3.objektDetailsAllgemein.gewerbeflaeche.hasGewerbeflaeche === null) {
      errors[3].push('Bitte geben Sie an, ob eine Gewerbefläche vorhanden ist');
    }
    if (formData.step3.objektDetailsAllgemein.gewerbeflaeche.hasGewerbeflaeche === true && !formData.step3.objektDetailsAllgemein.gewerbeflaeche.flaeche) {
      errors[3].push('Bitte geben Sie die Größe der Gewerbefläche ein');
    }
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

    // Validate Step 4
    errors[4] = [];
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
    if (formData.step4.eigentumsverhaeltnis === true) {
      if (formData.step4.erbbaurecht === null) {
        errors[4].push('Bitte geben Sie an, ob Erbbaurecht vorhanden ist');
      }
      if (formData.step4.erbbaurecht === true && !formData.step4.restlaufzeitErbbaurecht) {
        errors[4].push('Bitte geben Sie die Restlaufzeit des Erbbaurechts ein');
      }
    }

    // Validate Step 5
    errors[5] = [];
    if (formData.step3.foerderVariante === 'neubau') {
      if (!formData.step5.baugrundstuck.kaufpreis) errors[5].push('Bitte geben Sie den Kaufpreis des Baugrundstücks ein (0,00€ wenn nicht vorhanden)');
      if (!formData.step5.baugrundstuck.wert) errors[5].push('Bitte geben Sie den Wert des Baugrundstücks ein (0,00€ wenn nicht vorhanden)');
      if (!formData.step5.baugrundstuck.erschliessungskosten) errors[5].push('Bitte geben Sie die Erschließungskosten ein (0,00€ wenn nicht vorhanden)');
      if (!formData.step5.baugrundstuck.standortbedingteMehrkosten) errors[5].push('Bitte geben Sie die standortbedingten Mehrkosten ein (0,00€ wenn nicht vorhanden)');
    }
    if (formData.step3.foerderVariante?.includes('bestandserwerb') || formData.step3.foerderVariante?.includes('ersterwerb')) {
      if (!formData.step5.kaufpreis.kaufpreis) errors[5].push('Bitte geben Sie den Kaufpreis ein');
    }
    if (formData.step3.foerderVariante === 'neubau' || formData.step3.foerderVariante === 'nutzungsaenderung') {
      if (formData.step3.foerderVariante === 'neubau' && !formData.step5.baukosten.kostenGebaeude) {
        errors[5].push('Bitte geben Sie die Kosten des Gebäudes ein');
      }
      if (!formData.step5.baukosten.besondereBauausfuhrung) errors[5].push('Bitte geben Sie die besondere Bauausführung ein (0,00€ wenn nicht vorhanden)');
      if (!formData.step5.baukosten.wertVorhandenerGebaude) errors[5].push('Bitte geben Sie den Wert vorhandener Gebäudeteile ein (0,00€ wenn nicht vorhanden)');
      if (!formData.step5.baukosten.kostenAussenanlagen) errors[5].push('Bitte geben Sie die Kosten der Außenanlagen ein (0,00€ wenn nicht vorhanden)');
      if (!formData.step5.baukosten.kostenArchitekt) errors[5].push('Bitte geben Sie die Kosten der Architekten- und Ingenieurleistungen ein (0,00€ wenn nicht vorhanden)');
    }
    if (!formData.step5.nebenkosten.erwerbsnebenkosten) errors[5].push('Bitte geben Sie die Erwerbsnebenkosten ein (0,00€ wenn nicht vorhanden)');
    if (!formData.step5.nebenkosten.verwaltungsleistungen) errors[5].push('Bitte geben Sie die Kosten der Verwaltungsleistungen ein (0,00€ wenn nicht vorhanden)');
    if (!formData.step5.nebenkosten.beschaffungDauerfinanzierung) errors[5].push('Bitte geben Sie die Kosten der Beschaffung der Dauerfinanzierungsmittel ein (0,00€ wenn nicht vorhanden)');
    if (!formData.step5.nebenkosten.beschaffungZwischenfinanzierung) errors[5].push('Bitte geben Sie die Kosten der Beschaffung und Verzinsung der Zwischenfinanzierung ein (0,00€ wenn nicht vorhanden)');
    if (!formData.step5.nebenkosten.sonstigeNebenkosten) errors[5].push('Bitte geben Sie die sonstigen Nebenkosten ein (0,00€ wenn nicht vorhanden)');
    if (!formData.step5.nebenkosten.zusatzlicheKosten) errors[5].push('Bitte geben Sie die zusätzlichen Kosten ein (0,00€ wenn nicht vorhanden)');

    // Validate Step 6
    errors[6] = [];
    formData.step6.fremddarlehen.forEach((darlehen, index) => {
      const hasAnyValue = Object.entries(darlehen)
        .filter(([key]) => key !== 'id')
        .some(([_, value]) => value !== '');
      if (hasAnyValue) {
        if (!darlehen.darlehenGeber) errors[6].push(`Fremddarlehen ${index + 1}: Bitte geben Sie den Darlehensgeber ein`);
        if (!darlehen.nennbetrag) errors[6].push(`Fremddarlehen ${index + 1}: Bitte geben Sie den Nennbetrag ein`);
        if (!darlehen.zinssatz) errors[6].push(`Fremddarlehen ${index + 1}: Bitte geben Sie den Zinssatz ein`);
        if (!darlehen.auszahlung) errors[6].push(`Fremddarlehen ${index + 1}: Bitte geben Sie die Auszahlung ein`);
        if (!darlehen.tilgung) errors[6].push(`Fremddarlehen ${index + 1}: Bitte geben Sie die Tilgung ein`);
      }
    });
    if (formData.step2.hasSupplementaryLoan === true) {
      if (!formData.step6.ergaenzungsdarlehen.nennbetrag) {
        errors[6].push('Bitte geben Sie den Nennbetrag des Ergänzungsdarlehens ein');
      }
    } else {
      if (!formData.step6.darlehenNRWBank.grunddarlehen.nennbetrag) {
        errors[6].push('Bitte geben Sie den Nennbetrag des Grunddarlehens ein');
      }
      if (parseInt(formData.step2.childCount) > 0 && !formData.step6.darlehenNRWBank.zusatzdarlehen.familienbonus.nennbetrag) {
        errors[6].push('Bitte geben Sie den Nennbetrag des Familienbonus ein (0,00€ wenn nicht vorhanden)');
      }
      if (formData.step3.objektDetailsAllgemein.hasWoodConstructionLoan === true && !formData.step6.darlehenNRWBank.zusatzdarlehen.bauenMitHolz.nennbetrag) {
        errors[6].push('Bitte geben Sie den Nennbetrag für Bauen mit Holz ein (0,00€ wenn nicht vorhanden)');
      }
      if ((formData.step3.foerderVariante === 'neubau' || formData.step3.foerderVariante?.includes('ersterwerb')) && 
          formData.step3.objektDetailsAllgemein.barrierefrei === true && 
          !formData.step6.darlehenNRWBank.zusatzdarlehen.barrierefreiheit.nennbetrag) {
        errors[6].push('Bitte geben Sie den Nennbetrag für Barrierefreiheit ein (0,00€ wenn nicht vorhanden)');
      }
      if ((formData.step3.foerderVariante === 'neubau' || formData.step3.foerderVariante?.includes('ersterwerb')) && 
          formData.step3.objektDetailsAllgemein.hasLocationCostLoan === true && 
          !formData.step6.darlehenNRWBank.zusatzdarlehen.standortbedingteMehrkosten.nennbetrag) {
        errors[6].push('Bitte geben Sie den Nennbetrag für standortbedingte Mehrkosten ein (0,00€ wenn nicht vorhanden)');
      }
      if ((formData.step3.foerderVariante === 'neubau' || formData.step3.foerderVariante?.includes('ersterwerb')) && 
          formData.step3.objektDetailsAllgemein.begEffizienzhaus40Standard === true && 
          !formData.step6.darlehenNRWBank.zusatzdarlehen.begEffizienzhaus40Standard.nennbetrag) {
        errors[6].push('Bitte geben Sie den Nennbetrag für BEG Effizienzhaus 40 Standard ein (0,00€ wenn nicht vorhanden)');
      }
    }
    if (!formData.step6.eigenleistung.eigeneGeldmittel) errors[6].push('Bitte geben Sie die eigenen Geldmittel ein (0,00€ wenn nicht vorhanden)');
    if (!formData.step6.eigenleistung.zuschüsse) errors[6].push('Bitte geben Sie die Zuschüsse ein (0,00€ wenn nicht vorhanden)');
    if (!formData.step6.eigenleistung.selbsthilfe) errors[6].push('Bitte geben Sie die Selbsthilfe ein (0,00€ wenn nicht vorhanden)');
    if (formData.step3.foerderVariante === 'neubau' && !formData.step6.eigenleistung.wertBaugrundstück) {
      errors[6].push('Bitte geben Sie den Wert des Baugrundstücks ein (0,00€ wenn nicht vorhanden)');
    }
    if ((formData.step3.foerderVariante === 'neubau' || formData.step3.foerderVariante === 'nutzungsaenderung') && !formData.step6.eigenleistung.wertVorhandenerGebaeudeteile) {
      errors[6].push('Bitte geben Sie den Wert vorhandener Gebäudeteile ein (0,00€ wenn nicht vorhanden)');
    }

    // Calculate total potential errors and actual errors
    let totalPotentialErrors = 0;
    let actualErrors = 0;

    Object.entries(errors).forEach(([step, stepErrors]) => {
      console.log(`Step ${step} - Total potential errors: ${stepErrors.length}`);
      totalPotentialErrors += stepErrors.length;
      
      const stepActualErrors = stepErrors.filter(error => {
        return error.includes('ist erforderlich') || error.includes('Bitte geben Sie') || error.includes('Bitte wählen Sie');
      }).length;
      
      actualErrors += stepActualErrors;
      console.log(`Step ${step} - Actual errors: ${stepActualErrors}`);
    });

    console.log('Total potential errors across all steps:', totalPotentialErrors);
    console.log('Total actual errors across all steps:', actualErrors);

    // Calculate hauptantrag progress percentage
    const hauptantragProgress = totalPotentialErrors > 0 
      ? Math.round(((totalPotentialErrors - actualErrors) / totalPotentialErrors) * 100)
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

  return (
    <div className="relative min-h-screen bg-white">
      {/* Header ellipse */}
      <div className="absolute top-[-170px] left-[-25%] w-[70%] h-[300px] bg-[#064497] rounded-[50%]"></div>
      
      {/* Main heading */}
      <div className="absolute top-12 start-9">
        <h1 className="display-6 fw-regular text-[#ffffff] mb-2 font-['Roboto']">
          Hauptantrag
        </h1>
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
    </div>
  );
};

export default HauptantragContainer; 

