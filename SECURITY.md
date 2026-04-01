# Security

## Statement

shiny-hunter modifies one field in one local config file (`~/.claude.json`) and saves hunt results to `~/.shiny-hunter-result.json` for the `--restore` flag. It uses cross-platform auth detection (macOS Keychain on Darwin, config-based OAuth elsewhere). It makes no network connections, executes no remote code, and cannot be used to inject malware.

Run the automated test suite yourself to verify:

```bash
node security-test.mjs
```

Expected output: **31 passed, 0 failed.**

---

## What the script does (complete list)

| Action | Detail |
|--------|--------|
| Reads stdin | Your menu choices only |
| Reads `~/.claude.json` | To preserve existing settings |
| Writes `~/.claude.json` | Sets `userID` and optionally `companion.name` |
| Writes `~/.shiny-hunter-result.json` | Saves last hunt result for `--restore` |
| Reads macOS Keychain | One fixed entry: `Claude Code-credentials` — only to display a startup hint, never sent anywhere |
| No network calls | Zero outbound connections |
| No external dependencies | Only Node.js built-ins |

---

## Attack surface analysis

### User input → shell (injection)

**Not possible.** The only shell command in the entire codebase is:

```js
execSync('security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null', ...)
```

This string is **hardcoded**. No user input is ever interpolated into a shell command.

### User input → file path (path traversal)

**Not possible.** The write path is always:

```js
homedir() + '/.claude.json'
```

`homedir()` is a system call (`node:os`), not derived from user input. The path never changes.

### Buddy name → JSON injection

**Not possible.** The name is written via `JSON.stringify()` which escapes all special characters. A name like `", "evil": true, "x": "` serializes to `"\", \"evil\": true, \"x\": \""` — a valid string value, not a structural break.

### Malicious menu choice → unexpected behavior

**Not possible.** `parseChoice()` validates every menu input against a hardcoded whitelist. Any input not in the whitelist is rejected and the question is asked again. A choice can only ever resolve to one of the predefined values (or `null` for "any").

### Supply chain attack via dependencies

**Not possible** from `package.json`. There are no third-party dependencies — only Node.js built-ins. Nothing is downloaded when you run the script.

### Hook injection via `.claude` directory

**Not present.** The repo contains no `.claude` directory, no `settings.json` hooks, and no `.mcp.json`. Cloning this repo and running `claude` in it cannot auto-execute any code.

---

## What the security test checks

| # | Category | Tests |
|---|----------|-------|
| 1 | Static analysis | No `eval`, `new Function`, network imports, external URLs, base64 decode, dynamic shell commands, `__proto__` pollution |
| 2 | Input validation | `parseChoice` rejects 13 malicious strings and 1,000 random fuzz inputs |
| 3 | Shell injection | Buddy name never appears in any shell command |
| 4 | JSON injection | 11 injection payloads all round-trip cleanly through `JSON.stringify` / `JSON.parse` |
| 5 | File path | Write path uses `homedir()`, no user-controlled component, result file path safety, `--restore` uses `readFileSync` only |
| 6 | Network | No http/https/net/fetch imports, no socket calls |
| 7 | Dependencies | Zero third-party packages in `package.json` |
| 8 | userId integrity | 1,000 generated IDs are all 64-char hex |
| 9 | Repo structure | No `.claude/hooks`, no `.claude/settings.json`, no `.mcp.json` |

---

## Remaining caveats (honest)

1. **Keychain access**: The script reads `Claude Code-credentials` from macOS Keychain to display a startup hint. The token is printed (truncated) to your terminal and is **never sent anywhere**. If you don't trust this, remove the `getOAuthToken()` call — the inject still works without it.

2. **Buddy name length**: There is no enforced maximum length. A very long name makes `~/.claude.json` larger but causes no security issue.

3. **Trust the source**: These guarantees apply to the code in this repo. If you run a modified version from an untrusted fork, audit it yourself using the same test suite.

4. **`claude-buddy` wrapper** reads the same Keychain entry and passes the token as an environment variable to `claude`. The wrapper script is `chmod 700` (owner-only). If you're concerned, inspect it: `cat ~/.local/bin/claude-buddy`.
