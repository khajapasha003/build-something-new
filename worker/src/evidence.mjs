/**
 * Evidence contract validation and enrichment for PreLaunchQA findings.
 */

/**
 * Validates that a finding conforms to the Phase A evidence contract.
 * A non-passed finding that fails validation is never dropped silently:
 * it is marked with status "needs_review" and a validation_errors array.
 *
 * @param {object} finding
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateFinding(finding) {
  const errors = [];

  if (!finding || typeof finding !== "object") {
    return { valid: false, errors: ["Finding must be an object"] };
  }

  // Contract applies to non-passed findings
  if (finding.severity !== "passed") {
    const evidence = finding.evidence;
    if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
      errors.push("evidence must be a non-null object");
    } else {
      // rule_id
      if (!evidence.rule_id || evidence.rule_id !== finding.rule_id) {
        errors.push(`evidence.rule_id must match finding.rule_id (${finding.rule_id})`);
      }

      // status: "confirmed" (from bug) | "needs_review" (from needs_review)
      const expectedStatus = finding.severity === "bug" ? "confirmed" : "needs_review";
      if (evidence.status !== expectedStatus) {
        errors.push(`evidence.status must be '${expectedStatus}', got '${evidence.status}'`);
      }

      // observed_at: ISO 8601 UTC timestamp
      if (!evidence.observed_at || typeof evidence.observed_at !== "string") {
        errors.push("evidence.observed_at must be an ISO 8601 UTC string");
      } else {
        const d = new Date(evidence.observed_at);
        if (Number.isNaN(d.getTime())) {
          errors.push("evidence.observed_at must be a valid date string");
        }
      }

      // page_url: final URL after redirects
      if (!evidence.page_url || typeof evidence.page_url !== "string") {
        errors.push("evidence.page_url must be a non-empty string");
      }

      // expected, actual: short strings
      if (typeof evidence.expected !== "string" || evidence.expected.trim() === "") {
        errors.push("evidence.expected must be a non-empty string");
      }
      if (typeof evidence.actual !== "string" || evidence.actual.trim() === "") {
        errors.push("evidence.actual must be a non-empty string");
      }

      // repro_steps: array with at least 1 plain-language step
      if (!Array.isArray(evidence.repro_steps) || evidence.repro_steps.length === 0) {
        errors.push("evidence.repro_steps must be an array with at least 1 step");
      }

      // raw: rule-specific raw data, must be non-empty
      if (
        evidence.raw === undefined ||
        evidence.raw === null ||
        (typeof evidence.raw === "object" && Object.keys(evidence.raw).length === 0)
      ) {
        errors.push("evidence.raw must be non-empty");
      }

      // screenshot: { file, sha256 } or null
      if (evidence.screenshot !== null) {
        if (
          typeof evidence.screenshot !== "object" ||
          !evidence.screenshot.file ||
          !evidence.screenshot.sha256
        ) {
          errors.push(
            "evidence.screenshot must be null or an object with 'file' and 'sha256' strings",
          );
        } else if (
          typeof evidence.screenshot.sha256 !== "string" ||
          evidence.screenshot.sha256.length !== 64
        ) {
          errors.push("evidence.screenshot.sha256 must be a 64-character hex string");
        }
      }
    }
  }

  if (errors.length > 0) {
    if (finding.evidence && typeof finding.evidence === "object") {
      finding.evidence.status = "needs_review";
      finding.evidence.validation_errors = errors;
    }
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}

/**
 * Enriches a finding's evidence object with contract fields.
 */
export function buildEvidence({
  rule_id,
  severity,
  page_url,
  expected,
  actual,
  repro_steps,
  raw,
  screenshot = null,
  observed_at = new Date().toISOString(),
  existingEvidence = {},
}) {
  const status =
    severity === "bug" ? "confirmed" : severity === "needs_review" ? "needs_review" : "passed";

  return {
    ...existingEvidence,
    rule_id,
    status,
    observed_at,
    page_url,
    expected,
    actual,
    repro_steps: Array.isArray(repro_steps) ? repro_steps : [repro_steps].filter(Boolean),
    raw,
    screenshot: screenshot ? { file: screenshot.file, sha256: screenshot.sha256 } : null,
  };
}
