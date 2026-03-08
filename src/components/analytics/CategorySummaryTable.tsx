import React from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  Tooltip,
  Typography,
  Stack,
} from '@mui/material';
import { useStore } from '../../store';
import { getTranslation } from '../../i18n/translations';
import { formatCurrency } from '../../utils/formatters';
import { convertAmount } from '../../hooks/useCurrencyRates';
import { CategoryStats } from '../../hooks/useAnalyticsData';

interface CategorySummaryTableProps {
  categoryStats: CategoryStats[];
  currency: string;
}

/**
 * Compact sparkline component for trend visualization
 */
const MiniSparkline: React.FC<{ data: { amount: number }[]; color: string }> = ({
  data,
  color,
}) => {
  if (data.length < 2) return null;

  const max = Math.max(...data.map((d) => d.amount));
  const min = Math.min(...data.map((d) => d.amount));
  const range = max - min || 1;
  const height = 20;
  const width = 50;

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((d.amount - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * Table showing category statistics.
 * Multi-currency support:
 * - Converted: single total with tooltip showing original currencies
 * - Unconverted: ALL currencies shown separately (one line per currency)
 * - Sparklines use per-currency trend data when appropriate
 */
export const CategorySummaryTable: React.FC<CategorySummaryTableProps> = ({
  categoryStats,
  currency,
}) => {
  const theme = useTheme();
  const { language, preferredCurrency, exchangeRates } = useStore();
  const t = React.useMemo(() => getTranslation(language), [language]);
  
  const isConversionActive = preferredCurrency && exchangeRates;

  // Determine currencies for sparkline selection in unconverted multi-currency mode
  const allCurrencies = React.useMemo(() => {
    const currencies = new Set<string>();
    categoryStats.forEach(cat => {
      Object.keys(cat.amountsByCurrency || {}).forEach(cur => currencies.add(cur));
    });
    return Array.from(currencies).sort();
  }, [categoryStats]);

  if (categoryStats.length === 0) {
    return (
      <Box
        sx={{
          p: 3,
          textAlign: 'center',
          color: 'text.secondary',
        }}
      >
        {t.analytics.noCategories}
      </Box>
    );
  }

  // Helper to get display amounts
  const getDisplayData = (cat: CategoryStats) => {
    const currencies = Object.entries(cat.amountsByCurrency || {});
    
    if (isConversionActive) {
      // Single converted total with tooltip
      let total = 0;
      for (const [cur, amt] of currencies) {
        const converted = convertAmount(amt, cur, preferredCurrency!, exchangeRates!);
        if (converted !== null) total += converted;
      }
      return {
        mode: 'converted' as const,
        convertedTotal: total,
        convertedCurrency: preferredCurrency!,
        originalAmounts: currencies,
        count: cat.transactionCount,
      };
    }
    
    // Unconverted - show ALL currencies separately
    if (currencies.length <= 1) {
      const [cur, amt] = currencies[0] || [currency, 0];
      return {
        mode: 'single' as const,
        amounts: [{ currency: cur, amount: amt }],
        count: cat.transactionCount,
      };
    }
    
    // Multiple currencies - all shown separately
    const amounts = currencies
      .sort((a, b) => b[1] - a[1]) // Sort by amount descending
      .map(([cur, amt]) => ({ currency: cur, amount: amt }));
    
    return {
      mode: 'multiple' as const,
      amounts,
      count: cat.transactionCount,
    };
  };

  // Helper to get sparkline data appropriate for current display mode
  const getSparklineData = (cat: CategoryStats) => {
    if (isConversionActive && cat.monthlyTrendByCurrency) {
      // Converted mode: sum converted amounts across currencies per month
      const monthMap = new Map<string, number>();
      for (const [cur, trend] of Object.entries(cat.monthlyTrendByCurrency)) {
        for (const { month, amount } of trend) {
          const converted = convertAmount(amount, cur, preferredCurrency!, exchangeRates!);
          monthMap.set(month, (monthMap.get(month) || 0) + (converted ?? 0));
        }
      }
      const result = Array.from(monthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, amount]) => ({ amount }));
      return result.length >= 2 ? result : null;
    }

    if (allCurrencies.length > 1 && cat.monthlyTrendByCurrency) {
      // Multi-currency unconverted: use the primary (first) currency's trend
      const primaryCur = allCurrencies[0];
      const trend = cat.monthlyTrendByCurrency[primaryCur];
      return trend && trend.length >= 2 ? trend : null;
    }

    // Single currency: use legacy trend
    return cat.monthlyTrend.length >= 2 ? cat.monthlyTrend : null;
  };

  return (
    <TableContainer sx={{ maxHeight: 350 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
              {t.transactions.category}
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
              {t.analytics.total}
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
              {t.nav.transactions}
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
              {t.analytics.average}
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
              {t.analytics.trend}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {categoryStats.map((cat) => {
            const displayData = getDisplayData(cat);
            const sparklineData = getSparklineData(cat);
            
            return (
              <TableRow
                key={cat.category}
                hover
                sx={{
                  '&:last-child td': { borderBottom: 0 },
                }}
              >
                <TableCell sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                  {cat.category}
                </TableCell>
                <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  {displayData.mode === 'converted' ? (
                    // Converted view: single total with tooltip
                    <Tooltip 
                      title={
                        <Box>
                          {displayData.originalAmounts.map(([cur, amt]) => (
                            <Typography key={cur} variant="body2" sx={{ fontSize: '0.75rem' }}>
                              {formatCurrency(amt, cur)}
                            </Typography>
                          ))}
                        </Box>
                      }
                      arrow 
                      placement="left"
                    >
                      <Box component="span" sx={{ cursor: 'help' }}>
                        {formatCurrency(displayData.convertedTotal, displayData.convertedCurrency)}
                      </Box>
                    </Tooltip>
                  ) : displayData.mode === 'single' ? (
                    // Single currency
                    formatCurrency(displayData.amounts[0].amount, displayData.amounts[0].currency)
                  ) : (
                    // Multiple currencies - show ALL separately
                    <Stack spacing={0.25} alignItems="flex-end">
                      {displayData.amounts.map(({ currency: cur, amount: amt }) => (
                        <Typography key={cur} variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                          {formatCurrency(amt, cur)}
                        </Typography>
                      ))}
                    </Stack>
                  )}
                </TableCell>
                <TableCell align="right" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                  {cat.transactionCount}
                </TableCell>
                <TableCell align="right" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                  {displayData.mode === 'converted' ? (
                    formatCurrency(displayData.convertedTotal / (cat.transactionCount || 1), displayData.convertedCurrency)
                  ) : displayData.mode === 'single' ? (
                    formatCurrency(displayData.amounts[0].amount / (cat.transactionCount || 1), displayData.amounts[0].currency)
                  ) : (
                    // Multiple currencies - show average for each using per-currency tx count
                    <Stack spacing={0.25} alignItems="flex-end">
                      {displayData.amounts.map(({ currency: cur, amount: amt }) => {
                        const curTxCount = cat.transactionsByCurrency?.[cur] || cat.transactionCount || 1;
                        const avgPerTx = amt / curTxCount;
                        return (
                          <Typography key={cur} variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                            {formatCurrency(avgPerTx, cur)}
                          </Typography>
                        );
                      })}
                    </Stack>
                  )}
                </TableCell>
                <TableCell align="center">
                  {sparklineData ? (
                    <MiniSparkline
                      data={sparklineData}
                      color={theme.palette.primary.main}
                    />
                  ) : (
                    <Box sx={{ width: 50, height: 20, opacity: 0.3 }}>—</Box>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
