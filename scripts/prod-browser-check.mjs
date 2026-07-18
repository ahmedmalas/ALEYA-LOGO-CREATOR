import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "fs";

const BASE = process.env.PROD_URL || "https://aleya-logo-creator.vercel.app";
const EMAIL = "aleya.logo.tester@gmail.com";
const PASSWORD = "LogoCreatorTest123!";
const outDir = "/opt/cursor/artifacts/prod-checks";
mkdirSync(outDir, { recursive: true });

const results = [];
const note = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await context.newPage();

try {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  note("landing_loads", await page.getByText("ALEYA").first().isVisible());
  await page.screenshot({ path: `${outDir}/01-landing.png`, fullPage: true });

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  const showBtn = page.getByLabel("Show password");
  note("password_toggle_visible", await showBtn.isVisible());
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await showBtn.click();
  note("password_toggle_works", (await page.locator('input[name="password"]').getAttribute("type")) === "text");
  await page.screenshot({ path: `${outDir}/02-login.png`, fullPage: true });
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard", { timeout: 30000 });
  note("authentication", page.url().includes("/dashboard"));
  await page.screenshot({ path: `${outDir}/03-dashboard.png`, fullPage: true });

  await page.goto(`${BASE}/projects/new`, { waitUntil: "networkidle" });
  await page.fill('input[name="businessName"]', "Prod Check Studio");
  await page.fill('input[name="tagline"]', "Production ready marks");
  await page.fill('input[name="industry"]', "Branding");
  await page.fill('input[name="preferredColors"]', "#1F4D45, #B08A4F");
  await page.fill('textarea[name="iconIdeas"]', "geometric monogram");
  await page.getByRole("button", { name: "Save project" }).click();
  await page.waitForURL("**/projects/**", { timeout: 30000 });
  const projectUrl = page.url();
  const projectId = projectUrl.split("/projects/")[1]?.split("?")[0];
  note("project_creation", Boolean(projectId), projectId);

  await page.getByRole("button", { name: "Generate concepts" }).click();
  await page.waitForTimeout(2000);
  // Wait for concepts or error
  await page.waitForFunction(
    () => {
      const text = document.body.innerText;
      return (
        text.includes("Download") ||
        text.includes("Concepts generated") ||
        text.includes("Generation failed") ||
        text.includes("rate limit")
      );
    },
    { timeout: 120000 },
  );
  const bodyAfterGen = await page.innerText("body");
  const genOk =
    bodyAfterGen.includes("Download") ||
    bodyAfterGen.includes("Concepts generated") ||
    bodyAfterGen.includes("Select final");
  note("logo_generation", genOk, bodyAfterGen.includes("failed") ? "saw failure text" : "concepts present");
  await page.screenshot({ path: `${outDir}/04-generated.png`, fullPage: true });

  if (genOk) {
    await page.getByRole("button", { name: "Regenerate" }).click();
    await page.waitForTimeout(1500);
    await page.waitForFunction(
      () => document.body.innerText.includes("Download") || document.body.innerText.includes("failed"),
      { timeout: 120000 },
    );
    note("regenerate", (await page.innerText("body")).includes("Download"));

    const refineBox = page.locator("textarea").last();
    await refineBox.fill("Sharpen the monogram and reduce detail");
    await page.getByRole("button", { name: "Refine concept" }).click();
    await page.waitForTimeout(1500);
    await page.waitForFunction(
      () =>
        document.body.innerText.includes("Refined concept") ||
        document.body.innerText.includes("refined") ||
        document.body.innerText.includes("failed") ||
        document.body.innerText.includes("Refine concept"),
      { timeout: 120000 },
    );
    note("refine", !(await page.innerText("body")).toLowerCase().includes("refine failed"));

    // Export download for first download button
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 60000 }),
      page.getByRole("button", { name: "Download" }).first().click(),
    ]);
    const downloadPath = `${outDir}/${download.suggestedFilename()}`;
    await download.saveAs(downloadPath);
    note("png_svg_export_zip", Boolean(download.suggestedFilename().endsWith(".zip")), download.suggestedFilename());

    await page.getByRole("button", { name: "Select final" }).first().click();
    await page.waitForURL("**/brand-kits/**", { timeout: 60000 });
    const brandKitUrl = page.url();
    const brandKitId = brandKitUrl.split("/brand-kits/")[1]?.split("?")[0];
    note("brand_kit_creation", Boolean(brandKitId), brandKitId);
    await page.screenshot({ path: `${outDir}/05-brand-kit.png`, fullPage: true });

    await page.goto(`${BASE}/brand-kits`, { waitUntil: "networkidle" });
    await page.getByText("Prod Check Studio").first().click();
    await page.waitForURL("**/brand-kits/**", { timeout: 30000 });
    note("brand_kit_reopen", page.url().includes("/brand-kits/"));
    await page.screenshot({ path: `${outDir}/06-brand-kit-reopen.png`, fullPage: true });
  }

  // Sign out / sign in persistence
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("**/login", { timeout: 30000 });
  note("sign_out", page.url().includes("/login"));
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard", { timeout: 30000 });
  const dashText = await page.innerText("body");
  note("sign_in_persistence", dashText.includes("Prod Check Studio") || dashText.includes("Northwind"));
  await page.screenshot({ path: `${outDir}/07-after-relogin.png`, fullPage: true });
} catch (error) {
  note("browser_flow_exception", false, error instanceof Error ? error.message : String(error));
  await page.screenshot({ path: `${outDir}/error.png`, fullPage: true }).catch(() => {});
}

await browser.close();

// RLS isolation against production Supabase
const url = "https://wrmwthsfbpkjsxsqigpw.supabase.co";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const login = JSON.parse(await (await import("fs")).promises.readFile("/tmp/login.json", "utf8"));
const userClient = createClient(url, anon, {
  global: { headers: { Authorization: `Bearer ${login.access_token}` } },
  auth: { persistSession: false },
});
const anonClient = createClient(url, anon, { auth: { persistSession: false } });
const { data: mine } = await userClient.from("logo_projects").select("id").limit(1);
const targetId = mine?.[0]?.id;
if (targetId) {
  const { data: leaked } = await anonClient.from("logo_projects").select("id").eq("id", targetId);
  note("rls_isolation", !leaked || leaked.length === 0, `project=${targetId}`);
} else {
  note("rls_isolation", false, "no owned project found for isolation check");
}

const health = await (await fetch(`${BASE}/api/health`)).json();
note("health_provider_svg", health?.provider?.activeProvider === "svg", JSON.stringify(health.provider));

const summary = {
  base: BASE,
  passed: results.filter((r) => r.ok).length,
  failed: results.filter((r) => !r.ok).length,
  results,
};
writeFileSync(`${outDir}/summary.json`, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
if (summary.failed > 0) process.exit(1);
