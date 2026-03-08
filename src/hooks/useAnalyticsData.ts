import { useMemo } from 'react';
import type { Transaction, Member, ParsedData } from '../types';
import { filterByTimeRange, TimeRange } from '../components/analytics/TimeRangeFilter';

/**
 * Filter transactions by time range and compute analytics data
 */
export const useFilteredAnalytics = (
  parsedData: ParsedData | null,
  timeRange: TimeRange
) => {
  return useMemo(() => {
    if (!parsedData) {
      return {
        transactions: [],
        members: [],
        categories: [],
        currencies: [],
        isEmpty: true,
      };
    }

    const filteredTransactions = filterByTimeRange(parsedData.transactions, timeRange);

    return {
      transactions: filteredTransactions,
      members: parsedData.members,
      categories: parsedData.categories,
      currencies: parsedData.currencies,
      isEmpty: filteredTransactions.length === 0,
    };
  }, [parsedData, timeRange]);
};

/**
 * Category-level statistics
 */
export interface CategoryStats {
  category: string;
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
  currency: string;
  // Per-currency amounts for multi-currency display
  amountsByCurrency: Record<string, number>;
  // Per-currency transaction counts for tooltip
  transactionsByCurrency: Record<string, number>;
  // Monthly trend data for sparklines (legacy: sums across currencies)
  monthlyTrend: { month: string; amount: number }[];
  // Per-currency monthly trends (for multi-currency sparklines)
  monthlyTrendByCurrency: Record<string, { month: string; amount: number }[]>;
}

export const useCategoryStats = (
  transactions: Transaction[],
  primaryCurrency: string
): CategoryStats[] => {
  return useMemo(() => {
    if (transactions.length === 0) return [];

    // Group by category
    const categoryMap = new Map<
      string,
      { 
        total: number; 
        count: number; 
        byMonth: Map<string, number>;
        byMonthByCurrency: Map<string, Map<string, number>>;
        byCurrency: Record<string, number>;
        countByCurrency: Record<string, number>;
      }
    >();

    transactions.forEach((tx) => {
      if (tx.isTransfer) return; // Skip transfers

      const existing = categoryMap.get(tx.category) || {
        total: 0,
        count: 0,
        byMonth: new Map<string, number>(),
        byMonthByCurrency: new Map<string, Map<string, number>>(),
        byCurrency: {},
        countByCurrency: {},
      };

      existing.total += tx.cost;
      existing.count += 1;
      existing.byCurrency[tx.currency] = (existing.byCurrency[tx.currency] || 0) + tx.cost;
      existing.countByCurrency[tx.currency] = (existing.countByCurrency[tx.currency] || 0) + 1;

      // Group by month for trend
      const monthKey = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`;
      existing.byMonth.set(monthKey, (existing.byMonth.get(monthKey) || 0) + tx.cost);

      // Track monthly trend per currency
      if (!existing.byMonthByCurrency.has(tx.currency)) {
        existing.byMonthByCurrency.set(tx.currency, new Map<string, number>());
      }
      const curMonthMap = existing.byMonthByCurrency.get(tx.currency)!;
      curMonthMap.set(monthKey, (curMonthMap.get(monthKey) || 0) + tx.cost);

      categoryMap.set(tx.category, existing);
    });

    // Convert to array and sort by total descending
    const stats: CategoryStats[] = Array.from(categoryMap.entries())
      .map(([category, data]) => {
        // Build per-currency monthly trends
        const monthlyTrendByCurrency: Record<string, { month: string; amount: number }[]> = {};
        for (const [cur, monthMap] of data.byMonthByCurrency.entries()) {
          monthlyTrendByCurrency[cur] = Array.from(monthMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, amount]) => ({ month, amount }));
        }

        return {
          category,
          totalAmount: data.total,
          transactionCount: data.count,
          averageAmount: data.count > 0 ? data.total / data.count : 0,
          currency: primaryCurrency,
          amountsByCurrency: data.byCurrency,
          transactionsByCurrency: data.countByCurrency,
          monthlyTrend: Array.from(data.byMonth.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, amount]) => ({ month, amount })),
          monthlyTrendByCurrency,
        };
      })
      .sort((a, b) => b.totalAmount - a.totalAmount);

    return stats;
  }, [transactions, primaryCurrency]);
};

/**
 * Member-level statistics
 */
export interface MemberStats {
  name: string;
  totalPaid: number;
  totalOwed: number;
  netBalance: number;
  transactionCount: number;
  // Per-currency totals
  paidByCurrency: Record<string, number>;
  owedByCurrency: Record<string, number>;
  // Category breakdown for this member
  categoryBreakdown: { 
    category: string; 
    amount: number; 
    percentage: number;
    amountsByCurrency: Record<string, number>; // Per-currency amounts
  }[];
  // Monthly net cumulative for timeline
  monthlyNet: { 
    month: string; 
    cumulative: number;
    cumulativeByCurrency: Record<string, number>; // Per-currency cumulative
  }[];
  // Counterparty flows
  counterpartyFlows: { 
    member: string; 
    netFlow: number;
    netFlowByCurrency: Record<string, number>; // Per-currency flows
  }[];
  // Per-currency net balances
  netBalanceByCurrency: Record<string, number>;
}

export const useMemberStats = (
  transactions: Transaction[],
  members: Member[],
  selectedMember?: string
): MemberStats | null => {
  return useMemo(() => {
    if (!selectedMember) return null;

    let totalPaid = 0;
    let totalOwed = 0;
    let transactionCount = 0;
    const paidByCurrency: Record<string, number> = {};
    const owedByCurrency: Record<string, number> = {};

    // Category tracking: Map<category, { total, byCurrency }>
    const categoryData = new Map<string, { total: number; byCurrency: Record<string, number> }>();
    
    // Monthly net tracking: Map<month, { total, byCurrency }>
    const monthlyNetData = new Map<string, { total: number; byCurrency: Record<string, number> }>();
    
    // Counterparty tracking: Map<member, { total, byCurrency }>
    const counterpartyData = new Map<string, { total: number; byCurrency: Record<string, number> }>();

    // Sort transactions by date for cumulative calculation
    const sortedTxs = [...transactions].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    sortedTxs.forEach((tx) => {
      const memberBalance = tx.memberBalances[selectedMember];
      if (memberBalance === undefined) return;

      const currency = tx.currency;
      transactionCount++;

      // Calculate paid vs owed (positive balance = paid more than share)
      if (memberBalance > 0) {
        totalPaid += memberBalance;
        paidByCurrency[currency] = (paidByCurrency[currency] || 0) + memberBalance;
      } else {
        const absBalance = Math.abs(memberBalance);
        totalOwed += absBalance;
        owedByCurrency[currency] = (owedByCurrency[currency] || 0) + absBalance;
      }

      // Category breakdown - calculate actual consumed amount (share)
      if (!tx.isTransfer && memberBalance !== 0) {
        let consumedAmount = 0;
        let positiveBalanceSum = 0;
        Object.values(tx.memberBalances).forEach(b => {
          if (b > 0) positiveBalanceSum += b;
        });

        if (positiveBalanceSum > 0) {
          if (memberBalance < 0) {
            consumedAmount = Math.abs(memberBalance);
          } else {
            const paidAmount = tx.cost * (memberBalance / positiveBalanceSum);
            consumedAmount = paidAmount - memberBalance;
            if (consumedAmount < 0) consumedAmount = 0;
          }
        }
        
        if (consumedAmount > 0) {
          const catData = categoryData.get(tx.category) || { total: 0, byCurrency: {} };
          catData.total += consumedAmount;
          catData.byCurrency[currency] = (catData.byCurrency[currency] || 0) + consumedAmount;
          categoryData.set(tx.category, catData);
        }
      }

      // Monthly net for timeline
      const monthKey = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`;
      const monthData = monthlyNetData.get(monthKey) || { total: 0, byCurrency: {} };
      monthData.total += memberBalance;
      monthData.byCurrency[currency] = (monthData.byCurrency[currency] || 0) + memberBalance;
      monthlyNetData.set(monthKey, monthData);

      // Counterparty flows (simplified: net balance with others in same transaction)
      if (!tx.isTransfer) {
        Object.entries(tx.memberBalances).forEach(([other, otherBalance]) => {
          if (other === selectedMember) return;
          
          let flow = 0;
          if (memberBalance > 0 && otherBalance < 0) {
            flow = Math.min(memberBalance, Math.abs(otherBalance));
          } else if (memberBalance < 0 && otherBalance > 0) {
            flow = -Math.min(Math.abs(memberBalance), otherBalance);
          }
          
          if (flow !== 0) {
            const cpData = counterpartyData.get(other) || { total: 0, byCurrency: {} };
            cpData.total += flow;
            cpData.byCurrency[currency] = (cpData.byCurrency[currency] || 0) + flow;
            counterpartyData.set(other, cpData);
          }
        });
      }
    });

    // Build category breakdown with percentages
    const totalCategoryAmount = Array.from(categoryData.values()).reduce((a, b) => a + b.total, 0);
    const categoryBreakdown = Array.from(categoryData.entries())
      .map(([category, data]) => ({
        category,
        amount: data.total,
        percentage: totalCategoryAmount > 0 ? (data.total / totalCategoryAmount) * 100 : 0,
        amountsByCurrency: data.byCurrency,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Build monthly cumulative net timeline
    const sortedMonths = Array.from(monthlyNetData.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    let cumulative = 0;
    const cumulativeByCurrency: Record<string, number> = {};
    const monthlyNet = sortedMonths.map(([month, data]) => {
      cumulative += data.total;
      // Update cumulative per currency
      for (const [cur, amt] of Object.entries(data.byCurrency)) {
        cumulativeByCurrency[cur] = (cumulativeByCurrency[cur] || 0) + amt;
      }
      return { 
        month, 
        cumulative, 
        cumulativeByCurrency: { ...cumulativeByCurrency } 
      };
    });

    // Build counterparty flows
    const counterpartyFlows = Array.from(counterpartyData.entries())
      .map(([member, data]) => ({ 
        member, 
        netFlow: data.total,
        netFlowByCurrency: data.byCurrency,
      }))
      .filter((f) => f.netFlow !== 0)
      .sort((a, b) => b.netFlow - a.netFlow);

    // Compute per-currency net balances
    const netBalanceByCurrency: Record<string, number> = {};
    for (const [cur, amt] of Object.entries(paidByCurrency)) {
      netBalanceByCurrency[cur] = (netBalanceByCurrency[cur] || 0) + amt;
    }
    for (const [cur, amt] of Object.entries(owedByCurrency)) {
      netBalanceByCurrency[cur] = (netBalanceByCurrency[cur] || 0) - amt;
    }

    return {
      name: selectedMember,
      totalPaid,
      totalOwed,
      netBalance: totalPaid - totalOwed,
      transactionCount,
      paidByCurrency,
      owedByCurrency,
      categoryBreakdown,
      monthlyNet,
      counterpartyFlows,
      netBalanceByCurrency,
    };
  }, [transactions, members, selectedMember]);
};

/**
 * All members' stats for overview charts
 */
export interface AllMembersNetBalance {
  name: string;
  /** Legacy: sum across all currencies. Only meaningful for single-currency datasets or sorting. */
  netBalance: number;
  /** Per-currency net balances for proper multi-currency display. */
  netBalanceByCurrency: Record<string, number>;
}

export const useAllMembersNetBalance = (
  transactions: Transaction[]
): AllMembersNetBalance[] => {
  return useMemo(() => {
    const balanceMap = new Map<string, number>();
    const balanceByCurrencyMap = new Map<string, Record<string, number>>();

    transactions.forEach((tx) => {
      Object.entries(tx.memberBalances).forEach(([member, balance]) => {
        balanceMap.set(member, (balanceMap.get(member) || 0) + balance);
        
        const byCurrency = balanceByCurrencyMap.get(member) || {};
        byCurrency[tx.currency] = (byCurrency[tx.currency] || 0) + balance;
        balanceByCurrencyMap.set(member, byCurrency);
      });
    });

    return Array.from(balanceMap.entries())
      .map(([name, netBalance]) => ({
        name,
        netBalance,
        netBalanceByCurrency: balanceByCurrencyMap.get(name) || {},
      }))
      .sort((a, b) => {
        // Sort by max absolute per-currency balance (avoids meaningless cross-currency sums)
        const maxAbsA = Math.max(...Object.values(a.netBalanceByCurrency).map(v => Math.abs(v)), 0);
        const maxAbsB = Math.max(...Object.values(b.netBalanceByCurrency).map(v => Math.abs(v)), 0);
        return maxAbsB - maxAbsA;
      });
  }, [transactions]);
};

/**
 * Fairness statistics
 */
export interface FairnessMemberStats {
  name: string;
  totalConsumed: number; // What they owe/consumed
  totalPaid: number; // What they paid/fronted
  consumptionShare: number; // Percentage of total consumption
  paymentShare: number; // Percentage of total payments
  // Per-currency breakdown for separate fairness
  consumedByCurrency: Record<string, number>;
  paidByCurrency: Record<string, number>;
  consumptionShareByCurrency: Record<string, number>; // % of consumption per currency
  paymentShareByCurrency: Record<string, number>; // % of payment per currency
}

export interface FairnessStats {
  memberStats: FairnessMemberStats[];
  totalImbalance: number;
  totalImbalanceByCurrency: Record<string, number>; // Per-currency imbalances
  memberPairsWithImbalance: number;
  // Imbalance over time
  imbalanceOverTime: { 
    date: string; 
    imbalance: number;
    imbalanceByCurrency: Record<string, number>; // Per-currency imbalance at each point
  }[];
  currencies: string[]; // All currencies in the data
}

export const useFairnessStats = (transactions: Transaction[]): FairnessStats => {
  return useMemo(() => {
    // Track per member per currency: Map<member, Map<currency, amount>>
    const memberPaidByCurrency = new Map<string, Record<string, number>>();
    const memberConsumedByCurrency = new Map<string, Record<string, number>>();

    // Track imbalance over time per currency
    const sortedTxs = [...transactions].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    // Running balances per member per currency
    const runningBalancesByCurrency = new Map<string, Record<string, number>>();
    const imbalanceOverTime: { date: string; imbalance: number; imbalanceByCurrency: Record<string, number> }[] = [];
    const allCurrencies = new Set<string>();

    sortedTxs.forEach((tx) => {
      const dateKey = tx.date.toISOString().split('T')[0];
      const currency = tx.currency;
      allCurrencies.add(currency);

      let positiveBalanceSum = 0;
      if (!tx.isTransfer) {
        Object.values(tx.memberBalances).forEach(b => {
          if (b > 0) positiveBalanceSum += b;
        });
      }

      Object.entries(tx.memberBalances).forEach(([member, balance]) => {
        // Update running balances per currency
        const memberBalances = runningBalancesByCurrency.get(member) || {};
        memberBalances[currency] = (memberBalances[currency] || 0) + balance;
        runningBalancesByCurrency.set(member, memberBalances);

        if (!tx.isTransfer && positiveBalanceSum > 0) {
          let paidAmount = 0;
          let consumedAmount = 0;
          
          if (balance < 0) {
            consumedAmount = Math.abs(balance);
          } else if (balance > 0) {
            paidAmount = tx.cost * (balance / positiveBalanceSum);
            consumedAmount = paidAmount - balance;
            if (consumedAmount < 0) consumedAmount = 0;
          }

          if (paidAmount > 0) {
            const paid = memberPaidByCurrency.get(member) || {};
            paid[currency] = (paid[currency] || 0) + paidAmount;
            memberPaidByCurrency.set(member, paid);
          }
          if (consumedAmount > 0) {
            const consumed = memberConsumedByCurrency.get(member) || {};
            consumed[currency] = (consumed[currency] || 0) + consumedAmount;
            memberConsumedByCurrency.set(member, consumed);
          }
        }
      });

      // Calculate total imbalance at this point (per currency)
      const imbalanceByCurrency: Record<string, number> = {};
      let totalImbalance = 0;
      
      for (const cur of allCurrencies) {
        let curImbalance = 0;
        for (const memberBals of runningBalancesByCurrency.values()) {
          curImbalance += Math.abs(memberBals[cur] || 0);
        }
        imbalanceByCurrency[cur] = curImbalance / 2;
        totalImbalance += curImbalance;
      }

      // Only add if different from last entry or first entry
      if (
        imbalanceOverTime.length === 0 ||
        imbalanceOverTime[imbalanceOverTime.length - 1].date !== dateKey
      ) {
        imbalanceOverTime.push({ 
          date: dateKey, 
          imbalance: totalImbalance / 2,
          imbalanceByCurrency 
        });
      } else {
        // Update the last entry with the latest values for this date
        imbalanceOverTime[imbalanceOverTime.length - 1] = {
          date: dateKey,
          imbalance: totalImbalance / 2,
          imbalanceByCurrency
        };
      }
    });

    // Calculate totals per currency
    const totalConsumedByCurrency: Record<string, number> = {};
    const totalPaidByCurrency: Record<string, number> = {};
    
    for (const consumed of memberConsumedByCurrency.values()) {
      for (const [cur, amt] of Object.entries(consumed)) {
        totalConsumedByCurrency[cur] = (totalConsumedByCurrency[cur] || 0) + amt;
      }
    }
    for (const paid of memberPaidByCurrency.values()) {
      for (const [cur, amt] of Object.entries(paid)) {
        totalPaidByCurrency[cur] = (totalPaidByCurrency[cur] || 0) + amt;
      }
    }

    // Build member stats with per-currency percentages
    const allMembers = new Set([...memberPaidByCurrency.keys(), ...memberConsumedByCurrency.keys()]);
    const memberStats: FairnessMemberStats[] = Array.from(allMembers).map((name) => {
      const consumed = memberConsumedByCurrency.get(name) || {};
      const paid = memberPaidByCurrency.get(name) || {};
      
      const totalConsumed = Object.values(consumed).reduce((a, b) => a + b, 0);
      const totalPaid = Object.values(paid).reduce((a, b) => a + b, 0);
      const grandTotalConsumed = Object.values(totalConsumedByCurrency).reduce((a, b) => a + b, 0);
      const grandTotalPaid = Object.values(totalPaidByCurrency).reduce((a, b) => a + b, 0);

      // Per-currency shares
      const consumptionShareByCurrency: Record<string, number> = {};
      const paymentShareByCurrency: Record<string, number> = {};
      
      for (const cur of allCurrencies) {
        const curConsumed = consumed[cur] || 0;
        const curPaid = paid[cur] || 0;
        const curTotalConsumed = totalConsumedByCurrency[cur] || 0;
        const curTotalPaid = totalPaidByCurrency[cur] || 0;
        
        consumptionShareByCurrency[cur] = curTotalConsumed > 0 ? (curConsumed / curTotalConsumed) * 100 : 0;
        paymentShareByCurrency[cur] = curTotalPaid > 0 ? (curPaid / curTotalPaid) * 100 : 0;
      }

      return {
        name,
        totalConsumed,
        totalPaid,
        consumptionShare: grandTotalConsumed > 0 ? (totalConsumed / grandTotalConsumed) * 100 : 0,
        paymentShare: grandTotalPaid > 0 ? (totalPaid / grandTotalPaid) * 100 : 0,
        consumedByCurrency: consumed,
        paidByCurrency: paid,
        consumptionShareByCurrency,
        paymentShareByCurrency,
      };
    });

    // Calculate final imbalance per currency
    const finalImbalanceByCurrency: Record<string, number> = {};
    let finalImbalance = 0;
    
    for (const cur of allCurrencies) {
      let curImbalance = 0;
      for (const memberBals of runningBalancesByCurrency.values()) {
        curImbalance += Math.abs(memberBals[cur] || 0);
      }
      finalImbalanceByCurrency[cur] = curImbalance / 2;
      finalImbalance += curImbalance;
    }

    // Count pairs with non-zero flow
    let membersWithImbalance = 0;
    for (const memberBals of runningBalancesByCurrency.values()) {
      const totalBal = Object.values(memberBals).reduce((a, b) => a + b, 0);
      if (totalBal !== 0) membersWithImbalance++;
    }
    const pairsWithImbalance = membersWithImbalance > 1 ? membersWithImbalance - 1 : 0;

    return {
      memberStats: memberStats.sort((a, b) => b.totalConsumed - a.totalConsumed),
      totalImbalance: finalImbalance / 2,
      totalImbalanceByCurrency: finalImbalanceByCurrency,
      memberPairsWithImbalance: pairsWithImbalance,
      imbalanceOverTime,
      currencies: Array.from(allCurrencies),
    };
  }, [transactions]);
};

/**
 * Category-Member matrix data
 */
export interface CategoryMemberCell {
  category: string;
  member: string;
  /** Legacy: sum across all currencies. For sorting only. */
  amount: number;
  /** Per-currency amounts for proper multi-currency display. */
  amountsByCurrency: Record<string, number>;
}

export const useCategoryMemberMatrix = (
  transactions: Transaction[]
): {
  categories: string[];
  members: string[];
  data: CategoryMemberCell[];
  maxAmount: number;
  currencies: string[];
} => {
  return useMemo(() => {
    const matrix = new Map<string, Map<string, number>>();
    // Per currency: category -> member -> amount
    const matrixByCurrency = new Map<string, Map<string, Map<string, number>>>();
    const allMembers = new Set<string>();
    const allCategories = new Set<string>();
    const allCurrencies = new Set<string>();

    transactions.forEach((tx) => {
      if (tx.isTransfer) return;

      allCategories.add(tx.category);
      allCurrencies.add(tx.currency);

      Object.entries(tx.memberBalances).forEach(([member, balance]) => {
        allMembers.add(member);

        // Only count POSITIVE balances (amounts paid/fronted)
        // Positive balance means they paid for this expense
        if (balance <= 0) return;

        if (!matrix.has(tx.category)) {
          matrix.set(tx.category, new Map());
        }
        const catMap = matrix.get(tx.category)!;
        catMap.set(member, (catMap.get(member) || 0) + balance);

        // Track per currency
        if (!matrixByCurrency.has(tx.currency)) {
          matrixByCurrency.set(tx.currency, new Map());
        }
        const curMatrix = matrixByCurrency.get(tx.currency)!;
        if (!curMatrix.has(tx.category)) {
          curMatrix.set(tx.category, new Map());
        }
        const curCatMap = curMatrix.get(tx.category)!;
        curCatMap.set(member, (curCatMap.get(member) || 0) + balance);
      });
    });

    const categories = Array.from(allCategories).sort();
    const members = Array.from(allMembers).sort();
    const currencies = Array.from(allCurrencies).sort();

    const data: CategoryMemberCell[] = [];
    let maxAmount = 0;

    categories.forEach((category) => {
      members.forEach((member) => {
        const amount = matrix.get(category)?.get(member) || 0;
        
        // Build per-currency amounts
        const amountsByCurrency: Record<string, number> = {};
        for (const cur of currencies) {
          const curAmt = matrixByCurrency.get(cur)?.get(category)?.get(member) || 0;
          if (curAmt > 0) {
            amountsByCurrency[cur] = curAmt;
          }
        }
        
        data.push({ category, member, amount, amountsByCurrency });
        if (amount > maxAmount) maxAmount = amount;
      });
    });

    return { categories, members, data, maxAmount, currencies };
  }, [transactions]);
};

/**
 * Global stats for KPI cards
 */
export interface GlobalKpiStats {
  totalSpending: number;
  totalTransfers: number;
  transactionCount: number;
  expenseCount: number;
  transferCount: number;
  currency: string;
  // Per-currency amounts for multi-currency display
  spendingByCurrency: Record<string, number>;
  transfersByCurrency: Record<string, number>;
}

export const useGlobalKpiStats = (
  transactions: Transaction[],
  primaryCurrency: string
): GlobalKpiStats => {
  return useMemo(() => {
    let totalSpending = 0;
    let totalTransfers = 0;
    let expenseCount = 0;
    let transferCount = 0;
    const spendingByCurrency: Record<string, number> = {};
    const transfersByCurrency: Record<string, number> = {};

    transactions.forEach((tx) => {
      if (tx.isTransfer) {
        totalTransfers += tx.cost;
        transferCount++;
        transfersByCurrency[tx.currency] = (transfersByCurrency[tx.currency] || 0) + tx.cost;
      } else {
        totalSpending += tx.cost;
        expenseCount++;
        spendingByCurrency[tx.currency] = (spendingByCurrency[tx.currency] || 0) + tx.cost;
      }
    });

    return {
      totalSpending,
      totalTransfers,
      transactionCount: transactions.length,
      expenseCount,
      transferCount,
      currency: primaryCurrency,
      spendingByCurrency,
      transfersByCurrency,
    };
  }, [transactions, primaryCurrency]);
};
