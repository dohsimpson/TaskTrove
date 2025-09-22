"use client"

import type React from "react"
import { useState } from "react"
import { Zap } from "lucide-react"
// import { ComingSoonTooltip } from "@/components/ui/coming-soon-tooltip"
import { ComingSoonModal } from "@/components/ui/coming-soon-modal"
import { cn } from "@/lib/utils"

interface ModalCustomization {
  title?: string
  description?: React.ReactNode
  buttonText?: string
  successTitle?: string
  successMessage?: string
  footerText?: string
}

interface ComingSoonWrapperProps {
  children: React.ReactNode
  tooltipContent?: React.ReactNode
  featureName?: string
  className?: string
  disabled?: boolean
  modalProps?: ModalCustomization
  tooltipSide?: "top" | "bottom" | "left" | "right"
  hideLightningIcon?: boolean
}

export function ComingSoonWrapper({
  children,
  // tooltipContent = "Coming soon!",
  featureName = "this feature",
  className,
  disabled = false,
  modalProps,
  // tooltipSide = "top",
  hideLightningIcon = false,
}: ComingSoonWrapperProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  if (!disabled) {
    return <>{children}</>
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsModalOpen(true)
  }

  return (
    <>
      {/* <ComingSoonTooltip
        content={tooltipContent}
        side={tooltipSide}
        className="animate-[wiggle_0.8s_linear_infinite,rainbow-glow_2s_linear_infinite]"
      > */}
      <div
        className={cn("relative cursor-pointer", className)}
        style={{ overflow: "visible" }}
        data-testid="tooltip-wrapper"
        onClick={handleClick}
      >
        {children}
        {!hideLightningIcon && (
          <Zap
            className="absolute -top-1 -right-1 h-3 w-3 text-yellow-500 animate-pulse"
            data-testid="lightning-icon"
          />
        )}
      </div>
      {/* </ComingSoonTooltip> */}

      <ComingSoonModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        featureName={featureName}
        {...modalProps}
      />
    </>
  )
}
