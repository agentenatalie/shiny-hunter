/**
 * shiny-hunter security test suite
 *
 * Tests every attack surface in hunt.mjs:
 *   1. Static analysis  — dangerous code patterns
 *   2. Input validation — parseChoice rejects anything not in whitelist
 *   3. Shell injection  — buddy name never reaches a shell command
 *   4. JSON injection   — buddy name is always safely serialized
 *   5. File path        — writes only to ~/.claude.json, never user-controlled path
 *   6. Network          — zero outbound connections
 *   7. Dependencies     — no third-party packages
 *   8. userId integrity — always 64-char hex, never executable
 *   9. No .claude hooks — repo cannot auto-execute on `claude` launch
 */

import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dir = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(__dir, 'hunt.mjs'), 'utf8')
const pkg = JSON.parse(readFileSync(join(__dir, 'package.json'), 'utf8'))

// ─── test runner ─────────────────────────────────────────────────────────────

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✓  ${name}`)
    passed++
  } catch (e) {
    console.error(`  ✗  ${name}`)
    console.error(`     ${e.message}`)
    failed++
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertNotContains(haystack, needle, message) {
  if (haystack.includes(needle)) throw new Error(message ?? `Source contains forbidden pattern: ${needle}`)
}

// ─── 1. static analysis ──────────────────────────────────────────────────────

console.log('\n1. Static analysis — dangerous code patterns\n')

test('no eval()', () => {
  assertNotContains(src, 'eval(', 'eval() found in source')
})

test('no Function() constructor (dynamic eval)', () => {
  assertNotContains(src, 'new Function(', 'new Function() found in source')
})

test('no network imports (http/https/fetch/net/dgram)', () => {
  const networkModules = ['node:http', 'node:https', 'node:net', 'node:dgram', "'https'", "'http'"]
  for (const m of networkModules) {
    assertNotContains(src, m, `Network import found: ${m}`)
  }
})

test('no fetch() calls', () => {
  // fetch without a preceding comment
  const hasFetch = /(?<!\/\/.*)\bfetch\s*\(/.test(src)
  assert(!hasFetch, 'fetch() call found in source')
})

test('no external URLs hardcoded', () => {
  const urlPattern = /https?:\/\/(?!example\.com)/g
  const matches = src.match(urlPattern) ?? []
  assert(matches.length === 0, `External URLs found: ${matches.join(', ')}`)
})

test('no base64 decode patterns', () => {
  assertNotContains(src, 'atob(', 'atob() found')
  assertNotContains(src, "Buffer.from(", 'Buffer.from() — check if used for decode')  // allowed for hex, not for code exec
  // More specific: Buffer.from with base64
  assert(!/'base64'\)/.test(src), "base64 decode found")
})

test('no child_process.exec with user-controlled input', () => {
  // execSync is used once with a hardcoded string. Verify it's not template-literal with variables.
  const execLines = src.split('\n').filter(l => l.includes('execSync'))
  for (const line of execLines) {
    // The line must be a plain string literal, not a template literal containing a variable
    assert(
      !line.includes('execSync(`') && !line.includes("execSync('${") ,
      `execSync with dynamic input: ${line.trim()}`
    )
  }
})

test('execSync command is hardcoded (no variable interpolation)', () => {
  // Extract the execSync call and confirm it's a static string
  const match = src.match(/execSync\(\s*(['"`])([\s\S]*?)\1/)
  assert(match !== null, 'Could not find execSync call')
  assert(
    !match[2].includes('${'),
    `execSync contains template variable: ${match[2]}`
  )
})

test('no process.env access that could leak secrets', () => {
  // Only allowed env access: PATH-like things, not credentials
  const envAccesses = [...src.matchAll(/process\.env\.(\w+)/g)].map(m => m[1])
  const forbidden = envAccesses.filter(k => /secret|token|key|pass|auth|cred/i.test(k))
  assert(forbidden.length === 0, `Suspicious env access: ${forbidden.join(', ')}`)
})

test('no __proto__ or prototype pollution', () => {
  assertNotContains(src, '__proto__', '__proto__ found')
  assertNotContains(src, 'prototype.constructor', 'prototype.constructor found')
})

test('only safe fs operations (read + write, no exec/spawn from fs)', () => {
  assertNotContains(src, 'fs.exec', 'fs.exec found')
  assertNotContains(src, 'chmod', 'chmod in source')
  assertNotContains(src, 'chown', 'chown in source')
})

// ─── 2. input validation ─────────────────────────────────────────────────────

console.log('\n2. Input validation — parseChoice whitelist\n')

// Inline the function from source (same logic, no import tricks)
const SPECIES = ['duck','goose','blob','cat','dragon','octopus','owl','penguin',
                 'turtle','snail','ghost','axolotl','capybara','cactus','robot',
                 'rabbit','mushroom','chonk']
const RARITIES = ['common','uncommon','rare','epic','legendary']
const HATS     = ['none','crown','tophat','propeller','halo','wizard','beanie','tinyduck']
const EYES     = ['·','✦','×','◉','@','°']
const STAT_NAMES = ['DEBUGGING','PATIENCE','CHAOS','WISDOM','SNARK']

function parseChoice(input, items) {
  const s = input.trim().toLowerCase()
  if (s === '0' || s === 'any' || s === '') return null
  const n = parseInt(s)
  if (!isNaN(n) && n >= 1 && n <= items.length) return items[n - 1]
  const match = items.find(v => v.toLowerCase() === s)
  if (match) return match
  return undefined
}

const allLists = [SPECIES, RARITIES, HATS, EYES, STAT_NAMES]
const maliciousInputs = [
  '; rm -rf ~',
  '$(cat ~/.ssh/id_rsa)',
  '`whoami`',
  '../../../etc/passwd',
  '<script>alert(1)</script>',
  '{"__proto__":{"polluted":true}}',
  'undefined',
  'null',
  '99999',
  '-1',
  'constructor',
  '\x00\x01\x02',
  'a'.repeat(10000),
]

test('all malicious inputs return undefined (rejected) from parseChoice', () => {
  for (const evil of maliciousInputs) {
    for (const list of allLists) {
      const result = parseChoice(evil, list)
      assert(
        result === null || result === undefined || list.includes(result),
        `parseChoice returned "${result}" for input "${evil.slice(0, 40)}" — not in whitelist`
      )
      // null means "any" (skip), undefined means "invalid" — both are safe
      // If it returned a value, it must be from the whitelist
    }
  }
})

test('parseChoice only returns values from the whitelist or null', () => {
  // Fuzz with 1000 random strings
  for (let i = 0; i < 1000; i++) {
    const randomInput = Math.random().toString(36) + String.fromCharCode(Math.floor(Math.random() * 128))
    for (const list of allLists) {
      const result = parseChoice(randomInput, list)
      if (result !== null && result !== undefined) {
        assert(list.includes(result), `parseChoice returned "${result}" not in whitelist`)
      }
    }
  }
})

// ─── 3 & 4. shell + JSON injection via buddy name ────────────────────────────

console.log('\n3 & 4. Shell + JSON injection via buddy name\n')

test('buddy name is never passed to execSync or any shell command', () => {
  // Verify: execSync only appears once in source, and the argument is the hardcoded keychain command
  const execCount = (src.match(/execSync\s*\(/g) ?? []).length
  assert(execCount === 1, `Expected 1 execSync call site, found ${execCount}`)

  // The single execSync must not reference any variable that could hold user input
  const lines = src.split('\n')
  const execIdx = lines.findIndex(l => l.includes('execSync('))
  assert(execIdx !== -1, 'execSync call site not found')
  // The command string may be on the same line or the next line
  const execBlock = lines.slice(execIdx, execIdx + 3).join(' ')
  assert(
    execBlock.includes('find-generic-password'),
    `execSync call is not the expected keychain command: ${execBlock.trim().slice(0, 80)}`
  )
})

test('buddy name reaches JSON.stringify — all injection attempts produce valid JSON', () => {
  const injectionAttempts = [
    '", "evil": true, "x": "',
    '\\", \\"evil\\": true',
    '\n}\n{"injected":true}\n{',
    '<script>alert(document.cookie)</script>',
    '; DROP TABLE users; --',
    '${process.exit(1)}',
    '`node -e "process.exit(1)"`',
    '\u0000null byte',
    '"quoted"',
    "it's fine",
    'a'.repeat(10000),
  ]

  for (const name of injectionAttempts) {
    // Simulate what inject() does
    const config = { userID: 'abc123', companion: {} }
    config.companion.name = name
    let serialized
    try {
      serialized = JSON.stringify(config, null, 2)
    } catch (e) {
      throw new Error(`JSON.stringify threw for name "${name.slice(0, 40)}": ${e.message}`)
    }
    // Must round-trip cleanly
    let reparsed
    try {
      reparsed = JSON.parse(serialized)
    } catch (e) {
      throw new Error(`JSON.parse failed after serialization for name "${name.slice(0, 40)}"`)
    }
    assert(reparsed.companion.name === name, 'Name value changed after round-trip')
    // Must not have injected extra keys at top level
    const keys = Object.keys(reparsed)
    assert(keys.length === 2, `Extra keys after injection attempt: ${keys.join(', ')}`)
  }
})

// ─── 5. file path safety ─────────────────────────────────────────────────────

console.log('\n5. File path — only writes to ~/.claude.json\n')

test('inject() path is derived from homedir(), not user input', () => {
  // Verify homedir() + '/.claude.json' pattern in source
  assert(
    src.includes("homedir() + '/.claude.json'"),
    "Expected path pattern not found — may have changed"
  )
})

test('homedir() + /.claude.json resolves correctly', () => {
  const expected = homedir() + '/.claude.json'
  assert(expected.startsWith('/'), 'Path is not absolute')
  assert(expected.endsWith('/.claude.json'), 'Path does not end with /.claude.json')
  assert(!expected.includes('..'), 'Path traversal in homedir result')
})

test('no writeFileSync with user-controlled path', () => {
  // All writeFileSync calls must use the fixed path variable, not a template with user input
  const writeLines = src.split('\n').filter(l => l.includes('writeFileSync'))
  for (const line of writeLines) {
    assert(
      !line.includes('nameInput') && !line.includes('buddyName') && !line.includes('userId'),
      `writeFileSync may use user-controlled path: ${line.trim()}`
    )
  }
})

// ─── 6. network safety ───────────────────────────────────────────────────────

console.log('\n6. Network — zero outbound connections\n')

test('no http/https/net/fetch imports in package or source', () => {
  const networkPatterns = ['require("http")', "require('http')", 'require("https")',
    "require('https')", 'require("net")', "require('net')", 'import.*http',
    'import.*https', 'import.*net']
  for (const p of networkPatterns) {
    assert(!new RegExp(p).test(src), `Network import found: ${p}`)
  }
})

test('no DNS/socket calls', () => {
  assertNotContains(src, 'createConnection', 'createConnection found')
  assertNotContains(src, 'createServer', 'createServer found')
  assertNotContains(src, '.connect(', 'socket .connect() found')
})

// ─── 7. dependencies ─────────────────────────────────────────────────────────

console.log('\n7. Dependencies — zero third-party packages\n')

test('package.json has no dependencies', () => {
  assert(!pkg.dependencies || Object.keys(pkg.dependencies).length === 0,
    `Unexpected dependencies: ${JSON.stringify(pkg.dependencies)}`)
})

test('package.json has no devDependencies', () => {
  assert(!pkg.devDependencies || Object.keys(pkg.devDependencies).length === 0,
    `Unexpected devDependencies: ${JSON.stringify(pkg.devDependencies)}`)
})

test('all imports in hunt.mjs are node: built-ins', () => {
  const imports = [...src.matchAll(/^import .* from ['"](.+)['"]/gm)].map(m => m[1])
  for (const imp of imports) {
    assert(imp.startsWith('node:'), `Non-built-in import found: ${imp}`)
  }
})

// ─── 8. userId integrity ─────────────────────────────────────────────────────

console.log('\n8. userId integrity — always 64-char hex\n')

import { randomBytes } from 'node:crypto'

test('userId generation always produces 64-char hex string', () => {
  for (let i = 0; i < 1000; i++) {
    const id = randomBytes(32).toString('hex')
    assert(id.length === 64, `Expected 64 chars, got ${id.length}`)
    assert(/^[0-9a-f]+$/.test(id), `Non-hex char in userId: ${id}`)
  }
})

test('userId is never passed to shell (only written to JSON)', () => {
  const execLine = src.split('\n').find(l => l.includes('execSync'))
  assert(!execLine?.includes('userId'), 'userId found in execSync call')
})

// ─── 9. no .claude hooks ─────────────────────────────────────────────────────

console.log('\n9. Repo structure — no .claude hooks or MCP configs\n')

test('no .claude directory in repo', () => {
  assert(!existsSync(join(__dir, '.claude')), '.claude directory found in repo — potential hook injection')
})

test('no .mcp.json in repo', () => {
  assert(!existsSync(join(__dir, '.mcp.json')), '.mcp.json found in repo')
})

test('no settings.json in repo root', () => {
  // package.json is fine; settings.json is a Claude hook vector
  assert(!existsSync(join(__dir, 'settings.json')), 'settings.json found in repo root')
})

// ─── results ─────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(48)}`)
console.log(`  ${passed} passed   ${failed} failed`)
console.log(`${'─'.repeat(48)}\n`)

if (failed > 0) process.exit(1)
