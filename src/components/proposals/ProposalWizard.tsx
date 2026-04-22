"use client";
/* eslint-disable react-hooks/incompatible-library -- react-hook-form watch()/useFormContext pattern is known-incompatible with React Compiler */

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import { useUserAddress } from "@/hooks/use-user-address";
import { TransactionBuilder } from "@/components/proposals/builder/TransactionBuilder";
import { ProposalDetailsForm } from "@/components/proposals/ProposalDetailsForm";
import { ProposalGatingBanner } from "@/components/proposals/ProposalGatingBanner";
import { ProposalPreview } from "@/components/proposals/ProposalPreview";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProposalEligibilityProvider } from "@/components/proposals/ProposalEligibilityContext";
import { useProposalEligibility } from "@/hooks/useProposalEligibility";
import { CHAIN, DAO_ADDRESSES } from "@/lib/config";
import { getProposalTemplate } from "@/lib/proposal-templates";
import { proposalSchema, type ProposalFormValues } from "./schema";

export function ProposalWizard() {
  const [currentTab, setCurrentTab] = useState("details");
  const [isEditingTransaction, setIsEditingTransaction] = useState(false);
  const searchParams = useSearchParams();

  const methods = useForm<ProposalFormValues>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      title: "",
      description: "",
      bannerImage: undefined,
      transactions: [],
    },
    mode: "onChange",
  });

  // Pre-fill form from ?template= query param
  useEffect(() => {
    const templateSlug = searchParams.get("template");
    if (!templateSlug) return;

    const template = getProposalTemplate(templateSlug);
    if (!template) return;

    // Only pre-fill if the form is still empty (don't overwrite user edits)
    const currentTitle = methods.getValues("title");
    const currentDesc = methods.getValues("description");
    if (currentTitle || currentDesc) return;

    methods.setValue("title", template.defaultTitle, { shouldDirty: false });
    methods.setValue("description", template.description, { shouldDirty: false });
  }, [searchParams, methods]);

  const { address, isConnected } = useUserAddress();
  const eligibility = useProposalEligibility({
    chainId: CHAIN.id,
    collectionAddress: DAO_ADDRESSES.token,
    governorAddress: DAO_ADDRESSES.governor,
    signerAddress: address,
  });

  const { trigger, watch } = methods;

  const watchedValues = watch();

  const canProceedToTransactions = watchedValues.title?.trim() !== "";
  // Rely on watched transactions to avoid desync with nested field arrays
  const watchedTransactions = watch("transactions");
  const canProceedToPreview = canProceedToTransactions && (watchedTransactions?.length ?? 0) > 0;

  const handleNextToTransactions = async () => {
    const isValid = await trigger(["title", "description"]);
    if (isValid) {
      setCurrentTab("transactions");
    }
  };

  const handleNextToPreview = async () => {
    const isValid = await trigger("transactions");
    if (isValid) {
      setCurrentTab("preview");
    }
  };

  // Child builder handles add/update/remove via useFieldArray

  if (isConnected && eligibility.isLoading) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Checking proposal eligibility...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <ProposalEligibilityProvider value={eligibility}>
      <FormProvider {...methods}>
        <div className="max-w-4xl mx-auto space-y-4">
          <ProposalGatingBanner />

          <Tabs value={currentTab} onValueChange={setCurrentTab} className="gap-6">
            <TabsList className="w-full">
              <TabsTrigger value="details" className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                  1
                </span>
                Details
              </TabsTrigger>
              <TabsTrigger
                value="transactions"
                disabled={!canProceedToTransactions}
                className="flex items-center gap-2"
              >
                <span
                  className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${
                    canProceedToTransactions
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  2
                </span>
                Transactions
              </TabsTrigger>
              <TabsTrigger
                value="preview"
                disabled={!canProceedToPreview}
                className="flex items-center gap-2"
              >
                <span
                  className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${
                    canProceedToPreview
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  3
                </span>
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <ProposalDetailsForm />
                  <div className="flex justify-end mt-6">
                    <Button
                      onClick={handleNextToTransactions}
                      disabled={!canProceedToTransactions}
                      className="w-full sm:w-auto"
                    >
                      Next: Add Transactions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transactions" className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <TransactionBuilder onFormsVisibilityChange={setIsEditingTransaction} />
                  {!isEditingTransaction && (
                    <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentTab("details")}
                        className="w-full sm:w-auto"
                      >
                        Back: Edit Details
                      </Button>
                      <Button
                        onClick={handleNextToPreview}
                        disabled={!canProceedToPreview}
                        className="w-full sm:w-auto"
                      >
                        Next: Preview & Submit
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <ProposalPreview />
                  <div className="flex justify-between mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentTab("transactions")}
                      className="w-full sm:w-auto"
                    >
                      Back: Edit Transactions
                    </Button>
                    {/* Submit button will be in ProposalPreview component */}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </FormProvider>
    </ProposalEligibilityProvider>
  );
}
