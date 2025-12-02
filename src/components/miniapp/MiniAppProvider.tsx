"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { sdk, type Context } from "@farcaster/miniapp-sdk";

interface MiniAppContextType {
  /** Whether the app is running inside a Farcaster mini app context */
  isInMiniApp: boolean;
  /** Whether the SDK has been initialized */
  isReady: boolean;
  /** The Farcaster user context if available */
  context: Context.MiniAppContext | null;
  /** Share content via Farcaster */
  share: (params: { text?: string; url?: string }) => Promise<void>;
  /** Open a URL in the parent frame */
  openUrl: (url: string) => void;
  /** Close the mini app */
  close: () => void;
}

const MiniAppContext = createContext<MiniAppContextType>({
  isInMiniApp: false,
  isReady: false,
  context: null,
  share: async () => {},
  openUrl: () => {},
  close: () => {},
});

export function useMiniApp() {
  return useContext(MiniAppContext);
}

interface MiniAppProviderProps {
  children: ReactNode;
}

/**
 * MiniAppProvider
 *
 * Wraps the app to provide Farcaster mini app context and actions.
 * Automatically detects if running inside a Farcaster frame and initializes the SDK.
 *
 * Usage:
 * ```tsx
 * <MiniAppProvider>
 *   <App />
 * </MiniAppProvider>
 * ```
 *
 * Then in components:
 * ```tsx
 * const { isInMiniApp, context, share } = useMiniApp();
 * ```
 */
export function MiniAppProvider({ children }: MiniAppProviderProps) {
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [context, setContext] = useState<MiniAppContextType["context"]>(null);

  useEffect(() => {
    // Call ready() immediately - this is safe to call even outside mini app context
    // The SDK will handle it gracefully if not in a frame
    sdk.actions.ready();

    const initMiniApp = async () => {
      try {
        // Check if we're in a mini app context
        const inMiniApp = await sdk.isInMiniApp();

        if (inMiniApp) {
          setIsInMiniApp(true);

          // Get the context
          const ctx = await sdk.context;
          if (ctx) {
            setContext(ctx);
          }
        }
      } catch (error) {
        // Not in a mini app context - this is fine for regular web access
        console.debug("Not running in Farcaster mini app context:", error);
      } finally {
        setIsReady(true);
      }
    };

    initMiniApp();
  }, []);

  const share = useCallback(
    async (params: { text?: string; url?: string }) => {
      if (!isInMiniApp) {
        // Fallback for non-mini app context: open share dialog or copy to clipboard
        const shareText = [params.text, params.url].filter(Boolean).join(" ");
        if (navigator.share) {
          await navigator.share({ text: shareText, url: params.url });
        } else if (params.url) {
          await navigator.clipboard.writeText(params.url);
        }
        return;
      }

      try {
        await sdk.actions.composeCast({
          text: params.text,
          embeds: params.url ? [params.url as `https://${string}`] : undefined,
        });
      } catch (error) {
        console.error("Failed to share via Farcaster:", error);
      }
    },
    [isInMiniApp],
  );

  const openUrl = useCallback(
    (url: string) => {
      if (isInMiniApp) {
        sdk.actions.openUrl(url);
      } else {
        window.open(url, "_blank");
      }
    },
    [isInMiniApp],
  );

  const close = useCallback(() => {
    if (isInMiniApp) {
      sdk.actions.close();
    }
  }, [isInMiniApp]);

  return (
    <MiniAppContext.Provider
      value={{
        isInMiniApp,
        isReady,
        context,
        share,
        openUrl,
        close,
      }}
    >
      {children}
    </MiniAppContext.Provider>
  );
}
