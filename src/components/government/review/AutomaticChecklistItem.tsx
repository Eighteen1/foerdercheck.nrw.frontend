import React, { useState, useRef, useEffect } from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { ChecklistItemProps, ChecklistStatus } from '../../../types/checklist';
import { CalculationLine, ValueWithMetadata } from '../../../services/extractionBasedCalculationService';
import { DOCUMENT_LABELS } from './FormsDocsPanel';
import { formatCurrencyForDisplay, formatCurrencyForDatabase } from '../../../utils/currencyUtils';
import { supabase, getCurrentUser } from '../../../lib/supabase';
import AssignSecondReviewerModal from './AssignSecondReviewerModal';

interface AutomaticChecklistItemProps extends ChecklistItemProps {
  onOpenDocument: (docId: string) => void;
  onRecalculate?: () => void;
  isReadOnly?: boolean;
  userData?: any;
  onCalculationDataChange?: (itemId: string, newCalculationData: any) => Promise<void>;
  applicationId?: string;
  onRefreshData?: () => Promise<void>;
  onAssignSecondReviewer?: (itemId: string, assignedAgentId: string) => Promise<void>;
  onSecondAgentStatusChange?: (itemId: string, newStatus: string) => Promise<void>;
  onRemoveSecondReviewer?: (itemId: string) => Promise<void>;
}

const AutomaticChecklistItem: React.FC<AutomaticChecklistItemProps> = ({
  item,
  onStatusChange,
  onNotesChange,
  onOpenForm,
  onOpenDocument,
  onRecalculate,
  isReadOnly = false,
  userData,
  onCalculationDataChange,
  applicationId,
  onRefreshData,
  onAssignSecondReviewer,
  onSecondAgentStatusChange,
  onRemoveSecondReviewer,
}) => {
  const [tempNotes, setTempNotes] = useState(item.agentNotes || '');
  const [notesChanged, setNotesChanged] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [isSmall, setIsSmall] = useState(false);
  const [editingLines, setEditingLines] = useState<{ [lineId: string]: boolean }>({});
  const [editingValues, setEditingValues] = useState<{ [lineId: string]: string }>({});
  const [showCalculationDetails, setShowCalculationDetails] = useState(true); // Show by default
  const [localCalculationData, setLocalCalculationData] = useState(item.calculationData);
  const containerRef = useRef<HTMLDivElement>(null);
  const [statusSetByAgent, setStatusSetByAgent] = useState<{ name: string; email: string } | null>(null);
  const [showSecondReviewerModal, setShowSecondReviewerModal] = useState(false);
  const [secondReviewerAgent, setSecondReviewerAgent] = useState<{ name: string; email: string } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Reset states when item changes
  useEffect(() => {
    setTempNotes(item.agentNotes || '');
    setShowNoteInput(false);
    setNotesChanged(false);
    setEditingValues({});
    setEditingLines({});
    setLocalCalculationData(item.calculationData);
  }, [item.id, item.calculationData]);

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

  // Fetch current user ID
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const user = await getCurrentUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    fetchCurrentUser();
  }, []);

  // Fetch agent information if statusSetBy is present
  useEffect(() => {
    const fetchAgentInfo = async () => {
      if (item.statusSetBy) {
        try {
          const { data, error } = await supabase
            .from('agents')
            .select('name, email')
            .eq('id', item.statusSetBy)
            .single();
          
          if (!error && data) {
            setStatusSetByAgent(data);
          }
        } catch (error) {
          console.error('Error fetching agent info:', error);
        }
      } else {
        setStatusSetByAgent(null);
      }
    };
    
    fetchAgentInfo();
  }, [item.statusSetBy]);

  // Fetch second reviewer agent information if secondAgentStatus is present
  useEffect(() => {
    const fetchSecondReviewerInfo = async () => {
      if (item.secondAgentStatus?.assignedAgent) {
        try {
          const { data, error } = await supabase
            .from('agents')
            .select('name, email')
            .eq('id', item.secondAgentStatus.assignedAgent)
            .single();
          
          if (!error && data) {
            setSecondReviewerAgent(data);
          }
        } catch (error) {
          console.error('Error fetching second reviewer info:', error);
        }
      } else {
        setSecondReviewerAgent(null);
      }
    };
    
    fetchSecondReviewerInfo();
  }, [item.secondAgentStatus]);

  // Helper function to get applicant name with abbreviation
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
    return DOCUMENT_LABELS[docId] || docId;
  };

  // Generate formatted document buttons from linkedDocs
  const getFormattedDocumentButtons = (): { id: string; label: string }[] => {
    const buttons: { id: string; label: string }[] = [];
    
    item.linkedDocs.forEach(fullDocId => {
      // Parse the full document ID to extract components
      const parts = fullDocId.split('_');
      if (parts.length >= 3) {
        // Format: applicantKey_documentType_index
        let searchKey: string;
        let docId: string;
        let index: number;
        
        if (parts[0] === 'applicant') {
          // Format: applicant_UUID_documentType_index
          searchKey = `${parts[0]}_${parts[1]}`;
          docId = parts.slice(2, -1).join('_');
          index = parseInt(parts[parts.length - 1]);
        } else {
          // Format: general_documentType_index or hauptantragsteller_documentType_index
          searchKey = parts[0];
          docId = parts.slice(1, -1).join('_');
          index = parseInt(parts[parts.length - 1]);
        }
        
        // Check if this document exists and is uploaded
        const documentFiles = userData?.document_status?.[searchKey]?.[docId];
        if (documentFiles && Array.isArray(documentFiles) && documentFiles[index]?.uploaded) {
          const baseLabel = getDocumentLabel(docId);
          const applicantLabel = getApplicantNameWithAbbreviation(searchKey);
          
          let label: string;
          if (searchKey === 'general') {
            label = baseLabel;
          } else {
            label = `${baseLabel} - ${applicantLabel}`;
          }
          
          buttons.push({
            id: fullDocId,
            label: label
          });
        }
      }
    });
    
    return buttons;
  };

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

  // Handler to assign second reviewer
  const handleLocalAssignSecondReviewer = async (assignedAgentId: string) => {
    if (onAssignSecondReviewer) {
      await onAssignSecondReviewer(item.id, assignedAgentId);
    }
  };

  // Handler to change second agent status
  const handleLocalSecondAgentStatusChange = async (newStatus: ChecklistStatus) => {
    if (onSecondAgentStatusChange) {
      await onSecondAgentStatusChange(item.id, newStatus);
    }
  };

  // Handler to remove second reviewer
  const handleLocalRemoveSecondReviewer = async () => {
    if (onRemoveSecondReviewer) {
      await onRemoveSecondReviewer(item.id);
    }
  };

  const getSourceStyle = (source: string) => {
    switch (source) {
      case 'extracted':
        return { background: '#e8f5e9', color: '#2e7d32', border: '1px solid #4caf50' };
      case 'form':
        return { background: '#f3e5f5', color: '#6a1b9a', border: '1px solid #9c27b0' };
      case 'manual':
        return { background: '#fff3e0', color: '#e65100', border: '1px solid #ff9800' };
      default:
        return { background: '#f5f5f5', color: '#757575', border: '1px solid #bdbdbd' };
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'extracted':
        return 'Extrahiert';
      case 'form':
        return 'Formular';
      case 'manual':
        return 'Manuell';
      default:
        return 'Unbekannt';
    }
  };

  const formatCurrencyDisplay = (value: number) => {
    return formatCurrencyForDisplay(value);
  };

  const handleStartEdit = (lineIndex: number) => {
    const lineId = `line_${lineIndex}`;
    const line = localCalculationData?.calculations[lineIndex];
    if (!line?.value) return;
    
    setEditingLines(prev => ({ ...prev, [lineId]: true }));
    setEditingValues(prev => ({ ...prev, [lineId]: formatCurrencyForDisplay(line.value.value) }));
  };

  const handleCancelEdit = (lineIndex: number) => {
    const lineId = `line_${lineIndex}`;
    setEditingLines(prev => ({ ...prev, [lineId]: false }));
    setEditingValues(prev => {
      const newValues = { ...prev };
      delete newValues[lineId];
      return newValues;
    });
  };

  const handleValueChange = (lineIndex: number, newValue: string) => {
    const lineId = `line_${lineIndex}`;
    setEditingValues(prev => ({ ...prev, [lineId]: newValue }));
  };

  const recalculateTotals = (calculations: CalculationLine[]): CalculationLine[] => {
    const updated = [...calculations];
    let currentPersonSubtotal = 0;
    let totalIncome = 0;
    let totalExpenses = 0;

    for (let i = 0; i < updated.length; i++) {
      const line = updated[i];
      
      if (line.type === 'person_header') {
        currentPersonSubtotal = 0;
      } else if (line.type === 'income_item' && line.value) {
        currentPersonSubtotal += line.value.value;
      } else if (line.type === 'expense_item' && line.value) {
        currentPersonSubtotal -= line.value.value;
      } else if (line.type === 'subtotal' && line.value) {
        updated[i] = { ...line, value: { ...line.value, value: currentPersonSubtotal } };
      } else if (line.type === 'total') {
        if (line.label.toLowerCase().includes('einnahmen') && line.value) {
          // Calculate total income
          totalIncome = updated
            .filter(l => l.type === 'income_item' && l.value)
            .reduce((sum, l) => sum + (l.value?.value || 0), 0);
          updated[i] = { ...line, value: { ...line.value, value: totalIncome } };
        } else if (line.label.toLowerCase().includes('ausgaben') && line.value) {
          // Calculate total expenses
          totalExpenses = updated
            .filter(l => l.type === 'expense_item' && l.value)
            .reduce((sum, l) => sum + (l.value?.value || 0), 0);
          updated[i] = { ...line, value: { ...line.value, value: totalExpenses } };
        } else if (line.label.toLowerCase().includes('verfügbar') && line.value) {
          // Calculate available income
          updated[i] = { ...line, value: { ...line.value, value: totalIncome - totalExpenses } };
        }
      }
    }

    return updated;
  };

  const handleSaveEdit = async (lineIndex: number) => {
    const lineId = `line_${lineIndex}`;
    const newValueStr = editingValues[lineId];
    if (!newValueStr || !localCalculationData) return;

    // Convert from display format to number
    const numericValue = formatCurrencyForDatabase(newValueStr);
    if (!numericValue) return;
    
    const newValue = parseFloat(numericValue);
    if (isNaN(newValue)) return;

    // Update the calculation data
    const updatedCalculations = [...localCalculationData.calculations];
    const line = updatedCalculations[lineIndex];
    if (!line?.value) return;

    // Update the value and mark as manual
    updatedCalculations[lineIndex] = {
      ...line,
      value: {
        ...line.value,
        value: newValue,
        source: 'manual'
      }
    };

    // Recalculate totals and subtotals
    const recalculated = recalculateTotals(updatedCalculations);

    // Update total values
    const totalIncome = recalculated
      .filter(l => l.type === 'income_item' && l.value)
      .reduce((sum, l) => sum + (l.value?.value || 0), 0);
    const totalExpenses = recalculated
      .filter(l => l.type === 'expense_item' && l.value)
      .reduce((sum, l) => sum + (l.value?.value || 0), 0);
    const availableIncome = totalIncome - totalExpenses;

    const updatedCalculationData = {
      ...localCalculationData,
      calculations: recalculated,
      totalIncome,
      totalExpenses,
      availableIncome
    };

    // Update local state immediately
    setLocalCalculationData(updatedCalculationData);
    setEditingLines(prev => ({ ...prev, [lineId]: false }));
    setEditingValues(prev => {
      const newValues = { ...prev };
      delete newValues[lineId];
      return newValues;
    });

    // Save to database
    if (onCalculationDataChange) {
      await onCalculationDataChange(item.id, updatedCalculationData);
    }
  };

  const handleSaveNotes = () => {
    onNotesChange(item.id, tempNotes);
    setNotesChanged(false);
    setShowNoteInput(false);
  };

  const getLineValue = (line: CalculationLine, lineIndex: number): number => {
    if (!localCalculationData) return line.value?.value || 0;
    const updatedLine = localCalculationData.calculations[lineIndex];
    return updatedLine?.value?.value || 0;
  };

  // Render a single calculation line
  const renderCalculationLine = (line: CalculationLine, lineIndex: number) => {
    const currentValue = getLineValue(line, lineIndex);

    // Render based on line type
    switch (line.type) {
      case 'person_header':
        return (
          <div key={`header_${lineIndex}`} style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#064497',
            marginTop: '20px',
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: '2px solid #064497'
          }}>
            {line.label}
          </div>
        );

      case 'income_item':
      case 'expense_item':
        if (!line.value) return null;
        
        const sourceStyle = getSourceStyle(line.value.source);
        const isEditable = line.value.editable && !isReadOnly;
        const lineId = `line_${lineIndex}`;
        const isEditing = editingLines[lineId] || false;
        
        // Different background colors for income (green tint) vs expense (red tint)
        const itemBackground = line.type === 'income_item' ? '#f1f8f4' : '#fff5f5';
        const itemBorder = line.type === 'income_item' ? '1px solid #c8e6c9' : '1px solid #ffcdd2';

        return (
          <div key={`item_${lineIndex}`} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            marginBottom: '6px',
            background: itemBackground,
            borderRadius: '6px',
            border: itemBorder
          }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', color: '#495057', fontWeight: '500' }}>{line.label}:</span>
              <span style={{
                ...sourceStyle,
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '500'
              }}>
                {getSourceLabel(line.value.source)}
              </span>
              {line.value.confidence && (
                <span style={{
                  background: '#e3f2fd',
                  color: '#1976d2',
                  padding: '2px 6px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: '500'
                }}>
                  {Math.round(line.value.confidence * 100)}%
                </span>
              )}
              {line.value.documentIds && line.value.documentIds.length > 0 && (
                <button
                  onClick={() => onOpenDocument(line.value!.documentIds![0])}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#1976d2',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    fontSize: '11px',
                    textDecoration: 'underline'
                  }}
                  title={`Dokument öffnen: ${line.value.documentIds[0]}`}
                >
                  Dokument anzeigen
                </button>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isEditing ? (
                <>
                  <input
                    type="text"
                    value={editingValues[lineId] || ''}
                    onChange={(e) => handleValueChange(lineIndex, e.target.value)}
                    style={{
                      width: '140px',
                      padding: '6px 8px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      fontSize: '14px',
                      textAlign: 'right',
                      fontWeight: '600'
                    }}
                    placeholder="0,00 €"
                  />
                  <button
                    onClick={() => handleCancelEdit(lineIndex)}
                    style={{
                      background: '#e0e0e0',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px'
                    }}
                    title="Abbrechen"
                  >
                    <span className="material-icons" style={{ fontSize: '18px', color: '#757575' }}>close</span>
                  </button>
                  <button
                    onClick={() => handleSaveEdit(lineIndex)}
                    style={{
                      background: '#4caf50',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px'
                    }}
                    title="Speichern"
                  >
                    <span className="material-icons" style={{ fontSize: '18px', color: '#fff' }}>save</span>
                  </button>
                </>
              ) : (
                <>
                  <span style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#495057',
                    minWidth: '140px',
                    display: 'inline-block',
                    textAlign: 'right'
                  }}>
                    {formatCurrencyDisplay(currentValue)}
                  </span>
                  {isEditable && (
                    <button
                      onClick={() => handleStartEdit(lineIndex)}
                      style={{
                        background: '#064497',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px'
                      }}
                      title="Bearbeiten"
                    >
                      <span className="material-icons" style={{ fontSize: '18px', color: '#fff' }}>edit</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        );

      case 'subtotal':
        if (!line.value) return null;
        return (
          <div key={`subtotal_${lineIndex}`} style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '8px 14px',
            marginBottom: '12px',
            background: '#e3f2fd',
            borderRadius: '6px',
            fontWeight: '600'
          }}>
            <span style={{ color: '#1976d2' }}>{line.label}:</span>
            <span style={{ color: '#1976d2' }}>{formatCurrencyDisplay(currentValue)}</span>
          </div>
        );

      case 'total':
        if (!line.value) return null;
        return (
          <div key={`total_${lineIndex}`} style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '12px 16px',
            marginTop: lineIndex > 0 && localCalculationData?.calculations[lineIndex - 1]?.type !== 'total' ? '16px' : '6px',
            marginBottom: '6px',
            background: '#064497',
            color: 'white',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '15px'
          }}>
            <span>{line.label}:</span>
            <span>{formatCurrencyDisplay(currentValue)}</span>
          </div>
        );

      case 'validation':
        if (!line.value) return null;
        return (
          <div key={`validation_${lineIndex}`} style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '10px 14px',
            marginTop: '12px',
            marginBottom: '6px',
            background: '#fff3e0',
            borderRadius: '6px',
            fontWeight: '600',
            border: '1px solid #ff9800'
          }}>
            <span style={{ color: '#e65100' }}>{line.label}:</span>
            <span style={{ color: '#e65100' }}>{formatCurrencyDisplay(currentValue)}</span>
          </div>
        );

      default:
        return null;
    }
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
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, color: '#064497', fontWeight: 400, fontSize: 22 }}>{item.title}</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowCalculationDetails(!showCalculationDetails)}
              style={{
                padding: '6px 12px',
                background: showCalculationDetails ? '#064497' : '#f2f2f2',
                color: showCalculationDetails ? '#fff' : '#064497',
                border: '1px solid #bdbdbd',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span className="material-icons" style={{ fontSize: '18px' }}>
                {showCalculationDetails ? 'visibility_off' : 'visibility'}
              </span>
              {showCalculationDetails ? 'Details ausblenden' : 'Details anzeigen'}
            </button>
            {onRecalculate && !isReadOnly && (
              <button
                onClick={onRecalculate}
                style={{
                  padding: '6px 12px',
                  background: '#4caf50',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span className="material-icons" style={{ fontSize: '18px' }}>refresh</span>
                Neu berechnen
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status Section */}
      <div
        style={{
          display: 'flex',
          flexDirection: isSmall ? 'column' : 'row',
          gap: isSmall ? 8 : 32,
          marginBottom: 20,
          alignItems: isSmall ? 'flex-start' : 'center',
          flexWrap: 'wrap',
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
            {item.systemStatus === 'correct' ? 'Gültig' : item.systemStatus === 'wrong' ? 'Ungültig' : 'Ungeprüft'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: isSmall ? '100%' : 'auto', marginTop: isSmall ? 8 : 0 }}>
          <span style={{ color: '#666', fontWeight: 500 }}>Prüfung:</span>
          <OverlayTrigger
            placement="top"
            overlay={
              statusSetByAgent ? (
                <Tooltip id={`tooltip-status-${item.id}`}>
                  Geprüft von: {statusSetByAgent.name || 'Unbekannt'}<br />
                  {statusSetByAgent.email}
                </Tooltip>
              ) : <span />
            }
          >
            <div style={{ position: 'relative', display: 'inline-block' }}>
              {isReadOnly ? (
                <span
                  style={{
                    ...getStatusStyle(item.agentStatus),
                    borderRadius: 16,
                    padding: '4px 16px',
                    fontWeight: 600,
                    fontSize: 15,
                    minWidth: 90,
                    display: 'inline-block',
                    textAlign: 'center',
                  }}
                >
                  {item.agentStatus === 'correct' ? 'Gültig' : item.agentStatus === 'wrong' ? 'Ungültig' : 'Ungeprüft'}
                </span>
              ) : (
                <>
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
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      MozAppearance: 'none',
                      background: 'none',
                    }}
                  >
                    <option value="undefined">Ungeprüft</option>
                    <option value="correct">Gültig</option>
                    <option value="wrong">Ungültig</option>
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
                </>
              )}
            </div>
          </OverlayTrigger>
          {!isReadOnly && !item.secondAgentStatus && (
            <button
              onClick={() => setShowSecondReviewerModal(true)}
              style={{
                background: '#ffffff',
                borderRadius: 16,
                border: '1px solid #9e9e9e',
                padding: '6px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
              } as React.CSSProperties}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f2f2f2';
                e.currentTarget.style.setProperty('border', '1px solid #9e9e9e', 'important');
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.setProperty('border', '1px solid #9e9e9e', 'important');
              }}
              className="custom-bordered-button"
              title="Zweiten Prüfer hinzufügen"
            >
              <span className="material-icons" style={{ fontSize: 18, color: '#757575' }}>
                add
              </span>
            </button>
          )}
        </div>
        {item.secondAgentStatus && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: isSmall ? '100%' : 'auto', marginTop: isSmall ? 8 : 0 }}>
            <span style={{ color: '#666', fontWeight: 500 }}>2. Prüfung:</span>
            <OverlayTrigger
              placement="top"
              overlay={
                secondReviewerAgent ? (
                  <Tooltip id={`tooltip-second-status-${item.id}`}>
                    {currentUserId === item.secondAgentStatus.assignedAgent ? 'Sie sind der zugewiesene Prüfer' : `Zugewiesen an: ${secondReviewerAgent.name || 'Unbekannt'}`}<br />
                    {secondReviewerAgent.email}
                  </Tooltip>
                ) : <span />
              }
            >
              <div style={{ position: 'relative', display: 'inline-block' }}>
                {isReadOnly || currentUserId !== item.secondAgentStatus.assignedAgent ? (
                  <span
                    style={{
                      ...getStatusStyle(item.secondAgentStatus.status),
                      borderRadius: 16,
                      padding: '4px 16px',
                      fontWeight: 600,
                      fontSize: 15,
                      minWidth: 90,
                      display: 'inline-block',
                      textAlign: 'center',
                    }}
                  >
                    {item.secondAgentStatus.status === 'correct' ? 'Gültig' : item.secondAgentStatus.status === 'wrong' ? 'Ungültig' : 'Ungeprüft'}
                  </span>
                ) : (
                  <>
                    <select
                      value={item.secondAgentStatus.status}
                      onChange={(e) => handleLocalSecondAgentStatusChange(e.target.value as ChecklistStatus)}
                      style={{
                        ...getStatusStyle(item.secondAgentStatus.status),
                        borderRadius: 16,
                        padding: '4px 16px 4px 16px',
                        paddingRight: 40,
                        fontWeight: 600,
                        fontSize: 15,
                        outline: 'none',
                        minWidth: 90,
                        cursor: 'pointer',
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        MozAppearance: 'none',
                        background: 'none',
                      }}
                    >
                      <option value="undefined">Ungeprüft</option>
                      <option value="correct">Gültig</option>
                      <option value="wrong">Ungültig</option>
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
                  </>
                )}
              </div>
            </OverlayTrigger>
          {!isReadOnly && item.secondAgentStatus && item.secondAgentStatus.status === 'undefined' && currentUserId === item.secondAgentStatus.createdBy && (
            <button
              onClick={handleLocalRemoveSecondReviewer}
              style={{
                background: '#ffffff',
                borderRadius: 16,
                border: '1px solid #9e9e9e',
                padding: '6px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
              } as React.CSSProperties}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f2f2f2';
                e.currentTarget.style.setProperty('border', '1px solid #9e9e9e', 'important');
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.setProperty('border', '1px solid #9e9e9e', 'important');
              }}
              className="custom-bordered-button"
              title="Zweiten Prüfer entfernen"
            >
              <span className="material-icons" style={{ fontSize: 18, color: '#757575' }}>
                delete
              </span>
            </button>
          )}
          </div>
        )}
      </div>

      {/* System Comment */}
      {item.systemComment && (
        <div
          style={{
            marginBottom: 20,
            background: '#eaf2fb',
            borderRadius: 10,
            padding: '14px 18px',
            color: '#064497',
            display: 'flex',
            alignItems: 'flex-start',
            fontSize: 15,
            fontWeight: 500,
            gap: 10,
          }}
        >
          <span className="material-icons" style={{ fontSize: 20, color: '#1976d2' }}>info</span>
          <div style={{ flex: 1 }}>
            <b>Systemkommentar:</b>
            <div style={{ whiteSpace: 'pre-line', marginTop: 4, lineHeight: 1.5 }}>
              {item.systemComment.split('\n').map((line, index) => {
                // Apply styling based on line prefix (similar to ChecklistItem)
                let style: React.CSSProperties = { marginTop: '4px', marginBottom: '4px' };
                let content = line;

                if (line.startsWith('xyzreg.')) {
                  style = {
                    ...style,
                    color: '#064497',
                    fontSize: 15,
                    fontWeight: 500,
                    marginBottom: '16px'
                  };
                  content = line.replace('xyzreg.', '');
                }

                return <div key={index} style={style}>{content}</div>;
              })}
            </div>
          </div>
        </div>
      )}

      {/* System Warnings */}
      {item.systemWarnings && item.systemWarnings.length > 0 && (
        <div
          style={{
            marginBottom: 20,
            background: '#fefce8',
            border: '1px solid #f59e0b',
            borderRadius: 10,
            padding: '14px 18px',
            color: '#92400e',
            display: 'flex',
            alignItems: 'flex-start',
            fontSize: 15,
            fontWeight: 500,
            gap: 10,
          }}
        >
          <span className="material-icons" style={{ fontSize: 20, color: '#d97706' }}>warning</span>
          <div style={{ flex: 1 }}>
            <b>Systemwarnungen:</b>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: 24, color: '#a16207', fontWeight: 400, lineHeight: 1.5 }}>
              {item.systemWarnings.map((warning, index) => (
                <li key={index} style={{ marginBottom: 4 }}>• {warning}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* System Errors */}
      {item.systemErrors && item.systemErrors.length > 0 && (
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
            <span><b>Identifizierte Probleme:</b></span>
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
        {item.linkedForms.map((formId) => (
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
            {formId === 'selbstauskunft' ? 'Selbstauskunft' : formId}
          </button>
        ))}
        {getFormattedDocumentButtons().map(({ id, label }) => (
          <button
            key={id}
            onClick={() => onOpenDocument(id)}
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
            {label}
          </button>
        ))}
      </div>

      {/* Calculation Details */}
      {showCalculationDetails && localCalculationData?.calculations && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#495057',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span className="material-icons" style={{ fontSize: '20px' }}>calculate</span>
            Berechnungsdetails
          </div>

          {localCalculationData.calculations.map((line: CalculationLine, index: number) => 
            renderCalculationLine(line, index)
          )}
        </div>
      )}

      {/* Agent Notes */}
      <div style={{ marginTop: 10 }}>
        {!showNoteInput && !isReadOnly && (
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
                disabled={isReadOnly}
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
            {!isReadOnly && (
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
            )}
          </div>
        )}
        {!showNoteInput && item.agentNotes && (
          <div style={{ marginTop: 8, color: '#333', fontSize: 15, background: '#f7f7f7', borderRadius: 5, padding: '8px 12px', border: '1px solid #e0e0e0' }}>
            {item.agentNotes}
          </div>
        )}
      </div>

      {/* Second Reviewer Modal */}
      <AssignSecondReviewerModal
        show={showSecondReviewerModal}
        onHide={() => setShowSecondReviewerModal(false)}
        onAssign={handleLocalAssignSecondReviewer}
        checklistItemTitle={item.title}
      />
    </div>
  );
};

export default AutomaticChecklistItem;