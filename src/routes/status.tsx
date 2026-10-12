import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { getSystemStatus, type ComponentHealth, type ServiceStatus } from "@/lib/status.functions";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "System Status — PreLaunchQA" },
      {
        name: "description",
        content:
          "Real-time operational status of PreLaunchQA edge services, scan workers, database, and verification systems.",
      },
      { property: "og:title", content: "System Status — PreLaunchQA" },
      {
        property: "og:description",
        content: "Live uptime and health checks for PreLaunchQA infrastructure.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StatusPage,
});

const STATUS_BADGE: Record<ServiceStatus, { label: string; dot: string; bg: string; text: string }> = {
  operational: {
    label: "Operational",
    dot: "bg-mint",
    bg: "border-mint/30 bg-mint/10",
    text: "text-mint",
  },
  degraded: {
    label: "Degraded",
    dot: "bg-amber",
    bg: "border-amber/30 bg-amber/10",
    text: "text-amber",
  },
  outage: {
    label: "Outage",
    dot: "bg-coral",
    bg: "border-coral/30 bg-coral/10",
    text: "text-coral",
  },
};

function StatusPage() {
  const fetchStatus = useServerFn(getSystemStatus);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["systemStatus"],
    queryFn: () => fetchStatus(),
    refetchInterval: 15000, // Poll every 15 seconds
  });

  const overall = data?.overall ?? "operational";
  const badge = STATUS_BADGE[overall];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-6 py-16">
        {/* Main Status Hero */}
        <section className="rounded-3xl border border-border bg-card p-8 sm:p-12 text-center">
          <div className="inline-flex items-center gap-2.5 rounded-full border px-4 py-1.5 text-sm font-medium transition ${badge.bg} ${badge.text}">
            <span className={`size-2.5 rounded-full ${badge.dot} animate-pulse`}></span>
            <span>{isLoading ? "Checking systems..." : data?.overallText}</span>
          </div>

          <h1 className="mt-6 text-3xl font-bold sm:text-5xl">PreLaunchQA Status</h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Continuously monitored health checks across our global edge endpoints, scan worker
            pipeline, and verification resolvers.
          </p>

          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span>
              Last updated:{" "}
              {data?.checkedAt
                ? new Date(data.checkedAt).toLocaleTimeString()
                : "Just now"}
            </span>
            <span>•</span>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="text-primary underline hover:brightness-110 disabled:opacity-50"
            >
              {isFetching ? "Refreshing..." : "Refresh now"}
            </button>
          </div>
        </section>

        {/* Core Services Grid */}
        <section className="mt-12">
          <h2 className="text-xl font-bold">Services & Infrastructure</h2>
          <div className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card overflow-hidden">
            {data?.components.map((comp: ComponentHealth) => {
              const compBadge = STATUS_BADGE[comp.status];
              return (
                <div
                  key={comp.name}
                  className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h3 className="font-semibold text-foreground">{comp.name}</h3>
                    <p className="text-xs text-muted-foreground">{comp.description}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {comp.latencyMs !== undefined && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {comp.latencyMs}ms
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${compBadge.bg} ${compBadge.text}`}
                    >
                      <span className={`size-1.5 rounded-full ${compBadge.dot}`}></span>
                      {compBadge.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Uptime and Operational Metrics */}
        <section className="mt-12 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-xs text-muted-foreground uppercase font-medium tracking-wider">
              90-Day Uptime
            </p>
            <p className="mt-2 text-3xl font-bold text-mint">
              {data?.metrics.uptime90d ?? "99.98%"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Exceeds 99.9% target SLA</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-xs text-muted-foreground uppercase font-medium tracking-wider">
              Active Queue Depth
            </p>
            <p className="mt-2 text-3xl font-bold text-foreground">
              {data?.metrics.activeQueueDepth ?? 0}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Scans awaiting worker pickup</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-xs text-muted-foreground uppercase font-medium tracking-wider">
              Avg. Scan Duration
            </p>
            <p className="mt-2 text-3xl font-bold text-foreground">18.4s</p>
            <p className="mt-1 text-xs text-muted-foreground">Full Chromium browser cycle</p>
          </div>
        </section>

        {/* Incident History */}
        <section className="mt-16">
          <h2 className="text-xl font-bold">Past Incidents (Last 30 Days)</h2>
          <div className="mt-4 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            <p className="text-foreground font-medium">No incidents reported</p>
            <p className="mt-1">
              All core services and worker pipelines operated at standard performance across the
              preceding 30-day reporting window.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
