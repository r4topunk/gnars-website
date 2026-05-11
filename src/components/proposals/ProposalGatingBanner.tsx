"use client";

import { useTranslations } from "next-intl";
import { useReadContract } from "wagmi";
import { ConnectButton } from "@/components/ui/ConnectButton";
import { useUserAddress } from "@/hooks/use-user-address";
import { Link } from "@/i18n/navigation";
import { CHAIN, DAO_ADDRESSES } from "@/lib/config";

const balanceOfAbi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

type BannerVariant = "disconnected" | "no-nft" | null;

export function ProposalGatingBanner() {
  const { address, isConnected } = useUserAddress();
  const t = useTranslations("proposals");

  const { data: nftBalance, isLoading } = useReadContract({
    address: DAO_ADDRESSES.token,
    abi: balanceOfAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: CHAIN.id,
    query: { enabled: Boolean(address) },
  });

  const hasGnar = typeof nftBalance === "bigint" && nftBalance > 0n;

  let variant: BannerVariant = null;
  if (!isConnected) variant = "disconnected";
  else if (!isLoading && !hasGnar) variant = "no-nft";

  if (!variant) return null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/[0.08] via-amber-500/[0.04] to-transparent dark:from-amber-500/[0.12] dark:via-amber-500/[0.06] dark:to-transparent">
      {/* Decorative noggles watermark */}
      <div
        className="pointer-events-none absolute -right-4 top-1/2 -translate-y-1/2 select-none text-[5rem] leading-none opacity-[0.06] dark:opacity-[0.08]"
        aria-hidden="true"
      >
        ⌐◨-◨
      </div>

      <div className="relative flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        {/* Left: amber pip + message */}
        <div className="flex items-start gap-3 sm:items-center">
          <span className="mt-0.5 flex h-2 w-2 shrink-0 rounded-full bg-amber-500 sm:mt-0" />

          {variant === "disconnected" ? (
            <p className="text-sm leading-relaxed text-foreground/80">
              <span className="font-medium text-foreground">{t("gating.walletNotConnected")}</span>{" "}
              {t("gating.walletNotConnectedDesc")}
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-foreground/80">
              <span className="font-medium text-foreground">{t("gating.noGnarFound")}</span>{" "}
              {t("gating.noGnarFoundDesc")}{" "}
              <Link
                href="/"
                className="font-medium text-amber-600 underline decoration-amber-600/40 underline-offset-2 transition-colors hover:text-amber-500 hover:decoration-amber-500 dark:text-amber-400 dark:decoration-amber-400/40 dark:hover:text-amber-300"
              >
                {t("gating.getOneAtAuction")}
              </Link>
            </p>
          )}
        </div>

        {/* Right: action */}
        {variant === "disconnected" && (
          <div className="shrink-0 sm:ml-auto">
            <ConnectButton />
          </div>
        )}
      </div>
    </div>
  );
}
