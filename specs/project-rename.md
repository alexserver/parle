# Project Rename Plan: transcriber → parle

This document outlines the complete plan to rename the project from "transcriber" to "parle", including database migration steps.

## Overview

The project folder has been renamed from `transcriber` to `parle`. This plan covers updating all references in code, documentation, configuration files, and migrating the PostgreSQL database.

## Database Setup Steps

Since the database has been manually dropped, we need to:

### 1. Update Configuration Files First
Update all connection strings and configuration to use `parle` instead of `transcriber`.

### 2. Restart Docker Container with New Database Name
```bash
# Stop current container
docker compose down

# Start with updated configuration (after updating docker-compose.yml)
docker compose up -d
```

### 3. Initialize New Database Schema
```bash
# Navigate to API directory
cd apps/api

# Generate Prisma client
bun run db:generate

# Create database schema and tables
bun run db:push
```

This will create the new `parle` database and set up all tables according to the Prisma schema.

## File Updates Required

### 1. Documentation Files

**README.md**
- Line 24: Change `transcriber/` to `parle/` in project structure
- Line 67: Change `cd transcriber` to `cd parle`  
- Line 82: Change database URL from `transcriber` to `parle`
- Line 87: Change `POSTGRES_DB=transcriber` to `POSTGRES_DB=parle`

**instructions.md**
- Line 23: Change `transcriber/` to `parle/` in project structure
- Line 148: Change `POSTGRES_DB: transcriber` to `POSTGRES_DB: parle`
- Line 161: Change database URL from `transcriber` to `parle`

### 2. Configuration Files

**apps/api/.env.example**
- Line 9: Change `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/transcriber?schema=public` to `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/parle?schema=public`
- Line 14: Change `POSTGRES_DB=transcriber` to `POSTGRES_DB=parle`

**docker-compose.yml**
- Line 8: Change `POSTGRES_DB: transcriber` to `POSTGRES_DB: parle`

**apps/api/src/services/logger.ts**
- Line 15: Change log filename from `transcriber-${today}.log` to `parle-${today}.log`

### 3. Package Configuration Files

**package.json** (root)
- Line 2: Change `"name": "transcriber-monorepo"` to `"name": "parle-monorepo"`

**apps/api/package.json**
- Line 2: Change `"name": "transcriber-api"` to `"name": "parle-api"`

**apps/web/package.json**
- Line 2: Change `"name": "transcriber-web"` to `"name": "parle-web"`

## Execution Steps

### Phase 1: Update Configuration Files
1. Update `docker-compose.yml`
2. Update `apps/api/.env.example`
3. Update your local `.env` file if it exists

### Phase 2: Database Setup
1. Stop current Docker containers
2. Restart Docker with updated configuration
3. Initialize new database schema with Prisma

### Phase 3: Update Code Files
1. Update `apps/api/src/services/logger.ts`
2. Update package.json files

### Phase 4: Update Documentation
1. Update `README.md`
2. Update `instructions.md`

### Phase 5: Database Initialization and Dependencies
```bash
# Stop Docker containers and restart with new config
docker compose down
docker compose up -d

# Regenerate package-lock.json
rm package-lock.json
npm install

# Initialize new database with Prisma
cd apps/api
bun run db:generate
bun run db:push
```

### Phase 6: Test the Changes
```bash
# Database should already be running from Phase 5

# Start API
cd apps/api
bun run dev

# In another terminal, start web
cd apps/web
npm run dev

# Test the application at http://localhost:5173
```

## Verification Checklist

- [ ] Database container starts with `parle` database
- [ ] API connects to new database successfully
- [ ] Web application loads and functions correctly
- [ ] File uploads and transcription work
- [ ] Log files are created with `parle-` prefix
- [ ] All documentation references are updated
- [ ] Package names are updated consistently

## Rollback Plan

If issues occur, you can rollback by:
1. Reverting all file changes
2. Recreating the `transcriber` database
3. Running `bun run db:generate && bun run db:push` in the API directory

## Notes

- The database has been manually dropped, so we're starting fresh with a new `parle` database
- Prisma commands will create the new database and all tables from scratch
- Log files will start using the new `parle-` prefix going forward
- Package-lock.json will be regenerated with new package names
- No data migration needed since we're starting with a clean database