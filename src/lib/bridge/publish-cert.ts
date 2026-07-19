/**
 * Tauri boundary layer — Publish signed certificate for public QR verification.
 * Rust mapping: publish_sign_and_upload / publish_get_keypair.
 */
import { supabase } from "@/lib/supabase";
import type { IssuedCertificate, Result } from "@/types";

const KEYPAIR_KEY = "certicore.publish.keypair.v1";
const PUBLISHED_KEY = "certicore.publish.certs.v1";
const CONFIG_KEY = "certicore.publish.config.v1";

export type PublishConfig = {
  storageBaseUrl: string;    // "https://<proj>.supabase.co/storage/v1/object/public/certificates"
  verifyBaseUrl: string;     // "https://certi-core-certicore.vercel.app"
};

export type StoredKeypair = {
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
  publicKeyB64: string;      // convenient copy for embedding in the verify site
  createdAt: string;
};

export type PublishedCertificate = {
  version: 1;
  certificateId: string;
  equipmentTag: string;
  equipmentName: string;
  templateName: string;
  inspectorName: string;
  result: string;
  issuedAt: string;
  validUntil: string;
  hash: string;
  publicKeyB64: string;      // repeated so verifiers can spot key rotation
  signatureB64: string;      // Ed25519 signature over the canonical payload
  payload: Record<string, unknown>; // canonicalized cert body
};

/* ---------- Helpers ---------- */

function b64FromBytes(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function bytesFromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

function canonicalize(v: any): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canonicalize).join(",") + "]";
  const keys = Object.keys(v).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalize(v[k])).join(",") + "}";
}

/* ---------- Keypair management ---------- */

export async function getConfig(): Promise<Result<PublishConfig>> {
  if (typeof window === "undefined") return { ok: true, data: { storageBaseUrl: "", verifyBaseUrl: "" } };
  const raw = window.localStorage.getItem(CONFIG_KEY);
  if (!raw) {
    const defaultStorage = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/certificates`;
    const defaultVerify = import.meta.env.VITE_PUBLIC_VERIFY_URL || "https://certi-core-certicore.vercel.app";
    const def: PublishConfig = { storageBaseUrl: defaultStorage, verifyBaseUrl: defaultVerify };
    window.localStorage.setItem(CONFIG_KEY, JSON.stringify(def));
    return { ok: true, data: def };
  }
  try {
    const parsed = JSON.parse(raw) as PublishConfig;
    const envVerify = import.meta.env.VITE_PUBLIC_VERIFY_URL;
    if (envVerify && (parsed.verifyBaseUrl === "https://certi-core-certicore.vercel.app" || !parsed.verifyBaseUrl)) {
      parsed.verifyBaseUrl = envVerify;
      window.localStorage.setItem(CONFIG_KEY, JSON.stringify(parsed));
    }
    return { ok: true, data: parsed };
  } catch {
    return { ok: true, data: { storageBaseUrl: "", verifyBaseUrl: "" } };
  }
}

export async function saveConfig(cfg: PublishConfig): Promise<Result<null>> {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  }
  return { ok: true, data: null };
}

// Generate new keys and save public key to branding table
async function syncPublicKeyToBranding(publicKeyB64: string): Promise<void> {
  try {
    // Save to global row in branding settings so verify-site can fetch it
    await supabase
      .from("branding")
      .update({ public_key: publicKeyB64 })
      .eq("id", "global");
  } catch (e) {
    console.error("Failed to sync public key to Supabase branding table", e);
  }
}

export async function getOrCreateKeypair(): Promise<Result<StoredKeypair>> {
  if (typeof window === "undefined") {
    return { ok: false, error: { code: "not_supported", message: "Server-side KeyGen not supported." } };
  }
  const raw = window.localStorage.getItem(KEYPAIR_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as StoredKeypair;
      // Sync fallback in case db was wiped
      void syncPublicKeyToBranding(parsed.publicKeyB64);
      return { ok: true, data: parsed };
    } catch {}
  }

  try {
    // Generate Ed25519 keypair
    const pair = await crypto.subtle.generateKey(
      { name: "Ed25519" } as AlgorithmIdentifier,
      true,
      ["sign", "verify"]
    );
    const pubJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
    const privJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);

    // Export raw SPKI to base64
    const pubSpki = new Uint8Array(await crypto.subtle.exportKey("spki", pair.publicKey));
    const publicKeyB64 = b64FromBytes(pubSpki);

    const kp: StoredKeypair = {
      publicKeyJwk: pubJwk,
      privateKeyJwk: privJwk,
      publicKeyB64,
      createdAt: new Date().toISOString(),
    };

    window.localStorage.setItem(KEYPAIR_KEY, JSON.stringify(kp));
    void syncPublicKeyToBranding(publicKeyB64);

    return { ok: true, data: kp };
  } catch (err: any) {
    return { ok: false, error: { code: "keygen_failed", message: err.message || "Failed to generate keypair." } };
  }
}

export async function rotateKeypair(): Promise<Result<StoredKeypair>> {
  if (typeof window !== "undefined") window.localStorage.removeItem(KEYPAIR_KEY);
  return getOrCreateKeypair();
}

/* ---------- Signing + publishing ---------- */

async function importPrivateKey(jwk: JsonWebKey): Promise<{ key: CryptoKey; algo: AlgorithmIdentifier | EcdsaParams }> {
  if (jwk.crv === "Ed25519") {
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "Ed25519" } as AlgorithmIdentifier, false, ["sign"]);
    return { key, algo: { name: "Ed25519" } as AlgorithmIdentifier };
  }
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  return { key, algo: { name: "ECDSA", hash: "SHA-256" } as EcdsaParams };
}

export async function signAndPackage(
  cert: IssuedCertificate,
): Promise<Result<PublishedCertificate>> {
  const kpRes = await getOrCreateKeypair();
  if (!kpRes.ok) return kpRes;
  const { key, algo } = await importPrivateKey(kpRes.data.privateKeyJwk);
  
  // Extract active license details to verify organization name
  const { getLicense } = await import("./license");
  const licenseRes = await getLicense();
  const activeOrg = licenseRes.ok && licenseRes.data ? licenseRes.data.organization : "GEN";

  const payload = {
    id: cert.id,
    equipmentTag: cert.equipmentTag,
    equipmentName: cert.equipmentName,
    templateName: cert.templateName,
    inspectorName: cert.inspectorName,
    result: cert.result,
    issuedAt: cert.issuedAt,
    validUntil: cert.validUntil,
    hash: cert.hash,
    organization: activeOrg, // Bind organization name inside signed payload
    checklist: cert.checklist ?? [],
    ndt: cert.ndt ?? [],
    defects: cert.defects ?? [],
  };
  const canonical = canonicalize(payload);
  const sigBytes = new Uint8Array(
    await crypto.subtle.sign(algo, key, new TextEncoder().encode(canonical)),
  );
  
  const pkg: PublishedCertificate = {
    version: 1,
    certificateId: cert.id,
    equipmentTag: cert.equipmentTag,
    equipmentName: cert.equipmentName,
    templateName: cert.templateName,
    inspectorName: cert.inspectorName,
    result: cert.result,
    issuedAt: cert.issuedAt,
    validUntil: cert.validUntil,
    hash: cert.hash,
    publicKeyB64: kpRes.data.publicKeyB64,
    signatureB64: b64FromBytes(sigBytes),
    payload,
  };

  // Upload static JSON certificate payload to Supabase Storage bucket 'certificates'
  try {
    const { error: uploadErr } = await supabase.storage
      .from("certificates")
      .upload(`${cert.id}.json`, JSON.stringify(pkg, null, 2), {
        contentType: "application/json",
        upsert: true,
      });

    if (uploadErr) {
      console.error("Failed to upload certificate payload to Supabase storage", uploadErr);
      return { ok: false, error: { code: "upload_failed", message: `Failed to upload to cloud: ${uploadErr.message}. Ensure a public bucket named 'certificates' is configured in Supabase.` } };
    }
  } catch (e: any) {
    return { ok: false, error: { code: "exception", message: e.message || "Failed to reach cloud storage." } };
  }

  const list = listPublishedSync();
  const idx = list.findIndex((p) => p.certificateId === cert.id);
  if (idx >= 0) list[idx] = pkg;
  else list.unshift(pkg);
  if (typeof window !== "undefined") window.localStorage.setItem(PUBLISHED_KEY, JSON.stringify(list));
  return { ok: true, data: pkg };
}

function listPublishedSync(): PublishedCertificate[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(PUBLISHED_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PublishedCertificate[];
  } catch {
    return [];
  }
}

export async function listPublished(): Promise<Result<PublishedCertificate[]>> {
  return { ok: true, data: listPublishedSync() };
}

export function verifyUrlFor(cfg: PublishConfig, certId: string): string {
  const base = cfg.verifyBaseUrl.replace(/\/+$/, "");
  const defaultVerify = import.meta.env.VITE_PUBLIC_VERIFY_URL || "https://certi-core-certicore.vercel.app";
  return base ? `${base}/?id=${encodeURIComponent(certId)}` : `${defaultVerify}/?id=${encodeURIComponent(certId)}`;
}

export function storageUrlFor(cfg: PublishConfig, certId: string): string {
  const base = cfg.storageBaseUrl.replace(/\/+$/, "");
  const defaultStorage = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/certificates`;
  return base ? `${base}/${encodeURIComponent(certId)}.json` : `${defaultStorage}/${encodeURIComponent(certId)}.json`;
}
