# ⚡ Fabric Activity Monitor — Phase 2 Setup Guide

## Multi-Tenant Power BI/Fabric Activity Log Dashboard
**2 Azure Accounts · 8 Licenses · 400+ Operations · 20 Categories**

---

## Architecture

```
┌─────────────────────┐     ┌─────────────────────┐
│  Azure Account 1    │     │  Azure Account 2    │
│  (Tenant A)         │     │  (Tenant B)         │
│  4 Users/Licenses   │     │  4 Users/Licenses   │
└────────┬────────────┘     └────────┬────────────┘
         │ Activity Log API          │ Activity Log API
         │ (OAuth2 Client Creds)     │ (OAuth2 Client Creds)
         └────────────┬──────────────┘
                      ▼
         ┌────────────────────────┐
         │   Node.js Backend      │
         │   (Express + Cron)     │
         │                        │
         │  • Nightly extraction  │
         │  • Merges both tenants │
         │  • REST API endpoints  │
         └────────────┬───────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │   SQLite / PostgreSQL  │
         │   (Activity History)   │
         └────────────┬───────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │   React Dashboard      │
         │   (Vite + Recharts)    │
         └────────────────────────┘
```

---

## ⚠️ BEFORE YOU START — Azure Setup Required (Both Accounts)

You must complete Steps 1-3 for **EACH** of your 2 Azure accounts.
This requires **Global Admin** or **Fabric Admin** permissions.

---

## Step 1: Register App in Azure Entra ID (Repeat for Both Accounts)

### Account 1:
1. Go to https://portal.azure.com (sign in with Account 1 admin)
2. Navigate to **Microsoft Entra ID** → **App registrations** → **New registration**
3. Fill in:
   - Name: `Fabric Activity Monitor - Tenant A`
   - Supported account types: **Single tenant**
   - Redirect URI: Leave blank
4. Click **Register**
5. Copy and save:
   - **Application (client) ID** → This is your `CLIENT_ID_A`
   - **Directory (tenant) ID** → This is your `TENANT_ID_A`
6. Go to **Certificates & secrets** → **New client secret**
   - Description: `activity-monitor-secret`
   - Expiry: 24 months
   - Copy the **Value** immediately → This is your `CLIENT_SECRET_A`

### Account 2:
Repeat the exact same steps. You'll get:
- `CLIENT_ID_B`, `TENANT_ID_B`, `CLIENT_SECRET_B`

---

## Step 2: Grant API Permissions (Both Accounts)

In each App Registration:

1. Go to **API permissions** → **Add a permission**
2. Select **Power BI Service** (under "APIs my org uses", search "Power BI")
3. Select **Application permissions** (NOT delegated)
4. Check: `Tenant.Read.All`
5. Click **Add permissions**
6. Click **Grant admin consent for [your org]** (requires admin)

✅ You should see a green checkmark next to the permission.

---

## Step 3: Enable Service Principal Access in Power BI (Both Accounts)

1. Go to https://app.powerbi.com → **Settings** (gear icon) → **Admin portal**
2. Go to **Tenant settings**
3. Find **"Allow service principals to use read-only admin APIs"**
4. Enable it
5. Under **Apply to**: Select either:
   - **The entire organization** (simplest), OR
   - **Specific security groups** → Create a security group containing your App
6. Click **Apply**

⚠️ This setting can take up to **15 minutes** to take effect.

### Create Security Group (if using specific groups):
1. Go to Azure Portal → **Microsoft Entra ID** → **Groups** → **New group**
2. Group type: **Security**
3. Name: `Fabric Monitor Apps`
4. Add your registered App as a **member**
5. Use this group in the Power BI admin setting above

---

## Step 4: Install & Configure the Backend

### Prerequisites
- Node.js 18+ installed (https://nodejs.org)
- npm or yarn

### Setup

```bash
# Clone/open this project
cd fabric-monitor

# Install backend dependencies
cd backend
npm install

# Copy environment template
cp .env.example .env
```

### Edit `.env` with your Azure credentials:

```env
# ═══ Tenant A (Azure Account 1) ═══
TENANT_ID_A=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
CLIENT_ID_A=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
CLIENT_SECRET_A=your-secret-value-here

# ═══ Tenant B (Azure Account 2) ═══
TENANT_ID_B=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
CLIENT_ID_B=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
CLIENT_SECRET_B=your-secret-value-here

# ═══ Server ═══
PORT=3001
CRON_SCHEDULE=0 2 * * *
# Runs daily at 2 AM. Change as needed.
# Format: minute hour day-of-month month day-of-week
```

---

## Step 5: Run the Backend

```bash
# Start the server (includes cron job for auto-extraction)
npm start

# Or for development with auto-reload
npm run dev

# Manual one-time extraction (test your credentials)
npm run extract
```

### Test your setup:
```bash
# Should return activity data
curl http://localhost:3001/api/health

# Get activities
curl http://localhost:3001/api/activities?days=7

# Get activities for a specific tenant
curl http://localhost:3001/api/activities?tenant=tenant-a&days=7
```

---

## Step 6: Run the Frontend

```bash
cd ../frontend
npm install
npm run dev
```

Open http://localhost:5173 — your dashboard is live!

---

## Step 7: Deploy (Production)

### Option A: Single Server (Simplest)
```bash
# Build frontend
cd frontend && npm run build

# The backend serves the built frontend
cd ../backend
NODE_ENV=production npm start
```
Access at `http://your-server:3001`

### Option B: Vercel (Frontend) + Railway/Render (Backend)
- Frontend: Push `frontend/` to Vercel (free tier)
- Backend: Push `backend/` to Railway or Render
- Set environment variables in the platform's dashboard

### Option C: Docker
```bash
docker-compose up -d
```

---

## API Endpoints Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Server status + last extraction time |
| `/api/activities` | GET | All activities (filterable) |
| `/api/activities/stats` | GET | Aggregated statistics |
| `/api/activities/users` | GET | Per-user activity breakdown |
| `/api/activities/categories` | GET | Per-category breakdown |
| `/api/tenants` | GET | List configured tenants |
| `/api/extract` | POST | Trigger manual extraction |

### Query Parameters for `/api/activities`:
- `tenant` - Filter by tenant ID (tenant-a, tenant-b)
- `user` - Filter by user email
- `category` - Filter by category
- `severity` - Filter by severity (info, warning, critical)
- `operation` - Filter by operation name
- `days` - Number of days to look back (default: 30)
- `from` / `to` - Date range (YYYY-MM-DD)
- `search` - Text search across all fields
- `limit` - Max results (default: 1000)
- `offset` - Pagination offset

---

## Troubleshooting

### "Unauthorized" error
- Verify Client ID, Secret, and Tenant ID are correct
- Ensure admin consent was granted (green checkmark in API permissions)
- Wait 15 minutes after enabling service principal access in Power BI

### "Forbidden" error
- Your App may not be in the security group
- The "Allow service principals to use read-only admin APIs" setting may not be enabled
- You may not have Fabric Admin role

### No data returned
- Activity Log API only returns data for the past 30 days
- Extraction runs nightly — run `npm run extract` manually first
- Check that users actually performed activities in Power BI

### Rate limiting
- API allows 200 requests per hour per tenant
- The extraction script handles pagination and rate limiting automatically
- If you hit limits, reduce CRON_SCHEDULE frequency

---

## Continuing Development with Claude Code

```bash
# Install Claude Code
npm install -g @anthropic-ai/claude-code

# Open this project
cd fabric-monitor

# Start Claude Code
claude

# Then ask things like:
# "Add a new endpoint for exporting activities to CSV"
# "Add email alerts when critical events are detected"
# "Add authentication to the dashboard"
# "Deploy this to Azure App Service"
```

---

## File Structure

```
fabric-monitor/
├── README.md                 ← You are here
├── backend/
│   ├── .env.example          ← Template for credentials
│   ├── package.json
│   ├── src/
│   │   ├── server.js         ← Express server + API routes
│   │   ├── database.js       ← SQLite setup & queries
│   │   ├── extractor.js      ← Power BI Activity Log API client
│   │   ├── categorizer.js    ← Maps 400+ operations to categories
│   │   └── cron.js           ← Scheduled extraction job
│   └── scripts/
│       └── manual-extract.js ← One-time manual extraction
├── frontend/
│   ├── package.json
│   └── src/
│       └── (React dashboard from Phase 1, wired to API)
└── docs/
    └── azure-setup-screenshots.md
```
