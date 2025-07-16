import React, { useState } from 'react';
import { Form, Button, OverlayTrigger, Tooltip, Spinner, Modal } from 'react-bootstrap';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

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
  .person-card {
    background-color: #ffffff;
    border-radius: 0.5rem;
    padding: 1.5rem;
    margin-bottom: 1rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  }
  .remove-person-btn {
    min-width: 140px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .remove-person-btn .spinner-border {
    width: 1rem;
    height: 1rem;
  }
  .person-chip {
    background: #eaf2fb;
    color: #064497;
    border-radius: 5px;
    padding: 6px 12px;
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 15px;
    font-weight: 500;
    margin: 2px;
  }
  .person-chip-remove {
    background: none;
    border: none;
    color: #d32f2f;
    margin-left: 4px;
    cursor: pointer;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 24px;
    width: 24px;
  }
`;

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

interface ExistingPerson {
  id: string;
  firstName: string;
  lastName: string;
  employment_title?: string;
  entrydate?: string;
  behinderungsgrad?: string;
  pflegegrad?: string;
  title?: string;
  nationality?: string;
  birthDate?: string;
  street?: string;
  houseNumber?: string;
  postalCode?: string;
  city?: string;
  phone?: string;
  email?: string;
  employment?: {
    type: string;
    details: string;
  };
  notHousehold?: boolean;
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

interface Props {
  data: HaushaltData;
  onChange: (data: Partial<HaushaltData>) => void;
  showValidation: boolean;
  isReadOnly?: boolean;
  onRemovePerson?: (personId: string) => Promise<void>;
}

const renderTooltip = (text: string) => (
  <Tooltip id="button-tooltip">
    {text}
  </Tooltip>
);

const HaushaltForm: React.FC<Props> = ({ data, onChange, showValidation, isReadOnly = false, onRemovePerson }) => {
  // Add loading state for person removal
  const [removingPersonId, setRemovingPersonId] = useState<string | null>(null);
  
  // Add modal states for existing persons
  const [showAddPersonModal, setShowAddPersonModal] = useState(false);
  const [existingNonHouseholdPersons, setExistingNonHouseholdPersons] = useState<ExistingPerson[]>([]);
  const [selectedExistingPerson, setSelectedExistingPerson] = useState<string>('');

  const { user } = useAuth();

  // Generate UUID helper function
  const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Add new person
  const addPerson = () => {
    const newPerson: Person = {
      id: generateUUID(), // Generate proper UUID
      firstName: '',
      lastName: '',
      birthDate: '',
      employment_title: '',
      entrydate: '',
      behinderungsgrad: '',
      pflegegrad: ''
    };
    onChange({ additionalPersons: [...data.additionalPersons, newPerson] });
  };

  // Remove person
  const removePerson = async (personId: string) => {
    setRemovingPersonId(personId);
    
    try {
      if (onRemovePerson) {
        // Use the enhanced removePerson function from the container
        await onRemovePerson(personId);
      } else {
        // Fallback to original implementation
        const updatedPersons = data.additionalPersons.filter(person => person.id !== personId);
        // Also remove from personsWithoutIncome if they were selected
        const updatedWithoutIncome = data.personsWithoutIncome.filter(id => id !== personId);
        onChange({ 
          additionalPersons: updatedPersons,
          personsWithoutIncome: updatedWithoutIncome
        });
      }
    } finally {
      setRemovingPersonId(null);
    }
  };

  // Update person
  const updatePerson = (personId: string, updates: Partial<Person>) => {
    if (personId === 'main_applicant') {
      onChange({ mainApplicant: { ...data.mainApplicant, ...updates } });
    } else {
      const updatedPersons = data.additionalPersons.map(person =>
        person.id === personId ? { ...person, ...updates } : person
      );
      onChange({ additionalPersons: updatedPersons });
    }
  };

  // Add person to without income list
  const addPersonWithoutIncome = (personId: string) => {
    if (!data.personsWithoutIncome.includes(personId)) {
      onChange({ personsWithoutIncome: [...data.personsWithoutIncome, personId] });
    }
  };

  // Remove person from without income list
  const removePersonWithoutIncome = (personId: string) => {
    onChange({ personsWithoutIncome: data.personsWithoutIncome.filter(id => id !== personId) });
  };

  // Get all persons for dropdown
  const getAllPersons = () => {
    const persons = [
      {
        id: 'main_applicant',
        name: `${data.mainApplicant.firstName} ${data.mainApplicant.lastName}`.trim() || 'Hauptantragsteller'
      },
      ...data.additionalPersons.map(person => ({
        id: person.id,
        name: `${person.firstName} ${person.lastName}`.trim() || 'Unbenannte Person'
      }))
    ];
    return persons;
  };

  // Get available persons for dropdown (not already selected)
  const getAvailablePersons = () => {
    return getAllPersons().filter(person => !data.personsWithoutIncome.includes(person.id));
  };

  // Get selected persons for display
  const getSelectedPersons = () => {
    const allPersons = getAllPersons();
    return data.personsWithoutIncome.map(id => 
      allPersons.find(person => person.id === id)
    ).filter(Boolean);
  };

  // Validation functions
  const validateMainApplicantField = (fieldName: string): boolean => {
    if (!showValidation) return false;

    switch (fieldName) {
      case 'firstName':
        return !String(data.mainApplicant.firstName || '').trim();
      case 'lastName':
        return !String(data.mainApplicant.lastName || '').trim();
      case 'birthDate':
        return !String(data.mainApplicant.birthDate || '').trim();
      case 'employment_title':
        return !String(data.mainApplicant.employment_title || '').trim();
      case 'entrydate':
        return !String(data.mainApplicant.entrydate || '').trim();
      case 'behinderungsgrad':
        return !String(data.mainApplicant.behinderungsgrad || '').trim();
      case 'pflegegrad':
        return !String(data.mainApplicant.pflegegrad || '').trim();
      default:
        return false;
    }
  };

  const validatePersonField = (person: Person, fieldName: string): boolean => {
    if (!showValidation) return false;

    switch (fieldName) {
      case 'firstName':
        return !String(person.firstName || '').trim();
      case 'lastName':
        return !String(person.lastName || '').trim();
      case 'birthDate':
        return !String(person.birthDate || '').trim();
      case 'employment_title':
        return !String(person.employment_title || '').trim();
      case 'entrydate':
        return !String(person.entrydate || '').trim();
      case 'behinderungsgrad':
        return !String(person.behinderungsgrad || '').trim();
      case 'pflegegrad':
        return !String(person.pflegegrad || '').trim();
      default:
        return false;
    }
  };

  const validateGeneralField = (fieldName: string): boolean => {
    if (!showValidation) return false;

    switch (fieldName) {
      case 'ispregnant':
        return data.ispregnant === null;
      default:
        return false;
    }
  };

  const getFieldErrorMessage = (fieldName: string): string | undefined => {
    if (!showValidation) return undefined;

    switch (fieldName) {
      case 'firstName':
        return 'Vorname ist erforderlich';
      case 'lastName':
        return 'Nachname ist erforderlich';
      case 'birthDate':
        return 'Geburtsdatum ist erforderlich';
      case 'employment_title':
        return 'Beruf ist erforderlich';
      case 'entrydate':
        return 'Aufnahme in den Haushalt ist erforderlich';
      case 'behinderungsgrad':
        return 'Grad der Behinderung ist erforderlich';
      case 'pflegegrad':
        return 'Pflegegrad ist erforderlich';
      case 'ispregnant':
        return 'Bitte geben Sie an, ob die Geburt eines Kindes erwartet wird';
      default:
        return undefined;
    }
  };

  // Load existing non-household people
  const loadExistingNonHouseholdPersons = async (): Promise<ExistingPerson[]> => {
    try {
      const { data: userData, error } = await supabase
        .from('user_data')
        .select('weitere_antragstellende_personen')
        .eq('id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading existing people:', error);
        return [];
      }

      const weiterePersonen = userData?.weitere_antragstellende_personen || {};
      
      // Convert UUID-based object to array of persons with notHousehold: true
      const existingPeople: ExistingPerson[] = Object.entries(weiterePersonen)
        .filter(([uuid, person]: [string, any]) => person.notHousehold === true)
        .map(([uuid, person]: [string, any]) => ({
          ...person,
          id: uuid // Use the UUID as the ID
        }));

      setExistingNonHouseholdPersons(existingPeople);
      return existingPeople;
    } catch (error) {
      console.error('Error loading existing people:', error);
      return [];
    }
  };

  // Handle add person button click
  const handleAddPersonClick = async () => {
    const existingPersons = await loadExistingNonHouseholdPersons();
    
    if (existingPersons.length > 0) {
      setShowAddPersonModal(true);
    } else {
      // No existing persons with notHousehold: true, add new person directly
      addPerson();
    }
  };

  // Add existing person to household
  const addExistingPersonToHousehold = () => {
    if (!selectedExistingPerson) return;
    
    const existingPerson = existingNonHouseholdPersons.find(p => p.id === selectedExistingPerson);
    if (!existingPerson) return;

    // Create new person object from existing person data
    const newPerson: Person = {
      id: existingPerson.id, // Use the existing UUID
      firstName: existingPerson.firstName || '',
      lastName: existingPerson.lastName || '',
      birthDate: existingPerson.birthDate || '',
      employment_title: existingPerson.employment_title || '',
      entrydate: existingPerson.entrydate || '',
      behinderungsgrad: existingPerson.behinderungsgrad != null ? String(existingPerson.behinderungsgrad) : '',
      pflegegrad: existingPerson.pflegegrad != null ? String(existingPerson.pflegegrad) : ''
    };

    // Add to household
    onChange({ additionalPersons: [...data.additionalPersons, newPerson] });
    
    // Update the database to remove notHousehold flag
    updatePersonInDatabase(existingPerson.id, { notHousehold: false });
    
    setShowAddPersonModal(false);
    setSelectedExistingPerson('');
  };

  // Update person in database
  const updatePersonInDatabase = async (personId: string, updates: any) => {
    if (!user?.id) return;
    
    try {
      const { data: existingUserData, error: existingError } = await supabase
        .from('user_data')
        .select('weitere_antragstellende_personen')
        .eq('id', user.id)
        .single();

      if (existingError && existingError.code !== 'PGRST116') {
        console.error('Error loading existing user data:', existingError);
        return;
      }

      const existingPersonsObj = existingUserData?.weitere_antragstellende_personen || {};
      const updatedPersonsObj = { ...existingPersonsObj };
      
      if (updatedPersonsObj[personId]) {
        updatedPersonsObj[personId] = {
          ...updatedPersonsObj[personId],
          ...updates
        };
      }

      await supabase
        .from('user_data')
        .update({
          weitere_antragstellende_personen: Object.keys(updatedPersonsObj).length > 0 ? updatedPersonsObj : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
    } catch (error) {
      console.error('Error updating person in database:', error);
    }
  };

  // Add new person (existing function)
  const addNewPerson = () => {
    addPerson();
    setShowAddPersonModal(false);
    setSelectedExistingPerson('');
  };

  return (
    <Form>
      <style>
        {styles}
      </style>

      <div className="mb-9" style={{ fontSize: '1rem', color: '#222' }}>
        Mein Haushalt besteht aus folgenden Personen beziehungsweise wird bald aus folgenden Personen bestehen:
      </div>

      {/* Main Applicant Card */}
      <div className="person-card">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0" style={{ color: '#064497', fontSize: '1rem', fontWeight: '600' }}>
            Hauptantragsteller (Sie)
          </h5>
        </div>

        {/* Name and Surname */}
        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <Form.Floating>
              <Form.Control
                type="text"
                placeholder="Vorname"
                value={data.mainApplicant.firstName}
                onChange={(e) => updatePerson('main_applicant', { firstName: e.target.value })}
                disabled={isReadOnly}
                isInvalid={validateMainApplicantField('firstName')}
              />
              <label>Vorname</label>
              <Form.Control.Feedback type="invalid">
                {getFieldErrorMessage('firstName')}
              </Form.Control.Feedback>
            </Form.Floating>
          </div>
          <div className="col-md-6">
            <Form.Floating>
              <Form.Control
                type="text"
                placeholder="Nachname"
                value={data.mainApplicant.lastName}
                onChange={(e) => updatePerson('main_applicant', { lastName: e.target.value })}
                disabled={isReadOnly}
                isInvalid={validateMainApplicantField('lastName')}
              />
              <label>Nachname</label>
              <Form.Control.Feedback type="invalid">
                {getFieldErrorMessage('lastName')}
              </Form.Control.Feedback>
            </Form.Floating>
          </div>
        </div>

        {/* Birth Date and Employment */}
        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <Form.Floating>
              <Form.Control
                type="date"
                placeholder="Geburtsdatum"
                value={data.mainApplicant.birthDate}
                onChange={(e) => updatePerson('main_applicant', { birthDate: e.target.value })}
                disabled={isReadOnly}
                isInvalid={validateMainApplicantField('birthDate')}
              />
              <label>Geburtsdatum</label>
              <Form.Control.Feedback type="invalid">
                {getFieldErrorMessage('birthDate')}
              </Form.Control.Feedback>
            </Form.Floating>
          </div>
          <div className="col-md-6">
            <Form.Floating>
              <Form.Control
                type="text"
                placeholder="Beruf"
                value={data.mainApplicant.employment_title}
                onChange={(e) => updatePerson('main_applicant', { employment_title: e.target.value })}
                disabled={isReadOnly}
                isInvalid={validateMainApplicantField('employment_title')}
              />
              <label>Beruf</label>
              <Form.Control.Feedback type="invalid">
                {getFieldErrorMessage('employment_title')}
              </Form.Control.Feedback>
            </Form.Floating>
          </div>
        </div>

        {/* Entry Date, Disability and Care Level */}
        <div className="row g-3 mb-3">
          <div className="col-md-4">
            <Form.Floating>
              <Form.Control
                type="date"
                placeholder="Aufnahme in den Haushalt"
                value={data.mainApplicant.entrydate}
                onChange={(e) => updatePerson('main_applicant', { entrydate: e.target.value })}
                disabled={isReadOnly}
                isInvalid={validateMainApplicantField('entrydate')}
              />
              <label>Aufnahme in den Haushalt</label>
              <Form.Control.Feedback type="invalid">
                {getFieldErrorMessage('entrydate')}
              </Form.Control.Feedback>
            </Form.Floating>
          </div>
          <div className="col-md-4">
            <Form.Floating>
              <Form.Control
                type="number"
                placeholder="Grad der Behinderung"
                value={data.mainApplicant.behinderungsgrad}
                onChange={(e) => updatePerson('main_applicant', { behinderungsgrad: e.target.value })}
                disabled={isReadOnly}
                isInvalid={validateMainApplicantField('behinderungsgrad')}
                min="0"
                max="100"
              />
              <label>Grad der Behinderung (%)</label>
              <Form.Control.Feedback type="invalid">
                {getFieldErrorMessage('behinderungsgrad')}
              </Form.Control.Feedback>
            </Form.Floating>
          </div>
          <div className="col-md-4">
            <Form.Floating>
              <Form.Control
                type="number"
                placeholder="Pflegegrad"
                value={data.mainApplicant.pflegegrad}
                onChange={(e) => updatePerson('main_applicant', { pflegegrad: e.target.value })}
                disabled={isReadOnly}
                isInvalid={validateMainApplicantField('pflegegrad')}
                min="0"
                max="5"
              />
              <label>Pflegegrad (0-5)</label>
              <Form.Control.Feedback type="invalid">
                {getFieldErrorMessage('pflegegrad')}
              </Form.Control.Feedback>
            </Form.Floating>
          </div>
        </div>
      </div>

      {/* Additional Persons */}
      {data.additionalPersons.map((person: Person) => (
        <div key={person.id} className="person-card">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0" style={{ color: '#064497', fontSize: '1rem', fontWeight: '600' }}>
              Weitere Person
            </h5>
            {!isReadOnly && (
              <Button
                variant="outline-danger"
                size="sm"
                className="remove-person-btn"
                onClick={() => removePerson(person.id)}
                disabled={removingPersonId === person.id}
              >
                {removingPersonId === person.id ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                    />
                    <span>Entfernen...</span>
                  </>
                ) : (
                  'Person entfernen'
                )}
              </Button>
            )}
          </div>

          {/* Name and Surname */}
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <Form.Floating>
                <Form.Control
                  type="text"
                  placeholder="Vorname"
                  value={person.firstName}
                  onChange={(e) => updatePerson(person.id, { firstName: e.target.value })}
                  disabled={isReadOnly}
                  isInvalid={validatePersonField(person, 'firstName')}
                />
                <label>Vorname</label>
                <Form.Control.Feedback type="invalid">
                  {getFieldErrorMessage('firstName')}
                </Form.Control.Feedback>
              </Form.Floating>
            </div>
            <div className="col-md-6">
              <Form.Floating>
                <Form.Control
                  type="text"
                  placeholder="Nachname"
                  value={person.lastName}
                  onChange={(e) => updatePerson(person.id, { lastName: e.target.value })}
                  disabled={isReadOnly}
                  isInvalid={validatePersonField(person, 'lastName')}
                />
                <label>Nachname</label>
                <Form.Control.Feedback type="invalid">
                  {getFieldErrorMessage('lastName')}
                </Form.Control.Feedback>
              </Form.Floating>
            </div>
          </div>

          {/* Birth Date and Employment */}
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <Form.Floating>
                <Form.Control
                  type="date"
                  placeholder="Geburtsdatum"
                  value={person.birthDate}
                  onChange={(e) => updatePerson(person.id, { birthDate: e.target.value })}
                  disabled={isReadOnly}
                  isInvalid={validatePersonField(person, 'birthDate')}
                />
                <label>Geburtsdatum</label>
                <Form.Control.Feedback type="invalid">
                  {getFieldErrorMessage('birthDate')}
                </Form.Control.Feedback>
              </Form.Floating>
            </div>
            <div className="col-md-6">
              <Form.Floating>
                <Form.Control
                  type="text"
                  placeholder="Beruf"
                  value={person.employment_title}
                  onChange={(e) => updatePerson(person.id, { employment_title: e.target.value })}
                  disabled={isReadOnly}
                  isInvalid={validatePersonField(person, 'employment_title')}
                />
                <label>Beruf</label>
                <Form.Control.Feedback type="invalid">
                  {getFieldErrorMessage('employment_title')}
                </Form.Control.Feedback>
              </Form.Floating>
            </div>
          </div>

          {/* Entry Date, Disability and Care Level */}
          <div className="row g-3 mb-3">
            <div className="col-md-4">
              <Form.Floating>
                <Form.Control
                  type="date"
                  placeholder="Aufnahme in den Haushalt"
                  value={person.entrydate}
                  onChange={(e) => updatePerson(person.id, { entrydate: e.target.value })}
                  disabled={isReadOnly}
                  isInvalid={validatePersonField(person, 'entrydate')}
                />
                <label>Aufnahme in den Haushalt</label>
                <Form.Control.Feedback type="invalid">
                  {getFieldErrorMessage('entrydate')}
                </Form.Control.Feedback>
              </Form.Floating>
            </div>
            <div className="col-md-4">
              <Form.Floating>
                <Form.Control
                  type="number"
                  placeholder="Grad der Behinderung"
                  value={person.behinderungsgrad}
                  onChange={(e) => updatePerson(person.id, { behinderungsgrad: e.target.value })}
                  disabled={isReadOnly}
                  isInvalid={validatePersonField(person, 'behinderungsgrad')}
                  min="0"
                  max="100"
                />
                <label>Grad der Behinderung (%)</label>
                <Form.Control.Feedback type="invalid">
                  {getFieldErrorMessage('behinderungsgrad')}
                </Form.Control.Feedback>
              </Form.Floating>
            </div>
            <div className="col-md-4">
              <Form.Floating>
                <Form.Control
                  type="number"
                  placeholder="Pflegegrad"
                  value={person.pflegegrad}
                  onChange={(e) => updatePerson(person.id, { pflegegrad: e.target.value })}
                  disabled={isReadOnly}
                  isInvalid={validatePersonField(person, 'pflegegrad')}
                  min="0"
                  max="5"
                />
                <label>Pflegegrad (0-5)</label>
                <Form.Control.Feedback type="invalid">
                  {getFieldErrorMessage('pflegegrad')}
                </Form.Control.Feedback>
              </Form.Floating>
            </div>
          </div>
        </div>
      ))}

      {/* Add Person Button */}
      {!isReadOnly && (
        <Button
          variant="outline-primary"
          className="add-person-btn mt-1 mb-9"
          onClick={handleAddPersonClick}
        >
          + Person hinzufügen
        </Button>
      )}

      {/* Add Person Modal */}
      <Modal show={showAddPersonModal} onHide={() => setShowAddPersonModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Person zum Haushalt hinzufügen</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {existingNonHouseholdPersons.length === 0 ? (
            <p>Keine weiteren Personen gefunden. Eine neue Person wird erstellt.</p>
          ) : (
            <div>
              <p>Möchten Sie eine vorhandene Person zum Haushalt hinzufügen oder eine neue Person erstellen?</p>
              <Form>
                <Form.Group>
                  <Form.Label className="fw-bold mb-2 mt-3">Vorhandene Personen:</Form.Label>
                  {existingNonHouseholdPersons.map((person, index) => {
                    // Create a meaningful display label based on available information
                    const name = `${person.title || ''} ${person.firstName || ''} ${person.lastName || ''}`.trim();
                    const details = [];
                    
                    if (person.nationality) details.push(person.nationality);
                    if (person.birthDate) details.push(person.birthDate);
                    if (person.employment_title) details.push(`Beruf: ${person.employment_title}`);
                    
                    const detailsText = details.length > 0 ? ` (${details.join(', ')})` : '';
                    const displayLabel = name + detailsText || 'Unbenannte Person';
                    
                    return (
                      <Form.Check
                        key={person.id || index}
                        type="radio"
                        label={displayLabel}
                        name="existingPerson"
                        onChange={() => setSelectedExistingPerson(person.id || index.toString())}
                        checked={selectedExistingPerson === (person.id || index.toString())}
                        disabled={isReadOnly}
                        className="mb-2"
                      />
                    );
                  })}
                </Form.Group>
              </Form>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <div className="d-flex w-100 gap-3 px-2">
            {existingNonHouseholdPersons.length > 0 && (
              <Button 
                variant="primary" 
                onClick={addNewPerson} 
                disabled={isReadOnly}
                className="flex-grow-1 py-2"
                style={{ backgroundColor: '#D7DAEA', border: 'none', color: 'black' }}
              >
                Neue Person erstellen
              </Button>
            )}
            <Button 
              variant="primary" 
              onClick={existingNonHouseholdPersons.length > 0 ? addExistingPersonToHousehold : addNewPerson} 
              disabled={isReadOnly || (existingNonHouseholdPersons.length > 0 && !selectedExistingPerson)}
              className="flex-grow-1 py-2"
              style={{ backgroundColor: '#064497', borderColor: '#064497' }}
            >
              {existingNonHouseholdPersons.length > 0 ? 'Vorhandene Person hinzufügen' : 'Neue Person erstellen'}
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
    <div className="person-card">
      {/* Persons Without Income Section */}
      <div className="mb-5" style={{ marginTop: '0.5rem' }}>
        <div className="flex-grow-1 mb-3">
          <Form.Label className="d-flex align-items-center gap-2">
            <span>
              Ich bestätige ausdrücklich, dass die ausgewählte(n) Person(en) in den vergangenen zwölf Monaten <span style={{fontWeight: 'bold'}}>keine eigenen Einkünfte</span> hatte(n) oder in den zwölf Monaten ab dem Stichtag (Datum der Antragstellung) haben wird/werden. <span style={{fontWeight: 'bold'}}>Für die weitere(n) Person(n) ist/sind die notwendige(n) Einkommenserklärung(en) erforderlich.</span>
            </span>
            <OverlayTrigger
              placement="left"
              overlay={renderTooltip("Wählen Sie Personen aus, die kein eigenes Einkommen haben")}
            >
              <Button
                variant="outline-secondary"
                className="rounded-circle p-0 d-flex align-items-center justify-content-center"
                style={{
                  width: '20px',
                  minWidth: '20px',
                  maxWidth: '20px',
                  height: '20px',
                  minHeight: '20px',
                  maxHeight: '20px',
                  color: '#064497',
                  borderColor: '#D7DAEA',
                  backgroundColor: '#D7DAEA',
                  flex: '0 0 20px'
                }}
              >
                ?
              </Button>
            </OverlayTrigger>
          </Form.Label>
        </div>

        {/* Dropdown to select persons without income */}
        <div className="row g-2 mb-3 mt-2">
          <div className="col-8">
            <Form.Select
              value=""
              onChange={e => {
                if (e.target.value && e.target.value !== 'none') {
                  addPersonWithoutIncome(e.target.value);
                }
              }}
              disabled={isReadOnly}
              style={{ height: '58px' }}
            >
              <option value="">Personen ohne eigenes Einkommen auswählen...</option>
              {getAvailablePersons().map(person => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </Form.Select>
          </div>
        </div>

        {/* Selected persons chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          {getSelectedPersons().map(person => (
            <span key={person?.id} className="person-chip">
              {person?.name}
              {!isReadOnly && (
                <button 
                  onClick={() => removePersonWithoutIncome(person?.id || '')} 
                  className="person-chip-remove"
                  title="Entfernen"
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Pregnancy Question */}
      <div className="mb-1">
      <div className="d-flex align-items-center mb-3">
        <div className="flex-grow-1">
          <Form.Label className="d-flex align-items-center gap-2">
          Die Geburt eines Kindes wird erwartet (eine Bestätigung der Ärztin/des Arztes oder eine Kopie des Mutterpasses ist beigefügt).
            <OverlayTrigger
              placement="right"
              overlay={renderTooltip("Geben Sie an, ob die Geburt eines Kindes erwartet wird")}
            >
              <Button
                variant="outline-secondary"
                className="rounded-circle p-0 d-flex align-items-center justify-content-center"
                style={{
                  width: '20px',
                  minWidth: '20px',
                  maxWidth: '20px',
                  height: '20px',
                  minHeight: '20px',
                  maxHeight: '20px',
                  color: '#064497',
                  borderColor: '#D7DAEA',
                  backgroundColor: '#D7DAEA',
                  flex: '0 0 20px'
                }}
              >
                ?
              </Button>
            </OverlayTrigger>
          </Form.Label>
        </div>
        <div className="d-flex gap-3 ml-3">
          <Form.Check
            inline
            type="radio"
            label="Ja"
            name="ispregnant"
            checked={data.ispregnant === true}
            onChange={() => onChange({ ispregnant: true })}
            className="custom-radio"
            disabled={isReadOnly}
          />
          <Form.Check
            inline
            type="radio"
            label="Nein"
            name="ispregnant"
            checked={data.ispregnant === false}
            onChange={() => onChange({ ispregnant: false })}
            className="custom-radio"
            disabled={isReadOnly}
          />
        </div>
        </div>
        {validateGeneralField('ispregnant') && (
          <div className="text-danger mt-1">{getFieldErrorMessage('ispregnant')}</div>
        )}
      </div>
    </div>
    </Form>
  );
};

export default HaushaltForm; 