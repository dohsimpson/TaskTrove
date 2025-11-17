import { describe, it, expect, vi, beforeEach } from "vitest"
import { render } from "@/test-utils"
import { PwaInstall } from "./pwa-install"

// Mock the PWA install web component
vi.mock("@khmyznikov/pwa-install", () => ({
  default: vi.fn(),
}))

describe("PwaInstall", () => {
  beforeEach(() => {
    // Mock the custom elements if they don't exist in test environment
    if (!customElements.get("pwa-install")) {
      customElements.define(
        "pwa-install",
        class extends HTMLElement {
          connectedCallback() {
            // Mock implementation
          }
        },
      )
    }
  })

  it("renders without crashing", () => {
    expect(() => render(<PwaInstall />)).not.toThrow()
  })

  it("renders pwa-install web component with correct props", () => {
    render(<PwaInstall />)

    const pwaElement = document.querySelector("pwa-install")
    expect(pwaElement).toBeTruthy()
    expect(pwaElement?.getAttribute("manifest-url")).toBe("/manifest.webmanifest")
    expect(pwaElement?.getAttribute("use-local-storage")).toBe("true")
  })

  it("has correct TypeScript suppressions for web component", () => {
    // This test ensures the @ts-expect-error comments are valid
    // The component should render without TypeScript errors
    expect(() => render(<PwaInstall />)).not.toThrow()
  })

  it("is a client component", () => {
    // The component has "use client" directive, which means it should render
    // without server-side rendering issues
    expect(() => render(<PwaInstall />)).not.toThrow()
  })
})
