import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"

/**
 * Test file specifically for verifying keyboard shortcut configuration changes
 * This tests the static configuration rather than runtime behavior
 */

describe("MainLayoutWrapper - Keyboard Shortcut Configuration", () => {
  it("should not include Cmd+F and Ctrl+F shortcuts in configuration", () => {
    // Read the actual component file to verify the shortcuts array
    // This approach tests the actual configuration without complex mocking

    const componentPath = path.join(__dirname, "main-layout-wrapper.tsx")
    const componentContent = fs.readFileSync(componentPath, "utf-8")

    // Verify that Cmd+F and Ctrl+F are commented out in the shortcuts array
    expect(componentContent).toContain('// "Cmd+F", // DISABLED')
    expect(componentContent).toContain('// "Ctrl+F", // DISABLED')

    // Verify that the handling logic is commented out
    expect(componentContent).toContain('// if (modifier && key === "f") {')
    expect(componentContent).toContain("//   openSearch()")
    expect(componentContent).toContain("//   return true")
    expect(componentContent).toContain("// }")
  })

  it("should include n key for quick add task", () => {
    const componentPath = path.join(__dirname, "main-layout-wrapper.tsx")
    const componentContent = fs.readFileSync(componentPath, "utf-8")

    // Verify that n key is included
    expect(componentContent).toContain('"n",')

    // Verify the handler includes n key
    expect(componentContent).toContain('if ((modifier && key === "n") || key === "n") {')
  })

  it("should have history shortcuts disabled", () => {
    const componentPath = path.join(__dirname, "main-layout-wrapper.tsx")
    const componentContent = fs.readFileSync(componentPath, "utf-8")

    // Verify that history handler is commented out
    expect(componentContent).toContain("// const historyHandler: KeyboardHandler = {")
    expect(componentContent).toContain("// registerHandler(historyHandler) // DISABLED")
    expect(componentContent).toContain('// unregisterHandler("history-shortcuts") // DISABLED')
  })

  it("should have page header shortcuts removed", () => {
    const componentPath = path.join(__dirname, "main-layout-wrapper.tsx")
    const componentContent = fs.readFileSync(componentPath, "utf-8")

    // Verify that page header handler is removed
    expect(componentContent).toContain("// Page header search escape shortcut - REMOVED")
    expect(componentContent).toContain("// registerHandler(pageHeaderHandler) // REMOVED")
    expect(componentContent).toContain('// unregisterHandler("page-header-shortcuts") // REMOVED')
  })

  it("should still include / key for search functionality", () => {
    const componentPath = path.join(__dirname, "main-layout-wrapper.tsx")
    const componentContent = fs.readFileSync(componentPath, "utf-8")

    // Verify that / key is still active
    expect(componentContent).toContain('"/",')
    expect(componentContent).toContain('if (key === "/") {')
    expect(componentContent).toContain("openSearch()")
  })

  it("should have proper comment indicating Cmd/Ctrl+F is disabled", () => {
    const componentPath = path.join(__dirname, "main-layout-wrapper.tsx")
    const componentContent = fs.readFileSync(componentPath, "utf-8")

    // Verify the comment explaining the change
    expect(componentContent).toContain(
      "// Search (Cmd/Ctrl + F or /) - Cmd/Ctrl+F DISABLED, / still works",
    )
  })

  it("should maintain other keyboard shortcuts", () => {
    const componentPath = path.join(__dirname, "main-layout-wrapper.tsx")
    const componentContent = fs.readFileSync(componentPath, "utf-8")

    // Verify other shortcuts are still present
    expect(componentContent).toContain('"Cmd+N",')
    expect(componentContent).toContain('"Ctrl+N",')
    expect(componentContent).toContain('"n",')
    expect(componentContent).toContain('"?",')
    expect(componentContent).toContain('"Cmd+Shift+T",')
    expect(componentContent).toContain('"Ctrl+Shift+T",')

    // Verify their handlers are still active
    expect(componentContent).toContain('if ((modifier && key === "n") || key === "n") {')
    expect(componentContent).toContain('if (key === "?" && !modifier) {')
    expect(componentContent).toContain('if (modifier && shiftKey && key === "T") {')
  })

  it("should have the keyboard shortcut handler structure intact", () => {
    const componentPath = path.join(__dirname, "main-layout-wrapper.tsx")
    const componentContent = fs.readFileSync(componentPath, "utf-8")

    // Verify the global handler exists
    expect(componentContent).toContain("const globalHandler: KeyboardHandler = {")
    expect(componentContent).toContain('id: "global-shortcuts",')
    expect(componentContent).toContain("shortcuts: [")
    expect(componentContent).toContain("handler: (event) => {")

    // Verify handler registration
    expect(componentContent).toContain("registerHandler(globalHandler)")
  })
})
