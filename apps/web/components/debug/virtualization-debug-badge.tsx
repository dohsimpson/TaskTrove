import { Badge } from "@/components/ui/badge"

interface VirtualizationDebugBadgeProps {
  totalItems: number
  renderedItems: number
}

/**
 * Debug badge to show virtualization stats (development only)
 *
 * Displays how many items are rendered vs total items, showing the performance
 * savings from virtualization. Only visible in development mode when there are
 * more than 10 items.
 */
export function VirtualizationDebugBadge({
  totalItems,
  renderedItems,
}: VirtualizationDebugBadgeProps) {
  // Only show in development when there are more than 10 items
  if (
    typeof window === "undefined" ||
    process.env.NODE_ENV !== "development" ||
    totalItems <= 10 ||
    !process.env.SHOW_DEBUG_BADGE
  ) {
    return null
  }

  const savingsPercent = Math.round((1 - renderedItems / totalItems) * 100)

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        left: 0,
        zIndex: 50,
        display: "inline-block",
        marginBottom: "8px",
      }}
    >
      <Badge
        variant="secondary"
        className="text-xs px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
      >
        🚀 Virtual: {renderedItems} / {totalItems} rendered ({savingsPercent}% saved)
      </Badge>
    </div>
  )
}
