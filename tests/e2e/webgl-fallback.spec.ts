import { expect, test } from "@playwright/test";

/**
 * Regression guard for the "This page couldn't load" reports.
 *
 * Users browsing with hardware acceleration off get `null` back from every
 * `getContext("webgl")` call. three.js turns that into a thrown
 * `Error creating WebGL context`, and because the MiniTV renders from the root
 * layout, that one throw replaced *every* page with Next.js' global error
 * screen. The scenes are decorative: no context should cost the visitor the
 * television, not the site.
 */
function disableWebGL(page: import("@playwright/test").Page) {
  return page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (id: string, ...rest: unknown[]) {
      if (id === "webgl" || id === "webgl2" || id === "experimental-webgl") return null;
      // @ts-expect-error - passthrough to the untouched 2d/bitmaprenderer contexts
      return original.call(this, id, ...rest);
    };
  });
}

// Next.js renders a typographic apostrophe in its error screen.
const ERROR_SCREEN = /This page couldn.t load/;

test.describe("no WebGL available", () => {
  test("homepage still renders", async ({ page }) => {
    await disableWebGL(page);

    const pageErrors: string[] = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));

    await page.goto("/", { waitUntil: "domcontentloaded" });
    // The MiniTV and the TV hero both mount after hydration; give them the time
    // they would have had to throw.
    await page.waitForTimeout(8000);

    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(ERROR_SCREEN);
    expect(pageErrors.join("\n")).not.toContain("WebGL");
    // Real content, not an empty shell.
    await expect(page.getByRole("navigation").first()).toBeVisible();
  });

  test("noggles rails page still renders without its globe", async ({ page }) => {
    await disableWebGL(page);

    await page.goto("/nogglesrails", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(6000);

    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(ERROR_SCREEN);
  });
});
