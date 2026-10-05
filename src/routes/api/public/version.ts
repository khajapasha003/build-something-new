import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/version")({
  server: {
    handlers: {
      GET: async () => {
        const supabaseUrl = process.env["SUPABASE_URL"];
        const supabasePublishableKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
        const supabaseServiceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
        const ipHashKey = process.env["IP_HASH_KEY"];

        const env_ok = Boolean(
          typeof supabaseUrl === "string" &&
          supabaseUrl.trim().length > 0 &&
          typeof supabasePublishableKey === "string" &&
          supabasePublishableKey.trim().length > 0 &&
          typeof supabaseServiceRoleKey === "string" &&
          supabaseServiceRoleKey.trim().length > 0 &&
          typeof ipHashKey === "string" &&
          ipHashKey.trim().length > 0,
        );

        return new Response(
          JSON.stringify({
            // @ts-expect-error Injected by Vite define at build time
            commit: process.env.APP_VERSION_COMMIT,
            // @ts-expect-error Injected by Vite define at build time
            built_at: process.env.APP_VERSION_BUILT_AT,
            env_ok,
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        );
      },
    },
  },
});
