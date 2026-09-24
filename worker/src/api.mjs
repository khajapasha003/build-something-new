import { createHmac } from "node:crypto";

const SIGNATURE_HEADER = "x-plq-signature";
const TIMESTAMP_HEADER = "x-plq-timestamp";

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export const config = {
  apiBase: () => required("PLQ_API_BASE").replace(/\/+$/, ""),
  secret: () => required("WORKER_SHARED_SECRET"),
  workerId: () => process.env.WORKER_ID || "worker",
  pollSeconds: () => Number(process.env.POLL_INTERVAL_SECONDS || 10),
};

/** Signs and POSTs a JSON payload to one of the worker endpoints. */
async function post(path, payload) {
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac("sha256", config.secret())
    .update(`${timestamp}.${body}`)
    .digest("hex");

  const response = await fetch(`${config.apiBase()}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      [TIMESTAMP_HEADER]: timestamp,
      [SIGNATURE_HEADER]: signature,
    },
    body,
  });

  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // leave parsed as null; the raw text goes into the error below
  }

  if (!response.ok) {
    throw new Error(`${path} responded ${response.status}: ${parsed?.error ?? text.slice(0, 200)}`);
  }
  return parsed;
}

export const api = {
  claim: () => post("/api/public/worker/claim", { worker_id: config.workerId() }),
  progress: (scanId, claimToken, progress, message) =>
    post("/api/public/worker/progress", {
      scan_id: scanId,
      claim_token: claimToken,
      progress,
      message,
    }),
  result: (scanId, claimToken, status, findings, error) =>
    post("/api/public/worker/result", {
      scan_id: scanId,
      claim_token: claimToken,
      status,
      findings,
      ...(error ? { error } : {}),
    }),
};
