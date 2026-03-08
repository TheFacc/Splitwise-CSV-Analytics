import React, { useState, useMemo, useEffect } from 'react';
import { Box, Grid, Typography } from '@mui/material';
import { useStore } from '../../store';
import { getTranslation } from '../../i18n/translations';
import { SectionCard } from './SectionCard';
import { MemberSelector } from './MemberSelector';
import { MemberSummaryStats } from './MemberSummaryStats';
import { MemberCategoryChart } from './MemberCategoryChart';
import { MemberNetTimeline } from './MemberNetTimeline';
import { CounterpartyBreakdown } from './CounterpartyBreakdown';
import { useMemberStats, useCategoryStats } from '../../hooks/useAnalyticsData';
import type { Transaction, Member } from '../../types';

interface PerMemberInsightsSectionProps {
  transactions: Transaction[];
  members: Member[];
  currency: string;
}

/**
 * Per-member Insights section with member selector and detailed analytics.
 */
export const PerMemberInsightsSection: React.FC<PerMemberInsightsSectionProps> = ({
  transactions,
  members,
  currency,
}) => {
  const { language } = useStore();
  const t = useMemo(() => getTranslation(language), [language]);

  // Extract member names
  const memberNames = useMemo(() => members.map((m) => m.name), [members]);

  // Selected member (default to first)
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  // Auto-select first member if none selected
  useEffect(() => {
    if (!selectedMember && memberNames.length > 0) {
      setSelectedMember(memberNames[0]);
    }
  }, [memberNames, selectedMember]);

  // Get stats for selected member
  const memberStats = useMemberStats(transactions, members, selectedMember ?? undefined);
  const groupCategoryStats = useCategoryStats(transactions, currency);

  if (memberNames.length === 0) {
    return null;
  }

  return (
    <SectionCard
      title={t.analytics.perMemberInsights}
      description={
        language === 'it'
          ? 'Analisi dettagliata delle spese per singolo membro'
          : 'Detailed expense analysis for individual members'
      }
    >
      {/* Member Selector */}
      <MemberSelector
        members={memberNames}
        selectedMember={selectedMember}
        onSelect={setSelectedMember}
      />

      {memberStats && (
        <>
          {/* Member Summary Stats */}
          <MemberSummaryStats stats={memberStats} currency={currency} />

          {/* Charts Grid */}
          <Grid container spacing={3}>
            {/* Category breakdown */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'action.hover',
                  borderRadius: 2,
                  height: '100%',
                }}
              >
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                  {t.analytics.spendingByCategory}
                </Typography>
                <MemberCategoryChart
                  memberBreakdown={memberStats.categoryBreakdown}
                  groupCategoryStats={groupCategoryStats}
                  currency={currency}
                />
              </Box>
            </Grid>

            {/* Net timeline */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'action.hover',
                  borderRadius: 2,
                  height: '100%',
                }}
              >
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                  {t.analytics.balanceOverTime}
                </Typography>
                <MemberNetTimeline monthlyNet={memberStats.monthlyNet} currency={currency} />
              </Box>
            </Grid>

            {/* Counterparty breakdown */}
            <Grid size={{ xs: 12 }}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'action.hover',
                  borderRadius: 2,
                }}
              >
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                  {t.analytics.flowsWithOtherMembers}
                </Typography>
                <CounterpartyBreakdown
                  flows={memberStats.counterpartyFlows}
                  currency={currency}
                />
              </Box>
            </Grid>
          </Grid>
        </>
      )}
    </SectionCard>
  );
};
