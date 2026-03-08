// Transaction represents a single row from the CSV
export interface Transaction {
  id: string;
  date: Date;
  description: string;
  category: string;
  cost: number;
  currency: string;
  memberBalances: Record<string, number>; // member name -> balance (+/-)
  isTransfer: boolean;
  transferFrom?: string;  // Parsed from "X ha pagato Y"
  transferTo?: string;
}

// Amount with currency - for multi-currency support
export interface CurrencyAmount {
  amount: number;
  currency: string;
}

// Member aggregate data - per currency
export interface MemberBalanceByCurrency {
  balance: number;
  paid: number;
  owed: number;
}

export interface Member {
  name: string;
  // Balances keyed by currency code (EUR, USD, etc.)
  balancesByCurrency: Record<string, MemberBalanceByCurrency>;
  // Legacy single-currency fields (deprecated, kept for compatibility)
  totalBalance: number;
  totalPaid: number;
  totalOwed: number;
}

// Category spending breakdown - per currency
export interface CategoryBreakdown {
  category: string;
  // Totals keyed by currency
  totalsByCurrency: Record<string, number>;
  count: number;
  // Legacy single total (sum of primary currency)
  total: number;
}

// Monthly spending data for charts - per currency
export interface MonthlyData {
  month: string;  // Format: "YYYY-MM"
  // Spending/transfers keyed by currency
  spendingByCurrency: Record<string, number>;
  transfersByCurrency: Record<string, number>;
  // Legacy fields
  spending: number;
  transfers: number;
}

// Fully parsed and aggregated data
export interface ParsedData {
  fileName: string;
  transactions: Transaction[];
  members: Member[];
  categories: CategoryBreakdown[];
  monthlyData: MonthlyData[];
  // Currencies found in the data
  currencies: string[];
  // Totals keyed by currency
  totalSpendingByCurrency: Record<string, number>;
  totalTransfersByCurrency: Record<string, number>;
  // Legacy single-currency totals
  totalSpending: number;
  totalTransfers: number;
  currency: string; // Primary/first currency
}

// Exchange rates from API
export interface ExchangeRates {
  base: string;
  date: string;
  timestamp: number;
  rates: Record<string, number>;
}

// Category management - user-defined groups
export interface CategoryGroup {
  name: string;         // Display name (e.g. "Bills")
  children: string[];   // Original categories merged into this (e.g. ["Electricity", "Wifi", "Water"])
}

// Category rename mapping: original name -> new display name
export type CategoryRenames = Record<string, string>;

// Filter state for the dashboard
export interface FilterState {
  member: string | null;
  category: string | null;
  dateRange: { start: Date; end: Date } | null;
  showTransfers: boolean;
}

// Time grouping for chart visualization
export type TimeGrouping = 'daily' | 'weekly' | 'monthly';

// Theme mode
export type ThemeMode = 'light' | 'dark';
