export type ChecklistStatus = 'correct' | 'wrong' | 'undefined' | 'created';

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