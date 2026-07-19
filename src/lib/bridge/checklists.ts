/**
 * Tauri boundary layer — Checklist banks per equipment category.
 * Rust mapping: checklist_banks_list.
 *
 * Banks are curated arrays of checklist "questions" (clause + standard ref).
 * The wizard instantiates a bank into a live `ChecklistItem[]` for the
 * inspector to answer.
 */
import type {
  ChecklistItem,
  EquipmentCategory,
  Result,
} from "@/types";

/** A curated question in a bank — no verdict / notes yet. */
export type ChecklistBankSeed = {
  clause: string;         // "ISO 4309 §4.2.1"
  standardCode: string;   // resolve to Standard.id later
  question: string;
};

export type ChecklistBank = {
  id: string;
  category: EquipmentCategory;
  name: string;
  description: string;
  items: ChecklistBankSeed[];
};

/* ------------------------------------------------------------------ */
/* Curated banks                                                      */
/* ------------------------------------------------------------------ */

export const BANK_LIFTING_GEAR: ChecklistBank = {
  id: "bank_lifting_gear",
  category: "lifting_gear",
  name: "Lifting accessories — thorough examination",
  description:
    "LEEA / LOLER thorough examination checklist for chains, slings, shackles and hooks.",
  items: [
    { clause: "LOLER Reg. 9(3)(a)", standardCode: "LOLER-1998-r9", question: "Identification tag present, legible and matches register?" },
    { clause: "LEEA §5.3", standardCode: "LEEA-COPSULE", question: "Working Load Limit clearly marked on the item?" },
    { clause: "LEEA §7.1.2", standardCode: "LEEA-COPSULE", question: "Free from surface cracks, nicks, gouges or heat damage?" },
    { clause: "LEEA §7.1.3", standardCode: "LEEA-COPSULE", question: "Chain link wear within 10 % of nominal diameter?" },
    { clause: "LEEA §7.2.1", standardCode: "LEEA-COPSULE", question: "Hook throat opening within 10 % of manufacturer's original?" },
    { clause: "LEEA §7.2.2", standardCode: "LEEA-COPSULE", question: "Hook safety latch present, undamaged and functional?" },
    { clause: "LEEA §7.3", standardCode: "LEEA-COPSULE", question: "Shackle pin correct type, free rotation, split pin fitted where required?" },
    { clause: "LEEA §7.4", standardCode: "LEEA-COPSULE", question: "No permanent deformation or twist along the length?" },
    { clause: "LEEA §7.5", standardCode: "LEEA-COPSULE", question: "Corrosion, pitting and heat discolouration within acceptable limits?" },
    { clause: "LOLER Reg. 9(4)", standardCode: "LOLER-1998-r9", question: "Previous examination report on file and no outstanding defects?" },
    { clause: "LEEA §7.6", standardCode: "LEEA-COPSULE", question: "MPI performed on high-tensile hooks — no relevant indications?" },
    { clause: "LEEA §7.7", standardCode: "LEEA-COPSULE", question: "Proof load applied where required and result within tolerance?" },
  ],
};

export const BANK_OVERHEAD_CRANE: ChecklistBank = {
  id: "bank_overhead_crane",
  category: "overhead_crane",
  name: "Overhead & gantry crane — thorough examination",
  description:
    "BS 7121 / ISO 4309 examination checklist for EOT, gantry and jib cranes.",
  items: [
    { clause: "BS 7121-2 §5.2", standardCode: "BS 7121", question: "Structure free from cracks, distortion and corrosion?" },
    { clause: "BS 7121-2 §5.3", standardCode: "BS 7121", question: "End stops, buffers and rail sweeps in serviceable condition?" },
    { clause: "ISO 4309 §4.2.1", standardCode: "ISO 4309", question: "Wire rope: broken wires below discard threshold over 6d and 30d lengths?" },
    { clause: "ISO 4309 §4.2.3", standardCode: "ISO 4309", question: "Wire rope reduction in diameter ≤ 7 % of nominal?" },
    { clause: "ISO 4309 §4.3", standardCode: "ISO 4309", question: "Rope free from kinks, birdcaging, crushing and heat damage?" },
    { clause: "BS 7121-2 §6.1", standardCode: "BS 7121", question: "Hoist and travel motions operate smoothly through full range?" },
    { clause: "BS 7121-2 §6.4", standardCode: "BS 7121", question: "Upper / lower hoist limit switches trip at correct positions?" },
    { clause: "BS 7121-2 §6.5", standardCode: "BS 7121", question: "Overload protection device tested and within tolerance?" },
    { clause: "BS 7121-2 §6.6", standardCode: "BS 7121", question: "Hoist brake holds rated load without perceptible slip (BRAKE_TEST)?" },
    { clause: "BS 7121-2 §5.5", standardCode: "BS 7121", question: "Hook block: no deformation, safety latch fitted, swivel free?" },
    { clause: "BS 7121-2 §7", standardCode: "BS 7121", question: "Proof load test conducted at 125 % SWL where scheduled?" },
    { clause: "BS 7121-2 §8", standardCode: "BS 7121", question: "Documentation: log book, previous reports and modifications up to date?" },
  ],
};

export const BANK_TOWER_CRANE: ChecklistBank = {
  id: "bank_tower_crane",
  category: "tower_crane",
  name: "Tower crane — thorough examination",
  description:
    "BS 7121-5 checklist covering base, mast, slew, jib, ropes and safety systems.",
  items: [
    { clause: "BS 7121-5 §6.2", standardCode: "BS 7121-5", question: "Foundation / ballast condition and anchor bolts free from movement?" },
    { clause: "BS 7121-5 §6.3", standardCode: "BS 7121-5", question: "Anchor bolt pull-test recorded within acceptance (PULL_TEST)?" },
    { clause: "BS 7121-5 §7.1", standardCode: "BS 7121-5", question: "Mast bolts torqued to spec and re-checked (TORQUE record)?" },
    { clause: "BS 7121-5 §7.2", standardCode: "BS 7121-5", question: "Mast weld joints inspected — no cracks (VT + MPI on suspect areas)?" },
    { clause: "BS 7121-5 §8.1", standardCode: "BS 7121-5", question: "Slew ring free play within manufacturer limits; bolts marked and secure?" },
    { clause: "BS 7121-5 §8.4", standardCode: "BS 7121-5", question: "Tie-bars, pendants and jib pins free from wear beyond permissible limit?" },
    { clause: "BS 7121-5 §9.1", standardCode: "BS 7121-5", question: "Hoist and trolley ropes meet ISO 4309 discard criteria?" },
    { clause: "BS 7121-5 §10.1", standardCode: "BS 7121-5", question: "Load moment indicator (LMI) tested against known load — within tolerance?" },
    { clause: "BS 7121-5 §10.2", standardCode: "BS 7121-5", question: "Anemometer functional, over-speed alarm audible at ≥ manufacturer set-point?" },
    { clause: "BS 7121-5 §10.3", standardCode: "BS 7121-5", question: "Slew, luffing and hoist limit switches tested and operative?" },
    { clause: "BS 7121-5 §11", standardCode: "BS 7121-5", question: "Cab controls, dead-man switch and emergency stops functional?" },
    { clause: "BS 7121-5 §12", standardCode: "BS 7121-5", question: "Rescue plan, climb access and fall arrest anchors in place?" },
  ],
};

export const BANK_MOBILE_CRANE_MEWP: ChecklistBank = {
  id: "bank_mobile_crane_mewp",
  category: "mobile_crane_mewp",
  name: "Mobile crane / MEWP — thorough examination",
  description:
    "ISO 9927 / EN 280 / ASME B30.5 checklist for mobile cranes, MEWPs and telehandlers.",
  items: [
    { clause: "ISO 9927-1 §5.1", standardCode: "ISO 9927", question: "Chassis, outriggers and jacks free from cracks and hydraulic leaks?" },
    { clause: "EN 280 §5.4", standardCode: "EN 280", question: "Outrigger interlock prevents boom motion until fully deployed?" },
    { clause: "ASME B30.5 §5-2.1", standardCode: "ASME B30.5", question: "Load chart present in cab, legible, matches configuration?" },
    { clause: "ASME B30.5 §5-2.4", standardCode: "ASME B30.5", question: "Load Moment Indicator / RCL calibration verified with test weight?" },
    { clause: "EN 280 §5.6", standardCode: "EN 280", question: "Tilt sensor triggers alarm and lock-out at set angle?" },
    { clause: "ISO 9927-1 §5.3", standardCode: "ISO 9927", question: "Boom weld inspection — no cracks (VT + MPI on suspect areas)?" },
    { clause: "ISO 9927-1 §5.4", standardCode: "ISO 9927", question: "Hoist rope meets ISO 4309 discard criteria; hook and swivel serviceable?" },
    { clause: "EN 280 §5.7", standardCode: "EN 280", question: "Basket safety harness anchor points load-tested annually?" },
    { clause: "ASME B30.5 §5-3.1", standardCode: "ASME B30.5", question: "Brakes hold rated load on grade for 5 minutes without slip?" },
    { clause: "EN 280 §5.8", standardCode: "EN 280", question: "Emergency lowering / manual descent tested and operative?" },
    { clause: "ISO 9927-1 §6", standardCode: "ISO 9927", question: "Annual proof load test performed at 110 % SWL — no deformation?" },
    { clause: "EN 280 §5.9", standardCode: "EN 280", question: "Wind speed anemometer functional, over-speed limit configured?" },
  ],
};

export const BANK_PRESSURE_VESSEL: ChecklistBank = {
  id: "bank_pressure_vessel",
  category: "pressure_vessel",
  name: "Pressure vessel — written scheme of examination",
  description:
    "PSSR-2000 checklist for fixed pressure vessels: external, internal and NDT.",
  items: [
    { clause: "PSSR L122 §4.1", standardCode: "PSSR-2000", question: "Name plate legible and matches design register?" },
    { clause: "PSSR L122 §4.2", standardCode: "PSSR-2000", question: "External surfaces free from corrosion, blistering and mechanical damage?" },
    { clause: "PSSR L122 §4.3", standardCode: "PSSR-2000", question: "Insulation and cladding intact — no wet insulation traps?" },
    { clause: "PSSR L122 §5.1", standardCode: "PSSR-2000", question: "Pressure-relief valve tested and re-certified within due date?" },
    { clause: "PSSR L122 §5.2", standardCode: "PSSR-2000", question: "Pressure and temperature gauges within calibration?" },
    { clause: "PSSR L122 §6.1", standardCode: "PSSR-2000", question: "Wall-thickness UT within design minima at all CMLs (THICKNESS_UT)?" },
    { clause: "PSSR L122 §6.2", standardCode: "PSSR-2000", question: "Internal inspection — no corrosion, erosion or deposits beyond spec?" },
    { clause: "PSSR L122 §6.3", standardCode: "PSSR-2000", question: "Nozzle welds inspected (VT + MPI or DPI as applicable)?" },
    { clause: "PSSR L122 §7.1", standardCode: "PSSR-2000", question: "Hydrostatic test performed at 1.3 × MAWP (HYDRO)?" },
    { clause: "PSSR L122 §8", standardCode: "PSSR-2000", question: "Documentation up to date: SPRV cert, thickness log, WSE report?" },
  ],
};

export const BANK_PIPELINE: ChecklistBank = {
  id: "bank_pipeline",
  category: "pipeline",
  name: "Process piping — in-service inspection",
  description:
    "API 570 / ASME B31.3 in-service inspection covering CML thickness, corrosion loops and hydro.",
  items: [
    { clause: "API 570 §5.5", standardCode: "API 570", question: "External visual inspection of piping supports, hangers and expansion joints?" },
    { clause: "API 570 §5.6", standardCode: "API 570", question: "Insulation condition — no CUI evidence at critical locations?" },
    { clause: "API 570 §7.1", standardCode: "API 570", question: "Thickness readings at all CMLs — above tmin + corrosion allowance?" },
    { clause: "API 570 §7.1.2", standardCode: "API 570", question: "Short-term corrosion rate ≤ long-term rate × 1.5?" },
    { clause: "API 570 §7.1.3", standardCode: "API 570", question: "Next inspection interval recalculated based on remaining life?" },
    { clause: "ASME B31.3 §345", standardCode: "ASME B31.3", question: "Hydrostatic test at 1.5 × design pressure (HYDRO) — no leaks or deformation?" },
    { clause: "API 570 §6.3", standardCode: "API 570", question: "Flange face condition, gasket type and bolt torque correct (TORQUE)?" },
    { clause: "API 570 §6.4", standardCode: "API 570", question: "Small-bore branch connections examined — no fatigue cracks?" },
    { clause: "ASME B31.3 §344.2", standardCode: "ASME B31.3", question: "Weld inspection: 100 % VT and 5 % RT / UT on high-energy joints?" },
    { clause: "API 570 §8", standardCode: "API 570", question: "Repair records reviewed and repair joints identified in ISO drawings?" },
  ],
};

export const BANK_GENERIC: ChecklistBank = {
  id: "bank_generic",
  category: "generic",
  name: "General equipment — periodic inspection",
  description:
    "PUWER-1998 generic checklist for equipment not covered by a specialised bank.",
  items: [
    { clause: "PUWER Reg. 5", standardCode: "PUWER-1998", question: "Equipment maintained in efficient state and efficient working order?" },
    { clause: "PUWER Reg. 6", standardCode: "PUWER-1998", question: "Suitable inspection carried out at appropriate intervals?" },
    { clause: "PUWER Reg. 11", standardCode: "PUWER-1998", question: "Dangerous parts guarded or otherwise made safe?" },
    { clause: "PUWER Reg. 15", standardCode: "PUWER-1998", question: "Stop and emergency stop controls functional and accessible?" },
    { clause: "PUWER Reg. 19", standardCode: "PUWER-1998", question: "Means of isolation from energy sources available and identifiable?" },
    { clause: "PUWER Reg. 24", standardCode: "PUWER-1998", question: "Warning devices / markings clearly visible?" },
  ],
};

export const CHECKLIST_BANKS: ChecklistBank[] = [
  BANK_LIFTING_GEAR,
  BANK_OVERHEAD_CRANE,
  BANK_TOWER_CRANE,
  BANK_MOBILE_CRANE_MEWP,
  BANK_PRESSURE_VESSEL,
  BANK_PIPELINE,
  BANK_GENERIC,
];

export const BANK_BY_CATEGORY: Record<EquipmentCategory, ChecklistBank> = {
  lifting_gear: BANK_LIFTING_GEAR,
  overhead_crane: BANK_OVERHEAD_CRANE,
  tower_crane: BANK_TOWER_CRANE,
  mobile_crane_mewp: BANK_MOBILE_CRANE_MEWP,
  pressure_vessel: BANK_PRESSURE_VESSEL,
  pipeline: BANK_PIPELINE,
  generic: BANK_GENERIC,
};

export async function listChecklistBanks(): Promise<Result<ChecklistBank[]>> {
  await new Promise((r) => setTimeout(r, 40));
  return { ok: true, data: CHECKLIST_BANKS };
}

/**
 * Instantiate a bank into blank checklist items keyed by the given
 * standards catalogue (resolves standardCode → standardId).
 */
export function instantiateBank(
  bank: ChecklistBank,
  standardIdByCode: Record<string, string>,
): ChecklistItem[] {
  return bank.items.map((it, i) => ({
    id: `ci_${bank.id}_${i}_${Math.random().toString(36).slice(2, 6)}`,
    clause: it.clause,
    standardId: standardIdByCode[it.standardCode] ?? null,
    question: it.question,
    verdict: "na",
    note: "",
    photoIds: [],
  }));
}
