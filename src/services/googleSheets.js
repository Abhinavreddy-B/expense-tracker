/**
 * Service for interacting with Google Drive and Google Sheets APIs directly via REST endpoints.
 * This avoids importing bulky Google API client libraries and provides a clean, asynchronous interface.
 */

// Keys for local storage
const TOKEN_KEY = 'finflow_google_token';
const CLIENT_ID_KEY = 'finflow_client_id';

/**
 * Initial state of OAuth client.
 */
let tokenClient = null;

/**
 * Load settings from local storage
 */
export const getStoredClientId = () => {
  return localStorage.getItem(CLIENT_ID_KEY) || '';
};

export const saveStoredClientId = (clientId) => {
  if (clientId) {
    localStorage.setItem(CLIENT_ID_KEY, clientId);
  } else {
    localStorage.removeItem(CLIENT_ID_KEY);
  }
};

export const getStoredToken = () => {
  const tokenStr = localStorage.getItem(TOKEN_KEY);
  if (!tokenStr) return null;
  try {
    const tokenData = JSON.parse(tokenStr);
    // Check if token is expired (adding 5 mins buffer)
    if (Date.now() > tokenData.expiry - 300000) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return tokenData.access_token;
  } catch (e) {
    return null;
  }
};

export const saveStoredToken = (accessToken, expiresInSeconds) => {
  const tokenData = {
    access_token: accessToken,
    expiry: Date.now() + (expiresInSeconds * 1000)
  };
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokenData));
};

export const clearStoredToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

/**
 * Initialize the Google OAuth Token Client.
 * Assumes the client-side library `https://accounts.google.com/gsi/client` is loaded.
 */
export const initGoogleOAuth = (clientId, onTokenReceived, onError) => {
  if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
    console.error('Google Accounts library not loaded.');
    if (onError) onError('Google Identity Services library is not loaded. Please refresh or check your internet connection.');
    return null;
  }

  if (!clientId) {
    if (onError) onError('Google Client ID is missing. Please configure it in Settings.');
    return null;
  }

  try {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
      callback: (tokenResponse) => {
        if (tokenResponse.error) {
          console.error('OAuth Callback Error:', tokenResponse.error);
          if (onError) onError(tokenResponse.error_description || tokenResponse.error);
          return;
        }
        if (tokenResponse.access_token) {
          saveStoredToken(tokenResponse.access_token, tokenResponse.expires_in);
          if (onTokenReceived) onTokenReceived(tokenResponse.access_token);
        }
      },
    });
    return tokenClient;
  } catch (error) {
    console.error('Error initializing Token Client:', error);
    if (onError) onError(error.message || 'Initialization failed.');
    return null;
  }
};

/**
 * Request Google Sign-in / Access Token
 */
export const signInWithGoogle = (clientId, onTokenReceived, onError) => {
  saveStoredClientId(clientId);
  const client = initGoogleOAuth(clientId, onTokenReceived, onError);
  if (client) {
    // Prompt the user to select account and consent
    client.requestAccessToken({ prompt: 'consent' });
  }
};

/**
 * Base fetch with auth headers
 */
const fetchWithAuth = async (url, options = {}) => {
  const token = getStoredToken();
  if (!token) {
    throw new Error('NOT_AUTHENTICATED');
  }

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
  };

  const response = await fetch(url, { ...options, headers });
  
  if (response.status === 401) {
    clearStoredToken();
    throw new Error('TOKEN_EXPIRED');
  }

  if (!response.ok) {
    const errText = await response.text();
    let errMsg = `API error: ${response.status} ${response.statusText}`;
    try {
      const errJson = JSON.parse(errText);
      errMsg = errJson.error?.message || errMsg;
    } catch (_) {}
    throw new Error(errMsg);
  }

  return response.json();
};

/**
 * Find a file in Google Drive by name
 */
export const findSpreadsheetByName = async (name) => {
  const q = `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`;
  const data = await fetchWithAuth(url);
  return data.files && data.files.length > 0 ? data.files[0] : null;
};

/**
 * Create a new spreadsheet in Google Drive
 */
export const createSpreadsheet = async (name) => {
  const url = 'https://www.googleapis.com/drive/v3/files';
  const data = await fetchWithAuth(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.spreadsheet',
    }),
  });
  return data; // returns { id, name, mimeType }
};

/**
 * Read values from a spreadsheet sheet range
 */
export const readSheetValues = async (spreadsheetId, range) => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const data = await fetchWithAuth(url);
  return data.values || [];
};

/**
 * Write values to a spreadsheet sheet range (overwriting)
 */
export const writeSheetValues = async (spreadsheetId, range, values) => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const data = await fetchWithAuth(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values,
    }),
  });
  return data;
};

/**
 * Append values to a sheet (appends as new rows)
 */
export const appendSheetRow = async (spreadsheetId, range, rowValues) => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
  const data = await fetchWithAuth(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [rowValues],
    }),
  });
  return data;
};

/**
 * Batch update values across multiple ranges
 */
export const batchUpdateSheetValues = async (spreadsheetId, valueRanges) => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  const data = await fetchWithAuth(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: valueRanges.map(vr => ({
        range: vr.range,
        values: vr.values,
      })),
    }),
  });
  return data;
};

/**
 * Setup sheet tabs inside a spreadsheet
 */
export const setupSpreadsheetTabs = async (spreadsheetId, tabTitles) => {
  // First, get the spreadsheet details to see which sheets already exist
  const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title))`;
  const spreadsheet = await fetchWithAuth(getUrl);
  const existingSheets = spreadsheet.sheets || [];
  
  const requests = [];
  const existingTitles = existingSheets.map(s => s.properties.title);
  
  // Step 1: Check if the first sheet is "Sheet1" and rename it to the first requested tab to keep it clean
  const sheet1 = existingSheets.find(s => s.properties.title === 'Sheet1');
  let firstTabTitle = tabTitles[0];
  let sheetsToAdd = tabTitles;

  if (sheet1 && !existingTitles.includes(firstTabTitle)) {
    requests.push({
      updateSheetProperties: {
        properties: {
          sheetId: sheet1.properties.sheetId,
          title: firstTabTitle
        },
        fields: 'title'
      }
    });
    sheetsToAdd = tabTitles.slice(1);
  }

  // Step 2: Add any remaining sheets that do not exist yet
  sheetsToAdd.forEach(title => {
    if (!existingTitles.includes(title)) {
      requests.push({
        addSheet: {
          properties: {
            title
          }
        }
      });
    }
  });

  if (requests.length === 0) return;

  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  await fetchWithAuth(updateUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests
    })
  });
};

/**
 * Full Initialization of the Config Spreadsheet
 */
export const initializeConfigSpreadsheet = async (spreadsheetId) => {
  const tabs = ['Categories', 'PaymentModes', 'Friends', 'IncomeModes'];
  await setupSpreadsheetTabs(spreadsheetId, tabs);

  // Define headers for config sheets if they are empty
  const valueRanges = [];
  
  const categories = await readSheetValues(spreadsheetId, 'Categories!A1:B1');
  if (categories.length === 0) {
    valueRanges.push({ range: 'Categories!A1:B1', values: [['Category', 'Subcategory']] });
  }

  const paymentModes = await readSheetValues(spreadsheetId, 'PaymentModes!A1:B1');
  if (paymentModes.length === 0) {
    valueRanges.push({ range: 'PaymentModes!A1:B1', values: [['Name', 'Type']] });
  }

  const friends = await readSheetValues(spreadsheetId, 'Friends!A1:A1');
  if (friends.length === 0) {
    valueRanges.push({ range: 'Friends!A1:A1', values: [['Name']] });
  }

  const incomeModes = await readSheetValues(spreadsheetId, 'IncomeModes!A1:A1');
  if (incomeModes.length === 0) {
    valueRanges.push({ range: 'IncomeModes!A1:A1', values: [['Name']] });
  }

  if (valueRanges.length > 0) {
    await batchUpdateSheetValues(spreadsheetId, valueRanges);
  }
};

/**
 * Full Initialization of the Monthly Expense Spreadsheet
 */
export const initializeExpenseSpreadsheet = async (spreadsheetId) => {
  const tabs = ['Expenses', 'Income', 'Transfers', 'Settlements'];
  await setupSpreadsheetTabs(spreadsheetId, tabs);

  const valueRanges = [];

  const expenses = await readSheetValues(spreadsheetId, 'Expenses!A1:A1');
  if (expenses.length === 0) {
    valueRanges.push({
      range: 'Expenses!A1:M1',
      values: [[
        'id', 
        'date', 
        'amount', 
        'category', 
        'subcategory', 
        'paymentMode', 
        'friendPaidMode', 
        'isFriendSplit', 
        'splitType', 
        'splitPaidBy', 
        'splitShare', 
        'splitDetails', 
        'description'
      ]]
    });
  }

  const income = await readSheetValues(spreadsheetId, 'Income!A1:A1');
  if (income.length === 0) {
    valueRanges.push({
      range: 'Income!A1:G1',
      values: [['id', 'date', 'amount', 'incomeMode', 'isFriendTransfer', 'friendName', 'description']]
    });
  }

  const transfers = await readSheetValues(spreadsheetId, 'Transfers!A1:A1');
  if (transfers.length === 0) {
    valueRanges.push({
      range: 'Transfers!A1:H1',
      values: [['id', 'date', 'fromMode', 'toMode', 'amount', 'isFriendSettlement', 'friendName', 'description']]
    });
  }

  const settlements = await readSheetValues(spreadsheetId, 'Settlements!A1:A1');
  if (settlements.length === 0) {
    valueRanges.push({
      range: 'Settlements!A1:F1',
      values: [['id', 'date', 'friendName', 'amount', 'settledDate', 'type']]
    });
  }

  if (valueRanges.length > 0) {
    await batchUpdateSheetValues(spreadsheetId, valueRanges);
  }
};

/**
 * Generate export / download Excel URL
 */
export const getExcelExportUrl = (spreadsheetId) => {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;
};
