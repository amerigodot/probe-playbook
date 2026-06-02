import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    {
      name: 'local-api-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && req.url.startsWith('/api/')) {
            try {
              const url = new URL(req.url, 'http://localhost');
              const pathname = url.pathname;
              const endpoint = pathname.slice(5);
              const filePath = path.resolve(__dirname, `./api/${endpoint}.ts`);
              const module = await server.ssrLoadModule(filePath);
              
              let body = {};
              if (req.method === 'POST') {
                const buffers = [];
                for await (const chunk of req) {
                  buffers.push(chunk);
                }
                const data = Buffer.concat(buffers).toString();
                if (data) {
                  try {
                    body = JSON.parse(data);
                  } catch {
                    body = data;
                  }
                }
              }
              
              const vercelReq = Object.assign(req, {
                body,
                query: Object.fromEntries(url.searchParams.entries()),
                cookies: {}
              });
              
              const vercelRes = {
                status(code: number) {
                  res.statusCode = code;
                  return vercelRes;
                },
                json(data: any) {
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(data));
                  return vercelRes;
                },
                setHeader(name: string, value: string) {
                  res.setHeader(name, value);
                  return vercelRes;
                },
                end(data?: any) {
                  res.end(data);
                  return vercelRes;
                }
              };
              
              await module.default(vercelReq, vercelRes);
            } catch (err: any) {
              console.error(`Error in local API handler [${req.url}]:`, err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ 
                error: 'Internal Server Error in Local API Middleware', 
                message: err.message, 
                stack: err.stack 
              }));
            }
            return;
          }
          next();
        });
      }
    }
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
