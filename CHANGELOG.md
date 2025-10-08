# Changelog

All notable changes to the "nbgrader for VS Code" extension will be documented in this file.

## [Unreleased]

## [0.1.0] - 2025-01-XX

### Added
- Initial release
- Cell toolbar button with tag icon for setting cell types
- Status bar indicators showing cell type, points, and lock status
- Support for all 6 nbgrader cell types:
  - `-` (no grading)
  - Manually graded answer
  - Manually graded task
  - Autograded answer
  - Autograded tests
  - Read-only
- Points input with validation
- Cell type validation (code vs markdown restrictions)
- Keyboard shortcut (Ctrl+Shift+G / Cmd+Shift+G)
- Command: "nbgrader: Set Cell Type"
- Command: "nbgrader: Clear Cell Metadata"
- Full compatibility with nbgrader schema version 3
- Comprehensive documentation (README, QUICKSTART, DEVELOPMENT, TESTING, ARCHITECTURE)

### Features
- Metadata generation matching nbgrader exactly
- QuickPick UI for type selection
- InputBox UI for points entry
- Real-time status bar updates
- Error handling and user-friendly messages
- Welcome message on first activation

### Technical
- TypeScript implementation with strict mode
- Modular architecture (metadata, ui, utils)
- WorkspaceEdit API for safe metadata modification
- Zero runtime dependencies
- ESLint configuration for code quality
- VS Code debug configuration included

### Documentation
- README.md - User guide
- QUICKSTART.md - Getting started tutorial
- DEVELOPMENT.md - Developer guide
- TESTING.md - Test cases and procedures
- ARCHITECTURE.md - Technical architecture
- PROJECT_SUMMARY.md - Project overview
- CHECKLIST.md - Launch checklist

[Unreleased]: https://github.com/your-username/vscode-nbgrader/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/your-username/vscode-nbgrader/releases/tag/v0.1.0
