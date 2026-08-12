"use client";

import { useTranslations } from "next-intl";
import TextType from "@/components/TextType";

/**
 * The rotating half of the hero lead. Shares its copy with the current
 * homepage's `home.hero.descriptions`, so the taglines stay in one list.
 */
export function HeroTagline() {
  const t = useTranslations("home.hero");
  const descriptions = t.raw("descriptions") as readonly string[];
  const longest = descriptions.reduce((a, b) => (b.length > a.length ? b : a), "");

  return (
    // The tagline types and deletes itself, so its box would grow and shrink and
    // shove the buttons and stats down the page on every rotation. A hidden copy
    // of the longest line shares the single grid cell and holds the height open.
    // Stacking rather than a fixed min-height means the reservation is exactly
    // right at any width — one line on desktop, two once the copy wraps — with
    // no dead space at either end.
    <span className="grid">
      <span aria-hidden className="invisible col-start-1 row-start-1">
        {longest}
      </span>
      <TextType
        text={[...descriptions]}
        as="span"
        className="col-start-1 row-start-1 font-medium text-foreground"
        typingSpeed={75}
        deletingSpeed={50}
        pauseDuration={1800}
        showCursor
        cursorCharacter="_"
        cursorBlinkDuration={0.5}
        loop
      />
    </span>
  );
}
