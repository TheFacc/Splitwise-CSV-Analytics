import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Chip,
  Typography,
} from '@mui/material';
import { RefreshCw, Globe } from 'lucide-react';
import { useStore } from '../../store';
import { useCurrencyRates } from '../../hooks/useCurrencyRates';
import { getTranslation } from '../../i18n/translations';

// Common currencies to show at the top
const COMMON_CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD'];

export const CurrencySelector = () => {
  const { 
    parsedData, 
    preferredCurrency, 
    setPreferredCurrency, 
    exchangeRates,
    isLoadingRates,
    language
  } = useStore();
  const { fetchRates } = useCurrencyRates();
  const t = useMemo(() => getTranslation(language), [language]);

  // Available currencies (from data + common ones)
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>(COMMON_CURRENCIES);

  useEffect(() => {
    if (parsedData?.currencies) {
      const unique = new Set([...parsedData.currencies, ...COMMON_CURRENCIES]);
      setAvailableCurrencies(Array.from(unique).sort());
    }
  }, [parsedData?.currencies]);

  const handleCurrencyChange = async (currency: string | null) => {
    if (currency === '' || currency === null) {
      setPreferredCurrency(null);
      // Don't clear rates - they're needed for chart normalization
      return;
    }

    setPreferredCurrency(currency);
    
    // Fetch rates with the selected currency as base
    await fetchRates(currency);
  };

  if (!parsedData || parsedData.currencies.length < 2) {
    return null; // Don't show selector if only one currency
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 2,
        mb: 3,
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
      }}
    >
      <Globe size={20} color="#48be9d" />
      <Typography variant="body2" color="text.secondary">
        {t.sidebar.currenciesFound}:
      </Typography>
      {parsedData.currencies.map((curr) => (
        <Chip key={curr} label={curr} size="small" variant="outlined" />
      ))}

      <Box sx={{ flex: 1 }} />

      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel>{t.sidebar.convertTo}</InputLabel>
        <Select
          value={preferredCurrency || ''}
          label={t.sidebar.convertTo}
          onChange={(e) => handleCurrencyChange(e.target.value || null)}
          disabled={isLoadingRates}
          startAdornment={isLoadingRates ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
        >
          <MenuItem value="">
            <em>{t.sidebar.showOriginal}</em>
          </MenuItem>
          {availableCurrencies.map((curr) => (
            <MenuItem key={curr} value={curr}>
              {curr}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {exchangeRates && (
        <Chip
          label={`${t.sidebar.ratesDate}: ${exchangeRates.date}`}
          size="small"
          icon={<RefreshCw size={12} />}
          onClick={() => preferredCurrency && fetchRates(preferredCurrency)}
          disabled={isLoadingRates}
          sx={{ fontSize: '0.7rem' }}
        />
      )}
    </Box>
  );
};
