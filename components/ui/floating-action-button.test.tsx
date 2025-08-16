import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@/test-utils"
import { FloatingActionButton, TaskTroveFAB } from "./floating-action-button"
import { Edit, Calendar } from "lucide-react"
import { getButtonElement } from "@/lib/utils/type-safe-dom"

describe("FloatingActionButton", () => {
  const mockActions = [
    {
      id: "action1",
      label: "First Action",
      icon: <Edit className="h-5 w-5" />,
      onClick: vi.fn(),
    },
    {
      id: "action2",
      label: "Second Action",
      icon: <Calendar className="h-5 w-5" />,
      onClick: vi.fn(),
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders main FAB button", () => {
    const { container } = render(<FloatingActionButton actions={mockActions} />)

    // Main button should exist (the blue one)
    const mainButton = container.querySelector(".bg-blue-600")
    expect(mainButton).toBeInTheDocument()

    // Check for Plus icon in the main button
    const plusIcon = container.querySelector("svg.lucide-plus")
    expect(plusIcon).toBeInTheDocument()

    // Action buttons exist but are hidden initially
    const actionContainer = container.querySelector(".opacity-0")
    expect(actionContainer).toBeInTheDocument()
  })

  it("shows Plus icon when closed", () => {
    const { container } = render(<FloatingActionButton actions={mockActions} />)

    // Get the main button (it's the one with the blue background)
    const mainButton = container.querySelector(".bg-blue-600")
    expect(mainButton).toBeInTheDocument()
    expect(mainButton).not.toHaveClass("rotate-45") // Should not have rotate class when closed

    // Check Plus icon is visible
    const plusIcon = container.querySelector("svg.lucide-plus")
    expect(plusIcon).toBeInTheDocument()
  })

  it("toggles open state when main button is clicked", () => {
    const { container } = render(<FloatingActionButton actions={mockActions} />)

    const mainButton = getButtonElement(container.querySelector(".bg-blue-600"))

    // Initially closed - action container should have opacity-0
    expect(container.querySelector(".opacity-0")).toBeInTheDocument()

    // Click to open
    act(() => {
      expect(mainButton).toBeTruthy()
      mainButton?.click()
    })

    // Should now show action labels (container should have opacity-100)
    expect(container.querySelector(".opacity-100")).toBeInTheDocument()
    expect(screen.getByText("First Action")).toBeInTheDocument()
    expect(screen.getByText("Second Action")).toBeInTheDocument()
  })

  it("shows rotation when open", () => {
    const { container } = render(<FloatingActionButton actions={mockActions} />)

    const mainButton = getButtonElement(container.querySelector(".bg-blue-600"))

    act(() => {
      expect(mainButton).toBeTruthy()
      mainButton?.click()
    })

    expect(mainButton).toHaveClass("rotate-45")
  })

  it("renders action buttons when open", () => {
    const { container } = render(<FloatingActionButton actions={mockActions} />)

    const mainButton = getButtonElement(container.querySelector(".bg-blue-600"))

    act(() => {
      expect(mainButton).toBeTruthy()
      mainButton?.click()
    })

    // Check that action labels are visible when opened
    expect(screen.getByText("First Action")).toBeInTheDocument()
    expect(screen.getByText("Second Action")).toBeInTheDocument()

    // Check that action container is now visible
    expect(container.querySelector(".opacity-100")).toBeInTheDocument()
  })

  it("calls action onClick when action button is clicked", () => {
    const { container } = render(<FloatingActionButton actions={mockActions} />)

    const mainButton = getButtonElement(container.querySelector(".bg-blue-600"))

    act(() => {
      expect(mainButton).toBeTruthy()
      mainButton?.click()
    })

    // Get all buttons (action buttons + main button)
    const allButtons = container.querySelectorAll("button")
    // Find the first action button (not the main one)
    const firstActionButton = Array.from(allButtons).find(
      (btn) => !btn.classList.contains("bg-blue-600"),
    )

    act(() => {
      firstActionButton?.click()
    })

    expect(mockActions[0].onClick).toHaveBeenCalledOnce()
  })

  it("closes FAB when action button is clicked", () => {
    const { container } = render(<FloatingActionButton actions={mockActions} />)

    const mainButton = getButtonElement(container.querySelector(".bg-blue-600"))

    act(() => {
      expect(mainButton).toBeTruthy()
      mainButton?.click()
    })

    // Should be open
    expect(screen.getByText("First Action")).toBeInTheDocument()
    expect(mainButton).toHaveClass("rotate-45")

    // Get action button and click it
    const allButtons = container.querySelectorAll("button")
    const firstActionButton = Array.from(allButtons).find(
      (btn) => !btn.classList.contains("bg-blue-600"),
    )

    act(() => {
      firstActionButton?.click()
    })

    // Should close - check that main button no longer has rotate class
    expect(mainButton).not.toHaveClass("rotate-45")
    expect(container.querySelector(".opacity-0")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(
      <FloatingActionButton actions={mockActions} className="custom-class" />,
    )

    const fabContainer = container.querySelector(".custom-class")
    expect(fabContainer).toBeInTheDocument()
  })

  it("handles empty actions array", () => {
    const { container } = render(<FloatingActionButton actions={[]} />)

    const mainButton = getButtonElement(container.querySelector(".bg-blue-600"))
    expect(mainButton).toBeInTheDocument()

    // Should still be able to click main button
    act(() => {
      expect(mainButton).toBeTruthy()
      mainButton?.click()
    })
    expect(mainButton).toHaveClass("rotate-45")
  })
})

describe("TaskTroveFAB", () => {
  const mockProps = {
    onQuickAdd: vi.fn(),
    onVoiceAdd: vi.fn(),
    onSchedule: vi.fn(),
    onStartTimer: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders with TaskTrove specific actions", () => {
    const { container } = render(<TaskTroveFAB {...mockProps} />)

    const mainButton = getButtonElement(container.querySelector(".bg-blue-600"))

    act(() => {
      expect(mainButton).toBeTruthy()
      mainButton?.click()
    })

    expect(screen.getByText("Quick Add")).toBeInTheDocument()
    expect(screen.getByText("Voice Input")).toBeInTheDocument()
    expect(screen.getByText("Schedule")).toBeInTheDocument()
    expect(screen.getByText("Start Timer")).toBeInTheDocument()
  })

  it("calls correct handlers when actions are clicked", () => {
    const { container } = render(<TaskTroveFAB {...mockProps} />)

    const mainButton = getButtonElement(container.querySelector(".bg-blue-600"))

    // Test Quick Add
    act(() => {
      expect(mainButton).toBeTruthy()
      mainButton?.click()
    })

    const allButtons = container.querySelectorAll("button")
    const actionButtons = Array.from(allButtons).filter(
      (btn) => !btn.classList.contains("bg-blue-600"),
    )

    // Click first action (Quick Add)
    act(() => {
      actionButtons[0]?.click()
    })
    expect(mockProps.onQuickAdd).toHaveBeenCalledOnce()

    // Test Voice Input - need to reopen
    act(() => {
      expect(mainButton).toBeTruthy()
      mainButton?.click()
    })
    act(() => {
      actionButtons[1]?.click()
    })
    expect(mockProps.onVoiceAdd).toHaveBeenCalledOnce()

    // Test Schedule - need to reopen
    act(() => {
      expect(mainButton).toBeTruthy()
      mainButton?.click()
    })
    act(() => {
      actionButtons[2]?.click()
    })
    expect(mockProps.onSchedule).toHaveBeenCalledOnce()

    // Test Start Timer - need to reopen
    act(() => {
      expect(mainButton).toBeTruthy()
      mainButton?.click()
    })
    act(() => {
      actionButtons[3]?.click()
    })
    expect(mockProps.onStartTimer).toHaveBeenCalledOnce()
  })

  it("renders correct icons for each action", () => {
    const { container } = render(<TaskTroveFAB {...mockProps} />)

    const mainButton = getButtonElement(container.querySelector(".bg-blue-600"))

    act(() => {
      expect(mainButton).toBeTruthy()
      mainButton?.click()
    })

    // Check that specific icons are rendered
    expect(container.querySelector("svg.lucide-square-pen")).toBeInTheDocument() // Edit icon
    expect(container.querySelector("svg.lucide-mic")).toBeInTheDocument() // Mic icon
    expect(container.querySelector("svg.lucide-calendar")).toBeInTheDocument() // Calendar icon
    expect(container.querySelector("svg.lucide-timer")).toBeInTheDocument() // Timer icon
  })

  it("has cursor-pointer styling on main FAB and action buttons", () => {
    const { container } = render(<TaskTroveFAB {...mockProps} />)

    // Test main FAB button
    const mainButton = getButtonElement(container.querySelector(".bg-blue-600"))
    expect(mainButton).toHaveClass("cursor-pointer")

    // Open to test action buttons
    act(() => {
      expect(mainButton).toBeTruthy()
      mainButton?.click()
    })

    // Test action buttons
    const allButtons = container.querySelectorAll("button")
    const actionButtons = Array.from(allButtons).filter(
      (btn) => !btn.classList.contains("bg-blue-600") && btn.classList.contains("h-12"),
    )

    actionButtons.forEach((button) => {
      expect(button).toHaveClass("cursor-pointer")
    })
  })
})
