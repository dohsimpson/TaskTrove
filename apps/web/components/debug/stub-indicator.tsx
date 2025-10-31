import { Bug } from "lucide-react"
import { isPro } from "@/lib/utils/env"
import { UI_STATE_COLORS } from "@tasktrove/constants"

interface StubIndicatorProps {
  className?: string
}

export function StubIndicator({ className }: StubIndicatorProps) {
  if (typeof window === "undefined" || process.env.NODE_ENV !== "development" || !isPro()) {
    return null
  }

  return <Bug size={14} color={UI_STATE_COLORS.error} className={className} />
}
