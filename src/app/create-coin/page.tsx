"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Coins, ImageIcon, Info, Loader2, Upload, Video } from "lucide-react";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VideoThumbnailSelector } from "@/components/ui/video-thumbnail-selector";
import { checkHasCreatorCoin, useCreateCoin } from "@/hooks/useCreateCoin";
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
  const router = useRouter();
  const { isConnected, address } = useAccount();
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
      toast.success("Coin created successfully!");
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
  ]);

  // Dismiss loading toast when wallet interaction starts
  React.useEffect(() => {
    if (!isPreparingTransaction && isPending) {
      toast.dismiss("create-coin-loading");
      toast.loading("Please confirm the transaction in your wallet...", {
        id: "wallet-confirm-loading",
      });
    }
    if (txSuccess) {
      toast.dismiss("wallet-confirm-loading");
    }
  }, [isPreparingTransaction, isPending, txSuccess]);

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type with Zora's supported types
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      setMediaError("Please upload an image or video file");
      toast.error("Please upload an image or video file");
      return;
    }

    // Check against Zora's supported mime types
    const isSupportedImage = SUPPORTED_IMAGE_TYPES.includes(file.type);
    const isSupportedVideo = SUPPORTED_VIDEO_TYPES.includes(file.type);

    if (isImage && !isSupportedImage) {
      setMediaError("Image type not supported. Please use: JPEG, PNG, GIF, WebP, or SVG");
      toast.error("Image type not supported. Please use: JPEG, PNG, GIF, WebP, or SVG");
      return;
    }

    if (isVideo && !isSupportedVideo) {
      setMediaError("Video type not supported. Please use: MP4, WebM, or MOV");
      toast.error("Video type not supported. Please use: MP4, WebM, or MOV");
      return;
    }

    // Check file size (max 50MB for better upload performance)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setMediaError("File size must be less than 50MB");
      toast.error("File size must be less than 50MB");
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
      toast.error("Please connect your wallet first");
      return;
    }

    // Validate form
    if (!name.trim()) {
      toast.error("Please enter a coin name");
      return;
    }

    if (!symbol.trim()) {
      toast.error("Please enter a coin symbol");
      return;
    }

    if (symbol.length > 10) {
      toast.error("Symbol must be 10 characters or less");
      return;
    }

    if (!mediaFile) {
      setMediaError("Please upload an image or video");
      toast.error("Please upload an image or video");
      return;
    }

    // For videos, ensure thumbnail has been selected
    if (mediaFile.type.startsWith("video/") && !customThumbnail) {
      toast.error("Please select a thumbnail for your video");
      return;
    }

    try {
      // Show immediate feedback
      toast.loading("Uploading media and preparing transaction...", {
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
      toast.error(error instanceof Error ? error.message : "Failed to create coin");
    }
  };

  // Reset and create another coin
  // Handle thumbnail selection
  const handleThumbnailSelected = (thumbnailFile: File) => {
    setCustomThumbnail(thumbnailFile);
    setShowThumbnailSelector(false);
    toast.success("Custom thumbnail selected!");
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
                    ? "Confirming transaction..."
                    : mediaType === "video"
                      ? "Processing video and generating thumbnail..."
                      : "Uploading to IPFS and preparing transaction..."}
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  {transactionHash
                    ? "Waiting for blockchain confirmation"
                    : mediaType === "video"
                      ? "Generating thumbnail from video frame, then uploading to IPFS"
                      : "Please sign the transaction in your wallet"}
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
              <h1 className="text-3xl font-bold tracking-tight mb-2">Coin Created Successfully!</h1>
              <p className="text-muted-foreground">
                Your coin has been deployed on Base. Here is the summary:
              </p>
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
                      <Label>Description</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {createdCoinData.description}
                      </p>
                    </div>
                  )}

                  {/* Deployment Info */}
                  <div className="bg-muted rounded-lg p-4 space-y-3 text-sm">
                    <h4 className="font-semibold">Deployment Information</h4>

                    {createdCoinData.coinAddress && (
                      <div>
                        <Label className="text-xs">Coin Address</Label>
                        <p className="font-mono text-xs break-all">{createdCoinData.coinAddress}</p>
                      </div>
                    )}

                    <div>
                      <Label className="text-xs">Creator Address</Label>
                      <p className="font-mono text-xs break-all">{createdCoinData.creator}</p>
                    </div>

                    <div>
                      <Label className="text-xs">Backing Currency</Label>
                      {createdCoinData.useUserCreatorCoin ? (
                        <>
                          <p className="font-mono text-xs">{createdCoinData.creator}</p>
                          <p className="text-xs text-muted-foreground">
                            Your Creator Coin (resolved from wallet address)
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-mono text-xs">{GNARS_CREATOR_COIN}</p>
                          <p className="text-xs text-muted-foreground">$GNARS Creator Coin</p>
                        </>
                      )}
                    </div>

                    <div>
                      <Label className="text-xs">Platform Referrer</Label>
                      <p className="font-mono text-xs">{PLATFORM_REFERRER}</p>
                      <p className="text-xs text-muted-foreground">Gnars DAO referrer address</p>
                    </div>

                    {createdCoinData.transactionHash && (
                      <div>
                        <Label className="text-xs">Transaction Hash</Label>
                        <p className="font-mono text-xs break-all">
                          {createdCoinData.transactionHash}
                        </p>
                      </div>
                    )}

                    <div>
                      <Label className="text-xs">Network</Label>
                      <p className="text-xs">Base (Chain ID: 8453)</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleCreateAnother} className="flex-1">
                    Create Another Coin
                  </Button>
                  <Button onClick={() => router.push("/")} className="flex-1">
                    Go to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          /* Creation Form */
          <>
            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight mb-2">Create a Zora Coin</h1>
              <p className="text-muted-foreground">
                Create a new coin on Zora. Add a name, symbol, and media (image or video) for your
                coin.
              </p>
            </div>

            <Card>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Coin Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      placeholder="e.g., Gnars Community Coin"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={50}
                      required
                    />
                    <p className="text-xs text-muted-foreground">{name.length}/50 characters</p>
                  </div>

                  {/* Symbol */}
                  <div className="space-y-2">
                    <Label htmlFor="symbol">
                      Symbol <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="symbol"
                      placeholder="e.g., GNARS"
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                      maxLength={10}
                      required
                      className="uppercase"
                    />
                    <p className="text-xs text-muted-foreground">
                      {symbol.length}/10 characters (will be uppercase)
                    </p>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your coin..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={500}
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      {description.length}/500 characters
                    </p>
                  </div>

                  {/* Currency Selection */}
                  <div className="space-y-3">
                    <Label>Backing Currency</Label>
                    {isCheckingCreatorCoin ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Checking for creator coin...
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
                              $GNARS Creator Coin (Default)
                            </label>
                            <p className="text-xs text-muted-foreground mt-1">
                              Backed by Gnars DAO token. Provides established liquidity and
                              community support. Every token buy will buy $GNARS first then the
                              coin. Making $GNARS stronger!
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
                                My Creator Coin {creatorCoinName && `(${creatorCoinName})`}
                              </label>
                              <p className="text-xs text-muted-foreground mt-1">
                                Backed by your personal creator coin. Creates a coin family within
                                your ecosystem. Gnars treasure will get $ZORA rewards too!
                              </p>
                            </div>
                          </div>
                        )}

                        {hasCreatorCoin === false && (
                          <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                              You don&apos;t have a creator coin yet. Only $GNARS backing is available.
                              To use your own creator coin, deploy one first.
                            </AlertDescription>
                          </Alert>
                        )}

                        {useUserCreatorCoin && address && (
                          <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                              <strong>Your wallet address:</strong>{" "}
                              <span className="font-mono">{address}</span>
                              <br />
                              The SDK will resolve this to your creator coin address automatically.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Media Upload */}
                  <div className="space-y-2">
                    <Label>
                      Media <span className="text-destructive">*</span>
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
                          aria-label="Upload media file"
                        >
                          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                          <p className="text-sm font-medium mb-1">Upload Image or Video</p>
                          <p className="text-xs text-muted-foreground">
                            Images: JPEG, PNG, GIF, WebP, SVG
                            <br />
                            Videos: MP4 (recommended), WebM, MOV • Max: 50MB
                            <br />
                            <span className="text-blue-600 dark:text-blue-400">
                              📸 Choose custom thumbnail for videos
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
                            <Label className="text-sm font-medium mb-2 block">Media</Label>
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
                                    Select Thumbnail
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={handleRemoveMedia}
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Thumbnail Preview for Videos */}
                          {mediaType === "video" && (
                            <div>
                              <Label className="text-sm font-medium mb-2 block">
                                Selected Thumbnail
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
                                      Change
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="border rounded-lg aspect-video bg-muted flex items-center justify-center">
                                  <p className="text-sm text-muted-foreground text-center px-4">
                                    No thumbnail selected.
                                    <br />
                                    Click &quot;Select Thumbnail&quot; to choose one.
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
                    <p className="font-medium">What happens next:</p>
                    <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                      <li>Your media will be uploaded to Zora IPFS network</li>
                      <li>Metadata will be validated and stored on IPFS</li>
                      <li>Your wallet will open to confirm the transaction</li>
                      <li>The coin will be deployed on Base network</li>
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
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 cursor-pointer"
                      disabled={isPending || isPreparingTransaction || !isConnected}
                    >
                      {isPreparingTransaction ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Preparing transaction...
                        </>
                      ) : isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Coins className="mr-2 h-4 w-4" />
                          Create Coin
                        </>
                      )}
                    </Button>
                  </div>

                  {!isConnected && (
                    <p className="text-sm text-center text-muted-foreground">
                      Connect your wallet to create a coin
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
