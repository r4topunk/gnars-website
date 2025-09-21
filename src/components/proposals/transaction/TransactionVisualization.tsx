"use client";

import { type TransactionFormValues } from "../schema";
import { TransactionCard } from "./TransactionCard";
import { SendEthTransactionDetails } from "./SendEthTransactionDetails";
import { SendUsdcTransactionDetails } from "./SendUsdcTransactionDetails";
import { SendTokensTransactionDetails } from "./SendTokensTransactionDetails";
import { SendNftsTransactionDetails } from "./SendNftsTransactionDetails";
import { CustomTransactionDetails } from "./CustomTransactionDetails";
import { DroposalTransactionDetails } from "./DroposalTransactionDetails";

interface TransactionVisualizationProps {
  index: number;
  transaction: TransactionFormValues;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const transactionTypes = [
  {
    type: "send-eth",
    label: "Send ETH",
    component: SendEthTransactionDetails,
  },
  {
    type: "send-usdc",
    label: "Send USDC",
    component: SendUsdcTransactionDetails,
  },
  {
    type: "send-tokens",
    label: "Send Tokens",
    component: SendTokensTransactionDetails,
  },
  {
    type: "send-nfts",
    label: "Send NFTs",
    component: SendNftsTransactionDetails,
  },
  {
    type: "droposal",
    label: "Create Droposal",
    component: DroposalTransactionDetails,
  },
  {
    type: "custom",
    label: "Custom Transaction",
    component: CustomTransactionDetails,
  },
] as const;

export function TransactionVisualization({
  index,
  transaction,
  label,
  icon,
}: TransactionVisualizationProps) {
  const typeInfo = transactionTypes.find((t) => t.type === transaction.type) || transactionTypes[5];
  const DetailComponent = typeInfo.component;

  return (
    <TransactionCard
      index={index}
      transaction={transaction}
      label={label}
      icon={icon}
      variant="detail"
    >
      <DetailComponent transaction={transaction} />
    </TransactionCard>
  );
}
