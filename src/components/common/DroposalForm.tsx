"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ExternalLink, Info, Upload, X } from "lucide-react";
import { useAccount } from "wagmi";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { GNARS_ADDRESSES } from "@/lib/config";

interface DroposalData {
  name: string;
  symbol: string;
  description: string;
  mediaUrl: string;
  coverUrl: string;
  price: string;
  editionType: "fixed" | "open";
  editionSize: string;
  startTime: string;
  endTime: string;
  mintLimitPerAddress: string;
  royaltyPercentage: string;
  payoutAddress: string;
  defaultAdmin: string;
  mediaType?: string;
  coverType?: string;
}

interface DroposalFormProps {
  data: Partial<DroposalData>;
  onChange: (updates: Partial<DroposalData>) => void;
}

export function DroposalForm({ data, onChange }: DroposalFormProps) {
  const { address } = useAccount();
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [editionType, setEditionType] = useState<"fixed" | "open">(data.editionType || "fixed");
  const [isUploading, setIsUploading] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Set default values if not present
  const defaultData: DroposalData = {
    name: "",
    symbol: "",
    description: "",
    mediaUrl: "",
    coverUrl: "",
    price: "0.01",
    editionType: "fixed" as const,
    editionSize: "100",
    startTime: "",
    endTime: "",
    mintLimitPerAddress: "",
    royaltyPercentage: "5",
    payoutAddress: GNARS_ADDRESSES.treasury,
    defaultAdmin: address || "",
    ...data,
  };

  const updateData = (updates: Partial<DroposalData>) => {
    onChange({ ...defaultData, ...updates });
  };

  const handleMediaUpload = async (file: File, type: "media" | "cover") => {
    setIsUploading(true);

    // Create preview
    const previewUrl = URL.createObjectURL(file);
    if (type === "media") {
      setMediaPreview(previewUrl);
    } else {
      setCoverPreview(previewUrl);
    }

    try {
      // TODO: Implement actual IPFS upload
      // For now, using mock IPFS URL
      const ipfsUrl = `ipfs://${file.name}`;

      updateData({
        [type === "media" ? "mediaUrl" : "coverUrl"]: ipfsUrl,
        [type === "media" ? "mediaType" : "coverType"]: file.type,
      });
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "media" | "cover") => {
    const file = e.target.files?.[0];
    if (file) {
      handleMediaUpload(file, type);
    }
  };

  const removeFile = (type: "media" | "cover") => {
    if (type === "media") {
      setMediaPreview(null);
      updateData({ mediaUrl: "", mediaType: "" });
      if (mediaInputRef.current) mediaInputRef.current.value = "";
    } else {
      setCoverPreview(null);
      updateData({ coverUrl: "", coverType: "" });
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const handleEditionTypeChange = (value: "fixed" | "open") => {
    setEditionType(value);
    updateData({
      editionType: value,
      editionSize: value === "open" ? "0" : defaultData.editionSize,
    });
  };

  // Check if media requires cover (non-image files)
  const showCover = defaultData.mediaType && !defaultData.mediaType.startsWith("image");

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
          <div>
            <Label htmlFor="name">Collection Name *</Label>
            <Input
              id="name"
              placeholder="Gnars Special Edition"
              value={defaultData.name}
              onChange={(e) => updateData({ name: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="symbol">Collection Symbol *</Label>
            <Input
              id="symbol"
              placeholder="GNARSSE"
              value={defaultData.symbol}
              onChange={(e) => updateData({ symbol: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="A special edition drop for the Gnars community..."
              value={defaultData.description}
              onChange={(e) => updateData({ description: e.target.value })}
              rows={3}
            />
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
              {mediaPreview ? (
                <div className="relative">
                  {defaultData.mediaType?.startsWith("image") ? (
                    <Image
                      src={mediaPreview}
                      alt="Media preview"
                      width={400}
                      height={192}
                      className="w-full h-48 object-cover rounded-lg border"
                    />
                  ) : defaultData.mediaType?.startsWith("video") ? (
                    <video
                      src={mediaPreview}
                      className="w-full h-48 object-cover rounded-lg border"
                      controls
                    />
                  ) : (
                    <div className="w-full h-48 bg-muted rounded-lg border flex items-center justify-center">
                      <p className="text-muted-foreground">Media uploaded</p>
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute top-2 right-2"
                    onClick={() => removeFile("media")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
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
                {coverPreview ? (
                  <div className="relative">
                    <Image
                      src={coverPreview}
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
          <div>
            <Label htmlFor="price">Price per NFT (ETH) *</Label>
            <Input
              id="price"
              type="number"
              step="0.001"
              placeholder="0.01"
              value={defaultData.price}
              onChange={(e) => updateData({ price: e.target.value })}
            />
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
              onValueChange={(value: "fixed" | "open") => handleEditionTypeChange(value)}
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
            <div>
              <Label htmlFor="editionSize">Edition Size *</Label>
              <Input
                id="editionSize"
                type="number"
                placeholder="100"
                value={defaultData.editionSize}
                onChange={(e) => updateData({ editionSize: e.target.value })}
              />
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
          <div>
            <Label htmlFor="startTime">Sale Start Time</Label>
            <Input
              id="startTime"
              type="datetime-local"
              value={defaultData.startTime}
              onChange={(e) => updateData({ startTime: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="endTime">Sale End Time</Label>
            <Input
              id="endTime"
              type="datetime-local"
              value={defaultData.endTime}
              onChange={(e) => updateData({ endTime: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="mintLimitPerAddress">Mint Limit per Address</Label>
            <Input
              id="mintLimitPerAddress"
              type="number"
              placeholder="Leave empty for unlimited"
              value={defaultData.mintLimitPerAddress}
              onChange={(e) => updateData({ mintLimitPerAddress: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Revenue & Administration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue & Administration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="royaltyPercentage">Royalty Percentage *</Label>
            <Input
              id="royaltyPercentage"
              type="number"
              min="0"
              max="100"
              placeholder="5"
              value={defaultData.royaltyPercentage}
              onChange={(e) => updateData({ royaltyPercentage: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Percentage of secondary sales that go to the payout address
            </p>
          </div>

          <div>
            <Label htmlFor="payoutAddress">Payout Address *</Label>
            <Input
              id="payoutAddress"
              placeholder="0x... or ENS name"
              value={defaultData.payoutAddress}
              onChange={(e) => updateData({ payoutAddress: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Address that receives mint proceeds and royalties (defaults to DAO treasury)
            </p>
          </div>

          <div>
            <Label htmlFor="defaultAdmin">Admin Address *</Label>
            <Input
              id="defaultAdmin"
              placeholder="0x... or ENS name"
              value={defaultData.defaultAdmin}
              onChange={(e) => updateData({ defaultAdmin: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Address that can manage the collection (defaults to connected wallet)
            </p>
          </div>
        </CardContent>
      </Card>

      <div>
        <Label htmlFor="dropDescription">Transaction Description</Label>
        <Textarea
          id="dropDescription"
          placeholder="Describe this droposal transaction..."
          value={data.description || ""}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={2}
        />
      </div>
    </div>
  );
}
