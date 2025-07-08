import React, { useState, useEffect } from 'react';
import { Form, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import AreaInput from '../common/AreaInput';

// Add styles
const styles = `
  .form-check-input:checked {
    background-color: #064497 !important;
    border-color: #064497 !important;
  }
  .add-element-btn {
    color: #064497;
    border-color: #064497;
    display: inline-block;
  }
  .add-element-btn:hover, .add-element-btn:focus {
    background-color: #064497 !important;
    color: #fff !important;
  }
  .section-header {
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    background-color: #f8f9fa;
    border-radius: 0.375rem;
    margin-bottom: 1rem;
    transition: background-color 0.2s ease;
  }
  .section-header:hover {
    background-color: #e9ecef;
  }
  .section-header h3 {
    margin: 0;
    font-size: 1.1rem;
  }
  .section-content {
    padding: 1rem;
    margin-bottom: 1rem;
  }
  .expand-icon {
    transition: transform 0.2s ease;
  }
  .expand-icon.expanded {
    transform: rotate(180deg);
  }
  .floor-header {
    background-color: #f8f9fa;
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
    font-weight: 600;
    border: 1px solid #e9ecef;
  }
  .volume-element-row {
    background-color: #ffffff;
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
    border: 1px solid #e9ecef;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  .info-section {
    background-color: #ffffff;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 2rem;
    border: 1px solid #e9ecef;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  .summary-card {
    background-color: #ffffff;
    border-radius: 0.5rem;
    padding: 1.5rem;
    margin-bottom: 1rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border: 1px solid #e9ecef;
  }
  .summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 0;
    border-bottom: 1px solid #f1f3f4;
  }
  .summary-row:last-child {
    border-bottom: none;
    font-weight: 600;
    font-size: 1.1rem;
    color: #064497;
  }
  .summary-label {
    color: #495057;
    font-weight: 500;
  }
  .summary-value {
    color: #000000;
    font-weight: 600;
  }
  .roof-geometry-section {
    background-color: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-left: 1rem;
    margin-top: 1rem;
  }
  .roof-geometry-title {
    color: #064497;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

`;

// Floor options for building levels
const FLOOR_OPTIONS = [
  ...Array.from({ length: 3 }, (_, i) => ({ value: `ug_${3-i}`, label: `${3-i}. Untergeschoss` })),
  { value: 'kellergeschoss', label: 'Kellergeschoss' },
  { value: 'souterrain', label: 'Souterrain' },
  { value: 'erdgeschoss', label: 'Erdgeschoss' },
  ...Array.from({ length: 40 }, (_, i) => ({ value: `og_${i+1}`, label: `${i+1}. Obergeschoss` })),
  { value: 'galerie', label: 'Galerie / Zwischenebene' },
  { value: 'staffelgeschoss', label: 'Staffelgeschoss' },
  { value: 'dachgeschoss', label: 'Dachgeschoss' },
  { value: 'sonstiges', label: 'Sonstiges' }
];

interface VolumeElement {
  id: string;
  label: string;
  length_m: string;
  width_m: string;
  height_m: string;
  hasSlopedRoof?: boolean;
  traufhoehe?: string;
  firsthoehe?: string;
}

interface BuildingLevel {
  id: string;
  name: string;
  volumeElements: VolumeElement[];
}

interface Din277Data {
  buildingLevels: BuildingLevel[];
  // Calculated values
  totalVolume?: number;
}

const renderTooltip = (text: string) => (
  <Tooltip id="button-tooltip">
    {text}
  </Tooltip>
);

interface Props {
  data: Din277Data;
  onChange: (data: Partial<Din277Data>) => void;
  showValidation: boolean;
  isReadOnly?: boolean;
}

const Din277Form: React.FC<Props> = ({ data, onChange, showValidation, isReadOnly = false }) => {
  const [expandedSection, setExpandedSection] = useState<string>('1');

  // Initialize data if empty
  useEffect(() => {
    if (!data.buildingLevels || data.buildingLevels.length === 0) {
      onChange({
        buildingLevels: [{
          id: 'level_1',
          name: 'Erdgeschoss',
          volumeElements: []
        }]
      });
    }
  }, [data, onChange]);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? '' : section);
  };

  // Helper function to generate unique IDs
  const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Calculate volume for a single element
  const calculateElementVolume = (element: VolumeElement): number => {
    const length = parseFloat(element.length_m?.replace(',', '.') || '0') || 0;
    const width = parseFloat(element.width_m?.replace(',', '.') || '0') || 0;
    
    if (element.hasSlopedRoof && element.traufhoehe && element.firsthoehe) {
      // Calculate average height for sloped roof
      const traufhoehe = parseFloat(element.traufhoehe.replace(',', '.') || '0') || 0;
      const firsthoehe = parseFloat(element.firsthoehe.replace(',', '.') || '0') || 0;
      const averageHeight = (traufhoehe + firsthoehe) / 2;
      return length * width * averageHeight;
    } else {
      const height = parseFloat(element.height_m?.replace(',', '.') || '0') || 0;
      return length * width * height;
    }
  };

  // Calculate total volume for a building level
  const calculateLevelVolume = (level: BuildingLevel): number => {
    return level.volumeElements.reduce((sum, element) => sum + calculateElementVolume(element), 0);
  };

  // Calculate total building volume
  const calculateTotalVolume = (): number => {
    return (data.buildingLevels || []).reduce((sum, level) => sum + calculateLevelVolume(level), 0);
  };

  // Update calculations whenever data changes
  useEffect(() => {
    const totalVolume = calculateTotalVolume();
    
    onChange({
      ...data,
      totalVolume
    });
  }, [data.buildingLevels]);

  // Validation functions
  const getValidationErrors = (): string[] => {
    if (!showValidation) return [];
    
    const errors: string[] = [];
    
    // Check if any data was entered
    const hasData = (data.buildingLevels || []).some(level => 
      level.volumeElements?.length > 0 && level.volumeElements.some(element => 
        element.label?.trim() || element.length_m || element.width_m || element.height_m
      )
    );

    if (!hasData) {
      errors.push('Bitte fügen Sie mindestens ein Volumenelement hinzu');
    }
    
    // Validate building levels
    (data.buildingLevels || []).forEach((level, levelIdx) => {
      if (!level.name.trim()) {
        errors.push(`Geschoss ${levelIdx + 1}: Name ist erforderlich`);
      }
      
      level.volumeElements.forEach((element, elementIdx) => {
        if (!element.label.trim()) {
          errors.push(`${level.name} - Element ${elementIdx + 1}: Bezeichnung ist erforderlich`);
        }
        if (!element.length_m) {
          errors.push(`${level.name} - ${element.label}: Länge ist erforderlich`);
        }
        if (!element.width_m) {
          errors.push(`${level.name} - ${element.label}: Breite ist erforderlich`);
        }
        
        if (element.hasSlopedRoof) {
          if (!element.traufhoehe) {
            errors.push(`${level.name} - ${element.label}: Traufhöhe ist erforderlich`);
          }
          if (!element.firsthoehe) {
            errors.push(`${level.name} - ${element.label}: Firsthöhe ist erforderlich`);
          }
        } else {
          if (!element.height_m) {
            errors.push(`${level.name} - ${element.label}: Höhe ist erforderlich`);
          }
        }
      });
    });
    
    return errors;
  };

  // Helper function to render section header
  const renderSectionHeader = (id: string, title: string) => (
    <div 
      className="section-header" 
      onClick={() => toggleSection(id)}
    >
      <div className="d-flex align-items-center gap-2">
        <h3 className="text-xl font-medium text-[#000000] mb-0">{title}</h3>
      </div>
      <div className={`expand-icon ${expandedSection === id ? 'expanded' : ''}`}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 10L12 15L17 10" stroke="#064497" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );

  // Update building level
  const updateBuildingLevel = (levelId: string, updates: Partial<BuildingLevel>) => {
    const updatedLevels = (data.buildingLevels || []).map(level =>
      level.id === levelId ? { ...level, ...updates } : level
    );
    onChange({ buildingLevels: updatedLevels });
  };

  // Update volume element in a level
  const updateVolumeElement = (levelId: string, elementId: string, updates: Partial<VolumeElement>) => {
    const updatedLevels = (data.buildingLevels || []).map(level => {
      if (level.id === levelId) {
        const updatedElements = level.volumeElements.map(element =>
          element.id === elementId ? { ...element, ...updates } : element
        );
        return { ...level, volumeElements: updatedElements };
      }
      return level;
    });
    onChange({ buildingLevels: updatedLevels });
  };



  return (
    <Form>
      <style>
        {styles}
      </style>

      {/* Information Section - Always Visible */}
      <div className="info-section">
        <h4 className="mb-3" style={{ color: '#064497', fontSize: '1.1rem', fontWeight: '600' }}>
          Brutto-Rauminhalt nach DIN 277
        </h4>
        
        <div className="mb-4">
          <p className="mb-3" style={{ lineHeight: '1.6', fontSize: '1rem' }}>
            Der Brutto-Rauminhalt (BRI) umfasst das gesamte von den äußeren Begrenzungsflächen 
            umschlossene Volumen des Bauwerks nach <strong>DIN 277</strong>.
          </p>
          
          <ul className="mb-4" style={{ paddingLeft: '1.5rem', lineHeight: '1.6' }}>
            <li>Berechnung erfolgt durch <strong>Länge × Breite × Höhe</strong> für jeden Gebäudeteil</li>
            <li>Gemessen wird von <strong>Außenkante zu Außenkante</strong> der umschließenden Bauteile</li>
            <li>Alle oberirdischen und unterirdischen Geschosse werden erfasst</li>
            <li>Bei Dächern kann die <strong>mittlere Höhe</strong> angesetzt werden</li>
          </ul>
        </div>

        <div className="mb-4 p-3 ml-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '0.75rem', borderLeft: '4px solid #064497', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
          <h5 className="mb-2" style={{ color: '#064497', fontSize: '1rem', fontWeight: '600' }}>
            Hinweis zur Eingabe mehrerer Volumenelemente pro Geschoss
          </h5>
          <p className="mb-2" style={{ lineHeight: '1.6', fontSize: '0.95rem' }}>
            In vielen Fällen lässt sich ein Geschoss als einfacher, rechteckiger Baukörper beschreiben – dann genügt ein einzelnes Volumenelement mit Länge, Breite und Höhe zur Berechnung des umbauten Raums.
          </p>
          <p className="mb-2" style={{ lineHeight: '1.6', fontSize: '0.95rem' }}>
            Wenn ein Geschoss jedoch baulich komplexer ist, empfiehlt es sich, mehrere Volumenelemente anzulegen. Dies ist insbesondere dann notwendig, wenn:
          </p>
          <ul className="mb-2" style={{ paddingLeft: '1.5rem', lineHeight: '1.5', fontSize: '0.95rem' }}>
            <li>das Geschoss Vorsprünge oder Rücksprünge hat (z. B. Erker, Eingangsbereich, Terrassenüberdachung),</li>
            <li>Anbauten vorhanden sind, die eine andere Höhe als der Hauptbaukörper aufweisen (z. B. Garage, Technikraum),</li>
            <li>das Dachgeschoss nicht gleichmäßig hoch ist oder schräg verläuft, sodass einzelne Bereiche getrennt berechnet werden müssen,</li>
            <li>es sich um ein Split-Level, eine Galerie oder eine Zwischenebene handelt.</li>
          </ul>
          <p className="mb-2" style={{ lineHeight: '1.6', fontSize: '0.95rem' }}>
            In diesen Fällen kannst du für jedes geometrisch eigenständige Bauteil ein eigenes Volumenelement anlegen und die Maße getrennt eingeben. Die Software berechnet daraus automatisch das jeweilige Teilvolumen sowie die Summe aller Volumina eines Geschosses.
          </p>
          <small className="text-muted ml-2">
            <strong>Hinweis:</strong> Je präziser die Bauteile erfasst werden, desto genauer ist die Berechnung des Brutto-Rauminhalts gemäß DIN 277.
          </small>
        </div>

        <div className="mb-4 p-3 ml-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '0.75rem', borderLeft: '4px solid #064497', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
          <h5 className="mb-2" style={{ color: '#064497', fontSize: '1rem', fontWeight: '600' }}>
            Besonderheit: Dachgeschosse
          </h5>
          <p className="mb-2" style={{ lineHeight: '1.6', fontSize: '0.95rem' }}>
            Bei geneigten Dächern kann die mittlere Höhe verwendet werden:
          </p>
          <ul className="mb-2" style={{ paddingLeft: '1.5rem', lineHeight: '1.5', fontSize: '0.95rem' }}>
            <li><strong>Traufhöhe:</strong> Höhe bis zur Dachtraufe</li>
            <li><strong>Firsthöhe:</strong> Höhe bis zum Dachfirst</li>
            <li><strong>Mittlere Höhe:</strong> (Traufhöhe + Firsthöhe) ÷ 2</li>
          </ul>
          <small className="text-muted ml-2">
            → Diese Vereinfachung ist für die meisten Dachformen zulässig.
          </small>
        </div>
      </div>
      
      {/* Section 1: Building Levels */}
      {renderSectionHeader('1', '1. Gebäudevolumen nach Geschossen')}
      {expandedSection === '1' && (
        <div className="section-content">
          {/* Building Levels */}
          {(data.buildingLevels || []).map((level, levelIdx) => (
            <div key={level.id} className="mb-4">
              {/* Level Header */}
              <div className="floor-header d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-3 flex-grow-1">
                  <Form.Floating style={{ minWidth: '200px' }}>
                    <Form.Select
                      value={level.name}
                      onChange={(e) => {
                        const selectedOption = FLOOR_OPTIONS.find(opt => opt.label === e.target.value);
                        updateBuildingLevel(level.id, { name: selectedOption ? selectedOption.label : e.target.value });
                      }}
                      disabled={isReadOnly}
                    >
                      <option value="">Geschoss wählen</option>
                      {FLOOR_OPTIONS.map(option => (
                        <option key={option.value} value={option.label}>{option.label}</option>
                      ))}
                    </Form.Select>
                    <label>Geschoss</label>
                  </Form.Floating>
                  <span className="text-muted fw-medium">
                    Zwischensumme: {calculateLevelVolume(level).toFixed(2)} m³
                  </span>
                </div>
                {!isReadOnly && (data.buildingLevels || []).length > 1 && (
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => {
                      const updatedLevels = (data.buildingLevels || []).filter(l => l.id !== level.id);
                      onChange({ buildingLevels: updatedLevels });
                    }}
                    disabled={isReadOnly}
                  >
                    Geschoss löschen
                  </Button>
                )}
              </div>

              {/* Volume Elements in this level */}
              {level.volumeElements.map((element, elementIdx) => (
                <div key={element.id} className="volume-element-row">
                  {/* Delete button for element */}
                  {!isReadOnly && (
                    <div className="d-flex justify-content-end mb-2">
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => {
                          const updatedElements = level.volumeElements.filter(e => e.id !== element.id);
                          updateBuildingLevel(level.id, { volumeElements: updatedElements });
                        }}
                        disabled={isReadOnly}
                      >
                        Element löschen
                      </Button>
                    </div>
                  )}

                  {/* Element details */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-3">
                      <Form.Floating>
                        <Form.Control
                          type="text"
                          value={element.label}
                          onChange={(e) => updateVolumeElement(level.id, element.id, { label: e.target.value })}
                          placeholder="Bezeichnung (z.B. Hauptgebäude)"
                          disabled={isReadOnly}
                        />
                        <label>Bezeichnung (z.B. Hauptgebäude)</label>
                      </Form.Floating>
                    </div>
                    <div className="col-md-2">
                      <AreaInput
                        value={element.length_m || ''}
                        onChange={(val) => updateVolumeElement(level.id, element.id, { length_m: val })}
                        placeholder="Länge"
                        label="Länge (m)"
                        disabled={isReadOnly}
                      />
                    </div>
                    <div className="col-md-2">
                      <AreaInput
                        value={element.width_m || ''}
                        onChange={(val) => updateVolumeElement(level.id, element.id, { width_m: val })}
                        placeholder="Breite"
                        label="Breite (m)"
                        disabled={isReadOnly}
                      />
                    </div>
                    <div className="col-md-2">
                      <AreaInput
                        value={element.height_m || ''}
                        onChange={(val) => updateVolumeElement(level.id, element.id, { height_m: val })}
                        placeholder="Höhe"
                        label="Höhe (m)"
                        disabled={element.hasSlopedRoof || isReadOnly}
                      />
                    </div>
                    <div className="col-md-3">
                      <div className="d-flex align-items-center h-100">
                        <Form.Check
                          type="checkbox"
                          label="Geneigtes Dach"
                          checked={element.hasSlopedRoof || false}
                          onChange={(e) => updateVolumeElement(level.id, element.id, { 
                            hasSlopedRoof: e.target.checked,
                            traufhoehe: e.target.checked ? element.traufhoehe || '' : undefined,
                            firsthoehe: e.target.checked ? element.firsthoehe || '' : undefined
                          })}
                          disabled={isReadOnly}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sloped roof details */}
                  {element.hasSlopedRoof && (
                    <div className="roof-geometry-section">
                      <div className="roof-geometry-title mb-2">
                        Dachgeometrie (Satteldach)
                      </div>
                      <small className="text-muted d-block mb-3">
                        Geben Sie Trauf- und Firsthöhe an. Die mittlere Höhe wird automatisch berechnet.
                      </small>
                      <div className="row g-3">
                        <div className="col-md-4">
                          <AreaInput
                            value={element.traufhoehe || ''}
                            onChange={(val) => updateVolumeElement(level.id, element.id, { traufhoehe: val })}
                            placeholder="Traufhöhe"
                            label="Traufhöhe (m)"
                            disabled={isReadOnly}
                          />
                          <small className="text-muted d-block mt-1">Höhe bis Dachtraufe</small>
                        </div>
                        <div className="col-md-4">
                          <AreaInput
                            value={element.firsthoehe || ''}
                            onChange={(val) => updateVolumeElement(level.id, element.id, { firsthoehe: val })}
                            placeholder="Firsthöhe"
                            label="Firsthöhe (m)"
                            disabled={isReadOnly}
                          />
                          <small className="text-muted d-block mt-1">Höhe bis Dachfirst</small>
                        </div>
                        <div className="col-md-4">
                          <Form.Floating>
                            <Form.Control
                              type="text"
                              value={(() => {
                                const traufhoehe = parseFloat(element.traufhoehe?.replace(',', '.') || '0') || 0;
                                const firsthoehe = parseFloat(element.firsthoehe?.replace(',', '.') || '0') || 0;
                                return traufhoehe && firsthoehe ? ((traufhoehe + firsthoehe) / 2).toFixed(2) : '';
                              })()}
                              disabled
                              placeholder="Mittlere Höhe"
                            />
                            <label>Mittlere Höhe (m)</label>
                          </Form.Floating>
                          <small className="text-muted d-block mt-1">Automatisch berechnet</small>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Show calculated volume for this element */}
                  <div className="text-end mt-2">
                    <small className="text-muted">
                      Volumen: <strong>{calculateElementVolume(element).toFixed(2)} m³</strong>
                    </small>
                  </div>
                </div>
              ))}

              {/* Add element button */}
              {!isReadOnly && (
                <Button
                  variant="outline-primary"
                  className="add-element-btn mt-2"
                  onClick={() => {
                    const newElement: VolumeElement = {
                      id: generateId(),
                      label: '',
                      length_m: '',
                      width_m: '',
                      height_m: ''
                    };
                    updateBuildingLevel(level.id, { volumeElements: [...level.volumeElements, newElement] });
                  }}
                  disabled={isReadOnly}
                >
                  + Volumenelement hinzufügen
                </Button>
              )}
            </div>
          ))}

          {/* Add building level button */}
          {!isReadOnly && (
            <Button
              variant="outline-primary"
              className="add-element-btn mt-3"
              onClick={() => {
                const newLevel: BuildingLevel = {
                  id: generateId(),
                  name: `${(data.buildingLevels || []).length + 1}. Geschoss`,
                  volumeElements: []
                };
                onChange({ buildingLevels: [...(data.buildingLevels || []), newLevel] });
              }}
              disabled={isReadOnly}
            >
              + Geschoss hinzufügen
            </Button>
          )}
        </div>
      )}

      {/* Section 2: Summary */}
      {renderSectionHeader('2', '2. Zusammenfassung')}
      {expandedSection === '2' && (
        <div className="section-content">
          <div className="summary-card">
            <h5 className="mb-3" style={{ fontWeight: 600, color: '#000000', fontSize: '1.2rem' }}>Gesamtübersicht</h5>
            
            {/* Main Total */}
            <div className="row g-4 mb-4">
              <div className="col-md-12">
                <div className="text-center p-3" style={{ backgroundColor: '#064497', borderRadius: '0.5rem', color: 'white' }}>
                  <div className="text-white-50 small mb-1">Brutto-Rauminhalt (BRI)</div>
                  <div className="h4 mb-0 text-white">{calculateTotalVolume().toFixed(2)} m³</div>
                </div>
              </div>
            </div>
            
            {/* Detailed breakdown */}
            <div className="mt-4">
              <h5 className="mb-3" style={{ fontWeight: 600, color: '#495057' }}>Aufschlüsselung nach Geschossen</h5>
              {(data.buildingLevels || []).map((level) => (
                <div key={level.id} className="summary-row">
                  <span className="summary-label">{level.name}</span>
                  <span className="summary-value">{calculateLevelVolume(level).toFixed(2)} m³</span>
                </div>
              ))}
              <div className="summary-row">
                <span className="summary-label">Gesamtvolumen (BRI)</span>
                <span className="summary-value">{calculateTotalVolume().toFixed(2)} m³</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {showValidation && (() => {
        const errors = getValidationErrors();
        return errors.length > 0 ? (
          <div className="alert alert-danger mt-3" role="alert">
            <h6>Bitte korrigieren Sie folgende Fehler:</h6>
            <ul className="mb-0">
              {errors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null;
      })()}
    </Form>
  );
};

export default Din277Form; 