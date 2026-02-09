import { useState, useEffect, useCallback } from "react";
import { OPERATIONS } from "../data/operations";

/** Format timestamp to KSA (Riyadh) timezone */
function formatKSA(timestamp) {
  if (!timestamp) return { date: "", time: "", fullTime: "" };
  const d = new Date(timestamp);
  // Format for KSA timezone (Asia/Riyadh = UTC+3)
  const options = { timeZone: "Asia/Riyadh" };
  const dateStr = d.toLocaleDateString("en-CA", options); // YYYY-MM-DD format
  const timeStr = d.toLocaleTimeString("en-US", {
    ...options,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }); // e.g., "2:30 PM"
  const fullTimeStr = d.toLocaleString("en-US", {
    ...options,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }); // e.g., "Feb 5, 2026, 2:30:45 PM"
  return { date: dateStr, time: timeStr, fullTime: fullTimeStr };
}

/** Extract display name from email or system ID */
function displayName(uid, resolvedNames) {
  if (!uid || uid.trim() === "" || uid === "None") return "System Process";
  // Check resolved names first (from Graph API)
  if (resolvedNames && resolvedNames[uid]) return resolvedNames[uid];
  // Email-based users
  if (uid.includes("@")) {
    const local = uid.split("@")[0];
    return local
      .split(".")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }
  if (uid === "00000009-0000-0000-c000-000000000000") return "Power BI Service";
  if (uid.toLowerCase() === "powerbi") return "Power BI System";
  if (uid.toLowerCase() === "system") return "System Process";
  if (/^[0-9a-f]{8}-/.test(uid)) return "App " + uid.slice(0, 8);
  return uid || "Unknown";
}

/** Determine user type label */
function userType(uid) {
  if (!uid || uid === "None") return "system";
  if (uid.includes("@")) return "user";
  if (uid === "00000009-0000-0000-c000-000000000000") return "service";
  if (uid.toLowerCase() === "powerbi") return "system";
  if (/^[0-9a-f]{8}-/.test(uid)) return "app";
  return "unknown";
}

/** Lookup operation label from our catalog */
function opLabel(operation, category) {
  if (!operation) return "";
  const ops = OPERATIONS[category];
  if (ops) {
    const match = ops.find((o) => o.op === operation);
    if (match) return match.label;
  }
  for (const cat of Object.values(OPERATIONS)) {
    const m = cat.find((o) => o.op === operation);
    if (m) return m.label;
  }
  return operation.replace(/([A-Z])/g, " $1").trim();
}

/* -- main hook ------------------------------- */
export function useActivities(dateRange, token, onAuthFail) {
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
  const authFetch = (url, opts = {}) =>
    fetch(url, { ...opts, headers: { ...authHeaders, ...opts.headers } }).then((r) => {
      if (r.status === 401 && onAuthFail) onAuthFail();
      return r;
    });
  const [activities, setActivities] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [userStats, setUserStats] = useState([]);
  const [resolvedNames, setResolvedNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetchKey, setFetchKey] = useState(0);
  const [dateBounds, setDateBounds] = useState({ min: null, max: null });

  const from = dateRange?.from || "";
  const to = dateRange?.to || "";

  const refetch = useCallback(() => setFetchKey((k) => k + 1), []);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    async function fetchData() {
      setLoading(true);
      setError(null); // Clear any previous error
      try {
        // Build activity URL with date params (no limit for full data)
        let actUrl = "/api/activities?limit=100000";
        if (from && to) {
          actUrl += `&from=${from}&to=${to}`;
        } else if (from) {
          actUrl += `&from=${from}`;
        } else if (to) {
          actUrl += `&to=${to}`;
        } else {
          actUrl += "&days=30";
        }

        const [actRes, tenantRes, userRes] = await Promise.all([
          authFetch(actUrl),
          authFetch("/api/tenants"),
          authFetch("/api/activities/users?days=90"),
        ]);
        if (!actRes.ok) throw new Error("API unavailable");
        const actJson = await actRes.json();
        const data = actJson.activities || actJson.data || [];
        if (data.length === 0) throw new Error("No data");

        // Also fetch resolved names (non-blocking)
        let names = resolvedNames;
        try {
          const resolveRes = await authFetch("/api/users/resolve");
          if (resolveRes.ok) {
            names = await resolveRes.json();
            setResolvedNames(names);
          }
        } catch {
          // Resolved names are optional
        }

        const mapped = data.map((a, i) => {
          const cat = a.category || "reports";
          const ksa = formatKSA(a.timestamp);
          return {
            id: a.activity_id || `a${i}`,
            ts: a.timestamp, // Keep original ISO timestamp for sorting
            tsDisplay: ksa.fullTime || a.timestamp, // Formatted display
            date: ksa.date || a.date,
            time: ksa.time,
            uid: a.user_id || "",
            user: displayName(a.user_id, names),
            utype: userType(a.user_id),
            email: a.user_id || "",
            tid: a.tenant_id || "",
            tn: a.tenant_label || "",
            cat,
            op: a.operation || "",
            label: opLabel(a.operation, cat),
            sev: a.severity || "info",
            ws: a.workspace_name || "",
            item: a.item_name || "",
            ok: a.is_success !== 0,
            ip: a.client_ip || "",
            capacity: a.capacity_name || "",
            userAgent: a.user_agent || "",
            resultStatus: a.result_status || null,
            failureReason: a.failure_reason || null,
            requestId: a.request_id || null,
            distributionMethod: a.distribution_method || null,
            artifactType: a.consumed_artifact_type || a.item_type || null,
          };
        });
        setActivities(mapped);

        if (tenantRes.ok) {
          const td = await tenantRes.json();
          if (td.length)
            setTenants(td.map((t) => ({ id: t.id, name: t.label })));
        }

        if (userRes.ok) {
          const us = await userRes.json();
          setUserStats(
            us.map((u) => ({
              uid: u.user_id,
              name: displayName(u.user_id, names),
              utype: userType(u.user_id),
              email: u.user_id,
              tid: u.tenant_id,
              tn: u.tenant_label,
              total: u.total,
              critical: parseInt(u.critical) || 0,
              warning: parseInt(u.warning) || 0,
              failures: parseInt(u.failures) || 0,
              lastActivity: u.last_activity,
            }))
          );
        }

        // Fetch date bounds from API
        try {
          const boundsRes = await authFetch("/api/activities/bounds");
          if (boundsRes.ok) {
            const bounds = await boundsRes.json();
            setDateBounds({ min: bounds.min_date, max: bounds.max_date });
          }
        } catch {
          // Date bounds are optional
        }
      } catch (err) {
        setActivities([]);
        setError(err.message || "Failed to load activities");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [from, to, fetchKey, token]);

  return { activities, tenants, userStats, resolvedNames, dateBounds, loading, error, refetch };
}
