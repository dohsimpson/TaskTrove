"use client"

import { User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getAvatarApiUrl } from "@tasktrove/utils"
import { getConsistentColor } from "@tasktrove/utils/color-utils"

interface UserAvatarProps {
  username?: string
  avatar?: string
  size?: "sm" | "md" | "lg"
  className?: string
  /**
   * Whether to show initials as fallback.
   * If false, shows User icon instead.
   */
  showInitials?: boolean
}

/**
 * Get initial from username
 * e.g., "john.doe" -> "J", "alice" -> "A"
 */
function getUserInitials(str: string | undefined): string {
  // Handle empty, undefined, or null strings
  if (!str || str.length === 0) {
    return "?"
  }
  return str[0]?.toUpperCase() ?? "?"
}

const sizeClasses = {
  sm: "h-5 w-5 text-[11px]",
  md: "h-8 w-8 text-base",
  lg: "h-10 w-10 text-lg",
} as const

const iconSizes = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
} as const

/**
 * User avatar component with automatic fallback to initials or icon
 * Supports avatar images, initials with consistent colors, and icon fallback
 */
export function UserAvatar({
  username,
  avatar,
  size = "md",
  className,
  showInitials = true,
}: UserAvatarProps) {
  const avatarUrl = avatar ? getAvatarApiUrl(avatar) : undefined
  const backgroundColor = getConsistentColor(username)
  const initials = getUserInitials(username)

  return (
    <Avatar className={`${sizeClasses[size]} ${className || ""}`}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={username} />}
      <AvatarFallback
        className="rounded-full text-white font-semibold"
        style={showInitials ? { backgroundColor } : undefined}
      >
        {showInitials ? initials : <User className={iconSizes[size]} />}
      </AvatarFallback>
    </Avatar>
  )
}
