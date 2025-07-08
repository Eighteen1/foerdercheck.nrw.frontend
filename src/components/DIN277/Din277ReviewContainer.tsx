import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { supabase } from '../../lib/supabase';
import Din277Form from './Din277Form';
import '../Einkommenserklaerung/EinkommenserklaerungContainer.css';

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
  totalVolume?: number;
}

const initialDin277Data: Din277Data = {
  buildingLevels: [{
    id: 'level_1',
    name: 'Erdgeschoss',
    volumeElements: []
  }],
  totalVolume: 0
};

interface Din277ReviewContainerProps {
  residentId: string;
}

const Din277ReviewContainer: React.FC<Din277ReviewContainerProps> = ({ residentId }) => {
  const [formData, setFormData] = useState<Din277Data>(initialDin277Data);
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
          .select('berechnung_din277')
          .eq('user_id', residentId)
          .single();

        if (objectError && objectError.code !== 'PGRST116') {
          console.error('Error loading object data:', objectError);
        } else {
          // Set form data from database
          setFormData(objectData?.berechnung_din277 || initialDin277Data);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error loading saved data:', error);
        setIsLoading(false);
      }
    };

    loadSavedData();
  }, [residentId]);

  // Validation function (same as Din277Container)
  const validateForm = () => {
    const errors: string[] = [];

    // Validate that at least one building level exists
    if (!formData.buildingLevels || formData.buildingLevels.length === 0) {
      errors.push('Mindestens ein Geschoss muss angelegt werden');
    }

    // Check if any data was entered
    const hasData = formData.buildingLevels?.some(level => 
      level.volumeElements?.length > 0 && level.volumeElements.some(element => 
        element.label?.trim() || element.length_m || element.width_m || element.height_m
      )
    );

    if (!hasData) {
      errors.push('Bitte fügen Sie mindestens ein Volumenelement hinzu');
    }

    // Validate building levels
    formData.buildingLevels?.forEach((level, levelIdx) => {
      if (!level.name?.trim()) {
        errors.push(`Geschoss ${levelIdx + 1}: Name ist erforderlich`);
      }

      // Validate volume elements in level
      level.volumeElements?.forEach((element, elementIdx) => {
        if (!element.label?.trim()) {
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

    setValidationErrors(errors);
    setShowValidationModal(errors.length > 0);
    setShowSuccessModal(errors.length === 0);
  };

  if (isLoading) {
    return <div>Formular lädt...</div>;
  }

  return (
    <div className="din277-review-container">
      <style>
        {`
          .din277-review-container {
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
        <Din277Form
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
            <p className="mb-3"><strong>Folgende Fehler wurden in der Brutto-Rauminhalt-Berechnung gefunden:</strong></p>
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
            <p className="mb-3"><strong>Die Brutto-Rauminhalt-Berechnung ist vollständig und entspricht den Anforderungen.</strong></p>
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

export default Din277ReviewContainer; 