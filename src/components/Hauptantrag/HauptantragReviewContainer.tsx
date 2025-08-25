import React, { useState, useEffect, useRef } from 'react';
import Step1_PersonalInfo from './Steps/Step1_PersonalInfo';
import Step2_HouseholdInfo from './Steps/Step2_HouseholdInfo';
import Step3_Objektdetails from './Steps/Step3_Objektdetails';
import Step4_Eigentumsverhaeltnisse from './Steps/Step4_Eigentumsverhaeltnisse';
import Step5_Kostenaufstellung from './Steps/Step5_Kostenaufstellung';
import Step6_Finanzierungsmittel from './Steps/Step6_Finanzierungsmittel';
import { supabase } from '../../lib/supabase';
import { formatCurrencyForDisplay, safeFormatCurrencyForDisplay, safeNumericToString, safeAreaToString, isValidAreaValue } from '../../utils/currencyUtils';
import { getMaxLimitForPostcode } from '../../utils/postcodeValidation';
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
    "Bergsenkungsgebiet",
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
  'Eigentumsverhaeltnisse',
  'Kostenaufstellung',
  'Finanzierungsmittel',
];

const getStepTitle = (step: number) => stepTitles[step - 1] || '';

// Helper functions for validation
// Email validation function - matches HauptantragContainer exactly
const isValidEmail = (email: string): boolean => {
  if (!email) return false;
  
  // Basic email regex pattern
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

const isValidDate = (date: string): boolean => {
  if (!date) return false;
  const inputDate = new Date(date);
  const now = new Date();
  const minDate = new Date(now.getFullYear() - 20, now.getMonth(), now.getDate());
  
  return inputDate <= now && inputDate >= minDate;
};

const getPostcodeValidationData = (postcode: string) => {
  return {
    maxLimit: getMaxLimitForPostcode(postcode)
  };
};

const calculateFinancialSums = (formData: any) => {
  // Helper functions for validation - MUST match HauptantragContainer exactly
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

  // Only include these values if foerderVariante is "neubau" or "nutzungsaenderung"
  if (formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante === 'nutzungsaenderung') {
    eigenleistungSum += getNumericValue(formData.step6.eigenleistung.wertVorhandenerGebaeudeteile);
  }
  if (formData.step3.foerderVariante.includes('neubau')) {
    eigenleistungSum += getNumericValue(formData.step6.eigenleistung.wertBaugrundstück);
  }

  // Calculate total financing (excluding Eigenleistung)
  const fremddarlehenSum = formData.step6.fremddarlehen.reduce((sum: number, darlehen: any) => 
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

const HauptantragReviewContainer: React.FC<HauptantragReviewContainerProps> = ({ residentId }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ step: number; matches: string[] }[]>([]);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<number, string[]>>({});
  const [selbsthilfeData, setSelbsthilfeData] = useState<{willProvideSelfHelp: boolean | null, totals: {totalSelbsthilfe: number}} | null>(null);
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

        // Load selbsthilfe data
        const { data: selbsthilfeObjectData, error: selbsthilfeError } = await supabase
          .from('object_data')
          .select('selbsthilfe_angaben')
          .eq('user_id', residentId)
          .single();

        if (selbsthilfeError && selbsthilfeError.code !== 'PGRST116') {
          console.error('Error loading selbsthilfe data:', selbsthilfeError);
        }

        // Set selbsthilfe data if available
        if (selbsthilfeObjectData?.selbsthilfe_angaben) {
          setSelbsthilfeData(selbsthilfeObjectData.selbsthilfe_angaben);
        }

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

  const validateForm = () => {
    if (!formData) return;
    
    const errors: Record<number, string[]> = {};

    // Validate Step 1
    errors[1] = [];
    formData.step1.persons.forEach((person: any, index: number) => {
      if (!person.title) errors[1].push(`Person ${index + 1}: Titel fehlt`);
      if (!person.firstName) errors[1].push(`Person ${index + 1}: Vorname fehlt`);
      if (!person.lastName) errors[1].push(`Person ${index + 1}: Nachname fehlt`);
      if (!person.birthDate) errors[1].push(`Person ${index + 1}: Geburtsdatum fehlt`);
      else {
        const date = new Date(person.birthDate);
        const now = new Date();
        const minDate = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate());
        const maxDate = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate());
        
        if (date < minDate || date > maxDate) {
          errors[1].push(`Person ${index + 1}: Geburtsdatum liegt außerhalb des gültigen Bereichs (Antragsteller muss mindestens 18 Jahre alt und nicht älter als 120 Jahre sein)`);
        }
      }
      if (!person.nationality) errors[1].push(`Person ${index + 1}: Staatsangehörigkeit fehlt`);
      if (!person.steuerid) errors[1].push(`Person ${index + 1}: Steuer-ID fehlt`);
      if (!person.street) errors[1].push(`Person ${index + 1}: Straße fehlt`);
      if (!person.houseNumber) errors[1].push(`Person ${index + 1}: Hausnummer fehlt`);
      if (!person.postalCode) errors[1].push(`Person ${index + 1}: Postleitzahl fehlt`);
      else {
        if (!/^\d{5}$/.test(person.postalCode)) {
          errors[1].push(`Person ${index + 1}: Postleitzahl muss aus genau 5 Ziffern bestehen`);
        } 
      }
      if (!person.city) errors[1].push(`Person ${index + 1}: Ort fehlt`);
      if (!person.phone) errors[1].push(`Person ${index + 1}: Telefonnummer fehlt`);
      if (!person.email) errors[1].push(`Person ${index + 1}: E-Mail fehlt`);
      else if (!isValidEmail(person.email)) errors[1].push(`Person ${index + 1}: E-Mail-Adresse ist ungültig`);
      if (!person.employment.type) errors[1].push(`Person ${index + 1}: Beschäftigungsart fehlt`);
      if ((person.employment.type == 'sole-trader' || person.employment.type == 'business-owner' || person.employment.type == 'freelancer' || person.employment.type == 'farmer' || person.employment.type == 'private-income') && !person.employment.details) errors[1].push(`Person ${index + 1}: Branche fehlt`);
    });
    if (formData.step1.representative.hasRepresentative === null) errors[1].push('Angabe zum Bevollmächtigten fehlt');
    if (formData.step1.representative.hasRepresentative === true) {
      if (formData.step1.representative.isCompany === null) errors[1].push('Angabe, ob es sich um eine Firma handelt, fehlt');
      // Representative Company Info
      if (formData.step1.representative.isCompany === true) {
        if (!formData.step1.representative.companyName) errors[1].push('Name der bevollmächtigten Firma fehlt');
        if (!formData.step1.representative.postboxCity) errors[1].push('Ort des Postfachs der bevollmächtigten Firma fehlt');
        if (!formData.step1.representative.postboxPostcode) errors[1].push('Postleitzahl des Postfachs der bevollmächtigten Firma fehlt');
      }
      // Representative Personal Info
      if (formData.step1.representative.isCompany === false) {
        if (!formData.step1.representative.title) errors[1].push('Titel des Bevollmächtigten fehlt');
        if (!formData.step1.representative.firstName) errors[1].push('Vorname des Bevollmächtigten fehlt');
        if (!formData.step1.representative.lastName) errors[1].push('Nachname des Bevollmächtigten fehlt');
        if (!formData.step1.representative.street) errors[1].push('Straße des Bevollmächtigten fehlt');
        if (!formData.step1.representative.houseNumber) errors[1].push('Hausnummer des Bevollmächtigten fehlt');
        if (!formData.step1.representative.postalCode) errors[1].push('Postleitzahl des Bevollmächtigten fehlt');
        if (!formData.step1.representative.city) errors[1].push('Stadt des Bevollmächtigten fehlt');
        if (!formData.step1.representative.phone) errors[1].push('Telefonnummer des Bevollmächtigten fehlt');
        if (!formData.step1.representative.email) errors[1].push('E-Mail des Bevollmächtigten fehlt');
        else if (!isValidEmail(formData.step1.representative.email)) errors[1].push('E-Mail-Adresse des Bevollmächtigten ist ungültig');
      }
    }

    // Validate Step 2
    errors[2] = [];
    if (!formData.step2.adultCount) errors[2].push('Anzahl der Erwachsenen fehlt');
    if (parseInt(formData.step2.adultCount) < 0) errors[2].push('Anzahl der Erwachsenen darf nicht negativ sein');
    if (parseInt(formData.step2.adultCount) === 0) errors[2].push('Anzahl der Erwachsenen darf nicht 0 sein');
    if (!formData.step2.childCount) errors[2].push('Anzahl der Kinder fehlt');
    if (parseInt(formData.step2.childCount) < 0) errors[2].push('Anzahl der Kinder darf nicht negativ sein');
    if (parseInt(formData.step2.childCount) > 0 && !formData.step2.childrenAges) errors[2].push('Alter der Kinder fehlt');
    // Check if any child age is greater than 17
    if (formData.step2.childrenAges) {
      const ages = formData.step2.childrenAges.split(',').map((age: string) => parseInt(age.trim()));
      if (ages.some((age: number) => age > 17)) {
        errors[2].push('Volljährige Personen zählen als Erwachsene');
      }
    }

    if (formData.step2.isDisabled == null) errors[2].push('Angabe zu behinderten Menschen im Haushalt fehlt');
    if (formData.step2.isDisabled === true) {
      const totaladults = parseInt(formData.step2.adultCount || '0');
      const totalkids = parseInt(formData.step2.childCount || '0');
      const disabledadults = parseInt(formData.step2.disabledAdultsCount || '0');
      const disabledkids = parseInt(formData.step2.disabledChildrenCount || '0');
      const totalDisabled = disabledadults + disabledkids;
      const totalHousehold = totaladults + totalkids;
      if (totalDisabled <= 0) {
        errors[2].push('Anzahl der behinderten Menschen im Haushalt fehlt');
      }
      if (totalDisabled > totalHousehold) {
        errors[2].push('Anzahl der behinderten Menschen kann nicht größer sein als die Gesamtanzahl der Haushaltsmitglieder');
      }else{
        if (disabledadults > totaladults) {
          errors[2].push('Anzahl der behinderten Erwachsenen kann nicht größer sein als die Anzahl der Erwachsenen');
        }
        if (disabledkids > totalkids) {
          errors[2].push('Anzahl der behinderten Kinder kann nicht größer sein als die Anzahl der Kinder');
        }
      }
    }
    // Check marriage status
    if (formData.step2.isMarried === null) {
      errors[2].push('Angabe zum Familienstand fehlt');
    }
    // Check additional assets
    if (formData.step2.hasAdditionalAssets === null) {
      errors[2].push('Angabe zu weiterem Vermögen fehlt');
    }
    if (formData.step2.hasAdditionalAssets === true && !formData.step2.additionalAssetsDetails) {
      errors[2].push('Beschreibung des weiteren Vermögens fehlt');
    }
    // Check double subsidy
    if (formData.step2.hasDoubleSubsidy === null) {
      errors[2].push('Angabe zu bereits gefördertem Eigentum fehlt');
    }
    if (formData.step2.hasDoubleSubsidy === true) {
      if (formData.step2.hasRepaidSubsidy === null) {
        errors[2].push('Angabe zur Rückzahlung der Fördermittel fehlt');
      }
      if (!formData.step2.subsidyAmount) {
        errors[2].push('Betrag der Fördermittel fehlt');
      } else {
        const amount = parseFloat(formData.step2.subsidyAmount.replace(/[^\d.,]/g, '').replace(',', '.'));
        if (isNaN(amount) || amount <= 0) {
          errors[2].push('Betrag der Fördermittel muss größer als 0,00 € sein');
        }
      }
      if (!formData.step2.subsidyFileNumber) {
        errors[2].push('Aktenzeichen der Fördermittel fehlt');
      }
      if (!formData.step2.subsidyAuthority) {
        errors[2].push('Bewilligungsbehörde der Fördermittel fehlt');
      }
    }

    // Check supplementary loan
    if (formData.step2.hasSupplementaryLoan === null) {
      errors[2].push('Angabe zum Ergänzungsdarlehen der NRW.BANK fehlt');
    }

    // Validate Step 3
    errors[3] = [];
    
    // Address validation
    if (!formData.step3.address.street) errors[3].push('Straße fehlt');
    if (!formData.step3.address.houseNumber) errors[3].push('Hausnummer fehlt');
    if (!formData.step3.address.postalCode) errors[3].push('Postleitzahl fehlt');
    else {
      const postalCode = formData.step3.address.postalCode;
      const validStartNumbers = ['32', '33', '34', '37', '40', '41', '42', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '57', '58', '59'];
      
      if (!/^\d{5}$/.test(postalCode)) {
        errors[3].push('Postleitzahl muss aus genau 5 Ziffern bestehen');
      } else if (!validStartNumbers.includes(postalCode.substring(0, 2))) {
        errors[3].push('Postleitzahl muss sich in Nordrhein-Westfalen befinden');
      }
    }
    if (!formData.step3.address.city) errors[3].push('Stadt fehlt');

    // FoerderVariante validation
    if (!formData.step3.foerderVariante) {
      errors[3].push('Förderungsvariante fehlt');
    }

     // Objektart validation
     if(formData.step3.foerderVariante){
      if (!formData.step3.foerderVariante?.includes('wohnung')) {
        if (!formData.step3.objektart) {
          errors[3].push('Objektart fehlt');
        }
      }
    }

    // ObjektDetailsAllgemein validation
    if (!isValidAreaValue(formData.step3.objektDetailsAllgemein.wohnflaecheSelbstgenutzt)) errors[3].push('Selbstgenutzte Wohnfläche fehlt');
    if (!isValidAreaValue(formData.step3.objektDetailsAllgemein.gesamtWohnflaeche)) errors[3].push('Wohnfläche der zweiten Wohneinheit fehlt (0, wenn keine zweite Wohneinheit vorhanden)');
    if (!formData.step3.objektDetailsAllgemein.anzahlZimmer) errors[3].push('Anzahl der Zimmer fehlt');
    if (!formData.step3.objektDetailsAllgemein.anzahlGaragen) errors[3].push('Anzahl der Garagen fehlt');

    // Gewerbefläche validation
    if (formData.step3.objektDetailsAllgemein.gewerbeflaeche.hasGewerbeflaeche === null) {
      errors[3].push('Angabe zur Gewerbefläche fehlt');
    }
    if (formData.step3.objektDetailsAllgemein.gewerbeflaeche.hasGewerbeflaeche === true && !isValidAreaValue(formData.step3.objektDetailsAllgemein.gewerbeflaeche.flaeche)) {
      errors[3].push('Größe der Gewerbefläche fehlt');
    }

    // Erträge validation
    if (formData.step3.objektDetailsAllgemein.ertraege.hasErtraege === null) {
      errors[3].push('Angabe zu Erträgen fehlt');
    }
    if (formData.step3.objektDetailsAllgemein.ertraege.hasErtraege === true) {
      if (!formData.step3.objektDetailsAllgemein.ertraege.vermieteteWohnung && !formData.step3.objektDetailsAllgemein.ertraege.vermieteteGarage) {
        errors[3].push('Mindestens ein Ertragswert fehlt (vermietete Wohnung oder Garage)');
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
            errors[3].push('Summe der Ertragswerte muss größer als 0,00 € sein');
          }
        }
      }
    }
    if (formData.step3.objektDetailsAllgemein.hasWoodConstructionLoan === null) {
      errors[3].push('Angabe zum Zusatzdarlehen für Bauen mit Holz fehlt');
    }

    // Bergsenkungsgebiet validation - only for neubau, ersterwerb, or nutzungsänderung
    if (formData.step3.foerderVariante?.includes('neubau') || formData.step3.foerderVariante?.includes('ersterwerb') || formData.step3.foerderVariante === 'nutzungsaenderung') {
      if (formData.step3.objektDetailsAllgemein.bergsenkungsGebiet === null) {
        errors[3].push('Angabe zum Bergsenkungsgebiet fehlt');
      }
    }

    // Eigentumswohnung validation
    if (formData.step3.foerderVariante?.includes('wohnung')) {
      if (!formData.step3.objektDetailsEigentumswohnung.anzahlVollgeschosse) errors[3].push('Anzahl der Vollgeschosse fehlt');
      if (!formData.step3.objektDetailsEigentumswohnung.wohnungenAmHauseingang) errors[3].push('Anzahl der Wohnungen am Hauseingang fehlt');
      if (!formData.step3.objektDetailsEigentumswohnung.lageImGebaeude) errors[3].push('Lage im Gebäude fehlt');
      if (!formData.step3.objektDetailsEigentumswohnung.lageImGeschoss) errors[3].push('Lage im Geschoss fehlt');
    }

    // Neubau/Ersterwerb validation
    if (formData.step3.foerderVariante?.includes('neubau') || formData.step3.foerderVariante?.includes('ersterwerb')) {
        // Barrierefrei and BEG validation
      if (formData.step3.objektDetailsAllgemein.barrierefrei === null) {
        errors[3].push('Angabe zur Barrierefreiheit fehlt');
      }
      if (formData.step3.objektDetailsAllgemein.begEffizienzhaus40Standard === null) {
        errors[3].push('Angabe zum BEG Effizienzhaus 40 Standard fehlt');
      }
      if (formData.step3.objektDetailsAllgemein.hasLocationCostLoan === null) {
        errors[3].push('Angabe zum Zusatzdarlehen für standortbedingte Mehrkosten fehlt');
      }
      if (formData.step3.objektDetailsNeubauErsterwerb.baugenehmigungErforderlich === null) {
        errors[3].push('Angabe zur Baugenehmigung fehlt');
      }

      if (formData.step3.objektDetailsNeubauErsterwerb.baugenehmigungErforderlich === true) {
        if (formData.step3.objektDetailsNeubauErsterwerb.baugenehmigung.wurdeErteilt === null) {
          errors[3].push('Angabe zur Erteilung der Baugenehmigung fehlt');
        }

        if (formData.step3.objektDetailsNeubauErsterwerb.baugenehmigung.wurdeErteilt === true) {
          if (!formData.step3.objektDetailsNeubauErsterwerb.baugenehmigung.erteilungsDatum) {
            errors[3].push('Erteilungsdatum der Baugenehmigung fehlt');
          } else if (!isValidDate(formData.step3.objektDetailsNeubauErsterwerb.baugenehmigung.erteilungsDatum)) {
            errors[3].push('Erteilungsdatum darf weder in der Zukunft noch mehr als 20 Jahre in der Vergangenheit liegen');
          }
          if (!formData.step3.objektDetailsNeubauErsterwerb.baugenehmigung.aktenzeichen) errors[3].push('Aktenzeichen der Baugenehmigung fehlt');
          if (!formData.step3.objektDetailsNeubauErsterwerb.baugenehmigung.erteilungsBehoerde) errors[3].push('Erteilende Behörde der Baugenehmigung fehlt');
        }
      }

      if (formData.step3.objektDetailsNeubauErsterwerb.bauanzeige.wurdeEingereicht === null) {
        errors[3].push('Angabe zur Bauanzeige fehlt');
      }

      if (formData.step3.objektDetailsNeubauErsterwerb.bauanzeige.wurdeEingereicht === true) {
        if (!formData.step3.objektDetailsNeubauErsterwerb.bauanzeige.einreichungsDatum) {
          errors[3].push('Einreichungsdatum der Bauanzeige fehlt');
        } else if (!isValidDate(formData.step3.objektDetailsNeubauErsterwerb.bauanzeige.einreichungsDatum)) {
          errors[3].push('Einreichungsdatum darf weder in der Zukunft noch mehr als 20 Jahre in der Vergangenheit liegen');
        }
      }

      if (formData.step3.objektDetailsNeubauErsterwerb.bauarbeiten.wurdeBegonnen === null) {
        errors[3].push('Angabe zum Baubeginn fehlt');
      }

      if (formData.step3.objektDetailsNeubauErsterwerb.bauarbeiten.wurdeBegonnen === true) {
        if (!formData.step3.objektDetailsNeubauErsterwerb.bauarbeiten.beginnDatum) {
          errors[3].push('Datum des Baubeginns fehlt');
        } else if (!isValidDate(formData.step3.objektDetailsNeubauErsterwerb.bauarbeiten.beginnDatum)) {
          errors[3].push('Datum des Baubeginns darf weder in der Zukunft noch mehr als 20 Jahre in der Vergangenheit liegen');
        }
      }
    }

    // Bestandserwerb validation
    if (formData.step3.foerderVariante?.includes('bestandserwerb') && !formData.step3.objektDetailsBestandserwerb.baujahr) {
      errors[3].push('Baujahr fehlt');
    }

    // Validate Step 4
    errors[4] = [];
    
    // Eigentumsverhältnisse validation
    if (formData.step4.eigentumsverhaeltnis === null) {
      errors[4].push('Angabe zu den Eigentumsverhältnissen fehlt');
    }

    if (formData.step4.eigentumsverhaeltnis === false) {
      if (formData.step4.kaufvertrag.wurdeAbgeschlossen === null) {
        errors[4].push('Angabe zum Kaufvertrag fehlt');
      }
      if (formData.step4.kaufvertrag.wurdeAbgeschlossen === true && !formData.step4.kaufvertrag.abschlussDatum) {
        errors[4].push('Abschlussdatum des Kaufvertrags fehlt');
      } else if (formData.step4.kaufvertrag.wurdeAbgeschlossen === true && formData.step4.kaufvertrag.abschlussDatum && !isValidDate(formData.step4.kaufvertrag.abschlussDatum)) {
        errors[4].push('Abschlussdatum des Kaufvertrags darf weder in der Zukunft noch mehr als 20 Jahre in der Vergangenheit liegen');
      }
    }

    // Erbbaurecht validation - only if eigentumsverhaeltnis is true
    if (formData.step4.eigentumsverhaeltnis === true) {
      if (formData.step4.erbbaurecht === null) {
        errors[4].push('Angabe zum Erbbaurecht fehlt');
      }
      if (formData.step4.erbbaurecht === true && !formData.step4.restlaufzeitErbbaurecht) {
        errors[4].push('Restlaufzeit des Erbbaurechts fehlt');
      }
    }

    // Grundbuch validation - only if eigentumsverhaeltnis is true
    if (formData.step4.eigentumsverhaeltnis === true) {
      if (!formData.step4.grundbuch.type) {
        errors[4].push('Grundbuchtyp fehlt');
      }
      if (!formData.step4.grundbuch.amtsgericht) {
        errors[4].push('Amtsgericht fehlt');
      }
      if (!formData.step4.grundbuch.ortGrundbuch) {
        errors[4].push('Ort des Grundbuchs fehlt');
      }
      if (!formData.step4.grundbuch.gemarkung) {
        errors[4].push('Gemarkung fehlt');
      }
      if (!formData.step4.grundbuch.blatt) {
        errors[4].push('Blatt fehlt');
      }
      if (!formData.step4.grundbuch.flur) {
        errors[4].push('Flur fehlt');
      }
      if (!formData.step4.grundbuch.flurstueck) {
        errors[4].push('Flurstück fehlt');
      }
      if (!formData.step4.grundbuch.grundstuecksgroesse || !isValidAreaValue(formData.step4.grundbuch.grundstuecksgroesse)) {
        errors[4].push('Grundstücksgröße fehlt');
      }
    }

    // Baulasten validation
    if (formData.step4.baulasten.vorhanden === null) {
      errors[4].push('Angabe zu Baulasten fehlt');
    }
    if (formData.step4.baulasten.vorhanden === true && !formData.step4.baulasten.art) {
      errors[4].push('Art der Baulasten fehlt');
    }

    // Altlasten validation
    if (formData.step4.altlasten.vorhanden === null) {
      errors[4].push('Angabe zu Altlasten fehlt');
    }
    if (formData.step4.altlasten.vorhanden === true && !formData.step4.altlasten.art) {
      errors[4].push('Art der Altlasten fehlt');
    }

    // Validate Step 5
    errors[5] = [];
    
    // Baugrundstück validation for Neubau
    if (formData.step3.foerderVariante.includes('neubau')) {
      if (!formData.step5.baugrundstuck.kaufpreis) errors[5].push('Kaufpreis des Baugrundstücks fehlt (0,00€ wenn nicht vorhanden)');
      if (!formData.step5.baugrundstuck.wert) errors[5].push('Wert des Baugrundstücks fehlt (0,00€ wenn nicht vorhanden)');
      if (!formData.step5.baugrundstuck.erschliessungskosten) errors[5].push('Erschließungskosten fehlen (0,00€ wenn nicht vorhanden)');
    }

    // Standortbedingte Mehrkosten validation for Neubau or Ersterwerb with hasLocationCostLoan
    if ((formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante.includes('ersterwerb')) && formData.step3.objektDetailsAllgemein.hasLocationCostLoan) {
      if (!formData.step5.baugrundstuck.standortbedingteMehrkosten) errors[5].push('Förderfähige standortbedingte Mehrkosten fehlen (0,00€ wenn nicht vorhanden)');
    }

    // Kaufpreis validation for Bestandserwerb or Ersterwerb
    if (formData.step3.foerderVariante?.includes('bestandserwerb') || formData.step3.foerderVariante?.includes('ersterwerb')) {
      if (!formData.step5.kaufpreis.kaufpreis) errors[5].push('Kaufpreis fehlt');
    }

    // Baukosten validation for Neubau or Nutzungsänderung
    if (formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante === 'nutzungsaenderung') {
      if (formData.step3.foerderVariante.includes('neubau') && !formData.step5.baukosten.kostenGebaeude) {
        errors[5].push('Kosten des Gebäudes fehlen');
      }
      if (!formData.step5.baukosten.besondereBauausfuhrung) errors[5].push('Besondere Bauausführung fehlt (0,00€ wenn nicht vorhanden)');
      if (!formData.step5.baukosten.wertVorhandenerGebaude) errors[5].push('Wert vorhandener Gebäudeteile fehlt (0,00€ wenn nicht vorhanden)');
      if (!formData.step5.baukosten.kostenAussenanlagen) errors[5].push('Kosten der Außenanlagen fehlen (0,00€ wenn nicht vorhanden)');
      if (!formData.step5.baukosten.kostenArchitekt) errors[5].push('Kosten der Architekten- und Ingenieurleistungen fehlen (0,00€ wenn nicht vorhanden)');
    }

    // Nebenkosten validation (always required)
    if (!formData.step5.nebenkosten.erwerbsnebenkosten) errors[5].push('Erwerbsnebenkosten fehlen (0,00€ wenn nicht vorhanden)');
    if (!formData.step5.nebenkosten.verwaltungsleistungen) errors[5].push('Kosten der Verwaltungsleistungen fehlen (0,00€ wenn nicht vorhanden)');
    if (!formData.step5.nebenkosten.beschaffungDauerfinanzierung) errors[5].push('Kosten der Beschaffung der Dauerfinanzierungsmittel fehlen (0,00€ wenn nicht vorhanden)');
    if (!formData.step5.nebenkosten.beschaffungZwischenfinanzierung) errors[5].push('Kosten der Beschaffung und Verzinsung der Zwischenfinanzierung fehlen (0,00€ wenn nicht vorhanden)');
    if (!formData.step5.nebenkosten.sonstigeNebenkosten) errors[5].push('Sonstige Nebenkosten fehlen (0,00€ wenn nicht vorhanden)');
    if (!formData.step5.nebenkosten.zusaetzlicheKosten) errors[5].push('Zusätzliche Kosten fehlen (0,00€ wenn nicht vorhanden)');

    // Validate Step 6
    errors[6] = [];

    // Validate Fremddarlehen fields
    formData.step6.fremddarlehen.forEach((darlehen: any, index: number) => {
      // Check if any field has a value (excluding the id field)
      const hasAnyValue = Object.entries(darlehen)
        .filter(([key]) => key !== 'id') // Exclude the id field from the check
        .some(([_, value]) => value !== '');
      
      if (hasAnyValue) {
        if (!darlehen.darlehenGeber) errors[6].push(`Fremddarlehen ${index + 1}: Darlehensgeber fehlt`);
        if (!darlehen.nennbetrag) errors[6].push(`Fremddarlehen ${index + 1}: Nennbetrag fehlt`);
        if (!darlehen.zinssatz) errors[6].push(`Fremddarlehen ${index + 1}: Zinssatz fehlt`);
        if (!darlehen.auszahlung) errors[6].push(`Fremddarlehen ${index + 1}: Auszahlung fehlt`);
        if (!darlehen.tilgung) errors[6].push(`Fremddarlehen ${index + 1}: Tilgung fehlt`);
      }
    });

    // Validate Ergänzungsdarlehen if hasSupplementaryLoan is true
    if (formData.step2.hasSupplementaryLoan === true) {
      if (!formData.step6.ergaenzungsdarlehen.nennbetrag) {
        errors[6].push('Nennbetrag des Ergänzungsdarlehens fehlt');
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
        errors[6].push('Nennbetrag des Grunddarlehens fehlt');
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
        errors[6].push('Nennbetrag des Familienbonus fehlt (0,00€ wenn nicht vorhanden)');
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
        errors[6].push('Nennbetrag für Bauen mit Holz fehlt (0,00€ wenn nicht vorhanden)');
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
        errors[6].push('Nennbetrag für Barrierefreiheit fehlt (0,00€ wenn nicht vorhanden)');
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
        errors[6].push('Nennbetrag für standortbedingte Mehrkosten fehlt (0,00€ wenn nicht vorhanden)');
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
        errors[6].push('Nennbetrag für BEG Effizienzhaus 40 Standard fehlt (0,00€ wenn nicht vorhanden)');
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
    if (!formData.step6.eigenleistung.eigeneGeldmittel) errors[6].push('Eigene Geldmittel fehlen (0,00€ wenn nicht vorhanden)');
    if (!formData.step6.eigenleistung.zuschüsse) errors[6].push('Zuschüsse fehlen (0,00€ wenn nicht vorhanden)');
    if (!formData.step6.eigenleistung.selbsthilfe) errors[6].push('Selbsthilfe fehlt (0,00€ wenn nicht vorhanden)');

    // Validate wertBaugrundstück if foerderVariante is "neubau"
    if (formData.step3.foerderVariante.includes('neubau') && !formData.step6.eigenleistung.wertBaugrundstück) {
      errors[6].push('Wert des Baugrundstücks fehlt (0,00€ wenn nicht vorhanden)');
    }

    // Validate wertVorhandenerGebaeudeteile if foerderVariante is "neubau" or "nutzungsaenderung"
    if ((formData.step3.foerderVariante.includes('neubau') || formData.step3.foerderVariante === 'nutzungsaenderung') && !formData.step6.eigenleistung.wertVorhandenerGebaeudeteile) {
      errors[6].push('Wert vorhandener Gebäudeteile fehlt (0,00€ wenn nicht vorhanden)');
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
    const { eigenleistungSum, gesamtbetraege, getNumericValue, formatCurrency } = calculateFinancialSums(formData);

    // Validate Eigenleistung (7.5% of Gesamtkosten)
    const gesamtkostenValue = getNumericValue(formData.step5.gesamtkosten);
    const minEigenleistung = Math.round(gesamtkostenValue * 0.075);
    if (eigenleistungSum < minEigenleistung) {
      errors[6].push(`Eigenleistung muss mind. 7,5% der Gesamtkosten (${formatCurrency(minEigenleistung)}) entsprechen.`);
    }

    // Validate total equals Gesamtkosten (now including Eigenleistung for validation)
    const totalWithEigenleistung = gesamtbetraege + eigenleistungSum;
    const difference = totalWithEigenleistung - gesamtkostenValue;
    if (Math.abs(difference) > 1) {
      errors[6].push(`Summe aus Eigenleistung und Gesamtfinanzierung (${formatCurrency(totalWithEigenleistung)}) muss den Gesamtkosten (${formatCurrency(gesamtkostenValue)}) entsprechen. Differenz: ${formatCurrency(difference)}`);
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
        return <Step5_Kostenaufstellung formData={formData.step5} updateFormData={() => {}} foerderVariante={formData.step3.foerderVariante} showValidation={true} readOnly={true} hasLocationCostLoan={formData.step3.objektDetailsAllgemein.hasLocationCostLoan} />;
      case 6:
        return <Step6_Finanzierungsmittel formData={formData.step6} updateFormData={() => {}} foerderVariante={formData.step3.foerderVariante} gesamtkosten={formData.step5.gesamtkosten} childCount={formData.step2.childCount} disabledAdultsCount={formData.step2.disabledAdultsCount} barrierefrei={formData.step3.objektDetailsAllgemein.barrierefrei} begEffizienzhaus40Standard={formData.step3.objektDetailsAllgemein.begEffizienzhaus40Standard} hasSupplementaryLoan={formData.step2.hasSupplementaryLoan} hasLocationCostLoan={formData.step3.objektDetailsAllgemein.hasLocationCostLoan} hasWoodConstructionLoan={formData.step3.objektDetailsAllgemein.hasWoodConstructionLoan} showValidation={true} readOnly={true} selbsthilfeData={null} standortbedingteMehrkosten={formData.step5.baugrundstuck.standortbedingteMehrkosten} />;
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
          
          .error-button {
            color: #dc3545 !important;
            font-size: 20px;
          }
          
          .error-button:hover {
            color: #c82333 !important;
          }
          
          .search-container.gap-2 > button {
            margin-right: 8px;
          }
          
          .search-container.gap-2 > button:last-child {
            margin-right: 0;
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

        {/* Validation Modal */}
        <Modal show={showValidationModal} onHide={() => setShowValidationModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Validierung: Gefundene Fehler</Modal.Title>
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

        {/* Success Modal */}
        <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Validierung erfolgreich</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="alert alert-success mb-0">
              <p className="mb-3">Die Eingaben sind vollständig und stimmen mit den regulären Anforderungen überein.</p>
              <p className="mb-3">Alle erforderlichen Angaben sind vorhanden und die Formulardaten sind korrekt ausgefüllt.</p>
              <p className="text-muted small mb-0">Hinweis: Diese Validierung dient der Überprüfung der Formularvollständigkeit für die Bearbeitung.</p>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <div className="d-flex justify-content-center align-items-center w-100">
              <Button 
                onClick={() => setShowSuccessModal(false)}
                style={{ backgroundColor: '#064497', border: 'none' }}
              >
                Schließen
              </Button>
            </div>
          </Modal.Footer>
        </Modal>
    </div>
  );
};

export default HauptantragReviewContainer; 