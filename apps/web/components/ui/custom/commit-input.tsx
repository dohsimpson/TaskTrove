"use client"

import { useEffect, useState } from "react"
import type { InputHTMLAttributes } from "react"
import { Input } from "@/components/ui/input"

type CommitInputProps = {
  id: string
  type: "time" | "text" | "number"
  value: string
  onCommit?: (value: string) => boolean | undefined
  commitOnChange?: boolean
  className?: string
  min?: number
  step?: number
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"]
  ariaLabel?: string
}

export function CommitInput({
  id,
  type,
  value,
  onCommit,
  commitOnChange,
  className,
  min,
  step,
  inputMode,
  ariaLabel,
}: CommitInputProps) {
  const isEditable = Boolean(onCommit)
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    setDraft(value)
  }, [value])

  const commit = (next: string) => {
    if (!onCommit) {
      return
    }
    if (next === value) return
    const result = onCommit(next)
    if (result === false) {
      setDraft(value)
    }
  }

  return (
    <Input
      id={id}
      type={type}
      min={min}
      step={step}
      inputMode={inputMode}
      value={draft}
      onChange={(event) => {
        const next = event.target.value
        setDraft(next)
        if (commitOnChange ?? true) {
          commit(next)
        }
      }}
      onBlur={() => {
        if (commitOnChange === false) {
          commit(draft)
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          commit(draft)
        }
      }}
      aria-label={ariaLabel}
      className={className}
      readOnly={!isEditable}
    />
  )
}
