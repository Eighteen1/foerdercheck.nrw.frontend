import React, { useState, useEffect } from 'react';
import { Container, Button, Modal, Spinner, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import SelbsthilfeForm from './SelbsthilfeForm';
import PDFDownloadButton from '../PDFDownload/PDFDownloadButton';

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
  costBreakdown: {
    erdarbeiten: {
      materialkosten: string;
      lohnkosten: string;
      selbsthilfe: string;
    };
    maurerarbeiten: {
      materialkosten: string;
      lohnkosten: string;
      selbsthilfe: string;
    };
    putzStuck: {
      materialkosten: string;
      lohnkosten: string;
      selbsthilfe: string;
    };
    fliesenPlatten: {
      materialkosten: string;
      lohnkosten: string;
      selbsthilfe: string;
    };
    zimmererarbeiten: {
      materialkosten: string;
      lohnkosten: string;
      selbsthilfe: string;
    };
    dachdeckerarbeiten: {
      materialkosten: string;
      lohnkosten: string;
      selbsthilfe: string;
    };
    klempnerarbeiten: {
      materialkosten: string;
      lohnkosten: string;
      selbsthilfe: string;
    };
    tischlerarbeiten: {
      materialkosten: string;
      lohnkosten: string;
      selbsthilfe: string;
    };
    schlosserarbeiten: {
      materialkosten: string;
      lohnkosten: string;
      selbsthilfe: string;
    };
    anstrichTapezier: {
      materialkosten: string;
      lohnkosten: string;
      selbsthilfe: string;
    };
    zentralheizung: {
      materialkosten: string;
      lohnkosten: string;
      selbsthilfe: string;
    };
    sanitaer: {
      materialkosten: string;
      lohnkosten: string;
      selbsthilfe: string;
    };
    fussboden: {
      materialkosten: string;
      lohnkosten: string;
      selbsthilfe: string;
    };
    elektro: {
      materialkosten: string;
      lohnkosten: string;
      selbsthilfe: string;
    };
    sonstige: {
      description: string;
      materialkosten: string;
      lohnkosten: string;
      selbsthilfe: string;
    };
    gartenanlagen: {
      materialkosten: string;
      lohnkosten: string;
      selbsthilfe: string;
    };
    wegeflaeche: {
      materialkosten: string;
      lohnkosten: string;
      selbsthilfe: string;
    };
    sonstigeAussen1: {
      description: string;
      materialkosten: string;
      lohnkosten: string;
      selbsthilfe: string;
    };
    sonstigeAussen2: {
      description: string;
      materialkosten: string;
      lohnkosten: string;
      selbsthilfe: string;
    };
    architektur: {
      materialkosten: string;
      lohnkosten: string;
      selbsthilfe: string;
    };
    verwaltung: {
      materialkosten: string;
      lohnkosten: string;
      selbsthilfe: string;
    };
    sonstigeBaunebenkosten1: {
      description: string;
      materialkosten: string;
      lohnkosten: string;
      selbsthilfe: string;
    };
    sonstigeBaunebenkosten2: {
      description: string;
      materialkosten: string;
      lohnkosten: string;
      selbsthilfe: string;
    };
  };
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

const SelbsthilfeContainer: React.FC = () => {
  const [formData, setFormData] = useState<SelbsthilfeData>(initialSelbsthilfeData);
  const [helpers, setHelpers] = useState<Helper[]>(initialHelpers);
  const [isLoading, setIsLoading] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    allgemein: string[];
    aufstellung: string[];
    helfer: string[];
  }>({ allgemein: [], aufstellung: [], helfer: [] });
  const [hauptantragSelbsthilfe, setHauptantragSelbsthilfe] = useState<number | null>(null);
  const [isInitializing, setIsInitializing] = useState(true); // Flag to prevent setting hasUnsavedChanges during initial form setup

  const { user } = useAuth();
  const navigate = useNavigate();

  // Sync hasUnsavedChanges with sessionStorage for routing protection
  useEffect(() => {
    if (hasUnsavedChanges) {
      sessionStorage.setItem('selbsthilfe_has_unsaved_changes', 'true');
      console.log('*** SETTING SELBSTHILFE UNSAVED CHANGES FLAG IN SESSIONSTORAGE ***');
    } else {
      sessionStorage.removeItem('selbsthilfe_has_unsaved_changes');
      console.log('*** REMOVING SELBSTHILFE UNSAVED CHANGES FLAG FROM SESSIONSTORAGE ***');
    }
    
    // Cleanup function to remove flag when component unmounts
    return () => {
      sessionStorage.removeItem('selbsthilfe_has_unsaved_changes');
      sessionStorage.removeItem('selbsthilfe_valid_navigation');
      console.log('*** CLEANING UP SELBSTHILFE UNSAVED CHANGES FLAG ON COMPONENT UNMOUNT ***');
    };
  }, [hasUnsavedChanges]);

  // Handle browser back/forward navigation directly in the component
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      console.log('*** SELBSTHILFE COMPONENT: POPSTATE EVENT FIRED ***');
      console.log('*** SELBSTHILFE COMPONENT: hasUnsavedChanges =', hasUnsavedChanges, '***');
      
      if (hasUnsavedChanges) {
        console.log('*** SELBSTHILFE COMPONENT: UNSAVED CHANGES DETECTED - SHOWING CONFIRMATION ***');
        
        // Show confirmation dialog first
        const confirmed = window.confirm(
          'Sie haben ungespeicherte Änderungen. Wenn Sie fortfahren, gehen diese verloren. Möchten Sie trotzdem fortfahren?'
        );
        
        if (!confirmed) {
          console.log('*** SELBSTHILFE COMPONENT: USER CANCELLED - PREVENTING NAVIGATION ***');
          // Prevent the default navigation and push current state back
          e.preventDefault();
          window.history.pushState(null, '', window.location.href);
          
          // Set navigation flag to prevent routing protection from redirecting
          const navigationKey = `selbsthilfe_navigation_${Date.now()}`;
          sessionStorage.setItem('selbsthilfe_valid_navigation', navigationKey);
          console.log('*** SELBSTHILFE COMPONENT: SETTING NAVIGATION FLAG AFTER CANCELLING POPSTATE ***');
        } else {
          console.log('*** SELBSTHILFE COMPONENT: USER CONFIRMED - ALLOWING NAVIGATION ***');
          
          // Clean up navigation flag since user is leaving
          sessionStorage.removeItem('selbsthilfe_valid_navigation');
          
          // Clear unsaved changes immediately
          setHasUnsavedChanges(false);
          
          // Don't prevent the default - let the navigation proceed naturally
          console.log('*** SELBSTHILFE COMPONENT: ALLOWING NATURAL NAVIGATION ***');
          navigate('/document-upload', { state: { from: 'selbsthilfe' } });
        }
      } else {
        console.log('*** SELBSTHILFE COMPONENT: NO UNSAVED CHANGES - ALLOWING NAVIGATION ***');
        // Don't interfere with navigation when there are no unsaved changes
        // The user should be able to navigate normally
      }
    };
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'Sie haben ungespeicherte Änderungen. Sind Sie sicher, dass Sie die Seite verlassen möchten?';
        return 'Sie haben ungespeicherte Änderungen. Sind Sie sicher, dass Sie die Seite verlassen möchten?';
      }
    };
    
    // Only add popstate listener and push history state when there are unsaved changes
    if (hasUnsavedChanges) {
      console.log('*** SELBSTHILFE COMPONENT: ADDING POPSTATE LISTENER FOR UNSAVED CHANGES ***');
      // Push initial state to enable popstate detection
      window.history.pushState(null, '', window.location.href);
      
      // Add popstate listener
      window.addEventListener('popstate', handlePopState);
    }
    
    // Always add beforeunload listener
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Cleanup
    return () => {
      // Always remove popstate listener to prevent memory leaks
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // Load data from Supabase
  useEffect(() => {
    const loadSavedData = async () => {
      if (!user?.id) return;

      setIsLoading(true);
      setIsInitializing(true);
      try {
        // Load user data for validation toggle and personal details
        const { data: userData, error: userError } = await supabase
          .from('user_data')
          .select('should_show_error_selbsthilfe, firstname, lastname, person_street, person_housenumber, person_postalcode, person_city, email, employment_title')
          .eq('id', user.id)
          .single();

        if (userError && userError.code !== 'PGRST116') {
          console.error('Error loading user data:', userError);
        }

        // Load object data for form content and object address
        const { data: objectData, error: objectError } = await supabase
          .from('object_data')
          .select('selbsthilfe_angaben, selbsthilfe_helfer, obj_street, obj_house_number, obj_postal_code, obj_city')
          .eq('user_id', user.id)
          .single();

        if (objectError && objectError.code !== 'PGRST116') {
          console.error('Error loading object data:', objectError);
        }

        // Load finance data to get selbsthilfe amount from Hauptantrag
        const { data: financeData, error: financeError } = await supabase
          .from('finance_structure')
          .select('selbsthilfe')
          .eq('user_id', user.id)
          .single();

        if (financeError && financeError.code !== 'PGRST116') {
          console.error('Error loading finance data:', financeError);
        }

        // Set hauptantrag selbsthilfe amount
        const selbsthilfeAmount = financeData?.selbsthilfe !== undefined ? financeData.selbsthilfe : null;
        setHauptantragSelbsthilfe(selbsthilfeAmount);

        // Set showValidation based on database value
        const shouldShowError = userData?.should_show_error_selbsthilfe ?? false;
        setShowValidation(shouldShowError);

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

        // Set form data from database - combine saved data with address from individual columns
        const savedData = objectData?.selbsthilfe_angaben;
        let formDataToSet = savedData ? { ...initialData, ...savedData } : initialData;

        // Auto-set willProvideSelfHelp based on selbsthilfe amount from Hauptantrag if not already set
        if (formDataToSet.willProvideSelfHelp === null && selbsthilfeAmount !== null) {
          if (selbsthilfeAmount > 0) {
            formDataToSet = { ...formDataToSet, willProvideSelfHelp: true };
          } else if (selbsthilfeAmount === 0) {
            formDataToSet = { ...formDataToSet, willProvideSelfHelp: false };
          }
        }

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
        // Set initializing to false after a short delay to allow form effects to complete
        setTimeout(() => setIsInitializing(false), 100);
      } catch (error) {
        console.error('Error loading saved data:', error);
        setIsLoading(false);
        setIsInitializing(false);
      }
    };

    loadSavedData();
  }, [user?.id]);

  // Handle form data changes
  const handleFormChange = (data: Partial<SelbsthilfeData>) => {
    setFormData(prevData => ({ ...prevData, ...data }));
    
    // Only set unsaved changes if we're not in the initializing phase
    if (!isInitializing) {
      // Check if the data actually changed by comparing with previous state
      const hasActualChanges = Object.keys(data).some(key => {
        const newValue = data[key as keyof typeof data];
        const oldValue = formData[key as keyof typeof formData];
        
        if (typeof newValue === 'object' && newValue !== null) {
          // For nested objects like costBreakdown, do deep comparison
          return JSON.stringify(newValue) !== JSON.stringify(oldValue);
        }
        
        return newValue !== oldValue;
      });
      
      if (hasActualChanges) {
        setHasUnsavedChanges(true);
      }
    }
  };

  // Handle helpers changes
  const handleHelpersChange = (newHelpers: Helper[]) => {
    // Only set unsaved changes if we're not in the initializing phase
    if (!isInitializing) {
      // Only set unsaved changes if the helpers actually changed
      const hasActualChanges = JSON.stringify(newHelpers) !== JSON.stringify(helpers);
      
      if (hasActualChanges) {
        setHelpers(newHelpers);
        setHasUnsavedChanges(true);
      }
    }
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
      const selbsthilfeProgress = calculateProgress();
      console.log('Selbsthilfe Progress calculation completed:', selbsthilfeProgress);

      // Prepare form data without address (address will be saved to individual columns)
      const { address, ...formDataWithoutAddress } = formData;

      // Prepare helpers data - for main applicant (index 0), only save hours and jobNumbers if they will help
      const helpersToSave = helpers.map((helper, index) => {
        if (index === 0) {
          // Main applicant - only save hours and jobNumbers if they will help
          if (formData.mainApplicantWillHelp === true) {
            return {
              id: helper.id,
              hours: helper.hours,
              jobNumbers: helper.jobNumbers
            };
          } else {
            // If main applicant won't help, set hours and jobNumbers to null
            return {
              id: helper.id,
              hours: "",
              jobNumbers: []
            };
          }
        } else {
          // Other helpers - save all data
          return helper;
        }
      });

      // Update object_data
      const { error: objectError } = await supabase
        .from('object_data')
        .upsert({
          user_id: user.id,
          obj_street: formData.address.street,
          obj_house_number: formData.address.houseNumber,
          obj_postal_code: formData.address.postalCode,
          obj_city: formData.address.city,
          selbsthilfe_angaben: formDataWithoutAddress,
          selbsthilfe_helfer: helpersToSave,
          updated_at: new Date().toISOString()
        });

      if (objectError) throw objectError;

      // Update user_data with progress and main applicant personal details
      const mainApplicant = helpers[0];
      const { error: userError } = await supabase
        .from('user_data')
        .update({
          selbsthilfe_progress: selbsthilfeProgress,
          firstname: mainApplicant?.name || null,
          lastname: mainApplicant?.surname || null,
          email: mainApplicant?.email || null,
          employment_title: mainApplicant?.jobTitle || null,
          person_street: mainApplicant?.address?.street || null,
          person_housenumber: mainApplicant?.address?.houseNumber || null,
          person_postalcode: mainApplicant?.address?.postalCode || null,
          person_city: mainApplicant?.address?.city || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (userError) throw userError;

      setIsLoading(false);
      setShowModal(true);
      setHasUnsavedChanges(false);
      
      if (navigateAfterSave) {
        navigate('/document-upload', { state: { from: 'selbsthilfe' } });
      }
    } catch (error) {
      console.error('Error saving data:', error);
      setIsLoading(false);
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {
      allgemein: [] as string[],
      aufstellung: [] as string[],
      helfer: [] as string[]
    };

    // Allgemein - Check if will provide self help is answered
    if (formData.willProvideSelfHelp === null || formData.willProvideSelfHelp === undefined) {
      errors.allgemein.push('Bitte geben Sie an, ob Sie Selbsthilfeleistungen erbringen werden');
    } else if (hauptantragSelbsthilfe !== null && hauptantragSelbsthilfe > 0 && formData.willProvideSelfHelp === false) {
      // Check for inconsistency with Hauptantrag selbsthilfe amount
      const formatCurrency = (value: number): string => {
        return new Intl.NumberFormat('de-DE', {
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: 2
        }).format(value);
      };
      errors.allgemein.push(`Sie haben im Hauptantrag einen Selbsthilfe-Betrag von ${formatCurrency(hauptantragSelbsthilfe)} angegeben. Falls Sie Selbsthilfe zur Finanzierung des Projekts erbringen, wählen Sie bitte "Ja" aus.`);
    }

    // If providing self help, validate the rest
    if (formData.willProvideSelfHelp === true) {
      // Allgemein - Check if main applicant will help is answered
      if (formData.mainApplicantWillHelp === null || formData.mainApplicantWillHelp === undefined) {
        errors.allgemein.push('Bitte geben Sie an, ob Sie sich an den Selbsthilfeleistungen beteiligen werden');
      }

      // Allgemein - Address validation
      if (!formData.address.street?.trim()) {
        errors.allgemein.push('Straße ist erforderlich');
      }
      if (!formData.address.houseNumber?.trim()) {
        errors.allgemein.push('Hausnummer ist erforderlich');
      }
      if (!formData.address.postalCode?.trim()) {
        errors.allgemein.push('Postleitzahl ist erforderlich');
      } else if (!/^\d{5}$/.test(formData.address.postalCode)) {
        errors.allgemein.push('Die Postleitzahl muss aus genau 5 Ziffern bestehen');
      }
      if (!formData.address.city?.trim()) {
        errors.allgemein.push('Ort ist erforderlich');
      }

      // Aufstellung - Cost validation - Check if any selbsthilfe costs are defined at all
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
        errors.aufstellung.push('Es müssen mindestens für eine Arbeitsart Selbsthilfekosten angegeben werden');
      }

      // Aufstellung - Cost field validation - if any field is filled, all must be filled
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
            errors.aufstellung.push(`${jobType.label}: Beschreibung ist erforderlich`);
          }
          if (!hasMaterialkosten) {
            errors.aufstellung.push(`${jobType.label}: Materialkosten sind erforderlich`);
          }
          if (!hasLohnkosten) {
            errors.aufstellung.push(`${jobType.label}: Lohnkosten sind erforderlich`);
          }
          if (!hasSelbsthilfe) {
            errors.aufstellung.push(`${jobType.label}: Selbsthilfe ist erforderlich`);
          }
          
          // Check cost logic
          if (hasMaterialkosten && hasLohnkosten && hasSelbsthilfe) {
            const materialkosten = Number((entry.materialkosten || '0').replace(/[^0-9]/g, '')) / 100 || 0;
            const lohnkosten = Number((entry.lohnkosten || '0').replace(/[^0-9]/g, '')) / 100 || 0;
            const selbsthilfe = Number((entry.selbsthilfe || '0').replace(/[^0-9]/g, '')) / 100 || 0;
            
            if (selbsthilfe > 0 && (materialkosten + lohnkosten) < selbsthilfe) {
              const formatCurrency = (value: number): string => {
                return new Intl.NumberFormat('de-DE', {
                  style: 'currency',
                  currency: 'EUR',
                  minimumFractionDigits: 2
                }).format(value);
              };
              errors.aufstellung.push(`${jobType.label}: Selbsthilfe (${formatCurrency(selbsthilfe)}) kann nicht höher sein als Material- und Lohnkosten zusammen (${formatCurrency(materialkosten + lohnkosten)})`);
            }
          }
        }
      });

      // Aufstellung - Check if total Selbsthilfe matches Hauptantrag amount
      if (hauptantragSelbsthilfe !== null && hauptantragSelbsthilfe !== undefined) {
        const totalSelbsthilfe = formData.totals?.totalSelbsthilfe || 0;
        if (totalSelbsthilfe !== hauptantragSelbsthilfe) {
          const formatCurrency = (value: number): string => {
            return new Intl.NumberFormat('de-DE', {
              style: 'currency',
              currency: 'EUR',
              minimumFractionDigits: 2
            }).format(value);
          };
          errors.aufstellung.push(`Die Summe der Selbsthilfeleistungen (${formatCurrency(totalSelbsthilfe)}) weicht von Ihrer Angabe im Hauptantrag ab (${formatCurrency(hauptantragSelbsthilfe)}). Bitte korrigieren Sie die Beträge oder passen Sie den Selbsthilfe-Betrag in Schritt 6 des Hauptantrags an.`);
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
            errors.helfer.push(`${helperType}: E-Mail fehlt`);
          } else if (!isValidEmail(helper.email)) {
            errors.helfer.push(`${helperType}: Bitte geben Sie eine gültige E-Mail-Adresse ein`);
          }
          if (!helper.jobTitle?.trim()) {
            errors.helfer.push(`${helperType}: Beruf fehlt`);
          }
          if (helper.jobNumbers.length === 0) {
            errors.helfer.push(`${helperType}: Mindestens eine Arbeitsnummer muss ausgewählt werden`);
          }
          if (!helper.hours?.trim()) {
            errors.helfer.push(`${helperType}: Anzahl der Stunden fehlt`);
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
            errors.helfer.push(`${helperType}: Postleitzahl muss aus genau 5 Ziffern bestehen`);
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
    setShowValidation(true);
  };

  // Calculate progress based on validation logic (similar to SelbstauskunftContainer)
  const calculateProgress = () => {
    let totalPotentialFields = 0;
    let actualErrors = 0;

    // 1. Basic question: willProvideSelfHelp
    totalPotentialFields += 1;
    if (formData.willProvideSelfHelp === null || formData.willProvideSelfHelp === undefined) {
      actualErrors += 1;
    } else if (hauptantragSelbsthilfe !== null && hauptantragSelbsthilfe > 0 && formData.willProvideSelfHelp === false) {
      // Inconsistency with Hauptantrag selbsthilfe amount
      actualErrors += 0.5;
    }

    // If no self help will be provided and no inconsistency, we're done
    if (formData.willProvideSelfHelp === false) {
      return totalPotentialFields > 0 ? Math.round(((totalPotentialFields - actualErrors) / totalPotentialFields) * 100) : 100;
    }

    // If providing self help, validate the rest
    if (formData.willProvideSelfHelp === true) {
      // 2. Main applicant participation question
      totalPotentialFields += 1;
      if (formData.mainApplicantWillHelp === null || formData.mainApplicantWillHelp === undefined) {
        actualErrors += 1;
      }

      // 3. Address validation (4 fields)
      totalPotentialFields += 4;
      if (!formData.address.street?.trim()) actualErrors += 1;
      if (!formData.address.houseNumber?.trim()) actualErrors += 1;
      if (!formData.address.postalCode?.trim()) actualErrors += 1;
      else if (!/^\d{5}$/.test(formData.address.postalCode)) actualErrors += 1;
      if (!formData.address.city?.trim()) actualErrors += 1;

      // 4. Cost breakdown validation
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

      // Check if any selbsthilfe costs are defined at all
      totalPotentialFields += 1;
      const hasAnySelbsthilfe = JOB_TYPES.some(jobType => {
        const entry = formData.costBreakdown?.[jobType.key as keyof typeof formData.costBreakdown];
        return entry?.selbsthilfe && entry.selbsthilfe.trim();
      });
      if (!hasAnySelbsthilfe) actualErrors += 1;

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
          if (jobType.isEditable) {
            totalPotentialFields += 4; // description + 3 cost fields
            if (!hasDescription) actualErrors += 1;
          } else {
            totalPotentialFields += 3; // 3 cost fields
          }
          if (!hasMaterialkosten) actualErrors += 1;
          if (!hasLohnkosten) actualErrors += 1;
          if (!hasSelbsthilfe) actualErrors += 1;
          
          // Check cost logic
          if (hasMaterialkosten && hasLohnkosten && hasSelbsthilfe) {
            totalPotentialFields += 1; // logical constraint
            const materialkosten = Number((entry.materialkosten || '0').replace(/[^0-9]/g, '')) / 100 || 0;
            const lohnkosten = Number((entry.lohnkosten || '0').replace(/[^0-9]/g, '')) / 100 || 0;
            const selbsthilfe = Number((entry.selbsthilfe || '0').replace(/[^0-9]/g, '')) / 100 || 0;
            
            if (selbsthilfe > 0 && (materialkosten + lohnkosten) < selbsthilfe) {
              actualErrors += 1;
            }
          }
        }
      });

      // Check total Selbsthilfe matches Hauptantrag amount
      if (hauptantragSelbsthilfe !== null && hauptantragSelbsthilfe !== undefined) {
        totalPotentialFields += 1;
        const totalSelbsthilfe = formData.totals?.totalSelbsthilfe || 0;
        if (totalSelbsthilfe !== hauptantragSelbsthilfe) {
          actualErrors += 1;
        }
      }

      // 5. Helpers validation
      helpers.forEach((helper, index) => {
        // Skip main applicant if they won't help
        if (index === 0 && formData.mainApplicantWillHelp !== true) return;
        
        // Check if helper has any data entered OR if it's the main applicant
        const hasAnyData = helper.name?.trim() || helper.surname?.trim() || helper.email?.trim() || 
                          helper.jobTitle?.trim() || helper.jobNumbers.length > 0 || helper.hours?.trim();
        
        const isMainApplicant = index === 0;
        
        // For main applicant, always validate if they will help. For others, only validate if they have data
        if (isMainApplicant || hasAnyData) {
          totalPotentialFields += 9; // name, surname, email, jobTitle, jobNumbers, hours, address (4 fields)
          
          if (!helper.name?.trim()) actualErrors += 1;
          if (!helper.surname?.trim()) actualErrors += 1;
          if (!helper.email?.trim()) actualErrors += 1;
          else if (!isValidEmail(helper.email)) actualErrors += 1;
          if (!helper.jobTitle?.trim()) actualErrors += 1;
          if (helper.jobNumbers.length === 0) actualErrors += 1;
          if (!helper.hours?.trim()) actualErrors += 1;

          // Address validation
          if (!helper.address.street?.trim()) actualErrors += 1;
          if (!helper.address.houseNumber?.trim()) actualErrors += 1;
          if (!helper.address.postalCode?.trim()) actualErrors += 1;
          else if (!/^\d{5}$/.test(helper.address.postalCode)) actualErrors += 1;
          if (!helper.address.city?.trim()) actualErrors += 1;

          // Check if selected job numbers have corresponding costs defined
          helper.jobNumbers.forEach(jobNumber => {
            totalPotentialFields += 1;
            const jobType = JOB_TYPES.find(jt => jt.number === jobNumber);
            if (jobType) {
              const entry = formData.costBreakdown?.[jobType.key as keyof typeof formData.costBreakdown];
              const hasSelbsthilfe = entry?.selbsthilfe && entry.selbsthilfe.trim();
              if (!hasSelbsthilfe) {
                actualErrors += 1;
              }
            }
          });
        }
      });
    }

    return totalPotentialFields > 0 ? Math.round(((totalPotentialFields - actualErrors) / totalPotentialFields) * 100) : 100;
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
            should_show_error_selbsthilfe: newShowValidation,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (error) {
          console.error('Error updating should_show_error_selbsthilfe:', error);
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
        <span className="blue-corner-text">SELBSTHILFELEISTUNGEN</span>
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

          <PDFDownloadButton formType="selbsthilfe" />

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
          <SelbsthilfeForm
            data={formData}
            helpers={helpers}
            onChange={handleFormChange}
            onHelpersChange={handleHelpersChange}
            showValidation={showValidation}
            isReadOnly={false}
            hauptantragSelbsthilfe={hauptantragSelbsthilfe}
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
                navigate('/document-upload', { state: { from: 'selbsthilfe' } });
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

export default SelbsthilfeContainer; 