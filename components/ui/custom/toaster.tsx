"use client"

import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import type { ComponentProps } from "react"

type ToasterProps = ComponentProps<typeof SonnerToaster>

export function Toaster({ ...props }: ToasterProps) {
  return (
    <SonnerToaster
      expand
      visibleToasts={5}
      {...props}
      style={{
        zIndex: 100,
        ...props.style,
      }}
    />
  )
}
