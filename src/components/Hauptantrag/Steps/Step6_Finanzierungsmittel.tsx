import React, { useEffect, useState } from 'react';
import { Form, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import CurrencyInput from '../../common/CurrencyInput';
import CurrencyInput_disabled from '../../common/CurrencyInput_disabled';
import { getPostcodeValidation, formatCurrency as formatCurrencyUtil, getNumericValue as getNumericValueUtil } from '../../../utils/postcodeValidation';


export interface Fremddarlehen {
  id: string;
  darlehenGeber: string;
  nennbetrag: string;
  zinssatz: string;
  auszahlung: string;
  tilgung: string;
}

interface Step6Data {
  fremddarlehen: Fremddarlehen[];
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
}

interface Step6Props {
  formData: Step6Data;
  updateFormData: (data: Step6Data) => void;
  foerderVariante: string;
  gesamtkosten: string;
  childCount: string;
  disabledAdultsCount?: string; // Add this prop
  barrierefrei: boolean | null;
  begEffizienzhaus40Standard: boolean | null;
  hasSupplementaryLoan: boolean | null;
  hasLocationCostLoan: boolean | null;
  hasWoodConstructionLoan: boolean | null;
  showValidation?: boolean;
  readOnly?: boolean;
  selbsthilfeData?: {willProvideSelfHelp: boolean | null, totals: {totalSelbsthilfe: number}} | null;
  postcode?: string; // Add postcode prop
  standortbedingteMehrkosten?: string; // Add this prop for validation
}

const Step6_Finanzierungsmittel: React.FC<Step6Props> = ({
  formData,
  updateFormData,
  foerderVariante,
  gesamtkosten,
  childCount,
  disabledAdultsCount = '0',
  barrierefrei,
  begEffizienzhaus40Standard,
  hasSupplementaryLoan,
  hasLocationCostLoan,
  hasWoodConstructionLoan,
  showValidation = false,
  readOnly = false,
  selbsthilfeData = null,
  postcode = '',
  standortbedingteMehrkosten = ''
}) => {
  const [eigenleistungError, setEigenleistungError] = useState<string | null>(null);
  const [gesamtbetraegeError, setGesamtbetraegeError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Local state for sums (for readonly mode)
  const [localSummeNennbetrag, setLocalSummeNennbetrag] = useState('');
  const [localSummeTilgungsnachlass, setLocalSummeTilgungsnachlass] = useState('');
  const [localSummeEigenleistung, setLocalSummeEigenleistung] = useState('');
  const [localGesamtbetraege, setLocalGesamtbetraege] = useState('');

  // Helper function to get numeric value from currency string
  const getNumericValue = (value: string) => {
    return Number(value.replace(/[^0-9]/g, ''));
  };
  // Helper function to format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(value/100);
  };

  // Helper function to check if a currency value is greater than 0
  const isValueGreaterThanZero = (value: string): boolean => {
    const numericValue = getNumericValue(value);
    return numericValue > 0;
  };

  // Helper function to render info field
  const renderInfoField = (message: string) => (
    <div className="row mt-3 mb-3">
      <div className="col-12">
        <div 
          className="d-flex align-items-start gap-3" 
          style={{ 
            fontSize: '15px', 
            padding: '16px 20px',
            backgroundColor: '#F2F6FF',
            border: '1px solid #e9ecef',
            borderRadius: '8px',
            color: '#2d2d2d'
          }}
        >
          <div 
            style={{ 
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#ffffff',
              borderRadius: '50%',
              color: '#064497',
              fontSize: '14px',
              fontWeight: 'bold',
              flexShrink: 0,
              marginTop: '1px'
            }}
          >
            ℹ
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: '12px', lineHeight: '1.5' }}>{message}</div>
            <a 
              href="https://lzdodhbbwvdyciglfwjw.supabase.co/storage/v1/object/sign/documents/leitfaden_nrw_bank/2024-04-02-mhkbd-final-frl-off-wohnen-2024.pdf?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84ZWE2ZjFhOC02ZmFkLTQ5NWYtODQyMy05OThlZTg3N2I2MzciLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJkb2N1bWVudHMvbGVpdGZhZGVuX25yd19iYW5rLzIwMjQtMDQtMDItbWhrYmQtZmluYWwtZnJsLW9mZi13b2huZW4tMjAyNC5wZGYiLCJpYXQiOjE3NTM4NjE3MjAsImV4cCI6MTkxMTU0MTcyMH0.4abRrDtiUTLlgv8jALcIHYcJW7T26j1xtZaDb9osBoE"
              target="_blank"
              rel="noopener noreferrer"
              style={{ 
                color: '#064497', 
                textDecoration: 'underline',
                fontWeight: 500,
                fontSize: '14px'
              }}
            >
              Förderrichtlinie ansehen
            </a>
          </div>
        </div>
      </div>
    </div>
  );

  const handleFremddarlehenChange = (id: string, field: keyof Fremddarlehen, value: string) => {
    //if (readOnly) return;
    const updatedDarlehen = formData.fremddarlehen.map(darlehen => {
      if (darlehen.id === id) {
        return {
          ...darlehen,
          [field]: field === 'nennbetrag' ? value : value
        };
      }
      return darlehen;
    });

    updateFormData({
      ...formData,
      fremddarlehen: updatedDarlehen
    });
  };

  const addFremddarlehen = () => {
    //if (readOnly) return;
    // Check if maximum number of Fremddarlehen is reached
    if (formData.fremddarlehen.length >= 3) {
      return;
    }
    
    const newDarlehen: Fremddarlehen = {
      id: Date.now().toString(),
      darlehenGeber: '',
      nennbetrag: '',
      zinssatz: '',
      auszahlung: '',
      tilgung: ''
    };

    updateFormData({
      ...formData,
      fremddarlehen: [...formData.fremddarlehen, newDarlehen]
    });
  };

  const removeFremddarlehen = (id: string) => {
    //) return;
    updateFormData({
      ...formData,
      fremddarlehen: formData.fremddarlehen.filter(darlehen => darlehen.id !== id)
    });
  };

  const handleNRWBankChange = (section: string, field: string, value: string) => {
    //if (readOnly) return;
    const updatedFormData = { ...formData };
    
    if (section === 'grunddarlehen') {
      updatedFormData.darlehenNRWBank.grunddarlehen[field as keyof typeof formData.darlehenNRWBank.grunddarlehen] = value;
      if (field === 'nennbetrag') {
        const nennbetragValue = value.replace(/[^0-9]/g, '');
        const tilgungsnachlassValue = Math.round(Number(nennbetragValue) * 0.1);
        updatedFormData.darlehenNRWBank.grunddarlehen.tilgungsnachlass = new Intl.NumberFormat('de-DE', {
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: 2
        }).format(tilgungsnachlassValue/100);
      }
    } else if (section === 'zusatzdarlehen') {
      const zusatzdarlehen = updatedFormData.darlehenNRWBank.zusatzdarlehen[field as keyof typeof formData.darlehenNRWBank.zusatzdarlehen];
      if (zusatzdarlehen) {
        zusatzdarlehen.nennbetrag = value;
        // Apply different Tilgungsnachlass rates based on the type
        const nennbetragValue = value.replace(/[^0-9]/g, '');
        const tilgungsRate = (field === 'begEffizienzhaus40Standard' || field === 'standortbedingteMehrkosten' || field === 'bauenMitHolz') ? 0.5 : 0.1;
        const tilgungsnachlassValue = Math.round(Number(nennbetragValue) * tilgungsRate);
        zusatzdarlehen.tilgungsnachlass = new Intl.NumberFormat('de-DE', {
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: 2
        }).format(tilgungsnachlassValue/100);
      }
    }

    updateFormData(updatedFormData);
  };

  const handleEigenleistungChange = (field: keyof typeof formData.eigenleistung, value: string) => {
    //if (readOnly) return;
    const updatedFormData = {
      ...formData,
      eigenleistung: {
        ...formData.eigenleistung,
        [field]: value
      }
    };

    updateFormData(updatedFormData);
  };

  const calculateSums = () => {
    // Calculate NRW Bank sums
    let nrwBankNennbetrag = getNumericValue(formData.darlehenNRWBank.grunddarlehen.nennbetrag);
    let nrwBankTilgungsnachlass = getNumericValue(formData.darlehenNRWBank.grunddarlehen.tilgungsnachlass);

    // Add Familienbonus if childCount > 0
    if (parseInt(childCount) > 0) {
      nrwBankNennbetrag += getNumericValue(formData.darlehenNRWBank.zusatzdarlehen.familienbonus.nennbetrag);
      nrwBankTilgungsnachlass += getNumericValue(formData.darlehenNRWBank.zusatzdarlehen.familienbonus.tilgungsnachlass);
    }

    // Add Bauen mit Holz if hasWoodConstructionLoan is true
    if (hasWoodConstructionLoan) {
      nrwBankNennbetrag += getNumericValue(formData.darlehenNRWBank.zusatzdarlehen.bauenMitHolz.nennbetrag);
      nrwBankTilgungsnachlass += getNumericValue(formData.darlehenNRWBank.zusatzdarlehen.bauenMitHolz.tilgungsnachlass);
    }

    // Check if we're in neubau or ersterwerb
    const isNeubauOrErsterwerb = foerderVariante.includes('neubau') || foerderVariante.includes('ersterwerb');

    // Add Barrierefreiheit if applicable
    if (isNeubauOrErsterwerb && barrierefrei) {
      nrwBankNennbetrag += getNumericValue(formData.darlehenNRWBank.zusatzdarlehen.barrierefreiheit.nennbetrag);
      nrwBankTilgungsnachlass += getNumericValue(formData.darlehenNRWBank.zusatzdarlehen.barrierefreiheit.tilgungsnachlass);
    }

    // Add Standortbedingte Mehrkosten if applicable
    if (isNeubauOrErsterwerb && hasLocationCostLoan) {
      nrwBankNennbetrag += getNumericValue(formData.darlehenNRWBank.zusatzdarlehen.standortbedingteMehrkosten.nennbetrag);
      nrwBankTilgungsnachlass += getNumericValue(formData.darlehenNRWBank.zusatzdarlehen.standortbedingteMehrkosten.tilgungsnachlass);
    }

    // Add BEG Effizienzhaus 40 Standard if applicable
    if (isNeubauOrErsterwerb && begEffizienzhaus40Standard) {
      nrwBankNennbetrag += getNumericValue(formData.darlehenNRWBank.zusatzdarlehen.begEffizienzhaus40Standard.nennbetrag);
      nrwBankTilgungsnachlass += getNumericValue(formData.darlehenNRWBank.zusatzdarlehen.begEffizienzhaus40Standard.tilgungsnachlass);
    }

    // Calculate Eigenleistung sum
    let eigenleistungSum = 0;
    
    // Always include these values
    eigenleistungSum += getNumericValue(formData.eigenleistung.eigeneGeldmittel);
    eigenleistungSum += getNumericValue(formData.eigenleistung.zuschüsse);
    eigenleistungSum += getNumericValue(formData.eigenleistung.selbsthilfe);

    // Only include these values if foerderVariante is "neubau"
    if (foerderVariante.includes('neubau') || foerderVariante === 'nutzungsaenderung') {
      eigenleistungSum += getNumericValue(formData.eigenleistung.wertVorhandenerGebaeudeteile);
    }
    if (foerderVariante.includes('neubau')) {
      eigenleistungSum += getNumericValue(formData.eigenleistung.wertBaugrundstück);
    }

    // Calculate total (excluding Eigenleistung)
    const fremddarlehenSum = formData.fremddarlehen.reduce((sum, darlehen) => 
      sum + getNumericValue(darlehen.nennbetrag), 0);
    
    const ergaenzungsdarlehenSum = getNumericValue(formData.ergaenzungsdarlehen.nennbetrag);

    // Gesamtbeträge now only includes loan amounts
    const gesamtbetraege = fremddarlehenSum + nrwBankNennbetrag + ergaenzungsdarlehenSum;

    // Update sums in formData
    updateFormData({
      ...formData,
      darlehenNRWBank: {
        ...formData.darlehenNRWBank,
        summeNennbetrag: formatCurrency(nrwBankNennbetrag),
        summeTilgungsnachlass: formatCurrency(nrwBankTilgungsnachlass)
      },
      eigenleistung: {
        ...formData.eigenleistung,
        summeEigenleistung: formatCurrency(eigenleistungSum)
      },
      gesamtbetraege: formatCurrency(gesamtbetraege)
    });

    // Validate Eigenleistung (7.5% of Gesamtkosten)
    const gesamtkostenValue = getNumericValue(gesamtkosten);
    const minEigenleistung = Math.round(gesamtkostenValue * 0.075);
    if (eigenleistungSum < minEigenleistung) {
      setEigenleistungError(`Die Eigenleistung muss mind. 7,5% der Gesamtkosten (${formatCurrency(minEigenleistung)}) entsprechen.`);
    } else {
      setEigenleistungError(null);
    }

    // Validate total equals Gesamtkosten (now including Eigenleistung for validation)
    const totalWithEigenleistung = gesamtbetraege + eigenleistungSum;
    const difference = totalWithEigenleistung - gesamtkostenValue;
    if (Math.abs(difference) > 1) {
      setGesamtbetraegeError(`Die Summe aus Eigenleistung und Gesamtfinanzierung (${formatCurrency(totalWithEigenleistung)}) müssen den Gesamtkosten (${formatCurrency(gesamtkostenValue)}) entsprechen. Differenz: ${formatCurrency(difference)}`);
    } else {
      setGesamtbetraegeError(null);
    }
  };

  useEffect(() => {
    // Trigger Tilgungsnachlass calculations for all NRW Bank fields
    const updatedFormData = { ...formData };
    
    // Calculate Grunddarlehen Tilgungsnachlass
    if (updatedFormData.darlehenNRWBank.grunddarlehen.nennbetrag) {
      const nennbetragValue = updatedFormData.darlehenNRWBank.grunddarlehen.nennbetrag.replace(/[^0-9]/g, '');
      const tilgungsnachlassValue = Math.round(Number(nennbetragValue) * 0.1);
      updatedFormData.darlehenNRWBank.grunddarlehen.tilgungsnachlass = new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2
      }).format(tilgungsnachlassValue/100);
    }

    // Calculate Zusatzdarlehen Tilgungsnachlässe
    Object.entries(updatedFormData.darlehenNRWBank.zusatzdarlehen).forEach(([key, darlehen]) => {
      if (darlehen.nennbetrag) {
        const nennbetragValue = darlehen.nennbetrag.replace(/[^0-9]/g, '');
        const tilgungsRate = (key === 'begEffizienzhaus40Standard' || key === 'standortbedingteMehrkosten' || key === 'bauenMitHolz') ? 0.5 : 0.1;
        const tilgungsnachlassValue = Math.round(Number(nennbetragValue) * tilgungsRate);
        darlehen.tilgungsnachlass = new Intl.NumberFormat('de-DE', {
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: 2
        }).format(tilgungsnachlassValue/100);
      }
    });

    updateFormData(updatedFormData);
    calculateSums();
  }, [formData.darlehenNRWBank.grunddarlehen.nennbetrag, 
      formData.darlehenNRWBank.zusatzdarlehen.familienbonus.nennbetrag,
      formData.darlehenNRWBank.zusatzdarlehen.barrierefreiheit.nennbetrag,
      formData.darlehenNRWBank.zusatzdarlehen.bauenMitHolz.nennbetrag,
      formData.darlehenNRWBank.zusatzdarlehen.standortbedingteMehrkosten.nennbetrag,
      formData.darlehenNRWBank.zusatzdarlehen.begEffizienzhaus40Standard.nennbetrag]);

  // Add new useEffect for Eigenleistung changes
  useEffect(() => {
    calculateSums();
  }, [
    formData.eigenleistung.eigeneGeldmittel,
    formData.eigenleistung.zuschüsse,
    formData.eigenleistung.selbsthilfe,
    formData.eigenleistung.wertVorhandenerGebaeudeteile,
    formData.eigenleistung.wertBaugrundstück
  ]);

  // Add new useEffect for Fremddarlehen changes
  useEffect(() => {
    calculateSums();
  }, [formData.fremddarlehen]);

  // Calculate and set local sums for readonly mode
  useEffect(() => {
    // NRW Bank sums
    let nrwBankNennbetrag = getNumericValue(formData.darlehenNRWBank.grunddarlehen.nennbetrag);
    let nrwBankTilgungsnachlass = getNumericValue(formData.darlehenNRWBank.grunddarlehen.tilgungsnachlass);
    if (parseInt(childCount) > 0) {
      nrwBankNennbetrag += getNumericValue(formData.darlehenNRWBank.zusatzdarlehen.familienbonus.nennbetrag);
      nrwBankTilgungsnachlass += getNumericValue(formData.darlehenNRWBank.zusatzdarlehen.familienbonus.tilgungsnachlass);
    }
    if (hasWoodConstructionLoan) {
      nrwBankNennbetrag += getNumericValue(formData.darlehenNRWBank.zusatzdarlehen.bauenMitHolz.nennbetrag);
      nrwBankTilgungsnachlass += getNumericValue(formData.darlehenNRWBank.zusatzdarlehen.bauenMitHolz.tilgungsnachlass);
    }
    const isNeubauOrErsterwerb = foerderVariante.includes('neubau') || foerderVariante.includes('ersterwerb');
    if (isNeubauOrErsterwerb && barrierefrei) {
      nrwBankNennbetrag += getNumericValue(formData.darlehenNRWBank.zusatzdarlehen.barrierefreiheit.nennbetrag);
      nrwBankTilgungsnachlass += getNumericValue(formData.darlehenNRWBank.zusatzdarlehen.barrierefreiheit.tilgungsnachlass);
    }
    if (isNeubauOrErsterwerb && hasLocationCostLoan) {
      nrwBankNennbetrag += getNumericValue(formData.darlehenNRWBank.zusatzdarlehen.standortbedingteMehrkosten.nennbetrag);
      nrwBankTilgungsnachlass += getNumericValue(formData.darlehenNRWBank.zusatzdarlehen.standortbedingteMehrkosten.tilgungsnachlass);
    }
    if (isNeubauOrErsterwerb && begEffizienzhaus40Standard) {
      nrwBankNennbetrag += getNumericValue(formData.darlehenNRWBank.zusatzdarlehen.begEffizienzhaus40Standard.nennbetrag);
      nrwBankTilgungsnachlass += getNumericValue(formData.darlehenNRWBank.zusatzdarlehen.begEffizienzhaus40Standard.tilgungsnachlass);
    }
    // Eigenleistung sum
    let eigenleistungSum = 0;
    eigenleistungSum += getNumericValue(formData.eigenleistung.eigeneGeldmittel);
    eigenleistungSum += getNumericValue(formData.eigenleistung.zuschüsse);
    eigenleistungSum += getNumericValue(formData.eigenleistung.selbsthilfe);
    if (foerderVariante.includes('neubau') || foerderVariante === 'nutzungsaenderung') {
      eigenleistungSum += getNumericValue(formData.eigenleistung.wertVorhandenerGebaeudeteile);
    }
    if (foerderVariante.includes('neubau')) {
      eigenleistungSum += getNumericValue(formData.eigenleistung.wertBaugrundstück);
    }
    // Fremddarlehen sum
    const fremddarlehenSum = formData.fremddarlehen.reduce((sum, darlehen) => 
      sum + getNumericValue(darlehen.nennbetrag), 0);
    const ergaenzungsdarlehenSum = getNumericValue(formData.ergaenzungsdarlehen.nennbetrag);
    const gesamtbetraege = fremddarlehenSum + nrwBankNennbetrag + ergaenzungsdarlehenSum;
    setLocalSummeNennbetrag(formatCurrency(nrwBankNennbetrag));
    setLocalSummeTilgungsnachlass(formatCurrency(nrwBankTilgungsnachlass));
    setLocalSummeEigenleistung(formatCurrency(eigenleistungSum));
    setLocalGesamtbetraege(formatCurrency(gesamtbetraege));
  }, [formData, foerderVariante, childCount, barrierefrei, begEffizienzhaus40Standard, hasWoodConstructionLoan, hasLocationCostLoan]);

  // Add validation function
  const validateStep6 = () => {
    const errors: string[] = [];

    // Get postcode validation data
    const postcodeValidation = getPostcodeValidation(postcode);

    // Validate Fremddarlehen fields
    formData.fremddarlehen.forEach((darlehen, index) => {
      const hasAnyValue = Object.entries(darlehen)
        .filter(([key]) => key !== 'id')
        .some(([_, value]) => value !== '');
      
      if (hasAnyValue) {
        if (!darlehen.darlehenGeber) errors.push(`Fremddarlehen ${index + 1}: Bitte geben Sie den Darlehensgeber ein`);
        if (!darlehen.nennbetrag) errors.push(`Fremddarlehen ${index + 1}: Bitte geben Sie den Nennbetrag ein`);
        if (!darlehen.zinssatz) errors.push(`Fremddarlehen ${index + 1}: Bitte geben Sie den Zinssatz ein`);
        if (!darlehen.auszahlung) errors.push(`Fremddarlehen ${index + 1}: Bitte geben Sie die Auszahlung ein`);
        if (!darlehen.tilgung) errors.push(`Fremddarlehen ${index + 1}: Bitte geben Sie die Tilgung ein`);
      }
    });

    // Validate Ergänzungsdarlehen if hasSupplementaryLoan is true
    if (hasSupplementaryLoan === true) {
      if (!formData.ergaenzungsdarlehen.nennbetrag) {
        errors.push('Ergänzungsdarlehen: Bitte geben Sie den Nennbetrag des Ergänzungsdarlehens ein');
      } else {
        // Validate Ergänzungsdarlehen limits (max 50K, min 2K)
        const ergaenzungsdarlehenValue = getNumericValue(formData.ergaenzungsdarlehen.nennbetrag);
        const maxErgaenzungsdarlehen = 5000000; // 50,000 EUR in cents
        const minErgaenzungsdarlehen = 200000; // 2,000 EUR in cents
        
        if (ergaenzungsdarlehenValue > maxErgaenzungsdarlehen) {
          errors.push(`Ergänzungsdarlehen: Ergänzungsdarlehen darf maximal 50.000,00€ betragen (aktuell: ${formatCurrency(ergaenzungsdarlehenValue)})`);
        }
        if (ergaenzungsdarlehenValue < minErgaenzungsdarlehen) {
          errors.push(`Ergänzungsdarlehen: Ergänzungsdarlehen muss mindestens 2.000,00€ betragen (aktuell: ${formatCurrency(ergaenzungsdarlehenValue)})`);
        }
      }
    } else {
      // Validate NRW Bank Darlehen
      if (!formData.darlehenNRWBank.grunddarlehen.nennbetrag) {
        errors.push('Grunddarlehen: Bitte geben Sie den Nennbetrag des Grunddarlehens ein');
      } else {
        // Validate Grunddarlehen limit based on postcode
        const grunddarlehenValue = getNumericValue(formData.darlehenNRWBank.grunddarlehen.nennbetrag);
        const maxGrunddarlehen = postcodeValidation.limits.maxLimit; // Dynamic limit based on postcode
        
        if (grunddarlehenValue > maxGrunddarlehen) {
          errors.push(`Grunddarlehen: Grunddarlehen darf maximal ${formatCurrencyUtil(maxGrunddarlehen)} betragen (aktuell: ${formatCurrency(grunddarlehenValue)})`);
        }
      }

      // Validate Familienbonus if childCount > 0
      if (parseInt(childCount) > 0 && !formData.darlehenNRWBank.zusatzdarlehen.familienbonus.nennbetrag) {
        errors.push('Familienbonus: Bitte geben Sie den Nennbetrag des Familienbonus ein (0,00€ wenn nicht vorhanden)');
      } else if (parseInt(childCount) > 0 && formData.darlehenNRWBank.zusatzdarlehen.familienbonus.nennbetrag) {
        // Validate Familienbonus limit (max (childCount + disabledAdultsCount) * 24K)
        const familienbonusValue = getNumericValue(formData.darlehenNRWBank.zusatzdarlehen.familienbonus.nennbetrag);
        const totalEligibleCount = parseInt(childCount) + parseInt(disabledAdultsCount || '0');
        const maxFamilienbonus = totalEligibleCount * 2400000; // 24,000 EUR per person in cents
        
        if (familienbonusValue > maxFamilienbonus) {
          errors.push(`Familienbonus: Familienbonus darf maximal ${formatCurrency(maxFamilienbonus)} betragen (${totalEligibleCount} berechtigte Personen × 24.000,00€, aktuell: ${formatCurrency(familienbonusValue)})`);
        }
      }

      // Validate Bauen mit Holz
      if (hasWoodConstructionLoan === true && !formData.darlehenNRWBank.zusatzdarlehen.bauenMitHolz.nennbetrag) {
        errors.push('Bauen mit Holz: Bitte geben Sie den Nennbetrag für Bauen mit Holz ein (0,00€ wenn nicht vorhanden)');
      } else if (hasWoodConstructionLoan === true && formData.darlehenNRWBank.zusatzdarlehen.bauenMitHolz.nennbetrag) {
        // Validate Bauen mit Holz limit (max 17,000 EUR)
        const holzValue = getNumericValue(formData.darlehenNRWBank.zusatzdarlehen.bauenMitHolz.nennbetrag);
        const maxHolz = 1700000; // 17,000 EUR in cents
        
        if (holzValue > maxHolz) {
          errors.push(`Bauen mit Holz: Bauen mit Holz darf maximal 17.000,00€ betragen (aktuell: ${formatCurrency(holzValue)})`);
        }
      }

      // Validate Barrierefreiheit if barrierefrei is true
      if ((foerderVariante.includes('neubau') || foerderVariante?.includes('ersterwerb')) && 
          barrierefrei === true && 
          !formData.darlehenNRWBank.zusatzdarlehen.barrierefreiheit.nennbetrag) {
        errors.push('Barrierefreiheit: Bitte geben Sie den Nennbetrag für Barrierefreiheit ein (0,00€ wenn nicht vorhanden)');
      } else if ((foerderVariante.includes('neubau') || foerderVariante?.includes('ersterwerb')) && 
          barrierefrei === true && 
          formData.darlehenNRWBank.zusatzdarlehen.barrierefreiheit.nennbetrag) {
        // Validate Barrierefreiheit limit (max 11,500 EUR)
        const barrierefreiValue = getNumericValue(formData.darlehenNRWBank.zusatzdarlehen.barrierefreiheit.nennbetrag);
        const maxBarrierefrei = 1150000; // 11,500 EUR in cents
        
        if (barrierefreiValue > maxBarrierefrei) {
          errors.push(`Barrierefreiheit: Barrierefreiheit darf maximal 11.500,00€ betragen (aktuell: ${formatCurrency(barrierefreiValue)})`);
        }
      }

      // Validate Standortbedingte Mehrkosten
      if ((foerderVariante.includes('neubau') || foerderVariante?.includes('ersterwerb')) && 
          hasLocationCostLoan === true && 
          !formData.darlehenNRWBank.zusatzdarlehen.standortbedingteMehrkosten.nennbetrag) {
        errors.push('Standortbedingte Mehrkosten: Bitte geben Sie den Nennbetrag für standortbedingte Mehrkosten ein (0,00€ wenn nicht vorhanden)');
      } else if ((foerderVariante.includes('neubau') || foerderVariante?.includes('ersterwerb')) && 
          hasLocationCostLoan === true && 
          formData.darlehenNRWBank.zusatzdarlehen.standortbedingteMehrkosten.nennbetrag) {
        // Validate Standortbedingte Mehrkosten limit (max 25,000 EUR)
        const standortValue = getNumericValue(formData.darlehenNRWBank.zusatzdarlehen.standortbedingteMehrkosten.nennbetrag);
        const maxStandort = 2500000; // 25,000 EUR in cents
        
        if (standortValue > maxStandort) {
          errors.push(`Standortbedingte Mehrkosten: Das Zusatzdarlehn für standortbedingte Mehrkosten darf maximal 25.000,00€ betragen (aktuell: ${formatCurrency(standortValue)})`);
        } else if (standortbedingteMehrkosten) {
          const costValue = getNumericValue(standortbedingteMehrkosten);
          const maxZusatzdarlehen = Math.round(costValue * 0.75);
          
          if (standortValue > maxZusatzdarlehen) {
            errors.push(`Standortbedingte Mehrkosten: Der Nennbetrag des Zusatzdarlehens für standortbedingte Mehrkosten darf maximal 75 % der angegebenen förderfähigen standortbedingten Mehrkosten betragen (maximal ${formatCurrency(maxZusatzdarlehen)}, aktuell: ${formatCurrency(standortValue)})`);
          }
        }
      }

      // Validate BEG Effizienzhaus 40 Standard
      if ((foerderVariante.includes('neubau') || foerderVariante?.includes('ersterwerb')) && 
          begEffizienzhaus40Standard === true && 
          !formData.darlehenNRWBank.zusatzdarlehen.begEffizienzhaus40Standard.nennbetrag) {
        errors.push('BEG Effizienzhaus 40 Standard: Bitte geben Sie den Nennbetrag für BEG Effizienzhaus 40 Standard ein (0,00€ wenn nicht vorhanden)');
      } else if ((foerderVariante.includes('neubau') || foerderVariante?.includes('ersterwerb')) && 
          begEffizienzhaus40Standard === true && 
          formData.darlehenNRWBank.zusatzdarlehen.begEffizienzhaus40Standard.nennbetrag) {
        // Validate BEG Effizienzhaus 40 Standard limit (max 30,000 EUR)
        const begValue = getNumericValue(formData.darlehenNRWBank.zusatzdarlehen.begEffizienzhaus40Standard.nennbetrag);
        const maxBeg = 3000000; // 30,000 EUR in cents
        
        if (begValue > maxBeg) {
          errors.push(`BEG Effizienzhaus 40 Standard: BEG Effizienzhaus 40 Standard darf maximal 30.000,00€ betragen (aktuell: ${formatCurrency(begValue)})`);
        }
      }
    }

    // Validate Eigenleistung fields
    if (!formData.eigenleistung.eigeneGeldmittel) errors.push('Bitte geben Sie die eigenen Geldmittel ein (0,00€ wenn nicht vorhanden)');
    if (!formData.eigenleistung.zuschüsse) errors.push('Bitte geben Sie die Zuschüsse ein (0,00€ wenn nicht vorhanden)');
    if (!formData.eigenleistung.selbsthilfe) errors.push('Bitte geben Sie die Selbsthilfe ein (0,00€ wenn nicht vorhanden)');

    // Validate wertBaugrundstück if foerderVariante is "neubau"
    if (foerderVariante.includes('neubau') && !formData.eigenleistung.wertBaugrundstück) {
      errors.push('Bitte geben Sie den Wert des Baugrundstücks ein (0,00€ wenn nicht vorhanden)');
    }

    // Validate wertVorhandenerGebaeudeteile if foerderVariante is "neubau" or "nutzungsaenderung"
    if ((foerderVariante.includes('neubau') || foerderVariante === 'nutzungsaenderung') && !formData.eigenleistung.wertVorhandenerGebaeudeteile) {
      errors.push('Bitte geben Sie den Wert vorhandener Gebäudeteile ein (0,00€ wenn nicht vorhanden)');
    }

    // Validate Selbsthilfe consistency with Selbsthilfe form
    if (selbsthilfeData && 
        selbsthilfeData.willProvideSelfHelp === true && 
        formData.eigenleistung.selbsthilfe) {
      const selbsthilfeInHauptantrag = getNumericValue(formData.eigenleistung.selbsthilfe); // in cents
      const selbsthilfeInSelbsthilfeForm = Math.round((selbsthilfeData.totals?.totalSelbsthilfe || 0) * 100); // convert euros to cents
      
      if (selbsthilfeInHauptantrag !== selbsthilfeInSelbsthilfeForm) {
        errors.push(`Angegebener Selbsthilfe-Betrag (${formatCurrency(selbsthilfeInHauptantrag)}) stimmt nicht mit der angegebenen Selbsthilfeleistung im Selbsthilfe-Formular überein (${formatCurrency(selbsthilfeInSelbsthilfeForm)})`);
      }
    }



    return errors;
  };

  // Update validation errors when form data changes AND showValidation is true
  useEffect(() => {
    if (showValidation) {
      setValidationErrors(validateStep6());
    } else {
      setValidationErrors([]);
    }
  }, [formData, showValidation]);

  const getFieldError = (fieldName: string): boolean => {
    return showValidation && validationErrors.some(error => error.includes(fieldName));
  };

  const getFieldErrorMessage = (fieldName: string): string => {
    if (!showValidation) return '';
    const error = validationErrors.find(error => error.includes(fieldName));
    return error || '';
  };

  const renderTooltip = (text: string) => (
    <Tooltip id="button-tooltip">
      {text}
    </Tooltip>
  );

  // On initial mount, always calculate sums (even in readonly mode)
  useEffect(() => {
    calculateSums();
    // eslint-disable-next-line
  }, []);

  return (
    <div>
      <style>
        {`
          .form-check-input:checked {
            background-color: #064497 !important;
            border-color: #064497 !important;
          }
          .add-fremddarlehen-btn {
            color: #064497 !important;
            border-color: #064497 !important;
          }
          .add-fremddarlehen-btn:hover {
            color: white !important;
            background-color: #064497 !important;
          }
        `}
      </style>

      {/* Fremddarlehen Section */}
      <div className="mb-5">
        <div className="d-flex align-items-center gap-2 mb-4">
          <h4 className="mb-0 text-[#000000] font-semibold italic">Fremddarlehen</h4>
          <OverlayTrigger
            placement="right"
            overlay={renderTooltip("Geben Sie die Details zu Ihren Fremddarlehen an")}
          >
            <Button
              variant="outline-secondary"
              className="rounded-circle p-0 d-flex align-items-center justify-content-center"
              style={{
                width: '20px',
                height: '20px',
                color: '#064497',
                borderColor: '#D7DAEA',
                backgroundColor: '#D7DAEA'
              }}
            >
              ?
            </Button>
          </OverlayTrigger>
        </div>

        {formData.fremddarlehen.map((darlehen, index) => (
          <div key={darlehen.id} className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Fremddarlehen {index + 1}</h5>
              {!readOnly && index > 0 && (
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => removeFremddarlehen(darlehen.id)}
                >
                  Löschen
                </Button>
              )}
            </div>

            <div className="row g-3">
              <div className="col-md-6">
                <Form.Floating>
                  <Form.Control
                    type="text"
                    placeholder="Darlehen der"
                    value={darlehen.darlehenGeber}
                    onChange={(e) => handleFremddarlehenChange(darlehen.id, 'darlehenGeber', e.target.value)}
                    isInvalid={getFieldError(`Fremddarlehen ${index + 1}: Bitte geben Sie den Darlehensgeber ein`)}
                    disabled={readOnly}
                  />
                  <label>Darlehen der</label>
                  <Form.Control.Feedback type="invalid">
                    Bitte geben Sie den Darlehensgeber ein
                  </Form.Control.Feedback>
                </Form.Floating>
              </div>
              <div className="col-md-6">
                <CurrencyInput
                  value={darlehen.nennbetrag}
                  onChange={(value) => handleFremddarlehenChange(darlehen.id, 'nennbetrag', value)}
                  placeholder="Nennbetrag"
                  label="Nennbetrag"
                  isInvalid={getFieldError(`Fremddarlehen ${index + 1}: Bitte geben Sie den Nennbetrag ein`)}
                  disabled={readOnly}
                />
              </div>
            </div>

            <div className="row g-3 mt-1">
              <div className="col-md-4">
                <Form.Floating>
                  <Form.Control
                    type="text"
                    placeholder="Zinssatz"
                    value={darlehen.zinssatz}
                    onChange={(e) => handleFremddarlehenChange(darlehen.id, 'zinssatz', e.target.value)}
                    isInvalid={getFieldError(`Fremddarlehen ${index + 1}: Bitte geben Sie den Zinssatz ein`)}
                    disabled={readOnly}
                  />
                  <label>Zinssatz %</label>
                  <Form.Control.Feedback type="invalid">
                    Bitte geben Sie den Zinssatz ein
                  </Form.Control.Feedback>
                </Form.Floating>
              </div>
              <div className="col-md-4">
                <Form.Floating>
                  <Form.Control
                    type="text"
                    placeholder="Auszahlung"
                    value={darlehen.auszahlung}
                    onChange={(e) => handleFremddarlehenChange(darlehen.id, 'auszahlung', e.target.value)}
                    isInvalid={getFieldError(`Fremddarlehen ${index + 1}: Bitte geben Sie die Auszahlung ein`)}
                    disabled={readOnly}
                  />
                  <label>Auszahlung %</label>
                  <Form.Control.Feedback type="invalid">
                    Bitte geben Sie die Auszahlung ein
                  </Form.Control.Feedback>
                </Form.Floating>
              </div>
              <div className="col-md-4">
                <Form.Floating>
                  <Form.Control
                    type="text"
                    placeholder="Tilgung"
                    value={darlehen.tilgung}
                    onChange={(e) => handleFremddarlehenChange(darlehen.id, 'tilgung', e.target.value)}
                    isInvalid={getFieldError(`Fremddarlehen ${index + 1}: Bitte geben Sie die Tilgung ein`)}
                    disabled={readOnly}
                  />
                  <label>Tilgung %</label>
                  <Form.Control.Feedback type="invalid">
                    Bitte geben Sie die Tilgung ein
                  </Form.Control.Feedback>
                </Form.Floating>
              </div>
            </div>
          </div>
        ))}

        {!readOnly && formData.fremddarlehen.length < 3 && (
          <Button
            variant="outline-primary"
            onClick={addFremddarlehen}
            className="mt-3 add-fremddarlehen-btn"
          >
            + Weiteres Fremddarlehen hinzufügen
          </Button>
        )}
      </div>

      {/* NRW Bank Section */}
      {!hasSupplementaryLoan && (
        <div className="mb-5">
          <div className="d-flex align-items-center gap-2 mb-4">
            <h4 className="mb-0 text-[#000000] font-semibold italic">Darlehen der NRW.BANK</h4>
            <OverlayTrigger
              placement="right"
              overlay={renderTooltip("Zinsen 0,5%, Verwaltungskostenbeitrag 0,5%, Auszahlung 100%, Tilgung 1%, bei Bestandserwerb 2%")}
            >
              <Button
                variant="outline-secondary"
                className="rounded-circle p-0 d-flex align-items-center justify-content-center"
                style={{
                  width: '20px',
                  height: '20px',
                  color: '#064497',
                  borderColor: '#D7DAEA',
                  backgroundColor: '#D7DAEA'
                }}
              >
                ?
              </Button>
            </OverlayTrigger>
          </div>

          {/* Grunddarlehen */}
          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <CurrencyInput
                value={formData.darlehenNRWBank.grunddarlehen.nennbetrag}
                onChange={(value) => handleNRWBankChange('grunddarlehen', 'nennbetrag', value)}
                placeholder="Grunddarlehen"
                label="Grunddarlehen"
                isInvalid={getFieldError('Grunddarlehen')}
                disabled={readOnly}
              />
              {getFieldError('Grunddarlehen') && (
                <div className="text-danger mt-1">
                  {getFieldErrorMessage('Grunddarlehen')}
                </div>
              )}
            </div>
            <div className="col-md-6">
              <CurrencyInput_disabled
                value={formData.darlehenNRWBank.grunddarlehen.tilgungsnachlass}
                onChange={() => {}}
                placeholder="Tilgungsnachlass (10%)"
                label="Tilgungsnachlass (10%)"
                disabled={readOnly}
              />
            </div>
          </div>

          {/* Info field for Grunddarlehen */}
          {!hasSupplementaryLoan && (
            renderInfoField(getPostcodeValidation(postcode).infoMessage)
          )}

          {/* Zusatzdarlehen */}
          <h5 className="mb-3">Zusatzdarlehen:</h5>

          {/* Familienbonus */}
          {parseInt(childCount) > 0 && (
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <CurrencyInput
                  value={formData.darlehenNRWBank.zusatzdarlehen.familienbonus.nennbetrag}
                  onChange={(value) => handleNRWBankChange('zusatzdarlehen', 'familienbonus', value)}
                  placeholder="Familienbonus"
                  label="Familienbonus"
                  isInvalid={getFieldError('Familienbonus')}
                  disabled={readOnly}
                />
                {getFieldError('Familienbonus') && (
                  <div className="text-danger mt-1">
                    {getFieldErrorMessage('Familienbonus')}
                  </div>
                )}
              </div>
              <div className="col-md-6">
                <CurrencyInput_disabled
                  value={formData.darlehenNRWBank.zusatzdarlehen.familienbonus.tilgungsnachlass}
                  onChange={() => {}}
                  placeholder="Tilgungsnachlass (10%)"
                  label="Tilgungsnachlass (10%)"
                  disabled={readOnly}
                />
              </div>
            </div>
          )}

          {/* Barrierefreiheit */}
          {(foerderVariante.includes('neubau') || foerderVariante.includes('ersterwerb')) && barrierefrei && (
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <CurrencyInput
                  value={formData.darlehenNRWBank.zusatzdarlehen.barrierefreiheit.nennbetrag}
                  onChange={(value) => handleNRWBankChange('zusatzdarlehen', 'barrierefreiheit', value)}
                  placeholder="Barrierefreiheit"
                  label="Barrierefreiheit"
                  isInvalid={getFieldError('Barrierefreiheit')}
                  disabled={readOnly}
                />
                {getFieldError('Barrierefreiheit') && (
                  <div className="text-danger mt-1">
                    {getFieldErrorMessage('Barrierefreiheit')}
                  </div>
                )}
              </div>
              <div className="col-md-6">
                <CurrencyInput_disabled
                  value={formData.darlehenNRWBank.zusatzdarlehen.barrierefreiheit.tilgungsnachlass}
                  onChange={() => {}}
                  placeholder="Tilgungsnachlass (10%)"
                  label="Tilgungsnachlass (10%)"
                  disabled={readOnly}
                />
              </div>
            </div>
          )}

          {/* BEG Effizienzhaus 40 Standard */}
          {(foerderVariante.includes('neubau') || foerderVariante.includes('ersterwerb')) && begEffizienzhaus40Standard && (
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <CurrencyInput
                  value={formData.darlehenNRWBank.zusatzdarlehen.begEffizienzhaus40Standard.nennbetrag}
                  onChange={(value) => handleNRWBankChange('zusatzdarlehen', 'begEffizienzhaus40Standard', value)}
                  placeholder="BEG Effizienzhaus 40 Standard"
                  label="BEG Effizienzhaus 40 Standard"
                  isInvalid={getFieldError('BEG Effizienzhaus 40 Standard')}
                  disabled={readOnly}
                />
                {getFieldError('BEG Effizienzhaus 40 Standard') && (
                  <div className="text-danger mt-1">    
                    {getFieldErrorMessage('BEG Effizienzhaus 40 Standard')}
                  </div>
                )}
              </div>
              <div className="col-md-6">
                <CurrencyInput_disabled
                  value={formData.darlehenNRWBank.zusatzdarlehen.begEffizienzhaus40Standard.tilgungsnachlass}
                  onChange={() => {}}
                  placeholder="Tilgungsnachlass (50%)"
                  label="Tilgungsnachlass (50%)"
                  disabled={readOnly}
                />
              </div>
            </div>
          )}

          {/* Standortbedingte Mehrkosten */}
          {(foerderVariante.includes('neubau') || foerderVariante.includes('ersterwerb')) && hasLocationCostLoan && (
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <CurrencyInput
                  value={formData.darlehenNRWBank.zusatzdarlehen.standortbedingteMehrkosten.nennbetrag}
                  onChange={(value) => handleNRWBankChange('zusatzdarlehen', 'standortbedingteMehrkosten', value)}
                  placeholder="Standortbedingte Mehrkosten"
                  label="Standortbedingte Mehrkosten"
                  isInvalid={getFieldError('Standortbedingte Mehrkosten')}
                  disabled={readOnly}
                />
                {getFieldError('Standortbedingte Mehrkosten') && (
                  <div className="text-danger mt-1">
                    {getFieldErrorMessage('Standortbedingte Mehrkosten')}
                  </div>
                )}
              </div>
              <div className="col-md-6">
                <CurrencyInput_disabled
                  value={formData.darlehenNRWBank.zusatzdarlehen.standortbedingteMehrkosten.tilgungsnachlass}
                  onChange={() => {}}
                  placeholder="Tilgungsnachlass (50%)"
                  label="Tilgungsnachlass (50%)"
                  disabled={readOnly}
                />
              </div>
            </div>
          )}
          {/* Info field for Standortbedingte Mehrkosten */}
          {(foerderVariante.includes('neubau') || foerderVariante.includes('ersterwerb')) && hasLocationCostLoan && 
           isValueGreaterThanZero(formData.darlehenNRWBank.zusatzdarlehen.standortbedingteMehrkosten.nennbetrag) && (
            renderInfoField("Standortbedingte Mehrkosten: Bitte informieren Sie sich über die Berechnung der förderfähigen Summe. Informationen finden Sie in der Förderrichtlinie unter Punkt 2.5.2")
          )}

          {/* Bauen mit Holz */}
          {hasWoodConstructionLoan && (
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <CurrencyInput
                  value={formData.darlehenNRWBank.zusatzdarlehen.bauenMitHolz.nennbetrag}
                  onChange={(value) => handleNRWBankChange('zusatzdarlehen', 'bauenMitHolz', value)}
                  placeholder="Bauen mit Holz"
                  label="Bauen mit Holz"
                  isInvalid={getFieldError('Bauen mit Holz')}
                  disabled={readOnly}
                />
                {getFieldError('Bauen mit Holz') && (
                  <div className="text-danger mt-1">
                    {getFieldErrorMessage('Bauen mit Holz')}
                  </div>
                )}
              </div>
              <div className="col-md-6">
                <CurrencyInput_disabled
                  value={formData.darlehenNRWBank.zusatzdarlehen.bauenMitHolz.tilgungsnachlass}
                  onChange={() => {}}
                  placeholder="Tilgungsnachlass (50%)"
                  label="Tilgungsnachlass (50%)"
                  disabled={readOnly}
                />
              </div>
            </div>
          )}
          {/* Info field for Bauen mit Holz */}
          {hasWoodConstructionLoan && 
           isValueGreaterThanZero(formData.darlehenNRWBank.zusatzdarlehen.bauenMitHolz.nennbetrag) && (
            renderInfoField("Bauen mit Holz: Bitte informieren Sie sich über die Berechnung der förderfähigen Summe. Informationen finden Sie in der Förderrichtlinie unter Punkt 2.5.5")
          )}

          {/* Summe Förderdarlehen/Tilgungsnachlässe */}
          <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded mt-4">
            <h5 className="mb-0">Summe Förderdarlehen/Tilgungsnachlässe:</h5>
            <div className="d-flex gap-3">
              <span>{readOnly ? localSummeNennbetrag : formData.darlehenNRWBank.summeNennbetrag}</span>
              <span>{readOnly ? localSummeTilgungsnachlass : formData.darlehenNRWBank.summeTilgungsnachlass}</span>
            </div>
          </div>
        </div>
      )}

      {/* Ergänzungsdarlehen Section */}
      {hasSupplementaryLoan && (
        <div className="mb-5">
          <div className="d-flex align-items-center gap-2 mb-4">
            <h4 className="mb-0 text-[#000000] font-semibold italic">Ergänzungsdarlehen der NRW.BANK</h4>
            <OverlayTrigger
              placement="right"
              overlay={renderTooltip("Zinsen 3,62%, Verwaltungskostenbeitrag 0,5%, Auszahlung 100%, Tilgung 2%")}
            >
              <Button
                variant="outline-secondary"
                className="rounded-circle p-0 d-flex align-items-center justify-content-center"
                style={{
                  width: '20px',
                  height: '20px',
                  color: '#064497',
                  borderColor: '#D7DAEA',
                  backgroundColor: '#D7DAEA'
                }}
              >
                ?
              </Button>
            </OverlayTrigger>
          </div>

          <div className="row g-3">
            <div className="col-12">
              <CurrencyInput
                value={formData.ergaenzungsdarlehen.nennbetrag}
                onChange={(value) => {
                  updateFormData({
                    ...formData,
                    ergaenzungsdarlehen: {
                      nennbetrag: value
                    }
                  });
                }}
                placeholder="Nennbetrag"
                label="Nennbetrag"
                                  isInvalid={getFieldError('Ergänzungsdarlehen')}
                  disabled={readOnly}
                />
                {getFieldError('Ergänzungsdarlehen') && (
                  <div className="text-danger mt-1">
                    {getFieldErrorMessage('Ergänzungsdarlehen')}
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Eigenleistung Section */}
      <div className="mb-5">
        <div className="d-flex align-items-center gap-2 mb-4">
          <h4 className="mb-0 text-[#000000] font-semibold italic">Eigenleistung (mind. 7,5% der Gesamtkosten)</h4>
          <OverlayTrigger
            placement="right"
            overlay={renderTooltip("Geben Sie Ihre Eigenleistung an")}
          >
            <Button
              variant="outline-secondary"
              className="rounded-circle p-0 d-flex align-items-center justify-content-center"
              style={{
                width: '20px',
                height: '20px',
                color: '#064497',
                borderColor: '#D7DAEA',
                backgroundColor: '#D7DAEA'
              }}
            >
              ?
            </Button>
          </OverlayTrigger>
        </div>

        <div className="row g-3">
          <div className="col-12">
            <CurrencyInput
              value={formData.eigenleistung.eigeneGeldmittel}
              onChange={(value) => handleEigenleistungChange('eigeneGeldmittel', value)}
              placeholder="Eigene Geldmittel, bezahlte Rechnungen"
              label="Eigene Geldmittel, bezahlte Rechnungen"
              isInvalid={getFieldError('Bitte geben Sie die eigenen Geldmittel ein')}
              disabled={readOnly}
            />
            {getFieldError('Bitte geben Sie die eigenen Geldmittel ein') && (
              <div className="text-danger mt-1">
                Bitte geben Sie die eigenen Geldmittel ein (0,00€ wenn nicht vorhanden)
              </div>
            )}
          </div>
          <div className="col-12">
            <CurrencyInput
              value={formData.eigenleistung.zuschüsse}
              onChange={(value) => handleEigenleistungChange('zuschüsse', value)}
              placeholder="Zuschüsse"
              label="Zuschüsse"
              isInvalid={getFieldError('Bitte geben Sie die Zuschüsse ein')}
              disabled={readOnly}
            />
            {getFieldError('Bitte geben Sie die Zuschüsse ein') && (
              <div className="text-danger mt-1">
                Bitte geben Sie die Zuschüsse ein (0,00€ wenn nicht vorhanden)
              </div>
            )}
          </div>
          <div className="col-12">
            <CurrencyInput
              value={formData.eigenleistung.selbsthilfe}
              onChange={(value) => handleEigenleistungChange('selbsthilfe', value)}
              placeholder="Selbsthilfe"
              label="Selbsthilfe"
              isInvalid={getFieldError('Bitte geben Sie die Selbsthilfe ein') || getFieldError('Angegebener Selbsthilfe-Betrag')}
              disabled={readOnly}
            />
            {getFieldError('Bitte geben Sie die Selbsthilfe ein') && (
              <div className="text-danger mt-1">
                Bitte geben Sie die Selbsthilfe ein (0,00€ wenn nicht vorhanden)
              </div>
            )}
            {getFieldError('Angegebener Selbsthilfe-Betrag') && (
              <div className="text-danger mt-1">
                {validationErrors.find(error => error.includes('Angegebener Selbsthilfe-Betrag'))}
              </div>
            )}
          </div>
          {(foerderVariante.includes('neubau') || foerderVariante === 'nutzungsaenderung') && (
            <div className="col-12">
              <CurrencyInput
                value={formData.eigenleistung.wertVorhandenerGebaeudeteile}
                onChange={(value) => handleEigenleistungChange('wertVorhandenerGebaeudeteile', value)}
                placeholder="Wert vorhandener Gebäudeteile"
                label="Wert vorhandener Gebäudeteile"
                isInvalid={getFieldError('Bitte geben Sie den Wert vorhandener Gebäudeteile ein')}
                disabled={readOnly}
              />
              {getFieldError('Bitte geben Sie den Wert vorhandener Gebäudeteile ein') && (
                <div className="text-danger mt-1">
                  Bitte geben Sie den Wert vorhandener Gebäudeteile ein (0,00€ wenn nicht vorhanden)
                </div>
              )}
            </div>
          )}
          {foerderVariante.includes('neubau') && (
            <div className="col-12">
              <CurrencyInput
                value={formData.eigenleistung.wertBaugrundstück}
                onChange={(value) => handleEigenleistungChange('wertBaugrundstück', value)}
                placeholder="Wert Baugrundstück"
                label="Wert Baugrundstück"
                isInvalid={getFieldError('Bitte geben Sie den Wert des Baugrundstücks ein')}
                disabled={readOnly}
              />
              {getFieldError('Bitte geben Sie den Wert des Baugrundstücks ein') && (
                <div className="text-danger mt-1">
                  Bitte geben Sie den Wert des Baugrundstücks ein (0,00€ wenn nicht vorhanden)
                </div>
              )}
            </div>
          )}
        </div>

        {/* Summe Eigenleistung */}
        <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded mt-4">
          <h5 className="mb-0">Summe Eigenleistung:</h5>
          <span>{readOnly ? localSummeEigenleistung : formData.eigenleistung.summeEigenleistung}</span>
        </div>

        {eigenleistungError && (
          <div className="alert alert-danger mt-3" role="alert">
            {eigenleistungError}
          </div>
        )}
      </div>

      {/* Gesamtbeträge Finanzierung */}
      <div className="mb-5">
        <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
          <h4 className="mb-0 text-[#000000] font-semibold">Gesamtbeträge Finanzierung:</h4>
          <h4 className="mb-0 text-[#064497] font-bold">{readOnly ? localGesamtbetraege : formData.gesamtbetraege}</h4>
        </div>

        {gesamtbetraegeError && (
          <div className="alert alert-danger mt-3" role="alert">
            {gesamtbetraegeError}
          </div>
        )}
      </div>
    </div>
  );
};

export default Step6_Finanzierungsmittel; 