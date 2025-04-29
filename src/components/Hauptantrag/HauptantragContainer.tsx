import React, { useState } from 'react';
import { Container, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Step1_PersonalInfo from './Steps/Step1_PersonalInfo';
import Step2_HouseholdInfo from './Steps/Step2_HouseholdInfo';
import Step3_Objektdetails from './Steps/Step3_Objektdetails';
import Step4_Eigentumsverhaeltnisse from './Steps/Step4_Eigentumsverhaeltnisse';
import Step5_Kostenaufstellung from './Steps/Step5_Kostenaufstellung';
import Step6_Finanzierungsmittel from './Steps/Step6_Finanzierungsmittel';
// Import other steps as they are created

interface FormData {
  step1: {
    representative: {
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
    };
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
    isDisabled: boolean | null;
    isMarried: boolean | null;
    hasAdditionalAssets: boolean | null;
    hasDoubleSubsidy: boolean | null;
    childrenAges: string;
    disabledAdultsCount: string;
    disabledChildrenCount: string;
    additionalAssetsDetails: string;
    hasRepaidSubsidy: boolean | null;
    subsidyAmount: string;
    subsidyFileNumber: string;
    subsidyAuthority: string;
    hasSupplementaryLoan: boolean | null;
  };
  step3: {
    address: {
      street: string;
      houseNumber: string;
      postalCode: string;
      city: string;
    };
    foerderVariante: string;
    objektDetailsAllgemein: {
      wohnflaecheSelbstgenutzt: string;
      gesamtWohnflaeche: string;
      anzahlZimmer: string;
      anzahlGaragen: string;
      gewerbeflaeche: {
        hasGewerbeflaeche: boolean | null;
        flaeche: string;
      };
      ertraege: {
        hasErtraege: boolean | null;
        vermieteteWohnung: string;
        vermieteteGarage: string;
      };
      barrierefrei: boolean | null;
      begEffizienzhaus40Standard: boolean | null;
    };
    objektDetailsEigentumswohnung: {
      anzahlVollgeschosse: string;
      wohnungenAmHauseingang: string;
      lageImGebaeude: string;
      lageImGeschoss: string;
    };
    objektDetailsNeubauErsterwerb: {
      baugenehmigungErforderlich: boolean | null;
      baugenehmigung: {
        wurdeBeantragt: boolean | null;
        wurdeErteilt: boolean | null;
        erteilungsDatum: string;
        aktenzeichen: string;
        erteilungsBehoerde: string;
      };
      bauanzeige: {
        einreichungsDatum: string;
      };
      bauarbeiten: {
        wurdeBegonnen: boolean | null;
        beginnDatum: string;
      };
    };
    objektDetailsBestandserwerb: {
      baujahr: string;
    };
  };
  step4: {
    eigentumsverhaeltnis: string;
    kaufvertrag: {
      wirdAbgeschlossen: boolean | null;
      wurdeAbgeschlossen: boolean | null;
      abschlussDatum: string;
    };
    erbbaurecht: boolean | null;
    restlaufzeitErbbaurecht: string;
    grundbuch: {
      type: string;
      amtsgericht: string;
      ortGrundbuch: string;
      gemarkung: string;
      blatt: string;
      flur: string;
      flurstueck: string;
      flurstueckNeu: string;
      grundstuecksgroesse: string;
    };
    baulasten: {
      vorhanden: boolean | null;
      art: string;
    };
    altlasten: {
      vorhanden: boolean | null;
      art: string;
    };
  };
  step5: {
    baugrundstuck: {
      kaufpreis: string;
      wert: string;
      erschliessungskosten: string;
      standortbedingteMehrkosten: string;
    };
    kaufpreis: {
      kaufpreis: string;
    };
    baukosten: {
      kostenGebaeude: string;
      besondereBauausfuhrung: string;
      wertVorhandenerGebaude: string;
      kostenAussenanlagen: string;
      kostenArchitekt: string;
    };
    nebenkosten: {
      erwerbsnebenkosten: string;
      verwaltungsleistungen: string;
      beschaffungDauerfinanzierung: string;
      beschaffungZwischenfinanzierung: string;
      sonstigeNebenkosten: string;
      zusatzlicheKosten: string;
    };
    gesamtkosten: string;
  };
  step6: {
    fremddarlehen: Array<{
      id: string;
      darlehenGeber: string;
      nennbetrag: string;
      zinssatz: string;
      auszahlung: string;
      tilgung: string;
    }>;
    darlehenNRWBank: {
      grunddarlehen: {
        nennbetrag: string;
        tilgungsnachlass: string;
      };
      zusatzdarlehen: {
        familienbonus: {
          nennbetrag: string;
          tilgungsnachlass: string;
        };
        barrierefreiheit: {
          nennbetrag: string;
          tilgungsnachlass: string;
        };
        bauenMitHolz: {
          nennbetrag: string;
          tilgungsnachlass: string;
        };
        standortbedingteMehrkosten: {
          nennbetrag: string;
          tilgungsnachlass: string;
        };
        begEffizienzhaus40Standard: {
          nennbetrag: string;
          tilgungsnachlass: string;
        };
      };
      summeNennbetrag: string;
      summeTilgungsnachlass: string;
    };
    ergaenzungsdarlehen: {
      nennbetrag: string;
    };
    eigenleistung: {
      eigeneGeldmittel: string;
      zuschüsse: string;
      selbsthilfe: string;
      wertVorhandenerGebaeudeteile: string;
      wertBaugrundstück: string;
      summeEigenleistung: string;
    };
    gesamtbetraege: string;
  };
  // Add other step interfaces as we create them
}

const HauptantragContainer: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    step1: {
      representative: {
        hasRepresentative: null,
        isCompany: null,
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
      },
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
      isDisabled: null,
      isMarried: null,
      hasAdditionalAssets: null,
      hasDoubleSubsidy: null,
      childrenAges: '',
      disabledAdultsCount: '',
      disabledChildrenCount: '',
      additionalAssetsDetails: '',
      hasRepaidSubsidy: null,
      subsidyAmount: '',
      subsidyFileNumber: '',
      subsidyAuthority: '',
      hasSupplementaryLoan: null
    },
    step3: {
      address: {
        street: '',
        houseNumber: '',
        postalCode: '',
        city: ''
      },
      foerderVariante: '',
      objektDetailsAllgemein: {
        wohnflaecheSelbstgenutzt: '',
        gesamtWohnflaeche: '',
        anzahlZimmer: '',
        anzahlGaragen: '',
        gewerbeflaeche: {
          hasGewerbeflaeche: null,
          flaeche: ''
        },
        ertraege: {
          hasErtraege: null,
          vermieteteWohnung: '',
          vermieteteGarage: ''
        },
        barrierefrei: null,
        begEffizienzhaus40Standard: null
      },
      objektDetailsEigentumswohnung: {
        anzahlVollgeschosse: '',
        wohnungenAmHauseingang: '',
        lageImGebaeude: '',
        lageImGeschoss: ''
      },
      objektDetailsNeubauErsterwerb: {
        baugenehmigungErforderlich: null,
        baugenehmigung: {
          wurdeBeantragt: null,
          wurdeErteilt: null,
          erteilungsDatum: '',
          aktenzeichen: '',
          erteilungsBehoerde: ''
        },
        bauanzeige: {
          einreichungsDatum: ''
        },
        bauarbeiten: {
          wurdeBegonnen: null,
          beginnDatum: ''
        }
      },
      objektDetailsBestandserwerb: {
        baujahr: ''
      }
    },
    step4: {
      eigentumsverhaeltnis: '',
      kaufvertrag: {
        wirdAbgeschlossen: null,
        wurdeAbgeschlossen: null,
        abschlussDatum: '',
      },
      erbbaurecht: null,
      restlaufzeitErbbaurecht: '',
      grundbuch: {
        type: '',
        amtsgericht: '',
        ortGrundbuch: '',
        gemarkung: '',
        blatt: '',
        flur: '',
        flurstueck: '',
        flurstueckNeu: '',
        grundstuecksgroesse: '',
      },
      baulasten: {
        vorhanden: null,
        art: '',
      },
      altlasten: {
        vorhanden: null,
        art: '',
      },
    },
    step5: {
      baugrundstuck: {
        kaufpreis: '',
        wert: '',
        erschliessungskosten: '',
        standortbedingteMehrkosten: ''
      },
      kaufpreis: {
        kaufpreis: ''
      },
      baukosten: {
        kostenGebaeude: '',
        besondereBauausfuhrung: '',
        wertVorhandenerGebaude: '',
        kostenAussenanlagen: '',
        kostenArchitekt: ''
      },
      nebenkosten: {
        erwerbsnebenkosten: '',
        verwaltungsleistungen: '',
        beschaffungDauerfinanzierung: '',
        beschaffungZwischenfinanzierung: '',
        sonstigeNebenkosten: '',
        zusatzlicheKosten: ''
      },
      gesamtkosten: ''
    },
    step6: {
      fremddarlehen: [{
        id: '1',
        darlehenGeber: '',
        nennbetrag: '',
        zinssatz: '',
        auszahlung: '',
        tilgung: ''
      }],
      darlehenNRWBank: {
        grunddarlehen: {
          nennbetrag: '',
          tilgungsnachlass: ''
        },
        zusatzdarlehen: {
          familienbonus: {
            nennbetrag: '',
            tilgungsnachlass: ''
          },
          barrierefreiheit: {
            nennbetrag: '',
            tilgungsnachlass: ''
          },
          bauenMitHolz: {
            nennbetrag: '',
            tilgungsnachlass: ''
          },
          standortbedingteMehrkosten: {
            nennbetrag: '',
            tilgungsnachlass: ''
          },
          begEffizienzhaus40Standard: {
            nennbetrag: '',
            tilgungsnachlass: ''
          }
        },
        summeNennbetrag: '',
        summeTilgungsnachlass: ''
      },
      ergaenzungsdarlehen: {
        nennbetrag: ''
      },
      eigenleistung: {
        eigeneGeldmittel: '',
        zuschüsse: '',
        selbsthilfe: '',
        wertVorhandenerGebaeudeteile: '',
        wertBaugrundstück: '',
        summeEigenleistung: ''
      },
      gesamtbetraege: ''
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
    if (formData.step2.isDisabled === null) errors.push('Bitte geben Sie an, ob Personen schwerbehindert sind');
    if (formData.step2.isMarried === null) errors.push('Bitte geben Sie an, ob Sie verheiratet sind');
    if (formData.step2.hasAdditionalAssets === null) errors.push('Bitte geben Sie an, ob weiteres Vermögen vorhanden ist');
    if (formData.step2.hasDoubleSubsidy === null) errors.push('Bitte geben Sie an, ob eine Doppelförderung vorliegt');
    
    // Conditional validation for Step 2
    if (formData.step2.isDisabled === true) {
      if (!formData.step2.disabledAdultsCount) errors.push('Anzahl schwerbehinderter Erwachsener ist erforderlich');
      if (!formData.step2.disabledChildrenCount) errors.push('Anzahl schwerbehinderter Kinder ist erforderlich');
    }
    if (formData.step2.hasAdditionalAssets === true && !formData.step2.additionalAssetsDetails) {
      errors.push('Bitte beschreiben Sie das weitere Vermögen');
    }
    if (formData.step2.hasDoubleSubsidy === true) {
      if (formData.step2.hasRepaidSubsidy === null) errors.push('Bitte geben Sie an, ob die Fördermittel zurückgezahlt wurden');
      if (!formData.step2.subsidyAmount) errors.push('Betrag der Fördermittel ist erforderlich');
      if (!formData.step2.subsidyFileNumber) errors.push('Aktenzeichen ist erforderlich');
      if (!formData.step2.subsidyAuthority) errors.push('Bewilligungsbehörde ist erforderlich');
    }
    if (formData.step2.hasSupplementaryLoan === null) errors.push('Bitte geben Sie an, ob ein Ergänzungsdarlehen beantragt wird');

    // Validate Step 3
    if (!formData.step3.foerderVariante) errors.push('Fördervariante ist erforderlich');
    if (formData.step3.objektDetailsAllgemein.barrierefrei === null) errors.push('Bitte geben Sie an, ob das Objekt barrierefrei ist');
    if (formData.step3.objektDetailsAllgemein.begEffizienzhaus40Standard === null) errors.push('Bitte geben Sie an, ob der BEG Effizienzhaus 40 Standard erfüllt wird');
    
    // Conditional validation for Step 3
    if (formData.step3.objektDetailsAllgemein.gewerbeflaeche.hasGewerbeflaeche === null) {
      errors.push('Bitte geben Sie an, ob Gewerbefläche vorhanden ist');
    } else if (formData.step3.objektDetailsAllgemein.gewerbeflaeche.hasGewerbeflaeche === true && !formData.step3.objektDetailsAllgemein.gewerbeflaeche.flaeche) {
      errors.push('Bitte geben Sie die Größe der Gewerbefläche an');
    }
    
    if (formData.step3.objektDetailsAllgemein.ertraege.hasErtraege === null) {
      errors.push('Bitte geben Sie an, ob Einnahmen vorhanden sind');
    } else if (formData.step3.objektDetailsAllgemein.ertraege.hasErtraege === true) {
      if (!formData.step3.objektDetailsAllgemein.ertraege.vermieteteWohnung) errors.push('Bitte geben Sie die vermietete Wohnfläche an');
      if (!formData.step3.objektDetailsAllgemein.ertraege.vermieteteGarage) errors.push('Bitte geben Sie die vermietete Garage an');
    }

    // Validate Step 4
    if (!formData.step4.eigentumsverhaeltnis) errors.push('Eigentumsverhältnis ist erforderlich');
    if (formData.step4.erbbaurecht === null) errors.push('Bitte geben Sie an, ob Erbbaurecht vorhanden ist');
    if (formData.step4.baulasten.vorhanden === null) errors.push('Bitte geben Sie an, ob Baulasten vorhanden sind');
    if (formData.step4.altlasten.vorhanden === null) errors.push('Bitte geben Sie an, ob Altlasten vorhanden sind');
    
    // Conditional validation for Step 4
    if (formData.step4.baulasten.vorhanden === true && !formData.step4.baulasten.art) {
      errors.push('Bitte beschreiben Sie die Art der Baulasten');
    }
    if (formData.step4.altlasten.vorhanden === true && !formData.step4.altlasten.art) {
      errors.push('Bitte beschreiben Sie die Art der Altlasten');
    }

    if (errors.length > 0) {
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
      case 3:
        return (
          <Step3_Objektdetails
            formData={formData.step3}
            updateFormData={(data) => updateFormData('step3', data)}
          />
        );
      case 4:
        return (
          <Step4_Eigentumsverhaeltnisse
            formData={formData.step4}
            updateFormData={(data) => updateFormData('step4', data)}
          />
        );
      case 5:
        return (
          <Step5_Kostenaufstellung
            formData={formData.step5}
            updateFormData={(data) => updateFormData('step5', data)}
            foerderVariante={formData.step3.foerderVariante}
          />
        );
      case 6:
        return (
          <Step6_Finanzierungsmittel
            formData={formData.step6}
            updateFormData={(data) => updateFormData('step6', data)}
            foerderVariante={formData.step3.foerderVariante}
            gesamtkosten={formData.step5.gesamtkosten}
            childCount={formData.step2.childCount}
            barrierefrei={formData.step3.objektDetailsAllgemein.barrierefrei}
            begEffizienzhaus40Standard={formData.step3.objektDetailsAllgemein.begEffizienzhaus40Standard}
            hasSupplementaryLoan={formData.step2.hasSupplementaryLoan}
          />
        );
      default:
        return <div>Step not implemented yet</div>;
    }
  };

  const getStepTitle = (step: number) => {
    switch (step) {
      case 1:
        return "Persönliche Angaben zu den Antragstellern";
      case 2:
        return "Persönliche Verhältnisse";
      case 3:
        return "Objektdetails";
      case 4:
        return "Eigentumsverhältnisse";
      case 5:
        return "Kostenaufstellung";
      case 6:
        return "Aufstellung der Finanzierungsmittel";
      default:
        return "";
    }
  };

  return (
    <div className="relative min-h-screen bg-white">
      {/* Header ellipse */}
      <div className="absolute top-[-170px] left-[-25%] w-[70%] h-[300px] bg-[#064497] rounded-[50%]"></div>
      
      {/* Main heading */}
      <div className="absolute top-12 start-9">
        <h1 className="display-6 fw-regular text-[#ffffff] mb-2 font-['Roboto']">
          Hauptantrag
        </h1>
      </div>

      <Container className="pt-32">
        {/* Step title */}
        <div className="text-center mb-8">
          <h3 className="text-1xl font-regular text-gray-800">
            {getStepTitle(currentStep)}
          </h3>
        </div>

        {/* Progress indicators */}
        <div className="d-flex justify-content-center mb-5">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div 
              key={i} 
              className="d-flex flex-column align-items-center mx-2"
              onClick={() => setCurrentStep(i + 1)}
              style={{ cursor: 'pointer' }}
            >
              <div
                className={`w-16 h-3 rounded-full transition-all duration-300 ${
                  i + 1 <= currentStep 
                    ? 'bg-[#064497] shadow-md' 
                    : 'bg-[#D7DAEA] shadow-inner'
                }`}
                style={{
                  boxShadow: i + 1 <= currentStep 
                    ? '0 4px 6px rgba(0, 0, 0, 0.1)' 
                    : 'inset 0 2px 4px rgba(0, 0, 0, 0.1)'
                }}
              />
              {i + 1 === currentStep && (
                <span className="mt-2 text-sm font-medium text-gray-600">
                  Schritt {i + 1}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        {renderStep()}

        {/* Navigation buttons */}
        <div className="d-flex flex-column align-items-center gap-3 mt-5">
          <div className="d-flex gap-3">
            <Button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              style={{ backgroundColor: currentStep === 1 ? '#D7DAEA' : '#064497', border: 'none' }}
            >
              ZURÜCK
            </Button>

            <Button
              onClick={handleNext}
              style={{ backgroundColor: '#064497', border: 'none' }}
            >
              {currentStep === totalSteps ? 'PRÜFEN' : 'WEITER'}
            </Button>
          </div>

          <Button
            variant="link"
            onClick={handleSave}
            className="text-decoration-underline mb-5 mt-3"
            style={{ color: 'black' }}
          >
            Speichern und später fortsetzen
          </Button>
        </div>
      </Container>
    </div>
  );
};

export default HauptantragContainer; 