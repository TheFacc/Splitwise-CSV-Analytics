import React from 'react';
import { Box, Paper, Typography, Stack, Chip, Tooltip } from '@mui/material';
import { formatCurrency } from '../../utils/formatters';

interface CurrencyValue {
  amount: number;
  currency: string;
  isCount?: boolean; // For transaction counts (no currency formatting)
  showSign?: boolean; // Show +/- sign for balance values
}

interface KpiStatCardProps {
  title: string;
  values: CurrencyValue[]; // Array of values - shows all equally when multiple
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  // Chips only shown when currency conversion is active
  currencyChips?: { label: string; tooltip?: string }[];
}

/**
 * Reusable KPI card for displaying key statistics.
 * Multi-currency support:
 * - When values has multiple entries: displays ALL values equally (one per line)
 * - When currencyChips provided: shows chips below main value
 */
export const KpiStatCard: React.FC<KpiStatCardProps> = ({
  title,
  values,
  subtitle,
  icon,
  color,
  currencyChips,
}) => {
  const hasMultipleValues = values.length > 1;
  
  return (
    <Paper
      sx={{
        p: 2.5,
        height: '100%',
        minWidth: 140,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 3,
        },
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography
          variant="body2"
          color="text.secondary"
          fontWeight={500}
          sx={{ fontSize: '0.75rem' }}
        >
          {title}
        </Typography>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.5,
            bgcolor: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: color,
          }}
        >
          {icon}
        </Box>
      </Stack>
      <Box>
        {/* Display all values equally when multiple currencies */}
        {hasMultipleValues ? (
          <Stack spacing={0.5}>
            {values.map((v, index) => (
              <Typography
                key={index}
                variant='h6'
                fontWeight='700'
                sx={{
                  color,
                  lineHeight: 1.2,
                  fontSize: undefined,
                }}
              >
                {v.isCount 
                  ? v.amount.toString() 
                  : `${v.showSign && v.amount >= 0 ? '+' : ''}${formatCurrency(v.amount, v.currency)}`}
              </Typography>
            ))}
          </Stack>
        ) : (
          <Typography
            variant="h5"
            fontWeight={700}
            sx={{
              color,
              lineHeight: 1.2,
            }}
          >
            {values[0]?.isCount 
              ? values[0].amount.toString() 
              : `${values[0]?.showSign && (values[0]?.amount || 0) >= 0 ? '+' : ''}${formatCurrency(values[0]?.amount || 0, values[0]?.currency || '')}`}
          </Typography>
        )}
        
        {/* Currency composition chips (only for converted view) */}
        {currencyChips && currencyChips.length > 0 && (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
            {currencyChips.map((chip, index) => (
              <Tooltip key={index} title={chip.tooltip || ''} arrow placement="top">
                <Chip
                  label={chip.label}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.6rem', height: 18, cursor: chip.tooltip ? 'help' : 'default' }}
                />
              </Tooltip>
            ))}
          </Stack>
        )}
        
        {subtitle && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 0.25 }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};
