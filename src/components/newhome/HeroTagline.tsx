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

  return (
    <TextType
      text={[...descriptions]}
      as="span"
      className="font-medium text-neutral-50"
      typingSpeed={75}
      deletingSpeed={50}
      pauseDuration={1800}
      showCursor
      cursorCharacter="_"
      cursorBlinkDuration={0.5}
      loop
    />
  );
}
