import React, { useMemo } from 'react';
import { Box, Grid } from '@mui/material';
import { TrendingUp, ArrowLeftRight, Users } from 'lucide-react';
import { useStore } from '../../store';
import { getTranslation } from '../../i18n/translations';
import { formatCurrency } from '../../utils/formatters';
import { convertAmount } from '../../hooks/useCurrencyRates';
import { SectionCard } from './SectionCard';
import { KpiStatCard } from './KpiStatCard';
import { CategoryBreakdownChart } from './CategoryBreakdownChart';
import { NetBalanceBarChart } from './NetBalanceBarChart';
import {
  useGlobalKpiStats,
  useCategoryStats,
  useAllMembersNetBalance,
} from '../../hooks/useAnalyticsData';
import type { Transaction } from '../../types';

interface GlobalOverviewSectionProps {
  transactions: Transaction[];
  currency: string;
}

/**
 * Global Overview section with KPI row, category breakdown, and net balance chart.
 * Multi-currency handling:
 * - Unconverted: shows ALL currencies as equal values (sorted by spending amount)
 * - Converted: shows single total + composition chips
 */
export const GlobalOverviewSection: React.FC<GlobalOverviewSectionProps> = ({
  transactions,
  currency,
}) => {
  const { language, preferredCurrency, exchangeRates, parsedData } = useStore();
  const t = useMemo(() => getTranslation(language), [language]);

  // Compute stats
  const kpiStats = useGlobalKpiStats(transactions, currency);
  const categoryStats = useCategoryStats(transactions, currency);
  const memberBalances = useAllMembersNetBalance(transactions);
  const members = parsedData?.members || [];

  // Check if conversion is active
  const isConversionActive = preferredCurrency && exchangeRates;

  // Get sorted currency order from spending (for consistent display)
  const currencyOrder = useMemo(() => {
    return Object.entries(kpiStats.spendingByCurrency)
      .sort((a, b) => b[1] - a[1])
      .map(([cur]) => cur);
  }, [kpiStats.spendingByCurrency]);

  // Calculate spending display
  const spendingDisplay = useMemo(() => {
    const currencies = Object.keys(kpiStats.spendingByCurrency);
    
    if (currencies.length === 0) {
      return { 
        values: [{ amount: 0, currency }], 
        chips: [],
        isConverted: false 
      };
    }

    if (isConversionActive) {
      // Converted view: single total + chips
      let total = 0;
      const chips: { label: string; tooltip?: string }[] = [];
      
      for (const [cur, amount] of Object.entries(kpiStats.spendingByCurrency)) {
        const converted = convertAmount(amount, cur, preferredCurrency!, exchangeRates!);
        if (converted !== null) {
          total += converted;
          chips.push({ 
            label: formatCurrency(amount, cur)
          });
        }
      }
      
      return { 
        values: [{ amount: total, currency: preferredCurrency! }], 
        chips,
        isConverted: true 
      };
    }
    
    // Unconverted: ALL currencies as equal values, sorted by amount
    const values = currencyOrder
      .filter(cur => kpiStats.spendingByCurrency[cur])
      .map(cur => ({ amount: kpiStats.spendingByCurrency[cur], currency: cur }));
    
    return { values, chips: [], isConverted: false };
  }, [kpiStats.spendingByCurrency, isConversionActive, preferredCurrency, exchangeRates, currency, currencyOrder]);

  // Calculate transfers display (follows spending currency order)
  const transfersDisplay = useMemo(() => {
    const currencies = Object.keys(kpiStats.transfersByCurrency);
    
    if (currencies.length === 0) {
      return { 
        values: [{ amount: 0, currency }], 
        chips: [],
        isConverted: false 
      };
    }

    if (isConversionActive) {
      let total = 0;
      const chips: { label: string; tooltip?: string }[] = [];
      
      for (const [cur, amount] of Object.entries(kpiStats.transfersByCurrency)) {
        const converted = convertAmount(amount, cur, preferredCurrency!, exchangeRates!);
        if (converted !== null) {
          total += converted;
          chips.push({ 
            label: formatCurrency(amount, cur)
          });
        }
      }
      
      return { 
        values: [{ amount: total, currency: preferredCurrency! }], 
        chips,
        isConverted: true 
      };
    }
    
    // Unconverted: follow same order as spending
    const values = currencyOrder
      .filter(cur => kpiStats.transfersByCurrency[cur])
      .map(cur => ({ amount: kpiStats.transfersByCurrency[cur], currency: cur }));
    
    // If transfers have currencies not in spending, add them at the end
    const additionalCurrencies = currencies.filter(c => !currencyOrder.includes(c));
    for (const cur of additionalCurrencies) {
      values.push({ amount: kpiStats.transfersByCurrency[cur], currency: cur });
    }
    
    return { values, chips: [], isConverted: false };
  }, [kpiStats.transfersByCurrency, isConversionActive, preferredCurrency, exchangeRates, currency, currencyOrder]);

  return (
    <SectionCard
      title={t.analytics.globalOverview}
      description={t.analytics.globalOverviewDesc}
    >
      {/* KPI Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <KpiStatCard
            title={t.dashboard.totalSpending}
            values={spendingDisplay.values}
            subtitle={`${kpiStats.expenseCount} ${t.dashboard.expenses}`}
            icon={<TrendingUp size={18} />}
            color="#48be9d"
            currencyChips={spendingDisplay.chips}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <KpiStatCard
            title={t.dashboard.transfers}
            values={transfersDisplay.values}
            subtitle={`${kpiStats.transferCount} ${t.dashboard.payments}`}
            icon={<ArrowLeftRight size={18} />}
            color="#ff652f"
            currencyChips={transfersDisplay.chips}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <KpiStatCard
            title={t.dashboard.members}
            values={[{ amount: members.length, currency: '', isCount: true }]}
            subtitle={members.map(m => m.name).join(', ')}
            icon={<Users size={18} />}
            color="#9b59b6"
          />
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Box
            sx={{
              p: 2,
              bgcolor: 'action.hover',
              borderRadius: 2,
              height: '100%',
            }}
          >
            <Box sx={{ fontWeight: 600, mb: 1, fontSize: '0.875rem' }}>
              {t.charts.categoryExpenses}
            </Box>
            <CategoryBreakdownChart categoryStats={categoryStats} currency={currency} />
          </Box>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Box
            sx={{
              p: 2,
              bgcolor: 'action.hover',
              borderRadius: 2,
              height: '100%',
            }}
          >
            <Box sx={{ fontWeight: 600, mb: 1, fontSize: '0.875rem' }}>
              {t.analytics.netBalanceDistribution}
            </Box>
            <NetBalanceBarChart memberBalances={memberBalances} currency={currency} />
          </Box>
        </Grid>
      </Grid>
    </SectionCard>
  );
};
