#!/usr/bin/env node
import { randomBytes } from 'node:crypto'
import { createInterface as readline } from 'node:readline'
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { homedir, cpus } from 'node:os'
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads'

// ─── constants & helpers ─────────────────────────────────────────────────────

const RESULT_PATH = homedir() + '/.shiny-hunter-result.json'

function showHelp() {
  console.log(`Usage: shiny-hunter [options]

Options:
  --help, -h    Show this help message and exit
  --restore     Restore the last saved buddy result and inject it

When run without flags, starts an interactive hunt session.

Controls:
  ↑/↓           Navigate options
  Enter          Select highlighted option
  Tab            Skip (any / surprise me)
  Type a number  Jump to that option
`)
  process.exit(0)
}

function saveResult(userId, buddyName, bones) {
  writeFileSync(RESULT_PATH, JSON.stringify({ userId, buddyName, bones }, null, 2))
}

function loadResult() {
  try {
    return JSON.parse(readFileSync(RESULT_PATH, 'utf8'))
  } catch {
    return null
  }
}

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
  return { stats, peak }
}

function rollFrom(rng) {
  const rarity = rollRarity(rng)
  const species = pick(rng, SPECIES)
  const eye = pick(rng, EYES)
  const hat = rarity === 'common' ? 'none' : pick(rng, HATS)
  const shiny = rng() < 0.01
  const { stats, peak } = rollStats(rng, rarity)
  const bones = { rarity, species, eye, hat, shiny, stats, peakStat: peak }
  return { bones, inspirationSeed: Math.floor(rng() * 1e9) }
}

function roll(userId) {
  return rollFrom(mulberry32(hashString(userId + SALT)))
}

function matches(bones, filters) {
  if (filters.species  && bones.species  !== filters.species)  return false
  if (filters.rarity   && bones.rarity   !== filters.rarity)   return false
  if (filters.eye      && bones.eye      !== filters.eye)      return false
  if (filters.hat      && bones.hat      !== filters.hat)      return false
  if (filters.peakStat && bones.peakStat !== filters.peakStat) return false
  if (filters.shiny != null && bones.shiny !== filters.shiny)  return false
  return true
}

// ─── fast parallel search ────────────────────────────────────────────────────

const HEX = '0123456789abcdef'

function fastHexId(rng) {
  let id = ''
  for (let j = 0; j < 64; j++) {
    id += HEX[(rng() * 16) | 0]
  }
  return id
}

function workerSearch(filters, seed) {
  const idRng = mulberry32(seed)
  for (let i = 0; ; i++) {
    const userId = fastHexId(idRng)
    const { bones, inspirationSeed } = roll(userId)
    if (matches(bones, filters)) {
      parentPort.postMessage({ type: 'found', userId, bones, inspirationSeed, attempts: i + 1 })
      return
    }
    if (i % 50000 === 0) {
      parentPort.postMessage({ type: 'progress', attempts: i })
    }
  }
}

if (!isMainThread) {
  workerSearch(workerData.filters, workerData.seed)
}

// ─── visual previews ─────────────────────────────────────────────────────────

const SPECIES_PREVIEW = {
  duck:      '🦆', goose:    '🪿', blob:     '🫠', cat:       '🐱',
  dragon:    '🐉', octopus:  '🐙', owl:      '🦉', penguin:   '🐧',
  turtle:    '🐢', snail:    '🐌', ghost:    '👻', axolotl:   '🦎',
  capybara:  '🦫', cactus:   '🌵', robot:    '🤖', rabbit:    '🐰',
  mushroom:  '🍄', chonk:    '🐾',
}

const RARITY_PREVIEW = {
  common:    '★        60%',
  uncommon:  '★★       25%',
  rare:      '★★★      10%',
  epic:      '★★★★      4%',
  legendary: '★★★★★     1%',
}

const HAT_PREVIEW = {
  none:      '  (bare head)',
  crown:     '👑 crown',
  tophat:    '🎩 top hat',
  propeller: '🧢 propeller cap',
  halo:      '😇 halo',
  wizard:    '🧙 wizard hat',
  beanie:    '🧶 beanie',
  tinyduck:  '🦆 tiny duck on head',
}

const STAT_PREVIEW = {
  DEBUGGING: '🐛 bug whisperer',
  PATIENCE:  '🧘 zen master',
  CHAOS:     '🔥 chaos gremlin',
  WISDOM:    '🧠 big brain',
  SNARK:     '😏 sass machine',
}

// ─── interactive selector ────────────────────────────────────────────────────

function select(title, items, previewMap) {
  return new Promise((resolve) => {
    const skipItem = '✦ any (surprise me)'
    const allItems = [skipItem, ...items]
    let cursor = 1  // start on first real item, not "any"
    const total = allItems.length

    function getPreview(item) {
      if (item === skipItem) return ''
      if (previewMap && previewMap[item]) return `  ${previewMap[item]}`
      return ''
    }

    function render() {
      // Move cursor up to overwrite previous render
      if (rendered) process.stdout.write(`\x1b[${total + 2}A`)
      process.stdout.write(`\x1b[2K  ${title}\n`)
      for (let i = 0; i < total; i++) {
        const marker = i === cursor ? '\x1b[36m❯\x1b[0m' : ' '
        const label = allItems[i]
        const preview = getPreview(label)
        const highlight = i === cursor ? `\x1b[1m${label}${preview}\x1b[0m` : `${label}${preview}`
        process.stdout.write(`\x1b[2K  ${marker} ${highlight}\n`)
      }
      process.stdout.write(`\x1b[2K  \x1b[2m↑↓ navigate · enter select · tab skip\x1b[0m\n`)
      rendered = true
    }

    let rendered = false
    process.stdin.setRawMode(true)
    process.stdin.resume()
    render()

    function onKey(key) {
      // Arrow up
      if (key[0] === 0x1b && key[1] === 0x5b && key[2] === 0x41) {
        cursor = (cursor - 1 + total) % total
        render()
        return
      }
      // Arrow down
      if (key[0] === 0x1b && key[1] === 0x5b && key[2] === 0x42) {
        cursor = (cursor + 1) % total
        render()
        return
      }
      // Enter
      if (key[0] === 0x0d) {
        cleanup()
        resolve(cursor === 0 ? null : allItems[cursor])
        return
      }
      // Tab = skip
      if (key[0] === 0x09) {
        cleanup()
        resolve(null)
        return
      }
      // Ctrl-C
      if (key[0] === 0x03) {
        cleanup()
        process.exit(0)
      }
      // Number keys 0-9
      if (key[0] >= 0x30 && key[0] <= 0x39) {
        const n = key[0] - 0x30
        if (n === 0) {
          cleanup()
          resolve(null)
          return
        }
        if (n >= 1 && n <= items.length) {
          cursor = n  // offset by 1 because of skip item
          render()
          // Auto-confirm on number press
          cleanup()
          resolve(allItems[cursor])
          return
        }
      }
      // Letters: jump to first match
      const ch = String.fromCharCode(key[0]).toLowerCase()
      if (ch >= 'a' && ch <= 'z') {
        const idx = allItems.findIndex((v, i) => i > 0 && v[0]?.toLowerCase() === ch)
        if (idx !== -1) {
          cursor = idx
          render()
        }
      }
    }

    function cleanup() {
      process.stdin.removeListener('data', onKey)
      process.stdin.setRawMode(false)
      process.stdin.pause()
    }

    process.stdin.on('data', onKey)
  })
}

function selectYesNo(title) {
  return new Promise((resolve) => {
    const items = ['✨ yes (shiny!)', '  no', '✦ any (surprise me)']
    let cursor = 2  // default to "any"
    const total = items.length

    function render() {
      if (rendered) process.stdout.write(`\x1b[${total + 2}A`)
      process.stdout.write(`\x1b[2K  ${title}\n`)
      for (let i = 0; i < total; i++) {
        const marker = i === cursor ? '\x1b[36m❯\x1b[0m' : ' '
        const highlight = i === cursor ? `\x1b[1m${items[i]}\x1b[0m` : items[i]
        process.stdout.write(`\x1b[2K  ${marker} ${highlight}\n`)
      }
      process.stdout.write(`\x1b[2K  \x1b[2m↑↓ navigate · enter select · tab skip\x1b[0m\n`)
      rendered = true
    }

    let rendered = false
    process.stdin.setRawMode(true)
    process.stdin.resume()
    render()

    function onKey(key) {
      if (key[0] === 0x1b && key[1] === 0x5b && key[2] === 0x41) {
        cursor = (cursor - 1 + total) % total; render(); return
      }
      if (key[0] === 0x1b && key[1] === 0x5b && key[2] === 0x42) {
        cursor = (cursor + 1) % total; render(); return
      }
      if (key[0] === 0x0d) {
        cleanup(); resolve(cursor === 0 ? true : cursor === 1 ? false : null); return
      }
      if (key[0] === 0x09) { cleanup(); resolve(null); return }
      if (key[0] === 0x03) { cleanup(); process.exit(0) }
      // y/n shortcuts
      const ch = String.fromCharCode(key[0]).toLowerCase()
      if (ch === 'y') { cleanup(); resolve(true); return }
      if (ch === 'n') { cleanup(); resolve(false); return }
    }

    function cleanup() {
      process.stdin.removeListener('data', onKey)
      process.stdin.setRawMode(false)
      process.stdin.pause()
    }

    process.stdin.on('data', onKey)
  })
}

function askText(question) {
  const rl = readline({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

// ─── input validation (for security tests) ──────────────────────────────────

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

function detectAuth() {
  let hasOAuth = false
  try {
    const config = JSON.parse(readFileSync(homedir() + '/.claude.json', 'utf8'))
    hasOAuth = !!config.oauthAccount?.accountUuid
  } catch { /* no config or parse error */ }

  if (process.platform === 'darwin') {
    try {
      const raw = execSync(
        'security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null',
        { encoding: 'utf8' }
      ).trim()
      const parsed = JSON.parse(raw)
      const token = parsed?.claudeAiOauth?.accessToken ?? null
      if (token) return { type: 'oauth', hasOAuth: true, token }
    } catch { /* no keychain entry */ }
  }

  if (hasOAuth) return { type: 'oauth', hasOAuth: true, token: null }
  return { type: 'api', hasOAuth: false, token: null }
}

function inject(userId, name) {
  const path = homedir() + '/.claude.json'
  let config
  try { config = JSON.parse(readFileSync(path, 'utf8')) }
  catch { config = { hasCompletedOnboarding: true } }

  config.userID = userId
  if (config.oauthAccount?.accountUuid) {
    delete config.oauthAccount.accountUuid
  }
  if (name) {
    config.companion = {
      ...(config.companion ?? {}),
      name,
    }
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

function printPostInject() {
  const auth = detectAuth()
  if (auth.type === 'oauth' && auth.token) {
    console.log(`
Applied! Now start Claude using:

  CLAUDE_CODE_OAUTH_TOKEN="${auth.token.slice(0, 12)}..." claude

Or if you have the claude-buddy wrapper script, just use that.
Then type /buddy to meet your new companion.

Tip: re-run with --restore to reapply this buddy later.
`)
  } else if (auth.type === 'oauth') {
    console.log(`
Applied! Warning: logging in via OAuth will overwrite the buddy userID.

To preserve it, set CLAUDE_CODE_OAUTH_TOKEN in your environment before
launching Claude. See the README for the full workaround.

Then type /buddy to meet your new companion.

Tip: re-run with --restore to reapply this buddy later.
`)
  } else {
    console.log(`
Applied! Restart Claude and type /buddy.

Tip: re-run with --restore to reapply this buddy later.
`)
  }
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
  if (f.eye)      p *= 1 / EYES.length
  if (f.peakStat) p *= 1 / STAT_NAMES.length
  const expected = Math.round(1 / p)
  if (expected < 50_000)   return `quick (~${expected.toLocaleString()} attempts)`
  if (expected < 500_000)  return `moderate (~${expected.toLocaleString()} attempts)`
  if (expected < 5_000_000) return `slow (~${expected.toLocaleString()} attempts, up to a minute)`
  return `very slow (~${expected.toLocaleString()} attempts, may take several minutes)`
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--help') || args.includes('-h')) {
    showHelp()
  }

  if (args.includes('--restore')) {
    const saved = loadResult()
    if (!saved) {
      console.error('No saved result found. Run a hunt first.')
      process.exit(1)
    }
    console.log('\nRestoring saved buddy:')
    console.log(display(saved.bones))
    inject(saved.userId, saved.buddyName)
    printPostInject()
    process.exit(0)
  }

  console.log(`
  ┌──────────────────────────────────┐
  │       ✨  shiny-hunter  ✨        │
  │   find your perfect Claude buddy  │
  └──────────────────────────────────┘
`)

  const filters = {}

  // species
  const species = await select('Which species?', SPECIES, SPECIES_PREVIEW)
  if (species) filters.species = species
  console.log(`  → ${species ?? 'any'}\n`)

  // rarity
  const rarity = await select('Rarity?', RARITIES, RARITY_PREVIEW)
  if (rarity) filters.rarity = rarity
  console.log(`  → ${rarity ?? 'any'}\n`)

  // shiny
  const shiny = await selectYesNo('Shiny?')
  if (shiny != null) filters.shiny = shiny
  console.log(`  → ${shiny === true ? 'yes ✨' : shiny === false ? 'no' : 'any'}\n`)

  // hat
  const hat = await select('Hat?', HATS, HAT_PREVIEW)
  if (hat) filters.hat = hat
  console.log(`  → ${hat ?? 'any'}\n`)

  // eye
  const eyePreview = Object.fromEntries(EYES.map(e => [e, `  looks like this: ( ${e} ‿ ${e} )`]))
  const eye = await select('Eye style?', EYES, eyePreview)
  if (eye) filters.eye = eye
  console.log(`  → ${eye ?? 'any'}\n`)

  // peak stat
  const peakStat = await select('Peak stat?', STAT_NAMES, STAT_PREVIEW)
  if (peakStat) filters.peakStat = peakStat
  console.log(`  → ${peakStat ?? 'any'}\n`)

  // name
  const nameInput = await askText('  Name your buddy (or Enter to skip): ')
  const buddyName = nameInput.length > 0 ? nameInput : null
  if (buddyName) console.log(`  → ${buddyName}\n`)

  // estimate & hunt
  const difficulty = estimateAttempts(filters)
  const numWorkers = Math.max(1, cpus().length)
  console.log(`\n  Hunting with ${numWorkers} threads... ${difficulty}`)

  const huntStartMs = Date.now()
  const found = await new Promise((resolve) => {
    const startMs = huntStartMs
    const timeLimit = 5 * 60 * 1000 // 5 minutes
    const workers = []
    let totalAttempts = 0
    let done = false
    let lastProgressMs = startMs

    function cleanup() {
      if (done) return
      done = true
      for (const w of workers) w.terminate()
    }

    const timer = setTimeout(() => {
      cleanup()
      resolve(null)
    }, timeLimit)

    const progressInterval = setInterval(() => {
      const now = Date.now()
      const elapsedSec = ((now - startMs) / 1000).toFixed(1)
      const rate = Math.round(totalAttempts / ((now - startMs) / 1000))
      process.stdout.write(`\r  ${totalAttempts.toLocaleString()} attempts | ${rate.toLocaleString()}/sec | ${elapsedSec}s | ${numWorkers} threads`)
    }, 500)

    for (let i = 0; i < numWorkers; i++) {
      const seed = randomBytes(4).readUInt32LE()
      const w = new Worker(new URL(import.meta.url), {
        workerData: { filters, seed }
      })
      w.on('message', (msg) => {
        if (msg.type === 'progress') {
          totalAttempts += 50000
        } else if (msg.type === 'found' && !done) {
          clearTimeout(timer)
          clearInterval(progressInterval)
          cleanup()
          resolve({ ...msg, totalAttempts })
        }
      })
      w.on('error', () => {})
      w.on('exit', () => {})
      workers.push(w)
    }
  })

  process.stdout.write('\r' + ' '.repeat(80) + '\r')

  if (!found) {
    console.error(`\n  No match found in 5 minutes. Try fewer filters.`)
    process.exit(1)
  }

  const elapsed = ((Date.now() - huntStartMs) / 1000).toFixed(1)
  const nameLabel = buddyName ? `  Name: ${buddyName}\n` : ''
  console.log(`\n  Found after ~${found.totalAttempts.toLocaleString()} attempts (${elapsed}s):`)
  console.log(nameLabel + display(found.bones))

  // confirm
  const answer = await askText('  Apply this buddy? [y/n] ')

  if (answer.toLowerCase() !== 'y') {
    console.log('\n  No changes made.')
    process.exit(0)
  }

  inject(found.userId, buddyName)
  saveResult(found.userId, buddyName, found.bones)

  printPostInject()
}

if (isMainThread) {
  main().catch(e => { console.error(e.message); process.exit(1) })
}
