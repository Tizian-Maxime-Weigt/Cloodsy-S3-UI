import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cloodsyDebugPlugin } from './vite-plugin-cloodsy-debug.ts'
import { securityHeadersPlugin } from './vite-plugin-security-headers.ts'

// Optional CORS-free proxies for local testing:
//   VITE_PROXY_TARGET=http://192.168.1.100:9001
//   VITE_S3_PROXY_TARGET=http://192.168.1.100:9000
// Then set Admin URL to http://localhost:5173 and S3 URL to http://localhost:5173/s3-api

const adminTarget = process.env.VITE_PROXY_TARGET
const s3Target = process.env.VITE_S3_PROXY_TARGET

export default defineConfig({
  plugins: [react(), cloodsyDebugPlugin(), securityHeadersPlugin()],
  server: {
    proxy: {
      ...(adminTarget
        ? {
            '/admin': {
              target: adminTarget,
              changeOrigin: true,
              ws: true,
            },
          }
        : {}),
      ...(s3Target
        ? {
            '/s3-api': {
              target: s3Target,
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/s3-api/, ''),
            },
          }
        : {}),
    },
  },
  preview: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      'Permissions-Policy':
        'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    },
  },
})
