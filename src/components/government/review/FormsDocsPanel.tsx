import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import EinkommenserklaerungReviewContainer from '../../Einkommenserklaerung/EinkommenserklaerungReviewContainer';
import HauptantragReviewContainer from '../../Hauptantrag/HauptantragReviewContainer';
import SelbstauskunftReviewContainer from '../../Selbstauskunft/SelbstauskunftReviewContainer';
import WoFIVReviewContainer from '../../WoFIV/WoFIVReviewContainer';
import Din277ReviewContainer from '../../DIN277/Din277ReviewContainer';
import SelbsthilfeReviewContainer from '../../Selbsthilfe/SelbsthilfeReviewContainer';
import HaushaltReviewContainer from '../../Haushaltsauskunft/HaushaltReviewContainer';

type DocumentStatus = {
  fileName: string;
  filePath: string;
  uploaded: boolean;
  uploadedAt: string;
  documentId: string;
  applicantType: 'general' | 'hauptantragsteller' | 'applicant';
  applicantNumber?: number;
};

type SignedDocument = {
  title: string;
  filename?: string;
  required: boolean;
  uploaded: boolean;
  file_path?: string;
  file_size?: number;
  description: string;
  uploaded_at?: string;
  is_selbsthilfe: boolean;
  signature_count: number;
};

type DocumentStatusMap = {
  [key: string]: DocumentStatus[];
};

type CategoryDocuments = {
  [categoryKey: string]: DocumentStatusMap;
};

type FormsDocsPanelProps = {
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

// Category display names
const CATEGORY_LABELS: Record<string, string> = {
  'general': 'Allgemeine Dokumente',
  'hauptantragsteller': 'Hauptantragsteller',
  // Remove the hardcoded applicant_2, applicant_3, etc. as they will be generated dynamically
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

const FormsDocsPanel: React.FC<FormsDocsPanelProps> = ({ 
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
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [formMenuOpenFor, setFormMenuOpenFor] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const formMenuRef = useRef<HTMLDivElement | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(sidebarInitiallyVisible);
  const [applicantNames, setApplicantNames] = useState<Record<string, string>>({});
  const [isDownloadingForm, setIsDownloadingForm] = useState<string | null>(null);
  const [signedDocuments, setSignedDocuments] = useState<Record<string, SignedDocument>>({});
  const [signedDocumentUrls, setSignedDocumentUrls] = useState<{[key: string]: string}>({});
  const [signedMenuOpenFor, setSignedMenuOpenFor] = useState<string | null>(null);
  const signedMenuRef = useRef<HTMLDivElement | null>(null);

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

      // Process signed documents
      if (data?.signature_documents) {
        setSignedDocuments(data.signature_documents);
        
        // Generate signed URLs for uploaded signed documents
        const signedUrls: {[key: string]: string} = {};
        
        await Promise.all(
          Object.entries(data.signature_documents as Record<string, SignedDocument>).map(async ([docId, doc]) => {
            if (doc.uploaded && doc.file_path) {
              const { data: signedData } = await supabase.storage
                .from('documents')
                .createSignedUrl(doc.file_path, 3600); // 1 hour expiry
              if (signedData?.signedUrl) {
                signedUrls[docId] = signedData.signedUrl;
              }
            }
          })
        );
        
        setSignedDocumentUrls(signedUrls);
      }
    };

    fetchUserData();
  }, [residentId]);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenFor(null);
      }
      if (formMenuRef.current && !formMenuRef.current.contains(event.target as Node)) {
        setFormMenuOpenFor(null);
      }
      if (signedMenuRef.current && !signedMenuRef.current.contains(event.target as Node)) {
        setSignedMenuOpenFor(null);
      }
    }
    if (menuOpenFor || formMenuOpenFor || signedMenuOpenFor) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpenFor, formMenuOpenFor, signedMenuOpenFor]);

  const handleOpenInsideApp = (uniqueId: string) => {
    setMenuOpenFor(null);
    if (!openDocuments.includes(uniqueId)) {
      onPopOut(uniqueId, 'doc');
    }
  };

  const handleOpenExternalTab = (uniqueId: string) => {
    setMenuOpenFor(null);
    if (documentUrls[uniqueId]) {
      window.open(documentUrls[uniqueId], '_blank');
    }
  };

  const handleDownload = async (file: DocumentStatus, uniqueId: string) => {
    setMenuOpenFor(null);
    if (file?.filePath) {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(file.filePath, 60, { download: true });
      if (data?.signedUrl) {
        const link = document.createElement('a');
        link.href = data.signedUrl;
        link.download = file.fileName || uniqueId;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  const handleFormOpen = (formId: string) => {
    setFormMenuOpenFor(null);
    if (!openForms.includes(formId)) {
      onPopOut(formId, 'form');
    }
  };

  const handleFormDownload = async (formId: string) => {
    if (!residentId) return;
    
    setFormMenuOpenFor(null);
    setIsDownloadingForm(formId);
    
    try {
      // Get the current session token from Supabase
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        throw new Error('No valid session found');
      }

      // Get the API base URL from environment or use relative path
      const apiBaseUrl = process.env.REACT_APP_BACKEND_URL || '';
      
      // Make API call to generate PDF for agent
      const response = await fetch(`${apiBaseUrl}/pdf/generate-haushalt-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ resident_id: residentId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get the PDF blob
      const pdfBlob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `haushalt_form_${residentId}.pdf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Fehler beim Herunterladen der PDF. Bitte versuchen Sie es erneut.');
    } finally {
      setIsDownloadingForm(null);
    }
  };

  // Signed document handlers
  const handleSignedOpenInsideApp = (docId: string) => {
    setSignedMenuOpenFor(null);
    if (!openDocuments.includes(docId)) {
      onPopOut(docId, 'doc');
    }
  };

  const handleSignedOpenExternalTab = (docId: string) => {
    setSignedMenuOpenFor(null);
    if (signedDocumentUrls[docId]) {
      window.open(signedDocumentUrls[docId], '_blank');
    }
  };

  const handleSignedDownload = async (docId: string, doc: SignedDocument) => {
    setSignedMenuOpenFor(null);
    if (doc?.file_path) {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.file_path, 60, { download: true });
      if (data?.signedUrl) {
        const link = document.createElement('a');
        link.href = data.signedUrl;
        link.download = doc.filename || docId;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  const renderDocumentButton = (docTypeId: string, file: DocumentStatus, index: number, categoryKey: string, totalFiles: number) => {
    const uniqueId = `${categoryKey}_${docTypeId}_${index}`;
    const isSelected = openDocuments.includes(uniqueId);
    const documentLabel = DOCUMENT_LABELS[docTypeId] || docTypeId;
    const displayLabel = totalFiles > 1 ? `${documentLabel} (${index + 1})` : documentLabel;
    
    return (
      <div key={uniqueId} style={{ marginBottom: 6, position: 'relative' }}>
        <button
          onClick={() => setMenuOpenFor(uniqueId)}
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
            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
            border: 'none',
            padding: '0 14px',
            cursor: file.uploaded ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s, color 0.2s',
            outline: 'none',
            textAlign: 'left',
            minHeight: 64,
            maxHeight: 64,
            overflow: 'hidden',
            whiteSpace: 'normal',
            opacity: file.uploaded ? 1 : 0.5,
          }}
          disabled={!file.uploaded}
        >
          {displayLabel}
        </button>
        {menuOpenFor === uniqueId && file.uploaded && (
          <div
            ref={menuRef}
            style={{
              position: 'absolute',
              top: 70,
              left: 0,
              background: '#fff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              borderRadius: 6,
              zIndex: 10,
              minWidth: 180,
              padding: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <button
              style={{ width: '100%', padding: '8px 0', border: 'none', background: '#f7f8fa', borderRadius: 4, cursor: 'pointer' }}
              onClick={() => handleOpenInsideApp(uniqueId)}
            >
              Öffnen
            </button>
            <button
              style={{ width: '100%', padding: '8px 0', border: 'none', background: '#f7f8fa', borderRadius: 4, cursor: 'pointer' }}
              onClick={() => handleOpenExternalTab(uniqueId)}
            >
              In neuem Tab öffnen
            </button>
            <button
              style={{ width: '100%', padding: '8px 0', border: 'none', background: '#f7f8fa', borderRadius: 4, cursor: 'pointer' }}
              onClick={async () => await handleDownload(file, uniqueId)}
            >
              Herunterladen
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderSignedDocumentButton = (docId: string, doc: SignedDocument) => {
    const isSelected = openDocuments.includes(docId);
    
    return (
      <div key={docId} style={{ marginBottom: 6, position: 'relative' }}>
        <button
          onClick={() => setSignedMenuOpenFor(docId)}
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
            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
            border: 'none',
            padding: '0 14px',
            cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s',
            outline: 'none',
            textAlign: 'left',
            minHeight: 64,
            maxHeight: 64,
            overflow: 'hidden',
            whiteSpace: 'normal',
          }}
        >
          {doc.title}
        </button>
        {signedMenuOpenFor === docId && (
          <div
            ref={signedMenuRef}
            style={{
              position: 'absolute',
              top: 70,
              left: 0,
              background: '#fff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              borderRadius: 6,
              zIndex: 10,
              minWidth: 180,
              padding: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <button
              style={{ width: '100%', padding: '8px 0', border: 'none', background: '#f7f8fa', borderRadius: 4, cursor: 'pointer' }}
              onClick={() => handleSignedOpenInsideApp(docId)}
            >
              Öffnen
            </button>
            <button
              style={{ width: '100%', padding: '8px 0', border: 'none', background: '#f7f8fa', borderRadius: 4, cursor: 'pointer' }}
              onClick={() => handleSignedOpenExternalTab(docId)}
            >
              In neuem Tab öffnen
            </button>
            <button
              style={{ width: '100%', padding: '8px 0', border: 'none', background: '#f7f8fa', borderRadius: 4, cursor: 'pointer' }}
              onClick={async () => await handleSignedDownload(docId, doc)}
            >
              Herunterladen
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', height: '100vh', margin: 0, padding: 0, position: 'relative', overflow: 'hidden' }}>
      {/* Main area for open forms/docs */}
      <div style={{ flex: 1, display: 'flex', gap: 8, padding: '8px 0 8px 16px', transition: 'flex 0.3s' }}>
        {[...openForms, ...openDocuments].slice(0, 2).map((id, idx) => (
          <div key={id} style={{
            flex: 1,
            border: '1px solid #ccc',
            borderRadius: 8,
            background: '#fff',
            padding: 16,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: 12,
              marginBottom: 16,
              minHeight: 40 // Ensure minimum height for button alignment
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
                  
                  // Check if it's a signed document
                  const signedDoc = signedDocuments[id];
                  if (signedDoc) return signedDoc.title;
                  
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
                {(documentUrls[id] || signedDocumentUrls[id]) && (
                  <button
                    onClick={() => window.open(documentUrls[id] || signedDocumentUrls[id], '_blank')}
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
                      transition: 'background 0.2s, color 0.2s',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                      padding: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden'
                    }}
                    title="In neuem Tab öffnen"
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
                    transition: 'background 0.2s, color 0.2s',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    padding: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden'
                  }}
                  title="Schließen"
                >
                  <span className="material-icons" style={{ fontSize: 18 }}>close</span>
                  <span style={{ fontSize: 13 }}>Schließen</span>
                </button>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {openDocuments.includes(id) && (documentUrls[id] || signedDocumentUrls[id]) && (
                <iframe 
                  src={documentUrls[id] || signedDocumentUrls[id]} 
                  style={{ width: '100%', height: '100%', border: 'none' }}
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
          <div style={{ flex: 1, color: '#aaa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Kein Formular oder Dokument geöffnet
          </div>
        )}
      </div>

      {/* Sidebar for available forms/docs - only render if visible */}
      {sidebarVisible && (
        <div
          style={{
            width: 280, // Fixed width (increased slightly for better usability)
            borderLeft: '1px solid #eee',
            background: '#f7f8fa',
            height: '100vh',
            overflow: 'hidden',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            zIndex: 20,
            flexShrink: 0 // Prevent sidebar from shrinking
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
                overflow: 'hidden'
              }}
              title="Seitenleiste ausblenden"
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
              const showMenu = form.id === 'haushaltsauskunft';
              const isDownloading = isDownloadingForm === form.id;
              
              return (
                <div key={form.id} style={{ marginBottom: 6, position: 'relative' }}>
                  <button
                    onClick={() => showMenu ? setFormMenuOpenFor(form.id) : onPopOut(form.id, 'form')}
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
                      boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                      border: 'none',
                      padding: '0 14px',
                      cursor: 'pointer',
                      transition: 'background 0.2s, color 0.2s',
                      outline: 'none',
                      textAlign: 'left',
                      minHeight: 64,
                      maxHeight: 64,
                      overflow: 'hidden',
                      whiteSpace: 'normal',
                      opacity: isDownloading ? 0.7 : 1,
                    }}
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <>
                        <span style={{ marginRight: 8 }}>⏳</span>
                        PDF wird erstellt...
                      </>
                    ) : (
                      form.label
                    )}
                  </button>
                  {showMenu && formMenuOpenFor === form.id && (
                    <div
                      ref={formMenuRef}
                      style={{
                        position: 'absolute',
                        top: 70,
                        left: 0,
                        background: '#fff',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        borderRadius: 6,
                        zIndex: 10,
                        minWidth: 180,
                        padding: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      <button
                        style={{ width: '100%', padding: '8px 0', border: 'none', background: '#f7f8fa', borderRadius: 4, cursor: 'pointer' }}
                        onClick={() => handleFormOpen(form.id)}
                      >
                        Öffnen
                      </button>
                      <button
                        style={{ width: '100%', padding: '8px 0', border: 'none', background: '#f7f8fa', borderRadius: 4, cursor: 'pointer' }}
                        onClick={() => handleFormDownload(form.id)}
                        disabled={isDownloading}
                      >
                        {isDownloading ? 'PDF wird erstellt...' : 'Herunterladen'}
                      </button>
                    </div>
                  )}
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

            {/* Signed Documents Section */}
            {Object.keys(signedDocuments).length > 0 && (
              <>
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
                  Unterschriebene Formulare
                </h4>
                {Object.entries(signedDocuments)
                  .filter(([_, doc]) => doc.uploaded) // Only show uploaded documents
                  .sort(([_, docA], [__, docB]) => docA.title.localeCompare(docB.title, 'de', { sensitivity: 'base' }))
                  .map(([docId, doc]) => renderSignedDocumentButton(docId, doc))}
              </>
            )}
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
            right: 0,
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
          }}
          title="Seitenleiste einblenden"
        >
          <span className="material-icons">chevron_left</span>
        </button>
      )}
    </div>
  );
};

export default FormsDocsPanel; 