import React, { useState, useEffect } from 'react';
import { Container, Button, Modal, Spinner, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Din277Form from './Din277Form';

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

const Din277Container: React.FC = () => {
  const [formData, setFormData] = useState<Din277Data>(initialDin277Data);
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
          .select('should_show_error_din277')
          .eq('id', user.id)
          .single();

        if (userError && userError.code !== 'PGRST116') {
          console.error('Error loading user data:', userError);
        } else {
          // Set showValidation based on database value
          const shouldShowError = userData?.should_show_error_din277 ?? false;
          setShowValidation(shouldShowError);
        }

        // Load object data for form content
        const { data: objectData, error: objectError } = await supabase
          .from('object_data')
          .select('berechnung_din277')
          .eq('user_id', user.id)
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
  }, [user?.id]);

  // Handle form data changes
  const handleFormChange = (data: Partial<Din277Data>) => {
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

      // Calculate progress
      const din277Progress = calculateProgress();
      console.log('DIN 277 Progress calculation completed:', din277Progress);

      // Update object_data
      const { error: objectError } = await supabase
        .from('object_data')
        .upsert({
          user_id: user.id,
          berechnung_din277: formData,
          updated_at: new Date().toISOString()
        });

      if (objectError) throw objectError;

      // Update user_data with progress
      const { error: userError } = await supabase
        .from('user_data')
        .update({
          berechnung_din277_progress: din277Progress,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (userError) throw userError;

      setIsLoading(false);
      setShowModal(true);
      setHasUnsavedChanges(false);
      
      if (navigateAfterSave) {
        navigate('/document-upload', { state: { from: 'din277' } });
      }
    } catch (error) {
      console.error('Error saving data:', error);
      setIsLoading(false);
    }
  };

  // Validate form
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
    setShowValidation(true);
  };

  // Calculate validation errors for progress calculation
  const getValidationErrorsForProgress = () => {
    const errors: string[] = [];

    // Validate building levels and elements
    (formData.buildingLevels || []).forEach((level, levelIdx) => {
      if (!level.name?.trim()) {
        errors.push(`Geschoss ${levelIdx + 1}: Name ist erforderlich`);
      }

      level.volumeElements?.forEach((element, elementIdx) => {
        // Only validate if the element has any data entered
        if (element.label?.trim() || element.length_m || element.width_m || element.height_m) {
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
        }
      });
    });

    return errors;
  };

  // Calculate progress with sophisticated logic
  const calculateProgress = () => {
    let progress = 0;
    
    // Dynamic scoring weights
    const structureWeight = 20; // Basic structure exists
    const contentWeight = 50; // Volume elements content
    const calculationWeight = 20; // Calculations are meaningful
    const qualityWeight = 10; // Data quality (validation errors)
    
    // 1. Structure Score - Basic structure exists
    if (formData.buildingLevels && formData.buildingLevels.length > 0) {
      const levelsWithNames = formData.buildingLevels.filter(level => level.name?.trim()).length;
      const structureScore = (levelsWithNames / formData.buildingLevels.length) * structureWeight;
      progress += structureScore;
    }

    // 2. Content Score - Volume elements data
    let contentScore = 0;
    let totalElements = 0;
    let completeElements = 0;

    (formData.buildingLevels || []).forEach(level => {
      level.volumeElements?.forEach(element => {
        totalElements++;
        
        // Check if element is complete
        const hasBasicData = Boolean(
          element.label?.trim() && 
          element.length_m && 
          element.width_m && 
          (element.hasSlopedRoof ? (element.traufhoehe && element.firsthoehe) : element.height_m)
        );
        
        if (hasBasicData) {
          completeElements++;
        }
      });
    });

    if (totalElements > 0) {
      contentScore = (completeElements / totalElements) * contentWeight;
      progress += contentScore;
    }

    // 3. Calculation Completeness - Total volume is calculated and meaningful
    if (formData.totalVolume && formData.totalVolume > 0) {
      progress += calculationWeight;
    }

    // 4. Data Quality Score - Reduce based on validation errors
    const validationErrors = getValidationErrorsForProgress();
    let qualityScore = qualityWeight;
    
    if (validationErrors.length > 0) {
      // Reduce quality score based on number of errors
      const errorPenalty = Math.min(validationErrors.length * 2, qualityWeight);
      qualityScore = Math.max(0, qualityWeight - errorPenalty);
    }
    
    progress += qualityScore;

    // Ensure minimum progress if there's any meaningful data
    const hasAnyMeaningfulData = totalElements > 0;
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
            should_show_error_din277: newShowValidation,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (error) {
          console.error('Error updating should_show_error_din277:', error);
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
        <span className="blue-corner-text">BRUTTO-RAUMINHALT DIN 277</span>
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
          <Din277Form
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
                navigate('/document-upload', { state: { from: 'din277' } });
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

export default Din277Container; 