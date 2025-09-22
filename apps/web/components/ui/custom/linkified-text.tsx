"use client"

import React from "react"
import Linkify from "linkify-react"
import { useAtomValue } from "jotai"
import { settingsAtom } from "@/lib/atoms"

interface LinkifiedTextProps {
  children: React.ReactNode
  className?: string
  as?: React.ElementType
  [key: string]: unknown // Allow other props to be passed through
}

export function LinkifiedText({
  children,
  className,
  as: Component = "span",
  ...props
}: LinkifiedTextProps) {
  const settings = useAtomValue(settingsAtom)
  const linkifyEnabled = settings.general.linkifyEnabled

  // If linkification is disabled, render as normal component
  if (!linkifyEnabled) {
    return (
      <Component className={className} {...props}>
        {children}
      </Component>
    )
  }

  // Linkify options
  const linkifyOptions = {
    target: "_blank",
    rel: "noopener noreferrer",
    defaultProtocol: "https",
    className:
      "underline decoration-1 underline-offset-2 hover:decoration-2 transition-all duration-150",
  }

  return (
    <Component className={className} {...props}>
      <Linkify options={linkifyOptions}>{children}</Linkify>
    </Component>
  )
}
