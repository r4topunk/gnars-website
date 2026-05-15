import { expect, test } from "@playwright/test";

const TIMEOUT = 30000;

test.describe("i18n routing", () => {
  test("EN root renders with html lang=en (no prefix)", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: TIMEOUT });
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("PT-BR route renders with html lang=pt-br", async ({ page }) => {
    await page.goto("/pt-br", { waitUntil: "domcontentloaded", timeout: TIMEOUT });
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-br");
  });

  test("EN proposals page exposes hreflang alternates for en + pt-br + x-default", async ({
    page,
  }) => {
    await page.goto("/proposals", { waitUntil: "domcontentloaded", timeout: TIMEOUT });
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
      "href",
      /\/proposals$/,
    );
    await expect(page.locator('link[rel="alternate"][hreflang="pt-br"]')).toHaveAttribute(
      "href",
      /\/pt-br\/proposals$/,
    );
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
      "href",
      /\/proposals$/,
    );
  });

  test("PT-BR proposals page exposes hreflang alternates with reversed canonical", async ({
    page,
  }) => {
    await page.goto("/pt-br/proposals", { waitUntil: "domcontentloaded", timeout: TIMEOUT });
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
      "href",
      /\/proposals$/,
    );
    await expect(page.locator('link[rel="alternate"][hreflang="pt-br"]')).toHaveAttribute(
      "href",
      /\/pt-br\/proposals$/,
    );
  });

  test("PT-BR home page exposes og:locale=pt_BR", async ({ page }) => {
    await page.goto("/pt-br", { waitUntil: "domcontentloaded", timeout: TIMEOUT });
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "pt_BR");
  });

  test("EN home page exposes og:locale=en_US", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: TIMEOUT });
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "en_US");
  });

  test("PT-BR title differs from EN title on proposals page", async ({ page }) => {
    await page.goto("/proposals", { waitUntil: "domcontentloaded", timeout: TIMEOUT });
    const enTitle = await page.title();

    await page.goto("/pt-br/proposals", { waitUntil: "domcontentloaded", timeout: TIMEOUT });
    const ptTitle = await page.title();

    expect(ptTitle).not.toBe(enTitle);
    expect(ptTitle).toMatch(/propostas/i);
  });

  test("robots.txt disallows EN and PT-BR debug/demo/api paths", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.ok()).toBe(true);
    const body = await res.text();
    expect(body).toContain("Disallow: /debug");
    expect(body).toContain("Disallow: /pt-br/debug");
    expect(body).toContain("Disallow: /demo");
    expect(body).toContain("Disallow: /pt-br/demo");
    expect(body).toContain("Disallow: /api");
    expect(body).toContain("Disallow: /pt-br/api");
  });

  test("sitemap.xml emits both locales with xhtml:link alternates", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.ok()).toBe(true);
    const body = await res.text();
    expect(body).toContain("<loc>");
    expect(body).toContain("/pt-br/");
    expect(body).toMatch(/xhtml:link\s+rel="alternate"\s+hreflang="pt-br"/);
    expect(body).toMatch(/xhtml:link\s+rel="alternate"\s+hreflang="en"/);
    expect(body).toMatch(/xhtml:link\s+rel="alternate"\s+hreflang="x-default"/);
  });

  test("LocaleSwitcher toggles locale and persists NEXT_LOCALE cookie", async ({
    page,
    context,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: TIMEOUT });
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    // Open the locale switcher dropdown (aria-label = "Change language" in EN,
    // "Mudar idioma" in PT-BR — match either).
    const trigger = page.getByRole("button", { name: /change language|mudar idioma/i }).first();
    await trigger.waitFor({ state: "visible", timeout: 5000 });
    await trigger.click();

    // Pick Portuguese (BR).
    const ptItem = page.getByRole("menuitem", { name: /português/i }).first();
    await ptItem.click();

    await page.waitForURL(/\/pt-br(\/|$)/, { timeout: TIMEOUT });
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-br");

    const cookies = await context.cookies();
    const localeCookie = cookies.find((c) => c.name === "NEXT_LOCALE");
    expect(localeCookie?.value).toBe("pt-br");
  });
});
