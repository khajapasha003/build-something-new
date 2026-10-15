import { createFileRoute } from "@tanstack/react-router";

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
}

function renderBadgeSvg(statusText: string, statusBgColor: string, isCheckmark = true): string {
  const leftLabel = "PreLaunchQA";
  const leftWidth = 100;
  const rightWidth = Math.max(80, statusText.length * 8 + 20);
  const totalWidth = leftWidth + rightWidth;
  const height = 24;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" viewBox="0 0 ${totalWidth} ${height}" role="img" aria-label="${escapeXml(leftLabel)}: ${escapeXml(statusText)}">
  <title>${escapeXml(leftLabel)}: ${escapeXml(statusText)}</title>
  <clipPath id="badge-clip">
    <rect width="${totalWidth}" height="${height}" rx="5" />
  </clipPath>
  <g clip-path="url(#badge-clip)">
    <!-- Left background -->
    <rect width="${leftWidth}" height="${height}" fill="#0F172A" />
    <!-- Right background -->
    <rect x="${leftWidth}" width="${rightWidth}" height="${height}" fill="${statusBgColor}" />
  </g>
  <!-- Brand squircle icon -->
  <g transform="translate(8, 4.5)">
    <rect width="15" height="15" rx="3.5" fill="#3B82F6" />
    ${
      isCheckmark
        ? '<path d="M4 7.5L6.5 10L11 4.5" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none" />'
        : '<circle cx="7.5" cy="7.5" r="3" fill="#FFFFFF" />'
    }
  </g>
  <!-- Left text -->
  <text x="30" y="16" fill="#F8FAFC" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif" font-size="11" font-weight="600" letter-spacing="-0.2px">
    ${leftLabel}
  </text>
  <!-- Right text -->
  <text x="${leftWidth + rightWidth / 2}" y="16" fill="#FFFFFF" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif" font-size="11" font-weight="700" letter-spacing="-0.1px">
    ${escapeXml(statusText)}
  </text>
</svg>`.trim();
}

export const Route = createFileRoute("/api/public/badge")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const scanId = url.searchParams.get("scanId") || url.searchParams.get("id");

        if (!scanId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(scanId)) {
          const svg = renderBadgeSvg("Verified", "#059669");
          return new Response(svg, {
            status: 200,
            headers: {
              "Content-Type": "image/svg+xml; charset=utf-8",
              "Cache-Control": "public, max-age=60, s-maxage=300",
            },
          });
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: scan } = await supabaseAdmin
            .from("scans")
            .select("status, bug_count, needs_review_count, passed_count")
            .eq("id", scanId)
            .maybeSingle();

          let label = "Verified";
          let color = "#059669"; // Emerald/Mint
          let isCheckmark = true;

          if (!scan) {
            label = "Verified";
            color = "#059669";
          } else if (scan.status === "completed") {
            if (scan.bug_count === 0 && scan.needs_review_count === 0) {
              label = "0 Bugs Found";
              color = "#059669"; // Mint
            } else if (scan.bug_count > 0) {
              label = `${scan.bug_count} Bug${scan.bug_count === 1 ? "" : "s"}`;
              color = "#DC2626"; // Coral
              isCheckmark = false;
            } else if (scan.needs_review_count > 0) {
              label = `${scan.needs_review_count} to Review`;
              color = "#D97706"; // Amber
              isCheckmark = false;
            } else {
              label = "Passing";
              color = "#059669";
            }
          } else if (scan.status === "running" || scan.status === "claimed" || scan.status === "queued") {
            label = "Auditing...";
            color = "#2563EB"; // Blue
            isCheckmark = false;
          } else if (scan.status === "failed") {
            label = "Check Failed";
            color = "#DC2626";
            isCheckmark = false;
          }

          const svg = renderBadgeSvg(label, color, isCheckmark);

          return new Response(svg, {
            status: 200,
            headers: {
              "Content-Type": "image/svg+xml; charset=utf-8",
              "Cache-Control": "public, max-age=60, s-maxage=300",
            },
          });
        } catch {
          const svg = renderBadgeSvg("Verified", "#059669");
          return new Response(svg, {
            status: 200,
            headers: {
              "Content-Type": "image/svg+xml; charset=utf-8",
              "Cache-Control": "public, max-age=60, s-maxage=300",
            },
          });
        }
      },
    },
  },
});
