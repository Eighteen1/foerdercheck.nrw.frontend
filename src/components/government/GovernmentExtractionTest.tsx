import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import { supabase } from '../../lib/supabase';
import { documentValueService } from '../../services/documentValueService';
import { DocumentExtractionProcessor } from '../../services/documentExtractionProcessor';

interface DocumentFile {
  fileName: string;
  filePath: string;
  uploaded: boolean;
  uploadedAt: string;
  documentId: string;
  applicantType: 'general' | 'hauptantragsteller' | 'applicant';
  applicantUuid?: string;
}

interface CategoryDocuments {
  [categoryKey: string]: {
    [docTypeId: string]: DocumentFile[];
  };
}

interface ApplicantInfo {
  uuid: string;
  name: string;
  type: 'general' | 'hauptantragsteller' | 'applicant';
}

interface ValueType {
  id: string;
  label: string;
  documentTypes: string[];
  description: string;
}

const VALUE_TYPES: ValueType[] = [
  {
    id: 'monthlynetsalary',
    label: 'Monatliches Nettoeinkommen',
    documentTypes: ['lohn_gehaltsbescheinigungen'],
    description: 'Nettolohn aus Gehaltsabrechnung'
  },
  {
    id: 'weihnachtsgeld_next12_net',
    label: 'Weihnachtsgeld (nächste 12 Monate)',
    documentTypes: ['lohn_gehaltsbescheinigungen'],
    description: 'Weihnachtsgeld aus Gehaltsabrechnung'
  },
  {
    id: 'urlaubsgeld_next12_net',
    label: 'Urlaubsgeld (nächste 12 Monate)',
    documentTypes: ['lohn_gehaltsbescheinigungen'],
    description: 'Urlaubsgeld aus Gehaltsabrechnung'
  },
  {
    id: 'otheremploymentmonthlynetincome',
    label: 'Sonstige Einkünfte aus nichtselbstständiger Arbeit',
    documentTypes: ['lohn_gehaltsbescheinigungen'],
    description: 'Sonstige Einkünfte aus Gehaltsabrechnung'
  },
  {
    id: 'incomebusiness',
    label: 'Einkünfte aus Gewerbebetrieb',
    documentTypes: ['guv_euer_nachweis'],
    description: 'Gewinn aus GuV/EÜR'
  },
  {
    id: 'incomeagriculture',
    label: 'Einkünfte aus Land-/Forstwirtschaft',
    documentTypes: ['guv_euer_nachweis'],
    description: 'Gewinn aus GuV/EÜR'
  },
  {
    id: 'incomerent',
    label: 'Einkünfte aus Vermietung und Verpachtung',
    documentTypes: ['einkommenssteuerbescheid', 'einkommenssteuererklaerung'],
    description: 'Mieteinnahmen aus Steuerbescheid/Steuererklärung'
  },
  {
    id: 'incomepension',
    label: 'Einkünfte aus Renten/Versorgungsbezügen',
    documentTypes: ['rentenbescheid'],
    description: 'Rente aus Rentenbescheid'
  },
  {
    id: 'incomeablg',
    label: 'Arbeitslosengeld',
    documentTypes: ['arbeitslosengeldbescheid'],
    description: 'Arbeitslosengeld aus Bescheid'
  },
  {
    id: 'incomeunterhalttaxfree',
    label: 'Steuerfreie Unterhaltsleistungen',
    documentTypes: ['unterhaltsleistungen_nachweis'],
    description: 'Steuerfreier Unterhalt aus Nachweis'
  },
  {
    id: 'incomeunterhalttaxable',
    label: 'Steuerpflichtige Unterhaltsleistungen',
    documentTypes: ['unterhaltsleistungen_nachweis'],
    description: 'Steuerpflichtiger Unterhalt aus Nachweis'
  },
  {
    id: 'werbungskosten',
    label: 'Werbungskosten',
    documentTypes: ['werbungskosten_nachweis'],
    description: 'Werbungskosten aus Nachweis'
  },
  {
    id: 'kinderbetreuungskosten',
    label: 'Kinderbetreuungskosten',
    documentTypes: ['kinderbetreuungskosten_nachweis'],
    description: 'Kinderbetreuungskosten aus Nachweis'
  },
  {
    id: 'unterhaltszahlungen',
    label: 'Unterhaltszahlungen',
    documentTypes: ['unterhaltsverpflichtung_nachweis'],
    description: 'Unterhaltszahlungen aus Nachweis'
  }
];

const DOCUMENT_LABELS: Record<string, string> = {
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
  'guv_euer_nachweis': 'Gewinn- und Verlustrechnung (GuV)/EÜR',
  'ausbildungsfoerderung_nachweis': 'Leistungen der Ausbildungsförderung',
  'sonstige_dokumente': 'Sonstige Dokumente',
  'nachweis_darlehen': 'Darlehenszusage(n)',
  'eigenkapital_nachweis': 'Nachweis Eigenkapital',
  'nachweis_disability': 'Nachweis über die Schwerbehinderteneigenschaft/GdB',
  'pflegegrad_nachweis': 'Nachweis der Pflegebedürftigkeit',
  'freiwillige_krankenversicherung_nachweis': 'Nachweis über freiwillige Beiträge zur Krankenversicherung',
  'freiwillige_versicherungsbeitraege_nachweis': 'Nachweis über freiwillige Renten- und Lebensversicherungsbeiträge'
};

const GovernmentExtractionTest: React.FC = () => {
  const [residentId, setResidentId] = useState<string>('');
  const [applicants, setApplicants] = useState<ApplicantInfo[]>([]);
  const [selectedApplicant, setSelectedApplicant] = useState<string>('');
  const [availableDocuments, setAvailableDocuments] = useState<{ id: string; label: string; docTypeId: string; filePath: string }[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<string>('');
  const [selectedValueType, setSelectedValueType] = useState<string>('');
  const [filteredValueTypes, setFilteredValueTypes] = useState<ValueType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [extractionResult, setExtractionResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [documentStatus, setDocumentStatus] = useState<CategoryDocuments>({});
  const [backendStatus, setBackendStatus] = useState<string>('Checking...');
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Check backend status on component mount
  useEffect(() => {
    checkBackendStatus();
  }, []);

  // Load applicants and documents when resident ID changes
  useEffect(() => {
    if (residentId.trim()) {
      loadApplicantsAndDocuments();
    } else {
      setApplicants([]);
      setAvailableDocuments([]);
      setDocumentStatus({});
    }
  }, [residentId]);

  const checkBackendStatus = async () => {
    try {
      console.log('=== Backend Status Check ===');
      console.log('REACT_APP_BACKEND_URL env var:', process.env.REACT_APP_BACKEND_URL);
      console.log('Fallback URL:', 'http://localhost:8000');
      console.log('Final Backend URL:', process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000');
      console.log('============================');
      
      // Check enhanced service health first
      try {
        const enhancedHealth = await documentValueService.checkEnhancedHealth();
        const docAiStatus = enhancedHealth.document_ai_available ? 'Document AI ✅' : 'Document AI ❌';
        setBackendStatus(`✅ Enhanced Service OK (${enhancedHealth.version}) - ${docAiStatus}`);
        console.log('Enhanced service health check successful:', enhancedHealth);
      } catch (enhancedErr) {
        console.warn('Enhanced health check failed, trying basic health check:', enhancedErr);
        
        // Fallback to basic health check
        const health = await documentValueService.checkHealth();
        setBackendStatus(`✅ Backend OK (${health.version}) - Enhanced service unavailable`);
        console.log('Basic health check successful:', health);
      }
    } catch (err) {
      console.error('Backend health check failed:', err);
      setBackendStatus(`❌ Backend Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Update available documents when applicant selection changes
  useEffect(() => {
    if (selectedApplicant) {
      updateAvailableDocuments();
    } else {
      setAvailableDocuments([]);
    }
  }, [selectedApplicant, documentStatus]);

  // Update filtered value types when document selection changes
  useEffect(() => {
    if (selectedDocument) {
      updateFilteredValueTypes();
    } else {
      setFilteredValueTypes([]);
    }
  }, [selectedDocument]);

  const loadApplicantsAndDocuments = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Fetch user data
      const { data: userData, error: userError } = await supabase
        .from('user_data')
        .select('document_status, weitere_antragstellende_personen, firstname, lastname')
        .eq('id', residentId)
        .single();

      if (userError) {
        throw new Error(`User not found: ${userError.message}`);
      }

      if (!userData) {
        throw new Error('No user data found');
      }

      // Process applicants
      const applicantsList: ApplicantInfo[] = [];

      // Add general category
      applicantsList.push({
        uuid: 'general',
        name: 'Allgemeine Dokumente',
        type: 'general'
      });

      // Add main applicant
      const mainApplicantName = userData.firstname && userData.lastname 
        ? `${userData.firstname} ${userData.lastname} (Hauptantragsteller)`
        : 'Hauptantragsteller';
      
      applicantsList.push({
        uuid: 'hauptantragsteller',
        name: mainApplicantName,
        type: 'hauptantragsteller'
      });

      // Add additional applicants
      if (userData.weitere_antragstellende_personen) {
        const weiterePersonen = userData.weitere_antragstellende_personen;
        
        Object.entries(weiterePersonen).forEach(([uuid, person]: [string, any]) => {
          const firstName = person.firstName || person.firstname || '';
          const lastName = person.lastName || person.lastname || '';
          
          let name;
          if (firstName && lastName) {
            name = `${firstName} ${lastName}`;
          } else {
            const personNumber = Object.keys(weiterePersonen).indexOf(uuid) + 2;
            name = `Person ${personNumber}`;
          }
          
          applicantsList.push({
            uuid,
            name,
            type: 'applicant'
          });
        });
      }

      setApplicants(applicantsList);
      setDocumentStatus(userData.document_status || {});

    } catch (err) {
      console.error('Error loading applicants and documents:', err);
      setError(err instanceof Error ? err.message : 'Error loading data');
    } finally {
      setIsLoading(false);
    }
  };

  const testConnectivity = async () => {
    try {
      setIsLoading(true);
      
      // Test direct fetch to the health endpoint - force HTTP for localhost
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
      const httpUrl = backendUrl.includes('localhost') ? backendUrl.replace('https://', 'http://') : backendUrl;
      console.log('=== Direct Connectivity Test ===');
      console.log('Original Backend URL:', backendUrl);
      console.log('Testing URL:', `${httpUrl}/api/document-values/health`);
      
      const response = await fetch(`${httpUrl}/api/document-values/health`);
      
      if (response.ok) {
        const data = await response.json();
        setBackendStatus(`✅ Direct test OK (${data.version})`);
        console.log('Direct connectivity test successful:', data);
      } else {
        setBackendStatus(`❌ Direct test failed: ${response.status}`);
        console.error('Direct connectivity test failed:', response.status, response.statusText);
      }
    } catch (err) {
      console.error('Direct connectivity test error:', err);
      setBackendStatus(`❌ Connection Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testAuth = async () => {
    try {
      setIsLoading(true);
      
      // Test authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log('=== Authentication Test ===');
      console.log('Session error:', sessionError);
      console.log('Session exists:', !!session);
      console.log('User ID:', session?.user?.id);
      console.log('Access token exists:', !!session?.access_token);
      console.log('User metadata:', session?.user?.user_metadata);
      console.log('===========================');
      
      if (sessionError || !session) {
        setBackendStatus('❌ No valid session');
        setError('No valid session found. Please log in again.');
      } else {
        setBackendStatus(`✅ Auth OK (User: ${session.user?.email})`);
        setError('');
      }
    } catch (err) {
      console.error('Auth test error:', err);
      setBackendStatus(`❌ Auth Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const updateAvailableDocuments = () => {
    const documents: { id: string; label: string; docTypeId: string; filePath: string }[] = [];
    
    // Determine which category to look in
    let categoryKey: string;
    if (selectedApplicant === 'general') {
      categoryKey = 'general';
    } else if (selectedApplicant === 'hauptantragsteller') {
      categoryKey = 'hauptantragsteller';
    } else {
      categoryKey = `applicant_${selectedApplicant}`;
    }

    const categoryDocs = documentStatus[categoryKey] || {};
    
    Object.entries(categoryDocs).forEach(([docTypeId, files]) => {
      files.forEach((file, index) => {
        if (file.uploaded) {
          const uniqueId = `${categoryKey}_${docTypeId}_${index}`;
          const documentLabel = DOCUMENT_LABELS[docTypeId] || docTypeId;
          const displayLabel = files.length > 1 ? `${documentLabel} (${index + 1})` : documentLabel;
          
          documents.push({
            id: uniqueId,
            label: displayLabel,
            docTypeId,
            filePath: file.filePath
          });
        }
      });
    });

    // Sort documents alphabetically
    documents.sort((a, b) => a.label.localeCompare(b.label, 'de', { sensitivity: 'base' }));
    
    setAvailableDocuments(documents);
  };

  const updateFilteredValueTypes = () => {
    const selectedDoc = availableDocuments.find(doc => doc.id === selectedDocument);
    if (!selectedDoc) {
      setFilteredValueTypes([]);
      return;
    }

    // Filter value types that are relevant for the selected document type
    const relevantValueTypes = VALUE_TYPES.filter(valueType => 
      valueType.documentTypes.includes(selectedDoc.docTypeId)
    );

    setFilteredValueTypes(relevantValueTypes);
  };

  const handleExtraction = async () => {
    if (!selectedDocument) {
      setError('Bitte wählen Sie ein Dokument aus');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      setExtractionResult(null);

      const selectedDoc = availableDocuments.find(doc => doc.id === selectedDocument);
      if (!selectedDoc) {
        throw new Error('Ausgewähltes Dokument nicht gefunden');
      }

      // Map document type ID to extraction document type
      const documentTypeMapping: { [key: string]: string } = {
        'lohn_gehaltsbescheinigungen': 'lohn_gehaltsbescheinigung',
        'werbungskosten_nachweis': 'werbungskosten_nachweis',
        'einkommenssteuerbescheid': 'einkommenssteuerbescheid',
        'einkommenssteuererklaerung': 'einkommenssteuerbescheid',
        'rentenbescheid': 'rentenbescheid',
        'arbeitslosengeldbescheid': 'arbeitslosengeld_bescheid',
        'guv_euer_nachweis': 'werbungskosten_nachweis',
        'unterhaltsverpflichtung_nachweis': 'unterhaltsverpflichtung_nachweis',
        'unterhaltsleistungen_nachweis': 'unterhalt_bescheid',
        'kinderbetreuungskosten_nachweis': 'kinderbetreuungskosten_nachweis'
      };

      const extractionDocumentType = documentTypeMapping[selectedDoc.docTypeId] || 'werbungskosten_nachweis';

      console.log('=== Comprehensive OCR Extraction Parameters ===');
      console.log('Document Path:', selectedDoc.filePath);
      console.log('Document Type:', extractionDocumentType);
      console.log('Strategy: OCR-only comprehensive extraction (no Document AI)');
      console.log('===============================================');

      // Try comprehensive extraction first (OCR-only)
      try {
        // Get the current session token for authentication
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          throw new Error('No valid session found. Trying test endpoint...');
        }

        // Use comprehensive OCR extraction (no Document AI)
        const result = await documentValueService.comprehensiveExtractValueFromStorage(
          selectedDoc.filePath,
          extractionDocumentType,
          session.access_token
        );

        setExtractionResult(result);
        console.log('=== Comprehensive OCR Extraction Result ===');
        console.log('Result:', result);
        console.log('Extracted values:', result.extracted_values);
        console.log('Confidence scores:', result.confidence_scores);
        console.log('Patterns matched:', result.patterns_matched);
        console.log('===========================================');

      } catch (authError) {
        console.warn('Comprehensive extraction failed, trying test endpoint:', authError);
        
        // Fallback to test endpoint without authentication
        const result = await documentValueService.testComprehensiveExtractValueFromStorage(
          selectedDoc.filePath,
          extractionDocumentType
        );

        setExtractionResult(result);
        console.log('=== Test Comprehensive OCR Extraction Result ===');
        console.log('Result:', result);
        console.log('Extracted values:', result.extracted_values);
        console.log('Confidence scores:', result.confidence_scores);
        console.log('Patterns matched:', result.patterns_matched);
        console.log('===============================================');
      }

    } catch (err) {
      console.error('Comprehensive extraction failed:', err);
      setError(err instanceof Error ? err.message : 'Comprehensive extraction failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestExtraction = async () => {
    if (!selectedDocument || !selectedValueType) {
      setError('Bitte wählen Sie ein Dokument und einen Werttyp aus');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      setExtractionResult(null);

      const selectedDoc = availableDocuments.find(doc => doc.id === selectedDocument);
      if (!selectedDoc) {
        throw new Error('Ausgewähltes Dokument nicht gefunden');
      }

      // Map document type ID to extraction document type
      const documentTypeMapping: { [key: string]: string } = {
        'lohn_gehaltsbescheinigungen': 'lohn_gehaltsbescheinigung',
        'werbungskosten_nachweis': 'werbungskosten_nachweis',
        'einkommenssteuerbescheid': 'einkommenssteuerbescheid',
        'einkommenssteuererklaerung': 'einkommenssteuerbescheid',
        'rentenbescheid': 'rentenbescheid',
        'arbeitslosengeldbescheid': 'arbeitslosengeld_bescheid',
        'guv_euer_nachweis': 'werbungskosten_nachweis',
        'unterhaltsverpflichtung_nachweis': 'unterhalt_bescheid',
        'unterhaltsleistungen_nachweis': 'unterhalt_bescheid',
        'kinderbetreuungskosten_nachweis': 'werbungskosten_nachweis'
      };

      const extractionDocumentType = documentTypeMapping[selectedDoc.docTypeId] || 'werbungskosten_nachweis';

      // Map value type to extraction value type
      const valueTypeMapping: { [key: string]: string } = {
        'monthlynetsalary': 'net_salary',
        'weihnachtsgeld_next12_net': 'weihnachtsgeld',
        'urlaubsgeld_next12_net': 'urlaubsgeld',
        'otheremploymentmonthlynetincome': 'other_employment_income',
        'incomebusiness': 'total_amount',
        'incomeagriculture': 'total_amount',
        'incomerent': 'taxable_income',
        'incomepension': 'pension_amount',
        'incomeablg': 'benefit_amount',
        'incomeunterhalttaxfree': 'maintenance_amount',
        'incomeunterhalttaxable': 'maintenance_amount',
        'werbungskosten': 'total_amount',
        'kinderbetreuungskosten': 'total_amount',
        'unterhaltszahlungen': 'maintenance_amount'
      };

      const extractionValueType = valueTypeMapping[selectedValueType] || 'total_amount';

      console.log('=== Test Extraction Parameters ===');
      console.log('Document Path:', selectedDoc.filePath);
      console.log('Document Type:', extractionDocumentType);
      console.log('Value Type:', extractionValueType);
      console.log('=================================');

      // Use test endpoint without authentication
      const result = await documentValueService.testExtractValueFromStorage(
        selectedDoc.filePath,
        extractionDocumentType,
        extractionValueType
      );

      setExtractionResult(result);
      console.log('=== Test Extraction Result ===');
      console.log('Result:', result);
      console.log('==============================');

    } catch (err) {
      console.error('Test extraction failed:', err);
      setError(err instanceof Error ? err.message : 'Test extraction failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDebugStorage = async () => {
    if (!selectedDocument) {
      setError('Bitte wählen Sie ein Dokument aus');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      setDebugInfo(null);

      const selectedDoc = availableDocuments.find(doc => doc.id === selectedDocument);
      if (!selectedDoc) {
        throw new Error('Ausgewähltes Dokument nicht gefunden');
      }

      console.log('=== Debug Storage Access ===');
      console.log('Document Path:', selectedDoc.filePath);
      console.log('============================');

      // Get the current session token for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('No valid session found. Please log in again.');
      }

      // Test storage access without OCR
      const result = await documentValueService.debugStorageAccess(
        selectedDoc.filePath,
        session.access_token
      );

      setDebugInfo(result);
      console.log('=== Debug Storage Result ===');
      console.log('Result:', result);
      console.log('============================');

      if (result.success) {
        setError('');
      } else {
        setError(`Storage access failed: ${result.error}`);
      }

    } catch (err) {
      console.error('Debug storage failed:', err);
      setError(err instanceof Error ? err.message : 'Debug storage failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDebugText = async () => {
    if (!selectedDocument) {
      setError('Bitte wählen Sie ein Dokument aus');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      setDebugInfo(null);

      const selectedDoc = availableDocuments.find(doc => doc.id === selectedDocument);
      if (!selectedDoc) {
        throw new Error('Ausgewähltes Dokument nicht gefunden');
      }

      console.log('=== Debug Text Extraction ===');
      console.log('Document Path:', selectedDoc.filePath);
      console.log('=============================');

      // Get the current session token for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('No valid session found. Please log in again.');
      }

      // Debug text extraction
      const result = await documentValueService.debugTextExtraction(
        selectedDoc.filePath,
        session.access_token
      );

      setDebugInfo(result);
      console.log('=== Debug Text Result ===');
      console.log('Result:', result);
      console.log('=========================');

      if (result.success) {
        setError('');
      } else {
        setError(`Text extraction failed: ${result.error}`);
      }

    } catch (err) {
      console.error('Debug text extraction failed:', err);
      setError(err instanceof Error ? err.message : 'Debug text extraction failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessExtractionStructure = async () => {
    if (!residentId.trim()) {
      setError('Bitte geben Sie eine Resident ID ein');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      setExtractionResult(null);

      console.log('🔄 Starting extraction structure processing...');
      console.log(`Resident ID: ${residentId}`);

      // Get application ID from resident ID (you might need to adjust this logic)
      const { data: applicationData, error: appError } = await supabase
        .from('applications')
        .select('id')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (appError || !applicationData) {
        throw new Error('No application found for this resident ID');
      }

      const applicationId = applicationData.id;
      console.log(`Application ID: ${applicationId}`);

      const processor = new DocumentExtractionProcessor(residentId, applicationId);

      // Process extraction structure
      const result = await processor.processExtractionStructure();

      setExtractionResult({
        success: result.success,
        extracted_values: result.updatedStructure,
        confidence_score: result.processedFiles / result.totalFiles,
        extraction_method: 'EXTRACTION_STRUCTURE_PROCESSING',
        message: `Processed ${result.processedFiles}/${result.totalFiles} files`,
        errors: result.errors
      });

      console.log('=== Extraction Structure Processing Result ===');
      console.log('Success:', result.success);
      console.log('Processed Files:', result.processedFiles);
      console.log('Total Files:', result.totalFiles);
      console.log('Errors:', result.errors);
      console.log('==============================================');

      if (result.errors.length > 0) {
        setError(`Processing completed with ${result.errors.length} errors. Check console for details.`);
      } else {
        setError('');
      }

    } catch (err) {
      console.error('Extraction structure processing failed:', err);
      setError(err instanceof Error ? err.message : 'Extraction structure processing failed');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const getConfidenceBadgeVariant = (confidence: number): string => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'danger';
  };

  return (
    <Container className="mt-4">
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="mb-0 text-[#064497]">Comprehensive OCR Extraction Test</h4>
                  <p className="mb-0 text-muted">
                    Test comprehensive OCR-only extraction: Extract all relevant values per document type (no Document AI)
                  </p>
                </div>
                <div className="text-end">
                  <small className="text-muted">Backend Status:</small><br/>
                  <span className={backendStatus.includes('✅') ? 'text-success' : 'text-danger'}>
                    {backendStatus}
                  </span>
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              {/* Backend Status and Connectivity Test */}
              <Row className="mb-4">
                <Col md={8}>
                  <Alert variant={backendStatus.includes('✅') ? 'success' : 'danger'}>
                    <div className="d-flex justify-content-between align-items-center">
                      <span>{backendStatus}</span>
                      <div className="d-flex gap-2">
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          onClick={testConnectivity}
                          disabled={isLoading}
                        >
                          Test Connectivity
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-info"
                          onClick={testAuth}
                          disabled={isLoading}
                        >
                          Test Auth
                        </Button>
                      </div>
                    </div>
                  </Alert>
                </Col>
              </Row>

              {/* Step 1: Enter Resident ID */}
              <Row className="mb-4">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Resident ID</Form.Label>
                    <Form.Control
                      type="text"
                      value={residentId}
                      onChange={(e) => setResidentId(e.target.value)}
                      placeholder="Enter resident ID (UUID)"
                    />
                    <Form.Text className="text-muted">
                      Enter the UUID of the resident to load their documents
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>

              {/* Step 2: Select Applicant Category */}
              {applicants.length > 0 && (
                <Row className="mb-4">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Applicant Category</Form.Label>
                      <Form.Select
                        value={selectedApplicant}
                        onChange={(e) => setSelectedApplicant(e.target.value)}
                      >
                        <option value="">Select applicant category...</option>
                        {applicants.map(applicant => (
                          <option key={applicant.uuid} value={applicant.uuid}>
                            {applicant.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
              )}

              {/* Step 3: Select Document */}
              {availableDocuments.length > 0 && (
                <Row className="mb-4">
                  <Col md={8}>
                    <Form.Group>
                      <Form.Label>Select Document</Form.Label>
                      <Form.Select
                        value={selectedDocument}
                        onChange={(e) => setSelectedDocument(e.target.value)}
                      >
                        <option value="">Select document...</option>
                        {availableDocuments.map(doc => (
                          <option key={doc.id} value={doc.id}>
                            {doc.label}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Text className="text-muted">
                        {availableDocuments.length} document(s) available for this applicant
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
              )}

              {/* Step 4: Information about comprehensive extraction */}
              {selectedDocument && (
                <Row className="mb-4">
                  <Col md={10}>
                    <Alert variant="info">
                      <div className="d-flex align-items-center">
                        <i className="bi bi-info-circle-fill me-2"></i>
                        <div>
                          <strong>Comprehensive OCR Extraction</strong>
                          <p className="mb-0 mt-1">
                            This will extract <strong>all relevant values</strong> from the selected document type using OCR patterns. 
                            No need to select specific value types - all applicable fields (amounts, dates, boolean flags) will be extracted automatically.
                          </p>
                        </div>
                      </div>
                    </Alert>
                  </Col>
                </Row>
              )}

              {/* Step 5: Extract Button */}
              {selectedDocument && (
                <Row className="mb-4">
                  <Col md={6}>
                    <Button
                      onClick={handleExtraction}
                      disabled={isLoading}
                      className="w-100"
                      style={{ backgroundColor: '#064497', border: 'none' }}
                    >
                      {isLoading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Extracting...
                        </>
                      ) : (
                        'Comprehensive OCR Extract'
                      )}
                    </Button>
                  </Col>
                  <Col md={3}>
                    <Button
                      onClick={handleTestExtraction}
                      disabled={isLoading}
                      className="w-100"
                      variant="outline-secondary"
                    >
                      {isLoading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Testing...
                        </>
                      ) : (
                        'Test Extract'
                      )}
                    </Button>
                  </Col>
                  <Col md={2}>
                    <Button
                      onClick={handleDebugStorage}
                      disabled={isLoading}
                      className="w-100"
                      variant="outline-info"
                      size="sm"
                    >
                      {isLoading ? 'Debug...' : 'Debug Storage'}
                    </Button>
                  </Col>
                  <Col md={2}>
                    <Button
                      onClick={handleDebugText}
                      disabled={isLoading}
                      className="w-100"
                      variant="outline-warning"
                      size="sm"
                    >
                      {isLoading ? 'Debug...' : 'Debug Text'}
                    </Button>
                  </Col>
                </Row>
              )}

              {/* Extraction Structure Processing Button */}
              {residentId && (
                <Row className="mb-4">
                  <Col md={12}>
                    <Alert variant="info">
                      <div className="d-flex align-items-center">
                        <i className="bi bi-info-circle-fill me-2"></i>
                        <div>
                          <strong>Extraction Structure Processing</strong>
                          <p className="mb-0 mt-1">
                            Process the complete extraction_structure JSON: Extract all values from all documents for this resident.
                            This will process all documents systematically and update the extraction_structure in the database.
                          </p>
                        </div>
                      </div>
                    </Alert>
                  </Col>
                </Row>
              )}

              {residentId && (
                <Row className="mb-4">
                  <Col md={6}>
                    <Button
                      onClick={handleProcessExtractionStructure}
                      disabled={isLoading}
                      className="w-100"
                      style={{ backgroundColor: '#28a745', border: 'none' }}
                    >
                      {isLoading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Processing Structure...
                        </>
                      ) : (
                        'Process Extraction Structure'
                      )}
                    </Button>
                  </Col>
                </Row>
              )}

              {/* Error Display */}
              {error && (
                <Alert variant="danger" className="mb-4">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {error}
                </Alert>
              )}

              {/* Debug Info */}
              {debugInfo && (
                <Card className="mb-4">
                  <Card.Header>
                    <h5 className="mb-0">
                      {debugInfo.raw_text ? 'Text Extraction Debug' : 'Storage Debug Information'}
                    </h5>
                  </Card.Header>
                  <Card.Body>
                    {debugInfo.success ? (
                      <div>
                        <div className="row">
                          <div className="col-md-6">
                            <h6 className="text-success mb-3">
                              ✅ {debugInfo.raw_text ? 'Text Extraction Successful' : 'Storage Access Successful'}
                            </h6>
                            <ul className="list-unstyled">
                              <li><strong>Document Path:</strong> {debugInfo.document_path}</li>
                              <li><strong>File Size:</strong> {debugInfo.file_size} bytes</li>
                              <li><strong>File Type:</strong> {debugInfo.file_type || debugInfo.file_extension}</li>
                              {debugInfo.extraction_method && (
                                <li><strong>Extraction Method:</strong> {debugInfo.extraction_method}</li>
                              )}
                              {debugInfo.confidence && (
                                <li><strong>OCR Confidence:</strong> {Math.round(debugInfo.confidence * 100)}%</li>
                              )}
                              {debugInfo.text_length && (
                                <li><strong>Text Length:</strong> {debugInfo.text_length} characters</li>
                              )}
                              {debugInfo.user_id && (
                                <li><strong>User ID:</strong> {debugInfo.user_id}</li>
                              )}
                            </ul>
                          </div>
                          <div className="col-md-6">
                            <h6 className="text-muted mb-3">
                              {debugInfo.raw_text ? 'Extracted Text Preview' : 'Next Steps'}
                            </h6>
                            {debugInfo.raw_text ? (
                              <div className="bg-light p-3 rounded" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                <pre className="mb-0 small">
                                  {debugInfo.text_preview || debugInfo.raw_text?.substring(0, 500)}
                                </pre>
                              </div>
                            ) : (
                              <p className="small">
                                Storage access is working. You can now try the OCR extraction.
                                If OCR extraction still times out, the issue might be with OCR processing time.
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {debugInfo.raw_text && (
                          <div className="mt-4">
                            <h6 className="text-muted mb-2">Full Extracted Text</h6>
                            <div className="bg-light p-3 rounded" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                              <pre className="mb-0 small">
                                {debugInfo.raw_text}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Alert variant="danger">
                        <h6 className="mb-2">❌ Debug Failed</h6>
                        <p className="mb-1"><strong>Error:</strong> {debugInfo.error}</p>
                        <p className="mb-0"><strong>Document Path:</strong> {debugInfo.document_path}</p>
                      </Alert>
                    )}
                  </Card.Body>
                </Card>
              )}

              {/* Extraction Results */}
              {extractionResult && (
                <Card className="mb-4">
                  <Card.Header>
                    <div className="d-flex justify-content-between align-items-center">
                      <h5 className="mb-0">Extraction Results</h5>
                      <Badge bg={getConfidenceBadgeVariant(extractionResult.confidence_score)}>
                        {Math.round(extractionResult.confidence_score * 100)}% Confidence
                      </Badge>
                    </div>
                  </Card.Header>
                  <Card.Body>
                    {extractionResult.success ? (
                      <>
                        <Row>
                          <Col md={6}>
                            <h6 className="text-muted mb-3">Extracted Values</h6>
                            {Object.entries(extractionResult.extracted_values || {}).map(([key, value]: [string, any]) => (
                              <div key={key} className="mb-3">
                                <div className="d-flex justify-content-between align-items-center">
                                  <span className="fw-bold">{key}:</span>
                                  <span className={`fs-6 ${typeof value === 'number' ? 'text-success' : 'text-primary'}`}>
                                    {typeof value === 'number' ? 
                                      (key.includes('amount') || key.includes('value') || key.includes('gross') || key.includes('net') ? 
                                        formatCurrency(value) : value.toString()) :
                                     typeof value === 'boolean' ? (value ? '✓ Yes' : '✗ No') :
                                     value?.toString() || 'N/A'}
                                  </span>
                                </div>
                                
                                {/* Display comprehensive value structure if available */}
                                {typeof value === 'object' && value !== null && (value.gross_value !== undefined || value.net_value !== undefined) && (
                                  <div className="mt-2 ms-3">
                                    {value.gross_value && (
                                      <div className="small text-muted">
                                        Gross: {formatCurrency(value.gross_value)}
                                      </div>
                                    )}
                                    {value.net_value && (
                                      <div className="small text-muted">
                                        Net: {formatCurrency(value.net_value)}
                                      </div>
                                    )}
                                    {value.year && (
                                      <div className="small text-muted">
                                        Year: {value.year}
                                      </div>
                                    )}
                                    {value.month && (
                                      <div className="small text-muted">
                                        Month: {value.month}
                                      </div>
                                    )}
                                    {value.isMonthly !== null && value.isMonthly !== undefined && (
                                      <div className="small text-muted">
                                        Monthly: {value.isMonthly ? '✓ Yes' : '✗ No'}
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {extractionResult.confidence_scores && extractionResult.confidence_scores[key] && (
                                  <small className="text-muted d-block">
                                    Confidence: {Math.round(extractionResult.confidence_scores[key] * 100)}%
                                    {extractionResult.debug_info && extractionResult.debug_info[key] && (
                                      <>
                                        <br />
                                        Raw: "{extractionResult.debug_info[key].raw_text}" | 
                                        Pattern: {extractionResult.debug_info[key].pattern_used}
                                      </>
                                    )}
                                  </small>
                                )}
                              </div>
                            ))}
                          </Col>
                          <Col md={6}>
                            <h6 className="text-muted mb-3">Extraction Info</h6>
                            <div className="mb-2">
                              <strong>Document Type:</strong> {extractionResult.document_type}
                            </div>
                            <div className="mb-2">
                              <strong>File Size:</strong> {extractionResult.file_size ? `${Math.round(extractionResult.file_size / 1024)} KB` : 'N/A'}
                            </div>
                            <div className="mb-2">
                              <strong>Extraction Method:</strong> 
                              <Badge bg="primary" className="ms-1">
                                {extractionResult.extraction_method || 'OCR_COMPREHENSIVE'}
                              </Badge>
                            </div>
                            <div className="mb-2">
                              <strong>OCR Confidence:</strong> {Math.round((extractionResult.ocr_confidence || 0) * 100)}%
                            </div>
                            <div className="mb-2">
                              <strong>Overall Confidence:</strong> {Math.round((extractionResult.overall_confidence || extractionResult.confidence_score || 0) * 100)}%
                            </div>
                            <div className="mb-2">
                              <strong>Patterns Matched:</strong> 
                              <Badge bg="success" className="ms-1">
                                {extractionResult.patterns_matched || 0} fields
                              </Badge>
                            </div>
                            <div className="mb-2">
                              <strong>Strategy:</strong> 
                              <Badge bg="info" className="ms-1">
                                OCR-Only (No AI Fallback)
                              </Badge>
                            </div>
                            {extractionResult.message && (
                              <div className="mb-2">
                                <strong>Message:</strong> {extractionResult.message}
                              </div>
                            )}
                          </Col>
                        </Row>

                        {/* Raw Text */}
                        {(extractionResult.raw_text_preview || extractionResult.full_raw_text) && (
                          <div className="mt-4">
                            <h6 className="text-muted mb-2">Raw Extracted Text</h6>
                            <div className="bg-light p-3 rounded">
                              <pre className="mb-0 small" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                {extractionResult.full_raw_text || extractionResult.raw_text_preview || extractionResult.raw_text || 'No text extracted'}
                              </pre>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <Alert variant="warning">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        {extractionResult.message || 'No values could be extracted from the document'}
                      </Alert>
                    )}
                  </Card.Body>
                </Card>
              )}

              {/* Troubleshooting Section */}
              {error && error.includes('timeout') && (
                <Card className="mt-4">
                  <Card.Header>
                    <h5 className="mb-0 text-warning">⚠️ Troubleshooting</h5>
                  </Card.Header>
                  <Card.Body>
                    <Alert variant="warning">
                      <h6>Request Timeout - Possible Causes:</h6>
                      <ol>
                        <li><strong>Backend Server Not Running:</strong> Make sure the backend server is running on port 8000</li>
                        <li><strong>OCR Processing Time:</strong> Large or complex documents may take 30+ seconds to process</li>
                        <li><strong>Missing Dependencies:</strong> PaddleOCR or Tesseract might not be properly installed</li>
                        <li><strong>Network Issues:</strong> Check if localhost:8000 is accessible</li>
                      </ol>
                      <h6 className="mt-3">Quick Fixes:</h6>
                      <ul>
                        <li>Try the "Debug Storage" button first to test basic connectivity</li>
                        <li>Check the browser console for detailed error messages</li>
                        <li>Restart the backend server: <code>cd backend && python3 run.py</code></li>
                        <li>Test OCR dependencies: <code>cd backend && python3 test_ocr.py</code></li>
                      </ul>
                    </Alert>
                  </Card.Body>
                </Card>
              )}

              {/* Debug Information */}
              <Card className="mt-4">
                <Card.Header>
                  <h5 className="mb-0">Debug Information</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <h6>Selection Summary</h6>
                      <ul className="list-unstyled">
                        <li><strong>Resident ID:</strong> {residentId || 'Not selected'}</li>
                        <li><strong>Applicant:</strong> {applicants.find(a => a.uuid === selectedApplicant)?.name || 'Not selected'}</li>
                        <li><strong>Document:</strong> {availableDocuments.find(d => d.id === selectedDocument)?.label || 'Not selected'}</li>
                        <li><strong>Value Type:</strong> {filteredValueTypes.find(vt => vt.id === selectedValueType)?.label || 'Not selected'}</li>
                      </ul>
                    </Col>
                    <Col md={6}>
                      <h6>Available Documents Count</h6>
                      <ul className="list-unstyled">
                        <li><strong>Total Applicants:</strong> {applicants.length}</li>
                        <li><strong>Available Documents:</strong> {availableDocuments.length}</li>
                        <li><strong>Filtered Value Types:</strong> {filteredValueTypes.length}</li>
                      </ul>
                    </Col>
                  </Row>

                  {/* Document Status Debug */}
                  {Object.keys(documentStatus).length > 0 && (
                    <div className="mt-4">
                      <h6>Document Status Structure</h6>
                      <pre className="bg-light p-3 rounded" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {JSON.stringify(documentStatus, null, 2)}
                      </pre>
                    </div>
                  )}
                </Card.Body>
              </Card>

              {/* Value Type Mapping Reference */}
              <Card className="mt-4">
                <Card.Header>
                  <h5 className="mb-0">Value Type Mapping Reference</h5>
                </Card.Header>
                <Card.Body>
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Value Type</th>
                          <th>Label</th>
                          <th>Document Types</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {VALUE_TYPES.map(valueType => (
                          <tr key={valueType.id}>
                            <td><code>{valueType.id}</code></td>
                            <td>{valueType.label}</td>
                            <td>
                              {valueType.documentTypes.map(docType => (
                                <Badge key={docType} bg="secondary" className="me-1">
                                  {docType}
                                </Badge>
                              ))}
                            </td>
                            <td><small>{valueType.description}</small></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card.Body>
              </Card>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default GovernmentExtractionTest;

