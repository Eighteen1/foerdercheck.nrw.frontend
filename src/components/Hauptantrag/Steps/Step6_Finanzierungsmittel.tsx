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
}

const Step6_Finanzierungsmittel: React.FC<Step6Props> = ({
  formData,
  updateFormData,
  foerderVariante,
  gesamtkosten,
  childCount,
  barrierefrei,
  begEffizienzhaus40Standard,
  hasSupplementaryLoan
}) => {
  const [eigenleistungError, setEigenleistungError] = useState<string | null>(null);
  const [gesamtbetraegeError, setGesamtbetraegeError] = useState<string | null>(null);
  const [calculatedGesamtkosten, setCalculatedGesamtkosten] = useState(gesamtkosten);

  const calculateTotalCosts = () => {
    const isNeubau = foerderVariante === 'neubau';
    const isBestandserwerbOrErsterwerb = foerderVariante.includes('bestandserwerb') || foerderVariante.includes('ersterwerb');
    const showBaukosten = isNeubau || foerderVariante === 'nutzungsaenderung';
    
    let total = 0;

    // Get the cost data from localStorage
    const savedFormData = localStorage.getItem('hauptantragFormData');
    if (!savedFormData) return '0';
    
    const parsedData = JSON.parse(savedFormData);
    const costData = parsedData.step5;

    // Only include Baugrundstück if it's Neubau
    if (isNeubau && costData.baugrundstuck) {
      Object.values(costData.baugrundstuck).forEach((value: unknown) => {
        if (typeof value === 'string' && value) {
          const numberValue = Number(value.replace(/[^0-9]/g, ''));
          if (!isNaN(numberValue)) {
            total += numberValue;
          }
        }
      });
    }

    // Only include Kaufpreis if it's Bestandserwerb or Ersterwerb
    if (isBestandserwerbOrErsterwerb && costData.kaufpreis) {
      Object.values(costData.kaufpreis).forEach((value: unknown) => {
        if (typeof value === 'string' && value) {
          const numberValue = Number(value.replace(/[^0-9]/g, ''));
          if (!isNaN(numberValue)) {
            total += numberValue;
          }
        }
      });
    }

    // Only include Baukosten if it's Neubau or Nutzungsänderung
    if (showBaukosten && costData.baukosten) {
      Object.values(costData.baukosten).forEach((value: unknown) => {
        if (typeof value === 'string' && value) {
          const numberValue = Number(value.replace(/[^0-9]/g, ''));
          if (!isNaN(numberValue)) {
            total += numberValue;
          }
        }
      });
    }

    // Always include Nebenkosten
    if (costData.nebenkosten) {
      Object.values(costData.nebenkosten).forEach((value: unknown) => {
        if (typeof value === 'string' && value) {
          const numberValue = Number(value.replace(/[^0-9]/g, ''));
          if (!isNaN(numberValue)) {
            total += numberValue;
          }
        }
      });
    }

    return String(total);
  };

  useEffect(() => {
    if (!gesamtkosten || gesamtkosten === '0') {
      const calculated = calculateTotalCosts();
      setCalculatedGesamtkosten(calculated);
    } else {
      setCalculatedGesamtkosten(gesamtkosten);
    }
  }, [gesamtkosten, foerderVariante]);

  const handleFremddarlehenChange = (id: string, field: keyof Fremddarlehen, value: string) => {
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
    updateFormData({
      ...formData,
      fremddarlehen: formData.fremddarlehen.filter(darlehen => darlehen.id !== id)
    });
  };

  const handleNRWBankChange = (section: string, field: string, value: string) => {
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

    // Calculate NRW Bank sums
    let nrwBankNennbetrag = getNumericValue(formData.darlehenNRWBank.grunddarlehen.nennbetrag);
    let nrwBankTilgungsnachlass = getNumericValue(formData.darlehenNRWBank.grunddarlehen.tilgungsnachlass);

    Object.values(formData.darlehenNRWBank.zusatzdarlehen).forEach(darlehen => {
      nrwBankNennbetrag += getNumericValue(darlehen.nennbetrag);
      nrwBankTilgungsnachlass += getNumericValue(darlehen.tilgungsnachlass);
    });

    // Calculate Eigenleistung sum
    let eigenleistungSum = 0;
    Object.entries(formData.eigenleistung).forEach(([key, value]) => {
      if (key !== 'summeEigenleistung') {
        eigenleistungSum += getNumericValue(value);
      }
    });

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
    const gesamtkostenValue = getNumericValue(calculatedGesamtkosten);
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

  const renderTooltip = (text: string) => (
    <Tooltip id="button-tooltip">
      {text}
    </Tooltip>
  );

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
              {index > 0 && (
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
                  />
                  <label>Darlehen der</label>
                </Form.Floating>
              </div>
              <div className="col-md-6">
                <CurrencyInput
                  value={darlehen.nennbetrag}
                  onChange={(value) => handleFremddarlehenChange(darlehen.id, 'nennbetrag', value)}
                  placeholder="Nennbetrag"
                  label="Nennbetrag"
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
                  />
                  <label>Zinssatz %</label>
                </Form.Floating>
              </div>
              <div className="col-md-4">
                <Form.Floating>
                  <Form.Control
                    type="text"
                    placeholder="Auszahlung"
                    value={darlehen.auszahlung}
                    onChange={(e) => handleFremddarlehenChange(darlehen.id, 'auszahlung', e.target.value)}
                  />
                  <label>Auszahlung %</label>
                </Form.Floating>
              </div>
              <div className="col-md-4">
                <Form.Floating>
                  <Form.Control
                    type="text"
                    placeholder="Tilgung"
                    value={darlehen.tilgung}
                    onChange={(e) => handleFremddarlehenChange(darlehen.id, 'tilgung', e.target.value)}
                  />
                  <label>Tilgung %</label>
                </Form.Floating>
              </div>
            </div>
          </div>
        ))}

        <Button
          variant="outline-primary"
          onClick={addFremddarlehen}
          className="mt-3 add-fremddarlehen-btn"
        >
          + Weiteres Fremddarlehen hinzufügen
        </Button>
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
              />
            </div>
            <div className="col-md-6">
              <CurrencyInput
                value={formData.darlehenNRWBank.grunddarlehen.tilgungsnachlass}
                onChange={() => {}}
                placeholder="Tilgungsnachlass"
                label="Tilgungsnachlass"
                disabled
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
                />
              </div>
              <div className="col-md-6">
                <CurrencyInput
                  value={formData.darlehenNRWBank.zusatzdarlehen.familienbonus.tilgungsnachlass}
                  onChange={() => {}}
                  placeholder="Tilgungsnachlass"
                  label="Tilgungsnachlass"
                  disabled
                />
              </div>
            </div>
          )}

          {/* Barrierefreiheit */}
          {barrierefrei && (
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <CurrencyInput
                  value={formData.darlehenNRWBank.zusatzdarlehen.barrierefreiheit.nennbetrag}
                  onChange={(value) => handleNRWBankChange('zusatzdarlehen', 'barrierefreiheit', value)}
                  placeholder="Barrierefreiheit"
                  label="Barrierefreiheit"
                />
              </div>
              <div className="col-md-6">
                <CurrencyInput
                  value={formData.darlehenNRWBank.zusatzdarlehen.barrierefreiheit.tilgungsnachlass}
                  onChange={() => {}}
                  placeholder="Tilgungsnachlass"
                  label="Tilgungsnachlass"
                  disabled
                />
              </div>
            </div>
          )}

          {/* BEG Effizienzhaus 40 Standard */}
          {begEffizienzhaus40Standard && (
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <CurrencyInput
                  value={formData.darlehenNRWBank.zusatzdarlehen.begEffizienzhaus40Standard.nennbetrag}
                  onChange={(value) => handleNRWBankChange('zusatzdarlehen', 'begEffizienzhaus40Standard', value)}
                  placeholder="BEG Effizienzhaus 40 Standard"
                  label="BEG Effizienzhaus 40 Standard"
                />
              </div>
              <div className="col-md-6">
                <CurrencyInput
                  value={formData.darlehenNRWBank.zusatzdarlehen.begEffizienzhaus40Standard.tilgungsnachlass}
                  onChange={() => {}}
                  placeholder="Tilgungsnachlass"
                  label="Tilgungsnachlass"
                  disabled
                />
              </div>
            </div>
          )}

          {/* Summe Förderdarlehen/Tilgungsnachlässe */}
          <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded mt-4">
            <h5 className="mb-0">Summe Förderdarlehen/Tilgungsnachlässe:</h5>
            <div className="d-flex gap-3">
              <span>{formData.darlehenNRWBank.summeNennbetrag}</span>
              <span>{formData.darlehenNRWBank.summeTilgungsnachlass}</span>
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
              />
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
            />
          </div>
          <div className="col-12">
            <CurrencyInput
              value={formData.eigenleistung.zuschüsse}
              onChange={(value) => handleEigenleistungChange('zuschüsse', value)}
              placeholder="Zuschüsse"
              label="Zuschüsse"
            />
          </div>
          <div className="col-12">
            <CurrencyInput
              value={formData.eigenleistung.selbsthilfe}
              onChange={(value) => handleEigenleistungChange('selbsthilfe', value)}
              placeholder="Selbsthilfe"
              label="Selbsthilfe"
            />
          </div>
          {(foerderVariante === 'neubau' || foerderVariante === 'nutzungsaenderung') && (
            <div className="col-12">
              <CurrencyInput
                value={formData.eigenleistung.wertVorhandenerGebaeudeteile}
                onChange={(value) => handleEigenleistungChange('wertVorhandenerGebaeudeteile', value)}
                placeholder="Wert vorhandener Gebäudeteile"
                label="Wert vorhandener Gebäudeteile"
              />
            </div>
          )}
          {foerderVariante === 'neubau' && (
            <div className="col-12">
              <CurrencyInput
                value={formData.eigenleistung.wertBaugrundstück}
                onChange={(value) => handleEigenleistungChange('wertBaugrundstück', value)}
                placeholder="Wert Baugrundstück"
                label="Wert Baugrundstück"
              />
            </div>
          )}
        </div>

        {/* Summe Eigenleistung */}
        <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded mt-4">
          <h5 className="mb-0">Summe Eigenleistung:</h5>
          <span>{formData.eigenleistung.summeEigenleistung}</span>
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
          <h4 className="mb-0 text-[#064497] font-bold">{formData.gesamtbetraege}</h4>
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