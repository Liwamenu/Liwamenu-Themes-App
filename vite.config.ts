import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Allow access via any tunneling service (ngrok, cloudflared, etc.).
    allowedHosts: [
      "localhost",
      ".ngrok-free.app",
      ".ngrok-free.dev",
      ".ngrok.io",
      ".ngrok.app",
      ".trycloudflare.com",
    ],
    cors: true,
    // Proxy all /api/* calls through the dev server to the production
    // backend. This bypasses CORS when the page is served from an
    // ngrok URL — the browser sees a same-origin request, the dev
    // server forwards it to liwamenu.pentegrasyon.net.
    proxy: {
      "/api": {
        target: "https://liwamenu.pentegrasyon.net",
        changeOrigin: true,
        // `false` = don't verify the upstream TLS cert chain in the dev
        // proxy. The backend serves an incomplete chain (missing
        // intermediate), so strict verification fails under Node builds
        // that rely on their bundled CA store (e.g. the preview runner),
        // throwing "unable to verify the first certificate" → 500. This
        // only affects the local dev proxy; production hits the backend
        // directly via the browser's own TLS, so it is unchanged.
        secure: false,
      },
    },
    // HMR over HTTPS tunnel: tell the browser to connect back to the
    // public host on port 443/wss so the websocket survives the tunnel.
    hmr: {
      clientPort: 443,
      protocol: "wss",
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
