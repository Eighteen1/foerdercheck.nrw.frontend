import React, { useState, useEffect, useRef } from 'react';
import Step1_PersonalInfo from './Steps/Step1_PersonalInfo';
import Step2_HouseholdInfo from './Steps/Step2_HouseholdInfo';
import Step3_Objektdetails from './Steps/Step3_Objektdetails';
import Step4_Eigentumsverhaeltnisse from './Steps/Step4_Eigentumsverhaeltnisse';
import Step5_Kostenaufstellung from './Steps/Step5_Kostenaufstellung';
import Step6_Finanzierungsmittel from './Steps/Step6_Finanzierungsmittel';
import { supabase } from '../../lib/supabase';
import { formatCurrencyForDisplay, safeFormatCurrencyForDisplay, safeNumericToString, safeAreaToString } from '../../utils/currencyUtils';
import { Button, Modal, Form } from 'react-bootstrap';
import '../Einkommenserklaerung/EinkommenserklaerungContainer.css';

interface HauptantragReviewContainerProps {
  residentId: string;
}

// Predefined search terms for each step (copied from HauptantragContainer)
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

const stepTitles = [
  'Persönliche Angaben',
  'Haushalt',
  'Objektdetails',
  'Eigentumsverhältnisse',
  'Kostenaufstellung',
  'Finanzierungsmittel',
];

const getStepTitle = (step: number) => stepTitles[step - 1] || '';


const HauptantragReviewContainer: React.FC<HauptantragReviewContainerProps> = ({ residentId }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ step: number; matches: string[] }[]>([]);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollHintTimeout = useRef<any>(null);

  useEffect(() => {
    const loadSavedData = async () => {
      if (!residentId) return;
      setIsLoading(true);
      try {
        // Load user data
        const { data: userData } = await supabase
          .from('user_data')
          .select('*')
          .eq('id', residentId)
          .single();
        // Load object data
        const { data: objectData } = await supabase
          .from('object_data')
          .select('*')
          .eq('user_id', residentId)
          .single();
        // Load cost data
        const { data: costData } = await supabase
          .from('cost_structure')
          .select('*')
          .eq('user_id', residentId)
          .single();
        // Load finance data
        const { data: financeData } = await supabase
          .from('finance_structure')
          .select('*')
          .eq('user_id', residentId)
          .single();
        // Load user financials for steuerid
        const { data: userFinancials } = await supabase
          .from('user_financials')
          .select('*')
          .eq('user_id', residentId)
          .single();
        // Calculate total costs (copied from HauptantragContainer)
        let totalCosts = 0;
        if (costData) {
          const isNeubau = objectData?.foerderVariante.includes('neubau');
          const isBestandserwerbOrErsterwerb = objectData?.foerderVariante?.includes('bestandserwerb') || objectData?.foerderVariante?.includes('ersterwerb');
          const showBaukosten = isNeubau || objectData?.foerderVariante === 'nutzungsaenderung';
          if (isNeubau) {
            if (costData.grundstueck_kaufpreis) totalCosts += costData.grundstueck_kaufpreis;
            if (costData.grundstueck_wert) totalCosts += costData.grundstueck_wert;
            if (costData.erschliessungskosten) totalCosts += costData.erschliessungskosten;
            if (costData.standortbedingte_mehrkosten) totalCosts += costData.standortbedingte_mehrkosten;
          }
          if (isBestandserwerbOrErsterwerb && costData.kaufpreis) {
            totalCosts += costData.kaufpreis;
          }
          if (showBaukosten) {
            if (costData.kosten_gebaeude) totalCosts += costData.kosten_gebaeude;
            if (costData.besondere_bauausfuehrung) totalCosts += costData.besondere_bauausfuehrung;
            if (costData.wert_vorhandener_gebaeude) totalCosts += costData.wert_vorhandener_gebaeude;
            if (costData.kosten_aussenanlagen) totalCosts += costData.kosten_aussenanlagen;
            if (costData.kosten_architekt) totalCosts += costData.kosten_architekt;
          }
          if (costData.erwerbsnebenkosten) totalCosts += costData.erwerbsnebenkosten;
          if (costData.verwaltungsleistungen) totalCosts += costData.verwaltungsleistungen;
          if (costData.beschaffung_dauerfinanzierung) totalCosts += costData.beschaffung_dauerfinanzierung;
          if (costData.beschaffung_zwischenfinanzierung) totalCosts += costData.beschaffung_zwischenfinanzierung;
          if (costData.sonstige_nebenkosten) totalCosts += costData.sonstige_nebenkosten;
          if (costData.zusaetzliche_kosten) totalCosts += costData.zusaetzliche_kosten;
        }
        // Compose formData for all steps (copy/adapt from HauptantragContainer)
        setFormData({
          step1: {
            representative: {
              hasRepresentative: userData?.hasauthorizedperson ?? null,
              isCompany: userData?.hasauthorizedperson ? userData?.iscompany : null,
              ...userData?.bevollmaechtigte
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
                },
                isApplicant: true
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
              hasWoodConstructionLoan: objectData?.haswoodconstructionloan ?? null
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
            fremddarlehen: financeData?.fremddarlehen ? financeData.fremddarlehen.map((darlehen: any) => ({
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
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error loading saved data:', error);
      } finally {
        setIsLoading(false);
      }
    };
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
  }, [formData]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      if (showScrollHint) setShowScrollHint(false);
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [showScrollHint]);

  // Search logic (copied/adapted from HauptantragContainer)
  const handleSearch = (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }
    const results: { step: number; matches: string[] }[] = [];
    const lowerQuery = query.toLowerCase();
    Object.entries(stepSearchTerms).forEach(([step, terms]) => {
      const matches = terms.filter(term => term.toLowerCase().includes(lowerQuery));
      if (matches.length > 0) {
        results.push({ step: parseInt(step), matches });
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

  const renderStep = () => {
    if (!formData) return null;
    // TODO: Pass readOnly={true} to all step components once implemented
    switch (currentStep) {
      case 1:
        return <Step1_PersonalInfo formData={formData.step1} updateFormData={() => {}} showValidation={true} readOnly={true} />;
      case 2:
        return <Step2_HouseholdInfo formData={formData.step2} updateFormData={() => {}} showValidation={true} readOnly={true} />;
      case 3:
        return <Step3_Objektdetails formData={formData.step3} updateFormData={() => {}} showValidation={true} readOnly={true} />;
      case 4:
        return <Step4_Eigentumsverhaeltnisse formData={formData.step4} updateFormData={() => {}} showValidation={true} readOnly={true} />;
      case 5:
        return <Step5_Kostenaufstellung formData={formData.step5} updateFormData={() => {}} foerderVariante={formData.step3.foerderVariante} showValidation={true} readOnly={true} />;
      case 6:
        return <Step6_Finanzierungsmittel formData={formData.step6} updateFormData={() => {}} foerderVariante={formData.step3.foerderVariante} gesamtkosten={formData.step5.gesamtkosten} childCount={formData.step2.childCount} disabledAdultsCount={formData.step2.disabledAdultsCount} barrierefrei={formData.step3.objektDetailsAllgemein.barrierefrei} begEffizienzhaus40Standard={formData.step3.objektDetailsAllgemein.begEffizienzhaus40Standard} hasSupplementaryLoan={formData.step2.hasSupplementaryLoan} hasLocationCostLoan={formData.step3.objektDetailsAllgemein.hasLocationCostLoan} hasWoodConstructionLoan={formData.step3.objektDetailsAllgemein.hasWoodConstructionLoan} showValidation={true} readOnly={true} selbsthilfeData={null} />;
      default:
        return null;
    }
  };

  return (
    <div className="hauptantrag-review-container" style={{ width: '100%', minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
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
                {stepTitles.map((title, idx) => (
                    <button
                        key={idx}
                        className={
                            'applicant-switcher-button' + (currentStep === idx + 1 ? ' active' : '')
                        }
                        onClick={() => setCurrentStep(idx + 1)}
                    >
                        {title}
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
            {isLoading ? <div>Formular lädt...</div> : renderStep()}
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
                    <div key={result.step} className="mb-3 p-3 border rounded">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <h5 className="mb-0">Schritt {result.step}: {getStepTitle(result.step)}</h5>
                        <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigateToStep(result.step)}
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

export default HauptantragReviewContainer; 