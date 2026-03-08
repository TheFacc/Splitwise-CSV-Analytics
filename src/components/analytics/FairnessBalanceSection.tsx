import React, { useMemo } from 'react';
import { Grid, Box, Typography } from '@mui/material';
import { useStore } from '../../store';
import { SectionCard } from './SectionCard';
import { FairnessIndexList } from './FairnessIndexList';
import { SettlementSummaryCard } from './SettlementSummaryCard';
import { ImbalanceOverTimeChart } from './ImbalanceOverTimeChart';
import { useFairnessStats } from '../../hooks/useAnalyticsData';
import { getTranslation } from '../../i18n/translations';
import type { Transaction } from '../../types';

interface FairnessBalanceSectionProps {
  transactions: Transaction[];
  currency: string;
}

/**
 * Fairness & Balance section answering "is this group balanced?"
 */
export const FairnessBalanceSection: React.FC<FairnessBalanceSectionProps> = ({
  transactions,
  currency,
}) => {
  const { language } = useStore();
  const t = useMemo(() => getTranslation(language), [language]);

  const fairnessStats = useFairnessStats(transactions);

  return (
    <SectionCard
      title={t.analytics.fairnessAndBalance}
      description={t.analytics.fairnessDesc}
    >
      <Grid container spacing={3}>
        {/* Settlement Summary */}
        <Grid size={{ xs: 12, md: 4 }}>
          <SettlementSummaryCard
            totalImbalance={fairnessStats.totalImbalance}
            totalImbalanceByCurrency={fairnessStats.totalImbalanceByCurrency}
            memberPairsWithImbalance={fairnessStats.memberPairsWithImbalance}
            currency={currency}
          />
        </Grid>

        {/* Imbalance Over Time */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Box
            sx={{
              p: 2,
              bgcolor: 'action.hover',
              borderRadius: 2,
              height: '100%',
            }}
          >
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
              {t.analytics.imbalanceOverTime}
            </Typography>
            <ImbalanceOverTimeChart
              imbalanceOverTime={fairnessStats.imbalanceOverTime}
              currency={currency}
              currencies={fairnessStats.currencies}
            />
          </Box>
        </Grid>

        {/* Fairness Index */}
        <Grid size={{ xs: 12 }}>
          <Box
            sx={{
              p: 2,
              bgcolor: 'action.hover',
              borderRadius: 2,
            }}
          >
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
              {t.analytics.fairnessIndex}
            </Typography>
            <FairnessIndexList 
              memberStats={fairnessStats.memberStats} 
              currencies={fairnessStats.currencies}
            />
          </Box>
        </Grid>
      </Grid>
    </SectionCard>
  );
};
