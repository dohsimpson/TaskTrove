<div align="center">

# TaskTrove

[![License](https://img.shields.io/badge/License-Sustainable%20Use-blue)](./LICENSE.md)
[![Self-Hosted](https://img.shields.io/badge/Self--Hosted-✅-green)](./selfhost/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)](./selfhost/)
[![Demo](https://img.shields.io/badge/Demo-Try%20Now-orange)](https://demo.tasktrove.io)

### Self-hosted task management that respects your privacy

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Development](#-development)

| Light Theme                                                                                                  | Dark Theme                                                                                               | Mobile View                                                                                                 |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| ![TaskTrove Light Theme](https://tasktrove.io/_next/image?url=%2Fscreenshots%2Fproject-view.png&w=3840&q=75) | ![TaskTrove Dark Theme](https://tasktrove.io/_next/image?url=%2Fscreenshots%2Fdark-mode.png&w=3840&q=75) | ![TaskTrove Mobile View](https://tasktrove.io/_next/image?url=%2Fscreenshots%2Fmobile-view.png&w=3840&q=75) |

</div>

---

## ✨ Features

| **Feature**                   | **Description**                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| **🏠 Complete Privacy**       | Self-hosted on your infrastructure with zero tracking or data collection              |
| **📝 Smart Task Creation**    | Natural language parsing ("tomorrow at 2pm") with unlimited subtasks and rich details |
| **🔄 Recurring Tasks**        | Daily, weekly, monthly, or custom patterns with automatic scheduling                  |
| **📊 Project Organization**   | Group tasks by projects with sections, color-coded labels, and multiple views         |
| **🎨 Modern Interface**       | Clean design with dark/light themes, mobile-friendly, and keyboard shortcuts          |
| **💾 Simple Data Management** | File-based storage in JSON format for easy backups and transfers                      |

---

## 📦 Installation

### Docker (Recommended)

```bash
# Quick start
docker run -p 3000:3000 -v ./data:/app/data -d --name tasktrove dohsimpson/tasktrove
```

### Docker Compose

```bash
# Download setup files
git clone https://github.com/dohsimpson/TaskTrove
cd TaskTrove/selfhost

# Start TaskTrove
docker-compose up -d
```

### Manual Setup

```bash
# Clone repository
git clone https://github.com/dohsimpson/TaskTrove
cd TaskTrove

# Install dependencies
pnpm install

# Build and start
pnpm build
pnpm start
```

---

## 💻 Usage

### Keyboard Shortcuts

| **Key** | **Action**                       |
| ------- | -------------------------------- |
| `n`     | Quick add new task               |
| `/`     | Search tasks and projects        |
| `Space` | Mark task as complete/incomplete |
| `Esc`   | Close details panel or dialogs   |

### Task Features

- **Natural Language**: "tomorrow at 2pm", "next Friday", "every Monday"
- **Subtasks**: Break down complex projects into manageable pieces
- **Rich Details**: Priorities, due dates, comments, file attachments
- **Views**: List, Kanban board, and Calendar views

### Backup Your Data

```bash
cp data/data.json ~/tasktrove-backup-$(date +%Y%m%d).json
```

---

## 🧩 Development

> **Want to contribute?** Check out the development setup:

```bash
git clone https://github.com/dohsimpson/TaskTrove
cd TaskTrove
pnpm install
pnpm dev
```

**Key Commands:**

- `pnpm typecheck` - Type checking
- `pnpm lint` - Code linting
- `pnpm test` - Run tests
- `pnpm run check` - Full validation

### Contributing

We welcome and appreciate all contributions! Thank you for helping make TaskTrove better.

**Process:**

1. **Open an issue first** - Discuss bugs in [GitHub Issues](https://github.com/dohsimpson/TaskTrove/issues), or features in [GitHub Discussions](https://github.com/dohsimpson/TaskTrove/discussions)
2. **Submit your PR** - You'll be prompted to sign our CLA (Contributor License Agreement)
3. **Code review** - A maintainer will review your changes and provide feedback
4. **Merge** - Once approved, your contribution will be merged

**Guidelines:**

- Follow existing code patterns and test coverage requirements
- Add unit tests for non-trivial changes
- AI assisted PRs are allowed, but through review is required before submitting. Make sure you are the sole contributor of the PR (avoid `co-authored by XYZ` in commit message)

---

## 📄 License

See [LICENSE.md](./LICENSE.md) for license terms and [pricing](https://tasktrove.io/#pricing).

---

<div align="center">

_Happy Tasking!_

</div>
