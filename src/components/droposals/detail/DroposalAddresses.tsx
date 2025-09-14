/**
 * DroposalAddresses
 * Renders addresses for funds recipient, admin, and deployed token contract.
 */
import { SectionHeader } from "@/components/common/SectionHeader";
import { AddressDisplay } from "@/components/ui/address-display";
import { Card, CardContent } from "@/components/ui/card";

export interface DroposalAddressesProps {
  fundsRecipient?: string | null;
  defaultAdmin?: string | null;
  tokenAddress?: string | null;
}

export function DroposalAddresses({
  fundsRecipient,
  defaultAdmin,
  tokenAddress,
}: DroposalAddressesProps) {
  return (
    <Card>
      <SectionHeader title="Addresses" />
      <CardContent className="space-y-3">
        {fundsRecipient && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Funds Recipient</div>
            <AddressDisplay address={fundsRecipient} variant="compact" />
          </div>
        )}
        {defaultAdmin && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Admin</div>
            <AddressDisplay address={defaultAdmin} variant="compact" />
          </div>
        )}
        {tokenAddress && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Token Contract</div>
            <AddressDisplay address={tokenAddress} variant="compact" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
