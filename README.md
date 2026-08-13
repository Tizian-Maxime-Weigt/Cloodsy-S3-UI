# Cloodsy S3 Web UI

Browser admin UI for [Cloodsy S3](https://github.com/onaonbir/Cloodsy-S3). Manage servers, buckets, files, credentials, lifecycle rules, webhooks, and admin users.

## Docker

From the repo root:

- Multi-server connect (persisted in `localStorage`)
- Dashboard stats, bucket cards, create/delete, update banner
- Bucket file browser with upload, download, rename, text edit, folders, multi-select delete
- Credentials, quota, storage dir, versioning, public-read, WebDAV, image reprocess
- Lifecycle rules & webhooks CRUD
- Admin users with one-time password dialogs
- Light / dark / system theme
- Live dashboard stats and bucket settings (WebSocket when the server supports it, otherwise silent auto-refresh)
- Responsive: sidebar ≥900px, mobile layout below

## Server-side setup (CORS)

Open [http://localhost:8080](http://localhost:8080).

Or build and run the image yourself:

```bash
docker build -f Docker/Dockerfile -t cloodsy-s3-ui .
docker run --rm -p 8080:80 cloodsy-s3-ui
```

## Development

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Connect a server

You need a Cloodsy S3 instance with admin enabled, and an admin user:

```bash
./cloodsys3 admin create myadmin
```

In the UI, **Add Server**:

| Field | Example |
|-------|---------|
| Name | Production |
| Admin URL | `https://admin.example.com:9001` |
| S3 URL | `https://s3.example.com` |
| Username | myadmin |
| Password | your admin password |

S3 URL is optional if it can be derived from the Admin URL. Create a read-write credential on each bucket you want to browse files in.

## Build

```bash
npm install
npm run build
```

Static files land in `dist/` and can be served by any web server.

| Layer | Role |
|-------|------|
| `src/api/client.ts` | `GET/POST/PUT/DELETE` → `{baseUrl}/admin{path}`, Bearer token, 10s timeout |
| `src/store/ServerStore.tsx` | Server list + optional passwords/tokens in `localStorage` |
| `src/store/auth.tsx` | Connect / login / logout / 401 recovery |
| `src/store/buckets.tsx` | Buckets, objects, credentials, lifecycle, webhooks, admins, status, live sync |

## Live updates

While you are connected, dashboard stats, bucket overview, and settings stay current without clicking Refresh.

1. **WebSocket** — If the Admin API serves `GET /admin/ws`, the UI connects with the session token and applies JSON events immediately. The top bar shows **Live**.
2. **Auto-refresh** — Current Cloodsy S3 releases are REST-only. The UI probes the socket once, then silently polls `/admin/status`, `/admin/buckets`, and the open bucket. The top bar shows **Auto**. Polling pauses while the browser tab is hidden.

Settings toggles (versioning, public-read, WebDAV, quota) update the UI as soon as the Admin API accepts them; background sync confirms the server value.

### Optional Admin WebSocket protocol

A future server can enable **Live** by accepting a WebSocket at `/admin/ws` (token as `?token=` and/or a first `{ "type": "auth", "token" }` message) and sending JSON:

```json
{ "type": "hello" }
{ "type": "status", "data": { "status": "ok", "version": "1.0.1" } }
{ "type": "buckets", "data": { "buckets": [] } }
{ "type": "bucket.updated", "data": { "name": "photos", "public_read": true } }
{ "type": "objects.changed", "bucket": "photos" }
```

The client also sends `{ "type": "subscribe", "channels": ["status", "buckets"] }` after connect. Until that endpoint exists, **Auto** polling is the compatibility path.

Token query strings may appear in reverse-proxy access logs; prefer first-message auth on the server when you add the socket.

MIT
