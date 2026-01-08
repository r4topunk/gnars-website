"use client";

import { AddressDisplay } from "@/components/ui/address-display";
import { FlipAvatar } from "./FlipAvatar";

interface MemberHeaderProps {
  address: string;
  display: string | null | undefined;
  ensAvatar: string | null;
  zoraAvatar?: string | null;
}

export function MemberHeader({ address, display, ensAvatar, zoraAvatar }: MemberHeaderProps) {
  return (
    <div className="flex items-start gap-4">
      <FlipAvatar
        address={address}
        ensAvatar={ensAvatar}
        zoraAvatar={zoraAvatar}
        displayName={String(display)}
        size="lg"
      />
      <div className="flex-1">
        <div className="flex items-centered gap-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {typeof display === "string" ? display : String(display)}
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
          <AddressDisplay
            address={address}
            variant="default"
            showAvatar={false}
            showCopy={true}
            showExplorer={true}
            showENS={false}
            truncateLength={6}
          />
        </div>
      </div>
    </div>
  );
}
