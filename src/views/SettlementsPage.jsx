import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  Snackbar,
  Paper
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

export default function SettlementsPage({
  config,
  balancesData,
  onAddSettlement
}) {
  const { netBalances = {}, histories = {} } = balancesData;
  const [successSnack, setSuccessSnack] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');

  // Group friends by status
  const friendsList = config.friends;
  const friendsWhoOweMe = [];
  const friendsIOwe = [];
  const settledFriends = [];

  friendsList.forEach(name => {
    const bal = netBalances[name] || 0;
    // Round to avoid float issues
    const roundedBal = parseFloat(bal.toFixed(2));
    if (roundedBal > 0.05) {
      friendsWhoOweMe.push({ name, balance: roundedBal });
    } else if (roundedBal < -0.05) {
      friendsIOwe.push({ name, balance: Math.abs(roundedBal) });
    } else {
      settledFriends.push({ name, balance: 0 });
    }
  });

  const handleMarkSettled = async (friendName, currentBalance) => {
    // Current balance could be positive (they owe me) or negative (I owe them)
    // To settle, we insert a ClearBalance record.
    // The amount written is the adjustment amount (could be negative or positive, but we actually just use the ClearBalance type to zero it out).
    // In our db.js, the 'ClearBalance' type resets the balance to 0. So the amount value can just be 0 or the cleared amount for reference.
    const settlementTx = {
      id: `set_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      date: new Date().toISOString(),
      friendName,
      amount: -currentBalance, // The offset amount (for ledger clarity)
      settledDate: new Date().toISOString().split('T')[0],
      type: 'ClearBalance'
    };

    try {
      await onAddSettlement(settlementTx);
      setSnackMsg(`Balance with ${friendName} cleared and marked as Settled!`);
      setSuccessSnack(true);
    } catch (e) {
      console.error('Failed to settle up:', e);
      setSnackMsg(`Error settling up: ${e.message}`);
      setSuccessSnack(true);
    }
  };

  const renderFriendItem = (friendName, amount, type) => {
    const history = histories[friendName] || [];
    const isSettled = type === 'settled';
    const isCredit = type === 'credit'; // they owe me

    return (
      <Accordion 
        key={friendName}
        disableGutters
        elevation={0}
        sx={{
          mb: 1.5,
          borderRadius: '12px !important',
          border: '1px solid',
          borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
          backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(15, 21, 36, 0.4)' : '#fff',
          '&:before': { display: 'none' }, // Remove default accordion divider
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between', pr: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <PeopleAltIcon color="action" />
              <Typography variant="subtitle1" fontWeight={700}>{friendName}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {isCredit && (
                <Chip 
                  icon={<ArrowUpwardIcon sx={{ fontSize: '1rem !important' }} />}
                  label={`Owes you ₹${amount.toFixed(2)}`} 
                  color="success" 
                  variant="outlined"
                  sx={{ fontWeight: 700, borderRadius: '8px' }}
                />
              )}
              {!isCredit && !isSettled && (
                <Chip 
                  icon={<ArrowDownwardIcon sx={{ fontSize: '1rem !important' }} />}
                  label={`You owe ₹${amount.toFixed(2)}`} 
                  color="error" 
                  variant="outlined"
                  sx={{ fontWeight: 700, borderRadius: '8px' }}
                />
              )}
              {isSettled && (
                <Chip 
                  label="Settled" 
                  variant="outlined"
                  sx={{ fontWeight: 500, borderRadius: '8px', color: 'text.secondary' }}
                />
              )}

              {!isSettled && (
                <Button
                  size="small"
                  variant="contained"
                  color="secondary"
                  onClick={(e) => {
                    e.stopPropagation(); // Avoid opening accordion
                    const balanceSign = isCredit ? amount : -amount;
                    handleMarkSettled(friendName, balanceSign);
                  }}
                  startIcon={<CheckCircleIcon />}
                  sx={{ borderRadius: '8px', py: 0.5 }}
                >
                  Settle Up
                </Button>
              )}
            </Box>
          </Box>
        </AccordionSummary>

        <AccordionDetails sx={{ px: 3, pb: 3, pt: 0 }}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary' }}>
            Ledger History
          </Typography>
          
          {history.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No transactional activity this month.</Typography>
          ) : (
            <List dense sx={{ p: 0 }}>
              {history.map((tx, idx) => {
                const txDate = new Date(tx.date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                });
                
                const isPositive = tx.amount > 0;
                let amtText = `₹${Math.abs(tx.amount).toFixed(2)}`;
                let amtColor = 'text.primary';

                if (tx.type === 'ClearBalance') {
                  amtText = 'RESET';
                  amtColor = 'primary.main';
                } else if (isPositive) {
                  amtText = `+ ${amtText}`;
                  amtColor = 'success.main';
                } else {
                  amtText = `- ${amtText}`;
                  amtColor = 'error.main';
                }

                return (
                  <ListItem key={tx.id || idx} sx={{ px: 0, py: 1, borderBottom: '1px dashed rgba(0,0,0,0.05)' }}>
                    <ListItemText
                      primary={tx.desc || tx.type}
                      secondary={txDate}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                    <Typography variant="body2" sx={{ fontWeight: 700, color: amtColor }}>
                      {amtText}
                    </Typography>
                  </ListItem>
                );
              })}
            </List>
          )}
        </AccordionDetails>
      </Accordion>
    );
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <PeopleAltIcon color="primary" sx={{ fontSize: 36 }} />
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Friend Settlements</Typography>
      </Box>

      {friendsList.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 4 }}>
          No friends found. Configure your friends list in the Settings page to start tracking splits and settlements!
        </Alert>
      ) : (
        <Grid container spacing={4}>
          {/* Outstanding Credits */}
          <Grid item xs={12}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, mb: 3, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, color: 'success.main', fontFamily: 'Outfit' }}>
                Friends Who Owe You
              </Typography>
              {friendsWhoOweMe.length === 0 ? (
                <Typography variant="body2" color="text.secondary">Nobody owes you money currently.</Typography>
              ) : (
                friendsWhoOweMe.map(f => renderFriendItem(f.name, f.balance, 'credit'))
              )}
            </Paper>
          </Grid>

          {/* Outstanding Debits */}
          <Grid item xs={12}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, mb: 3, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, color: 'error.main', fontFamily: 'Outfit' }}>
                Friends You Owe
              </Typography>
              {friendsIOwe.length === 0 ? (
                <Typography variant="body2" color="text.secondary">You don't owe any money to friends currently.</Typography>
              ) : (
                friendsIOwe.map(f => renderFriendItem(f.name, f.balance, 'debit'))
              )}
            </Paper>
          </Grid>

          {/* Settled Friends */}
          <Grid item xs={12}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, color: 'text.secondary', fontFamily: 'Outfit' }}>
                All Settled Up
              </Typography>
              {settledFriends.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No settled friends to show.</Typography>
              ) : (
                settledFriends.map(f => renderFriendItem(f.name, f.balance, 'settled'))
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      <Snackbar
        open={successSnack}
        autoHideDuration={4000}
        onClose={() => setSuccessSnack(false)}
        message={snackMsg}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
