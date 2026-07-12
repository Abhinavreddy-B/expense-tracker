import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Button,
  Alert,
  Snackbar
} from '@mui/material';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import SaveIcon from '@mui/icons-material/Save';

export default function IncomePage({ config, onAddIncome }) {
  const [amount, setAmount] = useState('');
  const [incomeMode, setIncomeMode] = useState('');
  const [isFriendTransfer, setIsFriendTransfer] = useState(false);
  const [friendName, setFriendName] = useState('');
  const [description, setDescription] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successSnack, setSuccessSnack] = useState(false);

  const handleSubmit = async () => {
    setErrorMsg('');
    const numericAmt = parseFloat(amount);

    if (isNaN(numericAmt) || numericAmt <= 0) {
      setErrorMsg('Please enter a valid amount greater than 0.');
      return;
    }
    if (!incomeMode) {
      setErrorMsg('Please select an Income Mode.');
      return;
    }
    if (isFriendTransfer && !friendName) {
      setErrorMsg('Please select the friend who transferred this money.');
      return;
    }

    const incomeTx = {
      id: `inc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      date: new Date().toISOString(),
      amount: numericAmt,
      incomeMode,
      isFriendTransfer,
      friendName: isFriendTransfer ? friendName : '',
      description
    };

    try {
      await onAddIncome(incomeTx);
      // Reset form
      setAmount('');
      setIncomeMode('');
      setIsFriendTransfer(false);
      setFriendName('');
      setDescription('');
      setSuccessSnack(true);
    } catch (e) {
      setErrorMsg(`Failed to save income: ${e.message}`);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <TrendingDownIcon color="success" sx={{ fontSize: 36 }} />
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Incoming Money</Typography>
      </Box>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 4 }} onClose={() => setErrorMsg('')}>
          {errorMsg}
        </Alert>
      )}

      <Grid container spacing={4}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, fontFamily: 'Outfit' }}>
                Receive Money Details
              </Typography>

              <Grid container spacing={3}>
                {/* Amount */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Amount Received"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    InputProps={{
                      startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary' }}>₹</Typography>
                    }}
                  />
                </Grid>

                {/* Income Mode */}
                <Grid item xs={12} sm={isFriendTransfer ? 6 : 12}>
                  <FormControl fullWidth>
                    <InputLabel id="income-mode-label">Income Mode</InputLabel>
                    <Select
                      labelId="income-mode-label"
                      value={incomeMode}
                      label="Income Mode"
                      onChange={(e) => setIncomeMode(e.target.value)}
                    >
                      {config.incomeModes.map((mode) => (
                        <MenuItem key={mode} value={mode}>{mode}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Friend Transfer Toggle */}
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={isFriendTransfer}
                        onChange={(e) => {
                          setIsFriendTransfer(e.target.checked);
                          if (e.target.checked && config.friends.length > 0) {
                            setFriendName(config.friends[0]);
                          } else {
                            setFriendName('');
                          }
                        }}
                        color="primary"
                      />
                    }
                    label="Is this a transfer from a friend? (payback, split settlement, etc.)"
                  />
                </Grid>

                {/* Friend Selection Dropdown */}
                {isFriendTransfer && (
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel id="friend-select-label">Select Friend</InputLabel>
                      <Select
                        labelId="friend-select-label"
                        value={friendName}
                        label="Select Friend"
                        onChange={(e) => setFriendName(e.target.value)}
                      >
                        {config.friends.map((friend) => (
                          <MenuItem key={friend} value={friend}>{friend}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}

                {/* Description */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description / Notes"
                    placeholder="E.g., Freelance design client, Diya payback for lunch"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </Grid>

                {/* Submit Button */}
                <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    color="secondary"
                    size="large"
                    onClick={handleSubmit}
                    startIcon={<SaveIcon />}
                    sx={{ px: 4, height: 48, borderRadius: 3 }}
                  >
                    Save Income
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar
        open={successSnack}
        autoHideDuration={4000}
        onClose={() => setSuccessSnack(false)}
        message="Income logged successfully!"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
