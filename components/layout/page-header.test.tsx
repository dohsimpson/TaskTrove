import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}))

// Mock theme provider
vi.mock("next-themes", () => {
  const mockSetTheme = vi.fn()
  return {
    useTheme: vi.fn(() => ({
      theme: "light",
      setTheme: mockSetTheme,
      themes: ["light", "dark", "system"],
      systemTheme: "light",
      resolvedTheme: "light",
    })),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  }
})

// Mock toast hook
vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}))

// Mock help content
vi.mock("@/lib/help-content", () => ({
  getHelpContent: vi.fn(() => ({
    title: "Help Title",
    content: "Help content here",
  })),
}))

// Mock useSidebar hook
vi.mock("@/components/ui/sidebar", () => ({
  useSidebar: vi.fn(() => ({
    open: true,
    setOpen: vi.fn(),
    openMobile: false,
    setOpenMobile: vi.fn(),
    isMobile: false,
    toggleSidebar: vi.fn(),
    state: "expanded",
  })),
}))

// Mock Jotai atoms with comprehensive atom values
vi.mock("jotai", () => ({
  useAtom: vi.fn(() => [
    {
      title: "Today",
      description: "Tasks due today",
      iconType: "today",
      color: undefined,
    },
  ]),
  useAtomValue: vi.fn((atom) => {
    if (atom.debugLabel === "dynamicPageInfoAtom") {
      return {
        title: "Today",
        description: "Tasks due today",
        iconType: "today",
        color: undefined,
      }
    }
    if (atom.debugLabel === "currentRouteContextAtom") {
      return {
        pathname: "/today",
        viewId: "today",
        projectId: "view-today",
        routeType: "standard",
        routeParams: {},
      }
    }
    if (atom.debugLabel === "currentViewStateAtom") {
      return {
        viewMode: "list",
        searchQuery: "",
        sortBy: "dueDate",
        sortDirection: "asc",
        showCompleted: false,
        showSidePanel: false,
        compactView: false,
      }
    }
    if (atom.debugLabel === "tasksAtom") {
      return []
    }
    return undefined
  }),
  useSetAtom: vi.fn(() => vi.fn()),
}))

// Mock all atom modules
vi.mock("@/lib/atoms/ui/navigation", () => ({
  dynamicPageInfoAtom: { debugLabel: "dynamicPageInfoAtom" },
  currentRouteContextAtom: { debugLabel: "currentRouteContextAtom" },
  openQuickAddAtom: { debugLabel: "openQuickAddAtom" },
  openSearchAtom: { debugLabel: "openSearchAtom" },
  openProjectDialogAtom: { debugLabel: "openProjectDialogAtom" },
}))

vi.mock("@/lib/atoms/ui/views", () => ({
  currentViewStateAtom: { debugLabel: "currentViewStateAtom" },
  setViewModeAtom: { debugLabel: "setViewModeAtom" },
  setSortingAtom: { debugLabel: "setSortingAtom" },
  setSearchQueryAtom: { debugLabel: "setSearchQueryAtom" },
  setShowCompletedAtom: { debugLabel: "setShowCompletedAtom" },
  setCompactViewAtom: { debugLabel: "setCompactViewAtom" },
  setViewOptionsAtom: { debugLabel: "setViewOptionsAtom" },
}))

vi.mock("@/lib/atoms", () => ({
  tasksAtom: { debugLabel: "tasksAtom" },
}))

// Mock UI components with minimal implementations
interface MockButtonProps {
  children?: React.ReactNode
  onClick?: () => void
  title?: string
  [key: string]: unknown
}

interface MockInputProps {
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  [key: string]: unknown
}

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, title, ...props }: MockButtonProps) => (
    <button onClick={onClick} title={title} {...props}>
      {children}
    </button>
  ),
}))

vi.mock("@/components/ui/input", () => ({
  Input: ({ value, onChange, placeholder, ...props }: MockInputProps) => (
    <input value={value} onChange={onChange} placeholder={placeholder} {...props} />
  ),
}))

interface MockCommandPaletteProps {
  open?: boolean
  [key: string]: unknown
}

interface MockHelpPopoverProps {
  title?: string
  [key: string]: unknown
}

vi.mock("./view-options-popover", () => ({
  ViewOptionsPopover: () => <div data-testid="view-options-popover">View Options Popover</div>,
}))

vi.mock("@/components/search/command-palette", () => ({
  CommandPalette: ({ open }: MockCommandPaletteProps) => (
    <div data-testid="command-palette" style={{ display: open ? "block" : "none" }}>
      Command Palette
    </div>
  ),
}))

vi.mock("@/components/ui/help-popover", () => ({
  HelpPopover: ({ title }: MockHelpPopoverProps) => (
    <div data-testid="help-popover">Help: {title}</div>
  ),
}))

// Mock icons
vi.mock("lucide-react", () => ({
  ChevronLeft: () => <span data-testid="chevron-left-icon" />,
  ChevronRight: () => <span data-testid="chevron-right-icon" />,
  Search: () => <span data-testid="search-icon" />,
  Monitor: () => <span data-testid="monitor-icon" />,
  Calendar: () => <span data-testid="calendar-icon" />,
  Inbox: () => <span data-testid="inbox-icon" />,
  TrendingUp: () => <span data-testid="trending-up-icon" />,
  Folder: () => <span data-testid="folder-icon" />,
  Tag: () => <span data-testid="tag-icon" />,
  Filter: () => <span data-testid="filter-icon" />,
  List: () => <span data-testid="list-icon" />,
  Archive: () => <span data-testid="archive-icon" />,
  Sun: () => <span data-testid="sun-icon" />,
  Moon: () => <span data-testid="moon-icon" />,
}))

// Mock utils
vi.mock("@/lib/utils", () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(" "),
}))

import { PageHeader } from "./page-header"

describe("PageHeader", () => {
  const defaultProps = {
    onAdvancedSearch: vi.fn(),
    actions: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders page header successfully", () => {
    render(<PageHeader {...defaultProps} />)

    expect(screen.getByTestId("page-header")).toBeInTheDocument()
  })

  it("displays page title from dynamicPageInfoAtom", () => {
    render(<PageHeader {...defaultProps} />)

    expect(screen.getByText("Today")).toBeInTheDocument()
  })

  it("renders sidebar toggle button", () => {
    render(<PageHeader {...defaultProps} />)

    // Should show collapse button since sidebar is open by default in mock
    expect(screen.getByTitle("Collapse sidebar")).toBeInTheDocument()
  })

  it("renders view options popover", () => {
    render(<PageHeader {...defaultProps} />)

    expect(screen.getByTestId("view-options-popover")).toBeInTheDocument()
  })

  it("renders theme toggle button", () => {
    render(<PageHeader {...defaultProps} />)

    const themeButton = screen.getByTitle(/Current theme.*Click to cycle themes/)
    expect(themeButton).toBeInTheDocument()
  })

  it("renders help popover when help content is available", () => {
    render(<PageHeader {...defaultProps} />)

    expect(screen.getByTestId("help-popover")).toBeInTheDocument()
  })

  it("renders command palette (hidden by default)", () => {
    render(<PageHeader {...defaultProps} />)

    const commandPalette = screen.getByTestId("command-palette")
    expect(commandPalette).toBeInTheDocument()
    expect(commandPalette).toHaveStyle("display: none")
  })

  it("renders custom actions when provided", () => {
    const customActions: Array<{
      label: string
      icon?: React.ReactNode
      onClick: () => void
      variant?: "default" | "outline" | "ghost"
    }> = [
      {
        label: "Custom Action",
        onClick: vi.fn(),
        variant: "outline",
      },
    ]

    render(<PageHeader {...defaultProps} actions={customActions} />)

    expect(screen.getByText("Custom Action")).toBeInTheDocument()
  })

  it("applies custom className when provided", () => {
    render(<PageHeader {...defaultProps} className="custom-class" />)

    const header = screen.getByTestId("page-header")
    expect(header).toHaveClass("custom-class")
  })
})
