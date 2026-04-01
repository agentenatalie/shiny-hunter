<h1 align="center">shiny-hunter</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/shiny-hunter"><img src="https://img.shields.io/npm/v/shiny-hunter" alt="npm version"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/node/v/shiny-hunter" alt="node"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/agentenatalie/shiny-hunter" alt="license"></a>
  <img src="https://img.shields.io/badge/dependencies-0-brightgreen" alt="zero dependencies">
</p>

<p align="center"><a href="./README.zh.md">中文说明</a></p>

Your Claude Code companion is decided by a hash of your user ID. You didn't get to choose. **Until now.**

```
  ┌──────────────────────────────────┐
  │       ✨  shiny-hunter  ✨        │
  │   find your perfect Claude buddy  │
  └──────────────────────────────────┘
```

Think of it like soft-resetting for a shiny starter -- except instead of mashing buttons for hours, your CPU does the mashing. Pick your dream species, rarity, hat, eyes, and stats, and let brute force do the rest.

## Quick Start

```bash
npx shiny-hunter
```

Answer 7 questions. Wait. Meet your new best friend. That's it.

```bash
npx shiny-hunter --restore   # buddy got overwritten? one command to bring it back
npx shiny-hunter --help      # for the cautious types
```

Or clone if you want to read every line first (respect):

```bash
git clone https://github.com/agentenatalie/shiny-hunter.git
node shiny-hunter/hunt.mjs
```

After the hunt, restart Claude Code and type `/buddy`.

## The Menu

| Attribute | Options | Notes |
|-----------|---------|-------|
| **Species** | duck, goose, blob, cat, dragon, octopus, owl, penguin, turtle, snail, ghost, axolotl, capybara, cactus, robot, rabbit, mushroom, chonk | 18 creatures. Yes, chonk is a species. |
| **Rarity** | common, uncommon, rare, epic, legendary | Legendary is 1%. You've been warned. |
| **Shiny** | yes / no / any | 1% chance. The flex is real. |
| **Hat** | none, crown, tophat, propeller, halo, wizard, beanie, tinyduck | A duck wearing a tinyduck hat. Think about it. |
| **Eyes** | `·` `✦` `×` `◉` `@` `°` | `◉` sees into your soul. |
| **Peak stat** | DEBUGGING, PATIENCE, CHAOS, WISDOM, SNARK | Max SNARK is the correct answer. |
| **Name** | anything you want | Name it after your cat. We won't judge. |

Skip any question to leave it up to fate. Fewer filters = faster hunt.

## How It Works

Claude Code's buddy system feeds your `userID` through a seeded PRNG to roll species, rarity, hat, eyes, shiny, and stats. The roll is deterministic -- same ID, same buddy, every time.

This tool:
1. Asks what you want.
2. Generates millions of random user IDs, rolling each one through the same logic.
3. Finds a match, writes it to `~/.claude.json`, saves a backup for `--restore`.

It's like mining Bitcoin, except you get a cartoon ghost in a wizard hat instead of money.

## Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| macOS | Full | OAuth auto-detected via Keychain |
| Linux | Full | Works great, no Keychain needed |
| Windows | Full | Works great, no Keychain needed |

## Keeping Your Buddy (OAuth Users)

The tool auto-detects OAuth vs API key. But OAuth users have one problem: Claude may overwrite your custom `userID` on next launch. Three fixes, pick one:

1. **The easy way** -- just run `npx shiny-hunter --restore` whenever it happens. Takes 1 second.
2. **The permanent way (macOS)** -- use the included `claude-buddy` wrapper:
   ```bash
   cp claude-buddy ~/.local/bin/claude-buddy
   chmod 700 ~/.local/bin/claude-buddy
   ```
   Launch with `claude-buddy` instead of `claude`. It handles everything.
3. **The manual way** -- set `CLAUDE_CODE_OAUTH_TOKEN` in your shell before launching Claude.

API key users: you're fine. Your buddy stays forever. Go relax.

## How Long Will It Take?

| What you asked for | Attempts | Wall time |
|--------------------|----------|-----------|
| Just a species | ~18 | Blink and you'll miss it |
| Species + legendary | ~1,800 | Still fast |
| Species + legendary + wizard hat | ~14,400 | A few seconds |
| All that + specific eyes | ~86,400 | Grab some water |
| All that + SHINY | ~8,640,000 | Go touch grass, come back later |

Your CPU speed and RNG luck will vary. The progress bar keeps you company.

## Security

This tool writes to one file (`~/.claude.json`) and reads from one file (macOS Keychain, optionally). That's it. No network. No dependencies. No surprises.

- **Zero dependencies** -- only Node.js built-ins. `node_modules` stays empty.
- **No network calls** -- not even a DNS lookup. Airplane mode friendly.
- **31 security tests** -- run `node security-test.mjs` and see for yourself.
- Full analysis in [SECURITY.md](./SECURITY.md).

## Requirements

- Node.js 18+
- Claude Code installed
- Patience (optional, but recommended for shiny legendary hunts)

## References

- [Claude Code Buddy 机制解析](https://linux.do/t/topic/1871870)
- [Shiny Hunter 讨论帖](https://linux.do/t/topic/1873901/13)

## License

[MIT](./LICENSE) -- do whatever you want with it.
