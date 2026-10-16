// Complete, bulletproof in-memory fallback for local development or when external Supabase is unreachable

export interface MockStore {
  apps: Array<any>;
  scans: Array<any>;
  orders: Array<any>;
  findings: Array<any>;
  subscriptions: Array<any>;
  verification_attempts: Array<any>;
  scan_events: Array<any>;
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
  findings: [],
  subscriptions: [],
  verification_attempts: [],
  scan_events: [],
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
      if (table === "apps") {
        currentData = userId ? memoryStore.apps.filter((a) => !a.user_id || a.user_id === userId) : [...memoryStore.apps];
      } else if (table === "scans") {
        currentData = userId ? memoryStore.scans.filter((s) => !s.user_id || s.user_id === userId) : [...memoryStore.scans];
      } else if (table === "orders") {
        currentData = userId ? memoryStore.orders.filter((o) => !o.user_id || o.user_id === userId) : [...memoryStore.orders];
      } else if (table === "user_credits") {
        const c = memoryStore.credits[userId] || { plan: "launch", scan_credits: 5, unlimited_scans: false };
        currentData = [{ user_id: userId, ...c }];
      } else if (table === "findings") {
        currentData = [...memoryStore.findings];
      } else if (table === "subscriptions") {
        currentData = [...memoryStore.subscriptions];
      } else {
        currentData = [];
      }

      const builder: any = {
        count: currentData.length,
        select: (_cols?: string, options?: any) => {
          if (options?.count) {
            builder.count = currentData.length;
          }
          return builder;
        },
        eq: (col: string, val: any) => {
          currentData = currentData.filter((item) => item[col] === val);
          builder.count = currentData.length;
          return builder;
        },
        neq: (col: string, val: any) => {
          currentData = currentData.filter((item) => item[col] !== val);
          builder.count = currentData.length;
          return builder;
        },
        in: (col: string, vals: any[]) => {
          currentData = currentData.filter((item) => vals.includes(item[col]));
          builder.count = currentData.length;
          return builder;
        },
        is: (col: string, val: any) => {
          currentData = currentData.filter((item) => item[col] === val);
          builder.count = currentData.length;
          return builder;
        },
        gt: (col: string, val: any) => {
          currentData = currentData.filter((item) => item[col] > val);
          return builder;
        },
        gte: (col: string, val: any) => {
          currentData = currentData.filter((item) => item[col] >= val);
          return builder;
        },
        lt: (col: string, val: any) => {
          currentData = currentData.filter((item) => item[col] < val);
          return builder;
        },
        lte: (col: string, val: any) => {
          currentData = currentData.filter((item) => item[col] <= val);
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
        range: (from: number, to: number) => {
          currentData = currentData.slice(from, to + 1);
          return builder;
        },
        maybeSingle: async () => ({
          data: currentData[0] || null,
          error: null,
        }),
        single: async () => ({
          data: currentData[0] || null,
          error: null,
        }),
        insert: (rowOrRows: any) => {
          const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
          const inserted = rows.map((r) => ({
            id: r.id || `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            created_at: new Date().toISOString(),
            ...r,
          }));

          if (table === "apps") memoryStore.apps.push(...inserted);
          else if (table === "scans") memoryStore.scans.push(...inserted);
          else if (table === "orders") memoryStore.orders.push(...inserted);
          else if (table === "findings") memoryStore.findings.push(...inserted);
          else if (table === "subscriptions") memoryStore.subscriptions.push(...inserted);

          return {
            select: () => ({
              single: async () => ({ data: inserted[0], error: null }),
              maybeSingle: async () => ({ data: inserted[0], error: null }),
            }),
            then: (resolve: any) => resolve({ data: inserted, error: null }),
          };
        },
        upsert: (rowOrRows: any) => {
          const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
          for (const r of rows) {
            const uId = r.user_id || userId;
            if (table === "user_credits") {
              const prev = memoryStore.credits[uId] || { plan: "launch", scan_credits: 1, unlimited_scans: false };
              memoryStore.credits[uId] = {
                plan: r.plan ?? prev.plan,
                scan_credits: r.scan_credits ?? prev.scan_credits,
                unlimited_scans: r.unlimited_scans ?? prev.unlimited_scans,
              };
            } else if (table === "subscriptions") {
              const idx = memoryStore.subscriptions.findIndex((s) => s.id === r.id);
              if (idx >= 0) memoryStore.subscriptions[idx] = { ...memoryStore.subscriptions[idx], ...r };
              else memoryStore.subscriptions.push(r);
            } else if (table === "apps") {
              const idx = memoryStore.apps.findIndex((a) => a.id === r.id);
              if (idx >= 0) memoryStore.apps[idx] = { ...memoryStore.apps[idx], ...r };
              else memoryStore.apps.push(r);
            }
          }
          return {
            select: () => ({
              single: async () => ({ data: rows[0], error: null }),
              maybeSingle: async () => ({ data: rows[0], error: null }),
            }),
            then: (resolve: any) => resolve({ data: rows, error: null }),
          };
        },
        update: (updates: any) => ({
          eq: (col: string, val: any) => {
            const list =
              table === "apps"
                ? memoryStore.apps
                : table === "scans"
                  ? memoryStore.scans
                  : table === "orders"
                    ? memoryStore.orders
                    : [];
            const target = list.find((item) => item[col] === val);
            if (target) {
              Object.assign(target, updates);
            }
            return {
              select: () => ({
                single: async () => ({ data: target || updates, error: null }),
                maybeSingle: async () => ({ data: target || updates, error: null }),
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
        then: (resolve: any) => resolve({ data: currentData, count: currentData.length, error: null }),
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
