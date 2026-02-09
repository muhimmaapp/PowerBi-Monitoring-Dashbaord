/**
 * ⚡ Fabric Activity Monitor — Express Server
 *
 * Multi-tenant Power BI/Fabric activity log dashboard backend
 * Pulls from Power BI Activity Log API, stores in SQLite, serves via REST
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const { initDatabase, queryActivities, getStats, getUserStats, getLastExtraction } = require("./database");
const { CATEGORIES } = require("./categorizer");
const { startCronJob, runExtraction } = require("./cron");

// ═══════════════════════════════════════
// Configuration
// ═══════════════════════════════════════

const PORT = process.env.PORT || 3001;
const DB_PATH = process.env.DB_PATH || "./data/activities.db";
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || "0 2 * * *";
const FRONTEND_DIST = path.join(__dirname, "../../frontend/dist");

// Build tenant configurations from environment
const tenants = [];

if (process.env.TENANT_ID_A && process.env.CLIENT_ID_A) {
  tenants.push({
    id: "tenant-a",
    tenantId: process.env.TENANT_ID_A,
    clientId: process.env.CLIENT_ID_A,
    clientSecret: process.env.CLIENT_SECRET_A,
    label: process.env.TENANT_A_LABEL || "Azure Account 1",
  });
}

if (process.env.TENANT_ID_B && process.env.CLIENT_ID_B) {
  tenants.push({
    id: "tenant-b",
    tenantId: process.env.TENANT_ID_B,
    clientId: process.env.CLIENT_ID_B,
    clientSecret: process.env.CLIENT_SECRET_B,
    label: process.env.TENANT_B_LABEL || "Azure Account 2",
  });
}

// ═══════════════════════════════════════
// Initialize
// ═══════════════════════════════════════

console.log(`
╔══════════════════════════════════════╗
║  ⚡ Fabric Activity Monitor         ║
║  Multi-Tenant Dashboard Backend     ║
╚══════════════════════════════════════╝
`);

// Initialize database
initDatabase(DB_PATH);

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());

// Serve React frontend in production
if (process.env.NODE_ENV === "production") {
  const frontendPath = path.join(__dirname, "../../frontend/dist");
  app.use(express.static(frontendPath));
}

// ═══════════════════════════════════════
// API Routes
// ═══════════════════════════════════════

/**
 * GET /api/health — Server status
 */
app.get("/api/health", (req, res) => {
  const lastExtraction = getLastExtraction();
  res.json({
    status: "ok",
    tenants: tenants.map((t) => ({ id: t.id, label: t.label })),
    tenantsConfigured: tenants.length,
    lastExtraction: lastExtraction || null,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/tenants — List configured tenants
 */
app.get("/api/tenants", (req, res) => {
  res.json(
    tenants.map((t) => ({
      id: t.id,
      label: t.label,
      domain: t.tenantId, // Don't expose secrets
    }))
  );
});

/**
 * GET /api/categories — List all categories with operation counts
 */
app.get("/api/categories", (req, res) => {
  res.json(CATEGORIES);
});

/**
 * GET /api/activities — Query activities with filters
 *
 * Query params: tenant, user, category, severity, operation, days, from, to, search, limit, offset
 */
app.get("/api/activities", (req, res) => {
  try {
    const filters = {
      tenant: req.query.tenant || null,
      user: req.query.user || null,
      category: req.query.category || null,
      severity: req.query.severity || null,
      operation: req.query.operation || null,
      days: req.query.days ? parseInt(req.query.days) : null,
      from: req.query.from || null,
      to: req.query.to || null,
      search: req.query.search || null,
      limit: req.query.limit ? parseInt(req.query.limit) : 1000,
      offset: req.query.offset ? parseInt(req.query.offset) : 0,
    };

    // Default to last 30 days if no date filter
    if (!filters.days && !filters.from && !filters.to) {
      filters.days = 30;
    }

    const activities = queryActivities(filters);
    res.json({
      count: activities.length,
      filters,
      data: activities,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/activities/stats — Aggregated statistics
 */
app.get("/api/activities/stats", (req, res) => {
  try {
    const filters = {
      tenant: req.query.tenant || null,
      days: req.query.days ? parseInt(req.query.days) : 30,
      from: req.query.from || null,
      to: req.query.to || null,
    };

    const stats = getStats(filters);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/activities/users — Per-user breakdown
 */
app.get("/api/activities/users", (req, res) => {
  try {
    const filters = {
      tenant: req.query.tenant || null,
      days: req.query.days ? parseInt(req.query.days) : 30,
    };

    const users = getUserStats(filters);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/extract — Trigger manual extraction
 */
app.post("/api/extract", async (req, res) => {
  if (tenants.length === 0) {
    return res.status(400).json({ error: "No tenants configured. Check your .env file." });
  }

  const daysBack = req.body.days || 1;
  res.json({ message: `Extraction started for ${daysBack} day(s)...`, tenants: tenants.length });

  // Run extraction in background
  try {
    await runExtraction(tenants, daysBack);
  } catch (err) {
    console.error("Manual extraction error:", err);
  }
});

/**
 * POST /api/extract/backfill — Extract historical data (up to 28 days)
 */
app.post("/api/extract/backfill", async (req, res) => {
  if (tenants.length === 0) {
    return res.status(400).json({ error: "No tenants configured." });
  }

  const days = Math.min(req.body.days || 28, 28);
  res.json({ message: `Backfill started: ${days} days of history...`, tenants: tenants.length });

  try {
    await runExtraction(tenants, days);
  } catch (err) {
    console.error("Backfill error:", err);
  }
});

// Serve React app for all other routes (SPA fallback)
if (process.env.NODE_ENV === "production") {
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../../frontend/dist/index.html"));
  });
}

// ═══════════════════════════════════════
// Start Server
// ═══════════════════════════════════════

app.listen(PORT, () => {
  console.log(`🚀 Server running: http://localhost:${PORT}`);
  console.log(`📡 API endpoints:`);
  console.log(`   GET  /api/health`);
  console.log(`   GET  /api/tenants`);
  console.log(`   GET  /api/categories`);
  console.log(`   GET  /api/activities?days=7&tenant=tenant-a`);
  console.log(`   GET  /api/activities/stats?days=30`);
  console.log(`   GET  /api/activities/users?days=30`);
  console.log(`   POST /api/extract`);
  console.log(`   POST /api/extract/backfill`);
  console.log("");

  if (tenants.length === 0) {
    console.log("⚠️  No tenants configured! Copy .env.example to .env and add your Azure credentials.");
    console.log("   The server will work but won't extract any data.\n");
  } else {
    console.log(`🏢 Tenants: ${tenants.map((t) => t.label).join(", ")}`);

    // Start cron job
    startCronJob(tenants, CRON_SCHEDULE);

    // Run initial extraction if database is empty
    const lastExtraction = getLastExtraction();
    if (!lastExtraction) {
      const initialDays = parseInt(process.env.INITIAL_EXTRACT_DAYS || "7");
      console.log(`\n📥 First run detected — extracting last ${initialDays} days of history...`);
      runExtraction(tenants, initialDays).catch(console.error);
    }
  }
});
