"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Eye, Loader2, Upload, X } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { Markdown } from "@/components/common/Markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ipfsToGatewayUrl, uploadToPinata } from "@/lib/pinata";
import { type ProposalFormValues } from "./schema";

export function ProposalDetailsForm() {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<ProposalFormValues>();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const watchedDescription = watch("description");
  const watchedBannerImage = watch("bannerImage");

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    
    try {
      // Create local preview immediately
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);

      // Show loading toast
      toast.loading("Uploading image to IPFS...", { id: "image-upload" });

      // Upload to Pinata
      const result = await uploadToPinata(file, `proposal-banner-${Date.now()}`);

      if (!result.success || !result.data) {
        throw new Error(result.error || "Upload failed");
      }

      // Store the IPFS URL in form
      setValue("bannerImage", result.data.ipfsUrl);

      // Update preview to use gateway URL
      setImagePreview(result.data.gatewayUrl);

      toast.success("Image uploaded successfully!", { id: "image-upload" });
    } catch (error) {
      console.error("Upload error:", error);
      
      // Clean up preview on error
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
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast.error("File size must be less than 10MB");
        return;
      }
      
      handleImageUpload(file);
    }
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

  // Convert IPFS URL to gateway URL for display
  const displayImageUrl = imagePreview || (watchedBannerImage ? ipfsToGatewayUrl(watchedBannerImage) : null);

  // Markdown preview is rendered via the shared Markdown component

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Proposal Details</h2>
        <p className="text-muted-foreground">Provide the basic information for your proposal</p>
      </div>

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
                <Image
                  src={displayImageUrl}
                  alt="Banner preview"
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

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label htmlFor="description">Description *</Label>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowMarkdownPreview(!showMarkdownPreview)}
            >
              <Eye className="h-4 w-4 mr-1" />
              {showMarkdownPreview ? "Edit" : "Preview"}
            </Button>
          </div>

          {showMarkdownPreview ? (
            <Card>
              <CardContent className="p-4 min-h-[200px]">
                {watchedDescription ? (
                  <Markdown className="prose-sm max-w-none">{watchedDescription}</Markdown>
                ) : (
                  <p className="text-muted-foreground italic">No description yet</p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Textarea
              id="description"
              placeholder="Describe your proposal in detail...

You can use **markdown** formatting:
- **Bold text**
- *Italic text*
- `Code snippets`

Explain the problem, solution, and expected outcomes."
              {...register("description")}
              rows={8}
              className="resize-none"
            />
          )}

          {errors.description && (
            <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Markdown formatting supported. Be thorough and clear about your proposal&apos;s purpose
            and impact.
          </p>
        </div>
      </div>
    </div>
  );
}
