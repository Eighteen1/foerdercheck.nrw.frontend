// Common validation helper functions

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPostalCode = (postalCode: string): boolean => {
  return /^\d{5}$/.test(postalCode);
};

export const isValidDate = (date: string): boolean => {
  const inputDate = new Date(date);
  const now = new Date();
  const minDate = new Date(now.getFullYear() - 20, now.getMonth(), now.getDate());
  const maxDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  
  return inputDate >= minDate && inputDate <= maxDate;
};

export const isValidFutureDate = (date: string): boolean => {
  if (!date) return false;
  
  const inputDate = new Date(date);
  const now = new Date();
  // Calculate 12 months (1 year) in the past and future from today
  const minDate = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
  const maxDate = new Date(now.getFullYear(), now.getMonth() + 12, now.getDate());

 return inputDate >= minDate && inputDate <= maxDate;
};

export const isValidEmploymentStartDate = (date: string): boolean => {
  if (!date) return false;
  
  const inputDate = new Date(date);
  const now = new Date();
  const minDate = new Date(now.getFullYear() - 100, now.getMonth(), now.getDate());
  
  return inputDate <= now && inputDate >= minDate;
};

export const isValidContractEndDate = (date: string): boolean => {

  const inputDate = new Date(date);
  const now = new Date();
  const minDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const maxDate = new Date(now.getFullYear() + 100, now.getMonth(), now.getDate());
  
  return inputDate >= minDate && inputDate <= maxDate;
};

export const isValidAreaValue = (value: string | number): boolean => {
  if (value === null || value === undefined) return false;
  
  if (typeof value === 'number') {
    return !isNaN(value) && value >= 0;
  }
  
  if (typeof value === 'string') {
    if (!value || value.trim() === '') return false;
    const numericValue = parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.'));
    return !isNaN(numericValue) && numericValue >= 0;
  }
  
  return false;
};

export const parseGermanNumber = (value: string | number): number => {
  if (!value) return 0;
  
  if (typeof value === 'number') {
    return value;
  }
  
  // Debug: Log the parsing steps
  console.log('DEBUG - parseGermanNumber input:', value, 'type:', typeof value);
  
  const step1 = value.replace(/[^\d.,]/g, '');
  console.log('DEBUG - After removing non-digits, dots, commas:', step1);
  
  const step2 = step1.replace(',', '.');
  console.log('DEBUG - After replacing comma with dot:', step2);
  
  const result = parseFloat(step2) || 0;
  console.log('DEBUG - Final parseFloat result:', result);
  
  return result;
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(value / 100);
};

export const formatCurrencyFromEuros = (value: number): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(value);
};

export const getNumericValue = (value: string | number): number => {
  if (typeof value === 'number') {
    return value;
  }
  // Use proper currency parsing that preserves decimal points
  const cleanAmount = value.replace(/[€\s]/g, '');
  const withoutThousands = cleanAmount.replace(/\./g, '');
  const withDotDecimal = withoutThousands.replace(',', '.');
  return parseFloat(withDotDecimal) || 0;
};

// Validation result types
export interface ValidationError {
  field: string;
  message: string;
  section?: string;
}

export interface ValidationSection {
  id: string;
  title: string;
  isExpanded: boolean;
  errors: string[];
  warnings: string[];
  success: boolean;
  // New fields for enhanced financial validation sections
  calculations?: string[];
  successMessages?: string[];
  navigationButtons?: NavigationButton[];
}

export interface NavigationButton {
  label: string;
  action: string; // Form route or section ID
  type?: 'primary' | 'secondary';
}

export interface ValidationResult {
  sections: ValidationSection[];
  overallSuccess: boolean;
  hasErrors: boolean;
  hasWarnings: boolean;
}

// Helper function to create validation sections
export const createValidationSection = (
  id: string,
  title: string,
  errors: string[] = [],
  warnings: string[] = []
): ValidationSection => ({
  id,
  title,
  isExpanded: false, // Always start collapsed, regardless of errors/warnings
  errors,
  warnings,
  success: errors.length === 0 && warnings.length === 0
});

// Helper function to create enhanced validation sections with calculations
export const createEnhancedValidationSection = (
  id: string,
  title: string,
  calculations: string[] = [],
  errors: string[] = [],
  warnings: string[] = [],
  successMessages: string[] = [],
  navigationButtons: NavigationButton[] = []
): ValidationSection => ({
  id,
  title,
  isExpanded: false,
  errors,
  warnings,
  calculations,
  successMessages,
  navigationButtons,
  success: errors.length === 0 && warnings.length === 0
});

// Helper function to validate required fields
export const validateRequiredField = (
  value: any,
  fieldName: string,
  errors: string[]
): void => {
  if (value === null || value === undefined || value === '') {
    errors.push(`${fieldName} ist erforderlich`);
  }
};

// Helper function to validate email fields
export const validateEmailField = (
  value: any,
  fieldName: string,
  errors: string[]
): void => {
  if (!value || (typeof value === 'string' && value.trim() === '') || value === null || value === undefined) {
    errors.push(`${fieldName} ist erforderlich`);
  } else if (typeof value === 'string' && !isValidEmail(value)) {
    errors.push(`${fieldName} ist ungültig`);
  }
};

// Helper function to validate postal code fields
export const validatePostalCodeField = (
  value: any,
  fieldName: string,
  errors: string[]
): void => {
  if (!value || (typeof value === 'string' && value.trim() === '') || value === null || value === undefined) {
    errors.push(`${fieldName} ist erforderlich`);
  } else if (typeof value === 'string' && !isValidPostalCode(value)) {
    errors.push(`${fieldName} muss aus genau 5 Ziffern bestehen`);
  }
};

// Helper function to validate date fields
export const validateDateField = (
  value: any,
  fieldName: string,
  errors: string[],
  validationType: 'any' | 'future' | 'employment' | 'contract' = 'any'
): void => {
  if (!value || (typeof value === 'string' && value.trim() === '') || value === null || value === undefined) {
    errors.push(`${fieldName} ist erforderlich`);
  } else if (typeof value === 'string') {
    let isValid = false;
    switch (validationType) {
      case 'future':
        isValid = isValidFutureDate(value);
        break;
      case 'employment':
        isValid = isValidEmploymentStartDate(value);
        break;
      case 'contract':
        isValid = isValidContractEndDate(value);
        break;
      default:
        isValid = isValidDate(value);
    }
    
    if (!isValid) {
      errors.push(`${fieldName} ist ungültig`);
    }
  }
};

// Helper function to validate currency fields
export const validateCurrencyField = (
  value: any,
  fieldName: string,
  errors: string[],
  minValue: number = 0
): void => {
  if (value === null || value === undefined || value === '') {
    errors.push(`${fieldName} ist erforderlich`);
  } else {
    const stringValue = typeof value === 'string' ? value : String(value);
    const numericValue = parseGermanNumber(stringValue);
    if (isNaN(numericValue) || numericValue < minValue) {
      errors.push(`${fieldName} muss ein gültiger Betrag sein`);
    }
  }
};

// Helper function to validate area fields
export const validateAreaField = (
  value: any,
  fieldName: string,
  errors: string[]
): void => {
  if (!value || value === null || value === undefined) {
    errors.push(`${fieldName} ist erforderlich`);
  } else if (typeof value === 'string' && value.trim() === '') {
    errors.push(`${fieldName} ist erforderlich`);
  } else if (typeof value === 'string' && !isValidAreaValue(value)) {
    errors.push(`${fieldName} muss ein gültiger Flächenwert sein`);
  } else if (typeof value === 'number' && (isNaN(value) || value < 0)) {
    errors.push(`${fieldName} muss ein gültiger Flächenwert sein`);
  }
}; 