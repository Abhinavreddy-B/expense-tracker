import React, { useState, useEffect } from 'react';
import {
  ThemeProvider,
  CssBaseline,
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  CircularProgress,
  Chip
} from '@mui/material';

// Icons
import CalculateIcon from '@mui/icons-material/Calculate';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';

// Theme & Services
import getTheme from './theme/theme';
import {
  getStoredClientId,
  saveStoredClientId,
  getStoredToken,
  clearStoredToken
} from './services/googleSheets';
import {
  loadConfig,
  saveConfigLocally,
  loadMonthlyTransactionsLocally,
  saveMonthlyTransactionsLocally,
  syncConfigWithGoogle,
  syncTransactionsWithGoogle,
  addExpenseTransaction,
  addIncomeTransaction,
  addTransferTransaction,
  addSettlementTransaction,
  calculateFriendBalances,
  getActiveMonthStr
} from './services/db';

// Views
import Homepage from './views/Homepage';
import IncomePage from './views/IncomePage';
import TransferPage from './views/TransferPage';
import SettlementsPage from './views/SettlementsPage';
import ReportPage from './views/ReportPage';
import SettingsPage from './views/SettingsPage';

export default function App() {
  // Theme & Layout States
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem('finflow_theme') || 'dark';
  });
  const muiTheme = getTheme(themeMode);
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  
  // Navigation States
  const [activeTab, setActiveTab] = useState('home'); // home, income, transfer, settlements, reports, settings
  const [selectedMonth, setSelectedMonth] = useState(() => getActiveMonthStr());

  // Global Config State (Categories, PaymentModes, Friends, IncomeModes)
  const [config, setConfig] = useState(() => loadConfig());
  
  // Transactions for the active selectedMonth
  const [transactions, setTransactions] = useState(() => loadMonthlyTransactionsLocally(selectedMonth));

  // Google Sync States
  const [googleClientId, setGoogleClientId] = useState(() => getStoredClientId());
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleTheme = () => {
    setThemeMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('finflow_theme', next);
      return next;
    });
  };

  // Sync state computed balances
  const balancesData = calculateFriendBalances(transactions);

  // Initialize and Sync on mount
  useEffect(() => {
    const initSync = async () => {
      const token = getStoredToken();
      if (token && googleClientId) {
        setIsGoogleConnected(true);
        setLoading(true);
        try {
          // Pull config and active month data
          const syncedConfig = await syncConfigWithGoogle();
          setConfig(syncedConfig);
          const syncedTxs = await syncTransactionsWithGoogle(selectedMonth);
          setTransactions(syncedTxs);
        } catch (e) {
          console.error('Google Autologin Sync failed:', e);
          if (e.message === 'TOKEN_EXPIRED') {
            setIsGoogleConnected(false);
          }
        } finally {
          setLoading(false);
        }
      }
    };
    initSync();
  }, [googleClientId, selectedMonth]);

  // Load transactions when month switches
  const handleMonthChange = async (newMonthStr) => {
    setSelectedMonth(newMonthStr);
    const localData = loadMonthlyTransactionsLocally(newMonthStr);
    setTransactions(localData);

    if (isGoogleConnected) {
      setLoading(true);
      try {
        const syncedTxs = await syncTransactionsWithGoogle(newMonthStr);
        setTransactions(syncedTxs);
      } catch (e) {
        console.error('Failed to sync transactions for month:', newMonthStr, e);
      } finally {
        setLoading(false);
      }
    }
  };

  // Save changes to config
  const handleConfigChange = async (newConfig) => {
    setConfig(newConfig);
    saveConfigLocally(newConfig);
    
    if (isGoogleConnected) {
      setLoading(true);
      try {
        await syncConfigWithGoogle(true); // force push configuration
      } catch (e) {
        console.error('Failed to push configuration change to Google Drive:', e);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSyncConfig = async () => {
    const synced = await syncConfigWithGoogle();
    setConfig(synced);
  };

  const handleForcePushConfig = async () => {
    await syncConfigWithGoogle(true);
  };

  // Transaction logging callbacks
  const handleAddExpense = async (expense) => {
    await addExpenseTransaction(expense, selectedMonth, isGoogleConnected);
    // Reload state
    setTransactions(loadMonthlyTransactionsLocally(selectedMonth));
  };

  const handleAddIncome = async (income) => {
    await addIncomeTransaction(income, selectedMonth, isGoogleConnected);
    setTransactions(loadMonthlyTransactionsLocally(selectedMonth));
  };

  const handleAddTransfer = async (transfer) => {
    await addTransferTransaction(transfer, selectedMonth, isGoogleConnected);
    setTransactions(loadMonthlyTransactionsLocally(selectedMonth));
  };

  const handleAddSettlement = async (settlement) => {
    await addSettlementTransaction(settlement, selectedMonth, isGoogleConnected);
    setTransactions(loadMonthlyTransactionsLocally(selectedMonth));
  };

  const handleClientIdChange = (id) => {
    setGoogleClientId(id);
    saveStoredClientId(id);
  };

  // Desktop sidebar navigation elements
  const navItems = [
    { id: 'home', label: 'Expenditures', icon: <CalculateIcon /> },
    { id: 'income', label: 'Income Money', icon: <TrendingDownIcon /> },
    { id: 'transfer', label: 'Wallet Transfers', icon: <SwapHorizIcon /> },
    { id: 'settlements', label: 'Settlements', icon: <PeopleAltIcon /> },
    { id: 'reports', label: 'Analysis & Reports', icon: <AssessmentIcon /> },
    { id: 'settings', label: 'Settings & Cloud', icon: <SettingsIcon /> },
  ];

  const drawerWidth = 260;

  // Render view conditionally
  const renderMainContent = () => {
    if (loading && transactions.expenses.length === 0) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 2 }}>
          <CircularProgress color="primary" />
          <Typography variant="body2" color="text.secondary">Syncing with Google Drive...</Typography>
        </Box>
      );
    }

    switch (activeTab) {
      case 'home':
        return (
          <Homepage
            config={config}
            onAddExpense={handleAddExpense}
            isGoogleConnected={isGoogleConnected}
          />
        );
      case 'income':
        return (
          <IncomePage
            config={config}
            onAddIncome={handleAddIncome}
          />
        );
      case 'transfer':
        return (
          <TransferPage
            config={config}
            onAddTransfer={handleAddTransfer}
          />
        );
      case 'settlements':
        return (
          <SettlementsPage
            config={config}
            balancesData={balancesData}
            onAddSettlement={handleAddSettlement}
          />
        );
      case 'reports':
        return (
          <ReportPage
            monthData={transactions}
            selectedMonth={selectedMonth}
            onMonthChange={handleMonthChange}
            balancesData={balancesData}
            isGoogleConnected={isGoogleConnected}
          />
        );
      case 'settings':
        return (
          <SettingsPage
            config={config}
            onConfigChange={handleConfigChange}
            googleClientId={googleClientId}
            onGoogleClientIdChange={handleClientIdChange}
            isGoogleConnected={isGoogleConnected}
            setIsGoogleConnected={setIsGoogleConnected}
            onSyncConfig={handleSyncConfig}
            onForcePushConfig={handleForcePushConfig}
          />
        );
      default:
        return <Typography>View not found.</Typography>;
    }
  };

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: 'background.default' }}>
        {/* App Bar / Header */}
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
          <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="h6"
                noWrap
                component="div"
                sx={{
                  fontFamily: 'Outfit',
                  fontWeight: 800,
                  fontSize: '1.4rem',
                  letterSpacing: '-0.5px',
                  background: (theme) => theme.palette.mode === 'dark' 
                    ? 'linear-gradient(90deg, #a5b4fc 0%, #818cf8 100%)' 
                    : 'linear-gradient(90deg, #4f46e5 0%, #6366f1 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                FinFlow
              </Typography>
              <Typography variant="caption" sx={{ ml: 1, textTransform: 'uppercase', letterSpacing: '1px', color: 'text.secondary', fontWeight: 700, fontSize: '0.65rem' }}>
                Serverless Ledger
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {/* Sync Status Badge */}
              {isGoogleConnected ? (
                <Chip
                  icon={<CloudDoneIcon sx={{ fontSize: '1rem !important' }} />}
                  label={loading ? "Syncing..." : "Google Drive"}
                  color="success"
                  variant="outlined"
                  size="small"
                  sx={{ borderRadius: '8px', fontWeight: 600, fontSize: '0.75rem' }}
                />
              ) : (
                <Chip
                  icon={<CloudQueueIcon sx={{ fontSize: '1rem !important' }} />}
                  label="Local Mode"
                  color="warning"
                  variant="outlined"
                  size="small"
                  sx={{ borderRadius: '8px', fontWeight: 600, fontSize: '0.75rem' }}
                />
              )}

              {/* Theme Toggle */}
              <IconButton onClick={toggleTheme} color="inherit">
                {themeMode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Desktop Sidebar Navigation */}
        {!isMobile && (
          <Drawer
            variant="permanent"
            sx={{
              width: drawerWidth,
              flexShrink: 0,
              [`& .MuiDrawer-paper`]: {
                width: drawerWidth,
                boxSizing: 'border-box',
                backgroundColor: 'background.paper',
                borderRight: '1px solid',
                borderColor: 'divider',
              },
            }}
          >
            <Toolbar />
            <Box sx={{ overflow: 'auto', p: 1.5 }}>
              <List>
                {navItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
                      <ListItemButton
                        onClick={() => setActiveTab(item.id)}
                        selected={isActive}
                        sx={{
                          borderRadius: 3,
                          backgroundColor: isActive ? 'primary.light' : 'transparent',
                          color: isActive ? 'primary.contrastText' : 'text.primary',
                          '&.Mui-selected': {
                            backgroundColor: 'primary.main',
                            color: 'primary.contrastText',
                            '&:hover': {
                              backgroundColor: 'primary.dark',
                            },
                            '& .MuiListItemIcon-root': {
                              color: 'primary.contrastText',
                            }
                          },
                          '&:hover': {
                            backgroundColor: isActive ? 'primary.main' : 'action.hover',
                          }
                        }}
                      >
                        <ListItemIcon sx={{ color: isActive ? 'primary.contrastText' : 'text.secondary', minWidth: 40 }}>
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: isActive ? 700 : 500 }}
                        />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          </Drawer>
        )}

        {/* Main Content Area */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 2.5, md: 4 },
            pb: { xs: 10, md: 4 }, // Add bottom padding on mobile to clear bottom nav
            width: { md: `calc(100% - ${drawerWidth}px)` },
          }}
        >
          <Toolbar />
          {renderMainContent()}
        </Box>

        {/* Mobile Bottom Navigation Bar */}
        {isMobile && (
          <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10, borderTop: '1px solid', borderColor: 'divider' }} elevation={3}>
            <BottomNavigation
              showLabels
              value={activeTab}
              onChange={(event, newValue) => {
                setActiveTab(newValue);
              }}
              sx={{
                height: 64,
                backgroundColor: 'background.paper',
                '& .Mui-selected': {
                  color: 'primary.main',
                  '& .MuiSvgIcon-root': {
                    color: 'primary.main',
                  }
                }
              }}
            >
              <BottomNavigationAction label="Spend" value="home" icon={<CalculateIcon />} />
              <BottomNavigationAction label="Income" value="income" icon={<TrendingDownIcon />} />
              <BottomNavigationAction label="Transfers" value="transfer" icon={<SwapHorizIcon />} />
              <BottomNavigationAction label="Settle" value="settlements" icon={<PeopleAltIcon />} />
              <BottomNavigationAction label="Reports" value="reports" icon={<AssessmentIcon />} />
              <BottomNavigationAction label="Settings" value="settings" icon={<SettingsIcon />} />
            </BottomNavigation>
          </Paper>
        )}
      </Box>
    </ThemeProvider>
  );
}
