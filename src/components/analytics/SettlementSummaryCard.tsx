import React, { useMemo } from 'react';
import { Box, Paper, Typography, Stack, Divider, Chip } from '@mui/material';
import { AlertCircle, Users } from 'lucide-react';
import { useStore } from '../../store';
import { getTranslation } from '../../i18n/translations';
import { formatCurrency } from '../../utils/formatters';
import { convertAmount } from '../../hooks/useCurrencyRates';

interface SettlementSummaryCardProps {
  totalImbalance: number;
  totalImbalanceByCurrency: Record<string, number>;
  memberPairsWithImbalance: number;
  currency: string;
}

/**
 * Read-only card showing settlement summary.
 * Supports multi-currency display when not converted.
 */
export const SettlementSummaryCard: React.FC<SettlementSummaryCardProps> = ({
  totalImbalance,
  totalImbalanceByCurrency,
  memberPairsWithImbalance,
  currency,
}) => {
  const { language, preferredCurrency, exchangeRates } = useStore();
  const t = useMemo(() => getTranslation(language), [language]);

  const isConverted = preferredCurrency && exchangeRates;
  
  // Calculate converted total if conversion is active
  let displayAmount = totalImbalance;
  let displayCurrency = currency;
  
  if (isConverted) {
    let convertedTotal = 0;
    for (const [cur, amt] of Object.entries(totalImbalanceByCurrency)) {
      const conv = convertAmount(amt, cur, preferredCurrency!, exchangeRates!);
      convertedTotal += conv ?? 0;
    }
    displayAmount = convertedTotal;
    displayCurrency = preferredCurrency!;
  }

  // Get non-zero currency imbalances
  const nonZeroCurrencies = Object.entries(totalImbalanceByCurrency)
    .filter(([_, amt]) => amt > 0.01);

  const isBalanced = displayAmount < 0.01;

  return (
    <Paper
      sx={{
        p: 2.5,
        bgcolor: isBalanced ? 'success.dark' : 'warning.dark',
        color: 'white',
        borderRadius: 2,
        height: '100%',
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            bgcolor: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isBalanced ? <Users size={24} /> : <AlertCircle size={24} />}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {isBalanced
              ? t.analytics.groupBalanced
              : t.analytics.balanceToSettle}
          </Typography>
          
          {/* Main amount display */}
          {isConverted ? (
            <>
              <Typography variant="h5" fontWeight={700}>
                {formatCurrency(displayAmount, displayCurrency)}
              </Typography>
              {/* Show currency chips */}
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                {nonZeroCurrencies.map(([cur, amt]) => (
                  <Chip
                    key={cur}
                    label={formatCurrency(amt, cur)}
                    size="small"
                    sx={{ 
                      fontSize: '0.65rem', 
                      height: 20,
                      bgcolor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      border: 'none',
                    }}
                  />
                ))}
              </Stack>
            </>
          ) : (
            // Show each currency separately when not converted
            <Stack spacing={0.25}>
              {nonZeroCurrencies.length === 0 ? (
                <Typography variant="h5" fontWeight={700}>
                  {formatCurrency(0, currency)}
                </Typography>
              ) : (
                nonZeroCurrencies.map(([cur, amt]) => (
                  <Typography key={cur} variant="h6" fontWeight={700}>
                    {formatCurrency(amt, cur)}
                  </Typography>
                ))
              )}
            </Stack>
          )}
        </Box>
      </Stack>

      {!isBalanced && (
        <>
          <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.2)' }} />
          <Typography variant="body2" sx={{ opacity: 0.85, fontSize: '0.8rem' }}>
            {t.analytics.settlementDesc.replace('{{pairs}}', memberPairsWithImbalance.toString())}
          </Typography>
        </>
      )}
    </Paper>
  );
};
