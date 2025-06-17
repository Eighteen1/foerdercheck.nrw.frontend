import React from 'react';
import { Form, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import CurrencyInput from '../../common/CurrencyInput';

interface Step2Data {
  adultCount: string;
  childCount: string;
  isDisabled: boolean | null;
  isMarried: boolean | null;
  hasAdditionalAssets: boolean | null;
  hasDoubleSubsidy: boolean | null;
  childrenAges: string;
  disabledAdultsCount: string;
  disabledChildrenCount: string;
  additionalAssetsDetails: string;
  hasRepaidSubsidy: boolean | null;
  subsidyAmount: string;
  subsidyFileNumber: string;
  subsidyAuthority: string;
  hasSupplementaryLoan: boolean | null;
}

interface Step2Props {
  formData: Step2Data;
  updateFormData: (data: Step2Data) => void;
  showValidation?: boolean;
  readOnly?: boolean;
}

const Step2_HouseholdInfo: React.FC<Step2Props> = ({ formData, updateFormData, showValidation = false, readOnly = false }) => {
  const handleInputChange = (field: keyof Step2Data, value: string | boolean) => {
    if (readOnly) return;
    updateFormData({
      ...formData,
      [field]: value
    });
  };

  const validateStep2 = (data: Step2Data): string[] => {
    const errors: string[] = [];

    // Adult count validation
    if (!data.adultCount) errors.push('Bitte geben Sie die Anzahl der Erwachsenen ein');
    if (parseInt(data.adultCount) < 0) errors.push('Die Anzahl der Erwachsenen darf nicht negativ sein');
    if (parseInt(data.adultCount) === 0) errors.push('Die Anzahl der Erwachsenen darf nicht 0 sein');

    // Child count validation
    if (!data.childCount) errors.push('Bitte geben Sie die Anzahl der Kinder ein');
    if (parseInt(data.childCount) < 0) errors.push('Die Anzahl der Kinder darf nicht negativ sein');
    if (parseInt(data.childCount) > 0 && !data.childrenAges) errors.push('Bitte geben Sie das Alter der Kinder ein');

    // Child ages validation
    if (data.childrenAges) {
      const ages = data.childrenAges.split(',').map(age => parseInt(age.trim()));
      if (ages.some(age => age > 17)) {
        errors.push('Volljährige Personen zählen als Erwachsene');
      }
    }

    // Disability validation
    if (data.isDisabled == null) errors.push('Bitte geben Sie an, ob behinderte Menschen in dem Haushalt leben');
    if (data.isDisabled === true) {
      const totalDisabled = parseInt(data.disabledAdultsCount || '0') + parseInt(data.disabledChildrenCount || '0');
      const totalHousehold = parseInt(data.adultCount || '0') + parseInt(data.childCount || '0');
      if (totalDisabled <= 0) {
        errors.push('Bitte geben Sie die Anzahl der behinderten Menschen in ihrem Haushalt ein');
      }
      if (totalDisabled > totalHousehold) {
        errors.push('Die Anzahl der behinderten Menschen kann nicht größer sein als die Gesamtanzahl der Haushaltsmitglieder');
      }
    }

    // Marriage status validation
    if (data.isMarried === null || data.isMarried === undefined) {
      errors.push('Bitte geben Sie an, ob Sie verheiratet sind oder in einer eingetragenen Lebenspartnerschaft leben');
    }

    // Additional assets validation
    if (data.hasAdditionalAssets === null) {
      errors.push('Bitte geben Sie an, ob weiteres Vermögen vorhanden ist');
    }
    if (data.hasAdditionalAssets === true && !data.additionalAssetsDetails) {
      errors.push('Bitte beschreiben Sie das weitere Vermögen');
    }

    // Double subsidy validation
    if (data.hasDoubleSubsidy === null) {
      errors.push('Bitte geben Sie an, ob Sie bereits Eigentümer eines geförderten Eigenheims oder einer geförderten Eigentumswohnung sind/waren');
    }
    if (data.hasDoubleSubsidy === true) {
      if (data.hasRepaidSubsidy === null) {
        errors.push('Bitte geben Sie an, ob die Fördermittel bereits zurückgezahlt wurden');
      }
      if (!data.subsidyAmount) {
        errors.push('Bitte geben Sie den Betrag der Fördermittel ein');
      }
      if (!data.subsidyFileNumber) {
        errors.push('Bitte geben Sie das Aktenzeichen ein');
      }
      if (!data.subsidyAuthority) {
        errors.push('Bitte geben Sie die Bewilligungsbehörde ein');
      }
    }

    // Supplementary loan validation
    if (data.hasSupplementaryLoan === null) {
      errors.push('Bitte geben Sie an, ob Sie ein Ergänzungsdarlehen der NRW.BANK beantragen');
    }

    return errors;
  };

  const getFieldError = (fieldName: string): boolean => {
    if (!showValidation) return false;
    const errors = validateStep2(formData);
    return errors.some(error => error.includes(fieldName));
  };

  const renderTooltip = (text: string) => (
    <Tooltip id="button-tooltip">
      {text}
    </Tooltip>
  );

  const validationErrors = validateStep2(formData);

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

      <div className="mb-5">
        <div className="d-flex align-items-center gap-2 mb-4">
          <h4 className="mb-0 text-[#000000] font-semibold italic">Haushalt</h4>
          <OverlayTrigger
            placement="right"
            overlay={renderTooltip("Geben Sie die Anzahl der Personen in Ihrem Haushalt an")}
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
                placeholder="Anzahl Erwachsene"
                value={formData.adultCount}
                onChange={(e) => handleInputChange('adultCount', e.target.value)}
                isInvalid={getFieldError('Anzahl der Erwachsenen')}
                disabled={readOnly}
              />
              <label>Anzahl Erwachsene</label>
              {showValidation && getFieldError('Anzahl der Erwachsenen') && (
                <Form.Control.Feedback type="invalid">
                  Bitte geben Sie die Anzahl der Erwachsenen ein
                </Form.Control.Feedback>
              )}
            </Form.Floating>
          </div>
          <div className="col-md-6">
            <Form.Floating>
              <Form.Control
                type="number"
                placeholder="Anzahl Kinder"
                value={formData.childCount}
                onChange={(e) => handleInputChange('childCount', e.target.value)}
                isInvalid={getFieldError('Anzahl der Kinder')}
                disabled={readOnly}
              />
              <label>Anzahl Kinder</label>
              {showValidation && getFieldError('Anzahl der Kinder') && (
                <Form.Control.Feedback type="invalid">
                  Bitte geben Sie die Anzahl der Kinder ein
                </Form.Control.Feedback>
              )}
            </Form.Floating>
          </div>
        </div>

        {formData.childCount && parseInt(formData.childCount) > 0 && (
          <div className="row g-3 mt-3">
            <div className="col-12">
              <Form.Floating>
                <Form.Control
                  type="text"
                  placeholder="Alter der Kinder (Trennung per Comma)"
                  value={formData.childrenAges}
                  onChange={(e) => handleInputChange('childrenAges', e.target.value)}
                  isInvalid={getFieldError('Alter der Kinder')}
                  disabled={readOnly}
                />
                <label>Alter der Kinder (Trennung per Comma)</label>
                {showValidation && getFieldError('Alter der Kinder') && (
                  <Form.Control.Feedback type="invalid">
                    Bitte geben Sie das Alter der Kinder ein
                  </Form.Control.Feedback>
                )}
              </Form.Floating>
            </div>
          </div>
        )}
      </div>

      <div className="mb-4">
        <div className="d-flex align-items-center mb-3">
          <div className="flex-grow-1">
            <Form.Label className="d-flex align-items-center gap-2">
              Sind einige der Personen schwerbehindert?
              <OverlayTrigger
                placement="right"
                overlay={renderTooltip("Geben Sie an, ob Personen in Ihrem Haushalt schwerbehindert sind")}
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
            </Form.Label>
          </div>
          <div className="d-flex gap-3">
            <Form.Check
              inline
              type="radio"
              label="Ja"
              name="isDisabled"
              checked={formData.isDisabled === true}
              onChange={() => handleInputChange('isDisabled', true)}
              className="custom-radio"
              disabled={readOnly}
            />
            <Form.Check
              inline
              type="radio"
              label="Nein"
              name="isDisabled"
              checked={formData.isDisabled === false}
              onChange={() => handleInputChange('isDisabled', false)}
              className="custom-radio"
              disabled={readOnly}
            />
          </div>
        </div>
        {showValidation && validationErrors.includes('Bitte geben Sie an, ob behinderte Menschen in dem Haushalt leben') && (
          <div className="text-danger mt-1">
            Bitte geben Sie an, ob behinderte Menschen in dem Haushalt leben
          </div>
        )}

        {formData.isDisabled && (
          <div className="row g-3 mt-3">
            <div className="col-md-6">
              <Form.Floating>
                <Form.Control
                  type="number"
                  placeholder="davon Erwachsene mit Schwerbehinderung"
                  value={formData.disabledAdultsCount || '1'}
                  onChange={(e) => handleInputChange('disabledAdultsCount', e.target.value)}
                  isInvalid={getFieldError('behinderten Menschen')}
                  disabled={readOnly}
                />
                <label>davon Erwachsene mit Schwerbehinderung</label>
                {showValidation && getFieldError('behinderten Menschen') && (
                  <Form.Control.Feedback type="invalid">
                    Bitte geben Sie die Anzahl der behinderten Menschen in ihrem Haushalt ein
                  </Form.Control.Feedback>
                )}
              </Form.Floating>
            </div>
            <div className="col-md-6">
              <Form.Floating>
                <Form.Control
                  type="number"
                  placeholder="davon Kinder mit Schwerbehinderung"
                  value={formData.disabledChildrenCount || '0'}
                  onChange={(e) => handleInputChange('disabledChildrenCount', e.target.value)}
                  isInvalid={getFieldError('behinderten Menschen')}
                  disabled={readOnly}
                />
                <label>davon Kinder mit Schwerbehinderung</label>
                {showValidation && getFieldError('behinderten Menschen') && (
                  <Form.Control.Feedback type="invalid">
                    Bitte geben Sie die Anzahl der behinderten Menschen in ihrem Haushalt ein
                  </Form.Control.Feedback>
                )}
              </Form.Floating>
            </div>
          </div>
        )}
      </div>

      <div className="mb-4">
        <div className="d-flex align-items-center mb-3">
          <div className="flex-grow-1">
            <Form.Label>
              Antragstellende sind verheiratet/leben in einer eingetragenen Lebenspartnerschaft.
            </Form.Label>
          </div>
          <div className="d-flex gap-3">
            <Form.Check
              inline
              type="radio"
              label="Ja"
              name="isMarried"
              checked={formData.isMarried === true}
              onChange={() => handleInputChange('isMarried', true)}
              className="custom-radio"
              disabled={readOnly}
            />
            <Form.Check
              inline
              type="radio"
              label="Nein"
              name="isMarried"
              checked={formData.isMarried === false}
              onChange={() => handleInputChange('isMarried', false)}
              className="custom-radio"
              disabled={readOnly}
            />
          </div>
        </div>
        {showValidation && validationErrors.includes('Bitte geben Sie an, ob Sie verheiratet sind oder in einer eingetragenen Lebenspartnerschaft leben') && (
          <div className="text-danger mt-1">
            Bitte geben Sie an, ob Sie verheiratet sind oder in einer eingetragenen Lebenspartnerschaft leben
          </div>
        )}
      </div>

      <div className="mb-5">
        <div className="d-flex align-items-center gap-2 mb-4">
          <h4 className="mb-0 text-[#000000] font-semibold italic">Vermögen</h4>
          <OverlayTrigger
            placement="right"
            overlay={renderTooltip("z. B. Grundvermögen, Bargeld und Bankguthaben, Wertpapiere, Beteiligungen, Luxusgüter")}
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
            <Form.Label>
              Ist über die im Antragsverfahren offenbarten Geldwerte und/oder das bezahlte Grundstück hinaus weiteres Vermögen vorhanden?
            </Form.Label>
          </div>
          <div className="d-flex gap-3">
            <Form.Check
              inline
              type="radio"
              label="Ja"
              name="hasAdditionalAssets"
              checked={formData.hasAdditionalAssets === true}
              onChange={() => handleInputChange('hasAdditionalAssets', true)}
              className="custom-radio"
              disabled={readOnly}
            />
            <Form.Check
              inline
              type="radio"
              label="Nein"
              name="hasAdditionalAssets"
              checked={formData.hasAdditionalAssets === false}
              onChange={() => handleInputChange('hasAdditionalAssets', false)}
              className="custom-radio"
              disabled={readOnly}
            />
          </div>
        </div>
        {showValidation && validationErrors.includes('Bitte geben Sie an, ob weiteres Vermögen vorhanden ist') && (
          <div className="text-danger mt-1">
            Bitte geben Sie an, ob weiteres Vermögen vorhanden ist
          </div>
        )}

        {formData.hasAdditionalAssets && (
          <div className="row g-3 mt-3">
            <div className="col-12">
              <Form.Floating>
                <Form.Control
                  type="text"
                  placeholder="Bitte beschreiben Sie das weitere Vermögen"
                  value={formData.additionalAssetsDetails}
                  onChange={(e) => handleInputChange('additionalAssetsDetails', e.target.value)}
                  isInvalid={getFieldError('weitere Vermögen')}
                  disabled={readOnly}
                />
                <label>Bitte beschreiben Sie das weitere Vermögen</label>
                {showValidation && getFieldError('weitere Vermögen') && (
                  <Form.Control.Feedback type="invalid">
                    Bitte beschreiben Sie das weitere Vermögen
                  </Form.Control.Feedback>
                )}
              </Form.Floating>
            </div>
          </div>
        )}
      </div>

      <div className="mb-5">
        <div className="d-flex align-items-center gap-2 mb-4">
          <h4 className="mb-0 text-[#000000] font-semibold italic">Doppelförderung</h4>
          <OverlayTrigger
            placement="right"
            overlay={renderTooltip("Angaben zu möglicher Doppelförderung")}
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
            <Form.Label>
              Die antragstellende(n) Person(en) und alle Haushaltsangehörigen sind/waren Eigentümerin/Eigentümer/Miteigentümerin/Miteigentümer eines geförderten Eigenheims oder einer geförderten Eigentumswohnung (nicht gemeint ist das Förderobjekt).
            </Form.Label>
          </div>
          <div className="d-flex gap-3">
            <Form.Check
              inline
              type="radio"
              label="Ja"
              name="hasDoubleSubsidy"
              checked={formData.hasDoubleSubsidy === true}
              onChange={() => handleInputChange('hasDoubleSubsidy', true)}
              className="custom-radio"
              disabled={readOnly}
            />
            <Form.Check
              inline
              type="radio"
              label="Nein"
              name="hasDoubleSubsidy"
              checked={formData.hasDoubleSubsidy === false}
              onChange={() => handleInputChange('hasDoubleSubsidy', false)}
              className="custom-radio"
              disabled={readOnly}
            />
          </div>
        </div>
        {showValidation && validationErrors.includes('Bitte geben Sie an, ob Sie bereits Eigentümer eines geförderten Eigenheims oder einer geförderten Eigentumswohnung sind/waren') && (
          <div className="text-danger mt-1">
            Bitte geben Sie an, ob Sie bereits Eigentümer eines geförderten Eigenheims oder einer geförderten Eigentumswohnung sind/waren
          </div>
        )}

        {formData.hasDoubleSubsidy && (
          <div className="mt-3">
            <div className="d-flex align-items-center mb-3">
              <div className="flex-grow-1">
                <Form.Label>Die Fördermittel wurden bereits zurückgezahlt</Form.Label>
              </div>
              <div className="d-flex gap-3">
                <Form.Check
                  inline
                  type="radio"
                  label="Ja"
                  name="hasRepaidSubsidy"
                  checked={formData.hasRepaidSubsidy === true}
                  onChange={() => handleInputChange('hasRepaidSubsidy', true)}
                  className="custom-radio"
                  disabled={readOnly}
                />
                <Form.Check
                  inline
                  type="radio"
                  label="Nein"
                  name="hasRepaidSubsidy"
                  checked={formData.hasRepaidSubsidy === false}
                  onChange={() => handleInputChange('hasRepaidSubsidy', false)}
                  className="custom-radio"
                  disabled={readOnly}
                />
              </div>
            </div>
            {showValidation && validationErrors.includes('Bitte geben Sie an, ob die Fördermittel bereits zurückgezahlt wurden') && (
              <div className="text-danger mt-1 mb-3">
                Bitte geben Sie an, ob die Fördermittel bereits zurückgezahlt wurden
              </div>
            )}

            <div className="row g-3">
              <div className="col-md-4">
                <CurrencyInput
                  value={formData.subsidyAmount}
                  onChange={(value) => handleInputChange('subsidyAmount', value)}
                  placeholder="Betrag"
                  label="Betrag"
                  isInvalid={getFieldError('Betrag der Fördermittel')}
                  disabled={readOnly}
                />
                {showValidation && getFieldError('Betrag der Fördermittel') && (
                  <Form.Control.Feedback type="invalid">
                    Bitte geben Sie den Betrag der Fördermittel ein
                  </Form.Control.Feedback>
                )}
              </div>
              <div className="col-md-4">
                <Form.Floating>
                  <Form.Control
                    type="text"
                    placeholder="Aktenzeichen"
                    value={formData.subsidyFileNumber}
                    onChange={(e) => handleInputChange('subsidyFileNumber', e.target.value)}
                    isInvalid={getFieldError('Aktenzeichen')}
                    disabled={readOnly}
                  />
                  <label>Aktenzeichen</label>
                  {showValidation && getFieldError('Aktenzeichen') && (
                    <Form.Control.Feedback type="invalid">
                      Bitte geben Sie das Aktenzeichen ein
                    </Form.Control.Feedback>
                  )}
                </Form.Floating>
              </div>
              <div className="col-md-4">
                <Form.Floating>
                  <Form.Control
                    type="text"
                    placeholder="Bewilligungsbehörde"
                    value={formData.subsidyAuthority}
                    onChange={(e) => handleInputChange('subsidyAuthority', e.target.value)}
                    isInvalid={getFieldError('Bewilligungsbehörde')}
                    disabled={readOnly}
                  />
                  <label>Bewilligungsbehörde</label>
                  {showValidation && getFieldError('Bewilligungsbehörde') && (
                    <Form.Control.Feedback type="invalid">
                      Bitte geben Sie die Bewilligungsbehörde ein
                    </Form.Control.Feedback>
                  )}
                </Form.Floating>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mb-5">
        <div className="d-flex align-items-center gap-2 mb-4">
          <h4 className="mb-0 text-[#000000] font-semibold italic">Ergänzungsdarlehen</h4>
          <OverlayTrigger
            placement="right"
            overlay={renderTooltip("Angaben zum Ergänzungsdarlehen der NRW.BANK")}
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
            <Form.Label>
              Die antragstellende(n) Person(en) hat/haben kein dinglich gesichertes Darlehen einer Bank zur Gewährleistung der Finanzierung der Gesamtkosten erhalten und beantragt/beantragen ein Ergänzungsdarlehen der NRW.BANK.
            </Form.Label>
          </div>
          <div className="d-flex gap-3">
            <Form.Check
              inline
              type="radio"
              label="Ja"
              name="hasSupplementaryLoan"
              checked={formData.hasSupplementaryLoan === true}
              onChange={() => handleInputChange('hasSupplementaryLoan', true)}
              className="custom-radio"
              disabled={readOnly}
            />
            <Form.Check
              inline
              type="radio"
              label="Nein"
              name="hasSupplementaryLoan"
              checked={formData.hasSupplementaryLoan === false}
              onChange={() => handleInputChange('hasSupplementaryLoan', false)}
              className="custom-radio"
              disabled={readOnly}
            />
          </div>
        </div>
        {showValidation && validationErrors.includes('Bitte geben Sie an, ob Sie ein Ergänzungsdarlehen der NRW.BANK beantragen') && (
          <div className="text-danger mt-1">
            Bitte geben Sie an, ob Sie ein Ergänzungsdarlehen der NRW.BANK beantragen
          </div>
        )}
      </div>
    </div>
  );
};

export default Step2_HouseholdInfo; 