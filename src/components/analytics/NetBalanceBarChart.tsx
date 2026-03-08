import React, { useMemo, useState } from 'react';
import { Box, useTheme, Tabs, Tab, Chip, Stack } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { useStore } from '../../store';
import { getTranslation } from '../../i18n/translations';
import { formatCurrency } from '../../utils/formatters';
import { convertAmount } from '../../hooks/useCurrencyRates';
import { AllMembersNetBalance } from '../../hooks/useAnalyticsData';

interface NetBalanceBarChartProps {
  memberBalances: AllMembersNetBalance[];
  currency: string;
}

/**
 * Horizontal bar chart showing each member's net balance.
 * Sorted from highest creditor to highest debtor.
 * Green for positive (creditor), red for negative (debtor).
 * Supports multi-currency with tabs when not converted.
 */
export const NetBalanceBarChart: React.FC<NetBalanceBarChartProps> = ({
  memberBalances,
  currency,
}) => {
  const theme = useTheme();
  const { language, preferredCurrency, exchangeRates } = useStore();
  const t = useMemo(() => getTranslation(language), [language]);
  const [selectedCurrencyTab, setSelectedCurrencyTab] = useState(0);

  const positiveColor = '#48be9d'; // Splitwise mint
  const negativeColor = '#e74c3c'; // Soft red

  const isConverted = preferredCurrency && exchangeRates;

  // Get all unique currencies from the data
  const currencies = useMemo(() => {
    const currencySet = new Set<string>();
    memberBalances.forEach(m => {
      Object.keys(m.netBalanceByCurrency).forEach(cur => currencySet.add(cur));
    });
    return Array.from(currencySet).sort();
  }, [memberBalances]);

  const selectedCurrency = currencies[selectedCurrencyTab] || currency;
  const displayCurrency = isConverted ? preferredCurrency! : selectedCurrency;

  const chartData = useMemo(() => {
    if (isConverted) {
      // Convert all currencies to preferred currency
      return memberBalances.map((m) => {
        let convertedBalance = 0;
        for (const [cur, amt] of Object.entries(m.netBalanceByCurrency)) {
          const conv = convertAmount(amt, cur, preferredCurrency!, exchangeRates!);
          convertedBalance += conv ?? 0;
        }
        return {
          name: m.name,
          balance: convertedBalance,
          fill: convertedBalance >= 0 ? positiveColor : negativeColor,
          netBalanceByCurrency: m.netBalanceByCurrency, // Keep for tooltip chips
        };
      }).sort((a, b) => b.balance - a.balance);
    } else {
      // Use selected currency's balances
      return memberBalances
        .map((m) => {
          const balance = m.netBalanceByCurrency[selectedCurrency] || 0;
          return {
            name: m.name,
            balance,
            fill: balance >= 0 ? positiveColor : negativeColor,
          };
        })
        .filter(m => m.balance !== 0)
        .sort((a, b) => b.balance - a.balance);
    }
  }, [memberBalances, isConverted, preferredCurrency, exchangeRates, selectedCurrency]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isPositive = data.balance >= 0;
      return (
        <Box
          sx={{
            animation: 'zoomIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            '@keyframes zoomIn': {
              '0%': { opacity: 0, transform: 'scale(0.95)' },
              '100%': { opacity: 1, transform: 'scale(1)' },
            },
            bgcolor: 'background.paper',
            p: 1.5,
            borderRadius: 1,
            boxShadow: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ fontWeight: 600, mb: 0.5 }}>{data.name}</Box>
          <Box
            sx={{
              fontSize: '0.875rem',
              color: isPositive ? positiveColor : negativeColor,
              fontWeight: 600,
            }}
          >
            {isPositive ? '+' : ''}
            {formatCurrency(data.balance, displayCurrency)}
          </Box>
          {/* Show currency chips when converted */}
          {isConverted && data.netBalanceByCurrency && (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
              {Object.entries(data.netBalanceByCurrency as Record<string, number>)
                .filter(([_, amt]) => amt !== 0)
                .map(([cur, amt]) => (
                  <Chip
                    key={cur}
                    label={`${(amt as number) >= 0 ? '+' : ''}${formatCurrency(amt as number, cur)}`}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.6rem', height: 18 }}
                  />
                ))}
            </Stack>
          )}
          <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.25 }}>
            {isPositive
              ? language === 'it'
                ? 'Creditore'
                : 'Creditor'
              : language === 'it'
              ? 'Debitore'
              : 'Debtor'}
          </Box>
        </Box>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box color="text.secondary">{t.charts.noData}</Box>
      </Box>
    );
  }

  const chartHeight = Math.max(200, chartData.length * 40);

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
            mb: 1,
            '& .MuiTab-root': { minHeight: 32, py: 0.5, fontSize: '0.75rem' }
          }}
        >
          {currencies.map((cur) => (
            <Tab key={cur} label={cur} />
          ))}
        </Tabs>
      )}

      <Box sx={{ height: chartHeight, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <XAxis
              type="number"
              tickFormatter={(v) => formatCurrency(v, displayCurrency)}
              tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
              axisLine={{ stroke: theme.palette.divider }}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12, fill: theme.palette.text.primary }}
              width={80}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ fill: 'rgba(0,0,0,0.05)' }} 
              isAnimationActive={false}
            />
            <ReferenceLine x={0} stroke={theme.palette.divider} strokeWidth={1} />
            <Bar dataKey="balance" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};
