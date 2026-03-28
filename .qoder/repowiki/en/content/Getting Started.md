# Getting Started

<cite>
**Referenced Files in This Document**
- [README.md](file://README.md)
- [package.json](file://package.json)
- [ARCHITECTURE.md](file://ARCHITECTURE.md)
- [src/index.ts](file://src/index.ts)
- [src/api/server.ts](file://src/api/server.ts)
- [src/util/env.ts](file://src/util/env.ts)
- [src/repository/Database.ts](file://src/repository/Database.ts)
- [db/run-migrations.ts](file://db/run-migrations.ts)
- [db/seed.ts](file://db/seed.ts)
- [db/migrations/001_init_schema.sql](file://db/migrations/001_init_schema.sql)
- [db/migrations/002_add_sample_indexes.sql](file://db/migrations/002_add_sample_indexes.sql)
- [demos/curl-examples.sh](file://demos/curl-examples.sh)
- [demos/sample-payloads.json](file://demos/sample-payloads.json)
- [demos/end-to-end.ts](file://demos/end-to-end.ts)
- [frontend/package.json](file://frontend/package.json)
- [frontend/README.md](file://frontend/README.md)
- [frontend/vite.config.ts](file://frontend/vite.config.ts)
- [frontend/src/main.tsx](file://frontend/src/main.tsx)
- [frontend/src/App.tsx](file://frontend/src/App.tsx)
- [frontend/src/lib/api.ts](file://frontend/src/lib/api.ts)
- [frontend/src/lib/types.ts](file://frontend/src/lib/types.ts)
- [frontend/src/hooks/useApi.ts](file://frontend/src/hooks/useApi.ts)
- [frontend/src/pages/Dashboard.tsx](file://frontend/src/pages/Dashboard.tsx)
- [frontend/src/pages/IngestSite.tsx](file://frontend/src/pages/IngestSite.tsx)
- [frontend/tailwind.config.js](file://frontend/tailwind.config.js)
- [frontend/tsconfig.app.json](file://frontend/tsconfig.app.json)
- [vercel.json](file://vercel.json)
</cite>

## Update Summary
**Changes Made**
- Updated installation procedures to account for @insforge/sdk moved to optionalDependencies
- Added Vercel serverless compatibility considerations and environment variable configuration
- Enhanced troubleshooting guide with SDK loading issues and optional dependency handling
- Updated environment configuration to include Insforge database credentials

## Table of Contents
1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Installation Steps](#installation-steps)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [Frontend Development](#frontend-development)
7. [Running the Application](#running-the-application)
8. [Demo Scripts](#demo-scripts)
9. [Initial Verification](#initial-verification)
10. [Troubleshooting Guide](#troubleshooting-guide)
11. [Common Issues and Solutions](#common-issues-and-solutions)

## Introduction
This guide provides a complete, step-by-step setup process for ARES, covering both backend and frontend components. You will install prerequisites, configure environment variables, set up the database, install frontend dependencies, and run both development servers. The guide balances beginner accessibility with technical depth for system administrators.

## Prerequisites

### System Requirements
- **Node.js**: Version 18 or higher (required for both backend and frontend)
- **PostgreSQL**: Version 14 or higher with pgvector extension
- **API Keys**: MIXEDBREAD_API_KEY for embedding services

### Required Tools
- Git for version control
- Package managers (npm/yarn/pnpm)
- Modern web browser for frontend development

**Section sources**
- [README.md:19-23](file://README.md#L19-L23)
- [frontend/package.json:12-18](file://frontend/package.json#L12-L18)

## Installation Steps

### 1. Clone and Navigate
```bash
git clone <repository-url>
cd ARES
```

### 2. Backend Dependencies
Install the main application dependencies:
```bash
npm install
```

**Updated** The @insforge/sdk is now configured as an optional dependency to address Vercel serverless compatibility issues. During installation, npm will attempt to install the SDK but won't fail if it's unavailable.

### 3. Frontend Dependencies
Navigate to the frontend directory and install React/Vite dependencies:
```bash
cd frontend
npm install
```

### 4. Return to Root Directory
```bash
cd ..
```

**Section sources**
- [README.md:25-46](file://README.md#L25-L46)
- [frontend/package.json:6-11](file://frontend/package.json#L6-L11)
- [package.json:42-44](file://package.json#L42-L44)

## Environment Configuration

### Create .env File
Copy the example environment file:
```bash
cp .env.example .env
```

### Required Environment Variables
Set the following in your `.env` file:

**Database Configuration**
```env
DATABASE_URL=postgresql://username:password@localhost:5432/ares_db
INSFORGE_BASE_URL=https://your-project.insforce.app
INSFORGE_ANON_KEY=your_anon_key_here
```

**API Configuration**
```env
MIXEDBREAD_API_KEY=your_mixedbread_api_key_here
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
CORS_ORIGIN=http://localhost:5173
```

### Vercel Serverless Compatibility
**Updated** For Vercel deployments, the application uses a special installation command that omits optional dependencies:

```json
"installCommand": "npm install --omit=optional"
```

This ensures the application deploys successfully even when the @insforge/sdk is unavailable in the serverless environment.

**Section sources**
- [src/util/env.ts:17-84](file://src/util/env.ts#L17-L84)
- [src/repository/Database.ts:1-25](file://src/repository/Database.ts#L1-L25)
- [vercel.json:20](file://vercel.json#L20)

## Database Setup

### Run Migrations
Execute database migrations to set up the schema:
```bash
npm run db:migrate
```

### Migration Details
The migration process:
- Validates DATABASE_URL connection
- Enables UUID and pgvector extensions
- Creates all required tables and indexes
- Executes sequentially with error reporting

### Optional Data Seeding
Seed the database with sample data (development only):
```bash
npm run db:seed
```

**Section sources**
- [db/run-migrations.ts:24-124](file://db/run-migrations.ts#L24-L124)
- [db/seed.ts:20-59](file://db/seed.ts#L20-L59)

## Frontend Development

### Frontend Architecture
ARES features a modern React + TypeScript + Vite frontend with:
- **React 19** with concurrent features
- **TypeScript 5.9** for type safety
- **Vite 8.0** for fast development builds
- **Tailwind CSS 4.2** for styling
- **React Router 7.13** for navigation

### Development Commands
```bash
# Start frontend development server
cd frontend
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run ESLint
npm run lint
```

### Frontend Features
- **Dashboard**: Real-time health monitoring and quick actions
- **Site Ingestion**: Form-based interface for adding suspicious storefronts
- **Actor Resolution**: Interface for identifying operator clusters
- **Cluster Management**: Detailed views of operator groups
- **Responsive Design**: Mobile-friendly interface

### API Integration
The frontend communicates with the backend through:
- Axios client with automatic error handling
- TypeScript interfaces for type-safe API contracts
- Custom hooks for managing API state
- Real-time health monitoring

**Section sources**
- [frontend/package.json:12-36](file://frontend/package.json#L12-L36)
- [frontend/src/App.tsx:13-27](file://frontend/src/App.tsx#L13-L27)
- [frontend/src/lib/api.ts:55-81](file://frontend/src/lib/api.ts#L55-L81)

## Running the Application

### Method 1: Individual Servers (Recommended for Development)
Start both servers in separate terminals:

**Terminal 1 - Backend Server:**
```bash
cd ARES
npm run dev
```

**Terminal 2 - Frontend Server:**
```bash
cd ARES/frontend
npm run dev
```

### Method 2: Combined Development
Use the root project's combined development approach:
```bash
# From root directory
npm run dev
```

### Server Configuration
- **Backend**: Runs on `http://localhost:3000`
- **Frontend**: Runs on `http://localhost:5173`
- **Proxy**: Automatic forwarding of `/api` and `/health` requests

**Section sources**
- [src/index.ts:44-59](file://src/index.ts#L44-L59)
- [frontend/vite.config.ts:7-19](file://frontend/vite.config.ts#L7-L19)

## Demo Scripts

### End-to-End TypeScript Demo
Run the comprehensive demo script:
```bash
npm run demo
```

This script demonstrates the complete ARES workflow:
1. **Health Check**: Verifies API connectivity
2. **Database Seeding**: Creates test data
3. **Site Ingestion**: Processes suspicious storefronts
4. **Actor Resolution**: Identifies operator clusters
5. **Cluster Analysis**: Retrieves detailed operator information

### cURL Examples
Test individual endpoints using the provided shell script:
```bash
chmod +x demos/curl-examples.sh
./demos/curl-examples.sh
```

### Sample Payloads
Explore API request/response examples in JSON format:
- [Sample payloads:1-234](file://demos/sample-payloads.json#L1-L234)

**Section sources**
- [demos/end-to-end.ts:74-195](file://demos/end-to-end.ts#L74-L195)
- [demos/curl-examples.sh:1-121](file://demos/curl-examples.sh#L1-L121)

## Initial Verification

### Health Check
Verify both servers are running correctly:

**Backend Health:**
```bash
curl http://localhost:3000/health
```

**Frontend Access:**
Open `http://localhost:5173` in your browser

### Dashboard Verification
The frontend dashboard should display:
- API status indicators
- Database connectivity status
- Embedding service availability
- Quick action buttons for core features

### API Functionality Test
Test key endpoints:
- `GET /health` - Server status
- `POST /api/seeds` - Data seeding
- `POST /api/ingest-site` - Site processing
- `POST /api/resolve-actor` - Actor identification

**Section sources**
- [src/api/server.ts:74-82](file://src/api/server.ts#L74-L82)
- [frontend/src/pages/Dashboard.tsx:130-182](file://frontend/src/pages/Dashboard.tsx#L130-L182)

## Troubleshooting Guide

### Prerequisites Issues
**Node.js Version Problems:**
```bash
node --version
# Should be 18.x or higher
```

**PostgreSQL Connection Issues:**
```bash
# Test database connectivity
psql $DATABASE_URL
```

### Environment Variable Problems
**Missing Required Variables:**
- DATABASE_URL: Complete PostgreSQL connection string
- INSFORGE_BASE_URL: Insforge database base URL
- INSFORGE_ANON_KEY: Insforge anonymous API key
- MIXEDBREAD_API_KEY: Valid API key for embedding services

**Validation Errors:**
- Invalid NODE_ENV values
- PORT outside 1-65535 range
- Missing required variables in production

### Database Connection Issues
**Connection Refused:**
- Verify PostgreSQL is running
- Check firewall settings
- Confirm database credentials are correct

**Migration Failures:**
- Review migration logs for specific errors
- Ensure pgvector extension is installed
- Check database permissions

### Optional Dependency Issues
**Updated** @insforge/sdk Loading Problems:
- The SDK is now optional and may not be available in all environments
- In Vercel serverless environments, the SDK is intentionally disabled
- The application gracefully handles missing SDK dependencies

**Vercel Deployment Issues:**
- Vercel uses `--omit=optional` flag to skip optional dependencies
- This prevents deployment failures when @insforge/sdk is unavailable
- The application continues to function without the SDK in serverless environments

### Frontend Development Issues
**Port Conflicts (5173):**
```bash
# Change frontend port in vite.config.ts
port: 5174  # or any available port
```

**API Proxy Issues:**
- Backend must be running before frontend
- Check proxy configuration in vite.config.ts
- Verify CORS settings in backend

**Build Issues:**
- Clear node_modules and reinstall dependencies
- Check TypeScript compilation errors
- Verify Tailwind CSS configuration

### Backend Server Issues
**Port Conflicts (3000):**
```bash
# Change port in .env
PORT=3001
```

**Module Import Errors:**
- Verify all dependencies are installed
- Check for circular dependencies
- Ensure proper TypeScript compilation

### API Key Validation
**Mixedbread API Issues:**
- Verify API key is active
- Check rate limit quotas
- Ensure embedding service is accessible

**Insforge Database Issues:**
- Verify INSFORGE_BASE_URL points to correct Insforge project
- Ensure INSFORGE_ANON_KEY is valid for the specified project
- Check that the Insforge project has the required tables

### Network and CORS Issues
**Cross-Origin Problems:**
- Backend CORS_ORIGIN must match frontend URL
- Proxy configuration must be correct
- Check browser developer tools for detailed errors

**Section sources**
- [src/util/env.ts:29-54](file://src/util/env.ts#L29-L54)
- [frontend/vite.config.ts:7-19](file://frontend/vite.config.ts#L7-L19)
- [db/run-migrations.ts:84-94](file://db/run-migrations.ts#L84-L94)
- [src/repository/Database.ts:1-25](file://src/repository/Database.ts#L1-L25)
- [vercel.json:20](file://vercel.json#L20)

### Common Issues and Solutions

**Issue: Frontend shows blank screen**
- Solution: Ensure backend is running on port 3000
- Check browser console for API errors
- Verify proxy configuration is working

**Issue: API requests fail with CORS errors**
- Solution: Set CORS_ORIGIN to match frontend URL
- Ensure backend server is restarted after CORS changes
- Check that proxy is configured correctly

**Issue: Database migration fails**
- Solution: Install pgvector extension manually
- Verify PostgreSQL version compatibility
- Check database user permissions

**Issue: TypeScript compilation errors**
- Solution: Run `npm run build` to see detailed errors
- Check TypeScript configuration files
- Ensure all dependencies are compatible versions

**Issue: React components not rendering**
- Solution: Verify React and ReactDOM versions match
- Check for proper JSX syntax
- Ensure TypeScript types are correctly defined

**Issue: @insforge/sdk not available warnings**
- Solution: This is expected in Vercel serverless environments
- The application continues to function without the SDK
- The SDK is only required for local development and non-serverless deployments

**Issue: Vercel deployment fails with optional dependency errors**
- Solution: Vercel automatically uses `--omit=optional` flag
- No manual intervention needed for deployment
- The application will deploy successfully without the SDK

**Section sources**
- [frontend/src/lib/api.ts:42-49](file://frontend/src/lib/api.ts#L42-L49)
- [frontend/src/hooks/useApi.ts:45-63](file://frontend/src/hooks/useApi.ts#L45-L63)
- [db/migrations/001_init_schema.sql:5-7](file://db/migrations/001_init_schema.sql#L5-L7)
- [src/repository/Database.ts:1-25](file://src/repository/Database.ts#L1-L25)
- [vercel.json:20](file://vercel.json#L20)