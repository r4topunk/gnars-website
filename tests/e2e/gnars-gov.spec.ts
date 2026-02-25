import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Proposals List Page
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Proposals List Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/proposals', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('h1', { timeout: 10000 });
  });

  test('shows page heading and description', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /proposals/i })).toBeVisible();
    await expect(page.getByText(/community funds/i)).toBeVisible();
  });

  test('shows search input', async ({ page }) => {
    await expect(page.getByPlaceholder('Search proposals...')).toBeVisible();
  });

  test('shows status filter button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /filter status/i })).toBeVisible();
  });

  test('renders proposal cards or empty state', async ({ page }) => {
    // Wait for either proposal cards or the empty-state message
    const cards = page.locator('a[href*="/proposals/"]');
    const emptyState = page.getByText(/no proposals match/i);

    await expect(cards.first().or(emptyState)).toBeVisible({ timeout: 20000 });
  });

  test('proposal cards display essential info', async ({ page }) => {
    const cards = page.locator('a[href*="/proposals/"]');
    const count = await cards.count();

    if (count === 0) {
      test.skip(true, 'No proposals rendered — skipping card detail assertions');
    }

    const firstCard = cards.first();
    // Prop number pattern: "Prop #N"
    await expect(firstCard.getByText(/prop #\d+/i)).toBeVisible();
    // Requested section
    await expect(firstCard.getByText(/requested/i)).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Status Filter
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Proposals Status Filter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/proposals', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('h1', { timeout: 10000 });
  });

  test('filter popover opens with status options', async ({ page }) => {
    const filterBtn = page.getByRole('button', { name: /filter status/i });
    await filterBtn.click();

    // Popover appears with action buttons
    await expect(page.getByRole('button', { name: /default/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /^all$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /none/i })).toBeVisible();
  });

  test('"None" hides all proposals', async ({ page }) => {
    // Wait for at least one card before interacting
    const cards = page.locator('a[href*="/proposals/"]');
    const initialCount = await cards.count();

    if (initialCount === 0) {
      test.skip(true, 'No proposals to filter');
    }

    const filterBtn = page.getByRole('button', { name: /filter status/i });
    await filterBtn.click();
    await page.getByRole('button', { name: /none/i }).click();
    // Close popover
    await page.keyboard.press('Escape');

    await expect(page.getByText(/no proposals match/i)).toBeVisible({ timeout: 5000 });
  });

  test('"Default" restores visible proposals after clearing', async ({ page }) => {
    const cards = page.locator('a[href*="/proposals/"]');
    const initialCount = await cards.count();

    if (initialCount === 0) {
      test.skip(true, 'No proposals to filter');
    }

    const filterBtn = page.getByRole('button', { name: /filter status/i });

    // First clear all
    await filterBtn.click();
    await page.getByRole('button', { name: /none/i }).click();

    // Then restore default
    await page.getByRole('button', { name: /default/i }).click();
    await page.keyboard.press('Escape');

    // Cards should reappear
    await expect(cards.first()).toBeVisible({ timeout: 5000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Search
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Proposals Search', () => {
  test('search input accepts text without crashing', async ({ page }) => {
    await page.goto('/proposals', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('h1', { timeout: 10000 });

    const searchInput = page.getByPlaceholder('Search proposals...');
    await searchInput.fill('skateboard');

    // Page should not crash — heading still visible
    await expect(page.getByRole('heading', { name: /proposals/i })).toBeVisible();
  });

  test('clearing search restores full list', async ({ page }) => {
    await page.goto('/proposals', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('h1', { timeout: 10000 });

    const cards = page.locator('a[href*="/proposals/"]');
    const initialCount = await cards.count();

    if (initialCount === 0) {
      test.skip(true, 'No proposals to test search restore');
    }

    const searchInput = page.getByPlaceholder('Search proposals...');
    await searchInput.fill('zzzzzz_no_match_expected');
    await page.waitForTimeout(500); // debounce

    await searchInput.clear();
    await page.waitForTimeout(500);

    await expect(cards.first()).toBeVisible({ timeout: 5000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Proposal Card Navigation
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Proposal Card Navigation', () => {
  test('clicking a card navigates to the proposal detail page', async ({ page }) => {
    await page.goto('/proposals', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('h1', { timeout: 10000 });

    const cards = page.locator('a[href*="/proposals/"]');
    const count = await cards.count();

    test.skip(count === 0, 'No proposal cards to navigate from');

    const href = await cards.first().getAttribute('href');
    await cards.first().click();

    await page.waitForURL(/\/proposals\/\d+$/, { timeout: 20000 });
    expect(page.url()).toContain('/proposals/');

    // Expect the main content to render
    await expect(page.locator('main, [role="main"], h1')).toBeVisible({ timeout: 20000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Proposal Detail Page
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Proposal Detail Page', () => {
  test('loads proposal #1 structure (smoke)', async ({ page }) => {
    await page.goto('/proposals/1', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await expect(page).toHaveURL(/\/proposals\/1$/);
    await expect(page.locator('main')).toBeVisible();
  });

  test('shows vote metrics cards for a loaded proposal', async ({ page }) => {
    await page.goto('/proposals/1', { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Wait for either proposal content or not-found page
    const proposalContent = page.getByText(/proposal \d+/i);
    const notFound = page.getByRole('heading', { name: /not found/i });

    await expect(proposalContent.or(notFound)).toBeVisible({ timeout: 20000 });

    // Only assert metrics if the proposal loaded
    const isNotFound = await notFound.isVisible().catch(() => false);
    if (isNotFound) {
      test.skip(true, 'Proposal #1 not found — skipping metrics assertions');
    }

    // Metric cards: For, Against, Abstain, Threshold
    await expect(page.getByRole('heading', { name: /^for$/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: /^against$/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^abstain$/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /threshold/i })).toBeVisible();
  });

  test('shows proposal header with number and status badge', async ({ page }) => {
    await page.goto('/proposals/1', { waitUntil: 'domcontentloaded', timeout: 60000 });

    const notFound = page.getByRole('heading', { name: /not found/i });
    const isNotFound = await notFound.isVisible({ timeout: 15000 }).catch(() => false);

    if (isNotFound) {
      test.skip(true, 'Proposal #1 not found — skipping header assertions');
    }

    // Header shows "Proposal 1" label
    await expect(page.getByText(/proposal 1/i)).toBeVisible({ timeout: 10000 });
    // "By" proposer line
    await expect(page.getByText(/^by/i)).toBeVisible();
  });

  test('shows "Details" tab with description', async ({ page }) => {
    await page.goto('/proposals/1', { waitUntil: 'domcontentloaded', timeout: 60000 });

    const notFound = page.getByRole('heading', { name: /not found/i });
    const isNotFound = await notFound.isVisible({ timeout: 15000 }).catch(() => false);

    if (isNotFound) {
      test.skip(true, 'Proposal #1 not found — skipping tab assertions');
    }

    // Either a "Details" tab or the standalone description card is shown
    const detailsTab = page.getByRole('tab', { name: /details/i });
    const descriptionSection = page.getByRole('heading', { name: /description/i });

    await expect(detailsTab.or(descriptionSection)).toBeVisible({ timeout: 10000 });
  });

  test('shows "Proposed Transactions" section', async ({ page }) => {
    await page.goto('/proposals/1', { waitUntil: 'domcontentloaded', timeout: 60000 });

    const notFound = page.getByRole('heading', { name: /not found/i });
    const isNotFound = await notFound.isVisible({ timeout: 15000 }).catch(() => false);

    if (isNotFound) {
      test.skip(true, 'Proposal #1 not found — skipping transaction section assertion');
    }

    await expect(
      page.getByRole('heading', { name: /proposed transactions/i })
    ).toBeVisible({ timeout: 10000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Proposal Not Found
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Proposal Not Found', () => {
  test('shows not-found message for an invalid proposal ID', async ({ page }) => {
    await page.goto('/proposals/999999999', { waitUntil: 'domcontentloaded', timeout: 30000 });

    await expect(
      page.getByRole('heading', { name: /not found/i })
    ).toBeVisible({ timeout: 20000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Voting Controls (active proposal guard)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Voting Controls', () => {
  test('voting card is absent on a non-active proposal', async ({ page }) => {
    // Proposal #1 is old — almost certainly not Active
    await page.goto('/proposals/1', { waitUntil: 'domcontentloaded', timeout: 60000 });

    const notFound = page.getByRole('heading', { name: /not found/i });
    const isNotFound = await notFound.isVisible({ timeout: 15000 }).catch(() => false);

    if (isNotFound) {
      test.skip(true, 'Proposal #1 not found');
    }

    // Voting card should not be visible for a resolved/expired proposal
    const votingCard = page.getByRole('heading', { name: /cast your vote/i });
    await expect(votingCard).not.toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Create Proposal Page
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Create Proposal Page', () => {
  test('loads /propose page with heading', async ({ page }) => {
    await page.goto('/propose', { waitUntil: 'domcontentloaded', timeout: 30000 });

    await expect(
      page.getByRole('heading', { name: /create proposal/i })
    ).toBeVisible({ timeout: 10000 });
  });

  test('shows proposal wizard form structure', async ({ page }) => {
    await page.goto('/propose', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('h1', { timeout: 10000 });

    // The description text should be visible
    await expect(page.getByText(/create a new proposal for the gnars dao/i)).toBeVisible();
  });
});
