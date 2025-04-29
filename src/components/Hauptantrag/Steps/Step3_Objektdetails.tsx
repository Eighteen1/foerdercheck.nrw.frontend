import React, { useState } from 'react';
import { Form, Button, OverlayTrigger, Tooltip, Row, Col } from 'react-bootstrap';
import CurrencyInput from '../../common/CurrencyInput';

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
      wurdeBeantragt: boolean | null;
      wurdeErteilt: boolean | null;
      erteilungsDatum: string;
      aktenzeichen: string;
      erteilungsBehoerde: string;
    };
    bauanzeige: {
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
}

const Step3_Objektdetails: React.FC<Step3Props> = ({ formData, updateFormData }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const handleInputChange = (section: keyof Step3Data, field: string, value: any) => {
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

        <div className="row g-3">
          <div className="col-md-8">
            <Form.Floating>
              <Form.Control
                type="text"
                placeholder="Straße"
                value={formData.address.street}
                onChange={(e) => handleInputChange('address', 'street', e.target.value)}
              />
              <label>Straße</label>
            </Form.Floating>
          </div>
          <div className="col-md-4">
            <Form.Floating>
              <Form.Control
                type="text"
                placeholder="Hausnummer"
                value={formData.address.houseNumber}
                onChange={(e) => handleInputChange('address', 'houseNumber', e.target.value)}
              />
              <label>Hausnummer</label>
            </Form.Floating>
          </div>
        </div>

        <div className="row g-3 mt-1">
          <div className="col-md-4">
            <Form.Floating>
              <Form.Control
                type="text"
                placeholder="Postleitzahl"
                value={formData.address.postalCode}
                onChange={(e) => handleInputChange('address', 'postalCode', e.target.value)}
              />
              <label>Postleitzahl</label>
            </Form.Floating>
          </div>
          <div className="col-md-8">
            <Form.Floating>
              <Form.Control
                type="text"
                placeholder="Ort"
                value={formData.address.city}
                onChange={(e) => handleInputChange('address', 'city', e.target.value)}
              />
              <label>Ort</label>
            </Form.Floating>
          </div>
        </div>
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
              />
            </Col>
          ))}
        </Row>
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
              />
              <label>Wohnfläche selbstgenutzte Wohneinheit (m²)</label>
            </Form.Floating>
          </div>
          <div className="col-md-6">
            <Form.Floating>
              <Form.Control
                type="number"
                placeholder="Gesamtwohnfläche bei zwei Wohnungen im Objekt"
                value={formData.objektDetailsAllgemein.gesamtWohnflaeche}
                onChange={(e) => handleNestedInputChange('objektDetailsAllgemein', '', 'gesamtWohnflaeche', e.target.value)}
              />
              <label>Gesamtwohnfläche bei zwei Wohnungen im Objekt (m²)</label>
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
              />
              <label>Anzahl Zimmer der selbstgenutzten Wohneinheit</label>
            </Form.Floating>
          </div>
          <div className="col-md-6">
            <Form.Floating>
              <Form.Control
                type="number"
                placeholder="Anzahl Garagen/Einstellplätze"
                value={formData.objektDetailsAllgemein.anzahlGaragen}
                onChange={(e) => handleNestedInputChange('objektDetailsAllgemein', '', 'anzahlGaragen', e.target.value)}
              />
              <label>Anzahl Garagen/Einstellplätze</label>
            </Form.Floating>
          </div>
        </div>

        {/* Gewerbefläche */}
        <div className="mt-4">
          <div className="d-flex align-items-center mb-3">
            <div className="flex-grow-1">
              <Form.Label>Enthält das Objekt eine Gewerbefläche?</Form.Label>
            </div>
            <div className="d-flex gap-3">
              <Form.Check
                inline
                type="radio"
                label="Ja"
                name="hasGewerbeflaeche"
                checked={formData.objektDetailsAllgemein.gewerbeflaeche.hasGewerbeflaeche === true}
                onChange={() => handleNestedInputChange('objektDetailsAllgemein', 'gewerbeflaeche', 'hasGewerbeflaeche', true)}
                className="custom-radio"
              />
              <Form.Check
                inline
                type="radio"
                label="Nein"
                name="hasGewerbeflaeche"
                checked={formData.objektDetailsAllgemein.gewerbeflaeche.hasGewerbeflaeche === false}
                onChange={() => handleNestedInputChange('objektDetailsAllgemein', 'gewerbeflaeche', 'hasGewerbeflaeche', false)}
                className="custom-radio"
              />
            </div>
          </div>

          {formData.objektDetailsAllgemein.gewerbeflaeche.hasGewerbeflaeche && (
            <div className="row g-3 mt-1">
              <div className="col-12">
                <Form.Floating>
                  <Form.Control
                    type="number"
                    placeholder="Gewerbefläche"
                    value={formData.objektDetailsAllgemein.gewerbeflaeche.flaeche}
                    onChange={(e) => handleNestedInputChange('objektDetailsAllgemein', 'gewerbeflaeche', 'flaeche', e.target.value)}
                  />
                  <label>Gewerbefläche (m²)</label>
                </Form.Floating>
              </div>
            </div>
          )}
        </div>

        {/* Erträge */}
        <div className="mt-4">
          <div className="d-flex align-items-center mb-3">
            <div className="flex-grow-1">
              <Form.Label>Werden durch das Förderobjekt Erträge erwirtschaftet?</Form.Label>
            </div>
            <div className="d-flex gap-3">
              <Form.Check
                inline
                type="radio"
                label="Ja"
                name="hasErtraege"
                checked={formData.objektDetailsAllgemein.ertraege.hasErtraege === true}
                onChange={() => handleNestedInputChange('objektDetailsAllgemein', 'ertraege', 'hasErtraege', true)}
                className="custom-radio"
              />
              <Form.Check
                inline
                type="radio"
                label="Nein"
                name="hasErtraege"
                checked={formData.objektDetailsAllgemein.ertraege.hasErtraege === false}
                onChange={() => handleNestedInputChange('objektDetailsAllgemein', 'ertraege', 'hasErtraege', false)}
                className="custom-radio"
              />
            </div>
          </div>

          {formData.objektDetailsAllgemein.ertraege.hasErtraege && (
            <div className="row g-3">
              <div className="col-md-6">
                <CurrencyInput
                  value={formData.objektDetailsAllgemein.ertraege.vermieteteWohnung}
                  onChange={(value) => handleNestedInputChange('objektDetailsAllgemein', 'ertraege', 'vermieteteWohnung', value)}
                  placeholder="Vermietete zweite Wohnung"
                  label="Vermietete zweite Wohnung (€/Jahr)"
                />
              </div>
              <div className="col-md-6">
                <CurrencyInput
                  value={formData.objektDetailsAllgemein.ertraege.vermieteteGarage}
                  onChange={(value) => handleNestedInputChange('objektDetailsAllgemein', 'ertraege', 'vermieteteGarage', value)}
                  placeholder="Vermietete Garage/Stellplatz"
                  label="Vermietete Garage/Stellplatz (€/Jahr)"
                />
              </div>
            </div>
          )}
        </div>

        {/* Barrierefreiheit and BEG Standard */}
        <div className="mt-4">
          <div className="d-flex align-items-center mb-3">
            <div className="flex-grow-1">
              <Form.Label>Das Objekt ist barrierefrei</Form.Label>
            </div>
            <div className="d-flex gap-3">
              <Form.Check
                inline
                type="radio"
                label="Ja"
                name="barrierefrei"
                checked={formData.objektDetailsAllgemein.barrierefrei === true}
                onChange={() => handleRadioChange('objektDetailsAllgemein', 'barrierefrei', true)}
                className="custom-radio"
              />
              <Form.Check
                inline
                type="radio"
                label="Nein"
                name="barrierefrei"
                checked={formData.objektDetailsAllgemein.barrierefrei === false}
                onChange={() => handleRadioChange('objektDetailsAllgemein', 'barrierefrei', false)}
                className="custom-radio"
              />
            </div>
          </div>

          <div className="d-flex align-items-center mb-3">
            <div className="flex-grow-1">
              <Form.Label>Das Objekt entspricht dem BEG Effizienzhaus 40 Standard</Form.Label>
            </div>
            <div className="d-flex gap-3">
              <Form.Check
                inline
                type="radio"
                label="Ja"
                name="begEffizienzhaus40Standard"
                checked={formData.objektDetailsAllgemein.begEffizienzhaus40Standard === true}
                onChange={() => handleRadioChange('objektDetailsAllgemein', 'begEffizienzhaus40Standard', true)}
                className="custom-radio"
              />
              <Form.Check
                inline
                type="radio"
                label="Nein"
                name="begEffizienzhaus40Standard"
                checked={formData.objektDetailsAllgemein.begEffizienzhaus40Standard === false}
                onChange={() => handleRadioChange('objektDetailsAllgemein', 'begEffizienzhaus40Standard', false)}
                className="custom-radio"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Objektdetails Eigentumswohnung */}
      {(formData.foerderVariante === 'ersterwerb-wohnung' || 
        formData.foerderVariante === 'bestandserwerb-wohnung') && (
        <div className="mb-5">
          <div className="d-flex align-items-center gap-2 mb-4">
            <h4 className="mb-0 text-[#000000] font-semibold italic">Objektdetails Eigentumswohnung</h4>
            <OverlayTrigger
              placement="right"
              overlay={renderTooltip("Details zur Eigentumswohnung")}
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
                  placeholder="Anzahl Vollgeschosse"
                  value={formData.objektDetailsEigentumswohnung.anzahlVollgeschosse}
                  onChange={(e) => handleNestedInputChange('objektDetailsEigentumswohnung', '', 'anzahlVollgeschosse', e.target.value)}
                />
                <label>Anzahl Vollgeschosse</label>
              </Form.Floating>
            </div>
            <div className="col-md-6">
              <Form.Floating>
                <Form.Control
                  type="number"
                  placeholder="Wohnungen am Hauseingang"
                  value={formData.objektDetailsEigentumswohnung.wohnungenAmHauseingang}
                  onChange={(e) => handleNestedInputChange('objektDetailsEigentumswohnung', '', 'wohnungenAmHauseingang', e.target.value)}
                />
                <label>Wohnungen am Hauseingang</label>
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
                />
                <label>Lage im Gebäude (z. B. EG, 1. OG)</label>
              </Form.Floating>
            </div>
            <div className="col-md-6">
              <Form.Floating>
                <Form.Control
                  type="text"
                  placeholder="Lage im Geschoss"
                  value={formData.objektDetailsEigentumswohnung.lageImGeschoss}
                  onChange={(e) => handleNestedInputChange('objektDetailsEigentumswohnung', '', 'lageImGeschoss', e.target.value)}
                />
                <label>Lage im Geschoss (z. B. links)</label>
              </Form.Floating>
            </div>
          </div>
        </div>
      )}

      {/* Objektdetails Neubau/Ersterwerb */}
      {(formData.foerderVariante === 'neubau' || 
        formData.foerderVariante === 'ersterwerb-eigenheim' ||
        formData.foerderVariante === 'ersterwerb-wohnung') && (
        <div className="mb-5">
          <div className="d-flex align-items-center gap-2 mb-4">
            <h4 className="mb-0 text-[#000000] font-semibold italic">Objektdetails Neubau/Ersterwerb</h4>
            <OverlayTrigger
              placement="right"
              overlay={renderTooltip("Details zum Neubau oder Ersterwerb")}
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
              <Form.Label>Baugenehmigung ist erforderlich</Form.Label>
            </div>
            <div className="d-flex gap-3">
              <Form.Check
                inline
                type="radio"
                label="Ja"
                name="baugenehmigungErforderlich"
                checked={formData.objektDetailsNeubauErsterwerb.baugenehmigungErforderlich === true}
                onChange={() => handleRadioChange('objektDetailsNeubauErsterwerb', 'baugenehmigungErforderlich', true)}
                className="custom-radio"
              />
              <Form.Check
                inline
                type="radio"
                label="Nein"
                name="baugenehmigungErforderlich"
                checked={formData.objektDetailsNeubauErsterwerb.baugenehmigungErforderlich === false}
                onChange={() => handleRadioChange('objektDetailsNeubauErsterwerb', 'baugenehmigungErforderlich', false)}
                className="custom-radio"
              />
            </div>
          </div>

          {formData.objektDetailsNeubauErsterwerb.baugenehmigungErforderlich && (
            <>
              <div className="mt-4">
                <Form.Check
                  type="checkbox"
                  label="wurde beantragt"
                  checked={formData.objektDetailsNeubauErsterwerb.baugenehmigung.wurdeBeantragt === true}
                  onChange={(e) => handleNestedInputChange('objektDetailsNeubauErsterwerb', 'baugenehmigung', 'wurdeBeantragt', e.target.checked)}
                />
              </div>

              <div className="mt-3">
                <Form.Check
                  type="checkbox"
                  label="wurde erteilt am"
                  checked={formData.objektDetailsNeubauErsterwerb.baugenehmigung.wurdeErteilt === true}
                  onChange={(e) => handleNestedInputChange('objektDetailsNeubauErsterwerb', 'baugenehmigung', 'wurdeErteilt', e.target.checked)}
                />
                {formData.objektDetailsNeubauErsterwerb.baugenehmigung.wurdeErteilt && (
                  <div className="row g-3 mt-2">
                    <div className="col-md-4">
                      <Form.Floating>
                        <Form.Control
                          type="date"
                          value={formData.objektDetailsNeubauErsterwerb.baugenehmigung.erteilungsDatum}
                          onChange={(e) => handleNestedInputChange('objektDetailsNeubauErsterwerb', 'baugenehmigung', 'erteilungsDatum', e.target.value)}
                        />
                        <label>Datum</label>
                      </Form.Floating>
                    </div>
                    <div className="col-md-4">
                      <Form.Floating>
                        <Form.Control
                          type="text"
                          placeholder="Aktenzeichen"
                          value={formData.objektDetailsNeubauErsterwerb.baugenehmigung.aktenzeichen}
                          onChange={(e) => handleNestedInputChange('objektDetailsNeubauErsterwerb', 'baugenehmigung', 'aktenzeichen', e.target.value)}
                        />
                        <label>Aktenzeichen</label>
                      </Form.Floating>
                    </div>
                    <div className="col-md-4">
                      <Form.Floating>
                        <Form.Control
                          type="text"
                          placeholder="von"
                          value={formData.objektDetailsNeubauErsterwerb.baugenehmigung.erteilungsBehoerde}
                          onChange={(e) => handleNestedInputChange('objektDetailsNeubauErsterwerb', 'baugenehmigung', 'erteilungsBehoerde', e.target.value)}
                        />
                        <label>von</label>
                      </Form.Floating>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="mt-4">
            <div className="d-flex align-items-center mb-3">
              <div className="flex-grow-1">
                <Form.Label>Bauanzeige/Bauantrag wurde eingereicht</Form.Label>
              </div>
              <div className="d-flex gap-3">
                <Form.Check
                  inline
                  type="radio"
                  label="Ja"
                  name="bauanzeigeEingereicht"
                  checked={formData.objektDetailsNeubauErsterwerb.bauanzeige.einreichungsDatum !== ''}
                  onChange={() => handleNestedInputChange('objektDetailsNeubauErsterwerb', 'bauanzeige', 'einreichungsDatum', new Date().toISOString().split('T')[0])}
                  className="custom-radio"
                />
                <Form.Check
                  inline
                  type="radio"
                  label="Nein"
                  name="bauanzeigeEingereicht"
                  checked={formData.objektDetailsNeubauErsterwerb.bauanzeige.einreichungsDatum === ''}
                  onChange={() => handleNestedInputChange('objektDetailsNeubauErsterwerb', 'bauanzeige', 'einreichungsDatum', '')}
                  className="custom-radio"
                />
              </div>
            </div>

            {formData.objektDetailsNeubauErsterwerb.bauanzeige.einreichungsDatum !== '' && (
              <div className="row g-3">
                <div className="col-12">
                  <Form.Floating>
                    <Form.Control
                      type="date"
                      placeholder="wurde eingereicht am"
                      value={formData.objektDetailsNeubauErsterwerb.bauanzeige.einreichungsDatum}
                      onChange={(e) => handleNestedInputChange('objektDetailsNeubauErsterwerb', 'bauanzeige', 'einreichungsDatum', e.target.value)}
                    />
                    <label>wurde eingereicht am</label>
                  </Form.Floating>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4">
            <div className="d-flex align-items-center mb-3">
              <div className="flex-grow-1">
                <Form.Label>mit den Bauarbeiten wurde begonnen</Form.Label>
              </div>
              <div className="d-flex gap-3">
                <Form.Check
                  inline
                  type="radio"
                  label="Ja"
                  name="bauarbeitenBegonnen"
                  checked={formData.objektDetailsNeubauErsterwerb.bauarbeiten.wurdeBegonnen === true}
                  onChange={() => handleNestedInputChange('objektDetailsNeubauErsterwerb', 'bauarbeiten', 'wurdeBegonnen', true)}
                  className="custom-radio"
                />
                <Form.Check
                  inline
                  type="radio"
                  label="Nein"
                  name="bauarbeitenBegonnen"
                  checked={formData.objektDetailsNeubauErsterwerb.bauarbeiten.wurdeBegonnen === false}
                  onChange={() => handleNestedInputChange('objektDetailsNeubauErsterwerb', 'bauarbeiten', 'wurdeBegonnen', false)}
                  className="custom-radio"
                />
              </div>
            </div>

            {formData.objektDetailsNeubauErsterwerb.bauarbeiten.wurdeBegonnen && (
              <div className="row g-3">
                <div className="col-12">
                  <Form.Floating>
                    <Form.Control
                      type="date"
                      placeholder="Datum Baubeginn"
                      value={formData.objektDetailsNeubauErsterwerb.bauarbeiten.beginnDatum}
                      onChange={(e) => handleNestedInputChange('objektDetailsNeubauErsterwerb', 'bauarbeiten', 'beginnDatum', e.target.value)}
                    />
                    <label>Datum Baubeginn</label>
                  </Form.Floating>
                </div>
              </div>
            )}
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
              overlay={renderTooltip("Details zum Bestandserwerb")}
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
                  placeholder="Baujahr des Förderobjekts"
                  value={formData.objektDetailsBestandserwerb.baujahr}
                  onChange={(e) => handleNestedInputChange('objektDetailsBestandserwerb', '', 'baujahr', e.target.value)}
                />
                <label>Baujahr des Förderobjekts</label>
              </Form.Floating>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Step3_Objektdetails; 