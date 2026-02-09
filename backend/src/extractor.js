/**
 * Extractor — Pulls Activity Log data from Power BI REST API
 * Uses OAuth2 Client Credentials flow for each tenant
 *
 * API: https://learn.microsoft.com/en-us/rest/api/power-bi/admin/get-activity-events
 * Limitation: Can only query 1 day at a time, max 200 requests/hour
 */

const fetch = require("node-fetch");
const { categorize } = require("./categorizer");

/**
 * Extract a meaningful path/name from URL for OneLake operations
 */
function extractPathFromUrl(url) {
  if (!url) return null;
  try {
    // OneLake URLs: https://onelake.dfs.fabric.microsoft.com/workspace/lakehouse/Files/path
    const match = url.match(/\/Files\/(.+?)(?:\?|$)/i) || url.match(/\/Tables\/(.+?)(?:\?|$)/i);
    if (match) return match[1];
    // Get last path segment
    const segments = url.split("/").filter(Boolean);
    return segments[segments.length - 1] || null;
  } catch {
    return null;
  }
}

const TOKEN_URL = (tenantId) =>
  `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

const ACTIVITY_URL = "https://api.powerbi.com/v1.0/myorg/admin/activityevents";

/**
 * Get OAuth2 access token for a tenant using Client Credentials flow
 */
async function getAccessToken(tenantId, clientId, clientSecret) {
  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://analysis.windows.net/powerbi/api/.default",
  });

  const response = await fetch(TOKEN_URL(tenantId), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token error for tenant ${tenantId}: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Fetch activity events for a single day from one tenant
 * Handles pagination via continuationToken
 */
async function fetchDayActivities(accessToken, date) {
  const startDateTime = `'${date}T00:00:00.000Z'`;
  const endDateTime = `'${date}T23:59:59.999Z'`;

  let allEvents = [];
  let url = `${ACTIVITY_URL}?startDateTime=${startDateTime}&endDateTime=${endDateTime}`;

  while (url) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const error = await response.text();
      // Rate limited - wait and retry
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After") || 60;
        console.log(`  ⏳ Rate limited. Waiting ${retryAfter}s...`);
        await sleep(parseInt(retryAfter) * 1000);
        continue;
      }
      throw new Error(`API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    if (data.activityEventEntities) {
      allEvents = allEvents.concat(data.activityEventEntities);
    }

    // Continue pagination if there's a continuation token
    url = data.continuationUri || null;
  }

  return allEvents;
}

/**
 * Extract activities for a date range from one tenant
 */
async function extractTenant(tenantConfig, fromDate, toDate) {
  const { tenantId, clientId, clientSecret, label, id: tenantInternalId } = tenantConfig;

  console.log(`\n🔐 Authenticating: ${label} (${tenantId})...`);
  const token = await getAccessToken(tenantId, clientId, clientSecret);
  console.log(`  ✅ Token acquired`);

  const activities = [];
  const start = new Date(fromDate);
  const end = new Date(toDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    console.log(`  📅 Extracting ${dateStr}...`);

    try {
      const dayEvents = await fetchDayActivities(token, dateStr);
      console.log(`     → ${dayEvents.length} events`);

      // Enrich each event with tenant info and category
      for (const event of dayEvents) {
        const { cat, sev } = categorize(event.Activity || event.Operation);

        // Handle various API field name variations across different operation types
        const workspaceName = event.WorkspaceName || event.WorkSpaceName || event.workspaceName ||
          event.FolderDisplayName || event.LakehouseName || null;

        const itemName = event.ArtifactName || event.ReportName || event.DashboardName ||
          event.DatasetName || event.DataflowName || event.ObjectDisplayName ||
          event.FileName || event.ItemName || event.ObjectId ||
          extractPathFromUrl(event.RequestUrl) || null;

        const itemId = event.ArtifactId || event.ReportId || event.DashboardId ||
          event.DatasetId || event.DataflowId || event.ObjectId || event.ItemId || null;

        // ClientIP can have various names across operation types
        const clientIP = event.ClientIP || event.ClientIp || event.clientIP ||
          event.IpAddress || event.IPAddress || null;

        // UserAgent variations
        const userAgent = event.UserAgent || event.userAgent || event.Browser || null;

        activities.push({
          activityId: event.Id,
          timestamp: event.CreationTime,
          date: event.CreationTime ? event.CreationTime.split("T")[0] : dateStr,
          operation: event.Operation || event.Activity,
          userId: event.UserId || "unknown",
          userKey: event.UserKey || null,
          organizationId: event.OrganizationId || null,
          tenantId: tenantInternalId,
          tenantLabel: label,
          workspaceName: workspaceName,
          workspaceId: event.WorkspaceId || event.workspaceId || null,
          itemName: itemName,
          itemId: itemId,
          itemType: event.ItemType || event.ArtifactType || event.ObjectType || null,
          capacityId: event.CapacityId || null,
          capacityName: event.CapacityName || null,
          clientIP: clientIP,
          userAgent: userAgent,
          isSuccess: event.IsSuccess !== false,
          category: cat,
          severity: sev,
          rawJson: JSON.stringify(event),
        });
      }

      // Small delay to avoid rate limits (200 req/hour = ~1 every 18 seconds)
      await sleep(500);
    } catch (err) {
      console.error(`     ❌ Error on ${dateStr}: ${err.message}`);
    }
  }

  console.log(`  ✅ Total: ${activities.length} events from ${label}`);
  return activities;
}

/**
 * Extract from all configured tenants
 */
async function extractAll(tenants, fromDate, toDate) {
  console.log(`\n${"═".repeat(50)}`);
  console.log(`⚡ Fabric Activity Monitor — Extraction`);
  console.log(`📅 Range: ${fromDate} → ${toDate}`);
  console.log(`🏢 Tenants: ${tenants.length}`);
  console.log(`${"═".repeat(50)}`);

  let allActivities = [];

  for (const tenant of tenants) {
    try {
      const activities = await extractTenant(tenant, fromDate, toDate);
      allActivities = allActivities.concat(activities);
    } catch (err) {
      console.error(`❌ Failed for ${tenant.label}: ${err.message}`);
    }
  }

  console.log(`\n✅ Extraction complete: ${allActivities.length} total events`);
  return allActivities;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { extractAll, extractTenant, getAccessToken };
