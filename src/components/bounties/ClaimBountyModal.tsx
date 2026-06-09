"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  ArrowLeftRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Upload,
  X,
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
import { Textarea } from "@/components/ui/textarea";
import { useUserAddress } from "@/hooks/use-user-address";
import { usePoidhCreateClaim } from "@/hooks/usePoidhContract";
import { CHAIN_NAMES, getTxUrl, SUPPORTED_CHAINS } from "@/lib/poidh/config";
import type { PoidhBounty } from "@/types/poidh";

interface ClaimBountyModalProps {
  bounty: PoidhBounty;
  children: React.ReactNode;
  onSuccess?: (claim: { name: string; description: string; url: string }) => void;
}

export function ClaimBountyModal({ bounty, children, onSuccess }: ClaimBountyModalProps) {
  const t = useTranslations("bounties");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const { submit, hash, isPending, isSuccess, error, reset } = usePoidhCreateClaim(bounty.chainId);
  const chainName = CHAIN_NAMES[bounty.chainId as keyof typeof CHAIN_NAMES] ?? "Unknown";
  const wrongNetwork = isConnected && walletChainId !== bounty.chainId;
  const currentWalletChainName =
    CHAIN_NAMES[walletChainId as keyof typeof CHAIN_NAMES] ?? `Chain ${walletChainId}`;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    const isVideo = file.type.startsWith("video/");
    const maxSize = isVideo ? 500 * 1024 * 1024 : 100 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError(t("claimModal.fileTooLarge"));
      e.target.value = "";
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/pinata/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok || !json?.data?.gatewayUrl) {
        throw new Error(json?.error ?? "upload_failed");
      }
      setMediaUrl(json.data.gatewayUrl);
      setUploadedFileName(file.name);
    } catch {
      setUploadError(t("claimModal.uploadError"));
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const clearUpload = () => {
    setMediaUrl("");
    setUploadedFileName(null);
    setUploadError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) return;
    try {
      await submit(bounty.onChainId, name.trim(), description.trim(), mediaUrl.trim());
      onSuccess?.({ name: name.trim(), description: description.trim(), url: mediaUrl.trim() });
    } catch {
      // error captured in hook
    }
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setName("");
      setDescription("");
      setMediaUrl("");
      setUploadedFileName(null);
      setUploadError(null);
      setIsUploading(false);
      reset();
    }
    setOpen(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("claimModal.title")}</DialogTitle>
          <DialogDescription>{t("claimModal.description", { chain: chainName })}</DialogDescription>
        </DialogHeader>

        {!isConnected ? (
          <div className="py-6 flex flex-col items-center gap-4 text-center">
            <AlertCircle className="w-10 h-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("claimModal.connectPrompt")}</p>
            <ConnectButton />
          </div>
        ) : isSuccess ? (
          <div className="py-6 flex flex-col items-center gap-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            <div>
              <p className="font-semibold">{t("claimModal.successTitle")}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("claimModal.successDescription")}
              </p>
            </div>
            {hash && (
              <a
                href={getTxUrl(bounty.chainId, hash)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                {t("claimModal.viewTransaction")} <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <Button variant="outline" onClick={() => handleClose(false)}>
              {t("cta.close")}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {wrongNetwork && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
                <div className="flex items-start gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                  <ArrowLeftRight className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    {t("claimModal.wrongNetwork", {
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
                  onClick={() => switchWalletChain(bounty.chainId)}
                >
                  {isSwitching ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    t("claimModal.switchTo", { chain: chainName })
                  )}
                </Button>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>{t("claimModal.claimTitleLabel")}</Label>
              <Input
                placeholder={t("claimModal.claimTitlePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                disabled={isPending}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t("claimModal.proofLabel")}</Label>
              <Textarea
                className="min-h-[100px] resize-y"
                placeholder={t("claimModal.proofPlaceholder")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                disabled={isPending}
                required
              />
              <p className="text-xs text-muted-foreground text-right">{description.length}/500</p>
            </div>

            <div className="space-y-2">
              <Label>{t("claimModal.mediaLabel")}</Label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={isPending || isUploading}
              />

              {uploadedFileName ? (
                <div className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
                  <span className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="truncate">{uploadedFileName}</span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 shrink-0"
                    onClick={clearUpload}
                    disabled={isPending}
                  >
                    <X className="w-4 h-4" />
                    <span className="sr-only">{t("claimModal.removeFile")}</span>
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isPending || isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("claimModal.uploading")}
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      {t("claimModal.uploadButton")}
                    </>
                  )}
                </Button>
              )}

              {!uploadedFileName && (
                <>
                  <p className="text-xs text-muted-foreground text-center">
                    {t("claimModal.mediaUrlOr")}
                  </p>
                  <Input
                    placeholder={t("claimModal.mediaUrlPlaceholder")}
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    disabled={isPending || isUploading}
                    type="url"
                  />
                </>
              )}

              {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
            </div>

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
                  isPending || isUploading || wrongNetwork || !name.trim() || !description.trim()
                }
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {hash ? t("claimModal.confirming") : t("claimModal.confirmingWallet")}
                  </>
                ) : (
                  t("detail.submitYourProof")
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
