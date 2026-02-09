/**
 * Database — MariaDB storage for activity events
 * Uses mysql2 with connection pooling for async access
 */

const mysql = require("mysql2/promise");

let pool;

async function initDatabase(config) {
  pool = mysql.createPool({
    host: config.host || "localhost",
    port: config.port || 3306,
    user: config.user || "root",
    password: config.password || "",
    database: config.database || "fabric_monitor",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: "utf8mb4",
  });

  // Create tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS activities (
      id INT AUTO_INCREMENT PRIMARY KEY,
      activity_id VARCHAR(255),
      timestamp DATETIME NOT NULL,
      date DATE NOT NULL,
      operation VARCHAR(255) NOT NULL,
      user_id VARCHAR(255),
      user_key VARCHAR(255),
      organization_id VARCHAR(255),
      tenant_id VARCHAR(255) NOT NULL,
      tenant_label VARCHAR(255),
      workspace_name VARCHAR(255),
      workspace_id VARCHAR(255),
      item_name VARCHAR(500),
      item_id VARCHAR(255),
      item_type VARCHAR(255),
      capacity_id VARCHAR(255),
      capacity_name VARCHAR(255),
      client_ip VARCHAR(45),
      user_agent TEXT,
      is_success TINYINT DEFAULT 1,
      category VARCHAR(100),
      severity VARCHAR(20) DEFAULT 'info',
      raw_json LONGTEXT,
      result_status VARCHAR(255) DEFAULT NULL,
      failure_reason TEXT DEFAULT NULL,
      request_id VARCHAR(255) DEFAULT NULL,
      distribution_method VARCHAR(255) DEFAULT NULL,
      consumed_artifact_type VARCHAR(255) DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_activity (activity_id, tenant_id),
      INDEX idx_date (date),
      INDEX idx_tenant (tenant_id),
      INDEX idx_user (user_id),
      INDEX idx_category (category),
      INDEX idx_operation (operation),
      INDEX idx_severity (severity),
      INDEX idx_timestamp (timestamp)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS extraction_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id VARCHAR(255),
      date_extracted DATE,
      events_count INT,
      started_at DATETIME,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(50) DEFAULT 'success',
      error_message TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  console.log(`📦 Database ready: ${config.host}:${config.port}/${config.database}`);
  return pool;
}

/**
 * Insert activities (upsert — skip duplicates)
 */
async function insertActivities(activities) {
  if (!activities.length) return 0;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const sql = `
      INSERT IGNORE INTO activities (
        activity_id, timestamp, date, operation, user_id, user_key,
        organization_id, tenant_id, tenant_label, workspace_name, workspace_id,
        item_name, item_id, item_type, capacity_id, capacity_name,
        client_ip, user_agent, is_success, category, severity, raw_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    let inserted = 0;
    for (const item of activities) {
      const [result] = await conn.query(sql, [
        item.activityId,
        item.timestamp,
        item.date,
        item.operation,
        item.userId,
        item.userKey,
        item.organizationId,
        item.tenantId,
        item.tenantLabel,
        item.workspaceName,
        item.workspaceId,
        item.itemName,
        item.itemId,
        item.itemType,
        item.capacityId,
        item.capacityName,
        item.clientIP,
        item.userAgent,
        item.isSuccess ? 1 : 0,
        item.category,
        item.severity,
        item.rawJson,
      ]);
      if (result.affectedRows > 0) inserted++;
    }

    await conn.commit();
    console.log(`  💾 Inserted ${inserted} new events (${activities.length - inserted} duplicates skipped)`);
    return inserted;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Query activities with filters
 */
async function queryActivities(filters = {}) {
  let where = ["1=1"];
  let params = [];

  if (filters.tenant) {
    where.push("tenant_id = ?");
    params.push(filters.tenant);
  }
  if (filters.user) {
    where.push("user_id LIKE ?");
    params.push(`%${filters.user}%`);
  }
  if (filters.category) {
    where.push("category = ?");
    params.push(filters.category);
  }
  if (filters.severity) {
    where.push("severity = ?");
    params.push(filters.severity);
  }
  if (filters.operation) {
    where.push("operation = ?");
    params.push(filters.operation);
  }
  if (filters.from) {
    where.push("date >= ?");
    params.push(filters.from);
  }
  if (filters.to) {
    where.push("date <= ?");
    params.push(filters.to);
  }
  if (filters.days) {
    where.push("date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)");
    params.push(filters.days);
  }
  if (filters.search) {
    where.push("(operation LIKE ? OR user_id LIKE ? OR item_name LIKE ? OR workspace_name LIKE ?)");
    const s = `%${filters.search}%`;
    params.push(s, s, s, s);
  }

  const limit = filters.limit || 1000;
  const offset = filters.offset || 0;

  const sql = `
    SELECT activity_id, timestamp, date, operation, user_id, tenant_id, tenant_label,
           workspace_name, item_name, item_type, capacity_name, client_ip, user_agent,
           is_success, category, severity, result_status, failure_reason, request_id,
           distribution_method, consumed_artifact_type
    FROM activities
    WHERE ${where.join(" AND ")}
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `;
  params.push(limit, offset);

  const [rows] = await pool.query(sql, params);
  return rows;
}

/**
 * Get aggregated statistics
 */
async function getStats(filters = {}) {
  let where = ["1=1"];
  let params = [];

  if (filters.tenant) {
    where.push("tenant_id = ?");
    params.push(filters.tenant);
  }
  if (filters.days) {
    where.push("date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)");
    params.push(filters.days);
  }
  if (filters.from) {
    where.push("date >= ?");
    params.push(filters.from);
  }
  if (filters.to) {
    where.push("date <= ?");
    params.push(filters.to);
  }

  const whereStr = where.join(" AND ");

  // Each query needs its own copy of params
  const [totalRows] = await pool.query(`SELECT COUNT(*) as count FROM activities WHERE ${whereStr}`, [...params]);
  const [bySeverity] = await pool.query(`SELECT severity, COUNT(*) as count FROM activities WHERE ${whereStr} GROUP BY severity`, [...params]);
  const [byCategory] = await pool.query(`SELECT category, COUNT(*) as count FROM activities WHERE ${whereStr} GROUP BY category ORDER BY count DESC`, [...params]);
  const [byTenant] = await pool.query(`SELECT tenant_id, tenant_label, COUNT(*) as count FROM activities WHERE ${whereStr} GROUP BY tenant_id, tenant_label`, [...params]);
  const [byUser] = await pool.query(`SELECT user_id, tenant_id, COUNT(*) as count FROM activities WHERE ${whereStr} GROUP BY user_id, tenant_id ORDER BY count DESC LIMIT 20`, [...params]);
  const [byDay] = await pool.query(
    `SELECT date, COUNT(*) as total,
      SUM(CASE WHEN severity='critical' THEN 1 ELSE 0 END) as critical,
      SUM(CASE WHEN severity='warning' THEN 1 ELSE 0 END) as warning,
      SUM(CASE WHEN severity='info' THEN 1 ELSE 0 END) as info
    FROM activities WHERE ${whereStr} GROUP BY date ORDER BY date DESC LIMIT 30`,
    [...params]
  );
  const [failureRows] = await pool.query(`SELECT COUNT(*) as count FROM activities WHERE is_success = 0 AND ${whereStr}`, [...params]);
  const [uniqueUserRows] = await pool.query(`SELECT COUNT(DISTINCT user_id) as count FROM activities WHERE ${whereStr}`, [...params]);

  return {
    total: totalRows[0].count,
    bySeverity,
    byCategory,
    byTenant,
    byUser,
    byDay: byDay.reverse(),
    failures: failureRows[0].count,
    uniqueUsers: uniqueUserRows[0].count,
  };
}

/**
 * Get per-user breakdown
 */
async function getUserStats(filters = {}) {
  let where = ["1=1"];
  let params = [];

  if (filters.days) {
    where.push("date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)");
    params.push(filters.days);
  }
  if (filters.tenant) {
    where.push("tenant_id = ?");
    params.push(filters.tenant);
  }

  const [rows] = await pool.query(
    `SELECT
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
    GROUP BY user_id, tenant_id, tenant_label
    ORDER BY total DESC`,
    params
  );
  return rows;
}

/**
 * Log extraction run
 */
async function logExtraction(tenantId, dateExtracted, eventsCount, status, error) {
  await pool.query(
    `INSERT INTO extraction_log (tenant_id, date_extracted, events_count, started_at, status, error_message)
     VALUES (?, ?, ?, NOW(), ?, ?)`,
    [tenantId, dateExtracted, eventsCount, status, error || null]
  );
}

async function getLastExtraction() {
  const [rows] = await pool.query("SELECT * FROM extraction_log ORDER BY completed_at DESC LIMIT 1");
  return rows[0] || null;
}

async function getDateBounds() {
  const [rows] = await pool.query(`
    SELECT
      DATE_FORMAT(MIN(timestamp), '%Y-%m-%d') as min_date,
      DATE_FORMAT(MAX(timestamp), '%Y-%m-%d') as max_date
    FROM activities
  `);
  return rows[0] || { min_date: null, max_date: null };
}

function getPool() {
  return pool;
}

module.exports = {
  initDatabase,
  insertActivities,
  queryActivities,
  getStats,
  getUserStats,
  logExtraction,
  getLastExtraction,
  getDateBounds,
  getPool,
};
