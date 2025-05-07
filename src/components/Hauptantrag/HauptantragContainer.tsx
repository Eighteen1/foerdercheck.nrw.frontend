import React, { useState, useEffect } from 'react';
import { Container, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatCurrencyForDisplay, formatCurrencyForDatabase } from '../../utils/currencyUtils';
import Step1_PersonalInfo from './Steps/Step1_PersonalInfo';
import Step2_HouseholdInfo from './Steps/Step2_HouseholdInfo';
import Step3_Objektdetails from './Steps/Step3_Objektdetails';
import Step4_Eigentumsverhaeltnisse from './Steps/Step4_Eigentumsverhaeltnisse';
import Step5_Kostenaufstellung from './Steps/Step5_Kostenaufstellung';
import Step6_Finanzierungsmittel from './Steps/Step6_Finanzierungsmittel';
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
        begEffizienzhaus40Standard: null
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
              begEffizienzhaus40Standard: objectData?.beg_effizienzhaus_40_standard
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
            gesamtkosten: ''
          },
          step6: {
            fremddarlehen: financeData?.fremddarlehen || [{
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
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    } else {
      // On last step, validate the entire form
      validateForm();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSave = async () => {
    if (!user?.id) {
      console.error('No user ID found');
      return;
    }

    try {
      // Get the first person's data (main applicant)
      const mainApplicant = formData.step1.persons[0];
      
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
          barrierefrei: formData.step3.objektDetailsAllgemein.barrierefrei,
          beg_effizienzhaus_40_standard: formData.step3.objektDetailsAllgemein.begEffizienzhaus40Standard,

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
          erbbaurecht: formData.step4.erbbaurecht,
          restlaufzeit_erbbaurecht: formData.step4.erbbaurecht ? (formData.step4.restlaufzeitErbbaurecht || null) : null,
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
          fremddarlehen: formData.step6.fremddarlehen.map(darlehen => ({
            ...darlehen,
            nennbetrag: formatCurrencyForDatabase(darlehen.nennbetrag)
          })),

          // NRW Bank data
          grunddarlehen_nennbetrag: formatCurrencyForDatabase(formData.step6.darlehenNRWBank.grunddarlehen.nennbetrag),
          
          // Zusatzdarlehen data - only save if conditions are met
          zusatzdarlehen_familienbonus_nennbetrag: parseInt(formData.step2.childCount) > 0 ? 
            formatCurrencyForDatabase(formData.step6.darlehenNRWBank.zusatzdarlehen.familienbonus.nennbetrag) : null,
          
          zusatzdarlehen_barrierefreiheit_nennbetrag: formData.step3.objektDetailsAllgemein.barrierefrei ? 
            formatCurrencyForDatabase(formData.step6.darlehenNRWBank.zusatzdarlehen.barrierefreiheit.nennbetrag) : null,
          
          zusatzdarlehen_bauen_mit_holz_nennbetrag: formatCurrencyForDatabase(formData.step6.darlehenNRWBank.zusatzdarlehen.bauenMitHolz.nennbetrag),
          
          zusatzdarlehen_standortbedingte_mehrkosten_nennbetrag: formatCurrencyForDatabase(formData.step6.darlehenNRWBank.zusatzdarlehen.standortbedingteMehrkosten.nennbetrag),
          
          zusatzdarlehen_effizienzhaus40_nennbetrag: formData.step3.objektDetailsAllgemein.begEffizienzhaus40Standard ? 
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
    const errors: string[] = [];

    // Validate Step 1
    formData.step1.persons.forEach((person, index) => {
      if (!person.firstName) errors.push(`Person ${index + 1}: Vorname ist erforderlich`);
      if (!person.lastName) errors.push(`Person ${index + 1}: Name ist erforderlich`);
      if (!person.birthDate) errors.push(`Person ${index + 1}: Geburtsdatum ist erforderlich`);
      if (!person.nationality) errors.push(`Person ${index + 1}: Staatsangehörigkeit ist erforderlich`);
      if (!person.street) errors.push(`Person ${index + 1}: Straße ist erforderlich`);
      if (!person.houseNumber) errors.push(`Person ${index + 1}: Hausnummer ist erforderlich`);
      if (!person.postalCode) errors.push(`Person ${index + 1}: Postleitzahl ist erforderlich`);
      if (!person.city) errors.push(`Person ${index + 1}: Ort ist erforderlich`);
      if (!person.phone) errors.push(`Person ${index + 1}: Telefonnummer ist erforderlich`);
      if (!person.email) errors.push(`Person ${index + 1}: E-Mail ist erforderlich`);
      if (!person.employment.type) errors.push(`Person ${index + 1}: Beschäftigungsart ist erforderlich`);
    });

    // Validate Step 2
    if (!formData.step2.adultCount) errors.push('Anzahl Erwachsene ist erforderlich');
    if (!formData.step2.childCount) errors.push('Anzahl Kinder ist erforderlich');
    if (formData.step2.isDisabled === null) errors.push('Bitte geben Sie an, ob Personen schwerbehindert sind');
    if (formData.step2.isMarried === null) errors.push('Bitte geben Sie an, ob Sie verheiratet sind');
    if (formData.step2.hasAdditionalAssets === null) errors.push('Bitte geben Sie an, ob weiteres Vermögen vorhanden ist');
    if (formData.step2.hasDoubleSubsidy === null) errors.push('Bitte geben Sie an, ob eine Doppelförderung vorliegt');
    
    // Conditional validation for Step 2
    if (formData.step2.isDisabled === true) {
      if (!formData.step2.disabledAdultsCount) errors.push('Anzahl schwerbehinderter Erwachsener ist erforderlich');
      if (!formData.step2.disabledChildrenCount) errors.push('Anzahl schwerbehinderter Kinder ist erforderlich');
    }
    if (formData.step2.hasAdditionalAssets === true && !formData.step2.additionalAssetsDetails) {
      errors.push('Bitte beschreiben Sie das weitere Vermögen');
    }
    if (formData.step2.hasDoubleSubsidy === true) {
      if (formData.step2.hasRepaidSubsidy === null) errors.push('Bitte geben Sie an, ob die Fördermittel zurückgezahlt wurden');
      if (!formData.step2.subsidyAmount) errors.push('Betrag der Fördermittel ist erforderlich');
      if (!formData.step2.subsidyFileNumber) errors.push('Aktenzeichen ist erforderlich');
      if (!formData.step2.subsidyAuthority) errors.push('Bewilligungsbehörde ist erforderlich');
    }
    if (formData.step2.hasSupplementaryLoan === null) errors.push('Bitte geben Sie an, ob ein Ergänzungsdarlehen beantragt wird');

    // Validate Step 3
    if (!formData.step3.foerderVariante) errors.push('Fördervariante ist erforderlich');
    if (formData.step3.objektDetailsAllgemein.barrierefrei === null) errors.push('Bitte geben Sie an, ob das Objekt barrierefrei ist');
    if (formData.step3.objektDetailsAllgemein.begEffizienzhaus40Standard === null) errors.push('Bitte geben Sie an, ob der BEG Effizienzhaus 40 Standard erfüllt wird');
    
    // Conditional validation for Step 3
    if (formData.step3.objektDetailsAllgemein.gewerbeflaeche.hasGewerbeflaeche === null) {
      errors.push('Bitte geben Sie an, ob Gewerbefläche vorhanden ist');
    } else if (formData.step3.objektDetailsAllgemein.gewerbeflaeche.hasGewerbeflaeche === true && !formData.step3.objektDetailsAllgemein.gewerbeflaeche.flaeche) {
      errors.push('Bitte geben Sie die Größe der Gewerbefläche an');
    }
    
    if (formData.step3.objektDetailsAllgemein.ertraege.hasErtraege === null) {
      errors.push('Bitte geben Sie an, ob Einnahmen vorhanden sind');
    } else if (formData.step3.objektDetailsAllgemein.ertraege.hasErtraege === true) {
      if (!formData.step3.objektDetailsAllgemein.ertraege.vermieteteWohnung) errors.push('Bitte geben Sie die vermietete Wohnfläche an');
      if (!formData.step3.objektDetailsAllgemein.ertraege.vermieteteGarage) errors.push('Bitte geben Sie die vermietete Garage an');
    }

    // Validate Step 4
    if (!formData.step4.eigentumsverhaeltnis) errors.push('Eigentumsverhältnis ist erforderlich');
    if (formData.step4.erbbaurecht === null) errors.push('Bitte geben Sie an, ob Erbbaurecht vorhanden ist');
    if (formData.step4.baulasten.vorhanden === null) errors.push('Bitte geben Sie an, ob Baulasten vorhanden sind');
    if (formData.step4.altlasten.vorhanden === null) errors.push('Bitte geben Sie an, ob Altlasten vorhanden sind');
    
    // Conditional validation for Step 4
    if (formData.step4.baulasten.vorhanden === true && !formData.step4.baulasten.art) {
      errors.push('Bitte beschreiben Sie die Art der Baulasten');
    }
    if (formData.step4.altlasten.vorhanden === true && !formData.step4.altlasten.art) {
      errors.push('Bitte beschreiben Sie die Art der Altlasten');
    }

    if (errors.length > 0) {
      alert('Bitte korrigieren Sie die folgenden Fehler:\n\n' + errors.join('\n'));
      return false;
    }

    return true;
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1_PersonalInfo
            formData={formData.step1}
            updateFormData={(data) => updateFormData('step1', data)}
          />
        );
      case 2:
        return (
          <Step2_HouseholdInfo
            formData={formData.step2}
            updateFormData={(data) => updateFormData('step2', data)}
          />
        );
      case 3:
        return (
          <Step3_Objektdetails
            formData={formData.step3}
            updateFormData={(data) => updateFormData('step3', data)}
          />
        );
      case 4:
        return (
          <Step4_Eigentumsverhaeltnisse
            formData={formData.step4}
            updateFormData={(data) => updateFormData('step4', data)}
          />
        );
      case 5:
        return (
          <Step5_Kostenaufstellung
            formData={formData.step5}
            updateFormData={(data) => updateFormData('step5', data)}
            foerderVariante={formData.step3.foerderVariante}
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
    </div>
  );
};

export default HauptantragContainer; 

