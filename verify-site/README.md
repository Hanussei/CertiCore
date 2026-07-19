# CertiCore Public Verify Site

A **zero-backend** static HTML page that publicly verifies the authenticity
of any CertiCore-issued certificate — no servers, no databases, no per-check
cost. Deploy it once to any free static host and it works forever.

## How it works

```
[Field device: CertiCore]
   ↓ signs cert body with Ed25519 private key
   ↓ uploads signed JSON to cloud storage
[Cloud storage — S3 / R2 / Supabase Storage]
   ↓ public read-only bucket, one JSON file per certificate
[This static site]
   ↓ fetches JSON, verifies signature with embedded public key
[Anyone with the QR / URL] → sees ✅ Valid or ❌ Tampered
```

Verification happens **entirely in the visitor's browser** via WebCrypto.
The page never phones home.

## Deployment (5 minutes, free)

### 1. Get your public key

In the desktop app: **Settings → Publish (QR verification) → Copy public key**.

### 2. Edit `index.html`

Find the config block near the top of the `<script>` tag and set:

```html
<script>
  window.CERTICORE_STORAGE_BASE = "https://your-bucket.example.com/certs";
  window.CERTICORE_PUBLIC_KEY   = "PASTE_BASE64_PUBLIC_KEY_HERE";
</script>
```

You can either add that `<script>` before the module script, or replace the
`STORAGE_BASE` / `PUBLIC_KEY_B64` constants inside the module directly.

### 3. Upload the folder

| Host              | Steps                                                              | Cost |
|-------------------|--------------------------------------------------------------------|------|
| GitHub Pages      | Push folder to a repo → Settings → Pages → Deploy from main        | Free |
| Cloudflare Pages  | `wrangler pages deploy verify-site/`                               | Free |
| Netlify           | Drag-and-drop the folder onto app.netlify.com                      | Free |
| Any web host      | Upload `index.html` to public_html                                 | —    |

### 4. Configure storage

Any object storage with public read access works. Recommended:

- **Cloudflare R2** — 10 GB free, no egress fees.
- **Supabase Storage** — bundled with Lovable Cloud if enabled.
- **AWS S3** — set the bucket policy to `s3:GetObject` for `*`.

Each certificate becomes one file: `<cert-id>.json`, uploaded to the base URL
you configured above.

### 5. Point QR codes at the site

Certificate QR codes should encode:

```
https://verify.yourdomain.com/?id=<cert-id>
```

The page reads `?id=...`, fetches `<STORAGE_BASE>/<id>.json`, and verifies.

## What is verified

The browser recomputes a **canonical JSON string** from the `payload` field
(sorted keys, deterministic serialization) and checks the Ed25519 (or ECDSA
P-256 fallback) signature against the public key baked into the page.

If **anyone** changes even a single character of the certificate JSON after
issuance, the signature check fails and the page shows ❌ Tampered.

The page also flags certificates that are **past their `validUntil` date**,
even when the signature is still valid.

## Key rotation

If you rotate the CertiCore signing key, redeploy the site with the new
public key. Old certificates signed with the previous key can be verified by
keeping the old version of the site at a different subdomain, e.g.
`verify-v1.yourdomain.com`.

## Privacy

The site has no analytics, no cookies, no third-party scripts, and makes
exactly one outbound request per verification (the fetch to storage). Nothing
is logged.
