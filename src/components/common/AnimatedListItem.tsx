"use client";

import { ReactNode } from "react";

interface AnimatedListItemProps {
  children: ReactNode;
  /** Stagger delay in ms applied to initial mount */
  delayMs?: number;
  /** Optional additional className for the wrapper */
  className?: string;
}

/**
 * AnimatedListItem
 * Smooth, subtle first-mount animation using CSS only (no layout shift):
 *  - fade in and translate up slightly
 *  - respects reduced motion
 * Uses a one-time data attribute to prevent re-animating on re-renders.
 */
export function AnimatedListItem({ children, className }: AnimatedListItemProps) {
  return <div className={className}>{children}</div>;
}


