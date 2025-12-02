# FinTrack - Personal Finance Management Application

## Overview

FinTrack is a full-stack personal finance management application built with React, Express, and PostgreSQL. The application enables users to track their financial accounts, categorize transactions, manage budgets, and monitor investment portfolios. It features a modern UI built with shadcn/ui components and Tailwind CSS, with comprehensive data visualization for financial insights.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- **React 18** with TypeScript for type-safe component development
- **Vite** as the build tool and development server
- **Wouter** for client-side routing (lightweight React Router alternative)
- **TanStack Query (React Query)** for server state management and data fetching
- **React Hook Form** with Zod validation for form handling

**UI Framework:**
- **shadcn/ui** component library with Radix UI primitives
- **Tailwind CSS v4** for styling with custom design tokens
- **Recharts** for financial data visualization
- **Lucide React** for icons

**State Management:**
- Context API (`FinanceContext`) wraps the entire application to provide centralized access to accounts, categories, and transactions
- React Query handles all API calls with intelligent caching and background refetching
- Local component state for UI interactions

**Key Design Patterns:**
- Component composition with shared Layout and SettingsLayout wrappers
- Custom hooks for reusable logic (useIsMobile, useToast, useFinance)
- Form validation using Zod schemas that mirror backend validation

### Backend Architecture

**Technology Stack:**
- **Express.js** server with TypeScript
- **Drizzle ORM** for database operations
- **Neon Serverless PostgreSQL** as the database
- **Zod** for runtime validation

**API Design:**
- RESTful API structure with CRUD endpoints for each resource type
- Resources: Accounts, Categories, Transactions, Holdings, Trades
- Standard HTTP methods (GET, POST, PATCH, DELETE)
- JSON request/response format

**Data Layer:**
- Storage abstraction layer (`IStorage` interface in `server/storage.ts`) decouples business logic from database implementation
- Drizzle ORM provides type-safe database queries with automatic TypeScript inference
- Database schema defined in `shared/schema.ts` and shared between client and server

**Key Design Decisions:**
- Shared type definitions between frontend and backend prevent type mismatches
- Schema validation using Drizzle-Zod creates Zod schemas directly from database schema
- Storage interface allows easy swapping of database implementations

### Database Schema

**Core Tables:**

1. **accounts** - Financial account tracking
   - Fields: name, type (checking/savings/credit/investment/cash), startingBalance, currency, color
   - Cascading deletes remove related transactions when account is deleted

2. **categories** - Transaction categorization
   - Fields: name, type (income/expense), color, icon
   - Prevents deletion if transactions exist (restrict)

3. **transactions** - Financial transaction records
   - Fields: date, amount, description, accountId, categoryId, type
   - Foreign keys to accounts and categories

4. **holdings** - Investment portfolio positions
   - Fields: ticker, name, assetType, currency
   - Tracks individual securities

5. **trades** - Investment transaction history
   - Fields: holdingId, type (buy/sell), quantity, pricePerUnit, fees, date
   - Links to holdings table

**Relationships:**
- Transactions reference accounts (cascade delete) and categories (restrict delete)
- Trades reference holdings for portfolio tracking
- Transfer category identified by name for special handling

### External Dependencies

**Database:**
- **Neon Serverless PostgreSQL** - Cloud-native PostgreSQL with automatic scaling
- Connection via `@neondatabase/serverless` package
- WebSocket support for serverless environments
- DATABASE_URL environment variable required

**Development Tools:**
- **Replit Integration** - Custom Vite plugins for Replit development environment
  - `@replit/vite-plugin-runtime-error-modal` - Error overlay
  - `@replit/vite-plugin-cartographer` - Code navigation
  - `@replit/vite-plugin-dev-banner` - Development mode indicator
  - Custom `vite-plugin-meta-images` - OpenGraph image URL updates

**Data Import:**
- **PapaParse** - CSV parsing for transaction imports
- Supports flexible column mapping and dual-amount column configurations
- Handles various CSV formats with custom date parsing

**Third-Party APIs:**
- Stock market data integration (portfolio feature)
- Quote fetching and portfolio valuation
- Search functionality for securities

**Build Process:**
- Client build via Vite produces static assets in `dist/public`
- Server build via esbuild bundles Node.js code to `dist/index.cjs`
- Selective bundling of dependencies to optimize cold start times
- Database migrations managed by Drizzle Kit