"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Info } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { useAccount } from "wagmi";
import { type ProposalFormValues } from "@/components/proposals/schema";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { MediaSection } from "./droposal/MediaSection";

interface Props {
  index: number;
}

export function DroposalForm({ index }: Props) {
  const { address } = useAccount();
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<ProposalFormValues>();
  const [editionType, setEditionType] = useState<"fixed" | "open">("fixed");

  useEffect(() => {
    const currentEditionType = watch(`transactions.${index}.editionType`);
    if (currentEditionType) {
      setEditionType(currentEditionType);
    } else {
      setValue(`transactions.${index}.editionType` as const, "fixed");
    }
  }, [index, watch, setValue]);

  // Pre-fill defaultAdmin once when empty
  useEffect(() => {
    const current = watch(`transactions.${index}.defaultAdmin`);
    if (!current && address) {
      setValue(`transactions.${index}.defaultAdmin` as const, address);
    }
  }, [address, index, setValue, watch]);

  const handleEditionTypeChange = (value: "fixed" | "open") => {
    setEditionType(value);
    setValue(`transactions.${index}.editionType` as const, value);
    setValue(`transactions.${index}.editionSize` as const, value === "open" ? "0" : "100");
  };

  type FieldErrorLike = { message?: string } | undefined;
  const getErrorMessage = (key: string): string | undefined => {
    const txErrors = errors.transactions?.[index] as unknown as
      | Record<string, FieldErrorLike>
      | undefined;
    const field = txErrors?.[key];
    return field && typeof field === "object" && "message" in field ? field?.message : undefined;
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

          <div className="grid w-full max-w-sm items-center gap-2">
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
            <Label htmlFor="collectionDescription">Collection Description *</Label>
            <Textarea
              id="collectionDescription"
              placeholder="A special edition drop for the Gnars community..."
              {...register(`transactions.${index}.collectionDescription` as const)}
              rows={3}
            />
            {getErrorMessage("collectionDescription") && (
              <p className="text-xs text-red-500">{String(getErrorMessage("collectionDescription"))}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Media */}
      <MediaSection index={index} />

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
            <div className="grid w-full max-w-sm items-center gap-2">
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
          <div className="grid w-full max-w-sm items-center gap-2">
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

          <div className="grid w-full max-w-sm items-center gap-2">
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

          <div className="grid w-full max-w-sm items-center gap-2">
            <Label htmlFor="mintLimitPerAddress">Mint Limit per Address</Label>
            <Input
              id="mintLimitPerAddress"
              type="number"
              placeholder="Leave empty for unlimited"
              {...register(`transactions.${index}.mintLimitPerAddress` as const)}
            />
            {getErrorMessage("mintLimitPerAddress") && (
              <p className="text-xs text-red-500">
                {String(getErrorMessage("mintLimitPerAddress"))}
              </p>
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
          <div className="grid w-full max-w-sm items-center gap-2">
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

          <div className="grid w-full max-w-sm items-center gap-2">
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

          <div className="grid w-full max-w-sm items-center gap-2">
            <Label htmlFor="defaultAdmin">Admin Address *</Label>
            <Input
              id="defaultAdmin"
              placeholder="0x... or ENS name"
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

      {/* Transaction Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction Description</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid w-full max-w-sm items-center gap-2">
            <Label htmlFor="transactionDescription">Description (optional)</Label>
            <Textarea
              id="transactionDescription"
              placeholder="Explain why this droposal should be created..."
              {...register(`transactions.${index}.description` as const)}
              rows={3}
            />
            {getErrorMessage("description") && (
              <p className="text-xs text-red-500">{String(getErrorMessage("description"))}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              This description will appear in the proposal transaction list
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
