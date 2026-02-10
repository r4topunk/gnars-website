import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium, type BrowserContextOptions } from "@playwright/test";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3010;
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function waitForServer(url: string, timeoutMs = 60_000) {
  const start = Date.now();
  while (true) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.ok || (res.status >= 300 && res.status < 400)) return;
    } catch {
      // ignore until ready
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timed out waiting for server: ${url}`);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}

async function fillWizardToPreview(page: import("@playwright/test").Page) {
  await page.goto(`${BASE_URL}/propose`, { waitUntil: "networkidle" });

  await page.locator("#title").fill("Playwright test proposal");
  await page.locator("#description").fill("Testing proposal threshold notice in preview.");

  await page.getByRole("button", { name: "Next: Add Transactions" }).click();

  // Add a simple Custom Transaction (no onchain call will be executed in this test)
  await page.locator('h3:has-text("Custom Transaction")').first().click();
  await page.getByText("Configure transaction details").waitFor({ timeout: 30_000 });

  // Use placeholders to avoid collisions with hidden tab panels that reuse ids.
  await page
    .locator('input[placeholder="0x..."]')
    .fill("0x0000000000000000000000000000000000000000");
  await page
    .locator('textarea[placeholder="0x... - Transaction calldata"]')
    .fill("0x");
  await page
    .locator('textarea[placeholder="Clearly describe what this transaction does..."]')
    .fill("No-op custom transaction for UI testing.");
  await page.getByRole("button", { name: "Save Transaction" }).click();

  // Ensure we are back to the transactions list (ActionForms closed)
  await page.getByRole("button", { name: "Save Transaction" }).waitFor({ state: "hidden" });

  const nextBtn = page.getByRole("button", { name: "Next: Preview & Submit" });
  await nextBtn.waitFor({ timeout: 30_000 });
  await nextBtn.click();

  // Ensure the new notice is present
  await page.getByText("Minimum to create a proposal:").waitFor({ timeout: 30_000 });
}

async function screenshot(colorScheme: "light" | "dark", outPath: string) {
  const contextOpts: BrowserContextOptions = {
    colorScheme,
    viewport: { width: 1280, height: 800 },
  };

  const browser = await chromium.launch();
  const context = await browser.newContext(contextOpts);
  const page = await context.newPage();

  try {
    await fillWizardToPreview(page);
    await page.waitForTimeout(300); // let fonts/theme settle
    await page.screenshot({ path: outPath, fullPage: true });
  } finally {
    await context.close();
    await browser.close();
  }
}

async function main() {
  const outDir = path.join(process.cwd(), "outputs", "playwright");
  await mkdir(outDir, { recursive: true });

  const server = spawn("pnpm", ["dev"], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: "pipe",
  });

  let serverLogs = "";
  server.stdout.on("data", (d) => (serverLogs += d.toString()));
  server.stderr.on("data", (d) => (serverLogs += d.toString()));

  try {
    await waitForServer(`${BASE_URL}/propose`, 90_000);

    const lightPath = path.join(outDir, "propose-preview-light.png");
    const darkPath = path.join(outDir, "propose-preview-dark.png");

    await screenshot("light", lightPath);
    await screenshot("dark", darkPath);
  } catch (err) {
    await writeFile(path.join(outDir, "server.log"), serverLogs);
    throw err;
  } finally {
    server.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
