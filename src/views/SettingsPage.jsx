import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  MenuItem
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { signInWithGoogle, clearStoredToken } from '../services/googleSheets';

export default function SettingsPage({
  config,
  onConfigChange,
  googleClientId,
  onGoogleClientIdChange,
  isGoogleConnected,
  setIsGoogleConnected,
  onSyncConfig,
  onForcePushConfig
}) {
  const [newFriend, setNewFriend] = useState('');
  const [newPaymentName, setNewPaymentName] = useState('');
  const [newPaymentType, setNewPaymentType] = useState('Bank Account');
  const [newIncomeMode, setNewIncomeMode] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newSubcategory, setNewSubcategory] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [infoOpen, setInfoOpen] = useState(false);

  const handleConnectGoogle = () => {
    if (!googleClientId) {
      setErrorMsg('Please enter a Google OAuth Client ID first.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    signInWithGoogle(
      googleClientId,
      async (token) => {
        setIsGoogleConnected(true);
        try {
          setSuccessMsg('Google Drive connected! Syncing configurations...');
          await onSyncConfig();
          setSuccessMsg('Google Drive connected and synced successfully!');
        } catch (e) {
          setErrorMsg(`Connected to Google, but failed to sync: ${e.message}`);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        setErrorMsg(`Google Authentication failed: ${error}`);
        setLoading(false);
      }
    );
  };

  const handleDisconnectGoogle = () => {
    clearStoredToken();
    setIsGoogleConnected(false);
    setSuccessMsg('Google Drive disconnected. Switched to Local Demo Mode.');
  };

  const handleTriggerSync = async () => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await onSyncConfig();
      setSuccessMsg('Config synced successfully with Google Drive!');
    } catch (e) {
      setErrorMsg(`Sync failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerPush = async () => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await onForcePushConfig();
      setSuccessMsg('Config pushed successfully to Google Drive!');
    } catch (e) {
      setErrorMsg(`Push failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 1. Add Category & Subcategory
  const handleAddCategory = () => {
    if (!newCategory || !newSubcategory) return;
    
    // Check if duplicate
    const exists = config.categories.some(
      c => c.category.toLowerCase() === newCategory.toLowerCase() && 
           c.subcategory.toLowerCase() === newSubcategory.toLowerCase()
    );

    if (exists) {
      setErrorMsg('This Category/Subcategory combination already exists.');
      return;
    }

    const updated = {
      ...config,
      categories: [...config.categories, { category: newCategory, subcategory: newSubcategory }]
    };
    onConfigChange(updated);
    setNewSubcategory('');
    setSuccessMsg('Category added locally.');
  };

  const handleRemoveCategory = (index) => {
    const nextCategories = [...config.categories];
    nextCategories.splice(index, 1);
    const updated = {
      ...config,
      categories: nextCategories
    };
    onConfigChange(updated);
  };

  // 2. Manage Friends
  const handleAddFriend = () => {
    if (!newFriend) return;
    if (config.friends.includes(newFriend)) {
      setErrorMsg('Friend name already exists.');
      return;
    }
    const updated = {
      ...config,
      friends: [...config.friends, newFriend]
    };
    onConfigChange(updated);
    setNewFriend('');
    setSuccessMsg('Friend added.');
  };

  const handleRemoveFriend = (name) => {
    const updated = {
      ...config,
      friends: config.friends.filter(f => f !== name)
    };
    onConfigChange(updated);
  };

  // 3. Manage Payment Modes
  const handleAddPaymentMode = () => {
    if (!newPaymentName) return;
    const exists = config.paymentModes.some(p => p.name.toLowerCase() === newPaymentName.toLowerCase());
    if (exists) {
      setErrorMsg('Payment mode already exists.');
      return;
    }
    const updated = {
      ...config,
      paymentModes: [...config.paymentModes, { name: newPaymentName, type: newPaymentType }]
    };
    onConfigChange(updated);
    setNewPaymentName('');
    setSuccessMsg('Payment mode added.');
  };

  const handleRemovePaymentMode = (name) => {
    const updated = {
      ...config,
      paymentModes: config.paymentModes.filter(p => p.name !== name)
    };
    onConfigChange(updated);
  };

  // 4. Manage Income Modes
  const handleAddIncomeMode = () => {
    if (!newIncomeMode) return;
    if (config.incomeModes.includes(newIncomeMode)) {
      setErrorMsg('Income mode already exists.');
      return;
    }
    const updated = {
      ...config,
      incomeModes: [...config.incomeModes, newIncomeMode]
    };
    onConfigChange(updated);
    setNewIncomeMode('');
    setSuccessMsg('Income mode added.');
  };

  const handleRemoveIncomeMode = (name) => {
    const updated = {
      ...config,
      incomeModes: config.incomeModes.filter(i => i !== name)
    };
    onConfigChange(updated);
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Settings & Sync</Typography>
        <IconButton color="primary" onClick={() => setInfoOpen(true)}>
          <InfoOutlinedIcon />
        </IconButton>
      </Box>

      {errorMsg && <Alert severity="error" sx={{ mb: 3, borderRadius: 4 }} onClose={() => setErrorMsg('')}>{errorMsg}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 3, borderRadius: 4 }} onClose={() => setSuccessMsg('')}>{successMsg}</Alert>}

      <Grid container spacing={4}>
        {/* Google OAuth Panel */}
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {isGoogleConnected ? (
                  <CloudDoneIcon color="success" sx={{ fontSize: 32, mr: 1.5 }} />
                ) : (
                  <CloudQueueIcon color="action" sx={{ fontSize: 32, mr: 1.5 }} />
                )}
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Google Drive Storage Integration</Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                This application works serverless. All your transactional spreadsheets are kept privately in your own Google Drive.
                Enter your Google OAuth Client ID to authenticate. You can create a Client ID for free in the Google Cloud Console.
              </Typography>

              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={7}>
                  <TextField
                    fullWidth
                    label="Google OAuth Client ID"
                    placeholder="xxxxxxxxxxxx-xxxxxxxxxxxxxxxx.apps.googleusercontent.com"
                    value={googleClientId}
                    onChange={(e) => onGoogleClientIdChange(e.target.value)}
                    disabled={isGoogleConnected}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={5} sx={{ display: 'flex', gap: 1.5 }}>
                  {!isGoogleConnected ? (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleConnectGoogle}
                      disabled={loading}
                      fullWidth
                      startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LockOpenIcon />}
                    >
                      Connect Drive
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={handleDisconnectGoogle}
                        fullWidth
                      >
                        Disconnect
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleTriggerSync}
                        disabled={loading}
                        fullWidth
                        startIcon={loading && <CircularProgress size={16} color="inherit" />}
                      >
                        Pull Sync
                      </Button>
                      <Button
                        variant="outlined"
                        color="primary"
                        onClick={handleTriggerPush}
                        disabled={loading}
                        fullWidth
                      >
                        Push Config
                      </Button>
                    </>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Categories Panel */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Categories & Subcategories</Typography>
              
              <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                <TextField
                  size="small"
                  label="Category (e.g. Food)"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  fullWidth
                />
                <TextField
                  size="small"
                  label="Subcategory (e.g. Cafe)"
                  value={newSubcategory}
                  onChange={(e) => setNewSubcategory(e.target.value)}
                  fullWidth
                />
                <Button variant="contained" color="primary" onClick={handleAddCategory}>
                  <AddIcon />
                </Button>
              </Box>

              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                <List dense>
                  {config.categories.map((c, idx) => (
                    <ListItem
                      key={idx}
                      secondaryAction={
                        <IconButton edge="end" color="error" onClick={() => handleRemoveCategory(idx)}>
                          <DeleteIcon />
                        </IconButton>
                      }
                      sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
                    >
                      <ListItemText
                        primary={c.subcategory}
                        secondary={c.category}
                        primaryTypographyProps={{ fontWeight: 600 }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Friends Panel */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Friends List</Typography>
              
              <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                <TextField
                  size="small"
                  label="Friend Name"
                  value={newFriend}
                  onChange={(e) => setNewFriend(e.target.value)}
                  fullWidth
                />
                <Button variant="contained" color="primary" onClick={handleAddFriend}>
                  <AddIcon />
                </Button>
              </Box>

              <Divider sx={{ mb: 2 }} />

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: 300, overflowY: 'auto' }}>
                {config.friends.map((friend) => (
                  <Chip
                    key={friend}
                    label={friend}
                    onDelete={() => handleRemoveFriend(friend)}
                    sx={{ borderRadius: '8px', fontSize: '0.9rem', py: 1 }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Payment Modes Panel */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Payment Modes</Typography>
              
              <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                <TextField
                  size="small"
                  label="Payment Mode (e.g. SBI CC)"
                  value={newPaymentName}
                  onChange={(e) => setNewPaymentName(e.target.value)}
                  fullWidth
                />
                <TextField
                  select
                  size="small"
                  label="Type"
                  value={newPaymentType}
                  onChange={(e) => setNewPaymentType(e.target.value)}
                  sx={{ minWidth: 130 }}
                >
                  <MenuItem value="Bank Account">Bank</MenuItem>
                  <MenuItem value="Credit Card">Card</MenuItem>
                  <MenuItem value="Cash">Cash</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </TextField>
                <Button variant="contained" color="primary" onClick={handleAddPaymentMode}>
                  <AddIcon />
                </Button>
              </Box>

              <Divider sx={{ mb: 2 }} />

              <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                <List dense>
                  {config.paymentModes.map((p) => (
                    <ListItem
                      key={p.name}
                      secondaryAction={
                        <IconButton edge="end" color="error" onClick={() => handleRemovePaymentMode(p.name)}>
                          <DeleteIcon />
                        </IconButton>
                      }
                      sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
                    >
                      <ListItemText
                        primary={p.name}
                        secondary={p.type}
                        primaryTypographyProps={{ fontWeight: 600 }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Income Modes Panel */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Income Modes</Typography>
              
              <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                <TextField
                  size="small"
                  label="Income Mode (e.g. Freelance)"
                  value={newIncomeMode}
                  onChange={(e) => setNewIncomeMode(e.target.value)}
                  fullWidth
                />
                <Button variant="contained" color="primary" onClick={handleAddIncomeMode}>
                  <AddIcon />
                </Button>
              </Box>

              <Divider sx={{ mb: 2 }} />

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: 300, overflowY: 'auto' }}>
                {config.incomeModes.map((mode) => (
                  <Chip
                    key={mode}
                    label={mode}
                    onDelete={() => handleRemoveIncomeMode(mode)}
                    sx={{ borderRadius: '8px', fontSize: '0.9rem', py: 1 }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Guide Dialog */}
      <Dialog open={infoOpen} onClose={() => setInfoOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>Setup Google Drive Integration</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph sx={{ mt: 1 }}>
            To enable real-time data sync with your Google Drive, you will need a <strong>Google OAuth Client ID</strong>.
            Follow these simple steps:
          </Typography>
          <ol style={{ fontSize: '0.875rem', paddingLeft: '20px', lineHeight: '1.6' }}>
            <li>Go to the <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer">Google Cloud Console</a>.</li>
            <li>Create a new project (e.g. "FinFlow Expense Tracker").</li>
            <li>Go to <strong>APIs & Services &gt; Enabled APIs & Services</strong>. Click <strong>Enable APIs and Services</strong>. Search for and enable the <strong>Google Drive API</strong> and <strong>Google Sheets API</strong>.</li>
            <li>Go to <strong>APIs & Services &gt; OAuth consent screen</strong>. Set User Type to <strong>External</strong>, input the app details, and add the scopes:
              <br /><code>.../auth/spreadsheets</code> and <code>.../auth/drive.file</code>.
              Add your Google email as a Test User. Click save.
            </li>
            <li>Go to <strong>APIs & Services &gt; Credentials</strong>. Click <strong>+ Create Credentials &gt; OAuth client ID</strong>.</li>
            <li>Select Application type as <strong>Web application</strong>.</li>
            <li>Under <strong>Authorized JavaScript origins</strong>, add your local address: <code>http://localhost:5173</code> (or the active port Vite runs on). Add your production URL here too if you deploy it!</li>
            <li>Click Create. Copy the <strong>Client ID</strong> and paste it into the settings field here!</li>
          </ol>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoOpen(false)} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
