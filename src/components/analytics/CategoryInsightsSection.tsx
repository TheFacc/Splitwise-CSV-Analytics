import React, { useMemo } from 'react';
import { Grid, Box } from '@mui/material';
import { useStore } from '../../store';
import { getTranslation } from '../../i18n/translations';
import { SectionCard } from './SectionCard';
import { CategorySummaryTable } from './CategorySummaryTable';
import { CategoryMemberMatrix } from './CategoryMemberMatrix';
import { useCategoryStats, useCategoryMemberMatrix } from '../../hooks/useAnalyticsData';
import type { Transaction } from '../../types';

interface CategoryInsightsSectionProps {
  transactions: Transaction[];
  currency: string;
}

/**
 * Category Insights section with summary table and member matrix.
 */
export const CategoryInsightsSection: React.FC<CategoryInsightsSectionProps> = ({
  transactions,
  currency,
}) => {
  const { language } = useStore();
  const t = useMemo(() => getTranslation(language), [language]);

  const categoryStats = useCategoryStats(transactions, currency);
  const matrixData = useCategoryMemberMatrix(transactions);

  return (
    <SectionCard
      title={t.analytics.categoryInsights}
      description={t.analytics.categoryInsightsDesc}
    >
      <Grid container spacing={3}>
        {/* Category Summary Table */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Box
            sx={{
              p: 2,
              bgcolor: 'action.hover',
              borderRadius: 2,
              height: '100%',
            }}
          >
            <Box sx={{ fontWeight: 600, mb: 1.5, fontSize: '0.875rem' }}>
              {t.analytics.categorySummary}
            </Box>
            <CategorySummaryTable categoryStats={categoryStats} currency={currency} />
          </Box>
        </Grid>

        {/* Category-Member Matrix */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Box
            sx={{
              p: 2,
              bgcolor: 'action.hover',
              borderRadius: 2,
              height: '100%',
            }}
          >
            <Box sx={{ fontWeight: 600, mb: 1.5, fontSize: '0.875rem' }}>
              {t.analytics.whoPaysWhat}
            </Box>
            <CategoryMemberMatrix
              categories={matrixData.categories}
              members={matrixData.members}
              data={matrixData.data}
              maxAmount={matrixData.maxAmount}
              currency={currency}
              currencies={matrixData.currencies}
            />
          </Box>
        </Grid>
      </Grid>
    </SectionCard>
  );
};
