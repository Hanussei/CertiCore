import { Result } from "@/types";
import { supabase } from "@/lib/supabase";
import localforage from "localforage";

export interface SyncOperation {
  id: string;
  type: "upsert_equipment" | "issue_certificate" | "add_audit_log" | "update_branding";
  payload: any;
  timestamp: number;
  attempts: number;
}

const OUTBOX_STORE_KEY = "certicore_sync_outbox_v2";

// Configure localforage for IndexedDB
localforage.config({
  name: "CertiCore",
  storeName: "sync_queue",
  description: "IndexedDB sync queue for offline-first support in CertiCore",
});

// Retrieve current outbox queue from IndexedDB
export async function getOutbox(): Promise<SyncOperation[]> {
  try {
    const raw = await localforage.getItem<SyncOperation[]>(OUTBOX_STORE_KEY);
    return raw || [];
  } catch (e) {
    console.error("Failed to read IndexedDB sync outbox", e);
    return [];
  }
}

// Persist the outbox queue to IndexedDB
export async function saveOutbox(outbox: SyncOperation[]): Promise<void> {
  try {
    await localforage.setItem(OUTBOX_STORE_KEY, outbox);
  } catch (e) {
    console.error("Failed to save IndexedDB sync outbox", e);
  }
}

// Push an operation to the outbox queue
export async function pushToOutbox(
  type: SyncOperation["type"],
  payload: any
): Promise<void> {
  const outbox = await getOutbox();
  const newOp: SyncOperation = {
    id: crypto.randomUUID(),
    type,
    payload,
    timestamp: Date.now(),
    attempts: 0,
  };
  outbox.push(newOp);
  await saveOutbox(outbox);

  // Trigger sync in background if online
  if (typeof window !== "undefined" && navigator.onLine) {
    void processSyncQueue();
  }
}

// Main sync process
let isSyncing = false;

// Verifies if the database is reachable via RPC ping
async function isDatabaseReachable(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("ping_db");
    return !error && data === true;
  } catch {
    return false;
  }
}

export async function processSyncQueue(): Promise<Result<{ syncedCount: number }>> {
  if (isSyncing) {
    return { ok: false, error: { code: "SYNC_IN_PROGRESS", message: "Sync is already running" } };
  }

  if (typeof window !== "undefined" && !navigator.onLine) {
    return { ok: false, error: { code: "OFFLINE", message: "Device is offline" } };
  }

  const outbox = await getOutbox();
  if (outbox.length === 0) {
    return { ok: true, data: { syncedCount: 0 } };
  }

  // Ping the server to ensure we aren't behind a captive portal / fake connection
  const online = await isDatabaseReachable();
  if (!online) {
    console.warn("Internet detected, but Supabase database is unreachable.");
    return { ok: false, error: { code: "DB_UNREACHABLE", message: "Database is offline or unreachable" } };
  }

  isSyncing = true;
  const remaining: SyncOperation[] = [];
  const failedEquipmentIds = new Set<string>();
  let successCount = 0;
  const errors: string[] = [];

  console.log(`Starting sync of ${outbox.length} pending operations to Supabase...`);

  for (let i = 0; i < outbox.length; i++) {
    const op = outbox[i];

    // Skip certificates if their parent equipment sync failed in this run to avoid FK violations
    if (
      op.type === "issue_certificate" &&
      op.payload?.equipment_id &&
      failedEquipmentIds.has(op.payload.equipment_id)
    ) {
      console.warn(`Skipping certificate sync for ID: ${op.id} due to failed parent equipment sync.`);
      remaining.push(op);
      await saveOutbox([...remaining, ...outbox.slice(i + 1)]);
      continue;
    }

    try {
      op.attempts++;
      
      let error = null;
      switch (op.type) {
        case "upsert_equipment": {
          const { error: dbErr } = await supabase.from("equipment").upsert(op.payload);
          error = dbErr;
          break;
        }
        case "issue_certificate": {
          // Use the secure RPC upsert_certificate function to write the entire payload securely
          const { error: dbErr } = await supabase.rpc("upsert_certificate", {
            p_payload: op.payload,
          });
          error = dbErr;
          break;
        }
        case "add_audit_log": {
          const { error: dbErr } = await supabase.from("audit_logs").insert(op.payload);
          error = dbErr;
          break;
        }
        case "update_branding": {
          const { error: dbErr } = await supabase.from("branding").upsert(op.payload);
          error = dbErr;
          break;
        }
        default:
          break;
      }

      if (error) {
        throw new Error(error.message);
      }

      console.log(`Successfully synced ${op.type} (ID: ${op.id}) to Supabase`);
      successCount++;
    } catch (err: any) {
      const errMsg = `Failed to sync ${op.type}: ${err.message || err}`;
      console.error(errMsg);
      errors.push(errMsg);

      if (op.type === "upsert_equipment" && op.payload?.id) {
        failedEquipmentIds.add(op.payload.id);
      }

      if (op.attempts < 5) {
        remaining.push(op); // retry later
      } else {
        console.warn(`Discarding failing operation ${op.id} after 5 attempts`);
      }
    }

    // Save incrementally after each single processed item
    await saveOutbox([...remaining, ...outbox.slice(i + 1)]);
  }

  isSyncing = false;

  // Dispatch global event for UI updates
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("certicore-sync-complete", {
      detail: { syncedCount: successCount, remainingCount: remaining.length, errors }
    }));
  }

  return { ok: true, data: { syncedCount: successCount, errors } };
}

// Register browser listeners for online status
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    console.log("Device back online, processing sync outbox...");
    void processSyncQueue();
  });

  // Periodically check queue status every 30 seconds
  setInterval(() => {
    if (navigator.onLine) {
      void processSyncQueue();
    }
  }, 30000);
}
