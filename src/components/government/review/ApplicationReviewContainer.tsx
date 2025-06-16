import React, { useState, useEffect } from 'react';
import ChecklistPanel from './ChecklistPanel';
import FormsDocsPanel from './FormsDocsPanel';
import ReviewActionsPanel from './ReviewActionsPanel';
import { supabase } from '../../../lib/supabase';

const TYPE_LABELS: Record<string, string> = {
  "neubau": "Neubau Eigenheim",
  "ersterwerb-eigenheim": "Ersterwerb Eigenheim",
  "bestandserwerb-eigenheim": "Bestandserwerb Eigenheim",
  "bestandserwerb-wohnung": "Bestandserwerb Eigentumswohnung",
  "ersterwerb-wohnung": "Ersterwerb Eigentumswohnung",
  "nutzungsaenderung": "Nutzungsänderung"
};

interface ApplicationReviewContainerProps {
  applicationId: string;
  onClose: () => void;
  openChecklistItemId?: string | null;
}

// Modes: 'checklist' | 'forms'
const ApplicationReviewContainer: React.FC<ApplicationReviewContainerProps> = ({ applicationId, onClose, openChecklistItemId }) => {
  const [mode, setMode] = useState<'checklist' | 'forms'>('checklist');
  const [splitViewFormId, setSplitViewFormId] = useState<string | null>(null);
  const [splitViewDocId, setSplitViewDocId] = useState<string | null>(null);
  const [openForms, setOpenForms] = useState<string[]>([]);
  const [openDocuments, setOpenDocuments] = useState<string[]>([]);
  const [applicationData, setApplicationData] = useState<{
    type: string;
    review_progress: number;
    resident_id: string;
  } | null>(null);

  // Handler for progress updates
  const handleProgressUpdate = (newProgress: number) => {
    console.log('Progress update handler called:', newProgress);
    setApplicationData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        review_progress: newProgress
      };
    });
  };

  // Fetch application data
  useEffect(() => {
    const fetchApplicationData = async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('type, review_progress, resident_id')
        .eq('id', applicationId)
        .single();

      if (error) {
        console.error('Error fetching application data:', error);
        return;
      }

      setApplicationData(data);
    };

    fetchApplicationData();

    // Set up real-time subscription
    const channel = supabase.channel(`application_${applicationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'applications',
          filter: `id=eq.${applicationId}`
        },
        (payload) => {
          console.log('Real-time update received:', payload);
          if (payload.eventType === 'UPDATE') {
            setApplicationData(prev => {
              if (!prev) return null;
              return {
                ...prev,
                review_progress: payload.new.review_progress
              };
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      channel.unsubscribe();
    };
  }, [applicationId]);

  // Debug effect to monitor applicationData changes
  useEffect(() => {
    console.log('Application data updated:', applicationData);
  }, [applicationData]);

  // Responsive hook
  function useWindowWidth() {
    const [width, setWidth] = useState(window.innerWidth);
    useEffect(() => {
      const handleResize = () => setWidth(window.innerWidth);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);
    return width;
  }

  const width = useWindowWidth();
  const isCompactClose = width < 1440;

  // Handlers for switching modes and opening forms/docs
  const handleOpenFormInSplitView = (formId: string) => {
    if (!formId) {
      setSplitViewFormId(null);
      setSplitViewDocId(null);
      return;
    }
    setSplitViewFormId(formId);
    setSplitViewDocId(null);
    setMode('checklist');
  };
  const handleOpenDocumentInSplitView = (docId: string) => {
    if (!docId) {
      setSplitViewFormId(null);
      setSplitViewDocId(null);
      return;
    }
    setSplitViewDocId(docId);
    setSplitViewFormId(null);
    setMode('checklist');
  };
  const handleExpandForm = () => {
    setMode('forms');
    if (splitViewFormId) setOpenForms([splitViewFormId]);
    if (splitViewDocId) setOpenDocuments([splitViewDocId]);
  };
  const handleOpenForm = (formId: string) => {
    setOpenForms((prev) => prev.length < 2 ? [...prev, formId] : [formId]);
    setMode('forms');
  };
  const handleOpenDocument = (docId: string) => {
    setOpenDocuments((prev) => prev.length < 2 ? [...prev, docId] : [docId]);
    setMode('forms');
  };
  const handleCloseForm = (formId: string) => {
    setOpenForms((prev) => prev.filter(id => id !== formId));
    if (splitViewFormId === formId) setSplitViewFormId(null);
  };
  const handleCloseDocument = (docId: string) => {
    setOpenDocuments((prev) => prev.filter(id => id !== docId));
    if (splitViewDocId === docId) setSplitViewDocId(null);
  };

  // Handler for opening forms or documents inside the app (pop out)
  const handlePopOut = (id: string, type: 'form' | 'doc') => {
    if (type === 'form') {
      setOpenForms((prev) => prev.length < 2 ? [...prev, id] : [id]);
      setMode('forms');
    } else {
      setOpenDocuments((prev) => prev.length < 2 ? [...prev, id] : [id]);
      setMode('forms');
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      gap: 0, 
      width: '100%', 
      position: 'relative',
      padding: '0px',
      height: '100%'
    }}>
      {/* Top Section with Mode Switcher and Actions */}
      <div style={{ 
        display: 'flex', 
        gap: 16,
        width: '100%',
        height: 72,
        alignItems: 'stretch',
        marginTop: 0,
        marginBottom: 24
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            height: '100%',
            padding: isCompactClose ? '0' : '0 24px',
            background: '#fff',
            color: '#064497',
            border: '2px solid #064497',
            borderRadius: '8px',
            fontWeight: 500,
            fontSize: 16,
            cursor: 'pointer',
            minWidth: isCompactClose ? 56 : 170,
            width: isCompactClose ? 56 : undefined,
            marginRight: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
          }}
        >
          <span style={{ fontSize: 22, lineHeight: 1 }}>&#10005;</span>
          {!isCompactClose && <span style={{ marginLeft: 8 }}>Antrag Schließen</span>}
        </button>
        {/* Vertical Divider */}
        <div style={{ width: 1, background: '#e0e0e0', height: 40, alignSelf: 'center', margin: '0 0 px' }} />
        {/* ReviewActionsPanel (hide on small screens) */}
        {applicationData && (
          <div style={{ flex: 2, height: '100%', minWidth: 0, marginRight: 16 }}>
            <ReviewActionsPanel 
              applicationType={TYPE_LABELS[applicationData.type] || applicationData.type} 
              applicationId={applicationId} 
              progress={applicationData.review_progress || 0}
              onRequestDocs={() => {}} 
              onFinishReview={() => {}} 
              onClose={onClose}
            />
          </div>
        )}
        {/* Button Group: Checkliste & Formulare & Dokumente */}
        <div style={{ display: 'flex', width: 350, gap: 2, height: '100%' }}>
          <button 
            onClick={() => setMode('checklist')} 
            disabled={mode === 'checklist'}
            style={{
              flex: 1,
              width: '50%',
              height: '100%',
              padding: '0 24px',
              background: mode === 'checklist' ? '#064497' : '#D7DAEA',
              color: mode === 'checklist' ? '#fff' : '#000',
              border: 'none',
              borderRadius: '8px 0 0 8px',
              fontWeight: 600,
              fontSize: 18,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow:  mode === 'checklist' ? '0 4px 16px rgba(0, 0, 0, 0.35)' : '0 4px 16px rgba(43, 0, 255, 0.15)',
              outline: 'none',
              zIndex: mode === 'checklist' ? 1 : 0
            }}
          >
            Checkliste
          </button>
          <button 
            onClick={() => setMode('forms')} 
            disabled={mode === 'forms'}
            style={{
              flex: 1,
              width: '50%',
              height: '100%',
              padding: '0 24px',
              background: mode === 'forms' ? '#064497' : '#D7DAEA',
              color: mode === 'forms' ? '#fff' : '#000',
              border: 'none',
              borderRadius: '0 8px 8px 0',
              fontWeight: 600,
              fontSize: 18,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow:  mode === 'forms' ? '0 4px 16px rgba(0, 0, 0, 0.35)' : '0 4px 16px rgba(43, 0, 255, 0.15)',
              outline: 'none',
              zIndex: mode === 'forms' ? 1 : 0
            }}
          >
            Formulare & Dokumente
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ 
        flex: 1,
        display: 'flex',
        gap: 16,
        minHeight: 0,
        marginTop: 0
      }}>
        {/* Checklist Mode: Checklist + Split View */}
        {mode === 'checklist' && (
          <>
            {/* If no file is open, stretch checklist to full width */}
            {(splitViewFormId === null || splitViewFormId === '') && (splitViewDocId === null || splitViewDocId === '') ? (
              <div style={{ flex: 1, minWidth: 0 }}>
                <ChecklistPanel 
                  applicationId={applicationId}
                  onOpenForm={handleOpenFormInSplitView} 
                  onOpenDocument={handleOpenDocumentInSplitView} 
                  openFormId={splitViewFormId} 
                  openDocId={splitViewDocId}
                  onExpand={handleExpandForm}
                  onProgressUpdate={handleProgressUpdate}
                  openChecklistItemId={openChecklistItemId}
                />
              </div>
            ) : (splitViewFormId && splitViewFormId !== '') ? (
              <>
                <div style={{ flex: 2, minWidth: 0 }}>
                  <ChecklistPanel 
                    applicationId={applicationId}
                    onOpenForm={handleOpenFormInSplitView} 
                    onOpenDocument={handleOpenDocumentInSplitView} 
                    openFormId={splitViewFormId} 
                    openDocId={splitViewDocId}
                    onExpand={handleExpandForm}
                    onProgressUpdate={handleProgressUpdate}
                    openChecklistItemId={openChecklistItemId}
                  />
                </div>
                <div style={{ flex: 3, minWidth: 0, borderLeft: '1px solid #eee', background: '#F7F8FA' }}>
                  <FormsDocsPanel 
                    openForms={[splitViewFormId]} 
                    openDocuments={[]} 
                    onCloseForm={handleCloseForm} 
                    onCloseDocument={handleCloseDocument} 
                    onPopOut={handlePopOut} 
                    residentId={applicationData?.resident_id}
                    sidebarInitiallyVisible={false}
                  />
                </div>
              </>
            ) : (splitViewDocId && splitViewDocId !== '') ? (
              <>
                <div style={{ flex: 2, minWidth: 0 }}>
                  <ChecklistPanel 
                    applicationId={applicationId}
                    onOpenForm={handleOpenFormInSplitView} 
                    onOpenDocument={handleOpenDocumentInSplitView} 
                    openFormId={splitViewFormId} 
                    openDocId={splitViewDocId}
                    onExpand={handleExpandForm}
                    onProgressUpdate={handleProgressUpdate}
                    openChecklistItemId={openChecklistItemId}
                  />
                </div>
                <div style={{ flex: 3, minWidth: 0, borderLeft: '1px solid #eee', background: '#F7F8FA' }}>
                  <FormsDocsPanel 
                    openForms={[]} 
                    openDocuments={[splitViewDocId!]} 
                    onCloseForm={handleCloseForm} 
                    onCloseDocument={handleCloseDocument} 
                    onPopOut={handlePopOut} 
                    residentId={applicationData?.resident_id}
                    sidebarInitiallyVisible={false}
                  />
                </div>
              </>
            ) : null}
          </>
        )}
        {/* Forms/Docs Mode: Full Width */}
        {mode === 'forms' && (
          <div style={{ flex: 5, minWidth: 0 }}>
            <FormsDocsPanel 
              openForms={openForms} 
              openDocuments={openDocuments} 
              onCloseForm={handleCloseForm} 
              onCloseDocument={handleCloseDocument} 
              onPopOut={handlePopOut} 
              residentId={applicationData?.resident_id}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicationReviewContainer; 