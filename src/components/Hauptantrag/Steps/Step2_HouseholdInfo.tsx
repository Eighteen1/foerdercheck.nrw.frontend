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
}

const Step2_HouseholdInfo: React.FC<Step2Props> = ({ formData, updateFormData }) => {
  const handleInputChange = (field: keyof Step2Data, value: string | boolean) => {
    updateFormData({
      ...formData,
      [field]: value
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
              />
              <label>Anzahl Erwachsene</label>
            </Form.Floating>
          </div>
          <div className="col-md-6">
            <Form.Floating>
              <Form.Control
                type="number"
                placeholder="Anzahl Kinder"
                value={formData.childCount}
                onChange={(e) => handleInputChange('childCount', e.target.value)}
              />
              <label>Anzahl Kinder</label>
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
                />
                <label>Alter der Kinder (Trennung per Comma)</label>
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
            />
            <Form.Check
              inline
              type="radio"
              label="Nein"
              name="isDisabled"
              checked={formData.isDisabled === false}
              onChange={() => handleInputChange('isDisabled', false)}
              className="custom-radio"
            />
          </div>
        </div>

        {formData.isDisabled && (
          <div className="row g-3 mt-3">
            <div className="col-md-6">
              <Form.Floating>
                <Form.Control
                  type="number"
                  placeholder="davon Erwachsene mit Schwerbehinderung"
                  value={formData.disabledAdultsCount || '1'}
                  onChange={(e) => handleInputChange('disabledAdultsCount', e.target.value)}
                />
                <label>davon Erwachsene mit Schwerbehinderung</label>
              </Form.Floating>
            </div>
            <div className="col-md-6">
              <Form.Floating>
                <Form.Control
                  type="number"
                  placeholder="davon Kinder mit Schwerbehinderung"
                  value={formData.disabledChildrenCount || '0'}
                  onChange={(e) => handleInputChange('disabledChildrenCount', e.target.value)}
                />
                <label>davon Kinder mit Schwerbehinderung</label>
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
            />
            <Form.Check
              inline
              type="radio"
              label="Nein"
              name="isMarried"
              checked={formData.isMarried === false}
              onChange={() => handleInputChange('isMarried', false)}
              className="custom-radio"
            />
          </div>
        </div>
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
            />
            <Form.Check
              inline
              type="radio"
              label="Nein"
              name="hasAdditionalAssets"
              checked={formData.hasAdditionalAssets === false}
              onChange={() => handleInputChange('hasAdditionalAssets', false)}
              className="custom-radio"
            />
          </div>
        </div>

        {formData.hasAdditionalAssets && (
          <div className="row g-3 mt-3">
            <div className="col-12">
              <Form.Floating>
                <Form.Control
                  type="text"
                  placeholder="Bitte beschreiben Sie das weitere Vermögen"
                  value={formData.additionalAssetsDetails}
                  onChange={(e) => handleInputChange('additionalAssetsDetails', e.target.value)}
                />
                <label>Bitte beschreiben Sie das weitere Vermögen</label>
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
            />
            <Form.Check
              inline
              type="radio"
              label="Nein"
              name="hasDoubleSubsidy"
              checked={formData.hasDoubleSubsidy === false}
              onChange={() => handleInputChange('hasDoubleSubsidy', false)}
              className="custom-radio"
            />
          </div>
        </div>

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
                />
                <Form.Check
                  inline
                  type="radio"
                  label="Nein"
                  name="hasRepaidSubsidy"
                  checked={formData.hasRepaidSubsidy === false}
                  onChange={() => handleInputChange('hasRepaidSubsidy', false)}
                  className="custom-radio"
                />
              </div>
            </div>

            <div className="row g-3">
              <div className="col-md-4">
                <CurrencyInput
                  value={formData.subsidyAmount}
                  onChange={(value) => handleInputChange('subsidyAmount', value)}
                  placeholder="Betrag"
                  label="Betrag"
                />
              </div>
              <div className="col-md-4">
                <Form.Floating>
                  <Form.Control
                    type="text"
                    placeholder="Aktenzeichen"
                    value={formData.subsidyFileNumber}
                    onChange={(e) => handleInputChange('subsidyFileNumber', e.target.value)}
                  />
                  <label>Aktenzeichen</label>
                </Form.Floating>
              </div>
              <div className="col-md-4">
                <Form.Floating>
                  <Form.Control
                    type="text"
                    placeholder="Bewilligungsbehörde"
                    value={formData.subsidyAuthority}
                    onChange={(e) => handleInputChange('subsidyAuthority', e.target.value)}
                  />
                  <label>Bewilligungsbehörde</label>
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
            />
            <Form.Check
              inline
              type="radio"
              label="Nein"
              name="hasSupplementaryLoan"
              checked={formData.hasSupplementaryLoan === false}
              onChange={() => handleInputChange('hasSupplementaryLoan', false)}
              className="custom-radio"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step2_HouseholdInfo; 