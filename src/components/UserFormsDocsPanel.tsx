import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import EinkommenserklaerungReviewContainer from './Einkommenserklaerung/EinkommenserklaerungReviewContainer';
import HauptantragReviewContainer from './Hauptantrag/HauptantragReviewContainer';
import SelbstauskunftReviewContainer from './Selbstauskunft/SelbstauskunftReviewContainer';
import WoFIVReviewContainer from './WoFIV/WoFIVReviewContainer';
import Din277ReviewContainer from './DIN277/Din277ReviewContainer';
import SelbsthilfeReviewContainer from './Selbsthilfe/SelbsthilfeReviewContainer';
import HaushaltReviewContainer from './Haushaltsauskunft/HaushaltReviewContainer';

type DocumentStatus = {
  fileName: string;
  filePath: string;
  uploaded: boolean;
  uploadedAt: string;
  documentId: string;
  applicantType: 'general' | 'hauptantragsteller' | 'applicant';
  applicantNumber?: number;
};

type DocumentStatusMap = {
  [key: string]: DocumentStatus[];
};

type CategoryDocuments = {
  [categoryKey: string]: DocumentStatusMap;
};

type UserFormsDocsPanelProps = {
  openForms: string[];
  openDocuments: string[];
  onCloseForm: (formId: string) => void;
  onCloseDocument: (docId: string) => void;
  onPopOut: (id: string, type: 'form' | 'doc') => void;
  residentId?: string;
  sidebarInitiallyVisible?: boolean;
};

export const DOCUMENT_LABELS: Record<string, string> = {
  // General Documents
  'meldebescheinigung': 'Meldebescheinigung',
  'bauzeichnung': 'Bauzeichnung',
  'lageplan': 'Lageplan',
  'grundbuchblattkopie': 'Grundbuchblattkopie',
  'baugenehmigung_vorbescheid': 'Baugenehmigung oder Vorbescheid',
  'bergsenkungsGebiet_erklaerung': 'Erklärung der Bergbaugesellschaft',
  'neubau_kaufvertrag': 'Grundstückskaufvertrag/Entwurf des Kaufvertrags',
  'erbbaurechtsvertrag': 'Erbbaurechtsvertrag',
  'kaufvertrag': 'Entwurf des Kaufvertrags',
  'standortbedingte_mehrkosten': 'Nachweis für standortbedingte Mehrkosten',
  'haswoodconstructionloan': 'Nachweis: Zusatzdarlehen für Bauen mit Holz',
  'beg40standard_cert': 'Nachweis: Zusatzdarlehen für BEG Effizienzstandard 40',
  'pregnancy-cert': 'Schwangerschafts Nachweis',
  'marriage_cert': 'Heiratsurkunde/Lebenspartnerschaftsurkunde',
  'vollmacht-cert': 'Vollmachtsurkunde',
  
  // Applicant Documents
  'lohn_gehaltsbescheinigungen': 'Lohn-/Gehaltsbescheinigungen',
  'einkommenssteuerbescheid': 'Letzter Einkommenssteuerbescheid',
  'einkommenssteuererklaerung': 'Letzte Einkommenssteuererklärung',
  'rentenbescheid': 'Rentenbescheid/Versorgungsbezüge',
  'arbeitslosengeldbescheid': 'Arbeitslosengeldbescheid',
  'werbungskosten_nachweis': 'Nachweis Werbungskosten',
  'kinderbetreuungskosten_nachweis': 'Nachweis Kinderbetreuungskosten',
  'unterhaltsverpflichtung_nachweis': 'Nachweis Unterhaltsverpflichtung',
  'unterhaltsleistungen_nachweis': 'Nachweis Unterhaltsleistungen',
  'krankengeld_nachweis': 'Nachweis Krankengeld',
  'elterngeld_nachweis': 'Nachweis Elterngeld',
  'guv_euer_nachweis': 'Gewinn- und Verlustrechnung (GuV)/Einnahmenüberschussrechnung (EÜR)',
  'ausbildungsfoerderung_nachweis': 'Leistungen der Ausbildungsförderung (BAföG, Berufsausbildungsbeihilfe SGB III)',
  'sonstige_dokumente': 'Sonstige Dokumente',
  'nachweis_darlehen': 'Darlehenszusage(n)',
  'eigenkapital_nachweis': 'Nachweis Eigenkapital',
  'nachweis_disability': 'Nachweis über die Schwerbehinderteneigenschaft/GdB',
  'pflegegrad_nachweis': 'Nachweis der Pflegebedürftigkeit',
  'freiwillige_krankenversicherung_nachweis': 'Nachweis über freiwillige Beiträge zur Krankenversicherung',
  'freiwillige_versicherungsbeitraege_nachweis': 'Nachweis über freiwillige Renten- und Lebensversicherungsbeiträge',

  // Legacy document IDs for backward compatibility
  'income-proof': 'Lohn-/Gehaltsbescheinigung',
  'grundbuchblatt': 'Grundbuchblattkopie',
  'bauenmitholz_cert': 'Nachweis: Zusatzdarlehen für Bauen mit Holz'
};

export const availableForms = [
  { id: 'hauptantrag', label: 'Hauptantrag' },
  { id: 'einkommenserklaerung', label: 'Einkommenserklärung' },
  { id: 'selbstauskunft', label: 'Selbstauskunft' },
  { id: 'haushaltsauskunft', label: 'Anlage zur Einkommenserklärung' },
  { id: 'berechnungwofiv', label: 'Berechnung der Wohn- und Nutzfläche nach WoFIV' },
  { id: 'berechnungrauminhalt', label: 'Berechnung des Brutto-Rauminhalts des Gebäudes' },
  { id: 'selbsthilfeleistungen', label: 'Selbsthilfeleistungen Eigentumsmaßnahmen' },
];

const FORM_COMPONENTS: Record<string, React.FC<{ residentId: string }>> = {
  'einkommenserklaerung': EinkommenserklaerungReviewContainer,
  'hauptantrag': HauptantragReviewContainer,
  'selbstauskunft': SelbstauskunftReviewContainer,
  'haushaltsauskunft': HaushaltReviewContainer,
  'berechnungwofiv': WoFIVReviewContainer,
  'berechnungrauminhalt': Din277ReviewContainer,
  'selbsthilfeleistungen': SelbsthilfeReviewContainer,
};

// Inject Material Icons font if not already present
if (typeof window !== 'undefined' && document && !document.getElementById('material-icons-font')) {
  const link = document.createElement('link');
  link.id = 'material-icons-font';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
  document.head.appendChild(link);
}

const UserFormsDocsPanel: React.FC<UserFormsDocsPanelProps> = ({ 
  openForms, 
  openDocuments, 
  onCloseForm, 
  onCloseDocument, 
  onPopOut,
  residentId,
  sidebarInitiallyVisible = true
}) => {
  const [userData, setUserData] = useState<any>(null);
  const [documentUrls, setDocumentUrls] = useState<{[key: string]: string}>({});
  const [sidebarVisible, setSidebarVisible] = useState(sidebarInitiallyVisible);
  const [applicantNames, setApplicantNames] = useState<Record<string, string>>({});

  // Function to get person name abbreviation
  const getPersonNameAbbreviation = (firstName: string, lastName: string): string => {
    const firstTwo = firstName?.substring(0, 2) || '';
    const lastOne = lastName?.substring(0, 1) || '';
    return `${firstTwo}.${lastOne}.`;
  };

  // Function to get category label with name abbreviation
  const getCategoryLabel = (categoryKey: string): string => {
    if (categoryKey === 'general') return 'Allgemeine Dokumente';
    if (categoryKey === 'hauptantragsteller') return 'Hauptantragsteller';
    
    // Handle applicant categories with UIDs
    if (categoryKey.startsWith('applicant_')) {
      const uuid = categoryKey.replace('applicant_', '');
      const personName = applicantNames[uuid];
      if (personName) {
        return personName;
      }
      // Fallback if no name found
      return `Person ${uuid.substring(0, 8)}`;
    }
    
    return categoryKey;
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (!residentId) return;

      const { data, error } = await supabase
        .from('user_data')
        .select('*')
        .eq('id', residentId)
        .single();

      if (error) {
        console.error('Error fetching user data:', error);
        return;
      }

      setUserData(data);

      // Process applicant names from weitere_antragstellende_personen
      if (data?.weitere_antragstellende_personen) {
        const weiterePersonen = data.weitere_antragstellende_personen;
        const names: Record<string, string> = {};
        
        Object.entries(weiterePersonen).forEach(([uuid, person]: [string, any]) => {
          const firstName = person.firstName || person.firstname || '';
          const lastName = person.lastName || person.lastname || '';
          
          if (firstName && lastName) {
            const abbreviation = getPersonNameAbbreviation(firstName, lastName);
            names[uuid] = `Person (${abbreviation})`;
          } else {
            names[uuid] = `Person ${Object.keys(names).length + 2}`;
          }
        });
        
        setApplicantNames(names);
      }

      // Generate signed URLs for all uploaded documents (private bucket)
      if (data?.document_status) {
        const urls: {[key: string]: string} = {};
        
        // Handle new nested structure: category -> documentType -> files[]
        await Promise.all(
          Object.entries(data.document_status as CategoryDocuments).flatMap(([categoryKey, categoryDocs]) =>
            Object.entries(categoryDocs).flatMap(([docTypeId, files]) =>
              files.map(async (file: DocumentStatus, index: number) => {
                if (file.uploaded) {
                  const uniqueId = `${categoryKey}_${docTypeId}_${index}`;
                  const { data: signedData } = await supabase.storage
                    .from('documents')
                    .createSignedUrl(file.filePath, 3600); // 1 hour expiry
                  if (signedData?.signedUrl) {
                    urls[uniqueId] = signedData.signedUrl;
                  }
                }
              })
            )
          )
        );
        
        setDocumentUrls(urls);
      }
    };

    fetchUserData();
  }, [residentId]);

  const handleFormOpen = (formId: string) => {
    // Close any previously open forms and documents
    onCloseForm(openForms[0]);
    onCloseDocument(openDocuments[0]);
    
    // Open the new form
    onPopOut(formId, 'form');
  };

  const renderDocumentButton = (docTypeId: string, file: DocumentStatus, index: number, categoryKey: string, totalFiles: number) => {
    const uniqueId = `${categoryKey}_${docTypeId}_${index}`;
    const isSelected = openDocuments.includes(uniqueId);
    const documentLabel = DOCUMENT_LABELS[docTypeId] || docTypeId;
    const displayLabel = totalFiles > 1 ? `${documentLabel} (${index + 1})` : documentLabel;
    
    return (
      <div key={uniqueId} style={{ marginBottom: 6, position: 'relative' }}>
        <button
          onClick={() => {
            // Close any previously open forms and documents
            onCloseForm(openForms[0]);
            onCloseDocument(openDocuments[0]);
            
            // Open the new document
            onPopOut(uniqueId, 'doc');
          }}
          style={{
            width: '100%',
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            borderRadius: 7,
            background: isSelected ? '#064497' : '#fff',
            color: isSelected ? '#fff' : '#111',
            fontFamily: 'Roboto, Arial, sans-serif',
            fontWeight: 400,
            fontSize: 15,
            boxShadow: isSelected ? '0 2px 8px rgba(6, 68, 151, 0.3)' : '0 1px 4px rgba(0,0,0,0.15)',
            border: 'none',
            padding: '0 14px',
            cursor: file.uploaded ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
            outline: 'none',
            textAlign: 'left',
            minHeight: 64,
            maxHeight: 64,
            overflow: 'hidden',
            whiteSpace: 'normal',
            opacity: file.uploaded ? 1 : 0.5,
          }}
          disabled={!file.uploaded}
          onMouseEnter={(e) => {
            if (file.uploaded && !isSelected) {
              e.currentTarget.style.background = '#f8f9fa';
            }
          }}
          onMouseLeave={(e) => {
            if (file.uploaded && !isSelected) {
              e.currentTarget.style.background = '#fff';
            }
          }}
        >
          {displayLabel}
        </button>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', height: '100%', margin: 0, padding: 0, position: 'relative', overflow: 'hidden', background: '#f7f8fa' }}>
      {/* Main area for open forms/docs */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        gap: 16, // Increased gap for better spacing
        padding: '16px 24px 16px 24px', // Added left/right padding for better margins
        transition: 'flex 0.3s', 
        minHeight: 0,
        background: '#f7f8fa'
      }}>
        {[...openForms, ...openDocuments].slice(0, 1).map((id, idx) => ( // Changed from slice(0, 2) to slice(0, 1)
          <div key={id} style={{
            flex: 1,
            border: '1px solid #e0e0e0',
            borderRadius: 8,
            background: '#fff',
            padding: 16,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: 12,
              marginBottom: 16,
              minHeight: 40, // Ensure minimum height for button alignment
              flexShrink: 0
            }}>
              <div 
                lang="de" // Enable German hyphenation
                style={{
                  flex: 1,
                  minWidth: 0, // Allow shrinking
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                  wordBreak: 'break-word', // Force breaks in long words
                  hyphens: 'auto', // Add automatic hyphenation
                  lineHeight: 1.4,
                  fontSize: 16,
                  fontWeight: 500,
                  color: '#333',
                  paddingTop: 2 // Align with button top
                }}
              >
                {(() => {
                  // Check if it's a form first
                  const form = availableForms.find(f => f.id === id);
                  if (form) return form.label;
                  
                  // If it's a document with new unique ID format (category_docType_index)
                  if (id.includes('_')) {
                    const parts = id.split('_');
                    if (parts.length >= 3) {
                      let docTypeId;
                      let categoryKey;
                      
                      // Handle different ID formats
                      if (parts[0] === 'applicant') {
                        // Format: applicant_UUID_documentType_index
                        // Skip first two parts (applicant, UUID) and last part (index)
                        docTypeId = parts.slice(2, -1).join('_');
                        categoryKey = `${parts[0]}_${parts[1]}`; // applicant_UUID
                      } else {
                        // Format: category_documentType_index (general, hauptantragsteller)
                        // Skip first part (category) and last part (index)
                        docTypeId = parts.slice(1, -1).join('_');
                        categoryKey = parts[0];
                      }
                      
                      const documentLabel = DOCUMENT_LABELS[docTypeId] || docTypeId;
                      
                      // Add numbering if there are multiple files
                      const index = parseInt(parts[parts.length - 1]);
                      if (!isNaN(index)) {
                        // Count total files for this document type to determine if numbering is needed
                        const totalFiles = userData?.document_status?.[categoryKey]?.[docTypeId]?.length || 1;
                        return totalFiles > 1 ? `${documentLabel} (${index + 1})` : documentLabel;
                      }
                      return documentLabel;
                    }
                  }
                  
                  // Fallback for legacy document IDs
                  return DOCUMENT_LABELS[id] || id;
                })()}
              </div>
              <div style={{ 
                display: 'flex', 
                gap: 8,
                flexShrink: 0 // Don't allow buttons to shrink
              }}>
                {/* Open in new tab button */}
                {documentUrls[id] && (
                  <button
                    onClick={() => window.open(documentUrls[id], '_blank')}
                    style={{
                      width: 140, // Fixed width
                      height: 36, // Fixed height
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#f7f8fa',
                      color: '#064497',
                      border: '1px solid #064497',
                      borderRadius: 6,
                      fontWeight: 500,
                      fontSize: 14,
                      cursor: 'pointer',
                      gap: 4,
                      transition: 'all 0.2s ease',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                      padding: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden'
                    }}
                    title="In neuem Tab öffnen"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#e8f0fe';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f7f8fa';
                    }}
                  >
                    <span className="material-icons" style={{ fontSize: 18 }}>open_in_new</span>
                    <span style={{ fontSize: 13 }}>Extern öffnen</span>
                  </button>
                )}
                {/* Close button */}
                <button
                  onClick={() => availableForms.some(f => f.id === id) ? onCloseForm(id) : onCloseDocument(id)}
                  style={{
                    width: 110, // Fixed width
                    height: 36, // Fixed height
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#fff',
                    color: '#d32f2f',
                    border: '1px solid #d32f2f',
                    borderRadius: 6,
                    fontWeight: 500,
                    fontSize: 14,
                    cursor: 'pointer',
                    gap: 4,
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    padding: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden'
                  }}
                  title="Schließen"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#ffebee';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#fff';
                  }}
                >
                  <span className="material-icons" style={{ fontSize: 18 }}>close</span>
                  <span style={{ fontSize: 13 }}>Schließen</span>
                </button>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {openDocuments.includes(id) && documentUrls[id] && (
                <iframe 
                  src={documentUrls[id]} 
                  style={{ width: '100%', height: '100%', border: 'none', borderRadius: '4px' }}
                  title={id}
                />
              )}
              {openForms.includes(id) && residentId && (
                <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                  {FORM_COMPONENTS[id] ? (
                    React.createElement(FORM_COMPONENTS[id], { residentId })
                  ) : (
                    <div style={{ padding: 24, color: '#666', textAlign: 'center' }}>
                      Formular nicht verfügbar
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {[...openForms, ...openDocuments].length === 0 && (
          <div style={{ 
            flex: 1, 
            color: '#aaa', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: '300'
          }}>
            Kein Formular oder Dokument geöffnet
          </div>
        )}
      </div>

      {/* Sidebar for available forms/docs - only render if visible */}
      {sidebarVisible && (
        <div
          style={{
            width: 280, // Fixed width (increased slightly for better usability)
            borderLeft: '1px solid #e0e0e0',
            background: '#f7f8fa',
            height: '100%',
            overflow: 'hidden',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            zIndex: 20,
            flexShrink: 0, // Prevent sidebar from shrinking
            boxShadow: '-2px 0 8px rgba(0,0,0,0.08)'
          }}
        >
          {/* Hide sidebar button - always visible at the top inside sidebar */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', padding: '10px 10px 5px 0' }}>
            <button
              onClick={() => setSidebarVisible(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: 140, // Fixed width
                height: 36,
                padding: 0,
                borderRadius: 8,
                background: '#fff',
                color: '#064497',
                border: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: 14,
                zIndex: 30,
                marginTop: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                transition: 'all 0.2s ease'
              }}
              title="Seitenleiste ausblenden"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f8f9fa';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fff';
              }}
            >
              <span style={{ color: '#064497', fontWeight: 400, fontSize: 13 }}>Minimieren</span>
              <span className="material-icons" style={{ color: '#064497', fontSize: 20 }}>chevron_right</span>
            </button>
          </div>
          <div
            style={{
              overflowY: 'auto',
              height: '100%',
              padding: '8px 12px 0 22px',
              boxSizing: 'border-box',
            }}
          >
            <h4
              style={{
                fontFamily: 'Roboto',
                fontWeight: 300,
                fontSize: 22,
                marginBottom: 22,
                marginTop: 0,
                padding: 0,
                color: '#000',
                letterSpacing: 0.1,
              }}
            >
              Formulare
            </h4>
            {availableForms.map(form => {
              const isSelected = openForms.includes(form.id);
              
              return (
                <div key={form.id} style={{ marginBottom: 6, position: 'relative' }}>
                  <button
                    onClick={() => handleFormOpen(form.id)}
                    style={{
                      width: '100%',
                      height: 64,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      borderRadius: 7,
                      background: isSelected ? '#064497' : '#fff',
                      color: isSelected ? '#fff' : '#111',
                      fontFamily: 'Roboto, Arial, sans-serif',
                      fontWeight: 400,
                      fontSize: 15,
                      boxShadow: isSelected ? '0 2px 8px rgba(6, 68, 151, 0.3)' : '0 1px 4px rgba(0,0,0,0.15)',
                      border: 'none',
                      padding: '0 14px',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease',
                      outline: 'none',
                      textAlign: 'left',
                      minHeight: 64,
                      maxHeight: 64,
                      overflow: 'hidden',
                      whiteSpace: 'normal',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = '#f8f9fa';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = '#fff';
                      }
                    }}
                  >
                    {form.label}
                  </button>
                </div>
              );
            })}

            <h4
              style={{
                fontFamily: 'Roboto',
                fontWeight: 300,
                fontSize: 22,
                margin: '22px 0 22px 0',
                padding: 0,
                color: '#000',
                letterSpacing: 0.1,
                marginTop: 22,
              }}
            >
              Dokumente
            </h4>
            {userData?.document_status && (() => {
              // Define the desired order of categories
              const categoryOrder = ['general', 'hauptantragsteller'];
              
              // Add applicant categories dynamically based on available data
              const documentStatus = userData.document_status as CategoryDocuments;
              const applicantCategories = Object.keys(documentStatus)
                .filter(key => key.startsWith('applicant_'))
                .sort((a, b) => {
                  // Sort by the UUID part for consistent ordering
                  const uuidA = a.replace('applicant_', '');
                  const uuidB = b.replace('applicant_', '');
                  return uuidA.localeCompare(uuidB);
                });
              
              const allCategoryOrder = [...categoryOrder, ...applicantCategories];
              
              // Sort categories according to our desired order
              const sortedCategories = Object.entries(documentStatus)
                .filter(([categoryKey, categoryDocs]) => Object.keys(categoryDocs).length > 0)
                .sort(([a], [b]) => {
                  const indexA = allCategoryOrder.indexOf(a);
                  const indexB = allCategoryOrder.indexOf(b);
                  
                  // If both are in the order array, sort by their position
                  if (indexA !== -1 && indexB !== -1) {
                    return indexA - indexB;
                  }
                  // If only one is in the order array, prioritize it
                  if (indexA !== -1) return -1;
                  if (indexB !== -1) return 1;
                  // If neither is in the order array, sort alphabetically
                  return a.localeCompare(b);
                });
              
              return sortedCategories.map(([categoryKey, categoryDocs]) => (
                <div key={categoryKey}>
                  {/* Category Header */}
                  <h5
                    style={{
                      fontFamily: 'Roboto',
                      fontWeight: 400,
                      fontSize: 13,
                      margin: '16px 0px 12px 3px',
                      padding: 0,
                      color: '#064497',
                      letterSpacing: 0.1,
                    }}
                  >
                    {getCategoryLabel(categoryKey)}
                  </h5>
                  
                  {/* Documents in this category */}
                  {Object.entries(categoryDocs)
                    .sort(([docTypeIdA], [docTypeIdB]) => {
                      // Sort by document label alphabetically
                      const labelA = DOCUMENT_LABELS[docTypeIdA] || docTypeIdA;
                      const labelB = DOCUMENT_LABELS[docTypeIdB] || docTypeIdB;
                      return labelA.localeCompare(labelB, 'de', { sensitivity: 'base' });
                    })
                    .map(([docTypeId, files]) =>
                      files.map((file: DocumentStatus, index: number) =>
                        renderDocumentButton(docTypeId, file, index, categoryKey, files.length)
                      )
                    )}
                </div>
              ));
            })()}
          </div>
        </div>
      )}
      {/* Show sidebar button (when hidden) */}
      {!sidebarVisible && (
        <button
          onClick={() => setSidebarVisible(true)}
          style={{
            position: 'fixed',
            top: '50%',
            right: 0, // Position at the very right edge of the screen
            transform: 'translateY(-50%)',
            width: 38,
            height: 48,
            borderRadius: '8px 0 0 8px',
            background: '#064497',
            color: '#fff',
            border: 'none',
            boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 100,
            transition: 'all 0.2s ease'
          }}
          title="Seitenleiste einblenden"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#0d4da6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#064497';
          }}
        >
          <span className="material-icons">chevron_left</span>
        </button>
      )}
    </div>
  );
};

export default UserFormsDocsPanel;
