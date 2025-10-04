import { supabase } from '../lib/supabase';
import { documentValueService } from './documentValueService';

// Interface for the extraction structure JSON
export interface ExtractionStructure {
  [personId: string]: {
    [documentType: string]: {
      numberOfFiles: number;
      relevantValues: string[];
      extractionComplete: boolean;
      [fileName: string]: any; // Individual file data
    };
  };
}

// Interface for individual file extraction data
export interface FileExtractionData {
  filePath: string;
  confidence: string;
  methodUsed: string;
  uploadedAt: string;
  [valueId: string]: any; // Dynamic value extraction results
}

// Interface for extraction results
export interface ExtractionResult {
  success: boolean;
  extractedValues: Record<string, any>;
  confidence: number;
  methodUsed: string;
  error?: string;
}

// Interface for document type mapping
export interface DocumentTypeMapping {
  [documentTypeId: string]: string;
}

export class DocumentExtractionProcessor {
  private residentId: string;
  private applicationId: string;
  private extractionStructure: ExtractionStructure | null = null;

  // Document type mapping for backend OCR service
  private documentTypeMapping: DocumentTypeMapping = {
    'lohn_gehaltsbescheinigungen': 'lohn_gehaltsbescheinigung',
    'werbungskosten_nachweis': 'werbungskosten_nachweis',
    'einkommenssteuerbescheid': 'einkommenssteuerbescheid',
    'einkommenssteuererklaerung': 'einkommenssteuerbescheid',
    'rentenbescheid': 'rentenbescheid',
    'arbeitslosengeldbescheid': 'arbeitslosengeld_bescheid',
    'guv_euer_nachweis': 'werbungskosten_nachweis',
    'unterhaltsverpflichtung_nachweis': 'unterhaltsverpflichtung_nachweis',
    'unterhaltsleistungen_nachweis': 'unterhalt_bescheid',
    'kinderbetreuungskosten_nachweis': 'kinderbetreuungskosten_nachweis'
  };

  constructor(residentId: string, applicationId: string) {
    this.residentId = residentId;
    this.applicationId = applicationId;
  }

  /**
   * Main method to process extraction structure and extract all values
   */
  async processExtractionStructure(): Promise<{
    success: boolean;
    processedFiles: number;
    totalFiles: number;
    errors: string[];
    updatedStructure: ExtractionStructure;
  }> {
    try {
      // Starting extraction structure processing
      
      // 1. Load extraction structure from database
      await this.loadExtractionStructure();
      
      if (!this.extractionStructure) {
        throw new Error('No extraction structure found in database');
      }

      // 2. Process all documents in the structure
      const results = await this.processAllDocuments();
      
      // 3. Update the extraction structure with results
      const updatedStructure = this.updateStructureWithResults(results.results);
      
      // 4. Save updated structure back to database
      await this.saveUpdatedStructure(updatedStructure);
      
      // Extraction structure processing completed successfully
      
      return {
        success: true,
        processedFiles: results.processedFiles,
        totalFiles: results.totalFiles,
        errors: results.errors,
        updatedStructure
      };
      
    } catch (error) {
      console.error('❌ Error processing extraction structure:', error);
      return {
        success: false,
        processedFiles: 0,
        totalFiles: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        updatedStructure: this.extractionStructure || {}
      };
    }
  }

  /**
   * Load extraction structure from database
   */
  private async loadExtractionStructure(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('extraction_structure')
        .eq('id', this.applicationId)
        .single();

      if (error) throw error;

      this.extractionStructure = data?.extraction_structure || null;
      // Loaded extraction structure from database
    } catch (error) {
      console.error('Error loading extraction structure:', error);
      throw error;
    }
  }

  /**
   * Process all documents in the extraction structure
   */
  private async processAllDocuments(): Promise<{
    processedFiles: number;
    totalFiles: number;
    errors: string[];
    results: Map<string, ExtractionResult>;
  }> {
    const results = new Map<string, ExtractionResult>();
    const errors: string[] = [];
    let processedFiles = 0;
    let totalFiles = 0;

    if (!this.extractionStructure) {
      return { processedFiles: 0, totalFiles: 0, errors: ['No extraction structure'], results };
    }

    // Count total files first
    for (const [personId, personData] of Object.entries(this.extractionStructure)) {
      for (const [documentType, documentData] of Object.entries(personData as Record<string, any>)) {
        if (documentData.numberOfFiles > 0) {
          totalFiles += documentData.numberOfFiles;
        }
      }
    }

      console.log(`📊 Processing ${totalFiles} files...`);

    // Process each person's documents
    for (const [personId, personData] of Object.entries(this.extractionStructure)) {
      for (const [documentType, documentData] of Object.entries(personData as Record<string, any>)) {
        if (documentData.numberOfFiles === 0) {
          continue;
        }
        
        // Process each file in this document type
        for (const [fileName, fileData] of Object.entries(documentData as Record<string, any>)) {
          if (fileName === 'numberOfFiles' || fileName === 'relevantValues' || fileName === 'extractionComplete') {
            continue;
          }

          const fileKey = `${personId}_${documentType}_${fileName}`;
          // Processing file: ${fileName}

          try {
            const extractionResult = await this.extractFromFile(
              fileData as FileExtractionData,
              documentType,
              documentData.relevantValues
            );

            results.set(fileKey, extractionResult);
            processedFiles++;

            if (extractionResult.success) {
              // Successfully extracted from ${fileName}
            } else {
              console.warn(`⚠️ Extraction failed for ${fileName}: ${extractionResult.error}`);
              errors.push(`Failed to extract from ${fileName}: ${extractionResult.error}`);
            }

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`❌ Error processing ${fileName}:`, errorMessage);
            errors.push(`Error processing ${fileName}: ${errorMessage}`);
            
            results.set(fileKey, {
              success: false,
              extractedValues: {},
              confidence: 0,
              methodUsed: 'error',
              error: errorMessage
            });
          }
        }
      }
    }

    return { processedFiles, totalFiles, errors, results };
  }

  /**
   * Extract values from a single file using backend OCR/AI service
   */
  private async extractFromFile(
    fileData: FileExtractionData,
    documentType: string,
    relevantValues: string[]
  ): Promise<ExtractionResult> {
    try {
      // Map document type to backend OCR service document type
      const backendDocumentType = this.documentTypeMapping[documentType] || 'werbungskosten_nachweis';
      
      // Extracting from file (${relevantValues.length} values)

      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('No valid session found. Please log in again.');
      }

      // Call comprehensive extraction (OCR-only, no Document AI)
      const extractionResult = await documentValueService.comprehensiveExtractValueFromStorage(
        fileData.filePath,
        backendDocumentType,
        session.access_token
      );

      if (!extractionResult.success) {
        return {
          success: false,
          extractedValues: {},
          confidence: 0,
          methodUsed: 'error',
          error: extractionResult.message || 'Extraction failed'
        };
      }

      // Map the comprehensive extraction results to our specific value structure
      // Raw extraction completed
      
      const mappedValues = this.mapExtractedValues(
        extractionResult.extracted_values || {},
        relevantValues,
        documentType
      );
      
      // Mapped values completed

      return {
        success: true,
        extractedValues: mappedValues,
        confidence: extractionResult.overall_confidence || extractionResult.confidence_score || 0,
        methodUsed: extractionResult.extraction_method || 'OCR_COMPREHENSIVE'
      };

    } catch (error) {
      console.error('Error extracting from file:', error);
      return {
        success: false,
        extractedValues: {},
        confidence: 0,
        methodUsed: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Map comprehensive extraction results to specific value structure
   */
  private mapExtractedValues(
    extractedValues: Record<string, any>,
    relevantValues: string[],
    documentType: string
  ): Record<string, any> {
    const mappedValues: Record<string, any> = {};

      // Mapping values for document type: ${documentType}

    // For each relevant value, try to find it in the extracted values
    for (const valueId of relevantValues) {
      let valueData = extractedValues[valueId];
      // Looking for valueId: ${valueId}
      
      // If the specific valueId is not found, try to map from generic fields
      if (!valueData) {
        valueData = this.mapGenericExtractedValues(extractedValues, valueId, documentType);
      }
      
      if (valueData && typeof valueData === 'object') {
        // If it's already a structured value object, use it as-is
        mappedValues[valueId] = {
          year: valueData.year || '',
          month: valueData.month || '',
          isMonthly: valueData.isMonthly,
          confidence: valueData.confidence || '',
          isRecurring: valueData.isRecurring,
          // Add the actual value based on the value type
          ...(valueData.gross_value !== undefined && { gross_value: valueData.gross_value }),
          ...(valueData.net_value !== undefined && { net_value: valueData.net_value }),
          ...(valueData.amount !== undefined && { amount: valueData.amount }),
          ...(valueData.laufzeit !== undefined && { laufzeit: valueData.laufzeit })
        };
      } else if (valueData !== undefined && valueData !== null) {
        // If it's a simple value, wrap it in the appropriate structure
        mappedValues[valueId] = {
          year: '',
          month: '',
          isMonthly: null,
          confidence: '',
          isRecurring: null,
          // Determine the value field based on the value ID
          ...(this.getValueFieldForValueId(valueId, valueData))
        };
      } else {
        // No value found, create empty structure but preserve the expected fields
        // No value found for ${valueId}, creating empty structure
        mappedValues[valueId] = this.createEmptyValueStructure(valueId, documentType);
      }
    }

    return mappedValues;
  }

  /**
   * Map generic extracted values to specific value IDs
   */
  private mapGenericExtractedValues(
    extractedValues: Record<string, any>,
    valueId: string,
    documentType: string
  ): any {
    // For werbungskosten_nachweis, map generic 'amount' to 'werbungskosten'
    if (documentType === 'werbungskosten_nachweis' && valueId === 'werbungskosten') {
      return {
        amount: extractedValues.amount || '',
        year: extractedValues.year || '',
        isMonthly: extractedValues.isMonthly,
        confidence: extractedValues.confidence || '',
        isRecurring: extractedValues.isRecurring
      };
    }

    // For lohn_gehaltsbescheinigungen, map generic values to specific value IDs
    if (documentType === 'lohn_gehaltsbescheinigungen') {
      // Map based on the value ID
      const valueMapping: Record<string, any> = {
        'monthlynetsalary': {
          net_value: extractedValues.net_value || '',
          year: extractedValues.year || '',
          month: extractedValues.month || '',
          isMonthly: extractedValues.isMonthly,
          confidence: extractedValues.confidence || ''
        },
        'prior_year_earning': {
          gross_value: extractedValues.gross_value || '',
          year: extractedValues.year || '',
          month: extractedValues.month || '',
          isMonthly: extractedValues.isMonthly,
          confidence: extractedValues.confidence || ''
        },
        'prior_year': {
          year: extractedValues.year || '',
          confidence: extractedValues.confidence || ''
        },
        'wheinachtsgeld_last12': {
          gross_value: extractedValues.gross_value || '',
          year: extractedValues.year || '',
          month: extractedValues.month || '',
          isMonthly: extractedValues.isMonthly,
          confidence: extractedValues.confidence || ''
        },
        'urlaubsgeld_last12': {
          gross_value: extractedValues.gross_value || '',
          year: extractedValues.year || '',
          month: extractedValues.month || '',
          isMonthly: extractedValues.isMonthly,
          confidence: extractedValues.confidence || ''
        },
        'otherincome_last12': {
          gross_value: extractedValues.gross_value || '',
          year: extractedValues.year || '',
          month: extractedValues.month || '',
          isMonthly: extractedValues.isMonthly,
          confidence: extractedValues.confidence || ''
        }
      };

      return valueMapping[valueId] || null;
    }

    // For other document types, try to map generic fields
    return {
      amount: extractedValues.amount || '',
      year: extractedValues.year || '',
      month: extractedValues.month || '',
      isMonthly: extractedValues.isMonthly,
      confidence: extractedValues.confidence || '',
      isRecurring: extractedValues.isRecurring
    };
  }

  /**
   * Create empty value structure for missing values
   */
  private createEmptyValueStructure(valueId: string, documentType: string): any {
    const baseStructure = {
      year: '',
      month: '',
      isMonthly: null,
      confidence: '',
      isRecurring: null
    };

    // Add the appropriate value field based on the value ID
    if (valueId.includes('net') || valueId === 'monthlynetsalary' || valueId === 'otheremploymentmonthlynetincome') {
      return { ...baseStructure, net_value: '' };
    } else if (valueId.includes('gross') || valueId === 'prior_year_earning' || valueId.includes('wheinachtsgeld') || valueId.includes('urlaubsgeld') || valueId.includes('otherincome')) {
      return { ...baseStructure, gross_value: '' };
    } else if (valueId.includes('amount') || valueId === 'werbungskosten' || valueId === 'kinderbetreuungskosten' || valueId === 'unterhaltszahlungen') {
      return { ...baseStructure, amount: '' };
    } else if (valueId === 'prior_year') {
      return { year: '', confidence: '' };
    } else {
      return { ...baseStructure, amount: '' };
    }
  }

  /**
   * Determine the appropriate value field for a value ID
   */
  private getValueFieldForValueId(valueId: string, value: any): Record<string, any> {
    // Map value IDs to their appropriate field names
    const valueFieldMapping: Record<string, string> = {
      'monthlynetsalary': 'net_value',
      'prior_year_earning': 'gross_value',
      'wheinachtsgeld_last12': 'gross_value',
      'urlaubsgeld_last12': 'gross_value',
      'wheinachtsgeld_next12_net': 'net_value',
      'urlaubsgeld_next12_net': 'net_value',
      'otheremploymentmonthlynetincome': 'net_value',
      'otherincome_last12': 'gross_value',
      'werbungskosten': 'amount',
      'kinderbetreuungskosten': 'amount',
      'unterhaltszahlungen': 'amount'
    };

    const fieldName = valueFieldMapping[valueId] || 'amount';
    return { [fieldName]: value };
  }

  /**
   * Update extraction structure with extraction results
   */
  private updateStructureWithResults(results: Map<string, ExtractionResult>): ExtractionStructure {
    if (!this.extractionStructure) {
      return {};
    }

    const updatedStructure = JSON.parse(JSON.stringify(this.extractionStructure));

    // Update each file with its extraction results
    for (const [fileKey, result] of Array.from(results.entries())) {
      // Parse fileKey more intelligently
      // Format: personId_documentType_fileName
      // But personId and documentType can contain underscores, so we need to be smarter
      
        // Processing fileKey: ${fileKey}
      
      // Find the person ID (either 'main_applicant' or a UUID)
      let personId: string;
      let remainingKey: string;
      
      if (fileKey.startsWith('main_applicant_')) {
        personId = 'main_applicant';
        remainingKey = fileKey.substring('main_applicant_'.length);
      } else {
        // It's a UUID followed by underscore
        const firstUnderscoreIndex = fileKey.indexOf('_');
        if (firstUnderscoreIndex !== -1) {
          personId = fileKey.substring(0, firstUnderscoreIndex);
          remainingKey = fileKey.substring(firstUnderscoreIndex + 1);
        } else {
          console.error(`❌ Invalid fileKey format: ${fileKey}`);
          continue;
        }
      }
      
      // Now parse documentType and fileName from remainingKey
      // Document types we know: werbungskosten_nachweis, lohn_gehaltsbescheinigungen, etc.
      let documentType: string = '';
      let fileName: string = '';
      
      if (remainingKey.startsWith('werbungskosten_nachweis_')) {
        documentType = 'werbungskosten_nachweis';
        fileName = remainingKey.substring('werbungskosten_nachweis_'.length);
      } else if (remainingKey.startsWith('lohn_gehaltsbescheinigungen_')) {
        documentType = 'lohn_gehaltsbescheinigungen';
        fileName = remainingKey.substring('lohn_gehaltsbescheinigungen_'.length);
      } else if (remainingKey.startsWith('kinderbetreuungskosten_nachweis_')) {
        documentType = 'kinderbetreuungskosten_nachweis';
        fileName = remainingKey.substring('kinderbetreuungskosten_nachweis_'.length);
      } else {
        // Try to find the document type by looking for known patterns
        const knownDocTypes = [
          'einkommenssteuerbescheid',
          'einkommenssteuererklaerung', 
          'rentenbescheid',
          'arbeitslosengeldbescheid',
          'unterhaltsverpflichtung_nachweis',
          'unterhaltsleistungen_nachweis',
          'guv_euer_nachweis'
        ];
        
        let found = false;
        for (const docType of knownDocTypes) {
          if (remainingKey.startsWith(docType + '_')) {
            documentType = docType;
            fileName = remainingKey.substring(docType.length + 1);
            found = true;
            break;
          }
        }
        
        if (!found) {
          console.error(`❌ Unknown document type in fileKey: ${fileKey}`);
          continue;
        }
      }
      
        // PersonId: ${personId}, DocumentType: ${documentType}, FileName: ${fileName}
      
      if (updatedStructure[personId] && updatedStructure[personId][documentType] && updatedStructure[personId][documentType][fileName]) {
        const fileData = (updatedStructure[personId][documentType] as any)[fileName];
        
        // Found file data for ${fileName}
        
        // Update file-level metadata
        fileData.confidence = result.success ? result.confidence.toString() : '0';
        fileData.methodUsed = result.methodUsed;
        
        // Updated file metadata
        
        // Update individual values
        // Updating file ${fileName} with extracted values
        
        for (const [valueId, valueData] of Object.entries(result.extractedValues)) {
          // Skip debug_info as it's not a value we want to store
          if (valueId === 'debug_info') {
            continue;
          }
          
          // Update value in file structure
          
          if (fileData[valueId]) {
            // Merge the extracted data with the existing structure
            fileData[valueId] = {
              ...(fileData[valueId] as any),
              ...valueData
            };
          } else {
            // Create the value structure if it doesn't exist (this will handle monthlynetsalary)
            fileData[valueId] = valueData;
          }
        }
        
      } else {
        console.log(`❌ Could not find file data for ${fileKey}`);
      }
    }

    // Mark document types as complete if all files have been processed
    for (const [personId, personData] of Object.entries(updatedStructure)) {
      for (const [documentType, documentData] of Object.entries(personData as Record<string, any>)) {
        if (documentData.numberOfFiles > 0) {
          // Check if all files in this document type have been processed
          let allProcessed = true;
          for (const [fileName, fileData] of Object.entries(documentData as Record<string, any>)) {
            if (fileName !== 'numberOfFiles' && fileName !== 'relevantValues' && fileName !== 'extractionComplete') {
              if (!fileData.confidence || fileData.confidence === '0') {
                allProcessed = false;
                break;
              }
            }
          }
          documentData.extractionComplete = allProcessed;
        }
      }
    }

    return updatedStructure;
  }

  /**
   * Save updated extraction structure to database
   */
  private async saveUpdatedStructure(updatedStructure: ExtractionStructure): Promise<void> {
    try {
      // Saving updated extraction structure to database
      
      const { error } = await supabase
        .from('applications')
        .update({
          extraction_structure: updatedStructure,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.applicationId);

      if (error) throw error;

      // Updated extraction structure saved to database successfully
    } catch (error) {
      console.error('❌ Error saving updated extraction structure:', error);
      throw error;
    }
  }

  /**
   * Get extraction progress summary
   */
  async getExtractionProgress(): Promise<{
    totalFiles: number;
    processedFiles: number;
    completedDocuments: number;
    totalDocuments: number;
    progressPercentage: number;
  }> {
    if (!this.extractionStructure) {
      await this.loadExtractionStructure();
    }

    if (!this.extractionStructure) {
      return {
        totalFiles: 0,
        processedFiles: 0,
        completedDocuments: 0,
        totalDocuments: 0,
        progressPercentage: 0
      };
    }

    let totalFiles = 0;
    let processedFiles = 0;
    let completedDocuments = 0;
    let totalDocuments = 0;

    for (const [personId, personData] of Object.entries(this.extractionStructure)) {
      for (const [documentType, documentData] of Object.entries(personData as Record<string, any>)) {
        if (documentData.numberOfFiles > 0) {
          totalDocuments++;
          totalFiles += documentData.numberOfFiles;
          
          if (documentData.extractionComplete) {
            completedDocuments++;
            processedFiles += documentData.numberOfFiles;
          } else {
            // Count partially processed files
            for (const [fileName, fileData] of Object.entries(documentData as Record<string, any>)) {
              if (fileName !== 'numberOfFiles' && fileName !== 'relevantValues' && fileName !== 'extractionComplete') {
                if (fileData.confidence && fileData.confidence !== '0') {
                  processedFiles++;
                }
              }
            }
          }
        }
      }
    }

    const progressPercentage = totalFiles > 0 ? Math.round((processedFiles / totalFiles) * 100) : 0;

    return {
      totalFiles,
      processedFiles,
      completedDocuments,
      totalDocuments,
      progressPercentage
    };
  }
}
