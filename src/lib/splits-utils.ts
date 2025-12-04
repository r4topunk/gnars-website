import { isAddress } from "viem";

// TypeScript types for Splits integration
export interface SplitRecipient {
  address: string;
  percentAllocation: number; // 0-100 with up to 4 decimals
  ensName?: string;
}

export interface SplitConfig {
  recipients: SplitRecipient[];
  distributorFeePercent: number; // 0-10 with up to 4 decimals
  controller?: string; // Optional controller address, 0x0 for immutable
}

export interface SplitValidationError {
  field: string;
  message: string;
}

/**
 * Validates that a split configuration is valid
 */
export function validateSplitConfig(config: SplitConfig): SplitValidationError[] {
  const errors: SplitValidationError[] = [];

  // Validate recipients
  const recipientErrors = validateSplitRecipients(config.recipients);
  errors.push(...recipientErrors);

  // Validate distributor fee
  if (config.distributorFeePercent < 0 || config.distributorFeePercent > 10) {
    errors.push({
      field: "distributorFeePercent",
      message: "Distributor fee must be between 0% and 10%",
    });
  }

  // Validate controller address if provided
  if (config.controller && config.controller !== "0x0000000000000000000000000000000000000000") {
    if (!isAddress(config.controller)) {
      errors.push({
        field: "controller",
        message: "Controller must be a valid Ethereum address",
      });
    }
  }

  return errors;
}

/**
 * Validates split recipients
 */
export function validateSplitRecipients(recipients: SplitRecipient[]): SplitValidationError[] {
  const errors: SplitValidationError[] = [];

  // Check minimum recipients
  if (recipients.length < 2) {
    errors.push({
      field: "recipients",
      message: "Split must have at least 2 recipients",
    });
    return errors; // Return early if not enough recipients
  }

  // Check maximum recipients (gas limit consideration)
  if (recipients.length > 100) {
    errors.push({
      field: "recipients",
      message: "Split cannot have more than 100 recipients (gas limit)",
    });
  }

  // Validate each recipient
  recipients.forEach((recipient, index) => {
    // Validate address
    if (!recipient.address) {
      errors.push({
        field: `recipients[${index}].address`,
        message: `Recipient ${index + 1}: Address is required`,
      });
    } else if (!isAddress(recipient.address)) {
      errors.push({
        field: `recipients[${index}].address`,
        message: `Recipient ${index + 1}: Invalid Ethereum address`,
      });
    }

    // Validate percentage
    if (recipient.percentAllocation <= 0) {
      errors.push({
        field: `recipients[${index}].percentAllocation`,
        message: `Recipient ${index + 1}: Percentage must be greater than 0`,
      });
    }

    if (recipient.percentAllocation > 100) {
      errors.push({
        field: `recipients[${index}].percentAllocation`,
        message: `Recipient ${index + 1}: Percentage cannot exceed 100%`,
      });
    }

    // Check decimal precision (max 4 decimals)
    const decimals = (recipient.percentAllocation.toString().split(".")[1] || "").length;
    if (decimals > 4) {
      errors.push({
        field: `recipients[${index}].percentAllocation`,
        message: `Recipient ${index + 1}: Percentage can have maximum 4 decimal places`,
      });
    }
  });

  // Check for duplicate addresses
  const addresses = recipients.map((r) => r.address.toLowerCase()).filter((a) => a);
  const uniqueAddresses = new Set(addresses);
  if (addresses.length !== uniqueAddresses.size) {
    errors.push({
      field: "recipients",
      message: "Duplicate recipient addresses are not allowed",
    });
  }

  // Validate percentages sum to 100
  const totalPercent = recipients.reduce((sum, r) => sum + r.percentAllocation, 0);
  const percentDiff = Math.abs(totalPercent - 100);
  
  // Allow for small floating point errors (0.0001%)
  if (percentDiff > 0.0001) {
    errors.push({
      field: "recipients",
      message: `Total allocation must equal 100% (currently ${totalPercent.toFixed(4)}%)`,
    });
  }

  return errors;
}

/**
 * Validates individual percentage allocation
 */
export function validatePercentage(value: number): string | null {
  if (value <= 0) return "Must be greater than 0";
  if (value > 100) return "Cannot exceed 100%";
  
  const decimals = (value.toString().split(".")[1] || "").length;
  if (decimals > 4) return "Maximum 4 decimal places";
  
  return null;
}

/**
 * Formats split address for display (shortened)
 */
export function formatSplitAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Gets the controller address for immutable splits
 */
export const IMMUTABLE_CONTROLLER = "0x0000000000000000000000000000000000000000" as const;

/**
 * Checks if a split is immutable (no controller)
 */
export function isImmutableSplit(controller?: string): boolean {
  return !controller || controller === IMMUTABLE_CONTROLLER;
}

/**
 * Prepares split config for SDK call
 * Converts percentages to the format expected by Splits SDK
 */
export function prepareSplitConfigForSDK(config: SplitConfig): {
  recipients: Array<{ address: string; percentAllocation: number }>;
  distributorFeePercent: number;
  controller: string;
} {
  return {
    recipients: config.recipients.map((r) => ({
      address: r.address,
      percentAllocation: r.percentAllocation,
    })),
    distributorFeePercent: config.distributorFeePercent,
    controller: config.controller || IMMUTABLE_CONTROLLER,
  };
}

/**
 * Creates a default split configuration with DAO treasury
 */
export function createDefaultSplitConfig(treasuryAddress: string, userAddress?: string): SplitConfig {
  const recipients: SplitRecipient[] = [
    {
      address: treasuryAddress,
      percentAllocation: 80.0,
    },
  ];

  if (userAddress && userAddress !== treasuryAddress) {
    recipients.push({
      address: userAddress,
      percentAllocation: 20.0,
    });
  } else {
    // If no user address, add a placeholder for second recipient
    recipients.push({
      address: "",
      percentAllocation: 20.0,
    });
  }

  return {
    recipients,
    distributorFeePercent: 0, // 0% minimum fee
    controller: IMMUTABLE_CONTROLLER, // Immutable by default
  };
}

/**
 * Calculates remaining percentage available for distribution
 */
export function calculateRemainingPercentage(recipients: SplitRecipient[]): number {
  const totalAllocated = recipients.reduce((sum, r) => sum + (r.percentAllocation || 0), 0);
  return Math.max(0, 100 - totalAllocated);
}

/**
 * Auto-adjusts percentages to sum to 100%
 * Useful for UX when adding/removing recipients
 */
export function autoAdjustPercentages(recipients: SplitRecipient[]): SplitRecipient[] {
  if (recipients.length === 0) return [];
  
  // Helper to round to 4 decimal places
  const roundTo4Decimals = (num: number) => Math.round(num * 10000) / 10000;
  
  // Calculate base share and round it
  const baseShare = Math.floor((100 / recipients.length) * 10000) / 10000;
  
  // Calculate how much we've allocated so far
  const allocatedToOthers = baseShare * (recipients.length - 1);
  
  // Last recipient gets the remainder to ensure exactly 100%
  const lastShare = roundTo4Decimals(100 - allocatedToOthers);
  
  return recipients.map((recipient, index) => ({
    ...recipient,
    percentAllocation: index === recipients.length - 1 ? lastShare : baseShare,
  }));
}
