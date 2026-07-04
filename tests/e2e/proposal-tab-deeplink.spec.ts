import { expect, test } from "@playwright/test";

/**
 * Regression tests for ?tab= deep links on the proposal detail page
 * (e.g. the "View all updates" link on nogglesrails pages points to
 * /proposals/base/{n}?tab=propdates).
 *
 * The votes/propdates tabs are revealed post-mount from fetched data, so the
 * deep link is honored asynchronously — assertions wait for the trigger to
 * appear before checking it is active.
 */

interface EnrichedEntry {
  proposal: { proposalNumber: number };
  propdates: unknown[];
}

async function findProposalWithPropdates(
  request: Parameters<Parameters<typeof test>[2]>[0]["request"],
): Promise<number | null> {
  const res = await request.get("/api/propdates/enriched");
  if (!res.ok()) return null;
  const entries = (await res.json()) as EnrichedEntry[];
  const entry = entries.find((e) => (e.propdates?.length ?? 0) > 0);
  return entry ? entry.proposal.proposalNumber : null;
}

// Serial: three parallel first-loads of the same heavy route stall the dev
// server past the goto timeout; these are fast (<5s each) once compiled.
test.describe.configure({ mode: "serial" });

test.describe("Proposal tab deep links", () => {
  test("?tab=propdates activates the Propdates tab", async ({ page, request }) => {
    const proposalNumber = await findProposalWithPropdates(request);
    test.skip(proposalNumber === null, "No proposal with propdates in this environment");

    await page.goto(`/proposals/base/${proposalNumber}?tab=propdates`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    const propdatesTab = page.getByRole("tab", { name: /propdates/i });
    await expect(propdatesTab).toBeVisible({ timeout: 30000 });
    await expect(propdatesTab).toHaveAttribute("data-state", "active", { timeout: 15000 });
    await expect(page.getByRole("tab", { name: /details/i })).toHaveAttribute(
      "data-state",
      "inactive",
    );
  });

  test("without ?tab the Details tab stays default", async ({ page, request }) => {
    const proposalNumber = await findProposalWithPropdates(request);
    test.skip(proposalNumber === null, "No proposal with propdates in this environment");

    await page.goto(`/proposals/base/${proposalNumber}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Wait for the tab list to be revealed post-mount, then assert default.
    const detailsTab = page.getByRole("tab", { name: /details/i });
    await expect(detailsTab).toBeVisible({ timeout: 30000 });
    await expect(detailsTab).toHaveAttribute("data-state", "active");
  });

  test("unknown ?tab value is ignored and falls back to Details", async ({ page, request }) => {
    const proposalNumber = await findProposalWithPropdates(request);
    test.skip(proposalNumber === null, "No proposal with propdates in this environment");

    await page.goto(`/proposals/base/${proposalNumber}?tab=bogus`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    const detailsTab = page.getByRole("tab", { name: /details/i });
    await expect(detailsTab).toBeVisible({ timeout: 30000 });
    await expect(detailsTab).toHaveAttribute("data-state", "active");
  });
});
