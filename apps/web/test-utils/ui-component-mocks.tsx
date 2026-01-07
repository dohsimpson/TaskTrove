/**
 * Shared UI component mock implementations for testing
 * These are mock implementations that can be used within vi.mock() calls
 * to avoid duplication across test files
 */
import React from "react"

// Common interface for component props
export interface MockContentPopoverProps {
  children: React.ReactNode
  content: React.ReactNode
  className?: string
  triggerClassName?: string
  align?: "start" | "center" | "end"
  side?: "top" | "right" | "bottom" | "left"
  onOpenChange?: (open: boolean) => void
  open?: boolean
  triggerMode?: "click" | "hover"
  openDelay?: number
  closeDelay?: number
}

export interface MockSimpleComponentProps {
  children?: React.ReactNode
  content?: React.ReactNode
}

/**
 * Shared ContentPopover mock implementation
 * Use within vi.mock() calls like: ContentPopover: mockContentPopoverComponent
 */
export const mockContentPopoverComponent = ({
  children,
  content,
  className,
  triggerClassName,
  align,
  side,
  open,
}: MockContentPopoverProps) => (
  <div data-testid="popover" data-open={open}>
    <div className={triggerClassName} data-testid="popover-trigger">
      {children}
    </div>
    <div className={className} data-align={align} data-side={side} data-testid="popover-content">
      {content}
    </div>
  </div>
)

/**
 * Shared HelpPopover mock implementation
 * Use within vi.mock() calls like: HelpPopover: mockHelpPopoverComponent
 */
export const mockHelpPopoverComponent = ({ children, content }: MockSimpleComponentProps) => (
  <div data-testid="popover">
    <div data-testid="popover-trigger">{children}</div>
    <div data-testid="popover-content">{content}</div>
  </div>
)

/**
 * Shared TimeEstimationPopover mock implementation
 * Use within vi.mock() calls like: TimeEstimationPopover: mockTimeEstimationPopoverComponent
 */
export const mockTimeEstimationPopoverComponent = ({ children }: MockSimpleComponentProps) => (
  <div data-testid="popover">
    <div data-testid="popover-trigger">{children}</div>
    <div data-testid="popover-content">Time estimation content</div>
  </div>
)

/**
 * Shared SubtaskPopover mock implementation
 * Use within vi.mock() calls like: SubtaskPopover: mockSubtaskPopoverComponent
 * NOTE: Only use when testing OTHER components that use SubtaskPopover,
 * not when testing SubtaskPopover itself
 */
export const mockSubtaskPopoverComponent = ({ children }: MockSimpleComponentProps) => (
  <div data-testid="popover">
    <div data-testid="popover-trigger">{children}</div>
    <div data-testid="popover-content">Subtask content</div>
  </div>
)

/**
 * Settings atom mock for ContentPopover
 * This provides the required general.popoverHoverOpen setting
 */
export const mockSettingsAtom = {
  general: {
    popoverHoverOpen: false,
    preferDayMonthFormat: false,
  },
  uiSettings: {},
}

/**
 * Helper function to enhance jotai useAtomValue mock with settings atom support
 * Use this in your jotai mock's useAtomValue implementation
 */
export const handleSettingsAtomInMock = (atom: unknown) => {
  const atomStr = String(atom)
  if (atomStr.includes("settings") || atomStr.includes("Settings")) {
    return mockSettingsAtom
  }
  return null // Return null if not a settings atom, let caller handle other atoms
}
