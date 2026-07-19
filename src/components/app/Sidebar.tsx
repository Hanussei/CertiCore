import { Link, useRouterState } from "@tanstack/react-router";
import { m } from "framer-motion";
import * as Icons from "lucide-react";
import { NAV_BY_ROLE, NAV_SECTION_ORDER, type NavSectionKey } from "@/lib/nav";
import { useAuthStore } from "@/stores/auth";
import { useUIStore } from "@/stores/ui";
import { useLicenseStore } from "@/stores/license";
import { useBrandingStore } from "@/stores/branding";
import { useT } from "@/hooks/use-t";
import { cn } from "@/lib/utils";

type LucideKey = keyof typeof Icons;

const SECTION_ICON: Record<NavSectionKey, LucideKey> = {
  operations: "Compass",
  library: "Library",
  admin: "ShieldCheck",
};

export function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);
  const license = useLicenseStore((s) => s.license);
  const branding = useBrandingStore((s) => s.branding);
  const t = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!user) return null;
  const items = NAV_BY_ROLE[user.role];

  const grouped = NAV_SECTION_ORDER.map((key) => ({
    key,
    items: items.filter((i) => i.section === key),
  })).filter((g) => g.items.length > 0);

  const orgInitial =
    (branding.organizationName || t("app.name")).trim().charAt(0).toUpperCase() || "C";

  return (
    <m.aside
      initial={false}
      animate={{ width: collapsed ? 76 : 268 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      className="relative flex h-full shrink-0 flex-col border-r border-white/5 bg-white/[0.02] backdrop-blur-xl"
    >
      {/* Brand + org identity */}
      <div className="flex h-20 items-center gap-3 px-5">
        <div
          className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl border"
          style={{
            borderColor: "color-mix(in oklch, var(--brand-accent) 30%, transparent)",
            background:
              "linear-gradient(135deg, color-mix(in oklch, var(--brand-accent) 25%, transparent), transparent)",
            boxShadow: "0 0 20px color-mix(in oklch, var(--brand-accent) 25%, transparent)",
          }}
        >
          {branding.logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoDataUrl} alt="" className="h-full w-full object-contain p-1" />
          ) : (
            <img src="/logo.png" alt="" className="h-full w-full object-contain p-1" />
          )}
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div
              className="truncate font-display text-lg font-semibold tracking-tight"
              style={{ color: "var(--brand-accent)" }}
            >
              {branding.organizationName || t("app.name")}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="truncate text-[9px] uppercase tracking-[0.25em] text-white/40">
                {user.role === "manager" ? t("auth.role.manager") : t("auth.role.inspector")}
              </span>
              {license && (
                <span
                  className="rounded-sm border px-1 py-[1px] text-[8px] font-bold uppercase tracking-[0.2em]"
                  style={{
                    borderColor: "color-mix(in oklch, var(--brand-accent) 35%, transparent)",
                    color: "var(--brand-accent)",
                    backgroundColor: "color-mix(in oklch, var(--brand-accent) 8%, transparent)",
                  }}
                >
                  {t(`license.tier.${license.tier}`)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mx-4 h-px bg-white/5" />

      <nav className="flex-1 space-y-4 overflow-y-auto p-3 no-scrollbar">
        {grouped.map((group) => {
          const SectionIcon = (Icons[SECTION_ICON[group.key]] ?? Icons.Circle) as Icons.LucideIcon;
          return (
            <div key={group.key}>
              {!collapsed ? (
                <div className="mb-1.5 flex items-center gap-2 px-3">
                  <SectionIcon className="h-3 w-3 text-white/25" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-white/35">
                    {t(`nav.section.${group.key}`)}
                  </span>
                  <div className="h-px flex-1 bg-white/5" />
                </div>
              ) : (
                <div className="mx-3 mb-1 h-px bg-white/5" />
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = (Icons[item.icon as LucideKey] ?? Icons.Circle) as Icons.LucideIcon;
                  const active = pathname === item.to || pathname.startsWith(item.to + "/");
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      style={
                        active
                          ? {
                              borderColor: "color-mix(in oklch, var(--brand-accent) 28%, transparent)",
                              backgroundColor: "color-mix(in oklch, var(--brand-accent) 10%, transparent)",
                              color: "var(--brand-accent)",
                              boxShadow: "0 0 20px color-mix(in oklch, var(--brand-accent) 12%, transparent)",
                            }
                          : undefined
                      }
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
                        active
                          ? ""
                          : "border-transparent text-white/55 hover:bg-white/[0.04] hover:text-white/85",
                      )}
                    >
                      {active && (
                        <m.span
                          layoutId="sidebar-active-rail"
                          className="absolute left-0 top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-full"
                          style={{
                            backgroundColor: "var(--brand-accent)",
                            boxShadow: "0 0 10px var(--brand-accent)",
                          }}
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <Icon
                        className="h-4 w-4 shrink-0"
                        style={
                          active
                            ? { filter: "drop-shadow(0 0 6px color-mix(in oklch, var(--brand-accent) 55%, transparent))" }
                            : undefined
                        }
                      />
                      {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
                      {active && !collapsed && (
                        <span
                          className="ml-auto h-1.5 w-1.5 rounded-full"
                          style={{
                            backgroundColor: "var(--brand-accent)",
                            boxShadow: "0 0 8px var(--brand-accent)",
                          }}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User pod */}
      {!collapsed && (
        <div className="mx-3 mb-2 rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <div className="flex items-center gap-3">
            <div
              className="grid h-9 w-9 place-items-center rounded-full text-xs font-bold text-[oklch(0.13_0.04_260)]"
              style={{
                background:
                  "linear-gradient(135deg, var(--brand-accent), color-mix(in oklch, var(--brand-accent) 65%, #000))",
              }}
            >
              {user.avatarInitials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-white/90">{user.name}</div>
              <div className="truncate text-[10px] uppercase tracking-[0.2em] text-white/40">
                {user.role === "manager" ? t("auth.role.manager") : t("auth.role.inspector")}
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={toggle}
        aria-label={t("top.collapse")}
        className="m-3 flex items-center justify-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] py-2 text-[11px] uppercase tracking-widest text-white/40 transition-colors hover:bg-white/[0.05] hover:text-white/70"
      >
        {collapsed ? (
          <Icons.ChevronRight className="h-4 w-4" />
        ) : (
          <>
            <Icons.ChevronLeft className="h-4 w-4" />
            <span>{t("top.collapse")}</span>
          </>
        )}
      </button>
    </m.aside>
  );
}
