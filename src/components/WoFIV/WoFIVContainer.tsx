import React, { useState, useEffect } from 'react';
import { Container, Button, Modal, Spinner, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import WoFIVForm from './WoFIVForm';

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

const WoFIVContainer: React.FC = () => {
  const [formData, setFormData] = useState<WoFIVData>(initialWoFIVData);
  const [isLoading, setIsLoading] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const { user } = useAuth();
  const navigate = useNavigate();

  // Load data from Supabase
  useEffect(() => {
    const loadSavedData = async () => {
      if (!user?.id) return;

      setIsLoading(true);
      try {
        // Load user data for validation toggle
        const { data: userData, error: userError } = await supabase
          .from('user_data')
          .select('should_show_error_wofiv')
          .eq('id', user.id)
          .single();

        if (userError && userError.code !== 'PGRST116') {
          console.error('Error loading user data:', userError);
        } else {
          // Set showValidation based on database value
          const shouldShowError = userData?.should_show_error_wofiv ?? false;
          setShowValidation(shouldShowError);
        }

        // Load object data for form content
        const { data: objectData, error: objectError } = await supabase
          .from('object_data')
          .select('berechnung_woFIV')
          .eq('user_id', user.id)
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
  }, [user?.id]);

  // Handle form data changes
  const handleFormChange = (data: Partial<WoFIVData>) => {
    setFormData(prevData => ({ ...prevData, ...data }));
    setHasUnsavedChanges(true);
  };

  // Save data to database
  const saveData = async (navigateAfterSave = false) => {
    setIsLoading(true);
    try {
      if (!user?.id) {
        console.error('No user id found');
        setIsLoading(false);
        return;
      }

      // Calculate progress (dummy for now)
      const wofivProgress = calculateProgress();
      console.log('WoFIV Progress calculation completed:', wofivProgress);

      // Update object_data
      const { error: objectError } = await supabase
        .from('object_data')
        .upsert({
          user_id: user.id,
          berechnung_woFIV: formData,
          updated_at: new Date().toISOString()
        });

      if (objectError) throw objectError;

      // Update user_data with progress
      const { error: userError } = await supabase
        .from('user_data')
        .update({
            berechnung_woFIV_progress: wofivProgress,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (userError) throw userError;

      setIsLoading(false);
      setShowModal(true);
      setHasUnsavedChanges(false);
      
      if (navigateAfterSave) {
          navigate('/document-upload', { state: { from: 'wofiv' } });
      }
    } catch (error) {
      console.error('Error saving data:', error);
      setIsLoading(false);
    }
  };

  // Validate form (dummy for now)
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
        } else {
          // Check for zero values in totalArea
          const totalArea = parseFloat((room.totalArea || '0').replace(',', '.')) || 0;
          if (totalArea === 0) {
            errors.push(`${floor.name} - ${room.name}: Gesamtfläche darf nicht 0 m² betragen`);
          }
        }

        // Validate Dachschräge calculations
        if (room.hasDachschraege && room.totalArea) {
          const totalArea = parseFloat((room.totalArea || '0').replace(',', '.')) || 0;
          const under1m = parseFloat((room.areaUnder1m || '0').replace(',', '.')) || 0;
          const area1to2m = parseFloat((room.area1to2m || '0').replace(',', '.')) || 0;
          const over2m = parseFloat((room.areaOver2m || '0').replace(',', '.')) || 0;
          
          // Check for zero values in Dachschräge fields
          if (under1m === 0 && area1to2m === 0 && over2m === 0) {
            errors.push(`${floor.name} - ${room.name}: Bei Dachschräge müssen mindestens eine Teilfläche größer als 0 m² angegeben werden`);
          }
          
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
      } else {
        // Check for zero values in totalArea
        const totalArea = parseFloat((room.totalArea || '0').replace(',', '.')) || 0;
        if (totalArea === 0) {
          errors.push(`Nutzfläche - ${room.name}: Gesamtfläche darf nicht 0 m² betragen`);
        }
      }
    });

    setValidationErrors(errors);
    setShowValidationModal(errors.length > 0);
    setShowSuccessModal(errors.length === 0);
    setShowValidation(true);
  };

  // Calculate validation errors for progress calculation
  const getValidationErrorsForProgress = () => {
    const errors: string[] = [];

    // Validate Wohnfläche floors and rooms
    (formData.wohnflaecheFloors || []).forEach((floor, floorIdx) => {
      if (!floor.name?.trim()) {
        errors.push(`Geschoss ${floorIdx + 1}: Name ist erforderlich`);
      }

      floor.rooms?.forEach((room, roomIdx) => {
        // Only validate if the room has any data entered
        if (room.name?.trim() || room.type || room.totalArea) {
          if (!room.name?.trim()) {
            errors.push(`${floor.name} - Raum ${roomIdx + 1}: Raumname ist erforderlich`);
          }
          if (!room.type) {
            errors.push(`${floor.name} - ${room.name}: Raumtyp ist erforderlich`);
          }
          if (!room.totalArea) {
            errors.push(`${floor.name} - ${room.name}: Gesamtfläche ist erforderlich`);
          } else {
            // Check for zero values in totalArea
            const totalArea = parseFloat((room.totalArea || '0').replace(',', '.')) || 0;
            if (totalArea === 0) {
              errors.push(`${floor.name} - ${room.name}: Gesamtfläche darf nicht 0 m² betragen`);
            }
          }

          // Validate Dachschräge calculations
          if (room.hasDachschraege && room.totalArea) {
            const totalArea = parseFloat((room.totalArea || '0').replace(',', '.')) || 0;
            const under1m = parseFloat((room.areaUnder1m || '0').replace(',', '.')) || 0;
            const area1to2m = parseFloat((room.area1to2m || '0').replace(',', '.')) || 0;
            const over2m = parseFloat((room.areaOver2m || '0').replace(',', '.')) || 0;
            
            // Check for zero values in Dachschräge fields
            if (under1m === 0 && area1to2m === 0 && over2m === 0) {
              errors.push(`${floor.name} - ${room.name}: Bei Dachschräge müssen mindestens eine Teilfläche größer als 0 m² angegeben werden`);
            }
            
            const sumSubAreas = under1m + area1to2m + over2m;
            const tolerance = 0.01;
            
            if (Math.abs(sumSubAreas - totalArea) > tolerance) {
              errors.push(`${floor.name} - ${room.name}: Dachschrägen-Teilflächen stimmen nicht mit Gesamtfläche überein`);
            }
          }
        }
      });
    });

    // Validate Nutzfläche rooms (only if they have data)
    (formData.nutzflaecheRooms || []).forEach((room, roomIdx) => {
      if (room.name?.trim() || room.type || room.totalArea) {
        if (!room.name?.trim()) {
          errors.push(`Nutzfläche - Raum ${roomIdx + 1}: Raumname ist erforderlich`);
        }
        if (!room.type) {
          errors.push(`Nutzfläche - ${room.name}: Raumtyp ist erforderlich`);
        }
        if (!room.totalArea) {
          errors.push(`Nutzfläche - ${room.name}: Gesamtfläche ist erforderlich`);
        } else {
          // Check for zero values in totalArea
          const totalArea = parseFloat((room.totalArea || '0').replace(',', '.')) || 0;
          if (totalArea === 0) {
            errors.push(`Nutzfläche - ${room.name}: Gesamtfläche darf nicht 0 m² betragen`);
          }
        }
      }
    });

    return errors;
  };

  // Calculate progress with sophisticated logic
  const calculateProgress = () => {
    let progress = 0;
    
    // Check if Nutzfläche has any rooms (even empty ones) to determine scoring weights
    const hasNutzflaecheData = (formData.nutzflaecheRooms || []).length > 0;
    
    let totalNutzflaecheRooms = 0;
    let completeNutzflaecheRooms = 0;

    if (hasNutzflaecheData) {
      // Count all Nutzfläche rooms, but only complete the ones with data
      totalNutzflaecheRooms = formData.nutzflaecheRooms!.length;
      
      formData.nutzflaecheRooms!.forEach(room => {
        if (room.name?.trim() && room.type && room.totalArea) {
          completeNutzflaecheRooms++;
        }
      });
    }
    
    // Dynamic scoring based on whether Nutzfläche is present
    // If no Nutzfläche, redistribute the 10% to other categories
    const structureWeight = hasNutzflaecheData ? 15 : 17; // +2%
    const wohnflaecheWeight = hasNutzflaecheData ? 50 : 58; // +8% (most important)
    const calculationWeight = 15; // Keep same
    const qualityWeight = 10; // Keep same
    const nutzflaecheWeight = hasNutzflaecheData ? 10 : 0; // Only count if data exists
    
    // 1. Structure Score - Basic structure exists
    if (formData.wohnflaecheFloors && formData.wohnflaecheFloors.length > 0) {
      const floorsWithNames = formData.wohnflaecheFloors.filter(floor => floor.name?.trim()).length;
      const structureScore = (floorsWithNames / formData.wohnflaecheFloors.length) * structureWeight;
      progress += structureScore;
    }

    // 2. Wohnfläche Content Score - Most important part
    let wohnflaecheScore = 0;
    let totalWohnflaecheRooms = 0;
    let completeWohnflaecheRooms = 0;

    (formData.wohnflaecheFloors || []).forEach(floor => {
      floor.rooms?.forEach(room => {
        totalWohnflaecheRooms++;
        
        // Check if room is complete
        const hasBasicData = Boolean(room.name?.trim() && room.type && room.totalArea);
        let isValid = hasBasicData;
        
        // Check Dachschräge validation if applicable
        if (hasBasicData && room.hasDachschraege && room.totalArea) {
          const totalArea = parseFloat((room.totalArea || '0').replace(',', '.')) || 0;
          const under1m = parseFloat((room.areaUnder1m || '0').replace(',', '.')) || 0;
          const area1to2m = parseFloat((room.area1to2m || '0').replace(',', '.')) || 0;
          const over2m = parseFloat((room.areaOver2m || '0').replace(',', '.')) || 0;
          
          const sumSubAreas = under1m + area1to2m + over2m;
          const tolerance = 0.01;
          
          if (Math.abs(sumSubAreas - totalArea) > tolerance) {
            isValid = false;
          }
        }
        
        if (isValid) {
          completeWohnflaecheRooms++;
        }
      });
    });

    if (totalWohnflaecheRooms > 0) {
      wohnflaecheScore = (completeWohnflaecheRooms / totalWohnflaecheRooms) * wohnflaecheWeight;
      progress += wohnflaecheScore;
    }

    // 3. Calculation Completeness - Totals are calculated and meaningful
    if (formData.totalWohnflaeche && formData.totalWohnflaeche > 0) {
      progress += calculationWeight;
    }

    // 4. Nutzfläche Score - Only if data exists
    if (hasNutzflaecheData) {
      const nutzflaecheScore = (completeNutzflaecheRooms / totalNutzflaecheRooms) * nutzflaecheWeight;
      progress += nutzflaecheScore;
    }

    // 5. Data Quality Score - Reduce based on validation errors
    const validationErrors = getValidationErrorsForProgress();
    let qualityScore = qualityWeight;
    
    if (validationErrors.length > 0) {
      // Reduce quality score based on number of errors
      // Each error reduces quality by up to 2 points, but never below 0
      const errorPenalty = Math.min(validationErrors.length * 2, qualityWeight);
      qualityScore = Math.max(0, qualityWeight - errorPenalty);
    }
    
    progress += qualityScore;

    // Ensure minimum progress if there's any meaningful data
    const hasAnyMeaningfulData = totalWohnflaecheRooms > 0 || totalNutzflaecheRooms > 0;
    if (hasAnyMeaningfulData && progress < 5) {
      progress = 5; // Minimum 5% if user has started entering data
    }

    // Cap at 100% and ensure it's an integer
    return Math.min(Math.round(progress), 100);
  };

  // Handle toggle validation
  const handleToggleValidation = async () => {
    const newShowValidation = !showValidation;
    setShowValidation(newShowValidation);
    
    if (user?.id) {
      try {
        const { error } = await supabase
          .from('user_data')
          .update({ 
            should_show_error_wofiv: newShowValidation,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (error) {
          console.error('Error updating should_show_error_wofiv:', error);
          setShowValidation(!newShowValidation);
        }
      } catch (error) {
        console.error('Error in handleToggleValidation:', error);
        setShowValidation(!newShowValidation);
      }
    }
  };

  return (
    <div className="relative min-h-screen bg-white">
      <style>
        {`
          .blue-corner {
            position: absolute;
            top: -170px;
            left: -10%;
            width: 55%;
            height: 300px;
            background: #064497;
            border-radius: 50%;
            z-index: 2;
            pointer-events: none;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            overflow: visible;
          }
          .blue-corner-text {
            pointer-events: auto;
            text-align: center;
            color: #ffffff;
            font-weight: 300;
            width: 100%;
            position: relative;
            font-weight: 300;
            font-family: 'Roboto';
            font-style: normal;
            margin-top: 200px;
            font-size: 30px;
            display: block;
          }
          @media (max-width: 1040px) {
            .blue-corner {
              width: 35%;
              height: 140px;
              top: -50px;
              left: -5%;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .blue-corner-text {
              margin-top: 0;
              margin-bottom: 0;
              position: relative;
              font-weight: 300;
            }
          }
          @media (max-width: 1040px) {
            .blue-corner {
              display: none;
            }
          }
        `}
      </style>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: 'rgba(255,255,255,0.9)', zIndex: 9999 }}>
          <Spinner animation="border" role="status" style={{ width: '3rem', height: '3rem', color: '#064497' }}>
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      )}

      {/* Header ellipse */}
      <div className="blue-corner">
        <span className="blue-corner-text">WOHN- UND NUTZFLÄCHE</span>
      </div>

      {/* Top Bar */}
      <div className="absolute top-12 end-9">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 d-flex">
          <Button
            variant="link"
            className={`p-3${hasUnsavedChanges ? ' fw-medium' : ''}`}
            onClick={() => saveData()}
            style={{ color: hasUnsavedChanges ? '#064497' : '#6c757d', textDecoration: 'none', fontSize: '0.9rem' }}
          >
            Speichern
          </Button>
          <div className="border-start border-white/20" style={{ margin: '0.5rem 0' }}></div>
          <div className="d-flex align-items-center gap-2 px-3">
            <Form.Check
              type="switch"
              id="validation-toggle"
              checked={showValidation}
              onChange={handleToggleValidation}
              className="mb-0"
              style={{
                '--bs-form-switch-bg': 'rgba(255, 255, 255, 0.3)',
                '--bs-form-switch-color': '#064497',
                '--bs-form-switch-checked-bg': '#064497',
                '--bs-form-switch-checked-color': '#ffffff',
                '--bs-form-switch-width': '3em',
                '--bs-form-switch-height': '1.5em',
                '--bs-form-switch-padding-start': '2.5em',
                '--bs-form-switch-padding-end': '0.5em',
                '--bs-form-switch-border-radius': '2em',
                '--bs-form-switch-transition': 'all 0.2s ease-in-out'
              } as React.CSSProperties}
            />
            <label htmlFor="validation-toggle" className="text-black mb-0 fw-medium" style={{ fontSize: '0.9rem', userSelect: 'none'}}>Fehler anzeigen</label>
          </div>
        </div>
      </div>

      <Container className="pt-44">
        {/* Form Content */}
        <div className="mb-5">
          <WoFIVForm
            data={formData}
            onChange={handleFormChange}
            showValidation={showValidation}
            isReadOnly={false}
          />
        </div>

        {/* Bottom Buttons */}
        <div className="d-flex flex-column align-items-center mt-6 gap-3 mb-5">
          <Button 
            variant="primary" 
            onClick={validateForm} 
            disabled={isLoading} 
            style={{ backgroundColor: '#064497', border: 'none', padding: '0.75rem 2rem', minWidth: '120px' }}
          >
            {isLoading ? <Spinner animation="border" size="sm" /> : 'PRÜFEN'}
          </Button>
          <Button 
            variant="link"
            onClick={() => saveData(true)}
            disabled={isLoading}
            className="text-decoration-underline mb-5 mt-3"
            style={{ color: 'black' }}
          >
            Speichern und verlassen
          </Button> 
        </div>
      </Container>

      {/* Save Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header>
          <Modal.Title>Gespeichert</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="alert alert-success mb-0">Ihre Angaben wurden gespeichert.</div>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={() => setShowModal(false)} style={{ backgroundColor: '#064497', border: 'none' }}>Schließen</Button>
        </Modal.Footer>
      </Modal>

      {/* Validation Modal */}
      <Modal show={showValidationModal} onHide={() => setShowValidationModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Bitte korrigieren Sie die folgenden Fehler</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="alert alert-danger">
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
          <Modal.Title>Glückwunsch!</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="alert alert-success mb-0">
            <p className="mb-3">Ihre Eingaben sind vollständig und stimmen mit den regulären Anforderungen überein.</p>
            <p className="mb-3">Sie können Ihre ausgefüllten Formulare im persönlichen Bereich querprüfen und anschließend einreichen.</p>
            <p className="text-muted small mb-0">Hinweis: Wir sind per Gesetz verpflichtet, das Einreichen aller Anträge zu ermöglichen, auch wenn diese Fehler enthalten.</p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <div className="d-flex justify-content-center align-items-center w-100">
            <Button 
              onClick={async () => { 
                setShowSuccessModal(false); 
                await saveData();
                navigate('/document-upload', { state: { from: 'wofiv' } });
              }}
              style={{ backgroundColor: '#064497', border: 'none', minWidth: 260 }}
            >
              Speichern und verlassen
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default WoFIVContainer; 