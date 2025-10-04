/**
 * OCR Service for document processing and income verification
 */

export interface ExtractedIncomeData {
  gross_salary?: number;
  net_salary?: number;
  monthly_income?: number;
  yearly_income?: number;
  employer_name?: string;
  employee_name?: string;
  period?: string;
  raw_text?: string;
}

export interface ValidationResult {
  is_valid: boolean;
  discrepancy_percentage: number;
  recommended_value: number;
  validation_message: string;
}

export interface OCRProcessResponse {
  success: boolean;
  extracted_data: ExtractedIncomeData;
  validation_result: ValidationResult;
  confidence_score: number;
  extraction_method: string;
  message: string;
}

export interface OCRValidationRequest {
  extracted_value: number;
  user_entered_value: number;
  document_type: string;
}

export interface OCRValidationResponse {
  is_valid: boolean;
  discrepancy_percentage: number;
  recommended_value: number;
  validation_message: string;
}

export interface SupportedDocumentType {
  type: string;
  name: string;
  description: string;
  supported_formats: string[];
}

export interface OCREngine {
  available: boolean;
  language: string;
  accuracy: string;
}

export interface OCRHealthResponse {
  status: string;
  paddle_ocr_available: boolean;
  tesseract_available: boolean;
  supported_languages: string[];
  version: string;
}

export interface BatchProcessResult {
  filename: string;
  success: boolean;
  extracted_data?: {
    gross_salary?: number;
    net_salary?: number;
    monthly_income?: number;
    yearly_income?: number;
    confidence_score: number;
  };
  error?: string;
}

export interface BatchProcessResponse {
  success: boolean;
  processed_count: number;
  failed_count: number;
  results: BatchProcessResult[];
}

class OCRService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  private async makeFormRequest<T>(
    endpoint: string,
    formData: FormData,
    token?: string
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Process a single document with OCR
   */
  async processDocument(
    file: File,
    documentType: string = 'lohn_gehaltsbescheinigungen',
    userEnteredIncome?: number,
    token?: string
  ): Promise<OCRProcessResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    
    if (userEnteredIncome !== undefined) {
      formData.append('user_entered_income', userEnteredIncome.toString());
    }

    return this.makeFormRequest<OCRProcessResponse>(
      '/api/ocr/process-document',
      formData,
      token
    );
  }

  /**
   * Validate extracted income data against user input
   */
  async validateIncome(
    request: OCRValidationRequest,
    token?: string
  ): Promise<OCRValidationResponse> {
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return this.makeRequest<OCRValidationResponse>(
      '/api/ocr/validate-income',
      {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      }
    );
  }

  /**
   * Get supported document types
   */
  async getSupportedDocumentTypes(): Promise<{
    supported_types: SupportedDocumentType[];
    ocr_engines: {
      paddle_ocr: OCREngine;
      tesseract: OCREngine;
    };
  }> {
    return this.makeRequest('/api/ocr/supported-document-types');
  }

  /**
   * Process multiple documents in batch
   */
  async batchProcessDocuments(
    files: File[],
    documentType: string = 'lohn_gehaltsbescheinigungen',
    token?: string
  ): Promise<BatchProcessResponse> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('document_type', documentType);

    return this.makeFormRequest<BatchProcessResponse>(
      '/api/ocr/batch-process',
      formData,
      token
    );
  }

  /**
   * Check OCR service health
   */
  async checkHealth(): Promise<OCRHealthResponse> {
    return this.makeRequest('/api/ocr/health');
  }

  /**
   * Debug OCR processing with detailed information
   */
  async debugProcessDocument(
    file: File,
    documentType: string = 'lohn_gehaltsbescheinigungen'
  ): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);

    return this.makeFormRequest(
      '/api/ocr/debug-process',
      formData
    );
  }

  /**
   * Format currency value for display
   */
  formatCurrency(value: number | undefined): string {
    if (value === undefined) return 'N/A';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(value);
  }

  /**
   * Get confidence level color class
   */
  getConfidenceColor(score: number): string {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  }

  /**
   * Get confidence badge variant
   */
  getConfidenceBadge(score: number): 'default' | 'secondary' | 'destructive' | 'outline' {
    if (score >= 0.8) return 'default';
    if (score >= 0.6) return 'secondary';
    return 'destructive';
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/tiff',
      'image/bmp'
    ];

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Unsupported file type. Please upload PDF, PNG, JPG, JPEG, TIFF, or BMP files.'
      };
    }

    const maxSize = 50 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size too large. Please upload files smaller than 10MB.'
      };
    }

    return { valid: true };
  }

  /**
   * Extract the most relevant income value from extracted data
   */
  getPrimaryIncomeValue(extractedData: ExtractedIncomeData): number | null {
    // Priority order: monthly_income > net_salary > gross_salary
    if (extractedData.monthly_income) return extractedData.monthly_income;
    if (extractedData.net_salary) return extractedData.net_salary;
    if (extractedData.gross_salary) return extractedData.gross_salary;
    return null;
  }

  /**
   * Calculate discrepancy between extracted and user-entered values
   */
  calculateDiscrepancy(extracted: number, userEntered: number): {
    absolute: number;
    percentage: number;
  } {
    const absolute = Math.abs(extracted - userEntered);
    const percentage = (absolute / userEntered) * 100;
    return { absolute, percentage };
  }
}

// Export singleton instance
export const ocrService = new OCRService();
export default ocrService;
