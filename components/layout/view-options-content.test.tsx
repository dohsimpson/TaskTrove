import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { Provider } from "jotai"
import { mockUseToast, mockNextThemes } from "@/test-utils"
import { ViewOptionsContent } from "./view-options-content"

// Mock next-themes
mockNextThemes()

// Mock toast hook
mockUseToast()

// Mock utils
vi.mock("@/lib/utils", () => ({
  cn: vi.fn((...classes) => classes.filter(Boolean).join(" ")),
}))

// Define mock component interfaces - same as in view-options-popover.test.tsx
interface MockButtonProps {
  children?: React.ReactNode
  onClick?: () => void
  variant?: string
  size?: string
  className?: string
  disabled?: boolean
  title?: string
  [key: string]: unknown
}

interface MockSwitchProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  id?: string
  [key: string]: unknown
}

interface MockSelectProps {
  value?: string
  children?: React.ReactNode
  [key: string]: unknown
}

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, ...props }: MockButtonProps) => (
    <button data-testid="button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
}))

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <label data-testid="label" {...props}>
      {children}
    </label>
  ),
}))

vi.mock("@/components/ui/switch", () => ({
  Switch: ({ checked, onCheckedChange, ...props }: MockSwitchProps) => (
    <input
      data-testid="switch"
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      {...props}
    />
  ),
}))

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr data-testid="separator" />,
}))

vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value }: MockSelectProps) => (
    <div data-testid="select" data-value={value}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({ children, value }: { children?: React.ReactNode; value?: string }) => (
    <div data-testid="select-item" data-value={value}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <div data-testid="select-trigger" className={className}>
      {children}
    </div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <div data-testid="select-value">{placeholder}</div>
  ),
}))

vi.mock("@/components/ui/help-popover", () => ({
  HelpPopover: ({ title, content }: { title?: string; content?: React.ReactNode }) => (
    <div data-testid="help-popover" data-title={title}>
      {content}
    </div>
  ),
}))

vi.mock("@/components/ui/coming-soon-wrapper", () => ({
  ComingSoonWrapper: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="coming-soon-wrapper">{children}</div>
  ),
}))

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="tooltip-provider">{children}</div>
  ),
  Tooltip: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="tooltip">{children}</div>
  ),
  TooltipTrigger: ({ children }: { children?: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="tooltip-trigger">{children}</div>
  ),
  TooltipContent: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}))

// Mock Lucide icons
vi.mock("lucide-react", () => ({
  Settings2: () => <div data-testid="settings2-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  ArrowUpNarrowWide: () => <div data-testid="arrow-up-icon" />,
  ArrowDownWideNarrow: () => <div data-testid="arrow-down-icon" />,
  Columns3: () => <div data-testid="columns3-icon" />,
  ListTodo: () => <div data-testid="list-todo-icon" />,
  SidebarOpen: () => <div data-testid="sidebar-open-icon" />,
  Minimize2: () => <div data-testid="minimize2-icon" />,
  CheckSquare: () => <div data-testid="check-square-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
}))

// Mock atoms
const mockAtoms = {
  currentViewAtom: "inbox",
  currentViewStateAtom: {
    viewMode: "list",
    sortBy: "default",
    sortDirection: "asc",
    showCompleted: false,
    showOverdue: true,
    searchQuery: "",
    showSidePanel: false,
    compactView: false,
    activeFilters: [],
    collapsedSections: [],
  },
  showTaskPanelAtom: false,
  setViewOptionsAtom: { debugLabel: "setViewOptionsAtom" },
  currentRouteContextAtom: {
    pathname: "/inbox",
    routeType: "view",
    projectId: null,
    labelId: null,
  },
}

vi.mock("jotai", async () => {
  const actual = await vi.importActual("jotai")
  return {
    ...actual,
    useAtomValue: vi.fn((atom) => {
      const atomStr = atom.toString()
      if (atomStr.includes("currentViewAtom")) return mockAtoms.currentViewAtom
      if (atomStr.includes("currentViewStateAtom")) return mockAtoms.currentViewStateAtom
      if (atomStr.includes("showTaskPanelAtom")) return mockAtoms.showTaskPanelAtom
      if (atomStr.includes("currentRouteContextAtom")) return mockAtoms.currentRouteContextAtom
      return null
    }),
    useSetAtom: vi.fn((atom) => {
      if (atom === mockAtoms.setViewOptionsAtom) return vi.fn()
      return vi.fn()
    }),
  }
})

vi.mock("@/lib/constants/defaults", async () => {
  const actual = await vi.importActual("@/lib/constants/defaults")
  return {
    ...actual,
    VIEW_CONFIG_OPTIONS: {
      inbox: {
        calendarDisabled: false,
        showCompletedDisabled: false,
      },
    },
  }
})

// Helper function to render with Jotai provider
function renderWithJotai(component: React.ReactElement) {
  return render(<Provider>{component}</Provider>)
}

describe("ViewOptionsContent", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders without crashing", () => {
    renderWithJotai(<ViewOptionsContent />)
    expect(screen.getByText("View Options")).toBeInTheDocument()
  })

  it("renders all main sections", () => {
    renderWithJotai(<ViewOptionsContent />)

    expect(screen.getByText("View Mode")).toBeInTheDocument()
    expect(screen.getByText("Display Options")).toBeInTheDocument()
    expect(screen.getByText("Sort")).toBeInTheDocument()
  })

  it("renders view mode buttons", () => {
    renderWithJotai(<ViewOptionsContent />)

    expect(screen.getByText("list")).toBeInTheDocument()
    expect(screen.getByText("kanban")).toBeInTheDocument()
    expect(screen.getByText("calendar")).toBeInTheDocument()
  })

  it("renders display options switches", () => {
    renderWithJotai(<ViewOptionsContent />)

    expect(screen.getByText("Completed Tasks")).toBeInTheDocument()
    expect(screen.getByText("Overdue Tasks")).toBeInTheDocument()
    expect(screen.getByText("Side Panel")).toBeInTheDocument()
    expect(screen.getByText("Compact View")).toBeInTheDocument()

    const switches = screen.getAllByTestId("switch")
    expect(switches.length).toBeGreaterThanOrEqual(4)
  })

  it("renders sort controls", () => {
    renderWithJotai(<ViewOptionsContent />)

    expect(screen.getByText("Sort by")).toBeInTheDocument()
    expect(screen.getByTestId("select")).toBeInTheDocument()
  })

  it("renders help popovers", () => {
    renderWithJotai(<ViewOptionsContent />)

    const helpPopovers = screen.getAllByTestId("help-popover")
    expect(helpPopovers.length).toBeGreaterThanOrEqual(3) // Header, Display Options, Sort
  })

  it("passes onAdvancedSearch prop correctly", () => {
    const mockOnAdvancedSearch = vi.fn()
    renderWithJotai(<ViewOptionsContent onAdvancedSearch={mockOnAdvancedSearch} />)

    // Component should render without errors when prop is provided
    expect(screen.getByText("View Options")).toBeInTheDocument()
  })
})
