import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  RadioGroup,
  Radio,
  FormLabel,
  Checkbox,
  FormGroup,
  TextField,
  Grid,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Alert,
  Card,
  CardContent,
  Chip
} from '@mui/material';

export default function SplitEditor({ totalAmount, friends, value, onChange }) {
  const isSplitEnabled = value?.isFriendSplit || false;
  const splitType = value?.splitType || 'Equal'; // 'Equal' or 'Unequal'
  const splitPaidBy = value?.splitPaidBy || 'Me'; // 'Me' or a friend's name
  const selectedFriends = value?.selectedFriends || []; // Array of names
  const splitDetails = value?.splitDetails || {}; // { [friendName]: amount }

  const handleToggleSplit = (e) => {
    const enabled = e.target.checked;
    onChange({
      ...value,
      isFriendSplit: enabled,
      selectedFriends: enabled && selectedFriends.length === 0 ? [] : selectedFriends,
      splitType: splitType,
      splitPaidBy: splitPaidBy,
      splitDetails: {}
    });
  };

  const handleTypeChange = (e) => {
    const type = e.target.value;
    onChange({
      ...value,
      splitType: type,
      splitDetails: {}
    });
  };

  const handlePaidByChange = (e) => {
    const payer = e.target.value;
    onChange({
      ...value,
      splitPaidBy: payer
    });
  };

  const handleFriendToggle = (friendName) => {
    const index = selectedFriends.indexOf(friendName);
    let nextSelected = [...selectedFriends];
    if (index > -1) {
      nextSelected.splice(index, 1);
    } else {
      nextSelected.push(friendName);
    }

    onChange({
      ...value,
      selectedFriends: nextSelected,
      splitDetails: {} // Reset details to recalculate
    });
  };

  // Recalculate splits when inputs change
  useEffect(() => {
    if (!isSplitEnabled) return;

    if (splitType === 'Equal') {
      const divisor = selectedFriends.length + (splitPaidBy === 'Me' || selectedFriends.includes(splitPaidBy) ? 1 : 1);
      // Wait, let's look at PhonePe behavior:
      // Typically, the split includes the payer.
      // If "Paid By Me", the participants are Me + selected friends. So divisor = selectedFriends.length + 1 (for Me).
      // If "Paid By Friend" Ananya, and she splits with me (+ maybe others).
      // If I select Ananya, she is the payer, and I am the participant.
      // Let's make it simple: the total split divisor is the number of participants.
      // By default, the participants are "Me" plus all checked friends.
      // Payer is either "Me" or one of the checked friends.
      // Let's assume all checked friends plus "Me" share the expense equally.
      // So divisor is: checked friends + 1 (for "Me").
      // Each person's share = totalAmount / divisor.
      
      const divisorCount = selectedFriends.length + 1; // Me + selected friends
      const equalShare = divisorCount > 0 ? parseFloat((totalAmount / divisorCount).toFixed(2)) : 0;
      
      const details = {};
      selectedFriends.forEach(f => {
        details[f] = equalShare;
      });
      details['Me'] = parseFloat((totalAmount - (equalShare * selectedFriends.length)).toFixed(2)); // Remaining to Me

      // If friend paid, my share is what I owe them, which is equalShare.
      // Friend's share is also equalShare.
      const myShare = equalShare;

      // Update parent only if details actually changed to avoid infinite loop
      const detailsJsonStr = JSON.stringify(details);
      const prevDetailsJsonStr = JSON.stringify(splitDetails);
      if (detailsJsonStr !== prevDetailsJsonStr || value.splitShare !== myShare) {
        onChange({
          ...value,
          splitShare: myShare,
          splitDetails: details
        });
      }
    }
  }, [isSplitEnabled, splitType, selectedFriends, totalAmount, splitPaidBy]);

  const handleUnequalAmountChange = (friendName, amtVal) => {
    const amt = parseFloat(amtVal) || 0;
    const nextDetails = {
      ...splitDetails,
      [friendName]: amt
    };

    // Calculate Me's share (residual)
    let peerSum = 0;
    Object.entries(nextDetails).forEach(([name, val]) => {
      if (name !== 'Me') peerSum += val;
    });
    
    nextDetails['Me'] = parseFloat((totalAmount - peerSum).toFixed(2));

    onChange({
      ...value,
      splitShare: nextDetails['Me'],
      splitDetails: nextDetails
    });
  };

  // Validation checking for unequal split
  let unequalError = '';
  if (isSplitEnabled && splitType === 'Unequal') {
    let sum = 0;
    Object.entries(splitDetails).forEach(([name, val]) => {
      sum += parseFloat(val) || 0;
    });
    // Float comparison with tolerance
    if (Math.abs(sum - totalAmount) > 0.05) {
      unequalError = `Sum of splits (₹${sum.toFixed(2)}) must equal the total amount (₹${totalAmount.toFixed(2)}). Current difference: ₹${(totalAmount - sum).toFixed(2)}`;
    }
  }

  // Calculate my share display text
  const myComputedShare = splitDetails['Me'] || 0;

  return (
    <Card variant="outlined" sx={{ mt: 2, borderRadius: 4, overflow: 'visible' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>
            Split Bill with Friends
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={isSplitEnabled}
                onChange={handleToggleSplit}
                color="primary"
              />
            }
            label={isSplitEnabled ? "Enabled" : "Disabled"}
          />
        </Box>

        {isSplitEnabled && (
          <Box sx={{ mt: 2 }}>
            {friends.length === 0 ? (
              <Alert severity="warning" sx={{ borderRadius: 3 }}>
                You have no friends in your list. Go to the Settings page to add some!
              </Alert>
            ) : (
              <Grid container spacing={2}>
                {/* Paid By Selection */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="paid-by-label">Paid By</InputLabel>
                    <Select
                      labelId="paid-by-label"
                      value={splitPaidBy}
                      label="Paid By"
                      onChange={handlePaidByChange}
                    >
                      <MenuItem value="Me">Me (I Paid)</MenuItem>
                      {friends.map((f) => (
                        <MenuItem key={f} value={f}>{f}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Split Type Selection */}
                <Grid item xs={12} sm={6}>
                  <FormControl component="fieldset" size="small">
                    <RadioGroup
                      row
                      value={splitType}
                      onChange={handleTypeChange}
                    >
                      <FormControlLabel value="Equal" control={<Radio size="small" />} label="Equally" />
                      <FormControlLabel value="Unequal" control={<Radio size="small" />} label="Unequally" />
                    </RadioGroup>
                  </FormControl>
                </Grid>

                {/* Friends Selectors */}
                <Grid item xs={12}>
                  <FormLabel component="legend" sx={{ mb: 1, fontSize: '0.875rem', fontWeight: 600 }}>
                    Select Friends in Split:
                  </FormLabel>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {friends.map((friend) => {
                      const isSelected = selectedFriends.includes(friend);
                      return (
                        <Chip
                          key={friend}
                          label={friend}
                          color={isSelected ? "primary" : "default"}
                          variant={isSelected ? "contained" : "outlined"}
                          onClick={() => handleFriendToggle(friend)}
                          sx={{ 
                            borderRadius: '8px', 
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            cursor: 'pointer' 
                          }}
                        />
                      );
                    })}
                  </Box>
                </Grid>

                {/* Split Inputs */}
                {selectedFriends.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 1.5, textTransform: 'uppercase', fontSize: '0.75rem', color: 'text.secondary', letterSpacing: '0.5px' }}>
                      Split Breakdown
                    </Typography>

                    {splitType === 'Equal' ? (
                      <Box sx={{ pl: 1 }}>
                        <Grid container spacing={1.5}>
                          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px dashed rgba(0,0,0,0.06)' }}>
                            <Typography variant="body2" fontWeight={600}>Me (My Share)</Typography>
                            <Typography variant="body2" fontWeight={700} color="primary.main">₹{myComputedShare}</Typography>
                          </Grid>
                          {selectedFriends.map((f) => (
                            <Grid item xs={12} key={f} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px dashed rgba(0,0,0,0.06)' }}>
                              <Typography variant="body2">{f}</Typography>
                              <Typography variant="body2" fontWeight={600}>₹{splitDetails[f] || 0}</Typography>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    ) : (
                      // Unequal Split Inputs
                      <Grid container spacing={1.5}>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="My Share (auto-calculated)"
                            type="number"
                            value={myComputedShare}
                            disabled
                            InputProps={{
                              startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary' }}>₹</Typography>
                            }}
                          />
                        </Grid>
                        {selectedFriends.map((f) => (
                          <Grid item xs={12} md={6} key={f}>
                            <TextField
                              fullWidth
                              size="small"
                              label={`${f}'s Share`}
                              type="number"
                              value={splitDetails[f] || ''}
                              onChange={(e) => handleUnequalAmountChange(f, e.target.value)}
                              InputProps={{
                                startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary' }}>₹</Typography>
                              }}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    )}

                    {unequalError && (
                      <Alert severity="error" sx={{ mt: 2, borderRadius: 3 }}>
                        {unequalError}
                      </Alert>
                    )}

                    {/* Summary Info */}
                    <Box sx={{ mt: 2, p: 1.5, borderRadius: 3, backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc', border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="body2" color="text.secondary">
                        {splitPaidBy === 'Me' ? (
                          <span>
                            You paid <strong>₹{totalAmount}</strong>. You will get back{' '}
                            <strong style={{ color: '#10b981' }}>
                              ₹{(totalAmount - myComputedShare).toFixed(2)}
                            </strong>{' '}
                            from friends.
                          </span>
                        ) : (
                          <span>
                            <strong>{splitPaidBy}</strong> paid <strong>₹{totalAmount}</strong>. You owe{' '}
                            <strong style={{ color: '#ef4444' }}>
                              ₹{myComputedShare}
                            </strong>{' '}
                            to {splitPaidBy}.
                          </span>
                        )}
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
