# Bridge Layer — Architectural Contract

This directory is the **sole boundary** between the React frontend and the
future native/Rust runtime. Every module here mirrors what will eventually
become a `#[tauri::command]` on the Rust side.

## Ground rules (locked in)

1. **All calls are async and return `Result<T>`.** No throws. See `@/types` for
   the `Result` / `BridgeError` shapes. UI code must handle both branches.
2. **No direct storage access from components.** Components go through a Zustand
   store, stores go through a bridge module, bridge modules own persistence.
3. **Prototype persistence is `localStorage` / `sessionStorage`.** The Rust impl
   will swap this for `AppData/certicore/...` files without changing signatures.
4. **Offline-first.** All reads and writes succeed while offline. Sync to
   Supabase happens later, out-of-band, and is invisible to callers.
5. **Supabase is the sync target — not the source of truth.** The device is
   authoritative. Supabase mirrors metadata (branding, users, license, audit,
   issued-certificate index), never blocks a field workflow.

## What Rust will implement (per module)

| Bridge module         | Rust commands (planned)                                  |
|-----------------------|-----------------------------------------------------------|
| `auth.ts`             | `sign_in`, `sign_out`, `current_user`                     |
| `license.ts`          | `license_activate`, `license_get`, `license_deactivate`   |
| `branding.ts`         | `branding_get`, `branding_save`, `branding_upload_logo`   |
| `media.ts`            | `media_list/upload/update/delete`                         |
| `equipment.ts`        | `equipment_list/upsert/delete`                            |
| `inspectors.ts`       | `inspector_list/upsert/delete`                            |
| `templates.ts`        | `template_list/upsert/delete/publish`                     |
| `standards.ts`        | `standards_list`                                          |
| `checklists.ts`       | `checklist_load`                                          |
| `test-equipment.ts`   | `test_eq_list/upsert/delete`                              |
| `inspections.ts`      | `draft_list/upsert/delete`, `certificate_issue/list`      |
| `audit.ts`            | `audit_append/list`                                       |
| `weather.ts`          | `weather_fetch` (HTTP through Rust to avoid CORS)         |

## What NOT to do

- ❌ Import any bridge module from Rust-only code paths.
- ❌ Add browser-only globals (window, document) inside bridge helpers except
  behind the existing `typeof window` guards — the Rust runtime has none.
- ❌ Throw errors. Always return `{ ok: false, error }`.
- ❌ Persist raw file `Blob`s. Convert to base64 data URLs or opaque IDs first;
  the Rust side stores real files on disk under the app data directory.
