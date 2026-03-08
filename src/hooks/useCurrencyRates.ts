import { useCallback } from 'react';
import { useStore } from '../store';
import type { ExchangeRates } from '../types';

// Free currency API - no registration required
const API_BASE = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies';

export const useCurrencyRates = () => {
  const { setExchangeRates, setLoadingRates, setError } = useStore();

  const fetchRates = useCallback(
    async (baseCurrency: string) => {
      setLoadingRates(true);
      try {
        const base = baseCurrency.toLowerCase();
        const response = await fetch(`${API_BASE}/${base}.json`);
        
        if (!response.ok) {
          throw new Error(`Impossibile recuperare i tassi di cambio per ${baseCurrency}`);
        }

        const data = await response.json();
        
        // The API returns { date: "2024-01-15", [currency]: { ... rates ... } }
        const rates = data[base];
        
        if (!rates) {
          throw new Error(`Tassi di cambio non disponibili per ${baseCurrency}`);
        }

        const exchangeRates: ExchangeRates = {
          base: baseCurrency.toUpperCase(),
          date: data.date,
          timestamp: new Date().getTime(),
          rates: Object.fromEntries(
            Object.entries(rates).map(([key, value]) => [key.toUpperCase(), value as number])
          ),
        };

        setExchangeRates(exchangeRates);
        return exchangeRates;
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Errore nel recupero dei tassi di cambio');
        return null;
      } finally {
        setLoadingRates(false);
      }
    },
    [setExchangeRates, setLoadingRates, setError]
  );

  const clearRates = useCallback(() => {
    setExchangeRates(null);
  }, [setExchangeRates]);

  return { fetchRates, clearRates };
};

// Utility function to convert amount between currencies
export const convertAmount = (
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: ExchangeRates | null
): number | null => {
  if (!rates) return null;
  
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  const base = rates.base.toUpperCase();

  // If same currency, no conversion needed
  if (from === to) return amount;

  // If base is the source currency, direct conversion
  if (from === base) {
    const rate = rates.rates[to];
    if (rate === undefined) return null;
    return amount * rate;
  }

  // If base is the target currency, inverse conversion
  if (to === base) {
    const rate = rates.rates[from];
    if (rate === undefined) return null;
    return amount / rate;
  }

  // Cross-conversion: from -> base -> to
  const fromRate = rates.rates[from];
  const toRate = rates.rates[to];
  if (fromRate === undefined || toRate === undefined) return null;
  
  // Convert to base first, then to target
  const inBase = amount / fromRate;
  return inBase * toRate;
};

// Format multiple currency amounts
export const formatMultiCurrency = (
  amounts: Record<string, number>,
  preferredCurrency: string | null,
  rates: ExchangeRates | null
): { original: Array<{ currency: string; amount: number }>; converted?: { currency: string; amount: number } } => {
  const original = Object.entries(amounts)
    .filter(([_, amount]) => amount !== 0)
    .map(([currency, amount]) => ({ currency, amount }));

  if (!preferredCurrency || !rates || original.length === 0) {
    return { original };
  }

  // Convert all to preferred currency
  let totalConverted = 0;
  let allConvertible = true;

  for (const { currency, amount } of original) {
    const converted = convertAmount(amount, currency, preferredCurrency, rates);
    if (converted === null) {
      allConvertible = false;
      break;
    }
    totalConverted += converted;
  }

  if (allConvertible) {
    return {
      original,
      converted: { currency: preferredCurrency, amount: totalConverted },
    };
  }

  return { original };
};
