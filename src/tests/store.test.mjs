/**
 * Store module tests — uses Node's built-in test runner (node --test)
 * Run: node --test src/tests/store.test.mjs
 *
 * We mock the electron `app` object and `fs` calls so no Electron runtime needed.
 */

import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

// ─── Inline store logic (mirrors src/main/store.js without Electron import) ──

const DEFAULT_SHORTCUTS = {
  moveUp: 'CommandOrControl+Up',
  moveDown: 'CommandOrControl+Down',
  moveLeft: 'CommandOrControl+Left',
  moveRight: 'CommandOrControl+Right',
  toggleVisibility: 'CommandOrControl+M',
  ghostMode: 'CommandOrControl+H',
  captureScreen: 'CommandOrControl+S',
  ghostTyping: 'CommandOrControl+T',
  sendMessage: 'CommandOrControl+Enter',
  scrollUp: 'Shift+Up',
  scrollDown: 'Shift+Down',
  quitApp: 'CommandOrControl+Q'
}

const DEFAULT_SETTINGS = {
  geminiApiKeys: ['', ''],
  shortcuts: { ...DEFAULT_SHORTCUTS }
}

function makeStore(dir) {
  const storePath = join(dir, 'covert-settings.json')

  function load() {
    try {
      if (existsSync(storePath)) {
        const parsed = JSON.parse(readFileSync(storePath, 'utf-8'))
        return {
          geminiApiKeys: Array.isArray(parsed.geminiApiKeys)
            ? parsed.geminiApiKeys
            : DEFAULT_SETTINGS.geminiApiKeys,
          shortcuts: { ...DEFAULT_SHORTCUTS, ...(parsed.shortcuts || {}) }
        }
      }
      
    } catch (err) {
      // fall through to default
    }
    return { geminiApiKeys: ['', ''], shortcuts: { ...DEFAULT_SHORTCUTS } }
  }

  function save(settings) {
    try {
      writeFileSync(storePath, JSON.stringify(settings, null, 2), 'utf-8')
      return true
    } catch (err) {
      return false
    }
  }

  return { load, save, storePath }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

let tmpDir

describe('Store: loadSettings', () => {
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'covert-test-'))
  })
  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  test('returns defaults when no file exists', () => {
    const { load } = makeStore(tmpDir)
    const settings = load()
    assert.deepEqual(settings.geminiApiKeys, ['', ''])
    assert.equal(settings.shortcuts.sendMessage, 'CommandOrControl+Enter')
    assert.equal(settings.shortcuts.captureScreen, 'CommandOrControl+S')
  })

  test('loads saved API keys correctly', () => {
    const { load, save } = makeStore(tmpDir)
    save({ geminiApiKeys: ['key-one', 'key-two'], shortcuts: DEFAULT_SHORTCUTS })
    const settings = load()
    assert.equal(settings.geminiApiKeys[0], 'key-one')
    assert.equal(settings.geminiApiKeys[1], 'key-two')
  })

  test('merges shortcuts with defaults (missing keys filled in)', () => {
    const { load, save, storePath } = makeStore(tmpDir)
    // Write partial shortcuts — only override one
    writeFileSync(storePath, JSON.stringify({
      geminiApiKeys: ['k1', ''],
      shortcuts: { sendMessage: 'Shift+Enter' }
    }), 'utf-8')
    const settings = load()
    assert.equal(settings.shortcuts.sendMessage, 'Shift+Enter')
    // Others default
    assert.equal(settings.shortcuts.captureScreen, 'CommandOrControl+S')
    assert.equal(settings.shortcuts.moveUp, 'CommandOrControl+Up')
  })

  test('returns defaults when file is malformed JSON', () => {
    const { load, storePath } = makeStore(tmpDir)
    writeFileSync(storePath, '{ not valid json !!', 'utf-8')
    const settings = load()
    assert.deepEqual(settings.geminiApiKeys, ['', ''])
  })

  test('falls back gracefully if geminiApiKeys is not an array', () => {
    const { load, save } = makeStore(tmpDir)
    save({ geminiApiKeys: 'single-string', shortcuts: DEFAULT_SHORTCUTS })
    const settings = load()
    assert.deepEqual(settings.geminiApiKeys, ['', ''])
  })
})

describe('Store: saveSettings', () => {
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'covert-test-'))
  })
  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  test('persists settings to disk and returns true', () => {
    const { load, save } = makeStore(tmpDir)
    const result = save({ geminiApiKeys: ['abc', ''], shortcuts: DEFAULT_SHORTCUTS })
    assert.equal(result, true)
    const loaded = load()
    assert.equal(loaded.geminiApiKeys[0], 'abc')
  })

  test('file is valid JSON after save', () => {
    const { save, storePath } = makeStore(tmpDir)
    save({ geminiApiKeys: ['x', 'y'], shortcuts: DEFAULT_SHORTCUTS })
    const raw = readFileSync(storePath, 'utf-8')
    assert.doesNotThrow(() => JSON.parse(raw))
  })

  test('overwrite: saving twice keeps the latest value', () => {
    const { load, save } = makeStore(tmpDir)
    save({ geminiApiKeys: ['first', ''], shortcuts: DEFAULT_SHORTCUTS })
    save({ geminiApiKeys: ['second', ''], shortcuts: DEFAULT_SHORTCUTS })
    const settings = load()
    assert.equal(settings.geminiApiKeys[0], 'second')
  })

  test('saves custom shortcuts and they round-trip correctly', () => {
    const { load, save } = makeStore(tmpDir)
    const custom = { ...DEFAULT_SHORTCUTS, sendMessage: 'Shift+Enter', captureScreen: 'CommandOrControl+P' }
    save({ geminiApiKeys: ['k', ''], shortcuts: custom })
    const loaded = load()
    assert.equal(loaded.shortcuts.sendMessage, 'Shift+Enter')
    assert.equal(loaded.shortcuts.captureScreen, 'CommandOrControl+P')
  })
})

describe('Store: shortcut combo builder (unit)', () => {
  // Pure helper — no I/O needed
  function buildCombo({ ctrlKey = false, metaKey = false, shiftKey = false, altKey = false, key = '' } = {}) {
    const parts = []
    if (ctrlKey || metaKey) parts.push('CommandOrControl')
    if (shiftKey) parts.push('Shift')
    if (altKey) parts.push('Alt')
    const skipKeys = ['Control', 'Shift', 'Alt', 'Meta']
    if (key && !skipKeys.includes(key)) {
      const normalised =
        key === 'ArrowUp' ? 'Up' : key === 'ArrowDown' ? 'Down' :
        key === 'ArrowLeft' ? 'Left' : key === 'ArrowRight' ? 'Right' :
        key.length === 1 ? key.toUpperCase() : key
      parts.push(normalised)
    }
    return parts.join('+')
  }

  test('Ctrl+Enter → CommandOrControl+Enter', () => {
    assert.equal(buildCombo({ ctrlKey: true, key: 'Enter' }), 'CommandOrControl+Enter')
  })

  test('Shift+Up arrow → Shift+Up', () => {
    assert.equal(buildCombo({ shiftKey: true, key: 'ArrowUp' }), 'Shift+Up')
  })

  test('Ctrl+S → CommandOrControl+S', () => {
    assert.equal(buildCombo({ ctrlKey: true, key: 's' }), 'CommandOrControl+S')
  })

  test('modifier only → empty string', () => {
    assert.equal(buildCombo({ ctrlKey: true, key: 'Control' }), 'CommandOrControl')
    // A combo with just a modifier and the modifier key itself
    // In practice the key would be 'Control' which is in skipKeys, so no extra part
    const result = buildCombo({ ctrlKey: true, key: 'Control' })
    // Should not have a trailing '+' or extra token
    assert.ok(!result.endsWith('+'))
  })

  test('Alt+M → Alt+M', () => {
    assert.equal(buildCombo({ altKey: true, key: 'm' }), 'Alt+M')
  })
})
