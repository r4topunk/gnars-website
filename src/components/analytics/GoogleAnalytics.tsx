import { GoogleAnalytics as NextGoogleAnalytics } from "@next/third-parties/google";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-S0R9RBJDKL";

export function GoogleAnalytics() {
  if (!GA_ID) return null;
  return <NextGoogleAnalytics gaId={GA_ID} />;
}
