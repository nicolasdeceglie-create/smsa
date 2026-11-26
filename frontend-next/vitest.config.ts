import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    test: {
        environment: "jsdom",
        setupFiles: ["./test/setup.ts"],
        include: ["test/**/*.test.{ts,tsx}"],
        // le date dei test sono scritte con l'ora italiana
        env: { TZ: "Europe/Rome" },
    },
});
