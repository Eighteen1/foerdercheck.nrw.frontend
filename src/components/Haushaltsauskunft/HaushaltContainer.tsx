import React, { useState, useEffect } from 'react';
import { Container, Button, Modal, Spinner, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { completelyRemovePerson } from '../../lib/personCleanup';
import HaushaltForm from './HaushaltForm';
import PDFDownloadButton from '../PDFDownload/PDFDownloadButton';

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

const HaushaltContainer: React.FC = () => {
  const [formData, setFormData] = useState<HaushaltData>(initialHaushaltData);
  const [isLoading, setIsLoading] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [personToDelete, setPersonToDelete] = useState<{
    personId: string;
    person: Person;
    hasFinancialData: boolean;
    isApplicant: boolean;
  } | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    mainApplicant: string[];
    additionalPersons: string[];
    general: string[];
  }>({ mainApplicant: [], additionalPersons: [], general: [] });

  const { user } = useAuth();
  const navigate = useNavigate();

  // Sync hasUnsavedChanges with sessionStorage for routing protection
  useEffect(() => {
    if (hasUnsavedChanges) {
      sessionStorage.setItem('haushaltsauskunft_has_unsaved_changes', 'true');
      console.log('*** SETTING HAUSHALTSAUSKUNFT UNSAVED CHANGES FLAG IN SESSIONSTORAGE ***');
    } else {
      sessionStorage.removeItem('haushaltsauskunft_has_unsaved_changes');
      console.log('*** REMOVING HAUSHALTSAUSKUNFT UNSAVED CHANGES FLAG FROM SESSIONSTORAGE ***');
    }
    
    // Cleanup function to remove flag when component unmounts
    return () => {
      sessionStorage.removeItem('haushaltsauskunft_has_unsaved_changes');
      sessionStorage.removeItem('haushaltsauskunft_valid_navigation');
      console.log('*** CLEANING UP HAUSHALTSAUSKUNFT UNSAVED CHANGES FLAG ON COMPONENT UNMOUNT ***');
    };
  }, [hasUnsavedChanges]);

  // Handle browser back/forward navigation directly in the component
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      console.log('*** HAUSHALTSAUSKUNFT COMPONENT: POPSTATE EVENT FIRED ***');
      
      if (hasUnsavedChanges) {
        console.log('*** HAUSHALTSAUSKUNFT COMPONENT: UNSAVED CHANGES DETECTED - SHOWING CONFIRMATION ***');
        
        // Show confirmation dialog first
        const confirmed = window.confirm(
          'Sie haben ungespeicherte Änderungen. Wenn Sie fortfahren, gehen diese verloren. Möchten Sie trotzdem fortfahren?'
        );
        
        if (!confirmed) {
          console.log('*** HAUSHALTSAUSKUNFT COMPONENT: USER CANCELLED - PREVENTING NAVIGATION ***');
          // Prevent the default navigation and push current state back
          e.preventDefault();
          window.history.pushState(null, '', window.location.href);
          
          // Set navigation flag to prevent routing protection from redirecting
          const navigationKey = `haushaltsauskunft_navigation_${Date.now()}`;
          sessionStorage.setItem('haushaltsauskunft_valid_navigation', navigationKey);
          console.log('*** HAUSHALTSAUSKUNFT COMPONENT: SETTING NAVIGATION FLAG AFTER CANCELLING POPSTATE ***');
        } else {
          console.log('*** HAUSHALTSAUSKUNFT COMPONENT: USER CONFIRMED - ALLOWING NAVIGATION ***');
          
          // Clean up navigation flag since user is leaving
          sessionStorage.removeItem('haushaltsauskunft_valid_navigation');
          
          // Clear unsaved changes immediately
          setHasUnsavedChanges(false);
          
          // Don't prevent the default - let the navigation proceed naturally
          console.log('*** HAUSHALTSAUSKUNFT COMPONENT: ALLOWING NATURAL NAVIGATION ***');
          navigate('/personal-space', { state: { from: 'haushaltsauskunft' } });
        }
      } else {
        console.log('*** HAUSHALTSAUSKUNFT COMPONENT: NO UNSAVED CHANGES - ALLOWING NAVIGATION ***');
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
      console.log('*** HAUSHALTSAUSKUNFT COMPONENT: ADDING POPSTATE LISTENER FOR UNSAVED CHANGES ***');
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

  // Generate UUID helper function
  const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Check if person has financial data
  const checkIfPersonHasFinancialData = async (personId: string): Promise<boolean> => {
    if (!user?.id) return false;
    
    try {
      const { data: financialData, error } = await supabase
        .from('user_financials')
        .select('additional_applicants_financials')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error checking financial data:', error);
        return false;
      }

      const additionalFinancials = financialData?.additional_applicants_financials || {};
      
      // Check if the person has financial data in the additional_applicants_financials
      if (additionalFinancials[personId]) {
        const personFinancialData = additionalFinancials[personId];
        // Check if any financial fields are filled
        return Object.values(personFinancialData).some(value => 
          value !== null && value !== undefined && value !== ''
        );
      }

      return false;
    } catch (error) {
      console.error('Error checking financial data:', error);
      return false;
    }
  };

  // Check if person is an applicant
  const checkIfPersonIsApplicant = async (personId: string): Promise<boolean> => {
    if (!user?.id) return false;
    
    try {
      const { data: userData, error } = await supabase
        .from('user_data')
        .select('weitere_antragstellende_personen')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error checking applicant status:', error);
        return false;
      }

      const weiterePersonen = userData?.weitere_antragstellende_personen || {};
      const person = weiterePersonen[personId];
      
      return person && person.isApplicant === true;
    } catch (error) {
      console.error('Error checking applicant status:', error);
      return false;
    }
  };

  // Enhanced remove person function
  const removePerson = async (personId: string) => {
    const person = formData.additionalPersons.find(p => p.id === personId);
    if (!person) return;

    // Check if person has financial data or is an applicant
    const hasFinancialData = await checkIfPersonHasFinancialData(personId);
    const isApplicant = await checkIfPersonIsApplicant(personId);

    if (hasFinancialData || isApplicant) {
      // Show confirmation modal
      setPersonToDelete({
        personId,
        person,
        hasFinancialData,
        isApplicant
      });
      setShowDeleteModal(true);
    } else {
      // Regular removal without confirmation
      const updatedPersons = formData.additionalPersons.filter(person => person.id !== personId);
      const updatedWithoutIncome = formData.personsWithoutIncome.filter(id => id !== personId);
      setFormData(prevData => ({
        ...prevData,
        additionalPersons: updatedPersons,
        personsWithoutIncome: updatedWithoutIncome
      }));
      setHasUnsavedChanges(true);
    }
  };

  // Handle delete modal options
  const handleDeleteOption = async (option: 'remove-household' | 'remove-completely') => {
    if (!personToDelete || !user?.id) return;
    
    setIsLoading(true);
    try {
      if (option === 'remove-household') {
        // Only remove from household, keep as applicant but remove financial data
        const updatedPersons = formData.additionalPersons.filter(person => person.id !== personToDelete.personId);
        const updatedWithoutIncome = formData.personsWithoutIncome.filter(id => id !== personToDelete.personId);
        setFormData(prevData => ({
          ...prevData,
          additionalPersons: updatedPersons,
          personsWithoutIncome: updatedWithoutIncome
        }));

        // Remove from financial data
        const { data: existingFinancialData, error: financialError } = await supabase
          .from('user_financials')
          .select('additional_applicants_financials')
          .eq('user_id', user.id)
          .single();

        if (financialError && financialError.code !== 'PGRST116') {
          console.error('Error loading existing financial data:', financialError);
        }

        const additionalFinancials = existingFinancialData?.additional_applicants_financials || {};
        const updatedAdditionalFinancials = { ...additionalFinancials };
        delete updatedAdditionalFinancials[personToDelete.personId];

        await supabase
          .from('user_financials')
          .update({
            additional_applicants_financials: Object.keys(updatedAdditionalFinancials).length > 0 ? updatedAdditionalFinancials : null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        // Add notHousehold flag to user_data
        const { data: existingUserData, error: userError } = await supabase
          .from('user_data')
          .select('weitere_antragstellende_personen')
          .eq('id', user.id)
          .single();

        if (userError && userError.code !== 'PGRST116') {
          console.error('Error loading existing user data:', userError);
        }

        const weiterePersonen = existingUserData?.weitere_antragstellende_personen || {};
        const updatedWeiterePersonen = { ...weiterePersonen };
        
        if (updatedWeiterePersonen[personToDelete.personId]) {
          updatedWeiterePersonen[personToDelete.personId] = {
            ...updatedWeiterePersonen[personToDelete.personId],
            notHousehold: true
          };
        }

        await supabase
          .from('user_data')
          .update({
            weitere_antragstellende_personen: Object.keys(updatedWeiterePersonen).length > 0 ? updatedWeiterePersonen : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

      } else if (option === 'remove-completely') {
        // Remove completely from all forms using the comprehensive cleanup function
        await completelyRemovePerson(user.id, personToDelete.personId);
        
        // Update local state
        const updatedPersons = formData.additionalPersons.filter(person => person.id !== personToDelete.personId);
        const updatedWithoutIncome = formData.personsWithoutIncome.filter(id => id !== personToDelete.personId);
        setFormData(prevData => ({
          ...prevData,
          additionalPersons: updatedPersons,
          personsWithoutIncome: updatedWithoutIncome
        }));
      }

      setShowDeleteModal(false);
      setPersonToDelete(null);
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error('Error handling delete option:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data from Supabase
  useEffect(() => {
    const loadSavedData = async () => {
      if (!user?.id) return;

      setIsLoading(true);
      try {
        // Load user data
        const { data: userData, error: userError } = await supabase
          .from('user_data')
          .select('firstname, lastname, birthDate, employment_title, main_entrydate, main_behinderungsgrad, main_pflegegrad, noIncome, weitere_antragstellende_personen, ispregnant, should_show_error_haushaltsauskunft')
          .eq('id', user.id)
          .single();

        if (userError && userError.code !== 'PGRST116') {
          console.error('Error loading user data:', userError);
        }

        if (userData) {
          // Set showValidation based on database value
          const shouldShowError = userData?.should_show_error_haushaltsauskunft ?? false;
          setShowValidation(shouldShowError);

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
  }, [user?.id]);

  // Handle form data changes
  const handleFormChange = (data: Partial<HaushaltData>) => {
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
      const haushaltProgress = calculateProgress();
      console.log('Haushaltsauskunft Progress calculation completed:', haushaltProgress);

      // Load existing weitere_antragstellende_personen to preserve applicant data
      const { data: existingUserData, error: existingError } = await supabase
        .from('user_data')
        .select('weitere_antragstellende_personen')
        .eq('id', user.id)
        .single();

      if (existingError && existingError.code !== 'PGRST116') {
        console.error('Error loading existing user data:', existingError);
      }

      const existingPersonsData = existingUserData?.weitere_antragstellende_personen || {};
      let existingPersonsObj: Record<string, any> = {};
      
      // Handle backwards compatibility: convert array to UUID-based object if needed
      if (Array.isArray(existingPersonsData)) {
        // Legacy array format - convert to UUID-based object
        existingPersonsData.forEach((person: any) => {
          const uuid = person.id || generateUUID();
          existingPersonsObj[uuid] = { ...person, id: uuid };
        });
      } else {
        // Already UUID-based object format
        existingPersonsObj = existingPersonsData;
      }

      // Create updated persons object using UUIDs
      const updatedPersonsObj: Record<string, any> = { ...existingPersonsObj };

      // Update household persons while preserving applicant data
      formData.additionalPersons.forEach(person => {
        const existingPerson = existingPersonsObj[person.id];

        updatedPersonsObj[person.id] = {
          ...existingPerson, // Preserve all existing fields including isApplicant
          id: person.id, // Ensure ID is preserved
          firstName: person.firstName,
          lastName: person.lastName,
          birthDate: person.birthDate,
          employment_title: person.employment_title,
          entrydate: person.entrydate,
          behinderungsgrad: person.behinderungsgrad,
          pflegegrad: person.pflegegrad,
          noIncome: formData.personsWithoutIncome.includes(person.id)
        };
      });

      // Remove any persons that were deleted from the household form
      // but only if they're not applicants
      Object.keys(existingPersonsObj).forEach(uuid => {
        const existingPerson = existingPersonsObj[uuid];
        const stillInHousehold = formData.additionalPersons.some(p => p.id === uuid);
        
        // If the person is not in the household form anymore and is not an applicant, remove them
        if (!stillInHousehold && !existingPerson.isApplicant) {
          delete updatedPersonsObj[uuid];
        }
      });

      // Update user_data
      const { error: userError } = await supabase
        .from('user_data')
        .update({
          firstname: formData.mainApplicant.firstName || null,
          lastname: formData.mainApplicant.lastName || null,
          birthDate: formData.mainApplicant.birthDate || null,
          employment_title: formData.mainApplicant.employment_title || null,
          main_entrydate: formData.mainApplicant.entrydate || null,
          main_behinderungsgrad: formData.mainApplicant.behinderungsgrad || null,
          main_pflegegrad: formData.mainApplicant.pflegegrad || null,
          noIncome: formData.personsWithoutIncome.includes('main_applicant'),
          weitere_antragstellende_personen: Object.keys(updatedPersonsObj).length > 0 ? updatedPersonsObj : null,
          ispregnant: formData.ispregnant,
          haushaltsauskunft_progress: haushaltProgress,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (userError) throw userError;

      setIsLoading(false);
      setShowModal(true);
      setHasUnsavedChanges(false);
      
      if (navigateAfterSave) {
        navigate('/personal-space');
      }
    } catch (error) {
      console.error('Error saving data:', error);
      setIsLoading(false);
    }
  };

  // Validation helper functions
  const isValidBirthDate = (birthDate: string): boolean => {
    if (!birthDate) return false;
    
    const date = new Date(birthDate);
    const now = new Date();
    const minDate = new Date(now.getFullYear() - 115, now.getMonth(), now.getDate());
    const maxDate = new Date(now.getFullYear(), now.getMonth() + 10, now.getDate());
    
    return date >= minDate && date <= maxDate;
  };

  const isValidEntryDate = (entryDate: string): boolean => {
    if (!entryDate) return false;
    
    const date = new Date(entryDate);
    const now = new Date();
    const minDate = new Date(now.getFullYear() - 115, now.getMonth(), now.getDate());
    const maxDate = new Date(now.getFullYear() + 3, now.getMonth(), now.getDate());
    
    return date >= minDate && date <= maxDate;
  };

  const isValidBehinderungsgrad = (behinderungsgrad: string): boolean => {
    if (!behinderungsgrad) return false;
    
    const value = parseInt(behinderungsgrad, 10);
    if (isNaN(value)) return false;
    
    // Valid values: 0, 20, 30, 40, 50, 60, 70, 80, 90, 100
    const validValues = [0, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    return validValues.includes(value);
  };

  const isValidPflegegrad = (pflegegrad: string): boolean => {
    if (!pflegegrad) return false;
    
    const value = parseFloat(pflegegrad);
    if (isNaN(value)) return false;
    
    // Must be a whole number between 0 and 5 (inclusive)
    return Number.isInteger(value) && value >= 0 && value <= 5;
  };

  // Validate form
  const validateForm = () => {
    const errors = {
      mainApplicant: [] as string[],
      additionalPersons: [] as string[],
      general: [] as string[]
    };

    // Main applicant validation
    if (!String(formData.mainApplicant.firstName || '').trim()) {
      errors.mainApplicant.push('Hauptantragsteller: Vorname ist erforderlich');
    }
    if (!String(formData.mainApplicant.lastName || '').trim()) {
      errors.mainApplicant.push('Hauptantragsteller: Nachname ist erforderlich');
    }
    if (!String(formData.mainApplicant.birthDate || '').trim()) {
      errors.mainApplicant.push('Hauptantragsteller: Geburtsdatum ist erforderlich');
    } else if (!isValidBirthDate(formData.mainApplicant.birthDate)) {
      errors.mainApplicant.push('Hauptantragsteller: Geburtsdatum liegt außerhalb des gültigen Bereichs (nicht mehr als 115 Jahre in der Vergangenheit oder mehr als 10 Monate in der Zukunft)');
    }
    if (!String(formData.mainApplicant.employment_title || '').trim()) {
      errors.mainApplicant.push('Hauptantragsteller: Beruf ist erforderlich');
    }
    if (!String(formData.mainApplicant.entrydate || '').trim()) {
      errors.mainApplicant.push('Hauptantragsteller: Aufnahme in den Haushalt ist erforderlich');
    } else if (!isValidEntryDate(formData.mainApplicant.entrydate)) {
      errors.mainApplicant.push('Hauptantragsteller: Aufnahme in den Haushalt liegt außerhalb des gültigen Bereichs (nicht mehr als 115 Jahre in der Vergangenheit oder mehr als 3 Jahre in der Zukunft)');
    }
    if (!String(formData.mainApplicant.behinderungsgrad || '').trim()) {
      errors.mainApplicant.push('Hauptantragsteller: Grad der Behinderung ist erforderlich');
    } else if (!isValidBehinderungsgrad(formData.mainApplicant.behinderungsgrad)) {
      errors.mainApplicant.push('Hauptantragsteller: Grad der Behinderung muss einer der folgenden Werte sein: 0, 20, 30, 40, 50, 60, 70, 80, 90, 100');
    }
    if (!String(formData.mainApplicant.pflegegrad || '').trim()) {
      errors.mainApplicant.push('Hauptantragsteller: Pflegegrad ist erforderlich');
    } else if (!isValidPflegegrad(formData.mainApplicant.pflegegrad)) {
      errors.mainApplicant.push('Hauptantragsteller: Pflegegrad muss eine ganze Zahl zwischen 0 und 5 sein');
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
      } else if (!isValidBirthDate(person.birthDate)) {
        errors.additionalPersons.push(`${personName}: Geburtsdatum liegt außerhalb des gültigen Bereichs (nicht mehr als 115 Jahre in der Vergangenheit oder mehr als 10 Monate in der Zukunft)`);
      }
      if (!String(person.employment_title || '').trim()) {
        errors.additionalPersons.push(`${personName}: Beruf ist erforderlich`);
      }
      if (!String(person.entrydate || '').trim()) {
        errors.additionalPersons.push(`${personName}: Aufnahme in den Haushalt ist erforderlich`);
      } else if (!isValidEntryDate(person.entrydate)) {
        errors.additionalPersons.push(`${personName}: Aufnahme in den Haushalt liegt außerhalb des gültigen Bereichs (nicht mehr als 115 Jahre in der Vergangenheit oder mehr als 3 Jahre in der Zukunft)`);
      }
      if (!String(person.behinderungsgrad || '').trim()) {
        errors.additionalPersons.push(`${personName}: Grad der Behinderung ist erforderlich`);
      } else if (!isValidBehinderungsgrad(person.behinderungsgrad)) {
        errors.additionalPersons.push(`${personName}: Grad der Behinderung muss einer der folgenden Werte sein: 0, 20, 30, 40, 50, 60, 70, 80, 90, 100`);
      }
      if (!String(person.pflegegrad || '').trim()) {
        errors.additionalPersons.push(`${personName}: Pflegegrad ist erforderlich`);
      } else if (!isValidPflegegrad(person.pflegegrad)) {
        errors.additionalPersons.push(`${personName}: Pflegegrad muss eine ganze Zahl zwischen 0 und 5 sein`);
      }
    });

    // General validation
    if (formData.ispregnant === null) {
      errors.general.push('Bitte geben Sie an, ob die Geburt eines Kindes erwartet wird');
    }

    setValidationErrors(errors);
    const hasAnyErrors = errors.mainApplicant.length > 0 || errors.additionalPersons.length > 0 || errors.general.length > 0;
    setShowValidationModal(hasAnyErrors);
    setShowSuccessModal(!hasAnyErrors);
    setShowValidation(true);
  };

  // Calculate progress based on validation logic
  const calculateProgress = () => {
    let totalPotentialFields = 0;
    let actualErrors = 0;

    // Main applicant fields (7 required fields now including birthDate)
    totalPotentialFields += 7;
    if (!String(formData.mainApplicant.firstName || '').trim()) actualErrors++;
    if (!String(formData.mainApplicant.lastName || '').trim()) actualErrors++;
    if (!String(formData.mainApplicant.birthDate || '').trim()) actualErrors++;
    if (!String(formData.mainApplicant.employment_title || '').trim()) actualErrors++;
    if (!String(formData.mainApplicant.entrydate || '').trim()) actualErrors++;
    if (!String(formData.mainApplicant.behinderungsgrad || '').trim()) actualErrors++;
    if (!String(formData.mainApplicant.pflegegrad || '').trim()) actualErrors++;

    // Additional persons fields (7 required fields each now including birthDate)
    formData.additionalPersons.forEach(person => {
      totalPotentialFields += 7;
      if (!String(person.firstName || '').trim()) actualErrors++;
      if (!String(person.lastName || '').trim()) actualErrors++;
      if (!String(person.birthDate || '').trim()) actualErrors++;
      if (!String(person.employment_title || '').trim()) actualErrors++;
      if (!String(person.entrydate || '').trim()) actualErrors++;
      if (!String(person.behinderungsgrad || '').trim()) actualErrors++;
      if (!String(person.pflegegrad || '').trim()) actualErrors++;
    });

    // Pregnancy question (1 field)
    totalPotentialFields += 1;
    if (formData.ispregnant === null) actualErrors++;

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
            should_show_error_haushaltsauskunft: newShowValidation,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (error) {
          console.error('Error updating should_show_error_haushaltsauskunft:', error);
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
        
    <PDFDownloadButton formType="haushalt" /> 

      {/* Header ellipse */}
      <div className="blue-corner">
        <span className="blue-corner-text">HAUSHALTSAUSKUNFT</span>
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
          <HaushaltForm
            data={formData}
            onChange={handleFormChange}
            showValidation={showValidation}
            isReadOnly={false}
            onRemovePerson={removePerson}
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
                navigate('/personal-space');
              }}
              style={{ backgroundColor: '#064497', border: 'none', minWidth: 260 }}
            >
              Speichern und verlassen
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header>
          <Modal.Title>Person entfernen</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-4">
            <p>
              Sie möchten <strong>
                {personToDelete?.person?.firstName || 'Unbekannte'} {personToDelete?.person?.lastName || 'Person'}
              </strong> aus dem Haushalt entfernen.
            </p>
            <p>
              {personToDelete?.isApplicant && personToDelete?.hasFinancialData ? 
                'Da diese Person bereits in anderen Formularen erfasst wurde, können Sie zwischen den folgenden Optionen wählen:' :
                'Zu dieser Person wurden bereits Einkommensdaten erfasst. Bitte bestätigen Sie, dass Sie die Person komplett entfernen möchten.'
              }
            </p>
          </div>
          
          <div className="d-flex flex-column gap-3">
            {personToDelete?.isApplicant && (
              <Button
                variant="outline-primary"
                onClick={() => handleDeleteOption('remove-household')}
                disabled={isLoading}
                className="text-start p-3"
                style={{ borderColor: '#064497', color: '#064497', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D7DAEA'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div className="fw-bold mb-1">
                  Als Antragsteller beibehalten
                </div>
                <div className="text-muted small">
                  Alle personenbezogenen Angaben werden aus den Formularen Selbstauskunft und Einkommenserklärung entfernt (sofern vorhanden), die Person bleibt aber als Antragsteller im Hauptantrag erhalten.
                </div>
              </Button>
            )}
            
            {personToDelete?.hasFinancialData && (
              <Button
                variant="outline-danger"
                onClick={() => handleDeleteOption('remove-completely')}
                disabled={isLoading}
                className="text-start p-3"
                style={{ borderColor: '#dc3545', color: '#dc3545', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D7DAEA'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div className="fw-bold mb-1">
                  Person komplett entfernen
                </div>
                <div className="text-muted small">
                  Alle Angaben der Person werden aus den Formularen entfernt sowie 
                  ggf. hochgeladene Dokumente. Diese Aktion kann nicht rückgängig gemacht werden.
                </div>
              </Button>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowDeleteModal(false)}
            disabled={isLoading}
          >
            Abbrechen
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default HaushaltContainer; 