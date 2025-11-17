"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ComponentProps, ReactNode } from "react"
import { useEffect } from "react"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"

type ButtonProps = ComponentProps<typeof Button>

type FloatingDockPlacement = "bottom-end" | "bottom-start" | "top-end" | "top-start"

const placementClasses: Record<FloatingDockPlacement, string> = {
  "bottom-end": "items-end justify-end",
  "bottom-start": "items-end justify-start",
  "top-end": "items-start justify-end",
  "top-start": "items-start justify-start",
}

export interface FloatingDockProps {
  triggerLabel: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  triggerCount?: number
  hideTriggerWhenOpen?: boolean
  triggerVariant?: ButtonProps["variant"]
  triggerSize?: ButtonProps["size"]
  triggerProps?: Omit<ButtonProps, "onClick" | "children" | "variant" | "size">
  placement?: FloatingDockPlacement
  className?: string
  stackClassName?: string
  panelClassName?: string
  contentClassName?: string
  closeOnEscape?: boolean
  shortcutComponentId?: string
  shortcutPriority?: number
  shortcutExcludeDialogs?: boolean
}

export function FloatingDock({
  triggerLabel,
  triggerCount,
  isOpen,
  onOpenChange,
  children,
  hideTriggerWhenOpen = false,
  triggerVariant = "outline",
  triggerSize = "sm",
  triggerProps,
  placement = "bottom-end",
  className,
  stackClassName,
  panelClassName,
  contentClassName,
  closeOnEscape = true,
  shortcutComponentId = "floating-dock",
  shortcutPriority = 25,
  shortcutExcludeDialogs = true,
}: FloatingDockProps) {
  const labelText =
    typeof triggerCount === "number" ? `${triggerLabel} (${triggerCount})` : triggerLabel

  const handleTriggerClick = () => {
    if (hideTriggerWhenOpen) {
      if (!isOpen) onOpenChange(true)
    } else {
      onOpenChange(!isOpen)
    }
  }

  useKeyboardShortcuts(
    {
      Escape: () => {
        if (!closeOnEscape || !isOpen) return false
        onOpenChange(false)
        return true
      },
    },
    {
      componentId: shortcutComponentId,
      enabled: closeOnEscape && isOpen,
      priority: shortcutPriority,
      excludeDialogs: shortcutExcludeDialogs,
    },
  )

  // Fallback escape handler for better testability
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [closeOnEscape, isOpen, onOpenChange])

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 flex p-4 z-40",
        placementClasses[placement],
        className,
      )}
    >
      <div className={cn("pointer-events-auto flex flex-col items-end gap-2", stackClassName)}>
        {(!isOpen || !hideTriggerWhenOpen) && (
          <Button
            {...triggerProps}
            size={triggerSize}
            variant={triggerVariant}
            onClick={handleTriggerClick}
            aria-expanded={isOpen}
          >
            {labelText}
          </Button>
        )}
        {isOpen && (
          <div
            className={cn(
              "w-[22rem] max-w-[90vw] overflow-hidden rounded-xl border border-border bg-card shadow-xl",
              panelClassName,
            )}
          >
            <div className={cn("max-h-[70vh] overflow-y-auto", contentClassName)}>{children}</div>
          </div>
        )}
      </div>
    </div>
  )
}
