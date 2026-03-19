"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight, Coins, FileImage, Send } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AddressDisplay } from "@/components/ui/address-display";
import { cn, getETHDisplayProps } from "@/lib/utils";
import { subgraphQuery } from "@/lib/subgraph";
import { GNARS_ADDRESSES } from "@/lib/config";
import { type TransactionFormValues } from "../schema";

// --- Asset extraction helpers ---

interface EthAsset {
  kind: "eth";
  value: string;
}

interface UsdcAsset {
  kind: "usdc";
  amount: string;
}

interface TokenAsset {
  kind: "token";
  tokenAddress: string;
  amount: string;
}

interface NftAsset {
  kind: "nft";
  contractAddress: string;
  tokenIds: string[];
}

type Asset = EthAsset | UsdcAsset | TokenAsset | NftAsset;

function extractAssets(transactions: TransactionFormValues[]): Asset[] {
  const assets: Asset[] = [];
  let ethTotal = 0;
  let usdcTotal = 0;
  const tokenAmounts = new Map<string, number>();
  const nftTokenIds = new Map<string, string[]>();

  for (const tx of transactions) {
    switch (tx.type) {
      case "send-eth":
        ethTotal += parseFloat(tx.value || "0");
        break;
      case "send-usdc":
        usdcTotal += parseFloat(tx.amount || "0");
        break;
      case "send-tokens": {
        const addr = tx.tokenAddress.toLowerCase();
        const prev = tokenAmounts.get(addr) ?? 0;
        tokenAmounts.set(addr, prev + parseFloat(tx.amount || "0"));
        break;
      }
      case "send-nfts": {
        const contract = tx.contractAddress.toLowerCase();
        const ids = nftTokenIds.get(contract) ?? [];
        ids.push(tx.tokenId);
        nftTokenIds.set(contract, ids);
        break;
      }
    }
  }

  if (ethTotal > 0) assets.push({ kind: "eth", value: String(ethTotal) });
  if (usdcTotal > 0) assets.push({ kind: "usdc", amount: String(usdcTotal) });
  for (const [tokenAddress, amount] of tokenAmounts) {
    assets.push({ kind: "token", tokenAddress, amount: String(amount) });
  }
  for (const [contractAddress, tokenIds] of nftTokenIds) {
    assets.push({ kind: "nft", contractAddress, tokenIds });
  }

  return assets;
}

/** Extract the recipient address from a transaction */
export function getRecipient(tx: TransactionFormValues): string | null {
  switch (tx.type) {
    case "send-eth":
      return tx.target?.toLowerCase() ?? null;
    case "send-usdc":
    case "send-tokens":
      return tx.recipient?.toLowerCase() ?? null;
    case "send-nfts":
      return tx.to?.toLowerCase() ?? null;
    default:
      return null;
  }
}

// --- Subgraph query for NFT images ---

type TokenImageQuery = {
  tokens: Array<{ tokenId: string; image?: string | null }>;
};

const TOKEN_IMAGES_GQL = /* GraphQL */ `
  query TokenImages($dao: ID!, $tokenIds: [BigInt!]!) {
    tokens(where: { dao: $dao, tokenId_in: $tokenIds }) {
      tokenId
      image
    }
  }
`;

function useNftImages(nftAssets: NftAsset[]) {
  const [images, setImages] = useState<Record<string, string>>({});

  const allTokenIds = nftAssets.flatMap((a) => a.tokenIds);
  const hasGnarsNfts = nftAssets.some(
    (a) => a.contractAddress === GNARS_ADDRESSES.token.toLowerCase(),
  );

  useEffect(() => {
    if (!hasGnarsNfts || allTokenIds.length === 0) return;
    let ignore = false;

    subgraphQuery<TokenImageQuery>(TOKEN_IMAGES_GQL, {
      dao: GNARS_ADDRESSES.token.toLowerCase(),
      tokenIds: allTokenIds,
    })
      .then((data) => {
        if (ignore) return;
        const map: Record<string, string> = {};
        for (const t of data.tokens) {
          if (t.image) map[t.tokenId] = t.image;
        }
        setImages(map);
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasGnarsNfts, allTokenIds.join(",")]);

  return images;
}

// --- Row components for each asset type ---

function EthRow({ value }: { value: string }) {
  const ethProps = getETHDisplayProps(value);
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50">
        <Send className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
      </div>
      <span className={cn("text-sm font-bold font-mono", ethProps.textColor)}>
        {ethProps.formatted}
      </span>
    </div>
  );
}

function UsdcRow({ amount }: { amount: string }) {
  const formatted = parseFloat(amount).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50">
        <Coins className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
      </div>
      <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
        {formatted} USDC
      </span>
    </div>
  );
}

function TokenRow({ amount, tokenAddress }: { amount: string; tokenAddress: string }) {
  const formatted = parseFloat(amount).toLocaleString(undefined, {
    maximumFractionDigits: 6,
  });
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/50">
        <Coins className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-bold font-mono text-violet-600 dark:text-violet-400">
          {formatted} tokens
        </span>
        <span className="text-[10px] text-muted-foreground font-mono">
          {tokenAddress.slice(0, 6)}...{tokenAddress.slice(-4)}
        </span>
      </div>
    </div>
  );
}

function NftRow({
  tokenIds,
  images,
}: {
  tokenIds: string[];
  images: Record<string, string>;
}) {
  return (
    <div className="px-3 py-2.5 space-y-2">
      <div className="flex items-center gap-3">
        <div className="p-1.5 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-950/40 border border-fuchsia-200 dark:border-fuchsia-800/50">
          <FileImage className="h-3.5 w-3.5 text-fuchsia-600 dark:text-fuchsia-400" />
        </div>
        <span className="text-sm font-bold text-fuchsia-600 dark:text-fuchsia-400">
          {tokenIds.length} Gnars NFT{tokenIds.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
        {tokenIds.map((id, i) => {
          const imgUrl = images[id];
          return (
            <div
              key={i}
              className={cn(
                "relative aspect-square rounded-md overflow-hidden",
                "bg-muted/50 border border-fuchsia-200/60 dark:border-fuchsia-800/40",
              )}
            >
              {imgUrl ? (
                <Image
                  src={imgUrl}
                  alt={`Gnar #${id}`}
                  fill
                  className="object-cover"
                  sizes="(min-width: 768px) 56px, (min-width: 640px) 48px, 40px"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileImage className="h-4 w-4 text-muted-foreground/40" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent pt-3 pb-0.5 px-0.5">
                <p className="text-[9px] sm:text-[10px] font-semibold text-white text-center leading-none">
                  #{id}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Main component ---

interface RecipientBundleCardProps {
  recipient: string;
  from: string;
  transactions: TransactionFormValues[];
  indices: number[];
}

export function RecipientBundleCard({
  recipient,
  from,
  transactions,
  indices,
}: RecipientBundleCardProps) {
  const assets = extractAssets(transactions);
  const nftAssets = assets.filter((a): a is NftAsset => a.kind === "nft");
  const images = useNftImages(nftAssets);

  // Format indices as compact ranges: [0,1,2,5,6,9] → "Tx #1–3, #6–7, #10"
  const rangeLabel = (() => {
    if (indices.length === 1) return `Tx #${indices[0] + 1}`;

    const sorted = [...indices].sort((a, b) => a - b);
    const ranges: string[] = [];
    let start = sorted[0];
    let end = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === end + 1) {
        end = sorted[i];
      } else {
        ranges.push(start === end ? `#${start + 1}` : `#${start + 1}–${end + 1}`);
        start = sorted[i];
        end = sorted[i];
      }
    }
    ranges.push(start === end ? `#${start + 1}` : `#${start + 1}–${end + 1}`);
    return `Tx ${ranges.join(", ")}`;
  })();

  return (
    <Card className="relative overflow-hidden border-border">
      <CardHeader className="relative pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <h3 className="text-sm font-semibold text-foreground">
              Transfer to
            </h3>
            <AddressDisplay
              address={recipient}
              variant="compact"
              showAvatar={true}
              showCopy={false}
              showExplorer={false}
              avatarSize="sm"
              truncateLength={6}
              className="text-sm font-medium"
            />
          </div>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {rangeLabel}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          from{" "}
          {from.toLowerCase() === GNARS_ADDRESSES.treasury.toLowerCase()
            ? "DAO Treasury"
            : `${from.slice(0, 6)}...${from.slice(-4)}`}
        </p>
      </CardHeader>

      <CardContent className="relative pt-0 px-2 pb-2 sm:px-4 sm:pb-4">
        <div className="rounded-lg border border-border divide-y divide-border overflow-hidden bg-background">
          {assets.map((asset, i) => {
            switch (asset.kind) {
              case "eth":
                return <EthRow key={`eth-${i}`} value={asset.value} />;
              case "usdc":
                return <UsdcRow key={`usdc-${i}`} amount={asset.amount} />;
              case "token":
                return (
                  <TokenRow
                    key={`token-${i}`}
                    amount={asset.amount}
                    tokenAddress={asset.tokenAddress}
                  />
                );
              case "nft":
                return (
                  <NftRow
                    key={`nft-${i}`}
                    tokenIds={asset.tokenIds}
                    images={images}
                  />
                );
            }
          })}
        </div>
      </CardContent>
    </Card>
  );
}
