# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
CHANGELOG.md中记录了之前的codingagent的工作. 当你完成你的工作时，记得更新CHANGELOG.md与spec.md中的进度
## Project Overview

MCP Switch is a graphical desktop application for unified management of MCP (Model Context Protocol) Server configurations across multiple IDEs/CLIs. It supports one-click sync and visual toggle control.

**Supported Tools**: Claude Desktop, Claude Code CLI, Cursor IDE, Windsurf IDE, Codex CLI (OpenAI), OpenCode

## Tech Stack

- **Framework**: Electron 28 + electron-vite
- **Frontend**: React 18 + TypeScript
- **UI**: Shadcn/ui + Tailwind CSS
- **State Management**: Zustand
- **Packaging**: electron-builder
- **Config Parsing**: `@iarna/toml` (TOML for Codex), `jsonc-parser` (JSONC for OpenCode)

## Build Commands

```bash
# Install dependencies
npm install

# Development
npm run dev

# Build
npm run build

# Package for distribution
npm run package
```