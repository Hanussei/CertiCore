/**
 * Tauri boundary layer — Inspector account commands.
 * Rust mapping: inspectors_list / inspectors_upsert / inspectors_delete /
 * inspectors_toggle_seat.
 */
import { supabase } from "@/lib/supabase";
import type { Inspector, InspectorStatus, Result } from "@/types";

const KEY = "certicore.inspectors.v1";
export const SEAT_LIMIT = 12;

function uid(prefix = "u"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

export const SEED_INSPECTORS: Inspector[] = [
  {
    id: "u_layla",
    name: "Layla Al-Harbi",
    email: "layla@whocares.eng",
    phone: "+966 55 111 2222",
    region: "Riyadh",
    specialty: "Lifting Equipment",
    status: "active",
    seatAllocated: true,
    certificatesIssued: 148,
    lastActiveAt: "2026-06-30T08:12:00.000Z",
    createdAt: "2025-01-14T10:00:00.000Z",
    avatarInitials: "LA",
  },
  {
    id: "u_omar",
    name: "Omar Hadi",
    email: "omar@whocares.eng",
    phone: "+966 55 333 4444",
    region: "Jubail",
    specialty: "Pressure Systems",
    status: "active",
    seatAllocated: true,
    certificatesIssued: 92,
    lastActiveAt: "2026-06-29T16:40:00.000Z",
    createdAt: "2025-03-22T09:00:00.000Z",
    avatarInitials: "OH",
  },
  {
    id: "u_sara",
    name: "Sara Nasser",
    email: "sara@whocares.eng",
    region: "Dammam",
    specialty: "Access & Height",
    status: "active",
    seatAllocated: true,
    certificatesIssued: 61,
    lastActiveAt: "2026-06-28T11:20:00.000Z",
    createdAt: "2025-06-01T09:00:00.000Z",
    avatarInitials: "SN",
  },
  {
    id: "u_yusuf",
    name: "Yusuf Rahman",
    email: "yusuf@whocares.eng",
    region: "Jeddah",
    specialty: "Electrical",
    status: "invited",
    seatAllocated: false,
    certificatesIssued: 0,
    lastActiveAt: "2026-06-25T09:00:00.000Z",
    createdAt: "2026-06-25T09:00:00.000Z",
    avatarInitials: "YR",
  },
  {
    id: "u_farah",
    name: "Farah Idris",
    email: "farah@whocares.eng",
    region: "Riyadh",
    specialty: "Lifting Equipment",
    status: "suspended",
    seatAllocated: false,
    certificatesIssued: 34,
    lastActiveAt: "2026-04-10T14:00:00.000Z",
    createdAt: "2025-08-14T10:00:00.000Z",
    avatarInitials: "FI",
  },
];

function load(): Inspector[] {
  if (typeof window === "undefined") return SEED_INSPECTORS;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) {
    window.localStorage.setItem(KEY, JSON.stringify(SEED_INSPECTORS));
    return SEED_INSPECTORS;
  }
  try {
    return JSON.parse(raw) as Inspector[];
  } catch {
    return SEED_INSPECTORS;
  }
}

function persist(list: Inspector[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  }
}

export async function listInspectors(): Promise<Result<Inspector[]>> {
  await new Promise((r) => setTimeout(r, 120));
  return { ok: true, data: load() };
}

export type InspectorDraft = {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  region: string;
  specialty: string;
  status: InspectorStatus;
  seatAllocated: boolean;
  title?: string;
  qualification?: string;
  signatureDataUrl?: string | null;
  expiresAt?: string;
};

export async function upsertInspector(draft: InspectorDraft): Promise<Result<Inspector>> {
  await new Promise((r) => setTimeout(r, 160));
  const list = load();
  
  // Resolve active organization for binding
  const { getLicense } = await import("./license");
  const licenseRes = await getLicense();
  const organization = licenseRes.ok && licenseRes.data ? licenseRes.data.organization : "WhoCares";

  if (draft.id) {
    const idx = list.findIndex((i) => i.id === draft.id);
    if (idx < 0) return { ok: false, error: { code: "not_found", message: "Inspector not found" } };
    const next: Inspector = {
      ...list[idx],
      ...draft,
      avatarInitials: initialsFor(draft.name),
    };
    list[idx] = next;
    persist(list);

    // Sync profile name and expiry date update to Supabase
    try {
      await supabase
        .from("user_profiles")
        .update({
          name: draft.name,
          expires_at: draft.expiresAt || null,
        })
        .eq("id", draft.id);
    } catch (e) {
      console.error("Failed to sync inspector update to Supabase", e);
    }

    return { ok: true, data: next };
  }
  // enforce seat limit on create with seat
  const seatsUsed = list.filter((i) => i.seatAllocated).length;
  if (draft.seatAllocated && seatsUsed >= SEAT_LIMIT) {
    return { ok: false, error: { code: "seat_limit", message: `Seat limit of ${SEAT_LIMIT} reached.` } };
  }
  const now = new Date().toISOString();
  const created: Inspector = {
    id: uid("u"),
    name: draft.name,
    email: draft.email,
    phone: draft.phone,
    region: draft.region,
    specialty: draft.specialty,
    status: draft.status,
    seatAllocated: draft.seatAllocated,
    certificatesIssued: 0,
    lastActiveAt: now,
    createdAt: now,
    avatarInitials: initialsFor(draft.name),
    title: draft.title,
    qualification: draft.qualification,
    signatureDataUrl: draft.signatureDataUrl ?? null,
    expiresAt: draft.expiresAt,
  };

  // Create user profile row in Supabase
  try {
    // Repurpose qualification field as username prefix! Appends @ins
    const prefix = draft.qualification?.trim().toLowerCase() || "user";
    const baseUsername = `${prefix}@ins`;
    
    const { hashAnswer } = await import("./auth");
    const defaultPasswordHash = await hashAnswer("1234");

    const { data: dbUser, error: dbErr } = await supabase
      .from("user_profiles")
      .insert({
        username: baseUsername,
        name: draft.name,
        password_hash: defaultPasswordHash,
        role: "inspector",
        organization: organization,
        force_password_change: true,
        expires_at: draft.expiresAt || null,
      })
      .select()
      .single();

    if (dbErr) {
      console.error("Failed to insert user profile in Supabase", dbErr);
      return { ok: false, error: { code: "db_error", message: `Failed to create inspector in cloud: ${dbErr.message}` } };
    }
    
    // Bind the generated UUID to the local ID
    created.id = dbUser.id;
  } catch (e: any) {
    return { ok: false, error: { code: "exception", message: e.message || "Failed to reach database server." } };
  }

  list.push(created);
  persist(list);
  return { ok: true, data: created };
}

export async function deleteInspector(id: string): Promise<Result<true>> {
  await new Promise((r) => setTimeout(r, 100));
  persist(load().filter((i) => i.id !== id));
  
  // Sync deletion to Supabase
  try {
    await supabase
      .from("user_profiles")
      .delete()
      .eq("id", id);
  } catch (e) {
    console.error("Failed to delete user profile from Supabase", e);
  }

  return { ok: true, data: true };
}

export async function toggleSeat(id: string): Promise<Result<Inspector>> {
  const list = load();
  const idx = list.findIndex((i) => i.id === id);
  if (idx < 0) return { ok: false, error: { code: "not_found", message: "Inspector not found" } };
  const target = list[idx];
  if (!target.seatAllocated) {
    const used = list.filter((i) => i.seatAllocated).length;
    if (used >= SEAT_LIMIT) return { ok: false, error: { code: "seat_limit", message: `Seat limit of ${SEAT_LIMIT} reached.` } };
  }
  list[idx] = { ...target, seatAllocated: !target.seatAllocated };
  persist(list);
  return { ok: true, data: list[idx] };
}
