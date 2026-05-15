"use client";

import { useTranslations } from "next-intl";
import TextType from "@/components/TextType";

export function AnimatedDescription() {
  const t = useTranslations("home.hero");
  const descriptions = t.raw("descriptions") as readonly string[];
  return (
    <div className="relative min-h-[2rem] md:min-h-[2.5rem]">
      <TextType
        text={[...descriptions]}
        className="text-lg text-muted-foreground md:text-xl"
        typingSpeed={75}
        deletingSpeed={50}
        pauseDuration={1500}
        showCursor={true}
        cursorCharacter="_"
        cursorBlinkDuration={0.5}
        loop={true}
      />
    </div>
  );
}
