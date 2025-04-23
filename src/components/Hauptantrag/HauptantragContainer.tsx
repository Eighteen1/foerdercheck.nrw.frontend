import React, { useState } from 'react';
import { Container, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Step1_PersonalInfo from './Steps/Step1_PersonalInfo';
import Step2_HouseholdInfo from './Steps/Step2_HouseholdInfo';
// Import other steps as they are created

interface FormData {
  step1: {
    persons: Array<{
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
    }>;
  };
  step2: {
    adultCount: string;
    childCount: string;
    isDisabled: boolean;
    isMarried: boolean;
    hasAdditionalAssets: boolean;
    hasDoubleSubsidy: boolean;
  };
  // Add other step interfaces as we create them
}

const HauptantragContainer: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    step1: {
      persons: [{
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
      }]
    },
    step2: {
      adultCount: '',
      childCount: '',
      isDisabled: false,
      isMarried: false,
      hasAdditionalAssets: false,
      hasDoubleSubsidy: false
    }
  });

  const totalSteps = 6;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    } else {
      // On last step, validate the entire form
      validateForm();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSave = () => {
    // Save progress to local storage or database
    localStorage.setItem('hauptantragFormData', JSON.stringify(formData));
  };

  const updateFormData = (stepKey: keyof FormData, data: any) => {
    setFormData(prev => ({
      ...prev,
      [stepKey]: data
    }));
  };

  const validateForm = () => {
    // Implement form validation logic here
    // This will be expanded as we add more steps
    const errors: string[] = [];

    // Validate Step 1
    formData.step1.persons.forEach((person, index) => {
      if (!person.firstName) errors.push(`Person ${index + 1}: Vorname ist erforderlich`);
      if (!person.lastName) errors.push(`Person ${index + 1}: Name ist erforderlich`);
      if (!person.birthDate) errors.push(`Person ${index + 1}: Geburtsdatum ist erforderlich`);
      if (!person.nationality) errors.push(`Person ${index + 1}: Staatsangehörigkeit ist erforderlich`);
      if (!person.street) errors.push(`Person ${index + 1}: Straße ist erforderlich`);
      if (!person.houseNumber) errors.push(`Person ${index + 1}: Hausnummer ist erforderlich`);
      if (!person.postalCode) errors.push(`Person ${index + 1}: Postleitzahl ist erforderlich`);
      if (!person.city) errors.push(`Person ${index + 1}: Ort ist erforderlich`);
      if (!person.phone) errors.push(`Person ${index + 1}: Telefonnummer ist erforderlich`);
      if (!person.email) errors.push(`Person ${index + 1}: E-Mail ist erforderlich`);
      if (!person.employment.type) errors.push(`Person ${index + 1}: Beschäftigungsart ist erforderlich`);
    });

    // Validate Step 2
    if (!formData.step2.adultCount) errors.push('Anzahl Erwachsene ist erforderlich');
    if (!formData.step2.childCount) errors.push('Anzahl Kinder ist erforderlich');

    if (errors.length > 0) {
      // Show errors to user (implement this based on your UI needs)
      alert('Bitte korrigieren Sie die folgenden Fehler:\n\n' + errors.join('\n'));
      return false;
    }

    return true;
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1_PersonalInfo
            formData={formData.step1}
            updateFormData={(data) => updateFormData('step1', data)}
          />
        );
      case 2:
        return (
          <Step2_HouseholdInfo
            formData={formData.step2}
            updateFormData={(data) => updateFormData('step2', data)}
          />
        );
      // Add other cases as we create more steps
      default:
        return <div>Step not implemented yet</div>;
    }
  };

  return (
    <div className="relative min-h-screen bg-white">
      {/* Header ellipse */}
      <div className="absolute top-[-170px] left-[-25%] w-[70%] h-[300px] bg-[#064497] rounded-[50%]"></div>
      
      {/* Main heading */}
      <div className="absolute top-12 start-9">
        <h1 className="display-6 fw-regular text-[#ffffff] mb-2 font-['Roboto']">
          Förderantrag Wohneigentum
        </h1>
      </div>

      <Container className="pt-32">
        {/* Progress indicators */}
        <div className="d-flex justify-content-center mb-5">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`mx-2 w-16 h-2 rounded ${
                i + 1 <= currentStep ? 'bg-[#064497]' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        {renderStep()}

        {/* Navigation buttons */}
        <div className="d-flex justify-content-between mt-5">
          <Button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            style={{ backgroundColor: currentStep === 1 ? '#D7DAEA' : '#064497', border: 'none' }}
          >
            ZURÜCK
          </Button>
          
          <Button
            onClick={handleSave}
            style={{ backgroundColor: '#D7DAEA', border: 'none', color: 'black' }}
          >
            Speichern und später fortsetzen
          </Button>

          <Button
            onClick={handleNext}
            style={{ backgroundColor: '#064497', border: 'none' }}
          >
            {currentStep === totalSteps ? 'PRÜFEN' : 'WEITER'}
          </Button>
        </div>
      </Container>
    </div>
  );
};

export default HauptantragContainer; 