"use client";

// Section-level scroll reveal for the preview page.
//
// Scope, on purpose: each section reveals when IT enters the viewport, and the
// only stagger is between that section's header and its body (~50ms). There is no
// page-wide choreography — a page that animates in as one long sequence makes the
// reader wait for the design instead of reading the page. The hero is deliberately
// not wrapped: it is above the fold, and delaying the first sentence is the one
// place where this pattern costs the user something.
//
// Fires once. Re-animating on every scroll-by is an interface fighting its reader.
//
// Mechanics: the section owns the IntersectionObserver and publishes the result as
// `data-reveal`; the items are pure CSS off a group-data variant. That keeps one
// observer per section instead of one per element, and keeps the moving parts in
// the stylesheet where `prefers-reduced-motion` can turn them off.
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

function useRevealed<T extends Element>() {
  const ref = useRef<T | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || revealed) return;
    // No observer (old browser, jsdom): show the content, never hide it.
    if (typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setRevealed(true);
          io.disconnect();
        }
      },
      // A sliver is enough: waiting for a threshold means a tall section only
      // reveals once its middle is on screen, which reads as a late page.
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [revealed]);

  return { ref, revealed };
}

/** A `<section>` that publishes its own first-view as `data-reveal="in"`. */
export function RevealSection({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { ref, revealed } = useRevealed<HTMLElement>();
  return (
    <section
      ref={ref}
      data-reveal={revealed ? "in" : "out"}
      className={cn("group/reveal", className)}
    >
      {children}
    </section>
  );
}

/**
 * One revealed block inside a RevealSection. `delay` is the stagger — 0 for the
 * header, ~50ms for the body it introduces.
 *
 * Reduced motion keeps the fade and drops the movement: the point of the fade is
 * to say "this is new", which survives without travel.
 */
export function RevealItem({
  delay = 0,
  className,
  children,
}: {
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        // ease token: EASE_OUT in src/lib/motion.ts (Tailwind needs the literal).
        "translate-y-3 opacity-0 transition-[opacity,transform] duration-[250ms] ease-[cubic-bezier(0.23,1,0.32,1)]",
        "group-data-[reveal=in]/reveal:translate-y-0 group-data-[reveal=in]/reveal:opacity-100",
        "motion-reduce:translate-y-0 motion-reduce:transition-opacity",
        className,
      )}
    >
      {children}
    </div>
  );
}
