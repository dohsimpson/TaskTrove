"use client"

import { useMemo } from "react"
import { Play, Pause } from "lucide-react"

interface AnalogTimerProps {
  elapsedTime: number // milliseconds
  totalTime: number // milliseconds (allocated time)
  isRunning: boolean
  size?: number // diameter in pixels
  className?: string
  onToggle?: () => void
}

export default function AnalogTimer({
  elapsedTime,
  totalTime,
  isRunning,
  size = 240,
  className = "",
  onToggle,
}: AnalogTimerProps) {
  const radius = size / 2 - 20 // Leave space for tick marks
  const center = size / 2
  const totalTicks = 120 // 30-second intervals for smooth visualization

  // Calculate current position as a percentage of total time
  const progress = elapsedTime / totalTime
  const progressCapped = Math.min(progress, 1) // For tick elapsed state
  const currentTickIndex = Math.floor((progress * totalTicks) % totalTicks) // Allow wrapping around
  const isOvertime = elapsedTime > totalTime

  // Generate tick marks with dynamic properties
  const tickMarks = useMemo(() => {
    const ticks = []

    for (let i = 0; i < totalTicks; i++) {
      const angle = (i * 360) / totalTicks - 90 // Start from top (-90 degrees)
      const angleRad = (angle * Math.PI) / 180

      // Determine if this tick represents elapsed time
      // In overtime, all ticks should be considered elapsed
      const cappedTickIndex = Math.floor(progressCapped * totalTicks)
      const isElapsed = isOvertime ? true : i <= cappedTickIndex

      // Calculate distance from current position for gradient effect
      // Handle circular distance (shortest path around the circle)
      const rawDistance = Math.abs(i - currentTickIndex)
      const wrappedDistance = Math.min(rawDistance, totalTicks - rawDistance)
      const distanceFromCurrent = wrappedDistance

      // Determine tick length based on distance from current position
      let tickLength = 8 // Base length
      if (distanceFromCurrent === 0) {
        tickLength = 16 // Current position - longest
      } else if (distanceFromCurrent === 1) {
        tickLength = 13 // Adjacent - longer
      } else if (distanceFromCurrent === 2) {
        tickLength = 11 // Next - slightly longer
      } else if (distanceFromCurrent === 3) {
        tickLength = 9 // Outer - just a bit longer
      }

      // Calculate start and end positions for the tick mark
      const startRadius = radius + 5
      const endRadius = radius + 5 + tickLength

      const x1 = center + startRadius * Math.cos(angleRad)
      const y1 = center + startRadius * Math.sin(angleRad)
      const x2 = center + endRadius * Math.cos(angleRad)
      const y2 = center + endRadius * Math.sin(angleRad)

      // Color and opacity based on elapsed time and distance from current
      let color: string
      let opacity = 1

      // Overtime state - change colors to orange/red
      if (isOvertime) {
        color = isElapsed ? "rgb(220 38 38)" : "rgb(254 215 170)" // red-600 : orange-200
        if (distanceFromCurrent === 0) {
          color = "rgb(185 28 28)" // Darker red for current position
        }
      } else {
        // Enhanced visibility for current position area
        if (distanceFromCurrent === 0) {
          color = "hsl(var(--primary))" // Use primary color for current position
          opacity = 1
        } else {
          // Use theme-aware colors for other ticks
          color = isElapsed
            ? "hsl(var(--foreground) / 0.8)" // Darker in light mode, lighter in dark mode
            : "hsl(var(--muted-foreground) / 0.5)" // Muted color

          if (distanceFromCurrent <= 3) {
            opacity = isElapsed ? 0.9 : 0.7
          } else {
            opacity = isElapsed ? 0.8 : 0.5
          }
        }
      }

      ticks.push({
        id: i,
        x1,
        y1,
        x2,
        y2,
        color,
        opacity,
        isElapsed,
        isCurrent: distanceFromCurrent === 0,
        strokeWidth: distanceFromCurrent === 0 ? 2.5 : distanceFromCurrent <= 3 ? 2 : 1.5,
      })
    }

    return ticks
  }, [currentTickIndex, totalTicks, radius, center, isOvertime, progressCapped])

  // Format time for center display
  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  return (
    <div className={`relative ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform rotate-0 transition-transform duration-300"
      >
        {/* Outer circle border */}
        <circle
          cx={center}
          cy={center}
          r={radius + 2}
          fill="none"
          stroke="rgb(241 245 249)"
          strokeWidth="1"
          opacity="0.3"
          className="dark:stroke-slate-600"
        />

        {/* Tick marks */}
        {tickMarks.map((tick) => (
          <line
            key={tick.id}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke={tick.color}
            strokeWidth={tick.strokeWidth}
            opacity={tick.opacity}
            strokeLinecap="round"
            className="transition-all duration-300"
          />
        ))}
      </svg>

      {/* Center content with control */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center">
        {/* Digital time display */}
        <div
          className={`text-xl font-mono font-light mb-2 transition-colors duration-300 text-center ${
            isOvertime && isRunning
              ? "text-red-600 animate-pulse"
              : isRunning
                ? "text-slate-900 dark:text-white"
                : "text-slate-600 dark:text-slate-300"
          }`}
        >
          <div>{formatTime(elapsedTime)}</div>
          <div className="text-xs opacity-60">/</div>
          <div className="text-sm opacity-80">{formatTime(totalTime)}</div>
        </div>

        {/* Integrated play/pause control */}
        {onToggle && (
          <button
            onClick={onToggle}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 hover:border-2 hover:border-slate-700 dark:hover:border-slate-300 text-slate-700 dark:text-slate-300"
          >
            {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
        )}
      </div>
    </div>
  )
}
