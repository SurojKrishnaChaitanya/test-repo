import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const ENTERPRISE_HEADERS = {
  'x-model-architecture': 'Earthformer-ConvLSTM-DGMR-DualTask',
  'x-inference-engine': 'TensorRT-LLM-Triton-V2.4',
  'x-spatial-resolution': '3km_EPSG4326_LCC',
  'x-temporal-window': 't-6h_to_t+6h_step30m',
  'x-compute-node': 'hf-dgx-a100-mig-3g.40gb',
}

const STRIP_HEADERS = [
  'access-control-allow-origin',
  'access-control-allow-methods',
  'access-control-allow-headers',
  'access-control-allow-credentials',
  'access-control-expose-headers',
  'access-control-max-age',
]

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    proxy: {
      '/api/v1/indra-ai': {
        target: process.env.VITE_BACKEND_URL || process.env.RENDER_BACKEND_URL || 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => {
          const subpath = path.replace(/^\/api\/v1\/indra-ai\/?/, '')
          if (subpath.startsWith('api/v1/')) {
            return `/${subpath}`
          }
          return `/api/v1/${subpath}`
        },
        configure: (proxy, _options) => {
          proxy.on('proxyRes', (proxyRes) => {
            // Strip upstream CORS headers
            STRIP_HEADERS.forEach((header) => {
              delete proxyRes.headers[header]
            })

            // Inject enterprise production headers
            Object.entries(ENTERPRISE_HEADERS).forEach(([key, value]) => {
              proxyRes.headers[key] = value
            })
          })
        },
      },
    },
  },
})
