---
layout: default
title: First Steps
parent: Getting Started
nav_order: 3
---

# First Steps
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Create Your Account

1. Navigate to your FinTrack instance
2. Click **Sign Up** to create a new account
3. Enter your email and password
4. You'll be redirected to the dashboard

{: .note }
> If `DISABLE_SIGNUP=true` is set, contact your administrator for account creation.

---

## Set Up Your Accounts

### Add Manual Accounts

1. Go to **Settings** → **Accounts**
2. Click **Add Account**
3. Choose account type:
   - **Checking** - Day-to-day banking
   - **Savings** - Savings accounts
   - **Credit Card** - Credit cards (shown as liabilities)
   - **Investment** - Brokerage accounts
4. Enter account name and initial balance
5. Click **Save**

### Connect Bank Accounts (Optional)

If GoCardless is configured:

1. Go to **Settings** → **Accounts**
2. Click **Connect Bank**
3. Select your bank from the list
4. Complete the bank's authentication flow
5. Choose which accounts to sync
6. Transactions will appear in the **Staging Area** for review

---

## Create Categories

1. Go to **Settings** → **Categories**
2. Click **Add Category**
3. Set:
   - **Name** - Category name (e.g., "Groceries")
   - **Type** - Income, Expense, or Transfer
   - **Color** - For visual identification
   - **Budget** (optional) - Monthly budget target
4. Click **Save**

Default categories are created automatically, but you can customize them.

---

## Add Your First Transaction

1. From the **Dashboard**, click **Add Transaction**
2. Fill in:
   - **Amount** - Transaction amount
   - **Description** - What the transaction is for
   - **Category** - Select from your categories
   - **Account** - Which account
   - **Date** - Transaction date
   - **Tags** (optional) - Add tags for cross-category tracking
3. Click **Save**

---

## Next Steps

- [Explore the Dashboard](/Personal-Finance-Hub/features/dashboard)
- [Set up budgets](/Personal-Finance-Hub/features/budgeting)
- [Connect bank accounts](/Personal-Finance-Hub/integrations/bank-sync)
- [Import existing transactions](/Personal-Finance-Hub/integrations/csv-import)
