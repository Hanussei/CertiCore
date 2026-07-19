import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, m } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  CheckSquare,
  Copy,
  FileSignature,
  FileText,
  Hash,
  Layers,
  List,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  Type,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTemplatesStore } from "@/stores/templates";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/use-t";

import type { TemplateFieldKind, TemplateStatus } from "@/types";

export const Route = createFileRoute("/app/templates")({
  head: () => ({
    meta: [
      { title: "Templates — CertiCore" },
      { name: "description", content: "Design and manage certificate templates." },
    ],
  }),
  component: TemplatesPage,
});

const KIND_META: Record<TemplateFieldKind, { label: string; icon: typeof Type }> = {
  text: { label: "Text", icon: Type },
  number: { label: "Number", icon: Hash },
  date: { label: "Date", icon: Calendar },
  select: { label: "Select", icon: List },
  checkbox: { label: "Checkbox", icon: CheckSquare },
  textarea: { label: "Long text", icon: FileText },
  signature: { label: "Signature", icon: FileSignature },
};

const STATUS_STYLES: Record<TemplateStatus, string> = {
  draft: "border-amber-500/30 bg-amber-500/10 text-amber-500",
  published: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
  archived: "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
};

function TemplatesPage() {
  const t = useT();

  const {
    templates,
    status,
    selectedId,
    draft,
    dirty,
    hydrate,
    select,
    createNew,
    patchDraft,
    addSection,
    updateSection,
    removeSection,
    moveSection,
    addField,
    updateField,
    removeField,
    moveField,
    save,
    discard,
    remove,
    duplicate,
  } = useTemplatesStore();

  const [query, setQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (status === "idle") void hydrate();
  }, [status, hydrate]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q),
    );
  }, [templates, query]);

  const totalFields = draft?.sections.reduce((n, s) => n + s.fields.length, 0) ?? 0;
  const saving = status === "saving";

  async function onSave() {
    const ok = await save();
    if (ok) toast.success(t("templates.toast.saved"));
    else toast.error(t("common.saveFailed") || "Save failed");
  }

  async function onDelete(id: string) {
    await remove(id);
    setConfirmDelete(null);
    toast.message(t("templates.toast.deleted"));
  }

  async function onDuplicate(id: string) {
    await duplicate(id);
    toast.success(t("templates.toast.duplicated"));
  }

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-8">
      {/* Header */}
      <m.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mb-6 flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-gold">{t("templates.roleTag")}</div>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight">{t("templates.title")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {t("templates.subtitle")}
          </p>

        </div>
        <Button onClick={createNew} size="sm" className="gap-2 bg-navy text-navy-foreground hover:bg-navy/90">
          <Plus className="h-4 w-4" />
          {t("templates.add")}
        </Button>
      </m.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* ============ List ============ */}
        <m.aside
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="lg:sticky lg:top-6 lg:self-start"
        >
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("templates.searchPlaceholder")}
                  className="h-8 pl-8 text-sm"
                />
              </div>
            </div>
            <div className="max-h-[70vh] divide-y divide-border overflow-y-auto">
              {filtered.length === 0 && (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  {t("templates.empty")}
                </div>
              )}
              {filtered.map((tItem) => (
                <button
                  key={tItem.id}
                  onClick={() => select(tItem.id)}
                  className={cn(
                    "block w-full px-3 py-2.5 text-left transition-colors",
                    tItem.id === selectedId
                      ? "bg-gold/5 ring-1 ring-inset ring-gold/40"
                      : "hover:bg-muted/40",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{tItem.name}</div>
                      <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {tItem.category} · v{tItem.version}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-wider",
                        STATUS_STYLES[tItem.status],
                      )}
                    >
                      {t("templates.status." + tItem.status)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </m.aside>

        {/* ============ Builder ============ */}
        <div>
          <AnimatePresence mode="wait">
            {draft ? (
              <m.div
                key={draft.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* Meta bar */}
                <div className="rounded-lg border border-border bg-card p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider",
                          STATUS_STYLES[draft.status],
                        )}
                      >
                        {t("templates.status." + draft.status)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {t("templates.builder.meta", {
                          version: String(draft.version),
                          sections: String(draft.sections.length),
                          fields: String(totalFields),
                        })}
                      </span>
                      <AnimatePresence>
                        {dirty && (
                          <m.span
                            initial={{ opacity: 0, x: 6 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 6 }}
                            className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-500"
                          >
                            <span className="h-1 w-1 rounded-full bg-amber-500" />
                            {t("templates.unsaved")}
                          </m.span>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDuplicate(draft.id)}
                        className="gap-1.5"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {t("common.duplicate")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDelete(draft.id)}
                        className="gap-1.5 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t("common.delete")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={discard}
                        disabled={!dirty}
                        className="gap-1.5"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {t("common.discard")}
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
                        {t("common.save")}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                    <Field label={t("templates.dialog.name")}>
                      <Input
                        value={draft.name}
                        onChange={(e) => patchDraft({ name: e.target.value })}
                      />
                    </Field>
                    <Field label={t("templates.dialog.category")}>
                      <Input
                        value={draft.category}
                        onChange={(e) => patchDraft({ category: e.target.value })}
                      />
                    </Field>
                    <Field label={t("templates.dialog.status")}>
                      <Select
                        value={draft.status}
                        onValueChange={(v) => patchDraft({ status: v as TemplateStatus })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">{t("templates.status.draft")}</SelectItem>
                          <SelectItem value="published">{t("templates.status.published")}</SelectItem>
                          <SelectItem value="archived">{t("templates.status.archived")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label={t("common.description")} className="sm:col-span-3">
                      <Textarea
                        value={draft.description}
                        onChange={(e) => patchDraft({ description: e.target.value })}
                        rows={2}
                        placeholder={t("templates.placeholder.desc")}
                      />
                    </Field>
                  </div>
                </div>

                {/* Sections */}
                <div className="space-y-4">
                  {draft.sections.map((section, sIdx) => (
                    <m.section
                      key={section.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-lg border border-border bg-card"
                    >
                      <header className="flex flex-wrap items-center gap-3 border-b border-border p-4">
                        <div className="grid h-8 w-8 place-items-center rounded-md bg-navy/10 text-gold">
                          <Layers className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-[220px]">
                          <Input
                            value={section.title}
                            onChange={(e) => updateSection(section.id, { title: e.target.value })}
                            className="h-9 border-0 bg-transparent px-1 font-display text-lg font-semibold shadow-none focus-visible:ring-1"
                            placeholder={t("templates.placeholder.secTitle")}
                          />
                          <Input
                            value={section.description ?? ""}
                            onChange={(e) =>
                              updateSection(section.id, { description: e.target.value })
                            }
                            className="mt-0.5 h-7 border-0 bg-transparent px-1 text-xs text-muted-foreground shadow-none focus-visible:ring-1"
                            placeholder={t("templates.placeholder.secDesc")}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <IconBtn
                            aria={t("templates.aria.moveUp") || "Move section up"}
                            onClick={() => moveSection(section.id, -1)}
                            disabled={sIdx === 0}
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </IconBtn>
                          <IconBtn
                            aria={t("templates.aria.moveDown") || "Move section down"}
                            onClick={() => moveSection(section.id, 1)}
                            disabled={sIdx === draft.sections.length - 1}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </IconBtn>
                          <IconBtn
                            aria={t("templates.aria.removeSec") || "Remove section"}
                            onClick={() => removeSection(section.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </IconBtn>
                        </div>
                      </header>

                      <div className="divide-y divide-border">
                        {section.fields.map((field, fIdx) => {
                          const Meta = KIND_META[field.kind];
                          const Icon = Meta.icon;
                          return (
                            <m.div
                              key={field.id}
                              layout
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-[auto_minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.4fr)_auto] sm:items-center"
                            >
                              <div className="grid h-8 w-8 place-items-center rounded-md border border-border bg-background text-muted-foreground">
                                <Icon className="h-3.5 w-3.5" />
                              </div>
                              <Input
                                value={field.label}
                                onChange={(e) =>
                                  updateField(section.id, field.id, { label: e.target.value })
                                }
                                placeholder={t("templates.placeholder.fieldLabel")}
                                className="h-9"
                              />
                              <Select
                                value={field.kind}
                                onValueChange={(v) =>
                                  updateField(section.id, field.id, {
                                    kind: v as TemplateFieldKind,
                                  })
                                }
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {(Object.keys(KIND_META) as TemplateFieldKind[]).map((k) => (
                                    <SelectItem key={k} value={k}>
                                      {KIND_META[k].label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {/* Kind-specific extras */}
                              <div className="min-w-0">
                                {field.kind === "select" ? (
                                  <Input
                                    value={(field.options ?? []).join(", ")}
                                    onChange={(e) =>
                                      updateField(section.id, field.id, {
                                        options: e.target.value
                                          .split(",")
                                          .map((o) => o.trim())
                                          .filter(Boolean),
                                      })
                                    }
                                    placeholder={t("templates.placeholder.options")}
                                    className="h-9"
                                  />
                                ) : field.kind === "number" ? (
                                  <Input
                                    value={field.unit ?? ""}
                                    onChange={(e) =>
                                      updateField(section.id, field.id, { unit: e.target.value })
                                    }
                                    placeholder={t("templates.placeholder.unit")}
                                    className="h-9"
                                  />
                                ) : field.kind === "checkbox" || field.kind === "signature" ? (
                                  <span className="text-[11px] text-muted-foreground">
                                    {t("templates.noExtraConfig")}
                                  </span>
                                ) : (
                                  <Input
                                    value={field.placeholder ?? ""}
                                    onChange={(e) =>
                                      updateField(section.id, field.id, {
                                        placeholder: e.target.value,
                                      })
                                    }
                                    placeholder={t("templates.placeholder.fieldPlaceholder")}
                                    className="h-9"
                                  />
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                  <Switch
                                    checked={field.required}
                                    onCheckedChange={(v) =>
                                      updateField(section.id, field.id, { required: v })
                                    }
                                  />
                                  {t("templates.req")}
                                </label>
                                <IconBtn
                                  aria={t("templates.aria.moveUp") || "Move field up"}
                                  onClick={() => moveField(section.id, field.id, -1)}
                                  disabled={fIdx === 0}
                                >
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </IconBtn>
                                <IconBtn
                                  aria={t("templates.aria.moveDown") || "Move field down"}
                                  onClick={() => moveField(section.id, field.id, 1)}
                                  disabled={fIdx === section.fields.length - 1}
                                >
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </IconBtn>
                                <IconBtn
                                  aria={t("templates.aria.removeSec") || "Remove field"}
                                  onClick={() => removeField(section.id, field.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </IconBtn>
                              </div>
                            </m.div>
                          );
                        })}
                        {section.fields.length === 0 && (
                          <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                            {t("templates.noFields")}
                          </div>
                        )}
                      </div>

                      <footer className="border-t border-border p-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addField(section.id)}
                          className="gap-1.5 text-gold hover:text-gold"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {t("templates.addField")}
                        </Button>
                      </footer>
                    </m.section>
                  ))}

                  <Button
                    variant="outline"
                    onClick={addSection}
                    className="w-full gap-2 border-dashed border-border/70 py-6 text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    {t("templates.addSection")}
                  </Button>
                </div>
              </m.div>
            ) : (
              <m.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid place-items-center rounded-lg border border-dashed border-border bg-card p-16 text-center"
              >
                <div>
                  <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-gold/10 text-gold">
                    <Layers className="h-5 w-5" />
                  </div>
                  <h2 className="font-display text-xl font-semibold">{t("templates.noneSelected")}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("templates.noneSelected.desc")}
                  </p>
                  <Button onClick={createNew} size="sm" className="mt-4 gap-2">
                    <Plus className="h-4 w-4" />
                    {t("templates.add")}
                  </Button>
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("templates.deleteConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("templates.deleteConfirm.desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && onDelete(confirmDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ============ helpers ============ */

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

function IconBtn({
  children,
  onClick,
  disabled,
  aria,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  aria: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={aria}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent",
        className,
      )}
    >
      {children}
    </button>
  );
}

// Silences unused import warning where Badge is not used but exported from ui set.
export type _ = typeof Badge;
