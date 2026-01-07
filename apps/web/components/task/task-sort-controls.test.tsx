import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@/test-utils"
import userEvent from "@testing-library/user-event"
import { TaskSortControls } from "./task-sort-controls"

const mockUseAtomValue = vi.fn()
const mockUseSetAtom = vi.fn()
const mockSetViewOptions = vi.fn()

vi.mock("jotai", async () => {
  const actual = await vi.importActual<typeof import("jotai")>("jotai")
  return {
    ...actual,
    useAtomValue: (atom: unknown) => mockUseAtomValue(atom),
    useSetAtom: (atom: unknown) => mockUseSetAtom(atom),
  }
})

vi.mock("@tasktrove/i18n", async () => {
  const actual = await vi.importActual<typeof import("@tasktrove/i18n")>("@tasktrove/i18n")
  const hasDefaultValue = (input: unknown): input is { defaultValue?: string } =>
    typeof input === "object" &&
    input !== null &&
    Object.prototype.hasOwnProperty.call(input, "defaultValue")
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, options?: unknown) => {
        if (typeof options === "string") return options
        if (hasDefaultValue(options)) {
          return options.defaultValue ?? key
        }
        return key
      },
    }),
  }
})

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    className,
    ...props
  }: {
    children: React.ReactNode
    className?: string
    [key: string]: unknown
  }) => (
    <button data-testid="sort-trigger" className={className} {...props}>
      {children}
    </button>
  ),
}))

vi.mock("@/components/ui/dropdown-menu", () => {
  const DropdownMenu = ({ children }: { children: React.ReactNode }) => <div>{children}</div>

  const DropdownMenuTrigger = ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
    <>{children}</>
  )

  const DropdownMenuContent = ({
    children,
  }: {
    children: React.ReactNode
    className?: string
    align?: string
  }) => <div data-testid="dropdown-content">{children}</div>

  const DropdownMenuLabel = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-label">{children}</div>
  )

  const DropdownMenuSeparator = () => <hr data-testid="dropdown-separator" />

  const DropdownMenuItem = ({
    children,
    onClick,
    className,
  }: {
    children: React.ReactNode
    onClick?: () => void
    className?: string
  }) => (
    <button type="button" data-testid="dropdown-menu-item" className={className} onClick={onClick}>
      {children}
    </button>
  )

  const RadioGroupContext = React.createContext<{ onSelect: (value: string) => void } | null>(null)

  const DropdownMenuRadioGroup = ({
    value,
    onValueChange,
    children,
  }: {
    value: string
    onValueChange: (value: string) => void
    children: React.ReactNode
  }) => (
    <RadioGroupContext.Provider value={{ onSelect: onValueChange }}>
      <div data-testid="dropdown-radio-group" data-value={value}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  )

  const DropdownMenuRadioItem = ({
    children,
    value,
  }: {
    children: React.ReactNode
    value: string
  }) => {
    const ctx = React.useContext(RadioGroupContext)
    return (
      <button
        type="button"
        data-testid={`dropdown-radio-item-${value}`}
        onClick={() => ctx?.onSelect(value)}
      >
        {children}
      </button>
    )
  }

  return {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
  }
})

vi.mock("lucide-react", () => ({
  ArrowUpDown: () => <svg data-testid="arrow-up-down-icon" />,
  ArrowUpNarrowWide: () => <svg data-testid="arrow-up-icon" />,
  ArrowDownWideNarrow: () => <svg data-testid="arrow-down-icon" />,
}))

describe("TaskSortControls", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSetViewOptions.mockReset()
    mockUseAtomValue.mockReturnValue({
      sortBy: "default",
      sortDirection: "asc",
    })
    mockUseSetAtom.mockReturnValue(mockSetViewOptions)
  })

  it("renders icon trigger without indicator for default sort", () => {
    render(<TaskSortControls />)

    const trigger = screen.getByTestId("sort-trigger")
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveAttribute("aria-label", "Sort")
    expect(screen.queryByTestId("sort-indicator-dot")).not.toBeInTheDocument()
  })

  it("applies custom className to the trigger", () => {
    render(<TaskSortControls className="custom-class" />)

    const trigger = screen.getByTestId("sort-trigger")
    expect(trigger).toHaveClass("custom-class")
  })

  it("shows indicator dot when sort order is customized", () => {
    mockUseAtomValue.mockReturnValue({
      sortBy: "priority",
      sortDirection: "asc",
    })

    render(<TaskSortControls />)

    expect(screen.getByTestId("sort-indicator-dot")).toBeInTheDocument()
  })

  it("shows indicator dot when direction is descending", () => {
    mockUseAtomValue.mockReturnValue({
      sortBy: "default",
      sortDirection: "desc",
    })

    render(<TaskSortControls />)

    expect(screen.getByTestId("sort-indicator-dot")).toBeInTheDocument()
  })

  it("updates sort field when a new option is selected", async () => {
    const user = userEvent.setup()
    render(<TaskSortControls />)

    await user.click(screen.getByTestId("dropdown-radio-item-priority"))
    expect(mockSetViewOptions).toHaveBeenCalledWith({ sortBy: "priority" })
  })

  it("updates sort direction when a new option is selected", async () => {
    const user = userEvent.setup()
    render(<TaskSortControls />)

    // Find the direction toggle button (has aria-label "Sort Direction")
    const directionButton = screen.getByLabelText("Sort Direction")
    await user.click(directionButton)

    // The toggle button should call setViewOptions with sortDirection: "desc"
    expect(mockSetViewOptions).toHaveBeenCalledWith({ sortDirection: "desc" })
  })
})
