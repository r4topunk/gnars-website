import { afterEach, describe, expect, it, vi } from "vitest";
import { hasWebGLSupport, resetWebGLSupportCache } from "./webgl";

/**
 * The suite runs under the node environment, so there is no DOM to probe.
 * Each case stands up the two globals the probe touches — `window` for the
 * SSR guard and `document.createElement` for the canvas — which is enough to
 * drive every branch, including the one that matters: a browser that hands
 * back `null` instead of a context.
 */
function stubDom(getContext: (id: string) => unknown) {
  vi.stubGlobal("window", {});
  vi.stubGlobal("document", {
    createElement: () => ({ getContext }),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  resetWebGLSupportCache();
});

describe("hasWebGLSupport", () => {
  it("is false on the server, where there is no canvas to probe", () => {
    expect(hasWebGLSupport()).toBe(false);
  });

  it("is false when the browser refuses every context (GPU disabled/sandboxed)", () => {
    stubDom(() => null);
    expect(hasWebGLSupport()).toBe(false);
  });

  it("is false when getContext throws instead of returning null", () => {
    stubDom(() => {
      throw new Error("context creation blocked");
    });
    expect(hasWebGLSupport()).toBe(false);
  });

  it("is true on webgl2", () => {
    stubDom((id) => (id === "webgl2" ? { getExtension: () => null } : null));
    expect(hasWebGLSupport()).toBe(true);
  });

  it("falls back to webgl1 when webgl2 is unavailable", () => {
    stubDom((id) => (id === "webgl" ? { getExtension: () => null } : null));
    expect(hasWebGLSupport()).toBe(true);
  });

  it("releases the probe context so it does not eat one of the browser's slots", () => {
    const loseContext = vi.fn();
    stubDom((id) => (id === "webgl2" ? { getExtension: () => ({ loseContext }) } : null));
    hasWebGLSupport();
    expect(loseContext).toHaveBeenCalledOnce();
  });

  it("probes once and caches the answer", () => {
    const getContext = vi.fn(() => ({ getExtension: () => null }));
    stubDom(getContext);
    expect(hasWebGLSupport()).toBe(true);
    expect(hasWebGLSupport()).toBe(true);
    expect(getContext).toHaveBeenCalledOnce();
  });
});
