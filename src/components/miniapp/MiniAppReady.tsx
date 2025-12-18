"use client";

import { useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

/**
 * Simple component that signals to Farcaster that the mini app is ready.
 * This hides the splash screen when running inside a mini app context.
 */
export function MiniAppReady() {
  useEffect(() => {
    let cancelled = false;

    const sendReady = async () => {
      try {
        const inMiniApp = await sdk.isInMiniApp();
        if (!inMiniApp || cancelled) {
          return;
        }

        await sdk.actions.ready();
        console.debug("[miniapp] ready() called");
      } catch (error) {
        console.error("[miniapp] failed to call ready()", error);
      }
    };

    sendReady();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
