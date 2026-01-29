---
layout: default
title: CSV Import
parent: Integrations
nav_order: 2
---

# CSV Import
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Overview

Import data from spreadsheets and other financial software using CSV files. FinTrack supports smart column mapping for:

- **Transactions** - Income and expenses
- **Trades** - Stock buy/sell orders
- **Holdings** - Current portfolio positions

---

## Importing Transactions

### Prepare Your CSV

Required columns:
- **Date** - Transaction date
- **Amount** - Transaction value
- **Description** - Transaction description

Optional columns:
- Category
- Account name
- Tags

### Import Process

1. Go to **Import** page
2. Select **Transactions** import type
3. Upload your CSV file
4. **Column Mapping**:
   - FinTrack auto-detects common column names
   - Manually adjust any incorrect mappings
   - Preview data before importing
5. Select target account
6. Click **Import**

---

## Importing Trades

### Prepare Your CSV

Required columns:
- **Date** - Trade date
- **Symbol** - Stock ticker
- **Shares** - Number of shares
- **Price** - Price per share
- **Type** - Buy or Sell

### Import Process

1. Go to **Import** page
2. Select **Trades** import type
3. Upload CSV and map columns
4. Select investment account
5. Review and import

---

## Importing Holdings

For importing current portfolio positions:

1. Go to **Import** page
2. Select **Holdings** import type
3. Upload CSV with Symbol, Shares, Average Cost
4. Map columns and import

---

## Tips

{: .note }
> Always backup your data before bulk imports.

- **Test with small file first** - Verify mapping works correctly
- **Check date formats** - Ensure dates parse correctly
- **Review duplicates** - FinTrack doesn't automatically deduplicate
- **UTF-8 encoding** - Save CSV with UTF-8 encoding for special characters
