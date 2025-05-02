/**
 * Formats a number for display in German currency format
 * @param amount The amount to format (can be number, string, or null)
 * @returns Formatted string with thousands separators, decimal comma, and Euro symbol
 */
export const formatCurrencyForDisplay = (amount: string | number | null): string => {
  if (!amount) return '';
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
 * Formats a currency string for database storage
 * @param amount The amount to format (string with Euro symbol and German formatting)
 * @returns Number string with dot as decimal separator, ready for database storage
 */
export const formatCurrencyForDatabase = (amount: string): string | null => {
  if (!amount) return null;
  // Remove Euro symbol and any whitespace
  const cleanAmount = amount.replace(/[€\s]/g, '');
  // Remove all dots (thousands separators)
  const withoutThousands = cleanAmount.replace(/\./g, '');
  // Replace comma with dot for decimal separator
  return withoutThousands.replace(',', '.');
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