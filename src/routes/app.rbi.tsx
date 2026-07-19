import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { m } from "framer-motion";
import { toast } from "sonner";
import { AlertTriangle, Calculator, Gauge, ShieldAlert, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useEquipmentStore } from "@/stores/equipment";
import { useInspectionsStore } from "@/stores/inspections";
import { useRbiStore } from "@/stores/rbi";
import {
  calculate, riskLevelFor, suggestInputs,
  type RbiInputs, type RbiLikelihood, type RbiConsequence, type RbiRiskLevel,
} from "@/lib/bridge/rbi";
import { useT } from "@/hooks/use-t";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/rbi")({
  head: () => ({
    meta: [
      { title: "Risk-Based Inspection — CertiCore" },
      { name: "description", content: "API 580/581 inspired risk assessment engine." },
    ],
  }),
  component: RbiPage,
});

const RISK_STYLES: Record<RbiRiskLevel, { chip: string; cell: string; label: string }> = {
  low:       { chip: "border-emerald-500/40 bg-emerald-500/10 text-emerald-500", cell: "bg-emerald-500/25", label: "rbi.level.low" },
  medium:    { chip: "border-yellow-500/40 bg-yellow-500/10 text-yellow-500",   cell: "bg-yellow-500/25",  label: "rbi.level.medium" },
  high:      { chip: "border-orange-500/40 bg-orange-500/10 text-orange-500",   cell: "bg-orange-500/30",  label: "rbi.level.high" },
  very_high: { chip: "border-red-500/40 bg-red-500/10 text-red-500",           cell: "bg-red-500/40",     label: "rbi.level.veryHigh" },
};

function RbiPage() {
  const t = useT();
  const equipment = useEquipmentStore((s) => s.items);
  const eqStatus = useEquipmentStore((s) => s.status);
  const hydrateEq = useEquipmentStore((s) => s.hydrate);
  const certs = useInspectionsStore((s) => s.certificates);
  const insStatus = useInspectionsStore((s) => s.status);
  const hydrateIns = useInspectionsStore((s) => s.hydrate);
  const assessments = useRbiStore((s) => s.assessments);
  const rbiStatus = useRbiStore((s) => s.status);
  const hydrateRbi = useRbiStore((s) => s.hydrate);
  const assess = useRbiStore((s) => s.assess);

  useEffect(() => { if (eqStatus === "idle")  void hydrateEq(); }, [eqStatus, hydrateEq]);
  useEffect(() => { if (insStatus === "idle") void hydrateIns(); }, [insStatus, hydrateIns]);
  useEffect(() => { if (rbiStatus === "idle") void hydrateRbi(); }, [rbiStatus, hydrateRbi]);

  const [selectedEq, setSelectedEq] = useState<string>("");
  const [inputs, setInputs] = useState<RbiInputs | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!selectedEq && equipment.length > 0) setSelectedEq(equipment[0].id);
  }, [equipment, selectedEq]);

  useEffect(() => {
    const eq = equipment.find((e) => e.id === selectedEq);
    if (eq) setInputs(suggestInputs(eq, certs));
  }, [selectedEq, equipment, certs]);

  const preview = useMemo(() => (inputs ? calculate(inputs) : null), [inputs]);

  // Fleet risk ranking (latest assessment per equipment)
  const fleetRanked = useMemo(() => {
    const latestByEq = new Map<string, typeof assessments[number]>();
    for (const a of assessments) {
      if (!latestByEq.has(a.equipmentId)) latestByEq.set(a.equipmentId, a);
    }
    return Array.from(latestByEq.values())
      .map((a) => ({ a, eq: equipment.find((e) => e.id === a.equipmentId) }))
      .filter((r) => r.eq)
      .sort((x, y) => y.a.riskScore - x.a.riskScore);
  }, [assessments, equipment]);

  async function onAssess() {
    if (!inputs) return;
    const r = await assess(inputs, notes || undefined);
    if (r) toast.success(t("rbi.toast.saved"));
  }

  function update<K extends keyof RbiInputs>(k: K, v: RbiInputs[K]) {
    setInputs((prev) => (prev ? { ...prev, [k]: v } : prev));
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Hero */}
      <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl border" style={{ borderColor: "color-mix(in oklch, var(--brand-accent) 30%, transparent)", background: "color-mix(in oklch, var(--brand-accent) 10%, transparent)" }}>
            <ShieldAlert className="h-5 w-5" style={{ color: "var(--brand-accent)" }} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight" style={{ color: "var(--brand-accent)" }}>{t("rbi.title")}</h1>
            <p className="mt-0.5 text-sm text-white/60">{t("rbi.subtitle")}</p>
          </div>
        </div>
      </m.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Inputs panel */}
        <div className="space-y-4 lg:col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-white/60" />
            <h2 className="font-semibold text-white/90">{t("rbi.inputs.title")}</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label className="text-xs uppercase tracking-widest text-white/50">{t("rbi.equipment")}</Label>
              <Select value={selectedEq} onValueChange={setSelectedEq}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {equipment.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.tag} · {e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {inputs && (
              <>
                <NumField label={t("rbi.f.age")} value={inputs.ageYears} onChange={(v) => update("ageYears", v)} min={0} max={80} />
                <NumField label={t("rbi.f.corr")} value={inputs.corrosionRateMmYr} onChange={(v) => update("corrosionRateMmYr", v)} step={0.05} min={0} max={5} />
                <NumField label={t("rbi.f.findings")} value={inputs.previousFindingsCount} onChange={(v) => update("previousFindingsCount", v)} min={0} max={20} />
                <ScaleField label={t("rbi.f.severity")} value={inputs.operatingSeverity} onChange={(v) => update("operatingSeverity", v as RbiInputs["operatingSeverity"])} />
                <ScaleField label={t("rbi.f.fluid")} value={inputs.fluidHazard} onChange={(v) => update("fluidHazard", v as RbiInputs["fluidHazard"])} />
                <ScaleField label={t("rbi.f.population")} value={inputs.populationExposure} onChange={(v) => update("populationExposure", v as RbiInputs["populationExposure"])} />
                <ScaleField label={t("rbi.f.production")} value={inputs.productionCriticality} onChange={(v) => update("productionCriticality", v as RbiInputs["productionCriticality"])} />
                <ScaleField label={t("rbi.f.environment")} value={inputs.environmentalImpact} onChange={(v) => update("environmentalImpact", v as RbiInputs["environmentalImpact"])} />
              </>
            )}
          </div>

          <div>
            <Label className="text-xs uppercase tracking-widest text-white/50">{t("common.notes")}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1" />
          </div>

          <Button onClick={onAssess} disabled={!inputs}
            style={{ backgroundColor: "var(--brand-accent)", color: "oklch(0.13 0.04 260)" }}>
            {t("rbi.saveAssessment")}
          </Button>
        </div>

        {/* Live preview */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-3 flex items-center gap-2">
            <Gauge className="h-4 w-4 text-white/60" />
            <h2 className="font-semibold text-white/90">{t("rbi.preview.title")}</h2>
          </div>
          {preview && (
            <div className="space-y-3">
              <MatrixMini pof={preview.pof} cof={preview.cof} />
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <span className="text-xs uppercase tracking-widest text-white/50">{t("rbi.pof")}</span>
                <span className="font-mono text-lg text-white/90">{preview.pof} / 5</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <span className="text-xs uppercase tracking-widest text-white/50">{t("rbi.cof")}</span>
                <span className="font-mono text-lg text-white/90">{preview.cof} / 5</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <span className="text-xs uppercase tracking-widest text-white/50">{t("rbi.score")}</span>
                <span className="font-mono text-2xl font-semibold" style={{ color: "var(--brand-accent)" }}>{preview.riskScore}</span>
              </div>
              <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold", RISK_STYLES[preview.riskLevel].chip)}>
                <AlertTriangle className="h-3 w-3" />
                {t(RISK_STYLES[preview.riskLevel].label)}
              </span>
              <p className="text-xs text-white/60">
                {t("rbi.recommended", { days: String(preview.recommendedIntervalDays) })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Fleet risk ranking */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-white/60" />
          <h2 className="font-semibold text-white/90">{t("rbi.fleet.title")}</h2>
        </div>
        {fleetRanked.length === 0 ? (
          <p className="text-sm text-white/50">{t("rbi.fleet.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-white/40">
                  <th className="py-2">{t("rbi.col.equipment")}</th>
                  <th className="py-2">{t("rbi.pof")}</th>
                  <th className="py-2">{t("rbi.cof")}</th>
                  <th className="py-2">{t("rbi.score")}</th>
                  <th className="py-2">{t("rbi.level")}</th>
                  <th className="py-2">{t("rbi.nextDue")}</th>
                </tr>
              </thead>
              <tbody>
                {fleetRanked.map(({ a, eq }) => (
                  <tr key={a.id} className="border-t border-white/5">
                    <td className="py-2.5 text-white/85">{eq?.tag} · {eq?.name}</td>
                    <td className="py-2.5 font-mono text-white/70">{a.pof}</td>
                    <td className="py-2.5 font-mono text-white/70">{a.cof}</td>
                    <td className="py-2.5 font-mono text-white/85">{a.riskScore}</td>
                    <td className="py-2.5">
                      <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold", RISK_STYLES[a.riskLevel].chip)}>
                        {t(RISK_STYLES[a.riskLevel].label)}
                      </span>
                    </td>
                    <td className="py-2.5 text-white/60">{a.recommendedIntervalDays} {t("rbi.days")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function NumField({ label, value, onChange, min, max, step = 1 }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number;
}) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-widest text-white/50">{label}</Label>
      <Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} min={min} max={max} step={step} className="mt-1" />
    </div>
  );
}

function ScaleField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-widest text-white/50">{label}</Label>
      <div className="mt-1 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "h-9 flex-1 rounded-md border text-sm font-mono transition-colors",
              value === n ? "text-[oklch(0.13_0.04_260)]" : "border-white/10 text-white/60 hover:bg-white/[0.05]",
            )}
            style={value === n ? { backgroundColor: "var(--brand-accent)", borderColor: "var(--brand-accent)" } : undefined}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function MatrixMini({ pof, cof }: { pof: RbiLikelihood; cof: RbiConsequence }) {
  const t = useT();
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <div className="grid grid-cols-6 gap-1 text-[10px]">
        <div />
        {[1, 2, 3, 4, 5].map((c) => <div key={c} className="text-center text-white/40">{c}</div>)}
        {[5, 4, 3, 2, 1].map((p) => (
          <>
            <div key={`l-${p}`} className="pr-1 text-right text-white/40">{p}</div>
            {[1, 2, 3, 4, 5].map((c) => {
              const lvl = riskLevelFor(p as RbiLikelihood, c as RbiConsequence);
              const isCell = p === pof && c === cof;
              return (
                <div
                  key={`${p}-${c}`}
                  className={cn(
                    "h-7 rounded transition-all",
                    RISK_STYLES[lvl].cell,
                    isCell && "ring-2 ring-white",
                  )}
                />
              );
            })}
          </>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] uppercase tracking-widest text-white/40">
        <span>← {t("rbi.consequence")}</span><span>{t("rbi.likelihood")} ↑</span>
      </div>
    </div>
  );
}
