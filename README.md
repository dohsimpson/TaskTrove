# TaskTrove

[![License](https://img.shields.io/badge/License-Sustainable%20Use-blue)](./LICENSE.md)
[![Self-Hosted](https://img.shields.io/badge/Self--Hosted-✅-green)](./selfhost/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)](./selfhost/)
[![Demo](https://img.shields.io/badge/Demo-Try%20Now-orange)](https://demo.tasktrove.io)

**The modern task management app that respects your privacy and gives you complete control over your data.**

TaskTrove is a powerful, self-hosted task management application designed for individuals and teams who want advanced productivity features without compromising on data ownership. Keep your todo list private, customize everything in your workflow, and never worry about data leaks or service shutdowns.

## 📷 Screenshots

### Light Theme

![TaskTrove Light Theme](https://tasktrove.io/_next/image?url=%2Fscreenshots%2Fproject-view.png&w=3840&q=75)

### Dark Theme

![TaskTrove Dark Theme](https://tasktrove.io/_next/image?url=%2Fscreenshots%2Fdark-mode.png&w=3840&q=75)

### Mobile View

![TaskTrove Mobile View](https://tasktrove.io/_next/image?url=%2Fscreenshots%2Fmobile-view.png&w=3840&q=75)

## ✨ Why Choose TaskTrove?

### 🏠 **Complete Privacy & Control**

- **Your Data Stays Yours** - Self-hosted on your own server or computer
- **No Cloud Dependencies** - Run entirely on your infrastructure
- **Zero Tracking** - No analytics, no data collection, no third parties
- **One-Time Setup** - Install once, use forever (core features are always free)

### 🚀 **Powerful Task Management**

- **Smart Task Creation** - Natural language date parsing ("tomorrow at 2pm")
- **Unlimited Subtasks** - Break down complex projects into manageable pieces
- **Recurring Tasks** - Set up daily, weekly, monthly, or custom recurring patterns
- **Rich Task Details** - Add priorities, due dates, comments, and file attachments
- **Quick Actions** - Keyboard shortcuts and gesture controls for power users (coming soon)

### 📊 **Stay Organized & Productive**

- **Project Organization** - Group tasks by projects with custom sections
- **Color-coded Labels** - Tag and categorize tasks with visual labels
- **Multiple Views** - Switch between List, Kanban board, and Calendar views
- **Smart Search** - Find any task instantly with powerful search
- **Analytics Dashboard** - Track your productivity and identify patterns (coming soon)

### 🎨 **Designed for Daily Use**

- **Beautiful Interface** - Clean, modern design that gets out of your way
- **Dark & Light Themes** - Automatic theme switching based on your system
- **Mobile Friendly** - Responsive design for all device types
- **Fast Performance** - Optimized for speed and performance

## Getting Started

### Option 1: docker

```bash
docker run -p 3000:3000 -v ./data:/app/data -d --name tasktrove dohsimpson/tasktrove
```

**That's it!** TaskTrove will be running on port 3000.

### Option 2: docker-compose

```bash
# Download the setup files
git clone https://github.com/dohsimpson/TaskTrove
cd TaskTrove/selfhost

# Start TaskTrove
docker-compose up -d
```

**That's it!** TaskTrove will be running on port 3000.

## 🛠️ Advanced Features

### Recurring Tasks

Set up tasks that repeat automatically:

- **Daily**: Morning routine, workout, medication reminders
- **Weekly**: Weekly reports, grocery shopping, cleaning tasks
- **Monthly**: Bill payments, reviews, maintenance tasks
- **Custom**: Every 2 weeks, every 3 months, specific weekdays

### Smart Scheduling

TaskTrove understands natural language:

- "tomorrow at 2pm" → Sets due date automatically
- "next Friday" → Schedules for the upcoming Friday
- "in 3 days" → Calculates the exact date
- "every Monday" → Creates weekly recurring task

### Productivity Analytics (Coming Soon)

Track your progress with built-in insights:

- **Completion Rates** - See your daily/weekly task completion
- **Time Patterns** - Identify your most productive hours
- **Project Progress** - Visual progress bars for ongoing projects
- **Burnout Prevention** - Warnings when you're taking on too much

## 🔧 Customization & Settings

### Themes & Appearance

- **Light/Dark/Auto** - Choose your preferred theme or auto-switch
- **Custom Colors** - Personalize labels and project colors
- **Interface Density** - Compact or expanded view options
- **Typography** - Adjust font sizes for better readability (coming soon)

### Keyboard Shortcuts

Master these shortcuts to work faster:

- **n** - Quick add task
- **/** - Search tasks
- **Space** - Mark task as complete/incomplete
- **Esc** - Close details panel

## 💾 Your Data & Backup

### Data Security

- **Local Storage Only** - Your data never leaves your device/server
- **No Registration** - No accounts, no passwords, no personal info collected
- **File-Based** - Simple JSON format that's easy to backup and transfer
- **Automatic Saves** - Changes are saved instantly as you work

### Backup Your Tasks

Your tasks are stored in a simple file that you can backup:

**Docker users:**

```bash
# Backup your data
cp data/data.json ~/tasktrove-backup-$(date +%Y%m%d).json
```

**Local users:**

```bash
# Find your data file in the TaskTrove folder
cp data/data.json ~/tasktrove-backup-$(date +%Y%m%d).json
```

## 🚨 Troubleshooting

### Getting Help

**Found a bug?**

- Check [GitHub Issues](https://github.com/dohsimpson/TaskTrove/issues) for known problems and solutions
- Create a new issue with details about what you were doing and the expected behavior
- Include your operating system and browser version

**Feature requests:**

- We'd love to hear your ideas for improving TaskTrove
- Submit feature requests through [GitHub Discussions](https://github.com/dohsimpson/TaskTrove/discussions)
- Vote on existing feature requests from other users

**General questions & help:**

- Join conversations in [GitHub Discussions](https://github.com/dohsimpson/TaskTrove/discussions)
- Share tips and workflows with other users
- Get help with setup and usage from the community

## 📜 Pricing & License

For Pricing, see [pricing](https://tasktrove.io/#pricing).

See [`LICENSE.md`](./LICENSE.md) for complete license terms.

## 🌟 Why Choose TaskTrove Over Alternatives?

- **✅ Self-Hosted** - Run TaskTrove on your own server or computer
- **✅ Privacy-First** - No analytics, no data collection, no third parties
- **✅ Source Code Available** - Source code is transparent, easy to audit
- **✅ Open at Heart** - Built with the open source community
- **✅ Community Driven** - Community is the core value of TaskTrove

Plus, you get:

- **✅ Simple Setup** - Designed to be easy to host
- **✅ Free Core Features** - Most paid features elsewhere are free
- **✅ Advanced Features** - Power up your workflow with unique features not found elsewhere
- **✅ Fully Customizable** - Themes, shortcuts, and plugins (coming soon)

---

<div align="center">

## Ready to take control of your productivity?

**[⭐ Star this repo](https://github.com/dohsimpson/TaskTrove)** • **[Download TaskTrove](#getting-started)** • **[Get Support](#getting-help)**

_Self-hosted • Privacy-first • No limits_

</div>
