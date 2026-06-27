import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Just the "@/" -> src alias so tests resolve imports like the app does.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
