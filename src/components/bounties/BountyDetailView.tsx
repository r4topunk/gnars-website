"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  User,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { useConnectModal } from "thirdweb/react";
import { formatEther } from "viem";
import { useReadContract } from "wagmi";
import { ClaimBountyModal } from "@/components/bounties/ClaimBountyModal";
import { MediaEmbed } from "@/components/bounties/MediaEmbed";
import { VoteDashboard } from "@/components/bounties/VoteDashboard";
import { AddressDisplay } from "@/components/ui/address-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatEthToUsd, useEthPrice } from "@/hooks/use-eth-price";
import { useUserAddress } from "@/hooks/use-user-address";
import {
  usePoidhAcceptClaim,
  usePoidhCancelBounty,
  usePoidhClaimRefundFromCancelledBounty,
  usePoidhJoinBounty,
  usePoidhResetVotingPeriod,
  usePoidhResolveVote,
  usePoidhSubmitClaimForVote,
  usePoidhVoteClaim,
} from "@/hooks/usePoidhContract";
import { POIDH_ABI } from "@/lib/poidh/abi";
import { CHAIN_NAMES, getExplorerUrl, getTxUrl, POIDH_CONTRACTS } from "@/lib/poidh/config";
import { getThirdwebClient } from "@/lib/thirdweb";
import { THIRDWEB_AA_CONFIG, THIRDWEB_WALLETS } from "@/lib/thirdweb-wallets";
import type { PoidhBounty } from "@/types/poidh";

const VIDEO_EXTENSIONS = /\.(mov|mp4|webm|ogg|m4v)(\?.*)?$/i;
const IPFS_GATEWAYS = [
  "ipfs.skatehive.app",
  "ipfs.io",
  "cloudflare-ipfs.com",
  "gateway.pinata.cloud",
  "dweb.link",
];

const ALLOWED_IFRAME_HOSTS = [
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "vimeo.com",
  "player.vimeo.com",
  "3speak.tv",
];

function isAllowedIframeSrc(src: string): boolean {
  try {
    const { hostname } = new URL(src);
    return ALLOWED_IFRAME_HOSTS.some((host) => hostname === host || hostname.endsWith("." + host));
  } catch {
    return false;
  }
}

const SANITIZE_SCHEMA = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "iframe"],
  attributes: {
    ...defaultSchema.attributes,
    iframe: ["src", "allowFullScreen", "width", "height", "frameBorder"],
  },
};

/** URL has a known video extension — safe to embed directly in <video> */
function isEmbeddableVideo(url: string | undefined): boolean {
  if (!url) return false;
  return VIDEO_EXTENSIONS.test(url);
}

/** Bare IPFS CID with no extension — gateway may send Content-Disposition: attachment,
 *  so we must NOT embed as <video> or <img>; show a link instead. */
function isIpfsCid(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const { hostname, pathname } = new URL(url);
    if (IPFS_GATEWAYS.some((gw) => hostname.includes(gw))) {
      const segment = pathname.split("/").pop() || "";
      return !segment.includes(".");
    }
  } catch {
    /* invalid URL */
  }
  return false;
}

const STATUS_STYLES = {
  Canceled: "bg-red-500/10 text-red-400 border-red-500/20",
  Voting: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  Open: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
} as const;

function getStatus(bounty: PoidhBounty): keyof typeof STATUS_STYLES {
  if (bounty.isCanceled) return "Canceled";
  if (bounty.isVoting) return "Voting";
  return "Open";
}

function useCountdown(deadline: number | null): string {
  const getLabel = () => {
    if (!deadline) return "";
    const diff = deadline * 1000 - Date.now();
    if (diff <= 0) return "Expired";
    const days = Math.floor(diff / 86_400_000);
    const hours = Math.floor((diff % 86_400_000) / 3_600_000);
    const minutes = Math.floor((diff % 3_600_000) / 60_000);
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);
    return parts.join(" ");
  };

  const [label, setLabel] = useState(getLabel);

  useEffect(() => {
    if (!deadline) return;
    const id = setInterval(() => setLabel(getLabel()), 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline]);

  return label;
}

interface BountyDetailViewProps {
  initialBounty: PoidhBounty;
  chainId: number;
  bountyId: number;
}

export function BountyDetailView({ initialBounty, chainId, bountyId }: BountyDetailViewProps) {
  const { address, isConnected } = useUserAddress();
  const { connect: openConnectModal } = useConnectModal();
  const handleConnect = async () => {
    const client = getThirdwebClient();
    if (!client) return;
    try {
      await openConnectModal({
        client,
        wallets: THIRDWEB_WALLETS,
        accountAbstraction: THIRDWEB_AA_CONFIG,
        size: "compact",
        title: "Connect to contribute",
      });
      setShowConnectDialog(false);
    } catch {
      // user cancelled
    }
  };
  const { data } = useQuery<{ bounty: PoidhBounty }>({
    queryKey: ["poidh-bounty", chainId, bountyId],
    queryFn: async () => {
      const res = await fetch(`/api/poidh/bounty/${chainId}/${bountyId}`);
      if (!res.ok) throw new Error("Bounty not found");
      return res.json();
    },
    initialData: { bounty: initialBounty },
    staleTime: 60_000,
  });

  const bounty = data?.bounty;
  const queryClient = useQueryClient();

  const { ethPrice } = useEthPrice();
  const [joinAmount, setJoinAmount] = useState("0.001");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showConnectDialog, setShowConnectDialog] = useState(false);

  const cancelHook = usePoidhCancelBounty(chainId);
  const joinHook = usePoidhJoinBounty(chainId);
  const claimRefundHook = usePoidhClaimRefundFromCancelledBounty(chainId);
  const acceptClaimHook = usePoidhAcceptClaim(chainId);
  const submitForVoteHook = usePoidhSubmitClaimForVote(chainId);
  const voteClaimHook = usePoidhVoteClaim(chainId);
  const resolveVoteHook = usePoidhResolveVote(chainId);
  const resetVotingHook = usePoidhResetVotingPeriod(chainId);

  // Refresh bounty state after actions that change on-chain status
  const bountyQueryKey = ["poidh-bounty", chainId, bountyId];
  useEffect(() => {
    if (submitForVoteHook.isSuccess) {
      queryClient.invalidateQueries({ queryKey: bountyQueryKey });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitForVoteHook.isSuccess]);
  useEffect(() => {
    if (resolveVoteHook.isSuccess) {
      queryClient.invalidateQueries({ queryKey: bountyQueryKey });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolveVoteHook.isSuccess]);
  useEffect(() => {
    if (cancelHook.isSuccess) {
      queryClient.invalidateQueries({ queryKey: bountyQueryKey });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancelHook.isSuccess]);

  const deadlineTimestamp = bounty?.deadline ?? null;
  const countdown = useCountdown(deadlineTimestamp);

  const isJoinable = bounty?.isOpenBounty || bounty?.isMultiplayer;

  const { data: participantsData } = useReadContract({
    address: POIDH_CONTRACTS[chainId],
    abi: POIDH_ABI,
    functionName: "getParticipants",
    args: [BigInt(bounty?.onChainId ?? 0)],
    chainId,
    query: { enabled: !!(bounty && isJoinable) },
  });
  const participants = participantsData?.[0] as `0x${string}`[] | undefined;
  const participantAmounts = participantsData?.[1] as bigint[] | undefined;

  const { data: hadExternalContributor } = useReadContract({
    address: POIDH_CONTRACTS[chainId],
    abi: POIDH_ABI,
    functionName: "everHadExternalContributor",
    args: [BigInt(bounty?.onChainId ?? 0)],
    chainId,
    query: { enabled: !!bounty?.onChainId },
  });

  if (!bounty) return null;

  const chainName = CHAIN_NAMES[chainId as keyof typeof CHAIN_NAMES] || "Unknown";
  const amountEth = formatEther(BigInt(bounty.amount));
  const ethAmount = parseFloat(amountEth);
  const usdValue = formatEthToUsd(ethAmount, ethPrice);
  const explorerUrl = getExplorerUrl(chainId, bounty.issuer);
  const createdDate = new Date(bounty.createdAt * 1000);
  const deadlineDate = bounty.deadline ? new Date(bounty.deadline * 1000) : null;
  const status = getStatus(bounty);
  const isCreator = address?.toLowerCase() === bounty.issuer.toLowerCase();
  const isActive = !bounty.isCanceled && !bounty.isVoting;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Back */}
      <Button asChild variant="ghost" size="sm" className="mb-6">
        <Link href="/community/bounties">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Bounties
        </Link>
      </Button>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Badge variant="outline">{chainName}</Badge>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${STATUS_STYLES[status]}`}
          >
            {status}
          </span>
          {bounty.isOpenBounty && <Badge variant="secondary">Open Bounty</Badge>}
          {bounty.isMultiplayer && <Badge variant="secondary">Multiplayer</Badge>}
        </div>

        <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
          {bounty.title || bounty.name}
        </h1>

        <div className="flex items-baseline gap-3">
          <span className="text-4xl md:text-5xl font-bold">{ethAmount.toFixed(4)}</span>
          <span className="text-xl text-muted-foreground">ETH</span>
          {ethPrice > 0 && (
            <span className="text-lg font-medium text-emerald-600 dark:text-emerald-400">
              {usdValue}
            </span>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main content — Objective + Claims */}
        <div className="md:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Objective</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground leading-relaxed prose prose-invert prose-sm max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw, [rehypeSanitize, SANITIZE_SCHEMA]]}
                  components={{
                    img: ({ src, alt }) => {
                      const url = typeof src === "string" ? src : "";
                      if (isEmbeddableVideo(url)) {
                        return (
                          <video
                            src={url}
                            className="rounded-lg max-w-full h-auto my-2"
                            controls
                            muted
                            playsInline
                          >
                            <track kind="captions" />
                          </video>
                        );
                      }
                      if (isIpfsCid(url)) {
                        return (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1 my-2"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View media
                          </a>
                        );
                      }
                      return (
                        <Dialog>
                          <DialogTrigger asChild>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={alt || ""}
                              className="rounded-lg max-w-full h-auto my-2 cursor-pointer hover:opacity-90 transition-opacity"
                              loading="lazy"
                            />
                          </DialogTrigger>
                          <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-0 bg-transparent">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={alt || ""}
                              className="w-full h-auto max-h-[95vh] object-contain"
                            />
                          </DialogContent>
                        </Dialog>
                      );
                    },
                    a: ({ href, children }) => {
                      if (isEmbeddableVideo(href)) {
                        return (
                          <video
                            src={href}
                            className="rounded-lg max-w-full h-auto my-2"
                            controls
                            muted
                            playsInline
                          >
                            <track kind="captions" />
                          </video>
                        );
                      }
                      return (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {children}
                        </a>
                      );
                    },
                    p: ({ children }) => <p className="whitespace-pre-wrap mb-2">{children}</p>,
                  }}
                >
                  {bounty.description}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>

          {bounty.isCanceled && (
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="py-4 flex items-center gap-3 text-sm text-muted-foreground">
                <XCircle className="w-5 h-5 text-destructive shrink-0" />
                This bounty has been canceled.
              </CardContent>
            </Card>
          )}

          {/* No claims yet — empty state */}
          {isActive && (!bounty.claims || bounty.claims.length === 0) && (
            <Card className="border-dashed">
              <CardContent className="py-10 flex flex-col items-center text-center gap-3">
                <div className="text-4xl">🎬</div>
                <div>
                  <p className="font-semibold text-base">No claims yet</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    Be the first to complete this challenge. Film your proof and submit it on-chain.
                  </p>
                </div>
                <ClaimBountyModal bounty={bounty}>
                  <Button size="lg" className="mt-2">
                    Join
                  </Button>
                </ClaimBountyModal>
              </CardContent>
            </Card>
          )}

          {/* Claims */}
          {bounty.claims && bounty.claims.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Submitted Claims ({bounty.claims.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {bounty.claims.map((claim) => (
                  <div key={claim.id} className="rounded-md border border-border p-4 space-y-3">
                    {/* Claim header: name + accepted badge */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm">{claim.name}</p>
                      {claim.accepted && (
                        <Badge variant="default" className="shrink-0">
                          <CheckCircle2 className="w-3 h-3" /> Accepted
                        </Badge>
                      )}
                    </div>

                    {/* Claim media */}
                    {claim.url && (
                      <div>
                        <MediaEmbed url={claim.url} alt={claim.name} />
                      </div>
                    )}

                    {/* Claim description (markdown with auto-linked URLs) */}
                    {(() => {
                      // Strip the media URL from description to avoid duplicate "View media" links
                      const desc = claim.url
                        ? claim.description.replace(claim.url, "").trim()
                        : claim.description;
                      if (!desc) return null;
                      return (
                        <div className="text-sm text-muted-foreground prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw, [rehypeSanitize, SANITIZE_SCHEMA]]}
                            components={{
                              img: ({ src, alt }) => {
                                const url = typeof src === "string" ? src : "";
                                if (isEmbeddableVideo(url)) {
                                  return (
                                    <video
                                      src={url}
                                      className="rounded-md max-w-full h-auto max-h-48 my-2"
                                      controls
                                      muted
                                      playsInline
                                    >
                                      <track kind="captions" />
                                    </video>
                                  );
                                }
                                if (isIpfsCid(url)) {
                                  return (
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline flex items-center gap-1 my-1"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      View media
                                    </a>
                                  );
                                }
                                return (
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={url}
                                        alt={alt || ""}
                                        className="rounded-md max-w-full h-auto max-h-48 cursor-pointer hover:opacity-90 transition-opacity my-2"
                                        loading="lazy"
                                      />
                                    </DialogTrigger>
                                    <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-0 bg-transparent">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={url}
                                        alt={alt || ""}
                                        className="w-full h-auto max-h-[95vh] object-contain"
                                      />
                                    </DialogContent>
                                  </Dialog>
                                );
                              },
                              a: ({ href, children }) => {
                                if (isEmbeddableVideo(href)) {
                                  return (
                                    <video
                                      src={href}
                                      className="rounded-md max-w-full h-auto max-h-48 my-2"
                                      controls
                                      muted
                                      playsInline
                                    >
                                      <track kind="captions" />
                                    </video>
                                  );
                                }
                                return (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline break-all"
                                  >
                                    {children}
                                  </a>
                                );
                              },
                              iframe: ({ src }) => {
                                const url = typeof src === "string" ? src : "";
                                if (!url || !isAllowedIframeSrc(url)) return null;
                                return <MediaEmbed url={url} />;
                              },
                              p: ({ children }) => (
                                <p className="whitespace-pre-wrap mb-1">{children}</p>
                              ),
                            }}
                          >
                            {desc}
                          </ReactMarkdown>
                        </div>
                      );
                    })()}

                    {/* Claim footer: address + date + actions */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <AddressDisplay
                          address={claim.issuer as `0x${string}`}
                          variant="compact"
                          showAvatar={true}
                          showCopy={false}
                          showExplorer={false}
                          avatarSize="xs"
                          customExplorerUrl={getExplorerUrl(chainId, claim.issuer)}
                          onAddressClick={() =>
                            window.open(
                              getExplorerUrl(chainId, claim.issuer),
                              "_blank",
                              "noopener,noreferrer",
                            )
                          }
                        />
                        {claim.createdAt > 0 && (
                          <>
                            <span>•</span>
                            <span>{new Date(claim.createdAt * 1000).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                      {/* Accept button (creator only, solo bounties or open bounties with no contributors) */}
                      {isCreator &&
                        !claim.accepted &&
                        !bounty.isCanceled &&
                        !hadExternalContributor && (
                          <Button
                            size="sm"
                            variant="default"
                            disabled={acceptClaimHook.isPending}
                            onClick={() => acceptClaimHook.accept(bounty.onChainId, claim.onChainId)}
                          >
                            {acceptClaimHook.isPending ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Accepting...
                              </>
                            ) : (
                              "Accept Claim"
                            )}
                          </Button>
                        )}
                      {/* Guide issuer to use vote flow when open bounty had contributors */}
                      {isCreator &&
                        !claim.accepted &&
                        !bounty.isCanceled &&
                        hadExternalContributor &&
                        !bounty.isVoting && (
                          <p className="text-xs text-muted-foreground">
                            Use <strong>Submit for Vote</strong> — contributors must vote to accept.
                          </p>
                        )}
                    </div>
                    {/* Accept success message */}
                    {acceptClaimHook.isSuccess && acceptClaimHook.hash && (
                      <div className="flex items-center gap-2 py-2 px-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Claim accepted!</span>
                        <a
                          href={getTxUrl(chainId, acceptClaimHook.hash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto flex items-center gap-1 hover:underline"
                        >
                          View tx <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {/* Submit for Vote — show for contributors/creator when bounty is not yet in voting */}
                    {!bounty.isVoting &&
                      !bounty.isCanceled &&
                      isConnected &&
                      (isCreator ||
                        participants?.some((p) => p.toLowerCase() === address?.toLowerCase())) && (
                        <div className="pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            disabled={submitForVoteHook.isPending}
                            onClick={() => submitForVoteHook.submit(bounty.onChainId, claim.onChainId)}
                          >
                            {submitForVoteHook.isPending ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Submitting...
                              </>
                            ) : submitForVoteHook.isSuccess ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Submitted
                              </>
                            ) : (
                              "Submit for Vote"
                            )}
                          </Button>
                          {submitForVoteHook.error && (
                            <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-2 py-1.5 text-xs text-destructive mt-1">
                              <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                              <span>{submitForVoteHook.error.message.split("\n")[0]}</span>
                            </div>
                          )}
                        </div>
                      )}

                    {/* Voting controls — Vote Yes/No and Resolve when bounty.isVoting */}
                    {bounty.isVoting && isConnected && (
                      <div className="pt-1 space-y-2">
                        {/* Vote Yes / Vote No */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                            disabled={voteClaimHook.isPending}
                            onClick={() => voteClaimHook.vote(bounty.onChainId, true)}
                          >
                            {voteClaimHook.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              "Vote Yes"
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-red-500/30 text-red-500 hover:bg-red-500/10"
                            disabled={voteClaimHook.isPending}
                            onClick={() => voteClaimHook.vote(bounty.onChainId, false)}
                          >
                            {voteClaimHook.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              "Vote No"
                            )}
                          </Button>
                        </div>
                        {voteClaimHook.error && (
                          <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-2 py-1.5 text-xs text-destructive">
                            <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                            <span>{voteClaimHook.error.message.split("\n")[0]}</span>
                          </div>
                        )}
                        {voteClaimHook.isSuccess && voteClaimHook.hash && (
                          <div className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            <span>Vote cast!</span>
                            <a
                              href={getTxUrl(chainId, voteClaimHook.hash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-auto flex items-center gap-1 hover:underline"
                            >
                              View tx <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                        {/* Resolve vote */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          disabled={resolveVoteHook.isPending}
                          onClick={() => resolveVoteHook.resolve(bounty.onChainId)}
                        >
                          {resolveVoteHook.isPending ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              {resolveVoteHook.hash ? "Confirming…" : "Confirm in wallet…"}
                            </>
                          ) : resolveVoteHook.isSuccess ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Resolved
                            </>
                          ) : (
                            "Resolve Vote"
                          )}
                        </Button>
                        {resolveVoteHook.error && (
                          <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-2 py-1.5 text-xs text-destructive">
                            <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                            <span>{resolveVoteHook.error.message.split("\n")[0]}</span>
                          </div>
                        )}
                        {resolveVoteHook.isSuccess && resolveVoteHook.hash && (
                          <div className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            <span>Vote resolved!</span>
                            <a
                              href={getTxUrl(chainId, resolveVoteHook.hash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-auto flex items-center gap-1 hover:underline"
                            >
                              View tx <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                        {/* Reset voting period — recovery if vote failed (contract reverts if vote would have passed) */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full text-xs text-muted-foreground"
                          disabled={resetVotingHook.isPending}
                          onClick={() => resetVotingHook.resetVoting(bounty.onChainId)}
                        >
                          {resetVotingHook.isPending ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Resetting…
                            </>
                          ) : (
                            "Reset voting period (if vote failed)"
                          )}
                        </Button>
                        {resetVotingHook.error && (
                          <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-2 py-1.5 text-xs text-destructive">
                            <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                            <span>{resetVotingHook.error.message.split("\n")[0]}</span>
                          </div>
                        )}
                        {resetVotingHook.isSuccess && resetVotingHook.hash && (
                          <div className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            <span>Voting period reset.</span>
                            <a
                              href={getTxUrl(chainId, resetVotingHook.hash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-auto flex items-center gap-1 hover:underline"
                            >
                              View tx <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar — actions first, then info */}
        <div className="space-y-4">
          {/* Submit claim */}
          {isActive && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Submit Your Proof</CardTitle>
                <CardDescription>
                  Have proof of completion? Submit a claim directly on-chain.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ClaimBountyModal bounty={bounty}>
                  <Button size="lg" className="w-full">
                    Join
                  </Button>
                </ClaimBountyModal>
              </CardContent>
            </Card>
          )}

          {/* Join open bounty (add funds) */}
          {isJoinable && !bounty.isCanceled && !bounty.isVoting && (
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Add to the Prize Pool</CardTitle>
                <CardDescription>
                  Contribute ETH to increase the reward for this bounty.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {joinHook.isSuccess ? (
                  <div className="flex flex-col items-center gap-2 py-2 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    <p className="text-sm font-medium">Contribution confirmed!</p>
                    {joinHook.hash && (
                      <a
                        href={getTxUrl(chainId, joinHook.hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        View tx <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-1"
                      onClick={() => joinHook.reset()}
                    >
                      Contribute more
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.0001"
                        min="0.0001"
                        className="flex-1"
                        value={joinAmount}
                        onChange={(e) => setJoinAmount(e.target.value)}
                        disabled={joinHook.isPending}
                      />
                      <span className="flex items-center text-sm text-muted-foreground px-2">
                        ETH
                      </span>
                    </div>
                    {joinHook.error && (
                      <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{joinHook.error.message.split("\n")[0]}</span>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={joinHook.isPending || !joinAmount}
                      onClick={() => {
                        if (!isConnected) {
                          setShowConnectDialog(true);
                          return;
                        }
                        if (!(parseFloat(joinAmount) > 0)) return;
                        joinHook.join(bounty.onChainId, joinAmount);
                      }}
                    >
                      {joinHook.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {joinHook.hash ? "Confirming…" : "Confirm in wallet…"}
                        </>
                      ) : (
                        `Contribute ${joinAmount} ETH`
                      )}
                    </Button>
                    <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
                      <DialogContent className="sm:max-w-sm">
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-primary" />
                            <h2 className="text-base font-semibold">Connect Wallet</h2>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Connect your wallet to contribute to this bounty.
                          </p>
                          <Button className="w-full" onClick={handleConnect}>
                            <Wallet className="w-4 h-4 mr-2" />
                            Connect
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Withdraw from canceled bounty (contributor pull-payment) */}
          {bounty.isCanceled && isJoinable && !isCreator && (
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Withdraw Your Contribution</CardTitle>
                <CardDescription>
                  This bounty was canceled. Recover your contribution.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {claimRefundHook.isSuccess ? (
                  <div className="flex flex-col items-center gap-2 py-2 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    <p className="text-sm font-medium">Withdrawal confirmed!</p>
                    {claimRefundHook.hash && (
                      <a
                        href={getTxUrl(chainId, claimRefundHook.hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        View tx <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ) : (
                  <>
                    {claimRefundHook.error && (
                      <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{claimRefundHook.error.message.split("\n")[0]}</span>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={claimRefundHook.isPending}
                      onClick={() => claimRefundHook.claimRefund(bounty.onChainId)}
                    >
                      {claimRefundHook.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {claimRefundHook.hash ? "Confirming…" : "Confirm in wallet…"}
                        </>
                      ) : (
                        "Withdraw Funds"
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Cancel (creator only) */}
          {isCreator && !bounty.isCanceled && (
            <Card className="border-destructive/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-destructive/80">Cancel Bounty</CardTitle>
                <CardDescription>
                  Cancel and recover your funds. This cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {cancelHook.isSuccess ? (
                  <div className="flex flex-col items-center gap-2 py-2 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    <p className="text-sm font-medium">Bounty canceled.</p>
                    {cancelHook.hash && (
                      <a
                        href={getTxUrl(chainId, cancelHook.hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        View tx <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ) : (
                  <>
                    {cancelHook.error && (
                      <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{cancelHook.error.message.split("\n")[0]}</span>
                      </div>
                    )}
                    {!confirmCancel ? (
                      <Button
                        variant="outline"
                        className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
                        onClick={() => setConfirmCancel(true)}
                      >
                        Cancel Bounty
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          className="flex-1"
                          onClick={() => setConfirmCancel(false)}
                          disabled={cancelHook.isPending}
                        >
                          Keep it
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          disabled={cancelHook.isPending}
                          onClick={() => cancelHook.cancel(bounty.onChainId, !!isJoinable)}
                        >
                          {cancelHook.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              {cancelHook.hash ? "Confirming…" : "Confirm in wallet…"}
                            </>
                          ) : (
                            "Yes, cancel"
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Vote Dashboard — live yes/no tallies and deadline */}
          {bounty.isVoting && bounty.onChainId > 0 && (
            <VoteDashboard chainId={chainId} onChainBountyId={bounty.onChainId} />
          )}

          {/* Bounty Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bounty Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <User className="w-4 h-4" />
                  <span className="font-medium">Issuer</span>
                </div>
                <AddressDisplay
                  address={bounty.issuer as `0x${string}`}
                  variant="compact"
                  showAvatar={true}
                  showCopy={false}
                  showExplorer={true}
                  avatarSize="xs"
                  customExplorerUrl={explorerUrl}
                  onAddressClick={() => window.open(explorerUrl, "_blank", "noopener,noreferrer")}
                />
              </div>

              <div>
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">Created</span>
                </div>
                <p className="text-xs">
                  {createdDate.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>

              {deadlineDate && (
                <div>
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">Deadline</span>
                  </div>
                  <p className="text-xs">
                    {deadlineDate.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  {countdown && (
                    <p className="text-xs font-medium mt-0.5 text-amber-500 dark:text-amber-400">
                      {countdown === "Expired" ? "Expired" : `${countdown} remaining`}
                    </p>
                  )}
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-medium">Activity</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {bounty.hasClaims && (
                    <Badge variant="secondary" className="text-xs">
                      Has Claims
                    </Badge>
                  )}
                  {bounty.hasParticipants && (
                    <Badge variant="secondary" className="text-xs">
                      Has Participants
                    </Badge>
                  )}
                  {!bounty.hasClaims && !bounty.hasParticipants && (
                    <Badge variant="outline" className="text-xs">
                      No claims yet — be first!
                    </Badge>
                  )}
                </div>
              </div>

              {isJoinable && participants && participants.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Users className="w-4 h-4" />
                    <span className="font-medium">Contributors</span>
                  </div>
                  <div className="space-y-2 mt-2">
                    {participants.slice(0, 5).map((addr, i) => {
                      const amt = participantAmounts?.[i];
                      const eth = amt !== undefined ? (Number(amt) / 1e18).toFixed(4) : null;
                      return (
                        <div key={addr} className="flex items-center justify-between gap-2">
                          <AddressDisplay
                            address={addr}
                            variant="compact"
                            showAvatar={true}
                            showCopy={false}
                            showExplorer={false}
                            avatarSize="xs"
                          />
                          {eth && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              {eth} ETH
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {participants.length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        +{participants.length - 5} more
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-base">About POIDH</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                POIDH (Pics Or It Didn&apos;t Happen) is a decentralized bounty platform where
                anyone can create challenges and reward proof with ETH.
              </p>
              <div className="pt-2 space-y-1">
                <a
                  href="https://poidh.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-xs flex items-center gap-1"
                >
                  Visit POIDH.xyz <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href="https://docs.poidh.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-xs flex items-center gap-1"
                >
                  Read Documentation <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
