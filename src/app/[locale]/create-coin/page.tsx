"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Coins, ImageIcon, Info, Loader2, Upload, Video } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VideoThumbnailSelector } from "@/components/ui/video-thumbnail-selector";
import { useUserAddress } from "@/hooks/use-user-address";
import { checkHasCreatorCoin, useCreateCoin } from "@/hooks/useCreateCoin";
import { useRouter } from "@/i18n/navigation";
import { GNARS_CREATOR_COIN, PLATFORM_REFERRER } from "@/lib/config";
import { cn } from "@/lib/utils";

// Supported image types for Zora (mime types that display on zora.co)
const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

const SUPPORTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"];

interface CreatedCoinData {
  name: string;
  symbol: string;
  description?: string;
  mediaFile: File;
  coinAddress?: string;
  transactionHash?: string;
  creator: string;
  useUserCreatorCoin?: boolean;
}

export default function CreateCoinPage() {
  const t = useTranslations("createCoin");
  const router = useRouter();
  const { address, isConnected } = useUserAddress();
  const {
    createCoin,
    isPending,
    isPreparingTransaction,
    isSuccess: txSuccess,
    transactionHash,
    coinAddress,
    reset: resetCreateCoin,
  } = useCreateCoin();

  // Form state
  const [name, setName] = React.useState("");
  const [symbol, setSymbol] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [mediaFile, setMediaFile] = React.useState<File | null>(null);
  const [mediaError, setMediaError] = React.useState("");

  // Video thumbnail selection state
  const [showThumbnailSelector, setShowThumbnailSelector] = React.useState(false);
  const [customThumbnail, setCustomThumbnail] = React.useState<File | null>(null);

  // Currency selection state
  const [useUserCreatorCoin, setUseUserCreatorCoin] = React.useState(false);
  const [hasCreatorCoin, setHasCreatorCoin] = React.useState<boolean | null>(null);
  const [isCheckingCreatorCoin, setIsCheckingCreatorCoin] = React.useState(false);
  const [creatorCoinImage, setCreatorCoinImage] = React.useState<string | undefined>();
  const [creatorCoinName, setCreatorCoinName] = React.useState<string | undefined>();

  // Success state
  const [createdCoinData, setCreatedCoinData] = React.useState<CreatedCoinData | null>(null);

  // File input ref
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Derive media type and URL from file
  const mediaType = mediaFile?.type.startsWith("image/")
    ? "image"
    : mediaFile?.type.startsWith("video/")
      ? "video"
      : "none";
  const mediaUrl = React.useMemo(
    () => (mediaFile ? URL.createObjectURL(mediaFile) : ""),
    [mediaFile],
  );

  // Memoize thumbnail URL to prevent memory leaks
  const thumbnailUrl = React.useMemo(
    () => (customThumbnail ? URL.createObjectURL(customThumbnail) : ""),
    [customThumbnail],
  );

  // Cleanup media URL when component unmounts or file changes
  React.useEffect(() => {
    if (mediaUrl) {
      return () => {
        URL.revokeObjectURL(mediaUrl);
      };
    }
  }, [mediaUrl]);

  // Cleanup thumbnail URL when component unmounts or file changes
  React.useEffect(() => {
    if (thumbnailUrl) {
      return () => {
        URL.revokeObjectURL(thumbnailUrl);
      };
    }
  }, [thumbnailUrl]);

  // Check if user has a creator coin when wallet connects
  React.useEffect(() => {
    async function checkCreatorCoin() {
      if (!address || !isConnected) {
        console.log("[CreateCoinPage] No address or not connected, resetting creator coin state");
        setHasCreatorCoin(null);
        setUseUserCreatorCoin(false);
        setCreatorCoinImage(undefined);
        setCreatorCoinName(undefined);
        return;
      }

      console.log("[CreateCoinPage] Checking creator coin for connected address:", address);
      setIsCheckingCreatorCoin(true);

      try {
        const result = await checkHasCreatorCoin(address);
        console.log("[CreateCoinPage] Creator coin check result:", result);

        if (result?.hasCreatorCoin) {
          setHasCreatorCoin(true);
          setCreatorCoinImage(result.creatorCoinImage);
          setCreatorCoinName(result.creatorCoinName);
          console.log("[CreateCoinPage] Creator coin found! User can select their creator coin");
        } else {
          setHasCreatorCoin(false);
          setCreatorCoinImage(undefined);
          setCreatorCoinName(undefined);
          console.log("[CreateCoinPage] No creator coin found, disabling user creator coin option");
          setUseUserCreatorCoin(false);
        }
      } catch (error) {
        console.error("[CreateCoinPage] Error checking creator coin:", error);
        setHasCreatorCoin(false);
        setCreatorCoinImage(undefined);
        setCreatorCoinName(undefined);
        setUseUserCreatorCoin(false);
      } finally {
        setIsCheckingCreatorCoin(false);
        console.log("[CreateCoinPage] Creator coin check complete");
      }
    }

    checkCreatorCoin();
  }, [address, isConnected]);

  // Watch for transaction success and update preview
  React.useEffect(() => {
    if (txSuccess && transactionHash && mediaFile) {
      setCreatedCoinData({
        name: name.trim(),
        symbol: symbol.trim().toUpperCase(),
        description: description.trim() || undefined,
        mediaFile: mediaFile,
        coinAddress: coinAddress || undefined,
        transactionHash: transactionHash || undefined,
        creator: address || "",
        useUserCreatorCoin: useUserCreatorCoin,
      });
      toast.success(t("toasts.coinCreated"));
    }
  }, [
    txSuccess,
    transactionHash,
    coinAddress,
    address,
    name,
    symbol,
    description,
    mediaFile,
    useUserCreatorCoin,
    t,
  ]);

  // Dismiss loading toast when wallet interaction starts
  React.useEffect(() => {
    if (!isPreparingTransaction && isPending) {
      toast.dismiss("create-coin-loading");
      toast.loading(t("toasts.confirmTransaction"), {
        id: "wallet-confirm-loading",
      });
    }
    if (txSuccess) {
      toast.dismiss("wallet-confirm-loading");
    }
  }, [isPreparingTransaction, isPending, txSuccess, t]);

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type with Zora's supported types
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      setMediaError(t("errors.invalidFile"));
      toast.error(t("toasts.invalidFileType"));
      return;
    }

    // Check against Zora's supported mime types
    const isSupportedImage = SUPPORTED_IMAGE_TYPES.includes(file.type);
    const isSupportedVideo = SUPPORTED_VIDEO_TYPES.includes(file.type);

    if (isImage && !isSupportedImage) {
      setMediaError(t("errors.unsupportedImage"));
      toast.error(t("toasts.invalidImageType"));
      return;
    }

    if (isVideo && !isSupportedVideo) {
      setMediaError(t("errors.unsupportedVideo"));
      toast.error(t("toasts.invalidVideoType"));
      return;
    }

    // Check file size (max 420MB for better upload performance)
    const maxSize = 420 * 1024 * 1024;
    if (file.size > maxSize) {
      setMediaError(t("errors.fileTooLarge"));
      toast.error(t("toasts.fileTooLarge"));
      return;
    }

    setMediaError("");
    setMediaFile(file);

    // For videos, show thumbnail selector
    if (isVideo) {
      setShowThumbnailSelector(true);
      setCustomThumbnail(null);
    }
  };

  // Remove media
  const handleRemoveMedia = () => {
    setMediaFile(null);
    setMediaError("");
    setShowThumbnailSelector(false);
    setCustomThumbnail(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected) {
      toast.error(t("toasts.connectWallet"));
      return;
    }

    // Validate form
    if (!name.trim()) {
      toast.error(t("toasts.enterName"));
      return;
    }

    if (!symbol.trim()) {
      toast.error(t("toasts.enterSymbol"));
      return;
    }

    if (symbol.length > 10) {
      toast.error(t("toasts.symbolTooLong"));
      return;
    }

    if (!mediaFile) {
      setMediaError(t("errors.noMedia"));
      toast.error(t("toasts.uploadMedia"));
      return;
    }

    // For videos, ensure thumbnail has been selected
    if (mediaFile.type.startsWith("video/") && !customThumbnail) {
      toast.error(t("toasts.selectThumbnail"));
      return;
    }

    try {
      // Show immediate feedback
      toast.loading(t("toasts.uploadingMedia"), {
        id: "create-coin-loading",
      });

      await createCoin({
        name: name.trim(),
        symbol: symbol.trim().toUpperCase(),
        description: description.trim() || undefined,
        mediaFile: mediaFile,
        customThumbnail: customThumbnail || undefined,
        useUserCreatorCoin: useUserCreatorCoin,
      });

      // Dismiss the loading toast when wallet interaction starts
      toast.dismiss("create-coin-loading");
    } catch (error) {
      toast.dismiss("create-coin-loading");
      toast.error(error instanceof Error ? error.message : t("errors.failedToCreate"));
    }
  };

  // Reset and create another coin
  // Handle thumbnail selection
  const handleThumbnailSelected = (thumbnailFile: File) => {
    setCustomThumbnail(thumbnailFile);
    setShowThumbnailSelector(false);
    toast.success(t("toasts.thumbnailSelected"));
  };

  const handleThumbnailCancel = () => {
    setShowThumbnailSelector(false);
    // Remove the video file since user cancelled thumbnail selection
    setMediaFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCreateAnother = () => {
    // Reset transaction state first
    resetCreateCoin();

    // Reset form state
    setCreatedCoinData(null);
    setName("");
    setSymbol("");
    setDescription("");
    setMediaFile(null);
    setMediaError("");
    setShowThumbnailSelector(false);
    setCustomThumbnail(null);
    setUseUserCreatorCoin(false);
    setCreatorCoinImage(undefined);
    setCreatorCoinName(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-1 flex-col py-8">
      <div className="space-y-6">
        {isPending && (
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  {transactionHash
                    ? t("pending.confirmingTitle")
                    : mediaType === "video"
                      ? t("pending.processingVideoTitle")
                      : t("pending.uploadingTitle")}
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  {transactionHash
                    ? t("pending.confirmingBody")
                    : mediaType === "video"
                      ? t("pending.processingVideoBody")
                      : t("pending.uploadingBody")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Video Thumbnail Selector Modal */}
        {showThumbnailSelector && mediaFile && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <VideoThumbnailSelector
              videoFile={mediaFile}
              onThumbnailSelected={handleThumbnailSelected}
              onCancel={handleThumbnailCancel}
            />
          </div>
        )}

        {createdCoinData ? (
          /* Success Preview */
          <>
            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight mb-2">{t("success.title")}</h1>
              <p className="text-muted-foreground">{t("success.description")}</p>
            </div>

            <Card>
              <CardContent className="space-y-6 pt-6">
                {/* Media Preview */}
                <div className="relative border rounded-lg overflow-hidden">
                  {createdCoinData.mediaFile.type.startsWith("image/") && (
                    <Image
                      src={URL.createObjectURL(createdCoinData.mediaFile)}
                      alt={createdCoinData.name}
                      width={800}
                      height={450}
                      className="w-full aspect-video object-contain bg-gray-100"
                    />
                  )}
                  {createdCoinData.mediaFile.type.startsWith("video/") && (
                    <video
                      src={URL.createObjectURL(createdCoinData.mediaFile)}
                      controls
                      className="w-full aspect-video object-contain bg-black"
                    />
                  )}
                </div>

                {/* Coin Details */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold">{createdCoinData.name}</h3>
                    <p className="text-lg text-muted-foreground">${createdCoinData.symbol}</p>
                  </div>

                  {createdCoinData.description && (
                    <div>
                      <Label>{t("form.description")}</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {createdCoinData.description}
                      </p>
                    </div>
                  )}

                  {/* Deployment Info */}
                  <div className="bg-muted rounded-lg p-4 space-y-3 text-sm">
                    <h4 className="font-semibold">{t("success.deploymentInfo")}</h4>

                    {createdCoinData.coinAddress && (
                      <div>
                        <Label className="text-xs">{t("success.coinAddress")}</Label>
                        <p className="font-mono text-xs break-all">{createdCoinData.coinAddress}</p>
                      </div>
                    )}

                    <div>
                      <Label className="text-xs">{t("success.creatorAddress")}</Label>
                      <p className="font-mono text-xs break-all">{createdCoinData.creator}</p>
                    </div>

                    <div>
                      <Label className="text-xs">{t("success.backingCurrency")}</Label>
                      {createdCoinData.useUserCreatorCoin ? (
                        <>
                          <p className="font-mono text-xs">{createdCoinData.creator}</p>
                          <p className="text-xs text-muted-foreground">
                            {t("success.userCreatorCoinDesc")}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-mono text-xs">{GNARS_CREATOR_COIN}</p>
                          <p className="text-xs text-muted-foreground">
                            {t("success.gnarsCoinDesc")}
                          </p>
                        </>
                      )}
                    </div>

                    <div>
                      <Label className="text-xs">{t("success.platformReferrer")}</Label>
                      <p className="font-mono text-xs">{PLATFORM_REFERRER}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("success.platformReferrerDesc")}
                      </p>
                    </div>

                    {createdCoinData.transactionHash && (
                      <div>
                        <Label className="text-xs">{t("success.transactionHash")}</Label>
                        <p className="font-mono text-xs break-all">
                          {createdCoinData.transactionHash}
                        </p>
                      </div>
                    )}

                    <div>
                      <Label className="text-xs">{t("success.network")}</Label>
                      <p className="text-xs">{t("success.networkValue")}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleCreateAnother} className="flex-1">
                    {t("success.createAnother")}
                  </Button>
                  <Button onClick={() => router.push("/")} className="flex-1">
                    {t("success.dashboard")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          /* Creation Form */
          <>
            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight mb-2">{t("title")}</h1>
              <p className="text-muted-foreground">{t("description")}</p>
            </div>

            <Card>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      {t("form.coinName")} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      placeholder={t("form.coinNamePlaceholder")}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={50}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("form.coinNameCharCount", { count: name.length })}
                    </p>
                  </div>

                  {/* Symbol */}
                  <div className="space-y-2">
                    <Label htmlFor="symbol">
                      {t("form.symbol")} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="symbol"
                      placeholder={t("form.symbolPlaceholder")}
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                      maxLength={10}
                      required
                      className="uppercase"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("form.symbolCharCount", { count: symbol.length })}
                    </p>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">{t("form.description")}</Label>
                    <Textarea
                      id="description"
                      placeholder={t("form.descriptionPlaceholder")}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={500}
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("form.descriptionCharCount", { count: description.length })}
                    </p>
                  </div>

                  {/* Currency Selection */}
                  <div className="space-y-3">
                    <Label>{t("form.backingCurrency")}</Label>
                    {isCheckingCreatorCoin ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("form.checkingCreatorCoin")}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* GNARS option - always available */}
                        <div className="flex items-start space-x-3">
                          <input
                            type="radio"
                            id="gnars-coin"
                            name="currency"
                            value="gnars"
                            checked={!useUserCreatorCoin}
                            onChange={() => setUseUserCreatorCoin(false)}
                            className="mt-0.5"
                          />
                          <div className="flex-1">
                            <label
                              htmlFor="gnars-coin"
                              className="text-sm font-medium cursor-pointer flex items-center gap-2"
                            >
                              <Image src="/gnars.webp" alt="GNARS" width={24} height={24} />
                              {t("form.gnarsCoinLabel")}
                            </label>
                            <p className="text-xs text-muted-foreground mt-1">
                              {t("form.gnarsCoinDesc")}
                            </p>
                          </div>
                        </div>

                        {/* User creator coin option - only if available */}
                        {hasCreatorCoin && (
                          <div className="flex items-start space-x-3">
                            <input
                              type="radio"
                              id="user-coin"
                              name="currency"
                              value="user"
                              checked={useUserCreatorCoin}
                              onChange={() => setUseUserCreatorCoin(true)}
                              className="mt-0.5"
                            />
                            <div className="flex-1">
                              <label
                                htmlFor="user-coin"
                                className="text-sm font-medium cursor-pointer flex items-center gap-2"
                              >
                                {creatorCoinImage ? (
                                  <Image
                                    src={creatorCoinImage}
                                    alt="Creator Coin"
                                    width={24}
                                    height={24}
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                    {creatorCoinName?.charAt(0) || "C"}
                                  </div>
                                )}
                                {creatorCoinName
                                  ? t("form.myCreatorCoinWithName", { name: creatorCoinName })
                                  : t("form.myCreatorCoin")}
                              </label>
                              <p className="text-xs text-muted-foreground mt-1">
                                {t("form.myCreatorCoinDesc")}
                              </p>
                            </div>
                          </div>
                        )}

                        {hasCreatorCoin === false && (
                          <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                              {t("form.noCreatorCoin")}
                            </AlertDescription>
                          </Alert>
                        )}

                        {useUserCreatorCoin && address && (
                          <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                              <strong>{t("form.yourWalletAddress")}</strong>{" "}
                              <span className="font-mono">{address}</span>
                              <br />
                              {t("form.sdkResolveNote")}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Media Upload */}
                  <div className="space-y-2">
                    <Label>
                      {t("form.media")} <span className="text-destructive">*</span>
                    </Label>
                    <div className="space-y-3">
                      {mediaType === "none" ? (
                        <div
                          className={cn(
                            "border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer",
                            mediaError && "border-destructive",
                          )}
                          onClick={() => fileInputRef.current?.click()}
                          role="button"
                          tabIndex={0}
                          aria-label={t("form.uploadAriaLabel")}
                        >
                          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                          <p className="text-sm font-medium mb-1">{t("form.uploadLabel")}</p>
                          <p className="text-xs text-muted-foreground">
                            {t("form.uploadFormats")
                              .split("\n")
                              .map((line, i) => (
                                <React.Fragment key={i}>
                                  {i > 0 && <br />}
                                  {line}
                                </React.Fragment>
                              ))}
                            <br />
                            <span className="text-blue-600 dark:text-blue-400">
                              {t("form.uploadThumbnailNote")}
                            </span>
                          </p>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml,video/mp4,video/webm,video/quicktime,video/x-m4v"
                            onChange={handleFileChange}
                            className="hidden"
                            required
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Video/Image Preview */}
                          <div>
                            <Label className="text-sm font-medium mb-2 block">
                              {t("form.mediaPreviewLabel")}
                            </Label>
                            <div className="relative border rounded-lg overflow-hidden">
                              {mediaType === "image" && mediaUrl && (
                                <Image
                                  src={mediaUrl}
                                  alt="Preview"
                                  width={800}
                                  height={450}
                                  className="w-full aspect-video object-contain bg-gray-100"
                                />
                              )}
                              {mediaType === "video" && mediaUrl && (
                                <video
                                  src={mediaUrl}
                                  controls
                                  className="w-full aspect-video object-contain bg-black"
                                />
                              )}
                              <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                                {mediaType === "image" ? (
                                  <ImageIcon className="h-3 w-3" />
                                ) : (
                                  <Video className="h-3 w-3" />
                                )}
                                {mediaFile?.name}
                              </div>
                              <div className="absolute top-2 right-2 flex gap-2">
                                {mediaType === "video" && !customThumbnail && (
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setShowThumbnailSelector(true)}
                                  >
                                    {t("form.selectThumbnail")}
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={handleRemoveMedia}
                                >
                                  {t("form.remove")}
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Thumbnail Preview for Videos */}
                          {mediaType === "video" && (
                            <div>
                              <Label className="text-sm font-medium mb-2 block">
                                {t("form.selectedThumbnail")}
                              </Label>
                              {customThumbnail && thumbnailUrl ? (
                                <div className="relative border rounded-lg overflow-hidden">
                                  <Image
                                    src={thumbnailUrl}
                                    alt="Selected thumbnail"
                                    width={400}
                                    height={225}
                                    className="w-full aspect-video object-cover"
                                  />
                                  <div className="absolute top-2 right-2">
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => setShowThumbnailSelector(true)}
                                    >
                                      {t("form.changeThumbnail")}
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="border rounded-lg aspect-video bg-muted flex items-center justify-center">
                                  <p className="text-sm text-muted-foreground text-center px-4">
                                    {t("form.noThumbnail")
                                      .split("\n")
                                      .map((line, i) => (
                                        <React.Fragment key={i}>
                                          {i > 0 && <br />}
                                          {line}
                                        </React.Fragment>
                                      ))}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {mediaError && <p className="text-xs text-destructive">{mediaError}</p>}
                    </div>
                  </div>

                  {/* Info Box */}
                  <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                    <p className="font-medium">{t("form.whatHappensNext")}</p>
                    <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                      <li>{t("form.step1")}</li>
                      <li>{t("form.step2")}</li>
                      <li>{t("form.step3")}</li>
                      <li>{t("form.step4")}</li>
                    </ul>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                      className="flex-1"
                      disabled={isPending || isPreparingTransaction}
                    >
                      {t("form.cancel")}
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 cursor-pointer"
                      disabled={isPending || isPreparingTransaction || !isConnected}
                    >
                      {isPreparingTransaction ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("form.preparingTransaction")}
                        </>
                      ) : isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("form.creating")}
                        </>
                      ) : (
                        <>
                          <Coins className="mr-2 h-4 w-4" />
                          {t("form.createCoin")}
                        </>
                      )}
                    </Button>
                  </div>

                  {!isConnected && (
                    <p className="text-sm text-center text-muted-foreground">
                      {t("form.connectToCreate")}
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
