import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

export default defineConfig(({ command, mode }) => {
  const clientEnv = loadEnv(mode, process.cwd(), "VITE_");
  const isDevBuild = command === "build" && mode === "development";

  const buildVersion = command === "build" ? getBuildVersion() : null;

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
    define: {
      ...Object.fromEntries(
        Object.entries(clientEnv).map(([key, value]) => [
          `import.meta.env.${key}`,
          JSON.stringify(value),
        ]),
      ),
      ...(buildVersion
        ? {
            "process.env.APP_VERSION_COMMIT": JSON.stringify(buildVersion.commit),
            "process.env.APP_VERSION_BUILT_AT": JSON.stringify(buildVersion.builtAt),
          }
        : {}),
    },
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
          compatibilityDate: "2026-09-25" as const,
          replace: {
            "process.env.APP_VERSION_COMMIT": JSON.stringify(buildVersion!.commit),
            "process.env.APP_VERSION_BUILT_AT": JSON.stringify(buildVersion!.builtAt),
          },
        }),
      viteReact(),
    ].filter(Boolean),
  };
});

function getBuildVersion() {
  let commit: string;
  try {
    commit = execSync("git rev-parse HEAD", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    if (!/^[0-9a-f]{40}$/i.test(commit)) {
      throw new Error(`Invalid git commit SHA: "${commit}"`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Build failed: git is unavailable or not a git repository (${msg})`);
  }

  let status: string;
  try {
    status = execSync("git status --porcelain", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Build failed: git status check failed (${msg})`);
  }

  if (status.length > 0) {
    throw new Error(`Build failed: working tree has uncommitted changes:\n${status}`);
  }

  return {
    commit,
    builtAt: new Date().toISOString(),
  };
}
