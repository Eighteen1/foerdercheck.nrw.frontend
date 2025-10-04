export type ChecklistStatus = 'correct' | 'wrong' | 'undefined' | 'created';

export interface SecondAgentStatus {
  createdBy: string; // UID of agent that created the second status
  assignedAgent: string; // UID of the person that needs to set the status
  status: ChecklistStatus; // The status that the second agent will set
}

export interface ChecklistItem {
  id: string;
  title: string;
  systemStatus: ChecklistStatus;
  agentStatus: ChecklistStatus;
  systemComment: string;
  systemErrors: string[];
  systemWarnings?: string[]; // Optional field for warnings
  linkedForms: string[];
  linkedDocs: string[];
  linkedSignedDocs?: string[]; // Optional field for linked signed documents
  agentNotes: string | null;
  calculationData?: any; // Optional field for storing calculation data for automatic items
  statusSetBy?: string; // Optional field for storing UID of agent who last changed the agentStatus
  secondAgentStatus?: SecondAgentStatus; // Optional field for second reviewer status
}

export interface ReviewData {
  checklistItems: ChecklistItem[];
  lastUpdated: string;
  version: number;
}

export interface ChecklistItemProps {
  item: ChecklistItem;
  onStatusChange: (id: string, status: ChecklistStatus) => void;
  onNotesChange: (id: string, notes: string) => void;
  onOpenForm: (formId: string) => void;
  onOpenDocument: (docId: string) => void;
} 