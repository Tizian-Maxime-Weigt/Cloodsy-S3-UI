# Cloodsy S3 UI

**Browser admin console for [Cloodsy S3](https://github.com/onaonbir/Cloodsy-S3).**

A standalone static web app for managing servers, buckets, objects, credentials, lifecycle rules, webhooks, and admin users. No backend of its own — it talks to the Cloodsy S3 Admin API and S3 endpoint from the browser.

[![CI](https://github.com/Tizian-Maxime-Weigt/Cloodsy-S3-UI/actions/workflows/ci.yml/badge.svg)](https://github.com/Tizian-Maxime-Weigt/Cloodsy-S3-UI/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![Node](https://img.shields.io/badge/Node-%3E%3D20-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)

[Cloodsy S3](https://github.com/onaonbir/Cloodsy-S3) · [Releases](https://github.com/onaonbir/Cloodsy-S3/releases/latest)

---

## Demo is available here:
https://tizian-maxime-weigt.github.io/Cloodsy-S3-UI/

The page is designed so that the data you enter is stored ONLY encrypted in your web browser.

## Features

- **Multi-server** — Save, switch, edit, and remove Cloodsy S3 instances; optional S3 endpoint (otherwise derived from the Admin URL)
- **Dashboard** — Bucket cards or table, search, object/storage totals, and server version with update notices
- **Bucket overview** — Object count, usage, quota meter, versioning, public-read, WebDAV, storage path, and public URL
- **File browser** — Prefix navigation, drag-and-drop upload with live speed, download, rename, folders, bulk delete
- **Previews** — Images, video, audio, PDF, and sandboxed HTML; inline edit for text files
- **Presigned URLs** — Time-limited GET and PUT links without sharing credentials
- **Credentials** — Per-bucket access keys with read-write or read-only permission; secret shown once, copy to clipboard
- **Bucket settings** — Quota, custom storage directory, versioning, public-read, WebDAV mount URL, image reprocess, typed-confirm delete
- **Lifecycle rules** — Expire objects by age and prefix
- **Webhooks** — HTTP callbacks for object events, with active/inactive state
- **Admin users** — Create, delete, and reset passwords for the server’s admin accounts
- **Theming** — Light, dark, or system; preference stored locally

## Quick Start

The UI is a static site. The Cloodsy S3 **Admin API** and **S3 endpoint** must be reachable from the browser (the server enables CORS).

### Docker

```bash
docker compose -f Docker/docker-compose.yml up --build
```

Open [http://localhost:8080](http://localhost:8080).

Or build and run the image directly:

```bash
docker build -f Docker/Dockerfile -t cloodsy-s3-ui .
docker run --rm -p 8080:80 cloodsy-s3-ui
```

### From source

Requires [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev
```

Vite prints the local URL (usually `http://localhost:5173`).

Production build:

```bash
npm run build
```

Static files land in `dist/` and can be served by any web server.

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Typecheck and production build |
| `npm run preview` | Serve `dist/` locally |
| `npm run lint` | Lint with oxlint |

## Connect a Server

You need a running [Cloodsy S3](https://github.com/onaonbir/Cloodsy-S3) instance with admin enabled, and an admin user:

```bash
./cloodsys3 admin create myadmin
```

In the UI, **Add Server**:

| Field | Example |
|-------|---------|
| Name | Production |
| Admin URL | `https://admin.example.com:9001` |
| S3 URL | `https://s3.example.com` |
| Username | `myadmin` |
| Password | your admin password |

S3 URL is optional when it can be derived from the Admin URL (admin host, port `9000`).

Create a bucket credential (read-write to upload) before browsing files. Passwords stay in the browser; “remember password” is opt-in.

## License

MIT. See [LICENSE](LICENSE).

Cloodsy S3 itself is licensed separately — see [onaonbir/Cloodsy-S3](https://github.com/onaonbir/Cloodsy-S3).
