import { useMemo, useCallback, useState } from 'react';
import { Box, Paper, Typography, Chip, useTheme, Tabs, Tab, Stack } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend, Sector } from 'recharts';
import { X } from 'lucide-react';
import { useStore } from '../../store';
import { formatCurrency, getCategoryColor } from '../../utils/formatters';
import { convertAmount } from '../../hooks/useCurrencyRates';
import { getTranslation } from '../../i18n/translations';

// Active shape for hover effect
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 4}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' }}
      />
      <text x={cx} y={cy - 10} textAnchor="middle" fill={fill} fontWeight={600} fontSize={14}>
        {payload.name}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#888" fontSize={12}>
        {((percent ?? 0) * 100).toFixed(1)}%
      </text>
    </g>
  );
};

export const CategoryPieChart = () => {
  const { parsedData, filters, setFilters, language, preferredCurrency, exchangeRates } = useStore();
  const theme = useTheme();
  const t = useMemo(() => getTranslation(language), [language]);
  const [selectedCurrencyTab, setSelectedCurrencyTab] = useState(0);

  const isConverted = preferredCurrency && exchangeRates;

  // Get all unique currencies from categories
  const currencies = useMemo(() => {
    if (!parsedData) return [];
    const currencySet = new Set<string>();
    parsedData.categories.forEach(cat => {
      Object.keys(cat.totalsByCurrency).forEach(cur => currencySet.add(cur));
    });
    return Array.from(currencySet).sort();
  }, [parsedData]);

  const selectedCurrency = currencies[selectedCurrencyTab] || parsedData?.currency || 'EUR';
  const displayCurrency = isConverted ? preferredCurrency! : selectedCurrency;

  const chartData = useMemo(() => {
    if (!parsedData) return [];

    if (isConverted) {
      // Converted: sum all currencies converted to preferred currency
      return parsedData.categories.map((cat, index) => {
        let convertedTotal = 0;
        for (const [cur, amt] of Object.entries(cat.totalsByCurrency)) {
          const conv = convertAmount(amt, cur, preferredCurrency!, exchangeRates!);
          convertedTotal += conv ?? 0;
        }
        return {
          name: cat.category,
          value: convertedTotal,
          count: cat.count,
          color: getCategoryColor(cat.category, index),
          totalsByCurrency: cat.totalsByCurrency,
        };
      }).filter(d => d.value > 0);
    }

    // Unconverted: use selected currency
    return parsedData.categories
      .map((cat, index) => ({
        name: cat.category,
        value: cat.totalsByCurrency[selectedCurrency] || 0,
        count: cat.count,
        color: getCategoryColor(cat.category, index),
      }))
      .filter(d => d.value > 0);
  }, [parsedData, isConverted, preferredCurrency, exchangeRates, selectedCurrency]);

  const handleCategoryClick = useCallback(
    (data: any) => {
      const clickedCategory = data.name;
      // Toggle: if already selected, deselect
      if (filters.category === clickedCategory) {
        setFilters({ category: null });
      } else {
        setFilters({ category: clickedCategory });
      }
    },
    [filters.category, setFilters]
  );

  const handleClearCategory = useCallback(() => {
    setFilters({ category: null });
  }, [setFilters]);

  if (!parsedData || chartData.length === 0) {
    return null;
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Paper
          sx={{
            p: 2,
            boxShadow: 3,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="subtitle2" fontWeight={600}>
            {data.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatCurrency(data.value, displayCurrency)}
          </Typography>
          {/* Show currency chips when converted */}
          {isConverted && data.totalsByCurrency && (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
              {Object.entries(data.totalsByCurrency as Record<string, number>)
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
          <Typography variant="caption" color="text.secondary">
            {data.count} {t.upload.transactionsFound}
          </Typography>
          <Typography variant="caption" display="block" sx={{ mt: 0.5, color: 'primary.main' }}>
            {t.charts.clickToFilter}
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" fontWeight={600}>
          {t.charts.categoryExpenses}
        </Typography>
        {filters.category && (
          <Chip
            label={`${t.charts.filter}: ${filters.category}`}
            size="small"
            onDelete={handleClearCategory}
            deleteIcon={<X size={14} />}
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              '& .MuiChip-deleteIcon': { color: 'white' },
            }}
          />
        )}
      </Box>
      
      {filters.category && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {t.charts.showsOnly} {filters.category}
        </Typography>
      )}

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

      <Box sx={{ height: 300, mt: 1 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              animationDuration={400}
              // @ts-expect-error Recharts supports activeIndex at runtime but the type defs don't include it
              activeIndex={filters.category ? chartData.findIndex((c) => c.name === filters.category) : undefined}
              activeShape={renderActiveShape}
              onClick={handleCategoryClick}
              style={{ cursor: 'pointer' }}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  opacity={filters.category && filters.category !== entry.name ? 0.4 : 1}
                  style={{ cursor: 'pointer', transition: filters.category ? 'opacity 0.3s ease' : 'none' }}
                />
              ))}
            </Pie>
            <ReTooltip content={<CustomTooltip />} />
            <Legend
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{ paddingTop: 15 }}
              onClick={(data) => handleCategoryClick(data)}
              formatter={(value) => (
                <span
                  style={{
                    color: filters.category === value ? theme.palette.primary.main : theme.palette.text.primary,
                    fontWeight: filters.category === value ? 600 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};
