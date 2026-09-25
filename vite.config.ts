import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig(({ command, mode }) => {
  const clientEnv = loadEnv(mode, process.cwd(), "VITE_");
  const isDevBuild = command === "build" && mode === "development";

  return {
    server: {
      host: "::",
      port: 8080,
    },
    css: {
      transformer: "lightningcss",
    },
    resolve: {
      alias: {
        "@": resolve(process.cwd(), "src"),
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
      ignoreOutdatedRequests: true,
    },
    ...(isDevBuild
      ? {
          environments: {
            client: {
              define: {
                "process.env.NODE_ENV": JSON.stringify("development"),
              },
            },
          },
          esbuild: {
            keepNames: true,
          },
        }
      : {}),
    define: Object.fromEntries(
      Object.entries(clientEnv).map(([key, value]) => [
        `import.meta.env.${key}`,
        JSON.stringify(value),
      ]),
    ),
    plugins: [
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart({
        server: { entry: "server" },
        importProtection: {
          behavior: "error",
          client: {
            files: ["**/server/**"],
            specifiers: ["server-only"],
          },
        },
      }),
      command === "build" &&
        nitro({
          defaultPreset: "cloudflare-module",
        }),
      viteReact(),
    ].filter(Boolean),
  };
});
