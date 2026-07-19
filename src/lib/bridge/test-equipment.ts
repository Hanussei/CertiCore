/**
 * Tauri boundary layer — Calibrated test-equipment register.
 * Rust mapping: test_equipment_list / test_equipment_upsert / test_equipment_delete.
 *
 * Prototype persists to localStorage; Rust impl will write to
 * `AppData/certicore/test_equipment/*.json`.
 */
import type { Result, TestEquipment } from "@/types";

const KEY = "certicore.test_equipment.v1";

function uid(): string {
  return `te_${Math.random().toString(36).slice(2, 10)}`;
}

function iso(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

export const SEED_TEST_EQUIPMENT: TestEquipment[] = [
  {
    id: "te_dyno_5t",
    tag: "TE-DYN-014",
    name: "Load-cell dynamometer, 5 t",
    manufacturer: "Straightpoint",
    model: "Radiolink Plus 5T",
    serialNumber: "SP-5T-88221",
    methods: ["LOAD_TEST"],
    calibrationDueAt: iso(140),
    calibrationCertRef: "UKAS-CAL-88221/24",
    ownerLab: "In-house metrology",
    createdAt: iso(-600),
  },
  {
    id: "te_torque_400",
    tag: "TE-TRQ-021",
    name: "Torque wrench, 80–400 N·m",
    manufacturer: "Norbar",
    model: "Pro 400",
    serialNumber: "NB-400-1204",
    methods: ["TORQUE"],
    calibrationDueAt: iso(45),
    calibrationCertRef: "UKAS-CAL-1204/25",
    ownerLab: "Norbar service centre",
    createdAt: iso(-400),
  },
  {
    id: "te_mpi_yoke",
    tag: "TE-MPI-006",
    name: "MPI AC electromagnetic yoke",
    manufacturer: "Magnaflux",
    model: "Y-7",
    serialNumber: "MG-Y7-3391",
    methods: ["MPI"],
    calibrationDueAt: iso(210),
    calibrationCertRef: "MFX-CAL-3391/25",
    ownerLab: "Magnaflux authorised",
    createdAt: iso(-320),
  },
  {
    id: "te_ut_thickness",
    tag: "TE-UT-002",
    name: "UT wall-thickness gauge",
    manufacturer: "Olympus",
    model: "38DL Plus",
    serialNumber: "OL-38DL-77102",
    methods: ["UT", "THICKNESS_UT"],
    calibrationDueAt: iso(-8),
    calibrationCertRef: "OLYMPUS-CAL-77102/24",
    ownerLab: "Olympus service centre",
    notes: "Overdue — quarantined pending cal.",
    createdAt: iso(-900),
  },
  {
    id: "te_dpi_kit",
    tag: "TE-DPI-011",
    name: "Colour-contrast penetrant kit",
    manufacturer: "Sherwin",
    model: "DP-55 / DR-60 / DR-63",
    serialNumber: "SW-KIT-2025-Q2",
    methods: ["DPI", "PT"],
    calibrationDueAt: iso(180),
    calibrationCertRef: "SW-BATCH-Q2-25",
    ownerLab: "Batch traceability only",
    createdAt: iso(-90),
  },
  {
    id: "te_meg_10kv",
    tag: "TE-INS-004",
    name: "Insulation resistance tester, 10 kV",
    manufacturer: "Megger",
    model: "MIT1025",
    serialNumber: "MG-1025-4412",
    methods: ["INSULATION"],
    calibrationDueAt: iso(310),
    calibrationCertRef: "UKAS-CAL-4412/26",
    ownerLab: "In-house metrology",
    createdAt: iso(-500),
  },
  {
    id: "te_hydro_pump",
    tag: "TE-HYD-009",
    name: "Hydro test pump, 700 bar",
    manufacturer: "Enerpac",
    model: "P462",
    serialNumber: "EP-P462-2201",
    methods: ["HYDRO"],
    calibrationDueAt: iso(90),
    calibrationCertRef: "UKAS-CAL-2201/25",
    ownerLab: "Enerpac authorised",
    createdAt: iso(-720),
  },
  {
    id: "te_anchor_pull",
    tag: "TE-PULL-003",
    name: "Anchor pull tester, 100 kN",
    manufacturer: "Hilti",
    model: "HAT 28",
    serialNumber: "HL-HAT28-0091",
    methods: ["PULL_TEST"],
    calibrationDueAt: iso(60),
    calibrationCertRef: "HILTI-CAL-0091/25",
    ownerLab: "Hilti calibration service",
    createdAt: iso(-260),
  },
  {
    id: "te_anemometer",
    tag: "TE-ANE-001",
    name: "Cup anemometer",
    manufacturer: "Kestrel",
    model: "5500",
    serialNumber: "KS-5500-8834",
    methods: ["VT"],
    calibrationDueAt: iso(400),
    calibrationCertRef: "KESTREL-CAL-8834/26",
    ownerLab: "Kestrel service",
    createdAt: iso(-40),
  },
  {
    id: "te_brake_slip",
    tag: "TE-BRK-007",
    name: "Brake slip / holding test rig",
    manufacturer: "In-house",
    model: "BSR-Mk2",
    serialNumber: "WHO-BSR-002",
    methods: ["BRAKE_TEST"],
    calibrationDueAt: iso(120),
    calibrationCertRef: "WHO-INT-CAL-002/25",
    ownerLab: "In-house metrology",
    createdAt: iso(-800),
  },
];

function load(): TestEquipment[] {
  if (typeof window === "undefined") return SEED_TEST_EQUIPMENT;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) {
    window.localStorage.setItem(KEY, JSON.stringify(SEED_TEST_EQUIPMENT));
    return SEED_TEST_EQUIPMENT;
  }
  try {
    return JSON.parse(raw) as TestEquipment[];
  } catch {
    return SEED_TEST_EQUIPMENT;
  }
}

function persist(list: TestEquipment[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(list));
}

export async function listTestEquipment(): Promise<Result<TestEquipment[]>> {
  await new Promise((r) => setTimeout(r, 90));
  return { ok: true, data: load() };
}

export async function upsertTestEquipment(te: TestEquipment): Promise<Result<TestEquipment>> {
  await new Promise((r) => setTimeout(r, 120));
  const list = load();
  const idx = list.findIndex((t) => t.id === te.id);
  if (idx >= 0) list[idx] = te;
  else list.push(te);
  persist(list);
  return { ok: true, data: te };
}

export async function deleteTestEquipment(id: string): Promise<Result<true>> {
  await new Promise((r) => setTimeout(r, 90));
  persist(load().filter((t) => t.id !== id));
  return { ok: true, data: true };
}

export function makeEmptyTestEquipment(): TestEquipment {
  return {
    id: uid(),
    tag: "",
    name: "",
    manufacturer: "",
    model: "",
    serialNumber: "",
    methods: [],
    calibrationDueAt: iso(180),
    calibrationCertRef: "",
    ownerLab: "",
    createdAt: new Date().toISOString(),
  };
}
