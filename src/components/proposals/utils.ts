import type { SVGProps } from "react";
import { AlertCircle, CheckCircle, Clock, Pause, XCircle } from "lucide-react";
import { ProposalStatus } from "@/lib/schemas/proposals";

type IconComponent = React.ComponentType<SVGProps<SVGSVGElement>>;

export const getStatusConfig = (status: ProposalStatus) => {
  const configs: Record<ProposalStatus, { color: string; Icon: IconComponent }> = {
    [ProposalStatus.ACTIVE]: {
      color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      Icon: Clock,
    },
    [ProposalStatus.PENDING]: {
      color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      Icon: Pause,
    },
    [ProposalStatus.SUCCEEDED]: {
      color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      Icon: CheckCircle,
    },
    [ProposalStatus.QUEUED]: {
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      Icon: AlertCircle,
    },
    [ProposalStatus.EXECUTED]: {
      color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
      Icon: CheckCircle,
    },
    [ProposalStatus.DEFEATED]: {
      color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      Icon: XCircle,
    },
    [ProposalStatus.CANCELLED]: {
      color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
      Icon: XCircle,
    },
    [ProposalStatus.EXPIRED]: {
      color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
      Icon: Clock,
    },
    [ProposalStatus.VETOED]: {
      color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      Icon: XCircle,
    },
  };
  return configs[status] ?? configs[ProposalStatus.PENDING];
};

export function extractFirstUrl(text?: string): string | null {
  if (!text) return null;
  const httpMatch = text.match(/https?:\/\/[^\s)]+/i);
  if (httpMatch && httpMatch[0]) return httpMatch[0];
  const ipfsMatch = text.match(/ipfs:\/\/[\w./-]+/i);
  if (ipfsMatch && ipfsMatch[0]) return ipfsMatch[0];
  return null;
}

export function normalizeImageUrl(rawUrl: string | null): string | null {
  if (!rawUrl) return null;
  try {
    if (rawUrl.startsWith("ipfs://")) {
      const hash = rawUrl.replace(/^ipfs:\/\//i, "").replace(/^ipfs\//i, "");
      return `https://ipfs.io/ipfs/${hash}`;
    }
    new URL(rawUrl);
    return rawUrl;
  } catch {
    return null;
  }
}
