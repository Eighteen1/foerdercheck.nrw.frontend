import React, { useState, useEffect } from 'react';
import { Form, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import AreaInput from '../../common/AreaInput';
import GeneralDatePicker from '../../common/GeneralDatePicker';

interface Step4Data {
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
}

interface Step4Props {
  formData: Step4Data;
  updateFormData: (data: Step4Data) => void;
  showValidation?: boolean;
  readOnly?: boolean;
}

const Step4_Eigentumsverhaeltnisse: React.FC<Step4Props> = ({ formData, updateFormData, showValidation = false, readOnly = false }) => {
  // Date validation helper function
  const isValidDate = (date: string): boolean => {
    if (!date) return false;
    
    const inputDate = new Date(date);
    const now = new Date();
    const minDate = new Date(now.getFullYear() - 20, now.getMonth(), now.getDate());
    
    return inputDate <= now && inputDate >= minDate;
  };

  const handleInputChange = (field: keyof Step4Data | string, value: any) => {
    if (readOnly) return;
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      const parentKey = parent as keyof Step4Data;
      const parentValue = formData[parentKey];
      
      if (typeof parentValue === 'object' && parentValue !== null) {
        updateFormData({
          ...formData,
          [parent]: {
            ...parentValue,
            [child]: value
          }
        });
      }
    } else {
      updateFormData({
        ...formData,
        [field]: value
      });
    }
  };

  const getFieldError = (fieldName: string): boolean => {
    return showValidation && validationErrors.some(error => error.includes(fieldName));
  };

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const validateStep4 = () => {
    const errors: string[] = [];
    
    // Eigentumsverhältnisse validation
    if (formData.eigentumsverhaeltnis === null) {
      errors.push('Bitte geben Sie an, ob das Objekt im Eigentum der antragstellenden Person(en) ist');
    }

    if (formData.eigentumsverhaeltnis === false) {
      if (formData.kaufvertrag.wurdeAbgeschlossen === null) {
        errors.push('Bitte geben Sie an, ob der Kaufvertrag abgeschlossen wurde');
      }
      if (formData.kaufvertrag.wurdeAbgeschlossen === true && !formData.kaufvertrag.abschlussDatum) {
        errors.push('Bitte geben Sie das Abschlussdatum des Kaufvertrags ein');
      } else if (formData.kaufvertrag.wurdeAbgeschlossen === true && formData.kaufvertrag.abschlussDatum && !isValidDate(formData.kaufvertrag.abschlussDatum)) {
        errors.push('Das Abschlussdatum des Kaufvertrags darf weder in der Zukunft noch mehr als 20 Jahre in der Vergangenheit liegen');
      }
    }

    // Erbbaurecht validation - only if eigentumsverhaeltnis is true
    if (formData.eigentumsverhaeltnis === true) {
      if (formData.erbbaurecht === null) {
        errors.push('Bitte geben Sie an, ob Erbbaurecht vorhanden ist');
      }
      if (formData.erbbaurecht === true && !formData.restlaufzeitErbbaurecht) {
        errors.push('Bitte geben Sie die Restlaufzeit des Erbbaurechts ein');
      }
    }

    // Grundbuch validation - only if eigentumsverhaeltnis is true
    if (formData.eigentumsverhaeltnis === true) {
      if (!formData.grundbuch.type) {
        errors.push('Bitte wählen Sie einen Grundbuchtyp aus');
      }
      if (!formData.grundbuch.amtsgericht) {
        errors.push('Bitte geben Sie das Amtsgericht ein');
      }
      if (!formData.grundbuch.ortGrundbuch) {
        errors.push('Bitte geben Sie den Ort des Grundbuchs ein');
      }
      if (!formData.grundbuch.gemarkung) {
        errors.push('Bitte geben Sie die Gemarkung ein');
      }
      if (!formData.grundbuch.blatt) {
        errors.push('Bitte geben Sie das Blatt ein');
      }
      if (!formData.grundbuch.flur) {
        errors.push('Bitte geben Sie die Flur ein');
      }
      if (!formData.grundbuch.flurstueck) {
        errors.push('Bitte geben Sie das Flurstück ein');
      }
      if (!formData.grundbuch.grundstuecksgroesse) {
        errors.push('Bitte geben Sie die Grundstücksgröße ein');
      }
    }

    // Baulasten validation
    if (formData.baulasten.vorhanden === null) {
      errors.push('Bitte geben Sie an, ob Baulasten vorhanden sind');
    }
    if (formData.baulasten.vorhanden === true && !formData.baulasten.art) {
      errors.push('Bitte geben Sie die Art der Baulasten ein');
    }

    // Altlasten validation
    if (formData.altlasten.vorhanden === null) {
      errors.push('Bitte geben Sie an, ob Altlasten vorhanden sind');
    }
    if (formData.altlasten.vorhanden === true && !formData.altlasten.art) {
      errors.push('Bitte geben Sie die Art der Altlasten ein');
    }

    return errors;
  };

  useEffect(() => {
    if (showValidation) {
      setValidationErrors(validateStep4());
    } else {
      setValidationErrors([]);
    }
  }, [formData, showValidation]);

  const renderTooltip = (text: string) => (
    <Tooltip id="button-tooltip">
      {text}
    </Tooltip>
  );

  const renderGrundbuchSection = () => {
    const showErbbaurechtOptions = formData.erbbaurecht === true;
    const showNormalOptions = formData.eigentumsverhaeltnis === false || formData.erbbaurecht === false;
    const sectionTitle = formData.eigentumsverhaeltnis === false ? "Grundbuchangaben (falls vorhanden)" : "Grundbuchangaben";

    return (
      <div className="mb-5">
        <div className="d-flex align-items-center gap-2 mb-4">
          <h4 className="mb-0 text-[#000000] font-semibold italic">{sectionTitle}</h4>
          <OverlayTrigger
            placement="right"
            overlay={renderTooltip("Geben Sie die Grundbuchdaten des Objekts an. Die Grundbuchangaben sind in der Regel nur notwendig, wenn das Objekt im Eigentum der antragstellenden Person(en) ist.") }
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

        {showNormalOptions && (
          <>
            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <Form.Check
                  type="checkbox"
                  id="grundbuch"
                  label="Grundbuch"
                  checked={formData.grundbuch.type === 'grundbuch'}
                  onChange={() => handleInputChange('grundbuch.type', 'grundbuch')}
                  disabled={readOnly}
                />
              </div>
              <div className="col-md-4">
                <Form.Check
                  type="checkbox"
                  id="wohnungsgrundbuch"
                  label="Wohnungsgrundbuch"
                  checked={formData.grundbuch.type === 'wohnungsgrundbuch'}
                  onChange={() => handleInputChange('grundbuch.type', 'wohnungsgrundbuch')}
                  disabled={readOnly}
                />
              </div>
              <div className="col-md-4">
                <Form.Check
                  type="checkbox"
                  id="teileigentumsgrundbuch"
                  label="Teileigentumsgrundbuch"
                  checked={formData.grundbuch.type === 'teileigentumsgrundbuch'}
                  onChange={() => handleInputChange('grundbuch.type', 'teileigentumsgrundbuch')}
                  disabled={readOnly}
                />
              </div>
            </div>
          </>
        )}

        {showErbbaurechtOptions && (
          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <Form.Check
                type="checkbox"
                id="erbbaugrundbuch"
                label="Erbbaugrundbuch"
                checked={formData.grundbuch.type === 'erbbaugrundbuch'}
                onChange={() => handleInputChange('grundbuch.type', 'erbbaugrundbuch')}
                disabled={readOnly}
              />
            </div>
            <div className="col-md-4">
              <Form.Check
                type="checkbox"
                id="wohnungserbbaugrundbuch"
                label="Wohnungserbbaugrundbuch"
                checked={formData.grundbuch.type === 'wohnungserbbaugrundbuch'}
                onChange={() => handleInputChange('grundbuch.type', 'wohnungserbbaugrundbuch')}
                disabled={readOnly}
              />
            </div>
            <div className="col-md-4">
              <Form.Check
                type="checkbox"
                id="teileigentumserbbaugrundbuch"
                label="Teileigentumserbbaugrundbuch"
                checked={formData.grundbuch.type === 'teileigentumserbbaugrundbuch'}
                onChange={() => handleInputChange('grundbuch.type', 'teileigentumserbbaugrundbuch')}
                disabled={readOnly}
              />
            </div>
          </div>
        )}

        {showValidation && getFieldError('Grundbuchtyp') && (
          <div className="text-danger mt-1">
            Bitte wählen Sie einen Grundbuchtyp aus
          </div>
        )}

        <div className="row g-3">
          <div className="col-md-6">
            <Form.Floating>
              <Form.Control
                type="text"
                placeholder="Amtsgericht"
                value={formData.grundbuch.amtsgericht}
                onChange={(e) => handleInputChange('grundbuch.amtsgericht', e.target.value)}
                isInvalid={getFieldError('Amtsgericht')}
                disabled={readOnly}
              />
              <label>Amtsgericht</label>
              <Form.Control.Feedback type="invalid">
                Bitte geben Sie das Amtsgericht ein
              </Form.Control.Feedback>
            </Form.Floating>
          </div>
          <div className="col-md-6">
            <Form.Floating>
              <Form.Control
                type="text"
                placeholder="Ort Grundbuch"
                value={formData.grundbuch.ortGrundbuch}
                onChange={(e) => handleInputChange('grundbuch.ortGrundbuch', e.target.value)}
                isInvalid={getFieldError('Ort des Grundbuchs')}
                disabled={readOnly}
              />
              <label>Ort Grundbuch</label>
              <Form.Control.Feedback type="invalid">
                Bitte geben Sie den Ort des Grundbuchs ein
              </Form.Control.Feedback>
            </Form.Floating>
          </div>
        </div>

        <div className="row g-3 mt-1">
          <div className="col-md-6">
            <Form.Floating>
              <Form.Control
                type="text"
                placeholder="Gemarkung"
                value={formData.grundbuch.gemarkung}
                onChange={(e) => handleInputChange('grundbuch.gemarkung', e.target.value)}
                isInvalid={getFieldError('Gemarkung')}
                disabled={readOnly}
              />
              <label>Gemarkung</label>
              <Form.Control.Feedback type="invalid">
                Bitte geben Sie die Gemarkung ein
              </Form.Control.Feedback>
            </Form.Floating>
          </div>
          <div className="col-md-6">
            <Form.Floating>
              <Form.Control
                type="text"
                placeholder="Blatt"
                value={formData.grundbuch.blatt}
                onChange={(e) => handleInputChange('grundbuch.blatt', e.target.value)}
                isInvalid={getFieldError('Blatt')}
                disabled={readOnly}
              />
              <label>Blatt</label>
              <Form.Control.Feedback type="invalid">
                Bitte geben Sie das Blatt ein
              </Form.Control.Feedback>
            </Form.Floating>
          </div>
        </div>

        <div className="row g-3 mt-1">
          <div className="col-md-6">
            <Form.Floating>
              <Form.Control
                type="text"
                placeholder="Flur"
                value={formData.grundbuch.flur}
                onChange={(e) => handleInputChange('grundbuch.flur', e.target.value)}
                isInvalid={getFieldError('Flur')}
                disabled={readOnly}
              />
              <label>Flur</label>
              <Form.Control.Feedback type="invalid">
                Bitte geben Sie die Flur ein
              </Form.Control.Feedback>
            </Form.Floating>
          </div>
          <div className="col-md-6">
            <Form.Floating>
              <Form.Control
                type="text"
                placeholder="Flurstück(e)"
                value={formData.grundbuch.flurstueck}
                onChange={(e) => handleInputChange('grundbuch.flurstueck', e.target.value)}
                isInvalid={getFieldError('Flurstück')}
                disabled={readOnly}
              />
              <label>Flurstück(e)</label>
              <Form.Control.Feedback type="invalid">
                Bitte geben Sie das Flurstück ein
              </Form.Control.Feedback>
            </Form.Floating>
          </div>
        </div>

        <div className="row g-3 mt-1">
          <div className="col-md-6">
            <Form.Floating>
              <Form.Control
                type="text"
                placeholder="Flurstück(e) neu"
                value={formData.grundbuch.flurstueckNeu}
                onChange={(e) => handleInputChange('grundbuch.flurstueckNeu', e.target.value)}
                disabled={readOnly}
              />
              <label>Flurstück(e) neu</label>
            </Form.Floating>
          </div>
          <div className="col-md-6">
            <AreaInput
              value={formData.grundbuch.grundstuecksgroesse}
              onChange={(value) => handleInputChange('grundbuch.grundstuecksgroesse', value)}
              placeholder="Grundstücksgröße"
              label="Grundstücksgröße (m²)"
              isInvalid={getFieldError('Grundstücksgröße')}
              errorMessage="Bitte geben Sie die Grundstücksgröße ein"
              disabled={readOnly}
            />
          </div>
        </div>
      </div>
    );
  };

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

      {/* Eigentumsverhältnisse Section */}
      <div className="mb-5">
        <div className="d-flex align-items-center gap-2 mb-4">
          <h4 className="mb-0 text-[#000000] font-semibold italic">Eigentumsverhältnisse</h4>
          <OverlayTrigger
            placement="right"
            overlay={renderTooltip("Geben Sie die Eigentumsverhältnisse des Objekts an. Wenn Sie ein Objekt erst erwerben möchten, wählen Sie \"noch nicht im Eigentum der antragstellenden Person(en)\".") }
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

        <div className="mb-4">
          <Form.Check
            type="radio"
            id="eigentumsverhaeltnis-1"
            label="im Eigentum der antragstellenden Person(en)"
            checked={formData.eigentumsverhaeltnis === true}
            onChange={() => handleInputChange('eigentumsverhaeltnis', true)}
            disabled={readOnly}
            className="mb-2"
          />
          <Form.Check
            type="radio"
            id="eigentumsverhaeltnis-2"
            label="noch nicht im Eigentum der antragstellenden Person(en)"
            checked={formData.eigentumsverhaeltnis === false}
            onChange={() => handleInputChange('eigentumsverhaeltnis', false)}
            disabled={readOnly}
            className="mb-2"
          />
          {showValidation && getFieldError('Eigentum der antragstellenden Person(en)') && (
            <div className="text-danger mt-1">
              Bitte geben Sie an, ob das Objekt im Eigentum der antragstellenden Person(en) ist
            </div>
          )}

          {formData.eigentumsverhaeltnis === false && (
            <div className="ms-4 mt-3">
              <div className="d-flex flex-column gap-2">
                <Form.Check
                  type="radio"
                  id="kaufvertrag-wird"
                  label="Notarieller Kaufvertrag wird abgeschlossen"
                  checked={formData.kaufvertrag.wurdeAbgeschlossen === false}
                  onChange={() => {
                    handleInputChange('kaufvertrag', {
                      ...formData.kaufvertrag,
                      wurdeAbgeschlossen: false,
                      abschlussDatum: ''
                    });
                  }}
                  name="kaufvertrag-status"
                  disabled={readOnly}
                />
                <div className="d-flex align-items-center gap-2">
                  <Form.Check
                    type="radio"
                    id="kaufvertrag-wurde"
                    label="Notarieller Kaufvertrag wurde abgeschlossen am"
                    checked={formData.kaufvertrag.wurdeAbgeschlossen === true}
                    onChange={() => {
                      handleInputChange('kaufvertrag', {
                        ...formData.kaufvertrag,
                        wurdeAbgeschlossen: true
                      });
                    }}
                    name="kaufvertrag-status"
                    disabled={readOnly}
                  />
                  {formData.kaufvertrag.wurdeAbgeschlossen === true && (
                    <div className="col-md-4">
                      <GeneralDatePicker
                        value={formData.kaufvertrag.abschlussDatum}
                        onChange={(date) => handleInputChange('kaufvertrag', {
                          ...formData.kaufvertrag,
                          abschlussDatum: date
                        })}
                        isInvalid={getFieldError('Abschlussdatum des Kaufvertrags')}
                        disabled={readOnly}
                        label="Abschlussdatum"
                        placeholder="Datum auswählen"
                      />
                    </div>
                  )}
                </div>
                {showValidation && getFieldError('Kaufvertrag abgeschlossen') && (
                  <div className="text-danger mt-1">
                    Bitte geben Sie an, ob der Kaufvertrag abgeschlossen wurde
                  </div>
                )}
                {showValidation && getFieldError('Bitte geben Sie das Abschlussdatum des Kaufvertrags ein') && (
                  <div className="text-danger mt-1">
                    Bitte geben Sie das Abschlussdatum des Kaufvertrags ein
                  </div>
                )}
                {showValidation && getFieldError('Das Abschlussdatum des Kaufvertrags darf weder in der Zukunft noch mehr als 20 Jahre in der Vergangenheit liegen') && (
                  <div className="text-danger mt-1">
                    Das Abschlussdatum des Kaufvertrags darf weder in der Zukunft noch mehr als 20 Jahre in der Vergangenheit liegen
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Erbbaurecht Section - Only show if eigentumsverhaeltnis is true */}
      {formData.eigentumsverhaeltnis === true && (
        <div className="mb-5">
          <div className="d-flex align-items-center gap-2 mb-4">
            <h4 className="mb-0 text-[#000000] font-semibold italic">Erbbaurecht</h4>
            <OverlayTrigger
              placement="right"
              overlay={renderTooltip("Geben Sie an, ob Sie Erbbaurecht besitzen")}
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

          <div className="d-flex align-items-center mb-3">
            <div className="flex-grow-1">
              <Form.Label>Ist Erbbaurecht vorhanden?</Form.Label>
            </div>
            <div className="d-flex gap-3">
              <Form.Check
                inline
                type="radio"
                label="Ja"
                name="erbbaurecht"
                checked={formData.erbbaurecht === true}
                onChange={() => handleInputChange('erbbaurecht', true)}
                disabled={readOnly}
                className="custom-radio"
              />
              <Form.Check
                inline
                type="radio"
                label="Nein"
                name="erbbaurecht"
                checked={formData.erbbaurecht === false}
                onChange={() => handleInputChange('erbbaurecht', false)}
                disabled={readOnly}
                className="custom-radio"
              />
            </div>
          </div>
          {showValidation && getFieldError('Erbbaurecht vorhanden') && (
            <div className="text-danger mt-1">
              Bitte geben Sie an, ob Erbbaurecht vorhanden ist
            </div>
          )}

          {formData.erbbaurecht && (
            <div className="row g-3 mb-4">
              <div className="col-12">
                <Form.Floating>
                  <Form.Control
                    type="number"
                    placeholder="Restlaufzeit Erbbaurecht"
                    value={formData.restlaufzeitErbbaurecht}
                    onChange={(e) => handleInputChange('restlaufzeitErbbaurecht', e.target.value)}
                    isInvalid={getFieldError('Restlaufzeit des Erbbaurechts')}
                    disabled={readOnly}
                  />
                  <label>Restlaufzeit Erbbaurecht (Jahre)</label>
                  <Form.Control.Feedback type="invalid">
                    Bitte geben Sie die Restlaufzeit des Erbbaurechts ein
                  </Form.Control.Feedback>
                </Form.Floating>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grundbuchangaben Section - Show based on conditions */}
      {(formData.eigentumsverhaeltnis === false || formData.erbbaurecht === true || formData.erbbaurecht === false) && renderGrundbuchSection()}

      {/* Baulasten und Altlasten Section */}
      <div className="mb-5">
        <div className="d-flex align-items-center gap-2 mb-4">
          <h4 className="mb-0 text-[#000000] font-semibold italic">Baulasten und Altlasten</h4>
          <OverlayTrigger
            placement="right"
            overlay={renderTooltip("Geben Sie an, ob Baulasten oder Altlasten vorhanden sind")}
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

        <div className="mb-4">
          <div className="d-flex align-items-center mb-3">
            <div className="flex-grow-1">
              <Form.Label>Baulasten zu Gunsten oder Lasten des Förderobjekts vorhanden:</Form.Label>
            </div>
            <div className="d-flex gap-3">
              <Form.Check
                inline
                type="radio"
                label="Ja"
                name="baulasten"
                checked={formData.baulasten.vorhanden === true}
                onChange={() => handleInputChange('baulasten.vorhanden', true)}
                disabled={readOnly}
                className="custom-radio"
              />
              <Form.Check
                inline
                type="radio"
                label="Nein"
                name="baulasten"
                checked={formData.baulasten.vorhanden === false}
                onChange={() => handleInputChange('baulasten.vorhanden', false)}
                disabled={readOnly}
                className="custom-radio"
              />
            </div>
          </div>
          {showValidation && getFieldError('Baulasten vorhanden') && (
            <div className="text-danger mt-1">
              Bitte geben Sie an, ob Baulasten vorhanden sind
            </div>
          )}

          {formData.baulasten.vorhanden && (
            <div className="row g-3">
              <div className="col-12">
                <Form.Floating>
                  <Form.Control
                    type="text"
                    placeholder="Art der Baulasten"
                    value={formData.baulasten.art}
                    onChange={(e) => handleInputChange('baulasten.art', e.target.value)}
                    isInvalid={getFieldError('Art der Baulasten')}
                    disabled={readOnly}
                  />
                  <label>Art der Baulasten</label>
                  <Form.Control.Feedback type="invalid">
                    Bitte geben Sie die Art der Baulasten ein
                  </Form.Control.Feedback>
                </Form.Floating>
              </div>
            </div>
          )}
        </div>

        <div className="mb-4">
          <div className="d-flex align-items-center mb-3">
            <div className="flex-grow-1">
              <Form.Label>Altlasten laut Verzeichnis Altstandorte und Altablagerungen vorhanden:</Form.Label>
            </div>
            <div className="d-flex gap-3">
              <Form.Check
                inline
                type="radio"
                label="Ja"
                name="altlasten"
                checked={formData.altlasten.vorhanden === true}
                onChange={() => handleInputChange('altlasten.vorhanden', true)}
                disabled={readOnly}
                className="custom-radio"
              />
              <Form.Check
                inline
                type="radio"
                label="Nein"
                name="altlasten"
                checked={formData.altlasten.vorhanden === false}
                onChange={() => handleInputChange('altlasten.vorhanden', false)}
                disabled={readOnly}
                className="custom-radio"
              />
            </div>
          </div>
          {showValidation && getFieldError('Altlasten vorhanden') && (
            <div className="text-danger mt-1">
              Bitte geben Sie an, ob Altlasten vorhanden sind
            </div>
          )}

          {formData.altlasten.vorhanden && (
            <div className="row g-3">
              <div className="col-12">
                <Form.Floating>
                  <Form.Control
                    type="text"
                    placeholder="Art der Altlasten"
                    value={formData.altlasten.art}
                    onChange={(e) => handleInputChange('altlasten.art', e.target.value)}
                    isInvalid={getFieldError('Art der Altlasten')}
                    disabled={readOnly}
                  />
                  <label>Art der Altlasten</label>
                  <Form.Control.Feedback type="invalid">
                    Bitte geben Sie die Art der Altlasten ein
                  </Form.Control.Feedback>
                </Form.Floating>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Step4_Eigentumsverhaeltnisse; 