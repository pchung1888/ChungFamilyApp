import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // Specific mock overrides must come BEFORE the general @/* alias
      {
        find: "next/navigation",
        replacement: path.resolve(__dirname, "./src/__mocks__/next/navigation.ts"),
      },
      {
        find: "@/components/ui/select",
        replacement: path.resolve(__dirname, "./src/__mocks__/ui/select.tsx"),
      },
      // General @/* alias (replaces vite-tsconfig-paths which is ESM-only in v6)
      {
        find: "@",
        replacement: path.resolve(__dirname, "./src"),
      },
    ],
  },
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/components/**"],
      exclude: ["src/components/ui/**"],
      reporter: ["text", "html"],
      // TODO: re-enable global thresholds once all components have tests:
      // thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 }
    },
  },
});
