# FinTrack - Personal Finance Hub

FinTrack is a comprehensive personal finance management application designed to help you track your accounts, transactions, budgets, and investments in one place. Built with a modern tech stack, it offers a clean interface and powerful insights into your financial health.

## Features

- **📊 Dashboard**: Get a high-level overview of your net worth, recent activity, and financial trends.
- **💰 Account Management**: Track various types of accounts including Checking, Savings, Credit Cards, and Investments.
- **📝 Transactions**: Record income and expenses, categorize them, and import transactions via CSV.
- **📉 Budgeting**: Set monthly budgets for different categories and monitor your spending in real-time.
- **📈 Portfolio**: Manage your stock holdings, track performance, and view detailed metrics.
- **📊 Reports**: Access detailed weekly reports and financial insights.
- **⚙️ Settings**: Customize categories, manage application preferences, and update user profile.
- **🔐 Authentication**: Secure login with support for OIDC providers.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts.
- **Backend**: Express.js, Node.js, Passport.js.
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
| `ALPHA_VANTAGE_API_KEY` | API Key for stock market data (get one from Alpha Vantage) |
| `TALLY_WEBHOOK_SECRET` | (Optional) Secret for Tally webhook integration |
| `DISABLE_SIGNUP` | Set to `true` to disable new user registrations |
| `OIDC_ISSUER_URL` | (Optional) OIDC Issuer URL |
| `OIDC_CLIENT_ID` | (Optional) OIDC Client ID |
| `OIDC_CLIENT_SECRET` | (Optional) OIDC Client Secret |
| `OIDC_CALLBACK_URL` | (Optional) OIDC Callback URL |
| `NODE_ENV` | Environment mode (`development` or `production`) |

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
