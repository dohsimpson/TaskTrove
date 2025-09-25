"use client"

import { CloudOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { useOnlineStatus } from "@/hooks/use-online-status"

interface OnlineStatusProps {
  className?: string
}

export function OnlineStatus({ className }: OnlineStatusProps) {
  const { status, showIndicator } = useOnlineStatus()

  // Only show when offline or transitioning to offline
  if (!showIndicator || status === "online") {
    return null
  }

  const getIcon = () => {
    return <CloudOff className="h-4 w-4" />
  }

  const getTitle = () => {
    switch (status) {
      case "offline":
        return "You are offline"
      case "transitioning-online":
        return "Connecting..."
      case "transitioning-offline":
        return "Connection lost"
      default:
        return ""
    }
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center transition-all duration-300",
        // Base styling
        "h-8 w-8",
        // Color styling - always red since we only show when offline
        "text-red-500",
        className,
      )}
      title={getTitle()}
      data-testid="online-status-indicator"
    >
      {getIcon()}
    </div>
  )
}
