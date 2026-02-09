import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";

/* ══════════════════════════════════════════════
   COMPLETE A-Z OPERATION CATALOG
   Source: Microsoft Fabric Operation List
   https://learn.microsoft.com/en-us/fabric/admin/operation-list
   ══════════════════════════════════════════════ */

const CATEGORIES = {
  reports:      { label: "Reports",              icon: "📊", color: "#22c55e", desc: "View, create, edit, export, print, share reports" },
  dashboards:   { label: "Dashboards",           icon: "📋", color: "#3b82f6", desc: "Dashboard & tile operations" },
  datasets:     { label: "Semantic Models",      icon: "💾", color: "#ec4899", desc: "Dataset/model refresh, edit, parameters, connections" },
  dataflows:    { label: "Dataflows",            icon: "🌊", color: "#06b6d4", desc: "Dataflow create, refresh, schedule, export" },
  workspaces:   { label: "Workspaces",           icon: "🏗️", color: "#f97316", desc: "Workspace create, update, delete, migrate, access" },
  pipelines:    { label: "Deployment Pipelines",  icon: "🚀", color: "#a855f7", desc: "ALM pipeline deploy, assign, configure" },
  gateways:     { label: "Gateways",             icon: "🔌", color: "#64748b", desc: "Gateway cluster, datasource, credentials" },
  apps:         { label: "Apps & Templates",     icon: "📦", color: "#f59e0b", desc: "App install, publish, template app operations" },
  capacity:     { label: "Capacity & Admin",     icon: "⚡", color: "#ef4444", desc: "Capacity settings, admin feature switches, tenant keys" },
  security:     { label: "Security & DLP",       icon: "🔐", color: "#dc2626", desc: "Sensitivity labels, DLP, encryption, access controls" },
  lakehouse:    { label: "Lakehouse",            icon: "🏠", color: "#10b981", desc: "Lakehouse files, folders, tables, shortcuts" },
  warehouse:    { label: "Warehouse & SQL",      icon: "🗄️", color: "#8b5cf6", desc: "Warehouse, SQL analytics endpoint, queries" },
  onelake:      { label: "OneLake Storage",      icon: "☁️", color: "#0ea5e9", desc: "Blob, file, container, directory operations" },
  git:          { label: "Git Integration",      icon: "🔀", color: "#6366f1", desc: "Git connect, commit, branch, sync, undo" },
  notebooks:    { label: "Notebooks & Spark",    icon: "📓", color: "#d946ef", desc: "Notebook sessions, Spark apps, environments" },
  datascience:  { label: "Data Science & AI",    icon: "🤖", color: "#14b8a6", desc: "ML experiments, models, Copilot, OpenAI" },
  scorecards:   { label: "Scorecards & Metrics", icon: "🎯", color: "#eab308", desc: "Goals, scorecards, KPI tracking" },
  subscriptions:{ label: "Subscriptions & Email", icon: "📧", color: "#f43f5e", desc: "Email subscriptions, sharing, notifications" },
  embed:        { label: "Embed & External",     icon: "🔗", color: "#84cc16", desc: "Embed tokens, publish to web, external apps" },
  domains:      { label: "Domains & Governance",  icon: "🏛️", color: "#78716c", desc: "Data domains, governance, VNet, managed endpoints" },
};

const OPERATIONS = {
  reports: [
    { op: "ViewReport", label: "Viewed Report", sev: "info" },
    { op: "EditReport", label: "Edited Report", sev: "info" },
    { op: "CreateReport", label: "Created Report", sev: "info" },
    { op: "DeleteReport", label: "Deleted Report", sev: "critical" },
    { op: "CopyReport", label: "Copied Report", sev: "info" },
    { op: "RenameReport", label: "Renamed Report", sev: "info" },
    { op: "ExportReport", label: "Exported Report", sev: "warning" },
    { op: "ExportArtifact", label: "Exported to File Format", sev: "warning" },
    { op: "ExportArtifactDownload", label: "Downloaded Exported File", sev: "warning" },
    { op: "DownloadReport", label: "Downloaded Report (.pbix)", sev: "warning" },
    { op: "PrintReport", label: "Printed Report", sev: "info" },
    { op: "ShareReport", label: "Shared Report", sev: "warning" },
    { op: "RebindReport", label: "Rebound Report to Dataset", sev: "warning" },
    { op: "UpdateReportContent", label: "Updated Report Content", sev: "info" },
    { op: "EditReportDescription", label: "Edited Report Description", sev: "info" },
    { op: "EditReportProperties", label: "Edited Report Endorsement", sev: "info" },
    { op: "PublishToWebReport", label: "Published Report to Web", sev: "critical" },
    { op: "ImportArtifactStart", label: "Import (.pbix) Started", sev: "info" },
    { op: "ImportArtifactEnd", label: "Import (.pbix) Completed", sev: "info" },
    { op: "Import", label: "Imported File to Power BI", sev: "info" },
    { op: "CreateReportFromLakehouse", label: "Created Report from Lakehouse", sev: "info" },
    { op: "GenerateScreenshot", label: "Generated Screenshot", sev: "info" },
    { op: "ViewUsageMetrics", label: "Viewed Usage Metrics", sev: "info" },
    { op: "SaveAutogeneratedReport", label: "Saved Autogenerated Report", sev: "info" },
  ],
  dashboards: [
    { op: "ViewDashboard", label: "Viewed Dashboard", sev: "info" },
    { op: "CreateDashboard", label: "Created Dashboard", sev: "info" },
    { op: "EditDashboard", label: "Edited Dashboard", sev: "info" },
    { op: "DeleteDashboard", label: "Deleted Dashboard", sev: "critical" },
    { op: "CopyDashboard", label: "Copied Dashboard", sev: "info" },
    { op: "RenameDashboard", label: "Renamed Dashboard", sev: "info" },
    { op: "ShareDashboard", label: "Shared Dashboard", sev: "warning" },
    { op: "PrintDashboard", label: "Printed Dashboard", sev: "info" },
    { op: "AddTile", label: "Added Tile", sev: "info" },
    { op: "EditTile", label: "Edited Tile", sev: "info" },
    { op: "DeleteTile", label: "Deleted Tile", sev: "warning" },
    { op: "PinTile", label: "Pinned Tile", sev: "info" },
    { op: "CloneTile", label: "Cloned Tile", sev: "info" },
    { op: "PinWidgetTile", label: "Pinned Widget Tile", sev: "info" },
    { op: "PinReportToTeamsChannel", label: "Pinned Report to Teams", sev: "info" },
    { op: "ExportTile", label: "Exported Tile Data", sev: "warning" },
    { op: "ViewTile", label: "Viewed Tile", sev: "info" },
  ],
  datasets: [
    { op: "CreateDataset", label: "Created Semantic Model", sev: "info" },
    { op: "EditDataset", label: "Edited Semantic Model", sev: "info" },
    { op: "DeleteDataset", label: "Deleted Semantic Model", sev: "critical" },
    { op: "UpdateDataset", label: "Updated Dataset Properties", sev: "info" },
    { op: "RefreshDataset", label: "Refreshed Dataset", sev: "info" },
    { op: "CancelDatasetRefresh", label: "Cancelled Dataset Refresh", sev: "warning" },
    { op: "ShareDataset", label: "Shared Semantic Model", sev: "warning" },
    { op: "TakeOverDataset", label: "Took Over Dataset", sev: "critical" },
    { op: "ExploreDataset", label: "Explored Dataset", sev: "info" },
    { op: "AnalyzeInExcel", label: "Analyzed in Excel", sev: "info" },
    { op: "AnalyzeInExcelDataset", label: "Analyze in Excel (Dataset)", sev: "info" },
    { op: "AnalyzeInExcelReport", label: "Analyze in Excel (Report)", sev: "info" },
    { op: "AnalyzedByExternalApplication", label: "Analyzed by External App", sev: "info" },
    { op: "EditDatasetProperties", label: "Edited Dataset Properties", sev: "warning" },
    { op: "EditDatasetFromExternalApplication", label: "Edited from External App", sev: "warning" },
    { op: "UpdateDatasetParameters", label: "Updated Parameters", sev: "warning" },
    { op: "UpdateDatasetParametersForSolution", label: "Updated Params (Solution)", sev: "warning" },
    { op: "SetScheduledRefresh", label: "Set Scheduled Refresh", sev: "warning" },
    { op: "SetDQRefreshScheduleOfDataset", label: "Set DirectQuery Schedule", sev: "warning" },
    { op: "SetModelRefreshScheduleOfDataset", label: "Set Model Refresh Schedule", sev: "warning" },
    { op: "SetAllConnections", label: "Changed Connections", sev: "warning" },
    { op: "BindToGateway", label: "Bound to Gateway", sev: "warning" },
    { op: "BindMonikersToDatasources", label: "Bound Monikers to Sources", sev: "info" },
    { op: "GetDatasources", label: "Discovered Data Sources", sev: "info" },
    { op: "DeleteDatasetRows", label: "Deleted Dataset Rows", sev: "critical" },
    { op: "PostDatasetRows", label: "Posted Dataset Rows (Push)", sev: "info" },
    { op: "PutTable", label: "Put Table (Push Dataset)", sev: "info" },
    { op: "RefreshDatasetFromExternalApplication", label: "Refresh from External App", sev: "info" },
    { op: "CreateDatasetFromExternalApplication", label: "Created from External App", sev: "info" },
    { op: "DeleteDatasetFromExternalApplication", label: "Deleted from External App", sev: "critical" },
    { op: "ConnectFromExternalApplication", label: "Connected from External App", sev: "info" },
    { op: "GetPowerBIDataModel", label: "Retrieved Data Model", sev: "info" },
    { op: "ApplyChangeToPowerBIModel", label: "Applied Change to Model", sev: "warning" },
    { op: "SavePowerBIDataModelDiagramLayouts", label: "Saved Model Diagram", sev: "info" },
    { op: "GetPowerBIDataModelDiagramLayouts", label: "Got Model Diagram", sev: "info" },
    { op: "GetDatasetInfo", label: "Got Dataset Info", sev: "info" },
    { op: "SyncDatasetQueryScaleOutReplicas", label: "Synced Scale-Out Replicas", sev: "info" },
    { op: "GetDatasetQueryScaleOutSyncStatus", label: "Got Scale-Out Status", sev: "info" },
    { op: "SaveAutogeneratedDataset", label: "Saved Autogenerated Dataset", sev: "info" },
    { op: "UpdateDiscoverableModelSettings", label: "Updated Discoverable Settings", sev: "info" },
    { op: "UpdateFeaturedTables", label: "Updated Featured Tables", sev: "info" },
    { op: "ManageRelationships", label: "Managed Relationships", sev: "info" },
    { op: "GetDaxCapabilities", label: "Got DAX Capabilities", sev: "info" },
    { op: "GetRelevantMeasures", label: "Got Relevant Measures", sev: "info" },
    { op: "UpdateInPlaceSharingSettings", label: "Updated Sharing Settings", sev: "warning" },
  ],
  dataflows: [
    { op: "CreateDataflow", label: "Created Dataflow", sev: "info" },
    { op: "UpdateDataflow", label: "Updated Dataflow", sev: "info" },
    { op: "DeleteDataflow", label: "Deleted Dataflow", sev: "critical" },
    { op: "ViewDataflow", label: "Viewed Dataflow", sev: "info" },
    { op: "ReadDataflow", label: "Read Dataflow", sev: "info" },
    { op: "PublishDataflow", label: "Published Dataflow", sev: "info" },
    { op: "ExportDataflow", label: "Exported Dataflow", sev: "warning" },
    { op: "RequestDataflowRefresh", label: "Requested Refresh", sev: "info" },
    { op: "CancelDataflowRefresh", label: "Cancelled Refresh", sev: "warning" },
    { op: "SetScheduledRefreshOnDataflow", label: "Set Scheduled Refresh", sev: "warning" },
    { op: "CleanupDataflow", label: "Cleaned Up Dataflow Files", sev: "info" },
    { op: "EditDataflowProperties", label: "Edited Endorsement", sev: "info" },
    { op: "GenerateDataflowSasToken", label: "Generated SAS Token", sev: "warning" },
    { op: "ReceiveDataflowSecretFromKeyVault", label: "Received Key Vault Secret", sev: "warning" },
    { op: "TookOverDataflow", label: "Took Over Dataflow", sev: "critical" },
    { op: "AttachedDataflowStorageAccount", label: "Attached Storage Account", sev: "warning" },
    { op: "SetDataflowStorageLocationForWorkspace", label: "Set Storage Location", sev: "warning" },
  ],
  workspaces: [
    { op: "CreateWorkspace", label: "Created Workspace", sev: "info" },
    { op: "UpdateWorkspace", label: "Updated Workspace", sev: "info" },
    { op: "DeleteGroupWorkspace", label: "Deleted Workspace", sev: "critical" },
    { op: "RestoreWorkspace", label: "Restored Workspace", sev: "warning" },
    { op: "RestoreWorkspaceViaAdminApi", label: "Restored (Admin API)", sev: "critical" },
    { op: "DeleteWorkspaceViaAdminApi", label: "Deleted (Admin API)", sev: "critical" },
    { op: "DeleteWorkspacesPermanentlyAsAdmin", label: "Permanently Deleted", sev: "critical" },
    { op: "DisableWorkspaceViaAdminApi", label: "Disabled Workspace", sev: "critical" },
    { op: "UpgradeWorkspace", label: "Upgraded Workspace", sev: "warning" },
    { op: "DowngradeWorkspace", label: "Downgraded Workspace", sev: "warning" },
    { op: "ConvertPersonalWorkspaceToWorkspace", label: "Converted Personal WS", sev: "info" },
    { op: "MigrateWorkspaceIntoCapacity", label: "Migrated to Capacity", sev: "warning" },
    { op: "ModifyWorkspaceCapacity", label: "Modified Capacity Assignment", sev: "warning" },
    { op: "RemoveWorkspacesFromCapacity", label: "Removed from Capacity", sev: "warning" },
    { op: "UpdateWorkspaceAccess", label: "Updated Workspace Access", sev: "warning" },
    { op: "UpdateFolderAccess", label: "Updated Folder Access", sev: "warning" },
    { op: "CreateFolder", label: "Created Folder", sev: "info" },
    { op: "UpdateFolder", label: "Updated Folder", sev: "info" },
    { op: "DeleteFolder", label: "Deleted Folder", sev: "critical" },
    { op: "AddFolderAccess", label: "Added Folder Access", sev: "warning" },
    { op: "DeleteFolderAccess", label: "Deleted Folder Access", sev: "warning" },
    { op: "GetWorkspaces", label: "Retrieved Workspaces", sev: "info" },
    { op: "GetGroupsAsAdmin", label: "Got Groups (Admin)", sev: "info" },
    { op: "GetGroupUsers", label: "Got Group Users", sev: "info" },
    { op: "AddGroupMembers", label: "Added Group Members", sev: "warning" },
    { op: "DeleteGroupMembers", label: "Removed Group Members", sev: "critical" },
    { op: "CreateGroup", label: "Created Group", sev: "info" },
    { op: "DeleteGroup", label: "Deleted Group", sev: "critical" },
    { op: "UpdateGroup", label: "Updated Group", sev: "info" },
    { op: "AddWorkspaceRoleViaAdminApi", label: "Added Workspace Role", sev: "warning" },
    { op: "UpdateWorkspaceRoleViaAdminApi", label: "Updated Workspace Role", sev: "warning" },
    { op: "DeleteWorkspaceRoleViaAdminApi", label: "Deleted Workspace Role", sev: "critical" },
    { op: "CreateSubfolder", label: "Created Subfolder", sev: "info" },
    { op: "UpdateSubfolder", label: "Updated Subfolder", sev: "info" },
    { op: "DeleteSubfolder", label: "Deleted Subfolder", sev: "warning" },
    { op: "MoveItemsIntoSubfolder", label: "Moved Items to Subfolder", sev: "info" },
    { op: "CreateTaskFlow", label: "Created Task Flow", sev: "info" },
    { op: "UpdateTaskFlow", label: "Updated Task Flow", sev: "info" },
    { op: "GetTaskFlow", label: "Got Task Flow", sev: "info" },
    { op: "CreateWorkspaceIdentityViaApi", label: "Created Fabric Identity", sev: "warning" },
    { op: "DeleteWorkspaceIdentityViaApi", label: "Deleted Fabric Identity", sev: "critical" },
    { op: "GetWorkspaceIdentityViaApi", label: "Got Fabric Identity", sev: "info" },
    { op: "GetWorkspaceIdentityTokenViaApi", label: "Got Identity Token", sev: "info" },
  ],
  pipelines: [
    { op: "CreateAlmPipeline", label: "Created Deployment Pipeline", sev: "info" },
    { op: "DeleteAlmPipeline", label: "Deleted Pipeline", sev: "critical" },
    { op: "UpdateAlmPipeline", label: "Updated Pipeline", sev: "info" },
    { op: "DeployAlmPipeline", label: "Deployed to Stage", sev: "warning" },
    { op: "AssignWorkspaceToAlmPipeline", label: "Assigned Workspace", sev: "warning" },
    { op: "UnassignWorkspaceFromAlmPipeline", label: "Unassigned Workspace", sev: "warning" },
    { op: "SetConfigurationAlmPipeline", label: "Updated Configuration", sev: "warning" },
    { op: "UpdateAlmPipelineAccess", label: "Updated Pipeline Access", sev: "warning" },
    { op: "DeleteAlmPipelineAccess", label: "Deleted Pipeline Access", sev: "critical" },
    { op: "UpdateAlmPipelineAccessAsAdmin", label: "Updated Access (Admin)", sev: "critical" },
    { op: "DeleteAlmPipelineAccessAsAdmin", label: "Deleted Access (Admin)", sev: "critical" },
    { op: "AddArtifactToPipeline", label: "Added Artifact to Pipeline", sev: "info" },
    { op: "GetAlmPipelinesAsAdmin", label: "Got Pipelines (Admin)", sev: "info" },
    { op: "GetAlmPipelineUsersAsAdmin", label: "Got Pipeline Users (Admin)", sev: "info" },
    { op: "RunArtifact", label: "Ran Artifact", sev: "info" },
    { op: "CancelRunningArtifact", label: "Cancelled Running Artifact", sev: "warning" },
    { op: "ScheduleArtifact", label: "Scheduled Artifact", sev: "info" },
    { op: "CreateArtifact", label: "Created Artifact", sev: "info" },
    { op: "ReadArtifact", label: "Read Artifact", sev: "info" },
    { op: "UpdateArtifact", label: "Updated Artifact", sev: "info" },
    { op: "DeleteArtifact", label: "Deleted Artifact", sev: "critical" },
    { op: "ShareArtifact", label: "Shared Artifact", sev: "warning" },
    { op: "EditArtifactEndorsement", label: "Edited Endorsement", sev: "info" },
    { op: "TakeOverArtifact", label: "Took Over Artifact", sev: "critical" },
  ],
  gateways: [
    { op: "CreateGateway", label: "Created Gateway", sev: "info" },
    { op: "UpdateGateway", label: "Updated Gateway", sev: "warning" },
    { op: "DeleteGateway", label: "Deleted Gateway", sev: "critical" },
    { op: "DeleteGatewayCluster", label: "Deleted Gateway Cluster", sev: "critical" },
    { op: "AddDatasourceToGateway", label: "Added Datasource", sev: "info" },
    { op: "RemoveDatasourceFromGateway", label: "Removed Datasource", sev: "warning" },
    { op: "ChangeGatewayAdministrators", label: "Changed Admins", sev: "critical" },
    { op: "ChangeGatewayDatasourceUsers", label: "Changed Datasource Users", sev: "warning" },
    { op: "EncryptCredentials", label: "Encrypted Credentials", sev: "info" },
    { op: "EncryptClusterCredentials", label: "Encrypted Cluster Creds", sev: "info" },
    { op: "ReencryptCredentials", label: "Re-encrypted Credentials", sev: "warning" },
    { op: "UpdateDatasourceCredentials", label: "Updated DS Credentials", sev: "warning" },
    { op: "UpdateDatasources", label: "Updated Data Sources", sev: "warning" },
    { op: "UpdateDatasource", label: "Updated Datasource", sev: "warning" },
    { op: "TakeOverDatasource", label: "Took Over Datasource", sev: "critical" },
    { op: "CreateGatewayClusterDatasource", label: "Created Cluster DS", sev: "info" },
    { op: "UpdateGatewayClusterDatasource", label: "Updated Cluster DS", sev: "warning" },
    { op: "DeleteGatewayClusterDatasource", label: "Deleted Cluster DS", sev: "critical" },
    { op: "UpdateGatewayClusterDatasourceCredentials", label: "Updated Cluster DS Creds", sev: "warning" },
    { op: "CreateGatewayClusterUser", label: "Created Cluster User", sev: "info" },
    { op: "RemoveGatewayClusterUser", label: "Removed Cluster User", sev: "critical" },
    { op: "RemoveGatewayClusterDatasourceUser", label: "Removed DS User", sev: "critical" },
    { op: "DeleteGatewayClusterMember", label: "Deleted Cluster Member", sev: "critical" },
    { op: "UpdateGatewayClusterMember", label: "Updated Cluster Member", sev: "warning" },
    { op: "PatchGatewayCluster", label: "Patched Gateway Cluster", sev: "warning" },
    { op: "InitiateGatewayClusterOAuthLogin", label: "Initiated OAuth Login", sev: "info" },
    { op: "GatewayClusterSSOTestConnection", label: "SSO Test Connection", sev: "info" },
    { op: "GatewayClusterDatasourceSSOTestConnection", label: "DS SSO Test", sev: "info" },
    { op: "UpdateGatewayInstallerPrincipals", label: "Updated Installer Principals", sev: "critical" },
    { op: "UpdateGatewayTenantPolicy", label: "Updated Tenant Policy", sev: "critical" },
    { op: "GetGatewayTenantPolicy", label: "Got Tenant Policy", sev: "info" },
    { op: "GetGatewayTenantKeys", label: "Got Tenant Keys", sev: "info" },
    { op: "CreateGatewayTenantKey", label: "Created Tenant Key", sev: "warning" },
    { op: "CreateVirtualNetworkDataGatewayProxy", label: "Created VNet GW Proxy", sev: "info" },
    { op: "UpdateVirtualNetworkDataGatewayProxy", label: "Updated VNet GW Proxy", sev: "warning" },
    { op: "DeleteVirtualNetworkDataGatewayProxy", label: "Deleted VNet GW Proxy", sev: "critical" },
    { op: "GetVirtualNetworkDataGatewayProxy", label: "Got VNet GW Proxy", sev: "info" },
    { op: "CreateCloudDatasource", label: "Created Cloud DS", sev: "info" },
    { op: "CreateCloudDatasourceFromKindPath", label: "Created Cloud DS (Kind)", sev: "info" },
    { op: "CreateGatewayClusterDatasourceFromKindPath", label: "Created GW DS (Kind)", sev: "info" },
  ],
  apps: [
    { op: "CreateApp", label: "Created App", sev: "info" },
    { op: "UpdateApp", label: "Updated App", sev: "info" },
    { op: "InstallApp", label: "Installed App", sev: "info" },
    { op: "UnpublishApp", label: "Unpublished App", sev: "warning" },
    { op: "CreateOrgApp", label: "Created Org App", sev: "info" },
    { op: "DeleteOrgApp", label: "Deleted Org App", sev: "critical" },
    { op: "InstantiateApp", label: "Instantiated App", sev: "info" },
    { op: "CreateTemplateApp", label: "Created Template App", sev: "info" },
    { op: "DeleteTemplateApp", label: "Deleted Template App", sev: "critical" },
    { op: "InstallTemplateApp", label: "Installed Template App", sev: "info" },
    { op: "CreateTemplateAppPackage", label: "Created Package", sev: "info" },
    { op: "DeleteTemplateAppPackage", label: "Deleted Package", sev: "critical" },
    { op: "ExtractTemplateAppPackage", label: "Extracted Package", sev: "info" },
    { op: "PromoteTemplateAppPackage", label: "Promoted Package", sev: "warning" },
    { op: "CreateTemplateAppInstallTicket", label: "Created Install Ticket", sev: "info" },
    { op: "UpdateInstalledTemplateAppParameters", label: "Updated Params", sev: "warning" },
    { op: "UpdateTemplateAppSettings", label: "Updated Settings", sev: "warning" },
    { op: "UpdateTemplateAppTestPackagePermissions", label: "Updated Test Perms", sev: "warning" },
    { op: "EditContentProviderProperties", label: "Edited App Endorsement", sev: "info" },
    { op: "UpdateAccessRequestSettings", label: "Updated Access Request", sev: "warning" },
  ],
  capacity: [
    { op: "ChangeCapacityState", label: "Changed Capacity State", sev: "critical" },
    { op: "UpdateCapacityUsersAssignment", label: "Changed User Assignment", sev: "critical" },
    { op: "UpdateCapacityAdmins", label: "Updated Capacity Admins", sev: "critical" },
    { op: "UpdateCapacityCustomSettings", label: "Updated Custom Settings", sev: "critical" },
    { op: "UpdateCapacityDisplayName", label: "Updated Display Name", sev: "info" },
    { op: "UpdateCapacityResourceGovernanceSettings", label: "Updated Governance", sev: "critical" },
    { op: "UpdatedAdminFeatureSwitch", label: "Changed Org Settings", sev: "critical" },
    { op: "GetTenantSettingsViaAdminApi", label: "Got Tenant Settings", sev: "info" },
    { op: "AddTenantKey", label: "Added Tenant Key", sev: "critical" },
    { op: "RotateTenantKey", label: "Rotated Tenant Key", sev: "critical" },
    { op: "RotateTenantKeyEncryptionKey", label: "Rotated Encryption Key", sev: "critical" },
    { op: "SetCapacityTenantKey", label: "Set Capacity Tenant Key", sev: "critical" },
    { op: "GetTenantKeysAsAdmin", label: "Got Tenant Keys", sev: "info" },
    { op: "UpdateDefaultPersonalWorkspaceCapacity", label: "Updated Default WS Capacity", sev: "warning" },
    { op: "ExportActivityEvents", label: "Exported Activity Events", sev: "info" },
    { op: "UpdateCapacityTenantSettingDelegation", label: "Updated Capacity Delegation", sev: "critical" },
    { op: "DeleteCapacityTenantSettingDelegation", label: "Deleted Capacity Delegation", sev: "critical" },
    { op: "UpdateWorkspaceTenantSettingDelegation", label: "Updated WS Delegation", sev: "critical" },
    { op: "DeleteWorkspaceTenantSettingDelegation", label: "Deleted WS Delegation", sev: "critical" },
    { op: "UpdateDomainTenantSettingDelegation", label: "Updated Domain Delegation", sev: "critical" },
    { op: "DeleteDomainTenantSettingDelegation", label: "Deleted Domain Delegation", sev: "critical" },
    { op: "OptInForProTrial", label: "Started Pro Trial", sev: "info" },
    { op: "OptInForPPUTrial", label: "Started PPU Trial", sev: "info" },
    { op: "TrialLicenseExtension", label: "Extended Trial License", sev: "warning" },
    { op: "AddAdminPersonalWorkspaceAccess", label: "Admin Accessed Personal WS", sev: "critical" },
    { op: "RemoveAdminPersonalWorkspaceAccess", label: "Admin Removed Personal WS", sev: "critical" },
  ],
  security: [
    { op: "SensitivityLabelApplied", label: "Sensitivity Label Applied", sev: "warning" },
    { op: "SensitivityLabelChanged", label: "Sensitivity Label Changed", sev: "warning" },
    { op: "SensitivityLabelRemoved", label: "Sensitivity Label Removed", sev: "critical" },
    { op: "DLPInfo", label: "DLP Info Event", sev: "info" },
    { op: "DLPRuleMatch", label: "DLP Rule Matched", sev: "critical" },
    { op: "DLPRuleUndo", label: "DLP Rule Undone", sev: "warning" },
    { op: "ApplyWorkspaceEncryption", label: "Applied CMK Encryption", sev: "critical" },
    { op: "DisableWorkspaceEncryption", label: "Disabled CMK Encryption", sev: "critical" },
    { op: "GetWorkspaceEncryption", label: "Viewed Encryption Settings", sev: "info" },
    { op: "EnableWorkspaceOutboundAccessProtection", label: "Enabled Outbound Protection", sev: "warning" },
    { op: "DisableWorkspaceOutboundAccessProtection", label: "Disabled Outbound Protection", sev: "critical" },
    { op: "ArtifactAccessRequest", label: "Artifact Access Request", sev: "info" },
    { op: "SetLakehouseSensitivityLabel", label: "Set Lakehouse Label", sev: "warning" },
    { op: "AllowedInUntrustedContextsViaApi", label: "Untrusted Context Setting", sev: "critical" },
    { op: "GetTenantDlpPolicies", label: "Got DLP Policies", sev: "info" },
    { op: "UpdateTenantDlpPolicies", label: "Updated DLP Policies", sev: "critical" },
    { op: "EvaluateDataSourcesAgainstTenantDlpPolicies", label: "Evaluated DS vs DLP", sev: "info" },
    { op: "InsertOrganizationalGalleryItem", label: "Added Org Custom Visual", sev: "warning" },
    { op: "UpdateOrganizationalGalleryItem", label: "Updated Org Custom Visual", sev: "warning" },
    { op: "DeleteOrganizationalGalleryItem", label: "Deleted Org Custom Visual", sev: "critical" },
    { op: "GenerateCustomVisualAADAccessToken", label: "Custom Visual AAD Token", sev: "info" },
  ],
  lakehouse: [
    { op: "CreateLakehouseFile", label: "Created File", sev: "info" },
    { op: "CreateLakehouseFolder", label: "Created Folder", sev: "info" },
    { op: "CreateLakehouseTable", label: "Created Table", sev: "info" },
    { op: "DeleteLakehouseFile", label: "Deleted File", sev: "warning" },
    { op: "DeleteLakehouseFolder", label: "Deleted Folder", sev: "warning" },
    { op: "DeleteLakehouseTable", label: "Deleted Table", sev: "critical" },
    { op: "DropLakehouseFile", label: "Dropped File", sev: "warning" },
    { op: "DropLakehouseFolder", label: "Dropped Folder", sev: "warning" },
    { op: "DropLakehouseTable", label: "Dropped Table", sev: "critical" },
    { op: "RenameLakehouseFile", label: "Renamed File", sev: "info" },
    { op: "RenameLakehouseFolder", label: "Renamed Folder", sev: "info" },
    { op: "RenameLakehouseTable", label: "Renamed Table", sev: "info" },
    { op: "LoadLakehouseTable", label: "Loaded Table", sev: "info" },
    { op: "ListLakehouseTables", label: "Listed Tables", sev: "info" },
    { op: "PreviewLakehouseTable", label: "Previewed Table", sev: "info" },
    { op: "ShareLakehouseTable", label: "Shared Table", sev: "warning" },
    { op: "GetLakehouseTableDetails", label: "Got Table Details", sev: "info" },
    { op: "GetBatchLakehouseTableDetails", label: "Got Batch Table Details", sev: "info" },
    { op: "RefreshLakehouseData", label: "Refreshed Lakehouse Data", sev: "info" },
    { op: "SetLakehouseEndorsement", label: "Set Endorsement", sev: "info" },
    { op: "CreateLakehouseShortcutLink", label: "Created Shortcut", sev: "info" },
    { op: "RetryLakehouseSqlEndpointCreation", label: "Retried SQL Endpoint", sev: "warning" },
    { op: "CreateOrUpdateDataAccessRoles", label: "Created/Updated Access Roles", sev: "warning" },
    { op: "ListDataAccessRoles", label: "Listed Access Roles", sev: "info" },
  ],
  warehouse: [
    { op: "CreateWarehouse", label: "Created Warehouse", sev: "info" },
    { op: "DeleteWarehouse", label: "Deleted Warehouse", sev: "critical" },
    { op: "RenameWarehouse", label: "Renamed Warehouse", sev: "info" },
    { op: "ViewWarehouse", label: "Viewed Warehouse", sev: "info" },
    { op: "UpdateWarehouse", label: "Updated Warehouse", sev: "info" },
    { op: "UpdateWarehouseSettings", label: "Updated WH Settings", sev: "warning" },
    { op: "UpdateWarehouseMetadata", label: "Updated WH Metadata", sev: "info" },
    { op: "ShareWarehouse", label: "Shared Warehouse", sev: "warning" },
    { op: "EditWarehouseEndorsement", label: "Edited Endorsement", sev: "info" },
    { op: "CancelWarehouseBatch", label: "Cancelled WH Batch", sev: "warning" },
    { op: "UpsertWarehouseParameters", label: "Upserted WH Params", sev: "warning" },
    { op: "ResumeSuspendedWarehouse", label: "Resumed Suspended WH", sev: "warning" },
    { op: "CreateSqlQueryFromWarehouse", label: "Created SQL Query", sev: "info" },
    { op: "CreateVisualQueryFromWarehouse", label: "Created Visual Query", sev: "info" },
    { op: "DeleteSqlQueryFromWarehouse", label: "Deleted SQL Query", sev: "warning" },
    { op: "ConnectWarehouseAndSqlAnalyticsEndpointLakehouseFromExternalApp", label: "Connected from External App", sev: "info" },
    { op: "ViewSqlAnalyticsEndpointLakehouse", label: "Viewed SQL Endpoint", sev: "info" },
    { op: "UpdateSqlAnalyticsEndpointLakehouse", label: "Updated SQL Endpoint", sev: "info" },
    { op: "UpdateSqlAnalyticsEndpointLakehouseSettings", label: "Updated SQL EP Settings", sev: "warning" },
    { op: "EditSqlAnalyticsEndpointLakehouseEndorsement", label: "Edited SQL EP Endorsement", sev: "info" },
    { op: "CancelSqlAnalyticsEndpointLakehouseBatch", label: "Cancelled SQL EP Batch", sev: "warning" },
    { op: "RefreshSqlAnalyticsEndpointLakehouseMetadata", label: "Refreshed SQL EP Metadata", sev: "info" },
    { op: "ResumeSuspendedSqlAnalyticsEndpointLakehouse", label: "Resumed Suspended SQL EP", sev: "warning" },
    { op: "CreateSqlQueryFromSqlAnalyticsEndpointLakehouse", label: "Created SQL EP Query", sev: "info" },
    { op: "CreateVisualQueryFromSqlAnalyticsEndpointLakehouse", label: "Created SQL EP Visual Query", sev: "info" },
    { op: "DeleteSqlQueryFromSqlAnalyticsEndpointLakehouse", label: "Deleted SQL EP Query", sev: "warning" },
    { op: "UpsertSqlAnalyticsEndpointLakehouseParameters", label: "Upserted SQL EP Params", sev: "warning" },
    { op: "CreateDatamart", label: "Created Datamart", sev: "info" },
    { op: "DeleteDatamart", label: "Deleted Datamart", sev: "critical" },
    { op: "RenameDatamart", label: "Renamed Datamart", sev: "info" },
    { op: "ViewDatamart", label: "Viewed Datamart", sev: "info" },
    { op: "UpdateDatamart", label: "Updated Datamart", sev: "info" },
    { op: "ShareDatamart", label: "Shared Datamart", sev: "warning" },
    { op: "RefreshDatamart", label: "Refreshed Datamart", sev: "info" },
    { op: "CancelDatamartBatch", label: "Cancelled Datamart Batch", sev: "warning" },
    { op: "ResumeSuspendedDatamart", label: "Resumed Datamart", sev: "warning" },
    { op: "GetDataArtifactTableDetails", label: "Got Data Artifact Details", sev: "info" },
  ],
  onelake: [
    { op: "GetBlob", label: "Read Blob", sev: "info" },
    { op: "PutBlob", label: "Created/Replaced Blob", sev: "info" },
    { op: "PutBlobFromURL", label: "Created Blob from URL", sev: "info" },
    { op: "CopyBlob", label: "Copied Blob", sev: "info" },
    { op: "DeleteBlob", label: "Deleted Blob/File", sev: "warning" },
    { op: "UndeleteBlob", label: "Restored Deleted Blob", sev: "info" },
    { op: "AbortCopyBlob", label: "Aborted Copy Blob", sev: "warning" },
    { op: "QueryBlobContents", label: "Queried Blob Contents", sev: "info" },
    { op: "GetBlobMetadata", label: "Got Blob Metadata", sev: "info" },
    { op: "SetBlobMetadata", label: "Set Blob Metadata", sev: "info" },
    { op: "SetBlobProperties", label: "Set Blob Properties", sev: "info" },
    { op: "SetBlobExpiry", label: "Set Blob Expiry", sev: "warning" },
    { op: "SetBlobTier", label: "Set Blob Tier", sev: "info" },
    { op: "LeaseBlob", label: "Leased Blob", sev: "info" },
    { op: "PutBlock", label: "Put Block", sev: "info" },
    { op: "PutBlockList", label: "Put Block List (Commit)", sev: "info" },
    { op: "GetBlockList", label: "Got Block List", sev: "info" },
    { op: "AppendBlock", label: "Appended Block", sev: "info" },
    { op: "AppendBlockFromURL", label: "Appended Block from URL", sev: "info" },
    { op: "ListBlob", label: "Listed Blobs", sev: "info" },
    { op: "CreateFile", label: "Created File (DFS)", sev: "info" },
    { op: "ReadFileOrGetBlob", label: "Read File", sev: "info" },
    { op: "DeleteFileOrBlob", label: "Deleted File/Blob", sev: "warning" },
    { op: "AppendDataToFile", label: "Appended Data to File", sev: "info" },
    { op: "FlushDataToFile", label: "Flushed Data to File", sev: "info" },
    { op: "RenameFileOrDirectory", label: "Renamed File/Directory", sev: "info" },
    { op: "GetFileOrBlobProperties", label: "Got File Properties", sev: "info" },
    { op: "SetFileProperties", label: "Set File Properties", sev: "info" },
    { op: "GetPathStatus", label: "Got Path Status", sev: "info" },
    { op: "GetProperties", label: "Got Properties", sev: "info" },
    { op: "ListFilePath", label: "Listed File Paths", sev: "info" },
    { op: "CreateDirectory", label: "Created Directory", sev: "info" },
    { op: "CreateContainer", label: "Created Container (WS)", sev: "info" },
    { op: "DeleteContainer", label: "Deleted Container (WS)", sev: "critical" },
    { op: "RestoreContainer", label: "Restored Container", sev: "warning" },
    { op: "LeaseContainer", label: "Leased Container", sev: "info" },
    { op: "SetContainerAcl", label: "Set Container ACL", sev: "warning" },
    { op: "SetContainerMetadata", label: "Set Container Metadata", sev: "info" },
    { op: "CreateFileSystem", label: "Created File System", sev: "info" },
    { op: "DeleteFileSystem", label: "Deleted File System", sev: "critical" },
    { op: "PatchFileSystem", label: "Patched File System", sev: "info" },
    { op: "LeasePath", label: "Leased Path", sev: "info" },
    { op: "CheckAccessFileOrBlob", label: "Checked Access", sev: "info" },
    { op: "GetAccessControlListForFile", label: "Got ACL", sev: "info" },
    { op: "SetAccessControlForFile", label: "Set File ACL", sev: "warning" },
    { op: "CreateShortcut", label: "Created Shortcut", sev: "info" },
    { op: "DeleteShortcut", label: "Deleted Shortcut", sev: "warning" },
    { op: "GetShortcut", label: "Got Shortcut Metadata", sev: "info" },
    { op: "GetArtifactRoles", label: "Got USEC Roles", sev: "info" },
    { op: "UpdateArtifactRoles", label: "Updated USEC Roles", sev: "warning" },
  ],
  git: [
    { op: "ConnectToGit", label: "Connected to Git", sev: "warning" },
    { op: "DisconnectFromGit", label: "Disconnected from Git", sev: "warning" },
    { op: "CommitToGit", label: "Committed to Git", sev: "info" },
    { op: "UpdateFromGit", label: "Updated from Git", sev: "info" },
    { op: "UndoGit", label: "Undid Git Changes", sev: "warning" },
    { op: "SwitchBranchInGit", label: "Switched Branch", sev: "warning" },
    { op: "CheckoutBranchInGit", label: "Checked Out Branch", sev: "info" },
    { op: "CreateBranchInGit", label: "Created Branch", sev: "info" },
    { op: "CreateDirectoryInGit", label: "Created Directory", sev: "info" },
    { op: "BranchOutInGit", label: "Branched Out (Fork)", sev: "warning" },
    { op: "GetPendingChangeStatus", label: "Got Pending Changes", sev: "info" },
    { op: "AutoBindGitCredentials", label: "Auto-Bound Git Creds", sev: "info" },
    { op: "PostGitProviderCredentials", label: "Configured Git Creds", sev: "warning" },
    { op: "DeleteGitProviderCredentials", label: "Deleted Git Creds", sev: "warning" },
  ],
  notebooks: [
    { op: "StartNotebookSession", label: "Started Session", sev: "info" },
    { op: "StopNotebookSession", label: "Stopped Session", sev: "info" },
    { op: "CommitNotebook", label: "Committed Notebook", sev: "info" },
    { op: "CoAuthorNotebook", label: "Co-Authored Notebook", sev: "info" },
    { op: "PostNotebookComment", label: "Posted Comment", sev: "info" },
    { op: "SetNotebookDefaultLakehouse", label: "Set Default Lakehouse", sev: "info" },
    { op: "AttachNotebookEnvironment", label: "Attached Environment", sev: "info" },
    { op: "CreateNotebookResource", label: "Created NB Resource", sev: "info" },
    { op: "UpdateNotebookResource", label: "Updated NB Resource", sev: "info" },
    { op: "DeleteNotebookResource", label: "Deleted NB Resource", sev: "warning" },
    { op: "DownloadNotebookResource", label: "Downloaded NB Resource", sev: "info" },
    { op: "UpdateNotebookLibrary", label: "Updated NB Library", sev: "info" },
    { op: "UpdateNotebookSparkProperty", label: "Updated Spark Property", sev: "warning" },
    { op: "OverrideSjdSparkSettings", label: "Overrode Spark Settings", sev: "warning" },
    { op: "SetSjdRetryPolicy", label: "Set Spark Retry Policy", sev: "info" },
    { op: "CancelSparkApplication", label: "Cancelled Spark App", sev: "warning" },
    { op: "ViewSparkApplication", label: "Viewed Spark App", sev: "info" },
    { op: "ViewSparkAppLog", label: "Viewed Spark Log", sev: "info" },
    { op: "LoadSparkAppLog", label: "Loaded Spark Log", sev: "info" },
    { op: "DownloadSparkAppLog", label: "Downloaded Spark Log", sev: "info" },
    { op: "ViewSparkAppInputOutput", label: "Viewed Spark I/O", sev: "info" },
    { op: "CreateEnvironmentResource", label: "Created Env Resource", sev: "info" },
    { op: "UpdateEnvironmentResource", label: "Updated Env Resource", sev: "info" },
    { op: "DeleteEnvironmentResource", label: "Deleted Env Resource", sev: "warning" },
    { op: "ReadEnvironmentResource", label: "Read Env Resource", sev: "info" },
    { op: "DownloadEnvironmentResource", label: "Downloaded Env Resource", sev: "info" },
    { op: "UpdateEnvironmentSparkSettings", label: "Updated Env Spark Settings", sev: "warning" },
    { op: "StartPublishEnvironment", label: "Started Publish Env", sev: "info" },
    { op: "FinishPublishEnvironment", label: "Finished Publish Env", sev: "info" },
    { op: "CancelPublishEnvironment", label: "Cancelled Publish Env", sev: "warning" },
  ],
  datascience: [
    { op: "AddExperimentRun", label: "Added Experiment Run", sev: "info" },
    { op: "ReadExperimentRun", label: "Read Experiment Run", sev: "info" },
    { op: "UpdateExperimentRun", label: "Updated Experiment Run", sev: "info" },
    { op: "DeleteExperimentRun", label: "Deleted Experiment Run", sev: "warning" },
    { op: "AddModelVersion", label: "Added Model Version", sev: "info" },
    { op: "DeleteModelVersion", label: "Deleted Model Version", sev: "critical" },
    { op: "DeployModelVersion", label: "Deployed Model Version", sev: "warning" },
    { op: "CopilotInteraction", label: "Copilot Interaction", sev: "info" },
    { op: "RequestCopilot", label: "Requested Copilot", sev: "info" },
    { op: "RequestOpenAI", label: "Requested OpenAI Model", sev: "info" },
    { op: "RequestCognitiveService", label: "Requested Cognitive Service", sev: "info" },
    { op: "RequestSparkCodeFirst", label: "Requested OpenAI via Spark", sev: "info" },
    { op: "AttachSourceGraphQL", label: "Attached GraphQL Source", sev: "info" },
    { op: "UpdateSourceGraphQL", label: "Updated GraphQL Source", sev: "info" },
    { op: "DeleteSourceGraphQL", label: "Deleted GraphQL Source", sev: "warning" },
    { op: "DeployUserAppFunctionSet", label: "Deployed FunctionSet App", sev: "warning" },
    { op: "ExtensibilityActivationDynamic", label: "Added Workload (Dynamic)", sev: "warning" },
    { op: "ExtensibilityActivationStatic", label: "Added Workload Version", sev: "warning" },
    { op: "ExtensibilityDeactivation", label: "Removed Workload", sev: "warning" },
    { op: "ExtensibilityUpdatePublishingState", label: "Published/Unpublished Workload", sev: "warning" },
    { op: "ExtensibilityUploadPackage", label: "Uploaded Workload Package", sev: "info" },
    { op: "ExtensibilityDeletePackage", label: "Deleted Workload Package", sev: "warning" },
    { op: "ExtensibilityRegisterDevInstance", label: "Registered Dev Workload", sev: "info" },
  ],
  scorecards: [
    { op: "CreateScorecard", label: "Created Scorecard", sev: "info" },
    { op: "DeleteScorecard", label: "Deleted Scorecard", sev: "critical" },
    { op: "GetScorecard", label: "Got Scorecard", sev: "info" },
    { op: "PatchScorecard", label: "Patched Scorecard", sev: "info" },
    { op: "CopyScorecard", label: "Copied Scorecard", sev: "info" },
    { op: "MoveScorecard", label: "Moved Scorecard", sev: "info" },
    { op: "ExportScorecard", label: "Exported Scorecard", sev: "warning" },
    { op: "ProvisionScorecard", label: "Provisioned Scorecard", sev: "info" },
    { op: "CheckScorecardAccess", label: "Checked Access", sev: "info" },
    { op: "CreateGoal", label: "Created Metric/Goal", sev: "info" },
    { op: "DeleteGoal", label: "Deleted Metric", sev: "critical" },
    { op: "PatchGoal", label: "Patched Metric", sev: "info" },
    { op: "GetGoal", label: "Got Metric", sev: "info" },
    { op: "UpdateGoals", label: "Updated Goals", sev: "info" },
    { op: "DeleteGoals", label: "Deleted Goals", sev: "critical" },
    { op: "MoveGoals", label: "Moved Goals", sev: "info" },
    { op: "FollowGoal", label: "Followed Goal", sev: "info" },
    { op: "UnfollowGoal", label: "Unfollowed Goal", sev: "info" },
    { op: "CreateGoalValue", label: "Created Goal Value", sev: "info" },
    { op: "DeleteGoalValue", label: "Deleted Goal Value", sev: "warning" },
    { op: "PatchGoalValue", label: "Patched Goal Value", sev: "info" },
    { op: "GetGoalValue", label: "Got Goal Value", sev: "info" },
    { op: "UpsertGoalValues", label: "Upserted Goal Values", sev: "info" },
    { op: "UpsertGoalCurrentValueConnection", label: "Set Current Value Conn", sev: "info" },
    { op: "UpsertGoalTargetValueConnection", label: "Set Target Value Conn", sev: "info" },
    { op: "DeleteGoalCurrentValueConnection", label: "Deleted Current Conn", sev: "warning" },
    { op: "DeleteGoalTargetValueConnection", label: "Deleted Target Conn", sev: "warning" },
    { op: "RefreshGoalCurrentValue", label: "Refreshed Current Value", sev: "info" },
    { op: "RefreshGoalTargetValue", label: "Refreshed Target Value", sev: "info" },
    { op: "CreateScorecardHierarchy", label: "Created Hierarchy", sev: "info" },
    { op: "UpdateScorecardHierarchy", label: "Updated Hierarchy", sev: "info" },
    { op: "DeleteScorecardHierarchy", label: "Deleted Hierarchy", sev: "warning" },
    { op: "UpsertGoalStatusRules", label: "Set Status Rules", sev: "info" },
    { op: "DeleteGoalStatusRules", label: "Deleted Status Rules", sev: "warning" },
    { op: "CreateGoalValueCategories", label: "Created Value Categories", sev: "info" },
    { op: "DeleteGoalValueCategories", label: "Deleted Value Categories", sev: "warning" },
  ],
  subscriptions: [
    { op: "CreateEmailSubscription", label: "Created Subscription", sev: "info" },
    { op: "UpdateEmailSubscription", label: "Updated Subscription", sev: "info" },
    { op: "DeleteEmailSubscription", label: "Deleted Subscription", sev: "warning" },
    { op: "RunEmailSubscription", label: "Ran Subscription", sev: "info" },
    { op: "TakeOverEmailSubscription", label: "Took Over Subscription", sev: "warning" },
    { op: "PostComment", label: "Posted Comment", sev: "info" },
    { op: "DeleteComment", label: "Deleted Comment", sev: "warning" },
    { op: "InsertNote", label: "Inserted Note", sev: "info" },
    { op: "PatchNote", label: "Patched Note", sev: "info" },
    { op: "DeleteNote", label: "Deleted Note", sev: "warning" },
    { op: "UpdateNotificationSettings", label: "Updated Notifications", sev: "info" },
    { op: "InstallTeamsAnalyticsReport", label: "Installed Teams Report", sev: "info" },
  ],
  embed: [
    { op: "GenerateEmbedToken", label: "Generated Embed Token", sev: "info" },
    { op: "GenerateMultiResourceEmbedToken", label: "Generated Multi-Resource Token", sev: "info" },
    { op: "PublishToWebReport", label: "Published to Web", sev: "critical" },
    { op: "DeleteEmbedCode", label: "Deleted Embed Code", sev: "warning" },
    { op: "UpdateEmbedCodeOwner", label: "Updated Embed Owner", sev: "warning" },
    { op: "ExploreDataExternally", label: "Explored Data Externally", sev: "info" },
    { op: "ConnectFromExternalApplication", label: "Connected from External App", sev: "info" },
    { op: "CreateDatasetByQuickShare", label: "Created DS by Quick Share", sev: "info" },
    { op: "AddExternalResource", label: "Added External Resource", sev: "info" },
    { op: "AddLinkToExternalResource", label: "Linked External Resource", sev: "info" },
    { op: "DeleteLinkToExternalResource", label: "Deleted External Link", sev: "warning" },
    { op: "CreateExternalDataShare", label: "Created External Data Share", sev: "warning" },
    { op: "AcceptExternalDataShare", label: "Accepted External Share", sev: "warning" },
    { op: "RevokeExternalDataShare", label: "Revoked External Share", sev: "warning" },
    { op: "UpdateDataSharing", label: "Updated Data Sharing", sev: "warning" },
    { op: "AcquireStorageSASFromExternalApplication", label: "Got Storage SAS", sev: "warning" },
    { op: "AcquireStorageAccountKey", label: "Got Storage Account Key", sev: "critical" },
    { op: "CreateServicePrincipalProfile", label: "Created SP Profile", sev: "warning" },
    { op: "UpdateServicePrincipalProfile", label: "Updated SP Profile", sev: "warning" },
    { op: "DeleteServicePrincipalProfile", label: "Deleted SP Profile", sev: "critical" },
    { op: "MapUpn", label: "Mapped UPN", sev: "info" },
    { op: "ViewMetadata", label: "Viewed Metadata", sev: "info" },
  ],
  domains: [
    { op: "InsertDataDomainAsAdmin", label: "Created Domain", sev: "warning" },
    { op: "UpdateDataDomainAsAdmin", label: "Updated Domain", sev: "warning" },
    { op: "DeleteDataDomainAsAdmin", label: "Deleted Domain", sev: "critical" },
    { op: "UpdateDefaultDataDomainAsAdmin", label: "Updated Default Domain", sev: "warning" },
    { op: "UpdateDataDomainAccessAsAdmin", label: "Updated Domain Access", sev: "warning" },
    { op: "UpdateDataDomainBrandingAsAdmin", label: "Updated Domain Branding", sev: "info" },
    { op: "UpdateDataDomainContributorsScopeAsAdmin", label: "Updated Contributors Scope", sev: "warning" },
    { op: "UpdateDataDomainFoldersRelationsAsAdmin", label: "Updated Folder Relations", sev: "warning" },
    { op: "UpdateDataDomainFoldersRelationsAsContributor", label: "Updated Folder (Contrib)", sev: "info" },
    { op: "DeleteDataDomainFolderRelationsAsFolderOwner", label: "Deleted Folder Relation", sev: "warning" },
    { op: "DeleteAllDataDomainFoldersRelationsAsAdmin", label: "Deleted All Folder Relations", sev: "critical" },
    { op: "CreateManagedVNet", label: "Created Managed VNet", sev: "warning" },
    { op: "DeleteManagedVNet", label: "Deleted Managed VNet", sev: "critical" },
    { op: "GetVirtualNetwork", label: "Got Virtual Network", sev: "info" },
    { op: "UpdateVirtualNetwork", label: "Updated Virtual Network", sev: "warning" },
    { op: "CreateManagedPrivateEndpoint", label: "Created Private Endpoint", sev: "warning" },
    { op: "DeleteManagedPrivateEndpoint", label: "Deleted Private Endpoint", sev: "critical" },
    { op: "GetAllConnections", label: "Got All Connections", sev: "info" },
    { op: "GetConnection", label: "Got Connection by ID", sev: "info" },
    { op: "InsertSnapshot", label: "Inserted Snapshot", sev: "info" },
    { op: "UpdateSnapshot", label: "Updated Snapshot", sev: "info" },
    { op: "DeleteSnapshot", label: "Deleted Snapshot", sev: "warning" },
    { op: "GetSnapshots", label: "Got Snapshots", sev: "info" },
    { op: "GetUnusedArtifacts", label: "Got Unused Artifacts", sev: "info" },
    { op: "ImportPackageForSolution", label: "Imported Solution Package", sev: "info" },
    { op: "ExportPackageForSolution", label: "Exported Solution Package", sev: "info" },
    { op: "DetectCustomizationsForSolution", label: "Detected Customizations", sev: "info" },
    { op: "CreateSemanticMetric", label: "Created Semantic Metric", sev: "info" },
    { op: "GetSemanticMetric", label: "Got Semantic Metric", sev: "info" },
    { op: "UpdateSemanticMetric", label: "Updated Semantic Metric", sev: "info" },
    { op: "DeleteSemanticMetric", label: "Deleted Semantic Metric", sev: "warning" },
    { op: "CreateMetricSetMetric", label: "Created MetricSet Metric", sev: "info" },
    { op: "GetMetricSetMetric", label: "Got MetricSet Metric", sev: "info" },
    { op: "UpdateMetricSetMetric", label: "Updated MetricSet Metric", sev: "info" },
    { op: "DeleteMetricSetMetric", label: "Deleted MetricSet Metric", sev: "warning" },
    { op: "GetAllMetricSets", label: "Got All MetricSets", sev: "info" },
  ],
};

const TENANTS = [
  { id: "t-a", name: "Azure Account 1", domain: "contosocorp.onmicrosoft.com" },
  { id: "t-b", name: "Azure Account 2", domain: "fabrikamltd.onmicrosoft.com" },
];

const USERS = [
  { id: "u1", name: "Ahmed Khan", email: "ahmed@contoso.com", tenant: "t-a", license: "Pro", role: "Admin" },
  { id: "u2", name: "Sara Ali", email: "sara@contoso.com", tenant: "t-a", license: "PPU", role: "Contributor" },
  { id: "u3", name: "Bilal Raza", email: "bilal@contoso.com", tenant: "t-a", license: "Pro", role: "Member" },
  { id: "u4", name: "Fatima Noor", email: "fatima@contoso.com", tenant: "t-a", license: "Pro", role: "Viewer" },
  { id: "u5", name: "Omar Sheikh", email: "omar@fabrikam.com", tenant: "t-b", license: "Pro", role: "Admin" },
  { id: "u6", name: "Ayesha Malik", email: "ayesha@fabrikam.com", tenant: "t-b", license: "PPU", role: "Contributor" },
  { id: "u7", name: "Hassan Javed", email: "hassan@fabrikam.com", tenant: "t-b", license: "Pro", role: "Member" },
  { id: "u8", name: "Zara Iqbal", email: "zara@fabrikam.com", tenant: "t-b", license: "Pro", role: "Viewer" },
];

const WORKSPACES = ["Sales Analytics","Finance Reports","HR Dashboard","Marketing","Executive KPIs","Data Engineering","Customer 360","Operations Hub"];
const ITEMS = ["Q4 Revenue Report","Monthly KPIs","Employee Model","Churn Analysis","Daily ETL Pipeline","Sales Forecast","Inventory Tracker","Campaign ROI"];

const SEV_C = { info: "#3b82f6", warning: "#f59e0b", critical: "#ef4444" };

function gen() {
  const acts = [];
  const now = new Date(2026, 1, 3, 16, 0);
  const cats = Object.keys(OPERATIONS);
  for (let i = 0; i < 500; i++) {
    const c = cats[Math.floor(Math.random() * cats.length)];
    const ops = OPERATIONS[c];
    const o = ops[Math.floor(Math.random() * ops.length)];
    const u = USERS[Math.floor(Math.random() * 8)];
    const h = Math.floor(Math.random() * 720);
    const ts = new Date(now.getTime() - h * 36e5);
    acts.push({ id: `a${i}`, ts: ts.toISOString(), date: ts.toISOString().slice(0, 10), time: ts.toTimeString().slice(0, 5), uid: u.id, user: u.name, email: u.email, tid: u.tenant, tn: TENANTS.find(t => t.id === u.tenant).name, lic: u.license, cat: c, op: o.op, label: o.label, sev: o.sev, ws: WORKSPACES[Math.floor(Math.random() * 8)], item: ITEMS[Math.floor(Math.random() * 8)], ok: Math.random() > 0.06, ip: `192.168.${~~(Math.random()*5)}.${~~(Math.random()*255)}` });
  }
  return acts.sort((a, b) => b.ts.localeCompare(a.ts));
}
const DATA = gen();

const totalOps = Object.values(OPERATIONS).reduce((s, a) => s + a.length, 0);

export default function App() {
  const [tenant, setT] = useState("all");
  const [cat, setCat] = useState("all");
  const [user, setU] = useState("all");
  const [sev, setS] = useState("all");
  const [q, setQ] = useState("");
  const [view, setView] = useState("overview");
  const [exp, setExp] = useState(null);
  const [sort, setSort] = useState({ f: "ts", d: "desc" });

  const f = useMemo(() => DATA.filter(a => {
    if (tenant !== "all" && a.tid !== tenant) return false;
    if (cat !== "all" && a.cat !== cat) return false;
    if (user !== "all" && a.uid !== user) return false;
    if (sev !== "all" && a.sev !== sev) return false;
    if (q && !`${a.label} ${a.user} ${a.item} ${a.ws} ${a.op}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [tenant, cat, user, sev, q]);

  const sorted = useMemo(() => [...f].sort((a, b) => { const av=a[sort.f]||""; const bv=b[sort.f]||""; return sort.d==="asc"?(av>bv?1:-1):(av<bv?1:-1); }), [f, sort]);

  const stats = useMemo(() => {
    const byCat = {};
    Object.keys(CATEGORIES).forEach(c => { byCat[c] = f.filter(a => a.cat === c).length; });
    const byDay = {};
    f.forEach(a => { if (!byDay[a.date]) byDay[a.date] = { date: a.date, t: 0, c: 0, w: 0, i: 0 }; byDay[a.date].t++; byDay[a.date][a.sev[0]]++; });
    const tl = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
    return { total: f.length, crit: f.filter(a => a.sev === "critical").length, warn: f.filter(a => a.sev === "warning").length, fail: f.filter(a => !a.ok).length, users: new Set(f.map(a => a.uid)).size, byCat, tl };
  }, [f]);

  const S = { bg: "#0a0e1a", card: "#111827", bdr: "rgba(255,255,255,0.05)", tx: "#e2e8f0", tm: "#64748b", td: "#475569" };

  const Sel = ({ v, fn, opts, w = 160 }) => <select value={v} onChange={e => fn(e.target.value)} style={{ background: "#1e293b", color: "#e2e8f0", border: `1px solid ${S.bdr}`, borderRadius: 6, padding: "6px 8px", fontSize: 11, width: w, cursor: "pointer", outline: "none" }}>{opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select>;

  const togSort = (field) => setSort(p => p.f === field ? { f: field, d: p.d === "asc" ? "desc" : "asc" } : { f: field, d: "desc" });

  const catArr = Object.entries(stats.byCat).map(([k, v]) => ({ name: CATEGORIES[k].label, value: v, color: CATEGORIES[k].color })).filter(c => c.value > 0).sort((a, b) => b.value - a.value);

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', -apple-system, sans-serif", background: S.bg, minHeight: "100vh", color: S.tx }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <div style={{ background: "linear-gradient(90deg,#111827,#1a1f3a)", borderBottom: `1px solid ${S.bdr}`, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff" }}>⚡</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.3px" }}>Fabric Activity Monitor — Complete A-Z</div>
            <div style={{ fontSize: 10, color: S.tm }}>{Object.keys(CATEGORIES).length} Categories · {totalOps} Operations · 2 Tenants · 8 Licenses</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
          <Sel v={tenant} fn={setT} opts={[{ v: "all", l: "All Tenants" }, ...TENANTS.map(t => ({ v: t.id, l: t.name }))]} />
          <Sel v={user} fn={setU} opts={[{ v: "all", l: "All Users (8)" }, ...USERS.map(u => ({ v: u.id, l: `${u.name} (${u.license})` }))]} w={180} />
          <Sel v={sev} fn={setS} opts={[{ v: "all", l: "All Severity" }, { v: "critical", l: "🔴 Critical" }, { v: "warning", l: "🟡 Warning" }, { v: "info", l: "🔵 Info" }]} w={120} />
          <input placeholder="Search operations..." value={q} onChange={e => setQ(e.target.value)} style={{ background: "#1e293b", color: "#e2e8f0", border: `1px solid ${S.bdr}`, borderRadius: 6, padding: "6px 8px", fontSize: 11, width: 160, outline: "none" }} />
        </div>
      </div>

      {/* CATEGORY TABS */}
      <div style={{ display: "flex", gap: 1, padding: "8px 20px 0", overflowX: "auto", flexWrap: "nowrap" }}>
        <button onClick={() => { setCat("all"); setView("overview"); }} style={{ padding: "6px 12px", borderRadius: "6px 6px 0 0", background: view === "overview" ? "rgba(59,130,246,0.1)" : "transparent", border: view === "overview" ? "1px solid rgba(59,130,246,0.2)" : "1px solid transparent", borderBottom: "none", color: view === "overview" ? "#60a5fa" : S.tm, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>📈 Overview</button>
        {Object.entries(CATEGORIES).map(([k, c]) => {
          const active = cat === k && view === "cat";
          const cnt = stats.byCat[k] || 0;
          return <button key={k} onClick={() => { setCat(k); setView("cat"); }} style={{ padding: "6px 10px", borderRadius: "6px 6px 0 0", background: active ? c.color + "12" : "transparent", border: active ? `1px solid ${c.color}25` : "1px solid transparent", borderBottom: "none", color: active ? c.color : S.tm, fontSize: 11, fontWeight: active ? 600 : 400, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
            <span>{c.icon}</span><span>{c.label}</span>
            <span style={{ fontSize: 9, padding: "0 5px", borderRadius: 8, background: active ? c.color + "18" : "rgba(255,255,255,0.04)", color: active ? c.color : S.td }}>{cnt}</span>
          </button>;
        })}
        <button onClick={() => setView("catalog")} style={{ padding: "6px 12px", borderRadius: "6px 6px 0 0", background: view === "catalog" ? "rgba(234,179,8,0.1)" : "transparent", border: view === "catalog" ? "1px solid rgba(234,179,8,0.2)" : "1px solid transparent", borderBottom: "none", color: view === "catalog" ? "#facc15" : S.tm, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>📖 Full Catalog ({totalOps})</button>
      </div>

      <div style={{ padding: "0 20px 30px" }}>
        <div style={{ background: S.card, border: `1px solid ${S.bdr}`, borderRadius: "0 6px 6px 6px", padding: "16px", minHeight: 450 }}>

          {/* ═══ OVERVIEW ═══ */}
          {view === "overview" && <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginBottom: 14 }}>
              {[
                { l: "Total Events", v: stats.total, c: "#3b82f6" },
                { l: "Critical", v: stats.crit, c: "#ef4444" },
                { l: "Warnings", v: stats.warn, c: "#f59e0b" },
                { l: "Failures", v: stats.fail, c: "#f97316" },
                { l: "Active Users", v: stats.users, c: "#22c55e" },
                { l: "Categories", v: Object.keys(CATEGORIES).length, c: "#8b5cf6" },
                { l: "Operations", v: totalOps, c: "#06b6d4" },
              ].map((k, i) => <div key={i} style={{ padding: "12px 14px", background: `${k.c}06`, border: `1px solid ${k.c}12`, borderRadius: 6 }}>
                <div style={{ fontSize: 10, color: S.tm }}>{k.l}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: k.c, fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>{k.v}</div>
              </div>)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 14 }}>
              <div style={{ background: "rgba(255,255,255,0.015)", borderRadius: 6, padding: 14, border: `1px solid ${S.bdr}` }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 10 }}>Activity Timeline (14 Days)</div>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={stats.tl}>
                    <defs>
                      <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                      <linearGradient id="gw" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3}/><stop offset="100%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
                      <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="100%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: S.td }} tickFormatter={v => v.slice(5)} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: S.td }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 6, fontSize: 10 }} />
                    <Area type="monotone" dataKey="i" name="Info" stackId="1" stroke="#3b82f6" fill="url(#gi)" />
                    <Area type="monotone" dataKey="w" name="Warning" stackId="1" stroke="#f59e0b" fill="url(#gw)" />
                    <Area type="monotone" dataKey="c" name="Critical" stackId="1" stroke="#ef4444" fill="url(#gc)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div style={{ background: "rgba(255,255,255,0.015)", borderRadius: 6, padding: 14, border: `1px solid ${S.bdr}` }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 6 }}>Top Categories</div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={catArr.slice(0, 8)} layout="vertical" barSize={14}>
                    <XAxis type="number" tick={{ fontSize: 9, fill: S.td }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: S.tm }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 6, fontSize: 10 }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>{catArr.slice(0, 8).map((e, i) => <Cell key={i} fill={e.color} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Category Grid */}
            <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 8 }}>All {Object.keys(CATEGORIES).length} Categories</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
              {Object.entries(CATEGORIES).map(([k, c]) => {
                const cnt = stats.byCat[k] || 0;
                const opCnt = OPERATIONS[k].length;
                return <div key={k} onClick={() => { setCat(k); setView("cat"); }} style={{ padding: "12px 14px", background: `${c.color}06`, border: `1px solid ${c.color}10`, borderRadius: 6, cursor: "pointer", transition: "border-color 0.2s" }} onMouseEnter={e => e.currentTarget.style.borderColor = c.color + "40"} onMouseLeave={e => e.currentTarget.style.borderColor = c.color + "10"}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13 }}>{c.icon} <span style={{ fontWeight: 600, color: c.color }}>{c.label}</span></span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: c.color, fontFamily: "'IBM Plex Mono', monospace" }}>{cnt}</span>
                  </div>
                  <div style={{ fontSize: 10, color: S.td, marginTop: 4 }}>{opCnt} operations tracked · {c.desc}</div>
                </div>;
              })}
            </div>
          </>}

          {/* ═══ CATEGORY VIEW ═══ */}
          {view === "cat" && <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 20 }}>{CATEGORIES[cat]?.icon}</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: CATEGORIES[cat]?.color }}>{CATEGORIES[cat]?.label}</span>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, background: CATEGORIES[cat]?.color + "12", color: CATEGORIES[cat]?.color }}>{f.length} events</span>
              <span style={{ fontSize: 10, color: S.td, marginLeft: 4 }}>{OPERATIONS[cat]?.length} operations in this category</span>
            </div>
            <div style={{ fontSize: 10, color: S.td, marginBottom: 10 }}>Operations: {OPERATIONS[cat]?.map(o => o.label).join(" · ")}</div>
            {renderTbl(sorted.slice(0, 60), exp, setExp, sort, togSort, S)}
            {sorted.length > 60 && <div style={{ fontSize: 10, color: S.td, textAlign: "center", marginTop: 8 }}>Showing 60 of {sorted.length} records</div>}
          </>}

          {/* ═══ FULL CATALOG ═══ */}
          {view === "catalog" && <>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>📖 Complete Operation Catalog</div>
            <div style={{ fontSize: 11, color: S.tm, marginBottom: 14 }}>{totalOps} operations across {Object.keys(CATEGORIES).length} categories — every operation Microsoft Fabric tracks in audit logs</div>
            {Object.entries(CATEGORIES).map(([k, c]) => (
              <div key={k} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, padding: "8px 12px", background: c.color + "08", border: `1px solid ${c.color}15`, borderRadius: 6 }}>
                  <span style={{ fontSize: 16 }}>{c.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: c.color }}>{c.label}</span>
                  <span style={{ fontSize: 10, color: S.tm }}>{OPERATIONS[k].length} operations</span>
                  <span style={{ fontSize: 10, color: S.td, marginLeft: "auto" }}>{c.desc}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 4, paddingLeft: 8 }}>
                  {OPERATIONS[k].map((o, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, padding: "4px 8px", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)", borderRadius: 4 }}>
                      <span style={{ color: SEV_C[o.sev], fontSize: 7 }}>●</span>
                      <span style={{ color: S.tx, fontWeight: 500 }}>{o.label}</span>
                      <span style={{ color: S.td, fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", marginLeft: "auto" }}>{o.op}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>}
        </div>
      </div>
    </div>
  );
}

function renderTbl(data, exp, setExp, sort, tog, S) {
  const TH = ({ f, children, w }) => <th onClick={() => tog(f)} style={{ padding: "8px 8px", textAlign: "left", fontSize: 9, fontWeight: 600, color: S.tm, textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer", userSelect: "none", borderBottom: `1px solid ${S.bdr}`, width: w, whiteSpace: "nowrap", background: "#0f1629", position: "sticky", top: 0, zIndex: 1 }}>{children}{sort.f === f ? <span style={{ color: "#60a5fa", marginLeft: 2 }}>{sort.d === "asc" ? "↑" : "↓"}</span> : <span style={{ color: "#334155", marginLeft: 2 }}>↕</span>}</th>;

  return <div style={{ overflowX: "auto", borderRadius: 6, border: `1px solid ${S.bdr}` }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
      <thead><tr>
        <TH f="sev" w={24}></TH>
        <TH f="ts" w={100}>Time</TH>
        <TH f="user" w={100}>User</TH>
        <TH f="tn" w={80}>Tenant</TH>
        <TH f="cat" w={70}>Category</TH>
        <TH f="label" w={150}>Operation</TH>
        <TH f="ws" w={110}>Workspace</TH>
        <TH f="item" w={120}>Item</TH>
        <TH f="ok" w={45}>Status</TH>
      </tr></thead>
      <tbody>{data.map((a, i) => {
        const c = CATEGORIES[a.cat];
        const isE = exp === a.id;
        return [
          <tr key={a.id} onClick={() => setExp(isE ? null : a.id)} style={{ background: isE ? "rgba(59,130,246,0.04)" : i % 2 ? "rgba(255,255,255,0.008)" : "transparent", cursor: "pointer", borderLeft: `3px solid ${SEV_C[a.sev]}` }} onMouseEnter={e => { if(!isE) e.currentTarget.style.background="rgba(255,255,255,0.025)"; }} onMouseLeave={e => { if(!isE) e.currentTarget.style.background=i%2?"rgba(255,255,255,0.008)":"transparent"; }}>
            <td style={{ padding: "6px 6px", textAlign: "center" }}><span style={{ color: SEV_C[a.sev], fontSize: 7 }}>●</span></td>
            <td style={{ padding: "6px 8px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: S.tm }}>{a.date}<br/><span style={{ color: S.td }}>{a.time}</span></td>
            <td style={{ padding: "6px 8px" }}><div style={{ fontWeight: 600, fontSize: 11 }}>{a.user}</div><div style={{ fontSize: 9, color: S.td }}>{a.lic}</div></td>
            <td style={{ padding: "6px 8px" }}><span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 8, background: a.tid==="t-a" ? "rgba(139,92,246,0.1)" : "rgba(6,182,212,0.1)", color: a.tid==="t-a" ? "#a78bfa" : "#22d3ee" }}>{a.tid==="t-a"?"Acct 1":"Acct 2"}</span></td>
            <td style={{ padding: "6px 8px", fontSize: 10, color: c.color }}>{c.icon}</td>
            <td style={{ padding: "6px 8px", fontWeight: 500, color: SEV_C[a.sev] }}>{a.label}</td>
            <td style={{ padding: "6px 8px", color: S.tm, fontSize: 10 }}>{a.ws}</td>
            <td style={{ padding: "6px 8px", color: S.tm, fontSize: 10 }}>{a.item}</td>
            <td style={{ padding: "6px 8px" }}><span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 8, background: a.ok?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)", color: a.ok?"#4ade80":"#f87171", fontWeight: 600 }}>{a.ok?"OK":"FAIL"}</span></td>
          </tr>,
          isE && <tr key={a.id+"-d"}><td colSpan={9} style={{ padding: "0 8px 8px 32px", background: "rgba(59,130,246,0.03)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 6, padding: "10px 12px", background: "rgba(0,0,0,0.3)", borderRadius: 6, fontSize: 10 }}>
              {[["Operation ID", a.op],["Activity ID", a.id],["Email", a.email],["License", a.lic],["Tenant", a.tn],["Client IP", a.ip],["Workspace", a.ws],["Item", a.item],["Category", CATEGORIES[a.cat].label],["Severity", a.sev.toUpperCase()],["Success", a.ok?"Yes":"No"],["Timestamp", a.ts]].map(([l,v],j) => <div key={j}><div style={{ fontSize: 8, color: S.td, textTransform: "uppercase", marginBottom: 1 }}>{l}</div><div style={{ color: "#94a3b8", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, wordBreak: "break-all" }}>{v}</div></div>)}
            </div>
          </td></tr>
        ];
      })}</tbody>
    </table>
  </div>;
}
