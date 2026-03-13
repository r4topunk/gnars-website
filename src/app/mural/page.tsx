import type { Metadata } from "next";
import { MuralBackground } from "@/components/layout/MuralBackground";

export const metadata: Metadata = {
  title: "Mural — Gnars DAO",
  description: "Interactive community mural featuring Gnars NFT artwork in a draggable grid.",
  alternates: {
    canonical: "/mural",
  },
};

/**
 * Mural page
 * Displays the interactive mural with real Gnars NFTs in a draggable grid.
 */
export default function MuralPage() {
  return (
    <>
      <h1 className="sr-only">Gnars community mural</h1>
      <MuralBackground />
    </>
  );
}
