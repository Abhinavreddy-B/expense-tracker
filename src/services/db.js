import {
  findSpreadsheetByName,
  createSpreadsheet,
  readSheetValues,
  writeSheetValues,
  appendSheetRow,
  initializeConfigSpreadsheet,
  initializeExpenseSpreadsheet
} from './googleSheets';

// Default Configurations
const DEFAULT_CATEGORIES = [
  { category: 'Food', subcategory: 'Restaurants' },
  { category: 'Food', subcategory: 'Groceries' },
  { category: 'Food', subcategory: 'Delivery' },
  { category: 'Food', subcategory: 'Snacks/Drinks' },
  { category: 'Transport', subcategory: 'Fuel/Petrol' },
  { category: 'Transport', subcategory: 'Cab/Auto (Uber/Ola)' },
  { category: 'Transport', subcategory: 'Public Transport' },
  { category: 'Shopping', subcategory: 'Clothing' },
  { category: 'Shopping', subcategory: 'Electronics' },
  { category: 'Shopping', subcategory: 'Gifts' },
  { category: 'Entertainment', subcategory: 'Movies/Events' },
  { category: 'Entertainment', subcategory: 'Subscriptions (Netflix etc)' },
  { category: 'Bills & Utilities', subcategory: 'Rent' },
  { category: 'Bills & Utilities', subcategory: 'Electricity' },
  { category: 'Bills & Utilities', subcategory: 'Internet' },
  { category: 'Bills & Utilities', subcategory: 'Mobile Recharge' },
  { category: 'Health', subcategory: 'Medicines' },
  { category: 'Health', subcategory: 'Doctor/Dentist' },
  { category: 'Others', subcategory: 'Miscellaneous' },
  { category: 'Others', subcategory: 'Investment' }
];

const DEFAULT_PAYMENT_MODES = [
  { name: 'Cash', type: 'Cash' },
  { name: 'GPay/UPI', type: 'Bank Account' },
  { name: 'PhonePe/UPI', type: 'Bank Account' },
  { name: 'HDFC Credit Card', type: 'Credit Card' },
  { name: 'SBI Bank Account', type: 'Bank Account' }
];

const DEFAULT_INCOME_MODES = [
  'Salary',
  'Freelance',
  'Cashback/Refund',
  'Gift/Allowance',
  'Friend Transfer'
];

const DEFAULT_FRIENDS = [
  'Aarav',
  'Diya',
  'Kabir',
  'Ananya',
  'Rohan'
];

// Local Storage Keys
const CONFIG_KEY = 'finflow_config';
const TRANSACTIONS_PREFIX = 'finflow_txs_';
const SPREADSHEET_IDS_KEY = 'finflow_spreadsheet_ids';

/**
 * Helper to get active month string (YYYY-MM)
 */
export const getActiveMonthStr = (date = new Date()) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${yyyy}_${mm}`;
};

/**
 * Get/Set Google Spreadsheet IDs from local storage
 */
export const getSpreadsheetIds = () => {
  const data = localStorage.getItem(SPREADSHEET_IDS_KEY);
  return data ? JSON.parse(data) : {};
};

export const saveSpreadsheetId = (name, id) => {
  const ids = getSpreadsheetIds();
  ids[name] = id;
  localStorage.setItem(SPREADSHEET_IDS_KEY, JSON.stringify(ids));
};

/**
 * Load Config (Local Storage fallback)
 */
export const loadConfig = () => {
  const stored = localStorage.getItem(CONFIG_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Error parsing stored config, using defaults');
    }
  }

  const defaultConfig = {
    categories: DEFAULT_CATEGORIES,
    paymentModes: DEFAULT_PAYMENT_MODES,
    incomeModes: DEFAULT_INCOME_MODES,
    friends: DEFAULT_FRIENDS
  };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(defaultConfig));
  return defaultConfig;
};

/**
 * Save Config locally
 */
export const saveConfigLocally = (config) => {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
};

/**
 * Load monthly transactions from Local Storage
 */
export const loadMonthlyTransactionsLocally = (monthStr) => {
  const key = `${TRANSACTIONS_PREFIX}${monthStr}`;
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Error parsing monthly transactions');
    }
  }
  return {
    expenses: [],
    income: [],
    transfers: [],
    settlements: []
  };
};

/**
 * Save monthly transactions to Local Storage
 */
export const saveMonthlyTransactionsLocally = (monthStr, data) => {
  const key = `${TRANSACTIONS_PREFIX}${monthStr}`;
  localStorage.setItem(key, JSON.stringify(data));
};

/**
 * ==========================================
 * Google Sheets API Integration / Syncing
 * ==========================================
 */

/**
 * Sync Config from/to Google Drive.
 * 1. Finds or creates ExpenseTracker_Config.
 * 2. Pulls remote configs and merges or writes local configs.
 */
export const syncConfigWithGoogle = async (forcePush = false) => {
  const fileName = 'ExpenseTracker_Config';
  let spreadsheetId = getSpreadsheetIds()[fileName];

  if (!spreadsheetId) {
    const file = await findSpreadsheetByName(fileName);
    if (file) {
      spreadsheetId = file.id;
      saveSpreadsheetId(fileName, spreadsheetId);
    }
  }

  if (!spreadsheetId) {
    // Create new
    console.log('Config spreadsheet not found on Drive. Creating...');
    const file = await createSpreadsheet(fileName);
    spreadsheetId = file.id;
    saveSpreadsheetId(fileName, spreadsheetId);
    await initializeConfigSpreadsheet(spreadsheetId);
    
    // Push local config to Drive immediately since it's new
    const localConfig = loadConfig();
    await pushConfigToGoogle(spreadsheetId, localConfig);
    return localConfig;
  } else {
    // Initialize tabs if they aren't fully configured
    await initializeConfigSpreadsheet(spreadsheetId);
  }

  if (forcePush) {
    const localConfig = loadConfig();
    await pushConfigToGoogle(spreadsheetId, localConfig);
    return localConfig;
  }

  // Otherwise, pull from Google Drive
  try {
    const categoriesRaw = await readSheetValues(spreadsheetId, 'Categories!A2:B100');
    const paymentModesRaw = await readSheetValues(spreadsheetId, 'PaymentModes!A2:B100');
    const friendsRaw = await readSheetValues(spreadsheetId, 'Friends!A2:A100');
    const incomeModesRaw = await readSheetValues(spreadsheetId, 'IncomeModes!A2:A100');

    const config = {
      categories: categoriesRaw.map(r => ({ category: r[0], subcategory: r[1] })).filter(c => c.category),
      paymentModes: paymentModesRaw.map(r => ({ name: r[0], type: r[1] })).filter(p => p.name),
      friends: friendsRaw.map(r => r[0]).filter(Boolean),
      incomeModes: incomeModesRaw.map(r => r[0]).filter(Boolean)
    };

    // If Google Sheet is empty, push default/local config
    if (config.categories.length === 0 && config.paymentModes.length === 0 && config.friends.length === 0) {
      const localConfig = loadConfig();
      await pushConfigToGoogle(spreadsheetId, localConfig);
      return localConfig;
    }

    saveConfigLocally(config);
    return config;
  } catch (err) {
    console.error('Error pulling config from Google Sheet, falling back to local:', err);
    return loadConfig();
  }
};

/**
 * Write config to Google Sheet
 */
const pushConfigToGoogle = async (spreadsheetId, config) => {
  const categoryVals = [['Category', 'Subcategory'], ...config.categories.map(c => [c.category, c.subcategory])];
  const paymentVals = [['Name', 'Type'], ...config.paymentModes.map(p => [p.name, p.type])];
  const friendVals = [['Name'], ...config.friends.map(f => [f])];
  const incomeVals = [['Name'], ...config.incomeModes.map(i => [i])];

  // We write the headers and values together, overwriting the sheet
  // (We use large ranges to clear any existing rows that might exceed the new size)
  // Let's first overwrite the sheet. To clear, we can write empty strings or just overwrite.
  // Sheets API allows PUT with a range.
  await writeSheetValues(spreadsheetId, 'Categories!A1:B100', padArray(categoryVals, 100, ['', '']));
  await writeSheetValues(spreadsheetId, 'PaymentModes!A1:B100', padArray(paymentVals, 100, ['', '']));
  await writeSheetValues(spreadsheetId, 'Friends!A1:A100', padArray(friendVals, 100, ['']));
  await writeSheetValues(spreadsheetId, 'IncomeModes!A1:A100', padArray(incomeVals, 100, ['']));
};

// Pad array with empty values to overwrite any older, longer data
const padArray = (arr, targetLen, emptyVal) => {
  const res = [...arr];
  while (res.length < targetLen) {
    res.push(emptyVal);
  }
  return res;
};

/**
 * Sync active month transactions with Google Sheets.
 * Pulls all transactions for the month, merges by unique ID, saves locally and pushes back if there are new ones.
 */
export const syncTransactionsWithGoogle = async (monthStr, forcePush = false) => {
  const fileName = `ExpenseTracker_Expenses_${monthStr}`;
  let spreadsheetId = getSpreadsheetIds()[fileName];

  if (!spreadsheetId) {
    const file = await findSpreadsheetByName(fileName);
    if (file) {
      spreadsheetId = file.id;
      saveSpreadsheetId(fileName, spreadsheetId);
    }
  }

  if (!spreadsheetId) {
    console.log(`Monthly spreadsheet ${fileName} not found. Creating...`);
    const file = await createSpreadsheet(fileName);
    spreadsheetId = file.id;
    saveSpreadsheetId(fileName, spreadsheetId);
    await initializeExpenseSpreadsheet(spreadsheetId);
    
    // Push local monthly data to the new sheet
    const localData = loadMonthlyTransactionsLocally(monthStr);
    await pushTransactionsToGoogle(spreadsheetId, localData);
    return localData;
  } else {
    await initializeExpenseSpreadsheet(spreadsheetId);
  }

  if (forcePush) {
    const localData = loadMonthlyTransactionsLocally(monthStr);
    await pushTransactionsToGoogle(spreadsheetId, localData);
    return localData;
  }

  try {
    // Pull from Sheets
    const expRaw = await readSheetValues(spreadsheetId, 'Expenses!A2:M1000');
    const incRaw = await readSheetValues(spreadsheetId, 'Income!A2:G1000');
    const trfRaw = await readSheetValues(spreadsheetId, 'Transfers!A2:H1000');
    const setRaw = await readSheetValues(spreadsheetId, 'Settlements!A2:F1000');

    // Parse values
    const expenses = expRaw.map(r => ({
      id: r[0],
      date: r[1],
      amount: parseFloat(r[2] || 0),
      category: r[3],
      subcategory: r[4],
      paymentMode: r[5],
      friendPaidMode: r[6] === 'true',
      isFriendSplit: r[7] === 'true',
      splitType: r[8],
      splitPaidBy: r[9],
      splitShare: parseFloat(r[10] || 0),
      splitDetails: r[11] ? JSON.parse(r[11]) : {},
      description: r[12] || ''
    })).filter(e => e.id);

    const income = incRaw.map(r => ({
      id: r[0],
      date: r[1],
      amount: parseFloat(r[2] || 0),
      incomeMode: r[3],
      isFriendTransfer: r[4] === 'true',
      friendName: r[5] || '',
      description: r[6] || ''
    })).filter(i => i.id);

    const transfers = trfRaw.map(r => ({
      id: r[0],
      date: r[1],
      fromMode: r[2],
      toMode: r[3],
      amount: parseFloat(r[4] || 0),
      isFriendSettlement: r[5] === 'true',
      friendName: r[6] || '',
      description: r[7] || ''
    })).filter(t => t.id);

    const settlements = setRaw.map(r => ({
      id: r[0],
      date: r[1],
      friendName: r[2],
      amount: parseFloat(r[3] || 0),
      settledDate: r[4],
      type: r[5] || 'SettleUp'
    })).filter(s => s.id);

    const remoteData = { expenses, income, transfers, settlements };
    const localData = loadMonthlyTransactionsLocally(monthStr);

    // Merge logic: Combine local and remote by unique ID. If ID matches, prefer local because it might be edited
    // or just union them. Let's do a basic union where we prefer remote if it's there, but keep any local rows that haven't synced.
    const mergeLists = (local, remote) => {
      const mergedMap = new Map();
      remote.forEach(item => mergedMap.set(item.id, item));
      local.forEach(item => {
        // If local exists, it might be newer or edited. But for simple transaction logging, we merge them.
        mergedMap.set(item.id, item);
      });
      return Array.from(mergedMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
    };

    const mergedData = {
      expenses: mergeLists(localData.expenses, remoteData.expenses),
      income: mergeLists(localData.income, remoteData.income),
      transfers: mergeLists(localData.transfers, remoteData.transfers),
      settlements: mergeLists(localData.settlements, remoteData.settlements)
    };

    saveMonthlyTransactionsLocally(monthStr, mergedData);
    
    // Now push the merged state back to Google Sheets to make sure they are in sync
    await pushTransactionsToGoogle(spreadsheetId, mergedData);
    return mergedData;
  } catch (err) {
    console.error('Error pulling monthly transactions, using local fallback:', err);
    return loadMonthlyTransactionsLocally(monthStr);
  }
};

/**
 * Save all transactions for the month to Google Sheets
 */
export const pushTransactionsToGoogle = async (spreadsheetId, data) => {
  const expVals = [
    ['id', 'date', 'amount', 'category', 'subcategory', 'paymentMode', 'friendPaidMode', 'isFriendSplit', 'splitType', 'splitPaidBy', 'splitShare', 'splitDetails', 'description'],
    ...data.expenses.map(e => [
      e.id,
      e.date,
      e.amount,
      e.category,
      e.subcategory,
      e.paymentMode,
      e.friendPaidMode ? 'true' : 'false',
      e.isFriendSplit ? 'true' : 'false',
      e.splitType,
      e.splitPaidBy,
      e.splitShare,
      e.splitDetails ? JSON.stringify(e.splitDetails) : '{}',
      e.description || ''
    ])
  ];

  const incVals = [
    ['id', 'date', 'amount', 'incomeMode', 'isFriendTransfer', 'friendName', 'description'],
    ...data.income.map(i => [
      i.id,
      i.date,
      i.amount,
      i.incomeMode,
      i.isFriendTransfer ? 'true' : 'false',
      i.friendName || '',
      i.description || ''
    ])
  ];

  const trfVals = [
    ['id', 'date', 'fromMode', 'toMode', 'amount', 'isFriendSettlement', 'friendName', 'description'],
    ...data.transfers.map(t => [
      t.id,
      t.date,
      t.fromMode,
      t.toMode,
      t.amount,
      t.isFriendSettlement ? 'true' : 'false',
      t.friendName || '',
      t.description || ''
    ])
  ];

  const setVals = [
    ['id', 'date', 'friendName', 'amount', 'settledDate', 'type'],
    ...data.settlements.map(s => [
      s.id,
      s.date,
      s.friendName,
      s.amount,
      s.settledDate,
      s.type || 'SettleUp'
    ])
  ];

  // Overwrite sheets (using pads to clear old rows)
  await writeSheetValues(spreadsheetId, 'Expenses!A1:M1000', padArray(expVals, 1000, ['', '', '', '', '', '', '', '', '', '', '', '', '']));
  await writeSheetValues(spreadsheetId, 'Income!A1:G1000', padArray(incVals, 1000, ['', '', '', '', '', '', '']));
  await writeSheetValues(spreadsheetId, 'Transfers!A1:H1000', padArray(trfVals, 1000, ['', '', '', '', '', '', '', '']));
  await writeSheetValues(spreadsheetId, 'Settlements!A1:F1000', padArray(setVals, 1000, ['', '', '', '', '', '']));
};

/**
 * Save a single transaction (immediate write-through helper if synced)
 */
export const addExpenseTransaction = async (expense, monthStr, isGoogleConnected) => {
  const currentMonthData = loadMonthlyTransactionsLocally(monthStr);
  currentMonthData.expenses.push(expense);
  saveMonthlyTransactionsLocally(monthStr, currentMonthData);

  if (isGoogleConnected) {
    try {
      const fileName = `ExpenseTracker_Expenses_${monthStr}`;
      const spreadsheetId = getSpreadsheetIds()[fileName];
      if (spreadsheetId) {
        // Just append the row
        const row = [
          expense.id,
          expense.date,
          expense.amount,
          expense.category,
          expense.subcategory,
          expense.paymentMode,
          expense.friendPaidMode ? 'true' : 'false',
          expense.isFriendSplit ? 'true' : 'false',
          expense.splitType,
          expense.splitPaidBy,
          expense.splitShare,
          expense.splitDetails ? JSON.stringify(expense.splitDetails) : '{}',
          expense.description || ''
        ];
        await appendSheetRow(spreadsheetId, 'Expenses!A2', row);
      } else {
        await syncTransactionsWithGoogle(monthStr);
      }
    } catch (e) {
      console.error('Failed to append to Google Sheets, local copy is saved:', e);
    }
  }
};

export const addIncomeTransaction = async (income, monthStr, isGoogleConnected) => {
  const currentMonthData = loadMonthlyTransactionsLocally(monthStr);
  currentMonthData.income.push(income);
  saveMonthlyTransactionsLocally(monthStr, currentMonthData);

  if (isGoogleConnected) {
    try {
      const fileName = `ExpenseTracker_Expenses_${monthStr}`;
      const spreadsheetId = getSpreadsheetIds()[fileName];
      if (spreadsheetId) {
        const row = [
          income.id,
          income.date,
          income.amount,
          income.incomeMode,
          income.isFriendTransfer ? 'true' : 'false',
          income.friendName || '',
          income.description || ''
        ];
        await appendSheetRow(spreadsheetId, 'Income!A2', row);
      } else {
        await syncTransactionsWithGoogle(monthStr);
      }
    } catch (e) {
      console.error('Failed to append to Google Sheets:', e);
    }
  }
};

export const addTransferTransaction = async (transfer, monthStr, isGoogleConnected) => {
  const currentMonthData = loadMonthlyTransactionsLocally(monthStr);
  currentMonthData.transfers.push(transfer);
  saveMonthlyTransactionsLocally(monthStr, currentMonthData);

  if (isGoogleConnected) {
    try {
      const fileName = `ExpenseTracker_Expenses_${monthStr}`;
      const spreadsheetId = getSpreadsheetIds()[fileName];
      if (spreadsheetId) {
        const row = [
          transfer.id,
          transfer.date,
          transfer.fromMode,
          transfer.toMode,
          transfer.amount,
          transfer.isFriendSettlement ? 'true' : 'false',
          transfer.friendName || '',
          transfer.description || ''
        ];
        await appendSheetRow(spreadsheetId, 'Transfers!A2', row);
      } else {
        await syncTransactionsWithGoogle(monthStr);
      }
    } catch (e) {
      console.error('Failed to append to Google Sheets:', e);
    }
  }
};

export const addSettlementTransaction = async (settlement, monthStr, isGoogleConnected) => {
  const currentMonthData = loadMonthlyTransactionsLocally(monthStr);
  currentMonthData.settlements.push(settlement);
  saveMonthlyTransactionsLocally(monthStr, currentMonthData);

  if (isGoogleConnected) {
    try {
      const fileName = `ExpenseTracker_Expenses_${monthStr}`;
      const spreadsheetId = getSpreadsheetIds()[fileName];
      if (spreadsheetId) {
        const row = [
          settlement.id,
          settlement.date,
          settlement.friendName,
          settlement.amount,
          settlement.settledDate,
          settlement.type || 'SettleUp'
        ];
        await appendSheetRow(spreadsheetId, 'Settlements!A2', row);
      } else {
        await syncTransactionsWithGoogle(monthStr);
      }
    } catch (e) {
      console.error('Failed to append to Google Sheets:', e);
    }
  }
};

/**
 * ==========================================
 * CALCULATE BALANCES (OWE / OWED TO ME)
 * ==========================================
 * Calculates the running net balances for all friends.
 * positive = they owe me
 * negative = I owe them
 * 
 * Rules for calculations:
 * 1. Expenses:
 *    - Case 1: I paid, and split it.
 *      - Friend's share = value in splitDetails[friendName].
 *      - Friend owes me their share: Balance[friend] += splitDetails[friend]
 *    - Case 2: Friend paid, and split it.
 *      - My share = value in splitDetails['Me'] (or splitShare).
 *      - I owe friend my share: Balance[friend] -= MyShare
 *    - Case 3: Payment mode is "Friend Paid (Split)" (friendPaidMode is true)
 *      - Wait, if a payment mode is "Paid by Friend", it means a friend paid and we split it.
 *      - This is equivalent to Case 2.
 * 
 * 2. Income:
 *    - If income is a transfer from a friend (isFriendTransfer is true):
 *      - Friend transferred money to me (they are paying back or gifting).
 *      - If it is payback, it reduces what they owe me: Balance[friendName] -= amount
 * 
 * 3. Transfers:
 *    - If transfer is a settlement (isFriendSettlement is true):
 *      - I transferred money to friend (I paid them back to settle).
 *      - This reduces what I owe them (moves balance closer to 0 or positive): Balance[friendName] += amount
 * 
 * 4. Settlements:
 *    - If we mark a balance as settled, we insert a "ClearBalance" settlement.
 *      - A "ClearBalance" record means "As of this date/time, the net balance with friendName is set to 0".
 *      - To calculate this properly, we sort all transactions chronologically.
 *      - When we hit a "ClearBalance" record for a friend, we reset their accumulated balance to 0.
 *      - That is extremely clean and works dynamically!
 */
export const calculateFriendBalances = (monthData) => {
  const balances = {};
  const txHistory = []; // { date, type, friend, amount, desc, id }

  // 1. Gather all transactions
  monthData.expenses.forEach(e => {
    if (!e.isFriendSplit) return;
    
    const splitDetails = e.splitDetails || {};
    const paidBy = e.splitPaidBy || 'Me';

    if (paidBy === 'Me') {
      // I paid. Others owe me.
      Object.entries(splitDetails).forEach(([friendName, amt]) => {
        if (friendName === 'Me') return;
        txHistory.push({
          id: e.id,
          date: e.date,
          type: 'ExpenseSplit (I Paid)',
          friend: friendName,
          amount: parseFloat(amt), // Positive: they owe me
          desc: `Split for ${e.category} (${e.subcategory}): ${e.description || 'No description'}`
        });
      });
    } else {
      // Friend paid. I owe them my share.
      // My share is either e.splitShare or splitDetails['Me']
      const myShare = splitDetails['Me'] !== undefined ? parseFloat(splitDetails['Me']) : e.splitShare;
      txHistory.push({
        id: e.id,
        date: e.date,
        type: 'ExpenseSplit (Friend Paid)',
        friend: paidBy,
        amount: -myShare, // Negative: I owe them
        desc: `${paidBy} paid split for ${e.category} (${e.subcategory})`
      });
    }
  });

  monthData.income.forEach(i => {
    if (i.isFriendTransfer && i.friendName) {
      // Friend transferred money to me (payback).
      // Reduces what they owe me.
      txHistory.push({
        id: i.id,
        date: i.date,
        type: 'Friend Payback',
        friend: i.friendName,
        amount: -i.amount, // Reduces what they owe me
        desc: `Received transfer: ${i.description || 'No description'}`
      });
    }
  });

  monthData.transfers.forEach(t => {
    if (t.isFriendSettlement && t.friendName) {
      // I transferred money to friend (payback / settle).
      // Reduces what I owe them (moves balance up).
      txHistory.push({
        id: t.id,
        date: t.date,
        type: 'Settle Payment',
        friend: t.friendName,
        amount: t.amount, // Positive: reduces what I owe them
        desc: `Paid to ${t.friendName}: ${t.description || 'Settle up'}`
      });
    }
  });

  monthData.settlements.forEach(s => {
    txHistory.push({
      id: s.id,
      date: s.date,
      type: s.type || 'SettleUp',
      friend: s.friendName,
      amount: s.amount,
      desc: s.type === 'ClearBalance' ? 'Balance cleared manually' : 'Settle adjustment'
    });
  });

  // Sort chronological
  txHistory.sort((a, b) => new Date(a.date) - new Date(b.date));

  // 2. Play history to calculate running balances and filter by ClearBalance resets
  const runningBalances = {};
  const transactionsPerFriend = {};

  txHistory.forEach(tx => {
    const friend = tx.friend;
    if (!runningBalances[friend]) {
      runningBalances[friend] = 0;
      transactionsPerFriend[friend] = [];
    }

    if (tx.type === 'ClearBalance') {
      // Clear balance resets the balance to 0 up to this point
      runningBalances[friend] = 0;
      transactionsPerFriend[friend].push(tx);
    } else {
      runningBalances[friend] += tx.amount;
      transactionsPerFriend[friend].push(tx);
    }
  });

  return {
    netBalances: runningBalances,
    histories: transactionsPerFriend
  };
};
