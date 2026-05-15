"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  ArrowLeftRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
  PlusCircle,
} from "lucide-react";
import { arbitrum as thirdwebArbitrum, base as thirdwebBase } from "thirdweb/chains";
import { useActiveWallet, useActiveWalletChain } from "thirdweb/react";
import { Button } from "@/components/ui/button";
import { ConnectButton } from "@/components/ui/ConnectButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useUserAddress } from "@/hooks/use-user-address";
import { usePoidhCreateOpenBounty, usePoidhCreateSoloBounty } from "@/hooks/usePoidhContract";
import { CHAIN_NAMES, getTxUrl, SUPPORTED_CHAINS } from "@/lib/poidh/config";

const CHAIN_OPTIONS = [
  { label: "Base", chainId: SUPPORTED_CHAINS.BASE },
  { label: "Arbitrum", chainId: SUPPORTED_CHAINS.ARBITRUM },
];

const SUPPORTED_IDS = CHAIN_OPTIONS.map((c) => c.chainId) as number[];

interface CreateBountyModalProps {
  children?: React.ReactNode;
}

export function CreateBountyModal({ children }: CreateBountyModalProps) {
  const t = useTranslations("bounties");
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"open" | "solo">("open");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState("");
  const { isConnected } = useUserAddress();
  const activeChain = useActiveWalletChain();
  const activeWallet = useActiveWallet();
  const walletChainId = activeChain?.id ?? SUPPORTED_CHAINS.BASE;
  const [isSwitching, setIsSwitching] = useState(false);
  const switchWalletChain = async (targetChainId: number) => {
    if (!activeWallet || isSwitching) return;
    const targetChain =
      targetChainId === SUPPORTED_CHAINS.ARBITRUM ? thirdwebArbitrum : thirdwebBase;
    setIsSwitching(true);
    try {
      await activeWallet.switchChain(targetChain);
    } catch {
      // user cancelled or failed silently
    } finally {
      setIsSwitching(false);
    }
  };

  // Default to wallet's chain if supported, else Base
  const defaultChain = SUPPORTED_IDS.includes(walletChainId)
    ? walletChainId
    : SUPPORTED_CHAINS.BASE;
  const [chainId, setChainId] = useState<number>(defaultChain);

  // Keep form chain in sync when wallet switches externally
  useEffect(() => {
    if (SUPPORTED_IDS.includes(walletChainId)) {
      setChainId(walletChainId);
    }
  }, [walletChainId]);

  const openBounty = usePoidhCreateOpenBounty(chainId);
  const soloBounty = usePoidhCreateSoloBounty(chainId);
  const active = type === "open" ? openBounty : soloBounty;
  const chainName = CHAIN_NAMES[chainId as keyof typeof CHAIN_NAMES] ?? "Unknown";

  const wrongNetwork = isConnected && walletChainId !== chainId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim() || !reward || wrongNetwork) return;
    try {
      if (type === "open") {
        await openBounty.create(name.trim(), description.trim(), reward);
      } else {
        await soloBounty.create(name.trim(), description.trim(), reward);
      }
    } catch {
      // error captured in hook
    }
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      if (active.isSuccess) {
        setName("");
        setDescription("");
        setReward("");
      }
      openBounty.reset();
      soloBounty.reset();
    }
    setOpen(val);
  };

  const hash = active.hash;
  const isPending = active.isPending;
  const isSuccess = active.isSuccess;
  const error = active.error;

  const currentWalletChainName =
    CHAIN_NAMES[walletChainId as keyof typeof CHAIN_NAMES] ?? `Chain ${walletChainId}`;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        {children ?? (
          <Button>
            <PlusCircle className="w-4 h-4 mr-2" />
            {t("cta.createBounty")}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("createModal.title")}</DialogTitle>
          <DialogDescription>{t("createModal.description")}</DialogDescription>
        </DialogHeader>

        {!isConnected ? (
          <div className="py-6 flex flex-col items-center gap-4 text-center">
            <AlertCircle className="w-10 h-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("createModal.connectPrompt")}</p>
            <ConnectButton />
          </div>
        ) : isSuccess ? (
          <div className="py-6 flex flex-col items-center gap-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            <div>
              <p className="font-semibold">{t("createModal.successTitle", { chain: chainName })}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("createModal.successDescription")}
              </p>
              <p className="text-xs text-muted-foreground mt-2">{t("createModal.successNote")}</p>
            </div>
            {hash && (
              <a
                href={getTxUrl(chainId, hash)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                {t("createModal.viewTransaction")} <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <Button variant="outline" onClick={() => handleClose(false)}>
              {t("cta.close")}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Chain + Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("createModal.chainLabel")}</Label>
                <Select
                  value={String(chainId)}
                  onValueChange={(v) => setChainId(Number(v))}
                  disabled={isPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHAIN_OPTIONS.map((c) => (
                      <SelectItem key={c.chainId} value={String(c.chainId)}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("createModal.typeLabel")}</Label>
                <Select
                  value={type}
                  onValueChange={(v) => setType(v as "open" | "solo")}
                  disabled={isPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">{t("createModal.typeOpen")}</SelectItem>
                    <SelectItem value="solo">{t("createModal.typeSolo")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Wrong network banner — shown proactively before submit */}
            {wrongNetwork && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
                <div className="flex items-start gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                  <ArrowLeftRight className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    {t("createModal.wrongNetwork", {
                      currentChain: currentWalletChainName,
                      targetChain: chainName,
                    })}
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0 border-yellow-500/40 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/10"
                  disabled={isSwitching}
                  onClick={() => switchWalletChain(chainId)}
                >
                  {isSwitching ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    t("createModal.switchTo", { chain: chainName })
                  )}
                </Button>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>{t("createModal.titleLabel")}</Label>
              <Input
                placeholder={t("createModal.titlePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                disabled={isPending}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t("createModal.descriptionLabel")}</Label>
              <Textarea
                className="min-h-[80px] resize-y"
                placeholder={t("createModal.descriptionPlaceholder")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                disabled={isPending}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t("createModal.rewardLabel")}</Label>
              <Input
                type="number"
                step="0.0001"
                min="0.0001"
                placeholder="0.01"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                disabled={isPending}
                required
              />
            </div>

            <p className="text-xs text-muted-foreground">
              {type === "open" ? t("createModal.openNote") : t("createModal.soloNote")}
            </p>

            {error && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error.message.split("\n")[0]}</span>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => handleClose(false)}
                disabled={isPending}
              >
                {t("cta.cancel")}
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={
                  isPending || wrongNetwork || !name.trim() || !description.trim() || !reward
                }
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {hash ? t("createModal.confirming") : t("createModal.confirmingWallet")}
                  </>
                ) : (
                  t("createModal.createFund", {
                    amount: parseFloat(reward || "0").toFixed(4),
                  })
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
