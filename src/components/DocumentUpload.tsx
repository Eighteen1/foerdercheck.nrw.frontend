import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, OverlayTrigger, Tooltip, Modal, Spinner } from "react-bootstrap";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface DocumentType {
  id: string;
  title: string;
  description: string;
  category: string;
  supports_multiple?: boolean;
}

interface UploadedFileInfo {
  fileName: string;
  filePath: string;
  uploaded: boolean;
  documentId: string;
  uploadedAt: string;
  applicantType: 'general' | 'hauptantragsteller' | 'applicant';
  applicantUuid?: string; // UUID for additional applicants instead of applicantNumber
  applicantNumber?: number; // Keep for backward compatibility
}

interface ApplicantDocumentStatus {
  [documentTypeId: string]: UploadedFileInfo[];
}

interface DocumentStatusByApplicant {
  general: ApplicantDocumentStatus;
  hauptantragsteller: ApplicantDocumentStatus;
  [applicantKey: string]: ApplicantDocumentStatus; // applicant_UUID for additional applicants
}

interface DocumentFieldRender {
  id: string;
  documentTypeId: string;
  title: string;
  description: string;
  category: string;
  isMainField: boolean;
  uploadedFile?: UploadedFileInfo;
  supports_multiple?: boolean;
  applicantType: 'general' | 'hauptantragsteller' | 'applicant';
  applicantUuid?: string; // UUID for additional applicants
  applicantNumber?: number; // Keep for backward compatibility
}

interface RequiredDocumentLists {
  general: string[];
  hauptantragsteller: string[];
  additionalApplicants: { [applicantUuid: string]: string[] }; // Changed from applicantNumber to applicantUuid
}

interface AdditionalDocumentsByApplicant {
  general: string[];
  hauptantragsteller: string[];
  [applicantKey: string]: string[]; // applicant_UUID for additional applicants
}

interface FormSection {
  title: string;
  progress: number;
}

// Upload Progress State Interfaces
interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UploadError {
  message: string;
  fieldId: string;
}

// Circular Progress Bar Component
const CircularProgress: React.FC<{ 
  progress: number; 
  size?: number; 
  strokeWidth?: number;
}> = ({ 
  progress, 
  size = 32, 
  strokeWidth = 3
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="position-relative d-flex align-items-center justify-content-center">
      <svg
        width={size}
        height={size}
        className="position-relative"
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#064497"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.3s ease'
          }}
        />
      </svg>
      
      {/* Progress percentage text */}
      <div 
        className="position-absolute d-flex align-items-center justify-content-center"
        style={{
          fontSize: '10px',
          fontWeight: '600',
          color: '#064497',
          transform: 'rotate(0deg)',
          width: '100%',
          height: '100%'
        }}
      >
        {Math.round(progress)}%
      </div>
    </div>
  );
};

// Document Types Registry - Single source of truth for all document types
const DOCUMENT_TYPES: { [id: string]: DocumentType } = {
  // General Documents
  'meldebescheinigung': {
    id: 'meldebescheinigung',
    title: 'Meldebescheinigung',
    description: 'Meldebescheinigung von allen Personen, die das Förderobjekt nach Fertigstellung beziehen sollen',
    category: 'General',
    supports_multiple: true
  },
  'bauzeichnung': {
    id: 'bauzeichnung',
    title: 'Bauzeichnung',
    description: 'Bauzeichnung (im Maßstab 1:100 mit eingezeichneter Möbelstellung). Dieses Dokument ist bei allen Neubauvorhaben verpflichtend einzureichen. Bei Ersterwerbvorhaben ist es nur erforderlich, wenn ein Zusatzdarlehen für Barrierefreiheit beantragt wird.',
    category: 'General',
    supports_multiple: true
  },
  'lageplan': {
    id: 'lageplan',
    title: 'Lageplan',
    description: 'Lageplan nach den Vorschriften Bau NRW (2018)',
    category: 'General',
    supports_multiple: true
  },
  'grundbuchblattkopie': {
    id: 'grundbuchblattkopie',
    title: 'Grundbuchblattkopie',
    description: 'Grundbuchblattkopie nach neuestem Stand',
    category: 'General'
  },
  'baugenehmigung_vorbescheid': {
    id: 'baugenehmigung_vorbescheid',
    title: 'Baugenehmigung oder Vorbescheid',
    description: 'Baugenehmigung oder Vorbescheid gemäß § 7 BauO NRW (2018)',
    category: 'General'
  },
  'bergsenkungsGebiet_erklaerung': {
    id: 'bergsenkungsGebiet_erklaerung',
    title: 'Erklärung der Bergbaugesellschaft',
    description: 'Erklärung der Bergbaugesellschaft über die Notwendigkeit von baulichen Anpassungs- und Sicherungsmaßnahmen und gegebenenfalls die Kostenübernahme',
    category: 'General',
    supports_multiple: true
  },
  'neubau_kaufvertrag': {
    id: 'neubau_kaufvertrag',
    title: 'Grundstückskaufvertrag/Entwurf des Kaufvertrags',
    description: 'Bei Neubau: Grundstückskaufvertrag/Entwurf des Kaufvertrags.',
    category: 'General'
  },
  'erbbaurechtsvertrag': {
    id: 'erbbaurechtsvertrag',
    title: 'Erbbaurechtsvertrag',
    description: 'Vollständige Kopie des Erbbaurechtsvertrages',
    category: 'General'
  },
  'kaufvertrag': {
    id: 'kaufvertrag',
    title: 'Entwurf des Kaufvertrags',
    description: 'Entwurf des Kaufvertrags',
    category: 'General'
  },
  'standortbedingte_mehrkosten': {
    id: 'standortbedingte_mehrkosten',
    title: 'Nachweis für standortbedingte Mehrkosten',
    description: 'Gutachten, Rechnungen oder Kostenvoranschläge',
    category: 'General',
    supports_multiple: true
  },
  'haswoodconstructionloan': {
    id: 'haswoodconstructionloan',
    title: 'Nachweis: Zusatzdarlehen für Bauen mit Holz',
    description: 'Nachweis: Zusatzdarlehen für Bauen mit Holz',
    category: 'General',
    supports_multiple: true
  },
  'beg40standard_cert': {
    id: 'beg40standard_cert',
    title: 'Nachweis: Zusatzdarlehen für BEG Effizienzstandard 40',
    description: 'Nachweis: Zusatzdarlehen für BEG Effizienzstandard 40',
    category: 'General',
    supports_multiple: true
  },
  'pregnancy-cert': {
    id: 'pregnancy-cert',
    title: 'Schwangerschafts Nachweis',
    description: 'Nachweis über die Schwangerschaft',
    category: 'General',
    supports_multiple: true
  },
  'marriage_cert': {
    id: 'marriage_cert',
    title: 'Heiratsurkunde/Lebenspartnerschaftsurkunde',
    description: 'Aktuelle Heiratsurkunde oder Lebenspartnerschaftsurkunde',
    category: 'General',
    supports_multiple: true
  },
  'vollmacht-cert': {
    id: 'vollmacht-cert',
    title: 'Vollmachtsurkunde',
    description: 'Vollmachtsurkunde für die bevollmächtigte Person/Firma',
    category: 'General',
    supports_multiple: true
  },
  // Applicant Documents
  'lohn_gehaltsbescheinigungen': {
    id: 'lohn_gehaltsbescheinigungen',
    title: 'Lohn-/Gehaltsbescheinigungen',
    description: 'Lohn-/Gehaltsbescheinigungen',
    category: 'Applicant',
    supports_multiple: true
  },
  'einkommenssteuerbescheid': {
    id: 'einkommenssteuerbescheid',
    title: 'Letzter Einkommenssteuerbescheid',
    description: 'Letzter Einkommenssteuerbescheid',
    category: 'Applicant'
  },
  'einkommenssteuererklaerung': {
    id: 'einkommenssteuererklaerung',
    title: 'Letzte Einkommenssteuererklärung',
    description: 'Letzte Einkommenssteuererklärung',
    category: 'Applicant'
  },
  'rentenbescheid': {
    id: 'rentenbescheid',
    title: 'Rentenbescheid/Versorgungsbezüge',
    description: 'Aktueller Rentenbescheid/aktueller Bescheid über Versorgungsbezüge',
    category: 'Applicant',
    supports_multiple: true
  },
  'arbeitslosengeldbescheid': {
    id: 'arbeitslosengeldbescheid',
    title: 'Arbeitslosengeldbescheid',
    description: 'Arbeitslosengeldbescheid',
    category: 'Applicant'
  },
  'werbungskosten_nachweis': {
    id: 'werbungskosten_nachweis',
    title: 'Nachweis Werbungskosten',
    description: 'Nachweis über erhöhte Werbungskosten (z. B. Steuerbescheid, Bestätigung Finanzamt)',
    category: 'Applicant',
    supports_multiple: true
  },
  'kinderbetreuungskosten_nachweis': {
    id: 'kinderbetreuungskosten_nachweis',
    title: 'Nachweis Kinderbetreuungskosten',
    description: 'Nachweis über die geleisteten Kinderbetreuungskosten',
    category: 'Applicant',
    supports_multiple: true
  },
  'unterhaltsverpflichtung_nachweis': {
    id: 'unterhaltsverpflichtung_nachweis',
    title: 'Nachweis Unterhaltsverpflichtung',
    description: 'Nachweis über die gesetzliche Unterhaltsverpflichtung und Höhe der Unterhaltszahlungen',
    category: 'Applicant',
    supports_multiple: true
  },
  'unterhaltsleistungen_nachweis': {
    id: 'unterhaltsleistungen_nachweis',
    title: 'Nachweis Unterhaltsleistungen',
    description: 'Nachweis über erhaltene Unterhaltsleistungen/Unterhaltsvorschuss',
    category: 'Applicant',
    supports_multiple: true
  },
  'krankengeld_nachweis': {
    id: 'krankengeld_nachweis',
    title: 'Nachweis Krankengeld',
    description: 'Nachweis über erhaltenes Krankengeld. Dieses Dokument ist verpflichtend, wenn in Ihrer Selbstauskunft Angaben vorliegen, die auf den Bezug von Krankengeld hinweisen. Sollten Sie tatsächlich kein Krankengeld beziehen und die Anforderung auf einer missverständlichen Eingabe beruhen, können Sie dieses Dokument unbeachtet lassen.',
    category: 'Applicant'
  },
  'elterngeld_nachweis': {
    id: 'elterngeld_nachweis',
    title: 'Nachweis Elterngeld',
    description: 'Nachweis über erhaltenes Elterngeld',
    category: 'Applicant'
  },
  'guv_euer_nachweis': {
    id: 'guv_euer_nachweis',
    title: 'Gewinn- und Verlustrechnung (GuV)/Einnahmenüberschussrechnung (EÜR)',
    description: 'Gewinn- und Verlustrechnung (GuV)/Einnahmenüberschussrechnung (EÜR)',
    category: 'Applicant',
    supports_multiple: true
  },
  'ausbildungsfoerderung_nachweis': {
    id: 'ausbildungsfoerderung_nachweis',
    title: 'Leistungen der Ausbildungsförderung (BAföG, Berufsausbildungsbeihilfe SGB III)',
    description: 'Leistungen der Ausbildungsförderung (BAföG, Berufsausbildungsbeihilfe SGB III) (optional)',
    category: 'Applicant',
    supports_multiple: true
  },
  'sonstige_dokumente': {
    id: 'sonstige_dokumente',
    title: 'Sonstige Dokumente',
    description: 'Weitere relevante Dokumente',
    category: 'Applicant',
    supports_multiple: true
  },
  'eigenkapital_nachweis': {
    id: 'eigenkapital_nachweis',
    title: 'Nachweis Eigenkapital',
    description: 'Nachweise für die im Finanzierungsplan ausgewiesenen Mittel: Nachweis über das Eigenkapital',
    category: 'General',
    supports_multiple: true
  },
  'nachweis_darlehen': {
    id: 'nachweis_darlehen',
    title: 'Darlehenszusage(n)',
    description: 'Es sind Nachweise zu den im Finanzierungsplan ausgewiesenen Mitteln einzureichen. Hierzu gehören insbesondere Darlehenszusagen. Bei Ergänzungsdarlehen sind die Zusagen zu bereits gewährten Darlehen der NRW.BANK vorzulegen.',
    category: 'General',
    supports_multiple: true
  },
  'nachweis_disability': {
    id: 'nachweis_disability',
    title: 'Nachweis über die Schwerbehinderteneigenschaft/GdB',
    description: 'Nachweis über die Schwerbehinderteneigenschaft/Grad der Behinderung (GdB). Wie z.B. Schwerbehindertenausweis oder Feststellungsbescheid nach § 152 Abs. 1 SGB IX',
    category: 'Applicant',
    supports_multiple: true
  },
  'pflegegrad_nachweis': {
    id: 'pflegegrad_nachweis',
    title: 'Nachweis der Pflegebedürftigkeit',
    description: 'Nachweis über die in der Haushaltsauskunft ausgewiesene Pflegebedürftigkeit/Pflegegrad',
    category: 'Applicant',
    supports_multiple: true
  },
  'freiwillige_krankenversicherung_nachweis': {
    id: 'freiwillige_krankenversicherung_nachweis',
    title: 'Nachweis über freiwillige Beiträge zur Krankenversicherung',
    description: 'Nachweis über freiwillige Beiträge zur Krankenversicherung',
    category: 'Applicant',
    supports_multiple: true
  },
  'freiwillige_versicherungsbeitraege_nachweis': {
    id: 'freiwillige_versicherungsbeitraege_nachweis',
    title: 'Nachweis über freiwillige Renten- und Lebensversicherungsbeiträge',
    description: 'Nachweis über freiwillige Renten- und Lebensversicherungsbeiträge',
    category: 'Applicant',
    supports_multiple: true
  }
};

const DocumentUpload: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requiredDocuments, setRequiredDocuments] = useState<RequiredDocumentLists>({
    general: [],
    hauptantragsteller: [],
    additionalApplicants: {}
  });
  const [additionalDocuments, setAdditionalDocuments] = useState<AdditionalDocumentsByApplicant>({
    general: [],
    hauptantragsteller: []
  });
  const [documentStatus, setDocumentStatus] = useState<DocumentStatusByApplicant>({
    general: {},
    hauptantragsteller: {}
  });
  const [renderFields, setRenderFields] = useState<DocumentFieldRender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDocumentModal, setShowAddDocumentModal] = useState(false);
  const [currentModalCategory, setCurrentModalCategory] = useState<string>('');
  const [currentModalApplicant, setCurrentModalApplicant] = useState<{ type: 'general' | 'hauptantragsteller' | 'applicant', uuid?: string }>({ type: 'general' });
  const [expandedSection, setExpandedSection] = useState<string>('General');

  // Upload Progress State
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({});
  const [uploadingFields, setUploadingFields] = useState<string[]>([]);
  const [hoveredField, setHoveredField] = useState<string>('');
  const [globalErrors, setGlobalErrors] = useState<string[]>([]);
  
  // Upload queue management
  const [uploadQueue, setUploadQueue] = useState<string[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  
  // File size validation state
  const [showFileSizeModal, setShowFileSizeModal] = useState(false);
  const [fileSizeError, setFileSizeError] = useState<{ fileName: string; fileSize: string }>({ fileName: '', fileSize: '' });
  
  // Loading states for delete operations
  const [deletingFiles, setDeletingFiles] = useState<string[]>([]);
  const [deletingDocumentTypes, setDeletingDocumentTypes] = useState<string[]>([]);
  
  // Confirmation modal state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [pendingDeleteAction, setPendingDeleteAction] = useState<{ 
    type: 'document' | 'modal', 
    documentId: string, 
    documentTitle: string,
    applicantType?: 'general' | 'hauptantragsteller' | 'applicant',
    applicantUuid?: string
  } | null>(null);

  // Document guide modal state
  const [showDocumentGuideModal, setShowDocumentGuideModal] = useState(false);

  // Form progress state
  const [formProgress, setFormProgress] = useState<{ [key: string]: number }>({
    wofiv: 0,
    din277: 0,
    selbsthilfe: 0,
    hauptantrag: 0,
    einkommenserklarung: 0,
    selbstauskunft: 0,
    haushaltsauskunft: 0
  });

  // Track last saved progress to avoid unnecessary saves
  const [lastSavedProgress, setLastSavedProgress] = useState<number | null>(null);

  // Function to fetch form progress from database
  const fetchFormProgress = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_data')
        .select('berechnung_woFIV_progress, berechnung_din277_progress, selbsthilfe_progress, hauptantrag_progress, einkommenserklarung_progress, selbstauskunft_progress, haushaltsauskunft_progress, document_progress')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching form progress:', error);
        return;
      }

      if (data) {
        setFormProgress({
          wofiv: data.berechnung_woFIV_progress || 0,
          din277: data.berechnung_din277_progress || 0,
          selbsthilfe: data.selbsthilfe_progress || 0,
          hauptantrag: data.hauptantrag_progress || 0,
          einkommenserklarung: data.einkommenserklarung_progress || 0,
          selbstauskunft: data.selbstauskunft_progress || 0,
          haushaltsauskunft: data.haushaltsauskunft_progress || 0
        });
        
        // Set the last saved progress to avoid unnecessary saves
        setLastSavedProgress(data.document_progress || 0);
      }
    } catch (error) {
      console.error('Error in fetchFormProgress:', error);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? '' : section);
  };

  // Helper function to add global error
  const addGlobalError = (fieldName: string) => {
    const errorMessage = `${fieldName}: Fehler beim Hochladen des Dokuments. Bitte stellen Sie sicher, dass die Datei nicht beschädigt ist und vollständig auf Ihrem Gerät gespeichert wurde (nicht in der iCloud o. Ä.). Überprüfen Sie gegebenenfalls auch Ihre Internetverbindung.`;
    setGlobalErrors(prev => {
      // Remove any existing error for this field first
      const filteredErrors = prev.filter(error => !error.startsWith(`${fieldName}:`));
      return [...filteredErrors, errorMessage];
    });
    
    // Scroll to top to make error visible
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }, 100); // Small delay to ensure the error is rendered first
  };

  // Helper function to remove global error for a specific field
  const removeGlobalErrorForField = (fieldName: string) => {
    setGlobalErrors(prev => prev.filter(error => !error.startsWith(`${fieldName}:`)));
  };

  // Helper function to remove specific global error
  const removeGlobalError = (error: string) => {
    setGlobalErrors(prev => prev.filter(e => e !== error));
  };

  // Upload queue processing function
  const processUploadQueue = async () => {
    if (isProcessingQueue || uploadQueue.length === 0) return;
    
    setIsProcessingQueue(true);
    
    while (uploadQueue.length > 0) {
      const fieldId = uploadQueue[0];
      setUploadQueue(prev => prev.slice(1));
      
      // Process the upload (this will be handled by the existing upload logic)
      // The actual upload processing is done in the file input onChange handler
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between uploads
    }
    
    setIsProcessingQueue(false);
  };

  // Helper function to check if a document type has uploaded files
  const documentTypeHasFiles = (documentTypeId: string): boolean => {
    return Object.values(documentStatus).some(applicantDocs => 
      applicantDocs[documentTypeId] && applicantDocs[documentTypeId].length > 0
    );
  };

  // Helper function to check if Krankengeld exists in othermonthlynetincome
  const hasKrankengeldIncome = (othermonthlynetincome: any): boolean => {
    if (!othermonthlynetincome || !Array.isArray(othermonthlynetincome)) {
      return false;
    }
    
    return othermonthlynetincome.some((income: any) => {
      if (!income || !income.type || typeof income.type !== 'string') {
        return false;
      }
      
      // Normalize the type string for comparison (lowercase, trim, remove special characters)
      const normalizedType = income.type.toLowerCase().trim().replace(/[^\w\s]/g, '');
      
      // Check for various spellings and variations of "Krankengeld"
      const krankengeldVariations = [
        'krankengeld',
        'kranken geld',
        'krank geld',
        'kg',             // abbreviation
        'krankengelt',    // typo
        'krankengald',    // typo
        'krangengeld',    // typo
        'krankengel',     // typo
        'krangeld',       // typo
      ];
      
      return krankengeldVariations.some(variation => 
        normalizedType.includes(variation) || 
        variation.includes(normalizedType)
      );
    });
  };

  // Helper function to get document title
  const getDocumentTitle = (documentTypeId: string): string => {
    return DOCUMENT_TYPES[documentTypeId]?.title || documentTypeId;
  };

  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Helper function to check file size (50MB limit)
  const validateFileSize = (file: File): boolean => {
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    return file.size <= maxSize;
  };

  // Helper function to render section header
  const renderSectionHeader = (id: string, title: string) => (
    <div 
      className="section-header" 
      onClick={() => toggleSection(id)}
      style={{
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '0.375rem',
        marginBottom: '1rem',
        transition: 'background-color 0.2s ease'
      }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
    >
      <div className="d-flex align-items-center gap-2">
        <h4 className="text-[#064497] font-semibold mb-0" style={{ fontSize: '1.1rem' }}>{title}</h4>
      </div>
      <div className={`expand-icon ${expandedSection === id ? 'expanded' : ''}`} style={{
        transition: 'transform 0.2s ease',
        transform: expandedSection === id ? 'rotate(180deg)' : 'rotate(0deg)'
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 10L12 15L17 10" stroke="#064497" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );

  const formSections: FormSection[] = [
    { title: "Berechnung der Wohn- und Nutzfläche nach WoFIV", progress: formProgress.wofiv },
    { title: "Berechnung des Brutto-Rauminhalts des Gebäudes nach DIN 277", progress: formProgress.din277 },
    { title: "Selbsthilfeleistungen Eigentumsmaßnahmen", progress: formProgress.selbsthilfe }
  ];

  // Function to determine required documents based on user data
  // Helper function to sort document IDs by their titles
  const sortDocumentsByTitle = (documentIds: string[]): string[] => {
    return documentIds.sort((a, b) => {
      const titleA = DOCUMENT_TYPES[a]?.title || a;
      const titleB = DOCUMENT_TYPES[b]?.title || b;
      return titleA.localeCompare(titleB, 'de', { sensitivity: 'base' });
    });
  };

  const determineRequiredDocuments = async (): Promise<RequiredDocumentLists> => {
    if (!user?.id) {
      return { general: [], hauptantragsteller: [], additionalApplicants: {} };
    }

    try {
      // Get the user's document check data from user_data table
      const { data: userData, error: checkError } = await supabase
        .from('user_data')
        .select(`
          hasinheritanceright,
          ispregnant,
          hasauthorizedperson,
          is_married,
          is_disabled,
          employment,
          weitere_antragstellende_personen,
          noIncome,
          main_behinderungsgrad,
          main_pflegegrad,
          hassupplementaryloan
        `)
        .eq('id', user.id)
        .single();

      if (checkError) throw checkError;

      // Get foerderVariante from object_data table
      const { data: objectData, error: objectError } = await supabase
        .from('object_data')
        .select(`
          foerderVariante,
          haslocationcostloan,
          haswoodconstructionloan,
          eigentumsverhaeltnis,
          baugenehmigung_erforderlich,
          bergsenkungsGebiet,
          erbbaurecht,
          barrierefrei,
          beg_effizienzhaus_40_standard
        `)
        .eq('user_id', user.id)
        .single();

      if (objectError && objectError.code !== 'PGRST116') {
        throw objectError;
      }

      const foerderVariante = objectData?.foerderVariante || '';

      // Get financial data from user_financials table
      const { data: financialData, error: financialError } = await supabase
        .from('user_financials')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (financialError && financialError.code !== 'PGRST116') {
        console.error('Error loading financial data:', financialError);
      }

      // Get finance structure data for loan-related documents
      const { data: financeStructureData, error: financeStructureError } = await supabase
        .from('finance_structure')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (financeStructureError && financeStructureError.code !== 'PGRST116') {
        console.error('Error loading finance structure data:', financeStructureError);
      }

      const result: RequiredDocumentLists = {
        general: [],
        hauptantragsteller: [],
        additionalApplicants: {}
      };

      // General documents (always required)
      result.general.push('meldebescheinigung');

      // Financial documents from finance_structure
      // Eigenkapital is always required
      result.general.push('eigenkapital_nachweis');
      
      // Check if fremddarlehen exists and has at least one entry
      if (financeStructureData?.fremddarlehen && Array.isArray(financeStructureData.fremddarlehen)) {
        const hasValidFremddarlehen = financeStructureData.fremddarlehen.some((darlehen: any) => {
          // Check if the darlehen has any meaningful data (not just empty strings or null values)
          return darlehen && (
            darlehen.darlehenGeber?.trim() ||
            darlehen.nennbetrag?.trim() ||
            darlehen.zinssatz?.trim() ||
            darlehen.auszahlung?.trim() ||
            darlehen.tilgung?.trim()
          );
        });
        
        if (hasValidFremddarlehen) {
          result.general.push('nachweis_darlehen');
        }
      }else if(userData?.hassupplementaryloan === true){
        result.general.push('nachweis_darlehen');
      }

      // Conditional general documents based on object data
      if (foerderVariante.includes('neubau') || (foerderVariante.includes('ersterwerb') && objectData?.barrierefrei === true && financeStructureData?.zusatzdarlehen_barrierefreiheit_nennbetrag > 0)) {
        result.general.push('bauzeichnung');
      }
      // Conditional general documents based on object data
      if (foerderVariante.includes('neubau')) {
        result.general.push('lageplan');
      }
      if (objectData?.eigentumsverhaeltnis) {
        result.general.push('grundbuchblattkopie');
      }

      if (['neubau', 'neubau-wohnung', 'ersterwerb-wohnung', 'ersterwerb-eigenheim'].includes(foerderVariante) && objectData?.baugenehmigung_erforderlich) {
        result.general.push('baugenehmigung_vorbescheid');
      }

      if (['neubau', 'neubau-wohnung', 'ersterwerb-wohnung', 'ersterwerb-eigenheim', 'nutzungsaenderung'].includes(foerderVariante) && objectData?.bergsenkungsGebiet) {
        result.general.push('bergsenkungsGebiet_erklaerung');
      }

      if (foerderVariante.includes('neubau')) {
        result.general.push('neubau_kaufvertrag');
      }

      if (objectData?.erbbaurecht) {
        result.general.push('erbbaurechtsvertrag');
      }

      if (foerderVariante?.includes('ersterwerb') || foerderVariante?.includes('bestandserwerb')) {
        result.general.push('kaufvertrag');
      }

      if ((foerderVariante?.includes('neubau') || foerderVariante?.includes('ersterwerb')) && objectData?.haslocationcostloan && financeStructureData?.zusatzdarlehen_standortbedingte_mehrkosten_nennbetrag > 0) {
        result.general.push('standortbedingte_mehrkosten');
      }

      if (objectData?.haswoodconstructionloan && financeStructureData?.zusatzdarlehen_bauen_mit_holz_nennbetrag > 0) {
        result.general.push('haswoodconstructionloan');
      }

      if ((foerderVariante?.includes('neubau') || foerderVariante?.includes('ersterwerb')) && objectData?.beg_effizienzhaus_40_standard && financeStructureData?.zusatzdarlehen_effizienzhaus40_nennbetrag > 0) {
        result.general.push('beg40standard_cert');
      }

      if (userData?.ispregnant) {
        result.general.push('pregnancy-cert');
      }

      if (userData?.is_married) {
        result.general.push('marriage_cert');
      }
      
      if (userData?.hasauthorizedperson) {
        result.general.push('vollmacht-cert');
      }

      // Main applicant disability and care level documents
      if (userData?.main_behinderungsgrad && parseFloat(userData.main_behinderungsgrad) > 0) {
        result.hauptantragsteller.push('nachweis_disability');
      }
      
      if (userData?.main_pflegegrad && parseFloat(userData.main_pflegegrad) > 0) {
        result.hauptantragsteller.push('pflegegrad_nachweis');
      }

      // Main applicant financial documents
      if (financialData) {
        if(userData?.noIncome !== true){
          if (financialData.hasSalaryIncome === true || financialData.isEarningRegularIncome === true) {
            result.hauptantragsteller.push('lohn_gehaltsbescheinigungen');
          }

          if (financialData.hasrentincome === true) {
            result.hauptantragsteller.push('einkommenssteuerbescheid', 'einkommenssteuererklaerung');
          }

          if (financialData.haspensionincome === true) {
            result.hauptantragsteller.push('rentenbescheid');
          }

          if (financialData.hasablgincome === true) {
            result.hauptantragsteller.push('arbeitslosengeldbescheid');
          }

          if ((financialData.hasSalaryIncome === true || financialData.isEarningRegularIncome === true) && 
              financialData.werbungskosten && parseFloat(financialData.werbungskosten) > 0) {
            result.hauptantragsteller.push('werbungskosten_nachweis');
          }

          if (financialData.kinderbetreuungskosten && parseFloat(financialData.kinderbetreuungskosten) > 0) {
            result.hauptantragsteller.push('kinderbetreuungskosten_nachweis');
          }

          if (financialData.ispayingunterhalt === true) {
            result.hauptantragsteller.push('unterhaltsverpflichtung_nachweis');
          }

          if (financialData.hastaxfreeunterhaltincome === true || financialData.hastaxableunterhaltincome === true) {
            result.hauptantragsteller.push('unterhaltsleistungen_nachweis');
          }

          if (hasKrankengeldIncome(financialData.othermonthlynetincome)) {
            result.hauptantragsteller.push('krankengeld_nachweis');
          }

          if (financialData.haselterngeldincome === true) {
            result.hauptantragsteller.push('elterngeld_nachweis');
          }

          if (financialData.hasbusinessincome === true || financialData.hasagricultureincome === true) {
            result.hauptantragsteller.push('guv_euer_nachweis');
          }

          /*if (userData?.employment && ['apprentice', 'student', 'pupil'].includes(userData.employment)) {
            result.hauptantragsteller.push('ausbildungsfoerderung_nachweis');
          }*/
       }

        // Additional applicants financial documents - UUID-based structure
        if (financialData.additional_applicants_financials) {
          const additionalFinancialsData = financialData.additional_applicants_financials;
          let additionalFinancialsObj: Record<string, any> = {};
          
          // Handle backwards compatibility: convert array to UUID-based object if needed
          if (Array.isArray(additionalFinancialsData)) {
            console.log('Converting financial data from legacy array format');
            // Legacy array format - match by index to UUID
            const personUuids = Object.keys(userData?.weitere_antragstellende_personen || {});
            additionalFinancialsData.forEach((fin: any, index: number) => {
              if (personUuids[index]) {
                additionalFinancialsObj[personUuids[index]] = fin;
              }
            });
          } else {
            console.log('Using UUID-based financial data format');
            // Already UUID-based object format
            additionalFinancialsObj = additionalFinancialsData;
          }

          // Process each additional applicant
          Object.entries(additionalFinancialsObj).forEach(([uuid, applicantFinancials]: [string, any]) => {
            result.additionalApplicants[uuid] = [];

            // Check employment type from weitere_antragstellende_personen
            const weiterePersonenData = userData?.weitere_antragstellende_personen || {};
            let weiterePersonenObj: Record<string, any> = {};
            
            // Handle backwards compatibility: convert array to UUID-based object if needed
            if (Array.isArray(weiterePersonenData)) {
              weiterePersonenData.forEach((person: any, index: number) => {
                const personUuid = person.id || `legacy_${index}`;
                weiterePersonenObj[personUuid] = { ...person, id: personUuid };
              });
            } else {
              weiterePersonenObj = weiterePersonenData;
            }

            const additionalApplicant = weiterePersonenObj[uuid];

            
            if(additionalApplicant?.noIncome !== true && additionalApplicant?.notHousehold !== true){
              
            if (applicantFinancials.hasSalaryIncome === true || applicantFinancials.isEarningRegularIncome === true) {
              result.additionalApplicants[uuid].push('lohn_gehaltsbescheinigungen');
            }

            if (applicantFinancials.hasrentincome === true) {
              result.additionalApplicants[uuid].push('einkommenssteuerbescheid', 'einkommenssteuererklaerung');
            }

            if (applicantFinancials.haspensionincome === true) {
              result.additionalApplicants[uuid].push('rentenbescheid');
            }

            if (applicantFinancials.hasablgincome === true) {
              result.additionalApplicants[uuid].push('arbeitslosengeldbescheid');
            }

            if ((applicantFinancials.hasSalaryIncome === true || applicantFinancials.isEarningRegularIncome === true) && 
                applicantFinancials.werbungskosten && parseFloat(applicantFinancials.werbungskosten) > 0) {
              result.additionalApplicants[uuid].push('werbungskosten_nachweis');
            }

            if (applicantFinancials.kinderbetreuungskosten && parseFloat(applicantFinancials.kinderbetreuungskosten) > 0) {
              result.additionalApplicants[uuid].push('kinderbetreuungskosten_nachweis');
            }

            if (applicantFinancials.ispayingunterhalt === true) {
              result.additionalApplicants[uuid].push('unterhaltsverpflichtung_nachweis');
            }

            if (applicantFinancials.hastaxfreeunterhaltincome === true || applicantFinancials.hastaxableunterhaltincome === true) {
              result.additionalApplicants[uuid].push('unterhaltsleistungen_nachweis');
            }

            if (hasKrankengeldIncome(applicantFinancials.othermonthlynetincome)) {
              result.additionalApplicants[uuid].push('krankengeld_nachweis');
            }

            if (applicantFinancials.haselterngeldincome === true) {
              result.additionalApplicants[uuid].push('elterngeld_nachweis');
            }

            if (applicantFinancials.hasbusinessincome === true || applicantFinancials.hasagricultureincome === true) {
              result.additionalApplicants[uuid].push('guv_euer_nachweis');
            }

            /*if (additionalApplicant?.employment?.type && ['apprentice', 'student', 'pupil'].includes(additionalApplicant.employment.type)) {
              result.additionalApplicants[uuid].push('ausbildungsfoerderung_nachweis');
            }*/
            }
            // Additional applicant disability and care level documents
            if (additionalApplicant?.behinderungsgrad && parseFloat(additionalApplicant.behinderungsgrad) > 0) {
              result.additionalApplicants[uuid].push('nachweis_disability');
            }
            
            if (additionalApplicant?.pflegegrad && parseFloat(additionalApplicant.pflegegrad) > 0) {
              result.additionalApplicants[uuid].push('pflegegrad_nachweis');
            }
          });
        }
      }

      // Sort all document lists alphabetically by title
      result.general = sortDocumentsByTitle(result.general);
      result.hauptantragsteller = sortDocumentsByTitle(result.hauptantragsteller);
      
      // Sort additional applicants documents
      Object.keys(result.additionalApplicants).forEach(uuid => {
        result.additionalApplicants[uuid] = sortDocumentsByTitle(result.additionalApplicants[uuid]);
      });

      return result;
    } catch (error) {
      console.error('Error determining required documents:', error);
      return { general: [], hauptantragsteller: [], additionalApplicants: {} };
    }
  };

  // Function to load additional documents from database
  const loadAdditionalDocuments = async (): Promise<AdditionalDocumentsByApplicant> => {
    if (!user?.id) return { general: [], hauptantragsteller: [] };

    try {
      const { data: userData, error } = await supabase
        .from('user_data')
        .select('additional_documents')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      const additionalDocs = userData?.additional_documents || {};
      
      // Check if it's already in new format (has general/hauptantragsteller keys)
      if (typeof additionalDocs === 'object' && !Array.isArray(additionalDocs) && (additionalDocs.general || additionalDocs.hauptantragsteller)) {
        const result: AdditionalDocumentsByApplicant = {
          general: additionalDocs.general || [],
          hauptantragsteller: additionalDocs.hauptantragsteller || []
        };
        
        // Add any additional applicant sections that exist
        Object.keys(additionalDocs).forEach(key => {
          if (key.startsWith('applicant_')) {
            result[key] = additionalDocs[key] || [];
          }
        });
        
        return result;
      } else {
        // Old format - migrate array to hauptantragsteller for backward compatibility
        return {
          general: [],
          hauptantragsteller: Array.isArray(additionalDocs) ? additionalDocs : []
        };
      }
    } catch (error) {
      console.error('Error loading additional documents:', error);
      return { general: [], hauptantragsteller: [] };
    }
  };

  // Function to load document status from database
  const loadDocumentStatus = async (): Promise<DocumentStatusByApplicant> => {
    if (!user?.id) return { general: {}, hauptantragsteller: {} };

    try {
      const { data: userData, error } = await supabase
        .from('user_data')
        .select('document_status')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      const documentStatus = userData?.document_status || {};
      
      // Check if it's already in the new format (has general/hauptantragsteller keys)
      if (documentStatus.general || documentStatus.hauptantragsteller) {
        // Already in new format, ensure all applicant sections exist
        const result: DocumentStatusByApplicant = {
          general: documentStatus.general || {},
          hauptantragsteller: documentStatus.hauptantragsteller || {}
        };
        
        // Add any additional applicant sections that exist
        Object.keys(documentStatus).forEach(key => {
          if (key.startsWith('applicant_')) {
            result[key] = documentStatus[key] || {};
          }
        });
        
        return result;
      } else {
        // Old format - migrate to new structure (for backward compatibility)
        console.log('Migrating old document status format to new applicant-aware format');
        return {
          general: {},
          hauptantragsteller: documentStatus // Put old format under hauptantragsteller for now
        };
      }
    } catch (error) {
      console.error('Error loading document status:', error);
      return { general: {}, hauptantragsteller: {} };
    }
  };

  // Function to get all applicants from weitere_antragstellende_personen
  const getAllApplicants = async (): Promise<{ uuid: string; name: string; number: number }[]> => {
    if (!user?.id) return [];

    try {
      const { data: userData, error } = await supabase
        .from('user_data')
        .select('weitere_antragstellende_personen')
        .eq('id', user.id)
        .single();

      if (error) return [];

      const weiterePersonenData = userData?.weitere_antragstellende_personen || {};
      let weiterePersonenObj: Record<string, any> = {};
      
      // Handle backwards compatibility: convert array to UUID-based object if needed
      if (Array.isArray(weiterePersonenData)) {
        weiterePersonenData.forEach((person: any, index: number) => {
          const personUuid = person.id || `legacy_${index}`;
          weiterePersonenObj[personUuid] = { ...person, id: personUuid };
        });
      } else {
        weiterePersonenObj = weiterePersonenData;
      }

      // Convert to array with proper numbering
      const personUuids = Object.keys(weiterePersonenObj);
      return personUuids.map((uuid, index) => {
        const person = weiterePersonenObj[uuid];
        const firstName = person.firstName || person.firstname || '';
        const lastName = person.lastName || person.lastname || '';
        const name = `${firstName} ${lastName}`.trim();
        const number = index + 2; // +2 because main applicant is 1

        return {
          uuid,
          name: name, // Return just the name, without fallback to "Person X"
          number
        };
      });
    } catch (error) {
      console.error('Error getting all applicants:', error);
      return [];
    }
  };

  // Function to generate render fields based on required documents, additional documents, and document status
  const generateRenderFields = async (
    requiredDocs: RequiredDocumentLists,
    additionalDocs: AdditionalDocumentsByApplicant,
    docStatus: DocumentStatusByApplicant
  ): Promise<DocumentFieldRender[]> => {
    const renderFields: DocumentFieldRender[] = [];

    const generateFieldsForDocumentType = async (
      documentTypeId: string, 
      category: string, 
      applicantType: 'general' | 'hauptantragsteller' | 'applicant',
      applicantUuid?: string,
      applicantNumber?: number
    ) => {
      const documentType = DOCUMENT_TYPES[documentTypeId];
      if (!documentType) return;

      // Determine which section of docStatus to look in
      let applicantKey: string;
      if (applicantType === 'general') {
        applicantKey = 'general';
      } else if (applicantType === 'hauptantragsteller') {
        applicantKey = 'hauptantragsteller';
      } else {
        applicantKey = `applicant_${applicantUuid}`;
      }

      // Get files for this document type for this specific applicant
      const files = docStatus[applicantKey]?.[documentTypeId] || [];
      const sortedFiles = files.filter(f => f.uploaded).sort((a, b) => 
        new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
      );
      
      // Determine the actual category display name
      let actualCategory: string;
      if (applicantType === 'general') {
        actualCategory = 'Allgemein';
      } else if (applicantType === 'hauptantragsteller') {
        actualCategory = 'Hauptantragsteller';
      } else if (applicantType === 'applicant' && applicantUuid) {
        // Get applicant info for display
        const applicantInfo = await getApplicantInfoCached(applicantUuid);
        if (applicantInfo) {
          // If the person has a name, display just the name
          // If no name, display "Person X"
          if (applicantInfo.name && applicantInfo.name.trim()) {
            actualCategory = applicantInfo.name;
          } else {
            actualCategory = `Person ${applicantInfo.number}`;
          }
        } else {
          actualCategory = `Person ${applicantNumber || 'X'}`;
        }
      } else {
        actualCategory = category;
      }

      if (sortedFiles.length === 0) {
        // No files uploaded - show empty main field only
        renderFields.push({
          id: `main_${applicantKey}_${documentTypeId}`,
          documentTypeId,
          title: documentType.title,
          description: documentType.description,
          category: actualCategory,
          isMainField: true,
          supports_multiple: documentType.supports_multiple,
          applicantType,
          applicantUuid,
          applicantNumber
        });

        // For supports_multiple documents, DO NOT add empty additional field when main is empty
        // Additional fields only appear after main field has content
      } else {
        // Files uploaded - show main field with oldest file
        renderFields.push({
          id: `main_${applicantKey}_${documentTypeId}`,
          documentTypeId,
          title: documentType.title,
          description: documentType.description,
          category: actualCategory,
          isMainField: true,
          uploadedFile: sortedFiles[0],
          supports_multiple: documentType.supports_multiple,
          applicantType,
          applicantUuid,
          applicantNumber
        });

        // For supports_multiple documents, show additional fields for remaining files
        if (documentType.supports_multiple) {
          for (let i = 1; i < sortedFiles.length; i++) {
            renderFields.push({
              id: `additional_${applicantKey}_${documentTypeId}_${i}`,
              documentTypeId,
              title: `Weitere ${documentType.title}`,
              description: `${documentType.description} (optional)`,
              category: actualCategory,
              isMainField: false,
              uploadedFile: sortedFiles[i],
              supports_multiple: documentType.supports_multiple,
              applicantType,
              applicantUuid,
              applicantNumber
            });
          }

          // Always add one empty additional field when main field has content
          renderFields.push({
            id: `additional_${applicantKey}_${documentTypeId}_empty`,
            documentTypeId,
            title: `Weitere ${documentType.title}`,
            description: `${documentType.description} (optional)`,
            category: actualCategory,
            isMainField: false,
            supports_multiple: documentType.supports_multiple,
            applicantType,
            applicantUuid,
            applicantNumber
          });
        }
      }
    };

    // Generate fields for required documents
    for (const docId of requiredDocs.general) {
      await generateFieldsForDocumentType(docId, 'General', 'general');
    }
    
    for (const docId of requiredDocs.hauptantragsteller) {
      await generateFieldsForDocumentType(docId, 'hauptantragsteller', 'hauptantragsteller');
    }
    
    for (const [applicantUuid, docIds] of Object.entries(requiredDocs.additionalApplicants)) {
      for (const docId of docIds) {
        await generateFieldsForDocumentType(docId, 'applicant', 'applicant', applicantUuid);
      }
    }

    // Generate fields for additional documents (user-selected) - applicant-aware
    for (const [applicantKey, docIds] of Object.entries(additionalDocs)) {
      for (const docId of docIds) {
        const documentType = DOCUMENT_TYPES[docId];
        if (documentType) {
          if (applicantKey === 'general') {
            await generateFieldsForDocumentType(docId, 'General', 'general');
          } else if (applicantKey === 'hauptantragsteller') {
            await generateFieldsForDocumentType(docId, 'hauptantragsteller', 'hauptantragsteller');
          } else if (applicantKey.startsWith('applicant_')) {
            const applicantUuid = applicantKey.split('_')[1];
            await generateFieldsForDocumentType(docId, 'applicant', 'applicant', applicantUuid);
          }
        }
      }
    }

    // Generate empty sections for all applicants who don't have any documents yet
    const allApplicants = await getAllApplicants();
    for (const applicant of allApplicants) {
      const applicantKey = `applicant_${applicant.uuid}`;
      const hasRequiredDocs = requiredDocs.additionalApplicants[applicant.uuid]?.length > 0;
      const hasAdditionalDocs = additionalDocs[applicantKey]?.length > 0;
      const hasUploadedDocs = docStatus[applicantKey] && Object.keys(docStatus[applicantKey]).length > 0;
      
      // If this applicant has no documents at all, create an empty section
      if (!hasRequiredDocs && !hasAdditionalDocs && !hasUploadedDocs) {
        // Create a placeholder field to ensure the section is rendered
        renderFields.push({
          id: `empty_${applicantKey}_placeholder`,
          documentTypeId: 'placeholder',
          title: 'Placeholder',
          description: 'This is a placeholder to ensure the section is rendered',
          category: applicant.name && applicant.name.trim() ? applicant.name : `Person ${applicant.number}`,
          isMainField: true,
          applicantType: 'applicant',
          applicantUuid: applicant.uuid,
          applicantNumber: applicant.number
        });
      }
    }

    return renderFields;
  };

  // Function to clean up and sync additional_documents with current required documents
  const cleanupAndSyncAdditionalDocuments = async (
    requiredDocs: RequiredDocumentLists,
    additionalDocs: AdditionalDocumentsByApplicant,
    docStatus: DocumentStatusByApplicant
  ): Promise<AdditionalDocumentsByApplicant> => {
    if (!user?.id) return additionalDocs;

    console.log('🧹 Cleaning up and syncing additional documents...');
    
    const cleanedAdditionalDocs = { ...additionalDocs };
    let hasChanges = false;

    // Helper function to check if a document is required for a specific applicant
    const isDocumentRequiredForApplicant = (documentId: string, applicantKey: string): boolean => {
      if (applicantKey === 'general') {
        return requiredDocs.general.includes(documentId);
      } else if (applicantKey === 'hauptantragsteller') {
        return requiredDocs.hauptantragsteller.includes(documentId);
      } else if (applicantKey.startsWith('applicant_')) {
        const applicantUuid = applicantKey.split('_')[1];
        return requiredDocs.additionalApplicants[applicantUuid]?.includes(documentId) || false;
      }
      return false;
    };

    // Helper function to check if a document has uploaded files for a specific applicant
    const hasUploadedFilesForApplicant = (documentId: string, applicantKey: string): boolean => {
      const files = docStatus[applicantKey]?.[documentId] || [];
      return files.some(file => file.uploaded);
    };

    // Process each applicant section in additional documents
    Object.entries(cleanedAdditionalDocs).forEach(([applicantKey, docIds]) => {
      if (!Array.isArray(docIds)) return;

      // Remove documents that are now required (Issue 1)
      const filteredDocIds = docIds.filter(docId => {
        const isRequired = isDocumentRequiredForApplicant(docId, applicantKey);
        if (isRequired) {
          console.log(`🗑️ Removing ${docId} from additional documents for ${applicantKey} - now required`);
          hasChanges = true;
          return false;
        }
        return true;
      });

      cleanedAdditionalDocs[applicantKey] = filteredDocIds;
    });

    // Add documents that are no longer required but have uploaded files (Issue 2)
    Object.entries(docStatus).forEach(([applicantKey, applicantDocs]) => {
      Object.keys(applicantDocs).forEach(documentId => {
        const hasUploadedFiles = hasUploadedFilesForApplicant(documentId, applicantKey);
        const isCurrentlyRequired = isDocumentRequiredForApplicant(documentId, applicantKey);
        const isCurrentlyInAdditional = cleanedAdditionalDocs[applicantKey]?.includes(documentId) || false;

        if (hasUploadedFiles && !isCurrentlyRequired && !isCurrentlyInAdditional) {
          console.log(`➕ Adding ${documentId} to additional documents for ${applicantKey} - no longer required but has files`);
          if (!cleanedAdditionalDocs[applicantKey]) {
            cleanedAdditionalDocs[applicantKey] = [];
          }
          cleanedAdditionalDocs[applicantKey].push(documentId);
          hasChanges = true;
        }
      });
    });

    // Save changes to database if any were made
    if (hasChanges) {
      try {
        const { error } = await supabase
          .from('user_data')
          .update({
            additional_documents: cleanedAdditionalDocs,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (error) {
          console.error('Error saving cleaned additional documents:', error);
          return additionalDocs; // Return original if save fails
        }

        console.log('✅ Successfully saved cleaned additional documents');
      } catch (error) {
        console.error('Error in cleanupAndSyncAdditionalDocuments:', error);
        return additionalDocs; // Return original if error occurs
      }
    }

    return cleanedAdditionalDocs;
  };

  // Main function to load all document data
  const loadDocumentRequirements = async () => {
    if (!user?.id) {
      console.error('No user ID found');
      setIsLoading(false);
      return;
    }

    try {
      console.log('🔄 Loading document requirements...');
      
      // Load all data in parallel
      const [requiredDocs, additionalDocs, docStatus] = await Promise.all([
        determineRequiredDocuments(),
        loadAdditionalDocuments(),
        loadDocumentStatus()
      ]);

      console.log('📋 Required documents:', requiredDocs);
      console.log('📋 Additional documents:', additionalDocs);
      console.log('📋 Document status:', docStatus);

      // Clean up and sync additional documents with current requirements
      const cleanedAdditionalDocs = await cleanupAndSyncAdditionalDocuments(requiredDocs, additionalDocs, docStatus);

      // Generate render fields with cleaned additional documents
      const fields = await generateRenderFields(requiredDocs, cleanedAdditionalDocs, docStatus);
      console.log('📋 Generated render fields:', fields);

      // Update state
      setRequiredDocuments(requiredDocs);
      setAdditionalDocuments(cleanedAdditionalDocs);
      setDocumentStatus(docStatus);
      setRenderFields(fields);

    } catch (error) {
      console.error('Error loading document requirements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocumentRequirements();
    fetchFormProgress();
  }, [user?.id]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debouncedProgressCalculation.current) {
        clearTimeout(debouncedProgressCalculation.current);
      }
    };
  }, []);

  // Process upload queue when it changes
  useEffect(() => {
    processUploadQueue();
  }, [uploadQueue, isProcessingQueue]);

  // Calculate document progress based on the 5-part logic
  const calculateDocumentProgress = async (fieldsToUse?: DocumentFieldRender[]): Promise<number> => {
    if (!user?.id) {
      console.log('❌ No user ID found, returning 0');
      return 0;
    }

    // Use provided fields or fall back to current renderFields state
    const fields = fieldsToUse || renderFields;



    try {
      console.log('🔄 Starting document progress calculation...');
      console.log('📊 Current form progress:', formProgress);
      console.log('📁 Render fields count:', fields.length);
      console.log('📋 Required documents:', requiredDocuments);
      console.log('📋 Additional applicants structure:', requiredDocuments.additionalApplicants);
      
      let totalProgress = 0;

      // 1. First 20% based on berechnung_woFIV_progress
      const wofivProgress = formProgress.wofiv || 0;
      const wofivContribution = (wofivProgress / 100) * 20;
      totalProgress += wofivContribution;
      //console.log(`📈 WoFIV Progress: ${wofivProgress}% → Contribution: ${wofivContribution.toFixed(1)}% → Total: ${totalProgress.toFixed(1)}%`);

      // 2. Second 20% based on berechnung_din277_progress
      const din277Progress = formProgress.din277 || 0;
      const din277Contribution = (din277Progress / 100) * 20;
      totalProgress += din277Contribution;
      //console.log(`📈 DIN277 Progress: ${din277Progress}% → Contribution: ${din277Contribution.toFixed(1)}% → Total: ${totalProgress.toFixed(1)}%`);

      // 3. Third 20% based on selbsthilfe_progress
      const selbsthilfeProgress = formProgress.selbsthilfe || 0;
      const selbsthilfeContribution = (selbsthilfeProgress / 100) * 20;
      totalProgress += selbsthilfeContribution;
      //console.log(`📈 Selbsthilfe Progress: ${selbsthilfeProgress}% → Contribution: ${selbsthilfeContribution.toFixed(1)}% → Total: ${totalProgress.toFixed(1)}%`);

      // 4. 30% based on actual document upload fields
      let documentUploadProgress = 0;
      if (fields.length > 0) {
        //console.log('📁 Analyzing document upload fields...');
        
        // Count required document fields (excluding user-added optional documents)
        const requiredFields = fields.filter(field => {
          // Check if this field is required for any applicant
          const isRequiredForGeneral = requiredDocuments.general.includes(field.documentTypeId);
          const isRequiredForHauptantragsteller = requiredDocuments.hauptantragsteller.includes(field.documentTypeId);
          const isRequiredForAdditional = Object.values(requiredDocuments.additionalApplicants).some(
            applicantDocs => applicantDocs.includes(field.documentTypeId)
          );
          
          const isRequired = isRequiredForGeneral || isRequiredForHauptantragsteller || isRequiredForAdditional;
          //console.log(`  📄 Field ${field.documentTypeId} (${field.title}): Required=${isRequired}, ApplicantType=${field.applicantType}, ApplicantUuid=${field.applicantUuid}, HasFile=${field.uploadedFile?.uploaded || false}`);
          
          return isRequired;
        });

        //console.log(`📊 Found ${requiredFields.length} required fields out of ${renderFields.length} total fields`);

        if (requiredFields.length > 0) {
          // Group fields by document type AND applicant (for additional applicants)
          const documentTypeGroups = requiredFields.reduce((groups, field) => {
            // Create unique key: for additional applicants, include applicantUuid
            let groupKey: string;
            if (field.applicantType === 'applicant' && field.applicantUuid) {
              groupKey = `${field.documentTypeId}_${field.applicantUuid}`;
            } else {
              groupKey = field.documentTypeId;
            }
            
            if (!groups[groupKey]) {
              groups[groupKey] = [];
            }
            groups[groupKey].push(field);
            return groups;
          }, {} as { [groupKey: string]: DocumentFieldRender[] });

          //console.log('📋 Document type groups:', Object.keys(documentTypeGroups));

          // Count document types that have at least one file uploaded
          const completedDocumentTypes = Object.entries(documentTypeGroups).filter(([groupKey, fields]) => {
            const hasAnyFile = fields.some(field => field.uploadedFile && field.uploadedFile.uploaded);
            //console.log(`  📄 Document group ${groupKey}: ${fields.length} fields, hasAnyFile=${hasAnyFile}`);
            
            // Log details for additional applicant fields
            fields.forEach(field => {
              if (field.applicantType === 'applicant') {
                //console.log(`    👤 Additional applicant field: ${field.documentTypeId} for ${field.applicantUuid}, hasFile=${field.uploadedFile?.uploaded || false}`);
              }
            });
            
            return hasAnyFile;
          });

          const totalDocumentTypes = Object.keys(documentTypeGroups).length;
          const completedDocumentTypesCount = completedDocumentTypes.length;
          const uploadPercentage = (completedDocumentTypesCount / totalDocumentTypes) * 100;
          documentUploadProgress = (uploadPercentage / 100) * 30;
          
          console.log(`📈 Document Upload: ${completedDocumentTypesCount}/${totalDocumentTypes} document types completed → ${uploadPercentage.toFixed(1)}% → Contribution: ${documentUploadProgress.toFixed(1)}%`);
        } else {
          console.log('⚠️ No required fields found, document upload contribution: 0%');
        }
      } else {
        console.log('⚠️ No render fields available, document upload contribution: 0%');
      }
      totalProgress += documentUploadProgress;
      console.log(`📈 After document upload: Total: ${totalProgress.toFixed(1)}%`);

      // 5. Last 10% based on all four form progress values being 100%
      const allFormProgresses = [
        formProgress.hauptantrag || 0,
        formProgress.einkommenserklarung || 0,
        formProgress.selbstauskunft || 0,
        formProgress.haushaltsauskunft || 0
      ];
      
      const totalFormProgress = allFormProgresses.reduce((sum, progress) => sum + progress, 0);
      const maxPossibleProgress = 400; // 4 forms * 100% each
      
      console.log(`📊 Form progress check: Hauptantrag=${formProgress.hauptantrag}%, Einkommenserklärung=${formProgress.einkommenserklarung}%, Selbstauskunft=${formProgress.selbstauskunft}%, Haushaltsauskunft=${formProgress.haushaltsauskunft}%`);
      console.log(`📊 Total form progress: ${totalFormProgress}/${maxPossibleProgress}`);
      
      if (totalFormProgress === maxPossibleProgress) {
        totalProgress += 10; // All forms are 100%
        console.log(`✅ All forms are 100% → Adding 10% → Total: ${totalProgress.toFixed(1)}%`);
      } else {
        console.log(`❌ Not all forms are 100% → Adding 0% → Total: ${totalProgress.toFixed(1)}%`);
      }

      const finalProgress = Math.round(totalProgress);
      console.log(`🎯 Final calculated progress: ${finalProgress}%`);
      return finalProgress;
    } catch (error) {
      console.error('❌ Error calculating document progress:', error);
      return 0;
    }
  };

  // Save document progress to database
  const saveDocumentProgress = async (progress: number) => {
    if (!user?.id) {
      console.log('❌ No user ID found, skipping save');
      return;
    }

    console.log(`💾 Attempting to save progress: ${progress}% (last saved: ${lastSavedProgress}%)`);

    // Only save if progress has changed significantly (more than 1% difference)
    if (lastSavedProgress !== null && Math.abs(progress - lastSavedProgress) < 1) {
      console.log(`⏭️ Progress change too small (${Math.abs(progress - lastSavedProgress).toFixed(1)}%), skipping save`);
      return; // No significant change, skip save
    }

    try {
      const { error } = await supabase
        .from('user_data')
        .update({
          document_progress: progress,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('❌ Error saving document progress:', error);
      } else {
        console.log(`✅ Document progress saved successfully: ${progress}%`);
        setLastSavedProgress(progress);
      }
    } catch (error) {
      console.error('❌ Error in saveDocumentProgress:', error);
    }
  };

  // Trigger progress calculation with debouncing
  const triggerProgressCalculation = () => {
    // Clear any existing timeout
    if (debouncedProgressCalculation.current) {
      clearTimeout(debouncedProgressCalculation.current);
    }
    
    // Set a new timeout to calculate progress after 500ms
    debouncedProgressCalculation.current = setTimeout(async () => {
      if (!isCalculatingProgress) {
        try {
          setIsCalculatingProgress(true);
          console.log('🔄 Triggering progress calculation after file operation...');
          const progress = await calculateDocumentProgress();
          await saveDocumentProgress(progress);
        } catch (error) {
          console.error('Error calculating progress after file operation:', error);
        } finally {
          setIsCalculatingProgress(false);
        }
      }
    }, 500);
  };

  // Handle navigation with progress calculation
  const handleNavigationWithProgress = async (targetPath: string) => {
    console.log(`🚀 Navigation triggered to: ${targetPath}`);
    
    // Prevent double calculations
    if (isCalculatingProgress) {
      console.log('⏭️ Progress calculation already in progress, skipping...');
      navigate(targetPath, { state: { from: 'document-upload' } });
      return;
    }

    try {
      setIsCalculatingProgress(true);
      
      // Add a small delay to ensure all state updates are complete
      console.log('⏳ Waiting 100ms for state updates...');
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log('🔄 Starting progress calculation...');
      const progress = await calculateDocumentProgress();
      console.log(`📊 Calculated progress: ${progress}%`);
      await saveDocumentProgress(progress);
      console.log(`🧭 Navigating to: ${targetPath}`);
      navigate(targetPath, { state: { from: 'document-upload' } });
    } catch (error) {
      console.error('❌ Error handling navigation with progress:', error);
      // Still navigate even if progress calculation fails
      navigate(targetPath, { state: { from: 'document-upload' } });
    } finally {
      setIsCalculatingProgress(false);
    }
  };

  // Track if we're currently calculating progress to prevent double calculations
  const [isCalculatingProgress, setIsCalculatingProgress] = useState(false);
  
  // Debounced progress calculation to handle multiple simultaneous operations
  const debouncedProgressCalculation = React.useRef<NodeJS.Timeout | null>(null);

  const handleFileUpload = async (fieldId: string, file: File) => {
    if (!user?.id) return;

    console.log(`📤 Uploading file: ${file.name} to field: ${fieldId}`);

    // Validate file size before starting upload
    if (!validateFileSize(file)) {
      const fileSize = formatFileSize(file.size);
      setFileSizeError({
        fileName: file.name,
        fileSize: fileSize
      });
      setShowFileSizeModal(true);
      console.log(`❌ File too large: ${file.name} (${fileSize})`);
      return; // Don't start upload
    }

    // Check if we're already uploading this field
    if (uploadingFields.includes(fieldId)) {
      console.log(`⏳ Already uploading field: ${fieldId}, skipping`);
      return;
    }

    // Add to upload queue if too many concurrent uploads
    if (uploadingFields.length >= 3) {
      console.log(`📋 Adding to upload queue: ${fieldId}`);
      setUploadQueue(prev => [...prev, fieldId]);
      return;
    }

    try {
      // Find the render field to get the document type and applicant context
      const renderField = renderFields.find(f => f.id === fieldId);
      if (!renderField) {
        console.error('Render field not found for:', fieldId);
        return;
      }

      const documentTypeId = renderField.documentTypeId;
      const applicantType = renderField.applicantType;
      const applicantUuid = renderField.applicantUuid;
      
      // Determine applicant key for storage path and data structure
      let applicantKey: string;
      if (applicantType === 'general') {
        applicantKey = 'general';
      } else if (applicantType === 'hauptantragsteller') {
        applicantKey = 'hauptantragsteller';
      } else {
        applicantKey = `applicant_${applicantUuid}`;
      }
      
      // Create file path using applicant-aware structure
      const filePath = `${user.id}/${applicantKey}/${documentTypeId}/${file.name}`;

      // Set up upload tracking
      setUploadingFields(prev => [...prev, fieldId]);
      
      // Clear any existing errors for this field when starting new upload
      removeGlobalErrorForField(renderField.title);
      
      // Initialize progress
      setUploadProgress(prev => ({ 
        ...prev, 
        [fieldId]: { loaded: 0, total: file.size, percentage: 0 } 
      }));

      // Start progress simulation immediately (runs parallel to upload)
      let progressValue = 0;
      const progressInterval = setInterval(() => {
        // Realistic progress increments that slow down as we approach completion
        const increment = progressValue < 50 ? Math.random() * 20 + 10 : 
                         progressValue < 80 ? Math.random() * 10 + 5 : 
                         Math.random() * 3 + 1;
        
        progressValue = Math.min(progressValue + increment, 95); // Never reach 100% during simulation
        
        setUploadProgress(prev => {
          if (!prev[fieldId]) return prev;
          return {
            ...prev,
            [fieldId]: {
              loaded: (progressValue / 100) * file.size,
              total: file.size,
              percentage: progressValue
            }
          };
        });
      }, 200);

      let uploadSuccess = false;
      try {
        // Upload file to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file, {
            upsert: true
          });

        if (uploadError) {
          clearInterval(progressInterval);
          throw uploadError;
        }

        uploadSuccess = true;

        // Complete the progress to 100% when upload is done
        clearInterval(progressInterval);
        setUploadProgress(prev => {
          if (!prev[fieldId]) return prev;
          return {
            ...prev,
            [fieldId]: {
              loaded: file.size,
              total: file.size,
              percentage: 100
            }
          };
        });

        // Brief delay to show 100% completion before switching to uploaded state
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        clearInterval(progressInterval);
        
        // Find the field to get a better error message
        const errorRenderField = renderFields.find(f => f.id === fieldId);
        const fieldName = errorRenderField ? errorRenderField.title : 'Dokument';
        
        // Add to global errors
        addGlobalError(fieldName);
        
        console.error('Error uploading document:', error);
        return; // Don't throw, just return so cleanup happens
      }

      // Only proceed with database update if upload was successful
      if (!uploadSuccess) {
        console.error('Upload was not successful, skipping database update');
        return;
      }

      // Final check before saving to database
      const newFileInfo: UploadedFileInfo = {
        uploaded: true,
        fileName: file.name,
        filePath: filePath,
        uploadedAt: new Date().toISOString(),
        documentId: fieldId,
        applicantType,
        applicantUuid,
        applicantNumber: renderField.applicantNumber
      };

      // FIXED: Use atomic update to prevent race conditions
      // Get the latest document_status from database to ensure we have the most recent state
      const { data: currentUserData, error: fetchError } = await supabase
        .from('user_data')
        .select('document_status')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        console.error('Error fetching current document status:', fetchError);
        // If we can't fetch current status, try to clean up the uploaded file
        try {
          await supabase.storage.from('documents').remove([filePath]);
        } catch (cleanupError) {
          console.error('Error cleaning up uploaded file after fetch failure:', cleanupError);
        }
        throw fetchError;
      }

      // Create updated document status with the latest data
      const currentDocumentStatus = currentUserData?.document_status || {};
      const updatedDocumentStatus = { ...currentDocumentStatus };
      
      // Ensure the applicant section exists
      if (!updatedDocumentStatus[applicantKey]) {
        updatedDocumentStatus[applicantKey] = {};
      }
      
      // Ensure the document type array exists for this applicant
      if (!updatedDocumentStatus[applicantKey][documentTypeId]) {
        updatedDocumentStatus[applicantKey][documentTypeId] = [];
      }
      
      updatedDocumentStatus[applicantKey][documentTypeId].push(newFileInfo);

      // Update database with atomic operation
      const { error: updateError } = await supabase
        .from('user_data')
        .update({
          document_status: updatedDocumentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating document status:', updateError);
        // If database update fails, try to clean up the uploaded file
        try {
          await supabase.storage.from('documents').remove([filePath]);
        } catch (cleanupError) {
          console.error('Error cleaning up uploaded file after database update failure:', cleanupError);
        }
        throw updateError;
      }

      // Update local state and regenerate render fields
      let newRenderFields = await generateRenderFields(requiredDocuments, additionalDocuments, updatedDocumentStatus);
      setRenderFields(newRenderFields);

      console.log(`✅ File uploaded successfully: ${file.name}`);
      
      // Calculate progress with the updated fields immediately
      const progress = await calculateDocumentProgress(newRenderFields);
      await saveDocumentProgress(progress);
      
    } catch (error) {
      console.error('Error uploading document:', error);
      
      // Find the field to get a better error message for database errors
      const errorRenderField = renderFields.find(f => f.id === fieldId);
      const fieldName = errorRenderField ? errorRenderField.title : 'Dokument';
      
      // Add to global errors for database update failures
      addGlobalError(fieldName);
    } finally {
      // Clean up upload tracking state
      setUploadingFields(prev => prev.filter(id => id !== fieldId));
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[fieldId];
        return newProgress;
      });
    }
  };

  const handleRemoveFile = async (fieldId: string) => {
    if (!user?.id) return;

    try {
      // Find the render field to get the document type and file info
      const renderField = renderFields.find(f => f.id === fieldId);
      if (!renderField?.uploadedFile) return;

      const documentTypeId = renderField.documentTypeId;
      const fileToRemove = renderField.uploadedFile;
      const applicantType = renderField.applicantType;
      const applicantUuid = renderField.applicantUuid;

      // Show loading state
      setDeletingFiles(prev => [...prev, fieldId]);

      let newRenderFields: any;
      // Determine applicant key
      let applicantKey: string;
      if (applicantType === 'general') {
        applicantKey = 'general';
      } else if (applicantType === 'hauptantragsteller') {
        applicantKey = 'hauptantragsteller';
      } else {
        applicantKey = `applicant_${applicantUuid}`;
      }

      // Delete file from storage
      const { error: deleteError } = await supabase.storage
        .from('documents')
        .remove([fileToRemove.filePath]);

      if (deleteError) throw deleteError;

      // Update document status in database
      const updatedDocumentStatus = { ...documentStatus };
      const currentFiles = updatedDocumentStatus[applicantKey]?.[documentTypeId] || [];

      // Remove the specific file from the array
      const updatedFiles = currentFiles.filter((file: UploadedFileInfo) => 
        !(file.fileName === fileToRemove.fileName && file.uploadedAt === fileToRemove.uploadedAt)
      );

      if (updatedFiles.length === 0) {
        delete updatedDocumentStatus[applicantKey][documentTypeId];
      } else {
        updatedDocumentStatus[applicantKey][documentTypeId] = updatedFiles;
      }

      const { error: updateError } = await supabase
        .from('user_data')
        .update({
          document_status: updatedDocumentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update local state and regenerate render fields
      newRenderFields = await generateRenderFields(requiredDocuments, additionalDocuments, updatedDocumentStatus);
      setRenderFields(newRenderFields);

      console.log(`✅ File removed successfully: ${fileToRemove.fileName}`);
      
      // Calculate progress with the updated fields immediately
      const progress = await calculateDocumentProgress(newRenderFields);
      await saveDocumentProgress(progress);
      
    } catch (error) {
      console.error('Error removing document:', error);
    } finally {
      // Remove loading state
      setDeletingFiles(prev => prev.filter(id => id !== fieldId));
    }
  };

  const handleDocumentClick = (fieldId: string) => {
    // Trigger file input click
    const fileInput = document.getElementById(`file-input-${fieldId}`);
    if (fileInput) fileInput.click();
  };

  const renderTooltip = (text: string) => (
    <Tooltip id="document-tooltip">
      {text}
    </Tooltip>
  );

  const openAddDocumentModal = async (category: string) => {
    // Determine applicant context from category
    if (category === 'Allgemein') {
      setCurrentModalApplicant({ type: 'general' });
    } else if (category === 'Hauptantragsteller') {
      setCurrentModalApplicant({ type: 'hauptantragsteller' });
    } else if (category.startsWith('Person')) {
      // Parse "Person X" format to find the correct UUID
      const personMatch = category.match(/Person (\d+)/);
      if (personMatch) {
        const personNumber = parseInt(personMatch[1]);
        // Get all applicants and find the one with the matching number
        const allApplicants = await getAllApplicants();
        const targetApplicant = allApplicants.find(app => app.number === personNumber);
        
        if (targetApplicant) {
          setCurrentModalApplicant({ type: 'applicant', uuid: targetApplicant.uuid });
        } else {
          console.error('Could not find applicant for person number:', personNumber);
          return; // Don't open modal if we can't determine the applicant
        }
      } else {
        console.error('Could not parse person number from category:', category);
        return; // Don't open modal if we can't parse the category
      }
    } else {
      // For named applicants (not starting with "Person"), find by name
      const allApplicants = await getAllApplicants();
      const targetApplicant = allApplicants.find(app => app.name === category);
      
      if (targetApplicant) {
        setCurrentModalApplicant({ type: 'applicant', uuid: targetApplicant.uuid });
      } else {
        console.error('Could not find applicant for name:', category);
        return; // Don't open modal if we can't determine the applicant
      }
    }
    
    setCurrentModalCategory(category);
    setShowAddDocumentModal(true);
  };

  const closeAddDocumentModal = () => {
    setShowAddDocumentModal(false);
    setCurrentModalCategory('');
    setCurrentModalApplicant({ type: 'general' });
  };

  const getModalTitle = (category: string) => {
    if (category === 'Allgemein') {
      return 'Weitere Dokumente auswählen';
    } else if (category === 'Hauptantragsteller') {
      return 'Weitere Dokumente für den Hauptantragsteller auswählen';
    } else if (category.startsWith('Person')) {
      return `Weitere Dokumente für ${category} auswählen`;
    } else {
      // For named applicants (not starting with "Person")
      return `Weitere Dokumente für ${category} auswählen`;
    }
  };

  const isDocumentAdded = (documentId: string, category: string) => {
    // Determine which applicant section to check based on currentModalApplicant
    let applicantKey: string;
    if (currentModalApplicant.type === 'general') {
      applicantKey = 'general';
    } else if (currentModalApplicant.type === 'hauptantragsteller') {
      applicantKey = 'hauptantragsteller';
    } else {
      applicantKey = `applicant_${currentModalApplicant.uuid}`;
    }

    return additionalDocuments[applicantKey]?.includes(documentId) || false;
  };

  const toggleDocument = (documentId: string, category: string) => {
    if (isDocumentAdded(documentId, category)) {
      // Check if document has files and show confirmation
      if (documentTypeHasFiles(documentId)) {
        const documentTitle = getDocumentTitle(documentId);
        setPendingDeleteAction({ 
          type: 'modal', 
          documentId, 
          documentTitle,
          applicantType: currentModalApplicant.type,
          applicantUuid: currentModalApplicant.uuid
        });
        setShowDeleteConfirmation(true);
      } else {
        // Remove the document directly if no files
        handleRemoveDocument(
          documentId, 
          true, 
          currentModalApplicant.type, 
          currentModalApplicant.uuid
        );
      }
    } else {
      // Add the document
      handleAddDocument(documentId, category);
    }
  };

  const handleAddDocument = async (documentId: string, category: string) => {
    if (!user?.id) return;

    console.log(`➕ Adding document: ${documentId} to category: ${category}`);
    
    const selectedDoc = DOCUMENT_TYPES[documentId];
    if (!selectedDoc) {
      console.error('❌ Selected document not found:', documentId);
      return;
    }

    // Determine which applicant section to add to based on currentModalApplicant
    let applicantKey: string;
    if (currentModalApplicant.type === 'general') {
      applicantKey = 'general';
    } else if (currentModalApplicant.type === 'hauptantragsteller') {
      applicantKey = 'hauptantragsteller';
    } else {
      applicantKey = `applicant_${currentModalApplicant.uuid}`;
    }

    // Add to appropriate applicant section
    const updatedAdditionalDocs = { ...additionalDocuments };
    if (!updatedAdditionalDocs[applicantKey]) {
      updatedAdditionalDocs[applicantKey] = [];
    }
    
    if (!updatedAdditionalDocs[applicantKey].includes(documentId)) {
      updatedAdditionalDocs[applicantKey] = [...updatedAdditionalDocs[applicantKey], documentId];
    }

    setAdditionalDocuments(updatedAdditionalDocs);

    // Save to database
    try {
      const { error } = await supabase
        .from('user_data')
        .update({
          additional_documents: updatedAdditionalDocs,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      // Regenerate render fields
      let newRenderFields = await generateRenderFields(requiredDocuments, updatedAdditionalDocs, documentStatus);
      setRenderFields(newRenderFields);

      // Calculate progress with the updated fields immediately
      const progress = await calculateDocumentProgress(newRenderFields);
      await saveDocumentProgress(progress);

    } catch (error) {
      console.error('Error adding document:', error);
      // Revert on error
      setAdditionalDocuments(additionalDocuments);
    }
  };

  const handleRemoveDocument = async (
    documentId: string, 
    skipConfirmation: boolean = false,
    applicantType?: 'general' | 'hauptantragsteller' | 'applicant',
    applicantUuid?: string
  ) => {
    if (!user?.id) return;

    // Check if document has uploaded files and show confirmation if needed
    if (!skipConfirmation && documentTypeHasFiles(documentId)) {
      const documentTitle = getDocumentTitle(documentId);
      setPendingDeleteAction({ type: 'document', documentId, documentTitle, applicantType, applicantUuid });
      setShowDeleteConfirmation(true);
      return;
    }

    try {
      console.log(`➖ Removing document: ${documentId} for applicant: ${applicantType} ${applicantUuid || ''}`);
      
      // Show loading state
      setDeletingDocumentTypes(prev => [...prev, documentId]);
      
      // Determine which applicant section to remove from
      let targetApplicantKey: string;
      if (applicantType === 'general') {
        targetApplicantKey = 'general';
      } else if (applicantType === 'hauptantragsteller') {
        targetApplicantKey = 'hauptantragsteller';
      } else if (applicantType === 'applicant' && applicantUuid) {
        targetApplicantKey = `applicant_${applicantUuid}`;
      } else {
        console.error('Invalid applicant context for document removal');
        return;
      }
      
      // Remove from ONLY the specific applicant section in additional documents list
      const updatedAdditionalDocs = { ...additionalDocuments };
      if (updatedAdditionalDocs[targetApplicantKey]) {
        updatedAdditionalDocs[targetApplicantKey] = updatedAdditionalDocs[targetApplicantKey].filter(id => id !== documentId);
      }
      setAdditionalDocuments(updatedAdditionalDocs);

      // Remove files for this document type from ONLY the specific applicant
      const updatedDocumentStatus = { ...documentStatus };
      let filesToDelete: string[] = [];

      // Collect files to delete from only the target applicant section
      if (updatedDocumentStatus[targetApplicantKey]?.[documentId]) {
        const files = updatedDocumentStatus[targetApplicantKey][documentId];
        filesToDelete.push(...files.map((file: UploadedFileInfo) => file.filePath));
        delete updatedDocumentStatus[targetApplicantKey][documentId];
      }

      // Delete files from storage
      if (filesToDelete.length > 0) {
        try {
          await supabase.storage.from('documents').remove(filesToDelete);
        } catch (error) {
          console.error('Error deleting files from storage:', error);
        }
      }

      setDocumentStatus(updatedDocumentStatus);

      // Save to database
      const { error } = await supabase
        .from('user_data')
        .update({
          additional_documents: updatedAdditionalDocs,
          document_status: updatedDocumentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      let newRenderFields: any;
      // Regenerate render fields
      newRenderFields = await generateRenderFields(requiredDocuments, updatedAdditionalDocs, updatedDocumentStatus);
      setRenderFields(newRenderFields);

      // Calculate progress with the updated fields immediately
      const progress = await calculateDocumentProgress(newRenderFields);
      await saveDocumentProgress(progress);

    } catch (error) {
      console.error('Error removing document:', error);
    } finally {
      // Remove loading state
      setDeletingDocumentTypes(prev => prev.filter(id => id !== documentId));
    }
  };

  const renderDocumentField = (field: DocumentFieldRender, isIndented: boolean = false, isUserAdded: boolean = false, index: number = 0) => {
    const isUploading = uploadingFields.includes(field.id);
    const progress = uploadProgress[field.id];
    const isHovered = hoveredField === field.id;
    const isFileDeleting = deletingFiles.includes(field.id);
    const isDocumentTypeDeleting = deletingDocumentTypes.includes(field.documentTypeId);

    return (
      <div key={field.id} className="position-relative">
        {isIndented && (
          <div 
            style={{
              position: 'absolute',
              left: '12px',
              top: index === 0 ? '-12px' : `${-12 - (index * 78)}px`,
              width: '20px',
              height: index === 0 ? '36px' : `${32 + (index * 78)}px`,
              borderLeft: '2px solid #d1d5db',
              borderBottom: '2px solid #d1d5db',
              borderBottomLeftRadius: '8px'
            }}
          />
        )}
        
        <OverlayTrigger placement="bottom" overlay={renderTooltip(field.description)}>
          <div 
            className={`mb-3 p-3 border rounded cursor-pointer transition-all
              ${field.uploadedFile ? 'bg-green-50 border-green-500' : 
                isUploading ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'}`}
            style={{ 
              marginLeft: isIndented ? '2rem' : '0',
              position: 'relative'
            }}
            onClick={() => !field.uploadedFile && !isUploading && handleDocumentClick(field.id)}
            onMouseEnter={() => setHoveredField(field.id)}
            onMouseLeave={() => setHoveredField('')}
          >
            <div className="d-flex justify-content-between align-items-start">
              {field.uploadedFile ? (
                <div className="flex-grow-1" style={{ position: 'relative', minHeight: '58px' }}>
                  <div 
                    style={{
                      position: 'absolute',
                      top: '6px',
                      left: '0px',
                      fontSize: '0.75rem',
                      color: '#6c757d',
                      backgroundColor: '#f0fdf4',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      zIndex: 1,
                      lineHeight: '1.2'
                    }}
                  >
                    {field.title}
                  </div>
                  <div 
                    style={{
                      paddingTop: '2rem',
                      paddingLeft: '8px',
                      paddingRight: '8px',
                      fontSize: '1rem',
                      color: '#000',
                      lineHeight: '1.3',
                      wordBreak: 'break-word'
                    }}
                  >
                    {field.uploadedFile.fileName}
                  </div>
                </div>
              ) : isUploading ? (
                <div className="flex-grow-1 d-flex align-items-center">
                  <span style={{ marginRight: '1rem' }}>
                    {field.title}
                  </span>
                  {progress && (
                    <small className="text-muted ms-2">
                      {progress.total > 1024 * 1024 
                        ? `${(progress.loaded / 1024 / 1024).toFixed(1)}MB / ${(progress.total / 1024 / 1024).toFixed(1)}MB`
                        : `${Math.round(progress.loaded / 1024)}KB / ${Math.round(progress.total / 1024)}KB`
                      }
                    </small>
                  )}
                </div>
              ) : (
                <span style={{ alignSelf: 'center' }}>{field.title}</span>
              )}
              <div className="d-flex align-items-center" style={{ alignSelf: 'center' }}>
                {field.uploadedFile ? (
                  <Button
                    variant="link"
                    className="text-danger me-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(field.id);
                    }}
                    disabled={isFileDeleting}
                  >
                    {isFileDeleting ? (
                      <div className="spinner-border spinner-border-sm text-danger" role="status" style={{ width: '24px', height: '24px' }}>
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    ) : (
                      <i className="bi bi-x-lg" style={{ fontSize: '24px' }}></i>
                    )}
                  </Button>
                ) : isUploading && progress ? (
                  <div className="me-2">
                    <CircularProgress 
                      progress={progress.percentage} 
                      size={32}
                    />
                  </div>
                ) : (
                  <i className="bi bi-upload me-2" style={{ fontSize: '24px', color: '#064497' }}></i>
                )}
                {/* Trash can for user-added documents - only on main field */}
                {isUserAdded && field.isMainField && !isUploading && (
                  <Button
                    variant="link"
                    className="text-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveDocument(
                        field.documentTypeId, 
                        false, 
                        field.applicantType, 
                        field.applicantUuid
                      );
                    }}
                    disabled={isDocumentTypeDeleting}
                  >
                    {isDocumentTypeDeleting ? (
                      <div className="spinner-border spinner-border-sm text-danger" role="status" style={{ width: '20px', height: '20px' }}>
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    ) : (
                      <i className="bi bi-trash" style={{ fontSize: '20px' }}></i>
                    )}
                  </Button>
                )}
              </div>
            </div>
            <input
              id={`file-input-${field.id}`}
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(field.id, file);
              }}
              style={{ display: 'none' }}
              disabled={isUploading}
            />
          </div>
        </OverlayTrigger>
      </div>
    );
  };

  // Function to get applicant information for display
  const getApplicantInfo = async (applicantUuid: string): Promise<{ name: string; number: number } | null> => {
    if (!user?.id) return null;

    try {
      const { data: userData, error } = await supabase
        .from('user_data')
        .select('weitere_antragstellende_personen')
        .eq('id', user.id)
        .single();

      if (error) return null;

      const weiterePersonenData = userData?.weitere_antragstellende_personen || {};
      let weiterePersonenObj: Record<string, any> = {};
      
      // Handle backwards compatibility: convert array to UUID-based object if needed
      if (Array.isArray(weiterePersonenData)) {
        weiterePersonenData.forEach((person: any, index: number) => {
          const personUuid = person.id || `legacy_${index}`;
          weiterePersonenObj[personUuid] = { ...person, id: personUuid };
        });
      } else {
        weiterePersonenObj = weiterePersonenData;
      }

      const person = weiterePersonenObj[applicantUuid];
      if (!person) return null;

      // Get the person number by finding their position in the array
      const personUuids = Object.keys(weiterePersonenObj);
      const personIndex = personUuids.indexOf(applicantUuid);
      const personNumber = personIndex + 2; // +2 because main applicant is 1

      const firstName = person.firstName || person.firstname || '';
      const lastName = person.lastName || person.lastname || '';
      const name = `${firstName} ${lastName}`.trim();

      return {
        name: name, // Return just the name, without fallback to "Person X"
        number: personNumber
      };
    } catch (error) {
      console.error('Error getting applicant info:', error);
      return null;
    }
  };

  // Function to get applicant information for display (cached version)
  const [applicantInfoCache, setApplicantInfoCache] = useState<Record<string, { name: string; number: number }>>({});

  const getApplicantInfoCached = async (applicantUuid: string): Promise<{ name: string; number: number } | null> => {
    if (applicantInfoCache[applicantUuid]) {
      return applicantInfoCache[applicantUuid];
    }

    const info = await getApplicantInfo(applicantUuid);
    if (info) {
      setApplicantInfoCache(prev => ({ ...prev, [applicantUuid]: info }));
    }
    return info;
  };

  if (isLoading) {
    return (
      <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" 
           style={{ 
             backgroundColor: 'rgba(255, 255, 255, 0.9)', 
             zIndex: 9999 
           }}>
        <div className="text-center">
          <Spinner animation="border" role="status" style={{ width: '3rem', height: '3rem', color: '#064497' }}>
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <div className="mt-3" style={{ color: '#064497' }}>Bitte warten...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-white">
      <style>
        {`
          .delete-confirmation-backdrop {
            z-index: 1069 !important;
          }
        `}
      </style>

      {/* Delete Confirmation Modal */}
      <Modal 
        show={showDeleteConfirmation} 
        onHide={() => setShowDeleteConfirmation(false)} 
        centered
        style={{ zIndex: 1070 }}
        backdropClassName="delete-confirmation-backdrop"
      >
        <Modal.Header closeButton>
          <Modal.Title>Dokument entfernen</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Wenn Sie <strong>{pendingDeleteAction?.documentTitle}</strong> entfernen, 
            werden auch alle Dokumente gelöscht, die Sie für dieses Element hochgeladen haben.
          </p>
          <p className="mb-0">
            Möchten Sie fortfahren?
          </p>
        </Modal.Body>
        <Modal.Footer>
          <div className="d-flex justify-content-between gap-3 w-100">
            <Button
              onClick={() => setShowDeleteConfirmation(false)}
              className="flex-grow-1 py-2"
              style={{ backgroundColor: '#D7DAEA', border: 'none', color: 'black' }}
            >
              Abbrechen
            </Button>
            <Button
              onClick={() => {
                if (pendingDeleteAction) {
                  handleRemoveDocument(
                    pendingDeleteAction.documentId, 
                    true,
                    pendingDeleteAction.applicantType,
                    pendingDeleteAction.applicantUuid
                  );
                  setShowDeleteConfirmation(false);
                  setPendingDeleteAction(null);
                }
              }}
              className="flex-grow-1 py-2"
              style={{ backgroundColor: '#064497', border: 'none' }}
            >
              Löschen
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      <Modal show={showAddDocumentModal} onHide={closeAddDocumentModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{getModalTitle(currentModalCategory)}</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {(() => {
            // Determine target category based on current modal category and applicant type
            let targetCategory = 'General';
            if (currentModalCategory === 'Allgemein') {
              targetCategory = 'General';
            } else if (currentModalCategory === 'Hauptantragsteller' || currentModalCategory.startsWith('Person') || currentModalApplicant.type === 'applicant') {
              targetCategory = 'Applicant';
            }

            // Get documents that are currently required by the system for THIS SPECIFIC applicant only
            let systemRequiredDocumentsForCurrentApplicant: string[] = [];
            
            if (currentModalApplicant.type === 'general') {
              systemRequiredDocumentsForCurrentApplicant = requiredDocuments.general;
            } else if (currentModalApplicant.type === 'hauptantragsteller') {
              systemRequiredDocumentsForCurrentApplicant = requiredDocuments.hauptantragsteller;
            } else if (currentModalApplicant.type === 'applicant' && currentModalApplicant.uuid) {
              systemRequiredDocumentsForCurrentApplicant = requiredDocuments.additionalApplicants[currentModalApplicant.uuid] || [];
            }

            // Filter documents for this category that aren't already required by system FOR THIS APPLICANT
            const availableDocuments = Object.values(DOCUMENT_TYPES).filter(doc => {
              const isInTargetCategory = doc.category === targetCategory;
              const isNotSystemRequired = !systemRequiredDocumentsForCurrentApplicant.includes(doc.id);
              
              return isInTargetCategory && isNotSystemRequired;
            });

            // Sort available documents alphabetically by title
            const sortedAvailableDocuments = availableDocuments.sort((a, b) => 
              a.title.localeCompare(b.title, 'de', { sensitivity: 'base' })
            );

            return (
              <div>
                {sortedAvailableDocuments.map((doc) => {
                  const isAdded = isDocumentAdded(doc.id, currentModalCategory);
                  
                  return (
                    <div key={doc.id} className="mb-3 p-3 border rounded">
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center gap-2 flex-grow-1">
                          <span className="fw-medium">{doc.title}</span>
                          <OverlayTrigger placement="right" overlay={renderTooltip(doc.description)}>
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
                        <Button
                          onClick={() => toggleDocument(doc.id, currentModalCategory)}
                          className="rounded-circle p-0 d-flex align-items-center justify-content-center"
                          style={{
                            width: '32px',
                            height: '32px',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            backgroundColor: isAdded ? '#FEF1F1' : '#D7DAEA',
                            borderColor: isAdded ? '#970606' : '#064497',
                            color: isAdded ? '#970606' : '#064497'
                          }}
                          disabled={deletingDocumentTypes.includes(doc.id)}
                        >
                          {deletingDocumentTypes.includes(doc.id) ? (
                            <div className="spinner-border spinner-border-sm" role="status" style={{ width: '16px', height: '16px' }}>
                              <span className="visually-hidden">Loading...</span>
                            </div>
                          ) : (
                            isAdded ? '×' : '+'
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={closeAddDocumentModal} style={{ backgroundColor: '#064497', border: 'none' }}>
            Schließen
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Document Guide Modal */}
      <Modal show={showDocumentGuideModal} onHide={() => setShowDocumentGuideModal(false)} size="xl" fullscreen>
        <Modal.Header closeButton>
          <Modal.Title>Übersicht zur Ermittlung der erforderlichen Dokumente</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          <div className="row">
            <div className="col-12">
              <h4 className="ml-4 mb-4 text-[#064497] font-semibold" style={{ fontSize: '1.2rem' }}>Allgemeine Dokumente</h4>
              
              <div style={{ marginLeft: '2rem' }}>
                {(() => {
                  // Define general documents with their descriptions
                  const generalDocuments = [
                    { title: 'Baugenehmigung oder Vorbescheid', description: 'Wird benötigt bei Neubau, Ersterwerb, oder Nutzungsänderung wenn eine Baugenehmigung erforderlich ist.' },
                    { title: 'Bauzeichnung', description: 'Wird benötigt bei Neubau-Projekten (im Maßstab 1:100 mit eingezeichneter Möbelstellung). Dieses Dokument ist für Ersterwerbvorhaben erforderlich, wenn ein Zusatzdarlehen für Barrierefreiheit beantragt wird.' },
                    { title: 'Darlehenszusage(n)', description: 'Wird benötigt wenn Fremddarlehen im Finanzierungsplan angegeben wurden. Bei Ergänzungsdarlehen sind die Zusagen zu bereits gewährten Darlehen der NRW.BANK vorzulegen.' },
                    { title: 'Entwurf des Kaufvertrags', description: 'Wird benötigt bei Ersterwerb oder Bestandserwerb.' },
                    { title: 'Erbbaurechtsvertrag', description: 'Wird benötigt wenn Erbbaurecht besteht.' },
                    { title: 'Erklärung der Bergbaugesellschaft', description: 'Wird benötigt bei Neuubau, Ersterwerb, oder Nutzungsänderung wenn das Objekt im Bergsenkungsgebiet liegt.' },
                    { title: 'Grundbuchblattkopie', description: 'Wird benötigt wenn Eigentumsverhältnisse angegeben wurden (nach neuestem Stand).' },
                    { title: 'Grundstückskaufvertrag/Entwurf des Kaufvertrags', description: 'Wird benötigt bei Neubau-Projekten.' },
                    { title: 'Lageplan', description: 'Wird benötigt bei Neubau-Projekten nach den Vorschriften Bau NRW (2018).' },
                    { title: 'Meldebescheinigung', description: 'Wird immer benötigt für alle Personen, die das Förderobjekt nach Fertigstellung beziehen sollen.' },
                    { title: 'Nachweis Eigenkapital', description: 'Wird immer benötigt für die im Finanzierungsplan ausgewiesenen Eigenkapitalmittel.' },
                    { title: 'Nachweis für standortbedingte Mehrkosten', description: 'Wird benötigt wenn ein Darlehen für standortbedingte Mehrkosten angegeben wurde.' },
                    { title: 'Nachweis: Zusatzdarlehen für BEG Effizienzstandard 40', description: 'Wird benötigt wenn ein Zusatzdarlehen für BEG Effizienzstandard 40 angegeben wurde.' },
                    { title: 'Nachweis: Zusatzdarlehen für Bauen mit Holz', description: 'Wird benötigt wenn ein Zusatzdarlehen für Bauen mit Holz angegeben wurde.' },
                    { title: 'Schwangerschafts Nachweis', description: 'Wird benötigt falls sich eine der Antragstellenden in Schwangerschaft befindet.' },
                    { title: 'Vollmachtsurkunde', description: 'Wird benötigt wenn eine bevollmächtigte Person oder Firma angegeben wurde.' },
                    { title: 'Heiratsurkunde/Lebenspartnerschaftsurkunde', description: 'Wird benötigt wenn der Antragsteller verheiratet ist oder in einer Lebenspartnerschaft lebt.' }
                  ];

                  // Sort alphabetically by title
                  generalDocuments.sort((a, b) => a.title.localeCompare(b.title, 'de', { sensitivity: 'base' }));

                  return generalDocuments.map((doc, index) => (
                    <div key={index} className="mb-4">
                      <h6 className="fw-bold">{doc.title}</h6>
                      <p className="text-muted">{doc.description}</p>
                    </div>
                  ));
                })()}
              </div>

              <hr className="my-5" />

              <h5 className="ml-4 mb-4 text-[#064497] font-semibold" style={{ fontSize: '1.2rem'}}>Antragsteller-spezifische Dokumente</h5>
              <div style={{ marginLeft: '2rem' }}>
                {(() => {
                  // Define applicant-specific documents with their descriptions
                  const applicantDocuments = [
                    { title: 'Arbeitslosengeldbescheid', description: 'Wird benötigt wenn der Antragsteller / das Haushaltsmitglied Arbeitslosengeld bezieht.' },
                    { title: 'Gewinn- und Verlustrechnung (GuV)/Einnahmenüberschussrechnung (EÜR)', description: 'Wird benötigt wenn der Antragsteller / das Haushaltsmitglied Einkünfte aus Gewerbebetrieb oder Land- und Forstwirtschaft hat.' },
                    { title: 'Leistungen der Ausbildungsförderung (BAföG, Berufsausbildungsbeihilfe SGB III)', description: 'Wird benötigt wenn der Antragsteller / das Haushaltsmitglied Auszubildender, Student oder Schüler ist und eine Ausbildungsförderung beantragt.' },
                    { title: 'Letzter Einkommenssteuerbescheid', description: 'Wird benötigt wenn der Antragsteller / das Haushaltsmitglied weitere selbständige Einkünfte wie Mieteinnahmen hat.' },
                    { title: 'Letzte Einkommenssteuererklärung', description: 'Wird benötigt wenn der Antragsteller / das Haushaltsmitglied weitere selbständige Einkünfte wie Mieteinnahmen hat.' },
                    { title: 'Lohn-/Gehaltsbescheinigungen', description: 'Wird benötigt wenn der Antragsteller / das Haushaltsmitglied ein regelmäßiges Gehalt oder Einkommen bezieht.' },
                    { title: 'Nachweis Elterngeld', description: 'Wird benötigt wenn der Antragsteller / das Haushaltsmitglied Elterngeld erhält.' },
                    { title: 'Nachweis Kinderbetreuungskosten', description: 'Wird benötigt wenn der Antragsteller / das Haushaltsmitglied Kinderbetreuungskosten hat.' },
                    { title: 'Nachweis Krankengeld', description: 'Wird benötigt wenn der Antragsteller / das Haushaltsmitglied Krankengeld bezieht. Bitte fügen Sie die Bescheinigung des Krankengeldes ein falls Sie dieses in der Einkommenserklärung oder Selbstauskunft unter sonstige Einkünfte ausgewiesen haben.' },
                    { title: 'Nachweis Unterhaltsleistungen', description: 'Wird benötigt wenn der Antragsteller / das Haushaltsmitglied Unterhaltsleistungen oder Unterhaltsvorschuss erhält.' },
                    { title: 'Nachweis Unterhaltsverpflichtung', description: 'Wird benötigt wenn der Antragsteller / das Haushaltsmitglied Unterhaltszahlungen leistet.' },
                    { title: 'Nachweis über die Schwerbehinderteneigenschaft/GdB', description: 'Wird benötigt wenn der Antragsteller / das Haushaltsmitglied einen Behinderungsgrad größer als 0 hat.' },
                    { title: 'Nachweis der Pflegebedürftigkeit', description: 'Wird benötigt wenn der Antragsteller / das Haushaltsmitglied einen Pflegegrad größer als 0 hat.' },
                    { title: 'Nachweis Werbungskosten', description: 'Wird benötigt wenn der Antragsteller / das Haushaltsmitglied erhöhte Werbungskosten hat und ein Gehalt bezieht.' },
                    { title: 'Rentenbescheid/Versorgungsbezüge', description: 'Wird benötigt wenn der Antragsteller / das Haushaltsmitglied Renten- oder Versorgungsbezüge erhält.' },
                    { title: 'Sonstige Dokumente', description: 'Weitere relevante Dokumente können optional hinzugefügt werden.' }
                  ];

                  // Sort alphabetically by title
                  applicantDocuments.sort((a, b) => a.title.localeCompare(b.title, 'de', { sensitivity: 'base' }));

                  return applicantDocuments.map((doc, index) => (
                    <div key={index} className="mb-4">
                      <h6 className="fw-bold">{doc.title}</h6>
                      <p className="text-muted">{doc.description}</p>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={() => setShowDocumentGuideModal(false)} style={{ backgroundColor: '#064497', border: 'none' }}>
            Schließen
          </Button>
        </Modal.Footer>
      </Modal>

      {/* File Size Error Modal */}
      <Modal show={showFileSizeModal} onHide={() => setShowFileSizeModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="d-flex align-items-center">
            <i className="bi bi-exclamation-triangle-fill text-danger me-2"></i>
            Datei zu groß
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-3">
            Die gewählte Datei ist zu groß für den Upload.
          </p>
          <div className="mb-3">
            <div><strong>Dateiname:</strong> {fileSizeError.fileName}</div>
            <div><strong>Dateigröße:</strong> {fileSizeError.fileSize}</div>
            <div><strong>Maximale Größe:</strong> 50 MB</div>
          </div>
          <p className="mb-0">
            Bitte wählen Sie eine kleinere Datei aus oder komprimieren Sie die Datei vor dem Upload.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            onClick={() => setShowFileSizeModal(false)} 
            style={{ backgroundColor: '#064497', border: 'none' }}
          >
            Verstanden
          </Button>
        </Modal.Footer>
      </Modal>

      <Container className="pt-16">
        <div className="text-center mb-5">
          <h2 className="text-[#064497] text-3xl mb-4">Dokument Übersicht</h2>
          <p className="text-lg">
            Klicken Sie auf die Felder, um die jeweiligen Dokumente hochzuladen.
          </p>
        </div>

        <Row className="mb-5">
          <Col>
            <h3 className="mb-4 text-[#000000] font-semibold italic">
              Verpflichtende Dokumente zum ausfüllen
            </h3>
            <p className="mb-4">
              Bitte füllen Sie die folgenden drei Formulare aus, damit wir diese digital prüfen können.
            </p>
            {formSections.map((section, index) => (
              <div key={index} className="d-flex align-items-center mb-4">
                <Button
                  className="py-3 me-3"
                  style={{ 
                    backgroundColor: '#064497', 
                    border: 'none',
                    width: 'calc(100% - 55px - 1rem)'
                  }}
                  onClick={async () => {
                    if (index === 0) {
                      // Navigate to WoFIV form for first button
                      await handleNavigationWithProgress('/wofiv');
                    } else if (index === 1) {
                      // Navigate to DIN 277 form for second button
                      await handleNavigationWithProgress('/din277');
                    } else if (index === 2) {
                      // Navigate to Selbsthilfe form for third button
                      await handleNavigationWithProgress('/selbsthilfe');
                    }
                  }}
                >
                  {section.title}
                </Button>
                <div className="border rounded-circle p-2 d-flex align-items-center justify-content-center" 
                     style={{ width: '55px', height: '55px', color: '#064497', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}>
                  {section.progress}%
                </div>
              </div>
            ))}
          </Col>
        </Row>

        <div className="mb-5">
          <h3 className="mb-4 text-[#000000] font-semibold italic">
            Bitte Laden Sie folgende Dokumente hoch
          </h3>
          
          {/* Warning box for incomplete forms */}
          {[formProgress.hauptantrag, formProgress.einkommenserklarung, formProgress.selbstauskunft, formProgress.haushaltsauskunft].some(progress => progress < 100) && (
            <div className="mb-4 p-4 rounded" style={{
              backgroundColor: '#fff3cd',
              border: '1px solid #ffeaa7',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}>
              <div className="d-flex align-items-start">
                <i 
                  className="bi bi-exclamation-triangle-fill me-3" 
                  style={{ 
                    fontSize: '1.25rem',
                    color: '#856404',
                    marginTop: '0.125rem',
                    flexShrink: 0
                  }}
                ></i>
                <div>
                  <h6 className="mb-2" style={{ color: '#856404', fontWeight: '600' }}>
                    Hinweis zu den erforderlichen Dokumenten
                  </h6>
                  <p className="mb-0" style={{ 
                    color: '#856404', 
                    fontSize: '0.95rem',
                    lineHeight: '1.5'
                  }}>
                    Die angezeigten Dokumente basieren auf Ihren Angaben in den Antragsformularen. 
                    Da nicht alle Formulare vollständig ausgefüllt sind, könnten weitere erforderliche 
                    Dokumente fehlen. Wir empfehlen, zuerst alle Antragsformulare zu vervollständigen, 
                    um eine vollständige Übersicht der benötigten Unterlagen zu erhalten.
                  </p>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setShowDocumentGuideModal(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#064497',
                        textDecoration: 'underline',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        padding: '0'
                      }}
                    >
                      Übersicht zur Ermittlung der erforderlichen Dokumente
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Global Error Display */}
          {globalErrors.length > 0 && (
            <div className="mb-4">
              {globalErrors.map((error, index) => (
                <div 
                  key={index} 
                  className="d-flex align-items-start justify-content-between"
                  style={{
                    backgroundColor: '#fef2f2',
                    border: '2px solid #f87171',
                    borderRadius: '0.75rem',
                    padding: '1rem 1.25rem',
                    marginBottom: '0.75rem',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <div className="d-flex align-items-start" style={{ flex: 1 }}>
                    <i 
                      className="bi bi-exclamation-triangle-fill text-danger me-3" 
                      style={{ 
                        fontSize: '1.25rem',
                        marginTop: '0.125rem',
                        flexShrink: 0
                      }}
                    ></i>
                    <div style={{ flex: 1 }}>
                      <span 
                        style={{ 
                          color: '#dc2626', 
                          fontSize: '1rem',
                          lineHeight: '1.5',
                          fontWeight: '500',
                          display: 'block'
                        }}
                      >
                        {error}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeGlobalError(error)}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      fontSize: '1.5rem',
                      color: '#dc2626',
                      cursor: 'pointer',
                      padding: '0',
                      marginLeft: '1rem',
                      lineHeight: '1',
                      fontWeight: 'bold',
                      flexShrink: 0
                    }}
                    title="Fehlermeldung schließen"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {(() => {
            const groupedFields = renderFields.reduce((groups, field) => {
              const category = field.category || 'General';
              if (!groups[category]) {
                groups[category] = [];
              }
              groups[category].push(field);
              return groups;
            }, {} as Record<string, DocumentFieldRender[]>);

            return Object.entries(groupedFields).map(([category, categoryFields]) => {
              // Filter out placeholder fields
              const realFields = categoryFields.filter(f => f.documentTypeId !== 'placeholder');
              const mainFields = realFields.filter(f => f.isMainField);
              const additionalFields = realFields.filter(f => !f.isMainField);

              const groupedAdditionalFields = additionalFields.reduce((groups, field) => {
                if (!groups[field.documentTypeId]) {
                  groups[field.documentTypeId] = [];
                }
                groups[field.documentTypeId].push(field);
                return groups;
              }, {} as Record<string, DocumentFieldRender[]>);

              // Helper function to check if a document is required for a specific field
              const isDocumentRequiredForField = (field: DocumentFieldRender): boolean => {
                if (field.applicantType === 'general') {
                  return requiredDocuments.general.includes(field.documentTypeId);
                } else if (field.applicantType === 'hauptantragsteller') {
                  return requiredDocuments.hauptantragsteller.includes(field.documentTypeId);
                } else if (field.applicantType === 'applicant' && field.applicantUuid) {
                  return requiredDocuments.additionalApplicants[field.applicantUuid]?.includes(field.documentTypeId) || false;
                }
                return false;
              };

              // Helper function to check if a document is in additional documents for a specific field
              const isDocumentInAdditionalForField = (field: DocumentFieldRender): boolean => {
                if (field.applicantType === 'general') {
                  return additionalDocuments.general?.includes(field.documentTypeId) || false;
                } else if (field.applicantType === 'hauptantragsteller') {
                  return additionalDocuments.hauptantragsteller?.includes(field.documentTypeId) || false;
                } else if (field.applicantType === 'applicant' && field.applicantUuid) {
                  const applicantKey = `applicant_${field.applicantUuid}`;
                  return additionalDocuments[applicantKey]?.includes(field.documentTypeId) || false;
                }
                return false;
              };

              // Separate system-required from user-added documents
              const systemRequiredFields = mainFields.filter(field => {
                // Check if this document is in additional documents for this specific field
                const isUserAdded = isDocumentInAdditionalForField(field);
                
                // If it's user-added, it's not system required
                if (isUserAdded) return false;
                
                // Otherwise, check if it's system required for this field
                return isDocumentRequiredForField(field);
              });
              
              const userAddedFields = mainFields.filter(field => {
                // Check if this document is in additional documents for this specific field
                return isDocumentInAdditionalForField(field);
              });

              // Check if this is an empty section (has placeholder but no real fields)
              const hasPlaceholder = categoryFields.some(f => f.documentTypeId === 'placeholder');
              const isEmptySection = hasPlaceholder && mainFields.length === 0;

              return (
                <div key={category} className="mb-4">
                  {renderSectionHeader(category, category)}
                  
                  {expandedSection === category && (
                    <div className="section-content" style={{ padding: '0 1rem 1rem 1rem' }}>
                      
                      {!isEmptySection && (
                        <>
                          {/* System Required Documents Section */}
                          {systemRequiredFields.length > 0 && (
                            <>
                              {userAddedFields.length > 0 && (
                                <div className="mb-4">
                                  <h5 className="text-[#064497] font-regular mb-3" style={{ fontSize: '1rem' }}>
                                    Verpflichtende Dokumente
                                  </h5>
                                  <hr className="mb-3" style={{ borderColor: '#D7DAEA', borderWidth: '1px' }} />
                                </div>
                              )}
                              
                              {systemRequiredFields.map((mainField) => (
                                <div key={mainField.id}>
                                  {renderDocumentField(mainField, false)}
                                  {groupedAdditionalFields[mainField.documentTypeId]?.map((additionalField, index) => 
                                    renderDocumentField(additionalField, true, false, index)
                                  )}
                                </div>
                              ))}
                            </>
                          )}
                          
                          {/* User Added Optional Documents Section */}
                          {userAddedFields.length > 0 && (
                            <>
                              <div className="mb-4 mt-5">
                                <h5 className="text-[#064497] font-regular mb-3" style={{ fontSize: '1rem' }}>
                                  Optionale Dokumente
                                </h5>
                                <hr className="mb-3" style={{ borderColor: '#D7DAEA', borderWidth: '1px' }} />
                              </div>
                              
                              {userAddedFields.map((mainField) => (
                                <div key={mainField.id}>
                                  {renderDocumentField(mainField, false, true)}
                                  {groupedAdditionalFields[mainField.documentTypeId]?.map((additionalField, index) => 
                                    renderDocumentField(additionalField, true, true, index)
                                  )}
                                </div>
                              ))}
                            </>
                          )}
                        </>
                      )}
                      
                      <div className="mb-3">
                        <Button
                          onClick={async () => await openAddDocumentModal(category)}
                          className="w-100"
                          style={{ 
                            backgroundColor: '#D7DAEA', 
                            border: '1px solid #064497', 
                            color: '#064497' 
                          }}
                        >
                          <i className="bi bi-plus-circle me-2"></i>
                          Weitere Dokumente hinzufügen
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>

        <div className="text-center mb-5 d-flex justify-content-center gap-3">
          <Button
            onClick={() => handleNavigationWithProgress('/personal-space')}
            className="px-5 py-2 w-100"
            style={{ backgroundColor: '#064497', border: 'none' }}
          >
            ZURÜCK
          </Button>
        </div>
      </Container>
    </div>
  );
};

export default DocumentUpload; 