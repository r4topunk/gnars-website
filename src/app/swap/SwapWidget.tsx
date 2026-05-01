"use client";

import * as React from "react";
import { ArrowDownUp, Check, ChevronDown, Info, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { prepareContractCall, prepareTransaction, sendTransaction, waitForReceipt } from "thirdweb";
import { base as thirdwebBase } from "thirdweb/chains";
import { useActiveWallet, useActiveWalletChain } from "thirdweb/react";
import { formatUnits, maxUint256, parseUnits, type Address, type Hex } from "viem";
import { base } from "wagmi/chains";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useUserAddress } from "@/hooks/use-user-address";
import { useWriteAccount } from "@/hooks/use-write-account";
import { DAO_ADDRESSES, TREASURY_TOKEN_ALLOWLIST } from "@/lib/config";
import { getThirdwebClient } from "@/lib/thirdweb";
import { ensureOnChain, normalizeTxError } from "@/lib/thirdweb-tx";
import { cn } from "@/lib/utils";

// 0x convention for the native asset slot.
const NATIVE_TOKEN = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" as const;

const erc20ApproveAbi = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

interface TokenInfo {
  symbol: string;
  name: string;
  address: `0x${string}` | typeof NATIVE_TOKEN;
  decimals: number;
  logo?: string;
}

const TOKENS: readonly TokenInfo[] = [
  {
    symbol: "ETH",
    name: "Ethereum",
    address: NATIVE_TOKEN,
    decimals: 18,
    logo: "https://assets.relay.link/icons/1/light.png",
  },
  {
    symbol: "WETH",
    name: "Wrapped Ether",
    address: TREASURY_TOKEN_ALLOWLIST.WETH as `0x${string}`,
    decimals: 18,
    logo: "https://assets.relay.link/icons/1/light.png",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    address: TREASURY_TOKEN_ALLOWLIST.USDC as `0x${string}`,
    decimals: 6,
    logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/assets/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913/logo.png",
  },
  {
    symbol: "GNARS",
    name: "Gnars",
    address: DAO_ADDRESSES.gnarsErc20 as `0x${string}`,
    decimals: 18,
    logo: "/gnars.webp",
  },
  {
    symbol: "DEGEN",
    name: "Degen",
    address: "0x4ed4e862860bed51a9570b96d89af5e1b0efefed",
    decimals: 18,
  },
  {
    symbol: "HIGHER",
    name: "Higher",
    address: "0x0578d8a44db98b23bf096a382e016e29a5ce0ffe",
    decimals: 18,
  },
] as const;

const POPULAR_SYMBOLS = ["ETH", "USDC", "GNARS", "DEGEN"] as const;

const DEFAULT_SELL = TOKENS.find((t) => t.symbol === "ETH")!;
const DEFAULT_BUY = TOKENS.find((t) => t.symbol === "GNARS")!;

interface ZeroExPriceResponse {
  liquidityAvailable?: boolean;
  buyAmount?: string;
  sellAmount?: string;
  totalNetworkFee?: string;
  allowanceTarget?: string;
  issues?: {
    allowance?: { spender?: string } | null;
    balance?: { token?: string; actual?: string; expected?: string } | null;
  };
  zid?: string;
}

interface ZeroExQuoteResponse extends ZeroExPriceResponse {
  transaction?: {
    to: string;
    data: string;
    value: string;
    gas?: string;
  };
  reason?: string;
}

function formatTokenAmount(raw: string | undefined, decimals: number): string {
  if (!raw) return "—";
  try {
    const value = parseFloat(formatUnits(BigInt(raw), decimals));
    if (value === 0) return "0";
    if (value < 0.0001) return value.toExponential(3);
    if (value < 1) return value.toFixed(6);
    if (value < 1000) return value.toFixed(4);
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  } catch {
    return "—";
  }
}

function TokenLogo({ token, size = 24 }: { token: TokenInfo; size?: number }) {
  const dim = `${size}px`;
  if (token.logo) {
    return (
      <span
        className="relative inline-flex shrink-0 overflow-hidden rounded-full bg-muted"
        style={{ width: dim, height: dim }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={token.logo}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground"
      style={{ width: dim, height: dim }}
    >
      {token.symbol[0]}
    </span>
  );
}

interface TokenPickerProps {
  value: TokenInfo;
  exclude?: `0x${string}` | typeof NATIVE_TOKEN;
  onSelect: (token: TokenInfo) => void;
  label: string;
}

function TokenPicker({ value, exclude, onSelect, label }: TokenPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const popular = React.useMemo(
    () =>
      TOKENS.filter((t) => POPULAR_SYMBOLS.includes(t.symbol as (typeof POPULAR_SYMBOLS)[number])),
    [],
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TOKENS;
    return TOKENS.filter(
      (t) =>
        t.symbol.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.address.toLowerCase().includes(q),
    );
  }, [query]);

  const choose = (token: TokenInfo) => {
    if (token.address === exclude) return;
    onSelect(token);
    setQuery("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 px-2 font-semibold"
          aria-label={label}
        >
          <TokenLogo token={value} size={20} />
          {value.symbol}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select a token</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or paste address"
              className="pl-9"
            />
          </div>

          {!query && popular.length > 0 && (
            <div>
              <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Popular</p>
              <div className="flex flex-wrap gap-2">
                {popular.map((t) => {
                  const isSelected = t.address === value.address;
                  const isExcluded = t.address === exclude;
                  return (
                    <Button
                      key={t.address}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className={cn("h-8 gap-1.5 rounded-full px-3", isExcluded && "opacity-40")}
                      onClick={() => choose(t)}
                      disabled={isExcluded}
                    >
                      <TokenLogo token={t} size={16} />
                      <span className="text-xs">{t.symbol}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="-mx-6 max-h-80 overflow-y-auto border-t">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No tokens found</p>
            ) : (
              filtered.map((t) => {
                const isSelected = t.address === value.address;
                const isExcluded = t.address === exclude;
                return (
                  <button
                    key={t.address}
                    type="button"
                    disabled={isExcluded}
                    onClick={() => choose(t)}
                    className={cn(
                      "flex w-full items-center gap-3 px-6 py-2.5 text-left transition-colors",
                      isExcluded ? "cursor-not-allowed opacity-40" : "hover:bg-accent",
                      isSelected && "bg-accent/60",
                    )}
                  >
                    <TokenLogo token={t} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold">{t.symbol}</span>
                        <span className="truncate text-xs text-muted-foreground">{t.name}</span>
                      </div>
                      <p className="truncate font-mono text-[10px] text-muted-foreground">
                        {t.address === NATIVE_TOKEN
                          ? "Native asset"
                          : `${t.address.slice(0, 6)}…${t.address.slice(-4)}`}
                      </p>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SwapWidget() {
  const { address, isConnected } = useUserAddress();
  const writer = useWriteAccount();
  const activeWallet = useActiveWallet();
  const activeChain = useActiveWalletChain();
  const isWrongNetwork = isConnected && activeChain?.id !== base.id;

  const [sellToken, setSellToken] = React.useState<TokenInfo>(DEFAULT_SELL);
  const [buyToken, setBuyToken] = React.useState<TokenInfo>(DEFAULT_BUY);
  const [sellAmount, setSellAmount] = React.useState("");
  const [supportFee, setSupportFee] = React.useState(true);

  const [price, setPrice] = React.useState<ZeroExPriceResponse | null>(null);
  const [isFetching, setIsFetching] = React.useState(false);
  const [needsApproval, setNeedsApproval] = React.useState(false);
  const [approvalTarget, setApprovalTarget] = React.useState<Address | null>(null);

  const [isApproving, setIsApproving] = React.useState(false);
  const [isSwapping, setIsSwapping] = React.useState(false);
  const [isSwitchingChain, setIsSwitchingChain] = React.useState(false);

  // Debounced indicative price fetch.
  React.useEffect(() => {
    const numeric = Number(sellAmount);
    if (!sellAmount || Number.isNaN(numeric) || numeric <= 0 || !address) {
      setPrice(null);
      setNeedsApproval(false);
      setApprovalTarget(null);
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      try {
        setIsFetching(true);
        const rawAmount = parseUnits(sellAmount, sellToken.decimals).toString();
        const params = new URLSearchParams({
          chainId: String(base.id),
          sellToken: sellToken.address,
          buyToken: buyToken.address,
          sellAmount: rawAmount,
          taker: address,
        });
        if (supportFee) params.set("fee", "1");

        const res = await fetch(`/api/0x/price?${params.toString()}`);
        const data: ZeroExPriceResponse = await res.json();
        if (cancelled) return;

        setPrice(data);
        const spender = data?.issues?.allowance?.spender as Address | undefined;
        const requiresApproval =
          sellToken.address !== NATIVE_TOKEN &&
          Boolean(data?.issues?.allowance) &&
          Boolean(spender);
        setNeedsApproval(requiresApproval);
        setApprovalTarget(requiresApproval && spender ? spender : null);
      } catch (err) {
        if (cancelled) return;
        console.error("[swap] price fetch failed", err);
        setPrice(null);
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [sellAmount, sellToken, buyToken, address, supportFee]);

  const flip = () => {
    setSellToken(buyToken);
    setBuyToken(sellToken);
    setSellAmount("");
    setPrice(null);
    setNeedsApproval(false);
    setApprovalTarget(null);
  };

  const handleSwitchChain = async () => {
    if (!activeWallet || isSwitchingChain) return;
    setIsSwitchingChain(true);
    try {
      await activeWallet.switchChain(thirdwebBase);
      toast.success("Switched to Base");
    } catch (err) {
      const { message } = normalizeTxError(err);
      toast.error("Failed to switch network", { description: message });
    } finally {
      setIsSwitchingChain(false);
    }
  };

  const handleApprove = async () => {
    const client = getThirdwebClient();
    if (!client || !writer || !approvalTarget) {
      toast.error("Cannot approve", { description: "Connect a wallet on Base." });
      return;
    }
    setIsApproving(true);
    try {
      await ensureOnChain(writer.wallet, thirdwebBase);
      const tx = prepareContractCall({
        contract: {
          client,
          chain: thirdwebBase,
          address: sellToken.address as Address,
          abi: erc20ApproveAbi,
        },
        method: "approve",
        params: [approvalTarget, maxUint256],
      });
      const result = await sendTransaction({ account: writer.account, transaction: tx });
      const txHash = result.transactionHash as Hex;
      toast.success(`Approval submitted`, {
        description: `${txHash.slice(0, 10)}…${txHash.slice(-4)}`,
      });
      await waitForReceipt({ client, chain: thirdwebBase, transactionHash: txHash });
      setNeedsApproval(false);
      setApprovalTarget(null);
      toast.success(`${sellToken.symbol} approved`);
    } catch (err) {
      const { category, message } = normalizeTxError(err);
      if (category === "user-rejected") {
        toast.error("Approval cancelled");
      } else {
        toast.error("Approval failed", { description: message });
      }
    } finally {
      setIsApproving(false);
    }
  };

  const handleSwap = async () => {
    const client = getThirdwebClient();
    if (!client || !writer || !address) {
      toast.error("Connect a wallet first");
      return;
    }
    if (!price?.liquidityAvailable) {
      toast.error("No liquidity for this pair");
      return;
    }

    setIsSwapping(true);
    try {
      await ensureOnChain(writer.wallet, thirdwebBase);

      const rawAmount = parseUnits(sellAmount, sellToken.decimals).toString();
      const params = new URLSearchParams({
        chainId: String(base.id),
        sellToken: sellToken.address,
        buyToken: buyToken.address,
        sellAmount: rawAmount,
        taker: address,
      });
      if (supportFee) params.set("fee", "1");

      const res = await fetch(`/api/0x/quote?${params.toString()}`);
      const quote: ZeroExQuoteResponse = await res.json();

      if (!quote?.transaction) {
        toast.error("Quote unavailable", {
          description: quote?.reason ?? "0x returned no transaction",
        });
        return;
      }

      const tx = prepareTransaction({
        chain: thirdwebBase,
        client,
        to: quote.transaction.to as Address,
        data: quote.transaction.data as Hex,
        value: BigInt(quote.transaction.value ?? "0"),
        gas: quote.transaction.gas ? BigInt(quote.transaction.gas) : undefined,
      });

      const result = await sendTransaction({ account: writer.account, transaction: tx });
      const txHash = result.transactionHash as Hex;
      toast.success("Swap submitted", {
        description: `${txHash.slice(0, 10)}…${txHash.slice(-4)}`,
      });

      await waitForReceipt({ client, chain: thirdwebBase, transactionHash: txHash });
      toast.success("Swap confirmed", {
        description: `Received ~${formatTokenAmount(quote.buyAmount, buyToken.decimals)} ${buyToken.symbol}`,
      });

      setSellAmount("");
      setPrice(null);
    } catch (err) {
      const { category, message } = normalizeTxError(err);
      if (category === "user-rejected") {
        toast.error("Swap cancelled");
      } else {
        toast.error("Swap failed", { description: message });
      }
    } finally {
      setIsSwapping(false);
    }
  };

  const buyDisplay = isFetching
    ? "…"
    : price?.liquidityAvailable
      ? formatTokenAmount(price.buyAmount, buyToken.decimals)
      : "—";

  const networkFeeEth = price?.totalNetworkFee
    ? parseFloat(formatUnits(BigInt(price.totalNetworkFee), 18)).toFixed(6)
    : null;

  const isLoading = isFetching || isApproving || isSwapping;
  const hasAmount = sellAmount.length > 0 && Number(sellAmount) > 0;
  const insufficientBalance = Boolean(price?.issues?.balance);
  const canSwap =
    isConnected &&
    !isWrongNetwork &&
    hasAmount &&
    !needsApproval &&
    !insufficientBalance &&
    Boolean(price?.liquidityAvailable) &&
    !isLoading;

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-4 p-4">
        {/* Sell */}
        <div className="rounded-lg border bg-muted/40 p-3">
          <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">You pay</p>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={sellAmount}
              onChange={(e) => setSellAmount(e.target.value)}
              className="h-12 border-0 bg-transparent px-0 text-2xl font-bold shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <TokenPicker
              value={sellToken}
              exclude={buyToken.address}
              onSelect={(t) => {
                setSellToken(t);
                setSellAmount("");
                setPrice(null);
              }}
              label="Sell token"
            />
          </div>
        </div>

        {/* Flip */}
        <div className="-my-2 flex justify-center">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8 rounded-full border-2"
            onClick={flip}
            aria-label="Flip tokens"
          >
            <ArrowDownUp className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Buy */}
        <div className="rounded-lg border bg-muted/40 p-3">
          <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">You receive</p>
          <div className="flex items-center gap-2">
            <div className="flex h-12 flex-1 items-center text-2xl font-bold text-foreground">
              {isFetching ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                buyDisplay
              )}
            </div>
            <TokenPicker
              value={buyToken}
              exclude={sellToken.address}
              onSelect={(t) => {
                setBuyToken(t);
                setSellAmount("");
                setPrice(null);
              }}
              label="Buy token"
            />
          </div>
        </div>

        {/* Quote info */}
        {price && !isFetching && (
          <div className="space-y-1 rounded-lg border px-3 py-2 text-xs">
            {networkFeeEth && price.liquidityAvailable && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimated network fee</span>
                <span className="font-mono">{networkFeeEth} ETH</span>
              </div>
            )}
            {insufficientBalance && (
              <p className="text-destructive">Insufficient {sellToken.symbol} balance</p>
            )}
            {price.liquidityAvailable === false && (
              <p className="text-destructive">No liquidity available for this pair</p>
            )}
          </div>
        )}

        {/* CTA */}
        {!isConnected ? (
          <div className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
            Connect your wallet to swap
          </div>
        ) : isWrongNetwork ? (
          <Button
            className="w-full"
            size="lg"
            onClick={handleSwitchChain}
            disabled={isSwitchingChain}
          >
            {isSwitchingChain ? "Switching…" : "Switch to Base"}
          </Button>
        ) : needsApproval ? (
          <Button className="w-full" size="lg" onClick={handleApprove} disabled={isApproving}>
            {isApproving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Approving {sellToken.symbol}…
              </>
            ) : (
              `Approve ${sellToken.symbol}`
            )}
          </Button>
        ) : (
          <Button className="w-full" size="lg" onClick={handleSwap} disabled={!canSwap}>
            {isSwapping ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Swapping…
              </>
            ) : !hasAmount ? (
              "Enter an amount"
            ) : isFetching ? (
              "Fetching price…"
            ) : (
              `Swap ${sellToken.symbol} → ${buyToken.symbol}`
            )}
          </Button>
        )}

        {/* Fee opt-in */}
        <div className="flex items-center justify-center gap-2 pt-1">
          <Checkbox
            id="support-treasury-fee"
            checked={supportFee}
            onCheckedChange={(v) => setSupportFee(v === true)}
          />
          <label
            htmlFor="support-treasury-fee"
            className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground"
          >
            Support Gnars treasury (0.5% fee)
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                A 0.5% fee on the bought token routes to the Gnars DAO treasury. Helps fund
                proposals, bounties, and skate infrastructure. Untick to skip.
              </TooltipContent>
            </Tooltip>
          </label>
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Powered by 0x · Best price across 150+ DEXes</span>
          <Badge variant="secondary" className="text-[10px]">
            Base
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
