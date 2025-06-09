import React, { useState, useRef, useEffect } from 'react';
import { ChecklistItemProps, ChecklistStatus } from '../../../types/checklist';
import { availableForms } from './FormsDocsPanel';
import { DOCUMENT_LABELS } from './FormsDocsPanel';

const STATUS_LABELS: Record<ChecklistStatus, string> = {
  correct: 'Korrekt',
  wrong: 'Falsch',
  undefined: 'Ungeprüft',
  created: 'Erstellt',
};

const ChecklistItem: React.FC<ChecklistItemProps> = ({
  item,
  onStatusChange,
  onNotesChange,
  onOpenForm,
  onOpenDocument,
}) => {
  const [tempNotes, setTempNotes] = useState(item.agentNotes || '');
  const [notesChanged, setNotesChanged] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [isSmall, setIsSmall] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset tempNotes and note input state when item changes
  useEffect(() => {
    setTempNotes(item.agentNotes || '');
    setShowNoteInput(false);
    setNotesChanged(false);
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
        // maxWidth removed so it can fill parent
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
      {item.systemErrors.length > 0 && (
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
      )}

      {/* Linked Forms and Documents */}
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
          const docLabel = DOCUMENT_LABELS[docId] || docId;
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