/**
 * Fabric Activity Monitor — Express Server
 *
 * Multi-tenant Power BI/Fabric activity log dashboard backend
 * Pulls from Power BI Activity Log API, stores in MariaDB, serves via REST
 */

require("dotenv").config();
const express = require("express");
const compression = require("compression");
const cors = require("cors");
const path = require("path");
const fetch = require("node-fetch");
const jwt = require("jsonwebtoken");

const { initDatabase, queryActivities, getStats, getUserStats, getLastExtraction, getDateBounds } = require("./database");
const { CATEGORIES } = require("./categorizer");
const { startCronJob, runExtraction } = require("./cron");

/**
 * Extract a meaningful path/name from URL for OneLake operations
 */
function extractPathFromUrl(url) {
  if (!url) return null;
  try {
    const match = url.match(/\/Files\/(.+?)(?:\?|$)/i) || url.match(/\/Tables\/(.+?)(?:\?|$)/i);
    if (match) return match[1];
    const segments = url.split("/").filter(Boolean);
    return segments[segments.length - 1] || null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════
// Configuration
// ═══════════════════════════════════════

const PORT = process.env.PORT || 3001;
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || "0 2 * * *";

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306"),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "fabric_monitor",
};

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
// Authentication
// ═══════════════════════════════════════

const JWT_SECRET = process.env.JWT_SECRET || "fabric-monitor-secret-change-me";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }
  try {
    const token = authHeader.split(" ")[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ═══════════════════════════════════════
// Start
// ═══════════════════════════════════════

async function start() {
  console.log(`
╔══════════════════════════════════════╗
║  ⚡ Fabric Activity Monitor         ║
║  Multi-Tenant Dashboard Backend     ║
╚══════════════════════════════════════╝
`);

  // Initialize database
  await initDatabase(dbConfig);

  // Initialize Express
  const app = express();
  app.use(compression());
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
   * POST /api/login — Authenticate and get JWT token
   */
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "7d" });
      return res.json({ token, username });
    }
    return res.status(401).json({ error: "Invalid username or password" });
  });

  /**
   * GET /api/auth/verify — Check if token is valid
   */
  app.get("/api/auth/verify", authMiddleware, (req, res) => {
    res.json({ valid: true, username: req.user.username });
  });

  // Protect all routes below this point
  app.use("/api", (req, res, next) => {
    // Skip auth for login and health
    if (req.path === "/login" || req.path === "/health" || req.path === "/auth/verify") {
      return next();
    }
    authMiddleware(req, res, next);
  });

  /**
   * GET /api/health — Server status
   */
  app.get("/api/health", async (req, res) => {
    try {
      const lastExtraction = await getLastExtraction();
      res.json({
        status: "ok",
        tenants: tenants.map((t) => ({ id: t.id, label: t.label })),
        tenantsConfigured: tenants.length,
        lastExtraction: lastExtraction || null,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/tenants — List configured tenants
   */
  app.get("/api/tenants", (req, res) => {
    res.json(
      tenants.map((t) => ({
        id: t.id,
        label: t.label,
        domain: t.tenantId,
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
   */
  app.get("/api/activities", async (req, res) => {
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

      if (!filters.days && !filters.from && !filters.to) {
        filters.days = 30;
      }

      const rawActivities = await queryActivities(filters);

      // Enhance activities with fields from raw_json
      const activities = rawActivities.map((a) => {
        // Always try to extract fields from raw_json to fill in missing data
        if (a.raw_json) {
          try {
            const raw = JSON.parse(a.raw_json);

            // Helper to check if value is empty
            const isEmpty = (v) => v === null || v === undefined || v === "" || v === "-";
            const getFirst = (...vals) => vals.find((v) => v && v.trim && v.trim() !== "") || null;

            // ClientIP - fill if empty
            if (isEmpty(a.client_ip)) {
              a.client_ip = getFirst(raw.ClientIP, raw.ClientIp, raw.clientIP, raw.IpAddress, raw.IPAddress);
            }

            // Workspace name - fill if empty
            if (isEmpty(a.workspace_name)) {
              a.workspace_name = getFirst(raw.WorkSpaceName, raw.WorkspaceName, raw.workspaceName, raw.FolderDisplayName, raw.LakehouseName);
            }

            // Item name - fill if empty or is a GUID
            const isGuid = (v) => v && /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(v);
            if (isEmpty(a.item_name) || isGuid(a.item_name)) {
              const itemName = getFirst(
                raw.ArtifactName, raw.ReportName, raw.DashboardName,
                raw.DatasetName, raw.DataflowName, raw.FileName,
                raw.ItemName, raw.ModelName
              );
              if (itemName) {
                a.item_name = itemName;
              } else if (raw.ObjectType && !isGuid(raw.ObjectType)) {
                a.item_name = raw.ObjectType;
              }
            }

            // Item type - fill if empty
            if (isEmpty(a.item_type)) {
              a.item_type = getFirst(raw.ItemType, raw.ArtifactType, raw.ObjectType);
            }

            // User agent - fill if empty
            if (isEmpty(a.user_agent)) {
              a.user_agent = getFirst(raw.UserAgent, raw.userAgent, raw.Browser);
            }

            // Capacity name - fill if empty
            if (isEmpty(a.capacity_name)) {
              a.capacity_name = getFirst(raw.CapacityName);
            }

            // Extract detailed status information
            a.result_status = raw.ResultStatus || raw.resultStatus || null;
            a.failure_reason = raw.FailureReason || raw.ErrorMessage || raw.Error || raw.failureReason || null;
            a.request_id = raw.RequestId || raw.requestId || null;
            a.distribution_method = raw.DistributionMethod || raw.SharingAction || null;
            a.consumed_artifact_type = raw.ConsumedArtifactType || raw.ArtifactType || null;
          } catch {
            // Ignore JSON parse errors
          }
        }

        // Remove raw_json from response to reduce payload size
        const { raw_json, ...rest } = a;
        return rest;
      });

      res.json({
        count: activities.length,
        filters,
        activities,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/activities/stats — Aggregated statistics
   */
  app.get("/api/activities/stats", async (req, res) => {
    try {
      const filters = {
        tenant: req.query.tenant || null,
        days: req.query.days ? parseInt(req.query.days) : 30,
        from: req.query.from || null,
        to: req.query.to || null,
      };

      const stats = await getStats(filters);
      res.json(stats);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/activities/users — Per-user breakdown
   */
  app.get("/api/activities/users", async (req, res) => {
    try {
      const filters = {
        tenant: req.query.tenant || null,
        days: req.query.days ? parseInt(req.query.days) : 30,
      };

      const users = await getUserStats(filters);
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/activities/bounds — Get min/max dates available in the database
   */
  app.get("/api/activities/bounds", async (_req, res) => {
    try {
      const bounds = await getDateBounds();
      res.json(bounds);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/users/resolve — Resolve UUID-based user IDs to display names via Microsoft Graph
   */
  const resolvedNamesCache = {};

  app.get("/api/users/resolve", async (req, res) => {
    try {
      // Return cache if already populated
      if (Object.keys(resolvedNamesCache).length > 0) {
        return res.json(resolvedNamesCache);
      }

      // Get distinct UUID-based user_ids from user stats
      const userStatsAll = await getUserStats({ days: 90 });
      const uuidUsers = userStatsAll.filter(
        (u) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(u.user_id) &&
          u.user_id !== "00000009-0000-0000-c000-000000000000"
      );

      if (uuidUsers.length === 0) {
        return res.json(resolvedNamesCache);
      }

      // Group UUIDs by tenant
      const byTenant = {};
      for (const u of uuidUsers) {
        if (!byTenant[u.tenant_id]) byTenant[u.tenant_id] = [];
        if (!byTenant[u.tenant_id].includes(u.user_id)) {
          byTenant[u.tenant_id].push(u.user_id);
        }
      }

      // Resolve for each tenant via Graph API
      for (const tenant of tenants) {
        const idsForTenant = byTenant[tenant.id];
        if (!idsForTenant || idsForTenant.length === 0) continue;

        try {
          // Get Graph API token
          const tokenRes = await fetch(
            `https://login.microsoftonline.com/${tenant.tenantId}/oauth2/v2.0/token`,
            {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                grant_type: "client_credentials",
                client_id: tenant.clientId,
                client_secret: tenant.clientSecret,
                scope: "https://graph.microsoft.com/.default",
              }).toString(),
            }
          );

          if (!tokenRes.ok) {
            console.log(`  Graph API token failed for ${tenant.label} (may need Application.Read.All permission)`);
            continue;
          }
          const { access_token } = await tokenRes.json();

          // Resolve each UUID — UUIDs in Power BI logs are appId values, not objectIds
          for (const uid of idsForTenant) {
            try {
              const spRes = await fetch(
                `https://graph.microsoft.com/v1.0/servicePrincipals?$filter=appId eq '${uid}'&$select=displayName,appDisplayName,appId`,
                { headers: { Authorization: `Bearer ${access_token}` } }
              );
              if (spRes.ok) {
                const spData = await spRes.json();
                if (spData.value && spData.value.length > 0) {
                  const sp = spData.value[0];
                  const name = sp.displayName || sp.appDisplayName || null;
                  if (name) {
                    resolvedNamesCache[uid] = name;
                  }
                }
              }
            } catch {
              // Skip individual resolution failures
            }
          }
        } catch (err) {
          console.log(`  Graph API error for ${tenant.label}: ${err.message}`);
        }
      }

      // Add well-known accounts and own app registrations
      resolvedNamesCache["00000009-0000-0000-c000-000000000000"] = "Power BI Service";

      // Map own app registrations (the apps used for API access)
      for (const tenant of tenants) {
        if (tenant.clientId && !resolvedNamesCache[tenant.clientId]) {
          resolvedNamesCache[tenant.clientId] = `${tenant.label} (API App)`;
        }
      }

      res.json(resolvedNamesCache);
    } catch (err) {
      res.status(500).json({ error: err.message, resolved: resolvedNamesCache });
    }
  });

  /**
   * Extraction status tracking
   */
  const extractionState = {
    running: false,
    lastRun: null,
    lastResult: null,
    eventsExtracted: 0,
  };

  /**
   * GET /api/extract/status — Check extraction status
   */
  app.get("/api/extract/status", (req, res) => {
    res.json(extractionState);
  });

  /**
   * POST /api/extract — Trigger manual extraction
   * Body: { days: number, includeToday: boolean }
   * includeToday=true extracts up to today (may have partial data due to API delay)
   */
  app.post("/api/extract", async (req, res) => {
    if (tenants.length === 0) {
      return res.status(400).json({ error: "No tenants configured. Check your .env file." });
    }
    if (extractionState.running) {
      return res.status(409).json({ error: "Extraction already in progress", state: extractionState });
    }

    const daysBack = req.body.days || 1;
    const includeToday = req.body.includeToday === true;
    extractionState.running = true;
    extractionState.eventsExtracted = 0;

    const rangeDesc = includeToday ? "including today (may be partial)" : "yesterday";
    res.json({ message: `Extraction started for ${daysBack} day(s) ${rangeDesc}...`, tenants: tenants.length });

    try {
      const result = await runExtraction(tenants, daysBack, includeToday);
      extractionState.lastRun = new Date().toISOString();
      extractionState.lastResult = "success";
      extractionState.eventsExtracted = result?.total || 0;
    } catch (err) {
      console.error("Manual extraction error:", err);
      extractionState.lastResult = "error: " + err.message;
    } finally {
      extractionState.running = false;
    }
  });

  /**
   * POST /api/extract/backfill — Extract historical data (up to 30 days - API max)
   */
  app.post("/api/extract/backfill", async (req, res) => {
    if (tenants.length === 0) {
      return res.status(400).json({ error: "No tenants configured." });
    }
    if (extractionState.running) {
      return res.status(409).json({ error: "Extraction already in progress", state: extractionState });
    }

    const days = Math.min(req.body.days || 30, 30); // Max 30 days (Power BI API limit)
    extractionState.running = true;
    extractionState.eventsExtracted = 0;
    res.json({ message: `Backfill started: ${days} days of history...`, tenants: tenants.length });

    try {
      const result = await runExtraction(tenants, days);
      extractionState.lastRun = new Date().toISOString();
      extractionState.lastResult = "success";
      extractionState.eventsExtracted = result?.total || 0;
    } catch (err) {
      console.error("Backfill error:", err);
      extractionState.lastResult = "error: " + err.message;
    } finally {
      extractionState.running = false;
    }
  });

  /**
   * POST /api/explain — Get AI explanation for an operation (OpenRouter)
   */
  app.post("/api/explain", async (req, res) => {
    const { operation, category, user, workspace, item, timestamp, severity, success } = req.body;

    if (!operation) {
      return res.status(400).json({ error: "Operation name required" });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: "OpenRouter API not configured",
        explanation: getStaticExplanation(operation, category)
      });
    }

    try {
      const prompt = `Explain this Power BI activity event with specific context. Use the exact item/workspace names provided.

**Event Details:**
- Operation: ${operation}
- User: ${user || "System"}
- Workspace: ${workspace || "Not specified"}
- Item: ${item || "Not specified"}
- Result: ${success ? "Success" : "FAILED"}

Respond with this EXACT format (use ** for bold headings):

**What Happened**
Explain in 1-2 sentences what "${operation}" means in plain English. Be specific: mention "${item || "the item"}" and "${workspace || "the workspace"}" by name.

**Who & Why**
${user || "System"} performed this action. Explain the likely reason in 1 sentence.

**Impact**
What changed as a result? Be specific to the item "${item || "affected item"}".

**Risk Level**
Low/Medium/High - One sentence explaining the security/audit implication.`;

      const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-exp:free",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 500,
        }),
      });

      if (!orRes.ok) {
        const errText = await orRes.text();
        console.error("OpenRouter API error:", errText);
        return res.json({ explanation: getStaticExplanation(operation, category) });
      }

      const orData = await orRes.json();
      const explanation = orData.choices?.[0]?.message?.content || getStaticExplanation(operation, category);
      res.json({ explanation });
    } catch (err) {
      console.error("OpenRouter API error:", err);
      res.json({ explanation: getStaticExplanation(operation, category) });
    }
  });

  /** Fallback static explanations when Claude API is unavailable */
  function getStaticExplanation(operation, category) {
    const explanations = {
      ViewReport: "User opened and viewed a Power BI report. This is a read-only action that doesn't modify any data.",
      ExportReport: "User exported/downloaded a report. This could include sensitive data leaving the organization.",
      ShareReport: "User shared a report with others. Check if sharing is to internal users or external parties.",
      DeleteReport: "User permanently deleted a report. This is an administrative action that cannot be undone.",
      CreateReport: "User created a new Power BI report from a dataset or data source.",
      EditReport: "User modified an existing report's visuals, filters, or layout.",
      RefreshDataset: "Scheduled or manual data refresh was triggered to update the dataset with new data.",
      SetScheduledRefresh: "User configured automatic refresh schedule for a dataset.",
      GetDatasources: "User or service accessed data source connection information.",
      ViewDashboard: "User opened and viewed a dashboard. This is a read-only action.",
      ShareDashboard: "User shared a dashboard with other users or groups.",
      DeleteDashboard: "User deleted a dashboard from the workspace.",
      PublishToWeb: "User published content publicly to the web. HIGH SECURITY RISK - anyone with the link can view.",
      DownloadReport: "User downloaded a copy of the report file to their local machine.",
    };
    return explanations[operation] || `${operation} is a ${category || "Power BI"} operation. Check Microsoft documentation for detailed information.`;
  }

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
      getLastExtraction().then((lastExtraction) => {
        if (!lastExtraction) {
          const initialDays = parseInt(process.env.INITIAL_EXTRACT_DAYS || "7");
          console.log(`\n📥 First run detected — extracting last ${initialDays} days of history...`);
          runExtraction(tenants, initialDays).catch(console.error);
        }
      });
    }
  });
}

start().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
