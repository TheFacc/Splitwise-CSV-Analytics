import React, { useState, useMemo } from 'react';
import {
  Box,
  Chip,
  Stack,
  Popover,
  Button,
  TextField,
  Typography,
} from '@mui/material';
import { Calendar, X } from 'lucide-react';
import { useStore } from '../../store';
import { getTranslation } from '../../i18n/translations';

export type TimeRangePreset = 'all' | 'last30' | 'last3m' | 'last12m' | 'custom';

export interface TimeRange {
  preset: TimeRangePreset;
  start: Date | null;
  end: Date | null;
}

interface TimeRangeFilterProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  minDate?: Date;
  maxDate?: Date;
}

/**
 * Global time range filter with chip-based presets.
 * Affects all analytics sections on the page.
 */
export const TimeRangeFilter: React.FC<TimeRangeFilterProps> = ({
  value,
  onChange,
  minDate,
  maxDate,
}) => {
  const { language } = useStore();
  const t = useMemo(() => getTranslation(language), [language]);

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const presets: { key: TimeRangePreset; label: string }[] = [
    { key: 'all', label: t.transactions.all },
    { key: 'last30', label: t.timeRange.last30Days },
    { key: 'last3m', label: t.timeRange.last3Months },
    { key: 'last12m', label: t.timeRange.last12Months },
    { key: 'custom', label: t.timeRange.custom },
  ];

  const handlePresetClick = (preset: TimeRangePreset) => {
    if (preset === 'custom') {
      return; // Handled by popover
    }

    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

    switch (preset) {
      case 'all':
        start = minDate ?? null;
        end = maxDate ?? null;
        break;
      case 'last30':
        end = now;
        start = new Date(now);
        start.setDate(start.getDate() - 30);
        break;
      case 'last3m':
        end = now;
        start = new Date(now);
        start.setMonth(start.getMonth() - 3);
        break;
      case 'last12m':
        end = now;
        start = new Date(now);
        start.setFullYear(start.getFullYear() - 1);
        break;
    }

    onChange({ preset, start, end });
  };

  const handleCustomOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    // Initialize with current custom range if exists
    if (value.preset === 'custom' && value.start && value.end) {
      setCustomStart(value.start.toISOString().split('T')[0]);
      setCustomEnd(value.end.toISOString().split('T')[0]);
    } else {
      setCustomStart('');
      setCustomEnd('');
    }
  };

  const handleCustomClose = () => {
    setAnchorEl(null);
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      onChange({
        preset: 'custom',
        start: new Date(customStart),
        end: new Date(customEnd),
      });
      handleCustomClose();
    }
  };

  const formatDateRange = (): string | null => {
    if (value.preset === 'custom' && value.start && value.end) {
      const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
      const locale = language === 'it' ? 'it-IT' : 'en-US';
      return `${value.start.toLocaleDateString(locale, opts)} – ${value.end.toLocaleDateString(locale, opts)}`;
    }
    return null;
  };

  const customRangeText = formatDateRange();

  return (
    <Box sx={{ mb: 3 }}>
      <Stack 
        direction="row" 
        spacing={1} 
        useFlexGap
        sx={{
          flexWrap: 'nowrap',
          overflowX: 'auto',
          pb: 0.5, // Space for potential scrollbar (though we hide it)
          '&::-webkit-scrollbar': { display: 'none' }, // Hide scrollbar for Chrome/Safari/Webkit
          msOverflowStyle: 'none', // Hide scrollbar for IE/Edge
          scrollbarWidth: 'none', // Hide scrollbar for Firefox
          // Prevent flex children from shrinking when scrolling is desired
          '& > *': {
            flexShrink: 0,
          }
        }}
      >
        {presets.map(({ key, label }) => (
          <Chip
            key={key}
            label={key === 'custom' && customRangeText ? customRangeText : label}
            onClick={key === 'custom' ? handleCustomOpen : () => handlePresetClick(key)}
            variant={value.preset === key ? 'filled' : 'outlined'}
            color={value.preset === key ? 'primary' : 'default'}
            icon={key === 'custom' ? <Calendar size={16} /> : undefined}
            deleteIcon={key === 'custom' && value.preset === 'custom' ? <X size={14} /> : undefined}
            onDelete={
              key === 'custom' && value.preset === 'custom'
                ? () => handlePresetClick('all')
                : undefined
            }
            sx={{
              fontWeight: value.preset === key ? 600 : 400,
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'translateY(-1px)',
              },
            }}
          />
        ))}
      </Stack>

      {/* Custom date picker popover */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleCustomClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Box sx={{ p: 2, minWidth: 280 }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
            {t.timeRange.selectDateRange}
          </Typography>
          <Stack spacing={2}>
            <TextField
              label={t.timeRange.startDate}
              type="date"
              size="small"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{
                min: minDate?.toISOString().split('T')[0],
                max: maxDate?.toISOString().split('T')[0],
              }}
              fullWidth
            />
            <TextField
              label={t.timeRange.endDate}
              type="date"
              size="small"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{
                min: minDate?.toISOString().split('T')[0],
                max: maxDate?.toISOString().split('T')[0],
              }}
              fullWidth
            />
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button size="small" onClick={handleCustomClose}>
                {t.timeRange.cancel}
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={handleCustomApply}
                disabled={!customStart || !customEnd}
              >
                {t.timeRange.apply}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Popover>
    </Box>
  );
};

/**
 * Helper to get the default "all" time range
 */
export const getDefaultTimeRange = (transactions: { date: Date }[]): TimeRange => {
  if (transactions.length === 0) {
    return { preset: 'all', start: null, end: null };
  }

  const dates = transactions.map((t) => t.date.getTime());
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));

  return { preset: 'all', start: minDate, end: maxDate };
};

/**
 * Helper to filter transactions by time range
 */
export const filterByTimeRange = <T extends { date: Date }>(
  items: T[],
  range: TimeRange
): T[] => {
  if (range.preset === 'all' && !range.start && !range.end) {
    return items;
  }

  return items.filter((item) => {
    const date = item.date.getTime();
    if (range.start && date < range.start.getTime()) return false;
    if (range.end && date > range.end.getTime()) return false;
    return true;
  });
};
