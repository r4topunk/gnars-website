/**
 * DroposalAddresses
 * Renders addresses for funds recipient, admin, and deployed token contract.
 */
import { getTranslations } from "next-intl/server";
import { SectionHeader } from "@/components/common/SectionHeader";
import { AddressDisplay } from "@/components/ui/address-display";
import { Card, CardContent } from "@/components/ui/card";

export interface DroposalAddressesProps {
  fundsRecipient?: string | null;
  defaultAdmin?: string | null;
  tokenAddress?: string | null;
}

export async function DroposalAddresses({
  fundsRecipient,
  defaultAdmin,
  tokenAddress,
}: DroposalAddressesProps) {
  const t = await getTranslations("droposals");
  return (
    <Card>
      <SectionHeader title={t("detail.addressesTitle")} />
      <CardContent className="space-y-3">
        {fundsRecipient && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">{t("detail.fundsRecipient")}</div>
            <AddressDisplay address={fundsRecipient} variant="compact" />
          </div>
        )}
        {defaultAdmin && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">{t("detail.admin")}</div>
            <AddressDisplay address={defaultAdmin} variant="compact" />
          </div>
        )}
        {tokenAddress && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">{t("detail.tokenContract")}</div>
            <AddressDisplay address={tokenAddress} variant="compact" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
