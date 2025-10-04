import { ExtractionChecklistGenerator } from './extractionChecklistGenerator';

/**
 * Debug service for automatic extraction items
 * This service always recalculates for development purposes
 */
export class DebugExtractionService {
  private applicationId: string;
  private residentId: string;

  constructor(applicationId: string, residentId: string) {
    this.applicationId = applicationId;
    this.residentId = residentId;
  }

  /**
   * Always recalculate and save automatic extraction items
   * This is for debugging purposes - in production, this should not be called
   */
  async debugRecalculateAndSave(): Promise<void> {
    console.log('🔧 DEBUG MODE: Recalculating automatic extraction items');
    
    try {
      const generator = new ExtractionChecklistGenerator(this.applicationId, this.residentId);
      
      // Always recalculate (debug mode)
      const automaticItems = await generator.generateAutomaticExtractionItemsDebug();
      
      if (automaticItems.length > 0) {
        // Save the items
        await generator.saveAutomaticItems(automaticItems);
        console.log('✅ DEBUG: Automatic extraction items recalculated and saved');
      } else {
        console.log('ℹ️ DEBUG: No automatic extraction items to generate');
      }
    } catch (error) {
      console.error('❌ DEBUG: Error recalculating automatic extraction items:', error);
      throw error;
    }
  }

  /**
   * Check if we should recalculate (for debugging)
   * In production, this should always return false
   */
  shouldRecalculate(): boolean {
    // For debugging, always recalculate
    // In production, this should check a debug flag or environment variable
    return process.env.NODE_ENV === 'development' || true; // Change to false for production
  }
}
