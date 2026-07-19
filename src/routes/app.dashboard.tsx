import { createFileRoute, Link } from "@tanstack/react-router";
import { m } from "framer-motion";
import { useEffect, useMemo } from "react";
import {
  ArrowUpRight,
  ClipboardCheck,
  FileBadge,
  FileClock,
  FileStack,
  HardHat,
  Images,
  Palette,
  ScrollText,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { useAuditStore } from "@/stores/audit";
import { useBrandingStore } from "@/stores/branding";
import { useEquipmentStore } from "@/stores/equipment";
import { useInspectionsStore } from "@/stores/inspections";
import { useInspectorsStore } from "@/stores/inspectors";
import { useMediaStore } from "@/stores/media";
import { useTemplatesStore } from "@/stores/templates";
import { useT, useLocale } from "@/hooks/use-t";

export const Route = createFileRoute("/app/dashboard")({
  component: DashboardPage,
});

type Stat = { icon: LucideIcon; label: string; value: string; hint: string; to?: string };
type Action = { icon: LucideIcon; label: string; to: string; hint: string };

function severityDot(sev: string) {
  switch (sev) {
    case "success":
      return "bg-emerald-500";
    case "warning":
      return "bg-amber-500";
    case "critical":
      return "bg-rose-500";
    default:
      return "bg-sky-500";
  }
}

function useFmtRelative() {
  const t = useT();
  return (iso: string): string => {
    const ms = Date.now() - new Date(iso).getTime();
    const m = Math.round(ms / 60000);
    if (m < 1) return t("dash.time.justNow");
    if (m < 60) return t("dash.time.mAgo", { n: String(m) });
    const h = Math.round(m / 60);
    if (h < 24) return t("dash.time.hAgo", { n: String(h) });
    const d = Math.round(h / 24);
    return t("dash.time.dAgo", { n: String(d) });
  };
}

function DashboardPage() {
  const user = useAuthStore((s) => s.user)!;
  const t = useT();
  const locale = useLocale();
  const fmtRelative = useFmtRelative();

  const audit = useAuditStore();
  const branding = useBrandingStore();
  const equipment = useEquipmentStore();
  const inspections = useInspectionsStore();
  const inspectors = useInspectorsStore();
  const media = useMediaStore();
  const templates = useTemplatesStore();

  useEffect(() => {
    if (branding.status === "idle") void branding.hydrate();
    if (templates.status === "idle") void templates.hydrate();
    if (media.status === "idle") void media.hydrate();
    if (inspectors.status === "idle") void inspectors.hydrate();
    if (audit.status === "idle") void audit.hydrate();
    if (equipment.status === "idle") void equipment.hydrate();
    if (inspections.status === "idle") void inspections.hydrate();
  }, [audit, branding, equipment, inspections, inspectors, media, templates]);

  const stats: Stat[] = useMemo(() => {
    if (user.role === "manager") {
      const activeInspectors = inspectors.inspectors.filter((i) => i.status === "active").length;
      const publishedTemplates = templates.templates.filter((t) => t.status === "published").length;
      const now = new Date();
      const certsThisMonth = inspections.certificates.filter((c) => {
        const d = new Date(c.issuedAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length;
      return [
        {
          icon: Palette,
          label: t("dash.stat.branding"),
          value: branding.branding.organizationName ? t("dash.stat.branding.configured") : t("dash.stat.branding.setup"),
          hint: (locale === "ar" ? branding.branding.organizationNameAr : branding.branding.organizationName) || branding.branding.organizationName || "—",
          to: "/app/branding",
        },
        {
          icon: Users,
          label: t("dash.stat.activeInspectors"),
          value: String(activeInspectors),
          hint: t("dash.stat.seats", { used: String(inspectors.inspectors.length), total: String(inspectors.seatLimit) }),
          to: "/app/users",
        },
        {
          icon: FileStack,
          label: t("dash.stat.publishedTemplates"),
          value: String(publishedTemplates),
          hint: t("dash.stat.total", { n: String(templates.templates.length) }),
          to: "/app/templates",
        },
        {
          icon: FileBadge,
          label: t("dash.stat.certsThisMonth"),
          value: String(certsThisMonth),
          hint: t("dash.stat.lifetime", { n: String(inspections.certificates.length) }),
          to: "/app/certificates",
        },
      ];
    }
    const mine = inspections.drafts.filter((d) => d.inspectorId === user.id);
    const myCerts = inspections.certificates.filter((c) => c.inspectorId === user.id);
    const overdue = equipment.items.filter(
      (e) => e.status === "active" && new Date(e.nextInspectionDue).getTime() < Date.now(),
    ).length;
    return [
      {
        icon: ClipboardCheck,
        label: t("dash.stat.certsIssued"),
        value: String(myCerts.length),
        hint: t("dash.stat.byYou"),
        to: "/app/certificates",
      },
      {
        icon: HardHat,
        label: t("dash.stat.equipment"),
        value: String(equipment.items.length),
        hint: t("dash.stat.overdue", { n: String(overdue) }),
        to: "/app/equipment",
      },
      {
        icon: FileClock,
        label: t("dash.stat.drafts"),
        value: String(mine.length),
        hint: t("dash.stat.autoSaved"),
        to: "/app/drafts",
      },
      {
        icon: Images,
        label: t("dash.stat.media"),
        value: String(media.assets.length),
        hint: t("dash.stat.mediaHint"),
        to: "/app/media",
      },
    ];
  }, [user, branding, templates, inspectors, inspections, equipment, media, t]);

  const actions: Action[] = useMemo(() => {
    if (user.role === "manager") {
      return [
        { icon: Users, label: t("dash.action.inviteInspector"), to: "/app/users", hint: t("dash.action.inviteInspector.hint") },
        { icon: FileStack, label: t("dash.action.newTemplate"), to: "/app/templates", hint: t("dash.action.newTemplate.hint") },
        { icon: Palette, label: t("dash.action.editBranding"), to: "/app/branding", hint: t("dash.action.editBranding.hint") },
        { icon: ScrollText, label: t("dash.action.reviewAudit"), to: "/app/audit", hint: t("dash.action.reviewAudit.hint") },
      ];
    }
    return [
      { icon: ClipboardCheck, label: t("dash.action.startInspection"), to: "/app/inspections", hint: t("dash.action.startInspection.hint") },
      { icon: HardHat, label: t("dash.action.registerEquipment"), to: "/app/equipment", hint: t("dash.action.registerEquipment.hint") },
      { icon: FileClock, label: t("dash.action.resumeDrafts"), to: "/app/drafts", hint: t("dash.action.resumeDrafts.hint") },
      { icon: FileBadge, label: t("dash.action.viewCertificates"), to: "/app/certificates", hint: t("dash.action.viewCertificates.hint") },
    ];
  }, [user.role, t]);

  const recentEvents = useMemo(
    () =>
      [...audit.events]
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
        .slice(0, 6),
    [audit.events],
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <m.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-[oklch(0.86_0.10_82)] backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand-accent)] shadow-[0_0_8px_oklch(0.76_0.14_78)]" />
          {t(`auth.role.${user.role}`)}
        </div>
        <h1 className="mt-4 font-display text-5xl font-light italic tracking-tight sm:text-6xl">
          <span className="bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
            {t("dashboard.welcome", { name: user.name.split(" ")[0] }).split(",")[0]}
          </span>
          {t("dashboard.welcome", { name: user.name.split(" ")[0] }).includes(",") && (
            <>
              ,
              <br />
              <span className="bg-gradient-to-r from-[oklch(0.9_0.12_85)] via-[oklch(0.78_0.14_78)] to-[oklch(0.66_0.16_60)] bg-clip-text text-transparent">
                {t("dashboard.welcome", { name: user.name.split(" ")[0] })
                  .split(",")
                  .slice(1)
                  .join(",")
                  .trim()}
              </span>
            </>
          )}
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/55">
          {t(`dashboard.role.${user.role}`)}
        </p>
      </m.div>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => {
          const Card = (
            <m.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.3 }}
              whileHover={{ y: -3 }}
              className="group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md transition-colors hover:border-[color:var(--brand-accent)]/30"
            >
              {/* Faint corner numeral / icon wash */}
              <div className="pointer-events-none absolute -right-6 -top-6 text-[7rem] font-display leading-none text-white/[0.03]">
                {String(i + 1).padStart(2, "0")}
              </div>
              {/* Gold glow behind icon */}
              <div className="absolute -left-4 -top-4 h-24 w-24 rounded-full bg-[color:var(--brand-accent)]/10 blur-2xl transition-opacity group-hover:opacity-100 opacity-60" />

              <div className="relative flex items-start justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-xl border border-[color:var(--brand-accent)]/25 bg-[color:var(--brand-accent)]/[0.08] text-[oklch(0.86_0.10_82)]">
                  <s.icon className="h-5 w-5" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-white/30 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <div className="relative mt-5 font-display text-4xl font-light tracking-tight text-white">
                {s.value}
              </div>
              <div className="relative mt-1 text-xs font-semibold uppercase tracking-wider text-white/80">
                {s.label}
              </div>
              <div className="relative mt-1 text-[11px] text-white/40">{s.hint}</div>
            </m.div>
          );
          return s.to ? (
            <Link key={s.label} to={s.to} className="block">
              {Card}
            </Link>
          ) : (
            <div key={s.label}>{Card}</div>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md lg:col-span-2"
        >
          <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-[color:var(--brand-accent)]/[0.04] blur-3xl" />
          <div className="relative mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl italic text-white">{t("dash.recent.title")}</h2>
              <p className="text-[11px] uppercase tracking-widest text-white/40">
                {user.role === "manager"
                  ? t("dash.recent.manager")
                  : t("dash.recent.inspector")}
              </p>
            </div>
            {user.role === "manager" && (
              <Link
                to="/app/audit"
                className="text-[11px] font-bold uppercase tracking-widest text-[color:var(--brand-accent)] hover:underline"
              >
                {t("dash.recent.viewAll")}
              </Link>
            )}
          </div>
          {recentEvents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-white/40">
              {t("dash.recent.empty")}
            </div>
          ) : (
            <ul className="relative divide-y divide-white/5">
              {recentEvents.map((e) => (
                <li key={e.id} className="flex items-start gap-3 py-3">
                  <span
                    className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${severityDot(e.severity)} shadow-[0_0_8px_currentColor]`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm text-white/85">
                        <span className="font-medium">{e.actor}</span>
                        <span className="text-white/45"> · {e.action}</span>
                      </p>
                      <span className="flex-shrink-0 text-[11px] text-white/35">
                        {fmtRelative(e.at)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-white/45">{e.target}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </m.div>

        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.3 }}
          className="relative overflow-hidden rounded-2xl border border-[color:var(--brand-accent)]/20 bg-gradient-to-br from-[color:var(--brand-accent)]/[0.05] to-transparent p-6 backdrop-blur-md"
        >
          <h2 className="font-display text-2xl italic text-white">{t("dash.quick.title")}</h2>
          <p className="text-[11px] uppercase tracking-widest text-white/40">{t("dash.quick.subtitle")}</p>
          <div className="mt-5 grid grid-cols-1 gap-2">
            {actions.map((a) => (
              <Link
                key={a.label}
                to={a.to}
                className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 transition-all hover:border-[color:var(--brand-accent)]/30 hover:bg-white/[0.05]"
              >
                <div className="grid h-9 w-9 place-items-center rounded-lg border border-[color:var(--brand-accent)]/20 bg-[color:var(--brand-accent)]/[0.06] text-[oklch(0.86_0.10_82)]">
                  <a.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-white/90">{a.label}</div>
                  <div className="truncate text-[11px] text-white/40">{a.hint}</div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-white/30 opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </m.div>
      </div>
    </div>
  );
}

