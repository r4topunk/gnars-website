"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, ChevronDown, ChevronUp, ExternalLink, Info } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { type ProposalFormValues } from "@/components/proposals/schema";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  calculateDroposalStartDate,
  useDaoSettings,
  type StartTimeCalculation,
} from "@/hooks/use-dao-settings";
import { useUserAddress } from "@/hooks/use-user-address";
import { DAO_ADDRESSES } from "@/lib/config";
import { createDefaultSplitConfig } from "@/lib/splits-utils";
import type { SplitRecipient } from "@/lib/splits-utils";
import { DroposalDebugPanel } from "./droposal/DroposalDebugPanel";
import { MediaSection } from "./droposal/MediaSection";
import { SplitDebugPanel } from "./droposal/SplitDebugPanel";
import { SplitRecipientsSection } from "./droposal/SplitRecipientsSection";

interface Props {
  index: number;
}

export function DroposalForm({ index }: Props) {
  const t = useTranslations("propose");
  const { address } = useUserAddress();
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<ProposalFormValues>();
  const [editionType, setEditionType] = useState<"fixed" | "open">("open");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [startTimeCalc, setStartTimeCalc] = useState<StartTimeCalculation | undefined>();
  const [useSplit, setUseSplit] = useState(true);

  // Get DAO settings for auto-calculating start time
  const { votingDelay, votingPeriod, timelockDelay, isLoading: settingsLoading } = useDaoSettings();

  // Initialize split recipients with default config on mount
  useEffect(() => {
    const currentRecipients = watch(`transactions.${index}.splitRecipients`);

    if (!currentRecipients || currentRecipients.length === 0) {
      const defaultConfig = createDefaultSplitConfig(DAO_ADDRESSES.treasury, address || "");
      setValue(`transactions.${index}.splitRecipients` as const, defaultConfig.recipients);
      setValue(
        `transactions.${index}.splitDistributorFee` as const,
        defaultConfig.distributorFeePercent,
      );
    }
  }, [address, index, setValue, watch]);

  // Watch split fields
  const splitRecipients = watch(`transactions.${index}.splitRecipients`) as
    | SplitRecipient[]
    | undefined;
  const splitDistributorFee = watch(`transactions.${index}.splitDistributorFee`) as
    | number
    | undefined;
  const createdSplitAddress = watch(`transactions.${index}.createdSplitAddress`) as
    | string
    | undefined;

  useEffect(() => {
    const currentEditionType = watch(`transactions.${index}.editionType`);
    if (currentEditionType) {
      setEditionType(currentEditionType);
    } else {
      setValue(`transactions.${index}.editionType` as const, "open");
    }
  }, [index, watch, setValue]);

  // Pre-fill defaultAdmin once when empty
  useEffect(() => {
    const current = watch(`transactions.${index}.defaultAdmin`);
    if (!current && address) {
      setValue(`transactions.${index}.defaultAdmin` as const, address);
    }
  }, [address, index, setValue, watch]);

  // Pre-fill payoutAddress to DAO treasury if empty (and not using split)
  useEffect(() => {
    const current = watch(`transactions.${index}.payoutAddress`);
    const isUsingSplit = watch(`transactions.${index}.useSplit`);
    if (!current && !isUsingSplit) {
      setValue(`transactions.${index}.payoutAddress` as const, DAO_ADDRESSES.treasury);
    }
  }, [index, setValue, watch]);

  // Set default royalty to 5000 (50%) if not set
  useEffect(() => {
    const currentRoyalty = watch(`transactions.${index}.royaltyPercentage`);
    if (!currentRoyalty) {
      setValue(`transactions.${index}.royaltyPercentage` as const, "5000");
    }
  }, [index, setValue, watch]);

  // Auto-calculate start time based on DAO settings
  useEffect(() => {
    const currentStartTime = watch(`transactions.${index}.startTime`);
    if (!currentStartTime && !settingsLoading && votingDelay && votingPeriod && timelockDelay) {
      const calculation = calculateDroposalStartDate(votingDelay, votingPeriod, timelockDelay);
      setStartTimeCalc(calculation);
      setValue(
        `transactions.${index}.startTime` as const,
        calculation.startDate.toISOString().slice(0, 16),
      );
    } else if (!settingsLoading && votingDelay && votingPeriod && timelockDelay) {
      // Still calculate for display even if start time is set
      const calculation = calculateDroposalStartDate(votingDelay, votingPeriod, timelockDelay);
      setStartTimeCalc(calculation);
    }
  }, [index, setValue, watch, settingsLoading, votingDelay, votingPeriod, timelockDelay]);

  // Set default edition size to max uint64 (unlimited) if edition type is open
  useEffect(() => {
    if (editionType === "open") {
      setValue(`transactions.${index}.editionSize` as const, "18446744073709551615");
    }
  }, [editionType, index, setValue]);

  const handleEditionTypeChange = (value: "fixed" | "open") => {
    setEditionType(value);
    setValue(`transactions.${index}.editionType` as const, value);
    setValue(
      `transactions.${index}.editionSize` as const,
      value === "open" ? "18446744073709551615" : "100",
    );
  };

  const handleUseSplitChange = (checked: boolean) => {
    setUseSplit(checked);
    setValue(`transactions.${index}.useSplit` as const, checked);

    // Clear payout address when using split, restore treasury when not
    if (checked) {
      setValue(`transactions.${index}.payoutAddress` as const, "");
    } else {
      setValue(`transactions.${index}.payoutAddress` as const, DAO_ADDRESSES.treasury);
    }
  };

  const handleSplitRecipientsChange = (recipients: SplitRecipient[], distributorFee: number) => {
    setValue(`transactions.${index}.splitRecipients` as const, recipients);
    setValue(`transactions.${index}.splitDistributorFee` as const, distributorFee);
  };

  const handleSplitCreated = (splitAddress: string) => {
    setValue(`transactions.${index}.createdSplitAddress` as const, splitAddress);
    // Optionally auto-set as payout address
    setValue(`transactions.${index}.payoutAddress` as const, splitAddress);
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
        <h3 className="text-lg font-semibold mb-2">{t("droposal.title")}</h3>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            This creates a Zora ERC721Drop contract.{" "}
            <a
              href="https://nft-docs.zora.co/contracts/ERC721Drop"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center hover:underline"
            >
              {t("droposal.learnMore")} <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </AlertDescription>
        </Alert>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("droposal.basicInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-2">
            <Label htmlFor="name">{t("droposal.collectionNameLabel")}</Label>
            <Input
              id="name"
              placeholder={t("droposal.collectionNamePlaceholder")}
              {...register(`transactions.${index}.name` as const)}
            />
            {getErrorMessage("name") && (
              <p className="text-xs text-red-500">{String(getErrorMessage("name"))}</p>
            )}
          </div>

          <div className="grid w-full max-w-sm items-center gap-2">
            <Label htmlFor="symbol">{t("droposal.collectionSymbolLabel")}</Label>
            <Input
              id="symbol"
              placeholder={t("droposal.collectionSymbolPlaceholder")}
              {...register(`transactions.${index}.symbol` as const)}
            />
            {getErrorMessage("symbol") && (
              <p className="text-xs text-red-500">{String(getErrorMessage("symbol"))}</p>
            )}
          </div>

          <div className="grid w-full max-w-sm items-center gap-2">
            <Label htmlFor="collectionDescription">{t("droposal.collectionDescLabel")}</Label>
            <Textarea
              id="collectionDescription"
              placeholder={t("droposal.collectionDescPlaceholder")}
              {...register(`transactions.${index}.collectionDescription` as const)}
              rows={3}
            />
            {getErrorMessage("collectionDescription") && (
              <p className="text-xs text-red-500">
                {String(getErrorMessage("collectionDescription"))}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Media */}
      <MediaSection index={index} />

      {/* Pricing & Supply */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("droposal.pricingSupply")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-2">
            <Label htmlFor="price">{t("droposal.priceLabel")}</Label>
            <Input
              id="price"
              type="number"
              step="0.001"
              placeholder={t("droposal.pricePlaceholder")}
              {...register(`transactions.${index}.price` as const)}
            />
            {getErrorMessage("price") && (
              <p className="text-xs text-red-500">{String(getErrorMessage("price"))}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {t("droposal.priceHelper")}{" "}
              <a
                href="https://support.zora.co/en/articles/4981037-zora-mint-collect-fees"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {t("droposal.learnMore")}
              </a>
            </p>
          </div>
          {/* Use Split Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="space-y-1">
              <Label htmlFor="use-split" className="text-sm font-semibold cursor-pointer">
                {t("droposal.useRevenueSplit")}
              </Label>
              <p className="text-xs text-muted-foreground">{t("droposal.useRevenueSplitDesc")}</p>
            </div>
            <Switch id="use-split" checked={useSplit} onCheckedChange={handleUseSplitChange} />
          </div>

          {!useSplit ? (
            // Direct payout address (original behavior)
            <>
              <div className="grid w-full max-w-sm items-center gap-2">
                <Label htmlFor="payoutAddress">{t("droposal.payoutAddressLabel")}</Label>
                <Input
                  id="payoutAddress"
                  placeholder={`0x... or ENS name (defaults to ${DAO_ADDRESSES.treasury.slice(0, 6)}...)`}
                  {...register(`transactions.${index}.payoutAddress` as const)}
                />
                {getErrorMessage("payoutAddress") && (
                  <p className="text-xs text-red-500">{String(getErrorMessage("payoutAddress"))}</p>
                )}
                <p className="text-xs text-muted-foreground">{t("droposal.payoutAddressHelper")}</p>
              </div>
            </>
          ) : (
            // Split configuration
            <div className="space-y-4">
              <SplitRecipientsSection
                recipients={splitRecipients || []}
                distributorFee={splitDistributorFee || 0}
                onChange={handleSplitRecipientsChange}
              />

              {process.env.NODE_ENV === "development" && (
                <SplitDebugPanel
                  recipients={splitRecipients || []}
                  distributorFee={splitDistributorFee || 0}
                  onSplitCreated={handleSplitCreated}
                />
              )}

              {createdSplitAddress && (
                <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                  <AlertCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <strong className="text-green-900 dark:text-green-100">
                        {t("droposal.splitCreated")}
                      </strong>
                      <code className="block bg-white dark:bg-gray-900 px-2 py-1 rounded text-xs border font-mono">
                        {createdSplitAddress}
                      </code>
                      <p className="text-xs text-green-900 dark:text-green-100">
                        {t("droposal.splitCreatedDesc")}
                      </p>
                      <a
                        href={`https://app.splits.org/accounts/${createdSplitAddress}/?chainId=8453`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-xs text-green-700 dark:text-green-300 hover:underline"
                      >
                        {t("droposal.viewOnSplits")}
                      </a>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advanced Options Toggle */}
      <Card>
        <CardHeader className="pb-3">
          <Button
            type="button"
            variant="ghost"
            className="w-full flex items-center justify-between hover:bg-muted"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <CardTitle className="text-base">{t("droposal.advancedOptions")}</CardTitle>
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CardHeader>

        {showAdvanced && (
          <CardContent className="space-y-6">
            {/* Sale Timing */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">{t("droposal.saleTiming")}</h4>
              <div className="grid w-full max-w-sm items-center gap-2">
                <Label htmlFor="startTime">{t("droposal.saleStartLabel")}</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  {...register(`transactions.${index}.startTime` as const)}
                />
                {getErrorMessage("startTime") && (
                  <p className="text-xs text-red-500">{String(getErrorMessage("startTime"))}</p>
                )}
                <p className="text-xs text-muted-foreground">{t("droposal.saleStartHelper")}</p>
              </div>

              <div className="grid w-full max-w-sm items-center gap-2">
                <Label htmlFor="endTime">{t("droposal.saleEndLabel")}</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  {...register(`transactions.${index}.endTime` as const)}
                />
                {getErrorMessage("endTime") && (
                  <p className="text-xs text-red-500">{String(getErrorMessage("endTime"))}</p>
                )}
                <p className="text-xs text-muted-foreground">{t("droposal.saleEndHelper")}</p>
              </div>
            </div>

            {/* Edition Settings */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">{t("droposal.editionSettings")}</h4>
              <div>
                <Label>{t("droposal.editionTypeLabel")}</Label>
                <RadioGroup
                  value={editionType}
                  onValueChange={handleEditionTypeChange}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="open" id="open" />
                    <Label htmlFor="open">{t("droposal.openEdition")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fixed" id="fixed" />
                    <Label htmlFor="fixed">{t("droposal.fixedEdition")}</Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("droposal.editionTypeHelper")}
                </p>
              </div>

              {editionType === "fixed" && (
                <div className="grid w-full max-w-sm items-center gap-2">
                  <Label htmlFor="editionSize">{t("droposal.editionSizeLabel")}</Label>
                  <Input
                    id="editionSize"
                    type="number"
                    placeholder={t("droposal.editionSizePlaceholder")}
                    {...register(`transactions.${index}.editionSize` as const)}
                  />
                  {getErrorMessage("editionSize") && (
                    <p className="text-xs text-red-500">{String(getErrorMessage("editionSize"))}</p>
                  )}
                </div>
              )}
            </div>

            {/* Royalty Settings */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">{t("droposal.royaltySettings")}</h4>
              <div className="grid w-full max-w-sm items-center gap-2">
                <Label htmlFor="royaltyPercentage">{t("droposal.royaltyLabel")}</Label>
                <Input
                  id="royaltyPercentage"
                  type="number"
                  min="0"
                  max="10000"
                  placeholder={t("droposal.royaltyPlaceholder")}
                  {...register(`transactions.${index}.royaltyPercentage` as const)}
                />
                {getErrorMessage("royaltyPercentage") && (
                  <p className="text-xs text-red-500">
                    {String(getErrorMessage("royaltyPercentage"))}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">{t("droposal.royaltyHelper")}</p>
              </div>
            </div>

            {/* Addresses */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">{t("droposal.addressConfig")}</h4>

              <div className="grid w-full max-w-sm items-center gap-2">
                <Label htmlFor="defaultAdmin">{t("droposal.adminLabel")}</Label>
                <Input
                  id="defaultAdmin"
                  placeholder={t("droposal.adminPlaceholder")}
                  {...register(`transactions.${index}.defaultAdmin` as const)}
                />
                {getErrorMessage("defaultAdmin") && (
                  <p className="text-xs text-red-500">{String(getErrorMessage("defaultAdmin"))}</p>
                )}
                <p className="text-xs text-muted-foreground">{t("droposal.adminHelper")}</p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Debug Panel - Development Only */}
      {process.env.NODE_ENV === "development" && (
        <DroposalDebugPanel
          formData={{
            name: watch(`transactions.${index}.name`),
            symbol: watch(`transactions.${index}.symbol`),
            description: watch(`transactions.${index}.collectionDescription`),
            animationURI: watch(`transactions.${index}.animationUri`),
            imageURI: watch(`transactions.${index}.imageUri`),
            price: watch(`transactions.${index}.price`),
            startTime: watch(`transactions.${index}.startTime`)
              ? new Date(watch(`transactions.${index}.startTime`) as string)
              : undefined,
            endTime: watch(`transactions.${index}.endTime`)
              ? new Date(watch(`transactions.${index}.endTime`) as string)
              : undefined,
            payoutAddress: watch(`transactions.${index}.payoutAddress`),
            defaultAdmin: watch(`transactions.${index}.defaultAdmin`),
            editionSize: watch(`transactions.${index}.editionSize`),
            royalty: watch(`transactions.${index}.royaltyPercentage`),
            transactionDescription: watch(`transactions.${index}.description`),
          }}
          startTimeCalculation={startTimeCalc}
        />
      )}
    </div>
  );
}
