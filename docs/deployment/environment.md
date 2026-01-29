---
layout: default
title: Environment Variables
parent: Deployment
nav_order: 2
---

# Environment Variables Reference
{: .no_toc }

Complete reference of all environment variables.

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Required

| Variable | Description |
|:---------|:------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `APP_SECRET` | Session secret (min 32 chars, generate with `openssl rand -hex 32`) |

---

## Authentication

| Variable | Default | Description |
|:---------|:--------|:------------|
| `DISABLE_SIGNUP` | `false` | Disable new user registration |
| `SSO_ONLY` | `false` | Force OIDC login only |
| `DISABLE_SSO` | `false` | Disable OIDC even if configured |

---

## OIDC Configuration

| Variable | Description |
|:---------|:------------|
| `OIDC_ISSUER_URL` | OIDC provider issuer URL |
| `OIDC_CLIENT_ID` | Application client ID |
| `OIDC_CLIENT_SECRET` | Application client secret |
| `OIDC_CALLBACK_URL` | OAuth callback URL |

---

## Integrations

| Variable | Description |
|:---------|:------------|
| `GOCARDLESS_SECRET_ID` | GoCardless API Secret ID |
| `GOCARDLESS_SECRET_KEY` | GoCardless API Secret Key |
| `RESEND_API_KEY` | Resend API key for emails |

---

## Application

| Variable | Default | Description |
|:---------|:--------|:------------|
| `NODE_ENV` | `development` | `development` or `production` |
| `PORT` | `5000` | Server port |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |

---

## Database (Docker Compose)

| Variable | Description |
|:---------|:------------|
| `POSTGRES_USER` | PostgreSQL username |
| `POSTGRES_PASSWORD` | PostgreSQL password |
| `POSTGRES_DB` | Database name |
