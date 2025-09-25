"use client"

import { useState, useEffect, useRef } from "react"

export type OnlineStatus = "online" | "offline" | "transitioning-online" | "transitioning-offline"

interface UseOnlineStatusReturn {
  status: OnlineStatus
  isOnline: boolean
  isOffline: boolean
  isTransitioning: boolean
  showIndicator: boolean
}

export function useOnlineStatus(): UseOnlineStatusReturn {
  const [status, setStatus] = useState<OnlineStatus>("online")
  const [showIndicator, setShowIndicator] = useState(false)
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Initialize status based on current online state
    const initialStatus = navigator.onLine ? "online" : "offline"
    setStatus(initialStatus)

    // Show indicator immediately if offline
    if (!navigator.onLine) {
      setShowIndicator(true)
    }

    const handleOnline = () => {
      // Clear any existing timeouts
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current)
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }

      // Start transitioning to online
      setStatus("transitioning-online")
      setShowIndicator(true)

      // After 3 seconds, set to online and start hiding process
      transitionTimeoutRef.current = setTimeout(() => {
        setStatus("online")

        // Hide the indicator after 3 more seconds
        hideTimeoutRef.current = setTimeout(() => {
          setShowIndicator(false)
        }, 3000)
      }, 3000)
    }

    const handleOffline = () => {
      // Clear any existing timeouts
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current)
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }

      // Start transitioning to offline
      setStatus("transitioning-offline")
      setShowIndicator(true)

      // After 3 seconds, set to offline and keep showing
      transitionTimeoutRef.current = setTimeout(() => {
        setStatus("offline")
        // Keep showing indicator when offline
      }, 3000)
    }

    // Add event listeners
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Cleanup function
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)

      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current)
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [])

  const isOnline = status === "online" || status === "transitioning-online"
  const isOffline = status === "offline" || status === "transitioning-offline"
  const isTransitioning = status === "transitioning-online" || status === "transitioning-offline"

  return {
    status,
    isOnline,
    isOffline,
    isTransitioning,
    showIndicator,
  }
}
