import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, Cell } from "recharts";

const CATEGORIES = {
  reports: { label: "Reports", icon: "📊", color: "#22c55e", desc: "View, create, edit, export, print, share reports" },
  dashboards: { label: "Dashboards", icon: "📋", color: "#3b82f6", desc: "Dashboard & tile operations" },
  datasets: { label: "Semantic Models", icon: "💾", color: "#ec4899", desc: "Dataset/model refresh, edit, parameters" },
  dataflows: { label: "Dataflows", icon: "🌊", color: "#06b6d4", desc: "Dataflow create, refresh, schedule, export" },
  workspaces: { label: "Workspaces", icon: "🏗️", color: "#f97316", desc: "Workspace create, update, delete, access" },
  pipelines: { label: "Pipelines", icon: "🚀", color: "#a855f7", desc: "ALM pipeline deploy, assign, configure" },
  gateways: { label: "Gateways", icon: "🔌", color: "#64748b", desc: "Gateway cluster, datasource, credentials" },
  apps: { label: "Apps", icon: "📦", color: "#f59e0b", desc: "App install, publish, template operations" },
  capacity: { label: "Capacity & Admin", icon: "⚡", color: "#ef4444", desc: "Capacity settings, admin switches, keys" },
  security: { label: "Security & DLP", icon: "🔐", color: "#dc2626", desc: "Labels, DLP, encryption, access controls" },
  lakehouse: { label: "Lakehouse", icon: "🏠", color: "#10b981", desc: "Files, folders, tables, shortcuts" },
  warehouse: { label: "Warehouse", icon: "🗄️", color: "#8b5cf6", desc: "Warehouse, SQL analytics, queries" },
  onelake: { label: "OneLake", icon: "☁️", color: "#0ea5e9", desc: "Blob, file, container operations" },
  git: { label: "Git", icon: "🔀", color: "#6366f1", desc: "Git connect, commit, branch, sync" },
  notebooks: { label: "Notebooks", icon: "📓", color: "#d946ef", desc: "Notebook sessions, Spark, environments" },
  datascience: { label: "Data Science", icon: "🤖", color: "#14b8a6", desc: "ML experiments, Copilot, OpenAI" },
  scorecards: { label: "Scorecards", icon: "🎯", color: "#eab308", desc: "Goals, scorecards, KPI tracking" },
  subscriptions: { label: "Subscriptions", icon: "📧", color: "#f43f5e", desc: "Email subscriptions, notifications" },
  embed: { label: "Embed", icon: "🔗", color: "#84cc16", desc: "Embed tokens, publish to web" },
  domains: { label: "Domains", icon: "🏛️", color: "#78716c", desc: "Data domains, governance, VNet" },
};

const OPERATIONS = {
  reports: [
    { op: "ViewReport", label: "Viewed Report", sev: "info" },
    { op: "EditReport", label: "Edited Report", sev: "info" },
    { op: "CreateReport", label: "Created Report", sev: "info" },
    { op: "DeleteReport", label: "Deleted Report", sev: "critical" },
    { op: "ExportReport", label: "Exported Report", sev: "warning" },
    { op: "DownloadReport", label: "Downloaded Report", sev: "warning" },
    { op: "ShareReport", label: "Shared Report", sev: "warning" },
    { op: "PublishToWebReport", label: "Published to Web", sev: "critical" },
    { op: "PrintReport", label: "Printed Report", sev: "info" },
    { op: "CopyReport", label: "Copied Report", sev: "info" },
  ],
  dashboards: [
    { op: "ViewDashboard", label: "Viewed Dashboard", sev: "info" },
    { op: "CreateDashboard", label: "Created Dashboard", sev: "info" },
    { op: "DeleteDashboard", label: "Deleted Dashboard", sev: "critical" },
    { op: "ShareDashboard", label: "Shared Dashboard", sev: "warning" },
    { op: "AddTile", label: "Added Tile", sev: "info" },
    { op: "DeleteTile", label: "Deleted Tile", sev: "warning" },
    { op: "ExportTile", label: "Exported Tile", sev: "warning" },
  ],
  datasets: [
    { op: "CreateDataset", label: "Created Model", sev: "info" },
    { op: "DeleteDataset", label: "Deleted Model", sev: "critical" },
    { op: "RefreshDataset", label: "Refreshed Dataset", sev: "info" },
    { op: "ShareDataset", label: "Shared Model", sev: "warning" },
    { op: "TakeOverDataset", label: "Took Over Dataset", sev: "critical" },
    { op: "SetScheduledRefresh", label: "Set Refresh Schedule", sev: "warning" },
    { op: "AnalyzeInExcel", label: "Analyzed in Excel", sev: "info" },
    { op: "BindToGateway", label: "Bound to Gateway", sev: "warning" },
  ],
  dataflows: [
    { op: "CreateDataflow", label: "Created Dataflow", sev: "info" },
    { op: "DeleteDataflow", label: "Deleted Dataflow", sev: "critical" },
    { op: "ExportDataflow", label: "Exported Dataflow", sev: "warning" },
    { op: "RequestDataflowRefresh", label: "Requested Refresh", sev: "info" },
    { op: "TookOverDataflow", label: "Took Over Dataflow", sev: "critical" },
  ],
  workspaces: [
    { op: "CreateWorkspace", label: "Created Workspace", sev: "info" },
    { op: "DeleteGroupWorkspace", label: "Deleted Workspace", sev: "critical" },
    { op: "UpdateWorkspaceAccess", label: "Updated Access", sev: "warning" },
    { op: "AddGroupMembers", label: "Added Members", sev: "warning" },
    { op: "DeleteGroupMembers", label: "Removed Members", sev: "critical" },
    { op: "MigrateWorkspaceIntoCapacity", label: "Migrated to Capacity", sev: "warning" },
  ],
  pipelines: [
    { op: "CreateAlmPipeline", label: "Created Pipeline", sev: "info" },
    { op: "DeleteAlmPipeline", label: "Deleted Pipeline", sev: "critical" },
    { op: "DeployAlmPipeline", label: "Deployed Pipeline", sev: "warning" },
    { op: "ShareArtifact", label: "Shared Artifact", sev: "warning" },
    { op: "TakeOverArtifact", label: "Took Over Artifact", sev: "critical" },
  ],
  gateways: [
    { op: "CreateGateway", label: "Created Gateway", sev: "info" },
    { op: "DeleteGateway", label: "Deleted Gateway", sev: "critical" },
    { op: "ChangeGatewayAdministrators", label: "Changed Admins", sev: "critical" },
    { op: "UpdateDatasourceCredentials", label: "Updated Credentials", sev: "warning" },
  ],
  apps: [
    { op: "CreateApp", label: "Created App", sev: "info" },
    { op: "InstallApp", label: "Installed App", sev: "info" },
    { op: "UnpublishApp", label: "Unpublished App", sev: "warning" },
    { op: "DeleteOrgApp", label: "Deleted Org App", sev: "critical" },
  ],
  capacity: [
    { op: "ChangeCapacityState", label: "Changed Capacity", sev: "critical" },
    { op: "UpdateCapacityAdmins", label: "Updated Admins", sev: "critical" },
    { op: "UpdatedAdminFeatureSwitch", label: "Toggled Feature", sev: "critical" },
    { op: "AddTenantKey", label: "Added Tenant Key", sev: "critical" },
    { op: "RotateTenantKey", label: "Rotated Key", sev: "critical" },
    { op: "UpdateCapacityUsersAssignment", label: "Updated Users", sev: "critical" },
  ],
  security: [
    { op: "SensitivityLabelApplied", label: "Label Applied", sev: "warning" },
    { op: "SensitivityLabelRemoved", label: "Label Removed", sev: "critical" },
    { op: "DLPRuleMatch", label: "DLP Triggered", sev: "critical" },
    { op: "ApplyWorkspaceEncryption", label: "Applied Encryption", sev: "critical" },
    { op: "DisableWorkspaceEncryption", label: "Disabled Encryption", sev: "critical" },
  ],
  lakehouse: [
    { op: "CreateLakehouseTable", label: "Created Table", sev: "info" },
    { op: "DeleteLakehouseTable", label: "Deleted Table", sev: "critical" },
    { op: "LoadLakehouseTable", label: "Loaded Table", sev: "info" },
    { op: "ShareLakehouseTable", label: "Shared Table", sev: "warning" },
  ],
  warehouse: [
    { op: "CreateWarehouse", label: "Created Warehouse", sev: "info" },
    { op: "DeleteWarehouse", label: "Deleted Warehouse", sev: "critical" },
    { op: "ShareWarehouse", label: "Shared Warehouse", sev: "warning" },
    { op: "CreateDatamart", label: "Created Datamart", sev: "info" },
  ],
  onelake: [
    { op: "GetBlob", label: "Read Blob", sev: "info" },
    { op: "PutBlob", label: "Write Blob", sev: "info" },
    { op: "DeleteBlob", label: "Deleted Blob", sev: "warning" },
    { op: "DeleteContainer", label: "Deleted Container", sev: "critical" },
  ],
  git: [
    { op: "ConnectToGit", label: "Connected to Git", sev: "warning" },
    { op: "CommitToGit", label: "Committed to Git", sev: "info" },
    { op: "UpdateFromGit", label: "Updated from Git", sev: "info" },
    { op: "UndoGit", label: "Undid Git Changes", sev: "warning" },
  ],
  notebooks: [
    { op: "StartNotebookSession", label: "Started Session", sev: "info" },
    { op: "StopNotebookSession", label: "Stopped Session", sev: "info" },
    { op: "CancelSparkApplication", label: "Cancelled Spark", sev: "warning" },
    { op: "CommitNotebook", label: "Committed Notebook", sev: "info" },
  ],
  datascience: [
    { op: "AddExperimentRun", label: "Experiment Run", sev: "info" },
    { op: "DeleteModelVersion", label: "Deleted Model", sev: "critical" },
    { op: "DeployModelVersion", label: "Deployed Model", sev: "warning" },
    { op: "CopilotInteraction", label: "Copilot Used", sev: "info" },
  ],
  scorecards: [
    { op: "CreateScorecard", label: "Created Scorecard", sev: "info" },
    { op: "DeleteScorecard", label: "Deleted Scorecard", sev: "critical" },
    { op: "ExportScorecard", label: "Exported Scorecard", sev: "warning" },
    { op: "CreateGoal", label: "Created Goal", sev: "info" },
  ],
  subscriptions: [
    { op: "CreateEmailSubscription", label: "Created Sub", sev: "info" },
    { op: "DeleteEmailSubscription", label: "Deleted Sub", sev: "warning" },
    { op: "RunEmailSubscription", label: "Ran Sub", sev: "info" },
    { op: "PostComment", label: "Posted Comment", sev: "info" },
  ],
  embed: [
    { op: "GenerateEmbedToken", label: "Embed Token", sev: "info" },
    { op: "PublishToWebReport", label: "Published to Web", sev: "critical" },
    { op: "AcquireStorageAccountKey", label: "Got Storage Key", sev: "critical" },
    { op: "CreateExternalDataShare", label: "External Share", sev: "warning" },
  ],
  domains: [
    { op: "InsertDataDomainAsAdmin", label: "Created Domain", sev: "warning" },
    { op: "DeleteDataDomainAsAdmin", label: "Deleted Domain", sev: "critical" },
    { op: "CreateManagedVNet", label: "Created VNet", sev: "warning" },
    { op: "DeleteManagedPrivateEndpoint", label: "Deleted Endpoint", sev: "critical" },
  ],
};

const TENANTS = [
  { id: "t-a", name: "Azure Account 1" },
  { id: "t-b", name: "Azure Account 2" },
];

const USERS = [
  { id: "u1", name: "Ahmed Khan", email: "ahmed@contoso.com", tenant: "t-a", license: "Pro", role: "Admin", clr: "#6366f1" },
  { id: "u2", name: "Sara Ali", email: "sara@contoso.com", tenant: "t-a", license: "PPU", role: "Contributor", clr: "#ec4899" },
  { id: "u3", name: "Bilal Raza", email: "bilal@contoso.com", tenant: "t-a", license: "Pro", role: "Member", clr: "#22c55e" },
  { id: "u4", name: "Fatima Noor", email: "fatima@contoso.com", tenant: "t-a", license: "Pro", role: "Viewer", clr: "#f59e0b" },
  { id: "u5", name: "Omar Sheikh", email: "omar@fabrikam.com", tenant: "t-b", license: "Pro", role: "Admin", clr: "#06b6d4" },
  { id: "u6", name: "Ayesha Malik", email: "ayesha@fabrikam.com", tenant: "t-b", license: "PPU", role: "Contributor", clr: "#ef4444" },
  { id: "u7", name: "Hassan Javed", email: "hassan@fabrikam.com", tenant: "t-b", license: "Pro", role: "Member", clr: "#a855f7" },
  { id: "u8", name: "Zara Iqbal", email: "zara@fabrikam.com", tenant: "t-b", license: "Pro", role: "Viewer", clr: "#14b8a6" },
];

const WORKSPACES = ["Sales Analytics", "Finance Reports", "HR Dashboard", "Marketing", "Executive KPIs", "Data Engineering", "Customer 360", "Operations Hub"];
const ITEM_NAMES = ["Q4 Revenue", "Monthly KPIs", "Employee Model", "Churn Analysis", "Daily ETL", "Sales Forecast", "Inventory Tracker", "Campaign ROI"];
const SC = { info: "#60a5fa", warning: "#fbbf24", critical: "#f87171" };

const exportSet = new Set(["ExportReport", "DownloadReport", "ExportDataflow", "ExportScorecard", "ExportTile"]);
const shareSet = new Set(["ShareReport", "ShareDashboard", "ShareDataset", "ShareWarehouse", "ShareLakehouseTable", "ShareArtifact", "CreateExternalDataShare", "PublishToWebReport"]);
const adminSet = new Set(["ChangeCapacityState", "UpdateCapacityAdmins", "UpdatedAdminFeatureSwitch", "AddTenantKey", "RotateTenantKey", "ChangeGatewayAdministrators", "UpdateCapacityUsersAssignment"]);

function gen() {
  const acts = [];
  const now = new Date(2026, 1, 4, 14, 0);
  const cats = Object.keys(OPERATIONS);
  for (let i = 0; i < 600; i++) {
    const c = cats[Math.floor(Math.random() * cats.length)];
    const ops = OPERATIONS[c];
    const o = ops[Math.floor(Math.random() * ops.length)];
    const u = USERS[Math.floor(Math.random() * 8)];
    const h = Math.floor(Math.random() * 720);
    const ts = new Date(now.getTime() - h * 3600000);
    acts.push({
      id: "a" + i, ts: ts.toISOString(), date: ts.toISOString().slice(0, 10),
      time: ts.toTimeString().slice(0, 5), hour: ts.getHours(),
      uid: u.id, user: u.name, email: u.email, tid: u.tenant,
      tn: TENANTS.find(t => t.id === u.tenant).name,
      lic: u.license, role: u.role, clr: u.clr,
      cat: c, op: o.op, label: o.label, sev: o.sev,
      ws: WORKSPACES[Math.floor(Math.random() * WORKSPACES.length)],
      item: ITEM_NAMES[Math.floor(Math.random() * ITEM_NAMES.length)],
      ok: Math.random() > 0.07,
      ip: "192.168." + Math.floor(Math.random() * 5) + "." + Math.floor(Math.random() * 255),
    });
  }
  return acts.sort((a, b) => b.ts.localeCompare(a.ts));
}

const DATA = gen();
const totalOps = Object.values(OPERATIONS).reduce((s, a) => s + a.length, 0);

export default function App() {
  const [tenant, setTenant] = useState("all");
  const [userF, setUserF] = useState("all");
  const [sev, setSev] = useState("all");
  const [q, setQ] = useState("");
  const [view, setView] = useState("overview");
  const [catF, setCatF] = useState("all");
  const [exp, setExp] = useState(null);
  const [sort, setSort] = useState({ f: "ts", d: "desc" });
  const [selUser, setSelUser] = useState(null);

  const bg = "#060a14";
  const surface = "#0c1222";
  const card = "#111a2e";
  const cardH = "#162038";
  const bdr = "rgba(148,163,184,0.07)";
  const bdrA = "rgba(148,163,184,0.14)";
  const tx = "#e2e8f0";
  const tx2 = "#94a3b8";
  const tx3 = "#64748b";
  const tx4 = "#475569";
  const wh = "#f8fafc";

  const fd = useMemo(() => DATA.filter(a => {
    if (tenant !== "all" && a.tid !== tenant) return false;
    if (catF !== "all" && a.cat !== catF) return false;
    if (userF !== "all" && a.uid !== userF) return false;
    if (sev !== "all" && a.sev !== sev) return false;
    if (q && !(a.label + " " + a.user + " " + a.item + " " + a.ws + " " + a.op + " " + a.email).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [tenant, catF, userF, sev, q]);

  const sd = useMemo(() => [...fd].sort((a, b) => {
    const av = a[sort.f] || "";
    const bv = b[sort.f] || "";
    return sort.d === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  }), [fd, sort]);

  const st = useMemo(() => {
    const byCat = {};
    Object.keys(CATEGORIES).forEach(c => { byCat[c] = fd.filter(a => a.cat === c).length; });

    const byDay = {};
    fd.forEach(a => {
      if (!byDay[a.date]) byDay[a.date] = { date: a.date, total: 0, critical: 0, warning: 0, info: 0 };
      byDay[a.date].total++;
      byDay[a.date][a.sev]++;
    });
    const tl = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)).slice(-14);

    const byHour = {};
    fd.forEach(a => { byHour[a.hour] = (byHour[a.hour] || 0) + 1; });
    const pH = Object.entries(byHour).sort((a, b) => b[1] - a[1])[0];

    const byWs = {};
    fd.forEach(a => { if (a.ws) byWs[a.ws] = (byWs[a.ws] || 0) + 1; });
    const tW = Object.entries(byWs).sort((a, b) => b[1] - a[1])[0];

    const byU = {};
    fd.forEach(a => {
      if (!byU[a.uid]) byU[a.uid] = {
        uid: a.uid, name: a.user, email: a.email, tid: a.tid, tn: a.tn,
        lic: a.lic, role: a.role, clr: a.clr,
        total: 0, crit: 0, warn: 0, fail: 0, exps: 0, shrs: 0, adms: 0, last: a.ts
      };
      const u = byU[a.uid];
      u.total++;
      if (a.sev === "critical") u.crit++;
      if (a.sev === "warning") u.warn++;
      if (!a.ok) u.fail++;
      if (exportSet.has(a.op)) u.exps++;
      if (shareSet.has(a.op)) u.shrs++;
      if (adminSet.has(a.op)) u.adms++;
      if (a.ts > u.last) u.last = a.ts;
    });
    const uS = Object.values(byU).sort((a, b) => b.total - a.total);
    const dc = tl.length || 1;

    return {
      total: fd.length,
      crit: fd.filter(a => a.sev === "critical").length,
      warn: fd.filter(a => a.sev === "warning").length,
      fail: fd.filter(a => !a.ok).length,
      users: new Set(fd.map(a => a.uid)).size,
      sr: fd.length ? ((fd.filter(a => a.ok).length / fd.length) * 100).toFixed(1) : "0.0",
      exps: fd.filter(a => exportSet.has(a.op)).length,
      shrs: fd.filter(a => shareSet.has(a.op)).length,
      adms: fd.filter(a => adminSet.has(a.op)).length,
      avg: (fd.length / dc).toFixed(0),
      pH: pH ? String(pH[0]).padStart(2, "0") + ":00" : "--",
      pHc: pH ? pH[1] : 0,
      tW: tW ? tW[0] : "--",
      tWc: tW ? tW[1] : 0,
      byCat, tl, uS
    };
  }, [fd]);

  const tog = (f) => setSort(p => p.f === f ? { f, d: p.d === "asc" ? "desc" : "asc" } : { f, d: "desc" });

  const catArr = Object.entries(st.byCat)
    .map(([k, v]) => ({ key: k, name: CATEGORIES[k].label, value: v, color: CATEGORIES[k].color }))
    .filter(c => c.value > 0).sort((a, b) => b.value - a.value);

  const selStyle = (w) => ({
    background: card, color: tx, border: "1px solid " + bdr,
    borderRadius: 8, padding: "8px 12px", fontSize: 12, width: w, cursor: "pointer", outline: "none"
  });

  const navItems = [
    { id: "overview", label: "Overview", icon: "📈" },
    { id: "users", label: "User Activity", icon: "👥" },
    { id: "categories", label: "Categories", icon: "📂" },
    { id: "catalog", label: "Full Catalog", icon: "📖" },
  ];

  const kpiCard = (label, value, color, sub, icon) => (
    <div style={{
      padding: "20px 22px", background: card, border: "1px solid " + bdr,
      borderRadius: 12, display: "flex", alignItems: "flex-start", gap: 14
    }}>
      {icon && <div style={{
        width: 42, height: 42, borderRadius: 10, background: color + "18",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0
      }}>{icon}</div>}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: tx3, marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: icon ? 22 : 30, fontWeight: 700, color: icon ? wh : color, letterSpacing: "-0.5px" }}>{value}</div>
        <div style={{ fontSize: 10, color: tx4, marginTop: 5 }}>{sub}</div>
      </div>
    </div>
  );

  // ═══ TABLE RENDERER ═══
  const renderTable = (data) => {
    const TH = ({ f, children, w }) => (
      <th onClick={() => tog(f)} style={{
        padding: "12px 10px", textAlign: "left", fontSize: 10, fontWeight: 600, color: tx3,
        textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer", userSelect: "none",
        borderBottom: "1px solid " + bdr, width: w, whiteSpace: "nowrap",
        background: surface, position: "sticky", top: 0, zIndex: 1
      }}>
        {children}
        <span style={{ color: sort.f === f ? "#60a5fa" : tx4, marginLeft: 3, opacity: sort.f === f ? 1 : 0.4 }}>
          {sort.f === f ? (sort.d === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </th>
    );

    return (
      <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid " + bdr, background: card }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              <TH f="sev" w={28}></TH>
              <TH f="ts" w={105}>Time</TH>
              <TH f="user" w={120}>User</TH>
              <TH f="tn" w={85}>Tenant</TH>
              <TH f="cat" w={40}>Cat</TH>
              <TH f="label" w={160}>Operation</TH>
              <TH f="ws" w={120}>Workspace</TH>
              <TH f="item" w={120}>Item</TH>
              <TH f="ok" w={50}>Status</TH>
            </tr>
          </thead>
          <tbody>
            {data.map((a, i) => {
              const c = CATEGORIES[a.cat];
              const isE = exp === a.id;
              return (
                <React.Fragment key={a.id}>
                  <tr
                    onClick={() => setExp(isE ? null : a.id)}
                    style={{
                      background: isE ? "rgba(96,165,250,0.04)" : (i % 2 ? "rgba(255,255,255,0.012)" : "transparent"),
                      cursor: "pointer", borderLeft: "3px solid " + SC[a.sev]
                    }}
                  >
                    <td style={{ padding: "10px 8px", textAlign: "center" }}>
                      <span style={{ color: SC[a.sev], fontSize: 8 }}>●</span>
                    </td>
                    <td style={{ padding: "10px", fontFamily: "monospace", fontSize: 10, color: tx3 }}>
                      {a.date}<br /><span style={{ color: tx4 }}>{a.time}</span>
                    </td>
                    <td style={{ padding: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                          width: 26, height: 26, borderRadius: 7, background: a.clr,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "#fff", fontWeight: 700, fontSize: 10, flexShrink: 0
                        }}>{a.user[0]}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 11, color: tx }}>{a.user}</div>
                          <div style={{ fontSize: 9, color: tx4 }}>{a.lic}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "10px" }}>
                      <span style={{
                        fontSize: 10, padding: "3px 8px", borderRadius: 6,
                        background: a.tid === "t-a" ? "rgba(139,92,246,0.1)" : "rgba(6,182,212,0.1)",
                        color: a.tid === "t-a" ? "#a78bfa" : "#22d3ee"
                      }}>{a.tid === "t-a" ? "Acct 1" : "Acct 2"}</span>
                    </td>
                    <td style={{ padding: "10px", fontSize: 14 }}>{c && c.icon}</td>
                    <td style={{ padding: "10px", fontWeight: 500, color: SC[a.sev] }}>{a.label}</td>
                    <td style={{ padding: "10px", color: tx3, fontSize: 11 }}>{a.ws}</td>
                    <td style={{ padding: "10px", color: tx3, fontSize: 11 }}>{a.item}</td>
                    <td style={{ padding: "10px" }}>
                      <span style={{
                        fontSize: 10, padding: "3px 8px", borderRadius: 6, fontWeight: 600,
                        background: a.ok ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
                        color: a.ok ? "#4ade80" : "#f87171"
                      }}>{a.ok ? "OK" : "FAIL"}</span>
                    </td>
                  </tr>
                  {isE && (
                    <tr>
                      <td colSpan={9} style={{ padding: "0 10px 12px 38px", background: "rgba(96,165,250,0.03)" }}>
                        <div style={{
                          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                          gap: 10, padding: "18px 20px", background: "rgba(0,0,0,0.3)", borderRadius: 10, fontSize: 11
                        }}>
                          {[
                            ["Operation ID", a.op], ["Activity ID", a.id], ["Email", a.email],
                            ["License", a.lic], ["Role", a.role], ["Tenant", a.tn],
                            ["Client IP", a.ip], ["Workspace", a.ws], ["Item", a.item],
                            ["Category", c && c.label], ["Severity", a.sev.toUpperCase()],
                            ["Success", a.ok ? "Yes" : "No"], ["Timestamp", a.ts],
                          ].map(function(pair, j) {
                            return (
                              <div key={j}>
                                <div style={{ fontSize: 9, color: tx4, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>{pair[0]}</div>
                                <div style={{ color: tx2, fontFamily: "monospace", fontSize: 11, wordBreak: "break-all" }}>{pair[1]}</div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div style={{ fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif", background: bg, minHeight: "100vh", color: tx }}>

      {/* ═══ HEADER ═══ */}
      <div style={{
        background: surface, borderBottom: "1px solid " + bdr,
        padding: "16px 28px", display: "flex", alignItems: "center",
        justifyContent: "space-between", flexWrap: "wrap", gap: 14
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "linear-gradient(135deg,#3b82f6,#8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 700, color: "#fff"
          }}>⚡</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: wh, letterSpacing: "-0.4px" }}>Fabric Activity Monitor</div>
            <div style={{ fontSize: 11, color: tx3, marginTop: 2 }}>{Object.keys(CATEGORIES).length} Categories · {totalOps} Operations · 2 Tenants · 8 Licenses</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <select value={tenant} onChange={e => setTenant(e.target.value)} style={selStyle(160)}>
            <option value="all">🏢 All Tenants</option>
            {TENANTS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={userF} onChange={e => setUserF(e.target.value)} style={selStyle(190)}>
            <option value="all">👤 All Users (8)</option>
            {USERS.map(u => <option key={u.id} value={u.id}>{u.name} · {u.license}</option>)}
          </select>
          <select value={sev} onChange={e => setSev(e.target.value)} style={selStyle(130)}>
            <option value="all">All Severity</option>
            <option value="critical">🔴 Critical</option>
            <option value="warning">🟡 Warning</option>
            <option value="info">🔵 Info</option>
          </select>
          <div style={{ position: "relative" }}>
            <input placeholder="Search..." value={q} onChange={e => setQ(e.target.value)}
              style={{ background: card, color: tx, border: "1px solid " + bdr, borderRadius: 8, padding: "8px 12px 8px 32px", fontSize: 12, width: 180, outline: "none" }} />
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, opacity: 0.4 }}>🔍</span>
          </div>
        </div>
      </div>

      {/* ═══ NAV TABS ═══ */}
      <div style={{
        background: surface, borderBottom: "1px solid " + bdr,
        padding: "0 28px", display: "flex", alignItems: "center"
      }}>
        {navItems.map(n => {
          const ac = view === n.id || (n.id === "categories" && view === "cat");
          return (
            <button key={n.id} onClick={() => { setView(n.id); if (n.id !== "categories") setCatF("all"); }}
              style={{
                padding: "14px 22px", background: "transparent", border: "none",
                borderBottom: ac ? "2px solid #3b82f6" : "2px solid transparent",
                color: ac ? "#60a5fa" : tx3, fontSize: 13,
                fontWeight: ac ? 600 : 400, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8
              }}>
              <span style={{ fontSize: 15 }}>{n.icon}</span>
              {n.label}
            </button>
          );
        })}
        <div style={{ marginLeft: "auto", fontSize: 11, color: tx4 }}>{fd.length} events</div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div style={{ padding: "28px 28px 48px" }}>

        {/* ───── OVERVIEW ───── */}
        {view === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

            {/* Primary KPIs */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: tx3, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Primary Metrics</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
                {kpiCard("Total Events", st.total, "#60a5fa", st.avg + "/day avg")}
                {kpiCard("Critical", st.crit, "#f87171", (st.total ? ((st.crit / st.total) * 100).toFixed(1) : 0) + "% of total")}
                {kpiCard("Warnings", st.warn, "#fbbf24", (st.total ? ((st.warn / st.total) * 100).toFixed(1) : 0) + "% of total")}
                {kpiCard("Failures", st.fail, "#fb923c", (st.total ? ((st.fail / st.total) * 100).toFixed(1) : 0) + "% fail rate")}
                {kpiCard("Success Rate", st.sr + "%", parseFloat(st.sr) >= 95 ? "#4ade80" : "#fbbf24", fd.filter(a => a.ok).length + " passed")}
              </div>
            </div>

            {/* Users & Activity KPIs */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: tx3, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Users & Activity</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
                {kpiCard("Active Users", st.users, "#a78bfa", "of " + USERS.length + " total", "👤")}
                {kpiCard("Avg Events/Day", st.avg, "#60a5fa", "over " + st.tl.length + " days", "📅")}
                {kpiCard("Peak Hour", st.pH, "#38bdf8", st.pHc + " events at peak", "⏰")}
                {kpiCard("Busiest Workspace", st.tW, "#f97316", st.tWc + " events", "🏗️")}
              </div>
            </div>

            {/* Security KPIs */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: tx3, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Security & Compliance</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
                {kpiCard("Exports & Downloads", st.exps, "#f59e0b", "Data leaving platform", "📤")}
                {kpiCard("Shares & Access", st.shrs, "#ec4899", "Permission changes", "🔓")}
                {kpiCard("Admin Actions", st.adms, "#ef4444", "Privileged operations", "🛡️")}
                {kpiCard("Categories Tracked", 20, "#8b5cf6", totalOps + " total operations", "📂")}
              </div>
            </div>

            {/* Charts */}
            <div style={{ display: "grid", gridTemplateColumns: "5fr 3fr", gap: 16 }}>
              <div style={{ background: card, borderRadius: 12, padding: "22px 26px", border: "1px solid " + bdr }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: tx2, marginBottom: 18 }}>Activity Timeline — Last 14 Days</div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={st.tl}>
                    <defs>
                      <linearGradient id="gInfo" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa" stopOpacity={0.25} /><stop offset="100%" stopColor="#60a5fa" stopOpacity={0} /></linearGradient>
                      <linearGradient id="gWarn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fbbf24" stopOpacity={0.25} /><stop offset="100%" stopColor="#fbbf24" stopOpacity={0} /></linearGradient>
                      <linearGradient id="gCrit" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f87171" stopOpacity={0.25} /><stop offset="100%" stopColor="#f87171" stopOpacity={0} /></linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: tx4 }} tickFormatter={v => v.slice(5)} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: tx4 }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip contentStyle={{ background: card, border: "1px solid " + bdrA, borderRadius: 8, fontSize: 11, color: tx }} />
                    <Area type="monotone" dataKey="info" name="Info" stackId="1" stroke="#60a5fa" fill="url(#gInfo)" />
                    <Area type="monotone" dataKey="warning" name="Warning" stackId="1" stroke="#fbbf24" fill="url(#gWarn)" />
                    <Area type="monotone" dataKey="critical" name="Critical" stackId="1" stroke="#f87171" fill="url(#gCrit)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div style={{ background: card, borderRadius: 12, padding: "22px 26px", border: "1px solid " + bdr }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: tx2, marginBottom: 18 }}>Top Categories</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={catArr.slice(0, 8)} layout="vertical" barCategoryGap={6}>
                    <XAxis type="number" tick={{ fontSize: 10, fill: tx4 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: tx2 }} width={100} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: card, border: "1px solid " + bdrA, borderRadius: 8, fontSize: 11, color: tx }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {catArr.slice(0, 8).map((c, i) => <Cell key={i} fill={c.color} fillOpacity={0.7} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Activity by User Cards */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: tx3, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Recent Activity by User</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
                {st.uS.slice(0, 8).map(u => {
                  const ra = sd.filter(a => a.uid === u.uid).slice(0, 3);
                  return (
                    <div key={u.uid} onClick={() => { setView("users"); setSelUser(u.uid); }}
                      style={{ background: card, border: "1px solid " + bdr, borderRadius: 12, padding: "20px", cursor: "pointer" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10, background: u.clr,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "#fff", fontWeight: 700, fontSize: 14
                        }}>{u.name[0]}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: wh }}>{u.name}</div>
                          <div style={{ fontSize: 10, color: tx4 }}>{u.lic} · {u.role}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                        <div style={{ flex: 1, textAlign: "center", padding: "8px 4px", borderRadius: 8, background: "rgba(96,165,250,0.08)" }}>
                          <div style={{ fontSize: 17, fontWeight: 700, color: "#60a5fa" }}>{u.total}</div>
                          <div style={{ fontSize: 9, color: tx4, marginTop: 2 }}>Events</div>
                        </div>
                        <div style={{ flex: 1, textAlign: "center", padding: "8px 4px", borderRadius: 8, background: "rgba(248,113,113,0.08)" }}>
                          <div style={{ fontSize: 17, fontWeight: 700, color: "#f87171" }}>{u.crit}</div>
                          <div style={{ fontSize: 9, color: tx4, marginTop: 2 }}>Critical</div>
                        </div>
                        <div style={{ flex: 1, textAlign: "center", padding: "8px 4px", borderRadius: 8, background: "rgba(251,191,36,0.08)" }}>
                          <div style={{ fontSize: 17, fontWeight: 700, color: "#fbbf24" }}>{u.warn}</div>
                          <div style={{ fontSize: 9, color: tx4, marginTop: 2 }}>Warn</div>
                        </div>
                      </div>
                      <div style={{ borderTop: "1px solid " + bdr, paddingTop: 12 }}>
                        <div style={{ fontSize: 9, color: tx4, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Recent</div>
                        {ra.map((a, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 0", borderBottom: i < ra.length - 1 ? "1px solid " + bdr : "none" }}>
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: SC[a.sev], flexShrink: 0 }} />
                            <span style={{ fontSize: 10, color: tx2, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.label}</span>
                            <span style={{ fontSize: 9, color: tx4, fontFamily: "monospace", flexShrink: 0 }}>{a.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Activity Table */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: tx3, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Latest Activity Log</div>
              {renderTable(sd.slice(0, 30))}
              {sd.length > 30 && <div style={{ fontSize: 11, color: tx4, textAlign: "center", marginTop: 14 }}>Showing 30 of {sd.length}</div>}
            </div>
          </div>
        )}

        {/* ───── USER ACTIVITY ───── */}
        {view === "users" && (
          <div style={{ display: "flex", gap: 24 }}>
            <div style={{ width: 280, flexShrink: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: tx3, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Users ({st.uS.length})</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div onClick={() => setSelUser(null)}
                  style={{
                    padding: "12px 16px",
                    background: !selUser ? "rgba(96,165,250,0.08)" : card,
                    border: "1px solid " + (!selUser ? "rgba(96,165,250,0.15)" : bdr),
                    borderRadius: 10, cursor: "pointer", fontSize: 12,
                    fontWeight: !selUser ? 600 : 400,
                    color: !selUser ? "#60a5fa" : tx2,
                    display: "flex", alignItems: "center", gap: 8
                  }}>
                  <span>👥</span> All Users
                  <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.6 }}>{st.total}</span>
                </div>
                {st.uS.map(u => {
                  const ac = selUser === u.uid;
                  return (
                    <div key={u.uid} onClick={() => setSelUser(u.uid)}
                      style={{
                        padding: "14px 16px",
                        background: ac ? (u.clr + "15") : card,
                        border: "1px solid " + (ac ? u.clr + "30" : bdr),
                        borderRadius: 10, cursor: "pointer"
                      }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: 8, background: u.clr,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "#fff", fontWeight: 700, fontSize: 13, flexShrink: 0
                        }}>{u.name[0]}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: ac ? 600 : 500, color: ac ? wh : tx, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</div>
                          <div style={{ fontSize: 10, color: tx4, marginTop: 1 }}>{u.lic} · {u.role}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: wh }}>{u.total}</div>
                          {u.crit > 0 && <div style={{ fontSize: 9, color: "#f87171" }}>{u.crit} crit</div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {(() => {
                const ua = selUser ? sd.filter(a => a.uid === selUser) : sd;
                const uD = selUser ? st.uS.find(u => u.uid === selUser) : null;

                return (
                  <div>
                    {uD && (
                      <div style={{ background: card, border: "1px solid " + bdr, borderRadius: 12, padding: "28px", marginBottom: 24 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 24 }}>
                          <div style={{
                            width: 56, height: 56, borderRadius: 14, background: uD.clr,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "#fff", fontWeight: 700, fontSize: 22
                          }}>{uD.name[0]}</div>
                          <div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: wh }}>{uD.name}</div>
                            <div style={{ fontSize: 12, color: tx3, marginTop: 3 }}>{uD.email} · {uD.lic} · {uD.role} · {uD.tn}</div>
                            <div style={{ fontSize: 11, color: tx4, marginTop: 3 }}>Last active: {new Date(uD.last).toLocaleString()}</div>
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
                          {[
                            { l: "Total", v: uD.total, c: "#60a5fa" },
                            { l: "Critical", v: uD.crit, c: "#f87171" },
                            { l: "Warnings", v: uD.warn, c: "#fbbf24" },
                            { l: "Failures", v: uD.fail, c: "#fb923c" },
                            { l: "Exports", v: uD.exps, c: "#f59e0b" },
                            { l: "Shares", v: uD.shrs, c: "#ec4899" },
                          ].map((k, i) => (
                            <div key={i} style={{
                              textAlign: "center", padding: "14px 8px", borderRadius: 10,
                              background: k.c + "10", border: "1px solid " + k.c + "18"
                            }}>
                              <div style={{ fontSize: 24, fontWeight: 700, color: k.c }}>{k.v}</div>
                              <div style={{ fontSize: 10, color: tx4, marginTop: 4 }}>{k.l}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!selUser && (
                      <div style={{ background: card, border: "1px solid " + bdr, borderRadius: 12, padding: "22px 26px", marginBottom: 24 }}>
                        <div style={{ fontSize: 16, fontWeight: 600, color: wh }}>All User Activity</div>
                        <div style={{ fontSize: 12, color: tx3, marginTop: 6 }}>Select a user on the left to view their individual activity</div>
                      </div>
                    )}

                    <div style={{ fontSize: 11, fontWeight: 600, color: tx3, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
                      {uD ? uD.name + "'s Activity" : "All Activity"} ({ua.length})
                    </div>
                    {renderTable(ua.slice(0, 50))}
                    {ua.length > 50 && <div style={{ fontSize: 11, color: tx4, textAlign: "center", marginTop: 14 }}>Showing 50 of {ua.length}</div>}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ───── CATEGORIES ───── */}
        {(view === "categories" || view === "cat") && (
          <div>
            {view === "categories" && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: tx3, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 18 }}>All Categories (20)</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
                  {Object.entries(CATEGORIES).map(([k, c]) => {
                    const cn = st.byCat[k] || 0;
                    const on = OPERATIONS[k] ? OPERATIONS[k].length : 0;
                    return (
                      <div key={k} onClick={() => { setCatF(k); setView("cat"); }}
                        style={{
                          background: card, border: "1px solid " + bdr, borderRadius: 12,
                          padding: "22px", cursor: "pointer", borderLeft: "3px solid " + c.color
                        }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                          <span style={{ fontSize: 22 }}>{c.icon}</span>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: c.color }}>{c.label}</div>
                            <div style={{ fontSize: 10, color: tx4, marginTop: 3 }}>{c.desc}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                          <div style={{ flex: 1, textAlign: "center", padding: "10px", borderRadius: 8, background: c.color + "12" }}>
                            <div style={{ fontSize: 20, fontWeight: 700, color: wh }}>{cn}</div>
                            <div style={{ fontSize: 9, color: tx4, marginTop: 2 }}>Events</div>
                          </div>
                          <div style={{ flex: 1, textAlign: "center", padding: "10px", borderRadius: 8, background: "rgba(255,255,255,0.02)" }}>
                            <div style={{ fontSize: 20, fontWeight: 700, color: tx2 }}>{on}</div>
                            <div style={{ fontSize: 9, color: tx4, marginTop: 2 }}>Operations</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {view === "cat" && catF !== "all" && (
              <div>
                <button onClick={() => { setView("categories"); setCatF("all"); }}
                  style={{ background: "transparent", border: "none", color: "#60a5fa", fontSize: 12, cursor: "pointer", marginBottom: 18, padding: 0 }}>
                  ← Back to all categories
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <span style={{ fontSize: 28 }}>{CATEGORIES[catF] && CATEGORIES[catF].icon}</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: CATEGORIES[catF] && CATEGORIES[catF].color }}>{CATEGORIES[catF] && CATEGORIES[catF].label}</span>
                  <span style={{
                    fontSize: 12, padding: "3px 10px", borderRadius: 12,
                    background: (CATEGORIES[catF] ? CATEGORIES[catF].color : "#888") + "18",
                    color: CATEGORIES[catF] ? CATEGORIES[catF].color : "#888"
                  }}>{fd.length} events</span>
                </div>
                <div style={{ fontSize: 12, color: tx3, marginBottom: 10 }}>{CATEGORIES[catF] && CATEGORIES[catF].desc}</div>
                <div style={{ fontSize: 11, color: tx4, marginBottom: 22, lineHeight: 1.8 }}>
                  Operations: {OPERATIONS[catF] && OPERATIONS[catF].map(o => o.label).join(" · ")}
                </div>
                {renderTable(sd.slice(0, 60))}
                {sd.length > 60 && <div style={{ fontSize: 11, color: tx4, textAlign: "center", marginTop: 14 }}>Showing 60 of {sd.length}</div>}
              </div>
            )}
          </div>
        )}

        {/* ───── FULL CATALOG ───── */}
        {view === "catalog" && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: wh, marginBottom: 6 }}>Complete Operation Catalog</div>
              <div style={{ fontSize: 13, color: tx3 }}>{totalOps} operations across {Object.keys(CATEGORIES).length} categories</div>
            </div>
            {Object.entries(CATEGORIES).map(([k, c]) => (
              <div key={k} style={{ marginBottom: 24 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "16px 20px", background: card,
                  border: "1px solid " + bdr, borderLeft: "3px solid " + c.color,
                  borderRadius: 10, marginBottom: 10
                }}>
                  <span style={{ fontSize: 18 }}>{c.icon}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: c.color }}>{c.label}</span>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 8, background: c.color + "18", color: c.color }}>
                    {OPERATIONS[k] ? OPERATIONS[k].length : 0}
                  </span>
                  <span style={{ fontSize: 11, color: tx4, marginLeft: "auto" }}>{c.desc}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 4, paddingLeft: 14 }}>
                  {OPERATIONS[k] && OPERATIONS[k].map((o, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 8, fontSize: 12,
                      padding: "7px 14px", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.012)",
                      borderRadius: 6
                    }}>
                      <span style={{ color: SC[o.sev], fontSize: 8 }}>●</span>
                      <span style={{ color: tx, fontWeight: 500 }}>{o.label}</span>
                      <span style={{ color: tx4, fontSize: 10, fontFamily: "monospace", marginLeft: "auto" }}>{o.op}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
