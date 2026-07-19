import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { m } from "framer-motion";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import {
  Database,
  Download,
  Globe,
  Info,
  KeyRound,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
  Trash2,
  Upload,
  Laptop,
  Loader2,
} from "lucide-react";
import { getActiveDevices, releaseDevice, type Device } from "@/lib/bridge/license";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useUIStore } from "@/stores/ui";
import { useAuthStore } from "@/stores/auth";
import { useLicenseStore } from "@/stores/license";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/use-t";

export const Route = createFileRoute("/app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — CertiCore" },
      { name: "description", content: "Workspace preferences, backups, and license." },
    ],
  }),
  component: SettingsPage,
});

const STORAGE_KEYS = [
  "certicore.branding.v1",
  "certicore.templates.v1",
  "certicore.equipment.v1",
  "certicore.inspectors.v1",
  "certicore.media.v1",
  "certicore.audit.v1",
  "certicore.drafts.v1",
  "certicore.certificates.v1",
];

function SettingsPage() {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const locale = useUIStore((s) => s.locale);
  const setLocale = useUIStore((s) => s.setLocale);
  const online = useUIStore((s) => s.online);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const license = useLicenseStore((s) => s.license);
  const navigate = useNavigate();
  const t = useT();

  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  useEffect(() => {
    if (!license?.code) return;
    const fetchDevices = async () => {
      setLoadingDevices(true);
      const res = await getActiveDevices(license.code);
      if (res.ok && res.data) {
        setDevices(res.data);
      }
      setLoadingDevices(false);
    };
    void fetchDevices();
  }, [license?.code]);

  const handleReleaseDevice = async (deviceId: string, devName: string) => {
    if (!window.confirm(t("settings.license.deactivateConfirm", { name: devName || 'Unknown Device' }))) {
      return;
    }
    const res = await releaseDevice(deviceId);
    if (res.ok) {
      toast.success(t("settings.license.deactivateSuccess"));
      setDevices(prev => prev.filter(d => d.id !== deviceId));
    } else {
      toast.error(res.error.message || "Failed to release device seat.");
    }
  };

  function exportBackup() {
    const dump: Record<string, unknown> = {};
    for (const k of STORAGE_KEYS) {
      const raw = window.localStorage.getItem(k);
      if (raw) {
        try {
          dump[k] = JSON.parse(raw);
        } catch {
          dump[k] = raw;
        }
      }
    }
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data: dump }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `certicore-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Workspace backup exported");
  }

  function importBackup(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const data = parsed.data ?? parsed;
        let count = 0;
        for (const [k, v] of Object.entries(data)) {
          if (STORAGE_KEYS.includes(k)) {
            window.localStorage.setItem(k, JSON.stringify(v));
            count++;
          }
        }
        toast.success(`Restored ${count} datasets — reloading…`);
        setTimeout(() => window.location.reload(), 800);
      } catch {
        toast.error("Backup file is not valid");
      }
    };
    reader.readAsText(file);
  }

  function wipeAll() {
    if (!confirm("Erase all local data? This cannot be undone.")) return;
    for (const k of STORAGE_KEYS) window.localStorage.removeItem(k);
    toast.success("Local data wiped — reloading…");
    setTimeout(() => window.location.reload(), 600);
  }

  async function handleSignOut() {
    await signOut();
    void navigate({ to: "/auth" });
  }

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col gap-6 px-6 py-8">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">{t("settings.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("settings.subtitle")}
        </p>
      </header>

      <Section title={t("settings.account")} icon={<KeyRound className="h-4 w-4" />}>
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-full border border-gold/40 bg-gold/10 font-display font-bold text-gold">
            {user?.avatarInitials ?? "??"}
          </div>
          <div className="flex-1">
            <p className="font-medium">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.email} · <span className="capitalize">{user?.role}</span></p>
          </div>
          <Button variant="outline" onClick={handleSignOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            {t("top.signout")}
          </Button>
        </div>
      </Section>

      <Section title={t("settings.appearance")} icon={<Sun className="h-4 w-4" />}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Choice
            label={t("settings.theme")}
            options={[
              { key: "light", label: t("settings.theme.light"), icon: <Sun className="h-4 w-4" /> },
              { key: "dark", label: t("settings.theme.dark"), icon: <Moon className="h-4 w-4" /> },
            ]}
            value={theme}
            onChange={(v) => setTheme(v as "light" | "dark")}
          />
          <Choice
            label={t("settings.language")}
            options={[
              { key: "en", label: "English", icon: <Globe className="h-4 w-4" /> },
              { key: "ar", label: "العربية", icon: <Globe className="h-4 w-4" /> },
            ]}
            value={locale}
            onChange={(v) => setLocale(v as "en" | "ar")}
          />
        </div>
      </Section>

      <Section title={t("settings.license")} icon={<ShieldCheck className="h-4 w-4" />}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Meta label={t("settings.license.status")} value={license ? "Active" : "Inactive"} tone={license ? "text-emerald-500" : "text-muted-foreground"} />
          <Meta label={t("settings.license.tier")} value={license?.tier ?? "—"} />
          <Meta label={t("settings.license.seats")} value={license ? String(license.seats) : "—"} />
          <Meta label={t("settings.license.org")} value={license?.organization ?? "—"} />
          <Meta label={t("settings.license.code")} value={license?.code ? `••••-${license.code.slice(-4)}` : "—"} mono />
          <Meta label={t("settings.license.machine")} value={license?.machineId ?? "—"} mono />
        </div>
        {license?.expiresAt && (
          <p className="mt-3 text-xs text-muted-foreground">
            Expires: {new Date(license.expiresAt).toLocaleDateString()}
          </p>
        )}

        {license && (
          <div className="mt-6 border-t border-white/5 pt-4">
            <h4 className="text-xs uppercase tracking-widest text-white/50 mb-3 flex items-center gap-2">
              <Laptop className="h-3.5 w-3.5 text-gold" />
              {t("settings.license.workstations")} ({devices.length} / {license.seats})
            </h4>
            {loadingDevices ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" />
                {t("settings.license.loadingWorkstations")}
              </div>
            ) : devices.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("settings.license.noWorkstations")}</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                {devices.map((dev) => {
                  const isCurrent = dev.hardware_id === license.machineId;
                  return (
                    <div 
                      key={dev.id} 
                      className={cn(
                        "flex items-center justify-between rounded-lg border p-3 text-xs transition-all",
                        isCurrent 
                          ? "border-gold/30 bg-gold/5" 
                          : "border-white/5 bg-white/[0.01] hover:bg-white/[0.03]"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white/90 truncate">
                            {dev.device_name || "Unknown Computer"}
                          </span>
                          {isCurrent && (
                            <span className="rounded-sm border border-gold/40 bg-gold/10 px-1 py-[1px] text-[8px] font-bold uppercase tracking-wider text-gold">
                              {t("settings.license.currentDevice")}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate">
                          ID: {dev.hardware_id} · Active since {new Date(dev.registered_at).toLocaleDateString()}
                        </p>
                      </div>
                      
                      {!isCurrent && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive gap-1 px-2.5"
                          onClick={() => handleReleaseDevice(dev.id, dev.device_name)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {t("settings.license.deactivate")}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Section>

      <Section title={t("settings.data")} icon={<Database className="h-4 w-4" />}>
        <p className="text-xs text-muted-foreground">
          {t("settings.data.desc")}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportBackup} className="gap-2">
            <Download className="h-4 w-4" />
            {t("settings.data.export")}
          </Button>
          <label className="inline-flex cursor-pointer">
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importBackup(f);
              }}
            />
            <span className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent">
              <Upload className="h-4 w-4" />
              {t("settings.data.import")}
            </span>
          </label>
          <Button variant="destructive" onClick={wipeAll} className="gap-2">
            <Trash2 className="h-4 w-4" />
            {t("settings.data.wipe")}
          </Button>
        </div>
      </Section>

      <Section title={t("settings.system")} icon={<Info className="h-4 w-4" />}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Meta label={t("settings.system.connection")} value={online ? "Online" : "Offline"} tone={online ? "text-emerald-500" : "text-muted-foreground"} />
          <Meta label={t("settings.system.version")} value="0.9.0-prototype" mono />
          <Meta label={t("settings.system.runtime")} value="Tauri bridge (mock)" />
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <m.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur"
    >
      <div className="mb-4 flex items-center gap-2 text-gold">
        {icon}
        <h2 className="font-display text-sm font-semibold uppercase tracking-widest">{title}</h2>
      </div>
      {children}
    </m.section>
  );
}

function Choice({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ key: string; label: string; icon: React.ReactNode }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="mt-2 flex gap-1 rounded-full border border-border/60 bg-background/50 p-1">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              value === o.key ? "bg-gold text-black" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.icon}
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Meta({ label, value, tone, mono }: { label: string; value: string; tone?: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/40 p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-sm font-medium capitalize", tone, mono && "font-mono normal-case")}>{value}</p>
    </div>
  );
}
