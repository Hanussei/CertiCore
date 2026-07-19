import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, m } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  FileBadge,
  Filter,
  Info,
  Loader2,
  Palette,
  ScrollText,
  Search,
  ShieldCheck,
  Upload,
  User as UserIcon,
  Users,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuditStore } from "@/stores/audit";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/use-t";

import type { AuditEvent, AuditSeverity } from "@/types";

export const Route = createFileRoute("/app/audit")({
  head: () => ({
    meta: [
      { title: "Audit Log — CertiCore" },
      { name: "description", content: "Tamper-evident timeline of organizational activity." },
    ],
  }),
  component: AuditPage,
});

const SEVERITY_STYLES: Record<AuditSeverity, { chip: string; dot: string; ring: string; icon: React.ReactNode }> = {
  info: {
    chip: "border-blue-500/40 bg-blue-500/10 text-blue-500",
    dot: "bg-blue-500",
    ring: "ring-blue-500/30",
    icon: <Info className="h-3.5 w-3.5" />,
  },
  success: {
    chip: "border-emerald-500/40 bg-emerald-500/10 text-emerald-500",
    dot: "bg-emerald-500",
    ring: "ring-emerald-500/30",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  warning: {
    chip: "border-orange-500/40 bg-orange-500/10 text-orange-500",
    dot: "bg-orange-500",
    ring: "ring-orange-500/30",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  critical: {
    chip: "border-red-500/40 bg-red-500/10 text-red-500",
    dot: "bg-red-500",
    ring: "ring-red-500/30",
    icon: <ShieldCheck className="h-3.5 w-3.5" />,
  },
};

const CATEGORY_ICON: Record<AuditEvent["category"], React.ReactNode> = {
  auth: <UserIcon className="h-4 w-4" />,
  branding: <Palette className="h-4 w-4" />,
  template: <ScrollText className="h-4 w-4" />,
  media: <Upload className="h-4 w-4" />,
  user: <Users className="h-4 w-4" />,
  certificate: <FileBadge className="h-4 w-4" />,
  system: <ShieldCheck className="h-4 w-4" />,
};

const CATEGORIES: Array<AuditEvent["category"] | "all"> = [
  "all",
  "auth",
  "branding",
  "template",
  "media",
  "user",
  "certificate",
  "system",
];

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  if (target.getTime() === today.getTime()) return "Today";
  if (target.getTime() === yesterday.getTime()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

function AuditPage() {
  const t = useT();

  const events = useAuditStore((s) => s.events);
  const status = useAuditStore((s) => s.status);
  const hydrate = useAuditStore((s) => s.hydrate);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("all");
  const [severity, setSeverity] = useState<AuditSeverity | "all">("all");

  useEffect(() => {
    if (status === "idle") void hydrate();
  }, [status, hydrate]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return events.filter((e) => {
      if (cat !== "all" && e.category !== cat) return false;
      if (severity !== "all" && e.severity !== severity) return false;
      if (!term) return true;
      return (
        e.actor.toLowerCase().includes(term) ||
        e.action.toLowerCase().includes(term) ||
        e.target.toLowerCase().includes(term) ||
        (e.detail?.toLowerCase().includes(term) ?? false)
      );
    });
  }, [events, cat, q, severity]);

  const grouped = useMemo(() => {
    const map = new Map<string, AuditEvent[]>();
    for (const e of filtered) {
      const key = formatDay(e.at);
      const arr = map.get(key);
      if (arr) arr.push(e);
      else map.set(key, [e]);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const counts = useMemo(() => {
    return {
      total: events.length,
      critical: events.filter((e) => e.severity === "critical").length,
      warning: events.filter((e) => e.severity === "warning").length,
      last24: events.filter((e) => Date.now() - new Date(e.at).getTime() < 86_400_000).length,
    };
  }, [events]);

  function exportJson() {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `certicore-audit-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto flex h-full max-w-[1400px] flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{t("audit.title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {t("audit.subtitle")}
          </p>

        </div>
        <Button variant="outline" onClick={exportJson} className="gap-2">
          <Download className="h-4 w-4" />
          {t("audit.export")}
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("audit.stat.total")} value={counts.total} tone="text-foreground" icon={<Clock className="h-4 w-4" />} />
        <StatCard label={t("audit.stat.last24")} value={counts.last24} tone="text-gold" icon={<Clock className="h-4 w-4" />} />
        <StatCard label={t("audit.stat.warnings")} value={counts.warning} tone="text-orange-500" icon={<AlertTriangle className="h-4 w-4" />} />
        <StatCard label={t("audit.stat.critical")} value={counts.critical} tone="text-red-500" icon={<ShieldCheck className="h-4 w-4" />} />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card/40 p-3 backdrop-blur">
        <div className="flex flex-1 items-center gap-2 min-w-[240px]">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("audit.searchPlaceholder")}
            className="max-w-md border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="flex flex-wrap gap-1 rounded-full border border-border/60 bg-background/50 p-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                cat === c ? "bg-gold text-black" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-full border border-border/60 bg-background/50 p-1">
          <Filter className="ml-2 h-3 w-3 text-muted-foreground" />
          {(["all", "info", "success", "warning", "critical"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSeverity(s)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                severity === s ? "bg-gold text-black" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur">
        {status === "loading" ? (
          <div className="grid h-64 place-items-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="grid h-64 place-items-center text-sm text-muted-foreground">
            {t("audit.empty")}
          </div>
        ) : (
          <div className="space-y-8">
            <AnimatePresence initial={false}>
              {grouped.map(([day, list]) => (
                <m.section
                  key={day}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="mb-3 flex items-center gap-3">
                    <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                      {day}
                    </h2>
                    <div className="h-px flex-1 bg-border/60" />
                    <span className="text-xs text-muted-foreground">{list.length} {t("audit.eventsCount")}</span>
                  </div>
                  <ol className="relative space-y-3 border-l border-border/60 pl-6">
                    {list.map((e, idx) => {
                      const s = SEVERITY_STYLES[e.severity];
                      return (
                        <m.li
                          key={e.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.02, duration: 0.2 }}
                          className="relative"
                        >
                          <span
                            className={cn(
                              "absolute -left-[29px] top-3 grid h-4 w-4 place-items-center rounded-full ring-4",
                              s.dot,
                              s.ring,
                            )}
                          />
                          <div className="group rounded-xl border border-border/60 bg-background/40 p-4 transition-colors hover:border-gold/40 hover:bg-background/70">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <div className="grid h-9 w-9 place-items-center rounded-lg border border-border/60 bg-card/60 text-muted-foreground group-hover:text-gold">
                                  {CATEGORY_ICON[e.category]}
                                </div>
                                <div>
                                  <p className="text-sm">
                                    <span className="font-semibold">{e.actor}</span>{" "}
                                    <span className="text-muted-foreground">{e.action.toLowerCase()}</span>{" "}
                                    <span className="font-medium">{e.target}</span>
                                  </p>
                                  {e.detail && (
                                    <p className="mt-1 text-xs text-muted-foreground">{e.detail}</p>
                                  )}
                                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                    <span
                                      className={cn(
                                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium capitalize",
                                        s.chip,
                                      )}
                                    >
                                      {s.icon}
                                      {e.severity}
                                    </span>
                                    <span className="capitalize">{e.category}</span>
                                    <span>· {e.actorRole}</span>
                                    {e.ip && <span>· {e.ip}</span>}
                                  </div>
                                </div>
                              </div>
                              <time className="whitespace-nowrap text-xs font-mono text-muted-foreground">
                                {formatTime(e.at)}
                              </time>
                            </div>
                          </div>
                        </m.li>
                      );
                    })}
                  </ol>
                </m.section>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
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
