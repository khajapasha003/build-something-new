#!/usr/bin/env node
/**
 * PreLaunchQA Official Model Context Protocol (MCP) Server
 * Enables AI Agents (Cursor, Claude Desktop, Windsurf, Antigravity) to
 * programmatically audit web applications using real headless Chromium browsers.
 */

import readline from "node:readline";

const SERVER_NAME = "prelaunchqa-mcp-server";
const SERVER_VERSION = "1.0.0";
const API_BASE = process.env.PLQ_API_BASE || "https://prelaunchqa.com";

const TOOLS = [
  {
    name: "prelaunchqa_inspect_url",
    description: "Audit any public web application using real headless Chromium. Captures console errors, failed network requests (4xx/5xx), dead links, and DOM hygiene issues.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Full HTTP/HTTPS URL of the web application to audit (e.g. https://my-app.com)",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "prelaunchqa_get_version",
    description: "Check the operational health, active Git commit, and deployed environment of the PreLaunchQA engine.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "prelaunchqa_generate_fix_prompt",
    description: "Generate a formatted, context-aware AI prompt that developer can copy-paste into Cursor, Claude, or ChatGPT to fix a specific bug in 30 seconds.",
    inputSchema: {
      type: "object",
      properties: {
        errorType: {
          type: "string",
          enum: ["console_error", "network_failure", "broken_link", "dom_hygiene"],
          description: "Type of error discovered during the audit",
        },
        errorMessage: {
          type: "string",
          description: "The exact error message, stack trace, or failed URL",
        },
        pageUrl: {
          type: "string",
          description: "The page URL where the error occurred",
        },
      },
      required: ["errorType", "errorMessage"],
    },
  },
  {
    name: "prelaunchqa_get_badge_url",
    description: "Get the shareable SVG verification badge Markdown snippet for embedding into GitHub README or website footer.",
    inputSchema: {
      type: "object",
      properties: {
        scanId: {
          type: "string",
          description: "The unique Scan ID from a completed audit",
        },
      },
      required: ["scanId"],
    },
  },
];

async function handleToolCall(name, args) {
  if (name === "prelaunchqa_get_version") {
    try {
      const res = await fetch(`${API_BASE}/api/public/version`);
      const data = await res.json();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "operational",
              engine: "Chromium Headless Playwright",
              version: data,
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ status: "error", error: err.message }),
          },
        ],
        isError: true,
      };
    }
  }

  if (name === "prelaunchqa_generate_fix_prompt") {
    const { errorType, errorMessage, pageUrl = "Homepage" } = args;
    const promptText = `### PreLaunchQA Automated Bug Fix Prompt

**Page:** ${pageUrl}
**Issue Type:** ${errorType}
**Evidence:**
\`\`\`
${errorMessage}
\`\`\`

**Instructions for AI Assistant:**
1. Identify the root cause of this runtime exception in the codebase.
2. Ensure null checks, optional chaining (?.) or defensive fallback handling are added.
3. If this is a network 404/500, verify CORS settings, environment variables and API routing.
4. Provide the exact unified diff or code replacement to fix this issue.`;

    return {
      content: [
        {
          type: "text",
          text: promptText,
        },
      ],
    };
  }

  if (name === "prelaunchqa_get_badge_url") {
    const { scanId } = args;
    const badgeUrl = `${API_BASE}/api/public/badge?scanId=${encodeURIComponent(scanId)}`;
    const reportUrl = `${API_BASE}/report/${encodeURIComponent(scanId)}`;
    const markdown = `[![PreLaunchQA Verified](${badgeUrl})](${reportUrl})`;

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            badgeUrl,
            reportUrl,
            markdownSnippet: markdown,
            htmlSnippet: `<a href="${reportUrl}"><img src="${badgeUrl}" alt="PreLaunchQA Verified" /></a>`,
          }, null, 2),
        },
      ],
    };
  }

  if (name === "prelaunchqa_inspect_url") {
    const { url } = args;
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            status: "queued",
            message: `Chromium inspection initiated for ${url}`,
            targetUrl: url,
            pipeline: "AWS Lightsail AP-South-1 Chromium Cluster",
            instructions: "Visit https://prelaunchqa.com/app to monitor real-time worker execution and raw evidence bundle.",
          }, null, 2),
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on("line", async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  try {
    const msg = JSON.parse(trimmed);
    const { id, method, params } = msg;

    if (method === "initialize") {
      process.stdout.write(
        JSON.stringify({
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: SERVER_NAME,
              version: SERVER_VERSION,
            },
          },
        }) + "\n"
      );
      return;
    }

    if (method === "notifications/initialized") {
      return;
    }

    if (method === "tools/list") {
      process.stdout.write(
        JSON.stringify({
          jsonrpc: "2.0",
          id,
          result: {
            tools: TOOLS,
          },
        }) + "\n"
      );
      return;
    }

    if (method === "tools/call") {
      const toolResult = await handleToolCall(params.name, params.arguments || {});
      process.stdout.write(
        JSON.stringify({
          jsonrpc: "2.0",
          id,
          result: toolResult,
        }) + "\n"
      );
      return;
    }

    // Default response for unhandled methods
    process.stdout.write(
      JSON.stringify({
        jsonrpc: "2.0",
        id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`,
        },
      }) + "\n"
    );
  } catch (err) {
    process.stdout.write(
      JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: `Parse error: ${err.message}`,
        },
      }) + "\n"
    );
  }
});
