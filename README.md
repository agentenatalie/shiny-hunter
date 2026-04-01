# shiny-hunter ✨

Find your perfect Claude Code buddy, one roll at a time.

```
╔════════════════════════════════╗
║     ✨  shiny-hunter  ✨       ║
║  find your perfect Claude buddy ║
╚════════════════════════════════╝
```

## Usage

```bash
npx shiny-hunter
```

Or clone and run:

```bash
git clone https://github.com/YOUR_USERNAME/shiny-hunter
node shiny-hunter/hunt.mjs
```

## What it does

Walks you through a short questionnaire:

- **Species** — duck, rabbit, dragon, axolotl... (or surprise me)
- **Rarity** — common → legendary
- **Shiny** — yes / no / don't care
- **Hat** — none, crown, tophat, wizard...
- **Eye style** — · ✦ × ◉ @ °

Then hunts through random user IDs until it finds one that rolls your exact combination, and injects it into `~/.claude.json`.

Restart Claude and type `/buddy` to meet your new companion.

## How it works

Claude Code's buddy system derives your pet from a hash of your `userID` field in `~/.claude.json`. This script brute-forces a `userID` that hashes to whatever you asked for, then writes it in.

**macOS note:** If you log in via OAuth, Claude writes an `accountUuid` that takes priority over `userID`. The script removes it automatically. To keep it gone, start Claude with:

```bash
CLAUDE_CODE_OAUTH_TOKEN="$(security find-generic-password -s 'Claude Code-credentials' -w | python3 -c "import sys,json; print(json.load(sys.stdin)['claudeAiOauth']['accessToken'])")" claude
```

Or use the included `claude-buddy` wrapper (see below).

## claude-buddy wrapper (macOS)

Keeps `accountUuid` out on every launch:

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/shiny-hunter/main/claude-buddy -o ~/.local/bin/claude-buddy
chmod 700 ~/.local/bin/claude-buddy
```

Then use `claude-buddy` instead of `claude`.

## Requirements

- Node.js 18+
- Claude Code installed
- macOS (for the OAuth workaround; Linux users may not need it)
