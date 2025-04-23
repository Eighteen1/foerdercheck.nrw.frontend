import React, { useState } from 'react';
import { Form, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';

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
  persons: Person[];
}

interface Step1Props {
  formData: Step1Data;
  updateFormData: (data: Step1Data) => void;
}

const Step1_PersonalInfo: React.FC<Step1Props> = ({ formData, updateFormData }) => {
  const [expandedEmploymentSection, setExpandedEmploymentSection] = useState<string | null>(null);

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
    updateFormData({ persons: updatedPersons });
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
    updateFormData({ persons: updatedPersons });
  };

  const toggleEmploymentSection = (section: string) => {
    setExpandedEmploymentSection(expandedEmploymentSection === section ? null : section);
  };

  const addPerson = () => {
    updateFormData({
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
    });
  };

  const renderTooltip = (text: string) => (
    <Tooltip id="button-tooltip">
      {text}
    </Tooltip>
  );

  const renderPersonForm = (person: Person, index: number) => (
    <div key={index} className="mb-5">
      <h3 className="mb-4">
        {index === 0 ? "Antragstellende Person 1" : `Antragstellende Person ${index + 1}`}
      </h3>

      <div className="mb-4">
        <div className="d-flex align-items-center gap-2 mb-2">
          <h4 className="mb-0">Angaben zur Person</h4>
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
              <Form.Control
                type="text"
                placeholder="Staatsangehörigkeit"
                value={person.nationality}
                onChange={(e) => handlePersonChange(index, 'nationality', e.target.value)}
              />
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
        <div className="d-flex align-items-center gap-2 mb-2">
          <h4 className="mb-0">Aktuelle Adresse</h4>
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
        <div className="d-flex align-items-center gap-2 mb-2">
          <h4 className="mb-0">Kontakt</h4>
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
        <div className="d-flex align-items-center gap-2 mb-2">
          <h4 className="mb-0">Beruf</h4>
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
              <div className="mt-3">
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
                  label="Rentnerinnen und Rentner"
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
              <div className="mt-3">
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Bitte beschreiben Sie Ihre selbständige Tätigkeit"
                  value={person.employment.details}
                  onChange={(e) => handleEmploymentDetailChange(index, e.target.value)}
                />
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
              <div className="mt-3">
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Bitte beschreiben Sie Ihre Situation"
                  value={person.employment.details}
                  onChange={(e) => handleEmploymentDetailChange(index, e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {formData.persons.map((person, index) => renderPersonForm(person, index))}
      
      {/* Add Person Button */}
      <div className="text-center mb-4">
        <Button
          onClick={addPerson}
          variant="outline-primary"
          className="rounded-circle"
          style={{
            width: '40px',
            height: '40px',
            fontSize: '24px',
            padding: '0',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          +
        </Button>
      </div>
    </div>
  );
};

export default Step1_PersonalInfo; 