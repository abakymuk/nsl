import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "tests/e2e"],
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules",
        "tests",
        "**/*.d.ts",
        "**/*.config.*",
        ".next",
        "coverage",
        "**/*.test.{ts,tsx}",
      ],
      // Target: 70% coverage. Start low, increase as tests are added
      thresholds: {
        lines: 40,
        branches: 40,
        functions: 40,
        statements: 40,
      },
    },
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
