---
layout: default
title: Bank Sync
parent: Integrations
nav_order: 1
---

# Bank Sync (GoCardless)
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Overview

Connect to over 2,000 banks (including PayPal) via GoCardless to automatically sync transactions and balances.

---

## Prerequisites

1. **GoCardless Account** - Sign up at [GoCardless Bank Account Data](https://gocardless.com/bank-account-data/)
2. **API Credentials** - Obtain your Secret ID and Secret Key
3. **Environment Variables**:
   ```bash
   GOCARDLESS_SECRET_ID=your-secret-id
   GOCARDLESS_SECRET_KEY=your-secret-key
   ```

---

## Connecting a Bank

1. Go to **Settings** → **Accounts**
2. Click **Connect Bank**
3. Search for your bank
4. Complete authentication:
   - You'll be redirected to your bank's login
   - Authorize FinTrack to access your data
   - Select which accounts to sync
5. Return to FinTrack

---

## How Sync Works

### Transaction Staging

Bank transactions don't immediately appear in your ledger:

1. Transactions are fetched from the bank
2. They appear in the **Staging Area**
3. Review each transaction:
   - **Accept** - Add to your transaction ledger
   - **Dismiss** - Ignore the transaction
4. Bulk actions available for efficiency

This prevents duplicate entries and gives you control over what enters your books.

### Sync Frequency

- Manual sync: Click **Sync** button on any linked account
- Last sync timestamp shown for each account

---

## Reconciliation

Match bank transactions with manually entered ones:

1. View staged transactions
2. FinTrack suggests potential matches
3. Accept matches or handle manually
4. Reconciled transactions are marked

---

## Troubleshooting

| Issue | Solution |
|:------|:---------|
| Bank not listed | GoCardless coverage varies by region |
| Auth fails | Clear cookies, try incognito mode |
| Stale data | Manually trigger sync |
| Token expired | Reconnect the bank account |
