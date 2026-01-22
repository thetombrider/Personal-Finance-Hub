# FinTrack - Personal Finance Hub

FinTrack is a comprehensive personal finance management application designed to help you track your accounts, transactions, budgets, and investments in one place. Built with a modern tech stack, it offers a clean interface and powerful insights into your financial health.

## Features

### Core Functionality
- **📊 Dashboard**: Get a high-level overview of your net worth, recent activity, and financial trends with an enhanced Sankey chart visualization showing income and expense flows.
  - **Quick Actions**: Fast access to create new transactions, transfers, portfolio trades, and review pending staged transactions with real-time badge counts.
  - **Recurring Transaction Alerts**: Visual indicators and detailed modal for missing recurring transactions, showing days overdue and expected amounts.
- **💰 Account Management**: Track various types of accounts including Checking, Savings, Credit Cards, and Investments.
  - **Last Sync Tracking**: See when each connected bank account was last synchronized.
  - **Detailed Reports**: Click on account names or monthly values to drill down into specific transactions.
- **📝 Transactions**: Record income and expenses, categorize them, and import transactions via CSV.
  - **Bulk Editing**: Select multiple transactions and edit category, account, date, and tags simultaneously.
  - **Tag Management**: Organize transactions with flexible, colored tags for cross-category tracking (e.g., "Vacation", "Tax Deductible").
  - **Advanced Filtering**: Filter by categories, accounts, date ranges, tags, and "Not Bank Reconciled" status with URL-based state persistence.
  - **Pagination & Sorting**: Navigate large transaction lists with 50 rows per page, sticky headers, and column sorting.
  - **Staging Area**: Bulk accept/dismiss actions and manual reconciliation for staged transactions.

### Budgeting & Planning
- **📉 Budgeting**: Advanced budgeting system with semester views, baseline (expected) monthly budgets, and tracking of recurring and planned expenses.
  - **Recurring Transaction Monitoring**: Automatic detection and alerts for missing recurring expenses.
  - **Visual Indicators**: Clear alerts on the dashboard when recurring transactions are overdue.

### Portfolio Management
- **📈 Portfolio**: Manage your stock holdings, track performance, and view detailed metrics.
  - **Market Data Integration**: Real-time stock quotes via Yahoo Finance integration.
  - **Trade History**: Comprehensive tracking of all portfolio trades with pagination support.

### Reports & Analytics
- **📊 Reports**: Access detailed reports with granular breakdowns and interactive drilldowns.
  - **Net Worth History**: Dedicated report tracking net worth assets, liabilities, and evolution over time with charts and historical data tables.
  - **Monthly Report**: Unified view for drilling down into Accounts, Categories, or Tags by month.
  - **Income Statement**: Monthly income and expense tracking with drilldown capabilities.
  - **Balance Sheet**: Track assets, liabilities, and net worth over time.
  - **Drilldowns**: Interactive click-throughs on reports to view underlying transaction details.

### Customization & Settings
- **⚙️ Settings**: Comprehensive customization options for your financial hub.
  - **Category Management**: Create and manage income, expense, and transfer categories with monthly budget targets and color coding.
  - **Font Customization**: Choose from multiple fonts applied globally across the application.
  - **User Profile**: Update personal information and preferences.
  - **Webhook Management**: Create, manage, and view logs for all integrations.

### Security & Authentication
- **🔐 Authentication**: Secure login with support for OIDC providers and local authentication.
  - **Transaction Ownership**: Automatic verification ensures users can only access and modify their own transactions.
  - **Session Management**: Secure session handling with cryptographically signed cookies.

### Integrations
- **🏦 Bank Sync**: Connect to 2,000+ banks (including PayPal) via GoCardless to automatically sync transactions and balances to a Staging Area for review.
  - **Sync Status Tracking**: See the last synchronization timestamp for each connected account.
- **📥 Smart Import**: Advanced CSV importer for Transactions, Trades, and Holdings with automated column mapping.
- **📧 Weekly Reports**: Automated email summaries with financial insights and market data sent via Resend.
- **🔗 Webhooks & Integrations**: 
  - **Tally.so Integration**: Log expenses directly from Tally forms.
  - **Generic Webhooks**: Receive standard JSON payloads from services like n8n, Make, or Zapier.
  - **Management UI**: Create, manage, and view logs for all your webhooks directly in the settings.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts.
- **Backend**: Express.js, Node.js, Passport.js, GoCardless (Nordigen), Resend.
- **Database**: PostgreSQL, Drizzle ORM.
- **Architecture**: RESTful API with React Query for state management.

## Prerequisites

- **Docker** and **Docker Compose** (Recommended for easiest setup)
- **Node.js** v20+ (For local development)
- **PostgreSQL** (For local development)

## Configuration

The application requires certain environment variables to be set. You can define these in a `.env` file in the root directory or pass them to the Docker container.

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Connection string for PostgreSQL (e.g., `postgres://user:pass@host:5432/db`) |
| `DISABLE_SIGNUP` | Set to `true` to disable new user registrations |
| `SSO_ONLY` | Set to `true` to disable local user registration and login|
| `DISABLE_SSO` | Set to `true` to disable OIDC/SSO functionality even if configured |
| `OIDC_ISSUER_URL` | (Optional) OIDC Issuer URL |
| `OIDC_CLIENT_ID` | (Optional) OIDC Client ID |
| `OIDC_CLIENT_SECRET` | (Optional) OIDC Client Secret |
| `OIDC_CALLBACK_URL` | (Optional) OIDC Callback URL |
| `NODE_ENV` | Environment mode (`development` or `production`) |
| `GOCARDLESS_SECRET_ID` | GoCardless Secret ID |
| `GOCARDLESS_SECRET_KEY` | GoCardless Secret Key |
| `RESEND_API_KEY` | Resend API Key |
| `APP_SECRET` | **Required**. Cryptographically secure secret for session management. Generate using `openssl rand -hex 32` or similar. Must be at least 32 characters. Never commit this to version control. Changing this value invalidates all existing user sessions. |
## Installation

### Method 1: Docker (Recommended)

This method sets up both the application and a local PostgreSQL database automatically.

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Personal-Finance-Hub
   ```

2. **Start the application:**
   ```bash
   docker-compose up --build -d
   ```

3. **Access the application:**
   Open your browser and navigate to [http://localhost:5001](http://localhost:5001).

### Method 2: Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment:**
   Create a `.env` file in the root directory with the necessary variables (see Configuration section).

3. **Database Setup:**
   Ensure your PostgreSQL server is running and the database exists. Then push the schema:
   ```bash
   npm run db:push
   ```

4. **Start Development Server:**
   ```bash
   npm run dev
   ```
   The client will typically run on port `5000` (proxying requests to the server).

## Scripts

- `npm run dev`: Start the development server (client + server).
- `npm run build`: Build the application for production.
- `npm run start`: Start the production server.
- `npm run db:push`: Push schema changes to the database.
- `npm run check`: Run TypeScript type checking.
