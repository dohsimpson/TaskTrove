"use client"

import React, { forwardRef } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"

type Props = {
  icon: React.ReactNode
  label: React.ReactNode
  display?: React.ReactNode
  className?: string
  ariaLabel?: string
  maxLabelWidthClass?: string // e.g. max-w-[12rem]
} & React.ComponentProps<typeof Button>

export const PillActionButton = forwardRef<HTMLButtonElement, Props>(
  (
    { icon, label, display, className, ariaLabel, maxLabelWidthClass = "max-w-[6rem]", ...rest },
    ref,
  ) => {
    const isMobile = useIsMobile()
    return (
      <Button
        ref={ref}
        variant="outline"
        size="sm"
        aria-label={
          typeof ariaLabel === "string" ? ariaLabel : typeof label === "string" ? label : undefined
        }
        className={cn(
          "group h-9 px-3 gap-2 rounded-xl ring-1 ring-white/15 bg-white/5 hover:bg-white/10 text-xs sm:text-sm",
          className,
        )}
        {...rest}
      >
        {icon}
        {display ? (
          <span className={cn("whitespace-nowrap truncate", maxLabelWidthClass)}>{display}</span>
        ) : !isMobile ? (
          <span className={cn("whitespace-nowrap truncate", maxLabelWidthClass)}>{label}</span>
        ) : null}
      </Button>
    )
  },
)

PillActionButton.displayName = "PillActionButton"
