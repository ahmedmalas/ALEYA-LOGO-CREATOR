import { chromium } from 'playwright';
import fs from 'fs';

const out = '/opt/cursor/artifacts/screenshots';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await page.screenshot({ path: `${out}/01-landing.png`, fullPage: true });

await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
await page.screenshot({ path: `${out}/02-login.png`, fullPage: true });
await page.getByLabel('Show password').click();
await page.locator('input[name="password"]').fill('demo-password');
await page.screenshot({ path: `${out}/03-login-password-visible.png`, fullPage: true });

await page.goto('http://localhost:3000/signup', { waitUntil: 'networkidle' });
await page.screenshot({ path: `${out}/04-signup.png`, fullPage: true });

await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
await page.fill('input[name="email"]', 'aleya.logo.tester@gmail.com');
await page.fill('input[name="password"]', 'LogoCreatorTest123!');
await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForURL('**/dashboard', { timeout: 15000 });
await page.screenshot({ path: `${out}/05-dashboard.png`, fullPage: true });

await page.goto('http://localhost:3000/projects/31e8e6dc-fd10-4ae3-a005-7276b8714179', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.screenshot({ path: `${out}/06-project-concepts.png`, fullPage: true });

await page.goto('http://localhost:3000/brand-kits/2e1108df-306f-4c88-b75b-56f669eee988', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.screenshot({ path: `${out}/07-brand-kit.png`, fullPage: true });

await browser.close();
console.log('screenshots written', fs.readdirSync(out));
