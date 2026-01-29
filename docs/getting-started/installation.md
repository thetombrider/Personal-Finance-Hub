---
layout: default
title: Installation
parent: Getting Started
nav_order: 1
---

# Installation
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Prerequisites

- **Docker** and **Docker Compose** (recommended)
- **Node.js** v20+ (for local development)
- **PostgreSQL** (for local development)

---

## Method 1: Docker (Recommended)

This method sets up both the application and a local PostgreSQL database automatically.

### 1. Clone the repository

```bash
git clone https://github.com/thetombrider/Personal-Finance-Hub.git
cd Personal-Finance-Hub
```

### 2. Configure environment

Create a `stack.env` file with your configuration (see [Configuration](/Personal-Finance-Hub/getting-started/configuration)):

```bash
DATABASE_URL=postgres://user:password@db:5432/fintrack
APP_SECRET=your-32-char-secret-here
# Add other variables as needed
```

### 3. Start the application

```bash
docker-compose up --build -d
```

### 4. Access FinTrack

Open your browser and navigate to [http://localhost:5001](http://localhost:5001).

---

## Method 2: Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create a `.env` file in the root directory:

```bash
DATABASE_URL=postgres://user:password@localhost:5432/fintrack
APP_SECRET=your-32-char-secret-here
NODE_ENV=development
```

### 3. Database setup

Ensure PostgreSQL is running, then push the schema:

```bash
npm run db:push
```

### 4. Start development server

```bash
npm run dev
```

The application will be available at [http://localhost:5000](http://localhost:5000).

---

## Available Scripts

| Command | Description |
|:--------|:------------|
| `npm run dev` | Start development server (client + server) |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run db:push` | Push schema changes to database |
| `npm run check` | Run TypeScript type checking |

---

## Next Steps

- [Configure environment variables](/Personal-Finance-Hub/getting-started/configuration)
- [Complete first-time setup](/Personal-Finance-Hub/getting-started/first-steps)
