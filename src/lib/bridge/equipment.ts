/**
 * Tauri boundary layer — Equipment registry.
 * Rust mapping: equipment_list / equipment_upsert / equipment_delete.
 */
import type { Equipment, EquipmentStatus, Result } from "@/types";

const KEY = "certicore.equipment.v2";

import { pushToOutbox } from "./supabase-sync";
// ... (rest of imports)

function uid(): string {
  return `eq_${Math.random().toString(36).slice(2, 10)}`;
}

function iso(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString();
}

export const CATEGORIES = [
  "Lifting Equipment",
  "Pressure Systems",
  "Access & Height",
  "Electrical",
  "Mechanical",
  "Cranes",
  "Pipelines",
  "General",
];
export const SITES = ["Al-Sadiq Yard", "Riyadh HQ", "Jubail Refinery", "Yanbu Terminal", "Tabuk Depot"];

export const SEED_EQUIPMENT: Equipment[] = [
  {
    id: "eq_hoist_01",
    tag: "WHO-LG-0184",
    name: "Overhead hoist — bay 4",
    category: "Lifting Equipment",
    equipmentCategory: "overhead_crane",
    manufacturer: "Demag",
    serialNumber: "DH-88291",
    site: "Al-Sadiq Yard",
    workingLoad: "5 t",
    status: "active",
    lastInspectedAt: iso(-32),
    nextInspectionDue: iso(58),
    createdAt: iso(-420),
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
      operatingRange: "-10 °C to +45 °C",
      driveSystem: "Two-speed frequency-controlled",
    },
  },
  {
    id: "eq_sling_02",
    tag: "WHO-LG-0201",
    name: "Chain sling assembly (2-leg)",
    category: "Lifting Equipment",
    equipmentCategory: "lifting_gear",
    manufacturer: "Crosby",
    serialNumber: "CR-441-A",
    site: "Al-Sadiq Yard",
    workingLoad: "3.2 t",
    status: "active",
    lastInspectedAt: iso(-11),
    nextInspectionDue: iso(-4),
    createdAt: iso(-260),
    spec: {
      ratedCapacity: "3,200 kg @ 60°",
      dutyClass: "Grade 100",
      yearOfManufacture: "2022",
      countryOfOrigin: "USA",
      designStandard: "EN 818-4",
      material: "Alloy steel, quenched & tempered",
      dimensions: "1.8 m EWL · 10 mm chain",
      weightKg: "9.4",
    },
  },
  {
    id: "eq_vessel_03",
    tag: "WHO-PV-0044",
    name: "Nitrogen buffer vessel",
    category: "Pressure Systems",
    equipmentCategory: "pressure_vessel",
    manufacturer: "Alfa Laval",
    serialNumber: "AL-N2-2201",
    site: "Jubail Refinery",
    workingLoad: "16 bar",
    status: "active",
    lastInspectedAt: iso(-180),
    nextInspectionDue: iso(180),
    createdAt: iso(-700),
    spec: {
      ratedCapacity: "8.4 m³ @ 16 bar",
      dutyClass: "PED Cat III",
      yearOfManufacture: "2015",
      countryOfOrigin: "Sweden",
      designStandard: "PD 5500 Cat 2",
      material: "SA-516 Gr 70 · CS clad",
      dimensions: "Ø 1.6 m × L 4.2 m",
      weightKg: "3,900",
      operatingRange: "-10 °C to +80 °C",
    },
  },
  {
    id: "eq_scaffold_04",
    tag: "WHO-SC-0117",
    name: "Scaffold tower N-wing",
    category: "Access & Height",
    equipmentCategory: "generic",
    manufacturer: "Layher",
    serialNumber: "LH-772",
    site: "Riyadh HQ",
    status: "quarantined",
    lastInspectedAt: iso(-6),
    nextInspectionDue: iso(1),
    notes: "Pending re-tag after leg replacement.",
    createdAt: iso(-90),
    spec: {
      ratedCapacity: "Load class 3 · 200 kg/m²",
      designStandard: "TG20:21",
    },
  },
  {
    id: "eq_gantry_05",
    tag: "WHO-LG-0233",
    name: "Gantry crane rail A",
    category: "Lifting Equipment",
    equipmentCategory: "overhead_crane",
    manufacturer: "Konecranes",
    serialNumber: "KC-19-882",
    site: "Yanbu Terminal",
    workingLoad: "20 t",
    status: "active",
    lastInspectedAt: iso(-60),
    nextInspectionDue: iso(30),
    createdAt: iso(-1200),
    spec: {
      ratedCapacity: "20,000 kg",
      dutyClass: "FEM 3m",
      yearOfManufacture: "2016",
      countryOfOrigin: "Finland",
      designStandard: "EN 15011",
      dimensions: "Span 30 m · lift 14 m",
      weightKg: "18,600",
      powerRating: "45 kW · 3ph 415 V",
      driveSystem: "VFD travel + hoist",
    },
  },
  {
    id: "eq_tower_07",
    tag: "WHO-TC-0002",
    name: "Tower crane — Block G-2",
    category: "Cranes",
    equipmentCategory: "tower_crane",
    manufacturer: "Liebherr",
    serialNumber: "LB-224HC-119",
    site: "Riyadh HQ",
    workingLoad: "12 t max · 2.4 t @ jib tip",
    status: "active",
    lastInspectedAt: iso(-14),
    nextInspectionDue: iso(76),
    createdAt: iso(-90),
    spec: {
      ratedCapacity: "12,000 kg / 2,400 kg @ 60 m",
      dutyClass: "FEM 2m",
      yearOfManufacture: "2023",
      countryOfOrigin: "Germany",
      designStandard: "EN 14439 / BS 7121-5",
      dimensions: "Hook height 62 m · jib 60 m",
      weightKg: "72,000",
      powerRating: "55 kW slewing · 90 kW hoist",
      driveSystem: "Litronic FC",
      operatingRange: "-20 °C to +50 °C, wind ≤ 72 km/h",
    },
  },
  {
    id: "eq_mobile_08",
    tag: "WHO-MC-0011",
    name: "All-terrain crane LTM 1090",
    category: "Cranes",
    equipmentCategory: "mobile_crane_mewp",
    manufacturer: "Liebherr",
    serialNumber: "LTM-1090-4.2-2018",
    site: "Yanbu Terminal",
    workingLoad: "90 t max",
    status: "active",
    lastInspectedAt: iso(-40),
    nextInspectionDue: iso(50),
    createdAt: iso(-620),
    spec: {
      ratedCapacity: "90,000 kg @ 3 m radius",
      dutyClass: "ISO M4",
      yearOfManufacture: "2018",
      countryOfOrigin: "Germany",
      designStandard: "EN 13000 / ASME B30.5",
      dimensions: "Boom 60 m · jib 19 m",
      weightKg: "60,000",
      driveSystem: "Diesel / VarioBase outriggers",
    },
  },
  {
    id: "eq_pipe_09",
    tag: "WHO-PL-0031",
    name: "Crude transfer line — Loop 3",
    category: "Pipelines",
    equipmentCategory: "pipeline",
    manufacturer: "In-house fab",
    serialNumber: "JR-CTL-L3-A",
    site: "Jubail Refinery",
    workingLoad: "42 bar @ 90 °C",
    status: "active",
    lastInspectedAt: iso(-200),
    nextInspectionDue: iso(160),
    createdAt: iso(-2200),
    spec: {
      ratedCapacity: "8″ Sch 40 · 42 bar",
      dutyClass: "ASME B31.3 Normal Fluid",
      yearOfManufacture: "2011",
      designStandard: "ASME B31.3 / API 570",
      material: "ASTM A106 Gr B",
      dimensions: "DN 200 · 480 m run · 22 CMLs",
      operatingRange: "0–95 °C · 0–42 bar",
    },
  },
  {
    id: "eq_panel_06",
    tag: "WHO-EL-0055",
    name: "MCC panel — line 3",
    category: "Electrical",
    equipmentCategory: "generic",
    manufacturer: "Schneider",
    serialNumber: "SE-MCC-330",
    site: "Tabuk Depot",
    status: "retired",
    lastInspectedAt: iso(-540),
    nextInspectionDue: iso(-360),
    createdAt: iso(-1800),
  },
];

function load(): Equipment[] {
  if (typeof window === "undefined") return SEED_EQUIPMENT;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) {
    window.localStorage.setItem(KEY, JSON.stringify(SEED_EQUIPMENT));
    return SEED_EQUIPMENT;
  }
  try {
    return JSON.parse(raw) as Equipment[];
  } catch {
    return SEED_EQUIPMENT;
  }
}

function persist(list: Equipment[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(list));
}

export async function listEquipment(): Promise<Result<Equipment[]>> {
  await new Promise((r) => setTimeout(r, 120));
  return { ok: true, data: load() };
}

export type EquipmentDraft = Omit<Equipment, "id" | "createdAt" | "lastInspectedAt"> & {
  id?: string;
  lastInspectedAt?: string | null;
};

export async function upsertEquipment(draft: EquipmentDraft): Promise<Result<Equipment>> {
  await new Promise((r) => setTimeout(r, 150));
  const list = load();
  if (draft.id) {
    const idx = list.findIndex((e) => e.id === draft.id);
    if (idx < 0) return { ok: false, error: { code: "not_found", message: "Equipment not found" } };
    const next: Equipment = { ...list[idx], ...draft } as Equipment;
    list[idx] = next;
    persist(list);
    void pushToOutbox("upsert_equipment", next);
    return { ok: true, data: next };
  }
  const created: Equipment = {
    id: uid(),
    tag: draft.tag,
    name: draft.name,
    category: draft.category,
    equipmentCategory: draft.equipmentCategory,
    manufacturer: draft.manufacturer,
    serialNumber: draft.serialNumber,
    site: draft.site,
    workingLoad: draft.workingLoad,
    status: draft.status,
    lastInspectedAt: draft.lastInspectedAt ?? null,
    nextInspectionDue: draft.nextInspectionDue,
    notes: draft.notes,
    createdAt: new Date().toISOString(),
    spec: draft.spec,
  };
  list.push(created);
  persist(list);
  void pushToOutbox("upsert_equipment", created);
  return { ok: true, data: created };
}

export async function deleteEquipment(id: string): Promise<Result<true>> {
  persist(load().filter((e) => e.id !== id));
  return { ok: true, data: true };
}

export async function updateAfterInspection(id: string, nextDueDays = 180): Promise<Result<Equipment>> {
  const list = load();
  const idx = list.findIndex((e) => e.id === id);
  if (idx < 0) return { ok: false, error: { code: "not_found", message: "Equipment not found" } };
  list[idx] = {
    ...list[idx],
    lastInspectedAt: new Date().toISOString(),
    nextInspectionDue: iso(nextDueDays),
  };
  persist(list);
  return { ok: true, data: list[idx] };
}

export function makeEmptyEquipment(): EquipmentDraft {
  return {
    tag: "",
    name: "",
    category: CATEGORIES[0],
    equipmentCategory: "generic",
    manufacturer: "",
    serialNumber: "",
    site: SITES[0],
    workingLoad: "",
    status: "active" as EquipmentStatus,
    lastInspectedAt: null,
    nextInspectionDue: iso(180),
    notes: "",
  };
}
