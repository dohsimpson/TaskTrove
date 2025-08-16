import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    if (mql && typeof mql.addEventListener === "function") {
      try {
        mql.addEventListener("change", onChange)
        setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
        return () => {
          try {
            if (typeof mql.removeEventListener === "function") {
              mql.removeEventListener("change", onChange)
            }
          } catch {
            // Ignore cleanup errors - already unmounting
          }
        }
      } catch {
        // Fallback: Set initial value even if addEventListener fails
        setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
      }
    } else {
      // Fallback: Set initial value even if we can't listen for changes
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
  }, [])

  return !!isMobile
}
