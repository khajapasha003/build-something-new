/**
 * Checks run against a real page in a real browser.
 *
 * Truth rule: every finding MUST carry evidence taken from the page. The app
 * drops any finding with an empty evidence object, so never invent one.
 *
 * severity: "bug" (broken), "needs_review" (a human must judge), "passed".
 */

import { buildEvidence, validateFinding } from "./evidence.mjs";

/** @returns {Promise<Array<object>>} */
export async function runChecks(
  page,
  response,
  {
    targetUrl,
    finalUrl = null,
    consoleErrors = [],
    failedRequests = [],
    screenshot = null,
    screenshotError = null,
    loadError = null,
    isDaemon = false,
    observedAt = new Date().toISOString(),
  } = {},
) {
  const findings = [];
  const add = (f) => {
    validateFinding(f, { isDaemon });
    findings.push(f);
  };

  const resolvedPageUrl = finalUrl || (page ? page.url() : targetUrl);

  // 1. HTTP status of the page itself.
  const status = response ? response.status() : null;
  if (!response) {
    add({
      rule_id: "http.no_response",
      severity: "bug",
      title: "The page did not respond",
      detail: "The browser received no response from the server.",
      page_url: targetUrl,
      evidence: buildEvidence({
        rule_id: "http.no_response",
        severity: "bug",
        page_url: targetUrl,
        expected: "The page returns a valid HTTP response",
        actual: "The browser received no response from the server",
        repro_steps: [
          `Navigate to ${targetUrl}`,
          "Observe that the server did not return an HTTP response",
        ],
        raw: {
          status: null,
          requested_url: targetUrl,
          error: (loadError?.message || "No response received").slice(0, 300),
        },
        screenshot,
        screenshot_error: screenshotError,
        observed_at: observedAt,
        existingEvidence: { requested_url: targetUrl },
      }),
    });
  } else if (status >= 400) {
    add({
      rule_id: "http.error_status",
      severity: "bug",
      title: `The page returned an error (${status})`,
      page_url: resolvedPageUrl,
      evidence: buildEvidence({
        rule_id: "http.error_status",
        severity: "bug",
        page_url: resolvedPageUrl,
        expected: "The page loads with a successful HTTP status code (< 400)",
        actual: `The server returned HTTP status ${status}`,
        repro_steps: [
          `Navigate to ${targetUrl}`,
          `Observe that the page returned HTTP error code ${status}`,
        ],
        raw: { status, final_url: response.url() },
        screenshot,
        screenshot_error: screenshotError,
        observed_at: observedAt,
        existingEvidence: { status, final_url: response.url() },
      }),
    });
  } else {
    add({
      rule_id: "http.ok",
      severity: "passed",
      title: "The page loaded successfully",
      page_url: resolvedPageUrl,
      evidence: buildEvidence({
        rule_id: "http.ok",
        severity: "passed",
        page_url: resolvedPageUrl,
        expected: "The page loads with HTTP 200",
        actual: `The page returned HTTP ${status}`,
        repro_steps: [`Navigate to ${targetUrl}`],
        raw: { status, final_url: response.url() },
        screenshot,
        screenshot_error: screenshotError,
        observed_at: observedAt,
        existingEvidence: { status, final_url: response.url() },
      }),
    });
  }

  // 2. Browser console errors.
  if (consoleErrors.length > 0) {
    add({
      rule_id: "console.errors",
      severity: "bug",
      title: `${consoleErrors.length} error(s) in the browser console`,
      detail: "Errors logged by the page while it loaded.",
      page_url: resolvedPageUrl,
      evidence: buildEvidence({
        rule_id: "console.errors",
        severity: "bug",
        page_url: resolvedPageUrl,
        expected: "Zero errors logged in the browser console during page load",
        actual: `${consoleErrors.length} error(s) logged in the browser console`,
        repro_steps: [
          `Navigate to ${targetUrl}`,
          "Open browser developer tools and check the Console tab",
          "Observe logged error messages",
        ],
        raw: {
          count: consoleErrors.length,
          messages: consoleErrors.slice(0, 20),
        },
        screenshot,
        screenshot_error: screenshotError,
        observed_at: observedAt,
        existingEvidence: {
          messages: consoleErrors.slice(0, 20).map((m) => (typeof m === "object" ? m.text : m)),
        },
      }),
    });
  } else {
    add({
      rule_id: "console.clean",
      severity: "passed",
      title: "No errors in the browser console",
      page_url: resolvedPageUrl,
      evidence: buildEvidence({
        rule_id: "console.clean",
        severity: "passed",
        page_url: resolvedPageUrl,
        expected: "Zero browser console errors",
        actual: "0 console errors observed",
        repro_steps: [`Navigate to ${targetUrl}`, "Observe console is clean"],
        raw: { count: 0, messages: [] },
        screenshot,
        screenshot_error: screenshotError,
        observed_at: observedAt,
        existingEvidence: { messages: [] },
      }),
    });
  }

  // 3. Requests the page made that failed.
  if (failedRequests.length > 0) {
    add({
      rule_id: "network.failed_requests",
      severity: "bug",
      title: `${failedRequests.length} request(s) on the page failed`,
      page_url: resolvedPageUrl,
      evidence: buildEvidence({
        rule_id: "network.failed_requests",
        severity: "bug",
        page_url: resolvedPageUrl,
        expected: "All network subresource requests succeed with HTTP status < 400",
        actual: `${failedRequests.length} request(s) failed or returned error status`,
        repro_steps: [
          `Navigate to ${targetUrl}`,
          "Open Network tab in developer tools",
          "Observe failed network requests",
        ],
        raw: {
          count: failedRequests.length,
          requests: failedRequests.slice(0, 20),
        },
        screenshot,
        screenshot_error: screenshotError,
        observed_at: observedAt,
        existingEvidence: {
          requests: failedRequests.slice(0, 20).map((r) => (typeof r === "object" ? r.url : r)),
        },
      }),
    });
  }

  // If the server did not respond (connection failed), DOM checks cannot run.
  if (!response) {
    return findings;
  }

  // 4. Page title and description.
  const meta = await page.evaluate(() => ({
    title: document.title || "",
    description: document.querySelector('meta[name="description"]')?.getAttribute("content") || "",
    viewport: document.querySelector('meta[name="viewport"]')?.getAttribute("content") || "",
    lang: document.documentElement.getAttribute("lang") || "",
    htmlTag: document.documentElement.outerHTML.slice(0, 150),
  }));

  if (!meta.title.trim()) {
    add({
      rule_id: "seo.missing_title",
      severity: "bug",
      title: "The page has no title",
      page_url: resolvedPageUrl,
      evidence: buildEvidence({
        rule_id: "seo.missing_title",
        severity: "bug",
        page_url: resolvedPageUrl,
        expected: "Document <head> contains a non-empty <title> tag",
        actual: "Document title is empty or missing",
        repro_steps: [
          `Navigate to ${targetUrl}`,
          "Inspect page HTML <head> for a non-empty <title> element",
        ],
        raw: { selector: "title", count: 0, outerHTML: "" },
        screenshot,
        screenshot_error: screenshotError,
        observed_at: observedAt,
        existingEvidence: { title: meta.title },
      }),
    });
  } else {
    add({
      rule_id: "seo.title",
      severity: "passed",
      title: "The page has a title",
      page_url: resolvedPageUrl,
      evidence: buildEvidence({
        rule_id: "seo.title",
        severity: "passed",
        page_url: resolvedPageUrl,
        expected: "Document has a title",
        actual: `Document title: "${meta.title.slice(0, 80)}"`,
        repro_steps: [`Navigate to ${targetUrl}`],
        raw: { selector: "title", count: 1, title: meta.title },
        screenshot,
        screenshot_error: screenshotError,
        observed_at: observedAt,
        existingEvidence: { title: meta.title },
      }),
    });
  }

  if (!meta.description.trim()) {
    add({
      rule_id: "seo.missing_description",
      severity: "needs_review",
      title: "The page has no description for search results and link previews",
      page_url: resolvedPageUrl,
      evidence: buildEvidence({
        rule_id: "seo.missing_description",
        severity: "needs_review",
        page_url: resolvedPageUrl,
        expected: "A <meta name='description' content='...'> tag is present in <head>",
        actual: "No meta description tag or empty content found",
        repro_steps: [
          `Navigate to ${targetUrl}`,
          "Inspect page HTML <head> for <meta name='description'>",
        ],
        raw: { selector: 'meta[name="description"]', count: 0, outerHTML: "" },
        screenshot,
        screenshot_error: screenshotError,
        observed_at: observedAt,
        existingEvidence: { description: meta.description },
      }),
    });
  }

  if (!meta.viewport.trim()) {
    add({
      rule_id: "mobile.missing_viewport",
      severity: "bug",
      title: "The page is missing the mobile viewport setting",
      page_url: resolvedPageUrl,
      evidence: buildEvidence({
        rule_id: "mobile.missing_viewport",
        severity: "bug",
        page_url: resolvedPageUrl,
        expected: "A <meta name='viewport' content='...'> tag is present in <head>",
        actual: "No viewport meta tag found",
        repro_steps: [
          `Navigate to ${targetUrl}`,
          "Inspect page HTML <head> for <meta name='viewport'>",
        ],
        raw: { selector: 'meta[name="viewport"]', count: 0, outerHTML: "" },
        screenshot,
        screenshot_error: screenshotError,
        observed_at: observedAt,
        existingEvidence: { viewport: meta.viewport },
      }),
    });
  }

  if (!meta.lang.trim()) {
    add({
      rule_id: "a11y.missing_lang",
      severity: "needs_review",
      title: "The page does not declare a language",
      page_url: resolvedPageUrl,
      evidence: buildEvidence({
        rule_id: "a11y.missing_lang",
        severity: "needs_review",
        page_url: resolvedPageUrl,
        expected: "The <html> element declares a lang attribute (e.g. <html lang='en'>)",
        actual: "The <html> element is missing the lang attribute",
        repro_steps: [
          `Navigate to ${targetUrl}`,
          "Inspect the root <html> element for a lang attribute",
        ],
        raw: {
          selector: "html",
          count: 1,
          outerHTML: meta.htmlTag.slice(0, 300),
        },
        screenshot,
        screenshot_error: screenshotError,
        observed_at: observedAt,
        existingEvidence: { lang: meta.lang },
      }),
    });
  }

  // 5. Images with no alternative text.
  const images = await page.evaluate(() =>
    Array.from(document.images)
      .filter((img) => !img.getAttribute("alt"))
      .slice(0, 20)
      .map((img) => ({
        src: img.currentSrc || img.src,
        outerHTML: img.outerHTML.slice(0, 300),
      })),
  );
  if (images.length > 0) {
    add({
      rule_id: "a11y.images_without_alt",
      severity: "needs_review",
      title: `${images.length} image(s) have no alternative text`,
      page_url: resolvedPageUrl,
      evidence: buildEvidence({
        rule_id: "a11y.images_without_alt",
        severity: "needs_review",
        page_url: resolvedPageUrl,
        expected: "All <img> elements provide a descriptive alt attribute",
        actual: `${images.length} image(s) missing alt attribute`,
        repro_steps: [`Navigate to ${targetUrl}`, "Find <img> tags without an alt attribute"],
        raw: {
          selector: "img:not([alt])",
          count: images.length,
          elements: images.map((i) => ({ outerHTML: i.outerHTML })),
        },
        screenshot,
        screenshot_error: screenshotError,
        observed_at: observedAt,
        existingEvidence: { images: images.map((i) => i.src) },
      }),
    });
  }

  // 6. Form fields with no label.
  const unlabelled = await page.evaluate(() =>
    Array.from(document.querySelectorAll("input, select, textarea"))
      .filter((el) => {
        if (el.type === "hidden" || el.type === "submit" || el.type === "button") return false;
        if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) return false;
        if (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) return false;
        return !el.closest("label");
      })
      .slice(0, 20)
      .map((el) => ({
        outerHTML: el.outerHTML.slice(0, 300),
      })),
  );
  if (unlabelled.length > 0) {
    add({
      rule_id: "a11y.unlabelled_fields",
      severity: "needs_review",
      title: `${unlabelled.length} form field(s) have no label`,
      page_url: resolvedPageUrl,
      evidence: buildEvidence({
        rule_id: "a11y.unlabelled_fields",
        severity: "needs_review",
        page_url: resolvedPageUrl,
        expected: "Every visible form field has an associated <label> or aria-label",
        actual: `${unlabelled.length} form field(s) have no associated label`,
        repro_steps: [
          `Navigate to ${targetUrl}`,
          "Inspect form inputs for missing label associations",
        ],
        raw: {
          selector: "input, select, textarea",
          count: unlabelled.length,
          elements: unlabelled.map((u) => ({ outerHTML: u.outerHTML })),
        },
        screenshot,
        screenshot_error: screenshotError,
        observed_at: observedAt,
        existingEvidence: { fields: unlabelled.map((u) => u.outerHTML) },
      }),
    });
  }

  // 7. Insecure content loaded on an https page.
  // Correction 1: Only check when the final page URL uses https:, and only for resources the page actually loads.
  let pageProtocol = "";
  try {
    pageProtocol = new URL(resolvedPageUrl).protocol;
  } catch {
    pageProtocol = "";
  }

  if (pageProtocol === "https:") {
    const insecure = await page.evaluate(() => {
      const urls = [];
      const media = Array.from(
        document.querySelectorAll(
          "img[src], script[src], iframe[src], video[src], audio[src], source[src]",
        ),
      );
      for (const el of media) {
        const src = el.getAttribute("src") || "";
        if (src.startsWith("http://")) urls.push(src);
      }
      const stylesheets = Array.from(document.querySelectorAll('link[rel~="stylesheet"][href]'));
      for (const el of stylesheets) {
        const href = el.getAttribute("href") || "";
        if (href.startsWith("http://")) urls.push(href);
      }
      return urls.slice(0, 20);
    });

    if (insecure.length > 0) {
      add({
        rule_id: "security.mixed_content",
        severity: "bug",
        title: `${insecure.length} item(s) load over an insecure connection`,
        page_url: resolvedPageUrl,
        evidence: buildEvidence({
          rule_id: "security.mixed_content",
          severity: "bug",
          page_url: resolvedPageUrl,
          expected: "All page resources load over secure HTTPS connection",
          actual: `${insecure.length} resource(s) load over insecure HTTP`,
          repro_steps: [
            `Navigate to ${resolvedPageUrl}`,
            "Inspect network subresources loaded via http:// on an https:// page",
          ],
          raw: {
            page_protocol: pageProtocol,
            count: insecure.length,
            urls: insecure,
          },
          screenshot,
          observed_at: observedAt,
          existingEvidence: { urls: insecure },
        }),
      });
    }
  }

  // 8. Links that point nowhere.
  const emptyLinks = await page.evaluate(() =>
    Array.from(document.querySelectorAll("a"))
      .filter((a) => {
        const href = a.getAttribute("href");
        return !href || href === "#" || href.startsWith("javascript:void");
      })
      .slice(0, 20)
      .map((a) => ({
        href: a.getAttribute("href") || "",
        outerHTML: a.outerHTML.slice(0, 300),
      })),
  );
  if (emptyLinks.length > 0) {
    add({
      rule_id: "links.dead",
      severity: "needs_review",
      title: `${emptyLinks.length} link(s) do not go anywhere`,
      page_url: resolvedPageUrl,
      evidence: buildEvidence({
        rule_id: "links.dead",
        severity: "needs_review",
        page_url: resolvedPageUrl,
        expected: "All anchor <a> tags link to valid destinations",
        actual: `${emptyLinks.length} link(s) point to empty, '#' or javascript:void destinations`,
        repro_steps: [
          `Navigate to ${targetUrl}`,
          "Inspect <a> elements with empty, '#' or 'javascript:void' href values",
        ],
        raw: {
          selector: "a[href='#'], a[href=''], a[href^='javascript:void']",
          count: emptyLinks.length,
          elements: emptyLinks.map((l) => ({ outerHTML: l.outerHTML })),
        },
        screenshot,
        screenshot_error: screenshotError,
        observed_at: observedAt,
        existingEvidence: { links: emptyLinks.map((l) => l.outerHTML) },
      }),
    });
  }

  return findings;
}
