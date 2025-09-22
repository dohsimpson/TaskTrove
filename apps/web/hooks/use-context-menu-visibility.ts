import { useState, useRef, useEffect } from "react"

interface UseContextMenuVisibilityOptions {
  delay?: number // Default 150ms
}

/**
 * Custom hook for managing context menu visibility with flicker prevention.
 *
 * Prevents the unpleasant flicker that occurs when a context menu closes
 * while the user is still hovering over the trigger element.
 *
 * @param isHovered - Whether the trigger element is currently hovered
 * @param isSelected - Whether the trigger element is currently selected (optional)
 * @param options - Configuration options
 * @returns Object with visibility state and menu handlers
 */
export function useContextMenuVisibility(
  isHovered: boolean,
  isSelected: boolean = false,
  options: UseContextMenuVisibilityOptions = {},
) {
  const { delay = 150 } = options
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMenuClosing, setIsMenuClosing] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleMenuOpenChange = (open: boolean) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    setIsMenuOpen(open)

    if (!open) {
      setIsMenuClosing(true)
      // Keep the menu visible for a short time after closing to prevent flicker
      timeoutRef.current = setTimeout(() => {
        setIsMenuClosing(false)
        timeoutRef.current = null
      }, delay)
    } else {
      setIsMenuClosing(false)
    }
  }

  const isVisible = isHovered || isSelected || isMenuOpen || isMenuClosing

  return {
    isVisible,
    isMenuOpen,
    handleMenuOpenChange,
  }
}
