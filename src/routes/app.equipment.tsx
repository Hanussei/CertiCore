import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, m } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarClock,
  CircleDot,
  HardHat,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEquipmentStore } from "@/stores/equipment";
import { useInspectionsStore } from "@/stores/inspections";
import { CATEGORIES, SITES, makeEmptyEquipment, type EquipmentDraft } from "@/lib/bridge/equipment";
import type { Equipment, EquipmentStatus } from "@/types";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/use-t";


export const Route = createFileRoute("/app/equipment")({
  head: () => ({
    meta: [
      { title: "Equipment — CertiCore" },
      { name: "description", content: "Registry of assets scheduled for inspection." },
    ],
  }),
  component: EquipmentPage,
});

const STATUS_STYLES: Record<EquipmentStatus, string> = {
  active: "border-emerald-500/40 bg-emerald-500/10 text-emerald-500",
  quarantined: "border-orange-500/40 bg-orange-500/10 text-orange-500",
  retired: "border-muted bg-muted/20 text-muted-foreground",
};

function daysBetween(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function EquipmentPage() {
  const t = useT();

  const items = useEquipmentStore((s) => s.items);
  const status = useEquipmentStore((s) => s.status);
  const hydrate = useEquipmentStore((s) => s.hydrate);
  const upsert = useEquipmentStore((s) => s.upsert);
  const remove = useEquipmentStore((s) => s.remove);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<EquipmentStatus | "all">("all");
  const [editing, setEditing] = useState<EquipmentDraft | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const certificates = useInspectionsStore((s) => s.certificates);
  const insStatus = useInspectionsStore((s) => s.status);
  const hydrateIns = useInspectionsStore((s) => s.hydrate);

  useEffect(() => {
    if (status === "idle") void hydrate();
    if (insStatus === "idle") void hydrateIns();
  }, [status, hydrate, insStatus, hydrateIns]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items
      .filter((e) => (statusFilter === "all" ? true : e.status === statusFilter))
      .filter((e) => {
        if (!term) return true;
        return [e.tag, e.name, e.manufacturer, e.serialNumber, e.site, e.category]
          .join(" ")
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) => new Date(a.nextInspectionDue).getTime() - new Date(b.nextInspectionDue).getTime());
  }, [items, q, statusFilter]);

  const stats = useMemo(() => {
    const total = items.length;
    const overdue = items.filter((i) => daysBetween(i.nextInspectionDue) < 0 && i.status !== "retired").length;
    const soon = items.filter((i) => {
      const d = daysBetween(i.nextInspectionDue);
      return d >= 0 && d <= 14 && i.status !== "retired";
    }).length;
    const quarantined = items.filter((i) => i.status === "quarantined").length;
    return { total, overdue, soon, quarantined };
  }, [items]);

  function openCreate() {
    setEditing(makeEmptyEquipment());
    setDialogOpen(true);
  }
  function openEdit(e: Equipment) {
    setEditing({
      id: e.id,
      tag: e.tag,
      name: e.name,
      category: e.category,
      manufacturer: e.manufacturer,
      serialNumber: e.serialNumber,
      site: e.site,
      workingLoad: e.workingLoad ?? "",
      status: e.status,
      lastInspectedAt: e.lastInspectedAt,
      nextInspectionDue: e.nextInspectionDue,
      notes: e.notes ?? "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!editing) return;
    if (!editing.tag.trim() || !editing.name.trim()) {
      toast.error(t("equipment.validation.required"));
      return;
    }
    const res = await upsert(editing);
    if (!res.ok) {
      toast.error(res.message ?? "Could not save");
      return;
    }
    toast.success(t("equipment.save.success"));
    setDialogOpen(false);
    setEditing(null);
  }

  return (
    <div className="mx-auto flex h-full max-w-[1500px] flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{t("equipment.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("equipment.subtitle")}
          </p>

        </div>
        <Button onClick={openCreate} className="gap-2 bg-gold text-black hover:bg-gold/90">
          <Plus className="h-4 w-4" />
          {t("equipment.add")}
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("equipment.stat.registered")} value={stats.total} icon={<HardHat className="h-4 w-4" />} tone="text-foreground" />
        <StatCard label={t("equipment.stat.due14")} value={stats.soon} icon={<CalendarClock className="h-4 w-4" />} tone="text-gold" />
        <StatCard label={t("equipment.stat.overdue")} value={stats.overdue} icon={<AlertTriangle className="h-4 w-4" />} tone="text-red-500" />
        <StatCard label={t("equipment.status.quarantined")} value={stats.quarantined} icon={<Wrench className="h-4 w-4" />} tone="text-orange-500" />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card/40 p-3 backdrop-blur">
        <div className="flex flex-1 items-center gap-2 min-w-[240px]">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("equipment.searchPlaceholder")}
            className="max-w-md border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="flex gap-1 rounded-full border border-border/60 bg-background/50 p-1">
          {(["all", "active", "quarantined", "retired"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                statusFilter === s ? "bg-gold text-black" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s === "all" ? t("common.all") : t("equipment.status." + s)}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40 backdrop-blur">
        {status === "loading" ? (
          <div className="grid h-64 place-items-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="grid h-64 place-items-center text-sm text-muted-foreground">{t("equipment.empty")}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 bg-background/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("equipment.col.asset")}</th>
                <th className="px-4 py-3">{t("equipment.col.site")}</th>
                <th className="px-4 py-3">{t("equipment.col.status")}</th>
                <th className="px-4 py-3">{t("equipment.col.last")}</th>
                <th className="px-4 py-3">{t("equipment.col.due")}</th>
                <th className="px-4 py-3 text-right">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {filtered.map((e) => {
                  const days = daysBetween(e.nextInspectionDue);
                  const overdue = days < 0 && e.status !== "retired";
                  const soon = days >= 0 && days <= 14 && e.status !== "retired";
                  return (
                    <m.tr
                      key={e.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border-b border-border/40 last:border-0 hover:bg-background/40"
                    >
                      <td className="px-4 py-3">
                        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                          {e.tag}
                        </p>
                        <p className="font-medium">{e.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {e.manufacturer} · SN {e.serialNumber}
                          {e.workingLoad ? ` · ${e.workingLoad}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {e.site}
                        </div>
                        <p className="mt-0.5">{e.category}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
                            STATUS_STYLES[e.status],
                          )}
                        >
                          <CircleDot className="h-2.5 w-2.5" />
                          {t("equipment.status." + e.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDate(e.lastInspectedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm">{formatDate(e.nextInspectionDue)}</p>
                        <p
                          className={cn(
                            "text-xs",
                            overdue ? "text-red-500" : soon ? "text-gold" : "text-muted-foreground",
                          )}
                        >
                          {overdue
                            ? `${t("equipment.stat.overdue")} (${Math.abs(days)}d)`
                            : days === 0
                              ? t("equipment.stat.dueToday")
                              : t("equipment.stat.dueIn", { days: String(days) }).replace("{days}", String(days))}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(e)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => {
                              const hasCerts = certificates.some((c) => c.equipment_id === e.id);
                              if (hasCerts) {
                                toast.error(
                                  t("equipment.delete.hasCerts", { tag: e.tag }).replace("{tag}", e.tag),
                                  { duration: 6000 }
                                );
                                return;
                              }
                              if (window.confirm(t("equipment.delete.confirm", { tag: e.tag }).replace("{tag}", e.tag))) {
                                void remove(e.id);
                                toast.success(t("equipment.delete.success"));
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </m.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {editing?.id ? t("equipment.dialog.edit") : t("equipment.dialog.add")}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("equipment.dialog.tag")}>
                  <Input
                    value={editing.tag}
                    onChange={(e) => setEditing({ ...editing, tag: e.target.value })}
                    placeholder="WHO-LG-0184"
                  />
                </Field>
                <Field label={t("equipment.dialog.serial")}>
                  <Input
                    value={editing.serialNumber}
                    onChange={(e) => setEditing({ ...editing, serialNumber: e.target.value })}
                  />
                </Field>
              </div>
              <Field label={t("equipment.dialog.name")}>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Overhead hoist — bay 4"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("equipment.dialog.category")}>
                  <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={t("equipment.dialog.site")}>
                  <Select value={editing.site} onValueChange={(v) => setEditing({ ...editing, site: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SITES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("equipment.dialog.manufacturer")}>
                  <Input
                    value={editing.manufacturer}
                    onChange={(e) => setEditing({ ...editing, manufacturer: e.target.value })}
                  />
                </Field>
                <Field label={t("equipment.dialog.wll")}>
                  <Input
                    value={editing.workingLoad ?? ""}
                    onChange={(e) => setEditing({ ...editing, workingLoad: e.target.value })}
                    placeholder="e.g. 5 t / 16 bar"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("equipment.dialog.status")}>
                  <Select
                    value={editing.status}
                    onValueChange={(v: EquipmentStatus) => setEditing({ ...editing, status: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t("equipment.status.active")}</SelectItem>
                      <SelectItem value="quarantined">{t("equipment.status.quarantined")}</SelectItem>
                      <SelectItem value="retired">{t("equipment.status.retired")}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={t("equipment.dialog.due")}>
                  <DatePicker
                    value={editing.nextInspectionDue}
                    onChange={(val) =>
                      setEditing({
                        ...editing,
                        nextInspectionDue: val,
                      })
                    }
                  />
                </Field>
              </div>
              <Field label={t("equipment.dialog.notes")}>
                <Textarea
                  value={editing.notes ?? ""}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  rows={3}
                />
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} className="gap-2 bg-gold text-black hover:bg-gold/90">
              <Plus className="h-4 w-4" />
              {editing?.id ? t("common.saveChanges") : t("equipment.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: string;
  icon: React.ReactNode;
}) {
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
