# FinFlow — Google Drive Expense Tracker & Splitter

FinFlow is a serverless, zero-backend, client-side budgeting and expense-splitting web application. All data is stored securely in standard spreadsheet formats directly in the user's private Google Drive (no database or API keys are stored on third-party servers).

## Features

1. **Google Drive Integration**: Purely client-side OAuth 2.0 flow. Reads, creates, and writes directly to your private Google Sheets.
2. **Calculator Homepage**: Tactical numerical keypad to enter spent amounts, cascading category/subcategory selects, custom payment modes, and splitting functionality.
3. **PhonePe-Style Splits**: Supports equal and unequal splits, select-among-friends lists, and payer definitions (Me Paid vs. Friend Paid).
4. **Income Ledger**: Track incoming money, income sources, and tag payback transfers from friends.
5. **Account Transfers & Settle Payments**: Log wallet/account transfers or record settlement transactions with friends.
6. **Chronological Settlement Solver**: Dynamic owe/owed balance tracker with accordion ledger histories and a "Mark as Settled" action that clears balances via a ledger reset without logging fake expense entries.
7. **Premium Responsive UI**: Beautiful Material UI design featuring light/dark theme support, full sidebar navigation on desktop, and a bottom navigation tab bar on mobile.
8. **Configuration Management**: Edit categories, payment accounts, friends, and income modes directly in the app. Updates are synced to a global `ExpenseTracker_Config` sheet.
9. **Export & Email Reports**: Manual trigger that compiles a comprehensive monthly financial report, copies it to the clipboard, exports download links to Excel files directly from Google Drive, and opens a pre-filled `mailto:` link in your default email client.

---

## Technical Architecture

- **Frontend**: React + Vite + Material UI (MUI) v6
- **Database**: Local Storage (Offline cache & Local Demo Mode) + Google Sheets API (v4) & Google Drive API (v3) REST integration
- **Visuals**: Recharts (Pie Chart, Line Trend, and Comparative Bar Charts)
- **Design Typography**: Plus Jakarta Sans & Outfit (Google Fonts)

### Spreadsheet Structure

1. **Config Spreadsheet (`ExpenseTracker_Config`)**:
   - `Categories`: `[Category, Subcategory]`
   - `PaymentModes`: `[Name, Type]`
   - `Friends`: `[Name]`
   - `IncomeModes`: `[Name]`

2. **Monthly Spreadsheet (`ExpenseTracker_Expenses_YYYY_MM`)**:
   - `Expenses`: `[id, date, amount, category, subcategory, paymentMode, friendPaidMode, isFriendSplit, splitType, splitPaidBy, splitShare, splitDetails, description]`
   - `Income`: `[id, date, amount, incomeMode, isFriendTransfer, friendName, description]`
   - `Transfers`: `[id, date, fromMode, toMode, amount, isFriendSettlement, friendName, description]`
   - `Settlements`: `[id, date, friendName, amount, settledDate, type]` (Uses `ClearBalance` to reset friend ledgers chronologically)

---

## Step-by-Step Google OAuth Credentials Setup

Because FinFlow is serverless, you need to create your own Google OAuth client credentials to authenticate your Google Drive access:

1. Visit the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g., `FinFlow Expense Tracker`).
3. Search for and enable the **Google Sheets API** and **Google Drive API** in your project.
4. Go to the **OAuth consent screen** tab:
   - Select **External** user type.
   - Enter basic App details (e.g. app name, developer contact).
   - Under Scopes, add:
     - `https://www.googleapis.com/auth/spreadsheets` (to view/edit sheets)
     - `https://www.googleapis.com/auth/drive.file` (to read/write files created by the app)
   - In **Test users**, add your own Google Account email (critical while the app is in Testing mode).
5. Go to the **Credentials** tab:
   - Click **+ Create Credentials** &gt; Select **OAuth client ID**.
   - Set Application Type to **Web application**.
   - Under **Authorized JavaScript origins**, add:
     - `http://localhost:5173` (Vite's default address)
     - Add your custom host URL if you deploy the app.
6. Click **Create** and copy the generated **Client ID**.
7. Open FinFlow, navigate to **Settings**, paste your Client ID, and click **Connect Drive**.

---

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Build the production application bundle:
   ```bash
   npm run build
   ```

4. Run the production preview:
   ```bash
   npm run preview
   ```
