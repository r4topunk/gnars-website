"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Link, Upload, X } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { type ProposalFormValues } from "@/components/proposals/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VideoThumbnailSelector } from "@/components/ui/video-thumbnail-selector";
import { ipfsToGatewayUrl, uploadToPinata } from "@/lib/pinata";

// Supported media types for Zora (same as create-coin page)
const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

const SUPPORTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"];

const SUPPORTED_AUDIO_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg"];

interface MediaSectionProps {
  index: number;
}

export function MediaSection({ index }: MediaSectionProps) {
  const { setValue, watch } = useFormContext<ProposalFormValues>();
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [showThumbnailSelector, setShowThumbnailSelector] = useState(false);
  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);
  const [isManualInputOpen, setIsManualInputOpen] = useState(false);
  const [manualMediaUrl, setManualMediaUrl] = useState("");
  const [manualCoverUrl, setManualCoverUrl] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Cleanup preview URLs on unmount or change
  useEffect(() => {
    return () => {
      if (coverPreview && coverPreview.startsWith("blob:")) {
        URL.revokeObjectURL(coverPreview);
      }
      if (mediaPreview && mediaPreview.startsWith("blob:")) {
        URL.revokeObjectURL(mediaPreview);
      }
    };
  }, [coverPreview, mediaPreview]);

  const watchedMediaType = watch(`transactions.${index}.mediaType`);
  const watchedMediaUrl = watch(`transactions.${index}.animationUri`);
  const watchedCoverUrl = watch(`transactions.${index}.imageUri`);
  const handleMediaUpload = async (file: File, type: "media" | "cover") => {
    const isUploading = type === "media" ? setIsUploadingMedia : setIsUploadingCover;
    isUploading(true);

    try {
      // Create local preview immediately
      const previewUrl = URL.createObjectURL(file);

      if (type === "media") {
        const isVideo = file.type.startsWith("video/");
        setMediaPreview(previewUrl);

        // For videos, show thumbnail selector first
        if (isVideo) {
          setPendingVideoFile(file);
          setShowThumbnailSelector(true);
          isUploading(false);
          return;
        }

        // Show loading toast
        toast.loading("Uploading media to IPFS...", { id: "media-upload" });

        // Upload to Pinata
        const result = await uploadToPinata(file, `droposal-media-${Date.now()}`);

        if (!result.success || !result.data) {
          throw new Error(result.error || "Upload failed");
        }

        // Store IPFS URL in form fields
        setValue(`transactions.${index}.animationUri` as const, result.data.ipfsUrl);
        setValue(`transactions.${index}.imageUri` as const, result.data.ipfsUrl);
        setValue(`transactions.${index}.mediaType` as const, file.type);

        toast.success("Media uploaded successfully!", { id: "media-upload" });
      } else {
        // Cover image upload
        setCoverPreview(previewUrl);

        toast.loading("Uploading cover to IPFS...", { id: "cover-upload" });

        const result = await uploadToPinata(file, `droposal-cover-${Date.now()}`);

        if (!result.success || !result.data) {
          throw new Error(result.error || "Upload failed");
        }

        setValue(`transactions.${index}.imageUri` as const, result.data.ipfsUrl);
        setValue(`transactions.${index}.coverType` as const, file.type);

        toast.success("Cover uploaded successfully!", { id: "cover-upload" });
      }
    } catch (error) {
      console.error("Upload error:", error);

      const uploadType = type === "media" ? "media" : "cover";
      const toastId = type === "media" ? "media-upload" : "cover-upload";

      // Clean up on error
      if (type === "media") {
        setMediaPreview(null);
        setValue(`transactions.${index}.animationUri` as const, "");
        setValue(`transactions.${index}.imageUri` as const, "");
      } else {
        setCoverPreview(null);
        setValue(`transactions.${index}.imageUri` as const, "");
      }

      toast.error(`Failed to upload ${uploadType}`, {
        id: toastId,
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      isUploading(false);
    }
  };

  const handleThumbnailSelected = async (thumbnailFile: File) => {
    if (!pendingVideoFile) return;

    setIsUploadingMedia(true);
    setIsUploadingCover(true);
    setUploadProgress(0);

    try {
      // Upload video file with progress tracking
      toast.loading("Uploading video to IPFS...", { id: "video-upload" });

      const videoResult = await uploadToPinata(
        pendingVideoFile,
        `droposal-video-${Date.now()}`,
        (progress) => {
          setUploadProgress(progress);
          toast.loading(`Uploading video... ${progress}%`, { id: "video-upload" });
        }
      );

      if (!videoResult.success || !videoResult.data) {
        throw new Error(videoResult.error || "Video upload failed");
      }

      setValue(`transactions.${index}.animationUri` as const, videoResult.data.ipfsUrl);
      setValue(`transactions.${index}.mediaType` as const, pendingVideoFile.type);

      toast.success("Video uploaded!", { id: "video-upload" });

      // Upload thumbnail as cover
      toast.loading("Uploading thumbnail to IPFS...", { id: "thumbnail-upload" });

      const thumbnailResult = await uploadToPinata(
        thumbnailFile,
        `droposal-thumbnail-${Date.now()}`,
      );

      if (!thumbnailResult.success || !thumbnailResult.data) {
        throw new Error(thumbnailResult.error || "Thumbnail upload failed");
      }

      setValue(`transactions.${index}.imageUri` as const, thumbnailResult.data.ipfsUrl);
      setValue(`transactions.${index}.coverType` as const, thumbnailFile.type);
      setCoverPreview(URL.createObjectURL(thumbnailFile));

      toast.success("Thumbnail uploaded!", { id: "thumbnail-upload" });

      // Reset state
      setShowThumbnailSelector(false);
      setPendingVideoFile(null);
      setIsUploadingMedia(false);
      setIsUploadingCover(false);
      setUploadProgress(0);

      toast.success("Video and thumbnail uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);

      // Clean up on error
      if (mediaPreview) URL.revokeObjectURL(mediaPreview);
      if (coverPreview) URL.revokeObjectURL(coverPreview);
      setMediaPreview(null);
      setCoverPreview(null);
      setValue(`transactions.${index}.animationUri` as const, "");
      setValue(`transactions.${index}.imageUri` as const, "");

      toast.error("Failed to upload video/thumbnail", {
        description: error instanceof Error ? error.message : "Please try again",
      });

      setShowThumbnailSelector(false);
      setPendingVideoFile(null);
      setIsUploadingMedia(false);
      setIsUploadingCover(false);
      setUploadProgress(0);
    }
  };

  const handleThumbnailCancel = () => {
    setShowThumbnailSelector(false);
    setPendingVideoFile(null);
    setIsUploadingMedia(false);
    setIsUploadingCover(false);
    if (mediaInputRef.current) {
      mediaInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "media" | "cover") => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file types (similar to create-coin page)
    if (type === "media") {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      const isAudio = file.type.startsWith("audio/");

      if (!isImage && !isVideo && !isAudio) {
        setMediaError("Please upload an image, video, or audio file");
        toast.error("Please upload an image, video, or audio file");
        return;
      }

      // Check against supported mime types
      const isSupportedImage = SUPPORTED_IMAGE_TYPES.includes(file.type);
      const isSupportedVideo = SUPPORTED_VIDEO_TYPES.includes(file.type);
      const isSupportedAudio = SUPPORTED_AUDIO_TYPES.includes(file.type);

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

      if (isAudio && !isSupportedAudio) {
        setMediaError("Audio type not supported. Please use: MP3, WAV, or OGG");
        toast.error("Audio type not supported. Please use: MP3, WAV, or OGG");
        return;
      }

      // Check file size - 500MB max for videos, 100MB for other media
      const maxSize = isVideo ? 500 * 1024 * 1024 : 100 * 1024 * 1024;
      const maxSizeText = isVideo ? "500MB" : "100MB";
      if (file.size > maxSize) {
        setMediaError(`File size must be less than ${maxSizeText}`);
        toast.error(`File size must be less than ${maxSizeText}`);
        return;
      }

      setMediaError("");
    } else {
      // Cover image validation
      const isImage = file.type.startsWith("image/");
      const isSupportedImage = SUPPORTED_IMAGE_TYPES.includes(file.type);

      if (!isImage || !isSupportedImage) {
        toast.error("Cover must be a supported image type: JPEG, PNG, GIF, WebP, or SVG");
        return;
      }

      const maxSize = 10 * 1024 * 1024; // 10MB limit for covers
      if (file.size > maxSize) {
        toast.error("Cover image size must be less than 10MB");
        return;
      }
    }

    handleMediaUpload(file, type);
  };

  const removeFile = (type: "media" | "cover") => {
    if (type === "media") {
      // Clean up blob URL
      if (mediaPreview && mediaPreview.startsWith("blob:")) {
        URL.revokeObjectURL(mediaPreview);
      }

      // Clear all media-related state and form values
      setMediaPreview(null);
      setValue(`transactions.${index}.animationUri` as const, "", { shouldValidate: true });
      setValue(`transactions.${index}.imageUri` as const, "", { shouldValidate: true });
      setValue(`transactions.${index}.mediaType` as const, "", { shouldValidate: true });

      // Also clear cover if it was a video thumbnail
      if (watchedMediaType?.startsWith("video")) {
        if (coverPreview && coverPreview.startsWith("blob:")) {
          URL.revokeObjectURL(coverPreview);
        }
        setCoverPreview(null);
        setValue(`transactions.${index}.coverType` as const, "", { shouldValidate: true });
      }

      setMediaError("");
      if (mediaInputRef.current) mediaInputRef.current.value = "";
    } else {
      // Clean up blob URL
      if (coverPreview && coverPreview.startsWith("blob:")) {
        URL.revokeObjectURL(coverPreview);
      }

      // Clear cover state and form values
      setCoverPreview(null);

      // Only clear imageUri if we don't have media (for images) or if we have a video
      if (!watchedMediaType?.startsWith("image")) {
        setValue(`transactions.${index}.imageUri` as const, "", { shouldValidate: true });
      }
      setValue(`transactions.${index}.coverType` as const, "", { shouldValidate: true });

      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const showCover = watchedMediaType && !watchedMediaType.startsWith("image");

  // Convert IPFS URLs to gateway URLs for display, or use blob previews
  const getDisplayUrl = (url: string | undefined, blobPreview: string | null) => {
    // Prioritize blob preview for file uploads
    if (blobPreview) return blobPreview;

    if (!url) return null;

    // Only convert valid IPFS URLs (not fake ipfs://filename ones)
    if (url.startsWith("ipfs://")) {
      const cid = url.replace("ipfs://", "");
      // Check if it's a valid CID (starts with Qm or b and is long enough)
      if (cid.length > 40 && (cid.startsWith("Qm") || cid.startsWith("b"))) {
        return ipfsToGatewayUrl(url);
      }
      // Invalid IPFS URL, don't display
      return null;
    }

    return url;
  };

  const displayMediaUrl = getDisplayUrl(watchedMediaUrl, mediaPreview);
  const displayCoverUrl = getDisplayUrl(watchedCoverUrl, coverPreview);

  // Validate IPFS CID
  const isValidIpfsCid = (url: string) => {
    if (!url) return false;
    if (url.startsWith("ipfs://")) {
      const cid = url.replace("ipfs://", "");
      return cid.length > 40 && (cid.startsWith("Qm") || cid.startsWith("b"));
    }
    return false;
  };

  const handleManualUrlSubmit = () => {
    let hasError = false;

    // Validate and set media URL
    if (manualMediaUrl) {
      if (!isValidIpfsCid(manualMediaUrl)) {
        toast.error("Invalid IPFS URL for media. Must start with ipfs:// followed by a valid CID");
        hasError = true;
      } else {
        setValue(`transactions.${index}.animationUri` as const, manualMediaUrl);
        setValue(`transactions.${index}.imageUri` as const, manualMediaUrl);
        setValue(`transactions.${index}.mediaType` as const, ""); // Unknown type for manual input
        setMediaPreview(null); // Clear blob preview since we have IPFS URL
      }
    }

    // Validate and set cover URL
    if (manualCoverUrl) {
      if (!isValidIpfsCid(manualCoverUrl)) {
        toast.error("Invalid IPFS URL for cover. Must start with ipfs:// followed by a valid CID");
        hasError = true;
      } else {
        setValue(`transactions.${index}.imageUri` as const, manualCoverUrl);
        setValue(`transactions.${index}.coverType` as const, ""); // Unknown type for manual input
        setCoverPreview(null); // Clear blob preview since we have IPFS URL
      }
    }

    if (!hasError) {
      setIsManualInputOpen(false);
      setManualMediaUrl("");
      setManualCoverUrl("");
      toast.success("IPFS URLs set successfully!");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Media</CardTitle>
        <Dialog open={isManualInputOpen} onOpenChange={setIsManualInputOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Manually input IPFS CIDs"
            >
              <Link className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Manual IPFS Input</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="manual-media-url">Media IPFS URL</Label>
                <Input
                  id="manual-media-url"
                  placeholder="ipfs://QmExample..."
                  value={manualMediaUrl}
                  onChange={(e) => setManualMediaUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the IPFS URL for your media file
                </p>
              </div>
              <div>
                <Label htmlFor="manual-cover-url">Cover IPFS URL (optional)</Label>
                <Input
                  id="manual-cover-url"
                  placeholder="ipfs://QmExample..."
                  value={manualCoverUrl}
                  onChange={(e) => setManualCoverUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the IPFS URL for your cover image
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsManualInputOpen(false);
                    setManualMediaUrl("");
                    setManualCoverUrl("");
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleManualUrlSubmit}>Set URLs</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Grid layout when both media and cover are shown */}
        <div
          className={
            showCover && displayCoverUrl ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-4"
          }
        >
          <div>
            <Label>Media File *</Label>
            <div className="mt-2 space-y-2">
              {displayMediaUrl ? (
                <>
                  <div className="relative">
                    {watchedMediaType?.startsWith("image") ? (
                      <Image
                        src={displayMediaUrl}
                        alt="Media preview"
                        width={400}
                        height={225}
                        className="w-full aspect-video object-contain bg-gray-100 rounded-lg border"
                      />
                    ) : watchedMediaType?.startsWith("video") ? (
                      <video
                        src={displayMediaUrl}
                        className="w-full aspect-video object-contain bg-black rounded-lg border"
                        controls
                      />
                    ) : watchedMediaType?.startsWith("audio") ? (
                      <div className="w-full aspect-video bg-muted rounded-lg border flex flex-col items-center justify-center space-y-4">
                        <div className="text-center">
                          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Audio File</p>
                        </div>
                        <audio controls className="w-3/4">
                          <source src={displayMediaUrl} type={watchedMediaType} />
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    ) : (
                      <div className="w-full h-48 bg-muted rounded-lg border flex items-center justify-center">
                        <p className="text-muted-foreground">Media uploaded</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        mediaInputRef.current?.click();
                      }}
                      disabled={isUploadingMedia}
                    >
                      Replace
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeFile("media");
                      }}
                      disabled={isUploadingMedia}
                    >
                      <X className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                </>
              ) : (
                <div
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                  onClick={() => mediaInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Upload media file (image, video, audio)
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    📸 Choose custom thumbnail for videos
                  </p>
                </div>
              )}
              <input
                ref={mediaInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml,video/mp4,video/webm,video/quicktime,video/x-m4v,audio/mpeg,audio/mp3,audio/wav,audio/ogg"
                className="hidden"
                onChange={(e) => handleFileChange(e, "media")}
                disabled={isUploadingMedia}
              />
              {mediaError && <p className="text-xs text-red-500 mt-2">{mediaError}</p>}
            </div>
          </div>

          {showCover && (
            <div>
              <Label>Cover Image</Label>
              <div className="mt-2">
                {displayCoverUrl ? (
                  <div className="relative">
                    <Image
                      src={displayCoverUrl}
                      alt="Cover preview"
                      width={400}
                      height={225}
                      className="w-full aspect-video object-cover rounded-lg border"
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={() => removeFile("cover")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                    onClick={() => coverInputRef.current?.click()}
                  >
                    <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Upload cover image</p>
                  </div>
                )}
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, "cover")}
                  disabled={isUploadingCover}
                />
              </div>
            </div>
          )}
        </div>

        {/* Video Thumbnail Selector Modal */}
        {showThumbnailSelector && pendingVideoFile && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <VideoThumbnailSelector
              videoFile={pendingVideoFile}
              onThumbnailSelected={handleThumbnailSelected}
              onCancel={handleThumbnailCancel}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
