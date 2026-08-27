import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

// Default environment stays "node" so tests/api.test.ts (integration tests
// against a running server) behave exactly as before. Component tests opt
// into jsdom individually via a `// @vitest-environment jsdom` file-level
// pragma, matching Vitest's documented per-file override mechanism.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next"],
    fileParallelism: false,
  },
});
