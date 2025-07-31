import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { supabase } from '../../lib/supabase';
import SelbsthilfeForm from './SelbsthilfeForm';
import '../Einkommenserklaerung/EinkommenserklaerungContainer.css';

// Email validation function
const isValidEmail = (email: string): boolean => {
  if (!email) return false;
  
  // Basic email regex pattern
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

interface Helper {
  id: string;
  name: string;
  surname: string;
  jobNumbers: string[];
  hours: string;
  email: string;
  jobTitle: string;
  address: {
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
  };
}

interface SelbsthilfeData {
  willProvideSelfHelp: boolean | null;
  address: {
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
  };
  mainApplicantWillHelp: boolean | null;
  costBreakdown: any;
  totals: {
    totalMaterialkosten: number;
    totalLohnkosten: number;
    totalSelbsthilfe: number;
  };
}

const initialSelbsthilfeData: SelbsthilfeData = {
  willProvideSelfHelp: null,
  address: {
    street: '',
    houseNumber: '',
    postalCode: '',
    city: ''
  },
  mainApplicantWillHelp: null,
  costBreakdown: {
    erdarbeiten: { materialkosten: '', lohnkosten: '', selbsthilfe: '' },
    maurerarbeiten: { materialkosten: '', lohnkosten: '', selbsthilfe: '' },
    putzStuck: { materialkosten: '', lohnkosten: '', selbsthilfe: '' },
    fliesenPlatten: { materialkosten: '', lohnkosten: '', selbsthilfe: '' },
    zimmererarbeiten: { materialkosten: '', lohnkosten: '', selbsthilfe: '' },
    dachdeckerarbeiten: { materialkosten: '', lohnkosten: '', selbsthilfe: '' },
    klempnerarbeiten: { materialkosten: '', lohnkosten: '', selbsthilfe: '' },
    tischlerarbeiten: { materialkosten: '', lohnkosten: '', selbsthilfe: '' },
    schlosserarbeiten: { materialkosten: '', lohnkosten: '', selbsthilfe: '' },
    anstrichTapezier: { materialkosten: '', lohnkosten: '', selbsthilfe: '' },
    zentralheizung: { materialkosten: '', lohnkosten: '', selbsthilfe: '' },
    sanitaer: { materialkosten: '', lohnkosten: '', selbsthilfe: '' },
    fussboden: { materialkosten: '', lohnkosten: '', selbsthilfe: '' },
    elektro: { materialkosten: '', lohnkosten: '', selbsthilfe: '' },
    sonstige: { description: '', materialkosten: '', lohnkosten: '', selbsthilfe: '' },
    gartenanlagen: { materialkosten: '', lohnkosten: '', selbsthilfe: '' },
    wegeflaeche: { materialkosten: '', lohnkosten: '', selbsthilfe: '' },
    sonstigeAussen1: { description: '', materialkosten: '', lohnkosten: '', selbsthilfe: '' },
    sonstigeAussen2: { description: '', materialkosten: '', lohnkosten: '', selbsthilfe: '' },
    architektur: { materialkosten: '', lohnkosten: '', selbsthilfe: '' },
    verwaltung: { materialkosten: '', lohnkosten: '', selbsthilfe: '' },
    sonstigeBaunebenkosten1: { description: '', materialkosten: '', lohnkosten: '', selbsthilfe: '' },
    sonstigeBaunebenkosten2: { description: '', materialkosten: '', lohnkosten: '', selbsthilfe: '' }
  },
  totals: {
    totalMaterialkosten: 0,
    totalLohnkosten: 0,
    totalSelbsthilfe: 0
  }
};

const initialHelpers: Helper[] = [
  {
    id: 'main_applicant',
    name: '',
    surname: '',
    jobNumbers: [],
    hours: '',
    email: '',
    jobTitle: '',
    address: {
      street: '',
      houseNumber: '',
      postalCode: '',
      city: ''
    }
  }
];

interface SelbsthilfeReviewContainerProps {
  residentId: string;
}

const SelbsthilfeReviewContainer: React.FC<SelbsthilfeReviewContainerProps> = ({ residentId }) => {
  const [formData, setFormData] = useState<SelbsthilfeData>(initialSelbsthilfeData);
  const [helpers, setHelpers] = useState<Helper[]>(initialHelpers);
  const [isLoading, setIsLoading] = useState(true);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    allgemein: string[];
    aufstellung: string[];
    helfer: string[];
  }>({ allgemein: [], aufstellung: [], helfer: [] });
  const [hauptantragSelbsthilfe, setHauptantragSelbsthilfe] = useState<number | null>(null);

  useEffect(() => {
    const loadSavedData = async () => {
      if (!residentId) return;

      setIsLoading(true);
      try {
        // Load user data for personal details
        const { data: userData, error: userError } = await supabase
          .from('user_data')
          .select('firstname, lastname, person_street, person_housenumber, person_postalcode, person_city, email, employment_title')
          .eq('id', residentId)
          .single();

        if (userError && userError.code !== 'PGRST116') {
          console.error('Error loading user data:', userError);
        }

        // Load object data for form content and object address
        const { data: objectData, error: objectError } = await supabase
          .from('object_data')
          .select('selbsthilfe_angaben, selbsthilfe_helfer, obj_street, obj_house_number, obj_postal_code, obj_city')
          .eq('user_id', residentId)
          .single();

        if (objectError && objectError.code !== 'PGRST116') {
          console.error('Error loading object data:', objectError);
        }

        // Load finance data to get selbsthilfe amount from Hauptantrag
        const { data: financeData, error: financeError } = await supabase
          .from('finance_structure')
          .select('selbsthilfe')
          .eq('user_id', residentId)
          .single();

        if (financeError && financeError.code !== 'PGRST116') {
          console.error('Error loading finance data:', financeError);
        }

        // Set hauptantrag selbsthilfe amount
        const selbsthilfeAmount = financeData?.selbsthilfe !== undefined ? financeData.selbsthilfe : null;
        setHauptantragSelbsthilfe(selbsthilfeAmount);

        // Prepare initial data with object address from database
        let initialData = { ...initialSelbsthilfeData };
        if (objectData) {
          initialData.address = {
            street: objectData.obj_street || '',
            houseNumber: objectData.obj_house_number || '',
            postalCode: objectData.obj_postal_code || '',
            city: objectData.obj_city || ''
          };
        }

        // Set form data from database
        const savedData = objectData?.selbsthilfe_angaben;
        let formDataToSet = savedData ? { ...initialData, ...savedData } : initialData;

        setFormData(formDataToSet);

        // Prepare helpers - merge main applicant personal data with saved hours/jobNumbers
        let helpersToSet = [...initialHelpers];
        
        // Set main applicant personal data from user_data
        if (userData) {
          helpersToSet[0] = {
            ...helpersToSet[0],
            name: userData.firstname || '',
            surname: userData.lastname || '',
            email: userData.email || '',
            jobTitle: userData.employment_title || '',
            address: {
              street: userData.person_street || '',
              houseNumber: userData.person_housenumber || '',
              postalCode: userData.person_postalcode || '',
              city: userData.person_city || ''
            }
          };
        }

        // Merge saved helper data
        if (objectData?.selbsthilfe_helfer) {
          const savedHelpers = objectData.selbsthilfe_helfer;
          
          // For main applicant, only merge hours and jobNumbers
          if (savedHelpers[0]) {
            helpersToSet[0] = {
              ...helpersToSet[0],
              hours: savedHelpers[0].hours || '',
              jobNumbers: savedHelpers[0].jobNumbers || []
            };
          }
          
          // For other helpers, use full saved data
          for (let i = 1; i < savedHelpers.length; i++) {
            if (savedHelpers[i]) {
              helpersToSet[i] = savedHelpers[i];
            }
          }
        }

        setHelpers(helpersToSet);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading saved data:', error);
        setIsLoading(false);
      }
    };

    loadSavedData();
  }, [residentId]);

  // Format currency for display
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(value);
  };

  // Validation function with section organization
  const validateForm = () => {
    const errors = {
      allgemein: [] as string[],
      aufstellung: [] as string[],
      helfer: [] as string[]
    };

    // Allgemein - Check if will provide self help is answered
    if (formData.willProvideSelfHelp === null || formData.willProvideSelfHelp === undefined) {
      errors.allgemein.push('Es wurde nicht angegeben, ob Selbsthilfeleistungen erbracht werden');
    } else if (hauptantragSelbsthilfe !== null && hauptantragSelbsthilfe > 0 && formData.willProvideSelfHelp === false) {
      // Check for inconsistency with Hauptantrag selbsthilfe amount
      errors.allgemein.push(`Im Hauptantrag wurde ein Selbsthilfe-Betrag von ${formatCurrency(hauptantragSelbsthilfe)} angegeben, aber es wurde "Nein" bei Selbsthilfeleistungen gewählt.`);
    }

    // If providing self help, validate the rest
    if (formData.willProvideSelfHelp === true) {
      // Allgemein - Check if main applicant will help is answered
      if (formData.mainApplicantWillHelp === null || formData.mainApplicantWillHelp === undefined) {
        errors.allgemein.push('Es wurde nicht angegeben, ob sich der Hauptantragsteller an den Selbsthilfeleistungen beteiligt');
      }

      // Allgemein - Address validation
      if (!formData.address.street?.trim()) {
        errors.allgemein.push('Straße des Förderobjekts fehlt');
      }
      if (!formData.address.houseNumber?.trim()) {
        errors.allgemein.push('Hausnummer des Förderobjekts fehlt');
      }
      if (!formData.address.postalCode?.trim()) {
        errors.allgemein.push('Postleitzahl des Förderobjekts fehlt');
      } else if (!/^\d{5}$/.test(formData.address.postalCode)) {
        errors.allgemein.push('Die Postleitzahl des Förderobjekts ist ungültig (muss 5 Ziffern haben)');
      }
      if (!formData.address.city?.trim()) {
        errors.allgemein.push('Ort des Förderobjekts fehlt');
      }

      // Aufstellung - Cost validation
      const JOB_TYPES = [
        { key: 'erdarbeiten', label: '1.1 Erdarbeiten', number: '1.1' },
        { key: 'maurerarbeiten', label: '1.2 Maurerarbeiten Fundamente', number: '1.2' },
        { key: 'putzStuck', label: '1.3 Putz- und Stuckarbeiten', number: '1.3' },
        { key: 'fliesenPlatten', label: '1.4 Fliesen- und Plattenarbeiten', number: '1.4' },
        { key: 'zimmererarbeiten', label: '1.5 Zimmererarbeiten', number: '1.5' },
        { key: 'dachdeckerarbeiten', label: '1.6 Dachdeckerarbeiten', number: '1.6' },
        { key: 'klempnerarbeiten', label: '1.7 Klempnerarbeiten', number: '1.7' },
        { key: 'tischlerarbeiten', label: '1.8 Tischlerarbeiten', number: '1.8' },
        { key: 'schlosserarbeiten', label: '1.9 Schlosserarbeiten', number: '1.9' },
        { key: 'anstrichTapezier', label: '1.10 Anstrich- und Tapezierarbeiten', number: '1.10' },
        { key: 'zentralheizung', label: '1.11 Zentralheizungen', number: '1.11' },
        { key: 'sanitaer', label: '1.12 Sanitäre Installation', number: '1.12' },
        { key: 'fussboden', label: '1.13 Fußboden, Teppichbelag', number: '1.13' },
        { key: 'elektro', label: '1.14 Elektroarbeiten', number: '1.14' },
        { key: 'sonstige', label: '1.15 Sonstige Gebäudearbeiten', number: '1.15', isEditable: true },
        { key: 'gartenanlagen', label: '2.1 Gartenanlagen', number: '2.1' },
        { key: 'wegeflaeche', label: '2.2 Wegefläche/Terrasse', number: '2.2' },
        { key: 'sonstigeAussen1', label: '2.3 Sonstige Außenanlagen', number: '2.3', isEditable: true },
        { key: 'sonstigeAussen2', label: '2.4 Weitere Außenanlagen', number: '2.4', isEditable: true },
        { key: 'architektur', label: '3.1 Architekturleistungen', number: '3.1' },
        { key: 'verwaltung', label: '3.2 Verwaltungsleistungen', number: '3.2' },
        { key: 'sonstigeBaunebenkosten1', label: '3.3 Sonstige Baunebenkosten', number: '3.3', isEditable: true },
        { key: 'sonstigeBaunebenkosten2', label: '3.4 Weitere Baunebenkosten', number: '3.4', isEditable: true }
      ];

      const hasAnySelbsthilfe = JOB_TYPES.some(jobType => {
        const entry = formData.costBreakdown?.[jobType.key as keyof typeof formData.costBreakdown];
        return entry?.selbsthilfe && entry.selbsthilfe.trim();
      });

      if (!hasAnySelbsthilfe) {
        errors.aufstellung.push('Es wurden keine Selbsthilfekosten für irgendeine Arbeitsart angegeben');
      }

      // Validate individual cost fields
      JOB_TYPES.forEach(jobType => {
        const entry = formData.costBreakdown?.[jobType.key as keyof typeof formData.costBreakdown];
        if (!entry) return;

        const hasDescription = (entry as any).description && (entry as any).description.trim();
        const hasMaterialkosten = entry.materialkosten && entry.materialkosten.trim();
        const hasLohnkosten = entry.lohnkosten && entry.lohnkosten.trim();
        const hasSelbsthilfe = entry.selbsthilfe && entry.selbsthilfe.trim();
        
        const hasAnyValue = hasDescription || hasMaterialkosten || hasLohnkosten || hasSelbsthilfe;
        
        if (hasAnyValue) {
          if (jobType.isEditable && !hasDescription) {
            errors.aufstellung.push(`${jobType.label}: Beschreibung fehlt`);
          }
          if (!hasMaterialkosten) {
            errors.aufstellung.push(`${jobType.label}: Materialkosten fehlen`);
          }
          if (!hasLohnkosten) {
            errors.aufstellung.push(`${jobType.label}: Lohnkosten fehlen`);
          }
          if (!hasSelbsthilfe) {
            errors.aufstellung.push(`${jobType.label}: Selbsthilfe-Angabe fehlt`);
          }
          
          // Check cost logic
          if (hasMaterialkosten && hasLohnkosten && hasSelbsthilfe) {
            const materialkosten = Number((entry.materialkosten || '0').replace(/[^0-9]/g, '')) / 100 || 0;
            const lohnkosten = Number((entry.lohnkosten || '0').replace(/[^0-9]/g, '')) / 100 || 0;
            const selbsthilfe = Number((entry.selbsthilfe || '0').replace(/[^0-9]/g, '')) / 100 || 0;
            
            if (selbsthilfe > 0 && (materialkosten + lohnkosten) < selbsthilfe) {
              errors.aufstellung.push(`${jobType.label}: Selbsthilfe (${formatCurrency(selbsthilfe)}) ist höher als Material- und Lohnkosten zusammen (${formatCurrency(materialkosten + lohnkosten)})`);
            }
          }
        }
      });

      // Check if total Selbsthilfe matches Hauptantrag amount
      if (hauptantragSelbsthilfe !== null && hauptantragSelbsthilfe !== undefined) {
        const totalSelbsthilfe = formData.totals?.totalSelbsthilfe || 0;
        if (totalSelbsthilfe !== hauptantragSelbsthilfe) {
          errors.aufstellung.push(`Die Gesamtsumme der Selbsthilfeleistungen (${formatCurrency(totalSelbsthilfe)}) weicht von der Angabe im Hauptantrag ab (${formatCurrency(hauptantragSelbsthilfe)})`);
        }
      }

      // Helfer - Validate helpers
      helpers.forEach((helper, index) => {
        // Skip main applicant if they won't help
        if (index === 0 && formData.mainApplicantWillHelp !== true) return;
        
        const helperType = index === 0 ? 'Hauptantragsteller' : `Helfer ${index}`;
        
        // Check if helper has any data entered OR if it's the main applicant
        const hasAnyData = helper.name?.trim() || helper.surname?.trim() || helper.email?.trim() || 
                          helper.jobTitle?.trim() || helper.jobNumbers.length > 0 || helper.hours?.trim();
        
        const isMainApplicant = index === 0;
        
        // For main applicant, always validate if they will help. For others, only validate if they have data
        if (isMainApplicant || hasAnyData) {
          if (!helper.name?.trim()) {
            errors.helfer.push(`${helperType}: Vorname fehlt`);
          }
          if (!helper.surname?.trim()) {
            errors.helfer.push(`${helperType}: Nachname fehlt`);
          }
          if (!helper.email?.trim()) {
            errors.helfer.push(`${helperType}: E-Mail-Adresse fehlt`);
          } else if (!isValidEmail(helper.email)) {
            errors.helfer.push(`${helperType}: Bitte geben Sie eine gültige E-Mail-Adresse ein`);
          }
          if (!helper.jobTitle?.trim()) {
            errors.helfer.push(`${helperType}: Berufsangabe fehlt`);
          }
          if (helper.jobNumbers.length === 0) {
            errors.helfer.push(`${helperType}: Keine Arbeitsnummern ausgewählt`);
          }
          if (!helper.hours?.trim()) {
            errors.helfer.push(`${helperType}: Stundenanzahl fehlt`);
          }

          // Address validation
          if (!helper.address.street?.trim()) {
            errors.helfer.push(`${helperType}: Straße der Adresse fehlt`);
          }
          if (!helper.address.houseNumber?.trim()) {
            errors.helfer.push(`${helperType}: Hausnummer der Adresse fehlt`);
          }
          if (!helper.address.postalCode?.trim()) {
            errors.helfer.push(`${helperType}: Postleitzahl der Adresse fehlt`);
          } else if (!/^\d{5}$/.test(helper.address.postalCode)) {
            errors.helfer.push(`${helperType}: Postleitzahl der Adresse ist ungültig`);
          }
          if (!helper.address.city?.trim()) {
            errors.helfer.push(`${helperType}: Ort der Adresse fehlt`);
          }

          // Check if selected job numbers have corresponding costs defined
          helper.jobNumbers.forEach(jobNumber => {
            const jobType = JOB_TYPES.find(jt => jt.number === jobNumber);
            if (jobType) {
              const entry = formData.costBreakdown?.[jobType.key as keyof typeof formData.costBreakdown];
              const hasSelbsthilfe = entry?.selbsthilfe && entry.selbsthilfe.trim();
              if (!hasSelbsthilfe) {
                errors.helfer.push(`${helperType}: Für ausgewählte Arbeit "${jobType.label}" sind keine Selbsthilfekosten definiert`);
              }
            }
          });
        }
      });
    }

    setValidationErrors(errors);
    const hasAnyErrors = errors.allgemein.length > 0 || errors.aufstellung.length > 0 || errors.helfer.length > 0;
    setShowValidationModal(hasAnyErrors);
    setShowSuccessModal(!hasAnyErrors);
  };

  if (isLoading) {
    return <div>Formular lädt...</div>;
  }

  return (
    <div className="selbsthilfe-review-container">
      <style>
        {`
          .selbsthilfe-review-container {
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
        <SelbsthilfeForm
          data={formData}
          helpers={helpers}
          onChange={() => {}} // No-op since this is read-only
          onHelpersChange={() => {}} // No-op since this is read-only
          showValidation={true}
          isReadOnly={true}
          hauptantragSelbsthilfe={hauptantragSelbsthilfe}
        />
      </div>

      {/* Validation Modal */}
      <Modal show={showValidationModal} onHide={() => setShowValidationModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Validierung: Gefundene Fehler</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="error-list">
            {/* Allgemein Section */}
            {validationErrors.allgemein.length > 0 && (
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h5 className="text-black mb-0 fw-medium">Allgemein</h5>
                </div>
                <div className="alert alert-danger mb-0">
                  <ul className="mb-0 ps-3">
                    {validationErrors.allgemein.map((error, index) => (
                      <li key={index} className="mb-2">
                        {error}
                        {index < validationErrors.allgemein.length - 1 && (
                          <hr className="my-2 border-danger opacity-25" />
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                {(validationErrors.aufstellung.length > 0 || validationErrors.helfer.length > 0) && (
                  <hr className="my-3 border-gray-300 opacity-50" />
                )}
              </div>
            )}

            {/* Aufstellung Section */}
            {validationErrors.aufstellung.length > 0 && (
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h5 className="text-black mb-0 fw-medium">Aufstellung Selbsthilfeleistungen</h5>
                </div>
                <div className="alert alert-danger mb-0">
                  <ul className="mb-0 ps-3">
                    {validationErrors.aufstellung.map((error, index) => (
                      <li key={index} className="mb-2">
                        {error}
                        {index < validationErrors.aufstellung.length - 1 && (
                          <hr className="my-2 border-danger opacity-25" />
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                {validationErrors.helfer.length > 0 && (
                  <hr className="my-3 border-gray-300 opacity-50" />
                )}
              </div>
            )}

            {/* Helfer Section */}
            {validationErrors.helfer.length > 0 && (
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h5 className="text-black mb-0 fw-medium">Angaben zu den Helfern</h5>
                </div>
                <div className="alert alert-danger mb-0">
                  <ul className="mb-0 ps-3">
                    {validationErrors.helfer.map((error, index) => (
                      <li key={index} className="mb-2">
                        {error}
                        {index < validationErrors.helfer.length - 1 && (
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
            <p className="mb-3"><strong>Die Selbsthilfeleistungsangaben sind vollständig und entsprechen den Anforderungen.</strong></p>
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

export default SelbsthilfeReviewContainer; 