import { Suspense } from "react";
import { GnarsTVFeed } from "@/components/tv/GnarsTVFeed";

export const revalidate = 120;

export default function TVPage() {
  return (
    <>
      <h1 className="sr-only">Gnars TV skateboarding video feed</h1>
      <Suspense>
        <GnarsTVFeed />
      </Suspense>
    </>
  );
}
