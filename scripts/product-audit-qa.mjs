import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.PREVIEW_BASE_URL ?? "http://127.0.0.1:3000";
const ACCOUNT_A = {
  email: process.env.PROD_TEST_EMAIL ?? "aleya.logo.tester@gmail.com",
  password: process.env.PROD_TEST_PASSWORD ?? "AleyaLogoTest!2026",
};
const ACCOUNT_B = {
  email: process.env.PROD_TEST_EMAIL_B ?? "aleya.logo.tester2@gmail.com",
  password: process.env.PROD_TEST_PASSWORD_B ?? "AleyaLogoTest2!2026",
};
const ART = "/opt/cursor/artifacts/product-audit";
fs.mkdirSync(ART, { recursive: true });

const results = [];
const record = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

async function shot(page, name) {
  const file = path.join(ART, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function signIn(page, account) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', account.email);
  await page.fill('input[name="password"]', account.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard**", { timeout: 45000 });
}

async function signOut(page) {
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" }).catch(() => {});
  const form = page.locator('form[action="/auth/signout"]').first();
  if (await form.count()) {
    await form.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/dashboard"), { timeout: 20000 }).catch(() => {});
  }
}

function writeTinyPng(filePath) {
  fs.writeFileSync(
    filePath,
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    ),
  );
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // Signed-out marketing
  await page.goto(BASE, { waitUntil: "networkidle" });
  await shot(page, "01-signed-out-home");
  const outAuth = await page.locator("[data-auth]").first().getAttribute("data-auth");
  record("signed-out homepage state", outAuth === "signed-out", outAuth ?? "");
  record(
    "signed-out Get Started present",
    (await page.locator('[data-cta-label="Get Started"]').count()) > 0,
  );

  await page.goto(`${BASE}/pricing`, { waitUntil: "networkidle" });
  await shot(page, "02-signed-out-pricing");
  record("pricing loads signed-out", page.url().includes("/pricing"));
  record(
    "pricing comparison table present",
    (await page.getByRole("heading", { name: "Feature comparison" }).count()) > 0,
  );
  record(
    "free plan no payment required row",
    (await page.locator("table").innerText()).includes("Payment method required"),
  );
  record(
    "billing honesty on pricing",
    (await page.locator("body").innerText()).match(/waitlist|not connected/i) != null,
  );

  // Account A
  await signIn(page, ACCOUNT_A);
  await shot(page, "03-account-a-dashboard");
  record("account A login", page.url().includes("/dashboard"), page.url());
  record(
    "dashboard usage cards",
    (await page.getByTestId("dashboard-usage").count()) > 0,
  );
  record(
    "dashboard shows Free plan",
    ((await page.getByTestId("dashboard-usage").innerText()) || "").includes("Free"),
  );

  const navText = (await page.getByTestId("app-primary-nav").innerText()) || "";
  for (const label of [
    "Dashboard",
    "Create New Logo",
    "My Projects",
    "Brand Kits",
    "Uploaded References",
    "Plan",
    "Profile",
    "Account Settings",
    "Help",
    "Pricing",
  ]) {
    record(`app nav includes ${label}`, navText.includes(label));
  }

  // Mobile nav
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Menu" }).click();
  await shot(page, "04-mobile-nav");
  record(
    "mobile menu reveals Profile",
    ((await page.getByTestId("app-primary-nav").innerText()) || "").includes("Profile"),
  );
  await page.setViewportSize({ width: 1280, height: 900 });

  // Profile
  await page.goto(`${BASE}/account/profile`, { waitUntil: "networkidle" });
  await shot(page, "05-profile");
  record("profile page loads", page.url().includes("/account/profile"));
  const displayName = `Ahmed QA ${Date.now().toString().slice(-4)}`;
  await page.fill('input[name="displayName"]', displayName);
  await page.fill('input[name="businessName"]', "ALEYA QA Org");
  await page.fill('input[name="country"]', "Australia");
  await page.getByRole("button", { name: "Save profile" }).click();
  await page
    .waitForFunction(() => document.body.innerText.includes("Profile saved"), { timeout: 10000 })
    .catch(() => {});
  const savedCopy = (await page.locator("body").innerText()) || "";
  await page.reload({ waitUntil: "networkidle" });
  const persisted = (await page.locator('input[name="displayName"]').inputValue()) === displayName;
  record("profile save confirmation", savedCopy.includes("Profile saved") || persisted, savedCopy.slice(0, 120));
  record("profile persists after refresh", persisted);

  // Plan + preferences + security
  await page.goto(`${BASE}/account/plan`, { waitUntil: "networkidle" });
  await shot(page, "06-plan");
  record("plan page loads", (await page.getByTestId("account-plan").count()) > 0);
  record(
    "billing blocker honest",
    ((await page.getByTestId("billing-status").innerText()) || "").match(/not connected|unavailable/i) !=
      null,
  );

  await page.goto(`${BASE}/account/preferences`, { waitUntil: "networkidle" });
  await shot(page, "07-preferences");
  record("preferences form", (await page.getByTestId("preferences-form").count()) > 0);

  await page.goto(`${BASE}/account/security`, { waitUntil: "networkidle" });
  record("security page", (await page.getByRole("heading", { name: "Change password" }).count()) > 0);

  // Signed-in pricing
  await page.goto(`${BASE}/pricing`, { waitUntil: "networkidle" });
  await shot(page, "08-signed-in-pricing");
  record("signed-in pricing uses app shell", (await page.getByTestId("app-shell-header").count()) > 0);
  record(
    "signed-in pricing no Get Started",
    (await page.locator('[data-cta-label="Get Started"]').count()) === 0,
  );
  record(
    "current plan button disabled",
    (await page.locator('button[data-cta-label="Current plan"]').count()) > 0,
  );

  // References upload
  await page.goto(`${BASE}/projects/new`, { waitUntil: "networkidle" });
  await shot(page, "09-new-project");
  record(
    "reference uploader file-first copy",
    ((await page.getByTestId("reference-uploader").innerText()) || "").includes("Optional notes"),
  );
  const projectName = `Audit Project A ${Date.now()}`;
  await page.fill('input[name="businessName"]', projectName);
  await page.fill('input[name="industry"]', "Design");
  const pngPath = path.join(ART, "ref-a.png");
  writeTinyPng(pngPath);
  await page.locator('input[type="file"]').setInputFiles(pngPath);
  await page.waitForTimeout(500);
  record("queues real file upload", (await page.getByText("ref-a.png").count()) > 0);
  await page.getByRole("button", { name: /Save and continue/i }).click();
  await page.waitForURL(
    (url) => /\/projects\/[0-9a-f-]{36}/i.test(url.pathname),
    { timeout: 60000 },
  );
  const projectAUrl = page.url();
  const projectAId = projectAUrl.split("/projects/")[1]?.split("?")[0];
  record("project A created", Boolean(projectAId) && projectAId !== "new", projectAId ?? "");
  // Wait for queued reference flush after project create.
  await page
    .waitForFunction(() => document.querySelectorAll('[data-testid="saved-reference"]').length > 0, {
      timeout: 45000,
    })
    .catch(() => {});
  await page.reload({ waitUntil: "networkidle" });
  await shot(page, "10-project-with-ref");
  record(
    "reference persisted after refresh",
    (await page.getByTestId("saved-reference").count()) > 0,
  );

  // Generate with references
  const generateBtn = page.getByRole("button", { name: /Generate concepts/i });
  if (await generateBtn.count()) {
    await generateBtn.click();
    await page.waitForTimeout(2000);
    await page
      .waitForFunction(
        () => {
          const text = document.body.innerText;
          return (
            text.includes("Download") ||
            text.includes("Concepts generated") ||
            text.includes("Select final") ||
            text.includes("failed") ||
            text.includes("rate limit")
          );
        },
        { timeout: 120000 },
      )
      .catch(() => {});
    const body = await page.innerText("body");
    const genOk =
      body.includes("Download") || body.includes("Concepts generated") || body.includes("Select final");
    record("generation with references", genOk, genOk ? "concepts" : body.slice(0, 180));
    await shot(page, "11-generation");
    await page.reload({ waitUntil: "networkidle" });
    record(
      "used-in-generation indicator",
      (await page.getByTestId("reference-used-badge").count()) > 0 ||
        ((await page.locator("body").innerText()) || "").includes("Used in a generation"),
    );
  } else {
    record("generation with references", false, "Generate button missing");
  }

  await page.goto(`${BASE}/references`, { waitUntil: "networkidle" });
  await shot(page, "12-references-library");
  record("references library lists uploads", (await page.getByTestId("references-library").count()) > 0);

  await page.goto(BASE, { waitUntil: "networkidle" });
  await shot(page, "13-signed-in-home");
  record(
    "signed-in homepage no Sign In CTA",
    (await page.locator('[data-cta-label="Sign In"]').count()) === 0,
  );

  // Isolation: Account B should not see Account A project
  await signOut(page);
  const contextB = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pageB = await contextB.newPage();
  await signIn(pageB, ACCOUNT_B);
  await shot(pageB, "14-account-b-dashboard");
  record("account B login", pageB.url().includes("/dashboard"), pageB.url());
  const dashB = await pageB.innerText("body");
  record("account B cannot see project A name", !dashB.includes(projectName), projectName);

  if (projectAId) {
    const resp = await pageB.goto(`${BASE}/projects/${projectAId}`, { waitUntil: "networkidle" });
    const status = resp?.status() ?? 0;
    const bodyB = await pageB.innerText("body");
    record(
      "cross-account project isolation",
      status >= 400 ||
        bodyB.includes("not found") ||
        bodyB.includes("Not found") ||
        !bodyB.includes(projectName) ||
        pageB.url().includes("/login") ||
        pageB.url().includes("/dashboard"),
      `status=${status} url=${pageB.url()}`,
    );
    await shot(pageB, "15-account-b-isolation");
  }

  await pageB.goto(`${BASE}/account/profile`, { waitUntil: "networkidle" });
  const nameB = await pageB.locator('input[name="displayName"]').inputValue();
  record("account B profile distinct", nameB !== displayName, nameB);

  await signOut(pageB);
  await pageB.goto(BASE, { waitUntil: "networkidle" });
  record(
    "logout returns signed-out CTAs",
    (await pageB.locator('[data-cta-label="Get Started"]').count()) > 0,
  );
  await shot(pageB, "16-after-logout");

  // Re-login A
  await signIn(page, ACCOUNT_A);
  record("login again account A", page.url().includes("/dashboard"));

  await browser.close();

  const summary = {
    base: BASE,
    passed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  };
  fs.writeFileSync(path.join(ART, "results.json"), JSON.stringify(summary, null, 2));
  console.log(`\nSummary: ${summary.passed} passed, ${summary.failed} failed`);
  if (summary.failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
