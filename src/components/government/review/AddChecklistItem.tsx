import React, { useState } from 'react';
import { ChecklistItem } from '../../../types/checklist';
import { availableForms } from './FormsDocsPanel';
import { DOCUMENT_LABELS } from './FormsDocsPanel';

interface AddChecklistItemProps {
  onAdd: (item: ChecklistItem) => void;
  onCancel: () => void;
}

const AddChecklistItem: React.FC<AddChecklistItemProps> = ({ onAdd, onCancel }) => {
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [selectedForms, setSelectedForms] = useState<string[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);

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
      linkedDocs: selectedDocs,
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

      {/* Documents Selection */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: '#666', fontWeight: 500, marginBottom: 6 }}>Verknüpfte Dokumente:</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {Object.entries(DOCUMENT_LABELS).map(([docId, label]) => (
            <button
              key={docId}
              onClick={() => toggleDoc(docId)}
              style={{
                padding: '7px 16px',
                background: selectedDocs.includes(docId) ? '#064497' : '#f2f2f2',
                color: selectedDocs.includes(docId) ? '#fff' : '#064497',
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
                {selectedDocs.includes(docId) ? 'check' : 'add'}
              </span>
              {label}
            </button>
          ))}
        </div>
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