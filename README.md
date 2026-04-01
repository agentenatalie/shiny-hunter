# shiny-hunter

[![npm version](https://img.shields.io/npm/v/shiny-hunter)](https://www.npmjs.com/package/shiny-hunter)
[![node](https://img.shields.io/node/v/shiny-hunter)](https://nodejs.org)
[![license](https://img.shields.io/github/license/agentenatalie/shiny-hunter)](./LICENSE)
[![zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)]()

[中文说明](./README.zh.md)

Find your perfect Claude Code buddy.

> Claude Code gives every user a randomly generated companion creature. The species, rarity, hat, eyes, and stats are all derived from a hash of your user ID. **shiny-hunter** brute-force searches for a user ID that produces the exact buddy you want, then injects it into `~/.claude.json`.

## Quick Start

```bash
npx shiny-hunter
```

```bash
npx shiny-hunter --restore   # re-apply your saved buddy
npx shiny-hunter --help
```

Or clone and run directly:

```bash
git clone https://github.com/agentenatalie/shiny-hunter.git
node shiny-hunter/hunt.mjs
```

After the hunt completes, restart Claude Code and type `/buddy` to meet your companion.

## What You Can Choose

| Attribute  | Options |
|------------|---------|
| **Species** (18) | duck, goose, blob, cat, dragon, octopus, owl, penguin, turtle, snail, ghost, axolotl, capybara, cactus, robot, rabbit, mushroom, chonk |
| **Rarity** | common (60%), uncommon (25%), rare (10%), epic (4%), legendary (1%) |
| **Shiny** | yes / no / any (1% chance per roll) |
| **Hat** | none, crown, tophat, propeller, halo, wizard, beanie, tinyduck |
| **Eyes** | `·` `✦` `×` `◉` `@` `°` |
| **Peak stat** | DEBUGGING, PATIENCE, CHAOS, WISDOM, SNARK |
| **Name** | free-text (matched against generated name candidates) |

You can lock in as many or as few attributes as you want. The fewer constraints, the faster the hunt.

## How It Works

Claude Code derives your buddy from a seeded PRNG keyed on `userID`. This tool:

1. Asks what you want (species, rarity, shiny, hat, eyes, peak stat, name).
2. Generates random user IDs and rolls each one through the same derivation logic.
3. Stops when it finds a match, writes the ID to `~/.claude.json`, and saves the result for later restore.

## Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| macOS    | Full   | Includes Keychain OAuth token detection |
| Linux    | Full   | No Keychain needed |
| Windows  | Full   | No Keychain needed |

## Keeping Your Buddy (OAuth Users)

The tool auto-detects whether you use OAuth or an API key.

If Claude Code overwrites your buddy on next launch:

1. **Quick fix** -- run `npx shiny-hunter --restore` to re-inject your saved buddy.
2. **Permanent fix (macOS)** -- use the included `claude-buddy` wrapper script, which extracts your OAuth token from Keychain and passes it via environment variable so Claude never overwrites `userID`:
   ```bash
   cp claude-buddy ~/.local/bin/claude-buddy
   chmod 700 ~/.local/bin/claude-buddy
   ```
   Then launch with `claude-buddy` instead of `claude`.
3. **Manual** -- set `CLAUDE_CODE_OAUTH_TOKEN` in your shell environment before launching Claude.

## Difficulty Reference

| Filters locked | Approx. attempts | Time estimate |
|----------------|-------------------|---------------|
| Species only | ~18 | instant |
| Species + rarity | ~45 (common) to ~1,800 (legendary) | under 1s |
| Species + rarity + hat | ~360 (common) to ~14,400 (legendary) | seconds |
| Species + rarity + hat + eyes | ~2,160 to ~86,400 | seconds to minutes |
| All of the above + shiny | ~216,000 to ~8,640,000 | minutes to hours |

Numbers are rough expectations. Actual time depends on your CPU and luck.

## Security

- **Zero dependencies** -- only Node.js built-ins
- **No network calls** -- everything runs locally
- **31 automated security tests** -- run `node security-test.mjs` to verify
- See [SECURITY.md](./SECURITY.md) for the full security statement

## Requirements

- Node.js 18+
- Claude Code installed

## License

[MIT](./LICENSE)
