import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { minimaxNarrationPlugin } from "./server/minimax-narration.mjs";

export default defineConfig({
  build: {
    outDir: "dist/client",
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    watch: {
      // New narration assets must never restart a visitor's active guided scene.
      ignored: ["**/public/assets/audio/narration/**", "**/.cache/narration-locks/**"],
    },
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [react(), minimaxNarrationPlugin()],
});
