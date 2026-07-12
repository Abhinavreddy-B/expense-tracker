import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DownloadIcon from '@mui/icons-material/Download';
import EmailIcon from '@mui/icons-material/Email';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar
} from 'recharts';

import { getExcelExportUrl } from '../services/googleSheets';
import { getSpreadsheetIds } from '../services/db';

const COLORS = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#2dd4bf', '#fb7185', '#60a5fa'];

export default function ReportPage({
  monthData,
  selectedMonth,
  onMonthChange,
  balancesData,
  isGoogleConnected
}) {
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  // Month & Year parsing
  const [yearStr, monthStr] = selectedMonth.split('_');
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = monthNames[parseInt(monthStr, 10) - 1];

  // 1. Calculate Summary Numbers
  // Note: expense details contain "splitShare" which is the amount I actually owe / paid.
  // Let's compute:
  // - My personal expenses = Sum of all (isFriendSplit ? splitShare : amount) where paid by me OR split by friend.
  // Wait, let's make it simpler:
  // Total Spent = Sum of expenses. If isFriendSplit is true:
  // - If splitPaidBy is 'Me', the total spent in terms of out-flow is the full amount, but my true expense share is e.splitShare. The rest is a loan.
  // - If splitPaidBy is a Friend, my out-flow is 0, but my true expense is splitShare.
  // Let's display:
  // "True Expenses" (What I actually consumed): sum of (isFriendSplit ? splitShare : amount)
  // "Total Outflow" (Actual money debited from accounts): sum of amount where splitPaidBy === 'Me'
  // "Total Income": sum of income amount
  
  const trueExpenses = monthData.expenses.reduce((sum, e) => {
    return sum + (e.isFriendSplit ? e.splitShare : e.amount);
  }, 0);

  const totalOutflow = monthData.expenses.reduce((sum, e) => {
    return sum + (e.isFriendSplit && e.splitPaidBy !== 'Me' ? 0 : e.amount);
  }, 0);

  const totalIncome = monthData.income.reduce((sum, i) => sum + i.amount, 0);
  const netSaved = totalIncome - trueExpenses;

  // Outstanding Owed/Owe
  let totalOwedToMe = 0;
  let totalIOwe = 0;
  Object.values(balancesData.netBalances || {}).forEach(bal => {
    if (bal > 0) totalOwedToMe += bal;
    else if (bal < 0) totalIOwe += Math.abs(bal);
  });

  // 2. Data Preparation for Graphs
  // A. Category wise Chart data
  const categorySummaryMap = {};
  monthData.expenses.forEach(e => {
    const cat = e.category || 'Other';
    const amt = e.isFriendSplit ? e.splitShare : e.amount;
    categorySummaryMap[cat] = (categorySummaryMap[cat] || 0) + amt;
  });
  const categoryChartData = Object.entries(categorySummaryMap).map(([name, value]) => ({
    name,
    value: parseFloat(value.toFixed(2))
  })).sort((a, b) => b.value - a.value);

  // B. Daily Expense Trend
  const dailySummaryMap = {};
  // Pre-populate days for the month
  const daysInMonth = new Date(parseInt(yearStr), parseInt(monthStr), 0).getDate();
  for (let i = 1; i <= daysInMonth; i++) {
    dailySummaryMap[i] = 0;
  }
  monthData.expenses.forEach(e => {
    const dateObj = new Date(e.date);
    if (dateObj.getFullYear() === parseInt(yearStr) && (dateObj.getMonth() + 1) === parseInt(monthStr)) {
      const day = dateObj.getDate();
      const amt = e.isFriendSplit ? e.splitShare : e.amount;
      dailySummaryMap[day] = (dailySummaryMap[day] || 0) + amt;
    }
  });
  const dailyChartData = Object.entries(dailySummaryMap).map(([day, amount]) => ({
    day: `Day ${day}`,
    amount: parseFloat(amount.toFixed(2))
  }));

  // C. Income vs Expense comparative data
  const compareChartData = [
    { name: 'Income', amount: parseFloat(totalIncome.toFixed(2)), fill: '#34d399' },
    { name: 'Expenses', amount: parseFloat(trueExpenses.toFixed(2)), fill: '#818cf8' }
  ];

  // 3. Email Body Generation
  const generateEmailReportText = () => {
    let text = `FINFLOW FINANCIAL REPORT — ${monthName.toUpperCase()} ${yearStr}\n`;
    text += `==============================================\n\n`;
    text += `FINANCIAL SUMMARY:\n`;
    text += `----------------------------------------------\n`;
    text += `• Total Income Received : ₹${totalIncome.toFixed(2)}\n`;
    text += `• True Expenditure      : ₹${trueExpenses.toFixed(2)}\n`;
    text += `• Net Savings           : ₹${netSaved.toFixed(2)} (${totalIncome > 0 ? ((netSaved / totalIncome) * 100).toFixed(1) : 0}% of income)\n\n`;

    text += `SPENDING BY CATEGORY:\n`;
    text += `----------------------------------------------\n`;
    if (categoryChartData.length === 0) {
      text += `• No expenditures recorded.\n`;
    } else {
      categoryChartData.forEach(cat => {
        text += `• ${cat.name}: ₹${cat.value.toFixed(2)} (${((cat.value / (trueExpenses || 1)) * 100).toFixed(1)}%)\n`;
      });
    }
    text += `\n`;

    text += `FRIEND BALANCE SUMMARY:\n`;
    text += `----------------------------------------------\n`;
    const friendBals = Object.entries(balancesData.netBalances || {});
    const activeFriendBals = friendBals.filter(([_, bal]) => Math.abs(bal) > 0.05);

    if (activeFriendBals.length === 0) {
      text += `• All friend balances are fully settled!\n`;
    } else {
      activeFriendBals.forEach(([name, bal]) => {
        if (bal > 0) {
          text += `• ${name} owes you: ₹${bal.toFixed(2)}\n`;
        } else {
          text += `• You owe ${name}: ₹${Math.abs(bal).toFixed(2)}\n`;
        }
      });
    }
    text += `\n`;

    text += `Spreadsheets stored securely on Google Drive.\n`;
    text += `Report generated via FinFlow on ${new Date().toLocaleDateString('en-IN')}.\n`;
    return text;
  };

  const handleCopyClipboard = () => {
    navigator.clipboard.writeText(generateEmailReportText());
    alert('Report copied to clipboard!');
  };

  const handleSendEmail = () => {
    const subject = encodeURIComponent(`FinFlow Report: ${monthName} ${yearStr}`);
    const body = encodeURIComponent(generateEmailReportText());
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  // Google spreadsheets download URLs
  const spreadsheetIds = getSpreadsheetIds();
  const configId = spreadsheetIds['ExpenseTracker_Config'];
  const expenseId = spreadsheetIds[`ExpenseTracker_Expenses_${selectedMonth}`];

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AssessmentIcon color="primary" sx={{ fontSize: 36 }} />
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Monthly Analysis</Typography>
        </Box>

        {/* Month Selector */}
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="month-picker-label">Select Month</InputLabel>
          <Select
            labelId="month-picker-label"
            value={selectedMonth}
            label="Select Month"
            onChange={(e) => onMonthChange(e.target.value)}
          >
            {/* Generate options for recent months */}
            {Array.from({ length: 12 }).map((_, idx) => {
              const d = new Date();
              d.setMonth(d.getMonth() - idx);
              const mm = String(d.getMonth() + 1).padStart(2, '0');
              const yyyy = d.getFullYear();
              const key = `${yyyy}_${mm}`;
              const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
              return (
                <MenuItem key={key} value={key}>{label}</MenuItem>
              );
            })}
          </Select>
        </FormControl>
      </Box>

      {/* Stats Cards Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Income Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle2" color="text.secondary" fontWeight={600} gutterBottom>
                Total Income
              </Typography>
              <Typography variant="h4" fontWeight={800} color="success.main">
                ₹{totalIncome.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Expense Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle2" color="text.secondary" fontWeight={600} gutterBottom>
                True Expenses
              </Typography>
              <Typography variant="h4" fontWeight={800} color="primary.main">
                ₹{trueExpenses.toFixed(2)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Outflow: ₹{totalOutflow.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Savings Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle2" color="text.secondary" fontWeight={600} gutterBottom>
                Net Savings
              </Typography>
              <Typography variant="h4" fontWeight={800} color={netSaved >= 0 ? 'success.main' : 'error.main'}>
                ₹{netSaved.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Peer Balances Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle2" color="text.secondary" fontWeight={600} gutterBottom>
                Peer Owed / Owe
              </Typography>
              <Typography variant="h5" fontWeight={800} sx={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: '#10b981', fontSize: '1rem' }}>+ ₹{totalOwedToMe.toFixed(2)} (Owed to me)</span>
                <span style={{ color: '#ef4444', fontSize: '1rem' }}>- ₹{totalIOwe.toFixed(2)} (I owe)</span>
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Grid */}
      <Grid container spacing={4} sx={{ mb: 4 }}>
        {/* Income vs Expenses Bar Chart */}
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider', height: 350 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, fontFamily: 'Outfit' }}>
              Cash Flow Comparison
            </Typography>
            <Box sx={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={compareChartData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => `₹${value}`} />
                  <Bar dataKey="amount" fill="#818cf8" radius={[8, 8, 0, 0]}>
                    {compareChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Category Breakdown Pie Chart */}
        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider', height: 350 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, fontFamily: 'Outfit' }}>
              Expenditure by Category
            </Typography>
            {categoryChartData.length === 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
                <Typography color="text.secondary">No expense transactions found for this month.</Typography>
              </Box>
            ) : (
              <Grid container alignItems="center">
                <Grid item xs={12} sm={6}>
                  <Box sx={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={categoryChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {categoryChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `₹${value}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} sx={{ maxHeight: 250, overflowY: 'auto' }}>
                  <Table size="small">
                    <TableBody>
                      {categoryChartData.map((item, idx) => (
                        <TableRow key={item.name} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                          <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75 }}>
                            <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: COLORS[idx % COLORS.length] }} />
                            <Typography variant="body2" fontWeight={600}>{item.name}</Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ py: 0.75 }}>
                            <Typography variant="body2">₹{item.value}</Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ py: 0.75 }}>
                            <Typography variant="caption" color="text.secondary">
                              {((item.value / trueExpenses) * 100).toFixed(0)}%
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Grid>
              </Grid>
            )}
          </Paper>
        </Grid>

        {/* Daily Expenses Line Trend */}
        <Grid item xs={12}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider', height: 360 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, fontFamily: 'Outfit' }}>
              Daily Spending Trend (True Share)
            </Typography>
            <Box sx={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <LineChart data={dailyChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tickFormatter={(v) => v.replace('Day ', '')} />
                  <YAxis />
                  <Tooltip formatter={(value) => `₹${value}`} />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#818cf8"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Export & Email Trigger Panel */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700} sx={{ fontFamily: 'Outfit' }}>
            Export Month Insights & Spreadsheets
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manually trigger data exports to Excel or draft an email report of your monthly expenditure.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<EmailIcon />}
            onClick={() => setEmailDialogOpen(true)}
          >
            Email Insights
          </Button>

          {isGoogleConnected ? (
            <>
              {configId && (
                <Button
                  variant="outlined"
                  color="secondary"
                  href={getExcelExportUrl(configId)}
                  target="_blank"
                  startIcon={<DownloadIcon />}
                >
                  Config Excel
                </Button>
              )}
              {expenseId && (
                <Button
                  variant="contained"
                  color="secondary"
                  href={getExcelExportUrl(expenseId)}
                  target="_blank"
                  startIcon={<FileDownloadIcon />}
                >
                  Monthly Excel
                </Button>
              )}
            </>
          ) : (
            <Button
              variant="contained"
              color="secondary"
              disabled
              startIcon={<FileDownloadIcon />}
            >
              Excel (Sync Required)
            </Button>
          )}
        </Box>
      </Paper>

      {/* Email Draft Dialog */}
      <Dialog open={emailDialogOpen} onClose={() => setEmailDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>
          Monthly Financial Insights
        </DialogTitle>
        <DialogContent dividers>
          {!isGoogleConnected && (
            <Alert severity="warning" sx={{ mb: 2, borderRadius: 3 }}>
              Google Drive is not connected. Direct links to spreadsheets won't be included in the email draft.
            </Alert>
          )}
          <Box
            component="pre"
            sx={{
              p: 2.5,
              borderRadius: 3,
              backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : '#f8fafc',
              border: '1px solid',
              borderColor: 'divider',
              overflowX: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              whiteSpace: 'pre-wrap'
            }}
          >
            {generateEmailReportText()}
            {isGoogleConnected && expenseId && (
              <>
                {`\nSPREADSHEET DOWNLOAD LINKS:\n`}
                {`----------------------------------------------\n`}
                {`• Monthly Transactions Excel: ${getExcelExportUrl(expenseId)}\n`}
                {configId && `• Config Sheet Excel: ${getExcelExportUrl(configId)}\n`}
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailDialogOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleCopyClipboard} startIcon={<ContentCopyIcon />} color="primary">
            Copy Text
          </Button>
          <Button onClick={handleSendEmail} startIcon={<EmailIcon />} variant="contained" color="primary">
            Send via Email
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
