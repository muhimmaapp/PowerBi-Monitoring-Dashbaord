/**
 * Cron — Scheduled activity log extraction
 * Runs nightly, pulls yesterday's data from all tenants
 */

const cron = require("node-cron");
const { extractAll } = require("./extractor");
const { insertActivities, logExtraction } = require("./database");

function startCronJob(tenants, schedule = "0 2 * * *") {
  console.log(`⏰ Cron scheduled: "${schedule}" (${describeCron(schedule)})`);

  cron.schedule(schedule, async () => {
    console.log(`\n🔔 [${new Date().toISOString()}] Cron triggered — starting extraction...`);
    await runExtraction(tenants);
  });
}

async function runExtraction(tenants, daysBack = 1, includeToday = false) {
  const toDate = new Date();
  if (!includeToday) {
    toDate.setDate(toDate.getDate() - 1); // Yesterday (default - API has 24h delay)
  }
  const fromDate = new Date(toDate);
  fromDate.setDate(fromDate.getDate() - (daysBack - 1));

  const fromStr = fromDate.toISOString().split("T")[0];
  const toStr = toDate.toISOString().split("T")[0];

  try {
    const activities = await extractAll(tenants, fromStr, toStr);

    if (activities.length > 0) {
      const inserted = await insertActivities(activities);
      for (const tenant of tenants) {
        const tenantCount = activities.filter((a) => a.tenantId === tenant.id).length;
        await logExtraction(tenant.id, toStr, tenantCount, "success");
      }
      console.log(`✅ Extraction complete: ${inserted} new events stored\n`);
    } else {
      console.log(`ℹ️  No new events found\n`);
      for (const tenant of tenants) {
        await logExtraction(tenant.id, toStr, 0, "success");
      }
    }
  } catch (err) {
    console.error(`❌ Extraction failed: ${err.message}\n`);
    for (const tenant of tenants) {
      await logExtraction(tenant.id, toDate.toISOString().split("T")[0], 0, "error", err.message);
    }
  }
}

function describeCron(expr) {
  const parts = expr.split(" ");
  if (parts.length >= 5) {
    return `Daily at ${parts[1].padStart(2, "0")}:${parts[0].padStart(2, "0")} server time`;
  }
  return expr;
}

module.exports = { startCronJob, runExtraction };
