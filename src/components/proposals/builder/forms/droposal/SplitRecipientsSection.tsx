"use client";

import { useState } from "react";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { SplitRecipient } from "@/lib/splits-utils";
import {
  autoAdjustPercentages,
  calculateRemainingPercentage,
  validateSplitRecipients,
} from "@/lib/splits-utils";

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
    const newRecipients = [...recipients];
    newRecipients[index] = { ...newRecipients[index], percentAllocation: percent };
    validateAndUpdate(newRecipients);
  };

  const distributeEvenly = () => {
    const adjusted = autoAdjustPercentages(recipients);
    validateAndUpdate(adjusted);
  };

  const totalPercent = recipients.reduce((sum, r) => sum + (r.percentAllocation || 0), 0);
  const remaining = calculateRemainingPercentage(recipients);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Revenue Split Recipients</CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure how NFT sales revenue will be distributed among recipients
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
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
              {totalPercent.toFixed(4)}%
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
          {remaining > 0 && (
            <p className="text-xs text-muted-foreground">
              Remaining to allocate: {remaining.toFixed(4)}%
            </p>
          )}
        </div>

        {/* Recipients List */}
        <div className="space-y-4">
          {recipients.map((recipient, index) => (
            <div key={index} className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Recipient {index + 1}</Label>
                {recipients.length > 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRecipient(index)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor={`recipient-address-${index}`} className="text-xs">
                  Address
                </Label>
                <Input
                  id={`recipient-address-${index}`}
                  placeholder="0x... or ENS name"
                  value={recipient.address}
                  onChange={(e) => updateRecipientAddress(index, e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`recipient-percent-${index}`} className="text-xs">
                    Allocation
                  </Label>
                  <span className="text-sm font-semibold">
                    {recipient.percentAllocation.toFixed(2)}%
                  </span>
                </div>
                <Slider
                  id={`recipient-percent-${index}`}
                  min={0}
                  max={100}
                  step={0.01}
                  value={[recipient.percentAllocation]}
                  onValueChange={([value]) => updateRecipientPercentage(index, value)}
                  className="w-full"
                />
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={recipient.percentAllocation}
                  onChange={(e) =>
                    updateRecipientPercentage(index, parseFloat(e.target.value) || 0)
                  }
                  className="w-24 text-sm"
                />
              </div>
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

        {/* Info Box */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>How it works:</strong> NFT sales revenue goes to the split contract, then gets
            distributed to all recipients according to these percentages.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
