import React, { useState, useEffect } from 'react';
import { Form, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import AreaInput from '../common/AreaInput';

// Add styles
const styles = `
  .form-check-input:checked {
    background-color: #064497 !important;
    border-color: #064497 !important;
  }
  .add-person-btn {
    color: #064497;
    border-color: #064497;
    display: inline-block;
  }
  .add-person-btn:hover, .add-person-btn:focus {
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
  .room-row {
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
  .dachschraege-section {
    background-color: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-left: 1rem;
    margin-top: 1rem;
  }
  .dachschraege-title {
    color: #064497;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }
`;

// Room types with their calculation factors
const ROOM_TYPES = [
  { value: 'wohnraum', label: 'Wohnraum', factor: 1.0 },
  { value: 'balkon', label: 'Balkon/Terrasse/Loggia', factor: 0.5 },
  { value: 'nebenraum', label: 'Nebenraum', factor: 1.0 }
];

const NUTZFLAECHE_TYPES = [
  { value: 'keller', label: 'Keller', factor: 1.0 },
  { value: 'abstellraum', label: 'Abstellraum', factor: 1.0 },
  { value: 'garage', label: 'Garage', factor: 1.0 },
  { value: 'dachboden', label: 'Dachboden', factor: 1.0 },
  { value: 'waschkueche', label: 'Waschküche', factor: 1.0 },
  { value: 'heizraum', label: 'Heizraum', factor: 1.0 },
  { value: 'sonstiges', label: 'Sonstiges', factor: 1.0 }
];

// Floor options from 3. UG to 40. OG
const FLOOR_OPTIONS = [
  ...Array.from({ length: 3 }, (_, i) => ({ value: `ug_${3-i}`, label: `${3-i}. Untergeschoss` })),
  { value: 'souterrain', label: 'Souterrain' },
  { value: 'erdgeschoss', label: 'Erdgeschoss' },
  ...Array.from({ length: 40 }, (_, i) => ({ value: `og_${i+1}`, label: `${i+1}. Obergeschoss` })),
  { value: 'galerie', label: 'Galerie / Zwischenebene' },
  { value: 'staffelgeschoss', label: 'Staffelgeschoss' },
  { value: 'dachgeschoss', label: 'Dachgeschoss' },
  { value: 'sonstiges', label: 'Sonstiges' }
];

interface Room {
  id: string;
  name: string;
  type: string;
  totalArea: string;
  hasDachschraege: boolean;
  areaUnder1m?: string;
  area1to2m?: string;
  areaOver2m?: string;
}

interface Floor {
  id: string;
  name: string;
  rooms: Room[];
}

interface WoFIVData {
  wohnflaecheFloors: Floor[];
  nutzflaecheRooms: Room[];
  // Calculated values
  totalWohnflaeche?: number;
  totalNutzflaeche?: number;
  totalCombined?: number;
}

const renderTooltip = (text: string) => (
  <Tooltip id="button-tooltip">
    {text}
  </Tooltip>
);

interface Props {
  data: WoFIVData;
  onChange: (data: Partial<WoFIVData>) => void;
  showValidation: boolean;
  isReadOnly?: boolean;
}

const WoFIVForm: React.FC<Props> = ({ data, onChange, showValidation, isReadOnly = false }) => {
  const [expandedSection, setExpandedSection] = useState<string>('1');

  // Initialize data if empty
  useEffect(() => {
    if (!data.wohnflaecheFloors || data.wohnflaecheFloors.length === 0) {
      onChange({
        wohnflaecheFloors: [{
          id: 'floor_1',
          name: 'Erdgeschoss',
          rooms: []
        }],
        nutzflaecheRooms: []
      });
    }
  }, [data, onChange]);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? '' : section);
  };

  // Helper function to generate unique IDs
  const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Calculate area for a room based on type and Dachschräge
  const calculateRoomArea = (room: Room): number => {
    if (!room.totalArea) return 0;
    
    const totalArea = parseFloat(room.totalArea.replace(',', '.')) || 0;
    
    if (room.hasDachschraege) {
      const under1m = parseFloat((room.areaUnder1m || '0').replace(',', '.')) || 0;
      const area1to2m = parseFloat((room.area1to2m || '0').replace(',', '.')) || 0;
      const over2m = parseFloat((room.areaOver2m || '0').replace(',', '.')) || 0;
      
      // Dachschräge calculation: <1m=0%, 1-2m=50%, >2m=100%
      return (under1m * 0) + (area1to2m * 0.5) + (over2m * 1.0);
    } else {
      // Apply room type factor
      const roomType = ROOM_TYPES.find(type => type.value === room.type);
      const factor = roomType ? roomType.factor : 1.0;
      return totalArea * factor;
    }
  };

  // Calculate total for a floor
  const calculateFloorTotal = (floor: Floor): number => {
    return floor.rooms.reduce((sum, room) => sum + calculateRoomArea(room), 0);
  };

  // Calculate total Wohnfläche
  const calculateTotalWohnflaeche = (): number => {
    return (data.wohnflaecheFloors || []).reduce((sum, floor) => sum + calculateFloorTotal(floor), 0);
  };

  // Calculate total Nutzfläche
  const calculateTotalNutzflaeche = (): number => {
    return (data.nutzflaecheRooms || []).reduce((sum, room) => {
      const area = parseFloat((room.totalArea || '0').replace(',', '.')) || 0;
      return sum + area;
    }, 0);
  };

  // Update calculations whenever data changes
  useEffect(() => {
    const totalWohnflaeche = calculateTotalWohnflaeche();
    const totalNutzflaeche = calculateTotalNutzflaeche();
    const totalCombined = totalWohnflaeche + totalNutzflaeche;
    
    onChange({
      ...data,
      totalWohnflaeche,
      totalNutzflaeche,
      totalCombined
    });
  }, [data.wohnflaecheFloors, data.nutzflaecheRooms]);

  // Validation functions
  const validateDachschraege = (room: Room): string[] => {
    if (!room.hasDachschraege) return [];
    
    const errors: string[] = [];
    const totalArea = parseFloat((room.totalArea || '0').replace(',', '.')) || 0;
    const under1m = parseFloat((room.areaUnder1m || '0').replace(',', '.')) || 0;
    const area1to2m = parseFloat((room.area1to2m || '0').replace(',', '.')) || 0;
    const over2m = parseFloat((room.areaOver2m || '0').replace(',', '.')) || 0;
    
    const sumSubAreas = under1m + area1to2m + over2m;
    const tolerance = 0.01; // Allow small rounding differences
    
    if (Math.abs(sumSubAreas - totalArea) > tolerance) {
      errors.push(`${room.name}: Dachschrägen-Teilflächen (${sumSubAreas.toFixed(2)} m²) stimmen nicht mit Gesamtfläche (${totalArea.toFixed(2)} m²) überein`);
    }
    
    return errors;
  };

  const getValidationErrors = (): string[] => {
    if (!showValidation) return [];
    
    const errors: string[] = [];
    
    // Check if any data was entered
    const hasWohnflaecheData = (data.wohnflaecheFloors || []).some(floor => 
      floor.rooms?.length > 0 && floor.rooms.some(room => 
        room.name?.trim() || room.type || room.totalArea
      )
    );

    const hasNutzflaecheData = (data.nutzflaecheRooms || []).some(room => 
      room.name?.trim() || room.type || room.totalArea
    );

    if (!hasWohnflaecheData && !hasNutzflaecheData) {
      errors.push('Bitte fügen Sie mindestens einen Raum hinzu');
    }
    
    // Validate Wohnfläche floors and rooms
    (data.wohnflaecheFloors || []).forEach((floor, floorIdx) => {
      if (!floor.name.trim()) {
        errors.push(`Geschoss ${floorIdx + 1}: Name ist erforderlich`);
      }
      
      floor.rooms.forEach((room, roomIdx) => {
        if (!room.name.trim()) {
          errors.push(`${floor.name} - Raum ${roomIdx + 1}: Raumname ist erforderlich`);
        }
        if (!room.type) {
          errors.push(`${floor.name} - ${room.name}: Raumtyp ist erforderlich`);
        }
        if (!room.totalArea) {
          errors.push(`${floor.name} - ${room.name}: Gesamtfläche ist erforderlich`);
        }
        
        // Validate Dachschräge if enabled
        errors.push(...validateDachschraege(room));
      });
    });
    
    // Validate Nutzfläche rooms
    (data.nutzflaecheRooms || []).forEach((room, roomIdx) => {
      if (!room.name.trim()) {
        errors.push(`Nutzfläche - Raum ${roomIdx + 1}: Raumname ist erforderlich`);
      }
      if (!room.type) {
        errors.push(`Nutzfläche - ${room.name}: Raumtyp ist erforderlich`);
      }
      if (!room.totalArea) {
        errors.push(`Nutzfläche - ${room.name}: Gesamtfläche ist erforderlich`);
      }
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

  // Update floor in wohnflaecheFloors
  const updateFloor = (floorId: string, updates: Partial<Floor>) => {
    const updatedFloors = (data.wohnflaecheFloors || []).map(floor =>
      floor.id === floorId ? { ...floor, ...updates } : floor
    );
    onChange({ wohnflaecheFloors: updatedFloors });
  };

  // Update room in a floor
  const updateRoom = (floorId: string, roomId: string, updates: Partial<Room>) => {
    const updatedFloors = (data.wohnflaecheFloors || []).map(floor => {
      if (floor.id === floorId) {
        const updatedRooms = floor.rooms.map(room =>
          room.id === roomId ? { ...room, ...updates } : room
        );
        return { ...floor, rooms: updatedRooms };
      }
      return floor;
    });
    onChange({ wohnflaecheFloors: updatedFloors });
  };

  // Helper function to get counter for room type
  const getRoomTypeCounter = (roomType: string, excludeRoomId?: string): number => {
    const roomTypeData = NUTZFLAECHE_TYPES.find(type => type.value === roomType);
    if (!roomTypeData) return 1;
    
    const existingRoomsOfType = (data.nutzflaecheRooms || []).filter(room => 
      room.type === roomType && room.id !== excludeRoomId
    );
    
    return existingRoomsOfType.length + 1;
  };

  // Update Nutzfläche room
  const updateNutzflaecheRoom = (roomId: string, updates: Partial<Room>) => {
    // If updating room type and name is empty, auto-fill with type label + counter
    if (updates.type && !updates.name) {
      const currentRoom = (data.nutzflaecheRooms || []).find(room => room.id === roomId);
      if (currentRoom && !currentRoom.name.trim()) {
        const roomTypeData = NUTZFLAECHE_TYPES.find(type => type.value === updates.type);
        if (roomTypeData) {
          const counter = getRoomTypeCounter(updates.type, roomId);
          updates.name = `${roomTypeData.label} ${counter}`;
        }
      }
    }
    
    const updatedRooms = (data.nutzflaecheRooms || []).map(room =>
      room.id === roomId ? { ...room, ...updates } : room
    );
    onChange({ nutzflaecheRooms: updatedRooms });
  };

  return (
    <Form>
      <style>
        {styles}
      </style>

      {/* Information Section - Always Visible */}
      <div className="info-section">
        <h4 className="mb-3" style={{ color: '#064497', fontSize: '1.1rem', fontWeight: '600' }}>
          Wohnflächenberechnung nach WoFlV
        </h4>
        
        <div className="mb-4">
          <p className="mb-3" style={{ lineHeight: '1.6', fontSize: '1rem' }}>
            Die Wohnflächenberechnung erfolgt nach den Vorgaben der <strong>Wohnflächenverordnung (WoFlV)</strong>. 
            Dabei werden verschiedene Raumtypen unterschiedlich gewichtet:
          </p>
          
          <ul className="mb-4" style={{ paddingLeft: '1.5rem', lineHeight: '1.6' }}>
            <li><strong>Wohnräume</strong> (Wohnzimmer, Schlafzimmer, Küche, Bad): 100% anrechenbar</li>
            <li><strong>Balkone, Loggien, Terrassen</strong>: 50% anrechenbar</li>
            <li><strong>Nebenräume</strong> (Abstellkammer innerhalb der Wohnung): 100% anrechenbar</li>
          </ul>
        </div>

        <div className="mb-4 p-3 ml-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '0.75rem', borderLeft: '4px solid #064497', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
          <h5 className="mb-2" style={{ color: '#064497', fontSize: '1rem', fontWeight: '600' }}>
            Besonderheit: Dachschrägen
          </h5>
          <p className="mb-2" style={{ lineHeight: '1.6', fontSize: '0.95rem' }}>
            Bei Räumen mit Dachschrägen ist die Anrechnung der Fläche von der Raumhöhe abhängig:
          </p>
          <ul className="mb-2" style={{ paddingLeft: '1.5rem', lineHeight: '1.5', fontSize: '0.95rem' }}>
            <li><strong>unter 1,00 m:</strong> nicht anrechenbar (0%)</li>
            <li><strong>zwischen 1,00 und 2,00 m:</strong> zu 50% anrechenbar (50%)</li>
            <li><strong>ab 2,00 m:</strong> voll anrechenbar (100%)</li>
          </ul>
          <small className="text-muted ml-2">
            → Die Summe der Teilflächen muss der gesamten Grundfläche entsprechen.
          </small>
        </div>

        <div className="mb-4 p-3 ml-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '0.75rem', borderLeft: '4px solid #064497', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
          <h5 className="mb-2" style={{ color: '#064497', fontSize: '1rem', fontWeight: '600' }}>
            Nutzfläche (getrennt von der Wohnfläche)
          </h5>
          <p className="mb-2" style={{ lineHeight: '1.6', fontSize: '0.95rem' }}>
            Neben der Wohnfläche wird auch die <strong>Nutzfläche gesondert erfasst</strong>. 
            Hierzu zählen alle Räume, die nicht zur Wohnfläche gehören, aber dennoch wirtschaftlich oder funktional nutzbar sind:
          </p>
          <ul className="mb-3" style={{ 
            paddingLeft: '1.0rem', 
            lineHeight: '1.6', 
            fontSize: '0.95rem',
            listStyle: 'none'
          }}>
            <li style={{ 
              position: 'relative', 
              paddingLeft: '1.0rem', 
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center'
            }}>
              <span style={{
                position: 'absolute',
                left: '0',
                width: '6px',
                height: '6px',
                backgroundColor: '#000000',
                borderRadius: '50%',
                display: 'inline-block'
              }}></span>
              Kellerräume
            </li>
            <li style={{ 
              position: 'relative', 
              paddingLeft: '1.0rem', 
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center'
            }}>
              <span style={{
                position: 'absolute',
                left: '0',
                width: '6px',
                height: '6px',
                backgroundColor: '#000000',
                borderRadius: '50%',
                display: 'inline-block'
              }}></span>
              Dachböden (sofern nicht ausgebaut)
            </li>
            <li style={{ 
              position: 'relative', 
              paddingLeft: '1.0rem', 
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center'
            }}>
              <span style={{
                position: 'absolute',
                left: '0',
                width: '6px',
                height: '6px',
                backgroundColor: '#000000',
                borderRadius: '50%',
                display: 'inline-block'
              }}></span>
              Waschküchen
            </li>
            <li style={{ 
              position: 'relative', 
              paddingLeft: '1.0rem', 
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center'
            }}>
              <span style={{
                position: 'absolute',
                left: '0',
                width: '6px',
                height: '6px',
                backgroundColor: '#000000',
                borderRadius: '50%',
                display: 'inline-block'
              }}></span>
              Heizräume
            </li>
            <li style={{ 
              position: 'relative', 
              paddingLeft: '1.0rem', 
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center'
            }}>
              <span style={{
                position: 'absolute',
                left: '0',
                width: '6px',
                height: '6px',
                backgroundColor: '#000000',
                borderRadius: '50%',
                display: 'inline-block'
              }}></span>
              Garagen
            </li>
          </ul>
          <div className="text-muted" style={{ fontSize: '0.9rem' }}>
            <strong>Wichtig:</strong> Diese Flächen werden nicht gewichtet, sondern in der Regel voll (100%) angesetzt, 
            fließen aber <strong>nicht in die Wohnfläche ein</strong>.
          </div>
        </div>
      </div>
      
      {/* Section 1: Wohnfläche */}
      {renderSectionHeader('1', '1. Wohnfläche nach WoFlV')}
      {expandedSection === '1' && (
        <div className="section-content">
          {/* Floors */}
          {(data.wohnflaecheFloors || []).map((floor, floorIdx) => (
            <div key={floor.id} className="mb-4">
              {/* Floor Header */}
              <div className="floor-header d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-3 flex-grow-1">
                  <Form.Floating style={{ minWidth: '200px' }}>
                    <Form.Select
                      value={floor.name}
                      onChange={(e) => {
                        const selectedOption = FLOOR_OPTIONS.find(opt => opt.label === e.target.value);
                        updateFloor(floor.id, { name: selectedOption ? selectedOption.label : e.target.value });
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
                    Zwischensumme: {calculateFloorTotal(floor).toFixed(2)} m²
                  </span>
                </div>
                {!isReadOnly && (data.wohnflaecheFloors || []).length > 1 && (
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => {
                      const updatedFloors = (data.wohnflaecheFloors || []).filter(f => f.id !== floor.id);
                      onChange({ wohnflaecheFloors: updatedFloors });
                    }}
                    disabled={isReadOnly}
                  >
                    Geschoss löschen
                  </Button>
                )}
              </div>

              {/* Rooms in this floor */}
              {floor.rooms.map((room, roomIdx) => (
                <div key={room.id} className="room-row">
                  {/* Delete button for room */}
                  {!isReadOnly && (
                    <div className="d-flex justify-content-end mb-2">
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => {
                          const updatedRooms = floor.rooms.filter(r => r.id !== room.id);
                          updateFloor(floor.id, { rooms: updatedRooms });
                        }}
                        disabled={isReadOnly}
                      >
                        Raum löschen
                      </Button>
                    </div>
                  )}

                  {/* Room details */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-3">
                      <Form.Floating>
                        <Form.Control
                          type="text"
                          value={room.name}
                          onChange={(e) => updateRoom(floor.id, room.id, { name: e.target.value })}
                          placeholder="Raumname (z.B. Wohnzimmer)"
                          disabled={isReadOnly}
                        />
                        <label>Raumname (z.B. Wohnzimmer)</label>
                      </Form.Floating>
                    </div>
                    <div className="col-md-3">
                      <Form.Floating>
                        <Form.Select
                          value={room.type}
                          onChange={(e) => updateRoom(floor.id, room.id, { type: e.target.value })}
                          disabled={isReadOnly}
                        >
                          <option value="">Raumtyp wählen</option>
                          {ROOM_TYPES.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </Form.Select>
                        <label>Raumtyp</label>
                      </Form.Floating>
                    </div>
                    <div className="col-md-3">
                      <AreaInput
                        value={room.totalArea || ''}
                        onChange={(val) => updateRoom(floor.id, room.id, { totalArea: val })}
                        placeholder="Gesamtfläche"
                        label="Gesamtfläche (m²)"
                        disabled={isReadOnly}
                      />
                    </div>
                    <div className="col-md-3">
                      <div className="d-flex align-items-center h-100">
                        <Form.Check
                          type="checkbox"
                          label="Dachschräge"
                          checked={room.hasDachschraege}
                          onChange={(e) => updateRoom(floor.id, room.id, { 
                            hasDachschraege: e.target.checked,
                            areaUnder1m: e.target.checked ? room.areaUnder1m || '' : undefined,
                            area1to2m: e.target.checked ? room.area1to2m || '' : undefined,
                            areaOver2m: e.target.checked ? room.areaOver2m || '' : undefined
                          })}
                          disabled={isReadOnly}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dachschräge details */}
                  {room.hasDachschraege && (
                    <div className="dachschraege-section">
                      <div className="dachschraege-title mb-2">
                        Dachschrägen-Aufteilung
                      </div>
                      <small className="text-muted d-block mb-3">
                        Teilen Sie die Gesamtfläche nach Raumhöhen auf. Die Summe muss der Gesamtfläche entsprechen.
                      </small>
                      <div className="row g-3">
                        <div className="col-md-4">
                          <AreaInput
                            value={room.areaUnder1m || ''}
                            onChange={(val) => updateRoom(floor.id, room.id, { areaUnder1m: val })}
                            placeholder="Fläche unter 1m"
                            label="Unter 1m Höhe"
                            disabled={isReadOnly}
                          />
                          <small className="text-muted d-block mt-1">0% anrechenbar</small>
                        </div>
                        <div className="col-md-4">
                          <AreaInput
                            value={room.area1to2m || ''}
                            onChange={(val) => updateRoom(floor.id, room.id, { area1to2m: val })}
                            placeholder="Fläche 1-2m"
                            label="1-2m Höhe"
                            disabled={isReadOnly}
                          />
                          <small className="text-muted d-block mt-1">50% anrechenbar</small>
                        </div>
                        <div className="col-md-4">
                          <AreaInput
                            value={room.areaOver2m || ''}
                            onChange={(val) => updateRoom(floor.id, room.id, { areaOver2m: val })}
                            placeholder="Fläche über 2m"
                            label="Über 2m Höhe"
                            disabled={isReadOnly}
                          />
                          <small className="text-muted d-block mt-1">100% anrechenbar</small>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Show calculated area for this room */}
                  <div className="text-end mt-2">
                    <small className="text-muted">
                      Anrechenbare Fläche: <strong>{calculateRoomArea(room).toFixed(2)} m²</strong>
                    </small>
                  </div>
                </div>
              ))}

              {/* Add room button */}
              {!isReadOnly && (
                <Button
                  variant="outline-primary"
                  className="add-person-btn mt-2"
                  onClick={() => {
                    const newRoom: Room = {
                      id: generateId(),
                      name: '',
                      type: '',
                      totalArea: '',
                      hasDachschraege: false
                    };
                    updateFloor(floor.id, { rooms: [...floor.rooms, newRoom] });
                  }}
                  disabled={isReadOnly}
                >
                  + Raum hinzufügen
                </Button>
              )}
            </div>
          ))}

          {/* Add floor button */}
          {!isReadOnly && (
            <Button
              variant="outline-primary"
              className="add-person-btn mt-3"
              onClick={() => {
                const newFloor: Floor = {
                  id: generateId(),
                  name: `${(data.wohnflaecheFloors || []).length + 1}. Geschoss`,
                  rooms: []
                };
                onChange({ wohnflaecheFloors: [...(data.wohnflaecheFloors || []), newFloor] });
              }}
              disabled={isReadOnly}
            >
              + Geschoss hinzufügen
            </Button>
          )}
        </div>
      )}

      {/* Section 2: Nutzfläche */}
      {renderSectionHeader('2', '2. Nutzfläche')}
      {expandedSection === '2' && (
        <div className="section-content">
          {/* Nutzfläche Rooms */}
          {(data.nutzflaecheRooms || []).map((room, roomIdx) => (
            <div key={room.id} className="room-row mb-3">
              {/* Delete button for room */}
              {!isReadOnly && (
                <div className="d-flex justify-content-end mb-2">
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => {
                      const updatedRooms = (data.nutzflaecheRooms || []).filter(r => r.id !== room.id);
                      onChange({ nutzflaecheRooms: updatedRooms });
                    }}
                    disabled={isReadOnly}
                  >
                    Raum löschen
                  </Button>
                </div>
              )}

              {/* Room details */}
              <div className="row g-3">
                <div className="col-md-4">
                  <Form.Floating>
                    <Form.Select
                      value={room.type}
                      onChange={(e) => updateNutzflaecheRoom(room.id, { type: e.target.value })}
                      disabled={isReadOnly}
                    >
                      <option value="">Raumtyp wählen</option>
                      {NUTZFLAECHE_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </Form.Select>
                    <label>Raumtyp</label>
                  </Form.Floating>
                </div>
                <div className="col-md-4">
                  <Form.Floating>
                    <Form.Control
                      type="text"
                      value={room.name}
                      onChange={(e) => updateNutzflaecheRoom(room.id, { name: e.target.value })}
                      placeholder="Raumname (z.B. Heizungskeller)"
                      disabled={isReadOnly}
                    />
                    <label>Raumname (z.B. Heizungskeller)</label>
                  </Form.Floating>
                </div>
                <div className="col-md-4">
                  <AreaInput
                    value={room.totalArea || ''}
                    onChange={(val) => updateNutzflaecheRoom(room.id, { totalArea: val })}
                    placeholder="Fläche"
                    label="Fläche (m²)"
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Add Nutzfläche room button */}
          {!isReadOnly && (
            <Button
              variant="outline-primary"
              className="add-person-btn mt-2"
              onClick={() => {
                const newRoom: Room = {
                  id: generateId(),
                  name: '',
                  type: '',
                  totalArea: '',
                  hasDachschraege: false
                };
                onChange({ nutzflaecheRooms: [...(data.nutzflaecheRooms || []), newRoom] });
              }}
              disabled={isReadOnly}
            >
              + Nutzfläche hinzufügen
            </Button>
          )}
        </div>
      )}

      {/* Section 3: Zusammenfassung */}
      {renderSectionHeader('3', '3. Zusammenfassung')}
      {expandedSection === '3' && (
        <div className="section-content">
          <div className="summary-card">
            <h5 className="mb-3" style={{ fontWeight: 600, color: '#000000', fontSize: '1.2rem' }}>Gesamtübersicht</h5>
            
            {/* Main Totals */}
            <div className="row g-4 mb-4">
              <div className="col-md-4">
                <div className="text-center p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '0.5rem', border: '1px solid #e9ecef' }}>
                  <div className="text-muted small mb-1">Wohnfläche</div>
                  <div className="h4 mb-0" style={{ color: '#064497' }}>{calculateTotalWohnflaeche().toFixed(2)} m²</div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="text-center p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '0.5rem', border: '1px solid #e9ecef' }}>
                  <div className="text-muted small mb-1">Nutzfläche</div>
                  <div className="h4 mb-0" style={{ color: '#064497' }}>{calculateTotalNutzflaeche().toFixed(2)} m²</div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="text-center p-3" style={{ backgroundColor: '#064497', borderRadius: '0.5rem', color: 'white' }}>
                  <div className="text-white-50 small mb-1">Gesamtfläche</div>
                  <div className="h4 mb-0 text-white">{(calculateTotalWohnflaeche() + calculateTotalNutzflaeche()).toFixed(2)} m²</div>
                </div>
              </div>
            </div>
            
            {/* Detailed breakdown */}
            <div className="mt-4">
              <h5 className="mb-3" style={{ fontWeight: 600, color: '#495057' }}>Aufschlüsselung nach Geschossen</h5>
              {(data.wohnflaecheFloors || []).map((floor) => (
                <div key={floor.id} className="summary-row">
                  <span className="summary-label">{floor.name}</span>
                  <span className="summary-value">{calculateFloorTotal(floor).toFixed(2)} m²</span>
                </div>
              ))}
              {(data.nutzflaecheRooms || []).length > 0 && (
                <div className="summary-row">
                  <span className="summary-label">Nutzfläche</span>
                  <span className="summary-value">{calculateTotalNutzflaeche().toFixed(2)} m²</span>
                </div>
              )}
              <div className="summary-row">
                <span className="summary-label">Gesamtfläche</span>
                <span className="summary-value">{(calculateTotalWohnflaeche() + calculateTotalNutzflaeche()).toFixed(2)} m²</span>
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
            <h6><strong>Bitte korrigieren Sie folgende Fehler:</strong></h6>
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

export default WoFIVForm; 