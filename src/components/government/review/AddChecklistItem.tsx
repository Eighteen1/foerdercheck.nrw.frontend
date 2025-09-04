import React, { useState } from 'react';
import { ChecklistItem } from '../../../types/checklist';
import { availableForms } from './FormsDocsPanel';
import { DOCUMENT_LABELS } from './FormsDocsPanel';

interface AddChecklistItemProps {
  onAdd: (item: ChecklistItem) => void;
  onCancel: () => void;
  userData?: any; // Add userData prop to access document_status
}

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

const AddChecklistItem: React.FC<AddChecklistItemProps> = ({ onAdd, onCancel, userData }) => {
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [selectedForms, setSelectedForms] = useState<string[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [selectedSignedDocs, setSelectedSignedDocs] = useState<string[]>([]);

  // Get available uploaded documents
  const availableUploadedDocs = getUploadedDocuments(userData?.document_status, userData);
  
  // Get available signed documents
  const availableSignedDocs = userData?.signature_documents 
    ? Object.entries(userData.signature_documents)
        .filter(([_, doc]: [string, any]) => doc.uploaded)
        .map(([docId, doc]: [string, any]) => ({
          id: docId,
          label: doc.title
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
    : [];

  const handleSubmit = () => {
    if (!title.trim()) return;

    const newItem: ChecklistItem = {
      id: `custom-${Date.now()}`,
      title: title.trim(),
      systemStatus: 'created',
      agentStatus: 'undefined',
      systemComment: comment.trim(),
      systemErrors: [],
      linkedForms: selectedForms,
      linkedDocs: selectedDocs, // Now contains full document IDs
      linkedSignedDocs: selectedSignedDocs,
      agentNotes: null
    };

    onAdd(newItem);
  };

  const toggleForm = (formId: string) => {
    setSelectedForms(prev => 
      prev.includes(formId) 
        ? prev.filter(id => id !== formId)
        : [...prev, formId]
    );
  };

  const toggleDoc = (docId: string) => {
    setSelectedDocs(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const toggleSignedDoc = (signedDocId: string) => {
    setSelectedSignedDocs(prev => 
      prev.includes(signedDocId) 
        ? prev.filter(id => id !== signedDocId)
        : [...prev, signedDocId]
    );
  };

  return (
    <div style={{
      border: '1px solid #e0e0e0',
      borderRadius: 12,
      padding: 24,
      marginBottom: 24,
      background: '#fff',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    }}>
      <h3 style={{ margin: '0 0 20px 0', color: '#064497', fontWeight: 400, fontSize: 22 }}>Neues To-Do erstellen</h3>

      {/* Title Input */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: '#666', fontWeight: 500, marginBottom: 6 }}>Titel:</div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: 6,
            border: '1px solid #bdbdbd',
            fontSize: 15,
          }}
          placeholder="Titel eingeben..."
        />
      </div>

      {/* Comment Input */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: '#666', fontWeight: 500, marginBottom: 6 }}>Prüferkommentar:</div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
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

      {/* Forms Selection */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: '#666', fontWeight: 500, marginBottom: 6 }}>Verknüpfte Formulare:</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {availableForms.map((form: { id: string; label: string }) => (
            <button
              key={form.id}
              onClick={() => toggleForm(form.id)}
              style={{
                padding: '7px 16px',
                background: selectedForms.includes(form.id) ? '#064497' : '#f2f2f2',
                color: selectedForms.includes(form.id) ? '#fff' : '#064497',
                border: '1px solid #bdbdbd',
                borderRadius: 5,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                fontSize: 15,
                fontWeight: 500,
              }}
            >
              <span className="material-icons" style={{ fontSize: 18 }}>
                {selectedForms.includes(form.id) ? 'check' : 'add'}
              </span>
              {form.label}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Selection - Now shows only uploaded documents */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: '#666', fontWeight: 500, marginBottom: 6 }}>
          Verknüpfte Dokumente: 
          {availableUploadedDocs.length === 0 && (
            <span style={{ fontSize: 14, color: '#999', fontWeight: 400, marginLeft: 8 }}>
              (Keine Dokumente hochgeladen)
            </span>
          )}
        </div>
        {availableUploadedDocs.length > 0 ? (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {availableUploadedDocs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => toggleDoc(doc.id)}
                style={{
                  padding: '7px 16px',
                  background: selectedDocs.includes(doc.id) ? '#064497' : '#f2f2f2',
                  color: selectedDocs.includes(doc.id) ? '#fff' : '#064497',
                  border: '1px solid #bdbdbd',
                  borderRadius: 5,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  fontSize: 15,
                  fontWeight: 500,
                }}
              >
                <span className="material-icons" style={{ fontSize: 18 }}>
                  {selectedDocs.includes(doc.id) ? 'check' : 'add'}
                </span>
                {doc.label}
              </button>
            ))}
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

      {/* Signed Documents Selection */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: '#666', fontWeight: 500, marginBottom: 6 }}>
          Verknüpfte Unterschriebene Formulare: 
          {availableSignedDocs.length === 0 && (
            <span style={{ fontSize: 14, color: '#999', fontWeight: 400, marginLeft: 8 }}>
              (Keine unterschriebenen Formulare hochgeladen)
            </span>
          )}
        </div>
        {availableSignedDocs.length > 0 ? (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {availableSignedDocs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => toggleSignedDoc(doc.id)}
                style={{
                  padding: '7px 16px',
                  background: selectedSignedDocs.includes(doc.id) ? '#064497' : '#f2f2f2',
                  color: selectedSignedDocs.includes(doc.id) ? '#fff' : '#064497',
                  border: '1px solid #bdbdbd',
                  borderRadius: 5,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  fontSize: 15,
                  fontWeight: 500,
                }}
              >
                <span className="material-icons" style={{ fontSize: 18 }}>
                  {selectedSignedDocs.includes(doc.id) ? 'check' : 'add'}
                </span>
                {doc.label}
              </button>
            ))}
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
            Keine unterschriebenen Formulare verfügbar. Bitte laden Sie zuerst unterschriebene Formulare hoch, um sie mit diesem To-Do verknüpfen zu können.
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          style={{
            padding: '10px 20px',
            background: '#f2f2f2',
            color: '#666',
            border: '1px solid #bdbdbd',
            borderRadius: 5,
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: 15,
          }}
        >
          Abbrechen
        </button>
        <button
          onClick={handleSubmit}
          disabled={!title.trim()}
          style={{
            padding: '10px 20px',
            background: title.trim() ? '#064497' : '#bdbdbd',
            color: '#fff',
            border: 'none',
            borderRadius: 5,
            cursor: title.trim() ? 'pointer' : 'not-allowed',
            fontWeight: 500,
            fontSize: 15,
          }}
        >
          Erstellen
        </button>
      </div>
    </div>
  );
};

export default AddChecklistItem; 