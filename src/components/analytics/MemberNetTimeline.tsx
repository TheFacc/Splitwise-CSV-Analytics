import React, { useMemo, useState } from 'react';
import { Box, useTheme, Tabs, Tab, Chip, Stack, Typography } from '@mui/material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useStore } from '../../store';
import { getTranslation } from '../../i18n/translations';
import { formatCurrency } from '../../utils/formatters';
import { convertAmount } from '../../hooks/useCurrencyRates';

interface MemberNetTimelineProps {
  monthlyNet: { 
    month: string; 
    cumulative: number;
    cumulativeByCurrency: Record<string, number>;
  }[];
  currency: string;
}

/**
 * Area chart showing member's cumulative net position over time.
 * Supports multi-currency with tabs when not converted.
 */
export const MemberNetTimeline: React.FC<MemberNetTimelineProps> = ({
  monthlyNet,
  currency,
}) => {
  const theme = useTheme();
  const { language, preferredCurrency, exchangeRates } = useStore();
  const t = useMemo(() => getTranslation(language), [language]);
  const [selectedCurrencyTab, setSelectedCurrencyTab] = useState(0);

  // Get all unique currencies from the data
  const currencies = useMemo(() => {
    const currencySet = new Set<string>();
    monthlyNet.forEach(item => {
      Object.keys(item.cumulativeByCurrency).forEach(cur => currencySet.add(cur));
    });
    return Array.from(currencySet).sort();
  }, [monthlyNet]);

  const isConverted = preferredCurrency && exchangeRates;
  const selectedCurrency = currencies[selectedCurrencyTab] || currency;

  const chartData = useMemo(() => {
    if (isConverted) {
      // Convert all currencies to preferred currency
      return monthlyNet.map((d) => {
        let convertedCumulative = 0;
        for (const [cur, amt] of Object.entries(d.cumulativeByCurrency)) {
          const conv = convertAmount(amt, cur, preferredCurrency!, exchangeRates!);
          convertedCumulative += conv ?? 0;
        }
        return {
          ...d,
          displayMonth: d.month.slice(2),
          cumulative: convertedCumulative,
        };
      });
    } else {
      // Use selected currency's cumulative
      return monthlyNet.map((d) => ({
        ...d,
        displayMonth: d.month.slice(2),
        cumulative: d.cumulativeByCurrency[selectedCurrency] || 0,
      }));
    }
  }, [monthlyNet, isConverted, preferredCurrency, exchangeRates, selectedCurrency]);

  // Determine gradient based on final value 
  const finalValue = chartData.length > 0 ? chartData[chartData.length - 1].cumulative : 0;
  const isPositive = finalValue >= 0;
  const gradientColor = isPositive ? '#48be9d' : '#e74c3c';
  const displayCurrency = isConverted ? preferredCurrency! : selectedCurrency;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const value = data.cumulative;
      const positive = value >= 0;
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
          <Box sx={{ fontWeight: 600, fontSize: '0.875rem', mb: 0.5 }}>
            {data.month}
          </Box>
          <Box
            sx={{
              fontSize: '0.875rem',
              color: positive ? '#48be9d' : '#e74c3c',
              fontWeight: 600,
            }}
          >
            {positive ? '+' : ''}
            {formatCurrency(value, displayCurrency)}
          </Box>
          {/* Show currency chips when converted */}
          {isConverted && data.cumulativeByCurrency && (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
              {Object.entries(data.cumulativeByCurrency as Record<string, number>)
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
          <Box sx={{ fontSize: '0.7rem', color: 'text.secondary', mt: 0.25 }}>
            {t.analytics.cumulativeBalance}
          </Box>
        </Box>
      );
    }
    return null;
  };

  if (chartData.length === 0 || (chartData.every(d => d.cumulative === 0) && !isConverted)) {
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
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="memberNetGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={gradientColor} stopOpacity={0.4} />
                <stop offset="100%" stopColor={gradientColor} stopOpacity={0.05} />
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
              tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
              width={45}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip 
              content={<CustomTooltip />} 
              isAnimationActive={false}
            />
            <ReferenceLine y={0} stroke={theme.palette.divider} strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke={gradientColor}
              strokeWidth={2}
              fill="url(#memberNetGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};
