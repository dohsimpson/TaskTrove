"use client"

import { useCallback, useEffect, useRef, type ReactNode } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { TaskSidePanel } from "@/components/task/task-side-panel"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  type ResizablePanelGroupHandle,
} from "@/components/ui/resizable"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { selectedTaskAtom } from "@tasktrove/atoms/ui/selection"
import {
  currentViewStateAtom,
  setViewOptionsAtom,
  sidePanelWidthAtom,
  updateGlobalViewOptionsAtom,
} from "@tasktrove/atoms/ui/views"
import { SIDE_PANEL_WIDTH_MAX, SIDE_PANEL_WIDTH_MIN } from "@tasktrove/constants"

type SidePanelLayoutProps = {
  children: ReactNode
  /** Optional class applied to the root container */
  rootClassName?: string
  /** Optional class applied to the scrollable content wrapper */
  contentWrapperClassName?: string
  /** When true, applies default horizontal padding to the content wrapper */
  applyContentPadding?: boolean
}

/**
 * Shared layout wrapper that adds the resizable task side panel to any task-centric view.
 * Centralizing this logic ensures consistent interactions across list, calendar, and kanban views.
 */
export function TaskViewSidePanelLayout({
  children,
  rootClassName,
  contentWrapperClassName,
  applyContentPadding = false,
}: SidePanelLayoutProps) {
  const { showSidePanel } = useAtomValue(currentViewStateAtom)
  const selectedTask = useAtomValue(selectedTaskAtom)
  const sidePanelWidth = useAtomValue(sidePanelWidthAtom)
  const updateGlobalViewOptions = useSetAtom(updateGlobalViewOptionsAtom)
  const setViewOptions = useSetAtom(setViewOptionsAtom)
  const isMobile = useIsMobile()
  const panelGroupRef = useRef<ResizablePanelGroupHandle | null>(null)

  // Panel is open only when the user wants it visible AND there is a selected task
  const isPanelOpen = showSidePanel && Boolean(selectedTask)

  // Update panel layout when panel state or width changes (desktop only)
  useEffect(() => {
    if (isMobile) return undefined

    let frame: number | null = null
    const group = panelGroupRef.current
    const hasSetLayout = (group: unknown): group is { setLayout: (sizes: number[]) => void } =>
      group !== null &&
      typeof group === "object" &&
      "setLayout" in group &&
      typeof Reflect.get(group, "setLayout") === "function"

    const groupWithLayout = hasSetLayout(group) ? group : null

    if (!groupWithLayout) {
      return undefined
    }

    frame = window.requestAnimationFrame(() => {
      const mainSize = isPanelOpen ? 100 - sidePanelWidth : 100
      const panelSize = isPanelOpen ? sidePanelWidth : 0
      try {
        groupWithLayout.setLayout([mainSize, panelSize])
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Failed to update side panel layout", error)
        }
      }
    })

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame)
      }
    }
  }, [isPanelOpen, sidePanelWidth, isMobile])

  const handleClosePanel = useCallback(() => {
    setViewOptions({ showSidePanel: false })
  }, [setViewOptions])

  const handlePanelResize = useCallback(
    (sizes: number[]) => {
      if (!isPanelOpen) return
      if (sizes.length >= 2 && sizes[1] !== undefined) {
        updateGlobalViewOptions({ sidePanelWidth: sizes[1] })
      }
    },
    [isPanelOpen, updateGlobalViewOptions],
  )

  const renderSidePanel = (variant?: "resizable") => (
    <TaskSidePanel isOpen={isPanelOpen} onClose={handleClosePanel} variant={variant} />
  )

  const contentClasses = cn(
    "flex-1 min-h-0",
    applyContentPadding && "px-2",
    contentWrapperClassName,
  )

  if (isMobile) {
    return (
      <div className={cn("flex flex-1 relative h-full", rootClassName)}>
        <div className={contentClasses}>{children}</div>
        {renderSidePanel()}
      </div>
    )
  }

  const desktopLayout = (
    <div className={cn("flex flex-col h-full overflow-hidden", rootClassName)}>
      <ResizablePanelGroup
        ref={panelGroupRef}
        direction="horizontal"
        className="flex-1 min-h-0"
        onLayout={handlePanelResize}
      >
        <ResizablePanel
          defaultSize={isPanelOpen ? 100 - sidePanelWidth : 100}
          minSize={SIDE_PANEL_WIDTH_MIN}
          maxSize={isPanelOpen ? SIDE_PANEL_WIDTH_MAX : 100}
        >
          <div className={cn("h-full", contentClasses)}>{children}</div>
        </ResizablePanel>
        <ResizableHandle withHandle={false} className={cn(!isPanelOpen && "hidden")} />
        <ResizablePanel
          defaultSize={isPanelOpen ? sidePanelWidth : 0}
          minSize={isPanelOpen ? SIDE_PANEL_WIDTH_MIN : 0}
          maxSize={isPanelOpen ? SIDE_PANEL_WIDTH_MAX : 0}
          className={cn(!isPanelOpen && "max-w-0 min-w-0 overflow-hidden")}
        >
          <div className="h-full">
            {isPanelOpen ? renderSidePanel("resizable") : renderSidePanel()}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )

  return desktopLayout
}
