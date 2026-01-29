---
layout: default
title: Accounts
parent: Features
nav_order: 2
---

# Account Management
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Account Types

FinTrack supports multiple account types:

| Type | Description | Balance Treatment |
|:-----|:------------|:------------------|
| **Checking** | Day-to-day bank accounts | Asset (+) |
| **Savings** | Savings and money market | Asset (+) |
| **Credit Card** | Credit cards | Liability (−) |
| **Investment** | Brokerage accounts | Asset (+) |

---

## Managing Accounts

### Add an Account

1. Navigate to **Settings** → **Accounts**
2. Click **Add Account**
3. Fill in account details:
   - Name
   - Type
   - Initial balance
   - Currency
4. Click **Save**

### Edit an Account

1. Find the account in the list
2. Click the **Edit** icon
3. Modify details
4. Click **Save**

### Delete an Account

{: .warning }
> Deleting an account will affect associated transactions. Consider archiving instead.

1. Click the **Delete** icon on the account
2. Confirm deletion

---

## Bank Connection Status

For connected bank accounts:

- **Last Sync** shows when transactions were last fetched
- Green indicator for recent sync
- Yellow/red for accounts needing attention
- Click **Sync** to manually refresh

---

## Account Filters

On the Transactions page, filter by:

- **Linked Accounts** - Bank-connected accounts
- **Manual Accounts** - Manually managed accounts
- Specific account selection

---

## Account Reports

Click any account name to drill down into:

- Transaction list for that account
- Monthly totals
- Balance history
