/**
 * Database — SQLite storage for activity events
 * Uses better-sqlite3 for synchronous, fast access
 */

const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

let db;

function initDatabase(dbPath) {
  // Ensure directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);

  // Enable WAL mode for better concurrent read/write
  db.pragma("journal_mode = WAL");

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id TEXT,
      timestamp TEXT NOT NULL,
      date TEXT NOT NULL,
      operation TEXT NOT NULL,
      user_id TEXT,
      user_key TEXT,
      organization_id TEXT,
      tenant_id TEXT NOT NULL,
      tenant_label TEXT,
      workspace_name TEXT,
      workspace_id TEXT,
      item_name TEXT,
      item_id TEXT,
      item_type TEXT,
      capacity_id TEXT,
      capacity_name TEXT,
      client_ip TEXT,
      user_agent TEXT,
      is_success INTEGER DEFAULT 1,
      category TEXT,
      severity TEXT DEFAULT 'info',
      raw_json TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(activity_id, tenant_id)
    );

    CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date);
    CREATE INDEX IF NOT EXISTS idx_activities_tenant ON activities(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
    CREATE INDEX IF NOT EXISTS idx_activities_category ON activities(category);
    CREATE INDEX IF NOT EXISTS idx_activities_operation ON activities(operation);
    CREATE INDEX IF NOT EXISTS idx_activities_severity ON activities(severity);
    CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp DESC);

    CREATE TABLE IF NOT EXISTS extraction_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT,
      date_extracted TEXT,
      events_count INTEGER,
      started_at TEXT,
      completed_at TEXT DEFAULT (datetime('now')),
      status TEXT DEFAULT 'success',
      error_message TEXT
    );
  `);

  console.log(`📦 Database ready: ${dbPath}`);
  return db;
}

/**
 * Insert activities (upsert — skip duplicates)
 */
function insertActivities(activities) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO activities (
      activity_id, timestamp, date, operation, user_id, user_key,
      organization_id, tenant_id, tenant_label, workspace_name, workspace_id,
      item_name, item_id, item_type, capacity_id, capacity_name,
      client_ip, user_agent, is_success, category, severity, raw_json
    ) VALUES (
      @activityId, @timestamp, @date, @operation, @userId, @userKey,
      @organizationId, @tenantId, @tenantLabel, @workspaceName, @workspaceId,
      @itemName, @itemId, @itemType, @capacityId, @capacityName,
      @clientIP, @userAgent, @isSuccess, @category, @severity, @rawJson
    )
  `);

  const insertMany = db.transaction((items) => {
    let inserted = 0;
    for (const item of items) {
      const result = stmt.run({
        ...item,
        isSuccess: item.isSuccess ? 1 : 0,
      });
      if (result.changes > 0) inserted++;
    }
    return inserted;
  });

  const count = insertMany(activities);
  console.log(`  💾 Inserted ${count} new events (${activities.length - count} duplicates skipped)`);
  return count;
}

/**
 * Query activities with filters
 */
function queryActivities(filters = {}) {
  let where = ["1=1"];
  let params = {};

  if (filters.tenant) {
    where.push("tenant_id = @tenant");
    params.tenant = filters.tenant;
  }
  if (filters.user) {
    where.push("user_id LIKE @user");
    params.user = `%${filters.user}%`;
  }
  if (filters.category) {
    where.push("category = @category");
    params.category = filters.category;
  }
  if (filters.severity) {
    where.push("severity = @severity");
    params.severity = filters.severity;
  }
  if (filters.operation) {
    where.push("operation = @operation");
    params.operation = filters.operation;
  }
  if (filters.from) {
    where.push("date >= @from");
    params.from = filters.from;
  }
  if (filters.to) {
    where.push("date <= @to");
    params.to = filters.to;
  }
  if (filters.days) {
    where.push("date >= date('now', @days)");
    params.days = `-${filters.days} days`;
  }
  if (filters.search) {
    where.push("(operation LIKE @search OR user_id LIKE @search OR item_name LIKE @search OR workspace_name LIKE @search)");
    params.search = `%${filters.search}%`;
  }

  const limit = filters.limit || 1000;
  const offset = filters.offset || 0;

  const sql = `
    SELECT * FROM activities
    WHERE ${where.join(" AND ")}
    ORDER BY timestamp DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return db.prepare(sql).all(params);
}

/**
 * Get aggregated statistics
 */
function getStats(filters = {}) {
  let where = ["1=1"];
  let params = {};

  if (filters.tenant) { where.push("tenant_id = @tenant"); params.tenant = filters.tenant; }
  if (filters.days) { where.push("date >= date('now', @days)"); params.days = `-${filters.days} days`; }
  if (filters.from) { where.push("date >= @from"); params.from = filters.from; }
  if (filters.to) { where.push("date <= @to"); params.to = filters.to; }

  const whereStr = where.join(" AND ");

  const total = db.prepare(`SELECT COUNT(*) as count FROM activities WHERE ${whereStr}`).get(params);
  const bySeverity = db.prepare(`SELECT severity, COUNT(*) as count FROM activities WHERE ${whereStr} GROUP BY severity`).all(params);
  const byCategory = db.prepare(`SELECT category, COUNT(*) as count FROM activities WHERE ${whereStr} GROUP BY category ORDER BY count DESC`).all(params);
  const byTenant = db.prepare(`SELECT tenant_id, tenant_label, COUNT(*) as count FROM activities WHERE ${whereStr} GROUP BY tenant_id`).all(params);
  const byUser = db.prepare(`SELECT user_id, tenant_id, COUNT(*) as count FROM activities WHERE ${whereStr} GROUP BY user_id ORDER BY count DESC LIMIT 20`).all(params);
  const byDay = db.prepare(`SELECT date, COUNT(*) as total, SUM(CASE WHEN severity='critical' THEN 1 ELSE 0 END) as critical, SUM(CASE WHEN severity='warning' THEN 1 ELSE 0 END) as warning, SUM(CASE WHEN severity='info' THEN 1 ELSE 0 END) as info FROM activities WHERE ${whereStr} GROUP BY date ORDER BY date DESC LIMIT 30`).all(params);
  const failures = db.prepare(`SELECT COUNT(*) as count FROM activities WHERE is_success = 0 AND ${whereStr}`).get(params);
  const uniqueUsers = db.prepare(`SELECT COUNT(DISTINCT user_id) as count FROM activities WHERE ${whereStr}`).get(params);

  return { total: total.count, bySeverity, byCategory, byTenant, byUser, byDay: byDay.reverse(), failures: failures.count, uniqueUsers: uniqueUsers.count };
}

/**
 * Get per-user breakdown
 */
function getUserStats(filters = {}) {
  let where = ["1=1"];
  let params = {};
  if (filters.days) { where.push("date >= date('now', @days)"); params.days = `-${filters.days} days`; }
  if (filters.tenant) { where.push("tenant_id = @tenant"); params.tenant = filters.tenant; }

  return db.prepare(`
    SELECT
      user_id,
      tenant_id,
      tenant_label,
      COUNT(*) as total,
      SUM(CASE WHEN severity='critical' THEN 1 ELSE 0 END) as critical,
      SUM(CASE WHEN severity='warning' THEN 1 ELSE 0 END) as warning,
      SUM(CASE WHEN is_success=0 THEN 1 ELSE 0 END) as failures,
      MAX(timestamp) as last_activity
    FROM activities
    WHERE ${where.join(" AND ")}
    GROUP BY user_id, tenant_id
    ORDER BY total DESC
  `).all(params);
}

/**
 * Log extraction run
 */
function logExtraction(tenantId, dateExtracted, eventsCount, status, error) {
  db.prepare(`
    INSERT INTO extraction_log (tenant_id, date_extracted, events_count, started_at, status, error_message)
    VALUES (?, ?, ?, datetime('now'), ?, ?)
  `).run(tenantId, dateExtracted, eventsCount, status, error || null);
}

function getLastExtraction() {
  return db.prepare("SELECT * FROM extraction_log ORDER BY completed_at DESC LIMIT 1").get();
}

function getDatabase() {
  return db;
}

module.exports = {
  initDatabase,
  insertActivities,
  queryActivities,
  getStats,
  getUserStats,
  logExtraction,
  getLastExtraction,
  getDatabase,
};
