# Better Git Commit Message Helper

A small VS Code extension that looks at your **staged** changes and suggests a
short [Conventional Commits](https://www.conventionalcommits.org/) message.
Tweak it, copy it, paste it into the Source Control message box. That is the
whole workflow.

- **Offline.** No network, no AI service, no telemetry. Plain heuristics on file names, change stats and a short diff summary.
- **Read-only.** It never creates a commit, never stages files and never touches history. See [Safety](#safety).
- **Simple.** One command, one panel.

## Usage

1. Stage the files you want in the commit (the **+** button in Source Control).
2. Run **Better Commit: Suggest Commit Message from Staged Changes** from the Command Palette, or click **Commit msg** in the status bar.
3. A panel opens beside your editor with a suggestion, for example `feat(auth): add loginRateLimiter`.
4. Edit the text if you like, or pick another type chip. Press **Copy message**.
5. Paste it into the Source Control message box and commit as you normally would.

Press **Refresh** after staging or unstaging more files.

### The panel

| Part | What it does |
|------|--------------|
| Confidence bar | How sure the heuristics are. Low confidence means "check this one". |
| Type chips | `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`. The starred chip is the suggestion, dashed chips are alternatives. |
| Message box | Fully editable. A counter warns when the first line gets too long, and hints flag common style slips. |
| Copy message | Puts the current text on your clipboard. |
| Include scope / body | Toggle the `(scope)` and a short file list as the commit body. |
| Why this suggestion? | Plain-English reasons, so nothing is a black box. |
| Staged files | Status, path and `+/-` line counts for what will be committed. |

Changing the type on an **untouched** suggestion regenerates the wording (for
example `add x` becomes `fix issue in x`). On a message you **edited**, only the type
is swapped and your words stay exactly as you wrote them.

## Example workflows

### 1. Documentation tweak

Stage `README.md`. Suggestion: `docs(readme): update README`. Confidence is high because only documentation changed.

### 2. A new feature with tests

Stage `src/auth/rateLimiter.ts`, `src/auth/session.ts` and `src/auth/rateLimiter.test.ts`.
The new file and new symbols point to a feature, the shared `auth/` folder gives the scope:

```
feat(auth): add Limit and loginRateLimiter
```

The `test` chip appears as an alternative because test files are included.

### 3. A bug fix

Stage a change that adds null checks and a `try/catch` around `JSON.parse` in `src/parser.ts`:

```
fix(parser): fix issue in parseConfig
```

Not quite right? Click **fix**, edit the subject to `handle empty config in parseConfig`, copy.

### 4. Dependency bump

Stage `package.json` and `package-lock.json`: `chore(deps): update dependencies`.

### 5. Nothing staged

If the index is empty the panel says so and tells you how to stage files. Unstaged edits and untracked files are ignored on purpose.

### 6. Long, mixed commits

A commit that touches many unrelated areas gets no scope and a generic subject. That is a
hint to split it. Turn on **Include file list as body** if you want a summary of the biggest changes.

## How suggestions are made

1. **Staged state** is read with read-only Git commands: `git diff --cached` with `--name-status`, `--numstat` and a zero-context patch.
2. **Files are classified** by path: source, test, docs, config, build, CI, lockfile, style, asset.
3. **A limited diff summary** finds added, removed and touched symbols (functions, classes, ...), flags comment-only edits and counts intent keywords in *added* lines (fix, perf, refactor, ...).
4. **Type scoring**: every rule adds weight to a type and records a reason; the heaviest wins and the margin becomes the confidence.
5. **Scope** is proposed only when unambiguous (one dominant folder, a single named file, `deps`, `ci`, `readme`).
6. **Subject** is built as a short imperative phrase and trimmed to your maximum header length at a word boundary.

Large diffs are capped (default 200,000 characters), analysed partly and flagged.
Heuristics are guesses: the message box is there so you stay in charge.

## Settings

| Setting | Default | Meaning |
|---------|---------|---------|
| `betterCommit.maxHeaderLength` | `72` | Maximum length of the first line (30-120). |
| `betterCommit.includeScope` | `true` | Suggest a scope when it is clear. |
| `betterCommit.includeBody` | `false` | Add a file list as the commit body. |
| `betterCommit.showStatusBar` | `true` | Show the **Commit msg** status bar entry. |
| `betterCommit.maxDiffSize` | `200000` | Maximum diff characters analysed. |

VS Code's own `git.path` setting is honoured.

## Requirements and error handling

- Git must be installed. Repositories are found through the built-in VS Code Git extension API when available, and through the Git CLI otherwise.
- Clear, actionable messages are shown for: Git not found, no folder open, folder not in a repository, nothing staged, Git errors and timeouts. Technical detail goes to the **Better Commit Message** output channel, never into pop-ups.

## Safety

- Only these Git commands are ever executed: `rev-parse`, `diff --cached`, `status`, `ls-files` and `--version`. Everything else (`commit`, `add`, `reset`, `push`, `checkout`, ...) is rejected in code before a process starts.
- Git runs with `GIT_OPTIONAL_LOCKS=0`, so even read commands do not take the index lock.
- The VS Code Git API is only read; the SCM input box is never written to.
- The webview has a strict Content Security Policy and escapes every file name and message.

## Development

```bash
npm install
npm run compile   # type-check and build into out/
npm run package   # build a .vsix
```

Press `F5` in VS Code to launch an Extension Development Host.

```
src/analysis/   file classifier, diff parser + summarizer, type/scope/subject inference, generator
src/git/        allow-listed git runner, repo detection, staged change collection
src/ui/         webview HTML, message protocol, error guidance
src/vscode/     VS Code glue: Git API, panel, status bar, config
src/service.ts  editor-independent "suggest for staged changes" use case
```

