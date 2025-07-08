import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { supabase } from '../../lib/supabase';
import WoFIVForm from './WoFIVForm';
import '../Einkommenserklaerung/EinkommenserklaerungContainer.css';

interface WoFIVData {
  wohnflaecheFloors: Array<{
    id: string;
    name: string;
    rooms: Array<{
      id: string;
      name: string;
      type: string;
      totalArea: string;
      hasDachschraege: boolean;
      areaUnder1m?: string;
      area1to2m?: string;
      areaOver2m?: string;
    }>;
  }>;
  nutzflaecheRooms: Array<{
    id: string;
    name: string;
    type: string;
    totalArea: string;
    hasDachschraege: boolean;
    areaUnder1m?: string;
    area1to2m?: string;
    areaOver2m?: string;
  }>;
  totalWohnflaeche?: number;
  totalNutzflaeche?: number;
  totalCombined?: number;
}

const initialWoFIVData: WoFIVData = {
  wohnflaecheFloors: [{
    id: 'floor_1',
    name: 'Erdgeschoss',
    rooms: []
  }],
  nutzflaecheRooms: [],
  totalWohnflaeche: 0,
  totalNutzflaeche: 0,
  totalCombined: 0
};

interface WoFIVReviewContainerProps {
  residentId: string;
}

const WoFIVReviewContainer: React.FC<WoFIVReviewContainerProps> = ({ residentId }) => {
  const [formData, setFormData] = useState<WoFIVData>(initialWoFIVData);
  const [isLoading, setIsLoading] = useState(true);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    const loadSavedData = async () => {
      if (!residentId) return;

      setIsLoading(true);
      try {
        // Load object data for form content
        const { data: objectData, error: objectError } = await supabase
          .from('object_data')
          .select('berechnung_woFIV')
          .eq('user_id', residentId)
          .single();

        if (objectError && objectError.code !== 'PGRST116') {
          console.error('Error loading object data:', objectError);
        } else {
          // Set form data from database
          setFormData(objectData?.berechnung_woFIV || initialWoFIVData);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error loading saved data:', error);
        setIsLoading(false);
      }
    };

    loadSavedData();
  }, [residentId]);

  // Validation function (same as WoFIVContainer)
  const validateForm = () => {
    const errors: string[] = [];

    // Validate that at least one floor exists
    if (!formData.wohnflaecheFloors || formData.wohnflaecheFloors.length === 0) {
      errors.push('Mindestens ein Geschoss muss angelegt werden');
    }

    // Check if any data was entered
    const hasWohnflaecheData = formData.wohnflaecheFloors?.some(floor => 
      floor.rooms?.length > 0 && floor.rooms.some(room => 
        room.name?.trim() || room.type || room.totalArea
      )
    );

    const hasNutzflaecheData = formData.nutzflaecheRooms?.some(room => 
      room.name?.trim() || room.type || room.totalArea
    );

    if (!hasWohnflaecheData && !hasNutzflaecheData) {
      errors.push('Bitte fügen Sie mindestens einen Raum hinzu');
    }

    // Validate floor names
    formData.wohnflaecheFloors?.forEach((floor, floorIdx) => {
      if (!floor.name?.trim()) {
        errors.push(`Geschoss ${floorIdx + 1}: Name ist erforderlich`);
      }

      // Validate rooms in floor
      floor.rooms?.forEach((room, roomIdx) => {
        if (!room.name?.trim()) {
          errors.push(`${floor.name} - Raum ${roomIdx + 1}: Raumname ist erforderlich`);
        }
        if (!room.type) {
          errors.push(`${floor.name} - ${room.name}: Raumtyp ist erforderlich`);
        }
        if (!room.totalArea) {
          errors.push(`${floor.name} - ${room.name}: Gesamtfläche ist erforderlich`);
        }

        // Validate Dachschräge calculations
        if (room.hasDachschraege && room.totalArea) {
          const totalArea = parseFloat((room.totalArea || '0').replace(',', '.')) || 0;
          const under1m = parseFloat((room.areaUnder1m || '0').replace(',', '.')) || 0;
          const area1to2m = parseFloat((room.area1to2m || '0').replace(',', '.')) || 0;
          const over2m = parseFloat((room.areaOver2m || '0').replace(',', '.')) || 0;
          
          const sumSubAreas = under1m + area1to2m + over2m;
          const tolerance = 0.01;
          
          if (Math.abs(sumSubAreas - totalArea) > tolerance) {
            errors.push(`${floor.name} - ${room.name}: Dachschrägen-Teilflächen (${sumSubAreas.toFixed(2)} m²) stimmen nicht mit Gesamtfläche (${totalArea.toFixed(2)} m²) überein`);
          }
        }
      });
    });

    // Validate Nutzfläche rooms
    formData.nutzflaecheRooms?.forEach((room, roomIdx) => {
      if (!room.name?.trim()) {
        errors.push(`Nutzfläche - Raum ${roomIdx + 1}: Raumname ist erforderlich`);
      }
      if (!room.type) {
        errors.push(`Nutzfläche - ${room.name}: Raumtyp ist erforderlich`);
      }
      if (!room.totalArea) {
        errors.push(`Nutzfläche - ${room.name}: Gesamtfläche ist erforderlich`);
      }
    });

    setValidationErrors(errors);
    setShowValidationModal(errors.length > 0);
    setShowSuccessModal(errors.length === 0);
  };

  if (isLoading) {
    return <div>Formular lädt...</div>;
  }

  return (
    <div className="wofiv-review-container">
      <style>
        {`
          .wofiv-review-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            background: #fff;
          }
          .error-button {
            color: #dc3545 !important;
          }
          .error-button:hover {
            background: #f8d7da !important;
          }
        `}
      </style>
      
      {/* Header Bar */}
      <div className="review-header">
        <div className="search-container">
          <button onClick={validateForm} title="Fehler anzeigen">
            <span className="material-icons error-button">error</span>
          </button>
        </div>
        <div style={{ position: 'relative', flex: 1 }}>
          {/* Empty space where switcher buttons would be */}
        </div>
      </div>

      {/* Form Content */}
      <div className="form-content">
        <WoFIVForm
          data={formData}
          onChange={() => {}} // No-op since this is read-only
          showValidation={true}
          isReadOnly={true}
        />
      </div>

      {/* Validation Modal */}
      <Modal show={showValidationModal} onHide={() => setShowValidationModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Validierung: Gefundene Fehler</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="alert alert-danger">
            <p className="mb-3"><strong>Folgende Fehler wurden in der Wohn- und Nutzflächenberechnung gefunden:</strong></p>
            <ul className="mb-0">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            onClick={() => setShowValidationModal(false)}
            style={{ backgroundColor: '#064497', border: 'none' }}
          >
            Schließen
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Success Modal */}
      <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Validierung erfolgreich</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="alert alert-success mb-0">
            <p className="mb-3"><strong>Die Wohn- und Nutzflächenberechnung ist vollständig und entspricht den Anforderungen.</strong></p>
            <p className="mb-3">Alle erforderlichen Angaben sind vorhanden und die Berechnungen sind korrekt durchgeführt.</p>
            <p className="text-muted small mb-0">Hinweis: Diese Validierung dient der Überprüfung der Formularvollständigkeit für die Bearbeitung.</p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <div className="d-flex justify-content-center align-items-center w-100">
            <Button 
              onClick={() => setShowSuccessModal(false)}
              style={{ backgroundColor: '#064497', border: 'none', minWidth: 260 }}
            >
              Schließen
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default WoFIVReviewContainer; 