// Lightweight event bus for broadcasting the current innermost active drop target
// during a drag session so other targets can clear stale indicators.

export type ActiveTargetDetail = {
  token: string
  element: Element | null
}

const et = new EventTarget()
let currentToken: string | null = null
let windowListenersAttached = false

function genToken() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function attachWindowEndListeners() {
  if (typeof window === "undefined" || windowListenersAttached) return
  const end = () => {
    currentToken = null
  }
  window.addEventListener("dragend", end)
  window.addEventListener("drop", end)
  windowListenersAttached = true
}

export function beginDragIfNeeded(): string {
  if (!currentToken) currentToken = genToken()
  attachWindowEndListeners()
  return currentToken
}

export function broadcastActiveTarget(element: Element | null) {
  const token = beginDragIfNeeded()
  const event = new CustomEvent<ActiveTargetDetail>("tt:dnd:active-target", {
    detail: { token, element },
  })
  et.dispatchEvent(event)
}

export function subscribeActiveTarget(listener: (detail: ActiveTargetDetail) => void): () => void {
  const handler = (evt: Event) => {
    // Type guard to check if this is our custom event with the expected detail structure
    if (
      evt.type === "tt:dnd:active-target" &&
      "detail" in evt &&
      typeof evt.detail === "object" &&
      evt.detail !== null &&
      "token" in evt.detail &&
      "element" in evt.detail
    ) {
      // Type assertion is safe here after the type guard checks
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const detail = evt.detail as ActiveTargetDetail
      // Only events for the current token are relevant
      if (!currentToken || detail.token !== currentToken) return
      listener(detail)
    }
  }
  et.addEventListener("tt:dnd:active-target", handler)
  return () => et.removeEventListener("tt:dnd:active-target", handler)
}
