import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Check, ChevronRight, Languages, LogOut, Moon, RefreshCw, Sun, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth";
import { useUIStore } from "@/stores/ui";
import { useBrandingStore } from "@/stores/branding";
import { useT } from "@/hooks/use-t";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getOutbox, processSyncQueue } from "@/lib/bridge/supabase-sync";

/** Map top-level route segment → i18n key for breadcrumb label */
const SEGMENT_LABEL: Record<string, string> = {
  app: "app.name",
  dashboard: "nav.dashboard",
  branding: "nav.branding",
  media: "nav.media",
  templates: "nav.templates",
  users: "nav.users",
  audit: "nav.audit",
  equipment: "nav.equipment",
  inspections: "nav.inspections",
  drafts: "nav.drafts",
  certificates: "nav.certificates",
  settings: "nav.settings",
};

export function TopBar() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const toggleLocale = useUIStore((s) => s.toggleLocale);
  const online = useUIStore((s) => s.online);
  const brandingDirty = useBrandingStore((s) => s.dirty);
  const brandingStatus = useBrandingStore((s) => s.status);
  const t = useT();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [pendingSyncs, setPendingSyncs] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const updateCount = async () => {
      const outbox = await getOutbox();
      setPendingSyncs(outbox.length);
    };
    void updateCount();

    const handleSyncComplete = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setPendingSyncs(detail?.remainingCount ?? 0);
      setSyncing(false);
    };

    window.addEventListener("certicore-sync-complete", handleSyncComplete);
    const iv = setInterval(updateCount, 5000);
    return () => {
      window.removeEventListener("certicore-sync-complete", handleSyncComplete);
      clearInterval(iv);
    };
  }, []);

  const triggerManualSync = async () => {
    if (syncing) return;
    setSyncing(true);
    toast.info("Starting synchronization...");
    const res = await processSyncQueue();
    setSyncing(false);
    if (res.ok) {
      if (res.data.syncedCount > 0) {
        toast.success(`Successfully synced ${res.data.syncedCount} items to cloud.`);
      }
      if (res.data.errors && res.data.errors.length > 0) {
        res.data.errors.forEach((err) => {
          toast.error(err, { duration: 6000 });
        });
      } else if (res.data.syncedCount === 0) {
        toast.info("No items pending synchronization.");
      }
    } else {
      toast.error(res.error.message || "Synchronization failed.");
    }
  };

  const crumbs = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    let path = "";
    return parts.map((seg) => {
      path += `/${seg}`;
      const key = SEGMENT_LABEL[seg];
      return { path, label: key ? t(key) : seg };
    });
  }, [pathname, t]);

  const saveState: "saved" | "dirty" | "saving" =
    brandingStatus === "saving" ? "saving" : brandingDirty ? "dirty" : "saved";

  return (
    <header className="relative flex h-16 items-center justify-between gap-3 border-b border-white/5 bg-white/[0.015] px-6 backdrop-blur-md">
      {/* Left: breadcrumb */}
      <nav className="flex min-w-0 items-center gap-1.5 text-xs" aria-label="Breadcrumb">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <div key={c.path} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3 w-3 text-white/25 rtl:rotate-180" />}
              {last ? (
                <span
                  className="truncate font-semibold"
                  style={{ color: "var(--brand-accent)" }}
                >
                  {c.label}
                </span>
              ) : (
                <Link
                  to={c.path}
                  className="truncate text-white/45 transition-colors hover:text-white/80"
                >
                  {c.label}
                </Link>
              )}
            </div>
          );
        })}
      </nav>

      {/* Right: status pills + controls */}
      <div className="flex items-center gap-2">
        {/* Save indicator */}
        <span
          className={cn(
            "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.15em] md:inline-flex",
            saveState === "saving"
              ? "border-sky-400/25 bg-sky-400/10 text-sky-300"
              : saveState === "dirty"
                ? "border-amber-400/25 bg-amber-400/10 text-amber-300"
                : "border-emerald-400/20 bg-emerald-400/8 text-emerald-300/90",
          )}
        >
          {saveState === "saved" && <Check className="h-3 w-3" />}
          {saveState === "saving" && (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-300" />
          )}
          {saveState === "dirty" && (
            <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
          )}
          {saveState === "saving"
            ? t("top.saving")
            : saveState === "dirty"
              ? t("top.unsaved")
              : t("top.saved")}
        </span>

        {/* Manual Sync Trigger */}
        {pendingSyncs > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={triggerManualSync}
            disabled={syncing}
            className="h-7 gap-1.5 border-amber-500/25 bg-amber-500/5 px-2.5 text-[9px] font-bold uppercase tracking-[0.15em] text-amber-400 hover:bg-amber-500/10"
          >
            <RefreshCw className={cn("h-3 w-3", syncing && "animate-spin")} />
            <span>Sync ({pendingSyncs})</span>
          </Button>
        )}

        {/* Online/offline pill */}
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em]",
            online
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
              : "border-amber-500/25 bg-amber-500/10 text-amber-400",
          )}
        >
          {online ? (
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
          ) : (
            <WifiOff className="h-3 w-3" />
          )}
          {online ? t("top.online") : t("top.offline")}
        </span>

        <div className="mx-1 hidden h-6 w-px bg-white/10 sm:block" />

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleLocale}
          aria-label={t("top.locale")}
          className="text-white/60 hover:bg-white/5 hover:text-white"
        >
          <Languages className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={t("top.theme")}
          className="text-white/60 hover:bg-white/5 hover:text-white"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {user && (
          <div className="ml-1 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-1 pl-1 pr-3 backdrop-blur">
            <div
              className="grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold text-[oklch(0.13_0.04_260)]"
              style={{
                background:
                  "linear-gradient(135deg, var(--brand-accent), color-mix(in oklch, var(--brand-accent) 65%, #000))",
              }}
            >
              {user.avatarInitials}
            </div>
            <div className="hidden text-left leading-tight sm:block">
              <div className="text-xs font-medium text-white/90">{user.name}</div>
              <div
                className="text-[9px] font-semibold uppercase tracking-[0.2em]"
                style={{ color: "var(--brand-accent)" }}
              >
                {user.role === "manager" ? t("auth.role.manager") : t("auth.role.inspector")}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-white/50 hover:bg-white/5 hover:text-white"
              onClick={async () => {
                await signOut();
                navigate({ to: "/auth" });
              }}
              aria-label={t("top.signout")}
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
