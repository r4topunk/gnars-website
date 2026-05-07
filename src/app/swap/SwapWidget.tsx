"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { getCoin, setApiKey } from "@zoralabs/coins-sdk";
import { ArrowRight, Check, ChevronDown, Info, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { prepareContractCall, prepareTransaction, sendTransaction, waitForReceipt } from "thirdweb";
import { useActiveWallet, useActiveWalletChain } from "thirdweb/react";
import { formatUnits, isAddress, maxUint256, parseUnits, type Address, type Hex } from "viem";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useUserAddress } from "@/hooks/use-user-address";
import { useWriteAccount } from "@/hooks/use-write-account";
import { getThirdwebClient } from "@/lib/thirdweb";
import { ensureOnChain, normalizeTxError } from "@/lib/thirdweb-tx";
import { cn } from "@/lib/utils";
import { getDefaultPair, NATIVE_TOKEN, type SwapToken } from "./chains";
import { useSwapChain } from "./SwapChainContext";
import { useTokenLookup, useWalletTokens } from "./useWalletTokens";
import {
  formatBalanceDisplay,
  useAllTokenBalances,
  useTokenBalance,
  type TokenBalance,
} from "./useTokenBalance";
import type { SwapChain } from "./chains";

// Lazily fetches a Zora creator coin's image when no standard logo is available.
// Only runs on Base (chain 8453) since creator coins are Base-only.
// Results are cached for 24 h — logos don't change.
function useZoraLogo(address: string, chainId: number, skip: boolean): string | null {
  return (
    useQuery({
      queryKey: ["zora-logo", address],
      enabled: !skip && chainId === 8453 && address !== NATIVE_TOKEN,
      staleTime: 24 * 60 * 60 * 1000,
      retry: false,
      queryFn: async () => {
        const key = process.env.NEXT_PUBLIC_ZORA_API_KEY;
        if (key) setApiKey(key);
        const res = await getCoin({ address, chain: 8453 });
        const coin = res?.data?.zora20Token;
        const preview = coin?.mediaContent?.previewImage;
        const raw = typeof preview === "object"
          ? (preview as Record<string, string>)?.medium ?? (preview as Record<string, string>)?.small
          : (preview as string | undefined);
        if (!raw) return null;
        // Convert IPFS URIs to an HTTP gateway URL.
        return raw.startsWith("ipfs://")
          ? raw.replace("ipfs://", "https://dweb.link/ipfs/")
          : raw;
      },
    }).data ?? null
  );
}

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

function TokenLogo({
  token,
  size = 24,
  chainId = 8453,
}: {
  token: SwapToken;
  size?: number;
  chainId?: number;
}) {
  const [logoError, setLogoError] = React.useState(false);
  React.useEffect(() => setLogoError(false), [token.logo]);

  const needsFallback = !token.logo || logoError;
  const zoraLogo = useZoraLogo(token.address, chainId, !needsFallback);
  const effectiveLogo = needsFallback ? (zoraLogo ?? undefined) : token.logo;

  const dim = `${size}px`;
  if (effectiveLogo) {
    return (
      <span
        className="relative inline-flex shrink-0 items-center justify-center"
        style={{ width: dim, height: dim }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={effectiveLogo}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-contain"
          onError={() => setLogoError(true)}
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
  value: SwapToken;
  tokens: readonly SwapToken[];
  exclude?: `0x${string}` | typeof NATIVE_TOKEN;
  onSelect: (token: SwapToken) => void;
  label: string;
  chain: SwapChain;
  userAddress: Address | undefined;
  isConnected: boolean;
  usdValues?: Map<string, number>;
}

function TokenPicker({
  value,
  tokens,
  exclude,
  onSelect,
  label,
  chain,
  userAddress,
  isConnected,
  usdValues,
}: TokenPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const balances = useAllTokenBalances({
    chain,
    userAddress: isConnected ? userAddress : undefined,
    tokens,
  });

  // When the query looks like a contract address and nothing in the list
  // matches, resolve it via Alchemy metadata + Zora (on Base).
  const queryTrimmed = query.trim();
  const lookup = useTokenLookup({ address: queryTrimmed, chainId: chain.id });

  // Show the first 4 tokens of the chain as the "popular" row — chain
  // registries are ordered to put the staples first.
  const popular = React.useMemo(() => tokens.slice(0, 4), [tokens]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = !q
      ? tokens
      : tokens.filter(
          (t) =>
            t.symbol.toLowerCase().includes(q) ||
            t.name.toLowerCase().includes(q) ||
            t.address.toLowerCase().includes(q),
        );

    // When not searching, sort by USD value so the user's most valuable
    // holdings float to the top. Fall back to normalised token amount for
    // tokens without a CoinGecko price.
    if (!q && isConnected) {
      return [...base].sort((a, b) => {
        const usdA = usdValues?.get(a.address.toLowerCase()) ?? null;
        const usdB = usdValues?.get(b.address.toLowerCase()) ?? null;
        if (usdA !== null && usdB !== null) return usdB - usdA;
        if (usdA !== null) return -1;
        if (usdB !== null) return 1;
        const ba = balances.get(a.address);
        const bb = balances.get(b.address);
        const numA = ba ? parseFloat(formatUnits(ba.value, ba.decimals)) : 0;
        const numB = bb ? parseFloat(formatUnits(bb.value, bb.decimals)) : 0;
        return numB - numA;
      });
    }
    return base;
  }, [query, tokens, isConnected, balances, usdValues]);

  const choose = (token: SwapToken) => {
    if (token.address === exclude) return;
    onSelect(token);
    setQuery("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="group inline-flex items-center gap-2 bg-transparent text-left transition-colors"
        >
          <TokenLogo token={value} size={16} chainId={chain.id} />
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground transition-colors group-hover:text-foreground">
            {value.name}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground/60 transition-colors group-hover:text-foreground" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select a token</DialogTitle>
          <DialogDescription className="sr-only">
            Search by symbol, name, or paste a token contract address.
          </DialogDescription>
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
                      <TokenLogo token={t} size={16} chainId={chain.id} />
                      <span className="text-xs">{t.symbol}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="-mx-6 max-h-80 overflow-y-auto border-t">
            {filtered.length > 0 ? (
              filtered.map((t) => {
                const isSelected = t.address === value.address;
                const isExcluded = t.address === exclude;
                const bal: TokenBalance | null = balances.get(t.address) ?? null;
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
                    <TokenLogo token={t} size={32} chainId={chain.id} />
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
                    {isConnected && (
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {bal ? formatBalanceDisplay(bal.displayValue) : "…"}
                      </span>
                    )}
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </button>
                );
              })
            ) : isAddress(queryTrimmed) ? (
              // Address pasted but not in token list — resolve it on-the-fly.
              lookup.isLoading ? (
                <p className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Resolving token…
                </p>
              ) : lookup.data ? (
                <button
                  type="button"
                  disabled={lookup.data.address === exclude}
                  onClick={() => choose(lookup.data!)}
                  className={cn(
                    "flex w-full items-center gap-3 px-6 py-2.5 text-left transition-colors",
                    lookup.data.address === exclude
                      ? "cursor-not-allowed opacity-40"
                      : "hover:bg-accent",
                  )}
                >
                  <TokenLogo token={lookup.data} size={32} chainId={chain.id} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold">{lookup.data.symbol}</span>
                      <span className="truncate text-xs text-muted-foreground">{lookup.data.name}</span>
                    </div>
                    <p className="truncate font-mono text-[10px] text-muted-foreground">
                      {`${lookup.data.address.slice(0, 6)}…${lookup.data.address.slice(-4)}`}
                    </p>
                  </div>
                </button>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No ERC-20 token found at this address
                </p>
              )
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No tokens found</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SwapWidget() {
  const { chain } = useSwapChain();
  const { address, isConnected } = useUserAddress();
  const writer = useWriteAccount();
  const activeWallet = useActiveWallet();
  const activeChain = useActiveWalletChain();
  const isWrongNetwork = isConnected && activeChain?.id !== chain.id;

  // Default sell/buy come from the selected chain's registry. When the chain
  // changes, the effect below resets them to that chain's defaults.
  const initialPair = React.useMemo(() => getDefaultPair(chain), [chain]);
  const [sellToken, setSellToken] = React.useState<SwapToken>(initialPair.sell);
  const [buyToken, setBuyToken] = React.useState<SwapToken>(initialPair.buy);
  const [sellAmount, setSellAmount] = React.useState("");
  const [supportFee, setSupportFee] = React.useState(true);

  const [price, setPrice] = React.useState<ZeroExPriceResponse | null>(null);
  const [isFetching, setIsFetching] = React.useState(false);
  const [needsApproval, setNeedsApproval] = React.useState(false);
  const [approvalTarget, setApprovalTarget] = React.useState<Address | null>(null);

  const [isApproving, setIsApproving] = React.useState(false);
  const [isSwapping, setIsSwapping] = React.useState(false);
  const [isSwitchingChain, setIsSwitchingChain] = React.useState(false);

  // Discover all ERC-20 tokens the user holds on this chain, merged with the
  // curated hardcoded list. Falls back to the hardcoded list when disconnected.
  const { tokens: availableTokens, usdValues } = useWalletTokens({
    chain,
    userAddress: isConnected ? (address as Address | undefined) : undefined,
  });

  // Live balances for the currently-picked sell/buy tokens on the selected
  // chain. Both honor `useUserAddress`'s SA-vs-EOA view mode automatically
  // because we pass `address` straight through.
  const sellBalance = useTokenBalance({
    chain,
    userAddress: address as Address | undefined,
    token: sellToken,
  });
  const buyBalance = useTokenBalance({
    chain,
    userAddress: address as Address | undefined,
    token: buyToken,
  });

  /** "Use max" — fills the sell input with the full token balance. */
  const handleUseMax = () => {
    const bal = sellBalance.data;
    if (!bal || bal.value === 0n) return;
    setSellAmount(bal.displayValue);
  };

  // When the user switches chain, reset everything to that chain's defaults.
  // Tokens from a previous chain are nonsense to 0x for the new chainId.
  React.useEffect(() => {
    const pair = getDefaultPair(chain);
    setSellToken(pair.sell);
    setBuyToken(pair.buy);
    setSellAmount("");
    setPrice(null);
    setNeedsApproval(false);
    setApprovalTarget(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chain.id]);

  // Debounced indicative price fetch.
  // 0x requires a `taker` for every price call. When the user hasn't connected
  // yet, fall back to a sentinel address so we can still show an indicative
  // quote — the issues.allowance / issues.balance fields will be meaningless
  // until they connect, and the effect re-runs once `address` populates.
  React.useEffect(() => {
    const numeric = Number(sellAmount);
    if (!sellAmount || Number.isNaN(numeric) || numeric <= 0) {
      setPrice(null);
      setNeedsApproval(false);
      setApprovalTarget(null);
      return;
    }

    // 0x rejects takers numerically below 0xffff, so the canonical "0x..dEaD"
    // burn address fails validation. Use a clearly-synthetic sentinel that
    // sits well above the threshold for indicative quotes.
    const PREVIEW_TAKER = "0xdEAD000000000000000042069420694206942069" as Address;
    const taker = (address ?? PREVIEW_TAKER) as Address;
    const isPreviewOnly = !address;

    let cancelled = false;
    const timeout = setTimeout(async () => {
      try {
        setIsFetching(true);
        const rawAmount = parseUnits(sellAmount, sellToken.decimals).toString();
        const params = new URLSearchParams({
          chainId: String(chain.id),
          sellToken: sellToken.address,
          buyToken: buyToken.address,
          sellAmount: rawAmount,
          taker,
        });
        if (supportFee) params.set("fee", "1");

        const res = await fetch(`/api/0x/price?${params.toString()}`);
        const data: ZeroExPriceResponse = await res.json();
        if (cancelled) return;

        setPrice(data);
        // Only trust allowance/balance signals when we have the real taker.
        const spender = data?.issues?.allowance?.spender as Address | undefined;
        const requiresApproval =
          !isPreviewOnly &&
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
  }, [sellAmount, sellToken, buyToken, address, supportFee, chain.id]);

  const flip = () => {
    setSellToken(buyToken);
    setBuyToken(sellToken);
    // Preserve the typed amount across flips — the value is now interpreted
    // as the new sell token; the debounced price effect will refetch.
    setPrice(null);
    setNeedsApproval(false);
    setApprovalTarget(null);
  };

  const handleSwitchChain = async () => {
    if (!activeWallet || isSwitchingChain) return;
    setIsSwitchingChain(true);
    try {
      await activeWallet.switchChain(chain.thirdwebChain);
      toast.success(`Switched to ${chain.name}`);
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
      toast.error("Cannot approve", { description: `Connect a wallet on ${chain.name}.` });
      return;
    }
    setIsApproving(true);
    try {
      await ensureOnChain(writer.wallet, chain.thirdwebChain);
      const tx = prepareContractCall({
        contract: {
          client,
          chain: chain.thirdwebChain,
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
      await waitForReceipt({ client, chain: chain.thirdwebChain, transactionHash: txHash });
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
      await ensureOnChain(writer.wallet, chain.thirdwebChain);

      const rawAmount = parseUnits(sellAmount, sellToken.decimals).toString();
      const params = new URLSearchParams({
        chainId: String(chain.id),
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
        chain: chain.thirdwebChain,
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

      await waitForReceipt({ client, chain: chain.thirdwebChain, transactionHash: txHash });
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
  // Only trust 0x's balance signal when we have a real taker. The sentinel
  // address used pre-connection holds zero of everything, so 0x would
  // always flag "insufficient" — misleading when no wallet is connected.
  const insufficientBalance = isConnected && Boolean(price?.issues?.balance);
  const canSwap =
    isConnected &&
    !isWrongNetwork &&
    hasAmount &&
    !needsApproval &&
    !insufficientBalance &&
    Boolean(price?.liquidityAvailable) &&
    !isLoading;

  // Inline rate string (e.g. "1 ETH ≈ 2,845.20 USDC") — only when liquidity is available.
  const rateLine = React.useMemo(() => {
    if (!price?.liquidityAvailable || !price.buyAmount || !price.sellAmount) return null;
    try {
      const sellNum = parseFloat(formatUnits(BigInt(price.sellAmount), sellToken.decimals));
      const buyNum = parseFloat(formatUnits(BigInt(price.buyAmount), buyToken.decimals));
      if (sellNum <= 0) return null;
      const ratio = buyNum / sellNum;
      const formatted =
        ratio < 0.0001
          ? ratio.toExponential(3)
          : ratio < 1
            ? ratio.toFixed(6)
            : ratio.toLocaleString(undefined, { maximumFractionDigits: 4 });
      return `1 ${sellToken.symbol} ≈ ${formatted} ${buyToken.symbol}`;
    } catch {
      return null;
    }
  }, [price, sellToken, buyToken]);

  // Sell-side caption: prefer error states, otherwise show the network fee.
  const sellCaption = insufficientBalance
    ? `Insufficient ${sellToken.symbol} balance`
    : price?.liquidityAvailable === false
      ? "No liquidity for this pair"
      : networkFeeEth && price?.liquidityAvailable
        ? `~${networkFeeEth} ETH network fee`
        : "Enter an amount above";

  return (
    <div className="overflow-hidden bg-transparent">
      <div className="space-y-7 p-6 md:px-9 md:py-8">
        {/* Editorial strip: FROM | arrow | TO */}
        <div className="grid grid-cols-1 items-end gap-y-7 md:grid-cols-[1fr_auto_1fr] md:gap-y-0">
          {/* FROM */}
          <div className="md:border-r md:border-border md:pr-7">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <TokenPicker
                value={sellToken}
                tokens={availableTokens}
                exclude={buyToken.address}
                onSelect={(t) => {
                  setSellToken(t);
                  setSellAmount("");
                  setPrice(null);
                }}
                label="Sell token"
                chain={chain}
                userAddress={address as Address | undefined}
                isConnected={isConnected}
                usdValues={usdValues}
              />
              {isConnected && (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="text-muted-foreground/60">Balance:</span>
                  <span className="font-mono">
                    {sellBalance.isLoading
                      ? "…"
                      : sellBalance.data
                        ? formatBalanceDisplay(sellBalance.data.displayValue)
                        : "—"}
                  </span>
                  {sellBalance.data && sellBalance.data.value > 0n && (
                    <button
                      type="button"
                      onClick={handleUseMax}
                      className="rounded-sm px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-blue-700 transition-colors hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900/30"
                    >
                      MAX
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-baseline gap-3 border-b border-border pb-2.5 transition-colors focus-within:border-foreground/40">
              <Input
                type="number"
                inputMode="decimal"
                step="any"
                placeholder="0"
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
                aria-label="Sell amount"
                className="h-auto flex-1 border-0 bg-transparent p-0 text-[44px] font-thin leading-none tracking-[-2px] text-foreground shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/30 md:text-[56px] md:tracking-[-3px] dark:bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="shrink-0 text-xl font-light tracking-tight text-muted-foreground/60 md:text-2xl">
                {sellToken.symbol}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground/70">
              {isFetching ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" /> Fetching price…
                </span>
              ) : (
                sellCaption
              )}
            </p>
          </div>

          {/* CENTER — flip arrow with springy easing */}
          <div className="flex justify-center px-0 py-2 md:px-7 md:py-0">
            <button
              type="button"
              onClick={flip}
              aria-label="Flip tokens"
              className="group rounded-full p-2 text-muted-foreground transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:rotate-180 hover:scale-110 hover:text-foreground motion-reduce:transition-none motion-reduce:hover:rotate-0 motion-reduce:hover:scale-100"
            >
              <ArrowRight className="hidden h-5 w-5 md:block" />
              <ArrowRight className="h-5 w-5 rotate-90 md:hidden" />
            </button>
          </div>

          {/* TO */}
          <div className="md:pl-7">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <TokenPicker
                value={buyToken}
                tokens={availableTokens}
                exclude={sellToken.address}
                onSelect={(t) => {
                  setBuyToken(t);
                  setPrice(null);
                }}
                label="Buy token"
                chain={chain}
                userAddress={address as Address | undefined}
                isConnected={isConnected}
                usdValues={usdValues}
              />
              {isConnected && (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="text-muted-foreground/60">Balance:</span>
                  <span className="font-mono">
                    {buyBalance.isLoading
                      ? "…"
                      : buyBalance.data
                        ? formatBalanceDisplay(buyBalance.data.displayValue)
                        : "—"}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-baseline gap-3 border-b border-border pb-2.5">
              <span className="flex-1 truncate text-[44px] font-thin leading-none tracking-[-2px] text-foreground/90 md:text-[56px] md:tracking-[-3px]">
                {isFetching ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
                ) : (
                  <span
                    className={
                      price?.liquidityAvailable ? "text-foreground" : "text-muted-foreground/30"
                    }
                  >
                    {buyDisplay}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-xl font-light tracking-tight text-muted-foreground/60 md:text-2xl">
                {buyToken.symbol}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground/70">
              {rateLine ?? <span className="text-muted-foreground/40">Best across 150+ DEXes</span>}
            </p>
          </div>
        </div>

        {/* Hairline divider */}
        <div className="h-px bg-border" />

        {/* CTA + footer */}
        <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-center">
          <div className="md:flex-shrink-0">
            {!isConnected ? (
              <Button
                variant="outline"
                size="lg"
                disabled
                className="w-full rounded-full px-7 text-[13px] font-medium tracking-wide md:w-auto"
              >
                Connect wallet to swap
              </Button>
            ) : isWrongNetwork ? (
              <Button
                size="lg"
                onClick={handleSwitchChain}
                disabled={isSwitchingChain}
                className="w-full rounded-full px-7 text-[13px] font-medium tracking-wide md:w-auto"
              >
                {isSwitchingChain ? "Switching…" : `Switch to ${chain.name}`}
              </Button>
            ) : needsApproval ? (
              <Button
                size="lg"
                onClick={handleApprove}
                disabled={isApproving}
                className="w-full rounded-full px-7 text-[13px] font-medium tracking-wide md:w-auto"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Approving {sellToken.symbol}…
                  </>
                ) : (
                  `Approve ${sellToken.symbol}`
                )}
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={handleSwap}
                disabled={!canSwap}
                className="w-full rounded-full px-7 text-[13px] font-medium tracking-wide md:w-auto"
              >
                {isSwapping ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Swapping…
                  </>
                ) : !hasAmount ? (
                  "Enter an amount"
                ) : (
                  `Swap ${sellToken.symbol} → ${buyToken.symbol}`
                )}
              </Button>
            )}
          </div>

          <div className="hidden h-px flex-1 bg-border md:block" />

          {/* Fee opt-in */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="support-treasury-fee"
              checked={supportFee}
              onCheckedChange={(v) => setSupportFee(v === true)}
              className="h-3.5 w-3.5"
            />
            <label
              htmlFor="support-treasury-fee"
              className="flex cursor-pointer items-center gap-1 text-[11px] text-muted-foreground"
            >
              Support Gnars treasury (0.5%)
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
        </div>
      </div>
    </div>
  );
}
