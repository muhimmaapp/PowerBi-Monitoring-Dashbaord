# ⚡ Fabric Activity Monitor v2

Multi-tenant Microsoft Fabric / Power BI activity monitoring dashboard.
Tracks **100+ operations** across **20 categories** from the Power BI Activity Log API.

## Project Structure

```
fabric-monitor/
├── package.json              # Root scripts (install, dev, build, start)
├── backend/
│   ├── package.json
│   ├── .env.example          # Copy to .env, add Azure credentials
│   ├── src/
│   │   ├── server.js         # Express API server (port 3001)
│   │   ├── database.js       # SQLite storage layer
│   │   ├── extractor.js      # Power BI Activity Log API client
│   │   ├── categorizer.js    # 20-category operation mapping
│   │   └── cron.js           # Scheduled extraction jobs
│   └── scripts/
│       └── manual-extract.js # CLI manual extraction tool
├── frontend/
│   ├── package.json
│   ├── vite.config.js        # Vite + React config (proxies /api to :3001)
│   ├── index.html
│   └── src/
│       ├── main.jsx          # React entry point
│       └── App.jsx           # V2 Dashboard (all-in-one component)
└── README.md
```

## Quick Start

### 1. Install dependencies
```bash
npm run install:all
```

### 2. Configure Azure credentials
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your Tenant ID, Client ID, Client Secret
```

### 3. Run in development
```bash
# Terminal 1 - Backend API
npm run dev:backend

# Terminal 2 - Frontend (Vite dev server with hot reload)
npm run dev:frontend
```

Frontend: http://localhost:5173
Backend API: http://localhost:3001/api/health

### 4. Production build
```bash
npm run build          # Builds frontend into frontend/dist/
npm run start          # Serves everything from backend on port 3001
```

## Azure App Registration Setup

Each tenant needs an Entra ID App Registration:

1. Go to Azure Portal then Entra ID then App Registrations then New
2. Add API Permission: Tenant.Read.All (Application type)
3. Grant admin consent
4. Create a client secret
5. Copy Tenant ID, Client ID, Client Secret into backend/.env

Required permissions:
- Tenant.Read.All - reads Power BI activity log events
- The service principal must be added to the Power BI Admin role or enabled via admin API settings

## Dashboard Features (V2)

### 4 Views
- **Overview** - 13 KPI cards (3 grouped rows) + charts + user activity cards + event log
- **User Activity** - Sidebar user list + profile header + per-user stats + filtered table
- **Categories** - 20 clickable category cards with drill-through into category events
- **Full Catalog** - Complete operation reference (100+ operations with severity)

### 13 KPIs across 3 rows

Primary: Total Events, Critical, Warnings, Failures, Success Rate

Users and Activity: Active Users, Avg Events/Day, Peak Hour, Busiest Workspace

Security: Exports and Downloads, Shares and Access, Admin Actions, Categories

### Filters
- Tenant selector (multi-tenant support)
- User selector (8 users)
- Severity filter (Critical / Warning / Info)
- Full-text search across operations, users, items, workspaces

### 20 Tracked Categories
Reports, Dashboards, Semantic Models, Dataflows, Workspaces, Pipelines,
Gateways, Apps, Capacity and Admin, Security and DLP, Lakehouse, Warehouse,
OneLake, Git Integration, Notebooks and Spark, Data Science and AI,
Scorecards, Subscriptions, Embed, Domains and Governance

## API Endpoints

- GET /api/health - Server status
- GET /api/tenants - Configured tenants list
- GET /api/categories - All 20 categories + operations
- GET /api/activities?days=7&tenant=tenant-a&category=reports&severity=critical - Query activities
- GET /api/activities/stats?days=30 - Aggregated stats
- GET /api/activities/users?days=30 - Per-user breakdown
- POST /api/extract - Trigger manual extraction
- POST /api/extract/backfill - Extract historical data

## Data Freshness

The Power BI Activity Log API has a 15-30 min delay (up to 24hrs for some events).

- Default: Daily extraction at 2 AM (CRON_SCHEDULE=0 2 * * *)
- Near real-time: Poll every 30 min (CRON_SCHEDULE=*/30 * * * *)
- On-demand: POST /api/extract or npm run extract

## Claude CLI Notes

When working with this project in Claude CLI / VS Code:

- The frontend is a standalone React + Vite app. App.jsx is the main dashboard
- The backend is Node.js + Express + SQLite. No external DB needed
- Currently App.jsx uses mock data (600 events, 8 users, 2 tenants) for preview
- To connect to real data: update App.jsx to fetch from /api/activities instead of the gen() function
- The Vite proxy config forwards /api/* to the backend in dev mode

### Key files to modify
- frontend/src/App.jsx - Dashboard UI (all components in one file)
- backend/src/server.js - API routes
- backend/src/categorizer.js - Operation to category mapping
- backend/src/extractor.js - Power BI API integration
- backend/.env - Azure credentials and settings

## License

MIT
