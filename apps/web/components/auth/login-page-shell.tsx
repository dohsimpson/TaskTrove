import type { PropsWithChildren } from "react"

export function LoginPageShell({ children }: PropsWithChildren) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 bg-muted bg-center bg-no-repeat p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
      <div className="relative z-10 flex w-full max-w-sm flex-col gap-6 sm:max-w-md">
        {children}
      </div>
    </div>
  )
}
