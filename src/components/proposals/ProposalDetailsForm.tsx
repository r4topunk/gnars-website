"use client";

import { useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import Image from "next/image";
import { Eye, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/common/Markdown";
import { type ProposalFormValues } from "./schema";

export function ProposalDetailsForm() {
  const { register, setValue, watch, formState: { errors } } = useFormContext<ProposalFormValues>();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const watchedDescription = watch("description");
  const watchedBannerImage = watch("bannerImage");

  const handleImageUpload = async (file: File) => {
    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);

    // In a real implementation, you would upload to IPFS here
    // For now, we'll store the preview URL
    // TODO: Implement IPFS upload
    const ipfsUrl = `ipfs://${file.name}`; // Mock IPFS URL
    setValue("bannerImage", ipfsUrl);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleImageUpload(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setValue("bannerImage", undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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
          {errors.title && (
            <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">Keep it concise and descriptive</p>
        </div>

        <div>
          <Label htmlFor="banner">Banner Image</Label>
          <div className="mt-2">
            {imagePreview || watchedBannerImage ? (
              <div
                className="relative rounded-lg border overflow-hidden"
                style={{ aspectRatio: "16 / 9" }}
              >
                <Image
                  src={imagePreview || watchedBannerImage || ""}
                  alt="Banner preview"
                  fill
                  className="object-cover"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute top-2 right-2"
                  onClick={removeImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click to upload banner image</p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
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
