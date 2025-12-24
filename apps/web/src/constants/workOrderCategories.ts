export const WORK_ORDER_CATEGORIES = [
  'PLUMBING',
  'ELECTRICAL',
  'HVAC',
  'APPLIANCE',
  'LANDSCAPING',
  'PAINTING',
  'CARPENTRY',
  'ROOFING',
  'FLOORING',
  'GENERAL',
  'OTHER',
] as const;

// Special handling for acronyms that should remain uppercase
const CATEGORY_LABELS: Record<string, string> = {
  HVAC: 'HVAC',
};

export const getCategoryLabel = (category: string | undefined | null): string => {
  // Handle undefined or null category
  if (!category) {
    return 'Unknown';
  }
  
  // Check if there's a special label for this category
  if (CATEGORY_LABELS[category]) {
    return CATEGORY_LABELS[category];
  }
  
  // Otherwise, format normally
  return category
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

