import React, { useMemo, useState, useCallback, useRef } from 'react';
import { Box, ToggleButton, ToggleButtonGroup, Typography, Chip, Stack, Popper, Paper } from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Sector,
} from 'recharts';
import { useStore } from '../../store';
import { getTranslation } from '../../i18n/translations';
import { formatCurrency, getCategoryColor } from '../../utils/formatters';
import { convertAmount } from '../../hooks/useCurrencyRates';
import { CategoryStats } from '../../hooks/useAnalyticsData';

interface CategoryBreakdownChartProps {
  categoryStats: CategoryStats[];
  currency: string;
}

type ViewMode = 'amount' | 'count';

// Active shape for hover effect - zoom outward from center, show ONLY percentage
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, percent } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 3}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' }}
      />
      {/* Show percentage at center */}
      <text x={cx} y={cy + 4} textAnchor="middle" fill="#888" fontWeight={600} fontSize={12}>
        {((percent ?? 0) * 100).toFixed(1)}%
      </text>
    </g>
  );
};


/**
 * Donut chart showing category breakdown.
 * Multi-currency support with consistent styling.
 */
export const CategoryBreakdownChart: React.FC<CategoryBreakdownChartProps> = ({
  categoryStats,
  currency,
}) => {
  const { language, preferredCurrency, exchangeRates } = useStore();
  const t = useMemo(() => getTranslation(language), [language]);
  const [viewMode, setViewMode] = useState<ViewMode>('amount');
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [tooltipAnchor, setTooltipAnchor] = useState<HTMLElement | null>(null);
  const chipRefs = useRef<Map<string, HTMLElement>>(new Map());

  const isConversionActive = preferredCurrency && exchangeRates;
  
  const allCurrencies = useMemo(() => {
    const currencies = new Set<string>();
    categoryStats.forEach(cat => {
      Object.keys(cat.amountsByCurrency || {}).forEach(cur => currencies.add(cur));
    });
    return Array.from(currencies).sort();
  }, [categoryStats]);

  const hasMultipleCurrencies = allCurrencies.length > 1;

  // Generate chart data
  const chartDataByCurrency = useMemo(() => {
    if (viewMode === 'count') {
      return [{
        currency: 'count',
        data: categoryStats.map((cat, index) => ({
          name: cat.category,
          value: cat.transactionCount,
          color: getCategoryColor(cat.category, index),
          amount: cat.totalAmount,
          count: cat.transactionCount,
          amountsByCurrency: cat.amountsByCurrency,
          transactionsByCurrency: cat.transactionsByCurrency || {},
          originalIndex: index,
        }))
      }];
    }

    if (!hasMultipleCurrencies || isConversionActive) {
      const data = categoryStats.map((cat, index) => {
        let displayAmount = cat.totalAmount;
        
        if (isConversionActive && cat.amountsByCurrency) {
          displayAmount = 0;
          for (const [cur, amt] of Object.entries(cat.amountsByCurrency)) {
            const converted = convertAmount(amt, cur, preferredCurrency!, exchangeRates!);
            if (converted !== null) {
              displayAmount += converted;
            }
          }
        }
        
        return {
          name: cat.category,
          value: displayAmount,
          color: getCategoryColor(cat.category, index),
          amount: displayAmount,
          count: cat.transactionCount,
          amountsByCurrency: cat.amountsByCurrency,
          transactionsByCurrency: cat.transactionsByCurrency || {},
          displayCurrency: isConversionActive ? preferredCurrency! : 
            (Object.keys(cat.amountsByCurrency || {})[0] || currency),
          originalIndex: index,
        };
      });
      
      return [{
        currency: isConversionActive ? preferredCurrency! : (allCurrencies[0] || currency),
        data,
      }];
    }

    // Multiple currencies without conversion - separate chart per currency
    return allCurrencies.map((cur) => ({
      currency: cur,
      data: categoryStats
        .filter(cat => cat.amountsByCurrency?.[cur])
        .map((cat) => ({
          name: cat.category,
          value: cat.amountsByCurrency[cur] || 0,
          color: getCategoryColor(cat.category, categoryStats.findIndex(c => c.category === cat.category)),
          amount: cat.amountsByCurrency[cur] || 0,
          count: cat.transactionsByCurrency?.[cur] || 0,
          amountsByCurrency: cat.amountsByCurrency,
          transactionsByCurrency: cat.transactionsByCurrency || {},
          displayCurrency: cur,
          originalIndex: categoryStats.findIndex(c => c.category === cat.category),
        })),
    }));
  }, [categoryStats, viewMode, hasMultipleCurrencies, isConversionActive, preferredCurrency, exchangeRates, allCurrencies, currency]);

  const handleModeChange = useCallback(
    (_: React.MouseEvent<HTMLElement>, newMode: ViewMode | null) => {
      if (newMode) setViewMode(newMode);
    },
    []
  );

  // Get data for hovered category (for tooltip)
  const hoveredCategoryData = useMemo(() => {
    if (!hoveredCategory) return null;
    const cat = categoryStats.find(c => c.category === hoveredCategory);
    if (!cat) return null;
    
    return {
      name: cat.category,
      amountsByCurrency: cat.amountsByCurrency,
      transactionsByCurrency: cat.transactionsByCurrency || {},
      totalCount: cat.transactionCount,
    };
  }, [hoveredCategory, categoryStats]);

  // Get all unique categories for the legend
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    chartDataByCurrency.forEach(({ data }) => {
      data.forEach(d => cats.add(d.name));
    });
    return Array.from(cats);
  }, [chartDataByCurrency]);

  // Find if a category is currently hovered to highlight its slice
  const getActiveIndexForCategory = (chartData: any[], category: string | null) => {
    if (!category) return -1;
    return chartData.findIndex(d => d.name === category);
  };

  const handleChipMouseEnter = (category: string, event: React.MouseEvent<HTMLElement>) => {
    setHoveredCategory(category);
    setTooltipAnchor(event.currentTarget);
  };

  const handleChipMouseLeave = () => {
    setHoveredCategory(null);
    setTooltipAnchor(null);
  };

  const handleSliceMouseEnter = (category: string) => {
    setHoveredCategory(category);
    // For slice hover, use the chip as anchor if available
    const chipEl = chipRefs.current.get(category);
    setTooltipAnchor(chipEl || null);
  };

  const handleSliceMouseLeave = () => {
    setHoveredCategory(null);
    setTooltipAnchor(null);
  };

  if (categoryStats.length === 0) {
    return (
      <Box sx={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box color="text.secondary">{t.charts.noData}</Box>
      </Box>
    );
  }

  return (
    <Box>
      {/* Toggle */}
      <Box sx={{ display: 'flex', justifyContent: { xs: 'center', sm: 'flex-end' }, mb: 1 }}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleModeChange}
          size="small"
        >
          <ToggleButton value="amount" sx={{ px: 1.5, py: 0.5, fontSize: '0.75rem' }}>
            {t.charts.amount}
          </ToggleButton>
          <ToggleButton value="count" sx={{ px: 1.5, py: 0.5, fontSize: '0.75rem' }}>
            {t.charts.count}
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Charts */}
      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: 2,
        justifyContent: chartDataByCurrency.length > 1 ? 'space-around' : 'center',
      }}>
        {chartDataByCurrency.map(({ currency: chartCurrency, data }) => {
          const activeIdx = hoveredCategory 
            ? getActiveIndexForCategory(data, hoveredCategory)
            : activeIndex;
          
          return (
            <Box key={chartCurrency} sx={{ flex: chartDataByCurrency.length > 1 ? '1 1 45%' : '1 1 100%', minWidth: 200 }}>
              {chartDataByCurrency.length > 1 && chartCurrency !== 'count' && (
                <Typography variant="subtitle2" fontWeight={600} textAlign="center" sx={{ mb: 0.5 }}>
                  {chartCurrency}
                </Typography>
              )}
              <Box sx={{ height: chartDataByCurrency.length > 1 ? 180 : 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      innerRadius={chartDataByCurrency.length > 1 ? 30 : 45}
                      outerRadius={chartDataByCurrency.length > 1 ? 55 : 75}
                      paddingAngle={2}
                      dataKey="value"
                      animationDuration={400}
                      activeShape={activeIdx >= 0 ? renderActiveShape : undefined}
                      onMouseEnter={(_, index) => {
                        setActiveIndex(index);
                        handleSliceMouseEnter(data[index]?.name || '');
                      }}
                      onMouseLeave={() => {
                        setActiveIndex(-1);
                        handleSliceMouseLeave();
                      }}
                    >
                      {data.map((entry, index) => {
                        const isActive = hoveredCategory === entry.name || activeIdx === index;
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            style={{ 
                              cursor: 'default', 
                              transition: hoveredCategory ? 'none' : 'opacity 0.15s ease',
                              opacity: hoveredCategory && !isActive ? 0.4 : 1,
                            }}
                          />
                        );
                      })}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          );
        })}
      </Box>
      
      {/* Unified Legend - show ALL chips, no +N */}
      <Stack 
        direction="row" 
        spacing={0.5} 
        flexWrap="wrap" 
        useFlexGap
        justifyContent="center" 
        sx={{ mt: 1.5 }}
      >
        {allCategories.map((category) => {
          const index = categoryStats.findIndex(c => c.category === category);
          const color = getCategoryColor(category, index);
          const isHovered = hoveredCategory === category;
          
          return (
            <Chip
              key={category}
              ref={(el) => {
                if (el) chipRefs.current.set(category, el);
              }}
              label={category}
              size="small"
              onMouseEnter={(e) => handleChipMouseEnter(category, e)}
              onMouseLeave={handleChipMouseLeave}
              sx={{
                bgcolor: color,
                color: 'white',
                fontSize: '0.65rem',
                height: 22,
                cursor: 'default',
                boxShadow: isHovered ? 2 : 0,
                '&:hover': {
                  bgcolor: color,
                },
              }}
            />
          );
        })}
      </Stack>

      {/* Custom Tooltip (appears on both slice and chip hover) */}
      <Popper
        open={Boolean(hoveredCategory && tooltipAnchor)}
        anchorEl={tooltipAnchor}
        placement="top"
        sx={{ zIndex: 1500, pointerEvents: 'none' }}
        modifiers={[
          { name: 'offset', options: { offset: [0, 8] } },
        ]}
      >
        {hoveredCategoryData && (
          <Paper
            sx={{
              p: 1.5,
              borderRadius: 1,
              boxShadow: 3,
              maxWidth: 250,
            }}
          >
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
              {hoveredCategoryData.name}
            </Typography>
            <Stack spacing={0.25}>
              {Object.entries(hoveredCategoryData.amountsByCurrency || {}).map(([cur, amt]) => {
                const txCount = hoveredCategoryData.transactionsByCurrency[cur] || 0;
                return (
                  <Box key={cur} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                      {formatCurrency(amt as number, cur)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      {txCount} {'tx'}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          </Paper>
        )}
      </Popper>
    </Box>
  );
};
