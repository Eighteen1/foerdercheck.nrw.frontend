import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import EinkommenserklaerungReviewContainer from '../../Einkommenserklaerung/EinkommenserklaerungReviewContainer';
import HauptantragReviewContainer from '../../Hauptantrag/HauptantragReviewContainer';
import SelbstauskunftReviewContainer from '../../Selbstauskunft/SelbstauskunftReviewContainer';

type DocumentStatus = {
  fileName: string;
  filePath: string;
  uploaded: boolean;
  uploadedAt: string;
};

type DocumentStatusMap = {
  [key: string]: DocumentStatus;
};

type FormsDocsPanelProps = {
  openForms: string[];
  openDocuments: string[];
  onCloseForm: (formId: string) => void;
  onCloseDocument: (docId: string) => void;
  onPopOut: (id: string, type: 'form' | 'doc') => void;
  residentId?: string;
  sidebarInitiallyVisible?: boolean;
};

export const DOCUMENT_LABELS: Record<string, string> = {
  'income-proof': 'Lohn-/Gehaltsbescheinigung',
  'grundbuchblatt': 'Grundbuchblattkopie',
  'lageplan': 'Lageplan',
  'bauzeichnung': 'Bauzeichnung',
  'marriage_cert': 'Heiratsurkunde',
  'disability_cert': 'Schwerbehindertenausweis',
  'bauenmitholz_cert': 'Nachweis: Zusatzdarlehen für Bauen mit Holz',
  'beg40standard_cert': 'Nachweis: Zusatzdarlehen für BEG Effizienzstandard 40',
  'neubau_kaufvertrag': 'Grundstückskaufvertrag/Entwurf des Kaufvertrags'
};

export const availableForms = [
  { id: 'hauptantrag', label: 'Hauptantrag' },
  { id: 'einkommenserklaerung', label: 'Einkommenserklärung' },
  { id: 'selbstauskunft', label: 'Selbstauskunft' },
  { id: 'berechnungwofiv', label: 'Berechnung der Wohn- und Nutzfläche nach WoFIV' },
  { id: 'berechnungrauminhalt', label: 'Berechnung des Brutto-Rauminhalts des Gebäudes' },
];

const FORM_COMPONENTS: Record<string, React.FC<{ residentId: string }>> = {
  'einkommenserklaerung': EinkommenserklaerungReviewContainer,
  'hauptantrag': HauptantragReviewContainer,
  'selbstauskunft': SelbstauskunftReviewContainer,
};

// Inject Material Icons font if not already present
if (typeof window !== 'undefined' && document && !document.getElementById('material-icons-font')) {
  const link = document.createElement('link');
  link.id = 'material-icons-font';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
  document.head.appendChild(link);
}

const FormsDocsPanel: React.FC<FormsDocsPanelProps> = ({ 
  openForms, 
  openDocuments, 
  onCloseForm, 
  onCloseDocument, 
  onPopOut,
  residentId,
  sidebarInitiallyVisible = true
}) => {
  const [userData, setUserData] = useState<any>(null);
  const [documentUrls, setDocumentUrls] = useState<{[key: string]: string}>({});
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(sidebarInitiallyVisible);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!residentId) return;

      const { data, error } = await supabase
        .from('user_data')
        .select('*')
        .eq('id', residentId)
        .single();

      if (error) {
        console.error('Error fetching user data:', error);
        return;
      }

      setUserData(data);

      // Generate signed URLs for all uploaded documents (private bucket)
      if (data?.document_status) {
        const urls: {[key: string]: string} = {};
        // Use Promise.all to await all signed URL fetches
        await Promise.all(Object.entries(data.document_status).map(async ([docId, docStatus]: [string, any]) => {
          if (docStatus.uploaded) {
            const { data: signedData } = await supabase.storage
              .from('documents')
              .createSignedUrl(docStatus.filePath, 3600); // 1 hour expiry
            if (signedData?.signedUrl) {
              urls[docId] = signedData.signedUrl;
            }
          }
        }));
        setDocumentUrls(urls);
      }
    };

    fetchUserData();
  }, [residentId]);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenFor(null);
      }
    }
    if (menuOpenFor) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpenFor]);

  const handleOpenInsideApp = (docId: string) => {
    setMenuOpenFor(null);
    if (!openDocuments.includes(docId)) {
      onPopOut(docId, 'doc');
    }
  };

  const handleOpenExternalTab = (docId: string) => {
    setMenuOpenFor(null);
    if (documentUrls[docId]) {
      window.open(documentUrls[docId], '_blank');
    }
  };

  const handleDownload = async (docId: string, fileName?: string) => {
    setMenuOpenFor(null);
    if (userData?.document_status?.[docId]?.filePath) {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(userData.document_status[docId].filePath, 60, { download: true });
      if (data?.signedUrl) {
        const link = document.createElement('a');
        link.href = data.signedUrl;
        link.download = fileName || docId;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  const renderDocumentButton = (docId: string, docStatus: DocumentStatus) => {
    const isSelected = openDocuments.includes(docId);
    return (
      <div key={docId} style={{ marginBottom: 6, position: 'relative' }}>
        <button
          onClick={() => setMenuOpenFor(docId)}
          style={{
            width: '100%',
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            borderRadius: 7,
            background: isSelected ? '#064497' : '#fff',
            color: isSelected ? '#fff' : '#111',
            fontFamily: 'Roboto, Arial, sans-serif',
            fontWeight: 400,
            fontSize: 15,
            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
            border: 'none',
            padding: '0 14px',
            cursor: docStatus.uploaded ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s, color 0.2s',
            outline: 'none',
            textAlign: 'left',
            minHeight: 64,
            maxHeight: 64,
            overflow: 'hidden',
            whiteSpace: 'normal',
            opacity: docStatus.uploaded ? 1 : 0.5,
          }}
          disabled={!docStatus.uploaded}
        >
          {DOCUMENT_LABELS[docId] || docId}
        </button>
        {menuOpenFor === docId && docStatus.uploaded && (
          <div
            ref={menuRef}
            style={{
              position: 'absolute',
              top: 70,
              left: 0,
              background: '#fff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              borderRadius: 6,
              zIndex: 10,
              minWidth: 180,
              padding: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <button
              style={{ width: '100%', padding: '8px 0', border: 'none', background: '#f7f8fa', borderRadius: 4, cursor: 'pointer' }}
              onClick={() => handleOpenInsideApp(docId)}
            >
              Öffnen
            </button>
            <button
              style={{ width: '100%', padding: '8px 0', border: 'none', background: '#f7f8fa', borderRadius: 4, cursor: 'pointer' }}
              onClick={() => handleOpenExternalTab(docId)}
            >
              In neuem Tab öffnen
            </button>
            <button
              style={{ width: '100%', padding: '8px 0', border: 'none', background: '#f7f8fa', borderRadius: 4, cursor: 'pointer' }}
              onClick={async () => await handleDownload(docId, docStatus.fileName)}
            >
              Herunterladen
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', height: '100vh', margin: 0, padding: 0, position: 'relative', overflow: 'hidden' }}>
      {/* Main area for open forms/docs */}
      <div style={{ flex: 1, display: 'flex', gap: 8, padding: '8px 0 8px 16px', transition: 'flex 0.3s' }}>
        {[...openForms, ...openDocuments].slice(0, 2).map((id, idx) => (
          <div key={id} style={{
            flex: 1,
            border: '1px solid #ccc',
            borderRadius: 8,
            background: '#fff',
            padding: 16,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{availableForms.find(f => f.id === id)?.label || DOCUMENT_LABELS[id] || id}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {/* Open in new tab button */}
                {documentUrls[id] && (
                  <button
                    onClick={() => window.open(documentUrls[id], '_blank')}
                    style={{
                      padding: '6px 16px',
                      background: '#f7f8fa',
                      color: '#064497',
                      border: '1px solid #064497',
                      borderRadius: 6,
                      fontWeight: 500,
                      fontSize: 15,
                      cursor: 'pointer',
                      marginRight: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'background 0.2s, color 0.2s',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
                    }}
                    title="In neuem Tab öffnen"
                  >
                    <span className="material-icons" style={{ fontSize: 20, marginRight: 4 }}>open_in_new</span>
                    Extern öffnen
                  </button>
                )}
                {/* Close button */}
                <button
                  onClick={() => availableForms.some(f => f.id === id) ? onCloseForm(id) : onCloseDocument(id)}
                  style={{
                    padding: '6px 16px',
                    background: '#fff',
                    color: '#d32f2f',
                    border: '1px solid #d32f2f',
                    borderRadius: 6,
                    fontWeight: 500,
                    fontSize: 15,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'background 0.2s, color 0.2s',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
                  }}
                  title="Schließen"
                >
                  <span className="material-icons" style={{ fontSize: 20, marginRight: 4 }}>close</span>
                  Schließen
                </button>
              </div>
            </div>
            <div style={{ marginTop: 16, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {openDocuments.includes(id) && documentUrls[id] && (
                <iframe 
                  src={documentUrls[id]} 
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title={id}
                />
              )}
              {openForms.includes(id) && residentId && (
                <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                  {FORM_COMPONENTS[id] ? (
                    React.createElement(FORM_COMPONENTS[id], { residentId })
                  ) : (
                    <div style={{ padding: 24, color: '#666', textAlign: 'center' }}>
                      Formular nicht verfügbar
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {[...openForms, ...openDocuments].length === 0 && (
          <div style={{ flex: 1, color: '#aaa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Kein Formular oder Dokument geöffnet
          </div>
        )}
      </div>

      {/* Sidebar for available forms/docs - only render if visible */}
      {sidebarVisible && (
        <div
          style={{
            width: 260,
            minWidth: 220,
            maxWidth: 320,
            borderLeft: '1px solid #eee',
            background: '#f7f8fa',
            height: '100vh',
            overflow: 'hidden',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            zIndex: 20,
          }}
        >
          {/* Hide sidebar button - always visible at the top inside sidebar */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', padding: '10px 10px 0 0' }}>
            <button
              onClick={() => setSidebarVisible(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: 'auto',
                height: 36,
                padding: '0 16px',
                borderRadius: 8,
                background: '#fff',
                color: '#064497',
                border: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: 15,
                zIndex: 30,
                marginTop: 0
              }}
              title="Seitenleiste ausblenden"
            >
              <span style={{ color: '#064497', fontWeight: 400 }}>Minimieren</span>
              <span className="material-icons" style={{ color: '#064497', fontSize: 22 }}>chevron_right</span>
            </button>
          </div>
          <div
            style={{
              overflowY: 'auto',
              height: '100%',
              padding: '8px 12px 0 22px',
              boxSizing: 'border-box',
            }}
          >
            <h4
              style={{
                fontFamily: 'Roboto',
                fontWeight: 300,
                fontSize: 22,
                marginBottom: 22,
                marginTop: 0,
                padding: 0,
                color: '#000',
                letterSpacing: 0.1,
              }}
            >
              Formulare
            </h4>
            {availableForms.map(form => {
              const isSelected = openForms.includes(form.id);
              return (
                <div key={form.id} style={{ marginBottom: 6 }}>
                  <button
                    onClick={() => onPopOut(form.id, 'form')}
                    style={{
                      width: '100%',
                      height: 64,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      borderRadius: 7,
                      background: isSelected ? '#064497' : '#fff',
                      color: isSelected ? '#fff' : '#111',
                      fontFamily: 'Roboto, Arial, sans-serif',
                      fontWeight: 400,
                      fontSize: 15,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                      border: 'none',
                      padding: '0 14px',
                      cursor: 'pointer',
                      transition: 'background 0.2s, color 0.2s',
                      outline: 'none',
                      textAlign: 'left',
                      minHeight: 64,
                      maxHeight: 64,
                      overflow: 'hidden',
                      whiteSpace: 'normal',
                    }}
                  >
                    {form.label}
                  </button>
                </div>
              );
            })}

            <h4
              style={{
                fontFamily: 'Roboto',
                fontWeight: 300,
                fontSize: 22,
                margin: '22px 0 22px 0',
                padding: 0,
                color: '#000',
                letterSpacing: 0.1,
                marginTop: 22,
              }}
            >
              Dokumente
            </h4>
            {userData?.document_status && Object.entries(userData.document_status).map(([docId, docStatus]: [string, any]) => 
              renderDocumentButton(docId, docStatus)
            )}
          </div>
        </div>
      )}
      {/* Show sidebar button (when hidden) */}
      {!sidebarVisible && (
        <button
          onClick={() => setSidebarVisible(true)}
          style={{
            position: 'fixed',
            top: '50%',
            right: 0,
            transform: 'translateY(-50%)',
            width: 38,
            height: 48,
            borderRadius: '8px 0 0 8px',
            background: '#064497',
            color: '#fff',
            border: 'none',
            boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 100,
          }}
          title="Seitenleiste einblenden"
        >
          <span className="material-icons">chevron_left</span>
        </button>
      )}
    </div>
  );
};

export default FormsDocsPanel; 