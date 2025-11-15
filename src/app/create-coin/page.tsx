"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Coins, ImageIcon, Loader2, Upload, Video } from "lucide-react";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateCoin } from "@/hooks/useCreateCoin";
import { cn } from "@/lib/utils";
import { GNARS_CREATOR_COIN, PLATFORM_REFERRER } from "@/lib/config";
import { VideoThumbnailSelector } from "@/components/ui/video-thumbnail-selector";
import { PoolConfigDebug } from "@/components/ui/pool-config-debug";
import Image from "next/image";

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

  // Cleanup media URL when component unmounts or file changes
  React.useEffect(() => {
    if (mediaUrl) {
      return () => {
        URL.revokeObjectURL(mediaUrl);
      };
    }
  }, [mediaUrl]);

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
      });
      toast.success("Coin created successfully!");
    }
  }, [txSuccess, transactionHash, coinAddress, address, name, symbol, description, mediaFile]);

  // Dismiss loading toast when wallet interaction starts
  React.useEffect(() => {
    if (!isPreparingTransaction && isPending) {
      toast.dismiss("create-coin-loading");
      toast.loading("Please confirm the transaction in your wallet...", {
        id: "wallet-confirm-loading"
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
        id: "create-coin-loading"
      });

      await createCoin({
        name: name.trim(),
        symbol: symbol.trim().toUpperCase(),
        description: description.trim() || undefined,
        mediaFile: mediaFile,
        customThumbnail: customThumbnail || undefined,
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
              <h1 className="text-3xl font-bold tracking-tight mb-2">
                Coin Created Successfully!
              </h1>
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
                      <Label className="text-xs">Content Coin Currency</Label>
                      <p className="font-mono text-xs">{GNARS_CREATOR_COIN}</p>
                      <p className="text-xs text-muted-foreground">Backing token for this coin</p>
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
              <h1 className="text-3xl font-bold tracking-tight mb-2">
                Create a Zora Coin
              </h1>
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
                <p className="text-xs text-muted-foreground">{description.length}/500 characters</p>
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
                        <video src={mediaUrl} controls className="w-full aspect-video object-contain bg-black" />
                      )}
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
                      <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                        {mediaType === "image" ? (
                          <ImageIcon className="h-3 w-3" />
                        ) : (
                          <Video className="h-3 w-3" />
                        )}
                        {mediaFile?.name}
                      </div>
                    </div>
                  )}
                  
                  {/* Thumbnail Preview for Videos */}
                  {mediaType === "video" && customThumbnail && (
                    <div className="mt-4">
                      <Label className="text-sm font-medium">Selected Thumbnail</Label>
                      <div className="relative border rounded-lg overflow-hidden mt-2">
                        <Image 
                          src={URL.createObjectURL(customThumbnail)} 
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

            {/* Debug Component - Shows current pool configuration */}
            <PoolConfigDebug className="mt-6" />
          </>
        )}
      </div>
    </div>
  );
}
