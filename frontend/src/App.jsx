import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, Cell,
} from "recharts";
import { CATEGORIES, SEV_COLORS } from "./data/categories";
import { OPERATIONS, totalOps } from "./data/operations";
import { useActivities } from "./hooks/useActivities";
import ActivityTable from "./components/ActivityTable";

/* ── helpers ────────────────────────────────── */
const COLORS = ["#3b82f6","#22c55e","#f59e0b","#ef4444","#8b5cf6","#ec4899","#06b6d4","#f97316","#14b8a6","#6366f1"];
const avatarColor = (s) => COLORS[Math.abs([...(s||"")].reduce((a, c) => a + c.charCodeAt(0), 0)) % COLORS.length];
const initials = (name) => (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const UTYPE_LABELS = { user: "User", service: "Service", system: "System", app: "App", unknown: "" };
const UTYPE_COLORS = { user: "text-blue-400", service: "text-amber-400", system: "text-purple-400", app: "text-cyan-400", unknown: "text-tx-4" };
const EXTRACT_COOLDOWN = 60; // seconds

export default function App() {
  /* ── auth state ── */
  const [token, setToken] = useState(() => localStorage.getItem("fm_token") || "");
  const [authUser, setAuthUser] = useState(() => localStorage.getItem("fm_user") || "");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Verify existing token on mount
  useEffect(() => {
    if (!token) { setAuthChecked(true); return; }
    fetch("/api/auth/verify", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => { if (!r.ok) { setToken(""); setAuthUser(""); localStorage.removeItem("fm_token"); localStorage.removeItem("fm_user"); } })
      .catch(() => {})
      .finally(() => setAuthChecked(true));
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    const form = new FormData(e.target);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
      });
      const data = await res.json();
      if (!res.ok) { setLoginError(data.error || "Login failed"); return; }
      localStorage.setItem("fm_token", data.token);
      localStorage.setItem("fm_user", data.username);
      setToken(data.token);
      setAuthUser(data.username);
    } catch { setLoginError("Connection error"); }
    finally { setLoginLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem("fm_token");
    localStorage.removeItem("fm_user");
    setToken("");
    setAuthUser("");
  };

  /* ── date range (with debouncing) ── */
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pendingFrom, setPendingFrom] = useState("");
  const [pendingTo, setPendingTo] = useState("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const { activities, tenants, userStats, dateBounds, loading, error, refetch } = useActivities({ from: dateFrom, to: dateTo }, token, handleLogout);

  // Track initial load completion (only after we have a token and data loads)
  useEffect(() => {
    if (!loading && isInitialLoad && token && activities.length > 0) setIsInitialLoad(false);
  }, [loading, isInitialLoad, token, activities.length]);

  // Debounce date changes - only update actual filters after 500ms of no changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDateFrom((prev) => prev !== pendingFrom ? pendingFrom : prev);
      setDateTo((prev) => prev !== pendingTo ? pendingTo : prev);
    }, 500);
    return () => clearTimeout(timer);
  }, [pendingFrom, pendingTo]);

  // Sync pending dates with actual dates when set programmatically (presets)
  const setDates = (from, to) => {
    setPendingFrom(from);
    setPendingTo(to);
    setDateFrom(from);
    setDateTo(to);
  };

  /* ── filters ── */
  const [tenant, setTenant] = useState("all");
  const [cat, setCat] = useState("all");
  const [userF, setUserF] = useState("all");
  const [sev, setSev] = useState("all");
  const [successFilter, setSuccessFilter] = useState("all"); // "all", "ok", "fail"
  const [q, setQ] = useState("");
  const [view, setView] = useState("overview");
  const [exp, setExp] = useState(null);
  const [sort, setSort] = useState({ f: "ts", d: "desc" });
  const [selUser, setSelUser] = useState(null);
  const [userTypeTab, setUserTypeTab] = useState("all"); // "all", "user", "app"
  const [userFilter, setUserFilter] = useState("all"); // "all", "critical", "warning", "failures", "exports", "shares"

  /* ── pagination ── */
  const [page, setPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const PAGE_SIZE = 50;
  const USER_PAGE_SIZE = 20;

  /* ── extraction state ── */
  const [extracting, setExtracting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [extractMsg, setExtractMsg] = useState("");

  /* ── operation detail modal ── */
  const [detailModal, setDetailModal] = useState(null);
  const [explanation, setExplanation] = useState("");
  const [loadingExplain, setLoadingExplain] = useState(false);

  const tableRef = useRef(null);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [tenant, cat, userF, sev, successFilter, q, dateFrom, dateTo]);
  useEffect(() => { setUserPage(1); }, [userTypeTab]);
  useEffect(() => { setUserFilter("all"); }, [selUser]); // Reset user filter when switching users

  // Extract data handler
  const handleExtract = useCallback(async () => {
    if (extracting || cooldown > 0) return;
    setExtracting(true);
    setExtractMsg("Extracting...");
    try {
      const res = await fetch("/api/extract", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ days: 1, includeToday: true }) });
      const data = await res.json();
      if (res.ok) {
        setExtractMsg("Extraction started!");
        setCooldown(EXTRACT_COOLDOWN);
        // Poll for completion and refresh
        setTimeout(async () => {
          const status = await fetch("/api/extract/status", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
          if (!status.running) {
            setExtractMsg(`Done! ${status.eventsExtracted || 0} events`);
            refetch?.();
          }
        }, 5000);
      } else {
        setExtractMsg(data.error || "Failed");
      }
    } catch (err) {
      setExtractMsg("Error: " + err.message);
    } finally {
      setExtracting(false);
      setTimeout(() => setExtractMsg(""), 8000);
    }
  }, [extracting, cooldown, refetch]);

  // Fetch explanation for an operation
  const fetchExplanation = useCallback(async (activity) => {
    setDetailModal(activity);
    setLoadingExplain(true);
    setExplanation("");
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          operation: activity.op,
          category: activity.cat,
          user: activity.user,
          workspace: activity.ws,
          item: activity.item,
          timestamp: activity.ts,
          severity: activity.sev,
          success: activity.ok,
        }),
      });
      const data = await res.json();
      setExplanation(data.explanation || "No explanation available.");
    } catch {
      setExplanation("Failed to load explanation.");
    } finally {
      setLoadingExplain(false);
    }
  }, []);

  const filtered = useMemo(() =>
    activities.filter((a) => {
      if (tenant !== "all" && a.tid !== tenant) return false;
      if (cat !== "all" && a.cat !== cat) return false;
      if (userF !== "all" && a.uid !== userF) return false;
      if (sev !== "all" && a.sev !== sev) return false;
      if (successFilter === "ok" && !a.ok) return false;
      if (successFilter === "fail" && a.ok) return false;
      if (q && !`${a.label} ${a.user} ${a.email} ${a.item} ${a.ws} ${a.op}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    }), [activities, tenant, cat, userF, sev, successFilter, q]);

  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => {
      const av = a[sort.f] || ""; const bv = b[sort.f] || "";
      return sort.d === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
    }), [filtered, sort]);

  const stats = useMemo(() => {
    const byCat = {};
    const opsByCat = {}; // unique operations per category from actual data
    Object.keys(CATEGORIES).forEach((c) => {
      const catEvents = filtered.filter((a) => a.cat === c);
      byCat[c] = catEvents.length;
      opsByCat[c] = new Set(catEvents.map((a) => a.op)).size;
    });
    const byDay = {};
    filtered.forEach((a) => {
      if (!byDay[a.date]) byDay[a.date] = { date: a.date, t: 0, c: 0, w: 0, i: 0 };
      byDay[a.date].t++; byDay[a.date][a.sev?.[0] || "i"]++;
    });
    const tl = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
    const failCount = filtered.filter((a) => !a.ok).length;
    const sr = filtered.length > 0 ? ((filtered.length - failCount) / filtered.length * 100).toFixed(1) : "100";
    const byHour = {}; filtered.forEach((a) => { const h = parseInt(a.time) || 0; byHour[h] = (byHour[h] || 0) + 1; });
    const peakHour = Object.entries(byHour).sort((a, b) => b[1] - a[1])[0];
    const byWs = {}; filtered.forEach((a) => { if (a.ws) byWs[a.ws] = (byWs[a.ws] || 0) + 1; });
    const topWs = Object.entries(byWs).sort((a, b) => b[1] - a[1])[0];
    const exportOps = new Set(["ExportReport","ExportDataflow","ExportTile","ExportActivityEvents","DownloadReport"]);
    const shareOps = new Set(["ShareReport","ShareDashboard","ShareDataset","PublishToWeb"]);
    const adminOps = new Set(["SetScheduledRefresh","TakeOverDataset","UpdateDatasources","DeleteReport","DeleteDataset","DeleteDashboard"]);
    const humanUsers = new Set(filtered.filter((a) => a.utype === "user").map((a) => a.uid));
    const appUsers = new Set(filtered.filter((a) => a.utype === "app" || a.utype === "service").map((a) => a.uid));
    return {
      total: filtered.length, crit: filtered.filter((a) => a.sev === "critical").length,
      warn: filtered.filter((a) => a.sev === "warning").length, fail: failCount,
      users: new Set(filtered.map((a) => a.uid)).size, humanUsers: humanUsers.size, appUsers: appUsers.size,
      sr, byCat, opsByCat, tl,
      avg: tl.length > 0 ? Math.round(filtered.length / tl.length) : 0,
      peakHour: peakHour ? `${peakHour[0]}:00` : "--", peakCount: peakHour ? peakHour[1] : 0,
      topWs: topWs ? topWs[0] : "--", topWsCount: topWs ? topWs[1] : 0,
      exps: filtered.filter((a) => exportOps.has(a.op)).length,
      shrs: filtered.filter((a) => shareOps.has(a.op)).length,
      adms: filtered.filter((a) => adminOps.has(a.op)).length,
    };
  }, [filtered]);

  const togSort = (f) => setSort((p) => (p.f === f ? { f, d: p.d === "asc" ? "desc" : "asc" } : { f, d: "desc" }));
  const catArr = Object.entries(stats.byCat).map(([k, v]) => ({ name: CATEGORIES[k]?.label || k, value: v, color: CATEGORIES[k]?.color || "#666" })).filter((c) => c.value > 0).sort((a, b) => b.value - a.value);

  const uniqueUsersList = useMemo(() => {
    const map = {};
    filtered.forEach((a) => {
      if (!map[a.uid]) map[a.uid] = { uid: a.uid, user: a.user, utype: a.utype, email: a.email, tid: a.tid, tn: a.tn, count: 0, crit: 0, warn: 0 };
      map[a.uid].count++; if (a.sev === "critical") map[a.uid].crit++; if (a.sev === "warning") map[a.uid].warn++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [filtered]);

  // Filter users by type tab
  const filteredUsersList = useMemo(() => {
    if (userTypeTab === "all") return uniqueUsersList;
    if (userTypeTab === "user") return uniqueUsersList.filter((u) => u.utype === "user");
    return uniqueUsersList.filter((u) => u.utype !== "user"); // "app" tab shows apps + services
  }, [uniqueUsersList, userTypeTab]);

  const exportOps = ["ExportReport", "ExportDataflow", "DownloadReport", "ExportTile", "ExportActivityEvents"];
  const shareOps = ["ShareReport", "ShareDashboard", "ShareDataset", "PublishToWeb"];

  const userActivities = useMemo(() => {
    if (!selUser) return sorted;
    let acts = sorted.filter((a) => a.uid === selUser);
    // Apply user-specific filter
    switch (userFilter) {
      case "critical": return acts.filter((a) => a.sev === "critical");
      case "warning": return acts.filter((a) => a.sev === "warning");
      case "failures": return acts.filter((a) => !a.ok);
      case "exports": return acts.filter((a) => exportOps.includes(a.op));
      case "shares": return acts.filter((a) => shareOps.includes(a.op));
      default: return acts;
    }
  }, [sorted, selUser, userFilter]);

  /* ── KPI click handler ── */
  const scrollToTable = () => { tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const kpiClick = (action) => {
    switch (action) {
      case "critical": setSev("critical"); setSuccessFilter("all"); setQ(""); scrollToTable(); break;
      case "warning": setSev("warning"); setSuccessFilter("all"); setQ(""); scrollToTable(); break;
      case "failures": setSev("all"); setSuccessFilter("fail"); setQ(""); scrollToTable(); break;
      case "reset": setSev("all"); setSuccessFilter("all"); setQ(""); break;
      case "users": setView("users"); break;
      case "categories": setView("categories"); break;
      case "exports": setSev("all"); setSuccessFilter("all"); setQ("Export"); scrollToTable(); break;
      case "shares": setSev("all"); setSuccessFilter("all"); setQ("Share"); scrollToTable(); break;
      case "admin": setSev("all"); setSuccessFilter("all"); setQ("Delete"); scrollToTable(); break;
      default: break;
    }
  };

  // Active filter indicator
  const hasActiveFilters = sev !== "all" || successFilter !== "all" || q || tenant !== "all" || userF !== "all" || dateFrom || dateTo;
  const clearAllFilters = () => { setTenant("all"); setUserF("all"); setSev("all"); setSuccessFilter("all"); setCat("all"); setQ(""); setDates("", ""); };

  // ── Auth gates (after all hooks) ──
  if (!authChecked) return (
    <div className="min-h-screen bg-surface-bg flex items-center justify-center">
      <div className="text-tx-3 text-lg animate-pulse">Loading...</div>
    </div>
  );

  if (!token) return (
    <div className="min-h-screen bg-surface-bg flex items-center justify-center">
      <form onSubmit={handleLogin} className="bg-[#131c36] border border-white/10 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-lg font-bold text-white">F</div>
          <div className="text-lg font-bold text-white">Fabric Activity Monitor</div>
        </div>
        {loginError && <div className="mb-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{loginError}</div>}
        <div className="mb-4">
          <label className="block text-tx-3 text-sm mb-1.5">Username</label>
          <input name="username" required autoFocus className="w-full bg-surface-input border border-white/10 rounded-lg px-3 py-2 text-white placeholder-tx-4 focus:outline-none focus:border-blue-500/50" />
        </div>
        <div className="mb-6">
          <label className="block text-tx-3 text-sm mb-1.5">Password</label>
          <div className="relative">
            <input name="password" type={showPassword ? "text" : "password"} required className="w-full bg-surface-input border border-white/10 rounded-lg px-3 py-2 pr-10 text-white placeholder-tx-4 focus:outline-none focus:border-blue-500/50" />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tx-4 hover:text-tx-2 transition-colors cursor-pointer" tabIndex={-1}>
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loginLoading} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-semibold rounded-lg py-2.5 transition-colors cursor-pointer">
          {loginLoading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );

  // Show full-page loading when data hasn't loaded yet
  // Use activities.length === 0 && !error (not just loading) to avoid empty dashboard flash after login
  if (token && activities.length === 0 && !error) return (
    <div className="min-h-screen bg-surface-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        <div className="text-tx-3 text-lg">Loading activity data...</div>
      </div>
    </div>
  );

  return (
    <div className="font-sans bg-surface-bg min-h-screen text-tx-1">
      {/* ── HEADER ── */}
      <header className="bg-gradient-to-r from-[#0c1222] to-[#131c36] border-b border-white/5 px-6 py-3.5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-lg font-bold text-white shadow-lg shadow-blue-500/20">F</div>
          <div>
            <div className="text-[17px] font-bold tracking-tight text-white">Fabric Activity Monitor</div>
            <div className="text-[12px] text-tx-4">
              {Object.keys(CATEGORIES).length} Categories &middot; {totalOps} Operations &middot; {tenants.length} Tenants
              {error && <span className="ml-2 text-red-400">(No data for selected range)</span>}
            </div>
          </div>
          {/* Extract Button */}
          <button onClick={handleExtract} disabled={extracting || cooldown > 0}
            className={`ml-4 px-3 py-1.5 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 transition-all ${extracting || cooldown > 0 ? "bg-gray-600/30 text-tx-4 cursor-not-allowed" : "bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 cursor-pointer"}`}>
            {extracting ? (
              <><span className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" /> Extracting...</>
            ) : cooldown > 0 ? (
              <><span className="font-mono">{cooldown}s</span> Cooldown</>
            ) : (
              <>Sync Now</>
            )}
          </button>
          {extractMsg && <span className="text-[11px] text-tx-3 ml-2">{extractMsg}</span>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleLogout} className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-white/5 text-tx-3 hover:bg-white/10 hover:text-white transition-colors cursor-pointer" title={`Signed in as ${authUser}`}>
            Logout
          </button>
          {/* Date Presets & Range */}
          <div className="flex items-center gap-1 bg-surface-input border border-white/5 rounded-lg p-1">
            {[
              { label: "Today", days: 0 },
              { label: "7D", days: 7 },
              { label: "14D", days: 14 },
              { label: "30D", days: 30 },
            ].map((preset) => {
              const today = new Date().toISOString().split("T")[0];
              const from = preset.days === 0 ? today : new Date(Date.now() - preset.days * 86400000).toISOString().split("T")[0];
              const isActive = dateFrom === from && dateTo === today;
              return (
                <button key={preset.label} onClick={() => setDates(from, today)}
                  className={`px-2 py-1 text-[11px] font-medium rounded transition-all ${isActive ? "bg-blue-500/20 text-blue-400" : "text-tx-3 hover:text-white hover:bg-white/5"}`}>
                  {preset.label}
                </button>
              );
            })}
            <span className="w-px h-4 bg-white/10 mx-1" />
            <input type="date" value={pendingFrom} onChange={(e) => setPendingFrom(e.target.value)} title="From date"
              min={dateBounds.min || undefined} max={dateBounds.max || undefined}
              className="bg-transparent text-tx-1 text-[12px] outline-none cursor-pointer w-[105px]" />
            <span className="text-[10px] text-tx-4">→</span>
            <input type="date" value={pendingTo} onChange={(e) => setPendingTo(e.target.value)} title="To date"
              min={dateBounds.min || undefined} max={dateBounds.max || undefined}
              className="bg-transparent text-tx-1 text-[12px] outline-none cursor-pointer w-[105px]" />
            {(pendingFrom || pendingTo) && (
              <button onClick={() => setDates("", "")} className="text-tx-4 hover:text-red-400 text-[12px] px-1 cursor-pointer" title="Clear dates">&times;</button>
            )}
          </div>
          <Select value={tenant} onChange={setTenant} options={[{ v: "all", l: "All Tenants" }, ...tenants.map((t) => ({ v: t.id, l: t.name }))]} />
          <Select value={userF} onChange={setUserF} className="w-[220px]" options={[{ v: "all", l: `All Users (${uniqueUsersList.length})` }, ...uniqueUsersList.map((u) => ({ v: u.uid, l: `${u.user} (${u.count})` }))]} />
          <Select value={sev} onChange={setSev} className="w-[130px]" options={[{ v: "all", l: "All Severity" }, { v: "critical", l: "Critical" }, { v: "warning", l: "Warning" }, { v: "info", l: "Info" }]} />
          <input placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)}
            className="bg-surface-input text-tx-1 border border-white/5 rounded-lg px-3 py-2 text-[13px] w-48 outline-none focus:border-blue-500/30 placeholder:text-tx-4" />
          {hasActiveFilters && (
            <button onClick={clearAllFilters} className="text-[12px] text-red-400 hover:text-red-300 cursor-pointer px-2 py-1.5 rounded-lg bg-red-500/10">Clear</button>
          )}
        </div>
      </header>

      {/* ── NAV TABS ── */}
      <nav className="flex items-center gap-1 px-6 pt-3 border-b border-white/5">
        {[
          { id: "overview", label: "Overview", color: "#3b82f6" },
          { id: "users", label: "User Activity", color: "#22c55e" },
          { id: "categories", label: "Categories", color: "#8b5cf6" },
          { id: "catalog", label: "Full Catalog", color: "#eab308" },
        ].map((tab) => (
          <button key={tab.id} onClick={() => { setView(tab.id); if (tab.id !== "categories") setCat("all"); }}
            className="px-4 py-2.5 text-[13px] font-semibold cursor-pointer whitespace-nowrap transition-colors border-b-2"
            style={{ borderColor: view === tab.id ? tab.color : "transparent", color: view === tab.id ? tab.color : "#64748b", background: view === tab.id ? tab.color + "08" : "transparent" }}>
            {tab.label}
          </button>
        ))}
        <div className="ml-auto text-[13px] text-tx-3 pb-2 tabnum flex items-center gap-2">
          {loading && <span className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />}
          <span>{filtered.length.toLocaleString()} events</span>
          {(dateFrom || dateTo) && (
            <span className="text-tx-4 text-[11px] bg-white/5 px-2 py-0.5 rounded">
              {dateFrom ? new Date(dateFrom).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Start"}
              {" → "}
              {dateTo ? new Date(dateTo).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Now"}
            </span>
          )}
        </div>
      </nav>

      {/* ── CONTENT ── */}
      <div className="px-6 py-5">

        {/* =========== OVERVIEW =========== */}
        {view === "overview" && <>
          {/* Summary Stats Row */}
          <div className="grid grid-cols-6 gap-3 mb-4">
            <KPI label="Total Events" value={stats.total.toLocaleString()} sub={`${stats.avg}/day avg`} color="#3b82f6" />
            <KPI label="Success Rate" value={`${stats.sr}%`} sub={`${stats.total - stats.fail} succeeded`} color="#22c55e" />
            <KPI label="Active Users" value={stats.humanUsers} sub={`${stats.appUsers} services`} color="#8b5cf6" />
            <KPI label="Avg/Day" value={stats.avg} sub="Last 14 days" color="#06b6d4" />
            <KPI label="Peak Hour" value={stats.peakHour} sub={`${stats.peakCount} events`} color="#ec4899" />
            <KPI label="Top Workspace" value={stats.topWs} sub={`${stats.topWsCount} events`} color="#f97316" small />
          </div>

          {/* Quick Filters Section */}
          <div className="bg-surface-card rounded-xl p-4 border border-white/5 mb-5">
            <div className="text-[12px] text-tx-4 uppercase font-semibold mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              Quick Filters
            </div>
            <div className="grid grid-cols-8 gap-2">
              <FilterChip label="Critical" value={stats.crit} color="#ef4444" onClick={() => kpiClick("critical")} active={sev === "critical"} />
              <FilterChip label="Warnings" value={stats.warn} color="#f59e0b" onClick={() => kpiClick("warning")} active={sev === "warning"} />
              <FilterChip label="Failures" value={stats.fail} color="#f97316" onClick={() => kpiClick("failures")} active={successFilter === "fail"} />
              <FilterChip label="Exports" value={stats.exps} color="#3b82f6" onClick={() => kpiClick("exports")} />
              <FilterChip label="Shares" value={stats.shrs} color="#22c55e" onClick={() => kpiClick("shares")} />
              <FilterChip label="Admin" value={stats.adms} color="#ef4444" onClick={() => kpiClick("admin")} />
              <FilterChip label="Users" value={stats.humanUsers} color="#8b5cf6" onClick={() => kpiClick("users")} icon="👤" />
              <FilterChip label="Categories" value={Object.keys(CATEGORIES).length} color="#a855f7" onClick={() => kpiClick("categories")} icon="📂" />
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-[2fr_1fr] gap-4 mb-5">
            <div className="bg-surface-card rounded-xl p-5 border border-white/5">
              <div className="text-[14px] font-semibold text-tx-1 mb-4">Activity Timeline (Last 14 Days)</div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={stats.tl}>
                  <defs>
                    <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                    <linearGradient id="gw" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3}/><stop offset="100%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
                    <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="100%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => v.slice(5)} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip contentStyle={{ background: "#111a2e", border: "1px solid rgba(148,163,184,0.1)", borderRadius: 8, fontSize: 12, color: "#e2e8f0" }} />
                  <Area type="monotone" dataKey="i" name="Info" stackId="1" stroke="#3b82f6" fill="url(#gi)" />
                  <Area type="monotone" dataKey="w" name="Warning" stackId="1" stroke="#f59e0b" fill="url(#gw)" />
                  <Area type="monotone" dataKey="c" name="Critical" stackId="1" stroke="#ef4444" fill="url(#gc)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-surface-card rounded-xl p-5 border border-white/5">
              <div className="text-[14px] font-semibold text-tx-1 mb-3">Top Categories</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={catArr.slice(0, 8)} layout="vertical" barSize={16}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={110} />
                  <Tooltip contentStyle={{ background: "#111a2e", border: "1px solid rgba(148,163,184,0.1)", borderRadius: 8, fontSize: 12, color: "#e2e8f0" }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>{catArr.slice(0, 8).map((e, i) => <Cell key={i} fill={e.color} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Users */}
          <div className="text-[14px] font-semibold text-tx-1 mb-3">Top Users</div>
          <div className="grid grid-cols-4 gap-3 mb-5">
            {uniqueUsersList.slice(0, 8).map((u) => {
              const col = avatarColor(u.uid);
              const recent = sorted.filter((a) => a.uid === u.uid).slice(0, 3);
              const typeLabel = UTYPE_LABELS[u.utype] || "";
              return (
                <div key={u.uid} onClick={() => { setView("users"); setSelUser(u.uid); }}
                  className="bg-surface-card rounded-xl p-4 border border-white/5 cursor-pointer hover:border-white/10 transition-colors">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0" style={{ background: col }}>{initials(u.user)}</div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-tx-1 truncate">{u.user}</div>
                      <div className="flex items-center gap-1.5">
                        {typeLabel && <span className={`text-[10px] font-medium ${UTYPE_COLORS[u.utype]}`}>{typeLabel}</span>}
                        <span className="text-[10px] text-tx-4 truncate">{u.tn}</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <MiniStat label="Events" value={u.count.toLocaleString()} color="#3b82f6" />
                    <MiniStat label="Critical" value={u.crit} color="#ef4444" />
                    <MiniStat label="Warnings" value={u.warn} color="#f59e0b" />
                  </div>
                  <div className="space-y-1.5">
                    {recent.map((a) => (
                      <div key={a.id} className="flex items-center gap-2 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: SEV_COLORS[a.sev] }} />
                        <span className="text-tx-2 truncate flex-1">{a.label}</span>
                        <span className="text-tx-4 font-mono text-[11px] shrink-0">{a.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Activity Table */}
          <div ref={tableRef} className="text-[14px] font-semibold text-tx-1 mb-3 flex items-center justify-between">
            <span>Latest Activity Log</span>
            <span className="text-[12px] text-tx-4 font-normal">Showing {Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length.toLocaleString()}</span>
          </div>
          <ActivityTable data={sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)} expanded={exp} setExpanded={setExp} sort={sort} onSort={togSort} tenants={tenants} onDetail={fetchExplanation} />
          <Pagination current={page} total={Math.ceil(sorted.length / PAGE_SIZE)} onChange={setPage} />
        </>}

        {/* =========== USER ACTIVITY =========== */}
        {view === "users" && (
          <div className="flex gap-5">
            {/* Sidebar */}
            <div className="w-[280px] shrink-0">
              {/* User type tabs */}
              <div className="flex items-center gap-1 mb-3 bg-surface-card rounded-lg p-1 border border-white/5">
                {[
                  { id: "all", label: "All", count: uniqueUsersList.length },
                  { id: "user", label: "Users", count: uniqueUsersList.filter((u) => u.utype === "user").length },
                  { id: "app", label: "Service", count: uniqueUsersList.filter((u) => u.utype !== "user").length },
                ].map((t) => (
                  <button key={t.id} onClick={() => { setUserTypeTab(t.id); setSelUser(null); }}
                    className={`flex-1 px-2 py-1.5 text-[11px] font-semibold rounded-md cursor-pointer transition-colors ${userTypeTab === t.id ? "bg-blue-500/15 text-blue-400" : "text-tx-4 hover:text-tx-2"}`}>
                    {t.label} ({t.count})
                  </button>
                ))}
              </div>

              <div onClick={() => setSelUser(null)}
                className={`px-4 py-2.5 rounded-lg cursor-pointer text-[13px] font-semibold mb-2 transition-colors ${!selUser ? "bg-blue-500/10 text-blue-400" : "text-tx-3 hover:bg-white/[0.03]"}`}>
                All {userTypeTab === "user" ? "Users" : userTypeTab === "app" ? "Services" : "Users"} ({filteredUsersList.length})
              </div>
              <div className="space-y-0.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {filteredUsersList.slice((userPage - 1) * USER_PAGE_SIZE, userPage * USER_PAGE_SIZE).map((u) => {
                  const col = avatarColor(u.uid); const active = selUser === u.uid;
                  return (
                    <div key={u.uid} onClick={() => setSelUser(u.uid)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${active ? "bg-surface-card border border-white/10" : "hover:bg-white/[0.03]"}`}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: col }}>{initials(u.user)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-medium text-tx-1 truncate">{u.user}</div>
                        <div className="flex items-center gap-1">
                          <span className={`text-[10px] font-medium ${UTYPE_COLORS[u.utype]}`}>{UTYPE_LABELS[u.utype]}</span>
                          <span className="text-[10px] text-tx-4 truncate">{u.tn}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[13px] font-mono text-tx-2 tabnum">{u.count.toLocaleString()}</div>
                        {u.crit > 0 && <div className="text-[10px] text-red-400 font-medium">{u.crit} crit</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
              {filteredUsersList.length > USER_PAGE_SIZE && (
                <div className="mt-2 pt-2 border-t border-white/5">
                  <Pagination current={userPage} total={Math.ceil(filteredUsersList.length / USER_PAGE_SIZE)} onChange={setUserPage} compact />
                </div>
              )}
            </div>

            {/* User content */}
            <div className="flex-1 min-w-0">
              {selUser && (() => {
                const u = uniqueUsersList.find((x) => x.uid === selUser);
                const us = userStats.find((x) => x.uid === selUser);
                if (!u) return null;
                const col = avatarColor(u.uid);
                return (
                  <div className="bg-surface-card rounded-xl p-5 border border-white/5 mb-4">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white" style={{ background: col }}>{initials(u.user)}</div>
                      <div>
                        <div className="text-[18px] font-bold text-white">{u.user}</div>
                        <div className="text-[13px] text-tx-3 font-mono">{u.email}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${u.utype === "user" ? "bg-blue-500/10 text-blue-400" : u.utype === "app" ? "bg-cyan-500/10 text-cyan-400" : "bg-amber-500/10 text-amber-400"}`}>
                            {UTYPE_LABELS[u.utype] || "Unknown"}
                          </span>
                          <span className="text-[12px] text-tx-4">{u.tn}</span>
                          {us?.lastActivity && <span className="text-[12px] text-tx-4">Last active: {new Date(us.lastActivity).toLocaleString()}</span>}
                        </div>
                      </div>
                    </div>
                    {(() => {
                      // Calculate stats from current filtered data (consistent with filter)
                      const userActs = sorted.filter((a) => a.uid === selUser);
                      const critCount = userActs.filter((a) => a.sev === "critical").length;
                      const warnCount = userActs.filter((a) => a.sev === "warning").length;
                      const failCount = userActs.filter((a) => !a.ok).length;
                      const expCount = userActs.filter((a) => exportOps.includes(a.op)).length;
                      const shrCount = userActs.filter((a) => shareOps.includes(a.op)).length;
                      return (
                        <div className="grid grid-cols-6 gap-2.5">
                          <MiniStat label="Total" value={userActs.length.toLocaleString()} color="#3b82f6"
                            onClick={() => setUserFilter("all")} active={userFilter === "all"} />
                          <MiniStat label="Critical" value={critCount} color="#ef4444"
                            onClick={() => setUserFilter(userFilter === "critical" ? "all" : "critical")} active={userFilter === "critical"} />
                          <MiniStat label="Warnings" value={warnCount} color="#f59e0b"
                            onClick={() => setUserFilter(userFilter === "warning" ? "all" : "warning")} active={userFilter === "warning"} />
                          <MiniStat label="Failures" value={failCount} color="#f97316"
                            onClick={() => setUserFilter(userFilter === "failures" ? "all" : "failures")} active={userFilter === "failures"} />
                          <MiniStat label="Exports" value={expCount} color="#06b6d4"
                            onClick={() => setUserFilter(userFilter === "exports" ? "all" : "exports")} active={userFilter === "exports"} />
                          <MiniStat label="Shares" value={shrCount} color="#22c55e"
                            onClick={() => setUserFilter(userFilter === "shares" ? "all" : "shares")} active={userFilter === "shares"} />
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}
              {userFilter !== "all" && (
                <div className="flex items-center gap-2 mb-3 text-[12px]">
                  <span className="text-tx-3">Showing:</span>
                  <span className="px-2 py-1 rounded-md bg-blue-500/15 text-blue-400 font-medium capitalize">{userFilter}</span>
                  <button onClick={() => setUserFilter("all")} className="text-tx-4 hover:text-white transition-colors">Clear filter</button>
                  <span className="text-tx-4 ml-auto">{userActivities.length} events</span>
                </div>
              )}
              <ActivityTable data={userActivities.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)} expanded={exp} setExpanded={setExp} sort={sort} onSort={togSort} tenants={tenants} onDetail={fetchExplanation} />
              <Pagination current={page} total={Math.ceil(userActivities.length / PAGE_SIZE)} onChange={setPage} />
            </div>
          </div>
        )}

        {/* =========== CATEGORIES =========== */}
        {view === "categories" && cat === "all" && <>
          <div className="text-[16px] font-bold text-white mb-1">Activity Categories</div>
          <div className="text-[13px] text-tx-3 mb-5">{Object.keys(CATEGORIES).length} categories tracking {totalOps} operations</div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
            {Object.entries(CATEGORIES).map(([k, c]) => {
              const cnt = stats.byCat[k] || 0;
              const opCnt = stats.opsByCat[k] || 0; // unique operations from actual data
              const totalOpsInCat = OPERATIONS[k]?.length || 0;
              return (
                <div key={k} onClick={() => setCat(k)} className="bg-surface-card rounded-xl p-4 cursor-pointer transition-all border hover:border-white/10"
                  style={{ borderColor: c.color + "15", borderLeftWidth: 3, borderLeftColor: c.color }}>
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold" style={{ background: c.color + "18", color: c.color }}>{c.icon}</div>
                    <span className="text-[14px] font-semibold" style={{ color: c.color }}>{c.label}</span>
                  </div>
                  <div className="text-[12px] text-tx-3 mb-3">{c.desc}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <MiniStat label="Events" value={cnt.toLocaleString()} color={c.color} />
                    <MiniStat label="Operations" value={`${opCnt}/${totalOpsInCat}`} color={c.color} />
                  </div>
                </div>
              );
            })}
          </div>
        </>}

        {view === "categories" && cat !== "all" && <>
          <button onClick={() => setCat("all")} className="text-[13px] text-tx-3 hover:text-blue-400 cursor-pointer mb-3 flex items-center gap-1.5">
            <span>&larr;</span> Back to all categories
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-[13px] font-bold" style={{ background: CATEGORIES[cat]?.color + "18", color: CATEGORIES[cat]?.color }}>{CATEGORIES[cat]?.icon}</div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-[18px] font-bold" style={{ color: CATEGORIES[cat]?.color }}>{CATEGORIES[cat]?.label}</span>
                <span className="text-[12px] px-2.5 py-1 rounded-full font-medium" style={{ background: CATEGORIES[cat]?.color + "15", color: CATEGORIES[cat]?.color }}>{filtered.length} events</span>
              </div>
              <div className="text-[12px] text-tx-3 mt-0.5">{CATEGORIES[cat]?.desc}</div>
            </div>
          </div>
          <div className="text-[12px] text-tx-4 mb-4">Operations: {OPERATIONS[cat]?.map((o) => o.label).join(" \u00B7 ")}</div>
          <ActivityTable data={sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)} expanded={exp} setExpanded={setExp} sort={sort} onSort={togSort} tenants={tenants} onDetail={fetchExplanation} />
          <Pagination current={page} total={Math.ceil(sorted.length / PAGE_SIZE)} onChange={setPage} />
        </>}

        {/* =========== FULL CATALOG =========== */}
        {view === "catalog" && <>
          <div className="text-[16px] font-bold text-white mb-1">Complete Operation Catalog</div>
          <div className="text-[13px] text-tx-3 mb-5">{totalOps} operations across {Object.keys(CATEGORIES).length} categories</div>
          {Object.entries(CATEGORIES).map(([k, c]) => (
            <div key={k} className="mb-5">
              <div className="flex items-center gap-2.5 mb-2 px-4 py-2.5 rounded-xl border" style={{ background: c.color + "08", borderColor: c.color + "15" }}>
                <div className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold" style={{ background: c.color + "18", color: c.color }}>{c.icon}</div>
                <span className="text-[14px] font-bold" style={{ color: c.color }}>{c.label}</span>
                <span className="text-[12px] text-tx-3">{OPERATIONS[k]?.length || 0} operations</span>
                <span className="text-[12px] text-tx-4 ml-auto">{c.desc}</span>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-0.5 pl-3">
                {OPERATIONS[k]?.map((o, i) => (
                  <div key={i} className={`flex items-center gap-2 text-[12px] px-3 py-2 rounded-lg ${i % 2 === 0 ? "bg-transparent" : "bg-white/[0.01]"}`}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: SEV_COLORS[o.sev] }} />
                    <span className="text-tx-1 font-medium">{o.label}</span>
                    <span className="text-tx-4 text-[11px] font-mono ml-auto">{o.op}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>}
      </div>

      {/* Detail Modal */}
      <DetailModal activity={detailModal} explanation={explanation} loading={loadingExplain} onClose={() => setDetailModal(null)} />
    </div>
  );
}

/* ── Reusable Components ──────────────────── */

function KPI({ label, value, sub, color, small, onClick, active }) {
  return (
    <div onClick={onClick}
      className={`bg-surface-card rounded-xl px-4 py-3.5 border transition-colors ${onClick ? "cursor-pointer hover:border-white/10" : ""} ${active ? "border-white/15 ring-1 ring-inset" : "border-white/5"}`}
      style={active ? { ringColor: color + "40" } : undefined}>
      <div className="text-[12px] text-tx-3 mb-1">{label}</div>
      <div className={`${small ? "text-[15px]" : "text-[26px]"} font-bold leading-tight truncate tabnum`} style={{ color }}>{value}</div>
      <div className="text-[11px] text-tx-4 mt-1">{sub}</div>
    </div>
  );
}

function MiniStat({ label, value, color, onClick, active }) {
  return (
    <div onClick={onClick}
      className={`rounded-lg px-2.5 py-2 text-center transition-all ${onClick ? "cursor-pointer hover:scale-105" : ""} ${active ? "ring-2 ring-inset" : ""}`}
      style={{ background: active ? color + "25" : color + "10", ringColor: active ? color : undefined }}>
      <div className="text-[16px] font-bold tabnum" style={{ color }}>{value}</div>
      <div className="text-[10px] text-tx-4 uppercase mt-0.5">{label}</div>
    </div>
  );
}

function FilterChip({ label, value, color, onClick, active, icon }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${active ? "border-white/20 ring-1 ring-inset shadow-lg" : "border-transparent hover:border-white/10"}`}
      style={{ background: active ? color + "20" : color + "10", ringColor: active ? color + "50" : undefined }}>
      {icon && <span className="text-[12px]">{icon}</span>}
      <div className="text-left min-w-0">
        <div className="text-[18px] font-bold tabnum leading-none" style={{ color }}>{value}</div>
        <div className="text-[10px] text-tx-3 mt-0.5 truncate">{label}</div>
      </div>
    </button>
  );
}

function Select({ value, onChange, options, className = "w-[170px]" }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className={`bg-surface-input text-tx-1 border border-white/5 rounded-lg px-3 py-2 text-[13px] cursor-pointer outline-none focus:border-blue-500/30 ${className}`}>
      {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );
}

function Pagination({ current, total, onChange, compact }) {
  if (total <= 1) return null;

  const pages = [];
  const maxVisible = compact ? 3 : 7;
  let start = Math.max(1, current - Math.floor(maxVisible / 2));
  let end = Math.min(total, start + maxVisible - 1);
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

  if (start > 1) { pages.push(1); if (start > 2) pages.push("..."); }
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total) { if (end < total - 1) pages.push("..."); pages.push(total); }

  return (
    <div className={`flex items-center justify-center gap-1 ${compact ? "mt-1" : "mt-4"}`}>
      <button onClick={() => onChange(Math.max(1, current - 1))} disabled={current === 1}
        className={`px-2 py-1 text-[12px] rounded ${current === 1 ? "text-tx-4 cursor-not-allowed" : "text-tx-2 hover:bg-white/5 cursor-pointer"}`}>&larr;</button>
      {pages.map((p, i) => (
        <button key={i} onClick={() => typeof p === "number" && onChange(p)} disabled={p === "..."}
          className={`min-w-[28px] px-2 py-1 text-[12px] rounded font-medium transition-colors ${p === current ? "bg-blue-500/20 text-blue-400" : p === "..." ? "text-tx-4 cursor-default" : "text-tx-2 hover:bg-white/5 cursor-pointer"}`}>
          {p}
        </button>
      ))}
      <button onClick={() => onChange(Math.min(total, current + 1))} disabled={current === total}
        className={`px-2 py-1 text-[12px] rounded ${current === total ? "text-tx-4 cursor-not-allowed" : "text-tx-2 hover:bg-white/5 cursor-pointer"}`}>&rarr;</button>
    </div>
  );
}

function DetailModal({ activity, explanation, loading, onClose }) {
  if (!activity) return null;
  const c = CATEGORIES[activity.cat];

  // Format explanation with markdown-like styling
  const formatExplanation = (text) => {
    if (!text) return null;
    return text.split("\n").map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={i} className="h-3" />;
      // Section headers **Header** or **Header:**
      if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
        const header = trimmed.replace(/\*\*/g, "");
        return <div key={i} className="text-[14px] font-bold text-violet-400 mt-4 mb-1 first:mt-0">{header}</div>;
      }
      // Inline bold **text** with content after
      if (trimmed.startsWith("**") && trimmed.includes("**")) {
        const match = trimmed.match(/^\*\*(.+?)\*\*(.*)$/);
        if (match) {
          return (
            <div key={i} className="my-1">
              <span className="text-[13px] font-bold text-violet-400">{match[1]}</span>
              <span className="text-tx-2">{match[2]}</span>
            </div>
          );
        }
      }
      // Bullet points
      if (trimmed.startsWith("•") || trimmed.startsWith("-")) {
        const content = trimmed.replace(/^[•\-]\s*/, "");
        return (
          <div key={i} className="flex gap-2 ml-2 my-0.5">
            <span className="text-violet-400/60 mt-0.5">•</span>
            <span className="text-tx-2">{content}</span>
          </div>
        );
      }
      // Risk level highlighting
      if (trimmed.toLowerCase().includes("risk level") || trimmed.toLowerCase().startsWith("low") || trimmed.toLowerCase().startsWith("medium") || trimmed.toLowerCase().startsWith("high")) {
        const isHigh = trimmed.toLowerCase().includes("high");
        const isMedium = trimmed.toLowerCase().includes("medium");
        return (
          <div key={i} className={`my-0.5 font-medium ${isHigh ? "text-red-400" : isMedium ? "text-amber-400" : "text-green-400"}`}>
            {trimmed}
          </div>
        );
      }
      return <div key={i} className="text-tx-2 my-0.5 leading-relaxed">{trimmed}</div>;
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface-panel rounded-2xl border border-white/10 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-start justify-between sticky top-0 bg-surface-panel z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: SEV_COLORS[activity.sev] }} />
              <span className="text-[18px] font-bold text-white">{activity.label}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${activity.ok ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                {activity.ok ? "SUCCESS" : "FAILED"}
              </span>
            </div>
            <div className="text-[13px] text-tx-3 font-mono">{activity.op}</div>
          </div>
          <button onClick={onClose} className="text-tx-4 hover:text-white text-xl cursor-pointer p-1">&times;</button>
        </div>

        {/* Details Grid */}
        <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-3 gap-4 border-b border-white/5 bg-black/20">
          <DetailItem label="User" value={activity.user} />
          <DetailItem label="Email / ID" value={activity.email} mono />
          <DetailItem label="Tenant" value={activity.tn} />
          <DetailItem label="Category" value={c?.label || activity.cat} color={c?.color} />
          <DetailItem label="Workspace" value={activity.ws || "-"} />
          <DetailItem label="Item" value={activity.item || "-"} />
          <DetailItem label="Timestamp (KSA)" value={activity.tsDisplay || activity.ts} mono />
          <DetailItem label="Client IP" value={activity.ip || "-"} mono />
          <DetailItem label="Severity" value={activity.sev?.toUpperCase()} color={SEV_COLORS[activity.sev]} />
        </div>

        {/* AI Explanation */}
        <div className="px-6 py-5">
          <div className="text-[12px] text-tx-4 uppercase font-semibold mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-gradient-to-br from-violet-500/30 to-blue-500/30 text-violet-400 flex items-center justify-center text-[10px] font-bold">AI</span>
            Security & Audit Analysis
          </div>
          <div className="bg-black/30 rounded-xl p-5 text-[13px] leading-relaxed border border-white/5">
            {loading ? (
              <div className="flex items-center justify-center gap-3 py-8 text-tx-4">
                <span className="w-5 h-5 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                <span>Analyzing operation with AI...</span>
              </div>
            ) : (
              <div className="space-y-0.5">{formatExplanation(explanation) || "No explanation available."}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value, mono, color }) {
  return (
    <div>
      <div className="text-[10px] text-tx-4 uppercase mb-0.5">{label}</div>
      <div className={`text-[13px] ${mono ? "font-mono" : ""} break-all`} style={color ? { color } : { color: "#e2e8f0" }}>
        {value || "-"}
      </div>
    </div>
  );
}
