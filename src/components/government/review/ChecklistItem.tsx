import React, { useState, useRef, useEffect } from 'react';
import { ChecklistItemProps, ChecklistStatus } from '../../../types/checklist';
import { availableForms } from './FormsDocsPanel';
import { DOCUMENT_LABELS } from './FormsDocsPanel';
import { DOCUMENT_CATEGORY_MAPPING } from '../../../utils/checklistGenerator';

const STATUS_LABELS: Record<ChecklistStatus, string> = {
  correct: 'Korrekt',
  wrong: 'Falsch',
  undefined: 'Ungeprüft',
  created: 'Erstellt',
};

interface DynamicChecklistItemProps extends ChecklistItemProps {
  residentId?: string;
  userData?: any; // For accessing document_status
  onSystemErrorsUpdate?: (itemId: string, errors: string[]) => void;
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
}) => {
  const [tempNotes, setTempNotes] = useState(item.agentNotes || '');
  const [notesChanged, setNotesChanged] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [isSmall, setIsSmall] = useState(false);
  const [availableDocuments, setAvailableDocuments] = useState<{ id: string; label: string }[]>([]);
  const [dynamicSystemErrors, setDynamicSystemErrors] = useState<string[]>([]);
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
    const labels: Record<string, string> = {
      'meldebescheinigung': 'Meldebescheinigung',
      'gehaltsabrechnung': 'Gehaltsabrechnung',
      'lohn_gehaltsbescheinigungen': 'Lohn-/Gehaltsbescheinigungen',
      'einkommenssteuerbescheid': 'Einkommenssteuerbescheid',
      'einkommenssteuererklaerung': 'Einkommenssteuererklärung',
      'bauzeichnung': 'Bauzeichnung',
      'lageplan': 'Lageplan',
      'heiratsurkunde': 'Heiratsurkunde',
      'marriage_cert': 'Heiratsurkunde/Lebenspartnerschaftsurkunde',
      'unterhaltsleistungen_nachweis': 'Nachweis Unterhaltsleistungen',
      'guv_euer_nachweis': 'Gewinn- und Verlustrechnung (GuV)/EÜR',
      'unterhaltsverpflichtung_nachweis': 'Nachweis Unterhaltsverpflichtung',
      'rentenbescheid': 'Rentenbescheid',
      'arbeitslosengeldbescheid': 'Arbeitslosengeldbescheid',
      'werbungskosten_nachweis': 'Nachweis Werbungskosten',
      'kinderbetreuungskosten_nachweis': 'Nachweis Kinderbetreuungskosten',
      'krankengeld_nachweis': 'Nachweis Krankengeld',
      'elterngeld_nachweis': 'Nachweis Elterngeld',
      'ausbildungsfoerderung_nachweis': 'Nachweis Ausbildungsförderung',
      'sonstige_dokumente': 'Sonstige Dokumente'
    };
    
    return labels[docId] || docId;
  };

  // Function to resolve documents and generate buttons/errors dynamically
  const resolveDocuments = () => {
    if (!userData?.document_status || !item.linkedDocs || item.linkedDocs.length === 0) {
      setAvailableDocuments([]);
      setDynamicSystemErrors([]);
      return;
    }

    const applicantKey = getApplicantKeyFromItemId(item.id);
    const buttons: { id: string; label: string }[] = [];
    const missingDocErrors: string[] = [];

    // Process each base document ID from linkedDocs
    item.linkedDocs.forEach(docId => {
      // Step 1: Check document category (general or applicant)
      const category = DOCUMENT_CATEGORY_MAPPING[docId];
      let searchKey = applicantKey;

      // Step 2: If document belongs to general category, always search in 'general'
      if (category === 'general') {
        searchKey = 'general';
      }

      // Step 3: Search for documents of this type in the appropriate section
      const documentFiles = userData.document_status?.[searchKey]?.[docId];

      if (documentFiles && Array.isArray(documentFiles) && documentFiles.length > 0) {
        // Filter only uploaded files
        const uploadedFiles = documentFiles.filter((file: any) => file.uploaded);

        if (uploadedFiles.length === 1) {
          // Single file - create one button
          buttons.push({
            id: `${searchKey}_${docId}_0`,
            label: getDocumentLabel(docId)
          });
        } else if (uploadedFiles.length > 1) {
          // Multiple files - create numbered buttons
          uploadedFiles.forEach((file: any, index: number) => {
            buttons.push({
              id: `${searchKey}_${docId}_${index}`,
              label: `${getDocumentLabel(docId)} (${index + 1})`
            });
          });
        }
      } else {
        // Step 4: Document not found - add to missing documents
        const applicantName = getApplicantNameWithAbbreviation(searchKey);
        missingDocErrors.push(`Fehlendes Dokument: ${getDocumentLabel(docId)} - ${applicantName}`);
      }
    });

    setAvailableDocuments(buttons);
    setDynamicSystemErrors(missingDocErrors);

    // Notify parent component about updated errors
    if (onSystemErrorsUpdate) {
      // Combine original system errors (non-document related) with missing document errors
      const originalErrors = item.systemErrors.filter(error => !error.startsWith('Fehlendes Dokument:'));
      const combinedErrors = [...originalErrors, ...missingDocErrors];
      onSystemErrorsUpdate(item.id, combinedErrors);
    }
  };

  // Reset tempNotes and note input state when item changes
  useEffect(() => {
    setTempNotes(item.agentNotes || '');
    setShowNoteInput(false);
    setNotesChanged(false);
  }, [item.id]);

  // Update available documents when userData or item changes
  useEffect(() => {
    resolveDocuments();
  }, [userData?.document_status, item.linkedDocs, item.id]);

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
  const allSystemErrors = [
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
              ...getStatusStyle(item.systemStatus),
              borderRadius: 16,
              padding: '4px 16px',
              fontWeight: 600,
              fontSize: 15,
              display: 'inline-block',
              minWidth: 90,
              textAlign: 'center',
            }}
          >
            {STATUS_LABELS[item.systemStatus]}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: isSmall ? '100%' : 'auto', marginTop: isSmall ? 8 : 0 }}>
          <span style={{ color: '#666', fontWeight: 500 }}>Prüfung:</span>
          <div style={{ position: 'relative', display: 'inline-block' }}>
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
              <option value="correct">Korrekt</option>
              <option value="wrong">Falsch</option>
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
          </div>
        </div>
      </div>

      {/* Systemkommentar */}
      {item.systemComment && (
        <div
          style={{
            marginBottom: 20,
            background: '#eaf2fb',
            borderRadius: 10,
            padding: '14px 18px',
            color: '#064497',
            display: 'flex',
            alignItems: 'center',
            fontSize: 15,
            fontWeight: 500,
            gap: 10,
          }}
        >
          <span className="material-icons" style={{ fontSize: 20, color: '#1976d2' }}>info</span>
          <span>
            <b>Systemkommentar:</b> {item.systemComment}
          </span>
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
      </div>

      {/* Agenten-Notiz */}
      <div style={{ marginTop: 10 }}>
        {/* Only show either the button or the headline at the same time */}
        {!showNoteInput && (
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