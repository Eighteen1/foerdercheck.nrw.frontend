import React, { useState, useEffect } from 'react';
import { Form, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import AddressInput from '../../common/AddressInput';

// Add styles
const styles = `
  .add-person-button {
    height: 40px;
    font-size: 18px;
    padding: 0 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background-color: #fff;
    border-color: #064497;
    color: #064497;
    transition: all 0.2s ease;
    cursor: pointer;
    font-family: 'Roboto', sans-serif;
    font-weight: 500;
    line-height: 1.5;
  }
  
  .add-person-button:hover {
    background-color: #064497;
    color: white;
  }
`;

// Add country list
const countries = [
  'Deutschland',
  'Österreich',
  'Schweiz',
  'Afghanistan',
  'Ägypten',
  'Albanien',
  'Algerien',
  'Andorra',
  'Angola',
  'Antigua und Barbuda',
  'Äquatorialguinea',
  'Argentinien',
  'Armenien',
  'Aserbaidschan',
  'Äthiopien',
  'Australien',
  'Bahamas',
  'Bahrain',
  'Bangladesch',
  'Barbados',
  'Belarus',
  'Belgien',
  'Belize',
  'Benin',
  'Bhutan',
  'Bolivien',
  'Bosnien und Herzegowina',
  'Botsuana',
  'Brasilien',
  'Brunei',
  'Bulgarien',
  'Burkina Faso',
  'Burundi',
  'Chile',
  'China',
  'Costa Rica',
  'Dänemark',
  'Demokratische Republik Kongo',
  'Dominica',
  'Dominikanische Republik',
  'Dschibuti',
  'Ecuador',
  'El Salvador',
  'Elfenbeinküste',
  'Eritrea',
  'Estland',
  'Eswatini',
  'Fidschi',
  'Finnland',
  'Frankreich',
  'Gabun',
  'Gambia',
  'Georgien',
  'Ghana',
  'Grenada',
  'Griechenland',
  'Guatemala',
  'Guinea',
  'Guinea-Bissau',
  'Guyana',
  'Haiti',
  'Honduras',
  'Indien',
  'Indonesien',
  'Irak',
  'Iran',
  'Irland',
  'Island',
  'Israel',
  'Italien',
  'Jamaika',
  'Japan',
  'Jemen',
  'Jordanien',
  'Kambodscha',
  'Kamerun',
  'Kanada',
  'Kap Verde',
  'Kasachstan',
  'Katar',
  'Kenia',
  'Kirgisistan',
  'Kiribati',
  'Kolumbien',
  'Komoren',
  'Kongo',
  'Kroatien',
  'Kuba',
  'Kuwait',
  'Laos',
  'Lesotho',
  'Lettland',
  'Libanon',
  'Liberia',
  'Libyen',
  'Liechtenstein',
  'Litauen',
  'Luxemburg',
  'Madagaskar',
  'Malawi',
  'Malaysia',
  'Malediven',
  'Mali',
  'Malta',
  'Marokko',
  'Marshallinseln',
  'Mauretanien',
  'Mauritius',
  'Mexiko',
  'Mikronesien',
  'Moldau',
  'Monaco',
  'Mongolei',
  'Montenegro',
  'Mosambik',
  'Myanmar',
  'Namibia',
  'Nauru',
  'Nepal',
  'Neuseeland',
  'Nicaragua',
  'Niederlande',
  'Niger',
  'Nigeria',
  'Nordkorea',
  'Nordmazedonien',
  'Norwegen',
  'Oman',
  'Pakistan',
  'Palau',
  'Palästina',
  'Panama',
  'Papua-Neuguinea',
  'Paraguay',
  'Peru',
  'Philippinen',
  'Polen',
  'Portugal',
  'Ruanda',
  'Rumänien',
  'Russland',
  'Salomonen',
  'Sambia',
  'Samoa',
  'San Marino',
  'São Tomé und Príncipe',
  'Saudi-Arabien',
  'Schweden',
  'Senegal',
  'Serbien',
  'Seychellen',
  'Sierra Leone',
  'Simbabwe',
  'Singapur',
  'Slowakei',
  'Slowenien',
  'Somalia',
  'Spanien',
  'Sri Lanka',
  'St. Kitts und Nevis',
  'St. Lucia',
  'St. Vincent und die Grenadinen',
  'Sudan',
  'Südafrika',
  'Südsudan',
  'Südkorea',
  'Suriname',
  'Syrien',
  'Tadschikistan',
  'Taiwan',
  'Tansania',
  'Thailand',
  'Timor-Leste',
  'Togo',
  'Tonga',
  'Trinidad und Tobago',
  'Tschad',
  'Tschechien',
  'Tunesien',
  'Türkei',
  'Turkmenistan',
  'Tuvalu',
  'Uganda',
  'Ukraine',
  'Ungarn',
  'Uruguay',
  'Usbekistan',
  'Vanuatu',
  'Vatikanstadt',
  'Venezuela',
  'Vereinigte Arabische Emirate',
  'Vereinigte Staaten',
  'Vereinigtes Königreich',
  'Vietnam',
  'Weißrussland',
  'Zentralafrikanische Republik',
  'Zypern'
];

// Add validation interface
interface ValidationErrors {
  [key: string]: string[];
}

interface Representative {
  hasRepresentative: boolean | null;
  isCompany: boolean | null;
  companyName?: string;
  postboxPostcode?: string;
  postboxCity?: string;
  title?: string;
  firstName?: string;
  lastName?: string;
  street?: string;
  houseNumber?: string;
  postalCode?: string;
  city?: string;
  phone?: string;
  email?: string;
}

interface Person {
  title: string;
  firstName: string;
  lastName: string;
  nationality: string;
  birthDate: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
  employment: {
    type: string;
    details: string;
  };
}

interface Step1Data {
  representative: Representative;
  persons: Person[];
}

interface Step1Props {
  formData: Step1Data;
  updateFormData: (data: Step1Data) => void;
  showValidation?: boolean;
  readOnly?: boolean;
}

const Step1_PersonalInfo: React.FC<Step1Props> = ({ 
  formData, 
  updateFormData,
  showValidation = false,
  readOnly = false
}) => {
  const [expandedEmploymentSections, setExpandedEmploymentSections] = useState<Record<number, string | null>>({});
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  // Initialize default representative state if not present
  const ensureRepresentativeState = (data: Step1Data): Step1Data => {
    if (!data.representative) {
      return {
        ...data,
        representative: {
          hasRepresentative: false,
          isCompany: true,
          companyName: '',
          postboxPostcode: '',
          postboxCity: '',
          title: '',
          firstName: '',
          lastName: '',
          street: '',
          houseNumber: '',
          postalCode: '',
          city: '',
          phone: '',
          email: ''
        }
      };
    }
    return data;
  };

  // Set expanded employment sections based on loaded data
  useEffect(() => {
    const newExpandedSections: Record<number, string | null> = {};
    
    formData.persons.forEach((person, index) => {
      if (person.employment.type) {
        // Determine which section the employment type belongs to
        if (['worker', 'employee', 'civil-servant', 'apprentice', 'retired', 'unemployed'].includes(person.employment.type)) {
          newExpandedSections[index] = 'non-self-employed';
        } else if (['sole-trader', 'business-owner', 'freelancer', 'farmer', 'private-income'].includes(person.employment.type)) {
          newExpandedSections[index] = 'self-employed';
        } else if (['student', 'pupil', 'homemaker', 'no-occupation'].includes(person.employment.type)) {
          newExpandedSections[index] = 'other';
        }
      }
    });

    setExpandedEmploymentSections(newExpandedSections);
  }, [formData.persons]);

  const handleRepresentativeChange = (field: keyof Representative, value: any) => {
    if (readOnly) return;
    const updatedRepresentative = {
      ...formData.representative,
      [field]: value
    };
    
    // If hasRepresentative is set to false, reset all other fields
    if (field === 'hasRepresentative' && !value) {
      updatedRepresentative.isCompany = true;
      updatedRepresentative.companyName = '';
      updatedRepresentative.postboxPostcode = '';
      updatedRepresentative.postboxCity = '';
      updatedRepresentative.title = '';
      updatedRepresentative.firstName = '';
      updatedRepresentative.lastName = '';
      updatedRepresentative.street = '';
      updatedRepresentative.houseNumber = '';
      updatedRepresentative.postalCode = '';
      updatedRepresentative.city = '';
      updatedRepresentative.phone = '';
      updatedRepresentative.email = '';
    }

    updateFormData(ensureRepresentativeState({
      ...formData,
      representative: updatedRepresentative
    }));
  };

  const handlePersonChange = (index: number, field: keyof Person, value: string) => {
    if (readOnly) return;
    const updatedPersons = [...formData.persons];
    if (field === 'employment') {
      updatedPersons[index] = {
        ...updatedPersons[index],
        employment: {
          ...updatedPersons[index].employment,
          type: value,
          details: '' // Reset details when type changes
        }
      };
    } else {
      updatedPersons[index] = {
        ...updatedPersons[index],
        [field]: value
      };
    }
    updateFormData(ensureRepresentativeState({
      ...formData,
      persons: updatedPersons
    }));
  };

  const handleEmploymentDetailChange = (index: number, value: string) => {
    if (readOnly) return;
    const updatedPersons = [...formData.persons];
    updatedPersons[index] = {
      ...updatedPersons[index],
      employment: {
        ...updatedPersons[index].employment,
        details: value
      }
    };
    updateFormData(ensureRepresentativeState({
      ...formData,
      persons: updatedPersons
    }));
  };

  const toggleEmploymentSection = (personIndex: number, section: string) => {
    if (readOnly) return;
    setExpandedEmploymentSections(prev => ({
      ...prev,
      [personIndex]: prev[personIndex] === section ? null : section
    }));
  };

  const deletePerson = (index: number) => {
    if (readOnly) return;
    const updatedPersons = formData.persons.filter((_, i) => i !== index);
    updateFormData(ensureRepresentativeState({
      ...formData,
      persons: updatedPersons
    }));
  };

  const addPerson = () => {
    if (readOnly) return;
    updateFormData(ensureRepresentativeState({
      ...formData,
      persons: [
        ...formData.persons,
        {
          title: '',
          firstName: '',
          lastName: '',
          nationality: '',
          birthDate: '',
          street: '',
          houseNumber: '',
          postalCode: '',
          city: '',
          phone: '',
          email: '',
          employment: {
            type: '',
            details: ''
          }
        }
      ]
    }));
  };

  const renderTooltip = (text: string) => (
    <Tooltip id="button-tooltip">
      {text}
    </Tooltip>
  );

  const validatePerson = (person: Person, index: number): string[] => {
    const errors: string[] = [];
    if (!person.title) errors.push('Titel ist erforderlich');
    if (!person.firstName) errors.push('Vorname ist erforderlich');
    if (!person.lastName) errors.push('Name ist erforderlich');
    if (!person.birthDate) errors.push('Geburtsdatum ist erforderlich');
    if (!person.nationality) errors.push('Staatsangehörigkeit ist erforderlich');
    if (!person.street) errors.push('Straße ist erforderlich');
    if (!person.houseNumber) errors.push('Hausnummer ist erforderlich');
    if (!person.postalCode) errors.push('Postleitzahl ist erforderlich');
    else {
      const postalCode = person.postalCode;
      if (!/^\d{5}$/.test(postalCode)) {
        errors.push('Die Postleitzahl muss aus genau 5 Ziffern bestehen');
      }
    }
    if (!person.city) errors.push('Ort ist erforderlich');
    if (!person.phone) errors.push('Telefonnummer ist erforderlich');
    if (!person.email) errors.push('E-Mail ist erforderlich');
    if (!person.employment.type) errors.push('Beschäftigungsart ist erforderlich');
    if ((person.employment.type === 'sole-trader' || 
         person.employment.type === 'business-owner' || 
         person.employment.type === 'freelancer' || 
         person.employment.type === 'farmer' || 
         person.employment.type === 'private-income') && 
        !person.employment.details) {
      errors.push('Branche ist erforderlich');
    }
    return errors;
  };

  const validateRepresentative = (): string[] => {
    const errors: string[] = [];
    if (formData.representative.hasRepresentative === null) {
      errors.push('Bitte geben Sie an, ob einen Bevollmächtigten angeben wollen');
    }
    if (formData.representative.isCompany === null && formData.representative.hasRepresentative === true) {
      errors.push('Bitte geben Sie an, ob es sich um eine Firma handelt');
    }
    if (formData.representative.hasRepresentative) {
      if (formData.representative.isCompany === true) {
        if (!formData.representative.companyName) errors.push('Bitte geben Sie den Namen der Bevollmächtigten Firma ein');
        if (!formData.representative.postboxCity) errors.push('Bitte geben Sie den Ort des Postfachs der Bevollmächtigten Firma ein');
        if (!formData.representative.postboxPostcode) errors.push('Bitte geben Sie die Postleitzahl des Postfachs der Bevollmächtigten Firma ein');
      } else if (formData.representative.isCompany === false) {
        if (!formData.representative.title) errors.push('Bitte geben Sie den Titel des Bevollmächtigten ein');
        if (!formData.representative.firstName) errors.push('Bitte geben Sie den Vornamen des Bevollmächtigten ein');
        if (!formData.representative.lastName) errors.push('Bitte geben Sie den Nachnamen des Bevollmächtigten ein');
        if (!formData.representative.street) errors.push('Bitte geben Sie die Straße des Bevollmächtigten ein');
        if (!formData.representative.houseNumber) errors.push('Bitte geben Sie die Hausnummer des Bevollmächtigten ein');
        if (!formData.representative.postalCode) errors.push('Bitte geben Sie die Postleitzahl des Bevollmächtigten ein');
        if (!formData.representative.city) errors.push('Bitte geben Sie die Stadt des Bevollmächtigten ein');
        if (!formData.representative.phone) errors.push('Bitte geben Sie die Telefonnummer des Bevollmächtigten ein');
        if (!formData.representative.email) errors.push('Bitte geben Sie die E-Mail des Bevollmächtigten ein');
      }
    }
    return errors;
  };

  // Update validation errors when form data changes AND showValidation is true
  useEffect(() => {
    if (showValidation) {
      const newValidationErrors: ValidationErrors = {};
      
      // Validate each person
      formData.persons.forEach((person, index) => {
        const personErrors = validatePerson(person, index);
        if (personErrors.length > 0) {
          newValidationErrors[`person_${index}`] = personErrors;
        }
      });

      // Validate representative
      const representativeErrors = validateRepresentative();
      if (representativeErrors.length > 0) {
        newValidationErrors['representative'] = representativeErrors;
      }

      setValidationErrors(newValidationErrors);
    } else {
      // Clear validation errors when showValidation is false
      setValidationErrors({});
    }
  }, [formData, showValidation]);

  const getFieldError = (index: number, fieldName: string): boolean => {
    const errors = validationErrors[`person_${index}`] || [];
    if (fieldName === 'Postleitzahl') {
      return errors.some(error => error.includes('Postleitzahl') || error.includes('Die Postleitzahl muss aus genau 5 Ziffern bestehen'));
    }
    return errors.some(error => error.includes(fieldName));
  };

  const renderPersonForm = (person: Person, index: number) => (
    <div key={index} className="mb-5">
      <div className="d-flex align-items-center gap-3 mb-6">
        <h3 className="text-xl font-medium text-[#000000] mb-0">
          {index === 0 ? "Antragstellende Person 1" : `Antragstellende Person ${index + 1}`}
        </h3>
        {index > 0 && (
          <Button
            variant="outline-danger"
            className="rounded-circle p-0 d-flex align-items-center justify-content-center"
            style={{
              width: '24px',
              height: '24px',
              padding: '0',
              borderColor: '#FEF1F1',
              color: '#970606',
              backgroundColor: '#FEF1F1',
              transition: 'all 0.2s ease-in-out',
              fontSize: '26px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#970606';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FEF1F1';
              e.currentTarget.style.color = '#970606';
            }}
            onClick={() => deletePerson(index)}
            disabled={readOnly}
          >
            -
          </Button>
        )}
      </div>

      <div className="mb-4">
        <div className="d-flex align-items-center gap-2 mb-4">
          <h3 className="mb-0 text-[#000000] font-semibold italic">Angaben zur Person</h3>
          <OverlayTrigger
            placement="right"
            overlay={renderTooltip("Bitte geben Sie Ihre persönlichen Daten ein")}
          >
            <Button
              variant="outline-secondary"
              className="rounded-circle p-0 d-flex align-items-center justify-content-center"
              style={{
                width: '20px',
                height: '20px',
                color: '#064497',
                borderColor: '#D7DAEA',
                backgroundColor: '#D7DAEA'
              }}
            >
              ?
            </Button>
          </OverlayTrigger>
        </div>

        <div className="mb-3">
          <Form.Check
            inline
            type="radio"
            label="Herr"
            name={`title-${index}`}
            checked={person.title === 'Herr'}
            onChange={() => handlePersonChange(index, 'title', 'Herr')}
            disabled={readOnly}
          />
          <Form.Check
            inline
            type="radio"
            label="Frau"
            name={`title-${index}`}
            checked={person.title === 'Frau'}
            onChange={() => handlePersonChange(index, 'title', 'Frau')}
            disabled={readOnly}
          />
          <Form.Check
            inline
            type="radio"
            label="ohne Anrede"
            name={`title-${index}`}
            checked={person.title === 'ohne Anrede'}
            onChange={() => handlePersonChange(index, 'title', 'ohne Anrede')}
            disabled={readOnly}
          />
          {getFieldError(index, 'Titel') && (
            <div className="text-danger mt-1">
              Titel ist erforderlich
            </div>
          )}
        </div>

        <div className="row g-3">
          <div className="col-md-6">
            <Form.Floating>
              <Form.Control
                type="text"
                placeholder="Vorname"
                value={person.firstName}
                onChange={(e) => handlePersonChange(index, 'firstName', e.target.value)}
                isInvalid={getFieldError(index, 'Vorname')}
                disabled={readOnly}
              />
              <label>Vorname</label>
              <Form.Control.Feedback type="invalid">
                Vorname ist erforderlich
              </Form.Control.Feedback>
            </Form.Floating>
          </div>
          <div className="col-md-6">
            <Form.Floating>
              <Form.Control
                type="text"
                placeholder="Name"
                value={person.lastName}
                onChange={(e) => handlePersonChange(index, 'lastName', e.target.value)}
                isInvalid={getFieldError(index, 'Name')}
                disabled={readOnly}
              />
              <label>Name</label>
              <Form.Control.Feedback type="invalid">
                Name ist erforderlich
              </Form.Control.Feedback>
            </Form.Floating>
          </div>
        </div>

        <div className="row g-3 mt-1">
          <div className="col-md-6">
            <Form.Floating>
              <Form.Select
                value={person.nationality}
                onChange={(e) => handlePersonChange(index, 'nationality', e.target.value)}
                isInvalid={getFieldError(index, 'Staatsangehörigkeit')}
                disabled={readOnly}
              >
                <option value="">Bitte wählen</option>
                {countries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </Form.Select>
              <label>Staatsangehörigkeit</label>
              <Form.Control.Feedback type="invalid">
                Staatsangehörigkeit ist erforderlich
              </Form.Control.Feedback>
            </Form.Floating>
          </div>
          <div className="col-md-6">
            <Form.Floating>
              <Form.Control
                type="date"
                placeholder="Geburtsdatum"
                value={person.birthDate}
                onChange={(e) => handlePersonChange(index, 'birthDate', e.target.value)}
                isInvalid={getFieldError(index, 'Geburtsdatum')}
                disabled={readOnly}
              />
              <label>Geburtsdatum</label>
              <Form.Control.Feedback type="invalid">
                Geburtsdatum ist erforderlich
              </Form.Control.Feedback>
            </Form.Floating>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="d-flex align-items-center gap-2 mb-4">
          <h3 className="mb-0 text-[#000000] font-semibold italic">Aktuelle Adresse</h3>
          <OverlayTrigger
            placement="right"
            overlay={renderTooltip("Bitte geben Sie Ihre aktuelle Adresse ein")}
          >
            <Button
              variant="outline-secondary"
              className="rounded-circle p-0 d-flex align-items-center justify-content-center"
              style={{
                width: '20px',
                height: '20px',
                color: '#064497',
                borderColor: '#D7DAEA',
                backgroundColor: '#D7DAEA'
              }}
            >
              ?
            </Button>
          </OverlayTrigger>
        </div>

        <AddressInput
          value={{
            street: person.street,
            houseNumber: person.houseNumber,
            postalCode: person.postalCode,
            city: person.city
          }}
          onChange={(address) => {
            const updatedPersons = [...formData.persons];
            updatedPersons[index] = {
              ...updatedPersons[index],
              street: address.street,
              houseNumber: address.houseNumber,
              postalCode: address.postalCode,
              city: address.city
            };
            updateFormData({
              ...formData,
              persons: updatedPersons
            });
          }}
          isInvalid={{
            street: getFieldError(index, 'Straße'),
            houseNumber: getFieldError(index, 'Hausnummer'),
            postalCode: getFieldError(index, 'Postleitzahl'),
            city: getFieldError(index, 'Ort')
          }}
          errorMessages={{
            street: validationErrors[`person_${index}`]?.find(error => error.includes('Straße')) || '',
            houseNumber: validationErrors[`person_${index}`]?.find(error => error.includes('Hausnummer')) || '',
            postalCode: validationErrors[`person_${index}`]?.find(error => error.includes('Postleitzahl')) || '',
            city: validationErrors[`person_${index}`]?.find(error => error.includes('Ort')) || ''
          }}
          disabled={readOnly}
        />
      </div>

      <div className="mb-4">
        <div className="d-flex align-items-center gap-2 mb-4">
          <h3 className="mb-0 text-[#000000] font-semibold italic">Kontakt</h3>
          <OverlayTrigger
            placement="right"
            overlay={renderTooltip("Bitte geben Sie Ihre Kontaktdaten ein")}
          >
            <Button
              variant="outline-secondary"
              className="rounded-circle p-0 d-flex align-items-center justify-content-center"
              style={{
                width: '20px',
                height: '20px',
                color: '#064497',
                borderColor: '#D7DAEA',
                backgroundColor: '#D7DAEA'
              }}
            >
              ?
            </Button>
          </OverlayTrigger>
        </div>

        <div className="row g-3">
          <div className="col-md-6">
            <Form.Floating>
              <Form.Control
                type="tel"
                placeholder="Telefonnummer"
                value={person.phone}
                onChange={(e) => handlePersonChange(index, 'phone', e.target.value)}
                isInvalid={getFieldError(index, 'Telefonnummer')}
                disabled={readOnly}
              />
              <label>Telefonnummer</label>
              <Form.Control.Feedback type="invalid">
                Telefonnummer ist erforderlich
              </Form.Control.Feedback>
            </Form.Floating>
          </div>
          <div className="col-md-6">
            <Form.Floating>
              <Form.Control
                type="email"
                placeholder="E-Mail Adresse"
                value={person.email}
                onChange={(e) => handlePersonChange(index, 'email', e.target.value)}
                isInvalid={getFieldError(index, 'E-Mail')}
                disabled={readOnly}
              />
              <label>E-Mail Adresse</label>
              <Form.Control.Feedback type="invalid">
                E-Mail ist erforderlich
              </Form.Control.Feedback>
            </Form.Floating>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="d-flex align-items-center gap-2 mb-4">
          <h3 className="mb-0 text-[#000000] font-semibold italic">Beruf</h3>
          <OverlayTrigger
            placement="right"
            overlay={renderTooltip("Bitte wählen Sie Ihre berufliche Situation aus")}
          >
            <Button
              variant="outline-secondary"
              className="rounded-circle p-0 d-flex align-items-center justify-content-center"
              style={{
                width: '20px',
                height: '20px',
                color: '#064497',
                borderColor: '#D7DAEA',
                backgroundColor: '#D7DAEA'
              }}
            >
              ?
            </Button>
          </OverlayTrigger>
        </div>

        {getFieldError(index, 'Beschäftigungsart') && (
          <div className="text-danger mb-2">
            Beschäftigungsart ist erforderlich
          </div>
        )}

        <div className="employment-sections">
          {/* Non-self-employed section */}
          <div className="mb-3">
            <Button
              onClick={() => toggleEmploymentSection(index, 'non-self-employed')}
              className="d-flex justify-content-between align-items-center w-100 text-start"
              style={{
                backgroundColor: expandedEmploymentSections[index] === 'non-self-employed' ? '#064497' : '#fff',
                color: expandedEmploymentSections[index] === 'non-self-employed' ? '#fff' : '#000',
                border: '1px solid #dee2e6'
              }}
              disabled={readOnly}
            >
              <span>Wirtschaftlich nicht selbständig</span>
              <i className={`bi bi-chevron-${expandedEmploymentSections[index] === 'non-self-employed' ? 'up' : 'down'}`}></i>
            </Button>
            
            {expandedEmploymentSections[index] === 'non-self-employed' && (
              <div className="mt-3 ps-2">
                <Form.Check
                  type="radio"
                  label="Arbeiterinnen und Arbeiter"
                  name={`employment-${index}`}
                  checked={person.employment.type === 'worker'}
                  onChange={() => handlePersonChange(index, 'employment', 'worker')}
                  disabled={readOnly}
                />
                <Form.Check
                  type="radio"
                  label="Angestellte"
                  name={`employment-${index}`}
                  checked={person.employment.type === 'employee'}
                  onChange={() => handlePersonChange(index, 'employment', 'employee')}
                  disabled={readOnly}
                />
                <Form.Check
                  type="radio"
                  label="Beamtinnen und Beamte"
                  name={`employment-${index}`}
                  checked={person.employment.type === 'civil-servant'}
                  onChange={() => handlePersonChange(index, 'employment', 'civil-servant')}
                  disabled={readOnly}
                />
                <Form.Check
                  type="radio"
                  label="Auszubildende"
                  name={`employment-${index}`}
                  checked={person.employment.type === 'apprentice'}
                  onChange={() => handlePersonChange(index, 'employment', 'apprentice')}
                  disabled={readOnly}
                />
                <Form.Check
                  type="radio"
                  label="Rentnerinnen/Pensionärinnen und Rentner/Pensionäre"
                  name={`employment-${index}`}
                  checked={person.employment.type === 'retired'}
                  onChange={() => handlePersonChange(index, 'employment', 'retired')}
                  disabled={readOnly}
                />
                <Form.Check
                  type="radio"
                  label="Arbeitslos"
                  name={`employment-${index}`}
                  checked={person.employment.type === 'unemployed'}
                  onChange={() => handlePersonChange(index, 'employment', 'unemployed')}
                  disabled={readOnly}
                />
              </div>
            )}
          </div>

          {/* Self-employed section */}
          <div className="mb-3">
            <Button
              onClick={() => toggleEmploymentSection(index, 'self-employed')}
              className="d-flex justify-content-between align-items-center w-100 text-start"
              style={{
                backgroundColor: expandedEmploymentSections[index] === 'self-employed' ? '#064497' : '#fff',
                color: expandedEmploymentSections[index] === 'self-employed' ? '#fff' : '#000',
                border: '1px solid #dee2e6'
              }}
              disabled={readOnly}
            >
              <span>Wirtschaftlich selbständige Privatperson</span>
              <i className={`bi bi-chevron-${expandedEmploymentSections[index] === 'self-employed' ? 'up' : 'down'}`}></i>
            </Button>
            
            {expandedEmploymentSections[index] === 'self-employed' && (
              <div className="mt-3 ps-2">
                <Form.Check
                  type="radio"
                  label="Einzelkaufleute"
                  name={`employment-${index}`}
                  checked={person.employment.type === 'sole-trader'}
                  onChange={() => handlePersonChange(index, 'employment', 'sole-trader')}
                  disabled={readOnly}
                />
                <Form.Check
                  type="radio"
                  label="Gewerbetreibende"
                  name={`employment-${index}`}
                  checked={person.employment.type === 'business-owner'}
                  onChange={() => handlePersonChange(index, 'employment', 'business-owner')}
                  disabled={readOnly}
                />
                <Form.Check
                  type="radio"
                  label="Freiberuflich Tätige"
                  name={`employment-${index}`}
                  checked={person.employment.type === 'freelancer'}
                  onChange={() => handlePersonChange(index, 'employment', 'freelancer')}
                  disabled={readOnly}
                />
                <Form.Check
                  type="radio"
                  label="Landwirte"
                  name={`employment-${index}`}
                  checked={person.employment.type === 'farmer'}
                  onChange={() => handlePersonChange(index, 'employment', 'farmer')}
                  disabled={readOnly}
                />
                <Form.Check
                  type="radio"
                  label="Privatperson deren Einkommen überwiegend aus Vermögen stammt"
                  name={`employment-${index}`}
                  checked={person.employment.type === 'private-income'}
                  onChange={() => handlePersonChange(index, 'employment', 'private-income')}
                  disabled={readOnly}
                />
                <div className="mt-2 ps-4">
                  <Form.Floating>
                    <Form.Control
                      type="text"
                      placeholder="Branche"
                      value={person.employment.details}
                      onChange={(e) => handleEmploymentDetailChange(index, e.target.value)}
                      isInvalid={getFieldError(index, 'Branche')}
                      disabled={readOnly}
                    />
                    <label>Branche</label>
                    <Form.Control.Feedback type="invalid">
                      Branche ist erforderlich
                    </Form.Control.Feedback>
                  </Form.Floating>
                </div>
              </div>
            )}
          </div>

          {/* Other section */}
          <div className="mb-3">
            <Button
              onClick={() => toggleEmploymentSection(index, 'other')}
              className="d-flex justify-content-between align-items-center w-100 text-start"
              style={{
                backgroundColor: expandedEmploymentSections[index] === 'other' ? '#064497' : '#fff',
                color: expandedEmploymentSections[index] === 'other' ? '#fff' : '#000',
                border: '1px solid #dee2e6'
              }}
              disabled={readOnly}
            >
              <span>Sonstige Privatperson</span>
              <i className={`bi bi-chevron-${expandedEmploymentSections[index] === 'other' ? 'up' : 'down'}`}></i>
            </Button>
            
            {expandedEmploymentSections[index] === 'other' && (
              <div className="mt-3 ps-2">
                <Form.Check
                  type="radio"
                  label="Studierende"
                  name={`employment-${index}`}
                  checked={person.employment.type === 'student'}
                  onChange={() => handlePersonChange(index, 'employment', 'student')}
                  disabled={readOnly}
                />
                <Form.Check
                  type="radio"
                  label="Schülerinnen und Schüler"
                  name={`employment-${index}`}
                  checked={person.employment.type === 'pupil'}
                  onChange={() => handlePersonChange(index, 'employment', 'pupil')}
                  disabled={readOnly}
                />
                <Form.Check
                  type="radio"
                  label="Hausfrauen und Hausmänner"
                  name={`employment-${index}`}
                  checked={person.employment.type === 'homemaker'}
                  onChange={() => handlePersonChange(index, 'employment', 'homemaker')}
                  disabled={readOnly}
                />
                <Form.Check
                  type="radio"
                  label="ohne Berufsangabe"
                  name={`employment-${index}`}
                  checked={person.employment.type === 'no-occupation'}
                  onChange={() => handlePersonChange(index, 'employment', 'no-occupation')}
                  disabled={readOnly}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderRepresentativeSection = () => (
    <div className="mb-5">
      <h3 className="text-xl font-medium text-[#000000] mb-4">
        Bevollmächtigte
      </h3>

      <div className="d-flex align-items-center mb-3">
        <div className="flex-grow-1">
          <Form.Label className="d-flex align-items-center gap-2">
            Möchten Sie einen Bevollmächtigten angeben?
            <OverlayTrigger
              placement="right"
              overlay={renderTooltip("Geben Sie an, ob Sie einen Bevollmächtigten haben")}
            >
              <Button
                variant="outline-secondary"
                className="rounded-circle p-0 d-flex align-items-center justify-content-center"
                style={{
                  width: '20px',
                  height: '20px',
                  color: '#064497',
                  borderColor: '#D7DAEA',
                  backgroundColor: '#D7DAEA'
                }}
              >
                ?
              </Button>
            </OverlayTrigger>
          </Form.Label>
        </div>
        <div className="d-flex gap-3">
          <Form.Check
            inline
            type="radio"
            label="Ja"
            name="hasRepresentative"
            checked={formData.representative.hasRepresentative === true}
            onChange={() => handleRepresentativeChange('hasRepresentative', true)}
            className="custom-radio"
            disabled={readOnly}
          />
          <Form.Check
            inline
            type="radio"
            label="Nein"
            name="hasRepresentative"
            checked={formData.representative.hasRepresentative === false}
            onChange={() => handleRepresentativeChange('hasRepresentative', false)}
            className="custom-radio"
            disabled={readOnly}
          />
        </div>
      </div>
      {validationErrors['representative']?.includes('Bitte geben Sie an, ob einen Bevollmächtigten angeben wollen') && (
        <div className="text-danger mt-1">
          Bitte geben Sie an, ob einen Bevollmächtigten angeben wollen
        </div>
      )}

      {formData.representative.hasRepresentative && (
        <div className="d-flex align-items-center mb-3">
          <div className="flex-grow-1">
            <Form.Label className="d-flex align-items-center gap-2">
              Bevollmächtigte ist eine Firma
              <OverlayTrigger
                placement="right"
                overlay={renderTooltip("Geben Sie an, ob der Bevollmächtigte eine Firma ist")}
              >
                <Button
                  variant="outline-secondary"
                  className="rounded-circle p-0 d-flex align-items-center justify-content-center"
                  style={{
                    width: '20px',
                    height: '20px',
                    color: '#064497',
                    borderColor: '#D7DAEA',
                    backgroundColor: '#D7DAEA'
                  }}
                >
                  ?
                </Button>
              </OverlayTrigger>
            </Form.Label>
          </div>
          <div className="d-flex gap-3">
            <Form.Check
              inline
              type="radio"
              label="Ja"
              name="isCompany"
              checked={formData.representative.isCompany === true}
              onChange={() => handleRepresentativeChange('isCompany', true)}
              className="custom-radio"
              disabled={readOnly}
            />
            <Form.Check
              inline
              type="radio"
              label="Nein"
              name="isCompany"
              checked={formData.representative.isCompany === false}
              onChange={() => handleRepresentativeChange('isCompany', false)}
              className="custom-radio"
              disabled={readOnly}
            />
          </div>
        </div>
      )}
      {validationErrors['representative']?.includes('Bitte geben Sie an, ob es sich um eine Firma handelt') && (
        <div className="text-danger mt-1">
          Bitte geben Sie an, ob es sich um eine Firma handelt
        </div>
      )}

      {formData.representative.hasRepresentative && formData.representative.isCompany === true && (
        // Company fields
        <div className="row g-3">
          <div className="col-12">
            <Form.Floating>
              <Form.Control
                type="text"
                placeholder="Firma"
                value={formData.representative.companyName}
                onChange={(e) => handleRepresentativeChange('companyName', e.target.value)}
                isInvalid={validationErrors['representative']?.includes('Bitte geben Sie den Namen der Bevollmächtigten Firma ein')}
                disabled={readOnly}
              />
              <label>Firma</label>
              <Form.Control.Feedback type="invalid">
                Bitte geben Sie den Namen der Bevollmächtigten Firma ein
              </Form.Control.Feedback>
            </Form.Floating>
          </div>
          <div className="col-md-6">
            <Form.Floating>
              <Form.Control
                type="text"
                placeholder="Postfach PLZ"
                value={formData.representative.postboxPostcode}
                onChange={(e) => handleRepresentativeChange('postboxPostcode', e.target.value)}
                isInvalid={validationErrors['representative']?.includes('Bitte geben Sie die Postleitzahl des Postfachs der Bevollmächtigten Firma ein')}
                disabled={readOnly}
              />
              <label>Postfach PLZ</label>
              <Form.Control.Feedback type="invalid">
                Bitte geben Sie die Postleitzahl des Postfachs der Bevollmächtigten Firma ein
              </Form.Control.Feedback>
            </Form.Floating>
          </div>
          <div className="col-md-6">
            <Form.Floating>
              <Form.Control
                type="text"
                placeholder="Postfach Ort"
                value={formData.representative.postboxCity}
                onChange={(e) => handleRepresentativeChange('postboxCity', e.target.value)}
                isInvalid={validationErrors['representative']?.includes('Bitte geben Sie den Ort des Postfachs der Bevollmächtigten Firma ein')}
                disabled={readOnly}
              />
              <label>Postfach Ort</label>
              <Form.Control.Feedback type="invalid">
                Bitte geben Sie den Ort des Postfachs der Bevollmächtigten Firma ein
              </Form.Control.Feedback>
            </Form.Floating>
          </div>
        </div>
      )}

      {formData.representative.hasRepresentative && formData.representative.isCompany === false && (
        // Personal details fields
        <>
          <div className="mb-3">
            <Form.Check
              inline
              type="radio"
              label="Herr"
              name="representative-title"
              checked={formData.representative.title === 'Herr'}
              onChange={() => handleRepresentativeChange('title', 'Herr')}
              disabled={readOnly}
            />
            <Form.Check
              inline
              type="radio"
              label="Frau"
              name="representative-title"
              checked={formData.representative.title === 'Frau'}
              onChange={() => handleRepresentativeChange('title', 'Frau')}
              disabled={readOnly}
            />
            <Form.Check
              inline
              type="radio"
              label="ohne Anrede"
              name="representative-title"
              checked={formData.representative.title === 'ohne Anrede'}
              onChange={() => handleRepresentativeChange('title', 'ohne Anrede')}
              disabled={readOnly}
            />
            {validationErrors['representative']?.includes('Bitte geben Sie den Titel des Bevollmächtigten ein') && (
              <div className="text-danger mt-1">
                Bitte geben Sie den Titel des Bevollmächtigten ein
              </div>
            )}
          </div>

          <div className="row g-3">
            <div className="col-md-6">
              <Form.Floating>
                <Form.Control
                  type="text"
                  placeholder="Vorname"
                  value={formData.representative.firstName}
                  onChange={(e) => handleRepresentativeChange('firstName', e.target.value)}
                  isInvalid={validationErrors['representative']?.includes('Bitte geben Sie den Vornamen des Bevollmächtigten ein')}
                  disabled={readOnly}
                />
                <label>Vorname</label>
                <Form.Control.Feedback type="invalid">
                  Bitte geben Sie den Vornamen des Bevollmächtigten ein
                </Form.Control.Feedback>
              </Form.Floating>
            </div>
            <div className="col-md-6">
              <Form.Floating>
                <Form.Control
                  type="text"
                  placeholder="Name"
                  value={formData.representative.lastName}
                  onChange={(e) => handleRepresentativeChange('lastName', e.target.value)}
                  isInvalid={validationErrors['representative']?.includes('Bitte geben Sie den Nachnamen des Bevollmächtigten ein')}
                  disabled={readOnly}
                />
                <label>Name</label>
                <Form.Control.Feedback type="invalid">
                  Bitte geben Sie den Nachnamen des Bevollmächtigten ein
                </Form.Control.Feedback>
              </Form.Floating>
            </div>
          </div>

          <div className="row g-3 mt-1">
            <div className="col-md-8">
              <Form.Floating>
                <Form.Control
                  type="text"
                  placeholder="Straße"
                  value={formData.representative.street}
                  onChange={(e) => handleRepresentativeChange('street', e.target.value)}
                  isInvalid={validationErrors['representative']?.includes('Bitte geben Sie die Straße des Bevollmächtigten ein')}
                  disabled={readOnly}
                />
                <label>Straße</label>
                <Form.Control.Feedback type="invalid">
                  Bitte geben Sie die Straße des Bevollmächtigten ein
                </Form.Control.Feedback>
              </Form.Floating>
            </div>
            <div className="col-md-4">
              <Form.Floating>
                <Form.Control
                  type="text"
                  placeholder="Hausnummer"
                  value={formData.representative.houseNumber}
                  onChange={(e) => handleRepresentativeChange('houseNumber', e.target.value)}
                  isInvalid={validationErrors['representative']?.includes('Bitte geben Sie die Hausnummer des Bevollmächtigten ein')}
                  disabled={readOnly}
                />
                <label>Hausnummer</label>
                <Form.Control.Feedback type="invalid">
                  Bitte geben Sie die Hausnummer des Bevollmächtigten ein
                </Form.Control.Feedback>
              </Form.Floating>
            </div>
          </div>

          <div className="row g-3 mt-1">
            <div className="col-md-4">
              <Form.Floating>
                <Form.Control
                  type="text"
                  placeholder="Postleitzahl"
                  value={formData.representative.postalCode}
                  onChange={(e) => handleRepresentativeChange('postalCode', e.target.value)}
                  isInvalid={validationErrors['representative']?.includes('Bitte geben Sie die Postleitzahl des Bevollmächtigten ein')}
                  disabled={readOnly}
                />
                <label>Postleitzahl</label>
                <Form.Control.Feedback type="invalid">
                  Bitte geben Sie die Postleitzahl des Bevollmächtigten ein
                </Form.Control.Feedback>
              </Form.Floating>
            </div>
            <div className="col-md-8">
              <Form.Floating>
                <Form.Control
                  type="text"
                  placeholder="Ort"
                  value={formData.representative.city}
                  onChange={(e) => handleRepresentativeChange('city', e.target.value)}
                  isInvalid={validationErrors['representative']?.includes('Bitte geben Sie die Stadt des Bevollmächtigten ein')}
                  disabled={readOnly}
                />
                <label>Ort</label>
                <Form.Control.Feedback type="invalid">
                  Bitte geben Sie die Stadt des Bevollmächtigten ein
                </Form.Control.Feedback>
              </Form.Floating>
            </div>
          </div>

          <div className="row g-3 mt-1">
            <div className="col-md-6">
              <Form.Floating>
                <Form.Control
                  type="tel"
                  placeholder="Telefonnummer"
                  value={formData.representative.phone}
                  onChange={(e) => handleRepresentativeChange('phone', e.target.value)}
                  isInvalid={validationErrors['representative']?.includes('Bitte geben Sie die Telefonnummer des Bevollmächtigten ein')}
                  disabled={readOnly}
                />
                <label>Telefonnummer</label>
                <Form.Control.Feedback type="invalid">
                  Bitte geben Sie die Telefonnummer des Bevollmächtigten ein
                </Form.Control.Feedback>
              </Form.Floating>
            </div>
            <div className="col-md-6">
              <Form.Floating>
                <Form.Control
                  type="email"
                  placeholder="E-Mail Adresse"
                  value={formData.representative.email}
                  onChange={(e) => handleRepresentativeChange('email', e.target.value)}
                  isInvalid={validationErrors['representative']?.includes('Bitte geben Sie die E-Mail des Bevollmächtigten ein')}
                  disabled={readOnly}
                />
                <label>E-Mail Adresse</label>
                <Form.Control.Feedback type="invalid">
                  Bitte geben Sie die E-Mail des Bevollmächtigten ein
                </Form.Control.Feedback>
              </Form.Floating>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div>
      <style>
        {`
          ${styles}
          .form-check-input:checked {
            background-color: #064497 !important;
            border-color: #064497 !important;
          }
          .add-person-button {
            color: #064497 !important;
            border-color: #064497 !important;
          }
          .add-person-button:hover {
            color: white !important;
            background-color: #064497 !important;
          }
          /* Custom validation styling */
          .form-control.is-invalid {
            border-color: #f61c1c !important;
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' width='12' height='12' fill='none' stroke='%23f61c1c'%3e%3ccircle cx='6' cy='6' r='4.5'/%3e%3cpath stroke-linejoin='round' d='M5.8 3.6h.4L6 6.5z'/%3e%3ccircle cx='6' cy='8.2' r='.6' fill='%23f61c1c' stroke='none'/%3e%3c/svg%3e") !important;
          }
          .form-control.is-invalid:focus {
            border-color: #f61c1c !important;
            box-shadow: 0 0 0 0.25rem rgba(246, 28, 28, 0.25) !important;
          }
          .form-select.is-invalid {
            border-color: #f61c1c !important;
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' width='12' height='12' fill='none' stroke='%23f61c1c'%3e%3ccircle cx='6' cy='6' r='4.5'/%3e%3cpath stroke-linejoin='round' d='M5.8 3.6h.4L6 6.5z'/%3e%3ccircle cx='6' cy='8.2' r='.6' fill='%23f61c1c' stroke='none'/%3e%3c/svg%3e") !important;
          }
          .form-select.is-invalid:focus {
            border-color: #f61c1c !important;
            box-shadow: 0 0 0 0.25rem rgba(246, 28, 28, 0.25) !important;
          }
          .invalid-feedback {
            color: #f61c1c !important;
          }
          .text-danger {
            color: #f61c1c !important;
          }
        `}
      </style>
      
      {renderRepresentativeSection()}
      {formData.persons.map((person, index) => renderPersonForm(person, index))}
      
      <div className="text-center mb-8">
        { !readOnly && <Button
          onClick={addPerson}
          variant="outline-primary"
          className="rounded-pill add-person-button"
        >
          + Weitere Antragstellende Person hinzufügen
        </Button> }
      </div>
    </div>
  );
};

export default Step1_PersonalInfo; 