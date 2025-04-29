import React, { useState } from 'react';
import { Form, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';

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
}

const Step1_PersonalInfo: React.FC<Step1Props> = ({ formData, updateFormData }) => {
  const [expandedEmploymentSection, setExpandedEmploymentSection] = useState<string | null>(null);

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

  const handleRepresentativeChange = (field: keyof Representative, value: any) => {
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

  const toggleEmploymentSection = (section: string) => {
    setExpandedEmploymentSection(expandedEmploymentSection === section ? null : section);
  };

  const deletePerson = (index: number) => {
    const updatedPersons = formData.persons.filter((_, i) => i !== index);
    updateFormData(ensureRepresentativeState({
      ...formData,
      persons: updatedPersons
    }));
  };

  const addPerson = () => {
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
          />
          <Form.Check
            inline
            type="radio"
            label="Frau"
            name={`title-${index}`}
            checked={person.title === 'Frau'}
            onChange={() => handlePersonChange(index, 'title', 'Frau')}
          />
          <Form.Check
            inline
            type="radio"
            label="ohne Anrede"
            name={`title-${index}`}
            checked={person.title === 'ohne Anrede'}
            onChange={() => handlePersonChange(index, 'title', 'ohne Anrede')}
          />
        </div>

        <div className="row g-3">
          <div className="col-md-6">
            <Form.Floating>
              <Form.Control
                type="text"
                placeholder="Vorname"
                value={person.firstName}
                onChange={(e) => handlePersonChange(index, 'firstName', e.target.value)}
              />
              <label>Vorname</label>
            </Form.Floating>
          </div>
          <div className="col-md-6">
            <Form.Floating>
              <Form.Control
                type="text"
                placeholder="Name"
                value={person.lastName}
                onChange={(e) => handlePersonChange(index, 'lastName', e.target.value)}
              />
              <label>Name</label>
            </Form.Floating>
          </div>
        </div>

        <div className="row g-3 mt-1">
          <div className="col-md-6">
            <Form.Floating>
              <Form.Select
                value={person.nationality}
                onChange={(e) => handlePersonChange(index, 'nationality', e.target.value)}
              >
                <option value="">Bitte wählen</option>
                {countries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </Form.Select>
              <label>Staatsangehörigkeit</label>
            </Form.Floating>
          </div>
          <div className="col-md-6">
            <Form.Floating>
              <Form.Control
                type="date"
                placeholder="Geburtsdatum"
                value={person.birthDate}
                onChange={(e) => handlePersonChange(index, 'birthDate', e.target.value)}
              />
              <label>Geburtsdatum</label>
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

        <div className="row g-3">
          <div className="col-md-8">
            <Form.Floating>
              <Form.Control
                type="text"
                placeholder="Straße"
                value={person.street}
                onChange={(e) => handlePersonChange(index, 'street', e.target.value)}
              />
              <label>Straße</label>
            </Form.Floating>
          </div>
          <div className="col-md-4">
            <Form.Floating>
              <Form.Control
                type="text"
                placeholder="Hausnummer"
                value={person.houseNumber}
                onChange={(e) => handlePersonChange(index, 'houseNumber', e.target.value)}
              />
              <label>Hausnummer</label>
            </Form.Floating>
          </div>
        </div>

        <div className="row g-3 mt-1">
          <div className="col-md-4">
            <Form.Floating>
              <Form.Control
                type="text"
                placeholder="Postleitzahl"
                value={person.postalCode}
                onChange={(e) => handlePersonChange(index, 'postalCode', e.target.value)}
              />
              <label>Postleitzahl</label>
            </Form.Floating>
          </div>
          <div className="col-md-8">
            <Form.Floating>
              <Form.Control
                type="text"
                placeholder="Ort"
                value={person.city}
                onChange={(e) => handlePersonChange(index, 'city', e.target.value)}
              />
              <label>Ort</label>
            </Form.Floating>
          </div>
        </div>
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
              />
              <label>Telefonnummer</label>
            </Form.Floating>
          </div>
          <div className="col-md-6">
            <Form.Floating>
              <Form.Control
                type="email"
                placeholder="E-Mail Adresse"
                value={person.email}
                onChange={(e) => handlePersonChange(index, 'email', e.target.value)}
              />
              <label>E-Mail Adresse</label>
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

        <div className="employment-sections">
          {/* Non-self-employed section */}
          <div className="mb-3">
            <Button
              onClick={() => toggleEmploymentSection('non-self-employed')}
              className="d-flex justify-content-between align-items-center w-100 text-start"
              style={{
                backgroundColor: expandedEmploymentSection === 'non-self-employed' ? '#064497' : '#fff',
                color: expandedEmploymentSection === 'non-self-employed' ? '#fff' : '#000',
                border: '1px solid #dee2e6'
              }}
            >
              <span>Wirtschaftlich nicht selbständig</span>
              <i className={`bi bi-chevron-${expandedEmploymentSection === 'non-self-employed' ? 'up' : 'down'}`}></i>
            </Button>
            
            {expandedEmploymentSection === 'non-self-employed' && (
              <div className="mt-3 ps-2">
                <Form.Check
                  type="radio"
                  label="Arbeiterinnen und Arbeiter"
                  name={`employment-${index}`}
                  checked={person.employment.type === 'worker'}
                  onChange={() => handlePersonChange(index, 'employment', 'worker')}
                />
                <Form.Check
                  type="radio"
                  label="Angestellte"
                  name={`employment-${index}`}
                  checked={person.employment.type === 'employee'}
                  onChange={() => handlePersonChange(index, 'employment', 'employee')}
                />
                <Form.Check
                  type="radio"
                  label="Beamtinnen und Beamte"
                  name={`employment-${index}`}
                  checked={person.employment.type === 'civil-servant'}
                  onChange={() => handlePersonChange(index, 'employment', 'civil-servant')}
                />
                <Form.Check
                  type="radio"
                  label="Auszubildende"
                  name={`employment-${index}`}
                  checked={person.employment.type === 'apprentice'}
                  onChange={() => handlePersonChange(index, 'employment', 'apprentice')}
                />
                <Form.Check
                  type="radio"
                  label="Rentnerinnen/Pensionärinnen und Rentner/Pensionäre"
                  name={`employment-${index}`}
                  checked={person.employment.type === 'retired'}
                  onChange={() => handlePersonChange(index, 'employment', 'retired')}
                />
                <Form.Check
                  type="radio"
                  label="Arbeitslos"
                  name={`employment-${index}`}
                  checked={person.employment.type === 'unemployed'}
                  onChange={() => handlePersonChange(index, 'employment', 'unemployed')}
                />
              </div>
            )}
          </div>

          {/* Self-employed section */}
          <div className="mb-3">
            <Button
              onClick={() => toggleEmploymentSection('self-employed')}
              className="d-flex justify-content-between align-items-center w-100 text-start"
              style={{
                backgroundColor: expandedEmploymentSection === 'self-employed' ? '#064497' : '#fff',
                color: expandedEmploymentSection === 'self-employed' ? '#fff' : '#000',
                border: '1px solid #dee2e6'
              }}
            >
              <span>Wirtschaftlich selbständige Privatperson</span>
              <i className={`bi bi-chevron-${expandedEmploymentSection === 'self-employed' ? 'up' : 'down'}`}></i>
            </Button>
            
            {expandedEmploymentSection === 'self-employed' && (
              <div className="mt-3 ps-2">
                <Form.Check
                  type="radio"
                  label="Einzelkaufleute"
                  name={`employment-${index}`}
                  checked={person.employment.type === 'sole-trader'}
                  onChange={() => handlePersonChange(index, 'employment', 'sole-trader')}
                />
                <Form.Check
                  type="radio"
                  label="Gewerbetreibende"
                  name={`employment-${index}`}
                  checked={person.employment.type === 'business-owner'}
                  onChange={() => handlePersonChange(index, 'employment', 'business-owner')}
                />
                <Form.Check
                  type="radio"
                  label="Freiberuflich Tätige"
                  name={`employment-${index}`}
                  checked={person.employment.type === 'freelancer'}
                  onChange={() => handlePersonChange(index, 'employment', 'freelancer')}
                />
                <Form.Check
                  type="radio"
                  label="Landwirte"
                  name={`employment-${index}`}
                  checked={person.employment.type === 'farmer'}
                  onChange={() => handlePersonChange(index, 'employment', 'farmer')}
                />
                <Form.Check
                  type="radio"
                  label="Privatperson deren Einkommen überwiegend aus Vermögen stammt"
                  name={`employment-${index}`}
                  checked={person.employment.type === 'private-income'}
                  onChange={() => handlePersonChange(index, 'employment', 'private-income')}
                />
                <div className="mt-2 ps-4">
                  <Form.Floating>
                    <Form.Control
                      type="text"
                      placeholder="Branche"
                      value={person.employment.details}
                      onChange={(e) => handleEmploymentDetailChange(index, e.target.value)}
                    />
                    <label>Branche</label>
                  </Form.Floating>
                </div>
              </div>
            )}
          </div>

          {/* Other section */}
          <div className="mb-3">
            <Button
              onClick={() => toggleEmploymentSection('other')}
              className="d-flex justify-content-between align-items-center w-100 text-start"
              style={{
                backgroundColor: expandedEmploymentSection === 'other' ? '#064497' : '#fff',
                color: expandedEmploymentSection === 'other' ? '#fff' : '#000',
                border: '1px solid #dee2e6'
              }}
            >
              <span>Sonstige Privatperson</span>
              <i className={`bi bi-chevron-${expandedEmploymentSection === 'other' ? 'up' : 'down'}`}></i>
            </Button>
            
            {expandedEmploymentSection === 'other' && (
              <div className="mt-3 ps-2">
                <Form.Check
                  type="radio"
                  label="Studierende"
                  name={`employment-${index}`}
                  checked={person.employment.type === 'student'}
                  onChange={() => handlePersonChange(index, 'employment', 'student')}
                />
                <Form.Check
                  type="radio"
                  label="Schülerinnen und Schüler"
                  name={`employment-${index}`}
                  checked={person.employment.type === 'pupil'}
                  onChange={() => handlePersonChange(index, 'employment', 'pupil')}
                />
                <Form.Check
                  type="radio"
                  label="Hausfrauen und Hausmänner"
                  name={`employment-${index}`}
                  checked={person.employment.type === 'homemaker'}
                  onChange={() => handlePersonChange(index, 'employment', 'homemaker')}
                />
                <Form.Check
                  type="radio"
                  label="ohne Berufsangabe"
                  name={`employment-${index}`}
                  checked={person.employment.type === 'no-occupation'}
                  onChange={() => handlePersonChange(index, 'employment', 'no-occupation')}
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
          />
          <Form.Check
            inline
            type="radio"
            label="Nein"
            name="hasRepresentative"
            checked={formData.representative.hasRepresentative === false}
            onChange={() => handleRepresentativeChange('hasRepresentative', false)}
            className="custom-radio"
          />
        </div>
      </div>

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
            />
            <Form.Check
              inline
              type="radio"
              label="Nein"
              name="isCompany"
              checked={formData.representative.isCompany === false}
              onChange={() => handleRepresentativeChange('isCompany', false)}
              className="custom-radio"
            />
          </div>
        </div>
      )}

      {formData.representative.hasRepresentative && (
        formData.representative.isCompany ? (
          // Company fields
          <div className="row g-3">
            <div className="col-12">
              <Form.Floating>
                <Form.Control
                  type="text"
                  placeholder="Firma"
                  value={formData.representative.companyName}
                  onChange={(e) => handleRepresentativeChange('companyName', e.target.value)}
                />
                <label>Firma</label>
              </Form.Floating>
            </div>
            <div className="col-md-6">
              <Form.Floating>
                <Form.Control
                  type="text"
                  placeholder="Postfach PLZ"
                  value={formData.representative.postboxPostcode}
                  onChange={(e) => handleRepresentativeChange('postboxPostcode', e.target.value)}
                />
                <label>Postfach PLZ</label>
              </Form.Floating>
            </div>
            <div className="col-md-6">
              <Form.Floating>
                <Form.Control
                  type="text"
                  placeholder="Postfach Ort"
                  value={formData.representative.postboxCity}
                  onChange={(e) => handleRepresentativeChange('postboxCity', e.target.value)}
                />
                <label>Postfach Ort</label>
              </Form.Floating>
            </div>
          </div>
        ) : (
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
              />
              <Form.Check
                inline
                type="radio"
                label="Frau"
                name="representative-title"
                checked={formData.representative.title === 'Frau'}
                onChange={() => handleRepresentativeChange('title', 'Frau')}
              />
              <Form.Check
                inline
                type="radio"
                label="ohne Anrede"
                name="representative-title"
                checked={formData.representative.title === 'ohne Anrede'}
                onChange={() => handleRepresentativeChange('title', 'ohne Anrede')}
              />
            </div>

            <div className="row g-3">
              <div className="col-md-6">
                <Form.Floating>
                  <Form.Control
                    type="text"
                    placeholder="Vorname"
                    value={formData.representative.firstName}
                    onChange={(e) => handleRepresentativeChange('firstName', e.target.value)}
                  />
                  <label>Vorname</label>
                </Form.Floating>
              </div>
              <div className="col-md-6">
                <Form.Floating>
                  <Form.Control
                    type="text"
                    placeholder="Name"
                    value={formData.representative.lastName}
                    onChange={(e) => handleRepresentativeChange('lastName', e.target.value)}
                  />
                  <label>Name</label>
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
                  />
                  <label>Straße</label>
                </Form.Floating>
              </div>
              <div className="col-md-4">
                <Form.Floating>
                  <Form.Control
                    type="text"
                    placeholder="Hausnummer"
                    value={formData.representative.houseNumber}
                    onChange={(e) => handleRepresentativeChange('houseNumber', e.target.value)}
                  />
                  <label>Hausnummer</label>
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
                  />
                  <label>Postleitzahl</label>
                </Form.Floating>
              </div>
              <div className="col-md-8">
                <Form.Floating>
                  <Form.Control
                    type="text"
                    placeholder="Ort"
                    value={formData.representative.city}
                    onChange={(e) => handleRepresentativeChange('city', e.target.value)}
                  />
                  <label>Ort</label>
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
                  />
                  <label>Telefonnummer</label>
                </Form.Floating>
              </div>
              <div className="col-md-6">
                <Form.Floating>
                  <Form.Control
                    type="email"
                    placeholder="E-Mail Adresse"
                    value={formData.representative.email}
                    onChange={(e) => handleRepresentativeChange('email', e.target.value)}
                  />
                  <label>E-Mail Adresse</label>
                </Form.Floating>
              </div>
            </div>
          </>
        )
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
        `}
      </style>
      
      {renderRepresentativeSection()}
      {formData.persons.map((person, index) => renderPersonForm(person, index))}
      
      <div className="text-center mb-8">
        <Button
          onClick={addPerson}
          variant="outline-primary"
          className="rounded-pill add-person-button"
        >
          + Weitere Antragstellende Person hinzufügen
        </Button>
      </div>
    </div>
  );
};

export default Step1_PersonalInfo; 