import React, { useRef, useState, useEffect } from 'react';
import { Modal, Button, Spinner, Collapse } from 'react-bootstrap';
import { supabase } from '../../../lib/supabase';
import type { ChecklistItem } from '../../../types/checklist';

// Add styles
const styles = `
  .menu-button {
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border-radius: 4px;
    transition: background-color 0.2s;
  }
  .menu-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  .menu-item {
    width: 100%;
    padding: 12px 16px;
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
    color: #333;
    font-size: 14px;
    transition: background-color 0.2s;
  }
  .menu-item:hover {
    background-color: #f5f5f5;
  }
`;

type ReviewActionsPanelProps = {
  applicationType: string;
  applicationId: string;
  progress: number; // Fortschritt in Prozent (0-100)
  onRequestDocs: () => void;
  onFinishReview: () => void;
  onContactApplicant?: () => void;
  onShareApplication?: () => void;
  onClose: () => void;
};

const circleSize = 44;
const strokeWidth = 5;
const radius = (circleSize - strokeWidth) / 2;
const circumference = 2 * Math.PI * radius;

const TYPE_LABELS: Record<string, string> = {
  "neubau": "Neubau Eigenheim",
  "ersterwerb-eigenheim": "Ersterwerb Eigenheim",
  "bestandserwerb-eigenheim": "Bestandserwerb Eigenheim",
  "bestandserwerb-wohnung": "Bestandserwerb Eigentumswohnung",
  "ersterwerb-wohnung": "Ersterwerb Eigentumswohnung",
  "nutzungsaenderung": "Nutzungsänderung"
};

// Add Section type
type SectionKey = 'correct' | 'wrong' | 'undefined';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

const ReviewActionsPanel: React.FC<ReviewActionsPanelProps> = ({
  applicationType,
  applicationId,
  progress,
  onRequestDocs,
  onFinishReview,
  onContactApplicant,
  onShareApplication,
  onClose
}) => {
  const isComplete = progress >= 100;
  const progressValue = Math.max(0, Math.min(progress, 100));
  const offset = circumference - (progressValue / 100) * circumference;

  // Responsive breakpoints
  const [showFullButton, setShowFullButton] = useState(true); // Button with text
  const [showId, setShowId] = useState(true); // Application ID
  const [showPanel, setShowPanel] = useState(true); // Whole panel
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Modal state
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoData, setInfoData] = useState<any>(null);
  const [infoError, setInfoError] = useState<string | null>(null);

  // New state for the finish review modal and checklist grouping
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [finishChecklist, setFinishChecklist] = useState<ChecklistItem[]>([]);
  const [finishLoading, setFinishLoading] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({});

  // Add state for decision, note, and submission loading/error
  const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [decisionSuccess, setDecisionSuccess] = useState(false);

  // Responsive logic using ResizeObserver
  useEffect(() => {
    if (!panelRef.current) return;
    const node = panelRef.current;
    const observer = new window.ResizeObserver(entries => {
      for (let entry of entries) {
        const width = entry.contentRect.width;
        setShowFullButton(width > 500); // Show full button if width > 600px
        setShowId(width > 450);          // Show ID if width > 450px
        setShowPanel(width > 200);       // Show panel if width > 180px
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };

  const handleAction = (action: () => void) => {
    action();
    setIsMenuOpen(false);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch info for modal
  const fetchInfoData = async () => {
    setInfoLoading(true);
    setInfoError(null);
    try {
      // 1. Fetch application
      const { data: app, error: appError } = await supabase
        .from('applications')
        .select('id, type, resident_id, assigned_agent, last_edit_agent, updated_at, submitted_at')
        .eq('id', applicationId)
        .single();
      if (appError) throw appError;
      // 2. Fetch user_data
      const { data: user, error: userError } = await supabase
        .from('user_data')
        .select('*')
        .eq('id', app.resident_id)
        .single();
      if (userError) throw userError;
      // 3. Fetch object_data
      const { data: obj, error: objError } = await supabase
        .from('object_data')
        .select('*')
        .eq('user_id', app.resident_id)
        .single();
      // 4. Fetch assigned agent
      let assignedAgent = null;
      if (app.assigned_agent) {
        const { data: agentData } = await supabase
          .from('agents')
          .select('name, email')
          .eq('id', app.assigned_agent)
          .single();
        assignedAgent = agentData;
      }
      // 5. Fetch last edit agent
      let lastEditAgent = null;
      if (app.last_edit_agent) {
        const { data: agentData } = await supabase
          .from('agents')
          .select('name, email')
          .eq('id', app.last_edit_agent)
          .single();
        lastEditAgent = agentData;
      }
      setInfoData({ app, user, obj, assignedAgent, lastEditAgent });
    } catch (err: any) {
      setInfoError('Fehler beim Laden der Antragsinformationen.');
    } finally {
      setInfoLoading(false);
    }
  };

  const handleOpenInfo = () => {
    setShowInfoModal(true);
    fetchInfoData();
  };
  const handleCloseInfo = () => setShowInfoModal(false);

  // Helper to group checklist items by agentStatus
  const groupChecklistItems = (items: ChecklistItem[]) => {
    const groups = { correct: [] as ChecklistItem[], wrong: [] as ChecklistItem[], undefined: [] as ChecklistItem[] };
    items.forEach(item => {
      const status = item.agentStatus || 'undefined';
      if (status === 'correct') groups.correct.push(item);
      else if (status === 'wrong') groups.wrong.push(item);
      else groups.undefined.push(item);
    });
    return groups;
  };

  // Handler to open the finish modal and fetch checklist data
  const handleOpenFinishModal = async () => {
    setShowFinishModal(true);
    setFinishLoading(true);
    setFinishError(null);
    try {
      // Fetch review_data from applications
      const { data, error } = await supabase
        .from('applications')
        .select('review_data')
        .eq('id', applicationId)
        .single();
      if (error) throw error;
      const checklistItems: ChecklistItem[] = data?.review_data?.checklistItems || [];
      setFinishChecklist(checklistItems);
      setExpandedSections({});
    } catch (err) {
      setFinishError('Fehler beim Laden der Checkliste.');
      setFinishChecklist([]);
    } finally {
      setFinishLoading(false);
    }
  };

  const handleCloseFinishModal = () => {
    setShowFinishModal(false);
    setDecision(null);
    setDecisionNote('');
    setDecisionLoading(false);
    setDecisionError(null);
  };

  // Update handleSubmitDecision to call the backend endpoint
  const handleSubmitDecision = async () => {
    setDecisionLoading(true);
    setDecisionError(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/application/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          application_id: applicationId,
          decision,
          note: decisionNote,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Fehler beim Absenden der Entscheidung.');
      }
      setShowFinishModal(false);
      setDecision(null);
      setDecisionNote('');
      setDecisionSuccess(true);
    } catch (err: any) {
      setDecisionError(err.message || 'Fehler beim Absenden der Entscheidung.');
    } finally {
      setDecisionLoading(false);
    }
  };

  // Button content logic
  const getButtonContent = () => {
    if (!showFullButton) {
      // Only show dropdown icon (no text)
      return null;
    }
    return isComplete ? 'Prüfung Abschließen' : 'Dokumente Nachfordern';
  };

  return (
    <div
      ref={panelRef}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        background: '#ffffff',
        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
        borderRadius: 10,
        padding: '0 16px',
        minHeight: 0,
        height: 72,
        gap: 0,
        width: '100%',
        opacity: showPanel ? 1 : 0,
        pointerEvents: showPanel ? 'auto' : 'none',
      }}
    >
      <style>{styles}</style>
      {/* Left: Info */}
      <div style={{ flex: 2, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 0 }}>
        {showId && (
          <div style={{ fontWeight: 700, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{applicationId}</div>
        )}
        <button
          onClick={handleOpenInfo}
          style={{ background: 'none', border: 'none', padding: 0, marginLeft: 6, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          title="Antragsinfo anzeigen"
        >
          <span className="material-icons" style={{ color: '#064497', fontSize: 22 }}>info</span>
        </button>
      </div>
      {/* Separator */}
      <div style={{ width: 1, background: '#e0e0e0', height: 48, margin: '12px 10px' }} />
      {/* Center: Circular Progress */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <svg width={circleSize} height={circleSize}>
          <circle
            cx={circleSize / 2}
            cy={circleSize / 2}
            r={radius}
            fill="none"
            stroke="#e0e0e0"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={circleSize / 2}
            cy={circleSize / 2}
            r={radius}
            fill="none"
            stroke="#064497"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s' }}
          />
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="13"
            fontWeight="bold"
            fill="#064497"
          >
            {progressValue}%
          </text>
        </svg>
      </div>
      {/* Separator */}
      <div style={{ width: 1, background: '#e0e0e0', height: 48, margin: '12px 10px' }} />
      {/* Right: Actions */}
      <div style={{ flex: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end', gap: 0, minWidth: 0, position: 'relative', marginLeft: 8 }}>
        <button
          ref={buttonRef}
          style={{
            minWidth: showFullButton ? 200 : 44,
            height: 44,
            background: isComplete ? '#388e3c' : '#064497',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '10px 16px',
            fontWeight: 500,
            fontSize: 15,
            cursor: 'pointer',
            marginBottom: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: `0 1px 3px rgba(${isComplete ? '56, 142, 60' : '6, 68, 151'}, 0.08)`
          }}
          onClick={showFullButton ? (isComplete ? handleOpenFinishModal : onRequestDocs) : undefined}
        >
          {getButtonContent()}
          {/* Only show dropdown icon if not showing full button */}
          {showFullButton ? (
            <div onClick={handleMenuClick} className="menu-button">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: isMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <path d="M7 10L12 15L17 10" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          ) : (
            <div onClick={handleMenuClick} className="menu-button">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: isMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <path d="M7 10L12 15L17 10" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
        </button>

        {isMenuOpen && (
          <div
            ref={menuRef}
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              backgroundColor: '#fff',
              borderRadius: '6px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              minWidth: 200,
              zIndex: 1000,
              marginTop: '4px'
            }}
          >
            {/* On narrow screens, show both actions. On wide screens, show only the alternative action. */}
            {!showFullButton ? (
              <>
                <button
                  onClick={() => handleAction(onRequestDocs)}
                  className="menu-item"
                >
                  Dokumente Nachfordern
                </button>
                <button
                  onClick={() => handleAction(handleOpenFinishModal)}
                  className="menu-item"
                >
                  Prüfung Abschließen
                </button>
              </>
            ) : (
              isComplete ? (
                <button
                  onClick={() => handleAction(handleOpenFinishModal)}
                  className="menu-item"
                >
                  Prüfung Abschließen
                </button>
              ) : (
                <button
                  onClick={() => handleAction(handleOpenFinishModal)}
                  className="menu-item"
                >
                  Prüfung Abschließen
                </button>
              )
            )}
            <button
              onClick={() => onContactApplicant && handleAction(onContactApplicant)}
              className="menu-item"
            >
              Antragsteller Kontaktieren
            </button>
            <button
              onClick={() => onShareApplication && handleAction(onShareApplication)}
              className="menu-item"
            >
              Antrag teilen
            </button>
          </div>
        )}
      </div>
      {/* Modal for info */}
      <Modal show={showInfoModal} onHide={handleCloseInfo} centered>
        <Modal.Header>
          <Modal.Title>Antragsdetails</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {infoLoading ? (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 120 }}>
              <Spinner animation="border" style={{ color: '#064497', width: 48, height: 48 }} />
            </div>
          ) : infoError ? (
            <div className="alert alert-danger">{infoError}</div>
          ) : infoData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><b>Antragsnummer:</b> {infoData.app?.id || '-'}</div>
              <div><b>Typ:</b> {TYPE_LABELS[infoData.app?.type] || infoData.app?.type || '-'}</div>
              <div><b>Hauptantragsteller:</b> {infoData.user?.firstname || ''} {infoData.user?.lastname || ''}</div>
              <div><b>Email:</b> {infoData.user?.email || '-'}</div>
              <div><b>Telefon:</b> {infoData.user?.phone || '-'}</div>
              <div><b>Adresse Antragsteller:</b> {infoData.user ? `${infoData.user.person_street || ''} ${infoData.user.person_housenumber || ''}, ${infoData.user.person_postalcode || ''} ${infoData.user.person_city || ''}` : '-'}</div>
              <div><b>Objektadresse:</b> {infoData.obj ? `${infoData.obj.obj_street || ''} ${infoData.obj.obj_house_number || ''}, ${infoData.obj.obj_postal_code || ''} ${infoData.obj.obj_city || ''}` : '-'}</div>
              <div><b>Zugewiesener Sachbearbeiter:</b> {infoData.assignedAgent ? `${infoData.assignedAgent.name || ''} (${infoData.assignedAgent.email || '-'})` : '-'}</div>
              <div><b>Letzter Bearbeiter:</b> {infoData.lastEditAgent ? `${infoData.lastEditAgent.name || ''} (${infoData.lastEditAgent.email || '-'})` : '-'}</div>
              <div><b>Antragsdatum:</b> {infoData.app?.submitted_at ? new Date(infoData.app.submitted_at).toLocaleString() : '-'}</div>
              <div><b>Letzte Änderung:</b> {infoData.app?.updated_at ? new Date(infoData.app.updated_at).toLocaleString() : '-'}</div>
            </div>
          ) : (
            <div>Keine Daten gefunden.</div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseInfo}>Schließen</Button>
        </Modal.Footer>
      </Modal>
      {/* New modal for finish review */}
      <Modal show={showFinishModal || decisionSuccess} onHide={decisionSuccess ? onClose : handleCloseFinishModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{decisionSuccess ? 'Prüfung erfolgreich abgeschlossen' : 'Prüfung abschließen'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {decisionSuccess ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280, padding: 32 }}>
              <div style={{ background: '#e6f4ea', borderRadius: '50%', width: 90, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <span className="material-icons" style={{ color: '#388e3c', fontSize: 54 }}>check_circle</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#388e3c', marginBottom: 16, textAlign: 'center' }}>
                Entscheidung erfolgreich übermittelt!
              </div>
              <Button variant="success" size="lg" style={{ minWidth: 220, fontWeight: 600, fontSize: 18, marginTop: 12 }} onClick={onClose}>
                Zurück zur Übersicht
              </Button>
            </div>
          ) : (
            <div style={{ padding: 0 }}>
              <div style={{ marginBottom: 20, color: '#333', fontSize: 18, fontWeight: 500 }}>
                Bitte überprüfen Sie die Ergebnisse der Checkliste, bevor Sie eine Entscheidung treffen.
              </div>
              {/* Checklist groups as cards with badges */}
              {(() => {
                const groups = groupChecklistItems(finishChecklist);
                const sections: { key: SectionKey; label: string; color: string }[] = [
                  { key: 'correct', label: 'Korrekte Angaben', color: '#388e3c' },
                  { key: 'wrong', label: 'Fehlerhafte Angaben', color: '#d32f2f' },
                  { key: 'undefined', label: 'Ungeprüfte Angaben', color: '#757575' },
                ];
                return <>
                  <div style={{ display: 'block', marginBottom: 24 }}>
                    {sections.filter(sec => groups[sec.key as SectionKey].length > 0).map(sec => (
                      <div key={sec.key} style={{ marginBottom: 18, background: '#fff', border: `2px solid ${sec.color}22`, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                        <div
                          style={{
                            display: 'flex', alignItems: 'center', padding: '16px 22px', cursor: 'pointer', borderRadius: 12, fontWeight: 600, fontSize: 18, gap: 16, background: '#f7f7f7', borderBottom: `1px solid ${sec.color}22`,
                          }}
                          onClick={() => setExpandedSections(prev => ({ ...prev, [sec.key]: !prev[sec.key] }))}
                        >
                          <span style={{ fontWeight: 700, fontSize: 22, color: sec.color, minWidth: 32, textAlign: 'right', display: 'inline-block', background: sec.color + '22', borderRadius: 12, padding: '4px 16px' }}>{groups[sec.key as SectionKey].length}</span>
                          <span style={{ color: '#bdbdbd', fontWeight: 400, fontSize: 22, margin: '0 8px' }}>|</span>
                          <span style={{ color: sec.color }}>{sec.label}</span>
                          <span className="material-icons" style={{ marginLeft: 'auto', fontSize: 26, color: '#757575' }}>
                            {expandedSections[sec.key] ? 'expand_less' : 'expand_more'}
                          </span>
                        </div>
                        <Collapse in={!!expandedSections[sec.key]}>
                          <div>
                            <ul style={{ margin: 0, padding: '14px 32px', listStyle: 'disc', color: '#333', fontSize: 16 }}>
                              {groups[sec.key as SectionKey].map((item: ChecklistItem) => (
                                <li key={item.id} style={{ marginBottom: 6 }}>{item.title}</li>
                              ))}
                            </ul>
                          </div>
                        </Collapse>
                      </div>
                    ))}
                  </div>
                  {/* Decision buttons and note input */}
                  <div style={{ marginTop: 32, marginBottom: 8, display: 'flex', gap: 18, justifyContent: 'center' }}>
                    <Button
                      variant={decision === 'approved' ? 'success' : 'outline-success'}
                      style={{ minWidth: 200, fontWeight: 600, fontSize: 18, boxShadow: decision === 'approved' ? '0 2px 8px #388e3c22' : undefined }}
                      onClick={() => setDecision('approved')}
                      disabled={decisionLoading}
                    >
                      Antrag Bewilligen
                    </Button>
                    <Button
                      variant={decision === 'rejected' ? 'danger' : 'outline-danger'}
                      style={{ minWidth: 200, fontWeight: 600, fontSize: 18, boxShadow: decision === 'rejected' ? '0 2px 8px #d32f2f22' : undefined }}
                      onClick={() => setDecision('rejected')}
                      disabled={decisionLoading}
                    >
                      Antrag Ablehnen
                    </Button>
                  </div>
                  {decision && (
                    <div style={{ marginTop: 22, background: '#f7f7f7', borderRadius: 10, padding: 18 }}>
                      <div style={{ marginBottom: 10, color: '#333', fontWeight: 500, fontSize: 16 }}>
                        Notiz zur Entscheidung (optional, wird an den Antragsteller gesendet):
                      </div>
                      <textarea
                        value={decisionNote}
                        onChange={e => setDecisionNote(e.target.value)}
                        rows={3}
                        style={{ width: '100%', borderRadius: 8, border: '1.5px solid #bdbdbd', padding: 12, fontSize: 16, marginBottom: 10, background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                        placeholder="Hier können Sie eine Notiz zur Entscheidung hinzufügen..."
                        disabled={decisionLoading}
                      />
                      {decisionError && <div className="alert alert-danger" style={{ marginBottom: 10 }}>{decisionError}</div>}
                      <Button
                        variant={decision === 'approved' ? 'success' : 'danger'}
                        style={{ minWidth: 200, fontWeight: 600, fontSize: 18, marginTop: 6 }}
                        onClick={handleSubmitDecision}
                        disabled={decisionLoading}
                      >
                        {decisionLoading ? (
                          <Spinner animation="border" size="sm" style={{ marginRight: 8 }} />
                        ) : null}
                        Entscheidung absenden
                      </Button>
                    </div>
                  )}
                </>;
              })()}
            </div>
          )}
        </Modal.Body>
        {!decisionSuccess && (
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseFinishModal}>Schließen</Button>
          </Modal.Footer>
        )}
      </Modal>
    </div>
  );
};

export default ReviewActionsPanel; 