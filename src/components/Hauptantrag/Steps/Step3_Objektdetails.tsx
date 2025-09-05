import React, { useState, useEffect } from 'react';
import { Form, Button, OverlayTrigger, Tooltip, Row, Col, Alert } from 'react-bootstrap';
import CurrencyInput from '../../common/CurrencyInput';
import AddressInput from '../../common/AddressInput';
import AreaInput from '../../common/AreaInput';
import GeneralDatePicker from '../../common/GeneralDatePicker';
import postcodeMap from '../../../utils/postcode_map.json';

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
    bergsenkungsGebiet: boolean | null;
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
  objektart: string;
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

  // Check if postal code is supported
  const isPostalCodeSupported = (postalCode: string): boolean => {
    if (!postalCode) return true; // Don't show warning if no postal code entered
    return postalCode in postcodeMap;
  };

  // Date validation helper function
  const isValidDate = (date: string): boolean => {
    if (!date) return false;
    
    const inputDate = new Date(date);
    const now = new Date();
    const minDate = new Date(now.getFullYear() - 20, now.getMonth(), now.getDate());
    
    return inputDate <= now && inputDate >= minDate;
  };

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
    if (!formData.objektDetailsAllgemein.gesamtWohnflaeche) errors.push('Bitte geben Sie die Wohnfläche der zweiten Wohneinheit ein, bzw. 0, wenn keine zweite Wohneinheit vorhanden ist');
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
      } else {
        // Check if both values are not null and sum is greater than 0
        const wohnungValue = formData.objektDetailsAllgemein.ertraege.vermieteteWohnung || '';
        const garageValue = formData.objektDetailsAllgemein.ertraege.vermieteteGarage || '';
        
        if (wohnungValue || garageValue) {
          const parseCurrencyValue = (value: string): number => {
            if (!value) return 0;
            return parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
          };
          
          const wohnungAmount = parseCurrencyValue(wohnungValue);
          const garageAmount = parseCurrencyValue(garageValue);
          const totalAmount = wohnungAmount + garageAmount;
          
          if (totalAmount <= 0) {
            errors.push('Die Summe der Ertragswerte muss größer als 0,00 € sein');
          }
        }
      }
    }
    if (formData.objektDetailsAllgemein.hasWoodConstructionLoan === null) {
      errors.push('Bitte geben Sie an, ob Sie ein Zusatzdarlehen für Bauen mit Holz beantragen');
    }

    // Bergsenkungsgebiet validation - only for neubau, ersterwerb, or nutzungsänderung
    if (formData.foerderVariante?.includes('neubau') || formData.foerderVariante?.includes('ersterwerb') || formData.foerderVariante === 'nutzungsaenderung') {
      if (formData.objektDetailsAllgemein.bergsenkungsGebiet === null) {
        errors.push('Bitte geben Sie an, ob sich das Objekt in einem Bergsenkungsgebiet befindet');
      }
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
          if (!formData.objektDetailsNeubauErsterwerb.baugenehmigung.erteilungsDatum) {
            errors.push('Bitte geben Sie das Erteilungsdatum der Baugenehmigung ein');
          } else if (!isValidDate(formData.objektDetailsNeubauErsterwerb.baugenehmigung.erteilungsDatum)) {
            errors.push('Das Erteilungsdatum darf weder in der Zukunft noch mehr als 20 Jahre in der Vergangenheit liegen');
          }
          if (!formData.objektDetailsNeubauErsterwerb.baugenehmigung.aktenzeichen) errors.push('Bitte geben Sie das Aktenzeichen der Baugenehmigung ein');
          if (!formData.objektDetailsNeubauErsterwerb.baugenehmigung.erteilungsBehoerde) errors.push('Bitte geben Sie die erteilende Behörde der Baugenehmigung ein');
        }
      }

      if (formData.objektDetailsNeubauErsterwerb.bauanzeige.wurdeEingereicht === null) {
        errors.push('Bitte geben Sie an, ob eine Bauanzeige eingereicht wurde');
      }

      if (formData.objektDetailsNeubauErsterwerb.bauanzeige.wurdeEingereicht === true) {
        if (!formData.objektDetailsNeubauErsterwerb.bauanzeige.einreichungsDatum) {
          errors.push('Bitte geben Sie das Einreichungsdatum der Bauanzeige ein');
        } else if (!isValidDate(formData.objektDetailsNeubauErsterwerb.bauanzeige.einreichungsDatum)) {
          errors.push('Das Einreichungsdatum darf weder in der Zukunft noch mehr als 20 Jahre in der Vergangenheit liegen');
        }
      }

      if (formData.objektDetailsNeubauErsterwerb.bauarbeiten.wurdeBegonnen === null) {
        errors.push('Bitte geben Sie an, ob die Bauarbeiten begonnen wurden');
      }

      if (formData.objektDetailsNeubauErsterwerb.bauarbeiten.wurdeBegonnen === true) {
        if (!formData.objektDetailsNeubauErsterwerb.bauarbeiten.beginnDatum) {
          errors.push('Bitte geben Sie das Datum des Baubeginns ein');
        } else if (!isValidDate(formData.objektDetailsNeubauErsterwerb.bauarbeiten.beginnDatum)) {
          errors.push('Das Datum des Baubeginns darf weder in der Zukunft noch mehr als 20 Jahre in der Vergangenheit liegen');
        }
      }
    }

    // Bestandserwerb validation
    if (formData.foerderVariante?.includes('bestandserwerb') && !formData.objektDetailsBestandserwerb.baujahr) {
      errors.push('Bitte geben Sie das Baujahr ein');
    }

    // Objektart validation
    if (!formData.objektart) {
      errors.push('Bitte wählen Sie eine Objektart aus');
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

  const getFieldErrorMessage = (fieldName: string): string => {
    if (!showValidation) return '';
    const error = validationErrors.find(error => error.includes(fieldName));
    return error || '';
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
            overlay={renderTooltip("Geben Sie bitte die vollständige Adresse ihres Förderobjekts ein. Ihr Antrag wird automatisch an die zuständige Bewilligungsbehörde gesendet.")}
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
        
        {/* Warning for unsupported postal codes */}
        {formData.address.postalCode && !isPostalCodeSupported(formData.address.postalCode) && (
          <Alert variant="warning" className="mt-3">
            Das Förderobjekt befindet sich in einem Kreis oder einer Stadt die noch nicht von Fördercheck.NRW unterstützt wird, bitte wenden Sie sich an ihre Bewilligungsbehörde
          </Alert>
        )}
      </div>

      {/* Fördervariante Section */}
      <div className="mb-5">
        <div className="d-flex align-items-center gap-2 mb-4">
          <h4 className="mb-0 text-[#000000] font-semibold italic">Informationen zur Förderart</h4>
          <OverlayTrigger
            placement="right"
            overlay={renderTooltip("Bitte wählen Sie die zutreffende Art Ihres Vorhabens aus: Ersterwerb bedeutet, dass das Objekt erstmals zum Verkauf angeboten wird. Bestandserwerb liegt vor, wenn das Objekt bereits im Eigentum war. Neubau bedeutet, dass das Objekt von Ihnen neu errichtet wird. Eine Nutzungsänderung liegt vor, wenn ein bestehendes Gebäude künftig zu Wohnzwecken genutzt wird.")}
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
            { id: 'neubau-wohnung', label: 'Neubau Eigentumswohnung' },
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

      {/* Objektart  Section */}
      {(formData.foerderVariante &&
        formData.foerderVariante !== 'bestandserwerb-wohnung' &&
        formData.foerderVariante !== 'neubau-wohnung' &&
        formData.foerderVariante !== 'ersterwerb-wohnung') && (
        <div className="mb-5">
          <div className="d-flex align-items-center gap-2 mb-4">
            <h4 className="mb-0 text-[#000000] font-semibold italic">Objektart</h4>
            <OverlayTrigger
              placement="right"
              overlay={renderTooltip("Bitte machen Sie Angaben zur Art des Objekts: Handelt es sich um ein Doppelhaus, Reihenhaus, freistehendes Einfamilienhaus oder beispielsweise eine Wohnung (relevant bei einer Nutzungsänderung)")}
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
            {/* Wohnung only for nutzungsaenderung */}
            {formData.foerderVariante === 'nutzungsaenderung' && (
              <Col md={4} key="wohnung">
                <Form.Check
                  type="checkbox"
                  id="objektart-wohnung"
                  label="Wohnung"
                  checked={formData.objektart === 'wohnung'}
                  onChange={() => updateFormData({
                    ...formData,
                    objektart: formData.objektart === 'wohnung' ? '' : 'wohnung'
                  })}
                  className="custom-checkbox"
                  disabled={readOnly}
                />
              </Col>
            )}
            {/* Doppelhaus/Reihenhaus and Freistehend for certain foerderVariante */}
            {(formData.foerderVariante === 'nutzungsaenderung' ||
              formData.foerderVariante === 'ersterwerb-eigenheim' ||
              formData.foerderVariante === 'neubau' ||
              formData.foerderVariante === 'bestandserwerb-eigenheim') && (
              <>
                <Col md={4} key="doppelhaus">
                  <Form.Check
                    type="checkbox"
                    id="objektart-doppelhaus"
                    label="Doppel-/Reihenhaus"
                    checked={formData.objektart === 'doppelhaus'}
                    onChange={() => updateFormData({
                      ...formData,
                      objektart: formData.objektart === 'doppelhaus' ? '' : 'doppelhaus'
                    })}
                    className="custom-checkbox"
                    disabled={readOnly}
                  />
                </Col>
                <Col md={4} key="freistehend">
                  <Form.Check
                    type="checkbox"
                    id="objektart-freistehend"
                    label="Einfamilienhaus freistehend"
                    checked={formData.objektart === 'freistehend'}
                    onChange={() => updateFormData({
                      ...formData,
                      objektart: formData.objektart === 'freistehend' ? '' : 'freistehend'
                    })}
                    className="custom-checkbox"
                    disabled={readOnly}
                  />
                </Col>
              </>
            )}
          </Row>
          {showValidation && getFieldError('Objektart') && (
            <div className="text-danger mt-2">
              Bitte wählen Sie eine Objektart aus
            </div>
          )}
        </div>
      )}

      {/* Objektdetails allgemein Section */}
      <div className="mb-5">
        <div className="d-flex align-items-center gap-2 mb-4">
          <h4 className="mb-0 text-[#000000] font-semibold italic">Objektdetails allgemein</h4>
          <OverlayTrigger
            placement="right"
            overlay={renderTooltip("Allgemeine Informationen zum Objekt. Der Wohnfläche der selbstgenutzten Wohneinheit ist die Wohnfläche, die Sie selbst nutzen. Die Wohnfläche der zweiten Wohneinheit ist die Wohnfläche, die Sie vermieten (Geben Sie 0 ein, wenn keine zweite Wohneinheit vorhanden ist).")}
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
            <AreaInput
              value={formData.objektDetailsAllgemein.wohnflaecheSelbstgenutzt}
              onChange={(value) => handleNestedInputChange('objektDetailsAllgemein', '', 'wohnflaecheSelbstgenutzt', value)}
              placeholder="Wohnfläche selbstgenutzte Wohneinheit"
              label="Wohnfläche selbstgenutzte Wohneinheit (m²)"
              isInvalid={getFieldError('selbstgenutzte Wohnfläche')}
              errorMessage="Bitte geben Sie die selbstgenutzte Wohnfläche ein"
              disabled={readOnly}
            />
          </div>
          <div className="col-md-6">
            <AreaInput
              value={formData.objektDetailsAllgemein.gesamtWohnflaeche}
              onChange={(value) => handleNestedInputChange('objektDetailsAllgemein', '', 'gesamtWohnflaeche', value)}
              placeholder="Wohnfläche zweite Wohneinheit im Objekt"
              label="Wohnfläche zweite Wohneinheit im Objekt (m²)"
              isInvalid={getFieldError('zweiten Wohneinheit')}
              errorMessage="Bitte geben Sie die Wohnfläche der zweiten Wohneinheit ein, bzw. 0, wenn keine zweite Wohneinheit vorhanden ist"
              disabled={readOnly}
            />
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
                overlay={renderTooltip("Geben Sie an, ob das Objekt eine Gewerbefläche, wie z.B. ein Geschäft, enthält")}
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
                <AreaInput
                  value={formData.objektDetailsAllgemein.gewerbeflaeche.flaeche}
                  onChange={(value) => handleNestedInputChange('objektDetailsAllgemein', 'gewerbeflaeche', 'flaeche', value)}
                  placeholder="Größe der Gewerbefläche"
                  label="Größe der Gewerbefläche (m²)"
                  isInvalid={getFieldError('Größe der Gewerbefläche')}
                  errorMessage="Bitte geben Sie die Größe der Gewerbefläche ein"
                  disabled={readOnly}
                />
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
                overlay={renderTooltip("Geben Sie an, ob durch das Förderobjekt Erträge erwirtschaftet werden (z.B. Vermietung von Wohnungen oder Garagen).")}
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
                    {getFieldErrorMessage('Ertragswert')}
                  </div>
                )}
            </div>
          )}

          <div className="d-flex align-items-center mb-3 mt-4">
            <div className="d-flex align-items-center gap-2">
              <Form.Label className="mb-0">Wird ein Zusatzdarlehen für Bauen mit Holz beantragt?</Form.Label>
              <OverlayTrigger
                placement="right"
                overlay={renderTooltip("Geben Sie an, ob ein Zusatzdarlehen für Bauen mit Holz beantragt wird. Bitte informieren Sie sich über die Voraussetzungen für ein Zusatzdarlehen für Bauen mit Holz (Mehr Infos im Schritt 6 des Hauptantrags).") }
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

          {/* Bergsenkungsgebiet question - only for neubau, ersterwerb, or nutzungsänderung */}
          {(formData.foerderVariante?.includes('neubau') || 
            formData.foerderVariante?.includes('ersterwerb') || 
            formData.foerderVariante === 'nutzungsaenderung') && (
            <>
              <div className="d-flex align-items-center mb-3 mt-4">
                <div className="d-flex align-items-center gap-2">
                  <Form.Label className="mb-0">Befindet sich das Objekt in einem Bergsenkungsgebiet?</Form.Label>
                  <OverlayTrigger
                    placement="right"
                    overlay={renderTooltip("Geben Sie an, ob sich das Objekt in einem Bergsenkungsgebiet befindet. In Bergsenkungsgebieten ist eine Erklärung der Bergbaugesellschaft über die Notwendigkeit von baulichen Anpassungs- und Sicherungsmaßnahmen und gegebenenfalls die Kostenübernahme erforderlich.")}
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
                    name="bergsenkungsGebiet"
                    checked={formData.objektDetailsAllgemein.bergsenkungsGebiet === true}
                    onChange={() => handleRadioChange('objektDetailsAllgemein', 'bergsenkungsGebiet', true)}
                    className="custom-radio"
                    disabled={readOnly}
                  />
                  <Form.Check
                    inline
                    type="radio"
                    label="Nein"
                    name="bergsenkungsGebiet"
                    checked={formData.objektDetailsAllgemein.bergsenkungsGebiet === false}
                    onChange={() => handleRadioChange('objektDetailsAllgemein', 'bergsenkungsGebiet', false)}
                    className="custom-radio"
                    disabled={readOnly}
                  />
                </div>
              </div>
              {showValidation && getFieldError('Bergsenkungsgebiet') && (
                <div className="text-danger mt-1">
                  Bitte geben Sie an, ob sich das Objekt in einem Bergsenkungsgebiet befindet
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Objektdetails Neubau/Ersterwerb */}
      {(formData.foerderVariante.includes('neubau') || 
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
                overlay={renderTooltip("Geben Sie an, ob das Objekt barrierefrei ist. Bei der Neuschaffung oder beim Ersterwerb barrierefreier Objekte (bis einschließlich Gebäudeklasse 2) kann ein Zusatzdarlehen in Höhe von 11 500 Euro gewährt werden. Bitte informieren Sie sich über die Voraussetzungen die ein Objekt erfüllen muss um als barrierefrei zu gelten.")}
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
                overlay={renderTooltip("Geben Sie an, ob das Objekt dem BEG Effizienzhaus 40 Standard entspricht. Der \"BEG Effizienzhaus 40 Standard\" beschreibt die Anforderungen für den staatlich geförderten Neubau oder Ersterwerb eines Gebäudes, das einen Primärenergiebedarf von maximal 40 % eines Referenzgebäudes hat. Bitte informieren Sie sich über die Voraussetzungen die ein Objekt erfüllen muss um als BEG Effizienzhaus 40 Standard zu gelten.")}
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
                overlay={renderTooltip("Ja, wenn ein Zusatzdarlehen für standortbedingte Mehrkosten beantragt wird (z. B. Untersuchungen, Sicherungsmaßnahmen, Beseitigung umweltgefährdender Stoffe, Sanierung kontaminierter Böden/Bausubstanz, Abbrucharbeiten). Nein, wenn keine solchen Maßnahmen finanziert werden sollen.")}
              >
                <Button
                  variant="outline-secondary"
                  className="rounded-circle p-0 d-flex align-items-center justify-content-center"
                  style={{
                    width: '20px',
                    height: '20px',
                    minWidth: '20px',
                    minHeight: '20px',
                    marginRight: '10px',
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
                    <GeneralDatePicker
                      value={formData.objektDetailsNeubauErsterwerb.baugenehmigung.erteilungsDatum}
                      onChange={(date) => handleNestedInputChange('objektDetailsNeubauErsterwerb', 'baugenehmigung', 'erteilungsDatum', date)}
                      disabled={readOnly}
                      isInvalid={getFieldError('Erteilungsdatum')}
                      label="Erteilungsdatum"
                    />
                    {showValidation && getFieldError('Erteilungsdatum') && (
                      <div className="text-danger mt-1">
                        {getFieldErrorMessage('Erteilungsdatum')}
                      </div>
                    )}
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
                overlay={renderTooltip("Geben Sie an, ob eine Bauanzeige eingereicht wurde. Eine Bauanzeige ist ein formelles Dokument, das bei der zuständigen Baubehörde eingereicht wird, um den Bau einer Struktur anzukündigen. Im Gegensatz dazu ist eine Baugenehmigung eine formelle Zustimmung der Baubehörde, die besagt, dass ein geplanter Bau den geltenden Gesetzen und Vorschriften entspricht.")}
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
                <GeneralDatePicker
                  value={formData.objektDetailsNeubauErsterwerb.bauanzeige.einreichungsDatum}
                  onChange={(date) => handleNestedInputChange('objektDetailsNeubauErsterwerb', 'bauanzeige', 'einreichungsDatum', date)}
                  disabled={readOnly}
                  isInvalid={getFieldError('Einreichungsdatum')}
                  label="Einreichungsdatum"
                />
                {showValidation && getFieldError('Einreichungsdatum') && (
                  <div className="text-danger mt-1">
                    {getFieldErrorMessage('Einreichungsdatum')}
                  </div>
                )}
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
                <GeneralDatePicker
                  value={formData.objektDetailsNeubauErsterwerb.bauarbeiten.beginnDatum}
                  onChange={(date) => handleNestedInputChange('objektDetailsNeubauErsterwerb', 'bauarbeiten', 'beginnDatum', date)}
                  disabled={readOnly}
                  isInvalid={getFieldError('Datum des Baubeginns')}
                  label="Datum Baubeginn"
                />
                {showValidation && getFieldError('Datum des Baubeginns') && (
                  <div className="text-danger mt-1">
                    {getFieldErrorMessage('Datum des Baubeginns')}
                  </div>
                )}
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