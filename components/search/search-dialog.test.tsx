import React from "react"
import { describe, it, expect } from "vitest"
import { render, screen } from "@/test-utils"
import { SearchDialog } from "./search-dialog"
import { taskAtoms, projectAtoms, labelAtoms } from "@/lib/atoms"
import { showSearchDialogAtom } from "@/lib/atoms/ui/dialogs"

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
    const initialAtomValues: Array<[unknown, unknown]> = [
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
