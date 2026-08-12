# Cloodsy S3 Web UI

Browser admin UI for [Cloodsy S3](https://github.com/onaonbir/Cloodsy-S3). Manage servers, buckets, files, credentials, lifecycle rules, webhooks, and admin users.

## Docker

From the repo root:

```bash
docker compose -f Docker/docker-compose.yml up --build
```

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

## License

MIT
