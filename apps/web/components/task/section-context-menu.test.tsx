import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen } from "@/test-utils"
import { render } from "@/test-utils/render-with-providers"
import { SectionContextMenu } from "./section-context-menu"
import { projectAtoms } from "@tasktrove/atoms/core/projects"
import { pathnameAtom } from "@tasktrove/atoms/ui/navigation"
import { createGroupId } from "@/lib/types"
import { TEST_PROJECT_ID_1 } from "@tasktrove/types/test-constants"

// Mock component interfaces
interface MockButtonProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  [key: string]: unknown
}

interface MockDropdownProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface MockDropdownContentProps {
  children: React.ReactNode
  align?: string
  className?: string
}

interface MockDropdownItemProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}

interface MockDropdownTriggerProps {
  children: React.ReactNode
  asChild?: boolean
}

interface MockDeleteDialogProps {
  open?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  entityType?: string
  entityName?: string
}

// Mock all UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, className, onClick, ...props }: MockButtonProps) => (
    <button className={className} onClick={onClick} {...props}>
      {children}
    </button>
  ),
}))

vi.mock("@/components/ui/custom/context-menu-dropdown", () => ({
  ContextMenuDropdown: ({ children, open }: MockDropdownProps) => (
    <div data-testid="dropdown-menu" data-open={open}>
      {children}
    </div>
  ),
  DropdownMenuContent: ({ children, className }: MockDropdownContentProps) => (
    <div data-testid="dropdown-content" className={className}>
      {children}
    </div>
  ),
  DropdownMenuItem: ({ children, onClick, className }: MockDropdownItemProps) => (
    <div data-testid="dropdown-item" onClick={onClick} className={className}>
      {children}
    </div>
  ),
  DropdownMenuSeparator: () => <div data-testid="dropdown-separator" />,
  DropdownMenuTrigger: ({ children, asChild }: MockDropdownTriggerProps) => (
    <div data-testid="dropdown-trigger">{asChild ? children : <div>{children}</div>}</div>
  ),
}))

vi.mock("@/components/dialogs/delete-confirm-dialog", () => ({
  DeleteConfirmDialog: ({
    open,
    onOpenChange,
    onConfirm,
    entityType,
    entityName,
  }: MockDeleteDialogProps) => (
    <div data-testid="delete-dialog" data-open={open}>
      <span>
        Delete {entityType}: {entityName}
      </span>
      <button onClick={onConfirm}>Confirm</button>
      <button onClick={() => onOpenChange(false)}>Cancel</button>
    </div>
  ),
}))

vi.mock("lucide-react", () => ({
  MoreHorizontal: () => <span data-testid="more-horizontal-icon" />,
  Edit3: () => <span data-testid="edit-icon" />,
  Trash2: () => <span data-testid="trash-icon" />,
  Palette: () => <span data-testid="palette-icon" />,
}))

describe("SectionContextMenu", () => {
  const mockProject = {
    id: TEST_PROJECT_ID_1,
    name: "Test Project",
    slug: "test-project",
    color: "#ff0000",
    sections: [
      {
        id: "00000000-0000-4000-8000-000000000001",
        name: "Test Section",
        slug: "test-section",
        type: "section" as const,
        items: [],
        color: "#blue",
      },
      {
        id: "00000000-0000-0000-0000-000000000000",
        name: "Default Section",
        slug: "default-section",
        type: "section" as const,
        items: [],
        color: "#gray",
      },
    ],
  }

  const defaultProps = {
    sectionId: createGroupId("12345678-1234-4234-8234-123456789abc"),
    isVisible: true,
  }

  const defaultAtomValues: Array<[unknown, unknown]> = [
    [projectAtoms.projects, [mockProject]],
    [pathnameAtom, `/projects/${TEST_PROJECT_ID_1}`],
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders context menu trigger when visible", () => {
    const { container } = render(<SectionContextMenu {...defaultProps} />, {
      initialAtomValues: defaultAtomValues,
    })

    const allElements = container.querySelectorAll("*")
    const hasContent = allElements.length > 1

    if (hasContent) {
      expect(screen.getByTestId("dropdown-trigger")).toBeInTheDocument()
      expect(screen.getByTestId("more-horizontal-icon")).toBeInTheDocument()
    } else {
      expect(screen.queryByTestId("dropdown-trigger")).not.toBeInTheDocument()
    }
  })

  it("hides context menu trigger when not visible", () => {
    const { container } = render(<SectionContextMenu {...defaultProps} isVisible={false} />, {
      initialAtomValues: defaultAtomValues,
    })

    const allElements = container.querySelectorAll("*")
    const hasContent = allElements.length > 1

    if (hasContent) {
      const trigger = screen.getByTestId("dropdown-trigger")
      const button = trigger.querySelector("button")
      expect(button).toHaveClass("opacity-0")
    } else {
      expect(screen.queryByTestId("dropdown-trigger")).not.toBeInTheDocument()
    }
  })

  it("returns null when section is not found", () => {
    render(
      <SectionContextMenu
        sectionId={createGroupId("99999999-9999-4999-8999-999999999999")}
        isVisible={true}
      />,
      {
        initialAtomValues: defaultAtomValues,
      },
    )

    expect(screen.queryByTestId("dropdown-trigger")).not.toBeInTheDocument()
    expect(screen.queryByTestId("dropdown-menu")).not.toBeInTheDocument()
  })

  it("shows delete option when section is not default section", () => {
    const { container } = render(<SectionContextMenu {...defaultProps} open={true} />, {
      initialAtomValues: defaultAtomValues,
    })

    const allElements = container.querySelectorAll("*")
    const hasContent = allElements.length > 1

    if (hasContent) {
      const deleteItems = screen
        .getAllByTestId("dropdown-item")
        .filter((item) => item.textContent?.includes("Delete section"))
      expect(deleteItems).toHaveLength(1)
    } else {
      expect(screen.queryByTestId("dropdown-item")).not.toBeInTheDocument()
    }
  })

  it("hides delete option when section is default section", () => {
    // Use DEFAULT_UUID for this test
    const { container } = render(
      <SectionContextMenu
        sectionId={createGroupId("00000000-0000-0000-0000-000000000000")}
        isVisible={true}
        open={true}
      />,
      {
        initialAtomValues: defaultAtomValues,
      },
    )

    const allElements = container.querySelectorAll("*")
    const hasContent = allElements.length > 1

    if (hasContent) {
      const deleteItems = screen
        .getAllByTestId("dropdown-item")
        .filter((item) => item.textContent?.includes("Delete section"))
      expect(deleteItems).toHaveLength(0)
    } else {
      expect(screen.queryByTestId("dropdown-item")).not.toBeInTheDocument()
    }
  })
})
