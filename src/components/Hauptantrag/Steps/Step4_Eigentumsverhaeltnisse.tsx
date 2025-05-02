import React from 'react';
import { Form, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';

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
}

const Step4_Eigentumsverhaeltnisse: React.FC<Step4Props> = ({ formData, updateFormData }) => {
  const handleInputChange = (field: keyof Step4Data | string, value: any) => {
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

      {/* Eigentumsverhältnisse Section */}
      <div className="mb-5">
        <div className="d-flex align-items-center gap-2 mb-4">
          <h4 className="mb-0 text-[#000000] font-semibold italic">Eigentumsverhältnisse</h4>
          <OverlayTrigger
            placement="right"
            overlay={renderTooltip("Geben Sie die Eigentumsverhältnisse des Objekts an")}
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
            className="mb-2"
          />
          <Form.Check
            type="radio"
            id="eigentumsverhaeltnis-2"
            label="noch nicht im Eigentum der antragstellenden Person(en)"
            checked={formData.eigentumsverhaeltnis === false}
            onChange={() => handleInputChange('eigentumsverhaeltnis', false)}
            className="mb-2"
          />

          {formData.eigentumsverhaeltnis === false && (
            <div className="ms-4 mt-3">
              <div className="d-flex flex-column gap-2">
                <Form.Check
                  type="radio"
                  id="kaufvertrag-wird"
                  label="Kaufvertrag wird abgeschlossen"
                  checked={formData.kaufvertrag.wurdeAbgeschlossen === false}
                  onChange={() => {
                    handleInputChange('kaufvertrag', {
                      ...formData.kaufvertrag,
                      wurdeAbgeschlossen: false,
                      abschlussDatum: ''
                    });
                  }}
                  name="kaufvertrag-status"
                />
                <div className="d-flex align-items-center gap-2">
                  <Form.Check
                    type="radio"
                    id="kaufvertrag-wurde"
                    label="Kaufvertrag wurde abgeschlossen am"
                    checked={formData.kaufvertrag.wurdeAbgeschlossen === true}
                    onChange={() => {
                      handleInputChange('kaufvertrag', {
                        ...formData.kaufvertrag,
                        wurdeAbgeschlossen: true
                      });
                    }}
                    name="kaufvertrag-status"
                  />
                  {formData.kaufvertrag.wurdeAbgeschlossen === true && (
                    <Form.Control
                      type="date"
                      value={formData.kaufvertrag.abschlussDatum}
                      onChange={(e) => handleInputChange('kaufvertrag', {
                        ...formData.kaufvertrag,
                        abschlussDatum: e.target.value
                      })}
                      style={{ width: '200px' }}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Erbbaurecht Section */}
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
              className="custom-radio"
            />
            <Form.Check
              inline
              type="radio"
              label="Nein"
              name="erbbaurecht"
              checked={formData.erbbaurecht === false}
              onChange={() => handleInputChange('erbbaurecht', false)}
              className="custom-radio"
            />
          </div>
        </div>
      </div>

      {/* Grundbuchangaben Section */}
      <div className="mb-5">
        <div className="d-flex align-items-center gap-2 mb-4">
          <h4 className="mb-0 text-[#000000] font-semibold italic">Grundbuchangaben</h4>
          <OverlayTrigger
            placement="right"
            overlay={renderTooltip("Geben Sie die Grundbuchdaten des Objekts an")}
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

        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <Form.Check
              type="checkbox"
              id="grundbuch"
              label="Grundbuch"
              checked={formData.grundbuch.type === 'grundbuch'}
              onChange={() => handleInputChange('grundbuch.type', 'grundbuch')}
            />
          </div>
          <div className="col-md-4">
            <Form.Check
              type="checkbox"
              id="erbbaugrundbuch"
              label="Erbbaugrundbuch"
              checked={formData.grundbuch.type === 'erbbaugrundbuch'}
              onChange={() => handleInputChange('grundbuch.type', 'erbbaugrundbuch')}
            />
          </div>
          <div className="col-md-4">
            <Form.Check
              type="checkbox"
              id="wohnungsgrundbuch"
              label="Wohnungsgrundbuch"
              checked={formData.grundbuch.type === 'wohnungsgrundbuch'}
              onChange={() => handleInputChange('grundbuch.type', 'wohnungsgrundbuch')}
            />
          </div>
        </div>

        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <Form.Check
              type="checkbox"
              id="teileigentumsgrundbuch"
              label="Teileigentumsgrundbuch"
              checked={formData.grundbuch.type === 'teileigentumsgrundbuch'}
              onChange={() => handleInputChange('grundbuch.type', 'teileigentumsgrundbuch')}
            />
          </div>
          <div className="col-md-4">
            <Form.Check
              type="checkbox"
              id="wohnungserbbaugrundbuch"
              label="Wohnungserbbaugrundbuch"
              checked={formData.grundbuch.type === 'wohnungserbbaugrundbuch'}
              onChange={() => handleInputChange('grundbuch.type', 'wohnungserbbaugrundbuch')}
            />
          </div>
          <div className="col-md-4">
            <Form.Check
              type="checkbox"
              id="teileigentumserbbaugrundbuch"
              label="Teileigentumserbbaugrundbuch"
              checked={formData.grundbuch.type === 'teileigentumserbbaugrundbuch'}
              onChange={() => handleInputChange('grundbuch.type', 'teileigentumserbbaugrundbuch')}
            />
          </div>
        </div>

        {formData.erbbaurecht && (
          <div className="row g-3 mb-4">
            <div className="col-12">
              <Form.Floating>
                <Form.Control
                  type="number"
                  placeholder="Restlaufzeit Erbbaurecht"
                  value={formData.restlaufzeitErbbaurecht}
                  onChange={(e) => handleInputChange('restlaufzeitErbbaurecht', e.target.value)}
                />
                <label>Restlaufzeit Erbbaurecht (Jahre)</label>
              </Form.Floating>
            </div>
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
              />
              <label>Amtsgericht</label>
            </Form.Floating>
          </div>
          <div className="col-md-6">
            <Form.Floating>
              <Form.Control
                type="text"
                placeholder="Ort Grundbuch"
                value={formData.grundbuch.ortGrundbuch}
                onChange={(e) => handleInputChange('grundbuch.ortGrundbuch', e.target.value)}
              />
              <label>Ort Grundbuch</label>
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
              />
              <label>Gemarkung</label>
            </Form.Floating>
          </div>
          <div className="col-md-6">
            <Form.Floating>
              <Form.Control
                type="text"
                placeholder="Blatt"
                value={formData.grundbuch.blatt}
                onChange={(e) => handleInputChange('grundbuch.blatt', e.target.value)}
              />
              <label>Blatt</label>
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
              />
              <label>Flur</label>
            </Form.Floating>
          </div>
          <div className="col-md-6">
            <Form.Floating>
              <Form.Control
                type="text"
                placeholder="Flurstück(e)"
                value={formData.grundbuch.flurstueck}
                onChange={(e) => handleInputChange('grundbuch.flurstueck', e.target.value)}
              />
              <label>Flurstück(e)</label>
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
              />
              <label>Flurstück(e) neu</label>
            </Form.Floating>
          </div>
          <div className="col-md-6">
            <Form.Floating>
              <Form.Control
                type="number"
                placeholder="Grundstücksgröße"
                value={formData.grundbuch.grundstuecksgroesse}
                onChange={(e) => handleInputChange('grundbuch.grundstuecksgroesse', e.target.value)}
              />
              <label>Grundstücksgröße (m²)</label>
            </Form.Floating>
          </div>
        </div>
      </div>

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
                className="custom-radio"
              />
              <Form.Check
                inline
                type="radio"
                label="Nein"
                name="baulasten"
                checked={formData.baulasten.vorhanden === false}
                onChange={() => handleInputChange('baulasten.vorhanden', false)}
                className="custom-radio"
              />
            </div>
          </div>

          {formData.baulasten.vorhanden && (
            <div className="row g-3">
              <div className="col-12">
                <Form.Floating>
                  <Form.Control
                    type="text"
                    placeholder="Art der Baulasten"
                    value={formData.baulasten.art}
                    onChange={(e) => handleInputChange('baulasten.art', e.target.value)}
                  />
                  <label>Art der Baulasten</label>
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
                className="custom-radio"
              />
              <Form.Check
                inline
                type="radio"
                label="Nein"
                name="altlasten"
                checked={formData.altlasten.vorhanden === false}
                onChange={() => handleInputChange('altlasten.vorhanden', false)}
                className="custom-radio"
              />
            </div>
          </div>

          {formData.altlasten.vorhanden && (
            <div className="row g-3">
              <div className="col-12">
                <Form.Floating>
                  <Form.Control
                    type="text"
                    placeholder="Art der Altlasten"
                    value={formData.altlasten.art}
                    onChange={(e) => handleInputChange('altlasten.art', e.target.value)}
                  />
                  <label>Art der Altlasten</label>
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