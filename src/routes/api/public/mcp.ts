import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/mcp")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(
          JSON.stringify({
            name: "prelaunchqa-mcp-server",
            version: "1.0.0",
            protocol: "model-context-protocol/2024-11-05",
            description:
              "Official PreLaunchQA Model Context Protocol (MCP) server for automated real-browser QA auditing.",
            capabilities: {
              tools: true,
              resources: false,
              prompts: true,
            },
            tools: [
              {
                name: "prelaunchqa_inspect_url",
                description:
                  "Audit any public web app in real headless Chromium. Captures console errors, 4xx/5xx network failures, dead links, and DOM hygiene.",
              },
              {
                name: "prelaunchqa_get_version",
                description: "Get server build commit, operational status, and health.",
              },
              {
                name: "prelaunchqa_generate_fix_prompt",
                description:
                  "Generate a tailored AI fix prompt from a discovered runtime finding.",
              },
              {
                name: "prelaunchqa_get_badge_url",
                description: "Retrieve dynamic SVG verification badge markdown snippet.",
              },
            ],
            setupGuide: {
              cursor: "Add to .cursor/mcp.json: { 'mcpServers': { 'prelaunchqa': { 'command': 'node', 'args': ['mcp/prelaunchqa-mcp-server.mjs'] } } }",
              claudeDesktop: "Add to claude_desktop_config.json: { 'mcpServers': { 'prelaunchqa': { 'command': 'node', 'args': ['/path/to/mcp/prelaunchqa-mcp-server.mjs'] } } }",
            },
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
              "cache-control": "public, max-age=3600",
            },
          },
        );
      },
    },
  },
});
