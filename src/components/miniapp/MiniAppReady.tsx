"use client";

import { useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

/**
 * Simple component that signals to Farcaster that the mini app is ready.
 * This hides the splash screen when running inside a mini app context.
 */
export function MiniAppReady() {
  useEffect(() => {
    sdk.actions.ready();
  }, []);

  return null;
}
