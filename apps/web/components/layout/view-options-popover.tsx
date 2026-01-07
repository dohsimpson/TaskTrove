"use client"

import type React from "react"
import { useAtomValue } from "jotai"
import dynamic from "next/dynamic"
import { currentViewStateAtom } from "@tasktrove/atoms/ui/views"

import { Button } from "@/components/ui/button"
import { Settings2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ContentPopover } from "@/components/ui/content-popover"
import { ViewOptionsContent } from "./view-options-content"

interface ViewOptionsProps {
  onAdvancedSearch?: () => void
  className?: string
}

function ViewOptionsPopoverComponent({ onAdvancedSearch, className }: ViewOptionsProps) {
  const viewState = useAtomValue(currentViewStateAtom)

  const getButtonIcon = () => {
    return <Settings2 className="h-4 w-4" />
  }

  const getViewIndicator = () => {
    // Check if any view option deviates from default
    const isNonDefault =
      viewState.viewMode !== "list" ||
      viewState.showCompleted !== false ||
      (viewState.showArchived ?? false) !== false ||
      viewState.searchQuery !== "" ||
      viewState.showSidePanel !== false ||
      viewState.compactView !== false

    if (!isNonDefault) return null

    return (
      <div className="flex items-center">
        <div className="w-2 h-2 rounded-full bg-foreground" data-testid="view-indicator-dot" />
      </div>
    )
  }

  return (
    <ContentPopover
      content={<ViewOptionsContent onAdvancedSearch={onAdvancedSearch} />}
      className="w-80 p-3"
      align="end"
    >
      <Button variant="ghost" size="sm" className={cn("gap-2 cursor-pointer", className)}>
        {getButtonIcon()}
        {getViewIndicator()}
      </Button>
    </ContentPopover>
  )
}

// Export as dynamic component to prevent hydration issues
export const ViewOptionsPopover = dynamic(() => Promise.resolve(ViewOptionsPopoverComponent), {
  ssr: false,
})
