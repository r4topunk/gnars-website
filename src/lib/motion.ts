// The site's easing tokens. Two curves, defined once.
//
// The built-in CSS `ease-out` / `ease-in-out` are too weak to read as intentional
// motion, so UI animation uses these instead. Anything that needs a curve imports
// from here rather than inlining a cubic-bezier — a parallel easing system is how
// a codebase ends up with six slightly different "ease outs".
//
// Note for Tailwind call sites: an arbitrary value (`ease-[cubic-bezier(...)]`)
// must appear as a literal in the source for the scanner to emit it, so class
// strings repeat the numbers and point back here in a comment. Everything that
// builds CSS at runtime (inline styles, <style> blocks) imports the const.

/** Entering, exiting, and the default. */
export const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
/** Moving / morphing something already on screen. */
export const EASE_IN_OUT = "cubic-bezier(0.77, 0, 0.175, 1)";

/** Same curve as EASE_OUT, in the array form Motion wants. */
export const EASE_OUT_ARRAY: [number, number, number, number] = [0.23, 1, 0.32, 1];
