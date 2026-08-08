import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { StakeAdminPanel } from "@/components/stake/StakeAdminPanel";

// Home for the sponsorship-vault deploy tool.
//
// It used to render at the bottom of /stake, which is now a public marketing +
// staking surface — an owner tool (3 wallet txs and a Safe batch) does not belong
// on it, and for a connected non-admin the panel prints a diagnostic card with
// their own addresses. Taking it off that page left the only UI that can deploy a
// rider's Morpho V2 vault unreachable, so it gets its own address instead: adding
// a rider still has a path through the UI, and nobody lands here by accident.
//
// A static segment beats the sibling `[rider]` dynamic route, and no rider is
// called "admin", so this steals nothing. The panel keeps its own isVaultAdmin
// gate — this route is not an access control, just a place to stand.

export const metadata: Metadata = {
  title: "Sponsorship vaults",
  robots: { index: false, follow: false },
};

export default async function StakeAdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="py-10">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* The panel renders nothing at all until a wallet is connected, so the
            route needs one line of its own — otherwise an owner who lands here
            signed out gets a blank page and cannot tell it from a broken one.
            English like the panel it introduces: this whole tool is untranslated. */}
        <header className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Sponsorship vaults</h1>
          <p className="text-sm text-muted-foreground">
            Owner tool. Connect a SOPA Safe owner wallet to deploy a rider&apos;s vault.
          </p>
        </header>
        <StakeAdminPanel />
      </div>
    </div>
  );
}
