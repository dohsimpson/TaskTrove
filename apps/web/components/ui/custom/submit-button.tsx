"use client"

import React, { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { LoaderCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SubmitButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "type"> {
  /** Async function to execute when button is clicked */
  onSubmit?: () => Promise<void> | void
  /** Whether the button should be disabled (in addition to submitting) */
  disabled?: boolean
  /** Text to show when not submitting */
  children: React.ReactNode
  /** Text to show when submitting (defaults to children with "..." suffix) */
  submittingText?: React.ReactNode
  /** Icon to show when submitting (defaults to LoaderCircle) */
  loadingIcon?: React.ReactNode
  /** Size of the loading icon */
  loadingIconSize?: "sm" | "md" | "lg"
  /** Whether to hide the loading icon */
  hideLoadingIcon?: boolean
  /** Button variant */
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  /** Button size */
  size?: "default" | "sm" | "lg" | "icon"
  /** Whether to prevent default form submission */
  preventDefault?: boolean
  /** Ref for the underlying button element */
  ref?: React.Ref<HTMLButtonElement>
}

export function SubmitButton({
  onSubmit,
  disabled = false,
  children,
  submittingText,
  loadingIcon,
  loadingIconSize = "sm",
  hideLoadingIcon = false,
  variant = "default",
  size = "default",
  className,
  preventDefault = true,
  ref,
  ...props
}: SubmitButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }

  const iconSpacing = {
    sm: "mr-1",
    md: "mr-2",
    lg: "mr-2",
  }

  const defaultLoadingIcon = (
    <LoaderCircle
      className={cn(iconSizes[loadingIconSize], "animate-spin", iconSpacing[loadingIconSize])}
    />
  )

  const loadingContent = (
    <>
      {!hideLoadingIcon && (loadingIcon || defaultLoadingIcon)}
      {submittingText || (typeof children === "string" ? `${children}...` : children)}
    </>
  )

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isSubmitting || disabled) return

      if (preventDefault) {
        e.preventDefault()
      }

      if (onSubmit) {
        setIsSubmitting(true)
        try {
          await onSubmit()
        } catch (error) {
          console.error("SubmitButton error:", error)
        } finally {
          setIsSubmitting(false)
        }
      }
    },
    [isSubmitting, disabled, onSubmit, preventDefault],
  )

  return (
    <Button
      type={preventDefault ? "button" : "submit"}
      variant={variant}
      size={size}
      disabled={disabled || isSubmitting}
      className={cn(className)}
      onClick={handleClick}
      ref={ref}
      {...props}
    >
      {isSubmitting ? loadingContent : children}
    </Button>
  )
}
