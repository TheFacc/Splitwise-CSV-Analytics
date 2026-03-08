import React, { useState, useCallback, useMemo } from 'react';
import { Box, ToggleButton, ToggleButtonGroup, useTheme, Typography, Chip, Stack, Tabs, Tab } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import { useStore } from '../../store';
import { getTranslation } from '../../i18n/translations';
import { formatCurrency, getCategoryColor } from '../../utils/formatters';
import { convertAmount } from '../../hooks/useCurrencyRates';
import type { CategoryStats } from '../../hooks/useAnalyticsData';

interface MemberCategoryChartProps {
  memberBreakdown: { 
    category: string; 
    amount: number; 
    percentage: number;
    amountsByCurrency: Record<string, number>;
  }[];
  groupCategoryStats: CategoryStats[];
  currency: string; // Primary currency (kept for backwards compatibility)
}

/**
 * Bar chart showing member's spending by category.
 * Toggle to compare with group averages.
 * Supports multi-currency display when not converted.
 */
export const MemberCategoryChart: React.FC<MemberCategoryChartProps> = ({
  memberBreakdown,
  groupCategoryStats,
  currency,
}) => {
  const theme = useTheme();
  const { language, preferredCurrency, exchangeRates } = useStore();
  const t = useMemo(() => getTranslation(language), [language]);
  const [compareWithGroup, setCompareWithGroup] = useState(false);
  const [selectedCurrencyTab, setSelectedCurrencyTab] = useState(0);

  // Get all unique currencies from the data
  const currencies = useMemo(() => {
    const currencySet = new Set<string>();
    memberBreakdown.forEach(item => {
      Object.keys(item.amountsByCurrency).forEach(cur => currencySet.add(cur));
    });
    return Array.from(currencySet).sort();
  }, [memberBreakdown]);

  const isConverted = preferredCurrency && exchangeRates;

  // Build chart data - different logic for converted vs unconverted
  const chartData = useMemo(() => {
    if (isConverted) {
      // Calculate group totals converted to preferred currency
      let totalGroupSpending = 0;
      const groupTotals = new Map<string, number>();
      
      groupCategoryStats.forEach((cat) => {
        let convertedTotal = 0;
        for (const [cur, amt] of Object.entries(cat.amountsByCurrency || {})) {
          const conv = convertAmount(amt, cur, preferredCurrency!, exchangeRates!);
          convertedTotal += conv ?? 0;
        }
        groupTotals.set(cat.category, convertedTotal);
        totalGroupSpending += convertedTotal;
      });

      // Calculate member's total converted spending to recalculate percentages
      let totalMemberSpending = 0;
      const memberConvertedAmounts = memberBreakdown.map(item => {
        let convertedAmount = 0;
        for (const [cur, amt] of Object.entries(item.amountsByCurrency)) {
          const conv = convertAmount(amt, cur, preferredCurrency!, exchangeRates!);
          convertedAmount += conv ?? 0;
        }
        totalMemberSpending += convertedAmount;
        return convertedAmount;
      });

      // Converted mode: sum all currencies converted to preferredCurrency
      return memberBreakdown.map((item, index) => {
        const convertedAmount = memberConvertedAmounts[index];

        const groupTotal = groupTotals.get(item.category) || 0;
        const groupShare = totalGroupSpending > 0 ? (groupTotal / totalGroupSpending) * 100 : 0;
        const memberPercentage = totalMemberSpending > 0 ? (convertedAmount / totalMemberSpending) * 100 : 0;

        return {
          name: item.category,
          memberAmount: convertedAmount,
          memberPercentage: memberPercentage,
          groupPercentage: groupShare,
          color: getCategoryColor(item.category, index), // Will be overridden after sort if we want stable colors, but keeping it simple for now
          amountsByCurrency: item.amountsByCurrency, // Keep for tooltip chips
        };
      }).sort((a, b) => b.memberPercentage - a.memberPercentage).map((item, index) => ({
        ...item,
        color: getCategoryColor(item.name, index) // Re-assign color after sorting to maintain gradient
      }));
    } else {
      // Unconverted mode: use selected currency's data
      const selectedCurrency = currencies[selectedCurrencyTab] || currency;
      
      // Calculate group totals for the SELECTED currency only
      let totalGroupSpendingForCurrency = 0;
      const groupTotalsForCurrency = new Map<string, number>();
      
      groupCategoryStats.forEach((cat) => {
        const curAmt = cat.amountsByCurrency?.[selectedCurrency] || 0;
        groupTotalsForCurrency.set(cat.category, curAmt);
        totalGroupSpendingForCurrency += curAmt;
      });

      // Recalculate percentages for this currency only
      let totalForCurrency = 0;
      memberBreakdown.forEach(item => {
        totalForCurrency += item.amountsByCurrency[selectedCurrency] || 0;
      });

      return memberBreakdown
        .filter(item => (item.amountsByCurrency[selectedCurrency] || 0) > 0)
        .map((item, index) => {
          const amount = item.amountsByCurrency[selectedCurrency] || 0;
          const percentage = totalForCurrency > 0 ? (amount / totalForCurrency) * 100 : 0;

          const groupTotal = groupTotalsForCurrency.get(item.category) || 0;
          const groupShare = totalGroupSpendingForCurrency > 0 ? (groupTotal / totalGroupSpendingForCurrency) * 100 : 0;

          return {
            name: item.category,
            memberAmount: amount,
            memberPercentage: percentage,
            groupPercentage: groupShare,
            color: getCategoryColor(item.category, index),
            currency: selectedCurrency,
          };
        })
        .sort((a, b) => b.memberAmount - a.memberAmount)
        .map((item, index) => ({
          ...item,
          color: getCategoryColor(item.name, index)
        }));
    }
  }, [memberBreakdown, groupCategoryStats, isConverted, preferredCurrency, exchangeRates, currencies, selectedCurrencyTab, currency]);

  const handleToggle = useCallback(
    (_: React.MouseEvent<HTMLElement>, value: boolean | null) => {
      if (value !== null) setCompareWithGroup(value);
    },
    []
  );

  const displayCurrency = isConverted 
    ? preferredCurrency! 
    : (currencies[selectedCurrencyTab] || currency);

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
          <Box sx={{ fontWeight: 600, mb: 0.5 }}>{data.name}</Box>
          <Box sx={{ fontSize: '0.875rem', color: '#48be9d', fontWeight: 600 }}>
            {formatCurrency(data.memberAmount, displayCurrency)} ({data.memberPercentage.toFixed(1)}%)
          </Box>
          {/* Show currency chips when converted */}
          {isConverted && data.amountsByCurrency && (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
              {Object.entries(data.amountsByCurrency as Record<string, number>)
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
          {compareWithGroup && (
            <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.5 }}>
              {t.charts.groupOverall}: {data.groupPercentage.toFixed(1)}%
            </Box>
          )}
        </Box>
      );
    }
    return null;
  };

  if (chartData.length === 0 && memberBreakdown.length === 0) {
    return (
      <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box color="text.secondary">{t.charts.noData}</Box>
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

      {/* Toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        <ToggleButtonGroup
          value={compareWithGroup}
          exclusive
          onChange={handleToggle}
          size="small"
        >
          <ToggleButton value={false} sx={{ px: 1.5, py: 0.5, fontSize: '0.7rem' }}>
            {t.charts.memberOnly}
          </ToggleButton>
          <ToggleButton value={true} sx={{ px: 1.5, py: 0.5, fontSize: '0.7rem' }}>
            {t.charts.compareGroup}
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {chartData.length === 0 ? (
        <Box sx={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {t.analytics.noDataForThisCurrency}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ height: Math.max(220, chartData.length * (compareWithGroup ? 45 : 30)) }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
              layout="vertical"
            >
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: theme.palette.text.secondary }}
                tickFormatter={(v) => `${v.toFixed(0)}%`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: theme.palette.text.primary }}
                width={80}
                tickLine={false}
                axisLine={false}
                interval={0}
              />
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={false} 
                isAnimationActive={false}
              />
              <Bar 
                dataKey="memberPercentage" 
                name={t.charts.member} 
                radius={[0, 4, 4, 0]}
                activeBar={{ style: { filter: 'brightness(1.2)' } }}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
              {compareWithGroup && (
                <Bar
                  dataKey="groupPercentage"
                  name={t.charts.group}
                  fill={theme.palette.grey[400]}
                  radius={[0, 4, 4, 0]}
                  opacity={0.5}
                  activeBar={{ style: { filter: 'brightness(1.2)' } }}
                />
              )}
              {compareWithGroup && <Legend wrapperStyle={{ fontSize: '0.7rem' }} />}
            </BarChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Box>
  );
};
