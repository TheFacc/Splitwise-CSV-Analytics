import React, { useState, useMemo } from 'react';
import { Box, useTheme, Tabs, Tab, Chip, Stack, Typography } from '@mui/material';
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

interface CounterpartyBreakdownProps {
  flows: { 
    member: string; 
    netFlow: number;
    netFlowByCurrency: Record<string, number>;
  }[];
  currency: string;
}

/**
 * Horizontal bar chart showing net flow with each other member.
 * Positive = selected member is owed by that person.
 * Negative = selected member owes that person.
 * Supports multi-currency with tabs when not converted.
 */
export const CounterpartyBreakdown: React.FC<CounterpartyBreakdownProps> = ({
  flows,
  currency,
}) => {
  const theme = useTheme();
  const { language, preferredCurrency, exchangeRates } = useStore();
  const t = useMemo(() => getTranslation(language), [language]);
  const [selectedCurrencyTab, setSelectedCurrencyTab] = useState(0);

  const positiveColor = '#48be9d';
  const negativeColor = '#e74c3c';

  // Get all unique currencies from the data
  const currencies = useMemo(() => {
    const currencySet = new Set<string>();
    flows.forEach(item => {
      Object.keys(item.netFlowByCurrency).forEach(cur => currencySet.add(cur));
    });
    return Array.from(currencySet).sort();
  }, [flows]);

  const isConverted = preferredCurrency && exchangeRates;
  const selectedCurrency = currencies[selectedCurrencyTab] || currency;
  const displayCurrency = isConverted ? preferredCurrency! : selectedCurrency;

  const chartData = useMemo(() => {
    if (isConverted) {
      // Convert all currencies to preferred currency
      return flows.map((f) => {
        let convertedFlow = 0;
        for (const [cur, amt] of Object.entries(f.netFlowByCurrency)) {
          const conv = convertAmount(amt, cur, preferredCurrency!, exchangeRates!);
          convertedFlow += conv ?? 0;
        }
        return {
          name: f.member,
          flow: convertedFlow,
          fill: convertedFlow >= 0 ? positiveColor : negativeColor,
          netFlowByCurrency: f.netFlowByCurrency, // Keep for tooltip chips
        };
      }).filter(f => f.flow !== 0);
    } else {
      // Use selected currency's flows only
      return flows
        .filter(f => (f.netFlowByCurrency[selectedCurrency] || 0) !== 0)
        .map((f) => {
          const flow = f.netFlowByCurrency[selectedCurrency] || 0;
          return {
            name: f.member,
            flow,
            fill: flow >= 0 ? positiveColor : negativeColor,
          };
        });
    }
  }, [flows, isConverted, preferredCurrency, exchangeRates, selectedCurrency]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isPositive = data.flow >= 0;
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
            {formatCurrency(data.flow, displayCurrency)}
          </Box>
          {/* Show currency chips when converted */}
          {isConverted && data.netFlowByCurrency && (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
              {Object.entries(data.netFlowByCurrency as Record<string, number>)
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
            {isPositive
              ? language === 'it'
                ? 'Ti deve'
                : 'Owes you'
              : language === 'it'
              ? 'Gli devi'
              : 'You owe'}
          </Box>
        </Box>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <Box sx={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {t.analytics.noFlowsWithOtherMembers}
        </Typography>
      </Box>
    );
  }

  const chartHeight = Math.max(120, chartData.length * 35);

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
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <XAxis
              type="number"
              tickFormatter={(v) => formatCurrency(v, displayCurrency)}
              tick={{ fontSize: 10, fill: theme.palette.text.secondary }}
              axisLine={{ stroke: theme.palette.divider }}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: theme.palette.text.primary }}
              width={70}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ fill: 'rgba(0,0,0,0.05)' }} 
              isAnimationActive={false}
            />
            <ReferenceLine x={0} stroke={theme.palette.divider} />
            <Bar dataKey="flow" radius={[0, 4, 4, 0]}>
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
