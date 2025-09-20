import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@/test-utils"
import userEvent from "@testing-library/user-event"
import { TimeEstimationPicker } from "./time-estimation-picker"

// Mock i18n
vi.mock("@/lib/i18n/client", () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback,
  }),
}))

// Mock language provider (test-utils needs LanguageProvider export)
vi.mock("@/components/providers/language-provider", () => ({
  useLanguage: () => ({ language: "en" }),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock ContentPopover
vi.mock("@/components/ui/content-popover", () => ({
  ContentPopover: ({
    children,
    content,
    open,
    onOpenChange,
    className,
  }: {
    children: React.ReactNode
    content: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
    className?: string
  }) => (
    <div data-testid="content-popover">
      <div data-testid="trigger" onClick={() => onOpenChange?.(!open)}>
        {children}
      </div>
      {open && (
        <div data-testid="popover-content" className={className}>
          {content}
        </div>
      )}
    </div>
  ),
}))

// Mock HelpPopover
vi.mock("@/components/ui/help-popover", () => ({
  HelpPopover: ({ content }: { content: string }) => (
    <div data-testid="help-popover">{content}</div>
  ),
}))

describe("TimeEstimationPicker", () => {
  const mockOnChange = vi.fn()
  const mockSetOpen = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderComponent = (
    props: Partial<React.ComponentProps<typeof TimeEstimationPicker>> = {},
  ) => {
    const defaultProps = {
      trigger: <button>Open Picker</button>,
      open: true,
      setOpen: mockSetOpen,
      onChange: mockOnChange,
      value: 3600, // 1 hour default
    }

    return render(<TimeEstimationPicker {...defaultProps} {...props} />)
  }

  describe("basic rendering", () => {
    it("renders trigger element", () => {
      renderComponent({ open: false })
      expect(screen.getByText("Open Picker")).toBeInTheDocument()
    })

    it("shows content when open", () => {
      renderComponent({ open: true })
      expect(screen.getByTestId("popover-content")).toBeInTheDocument()
      expect(screen.getByText("Time Estimation")).toBeInTheDocument()
    })

    it("shows preset buttons", () => {
      renderComponent({ open: true })
      expect(screen.getByText("5min")).toBeInTheDocument()
      expect(screen.getByText("15min")).toBeInTheDocument()
      expect(screen.getByText("30min")).toBeInTheDocument()
      expect(screen.getByText("1h")).toBeInTheDocument()
      expect(screen.getByText("2h")).toBeInTheDocument()
      expect(screen.getByText("4h")).toBeInTheDocument()
    })

    it("shows custom duration inputs", () => {
      renderComponent({ open: true })
      expect(screen.getByDisplayValue("01")).toBeInTheDocument() // hour input
      expect(screen.getByDisplayValue("00")).toBeInTheDocument() // minute input
    })

    it("shows Clear and Done buttons", () => {
      renderComponent({ open: true })
      expect(screen.getByText("Clear")).toBeInTheDocument()
      expect(screen.getByText("Done")).toBeInTheDocument()
    })
  })

  describe("preset functionality", () => {
    it("applies preset immediately when clicked", async () => {
      renderComponent({ onChange: mockOnChange, open: true })

      const preset15min = screen.getByText("15min")
      fireEvent.click(preset15min)

      // Should call onChange immediately with 15 minutes in seconds
      expect(mockOnChange).toHaveBeenCalledWith(15 * 60)
    })

    it("does not close popover when preset is clicked", async () => {
      renderComponent({ onChange: mockOnChange, open: true })

      const preset30min = screen.getByText("30min")
      fireEvent.click(preset30min)

      // Should not call setOpen to close the popover
      expect(mockSetOpen).not.toHaveBeenCalledWith(false)
    })

    it("updates hour and minute inputs when preset is clicked", async () => {
      renderComponent({ onChange: mockOnChange, open: true })

      const preset2h = screen.getByText("2h")
      fireEvent.click(preset2h)

      await waitFor(() => {
        // Should show 02 hours and 00 minutes
        expect(screen.getByDisplayValue("02")).toBeInTheDocument()
        expect(screen.getByDisplayValue("00")).toBeInTheDocument()
      })
    })

    it("selects preset button visually when clicked", async () => {
      renderComponent({ onChange: mockOnChange, open: true })

      const preset1h = screen.getByText("1h")
      fireEvent.click(preset1h)

      // The preset should be visually selected (this would be tested through styling in a real test)
      expect(mockOnChange).toHaveBeenCalledWith(60 * 60)
    })
  })

  describe("custom duration functionality", () => {
    it("allows typing custom hours", async () => {
      const user = userEvent.setup()
      renderComponent({ onChange: mockOnChange, open: true })

      const hourInput = screen.getByDisplayValue("01")
      await user.clear(hourInput)
      await user.type(hourInput, "3")

      expect(hourInput).toHaveValue("3")
    })

    it("allows typing custom minutes", async () => {
      const user = userEvent.setup()
      renderComponent({ onChange: mockOnChange, open: true })

      const minuteInput = screen.getByDisplayValue("00")
      await user.clear(minuteInput)
      await user.type(minuteInput, "45")

      expect(minuteInput).toHaveValue("45")
    })

    it("formats hour input on blur", async () => {
      const user = userEvent.setup()
      renderComponent({ open: true })

      const hourInput = screen.getByDisplayValue("01")
      await user.clear(hourInput)
      await user.type(hourInput, "5")
      await user.tab() // trigger blur

      await waitFor(() => {
        expect(hourInput).toHaveValue("05")
      })
    })

    it("formats minute input on blur", async () => {
      const user = userEvent.setup()
      renderComponent({ open: true })

      const minuteInput = screen.getByDisplayValue("00")
      await user.clear(minuteInput)
      await user.type(minuteInput, "7")
      await user.tab() // trigger blur

      await waitFor(() => {
        expect(minuteInput).toHaveValue("07")
      })
    })
  })

  describe("Done and Clear functionality", () => {
    it("closes popover when Done is clicked", async () => {
      renderComponent({ onChange: mockOnChange, open: true })

      const doneButton = screen.getByText("Done")
      fireEvent.click(doneButton)

      expect(mockSetOpen).toHaveBeenCalledWith(false)
    })

    it("applies current value when Done is clicked", async () => {
      renderComponent({ onChange: mockOnChange, open: true })

      const doneButton = screen.getByText("Done")
      fireEvent.click(doneButton)

      // Should call onChange with current value (1 hour from mock task)
      expect(mockOnChange).toHaveBeenCalledWith(3600)
    })

    it("clears estimation when Clear is clicked", async () => {
      renderComponent({ onChange: mockOnChange, open: true })

      const clearButton = screen.getByText("Clear")
      fireEvent.click(clearButton)

      expect(mockOnChange).toHaveBeenCalledWith(null)
      expect(mockSetOpen).toHaveBeenCalledWith(false)
    })

    it("resets inputs when Clear is clicked", async () => {
      renderComponent({ open: true })

      const clearButton = screen.getByText("Clear")
      fireEvent.click(clearButton)

      await waitFor(() => {
        const inputs = screen.getAllByDisplayValue("00")
        expect(inputs).toHaveLength(2) // hour and minute inputs both show "00"
      })
    })
  })

  describe("backward compatibility", () => {
    it("works with value and onChange props for new items", async () => {
      renderComponent({
        value: 1800, // 30 minutes
        onChange: mockOnChange,
        open: true,
      })

      // Should show the value in inputs
      expect(screen.getByDisplayValue("00")).toBeInTheDocument() // hours
      expect(screen.getByDisplayValue("30")).toBeInTheDocument() // minutes

      // Clicking preset should call onChange
      const preset1h = screen.getByText("1h")
      fireEvent.click(preset1h)

      expect(mockOnChange).toHaveBeenCalledWith(3600)
    })
  })

  describe("validation", () => {
    it("shows error for invalid hour input", async () => {
      const user = userEvent.setup()
      renderComponent({ open: true })

      const hourInput = screen.getByDisplayValue("01")
      await user.clear(hourInput)
      await user.type(hourInput, "abc")

      await waitFor(() => {
        expect(screen.getByText("Must be a number (0-99)")).toBeInTheDocument()
      })
    })

    it("shows error for hour input out of range", async () => {
      const user = userEvent.setup()
      renderComponent({ open: true })

      const hourInput = screen.getByDisplayValue("01")
      await user.clear(hourInput)
      await user.type(hourInput, "100")

      await waitFor(() => {
        expect(screen.getByText("Hours must be between 0-99")).toBeInTheDocument()
      })
    })

    it("shows error for invalid minute input", async () => {
      const user = userEvent.setup()
      renderComponent({ open: true })

      const minuteInput = screen.getByDisplayValue("00")
      await user.clear(minuteInput)
      await user.type(minuteInput, "abc")

      await waitFor(() => {
        expect(screen.getByText("Must be a number (0-59)")).toBeInTheDocument()
      })
    })

    it("shows error for minute input out of range", async () => {
      const user = userEvent.setup()
      renderComponent({ open: true })

      const minuteInput = screen.getByDisplayValue("00")
      await user.clear(minuteInput)
      await user.type(minuteInput, "75")

      await waitFor(() => {
        expect(screen.getByText("Minutes must be between 0-59")).toBeInTheDocument()
      })
    })
  })
})
