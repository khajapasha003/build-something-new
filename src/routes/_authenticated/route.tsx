import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window !== "undefined") {
      const demoUserStr = localStorage.getItem("plqa_demo_user");
      if (demoUserStr) {
        try {
          return { user: JSON.parse(demoUserStr) };
        } catch {}
      }
    }
    try {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) return { user: data.user };
    } catch {}

    // Fallback: If no session and user is in browser demo session
    if (typeof window !== "undefined" && localStorage.getItem("sb-access-token")?.startsWith("demo_")) {
      return {
        user: {
          id: "demo_founder_001",
          email: "founder@prelaunchqa.com",
          user_metadata: { full_name: "Founder / Test User" },
        },
      };
    }

    throw redirect({ to: "/auth" });
  },
  component: () => <Outlet />,
});
