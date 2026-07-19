/**
 * Tauri boundary layer — Inspection drafts + issued certificates.
 * Rust mapping: inspections_drafts_list / inspections_drafts_upsert /
 * inspections_drafts_delete / certificates_list / certificates_issue.
 */
import type {
  CertificateResult,
  ChecklistItem,
  Defect,
  EquipmentCategory,
  EquipmentSpec,
  InspectionDraft,
  InspectionFieldValue,
  IssuedCertificate,
  NdtRecord,
  Result,
} from "@/types";

import { pushToOutbox } from "./supabase-sync";

const DRAFT_KEY = "certicore.drafts.v3";
const CERT_KEY = "certicore.certificates.v3";

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function certNumber(): string {
  const y = new Date().getFullYear();
  const n = Math.floor(1000 + Math.random() * 9000);
  return `CERT-${y}-${n}`;
}

function hash(payload: unknown): string {
  const s = JSON.stringify(payload);
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return `sha:${(h >>> 0).toString(16).padStart(8, "0")}`;
}

function iso(daysAhead: number, hours = 9): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hours, 0, 0, 0);
  return d.toISOString();
}

/* ----- Seed dossier samples ------------------------------------- */

const SEED_CHECKLIST_HOIST: ChecklistItem[] = [
  { id: "ci_h1", clause: "BS 7121-2 §5.2", standardId: "std_bs_7121", question: "Structure free from cracks, distortion and corrosion?", verdict: "pass", note: "Cross-girders sound; light surface rust noted at east end-carriage.", photoIds: [] },
  { id: "ci_h2", clause: "ISO 4309 §4.2.1", standardId: "std_iso_4309", question: "Wire rope: broken wires below discard threshold over 6d and 30d lengths?", verdict: "pass", note: "3 broken wires observed over 6d — well below discard.", photoIds: [] },
  { id: "ci_h3", clause: "BS 7121-2 §6.6", standardId: "std_bs_7121", question: "Hoist brake holds rated load without perceptible slip?", verdict: "pass", note: "0 mm slip over 5 min at 100 % SWL.", photoIds: [] },
  { id: "ci_h4", clause: "BS 7121-2 §6.4", standardId: "std_bs_7121", question: "Upper / lower hoist limit switches trip at correct positions?", verdict: "pass", note: "Trip within 40 mm of set-point.", photoIds: [] },
  { id: "ci_h5", clause: "BS 7121-2 §7", standardId: "std_bs_7121", question: "Proof load test at 125 % SWL where scheduled?", verdict: "pass", note: "6.25 t held for 10 min, no permanent deformation.", photoIds: [] },
];

const SEED_NDT_HOIST: NdtRecord[] = [
  {
    id: "nd_h1",
    method: "VT",
    area: "Full structure — girders, end carriages, hook block",
    technician: "Layla Al-Harbi",
    technicianCertRef: "PCN VT Level II — VT-4412",
    testEquipmentId: null,
    acceptanceCriteria: "ISO 17637 — no cracks; surface defects within tolerance",
    measuredResult: "No relevant indications",
    verdict: "pass",
    performedAt: iso(-2, 9),
    notes: "Photographed both girder-to-endcarriage welds.",
    photoIds: [],
    reportRef: "NDT-VT-2026-0182",
  },
  {
    id: "nd_h2",
    method: "MPI",
    area: "Hook shank & saddle radius",
    technician: "Rami Fadel",
    technicianCertRef: "PCN MT Level II — MT-2201",
    testEquipmentId: "te_mpi_yoke",
    acceptanceCriteria: "ISO 3059 & EN ISO 23277 — no linear indications > 2 mm",
    measuredResult: "No linear indications; two rounded indications ≤ 1.4 mm (acceptable)",
    verdict: "pass",
    performedAt: iso(-2, 11),
    notes: "AC yoke, 8 lb lift verified prior to test.",
    photoIds: [],
    reportRef: "NDT-MPI-2026-0182",
  },
  {
    id: "nd_h3",
    method: "LOAD_TEST",
    area: "Full hoist — 125 % SWL proof load",
    technician: "Layla Al-Harbi",
    technicianCertRef: "PCN VT Level II — VT-4412",
    testEquipmentId: "te_dyno_5t",
    acceptanceCriteria: "BS 7121-2 §7 — no permanent deformation, brake slip = 0",
    measuredResult: "Load held 10 min · deflection recovered fully · brake slip 0 mm",
    verdict: "pass",
    performedAt: iso(-2, 14),
    notes: "Test weight 6,250 kg via calibrated water bag + dynamometer.",
    photoIds: [],
    reportRef: "LT-2026-0182",
  },
];

const SEED_DEFECTS_HOIST: Defect[] = [
  {
    id: "df_h1",
    description: "Light surface rust on east end-carriage web (approx 200 × 400 mm).",
    location: "East end-carriage, outer face",
    severity: "minor",
    remedialAction: "Wire-brush, apply zinc-rich primer, top-coat with equipment yellow.",
    deadline: iso(60, 9),
    photoIds: [],
    status: "open",
  },
];

const SEED_DRAFTS: InspectionDraft[] = [
  {
    id: "drf_scaffold",
    equipmentId: "eq_scaffold_04",
    templateId: "tpl_scaffold",
    inspectorId: "u_sara",
    inspectorName: "Sara Nasser",
    answers: {},
    photos: [],
    step: 1,
    createdAt: iso(-1, 15),
    updatedAt: iso(-1, 15),
    checklist: [],
    ndt: [],
    defects: [],
    testEquipmentIds: [],
  },
  {
    id: "drf_sling",
    equipmentId: "eq_sling_02",
    templateId: "tpl_lifting_gear",
    inspectorId: "u_layla",
    inspectorName: "Layla Al-Harbi",
    answers: {},
    photos: [],
    step: 0,
    createdAt: iso(0, 8),
    updatedAt: iso(0, 10),
    checklist: [],
    ndt: [],
    defects: [],
    testEquipmentIds: [],
  },
];

const SEED_CERTS: IssuedCertificate[] = [
  {
    id: "CERT-2026-0812",
    equipmentId: "eq_hoist_01",
    equipmentTag: "WHO-LG-0184",
    equipmentName: "Overhead hoist — bay 4",
    equipmentCategory: "overhead_crane",
    templateId: "tpl_overhead_crane",
    templateName: "Overhead / Gantry Crane — Thorough Examination",
    inspectorId: "u_layla",
    inspectorName: "Layla Al-Harbi",
    result: "pass",
    answers: {},
    photos: ["m_hoist"],
    issuedAt: iso(-2, 10),
    validUntil: iso(178, 10),
    hash: "sha:9f2a11c8",
    standardIds: ["std_bs_7121", "std_iso_4309"],
    spec: {
      ratedCapacity: "5,000 kg",
      dutyClass: "FEM 2m / ISO M5",
      yearOfManufacture: "2019",
      countryOfOrigin: "Germany",
      designStandard: "EN 14492-2",
      material: "Structural steel S355",
      dimensions: "Span 12.4 m · lift 8 m",
      weightKg: "820",
      powerRating: "7.5 kW · 3ph 415 V",
    } satisfies EquipmentSpec,
    checklist: SEED_CHECKLIST_HOIST,
    ndt: SEED_NDT_HOIST,
    defects: SEED_DEFECTS_HOIST,
    testEquipmentIds: ["te_dyno_5t", "te_mpi_yoke"],
  },
  {
    id: "CERT-2026-0804",
    equipmentId: "eq_vessel_03",
    equipmentTag: "WHO-PV-0044",
    equipmentName: "Nitrogen buffer vessel V-204",
    equipmentCategory: "pressure_vessel",
    templateId: "tpl_pressure_vessel",
    templateName: "Pressure Vessel — Written Scheme of Examination",
    inspectorId: "u_omar",
    inspectorName: "Omar Hadi",
    result: "conditional",
    answers: {},
    photos: ["m_vessel"],
    issuedAt: iso(-9, 11),
    validUntil: iso(171, 11),
    hash: "sha:33c4a2df",
    standardIds: ["std_psr_2000"],
    spec: {
      ratedCapacity: "PS 18 bar · V 2.4 m³",
      dutyClass: "PED Cat III · Fluid Group 2",
      yearOfManufacture: "2016",
      countryOfOrigin: "Italy",
      designStandard: "EN 13445-3",
      material: "SA-516 Gr.70 · shell 12 mm · heads 14 mm",
      dimensions: "Ø 1,200 mm · L 2,150 mm T/T",
      weightKg: "1,140",
      powerRating: "N₂ service · design temp −10 / +80 °C",
    } satisfies EquipmentSpec,
    checklist: [
      { id: "ci_v1", clause: "PSSR §7", standardId: "std_psr_2000", question: "External shell, heads and nozzles free from corrosion, dents or blistering?", verdict: "pass", note: "Insulation cladding intact; spot-checks at 4 clock positions show sound paint film.", photoIds: [] },
      { id: "ci_v2", clause: "EN 13445-5 §5", standardId: "std_psr_2000", question: "Wall-thickness UT within design allowance across shell, heads and nozzle necks?", verdict: "pass", note: "Minimum 11.4 mm on lower shell (design min 10.8 mm). See NDT UT-2026-0177.", photoIds: [] },
      { id: "ci_v3", clause: "PSSR §9", standardId: "std_psr_2000", question: "Pressure safety valve in-date, sealed and set to correct set-pressure?", verdict: "fail", note: "PSV-204A cert expired 14 days ago. Isolated pending swap-out with calibrated spare.", photoIds: [] },
      { id: "ci_v4", clause: "PSSR §8", standardId: "std_psr_2000", question: "Pressure gauge legible, in-date and reading zero at atmosphere?", verdict: "pass", note: "0–25 bar gauge, cal sticker valid to Nov 2026.", photoIds: [] },
      { id: "ci_v5", clause: "EN 13445-5 §9", standardId: "std_psr_2000", question: "Hydrostatic test at 1.43 × PS held without leakage or permanent deformation?", verdict: "pass", note: "25.7 bar held 30 min · pressure drop 0.05 bar (within instrument tolerance).", photoIds: [] },
      { id: "ci_v6", clause: "PSSR §11", standardId: "std_psr_2000", question: "Nameplate legible with PS, PT, V, year and manufacturer's mark?", verdict: "pass", note: "Stamped nameplate on skirt, all fields legible.", photoIds: [] },
    ],
    ndt: [
      {
        id: "nd_v1", method: "THICKNESS_UT",
        area: "Shell (36 points, 4 elevations × 9 clock) · both heads (5 points each) · N1–N4 nozzle necks",
        technician: "Omar Hadi", technicianCertRef: "PCN UT Level II — UT-3318",
        testEquipmentId: "te_ut_thickness",
        acceptanceCriteria: "EN 13445-5 §5 — no reading below design minimum 10.8 mm (shell) / 12.6 mm (heads)",
        measuredResult: "Shell min 11.4 mm @ 6 o'clock lower course · heads min 13.1 mm · nozzles ≥ 8.2 mm (design 7.8)",
        verdict: "pass", performedAt: iso(-9, 9), notes: "Couplant glycerine; probe 5 MHz twin-crystal; surface prepared by wire brush.",
        photoIds: [], reportRef: "UT-2026-0177",
      },
      {
        id: "nd_v2", method: "HYDRO",
        area: "Full vessel — shell, heads, nozzles up to first isolation",
        technician: "Omar Hadi", technicianCertRef: "PCN UT Level II — UT-3318",
        testEquipmentId: "te_hydro_pump",
        acceptanceCriteria: "EN 13445-5 §9 — 1.43 × PS = 25.7 bar, 30 min hold, no leakage / no permanent set",
        measuredResult: "25.74 bar held 30 min · drop 0.05 bar · no weeping at welds / gaskets / bosses",
        verdict: "pass", performedAt: iso(-9, 13), notes: "Test water 12 °C, vessel vented at top before pressurisation. Chart recorder trace attached.",
        photoIds: [], reportRef: "HT-2026-0044",
      },
      {
        id: "nd_v3", method: "MPI",
        area: "N1 inlet nozzle-to-shell fillet weld · both head-to-shell circumferential seams",
        technician: "Rami Fadel", technicianCertRef: "PCN MT Level II — MT-2201",
        testEquipmentId: "te_mpi_yoke",
        acceptanceCriteria: "EN ISO 23278 acceptance level 2X — no linear indications, no cracks",
        measuredResult: "No relevant indications on all three welds",
        verdict: "pass", performedAt: iso(-9, 15), notes: "AC yoke, black-on-white contrast, wet fluorescent not required for external surface.",
        photoIds: [], reportRef: "MT-2026-0091",
      },
    ],
    defects: [
      {
        id: "df_v1",
        description: "PSV-204A safety valve calibration certificate expired (14 days overdue). Valve isolated and tagged.",
        location: "Top head — safety valve tapping N4",
        severity: "major",
        remedialAction: "Fit calibrated spare PSV set to 18 bar, witness re-seal, update PSV register before vessel is returned to service.",
        deadline: iso(14, 9),
        photoIds: [],
        status: "open",
      },
      {
        id: "df_v2",
        description: "Minor paint blistering (approx 120 × 80 mm) on lower saddle support, no metal loss.",
        location: "South saddle — outer face at grout line",
        severity: "minor",
        remedialAction: "Wire-brush to sound substrate, apply 2-pack epoxy primer + top-coat matching vessel scheme.",
        deadline: iso(45, 9),
        photoIds: [],
        status: "open",
      },
    ],
    testEquipmentIds: ["te_ut_thickness", "te_hydro_pump", "te_mpi_yoke"],
  },
  {
    id: "CERT-2026-0788",
    equipmentId: "eq_gantry_05",
    equipmentTag: "WHO-LG-0233",
    equipmentName: "Gantry crane rail A — bay 2",
    equipmentCategory: "overhead_crane",
    templateId: "tpl_overhead_crane",
    templateName: "Overhead / Gantry Crane — Thorough Examination",
    inspectorId: "u_layla",
    inspectorName: "Layla Al-Harbi",
    result: "pass",
    answers: {},
    photos: [],
    issuedAt: iso(-25, 14),
    validUntil: iso(155, 14),
    hash: "sha:71bd0e42",
    standardIds: ["std_bs_7121", "std_iso_4309"],
    spec: {
      ratedCapacity: "10,000 kg",
      dutyClass: "FEM 3m / ISO M6",
      yearOfManufacture: "2021",
      countryOfOrigin: "Spain",
      designStandard: "EN 15011",
      material: "Box-girder S355J2 · rail A55",
      dimensions: "Span 18.6 m · lift 12 m · runway 42 m",
      weightKg: "6,400",
      powerRating: "22 kW hoist · 2 × 3 kW LT · 3ph 415 V",
    } satisfies EquipmentSpec,
    checklist: [
      { id: "ci_g1", clause: "BS 7121-2 §5.2", standardId: "std_bs_7121", question: "Runway rails aligned, level and free from wear beyond ISO 12488 tolerance?", verdict: "pass", note: "Laser survey: max deviation 3 mm over 42 m (limit 6 mm).", photoIds: [] },
      { id: "ci_g2", clause: "BS 7121-2 §5.5", standardId: "std_bs_7121", question: "End stops and buffers in place, energy-absorbing and secured?", verdict: "pass", note: "Cellular polyurethane buffers both ends, bolts torqued and marked.", photoIds: [] },
      { id: "ci_g3", clause: "ISO 4309 §4.2.1", standardId: "std_iso_4309", question: "Wire rope inspection — broken wires, wear, corrosion, deformation within limits?", verdict: "pass", note: "5 broken wires over 6d (limit 10); no valley breaks; light lubrication applied.", photoIds: [] },
      { id: "ci_g4", clause: "BS 7121-2 §6.6", standardId: "std_bs_7121", question: "Hoist and long-travel brakes hold rated load with no slip?", verdict: "pass", note: "0 mm slip at 100% SWL, 5 min hold. LT brakes release cleanly.", photoIds: [] },
      { id: "ci_g5", clause: "BS 7121-2 §6.4", standardId: "std_bs_7121", question: "Upper hoist limit, slack-rope limit and overload cut-out functional?", verdict: "pass", note: "Overload trip verified at 110% SWL (setpoint 110 ±2%).", photoIds: [] },
      { id: "ci_g6", clause: "BS 7121-2 §7", standardId: "std_bs_7121", question: "Proof-load test at 125% SWL — no permanent deformation of structure or trolley?", verdict: "pass", note: "12,500 kg test load, deflection 14 mm at mid-span (recovered fully).", photoIds: [] },
      { id: "ci_g7", clause: "BS 7121-2 §8", standardId: "std_bs_7121", question: "Earth-bond continuity ≤ 0.5 Ω, insulation resistance ≥ 1 MΩ?", verdict: "pass", note: "Bond 0.18 Ω · IR 220 MΩ @ 500 V DC.", photoIds: [] },
    ],
    ndt: [
      {
        id: "nd_g1", method: "VT",
        area: "Both box girders, end carriages, trolley frame, rope drum brackets",
        technician: "Layla Al-Harbi", technicianCertRef: "PCN VT Level II — VT-4412",
        testEquipmentId: null,
        acceptanceCriteria: "ISO 17637 — no cracks, no through-corrosion, welds sound",
        measuredResult: "No relevant indications",
        verdict: "pass", performedAt: iso(-25, 10), notes: "Access via cherry-picker; adequate light > 500 lx confirmed.",
        photoIds: [], reportRef: "VT-2026-0166",
      },
      {
        id: "nd_g2", method: "MPI",
        area: "Hook shank, saddle radius, trunnion pins",
        technician: "Rami Fadel", technicianCertRef: "PCN MT Level II — MT-2201",
        testEquipmentId: "te_mpi_yoke",
        acceptanceCriteria: "EN ISO 23277 — no linear indications > 2 mm",
        measuredResult: "No linear indications; one rounded indication 1.1 mm (acceptable)",
        verdict: "pass", performedAt: iso(-25, 12), notes: "AC yoke, contrast paint applied and removed after test.",
        photoIds: [], reportRef: "MT-2026-0088",
      },
      {
        id: "nd_g3", method: "LOAD_TEST",
        area: "Full crane — 125% SWL proof load at mid-span and at each column",
        technician: "Layla Al-Harbi", technicianCertRef: "PCN VT Level II — VT-4412",
        testEquipmentId: "te_dyno_5t",
        acceptanceCriteria: "BS 7121-2 §7 — no permanent deformation, brake slip 0",
        measuredResult: "Deflection mid-span 14 mm (recovered), brake slip 0 mm, no yielding observed",
        verdict: "pass", performedAt: iso(-25, 14), notes: "12.5 t via calibrated dynamometer and certified test weights.",
        photoIds: [], reportRef: "LT-2026-0166",
      },
      {
        id: "nd_g4", method: "INSULATION",
        area: "Hoist motor, LT motors, festoon supply",
        technician: "Karim Youssef", technicianCertRef: "City & Guilds 2391 — 44872",
        testEquipmentId: null,
        acceptanceCriteria: "BS 7671 — IR ≥ 1 MΩ @ 500 V DC · earth continuity ≤ 0.5 Ω",
        measuredResult: "IR 220 MΩ · earth bond 0.18 Ω",
        verdict: "pass", performedAt: iso(-25, 15), notes: "Motors isolated and locked-off before test.",
        photoIds: [], reportRef: "EL-2026-0044",
      },
    ],
    defects: [],
    testEquipmentIds: ["te_dyno_5t", "te_mpi_yoke"],
  },
];

function loadDrafts(): InspectionDraft[] {
  if (typeof window === "undefined") return SEED_DRAFTS;
  const raw = window.localStorage.getItem(DRAFT_KEY);
  if (!raw) {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(SEED_DRAFTS));
    return SEED_DRAFTS;
  }
  try {
    return JSON.parse(raw) as InspectionDraft[];
  } catch {
    return SEED_DRAFTS;
  }
}

function persistDrafts(list: InspectionDraft[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(DRAFT_KEY, JSON.stringify(list));
}

function loadCerts(): IssuedCertificate[] {
  if (typeof window === "undefined") return SEED_CERTS;
  const raw = window.localStorage.getItem(CERT_KEY);
  if (!raw) {
    window.localStorage.setItem(CERT_KEY, JSON.stringify(SEED_CERTS));
    return SEED_CERTS;
  }
  try {
    return JSON.parse(raw) as IssuedCertificate[];
  } catch {
    return SEED_CERTS;
  }
}

function persistCerts(list: IssuedCertificate[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(CERT_KEY, JSON.stringify(list));
}

// Drafts
export async function listDrafts(): Promise<Result<InspectionDraft[]>> {
  await new Promise((r) => setTimeout(r, 100));
  return { ok: true, data: loadDrafts() };
}

export async function upsertDraft(draft: InspectionDraft): Promise<Result<InspectionDraft>> {
  const list = loadDrafts();
  const idx = list.findIndex((d) => d.id === draft.id);
  const next: InspectionDraft = { ...draft, updatedAt: new Date().toISOString() };
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  persistDrafts(list);
  return { ok: true, data: next };
}

export async function deleteDraft(id: string): Promise<Result<true>> {
  persistDrafts(loadDrafts().filter((d) => d.id !== id));
  return { ok: true, data: true };
}

export function makeDraft(
  equipmentId: string,
  templateId: string,
  inspectorId: string,
  inspectorName: string,
): InspectionDraft {
  const now = new Date().toISOString();
  return {
    id: uid("drf"),
    equipmentId,
    templateId,
    inspectorId,
    inspectorName,
    answers: {},
    photos: [],
    step: 0,
    createdAt: now,
    updatedAt: now,
    checklist: [],
    ndt: [],
    defects: [],
    testEquipmentIds: [],
  };
}

/* -------- Blank record factories for the wizard ---------------- */

export function makeNdtRecord(): NdtRecord {
  return {
    id: uid("nd"),
    method: "VT",
    area: "",
    technician: "",
    technicianCertRef: "",
    testEquipmentId: null,
    acceptanceCriteria: "",
    measuredResult: "",
    verdict: "na",
    performedAt: new Date().toISOString(),
    notes: "",
    photoIds: [],
    reportRef: "",
  };
}

export function makeDefect(): Defect {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return {
    id: uid("df"),
    description: "",
    location: "",
    severity: "minor",
    remedialAction: "",
    deadline: d.toISOString(),
    photoIds: [],
    status: "open",
  };
}

// Certificates
export async function listCertificates(): Promise<Result<IssuedCertificate[]>> {
  await new Promise((r) => setTimeout(r, 120));
  const list = [...loadCerts()].sort((a, b) => (a.issuedAt < b.issuedAt ? 1 : -1));
  return { ok: true, data: list };
}

export type IssueInput = {
  draft: InspectionDraft;
  equipmentTag: string;
  equipmentName: string;
  equipmentCategory?: EquipmentCategory;
  spec?: EquipmentSpec;
  templateName: string;
  standardIds?: string[];
  result: CertificateResult;
  answers: Record<string, InspectionFieldValue>;
  checklist?: ChecklistItem[];
  ndt?: NdtRecord[];
  defects?: Defect[];
  testEquipmentIds?: string[];
  validForDays: number;
};

export async function issueCertificate(input: IssueInput): Promise<Result<IssuedCertificate>> {
  const now = new Date();
  
  // 1. Get active license for company prefix
  const { getLicense } = await import("./license");
  const activeLicenseRes = await getLicense();
  const activeLicense = activeLicenseRes.ok ? activeLicenseRes.data : null;
  const companyCode = activeLicense ? activeLicense.organization.slice(0, 3).toUpperCase() : "GEN";

  // 2. Get inspector initials
  const inspectorInitials = input.draft.inspectorName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "IN";

  // 3. Get month formatted
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  // 4. Determine unique counter sequence
  let localMax = 0;
  try {
    const localCerts = loadCerts();
    const currentMonthPattern = `${companyCode}-${inspectorInitials}-${month}-`;
    const localSeqs = localCerts
      .filter((c) => c && c.id && c.id.startsWith(currentMonthPattern))
      .map((c) => {
        const parts = c.id.split("-");
        const val = parseInt(parts[parts.length - 1], 10);
        return isNaN(val) ? 0 : val;
      });
    localMax = localSeqs.length > 0 ? Math.max(...localSeqs) : 0;
  } catch (err) {
    console.error("Failed to calculate local sequence", err);
  }

  let onlineMax = 0;
  try {
    if (typeof window !== "undefined" && navigator.onLine) {
      const prefixPattern = `${companyCode}-${inspectorInitials}-${month}-%`;
      const { data: countData } = await supabase
        .from("certificates")
        .select("id")
        .like("id", prefixPattern);
        
      if (countData && countData.length > 0) {
        const onlineSeqs = countData
          .filter((c) => c && c.id)
          .map((c) => {
            const parts = c.id.split("-");
            const val = parseInt(parts[parts.length - 1], 10);
            return isNaN(val) ? 0 : val;
          });
        onlineMax = onlineSeqs.length > 0 ? Math.max(...onlineSeqs) : 0;
      }
    }
  } catch (err) {
    console.error("Failed to query remote sequence count", err);
  }

  const counter = Math.max(localMax, onlineMax) + 1;
  const certId = `${companyCode}-${inspectorInitials}-${month}-${counter.toString().padStart(4, "0")}`;

  await new Promise((r) => setTimeout(r, 220));
  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + input.validForDays);
  const cert: IssuedCertificate = {
    id: certId,
    equipmentId: input.draft.equipmentId,
    equipmentTag: input.equipmentTag,
    equipmentName: input.equipmentName,
    equipmentCategory: input.equipmentCategory,
    spec: input.spec,
    templateId: input.draft.templateId,
    templateName: input.templateName,
    inspectorId: input.draft.inspectorId,
    inspectorName: input.draft.inspectorName,
    result: input.result,
    answers: input.answers,
    photos: input.draft.photos,
    issuedAt: now.toISOString(),
    validUntil: validUntil.toISOString(),
    standardIds: input.standardIds ?? [],
    checklist: input.checklist ?? [],
    ndt: input.ndt ?? [],
    defects: input.defects ?? [],
    testEquipmentIds: input.testEquipmentIds ?? [],
    hash: hash({
      id: input.draft.id,
      at: now.toISOString(),
      answers: input.answers,
      checklist: input.checklist,
      ndt: input.ndt,
      defects: input.defects,
    }),
  };
  const list = loadCerts();
  list.unshift(cert);
  persistCerts(list);
  void pushToOutbox("issue_certificate", cert);
  return { ok: true, data: cert };
}
