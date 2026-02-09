/**
 * Manual Extraction Script
 * Run: npm run extract
 *
 * Use this to test your credentials and do initial data load
 */

require("dotenv").config();
const { initDatabase, insertActivities } = require("../src/database");
const { extractAll } = require("../src/extractor");

const DAYS_BACK = parseInt(process.argv[2] || process.env.INITIAL_EXTRACT_DAYS || "7");

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306"),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "fabric_monitor",
};

async function main() {
  console.log("⚡ Fabric Activity Monitor — Manual Extraction");
  console.log(`📅 Extracting last ${DAYS_BACK} days\n`);

  // Init database
  await initDatabase(dbConfig);

  // Build tenant configs
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

  if (tenants.length === 0) {
    console.error("❌ No tenants configured! Check your .env file.");
    console.error("   Required: TENANT_ID_A, CLIENT_ID_A, CLIENT_SECRET_A");
    process.exit(1);
  }

  console.log(`🏢 Tenants: ${tenants.map((t) => t.label).join(", ")}\n`);

  // Calculate date range
  const toDate = new Date();
  toDate.setDate(toDate.getDate() - 1); // Yesterday
  const fromDate = new Date(toDate);
  fromDate.setDate(fromDate.getDate() - (DAYS_BACK - 1));

  const fromStr = fromDate.toISOString().split("T")[0];
  const toStr = toDate.toISOString().split("T")[0];

  try {
    const activities = await extractAll(tenants, fromStr, toStr);

    if (activities.length > 0) {
      const inserted = await insertActivities(activities);
      console.log(`\n🎉 Done! ${inserted} new events stored in database.`);
      console.log(`   Start the server with: npm start`);
    } else {
      console.log("\nℹ️  No activities found. This could mean:");
      console.log("   - No user activity in the specified period");
      console.log("   - API permissions not yet propagated (wait 15 min)");
      console.log("   - Check your credentials");
    }
  } catch (err) {
    console.error(`\n❌ Extraction failed: ${err.message}`);
    console.error("\nTroubleshooting:");
    console.error("  1. Check TENANT_ID, CLIENT_ID, CLIENT_SECRET in .env");
    console.error("  2. Verify admin consent was granted in Azure portal");
    console.error('  3. Ensure "Allow service principals to use read-only admin APIs" is enabled in Power BI Admin Portal');
    console.error("  4. Wait 15 minutes after enabling settings");
    process.exit(1);
  }

  process.exit(0);
}

main();
