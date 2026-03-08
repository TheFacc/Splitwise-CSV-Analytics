import { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Search, X, ArrowUpDown, ArrowLeftRight, HelpCircle, User, Users } from 'lucide-react';
import { useStore, useFilteredTransactions } from '../../store';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getTranslation } from '../../i18n/translations';
import { Transaction } from '../../types';
import { convertAmount } from '../../hooks/useCurrencyRates';

interface ParticipantDetails {
  payers: { name: string; amount: number; isEstimated: boolean }[];
  debtors: { name: string; amount: number }[];
  involvementType: 'strict_net' | 'inferred';
}

const inferParticipantDetails = (tx: Transaction): ParticipantDetails => {
  // Handle transfers explicitly
  if (tx.isTransfer && tx.transferFrom && tx.transferTo) {
    return {
      payers: [{ name: tx.transferFrom, amount: tx.cost, isEstimated: false }],
      debtors: [{ name: tx.transferTo, amount: tx.cost }],
      involvementType: 'strict_net' // Transfers are exact
    };
  }

  const creditors = Object.entries(tx.memberBalances)
    .filter(([_, amount]) => amount > 0.005)
    .map(([name, amount]) => ({ name, amount }));
    
  const debtors = Object.entries(tx.memberBalances)
    .filter(([_, amount]) => amount < -0.005)
    .map(([name, amount]) => ({ name, amount: Math.abs(amount) }));

  // Tier 1 & 2: Single Payer (Most common)
  if (creditors.length === 1) {
    const payer = creditors[0];
    const isFullPayment = Math.abs(payer.amount - tx.cost) < 0.01;
    
    // If payer didn't pay full amount (net balance < cost), it means they also have a share
    // We infer they paid the full cost, and their share is (Cost - Balance)
    const inferredPaidAmount = tx.cost;
    const payerShare = tx.cost - payer.amount;

    return {
      payers: [{ 
        name: payer.name, 
        amount: inferredPaidAmount, 
        isEstimated: !isFullPayment 
      }],
      debtors: [
        ...debtors,
        // Add payer to debtors list if they have a share (Tier 2)
        ...(payerShare > 0.005 ? [{ name: payer.name, amount: payerShare }] : [])
      ],
      involvementType: isFullPayment ? 'strict_net' : 'inferred'
    };
  }

  // Tier 3: Multiple Payers (Ambiguous) -> Fallback to Net Balances
  return {
    payers: creditors.map(c => ({ name: c.name, amount: c.amount, isEstimated: false })), 
    debtors: debtors,
    involvementType: 'strict_net'
  };
};

export const TransactionsTable = () => {
  const { parsedData, filters, setFilters, language, preferredCurrency, exchangeRates } = useStore();
  const filteredTransactions = useFilteredTransactions();
  const t = useMemo(() => getTranslation(language), [language]);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Apply search filter
  const displayedTransactions = useMemo(() => {
    let result = filteredTransactions;

    // Local member filter
    if (filters.member) {
      result = result.filter(tx => Object.keys(tx.memberBalances).includes(filters.member!));
    }

    // Local category filter
    if (filters.category) {
      result = result.filter(tx => tx.category === filters.category);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (tx) =>
          tx.description.toLowerCase().includes(query) ||
          tx.category.toLowerCase().includes(query)
      );
    }

    // Sort by date
    result = [...result].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [filteredTransactions, searchQuery, sortOrder, filters.member, filters.category]);

  // Pagination
  const paginatedTransactions = useMemo(() => {
    const start = page * rowsPerPage;
    return displayedTransactions.slice(start, start + rowsPerPage);
  }, [displayedTransactions, page, rowsPerPage]);

  if (!parsedData) {
    return null;
  }

  const { members } = parsedData;

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    filteredTransactions.forEach(tx => cats.add(tx.category));
    return Array.from(cats).sort((a, b) => a.localeCompare(b));
  }, [filteredTransactions]);

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleClearFilters = () => {
    setFilters({ member: null, category: null });
    setSearchQuery('');
  };

  const hasActiveFilters = filters.member || filters.category || searchQuery;

  // Render cell with list of names or count
  const renderParticipantCell = (
    participants: { name: string; amount: number; isEstimated?: boolean }[],
    _type: 'payers' | 'debtors',
    details: ParticipantDetails,
    currency: string
  ) => {
    if (participants.length === 0) return <Typography variant="body2" color="text.secondary">-</Typography>;

    const names = participants.map(p => p.name).join(', ');
    const display = participants.length > 2 
      ? `${participants.length} ${t.transactions.people}`
      : names;

    const tooltipContent = (
      <Box sx={{ p: 0.5 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, borderBottom: '1px solid rgba(255,255,255,0.2)', pb: 0.5 }}>
          {t.transactions.breakdown}
        </Typography>
        
        {/* Payers Section */}
        {details.payers.map((p) => {
          const convertedAmount = preferredCurrency && exchangeRates 
            ? convertAmount(p.amount, currency, preferredCurrency, exchangeRates) 
            : null;
          
          const displayAmount = convertedAmount !== null 
            ? formatCurrency(convertedAmount, preferredCurrency!)
            : formatCurrency(p.amount, currency);

          const originalAmountStr = convertedAmount !== null && currency !== preferredCurrency
            ? ` (${formatCurrency(p.amount, currency)})`
            : '';

          return (
            <Typography key={`payer-${p.name}`} variant="body2" sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
              <span>{p.name}:</span>
              <span style={{ fontWeight: 600, color: '#48be9d' }}>
                {details.involvementType === 'inferred' && p.isEstimated
                  ? t.transactions.paidEstimated.replace('{{amount}}', displayAmount) + originalAmountStr
                  : details.involvementType === 'strict_net' && !details.payers[0].isEstimated 
                    ? t.transactions.getsBack + ' ' + displayAmount + originalAmountStr // Fallback for Tier 3
                    : t.transactions.paidFull.replace('{{amount}}', displayAmount) + originalAmountStr
                }
              </span>
            </Typography>
          );
        })}

        {/* Debtors Section */}
        {details.debtors.map((d) => {
          const convertedAmount = preferredCurrency && exchangeRates 
            ? convertAmount(d.amount, currency, preferredCurrency, exchangeRates) 
            : null;
          
          const displayAmount = convertedAmount !== null 
            ? formatCurrency(convertedAmount, preferredCurrency!)
            : formatCurrency(d.amount, currency);

          const originalAmountStr = convertedAmount !== null && currency !== preferredCurrency
            ? ` (${formatCurrency(d.amount, currency)})`
            : '';

          return (
            <Typography key={`debtor-${d.name}`} variant="body2" sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mt: 0.5 }}>
              <span>{d.name}:</span>
              <span style={{ fontWeight: 600, color: '#ff652f' }}>
                {details.involvementType === 'inferred'
                   ? `${t.transactions.share} ${displayAmount}${originalAmountStr}`  // Tier 2: Show "Share"
                   : `${t.dashboard.owes} ${displayAmount}${originalAmountStr}`  // Tier 1/3: Show "Owes"
                }
              </span>
            </Typography>
          );
        })}

        {details.involvementType === 'inferred' && (
          <Typography variant="caption" sx={{ display: 'block', mt: 1, fontStyle: 'italic', opacity: 0.8, maxWidth: 250 }}>
            {t.transactions.inferredTooltip}
          </Typography>
        )}
      </Box>
    );

    return (
      <Tooltip title={tooltipContent} arrow placement="left">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'help' }}>
          {participants.length > 2 ? <Users size={14} /> : <User size={14} />}
          <Typography variant="body2" noWrap sx={{ maxWidth: 120 }}>
            {display}
          </Typography>
        </Box>
      </Tooltip>
    );
  };

  return (
    <Paper sx={{ overflow: 'hidden' }}>
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 2,
            alignItems: { md: 'center' },
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="h6" fontWeight={600}>
            {t.transactions.title}
          </Typography>

          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              flexWrap: 'wrap',
              gap: 2,
              alignItems: { xs: 'stretch', sm: 'center' },
              width: { xs: '100%', md: 'auto' },
            }}
          >
            {/* Search */}
            <TextField
              size="small"
              placeholder={t.transactions.search}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} />
                  </InputAdornment>
                ),
              }}
              sx={{ width: { xs: '100%', sm: 200 } }}
            />

            {/* Member Filter */}
            <FormControl size="small" sx={{ minWidth: 140, width: { xs: '100%', sm: 'auto' } }}>
              <InputLabel>{t.transactions.member}</InputLabel>
              <Select
                value={filters.member || ''}
                label={t.transactions.member}
                onChange={(e) => {
                  setFilters({ member: e.target.value || null });
                  setPage(0);
                }}
              >
                <MenuItem value="">{t.transactions.all}</MenuItem>
                {members.map((m) => (
                  <MenuItem key={m.name} value={m.name}>
                    {m.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Category Filter */}
            <FormControl size="small" sx={{ minWidth: 140, width: { xs: '100%', sm: 'auto' } }}>
              <InputLabel>{t.transactions.category}</InputLabel>
              <Select
                value={filters.category || ''}
                label={t.transactions.category}
                onChange={(e) => {
                  setFilters({ category: e.target.value || null });
                  setPage(0);
                }}
              >
                <MenuItem value="">{t.transactions.all}</MenuItem>
                {availableCategories.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Tooltip title={t.transactions.clearFilters}>
                <IconButton size="small" onClick={handleClearFilters}>
                  <X size={18} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell
                sx={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {t.transactions.date}
                  <ArrowUpDown size={14} />
                </Box>
              </TableCell>
              <TableCell>{t.transactions.description}</TableCell>
              <TableCell>{t.transactions.category}</TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {t.transactions.paidBy}
                  <Tooltip title={t.transactions.inferredTooltip}>
                    <HelpCircle size={14} style={{ opacity: 0.5 }} />
                  </Tooltip>
                </Box>
              </TableCell>
              <TableCell>{t.transactions.involved}</TableCell>
              <TableCell align="right">{t.transactions.amount}</TableCell>
              <TableCell>{t.transactions.type}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedTransactions.map((tx) => {
              const details = inferParticipantDetails(tx);
              return (
                <TableRow
                  key={tx.id}
                  sx={{
                    '&:hover': { bgcolor: 'action.hover' },
                    bgcolor: tx.isTransfer ? 'rgba(255, 101, 47, 0.05)' : 'transparent',
                  }}
                >
                  <TableCell>
                    <Typography variant="body2">{formatDate(tx.date, language === 'it' ? 'it-IT' : 'en-US')}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 200 }} noWrap>
                      {tx.description}
                    </Typography>
                    {tx.isTransfer && tx.transferFrom && tx.transferTo && (
                      <Typography variant="caption" color="text.secondary">
                        {tx.transferFrom} → {tx.transferTo}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={tx.category}
                      size="small"
                      sx={{
                        bgcolor: tx.isTransfer ? 'rgba(255, 101, 47, 0.15)' : 'rgba(72, 190, 157, 0.15)',
                        color: tx.isTransfer ? '#ff652f' : '#48be9d',
                        fontWeight: 500,
                      }}
                    />
                  </TableCell>
                  
                  {/* Paid By Column */}
                  <TableCell>
                    {renderParticipantCell(details.payers, 'payers', details, tx.currency)}
                  </TableCell>
                  
                  {/* Involved Column */}
                  <TableCell>
                    {renderParticipantCell(details.debtors, 'debtors', details, tx.currency)}
                  </TableCell>

                  <TableCell align="right">
                    {(() => {
                      const convertedAmount = preferredCurrency && exchangeRates 
                        ? convertAmount(tx.cost, tx.currency, preferredCurrency, exchangeRates) 
                        : null;
                      
                      if (convertedAmount !== null && tx.currency !== preferredCurrency) {
                        return (
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <Typography variant="body2" fontWeight={600}>
                              {formatCurrency(convertedAmount, preferredCurrency!)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatCurrency(tx.cost, tx.currency)}
                            </Typography>
                          </Box>
                        );
                      }
                      
                      return (
                        <Typography variant="body2" fontWeight={600}>
                          {formatCurrency(tx.cost, tx.currency)}
                        </Typography>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    {tx.isTransfer ? (
                      <Chip
                        icon={<ArrowLeftRight size={14} />}
                        label={t.transactions.transfer}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor: '#ff652f',
                          color: '#ff652f',
                          '& .MuiChip-icon': { color: '#ff652f' },
                        }}
                      />
                    ) : (
                      <Chip
                        label={t.transactions.expense}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor: '#48be9d',
                          color: '#48be9d',
                        }}
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {paginatedTransactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    {t.transactions.noResults}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component="div"
        count={displayedTransactions.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage={t.transactions.rowsPerPage}
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} ${t.common.of} ${count}`
        }
      />
    </Paper>
  );
};
