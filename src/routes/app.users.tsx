import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, m } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Circle,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Plus,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useInspectorsStore } from "@/stores/inspectors";
import { SignaturePad } from "@/components/app/SignaturePad";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/use-t";

import { getActiveCountryConfig } from "@/lib/geo";

import type { Inspector, InspectorStatus } from "@/types";
import type { InspectorDraft } from "@/lib/bridge/inspectors";

export const Route = createFileRoute("/app/users")({
  head: () => ({
    meta: [
      { title: "Inspectors — CertiCore" },
      { name: "description", content: "Manage inspector accounts and license seats." },
    ],
  }),
  component: UsersPage,
});

const REGIONS = ["Riyadh", "Jeddah", "Dammam", "Jubail", "Yanbu", "Tabuk"];
const SPECIALTIES = [
  "Lifting Equipment",
  "Pressure Systems",
  "Access & Height",
  "Electrical",
  "Mechanical",
  "General",
];
const STATUSES: InspectorStatus[] = ["active", "invited", "suspended"];

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const STATUS_STYLES: Record<InspectorStatus, string> = {
  active: "border-emerald-500/40 bg-emerald-500/10 text-emerald-500",
  invited: "border-blue-500/40 bg-blue-500/10 text-blue-500",
  suspended: "border-orange-500/40 bg-orange-500/10 text-orange-500",
};

function emptyDraft(): InspectorDraft {
  return {
    name: "",
    email: "",
    phone: "",
    region: "",
    specialty: SPECIALTIES[0],
    status: "invited",
    seatAllocated: false,
    title: "",
    qualification: "",
    signatureDataUrl: null,
  };
}

function UsersPage() {
  const t = useT();

  const inspectors = useInspectorsStore((s) => s.inspectors);
  const status = useInspectorsStore((s) => s.status);
  const seatLimit = useInspectorsStore((s) => s.seatLimit);
  const hydrate = useInspectorsStore((s) => s.hydrate);
  const upsert = useInspectorsStore((s) => s.upsert);
  const remove = useInspectorsStore((s) => s.remove);
  const toggle = useInspectorsStore((s) => s.toggle);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<InspectorStatus | "all">("all");
  const [editing, setEditing] = useState<InspectorDraft | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirming, setConfirming] = useState<InspectorDraft | null>(null);

  const [activeGeo, setActiveGeo] = useState<any>(null);
  const regions = useMemo(() => activeGeo?.regions || REGIONS, [activeGeo]);

  useEffect(() => {
    const loadGeo = async () => {
      const cfg = await getActiveCountryConfig();
      setActiveGeo(cfg);
    };
    void loadGeo();
    window.addEventListener("certicore-geo-changed", loadGeo);
    return () => window.removeEventListener("certicore-geo-changed", loadGeo);
  }, []);

  useEffect(() => {
    if (status === "idle") void hydrate();
  }, [status, hydrate]);

  const seatsUsed = useMemo(() => inspectors.filter((i) => i.seatAllocated).length, [inspectors]);
  const seatPct = Math.min(100, Math.round((seatsUsed / seatLimit) * 100));

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return inspectors
      .filter((i) => (statusFilter === "all" ? true : i.status === statusFilter))
      .filter((i) => {
        if (!term) return true;
        return (
          i.name.toLowerCase().includes(term) ||
          i.email.toLowerCase().includes(term) ||
          i.region.toLowerCase().includes(term) ||
          i.specialty.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [inspectors, q, statusFilter]);

  function openCreate() {
    const draft = emptyDraft();
    draft.region = regions[0] || "";
    setEditing(draft);
    setDialogOpen(true);
  }
  function openEdit(i: Inspector) {
    setEditing({
      id: i.id,
      name: i.name,
      email: i.email,
      phone: i.phone ?? "",
      region: i.region,
      specialty: i.specialty,
      status: i.status,
      seatAllocated: i.seatAllocated,
      title: i.title ?? "",
      qualification: i.qualification ?? "",
      signatureDataUrl: i.signatureDataUrl ?? null,
      expiresAt: i.expiresAt,
    });
    setDialogOpen(true);
  }

  function handleSaveClick() {
    if (!editing) return;
    if (!editing.name.trim() || !editing.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    if (!editing.id && !editing.qualification?.trim()) {
      toast.error("Username prefix is required for new inspectors");
      return;
    }
    // Launch confirmation modal
    setConfirming(editing);
  }

  async function triggerActualSave(draft: InspectorDraft) {
    const res = await upsert(draft);
    if (!res.ok) {
      toast.error(res.message ?? "Could not save inspector");
      return;
    }
    toast.success(draft.id ? "Inspector updated" : "Inspector invited");
    setDialogOpen(false);
    setEditing(null);
  }

  async function handleToggleSeat(i: Inspector) {
    const res = await toggle(i.id);
    if (!res.ok) toast.error(res.message ?? t("inspectors.seatsError"));
    else toast.success(i.seatAllocated ? t("inspectors.seatsReleased") : t("inspectors.seatsAllocated"));
  }

  return (
    <div className="mx-auto flex h-full max-w-[1500px] flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{t("inspectors.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("inspectors.subtitle")}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-gold text-black hover:bg-gold/90">
          <UserPlus className="h-4 w-4" />
          {t("inspectors.inviteBtn")}
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur md:col-span-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="h-4 w-4 text-gold" />
              {t("inspectors.seats")}
            </div>
            <span className="font-display text-lg font-bold">
              {seatsUsed} <span className="text-muted-foreground">/ {seatLimit}</span>
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted/50">
            <m.div
              className="h-full bg-gradient-to-r from-gold to-amber-400"
              initial={{ width: 0 }}
              animate={{ width: `${seatPct}%` }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("inspectors.seatHint")}
          </p>
        </div>
        <StatBlock
          label={t("inspectors.active")}
          value={inspectors.filter((i) => i.status === "active").length}
          tone="text-emerald-500"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card/40 p-3 backdrop-blur">
        <div className="flex flex-1 items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("inspectors.searchPlaceholder")}
            className="max-w-md border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="flex gap-1 rounded-full border border-border/60 bg-background/50 p-1">
          {(["all", ...STATUSES] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                statusFilter === s ? "bg-gold text-black" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`inspectors.status.${s}`, s)}
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
          <div className="grid h-64 place-items-center text-sm text-muted-foreground">
            {t("inspectors.empty")}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 bg-background/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("inspectors.col.inspector")}</th>
                <th className="px-4 py-3">{t("inspectors.col.region")}</th>
                <th className="px-4 py-3">{t("common.status")}</th>
                <th className="px-4 py-3">{t("inspectors.col.certs")}</th>
                <th className="px-4 py-3">{t("inspectors.col.active")}</th>
                <th className="px-4 py-3 text-right">{t("inspectors.col.actions")}</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {filtered.map((i) => (
                  <m.tr
                    key={i.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-b border-border/40 last:border-0 hover:bg-background/40"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-full border border-gold/40 bg-gold/10 font-display text-sm font-bold text-gold">
                          {i.avatarInitials}
                        </div>
                        <div>
                          <p className="font-medium">{i.name}</p>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {i.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {i.region}
                      </div>
                      <p className="text-sm">{i.specialty}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
                          STATUS_STYLES[i.status],
                        )}
                      >
                        <Circle className="h-2 w-2 fill-current" />
                        {i.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-display text-base font-bold">{i.certificatesIssued}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatRelative(i.lastActiveAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant={i.seatAllocated ? "default" : "outline"}
                          className={cn(
                            "h-8 gap-1",
                            i.seatAllocated && "bg-gold text-black hover:bg-gold/90",
                          )}
                          onClick={() => handleToggleSeat(i)}
                        >
                          <KeyRound className="h-3 w-3" />
                          {i.seatAllocated ? "Seat" : "No seat"}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(i)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => {
                            void remove(i.id);
                            toast.success(`Removed ${i.name}`);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </m.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {editing?.id ? t("inspectors.dialog.title.edit") : t("inspectors.dialog.title.invite")}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("inspectors.dialog.fullName")}>
                  <Input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    placeholder="Jane Doe"
                  />
                </Field>
                <Field label={t("inspectors.dialog.email")}>
                  <Input
                    type="email"
                    value={editing.email}
                    onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                    placeholder="jane@company.com"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("inspectors.dialog.phone")}>
                  <Input
                    value={editing.phone ?? ""}
                    onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                    placeholder={`${activeGeo?.phoneCode || "+966"} …`}
                  />
                </Field>
                <Field label={t("inspectors.dialog.region")}>
                  <Select
                    value={editing.region}
                    onValueChange={(v) => setEditing({ ...editing, region: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("inspectors.dialog.specialty")}>
                  <Select
                    value={editing.specialty}
                    onValueChange={(v) => setEditing({ ...editing, specialty: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SPECIALTIES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={t("inspectors.dialog.expiry")}>
                  <DatePicker
                    value={editing.expiresAt}
                    onChange={(val) => setEditing({ ...editing, expiresAt: val || undefined })}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("inspectors.dialog.titlePrinted")}>
                  <Input
                    value={editing.title ?? ""}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                    placeholder="Chartered Inspector"
                  />
                </Field>
                <Field label={t("inspectors.dialog.username")}>
                  <div className="relative flex items-center">
                    <Input
                      disabled={!!editing.id}
                      value={editing.qualification ?? ""}
                      onChange={(e) => setEditing({ ...editing, qualification: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "") })}
                      placeholder="e.g. ahmed"
                      className="pr-12"
                    />
                    <span className="absolute right-3 text-xs font-semibold text-white/40">@ins</span>
                  </div>
                </Field>
              </div>
              <SignaturePad
                value={editing.signatureDataUrl ?? null}
                onChange={(v) => setEditing({ ...editing, signatureDataUrl: v })}
                label={t("inspectors.dialog.signature")}
                hint={t("inspectors.dialog.signatureHint")}
                height={120}
              />
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={editing.seatAllocated}
                  onChange={(e) => setEditing({ ...editing, seatAllocated: e.target.checked })}
                  className="h-4 w-4 accent-[color:oklch(0.76_0.14_78)]"
                />
                <div>
                  <p className="font-medium">{t("inspectors.dialog.allocateSeat")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("inspectors.dialog.allocateSeatHint")}
                  </p>
                </div>
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSaveClick} className="gap-2 bg-gold text-black hover:bg-gold/90">
              <Plus className="h-4 w-4" />
              {editing?.id ? t("common.saveChanges") : t("inspectors.dialog.sendInvite")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirming} onOpenChange={(open) => !open && setConfirming(null)}>
        <DialogContent className="sm:max-w-md bg-slate-950 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-amber-400">{t("inspectors.dialog.confirm.title")}</DialogTitle>
          </DialogHeader>
          {confirming && (
            <div className="space-y-4 py-3 text-sm">
              <p className="text-white/70">{t("inspectors.dialog.confirm.desc")}</p>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-2">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/45">{t("inspectors.dialog.confirm.fullName")}</span>
                  <span className="font-semibold text-white/95">{confirming.name}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/45">{t("inspectors.dialog.confirm.email")}</span>
                  <span className="text-white/95">{confirming.email}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/45">{t("inspectors.dialog.confirm.username")}</span>
                  <span className="font-mono font-bold text-amber-300">
                    {confirming.id ? confirming.qualification : `${confirming.qualification}@ins`}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/45">{t("inspectors.dialog.confirm.phone")}</span>
                  <span className="text-white/95">{confirming.phone || "—"}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/45">{t("inspectors.dialog.confirm.region")}</span>
                  <span className="text-white/95">{confirming.region}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/45">{t("inspectors.dialog.confirm.specialty")}</span>
                  <span className="text-white/95">{confirming.specialty}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-white/45">{t("inspectors.dialog.confirm.expiry")}</span>
                  <span className="font-semibold text-white/95">
                    {confirming.expiresAt ? new Date(confirming.expiresAt).toLocaleDateString() : "—"}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setConfirming(null)} className="border-white/10 text-white/60">
              {t("common.cancel")}
            </Button>
            <Button
              onClick={async () => {
                if (confirming) {
                  await triggerActualSave(confirming);
                  setConfirming(null);
                }
              }}
              className="bg-gold text-black hover:bg-gold/90"
            >
              {t("inspectors.dialog.confirm.btn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatBlock({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-display text-3xl font-bold", tone)}>{value}</p>
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
