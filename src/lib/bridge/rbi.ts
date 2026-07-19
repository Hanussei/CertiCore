/**
 * Tauri boundary layer — Risk-Based Inspection (RBI) engine.
 * Rust mapping: rbi_calculate / rbi_history / rbi_recommend_interval.
 *
 * Simplified API 580/581-inspired scoring model. Kept pure & deterministic
 * so it maps 1:1 to a Rust module later. All persistence via localStorage.
 */
import type { Equipment, IssuedCertificate, Result } from "@/types";

const KEY = "certicore.rbi.assessments.v1";

export type RbiLikelihood = 1 | 2 | 3 | 4 | 5; // 1 = rare, 5 = almost certain
export type RbiConsequence = 1 | 2 | 3 | 4 | 5; // 1 = negligible, 5 = catastrophic
export type RbiRiskLevel = "low" | "medium" | "high" | "very_high";

export type RbiInputs = {
  equipmentId: string;
  ageYears: number;              // service age
  operatingSeverity: 1 | 2 | 3 | 4 | 5; // duty cycle stress
  corrosionRateMmYr: number;     // 0 for non-metallic / non-corrosive
  previousFindingsCount: number; // number of defects in last 3 inspections
  fluidHazard: 1 | 2 | 3 | 4 | 5;      // 1=inert, 5=toxic/flammable
  populationExposure: 1 | 2 | 3 | 4 | 5; // people near equipment
  productionCriticality: 1 | 2 | 3 | 4 | 5; // downstream production impact
  environmentalImpact: 1 | 2 | 3 | 4 | 5;
};

export type RbiAssessment = {
  id: string;
  equipmentId: string;
  inputs: RbiInputs;
  pof: RbiLikelihood;      // Probability of Failure (1-5)
  cof: RbiConsequence;     // Consequence of Failure (1-5)
  riskScore: number;       // pof * cof (1..25)
  riskLevel: RbiRiskLevel;
  recommendedIntervalDays: number;
  assessedAt: string;
  notes?: string;
};

/* ---------- Scoring ---------- */

function clamp<T extends number>(n: number, min: T, max: T): T {
  return Math.max(min, Math.min(max, n)) as T;
}

/** PoF: probability of failure. Weighted mix of age, corrosion, severity, past findings. */
export function computePof(i: RbiInputs): RbiLikelihood {
  // Age weight (0..2)
  const ageScore = i.ageYears < 5 ? 0 : i.ageYears < 10 ? 0.5 : i.ageYears < 20 ? 1.2 : 2;
  // Corrosion (0..1.5): >0.5 mm/yr is aggressive
  const corr = i.corrosionRateMmYr <= 0.05 ? 0 : i.corrosionRateMmYr < 0.25 ? 0.5 : i.corrosionRateMmYr < 0.5 ? 1 : 1.5;
  // Severity 1..5 → 0..1.5
  const sev = ((i.operatingSeverity - 1) / 4) * 1.5;
  // Findings (0..1.5)
  const find = Math.min(1.5, i.previousFindingsCount * 0.35);
  const raw = 1 + ageScore + corr + sev + find; // baseline 1
  return clamp(Math.round(raw), 1, 5) as RbiLikelihood;
}

/** CoF: consequence of failure. Max of the four hazard axes, weighted. */
export function computeCof(i: RbiInputs): RbiConsequence {
  const raw =
    0.35 * i.fluidHazard +
    0.30 * i.populationExposure +
    0.20 * i.productionCriticality +
    0.15 * i.environmentalImpact;
  return clamp(Math.round(raw), 1, 5) as RbiConsequence;
}

export function riskLevelFor(pof: RbiLikelihood, cof: RbiConsequence): RbiRiskLevel {
  const s = pof * cof;
  if (s <= 4) return "low";
  if (s <= 9) return "medium";
  if (s <= 15) return "high";
  return "very_high";
}

/** Recommended interval (days) shrinks with risk. */
export function recommendedIntervalDays(level: RbiRiskLevel): number {
  switch (level) {
    case "low":       return 730; // 24 mo
    case "medium":    return 365; // 12 mo
    case "high":      return 180; // 6 mo
    case "very_high": return 90;  // 3 mo
  }
}

export function calculate(inputs: RbiInputs): Omit<RbiAssessment, "id" | "assessedAt"> {
  const pof = computePof(inputs);
  const cof = computeCof(inputs);
  const level = riskLevelFor(pof, cof);
  return {
    equipmentId: inputs.equipmentId,
    inputs,
    pof,
    cof,
    riskScore: pof * cof,
    riskLevel: level,
    recommendedIntervalDays: recommendedIntervalDays(level),
  };
}

/* ---------- Persistence ---------- */

function load(): RbiAssessment[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as RbiAssessment[];
  } catch {
    return [];
  }
}

function persist(list: RbiAssessment[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(list));
}

function uid(): string {
  return `rbi_${Math.random().toString(36).slice(2, 10)}`;
}

export async function assess(inputs: RbiInputs, notes?: string): Promise<Result<RbiAssessment>> {
  const core = calculate(inputs);
  const a: RbiAssessment = { ...core, id: uid(), assessedAt: new Date().toISOString(), notes };
  const list = load();
  list.unshift(a);
  persist(list);
  return { ok: true, data: a };
}

export async function listAssessments(): Promise<Result<RbiAssessment[]>> {
  return { ok: true, data: load() };
}

export async function latestFor(equipmentId: string): Promise<Result<RbiAssessment | null>> {
  const list = load().filter((a) => a.equipmentId === equipmentId);
  return { ok: true, data: list[0] ?? null };
}

export async function historyFor(equipmentId: string): Promise<Result<RbiAssessment[]>> {
  return { ok: true, data: load().filter((a) => a.equipmentId === equipmentId) };
}

/** Auto-suggest inputs from equipment + certificate history. */
export function suggestInputs(eq: Equipment, certs: IssuedCertificate[]): RbiInputs {
  const yom = Number(eq.spec?.yearOfManufacture ?? new Date().getFullYear());
  const age = Math.max(0, new Date().getFullYear() - (isNaN(yom) ? new Date().getFullYear() : yom));
  const forEq = certs.filter((c) => c.equipmentId === eq.id).slice(0, 3);
  const findings = forEq.reduce((n, c) => n + (c.defects?.length ?? 0), 0);
  const cat = eq.equipmentCategory ?? "generic";
  const fluidHazard: RbiInputs["fluidHazard"] =
    cat === "pressure_vessel" || cat === "pipeline" ? 4 : 2;
  return {
    equipmentId: eq.id,
    ageYears: age,
    operatingSeverity: cat === "tower_crane" || cat === "overhead_crane" ? 4 : 3,
    corrosionRateMmYr: cat === "pipeline" ? 0.2 : cat === "pressure_vessel" ? 0.1 : 0,
    previousFindingsCount: findings,
    fluidHazard,
    populationExposure: eq.site.includes("HQ") ? 4 : 3,
    productionCriticality: cat === "pipeline" || cat === "pressure_vessel" ? 4 : 3,
    environmentalImpact: cat === "pipeline" ? 4 : 2,
  };
}
