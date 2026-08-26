import React, { useMemo, useState } from 'react';
import { Box, Tooltip, useTheme, Tabs, Tab, Typography, Stack } from '@mui/material';
import { useStore } from '../../store';
import { getTranslation } from '../../i18n/translations';
import { formatCurrency } from '../../utils/formatters';
import { convertAmount } from '../../hooks/useCurrencyRates';

interface CategoryMemberCell {
  category: string;
  member: string;
  amount: number;
  amountsByCurrency: Record<string, number>;
}

interface CategoryMemberMatrixProps {
  categories: string[];
  members: string[];
  data: CategoryMemberCell[];
  maxAmount: number;
  currency: string;
  currencies?: string[];
}

/**
 * Heatmap-style matrix showing category × member amounts.
 * Darker colors indicate higher amounts.
 * Supports multi-currency with tabs when not converted.
 */
export const CategoryMemberMatrix: React.FC<CategoryMemberMatrixProps> = ({
  categories,
  members,
  data,
  maxAmount: _maxAmount,
  currency,
  currencies: propCurrencies,
}) => {
  const theme = useTheme();
  const { language, preferredCurrency, exchangeRates } = useStore();
  const t = useMemo(() => getTranslation(language), [language]);
  const [selectedCurrencyTab, setSelectedCurrencyTab] = useState(0);

  const isConverted = preferredCurrency && exchangeRates;

  // Get all unique currencies from the data
  const currencies = useMemo(() => {
    if (propCurrencies && propCurrencies.length > 0) return propCurrencies;
    const currencySet = new Set<string>();
    data.forEach(d => {
      Object.keys(d.amountsByCurrency || {}).forEach(cur => currencySet.add(cur));
    });
    return Array.from(currencySet).sort();
  }, [data, propCurrencies]);

  const selectedCurrency = currencies[selectedCurrencyTab] || currency;
  const displayCurrency = isConverted ? preferredCurrency! : selectedCurrency;

  // Build lookup map for O(1) access, with currency-aware amounts
  const cellMap = useMemo(() => {
    const map = new Map<string, { amount: number; amountsByCurrency: Record<string, number> }>();
    data.forEach((d) => {
      let displayAmount: number;
      if (isConverted) {
        // Convert all currencies to preferred currency
        displayAmount = 0;
        for (const [cur, amt] of Object.entries(d.amountsByCurrency || {})) {
          const conv = convertAmount(amt, cur, preferredCurrency!, exchangeRates!);
          displayAmount += conv ?? 0;
        }
      } else {
        // Use selected currency only
        displayAmount = d.amountsByCurrency?.[selectedCurrency] || 0;
      }
      map.set(`${d.category}|${d.member}`, { 
        amount: displayAmount, 
        amountsByCurrency: d.amountsByCurrency || {},
      });
    });
    return map;
  }, [data, isConverted, preferredCurrency, exchangeRates, selectedCurrency]);

  // Compute totals per member and per category
  const memberTotals = useMemo(() => {
    const totals = new Map<string, { amount: number; amountsByCurrency: Record<string, number> }>();
    members.forEach(member => {
      let totalAmount = 0;
      const totalByCurrency: Record<string, number> = {};
      categories.forEach(category => {
        const cell = cellMap.get(`${category}|${member}`);
        if (cell) {
          totalAmount += cell.amount;
          Object.entries(cell.amountsByCurrency).forEach(([cur, amt]) => {
            totalByCurrency[cur] = (totalByCurrency[cur] || 0) + amt;
          });
        }
      });
      totals.set(member, { amount: totalAmount, amountsByCurrency: totalByCurrency });
    });
    return totals;
  }, [members, categories, cellMap]);

  const categoryTotals = useMemo(() => {
    const totals = new Map<string, { amount: number; amountsByCurrency: Record<string, number> }>();
    categories.forEach(category => {
      let totalAmount = 0;
      const totalByCurrency: Record<string, number> = {};
      members.forEach(member => {
        const cell = cellMap.get(`${category}|${member}`);
        if (cell) {
          totalAmount += cell.amount;
          Object.entries(cell.amountsByCurrency).forEach(([cur, amt]) => {
            totalByCurrency[cur] = (totalByCurrency[cur] || 0) + amt;
          });
        }
      });
      totals.set(category, { amount: totalAmount, amountsByCurrency: totalByCurrency });
    });
    return totals;
  }, [categories, members, cellMap]);

  const grandTotal = useMemo(() => {
    let total = 0;
    for (const { amount } of memberTotals.values()) {
      total += amount;
    }
    return total;
  }, [memberTotals]);

  // Compute max for the current view
  const displayMax = useMemo(() => {
    let max = 0;
    for (const { amount } of cellMap.values()) {
      if (amount > max) max = amount;
    }
    return max;
  }, [cellMap]);

  // Generate color based on intensity
  const getColor = (amount: number): string => {
    if (displayMax === 0 || amount === 0) {
      return theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
    }
    const intensity = Math.min(amount / displayMax, 1);
    // Splitwise mint color with varying opacity
    return `rgba(72, 190, 157, ${0.15 + intensity * 0.7})`;
  };

  if (categories.length === 0 || members.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
        {t.analytics.noDataAvailable}
      </Box>
    );
  }

  const cellSize = 50;

  return (
    <Box>
      {/* Currency tabs when not converted and multiple currencies */}
      {!isConverted && currencies.length > 1 && (
        <Tabs
          value={selectedCurrencyTab}
          onChange={(_, v) => setSelectedCurrencyTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ 
            minHeight: 32, 
            mb: 1,
            '& .MuiTab-root': { minHeight: 32, py: 0.5, fontSize: '0.75rem' }
          }}
        >
          {currencies.map((cur) => (
            <Tab key={cur} label={cur} />
          ))}
        </Tabs>
      )}

      <Box
        sx={{
          overflowX: 'auto',
          overflowY: 'auto',
          maxHeight: 440,
          '&::-webkit-scrollbar': { height: 6, width: 6 },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'primary.main', borderRadius: 3 },
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `120px repeat(${members.length}, ${cellSize}px) ${cellSize + 10}px`,
            gridTemplateRows: `auto repeat(${categories.length}, ${cellSize}px) ${cellSize}px`,
            gap: 0.5,
            minWidth: 'fit-content',
          }}
        >
          {/* Empty corner cell */}
          <Box sx={{ p: 1 }} />

          {/* Member header row */}
          {members.map((member) => (
            <Box
              key={member}
              sx={{
                p: 0.5,
                fontSize: '0.65rem',
                fontWeight: 600,
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={member}
            >
              {member.length > 7 ? member.slice(0, 6) + '…' : member}
            </Box>
          ))}

          {/* Total Column Header */}
          <Box
            sx={{
              p: 0.5,
              fontSize: '0.65rem',
              fontWeight: 700,
              textAlign: 'center',
              color: 'primary.main',
            }}
          >
            {t.analytics.total}
          </Box>

          {/* Category rows */}
          {categories.map((category) => {
            const catTotalData = categoryTotals.get(category);
            const catTotalAmount = catTotalData?.amount || 0;
            return (
              <React.Fragment key={category}>
                {/* Category label */}
                <Box
                  sx={{
                    p: 1,
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={category}
                >
                  {category}
                </Box>

                {/* Value cells */}
                {members.map((member) => {
                  const cellData = cellMap.get(`${category}|${member}`);
                  const amount = cellData?.amount || 0;
                  const amountsByCurrency = cellData?.amountsByCurrency || {};
                  return (
                    <Tooltip
                      key={`${category}|${member}`}
                      title={
                        <Box>
                          <Box fontWeight={600}>{member}</Box>
                          <Box>{category}</Box>
                          {isConverted ? (
                            <>
                              <Box mt={0.5} fontWeight={600}>
                                {formatCurrency(amount, displayCurrency)}
                              </Box>
                              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                                {Object.entries(amountsByCurrency)
                                  .filter(([_, amt]) => amt > 0)
                                  .map(([cur, amt]) => (
                                    <Typography key={cur} variant="body2" sx={{ fontSize: '0.7rem' }}>
                                      {formatCurrency(amt, cur)}
                                    </Typography>
                                  ))}
                              </Stack>
                            </>
                          ) : (
                            <Box mt={0.5}>{formatCurrency(amount, displayCurrency)}</Box>
                          )}
                        </Box>
                      }
                      arrow
                      placement="top"
                    >
                      <Box
                        sx={{
                          bgcolor: getColor(amount),
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.6rem',
                          color: amount > displayMax * 0.5 ? 'white' : 'text.primary',
                          fontWeight: amount > 0 ? 500 : 400,
                          cursor: 'default',
                          transition: 'transform 0.1s ease',
                          '&:hover': {
                            transform: 'scale(1.05)',
                            zIndex: 1,
                          },
                        }}
                      >
                        {amount > 0
                          ? amount >= 1000
                            ? `${(amount / 1000).toFixed(1)}k`
                            : Math.round(amount)
                          : ''}
                      </Box>
                    </Tooltip>
                  );
                })}

                {/* Category Total Cell */}
                <Tooltip
                  title={
                    <Box>
                      <Box fontWeight={600}>{category} ({t.analytics.total})</Box>
                      <Box mt={0.5}>{formatCurrency(catTotalAmount, displayCurrency)}</Box>
                    </Box>
                  }
                  arrow
                  placement="top"
                >
                  <Box
                    sx={{
                      bgcolor: 'action.selected',
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      color: 'text.primary',
                    }}
                  >
                    {catTotalAmount > 0
                      ? catTotalAmount >= 1000
                        ? `${(catTotalAmount / 1000).toFixed(1)}k`
                        : Math.round(catTotalAmount)
                      : '0'}
                  </Box>
                </Tooltip>
              </React.Fragment>
            );
          })}

          {/* Bottom Total Row */}
          {/* Total Label */}
          <Box
            sx={{
              p: 1,
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              color: 'primary.main',
              borderTop: 1,
              borderColor: 'divider',
            }}
          >
            {t.analytics.total}
          </Box>

          {/* Member Totals */}
          {members.map((member) => {
            const memberTotalData = memberTotals.get(member);
            const totalAmount = memberTotalData?.amount || 0;
            return (
              <Tooltip
                key={`total-${member}`}
                title={
                  <Box>
                    <Box fontWeight={600}>{member} ({t.analytics.total})</Box>
                    <Box mt={0.5}>{formatCurrency(totalAmount, displayCurrency)}</Box>
                  </Box>
                }
                arrow
                placement="top"
              >
                <Box
                  sx={{
                    bgcolor: 'action.selected',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: totalAmount > 0 ? 'primary.main' : 'text.secondary',
                    borderTop: 1,
                    borderColor: 'divider',
                  }}
                >
                  {totalAmount > 0
                    ? totalAmount >= 1000
                      ? `${(totalAmount / 1000).toFixed(1)}k`
                      : Math.round(totalAmount)
                    : '0'}
                </Box>
              </Tooltip>
            );
          })}

          {/* Grand Total Cell */}
          <Tooltip
            title={
              <Box>
                <Box fontWeight={600}>{t.analytics.globalOverview} ({t.analytics.total})</Box>
                <Box mt={0.5}>{formatCurrency(grandTotal, displayCurrency)}</Box>
              </Box>
            }
            arrow
            placement="top"
          >
            <Box
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.65rem',
                fontWeight: 700,
              }}
            >
              {grandTotal >= 1000 ? `${(grandTotal / 1000).toFixed(1)}k` : Math.round(grandTotal)}
            </Box>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
};
