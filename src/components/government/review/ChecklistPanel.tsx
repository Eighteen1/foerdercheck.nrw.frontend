import React, { useState, useEffect } from 'react';
import { supabase, getCurrentUser } from '../../../lib/supabase';
import { ChecklistItem, ReviewData } from '../../../types/checklist';
import ChecklistItemComponent from './ChecklistItem';
import { generateChecklistItems } from '../../../utils/checklistGenerator';

type ChecklistPanelProps = {
  applicationId: string;
  onOpenForm: (formId: string) => void;
  onOpenDocument: (docId: string) => void;
  openFormId: string | null;
  openDocId?: string | null;
  onExpand: () => void;
  onProgressUpdate: (progress: number) => void;
};

const ChecklistPanel: React.FC<ChecklistPanelProps> = ({
  applicationId,
  onOpenForm,
  onOpenDocument,
  openFormId,
  openDocId,
  onExpand,
  onProgressUpdate,
}) => {
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [generatingChecklist, setGeneratingChecklist] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });

  // Function to show toast
  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => {
      setToast({ message: '', visible: false });
    }, 3000);
  };

  // Load or initialize review data
  useEffect(() => {
    const loadReviewData = async () => {
      try {
        setLoading(true);
        setError(null);
        setGeneratingChecklist(false);
        
        // Fetch the application's review data
        const { data, error } = await supabase
          .from('applications')
          .select('review_data, resident_id, status')
          .eq('id', applicationId)
          .single();

        if (error) throw error;

        if (data?.review_data && data.review_data.checklistItems && Array.isArray(data.review_data.checklistItems)) {
          // If review data exists, use it
          setChecklistItems(data.review_data.checklistItems);
        } else {
          // If no review data exists, generate initial checklist
          setGeneratingChecklist(true);
          const initialChecklist = await generateChecklistItems(applicationId, data.resident_id);
          setChecklistItems(initialChecklist);
          // Save the initial checklist and set status to in_progress if needed
          const { error: updateError, data: updateData } = await supabase
            .from('applications')
            .update({
              review_data: { checklistItems: initialChecklist },
              status: data.status === 'new' ? 'in_progress' : data.status
            })
            .eq('id', applicationId)
            .select();

          console.log('Checklist save response:', updateError, updateData);
          setGeneratingChecklist(false);
        }
      } catch (error) {
        console.error('Error loading review data:', error);
        setError('Failed to load checklist data. Please try again.');
        setChecklistItems([]); // Ensure we have an empty array on error
        setGeneratingChecklist(false);
      } finally {
        setLoading(false);
      }
    };

    loadReviewData();
  }, [applicationId]);

  const handleStatusChange = async (itemId: string, newStatus: string) => {
    try {
      const updatedItems = checklistItems.map(item =>
        item.id === itemId ? { ...item, agentStatus: newStatus as any } : item
      );
      setChecklistItems(updatedItems);
      
      // Calculate progress
      const totalItems = updatedItems.length;
      const reviewedItems = updatedItems.filter(item => 
        item.agentStatus === 'correct' || item.agentStatus === 'wrong'
      ).length;
      const progress = Math.round((reviewedItems / totalItems) * 100);
      
      console.log('Updating progress:', progress);
      
      // Save to database with updated_at and last_edit_agent
      const user = await getCurrentUser();
      const { error: updateError, data } = await supabase
        .from('applications')
        .update({
          review_data: { checklistItems: updatedItems },
          review_progress: progress,
          updated_at: new Date().toISOString(),
          last_edit_agent: user?.id || null
        })
        .eq('id', applicationId)
        .select();

      if (updateError) throw updateError;
      console.log('Update response:', data);

      // Call the progress update handler
      onProgressUpdate(progress);
    } catch (error) {
      console.error('Error updating status:', error);
      showToast('Fehler beim Speichern des Status. Bitte versuchen Sie es erneut.');
    }
  };

  const handleNotesChange = async (itemId: string, notes: string) => {
    try {
      const updatedItems = checklistItems.map(item =>
        item.id === itemId ? { ...item, agentNotes: notes } : item
      );
      setChecklistItems(updatedItems);
      
      // Save to database with updated_at and last_edit_agent
      const user = await getCurrentUser();
      const { error: updateError } = await supabase
        .from('applications')
        .update({
          review_data: { checklistItems: updatedItems },
          updated_at: new Date().toISOString(),
          last_edit_agent: user?.id || null
        })
        .eq('id', applicationId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error updating notes:', error);
      showToast('Fehler beim Speichern der Notizen. Bitte versuchen Sie es erneut.');
    }
  };

  // State indicator logic
  function getStateLabel(item: ChecklistItem): 'Unbearbeitet' | 'In Bearbeitung' | 'Bearbeitet' {
    if ((item.agentStatus === 'undefined' || !item.agentStatus) && !item.agentNotes) return 'Unbearbeitet';
    if ((item.agentStatus === 'undefined' || !item.agentStatus) && item.agentNotes) return 'In Bearbeitung';
    if (item.agentStatus === 'correct' || item.agentStatus === 'wrong') return 'Bearbeitet';
    return 'Unbearbeitet';
  }

  function getStateColor(label: string, agentStatus?: string) {
    if (label === 'Bearbeitet') {
      if (agentStatus === 'correct') {
        return { background: '#e6f4ea', color: '#388e3c' }; // green
      } else if (agentStatus === 'wrong') {
        return { background: '#fdecea', color: '#d32f2f' }; // red
      }
    }
    switch (label) {
      case 'In Bearbeitung':
        return { background: '#fffbe6', color: '#b59f00' };
      default:
        return { background: '#f2f2f2', color: '#757575' };
    }
  }

  // Helper to close open form/doc if present
  function closeOpenFormDoc() {
    if (onOpenForm && typeof onOpenForm === 'function') onOpenForm('');
    if (onOpenDocument && typeof onOpenDocument === 'function') onOpenDocument('');
  }

  if (generatingChecklist) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#666', position: 'relative', minHeight: 200 }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(255,255,255,0.85)',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}>
          <div style={{ fontSize: 22, fontWeight: 500, marginBottom: 16 }}>To-Do Liste wird generiert...</div>
          <div className="spinner-border" style={{ color: '#064497', width: 48, height: 48 }} role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#666' }}>
        Checkliste wird geladen...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, color: '#d32f2f' }}>
        {error}
      </div>
    );
  }

  // List mode: show scrollable list of titles
  if (selectedIndex === null) {
    return (
      <div style={{ width: '100%', background: 'none', padding: '0 0 24px 0' }}>
        <h4
          style={{
            fontFamily: 'Roboto',
            fontWeight: 300,
            fontSize: 22,
            margin: '0 0 22px 0',
            padding: '24px 24px 0 24px',
            color: '#000',
            letterSpacing: 0.1,
          }}
        >
          Checkliste
        </h4>
        <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '0 24px' }}>
          {checklistItems.length === 0 ? (
            <div style={{ color: '#666', textAlign: 'center', padding: 24 }}>
              No checklist items available.
            </div>
          ) : (
            checklistItems.map((item, idx) => {
              const stateLabel = getStateLabel(item);
              const stateColor = getStateColor(stateLabel, item.agentStatus);
              return (
                <button
                  key={item.id}
                  onClick={() => { closeOpenFormDoc(); setSelectedIndex(idx); }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '18px 18px',
                    marginBottom: 12,
                    borderRadius: 8,
                    background: '#fff',
                    border: 'none',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    cursor: 'pointer',
                    fontSize: 17,
                    fontWeight: 500,
                    transition: 'background 0.2s',
                  }}
                >
                  <span style={{ color: '#064497', fontWeight: 500 }}>{item.title}</span>
                  <span style={{
                    ...stateColor,
                    borderRadius: 14,
                    padding: '4px 14px',
                    fontWeight: 600,
                    fontSize: 15,
                    minWidth: 120,
                    textAlign: 'center',
                  }}>{stateLabel}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // Detail mode: show only the selected item
  const item = checklistItems[selectedIndex];
  return (
    <div style={{ width: '100%', background: 'none', padding: '0 0 24px 0', position: 'relative' }}>
      {/* Toast Notification */}
      {toast.visible && (
        <div style={{
          position: 'fixed',
          top: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#d32f2f',
          color: 'white',
          padding: '12px 24px',
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          animation: 'slideIn 0.3s ease-out'
        }}>
          <span className="material-icons" style={{ fontSize: 20 }}>error</span>
          {toast.message}
        </div>
      )}

      <div style={{ width: '100%', background: 'none', padding: 0, marginTop: 8 }}>
        <div style={{ padding: 0 }}>
          <ChecklistItemComponent
            item={item}
            onStatusChange={async (itemId, newStatus) => {
              await handleStatusChange(itemId, newStatus);
              setChecklistItems((prev) => prev.map(i => i.id === itemId ? { ...i, agentStatus: newStatus as any } : i));
            }}
            onNotesChange={async (itemId, notes) => {
              await handleNotesChange(itemId, notes);
              setChecklistItems((prev) => prev.map(i => i.id === itemId ? { ...i, agentNotes: notes } : i));
            }}
            onOpenForm={onOpenForm}
            onOpenDocument={onOpenDocument}
          />
        </div>
        {/* Navigation Buttons */}
        <div style={{ display: 'flex', width: '100%', marginTop: 0, gap: 16, justifyContent: 'center', background: 'none', position: 'relative', minHeight: 64, padding: '0px 0 0 0' }}>
          <button
            style={{
              flex: 1,
              padding: '12px 0',
              background: '#fff',
              color: '#064497',
              border: 'none',
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 17,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'background 0.2s, color 0.2s',
              outline: 'none',
              minWidth: 0
            }}
            onClick={() => { closeOpenFormDoc(); setSelectedIndex(null); }}
          >
            <span className="material-icons" style={{ color: '#064497', fontSize: 22 }}>list</span>
            Zur Liste
          </button>
          <button
            style={{
              flex: 1,
              padding: '12px 0',
              background: '#fff',
              color: selectedIndex === 0 ? '#bdbdbd' : '#064497',
              border: 'none',
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 17,
              cursor: selectedIndex === 0 ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'background 0.2s, color 0.2s',
              outline: 'none',
              minWidth: 0
            }}
            onClick={() => { if (selectedIndex > 0) { closeOpenFormDoc(); setSelectedIndex(selectedIndex - 1); } }}
            disabled={selectedIndex === 0}
          >
            <span className="material-icons" style={{ color: selectedIndex === 0 ? '#bdbdbd' : '#064497', fontSize: 22 }}>chevron_left</span>
            Letzter
          </button>
          <button
            style={{
              flex: 1,
              padding: '12px 0',
              background: '#fff',
              color: selectedIndex === checklistItems.length - 1 ? '#bdbdbd' : '#064497',
              border: 'none',
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 17,
              cursor: selectedIndex === checklistItems.length - 1 ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'background 0.2s, color 0.2s',
              outline: 'none',
              minWidth: 0
            }}
            onClick={() => { if (selectedIndex < checklistItems.length - 1) { closeOpenFormDoc(); setSelectedIndex(selectedIndex + 1); } }}
            disabled={selectedIndex === checklistItems.length - 1}
          >
            <span className="material-icons" style={{ color: selectedIndex === checklistItems.length - 1 ? '#bdbdbd' : '#064497', fontSize: 22 }}>chevron_right</span>
            Nächster
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChecklistPanel; 