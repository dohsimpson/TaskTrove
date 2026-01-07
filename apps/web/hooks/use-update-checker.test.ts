import { renderHook, waitFor } from "@/test-utils"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { useUpdateChecker } from "./use-update-checker"

const mockIsPro = vi.fn()
const mockGetAppVersion = vi.fn()

vi.mock("@/lib/utils/env", () => ({
  isPro: () => mockIsPro(),
}))

vi.mock("@/lib/utils/version", () => ({
  getAppVersion: () => mockGetAppVersion(),
}))

describe("useUpdateChecker", () => {
  const fetchMock = vi.fn()
  const release = {
    tag_name: "v1.1.0",
    name: "Release",
    published_at: "2024-01-01T00:00:00Z",
    html_url: "https://github.com/dohsimpson/TaskTrove/releases/tag/v1.1.0",
    draft: false,
    prerelease: false,
  }

  beforeEach(() => {
    mockGetAppVersion.mockResolvedValue({ version: "1.0.0", native: false })
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(release), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    fetchMock.mockReset()
    mockIsPro.mockReset()
    mockGetAppVersion.mockReset()
  })

  it("checks TaskTrove repository when not in Pro mode", async () => {
    mockIsPro.mockReturnValue(false)

    const { result } = renderHook(() => useUpdateChecker())

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/dohsimpson/TaskTrove/releases/latest",
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current).toMatchObject({
      hasUpdate: true,
      latestVersion: release.tag_name,
      releaseUrl: release.html_url,
    })
  })

  it("switches to TaskTrovePro repository in Pro mode", async () => {
    mockIsPro.mockReturnValue(true)

    const { result } = renderHook(() => useUpdateChecker())

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/dohsimpson/TaskTrovePro/releases/latest",
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
  })
})
