import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  test: {
    setupFiles: ["dotenv/config"],
    env: {
      REDIS_URL: "redis://:redis-pw@localhost:6379",
    },
    unstubEnvs: true,
    testTimeout: 60_000,
    sequence: {
      concurrent: false,
    },
  },
  plugins: [tsconfigPaths()],
});
