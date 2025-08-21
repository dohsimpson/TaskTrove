const { getInfo } = require("@changesets/get-github-info")

// User-friendly mapping of commit types to changelog sections
const changeTypeMapping = {
  feat: { emoji: "🎉", section: "Feature", priority: 1 },
  fix: { emoji: "🐛", section: "Bug", priority: 2 },
  perf: { emoji: "⚡", section: "Performance", priority: 3 },
  style: { emoji: "✨", section: "UI", priority: 4 },
  // docs: { emoji: "📚", section: "Documentation", priority: 5 },
  docs: null,
  // Hide technical changes that don't impact users
  chore: null,
  refactor: null,
  test: null,
  ci: null,
  build: null,
}

/**
 * Transform technical commit messages into user-friendly descriptions
 */
function transformSummary(summary, type) {
  // Remove technical prefixes like "feat:", "fix:", etc.
  const cleanSummary = summary.replace(
    /^(feat|fix|perf|style|docs|chore|refactor|test|ci|build)(\([^)]+\))?\s*:\s*/i,
    "",
  )

  // Capitalize first letter
  const capitalized = cleanSummary.charAt(0).toUpperCase() + cleanSummary.slice(1)

  // Add period if missing
  return capitalized.endsWith(".") ? capitalized : `${capitalized}.`
}

/**
 * Determine the change type from commit message or changeset summary
 */
function getChangeType(summary) {
  const typeMatch = summary.match(
    /^(feat|fix|perf|style|docs|chore|refactor|test|ci|build)(\([^)]+\))?\s*:/i,
  )
  return typeMatch ? typeMatch[1].toLowerCase() : "feat" // Default to feature
}

/**
 * Get release line for a changeset
 */
async function getReleaseLine(changeset, type, options) {
  const changeType = getChangeType(changeset.summary)
  const mapping = changeTypeMapping[changeType]

  // Hide technical changes that don't impact users
  if (!mapping) {
    return ""
  }

  const transformedSummary = transformSummary(changeset.summary, changeType)

  // Try to get GitHub info if available
  let githubInfo = ""
  if (options?.repo) {
    try {
      const info = await getInfo({
        repo: options.repo,
        commit: changeset.commit,
      })
      if (info.pull) {
        githubInfo = ` ([#${info.pull}](${info.links.pull}))`
      }
    } catch (error) {
      // Silently fail if GitHub info is not available
    }
  }

  return `${mapping.emoji} ${mapping.section} - ${transformedSummary}${githubInfo}`
}

/**
 * Get release line for dependency updates
 * Returns empty string to hide dependency updates from user-facing changelog
 */
async function getDependencyReleaseLine(changesets, dependenciesUpdated, options) {
  // Hide all dependency updates from user-facing changelog
  return ""
}

module.exports = {
  getReleaseLine,
  getDependencyReleaseLine,
}
