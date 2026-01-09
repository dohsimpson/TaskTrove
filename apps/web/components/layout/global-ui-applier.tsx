"use client"

import { useEffect } from "react"
import { useAtomValue } from "jotai"
import { globalViewOptionsAtom } from "@tasktrove/atoms/ui/views"

const HIDE_SCROLLBAR_ATTRIBUTE = "data-hide-scrollbar"

export function GlobalUiApplier(): null {
  const globalViewOptions = useAtomValue(globalViewOptionsAtom)

  useEffect(() => {
    const root = document.documentElement

    if (globalViewOptions.hideScrollBar) {
      root.setAttribute(HIDE_SCROLLBAR_ATTRIBUTE, "true")
    } else {
      root.removeAttribute(HIDE_SCROLLBAR_ATTRIBUTE)
    }

    return () => {
      root.removeAttribute(HIDE_SCROLLBAR_ATTRIBUTE)
    }
  }, [globalViewOptions.hideScrollBar])

  return null
}
