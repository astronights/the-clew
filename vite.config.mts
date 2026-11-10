import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Runs the Vercel Functions in /api inside the Vite dev server, so `npm run dev`
 * works without the Vercel CLI. Handlers export GET/POST(request: Request).
 */
function devApi(): Plugin {
  return {
    name: 'clew-dev-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const m = url.pathname.match(/^\/api\/([a-z-]+)$/);
        if (!m) return next();
        try {
          const mod = (await server.ssrLoadModule(`/api/${m[1]}.ts`)) as Record<string, (r: Request) => Promise<Response>>;
          const handler = mod[req.method ?? 'GET'];
          if (!handler) {
            res.statusCode = 405;
            return res.end();
          }
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
          const request = new Request(url, {
            method: req.method,
            headers,
            body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
          });
          const response = await handler(request);
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (err) {
          console.error(err);
          res.statusCode = 500;
          res.end('dev api error');
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // expose DATABASE_URL / GEMINI_* to the dev API handlers (never to the client bundle)
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return { plugins: [react(), devApi()] };
});
