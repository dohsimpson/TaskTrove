import { Badge } from "@/components/ui/badge"

interface ProBadgeProps {
  label?: string
}

export function ProBadge({ label = "Pro" }: ProBadgeProps) {
  return <Badge variant="outline">{label}</Badge>
}
