import { Bug } from "lucide-react"

interface StubIndicatorProps {
  className?: string
}

export function StubIndicator({ className }: StubIndicatorProps) {
  if (typeof window === "undefined" || process.env.NODE_ENV !== "development") {
    return null
  }

  return <Bug size={14} color="#ff0000" className={className} />
}
