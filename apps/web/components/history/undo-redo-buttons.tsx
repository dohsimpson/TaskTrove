/**
 * Undo/Redo Button Components
 *
 * This file provides reusable components for undo/redo functionality that can be
 * integrated into toolbars, menus, or other UI elements throughout the application.
 *
 * Features:
 * - Disabled state when no actions are available
 * - Keyboard shortcut hints in tooltips
 * - Operation descriptions for better UX
 * - Consistent styling with the rest of the application
 */

import React from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { Undo2, Redo2 } from "lucide-react"
import { Button } from "../ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip"
import { historyStateAtom, undoAtom, redoAtom } from "@tasktrove/atoms/core/history"

/**
 * Individual Undo Button Component
 * Can be used standalone or as part of a toolbar
 */
export const UndoButton: React.FC<{
  variant?: "default" | "ghost" | "outline" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
  showTooltip?: boolean
}> = ({ variant = "ghost", size = "sm", showTooltip = true }) => {
  const historyState = useAtomValue(historyStateAtom)
  const undo = useSetAtom(undoAtom)

  const handleUndo = () => {
    if (historyState.canUndo) {
      undo()
    }
  }

  const button = (
    <Button
      variant={variant}
      size={size}
      onClick={handleUndo}
      disabled={!historyState.canUndo}
      className="flex items-center gap-2"
      aria-label="Undo last action"
    >
      <Undo2 size={16} />
      <span className="hidden sm:inline">Undo</span>
    </Button>
  )

  if (!showTooltip) {
    return button
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <div className="font-medium">Undo</div>
            {historyState.lastOperation && (
              <div className="text-xs text-muted-foreground">{historyState.lastOperation}</div>
            )}
            <div className="text-xs text-muted-foreground mt-1">
              {navigator.platform.includes("Mac") ? "Cmd+Z" : "Ctrl+Z"}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Individual Redo Button Component
 * Can be used standalone or as part of a toolbar
 */
export const RedoButton: React.FC<{
  variant?: "default" | "ghost" | "outline" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
  showTooltip?: boolean
}> = ({ variant = "ghost", size = "sm", showTooltip = true }) => {
  const historyState = useAtomValue(historyStateAtom)
  const redo = useSetAtom(redoAtom)

  const handleRedo = () => {
    if (historyState.canRedo) {
      redo()
    }
  }

  const button = (
    <Button
      variant={variant}
      size={size}
      onClick={handleRedo}
      disabled={!historyState.canRedo}
      className="flex items-center gap-2"
      aria-label="Redo last action"
    >
      <Redo2 size={16} />
      <span className="hidden sm:inline">Redo</span>
    </Button>
  )

  if (!showTooltip) {
    return button
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <div className="font-medium">Redo</div>
            <div className="text-xs text-muted-foreground">
              {navigator.platform.includes("Mac")
                ? "Cmd+Y or Cmd+Shift+Z"
                : "Ctrl+Y or Ctrl+Shift+Z"}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Combined Undo/Redo Button Group
 * Convenient component for toolbars that need both buttons
 */
export const UndoRedoButtonGroup: React.FC<{
  variant?: "default" | "ghost" | "outline" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
  showTooltips?: boolean
  orientation?: "horizontal" | "vertical"
}> = ({ variant = "ghost", size = "sm", showTooltips = true, orientation = "horizontal" }) => {
  const containerClass =
    orientation === "horizontal" ? "flex items-center gap-1" : "flex flex-col gap-1"

  return (
    <div className={containerClass}>
      <UndoButton variant={variant} size={size} showTooltip={showTooltips} />
      <RedoButton variant={variant} size={size} showTooltip={showTooltips} />
    </div>
  )
}

/**
 * Toolbar Integration Component
 * Specifically designed for integration into the main application toolbar
 */
export const ToolbarUndoRedo: React.FC = () => {
  const historyState = useAtomValue(historyStateAtom)

  // Don't render anything if no history is available
  if (!historyState.canUndo && !historyState.canRedo) {
    return null
  }

  return (
    <div className="flex items-center gap-1 border-l pl-2 ml-2">
      <UndoRedoButtonGroup variant="ghost" size="sm" showTooltips={true} />
    </div>
  )
}

/**
 * Compact Undo/Redo for Mobile
 * Optimized for smaller screens
 */
export const MobileUndoRedo: React.FC = () => {
  const historyState = useAtomValue(historyStateAtom)
  const undo = useSetAtom(undoAtom)
  const redo = useSetAtom(redoAtom)

  if (!historyState.canUndo && !historyState.canRedo) {
    return null
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => undo()}
        disabled={!historyState.canUndo}
        className="p-2"
        aria-label="Undo"
      >
        <Undo2 size={16} />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => redo()}
        disabled={!historyState.canRedo}
        className="p-2"
        aria-label="Redo"
      >
        <Redo2 size={16} />
      </Button>
    </div>
  )
}

/**
 * History Status Display
 * Shows current history state for debugging or advanced users
 */
export const HistoryStatusDisplay: React.FC<{
  showDetails?: boolean
}> = ({ showDetails = false }) => {
  const historyState = useAtomValue(historyStateAtom)

  if (!showDetails) {
    return (
      <div className="text-xs text-muted-foreground">
        {historyState.canUndo && `Last: ${historyState.lastOperation}`}
      </div>
    )
  }

  return (
    <div className="text-xs text-muted-foreground space-y-1">
      <div>Tasks: {historyState.historyInfo.tasks.historyLength} states</div>
      <div>Projects: {historyState.historyInfo.projects.historyLength} states</div>
      <div>Labels: {historyState.historyInfo.labels.historyLength} states</div>
      {historyState.lastOperation && (
        <div className="font-medium">Last: {historyState.lastOperation}</div>
      )}
    </div>
  )
}
