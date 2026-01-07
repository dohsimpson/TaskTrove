import { useCallback, useEffect, useRef, useState } from "react"
import { MINUTES_PER_DAY, MINUTES_PER_SUBSLOT } from "./time-grid"

export type TimeRangeMinutes = {
  startMinutes: number
  endMinutes: number
}

type ResizeHandle = "start" | "end"

type ResizeState = {
  handle: ResizeHandle
  pointerId: number
  originY: number
  startMinutes: number
  endMinutes: number
  draftStartMinutes: number
  draftEndMinutes: number
}

type UseTimeBlockResizeOptions = {
  range: TimeRangeMinutes
  pixelsPerMinute: number
  minMinutes?: number
  maxMinutes?: number
  enabled?: boolean
  onCommit: (finalRange: TimeRangeMinutes, initialRange: TimeRangeMinutes) => void | Promise<void>
  onResizeStart?: () => void
  onResizeEnd?: () => void
  onPreview?: (range: TimeRangeMinutes) => void
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
const snapToStep = (value: number, step: number) => Math.round(value / step) * step

export function useTimeBlockResize({
  range,
  pixelsPerMinute,
  minMinutes = MINUTES_PER_SUBSLOT,
  maxMinutes = MINUTES_PER_DAY,
  enabled = true,
  onCommit,
  onResizeStart,
  onResizeEnd,
  onPreview,
}: UseTimeBlockResizeOptions) {
  const [isResizing, setIsResizing] = useState(false)
  const [displayRange, setDisplayRange] = useState<TimeRangeMinutes>(range)
  const resizeStateRef = useRef<ResizeState | null>(null)

  useEffect(() => {
    if (isResizing) return
    setDisplayRange(range)
  }, [isResizing, range])

  const commitResize = useCallback(() => {
    const state = resizeStateRef.current
    if (!state) return

    const finalRange = {
      startMinutes: state.draftStartMinutes,
      endMinutes: state.draftEndMinutes,
    }
    const initialRange = {
      startMinutes: state.startMinutes,
      endMinutes: state.endMinutes,
    }

    resizeStateRef.current = null
    setIsResizing(false)
    onResizeEnd?.()

    if (
      finalRange.startMinutes === initialRange.startMinutes &&
      finalRange.endMinutes === initialRange.endMinutes
    ) {
      return
    }

    onCommit(finalRange, initialRange)
  }, [onCommit, onResizeEnd])

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const state = resizeStateRef.current
      if (!state || state.pointerId !== event.pointerId) return
      if (!enabled || pixelsPerMinute <= 0) return

      const deltaMinutes = (event.clientY - state.originY) / pixelsPerMinute

      let nextStart = state.startMinutes
      let nextEnd = state.endMinutes

      if (state.handle === "start") {
        const proposedStart = snapToStep(state.startMinutes + deltaMinutes, minMinutes)
        const maxStart = state.endMinutes - minMinutes
        nextStart = clamp(proposedStart, 0, maxStart)
        nextEnd = state.endMinutes
      } else {
        const proposedEnd = snapToStep(state.endMinutes + deltaMinutes, minMinutes)
        const minEnd = state.startMinutes + minMinutes
        nextEnd = clamp(proposedEnd, minEnd, maxMinutes)
        nextStart = state.startMinutes
      }

      state.draftStartMinutes = nextStart
      state.draftEndMinutes = nextEnd

      const nextRange = { startMinutes: nextStart, endMinutes: nextEnd }
      setDisplayRange(nextRange)
      onPreview?.(nextRange)
    },
    [enabled, maxMinutes, minMinutes, onPreview, pixelsPerMinute],
  )

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      const state = resizeStateRef.current
      if (!state || state.pointerId !== event.pointerId) return
      commitResize()
    },
    [commitResize],
  )

  useEffect(() => {
    if (!isResizing) return

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    window.addEventListener("pointercancel", handlePointerUp)

    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
      window.removeEventListener("pointercancel", handlePointerUp)
    }
  }, [handlePointerMove, handlePointerUp, isResizing])

  const startResize = useCallback(
    (handle: ResizeHandle) => (event: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled) return
      event.preventDefault()
      event.stopPropagation()

      const baseStart = clamp(range.startMinutes, 0, maxMinutes)
      const baseEnd = clamp(range.endMinutes, baseStart + minMinutes, maxMinutes)

      resizeStateRef.current = {
        handle,
        pointerId: event.pointerId,
        originY: event.clientY,
        startMinutes: baseStart,
        endMinutes: baseEnd,
        draftStartMinutes: baseStart,
        draftEndMinutes: baseEnd,
      }

      setIsResizing(true)
      onResizeStart?.()
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [enabled, maxMinutes, minMinutes, onResizeStart, range.endMinutes, range.startMinutes],
  )

  return { displayRange, isResizing, startResize }
}
