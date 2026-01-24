import { GnarsTVFeed } from "@/components/tv/GnarsTVFeed";

export const dynamic = "force-dynamic";

export default function TVPage() {
  return (
    <>
      <h1 className="sr-only">Gnars TV skateboarding video feed</h1>
      <GnarsTVFeed />
    </>
  );
}
