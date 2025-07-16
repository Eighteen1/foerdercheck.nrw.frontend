import React, { useEffect, useState } from 'react';
import { Form, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import CurrencyInput from '../../common/CurrencyInput';

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
  barrierefrei: boolean | null;
  begEffizienzhaus40Standard: boolean | null;
  hasSupplementaryLoan: boolean | null;
  hasLocationCostLoan: boolean | null;
  hasWoodConstructionLoan: boolean | null;
  showValidation?: boolean;
  readOnly?: boolean;
  selbsthilfeData?: {willProvideSelfHelp: boolean | null, totals: {totalSelbsthilfe: number}} | null;
}

const Step6_Finanzierungsmittel: React.FC<Step6Props> = ({
  formData,
  updateFormData,
  foerderVariante,
  gesamtkosten,
  childCount,
  barrierefrei,
  begEffizienzhaus40Standard,
  hasSupplementaryLoan,
  hasLocationCostLoan,
  hasWoodConstructionLoan,
  showValidation = false,
  readOnly = false,
  selbsthilfeData = null
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
        const tilgungsRate = field === 'begEffizienzhaus40Standard' ? 0.5 : 0.1;
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
    const isNeubauOrErsterwerb = foerderVariante === 'neubau' || foerderVariante.includes('ersterwerb');

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
    if (foerderVariante === 'neubau' || foerderVariante === 'nutzungsaenderung') {
      eigenleistungSum += getNumericValue(formData.eigenleistung.wertVorhandenerGebaeudeteile);
    }
    if (foerderVariante === 'neubau') {
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
        const tilgungsRate = key === 'begEffizienzhaus40Standard' ? 0.5 : 0.1;
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
    const isNeubauOrErsterwerb = foerderVariante === 'neubau' || foerderVariante.includes('ersterwerb');
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
    if (foerderVariante === 'neubau' || foerderVariante === 'nutzungsaenderung') {
      eigenleistungSum += getNumericValue(formData.eigenleistung.wertVorhandenerGebaeudeteile);
    }
    if (foerderVariante === 'neubau') {
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
        errors.push('Bitte geben Sie den Nennbetrag des Ergänzungsdarlehens ein');
      }
    } else {
      // Validate NRW Bank Darlehen
      if (!formData.darlehenNRWBank.grunddarlehen.nennbetrag) {
        errors.push('Bitte geben Sie den Nennbetrag des Grunddarlehens ein');
      }

      // Validate Familienbonus if childCount > 0
      if (parseInt(childCount) > 0 && !formData.darlehenNRWBank.zusatzdarlehen.familienbonus.nennbetrag) {
        errors.push('Bitte geben Sie den Nennbetrag des Familienbonus ein (0,00€ wenn nicht vorhanden)');
      }

      // Validate Bauen mit Holz
      if (hasWoodConstructionLoan === true && !formData.darlehenNRWBank.zusatzdarlehen.bauenMitHolz.nennbetrag) {
        errors.push('Bitte geben Sie den Nennbetrag für Bauen mit Holz ein (0,00€ wenn nicht vorhanden)');
      }

      // Validate Barrierefreiheit if barrierefrei is true
      if ((foerderVariante === 'neubau' || foerderVariante?.includes('ersterwerb')) && 
          barrierefrei === true && 
          !formData.darlehenNRWBank.zusatzdarlehen.barrierefreiheit.nennbetrag) {
        errors.push('Bitte geben Sie den Nennbetrag für Barrierefreiheit ein (0,00€ wenn nicht vorhanden)');
      }

      // Validate Standortbedingte Mehrkosten
      if ((foerderVariante === 'neubau' || foerderVariante?.includes('ersterwerb')) && 
          hasLocationCostLoan === true && 
          !formData.darlehenNRWBank.zusatzdarlehen.standortbedingteMehrkosten.nennbetrag) {
        errors.push('Bitte geben Sie den Nennbetrag für standortbedingte Mehrkosten ein (0,00€ wenn nicht vorhanden)');
      }

      // Validate BEG Effizienzhaus 40 Standard
      if ((foerderVariante === 'neubau' || foerderVariante?.includes('ersterwerb')) && 
          begEffizienzhaus40Standard === true && 
          !formData.darlehenNRWBank.zusatzdarlehen.begEffizienzhaus40Standard.nennbetrag) {
        errors.push('Bitte geben Sie den Nennbetrag für BEG Effizienzhaus 40 Standard ein (0,00€ wenn nicht vorhanden)');
      }
    }

    // Validate Eigenleistung fields
    if (!formData.eigenleistung.eigeneGeldmittel) errors.push('Bitte geben Sie die eigenen Geldmittel ein (0,00€ wenn nicht vorhanden)');
    if (!formData.eigenleistung.zuschüsse) errors.push('Bitte geben Sie die Zuschüsse ein (0,00€ wenn nicht vorhanden)');
    if (!formData.eigenleistung.selbsthilfe) errors.push('Bitte geben Sie die Selbsthilfe ein (0,00€ wenn nicht vorhanden)');

    // Validate wertBaugrundstück if foerderVariante is "neubau"
    if (foerderVariante === 'neubau' && !formData.eigenleistung.wertBaugrundstück) {
      errors.push('Bitte geben Sie den Wert des Baugrundstücks ein (0,00€ wenn nicht vorhanden)');
    }

    // Validate wertVorhandenerGebaeudeteile if foerderVariante is "neubau" or "nutzungsaenderung"
    if ((foerderVariante === 'neubau' || foerderVariante === 'nutzungsaenderung') && !formData.eigenleistung.wertVorhandenerGebaeudeteile) {
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

        {!readOnly && (
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
                isInvalid={getFieldError('Bitte geben Sie den Nennbetrag des Grunddarlehens ein')}
                disabled={readOnly}
              />
              {getFieldError('Bitte geben Sie den Nennbetrag des Grunddarlehens ein') && (
                <div className="text-danger mt-1">
                  Bitte geben Sie den Nennbetrag des Grunddarlehens ein
                </div>
              )}
            </div>
            <div className="col-md-6">
              <CurrencyInput
                value={formData.darlehenNRWBank.grunddarlehen.tilgungsnachlass}
                onChange={() => {}}
                placeholder="Tilgungsnachlass"
                label="Tilgungsnachlass"
                disabled={readOnly}
              />
            </div>
          </div>

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
                  isInvalid={getFieldError('Bitte geben Sie den Nennbetrag des Familienbonus ein')}
                  disabled={readOnly}
                />
                {getFieldError('Bitte geben Sie den Nennbetrag des Familienbonus ein') && (
                  <div className="text-danger mt-1">
                    Bitte geben Sie den Nennbetrag des Familienbonus ein (0,00€ wenn nicht vorhanden)
                  </div>
                )}
              </div>
              <div className="col-md-6">
                <CurrencyInput
                  value={formData.darlehenNRWBank.zusatzdarlehen.familienbonus.tilgungsnachlass}
                  onChange={() => {}}
                  placeholder="Tilgungsnachlass"
                  label="Tilgungsnachlass"
                  disabled={readOnly}
                />
              </div>
            </div>
          )}

          {/* Barrierefreiheit */}
          {(foerderVariante === 'neubau' || foerderVariante.includes('ersterwerb')) && barrierefrei && (
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <CurrencyInput
                  value={formData.darlehenNRWBank.zusatzdarlehen.barrierefreiheit.nennbetrag}
                  onChange={(value) => handleNRWBankChange('zusatzdarlehen', 'barrierefreiheit', value)}
                  placeholder="Barrierefreiheit"
                  label="Barrierefreiheit"
                  isInvalid={getFieldError('Bitte geben Sie den Nennbetrag für Barrierefreiheit ein')}
                  disabled={readOnly}
                />
                {getFieldError('Bitte geben Sie den Nennbetrag für Barrierefreiheit ein') && (
                  <div className="text-danger mt-1">
                    Bitte geben Sie den Nennbetrag für Barrierefreiheit ein (0,00€ wenn nicht vorhanden)
                  </div>
                )}
              </div>
              <div className="col-md-6">
                <CurrencyInput
                  value={formData.darlehenNRWBank.zusatzdarlehen.barrierefreiheit.tilgungsnachlass}
                  onChange={() => {}}
                  placeholder="Tilgungsnachlass"
                  label="Tilgungsnachlass"
                  disabled={readOnly}
                />
              </div>
            </div>
          )}

          {/* BEG Effizienzhaus 40 Standard */}
          {(foerderVariante === 'neubau' || foerderVariante.includes('ersterwerb')) && begEffizienzhaus40Standard && (
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <CurrencyInput
                  value={formData.darlehenNRWBank.zusatzdarlehen.begEffizienzhaus40Standard.nennbetrag}
                  onChange={(value) => handleNRWBankChange('zusatzdarlehen', 'begEffizienzhaus40Standard', value)}
                  placeholder="BEG Effizienzhaus 40 Standard"
                  label="BEG Effizienzhaus 40 Standard"
                  isInvalid={getFieldError('Bitte geben Sie den Nennbetrag für BEG Effizienzhaus 40 Standard ein')}
                  disabled={readOnly}
                />
                {getFieldError('Bitte geben Sie den Nennbetrag für BEG Effizienzhaus 40 Standard ein') && (
                  <div className="text-danger mt-1">
                    Bitte geben Sie den Nennbetrag für BEG Effizienzhaus 40 Standard ein (0,00€ wenn nicht vorhanden)
                  </div>
                )}
              </div>
              <div className="col-md-6">
                <CurrencyInput
                  value={formData.darlehenNRWBank.zusatzdarlehen.begEffizienzhaus40Standard.tilgungsnachlass}
                  onChange={() => {}}
                  placeholder="Tilgungsnachlass"
                  label="Tilgungsnachlass"
                  disabled={readOnly}
                />
              </div>
            </div>
          )}

          {/* Standortbedingte Mehrkosten */}
          {(foerderVariante === 'neubau' || foerderVariante.includes('ersterwerb')) && hasLocationCostLoan && (
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <CurrencyInput
                  value={formData.darlehenNRWBank.zusatzdarlehen.standortbedingteMehrkosten.nennbetrag}
                  onChange={(value) => handleNRWBankChange('zusatzdarlehen', 'standortbedingteMehrkosten', value)}
                  placeholder="Standortbedingte Mehrkosten"
                  label="Standortbedingte Mehrkosten"
                  isInvalid={getFieldError('Bitte geben Sie den Nennbetrag für standortbedingte Mehrkosten ein')}
                  disabled={readOnly}
                />
                {getFieldError('Bitte geben Sie den Nennbetrag für standortbedingte Mehrkosten ein') && (
                  <div className="text-danger mt-1">
                    Bitte geben Sie den Nennbetrag für standortbedingte Mehrkosten ein (0,00€ wenn nicht vorhanden)
                  </div>
                )}
              </div>
              <div className="col-md-6">
                <CurrencyInput
                  value={formData.darlehenNRWBank.zusatzdarlehen.standortbedingteMehrkosten.tilgungsnachlass}
                  onChange={() => {}}
                  placeholder="Tilgungsnachlass"
                  label="Tilgungsnachlass"
                  disabled={readOnly}
                />
              </div>
            </div>
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
                  isInvalid={getFieldError('Bitte geben Sie den Nennbetrag für Bauen mit Holz ein')}
                  disabled={readOnly}
                />
                {getFieldError('Bitte geben Sie den Nennbetrag für Bauen mit Holz ein') && (
                  <div className="text-danger mt-1">
                    Bitte geben Sie den Nennbetrag für Bauen mit Holz ein (0,00€ wenn nicht vorhanden)
                  </div>
                )}
              </div>
              <div className="col-md-6">
                <CurrencyInput
                  value={formData.darlehenNRWBank.zusatzdarlehen.bauenMitHolz.tilgungsnachlass}
                  onChange={() => {}}
                  placeholder="Tilgungsnachlass"
                  label="Tilgungsnachlass"
                  disabled={readOnly}
                />
              </div>
            </div>
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
                isInvalid={getFieldError('Bitte geben Sie den Nennbetrag des Ergänzungsdarlehens ein')}
                disabled={readOnly}
              />
              {getFieldError('Bitte geben Sie den Nennbetrag des Ergänzungsdarlehens ein') && (
                <div className="text-danger mt-1">
                  Bitte geben Sie den Nennbetrag des Ergänzungsdarlehens ein
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
          {(foerderVariante === 'neubau' || foerderVariante === 'nutzungsaenderung') && (
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
          {foerderVariante === 'neubau' && (
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