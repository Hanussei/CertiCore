import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { m } from "framer-motion";
import { BarChart3, Download, TrendingUp, Activity, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEquipmentStore } from "@/stores/equipment";
import { useInspectionsStore } from "@/stores/inspections";
import { useInspectorsStore } from "@/stores/inspectors";
import { useT } from "@/hooks/use-t";
import type { IssuedCertificate } from "@/types";

export const Route = createFileRoute("/app/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Analytics — CertiCore" },
      { name: "description", content: "Fleet-wide inspection KPIs and custom reports." },
    ],
  }),
  component: ReportsPage,
});

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(a).getTime() - new Date(b).getTime()) / 86_400_000);
}

function ReportsPage() {
  const t = useT();
  const equipment = useEquipmentStore((s) => s.items);
  const eqStatus = useEquipmentStore((s) => s.status);
  const hydrateEq = useEquipmentStore((s) => s.hydrate);
  const certs = useInspectionsStore((s) => s.certificates);
  const insStatus = useInspectionsStore((s) => s.status);
  const hydrateIns = useInspectionsStore((s) => s.hydrate);
  const inspectors = useInspectorsStore((s) => s.inspectors);
  const inspectorsStatus = useInspectorsStore((s) => s.status);
  const hydrateInspectors = useInspectorsStore((s) => s.hydrate);

  useEffect(() => { if (eqStatus === "idle") void hydrateEq(); }, [eqStatus, hydrateEq]);
  useEffect(() => { if (insStatus === "idle") void hydrateIns(); }, [insStatus, hydrateIns]);
  useEffect(() => { if (inspectorsStatus === "idle") void hydrateInspectors(); }, [inspectorsStatus, hydrateInspectors]);

  const [from, setFrom] = useState<string>(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 6); return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [resultFilter, setResultFilter] = useState<string>("all");
  const [inspectorFilter, setInspectorFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const fromT = new Date(from).getTime();
    const toT = new Date(to).getTime() + 86_400_000;
    return certs.filter((c) => {
      const t2 = new Date(c.issuedAt).getTime();
      if (t2 < fromT || t2 > toT) return false;
      if (resultFilter !== "all" && c.result !== resultFilter) return false;
      if (inspectorFilter !== "all" && c.inspectorId !== inspectorFilter) return false;
      return true;
    });
  }, [certs, from, to, resultFilter, inspectorFilter]);

  const kpis = useMemo(() => {
    const total = filtered.length;
    const pass = filtered.filter((c) => c.result === "pass").length;
    const fail = filtered.filter((c) => c.result === "fail").length;
    const cond = filtered.filter((c) => c.result === "conditional").length;
    const now = Date.now();
    const overdue = equipment.filter((e) => new Date(e.nextInspectionDue).getTime() < now).length;
    const compliance = equipment.length === 0 ? 0 : Math.round((1 - overdue / equipment.length) * 100);
    // Average interval between inspections per equipment
    const grouped = new Map<string, IssuedCertificate[]>();
    for (const c of filtered) {
      if (!grouped.has(c.equipmentId)) grouped.set(c.equipmentId, []);
      grouped.get(c.equipmentId)!.push(c);
    }
    let mtbf = 0; let mtbfN = 0;
    for (const arr of grouped.values()) {
      const sorted = arr.slice().sort((a, b) => new Date(a.issuedAt).getTime() - new Date(b.issuedAt).getTime());
      for (let i = 1; i < sorted.length; i++) {
        mtbf += daysBetween(sorted[i].issuedAt, sorted[i - 1].issuedAt);
        mtbfN++;
      }
    }
    const mtbfDays = mtbfN === 0 ? 0 : Math.round(mtbf / mtbfN);
    return { total, pass, fail, cond, overdue, compliance, mtbfDays };
  }, [filtered, equipment]);

  // Monthly trend
  const trend = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of filtered) {
      const d = new Date(c.issuedAt);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    const keys = Array.from(map.keys()).sort();
    const max = Math.max(1, ...map.values());
    return keys.map((k) => ({ key: k, n: map.get(k) ?? 0, pct: ((map.get(k) ?? 0) / max) * 100 }));
  }, [filtered]);

  function exportCsv() {
    const rows = [
      ["id", "equipment_tag", "equipment_name", "template", "inspector", "result", "issued_at", "valid_until"],
      ...filtered.map((c) => [
        c.id, c.equipmentTag, c.equipmentName, c.templateName, c.inspectorName,
        c.result, c.issuedAt, c.validUntil,
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `certicore-report-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl border" style={{ borderColor: "color-mix(in oklch, var(--brand-accent) 30%, transparent)", background: "color-mix(in oklch, var(--brand-accent) 10%, transparent)" }}>
            <BarChart3 className="h-5 w-5" style={{ color: "var(--brand-accent)" }} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight" style={{ color: "var(--brand-accent)" }}>{t("reports.title")}</h1>
            <p className="mt-0.5 text-sm text-white/60">{t("reports.subtitle")}</p>
          </div>
        </div>
        <Button onClick={exportCsv} variant="outline" className="border-white/15 bg-white/[0.02] text-white/85 hover:bg-white/[0.05]">
          <Download className="mr-2 h-4 w-4" />{t("reports.exportCsv")}
        </Button>
      </m.div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-4">
        <div>
          <Label className="text-xs uppercase tracking-widest text-white/50">{t("reports.from")}</Label>
          <DatePicker
            value={from}
            onChange={setFrom}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-widest text-white/50">{t("reports.to")}</Label>
          <DatePicker
            value={to}
            onChange={setTo}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-widest text-white/50">{t("reports.result")}</Label>
          <Select value={resultFilter} onValueChange={setResultFilter}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              <SelectItem value="pass">{t("common.pass")}</SelectItem>
              <SelectItem value="conditional">{t("common.conditional")}</SelectItem>
              <SelectItem value="fail">{t("common.fail")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-widest text-white/50">{t("reports.inspector")}</Label>
          <Select value={inspectorFilter} onValueChange={setInspectorFilter}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {inspectors.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label={t("reports.kpi.total")} value={String(kpis.total)} icon={<Activity className="h-4 w-4" />} />
        <Kpi label={t("reports.kpi.compliance")} value={`${kpis.compliance}%`} icon={<TrendingUp className="h-4 w-4" />} />
        <Kpi label={t("reports.kpi.overdue")} value={String(kpis.overdue)} icon={<Clock className="h-4 w-4" />} tone={kpis.overdue > 0 ? "warn" : "ok"} />
        <Kpi label={t("reports.kpi.mtbf")} value={`${kpis.mtbfDays} ${t("rbi.days")}`} icon={<BarChart3 className="h-4 w-4" />} />
      </div>

      {/* Pass/fail breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h3 className="mb-3 font-semibold text-white/90">{t("reports.breakdown")}</h3>
          <Bar label={t("common.pass")}        value={kpis.pass} total={kpis.total} color="emerald" />
          <Bar label={t("common.conditional")} value={kpis.cond} total={kpis.total} color="yellow" />
          <Bar label={t("common.fail")}        value={kpis.fail} total={kpis.total} color="red" />
        </div>

        {/* Trend */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 lg:col-span-2">
          <h3 className="mb-3 font-semibold text-white/90">{t("reports.trend")}</h3>
          {trend.length === 0 ? (
            <p className="text-sm text-white/50">{t("reports.trend.empty")}</p>
          ) : (
            <div className="flex h-40 items-end gap-2">
              {trend.map((p) => (
                <div key={p.key} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full rounded-t" style={{ height: `${p.pct}%`, backgroundColor: "var(--brand-accent)", opacity: 0.7 }} />
                  <div className="text-[9px] text-white/40">{p.key}</div>
                  <div className="text-[10px] font-mono text-white/70">{p.n}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, icon, tone = "ok" }: { label: string; value: string; icon: React.ReactNode; tone?: "ok" | "warn" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-white/50">
        {icon}<span>{label}</span>
      </div>
      <div className={`font-display text-2xl font-semibold ${tone === "warn" ? "text-orange-400" : "text-white/90"}`}>
        {value}
      </div>
    </div>
  );
}

function Bar({ label, value, total, color }: { label: string; value: number; total: number; color: "emerald" | "yellow" | "red" }) {
  const pct = total === 0 ? 0 : (value / total) * 100;
  const bg = color === "emerald" ? "bg-emerald-500" : color === "yellow" ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="mb-2">
      <div className="mb-1 flex justify-between text-xs text-white/60">
        <span>{label}</span><span className="font-mono">{value} · {pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/5">
        <div className={`h-full ${bg}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
