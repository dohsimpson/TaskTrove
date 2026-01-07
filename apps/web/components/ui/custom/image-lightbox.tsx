"use client"

import React from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface ImageLightboxProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  src?: string | null
  alt: string
  emptyState?: React.ReactNode
}

export function ImageLightbox({
  open,
  onOpenChange,
  title,
  src,
  alt,
  emptyState,
}: ImageLightboxProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title ?? "Image"}</DialogTitle>
        </DialogHeader>
        {src ? (
          <div className="relative h-[70vh] w-full rounded-lg border border-border/60 bg-background">
            <Image
              src={src}
              alt={alt}
              fill
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-contain"
              unoptimized
            />
          </div>
        ) : (
          emptyState
        )}
      </DialogContent>
    </Dialog>
  )
}
