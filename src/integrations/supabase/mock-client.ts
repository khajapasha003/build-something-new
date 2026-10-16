// Resilient in-memory fallback for local development or when external Supabase is unreachable

export interface MockStore {
  apps: Array<any>;
  scans: Array<any>;
  orders: Array<any>;
  credits: Record<string, { plan: string; scan_credits: number; unlimited_scans: boolean }>;
}

const memoryStore: MockStore = {
  apps: [
    {
      id: "app_demo_01",
      user_id: "demo_founder_001",
      url: "https://prelaunchqa.com",
      origin: "https://prelaunchqa.com",
      built_with: "Lovable",
      verification_status: "verified",
      verification_token: "plqa-verify-demo-token-12345",
      verified_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
  ],
  scans: [
    {
      id: "scan_demo_01",
      app_id: "app_demo_01",
      user_id: "demo_founder_001",
      url: "https://prelaunchqa.com",
      target_url: "https://prelaunchqa.com",
      status: "completed",
      findings_summary: { total: 0, critical: 0, warning: 0, info: 0 },
      evidence_bundle: { consoleErrors: [], networkFailures: [], deadLinks: [] },
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    },
  ],
  orders: [],
  credits: {
    demo_founder_001: {
      plan: "launch",
      scan_credits: 5,
      unlimited_scans: false,
    },
  },
};

export function createMockSupabaseClient(userId: string = "demo_founder_001"): any {
  return {
    from: (table: string) => {
      let currentData: any[] = [];
      if (table === "apps") currentData = memoryStore.apps.filter((a) => a.user_id === userId);
      else if (table === "scans") currentData = memoryStore.scans.filter((s) => s.user_id === userId);
      else if (table === "orders") currentData = memoryStore.orders.filter((o) => o.user_id === userId);
      else if (table === "user_credits") {
        const c = memoryStore.credits[userId] || { plan: "launch", scan_credits: 5, unlimited_scans: false };
        currentData = [c];
      } else {
        currentData = [];
      }

      const builder: any = {
        select: (_cols?: string) => builder,
        eq: (col: string, val: any) => {
          currentData = currentData.filter((item) => item[col] === val);
          return builder;
        },
        neq: (col: string, val: any) => {
          currentData = currentData.filter((item) => item[col] !== val);
          return builder;
        },
        order: (col: string, { ascending = true }: any = {}) => {
          currentData.sort((a, b) => {
            if (a[col] < b[col]) return ascending ? -1 : 1;
            if (a[col] > b[col]) return ascending ? 1 : -1;
            return 0;
          });
          return builder;
        },
        limit: (n: number) => {
          currentData = currentData.slice(0, n);
          return builder;
        },
        maybeSingle: async () => ({
          data: currentData[0] || null,
          error: null,
        }),
        single: async () => ({
          data: currentData[0] || null,
          error: currentData[0] ? null : new Error("Record not found"),
        }),
        insert: (rowOrRows: any) => {
          const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
          const inserted = rows.map((r) => ({
            id: r.id || `row_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            created_at: new Date().toISOString(),
            ...r,
          }));

          if (table === "apps") memoryStore.apps.push(...inserted);
          else if (table === "scans") memoryStore.scans.push(...inserted);
          else if (table === "orders") memoryStore.orders.push(...inserted);

          return {
            select: () => ({
              single: async () => ({ data: inserted[0], error: null }),
            }),
            then: (resolve: any) => resolve({ data: inserted, error: null }),
          };
        },
        update: (updates: any) => ({
          eq: (col: string, val: any) => {
            const list = table === "apps" ? memoryStore.apps : table === "scans" ? memoryStore.scans : [];
            const target = list.find((item) => item[col] === val);
            if (target) {
              Object.assign(target, updates);
            }
            return {
              select: () => ({
                single: async () => ({ data: target || updates, error: null }),
              }),
              then: (resolve: any) => resolve({ data: target || updates, error: null }),
            };
          },
        }),
        delete: () => ({
          eq: (col: string, val: any) => {
            if (table === "apps") memoryStore.apps = memoryStore.apps.filter((a) => a[col] !== val);
            else if (table === "scans") memoryStore.scans = memoryStore.scans.filter((s) => s[col] !== val);
            return {
              then: (resolve: any) => resolve({ data: null, error: null }),
            };
          },
        }),
        then: (resolve: any) => resolve({ data: currentData, error: null }),
      };

      return builder;
    },
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: userId,
            email: "founder@prelaunchqa.com",
            user_metadata: { full_name: "Founder / Test User" },
          },
        },
        error: null,
      }),
      getSession: async () => ({
        data: {
          session: {
            access_token: "demo_token_mock",
            user: { id: userId, email: "founder@prelaunchqa.com" },
          },
        },
        error: null,
      }),
    },
  };
}
