/**
 * One-time migration: backfill new columns from raw_json
 */
require("dotenv").config();
const mysql = require("mysql2/promise");

(async () => {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const BATCH = 500;
  let offset = 0, updated = 0;

  while (true) {
    const [rows] = await pool.query(
      "SELECT id, raw_json, client_ip, workspace_name, item_name, item_type, capacity_name FROM activities WHERE raw_json IS NOT NULL LIMIT ? OFFSET ?",
      [BATCH, offset]
    );
    if (!rows.length) break;

    for (const row of rows) {
      try {
        const raw = JSON.parse(row.raw_json);
        const sets = [];
        const vals = [];

        const rs = raw.ResultStatus || raw.resultStatus || null;
        if (rs) { sets.push("result_status=?"); vals.push(rs); }

        const fr = raw.FailureReason || raw.ErrorMessage || raw.Error || null;
        if (fr) { sets.push("failure_reason=?"); vals.push(fr); }

        const ri = raw.RequestId || raw.requestId || null;
        if (ri) { sets.push("request_id=?"); vals.push(ri); }

        const dm = raw.DistributionMethod || raw.SharingAction || null;
        if (dm) { sets.push("distribution_method=?"); vals.push(dm); }

        const cat = raw.ConsumedArtifactType || raw.ArtifactType || null;
        if (cat) { sets.push("consumed_artifact_type=?"); vals.push(cat); }

        if (!row.client_ip) {
          const ip = raw.ClientIP || raw.ClientIp || raw.IpAddress || null;
          if (ip) { sets.push("client_ip=?"); vals.push(ip); }
        }
        if (!row.workspace_name) {
          const ws = raw.WorkSpaceName || raw.WorkspaceName || raw.FolderDisplayName || null;
          if (ws) { sets.push("workspace_name=?"); vals.push(ws); }
        }
        if (!row.item_name || /^[0-9a-f]{8}-/.test(row.item_name)) {
          const iname = raw.ArtifactName || raw.ReportName || raw.DashboardName || raw.DatasetName || raw.ItemName || null;
          if (iname) { sets.push("item_name=?"); vals.push(iname); }
        }
        if (!row.item_type) {
          const it = raw.ItemType || raw.ArtifactType || raw.ObjectType || null;
          if (it) { sets.push("item_type=?"); vals.push(it); }
        }
        if (!row.capacity_name) {
          const cn = raw.CapacityName || null;
          if (cn) { sets.push("capacity_name=?"); vals.push(cn); }
        }

        if (sets.length > 0) {
          vals.push(row.id);
          await pool.query("UPDATE activities SET " + sets.join(",") + " WHERE id=?", vals);
          updated++;
        }
      } catch (e) { /* skip parse errors */ }
    }
    offset += BATCH;
    console.log(`Processed ${offset} rows, updated ${updated}`);
  }

  console.log(`\nDone! Updated ${updated} rows total`);
  await pool.end();
})();
