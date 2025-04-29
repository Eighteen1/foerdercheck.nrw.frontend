import React, { useEffect, useState } from 'react';
import { Form, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import CurrencyInput from '../../common/CurrencyInput';

interface Step5Data {
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
}

interface Step5Props {
  formData: Step5Data;
  updateFormData: (data: Step5Data) => void;
  foerderVariante: string;
}

const Step5_Kostenaufstellung: React.FC<Step5Props> = ({ formData, updateFormData, foerderVariante }) => {
  const [totalCost, setTotalCost] = useState('0');
  const [previousFoerderVariante, setPreviousFoerderVariante] = useState(foerderVariante);

  const formatCurrency = (value: string): string => {
    if (value === '') return '';
    const numberValue = Number(value.replace(/[^0-9]/g, ''));
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(numberValue/100);
  };

  const handleInputChange = (section: keyof Step5Data, field: string, value: string) => {
    const sectionData = formData[section] as Record<string, any>;
    updateFormData({
      ...formData,
      [section]: {
        ...sectionData,
        [field]: value
      }
    });
  };

  const resetSection = (section: keyof Step5Data) => {
    const emptySection = Object.keys(formData[section]).reduce((acc, key) => {
      acc[key] = '';
      return acc;
    }, {} as Record<string, string>);

    updateFormData({
      ...formData,
      [section]: emptySection
    });
  };

  // Check if foerderVariante has changed and reset appropriate sections
  useEffect(() => {
    if (foerderVariante !== previousFoerderVariante) {
      const isNeubau = foerderVariante === 'neubau';
      const isBestandserwerbOrErsterwerb = foerderVariante.includes('bestandserwerb') || foerderVariante.includes('ersterwerb');
      const showBaukosten = isNeubau || foerderVariante === 'nutzungsaenderung';

      // Reset Baugrundstück if switching from Neubau to something else
      if (!isNeubau) {
        resetSection('baugrundstuck');
      }

      // Reset Kaufpreis if switching from Bestandserwerb/Ersterwerb to something else
      if (!isBestandserwerbOrErsterwerb) {
        resetSection('kaufpreis');
      }

      // Reset Baukosten if switching to a type that doesn't show Baukosten
      if (!showBaukosten) {
        resetSection('baukosten');
      }

      setPreviousFoerderVariante(foerderVariante);
    }
  }, [foerderVariante]);

  const calculateTotal = () => {
    const isNeubau = foerderVariante === 'neubau';
    const isBestandserwerbOrErsterwerb = foerderVariante.includes('bestandserwerb') || foerderVariante.includes('ersterwerb');
    const showBaukosten = isNeubau || foerderVariante === 'nutzungsaenderung';
    
    let total = 0;

    // Only include Baugrundstück if it's Neubau
    if (isNeubau) {
      Object.values(formData.baugrundstuck).forEach((value) => {
        if (value) {
          const numberValue = Number(value.replace(/[^0-9]/g, ''));
          if (!isNaN(numberValue)) {
            total += numberValue;
          }
        }
      });
    }

    // Only include Kaufpreis if it's Bestandserwerb or Ersterwerb
    if (isBestandserwerbOrErsterwerb) {
      Object.values(formData.kaufpreis).forEach((value) => {
        if (value) {
          const numberValue = Number(value.replace(/[^0-9]/g, ''));
          if (!isNaN(numberValue)) {
            total += numberValue;
          }
        }
      });
    }

    // Only include Baukosten if it's Neubau or Nutzungsänderung
    if (showBaukosten) {
      Object.values(formData.baukosten).forEach((value) => {
        if (value) {
          const numberValue = Number(value.replace(/[^0-9]/g, ''));
          if (!isNaN(numberValue)) {
            total += numberValue;
          }
        }
      });
    }

    // Always include Nebenkosten
    Object.values(formData.nebenkosten).forEach((value) => {
      if (value) {
        const numberValue = Number(value.replace(/[^0-9]/g, ''));
        if (!isNaN(numberValue)) {
          total += numberValue;
        }
      }
    });

    return String(total);
  };

  useEffect(() => {
    const newTotal = calculateTotal();
    setTotalCost(newTotal);
    updateFormData({
      ...formData,
      gesamtkosten: newTotal
    });
  }, [formData.baugrundstuck, formData.kaufpreis, formData.baukosten, formData.nebenkosten]);

  const renderTooltip = (text: string) => (
    <Tooltip id="button-tooltip">
      {text}
    </Tooltip>
  );

  const isNeubau = foerderVariante === 'neubau';
  const isBestandserwerb = foerderVariante.includes('bestandserwerb');
  const isErsterwerb = foerderVariante.includes('ersterwerb');
  const showBaukosten = isNeubau || foerderVariante === 'nutzungsaenderung';

  return (
    <div>
      <style>
        {`
          .form-check-input:checked {
            background-color: #064497 !important;
            border-color: #064497 !important;
          }
        `}
      </style>

      {/* Baugrundstück Section */}
      {isNeubau && (
        <div className="mb-5">
          <div className="d-flex align-items-center gap-2 mb-4">
            <h4 className="mb-0 text-[#000000] font-semibold italic">Baugrundstück</h4>
            <OverlayTrigger
              placement="right"
              overlay={renderTooltip("Kosten für das Baugrundstück")}
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
                value={formData.baugrundstuck.kaufpreis}
                onChange={(value) => handleInputChange('baugrundstuck', 'kaufpreis', value)}
                placeholder="Kaufpreis des Baugrundstücks"
                label="Kaufpreis des Baugrundstücks"
              />
            </div>
            <div className="col-12">
              <CurrencyInput
                value={formData.baugrundstuck.wert}
                onChange={(value) => handleInputChange('baugrundstuck', 'wert', value)}
                placeholder="Wert des Baugrundstücks"
                label="Wert des Baugrundstücks"
              />
            </div>
            <div className="col-12">
              <CurrencyInput
                value={formData.baugrundstuck.erschliessungskosten}
                onChange={(value) => handleInputChange('baugrundstuck', 'erschliessungskosten', value)}
                placeholder="Erschließungskosten"
                label="Erschließungskosten"
              />
            </div>
            <div className="col-12">
              <CurrencyInput
                value={formData.baugrundstuck.standortbedingteMehrkosten}
                onChange={(value) => handleInputChange('baugrundstuck', 'standortbedingteMehrkosten', value)}
                placeholder="Förderfähige standortbedingte Mehrkosten"
                label="Förderfähige standortbedingte Mehrkosten"
              />
            </div>
          </div>
        </div>
      )}

      {/* Kaufpreis Section */}
      {(isBestandserwerb || isErsterwerb) && (
        <div className="mb-5">
          <div className="d-flex align-items-center gap-2 mb-4">
            <h4 className="mb-0 text-[#000000] font-semibold italic">Kaufpreis</h4>
            <OverlayTrigger
              placement="right"
              overlay={renderTooltip("Kaufpreis bei Bestandserwerb und Ersterwerb")}
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
                value={formData.kaufpreis.kaufpreis}
                onChange={(value) => handleInputChange('kaufpreis', 'kaufpreis', value)}
                placeholder="Kaufpreis (bei Bestandserwerb und Ersterwerb)"
                label="Kaufpreis (bei Bestandserwerb und Ersterwerb)"
              />
            </div>
          </div>
        </div>
      )}

      {/* Baukosten Section */}
      {showBaukosten && (
        <div className="mb-5">
          <div className="d-flex align-items-center gap-2 mb-4">
            <h4 className="mb-0 text-[#000000] font-semibold italic">Baukosten</h4>
            <OverlayTrigger
              placement="right"
              overlay={renderTooltip("Baukosten des Objekts")}
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
                value={formData.baukosten.kostenGebaeude}
                onChange={(value) => handleInputChange('baukosten', 'kostenGebaeude', value)}
                placeholder="Kosten des Gebäudes (bei Neubau)"
                label="Kosten des Gebäudes (bei Neubau)"
              />
            </div>
            <div className="col-12">
              <CurrencyInput
                value={formData.baukosten.besondereBauausfuhrung}
                onChange={(value) => handleInputChange('baukosten', 'besondereBauausfuhrung', value)}
                placeholder="Besonders zu veranschlagende Bauausführung und Bauteile"
                label="Besonders zu veranschlagende Bauausführung und Bauteile"
              />
            </div>
            <div className="col-12">
              <CurrencyInput
                value={formData.baukosten.wertVorhandenerGebaude}
                onChange={(value) => handleInputChange('baukosten', 'wertVorhandenerGebaude', value)}
                placeholder="Wert vorhandener und wiederverwendeter Gebäudeteile"
                label="Wert vorhandener und wiederverwendeter Gebäudeteile"
              />
            </div>
            <div className="col-12">
              <CurrencyInput
                value={formData.baukosten.kostenAussenanlagen}
                onChange={(value) => handleInputChange('baukosten', 'kostenAussenanlagen', value)}
                placeholder="Kosten der Außenanlagen"
                label="Kosten der Außenanlagen"
              />
            </div>
            <div className="col-12">
              <CurrencyInput
                value={formData.baukosten.kostenArchitekt}
                onChange={(value) => handleInputChange('baukosten', 'kostenArchitekt', value)}
                placeholder="Kosten der Architekten- und Ingenieurleistungen"
                label="Kosten der Architekten- und Ingenieurleistungen"
              />
            </div>
          </div>
        </div>
      )}

      {/* Nebenkosten Section */}
      <div className="mb-5">
        <div className="d-flex align-items-center gap-2 mb-4">
          <h4 className="mb-0 text-[#000000] font-semibold italic">Nebenkosten</h4>
          <OverlayTrigger
            placement="right"
            overlay={renderTooltip("Nebenkosten des Objekts")}
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
              value={formData.nebenkosten.erwerbsnebenkosten}
              onChange={(value) => handleInputChange('nebenkosten', 'erwerbsnebenkosten', value)}
              placeholder="Erwerbsnebenkosten"
              label="Erwerbsnebenkosten"
            />
          </div>
          <div className="col-12">
            <CurrencyInput
              value={formData.nebenkosten.verwaltungsleistungen}
              onChange={(value) => handleInputChange('nebenkosten', 'verwaltungsleistungen', value)}
              placeholder="Kosten der Verwaltungsleistungen"
              label="Kosten der Verwaltungsleistungen"
            />
          </div>
          <div className="col-12">
            <CurrencyInput
              value={formData.nebenkosten.beschaffungDauerfinanzierung}
              onChange={(value) => handleInputChange('nebenkosten', 'beschaffungDauerfinanzierung', value)}
              placeholder="Kosten der Beschaffung der Dauerfinanzierungsmittel"
              label="Kosten der Beschaffung der Dauerfinanzierungsmittel"
            />
          </div>
          <div className="col-12">
            <CurrencyInput
              value={formData.nebenkosten.beschaffungZwischenfinanzierung}
              onChange={(value) => handleInputChange('nebenkosten', 'beschaffungZwischenfinanzierung', value)}
              placeholder="Kosten der Beschaffung und Verzinsung der Zwischenfinanzierung"
              label="Kosten der Beschaffung und Verzinsung der Zwischenfinanzierung"
            />
          </div>
          <div className="col-12">
            <CurrencyInput
              value={formData.nebenkosten.sonstigeNebenkosten}
              onChange={(value) => handleInputChange('nebenkosten', 'sonstigeNebenkosten', value)}
              placeholder="Sonstige Nebenkosten"
              label="Sonstige Nebenkosten"
            />
          </div>
          <div className="col-12">
            <CurrencyInput
              value={formData.nebenkosten.zusatzlicheKosten}
              onChange={(value) => handleInputChange('nebenkosten', 'zusatzlicheKosten', value)}
              placeholder="Zusätzliche Kosten (Modernisierung, Instandsetzung, Schönheitsreparaturen)"
              label="Zusätzliche Kosten (Modernisierung, Instandsetzung, Schönheitsreparaturen)"
            />
          </div>
        </div>
      </div>

      {/* Gesamtkosten Section */}
      <div className="mb-5">
        <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
          <h4 className="mb-0 text-[#000000] font-semibold">Gesamtkosten:</h4>
          <h4 className="mb-0 text-[#064497] font-bold">{formatCurrency(totalCost)}</h4>
        </div>
      </div>
    </div>
  );
};

export default Step5_Kostenaufstellung; 