export const CATEGORIES = {
  reports:       { label: "Reports",              icon: "Re", color: "#22c55e", desc: "View, create, edit, export, print, share reports" },
  dashboards:    { label: "Dashboards",           icon: "Db", color: "#3b82f6", desc: "Dashboard & tile operations" },
  datasets:      { label: "Semantic Models",      icon: "Sm", color: "#ec4899", desc: "Dataset/model refresh, edit, parameters, connections" },
  dataflows:     { label: "Dataflows",            icon: "Df", color: "#06b6d4", desc: "Dataflow create, refresh, schedule, export" },
  workspaces:    { label: "Workspaces",           icon: "Ws", color: "#f97316", desc: "Workspace create, update, delete, migrate, access" },
  pipelines:     { label: "Deployment Pipelines", icon: "Pl", color: "#a855f7", desc: "ALM pipeline deploy, assign, configure" },
  gateways:      { label: "Gateways",             icon: "Gw", color: "#64748b", desc: "Gateway cluster, datasource, credentials" },
  apps:          { label: "Apps & Templates",     icon: "Ap", color: "#f59e0b", desc: "App install, publish, template app operations" },
  capacity:      { label: "Capacity & Admin",     icon: "Ca", color: "#ef4444", desc: "Capacity settings, admin feature switches, tenant keys" },
  security:      { label: "Security & DLP",       icon: "Se", color: "#dc2626", desc: "Sensitivity labels, DLP, encryption, access controls" },
  lakehouse:     { label: "Lakehouse",            icon: "Lh", color: "#10b981", desc: "Lakehouse files, folders, tables, shortcuts" },
  warehouse:     { label: "Warehouse & SQL",      icon: "Wh", color: "#8b5cf6", desc: "Warehouse, SQL analytics endpoint, queries" },
  onelake:       { label: "OneLake Storage",      icon: "Ol", color: "#0ea5e9", desc: "Blob, file, container, directory operations" },
  git:           { label: "Git Integration",      icon: "Gt", color: "#6366f1", desc: "Git connect, commit, branch, sync, undo" },
  notebooks:     { label: "Notebooks & Spark",    icon: "Nb", color: "#d946ef", desc: "Notebook sessions, Spark apps, environments" },
  datascience:   { label: "Data Science & AI",    icon: "Ai", color: "#14b8a6", desc: "ML experiments, models, Copilot, OpenAI" },
  scorecards:    { label: "Scorecards & Metrics", icon: "Sc", color: "#eab308", desc: "Goals, scorecards, KPI tracking" },
  subscriptions: { label: "Subscriptions & Email", icon: "Su", color: "#f43f5e", desc: "Email subscriptions, sharing, notifications" },
  embed:         { label: "Embed & External",     icon: "Em", color: "#84cc16", desc: "Embed tokens, publish to web, external apps" },
  domains:       { label: "Domains & Governance", icon: "Dg", color: "#78716c", desc: "Data domains, governance, VNet, managed endpoints" },
};

export const SEV_COLORS = {
  info: "#3b82f6",
  warning: "#f59e0b",
  critical: "#ef4444",
};
