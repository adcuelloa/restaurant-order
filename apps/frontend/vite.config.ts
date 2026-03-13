import path from "path";

import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  css: {
    devSourcemap: true,
  },
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    target: "es2022",
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (id.includes("react-dom") || id.includes("react")) return "react";
            if (id.includes("@tanstack/react-query")) return "query";
          }
        },
      },
    },
  },
});
