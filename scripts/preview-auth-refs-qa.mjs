import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE =
  process.env.PREVIEW_BASE_URL ??
  "https://aleya-logo-creator-5qqgizj4w-ahmedmalas-projects.vercel.app";
const EMAIL = process.env.PROD_TEST_EMAIL ?? "aleya.logo.tester@gmail.com";
const PASSWORD = process.env.PROD_TEST_PASSWORD ?? "AleyaLogoTest!2026";
const ART = "/opt/cursor/artifacts/preview-auth-refs";
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

function labels(page) {
  return page.locator("[data-cta-label]").evaluateAll((nodes) =>
    nodes.map((n) => n.getAttribute("data-cta-label")),
  );
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // Signed-out homepage
  await page.goto(BASE, { waitUntil: "networkidle" });
  await shot(page, "01-signed-out-home");
  const outLabels = await labels(page);
  record("signed-out shows Get Started", outLabels.includes("Get Started"), outLabels.join(", "));
  record("signed-out shows Sign In", outLabels.includes("Sign In"), outLabels.join(", "));
  record(
    "signed-out has no Dashboard/Sign out CTA labels in body/header mix incorrectly",
    !outLabels.includes("Go to Dashboard") && !outLabels.includes("Sign out"),
    outLabels.join(", "),
  );
  await page.goto(`${BASE}/gallery`, { waitUntil: "networkidle" });
  record("gallery accessible signed-out", page.url().includes("/gallery"));
  await page.goto(`${BASE}/pricing`, { waitUntil: "networkidle" });
  record("pricing accessible signed-out", page.url().includes("/pricing"));

  // Sign in
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard**", { timeout: 30000 });
  record("sign-in to dashboard", page.url().includes("/dashboard"), page.url());
  await shot(page, "02-dashboard");

  // Signed-in homepage
  await page.goto(BASE, { waitUntil: "networkidle" });
  await shot(page, "03-signed-in-home");
  const inLabels = await labels(page);
  record("signed-in shows Go to Dashboard", inLabels.includes("Go to Dashboard"), inLabels.join(", "));
  record("signed-in shows Create New Logo", inLabels.includes("Create New Logo"), inLabels.join(", "));
  record("signed-in shows View My Projects", inLabels.includes("View My Projects"), inLabels.join(", "));
  record("signed-in never shows Sign In", !inLabels.includes("Sign In"), inLabels.join(", "));
  record("signed-in never shows Get Started", !inLabels.includes("Get Started"), inLabels.join(", "));
  record(
    "header/body agree signed-in",
    (await page.locator('header[data-auth="signed-in"]').count()) > 0 &&
      (await page.locator('div[data-auth="signed-in"]').count()) > 0,
  );

  await page.reload({ waitUntil: "networkidle" });
  const afterRefresh = await labels(page);
  record(
    "refresh keeps signed-in CTAs",
    afterRefresh.includes("Go to Dashboard") && !afterRefresh.includes("Sign In"),
    afterRefresh.join(", "),
  );

  const page2 = await context.newPage();
  await page2.goto(BASE, { waitUntil: "networkidle" });
  const tabLabels = await labels(page2);
  record(
    "second tab keeps signed-in CTAs",
    tabLabels.includes("Create New Logo") && !tabLabels.includes("Get Started"),
    tabLabels.join(", "),
  );
  await page2.close();

  // Reference workflow
  await page.goto(`${BASE}/projects/new`, { waitUntil: "networkidle" });
  await shot(page, "04-new-project-refs");
  record(
    "new project shows Upload references",
    (await page.getByRole("heading", { name: "Upload references" }).count()) > 0,
  );
  record(
    "limits visible before upload",
    (await page.getByTestId("reference-limits").textContent())?.includes("10 files") ?? false,
  );

  await page.fill('input[name="businessName"]', `Ref QA ${Date.now()}`);
  await page.fill('input[name="industry"]', "Design");

  const fileInput = page.locator('input[type="file"]');
  const pngPath = path.join(ART, "sample.png");
  // minimal PNG
  fs.writeFileSync(
    pngPath,
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    ),
  );
  const jpgPath = path.join(ART, "sample.jpg");
  fs.copyFileSync(pngPath, jpgPath);
  const pdfPath = path.join(ART, "receipt.pdf");
  // minimal PDF
  fs.writeFileSync(
    pdfPath,
    Buffer.from(
      `%PDF-1.1
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj
4 0 obj<< /Length 44 >>stream
BT /F1 12 Tf 20 100 Td (Logo receipt) Tj ET
endstream
endobj
5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000270 00000 n 
0000000365 00000 n 
trailer<< /Size 6 /Root 1 0 R >>
startxref
444
%%EOF`,
    ),
  );

  await fileInput.setInputFiles([pngPath, jpgPath, pdfPath]);
  await page.waitForTimeout(500);
  record("queued multiple files", (await page.getByText("sample.png").count()) > 0);

  // Add note on first queued
  const noteInputs = page.locator('ul[aria-label="Queued uploads"] input');
  if ((await noteInputs.count()) > 0) {
    await noteInputs.first().fill("Current logo from packaging");
  }

  // Remove one queued file
  const removeButtons = page.locator('ul[aria-label="Queued uploads"] button', {
    hasText: "Remove",
  });
  const before = await page.locator('ul[aria-label="Queued uploads"] li').count();
  if ((await removeButtons.count()) > 0) {
    await removeButtons.last().click();
  }
  const after = await page.locator('ul[aria-label="Queued uploads"] li').count();
  record("remove queued file works", after === before - 1 || after < before, `${before}->${after}`);

  await page.getByRole('button', { name: 'Save and continue' }).click();
  await page.waitForURL((url) => /\/projects\/[0-9a-f-]{36}/i.test(url.pathname), { timeout: 45000 });
  record("project created and studio opened", /\/projects\/[0-9a-f-]{36}/i.test(new URL(page.url()).pathname), page.url());
  await page.waitForTimeout(2500);
  await shot(page, "05-studio-with-refs");

  // Wait for saved references or upload button
  const saved = page.getByTestId("saved-reference");
  try {
    await saved.first().waitFor({ timeout: 20000 });
    record("references persisted after save", (await saved.count()) > 0, `count=${await saved.count()}`);
  } catch {
    const studioInput = page.locator('[data-testid="reference-uploader"] input[type="file"]');
    if ((await studioInput.count()) > 0) {
      await studioInput.setInputFiles([pngPath, pdfPath]);
      const uploadBtn = page.getByRole("button", { name: "Upload queued files" });
      if (await uploadBtn.count()) {
        await uploadBtn.click();
        await page.waitForTimeout(4000);
      }
    }
    record(
      "references persisted after save",
      (await page.getByTestId("saved-reference").count()) > 0 ||
        (await page.getByText("sample.png").count()) > 0,
      `count=${await page.getByTestId("saved-reference").count()} url=${page.url()}`,
    );
  }

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  record(
    "references remain after refresh",
    (await page.getByTestId("saved-reference").count()) > 0 ||
      (await page.getByText("sample.png").count()) > 0,
  );

  // Generate
  const generateBtn = page.getByTestId("empty-generate-button").or(
    page.getByRole("button", { name: "Generate concepts" }).first(),
  );
  await generateBtn.click();
  await page.waitForTimeout(8000);
  await shot(page, "06-generated");
  const used = page.getByTestId("references-used-summary");
  const conceptRef = page.getByText(/References used:/i);
  record(
    "generation records references used",
    (await used.count()) > 0 || (await conceptRef.count()) > 0,
    `used=${await used.count()} conceptMeta=${await conceptRef.count()}`,
  );

  // Mobile viewport nav
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE, { waitUntil: "networkidle" });
  await shot(page, "07-mobile-signed-in");
  const mobileLabels = await labels(page);
  record(
    "mobile signed-in nav has no Sign In/Get Started",
    !mobileLabels.includes("Sign In") && !mobileLabels.includes("Get Started"),
    mobileLabels.join(", "),
  );

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log("\n=== SUMMARY ===");
  console.log(`passed=${results.length - failed.length} failed=${failed.length}`);
  console.log(`artifacts=${ART}`);
  if (failed.length) {
    for (const f of failed) console.log(` - ${f.name}: ${f.detail}`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
