/**
 * Tauri boundary layer — Branding commands.
 * Rust mapping: branding_get / branding_save / branding_upload_logo.
 *
 * Prototype persists to localStorage; Rust impl will write to
 * `AppData/certicore/branding.json` and copy the logo to `AppData/certicore/logo.*`.
 */
import type { Branding, Result } from "@/types";

const BRANDING_KEY = "certicore.branding.v1";

export const DEFAULT_BRANDING: Branding = {
  organizationName: "WHO CARES Engineering",
  organizationNameAr: "هوو كيرز للهندسة",
  registrationNo: "REG-2024-0918",
  addressLine1: "Industrial Zone, Building 14",
  addressLine2: "Riyadh, Saudi Arabia",
  phone: "+966 11 000 0000",
  email: "certification@whocares.eng",
  website: "whocares.eng",
  primaryColor: "oklch(0.20 0.055 260)",
  accentColor: "oklch(0.76 0.14 78)",
  footerText:
    "This certificate is issued under the authority of WHO CARES Engineering and is valid until the next scheduled inspection.",
  footerTextAr:
    "تصدر هذه الشهادة تحت سلطة هوو كيرز للهندسة وتظل سارية حتى موعد الفحص التالي.",
  logoDataUrl: null,
  managerName: "Dr. Faisal Al-Mansour",
  managerTitle: "Technical Manager · Competent Person",
  managerSignatureDataUrl: null,
  stampDataUrl: null,
  accreditations: "UKAS · SASO · ISO/IEC 17020",
  accreditationLogos: [],
  watermarkEnabled: true,
  updatedAt: new Date(0).toISOString(),
};

export async function getBranding(): Promise<Result<Branding>> {
  if (typeof window === "undefined") return { ok: true, data: DEFAULT_BRANDING };
  const raw = window.localStorage.getItem(BRANDING_KEY);
  if (!raw) return { ok: true, data: DEFAULT_BRANDING };
  try {
    const parsed = JSON.parse(raw) as Partial<Branding>;
    return { ok: true, data: { ...DEFAULT_BRANDING, ...parsed } };
  } catch {
    return { ok: true, data: DEFAULT_BRANDING };
  }
}

import { pushToOutbox } from "./supabase-sync";

export async function saveBranding(branding: Branding): Promise<Result<Branding>> {
  try {
    await new Promise((r) => setTimeout(r, 250));
    const next: Branding = { ...branding, updatedAt: new Date().toISOString() };
    if (typeof window !== "undefined") {
      window.localStorage.setItem(BRANDING_KEY, JSON.stringify(next));
    }
    void pushToOutbox("update_branding", next);
    return { ok: true, data: next };
  } catch (err: any) {
    console.error("Failed to save branding locally:", err);
    return {
      ok: false,
      error: {
        code: "save_failed",
        message: err.name === "QuotaExceededError"
          ? "Local storage quota exceeded. Please reduce the size or number of uploaded logos."
          : (err.message || "Failed to save branding preferences locally.")
      }
    };
  }
}

/** Reads a File and returns a base64 data URL. Rust will copy to disk instead. */
export async function uploadLogo(file: File): Promise<Result<string>> {
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: { code: "invalid_type", message: "Logo must be an image (PNG or SVG)." } };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { ok: false, error: { code: "too_large", message: "Logo must be under 2 MB." } };
  }
  let dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  try {
    const { compressImage } = await import("./media");
    dataUrl = await compressImage(dataUrl, 400, 400, 0.85);
  } catch (e) {
    console.warn("Failed to compress logo:", e);
  }

  return { ok: true, data: dataUrl };
}

export async function resetBranding(): Promise<Result<Branding>> {
  if (typeof window !== "undefined") window.localStorage.removeItem(BRANDING_KEY);
  return { ok: true, data: DEFAULT_BRANDING };
}
