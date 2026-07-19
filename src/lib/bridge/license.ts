/**
 * Tauri boundary layer — License / Activation commands.
 * Rust mapping: license_activate / license_get / license_deactivate.
 *
 * V1 prototype: validates a well-formed code offline and persists in
 * localStorage. Rust impl will verify a signed license key against a
 * public key and bind it to a machine fingerprint via the OS keychain.
 */
import { supabase } from "@/lib/supabase";
import type { Result } from "@/types";

const LICENSE_KEY = "certicore.license.v1";

export type LicenseTier = "trial" | "pro" | "enterprise";

export type License = {
  code: string;
  tier: LicenseTier;
  organization: string;
  seats: number;
  activatedAt: string; // ISO
  expiresAt: string;   // ISO
  machineId: string;
};

const CODE_RE = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

function fakeMachineId(): string {
  // Rust will use a real fingerprint (mac addr hash, etc.)
  const n = (typeof crypto !== "undefined" && crypto.getRandomValues)
    ? Array.from(crypto.getRandomValues(new Uint8Array(6))).map((b) => b.toString(16).padStart(2, "0")).join(":")
    : "aa:bb:cc:dd:ee:ff";
  return n.toUpperCase();
}

export async function activate(code: string): Promise<Result<License>> {
  const clean = code.trim().toUpperCase();
  if (!CODE_RE.test(clean)) {
    return {
      ok: false,
      error: {
        code: "invalid_format",
        message: "Activation code must be XXXX-XXXX-XXXX-XXXX.",
      },
    };
  }

  try {
    const hwId = fakeMachineId();
    const devName = typeof window !== "undefined" ? window.navigator.userAgent.slice(0, 100) : "Desktop Client";

    // 1. Get license details via RPC
    const { data: licDetails, error: licErr } = await supabase.rpc("get_license_details", {
      p_code: clean,
    });

    if (licErr || !licDetails || licDetails.length === 0) {
      return {
        ok: false,
        error: {
          code: "invalid_license",
          message: "The activation code is invalid or has expired.",
        },
      };
    }

    const licenseData = licDetails[0];

    // 2. Register the device via RPC
    const { data: regRes, error: regErr } = await supabase.rpc("register_device", {
      p_code: clean,
      p_hw_id: hwId,
      p_name: devName,
    });

    if (regErr || !regRes || regRes.length === 0 || !regRes[0].success) {
      return {
        ok: false,
        error: {
          code: "registration_failed",
          message: regRes?.[0]?.message || regErr?.message || "Failed to register device seat.",
        },
      };
    }

    const license: License = {
      code: clean,
      tier: (licenseData.tier as LicenseTier) || "trial",
      organization: licenseData.organization || "Field Workspace",
      seats: licenseData.seats || 2,
      activatedAt: new Date().toISOString(),
      expiresAt: licenseData.expires_at,
      machineId: hwId,
    };

    if (typeof window !== "undefined") {
      window.localStorage.setItem(LICENSE_KEY, JSON.stringify(license));
    }
    return { ok: true, data: license };
  } catch (err: any) {
    return {
      ok: false,
      error: {
        code: "exception",
        message: err.message || "Failed to contact database.",
      },
    };
  }
}

export async function getLicense(): Promise<Result<License | null>> {
  if (typeof window === "undefined") return { ok: true, data: null };
  const raw = window.localStorage.getItem(LICENSE_KEY);
  if (!raw) return { ok: true, data: null };
  try {
    return { ok: true, data: JSON.parse(raw) as License };
  } catch {
    return { ok: true, data: null };
  }
}

export async function deactivate(): Promise<Result<null>> {
  try {
    const activeRes = await getLicense();
    if (activeRes.ok && activeRes.data) {
      const { code, machineId } = activeRes.data;
      await supabase
        .from("devices")
        .update({ active: false })
        .eq("license_code", code)
        .eq("hardware_id", machineId);
    }
  } catch (e) {
    console.error("Failed to release license seat on database", e);
  }
  if (typeof window !== "undefined") window.localStorage.removeItem(LICENSE_KEY);
  return { ok: true, data: null };
}

export const LICENSE_DEMO_HINTS: Array<{ code: string; tier: LicenseTier; organization: string; seats: number }> = [];

export async function verifyLicenseOnline(code: string): Promise<Result<boolean>> {
  try {
    const { data, error } = await supabase.rpc("get_license_details", {
      p_code: code,
    });
    if (error || !data || data.length === 0) {
      return { ok: true, data: false };
    }
    return { ok: true, data: true };
  } catch {
    return { ok: true, data: false };
  }
}

export type Device = {
  id: string;
  license_code: string;
  device_name: string;
  hardware_id: string;
  registered_at: string;
  active: boolean;
};

export async function getActiveDevices(code: string): Promise<Result<Device[]>> {
  try {
    const { data, error } = await supabase
      .from("devices")
      .select("*")
      .eq("license_code", code)
      .eq("active", true)
      .order("registered_at", { ascending: false });

    if (error) {
      return { ok: false, error: { code: "db_error", message: error.message } };
    }
    return { ok: true, data: data as Device[] };
  } catch (err: any) {
    return { ok: false, error: { code: "exception", message: err.message } };
  }
}

export async function releaseDevice(deviceId: string): Promise<Result<null>> {
  try {
    const { error } = await supabase
      .from("devices")
      .update({ active: false })
      .eq("id", deviceId);

    if (error) {
      return { ok: false, error: { code: "db_error", message: error.message } };
    }
    return { ok: true, data: null };
  } catch (err: any) {
    return { ok: false, error: { code: "exception", message: err.message } };
  }
}
