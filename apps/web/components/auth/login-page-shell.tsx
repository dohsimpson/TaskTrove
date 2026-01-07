import type { CSSProperties, PropsWithChildren } from "react"
import { cn } from "@/lib/utils"

interface LoginPageShellProps {
  className?: string
  style?: CSSProperties
}

export function LoginPageShell({
  children,
  className,
  style,
}: PropsWithChildren<LoginPageShellProps>) {
  return (
    <div
      className={cn(
        "relative flex min-h-svh flex-col items-center justify-center gap-6 bg-muted bg-center bg-no-repeat p-4 sm:p-6",
        className,
      )}
      style={style}
    >
      <div className="relative z-10 flex w-full max-w-sm flex-col gap-6 sm:max-w-md">
        {children}
      </div>
    </div>
  )
}
