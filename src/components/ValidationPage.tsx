import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ValidationService } from '../services/validationService';
import { ValidationSection, NavigationButton } from '../utils/validationHelpers';
import { Container, Row, Col, Button, Modal, Form, Spinner } from "react-bootstrap";
import { supabase, ensureUserFinancialsExists } from "../lib/supabase";
import postcodeMap from '../utils/postcode_map.json';
import { sendMessage, sendNewApplicationNotification } from '../utils/messages';
// Simple icon components since @heroicons/react might not be available
const ChevronDownIcon = ({ className }: { className?: string }) => <span className={className}>▼</span>;
const ChevronRightIcon = ({ className }: { className?: string }) => <span className={className}>▶</span>;
const CheckCircleIcon = ({ className }: { className?: string }) => <span className={className}>✓</span>;
const XCircleIcon = ({ className }: { className?: string }) => <span className={className}>✗</span>;
const ExclamationTriangleIcon = ({ className }: { className?: string }) => <span className={className}>⚠</span>;

interface ValidationResult {
  sections: ValidationSection[];
  overallSuccess: boolean;
  hasErrors: boolean;
  hasWarnings: boolean;
}

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const TYPE_LABELS: Record<string, string> = {
  "neubau": "Neubau Eigenheim",
  "ersterwerb-eigenheim": "Ersterwerb Eigenheim",
  "bestandserwerb-eigenheim": "Bestandserwerb Eigenheim",
  "bestandserwerb-wohnung": "Bestandserwerb Eigentumswohnung",
  "ersterwerb-wohnung": "Ersterwerb Eigentumswohnung",
  "neubau-wohnung": "Neubau Eigentumswohnung",
  "nutzungsaenderung": "Nutzungsänderung"
};

const ValidationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const residentId = searchParams.get('residentId') || user?.id;
  
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedForm, setExpandedForm] = useState<string | null>(null);
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);

  // Hand-in related state
  const [showHandInModal, setShowHandInModal] = useState(false);
  const [handInStep, setHandInStep] = useState<'city' | 'sign' | null>(null);
  const [cityInfo, setCityInfo] = useState<{ name: string; id: string } | null>(null);
  const [cityDropdown, setCityDropdown] = useState('');
  const [objectData, setObjectData] = useState<any>(null);
  const [foerderVariante, setFoerderVariante] = useState('');
  const [handInError, setHandInError] = useState<string | null>(null);
  const [handInLoading, setHandInLoading] = useState(false);

  useEffect(() => {
    if (residentId) {
      performValidation();
    }
  }, [residentId]);

  const performValidation = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!residentId) {
        throw new Error('Resident ID is required');
      }
      const validationService = new ValidationService(residentId);
      const sections = await validationService.performComprehensiveValidation();

      const hasErrors = sections.some(section => section.errors.length > 0);
      const hasWarnings = sections.some(section => section.warnings.length > 0);
      const overallSuccess = !hasErrors && !hasWarnings;

      setValidationResult({
        sections,
        overallSuccess,
        hasErrors,
        hasWarnings
      });
    } catch (err) {
      setError('Fehler beim Laden der Validierungsdaten');
      console.error('Validation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHandIn = async () => {
    setHandInStep('city');
    setHandInError(null);
    setHandInLoading(true);
    try {
      // Fetch latest object_data if not already loaded
      let obj = objectData;
      if (!obj && user?.id) {
        try {
          const { data: objData, error: objError } = await supabase
            .from('object_data')
            .select('obj_postal_code, foerderVariante')
            .eq('user_id', user.id)
            .single();
          
          if (!objError && objData) {
            obj = objData;
            setObjectData(objData);
            setFoerderVariante(objData?.foerderVariante || '');
          }
        } catch (fetchError) {
          console.warn('Failed to fetch object data:', fetchError);
          // Continue without object data - user can still select city manually
        }
      }
      const postcode = obj?.obj_postal_code;
      if (!postcode) {
        setCityInfo(null);
        setHandInStep('city');
        setHandInLoading(false);
        return;
      }
      const city = postcodeMap[postcode as keyof typeof postcodeMap];
      if (city) {
        setCityInfo(city);
        setCityDropdown(city.id);
      } else {
        setCityInfo(null);
        setCityDropdown('');
      }
      setHandInStep('city');
    } catch (e) {
      setHandInError('Fehler beim Laden der Objektadresse.');
    } finally {
      setHandInLoading(false);
    }
  };

  const handleSignAndSubmit = async () => {
    setHandInLoading(true);
    setHandInError(null);
    try {
      let cityId = cityInfo?.id || cityDropdown;
      let cityName = cityInfo?.name || (cityDropdown ? 'Rhein-Kreis Neuss' : '');
      if (!cityId) {
        setHandInError('Bitte wählen Sie einen Kreis/Stadt aus.');
        setHandInLoading(false);
        return;
      }
  
      // Get city settings to check assignment rules
      const { data: cityData, error: cityError } = await supabase
        .from('cities')
        .select('settings')
        .eq('id', cityId)
        .single();

      if (cityError) throw cityError;

      let assignedAgent = null;
      if (cityData?.settings?.assignmentRules) {
        const { filterType, rules } = cityData.settings.assignmentRules;

        try {
          // Get user data for household size and employment type
          const { data: userData, error: userError } = await supabase
            .from('user_data')
            .select('adult_count, child_count, employment')
            .eq('id', user?.id)
            .single();

          // Get object data for postcode
          const { data: objectData, error: objectError } = await supabase
            .from('object_data')
            .select('obj_postal_code')
            .eq('user_id', user?.id)
            .single();

          // Only proceed with assignment if we have the required data
          if (!userError && !objectError && userData && objectData) {
            // Determine assigned agent based on filter type
            switch (filterType) {
              case 'type':
                if (foerderVariante && rules[foerderVariante]) {
                  assignedAgent = rules[foerderVariante];
                }
                break;
              case 'postcode':
                if (objectData.obj_postal_code && rules[objectData.obj_postal_code]) {
                  assignedAgent = rules[objectData.obj_postal_code];
                }
                break;
              case 'household':
                const adultCount = userData.adult_count || 0;
                const childCount = userData.child_count || 0;
                
                // Format adult count
                const adultKey = adultCount >= 3 ? '3+' : adultCount.toString();
                // Format child count
                const childKey = childCount >= 3 ? '3+' : childCount.toString();
                
                // Create the rule key in format "adultCount_childCount"
                const ruleKey = `${adultKey}_${childKey}`;
                if (rules[ruleKey]) {
                  assignedAgent = rules[ruleKey];
                }
                break;
              case 'employment':
                if (userData.employment && rules[userData.employment]) {
                  assignedAgent = rules[userData.employment];
                }
                break;
            }
          }
          // If any error occurred or data is missing, assignedAgent remains null
          // This allows the application to be submitted without assignment
        } catch (assignmentError) {
          console.warn('Assignment logic failed, proceeding without assignment:', assignmentError);
          // Continue without assignment - assignedAgent remains null
        }
      }

      // Log assignment result for debugging
      if (!assignedAgent) {
        console.log('Application submitted without assignment due to missing data or assignment rules');
      }

      // Ensure user_financials table exists for the user
      if (user?.id) {
        try {
          await ensureUserFinancialsExists(user.id);
        } catch (financialsError) {
          console.warn('Failed to ensure user_financials exists, continuing with application submission:', financialsError);
          // Continue with application submission even if user_financials creation fails
        }
      }

      console.log('Attempting to insert application with data:', {
        resident_id: user?.id,
        city_id: cityId,
        type: foerderVariante,
        status: 'new',
        assigned_agent: assignedAgent
      });
  
      // Insert into applications
      const { data, error: appError } = await supabase
        .from('applications')
        .insert({
          resident_id: user?.id,
          city_id: cityId,
          type: foerderVariante,
          status: 'new',
          assigned_agent: assignedAgent
        })
        .select();
  
      if (appError) {
        console.error('Application insert error:', appError);
        throw appError;
      }
  
      console.log('Successfully inserted application:', data);
  
      // Note: application_status in user_data is now automatically updated by database trigger

      // Send notifications
      if (assignedAgent) {
        // Get assigned agent's settings
        const { data: assignedAgentData, error: assignedAgentError } = await supabase
          .from('agents')
          .select('name, email, settings')
          .eq('id', assignedAgent)
          .single();

        if (!assignedAgentError && assignedAgentData) {
          const formattedType = TYPE_LABELS[foerderVariante] || foerderVariante;
          const messageContent = `Ein neuer Antrag vom Typ "${formattedType}" (ID: ${data[0].id}) wurde Ihnen zugewiesen.`;

          // Send in-app message
          await sendMessage({
            recipient_id: assignedAgent,
            type: 'system',
            category: 'application_assigned',
            title: 'Neuer Antrag zugewiesen',
            content: messageContent,
            metadata: { application_id: data[0].id }
          });

          // Send email if enabled
          const shouldSendEmail = assignedAgentData.settings?.notifications?.emailNotifications?.applicationAssigned === true;
          if (shouldSendEmail) {
            try {
              // Get a system token
              const tokenResponse = await fetch(`${BACKEND_URL}/api/system/token`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                }
              });
              if (!tokenResponse.ok) {
                throw new Error('Failed to get system token');
              }
              const { token } = await tokenResponse.json();

              const response = await fetch(`${BACKEND_URL}/api/send-assignment-message`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  to_email: assignedAgentData.email,
                  to_name: assignedAgentData.name,
                  from_email: 'system@foerdercheck.nrw',
                  from_name: 'Fördercheck.NRW',
                  title: 'Neuer Antrag zugewiesen',
                  content: messageContent
                }),
              });

              if (!response.ok) {
                console.error('Failed to send assignment email notification');
              }
            } catch (error) {
              console.error('Error sending assignment email:', error);
            }
          }
        }
      }

      // Send notifications to other team members about new application
      await sendNewApplicationNotification(data[0].id, cityId, assignedAgent);
  
      // Close modal and show success message
      setShowHandInModal(false);
      setHandInStep(null);
      
      // Navigate back to PersonalSpace with success message
      window.opener?.postMessage({ 
        type: 'HAND_IN_SUCCESS', 
        applicationId: data[0].id 
      }, window.location.origin);
      window.close();
    } catch (e) {
      console.error('Full error object:', e);
      setHandInError('Fehler beim Einreichen des Antrags.');
    } finally {
      setHandInLoading(false);
    }
  };



  const toggleSection = (sectionId: string) => {
    if (!validationResult) return;

    setValidationResult({
      ...validationResult,
      sections: validationResult.sections.map(section =>
        section.id === sectionId
          ? { ...section, isExpanded: !section.isExpanded }
          : section
      )
    });
  };

  const toggleForm = (formType: string) => {
    const newExpandedForm = expandedForm === formType ? null : formType;
    setExpandedForm(newExpandedForm);
    
    // Reset person expansion when form is collapsed
    if (newExpandedForm === null) {
      setExpandedPerson(null);
    }
  };

  const handleNavigateToForm = (sectionId: string) => {
    // Handle step-based sections for Hauptantrag
    if (sectionId.startsWith('hauptantrag-step')) {
      const stepNumber = sectionId.split('-')[2];
      navigate(`/hauptantrag?step=${stepNumber}`);
      return;
    }

    // Handle other form types
    const formRoutes: Record<string, string> = {
      einkommenserklarung: '/einkommenserklaerung',
      selbstauskunft: '/selbstauskunft',
      selbsthilfe: '/selbsthilfe',
      din277: '/din277',
      wofiv: '/wofiv',
      documents: '/documents'
    };

    const route = formRoutes[sectionId];
    if (route) {
      navigate(route);
    }
  };

  const handleClose = () => {
    window.close();
  };

  const handleContinueToHandIn = () => {
    // Show hand-in modal directly in ValidationPage
    setShowHandInModal(true);
    setHandInStep('city');
    handleHandIn();
  };

  const getFormTitle = (formType: string): string => {
    const formTitles: Record<string, string> = {
      hauptantrag: 'Hauptantrag',
      einkommenserklarung: 'Einkommenserklärung',
      selbstauskunft: 'Selbstauskunft',
      selbsthilfe: 'Selbsthilfeleistungen Eigentumsmaßnahmen',
      din277: 'Berechnung des Brutto-Rauminhalts des Gebäudes nach DIN 277',
      wofiv: 'Berechnung der Wohn- und Nutzfläche nach WoFIV',
      documents: 'Vollständigkeit der Dokumente',
      financial: 'Finanzielle Anforderungen',
      cross: 'Übergreifende Prüfungen'
    };
    return formTitles[formType] || formType;
  };

  const getSuccessMessage = (formType: string, isSubSection: boolean = false): string => {
    if (formType === 'documents') {
      return 'Alle erforderlichen Dokumente wurden für diesen Abschnitt hochgeladen';
    }
    if (isSubSection) {
      return 'Dieser Abschnitt wurde korrekt ausgefüllt';
    }
    
    const customMessages: Record<string, string> = {
      documents: 'Alle erforderlichen Dokumente sind vollständig vorhanden',
      financial: 'Die finanziellen Anforderungen sind erfüllt',
      cross: 'Alle übergreifenden Prüfungen sind erfolgreich'
    };
    
    return customMessages[formType] || 'Dieses Formular wurde korrekt ausgefüllt';
  };

  // Helper function to render enhanced validation section content
  const renderEnhancedSectionContent = (section: ValidationSection) => {
    return (
      <div className="mt-4 pl-6 space-y-4">
        {/* Calculations */}
        {section.calculations && section.calculations.length > 0 && (
          <div className="bg-[#F2F6FF] rounded-lg p-4">
            <h4 className="text-sm font-semibold text-[#064497] mb-2">Berechnung:</h4>
            <div className="space-y-1">
              {section.calculations.map((calculation, index) => {
                // Apply different styling based on content
                let className = "text-sm font-roboto";
                let content = calculation;
                
                // Check if text is in ALL CAPS and is a section header (specific keywords)
                const sectionHeaderKeywords = [
                  'Prüfung der Tragbarkeit der Belastung',
                  'Verfügbares Monatseinkommen',
                  'Haushaltssumme',
                  'Summe der Haushalts-Einkommen ohne Freibeträge',
                  'Freibeträge (alle Haushaltsmitglieder)',
                  'Bereinigtes Haushalts-Einkommen',
                  'Einkommensberechnung der Haushaltsmitglieder',
                  'Haushaltsmitglieder ohne Einkommen',
                  'Grenzen für ihre Haushaltszusammensetzung',
                  'Haushaltszusammensetzung',
                  'Berechnetes Haushalts-Einkommen',
                  'Ermittlung der Grunddarlehensgrenze'
                ];
                
                const isSectionHeader = sectionHeaderKeywords.some(keyword => 
                  calculation === keyword
                );
                
                if (isSectionHeader) {
                  className += " font-bold text-[#064497] text-base border-b border-[#064497] pb-1 mb-2 mt-3";
                } else if (calculation.startsWith('-') && calculation.endsWith('-')) {
                  className += " font-semibold text-black-800 mt-3 mb-2";
                } else if (calculation.includes('✓')) {
                  className += " text-green-700 bg-green-50 p-3 rounded mt-3 shadow-inner";
                } else if (calculation.includes('✗')) {
                  className += " text-red-700 bg-red-50 p-3 rounded mt-3 shadow-inner";
                } else if (calculation.includes('Summe') || calculation.includes('Ergebnis') || calculation.includes('Verfügbares')) {
                  className += " font-semibold text-blue-900 bg-blue-100 p-2 rounded";
                }else if (calculation.includes('Bereinigtes Jahreseinkommen') || calculation.includes('Finales bereinigtes Haushaltseinkommen:') || calculation.includes('Brutto-Haushaltseinkommen') || calculation.includes('Mindestbedarf für')) {
                  className += " font-semibold text-white bg-[#064497] p-2 rounded";
                }else if (calculation.startsWith('xyz .-')) {
                  className += " text-[#4682B4] mt-1 mb-2 ml-3 italic";
                  content = calculation.replace('xyz .', '');
                } else if (calculation.startsWith('xyz .')) {
                  className += " text-[#2d2d2d] mt-1 mb-2 ml-3";
                  content = calculation.replace('xyz .', '');
                } else {
                  className += " text-[#2d2d2d] mt-1 mb-2";
                }

                return (
                  <div key={index} className={className}>
                    {content}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Success Messages */}
        {section.successMessages && section.successMessages.length > 0 && (
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-start">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5 mr-2" />
              <div>
                <h4 className="text-sm font-semibold text-green-800 mb-2">Erfolg:</h4>
                <ul className="space-y-1">
                  {section.successMessages.map((message, index) => (
                    <li key={index} className="text-sm text-green-700">
                      {message}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Show success message when no errors or warnings (especially for cross validation) */}
        {section.errors.length === 0 && section.warnings.length === 0 && !section.successMessages && (
          <div className="mb-4">
            <div className="flex items-center text-green-700">
              <CheckCircleIcon className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">
                {section.id === 'cross-checks' ? 'Keine Fehler gefunden' : 'Dieser Abschnitt wurde korrekt ausgefüllt'}
              </span>
            </div>
          </div>
        )}

        {/* Errors */}
        {section.errors.length > 0 && (
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-start">
              <XCircleIcon className="h-5 w-5 text-red-600 mt-0.5 mr-2" />
              <div>
                <h4 className="text-sm font-semibold text-red-800 mb-2">Fehler:</h4>
                <ul className="space-y-1">
                  {section.errors.map((error, index) => (
                    <li key={index} className="text-sm text-red-700 flex items-start">
                      <span className="mr-2">•</span>
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Warnings */}
        {section.warnings.length > 0 && (
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
              <div>
                <h4 className="text-sm font-semibold text-yellow-800 mb-2">Warnungen:</h4>
                <ul className="space-y-1">
                  {section.warnings.map((warning, index) => (
                    <li key={index} className="text-sm text-yellow-700 flex items-start">
                      <span className="mr-2">•</span>
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        {section.navigationButtons && section.navigationButtons.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">Navigation:</h4>
            <div className="flex flex-wrap gap-2">            
              {section.navigationButtons.map((button, index) => (
                <button
                  key={index}
                  onClick={() => navigate(button.action)}
                  className="btn btn-primary btn-sm"
                  style={{ backgroundColor: '#064497', border: 'none' }}
                    >
                  {button.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Validierung läuft...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircleIcon className="h-12 w-12 text-red-500 mx-auto" />
          <p className="mt-4 text-red-600">{error}</p>
          <button
            onClick={handleClose}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Schließen
          </button>
        </div>
      </div>
    );
  }

  if (!validationResult) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Prüfung Ihres Antrags</h1>
            <p className="text-gray-600 mt-3 mr-10">
              Überprüfung aller Formulare und Vollständigkeit der Dokumente. Hinweis: Wir sind gesetzlich verpflichtet,  <span className="font-bold">  die Einreichung aller Anträge zu ermöglichen – auch wenn diese Fehler enthalten. </span> Bitte beachten Sie: Ein fehlerfrei eingereichter Antrag stellt <span className="font-bold"> keine Garantie für eine Förderzusage dar. Die Entscheidung über Ihre Förderung trifft ausschließlich die zuständige Bewilligungsbehörde nach vollständiger Prüfung </span>. Dabei sind insbesondere die Richtigkeit Ihrer Angaben sowie die eingereichten Nachweise maßgeblich.
            </p>
          </div>

          {/* Overall Status */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {validationResult.overallSuccess ? (
                <div className="flex items-center text-green-600">
                  <CheckCircleIcon className="h-6 w-6 mr-2" />
                  <span className="font-semibold">Keine Fehler oder Warnungen gefunden</span>
                </div>
              ) : validationResult.hasErrors ? (
                <div className="flex items-center text-red-600">
                  <XCircleIcon className="h-6 w-6 mr-2" />
                  <span className="font-semibold">Fehler gefunden</span>
                </div>
              ) : (
                <div className="flex items-center text-yellow-600">
                  <ExclamationTriangleIcon className="h-6 w-6 mr-2" />
                  <span className="font-semibold">Keine Fehler gefunden. Bitte überprüfen Sie die Warnungen.</span>
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-4">
              <button
                onClick={handleClose}
                className="px-6 py-2 rounded focus:outline-none focus:ring-0 focus:ring-offset-0 shadow-md bg-[#D7DAEA] hover:bg-[#D7DAEA] text-black whitespace-nowrap"
                style={{ 
                  maxHeight: '40px', 
                  minHeight: '40px',
                  width: 'auto'
                }}
              >
                Schließen
              </button>
         
              <button
                onClick={handleContinueToHandIn}
                className="px-6 py-2 rounded focus:outline-none focus:ring-0 focus:ring-offset-0 shadow-md bg-[#064497] hover:bg-[#0965dc] text-white whitespace-nowrap"
                style={{ 
                  maxHeight: '40px', 
                  minHeight: '40px',
                  width: 'auto'
                }}
                >
                Antrag einreichen
              </button>
            </div>
          </div>
        </div>

        {/* Validation Sections */}
        <div className="space-y-6">
          {/* Group sections by form type */}
          {(() => {
            const groupedSections = validationResult.sections.reduce((groups, section) => {
              const formType = section.id.split('-')[0];
              if (!groups[formType]) {
                groups[formType] = [];
              }
              groups[formType].push(section);
              return groups;
            }, {} as Record<string, ValidationSection[]>);

            return Object.entries(groupedSections).map(([formType, sections]) => {
              const formTitle = getFormTitle(formType);
              const hasErrors = sections.some(s => s.errors.length > 0);
              const hasWarnings = sections.some(s => s.warnings.length > 0);
              const totalErrors = sections.reduce((sum, s) => sum + s.errors.length, 0);
              const totalWarnings = sections.reduce((sum, s) => sum + s.warnings.length, 0);
              const isExpanded = expandedForm === formType;
              const isSingleSection = sections.length === 1;
              
              // Check if this form has hierarchical structure (like Einkommenserklärung with persons)
              const isHierarchical = (formType === 'einkommenserklarung' || formType === 'selbstauskunft') && sections.some(s => s.title.includes(':'));
              
              // For hierarchical forms, group sections by person
              let hierarchicalGroups: Record<string, ValidationSection[]> = {};
              if (isHierarchical) {
                hierarchicalGroups = sections.reduce((groups, section) => {
                  // Extract person name from title (everything before the colon)
                  const personName = section.title.split(':')[0];
                  if (!groups[personName]) {
                    groups[personName] = [];
                  }
                  groups[personName].push(section);
                  return groups;
                }, {} as Record<string, ValidationSection[]>);
              }

              return (
                <div key={formType} className="bg-white rounded-lg shadow-sm">
                  {/* Form Header - Clickable for accordion behavior */}
                  <button
                    onClick={() => toggleForm(formType)}
                    className="w-full p-6 border-b border-gray-200 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors duration-150 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {!hasErrors && !hasWarnings ? (
                          <CheckCircleIcon className="h-6 w-6 text-green-500 flex-shrink-0" />
                        ) : hasErrors ? (
                          <XCircleIcon className="h-6 w-6 text-red-500 flex-shrink-0" />
                        ) : (
                          <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">{formTitle}</h3>
                          <p className="text-sm text-gray-600">
                            {sections.length} {sections.length === 1 ? 'Abschnitt' : 'Abschnitte'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {totalErrors > 0 && (
                          <span className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                            {totalErrors} Fehler
                          </span>
                        )}
                        {totalWarnings > 0 && (
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
                            {totalWarnings} Warnungen
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Form Content */}
                  {isExpanded && (
                    <div className="divide-y divide-gray-100">
                      {/* Document-specific navigation button */}
                      {formType === 'documents' && hasErrors && (
                        <div className="p-6 border-b border-gray-100">
                          <button
                            onClick={() => handleNavigateToForm('documents')}
                            className="btn btn-primary btn-sm"
                            style={{ backgroundColor: '#064497', border: 'none' }}
                          >
                            Zur Dokument Übersicht
                          </button>
                        </div>
                      )}
                      {isHierarchical ? (
                        // Hierarchical view for forms like Einkommenserklärung
                        Object.entries(hierarchicalGroups).map(([personName, personSections]) => {
                          const personHasErrors = personSections.some(s => s.errors.length > 0);
                          const personHasWarnings = personSections.some(s => s.warnings.length > 0);
                          const personTotalErrors = personSections.reduce((sum, s) => sum + s.errors.length, 0);
                          const personTotalWarnings = personSections.reduce((sum, s) => sum + s.warnings.length, 0);
                          const personIsExpanded = expandedPerson === `${formType}-${personName}`;

                          return (
                            <div key={personName} className="p-6">
                              {/* Person Header */}
                              <button
                                onClick={() => setExpandedPerson(personIsExpanded ? null : `${formType}-${personName}`)}
                                className="w-full text-left flex items-center justify-between hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors duration-150 p-3 rounded border border-gray-200 mb-4"
                              >
                                <div className="flex items-center space-x-3">
                                  {!personHasErrors && !personHasWarnings ? (
                                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                                  ) : personHasErrors ? (
                                    <XCircleIcon className="h-5 w-5 text-red-500" />
                                  ) : (
                                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                                  )}
                                  <span className="font-semibold text-gray-900 text-lg">{personName}</span>
                                  <div className="flex items-center space-x-2">
                                    {personTotalErrors > 0 && (
                                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                                        {personTotalErrors} Fehler
                                      </span>
                                    )}
                                    {personTotalWarnings > 0 && (
                                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                        {personTotalWarnings} Warnungen
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {personIsExpanded ? (
                                  <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                                ) : (
                                  <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                                )}
                              </button>

                              {/* Person Sections */}
                              {personIsExpanded && (
                                <div className="pl-6 space-y-4">
                                  {personSections.map((section) => (
                                    <div key={section.id}>
                                      <button
                                        onClick={() => toggleSection(section.id)}
                                        className="w-full text-left flex items-center justify-between hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors duration-150 p-2 rounded"
                                      >
                                        <div className="flex items-center space-x-3">
                                          {section.success ? (
                                            <CheckCircleIcon className="h-4 w-4 text-green-500" />
                                          ) : section.errors.length > 0 ? (
                                            <XCircleIcon className="h-4 w-4 text-red-500" />
                                          ) : (
                                            <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
                                          )}
                                          <span className="font-medium text-gray-900">{section.title.split(':')[1] || section.title}</span>
                                          <div className="flex items-center space-x-2">
                                            {section.errors.length > 0 && (
                                              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                                                {section.errors.length} Fehler
                                              </span>
                                            )}
                                            {section.warnings.length > 0 && (
                                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                                {section.warnings.length} Warnungen
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        {section.isExpanded ? (
                                          <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                                        ) : (
                                          <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                                        )}
                                      </button>

                                      {section.isExpanded && (
                                        <div className="mt-4 pl-6">
                                          {/* Check if this is an enhanced financial section or cross-validation section */}
                                          {section.calculations || section.successMessages || section.navigationButtons || section.id === 'cross-checks' ? (
                                            renderEnhancedSectionContent(section)
                                          ) : (
                                            <>
                                              {/* Standard rendering for non-financial sections */}
                                              {/* Errors */}
                                              {section.errors.length > 0 && (
                                                <div className="mb-4">
                                                  <h4 className="text-sm font-semibold text-red-800 mb-2">Fehler:</h4>
                                                  <ul className="space-y-1">
                                                    {section.errors.map((error, index) => (
                                                      <li key={index} className="text-sm text-red-700 flex items-start">
                                                        <span className="mr-2">•</span>
                                                        {error}
                                                      </li>
                                                    ))}
                                                  </ul>
                                                </div>
                                              )}

                                              {/* Warnings */}
                                              {section.warnings.length > 0 && (
                                                <div className="mb-4">
                                                  <h4 className="text-sm font-semibold text-yellow-800 mb-2">Warnungen:</h4>
                                                  <ul className="space-y-1">
                                                    {section.warnings.map((warning, index) => (
                                                      <li key={index} className="text-sm text-yellow-700 flex items-start">
                                                        <span className="mr-2">•</span>
                                                        {warning}
                                                      </li>
                                                    ))}
                                                  </ul>
                                                </div>
                                              )}

                                              {/* Success Message */}
                                              {section.errors.length === 0 && section.warnings.length === 0 && (
                                                <div className="mb-4">
                                                  <div className="flex items-center text-green-700">
                                                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                                                    <span className="text-sm font-medium">
                                                      {getSuccessMessage(formType, true)}
                                                    </span>
                                                  </div>
                                                </div>
                                              )}

                                              {/* Navigation Button - Only show if there are errors and not a document section */}
                                              {section.errors.length > 0 && !section.id.startsWith('documents') && (
                                                <div className="mt-4">
                                                  <button
                                                    onClick={() => handleNavigateToForm(formType)}
                                                    className="btn btn-primary btn-sm"
                                                    style={{ backgroundColor: '#064497', border: 'none' }}
                                                  >
                                                    Zum Formular navigieren
                                                  </button>
                                                </div>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        // Regular view for other forms
                        sections.map((section) => (
                          <div key={section.id} className="p-6">
                            {isSingleSection ? (
                              // For single section forms, show content directly without sub-section header
                              <div>
                                {/* Check if this is an enhanced financial section or cross-validation section */}
                                {section.calculations || section.successMessages || section.navigationButtons || section.id === 'cross-checks' ? (
                                  <div className={section.id === 'cross-checks' ? 'ml-0' : 'ml-8'}>
                                    {renderEnhancedSectionContent(section)}
                                  </div>
                                ) : (
                                  <>
                                    {/* Standard rendering for non-financial sections */}
                                    {/* Errors */}
                                    {section.errors.length > 0 && (
                                      <div className="ml-8 mb-4">
                                        <h4 className="text-sm font-semibold text-red-800 mb-2">Fehler:</h4>
                                        <ul className="space-y-1">
                                          {section.errors.map((error, index) => (
                                            <li key={index} className="text-sm text-red-700 flex items-start">
                                              <span className="mr-2">•</span>
                                              {error}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {/* Warnings */}
                                    {section.warnings.length > 0 && (
                                      <div className="mb-4">
                                        <h4 className="text-sm font-semibold text-yellow-800 mb-2">Warnungen:</h4>
                                        <ul className="space-y-1">
                                          {section.warnings.map((warning, index) => (
                                            <li key={index} className="text-sm text-yellow-700 flex items-start">
                                              <span className="mr-2">•</span>
                                              {warning}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {/* Success Message */}
                                    {section.errors.length === 0 && section.warnings.length === 0 && (
                                      <div className="ml-8 mb-4">
                                        <div className="flex items-center text-green-700">
                                          <CheckCircleIcon className="h-4 w-4 mr-2" />
                                          <span className="text-sm font-medium">
                                            {getSuccessMessage(formType, false)}
                                          </span>
                                        </div>
                                      </div>
                                    )}

                                    {/* Navigation Button - Only show if there are errors and not a document section */}
                                    {section.errors.length > 0 && !section.id.startsWith('documents') && (
                                      <div className="ml-8 mt-4">
                                        <button
                                          onClick={() => handleNavigateToForm(section.id)}
                                          className="btn btn-primary btn-sm"
                                          style={{ backgroundColor: '#064497', border: 'none' }}
                                        >
                                          Zum Formular navigieren
                                        </button>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            ) : (
                              // For multi-section forms, show sub-section headers
                              <>
                                <button
                                  onClick={() => toggleSection(section.id)}
                                  className="w-full text-left flex items-center justify-between hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors duration-150 p-2 rounded"
                                >
                                  <div className="flex items-center space-x-3">
                                    {section.success ? (
                                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
                                    ) : section.errors.length > 0 ? (
                                      <XCircleIcon className="h-4 w-4 text-red-500" />
                                    ) : (
                                      <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
                                    )}
                                    <span className="font-medium text-gray-900">{section.title}</span>
                                    <div className="flex items-center space-x-2">
                                      {section.errors.length > 0 && (
                                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                                          {section.errors.length} Fehler
                                        </span>
                                      )}
                                      {section.warnings.length > 0 && (
                                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                          {section.warnings.length} Warnungen
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {section.isExpanded ? (
                                    <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                                  ) : (
                                    <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                                  )}
                                </button>

                                {section.isExpanded && (
                                  <div className="mt-4 pl-6">
                                    {/* Check if this is an enhanced financial section or cross-validation section */}
                                    {section.calculations || section.successMessages || section.navigationButtons || section.id === 'cross-checks' ? (
                                      renderEnhancedSectionContent(section)
                                    ) : (
                                      <>
                                        {/* Standard rendering for non-financial sections */}
                                        {/* Errors */}
                                        {section.errors.length > 0 && (
                                          <div className="mb-4">
                                            <h4 className="text-sm font-semibold text-red-800 mb-2">Fehler:</h4>
                                            <ul className="space-y-1">
                                              {section.errors.map((error, index) => (
                                                <li key={index} className="text-sm text-red-700 flex items-start">
                                                  <span className="mr-2">•</span>
                                                  {error}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}

                                        {/* Warnings */}
                                        {section.warnings.length > 0 && (
                                          <div className="mb-4">
                                            <h4 className="text-sm font-semibold text-yellow-800 mb-2">Warnungen:</h4>
                                            <ul className="space-y-1">
                                              {section.warnings.map((warning, index) => (
                                                <li key={index} className="text-sm text-yellow-700 flex items-start">
                                                  <span className="mr-2">•</span>
                                                  {warning}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}

                                        {/* Success Message */}
                                        {section.errors.length === 0 && section.warnings.length === 0 && (
                                          <div className="mb-4">
                                            <div className="flex items-center text-green-700">
                                              <CheckCircleIcon className="h-4 w-4 mr-2" />
                                              <span className="text-sm font-medium">
                                                {getSuccessMessage(formType, true)}
                                              </span>
                                            </div>
                                          </div>
                                        )}

                                        {/* Navigation Button - Only show if there are errors and not a document section */}
                                        {section.errors.length > 0 && !section.id.startsWith('documents') && (
                                          <div className="mt-4">
                                            <button
                                              onClick={() => handleNavigateToForm(formType)}
                                              className="btn btn-primary btn-sm"
                                              style={{ backgroundColor: '#064497', border: 'none' }}
                                            >
                                              Zum Formular navigieren
                                            </button>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>

        {/* Bottom Hand-in Button */}
        <div className="py-8 text-center">
          <button
            onClick={handleContinueToHandIn}
            className="px-6 py-2 rounded focus:outline-none focus:ring-0 focus:ring-offset-0 shadow-md bg-[#064497] hover:bg-[#0965dc] text-white whitespace-nowrap"
          >
            Antrag einreichen
          </button>
        </div>
      </div>

      {/* Hand-in Modal */}
      <Modal show={showHandInModal} onHide={() => setShowHandInModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Antrag einreichen</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {handInStep === 'city' && (
            <>
              {handInLoading ? (
                <div className="text-center"><Spinner animation="border" /></div>
              ) : (
                <>
                  {objectData?.obj_postal_code ? (
                    cityInfo ? (
                      <div className="alert alert-success mb-3">Ihr Antrag wird an die Bewilligungsbehörde <b>{cityInfo.name}</b> gesendet.</div>
                    ) : (
                      <div className="alert alert-danger mb-3">Leider befindet sich Ihr Objekt in einem nicht unterstützten Kreis / Stadt.</div>
                    )
                  ) : (
                    <>
                      <div className="alert alert-warning mb-3">Sie haben keine vollständige Adresse Ihres Förderobjekts definiert.</div>
                      <Form.Group className="mb-3">
                        <Form.Label>Kreis/Stadt auswählen</Form.Label>
                        <Form.Select value={cityDropdown} onChange={e => setCityDropdown(e.target.value)}>
                          <option value="">Bitte wählen...</option>
                          <option value="03e8b85b-1a8f-47ca-a4bb-c486c77e695a">Rhein-Kreis Neuss</option>
                        </Form.Select>
                      </Form.Group>
                    </>
                  )}
                  {handInError && <div className="alert alert-danger mb-2">{handInError}</div>}
                  <div className="d-flex justify-content-end gap-2">
                    <Button variant="secondary" onClick={() => setShowHandInModal(false)}>Abbrechen</Button>
                    <Button
                      style={{ background: '#064497', color: '#fff', border: 'none' }}
                      onClick={() => setHandInStep('sign')}
                      disabled={(!cityInfo && !cityDropdown)}
                    >
                      Weiter zur Signatur
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
          {handInStep === 'sign' && (
            <>
              <div className="alert alert-info mb-3">Bitte bestätigen Sie die Einreichung Ihres Antrags. (Die digitale Signatur wird in Kürze verfügbar sein.)</div>
              {handInError && <div className="alert alert-danger mb-2">{handInError}</div>}
              <div className="d-flex justify-content-end gap-2">
                <Button variant="secondary" onClick={() => setShowHandInModal(false)}>Abbrechen</Button>
                <Button
                  style={{ background: '#064497', color: '#fff', border: 'none' }}
                  onClick={handleSignAndSubmit}
                  disabled={handInLoading}
                >
                  Antrag jetzt einreichen
                </Button>
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default ValidationPage; 