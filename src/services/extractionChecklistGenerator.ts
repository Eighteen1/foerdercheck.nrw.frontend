import { supabase } from '../lib/supabase';
import { ChecklistItem } from '../types/checklist';
import { ExtractionBasedCalculationService, CalculationLine } from './extractionBasedCalculationService';

/**
 * Service for generating automatic extraction checklist items
 * Similar to checklistGenerator but specifically for extraction-based calculations
 */
export class ExtractionChecklistGenerator {
  private residentId: string;
  private applicationId: string;

  constructor(applicationId: string, residentId: string) {
    this.applicationId = applicationId;
    this.residentId = residentId;
  }

  /**
   * Generate automatic extraction checklist items
   * This should only be called once when the application is first opened
   */
  async generateAutomaticExtractionItems(): Promise<ChecklistItem[]> {
    try {
      // Fetch all required data in parallel
      const [
        { data: application, error: appError },
        { data: userData, error: userError },
        { data: financialData, error: financialError }
      ] = await Promise.all([
        // Get application data including extraction_structure
        supabase
          .from('applications')
          .select('extraction_structure')
          .eq('id', this.applicationId)
          .single(),
        
        // Get user data from user_data table
        supabase
          .from('user_data')
          .select('*')
          .eq('id', this.residentId)
          .single(),
        
        // Get financial data from user_financials table
        supabase
          .from('user_financials')
          .select('*')
          .eq('user_id', this.residentId)
          .single()
      ]);

      if (appError || !application?.extraction_structure) {
        console.log('No extraction data available, skipping automatic extraction items');
        return [];
      }

      if (userError || !userData) {
        console.log('No user data available, skipping automatic extraction items');
        return [];
      }

      const extractionData = application.extraction_structure;

      // Generate calculation results using the new extraction-based service
      const calculationService = new ExtractionBasedCalculationService(this.residentId);
      const result = await calculationService.calculateAvailableMonthlyIncome(extractionData);

      // Collect linked document IDs from calculation lines
      const linkedDocs: string[] = [];
      result.calculations.forEach(line => {
        if (line.value?.documentIds) {
          linkedDocs.push(...line.value.documentIds);
        }
      });

      // Create automatic checklist items
      const automaticItems: ChecklistItem[] = [];

      // Available Monthly Income Item
      const availableIncomeItem: ChecklistItem = {
        id: 'automatic-available-monthly-income',
        title: 'Verfügbares Monatseinkommen (Automatische Extraktion)',
        agentStatus: 'undefined',
        systemStatus: result.errors.length > 0 ? 'wrong' : 'correct',
        systemComment: this.generateSystemCommentFromLines(result.calculations),
        systemErrors: result.errors,
        systemWarnings: result.warnings,
        linkedForms: ['selbstauskunft'],
        linkedDocs: Array.from(new Set(linkedDocs)), // Remove duplicates
        linkedSignedDocs: [],
        agentNotes: '',
        // Store only the calculation lines with metadata (much leaner!)
        calculationData: {
          calculations: result.calculations,
          totalIncome: result.totalIncome,
          totalExpenses: result.totalExpenses,
          availableIncome: result.availableIncome
        }
      };

      automaticItems.push(availableIncomeItem);

      // TODO: Add more automatic extraction items here
      // - Yearly household income calculation
      // - Document validation based on extracted values
      // - Cross-validation between form data and extracted data

      return automaticItems;
    } catch (error) {
      console.error('Error generating automatic extraction items:', error);
      return [];
    }
  }

  /**
   * Generate system comment from calculation lines
   * This creates a simple text representation that will be parsed and styled by the UI
   */
  private generateSystemCommentFromLines(calculations: CalculationLine[]): string {
    let comment = 'xyzreg.Dieser Checklistenpunkt zeigt die Berechnung des verfügbaren Monatseinkommens basierend auf extrahierten Dokumentenwerten mit Fallback auf Formulardaten.\n\n';
    
    comment += 'Die Berechnung erfolgt pro Person und wird dann zu einem Haushaltsergebnis zusammengefasst. ';
    comment += 'Werte mit grüner Markierung wurden aus Dokumenten extrahiert, Werte mit lila Markierung stammen aus Formulardaten.\n\n';
    
    return comment;
  }

  /**
   * Debug mode: Always recalculate (for development)
   */
  async generateAutomaticExtractionItemsDebug(): Promise<ChecklistItem[]> {
    console.log('🔧 DEBUG MODE: Recalculating automatic extraction items');
    return this.generateAutomaticExtractionItems();
  }

  /**
   * Check if automatic extraction items already exist in the application
   */
  async hasExistingAutomaticItems(): Promise<boolean> {
    try {
      const { data: application, error } = await supabase
        .from('applications')
        .select('review_data')
        .eq('id', this.applicationId)
        .single();

      if (error || !application?.review_data?.checklistItems) {
        return false;
      }

      const checklistItems = application.review_data.checklistItems;
      return checklistItems.some((item: ChecklistItem) => item.id.startsWith('automatic-'));
    } catch (error) {
      console.error('Error checking for existing automatic items:', error);
      return false;
    }
  }

  /**
   * Save automatic extraction items to the application
   */
  async saveAutomaticItems(items: ChecklistItem[]): Promise<void> {
    try {
      // Get current review data
      const { data: application, error: fetchError } = await supabase
        .from('applications')
        .select('review_data')
        .eq('id', this.applicationId)
        .single();

      if (fetchError) {
        throw new Error('Failed to fetch application data');
      }

      const currentReviewData = application?.review_data || { checklistItems: [] };
      const currentItems = currentReviewData.checklistItems || [];

      // Remove existing automatic items and add new ones
      const filteredItems = currentItems.filter((item: ChecklistItem) => !item.id.startsWith('automatic-'));
      const updatedItems = [...filteredItems, ...items];

      // Save updated review data
      const { error: updateError } = await supabase
        .from('applications')
        .update({
          review_data: {
            ...currentReviewData,
            checklistItems: updatedItems
          }
        })
        .eq('id', this.applicationId);

      if (updateError) {
        throw new Error('Failed to save automatic extraction items');
      }

      console.log('✅ Automatic extraction items saved successfully');
    } catch (error) {
      console.error('Error saving automatic extraction items:', error);
      throw error;
    }
  }
}
