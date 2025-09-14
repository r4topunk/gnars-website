"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, X } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { type ProposalFormValues } from "@/components/proposals/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface MediaSectionProps {
  index: number;
}

export function MediaSection({ index }: MediaSectionProps) {
  const { setValue, watch } = useFormContext<ProposalFormValues>();
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const watchedMediaType = watch(`transactions.${index}.mediaType`);
  const watchedMediaUrl = watch(`transactions.${index}.mediaUrl`);
  const watchedCoverUrl = watch(`transactions.${index}.coverUrl`);

  const handleMediaUpload = async (file: File, type: "media" | "cover") => {
    setIsUploading(true);
    const previewUrl = URL.createObjectURL(file);

    if (type === "media") {
      setValue(`transactions.${index}.mediaUrl` as const, `ipfs://${file.name}`);
      setValue(`transactions.${index}.mediaType` as const, file.type);
    } else {
      setCoverPreview(previewUrl);
      setValue(`transactions.${index}.coverUrl` as const, `ipfs://${file.name}`);
      setValue(`transactions.${index}.coverType` as const, file.type);
    }
    setIsUploading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "media" | "cover") => {
    const file = e.target.files?.[0];
    if (file) {
      handleMediaUpload(file, type);
    }
  };

  const removeFile = (type: "media" | "cover") => {
    if (type === "media") {
      setValue(`transactions.${index}.mediaUrl` as const, "");
      setValue(`transactions.${index}.mediaType` as const, undefined);
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
                  height={192}
                  className="w-full h-48 object-cover rounded-lg border"
                />
              ) : watchedMediaType?.startsWith("video") ? (
                <video
                  src={watchedMediaUrl}
                  className="w-full h-48 object-cover rounded-lg border"
                  controls
                />
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
              </div>
            )}
            <input
              ref={mediaInputRef}
              type="file"
              accept="image/*,video/*,audio/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, "media")}
              disabled={isUploading}
            />
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
                    height={128}
                    className="w-full h-32 object-cover rounded-lg border"
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
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(e, "cover")}
                disabled={isUploading}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
