import React, { useMemo } from 'react';
import { Grid } from '@mui/material';
import { TrendingUp, TrendingDown, Wallet, Receipt } from 'lucide-react';
import { useStore } from '../../store';
import { getTranslation } from '../../i18n/translations';
import { KpiStatCard } from './KpiStatCard';
import { formatCurrency } from '../../utils/formatters';
import { convertAmount } from '../../hooks/useCurrencyRates';
import type { MemberStats } from '../../hooks/useAnalyticsData';

interface MemberSummaryStatsProps {
  stats: MemberStats;
  currency: string;
}

/**
 * Row of KPI cards showing selected member's statistics.
 * Supports multi-currency display when not converted.
 */
export const MemberSummaryStats: React.FC<MemberSummaryStatsProps> = ({
  stats,
  currency,
}) => {
  const { language, preferredCurrency, exchangeRates } = useStore();
  const t = useMemo(() => getTranslation(language), [language]);
  const isConverted = preferredCurrency && exchangeRates;

  // Determine net positive using per-currency data (not legacy raw sum)
  const netIsPositive = useMemo(() => {
    if (isConverted) {
      let paidTotal = 0;
      let owedTotal = 0;
      for (const [cur, amt] of Object.entries(stats.paidByCurrency)) {
        const conv = convertAmount(amt, cur, preferredCurrency!, exchangeRates!);
        paidTotal += conv ?? 0;
      }
      for (const [cur, amt] of Object.entries(stats.owedByCurrency)) {
        const conv = convertAmount(amt, cur, preferredCurrency!, exchangeRates!);
        owedTotal += conv ?? 0;
      }
      return paidTotal - owedTotal >= 0;
    }
    // Unconverted: use max-magnitude per-currency net
    const nets = Object.values(stats.netBalanceByCurrency || {});
    if (nets.length === 0) return stats.netBalance >= 0;
    const maxAbsNet = nets.reduce((best, n) => Math.abs(n) > Math.abs(best) ? n : best, 0);
    return maxAbsNet >= 0;
  }, [isConverted, stats.paidByCurrency, stats.owedByCurrency, stats.netBalanceByCurrency, stats.netBalance, preferredCurrency, exchangeRates]);

  // Build values arrays with multi-currency support
  const paidValues = useMemo(() => {
    if (isConverted) {
      // Convert all to preferred currency
      let total = 0;
      const chips: { label: string }[] = [];
      for (const [cur, amt] of Object.entries(stats.paidByCurrency)) {
        if (amt > 0) {
          const conv = convertAmount(amt, cur, preferredCurrency!, exchangeRates!);
          total += conv ?? 0;
          chips.push({ label: formatCurrency(amt, cur) });
        }
      }
      return { 
        values: [{ amount: total, currency: preferredCurrency! }],
        currencyChips: chips.length > 0 ? chips : undefined
      };
    } else {
      // Show all currencies separately
      const values = Object.entries(stats.paidByCurrency)
        .filter(([_, amt]) => amt > 0)
        .map(([cur, amt]) => ({ amount: amt, currency: cur }));
      return { values: values.length > 0 ? values : [{ amount: 0, currency }], currencyChips: undefined };
    }
  }, [stats.paidByCurrency, isConverted, preferredCurrency, exchangeRates, currency]);

  const owedValues = useMemo(() => {
    if (isConverted) {
      let total = 0;
      const chips: { label: string }[] = [];
      for (const [cur, amt] of Object.entries(stats.owedByCurrency)) {
        if (amt > 0) {
          const conv = convertAmount(amt, cur, preferredCurrency!, exchangeRates!);
          total += conv ?? 0;
          chips.push({ label: formatCurrency(amt, cur) });
        }
      }
      return { 
        values: [{ amount: total, currency: preferredCurrency! }],
        currencyChips: chips.length > 0 ? chips : undefined
      };
    } else {
      const values = Object.entries(stats.owedByCurrency)
        .filter(([_, amt]) => amt > 0)
        .map(([cur, amt]) => ({ amount: amt, currency: cur }));
      return { values: values.length > 0 ? values : [{ amount: 0, currency }], currencyChips: undefined };
    }
  }, [stats.owedByCurrency, isConverted, preferredCurrency, exchangeRates, currency]);

  const netValues = useMemo(() => {
    if (isConverted) {
      let paidTotal = 0;
      let owedTotal = 0;
      
      for (const [cur, amt] of Object.entries(stats.paidByCurrency)) {
        const conv = convertAmount(amt, cur, preferredCurrency!, exchangeRates!);
        paidTotal += conv ?? 0;
      }
      for (const [cur, amt] of Object.entries(stats.owedByCurrency)) {
        const conv = convertAmount(amt, cur, preferredCurrency!, exchangeRates!);
        owedTotal += conv ?? 0;
      }
      
      // Build per-currency net for chips
      const netByCurrency: Record<string, number> = {};
      for (const [cur, amt] of Object.entries(stats.paidByCurrency)) {
        netByCurrency[cur] = (netByCurrency[cur] || 0) + amt;
      }
      for (const [cur, amt] of Object.entries(stats.owedByCurrency)) {
        netByCurrency[cur] = (netByCurrency[cur] || 0) - amt;
      }
      
      const chips: { label: string }[] = [];
      for (const [cur, amt] of Object.entries(netByCurrency)) {
        if (amt !== 0) {
          chips.push({ label: `${amt >= 0 ? '+' : ''}${formatCurrency(amt, cur)}` });
        }
      }
      
      return { 
        values: [{ amount: paidTotal - owedTotal, currency: preferredCurrency!, showSign: true }],
        currencyChips: chips.length > 0 ? chips : undefined
      };
    } else {
      // Calculate net per currency
      const netByCurrency: Record<string, number> = {};
      for (const [cur, amt] of Object.entries(stats.paidByCurrency)) {
        netByCurrency[cur] = (netByCurrency[cur] || 0) + amt;
      }
      for (const [cur, amt] of Object.entries(stats.owedByCurrency)) {
        netByCurrency[cur] = (netByCurrency[cur] || 0) - amt;
      }
      
      const values = Object.entries(netByCurrency)
        .filter(([_, amt]) => amt !== 0)
        .map(([cur, amt]) => ({ amount: amt, currency: cur, showSign: true }));
      
      return { 
        values: values.length > 0 ? values : [{ amount: 0, currency, showSign: true }], 
        currencyChips: undefined
      };
    }
  }, [stats.paidByCurrency, stats.owedByCurrency, isConverted, preferredCurrency, exchangeRates, currency]);

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid size={{ xs: 6, sm: 3 }}>
        <KpiStatCard
          title={t.analytics.totalPaid}
          values={paidValues.values}
          currencyChips={paidValues.currencyChips}
          icon={<TrendingUp size={16} />}
          color="#48be9d"
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <KpiStatCard
          title={t.analytics.totalOwed}
          values={owedValues.values}
          currencyChips={owedValues.currencyChips}
          icon={<TrendingDown size={16} />}
          color="#e74c3c"
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <KpiStatCard
          title={t.analytics.netPosition}
          values={netValues.values}
          currencyChips={netValues.currencyChips}
          icon={<Wallet size={16} />}
          color={netIsPositive ? '#48be9d' : '#e74c3c'}
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <KpiStatCard
          title={t.analytics.transactions}
          values={[{ amount: stats.transactionCount, currency: '', isCount: true }]}
          icon={<Receipt size={16} />}
          color="#3498db"
        />
      </Grid>
    </Grid>
  );
};
