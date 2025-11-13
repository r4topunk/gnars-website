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
import { generateVideoThumbnail } from "@/lib/video-thumbnail";
import { VideoThumbnailSelector } from "@/components/ui/video-thumbnail-selector";

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
  const [isUploading, setIsUploading] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [showThumbnailSelector, setShowThumbnailSelector] = useState(false);
  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Cleanup cover preview URL on unmount or change
  useEffect(() => {
    return () => {
      if (coverPreview) {
        URL.revokeObjectURL(coverPreview);
      }
    };
  }, [coverPreview]);

  const watchedMediaType = watch(`transactions.${index}.mediaType`);
  const watchedMediaUrl = watch(`transactions.${index}.mediaUrl`);
  const watchedCoverUrl = watch(`transactions.${index}.coverUrl`);

  const handleMediaUpload = async (file: File, type: "media" | "cover") => {
    setIsUploading(true);
    const previewUrl = URL.createObjectURL(file);

    if (type === "media") {
      const isVideo = file.type.startsWith("video/");
      
      setValue(`transactions.${index}.mediaUrl` as const, `ipfs://${file.name}`);
      setValue(`transactions.${index}.mediaType` as const, file.type);

      // For videos, show thumbnail selector
      if (isVideo) {
        setPendingVideoFile(file);
        setShowThumbnailSelector(true);
        setIsUploading(false);
        return;
      }
    } else {
      setCoverPreview(previewUrl);
      setValue(`transactions.${index}.coverUrl` as const, `ipfs://${file.name}`);
      setValue(`transactions.${index}.coverType` as const, file.type);
    }
    setIsUploading(false);
  };

  const handleThumbnailSelected = (thumbnailFile: File) => {
    if (!pendingVideoFile) return;

    // Set the video file data
    setValue(`transactions.${index}.mediaUrl` as const, `ipfs://${pendingVideoFile.name}`);
    setValue(`transactions.${index}.mediaType` as const, pendingVideoFile.type);

    // Set the thumbnail as cover
    const thumbnailPreview = URL.createObjectURL(thumbnailFile);
    setCoverPreview(thumbnailPreview);
    setValue(`transactions.${index}.coverUrl` as const, `ipfs://${thumbnailFile.name}`);
    setValue(`transactions.${index}.coverType` as const, thumbnailFile.type);

    // Reset state
    setShowThumbnailSelector(false);
    setPendingVideoFile(null);
    toast.success("Video and thumbnail selected!");
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

      // Check file size (max 100MB for droposals which may be larger than coins)
      const maxSize = 100 * 1024 * 1024;
      if (file.size > maxSize) {
        setMediaError("File size must be less than 100MB");
        toast.error("File size must be less than 100MB");
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Media</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Media File *</Label>
          <div className="mt-2">
            {watchedMediaUrl ? (
              watchedMediaType?.startsWith("image") ? (
                <Image
                  src={watchedMediaUrl}
                  alt="Media preview"
                  width={400}
                  height={225}
                  className="w-full aspect-video object-contain bg-gray-100 rounded-lg border"
                />
              ) : watchedMediaType?.startsWith("video") ? (
                <video
                  src={watchedMediaUrl}
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
                    <source src={watchedMediaUrl} type={watchedMediaType} />
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
              disabled={isUploading}
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
              {coverPreview || watchedCoverUrl ? (
                <div className="relative">
                  <Image
                    src={coverPreview || watchedCoverUrl || ""}
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
                disabled={isUploading}
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
