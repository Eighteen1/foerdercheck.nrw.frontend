import React from 'react';
import { Form, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';

interface Step2Data {
  adultCount: string;
  childCount: string;
  isDisabled: boolean;
  isMarried: boolean;
  hasAdditionalAssets: boolean;
  hasDoubleSubsidy: boolean;
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
      <h3 className="mb-4">Persönliche Verhältnisse</h3>

      <div className="mb-5">
        <div className="d-flex align-items-center gap-2 mb-4">
          <h4 className="mb-0">Haushalt</h4>
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
      </div>

      <div className="mb-4">
        <div className="d-flex align-items-center mb-3">
          <Form.Check
            type="radio"
            id="disabled-yes"
            name="isDisabled"
            label="ja"
            checked={formData.isDisabled}
            onChange={() => handleInputChange('isDisabled', true)}
            className="me-3"
          />
          <Form.Check
            type="radio"
            id="disabled-no"
            name="isDisabled"
            label="nein"
            checked={!formData.isDisabled}
            onChange={() => handleInputChange('isDisabled', false)}
          />
          <div className="ms-3 d-flex align-items-center">
            Sind einige der Personen schwerbehindert?
            <OverlayTrigger
              placement="right"
              overlay={renderTooltip("Geben Sie an, ob Personen in Ihrem Haushalt schwerbehindert sind")}
            >
              <Button
                variant="outline-secondary"
                className="rounded-circle p-0 d-flex align-items-center justify-content-center ms-2"
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
        </div>

        <div className="d-flex align-items-center mb-3">
          <Form.Check
            type="radio"
            id="married-yes"
            name="isMarried"
            label="ja"
            checked={formData.isMarried}
            onChange={() => handleInputChange('isMarried', true)}
            className="me-3"
          />
          <Form.Check
            type="radio"
            id="married-no"
            name="isMarried"
            label="nein"
            checked={!formData.isMarried}
            onChange={() => handleInputChange('isMarried', false)}
          />
          <div className="ms-3">
            Antragstellende sind verheiratet/leben in einer eingetragenen Lebenspartnerschaft
          </div>
        </div>
      </div>

      <div className="mb-5">
        <div className="d-flex align-items-center gap-2 mb-4">
          <h4 className="mb-0">Vermögen</h4>
          <OverlayTrigger
            placement="right"
            overlay={renderTooltip("Angaben zu Ihrem Vermögen")}
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
          <Form.Check
            type="radio"
            id="assets-yes"
            name="hasAdditionalAssets"
            label="ja"
            checked={formData.hasAdditionalAssets}
            onChange={() => handleInputChange('hasAdditionalAssets', true)}
            className="me-3"
          />
          <Form.Check
            type="radio"
            id="assets-no"
            name="hasAdditionalAssets"
            label="nein"
            checked={!formData.hasAdditionalAssets}
            onChange={() => handleInputChange('hasAdditionalAssets', false)}
          />
          <div className="ms-3">
            Ist über die im Antragsverfahren offenbarten Geldwerte und/oder das bezahlte Grundstück hinaus weiteres Vermögen vorhanden?
          </div>
        </div>
      </div>

      <div className="mb-5">
        <div className="d-flex align-items-center gap-2 mb-4">
          <h4 className="mb-0">Doppelförderung</h4>
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
          <Form.Check
            type="radio"
            id="double-subsidy-yes"
            name="hasDoubleSubsidy"
            label="ja"
            checked={formData.hasDoubleSubsidy}
            onChange={() => handleInputChange('hasDoubleSubsidy', true)}
            className="me-3"
          />
          <Form.Check
            type="radio"
            id="double-subsidy-no"
            name="hasDoubleSubsidy"
            label="nein"
            checked={!formData.hasDoubleSubsidy}
            onChange={() => handleInputChange('hasDoubleSubsidy', false)}
          />
          <div className="ms-3">
            Die antragstellende(n) Person(en) und alle Haushaltsangehörigen sind/waren Eigentümerin/Eigentümer/Miteigentümerin/Miteigentümer eines geförderten Eigenheims oder einer geförderten Eigentumswohnung (nicht gemeint ist das Förderobjekt)
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step2_HouseholdInfo; 