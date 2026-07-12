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
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import SaveIcon from '@mui/icons-material/Save';

export default function TransferPage({ config, onAddTransfer }) {
  const [fromMode, setFromMode] = useState('');
  const [toMode, setToMode] = useState('');
  const [amount, setAmount] = useState('');
  const [isFriendSettlement, setIsFriendSettlement] = useState(false);
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
    if (!fromMode) {
      setErrorMsg('Please select the source payment mode (From).');
      return;
    }
    if (!toMode) {
      setErrorMsg('Please select the destination payment mode (To).');
      return;
    }
    if (fromMode === toMode) {
      setErrorMsg('Source (From) and Destination (To) payment modes cannot be the same.');
      return;
    }
    if (isFriendSettlement && !friendName) {
      setErrorMsg('Please select the friend you are settling with.');
      return;
    }

    const transferTx = {
      id: `trf_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      date: new Date().toISOString(),
      fromMode,
      toMode,
      amount: numericAmt,
      isFriendSettlement,
      friendName: isFriendSettlement ? friendName : '',
      description: description || (isFriendSettlement ? `Settlement with ${friendName}` : `Transfer from ${fromMode} to ${toMode}`)
    };

    try {
      await onAddTransfer(transferTx);
      // Reset form
      setFromMode('');
      setToMode('');
      setAmount('');
      setIsFriendSettlement(false);
      setFriendName('');
      setDescription('');
      setSuccessSnack(true);
    } catch (e) {
      setErrorMsg(`Failed to save transfer: ${e.message}`);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <SwapHorizIcon color="primary" sx={{ fontSize: 36 }} />
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Account Transfer / Settle</Typography>
      </Box>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 4 }} onClose={() => setErrorMsg('')}>
          {errorMsg}
        </Alert>
      )}

      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, fontFamily: 'Outfit' }}>
                Transfer / Settle Details
              </Typography>

              <Grid container spacing={3}>
                {/* Source Account (From) */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="from-mode-label">From Account / Mode</InputLabel>
                    <Select
                      labelId="from-mode-label"
                      value={fromMode}
                      label="From Account / Mode"
                      onChange={(e) => setFromMode(e.target.value)}
                    >
                      {config.paymentModes.map((mode) => (
                        <MenuItem key={`from-${mode.name}`} value={mode.name}>
                          {mode.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Destination Account (To) */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="to-mode-label">To Account / Mode</InputLabel>
                    <Select
                      labelId="to-mode-label"
                      value={toMode}
                      label="To Account / Mode"
                      onChange={(e) => setToMode(e.target.value)}
                    >
                      {config.paymentModes.map((mode) => (
                        <MenuItem key={`to-${mode.name}`} value={mode.name}>
                          {mode.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Amount */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Amount to Transfer"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    InputProps={{
                      startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary' }}>₹</Typography>
                    }}
                  />
                </Grid>

                {/* Friend Settlement Toggle */}
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={isFriendSettlement}
                        onChange={(e) => {
                          setIsFriendSettlement(e.target.checked);
                          if (e.target.checked && config.friends.length > 0) {
                            setFriendName(config.friends[0]);
                          } else {
                            setFriendName('');
                          }
                        }}
                        color="primary"
                      />
                    }
                    label="Is this transaction settling up with a friend? (e.g. paying back a friend)"
                  />
                </Grid>

                {/* Friend Selection Dropdown */}
                {isFriendSettlement && (
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel id="settle-friend-select-label">Select Friend</InputLabel>
                      <Select
                        labelId="settle-friend-select-label"
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
                    placeholder="E.g., Card payment, Settled Diya for dinner"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </Grid>

                {/* Submit Button */}
                <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={handleSubmit}
                    startIcon={<SaveIcon />}
                    sx={{ px: 4, height: 48, borderRadius: 3 }}
                  >
                    Confirm Transfer
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
        message="Transfer logged successfully!"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
