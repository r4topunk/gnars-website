"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("propose");
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
      toast.loading(t("banner.uploading"), { id: "image-upload" });
      const result = await uploadToPinata(file, `proposal-banner-${Date.now()}`);
      if (!result.success || !result.data) {
        throw new Error(result.error || "Upload failed");
      }
      setValue("bannerImage", result.data.ipfsUrl);
      setImagePreview(result.data.gatewayUrl);
      toast.success(t("banner.uploadSuccess"), { id: "image-upload" });
    } catch (error) {
      console.error("Upload error:", error);
      setImagePreview(null);
      setValue("bannerImage", undefined);
      toast.error(t("banner.uploadFailed"), {
        id: "image-upload",
        description: error instanceof Error ? error.message : t("banner.pleaseRetry"),
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("banner.notAnImage"));
      return;
    }
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(t("banner.fileTooLarge"));
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
        <Label htmlFor="title">{t("details.titleLabel")}</Label>
        <Input
          id="title"
          placeholder={t("details.titlePlaceholder")}
          {...register("title")}
          className="mt-1"
        />
        {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
        <p className="text-xs text-muted-foreground mt-1">{t("details.titleHelper")}</p>
      </div>

      <div>
        <Label htmlFor="banner">{t("details.bannerLabel")}</Label>
        <div className="mt-2">
          {displayImageUrl ? (
            <div
              className="relative rounded-lg border overflow-hidden"
              style={{ aspectRatio: "16 / 9" }}
            >
              <Image
                src={displayImageUrl}
                alt={t("alt.bannerPreview")}
                fill
                className="object-cover"
              />
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
                  <p className="text-sm text-muted-foreground">{t("details.uploadingToIpfs")}</p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{t("details.clickToUpload")}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("details.uploadSizeHint")}
                  </p>
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
