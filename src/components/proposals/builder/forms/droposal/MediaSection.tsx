"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { Upload, X } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { type ProposalFormValues } from "@/components/proposals/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
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

const SUPPORTED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm", 
  "video/quicktime",
  "video/x-m4v"
];

const SUPPORTED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
];

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

    try {
      // Upload video file
      toast.loading("Uploading video to IPFS...", { id: "video-upload" });

      const videoResult = await uploadToPinata(pendingVideoFile, `droposal-video-${Date.now()}`);

      if (!videoResult.success || !videoResult.data) {
        throw new Error(videoResult.error || "Video upload failed");
      }

      setValue(`transactions.${index}.animationUri` as const, videoResult.data.ipfsUrl);
      setValue(`transactions.${index}.mediaType` as const, pendingVideoFile.type);

      toast.success("Video uploaded!", { id: "video-upload" });

      // Upload thumbnail as cover
      toast.loading("Uploading thumbnail to IPFS...", { id: "thumbnail-upload" });

      const thumbnailResult = await uploadToPinata(thumbnailFile, `droposal-thumbnail-${Date.now()}`);

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
    }
  };

  const handleThumbnailCancel = () => {
    setShowThumbnailSelector(false);
    setPendingVideoFile(null);
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
      if (mediaPreview && mediaPreview.startsWith("blob:")) {
        URL.revokeObjectURL(mediaPreview);
      }
      setMediaPreview(null);
      setValue(`transactions.${index}.mediaUrl` as const, "");
      setValue(`transactions.${index}.mediaType` as const, undefined);
      setMediaError("");
      if (mediaInputRef.current) mediaInputRef.current.value = "";
    } else {
      setCoverPreview(null);
      setValue(`transactions.${index}.coverUrl` as const, "");
      setValue(`transactions.${index}.coverType` as const, undefined);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Media</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Media File *</Label>
          <div className="mt-2">
            {displayMediaUrl ? (
              watchedMediaType?.startsWith("image") ? (
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
              )
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
            {mediaError && (
              <p className="text-xs text-red-500 mt-2">{mediaError}</p>
            )}
          </div>
        </div>

        {showCover && (
          <div>
            <Label>Cover Image</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Cover image for non-image media files
            </p>
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
