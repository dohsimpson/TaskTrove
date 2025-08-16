"use client"

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Smartphone,
  Hand,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react"

interface SwipeGestureConfig {
  enabled: boolean
  action: string
  threshold: number
}

interface PinchGestureConfig {
  enabled: boolean
  action: string
  threshold: number
}

interface DoubleTapGestureConfig {
  enabled: boolean
  action: string
  delay: number
}

interface LongPressGestureConfig {
  enabled: boolean
  action: string
  duration: number
}

interface GestureConfig {
  enabled: boolean
  sensitivity: number
  gestures: {
    swipeLeft: SwipeGestureConfig
    swipeRight: SwipeGestureConfig
    swipeUp: SwipeGestureConfig
    swipeDown: SwipeGestureConfig
    pinch: PinchGestureConfig
    doubleTap: DoubleTapGestureConfig
    longPress: LongPressGestureConfig
  }
}

interface GestureEvent {
  type: "swipe" | "pinch" | "tap" | "longpress"
  direction?: "left" | "right" | "up" | "down" | "in" | "out"
  distance?: number
  duration?: number
  position: { x: number; y: number }
  timestamp: Date
}

interface GestureHandlerProps {
  children: ReactNode
  config: GestureConfig
  onGesture: (gesture: GestureEvent) => void
  onUpdateConfig: (config: GestureConfig) => void
  className?: string
}

export function GestureHandler({
  children,
  config,
  onGesture,
  onUpdateConfig,
  className = "",
}: GestureHandlerProps) {
  const [showSettings, setShowSettings] = useState(false)
  const [recentGestures, setRecentGestures] = useState<GestureEvent[]>([])
  const [isTracking, setIsTracking] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const touchEndRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastTapRef = useRef<number>(0)
  const pinchStartRef = useRef<{ distance: number; center: { x: number; y: number } } | null>(null)

  const handleGesture = useCallback(
    (gesture: GestureEvent) => {
      setRecentGestures((prev) => [gesture, ...prev.slice(0, 9)]) // Keep last 10 gestures
      onGesture(gesture)
    },
    [onGesture],
  )

  // Touch event handlers
  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!config.enabled) return

      const touch = e.touches[0]
      const now = Date.now()

      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: now,
      }

      setIsTracking(true)

      // Handle multi-touch for pinch gestures
      if (e.touches.length === 2 && config.gestures.pinch.enabled) {
        const touch1 = e.touches[0]
        const touch2 = e.touches[1]
        const distance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
            Math.pow(touch2.clientY - touch1.clientY, 2),
        )
        const center = {
          x: (touch1.clientX + touch2.clientX) / 2,
          y: (touch1.clientY + touch2.clientY) / 2,
        }
        pinchStartRef.current = { distance, center }
      }

      // Start long press timer
      if (config.gestures.longPress.enabled) {
        longPressTimerRef.current = setTimeout(() => {
          if (touchStartRef.current) {
            const gesture: GestureEvent = {
              type: "longpress",
              position: { x: touchStartRef.current.x, y: touchStartRef.current.y },
              duration: config.gestures.longPress.duration,
              timestamp: new Date(),
            }
            handleGesture(gesture)
          }
        }, config.gestures.longPress.duration)
      }
    },
    [config, handleGesture],
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!config.enabled || !touchStartRef.current) return

      // Handle pinch gesture
      if (e.touches.length === 2 && config.gestures.pinch.enabled && pinchStartRef.current) {
        const touch1 = e.touches[0]
        const touch2 = e.touches[1]
        const distance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
            Math.pow(touch2.clientY - touch1.clientY, 2),
        )

        const distanceDiff = distance - pinchStartRef.current.distance
        const threshold = config.gestures.pinch.threshold

        if (Math.abs(distanceDiff) > threshold) {
          const gesture: GestureEvent = {
            type: "pinch",
            direction: distanceDiff > 0 ? "out" : "in",
            distance: Math.abs(distanceDiff),
            position: pinchStartRef.current.center,
            timestamp: new Date(),
          }
          handleGesture(gesture)
          pinchStartRef.current = { distance, center: pinchStartRef.current.center }
        }
      }

      // Clear long press timer on move
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
    },
    [config, handleGesture],
  )

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!config.enabled || !touchStartRef.current) return

      const touch = e.changedTouches[0]
      const now = Date.now()

      touchEndRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: now,
      }

      setIsTracking(false)

      // Clear long press timer
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }

      // Calculate swipe
      const deltaX = touchEndRef.current.x - touchStartRef.current.x
      const deltaY = touchEndRef.current.y - touchStartRef.current.y
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      const duration = touchEndRef.current.time - touchStartRef.current.time

      // Handle swipe ges tures
      if (distance > 50 && duration < 500) {
        let direction: "left" | "right" | "up" | "down"
        let gestureConfig

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          // Horizontal swipe
          direction = deltaX > 0 ? "right" : "left"
          gestureConfig =
            direction === "left" ? config.gestures.swipeLeft : config.gestures.swipeRight
        } else {
          // Vertical swipe
          direction = deltaY > 0 ? "down" : "up"
          gestureConfig = direction === "up" ? config.gestures.swipeUp : config.gestures.swipeDown
        }

        if (gestureConfig.enabled && distance > gestureConfig.threshold) {
          const gesture: GestureEvent = {
            type: "swipe",
            direction,
            distance,
            duration,
            position: { x: touchStartRef.current.x, y: touchStartRef.current.y },
            timestamp: new Date(),
          }
          handleGesture(gesture)
        }
      }
      // Handle tap gestures
      else if (distance < 10 && duration < 300) {
        const timeSinceLastTap = now - lastTapRef.current

        if (
          config.gestures.doubleTap.enabled &&
          timeSinceLastTap < config.gestures.doubleTap.delay
        ) {
          // Double tap
          const gesture: GestureEvent = {
            type: "tap",
            position: { x: touchStartRef.current.x, y: touchStartRef.current.y },
            timestamp: new Date(),
          }
          handleGesture(gesture)
          lastTapRef.current = 0 // Reset to prevent triple tap
        } else {
          lastTapRef.current = now
        }
      }

      touchStartRef.current = null
      touchEndRef.current = null
      pinchStartRef.current = null
    },
    [config, handleGesture],
  )

  // Set up touch event listeners
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener("touchstart", handleTouchStart, { passive: false })
    container.addEventListener("touchmove", handleTouchMove, { passive: false })
    container.addEventListener("touchend", handleTouchEnd, { passive: false })

    return () => {
      container.removeEventListener("touchstart", handleTouchStart)
      container.removeEventListener("touchmove", handleTouchMove)
      container.removeEventListener("touchend", handleTouchEnd)
    }
  }, [config, handleTouchStart, handleTouchMove, handleTouchEnd])

  const getGestureIcon = (type: string, direction?: string) => {
    switch (type) {
      case "swipe":
        switch (direction) {
          case "left":
            return <ArrowLeft className="h-4 w-4" />
          case "right":
            return <ArrowRight className="h-4 w-4" />
          case "up":
            return <ArrowUp className="h-4 w-4" />
          case "down":
            return <ArrowDown className="h-4 w-4" />
        }
        break
      case "pinch":
        return direction === "in" ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />
      case "longpress":
        return <Hand className="h-4 w-4" />
      case "tap":
        return <RotateCcw className="h-4 w-4" />
    }
    return <Hand className="h-4 w-4" />
  }

  return (
    <div className={`relative ${className}`}>
      {/* Gesture Detection Overlay */}
      <div
        ref={containerRef}
        className="relative touch-none select-none"
        style={{ touchAction: config.enabled ? "none" : "auto" }}
      >
        {children}

        {/* Tracking Indicator */}
        {isTracking && config.enabled && (
          <div className="absolute top-4 right-4 z-50">
            <Badge className="bg-blue-100 text-blue-700 animate-pulse">
              <Hand className="h-3 w-3 mr-1" />
              Tracking
            </Badge>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Gesture Settings
                </CardTitle>
                <Button onClick={() => setShowSettings(false)} variant="outline" size="sm">
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Global Settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Enable Gestures</label>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Allow touch gestures for navigation
                    </p>
                  </div>
                  <Switch
                    checked={config.enabled}
                    onCheckedChange={(enabled) => onUpdateConfig({ ...config, enabled })}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Sensitivity</label>
                    <span className="text-sm text-gray-600">{config.sensitivity}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={config.sensitivity}
                    onChange={(e) =>
                      onUpdateConfig({ ...config, sensitivity: Number.parseInt(e.target.value) })
                    }
                    className="w-full"
                  />
                </div>
              </div>

              {/* Individual Gesture Settings */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Gesture Configuration</h4>

                {/* Swipe Gestures */}
                {Object.entries(config.gestures).map(([gestureKey, gestureConfig]) => {
                  if (!["swipeLeft", "swipeRight", "swipeUp", "swipeDown"].includes(gestureKey))
                    return null

                  const direction = gestureKey.replace("swipe", "").toLowerCase()
                  return (
                    <div
                      key={gestureKey}
                      className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getGestureIcon("swipe", direction)}
                          <span className="text-sm font-medium">
                            Swipe {direction.charAt(0).toUpperCase() + direction.slice(1)}
                          </span>
                        </div>
                        <Switch
                          checked={gestureConfig.enabled}
                          onCheckedChange={(enabled) =>
                            onUpdateConfig({
                              ...config,
                              gestures: {
                                ...config.gestures,
                                [gestureKey]: { ...gestureConfig, enabled },
                              },
                            })
                          }
                        />
                      </div>

                      {gestureConfig.enabled && (
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs font-medium">Action</label>
                            <select
                              value={gestureConfig.action}
                              onChange={(e) =>
                                onUpdateConfig({
                                  ...config,
                                  gestures: {
                                    ...config.gestures,
                                    [gestureKey]: { ...gestureConfig, action: e.target.value },
                                  },
                                })
                              }
                              className="w-full mt-1 p-2 text-xs border border-gray-200 dark:border-gray-700 rounded-md bg-background"
                            >
                              <option value="complete_task">Complete Task</option>
                              <option value="delete_task">Delete Task</option>
                              <option value="edit_task">Edit Task</option>
                              <option value="add_task">Add Task</option>
                              <option value="toggle_sidebar">Toggle Sidebar</option>
                              <option value="refresh">Refresh</option>
                              <option value="go_back">Go Back</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-medium">
                              {gestureKey === "doubleTap"
                                ? "Delay"
                                : gestureKey === "longPress"
                                  ? "Duration"
                                  : "Threshold"}
                              :
                              {gestureKey === "doubleTap" && "delay" in gestureConfig
                                ? gestureConfig.delay
                                : gestureKey === "longPress" && "duration" in gestureConfig
                                  ? gestureConfig.duration
                                  : "threshold" in gestureConfig
                                    ? gestureConfig.threshold
                                    : 0}
                              {gestureKey === "doubleTap"
                                ? "ms"
                                : gestureKey === "longPress"
                                  ? "ms"
                                  : "px"}
                            </label>
                            <input
                              type="range"
                              min="30"
                              max="200"
                              value={
                                gestureKey === "doubleTap" && "delay" in gestureConfig
                                  ? gestureConfig.delay
                                  : gestureKey === "longPress" && "duration" in gestureConfig
                                    ? gestureConfig.duration
                                    : "threshold" in gestureConfig
                                      ? gestureConfig.threshold
                                      : 0
                              }
                              onChange={(e) => {
                                const value = Number.parseInt(e.target.value)
                                const updateKey =
                                  gestureKey === "doubleTap"
                                    ? "delay"
                                    : gestureKey === "longPress"
                                      ? "duration"
                                      : "threshold"
                                onUpdateConfig({
                                  ...config,
                                  gestures: {
                                    ...config.gestures,
                                    [gestureKey]: { ...gestureConfig, [updateKey]: value },
                                  },
                                })
                              }}
                              className="w-full mt-1"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Pinch Gesture */}
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ZoomIn className="h-4 w-4" />
                      <span className="text-sm font-medium">Pinch Zoom</span>
                    </div>
                    <Switch
                      checked={config.gestures.pinch.enabled}
                      onCheckedChange={(enabled) =>
                        onUpdateConfig({
                          ...config,
                          gestures: {
                            ...config.gestures,
                            pinch: { ...config.gestures.pinch, enabled },
                          },
                        })
                      }
                    />
                  </div>

                  {config.gestures.pinch.enabled && (
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs font-medium">Action</label>
                        <select
                          value={config.gestures.pinch.action}
                          onChange={(e) =>
                            onUpdateConfig({
                              ...config,
                              gestures: {
                                ...config.gestures,
                                pinch: { ...config.gestures.pinch, action: e.target.value },
                              },
                            })
                          }
                          className="w-full mt-1 p-2 text-xs border border-gray-200 dark:border-gray-700 rounded-md bg-background"
                        >
                          <option value="zoom_in">Zoom In</option>
                          <option value="zoom_out">Zoom Out</option>
                          <option value="toggle_view">Toggle View</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium">
                          Threshold: {config.gestures.pinch.threshold}px
                        </label>
                        <input
                          type="range"
                          min="20"
                          max="100"
                          value={config.gestures.pinch.threshold}
                          onChange={(e) =>
                            onUpdateConfig({
                              ...config,
                              gestures: {
                                ...config.gestures,
                                pinch: {
                                  ...config.gestures.pinch,
                                  threshold: Number.parseInt(e.target.value),
                                },
                              },
                            })
                          }
                          className="w-full mt-1"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Double Tap */}
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="h-4 w-4" />
                      <span className="text-sm font-medium">Double Tap</span>
                    </div>
                    <Switch
                      checked={config.gestures.doubleTap.enabled}
                      onCheckedChange={(enabled) =>
                        onUpdateConfig({
                          ...config,
                          gestures: {
                            ...config.gestures,
                            doubleTap: { ...config.gestures.doubleTap, enabled },
                          },
                        })
                      }
                    />
                  </div>

                  {config.gestures.doubleTap.enabled && (
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs font-medium">Action</label>
                        <select
                          value={config.gestures.doubleTap.action}
                          onChange={(e) =>
                            onUpdateConfig({
                              ...config,
                              gestures: {
                                ...config.gestures,
                                doubleTap: { ...config.gestures.doubleTap, action: e.target.value },
                              },
                            })
                          }
                          className="w-full mt-1 p-2 text-xs border border-gray-200 dark:border-gray-700 rounded-md bg-background"
                        >
                          <option value="edit_task">Edit Task</option>
                          <option value="complete_task">Complete Task</option>
                          <option value="add_task">Add Task</option>
                          <option value="refresh">Refresh</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium">
                          Delay: {config.gestures.doubleTap.delay}ms
                        </label>
                        <input
                          type="range"
                          min="200"
                          max="800"
                          value={config.gestures.doubleTap.delay}
                          onChange={(e) =>
                            onUpdateConfig({
                              ...config,
                              gestures: {
                                ...config.gestures,
                                doubleTap: {
                                  ...config.gestures.doubleTap,
                                  delay: Number.parseInt(e.target.value),
                                },
                              },
                            })
                          }
                          className="w-full mt-1"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Long Press */}
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Hand className="h-4 w-4" />
                      <span className="text-sm font-medium">Long Press</span>
                    </div>
                    <Switch
                      checked={config.gestures.longPress.enabled}
                      onCheckedChange={(enabled) =>
                        onUpdateConfig({
                          ...config,
                          gestures: {
                            ...config.gestures,
                            longPress: { ...config.gestures.longPress, enabled },
                          },
                        })
                      }
                    />
                  </div>

                  {config.gestures.longPress.enabled && (
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs font-medium">Action</label>
                        <select
                          value={config.gestures.longPress.action}
                          onChange={(e) =>
                            onUpdateConfig({
                              ...config,
                              gestures: {
                                ...config.gestures,
                                longPress: { ...config.gestures.longPress, action: e.target.value },
                              },
                            })
                          }
                          className="w-full mt-1 p-2 text-xs border border-gray-200 dark:border-gray-700 rounded-md bg-background"
                        >
                          <option value="delete_task">Delete Task</option>
                          <option value="edit_task">Edit Task</option>
                          <option value="complete_task">Complete Task</option>
                          <option value="add_task">Add Task</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium">
                          Duration: {config.gestures.longPress.duration}ms
                        </label>
                        <input
                          type="range"
                          min="300"
                          max="2000"
                          value={config.gestures.longPress.duration}
                          onChange={(e) =>
                            onUpdateConfig({
                              ...config,
                              gestures: {
                                ...config.gestures,
                                longPress: {
                                  ...config.gestures.longPress,
                                  duration: Number.parseInt(e.target.value),
                                },
                              },
                            })
                          }
                          className="w-full mt-1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gesture History */}
      <div className="fixed bottom-4 right-4 z-40">
        {recentGestures.length > 0 && (
          <Card className="w-64">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Recent Gestures</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 max-h-32 overflow-y-auto">
              {recentGestures.slice(0, 5).map((gesture, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded"
                >
                  <div className="flex items-center gap-2">
                    {getGestureIcon(gesture.type, gesture.direction)}
                    <span>
                      {gesture.type} {gesture.direction && `${gesture.direction}`}
                    </span>
                  </div>
                  <span className="text-gray-500">
                    {gesture.timestamp.toLocaleTimeString().slice(0, 5)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
