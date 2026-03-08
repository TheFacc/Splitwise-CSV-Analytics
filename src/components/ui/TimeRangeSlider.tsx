import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
  Chip,
  useTheme,
  Tooltip as MuiTooltip,
} from '@mui/material';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Brush,
  ReferenceArea,
} from 'recharts';
import { Calendar, Clock, BarChart2, TrendingUp } from 'lucide-react';
import { useStore } from '../../store';
import { formatCurrency } from '../../utils/formatters';
import { useCurrencyRates, convertAmount } from '../../hooks/useCurrencyRates';
import { getTranslation } from '../../i18n/translations';
import type { TimeGrouping, Transaction } from '../../types';

interface TimeDataPoint {
  key: string;
  label: string;
  timestamp: number;
  count: number;
  value: number; // Expense total (should be normalized to USD for chart)
  transferValue: number; // Transfer total (should be normalized to USD for chart)
  valuesByCurrency: Record<string, number>; // Per-currency expense totals (original amounts)
  transfersByCurrency: Record<string, number>; // Per-currency transfer totals (original amounts)
}

// Helper to get week number
const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

// Generate all time periods between min and max dates
const generateAllPeriods = (
  minDate: Date,
  maxDate: Date,
  grouping: TimeGrouping
): Map<string, { timestamp: number; label: string }> => {
  const periods = new Map<string, { timestamp: number; label: string }>();
  const current = new Date(minDate);
  
  // Reset to start of period
  if (grouping === 'daily') {
    current.setHours(0, 0, 0, 0);
  } else if (grouping === 'weekly') {
    // Go to start of week (Monday)
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    current.setDate(diff);
    current.setHours(0, 0, 0, 0);
  } else {
    // Monthly - go to start of month
    current.setDate(1);
    current.setHours(0, 0, 0, 0);
  }

  while (current <= maxDate) {
    let key: string;
    let label: string;
    
    // For labels, we use en-US to make it standardized, but we can localize if needed.
    // Actually, let's respect the locale if possible or stick to simple formats.
    // The previous implementation used Italian/English mixing in formatting call.
    // Let's stick to a consistent format.
    
    switch (grouping) {
      case 'daily':
        key = current.toISOString().slice(0, 10);
        label = current.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
        break;
      case 'weekly':
        const week = getWeekNumber(current);
        const year = current.getFullYear();
        key = `${year}-W${week.toString().padStart(2, '0')}`;
        label = `S${week}`;
        break;
      case 'monthly':
      default:
        key = `${current.getFullYear()}-${(current.getMonth() + 1).toString().padStart(2, '0')}`;
        label = current.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });
        break;
    }
    
    periods.set(key, { timestamp: current.getTime(), label });
    
    // Advance to next period
    if (grouping === 'daily') {
      current.setDate(current.getDate() + 1);
    } else if (grouping === 'weekly') {
      current.setDate(current.getDate() + 7);
    } else {
      current.setMonth(current.getMonth() + 1);
    }
  }
  
  return periods;
};

// Group transactions by time period with gap filling
const groupTransactionsByTime = (
  transactions: Transaction[],
  grouping: TimeGrouping
): TimeDataPoint[] => {
  if (transactions.length === 0) return [];
  
  // Find date range
  const dates = transactions.map(tx => new Date(tx.date).getTime());
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));
  
  // Generate all periods in range
  const allPeriods = generateAllPeriods(minDate, maxDate, grouping);
  
  // Initialize result with empty data for all periods
  const groups = new Map<string, { 
    count: number; 
    value: number; 
    transferValue: number;
    timestamp: number;
    label: string;
    valuesByCurrency: Record<string, number>;
    transfersByCurrency: Record<string, number>;
  }>();
  
  allPeriods.forEach((periodData, key) => {
    groups.set(key, {
      count: 0,
      value: 0,
      transferValue: 0,
      timestamp: periodData.timestamp,
      label: periodData.label,
      valuesByCurrency: {},
      transfersByCurrency: {},
    });
  });

  // Add transaction data
  transactions.forEach((tx) => {
    const date = new Date(tx.date);
    let key: string;

    switch (grouping) {
      case 'daily':
        key = date.toISOString().slice(0, 10);
        break;
      case 'weekly':
        const week = getWeekNumber(date);
        const year = date.getFullYear();
        key = `${year}-W${week.toString().padStart(2, '0')}`;
        break;
      case 'monthly':
      default:
        key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        break;
    }

    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      if (tx.isTransfer) {
        existing.transferValue += tx.cost;
        existing.transfersByCurrency[tx.currency] = (existing.transfersByCurrency[tx.currency] || 0) + tx.cost;
      } else {
        existing.value += tx.cost;
        existing.valuesByCurrency[tx.currency] = (existing.valuesByCurrency[tx.currency] || 0) + tx.cost;
      }
    }
  });

  return Array.from(groups.entries())
    .map(([key, data]) => ({
      key,
      label: data.label,
      timestamp: data.timestamp,
      count: data.count,
      value: data.value,
      transferValue: data.transferValue,
      valuesByCurrency: data.valuesByCurrency,
      transfersByCurrency: data.transfersByCurrency,
    }))
    .sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp for proper X-axis
};

// Quick preset types for time range selection
type TimePreset = 'all' | 'lastWeek' | 'last30' | 'last3m' | 'last12m';

export const TimeRangeSlider = () => {
  const { parsedData, timeGrouping, setTimeGrouping, setFilters, language, preferredCurrency, exchangeRates } = useStore();
  const theme = useTheme();
  const t = useMemo(() => getTranslation(language), [language]);
  const { fetchRates } = useCurrencyRates();
  
  // Track active preset (null means custom/manual selection)
  const [activePreset, setActivePreset] = useState<TimePreset | null>('all');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  // Brush layout state (for immediate UI updates during drag)
  const [brushLayout, setBrushLayout] = useState<{ startIndex: number; endIndex: number } | null>(null);
  
  // Brush data state (for heavy chart computation and global filtering)
  const [brushRange, setBrushRange] = useState<{ startIndex: number; endIndex: number } | null>(null);

  const brushLayoutRef = useRef<{ startIndex: number; endIndex: number } | null>(null);
  const brushRangeRef = useRef<{ startIndex: number; endIndex: number } | null>(null);

  useEffect(() => {
    brushLayoutRef.current = brushLayout;
    brushRangeRef.current = brushRange;
  }, [brushLayout, brushRange]);

  useEffect(() => {
    const handleMouseUp = () => {
      const layout = brushLayoutRef.current;
      const range = brushRangeRef.current;
      if (layout && (!range || layout.startIndex !== range.startIndex || layout.endIndex !== range.endIndex)) {
        setBrushRange(layout);
      }
    };
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, []);

  // Drag selection state (for selecting on main chart)
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Auto-fetch exchange rates for chart normalization (uses USD as base)
  useEffect(() => {
    if (parsedData && parsedData.currencies.length > 1 && !exchangeRates) {
      // Fetch USD rates for chart normalization
      fetchRates('USD');
    }
  }, [parsedData, exchangeRates, fetchRates]);

  // Group data for chart
  const chartData = useMemo(() => {
    if (!parsedData) return [];
    return groupTransactionsByTime(parsedData.transactions, timeGrouping);
  }, [parsedData, timeGrouping]);

  // Normalize chart values to USD for uniform line heights (scale-independent)
  // This converts all currencies to USD so mixed VND/EUR/USD data shows proportionally
  const normalizedChartData = useMemo(() => {
    if (!chartData.length || !exchangeRates) return chartData;
    
    return chartData.map(point => {
      // Sum all expense currencies converted to USD
      let normalizedValue = 0;
      for (const [currency, amount] of Object.entries(point.valuesByCurrency)) {
        const converted = convertAmount(amount, currency, 'USD', exchangeRates);
        normalizedValue += converted ?? amount; // Fallback to original if no rate
      }
      
      // Sum all transfer currencies converted to USD
      let normalizedTransferValue = 0;
      for (const [currency, amount] of Object.entries(point.transfersByCurrency)) {
        const converted = convertAmount(amount, currency, 'USD', exchangeRates);
        normalizedTransferValue += converted ?? amount;
      }
      
      return {
        ...point,
        value: normalizedValue,
        transferValue: normalizedTransferValue,
      };
    });
  }, [chartData, exchangeRates]);

  // Initialize brush range when data changes
  useEffect(() => {
    if (chartData.length > 0) {
      // Default to full range
      const fullRange = { startIndex: 0, endIndex: chartData.length - 1 };
      setBrushLayout(fullRange);
      setBrushRange(fullRange);
    }
  }, [chartData.length, timeGrouping]); // Reset when grouping changes


  // Calculate selected date range from brush indices
  const selectedDateRange = useMemo(() => {
    if (!chartData.length || !brushRange) return null;
    
    const startPoint = chartData[brushRange.startIndex];
    const endPoint = chartData[brushRange.endIndex];
    
    if (!startPoint || !endPoint) return null;
    
    return {
      start: new Date(startPoint.timestamp),
      end: new Date(endPoint.timestamp + 86400000 - 1), // End of day assumption
    };
  }, [chartData, brushRange]);

  // Stats for selected range - aggregate per currency
  const selectedStats = useMemo(() => {
    if (!chartData.length || !brushRange) return { count: 0, valuesByCurrency: {} as Record<string, number> };
    
    return chartData
      .slice(brushRange.startIndex, brushRange.endIndex + 1)
      .reduce(
        (acc, point) => {
          acc.count += point.count;
          // Merge per-currency values
          Object.entries(point.valuesByCurrency).forEach(([currency, value]) => {
            acc.valuesByCurrency[currency] = (acc.valuesByCurrency[currency] || 0) + value;
          });
          return acc;
        },
        { count: 0, valuesByCurrency: {} as Record<string, number> }
      );
  }, [chartData, brushRange]);


  // Update filters immediately when brush range changes (it is deferred until drag release)
  useEffect(() => {
    if (selectedDateRange) {
      setFilters({ dateRange: selectedDateRange });
    }
  }, [selectedDateRange, setFilters]);

  const handleGroupingChange = useCallback(
    (_: React.MouseEvent<HTMLElement>, newGrouping: TimeGrouping | null) => {
      if (newGrouping) {
        setTimeGrouping(newGrouping);
      }
    },
    [setTimeGrouping]
  );

  // Handler for quick preset clicks
  const handlePresetClick = useCallback((preset: TimePreset) => {
    if (!chartData.length) return;
    
    setActivePreset(preset);
    
    if (preset === 'all') {
      const fullRange = { startIndex: 0, endIndex: chartData.length - 1 };
      setBrushLayout(fullRange);
      setBrushRange(fullRange);
      return;
    }
    
    // Use the LAST data point's date as reference (not "now")
    // This ensures presets work with historical sample data
    const lastDataPoint = chartData[chartData.length - 1];
    const referenceDate = new Date(lastDataPoint.timestamp);
    let targetStart: Date;
    
    switch (preset) {
      case 'lastWeek':
        targetStart = new Date(referenceDate);
        targetStart.setDate(targetStart.getDate() - 7);
        break;
      case 'last30':
        targetStart = new Date(referenceDate);
        targetStart.setDate(targetStart.getDate() - 30);
        break;
      case 'last3m':
        targetStart = new Date(referenceDate);
        targetStart.setMonth(targetStart.getMonth() - 3);
        break;
      case 'last12m':
        targetStart = new Date(referenceDate);
        targetStart.setFullYear(targetStart.getFullYear() - 1);
        break;
      default:
        return;
    }
    
    // Find the start index: first data point with timestamp >= targetStart
    const targetTimestamp = targetStart.getTime();
    let startIdx = 0;
    for (let i = 0; i < chartData.length; i++) {
      if (chartData[i].timestamp >= targetTimestamp) {
        startIdx = i;
        break;
      }
    }
    
    // End is always the last data point for these presets
    const newRange = { startIndex: startIdx, endIndex: chartData.length - 1 };
    setBrushLayout(newRange);
    setBrushRange(newRange);
  }, [chartData]);

  const handleBrushChange = useCallback((brushState: any) => {
    if (brushState && brushState.startIndex !== undefined && brushState.endIndex !== undefined) {
      setBrushLayout({ startIndex: brushState.startIndex, endIndex: brushState.endIndex });
      // Clear preset when user manually drags
      setActivePreset(null);
    }
  }, []);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as TimeDataPoint;
      const expensesByCurrency = Object.entries(data.valuesByCurrency).filter(([_, amount]) => amount !== 0);
      const transfersByCurrency = Object.entries(data.transfersByCurrency || {}).filter(([_, amount]) => amount !== 0);
      
      // Calculate converted totals if conversion is active
      const isConversionActive = preferredCurrency && exchangeRates;
      let convertedExpenseTotal = 0;
      let convertedTransferTotal = 0;
      
      if (isConversionActive) {
        for (const [currency, amount] of expensesByCurrency) {
          const converted = convertAmount(amount, currency, preferredCurrency!, exchangeRates!);
          convertedExpenseTotal += converted ?? 0;
        }
        for (const [currency, amount] of transfersByCurrency) {
          const converted = convertAmount(amount, currency, preferredCurrency!, exchangeRates!);
          convertedTransferTotal += converted ?? 0;
        }
      }
      
      return (
        <Box sx={{ transform: 'translateX(-50%)', pt: 1, pointerEvents: 'none' }}>
          <Paper sx={{ p: 1.5, boxShadow: 3, minWidth: 150, animation: 'zoomIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)', '@keyframes zoomIn': { '0%': { opacity: 0, transform: 'scale(0.95)' }, '100%': { opacity: 1, transform: 'scale(1)' } } }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
            {data.label}
          </Typography>
          
          {data.count === 0 && expensesByCurrency.length === 0 && transfersByCurrency.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t.analytics.noTransactions || 'No transactions'}
            </Typography>
          ) : (
            <>
              {/* Expenses Section */}
              {expensesByCurrency.length > 0 && (
                <Box sx={{ mb: transfersByCurrency.length > 0 ? 1 : 0 }}>
                  <Typography variant="caption" color="text.secondary">
                    {t.charts.spese}
                  </Typography>
                  {isConversionActive ? (
                    <>
                      <Typography variant="body2" sx={{ color: '#48be9d', fontWeight: 600 }}>
                        {formatCurrency(convertedExpenseTotal, preferredCurrency!)}
                      </Typography>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.25 }}>
                        {expensesByCurrency.map(([currency, amount]) => (
                          <Chip
                            key={currency}
                            label={formatCurrency(amount, currency)}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.6rem', height: 18 }}
                          />
                        ))}
                      </Stack>
                    </>
                  ) : (
                    expensesByCurrency.map(([currency, amount]) => (
                      <Typography key={currency} variant="body2" sx={{ color: '#48be9d' }}>
                        {formatCurrency(amount, currency)}
                      </Typography>
                    ))
                  )}
                </Box>
              )}
              
              {/* Transfers Section */}
              {transfersByCurrency.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {t.charts.trasferimenti}
                  </Typography>
                  {isConversionActive ? (
                    <>
                      <Typography variant="body2" sx={{ color: '#ff652f', fontWeight: 600 }}>
                        {formatCurrency(convertedTransferTotal, preferredCurrency!)}
                      </Typography>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.25 }}>
                        {transfersByCurrency.map(([currency, amount]) => (
                          <Chip
                            key={currency}
                            label={formatCurrency(amount, currency)}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.6rem', height: 18 }}
                          />
                        ))}
                      </Stack>
                    </>
                  ) : (
                    transfersByCurrency.map(([currency, amount]) => (
                      <Typography key={currency} variant="body2" sx={{ color: '#ff652f' }}>
                        {formatCurrency(amount, currency)}
                      </Typography>
                    ))
                  )}
                </Box>
              )}
            </>
          )}
          </Paper>
        </Box>
      );
    }
    return null;
  };

  if (!parsedData || chartData.length === 0) {
    return null;
  }


  // Derive domain for Top Chart from brush range
  // We use timestamp for XAxis domain to enable zooming animation
  const xDomain = useMemo(() => {
    if (!brushRange || !chartData.length) return undefined;
    const start = chartData[brushRange.startIndex]?.timestamp;
    const end = chartData[brushRange.endIndex]?.timestamp;
    if (!start || !end) return undefined;
    return [start, end];
  }, [brushRange, chartData]);

  // Calculate local Y max based on brush selection for Top Chart autoscale
  const maxBrushedValue = useMemo(() => {
    if (!normalizedChartData.length || !brushRange) return undefined;
    const sliced = normalizedChartData.slice(brushRange.startIndex, brushRange.endIndex + 1);
    const maxVal = Math.max(...sliced.map(d => d.value), 0);
    const maxTransfer = Math.max(...sliced.map(d => d.transferValue), 0);
    const maxTotal = Math.max(maxVal, maxTransfer);
    // Add 10% padding
    return maxTotal > 0 ? maxTotal * 1.1 : undefined;
  }, [normalizedChartData, brushRange]);

  // Sliced data for bar chart mode (categorical axis can't use domain, so we slice instead)
  const barChartData = useMemo(() => {
    if (!normalizedChartData.length || !brushRange) return normalizedChartData;
    return normalizedChartData.slice(brushRange.startIndex, brushRange.endIndex + 1);
  }, [normalizedChartData, brushRange]);

  return (
    <Paper 
      sx={{ 
        p: 3, 
        mb: 3,
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Calendar size={20} color="#48be9d" />
          <Typography variant="h6" fontWeight={600}>
            {t.analytics.timeRange}
          </Typography>
        </Box>

        <Box 
          sx={{ 
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' }, 
            gap: 2,
            alignItems: { xs: 'stretch', sm: 'center' },
            width: { xs: '100%', sm: 'auto' } 
          }}
        >
          <ToggleButtonGroup
            value={chartType}
            exclusive
            onChange={(_, val) => val && setChartType(val)}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                px: 2,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                },
              },
            }}
          >
            <MuiTooltip title={t.timeRange.lineChart}>
              <ToggleButton value="area">
                <TrendingUp size={18} />
              </ToggleButton>
            </MuiTooltip>
            <MuiTooltip title={t.timeRange.barChart}>
              <ToggleButton value="bar">
                <BarChart2 size={18} />
              </ToggleButton>
            </MuiTooltip>
          </ToggleButtonGroup>

          <ToggleButtonGroup
            value={timeGrouping}
            exclusive
            onChange={handleGroupingChange}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                px: 2,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                },
              },
            }}
          >
            <ToggleButton value="daily">{t.analytics.day}</ToggleButton>
            <ToggleButton value="weekly">{t.analytics.week}</ToggleButton>
            <ToggleButton value="monthly">{t.analytics.month}</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* Quick Preset Chips */}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        {(() => {
          const allLength = chartData.length;
          const allTooltip = timeGrouping === 'daily' ? `${allLength} ${t.timeRange.days}` :
                             timeGrouping === 'weekly' ? `${allLength} ${t.timeRange.weeks}` :
                             `${allLength} ${t.timeRange.months}`;

          return [
            { key: 'all' as TimePreset, label: t.transactions.all, tooltip: allTooltip },
            { key: 'lastWeek' as TimePreset, label: t.timeRange.lastWeek },
            { key: 'last30' as TimePreset, label: t.timeRange.last30Days },
            { key: 'last3m' as TimePreset, label: t.timeRange.last3Months },
            { key: 'last12m' as TimePreset, label: t.timeRange.last12Months },
          ].map(({ key, label, tooltip }) => {
            const chip = (
              <Chip
                key={key}
                label={label}
                onClick={() => handlePresetClick(key)}
                variant={activePreset === key ? 'filled' : 'outlined'}
                color={activePreset === key ? 'primary' : 'default'}
                sx={{
                  fontWeight: activePreset === key ? 600 : 400,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                  },
                }}
              />
            );
            return tooltip ? (
              <MuiTooltip key={key} title={tooltip} arrow placement="top">
                <Box sx={{ display: 'inline-block' }}>{chip}</Box>
              </MuiTooltip>
            ) : (
              <Box key={key} sx={{ display: 'inline-block' }}>{chip}</Box>
            );
          });
        })()}
      </Stack>

      {/* Stats */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          alignItems: 'center',
        //   mb: 2,
        //   p: 2,
        //   bgcolor: 'rgba(72, 190, 157, 0.1)',
        //   borderRadius: 2,
        }}
      >
        <Typography color="text.secondary">
          {t.analytics.selectedTransactions}: {selectedStats.count}
        </Typography>
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Clock size={16} color={theme.palette.text.secondary} />
          <Typography variant="body2" color="text.secondary">
            {selectedDateRange
              ? `${selectedDateRange.start.toLocaleDateString('it-IT')} - ${selectedDateRange.end.toLocaleDateString('it-IT')}`
              : 'Seleziona intervallo'}
          </Typography>
        </Box>
      </Box>

      {/* Top Chart (Zoomed View) - supports drag-to-select */}
      <Box sx={{ height: 140, mb: 1, cursor: isDragging ? 'col-resize' : 'crosshair' }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          {chartType === 'area' ? (
          <AreaChart 
            data={normalizedChartData} 
            margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
            onMouseDown={(e) => {
              if (e && e.activeLabel) {
                setDragStart(Number(e.activeLabel));
                setIsDragging(true);
              }
            }}
            onMouseMove={(e) => {
              if (isDragging && e && e.activeLabel) {
                setDragEnd(Number(e.activeLabel));
              }
            }}
            onMouseUp={() => {
              if (isDragging && dragStart !== null && dragEnd !== null) {
                // Find indices for the selected timestamps
                const minTs = Math.min(dragStart, dragEnd);
                const maxTs = Math.max(dragStart, dragEnd);
                let startIdx = 0;
                let endIdx = chartData.length - 1;
                for (let i = 0; i < chartData.length; i++) {
                  if (chartData[i].timestamp >= minTs && startIdx === 0) {
                    startIdx = i;
                  }
                  if (chartData[i].timestamp <= maxTs) {
                    endIdx = i;
                  }
                }
                if (startIdx <= endIdx) {
                  const newRange = { startIndex: startIdx, endIndex: endIdx };
                  setBrushLayout(newRange);
                  setBrushRange(newRange);
                  setActivePreset(null);
                }
              }
              setDragStart(null);
              setDragEnd(null);
              setIsDragging(false);
            }}
            onMouseLeave={() => {
              setDragStart(null);
              setDragEnd(null);
              setIsDragging(false);
            }}
          >
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#48be9d" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#48be9d" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorTransfer" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff652f" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ff652f" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={xDomain || ['dataMin', 'dataMax']}
              tickFormatter={(ts) => {
                 const date = new Date(ts);
                 return timeGrouping === 'monthly'
                   ? date.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' })
                   : date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
              }}
              tick={{ fill: theme.palette.text.secondary, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              minTickGap={30}
              allowDataOverflow={true}
            />
            <YAxis hide domain={maxBrushedValue ? [0, maxBrushedValue] : ['auto', 'auto']} allowDataOverflow={true} />
            <Tooltip 
              content={<CustomTooltip />} 
              wrapperStyle={{ zIndex: 100 }} 
              position={{ y: 120 }}
              offset={0}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="transferValue"
              name={t.charts.trasferimenti}
              stroke="#ff652f"
              strokeWidth={1}
              fill="url(#colorTransfer)"
              animationDuration={300}
              isAnimationActive={true}
            />
            <Area
              type="monotone"
              dataKey="value"
              name={t.charts.spese}
              stroke="#48be9d"
              strokeWidth={3}
              fill="url(#colorValue)"
              animationDuration={300}
              isAnimationActive={true}
            />
            {/* Visual selection feedback during drag */}
            {isDragging && dragStart !== null && dragEnd !== null && (
              <ReferenceArea
                x1={Math.min(dragStart, dragEnd)}
                x2={Math.max(dragStart, dragEnd)}
                strokeOpacity={0.3}
                fill="#48be9d"
                fillOpacity={0.2}
              />
            )}
          </AreaChart>
          ) : (
            <BarChart 
              data={barChartData} 
              margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
              barCategoryGap="30%"
              barGap={2}
              onMouseDown={(e) => {
                if (e && e.activeLabel) {
                  // activeLabel is the label string for categorical axis; find the timestamp
                  const point = barChartData.find(d => d.label === e.activeLabel);
                  if (point) {
                    setDragStart(point.timestamp);
                    setIsDragging(true);
                  }
                }
              }}
              onMouseMove={(e) => {
                if (isDragging && e && e.activeLabel) {
                  const point = barChartData.find(d => d.label === e.activeLabel);
                  if (point) setDragEnd(point.timestamp);
                }
              }}
              onMouseUp={() => {
                if (isDragging && dragStart !== null && dragEnd !== null) {
                  const minTs = Math.min(dragStart, dragEnd);
                  const maxTs = Math.max(dragStart, dragEnd);
                  let startIdx = 0;
                  let endIdx = chartData.length - 1;
                  for (let i = 0; i < chartData.length; i++) {
                    if (chartData[i].timestamp >= minTs && startIdx === 0) startIdx = i;
                    if (chartData[i].timestamp <= maxTs) endIdx = i;
                  }
                  if (startIdx <= endIdx) {
                    const newRange = { startIndex: startIdx, endIndex: endIdx };
                    setBrushLayout(newRange);
                    setBrushRange(newRange);
                    setActivePreset(null);
                  }
                }
                setDragStart(null);
                setDragEnd(null);
                setIsDragging(false);
              }}
              onMouseLeave={() => {
                setDragStart(null);
                setDragEnd(null);
                setIsDragging(false);
              }}
            >
              <XAxis
                dataKey="label"
                tick={{ fill: theme.palette.text.secondary, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={barChartData.length <= 15 ? 0 : 'preserveStartEnd'}
              />
              <YAxis hide domain={maxBrushedValue ? [0, maxBrushedValue] : ['auto', 'auto']} />
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={{ fill: 'rgba(0,0,0,0.05)' }} 
                wrapperStyle={{ zIndex: 100 }} 
                position={{ y: 140 }}
                offset={0}
                isAnimationActive={false}
              />
              <Bar
                dataKey="transferValue"
                name={t.charts.trasferimenti}
                fill="#ff652f"
                radius={[4, 4, 0, 0]}
                animationDuration={300}
                isAnimationActive={true}
                maxBarSize={40}
              />
              <Bar
                dataKey="value"
                name={t.charts.spese}
                fill="#48be9d"
                radius={[4, 4, 0, 0]}
                animationDuration={300}
                isAnimationActive={true}
                maxBarSize={40}
              />
              {isDragging && dragStart !== null && dragEnd !== null && (
                <ReferenceArea
                  x1={Math.min(dragStart, dragEnd)}
                  x2={Math.max(dragStart, dragEnd)}
                  strokeOpacity={0.3}
                  fill="#48be9d"
                  fillOpacity={0.2}
                />
              )}
            </BarChart>
          )}
        </ResponsiveContainer>
      </Box>

      {/* Bottom Chart (Navigator using Brush) */}
      <Box 
        sx={{ 
          position: 'relative',
          height: 50, 
          mt: 0,
        }}
      >
        {/* Background: Full Trend Line */}
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart
               data={normalizedChartData}
               margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            >
               <defs>
                <linearGradient id="colorValueBrush" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#48be9d" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#48be9d" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorTransferBrush" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff652f" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ff652f" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="transferValue"
                stroke="#ff652f"
                strokeWidth={1}
                fill="url(#colorTransferBrush)"
                fillOpacity={1}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#48be9d"
                strokeWidth={1}
                fill="url(#colorValueBrush)"
                fillOpacity={1}
                isAnimationActive={false}
              />
              <XAxis dataKey="timestamp" hide />
              <YAxis hide />
            </AreaChart>
          </ResponsiveContainer>
        </Box>

        {/* Foreground: Brush Control (Transparent) */}
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2 }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart
               data={normalizedChartData}
               margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            >
              <XAxis dataKey="timestamp" hide />
              <YAxis hide />
              <Brush
                dataKey="timestamp" 
                height={50}
                y={0}
                stroke="#48be9d"
                fill="none" /* Transparent to show background chart */
                travellerWidth={10}
                gap={1} // Allow tight selection
                onChange={handleBrushChange}
                startIndex={brushLayout?.startIndex ?? 0}
                endIndex={brushLayout?.endIndex ?? chartData.length - 1}
                tickFormatter={() => ''}
                alwaysShowText={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </Box>
    </Paper>
  );
};
