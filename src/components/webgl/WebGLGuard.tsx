"use client";

import { Component, useEffect, useState, type ReactNode } from "react";
import { hasWebGLSupport } from "@/lib/webgl";

interface WebGLGuardProps {
  children: ReactNode;
  /** Rendered instead of `children` when WebGL is unavailable or the scene throws. */
  fallback?: ReactNode;
  /** Label used in the console warning so a report names the scene that fell back. */
  label?: string;
}

interface BoundaryState {
  failed: boolean;
}

class WebGLErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; label: string },
  BoundaryState
> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // Not a crash we want reported as one: the page is expected to keep working
    // without the scene. Log it so a support report still carries the reason.
    console.warn(`[webgl] ${this.props.label} scene failed, falling back`, error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Renders a WebGL scene only where WebGL actually works.
 *
 * Two layers, because the failure has two shapes:
 *  - support probe — the common case (GPU disabled, sandboxed, blocklisted
 *    driver). Caught before three.js/ogl ever construct a renderer.
 *  - error boundary — everything else: context creation that fails despite a
 *    passing probe, a driver crash, too many live contexts, a shader that will
 *    not compile on that machine.
 *
 * Without this, `new WebGLRenderer()` throws through React and, since the
 * MiniTV lives in the root layout, replaces every page with the global error
 * screen. See `src/lib/webgl.ts`.
 */
export function WebGLGuard({ children, fallback = null, label = "webgl" }: WebGLGuardProps) {
  // Probing needs a DOM, so the answer is only known after mount. `null` keeps
  // the server markup and the first client render identical.
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    setSupported(hasWebGLSupport());
  }, []);

  if (supported === null) return <>{fallback}</>;
  if (!supported) return <>{fallback}</>;

  return (
    <WebGLErrorBoundary fallback={fallback} label={label}>
      {children}
    </WebGLErrorBoundary>
  );
}
