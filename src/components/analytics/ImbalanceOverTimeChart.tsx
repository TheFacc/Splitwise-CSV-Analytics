import React, { useMemo, useState } from 'react';
import { Box, useTheme, Tabs, Tab, Chip, Stack, Typography } from '@mui/material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useStore } from '../../store';
import { getTranslation } from '../../i18n/translations';
import { formatCurrency } from '../../utils/formatters';
import { convertAmount } from '../../hooks/useCurrencyRates';

interface ImbalanceOverTimeChartProps {
  imbalanceOverTime: { 
    date: string; 
    imbalance: number;
    imbalanceByCurrency: Record<string, number>;
  }[];
  currency: string;
  currencies?: string[];
}

/**
 * Line/area chart showing total outstanding imbalance over time.
 * Supports multi-currency with tabs when not converted.
 */
export const ImbalanceOverTimeChart: React.FC<ImbalanceOverTimeChartProps> = ({
  imbalanceOverTime,
  currency,
  currencies: propCurrencies,
}) => {
  const theme = useTheme();
  const { language, preferredCurrency, exchangeRates } = useStore();
  const t = useMemo(() => getTranslation(language), [language]);
  const [selectedCurrencyTab, setSelectedCurrencyTab] = useState(0);

  // Get all unique currencies from the data
  const currencies = useMemo(() => {
    if (propCurrencies && propCurrencies.length > 0) return propCurrencies;
    const currencySet = new Set<string>();
    imbalanceOverTime.forEach(item => {
      Object.keys(item.imbalanceByCurrency).forEach(cur => currencySet.add(cur));
    });
    return Array.from(currencySet).sort();
  }, [imbalanceOverTime, propCurrencies]);

  const isConverted = preferredCurrency && exchangeRates;
  const selectedCurrency = currencies[selectedCurrencyTab] || currency;
  const displayCurrency = isConverted ? preferredCurrency! : selectedCurrency;

  // Aggregate by month for cleaner visualization
  const chartData = useMemo(() => {
    const monthlyMap = new Map<string, { 
      imbalance: number; 
      imbalanceByCurrency: Record<string, number> 
    }>();

    imbalanceOverTime.forEach(({ date, imbalance, imbalanceByCurrency }) => {
      const month = date.slice(0, 7); // "YYYY-MM"
      // Keep the latest imbalance for each month
      monthlyMap.set(month, { imbalance, imbalanceByCurrency });
    });

    const entries = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b));

    if (isConverted) {
      // Convert all currencies to preferred currency
      return entries.map(([month, data]) => {
        let convertedImbalance = 0;
        for (const [cur, amt] of Object.entries(data.imbalanceByCurrency)) {
          const conv = convertAmount(amt, cur, preferredCurrency!, exchangeRates!);
          convertedImbalance += conv ?? 0;
        }
        return {
          month,
          displayMonth: month.slice(2),
          imbalance: convertedImbalance,
          imbalanceByCurrency: data.imbalanceByCurrency,
        };
      });
    } else {
      // Use selected currency's imbalance
      return entries.map(([month, data]) => ({
        month,
        displayMonth: month.slice(2),
        imbalance: data.imbalanceByCurrency[selectedCurrency] || 0,
      }));
    }
  }, [imbalanceOverTime, isConverted, preferredCurrency, exchangeRates, selectedCurrency]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
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
          <Box sx={{ fontWeight: 600, mb: 0.5, fontSize: '0.875rem' }}>
            {data.month}
          </Box>
          <Box sx={{ fontSize: '0.875rem', color: '#ff652f', fontWeight: 600 }}>
            {formatCurrency(data.imbalance, displayCurrency)}
          </Box>
          {/* Show currency chips when converted */}
          {isConverted && data.imbalanceByCurrency && (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
              {Object.entries(data.imbalanceByCurrency as Record<string, number>)
                .filter(([_, amt]) => amt > 0)
                .map(([cur, amt]) => (
                  <Chip
                    key={cur}
                    label={formatCurrency(amt as number, cur)}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.6rem', height: 18 }}
                  />
                ))}
            </Stack>
          )}
          <Box sx={{ fontSize: '0.7rem', color: 'text.secondary', mt: 0.25 }}>
            {t.analytics.totalImbalance}
          </Box>
        </Box>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <Box sx={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {t.charts.noData}
        </Typography>
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
            mb: 1,
            '& .MuiTab-root': { minHeight: 32, py: 0.5, fontSize: '0.75rem' }
          }}
        >
          {currencies.map((cur) => (
            <Tab key={cur} label={cur} />
          ))}
        </Tabs>
      )}

      <Box sx={{ height: 180, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="imbalanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff652f" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#ff652f" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="displayMonth"
              tick={{ fontSize: 10, fill: theme.palette.text.secondary }}
              tickLine={false}
              axisLine={{ stroke: theme.palette.divider }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: theme.palette.text.secondary }}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
              width={45}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip 
              content={<CustomTooltip />} 
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="imbalance"
              stroke="#ff652f"
              strokeWidth={2}
              fill="url(#imbalanceGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};
