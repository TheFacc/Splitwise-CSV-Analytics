import { useMemo } from 'react';
import { Box, Paper, Typography, Grid, Chip, Stack } from '@mui/material';
import { TrendingUp, ArrowLeftRight, Receipt, Users } from 'lucide-react';
import { useStore } from '../../store';
import { formatCurrency } from '../../utils/formatters';
import { convertAmount } from '../../hooks/useCurrencyRates';
import { getTranslation } from '../../i18n/translations';
import type { ExchangeRates } from '../../types';

interface StatCardProps {
  title: string;
  amounts: Record<string, number>;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  preferredCurrency: string | null;
  exchangeRates: ExchangeRates | null;
}

const StatCard = ({ title, amounts, subtitle, icon, color, preferredCurrency, exchangeRates }: StatCardProps) => {
  // Filter out zero amounts
  const nonZeroAmounts = useMemo(() => 
    Object.entries(amounts).filter(([_, amount]) => amount !== 0),
    [amounts]
  );

  // Calculate converted total if preferred currency is set
  const convertedTotal = useMemo(() => {
    if (!preferredCurrency || !exchangeRates || nonZeroAmounts.length === 0) return null;
    
    let total = 0;
    for (const [currency, amount] of nonZeroAmounts) {
      const converted = convertAmount(amount, currency, preferredCurrency, exchangeRates);
      if (converted === null) return null; // Can't convert all
      total += converted;
    }
    return total;
  }, [nonZeroAmounts, preferredCurrency, exchangeRates]);

  return (
    <Paper
      sx={{
        p: 3,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          {title}
        </Typography>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: color,
          }}
        >
          {icon}
        </Box>
      </Box>
      <Box>
        {/* Show converted total if available */}
        {convertedTotal !== null && preferredCurrency ? (
          <>
            <Typography variant="h4" fontWeight={700} sx={{ color }}>
              {formatCurrency(convertedTotal, preferredCurrency)}
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
              {nonZeroAmounts.map(([currency, amount]) => (
                <Chip
                  key={currency}
                  label={formatCurrency(amount, currency)}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.65rem', height: 20 }}
                />
              ))}
            </Stack>
          </>
        ) : (
          /* Show each currency separately */
          <Stack spacing={0.5}>
            {nonZeroAmounts.length === 1 ? (
              <Typography variant="h4" fontWeight={700} sx={{ color, wordBreak: 'break-word' }}>
                {formatCurrency(nonZeroAmounts[0][1], nonZeroAmounts[0][0])}
              </Typography>
            ) : nonZeroAmounts.length > 1 ? (
              nonZeroAmounts.map(([currency, amount]) => (
                <Typography key={currency} variant="h6" fontWeight={600} sx={{ color, wordBreak: 'break-word' }}>
                  {formatCurrency(amount, currency)}
                </Typography>
              ))
            ) : (
              <Typography variant="h4" fontWeight={700} sx={{ color, wordBreak: 'break-word' }}>
                {formatCurrency(0, 'EUR')}
              </Typography>
            )}
          </Stack>
        )}
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

interface SimpleStatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}

const SimpleStatCard = ({ title, value, subtitle, icon, color }: SimpleStatCardProps) => (
  <Paper
    sx={{
      p: 3,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: 4,
      },
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Typography variant="body2" color="text.secondary" fontWeight={500}>
        {title}
      </Typography>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          bgcolor: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color,
        }}
      >
        {icon}
      </Box>
    </Box>
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ color }}>
        {value}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Box>
  </Paper>
);

export const GlobalStats = () => {
  const { parsedData, preferredCurrency, exchangeRates, language } = useStore();
  const t = useMemo(() => getTranslation(language), [language]);

  if (!parsedData) {
    return null;
  }

  const { totalSpendingByCurrency, totalTransfersByCurrency, transactions, members } = parsedData;
  const expenseCount = transactions.filter((t) => !t.isTransfer).length;
  const transferCount = transactions.filter((t) => t.isTransfer).length;

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" fontWeight={600} gutterBottom sx={{ mb: 3 }}>
        {t.dashboard.overview}
      </Typography>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            title={t.dashboard.totalSpending}
            amounts={totalSpendingByCurrency}
            subtitle={`${expenseCount} ${t.dashboard.expenses}`}
            icon={<TrendingUp size={20} />}
            color="#48be9d"
            preferredCurrency={preferredCurrency}
            exchangeRates={exchangeRates}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            title={t.dashboard.transfers}
            amounts={totalTransfersByCurrency}
            subtitle={`${transferCount} ${t.dashboard.payments}`}
            icon={<ArrowLeftRight size={20} />}
            color="#ff652f"
            preferredCurrency={preferredCurrency}
            exchangeRates={exchangeRates}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <SimpleStatCard
            title={t.dashboard.transactions}
            value={transactions.length.toString()}
            subtitle={t.dashboard.totalOperations}
            icon={<Receipt size={20} />}
            color="#3498db"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <SimpleStatCard
            title={t.dashboard.members}
            value={members.length.toString()}
            subtitle={t.dashboard.participants}
            icon={<Users size={20} />}
            color="#9b59b6"
          />
        </Grid>
      </Grid>
    </Box>
  );
};
