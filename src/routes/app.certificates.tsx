import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, m } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Award,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileBadge,
  FlaskConical,
  Hash,
  Images,
  Loader2,
  Printer,
  Search,
  ShieldAlert,
  ShieldCheck,
  Wrench,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInspectionsStore } from "@/stores/inspections";
import { useEquipmentStore } from "@/stores/equipment";
import { useAuthStore } from "@/stores/auth";
import { useBrandingStore } from "@/stores/branding";
import { useStandardsStore } from "@/stores/standards";
import { useTestEquipmentStore } from "@/stores/test-equipment";
import { useMediaStore } from "@/stores/media";
import { useInspectorsStore } from "@/stores/inspectors";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/use-t";
import { getConfig } from "@/lib/bridge/publish-cert";

import { exportDossierPdf, slugify } from "@/lib/pdf/export-dossier";
import type {
  CertificateResult,
  IssuedCertificate,
  Equipment,
  Inspector,
  Standard,
  TestEquipment,
  MediaAsset,
} from "@/types";
import { EQUIPMENT_CATEGORY_LABEL, NDT_METHOD_LABEL } from "@/types";

export const Route = createFileRoute("/app/certificates")({
  head: () => ({
    meta: [
      { title: "Certificates — CertiCore" },
      { name: "description", content: "Issued inspection dossiers archive." },
    ],
  }),
  component: CertificatesPage,
});

const RESULT_STYLES: Record<CertificateResult, { chip: string; icon: React.ReactNode; label: string }> = {
  pass: {
    chip: "border-emerald-500/40 bg-emerald-500/10 text-emerald-500",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    label: "Pass",
  },
  conditional: {
    chip: "border-orange-500/40 bg-orange-500/10 text-orange-500",
    icon: <ShieldAlert className="h-3.5 w-3.5" />,
    label: "Conditional",
  },
  fail: {
    chip: "border-red-500/40 bg-red-500/10 text-red-500",
    icon: <XCircle className="h-3.5 w-3.5" />,
    label: "Fail",
  },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}
function daysBetween(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function CertificatesPage() {
  const t = useT();

  const certs = useInspectionsStore((s) => s.certificates);
  const status = useInspectionsStore((s) => s.status);
  const hydrate = useInspectionsStore((s) => s.hydrate);
  const equipment = useEquipmentStore((s) => s.items);
  const eqStatus = useEquipmentStore((s) => s.status);
  const hydrateEq = useEquipmentStore((s) => s.hydrate);
  const branding = useBrandingStore((s) => s.branding);
  const bStatus = useBrandingStore((s) => s.status);
  const hydrateBranding = useBrandingStore((s) => s.hydrate);
  const standards = useStandardsStore((s) => s.items);

  const [verifyBaseUrl, setVerifyBaseUrl] = useState(() => import.meta.env.VITE_PUBLIC_VERIFY_URL || "https://certi-core-certicore.vercel.app");

  useEffect(() => {
    void (async () => {
      const res = await getConfig();
      if (res.ok && res.data.verifyBaseUrl) {
        setVerifyBaseUrl(res.data.verifyBaseUrl);
      }
    })();
  }, []);
  const stdStatus = useStandardsStore((s) => s.status);
  const hydrateStd = useStandardsStore((s) => s.hydrate);
  const testEquipment = useTestEquipmentStore((s) => s.items);
  const teStatus = useTestEquipmentStore((s) => s.status);
  const hydrateTe = useTestEquipmentStore((s) => s.hydrate);
  const media = useMediaStore((s) => s.assets);
  const mediaStatus = useMediaStore((s) => s.status);
  const hydrateMedia = useMediaStore((s) => s.hydrate);
  const inspectors = useInspectorsStore((s) => s.inspectors);
  const inspStatus = useInspectorsStore((s) => s.status);
  const hydrateInspectors = useInspectorsStore((s) => s.hydrate);

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<CertificateResult | "all">("all");
  const [preview, setPreview] = useState<IssuedCertificate | null>(null);

  useEffect(() => {
    if (status === "idle") void hydrate();
    if (bStatus === "idle") void hydrateBranding();
    if (eqStatus === "idle") void hydrateEq();
    if (stdStatus === "idle") void hydrateStd();
    if (teStatus === "idle") void hydrateTe();
    if (mediaStatus === "idle") void hydrateMedia();
    if (inspStatus === "idle") void hydrateInspectors();
  }, [status, bStatus, eqStatus, stdStatus, teStatus, mediaStatus, inspStatus, hydrate, hydrateBranding, hydrateEq, hydrateStd, hydrateTe, hydrateMedia, hydrateInspectors]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return certs
      .filter((c) => (filter === "all" ? true : c.result === filter))
      .filter((c) => {
        if (!term) return true;
        return [c.id, c.equipmentTag, c.equipmentName, c.templateName, c.inspectorName]
          .join(" ")
          .toLowerCase()
          .includes(term);
      });
  }, [certs, filter, q]);

  const stats = useMemo(() => ({
    total: certs.length,
    pass: certs.filter((c) => c.result === "pass").length,
    conditional: certs.filter((c) => c.result === "conditional").length,
    fail: certs.filter((c) => c.result === "fail").length,
  }), [certs]);

  return (
    <div className="mx-auto flex h-full max-w-[1500px] flex-col gap-6 px-6 py-8">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">{t("certificates.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("certificates.subtitle")}
        </p>

      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("certificates.total")} value={stats.total} tone="text-foreground" icon={<FileBadge className="h-4 w-4" />} />
        <StatCard label={t("common.pass")} value={stats.pass} tone="text-emerald-500" icon={<CheckCircle2 className="h-4 w-4" />} />
        <StatCard label={t("common.conditional")} value={stats.conditional} tone="text-orange-500" icon={<ShieldAlert className="h-4 w-4" />} />
        <StatCard label={t("common.fail")} value={stats.fail} tone="text-red-500" icon={<XCircle className="h-4 w-4" />} />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card/40 p-3 backdrop-blur">
        <div className="flex flex-1 items-center gap-2 min-w-[240px]">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("certificates.searchPlaceholder")}
            className="max-w-md border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="flex gap-1 rounded-full border border-border/60 bg-background/50 p-1">
          {(["all", "pass", "conditional", "fail"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                filter === s ? "bg-gold text-black" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {status === "loading" ? (
        <div className="grid h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="grid h-64 place-items-center rounded-2xl border border-dashed border-border/60 bg-card/30 text-sm text-muted-foreground">
          {t("certificates.empty")}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence initial={false}>
            {filtered.map((c, index) => {
              const style = RESULT_STYLES[c.result];
              const days = daysBetween(c.validUntil);
              const expired = days < 0;
              return (
                <m.article
                  key={`${c.id}-${index}`}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ y: -3 }}
                  onClick={() => setPreview(c)}
                  className="group cursor-pointer overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur transition-colors hover:border-gold/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 text-gold">
                      <Award className="h-4 w-4" />
                      <span className="font-mono text-xs">{c.id}</span>
                    </div>
                    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", style.chip)}>
                      {style.icon}
                      {style.label}
                    </span>
                  </div>
                  <h3 className="mt-3 line-clamp-1 font-display text-lg font-semibold">{c.equipmentName}</h3>
                  <p className="text-xs text-muted-foreground">
                    {c.equipmentTag} · {c.templateName}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><ClipboardCheck className="h-3 w-3" /> {(c.checklist ?? []).length}</span>
                    <span className="flex items-center gap-1"><FlaskConical className="h-3 w-3" /> {(c.ndt ?? []).length}</span>
                    <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {(c.defects ?? []).length}</span>
                    <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {(c.standardIds ?? []).length}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      {t("certificates.issuedOn")} {formatDate(c.issuedAt)}
                    </div>
                    <span className={cn(expired && "text-red-500")}>
                      {expired ? t("certificates.expired") : t("certificates.expiresIn", { days: String(days) }).replace("{days}", String(days))}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-3 text-[11px] text-muted-foreground">
                    <span>{c.inspectorName}</span>
                    <span className="flex items-center gap-1 font-mono">
                      <Hash className="h-3 w-3" />
                      {c.hash.slice(-8)}
                    </span>
                  </div>
                </m.article>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {preview && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreview(null)}
            className="cert-modal-backdrop fixed inset-0 z-50 grid place-items-start overflow-y-auto bg-black/80 p-4 backdrop-blur-sm sm:p-8"
          >
            <m.div
              initial={{ scale: 0.97, y: 14 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 14 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative mx-auto my-8 w-full max-w-[1180px]"
            >
              <button
                type="button"
                onClick={() => setPreview(null)}
                aria-label={t("certificates.closePreview")}
                className="cert-close absolute -right-3 -top-3 z-10 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-neutral-900 text-white/80 shadow-lg hover:bg-neutral-800"
              >
                <X className="h-4 w-4" />
              </button>

              <DossierViewer
                cert={preview}
                equipment={equipment.find((e) => e.id === preview.equipmentId)}
                inspector={inspectors.find((i) => i.id === preview.inspectorId)}
                branding={branding}
                standards={standards}
                testEquipment={testEquipment}
                media={media}
                verifyBaseUrl={verifyBaseUrl}
              />
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ========================================================================== */
/* DOSSIER VIEWER — page rail + A4 sheets                                     */
/* ========================================================================== */

type DossierPageId =
  | "cover"
  | "spec"
  | "standards"
  | "checklist"
  | "ndt"
  | "calibration"
  | "defects"
  | "annex";

type DossierPage = {
  id: DossierPageId;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  count?: number;
};

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

function DossierViewer({
  cert,
  equipment,
  inspector,
  branding,
  standards,
  testEquipment,
  media,
  verifyBaseUrl,
}: {
  cert: IssuedCertificate;
  equipment: Equipment | undefined;
  inspector: Inspector | undefined;
  branding: ReturnType<typeof useBrandingStore.getState>["branding"];
  standards: Standard[];
  testEquipment: TestEquipment[];
  media: MediaAsset[];
  verifyBaseUrl: string;
}) {
  const checklist = cert.checklist ?? [];
  const ndt = cert.ndt ?? [];
  const defects = cert.defects ?? [];
  const linkedStandards = standards.filter((s) => (cert.standardIds ?? []).includes(s.id));
  const usedTeIds = Array.from(new Set([
    ...(cert.testEquipmentIds ?? []),
    ...ndt.map((r) => r.testEquipmentId).filter((x): x is string => !!x),
  ]));
  const linkedTe = testEquipment.filter((t) => usedTeIds.includes(t.id));
  const photos = media.filter((m) => cert.photos.includes(m.id));

  const pages: DossierPage[] = [
    { id: "cover", label: "Cover certificate", sublabel: "Result & signatures", icon: <Award className="h-3.5 w-3.5" /> },
    { id: "spec", label: "Equipment specification", sublabel: "Nameplate & duty", icon: <FileBadge className="h-3.5 w-3.5" /> },
    { id: "standards", label: "Standards & scope", sublabel: "Regulations enforced", icon: <BookOpen className="h-3.5 w-3.5" />, count: linkedStandards.length },
    { id: "checklist", label: "Detailed checklist", sublabel: "Clause-by-clause", icon: <ClipboardCheck className="h-3.5 w-3.5" />, count: checklist.length },
    { id: "ndt", label: "NDT & special tests", sublabel: "Method, criteria, result", icon: <FlaskConical className="h-3.5 w-3.5" />, count: ndt.length },
    { id: "calibration", label: "Calibration register", sublabel: "Test equipment used", icon: <Wrench className="h-3.5 w-3.5" />, count: linkedTe.length },
    { id: "defects", label: "Defects & remedies", sublabel: "Severity & deadlines", icon: <AlertTriangle className="h-3.5 w-3.5" />, count: defects.length },
    { id: "annex", label: "Photographic annex", sublabel: "Field evidence", icon: <Images className="h-3.5 w-3.5" />, count: photos.length },
  ];

  const [active, setActive] = useState<DossierPageId>("cover");
  const [exporting, setExporting] = useState(false);
  const exportRootRef = useRef<HTMLDivElement | null>(null);

  function renderPage(id: DossierPageId) {
    switch (id) {
      case "cover":
        return <PageCover cert={cert} equipment={equipment} inspector={inspector} branding={branding} verifyBaseUrl={verifyBaseUrl} />;
      case "spec":
        return <PageSpec cert={cert} equipment={equipment} />;
      case "standards":
        return <PageStandards standards={linkedStandards} cert={cert} />;
      case "checklist":
        return <PageChecklist cert={cert} standards={standards} />;
      case "ndt":
        return <PageNdt cert={cert} testEquipment={testEquipment} />;
      case "calibration":
        return <PageCalibration items={linkedTe} />;
      case "defects":
        return <PageDefects cert={cert} />;
      case "annex":
        return <PageAnnex photos={photos} />;
    }
  }

  async function handleExport() {
    if (!exportRootRef.current) return;
    setExporting(true);
    const toastId = toast.loading("Preparing dossier PDF…", {
      description: "Rendering 8 A4 pages",
    });
    try {
      const clientName = slugify(branding.organizationName);
      const tagSlug = slugify(cert.equipmentTag);
      const dateStr = new Date(cert.issuedAt).toISOString().split("T")[0];
      const filename = `${clientName}_${tagSlug}_${dateStr}.pdf`;
      await exportDossierPdf(exportRootRef.current, filename, (i, total, label) => {
        toast.loading(`Rendering page ${i} of ${total}`, { id: toastId, description: label });
      });
      toast.success("Dossier PDF exported", { id: toastId, description: `Saved as ${filename}` });
    } catch (err) {
      console.error(err);
      toast.error("Export failed", { id: toastId, description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setExporting(false);
    }
  }

  function handlePrint() {
    setActive("cover");
    setTimeout(() => window.print(), 60);
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
      {/* Page rail */}
      <aside className="hidden lg:block">
        <div className="sticky top-4 rounded-xl border border-white/10 bg-neutral-950/80 p-2 backdrop-blur">
          <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
            Dossier · {pages.length} pages
          </p>
          <ol className="space-y-1">
            {pages.map((p, i) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setActive(p.id)}
                  className={cn(
                    "group relative flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors",
                    active === p.id
                      ? "border-gold/60 bg-gold/10 text-gold"
                      : "border-transparent bg-transparent text-white/70 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-6 w-6 shrink-0 place-items-center rounded-md border font-mono text-[10px]",
                      active === p.id
                        ? "border-gold/60 bg-gold/20 text-gold"
                        : "border-white/10 bg-white/5 text-white/50",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
                      {p.icon}
                      {p.label}
                    </span>
                    <span className={cn("mt-0.5 block text-[10px]", active === p.id ? "text-gold/80" : "text-white/40")}>
                      {p.sublabel}
                    </span>
                  </span>
                  {p.count !== undefined && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 font-mono text-[10px]",
                        active === p.id ? "bg-gold/30 text-gold" : "bg-white/10 text-white/60",
                      )}
                    >
                      {p.count}
                    </span>
                  )}
                  {active === p.id && (
                    <m.span
                      layoutId="rail-indicator"
                      className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-gold"
                    />
                  )}
                </button>
              </li>
            ))}
          </ol>

          <div className="mt-3 space-y-2 border-t border-white/10 px-2 pt-3">
            <Button
              size="sm"
              onClick={handleExport}
              disabled={exporting}
              className="w-full gap-2 bg-gold text-[10px] font-bold uppercase tracking-[0.15em] text-black hover:bg-gold/90"
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {exporting ? "Rendering…" : "Export dossier PDF"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handlePrint}
              className="w-full gap-2 border border-white/10 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/70 hover:bg-white/5"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </Button>
            <p className="text-center text-[9px] text-white/40">
              All {pages.length} pages · SHA-256 embedded
            </p>
          </div>
        </div>
      </aside>

      {/* Sheet area */}
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-2 lg:hidden">
          {pages.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActive(p.id)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                active === p.id
                  ? "border-gold bg-gold/20 text-gold"
                  : "border-white/10 bg-neutral-900 text-white/60",
              )}
            >
              {i + 1}. {p.label}
            </button>
          ))}
        </div>

        <div className="relative overflow-x-auto">
          <div
            className="relative mx-auto"
            style={{ width: A4_WIDTH, minHeight: A4_HEIGHT }}
          >
            <AnimatePresence mode="wait">
              <m.div
                key={active}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              >
                <A4Sheet
                  pageIndex={pages.findIndex((p) => p.id === active) + 1}
                  totalPages={pages.length}
                  cert={cert}
                  branding={branding}
                >
                  {renderPage(active)}
                </A4Sheet>
              </m.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Off-screen render root — all 8 pages, used only for PDF export */}
      <div
        ref={exportRootRef}
        aria-hidden
        style={{
          position: "fixed",
          left: "-100000px",
          top: 0,
          pointerEvents: "none",
          opacity: 0,
        }}
      >
        {pages.map((p, i) => (
          <div key={p.id} data-dossier-page={p.id} style={{ width: A4_WIDTH, height: A4_HEIGHT }}>
            <A4Sheet
              pageIndex={i + 1}
              totalPages={pages.length}
              cert={cert}
              branding={branding}
            >
              {renderPage(p.id)}
            </A4Sheet>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* A4 sheet chrome                                                            */
/* -------------------------------------------------------------------------- */

function A4Sheet({
  pageIndex,
  totalPages,
  cert,
  branding,
  children,
}: {
  pageIndex: number;
  totalPages: number;
  cert: IssuedCertificate;
  branding: ReturnType<typeof useBrandingStore.getState>["branding"];
  children: React.ReactNode;
}) {
  const orgInitial = (branding.organizationName || "C").charAt(0).toUpperCase();
  const showWatermark = branding.watermarkEnabled !== false;
  const brandPrimary = branding.primaryColor || "#0B1220";
  const brandAccent = branding.accentColor || "#c9a24a";

  return (
    <article
      className="a4-sheet certificate-print-root relative overflow-hidden bg-[#faf7f0] text-[#0B1220] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.04)]"
      style={{
        width: A4_WIDTH,
        height: A4_HEIGHT,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Top brand band */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-1.5"
        style={{
          background: `linear-gradient(90deg, ${brandPrimary} 0%, ${brandPrimary} 70%, ${brandAccent} 100%)`,
        }}
      />
      {/* Accent hairline under band */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-1.5 h-px"
        style={{ background: brandAccent, opacity: 0.5 }}
      />

      {/* Subtle grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, #0B1220 0 1px, transparent 1px 8px), repeating-linear-gradient(0deg, #0B1220 0 1px, transparent 1px 28px)",
        }}
      />

      {/* Corner ornaments */}
      <CornerMark className="absolute left-4 top-4" color={brandAccent} />
      <CornerMark className="absolute right-4 top-4 rotate-90" color={brandAccent} />
      <CornerMark className="absolute left-4 bottom-4 -rotate-90" color={brandAccent} />
      <CornerMark className="absolute right-4 bottom-4 rotate-180" color={brandAccent} />

      {/* Watermark — faint org monogram */}
      {showWatermark && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 grid place-items-center"
          style={{ opacity: 0.05 }}
        >
          {branding.logoDataUrl ? (
            <img src={branding.logoDataUrl} alt="" className="h-[440px] w-[440px] object-contain" />
          ) : (
            <img src="/logo.png" alt="" className="h-[440px] w-[440px] object-contain" />
          )}
        </div>
      )}

      <div className="relative flex h-full flex-col pt-3">
        {children}
        {/* Footer strip */}
        <div className="absolute inset-x-6 bottom-4 flex items-center justify-between border-t border-[#0B1220]/15 pt-2 font-mono text-[9px] uppercase tracking-widest text-[#0B1220]/55">
          <span>Ref. {cert.id}</span>
          <span>Dossier · Page {pageIndex} of {totalPages} · Confidential</span>
          <span>{cert.hash.slice(0, 14)}…</span>
        </div>
      </div>
    </article>
  );
}


function CornerMark({ className, color }: { className?: string; color: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 40 40"
      className={cn("pointer-events-none h-6 w-6", className)}
      style={{ color }}
    >
      <path d="M2 14 V2 H14" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <path d="M6 18 V6 H18" stroke="currentColor" strokeWidth="0.6" fill="none" opacity="0.5" />
    </svg>
  );
}


function PageHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header className="border-b border-[#0B1220]/10 px-10 pt-10 pb-4">
      <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#c9a24a]">
        {eyebrow}
      </p>
      <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-[#0B1220]">{title}</h2>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* Page: Cover                                                                */
/* -------------------------------------------------------------------------- */

function PageCover({
  cert,
  equipment,
  inspector,
  branding,
  verifyBaseUrl,
}: {
  cert: IssuedCertificate;
  equipment: Equipment | undefined;
  inspector: Inspector | undefined;
  branding: ReturnType<typeof useBrandingStore.getState>["branding"];
  verifyBaseUrl: string;
}) {
  const style = RESULT_STYLES[cert.result];
  const findings = deriveFindings(cert);
  const shortHash = `${cert.hash.slice(0, 10)}…${cert.hash.slice(-10)}`;
  const brandPrimary = branding.primaryColor || "#0B1220";
  const brandAccent = branding.accentColor || "#c9a24a";
  const accreditationLogos = branding.accreditationLogos ?? [];
  return (
    <div className="flex h-full flex-col px-10 pt-8">
      {/* Masthead */}
      <header className="flex items-start justify-between gap-6 pb-4">
        <div className="flex items-start gap-3.5">
          {branding.logoDataUrl ? (
            <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-md bg-white p-1.5 ring-1 ring-[#0B1220]/10">
              <img src={branding.logoDataUrl} alt="" className="max-h-full max-w-full object-contain" />
            </div>
          ) : (
            <div
              className="grid h-14 w-14 shrink-0 place-items-center rounded-md text-white"
              style={{ background: `linear-gradient(135deg, ${brandPrimary}, ${brandAccent})` }}
            >
              <span className="font-display text-xl font-bold">
                {(branding.organizationName || "C").charAt(0)}
              </span>
            </div>
          )}
          <div>
            <h2
              className="font-display text-xl font-bold leading-tight tracking-tight"
              style={{ color: brandPrimary }}
            >
              {branding.organizationName}
            </h2>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-[#0B1220]/55">
              Reg. {branding.registrationNo}
              {branding.accreditations ? ` · ${branding.accreditations}` : ""}
            </p>
            <p className="mt-0.5 text-[9px] text-[#0B1220]/50">
              {branding.email} · {branding.website}
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          {/* QR Code Verification */}
          <div className="flex flex-col items-center gap-1">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
                `${verifyBaseUrl}/?id=${cert.id}`
              )}`}
              alt="Verification QR"
              className="h-14 w-14 rounded border bg-white p-0.5"
            />
            <span className="text-[6px] uppercase tracking-wider text-[#0B1220]/50 font-bold">Scan to Verify</span>
          </div>

          <div className="text-right">
            <p className="text-[9px] font-semibold uppercase tracking-[0.25em]" style={{ color: brandAccent }}>
              Reference
            </p>
            <p className="mt-0.5 font-mono text-[13px] font-bold text-[#0B1220]">{cert.id}</p>
            <span
              className={cn(
                "mt-2 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                style.chip,
              )}
            >
              {style.icon}
              {style.label}
            </span>
          </div>
        </div>
      </header>

      {/* Title band */}
      <div className="relative overflow-hidden rounded-md px-6 py-5 text-white shadow-sm"
        style={{ background: `linear-gradient(120deg, ${brandPrimary} 0%, ${brandPrimary} 60%, color-mix(in oklab, ${brandPrimary} 70%, ${brandAccent} 30%) 100%)` }}
      >
        <div aria-hidden className="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-20" style={{ background: brandAccent }} />
        <p className="text-[9px] font-bold uppercase tracking-[0.35em]" style={{ color: brandAccent }}>
          Certificate of Thorough Examination
        </p>
        <h1 className="mt-1.5 font-display text-[26px] font-bold leading-tight tracking-tight">
          {cert.equipmentName}
        </h1>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-white/70">
          {cert.equipmentTag} · {cert.templateName}
        </p>
      </div>

      <p className="mt-4 font-serif text-[12px] italic leading-relaxed text-[#0B1220]/70">
        This is to certify that the equipment identified below has been thoroughly examined
        in accordance with the applicable regulations and, in the opinion of the competent
        person named, is safe for continued use to the date shown.
      </p>

      {/* Bento data grid */}
      <dl className="mt-4 grid grid-cols-4 gap-2">
        <BentoField label="Manufacturer" value={equipment?.manufacturer ?? "—"} />
        <BentoField label="Serial number" value={equipment?.serialNumber ?? "—"} mono />
        <BentoField label="Working load" value={equipment?.workingLoad ?? cert.spec?.ratedCapacity ?? "As per plate"} />
        <BentoField label="Location" value={equipment?.site ?? "—"} />
        <BentoField label="Category" value={EQUIPMENT_CATEGORY_LABEL[cert.equipmentCategory ?? "generic"]} />
        <BentoField label="Competent person" value={cert.inspectorName} />
        <BentoField label="Examined" value={formatLongDate(cert.issuedAt)} />
        <BentoField label="Next due" value={formatLongDate(cert.validUntil)} accent brandAccent={brandAccent} />
      </dl>

      {/* Findings */}
      <section className="mt-3 rounded-md border-l-[3px] bg-white/60 px-4 py-3" style={{ borderColor: brandAccent }}>
        <p className="text-[9px] font-bold uppercase tracking-[0.25em]" style={{ color: brandPrimary }}>
          Summary of findings
        </p>
        <ul className="mt-1.5 space-y-1 font-serif text-[11.5px] leading-snug text-[#0B1220]/80">
          {findings.map((f, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ background: brandAccent }} />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Signature blocks + stamp */}
      <section className="mt-auto grid grid-cols-[1fr_1fr_auto] items-end gap-5 border-t border-[#0B1220]/10 pt-4 pb-2">
        <SignatureBlock
          role="Competent Person"
          name={cert.inspectorName}
          title={inspector?.title ?? "Chartered Inspector"}
          qualification={inspector?.qualification}
          signatureUrl={inspector?.signatureDataUrl ?? null}
          date={cert.issuedAt}
        />
        <SignatureBlock
          role="Authorised by"
          name={branding.managerName || "—"}
          title={branding.managerTitle || "Technical Manager"}
          signatureUrl={branding.managerSignatureDataUrl}
          date={cert.issuedAt}
        />

        {/* Stamp / seal */}
        <div className="relative grid h-24 w-24 place-items-center">
          {branding.stampDataUrl ? (
            <img
              src={branding.stampDataUrl}
              alt=""
              className="h-full w-full object-contain"
              style={{ transform: "rotate(-6deg)", opacity: 0.9 }}
            />
          ) : (
            <>
              <div className="absolute inset-0 rounded-full border-2" style={{ borderColor: brandAccent }} />
              <div className="absolute inset-1.5 rounded-full border" style={{ borderColor: brandAccent, opacity: 0.6 }} />
              <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
                <defs>
                  <path id={`stampTop-${cert.id}`} d="M 50,50 m -38,0 a 38,38 0 1 1 76,0" fill="none" />
                  <path id={`stampBottom-${cert.id}`} d="M 50,50 m -38,0 a 38,38 0 1 0 76,0" fill="none" />
                </defs>
                <text fill={brandAccent} fontSize="8" fontWeight="700" letterSpacing="1.5" fontFamily="Inter, sans-serif">
                  <textPath href={`#stampTop-${cert.id}`} startOffset="50%" textAnchor="middle">
                    CERTIFIED · {(branding.organizationName || "").toUpperCase()}
                  </textPath>
                </text>
                <text fill={brandAccent} fontSize="7" fontWeight="700" letterSpacing="1.3" fontFamily="Inter, sans-serif">
                  <textPath href={`#stampBottom-${cert.id}`} startOffset="50%" textAnchor="middle">
                    COMPETENT PERSON · {new Date(cert.issuedAt).getFullYear()}
                  </textPath>
                </text>
              </svg>
              <div className="text-center">
                <p className="font-display text-[10px] font-bold uppercase tracking-widest text-[#0B1220]">
                  {style.label}
                </p>
                <p className="mt-0.5 font-mono text-[8px] text-[#0B1220]/60">
                  {new Date(cert.issuedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }).toUpperCase()}
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Accreditation strip */}
      {accreditationLogos.length > 0 && (
        <div className="mt-3 mb-10 flex items-center justify-center gap-5 border-t border-[#0B1220]/10 pt-3">
          <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-[#0B1220]/45">
            Accredited by
          </span>
          <div className="flex items-center gap-6 opacity-90">
            {accreditationLogos.slice(0, 6).map((l) => (
              <img
                key={l.id}
                src={l.dataUrl}
                alt={l.name}
                title={l.name}
                className="h-7 w-auto object-contain"
                style={{ maxWidth: 78 }}
              />
            ))}
          </div>
        </div>
      )}
      {accreditationLogos.length === 0 && <div className="mb-10" />}

    </div>
  );
}

function BentoField({ label, value, mono, accent, brandAccent }: { label: string; value: string; mono?: boolean; accent?: boolean; brandAccent?: string }) {
  return (
    <div
      className={cn(
        "rounded-md border border-[#0B1220]/10 bg-white/60 px-3 py-2",
        accent && "ring-1",
      )}
      style={accent ? { boxShadow: `inset 0 0 0 1px ${brandAccent}` } : undefined}
    >
      <dt className="text-[8.5px] font-bold uppercase tracking-[0.2em] text-[#0B1220]/50">{label}</dt>
      <dd className={cn("mt-0.5 text-[12px] font-semibold text-[#0B1220] leading-tight", mono && "font-mono text-[11px]")}
        style={accent ? { color: brandAccent } : undefined}
      >
        {value}
      </dd>
    </div>
  );
}



function SignatureBlock({
  role,
  name,
  title,
  qualification,
  signatureUrl,
  date,
}: {
  role: string;
  name: string;
  title: string;
  qualification?: string;
  signatureUrl: string | null | undefined;
  date: string;
}) {
  return (
    <div>
      <div className="relative h-12">
        {signatureUrl ? (
          <img
            src={signatureUrl}
            alt=""
            className="absolute inset-x-0 bottom-0 max-h-14 w-auto object-contain object-left"
            style={{ maxWidth: 200 }}
          />
        ) : (
          <span
            className="absolute inset-x-0 bottom-0 block truncate font-display text-[22px] italic leading-none text-[#0B1220]"
            style={{ fontFamily: "'Cormorant Garamond', 'Georgia', serif" }}
          >
            {name}
          </span>
        )}
      </div>
      <div className="h-px w-full bg-[#0B1220]/60" />
      <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-[#0B1220]/70">
        {role}
      </p>
      <p className="text-[10px] font-semibold text-[#0B1220]">{name}</p>
      <p className="text-[9px] text-[#0B1220]/60">
        {title}
        {qualification ? ` · ${qualification}` : ""}
      </p>
      <p className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-[#0B1220]/50">
        Signed {formatLongDate(date)}
      </p>
    </div>
  );
}

function CoverField({ label, value, mono, accent }: { label: string; value: string; mono?: boolean; accent?: boolean }) {
  return (
    <div>
      <dt className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#0B1220]/50">{label}</dt>
      <dd className={cn("mt-0.5 text-[13px] font-semibold text-[#0B1220]", mono && "font-mono text-[12px]", accent && "text-[#8a6b1c]")}>
        {value}
      </dd>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Page: Spec                                                                 */
/* -------------------------------------------------------------------------- */

function PageSpec({ cert, equipment }: { cert: IssuedCertificate; equipment: Equipment | undefined }) {
  const spec = cert.spec ?? equipment?.spec ?? {};
  const rows: [string, string | undefined][] = [
    ["Manufacturer", equipment?.manufacturer],
    ["Serial number", equipment?.serialNumber],
    ["Asset tag", equipment?.tag ?? cert.equipmentTag],
    ["Site", equipment?.site],
    ["Category", EQUIPMENT_CATEGORY_LABEL[cert.equipmentCategory ?? "generic"]],
    ["Rated capacity", spec.ratedCapacity ?? equipment?.workingLoad],
    ["Duty class", spec.dutyClass],
    ["Year of manufacture", spec.yearOfManufacture],
    ["Country of origin", spec.countryOfOrigin],
    ["Design standard", spec.designStandard],
    ["Material", spec.material],
    ["Principal dimensions", spec.dimensions],
    ["Weight", spec.weightKg ? `${spec.weightKg} kg` : undefined],
    ["Power rating", spec.powerRating],
    ["Drive system", spec.driveSystem],
    ["Operating range", spec.operatingRange],
  ];
  return (
    <>
      <PageHeader eyebrow="Section 2 · Equipment specification" title="Nameplate & design data" />
      <div className="grow px-10 py-6">
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 border border-[#0B1220]/10 bg-white/50 p-6">
          {rows.map(([label, value]) => (
            <div key={label} className="border-b border-dashed border-[#0B1220]/10 pb-2">
              <dt className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#0B1220]/50">{label}</dt>
              <dd className="mt-0.5 text-[12px] font-semibold text-[#0B1220]">{value || "—"}</dd>
            </div>
          ))}
        </dl>
        {spec.additional && (
          <div className="mt-4 border-l-2 border-[#c9a24a] bg-white/40 p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#0B1220]/50">Additional</p>
            <p className="mt-1 font-serif text-[12px] italic leading-relaxed text-[#0B1220]/80">{spec.additional}</p>
          </div>
        )}
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Page: Standards & scope                                                    */
/* -------------------------------------------------------------------------- */

function PageStandards({ standards, cert }: { standards: Standard[]; cert: IssuedCertificate }) {
  return (
    <>
      <PageHeader eyebrow="Section 3 · Standards & scope of examination" title="Regulations enforced" />
      <div className="grow px-10 py-6">
        <p className="mb-4 font-serif text-[12px] italic leading-relaxed text-[#0B1220]/70">
          This examination was carried out in accordance with the following standards and codes of practice.
          The competent person confirms familiarity with each and applied them to the extent relevant to the
          equipment under examination.
        </p>
        {standards.length === 0 ? (
          <div className="grid h-40 place-items-center border border-dashed border-[#0B1220]/20 text-[11px] text-[#0B1220]/50">
            No standards linked to this dossier.
          </div>
        ) : (
          <div className="space-y-3">
            {standards.map((s) => (
              <div key={s.id} className="border-l-2 border-[#c9a24a] bg-white/50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#c9a24a]">
                      {s.code} · {s.jurisdiction}
                    </p>
                    <h3 className="mt-0.5 font-display text-[13px] font-bold text-[#0B1220]">{s.title}</h3>
                  </div>
                  <span className="rounded-sm bg-[#0B1220]/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-[#0B1220]/60">
                    {s.revision}
                  </span>
                </div>
                <p className="mt-1.5 font-serif text-[11px] leading-relaxed text-[#0B1220]/70">
                  {s.summary}
                </p>
              </div>
            ))}
          </div>
        )}
        <div className="mt-6 border-t border-[#0B1220]/10 pt-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#0B1220]/50">Examination interval</p>
          <p className="mt-1 text-[12px] font-semibold text-[#0B1220]">
            Next examination due {formatLongDate(cert.validUntil)}
          </p>
        </div>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Page: Checklist                                                            */
/* -------------------------------------------------------------------------- */

function PageChecklist({ cert, standards }: { cert: IssuedCertificate; standards: Standard[] }) {
  const list = cert.checklist ?? [];
  return (
    <>
      <PageHeader eyebrow="Section 4 · Detailed checklist" title="Clause-by-clause examination" />
      <div className="grow px-10 py-4">
        {list.length === 0 ? (
          <div className="grid h-40 place-items-center border border-dashed border-[#0B1220]/20 text-[11px] text-[#0B1220]/50">
            No checklist recorded for this dossier.
          </div>
        ) : (
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b-2 border-[#0B1220] text-left font-bold uppercase tracking-widest text-[#0B1220]/70">
                <th className="w-8 py-2 pr-2">#</th>
                <th className="w-32 py-2 pr-2">Clause</th>
                <th className="py-2 pr-2">Question</th>
                <th className="w-16 py-2 pr-2 text-center">Verdict</th>
                <th className="w-52 py-2 pr-2">Note</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c, i) => {
                const std = standards.find((s) => s.id === c.standardId);
                return (
                  <tr key={c.id} className="border-b border-[#0B1220]/10 align-top">
                    <td className="py-2 pr-2 font-mono text-[10px] text-[#0B1220]/60">{i + 1}</td>
                    <td className="py-2 pr-2">
                      <p className="font-mono text-[10px] font-bold text-[#c9a24a]">{c.clause}</p>
                      {std && <p className="text-[9px] text-[#0B1220]/50">{std.code}</p>}
                    </td>
                    <td className="py-2 pr-2 font-serif text-[11px] text-[#0B1220]/90">{c.question}</td>
                    <td className="py-2 pr-2 text-center">
                      <span
                        className={cn(
                          "inline-block rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase",
                          c.verdict === "pass" && "bg-emerald-600/15 text-emerald-700",
                          c.verdict === "fail" && "bg-red-600/15 text-red-700",
                          c.verdict === "na" && "bg-[#0B1220]/10 text-[#0B1220]/60",
                        )}
                      >
                        {c.verdict}
                      </span>
                    </td>
                    <td className="py-2 pr-2 font-serif text-[10px] text-[#0B1220]/70">{c.note || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Page: NDT                                                                  */
/* -------------------------------------------------------------------------- */

function PageNdt({ cert, testEquipment }: { cert: IssuedCertificate; testEquipment: TestEquipment[] }) {
  const list = cert.ndt ?? [];
  return (
    <>
      <PageHeader eyebrow="Section 5 · NDT & special tests" title="Non-destructive & functional tests" />
      <div className="grow space-y-3 px-10 py-4">
        {list.length === 0 ? (
          <div className="grid h-40 place-items-center border border-dashed border-[#0B1220]/20 text-[11px] text-[#0B1220]/50">
            No NDT records for this dossier.
          </div>
        ) : (
          list.map((r, i) => {
            const te = testEquipment.find((t) => t.id === r.testEquipmentId);
            return (
              <div key={r.id} className="border border-[#0B1220]/15 bg-white/50">
                <div className="flex items-center justify-between border-b border-[#0B1220]/10 bg-[#0B1220]/[0.04] px-3 py-1.5">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#0B1220]">
                    Test {i + 1} · {NDT_METHOD_LABEL[r.method]}
                  </p>
                  <span
                    className={cn(
                      "rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase",
                      r.verdict === "pass" && "bg-emerald-600/15 text-emerald-700",
                      r.verdict === "fail" && "bg-red-600/15 text-red-700",
                      r.verdict === "na" && "bg-[#0B1220]/10 text-[#0B1220]/60",
                    )}
                  >
                    {r.verdict}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-3 py-2.5">
                  <NdtCell label="Area / component" value={r.area || "—"} />
                  <NdtCell label="Performed" value={new Date(r.performedAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} />
                  <NdtCell label="Technician" value={r.technician || "—"} />
                  <NdtCell label="Competency" value={r.technicianCertRef || "—"} mono />
                  <NdtCell
                    label="Test equipment"
                    value={te ? `${te.tag} · ${te.name} (cert ${te.calibrationCertRef})` : "Not applicable"}
                  />
                  <NdtCell label="Report ref." value={r.reportRef || "—"} mono />
                  <NdtCell label="Acceptance criteria" value={r.acceptanceCriteria || "—"} full />
                  <NdtCell label="Measured result" value={r.measuredResult || "—"} full />
                  {r.notes && <NdtCell label="Notes" value={r.notes} full />}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

function NdtCell({ label, value, mono, full }: { label: string; value: string; mono?: boolean; full?: boolean }) {
  return (
    <div className={cn(full && "col-span-2")}>
      <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#0B1220]/50">{label}</p>
      <p className={cn("mt-0.5 text-[11px] leading-snug text-[#0B1220]", mono && "font-mono text-[10px]")}>
        {value}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Page: Calibration register                                                 */
/* -------------------------------------------------------------------------- */

function PageCalibration({ items }: { items: TestEquipment[] }) {
  return (
    <>
      <PageHeader eyebrow="Section 6 · Calibration register" title="Test equipment used" />
      <div className="grow px-10 py-4">
        <p className="mb-3 font-serif text-[11px] italic leading-relaxed text-[#0B1220]/70">
          All measuring and NDT equipment used in this examination is traceable to national standards.
          Calibration certificates are held on file.
        </p>
        {items.length === 0 ? (
          <div className="grid h-40 place-items-center border border-dashed border-[#0B1220]/20 text-[11px] text-[#0B1220]/50">
            No calibrated equipment recorded.
          </div>
        ) : (
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b-2 border-[#0B1220] text-left font-bold uppercase tracking-widest text-[#0B1220]/70">
                <th className="w-24 py-2 pr-2">Tag</th>
                <th className="py-2 pr-2">Instrument</th>
                <th className="w-28 py-2 pr-2">Serial</th>
                <th className="w-36 py-2 pr-2">Cert ref.</th>
                <th className="w-24 py-2 pr-2">Cal. due</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => {
                const overdue = new Date(t.calibrationDueAt).getTime() < Date.now();
                return (
                  <tr key={t.id} className="border-b border-[#0B1220]/10">
                    <td className="py-2 pr-2 font-mono text-[10px] text-[#0B1220]">{t.tag}</td>
                    <td className="py-2 pr-2">
                      <p className="text-[11px] font-semibold text-[#0B1220]">{t.name}</p>
                      <p className="text-[9px] text-[#0B1220]/60">{t.manufacturer} {t.model}</p>
                    </td>
                    <td className="py-2 pr-2 font-mono text-[10px] text-[#0B1220]/80">{t.serialNumber}</td>
                    <td className="py-2 pr-2 font-mono text-[10px] text-[#0B1220]/80">{t.calibrationCertRef}</td>
                    <td className={cn("py-2 pr-2 font-mono text-[10px]", overdue ? "font-bold text-red-700" : "text-[#0B1220]/80")}>
                      {new Date(t.calibrationDueAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      {overdue && " · OVERDUE"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Page: Defects                                                              */
/* -------------------------------------------------------------------------- */

function PageDefects({ cert }: { cert: IssuedCertificate }) {
  const list = cert.defects ?? [];
  return (
    <>
      <PageHeader eyebrow="Section 7 · Defects & remedial actions" title="Observed defects" />
      <div className="grow px-10 py-4">
        {list.length === 0 ? (
          <div className="grid h-40 place-items-center border border-dashed border-[#0B1220]/20 text-[11px] text-[#0B1220]/50">
            No defects recorded — a clean examination.
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((d, i) => (
              <div key={d.id} className="border border-[#0B1220]/15 bg-white/50">
                <div className="flex items-center justify-between border-b border-[#0B1220]/10 bg-[#0B1220]/[0.04] px-3 py-1.5">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#0B1220]">
                    Defect {i + 1}
                  </p>
                  <span
                    className={cn(
                      "rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase",
                      d.severity === "critical" && "bg-red-600/15 text-red-700",
                      d.severity === "major" && "bg-orange-600/15 text-orange-700",
                      d.severity === "minor" && "bg-amber-600/15 text-amber-700",
                    )}
                  >
                    {d.severity}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-3 py-2.5">
                  <NdtCell label="Description" value={d.description || "—"} full />
                  <NdtCell label="Location" value={d.location || "—"} />
                  <NdtCell label="Remedy deadline" value={formatLongDate(d.deadline)} />
                  <NdtCell label="Remedial action" value={d.remedialAction || "—"} full />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Page: Annex                                                                */
/* -------------------------------------------------------------------------- */

function PageAnnex({ photos }: { photos: MediaAsset[] }) {
  return (
    <>
      <PageHeader eyebrow="Section 8 · Photographic annex" title="Field evidence" />
      <div className="grow px-10 py-4">
        {photos.length === 0 ? (
          <div className="grid h-40 place-items-center border border-dashed border-[#0B1220]/20 text-[11px] text-[#0B1220]/50">
            No photographs attached to this dossier.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {photos.map((p, i) => (
              <figure key={p.id} className="border border-[#0B1220]/15 bg-white p-2">
                <img src={p.dataUrl} alt={p.name} className="h-48 w-full object-cover" />
                <figcaption className="mt-1.5 flex items-center justify-between text-[9px] text-[#0B1220]/70">
                  <span className="font-mono">Fig. {i + 1}</span>
                  <span>{p.name}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function deriveFindings(cert: IssuedCertificate): string[] {
  const checklist = cert.checklist ?? [];
  const ndt = cert.ndt ?? [];
  const defects = cert.defects ?? [];
  const passN = checklist.filter((c) => c.verdict === "pass").length;
  const failN = checklist.filter((c) => c.verdict === "fail").length;
  const findings: string[] = [];
  if (checklist.length > 0) {
    findings.push(
      `Checklist: ${passN} of ${checklist.length} clauses satisfied${failN ? `; ${failN} failures logged` : ""}.`,
    );
  } else {
    findings.push("Visual and functional examination performed per applicable standards.");
  }
  if (ndt.length > 0) {
    const ndtFail = ndt.filter((r) => r.verdict === "fail").length;
    findings.push(
      `${ndt.length} non-destructive / special test(s) performed${ndtFail ? `; ${ndtFail} failed acceptance` : "; all within acceptance"}.`,
    );
  }
  if (defects.length === 0) {
    findings.push("No defects observed at this examination.");
  } else {
    const critical = defects.filter((d) => d.severity === "critical").length;
    findings.push(
      `${defects.length} defect(s) recorded${critical ? ` — ${critical} critical requiring immediate action` : " with remedial actions and deadlines"}.`,
    );
  }
  if (cert.result === "fail") {
    findings.push("Equipment withdrawn from service pending remediation — DO NOT USE.");
  } else if (cert.result === "conditional") {
    findings.push("Continued use permitted subject to defects being remedied by the stated deadlines.");
  }
  return findings;
}

function StatCard({ label, value, tone, icon }: { label: string; value: number; tone: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs uppercase tracking-wide">{label}</span>
        <span className="text-gold">{icon}</span>
      </div>
      <p className={cn("mt-1 font-display text-2xl font-bold", tone)}>{value}</p>
    </div>
  );
}
