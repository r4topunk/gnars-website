/**
 * DroposalActionBox
 * Shows price, edition, sale status and mint CTA.
 */
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface DroposalActionBoxProps {
  priceEth: string;
  editionSize: string;
  saleActive: boolean;
  saleNotStarted: boolean;
  saleEnded: boolean;
  saleStart?: number;
  saleEnd?: number;
  hasDecoded: boolean;
  formatCountdown: (target: number) => string;
}

export function DroposalActionBox({
  priceEth,
  editionSize,
  saleActive,
  saleNotStarted,
  saleEnded,
  saleStart,
  saleEnd,
  hasDecoded,
  formatCountdown,
}: DroposalActionBoxProps) {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-muted-foreground">Price</div>
            <div className="text-lg font-semibold">{Number(priceEth) === 0 ? "Free" : `${priceEth} ETH`}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Edition</div>
            <div className="text-lg font-semibold">{editionSize === "0" ? "Open" : editionSize}</div>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {saleActive && <span className="text-green-600 dark:text-green-500">Sale is live</span>}
          {saleNotStarted && saleStart ? (
            <span>
              Starts {new Date(saleStart).toLocaleString()} · {formatCountdown(saleStart)}
            </span>
          ) : null}
          {saleEnded && saleEnd ? <span>Ended {new Date(saleEnd).toLocaleString()}</span> : null}
          {!hasDecoded && (
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              No sale configuration
            </span>
          )}
        </div>
        <Button disabled={!saleActive} className="w-full">
          {saleActive ? "Mint" : "Mint is not available yet"}
        </Button>
      </CardContent>
    </Card>
  );
}


