"use client";

import { HOMEPAGE_DESCRIPTIONS } from "@/lib/config";
import TextType from "@/components/TextType";

export function AnimatedDescription() {
  return (
    <div className="relative min-h-[2rem] md:min-h-[2.5rem]">
      <TextType
        text={[...HOMEPAGE_DESCRIPTIONS]}
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
