import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, m } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Award,
  Building2,
  Check,
  ImagePlus,
  Languages,
  Loader2,
  RotateCcw,
  Save,
  Sparkles,
  Stamp,
  Trash2,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SignaturePad } from "@/components/app/SignaturePad";
import { useBrandingStore } from "@/stores/branding";
import type { AccreditationLogo } from "@/types";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/bridge/media";
import { useT } from "@/hooks/use-t";


export const Route = createFileRoute("/app/branding")({
  head: () => ({
    meta: [
      { title: "Branding — CertiCore" },
      { name: "description", content: "Configure organization identity for certificates." },
    ],
  }),
  component: BrandingPage,
});

const COLOR_PRESETS: Array<{ label: string; primary: string; accent: string }> = [
  { label: "Navy Gold", primary: "oklch(0.20 0.055 260)", accent: "oklch(0.76 0.14 78)" },
  { label: "Forest Amber", primary: "oklch(0.28 0.065 155)", accent: "oklch(0.78 0.14 60)" },
  { label: "Slate Copper", primary: "oklch(0.28 0.02 260)", accent: "oklch(0.68 0.14 45)" },
  { label: "Ink Emerald", primary: "oklch(0.18 0.01 260)", accent: "oklch(0.65 0.14 155)" },
  { label: "Crimson Ink", primary: "oklch(0.30 0.09 25)", accent: "oklch(0.65 0.17 30)" },
];

function BrandingPage() {
  const branding = useBrandingStore((s) => s.branding);
  const status = useBrandingStore((s) => s.status);
  const dirty = useBrandingStore((s) => s.dirty);
  const hydrate = useBrandingStore((s) => s.hydrate);
  const patch = useBrandingStore((s) => s.patch);
  const save = useBrandingStore((s) => s.save);
  const reset = useBrandingStore((s) => s.reset);
  const uploadLogo = useBrandingStore((s) => s.uploadLogo);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const t = useT();

  useEffect(() => {
    if (status === "idle") void hydrate();
  }, [status, hydrate]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const url = await uploadLogo(file);
    if (url) toast.success(t("branding.logo.updated"));
    else toast.error(t("branding.logo.error"));
  }

  async function onSave() {
    const ok = await save();
    if (ok) toast.success(t("branding.saved"));
    else toast.error(t("branding.save.failed"));
  }

  async function onReset() {
    await reset();
    toast.message(t("branding.reset.success"));
  }

  const saving = status === "saving";

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Header */}
      <m.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mb-8 flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-gold">{t("templates.roleTag")}</div>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight">{t("branding.title")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {t("branding.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AnimatePresence>
            {dirty && (
              <m.span
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-500"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {t("branding.unsaved")}
              </m.span>
            )}
          </AnimatePresence>
          <Button variant="ghost" size="sm" onClick={onReset} className="gap-2">
            <RotateCcw className="h-3.5 w-3.5" />
            {t("branding.reset")}
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={!dirty || saving}
            className="gap-2 bg-navy text-navy-foreground hover:bg-navy/90"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {t("branding.saveBtn")}
          </Button>
        </div>
      </m.div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* ============ Editor ============ */}
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.35 }}
          className="space-y-6"
        >
          {/* Logo */}
          <section className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold">{t("branding.logo")}</h2>
                <p className="text-xs text-muted-foreground">{t("branding.logo.hint")}</p>
              </div>
              {branding.logoDataUrl && (
                <button
                  type="button"
                  onClick={() => patch({ logoDataUrl: null })}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" /> {t("branding.logo.remove")}
                </button>
              )}
            </div>

            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                void handleFile(e.dataTransfer.files?.[0]);
              }}
              className={cn(
                "group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors",
                dragOver
                  ? "border-gold bg-gold/5"
                  : "border-border bg-background/50 hover:border-gold/50",
              )}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  void handleFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <AnimatePresence mode="wait">
                {branding.logoDataUrl ? (
                  <m.div
                    key="preview"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-md bg-paper p-2 ring-1 ring-paper-border">
                      <img
                        src={branding.logoDataUrl}
                        alt="Organization logo"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {t("branding.logo.replace")}
                    </span>
                  </m.div>
                ) : (
                  <m.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-2 text-center"
                  >
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-navy/10 text-gold group-hover:bg-navy/20">
                      <ImagePlus className="h-5 w-5" />
                    </div>
                    <div className="text-sm font-medium">{t("branding.logo.drop")}</div>
                    <div className="text-xs text-muted-foreground">
                      {t("common.or") || "or"} <span className="text-gold">{t("branding.logo.clickDrop")}</span>
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </label>
          </section>

          {/* Organization */}
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 font-display text-lg font-semibold">{t("branding.org")}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t("branding.org.name")} className="sm:col-span-2">
                <Input
                  value={branding.organizationName}
                  onChange={(e) => patch({ organizationName: e.target.value })}
                  placeholder="Company Ltd."
                />
              </Field>
              <Field label={t("branding.org.reg")}>
                <Input
                  value={branding.registrationNo}
                  onChange={(e) => patch({ registrationNo: e.target.value })}
                  placeholder="REG-…"
                />
              </Field>
              <Field label={t("branding.org.phone")}>
                <Input
                  value={branding.phone}
                  onChange={(e) => patch({ phone: e.target.value })}
                  placeholder="+…"
                />
              </Field>
              <Field label={t("branding.org.email")}>
                <Input
                  type="email"
                  value={branding.email}
                  onChange={(e) => patch({ email: e.target.value })}
                  placeholder="hello@…"
                />
              </Field>
              <Field label={t("branding.org.web")}>
                <Input
                  value={branding.website}
                  onChange={(e) => patch({ website: e.target.value })}
                  placeholder="example.com"
                />
              </Field>
              <Field label={t("branding.org.address1")} className="sm:col-span-2">
                <Input
                  value={branding.addressLine1}
                  onChange={(e) => patch({ addressLine1: e.target.value })}
                />
              </Field>
              <Field label={t("branding.org.address2")} className="sm:col-span-2">
                <Input
                  value={branding.addressLine2}
                  onChange={(e) => patch({ addressLine2: e.target.value })}
                />
              </Field>
            </div>
          </section>

          {/* Colors */}
          <section className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-gold" />
              <h2 className="font-display text-lg font-semibold">{t("branding.colors")}</h2>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              {COLOR_PRESETS.map((p) => {
                const active =
                  p.primary === branding.primaryColor && p.accent === branding.accentColor;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => patch({ primaryColor: p.primary, accentColor: p.accent })}
                    className={cn(
                      "group flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
                      active
                        ? "border-gold bg-gold/10 text-foreground"
                        : "border-border bg-background/60 text-muted-foreground hover:border-gold/50",
                    )}
                  >
                    <span className="flex -space-x-1">
                      <span
                        className="h-3.5 w-3.5 rounded-full ring-1 ring-border"
                        style={{ background: p.primary }}
                      />
                      <span
                        className="h-3.5 w-3.5 rounded-full ring-1 ring-border"
                        style={{ background: p.accent }}
                      />
                    </span>
                    {p.label}
                    {active && <Check className="h-3 w-3 text-gold" />}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ColorField
                label={t("branding.colors.primary")}
                value={branding.primaryColor}
                onChange={(v) => patch({ primaryColor: v })}
              />
              <ColorField
                label={t("branding.colors.accent")}
                value={branding.accentColor}
                onChange={(v) => patch({ accentColor: v })}
              />
            </div>
          </section>

          {/* Accreditations */}
          <section className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <Award className="h-4 w-4 text-gold" />
              <h2 className="font-display text-lg font-semibold">{t("branding.accreditations")}</h2>
            </div>
            <Field label={t("branding.accreditations")}>
              <Input
                value={branding.accreditations ?? ""}
                onChange={(e) => patch({ accreditations: e.target.value })}
                placeholder="UKAS · SASO · ISO/IEC 17020"
              />
            </Field>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {t("branding.accreditations.desc")}
            </p>

            <div className="mt-5 border-t border-border pt-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t("branding.accreditations.logos")}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("branding.accreditations.logosDesc")}
                  </p>
                </div>
                <span className="rounded-full border border-border bg-background/60 px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                  {(branding.accreditationLogos ?? []).length} {t("branding.accreditations.added")}
                </span>
              </div>
              <AccreditationLogosField
                value={branding.accreditationLogos ?? []}
                onChange={(next) => patch({ accreditationLogos: next })}
              />
            </div>
          </section>


          {/* Manager identity */}
          <section className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-gold" />
              <h2 className="font-display text-lg font-semibold">{t("branding.signatory")}</h2>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              {t("branding.signatory.desc")}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("branding.signatory.name")}>
                <Input
                  value={branding.managerName}
                  onChange={(e) => patch({ managerName: e.target.value })}
                  placeholder="Dr. Faisal Al-Mansour"
                />
              </Field>
              <Field label={t("branding.signatory.title")}>
                <Input
                  value={branding.managerTitle}
                  onChange={(e) => patch({ managerTitle: e.target.value })}
                  placeholder="Technical Manager · Competent Person"
                />
              </Field>
            </div>
            <div className="mt-4">
              <SignaturePad
                value={branding.managerSignatureDataUrl}
                onChange={(v) => patch({ managerSignatureDataUrl: v })}
                label={t("branding.signatory")}
                hint="Draw with mouse/pen or upload a transparent PNG"
              />
            </div>
          </section>

          {/* Company stamp */}
          <section className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <Stamp className="h-4 w-4 text-gold" />
              <h2 className="font-display text-lg font-semibold">{t("branding.stamp")}</h2>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              {t("branding.stamp.desc")}
            </p>
            <StampUpload
              value={branding.stampDataUrl}
              onChange={(v) => patch({ stampDataUrl: v })}
            />
          </section>

          {/* Footer */}
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 font-display text-lg font-semibold">{t("branding.footer")}</h2>
            <Textarea
              value={branding.footerText}
              onChange={(e) => patch({ footerText: e.target.value })}
              rows={3}
              placeholder={t("branding.footer.hint")}
            />
            <div className="mt-2 text-[11px] text-muted-foreground">
              {branding.footerText.length} {t("common.chars") || "chars"}
            </div>

            <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
              <Languages className="h-4 w-4 text-gold" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t("branding.arabic")}
              </span>
            </div>
            <div className="mt-3 grid gap-3">
              <Field label={t("branding.org.name") + " (AR)"}>
                <Input
                  dir="rtl"
                  value={branding.organizationNameAr ?? ""}
                  onChange={(e) => patch({ organizationNameAr: e.target.value })}
                  placeholder="اسم المنظمة"
                />
              </Field>
              <Field label={t("branding.footer") + " (AR)"}>
                <Textarea
                  dir="rtl"
                  rows={3}
                  value={branding.footerTextAr ?? ""}
                  onChange={(e) => patch({ footerTextAr: e.target.value })}
                  placeholder="النص القانوني المطبوع أسفل كل شهادة"
                />
              </Field>
            </div>
          </section>

          {/* Security */}
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 font-display text-lg font-semibold">{t("branding.security")}</h2>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={branding.watermarkEnabled !== false}
                onChange={(e) => patch({ watermarkEnabled: e.target.checked })}
                className="h-4 w-4 accent-[color:oklch(0.76_0.14_78)]"
              />
              <div>
                <p className="text-sm font-medium">{t("branding.watermark")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("branding.watermark.desc")}
                </p>
              </div>
            </label>
          </section>
        </m.div>


        {/* ============ Live Preview ============ */}
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="lg:sticky lg:top-6 lg:self-start"
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold">{t("branding.preview")}</h2>
              <p className="text-xs text-muted-foreground">
                {t("branding.preview.desc")}
              </p>
            </div>
            <span className="rounded-full border border-border bg-background/60 px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
              ~210 × 297 mm
            </span>
          </div>

          <CertificatePreview />
        </m.div>
      </div>
    </div>
  );
}

/* ============ Sub-components ============ */

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  // Convert oklch → hex-ish for native color picker fallback. We keep the
  // authoritative value as the raw string (oklch or hex).
  const [hexFallback, setHexFallback] = useState<string>("#1a2a4a");
  useEffect(() => {
    // Best-effort: sample the color via canvas
    if (typeof document === "undefined") return;
    const el = document.createElement("div");
    el.style.color = value;
    document.body.appendChild(el);
    const computed = getComputedStyle(el).color;
    document.body.removeChild(el);
    const m = computed.match(/\d+/g);
    if (m && m.length >= 3) {
      const [r, g, b] = m.map(Number);
      setHexFallback(
        "#" +
          [r, g, b]
            .map((n) => n.toString(16).padStart(2, "0"))
            .join(""),
      );
    }
  }, [value]);

  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <div className="relative">
          <div
            className="h-10 w-14 rounded-md ring-1 ring-border"
            style={{ background: value }}
          />
          <input
            type="color"
            value={hexFallback}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label={`${label} color picker`}
          />
        </div>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-xs"
          placeholder="oklch(...) or #hex"
        />
      </div>
    </div>
  );
}

function CertificatePreview() {
  const branding = useBrandingStore((s) => s.branding);
  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <m.div
      layout
      className="relative mx-auto aspect-[210/297] w-full max-w-[520px] overflow-hidden rounded-md bg-paper text-[oklch(0.15_0.02_260)] shadow-2xl ring-1 ring-paper-border"
    >
      {/* Colored top band */}
      <div
        className="relative h-16 w-full"
        style={{ background: branding.primaryColor }}
      >
        <div
          className="absolute inset-x-0 bottom-0 h-1"
          style={{ background: branding.accentColor }}
        />
      </div>

      {/* Header */}
      <div className="flex items-start gap-4 px-6 pt-5">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-sm bg-white ring-1 ring-paper-border">
          {branding.logoDataUrl ? (
            <img
              src={branding.logoDataUrl}
              alt=""
              className="max-h-full max-w-full object-contain p-1"
            />
          ) : (
            <Building2
              className="h-7 w-7"
              style={{ color: branding.primaryColor }}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div
            className="font-display text-[18px] font-bold leading-tight"
            style={{ color: branding.primaryColor }}
          >
            {branding.organizationName || "Organization Name"}
          </div>
          <div className="mt-0.5 text-[9px] leading-snug text-neutral-600">
            {branding.addressLine1}
            {branding.addressLine2 && ` · ${branding.addressLine2}`}
          </div>
          <div className="mt-0.5 text-[9px] leading-snug text-neutral-600">
            {branding.phone} · {branding.email} · {branding.website}
          </div>
        </div>
        <div className="text-right">
          <div
            className="text-[9px] font-semibold uppercase tracking-widest"
            style={{ color: branding.accentColor }}
          >
            Reg No.
          </div>
          <div className="font-mono text-[10px]">{branding.registrationNo}</div>
        </div>
      </div>

      {/* Title */}
      <div className="mt-5 px-6 text-center">
        <div
          className="text-[8px] font-semibold uppercase tracking-[0.35em]"
          style={{ color: branding.accentColor }}
        >
          Certificate of Inspection
        </div>
        <h3
          className="mt-1 font-display text-2xl font-bold tracking-tight"
          style={{ color: branding.primaryColor }}
        >
          Load Test & Thorough Examination
        </h3>
        <div className="mx-auto mt-1.5 h-0.5 w-16" style={{ background: branding.accentColor }} />
      </div>

      {/* Body sample */}
      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2 px-6 text-[9px]">
        {[
          ["Cert No.", "WC-2026-0148"],
          ["Issued", today],
          ["Client", "Al-Sadiq Contracting"],
          ["Location", "Site 14 · Yard B"],
          ["Equipment", "50T Mobile Crane"],
          ["Serial", "MC-2019-3382"],
        ].map(([k, v]) => (
          <div key={k} className="flex gap-1.5">
            <span className="font-semibold text-neutral-500 uppercase tracking-wider">
              {k}:
            </span>
            <span className="truncate">{v}</span>
          </div>
        ))}
      </div>

      {/* Inspected badge */}
      <div className="mt-6 flex justify-center px-6">
        <div
          className="rounded-md px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white"
          style={{ background: branding.accentColor }}
        >
          ✓ Inspected — Safe to Operate
        </div>
      </div>

      {/* Footer */}
      <div
        className="absolute inset-x-0 bottom-0 border-t px-6 py-3 text-[7.5px] leading-snug"
        style={{
          borderColor: branding.accentColor,
          color: "oklch(0.35 0.01 260)",
        }}
      >
        {branding.footerText}
      </div>

      {branding.stampDataUrl && (
        <img
          src={branding.stampDataUrl}
          alt=""
          className="pointer-events-none absolute bottom-16 right-6 h-20 w-20 object-contain"
          style={{ transform: "rotate(-6deg)", opacity: 0.9 }}
        />
      )}

      {branding.managerSignatureDataUrl && (
        <img
          src={branding.managerSignatureDataUrl}
          alt=""
          className="pointer-events-none absolute bottom-16 left-6 h-14 w-auto object-contain"
        />
      )}
    </m.div>
  );
}

function StampUpload({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const t = useT();

  async function handleFile(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Stamp must be an image");
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      toast.error("Stamp must be under 2 MB");
      return;
    }

    let compressed = f;
    try {
      compressed = await compressImage(f, 400, 400, 0.85);
    } catch (e) {
      console.warn("Failed to compress stamp image:", e);
    }

    const dataUrl = await new Promise<string>((res) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as string);
      reader.readAsDataURL(compressed);
    });

    onChange(dataUrl);
  }

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        void handleFile(e.dataTransfer.files?.[0]);
      }}
      className={cn(
        "flex cursor-pointer items-center gap-4 rounded-lg border-2 border-dashed p-4 transition-colors",
        dragOver ? "border-gold bg-gold/5" : "border-border bg-background/50 hover:border-gold/50",
      )}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/svg+xml,image/jpeg"
        className="sr-only"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-white ring-1 ring-border">
        {value ? (
          <img src={value} alt="Stamp" className="h-full w-full object-contain p-1" />
        ) : (
          <Stamp className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {value ? t("branding.stamp.replace") : t("branding.stamp.upload")}
        </p>
        <p className="text-xs text-muted-foreground">{t("branding.stamp.desc")}</p>
      </div>
      {value && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onChange(null);
          }}
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" /> {t("branding.logo.remove")}
        </button>
      )}
    </label>
  );
}

function AccreditationLogosField({
  value,
  onChange,
}: {
  value: AccreditationLogo[];
  onChange: (next: AccreditationLogo[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const t = useT();

  async function readFile(file: File): Promise<AccreditationLogo | null> {
    if (!file.type.startsWith("image/")) {
      toast.error(`${file.name}: must be an image`);
      return null;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error(`${file.name}: must be under 2 MB`);
      return null;
    }

    let compressed = file;
    try {
      compressed = await compressImage(file, 400, 400, 0.85);
    } catch (e) {
      console.warn("Failed to compress accreditation logo:", e);
    }

    const dataUrl = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = () => rej(r.error);
      r.readAsDataURL(compressed);
    });

    const name = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").trim() || "Accreditation";
    return { id: crypto.randomUUID(), name, dataUrl };
  }

  async function handleFiles(files: FileList | null | undefined) {
    if (!files || files.length === 0) return;
    const added: AccreditationLogo[] = [];
    for (const f of Array.from(files)) {
      // eslint-disable-next-line no-await-in-loop
      const item = await readFile(f);
      if (item) added.push(item);
    }
    if (added.length) {
      onChange([...value, ...added]);
      toast.success(t("branding.accreditations.addedSuccess", { count: String(added.length) }).replace("{count}", String(added.length)));
    }
  }

  function remove(id: string) {
    onChange(value.filter((v) => v.id !== id));
  }

  function rename(id: string, name: string) {
    onChange(value.map((v) => (v.id === id ? { ...v, name } : v)));
  }

  return (
    <div className="space-y-3">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-4 transition-colors",
          dragOver ? "border-gold bg-gold/5" : "border-border bg-background/50 hover:border-gold/50",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-navy/10 text-gold">
          <ImagePlus className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{t("branding.accreditations.drop")}</p>
          <p className="text-[11px] text-muted-foreground">{t("branding.accreditations.dropHint")}</p>
        </div>
      </label>

      {value.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {value.map((logo) => (
            <li
              key={logo.id}
              className="group relative flex flex-col items-center gap-2 rounded-lg border border-border bg-background/40 p-3"
            >
              <button
                type="button"
                onClick={() => remove(logo.id)}
                className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-background/80 text-muted-foreground opacity-0 ring-1 ring-border transition-opacity hover:text-destructive group-hover:opacity-100"
                aria-label={t("branding.logo.remove")}
              >
                <Trash2 className="h-3 w-3" />
              </button>
              <div className="grid h-14 w-full place-items-center overflow-hidden rounded bg-white p-1 ring-1 ring-border">
                <img src={logo.dataUrl} alt={logo.name} className="max-h-full max-w-full object-contain" />
              </div>
              <input
                value={logo.name}
                onChange={(e) => rename(logo.id, e.target.value)}
                className="w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 text-center text-[11px] font-medium hover:border-border focus:border-gold focus:outline-none"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


