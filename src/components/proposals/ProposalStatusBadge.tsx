import { ProposalStatus } from "@/lib/schemas/proposals";
import { Badge } from "@/components/ui/badge";
import { getStatusConfig } from "@/components/proposals/utils";
import { cn } from "@/lib/utils";

export interface ProposalStatusBadgeProps {
  status: ProposalStatus;
  className?: string;
  showIcon?: boolean;
  iconClassName?: string;
}

/**
 * Unified badge component for displaying proposal status.
 * Uses color-coded backgrounds with optional icons.
 */
export function ProposalStatusBadge({
  status,
  className,
  showIcon = true,
  iconClassName = "w-3 h-3 mr-1",
}: ProposalStatusBadgeProps) {
  const { Icon, color } = getStatusConfig(status);

  return (
    <Badge className={cn(color, className)}>
      {showIcon && <Icon className={iconClassName} />}
      {status}
    </Badge>
  );
}

