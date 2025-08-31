"use client";

import { useEffect, useRef, useState } from "react";

type CountUpProps = {
  value: number;
  durationMs?: number;
  decimals?: number;
  className?: string;
};

export function CountUp({ value, durationMs = 800, decimals = 0, className }: CountUpProps) {
  const [display, setDisplay] = useState<number>(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef<number>(0);
  const toRef = useRef<number>(value);

  useEffect(() => {
    fromRef.current = 0;
    toRef.current = Number.isFinite(value) ? value : 0;
    startRef.current = null;

    let raf = 0;
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(1, durationMs > 0 ? elapsed / durationMs : 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      const next = fromRef.current + (toRef.current - fromRef.current) * eased;
      setDisplay(next);
      if (t < 1) {
        raf = requestAnimationFrame(step);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return <span className={className}>{formatter.format(display)}</span>;
}


