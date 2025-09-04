import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChecklistItemProps, ChecklistStatus } from '../../../types/checklist';
import { availableForms } from './FormsDocsPanel';
import { DOCUMENT_LABELS } from './FormsDocsPanel';
import { 
  DOCUMENT_CATEGORY_MAPPING, 
  determineRequiredDocuments, 
  findDocumentErrorsWithRequiredDocs,
  checkDocumentCompletenessWithRequiredDocs,
  generateUploadedDocumentsList
} from '../../../utils/checklistGenerator';

const STATUS_LABELS: Record<ChecklistStatus, string> = {
  correct: 'Gültig',
  wrong: 'Ungültig',
  undefined: 'Ungeprüft',
  created: 'Erstellt',
};

interface DynamicChecklistItemProps extends ChecklistItemProps {
  residentId?: string;
  userData?: any; // For accessing document_status
  onSystemErrorsUpdate?: (itemId: string, errors: string[]) => void;
  allChecklistItems?: any[]; // Array of all checklist items for finding related items
  applicationId?: string; // Application ID for navigation
  onRefreshData?: () => Promise<void>; // Function to refresh data from database
  isReadOnly?: boolean; // Whether the component should be read-only for completed applications
}

const ChecklistItem: React.FC<DynamicChecklistItemProps> = ({
  item,
  onStatusChange,
  onNotesChange,
  onOpenForm,
  onOpenDocument,
  residentId,
  userData,
  onSystemErrorsUpdate,
  allChecklistItems,
  applicationId,
  onRefreshData,
  isReadOnly = false,
}) => {
  const [tempNotes, setTempNotes] = useState(item.agentNotes || '');
  const [notesChanged, setNotesChanged] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [isSmall, setIsSmall] = useState(false);
  const [availableDocuments, setAvailableDocuments] = useState<{ id: string; label: string }[]>([]);
  const [dynamicSystemErrors, setDynamicSystemErrors] = useState<string[]>([]);
  const [dynamicSystemComment, setDynamicSystemComment] = useState<string>(item.systemComment || '');
  const [dynamicSystemStatus, setDynamicSystemStatus] = useState<ChecklistStatus>(item.systemStatus);
  const [dynamicLinkedDocs, setDynamicLinkedDocs] = useState<string[]>(item.linkedDocs);
  const [isCheckingDocuments, setIsCheckingDocuments] = useState(false);
  const [itemUpdateTrigger, setItemUpdateTrigger] = useState(0);
  const [linkedChecklistItems, setLinkedChecklistItems] = useState<Array<{id: string, title: string, agentStatus: string}>>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showRefreshSuccess, setShowRefreshSuccess] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState('');
  const [refreshMessageType, setRefreshMessageType] = useState<'success' | 'error'>('success');
  const containerRef = useRef<HTMLDivElement>(null);

  // Function to determine applicant key from checklist item ID
  const getApplicantKeyFromItemId = (itemId: string): string => {
    if (itemId.includes('_hauptantragsteller')) return 'hauptantragsteller';
    if (itemId.includes('_applicant_')) {
      // Handle new UID-based format: applicant_UUID
      const match = itemId.match(/_applicant_([a-f0-9-]+)/);
      return match ? `applicant_${match[1]}` : 'hauptantragsteller';
    }
    if (itemId.includes('_general')) return 'general';
    return 'hauptantragsteller'; // Default fallback
  };

  // Function to get applicant name with abbreviation
  const getApplicantNameWithAbbreviation = (applicantKey: string): string => {
    if (applicantKey === 'general') return 'Allgemein';
    if (applicantKey === 'hauptantragsteller') return 'Hauptantragsteller';
    
    // Handle applicant categories with UIDs
    if (applicantKey.startsWith('applicant_')) {
      const uuid = applicantKey.replace('applicant_', '');
      const weiterePersonen = userData?.weitere_antragstellende_personen;
      
      if (weiterePersonen && weiterePersonen[uuid]) {
        const person = weiterePersonen[uuid];
        const firstName = person.firstName || person.firstname || '';
        const lastName = person.lastName || person.lastname || '';
        
        if (firstName && lastName) {
          const firstTwo = firstName.substring(0, 2);
          const lastOne = lastName.substring(0, 1);
          
          // Count position in weitere_antragstellende_personen
          const personEntries = Object.entries(weiterePersonen);
          const personIndex = personEntries.findIndex(([key]) => key === uuid);
          const personNumber = personIndex + 2; // +2 because main applicant is 1
          
          return `Person (${firstTwo}.${lastOne}.)`;
        } else {
          // Count position in weitere_antragstellende_personen
          const personEntries = Object.entries(weiterePersonen);
          const personIndex = personEntries.findIndex(([key]) => key === uuid);
          const personNumber = personIndex + 2; // +2 because main applicant is 1
          
          return `Person ${personNumber}`;
        }
      }
      
      // Fallback if no name found
      return `Person ${uuid.substring(0, 8)}`;
    }
    
    return applicantKey;
  };

  // Function to get document label
  const getDocumentLabel = (docId: string): string => {
    return DOCUMENT_LABELS[docId] || docId;
  };

  // Function to find linked checklist items for calculation items
  const findLinkedChecklistItems = (): Array<{id: string, title: string, agentStatus: string}> => {
    if (!item.id.endsWith('calculation') || !allChecklistItems) {
      return [];
    }

    const linkedItems: Array<{id: string, title: string, agentStatus: string}> = [];
    
    var relatedKeywords = ['']
    // Define keywords that indicate related items for household-income-calculation
    if(item.id === 'household-income-calculation') {
    relatedKeywords = [
      'income-group-calculation',
      'lohn_gehaltsbescheinigungen',
      'einkommenssteuerbescheid',
      'rentenbescheid',
      'arbeitslosengeldbescheid',
      'werbungskosten_nachweis',
      'kinderbetreuungskosten_nachweis',
      'unterhaltsverpflichtung_nachweis',
      'unterhaltsleistungen_nachweis',
      'kindergeld',
      'unterhalt',
      'guv_euer_nachweis',
      'nachweis_disability',
      'pflegegrad_nachweis'
    ];
   } else if(item.id === 'income-group-calculation') {
    relatedKeywords = [
      'household-income-calculation'
    ];
   } else if(item.id === 'available-monthly-income-calculation') {
    relatedKeywords = [
      'lohn_gehaltsbescheinigungen',
      'einkommenssteuerbescheid',
      'rentenbescheid',
      'unterhaltsverpflichtung_nachweis',
      'unterhaltsleistungen_nachweis',
      'elterngeld_nachweis',
      'guv_euer_nachweis',
      'freiwillige_krankenversicherung_nachweis',
      'freiwillige_versicherungsbeitraege_nachweis',
      'ausbildungsfoerderung_nachweis',
      'krankengeld_nachweis',
    ];
   }else if(item.id === 'additional-financial-criteria-calculation') {
    relatedKeywords = [
      'income-group-calculation'
    ];
   }else if(item.id === 'cross-checks-calculatio') {
    relatedKeywords = [''];
   }

    // Find all checklist items that match our criteria
    allChecklistItems.forEach(checklistItem => {
      if (checklistItem.id === item.id) return; // Skip self
      
      // Check if the item ID contains any of the related keywords
      const hasRelevantKeyword = relatedKeywords.some(keyword => 
        checklistItem.id.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (hasRelevantKeyword && (checklistItem.id.toLowerCase().includes('_isvalid') || checklistItem.id.toLowerCase().includes('calculation'))) {
        linkedItems.push({
          id: checklistItem.id,
          title: checklistItem.title,
          agentStatus: checklistItem.agentStatus || 'undefined'
        });
      }
    });

    return linkedItems;
  };

  // Function to handle navigation to linked checklist item
  const handleLinkedItemClick = (linkedItemId: string) => {
    if (applicationId) {
      // Open new tab with the same application but focused on the specific checklist item
      const currentUrl = window.location.href;
      const baseUrl = currentUrl.split('?')[0]; // Remove any existing query parameters
      const newUrl = `${baseUrl}?applicationId=${encodeURIComponent(applicationId)}&openChecklistItemId=${encodeURIComponent(linkedItemId)}`;
      window.open(newUrl, '_blank');
    }
  };

  // Function to render styled calculations for calculation items
  const renderStyledCalculations = (systemComment: string) => {
    // Split the systemComment by lines to process each calculation line
    const lines = systemComment.split('\n');
    
    return (
      <div style={{ marginTop: 8 }}>
        {lines.map((line, index) => {
          // Apply different styling based on content (adapted from ValidationPage)
          let style: React.CSSProperties = { 
            fontSize: '14px', 
            fontFamily: 'Roboto, sans-serif',
            marginTop: '4px',
            marginBottom: '8px'
          };
          let content = line;
          
          // Check if text is a section header (specific keywords)
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
            line === keyword
          );
          
          if (isSectionHeader) {
            style = {
              ...style,
              fontWeight: 'bold',
              color: '#064497',
              fontSize: '16px',
              borderBottom: '1px solid #064497',
              paddingBottom: '4px',
              marginBottom: '8px',
              marginTop: '12px'
            };
          } else if (line.startsWith('-') && line.endsWith('-')) {
            style = {
              ...style,
              fontWeight: '600',
              color: '#1a1a1a',
              marginTop: '12px',
              marginBottom: '8px'
            };
          } else if (line.includes('✓')) {
            style = {
              ...style,
              color: '#15803d',
              backgroundColor: '#f0fdf4',
              padding: '12px',
              borderRadius: '6px',
              marginTop: '12px',
              boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)'
            };
          } else if (line.includes('✗')) {
            style = {
              ...style,
              color: '#dc2626',
              backgroundColor: '#fef2f2',
              padding: '12px',
              borderRadius: '6px',
              marginTop: '12px',
              boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)'
            };
          } else if (line.includes('Summe') || line.includes('Ergebnis') || line.includes('Verfügbares')) {
            style = {
              ...style,
              fontWeight: '600',
              color: '#1e3a8a',
              backgroundColor: '#dbeafe',
              padding: '8px',
              borderRadius: '4px'
            };
          } else if (line.includes('Bereinigtes Jahreseinkommen') || line.includes('Finales bereinigtes Haushaltseinkommen:') || line.includes('Brutto-Haushaltseinkommen') || line.includes('Mindestbedarf für')) {
            style = {
              ...style,
              fontWeight: '600',
              color: 'white',
              backgroundColor: '#064497',
              padding: '8px',
              borderRadius: '4px'
            };
          } else if (line.startsWith('xyz .-')) {
            style = {
              ...style,
              color: '#4682B4',
              marginTop: '4px',
              marginBottom: '8px',
              marginLeft: '12px',
              fontStyle: 'italic'
            };
            content = line.replace('xyz .', '');
          } else if (line.startsWith('xyz .')) {
            style = {
              ...style,
              color: '#2d2d2d',
              marginTop: '4px',
              marginBottom: '8px',
              marginLeft: '12px'
            };
            content = line.replace('xyz .', '');
          } else if (line.startsWith('xyzreg.')) {
            style = {
              ...style,
              color: '#064497',
              marginTop: '4px',
              marginBottom: '30px',
              fontSize: 15,
              fontWeight: 500,
            };
            content = line.replace('xyzreg.', '');
          }else {
            style = {
              ...style,
              color: '#2d2d2d',
              marginTop: '4px',
              marginBottom: '8px'
            };
          }

          return (
            <div key={index} style={style}>
              {content}
            </div>
          );
        })}
      </div>
    );
  };





  // Function to dynamically check document completeness using data-driven logic
  const checkDocumentCompletenessForItem = useCallback(async (residentId: string) => {
    setIsCheckingDocuments(true);
    try {
      // Get the actual required documents for this specific applicant
      const requiredDocuments = await determineRequiredDocuments(residentId);
      
      // Get current document status
      const documentStatus = userData?.document_status || {};
      
      // Generate errors using the same logic as the checklist generator
      const documentErrors = findDocumentErrorsWithRequiredDocs(documentStatus, requiredDocuments, userData);
      
      // Generate list of uploaded documents with proper formatting and get linkedDocs
      const { comment: uploadedDocsComment, linkedDocs: uploadedDocsList } = generateUploadedDocumentsList(requiredDocuments, documentStatus, userData);
      
      console.log('uploadedDocsList', uploadedDocsList);
      console.log('documentComment', uploadedDocsComment);
      // Generate system comment based on completeness and uploaded documents
      let systemComment: string;
      if (documentErrors.length === 0) {
        if (uploadedDocsComment) {
          systemComment = `Alle erforderlichen Dokumente wurden hochgeladen:\n\n${uploadedDocsComment}`;
        } else {
          systemComment = 'Alle erforderlichen Dokumente wurden hochgeladen';
        }
      } else {
        if (uploadedDocsComment) {
          systemComment = `Es fehlen noch erforderliche Dokumente.\n\nBereits hochgeladen:\n${uploadedDocsComment}`;
        } else {
          systemComment = 'Es fehlen noch erforderliche Dokumente';
        }
      }
      
      // Determine system status
      const systemStatus = documentErrors.length === 0 ? 'correct' : 'wrong';
      
      // Use the properly formatted document IDs from the helper function
      const allUploadedDocIds = uploadedDocsList;
      
      // Update the dynamic errors
      setDynamicSystemErrors(documentErrors);
      
      // Notify parent component about updated errors, status, comment, and linkedDocs
      if (onSystemErrorsUpdate) {
        onSystemErrorsUpdate(item.id, documentErrors);
      }
      
      // Update the dynamic state variables to trigger re-render
      setDynamicSystemStatus(systemStatus);
      setDynamicSystemComment(systemComment);
      setDynamicSystemErrors(documentErrors);
      setDynamicLinkedDocs(allUploadedDocIds);
      
      // Also update item properties for persistence (but UI will use dynamic state)
      item.systemStatus = systemStatus;
      item.systemComment = systemComment;
      item.linkedDocs = allUploadedDocIds; // Replace linkedDocs entirely with current uploaded documents
      
      // Generate available document buttons from the updated linkedDocs
      const buttons: { id: string; label: string }[] = [];
      allUploadedDocIds.forEach(fullDocId => {
        // Parse the full document ID to extract components
        const parts = fullDocId.split('_');
        if (parts.length >= 3) {
          // Format: applicantKey_documentType_index
          let searchKey: string;
          let docId: string;
          let index: number;
          
          if (parts[0] === 'applicant') {
            // Format: applicant_UUID_documentType_index
            searchKey = `${parts[0]}_${parts[1]}`;
            docId = parts.slice(2, -1).join('_');
            index = parseInt(parts[parts.length - 1]);
          } else {
            // Format: general_documentType_index or hauptantragsteller_documentType_index
            searchKey = parts[0];
            docId = parts.slice(1, -1).join('_');
            index = parseInt(parts[parts.length - 1]);
          }
          
          // Check if this document exists and is uploaded
          const documentFiles = userData?.document_status?.[searchKey]?.[docId];
          if (documentFiles && Array.isArray(documentFiles) && documentFiles[index]?.uploaded) {
            const baseLabel = getDocumentLabel(docId);
            const applicantLabel = getApplicantNameWithAbbreviation(searchKey);
            
            let label: string;
            if (searchKey === 'general') {
              label = baseLabel;
            } else {
              label = `${baseLabel} - ${applicantLabel}`;
            }
            
            buttons.push({
              id: fullDocId,
              label: label
            });
          }
        }
      });
      
      setAvailableDocuments(buttons);
      
      // Trigger re-render to show updated comment and status
      setItemUpdateTrigger(prev => prev + 1);
      
    } catch (error) {
      console.error('Error checking document completeness:', error);
      setDynamicSystemErrors(['Fehler bei der Dokumentenprüfung']);
      if (onSystemErrorsUpdate) {
        onSystemErrorsUpdate(item.id, ['Fehler bei der Dokumentenprüfung']);
      }
    } finally {
      setIsCheckingDocuments(false);
    }
  }, [residentId, userData, onSystemErrorsUpdate]);

  // Function to resolve documents and generate buttons/errors dynamically
  const resolveDocuments = () => {
    // Use dynamic linkedDocs for document-completeness_general, otherwise use item.linkedDocs
    const currentLinkedDocs = item.id === 'document-completeness_general' ? dynamicLinkedDocs : item.linkedDocs;
    
    if (!userData?.document_status || !currentLinkedDocs || currentLinkedDocs.length === 0) {
      setAvailableDocuments([]);
      setDynamicSystemErrors([]);
      // For validation items, update status when no documents are available
      if (item.id.endsWith('_isvalid')) {
        setDynamicSystemStatus('wrong');
      }
      return;
    }

    const applicantKey = getApplicantKeyFromItemId(item.id);
    const buttons: { id: string; label: string }[] = [];

    // Process each document ID from linkedDocs
    // linkedDocs now contains full document IDs like "general_meldebescheinigung_0"
    currentLinkedDocs.forEach(fullDocId => {
      // Parse the full document ID to extract components
      const parts = fullDocId.split('_');
      if (parts.length < 3) {
        // Fallback for legacy format - treat as base document ID
        const docId = fullDocId;
        const category = DOCUMENT_CATEGORY_MAPPING[docId];
        let searchKey = applicantKey;
        if (category === 'general') {
          searchKey = 'general';
        }
        
        const documentFiles = userData.document_status?.[searchKey]?.[docId];
        if (documentFiles && Array.isArray(documentFiles)) {
          const uploadedFiles = documentFiles.filter((file: any) => file.uploaded);
          const shouldAddIndex = uploadedFiles.length > 1;
          uploadedFiles.forEach((file: any, index: number) => {
            const baseLabel = getDocumentLabel(docId);
            const label = shouldAddIndex ? `${baseLabel} (${index + 1})` : baseLabel;
            buttons.push({
              id: `${searchKey}_${docId}_${index}`,
              label: label
            });
          });
        }
        return;
      }
      
      // New format: applicantKey_documentType_index
      let searchKey: string;
      let docId: string;
      let index: number;
      
      if (parts[0] === 'applicant') {
        // Format: applicant_UUID_documentType_index
        searchKey = `${parts[0]}_${parts[1]}`;
        docId = parts.slice(2, -1).join('_');
        index = parseInt(parts[parts.length - 1]);
      } else {
        // Format: general_documentType_index or hauptantragsteller_documentType_index
        searchKey = parts[0];
        docId = parts.slice(1, -1).join('_');
        index = parseInt(parts[parts.length - 1]);
      }
      
      // Check if this document exists and is uploaded
      const documentFiles = userData.document_status?.[searchKey]?.[docId];
      if (documentFiles && Array.isArray(documentFiles) && documentFiles[index]?.uploaded) {
        const baseLabel = getDocumentLabel(docId);
        const applicantLabel = getApplicantNameWithAbbreviation(searchKey);
        
        // Check if there are multiple uploaded files for this document type to determine if numbering is needed
        const uploadedFiles = documentFiles.filter((file: any) => file.uploaded);
        const shouldAddIndex = uploadedFiles.length > 1;
        
        let label: string;
        if (searchKey === 'general') {
          // For general documents, don't add applicant suffix
          label = shouldAddIndex ? `${baseLabel} (${index + 1})` : baseLabel;
        } else {
          // For applicant-specific documents, include applicant label
          const baseLabelWithApplicant = `${baseLabel} - ${applicantLabel}`;
          label = shouldAddIndex ? `${baseLabelWithApplicant} (${index + 1})` : baseLabelWithApplicant;
        }
        
        buttons.push({
          id: fullDocId,
          label: label
        });
      }
    });

    setAvailableDocuments(buttons);
    
    // For document completeness checklist items, skip processing here - it's handled by checkDocumentCompletenessForItem
    if (item.id === 'document-completeness_general') {
      // Skip - availableDocuments, errors, and comments are handled by checkDocumentCompletenessForItem
      return;
    } else {
      // For other items, still check for missing documents if needed
      const missingDocErrors: string[] = [];
      item.linkedDocs.forEach(fullDocId => {
        // Parse the full document ID to extract components
        const parts = fullDocId.split('_');
        let searchKey: string;
        let docId: string;
        let index: number;
        
        if (parts.length < 3) {
          // Legacy format - treat as base document ID
          docId = fullDocId;
          const category = DOCUMENT_CATEGORY_MAPPING[docId];
          searchKey = applicantKey;
          if (category === 'general') {
            searchKey = 'general';
          }
          
          const documentFiles = userData.document_status?.[searchKey]?.[docId];
          const uploadedFiles = documentFiles && Array.isArray(documentFiles) 
            ? documentFiles.filter((file: any) => file.uploaded) 
            : [];
          
          if (uploadedFiles.length === 0) {
            const applicantName = getApplicantNameWithAbbreviation(searchKey);
            missingDocErrors.push(`Fehlendes Dokument: ${getDocumentLabel(docId)} - ${applicantName}`);
          }
        } else {
          // New format: parse full document ID
          if (parts[0] === 'applicant') {
            // Format: applicant_UUID_documentType_index
            searchKey = `${parts[0]}_${parts[1]}`;
            docId = parts.slice(2, -1).join('_');
            index = parseInt(parts[parts.length - 1]);
          } else {
            // Format: general_documentType_index or hauptantragsteller_documentType_index
            searchKey = parts[0];
            docId = parts.slice(1, -1).join('_');
            index = parseInt(parts[parts.length - 1]);
          }
          
          // Check if this specific document exists and is uploaded
          const documentFiles = userData.document_status?.[searchKey]?.[docId];
          if (!documentFiles || !Array.isArray(documentFiles) || !documentFiles[index]?.uploaded) {
            const applicantName = getApplicantNameWithAbbreviation(searchKey);
            missingDocErrors.push(`Fehlendes Dokument: ${getDocumentLabel(docId)} - ${applicantName}`);
          }
        }
      });
      
      setDynamicSystemErrors(missingDocErrors);
      
      // For validation items (_isvalid), update the system status based on errors
      if (item.id.endsWith('_isvalid')) {
        // Check for both missing document errors and existing non-document system errors
        const originalNonDocErrors = item.systemErrors.filter(error => !error.startsWith('Fehlendes Dokument:'));
        const hasAnyErrors = missingDocErrors.length > 0 || originalNonDocErrors.length > 0;
        setDynamicSystemStatus(hasAnyErrors ? 'wrong' : 'undefined');
      }
      
      // Notify parent component about updated errors
      if (onSystemErrorsUpdate) {
        const originalErrors = item.systemErrors.filter(error => !error.startsWith('Fehlendes Dokument:'));
        const combinedErrors = [...originalErrors, ...missingDocErrors];
        onSystemErrorsUpdate(item.id, combinedErrors);
      }
    }
  };

  // Reset tempNotes and note input state when item changes
  useEffect(() => {
    setTempNotes(item.agentNotes || '');
    setShowNoteInput(false);
    setNotesChanged(false);
    // For document-completeness_general, don't use stored values - wait for dynamic check
    if (item.id === 'document-completeness_general') {
      setDynamicSystemComment(''); // Will be set by checkDocumentCompletenessForItem
      setDynamicSystemStatus('undefined'); // Will be set by checkDocumentCompletenessForItem
      setDynamicLinkedDocs([]); // Will be set by checkDocumentCompletenessForItem
    } else {
      setDynamicSystemComment(item.systemComment || '');
      setDynamicSystemStatus(item.systemStatus);
      setDynamicLinkedDocs(item.linkedDocs);
    }
  }, [item.id]);

  // Update available documents when userData or item changes
  useEffect(() => {
    resolveDocuments();
    // For document-completeness_general, don't reset to stored values - let dynamic check handle it
    // For validation items (_isvalid), let resolveDocuments handle the dynamic status updates
    // Other items can use their stored values
    if (item.id !== 'document-completeness_general' && !item.id.endsWith('_isvalid')) {
      setDynamicSystemComment(item.systemComment || '');
      setDynamicSystemStatus(item.systemStatus);
      setDynamicLinkedDocs(item.linkedDocs);
    }
  }, [userData?.document_status, item.linkedDocs, item.id, itemUpdateTrigger, dynamicLinkedDocs]);

  // For document completeness items, re-check when document status changes
  useEffect(() => {
    if (item.id === 'document-completeness_general' && residentId && userData?.document_status) {
      checkDocumentCompletenessForItem(residentId);
    }
  }, [userData?.document_status, item.id, residentId]);

  // Initialize and update linked checklist items
  useEffect(() => {
    if (item.id.endsWith('calculation')) {
      setLinkedChecklistItems(findLinkedChecklistItems());
    }
  }, [itemUpdateTrigger, item.id, allChecklistItems]);

  // Use ResizeObserver for live width detection
  useEffect(() => {
    if (!containerRef.current) return;
    const node = containerRef.current;
    const observer = new window.ResizeObserver(entries => {
      for (let entry of entries) {
        setIsSmall(entry.contentRect.width < 500);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const getStatusStyle = (status: ChecklistStatus) => {
    switch (status) {
      case 'correct':
        return { background: '#e6f4ea', color: '#388e3c', border: '1px solid #388e3c' };
      case 'wrong':
        return { background: '#fdeaea', color: '#d32f2f', border: '1px solid #d32f2f' };
      default:
        return { background: '#f2f2f2', color: '#757575', border: '1px solid #bdbdbd' };
    }
  };

  const handleSaveNotes = () => {
    onNotesChange(item.id, tempNotes);
    setNotesChanged(false);
    setShowNoteInput(false);
  };

  // Function to handle document button click
  const handleDocumentClick = (documentId: string) => {
    // Pass the dynamic document ID to the handler
    onOpenDocument(documentId);
  };

  // Combine original and dynamic system errors
  const allSystemErrors = item.id === 'document-completeness_general' 
    ? (isCheckingDocuments ? ['Prüfe Dokumente...'] : dynamicSystemErrors) // For document completeness, only use dynamic errors (they're more current)
    : [
        ...item.systemErrors.filter(error => !error.startsWith('Fehlendes Dokument:')), // Original non-document errors
        ...dynamicSystemErrors // Dynamic document errors
      ];

  return (
    <div
      ref={containerRef}
      style={{
        border: '1px solid #e0e0e0',
        borderRadius: 12,
        padding: 24,
        marginBottom: 24,
        background: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        width: '100%',
        minWidth: 0,
      }}
    >
      {/* Header */}
      <h3 style={{ margin: '0 0 20px 0', color: '#064497', fontWeight: 400, fontSize: 22 }}>{item.title}</h3>

      {/* Status Section */}
      <div
        style={{
          display: 'flex',
          flexDirection: isSmall ? 'column' : 'row',
          gap: isSmall ? 8 : 32,
          marginBottom: 20,
          alignItems: isSmall ? 'flex-start' : 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: isSmall ? '100%' : 'auto' }}>
          <span style={{ color: '#666', fontWeight: 500 }}>Systemprüfung:</span>
          <span
                      style={{
            ...getStatusStyle((item.id === 'document-completeness_general' || item.id.endsWith('_isvalid')) ? dynamicSystemStatus : item.systemStatus),
              borderRadius: 16,
              padding: '4px 16px',
              fontWeight: 600,
              fontSize: 15,
              display: 'inline-block',
              minWidth: 90,
              textAlign: 'center',
            }}
          >
            {STATUS_LABELS[(item.id === 'document-completeness_general' || item.id.endsWith('_isvalid')) ? dynamicSystemStatus : item.systemStatus]}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: isSmall ? '100%' : 'auto', marginTop: isSmall ? 8 : 0 }}>
          <span style={{ color: '#666', fontWeight: 500 }}>Prüfung:</span>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            {isReadOnly ? (
              <span
                style={{
                  ...getStatusStyle(item.agentStatus),
                  borderRadius: 16,
                  padding: '4px 16px',
                  fontWeight: 600,
                  fontSize: 15,
                  minWidth: 90,
                  display: 'inline-block',
                  textAlign: 'center',
                }}
              >
                {STATUS_LABELS[item.agentStatus] || 'Ungeprüft'}
              </span>
            ) : (
              <>
                <select
                  value={item.agentStatus}
                  onChange={(e) => onStatusChange(item.id, e.target.value as ChecklistStatus)}
                  style={{
                    ...getStatusStyle(item.agentStatus),
                    borderRadius: 16,
                    padding: '4px 16px 4px 16px',
                    paddingRight: 40,
                    fontWeight: 600,
                    fontSize: 15,
                    outline: 'none',
                    minWidth: 90,
                    cursor: 'pointer',
                    width: isSmall ? 'auto' : undefined,
                    maxWidth: isSmall ? 220 : undefined,
                    boxSizing: 'border-box',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    background: 'none',
                  }}
                >
                  <option value="undefined">Ungeprüft</option>
                  <option value="correct">Gültig</option>
                  <option value="wrong">Ungültig</option>
                </select>
                <span
                  className="material-icons"
                  style={{
                    position: 'absolute',
                    right: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: '#757575',
                    fontSize: 22,
                  }}
                >
                  expand_more
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Systemkommentar */}
      {((item.id === 'document-completeness_general' || item.id.endsWith('_isvalid')) ? dynamicSystemComment : item.systemComment) && (
        <div
          style={{
            marginBottom: 20,
            background: '#eaf2fb',
            borderRadius: 10,
            padding: '14px 18px',
            color: '#064497',
            display: 'flex',
            alignItems: 'flex-start',
            fontSize: 15,
            fontWeight: 500,
            gap: 10,
          }}
        >
          <span className="material-icons" style={{ fontSize: 20, color: '#1976d2' }}>info</span>
          <div style={{ flex: 1 }}>
            <b>Systemkommentar:</b>
            {/* Use styled rendering for calculation items, regular rendering for others */}
            {item.id.endsWith('calculation') ? (
              renderStyledCalculations((item.id === 'document-completeness_general' || item.id.endsWith('_isvalid')) ? dynamicSystemComment : item.systemComment)
            ) : (
              <div style={{ 
                whiteSpace: 'pre-line', 
                marginTop: 2,
                lineHeight: 1.5 
              }}>
                {(item.id === 'document-completeness_general' || item.id.endsWith('_isvalid')) ? dynamicSystemComment : item.systemComment}
              </div>
            )}
          </div>
        </div>
      )}

      {/* System Warnings for Calculation Items */}
      {(item.id.endsWith('calculation') || item.id.includes('cross-checks')) && item.systemWarnings && item.systemWarnings.length > 0 && (
        <div
          style={{
            marginBottom: 20,
            background: '#fefce8', // bg-yellow-50
            border: '1px solid #f59e0b', // border-yellow-500
            borderRadius: 10,
            padding: '14px 18px',
            color: '#92400e', // text-yellow-800
            display: 'flex',
            alignItems: 'flex-start',
            fontSize: 15,
            fontWeight: 500,
            gap: 10,
          }}
        >
          <span className="material-icons" style={{ fontSize: 20, color: '#d97706' }}>warning</span> {/* text-yellow-600 */}
          <div style={{ flex: 1 }}>
            <b>Systemwarnungen:</b>
            <ul style={{ 
              margin: '8px 0 0 0', 
              paddingLeft: 24, 
              color: '#a16207', // text-yellow-700
              fontWeight: 400,
              lineHeight: 1.5 
            }}>
              {item.systemWarnings.map((warning, index) => (
                <li key={index} style={{ marginBottom: 4 }}>
                  • {warning}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Identifizierte Probleme */}
      {allSystemErrors.length > 0 && (
        <div
          style={{
            marginBottom: 20,
            background: '#fdeaea',
            border: '1.5px solid #d32f2f',
            borderRadius: 10,
            padding: '14px 18px',
            color: '#d32f2f',
            fontWeight: 500,
            fontSize: 15,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span className="material-icons" style={{ fontSize: 20, color: '#d32f2f' }}>error_outline</span>
            <span>
              <b>Identifizierte Probleme:</b>
            </span>
          </div>
          <ul style={{ margin: 0, paddingLeft: 24, color: '#b71c1c', fontWeight: 400 }}>
            {allSystemErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Linked Forms and Documents */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {/* Render form buttons */}
        {item.linkedForms.map((formId) => {
          const formLabel = availableForms.find((f: { id: string; label: string }) => f.id === formId)?.label || formId;
          return (
            <button
              key={formId}
              onClick={() => onOpenForm(formId)}
              style={{
                padding: '7px 16px',
                background: '#064497',
                color: '#fff',
                border: 'none',
                borderRadius: 5,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                fontSize: 15,
                fontWeight: 500,
              }}
            >
              <span className="material-icons" style={{ fontSize: 18 }}>description</span>
              {formLabel}
            </button>
          );
        })}
        
        {/* Render dynamic document buttons based on available documents */}
        {availableDocuments.map((doc) => {
          return (
            <button
              key={doc.id}
              onClick={() => handleDocumentClick(doc.id)}
              style={{
                padding: '7px 16px',
                background: '#064497',
                color: '#fff',
                border: 'none',
                borderRadius: 5,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                fontSize: 15,
                fontWeight: 500,
              }}
            >
              <span className="material-icons" style={{ fontSize: 18 }}>picture_as_pdf</span>
              {doc.label}
            </button>
          );
        })}
        
        {/* Render signed document buttons */}
        {item.linkedSignedDocs && item.linkedSignedDocs.map((signedDocId) => {
          const signedDoc = userData?.signature_documents?.[signedDocId];
          if (!signedDoc || !signedDoc.uploaded) return null;
          
          return (
            <button
              key={signedDocId}
              onClick={() => handleDocumentClick(signedDocId)}
              style={{
                padding: '7px 16px',
                background: '#064497',
                color: '#fff',
                border: 'none',
                borderRadius: 5,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                fontSize: 15,
                fontWeight: 500,
              }}
            >
              <span className="material-icons" style={{ fontSize: 18 }}>edit</span>
              {signedDoc.title}
            </button>
          );
        })}
      </div>

            {/* Linked Checklist Items - only for calculation items */}
      {item.id.endsWith('calculation') && linkedChecklistItems.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: 12,
                position: 'relative'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8,
                  color: '#064497',
                  fontSize: 16,
                  fontWeight: 600
                }}>
                  <span className="material-icons" style={{ fontSize: 20 }}>link</span>
                  Verwandte Prüfpunkte
                </div>
                <button
                  onClick={async () => {
                    if (!onRefreshData) return;
                    
                    setIsRefreshing(true);
                    try {
                      // Call the parent's refresh function to get fresh data from database
                      await onRefreshData();
                      
                      // Update local linked items with fresh data
                      setLinkedChecklistItems(findLinkedChecklistItems());
                      
                      setRefreshMessage('✓ Aktualisiert');
                      setRefreshMessageType('success');
                      setShowRefreshSuccess(true);
                      // Hide success message after 2 seconds
                      setTimeout(() => setShowRefreshSuccess(false), 2000);
                    } catch (error) {
                      console.error('Error refreshing data:', error);
                      // Show error message
                      setRefreshMessage('✗ Fehler beim Aktualisieren');
                      setRefreshMessageType('error');
                      setShowRefreshSuccess(true);
                      // Hide error message after 3 seconds
                      setTimeout(() => setShowRefreshSuccess(false), 3000);
                    } finally {
                      setIsRefreshing(false);
                    }
                  }}
                  disabled={isRefreshing}
                  style={{
                    padding: '8px 8px',
                    background: isRefreshing ? '#e9ecef' : '#f2f2f2',
                    color: '#064497',
                    border: '1px solid #dee2e6',
                    borderRadius: 14,
                    cursor: isRefreshing ? 'not-allowed' : 'pointer',
                    fontSize: 15,
                    fontWeight: 500,
                    minWidth: 120,
                    maxWidth: 120,
                    marginRight: 14,
                    lineHeight: 1.3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    transition: 'all 0.2s ease',
                    opacity: isRefreshing ? 0.7 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isRefreshing) {
                      e.currentTarget.style.background = '#e9ecef';
                      e.currentTarget.style.borderColor = '#064497';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isRefreshing) {
                      e.currentTarget.style.background = isRefreshing ? '#e9ecef' : '#f2f2f2';
                      e.currentTarget.style.borderColor = '#dee2e6';
                    }
                  }}
                  title="Status der verknüpften Prüfpunkte aktualisieren"
                >
                  <span 
                    className="material-icons" 
                    style={{ 
                      fontSize: 16,
                      transform: isRefreshing ? 'rotate(360deg)' : 'rotate(0deg)',
                      transition: 'transform 0.5s ease-in-out'
                    }}
                  >
                    refresh
                  </span>
                  {isRefreshing ? 'Aktualisiere...' : 'Aktualisieren'}
                </button>
                {showRefreshSuccess && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    background: refreshMessageType === 'success' ? '#4caf50' : '#f44336',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 500,
                    marginTop: 4,
                    zIndex: 10,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}>
                    {refreshMessage}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {linkedChecklistItems.map((linkedItem) => {
                  // Get status color based on agent status - matching ChecklistPanel styling
                  const getStatusColor = (status: string) => {
                    switch (status) {
                      case 'correct':
                        return { background: '#e6f4ea', color: '#388e3c', borderColor: '#388e3c' };
                      case 'wrong':
                        return { background: '#fdecea', color: '#d32f2f', borderColor: '#d32f2f' };
                      default:
                        return { background: '#f2f2f2', color: '#757575', borderColor: '#bdbdbd' };
                    }
                  };

                  const statusColors = getStatusColor(linkedItem.agentStatus);
                  const statusLabel = STATUS_LABELS[linkedItem.agentStatus as ChecklistStatus] || 'Ungeprüft';

                  return (
                    <button
                      key={linkedItem.id}
                      onClick={() => handleLinkedItemClick(linkedItem.id)}
                      style={{
                        padding: '10px 14px',
                        background: '#fff',
                        color: '#064497',
                        border: '2px solid #e0e0e0',
                        borderRadius: 8,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        fontSize: 14,
                        fontWeight: 500,
                        width: '100%',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#064497';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(6, 68, 151, 0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e0e0e0';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 6,
                        flex: 1,
                        minWidth: 0
                      }}>
                        <span className="material-icons" style={{ fontSize: 16, color: '#064497', flexShrink: 0 }}>
                          checklist
                        </span>
                        <span style={{ 
                          flex: 1, 
                          textAlign: 'left',
                          lineHeight: 1.3,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {linkedItem.title}
                        </span>
                      </div>
                      <div style={{
                        ...statusColors,
                        borderRadius: 14,
                        padding: '4px 14px',
                        fontSize: 15,
                        fontWeight: 600,
                        border: `1px solid ${statusColors.borderColor}`,
                        flexShrink: 0,
                        minWidth: 120,
                        textAlign: 'center'
                      }}>
                        {statusLabel}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
      )}

      {/* Agenten-Notiz */}
      <div style={{ marginTop: 10 }}>
        {/* Only show either the button or the headline at the same time */}
        {!showNoteInput && !isReadOnly && (
          <button
            onClick={() => setShowNoteInput(true)}
            style={{
              padding: '7px 16px',
              background: '#f2f2f2',
              color: '#064497',
              border: '1px solid #bdbdbd',
              borderRadius: 5,
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: 15,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              justifyContent: 'flex-start',
            }}
          >
            <span className="material-icons" style={{ fontSize: 20 }}>add</span>
            Kommentar hinzufügen
          </button>
        )}
        {showNoteInput && (
          <div style={{ width: '100%', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#666', fontWeight: 500, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="material-icons" style={{ fontSize: 18, color: '#757575' }}>edit_note</span>
                Kommentar
              </div>
              <textarea
                value={tempNotes}
                onChange={(e) => { setTempNotes(e.target.value); setNotesChanged(true); }}
                rows={2}
                disabled={isReadOnly}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 6,
                  border: '1px solid #bdbdbd',
                  fontSize: 15,
                  resize: 'vertical',
                  minHeight: 88,
                  marginBottom: 0,
                }}
                placeholder="Kommentar hinzufügen..."
              />
            </div>
            {!isReadOnly && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 30 }}>
                <button
                  onClick={() => setShowNoteInput(false)}
                  style={{
                    width: 40,
                    height: 40,
                    background: '#e0e0e0',
                    color: '#757575',
                    border: 'none',
                    borderRadius: 5,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                    marginBottom: 0,
                  }}
                  title="Abbrechen"
                >
                  <span className="material-icons">close</span>
                </button>
                <button
                  onClick={handleSaveNotes}
                  disabled={!notesChanged}
                  style={{
                    width: 40,
                    height: 40,
                    background: notesChanged ? '#064497' : '#bdbdbd',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 5,
                    cursor: notesChanged ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: 22,
                    transition: 'background 0.2s',
                }}
                title="Speichern"
              >
                <span className="material-icons">save</span>
              </button>
              </div>
            )}
          </div>
        )}
        {/* Show last note if exists and not editing */}
        {!showNoteInput && item.agentNotes && (
          <div style={{ marginTop: 8, color: '#333', fontSize: 15, background: '#f7f7f7', borderRadius: 5, padding: '8px 12px', border: '1px solid #e0e0e0' }}>{item.agentNotes}</div>
        )}
      </div>
    </div>
  );
};

export default ChecklistItem; 