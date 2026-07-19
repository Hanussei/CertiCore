import type { NavItem, Role } from "@/types";

export type NavSectionKey = "operations" | "library" | "admin";

export type NavItemWithSection = NavItem & { section: NavSectionKey };

export const NAV_SECTION_ORDER: NavSectionKey[] = ["operations", "library", "admin"];

export const NAV_BY_ROLE: Record<Role, NavItemWithSection[]> = {
  manager: [
    { section: "operations", to: "/app/dashboard",    labelKey: "nav.dashboard",    icon: "LayoutDashboard" },
    { section: "operations", to: "/app/certificates", labelKey: "nav.certificates", icon: "FileBadge" },
    { section: "operations", to: "/app/rbi",          labelKey: "nav.rbi",          icon: "ShieldAlert" },
    { section: "operations", to: "/app/reports",      labelKey: "nav.reports",      icon: "BarChart3" },
    { section: "library",    to: "/app/media",        labelKey: "nav.media",        icon: "Images" },
    { section: "library",    to: "/app/templates",    labelKey: "nav.templates",    icon: "FileStack" },
    { section: "library",    to: "/app/branding",     labelKey: "nav.branding",     icon: "Palette" },
    { section: "library",    to: "/app/ndt-import",   labelKey: "nav.ndtImport",    icon: "Cable" },
    { section: "admin",      to: "/app/publish",      labelKey: "nav.publish",      icon: "QrCode" },
    { section: "admin",      to: "/app/users",        labelKey: "nav.users",        icon: "Users" },
    { section: "admin",      to: "/app/audit",        labelKey: "nav.audit",        icon: "ScrollText" },
    { section: "admin",      to: "/app/settings",     labelKey: "nav.settings",     icon: "Settings" },
  ],
  inspector: [
    { section: "operations", to: "/app/dashboard",    labelKey: "nav.dashboard",    icon: "LayoutDashboard" },
    { section: "operations", to: "/app/inspections",  labelKey: "nav.inspections",  icon: "ClipboardCheck" },
    { section: "operations", to: "/app/drafts",       labelKey: "nav.drafts",       icon: "FileClock" },
    { section: "operations", to: "/app/certificates", labelKey: "nav.certificates", icon: "FileBadge" },
    { section: "operations", to: "/app/rbi",          labelKey: "nav.rbi",          icon: "ShieldAlert" },
    { section: "library",    to: "/app/equipment",    labelKey: "nav.equipment",    icon: "HardHat" },
    { section: "library",    to: "/app/ndt-import",   labelKey: "nav.ndtImport",    icon: "Cable" },
    { section: "admin",      to: "/app/settings",     labelKey: "nav.settings",     icon: "Settings" },
  ],
};
