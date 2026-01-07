import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { CommitInput } from "./commit-input"

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    onBlur,
    onKeyDown,
    ...props
  }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input value={value} onChange={onChange} onBlur={onBlur} onKeyDown={onKeyDown} {...props} />
  ),
}))

describe("CommitInput", () => {
  it("commits on change by default", () => {
    const onCommit = vi.fn()
    render(<CommitInput id="test" type="text" value="a" onCommit={onCommit} />)

    const input = screen.getByRole("textbox")
    fireEvent.change(input, { target: { value: "b" } })

    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith("b")
  })

  it("does not commit when value is unchanged on blur", () => {
    const onCommit = vi.fn()
    render(
      <CommitInput id="test" type="text" value="same" onCommit={onCommit} commitOnChange={false} />,
    )

    const input = screen.getByRole("textbox")
    fireEvent.blur(input)

    expect(onCommit).not.toHaveBeenCalled()
  })

  it("commits on blur when commitOnChange is false", () => {
    const onCommit = vi.fn()
    render(
      <CommitInput
        id="test"
        type="text"
        value="start"
        onCommit={onCommit}
        commitOnChange={false}
      />,
    )

    const input = screen.getByRole("textbox")
    fireEvent.change(input, { target: { value: "next" } })
    fireEvent.blur(input)

    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith("next")
  })

  it("reverts draft when commit is rejected", () => {
    const onCommit = vi.fn(() => false)
    render(<CommitInput id="test" type="text" value="alpha" onCommit={onCommit} />)

    const input = screen.getByRole("textbox")
    fireEvent.change(input, { target: { value: "beta" } })

    expect(onCommit).toHaveBeenCalledWith("beta")
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("Expected input to be an HTMLInputElement")
    }
    expect(input.value).toBe("alpha")
  })
})
