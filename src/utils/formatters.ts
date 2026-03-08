// Format currency values
export const formatCurrency = (value: number, currency: string = 'EUR'): string => {
  const formatter = new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(value);
};

// Format date for display (locale-aware)
export const formatDate = (date: Date, locale: string = 'en-US'): string => {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

// Format date to YYYY-MM for grouping
export const formatMonthYear = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

// Parse Italian date format (DD/MM/YYYY or YYYY-MM-DD)
export const parseDate = (dateStr: string): Date => {
  // Try YYYY-MM-DD format first
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return new Date(dateStr);
  }
  
  // Try DD/MM/YYYY format
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  
  // Fallback to native parsing
  return new Date(dateStr);
};

// Generate unique ID
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

// Get color for category (consistent hashing)
export const getCategoryColor = (_category: string, index: number): string => {
  const colors = [
    '#48be9d', // Mint (primary)
    '#ff652f', // Orange
    '#3498db', // Blue
    '#9b59b6', // Purple
    '#e74c3c', // Red
    '#f39c12', // Yellow
    '#1abc9c', // Teal
    '#e91e63', // Pink
    '#00bcd4', // Cyan
    '#8bc34a', // Light Green
  ];
  return colors[index % colors.length];
};

// Truncate text with ellipsis
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};
