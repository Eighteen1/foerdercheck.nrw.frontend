/**
 * Document Value Extraction Service
 * Extracts specific values from uploaded documents using OCR and pattern matching
 */

export interface ExtractedValue {
  value: number;
  confidence: number;
  unit: string;
  extraction_method: string;
  raw_text: string;
  position_in_document?: string;
}

export interface DocumentValueResult {
  success: boolean;
  extracted_values: { [key: string]: ExtractedValue };
  document_type: string;
  confidence_score: number;
  message: string;
  raw_text: string;
}

export interface DocumentValueValidationRequest {
  extracted_value: number;
  user_entered_value: number;
  document_type: string;
  tolerance_percentage?: number;
}

export interface DocumentValueValidationResponse {
  is_valid: boolean;
  discrepancy_percentage: number;
  recommended_value: number;
  validation_message: string;
}

export interface SupportedDocumentType {
  type: string;
  name: string;
  extractable_values: string[];
}

export interface SupportedTypesResponse {
  supported_types: SupportedDocumentType[];
  total_count: number;
}

export interface EnhancedDocumentValueResult {
  success: boolean;
  extracted_values: { [key: string]: ExtractedValue };
  document_type: string;
  confidence_score: number;
  message: string;
  raw_text: string;
  extraction_methods_used: string[];
  fallback_reasons: string[];
  document_ai_available: boolean;
  recommended_action: string;
}

export enum DocumentType {
  WERBUNGSKOSTEN_NACHWEIS = "werbungskosten_nachweis",
  LOHN_GEHALTSBESCHEINIGUNG = "lohn_gehaltsbescheinigung",
  EINKOMMENSSTEUERBESCHEID = "einkommenssteuerbescheid",
  RENTENBESCHEID = "rentenbescheid",
  ARBEITSLOSENGELD_BESCHEID = "arbeitslosengeld_bescheid",
  KINDERGELD_BESCHEID = "kindergeld_bescheid",
  WOHNGELD_BESCHEID = "wohngeld_bescheid",
  UNTERHALT_BESCHEID = "unterhalt_bescheid",
  VERSICHERUNG_BESCHEID = "versicherung_bescheid",
  SPAREN_ANLAGEN = "sparen_anlagen",
  SCHULDEN_NACHWEIS = "schulden_nachweis"
}

class DocumentValueService {
  private baseUrl: string;

  constructor() {
    // Force HTTP for localhost to avoid SSL issues
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
    this.baseUrl = backendUrl.includes('localhost') ? backendUrl.replace('https://', 'http://') : backendUrl;
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
    token?: string,
    timeoutMs: number = 120000 // 2 minutes timeout for OCR operations
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeoutMs / 1000} seconds. OCR processing may take longer for large or complex documents.`);
      }
      throw error;
    }
  }

  /**
   * Extract values from uploaded document
   */
  async extractDocumentValues(
    file: File,
    documentType: string,
    valueType: string = 'total_amount',
    token?: string
  ): Promise<DocumentValueResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    formData.append('value_type', valueType);

    return this.makeFormRequest<DocumentValueResult>(
      '/api/document-values/extract',
      formData,
      token
    );
  }

  /**
   * Validate extracted value against user input
   */
  async validateExtractedValue(
    request: DocumentValueValidationRequest,
    token?: string
  ): Promise<DocumentValueValidationResponse> {
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return this.makeRequest<DocumentValueValidationResponse>(
      '/api/document-values/validate',
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
  async getSupportedDocumentTypes(): Promise<SupportedTypesResponse> {
    return this.makeRequest('/api/document-values/supported-types');
  }

  /**
   * Debug storage access without OCR processing
   */
  async debugStorageAccess(
    documentPath: string,
    token?: string
  ): Promise<any> {
    const formData = new FormData();
    formData.append('document_path', documentPath);

    return this.makeFormRequest(
      '/api/document-values/debug-storage',
      formData,
      token
    );
  }

  /**
   * Comprehensive extraction using OCR only (no Document AI fallback)
   * Extracts all relevant values for the given document type
   */
  async comprehensiveExtractValueFromStorage(
    documentPath: string,
    documentType: string,
    accessToken: string
  ): Promise<any> {
    const formData = new FormData();
    formData.append('document_path', documentPath);
    formData.append('document_type', documentType);

    const response = await fetch(`${this.baseUrl}/api/document-values/comprehensive-extract`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Test comprehensive extraction without authentication
   */
  async testComprehensiveExtractValueFromStorage(
    documentPath: string,
    documentType: string
  ): Promise<any> {
    const formData = new FormData();
    formData.append('document_path', documentPath);
    formData.append('document_type', documentType);

    const response = await fetch(`${this.baseUrl}/api/document-values/test-comprehensive-extract`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Debug text extraction to see raw OCR output
   */
  async debugTextExtraction(
    documentPath: string,
    token?: string
  ): Promise<any> {
    const formData = new FormData();
    formData.append('document_path', documentPath);

    return this.makeFormRequest(
      '/api/document-values/debug-text-extraction',
      formData,
      token
    );
  }

  /**
   * Check service health
   */
  async checkHealth(): Promise<{ status: string; service: string; supported_document_types: number; version: string }> {
    return this.makeRequest('/api/document-values/health');
  }

  /**
   * Extract value from document stored in Supabase storage
   */
  async extractValueFromStorage(
    documentPath: string,
    documentType: string,
    valueType: string = 'total_amount',
    token?: string
  ): Promise<DocumentValueResult> {
    const formData = new FormData();
    formData.append('document_path', documentPath);
    formData.append('document_type', documentType);
    formData.append('value_type', valueType);

    return this.makeFormRequest<DocumentValueResult>(
      '/api/document-values/extract-from-storage',
      formData,
      token
    );
  }

  /**
   * Test extraction from storage without authentication (for debugging)
   */
  async testExtractValueFromStorage(
    documentPath: string,
    documentType: string,
    valueType: string = 'total_amount'
  ): Promise<DocumentValueResult> {
    const formData = new FormData();
    formData.append('document_path', documentPath);
    formData.append('document_type', documentType);
    formData.append('value_type', valueType);

    return this.makeFormRequest<DocumentValueResult>(
      '/api/document-values/test-extract-from-storage',
      formData
    );
  }

  /**
   * Get the primary value from extracted data
   */
  getPrimaryValue(extractedValues: { [key: string]: ExtractedValue }): number | null {
    // Priority order for different value types
    const priorityOrder = [
      'total_amount',
      'gross_salary',
      'net_salary',
      'monthly_income',
      'taxable_income',
      'pension_amount',
      'benefit_amount',
      'child_benefit_amount',
      'housing_benefit_amount',
      'maintenance_amount',
      'insurance_amount',
      'savings_amount',
      'debt_amount'
    ];

    for (const key of priorityOrder) {
      if (extractedValues[key]) {
        return extractedValues[key].value;
      }
    }

    // If no priority value found, return the first available value
    const firstValue = Object.values(extractedValues)[0];
    return firstValue ? firstValue.value : null;
  }

  /**
   * Format currency value for display
   */
  formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) return 'N/A';
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

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size too large. Please upload files smaller than 50MB.'
      };
    }

    return { valid: true };
  }

  /**
   * Get document type display name
   */
  getDocumentTypeDisplayName(documentType: string): string {
    return documentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Get value type display name
   */
  getValueTypeDisplayName(valueType: string): string {
    const displayNames: { [key: string]: string } = {
      'total_amount': 'Gesamtbetrag',
      'gross_salary': 'Bruttolohn',
      'net_salary': 'Nettolohn',
      'monthly_income': 'Monatliches Einkommen',
      'taxable_income': 'Zu versteuerndes Einkommen',
      'pension_amount': 'Rente',
      'benefit_amount': 'Leistungsbetrag',
      'child_benefit_amount': 'Kindergeld',
      'housing_benefit_amount': 'Wohngeld',
      'maintenance_amount': 'Unterhalt',
      'insurance_amount': 'Versicherungsbetrag',
      'savings_amount': 'Sparbetrag',
      'debt_amount': 'Schuldenbetrag',
      'year': 'Jahr',
      'period': 'Zeitraum'
    };

    return displayNames[valueType] || valueType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Enhanced extraction with OCR first, then Document AI if needed (cost-effective)
   */
  async enhancedExtractValueFromStorage(
    documentPath: string,
    documentType: string,
    valueType: string = "total_amount",
    accessToken: string,
    forceMethod?: string
  ): Promise<EnhancedDocumentValueResult> {
    try {
      const formData = new FormData();
      formData.append('document_path', documentPath);
      formData.append('document_type', documentType);
      formData.append('value_type', valueType);
      if (forceMethod) {
        formData.append('force_method', forceMethod);
      }

      const response = await fetch(`${this.baseUrl}/api/document-values/enhanced-extract-from-storage`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData
      });

      if (!response.ok) {
        let errorText;
        try {
          errorText = await response.text();
        } catch {
          errorText = `HTTP ${response.status}`;
        }
        throw new Error(`Enhanced extraction failed: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Enhanced extraction error:', error);
      throw error;
    }
  }

  /**
   * Test enhanced extraction without authentication
   */
  async testEnhancedExtractValueFromStorage(
    documentPath: string,
    documentType: string,
    valueType: string = "total_amount",
    forceMethod?: string
  ): Promise<EnhancedDocumentValueResult> {
    try {
      const formData = new FormData();
      formData.append('document_path', documentPath);
      formData.append('document_type', documentType);
      formData.append('value_type', valueType);
      if (forceMethod) {
        formData.append('force_method', forceMethod);
      }

      const response = await fetch(`${this.baseUrl}/api/document-values/test-enhanced-extract-from-storage`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        let errorText;
        try {
          errorText = await response.text();
        } catch {
          errorText = `HTTP ${response.status}`;
        }
        throw new Error(`Test enhanced extraction failed: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Test enhanced extraction error:', error);
      throw error;
    }
  }

  /**
   * Check enhanced service health
   */
  async checkEnhancedHealth(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/document-values/enhanced-health`);
      if (!response.ok) {
        throw new Error(`Enhanced health check failed: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Enhanced health check error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const documentValueService = new DocumentValueService();
export default documentValueService;
