import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { act } from "@testing-library/react"
import { waitFor } from "@/test-utils"
import { render } from "@/test-utils/render-with-providers"
import { HydrateValues } from "@/test-utils/jotai-mocks"
import { SectionContextMenu } from "./section-context-menu"
import { projectAtoms } from "@tasktrove/atoms/core/projects"
import { projectsAtom as baseProjectsAtom } from "@tasktrove/atoms/data/base/atoms"
import { pathnameAtom } from "@tasktrove/atoms/ui/navigation"
import { useAtomValue } from "jotai"
import { createGroupId } from "@tasktrove/types/id"
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

// Mock all UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, className, onClick, ...props }: MockButtonProps) => (
    <button className={className} onClick={onClick} {...props}>
      {children}
    </button>
  ),
}))

const mockEntityContextMenu = vi.fn()
let capturedOnDelete: ((deleteContainedResources?: boolean) => void) | undefined

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
  }: {
    open?: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: (deleteContainedResources?: boolean) => void
    entityType?: string
    entityName?: string
  }) => (
    <div data-testid="delete-dialog" data-open={open}>
      <span>
        Delete {entityType}: {entityName}
      </span>
      <button onClick={() => onConfirm(false)} data-testid="confirm-without-resources">
        Confirm without deleting contained tasks
      </button>
      <button onClick={() => onConfirm(true)} data-testid="confirm-with-resources">
        Confirm and delete contained tasks
      </button>
      <button onClick={() => onOpenChange(false)}>Cancel</button>
    </div>
  ),
}))

vi.mock("@/components/ui/custom/entity-context-menu", () => ({
  EntityContextMenu: (props: {
    onDelete: (deleteContainedResources?: boolean) => void
    entityName: string
  }) => {
    mockEntityContextMenu(props)
    capturedOnDelete = props.onDelete
    return <div data-testid="entity-context-menu">Entity: {props.entityName}</div>
  },
}))

vi.mock("lucide-react", () => ({
  MoreHorizontal: () => <span data-testid="more-horizontal-icon" />,
  Edit3: () => <span data-testid="edit-icon" />,
  Trash2: () => <span data-testid="trash-icon" />,
  Palette: () => <span data-testid="palette-icon" />,
}))

const removeSectionPayloads: Array<{
  projectId: string
  sectionId: string
  deleteTasks?: boolean
}> = []

type SectionContextMenuTestProps = React.ComponentProps<typeof SectionContextMenu>

function RemoveSectionObserver() {
  const value = useAtomValue(projectAtoms.actions.removeSection)

  React.useEffect(() => {
    if (value) {
      removeSectionPayloads.push(value)
    }
  }, [value])

  return null
}

describe("SectionContextMenu", () => {
  const testSectionId = createGroupId("00000000-0000-4000-8000-000000000001")
  const defaultSectionId = createGroupId("00000000-0000-0000-0000-000000000000")

  const mockProject = {
    id: TEST_PROJECT_ID_1,
    name: "Test Project",
    color: "#ff0000",
    sections: [
      {
        id: testSectionId,
        name: "Test Section",
        type: "section" as const,
        items: [],
        color: "#blue",
      },
      {
        id: defaultSectionId,
        name: "Default Section",
        type: "section" as const,
        items: [],
        color: "#gray",
        isDefault: true,
      },
    ],
  }

  const defaultProps = {
    sectionId: testSectionId,
    isVisible: true,
  } satisfies Pick<SectionContextMenuTestProps, "sectionId" | "isVisible">

  const defaultAtomValues: HydrateValues = [
    [projectAtoms.projects, [mockProject]],
    [baseProjectsAtom, [mockProject]],
    [pathnameAtom, `/projects/${TEST_PROJECT_ID_1}`],
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    capturedOnDelete = undefined
    removeSectionPayloads.length = 0
  })

  const renderMenu = (props?: Partial<SectionContextMenuTestProps>) =>
    render(
      <>
        <RemoveSectionObserver />
        <SectionContextMenu {...defaultProps} {...props} />
      </>,
      {
        initialAtomValues: defaultAtomValues,
      },
    )

  it("captures delete handler for valid section", () => {
    renderMenu()

    expect(mockEntityContextMenu).toHaveBeenCalled()
    expect(typeof capturedOnDelete).toBe("function")
  })

  it("calls removeSection without deleting tasks when user keeps tasks", async () => {
    renderMenu()

    act(() => {
      capturedOnDelete?.(false)
    })

    await waitFor(() => {
      expect(removeSectionPayloads.at(-1)).toEqual({
        projectId: TEST_PROJECT_ID_1,
        sectionId: testSectionId,
        deleteTasks: false,
      })
    })
  })

  it("calls removeSection with deleteTasks=true when user deletes contained tasks", async () => {
    renderMenu()

    act(() => {
      capturedOnDelete?.(true)
    })

    await waitFor(() => {
      expect(removeSectionPayloads.at(-1)).toEqual({
        projectId: TEST_PROJECT_ID_1,
        sectionId: testSectionId,
        deleteTasks: true,
      })
    })
  })
})
