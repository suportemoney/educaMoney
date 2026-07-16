import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/portal/",
  server: {
    host: "0.0.0.0",
    port: 5175,
    watch: { usePolling: true },
    hmr: {
      protocol: "ws",
      host: "localhost",
      clientPort: 80,
      path: "/portal/",
    },
  },
});
