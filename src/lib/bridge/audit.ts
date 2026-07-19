/**
 * Tauri boundary layer — Audit Log commands.
 * Rust mapping: audit_list / audit_append.
 *
 * Prototype persists to localStorage; Rust impl will append to a
 * tamper-evident hash-chained log file on disk.
 */
import type { AuditEvent, Result } from "@/types";

const KEY = "certicore.audit.v1";

function uid(): string {
  return `evt_${Math.random().toString(36).slice(2, 10)}`;
}

function iso(daysAgo: number, h = 9, m = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export const SEED_AUDIT: AuditEvent[] = [
  { id: uid(), actor: "H. Al-Rashid", actorRole: "manager", action: "Signed in", target: "session", severity: "info", category: "auth", ip: "10.0.4.22", at: iso(0, 8, 5) },
  { id: uid(), actor: "H. Al-Rashid", actorRole: "manager", action: "Updated branding", target: "Primary color, footer text", severity: "success", category: "branding", detail: "primaryColor changed from oklch(0.22 …) → oklch(0.20 …)", at: iso(0, 8, 22) },
  { id: uid(), actor: "Layla Al-Harbi", actorRole: "inspector", action: "Issued certificate", target: "CERT-2026-0812 · Lifting Gear", severity: "success", category: "certificate", at: iso(0, 10, 41) },
  { id: uid(), actor: "Omar Hadi", actorRole: "inspector", action: "Uploaded media", target: "Pressure vessel plate.jpg", severity: "info", category: "media", at: iso(0, 11, 12) },
  { id: uid(), actor: "H. Al-Rashid", actorRole: "manager", action: "Suspended inspector", target: "Farah Idris", severity: "warning", category: "user", detail: "Reason: extended leave", at: iso(1, 14, 30) },
  { id: uid(), actor: "H. Al-Rashid", actorRole: "manager", action: "Published template", target: "Lifting Gear Inspection v3", severity: "success", category: "template", at: iso(1, 15, 0) },
  { id: uid(), actor: "Sara Nasser", actorRole: "inspector", action: "Failed sign-in", target: "session", severity: "warning", category: "auth", ip: "10.0.4.88", detail: "3 attempts, wrong password", at: iso(1, 7, 55) },
  { id: uid(), actor: "System", actorRole: "manager", action: "License validated", target: "Activation code ****-9F2A", severity: "info", category: "system", at: iso(2, 6, 0) },
  { id: uid(), actor: "H. Al-Rashid", actorRole: "manager", action: "Invited inspector", target: "yusuf@whocares.eng", severity: "info", category: "user", at: iso(2, 9, 30) },
  { id: uid(), actor: "Layla Al-Harbi", actorRole: "inspector", action: "Deleted draft", target: "Draft #2026-0641", severity: "warning", category: "certificate", at: iso(3, 13, 12) },
  { id: uid(), actor: "System", actorRole: "manager", action: "Backup completed", target: "AppData/certicore/backups/", severity: "success", category: "system", at: iso(4, 2, 0) },
  { id: uid(), actor: "H. Al-Rashid", actorRole: "manager", action: "Rotated signature key", target: "Manager signing key", severity: "critical", category: "system", detail: "Previous key revoked. All future certificates use new key.", at: iso(6, 11, 0) },
];

function load(): AuditEvent[] {
  if (typeof window === "undefined") return SEED_AUDIT;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) {
    window.localStorage.setItem(KEY, JSON.stringify(SEED_AUDIT));
    return SEED_AUDIT;
  }
  try {
    return JSON.parse(raw) as AuditEvent[];
  } catch {
    return SEED_AUDIT;
  }
}

export async function listAudit(): Promise<Result<AuditEvent[]>> {
  await new Promise((r) => setTimeout(r, 120));
  const list = [...load()].sort((a, b) => (a.at < b.at ? 1 : -1));
  return { ok: true, data: list };
}
