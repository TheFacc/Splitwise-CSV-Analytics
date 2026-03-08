import React, { useState, useMemo } from 'react';
import { Box, Stack, Typography, LinearProgress, Tabs, Tab } from '@mui/material';
import { useStore } from '../../store';
import { getTranslation } from '../../i18n/translations';
import type { FairnessMemberStats } from '../../hooks/useAnalyticsData';

interface FairnessIndexListProps {
  memberStats: FairnessMemberStats[];
  currencies?: string[];
}

/**
 * Paired bar visualization showing consumption vs payment share for each member.
 * Supports multi-currency with tabs when not converted - shows separate fairness per currency.
 */
import { convertAmount } from '../../hooks/useCurrencyRates';

export const FairnessIndexList: React.FC<FairnessIndexListProps> = ({
  memberStats,
  currencies: propCurrencies,
}) => {
  const { language, preferredCurrency, exchangeRates } = useStore();
  const t = useMemo(() => getTranslation(language), [language]);
  const [selectedCurrencyTab, setSelectedCurrencyTab] = useState(0);

  const consumedColor = '#e74c3c'; // Red for consumed
  const paidColor = '#48be9d'; // Green for paid

  // Get all unique currencies from the data
  const currencies = useMemo(() => {
    if (propCurrencies && propCurrencies.length > 0) return propCurrencies;
    const currencySet = new Set<string>();
    memberStats.forEach(member => {
      Object.keys(member.consumedByCurrency || {}).forEach(cur => currencySet.add(cur));
      Object.keys(member.paidByCurrency || {}).forEach(cur => currencySet.add(cur));
    });
    return Array.from(currencySet).sort();
  }, [memberStats, propCurrencies]);

  const isConverted = preferredCurrency && exchangeRates;
  const selectedCurrency = currencies[selectedCurrencyTab];

  // Compute converted shares when conversion is active
  // This properly converts per-currency amounts before computing percentages
  const convertedShares = useMemo(() => {
    if (!isConverted) return null;

    // Convert each member's consumed/paid to preferred currency
    const convertedTotals = memberStats.map(member => {
      let consumed = 0;
      let paid = 0;
      for (const [cur, amt] of Object.entries(member.consumedByCurrency || {})) {
        const conv = convertAmount(amt, cur, preferredCurrency!, exchangeRates!);
        consumed += conv ?? 0;
      }
      for (const [cur, amt] of Object.entries(member.paidByCurrency || {})) {
        const conv = convertAmount(amt, cur, preferredCurrency!, exchangeRates!);
        paid += conv ?? 0;
      }
      return { name: member.name, consumed, paid };
    });

    const grandTotalConsumed = convertedTotals.reduce((a, b) => a + b.consumed, 0);
    const grandTotalPaid = convertedTotals.reduce((a, b) => a + b.paid, 0);

    const shareMap = new Map<string, { consumptionShare: number; paymentShare: number }>();
    convertedTotals.forEach(({ name, consumed, paid }) => {
      shareMap.set(name, {
        consumptionShare: grandTotalConsumed > 0 ? (consumed / grandTotalConsumed) * 100 : 0,
        paymentShare: grandTotalPaid > 0 ? (paid / grandTotalPaid) * 100 : 0,
      });
    });

    return shareMap;
  }, [isConverted, memberStats, preferredCurrency, exchangeRates]);

  // Get the appropriate share values based on mode
  const getShares = (member: FairnessMemberStats) => {
    if (isConverted && convertedShares) {
      // Use properly converted shares
      return convertedShares.get(member.name) || {
        consumptionShare: 0,
        paymentShare: 0,
      };
    } else if (selectedCurrency && member.consumptionShareByCurrency && member.paymentShareByCurrency) {
      // Use per-currency shares
      return {
        consumptionShare: member.consumptionShareByCurrency[selectedCurrency] || 0,
        paymentShare: member.paymentShareByCurrency[selectedCurrency] || 0,
      };
    }
    // Fallback to overall shares
    return {
      consumptionShare: member.consumptionShare,
      paymentShare: member.paymentShare,
    };
  };

  if (memberStats.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
        {t.charts.noData}
      </Box>
    );
  }

  return (
    <Box>
      {/* Currency tabs when not converted and multiple currencies */}
      {!isConverted && currencies.length > 1 && (
        <Tabs
          value={selectedCurrencyTab}
          onChange={(_, v) => setSelectedCurrencyTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ 
            minHeight: 32, 
            mb: 2,
            '& .MuiTab-root': { minHeight: 32, py: 0.5, fontSize: '0.75rem' }
          }}
        >
          {currencies.map((cur) => (
            <Tab key={cur} label={cur} />
          ))}
        </Tabs>
      )}

      <Stack spacing={2}>
        {/* Legend */}
        <Stack direction="row" spacing={3} justifyContent="center" sx={{ mb: 1 }}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Box sx={{ width: 12, height: 12, bgcolor: consumedColor, borderRadius: 0.5 }} />
            <Typography variant="caption" color="text.secondary">
              {t.analytics.consumedPct}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Box sx={{ width: 12, height: 12, bgcolor: paidColor, borderRadius: 0.5 }} />
            <Typography variant="caption" color="text.secondary">
              {t.analytics.paidPct}
            </Typography>
          </Stack>
        </Stack>

        {/* Member rows */}
        {memberStats.map((member) => {
          const { consumptionShare, paymentShare } = getShares(member);
          const difference = paymentShare - consumptionShare;
          const isOverpayer = difference > 0;

          // Skip members with no data for selected currency (when not converted)
          if (!isConverted && consumptionShare === 0 && paymentShare === 0) {
            return null;
          }

          return (
            <Box key={member.name} sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="body2" fontWeight={600}>
                  {member.name}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: isOverpayer ? paidColor : consumedColor,
                    fontWeight: 500,
                  }}
                >
                  {isOverpayer ? '+' : ''}
                  {difference.toFixed(1)}%
                </Typography>
              </Stack>

              {/* Consumption bar */}
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ width: 60, fontSize: '0.65rem' }}>
                  {t.analytics.consumed}
                </Typography>
                <Box sx={{ flex: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(consumptionShare, 100)}
                    sx={{
                      height: 8,
                      borderRadius: 1,
                      bgcolor: `${consumedColor}20`,
                      '& .MuiLinearProgress-bar': {
                        bgcolor: consumedColor,
                        borderRadius: 1,
                      },
                    }}
                  />
                </Box>
                <Typography variant="caption" sx={{ width: 40, textAlign: 'right', fontSize: '0.7rem' }}>
                  {consumptionShare.toFixed(1)}%
                </Typography>
              </Stack>

              {/* Payment bar */}
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="caption" color="text.secondary" sx={{ width: 60, fontSize: '0.65rem' }}>
                  {t.analytics.paid}
                </Typography>
                <Box sx={{ flex: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(paymentShare, 100)}
                    sx={{
                      height: 8,
                      borderRadius: 1,
                      bgcolor: `${paidColor}20`,
                      '& .MuiLinearProgress-bar': {
                        bgcolor: paidColor,
                        borderRadius: 1,
                      },
                    }}
                  />
                </Box>
                <Typography variant="caption" sx={{ width: 40, textAlign: 'right', fontSize: '0.7rem' }}>
                  {paymentShare.toFixed(1)}%
                </Typography>
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};
