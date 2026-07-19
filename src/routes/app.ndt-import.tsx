import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { m } from "framer-motion";
import { toast } from "sonner";
import { Cable, CheckCircle2, FileUp, Loader2, Upload, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  parseFile, SUPPORTED_DEVICES,
  type NdtImportResult,
} from "@/lib/bridge/ndt-import";
import { useT } from "@/hooks/use-t";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/ndt-import")({
  head: () => ({
    meta: [
      { title: "NDT Device Import — CertiCore" },
      { name: "description", content: "Import CSV/JSON exports from NDT instruments." },
    ],
  }),
  component: NdtImportPage,
});

function NdtImportPage() {
  const t = useT();
  const [deviceId, setDeviceId] = useState<string>(SUPPORTED_DEVICES[0].id);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<NdtImportResult | null>(null);

  const device = SUPPORTED_DEVICES.find((d) => d.id === deviceId)!;

  async function onFile(f: File | null) {
    if (!f) return;
    setBusy(true);
    const r = await parseFile(deviceId, f);
    setBusy(false);
    if (!r.ok) {
      toast.error(r.error.message);
      return;
    }
    setResult(r.data);
    toast.success(t("ndt.toast.parsed", { n: String(r.data.readings.length) }));
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl border" style={{ borderColor: "color-mix(in oklch, var(--brand-accent) 30%, transparent)", background: "color-mix(in oklch, var(--brand-accent) 10%, transparent)" }}>
            <Cable className="h-5 w-5" style={{ color: "var(--brand-accent)" }} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight" style={{ color: "var(--brand-accent)" }}>{t("ndt.title")}</h1>
            <p className="mt-0.5 text-sm text-white/60">{t("ndt.subtitle")}</p>
          </div>
        </div>
      </m.div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label className="text-xs uppercase tracking-widest text-white/50">{t("ndt.device")}</Label>
            <Select value={deviceId} onValueChange={(v) => { setDeviceId(v); setResult(null); }}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SUPPORTED_DEVICES.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-white/50">{t("ndt.file")}</Label>
            <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-white/15 bg-white/[0.02] px-3 py-2 text-sm text-white/70 transition hover:bg-white/[0.05]">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              <span>{t("ndt.chooseFile")}</span>
              <input
                type="file"
                accept={device.extensions.map((e) => "." + e).join(",")}
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/20 p-3 font-mono text-[11px] text-white/60">
          {t("ndt.expected")}: <span className="text-white/80">{device.sample}</span>
        </div>
      </div>

      {result && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileUp className="h-4 w-4 text-white/60" />
              <h2 className="font-semibold text-white/90">
                {result.device} — {result.readings.length} {t("ndt.readings")}
              </h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-widest text-white/60">
              {result.method}
            </span>
          </div>

          {result.warnings.length > 0 && (
            <div className="mb-3 rounded-lg border border-orange-500/40 bg-orange-500/10 p-3 text-sm text-orange-300">
              {result.warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-white/40">
                  <th className="py-2">{t("ndt.col.location")}</th>
                  <th className="py-2">{t("ndt.col.measured")}</th>
                  <th className="py-2">{t("ndt.col.criteria")}</th>
                  <th className="py-2">{t("common.status")}</th>
                </tr>
              </thead>
              <tbody>
                {result.readings.map((r, i) => (
                  <tr key={i} className="border-t border-white/5">
                    <td className="py-2 text-white/85">{r.location}</td>
                    <td className="py-2 font-mono text-white/70">{r.measured}</td>
                    <td className="py-2 text-white/60">{r.criteria || "—"}</td>
                    <td className="py-2">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                        r.verdict === "pass" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
                        r.verdict === "fail" && "border-red-500/40 bg-red-500/10 text-red-400",
                        r.verdict === "na"   && "border-white/10 bg-white/5 text-white/50",
                      )}>
                        {r.verdict === "pass" && <CheckCircle2 className="h-3 w-3" />}
                        {r.verdict === "fail" && <XCircle className="h-3 w-3" />}
                        {t(`common.${r.verdict}`)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <Button
              onClick={() => {
                const csv = ["location,measured,unit,criteria,verdict,notes",
                  ...result.readings.map((r) =>
                    [r.location, r.measured, r.unit, r.criteria, r.verdict, r.notes ?? ""]
                      .map((v) => `"${(v ?? "").toString().replace(/"/g, '""')}"`).join(","),
                  )].join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = `${result.device.replace(/\s+/g, "-")}-readings.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              variant="outline"
              className="border-white/15 bg-white/[0.02] text-white/85 hover:bg-white/[0.05]"
            >
              {t("ndt.exportCsv")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
