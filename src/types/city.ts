export interface AssignmentRule {
  filterType: 'type' | 'postcode' | 'household' | 'employment';
  rules: {
    [key: string]: string; // key is the filter value, value is the agent UID
  };
}

export interface CitySettings {
  assignmentRules?: AssignmentRule;
  deletionTime?: number;
  // ... existing code ...
} 