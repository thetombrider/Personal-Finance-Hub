---
layout: default
title: Docker Deployment
parent: Deployment
nav_order: 1
---

# Docker Deployment
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Quick Start

```bash
git clone https://github.com/thetombrider/Personal-Finance-Hub.git
cd Personal-Finance-Hub
docker-compose up --build -d
```

Access at [http://localhost:5001](http://localhost:5001)

---

## Docker Compose Setup

The included `docker-compose.yml` sets up:

- **app** - FinTrack application
- **mcp** - MCP server (optional)
- **db** - PostgreSQL database

### Configuration

Create a `stack.env` file:

```bash
# Database
POSTGRES_USER=fintrack
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=fintrack
DATABASE_URL=postgres://fintrack:your-secure-password@db:5432/fintrack

# Application
APP_SECRET=your-32-char-secret-minimum
NODE_ENV=production

# Optional integrations
GOCARDLESS_SECRET_ID=
GOCARDLESS_SECRET_KEY=
RESEND_API_KEY=
```

---

## Docker Images

Pre-built images available on Docker Hub:

| Image | Description |
|:------|:------------|
| `thetombrider/personal-finance:latest` | Main application |
| `thetombrider/personal-finance-mcp:latest` | MCP server |

---

## Volumes

Data persistence:

```yaml
volumes:
  personal_finance_postgres_data:
```

{: .warning }
> Back up this volume regularly to prevent data loss.

---

## Networking

The compose file creates:
- **internal_finance** - Communication between app and database
- **cloudflare_network** - (Optional) For Cloudflare Tunnel

---

## Updates

Using Watchtower for automatic updates:

```yaml
labels:
  - "com.centurylinklabs.watchtower.enable=true"
```

Or manually:

```bash
docker-compose pull
docker-compose up -d
```

---

## Reverse Proxy

Example nginx configuration:

```nginx
server {
    listen 443 ssl;
    server_name fintrack.example.com;
    
    location / {
        proxy_pass http://localhost:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
