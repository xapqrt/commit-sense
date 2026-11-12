# Changelog

## 0.1.0

First release.

- Suggests a Conventional Commits message (feat, fix, docs, refactor, test, chore, perf) from staged changes
- Heuristics on file names, change stats and a limited diff summary; fully offline
- Editable message, type chips, copy button, confidence and explanations
- Repository detection via the VS Code Git API with Git CLI fallback
- Read-only by construction: allow-listed git commands, never commits, stages or rewrites history
- Clear messages for missing Git, no workspace, not a repository and nothing staged
- Settings for header length, scope, body, status bar and diff size
