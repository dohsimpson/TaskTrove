import React from "react"
import { describe, it, expect } from "vitest"
import { render, screen } from "@/test-utils"
import { HydrateValues } from "@/test-utils/jotai-mocks"
import { SearchDialog } from "./search-dialog"
import { taskAtoms } from "@tasktrove/atoms/core/tasks"
import { projectAtoms } from "@tasktrove/atoms/core/projects"
import { labelAtoms } from "@tasktrove/atoms/core/labels"
import { showSearchDialogAtom } from "@tasktrove/atoms/ui/dialogs"

describe("SearchDialog", () => {
  it("can import SearchDialog component", () => {
    expect(SearchDialog).toBeDefined()
    expect(typeof SearchDialog).toBe("function")
  })

  it("has the correct component name", () => {
    expect(SearchDialog.name).toBe("SearchDialog")
  })

  it("search input has transparent background in both light and dark modes", () => {
    // Mock atom values to open the dialog
    const initialAtomValues: HydrateValues = [
      [showSearchDialogAtom, true],
      [taskAtoms.tasks, []],
      [projectAtoms.projects, []],
      [labelAtoms.labels, []],
    ]

    render(<SearchDialog />, { initialAtomValues })

    const searchInput = screen.getByPlaceholderText("Search tasks...")

    expect(searchInput).toHaveClass("bg-transparent")
    expect(searchInput).toHaveClass("dark:bg-transparent")
  })
})
