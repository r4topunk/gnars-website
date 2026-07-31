"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConnectButton } from "@/components/ui/ConnectButton";
import { Input } from "@/components/ui/input";
import { useTradeCreatorCoin } from "@/hooks/use-trade-creator-coin";
import { useUserAddress } from "@/hooks/use-user-address";
import { GNARS_CREATOR_COIN } from "@/lib/config";

/**
 * Buy old $gnars directly with ETH (ETH → ZORA → $gnars via the Zora SDK, since
 * $gnars is a Zora creator coin). This is the "get into old $gnars ahead of the
 * migration" on-ramp. Uses the same Zora router as zora.co — which is why it
 * works where Matcha/0x cannot route the V4 creator-coin pool.
 */
export function GetGnarsWidget() {
  const t = useTranslations("migrate");
  const { isConnected } = useUserAddress();
  const { buyCreatorCoin, isTrading } = useTradeCreatorCoin();
  const [amount, setAmount] = React.useState("");

  const amountNum = Number(amount);
  const valid = amount !== "" && !Number.isNaN(amountNum) && amountNum > 0;

  const onBuy = async () => {
    if (!valid) return;
    await buyCreatorCoin({ creatorCoinAddress: GNARS_CREATOR_COIN, amountInEth: amount });
  };

  if (!isConnected) {
    return (
      <Card className="flex flex-col items-center gap-4 p-10 text-center">
        <p className="text-sm text-muted-foreground">{t("getGnars.connectPrompt")}</p>
        <ConnectButton />
      </Card>
    );
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="space-y-1">
        <div className="text-sm font-medium">{t("getGnars.title")}</div>
        <p className="text-xs text-muted-foreground">{t("getGnars.subtitle")}</p>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground" htmlFor="eth-amount">
          {t("getGnars.amountLabel")}
        </label>
        <div className="flex items-center gap-2">
          <Input
            id="eth-amount"
            inputMode="decimal"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          />
          <span className="text-sm font-medium text-muted-foreground">ETH</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["0.01", "0.05", "0.1", "0.25"].map((v) => (
            <Button key={v} variant="outline" size="sm" onClick={() => setAmount(v)}>
              {v}
            </Button>
          ))}
        </div>
      </div>

      <Button className="w-full" size="lg" disabled={!valid || isTrading} onClick={onBuy}>
        {isTrading ? t("getGnars.buying") : t("getGnars.buyCta")}
      </Button>

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        {t("getGnars.slippageNote")}
      </p>
    </Card>
  );
}
