/**
 * Categorizer — Maps 400+ Power BI/Fabric operations to categories and severity levels
 * Source: https://learn.microsoft.com/en-us/fabric/admin/operation-list
 */

const CATEGORIES = {
  reports:       { label: "Reports",              icon: "📊", desc: "Report view, create, edit, export, share" },
  dashboards:    { label: "Dashboards",           icon: "📋", desc: "Dashboard & tile operations" },
  datasets:      { label: "Semantic Models",      icon: "💾", desc: "Dataset refresh, edit, parameters" },
  dataflows:     { label: "Dataflows",            icon: "🌊", desc: "Dataflow CRUD and refresh" },
  workspaces:    { label: "Workspaces",           icon: "🏗️", desc: "Workspace management & access" },
  pipelines:     { label: "Deployment Pipelines",  icon: "🚀", desc: "ALM pipeline operations" },
  gateways:      { label: "Gateways",             icon: "🔌", desc: "Gateway & datasource management" },
  apps:          { label: "Apps & Templates",     icon: "📦", desc: "App and template operations" },
  capacity:      { label: "Capacity & Admin",     icon: "⚡", desc: "Capacity, tenant settings, admin" },
  security:      { label: "Security & DLP",       icon: "🔐", desc: "Labels, DLP, encryption" },
  lakehouse:     { label: "Lakehouse",            icon: "🏠", desc: "Lakehouse files, tables, shortcuts" },
  warehouse:     { label: "Warehouse & SQL",      icon: "🗄️", desc: "Warehouse, SQL endpoint, Datamart" },
  onelake:       { label: "OneLake Storage",      icon: "☁️", desc: "Blob, file, container operations" },
  git:           { label: "Git Integration",      icon: "🔀", desc: "Git connect, commit, branch" },
  notebooks:     { label: "Notebooks & Spark",    icon: "📓", desc: "Notebooks, Spark, environments" },
  datascience:   { label: "Data Science & AI",    icon: "🤖", desc: "ML, Copilot, workloads" },
  scorecards:    { label: "Scorecards & Metrics", icon: "🎯", desc: "Goals, scorecards, KPIs" },
  subscriptions: { label: "Subscriptions",        icon: "📧", desc: "Email subs, comments, notes" },
  embed:         { label: "Embed & External",     icon: "🔗", desc: "Embed tokens, external shares" },
  domains:       { label: "Domains & Governance",  icon: "🏛️", desc: "Domains, VNet, governance" },
};

// Operation → { category, severity }
// severity: "info" (normal), "warning" (notable), "critical" (security/destructive)
const OPERATION_MAP = {
  // ═══ REPORTS ═══
  ViewReport: { cat: "reports", sev: "info" },
  EditReport: { cat: "reports", sev: "info" },
  CreateReport: { cat: "reports", sev: "info" },
  DeleteReport: { cat: "reports", sev: "critical" },
  CopyReport: { cat: "reports", sev: "info" },
  RenameReport: { cat: "reports", sev: "info" },
  ExportReport: { cat: "reports", sev: "warning" },
  ExportArtifact: { cat: "reports", sev: "warning" },
  ExportArtifactDownload: { cat: "reports", sev: "warning" },
  DownloadReport: { cat: "reports", sev: "warning" },
  PrintReport: { cat: "reports", sev: "info" },
  ShareReport: { cat: "reports", sev: "warning" },
  RebindReport: { cat: "reports", sev: "warning" },
  UpdateReportContent: { cat: "reports", sev: "info" },
  EditReportDescription: { cat: "reports", sev: "info" },
  EditReportProperties: { cat: "reports", sev: "info" },
  PublishToWebReport: { cat: "reports", sev: "critical" },
  ImportArtifactStart: { cat: "reports", sev: "info" },
  ImportArtifactEnd: { cat: "reports", sev: "info" },
  Import: { cat: "reports", sev: "info" },
  CreateReportFromLakehouse: { cat: "reports", sev: "info" },
  GenerateScreenshot: { cat: "reports", sev: "info" },
  ViewUsageMetrics: { cat: "reports", sev: "info" },

  // ═══ DASHBOARDS ═══
  ViewDashboard: { cat: "dashboards", sev: "info" },
  CreateDashboard: { cat: "dashboards", sev: "info" },
  EditDashboard: { cat: "dashboards", sev: "info" },
  DeleteDashboard: { cat: "dashboards", sev: "critical" },
  CopyDashboard: { cat: "dashboards", sev: "info" },
  RenameDashboard: { cat: "dashboards", sev: "info" },
  ShareDashboard: { cat: "dashboards", sev: "warning" },
  PrintDashboard: { cat: "dashboards", sev: "info" },
  AddTile: { cat: "dashboards", sev: "info" },
  EditTile: { cat: "dashboards", sev: "info" },
  DeleteTile: { cat: "dashboards", sev: "warning" },
  CloneTile: { cat: "dashboards", sev: "info" },
  PinTile: { cat: "dashboards", sev: "info" },
  ExportTile: { cat: "dashboards", sev: "warning" },
  ViewTile: { cat: "dashboards", sev: "info" },

  // ═══ SEMANTIC MODELS / DATASETS ═══
  CreateDataset: { cat: "datasets", sev: "info" },
  EditDataset: { cat: "datasets", sev: "info" },
  DeleteDataset: { cat: "datasets", sev: "critical" },
  RefreshDataset: { cat: "datasets", sev: "info" },
  CancelDatasetRefresh: { cat: "datasets", sev: "warning" },
  ShareDataset: { cat: "datasets", sev: "warning" },
  TakeOverDataset: { cat: "datasets", sev: "critical" },
  SetScheduledRefresh: { cat: "datasets", sev: "warning" },
  SetAllConnections: { cat: "datasets", sev: "warning" },
  BindToGateway: { cat: "datasets", sev: "warning" },
  GetDatasources: { cat: "datasets", sev: "info" },
  AnalyzeInExcel: { cat: "datasets", sev: "info" },
  UpdateDatasetParameters: { cat: "datasets", sev: "warning" },
  EditDatasetProperties: { cat: "datasets", sev: "warning" },
  DeleteDatasetRows: { cat: "datasets", sev: "critical" },
  PostDatasetRows: { cat: "datasets", sev: "info" },
  ApplyChangeToPowerBIModel: { cat: "datasets", sev: "warning" },
  ConnectFromExternalApplication: { cat: "datasets", sev: "info" },

  // ═══ DATAFLOWS ═══
  CreateDataflow: { cat: "dataflows", sev: "info" },
  UpdateDataflow: { cat: "dataflows", sev: "info" },
  DeleteDataflow: { cat: "dataflows", sev: "critical" },
  ViewDataflow: { cat: "dataflows", sev: "info" },
  RequestDataflowRefresh: { cat: "dataflows", sev: "info" },
  CancelDataflowRefresh: { cat: "dataflows", sev: "warning" },
  SetScheduledRefreshOnDataflow: { cat: "dataflows", sev: "warning" },
  ExportDataflow: { cat: "dataflows", sev: "warning" },
  TookOverDataflow: { cat: "dataflows", sev: "critical" },

  // ═══ WORKSPACES ═══
  CreateWorkspace: { cat: "workspaces", sev: "info" },
  UpdateWorkspace: { cat: "workspaces", sev: "info" },
  DeleteGroupWorkspace: { cat: "workspaces", sev: "critical" },
  RestoreWorkspace: { cat: "workspaces", sev: "warning" },
  DeleteWorkspaceViaAdminApi: { cat: "workspaces", sev: "critical" },
  DeleteWorkspacesPermanentlyAsAdmin: { cat: "workspaces", sev: "critical" },
  MigrateWorkspaceIntoCapacity: { cat: "workspaces", sev: "warning" },
  ModifyWorkspaceCapacity: { cat: "workspaces", sev: "warning" },
  UpdateWorkspaceAccess: { cat: "workspaces", sev: "warning" },
  UpdateFolderAccess: { cat: "workspaces", sev: "warning" },
  AddGroupMembers: { cat: "workspaces", sev: "warning" },
  DeleteGroupMembers: { cat: "workspaces", sev: "critical" },
  CreateGroup: { cat: "workspaces", sev: "info" },
  DeleteGroup: { cat: "workspaces", sev: "critical" },

  // ═══ DEPLOYMENT PIPELINES ═══
  CreateAlmPipeline: { cat: "pipelines", sev: "info" },
  DeleteAlmPipeline: { cat: "pipelines", sev: "critical" },
  DeployAlmPipeline: { cat: "pipelines", sev: "warning" },
  AssignWorkspaceToAlmPipeline: { cat: "pipelines", sev: "warning" },
  RunArtifact: { cat: "pipelines", sev: "info" },
  CancelRunningArtifact: { cat: "pipelines", sev: "warning" },
  ScheduleArtifact: { cat: "pipelines", sev: "info" },
  CreateArtifact: { cat: "pipelines", sev: "info" },
  DeleteArtifact: { cat: "pipelines", sev: "critical" },
  ShareArtifact: { cat: "pipelines", sev: "warning" },
  TakeOverArtifact: { cat: "pipelines", sev: "critical" },

  // ═══ GATEWAYS ═══
  CreateGateway: { cat: "gateways", sev: "info" },
  UpdateGateway: { cat: "gateways", sev: "warning" },
  DeleteGateway: { cat: "gateways", sev: "critical" },
  AddDatasourceToGateway: { cat: "gateways", sev: "info" },
  RemoveDatasourceFromGateway: { cat: "gateways", sev: "warning" },
  ChangeGatewayAdministrators: { cat: "gateways", sev: "critical" },
  ChangeGatewayDatasourceUsers: { cat: "gateways", sev: "warning" },
  UpdateDatasourceCredentials: { cat: "gateways", sev: "warning" },
  UpdateDatasources: { cat: "gateways", sev: "warning" },
  TakeOverDatasource: { cat: "gateways", sev: "critical" },

  // ═══ APPS ═══
  CreateApp: { cat: "apps", sev: "info" },
  UpdateApp: { cat: "apps", sev: "info" },
  InstallApp: { cat: "apps", sev: "info" },
  UnpublishApp: { cat: "apps", sev: "warning" },
  InstallTemplateApp: { cat: "apps", sev: "info" },
  DeleteTemplateApp: { cat: "apps", sev: "critical" },

  // ═══ CAPACITY & ADMIN ═══
  ChangeCapacityState: { cat: "capacity", sev: "critical" },
  UpdateCapacityUsersAssignment: { cat: "capacity", sev: "critical" },
  UpdateCapacityAdmins: { cat: "capacity", sev: "critical" },
  UpdatedAdminFeatureSwitch: { cat: "capacity", sev: "critical" },
  AddTenantKey: { cat: "capacity", sev: "critical" },
  RotateTenantKey: { cat: "capacity", sev: "critical" },
  ExportActivityEvents: { cat: "capacity", sev: "info" },
  OptInForProTrial: { cat: "capacity", sev: "info" },
  OptInForPPUTrial: { cat: "capacity", sev: "info" },

  // ═══ SECURITY ═══
  SensitivityLabelApplied: { cat: "security", sev: "warning" },
  SensitivityLabelChanged: { cat: "security", sev: "warning" },
  SensitivityLabelRemoved: { cat: "security", sev: "critical" },
  DLPRuleMatch: { cat: "security", sev: "critical" },
  DLPRuleUndo: { cat: "security", sev: "warning" },
  ApplyWorkspaceEncryption: { cat: "security", sev: "critical" },
  DisableWorkspaceEncryption: { cat: "security", sev: "critical" },

  // ═══ LAKEHOUSE ═══
  CreateLakehouseFile: { cat: "lakehouse", sev: "info" },
  DeleteLakehouseFile: { cat: "lakehouse", sev: "warning" },
  CreateLakehouseTable: { cat: "lakehouse", sev: "info" },
  DeleteLakehouseTable: { cat: "lakehouse", sev: "critical" },
  LoadLakehouseTable: { cat: "lakehouse", sev: "info" },
  RefreshLakehouseData: { cat: "lakehouse", sev: "info" },

  // ═══ WAREHOUSE ═══
  CreateWarehouse: { cat: "warehouse", sev: "info" },
  DeleteWarehouse: { cat: "warehouse", sev: "critical" },
  ViewWarehouse: { cat: "warehouse", sev: "info" },
  UpdateWarehouseSettings: { cat: "warehouse", sev: "warning" },
  ShareWarehouse: { cat: "warehouse", sev: "warning" },
  CancelWarehouseBatch: { cat: "warehouse", sev: "warning" },
  CreateDatamart: { cat: "warehouse", sev: "info" },
  DeleteDatamart: { cat: "warehouse", sev: "critical" },
  RefreshDatamart: { cat: "warehouse", sev: "info" },

  // ═══ GIT ═══
  ConnectToGit: { cat: "git", sev: "warning" },
  DisconnectFromGit: { cat: "git", sev: "warning" },
  CommitToGit: { cat: "git", sev: "info" },
  UpdateFromGit: { cat: "git", sev: "info" },
  UndoGit: { cat: "git", sev: "warning" },
  SwitchBranchInGit: { cat: "git", sev: "warning" },
  CreateBranchInGit: { cat: "git", sev: "info" },

  // ═══ NOTEBOOKS ═══
  StartNotebookSession: { cat: "notebooks", sev: "info" },
  StopNotebookSession: { cat: "notebooks", sev: "info" },
  CancelSparkApplication: { cat: "notebooks", sev: "warning" },
  ViewSparkApplication: { cat: "notebooks", sev: "info" },

  // ═══ DATA SCIENCE ═══
  AddExperimentRun: { cat: "datascience", sev: "info" },
  DeleteModelVersion: { cat: "datascience", sev: "critical" },
  DeployModelVersion: { cat: "datascience", sev: "warning" },
  CopilotInteraction: { cat: "datascience", sev: "info" },
  RequestCopilot: { cat: "datascience", sev: "info" },
  RequestOpenAI: { cat: "datascience", sev: "info" },

  // ═══ SCORECARDS ═══
  CreateScorecard: { cat: "scorecards", sev: "info" },
  DeleteScorecard: { cat: "scorecards", sev: "critical" },
  CreateGoal: { cat: "scorecards", sev: "info" },
  DeleteGoal: { cat: "scorecards", sev: "critical" },

  // ═══ SUBSCRIPTIONS ═══
  CreateEmailSubscription: { cat: "subscriptions", sev: "info" },
  DeleteEmailSubscription: { cat: "subscriptions", sev: "warning" },
  RunEmailSubscription: { cat: "subscriptions", sev: "info" },
  PostComment: { cat: "subscriptions", sev: "info" },
  DeleteComment: { cat: "subscriptions", sev: "warning" },

  // ═══ EMBED ═══
  GenerateEmbedToken: { cat: "embed", sev: "info" },
  PublishToWebReport: { cat: "embed", sev: "critical" },
  DeleteEmbedCode: { cat: "embed", sev: "warning" },
  CreateExternalDataShare: { cat: "embed", sev: "warning" },
  RevokeExternalDataShare: { cat: "embed", sev: "warning" },

  // ═══ DOMAINS ═══
  InsertDataDomainAsAdmin: { cat: "domains", sev: "warning" },
  DeleteDataDomainAsAdmin: { cat: "domains", sev: "critical" },
  CreateManagedVNet: { cat: "domains", sev: "warning" },
  DeleteManagedVNet: { cat: "domains", sev: "critical" },
  CreateManagedPrivateEndpoint: { cat: "domains", sev: "warning" },
};

function categorize(operationName) {
  const mapped = OPERATION_MAP[operationName];
  if (mapped) return mapped;

  // Fallback: auto-categorize based on operation name patterns
  const op = operationName.toLowerCase();
  if (op.includes("lakehouse")) return { cat: "lakehouse", sev: "info" };
  if (op.includes("warehouse") || op.includes("datamart") || op.includes("sqlanalytics")) return { cat: "warehouse", sev: "info" };
  if (op.includes("notebook") || op.includes("spark") || op.includes("environment")) return { cat: "notebooks", sev: "info" };
  if (op.includes("git") || op.includes("branch") || op.includes("commit")) return { cat: "git", sev: "info" };
  if (op.includes("gateway") || op.includes("datasource")) return { cat: "gateways", sev: "info" };
  if (op.includes("pipeline") || op.includes("alm") || op.includes("artifact")) return { cat: "pipelines", sev: "info" };
  if (op.includes("scorecard") || op.includes("goal") || op.includes("metric")) return { cat: "scorecards", sev: "info" };
  if (op.includes("report")) return { cat: "reports", sev: "info" };
  if (op.includes("dashboard") || op.includes("tile")) return { cat: "dashboards", sev: "info" };
  if (op.includes("dataset") || op.includes("semantic") || op.includes("refresh")) return { cat: "datasets", sev: "info" };
  if (op.includes("dataflow")) return { cat: "dataflows", sev: "info" };
  if (op.includes("workspace") || op.includes("group") || op.includes("folder")) return { cat: "workspaces", sev: "info" };
  if (op.includes("app") || op.includes("template")) return { cat: "apps", sev: "info" };
  if (op.includes("capacity") || op.includes("admin") || op.includes("tenant")) return { cat: "capacity", sev: "info" };
  if (op.includes("sensitivity") || op.includes("dlp") || op.includes("encrypt")) return { cat: "security", sev: "warning" };
  if (op.includes("embed") || op.includes("external") || op.includes("share")) return { cat: "embed", sev: "info" };
  if (op.includes("domain") || op.includes("vnet") || op.includes("private")) return { cat: "domains", sev: "info" };
  if (op.includes("subscription") || op.includes("email") || op.includes("comment") || op.includes("note")) return { cat: "subscriptions", sev: "info" };
  if (op.includes("copilot") || op.includes("openai") || op.includes("experiment") || op.includes("model")) return { cat: "datascience", sev: "info" };
  if (op.includes("blob") || op.includes("container") || op.includes("file") || op.includes("path")) return { cat: "onelake", sev: "info" };

  return { cat: "capacity", sev: "info" }; // fallback
}

module.exports = { CATEGORIES, OPERATION_MAP, categorize };
