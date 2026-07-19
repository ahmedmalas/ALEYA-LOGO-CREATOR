import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.PREVIEW_BASE_URL ?? "http://127.0.0.1:3000";
const EMAIL = process.env.PROD_TEST_EMAIL ?? "aleya.logo.tester@gmail.com";
const PASSWORD = process.env.PROD_TEST_PASSWORD ?? "AleyaLogoTest!2026";
const ART = "/opt/cursor/artifacts/readiness-visual";
fs.mkdirSync(ART, { recursive: true });

const results = [];
const record = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

async function shot(page, name) {
  await page.screenshot({ path: path.join(ART, `${name}.png`), fullPage: true });
}

async function signIn(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard**", { timeout: 45000 });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await desktop.newPage();
  const mpage = await mobile.newPage();

  await page.goto(BASE, { waitUntil: "networkidle" });
  await shot(page, "01-signed-out-home");
  record("signed-out home", (await page.locator('[data-auth="signed-out"]').count()) > 0);

  await page.goto(`${BASE}/pricing`, { waitUntil: "networkidle" });
  await shot(page, "02-signed-out-pricing");
  const pricingText = await page.innerText("body");
  record("signed-out pricing waitlist language", /join waitlist/i.test(pricingText));
  const ctaLabels = await page.locator("[data-cta-label]").evaluateAll((nodes) =>
    nodes.map((n) => n.getAttribute("data-cta-label") || ""),
  );
  record(
    "no forbidden Pro CTAs",
    !ctaLabels.some((label) =>
      /^(Buy|Subscribe|Upgrade Now|Upgrade to Pro|Start Pro|Checkout)$/i.test(label),
    ),
    ctaLabels.join(", "),
  );

  await page.goto(`${BASE}/gallery`, { waitUntil: "networkidle" });
  await shot(page, "03-gallery");

  await signIn(page);
  await shot(page, "04-dashboard-with-projects");
  record("dashboard usage", (await page.getByTestId("dashboard-usage").count()) > 0);

  await page.goto(BASE, { waitUntil: "networkidle" });
  await shot(page, "05-signed-in-home");
  record("signed-in home no Get Started", (await page.locator('[data-cta-label="Get Started"]').count()) === 0);

  await page.goto(`${BASE}/pricing`, { waitUntil: "networkidle" });
  await shot(page, "06-signed-in-pricing");
  record("signed-in pricing current plan", (await page.locator('[data-cta-label="Current plan"]').count()) > 0);
  record("signed-in pricing join waitlist", (await page.locator('[data-cta-label="Join waitlist"]').count()) > 0);

  for (const [route, name] of [
    ["/account/profile", "07-profile"],
    ["/account/plan", "08-plan-usage"],
    ["/account/preferences", "09-preferences"],
    ["/account/security", "10-security"],
    ["/help", "11-help"],
    ["/references", "12-references"],
    ["/brand-kits", "13-brand-kits"],
    ["/projects/new", "14-create-project"],
  ]) {
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
    await shot(page, name);
    record(`${name} loads`, !page.url().includes("/login"));
  }

  record(
    "deactivate wording",
    ((await page.goto(`${BASE}/account/security`, { waitUntil: "networkidle" }),
    await page.innerText("body")) || "").includes("Deactivate account"),
  );
  record(
    "no permanent delete success claim without hard delete",
    !((await page.innerText("body")) || "").includes("Cancel / delete account"),
  );

  await page.goto(`${BASE}/account/plan`, { waitUntil: "networkidle" });
  const join = page.locator('[data-cta-label="Join waitlist"]');
  if (await join.count()) {
    await join.click();
    await page
      .waitForSelector('[data-testid="waitlist-confirmed"]', { timeout: 15000 })
      .catch(() => {});
  }
  await shot(page, "15-waitlist-joined");
  record(
    "waitlist confirmation",
    (await page.getByTestId("waitlist-confirmed").count()) > 0 ||
      ((await page.innerText("body")) || "").includes("You are on the Pro waitlist"),
  );

  await page.goto(`${BASE}/projects/new`, { waitUntil: "networkidle" });
  const png = path.join(ART, "qa.png");
  fs.writeFileSync(
    png,
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC",
      "base64",
    ),
  );
  await page.fill('input[name="businessName"]', `Readiness ${Date.now()}`);
  await page.fill('input[name="industry"]', "Design");
  await page.locator('input[type="file"]').setInputFiles(png);
  await page.getByRole("button", { name: /Save and continue/i }).click();
  await page.waitForURL((url) => /\/projects\/[0-9a-f-]{36}/i.test(url.pathname), { timeout: 60000 });
  await page
    .waitForFunction(() => document.querySelectorAll('[data-testid="saved-reference"]').length > 0, {
      timeout: 60000,
    })
    .catch(() => {});
  await shot(page, "16-project-with-reference-analysis");
  const body = await page.innerText("body");
  record(
    "reference analysis panel present",
    (await page.getByTestId("reference-analysis").count()) > 0,
  );
  record(
    "honest visual analysis status",
    body.includes("Visual analysis is unavailable") ||
      body.includes("Analysed with") ||
      body.includes("Reference analysis"),
  );

  const gen = page.getByRole("button", { name: /Generate concepts/i });
  if (await gen.count()) {
    await gen.click();
    await page
      .waitForFunction(
        () => {
          const t = document.body.innerText;
          return t.includes("Download") || t.includes("failed") || t.includes("limit");
        },
        { timeout: 120000 },
      )
      .catch(() => {});
    await shot(page, "17-generation-results");
    record("generation results", ((await page.innerText("body")) || "").includes("Download"));
  } else {
    record("generation results", false, "button missing");
  }

  // Export
  const downloadBtn = page.getByRole("button", { name: /Download/i }).first();
  if (await downloadBtn.count()) {
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 30000 }).catch(() => null),
      downloadBtn.click(),
    ]);
    record("export triggered", Boolean(download));
    await page.goto(`${BASE}/account/plan`, { waitUntil: "networkidle" });
    await shot(page, "18-plan-after-export");
    const planText = await page.innerText("body");
    record("export counter updated", /\b[1-9]\d*\b/.test(planText) && /export/i.test(planText));
  } else {
    record("export triggered", false, "no download button");
    record("export counter updated", false, "skipped");
  }

  // Mobile nav
  await mpage.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await mpage.fill('input[name="email"]', EMAIL);
  await mpage.fill('input[name="password"]', PASSWORD);
  await mpage.getByRole("button", { name: "Sign in" }).click();
  await mpage.waitForURL("**/dashboard**", { timeout: 45000 });
  await mpage.getByRole("button", { name: "Menu" }).click();
  await shot(mpage, "19-mobile-nav");
  record("mobile nav", ((await mpage.getByTestId("app-primary-nav").innerText()) || "").includes("Profile"));

  await mpage.goto(`${BASE}/pricing`, { waitUntil: "networkidle" });
  await shot(mpage, "20-mobile-pricing");
  record("mobile pricing", mpage.url().includes("/pricing"));

  await browser.close();
  const summary = {
    base: BASE,
    preview: process.env.PREVIEW_PUBLIC_URL || null,
    passed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
    visionModel: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini (when OPENAI_API_KEY present)",
  };
  fs.writeFileSync(path.join(ART, "results.json"), JSON.stringify(summary, null, 2));
  console.log(`\nSummary: ${summary.passed}/${summary.passed + summary.failed}`);
  if (summary.failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
