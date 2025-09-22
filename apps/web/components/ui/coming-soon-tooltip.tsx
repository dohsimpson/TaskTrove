"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { cn } from "@/lib/utils"

interface ComingSoonTooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
  className?: string
}

/**
 * Custom tooltip component for coming soon features with speech bubble styling.
 * Uses CSS pseudo-elements (::before and ::after) to create a bordered arrow
 * that appears seamlessly connected to the tooltip content.
 */
export function ComingSoonTooltip({
  children,
  content,
  side = "top",
  className,
}: ComingSoonTooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={100} skipDelayDuration={50}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={10}
            className={cn(
              // Base styling
              "relative z-50 overflow-visible rounded-md border-2 border-black bg-white px-3 py-1.5 text-sm font-medium text-black shadow-md",
              // Animations
              "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
              "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
              // Arrow base styles - using two pseudo-elements for border effect
              "before:content-[''] before:absolute before:h-0 before:w-0",
              "after:content-[''] after:absolute after:h-0 after:w-0",
              // Arrow positioning and styling by side
              {
                // Top side: arrow points down from tooltip
                "before:top-full before:left-1/2 before:-translate-x-1/2 before:border-l-[7px] before:border-r-[7px] before:border-t-[7px] before:border-l-transparent before:border-r-transparent before:border-t-black":
                  side === "top",
                "after:top-full after:left-1/2 after:-translate-x-1/2 after:-mt-[2px] after:border-l-[5.5px] after:border-r-[5.5px] after:border-t-[5.5px] after:border-l-transparent after:border-r-transparent after:border-t-white":
                  side === "top",

                // Bottom side: arrow points up to tooltip
                "before:bottom-full before:left-1/2 before:-translate-x-1/2 before:border-l-[7px] before:border-r-[7px] before:border-b-[7px] before:border-l-transparent before:border-r-transparent before:border-b-black":
                  side === "bottom",
                "after:bottom-full after:left-1/2 after:-translate-x-1/2 after:-mb-[2px] after:border-l-[5.5px] after:border-r-[5.5px] after:border-b-[5.5px] after:border-l-transparent after:border-r-transparent after:border-b-white":
                  side === "bottom",

                // Right side: arrow points left to tooltip
                "before:right-full before:top-1/2 before:-translate-y-1/2 before:border-t-[7px] before:border-b-[7px] before:border-r-[7px] before:border-t-transparent before:border-b-transparent before:border-r-black":
                  side === "right",
                "after:right-full after:top-1/2 after:-translate-y-1/2 after:-mr-[2px] after:border-t-[5.5px] after:border-b-[5.5px] after:border-r-[5.5px] after:border-t-transparent after:border-b-transparent after:border-r-white":
                  side === "right",

                // Left side: arrow points right to tooltip
                "before:left-full before:top-1/2 before:-translate-y-1/2 before:border-t-[7px] before:border-b-[7px] before:border-l-[7px] before:border-t-transparent before:border-b-transparent before:border-l-black":
                  side === "left",
                "after:left-full after:top-1/2 after:-translate-y-1/2 after:-ml-[2px] after:border-t-[5.5px] after:border-b-[5.5px] after:border-l-[5.5px] after:border-t-transparent after:border-b-transparent after:border-l-white":
                  side === "left",
              },
              className,
            )}
          >
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
