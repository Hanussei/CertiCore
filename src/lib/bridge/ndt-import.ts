/**
 * Tauri boundary layer — NDT device file import.
 * Rust mapping: ndt_parse_file / ndt_map_readings.
 *
 * Phase 1 (this build): parse CSV / JSON exports from common NDT tools.
 * Phase 2 (Rust): USB/Serial live capture per manufacturer SDK.
 *
 * Supported now:
 *   - Generic CSV  (columns: location, reading, unit, criteria, verdict, notes)
 *   - Olympus 45MG (UT thickness gauge — CSV export)
 *   - Elcometer   (coating thickness — CSV)
 *   - Generic JSON array of readings
 */
import type { NdtMethod, Result } from "@/types";

export type NdtReading = {
  location: string;      // "Shell weld W-12" / "CML-04"
  measured: string;      // "8.42 mm"
  unit: string;          // "mm" / "µm" / "kN"
  criteria: string;      // "≥ 7.5 mm"
  verdict: "pass" | "fail" | "na";
  notes?: string;
  timestamp?: string;    // ISO if present
};

export type NdtImportResult = {
  device: string;          // "Olympus 45MG"
  method: NdtMethod;       // inferred
  readings: NdtReading[];
  warnings: string[];
};

export type SupportedDevice = {
  id: string;
  label: string;
  method: NdtMethod;
  extensions: string[];   // ["csv"]
  sample: string;         // sample header row for the UI
};

export const SUPPORTED_DEVICES: SupportedDevice[] = [
  {
    id: "generic_csv",
    label: "Generic CSV",
    method: "VT",
    extensions: ["csv"],
    sample: "location,reading,unit,criteria,verdict,notes",
  },
  {
    id: "olympus_45mg",
    label: "Olympus 45MG (UT thickness)",
    method: "THICKNESS_UT",
    extensions: ["csv"],
    sample: "ID,Thickness,Units,Min,Max,Date",
  },
  {
    id: "elcometer",
    label: "Elcometer (coating thickness)",
    method: "UT",
    extensions: ["csv"],
    sample: "Reading#,Value,Unit,Batch,Timestamp",
  },
  {
    id: "generic_json",
    label: "Generic JSON",
    method: "VT",
    extensions: ["json"],
    sample: '[{"location":"...","measured":"...","unit":"...","criteria":"...","verdict":"pass"}]',
  },
];

/* -------- Parsers -------- */

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  for (const line of lines) {
    // simple CSV — no quoted commas support (Rust impl will use proper parser)
    rows.push(line.split(",").map((c) => c.trim()));
  }
  return rows;
}

function verdictOf(raw: string | undefined, measured?: number, min?: number): NdtReading["verdict"] {
  const s = (raw ?? "").toLowerCase();
  if (["pass", "ok", "acc", "accept"].some((k) => s.includes(k))) return "pass";
  if (["fail", "rej", "reject"].some((k) => s.includes(k))) return "fail";
  if (s.includes("n/a") || s === "na") return "na";
  if (typeof measured === "number" && typeof min === "number") {
    return measured >= min ? "pass" : "fail";
  }
  return "na";
}

function parseGenericCsv(text: string): NdtImportResult {
  const rows = parseCsv(text);
  const warnings: string[] = [];
  if (rows.length < 2) return { device: "Generic CSV", method: "VT", readings: [], warnings: ["Empty file"] };
  const header = rows[0].map((h) => h.toLowerCase());
  const idx = (k: string) => header.indexOf(k);
  const iLoc = idx("location");
  const iReading = idx("reading");
  const iUnit = idx("unit");
  const iCrit = idx("criteria");
  const iVerd = idx("verdict");
  const iNotes = idx("notes");
  if (iLoc < 0 || iReading < 0) warnings.push("Missing 'location' or 'reading' column");
  const readings: NdtReading[] = rows.slice(1).map((r) => ({
    location: r[iLoc] ?? "",
    measured: `${r[iReading] ?? ""}${r[iUnit] ? " " + r[iUnit] : ""}`.trim(),
    unit: r[iUnit] ?? "",
    criteria: r[iCrit] ?? "",
    verdict: verdictOf(r[iVerd]),
    notes: iNotes >= 0 ? r[iNotes] : undefined,
  }));
  return { device: "Generic CSV", method: "VT", readings, warnings };
}

function parseOlympus45mg(text: string): NdtImportResult {
  const rows = parseCsv(text);
  const warnings: string[] = [];
  const readings: NdtReading[] = rows.slice(1).map((r) => {
    const measured = parseFloat(r[1]);
    const min = parseFloat(r[3]);
    return {
      location: r[0] ?? "",
      measured: `${r[1]} ${r[2] ?? "mm"}`,
      unit: r[2] ?? "mm",
      criteria: r[3] ? `≥ ${r[3]} ${r[2] ?? "mm"}` : "",
      verdict: verdictOf(undefined, measured, min),
      timestamp: r[5],
    };
  });
  if (readings.length === 0) warnings.push("No readings found");
  return { device: "Olympus 45MG", method: "THICKNESS_UT", readings, warnings };
}

function parseElcometer(text: string): NdtImportResult {
  const rows = parseCsv(text);
  const readings: NdtReading[] = rows.slice(1).map((r) => ({
    location: `Batch ${r[3] ?? "-"} · #${r[0] ?? "-"}`,
    measured: `${r[1] ?? ""} ${r[2] ?? "µm"}`,
    unit: r[2] ?? "µm",
    criteria: "",
    verdict: "na" as const,
    timestamp: r[4],
  }));
  return { device: "Elcometer", method: "UT", readings, warnings: [] };
}

function parseJson(text: string): NdtImportResult {
  try {
    const arr = JSON.parse(text);
    if (!Array.isArray(arr)) return { device: "JSON", method: "VT", readings: [], warnings: ["Not an array"] };
    const readings: NdtReading[] = arr.map((r: Record<string, unknown>) => ({
      location: String(r.location ?? ""),
      measured: String(r.measured ?? ""),
      unit: String(r.unit ?? ""),
      criteria: String(r.criteria ?? ""),
      verdict: verdictOf(String(r.verdict ?? "")),
      notes: r.notes ? String(r.notes) : undefined,
    }));
    return { device: "JSON", method: "VT", readings, warnings: [] };
  } catch (e) {
    return { device: "JSON", method: "VT", readings: [], warnings: [`Invalid JSON: ${(e as Error).message}`] };
  }
}

export async function parseFile(deviceId: string, file: File): Promise<Result<NdtImportResult>> {
  const text = await file.text();
  try {
    switch (deviceId) {
      case "generic_csv":  return { ok: true, data: parseGenericCsv(text) };
      case "olympus_45mg": return { ok: true, data: parseOlympus45mg(text) };
      case "elcometer":    return { ok: true, data: parseElcometer(text) };
      case "generic_json": return { ok: true, data: parseJson(text) };
      default:
        return { ok: false, error: { code: "unknown_device", message: `Unknown device: ${deviceId}` } };
    }
  } catch (e) {
    return { ok: false, error: { code: "parse_error", message: (e as Error).message } };
  }
}
