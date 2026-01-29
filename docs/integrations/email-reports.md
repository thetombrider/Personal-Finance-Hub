---
layout: default
title: Email Reports
parent: Integrations
nav_order: 4
---

# Email Reports
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Overview

Receive automated weekly email summaries with financial insights and market data.

---

## Prerequisites

1. **Resend Account** - Sign up at [resend.com](https://resend.com)
2. **API Key** - Create an API key in Resend dashboard
3. **Environment Variable**:
   ```bash
   RESEND_API_KEY=re_xxxxx
   ```

---

## Email Content

Weekly reports include:

### Financial Summary
- Net worth change this week
- Total spending by category
- Income received

### Account Balances
- Current balance for each account
- Change from previous week

### Market Data
- Portfolio value and change
- Top movers in your holdings

### Alerts
- Overdue recurring transactions
- Budget warnings

---

## Configuration

1. Go to **Settings** → **Email Reports**
2. Toggle email reports on
3. Verify your email address
4. Select delivery day and time
5. Save settings

---

## Troubleshooting

| Issue | Solution |
|:------|:---------|
| Not receiving emails | Check spam, verify `RESEND_API_KEY` |
| Wrong email | Update in Settings |
| Want to unsubscribe | Toggle off in Settings |
