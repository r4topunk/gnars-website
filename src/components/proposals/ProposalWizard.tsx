"use client";

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProposalDetailsForm } from "@/components/proposals/ProposalDetailsForm";
import { ProposalPreview } from "@/components/proposals/ProposalPreview";
import { TransactionBuilder } from "@/components/proposals/builder/TransactionBuilder";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { proposalSchema, type ProposalFormValues } from "./schema";

export function ProposalWizard() {
  const [currentTab, setCurrentTab] = useState("details");
  const [isEditingTransaction, setIsEditingTransaction] = useState(false);

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

  return (
    <FormProvider {...methods}>
      <div className="max-w-4xl mx-auto">
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details" className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
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
                className={`w-6 h-6 rounded-full text-xs flex items-center justify-center ${
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
                className={`w-6 h-6 rounded-full text-xs flex items-center justify-center ${
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

          <div className="mt-6">
            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <ProposalDetailsForm />
                  <div className="flex justify-end mt-6">
                    <Button
                      onClick={handleNextToTransactions}
                      disabled={!canProceedToTransactions}
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
                    <div className="flex justify-between mt-6">
                      <Button variant="outline" onClick={() => setCurrentTab("details")}>
                        Back: Edit Details
                      </Button>
                      <Button onClick={handleNextToPreview} disabled={!canProceedToPreview}>
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
                    <Button variant="outline" onClick={() => setCurrentTab("transactions")}>
                      Back: Edit Transactions
                    </Button>
                    {/* Submit button will be in ProposalPreview component */}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </FormProvider>
  );
}
