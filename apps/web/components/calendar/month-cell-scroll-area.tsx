"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import type { ReactNode } from "react"

type MonthCellScrollAreaProps = {
  children: ReactNode
}

export function MonthCellScrollArea({ children }: MonthCellScrollAreaProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [shadowState, setShadowState] = useState({
    showTop: false,
    showBottom: false,
  })

  const updateShadowState = useCallback(() => {
    const element = ref.current
    if (!element) return
    const canScroll = element.scrollHeight > element.clientHeight + 1
    const atTop = element.scrollTop <= 0
    const atBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 1
    setShadowState({
      showTop: canScroll && !atTop,
      showBottom: canScroll && !atBottom,
    })
  }, [])

  useEffect(() => {
    updateShadowState()
    const element = ref.current
    if (!element) return

    const observer = new ResizeObserver(() => {
      updateShadowState()
    })
    observer.observe(element)

    const handleResize = () => updateShadowState()
    window.addEventListener("resize", handleResize)

    return () => {
      observer.disconnect()
      window.removeEventListener("resize", handleResize)
    }
  }, [updateShadowState])

  return (
    <div className="relative flex-1 min-h-0">
      <div ref={ref} className="h-full space-y-0.5 overflow-y-auto" onScroll={updateShadowState}>
        {children}
      </div>
      {shadowState.showTop || shadowState.showBottom ? (
        <>
          {shadowState.showTop ? (
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-4"
              style={{ boxShadow: "inset 0 10px 10px -10px rgba(0,0,0,0.25)" }}
            />
          ) : null}
          {shadowState.showBottom ? (
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-4"
              style={{ boxShadow: "inset 0 -10px 10px -10px rgba(0,0,0,0.25)" }}
            />
          ) : null}
        </>
      ) : null}
    </div>
  )
}
