import { useMemo } from 'react';
import { Box, Paper, Typography, Grid, Avatar, Chip, Stack } from '@mui/material';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useStore } from '../../store';
import { formatCurrency } from '../../utils/formatters';
import { convertAmount } from '../../hooks/useCurrencyRates';
import { getTranslation } from '../../i18n/translations';

export const MemberCards = () => {
  const { parsedData, preferredCurrency, exchangeRates, language } = useStore();
  const t = useMemo(() => getTranslation(language), [language]);

  if (!parsedData) {
    return null;
  }

  const { members } = parsedData;

  // Sort members by absolute balance (biggest debts/credits first)
  // When converted: sort by converted balance; when not: sort by largest single-currency abs balance
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      if (preferredCurrency && exchangeRates) {
        // Sort using converted balances
        let balA = 0;
        let balB = 0;
        for (const [cur, data] of Object.entries(a.balancesByCurrency)) {
          const conv = convertAmount(data.balance, cur, preferredCurrency, exchangeRates);
          balA += conv ?? data.balance;
        }
        for (const [cur, data] of Object.entries(b.balancesByCurrency)) {
          const conv = convertAmount(data.balance, cur, preferredCurrency, exchangeRates);
          balB += conv ?? data.balance;
        }
        return Math.abs(balB) - Math.abs(balA);
      }
      // No conversion: sort by largest absolute single-currency balance
      const maxAbsA = Math.max(...Object.values(a.balancesByCurrency).map(d => Math.abs(d.balance)), 0);
      const maxAbsB = Math.max(...Object.values(b.balancesByCurrency).map(d => Math.abs(d.balance)), 0);
      return maxAbsB - maxAbsA;
    });
  }, [members, preferredCurrency, exchangeRates]);

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" fontWeight={600} gutterBottom sx={{ mb: 3 }}>
        {t.dashboard.memberBalances}
      </Typography>
      <Grid container spacing={3}>
        {sortedMembers.map((member) => {
          const currencies = Object.keys(member.balancesByCurrency);
          
          // Calculate converted total if preferred currency is set
          let convertedBalance: number | null = null;
          if (preferredCurrency && exchangeRates && currencies.length > 0) {
            convertedBalance = 0;
            for (const [currency, data] of Object.entries(member.balancesByCurrency)) {
              const converted = convertAmount(data.balance, currency, preferredCurrency, exchangeRates);
              if (converted === null) {
                convertedBalance = null;
                break;
              }
              convertedBalance += converted;
            }
          }

          // Determine if credit or debit (use converted if available, else legacy)
          const displayBalance = convertedBalance !== null ? convertedBalance : member.totalBalance;
          const isCredit = displayBalance >= 0;
          const balanceColor = isCredit ? '#27ae60' : '#e74c3c';
          
          const initials = member.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          return (
            <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={member.name}>
              <Paper
                sx={{
                  p: 3,
                  height: '100%',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Avatar
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: 'primary.main',
                      fontWeight: 600,
                      fontSize: '1rem',
                    }}
                  >
                    {initials}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {member.name}
                    </Typography>
                    <Chip
                      size="small"
                      icon={isCredit ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      label={isCredit ? t.dashboard.creditor : t.dashboard.debtor}
                      sx={{
                        bgcolor: `${balanceColor}15`,
                        color: balanceColor,
                        fontWeight: 500,
                        '& .MuiChip-icon': { color: balanceColor },
                      }}
                    />
                  </Box>
                </Box>

                {/* Balance display */}
                <Box sx={{ mb: 2 }}>
                  {convertedBalance !== null && preferredCurrency ? (
                    <>
                      <Typography
                        variant="h4"
                        fontWeight={700}
                        sx={{ color: balanceColor }}
                      >
                        {displayBalance >= 0 ? '+' : ''}
                        {formatCurrency(displayBalance, preferredCurrency)}
                      </Typography>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                        {Object.entries(member.balancesByCurrency).map(([currency, data]) => (
                          <Chip
                            key={currency}
                            label={`${data.balance >= 0 ? '+' : ''}${formatCurrency(data.balance, currency)}`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.65rem', height: 20 }}
                          />
                        ))}
                      </Stack>
                    </>
                  ) : currencies.length === 1 ? (
                    <Typography
                      variant="h4"
                      fontWeight={700}
                      sx={{ color: balanceColor }}
                    >
                      {displayBalance >= 0 ? '+' : ''}
                      {formatCurrency(
                        member.balancesByCurrency[currencies[0]].balance,
                        currencies[0]
                      )}
                    </Typography>
                  ) : (
                    <Stack spacing={0.5}>
                      {Object.entries(member.balancesByCurrency).map(([currency, data]) => (
                        <Typography
                          key={currency}
                          variant="h6"
                          fontWeight={600}
                          sx={{ color: data.balance >= 0 ? '#27ae60' : '#e74c3c' }}
                        >
                          {data.balance >= 0 ? '+' : ''}
                          {formatCurrency(data.balance, currency)}
                        </Typography>
                      ))}
                    </Stack>
                  )}
                </Box>

                {/* Paid/Owed breakdown - show converted totals or per-currency */}
                <Box
                  sx={{
                    display: 'flex',
                    gap: 3,
                    pt: 2,
                    borderTop: 1,
                    borderColor: 'divider',
                    flexWrap: 'wrap',
                  }}
                >
                  {convertedBalance !== null && preferredCurrency ? (
                    // Converted mode: show converted paid/owed totals
                    (() => {
                      let convPaid = 0;
                      let convOwed = 0;
                      for (const [cur, data] of Object.entries(member.balancesByCurrency)) {
                        const cp = convertAmount(data.paid, cur, preferredCurrency, exchangeRates!);
                        const co = convertAmount(data.owed, cur, preferredCurrency, exchangeRates!);
                        convPaid += cp ?? data.paid;
                        convOwed += co ?? data.owed;
                      }
                      return (
                        <>
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              {t.dashboard.paid}
                            </Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ color: '#27ae60' }}>
                              {formatCurrency(convPaid, preferredCurrency)}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              {t.dashboard.owes}
                            </Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ color: '#e74c3c' }}>
                              {formatCurrency(convOwed, preferredCurrency)}
                            </Typography>
                          </Box>
                        </>
                      );
                    })()
                  ) : currencies.length === 1 ? (
                    <>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {t.dashboard.paid}
                        </Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ color: '#27ae60' }}>
                          {formatCurrency(member.balancesByCurrency[currencies[0]].paid, currencies[0])}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {t.dashboard.owes}
                        </Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ color: '#e74c3c' }}>
                          {formatCurrency(member.balancesByCurrency[currencies[0]].owed, currencies[0])}
                        </Typography>
                      </Box>
                    </>
                  ) : (
                    <Box sx={{ width: '100%' }}>
                      <Typography variant="caption" color="text.secondary" gutterBottom>
                        {t.dashboard.currencyDetails}
                      </Typography>
                      <Stack spacing={1} sx={{ mt: 0.5 }}>
                        {Object.entries(member.balancesByCurrency).map(([currency, data]) => (
                          <Box key={currency} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <Chip label={currency} size="small" sx={{ minWidth: 45 }} />
                            <Typography variant="caption" sx={{ color: '#27ae60' }}>
                              +{formatCurrency(data.paid, currency)}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#e74c3c' }}>
                              -{formatCurrency(data.owed, currency)}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};
