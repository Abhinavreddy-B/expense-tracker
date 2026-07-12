import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Alert,
  Snackbar
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import SaveIcon from '@mui/icons-material/Save';
import Calculator from '../components/Calculator';
import SplitEditor from '../components/SplitEditor';

export default function Homepage({ config, onAddExpense, isGoogleConnected }) {
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [description, setDescription] = useState('');

  // Split details state
  const [splitState, setSplitState] = useState({
    isFriendSplit: false,
    splitType: 'Equal',
    splitPaidBy: 'Me',
    selectedFriends: [],
    splitShare: 0,
    splitDetails: {}
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [successSnack, setSuccessSnack] = useState(false);

  // Group subcategories by category
  const categoriesMap = {};
  config.categories.forEach(c => {
    if (!categoriesMap[c.category]) {
      categoriesMap[c.category] = [];
    }
    if (!categoriesMap[c.category].includes(c.subcategory)) {
      categoriesMap[c.category].push(c.subcategory);
    }
  });

  const categoryList = Object.keys(categoriesMap);
  const subcategoryList = category ? categoriesMap[category] || [] : [];

  // Automatically reset subcategory if category changes
  useEffect(() => {
    setSubcategory('');
  }, [category]);

  // If payment mode is a friend name or contains "friend", auto-enable split settings
  const handlePaymentModeChange = (e) => {
    const val = e.target.value;
    setPaymentMode(val);

    if (val.toLowerCase().includes('friend') || val.toLowerCase().includes('split')) {
      setSplitState(prev => ({
        ...prev,
        isFriendSplit: true,
        splitPaidBy: config.friends.length > 0 ? config.friends[0] : 'Me'
      }));
    }
  };

  const handleCalculatorConfirm = (val) => {
    setAmount(val);
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    if (amount <= 0) {
      setErrorMsg('Please enter an amount greater than 0.');
      return;
    }
    if (!category) {
      setErrorMsg('Please select a Category.');
      return;
    }
    if (!subcategory) {
      setErrorMsg('Please select a Subcategory.');
      return;
    }
    if (!paymentMode) {
      setErrorMsg('Please select a Payment Mode.');
      return;
    }

    if (splitState.isFriendSplit) {
      if (splitState.selectedFriends.length === 0) {
        setErrorMsg('Please select at least one friend to split with.');
        return;
      }
      if (splitState.splitType === 'Unequal') {
        let sum = 0;
        Object.entries(splitState.splitDetails).forEach(([_, val]) => {
          sum += parseFloat(val) || 0;
        });
        if (Math.abs(sum - amount) > 0.05) {
          setErrorMsg(`Split sum (₹${sum.toFixed(2)}) must equal total amount (₹${amount.toFixed(2)}).`);
          return;
        }
      }
    }

    // Structure transaction payload
    const expenseTx = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      date: new Date().toISOString(),
      amount: parseFloat(amount),
      category,
      subcategory,
      paymentMode,
      friendPaidMode: splitState.isFriendSplit && splitState.splitPaidBy !== 'Me',
      isFriendSplit: splitState.isFriendSplit,
      splitType: splitState.isFriendSplit ? splitState.splitType : 'None',
      splitPaidBy: splitState.isFriendSplit ? splitState.splitPaidBy : 'Me',
      splitShare: splitState.isFriendSplit ? splitState.splitShare : parseFloat(amount),
      splitDetails: splitState.isFriendSplit ? splitState.splitDetails : {},
      description
    };

    try {
      await onAddExpense(expenseTx);
      // Reset form
      setAmount(0);
      setCategory('');
      setSubcategory('');
      setPaymentMode('');
      setDescription('');
      setSplitState({
        isFriendSplit: false,
        splitType: 'Equal',
        splitPaidBy: 'Me',
        selectedFriends: [],
        splitShare: 0,
        splitDetails: {}
      });
      setSuccessSnack(true);
    } catch (e) {
      setErrorMsg(`Failed to save transaction: ${e.message}`);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <CalculateIcon color="primary" sx={{ fontSize: 36 }} />
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Add Expense</Typography>
      </Box>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 4 }} onClose={() => setErrorMsg('')}>
          {errorMsg}
        </Alert>
      )}

      <Grid container spacing={4}>
        {/* Left Side: Calculator Panel */}
        <Grid item xs={12} md={5}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5, fontFamily: 'Outfit' }}>
            Amount Keypad
          </Typography>
          <Calculator
            value={amount}
            onChange={(val) => setAmount(val)}
            onConfirm={handleCalculatorConfirm}
          />
        </Grid>

        {/* Right Side: Expense Details Form */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2.5, fontFamily: 'Outfit' }}>
                Transaction Details
              </Typography>

              <Grid container spacing={2.5}>
                {/* Amount Field Display */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Spent Amount"
                    type="number"
                    value={amount || ''}
                    onChange={(e) => setAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    InputProps={{
                      startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary' }}>₹</Typography>
                    }}
                  />
                </Grid>

                {/* Category Dropdown */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="category-select-label">Category</InputLabel>
                    <Select
                      labelId="category-select-label"
                      value={category}
                      label="Category"
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {categoryList.map((cat) => (
                        <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Subcategory Dropdown */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth disabled={!category}>
                    <InputLabel id="subcategory-select-label">Subcategory</InputLabel>
                    <Select
                      labelId="subcategory-select-label"
                      value={subcategory}
                      label="Subcategory"
                      onChange={(e) => setSubcategory(e.target.value)}
                    >
                      {subcategoryList.map((sub) => (
                        <MenuItem key={sub} value={sub}>{sub}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Payment Mode */}
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel id="payment-mode-label">Payment Mode</InputLabel>
                    <Select
                      labelId="payment-mode-label"
                      value={paymentMode}
                      label="Payment Mode"
                      onChange={handlePaymentModeChange}
                    >
                      {config.paymentModes.map((mode) => (
                        <MenuItem key={mode.name} value={mode.name}>
                          {mode.name} ({mode.type})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Description */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description / Notes"
                    placeholder="E.g., Dinner at Olive Grill"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </Grid>
              </Grid>

              {/* Split Editor Section */}
              <SplitEditor
                totalAmount={amount}
                friends={config.friends}
                value={splitState}
                onChange={(val) => setSplitState(val)}
              />

              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={handleSubmit}
                  startIcon={<SaveIcon />}
                  sx={{ px: 4, height: 48, borderRadius: 3 }}
                >
                  Save Expenditure
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Success Notification */}
      <Snackbar
        open={successSnack}
        autoHideDuration={4000}
        onClose={() => setSuccessSnack(false)}
        message="Expense logged successfully!"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
