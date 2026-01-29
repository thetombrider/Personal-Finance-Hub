---
layout: default
title: Configuration
parent: Getting Started
nav_order: 2
---

# Configuration
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Environment Variables

Configure FinTrack by setting these environment variables in your `.env` or `stack.env` file.

### Required Variables

| Variable | Description |
|:---------|:------------|
| `DATABASE_URL` | PostgreSQL connection string (e.g., `postgres://user:pass@host:5432/db`) |
| `APP_SECRET` | **Required.** Cryptographically secure secret for sessions. Generate with `openssl rand -hex 32`. Must be at least 32 characters. |

### Authentication

| Variable | Description |
|:---------|:------------|
| `DISABLE_SIGNUP` | Set to `true` to disable new user registrations |
| `SSO_ONLY` | Set to `true` to disable local login (OIDC only) |
| `DISABLE_SSO` | Set to `true` to disable OIDC even if configured |

### OIDC Configuration (Optional)

| Variable | Description |
|:---------|:------------|
| `OIDC_ISSUER_URL` | OIDC provider issuer URL |
| `OIDC_CLIENT_ID` | OIDC application client ID |
| `OIDC_CLIENT_SECRET` | OIDC application client secret |
| `OIDC_CALLBACK_URL` | Callback URL for OIDC flow |

### Integrations

| Variable | Description |
|:---------|:------------|
| `GOCARDLESS_SECRET_ID` | GoCardless API Secret ID for bank sync |
| `GOCARDLESS_SECRET_KEY` | GoCardless API Secret Key |
| `RESEND_API_KEY` | Resend API key for email reports |

### Application

| Variable | Description |
|:---------|:------------|
| `NODE_ENV` | Environment mode (`development` or `production`) |

---

## Example Configuration

```bash
# Database
DATABASE_URL=postgres://fintrack:password@localhost:5432/fintrack

# Security (generate your own!)
APP_SECRET=a1b2c3d4e5f6789012345678901234567890abcdef

# Authentication
DISABLE_SIGNUP=false
SSO_ONLY=false

# Integrations (optional)
GOCARDLESS_SECRET_ID=your-gocardless-id
GOCARDLESS_SECRET_KEY=your-gocardless-key
RESEND_API_KEY=re_xxxxx

# Environment
NODE_ENV=production
```

---

## Security Notes

{: .warning }
> Never commit `APP_SECRET` or API keys to version control. Use environment variables or secrets management.

- **APP_SECRET**: Changing this value invalidates all existing user sessions
- **OIDC secrets**: Keep client secrets confidential
- Use different secrets for development and production environments
