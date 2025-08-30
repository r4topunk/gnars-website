import { Badge } from '@/components/ui/badge'
import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DroposalBadgeProps {
  className?: string
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

export function DroposalBadge({ className, variant = 'secondary' }: DroposalBadgeProps) {
  return (
    <Badge 
      variant={variant}
      className={cn('flex items-center gap-1.5 font-medium', className)}
    >
      <Zap className="h-3 w-3" />
      Droposal
    </Badge>
  )
}