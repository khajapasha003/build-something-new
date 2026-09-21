/**
 * Checks run against a real page in a real browser.
 *
 * Truth rule: every finding MUST carry evidence taken from the page. The app
 * drops any finding with an empty evidence object, so never invent one.
 *
 * severity: "bug" (broken), "needs_review" (a human must judge), "passed".
 */

/** @returns {Promise<Array<object>>} */
export async function runChecks(page, response, { targetUrl, consoleErrors, failedRequests }) {
  const findings = [];
  const add = (f) => findings.push(f);

  // 1. HTTP status of the page itself.
  const status = response ? response.status() : 0;
  if (!response) {
    add({
      rule_id: "http.no_response",
      severity: "bug",
      title: "The page did not respond",
      detail: "The browser received no response from the server.",
      page_url: targetUrl,
      evidence: { requested_url: targetUrl },
    });
  } else if (status >= 400) {
    add({
      rule_id: "http.error_status",
      severity: "bug",
      title: `The page returned an error (${status})`,
      page_url: targetUrl,
      evidence: { status, final_url: response.url() },
    });
  } else {
    add({
      rule_id: "http.ok",
      severity: "passed",
      title: "The page loaded successfully",
      page_url: targetUrl,
      evidence: { status, final_url: response.url() },
    });
  }

  // 2. Browser console errors.
  if (consoleErrors.length > 0) {
    add({
      rule_id: "console.errors",
      severity: "bug",
      title: `${consoleErrors.length} error(s) in the browser console`,
      detail: "Errors logged by the page while it loaded.",
      page_url: targetUrl,
      evidence: { messages: consoleErrors.slice(0, 20) },
    });
  } else {
    add({
      rule_id: "console.clean",
      severity: "passed",
      title: "No errors in the browser console",
      page_url: targetUrl,
      evidence: { messages: [] },
    });
  }

  // 3. Requests the page made that failed.
  if (failedRequests.length > 0) {
    add({
      rule_id: "network.failed_requests",
      severity: "bug",
      title: `${failedRequests.length} request(s) on the page failed`,
      page_url: targetUrl,
      evidence: { requests: failedRequests.slice(0, 20) },
    });
  }

  // 4. Page title and description.
  const meta = await page.evaluate(() => ({
    title: document.title || "",
    description:
      document.querySelector('meta[name="description"]')?.getAttribute("content") || "",
    viewport: document.querySelector('meta[name="viewport"]')?.getAttribute("content") || "",
    lang: document.documentElement.getAttribute("lang") || "",
  }));

  if (!meta.title.trim()) {
    add({
      rule_id: "seo.missing_title",
      severity: "bug",
      title: "The page has no title",
      page_url: targetUrl,
      evidence: { title: meta.title },
    });
  } else {
    add({
      rule_id: "seo.title",
      severity: "passed",
      title: "The page has a title",
      page_url: targetUrl,
      evidence: { title: meta.title },
    });
  }

  if (!meta.description.trim()) {
    add({
      rule_id: "seo.missing_description",
      severity: "needs_review",
      title: "The page has no description for search results and link previews",
      page_url: targetUrl,
      evidence: { description: meta.description },
    });
  }

  if (!meta.viewport.trim()) {
    add({
      rule_id: "mobile.missing_viewport",
      severity: "bug",
      title: "The page is missing the mobile viewport setting",
      page_url: targetUrl,
      evidence: { viewport: meta.viewport },
    });
  }

  if (!meta.lang.trim()) {
    add({
      rule_id: "a11y.missing_lang",
      severity: "needs_review",
      title: "The page does not declare a language",
      page_url: targetUrl,
      evidence: { lang: meta.lang },
    });
  }

  // 5. Images with no alternative text.
  const images = await page.evaluate(() =>
    Array.from(document.images)
      .filter((img) => !img.getAttribute("alt"))
      .slice(0, 20)
      .map((img) => img.currentSrc || img.src),
  );
  if (images.length > 0) {
    add({
      rule_id: "a11y.images_without_alt",
      severity: "needs_review",
      title: `${images.length} image(s) have no alternative text`,
      page_url: targetUrl,
      evidence: { images },
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
      .map((el) => el.outerHTML.slice(0, 200)),
  );
  if (unlabelled.length > 0) {
    add({
      rule_id: "a11y.unlabelled_fields",
      severity: "needs_review",
      title: `${unlabelled.length} form field(s) have no label`,
      page_url: targetUrl,
      evidence: { fields: unlabelled },
    });
  }

  // 7. Insecure content loaded on an https page.
  const insecure = await page.evaluate(() =>
    Array.from(document.querySelectorAll("img, script, link, iframe"))
      .map((el) => el.getAttribute("src") || el.getAttribute("href") || "")
      .filter((value) => value.startsWith("http://"))
      .slice(0, 20),
  );
  if (insecure.length > 0) {
    add({
      rule_id: "security.mixed_content",
      severity: "bug",
      title: `${insecure.length} item(s) load over an insecure connection`,
      page_url: targetUrl,
      evidence: { urls: insecure },
    });
  }

  // 8. Links that point nowhere.
  const emptyLinks = await page.evaluate(() =>
    Array.from(document.querySelectorAll("a"))
      .filter((a) => {
        const href = a.getAttribute("href");
        return !href || href === "#" || href.startsWith("javascript:void");
      })
      .slice(0, 20)
      .map((a) => (a.textContent || "").trim().slice(0, 80) || a.outerHTML.slice(0, 120)),
  );
  if (emptyLinks.length > 0) {
    add({
      rule_id: "links.dead",
      severity: "needs_review",
      title: `${emptyLinks.length} link(s) do not go anywhere`,
      page_url: targetUrl,
      evidence: { links: emptyLinks },
    });
  }

  return findings;
}
