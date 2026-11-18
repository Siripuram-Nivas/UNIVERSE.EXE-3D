import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/** Serves api/compile.ts during `vite dev` so the AI endpoint can be tested locally. Not used in production builds. */
function devApi(): Plugin {
  return {
    name: 'dev-api-compile',
    apply: 'serve',
    configureServer(server) {
      // Server-only secrets: loaded without the VITE_ prefix filter and never sent to the browser.
      const env = loadEnv('development', process.cwd(), '')
      for (const k of ['AI_ENABLED', 'OPENAI_API_KEY', 'OPENAI_MODEL', 'AI_RATE_PER_MINUTE', 'AI_DAILY_LIMIT']) {
        if (env[k] && !process.env[k]) process.env[k] = env[k]
      }
      server.middlewares.use('/api/compile', async (req, res) => {
        const chunks: Buffer[] = []
        for await (const c of req) chunks.push(c as Buffer)
        const body = Buffer.concat(chunks)
        const mod = (await server.ssrLoadModule('/api/compile.ts')) as {
          GET: () => Response
          POST: (r: Request) => Promise<Response>
        }
        const request = new Request('http://localhost/api/compile', {
          method: req.method,
          headers: req.headers as Record<string, string>,
          body: req.method === 'POST' ? body : undefined,
        })
        const out = req.method === 'GET' ? mod.GET() : req.method === 'POST' ? await mod.POST(request) : new Response('Method not allowed', { status: 405 })
        res.statusCode = out.status
        out.headers.forEach((v, k) => res.setHeader(k, v))
        res.end(await out.text())
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), devApi()],
  build: {
    // Rapier's WASM is embedded in JS (~2 MB) and three is ~650 KB; separate chunks download in parallel and cache independently.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@dimforge/rapier3d-compat')) return 'rapier'
          if (id.includes('/node_modules/three/')) return 'three'
        },
      },
    },
    chunkSizeWarningLimit: 2200,
  },
})
