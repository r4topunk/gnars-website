"use client";

import { useState } from "react";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SplitRecipient } from "@/lib/splits-utils";
import {
  autoAdjustPercentages,
  calculateRemainingPercentage,
  validateSplitRecipients,
} from "@/lib/splits-utils";
import { SplitFlowChart } from "./SplitFlowChart";

interface SplitRecipientsSectionProps {
  recipients: SplitRecipient[];
  distributorFee: number;
  onChange: (recipients: SplitRecipient[], distributorFee: number) => void;
}

export function SplitRecipientsSection({
  recipients,
  distributorFee,
  onChange,
}: SplitRecipientsSectionProps) {
  const [errors, setErrors] = useState<string[]>([]);

  const validateAndUpdate = (newRecipients: SplitRecipient[], newFee?: number) => {
    const validationErrors = validateSplitRecipients(newRecipients);
    setErrors(validationErrors.map((e) => e.message));
    onChange(newRecipients, newFee ?? distributorFee);
  };

  const addRecipient = () => {
    const remaining = calculateRemainingPercentage(recipients);
    const newRecipient: SplitRecipient = {
      address: "",
      percentAllocation: remaining > 0 ? remaining : 10,
    };
    validateAndUpdate([...recipients, newRecipient]);
  };

  const removeRecipient = (index: number) => {
    const newRecipients = recipients.filter((_, i) => i !== index);
    // Auto-adjust remaining percentages
    const adjusted = autoAdjustPercentages(newRecipients);
    validateAndUpdate(adjusted);
  };

  const updateRecipientAddress = (index: number, address: string) => {
    const newRecipients = [...recipients];
    newRecipients[index] = { ...newRecipients[index], address };
    validateAndUpdate(newRecipients);
  };

  const updateRecipientPercentage = (index: number, percent: number) => {
    // Helper to round to 4 decimal places
    const roundTo4Decimals = (num: number) => Math.round(num * 10000) / 10000;

    // Clamp the input value between 0 and 100
    const clampedPercent = roundTo4Decimals(Math.max(0, Math.min(100, percent)));

    const newRecipients = [...recipients];
    newRecipients[index] = { ...newRecipients[index], percentAllocation: clampedPercent };

    validateAndUpdate(newRecipients);
  };

  const distributeEvenly = () => {
    const adjusted = autoAdjustPercentages(recipients);
    validateAndUpdate(adjusted);
  };

  const totalPercent = recipients.reduce((sum, r) => sum + (r.percentAllocation || 0), 0);
  const remaining = calculateRemainingPercentage(recipients);

  return (
    <div className="space-y-6">
      {/* Validation Errors */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Split Visualization */}
      <div className="border rounded-lg overflow-hidden">
        <SplitFlowChart recipients={recipients} />
      </div>

      {/* Total Allocation Display */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total Allocated:</span>
          <span
            className={`font-semibold ${
              Math.abs(totalPercent - 100) < 0.0001
                ? "text-green-600"
                : totalPercent > 100
                  ? "text-red-600"
                  : "text-yellow-600"
            }`}
          >
            {totalPercent.toFixed(2)}%
          </span>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              Math.abs(totalPercent - 100) < 0.0001
                ? "bg-green-600"
                : totalPercent > 100
                  ? "bg-red-600"
                  : "bg-yellow-600"
            }`}
            style={{ width: `${Math.min(totalPercent, 100)}%` }}
          />
        </div>
        {remaining > 0.01 && (
          <p className="text-xs text-muted-foreground">Remaining: {remaining.toFixed(2)}%</p>
        )}
      </div>

      {/* Recipients List */}
      <div className="space-y-3">
        {recipients.map((recipient, index) => (
          <div key={index} className="flex items-end gap-3">
            <div className="flex-1">
              <Label
                htmlFor={`recipient-address-${index}`}
                className="text-xs text-muted-foreground"
              >
                Address or ENS
              </Label>
              <Input
                id={`recipient-address-${index}`}
                placeholder="0x... or name.eth"
                value={recipient.address}
                onChange={(e) => updateRecipientAddress(index, e.target.value)}
                className="font-mono text-sm mt-1.5"
              />
            </div>

            <div className="w-32">
              <Label
                htmlFor={`recipient-percent-${index}`}
                className="text-xs text-muted-foreground"
              >
                Allocation %
              </Label>
              <Input
                id={`recipient-percent-${index}`}
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={recipient.percentAllocation}
                onChange={(e) => updateRecipientPercentage(index, parseFloat(e.target.value) || 0)}
                className="text-sm text-right font-semibold mt-1.5"
              />
            </div>

            {recipients.length > 2 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeRecipient(index)}
                className="h-10 w-10 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={addRecipient}
          disabled={recipients.length >= 100}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Recipient
        </Button>
        <Button variant="outline" size="sm" onClick={distributeEvenly}>
          Distribute Evenly
        </Button>
      </div>
    </div>
  );
}
