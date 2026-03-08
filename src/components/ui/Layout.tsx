import { useState, ReactNode, useMemo, useEffect } from 'react';
import {
  alpha,
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useTheme,
  useMediaQuery,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Divider,
  CircularProgress,
  Switch,
} from '@mui/material';
import {
  Menu as MenuIcon,
  LayoutDashboard,
  Table2,
  PieChart,
  Sun,
  Moon,
  Wallet,
  Globe,
  Languages,
  RefreshCw,
  ArrowRightLeft,
  Tags,
  Github,
} from 'lucide-react';
import { useStore } from '../../store';
import { getTranslation, type Language } from '../../i18n/translations';
import { useCurrencyRates } from '../../hooks/useCurrencyRates';

const DRAWER_WIDTH = 260;

// Common currencies to show at the top
const COMMON_CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'VND'];

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

export const Layout = ({ children, currentPage, onPageChange }: LayoutProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showInverseRates, setShowInverseRates] = useState(false);
  const { 
    themeMode, 
    toggleTheme, 
    language, 
    setLanguage,
    parsedData,
    preferredCurrency,
    setPreferredCurrency,
    exchangeRates,
    isLoadingRates,
  } = useStore();
  const { fetchRates } = useCurrencyRates();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Get translations
  const t = useMemo(() => getTranslation(language), [language]);

  // Available currencies
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>(COMMON_CURRENCIES);

  useEffect(() => {
    if (parsedData?.currencies) {
      const unique = new Set([...parsedData.currencies, ...COMMON_CURRENCIES]);
      setAvailableCurrencies(Array.from(unique).sort());
    }
  }, [parsedData?.currencies]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };



  const handleCurrencyChange = async (currency: string | null) => {
    if (currency === '' || currency === null) {
      setPreferredCurrency(null);
      // Don't clear rates - they're needed for chart normalization
      return;
    }
    setPreferredCurrency(currency);
    await fetchRates(currency);
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
  };

  const navItems = [
    { id: 'dashboard' as const, label: t.nav.dashboard, icon: LayoutDashboard, alwaysShow: true },
    { id: 'categories' as const, label: t.nav.categories, icon: Tags, alwaysShow: false },
    { id: 'transactions' as const, label: t.nav.transactions, icon: Table2, alwaysShow: true },
    { id: 'analytics' as const, label: t.nav.analytics, icon: PieChart, alwaysShow: true },
  ];

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo Section */}
      <Box
        sx={{
          p: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #48be9d 0%, #3aa88a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}
        >
          <Wallet size={24} />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {t.sidebar.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t.sidebar.subtitle}
          </Typography>
        </Box>
      </Box>

      {/* Navigation */}
      <List sx={{ flex: 1, px: 2, py: 3 }}>
        {navItems
          .filter(item => item.alwaysShow || parsedData)
          .map((item) => (
          <ListItem key={item.id} disablePadding sx={{ mb: 1 }}>
            <ListItemButton
              selected={currentPage === item.id}
              onClick={() => {
                onPageChange(item.id);
                if (isMobile) setMobileOpen(false);
              }}
              sx={{
                borderRadius: 2,
                '&.Mui-selected': {
                  backgroundColor: 'rgba(72, 190, 157, 0.15)',
                  '&:hover': {
                    backgroundColor: 'rgba(72, 190, 157, 0.25)',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'primary.main',
                  },
                  '& .MuiListItemText-primary': {
                    fontWeight: 600,
                    color: 'primary.main',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <item.icon size={20} />
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* Bottom Controls Section */}
      <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
        {/* Currency Selector - only show when data is loaded and has multiple currencies */}
        {parsedData && parsedData.currencies.length >= 2 && (
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Globe size={16} color="#48be9d" />
              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                {t.sidebar.currency}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.5 }}>
              {parsedData.currencies.map((curr) => (
                <Chip key={curr} label={curr} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
              ))}
            </Box>
            <FormControl size="small" fullWidth>
              <InputLabel>{t.sidebar.convertTo}</InputLabel>
              <Select
                value={preferredCurrency || ''}
                label={t.sidebar.convertTo}
                onChange={(e) => handleCurrencyChange(e.target.value || null)}
                disabled={isLoadingRates}
                startAdornment={isLoadingRates ? <CircularProgress size={14} sx={{ mr: 1 }} /> : null}
              >
                <MenuItem value="">
                  <em>{t.sidebar.showOriginal}</em>
                </MenuItem>
                {availableCurrencies.map((curr) => (
                  <MenuItem key={curr} value={curr}>
                    {curr}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {exchangeRates && (
              <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Box 
                  onClick={() => !isLoadingRates && preferredCurrency && fetchRates(preferredCurrency)}
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 0.5, 
                    cursor: isLoadingRates ? 'default' : 'pointer',
                    opacity: isLoadingRates ? 0.6 : 1,
                    '&:hover': { opacity: isLoadingRates ? 0.6 : 0.8 },
                    userSelect: 'none'
                  }}
                  title="Click to refresh rates"
                >
                  <RefreshCw 
                    size={12} 
                    className={isLoadingRates ? 'spin' : ''} 
                  />
                  <Typography variant="caption" color="text.secondary">
                    {t.sidebar.ratesDate}: {exchangeRates.date} {exchangeRates.timestamp ? `(${new Date(exchangeRates.timestamp).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })})` : ''}
                  </Typography>
                </Box>
                
                {/* Show active conversion rates for currencies present in data */}
                {preferredCurrency && parsedData.currencies.filter(c => c !== preferredCurrency).length > 0 && (
                  <Box sx={{ mt: 1, pl: 2, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, gap: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.65rem', flex: 1 }}>
                        {t.sidebar.appliedRates}
                      </Typography>
                      <IconButton 
                        size="small" 
                        onClick={() => setShowInverseRates(!showInverseRates)}
                        sx={{ padding: 0.25, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                        title={showInverseRates ? "Switch sides" : "Switch sides"}
                      >
                        <ArrowRightLeft size={12} />
                      </IconButton>
                    </Box>
                    {parsedData.currencies
                      .filter(c => c !== preferredCurrency)
                      .map(c => {
                        const rateFromBaseToC = exchangeRates.rates[c];
                        if (!rateFromBaseToC) return null;
                        
                        let displayFrom = "";
                        let displayTo = "";
                        let fromVal = 1;
                        let toVal = 0;
                        
                        if (showInverseRates) {
                          displayFrom = preferredCurrency;
                          displayTo = c;
                          toVal = rateFromBaseToC;
                        } else {
                          displayFrom = c;
                          displayTo = preferredCurrency;
                          toVal = 1 / rateFromBaseToC;
                        }

                        // Expand multiplier for small rates (up to 1,000,000)
                        while (toVal < 0.01 && toVal > 0 && fromVal < 10000000) {
                          fromVal *= 10;
                          toVal *= 10;
                        }

                        let formattedToVal = "";
                        if (toVal < 0.0001) {
                          formattedToVal = toVal.toExponential(4);
                        } else if (toVal >= 100) {
                          formattedToVal = new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(toVal);
                        } else {
                          formattedToVal = new Intl.NumberFormat(language, { maximumFractionDigits: 4 }).format(toVal);
                        }

                        const formattedFromVal = new Intl.NumberFormat(language).format(fromVal);

                        return (
                          <Typography key={c} variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                            {formattedFromVal} {displayFrom} = {formattedToVal} {displayTo}
                          </Typography>
                        );
                      })}
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}

        <Divider />

        {/* Language Selector */}
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Languages size={16} />
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
              {t.sidebar.language}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label="EN"
              size="small"
              onClick={() => handleLanguageChange('en')}
              sx={{
                cursor: 'pointer',
                bgcolor: language === 'en' ? 'primary.main' : 'transparent',
                color: language === 'en' ? 'white' : 'text.primary',
                border: 1,
                borderColor: language === 'en' ? 'primary.main' : 'divider',
                '&:hover': {
                  bgcolor: language === 'en' ? 'primary.dark' : 'action.hover',
                },
              }}
            />
            <Chip
              label="IT"
              size="small"
              onClick={() => handleLanguageChange('it')}
              sx={{
                cursor: 'pointer',
                bgcolor: language === 'it' ? 'primary.main' : 'transparent',
                color: language === 'it' ? 'white' : 'text.primary',
                border: 1,
                borderColor: language === 'it' ? 'primary.main' : 'divider',
                '&:hover': {
                  bgcolor: language === 'it' ? 'primary.dark' : 'action.hover',
                },
              }}
            />
          </Box>
        </Box>

        <Divider />

        {/* Theme Toggle */}
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {themeMode === 'light' ? <Sun size={20} /> : <Moon size={20} />}
            <Switch
              checked={themeMode === 'dark'}
              onChange={toggleTheme}
              color="primary"
              size="small"
            />
          </Box>
          <IconButton 
            component="a" 
            href="https://github.com/TheFacc/Splitwise-CSV-Analytics" 
            target="_blank" 
            rel="noopener noreferrer"
            size="small"
            sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
            title="GitHub Repository"
          >
            <Github size={20} />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar (mobile only) */}
      <AppBar
        position="fixed"
        sx={{
          display: { md: 'none' },
          background: alpha(theme.palette.background.paper, 0.69),
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: 1,
          borderColor: 'divider',
          boxShadow: 'none',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open menu"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, color: 'text.primary' }}
          >
            <MenuIcon size={24} />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Wallet size={24} color="#48be9d" />
            <Typography variant="h6" noWrap sx={{ color: 'text.primary', fontWeight: 600 }}>
              Splitwise Analytics
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              borderRight: 1,
              borderColor: 'divider',
              background: alpha(theme.palette.background.paper, 0.69),
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              borderRight: 1,
              borderColor: 'divider',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { xs: '100%', md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minWidth: 0,
          minHeight: '100vh',
          pt: { xs: 8, md: 0 },
        }}
      >
        <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, maxWidth: 1600, mx: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};
