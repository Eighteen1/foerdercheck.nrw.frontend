import React, { useState, useEffect } from 'react';
import { Form, Button, OverlayTrigger, Tooltip, Row, Col } from 'react-bootstrap';
import CurrencyInput from '../../common/CurrencyInput';
import AddressInput from '../../common/AddressInput';

interface Step3Data {
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
}

interface Step3Props {
  formData: Step3Data;
  updateFormData: (data: Step3Data) => void;
  showValidation?: boolean;
  readOnly?: boolean;
}

const Step3_Objektdetails: React.FC<Step3Props> = ({ formData, updateFormData, showValidation = false, readOnly = false }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const validateStep3 = () => {
    const errors: string[] = [];
    
    // Address validation
    if (!formData.address.street) errors.push('Bitte geben Sie die Straße ein');
    if (!formData.address.houseNumber) errors.push('Bitte geben Sie die Hausnummer ein');
    if (!formData.address.postalCode) errors.push('Bitte geben Sie die Postleitzahl ein');
    else {
      const postalCode = formData.address.postalCode;
      const validStartNumbers = ['32', '33', '34', '37', '40', '41', '42', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '57', '58', '59'];
      
      if (!/^\d{5}$/.test(postalCode)) {
        errors.push('Die Postleitzahl muss aus genau 5 Ziffern bestehen');
      } else if (!validStartNumbers.includes(postalCode.substring(0, 2))) {
        errors.push('Die Postleitzahl muss sich in Nordrhein-Westfalen befinden');
      }
    }
    if (!formData.address.city) errors.push('Bitte geben Sie die Stadt ein');

    // FoerderVariante validation
    if (!formData.foerderVariante) {
      errors.push('Bitte wählen Sie eine Förderungsvariante aus');
    }

    // ObjektDetailsAllgemein validation
    if (!formData.objektDetailsAllgemein.wohnflaecheSelbstgenutzt) errors.push('Bitte geben Sie die selbstgenutzte Wohnfläche ein');
    if (!formData.objektDetailsAllgemein.gesamtWohnflaeche) errors.push('Bitte geben Sie die Gesamtwohnfläche ein');
    if (!formData.objektDetailsAllgemein.anzahlZimmer) errors.push('Bitte geben Sie die Anzahl der Zimmer ein');
    if (!formData.objektDetailsAllgemein.anzahlGaragen) errors.push('Bitte geben Sie die Anzahl der Garagen ein');

    // Gewerbefläche validation
    if (formData.objektDetailsAllgemein.gewerbeflaeche.hasGewerbeflaeche === null) {
      errors.push('Bitte geben Sie an, ob eine Gewerbefläche vorhanden ist');
    }
    if (formData.objektDetailsAllgemein.gewerbeflaeche.hasGewerbeflaeche === true && !formData.objektDetailsAllgemein.gewerbeflaeche.flaeche) {
      errors.push('Bitte geben Sie die Größe der Gewerbefläche ein');
    }

    // Erträge validation
    if (formData.objektDetailsAllgemein.ertraege.hasErtraege === null) {
      errors.push('Bitte geben Sie an, ob Erträge vorhanden sind');
    }
    if (formData.objektDetailsAllgemein.ertraege.hasErtraege === true) {
      if (!formData.objektDetailsAllgemein.ertraege.vermieteteWohnung && !formData.objektDetailsAllgemein.ertraege.vermieteteGarage) {
        errors.push('Bitte geben Sie mindestens einen Ertragswert ein (vermietete Wohnung oder Garage)');
      }
    }
    if (formData.objektDetailsAllgemein.hasWoodConstructionLoan === null) {
      errors.push('Bitte geben Sie an, ob Sie ein Zusatzdarlehen für Bauen mit Holz beantragen');
    }

    // Eigentumswohnung validation
    if (formData.foerderVariante?.includes('wohnung')) {
      if (!formData.objektDetailsEigentumswohnung.anzahlVollgeschosse) errors.push('Bitte geben Sie die Anzahl der Vollgeschosse ein');
      if (!formData.objektDetailsEigentumswohnung.wohnungenAmHauseingang) errors.push('Bitte geben Sie die Anzahl der Wohnungen am Hauseingang ein');
      if (!formData.objektDetailsEigentumswohnung.lageImGebaeude) errors.push('Bitte geben Sie die Lage im Gebäude ein');
      if (!formData.objektDetailsEigentumswohnung.lageImGeschoss) errors.push('Bitte geben Sie die Lage im Geschoss ein');
    }

    // Neubau/Ersterwerb validation
    if (formData.foerderVariante?.includes('neubau') || formData.foerderVariante?.includes('ersterwerb')) {
      if (formData.objektDetailsAllgemein.barrierefrei === null) {
        errors.push('Bitte geben Sie an, ob das Objekt barrierefrei ist');
      }
      if (formData.objektDetailsAllgemein.begEffizienzhaus40Standard === null) {
        errors.push('Bitte geben Sie an, ob das Objekt dem BEG Effizienzhaus 40 Standard entspricht');
      }
      if (formData.objektDetailsAllgemein.hasLocationCostLoan === null) {
        errors.push('Bitte geben Sie an, ob Sie ein Zusatzdarlehen für standortbedingte Mehrkosten beantragen');
      }
      if (formData.objektDetailsNeubauErsterwerb.baugenehmigungErforderlich === null) {
        errors.push('Bitte geben Sie an, ob eine Baugenehmigung erforderlich ist');
      }

      if (formData.objektDetailsNeubauErsterwerb.baugenehmigungErforderlich === true) {
        if (formData.objektDetailsNeubauErsterwerb.baugenehmigung.wurdeErteilt === null) {
          errors.push('Bitte geben Sie an, ob die Baugenehmigung erteilt wurde');
        }

        if (formData.objektDetailsNeubauErsterwerb.baugenehmigung.wurdeErteilt === true) {
          if (!formData.objektDetailsNeubauErsterwerb.baugenehmigung.erteilungsDatum) errors.push('Bitte geben Sie das Erteilungsdatum der Baugenehmigung ein');
          if (!formData.objektDetailsNeubauErsterwerb.baugenehmigung.aktenzeichen) errors.push('Bitte geben Sie das Aktenzeichen der Baugenehmigung ein');
          if (!formData.objektDetailsNeubauErsterwerb.baugenehmigung.erteilungsBehoerde) errors.push('Bitte geben Sie die erteilende Behörde der Baugenehmigung ein');
        }
      }

      if (formData.objektDetailsNeubauErsterwerb.bauanzeige.wurdeEingereicht === null) {
        errors.push('Bitte geben Sie an, ob eine Bauanzeige eingereicht wurde');
      }

      if (formData.objektDetailsNeubauErsterwerb.bauanzeige.wurdeEingereicht === true && !formData.objektDetailsNeubauErsterwerb.bauanzeige.einreichungsDatum) {
        errors.push('Bitte geben Sie das Einreichungsdatum der Bauanzeige ein');
      }

      if (formData.objektDetailsNeubauErsterwerb.bauarbeiten.wurdeBegonnen === null) {
        errors.push('Bitte geben Sie an, ob die Bauarbeiten begonnen wurden');
      }

      if (formData.objektDetailsNeubauErsterwerb.bauarbeiten.wurdeBegonnen === true && !formData.objektDetailsNeubauErsterwerb.bauarbeiten.beginnDatum) {
        errors.push('Bitte geben Sie das Datum des Baubeginns ein');
      }
    }

    // Bestandserwerb validation
    if (formData.foerderVariante?.includes('bestandserwerb') && !formData.objektDetailsBestandserwerb.baujahr) {
      errors.push('Bitte geben Sie das Baujahr ein');
    }

    return errors;
  };

  useEffect(() => {
    if (showValidation) {
      setValidationErrors(validateStep3());
    } else {
      setValidationErrors([]);
    }
  }, [formData, showValidation]);

  const getFieldError = (fieldName: string): boolean => {
    return showValidation && validationErrors.some(error => error.includes(fieldName));
  };

  const handleInputChange = (section: keyof Step3Data, field: string, value: any) => {
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

  const handleNestedInputChange = (section: keyof Step3Data, nestedField: string, field: string, value: any) => {
    const sectionData = formData[section] as Record<string, any>;
    
    if (nestedField) {
      const nestedData = sectionData[nestedField] as Record<string, any>;
      updateFormData({
        ...formData,
        [section]: {
          ...sectionData,
          [nestedField]: {
            ...nestedData,
            [field]: value
          }
        }
      });
    } else {
      updateFormData({
        ...formData,
        [section]: {
          ...sectionData,
          [field]: value
        }
      });
    }
  };

  const handleRadioChange = (section: keyof Step3Data, field: string, value: boolean) => {
    const sectionData = formData[section] as Record<string, any>;
    updateFormData({
      ...formData,
      [section]: {
        ...sectionData,
        [field]: value
      }
    });
  };

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
        `}
      </style>

      {/* Address Section */}
      <div className="mb-5">
        <div className="d-flex align-items-center gap-2 mb-4">
          <h4 className="mb-0 text-[#000000] font-semibold italic">Adresse des Objekts</h4>
          <OverlayTrigger
            placement="right"
            overlay={renderTooltip("Geben Sie die Adresse des Objekts ein")}
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

        <AddressInput
          value={formData.address}
          onChange={(address) => updateFormData({
            ...formData,
            address
          })}
          isInvalid={{
            street: getFieldError('Straße'),
            houseNumber: getFieldError('Hausnummer'),
            postalCode: getFieldError('Postleitzahl'),
            city: getFieldError('Stadt')
          }}
          errorMessages={{
            street: validationErrors.find(error => error.includes('Straße')) || '',
            houseNumber: validationErrors.find(error => error.includes('Hausnummer')) || '',
            postalCode: validationErrors.find(error => error.includes('Postleitzahl')) || '',
            city: validationErrors.find(error => error.includes('Stadt')) || ''
          }}
          state="NRW"
          disabled={readOnly}
        />
      </div>

      {/* Fördervariante Section */}
      <div className="mb-5">
        <div className="d-flex align-items-center gap-2 mb-4">
          <h4 className="mb-0 text-[#000000] font-semibold italic">Informationen zur Förderart</h4>
          <OverlayTrigger
            placement="right"
            overlay={renderTooltip("Wählen Sie die zutreffende Förderart aus")}
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

        <Row className="g-3">
          {[
            { id: 'neubau', label: 'Neubau Eigenheim' },
            { id: 'ersterwerb-eigenheim', label: 'Ersterwerb Eigenheim' },
            { id: 'bestandserwerb-eigenheim', label: 'Bestandserwerb Eigenheim' },
            { id: 'bestandserwerb-wohnung', label: 'Bestandserwerb Eigentumswohnung' },
            { id: 'ersterwerb-wohnung', label: 'Ersterwerb Eigentumswohnung' },
            { id: 'nutzungsaenderung', label: 'Nutzungsänderung' }
          ].map((option) => (
            <Col md={4} key={option.id}>
              <Form.Check
                type="checkbox"
                id={option.id}
                label={option.label}
                checked={formData.foerderVariante === option.id}
                onChange={() => updateFormData({
                  ...formData,
                  foerderVariante: option.id
                })}
                className="custom-checkbox"
                disabled={readOnly}
              />
            </Col>
          ))}
        </Row>
        {showValidation && getFieldError('Förderungsvariante') && (
          <div className="text-danger mt-2">
            Bitte wählen Sie eine Förderungsvariante aus
          </div>
        )}
      </div>

      {/* Objektdetails allgemein Section */}
      <div className="mb-5">
        <div className="d-flex align-items-center gap-2 mb-4">
          <h4 className="mb-0 text-[#000000] font-semibold italic">Objektdetails allgemein</h4>
          <OverlayTrigger
            placement="right"
            overlay={renderTooltip("Allgemeine Informationen zum Objekt")}
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
          <div className="col-md-6">
            <Form.Floating>
              <Form.Control
                type="number"
                placeholder="Wohnfläche selbstgenutzte Wohneinheit"
                value={formData.objektDetailsAllgemein.wohnflaecheSelbstgenutzt}
                onChange={(e) => handleNestedInputChange('objektDetailsAllgemein', '', 'wohnflaecheSelbstgenutzt', e.target.value)}
                isInvalid={getFieldError('selbstgenutzte Wohnfläche')}
                disabled={readOnly}
              />
              <label>Wohnfläche selbstgenutzte Wohneinheit (m²)</label>
              <Form.Control.Feedback type="invalid">
                Bitte geben Sie die selbstgenutzte Wohnfläche ein
              </Form.Control.Feedback>
            </Form.Floating>
          </div>
          <div className="col-md-6">
            <Form.Floating>
              <Form.Control
                type="number"
                placeholder="Gesamtwohnfläche bei zwei Wohnungen im Objekt"
                value={formData.objektDetailsAllgemein.gesamtWohnflaeche}
                onChange={(e) => handleNestedInputChange('objektDetailsAllgemein', '', 'gesamtWohnflaeche', e.target.value)}
                isInvalid={getFieldError('Gesamtwohnfläche')}
                disabled={readOnly}
              />
              <label>Gesamtwohnfläche bei zwei Wohnungen im Objekt (m²)</label>
              <Form.Control.Feedback type="invalid">
                Bitte geben Sie die Gesamtwohnfläche ein
              </Form.Control.Feedback>
            </Form.Floating>
          </div>
        </div>

        <div className="row g-3 mt-1">
          <div className="col-md-6">
            <Form.Floating>
              <Form.Control
                type="number"
                placeholder="Anzahl Zimmer der selbstgenutzten Wohneinheit"
                value={formData.objektDetailsAllgemein.anzahlZimmer}
                onChange={(e) => handleNestedInputChange('objektDetailsAllgemein', '', 'anzahlZimmer', e.target.value)}
                isInvalid={getFieldError('Anzahl der Zimmer')}
                disabled={readOnly}
              />
              <label>Anzahl Zimmer der selbstgenutzten Wohneinheit</label>
              <Form.Control.Feedback type="invalid">
                Bitte geben Sie die Anzahl der Zimmer ein
              </Form.Control.Feedback>
            </Form.Floating>
          </div>
          <div className="col-md-6">
            <Form.Floating>
              <Form.Control
                type="number"
                placeholder="Anzahl Garagen/Einstellplätze"
                value={formData.objektDetailsAllgemein.anzahlGaragen}
                onChange={(e) => handleNestedInputChange('objektDetailsAllgemein', '', 'anzahlGaragen', e.target.value)}
                isInvalid={getFieldError('Anzahl der Garagen')}
                disabled={readOnly}
              />
              <label>Anzahl Garagen/Einstellplätze</label>
              <Form.Control.Feedback type="invalid">
                Bitte geben Sie die Anzahl der Garagen ein
              </Form.Control.Feedback>
            </Form.Floating>
          </div>
        </div>

        {/* Gewerbefläche */}
        <div className="mt-4">
          <div className="d-flex align-items-center mb-3">
            <div className="d-flex align-items-center gap-2">
              <Form.Label className="mb-0">Enthält das Objekt eine Gewerbefläche?</Form.Label>
              <OverlayTrigger
                placement="right"
                overlay={renderTooltip("Geben Sie an, ob das Objekt eine Gewerbefläche enthält")}
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
            <div className="d-flex gap-3 ms-auto">
              <Form.Check
                inline
                type="radio"
                label="Ja"
                name="hasGewerbeflaeche"
                checked={formData.objektDetailsAllgemein.gewerbeflaeche.hasGewerbeflaeche === true}
                onChange={() => handleNestedInputChange('objektDetailsAllgemein', 'gewerbeflaeche', 'hasGewerbeflaeche', true)}
                className="custom-radio"
                disabled={readOnly}
              />
              <Form.Check
                inline
                type="radio"
                label="Nein"
                name="hasGewerbeflaeche"
                checked={formData.objektDetailsAllgemein.gewerbeflaeche.hasGewerbeflaeche === false}
                onChange={() => handleNestedInputChange('objektDetailsAllgemein', 'gewerbeflaeche', 'hasGewerbeflaeche', false)}
                className="custom-radio"
                disabled={readOnly}
              />
            </div>
          </div>
          {showValidation && getFieldError('Gewerbefläche vorhanden') && (
            <div className="text-danger mt-1">
              Bitte geben Sie an, ob eine Gewerbefläche vorhanden ist
            </div>
          )}

          {formData.objektDetailsAllgemein.gewerbeflaeche.hasGewerbeflaeche && (
            <div className="row g-3">
              <div className="col-12">
                <Form.Floating>
                  <Form.Control
                    type="number"
                    placeholder="Größe der Gewerbefläche"
                    value={formData.objektDetailsAllgemein.gewerbeflaeche.flaeche}
                    onChange={(e) => handleNestedInputChange('objektDetailsAllgemein', 'gewerbeflaeche', 'flaeche', e.target.value)}
                    isInvalid={getFieldError('Größe der Gewerbefläche')}
                    disabled={readOnly}
                  />
                  <label>Größe der Gewerbefläche (m²)</label>
                  <Form.Control.Feedback type="invalid">
                    Bitte geben Sie die Größe der Gewerbefläche ein
                  </Form.Control.Feedback>
                </Form.Floating>
              </div>
            </div>
          )}
        </div>

        {/* Erträge and Wood Construction Loan */}
        <div className="mt-4">
          <div className="d-flex align-items-center mb-3">
            <div className="d-flex align-items-center gap-2">
              <Form.Label className="mb-0">Werden durch das Förderobjekt Erträge erwirtschaftet?</Form.Label>
              <OverlayTrigger
                placement="right"
                overlay={renderTooltip("Geben Sie an, ob durch das Förderobjekt Erträge erwirtschaftet werden")}
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
            <div className="d-flex gap-3 ms-auto">
              <Form.Check
                inline
                type="radio"
                label="Ja"
                name="hasErtraege"
                checked={formData.objektDetailsAllgemein.ertraege.hasErtraege === true}
                onChange={() => handleNestedInputChange('objektDetailsAllgemein', 'ertraege', 'hasErtraege', true)}
                className="custom-radio"
                disabled={readOnly}
              />
              <Form.Check
                inline
                type="radio"
                label="Nein"
                name="hasErtraege"
                checked={formData.objektDetailsAllgemein.ertraege.hasErtraege === false}
                onChange={() => handleNestedInputChange('objektDetailsAllgemein', 'ertraege', 'hasErtraege', false)}
                className="custom-radio"
                disabled={readOnly}
              />
            </div>
          </div>
          {showValidation && getFieldError('Erträge vorhanden') && (
            <div className="text-danger mt-1">
              Bitte geben Sie an, ob Erträge vorhanden sind
            </div>
          )}

          {formData.objektDetailsAllgemein.ertraege.hasErtraege && (
            <div className="row g-3">
              <div className="col-md-6">
                <CurrencyInput
                  value={formData.objektDetailsAllgemein.ertraege.vermieteteWohnung}
                  onChange={(value) => handleNestedInputChange('objektDetailsAllgemein', 'ertraege', 'vermieteteWohnung', value)}
                  placeholder="Vermietete zweite Wohnung"
                  label="Vermietete zweite Wohnung (€/Jahr)"
                  isInvalid={getFieldError('Ertragswert')}
                  disabled={readOnly}
                />
              </div>
              <div className="col-md-6">
                <CurrencyInput
                  value={formData.objektDetailsAllgemein.ertraege.vermieteteGarage}
                  onChange={(value) => handleNestedInputChange('objektDetailsAllgemein', 'ertraege', 'vermieteteGarage', value)}
                  placeholder="Vermietete Garage/Stellplatz"
                  label="Vermietete Garage/Stellplatz (€/Jahr)"
                  isInvalid={getFieldError('Ertragswert')}
                  disabled={readOnly}
                />
              </div>
              {showValidation && getFieldError('Ertragswert') && (
                <div className="text-danger mt-1">
                  Bitte geben Sie mindestens einen Ertragswert ein (vermietete Wohnung oder Garage)
                </div>
              )}
            </div>
          )}

          <div className="d-flex align-items-center mb-3 mt-4">
            <div className="d-flex align-items-center gap-2">
              <Form.Label className="mb-0">Wird ein Zusatzdarlehen für Bauen mit Holz beantragt?</Form.Label>
              <OverlayTrigger
                placement="right"
                overlay={renderTooltip("Geben Sie an, ob ein Zusatzdarlehen für Bauen mit Holz beantragt wird")}
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
            <div className="d-flex gap-3 ms-auto">
              <Form.Check
                inline
                type="radio"
                label="Ja"
                name="hasWoodConstructionLoan"
                checked={formData.objektDetailsAllgemein.hasWoodConstructionLoan === true}
                onChange={() => handleRadioChange('objektDetailsAllgemein', 'hasWoodConstructionLoan', true)}
                className="custom-radio"
                disabled={readOnly}
              />
              <Form.Check
                inline
                type="radio"
                label="Nein"
                name="hasWoodConstructionLoan"
                checked={formData.objektDetailsAllgemein.hasWoodConstructionLoan === false}
                onChange={() => handleRadioChange('objektDetailsAllgemein', 'hasWoodConstructionLoan', false)}
                className="custom-radio"
                disabled={readOnly}
              />
            </div>
          </div>
          {showValidation && getFieldError('Zusatzdarlehen für Bauen mit Holz') && (
            <div className="text-danger mt-1">
              Bitte geben Sie an, ob Sie ein Zusatzdarlehen für Bauen mit Holz beantragen
            </div>
          )}
        </div>
      </div>

      {/* Objektdetails Neubau/Ersterwerb */}
      {(formData.foerderVariante === 'neubau' || 
        formData.foerderVariante === 'ersterwerb-eigenheim' ||
        formData.foerderVariante === 'ersterwerb-wohnung') && (
        <div className="mb-5">
          <div className="d-flex align-items-center gap-2 mb-4">
            <h4 className="mb-0 text-[#000000] font-semibold italic">Objektdetails Neubau/Ersterwerb</h4>
          </div>

          <div className="d-flex align-items-center mb-3">
            <div className="d-flex align-items-center gap-2">
              <Form.Label className="mb-0">Das Objekt ist barrierefrei</Form.Label>
              <OverlayTrigger
                placement="right"
                overlay={renderTooltip("Geben Sie an, ob das Objekt barrierefrei ist")}
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
            <div className="d-flex gap-3 ms-auto">
              <Form.Check
                inline
                type="radio"
                label="Ja"
                name="barrierefrei"
                checked={formData.objektDetailsAllgemein.barrierefrei === true}
                onChange={() => handleRadioChange('objektDetailsAllgemein', 'barrierefrei', true)}
                className="custom-radio"
                disabled={readOnly}
              />
              <Form.Check
                inline
                type="radio"
                label="Nein"
                name="barrierefrei"
                checked={formData.objektDetailsAllgemein.barrierefrei === false}
                onChange={() => handleRadioChange('objektDetailsAllgemein', 'barrierefrei', false)}
                className="custom-radio"
                disabled={readOnly}
              />
            </div>
          </div>
          {showValidation && getFieldError('barrierefrei') && (
            <div className="text-danger mt-1">
              Bitte geben Sie an, ob das Objekt barrierefrei ist
            </div>
          )}

          <div className="d-flex align-items-center mb-3">
            <div className="d-flex align-items-center gap-2">
              <Form.Label className="mb-0">Das Objekt entspricht dem BEG Effizienzhaus 40 Standard</Form.Label>
              <OverlayTrigger
                placement="right"
                overlay={renderTooltip("Geben Sie an, ob das Objekt dem BEG Effizienzhaus 40 Standard entspricht")}
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
            <div className="d-flex gap-3 ms-auto">
              <Form.Check
                inline
                type="radio"
                label="Ja"
                name="begEffizienzhaus40Standard"
                checked={formData.objektDetailsAllgemein.begEffizienzhaus40Standard === true}
                onChange={() => handleRadioChange('objektDetailsAllgemein', 'begEffizienzhaus40Standard', true)}
                className="custom-radio"
                disabled={readOnly}
              />
              <Form.Check
                inline
                type="radio"
                label="Nein"
                name="begEffizienzhaus40Standard"
                checked={formData.objektDetailsAllgemein.begEffizienzhaus40Standard === false}
                onChange={() => handleRadioChange('objektDetailsAllgemein', 'begEffizienzhaus40Standard', false)}
                className="custom-radio"
                disabled={readOnly}
              />
            </div>
          </div>
          {showValidation && getFieldError('BEG Effizienzhaus 40 Standard') && (
            <div className="text-danger mt-1">
              Bitte geben Sie an, ob das Objekt dem BEG Effizienzhaus 40 Standard entspricht
            </div>
          )}

          <div className="d-flex align-items-center mb-3">
            <div className="d-flex align-items-center gap-2">
              <Form.Label className="mb-0">Wird ein Zusatzdarlehen für standortbedingte Mehrkosten beantragt?</Form.Label>
              <OverlayTrigger
                placement="right"
                overlay={renderTooltip("Geben Sie an, ob ein Zusatzdarlehen für standortbedingte Mehrkosten beantragt wird")}
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
            <div className="d-flex gap-3 ms-auto">
              <Form.Check
                inline
                type="radio"
                label="Ja"
                name="hasLocationCostLoan"
                checked={formData.objektDetailsAllgemein.hasLocationCostLoan === true}
                onChange={() => handleRadioChange('objektDetailsAllgemein', 'hasLocationCostLoan', true)}
                className="custom-radio"
                disabled={readOnly}
              />
              <Form.Check
                inline
                type="radio"
                label="Nein"
                name="hasLocationCostLoan"
                checked={formData.objektDetailsAllgemein.hasLocationCostLoan === false}
                onChange={() => handleRadioChange('objektDetailsAllgemein', 'hasLocationCostLoan', false)}
                className="custom-radio"
                disabled={readOnly}
              />
            </div>
          </div>
          {showValidation && getFieldError('standortbedingte Mehrkosten') && (
            <div className="text-danger mt-1">
              Bitte geben Sie an, ob Sie ein Zusatzdarlehen für standortbedingte Mehrkosten beantragen
            </div>
          )}

          <div className="d-flex align-items-center mb-3">
            <div className="d-flex align-items-center gap-2">
              <Form.Label className="mb-0">Ist eine Baugenehmigung erforderlich?</Form.Label>
              <OverlayTrigger
                placement="right"
                overlay={renderTooltip("Geben Sie an, ob eine Baugenehmigung erforderlich ist")}
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
            <div className="d-flex gap-3 ms-auto">
              <Form.Check
                inline
                type="radio"
                label="Ja"
                name="baugenehmigungErforderlich"
                checked={formData.objektDetailsNeubauErsterwerb.baugenehmigungErforderlich === true}
                onChange={() => handleRadioChange('objektDetailsNeubauErsterwerb', 'baugenehmigungErforderlich', true)}
                className="custom-radio"
                disabled={readOnly}
              />
              <Form.Check
                inline
                type="radio"
                label="Nein"
                name="baugenehmigungErforderlich"
                checked={formData.objektDetailsNeubauErsterwerb.baugenehmigungErforderlich === false}
                onChange={() => handleRadioChange('objektDetailsNeubauErsterwerb', 'baugenehmigungErforderlich', false)}
                className="custom-radio"
                disabled={readOnly}
              />
            </div>
          </div>
          {showValidation && getFieldError('Baugenehmigung erforderlich') && (
            <div className="text-danger mt-1">
              Bitte geben Sie an, ob eine Baugenehmigung erforderlich ist
            </div>
          )}

          {formData.objektDetailsNeubauErsterwerb.baugenehmigungErforderlich && (
            <>
              <div className="mt-3 ms-4">
                <Form.Check
                  type="radio"
                  label="wurde beantragt"
                  name="baugenehmigungStatus"
                  checked={formData.objektDetailsNeubauErsterwerb.baugenehmigung.wurdeErteilt === false}
                  onChange={() => handleNestedInputChange('objektDetailsNeubauErsterwerb', 'baugenehmigung', 'wurdeErteilt', false)}
                  className="custom-radio mb-2"
                  disabled={readOnly}
                />
                <Form.Check
                  type="radio"
                  label="wurde erteilt am"
                  name="baugenehmigungStatus"
                  checked={formData.objektDetailsNeubauErsterwerb.baugenehmigung.wurdeErteilt === true}
                  onChange={() => handleNestedInputChange('objektDetailsNeubauErsterwerb', 'baugenehmigung', 'wurdeErteilt', true)}
                  className="custom-radio"
                  disabled={readOnly}
                />
                {showValidation && getFieldError('Baugenehmigung erteilt') && (
                  <div className="text-danger mt-1">
                    Bitte geben Sie an, ob die Baugenehmigung erteilt wurde
                  </div>
                )}
              </div>

              {formData.objektDetailsNeubauErsterwerb.baugenehmigung.wurdeErteilt && (
                <div className="row g-3 mt-3">
                  <div className="col-md-4">
                    <Form.Floating>
                      <Form.Control
                        type="date"
                        placeholder="Erteilungsdatum"
                        value={formData.objektDetailsNeubauErsterwerb.baugenehmigung.erteilungsDatum}
                        onChange={(e) => handleNestedInputChange('objektDetailsNeubauErsterwerb', 'baugenehmigung', 'erteilungsDatum', e.target.value)}
                        isInvalid={getFieldError('Erteilungsdatum der Baugenehmigung')}
                        disabled={readOnly}
                      />
                      <label>Erteilungsdatum</label>
                      <Form.Control.Feedback type="invalid">
                        Bitte geben Sie das Erteilungsdatum der Baugenehmigung ein
                      </Form.Control.Feedback>
                    </Form.Floating>
                  </div>
                  <div className="col-md-4">
                    <Form.Floating>
                      <Form.Control
                        type="text"
                        placeholder="Aktenzeichen"
                        value={formData.objektDetailsNeubauErsterwerb.baugenehmigung.aktenzeichen}
                        onChange={(e) => handleNestedInputChange('objektDetailsNeubauErsterwerb', 'baugenehmigung', 'aktenzeichen', e.target.value)}
                        isInvalid={getFieldError('Aktenzeichen der Baugenehmigung')}
                        disabled={readOnly}
                      />
                      <label>Aktenzeichen</label>
                      <Form.Control.Feedback type="invalid">
                        Bitte geben Sie das Aktenzeichen der Baugenehmigung ein
                      </Form.Control.Feedback>
                    </Form.Floating>
                  </div>
                  <div className="col-md-4">
                    <Form.Floating>
                      <Form.Control
                        type="text"
                        placeholder="Erteilende Behörde"
                        value={formData.objektDetailsNeubauErsterwerb.baugenehmigung.erteilungsBehoerde}
                        onChange={(e) => handleNestedInputChange('objektDetailsNeubauErsterwerb', 'baugenehmigung', 'erteilungsBehoerde', e.target.value)}
                        isInvalid={getFieldError('erteilende Behörde der Baugenehmigung')}
                        disabled={readOnly}
                      />
                      <label>Erteilende Behörde</label>
                      <Form.Control.Feedback type="invalid">
                        Bitte geben Sie die erteilende Behörde der Baugenehmigung ein
                      </Form.Control.Feedback>
                    </Form.Floating>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="d-flex align-items-center mb-3 mt-4">
            <div className="d-flex align-items-center gap-2">
              <Form.Label className="mb-0">Wurde eine Bauanzeige eingereicht?</Form.Label>
              <OverlayTrigger
                placement="right"
                overlay={renderTooltip("Geben Sie an, ob eine Bauanzeige eingereicht wurde")}
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
            <div className="d-flex gap-3 ms-auto">
              <Form.Check
                inline
                type="radio"
                label="Ja"
                name="bauanzeigeEingereicht"
                checked={formData.objektDetailsNeubauErsterwerb.bauanzeige.wurdeEingereicht === true}
                onChange={() => handleNestedInputChange('objektDetailsNeubauErsterwerb', 'bauanzeige', 'wurdeEingereicht', true)}
                className="custom-radio"
                disabled={readOnly}
              />
              <Form.Check
                inline
                type="radio"
                label="Nein"
                name="bauanzeigeEingereicht"
                checked={formData.objektDetailsNeubauErsterwerb.bauanzeige.wurdeEingereicht === false}
                onChange={() => handleNestedInputChange('objektDetailsNeubauErsterwerb', 'bauanzeige', 'wurdeEingereicht', false)}
                className="custom-radio"
                disabled={readOnly}
              />
            </div>
          </div>
          {showValidation && getFieldError('Bauanzeige eingereicht') && (
            <div className="text-danger mt-1">
              Bitte geben Sie an, ob eine Bauanzeige eingereicht wurde
            </div>
          )}

          {formData.objektDetailsNeubauErsterwerb.bauanzeige.wurdeEingereicht && (
            <div className="row g-3">
              <div className="col-12">
                <Form.Floating>
                  <Form.Control
                    type="date"
                    placeholder="Einreichungsdatum"
                    value={formData.objektDetailsNeubauErsterwerb.bauanzeige.einreichungsDatum}
                    onChange={(e) => handleNestedInputChange('objektDetailsNeubauErsterwerb', 'bauanzeige', 'einreichungsDatum', e.target.value)}
                    isInvalid={getFieldError('Einreichungsdatum der Bauanzeige')}
                    disabled={readOnly}
                  />
                  <label>Einreichungsdatum</label>
                  <Form.Control.Feedback type="invalid">
                    Bitte geben Sie das Einreichungsdatum der Bauanzeige ein
                  </Form.Control.Feedback>
                </Form.Floating>
              </div>
            </div>
          )}

          <div className="d-flex align-items-center mb-3 mt-4">
            <div className="d-flex align-items-center gap-2">
              <Form.Label className="mb-0">Wurden die Bauarbeiten bereits begonnen?</Form.Label>
              <OverlayTrigger
                placement="right"
                overlay={renderTooltip("Geben Sie an, ob die Bauarbeiten bereits begonnen wurden")}
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
            <div className="d-flex gap-3 ms-auto">
              <Form.Check
                inline
                type="radio"
                label="Ja"
                name="bauarbeitenBegonnen"
                checked={formData.objektDetailsNeubauErsterwerb.bauarbeiten.wurdeBegonnen === true}
                onChange={() => handleNestedInputChange('objektDetailsNeubauErsterwerb', 'bauarbeiten', 'wurdeBegonnen', true)}
                className="custom-radio"
                disabled={readOnly}
              />
              <Form.Check
                inline
                type="radio"
                label="Nein"
                name="bauarbeitenBegonnen"
                checked={formData.objektDetailsNeubauErsterwerb.bauarbeiten.wurdeBegonnen === false}
                onChange={() => handleNestedInputChange('objektDetailsNeubauErsterwerb', 'bauarbeiten', 'wurdeBegonnen', false)}
                className="custom-radio"
                disabled={readOnly}
              />
            </div>
          </div>
          {showValidation && getFieldError('Bauarbeiten begonnen') && (
            <div className="text-danger mt-1">
              Bitte geben Sie an, ob die Bauarbeiten begonnen wurden
            </div>
          )}

          {formData.objektDetailsNeubauErsterwerb.bauarbeiten.wurdeBegonnen && (
            <div className="row g-3">
              <div className="col-12">
                <Form.Floating>
                  <Form.Control
                    type="date"
                    placeholder="Datum Baubeginn"
                    value={formData.objektDetailsNeubauErsterwerb.bauarbeiten.beginnDatum}
                    onChange={(e) => handleNestedInputChange('objektDetailsNeubauErsterwerb', 'bauarbeiten', 'beginnDatum', e.target.value)}
                    isInvalid={getFieldError('Datum des Baubeginns')}
                    disabled={readOnly}
                  />
                  <label>Datum Baubeginn</label>
                  <Form.Control.Feedback type="invalid">
                    Bitte geben Sie das Datum des Baubeginns ein
                  </Form.Control.Feedback>
                </Form.Floating>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Objektdetails Eigentumswohnung */}
      {formData.foerderVariante?.includes('wohnung') && (
        <div className="mb-5">
          <div className="d-flex align-items-center gap-2 mb-4">
            <h4 className="mb-0 text-[#000000] font-semibold italic">Objektdetails Eigentumswohnung</h4>
          </div>

          <div className="row g-3">
            <div className="col-md-6">
              <Form.Floating>
                <Form.Control
                  type="number"
                  placeholder="Anzahl Vollgeschosse"
                  value={formData.objektDetailsEigentumswohnung.anzahlVollgeschosse}
                  onChange={(e) => handleNestedInputChange('objektDetailsEigentumswohnung', '', 'anzahlVollgeschosse', e.target.value)}
                  isInvalid={getFieldError('Anzahl der Vollgeschosse')}
                  disabled={readOnly}
                />
                <label>Anzahl Vollgeschosse</label>
                <Form.Control.Feedback type="invalid">
                  Bitte geben Sie die Anzahl der Vollgeschosse ein
                </Form.Control.Feedback>
              </Form.Floating>
            </div>
            <div className="col-md-6">
              <Form.Floating>
                <Form.Control
                  type="number"
                  placeholder="Wohnungen am Hauseingang"
                  value={formData.objektDetailsEigentumswohnung.wohnungenAmHauseingang}
                  onChange={(e) => handleNestedInputChange('objektDetailsEigentumswohnung', '', 'wohnungenAmHauseingang', e.target.value)}
                  isInvalid={getFieldError('Anzahl der Wohnungen am Hauseingang')}
                  disabled={readOnly}
                />
                <label>Wohnungen am Hauseingang</label>
                <Form.Control.Feedback type="invalid">
                  Bitte geben Sie die Anzahl der Wohnungen am Hauseingang ein
                </Form.Control.Feedback>
              </Form.Floating>
            </div>
          </div>

          <div className="row g-3 mt-1">
            <div className="col-md-6">
              <Form.Floating>
                <Form.Control
                  type="text"
                  placeholder="Lage im Gebäude"
                  value={formData.objektDetailsEigentumswohnung.lageImGebaeude}
                  onChange={(e) => handleNestedInputChange('objektDetailsEigentumswohnung', '', 'lageImGebaeude', e.target.value)}
                  isInvalid={getFieldError('Lage im Gebäude')}
                  disabled={readOnly}
                />
                <label>Lage im Gebäude (z. B. EG, 1. OG)</label>
                <Form.Control.Feedback type="invalid">
                  Bitte geben Sie die Lage im Gebäude ein
                </Form.Control.Feedback>
              </Form.Floating>
            </div>
            <div className="col-md-6">
              <Form.Floating>
                <Form.Control
                  type="text"
                  placeholder="Lage im Geschoss"
                  value={formData.objektDetailsEigentumswohnung.lageImGeschoss}
                  onChange={(e) => handleNestedInputChange('objektDetailsEigentumswohnung', '', 'lageImGeschoss', e.target.value)}
                  isInvalid={getFieldError('Lage im Geschoss')}
                  disabled={readOnly}
                />
                <label>Lage im Geschoss (z. B. links)</label>
                <Form.Control.Feedback type="invalid">
                  Bitte geben Sie die Lage im Geschoss ein
                </Form.Control.Feedback>
              </Form.Floating>
            </div>
          </div>
        </div>
      )}

      {/* Objektdetails Bestandserwerb */}
      {(formData.foerderVariante === 'bestandserwerb-eigenheim' || 
        formData.foerderVariante === 'bestandserwerb-wohnung') && (
        <div className="mb-5">
          <div className="d-flex align-items-center gap-2 mb-4">
            <h4 className="mb-0 text-[#000000] font-semibold italic">Objektdetails Bestandserwerb</h4>
            <OverlayTrigger
              placement="right"
              overlay={renderTooltip("Geben Sie das Baujahr des Förderobjekts ein")}
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
              <Form.Floating>
                <Form.Control
                  type="number"
                  placeholder="Baujahr"
                  value={formData.objektDetailsBestandserwerb.baujahr}
                  onChange={(e) => handleNestedInputChange('objektDetailsBestandserwerb', '', 'baujahr', e.target.value)}
                  isInvalid={getFieldError('Baujahr')}
                  disabled={readOnly}
                />
                <label>Baujahr des Förderobjekts</label>
                <Form.Control.Feedback type="invalid">
                  Bitte geben Sie das Baujahr ein
                </Form.Control.Feedback>
              </Form.Floating>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Step3_Objektdetails; 