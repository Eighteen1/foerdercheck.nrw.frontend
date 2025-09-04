import React, { useState, useEffect } from 'react';
import { supabase, getCurrentUser } from '../../../lib/supabase';
import { ChecklistItem, ReviewData } from '../../../types/checklist';
import ChecklistItemComponent from './ChecklistItem';
import CustomChecklistItem from './CustomChecklistItem';
import AddChecklistItem from './AddChecklistItem';
import { generateChecklistItems, DOCUMENT_CATEGORY_MAPPING } from '../../../utils/checklistGenerator';

type ChecklistPanelProps = {
  applicationId: string;
  onOpenForm: (formId: string) => void;
  onOpenDocument: (docId: string) => void;
  openFormId: string | null;
  openDocId?: string | null;
  onExpand: () => void;
  onProgressUpdate: (progress: number) => void;
  openChecklistItemId?: string | null;
  onClearDeepLink?: () => void;
  applicationStatus?: string;
  onRefreshApplication?: () => Promise<void>;
};

// Helper function to extract document ID from checklist item ID
const extractDocumentIdFromChecklistId = (checklistId: string): string | null => {
  // Checklist IDs for documents typically end with "_isvalid"
  // Examples:
  // "meldebescheinigung_isvalid" -> "meldebescheinigung"
  // "lohn_gehaltsbescheinigungen_hauptantragsteller_isvalid" -> "lohn_gehaltsbescheinigungen"
  // "einkommenssteuerbescheid_applicant_uuid_isvalid" -> "einkommenssteuerbescheid"
  
  if (!checklistId.endsWith('_isvalid')) {
    return null;
  }
  
  // Remove "_isvalid" suffix
  const withoutSuffix = checklistId.replace('_isvalid', '');
  
  // Look for document IDs in the DOCUMENT_CATEGORY_MAPPING
  const documentIds = Object.keys(DOCUMENT_CATEGORY_MAPPING);
  
  // Find the document ID that matches (the ID should be at the beginning)
  for (const docId of documentIds) {
    if (withoutSuffix.startsWith(docId)) {
      return docId;
    }
  }
  
  return null;
};

// Helper function to get document category
const getDocumentCategory = (documentId: string): 'general' | 'applicant' => {
  const category = DOCUMENT_CATEGORY_MAPPING[documentId];
  return category === 'applicant' ? 'applicant' : 'general';
};

const ChecklistPanel: React.FC<ChecklistPanelProps> = ({
  applicationId,
  onOpenForm,
  onOpenDocument,
  openFormId,
  openDocId,
  onExpand,
  onProgressUpdate,
  openChecklistItemId,
  onClearDeepLink,
  applicationStatus,
  onRefreshApplication
}) => {
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [generatingChecklist, setGeneratingChecklist] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const [userData, setUserData] = useState<any>(null);
  const [residentId, setResidentId] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('formular-vollstaendigkeit');

  // Check if application is completed (approved or rejected)
  const isApplicationCompleted = applicationStatus === 'approved' || applicationStatus === 'rejected';

  // Function to show toast
  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => {
      setToast({ message: '', visible: false });
    }, 3000);
  };

  // Function to handle system error updates from ChecklistItem
  const handleSystemErrorsUpdate = (itemId: string, errors: string[]) => {
    setChecklistItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, systemErrors: errors } : item
    ));
  };

  // Function to refresh checklist data from database
  const refreshChecklistData = async () => {
    try {
      setLoading(true);
      
      // Fetch the latest review data from database
      const { data, error } = await supabase
        .from('applications')
        .select('review_data, resident_id, status')
        .eq('id', applicationId)
        .single();

      if (error) throw error;

      // Update checklist items with fresh data
      if (data?.review_data && data.review_data.checklistItems && Array.isArray(data.review_data.checklistItems)) {
        setChecklistItems(data.review_data.checklistItems);
      }

      // Also refresh user data if needed
      if (data.resident_id) {
        const { data: userDataResult, error: userError } = await supabase
          .from('user_data')
          .select('*')
          .eq('id', data.resident_id)
          .single();

        if (!userError) {
          setUserData(userDataResult);
        }
      }
    } catch (error) {
      console.error('Error refreshing checklist data:', error);
      showToast('Fehler beim Aktualisieren der Daten');
    } finally {
      setLoading(false);
    }
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

        // Store resident ID for later use
        setResidentId(data.resident_id);

        // Fetch user data for dynamic document checking
        if (data.resident_id) {
            const { data: userDataResult, error: userError } = await supabase
              .from('user_data')
              .select('*')
            .eq('id', data.resident_id)
              .single();

            if (!userError) {
              setUserData(userDataResult);
          } else {
            console.warn('Failed to fetch user data:', userError);
            }
          }

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

  // Effect to open a specific checklist item if openChecklistItemId is set
  useEffect(() => {
    if (openChecklistItemId && Array.isArray(checklistItems) && checklistItems.length > 0) {
      const sortedItems = sortItemsBySection(checklistItems);
      const idx = sortedItems.findIndex(item => item && item.id === openChecklistItemId);
      if (idx !== -1) {
        setSelectedIndex(idx);
        // Also expand the appropriate section for the item
        const item = sortedItems[idx];
        if (item) {
          const sectionKey = getSectionForItem(item);
          setExpandedSection(sectionKey);
        }
      }
    }
  }, [openChecklistItemId, checklistItems]);



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
      
      // Get current application status to check if we need to change it back to in_progress
      const { data: currentApp, error: fetchError } = await supabase
        .from('applications')
        .select('status')
        .eq('id', applicationId)
        .single();

      if (fetchError) throw fetchError;

      // Prepare the update object
      const updateData: any = {
        review_data: { checklistItems: updatedItems },
        review_progress: progress,
        updated_at: new Date().toISOString(),
      };

      // If current status is document_received, change it back to in_progress
      if (currentApp.status === 'document_received') {
        updateData.status = 'in_progress';
      }

      // Save to database with updated_at and last_edit_agent
      const user = await getCurrentUser();
      updateData.last_edit_agent = user?.id || null;

      const { error: updateError, data } = await supabase
        .from('applications')
        .update(updateData)
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

  const handleDeleteItem = async (itemId: string) => {
    try {
      const updatedItems = checklistItems.filter(item => item.id !== itemId);
      setChecklistItems(updatedItems);
      // Calculate progress
      const totalItems = updatedItems.length;
      const reviewedItems = updatedItems.filter(item => item.agentStatus === 'correct' || item.agentStatus === 'wrong').length;
      const progress = totalItems === 0 ? 0 : Math.round((reviewedItems / totalItems) * 100);
      // Save to database
      const user = await getCurrentUser();
      const { error: updateError } = await supabase
        .from('applications')
        .update({
          review_data: { checklistItems: updatedItems },
          review_progress: progress,
          updated_at: new Date().toISOString(),
          last_edit_agent: user?.id || null
        })
        .eq('id', applicationId);
      if (updateError) throw updateError;
      onProgressUpdate(progress);
      setSelectedIndex(null);
    } catch (error) {
      console.error('Error deleting item:', error);
      showToast('Fehler beim Löschen des To-Dos. Bitte versuchen Sie es erneut.');
    }
  };

  const handleEditCustomItem = async (itemId: string, updates: Partial<{ title: string; systemComment: string; systemErrors: string[]; linkedForms: string[]; linkedDocs: string[]; linkedSignedDocs: string[] }>) => {
    try {
      const updatedItems = checklistItems.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      );
      setChecklistItems(updatedItems);
      // Save to database
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
      console.error('Error editing item:', error);
      showToast('Fehler beim Bearbeiten des To-Dos. Bitte versuchen Sie es erneut.');
    }
  };

  const handleAddItem = async (newItem: ChecklistItem) => {
    try {
      const updatedItems = [...checklistItems, newItem];
      setChecklistItems(updatedItems);
      setShowAddItem(false);
      // Calculate progress
      const totalItems = updatedItems.length;
      const reviewedItems = updatedItems.filter(item => item.agentStatus === 'correct' || item.agentStatus === 'wrong').length;
      const progress = totalItems === 0 ? 0 : Math.round((reviewedItems / totalItems) * 100);
      // Save to database
      const user = await getCurrentUser();
      const { error: updateError } = await supabase
        .from('applications')
        .update({
          review_data: { checklistItems: updatedItems },
          review_progress: progress,
          updated_at: new Date().toISOString(),
          last_edit_agent: user?.id || null
        })
        .eq('id', applicationId);
      if (updateError) throw updateError;
      onProgressUpdate(progress);
    } catch (error) {
      console.error('Error adding new item:', error);
      showToast('Fehler beim Hinzufügen des neuen To-Dos. Bitte versuchen Sie es erneut.');
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

  // Section categorization logic
  const getSectionForItem = (item: ChecklistItem): string => {
    // User-created items always go to custom section
    if (item.systemStatus === 'created') {
      return 'benutzerdefinierte-todos';
    }

    const id = item.id;

    // Form completeness items
    if (id.includes('-completeness')) {
      return 'formular-vollstaendigkeit';
    }

    // Income calculation items
    if (id.includes('household-income') || id.includes('income-group') || 
        id.includes('available-monthly-income') || id.includes('additional-financial-criteria')) {
      return 'einkommens-berechnungen';
    }

    // Additional loan validations
    if (id.endsWith('darlehens_isvalid')) {
      return 'zusatzdarlehen-pruefungen';
    }

    // Document validation items (items ending with _isvalid)
    if (id.endsWith('_isvalid') && !id.endsWith('darlehens_isvalid') && !id.endsWith('general_isvalid')) {
      // Extract document ID from the checklist item ID to determine if it's personal or general
      const documentId = extractDocumentIdFromChecklistId(id);
      if (documentId) {
        const category = getDocumentCategory(documentId);
        return category === 'applicant' ? 'personenbezogene-nachweis-pruefungen' : 'allgemeine-nachweis-pruefungen';
      }
      // Fallback to general if we can't determine the category
      return 'allgemeine-nachweis-pruefungen';
    }

    // Additional loan validations
    if (id.includes('cross-checks-validation') || id.includes('selbsthilfe-isbelieveable') || id.includes('document-non-required_general_isvalid')) {
      return 'generale-pruefungen';
    }

    // Default fallback to general document proofs
    return 'allgemeine-nachweis-pruefungen';
  };

  const getSectionTitle = (sectionKey: string): string => {
    switch (sectionKey) {
      case 'formular-vollstaendigkeit':
        return 'Antrags Vollständigkeit';
      case 'einkommens-berechnungen':
        return 'Einkommens-Berechnungen';
      case 'personenbezogene-nachweis-pruefungen':
        return 'Personenbezogene Nachweis-Prüfungen';
      case 'allgemeine-nachweis-pruefungen':
        return 'Allgemeine Nachweis-Prüfungen';
      case 'zusatzdarlehen-pruefungen':
        return 'Zusatzdarlehen-Prüfungen';
      case 'generale-pruefungen':
        return 'Allgemeine Prüfungen';
      case 'benutzerdefinierte-todos':
        return 'Benutzerdefinierte To-Dos';
      default:
        return sectionKey;
    }
  };

  // Sort items by section order
  const sortItemsBySection = (items: ChecklistItem[]) => {
    // Safety check for input
    if (!Array.isArray(items)) {
      return [];
    }

    // Define section order
    const sectionOrder = [
      'formular-vollstaendigkeit',
      'einkommens-berechnungen', 
      'personenbezogene-nachweis-pruefungen',
      'allgemeine-nachweis-pruefungen',
      'zusatzdarlehen-pruefungen',
      'generale-pruefungen',
      'benutzerdefinierte-todos'
    ];

    // Create a copy of items sorted by section
    const sortedItems = [...items].sort((a, b) => {
      const sectionA = getSectionForItem(a);
      const sectionB = getSectionForItem(b);
      
      const indexA = sectionOrder.indexOf(sectionA);
      const indexB = sectionOrder.indexOf(sectionB);
      
      // If both sections are found, sort by section order
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      // If only one section is found, prioritize it
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      // If neither section is found, maintain original order
      return 0;
    });

    return sortedItems;
  };

  // Group items by section (using sorted items)
  const groupItemsBySection = (sortedItems: ChecklistItem[]) => {
    const sections: Record<string, { items: ChecklistItem[]; startIndex: number }> = {};
    let currentIndex = 0;

    // Define section order
    const sectionOrder = [
      'formular-vollstaendigkeit',
      'einkommens-berechnungen', 
      'personenbezogene-nachweis-pruefungen',
      'allgemeine-nachweis-pruefungen',
      'zusatzdarlehen-pruefungen',
      'generale-pruefungen',
      'benutzerdefinierte-todos'
    ];

    // Initialize sections
    sectionOrder.forEach(sectionKey => {
      sections[sectionKey] = { items: [], startIndex: 0 };
    });

    // Group sorted items by section with safety checks
    if (Array.isArray(sortedItems)) {
      sortedItems.forEach(item => {
        if (item && item.id) {
          const sectionKey = getSectionForItem(item);
          if (sectionKey && sections[sectionKey]) {
            sections[sectionKey].items.push(item);
          } else {
            console.warn('Unknown section key for item:', item.id, sectionKey);
            // Fallback to default section
            if (sections['allgemeine-nachweis-pruefungen']) {
              sections['allgemeine-nachweis-pruefungen'].items.push(item);
            }
          }
        }
      });
    }

    // Calculate start indices with safety check
    sectionOrder.forEach(sectionKey => {
      if (sectionKey && sections[sectionKey]) {
        sections[sectionKey].startIndex = currentIndex;
        currentIndex += sections[sectionKey].items.length;
      }
    });

    return { sections, sectionOrder };
  };

  // Get progress for a section
  const getSectionProgress = (sectionItems: ChecklistItem[]) => {
    const totalItems = sectionItems.length;
    const completedItems = sectionItems.filter(item => 
    item.agentStatus === 'correct' || item.agentStatus === 'wrong'
  ).length;
    return { completed: completedItems, total: totalItems };
  };

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
    // Add safety check for checklistItems
    const safeChecklistItems = Array.isArray(checklistItems) ? checklistItems : [];
    const sortedItems = sortItemsBySection(safeChecklistItems);
    const { sections, sectionOrder } = groupItemsBySection(sortedItems);
    
    // Calculate overall progress
    const totalItems = sortedItems.length;
    const completedItems = sortedItems.filter(item => 
      item.agentStatus === 'correct' || item.agentStatus === 'wrong'
    ).length;

    return (
      <div style={{ width: '100%', background: 'none', padding: '0 0 24px 0' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '24px 24px 0 24px',
          marginBottom: 22
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h4 style={{
              fontFamily: 'Roboto',
              fontWeight: 300,
              fontSize: 22,
              margin: 0,
              color: '#000',
              letterSpacing: 0.1,
            }}>
              Checkliste
            </h4>
            <span style={{
              background: '#e8f4f8',
              color: '#064497',
              borderRadius: 16,
              padding: '6px 14px',
              fontWeight: 600,
              fontSize: 14,
            }}>
              {completedItems}/{totalItems} bearbeitet
            </span>
          </div>
          {!isApplicationCompleted && (
            <button
              onClick={() => setShowAddItem(true)}
              style={{
                padding: '8px 16px',
                background: '#064497',
                color: '#fff',
                border: 'none',
                borderRadius: 5,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 15,
                fontWeight: 500,
              }}
            >
              <span className="material-icons" style={{ fontSize: 20 }}>add</span>
              Neues To-Do hinzufügen
            </button>
          )}
        </div>

        {showAddItem && (
          <div style={{ padding: '0 24px' }}>
            <AddChecklistItem
              onAdd={handleAddItem}
              onCancel={() => setShowAddItem(false)}
              userData={userData}
            />
          </div>
        )}

        <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '0 24px' }}>
          {checklistItems.length === 0 ? (
            <div style={{ color: '#666', textAlign: 'center', padding: 24 }}>
              No checklist items available.
            </div>
          ) : (
            <>
              {sectionOrder.filter(key => key && sections[key]).map(sectionKey => {
                const sectionData = sections[sectionKey];
                if (!sectionData || !Array.isArray(sectionData.items) || sectionData.items.length === 0) return null;

                const sectionTitle = getSectionTitle(sectionKey);
                const progress = getSectionProgress(sectionData.items);
                const isExpanded = expandedSection === sectionKey;
                
                return (
                  <div key={sectionKey} style={{ marginBottom: 16 }}>
                    {/* Section Header */}
                    <button
                      onClick={() => {
                        setExpandedSection(isExpanded ? null : sectionKey);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 18px',
                        marginBottom: 8,
                        borderRadius: 10,
                        background: isExpanded ? '#e3f2fd' : '#f5f5f5',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 16,
                        fontWeight: 600,
                        transition: 'all 0.2s',
                        boxShadow: isExpanded ? '0 2px 8px rgba(6, 68, 151, 0.15)' : '0 1px 4px rgba(0,0,0,0.08)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span className="material-icons" style={{ 
                          fontSize: 22, 
                          color: isExpanded ? '#064497' : '#666',
                          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s'
                        }}>
                          chevron_right
                        </span>
                        <span style={{ color: isExpanded ? '#064497' : '#333' }}>{sectionTitle}</span>
                      </div>
                              <span style={{
                        background: isExpanded ? '#064497' : '#999',
                        color: '#fff',
                                borderRadius: 12,
                        padding: '4px 12px',
                                fontWeight: 600,
                                fontSize: 14,
                        minWidth: 60,
                        textAlign: 'center',
                      }}>
                        {progress.completed}/{progress.total}
                      </span>
                  </button>
                  
                    {/* Section Items */}
                    {isExpanded && (
                      <div style={{ paddingLeft: 0 }}>
                        {sectionData.items.map((item, idx) => {
                          const globalIndex = sectionData.startIndex + idx;
                        const stateLabel = getStateLabel(item);
                        const stateColor = getStateColor(stateLabel, item.agentStatus);
                        return (
                          <button
                            key={item.id}
                              onClick={() => { closeOpenFormDoc(); setSelectedIndex(globalIndex); }}
                            style={{
                                width: 'calc(100% - 32px)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                                padding: '16px 18px',
                              marginBottom: 8,
                                marginLeft: 32,
                                borderRadius: 8,
                              background: '#fff',
                                border: 'none',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                              cursor: 'pointer',
                              fontSize: 15,
                              fontWeight: 500,
                              transition: 'background 0.2s',
                            }}
                          >
                              <span style={{ color: '#064497', fontWeight: 500, textAlign: 'left' }}>{item.title}</span>
                            <span style={{
                              ...stateColor,
                                borderRadius: 14,
                                padding: '4px 14px',
                              fontWeight: 600,
                              fontSize: 14,
                                minWidth: 110,
                              textAlign: 'center',
                                flexShrink: 0,
                                marginLeft: 12,
                            }}>{stateLabel}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    );
  }

  // Detail mode: show only the selected item
  if (selectedIndex !== null) {
    const safeChecklistItems = Array.isArray(checklistItems) ? checklistItems : [];
    const sortedItems = sortItemsBySection(safeChecklistItems);
    if (selectedIndex < 0 || selectedIndex >= sortedItems.length || !sortedItems[selectedIndex]) {
      setSelectedIndex(null);
      return null;
    }
    
    const item = sortedItems[selectedIndex];
    const isCustomItem = item && item.systemStatus === 'created';

    if (!item) return null;

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
        {isCustomItem ? (
          <CustomChecklistItem
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
            onDelete={handleDeleteItem}
              onEdit={handleEditCustomItem}
              userData={userData}
              isReadOnly={isApplicationCompleted}
          />
        ) : (
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
              residentId={residentId || undefined}
              userData={userData}
            onSystemErrorsUpdate={handleSystemErrorsUpdate}
              allChecklistItems={checklistItems}
              applicationId={applicationId}
              onRefreshData={refreshChecklistData}
              isReadOnly={isApplicationCompleted}
          />
        )}
      </div>
        {/* Navigation Buttons */}
        {/* Only show navigation buttons if not opened from deep link */}
        {!openChecklistItemId && (
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
              onClick={() => { 
              closeOpenFormDoc(); 
              setSelectedIndex(null); 
              // Clear deep link state when going back to list
              if (onClearDeepLink) onClearDeepLink();
            }}
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
          onClick={() => {
              if (selectedIndex > 0) { 
                closeOpenFormDoc(); 
                setSelectedIndex(selectedIndex - 1); 
              } 
            }}
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
                color: selectedIndex === sortedItems.length - 1 ? '#bdbdbd' : '#064497',
                border: 'none',
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 17,
                cursor: selectedIndex === sortedItems.length - 1 ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'background 0.2s, color 0.2s',
                outline: 'none',
                minWidth: 0
              }}
              onClick={() => { 
              if (selectedIndex < sortedItems.length - 1) { 
                closeOpenFormDoc(); 
                setSelectedIndex(selectedIndex + 1); 
              } 
            }}
              disabled={selectedIndex === sortedItems.length - 1}
            >
              <span className="material-icons" style={{ color: selectedIndex === sortedItems.length - 1 ? '#bdbdbd' : '#064497', fontSize: 22 }}>chevron_right</span>
              Nächster
            </button>
        </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback return - should never reach here but prevents undefined return
  return null;
};

export default ChecklistPanel; 