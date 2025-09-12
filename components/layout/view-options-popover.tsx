"use client"

import type React from "react"
import { useAtomValue } from "jotai"
import dynamic from "next/dynamic"
import { currentViewStateAtom } from "@/lib/atoms/ui/views"

import { Button } from "@/components/ui/button"
import { Settings2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { HoverPopover } from "@/components/ui/custom/hover-popover"
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
      viewState.sortBy !== "default" ||
      viewState.sortDirection !== "asc" ||
      viewState.showCompleted !== false ||
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
    <HoverPopover
      content={<ViewOptionsContent onAdvancedSearch={onAdvancedSearch} />}
      contentProps={{ className: "w-80", align: "end" }}
      openDelay={250}
      closeDelay={100}
      disabled={true} // TODO: disable for now to prevent confusion, will need to add a settings in the future.
    >
      <Button variant="ghost" size="sm" className={cn("gap-2 cursor-pointer", className)}>
        {getButtonIcon()}
        {getViewIndicator()}
      </Button>
    </HoverPopover>
  )
}

// Export as dynamic component to prevent hydration issues
export const ViewOptionsPopover = dynamic(() => Promise.resolve(ViewOptionsPopoverComponent), {
  ssr: false,
})
