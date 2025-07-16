import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { supabase } from '../../lib/supabase';
import HaushaltForm from './HaushaltForm';
import '../Einkommenserklaerung/EinkommenserklaerungContainer.css';

interface Person {
  id: string; // This will be a UUID
  firstName: string;
  lastName: string;
  birthDate: string;
  employment_title: string;
  entrydate: string;
  behinderungsgrad: string;
  pflegegrad: string;
  noIncome?: boolean;
}

interface HaushaltData {
  mainApplicant: {
    firstName: string;
    lastName: string;
    birthDate: string;
    employment_title: string;
    entrydate: string;
    behinderungsgrad: string;
    pflegegrad: string;
    noIncome: boolean;
  };
  additionalPersons: Person[];
  personsWithoutIncome: string[]; // UUIDs of persons without income
  ispregnant: boolean | null;
}

const initialHaushaltData: HaushaltData = {
  mainApplicant: {
    firstName: '',
    lastName: '',
    birthDate: '',
    employment_title: '',
    entrydate: '',
    behinderungsgrad: '',
    pflegegrad: '',
    noIncome: false
  },
  additionalPersons: [],
  personsWithoutIncome: [],
  ispregnant: null
};

interface HaushaltReviewContainerProps {
  residentId: string;
}

const HaushaltReviewContainer: React.FC<HaushaltReviewContainerProps> = ({ residentId }) => {
  const [formData, setFormData] = useState<HaushaltData>(initialHaushaltData);
  const [isLoading, setIsLoading] = useState(true);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    mainApplicant: string[];
    additionalPersons: string[];
    general: string[];
  }>({ mainApplicant: [], additionalPersons: [], general: [] });

  // Generate UUID helper function
  const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  useEffect(() => {
    const loadSavedData = async () => {
      if (!residentId) return;

      setIsLoading(true);
      try {
        // Load user data
        const { data: userData, error: userError } = await supabase
          .from('user_data')
          .select('firstname, lastname, birthDate, employment_title, main_entrydate, main_behinderungsgrad, main_pflegegrad, noIncome, weitere_antragstellende_personen, ispregnant')
          .eq('id', residentId)
          .single();

        if (userError && userError.code !== 'PGRST116') {
          console.error('Error loading user data:', userError);
        }

        if (userData) {
          // Load additional persons from UUID-based JSON structure
          const weiterePersonenData = userData.weitere_antragstellende_personen || {};
          let weiterePersonenObj: Record<string, any> = {};
          
          // Handle backwards compatibility: convert array to UUID-based object if needed
          if (Array.isArray(weiterePersonenData)) {
            // Legacy array format - convert to UUID-based object
            weiterePersonenData.forEach((person: any, index: number) => {
              const uuid = person.id || generateUUID();
              weiterePersonenObj[uuid] = { ...person, id: uuid };
            });
          } else {
            // Already UUID-based object format
            weiterePersonenObj = weiterePersonenData;
          }

          const additionalPersons: Person[] = Object.entries(weiterePersonenObj)
            .filter(([uuid, person]: [string, any]) => !person.notHousehold) // Filter out persons with notHousehold: true
            .map(([uuid, person]: [string, any]) => ({
              id: uuid, // Use the UUID as the ID
              firstName: person.firstName || '',
              lastName: person.lastName || '',
              birthDate: person.birthDate || '',
              employment_title: person.employment_title || '',
              entrydate: person.entrydate || '',
              behinderungsgrad: person.behinderungsgrad != null ? String(person.behinderungsgrad) : '',
              pflegegrad: person.pflegegrad != null ? String(person.pflegegrad) : '',
              noIncome: person.noIncome || false
            }));

          // Get persons without income using UUIDs
          const personsWithoutIncome: string[] = [];
          if (userData.noIncome) {
            personsWithoutIncome.push('main_applicant');
          }
          // Add UUIDs of additional persons without income
          Object.entries(weiterePersonenObj).forEach(([uuid, person]: [string, any]) => {
            if (person.noIncome) {
              personsWithoutIncome.push(uuid);
            }
          });

          setFormData({
            mainApplicant: {
              firstName: userData.firstname || '',
              lastName: userData.lastname || '',
              birthDate: userData.birthDate || '',
              employment_title: userData.employment_title || '',
              entrydate: userData.main_entrydate || '',
              behinderungsgrad: userData.main_behinderungsgrad != null ? String(userData.main_behinderungsgrad) : '',
              pflegegrad: userData.main_pflegegrad != null ? String(userData.main_pflegegrad) : '',
              noIncome: userData.noIncome || false
            },
            additionalPersons,
            personsWithoutIncome,
            ispregnant: userData.ispregnant
          });
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error loading saved data:', error);
        setIsLoading(false);
      }
    };

    loadSavedData();
  }, [residentId]);

  // Validation function
  const validateForm = () => {
    const errors = {
      mainApplicant: [] as string[],
      additionalPersons: [] as string[],
      general: [] as string[]
    };

    // Main applicant validation
    if (!String(formData.mainApplicant.firstName || '').trim()) {
      errors.mainApplicant.push('Vorname ist erforderlich');
    }
    if (!String(formData.mainApplicant.lastName || '').trim()) {
      errors.mainApplicant.push('Nachname ist erforderlich');
    }
    if (!String(formData.mainApplicant.birthDate || '').trim()) {
      errors.mainApplicant.push('Geburtsdatum ist erforderlich');
    }
    if (!String(formData.mainApplicant.employment_title || '').trim()) {
      errors.mainApplicant.push('Beruf ist erforderlich');
    }
    if (!String(formData.mainApplicant.entrydate || '').trim()) {
      errors.mainApplicant.push('Aufnahme in den Haushalt ist erforderlich');
    }
    if (!String(formData.mainApplicant.behinderungsgrad || '').trim()) {
      errors.mainApplicant.push('Grad der Behinderung ist erforderlich');
    }
    if (!String(formData.mainApplicant.pflegegrad || '').trim()) {
      errors.mainApplicant.push('Pflegegrad ist erforderlich');
    }

    // Additional persons validation
    formData.additionalPersons.forEach((person, index) => {
      const personName = `Person ${index + 2}`;
      if (!String(person.firstName || '').trim()) {
        errors.additionalPersons.push(`${personName}: Vorname ist erforderlich`);
      }
      if (!String(person.lastName || '').trim()) {
        errors.additionalPersons.push(`${personName}: Nachname ist erforderlich`);
      }
      if (!String(person.birthDate || '').trim()) {
        errors.additionalPersons.push(`${personName}: Geburtsdatum ist erforderlich`);
      }
      if (!String(person.employment_title || '').trim()) {
        errors.additionalPersons.push(`${personName}: Beruf ist erforderlich`);
      }
      if (!String(person.entrydate || '').trim()) {
        errors.additionalPersons.push(`${personName}: Aufnahme in den Haushalt ist erforderlich`);
      }
      if (!String(person.behinderungsgrad || '').trim()) {
        errors.additionalPersons.push(`${personName}: Grad der Behinderung ist erforderlich`);
      }
      if (!String(person.pflegegrad || '').trim()) {
        errors.additionalPersons.push(`${personName}: Pflegegrad ist erforderlich`);
      }
    });

    // General validation
    if (formData.ispregnant === null) {
      errors.general.push('Es wurde nicht angegeben, ob die Geburt eines Kindes erwartet wird');
    }

    setValidationErrors(errors);
    const hasAnyErrors = errors.mainApplicant.length > 0 || errors.additionalPersons.length > 0 || errors.general.length > 0;
    setShowValidationModal(hasAnyErrors);
    setShowSuccessModal(!hasAnyErrors);
  };

  if (isLoading) {
    return <div>Formular lädt...</div>;
  }

  return (
    <div className="haushalt-review-container">
      <style>
        {`
          .haushalt-review-container {
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
          <button onClick={validateForm} title="Validierung anzeigen">
            <span className="material-icons error-button">error</span>
          </button>
        </div>
        <div style={{ position: 'relative', flex: 1 }}>
          {/* Empty space where switcher buttons would be */}
        </div>
      </div>

      {/* Form Content */}
      <div className="form-content">
        <HaushaltForm
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
          <div className="error-list">
            {/* Main Applicant Section */}
            {validationErrors.mainApplicant.length > 0 && (
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h5 className="text-black mb-0 fw-medium">Hauptantragsteller</h5>
                </div>
                <div className="alert alert-danger mb-0">
                  <ul className="mb-0 ps-3">
                    {validationErrors.mainApplicant.map((error, index) => (
                      <li key={index} className="mb-2">
                        {error}
                        {index < validationErrors.mainApplicant.length - 1 && (
                          <hr className="my-2 border-danger opacity-25" />
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                {(validationErrors.additionalPersons.length > 0 || validationErrors.general.length > 0) && (
                  <hr className="my-3 border-gray-300 opacity-50" />
                )}
              </div>
            )}

            {/* Additional Persons Section */}
            {validationErrors.additionalPersons.length > 0 && (
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h5 className="text-black mb-0 fw-medium">Weitere Personen</h5>
                </div>
                <div className="alert alert-danger mb-0">
                  <ul className="mb-0 ps-3">
                    {validationErrors.additionalPersons.map((error, index) => (
                      <li key={index} className="mb-2">
                        {error}
                        {index < validationErrors.additionalPersons.length - 1 && (
                          <hr className="my-2 border-danger opacity-25" />
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                {validationErrors.general.length > 0 && (
                  <hr className="my-3 border-gray-300 opacity-50" />
                )}
              </div>
            )}

            {/* General Section */}
            {validationErrors.general.length > 0 && (
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h5 className="text-black mb-0 fw-medium">Allgemeine Angaben</h5>
                </div>
                <div className="alert alert-danger mb-0">
                  <ul className="mb-0 ps-3">
                    {validationErrors.general.map((error, index) => (
                      <li key={index} className="mb-2">
                        {error}
                        {index < validationErrors.general.length - 1 && (
                          <hr className="my-2 border-danger opacity-25" />
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
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
            <p className="mb-3"><strong>Die Haushaltsauskunft ist vollständig und entspricht den Anforderungen.</strong></p>
            <p className="mb-3">Alle erforderlichen Angaben sind vorhanden und die Formulardaten sind korrekt ausgefüllt.</p>
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

export default HaushaltReviewContainer; 