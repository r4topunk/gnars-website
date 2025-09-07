"use client";

import { useRef, useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { useAccount } from "wagmi";
import Image from "next/image";
import { ExternalLink, Info, Upload, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { type ProposalFormValues } from "../proposals/schema";

interface Props { index: number }

export function DroposalForm({ index }: Props) {
  const { register, setValue, watch, formState: { errors } } = useFormContext<ProposalFormValues>();
  const { address } = useAccount();
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [editionType, setEditionType] = useState<"fixed" | "open">("fixed");
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
      setValue(`transactions.${index}.mediaUrl` as const, `ipfs://${file.name}`); // Mock IPFS URL
      setValue(`transactions.${index}.mediaType` as const, file.type);
    } else {
      setCoverPreview(previewUrl);
      setValue(`transactions.${index}.coverUrl` as const, `ipfs://${file.name}`); // Mock IPFS URL
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

  // Check if media requires cover (non-image files)
  const showCover = watchedMediaType && !watchedMediaType.startsWith("image");

  // Set initial edition type from form context or default
  useEffect(() => {
    const currentEditionType = watch(`transactions.${index}.editionType`);
    if (currentEditionType) {
      setEditionType(currentEditionType);
    } else {
      setValue(`transactions.${index}.editionType` as const, "fixed");
    }
  }, [index, watch, setValue]);

  const handleEditionTypeChange = (value: "fixed" | "open") => {
    setEditionType(value);
    setValue(`transactions.${index}.editionType` as const, value);
    setValue(`transactions.${index}.editionSize` as const, value === "open" ? "0" : "100");
  };

  // Safely read error messages from discriminated union transaction errors
  type FieldErrorLike = { message?: string } | undefined;
  const getErrorMessage = (key: string): string | undefined => {
    const txErrors = errors.transactions?.[index] as unknown as Record<string, FieldErrorLike> | undefined;
    const field = txErrors?.[key];
    return (field && typeof field === "object" && "message" in field) ? field?.message : undefined;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Droposal Details</h3>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            This creates a Zora ERC721Drop contract.{" "}
            <a
              href="https://docs.zora.co/contracts/ERC721Drop"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center hover:underline"
            >
              Learn more <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </AlertDescription>
        </Alert>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-2">
            <Label htmlFor="name">Collection Name *</Label>
            <Input
              id="name"
              placeholder="Gnars Special Edition"
              {...register(`transactions.${index}.name` as const)}
            />
            {getErrorMessage("name") && (
              <p className="text-xs text-red-500">{String(getErrorMessage("name"))}</p>
            )}
          </div>

          <div className="grid w/full max-w-sm items-center gap-2">
            <Label htmlFor="symbol">Collection Symbol *</Label>
            <Input
              id="symbol"
              placeholder="GNARSSE"
              {...register(`transactions.${index}.symbol` as const)}
            />
            {getErrorMessage("symbol") && (
              <p className="text-xs text-red-500">{String(getErrorMessage("symbol"))}</p>
            )}
          </div>

          <div className="grid w-full max-w-sm items-center gap-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="A special edition drop for the Gnars community..."
              {...register(`transactions.${index}.description` as const)}
              rows={3}
            />
            {getErrorMessage("description") && (
              <p className="text-xs text-red-500">{String(getErrorMessage("description"))}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Media */}
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

      {/* Pricing & Supply */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pricing & Supply</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-2">
            <Label htmlFor="price">Price per NFT (ETH) *</Label>
            <Input
              id="price"
              type="number"
              step="0.001"
              placeholder="0.01"
              {...register(`transactions.${index}.price` as const)}
            />
            {getErrorMessage("price") && (
              <p className="text-xs text-red-500">{String(getErrorMessage("price"))}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Zora charges 0.000777 ETH per mint as a protocol fee.{" "}
              <a
                href="https://support.zora.co/en/articles/4981037-zora-mint-collect-fees"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                Learn more
              </a>
            </p>
          </div>

          <div>
            <Label>Edition Type *</Label>
            <RadioGroup
              value={editionType}
              onValueChange={handleEditionTypeChange}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fixed" id="fixed" />
                <Label htmlFor="fixed">Fixed Edition</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="open" id="open" />
                <Label htmlFor="open">Open Edition</Label>
              </div>
            </RadioGroup>
          </div>

          {editionType === "fixed" && (
            <div className="grid w/full max-w-sm items-center gap-2">
              <Label htmlFor="editionSize">Edition Size *</Label>
              <Input
                id="editionSize"
                type="number"
                placeholder="100"
                {...register(`transactions.${index}.editionSize` as const)}
              />
              {getErrorMessage("editionSize") && (
                <p className="text-xs text-red-500">{String(getErrorMessage("editionSize"))}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sale Timing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sale Timing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w/full max-w-sm items-center gap-2">
            <Label htmlFor="startTime">Sale Start Time</Label>
            <Input
              id="startTime"
              type="datetime-local"
              {...register(`transactions.${index}.startTime` as const)}
            />
            {getErrorMessage("startTime") && (
              <p className="text-xs text-red-500">{String(getErrorMessage("startTime"))}</p>
            )}
          </div>

          <div className="grid w/full max-w-sm items-center gap-2">
            <Label htmlFor="endTime">Sale End Time</Label>
            <Input
              id="endTime"
              type="datetime-local"
              {...register(`transactions.${index}.endTime` as const)}
            />
            {getErrorMessage("endTime") && (
              <p className="text-xs text-red-500">{String(getErrorMessage("endTime"))}</p>
            )}
          </div>

          <div className="grid w/full max-w-sm items-center gap-2">
            <Label htmlFor="mintLimitPerAddress">Mint Limit per Address</Label>
            <Input
              id="mintLimitPerAddress"
              type="number"
              placeholder="Leave empty for unlimited"
              {...register(`transactions.${index}.mintLimitPerAddress` as const)}
            />
            {getErrorMessage("mintLimitPerAddress") && (
              <p className="text-xs text-red-500">{String(getErrorMessage("mintLimitPerAddress"))}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Revenue & Administration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue & Administration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w/full max-w-sm items-center gap-2">
            <Label htmlFor="royaltyPercentage">Royalty Percentage *</Label>
            <Input
              id="royaltyPercentage"
              type="number"
              min="0"
              max="100"
              placeholder="5"
              {...register(`transactions.${index}.royaltyPercentage` as const)}
            />
            {getErrorMessage("royaltyPercentage") && (
              <p className="text-xs text-red-500">{String(getErrorMessage("royaltyPercentage"))}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Percentage of secondary sales that go to the payout address
            </p>
          </div>

          <div className="grid w/full max-w-sm items-center gap-2">
            <Label htmlFor="payoutAddress">Payout Address *</Label>
            <Input
              id="payoutAddress"
              placeholder="0x... or ENS name"
              {...register(`transactions.${index}.payoutAddress` as const)}
            />
            {getErrorMessage("payoutAddress") && (
              <p className="text-xs text-red-500">{String(getErrorMessage("payoutAddress"))}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Address that receives mint proceeds and royalties (defaults to DAO treasury)
            </p>
          </div>

          <div className="grid w/full max-w-sm items-center gap-2">
            <Label htmlFor="defaultAdmin">Admin Address *</Label>
            <Input
              id="defaultAdmin"
              placeholder="0x... or ENS name"
              value={address || ""}
              {...register(`transactions.${index}.defaultAdmin` as const)}
            />
            {getErrorMessage("defaultAdmin") && (
              <p className="text-xs text-red-500">{String(getErrorMessage("defaultAdmin"))}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Address that can manage the collection (defaults to connected wallet)
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid w/full max-w-sm items-center gap-2">
        <Label htmlFor="dropDescription">Transaction Description</Label>
        <Textarea
          id="dropDescription"
          placeholder="Describe this droposal transaction..."
          {...register(`transactions.${index}.description` as const)}
          rows={2}
        />
        {getErrorMessage("description") && (
          <p className="text-xs text-red-500">{String(getErrorMessage("description"))}</p>
        )}
      </div>
    </div>
  );
}
