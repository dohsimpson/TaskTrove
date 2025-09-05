import { Badge } from "@/components/ui/badge"

interface ExperimentalBadgeProps {
  className?: string
}

export function ExperimentalBadge({ className }: ExperimentalBadgeProps) {
  return (
    <Badge variant="secondary" className={className}>
      Experimental
    </Badge>
  )
}
