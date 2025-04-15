import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, OverlayTrigger, Tooltip, Modal } from "react-bootstrap";
import { useNavigate, useBeforeUnload } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface DocumentCheckState {
  propertyType: string;
  answers: {
    hasInheritanceRight: boolean;
    hasLocationCostLoan: boolean;
    hasWoodConstructionLoan: boolean;
    hasBEGStandardLoan: boolean;
    isPregnant: boolean;
    isMarried: boolean;
    isDisabled: boolean;
    hasAuthorizedPerson: boolean;
  };
}

const DocumentCheck: React.FC = () => {
  const navigate = useNavigate();
  const { email } = useAuth();
  const [propertyType, setPropertyType] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [initialState, setInitialState] = useState<DocumentCheckState | null>(null);

  // State for yes/no questions
  const [answers, setAnswers] = useState({
    hasInheritanceRight: false,
    hasLocationCostLoan: false,
    hasWoodConstructionLoan: false,
    hasBEGStandardLoan: false,
    isPregnant: false,
    isMarried: false,
    isDisabled: false,
    hasAuthorizedPerson: false,
  });

  // Load saved state on component mount
  useEffect(() => {
    const loadSavedState = async () => {
      const token = localStorage.getItem('token');
      console.log('Attempting to load saved state:', {
        email,
        hasToken: !!token
      });

      if (!token || !email) {
        console.error('No authentication token or email found');
        return;
      }

      try {
        const response = await fetch('http://localhost:8000/api/document-check/load', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const savedState = await response.json();
          console.log('Successfully loaded saved state:', savedState);
          setPropertyType(savedState.propertyType);
          setAnswers(savedState.answers);
          setInitialState({
            propertyType: savedState.propertyType,
            answers: savedState.answers
          });
        } else {
          const errorData = await response.json();
          console.error('Error loading saved state:', errorData);
        }
      } catch (error) {
        console.error('Error loading saved state:', error);
      }
    };

    loadSavedState();
  }, [email]); // Only reload when email changes

  // Track changes by comparing current state with initial state
  useEffect(() => {
    if (initialState) {
      const currentState: DocumentCheckState = {
        propertyType,
        answers
      };

      const hasChanges = 
        propertyType !== initialState.propertyType ||
        Object.keys(answers).some(key => 
          answers[key as keyof typeof answers] !== initialState.answers[key as keyof typeof answers]
        );

      setHasUnsavedChanges(hasChanges);
    } else {
      // If there's no initial state but we have some values, consider it as unsaved changes
      const hasValues = 
        propertyType !== '' ||
        Object.values(answers).some(value => value === true);
      
      setHasUnsavedChanges(hasValues);
    }
  }, [propertyType, answers, initialState]);

  // Browser navigation protection
  useBeforeUnload(
    React.useCallback(
      (event) => {
        if (hasUnsavedChanges) {
          event.preventDefault();
          return event.returnValue = "Sie haben ungespeicherte Änderungen. Möchten Sie die Seite wirklich verlassen?";
        }
      },
      [hasUnsavedChanges]
    )
  );

  const handleNavigation = (path: string) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(path);
      setShowLeaveConfirmation(true);
    } else {
      navigate(path);
    }
  };

  const handleConfirmNavigation = () => {
    setShowLeaveConfirmation(false);
    if (pendingNavigation) {
      navigate(pendingNavigation);
    }
  };

  const handleAnswerChange = (field: keyof typeof answers) => {
    setAnswers(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleCheck = async () => {
    // Save the form before proceeding with the check
    await handleSave();
    // Additional check logic here
    console.log('Form checked:', { propertyType, answers });
  };

  const handleSave = async () => {
    const token = localStorage.getItem('token');
    console.log('Attempting to save document check state:', {
      email,
      hasToken: !!token,
      propertyType,
      answers
    });

    if (!token) {
      console.error('No authentication token found');
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/document-check/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          propertyType,
          answers
        })
      });

      if (response.ok) {
        console.log('Successfully saved document check state');
        // Update initial state to match current state
        setInitialState({
          propertyType,
          answers
        });
        setHasUnsavedChanges(false);
      } else {
        const errorData = await response.json();
        console.error('Error saving form:', errorData);
      }
    } catch (error) {
      console.error('Error saving form:', error);
    }
  };

  const renderTooltip = (text: string) => (
    <Tooltip id="button-tooltip">
      {text}
    </Tooltip>
  );

  // Add this at the component level, before the return statement
  const LeaveConfirmationDialog = () => (
    <Modal show={showLeaveConfirmation} onHide={() => setShowLeaveConfirmation(false)}>
      <Modal.Header closeButton>
        <Modal.Title>Ungespeicherte Änderungen</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        Sie haben ungespeicherte Änderungen. Möchten Sie die Seite wirklich verlassen?
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setShowLeaveConfirmation(false)}>
          Abbrechen
        </Button>
        <Button variant="primary" onClick={handleConfirmNavigation}>
          Verlassen
        </Button>
      </Modal.Footer>
    </Modal>
  );

  return (
    <div className="relative min-h-screen bg-white">
      <LeaveConfirmationDialog />
      <Container className="pt-16">
        <div className="text-center">
          <h2 className="text-[#064497] text-3xl mb-4">Ermittlung der benötigten Dokumente</h2>
          <p className="mb-5">
            Dieser kurze Fragebogen hilft uns dabei zu ermitteln, welche Dokumente wir von Ihnen für Ihren Förderantrag benötigen.
          </p>
        </div>

        <style>
          {`
            .form-check-input:checked {
              background-color: #064497 !important;
              border-color: #064497 !important;
            }
            .question-divider {
              border-bottom: 1px solid #E5E7EB;
              margin: 1rem 0;
              width: 100%;
            }
          `}
        </style>

        <div className="mb-5">
          <div className="d-flex align-items-center gap-4 mb-3">
            <h3 className="mb-0 text-[#000000] font-semibold italic">Bitte kreuzen Sie die Option an, die auf Sie zutrifft</h3>
            <OverlayTrigger
              placement="right"
              overlay={renderTooltip("Wählen Sie die zutreffende Option für Ihre Immobilie")}
            >
              <Button 
                variant="outline-secondary"
                className="rounded-circle p-0 d-flex align-items-center justify-content-center font-semibold"
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

          <Row className="g-3">
            {[
              { id: 'neubau', label: 'Neubau Eigenheim' },
              { id: 'ersterwerb-eigenheim', label: 'Ersterwerb Eigenheim' },
              { id: 'bestandserwerb-eigenheim', label: 'Bestandserwerb Eigenheim' },
              { id: 'bestandserwerb-wohnung', label: 'Bestandserwerb Eigentumswohnung' },
              { id: 'ersterwerb-wohnung', label: 'Ersterwerb Eigentumswohnung' },
              { id: 'nutzungsaenderung', label: 'Nutzungsänderung' }
            ].map((option) => (
              <Col md={4} key={option.id}>
                <Form.Check
                  type="checkbox"
                  id={option.id}
                  label={option.label}
                  checked={propertyType === option.id}
                  onChange={() => setPropertyType(option.id)}
                  className="custom-checkbox"
                />
              </Col>
            ))}
          </Row>
        </div>

        <div className="mb-5">
          <h3 className="mb-4 text-[#000000] font-semibold italic">Bitte wählen Sie "Ja" oder "Nein" aus</h3>
          
          {[
            {
              id: 'hasInheritanceRight',
              label: 'Verfügen die Antragstellenden über ein Erbbaurecht?',
              tooltip: 'Information über Erbbaurecht'
            },
            {
              id: 'hasLocationCostLoan',
              label: 'Wird ein Zusatzdarlehen für standortbedingte Mehrkosten beantragt?',
              tooltip: 'Information über Zusatzdarlehen für Standortkosten'
            },
            {
              id: 'hasWoodConstructionLoan',
              label: 'Wird ein Zusatzdarlehen für Bauen mit Holz beantragt?',
              tooltip: 'Information über Holzbau-Zusatzdarlehen'
            },
            {
              id: 'hasBEGStandardLoan',
              label: 'Wird ein Zusatzdarlehen für die Erfüllung des BEG-Effizienzhaus-40-Standards beantragt?',
              tooltip: 'Information über BEG-Standard'
            },
            {
              id: 'isPregnant',
              label: 'Befindet sich eine der Antragstellenden Personen in der Schwangerschaft?',
              tooltip: 'Information über Schwangerschaft'
            },
            {
              id: 'isMarried',
              label: 'Sind die Antragstellenden verheiratet/leben in einer eingetragenen Lebenspartnerschaft?',
              tooltip: 'Information über Familienstand'
            },
            {
              id: 'isDisabled',
              label: 'Ist eine Person in Ihrem Haushalt schwerbehindert?',
              tooltip: 'Information über Schwerbehinderung'
            },
            {
              id: 'hasAuthorizedPerson',
              label: 'Wird der Antrag durch eine bevollmächtigte Person gestellt?',
              tooltip: 'Information über Bevollmächtigung'
            }
          ].map((question, index, array) => (
            <div key={question.id}>
              <div className="mb-3 d-flex align-items-center">
                <div className="flex-grow-1">
                  <Form.Label className="d-flex align-items-center gap-2">
                    {question.label}
                    <OverlayTrigger
                      placement="right"
                      overlay={renderTooltip(question.tooltip)}
                    >
                      <Button 
                        variant="outline-secondary"
                        className="rounded-circle p-0 d-flex align-items-center justify-content-center font-semibold"
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
                    name={question.id}
                    checked={answers[question.id as keyof typeof answers]}
                    onChange={() => handleAnswerChange(question.id as keyof typeof answers)}
                    className="custom-radio"
                  />
                  <Form.Check
                    inline
                    type="radio"
                    label="Nein"
                    name={question.id}
                    checked={!answers[question.id as keyof typeof answers]}
                    onChange={() => handleAnswerChange(question.id as keyof typeof answers)}
                    className="custom-radio"
                  />
                </div>
              </div>
              {index < array.length - 1 && <div className="question-divider" />}
            </div>
          ))}
        </div>

        <div className="text-center">
          <Button 
            onClick={handleCheck}
            className="px-5 py-2 mb-3"
            style={{ backgroundColor: '#064497', border: 'none' }}
          >
            PRÜFEN
          </Button>
          
          <div className="mb-5 pb-4">
            <Button
              variant="link"
              onClick={handleSave}
              className="text-decoration-underline"
              style={{ color: 'black' }}
            >
              Speichern und später fortsetzen
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default DocumentCheck;
