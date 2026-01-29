---
layout: default
title: Webhooks
parent: Integrations
nav_order: 3
---

# Webhooks
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Overview

Create webhooks to receive transaction data from external services. Perfect for automation with tools like n8n, Make, Zapier, or form services like Tally.so.

---

## Creating a Webhook

1. Go to **Settings** → **Webhooks**
2. Click **Add Webhook**
3. Configure:
   - **Name** - Descriptive name
   - **Type** - Tally.so or Generic
   - **Target Account** - Default account for transactions
   - **Target Category** - Default category
4. Click **Create**
5. Copy the generated webhook URL

---

## Webhook Types

### Tally.so Integration

For logging expenses directly from Tally forms:

1. Create a Tally form with fields for:
   - Amount
   - Description
   - Date (optional)
2. In Tally, set up a webhook integration
3. Paste your FinTrack webhook URL
4. Form submissions create transactions automatically

### Generic Webhook

Standard JSON payloads for n8n, Make, Zapier, etc.:

```json
{
  "amount": 50.00,
  "description": "Coffee",
  "date": "2026-01-29",
  "category": "Food & Drink",
  "account": "Checking"
}
```

| Field | Required | Description |
|:------|:---------|:------------|
| `amount` | Yes | Transaction amount |
| `description` | Yes | Transaction description |
| `date` | No | ISO date (defaults to now) |
| `category` | No | Category name (uses default) |
| `account` | No | Account name (uses default) |

---

## Webhook Logs

View all webhook activity:

1. Go to **Settings** → **Webhooks**
2. Click on a webhook
3. View log entries:
   - Timestamp
   - Payload received
   - Success/failure status
   - Created transaction ID

---

## Security

- Each webhook has a unique URL with a secret token
- URLs are not guessable
- Regenerate URL if compromised
- Consider IP allowlisting for production
