import { useMemo, useState } from 'react';
import { Box, Paper, Typography, useTheme, Tabs, Tab, Chip, Stack } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useStore } from '../../store';
import { formatCurrency } from '../../utils/formatters';
import { convertAmount } from '../../hooks/useCurrencyRates';
import { getTranslation } from '../../i18n/translations';

export const MonthlyTrendChart = () => {
  const { parsedData, language, preferredCurrency, exchangeRates } = useStore();
  const theme = useTheme();
  const t = useMemo(() => getTranslation(language), [language]);
  const [selectedCurrencyTab, setSelectedCurrencyTab] = useState(0);

  const isConverted = preferredCurrency && exchangeRates;

  // Get all currencies from the monthly data
  const currencies = useMemo(() => {
    if (!parsedData) return [];
    const currencySet = new Set<string>();
    parsedData.monthlyData.forEach(item => {
      Object.keys(item.spendingByCurrency).forEach(cur => currencySet.add(cur));
      Object.keys(item.transfersByCurrency).forEach(cur => currencySet.add(cur));
    });
    return Array.from(currencySet).sort();
  }, [parsedData]);

  const selectedCurrency = currencies[selectedCurrencyTab] || parsedData?.currency || 'EUR';
  const displayCurrency = isConverted ? preferredCurrency! : selectedCurrency;

  const chartData = useMemo(() => {
    if (!parsedData) return [];

    return parsedData.monthlyData.map((item) => {
      let spending: number;
      let transfers: number;

      if (isConverted) {
        // Convert all currencies to preferred currency
        spending = 0;
        transfers = 0;
        for (const [cur, amt] of Object.entries(item.spendingByCurrency)) {
          const conv = convertAmount(amt, cur, preferredCurrency!, exchangeRates!);
          spending += conv ?? 0;
        }
        for (const [cur, amt] of Object.entries(item.transfersByCurrency)) {
          const conv = convertAmount(amt, cur, preferredCurrency!, exchangeRates!);
          transfers += conv ?? 0;
        }
      } else {
        // Use selected currency
        spending = item.spendingByCurrency[selectedCurrency] || 0;
        transfers = item.transfersByCurrency[selectedCurrency] || 0;
      }

      return {
        month: item.month,
        displayMonth: formatMonthLabel(item.month, language),
        spending,
        transfers,
        // Keep per-currency data for tooltip chips when converted
        spendingByCurrency: item.spendingByCurrency,
        transfersByCurrency: item.transfersByCurrency,
      };
    });
  }, [parsedData, isConverted, preferredCurrency, exchangeRates, selectedCurrency, language]);

  if (!parsedData || chartData.length === 0) {
    return null;
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Paper
          sx={{
            animation: 'zoomIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            '@keyframes zoomIn': {
              '0%': { opacity: 0, transform: 'scale(0.95)' },
              '100%': { opacity: 1, transform: 'scale(1)' },
            },
            p: 2,
            boxShadow: 3,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            {label}
          </Typography>
          {payload.map((entry: any, index: number) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: entry.color,
                }}
              />
              <Typography variant="body2">
                {entry.name}: {formatCurrency(entry.value, displayCurrency)}
              </Typography>
            </Box>
          ))}
          {/* Show currency chips when converted */}
          {isConverted && payload[0]?.payload && (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
              {Object.entries(payload[0].payload.spendingByCurrency as Record<string, number>)
                .filter(([_, amt]) => amt > 0)
                .map(([cur, amt]) => (
                  <Chip
                    key={`s-${cur}`}
                    label={`${t.charts.spese}: ${formatCurrency(amt as number, cur)}`}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.55rem', height: 18 }}
                  />
                ))}
            </Stack>
          )}
        </Paper>
      );
    }
    return null;
  };

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        {t.charts.monthlyTrend}
      </Typography>

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

      <Box sx={{ height: 320, mt: 2 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={theme.palette.divider}
              vertical={false}
            />
            <XAxis
              dataKey="displayMonth"
              tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
              axisLine={{ stroke: theme.palette.divider }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) =>
                value >= 1000
                  ? `${(value / 1000).toFixed(0)}k`
                  : value.toString()
              }
            />
            <Tooltip 
              content={<CustomTooltip />} 
              isAnimationActive={false}
            />
            <Legend
              wrapperStyle={{ paddingTop: 20 }}
              formatter={(value) => (
                <span style={{ color: theme.palette.text.primary }}>{value}</span>
              )}
            />
            <Bar
              dataKey="spending"
              name={t.charts.spese}
              fill="#48be9d"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="transfers"
              name={t.charts.trasferimenti}
              fill="#ff652f"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

// Helper to format month label
const formatMonthLabel = (monthStr: string, language: string): string => {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month, 10) - 1, 1);
  return date.toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US', { month: 'short', year: '2-digit' });
};
