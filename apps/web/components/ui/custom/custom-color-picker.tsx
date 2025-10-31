"use client"

import { StubIndicator } from "@/components/debug/stub-indicator"

interface CustomColorPickerProps {
  value: string
  onChange: (hex: string) => void
  onClear?: () => void
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function CustomColorPicker(_props: CustomColorPickerProps) {
  return <StubIndicator />
}
