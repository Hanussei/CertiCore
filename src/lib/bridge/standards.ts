/**
 * Tauri boundary layer — Standards library.
 * Rust mapping: standards_list / standards_upsert / standards_delete.
 *
 * Prototype persists to localStorage; Rust impl will read from
 * `AppData/certicore/standards/*.json` (seeded curated set + user additions).
 */
import type { Result, Standard } from "@/types";

const KEY = "certicore.standards.v1";

function uid(): string {
  return `std_${Math.random().toString(36).slice(2, 10)}`;
}

export const SEED_STANDARDS: Standard[] = [
  {
    id: "std_loler_r9",
    code: "LOLER-1998-r9",
    title: "Lifting Operations and Lifting Equipment Regulations — Reg. 9 (Thorough Examination)",
    jurisdiction: "UK",
    category: "lifting_gear",
    revision: "1998, ACOP L113 (2014)",
    summary:
      "Requires thorough examination of lifting equipment at 6- or 12-month intervals by a competent person, with a written report.",
  },
  {
    id: "std_puwer",
    code: "PUWER-1998",
    title: "Provision and Use of Work Equipment Regulations",
    jurisdiction: "UK",
    category: "generic",
    revision: "1998, ACOP L22 (2014)",
    summary:
      "General duty of care for work equipment: suitability, maintenance, inspection, and controls.",
  },
  {
    id: "std_leea_copsule",
    code: "LEEA-COPSULE",
    title: "LEEA Code of Practice for the Safe Use of Lifting Equipment",
    jurisdiction: "UK/EU",
    category: "lifting_gear",
    revision: "Ed. 8",
    summary:
      "Industry code covering slings, shackles, hooks, chain blocks and manual lifting appliances — inspection intervals, discard criteria, and record keeping.",
  },
  {
    id: "std_bs_7121",
    code: "BS 7121",
    title: "Code of Practice for Safe Use of Cranes",
    jurisdiction: "UK/EU",
    category: "overhead_crane",
    revision: "Part 2 (2012)",
    summary:
      "Inspection, testing and thorough examination of cranes including tower, mobile and overhead configurations.",
  },
  {
    id: "std_iso_4309",
    code: "ISO 4309",
    title: "Cranes — Wire ropes: Care and maintenance, inspection and discard",
    jurisdiction: "ISO",
    category: "overhead_crane",
    revision: "2017",
    summary:
      "Discard criteria for wire ropes on cranes: broken wires, wear, corrosion, deformation and reduction in diameter.",
  },
  {
    id: "std_bs_7121_5",
    code: "BS 7121-5",
    title: "Cranes — Tower cranes",
    jurisdiction: "UK",
    category: "tower_crane",
    revision: "2019",
    summary:
      "Erection, use, dismantling and inspection of tower cranes including slew ring, tie-bars, anchor bolts and anemometer.",
  },
  {
    id: "std_iso_9927",
    code: "ISO 9927",
    title: "Cranes — Inspections",
    jurisdiction: "ISO",
    category: "mobile_crane_mewp",
    revision: "Part 1 (2013)",
    summary:
      "General inspection categories for cranes: pre-use, periodic, thorough and major inspection.",
  },
  {
    id: "std_en_280",
    code: "EN 280",
    title: "Mobile Elevating Work Platforms — Design, calculations, safety and examination",
    jurisdiction: "EU",
    category: "mobile_crane_mewp",
    revision: "2013 + A1:2015",
    summary:
      "Design and thorough examination requirements for MEWPs including outrigger, tilt sensor and LMI verification.",
  },
  {
    id: "std_psr_2000",
    code: "PSSR-2000",
    title: "Pressure Systems Safety Regulations — Written scheme of examination",
    jurisdiction: "UK",
    category: "pressure_vessel",
    revision: "2000, ACOP L122",
    summary:
      "Requires a written scheme of examination for pressure systems with stored energy > 250 bar·litres.",
  },
  {
    id: "std_asme_b31_3",
    code: "ASME B31.3",
    title: "Process Piping",
    jurisdiction: "ASME",
    category: "pipeline",
    revision: "2022",
    summary:
      "Design, fabrication, examination and testing of process piping in petroleum, chemical and related plant.",
  },
  {
    id: "std_api_570",
    code: "API 570",
    title: "Piping Inspection Code — In-service inspection, rating, repair and alteration",
    jurisdiction: "API",
    category: "pipeline",
    revision: "5th Ed. 2023",
    summary:
      "In-service inspection intervals, thickness measurements (CML), corrosion rate calculation and re-rating of piping.",
  },
  {
    id: "std_asme_b30_5",
    code: "ASME B30.5",
    title: "Mobile and Locomotive Cranes",
    jurisdiction: "ASME",
    category: "mobile_crane_mewp",
    revision: "2021",
    summary:
      "US safety standard for mobile and locomotive cranes — inspection frequency, load charts and outrigger use.",
  },
  {
    id: "std_iso_3059",
    code: "ISO 3059",
    title: "Non-destructive testing — Penetrant and magnetic particle testing — Viewing conditions",
    jurisdiction: "ISO",
    category: "general",
    revision: "2012",
    summary:
      "Illumination and viewing conditions for MPI/DPI inspections — used as acceptance-criteria reference.",
  },
  {
    id: "std_en_iso_23277",
    code: "EN ISO 23277",
    title: "NDT of welds — Penetrant testing — Acceptance levels",
    jurisdiction: "ISO",
    category: "general",
    revision: "2015",
    summary: "Acceptance levels for linear and non-linear indications on welded joints.",
  },
];

function load(): Standard[] {
  if (typeof window === "undefined") return SEED_STANDARDS;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) {
    window.localStorage.setItem(KEY, JSON.stringify(SEED_STANDARDS));
    return SEED_STANDARDS;
  }
  try {
    return JSON.parse(raw) as Standard[];
  } catch {
    return SEED_STANDARDS;
  }
}

function persist(list: Standard[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(list));
}

export async function listStandards(): Promise<Result<Standard[]>> {
  await new Promise((r) => setTimeout(r, 90));
  return { ok: true, data: load() };
}

export async function upsertStandard(std: Standard): Promise<Result<Standard>> {
  await new Promise((r) => setTimeout(r, 120));
  const list = load();
  const idx = list.findIndex((s) => s.id === std.id);
  if (idx >= 0) list[idx] = std;
  else list.push(std);
  persist(list);
  return { ok: true, data: std };
}

export async function deleteStandard(id: string): Promise<Result<true>> {
  await new Promise((r) => setTimeout(r, 100));
  persist(load().filter((s) => s.id !== id));
  return { ok: true, data: true };
}

export function makeEmptyStandard(): Standard {
  return {
    id: uid(),
    code: "",
    title: "",
    jurisdiction: "",
    category: "generic",
    revision: "",
    summary: "",
  };
}
