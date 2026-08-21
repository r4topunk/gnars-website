/**
 * WebGL availability probe.
 *
 * Not every visitor gets a GPU. Hardware acceleration switched off in the
 * browser, a sandboxed/headless context, a blocklisted driver, an embedded
 * webview or simply too many live contexts all end the same way:
 * `canvas.getContext("webgl")` returns null and three.js/ogl throw
 * `Error creating WebGL context` out of their constructors. Thrown from a
 * component that sits in the root layout, that single error takes the whole
 * app down to Next.js' "This page couldn't load" screen — which is exactly
 * what users with GPU-disabled Chrome were seeing on every route.
 *
 * So: probe once, cache, and let callers render something else.
 */

let cached: boolean | undefined;

export function hasWebGLSupport(): boolean {
  if (cached !== undefined) return cached;
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ??
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl");

    if (!gl) {
      cached = false;
      return cached;
    }

    // Release the probe context immediately — browsers cap the number of live
    // contexts (~16 in Chrome) and the real scenes need every one of them.
    const loseContext = (gl as WebGLRenderingContext).getExtension("WEBGL_lose_context");
    loseContext?.loseContext();

    cached = true;
    return cached;
  } catch {
    cached = false;
    return cached;
  }
}

/** Test seam: forget the probe result so the next call re-runs it. */
export function resetWebGLSupportCache(): void {
  cached = undefined;
}
