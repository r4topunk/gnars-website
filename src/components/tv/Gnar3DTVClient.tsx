"use client";

import dynamic from "next/dynamic";

const Gnar3DTV = dynamic(() => import("@/components/tv/Gnar3DTV").then((mod) => mod.Gnar3DTV), {
  ssr: false,
  loading: () => <div className="h-[320px] w-full rounded-xl bg-muted" aria-hidden="true" />,
});

export function Gnar3DTVClient({ autoRotate = true }: { autoRotate?: boolean }) {
  return <Gnar3DTV autoRotate={autoRotate} />;
}
