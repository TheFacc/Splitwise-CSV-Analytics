import { useCallback } from 'react';
import Papa from 'papaparse';
import { useStore } from '../store';
import type { Transaction, ParsedData, Member, CategoryBreakdown, MonthlyData, MemberBalanceByCurrency } from '../types';
import { parseDate, formatMonthYear, generateId } from '../utils/formatters';

// Payment keywords in different languages (used for category matching)
const PAYMENT_KEYWORDS = [
  'pagamento', // Italian, Portuguese
  'payment',   // English
  'paiement',  // French
  'zahlung',   // German
  'pago',      // Spanish
];

// Regex for payment descriptions across different languages:
// Italian: "X ha pagato Y" (im sure of this, others just a guess)
// English: "X paid Y"
// French: "X a payé Y"
// Spanish: "X pagó (a) Y"
// Portuguese: "X pagou (a) Y"
// German: "X hat Y bezahlt/gezahlt"
const PAYMENT_REGEX = /^(.+?)\s+(?:ha pagato|paid|a payé|pagó(?:\s+a)?|pagou(?:\s+a)?|hat)\s+(.+?)(?:\s+(?:bezahlt|gezahlt))?$/i;

interface CsvRow {
  [key: string]: string;
}

const parseAmount = (val: string): number => {
  if (!val || typeof val !== 'string') return 0;
  let s = val.trim();
  
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');

  if (lastDot > lastComma && lastComma !== -1) {
    // English format with comma thousands: 1,000.00
    s = s.replace(/,/g, '');
  } else if (lastComma > lastDot && lastDot !== -1) {
    // European format with dot thousands: 1.000,00
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (lastComma > -1 && lastDot === -1) {
    // Only comma used. e.g. 1000,00 -> 1000.00 or 1,000 -> 1000
    // Splitwise uses 2 decimals usually. If it's a comma at 3 digits from right, might be thousand, but safer to treat as decimal.
    s = s.replace(',', '.');
  }
  // If only dot or neither, parseFloat handles it directly.
  return parseFloat(s) || 0;
};

export const useCsvParser = () => {
  const { setData, setLoading, setError } = useStore();

  const parseTransferDescription = (description: string): { from: string; to: string } | null => {
    const match = description.match(PAYMENT_REGEX);
    if (match) {
      return {
        from: match[1].trim(),
        to: match[2].trim(),
      };
    }
    return null;
  };

  const isPaymentCategory = (category: string): boolean => {
    const normalizedCategory = category.toLowerCase().trim();
    return PAYMENT_KEYWORDS.some((kw) => normalizedCategory.includes(kw));
  };

  const parseCsv = useCallback(
    (file: File) => {
      setLoading(true);
      setError(null);

      Papa.parse<CsvRow>(file, {
        header: true,
        skipEmptyLines: true,
        encoding: 'UTF-8',
        complete: (results) => {
          try {
            const { data, meta } = results;

            if (!data || data.length === 0) {
              throw new Error('Il file CSV è vuoto');
            }

            // Get headers - first 5 are fixed, rest are member names
            const headers = meta.fields || [];
            const fixedColumns = headers.slice(0, 5);
            const memberColumns = headers.slice(5);

            if (memberColumns.length === 0) {
              throw new Error('Nessun membro trovato nel CSV. Verifica il formato.');
            }

            // Column name mapping (handles different languages)
            const dateCol = fixedColumns[0];
            const descCol = fixedColumns[1];
            const catCol = fixedColumns[2];
            const costCol = fixedColumns[3];
            const currCol = fixedColumns[4];

            // Parse transactions
            const transactions: Transaction[] = [];
            
            // Per-currency tracking
            const currenciesSet = new Set<string>();
            const totalSpendingByCurrency: Record<string, number> = {};
            const totalTransfersByCurrency: Record<string, number> = {};
            
            // Category breakdown: category -> currency -> total
            const categoryMap = new Map<string, { totalsByCurrency: Record<string, number>; count: number }>();
            
            // Monthly data: month -> { spendingByCurrency, transfersByCurrency }
            const monthlyMap = new Map<string, { 
              spendingByCurrency: Record<string, number>; 
              transfersByCurrency: Record<string, number> 
            }>();
            
            // Member totals: member -> currency -> { balance, paid, owed }
            const memberTotals = new Map<string, Map<string, MemberBalanceByCurrency>>();

            // Initialize member totals maps
            memberColumns.forEach((member) => {
              memberTotals.set(member, new Map());
            });

            let primaryCurrency = 'EUR';

            data.forEach((row) => {
              // Skip empty or invalid rows
              if (!row[dateCol] || !row[costCol]) return;
              
              // Skip summary rows at the bottom of CSV (they have balance totals but unusual date formats or text)
              // Valid dates should parse to a proper Date object
              const parsedDate = parseDate(row[dateCol]);
              if (!parsedDate || isNaN(parsedDate.getTime())) return;

              const rawCategory = row[catCol];
              if (!rawCategory || rawCategory.trim() === '') return;

              const category = rawCategory.trim();
              const isTransfer = isPaymentCategory(category);
              const cost = parseAmount(row[costCol]);
              const date = parsedDate; // Reuse already parsed date
              const monthKey = formatMonthYear(date);
              const currency = (row[currCol] || 'EUR').toUpperCase();

              // Track currencies
              currenciesSet.add(currency);
              if (currenciesSet.size === 1) {
                primaryCurrency = currency;
              }

              // Initialize currency totals if needed
              if (!(currency in totalSpendingByCurrency)) {
                totalSpendingByCurrency[currency] = 0;
                totalTransfersByCurrency[currency] = 0;
              }

              // Parse member balances (per-currency)
              const memberBalances: Record<string, number> = {};
              memberColumns.forEach((member) => {
                const value = parseAmount(row[member] || '0');
                memberBalances[member] = value;

                // Update member totals per currency
                const memberCurrencyMap = memberTotals.get(member)!;
                if (!memberCurrencyMap.has(currency)) {
                  memberCurrencyMap.set(currency, { balance: 0, paid: 0, owed: 0 });
                }
                const current = memberCurrencyMap.get(currency)!;
                current.balance += value;
                if (value > 0) current.paid += value;
                if (value < 0) current.owed += Math.abs(value);
              });

              // Parse transfer details
              let transferFrom: string | undefined;
              let transferTo: string | undefined;

              if (isTransfer) {
                const transferInfo = parseTransferDescription(row[descCol] || '');
                if (transferInfo) {
                  transferFrom = transferInfo.from;
                  transferTo = transferInfo.to;
                }
                totalTransfersByCurrency[currency] += cost;
              } else {
                totalSpendingByCurrency[currency] += cost;

                // Update category breakdown (per-currency)
                if (!categoryMap.has(category)) {
                  categoryMap.set(category, { totalsByCurrency: {}, count: 0 });
                }
                const catData = categoryMap.get(category)!;
                catData.totalsByCurrency[currency] = (catData.totalsByCurrency[currency] || 0) + cost;
                catData.count += 1;
              }

              // Update monthly data (per-currency)
              if (!monthlyMap.has(monthKey)) {
                monthlyMap.set(monthKey, { spendingByCurrency: {}, transfersByCurrency: {} });
              }
              const monthData = monthlyMap.get(monthKey)!;
              if (isTransfer) {
                monthData.transfersByCurrency[currency] = (monthData.transfersByCurrency[currency] || 0) + cost;
              } else {
                monthData.spendingByCurrency[currency] = (monthData.spendingByCurrency[currency] || 0) + cost;
              }

              transactions.push({
                id: generateId(),
                date,
                description: row[descCol] || '',
                category,
                cost,
                currency,
                memberBalances,
                isTransfer,
                transferFrom,
                transferTo,
              });
            });

            // Build members array with per-currency balances
            const members: Member[] = Array.from(memberTotals.entries()).map(
              ([name, currencyMap]) => {
                const balancesByCurrency: Record<string, MemberBalanceByCurrency> = {};
                let totalBalance = 0;
                let totalPaid = 0;
                let totalOwed = 0;

                currencyMap.forEach((data, curr) => {
                  balancesByCurrency[curr] = data;
                  // Legacy totals (sum all - only valid for single currency)
                  totalBalance += data.balance;
                  totalPaid += data.paid;
                  totalOwed += data.owed;
                });

                return {
                  name,
                  balancesByCurrency,
                  totalBalance,
                  totalPaid,
                  totalOwed,
                };
              }
            );

            // Build categories array with per-currency totals
            const categories: CategoryBreakdown[] = Array.from(categoryMap.entries())
              .map(([category, data]) => {
                // Calculate legacy total (sum of all currencies - for sorting)
                const total = Object.values(data.totalsByCurrency).reduce((sum, val) => sum + val, 0);
                return {
                  category,
                  totalsByCurrency: data.totalsByCurrency,
                  count: data.count,
                  total,
                };
              })
              .sort((a, b) => b.total - a.total);

            // Build monthly data array with per-currency values
            const monthlyData: MonthlyData[] = Array.from(monthlyMap.entries())
              .map(([month, data]) => {
                // Calculate legacy totals
                const spending = Object.values(data.spendingByCurrency).reduce((sum, val) => sum + val, 0);
                const transfers = Object.values(data.transfersByCurrency).reduce((sum, val) => sum + val, 0);
                return {
                  month,
                  spendingByCurrency: data.spendingByCurrency,
                  transfersByCurrency: data.transfersByCurrency,
                  spending,
                  transfers,
                };
              })
              .sort((a, b) => a.month.localeCompare(b.month));

            // Calculate legacy totals
            const totalSpending = Object.values(totalSpendingByCurrency).reduce((sum, val) => sum + val, 0);
            const totalTransfers = Object.values(totalTransfersByCurrency).reduce((sum, val) => sum + val, 0);

            const parsedData: ParsedData = {
              fileName: file.name,
              transactions,
              members,
              categories,
              monthlyData,
              currencies: Array.from(currenciesSet),
              totalSpendingByCurrency,
              totalTransfersByCurrency,
              totalSpending,
              totalTransfers,
              currency: primaryCurrency,
            };

            setData(parsedData);
          } catch (error) {
            setError(error instanceof Error ? error.message : 'Errore durante il parsing del CSV');
          } finally {
            setLoading(false);
          }
        },
        error: (error) => {
          setError(`Errore di lettura del file: ${error.message}`);
          setLoading(false);
        },
      });
    },
    [setData, setLoading, setError]
  );

  return { parseCsv };
};
