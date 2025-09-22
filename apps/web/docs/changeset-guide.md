# Changeset Guide

This guide demonstrates how to manage changelogs for new version releases using the changesets library.

## Overview

The changesets library requires manual creation of changeset files for each feature/fix, which can be tedious when releasing versions that include many commits. This guide shows how to automate:

1. **Commit Analysis**: Filtering commits since the last release for user-impacting changes only
2. **Changeset Creation**: Generating individual changeset files for proper processing
3. **Changelog Generation**: Producing clean, user-friendly changelogs with emojis and proper formatting

## Prerequisites

### Required Setup

- Changesets configured with `.changeset/config.json`
- Custom changelog configuration (`.changeset/changelog-config.js`)
- Conventional commit messages following `type: description` format
- Git tags for releases (e.g., `v0.1.0`)

### Scripts in package.json

```json
{
  "scripts": {
    "changeset:version": "changeset version"
  }
}
```

## Key Concepts

### Commit Filtering Strategy

**Allowed Conventional Commit Types Only:**
`build:`, `chore:`, `ci:`, `docs:`, `style:`, `refactor:`, `perf:`, `test:`, `fix:`, `feat:`

**Include in changelog (user-facing):**

- `feat:` - New features that users will notice
- `fix:` - Bug fixes that affect user experience
- `perf:` - Performance improvements users will feel
- `style:` - UI/UX improvements

**Exclude from changelog (technical/internal):**

- `docs:` - Documentation changes
- `chore:` - Maintenance tasks
- `refactor:` - Code restructuring without functional changes
- `test:` - Test additions/changes
- `ci:` - CI/CD pipeline changes
- `build:` - Build system changes

### Changeset Structure

Each changeset file must be **individual** (not multi-line) for proper processing:

```markdown
---
"tasktrove": minor
---

feat: add new user dashboard with analytics
```

**❌ Don't create multi-line changesets:**

```markdown
---
"tasktrove": minor
---

feat: add dashboard
fix: resolve login issue
feat: implement search
```

## Step-by-Step Automation Process

### 1. Analyze Commits Since Last Release

```bash
# Find the last tagged version
git describe --tags --abbrev=0

# Get commit titles since last tag (e.g., v0.1.0)
git log v0.1.0..HEAD --oneline --pretty=format:"%s"
```

### 2. Filter Commits

**Manual Review Required**: Check each commit against these criteria:

- **Correctly tagged**: Does `feat:` actually add a user feature? Is `fix:` actually fixing a user-facing bug?
- **User-facing**: Will users notice this change in their daily usage?
- **Properly scoped**: Avoid commits that mix multiple types (e.g., "refactor: consolidate code and add tests")

**🔍 CRITICAL: Deep Commit Analysis When Uncertain**

If unsure about a commit's type or user impact, **examine the actual commit content**:

```bash
# See what files were changed
git show --name-only <commit-hash>

# Review the actual code changes
git show <commit-hash>
```

**Key Questions to Ask:**

- What files were modified? (UI components vs build configs vs tests)
- Do the changes affect user-visible behavior or just internal code organization?
- Would a user notice this change in their daily workflow?

**Common Mistagging Patterns:**

- `feat: setup [tooling]` → Should be `chore:`
- `fix: optimize [performance]` → Should be `perf:`
- `feat: add [CI/build workflow]` → Should be `ci:`

### 3. Create Individual Changeset Files

For each filtered commit, create a separate changeset:

```bash
# Create empty changeset files (one per commit)
pnpm changeset add --empty
```

Then edit each file with the appropriate content:

```markdown
---
"tasktrove": minor # or "patch" for fixes
---

feat: enhance drag and drop with shadow effects
```

**Version Bump Guidelines:**

- `minor`: New features (e.g. `feat:`, `perf:`, `style:`)
- `patch`: Bug fixes (e.g. `fix:`)
- `major`: Breaking changes (rare, check with user)

### 4. Generate Changelog

```bash
pnpm changeset:version
```

This will:

- Process each changeset file individually
- Apply transformations via `changelog-config.js`
- Update `package.json` version
- Generate/update `CHANGELOG.md`
- Remove processed changeset files

### 5. Review and Report

Check the generated `CHANGELOG.md` format:

```markdown
## 0.2.0

### Minor Changes

🎉 Feature - Enhance drag and drop with shadow effects.
🎉 Feature - Add 'tod' and 'tmr' shorthand for today/tomorrow in NLP.

### Patch Changes

🐛 Bug - Resolve kanban board drag and drop between sections.
```

**🚨 CRITICAL: DON'T COMMIT**

**STOP!** Do NOT commit. This step **MUST** be done manually by a human:

- **Review the generated CHANGELOG.md thoroughly**
- **Verify the version bump is appropriate**
- **Check that all changes are accurately represented**
- **Ensure no sensitive information is included**
- **Report back the final changelog to the user for review**

## Configuration Details

### Changelog Config (`.changeset/changelog-config.js`)

The config file controls formatting and filtering:

```javascript
const changeTypeMapping = {
  feat: { emoji: "🎉", section: "Feature", priority: 1 },
  fix: { emoji: "🐛", section: "Bug", priority: 2 },
  perf: { emoji: "⚡", section: "Performance", priority: 3 },
  style: { emoji: "✨", section: "UI", priority: 4 },
  // Hidden from changelog
  docs: null,
  chore: null,
  refactor: null,
  test: null,
  ci: null,
  build: null,
}

// Output format: "🎉 Feature - Description with proper capitalization."
return `${mapping.emoji} ${mapping.section} - ${transformedSummary}${githubInfo}`
```

**Key Features:**

- **Prefix Removal**: Strips `feat:`, `fix:` etc.
- **Capitalization**: Ensures proper sentence case
- **Punctuation**: Adds periods if missing
- **GitHub Integration**: Links to PRs when available
- **Type Filtering**: Hides technical changes

## Caveats and Gotchas

### ⚠️ Critical Issues

1. **Multi-line Changesets Don't Work**: Each changeset file should contain only one commit summary
2. **Interactive Mode Failures**: `pnpm changeset add` without `--empty` may fail in non-TTY environments
3. **Commit Message Accuracy**: Garbage in, garbage out - poor commit messages produce poor changelogs

### 🔍 Manual Review Points

- **Mixed Commits**: Some commits do multiple things and should be split or excluded
- **Scope Accuracy**: "feat: add GitHub Actions" is build tooling, not a user feature
- **Impact Assessment**: Will users actually notice this change?

### 📋 Quality Checklist

- [ ] All included commits are user-facing
- [ ] Commit types match actual changes (feat = new feature, fix = bug fix)
- [ ] No development/infrastructure commits included
- [ ] Version bump level is appropriate (minor for features, patch for fixes)
- [ ] Generated changelog reads naturally for end users

## Troubleshooting

### Common Issues

**Issue**: Changeset files not being processed
**Solution**: Ensure each file has proper frontmatter and single summary line

**Issue**: Technical commits appearing in changelog  
**Solution**: Update `changelog-config.js` to set those types to `null`

**Issue**: Poor formatting in changelog
**Solution**: Check commit message format follows `type: description` pattern

**Issue**: Version bump too high/low
**Solution**: Review whether changes are truly features (minor) vs fixes (patch)

### Debug Commands

```bash
# Check current changesets
ls .changeset/*.md

# Verify config syntax
node -c .changeset/changelog-config.js

# Test version bump without committing
pnpm changeset:version --dry-run
```

## Best Practices

1. **Commit Hygiene**: Write clear, properly-typed commit messages from the start
2. **User Focus**: Always ask "Will users care about this change?"
3. **Consistency**: Use consistent language and formatting in commit messages
4. **Validation**: Always review generated changelog before publishing

## Example Workflow

```bash
# 1. Get commits since last release
git log v0.1.0..HEAD --oneline --pretty=format:"%s"

# 2. Filter to user-facing changes only
# feat: enhance drag and drop
# fix: resolve kanban board issues
# feat: add NLP shortcuts
# feat: implement settings dialog

# 3. Create individual changesets
pnpm changeset add --empty  # repeat 4 times

# 4. Edit each changeset file with one commit

# 5. Generate changelog
pnpm changeset:version

# 6. Review CHANGELOG.md output and report back to user with a summary

# 7. ⚠️  MANUAL STEP: Human reviews and commits (NEVER AUTOMATED)
```

This process ensures clean, user-focused changelogs while maintaining the flexibility to customize formatting and filtering as needed.
