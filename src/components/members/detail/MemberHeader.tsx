"use client";

import { AddressDisplay } from "@/components/ui/address-display";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MemberHeaderProps {
  address: string;
  display: string | null | undefined;
  ensAvatar: string | null;
}

export function MemberHeader({ address, display, ensAvatar }: MemberHeaderProps) {
  return (
    <div className="flex items-start gap-4">
      <Avatar className="h-16 w-16">
        {ensAvatar ? <AvatarImage src={ensAvatar} alt={String(display)} /> : null}
        <AvatarFallback>{address.slice(2, 4).toUpperCase()}</AvatarFallback>
      </Avatar>
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
