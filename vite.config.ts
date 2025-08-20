import { defineConfig, loadEnv } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import * as dotenv from 'dotenv';

// Load .env.local file for API endpoints
dotenv.config({ path: '.env.local' });

// API middleware plugin
const apiPlugin = () => {
  return {
    name: 'api-plugin',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res, next) => {
        // Handle CORS preflight
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.end();
          return;
        }

        // Map URL to API file
        const apiEndpoints = {
          '/send-email': 'send-email.ts',
          '/app-settings': 'app-settings.ts',
          '/admin-users': 'admin-users.ts'
        };

        const apiFile = apiEndpoints[req.url];
        if (!apiFile) {
          return next();
        }

        try {
          // Handle GET requests (no body parsing needed)
          if (req.method === 'GET') {
            const mockReq = {
              method: req.method,
              url: req.url,
              headers: req.headers,
              body: {}
            };

            const mockRes = {
              setHeader: (key, value) => res.setHeader(key, value),
              status: (code) => {
                res.statusCode = code;
                return mockRes;
              },
              json: (data) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              },
              end: (data) => res.end(data)
            };

            const apiModule = await server.ssrLoadModule(`./api/${apiFile}`);
            await apiModule.default(mockReq, mockRes);
            return;
          }

          // Handle POST requests (collect body data)
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });

            req.on('end', async () => {
              try {
                const requestBody = body ? JSON.parse(body) : {};
                
                const mockReq = {
                  method: req.method,
                  url: req.url,
                  headers: req.headers,
                  body: requestBody
                };

                const mockRes = {
                  setHeader: (key, value) => res.setHeader(key, value),
                  status: (code) => {
                    res.statusCode = code;
                    return mockRes;
                  },
                  json: (data) => {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(data));
                  },
                  end: (data) => res.end(data)
                };

                const apiModule = await server.ssrLoadModule(`./api/${apiFile}`);
                await apiModule.default(mockReq, mockRes);
              } catch (error) {
                console.error('API error:', error);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Internal server error' }));
              }
            });
            return;
          }
        } catch (error) {
          console.error('API middleware error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      });
    }
  };
};

export default defineConfig((config) => {
  const env = loadEnv(config.mode, process.cwd(), '');
  
  // Make environment variables available to the API functions
  process.env = { ...process.env, ...env };

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [apiPlugin(), dyadComponentTagger(), react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
