#!/usr/bin/env node
import { randomBytes } from 'node:crypto'
import { createInterface as readline } from 'node:readline'
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'

// ─── buddy roll engine ────────────────────────────────────────────────────────

const SALT = 'friend-2026-401'
const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary']
const RARITY_WEIGHTS = { common: 60, uncommon: 25, rare: 10, epic: 4, legendary: 1 }
const SPECIES = ['duck','goose','blob','cat','dragon','octopus','owl','penguin',
                 'turtle','snail','ghost','axolotl','capybara','cactus','robot',
                 'rabbit','mushroom','chonk']
const EYES = ['·', '✦', '×', '◉', '@', '°']
const HATS = ['none','crown','tophat','propeller','halo','wizard','beanie','tinyduck']
const STAT_NAMES = ['DEBUGGING','PATIENCE','CHAOS','WISDOM','SNARK']
const RARITY_FLOOR = { common:5, uncommon:15, rare:25, epic:35, legendary:50 }

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)] }

function rollRarity(rng) {
  const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0)
  let roll = rng() * total
  for (const r of RARITIES) { roll -= RARITY_WEIGHTS[r]; if (roll < 0) return r }
  return 'common'
}

function rollStats(rng, rarity) {
  const floor = RARITY_FLOOR[rarity]
  const peak = pick(rng, STAT_NAMES)
  let dump = pick(rng, STAT_NAMES)
  while (dump === peak) dump = pick(rng, STAT_NAMES)
  const stats = {}
  for (const name of STAT_NAMES) {
    if (name === peak)      stats[name] = Math.min(100, floor + 50 + Math.floor(rng() * 30))
    else if (name === dump) stats[name] = Math.max(1,   floor - 10 + Math.floor(rng() * 15))
    else                    stats[name] = floor + Math.floor(rng() * 40)
  }
  return stats
}

function rollFrom(rng) {
  const rarity = rollRarity(rng)
  const bones = {
    rarity,
    species: pick(rng, SPECIES),
    eye:     pick(rng, EYES),
    hat:     rarity === 'common' ? 'none' : pick(rng, HATS),
    shiny:   rng() < 0.01,
    stats:   rollStats(rng, rarity),
  }
  return { bones, inspirationSeed: Math.floor(rng() * 1e9) }
}

function roll(userId) {
  return rollFrom(mulberry32(hashString(userId + SALT)))
}

function matches(bones, filters) {
  if (filters.species && bones.species !== filters.species) return false
  if (filters.rarity  && bones.rarity  !== filters.rarity)  return false
  if (filters.eye     && bones.eye     !== filters.eye)     return false
  if (filters.hat     && bones.hat     !== filters.hat)     return false
  if (filters.shiny   != null && bones.shiny !== filters.shiny) return false
  return true
}

// ─── interactive prompts ──────────────────────────────────────────────────────

const rl = readline({ input: process.stdin, output: process.stdout })
const ask = (q) => new Promise((resolve) => rl.question(q, resolve))

function menu(label, items, allowAny = true) {
  const lines = items.map((v, i) => `  ${String(i + 1).padStart(2)}. ${v}`).join('\n')
  const anyHint = allowAny ? '   0. any (surprise me)\n' : ''
  return `${label}\n${lines}\n${anyHint}`
}

function parseChoice(input, items) {
  const s = input.trim().toLowerCase()
  if (s === '0' || s === 'any' || s === '') return null
  const n = parseInt(s)
  if (!isNaN(n) && n >= 1 && n <= items.length) return items[n - 1]
  const match = items.find(v => v.toLowerCase() === s)
  if (match) return match
  return undefined // invalid
}

// ─── inject ───────────────────────────────────────────────────────────────────

function getOAuthToken() {
  try {
    const raw = execSync(
      'security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null',
      { encoding: 'utf8' }
    ).trim()
    const parsed = JSON.parse(raw)
    return parsed?.claudeAiOauth?.accessToken ?? null
  } catch {
    return null
  }
}

function inject(userId) {
  const path = homedir() + '/.claude.json'
  let config
  try { config = JSON.parse(readFileSync(path, 'utf8')) }
  catch { config = { hasCompletedOnboarding: true } }

  config.userID = userId
  if (config.oauthAccount?.accountUuid) {
    delete config.oauthAccount.accountUuid
  }

  writeFileSync(path, JSON.stringify(config, null, 2))
}

// ─── display ──────────────────────────────────────────────────────────────────

const RARITY_STARS = { common: '☆ COMMON', uncommon: '✩ UNCOMMON', rare: '★ RARE', epic: '✦ EPIC', legendary: '✦ LEGENDARY' }

function display(bones) {
  const shiny = bones.shiny ? ' ✨ SHINY' : ''
  const hat   = bones.hat !== 'none' ? `  hat: ${bones.hat}` : ''
  const peak  = Object.entries(bones.stats).sort(([,a],[,b]) => b - a)[0]
  const statsLine = Object.entries(bones.stats)
    .map(([k, v]) => `${k.padEnd(10)} ${String(v).padStart(3)}${k === peak[0] ? ' ←' : ''}`)
    .join('\n  ')
  return `
  ${RARITY_STARS[bones.rarity]}${shiny}
  ${bones.species}   eye: ${bones.eye}${hat}

  ${statsLine}
`
}

// ─── estimate difficulty ──────────────────────────────────────────────────────

function estimateAttempts(f) {
  let p = 1
  if (f.species) p *= 1 / SPECIES.length
  if (f.rarity)  p *= RARITY_WEIGHTS[f.rarity] / 100
  if (f.shiny === true)  p *= 0.01
  if (f.shiny === false) p *= 0.99
  if (f.hat) {
    if (f.hat === 'none' && (!f.rarity || f.rarity === 'common')) {
      // common always has none, no penalty
    } else {
      p *= 1 / HATS.length
    }
  }
  if (f.eye) p *= 1 / EYES.length
  const expected = Math.round(1 / p)
  if (expected < 50_000)   return `quick (~${expected.toLocaleString()} attempts)`
  if (expected < 500_000)  return `moderate (~${expected.toLocaleString()} attempts)`
  if (expected < 5_000_000) return `slow (~${expected.toLocaleString()} attempts, up to a minute)`
  return `very slow (~${expected.toLocaleString()} attempts, may take several minutes)`
}

// ─── main ─────────────────────────────────────────────────────────────────────

console.log(`
╔════════════════════════════════╗
║     ✨  shiny-hunter  ✨       ║
║  find your perfect Claude buddy ║
╚════════════════════════════════╝
Answer each question or press Enter to skip (any).
`)

async function main() {
  const filters = {}

  // species
  while (true) {
    const input = await ask(menu('Which species?', SPECIES))
    const v = parseChoice(input, SPECIES)
    if (v === undefined) { console.log(`  Invalid choice, try again.`); continue }
    filters.species = v
    break
  }

  // rarity
  while (true) {
    const input = await ask(menu('\nRarity?', RARITIES))
    const v = parseChoice(input, RARITIES)
    if (v === undefined) { console.log(`  Invalid choice, try again.`); continue }
    filters.rarity = v
    break
  }

  // shiny
  while (true) {
    const input = (await ask('\nShiny? [y = yes / n = no / Enter = any]\n> ')).trim().toLowerCase()
    if (input === 'y' || input === 'yes') { filters.shiny = true; break }
    if (input === 'n' || input === 'no')  { filters.shiny = false; break }
    if (input === '' || input === 'any')  { break }
    console.log('  Just y, n, or Enter.')
  }

  // hat
  while (true) {
    const input = await ask(menu('\nHat?', HATS))
    const v = parseChoice(input, HATS)
    if (v === undefined) { console.log(`  Invalid choice, try again.`); continue }
    filters.hat = v
    break
  }

  // eye
  const eyeDisplay = EYES.map((e, i) => `${i + 1}. ${e}`).join('  ')
  while (true) {
    const input = (await ask(`\nEye style?\n  ${eyeDisplay}  0. any\n> `)).trim()
    const v = parseChoice(input, EYES)
    if (v === undefined) { console.log(`  Invalid choice, try again.`); continue }
    filters.eye = v
    break
  }

  // estimate & hunt
  const difficulty = estimateAttempts(filters)
  console.log(`\nHunting... ${difficulty}`)

  const limit = 50_000_000
  let found = null
  const startMs = Date.now()

  for (let i = 0; i < limit; i++) {
    const userId = randomBytes(32).toString('hex')
    const { bones, inspirationSeed } = roll(userId)
    if (!matches(bones, filters)) continue
    found = { userId, bones, inspirationSeed, attempts: i + 1 }
    break
  }

  if (!found) {
    console.error(`\nNo match found in ${limit.toLocaleString()} attempts. Try fewer filters.`)
    process.exit(1)
  }

  const elapsed = ((Date.now() - startMs) / 1000).toFixed(1)
  console.log(`\nFound after ${found.attempts.toLocaleString()} attempts (${elapsed}s):`)
  console.log(display(found.bones))

  // confirm
  const confirm = await ask('Apply this buddy? [y/n] ')
  rl.close()

  if (confirm.trim().toLowerCase() !== 'y') {
    console.log('\nNo changes made.')
    process.exit(0)
  }

  // inject
  inject(found.userId)

  // check for macOS keychain token
  const token = getOAuthToken()
  if (token) {
    console.log(`
Applied! Now start Claude using:

  CLAUDE_CODE_OAUTH_TOKEN="${token.slice(0, 12)}..." claude

Or if you have the claude-buddy wrapper script, just use that.
Then type /buddy to meet your new companion.
`)
  } else {
    console.log(`
Applied! Restart Claude and type /buddy.
Note: if you log in via OAuth, accountUuid may overwrite the buddy.
See the README for the full workaround.
`)
  }
}

main().catch(e => { console.error(e.message); process.exit(1) })
