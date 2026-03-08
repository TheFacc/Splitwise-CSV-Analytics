// Internationalization translations
// Supported languages: English (default), Italian

export type Language = 'en' | 'it';

export const translations = {
  en: {
    // Navigation
    nav: {
      dashboard: 'Dashboard',
      transactions: 'Transactions',
      analytics: 'Analytics',
      categories: 'Categories',
    },
    // Sidebar
    sidebar: {
      title: 'Splitwise',
      subtitle: 'Analytics Dashboard',
      theme: {
        light: 'Light Theme',
        dark: 'Dark Theme',
        system: 'System Theme',
      },
      language: 'Language',
      currency: 'Currency',
      convertTo: 'Convert to',
      showOriginal: 'Show original',
      currenciesFound: 'Currencies found',
      ratesDate: 'Rates',
      appliedRates: 'Applied rates:',
    },
    // Dashboard
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Analyze your shared expenses',
      overview: 'Overview',
      totalSpending: 'Total Spending',
      transfers: 'Transfers',
      transactions: 'Transactions',
      members: 'Members',
      expenses: 'expenses',
      payments: 'payments',
      totalOperations: 'Total operations',
      participants: 'Participants',
      memberBalances: 'Member Balances',
      creditor: 'Creditor',
      debtor: 'Debtor',
      paid: 'Paid',
      owes: 'Owes',
      currencyDetails: 'Currency details',
    },
    // File Upload
    upload: {
      title: 'Upload CSV File',
      dragDrop: 'Drag and drop your Splitwise CSV file here',
      orClick: 'or click to select',
      supported: 'Supported format: CSV',
      loading: 'Parsing data...',
      loaded: 'File loaded',
      transactionsFound: 'transactions',
      membersFound: 'members',
      remove: 'Remove',
      loadSample: 'Load Sample Data',
      loadSampleHint: 'Try with demo data',
    },
    // Charts
    charts: {
      categoryExpenses: 'Expenses by Category',
      monthlyTrend: 'Monthly Trend',
      clickToFilter: 'Click to filter',
      filter: 'Filter',
      spese: 'Expenses',
      trasferimenti: 'Transfers',
      showsOnly: 'The transactions table only shows:',
      noData: 'No data',
      amount: 'Amount',
      count: 'Count',
      groupOverall: 'Group overall',
      memberOnly: 'Member only',
      compareGroup: 'Compare group',
      member: 'Member',
      group: 'Group',
    },
    // Transactions
    transactions: {
      title: 'Transactions',
      subtitle: 'View all transactions',
      search: 'Search...',
      member: 'Member',
      category: 'Category',
      all: 'All',
      date: 'Date',
      description: 'Description',
      amount: 'Amount',
      type: 'Type',
      transfer: 'Transfer',
      expense: 'Expense',
      noResults: 'No transactions found',
      rowsPerPage: 'Rows per page:',
      clearFilters: 'Clear filters',
      paidBy: 'Paid By',
      involved: 'Involved',
      people: 'people',
      breakdown: 'Expense Breakdown',
      share: 'Share ~',
      paidFull: 'Paid {{amount}} (Full)',
      paidEstimated: 'Est. paid ~ {{amount}}',
      getsBack: 'Gets back',
      inferredTooltip: 'Values for "Paid" and "Share" are inferred based on the total cost. For complex multi-payer transactions, only the net balance is shown.',
    },
    // Analytics
    analytics: {
      title: 'Analytics',
      subtitle: 'Charts and detailed statistics',
      timeRange: 'Time Range',
      day: 'Day',
      week: 'Week',
      month: 'Month',
      selectedTransactions: 'Selected transactions',
      totalValue: 'Total value',
      selectRange: 'Select range',
      noTransactions: 'No transactions',
      transactions: 'transactions',
      categoryInsights: 'Category Insights',
      categoryInsightsDesc: 'Detailed expense analysis by category',
      categorySummary: 'Category Summary',
      whoPaysWhat: 'Who Pays for What',
      globalOverview: 'Global Overview',
      globalOverviewDesc: 'Key statistics and expense distribution',
      netBalanceDistribution: 'Net Balance Distribution',
      noCategories: 'No categories',
      average: 'Average',
      trend: 'Trend',
      total: 'Total',
      fairnessAndBalance: 'Fairness & Balance',
      fairnessDesc: 'Is the group balanced? Who pays more?',
      imbalanceOverTime: 'Imbalance Over Time',
      fairnessIndex: 'Fairness Index per Member',
      perMemberInsights: 'Per-member Insights',
      spendingByCategory: 'Spending by Category',
      balanceOverTime: 'Balance Over Time',
      flowsWithOtherMembers: 'Flows with Other Members',
      noDataAvailable: 'No data available',
      noFlowsWithOtherMembers: 'No flows with other members',
      consumedPct: 'Consumed (%)',
      paidPct: 'Paid (%)',
      consumed: 'Consumed',
      paid: 'Paid',
      totalImbalance: 'Total imbalance',
      noDataForThisCurrency: 'No data for this currency',
      cumulativeBalance: 'Cumulative balance',
      totalPaid: 'Total Paid',
      totalOwed: 'Total Owed',
      netPosition: 'Net Position',
      groupBalanced: 'The group is balanced!',
      balanceToSettle: 'Balance to settle',
      settlementDesc: 'If everyone settled today, the total would be exchanged across approximately {{pairs}} member pairs.',
      selectMemberToViewFlows: 'Select a member to view flows',
      groupBalancedNoFlows: 'The group is balanced, there are no flows.',
    },
    // TimeRange
    timeRange: {
      custom: 'Custom…',
      selectDateRange: 'Select date range',
      startDate: 'Start date',
      endDate: 'End date',
      cancel: 'Cancel',
      apply: 'Apply',
      lineChart: 'Line Chart',
      barChart: 'Bar Chart',
      days: 'days',
      weeks: 'weeks',
      months: 'months',
      lastWeek: 'Last Week',
      last30Days: 'Last 30 Days',
      last3Months: 'Last 3 Months',
      last12Months: 'Last 12 Months',
    },
    // Common
    common: {
      of: 'of',
    },
    // Categories Management
    categories: {
      title: 'Manage Categories',
      subtitle: 'Rename and merge categories to customize your analysis',
      originalCategories: 'Original Categories',
      yourGroups: 'Your Groups',
      createGroup: 'Create Group',
      groupName: 'Group name',
      dragHint: 'Drag categories here to merge them',
      tapToAssign: 'Tap a category, then tap a group to assign',
      ungrouped: 'Ungrouped',
      deleteGroup: 'Delete group',
      emptyGroup: 'Drop categories here',
      noData: 'Load a CSV file first to manage categories',
      transactions: 'transactions',
      rename: 'Rename',
      resetAll: 'Reset All',
      searchCategories: 'Search categories...',
      category: 'category',
      categoriesCount: 'categories',
    },
  },
  it: {
    // Navigation
    nav: {
      dashboard: 'Dashboard',
      transactions: 'Transazioni',
      analytics: 'Analisi',
      categories: 'Categorie',
    },
    // Sidebar
    sidebar: {
      title: 'Splitwise',
      subtitle: 'Analytics Dashboard',
      theme: {
        light: 'Tema Chiaro',
        dark: 'Tema Scuro',
        system: 'Tema Sistema',
      },
      language: 'Lingua',
      currency: 'Valuta',
      convertTo: 'Converti in',
      showOriginal: 'Mostra originale',
      currenciesFound: 'Valute trovate',
      ratesDate: 'Tassi',
      appliedRates: 'Tassi applicati:',
    },
    // Dashboard
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Analizza le tue spese condivise',
      overview: 'Panoramica',
      totalSpending: 'Spesa Totale',
      transfers: 'Trasferimenti',
      transactions: 'Transazioni',
      members: 'Membri',
      expenses: 'spese',
      payments: 'pagamenti',
      totalOperations: 'Totale operazioni',
      participants: 'Partecipanti',
      memberBalances: 'Saldi dei Membri',
      creditor: 'Creditore',
      debtor: 'Debitore',
      paid: 'Ha pagato',
      owes: 'Deve',
      currencyDetails: 'Dettaglio per valuta',
    },
    // File Upload
    upload: {
      title: 'Carica File CSV',
      dragDrop: 'Trascina e rilascia il tuo file CSV di Splitwise qui',
      orClick: 'oppure clicca per selezionare',
      supported: 'Formato supportato: CSV',
      loading: 'Analisi in corso...',
      loaded: 'File caricato',
      transactionsFound: 'transazioni',
      membersFound: 'membri',
      remove: 'Rimuovi',
      loadSample: 'Carica Dati di Esempio',
      loadSampleHint: 'Prova con dati demo',
    },
    // Charts
    charts: {
      categoryExpenses: 'Spese per Categoria',
      monthlyTrend: 'Andamento Mensile',
      clickToFilter: 'Clicca per filtrare',
      filter: 'Filtro',
      spese: 'Spese',
      trasferimenti: 'Trasferimenti',
      showsOnly: 'La tabella transazioni mostra solo:',
      noData: 'Nessun dato',
      amount: 'Importo',
      count: 'Conteggio',
      groupOverall: 'Sul tot. gruppo',
      memberOnly: 'Solo membro',
      compareGroup: 'Vs. gruppo',
      member: 'Membro',
      group: 'Gruppo',
    },
    // Transactions
    transactions: {
      title: 'Transazioni',
      subtitle: 'Visualizza tutte le transazioni',
      search: 'Cerca...',
      member: 'Membro',
      category: 'Categoria',
      all: 'Tutti',
      date: 'Data',
      description: 'Descrizione',
      amount: 'Importo',
      type: 'Tipo',
      transfer: 'Trasferimento',
      expense: 'Spesa',
      noResults: 'Nessuna transazione trovata',
      rowsPerPage: 'Righe per pagina:',
      clearFilters: 'Cancella filtri',
      paidBy: 'Pagato da',
      involved: 'Coinvolti',
      people: 'persone',
      breakdown: 'Dettaglio Spesa',
      share: 'Quota ~',
      paidFull: 'Pagato {{amount}} (Totale)',
      paidEstimated: 'Pagato ~ {{amount}}',
      getsBack: 'Riceve',
      inferredTooltip: 'I valori "Pagato" e "Quota" sono stimati basandosi sul costo totale. Per transazioni complesse con più paganti, viene mostrato solo il saldo netto.',
    },
    // Analytics
    analytics: {
      title: 'Analisi',
      subtitle: 'Grafici e statistiche dettagliate',
      timeRange: 'Intervallo Temporale',
      day: 'Giorno',
      week: 'Settimana',
      month: 'Mese',
      selectedTransactions: 'Transazioni selezionate',
      totalValue: 'Valore totale',
      selectRange: 'Seleziona intervallo',
      noTransactions: 'Nessuna transazione',
      transactions: 'transazioni',
      categoryInsights: 'Approfondimento Categorie',
      categoryInsightsDesc: 'Analisi dettagliata delle spese per categoria',
      categorySummary: 'Riepilogo Categorie',
      whoPaysWhat: 'Chi Paga Cosa',
      globalOverview: 'Panoramica Globale',
      globalOverviewDesc: 'Statistiche chiave e distribuzione delle spese',
      netBalanceDistribution: 'Distribuzione Saldi',
      noCategories: 'Nessuna categoria',
      average: 'Media',
      trend: 'Trend',
      total: 'Totale',
      fairnessAndBalance: 'Equità e Bilanciamento',
      fairnessDesc: 'Il gruppo è bilanciato? Chi paga di più?',
      imbalanceOverTime: 'Sbilanciamento nel Tempo',
      fairnessIndex: 'Indice di Equità per Membro',
      perMemberInsights: 'Approfondimento per Membro',
      spendingByCategory: 'Spese per Categoria',
      balanceOverTime: 'Saldo nel Tempo',
      flowsWithOtherMembers: 'Flussi con Altri Membri',
      noDataAvailable: 'Nessun dato disponibile',
      noFlowsWithOtherMembers: 'Nessun flusso con altri membri',
      consumedPct: 'Consumato (%)',
      paidPct: 'Pagato (%)',
      consumed: 'Consumato',
      paid: 'Pagato',
      totalImbalance: 'Sbilanciamento totale',
      noDataForThisCurrency: 'Nessun dato per questa valuta',
      cumulativeBalance: 'Saldo cumulativo',
      totalPaid: 'Totale Pagato',
      totalOwed: 'Totale Dovuto',
      netPosition: 'Posizione Netta',
      groupBalanced: 'Il gruppo è bilanciato!',
      balanceToSettle: 'Saldo da sistemare',
      settlementDesc: 'Se tutti saldassero oggi, l\'importo totale da scambiare sarebbe tra circa {{pairs}} coppie di membri.',
      selectMemberToViewFlows: 'Seleziona un membro per vedere i flussi',
      groupBalancedNoFlows: 'Il gruppo è bilanciato, non ci sono flussi.',
    },
    // TimeRange
    timeRange: {
      custom: 'Personalizzato…',
      selectDateRange: 'Seleziona intervallo',
      startDate: 'Data inizio',
      endDate: 'Data fine',
      cancel: 'Annulla',
      apply: 'Applica',
      lineChart: 'Linea',
      barChart: 'A barre',
      days: 'giorni',
      weeks: 'settimane',
      months: 'mesi',
      lastWeek: 'Ultimi 7g',
      last30Days: 'Ultimi 30g',
      last3Months: 'Ultimi 3m',
      last12Months: 'Ultimi 12m',
    },
    // Common
    common: {
      of: 'di',
    },
    // Categories Management
    categories: {
      title: 'Gestione Categorie',
      subtitle: 'Rinomina e unisci le categorie per personalizzare l\'analisi',
      originalCategories: 'Categorie Originali',
      yourGroups: 'I tuoi Gruppi',
      createGroup: 'Crea Gruppo',
      groupName: 'Nome gruppo',
      dragHint: 'Trascina le categorie qui per unirle',
      tapToAssign: 'Tocca una categoria, poi tocca un gruppo per assegnarla',
      ungrouped: 'Non raggruppate',
      deleteGroup: 'Elimina gruppo',
      emptyGroup: 'Rilascia le categorie qui',
      noData: 'Carica prima un file CSV per gestire le categorie',
      transactions: 'transazioni',
      rename: 'Rinomina',
      resetAll: 'Ripristina Tutto',
      searchCategories: 'Cerca categorie...',
      category: 'categoria',
      categoriesCount: 'categorie',
    },
  },
} as const;

// Get structured translation type that works for both languages
export type Translations = {
  nav: { dashboard: string; transactions: string; analytics: string; categories: string };
  sidebar: {
    title: string;
    subtitle: string;
    theme: { light: string; dark: string; system: string };
    language: string;
    currency: string;
    convertTo: string;
    showOriginal: string;
    currenciesFound: string;
    ratesDate: string;
    appliedRates: string;
  };
  dashboard: {
    title: string;
    subtitle: string;
    overview: string;
    totalSpending: string;
    transfers: string;
    transactions: string;
    members: string;
    expenses: string;
    payments: string;
    totalOperations: string;
    participants: string;
    memberBalances: string;
    creditor: string;
    debtor: string;
    paid: string;
    owes: string;
    currencyDetails: string;
  };
  upload: {
    title: string;
    dragDrop: string;
    orClick: string;
    supported: string;
    loading: string;
    loaded: string;
    transactionsFound: string;
    membersFound: string;
    remove: string;
    loadSample: string;
    loadSampleHint: string;
  };
  charts: {
    categoryExpenses: string;
    monthlyTrend: string;
    clickToFilter: string;
    filter: string;
    spese: string;
    trasferimenti: string;
    showsOnly: string;
    noData: string;
    amount: string;
    count: string;
    groupOverall: string;
    memberOnly: string;
    compareGroup: string;
    member: string;
    group: string;
  };
  transactions: {
    title: string;
    subtitle: string;
    search: string;
    member: string;
    category: string;
    all: string;
    date: string;
    description: string;
    amount: string;
    type: string;
    transfer: string;
    expense: string;
    noResults: string;
    rowsPerPage: string;
    clearFilters: string;
    paidBy: string;
    involved: string;
    people: string;
    breakdown: string;
    share: string;
    paidFull: string;
    paidEstimated: string;
    getsBack: string;
    inferredTooltip: string;
  };
  analytics: {
    title: string;
    subtitle: string;
    timeRange: string;
    day: string;
    week: string;
    month: string;
    selectedTransactions: string;
    totalValue: string;
    selectRange: string;
    noTransactions: string;
    transactions: string;
    categoryInsights: string;
    categoryInsightsDesc: string;
    categorySummary: string;
    whoPaysWhat: string;
    globalOverview: string;
    globalOverviewDesc: string;
    netBalanceDistribution: string;
    noCategories: string;
    average: string;
    trend: string;
    total: string;
    fairnessAndBalance: string;
    fairnessDesc: string;
    imbalanceOverTime: string;
    fairnessIndex: string;
    perMemberInsights: string;
    spendingByCategory: string;
    balanceOverTime: string;
    flowsWithOtherMembers: string;
    noDataAvailable: string;
    noFlowsWithOtherMembers: string;
    consumedPct: string;
    paidPct: string;
    consumed: string;
    paid: string;
    totalImbalance: string;
    noDataForThisCurrency: string;
    cumulativeBalance: string;
    totalPaid: string;
    totalOwed: string;
    netPosition: string;
    groupBalanced: string;
    balanceToSettle: string;
    settlementDesc: string;
    selectMemberToViewFlows: string;
    groupBalancedNoFlows: string;
  };
  timeRange: {
    custom: string;
    selectDateRange: string;
    startDate: string;
    endDate: string;
    cancel: string;
    apply: string;
    lineChart: string;
    barChart: string;
    days: string;
    weeks: string;
    months: string;
    lastWeek: string;
    last30Days: string;
    last3Months: string;
    last12Months: string;
  };
  common: { of: string };
  categories: {
    title: string;
    subtitle: string;
    originalCategories: string;
    yourGroups: string;
    createGroup: string;
    groupName: string;
    dragHint: string;
    tapToAssign: string;
    ungrouped: string;
    deleteGroup: string;
    emptyGroup: string;
    noData: string;
    transactions: string;
    rename: string;
    resetAll: string;
    searchCategories: string;
    category: string;
    categoriesCount: string;
  };
};

// Helper function to get translation
export const getTranslation = (lang: Language): Translations => {
  return translations[lang] as Translations;
};
