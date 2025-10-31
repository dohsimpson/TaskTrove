"use client"

import { User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getAvatarApiUrl } from "@tasktrove/utils"
import { getConsistentColor } from "@tasktrove/utils/color-utils"
import { useHalloween } from "@/app/contexts/halloween-context"

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
  /**
   * Custom icon to display in the avatar fallback.
   * If provided, this takes precedence over initials/User icon.
   */
  icon?: React.ReactNode
  /**
   * Background color for the avatar when using custom icon.
   * Defaults to the username-based consistent color if not specified.
   */
  iconBackgroundColor?: string
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
 * Get spooky emoji for Halloween theme
 */
function getSpookyEmoji(): string {
  const spookyEmojis: readonly string[] = [
    "👻",
    "🎃",
    "🦇",
    "🕷️",
    "🕸️",
    "💀",
    "🧛",
    "🧟",
    "🦴",
    "⚰️",
  ]
  const randomIndex = Math.floor(Math.random() * spookyEmojis.length)
  return spookyEmojis[randomIndex] || "👻"
}

/**
 * User avatar component with automatic fallback to initials or icon
 * Supports avatar images, initials with consistent colors, custom icons, and icon fallback
 * Shows spooky emoji during Halloween theme when no custom avatar is set
 */
export function UserAvatar({
  username,
  avatar,
  size = "md",
  className,
  showInitials = true,
  icon,
  iconBackgroundColor,
}: UserAvatarProps) {
  const { isHalloweenEnabled } = useHalloween()

  const avatarUrl = avatar ? getAvatarApiUrl(avatar) : undefined
  const backgroundColor = iconBackgroundColor ?? getConsistentColor(username)
  const initials = getUserInitials(username)

  // 🎃 Show spooky emoji during Halloween when no custom avatar is set
  const showSpookyEmoji = isHalloweenEnabled && !avatar

  return (
    <Avatar className={`${sizeClasses[size]} ${className || ""}`}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={username} />}
      <AvatarFallback
        className="rounded-full text-white font-semibold"
        style={showInitials && !showSpookyEmoji && !icon ? { backgroundColor } : undefined}
      >
        {showSpookyEmoji ? (
          <span className="text-lg">{getSpookyEmoji()}</span>
        ) : icon ? (
          icon
        ) : showInitials ? (
          initials
        ) : (
          <User className={iconSizes[size]} />
        )}
      </AvatarFallback>
    </Avatar>
  )
}
