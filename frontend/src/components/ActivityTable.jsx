import { CATEGORIES, SEV_COLORS } from "../data/categories";

const UTYPE_LABELS = { user: "User", service: "Service", system: "System", app: "App", unknown: "" };

function TH({ field, label, sort, onSort, className = "" }) {
  return (
    <th onClick={() => onSort(field)}
      className={`px-3 py-2.5 text-left text-[11px] font-semibold text-tx-3 uppercase tracking-wider cursor-pointer select-none border-b border-white/5 bg-[#0a1020] sticky top-0 z-10 whitespace-nowrap ${className}`}>
      {label}
      {sort.f === field
        ? <span className="text-blue-400 ml-1">{sort.d === "asc" ? "\u2191" : "\u2193"}</span>
        : <span className="text-tx-4 ml-1">{"\u2195"}</span>}
    </th>
  );
}

export default function ActivityTable({ data, expanded, setExpanded, sort, onSort, tenants = [], onDetail }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/5">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            <TH field="sev" label="" sort={sort} onSort={onSort} className="w-8" />
            <TH field="ts" label="Time" sort={sort} onSort={onSort} className="w-[120px]" />
            <TH field="user" label="User" sort={sort} onSort={onSort} className="w-[180px]" />
            <TH field="tn" label="Tenant" sort={sort} onSort={onSort} className="w-[110px]" />
            <TH field="cat" label="Category" sort={sort} onSort={onSort} className="w-[130px]" />
            <TH field="label" label="Operation" sort={sort} onSort={onSort} className="w-[200px]" />
            <TH field="ws" label="Workspace" sort={sort} onSort={onSort} className="w-[150px]" />
            <TH field="item" label="Item" sort={sort} onSort={onSort} className="w-[150px]" />
            <TH field="ok" label="Status" sort={sort} onSort={onSort} className="w-[60px]" />
            {onDetail && <th className="w-10 bg-[#0a1020] sticky top-0 z-10 border-b border-white/5" />}
          </tr>
        </thead>
        <tbody>
          {data.map((a, i) => {
            const c = CATEGORIES[a.cat];
            const isExp = expanded === a.id;
            const sevBorder = a.sev === "critical" ? "border-l-red-500" : a.sev === "warning" ? "border-l-amber-500" : "border-l-blue-500";
            const sevColor = SEV_COLORS[a.sev] || "#3b82f6";
            return (
              <TableRow key={a.id} a={a} i={i} c={c} isExp={isExp} setExpanded={setExpanded} sevBorder={sevBorder} sevColor={sevColor} tenants={tenants} onDetail={onDetail} />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TableRow({ a, i, c, isExp, setExpanded, sevBorder, sevColor, tenants, onDetail }) {
  const isFirstTenant = tenants.length > 0 && a.tid === tenants[0]?.id;
  const tenantColor = isFirstTenant ? "bg-violet-500/10 text-violet-400" : "bg-cyan-500/10 text-cyan-300";
  const tenantShort = a.tn ? (a.tn.length > 14 ? a.tn.slice(0, 14) + ".." : a.tn) : a.tid;
  const typeLabel = UTYPE_LABELS[a.utype] || "";
  const isApp = a.utype === "app" || a.utype === "service" || a.utype === "system";

  return (
    <>
      <tr onClick={() => setExpanded(isExp ? null : a.id)}
        className={`cursor-pointer border-l-[3px] ${sevBorder} ${isExp ? "bg-blue-500/[0.04]" : i % 2 ? "bg-white/[0.012]" : "bg-transparent"} hover:bg-white/[0.03] transition-colors`}>
        <td className="px-2 py-2 text-center">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: sevColor }} />
        </td>
        <td className="px-3 py-2 font-mono text-[12px] text-tx-2">
          {a.date}<br/><span className="text-tx-4">{a.time}</span>
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-semibold text-tx-1 truncate">{a.user}</span>
            {typeLabel && <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${isApp ? "bg-cyan-500/10 text-cyan-400" : "bg-blue-500/10 text-blue-400"}`}>{typeLabel}</span>}
          </div>
          <div className="text-[11px] text-tx-4 truncate font-mono">{a.email}</div>
        </td>
        <td className="px-3 py-2">
          <span className={`text-[11px] px-2 py-0.5 rounded-lg font-medium ${tenantColor}`}>{tenantShort}</span>
        </td>
        <td className="px-3 py-2">
          <span className="text-[12px] font-medium" style={{ color: c?.color }}>{c?.label || a.cat}</span>
        </td>
        <td className="px-3 py-2 font-medium text-[13px]" style={{ color: sevColor }}>{a.label}</td>
        <td className="px-3 py-2 text-tx-2 text-[12px] truncate max-w-[150px]">{a.ws || "-"}</td>
        <td className="px-3 py-2 text-tx-2 text-[12px] truncate max-w-[150px]">{a.item || "-"}</td>
        <td className="px-3 py-2">
          <div className="flex flex-col items-start gap-0.5">
            <span className={`text-[11px] px-2 py-0.5 rounded-lg font-semibold ${a.ok ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
              {a.resultStatus || (a.ok ? "OK" : "FAIL")}
            </span>
            {a.failureReason && <span className="text-[9px] text-red-400/70 truncate max-w-[80px]" title={a.failureReason}>{a.failureReason}</span>}
          </div>
        </td>
        {onDetail && (
          <td className="px-2 py-2 text-center">
            <button onClick={(e) => { e.stopPropagation(); onDetail(a); }}
              className="px-2 py-1 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 flex items-center justify-center text-[10px] font-semibold cursor-pointer transition-colors whitespace-nowrap"
              title="View activity details & AI explanation">
              Details
            </button>
          </td>
        )}
      </tr>
      {isExp && (
        <tr>
          <td colSpan={onDetail ? 10 : 9} className="px-3 pb-3 pl-10 bg-blue-500/[0.03]">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 p-4 bg-black/30 rounded-xl text-[12px]">
              {[
                ["Operation ID", a.op],
                ["Activity ID", a.id],
                ["Email / User ID", a.email],
                ["User Type", typeLabel || "Unknown"],
                ["Tenant", a.tn],
                ["Client IP", a.ip],
                ["Workspace", a.ws],
                ["Item", a.item],
                ["Item Type", a.artifactType],
                ["Category", c?.label],
                ["Severity", a.sev?.toUpperCase()],
                ["Result Status", a.resultStatus || (a.ok ? "Succeeded" : "Failed")],
                ["Failure Reason", a.failureReason],
                ["Distribution", a.distributionMethod],
                ["Capacity", a.capacity],
                ["Timestamp (KSA)", a.tsDisplay || a.ts],
                ["Request ID", a.requestId],
              ].filter(([, v]) => v).map(([l, v], j) => (
                <div key={j}>
                  <div className="text-[10px] text-tx-4 uppercase mb-1 font-medium">{l}</div>
                  <div className="text-tx-1 font-mono text-[12px] break-all">{v || "-"}</div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
