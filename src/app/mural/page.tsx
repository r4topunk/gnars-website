 import { MuralBackground } from "@/components/layout/MuralBackground";

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
