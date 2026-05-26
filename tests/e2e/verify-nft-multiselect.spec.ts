import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import os from "os";

const SCREENSHOTS_DIR = path.join(os.tmpdir(), "verify-nft-multiselect");

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
});

async function screenshot(page: import("@playwright/test").Page, name: string) {
  const p = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: p, fullPage: false });
  return p;
}

test("multi-NFT select in proposal builder", async ({ page }) => {
  // ── 1. Land on /en/propose ────────────────────────────────────────────────
  await page.goto("http://localhost:3000/en/propose", { waitUntil: "networkidle" });
  await screenshot(page, "01-propose-landing");

  // Fill in required title so we can advance
  const titleInput = page.locator('input[name="title"], textarea[name="title"], input[placeholder*="title" i], input[placeholder*="Title" i]').first();
  if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await titleInput.fill("Test multi-select NFT proposal");
  }

  // ── 2. Navigate to the Transactions step ─────────────────────────────────
  // Click "Next" or the Transactions tab to reach the builder
  const nextBtn = page.locator('button:has-text("Next"), button:has-text("Transactions"), [role="tab"]:has-text("Transactions")').first();
  if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await nextBtn.click();
    await page.waitForTimeout(500);
  }
  await screenshot(page, "02-transactions-step");

  // ── 3. Click "Send NFTs" action type card ─────────────────────────────────
  const sendNftsCard = page.locator(
    'button:has-text("Send NFTs"), [role="button"]:has-text("Send NFTs")',
  ).first();
  await expect(sendNftsCard).toBeVisible({ timeout: 10000 });
  await sendNftsCard.click();
  await screenshot(page, "03-send-nfts-clicked");

  // ── 4. Wait for the NFT grid to load ──────────────────────────────────────
  // Grid items are <button> elements inside the scroll area
  const firstNft = page.locator('.aspect-square button, button[aria-pressed]').first();
  await expect(firstNft).toBeVisible({ timeout: 20000 });
  await screenshot(page, "04-nft-grid-loaded");

  // ── 5. Select first NFT ───────────────────────────────────────────────────
  const nftButtons = page.locator('button[aria-pressed]');
  const count = await nftButtons.count();
  console.log(`NFT buttons found: ${count}`);
  expect(count).toBeGreaterThan(0);

  await nftButtons.nth(0).click();
  await page.waitForTimeout(300);
  await screenshot(page, "05-first-nft-selected");

  // Verify aria-pressed=true on first
  const firstPressed = await nftButtons.nth(0).getAttribute("aria-pressed");
  expect(firstPressed).toBe("true");

  // ── 6. Select second NFT ──────────────────────────────────────────────────
  await nftButtons.nth(1).click();
  await page.waitForTimeout(300);
  await screenshot(page, "06-second-nft-selected");

  // ── 7. Verify "2 selected" counter ────────────────────────────────────────
  const selectedCount = page.locator('text=/2 selected/i, text=/selected/i').first();
  await expect(selectedCount).toBeVisible({ timeout: 3000 });
  const countText = await selectedCount.textContent();
  console.log(`Counter text: "${countText}"`);

  // ── 8. Verify multi-select hint ───────────────────────────────────────────
  const hint = page.locator('text=/separate transaction/i').first();
  await expect(hint).toBeVisible({ timeout: 3000 });
  await screenshot(page, "07-counter-and-hint");

  // ── 9. Verify "Add 2 transactions" button ─────────────────────────────────
  const submitBtn = page.locator('button:has-text("Add 2 transactions"), button:has-text("Add")').first();
  await expect(submitBtn).toBeVisible({ timeout: 3000 });
  const btnText = await submitBtn.textContent();
  console.log(`Submit button text: "${btnText}"`);
  expect(btnText).toMatch(/Add 2/i);
  await screenshot(page, "08-add-2-transactions-button");

  // ── 10. Also fill the "To" address field to pass validation ───────────────
  const toInput = page.locator('input[id="to"], input[placeholder*="0x"]').first();
  if (await toInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await toInput.fill("0x1111111111111111111111111111111111111111");
  }

  // ── 11. Click "Add 2 transactions" ────────────────────────────────────────
  await submitBtn.click();
  await page.waitForTimeout(800);
  await screenshot(page, "09-after-submit");

  // ── 12. Verify transaction list shows 2 send-nfts entries ─────────────────
  const nftTxEntries = page.locator('text=/Send NFTs/i');
  const nftTxCount = await nftTxEntries.count();
  console.log(`Send-NFTs entries in list: ${nftTxCount}`);
  await screenshot(page, "10-transaction-list");
  expect(nftTxCount).toBeGreaterThanOrEqual(2);

  // ── PROBE: Select 3 NFTs ──────────────────────────────────────────────────
  // Go back and try with 3 selections to ensure label updates correctly
  const addMoreBtn = page.locator('button:has-text("Send NFTs"), [role="button"]:has-text("Send NFTs")').first();
  if (await addMoreBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await addMoreBtn.click();
    await page.waitForTimeout(500);

    const nftBtns3 = page.locator('button[aria-pressed]');
    if ((await nftBtns3.count()) >= 3) {
      await nftBtns3.nth(2).click();
      await nftBtns3.nth(3).click();
      await nftBtns3.nth(4).click();
      await page.waitForTimeout(300);
      const btn3 = page.locator('button:has-text("Add 3 transactions"), button:has-text("Add")').first();
      const text3 = await btn3.textContent().catch(() => "");
      console.log(`3-select button text: "${text3}"`);
      await screenshot(page, "11-probe-3-selected");
    }
  }

  // ── PROBE: Deselect all → button reverts to "Save Transaction" ────────────
  // (handled by clicking same NFT again)
});
