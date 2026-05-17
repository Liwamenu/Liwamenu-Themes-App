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
        secure: true,
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
