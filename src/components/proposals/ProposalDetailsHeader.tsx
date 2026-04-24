"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Upload, X } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ipfsToGatewayUrl, uploadToPinata } from "@/lib/pinata";
import type { ProposalFormValues } from "./schema";

export function ProposalDetailsHeader() {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<ProposalFormValues>();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const watchedBannerImage = watch("bannerImage");

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      toast.loading("Uploading image to IPFS...", { id: "image-upload" });
      const result = await uploadToPinata(file, `proposal-banner-${Date.now()}`);
      if (!result.success || !result.data) {
        throw new Error(result.error || "Upload failed");
      }
      setValue("bannerImage", result.data.ipfsUrl);
      setImagePreview(result.data.gatewayUrl);
      toast.success("Image uploaded successfully!", { id: "image-upload" });
    } catch (error) {
      console.error("Upload error:", error);
      setImagePreview(null);
      setValue("bannerImage", undefined);
      toast.error("Failed to upload image", {
        id: "image-upload",
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File size must be less than 10MB");
      return;
    }
    handleImageUpload(file);
  };

  const removeImage = () => {
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setValue("bannerImage", undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const displayImageUrl =
    imagePreview || (watchedBannerImage ? ipfsToGatewayUrl(watchedBannerImage) : null);

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="title">Proposal Title *</Label>
        <Input
          id="title"
          placeholder="Enter proposal title..."
          {...register("title")}
          className="mt-1"
        />
        {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
        <p className="text-xs text-muted-foreground mt-1">Keep it concise and descriptive</p>
      </div>

      <div>
        <Label htmlFor="banner">Banner Image</Label>
        <div className="mt-2">
          {displayImageUrl ? (
            <div
              className="relative rounded-lg border overflow-hidden"
              style={{ aspectRatio: "16 / 9" }}
            >
              <Image src={displayImageUrl} alt="Banner preview" fill className="object-cover" />
              <Button
                size="sm"
                variant="destructive"
                className="absolute top-2 right-2"
                onClick={removeImage}
                disabled={isUploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
              onClick={() => !isUploading && fileInputRef.current?.click()}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground animate-spin" />
                  <p className="text-sm text-muted-foreground">Uploading to IPFS...</p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Click to upload banner image</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
                </>
              )}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </div>
      </div>
    </div>
  );
}
