# Cloodsy S3 Web UI

Standalone admin SPA for [Cloodsy S3](https://github.com/onaonbir/Cloodsy-S3) servers. Feature parity with the [Flutter desktop GUI](https://github.com/onaonbir/Cloodsy-S3-GUI): multi-server management, dashboard, bucket detail (Overview / Files / Credentials / Settings / Lifecycle / Webhooks), and admin users.

Built with **Vite + React 19 + TypeScript**. No UI kit — custom CSS (shadcn/zinc palette), Lucide icons, Geist/Inter fonts.

## Features

- Multi-server connect (persisted in `localStorage`)
- Dashboard stats, bucket cards, create/delete, update banner
- Bucket file browser with upload, download, rename, text edit, folders, multi-select delete
- Credentials, quota, storage dir, versioning, public-read, WebDAV, image reprocess
- Lifecycle rules & webhooks CRUD
- Admin users with one-time password dialogs
- Light / dark / system theme
- Responsive: sidebar ≥900px, mobile layout below

## Server-side setup (CORS)

The browser calls the Admin API and S3 API directly, so both must allow your UI origin:

```yaml
# In your Cloodsy S3 config.yaml
server:
  listen: ":9000"
  cors_origins:
    - "*"   # required for browser upload/download/edit

admin:
  enabled: true
  listen: ":9001"
  cors_origins:
    - "*"   # or e.g. ["http://localhost:5173"]
```

**Important:** Uploads use the S3 port (`9000`), not the Admin port. Without `server.cors_origins`, the browser blocks PUT/GET and file ops fail.

File upload/download/edit use the S3 API with a bucket access key from **Credentials**.

Create an admin user on the server:

```bash
./cloodsys3 admin create myadmin
```

Also create at least one **read-write** credential on each bucket you want to manage files in (Credentials tab or CLI).

## Run

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`), then **Add Server** with:

| Field | Example |
|-------|---------|
| Name | Production |
| Admin URL | `https://admin.example.com:9001` |
| S3 URL | `https://s3.example.com` (or `s3.example.com`) |
| Username | myadmin |
| Password | (your admin password) |

Optional CORS-free proxies for local testing:

```bash
VITE_PROXY_TARGET=http://192.168.1.100:9001 \
VITE_S3_PROXY_TARGET=http://192.168.1.100:9000 \
npm run dev
```

Then in the UI set:

- Admin URL: `http://localhost:5173`
- S3 URL: `http://localhost:5173/s3-api`

## Build & deploy

```bash
npm install
npm run audit   # fail on high+ advisories
npm run build
npm run preview # optional: serve dist/ locally with security headers
```

Output is static files in `dist/` (nginx, Caddy, Cloudflare Pages, GitHub Pages, etc.).

### Recommended reverse-proxy headers

```nginx
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()" always;
# CSP is also injected into dist/index.html at build time.
```

`public/_headers` is copied into `dist/` for Cloudflare Pages / Netlify.

## Security notes

- Passwords and session tokens are stored in **browser `localStorage`** (same model as other browser admin UIs). Anyone with physical access to the browser profile, or a successful XSS on this origin, can read them. Serve the UI only over HTTPS and keep the origin dedicated.
- Production builds do **not** emit debug logs. The Vite debug sink (`/__cloodsy_debug`) exists only in `npm run dev`.
- Admin and S3 URLs must be `http` or `https` (other schemes are rejected).
- Dependency advisories: `npm run audit` (also runs in CI).

## Architecture

| Layer | Role |
|-------|------|
| `src/api/client.ts` | `GET/POST/PUT/DELETE` → `{baseUrl}/admin{path}`, Bearer token, 10s timeout |
| `src/store/ServerStore.tsx` | Server list + passwords/tokens in `localStorage` |
| `src/store/auth.tsx` | Connect / login / logout / 401 recovery |
| `src/store/buckets.tsx` | Buckets, objects, credentials, lifecycle, webhooks, admins, status |

## License

[Cloodsy S3 Web UI Community License 1.0](./LICENSE) — personal, internal, educational, and self-hosted use. Commercial redistribution requires permission (see `LICENSE`).
