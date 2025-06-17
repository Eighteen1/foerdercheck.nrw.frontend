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
    zusaetzlicheKosten: string;
  };
  gesamtkosten: string;
}

interface Step5Props {
  formData: Step5Data;
  updateFormData: (data: Step5Data) => void;
  foerderVariante: string;
  showValidation?: boolean;
  readOnly?: boolean;
}

const Step5_Kostenaufstellung: React.FC<Step5Props> = ({ formData, updateFormData, foerderVariante, showValidation = false, readOnly = false }) => {
  const [totalCost, setTotalCost] = useState('0');
  const [previousFoerderVariante, setPreviousFoerderVariante] = useState(foerderVariante);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string[] }>({});

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
    if (readOnly) return;
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

  // Add validation function
  const validateStep5 = () => {
    const errors: { [key: string]: string[] } = {};
    
    // Baugrundstück validation for Neubau
    if (foerderVariante === 'neubau') {
      const baugrundstuckErrors: string[] = [];
      if (!formData.baugrundstuck.kaufpreis) baugrundstuckErrors.push('Bitte geben Sie den Kaufpreis des Baugrundstücks ein (0,00€ wenn nicht vorhanden)');
      if (!formData.baugrundstuck.wert) baugrundstuckErrors.push('Bitte geben Sie den Wert des Baugrundstücks ein (0,00€ wenn nicht vorhanden)');
      if (!formData.baugrundstuck.erschliessungskosten) baugrundstuckErrors.push('Bitte geben Sie die Erschließungskosten ein (0,00€ wenn nicht vorhanden)');
      if (!formData.baugrundstuck.standortbedingteMehrkosten) baugrundstuckErrors.push('Bitte geben Sie die standortbedingten Mehrkosten ein (0,00€ wenn nicht vorhanden)');
      if (baugrundstuckErrors.length > 0) {
        errors['baugrundstuck'] = baugrundstuckErrors;
      }
    }

    // Kaufpreis validation for Bestandserwerb or Ersterwerb
    if (foerderVariante?.includes('bestandserwerb') || foerderVariante?.includes('ersterwerb')) {
      const kaufpreisErrors: string[] = [];
      if (!formData.kaufpreis.kaufpreis) kaufpreisErrors.push('Bitte geben Sie den Kaufpreis ein (0,00€ wenn nicht vorhanden)');
      if (kaufpreisErrors.length > 0) {
        errors['kaufpreis'] = kaufpreisErrors;
      }
    }

    // Baukosten validation for Neubau or Nutzungsänderung
    if (foerderVariante === 'neubau' || foerderVariante === 'nutzungsaenderung') {
      const baukostenErrors: string[] = [];
      if (foerderVariante === 'neubau' && !formData.baukosten.kostenGebaeude) {
        baukostenErrors.push('Bitte geben Sie die Kosten des Gebäudes ein (0,00€ wenn nicht vorhanden)');
      }
      if (!formData.baukosten.besondereBauausfuhrung) baukostenErrors.push('Bitte geben Sie die besondere Bauausführung ein (0,00€ wenn nicht vorhanden)');
      if (!formData.baukosten.wertVorhandenerGebaude) baukostenErrors.push('Bitte geben Sie den Wert vorhandener Gebäudeteile ein (0,00€ wenn nicht vorhanden)');
      if (!formData.baukosten.kostenAussenanlagen) baukostenErrors.push('Bitte geben Sie die Kosten der Außenanlagen ein (0,00€ wenn nicht vorhanden)');
      if (!formData.baukosten.kostenArchitekt) baukostenErrors.push('Bitte geben Sie die Kosten der Architekten- und Ingenieurleistungen ein (0,00€ wenn nicht vorhanden)');
      if (baukostenErrors.length > 0) {
        errors['baukosten'] = baukostenErrors;
      }
    }

    // Nebenkosten validation (always required)
    const nebenkostenErrors: string[] = [];
    if (!formData.nebenkosten.erwerbsnebenkosten) nebenkostenErrors.push('Bitte geben Sie die Erwerbsnebenkosten ein (0,00€ wenn nicht vorhanden)');
    if (!formData.nebenkosten.verwaltungsleistungen) nebenkostenErrors.push('Bitte geben Sie die Kosten der Verwaltungsleistungen ein (0,00€ wenn nicht vorhanden)');
    if (!formData.nebenkosten.beschaffungDauerfinanzierung) nebenkostenErrors.push('Bitte geben Sie die Kosten der Beschaffung der Dauerfinanzierungsmittel ein (0,00€ wenn nicht vorhanden)');
    if (!formData.nebenkosten.beschaffungZwischenfinanzierung) nebenkostenErrors.push('Bitte geben Sie die Kosten der Beschaffung und Verzinsung der Zwischenfinanzierung ein (0,00€ wenn nicht vorhanden)');
    if (!formData.nebenkosten.sonstigeNebenkosten) nebenkostenErrors.push('Bitte geben Sie die sonstigen Nebenkosten ein (0,00€ wenn nicht vorhanden)');
    if (!formData.nebenkosten.zusaetzlicheKosten) nebenkostenErrors.push('Bitte geben Sie die zusätzlichen Kosten ein (0,00€ wenn nicht vorhanden)');
    if (nebenkostenErrors.length > 0) {
      errors['nebenkosten'] = nebenkostenErrors;
    }

    return errors;
  };

  // Update validation errors when form data changes AND showValidation is true
  useEffect(() => {
    if (showValidation) {
      const newValidationErrors = validateStep5();
      setValidationErrors(newValidationErrors);
    } else {
      setValidationErrors({});
    }
  }, [formData, showValidation, foerderVariante]);

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
                isInvalid={showValidation && validationErrors['baugrundstuck']?.includes('Bitte geben Sie den Kaufpreis des Baugrundstücks ein')}
                disabled={readOnly}
              />
            </div>
            <div className="col-12">
              <CurrencyInput
                value={formData.baugrundstuck.wert}
                onChange={(value) => handleInputChange('baugrundstuck', 'wert', value)}
                placeholder="Wert des Baugrundstücks"
                label="Wert des Baugrundstücks"
                isInvalid={showValidation && validationErrors['baugrundstuck']?.includes('Bitte geben Sie den Wert des Baugrundstücks ein')}
                disabled={readOnly}
              />
            </div>
            <div className="col-12">
              <CurrencyInput
                value={formData.baugrundstuck.erschliessungskosten}
                onChange={(value) => handleInputChange('baugrundstuck', 'erschliessungskosten', value)}
                placeholder="Erschließungskosten"
                label="Erschließungskosten"
                isInvalid={showValidation && validationErrors['baugrundstuck']?.includes('Bitte geben Sie die Erschließungskosten ein')}
                disabled={readOnly}
              />
            </div>
            <div className="col-12">
              <CurrencyInput
                value={formData.baugrundstuck.standortbedingteMehrkosten}
                onChange={(value) => handleInputChange('baugrundstuck', 'standortbedingteMehrkosten', value)}
                placeholder="Förderfähige standortbedingte Mehrkosten"
                label="Förderfähige standortbedingte Mehrkosten"
                isInvalid={showValidation && validationErrors['baugrundstuck']?.includes('Bitte geben Sie die standortbedingten Mehrkosten ein')}
                disabled={readOnly}
              />
            </div>
          </div>
          {showValidation && validationErrors['baugrundstuck'] && (
            <div className="alert alert-danger mt-3" role="alert">
              {validationErrors['baugrundstuck'].map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </div>
          )}
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
                isInvalid={showValidation && validationErrors['kaufpreis']?.includes('Bitte geben Sie den Kaufpreis ein')}
                disabled={readOnly}
              />
            </div>
          </div>
          {showValidation && validationErrors['kaufpreis'] && (
            <div className="alert alert-danger mt-3" role="alert">
              {validationErrors['kaufpreis'].map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </div>
          )}
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
                isInvalid={showValidation && validationErrors['baukosten']?.includes('Bitte geben Sie die Kosten des Gebäudes ein')}
                disabled={readOnly}
              />
            </div>
            <div className="col-12">
              <CurrencyInput
                value={formData.baukosten.besondereBauausfuhrung}
                onChange={(value) => handleInputChange('baukosten', 'besondereBauausfuhrung', value)}
                placeholder="Besonders zu veranschlagende Bauausführung und Bauteile"
                label="Besonders zu veranschlagende Bauausführung und Bauteile"
                isInvalid={showValidation && validationErrors['baukosten']?.includes('Bitte geben Sie die besondere Bauausführung ein')}
                disabled={readOnly}
              />
            </div>
            <div className="col-12">
              <CurrencyInput
                value={formData.baukosten.wertVorhandenerGebaude}
                onChange={(value) => handleInputChange('baukosten', 'wertVorhandenerGebaude', value)}
                placeholder="Wert vorhandener und wiederverwendeter Gebäudeteile"
                label="Wert vorhandener und wiederverwendeter Gebäudeteile"
                isInvalid={showValidation && validationErrors['baukosten']?.includes('Bitte geben Sie den Wert vorhandener Gebäudeteile ein')}
                disabled={readOnly}
              />
            </div>
            <div className="col-12">
              <CurrencyInput
                value={formData.baukosten.kostenAussenanlagen}
                onChange={(value) => handleInputChange('baukosten', 'kostenAussenanlagen', value)}
                placeholder="Kosten der Außenanlagen"
                label="Kosten der Außenanlagen"
                isInvalid={showValidation && validationErrors['baukosten']?.includes('Bitte geben Sie die Kosten der Außenanlagen ein')}
                disabled={readOnly}
              />
            </div>
            <div className="col-12">
              <CurrencyInput
                value={formData.baukosten.kostenArchitekt}
                onChange={(value) => handleInputChange('baukosten', 'kostenArchitekt', value)}
                placeholder="Kosten der Architekten- und Ingenieurleistungen"
                label="Kosten der Architekten- und Ingenieurleistungen"
                isInvalid={showValidation && validationErrors['baukosten']?.includes('Bitte geben Sie die Kosten der Architekten- und Ingenieurleistungen ein')}
                disabled={readOnly}
              />
            </div>
          </div>
          {showValidation && validationErrors['baukosten'] && (
            <div className="alert alert-danger mt-3" role="alert">
              {validationErrors['baukosten'].map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </div>
          )}
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
              isInvalid={showValidation && validationErrors['nebenkosten']?.includes('Bitte geben Sie die Erwerbsnebenkosten ein')}
              disabled={readOnly}
            />
          </div>
          <div className="col-12">
            <CurrencyInput
              value={formData.nebenkosten.verwaltungsleistungen}
              onChange={(value) => handleInputChange('nebenkosten', 'verwaltungsleistungen', value)}
              placeholder="Kosten der Verwaltungsleistungen"
              label="Kosten der Verwaltungsleistungen"
              isInvalid={showValidation && validationErrors['nebenkosten']?.includes('Bitte geben Sie die Kosten der Verwaltungsleistungen ein')}
              disabled={readOnly}
            />
          </div>
          <div className="col-12">
            <CurrencyInput
              value={formData.nebenkosten.beschaffungDauerfinanzierung}
              onChange={(value) => handleInputChange('nebenkosten', 'beschaffungDauerfinanzierung', value)}
              placeholder="Kosten der Beschaffung der Dauerfinanzierungsmittel"
              label="Kosten der Beschaffung der Dauerfinanzierungsmittel"
              isInvalid={showValidation && validationErrors['nebenkosten']?.includes('Bitte geben Sie die Kosten der Beschaffung der Dauerfinanzierungsmittel ein')}
              disabled={readOnly}
            />
          </div>
          <div className="col-12">
            <CurrencyInput
              value={formData.nebenkosten.beschaffungZwischenfinanzierung}
              onChange={(value) => handleInputChange('nebenkosten', 'beschaffungZwischenfinanzierung', value)}
              placeholder="Kosten der Beschaffung und Verzinsung der Zwischenfinanzierung"
              label="Kosten der Beschaffung und Verzinsung der Zwischenfinanzierung"
              isInvalid={showValidation && validationErrors['nebenkosten']?.includes('Bitte geben Sie die Kosten der Beschaffung und Verzinsung der Zwischenfinanzierung ein')}
              disabled={readOnly}
            />
          </div>
          <div className="col-12">
            <CurrencyInput
              value={formData.nebenkosten.sonstigeNebenkosten}
              onChange={(value) => handleInputChange('nebenkosten', 'sonstigeNebenkosten', value)}
              placeholder="Sonstige Nebenkosten"
              label="Sonstige Nebenkosten"
              isInvalid={showValidation && validationErrors['nebenkosten']?.includes('Bitte geben Sie die sonstigen Nebenkosten ein')}
              disabled={readOnly}
            />
          </div>
          <div className="col-12">
            <CurrencyInput
              value={formData.nebenkosten.zusaetzlicheKosten}
              onChange={(value) => handleInputChange('nebenkosten', 'zusaetzlicheKosten', value)}
              placeholder="Zusätzliche Kosten (Modernisierung, Instandsetzung, Schönheitsreparaturen)"
              label="Zusätzliche Kosten (Modernisierung, Instandsetzung, Schönheitsreparaturen)"
              isInvalid={showValidation && validationErrors['nebenkosten']?.includes('Bitte geben Sie die zusätzlichen Kosten ein')}
              disabled={readOnly}
            />
          </div>
        </div>
        {showValidation && validationErrors['nebenkosten'] && (
          <div className="alert alert-danger mt-3" role="alert">
            {validationErrors['nebenkosten'].map((error, index) => (
              <div key={index}>{error}</div>
            ))}
          </div>
        )}
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