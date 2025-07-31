import postcodeMap from './postcode_map.json';

export interface CostCategoryLimits {
  categoryA: number; // in cents
  categoryB: number; // in cents
  maxLimit: number; // in cents (same as categoryA)
}

export interface PostcodeValidationResult {
  costCategory: number;
  limits: CostCategoryLimits;
  infoMessage: string;
}

// Cost category limits in cents (multiply by 100 for EUR values)
const COST_CATEGORY_LIMITS: Record<number, CostCategoryLimits> = {
  1: {
    categoryA: 10000000, // 100,000 EUR
    categoryB: 5900000,  // 59,000 EUR
    maxLimit: 10000000   // 100,000 EUR
  },
  2: {
    categoryA: 11500000, // 115,000 EUR
    categoryB: 6900000,  // 69,000 EUR
    maxLimit: 11500000   // 115,000 EUR
  },
  3: {
    categoryA: 14800000, // 148,000 EUR
    categoryB: 8800000,  // 88,000 EUR
    maxLimit: 14800000   // 148,000 EUR
  },
  4: {
    categoryA: 18400000, // 184,000 EUR
    categoryB: 11000000, // 110,000 EUR
    maxLimit: 18400000   // 184,000 EUR
  }
};

// Default limits (category 4)
const DEFAULT_LIMITS: CostCategoryLimits = COST_CATEGORY_LIMITS[4];

export const getPostcodeValidation = (postcode: string): PostcodeValidationResult => {
  // Clean postcode (remove spaces, etc.)
  const cleanPostcode = postcode.replace(/\s/g, '');
  
  // Find postcode in mapping
  const postcodeData = (postcodeMap as Record<string, any>)[cleanPostcode];
  
  if (!postcodeData || !postcodeData.costCategory) {
    // No postcode found or not in mapping
    return {
      costCategory: 4, // Default to category 4
      limits: DEFAULT_LIMITS,
      infoMessage: "Die Obergrenze für das Grunddarlehen wird auf Grundlage des Standorts des Förderobjekts sowie der Haushaltsgröße und des Haushaltseinkommens festgelegt. Sie liegt zwischen 59.000 Euro und maximal 184.000 Euro."
    };
  }
  
  const costCategory = postcodeData.costCategory;
  const limits = COST_CATEGORY_LIMITS[costCategory] || DEFAULT_LIMITS;
  
  // Generate info message based on cost category
  let infoMessage: string;
  switch (costCategory) {
    case 1:
      infoMessage = `Die Obergrenze für das Grunddarlehen richtet sich nach dem angegebenen Standort ihres Förderobjekts (${cleanPostcode}) und beträgt bis zu 100.000 Euro für Familien der Einkommensgruppe A sowie bis zu 59.000 Euro für die Einkommensgruppe B. Ihre Einkommensgruppe ergibt sich aus Ihrer Haushaltsgröße und Ihrem Einkommen. Klicken Sie im persönlichen Bereich auf ‚Prüfen‘, um Ihre Einkommensgruppe zu ermitteln.`;
      break;
    case 2:
      infoMessage = `Die Obergrenze für das Grunddarlehen richtet sich nach dem angegebenen Standort ihres Förderobjekts (${cleanPostcode}) und beträgt bis zu 115.000 Euro für Familien der Einkommensgruppe A sowie bis zu 69.000 Euro für die Einkommensgruppe B. Ihre Einkommensgruppe ergibt sich aus Ihrer Haushaltsgröße und Ihrem Einkommen. Klicken Sie im persönlichen Bereich auf ‚Prüfen‘, um Ihre Einkommensgruppe zu ermitteln.`;
      break;
    case 3:
      infoMessage = `Die Obergrenze für das Grunddarlehen richtet sich nach dem angegebenen Standort ihres Förderobjekts (${cleanPostcode}) und beträgt bis zu 148.000 Euro für Familien der Einkommensgruppe A sowie bis zu 88.000 Euro für die Einkommensgruppe B. Ihre Einkommensgruppe ergibt sich aus Ihrer Haushaltsgröße und Ihrem Einkommen. Klicken Sie im persönlichen Bereich auf ‚Prüfen‘, um Ihre Einkommensgruppe zu ermitteln.`;
      break;
    case 4:
      infoMessage = `Die Obergrenze für das Grunddarlehen richtet sich nach dem angegebenen Standort ihres Förderobjekts (${cleanPostcode}) und beträgt bis zu 184.000 Euro für Familien der Einkommensgruppe A sowie bis zu 110.000 Euro für die Einkommensgruppe B. Ihre Einkommensgruppe ergibt sich aus Ihrer Haushaltsgröße und Ihrem Einkommen. Klicken Sie im persönlichen Bereich auf ‚Prüfen‘, um Ihre Einkommensgruppe zu ermitteln.`;
      break;
    default:
      infoMessage = "Die Obergrenze für das Grunddarlehen wird auf Grundlage des Standorts des Förderobjekts sowie der Haushaltsgröße und des Haushaltseinkommens festgelegt. Sie liegt zwischen 59.000 Euro und maximal 184.000 Euro.";
  }
  
  return {
    costCategory,
    limits,
    infoMessage
  };
};

// Helper function to format currency for display
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(value / 100);
};

// Helper function to get numeric value from currency string
export const getNumericValue = (value: string): number => {
  return Number(value.replace(/[^0-9]/g, ''));
};

// Simple function to get max limit for a postcode (for validation/progress calculation)
export const getMaxLimitForPostcode = (postcode: string): number => {
  // Clean postcode (remove spaces, etc.)
  const cleanPostcode = postcode.replace(/\s/g, '');
  
  // Find postcode in mapping
  const postcodeData = (postcodeMap as Record<string, any>)[cleanPostcode];
  
  if (!postcodeData || !postcodeData.costCategory) {
    // No postcode found or not in mapping - return default (category 4)
    return COST_CATEGORY_LIMITS[4].maxLimit;
  }
  
  const costCategory = postcodeData.costCategory;
  const limits = COST_CATEGORY_LIMITS[costCategory] || COST_CATEGORY_LIMITS[4];
  
  return limits.maxLimit;
}; 