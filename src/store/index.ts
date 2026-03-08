import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ParsedData, FilterState, ThemeMode, TimeGrouping, ExchangeRates, CategoryGroup, CategoryRenames } from '../types';
import type { Language } from '../i18n/translations';

interface AppState {
  // Data
  parsedData: ParsedData | null;
  isLoading: boolean;
  error: string | null;

  // Filters
  filters: FilterState;

  // Time grouping for charts
  timeGrouping: TimeGrouping;

  // Currency conversion
  preferredCurrency: string | null;  // null = show original currencies
  exchangeRates: ExchangeRates | null;
  isLoadingRates: boolean;

  // Category management
  categoryGroups: CategoryGroup[];
  categoryRenames: CategoryRenames;

  // Theme
  themeMode: ThemeMode;

  // Language
  language: Language;

  // Actions
  setData: (data: ParsedData) => void;
  clearData: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  setTimeGrouping: (grouping: TimeGrouping) => void;
  setPreferredCurrency: (currency: string | null) => void;
  setExchangeRates: (rates: ExchangeRates | null) => void;
  setLoadingRates: (loading: boolean) => void;
  setLanguage: (lang: Language) => void;
  setCategoryGroups: (groups: CategoryGroup[]) => void;
  setCategoryRenames: (renames: CategoryRenames) => void;
  clearCategoryMappings: () => void;
}

const initialFilters: FilterState = {
  member: null,
  category: null,
  dateRange: null,
  showTransfers: true,
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      parsedData: null,
      isLoading: false,
      error: null,
      filters: initialFilters,
      timeGrouping: 'daily' as const,
      preferredCurrency: null,
      exchangeRates: null,
      isLoadingRates: false,
      categoryGroups: [],
      categoryRenames: {},
      themeMode: 'dark',
      language: 'en' as const,  // Default to English

      // Actions
      setData: (data) => set({ parsedData: data, error: null }),
      clearData: () => set({ parsedData: null, filters: initialFilters, categoryGroups: [], categoryRenames: {} }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error, isLoading: false }),
      setFilters: (newFilters) =>
        set({ filters: { ...get().filters, ...newFilters } }),
      resetFilters: () => set({ filters: initialFilters }),
      setThemeMode: (mode) => set({ themeMode: mode }),
      toggleTheme: () => {
        const current = get().themeMode;
        set({ themeMode: current === 'light' ? 'dark' : 'light' });
      },
      setTimeGrouping: (grouping) => set({ timeGrouping: grouping }),
      setPreferredCurrency: (currency) => set({ preferredCurrency: currency }),
      setExchangeRates: (rates) => set({ exchangeRates: rates }),
      setLoadingRates: (loading) => set({ isLoadingRates: loading }),
      setLanguage: (lang) => set({ language: lang }),
      setCategoryGroups: (groups) => set({ categoryGroups: groups }),
      setCategoryRenames: (renames) => set({ categoryRenames: renames }),
      clearCategoryMappings: () => set({ categoryGroups: [], categoryRenames: {} }),
    }),
    {
      name: 'splitwise-dashboard-storage',
      partialize: (state) => ({
        themeMode: state.themeMode,
        language: state.language,  // Persist language preference
        categoryGroups: state.categoryGroups,
        categoryRenames: state.categoryRenames,
        // Don't persist data - it should be re-uploaded each session
      }),
    }
  )
);

// Build a mapping function from category groups and renames
export const buildCategoryMapper = (groups: CategoryGroup[], renames: CategoryRenames) => {
  // Build reverse map: original child → group name
  const childToGroup: Record<string, string> = {};
  for (const group of groups) {
    for (const child of group.children) {
      childToGroup[child] = group.name;
    }
  }
  return (originalCategory: string): string => {
    // If category belongs to a group, use the group name
    if (childToGroup[originalCategory]) return childToGroup[originalCategory];
    // If category was renamed, use the renamed value
    if (renames[originalCategory]) return renames[originalCategory];
    return originalCategory;
  };
};

// Apply category mapping to a single transaction (returns new object)
const mapTransaction = (tx: import('../types').Transaction, mapper: (cat: string) => string): import('../types').Transaction => {
  const mappedCategory = mapper(tx.category);
  if (mappedCategory === tx.category) return tx;
  return { ...tx, category: mappedCategory };
};

// Selector hooks for common derived state
export const useFilteredTransactions = () => {
  const { parsedData, filters, categoryGroups, categoryRenames } = useStore();
  
  if (!parsedData) return [];
  
  const mapper = buildCategoryMapper(categoryGroups, categoryRenames);
  
  return parsedData.transactions
    .map(tx => mapTransaction(tx, mapper))
    .filter((tx) => {
      // Filter by transfer visibility
      if (!filters.showTransfers && tx.isTransfer) return false;
      
      // Member and category filters have been moved to TransactionsTable
      // so they only filter the table and not the global analytics data.
      
      // Filter by date range
      if (filters.dateRange) {
        const txDate = new Date(tx.date);
        if (txDate < filters.dateRange.start || txDate > filters.dateRange.end) {
          return false;
        }
      }
      
      return true;
    });
};

// Get all transactions with category mapping applied (unfiltered)
export const useMappedTransactions = () => {
  const { parsedData, categoryGroups, categoryRenames } = useStore();
  if (!parsedData) return [];
  const mapper = buildCategoryMapper(categoryGroups, categoryRenames);
  return parsedData.transactions.map(tx => mapTransaction(tx, mapper));
};
