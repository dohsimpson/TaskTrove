export type GitHubIssueQueryParams = {
  title?: string
  body?: string
  labels?: readonly string[]
  milestone?: string | number
  assignees?: readonly string[]
  projects?: readonly string[]
  template?: string
}

export interface GitHubIssueUrlOptions extends GitHubIssueQueryParams {
  owner: string
  repo: string
}

const ISSUE_QUERY_KEYS = [
  "title",
  "body",
  "labels",
  "milestone",
  "assignees",
  "projects",
  "template",
] as const satisfies ReadonlyArray<keyof GitHubIssueQueryParams>

type GitHubIssueQueryKey = (typeof ISSUE_QUERY_KEYS)[number]

const issueParamHandlers: {
  [Key in GitHubIssueQueryKey]: (value: GitHubIssueQueryParams[Key]) => string | null
} = {
  title: (value) => normalizeText(value),
  body: (value) => normalizeText(value),
  labels: (value) => normalizeList(value),
  milestone: (value) => normalizeText(value),
  assignees: (value) => normalizeList(value),
  projects: (value) => normalizeList(value),
  template: (value) => normalizeText(value),
}

function normalizeText(value: string | number | undefined): string | null {
  if (value === undefined) return null
  const trimmed = String(value).trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeList(values: readonly string[] | undefined): string | null {
  if (!values) return null
  const cleaned = values.map((value) => value.trim()).filter((value) => value.length > 0)
  return cleaned.length > 0 ? cleaned.join(",") : null
}

export function createGitHubIssueUrl(options: GitHubIssueUrlOptions): string {
  const { owner, repo, title, body, labels, milestone, assignees, projects, template } = options
  const trimmedOwner = owner.trim()
  const trimmedRepo = repo.trim()

  if (!trimmedOwner || !trimmedRepo) {
    throw new Error("createGitHubIssueUrl requires non-empty owner and repo.")
  }

  const url = new URL(`https://github.com/${trimmedOwner}/${trimmedRepo}/issues/new`)
  const query: GitHubIssueQueryParams = {
    title,
    body,
    labels,
    milestone,
    assignees,
    projects,
    template,
  }

  for (const key of ISSUE_QUERY_KEYS) {
    const value = getIssueParamValue(key, query)
    if (value) {
      url.searchParams.set(key, value)
    }
  }

  return url.toString()
}

function getIssueParamValue<Key extends GitHubIssueQueryKey>(
  key: Key,
  params: GitHubIssueQueryParams,
): string | null {
  return issueParamHandlers[key](params[key])
}
