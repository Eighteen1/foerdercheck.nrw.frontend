/**
 * Formats a number for display in German currency format
 * @param amount The amount to format (can be number, string, or null)
 * @returns Formatted string with thousands separators, decimal comma, and Euro symbol
 */
export const formatCurrencyForDisplay = (amount: string | number | null): string => {
  if (amount === null || amount === undefined) return '';
  // Convert to string and remove any existing formatting
  const numStr = amount.toString().replace(/[^\d,.-]/g, '');
  // Split into integer and decimal parts
  const parts = numStr.split('.');
  // Format integer part with thousands separators
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  // Get decimal part (if exists)
  const decimalPart = parts[1] ? ',' + parts[1].padEnd(2, '0').slice(0, 2) : ',00';
  return integerPart + decimalPart + ' €';
};

/**
 * Safely converts a numeric value to string, preserving 0 values
 * @param value The value to convert (can be number, string, or null)
 * @returns String representation of the value, or empty string if null/undefined
 */
export const safeNumericToString = (value: string | number | null): string => {
  if (value === null || value === undefined) return '';
  return value.toString();
};

/**
 * Safely formats a currency value for display, preserving 0 values
 * @param value The value to format (can be number, string, or null)
 * @returns Formatted currency string or empty string if null/undefined
 */
export const safeFormatCurrencyForDisplay = (value: string | number | null): string => {
  if (value === null || value === undefined) return '';
  return formatCurrencyForDisplay(value);
};

/**
 * Formats a currency string for database storage
 * @param amount The amount to format (string with Euro symbol and German formatting)
 * @returns Number string with dot as decimal separator, ready for database storage
 */
export const formatCurrencyForDatabase = (amount: string): string | null => {
  if (amount === null || amount === undefined) return null;
  if (amount === '') return null;
  // Remove Euro symbol and any whitespace
  const cleanAmount = amount.replace(/[€\s]/g, '');
  // Remove all dots (thousands separators)
  const withoutThousands = cleanAmount.replace(/\./g, '');
  // Replace comma with dot for decimal separator
  const result = withoutThousands.replace(',', '.');
  // Return null if the result is empty or just a dot
  return result === '' || result === '.' ? null : result;
};

/**
 * Safely formats a currency value for database storage, preserving 0 values
 * @param amount The amount to format (string with Euro symbol and German formatting)
 * @returns Number string with dot as decimal separator, or "0" for zero values
 */
export const safeFormatCurrencyForDatabase = (amount: string): string | null => {
  if (amount === null || amount === undefined) return null;
  if (amount === '') return null;
  
  // Remove Euro symbol and any whitespace
  const cleanAmount = amount.replace(/[€\s]/g, '');
  // Remove all dots (thousands separators)
  const withoutThousands = cleanAmount.replace(/\./g, '');
  // Replace comma with dot for decimal separator
  const result = withoutThousands.replace(',', '.');
  
  // If the result is empty or just a dot, return null
  if (result === '' || result === '.') return null;
  
  // If the result is "0" or "0.0" or "0.00", return "0"
  if (result === '0' || result === '0.0' || result === '0.00') return '0';
  
  return result;
};

/**
 * Converts a database currency value to a number
 * @param amount The amount from the database (string or number)
 * @returns Number value or null if invalid
 */
export const parseCurrencyFromDatabase = (amount: string | number | null): number | null => {
  if (!amount) return null;
  const parsed = parseFloat(amount.toString());
  return isNaN(parsed) ? null : parsed;
};

/**
 * Safely converts a numeric string to database value, preserving 0
 * @param value The value to convert (string, number, or null)
 * @returns String representation for database, or null if empty/invalid
 */
export const safeNumericToDatabase = (value: string | number | null): string | null => {
  if (value === null || value === undefined) return null;
  if (value === '') return null;
  
  const strValue = value.toString().trim();
  if (strValue === '') return null;
  
  // Try to parse as number
  const numValue = parseFloat(strValue);
  if (isNaN(numValue)) return null;
  
  // Return "0" for zero values, otherwise return the number as string
  return numValue === 0 ? '0' : numValue.toString();
};

/**
 * Converts an area value with German comma formatting to database format
 * @param value The area value with comma decimal separator (e.g., "123,45")
 * @returns String with dot decimal separator for database storage, or null if invalid
 */
export const safeAreaToDatabase = (value: string | number | null): string | null => {
  if (value === null || value === undefined) return null;
  if (value === '') return null;
  
  const strValue = value.toString().trim();
  if (strValue === '') return null;
  
  // Replace comma with dot for decimal separator
  const normalizedValue = strValue.replace(',', '.');
  
  // Try to parse as number
  const numValue = parseFloat(normalizedValue);
  if (isNaN(numValue)) return null;
  
  // Return "0" for zero values, otherwise return the number as string
  return numValue === 0 ? '0' : numValue.toString();
};

/**
 * Checks if an area value is valid and not empty
 * @param value The area value to check
 * @returns True if the value is valid and not empty
 */
export const isValidAreaValue = (value: string | number | null): boolean => {
  if (value === null || value === undefined) return false;
  if (value === '') return false;
  
  const strValue = value.toString().trim();
  if (strValue === '') return false;
  
  // Replace comma with dot for decimal separator
  const normalizedValue = strValue.replace(',', '.');
  
  // Try to parse as number
  const numValue = parseFloat(normalizedValue);
  return !isNaN(numValue);
};

/**
 * Converts a database area value to display format with comma separator
 * @param value The area value from database (with dot decimal separator)
 * @returns String with comma decimal separator for display, or empty string if null/undefined
 */
export const safeAreaToString = (value: string | number | null): string => {
  if (value === null || value === undefined) return '';
  if (value === '') return '';
  
  const strValue = value.toString().trim();
  if (strValue === '') return '';
  
  // Replace dot with comma for German decimal formatting
  return strValue.replace('.', ',');
}; 

/**
 * Checks if a currency value is empty or zero (0,00€)
 * @param value The currency value to check (string with Euro symbol and German formatting)
 * @returns True if the value is empty, null, undefined, or equals 0,00€
 */
export const isCurrencyEmptyOrZero = (value: string | null | undefined): boolean => {
  if (value === null || value === undefined || value === '') return true;
  
  // Remove Euro symbol and any whitespace
  const cleanAmount = value.replace(/[€\s]/g, '');
  // Remove all dots (thousands separators)
  const withoutThousands = cleanAmount.replace(/\./g, '');
  // Replace comma with dot for decimal separator
  const result = withoutThousands.replace(',', '.');
  
  // If the result is empty or just a dot, return true
  if (result === '' || result === '.') return true;
  
  // If the result is "0" or "0.0" or "0.00", return true
  if (result === '0' || result === '0.0' || result === '0.00') return true;
  
  return false;
}; 