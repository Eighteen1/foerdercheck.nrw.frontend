import React, { useState, useRef, useEffect } from 'react';
import { ChecklistItemProps, ChecklistStatus } from '../../../types/checklist';
import { availableForms } from './FormsDocsPanel';
import { DOCUMENT_LABELS } from './FormsDocsPanel';

// Extend props to include onDelete and onEdit (for title/comment/errors) and userData
type CustomChecklistItemProps = ChecklistItemProps & {
  onDelete: (id: string) => void;
  onEdit?: (id: string, updates: Partial<{ title: string; systemComment: string; systemErrors: string[]; linkedForms: string[]; linkedDocs: string[] }>) => void;
  userData?: any; // Add userData prop to access document_status
};

// Helper function to get applicant label with UID-based naming
const getApplicantLabel = (applicantKey: string, userData?: any): string => {
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

// Helper function to generate available uploaded documents
const getUploadedDocuments = (documentStatus: any, userData?: any): { id: string; label: string }[] => {
  const uploadedDocs: { id: string; label: string }[] = [];
  
  if (!documentStatus || typeof documentStatus !== 'object') {
    return uploadedDocs;
  }

  // Iterate through all applicant categories
  Object.entries(documentStatus).forEach(([applicantKey, applicantDocs]: [string, any]) => {
    if (!applicantDocs || typeof applicantDocs !== 'object') return;
    
    // Iterate through document types for this applicant
    Object.entries(applicantDocs).forEach(([docTypeId, files]: [string, any]) => {
      if (!Array.isArray(files)) return;
      
      // Filter only uploaded files
      const uploadedFiles = files.filter((file: any) => file.uploaded);
      
      uploadedFiles.forEach((file: any, index: number) => {
        const fullDocumentId = `${applicantKey}_${docTypeId}_${index}`;
        const baseLabel = DOCUMENT_LABELS[docTypeId] || docTypeId;
        const applicantLabel = getApplicantLabel(applicantKey, userData);
        
        // Create label with applicant context and file numbering if multiple files
        let label;
        if (applicantKey === 'general') {
          // For general documents, don't add "- Allgemein" suffix
          if (uploadedFiles.length > 1) {
            label = `${baseLabel} (${index + 1})`;
          } else {
            label = baseLabel;
          }
        } else {
          // For applicant-specific documents, include applicant label
          if (uploadedFiles.length > 1) {
            label = `${baseLabel} (${index + 1}) - ${applicantLabel}`;
          } else {
            label = `${baseLabel} - ${applicantLabel}`;
          }
        }
        
        uploadedDocs.push({
          id: fullDocumentId,
          label: label
        });
      });
    });
  });
  
  // Sort by label for better UX
  uploadedDocs.sort((a, b) => a.label.localeCompare(b.label));
  
  return uploadedDocs;
};

// Helper function to get document label from full document ID
const getDocumentLabelFromFullId = (fullDocId: string, userData?: any): string => {
  // Parse full document ID like "general_meldebescheinigung_0" or "applicant_UUID_arbeitslosengeldbescheid_0"
  const parts = fullDocId.split('_');
  if (parts.length < 3) {
    return DOCUMENT_LABELS[fullDocId] || fullDocId;
  }
  
  let docTypeId: string;
  let applicantKey: string;
  let index: number;
  
  if (parts[0] === 'applicant') {
    // Format: applicant_UUID_documentType_index
    applicantKey = `${parts[0]}_${parts[1]}`;
    docTypeId = parts.slice(2, -1).join('_');
    index = parseInt(parts[parts.length - 1]);
  } else {
    // Format: general_documentType_index or hauptantragsteller_documentType_index
    applicantKey = parts[0];
    docTypeId = parts.slice(1, -1).join('_');
    index = parseInt(parts[parts.length - 1]);
  }
  
  const baseLabel = DOCUMENT_LABELS[docTypeId] || docTypeId;
  const applicantLabel = getApplicantLabel(applicantKey, userData);
  
  // Check if there are multiple files of this type for this applicant
  let hasMultipleFiles = false;
  if (userData?.document_status) {
    const documentFiles = userData.document_status[applicantKey]?.[docTypeId];
    if (documentFiles && Array.isArray(documentFiles)) {
      const uploadedFiles = documentFiles.filter((file: any) => file.uploaded);
      hasMultipleFiles = uploadedFiles.length > 1;
    }
  }
  
  // Generate label based on applicant type and file count
  if (applicantKey === 'general') {
    // For general documents, don't add "- Allgemein" suffix
    if (hasMultipleFiles) {
      return `${baseLabel} (${index + 1})`;
    } else {
      return baseLabel;
    }
  } else {
    // For applicant-specific documents, include applicant label
    if (hasMultipleFiles) {
      return `${baseLabel} (${index + 1}) - ${applicantLabel}`;
    } else {
      return `${baseLabel} - ${applicantLabel}`;
    }
  }
};

const CustomChecklistItem: React.FC<CustomChecklistItemProps> = ({
  item,
  onStatusChange,
  onNotesChange,
  onOpenForm,
  onOpenDocument,
  onDelete,
  onEdit,
  userData,
}) => {
  const [tempNotes, setTempNotes] = useState(item.agentNotes || '');
  const [notesChanged, setNotesChanged] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(item.title);
  const [editedComment, setEditedComment] = useState(item.systemComment);
  const [editedErrors, setEditedErrors] = useState<string[]>(item.systemErrors || []);
  const [editedForms, setEditedForms] = useState<string[]>(item.linkedForms || []);
  const [editedDocs, setEditedDocs] = useState<string[]>(item.linkedDocs || []);
  const [formToAdd, setFormToAdd] = useState('');
  const [docToAdd, setDocToAdd] = useState('');
  const [isSmall, setIsSmall] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get available uploaded documents for editing
  const availableUploadedDocs = getUploadedDocuments(userData?.document_status, userData);

  // Reset states when item changes
  useEffect(() => {
    setTempNotes(item.agentNotes || '');
    setShowNoteInput(false);
    setNotesChanged(false);
    setEditedTitle(item.title);
    setEditedComment(item.systemComment);
    setEditedErrors(item.systemErrors || []);
    setEditedForms(item.linkedForms || []);
    setEditedDocs(item.linkedDocs || []);
    setFormToAdd('');
    setDocToAdd('');
    setIsEditing(false);
    setShowDeleteDialog(false);
  }, [item.id]);

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

  const handleSaveEdits = () => {
    if (onEdit) {
      onEdit(item.id, {
        title: editedTitle,
        systemComment: editedComment,
        systemErrors: editedErrors,
        linkedForms: editedForms,
        linkedDocs: editedDocs,
      });
    }
    setIsEditing(false);
  };

  // Error editing handlers
  const handleErrorChange = (idx: number, value: string) => {
    setEditedErrors((prev) => prev.map((err, i) => (i === idx ? value : err)));
  };
  const handleAddError = () => {
    setEditedErrors((prev) => [...prev, '']);
  };
  const handleRemoveError = (idx: number) => {
    setEditedErrors((prev) => prev.filter((_, i) => i !== idx));
  };

  // Linked forms/docs handlers
  const handleAddForm = () => {
    if (formToAdd && !editedForms.includes(formToAdd)) {
      setEditedForms(prev => [...prev, formToAdd]);
      setFormToAdd('');
    }
  };
  const handleRemoveForm = (formId: string) => {
    setEditedForms(prev => prev.filter(f => f !== formId));
  };
  const handleAddDoc = () => {
    if (docToAdd && !editedDocs.includes(docToAdd)) {
      setEditedDocs(prev => [...prev, docToAdd]);
      setDocToAdd('');
    }
  };
  const handleRemoveDoc = (docId: string) => {
    setEditedDocs(prev => prev.filter(d => d !== docId));
  };

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
      {/* Header with Edit and Delete Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
          {isEditing ? (
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              style={{
                fontSize: 22,
                color: '#064497',
                fontWeight: 400,
                border: '1px solid #bdbdbd',
                borderRadius: 6,
                padding: '8px 12px',
                width: '100%',
                marginRight: 12
              }}
            />
          ) : (
            <h3 style={{ margin: 0, color: '#064497', fontWeight: 400, fontSize: 22 }}>{item.title}</h3>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => {
              if (isEditing) handleSaveEdits();
              else setIsEditing(true);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#064497',
              cursor: 'pointer',
              padding: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <span className="material-icons" style={{ fontSize: 20 }}>
              {isEditing ? 'save' : 'edit'}
            </span>
            {isEditing ? 'Speichern' : 'Bearbeiten'}
          </button>
          <button
            onClick={() => setShowDeleteDialog(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#d32f2f',
              cursor: 'pointer',
              padding: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
            title="Löschen"
          >
            <span className="material-icons" style={{ fontSize: 20 }}>delete</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.25)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.15)', minWidth: 320 }}>
            <div style={{ fontSize: 18, fontWeight: 500, color: 'black', marginBottom: 18 }}>Möchten Sie dieses To-Do wirklich löschen?</div>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', gap: 16, width: '100%', padding: '0 16px' }}>
                <button
                  onClick={() => setShowDeleteDialog(false)}
                  style={{ 
                    flex: 1,
                    padding: '8px 18px', 
                    background: '#f2f2f2', 
                    color: '#666', 
                    border: '1px solid #bdbdbd', 
                    boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                    borderRadius: 5, 
                    cursor: 'pointer', 
                    fontWeight: 500 
                  }}
                >Abbrechen</button>
                <button
                  onClick={() => { setShowDeleteDialog(false); onDelete(item.id); }}
                  style={{ 
                    flex: 1,
                    padding: '8px 18px', 
                    background: '#d32f2f', 
                    color: '#fff', 
                    border: 'none', 
                    boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                    borderRadius: 5, 
                    cursor: 'pointer', 
                    fontWeight: 500 
                  }}
                >Löschen</button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Error Editing Section (Identifizierte Probleme) */}
      {isEditing ? (
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: '#d32f2f', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-icons" style={{ fontSize: 20, color: '#d32f2f' }}>error_outline</span>
            Identifizierte Probleme:
          </div>
          {editedErrors.length === 0 && (
            <div style={{ color: '#bdbdbd', fontSize: 15, marginBottom: 8 }}>Keine Probleme hinzugefügt.</div>
          )}
          <ul style={{ margin: 0, paddingLeft: 24, color: '#b71c1c', fontWeight: 400 }}>
            {editedErrors.map((error, idx) => (
              <li key={idx} style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="text"
                  value={error}
                  onChange={e => handleErrorChange(idx, e.target.value)}
                  style={{ flex: 1, padding: '6px 10px', borderRadius: 5, border: '1px solid #bdbdbd', fontSize: 15 }}
                  placeholder="Problemtext..."
                />
                <button
                  onClick={() => handleRemoveError(idx)}
                  style={{ background: 'none', border: 'none', color: '#d32f2f', cursor: 'pointer', fontSize: 20 }}
                  title="Entfernen"
                >
                  <span className="material-icons">delete</span>
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={handleAddError}
            style={{ marginTop: 8, background: '#ffffff', color: '#d32f2f', border: '1px solid #d32f2f', borderRadius: 5, padding: '6px 14px', fontWeight: 500, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', gap: 6 }}
          >
            <span className="material-icons" style={{ fontSize: 18 }}>add</span>
            Problem hinzufügen
          </button>
        </div>
      ) : (
        item.systemErrors.length > 0 && (
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
              {item.systemErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )
      )}

      {/* Prüferkommentar */}
      {isEditing ? (
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: '#666', fontWeight: 500, marginBottom: 6 }}>Prüferkommentar:</div>
          <textarea
            value={editedComment}
            onChange={(e) => setEditedComment(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: 6,
              border: '1px solid #bdbdbd',
              fontSize: 15,
              resize: 'vertical',
              minHeight: 88,
            }}
            placeholder="Kommentar hinzufügen..."
          />
        </div>
      ) : (
        item.systemComment && (
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
              <b>Prüferkommentar:</b> {item.systemComment}
            </span>
          </div>
        )
      )}

      {/* Linked Forms and Documents */}
      {isEditing ? (
        <div style={{ marginBottom: 20 }}>
          {/* Linked Forms */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: '#666', fontWeight: 500, marginBottom: 6 }}>Verknüpfte Formulare:</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {editedForms.map(formId => {
                const formLabel = availableForms.find(f => f.id === formId)?.label || formId;
                return (
                  <span key={formId} style={{ background: '#eaf2fb', color: '#064497', borderRadius: 5, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 15, fontWeight: 500 }}>
                    <span className="material-icons" style={{ fontSize: 18 }}>description</span>
                    {formLabel}
                    <button onClick={() => handleRemoveForm(formId)} style={{ background: 'none', border: 'none', color: '#d32f2f', marginLeft: 4, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 24, width: 24 }} title="Entfernen">
                      <span className="material-icons" style={{ fontSize: 22, display: 'block' }}>close</span>
                    </button>
                  </span>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ position: 'relative', display: 'inline-block', width: 300 }}>
                <select value={formToAdd} onChange={e => setFormToAdd(e.target.value)} style={{ padding: '6px 12px', borderRadius: 5, border: '1px solid #bdbdbd', fontSize: 15, width: '100%', minWidth: 0, paddingRight: 40, appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', background: 'none' }}>
                  <option value="">Formular auswählen...</option>
                  {availableForms.filter(f => !editedForms.includes(f.id)).map(form => (
                    <option key={form.id} value={form.id}>{form.label}</option>
                  ))}
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
              <button onClick={handleAddForm} disabled={!formToAdd} style={{ background: '#064497', color: '#fff', border: 'none', borderRadius: 5, padding: '6px 14px', fontWeight: 500, fontSize: 15, cursor: formToAdd ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="material-icons" style={{ fontSize: 18 }}>add</span>
                Hinzufügen
              </button>
            </div>
          </div>
          {/* Linked Documents - Now shows only uploaded documents */}
          <div>
            <div style={{ color: '#666', fontWeight: 500, marginBottom: 6 }}>
              Verknüpfte Dokumente:
              {availableUploadedDocs.length === 0 && (
                <span style={{ fontSize: 14, color: '#999', fontWeight: 400, marginLeft: 8 }}>
                  (Keine Dokumente hochgeladen)
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {editedDocs.map(docId => {
                const docLabel = getDocumentLabelFromFullId(docId, userData);
                return (
                  <span key={docId} style={{ background: '#eaf2fb', color: '#064497', borderRadius: 5, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 15, fontWeight: 500 }}>
                    <span className="material-icons" style={{ fontSize: 18 }}>picture_as_pdf</span>
                    {docLabel}
                    <button onClick={() => handleRemoveDoc(docId)} style={{ background: 'none', border: 'none', color: '#d32f2f', marginLeft: 4, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 24, width: 24 }} title="Entfernen">
                      <span className="material-icons" style={{ fontSize: 22, display: 'block' }}>close</span>
                    </button>
                  </span>
                );
              })}
            </div>
            {availableUploadedDocs.length > 0 ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ position: 'relative', display: 'inline-block', width: 300 }}>
                  <select value={docToAdd} onChange={e => setDocToAdd(e.target.value)} style={{ padding: '6px 12px', borderRadius: 5, border: '1px solid #bdbdbd', fontSize: 15, width: '100%', minWidth: 0, paddingRight: 40, appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', background: 'none' }}>
                    <option value="">Dokument auswählen...</option>
                    {availableUploadedDocs.filter(doc => !editedDocs.includes(doc.id)).map(doc => (
                      <option key={doc.id} value={doc.id}>{doc.label}</option>
                    ))}
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
                <button onClick={handleAddDoc} disabled={!docToAdd} style={{ background: '#064497', color: '#fff', border: 'none', borderRadius: 5, padding: '6px 14px', fontWeight: 500, fontSize: 15, cursor: docToAdd ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="material-icons" style={{ fontSize: 18 }}>add</span>
                  Hinzufügen
                </button>
              </div>
            ) : (
              <div style={{ 
                padding: '20px', 
                background: '#f8f9fa', 
                borderRadius: 6, 
                border: '1px dashed #dee2e6',
                textAlign: 'center',
                color: '#6c757d',
                fontSize: 15
              }}>
                Keine Dokumente verfügbar. Bitte laden Sie zuerst Dokumente hoch, um sie mit diesem To-Do verknüpfen zu können.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
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
          {item.linkedDocs.map((docId) => {
            const docLabel = getDocumentLabelFromFullId(docId, userData);
            return (
              <button
                key={docId}
                onClick={() => onOpenDocument(docId)}
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
                {docLabel}
              </button>
            );
          })}
        </div>
      )}

      {/* Agenten-Notiz */}
      <div style={{ marginTop: 10 }}>
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
        {!showNoteInput && item.agentNotes && (
          <div style={{ marginTop: 8, color: '#333', fontSize: 15, background: '#f7f7f7', borderRadius: 5, padding: '8px 12px', border: '1px solid #e0e0e0' }}>{item.agentNotes}</div>
        )}
      </div>
    </div>
  );
};

export default CustomChecklistItem; 