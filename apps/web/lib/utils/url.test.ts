import { describe, it, expect } from "vitest"
import { createGitHubIssueUrl } from "./url"

describe("createGitHubIssueUrl", () => {
  it("builds a GitHub issue URL with title and body", () => {
    const url = createGitHubIssueUrl({
      owner: "dohsimpson",
      repo: "tasktrove",
      title: "Mobile app error",
      body: "Steps to reproduce:\n1. Open the app\n2. Tap sync",
    })

    const parsed = new URL(url)

    expect(parsed.origin + parsed.pathname).toBe(
      "https://github.com/dohsimpson/tasktrove/issues/new",
    )
    expect(parsed.searchParams.get("title")).toBe("Mobile app error")
    expect(parsed.searchParams.get("body")).toBe(
      "Steps to reproduce:\n1. Open the app\n2. Tap sync",
    )
  })

  it("normalizes list parameters and trims empty entries", () => {
    const url = createGitHubIssueUrl({
      owner: "octo-org",
      repo: "octo-repo",
      labels: ["bug", "help wanted", "  "],
      assignees: ["octocat"],
      projects: [],
    })

    const params = new URL(url).searchParams

    expect(params.get("labels")).toBe("bug,help wanted")
    expect(params.get("assignees")).toBe("octocat")
    expect(params.has("projects")).toBe(false)
  })

  it("skips empty string fields", () => {
    const url = createGitHubIssueUrl({
      owner: "octo-org",
      repo: "octo-repo",
      title: "   ",
      body: "",
    })

    const params = new URL(url).searchParams

    expect(params.has("title")).toBe(false)
    expect(params.has("body")).toBe(false)
  })

  it("throws when owner or repo is empty", () => {
    expect(() =>
      createGitHubIssueUrl({
        owner: "   ",
        repo: "tasktrove",
      }),
    ).toThrow("createGitHubIssueUrl requires non-empty owner and repo.")
  })
})
