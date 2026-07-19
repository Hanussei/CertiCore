import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, m } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  CloudSun,
  FileBadge,
  FileStack,
  FlaskConical,
  HardHat,
  Image as ImageIcon,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { ClientOnlyDate } from "@/components/ui/client-only-date";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEquipmentStore } from "@/stores/equipment";
import { useTemplatesStore } from "@/stores/templates";
import { useInspectionsStore } from "@/stores/inspections";
import { useT } from "@/hooks/use-t";
import { useMediaStore } from "@/stores/media";
import { useAuthStore } from "@/stores/auth";
import { useStandardsStore } from "@/stores/standards";
import { useTestEquipmentStore } from "@/stores/test-equipment";
import { updateAfterInspection } from "@/lib/bridge/equipment";
import { makeDefect, makeDraft, makeNdtRecord } from "@/lib/bridge/inspections";
import { fetchWeatherData } from "@/lib/bridge/weather";
import { BANK_BY_CATEGORY, instantiateBank } from "@/lib/bridge/checklists";
import type {
  CertificateResult,
  ChecklistItem,
  Defect,
  DefectSeverity,
  Equipment,
  InspectionDraft,
  InspectionFieldValue,
  NdtMethod,
  NdtRecord,
  TemplateField,
  Verdict,
} from "@/types";
import { NDT_METHOD_LABEL } from "@/types";
import { cn } from "@/lib/utils";

type InspectionsSearch = {
  resumeId?: string;
};

export const Route = createFileRoute("/app/inspections")({
  validateSearch: (search: Record<string, unknown>): InspectionsSearch => {
    return {
      resumeId: search.resumeId as string | undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "New Inspection — CertiCore" },
      { name: "description", content: "Field-first inspection workflow." },
    ],
  }),
  component: InspectionsPage,
});

const STEPS = ["Equipment", "Template", "Inspect", "Checklist", "NDT", "Defects", "Review"] as const;

type StepMeta = {
  label: string;
  icon: typeof HardHat;
  hint: string;
};

const STEP_META: StepMeta[] = [
  { label: "Equipment",  icon: HardHat,        hint: "Select the asset being inspected." },
  { label: "Template",   icon: FileStack,      hint: "Pick the inspection protocol to apply." },
  { label: "Inspect",    icon: ClipboardCheck, hint: "Record readings, observations, and photos." },
  { label: "Checklist",  icon: CheckCircle2,   hint: "Verdict every clause: pass, fail, N/A." },
  { label: "NDT",        icon: FlaskConical,   hint: "Log non-destructive tests and instruments." },
  { label: "Defects",    icon: AlertTriangle,  hint: "Capture defects with severity and remedy." },
  { label: "Review",     icon: ShieldCheck,    hint: "Confirm the verdict and issue the dossier." },
];


function InspectionsPage() {
  const navigate = useNavigate();
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const equipment = useEquipmentStore((s) => s.items);
  const eqStatus = useEquipmentStore((s) => s.status);
  const hydrateEq = useEquipmentStore((s) => s.hydrate);
  const templates = useTemplatesStore((s) => s.templates);
  const tplStatus = useTemplatesStore((s) => s.status);
  const hydrateTpl = useTemplatesStore((s) => s.hydrate);
  const media = useMediaStore((s) => s.assets);
  const mediaStatus = useMediaStore((s) => s.status);
  const hydrateMedia = useMediaStore((s) => s.hydrate);
  const standards = useStandardsStore((s) => s.items);
  const stdStatus = useStandardsStore((s) => s.status);
  const hydrateStd = useStandardsStore((s) => s.hydrate);
  const testEquipment = useTestEquipmentStore((s) => s.items);
  const teStatus = useTestEquipmentStore((s) => s.status);
  const hydrateTe = useTestEquipmentStore((s) => s.hydrate);
  const saveDraft = useInspectionsStore((s) => s.saveDraft);
  const issue = useInspectionsStore((s) => s.issue);

  const { resumeId } = Route.useSearch();
  const drafts = useInspectionsStore((s) => s.drafts);

  const [step, setStep] = useState(0);
  const [equipmentId, setEquipmentId] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, InspectionFieldValue>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [ndt, setNdt] = useState<NdtRecord[]>([]);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [result, setResult] = useState<CertificateResult>("pass");
  const [validForDays, setValidForDays] = useState(180);
  const [issuing, setIssuing] = useState(false);
  const [draftId, setDraftId] = useState<string>(() => resumeId || `drf_${Math.random().toString(36).slice(2, 10)}`);

  // Restore draft state if resuming
  useEffect(() => {
    if (resumeId && drafts.length > 0) {
      const existing = drafts.find((d) => d.id === resumeId);
      if (existing) {
        setEquipmentId(existing.equipmentId);
        setTemplateId(existing.templateId);
        setAnswers(existing.answers);
        setPhotos(existing.photos || []);
        setChecklist(existing.checklist || []);
        setNdt(existing.ndt || []);
        setDefects(existing.defects || []);
        setStep(existing.step || 0);
        setDraftId(existing.id);
      }
    }
  }, [resumeId, drafts]);

  useEffect(() => {
    if (eqStatus === "idle") void hydrateEq();
    if (tplStatus === "idle") void hydrateTpl();
    if (mediaStatus === "idle") void hydrateMedia();
    if (stdStatus === "idle") void hydrateStd();
    if (teStatus === "idle") void hydrateTe();
  }, [eqStatus, tplStatus, mediaStatus, stdStatus, teStatus, hydrateEq, hydrateTpl, hydrateMedia, hydrateStd, hydrateTe]);

  const equipmentActive = useMemo(
    () => equipment.filter((e) => e.status !== "retired"),
    [equipment],
  );
  const templatesPublished = useMemo(
    () => templates.filter((t) => t.status !== "archived"),
    [templates],
  );

  const selectedEquipment = equipment.find((e) => e.id === equipmentId) ?? null;
  const selectedTemplate = templates.find((t) => t.id === templateId) ?? null;

  // When template becomes available, instantiate its checklist bank once.
  useEffect(() => {
    if (!selectedTemplate) return;
    if (checklist.length > 0) return;
    const bankId = selectedTemplate.checklistBankId;
    if (!bankId) return;
    const category = selectedTemplate.equipmentCategory ?? "generic";
    const bank = BANK_BY_CATEGORY[category];
    if (!bank) return;
    const codeMap: Record<string, string> = {};
    for (const s of standards) codeMap[s.code] = s.id;
    setChecklist(instantiateBank(bank, codeMap));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate?.id, standards.length]);

  const requiredMissing = useMemo(() => {
    if (!selectedTemplate) return 0;
    let n = 0;
    for (const s of selectedTemplate.sections) {
      for (const f of s.fields) {
        if (!f.required) continue;
        const v = answers[f.id];
        if (v === undefined || v === null || v === "" || v === false) n++;
      }
    }
    return n;
  }, [selectedTemplate, answers]);

  const checklistOutstanding = useMemo(
    () => checklist.filter((c) => c.verdict === "na").length,
    [checklist],
  );
  const checklistFails = useMemo(
    () => checklist.filter((c) => c.verdict === "fail").length,
    [checklist],
  );
  const ndtMissing = useMemo(() => {
    if (!selectedTemplate) return [] as NdtMethod[];
    const mandatory = selectedTemplate.mandatoryNdtMethods ?? [];
    const covered = new Set(ndt.map((r) => r.method));
    return mandatory.filter((m) => !covered.has(m));
  }, [ndt, selectedTemplate]);
  const ndtInvalid = ndt.filter(
    (r) => !r.area.trim() || !r.technician.trim() || !r.acceptanceCriteria.trim() || r.verdict === "na",
  ).length;

  const canNext = useMemo(() => {
    if (step === 0) return !!equipmentId;
    if (step === 1) return !!templateId;
    if (step === 2) return requiredMissing === 0;
    if (step === 3) return checklistOutstanding === 0;
    if (step === 4) return ndtMissing.length === 0 && ndtInvalid === 0;
    return true;
  }, [step, equipmentId, templateId, requiredMissing, checklistOutstanding, ndtMissing.length, ndtInvalid]);

  function buildDraft(): InspectionDraft {
    return {
      ...makeDraft(equipmentId ?? "", templateId ?? "", user?.id ?? "u_unknown", user?.name ?? "Inspector"),
      id: draftId,
      answers,
      photos,
      step,
      checklist,
      ndt,
      defects,
      testEquipmentIds: Array.from(new Set(ndt.map((r) => r.testEquipmentId).filter((x): x is string => !!x))),
    };
  }

  async function handleSaveDraft() {
    if (!equipmentId || !templateId) {
      toast.error("Pick equipment and template first");
      return;
    }
    await saveDraft(buildDraft());
    toast.success("Draft saved");
  }

  async function handleIssue() {
    if (!selectedEquipment || !selectedTemplate) return;
    setIssuing(true);
    const cert = await issue({
      draft: buildDraft(),
      equipmentTag: selectedEquipment.tag,
      equipmentName: selectedEquipment.name,
      equipmentCategory: selectedEquipment.equipmentCategory ?? selectedTemplate.equipmentCategory ?? "generic",
      spec: selectedEquipment.spec,
      templateName: selectedTemplate.name,
      standardIds: selectedTemplate.standardIds ?? [],
      result,
      answers,
      checklist,
      ndt,
      defects,
      testEquipmentIds: Array.from(new Set(ndt.map((r) => r.testEquipmentId).filter((x): x is string => !!x))),
      validForDays,
    });
    if (!cert) {
      setIssuing(false);
      toast.error("Could not issue certificate");
      return;
    }
    await updateAfterInspection(selectedEquipment.id, validForDays);
    setIssuing(false);
    toast.success(`Issued ${cert.id}`);
    void navigate({ to: "/app/certificates" });
  }

  const active = STEP_META[step];
  const ActiveIcon = active.icon;

  // Per-step completion for the rail
  const completed = [
    !!equipmentId,
    !!templateId,
    !!selectedTemplate && requiredMissing === 0,
    checklist.length > 0 && checklistOutstanding === 0,
    ndtMissing.length === 0 && ndtInvalid === 0,
    true, // defects are optional
    false, // review is terminal
  ];

  const validationBanner: string | null =
    step === 2 && requiredMissing > 0
      ? `${requiredMissing} required field(s) still missing`
      : step === 3 && checklistOutstanding > 0
        ? `${checklistOutstanding} clause(s) not verdicted`
        : step === 4 && ndtMissing.length > 0
          ? `Missing NDT: ${ndtMissing.map((m) => NDT_METHOD_LABEL[m]).join(", ")}`
          : step === 4 && ndtInvalid > 0
            ? `${ndtInvalid} NDT record(s) incomplete`
            : null;

  return (
    <div className="mx-auto flex h-full max-w-[1400px] flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-[color:var(--brand-accent)]">
            {t("wizard.activeProtocol")}
          </div>
          <h1 className="mt-2 font-display text-4xl font-light italic tracking-tight text-white">
            {t("wizard.title")}
          </h1>
          <p className="mt-2 text-sm text-white/50">
            {t("wizard.subtitle")}
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2 border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06] hover:text-white"
          onClick={handleSaveDraft}
        >
          <Save className="h-4 w-4" />
          {t("wizard.saveDraft")}
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px,1fr]">
        {/* Persistent left rail */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
            <div className="mb-4 flex items-baseline justify-between px-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
                {t("wizard.protocol")}
              </span>
              <span className="font-mono text-[10px] text-white/40">
                {String(step + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
              </span>
            </div>
            <ol className="relative space-y-1">
              {STEP_META.map((s, i) => {
                const Icon = s.icon;
                const isActive = i === step;
                const isDone = completed[i] && i < step;
                const isReachable = i <= step || completed.slice(0, i).every(Boolean);
                return (
                  <li key={s.label}>
                    <button
                      type="button"
                      disabled={!isReachable}
                      onClick={() => isReachable && setStep(i)}
                      className={cn(
                        "group relative flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all",
                        isActive
                          ? "border-[color:var(--brand-accent)]/40 bg-[color:var(--brand-accent)]/[0.08]"
                          : isDone
                            ? "border-white/8 bg-white/[0.02] hover:bg-white/[0.04]"
                            : "border-transparent text-white/40 hover:bg-white/[0.02] disabled:cursor-not-allowed disabled:opacity-40",
                      )}
                    >
                      {isActive && (
                        <m.span
                          layoutId="wizard-rail-active"
                          className="absolute left-0 top-1/2 h-8 w-[2px] -translate-y-1/2 rounded-full"
                          style={{
                            backgroundColor: "var(--brand-accent)",
                            boxShadow: "0 0 10px var(--brand-accent)",
                          }}
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <div
                        className={cn(
                          "grid h-8 w-8 shrink-0 place-items-center rounded-lg border font-mono text-[11px] transition-colors",
                          isDone
                            ? "border-[color:var(--brand-accent)]/50 bg-[color:var(--brand-accent)] text-[oklch(0.13_0.04_260)]"
                            : isActive
                              ? "border-[color:var(--brand-accent)]/60 bg-[color:var(--brand-accent)]/10 text-[color:var(--brand-accent)]"
                              : "border-white/10 bg-white/[0.02] text-white/40",
                        )}
                      >
                        {isDone ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className={cn(
                            "text-[11px] font-bold uppercase tracking-[0.18em]",
                            isActive
                              ? "text-[color:var(--brand-accent)]"
                              : isDone
                                ? "text-white/70"
                                : "text-white/35",
                          )}
                        >
                          {t("wizard.step." + s.label.toLowerCase()) || s.label}
                        </div>
                        <div className="mt-0.5 truncate text-[10px] text-white/35">
                          {t("wizard.step." + s.label.toLowerCase() + ".hint") || s.hint}
                        </div>
                      </div>
                      <Icon
                        className={cn(
                          "h-3.5 w-3.5 shrink-0",
                          isActive ? "text-[color:var(--brand-accent)]" : "text-white/25",
                        )}
                      />
                    </button>
                  </li>
                );
              })}
            </ol>

            <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/5">
              <m.div
                className="h-full rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, color-mix(in oklch, var(--brand-accent) 60%, transparent), var(--brand-accent))",
                }}
                initial={false}
                animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 26 }}
              />
            </div>
          </div>
        </aside>

        {/* Content column */}
        <div className="flex min-w-0 flex-col gap-4">
          {/* Big-number header */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md">
            <div className="pointer-events-none absolute -right-8 -top-10 font-display text-[9rem] leading-none text-white/[0.035]">
              {String(step + 1).padStart(2, "0")}
            </div>
            <div className="relative flex items-start gap-4">
              <div
                className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border"
                style={{
                  borderColor: "color-mix(in oklch, var(--brand-accent) 35%, transparent)",
                  background:
                    "linear-gradient(135deg, color-mix(in oklch, var(--brand-accent) 20%, transparent), transparent)",
                  boxShadow: "0 0 24px color-mix(in oklch, var(--brand-accent) 25%, transparent)",
                }}
              >
                <ActiveIcon className="h-6 w-6" style={{ color: "var(--brand-accent)" }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">
                  Step {step + 1} of {STEPS.length}
                </div>
                <h2 className="mt-1 font-display text-3xl font-semibold text-white">
                  {active.label}
                </h2>
                <p className="mt-1 text-sm text-white/55">{active.hint}</p>
              </div>
            </div>
          </div>

          {/* Step body */}
          <div className="relative min-h-[420px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-md">
            <AnimatePresence mode="wait">
              <m.div
                key={step}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
              >
                {step === 0 && (
                  <StepEquipment
                    items={equipmentActive}
                    loading={eqStatus === "loading"}
                    selectedId={equipmentId}
                    onSelect={setEquipmentId}
                  />
                )}
                {step === 1 && (
                  <StepTemplate
                    items={templatesPublished}
                    loading={tplStatus === "loading"}
                    selectedId={templateId}
                    onSelect={setTemplateId}
                  />
                )}
                {step === 2 && selectedTemplate && (
                  <StepInspect
                    template={selectedTemplate}
                    answers={answers}
                    onAnswer={(id, v) => setAnswers((a) => ({ ...a, [id]: v }))}
                    media={media}
                    photos={photos}
                    onTogglePhoto={(id) =>
                      setPhotos((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
                    }
                  />
                )}
                {step === 3 && (
                  <StepChecklist checklist={checklist} onChange={setChecklist} />
                )}
                {step === 4 && (
                  <StepNdt
                    ndt={ndt}
                    onChange={setNdt}
                    testEquipment={testEquipment}
                    inspectorName={user?.name ?? "Inspector"}
                    mandatoryMissing={ndtMissing}
                  />
                )}
                {step === 5 && (
                  <StepDefects defects={defects} onChange={setDefects} checklist={checklist} />
                )}
                {step === 6 && selectedEquipment && selectedTemplate && (
                  <StepReview
                    equipment={selectedEquipment}
                    templateName={selectedTemplate.name}
                    fieldCount={selectedTemplate.sections.reduce((n, s) => n + s.fields.length, 0)}
                    photoCount={photos.length}
                    inspectorName={user?.name ?? "Inspector"}
                    checklistCount={checklist.length}
                    checklistFails={checklistFails}
                    ndtCount={ndt.length}
                    defectCount={defects.length}
                    openDefects={defects.filter((d) => d.status === "open").length}
                    result={result}
                    onResult={setResult}
                    validForDays={validForDays}
                    onValidForDays={setValidForDays}
                  />
                )}
              </m.div>
            </AnimatePresence>
          </div>

          {/* Sticky footer */}
          <div className="sticky bottom-0 z-10 -mx-6 border-t border-white/10 bg-[color:var(--background,oklch(0.11_0.04_265))]/85 px-6 py-3 backdrop-blur-md">
            <div className="mx-auto flex max-w-full items-center justify-between gap-3">
              <Button
                variant="ghost"
                disabled={step === 0}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="gap-2 text-white/70 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("common.back")}
              </Button>

              <div className="hidden min-w-0 flex-1 text-center text-xs md:block">
                {validationBanner ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] text-amber-300">
                    <AlertTriangle className="h-3 w-3" />
                    {validationBanner}
                  </span>
                ) : (
                  <span className="text-white/40">
                    {t("wizard.step." + STEP_META[step].label.toLowerCase())} · {t("wizard.autosaved")}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden gap-2 text-white/60 hover:text-white md:inline-flex"
                  onClick={handleSaveDraft}
                >
                  <Save className="h-3.5 w-3.5" />
                  {t("wizard.saveDraft")}
                </Button>
                {step < STEPS.length - 1 ? (
                  <Button
                    disabled={!canNext}
                    onClick={() => setStep((s) => s + 1)}
                    className="gap-2 bg-gold text-black hover:bg-gold/90 disabled:opacity-40"
                  >
                    {t("common.next")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleIssue}
                    disabled={issuing}
                    className="gap-2 bg-gold text-black hover:bg-gold/90"
                  >
                    {issuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileBadge className="h-4 w-4" />}
                    {t("wizard.issue")}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}





/* -------------------------------------------------------------------------- */
/* Step 1 & 2: Equipment / Template (unchanged look)                          */
/* -------------------------------------------------------------------------- */

function StepEquipment({
  items,
  loading,
  selectedId,
  onSelect,
}: {
  items: Equipment[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = items.filter((e) =>
    [e.tag, e.name, e.site, e.category].join(" ").toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold">Pick the asset under inspection</h2>
        <p className="text-xs text-muted-foreground">Only active and quarantined assets are shown.</p>
      </div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="max-w-md" />
      {loading ? (
        <div className="grid h-48 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <m.button
              key={e.id}
              type="button"
              whileHover={{ y: -2 }}
              onClick={() => onSelect(e.id)}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors",
                selectedId === e.id
                  ? "border-gold bg-gold/10 ring-2 ring-gold/40"
                  : "border-border/60 bg-background/40 hover:border-gold/50",
              )}
            >
              <div className="flex items-center gap-2 text-gold">
                <HardHat className="h-4 w-4" />
                <span className="font-mono text-[11px] uppercase tracking-wide">{e.tag}</span>
              </div>
              <p className="mt-2 font-medium">{e.name}</p>
              <p className="text-xs text-muted-foreground">{e.site} · {e.category}</p>
            </m.button>
          ))}
        </div>
      )}
    </div>
  );
}

function StepTemplate({
  items,
  loading,
  selectedId,
  onSelect,
}: {
  items: ReturnType<typeof useTemplatesStore.getState>["templates"];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold">Choose an inspection template</h2>
        <p className="text-xs text-muted-foreground">
          Templates define the sections, standards, checklist bank and mandatory NDT methods.
        </p>
      </div>
      {loading ? (
        <div className="grid h-48 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((t) => (
            <m.button
              key={t.id}
              type="button"
              whileHover={{ y: -2 }}
              onClick={() => onSelect(t.id)}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors",
                selectedId === t.id
                  ? "border-gold bg-gold/10 ring-2 ring-gold/40"
                  : "border-border/60 bg-background/40 hover:border-gold/50",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gold">
                  <FileStack className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wide">{t.category}</span>
                </div>
                <span className="rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-[10px] capitalize">
                  v{t.version} · {t.status}
                </span>
              </div>
              <p className="mt-2 font-medium">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.description}</p>
              <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                {(t.mandatoryNdtMethods ?? []).map((m) => (
                  <span key={m} className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-gold">
                    {m}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {t.sections.length} sections · {t.sections.reduce((n, s) => n + s.fields.length, 0)} fields · {(t.standardIds ?? []).length} standards
              </p>
            </m.button>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 3: Inspect (dynamic template fields)                                  */
/* -------------------------------------------------------------------------- */

function StepInspect({
  template,
  answers,
  onAnswer,
  media,
  photos,
  onTogglePhoto,
}: {
  template: NonNullable<ReturnType<typeof useTemplatesStore.getState>["draft"]>;
  answers: Record<string, InspectionFieldValue>;
  onAnswer: (fieldId: string, value: InspectionFieldValue) => void;
  media: ReturnType<typeof useMediaStore.getState>["assets"];
  photos: string[];
  onTogglePhoto: (id: string) => void;
}) {
  const images = media.filter((m) => m.kind === "image");
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold">Complete the inspection</h2>
        <p className="text-xs text-muted-foreground">Required fields are marked with an asterisk.</p>
      </div>
      <EnvironmentalPanel answers={answers} onAnswer={onAnswer} />
      {template.sections.map((section) => (
        <section key={section.id} className="rounded-xl border border-border/60 bg-background/40 p-4">
          <h3 className="font-display text-base font-semibold text-gold">{section.title}</h3>
          {section.description && (
            <p className="mt-1 text-xs text-muted-foreground">{section.description}</p>
          )}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {section.fields.map((f) => (
              <FieldInput key={f.id} field={f} value={answers[f.id]} onChange={(v) => onAnswer(f.id, v)} />
            ))}
          </div>
        </section>
      ))}
      <section className="rounded-xl border border-border/60 bg-background/40 p-4">
        <div className="flex items-center gap-2 text-gold">
          <ImageIcon className="h-4 w-4" />
          <h3 className="font-display text-base font-semibold">Attach photographs</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Pick from the shared media library.</p>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {images.map((m) => {
            const on = photos.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onTogglePhoto(m.id)}
                className={cn(
                  "overflow-hidden rounded-lg border-2 transition-all",
                  on ? "border-gold ring-2 ring-gold/40" : "border-transparent opacity-70 hover:opacity-100",
                )}
              >
                <img src={m.dataUrl} alt={m.name} className="aspect-square w-full object-cover" />
              </button>
            );
          })}
          {images.length === 0 && (
            <p className="col-span-full text-xs text-muted-foreground">
              No images in library yet. Upload some in Media Library.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function EnvironmentalPanel({
  answers,
  onAnswer,
}: {
  answers: Record<string, InspectionFieldValue>;
  onAnswer: (fieldId: string, value: InspectionFieldValue) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<string | null>(
    typeof answers["env.observed_at"] === "string" ? (answers["env.observed_at"] as string) : null,
  );
  const online = typeof navigator === "undefined" ? true : navigator.onLine;

  const get = (k: string) => (typeof answers[k] === "string" || typeof answers[k] === "number" ? String(answers[k]) : "");

  async function autoFetch() {
    setLoading(true);
    const site = get("env.site_location") || get("client.site") || "";
    const res = await fetchWeatherData(site);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error.message);
      return;
    }
    const w = res.data;
    onAnswer("env.site_location", w.location);
    onAnswer("env.temperature_c", w.temperatureC);
    onAnswer("env.wind_speed_kph", w.windSpeedKph);
    onAnswer("env.humidity_pct", w.humidityPct);
    onAnswer("env.conditions", w.conditions);
    onAnswer("env.observed_at", w.observedAt);
    setFetchedAt(w.observedAt);
    toast.success(`Weather synced · ${w.conditions} · ${w.temperatureC}°C`);
  }

  return (
    <section className="rounded-xl border border-border/60 bg-background/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-gold">
            <CloudSun className="h-4 w-4" />
            <h3 className="font-display text-base font-semibold">Client &amp; environmental info</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Site conditions at the time of inspection. Use auto-fetch when online — cached to the draft.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={autoFetch}
            disabled={loading || !online}
            className="gap-2 border-gold/40 text-gold hover:bg-gold/10 hover:text-gold"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CloudSun className="h-3.5 w-3.5" />}
            {loading ? "Fetching…" : "Auto-fetch weather"}
          </Button>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {!online
              ? "Offline · manual entry"
              : fetchedAt
                ? `Synced ${new Date(fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "Powered by Weather API"}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <EnvField label="Client" value={get("client.name")} onChange={(v) => onAnswer("client.name", v)} placeholder="Client / operator" />
        <EnvField label="Site location" value={get("env.site_location")} onChange={(v) => onAnswer("env.site_location", v)} placeholder="City, facility, bay" />
        <EnvField label="Work order #" value={get("client.work_order")} onChange={(v) => onAnswer("client.work_order", v)} placeholder="WO-…" />
        <EnvField label="Temperature" unit="°C" type="number" value={get("env.temperature_c")} onChange={(v) => onAnswer("env.temperature_c", v === "" ? null : Number(v))} />
        <EnvField label="Wind speed" unit="km/h" type="number" value={get("env.wind_speed_kph")} onChange={(v) => onAnswer("env.wind_speed_kph", v === "" ? null : Number(v))} />
        <EnvField label="Humidity" unit="%" type="number" value={get("env.humidity_pct")} onChange={(v) => onAnswer("env.humidity_pct", v === "" ? null : Number(v))} />
        <div className="sm:col-span-2 lg:col-span-3">
          <EnvField label="Conditions" value={get("env.conditions")} onChange={(v) => onAnswer("env.conditions", v)} placeholder="Clear · overcast · dust · rain…" />
        </div>
      </div>
    </section>
  );
}

function EnvField({
  label,
  value,
  onChange,
  placeholder,
  unit,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  unit?: string;
  type?: "text" | "number";
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
        {unit && <span className="ml-1 normal-case">({unit})</span>}
      </Label>
      <Input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: TemplateField;
  value: InspectionFieldValue;
  onChange: (v: InspectionFieldValue) => void;
}) {
  const label = (
    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
      {field.label}
      {field.required && <span className="ml-1 text-gold">*</span>}
      {field.unit && <span className="ml-1 normal-case text-muted-foreground">({field.unit})</span>}
    </Label>
  );
  if (field.kind === "checkbox") {
    return (
      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 bg-background/60 p-3">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 accent-[color:oklch(0.76_0.14_78)]"
        />
        <span className="text-sm font-medium">
          {field.label}
          {field.required && <span className="ml-1 text-gold">*</span>}
        </span>
      </label>
    );
  }
  return (
    <div className="space-y-1.5">
      {label}
      {field.kind === "textarea" || field.kind === "signature" ? (
        <Textarea
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          rows={field.kind === "signature" ? 2 : 3}
          placeholder={field.kind === "signature" ? "Sign / type name" : field.placeholder}
        />
      ) : field.kind === "select" ? (
        <Select value={String(value ?? "")} onValueChange={(v) => onChange(v)}>
          <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : field.kind === "date" ? (
        <DatePicker
          value={typeof value === "string" ? value : ""}
          onChange={onChange}
        />
      ) : field.kind === "number" ? (
        <Input
          type="number"
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          placeholder={field.placeholder}
        />
      ) : (
        <Input
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 4: Checklist                                                          */
/* -------------------------------------------------------------------------- */

const VERDICT_STYLE: Record<Verdict, string> = {
  pass: "bg-emerald-500/15 text-emerald-500 border-emerald-500/40",
  fail: "bg-red-500/15 text-red-500 border-red-500/40",
  na: "bg-muted text-muted-foreground border-border/60",
};

function StepChecklist({
  checklist,
  onChange,
}: {
  checklist: ChecklistItem[];
  onChange: (list: ChecklistItem[]) => void;
}) {
  function patch(id: string, partial: Partial<ChecklistItem>) {
    onChange(checklist.map((c) => (c.id === id ? { ...c, ...partial } : c)));
  }
  const passN = checklist.filter((c) => c.verdict === "pass").length;
  const failN = checklist.filter((c) => c.verdict === "fail").length;
  const naN = checklist.filter((c) => c.verdict === "na").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Detailed checklist</h2>
          <p className="text-xs text-muted-foreground">
            Every clause of the applicable standard. Verdict each item pass, fail, or N-A.
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-500">Pass {passN}</span>
          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-red-500">Fail {failN}</span>
          <span className="rounded-full border border-border/60 bg-muted px-2 py-0.5 text-muted-foreground">N-A {naN}</span>
        </div>
      </div>

      {checklist.length === 0 ? (
        <div className="grid h-40 place-items-center rounded-xl border border-dashed border-border/60 bg-background/40 text-sm text-muted-foreground">
          This template has no checklist bank attached.
        </div>
      ) : (
        <div className="space-y-2">
          {checklist.map((item, i) => (
            <div
              key={item.id}
              className={cn(
                "rounded-xl border p-3 transition-colors",
                item.verdict === "fail"
                  ? "border-red-500/40 bg-red-500/5"
                  : item.verdict === "pass"
                    ? "border-emerald-500/30 bg-emerald-500/[0.04]"
                    : "border-border/60 bg-background/40",
              )}
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border/60 bg-background/60 font-mono text-[10px] text-muted-foreground">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.question}</p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-gold">
                    {item.clause}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {(["pass", "fail", "na"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => patch(item.id, { verdict: v })}
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase transition-all",
                        item.verdict === v
                          ? VERDICT_STYLE[v] + " ring-2 ring-current/20"
                          : "border-border/60 bg-background/40 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              {(item.verdict === "fail" || item.note) && (
                <Textarea
                  value={item.note}
                  onChange={(e) => patch(item.id, { note: e.target.value })}
                  placeholder={item.verdict === "fail" ? "Describe the failure (required for fail verdicts)" : "Add a note…"}
                  rows={2}
                  className="mt-2"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 5: NDT                                                                */
/* -------------------------------------------------------------------------- */

const NDT_METHODS: NdtMethod[] = [
  "VT", "MPI", "DPI", "UT", "PT", "RT",
  "LOAD_TEST", "HYDRO", "INSULATION", "TORQUE",
  "PULL_TEST", "BRAKE_TEST", "THICKNESS_UT",
];

function StepNdt({
  ndt,
  onChange,
  testEquipment,
  inspectorName,
  mandatoryMissing,
}: {
  ndt: NdtRecord[];
  onChange: (list: NdtRecord[]) => void;
  testEquipment: ReturnType<typeof useTestEquipmentStore.getState>["items"];
  inspectorName: string;
  mandatoryMissing: NdtMethod[];
}) {
  function add(method?: NdtMethod) {
    const rec = makeNdtRecord();
    if (method) rec.method = method;
    rec.technician = inspectorName;
    onChange([...ndt, rec]);
  }
  function patch(id: string, partial: Partial<NdtRecord>) {
    onChange(ndt.map((r) => (r.id === id ? { ...r, ...partial } : r)));
  }
  function remove(id: string) {
    onChange(ndt.filter((r) => r.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">NDT &amp; special tests</h2>
          <p className="text-xs text-muted-foreground">
            Every non-destructive test with technician, calibrated equipment, and acceptance criteria.
          </p>
        </div>
        <Button size="sm" onClick={() => add()} className="gap-1 bg-gold text-black hover:bg-gold/90">
          <Plus className="h-3.5 w-3.5" />
          Add test
        </Button>
      </div>

      {mandatoryMissing.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-orange-500/40 bg-orange-500/10 p-3 text-xs text-orange-500">
          <AlertTriangle className="h-4 w-4" />
          <span>Template requires: </span>
          {mandatoryMissing.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => add(m)}
              className="rounded-full border border-orange-500/50 bg-orange-500/20 px-2 py-0.5 text-[11px] font-semibold text-orange-500 hover:bg-orange-500/30"
            >
              + {NDT_METHOD_LABEL[m]}
            </button>
          ))}
        </div>
      )}

      {ndt.length === 0 ? (
        <div className="grid h-40 place-items-center rounded-xl border border-dashed border-border/60 bg-background/40 text-sm text-muted-foreground">
          No NDT records yet. Add at least the tests required by the template.
        </div>
      ) : (
        <div className="space-y-3">
          {ndt.map((r) => (
            <NdtRow
              key={r.id}
              record={r}
              onPatch={(p) => patch(r.id, p)}
              onRemove={() => remove(r.id)}
              testEquipment={testEquipment}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NdtRow({
  record,
  onPatch,
  onRemove,
  testEquipment,
}: {
  record: NdtRecord;
  onPatch: (partial: Partial<NdtRecord>) => void;
  onRemove: () => void;
  testEquipment: ReturnType<typeof useTestEquipmentStore.getState>["items"];
}) {
  const te = testEquipment.find((t) => t.id === record.testEquipmentId);
  const teOverdue = te && new Date(te.calibrationDueAt).getTime() < Date.now();
  const compatibleTe = testEquipment.filter((t) => t.methods.includes(record.method));
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-gold">
          <FlaskConical className="h-4 w-4" />
          <span className="font-mono text-[10px] uppercase tracking-wide">{record.id.slice(-6)}</span>
        </div>
        <Select value={record.method} onValueChange={(v) => onPatch({ method: v as NdtMethod, testEquipmentId: null })}>
          <SelectTrigger className="h-8 w-[220px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {NDT_METHODS.map((m) => (
              <SelectItem key={m} value={m}>{NDT_METHOD_LABEL[m]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-1">
          {(["pass", "fail", "na"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onPatch({ verdict: v })}
              className={cn(
                "rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase transition-all",
                record.verdict === v
                  ? VERDICT_STYLE[v] + " ring-2 ring-current/20"
                  : "border-border/60 bg-background/40 text-muted-foreground hover:text-foreground",
              )}
            >
              {v}
            </button>
          ))}
          <Button size="sm" variant="ghost" onClick={onRemove} className="ml-1 h-8 w-8 p-0 text-muted-foreground hover:text-red-500">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <FieldBlock label="Area / component under test *">
          <Input value={record.area} onChange={(e) => onPatch({ area: e.target.value })} placeholder="e.g. Hook shank, saddle radius" />
        </FieldBlock>
        <FieldBlock label="Report reference">
          <Input value={record.reportRef} onChange={(e) => onPatch({ reportRef: e.target.value })} placeholder="NDT-RPT-2026-091" />
        </FieldBlock>
        <FieldBlock label="Technician *">
          <Input value={record.technician} onChange={(e) => onPatch({ technician: e.target.value })} />
        </FieldBlock>
        <FieldBlock label="Technician cert / competency">
          <Input value={record.technicianCertRef} onChange={(e) => onPatch({ technicianCertRef: e.target.value })} placeholder="PCN Level II — MT-2201" />
        </FieldBlock>
        <FieldBlock label="Calibrated test equipment">
          <Select
            value={record.testEquipmentId ?? "__none__"}
            onValueChange={(v) => onPatch({ testEquipmentId: v === "__none__" ? null : v })}
          >
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select tool…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— None / not applicable —</SelectItem>
              {compatibleTe.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.tag} · {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {te && (
            <p className={cn("mt-1 text-[10px]", teOverdue ? "text-red-500" : "text-muted-foreground")}>
              <Wrench className="mr-1 inline h-3 w-3" />
              Cert {te.calibrationCertRef} · due <ClientOnlyDate date={te.calibrationDueAt} />
              {teOverdue && " · OVERDUE"}
            </p>
          )}
        </FieldBlock>
        <FieldBlock label="Performed on">
          <Input
            type="datetime-local"
            value={record.performedAt.slice(0, 16)}
            onChange={(e) => onPatch({ performedAt: new Date(e.target.value).toISOString() })}
          />
        </FieldBlock>
        <FieldBlock label="Acceptance criteria *" className="sm:col-span-2">
          <Textarea
            value={record.acceptanceCriteria}
            onChange={(e) => onPatch({ acceptanceCriteria: e.target.value })}
            rows={2}
            placeholder="e.g. ISO 3059 & EN ISO 23277 — no linear indications > 2 mm"
          />
        </FieldBlock>
        <FieldBlock label="Measured result *" className="sm:col-span-2">
          <Textarea
            value={record.measuredResult}
            onChange={(e) => onPatch({ measuredResult: e.target.value })}
            rows={2}
            placeholder="Describe what was observed / measured"
          />
        </FieldBlock>
        <FieldBlock label="Notes" className="sm:col-span-2">
          <Textarea
            value={record.notes}
            onChange={(e) => onPatch({ notes: e.target.value })}
            rows={2}
            placeholder="Environmental conditions, prior verification, retest details…"
          />
        </FieldBlock>
      </div>
    </div>
  );
}

function FieldBlock({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 6: Defects                                                            */
/* -------------------------------------------------------------------------- */

const SEVERITY_STYLE: Record<DefectSeverity, string> = {
  minor: "border-amber-500/40 bg-amber-500/10 text-amber-500",
  major: "border-orange-500/40 bg-orange-500/10 text-orange-500",
  critical: "border-red-500/40 bg-red-500/10 text-red-500",
};

function StepDefects({
  defects,
  onChange,
  checklist,
}: {
  defects: Defect[];
  onChange: (list: Defect[]) => void;
  checklist: ChecklistItem[];
}) {
  const failedClauses = checklist.filter((c) => c.verdict === "fail");

  function add() {
    onChange([...defects, makeDefect()]);
  }
  function patch(id: string, partial: Partial<Defect>) {
    onChange(defects.map((d) => (d.id === id ? { ...d, ...partial } : d)));
  }
  function remove(id: string) {
    onChange(defects.filter((d) => d.id !== id));
  }
  function importFromChecklist(item: ChecklistItem) {
    const base = makeDefect();
    base.description = `${item.clause} — ${item.question}`;
    base.location = "";
    base.remedialAction = item.note || "";
    base.severity = "major";
    onChange([...defects, base]);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Defects &amp; remedial actions</h2>
          <p className="text-xs text-muted-foreground">
            Every observed defect with severity, remedial action, and deadline. Failed checklist items can be imported.
          </p>
        </div>
        <Button size="sm" onClick={add} className="gap-1 bg-gold text-black hover:bg-gold/90">
          <Plus className="h-3.5 w-3.5" />
          Add defect
        </Button>
      </div>

      {failedClauses.length > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3">
          <p className="text-xs font-semibold text-red-500">
            {failedClauses.length} checklist item(s) failed — convert to defects:
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {failedClauses.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => importFromChecklist(c)}
                className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-[11px] text-red-500 hover:bg-red-500/20"
              >
                + {c.clause}
              </button>
            ))}
          </div>
        </div>
      )}

      {defects.length === 0 ? (
        <div className="grid h-40 place-items-center rounded-xl border border-dashed border-border/60 bg-background/40 text-sm text-muted-foreground">
          No defects recorded — a clean examination.
        </div>
      ) : (
        <div className="space-y-3">
          {defects.map((d) => (
            <div key={d.id} className="rounded-xl border border-border/60 bg-background/40 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 text-gold">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-mono text-[10px] uppercase tracking-wide">{d.id.slice(-6)}</span>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  {(["minor", "major", "critical"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => patch(d.id, { severity: s })}
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase transition-all",
                        d.severity === s
                          ? SEVERITY_STYLE[s] + " ring-2 ring-current/20"
                          : "border-border/60 bg-background/40 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                  <Button size="sm" variant="ghost" onClick={() => remove(d.id)} className="ml-1 h-8 w-8 p-0 text-muted-foreground hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <FieldBlock label="Description *" className="sm:col-span-2">
                  <Textarea value={d.description} onChange={(e) => patch(d.id, { description: e.target.value })} rows={2} placeholder="What is wrong?" />
                </FieldBlock>
                <FieldBlock label="Location">
                  <Input value={d.location} onChange={(e) => patch(d.id, { location: e.target.value })} placeholder="e.g. East end-carriage, outer face" />
                </FieldBlock>
                <FieldBlock label="Remedy deadline">
                  <DatePicker
                    value={d.deadline}
                    onChange={(val) => patch(d.id, { deadline: val })}
                  />
                </FieldBlock>
                <FieldBlock label="Remedial action *" className="sm:col-span-2">
                  <Textarea value={d.remedialAction} onChange={(e) => patch(d.id, { remedialAction: e.target.value })} rows={2} placeholder="What needs to be done?" />
                </FieldBlock>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 7: Review                                                             */
/* -------------------------------------------------------------------------- */

const RESULT_STYLES: Record<CertificateResult, string> = {
  pass: "border-emerald-500/40 bg-emerald-500/10 text-emerald-500",
  conditional: "border-orange-500/40 bg-orange-500/10 text-orange-500",
  fail: "border-red-500/40 bg-red-500/10 text-red-500",
};

function StepReview({
  equipment,
  templateName,
  fieldCount,
  photoCount,
  inspectorName,
  checklistCount,
  checklistFails,
  ndtCount,
  defectCount,
  openDefects,
  result,
  onResult,
  validForDays,
  onValidForDays,
}: {
  equipment: Equipment;
  templateName: string;
  fieldCount: number;
  photoCount: number;
  inspectorName: string;
  checklistCount: number;
  checklistFails: number;
  ndtCount: number;
  defectCount: number;
  openDefects: number;
  result: CertificateResult;
  onResult: (r: CertificateResult) => void;
  validForDays: number;
  onValidForDays: (d: number) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-semibold">Review &amp; issue</h2>
        <p className="text-xs text-muted-foreground">
          A dossier is a signed, tamper-evident record. Once issued it cannot be edited — only superseded.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Summary icon={<HardHat className="h-4 w-4" />} label="Asset" value={`${equipment.tag} · ${equipment.name}`} />
        <Summary icon={<FileStack className="h-4 w-4" />} label="Template" value={templateName} />
        <Summary icon={<ShieldCheck className="h-4 w-4" />} label="Inspector" value={inspectorName} />
        <Summary icon={<ClipboardCheck className="h-4 w-4" />} label="Checklist" value={`${checklistCount} items · ${checklistFails} fail`} />
        <Summary icon={<FlaskConical className="h-4 w-4" />} label="NDT records" value={`${ndtCount} tests`} />
        <Summary icon={<AlertTriangle className="h-4 w-4" />} label="Defects" value={`${defectCount} logged · ${openDefects} open`} />
        <Summary icon={<ImageIcon className="h-4 w-4" />} label="Photos" value={`${photoCount} attached`} />
        <Summary icon={<FileBadge className="h-4 w-4" />} label="Template fields" value={`${fieldCount}`} />
      </div>
      <div className="rounded-xl border border-border/60 bg-background/40 p-4">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Outcome</Label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(["pass", "conditional", "fail"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onResult(r)}
              className={cn(
                "rounded-lg border px-4 py-3 text-sm font-medium capitalize transition-all",
                result === r
                  ? cn(RESULT_STYLES[r], "ring-2 ring-current/30")
                  : "border-border/60 bg-background/40 text-muted-foreground hover:text-foreground",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-border/60 bg-background/40 p-4">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Valid for</Label>
        <div className="mt-2 flex items-center gap-3">
          <Input
            type="number"
            value={validForDays}
            onChange={(e) => onValidForDays(Math.max(1, Number(e.target.value) || 0))}
            className="w-32"
          />
          <span className="text-sm text-muted-foreground">days from today</span>
          <div className="ml-auto flex gap-1">
            {[30, 90, 180, 365].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onValidForDays(d)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  validForDays === d
                    ? "border-gold bg-gold/20 text-gold"
                    : "border-border/60 text-muted-foreground hover:text-foreground",
                )}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Summary({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <span className="text-gold">{icon}</span>
        {label}
      </div>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
