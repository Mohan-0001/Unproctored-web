/**
 * keyPoolManager.js
 *
 * Smart API key pool manager with two-layer quota protection:
 *
 * Layer 1 — Proactive health check (background ping every 60s)
 *   A lightweight API call (no tokens consumed) is made to each key in the pool.
 *   Keys that respond with 429 are immediately marked "cooling" so they are
 *   skipped BEFORE any real LLM call is made.
 *
 * Layer 2 — Reactive fallback (during streaming)
 *   If a real LLM call hits 429 anyway (e.g. rate limit between check intervals),
 *   the error is caught, a strike is recorded, and the next available key is
 *   tried automatically. After MAX_STRIKES consecutive 429s a key is cooled.
 *
 * A key is re-tested after COOL_DOWN_MS and promoted back to "active" if healthy.
 *
 * Usage:
 *   import { geminiPool, chatgptPool } from './keyPoolManager'
 *   geminiPool.setKeys(['AIza...', 'AIza...'])
 *   const key = geminiPool.getBestKey()         // pick best available key
 *   geminiPool.recordSuccess(key)               // reset its strikes
 *   geminiPool.recordError(key, is429)          // track 429 or generic error
 */

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_STRIKES        = 2          // 429s before a key is cooled
const COOL_DOWN_MS       = 5 * 60_000 // 5 min cooldown before re-check
const HEALTH_INTERVAL_MS = 60_000     // background check frequency

// Lightweight probe endpoints (no tokens, cheap)
const GEMINI_PROBE_URL  = (key) =>
  `https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=1`
const OPENAI_PROBE_URL  = 'https://api.openai.com/v1/models'

// ── Key status enum ───────────────────────────────────────────────────────────
const STATUS = Object.freeze({ ACTIVE: 'active', COOLING: 'cooling' })

// ── KeyPoolManager class ──────────────────────────────────────────────────────
class KeyPoolManager {
  /**
   * @param {'gemini' | 'chatgpt'} agentType
   * @param {Function} probeKey - async (key) => boolean (true = healthy)
   */
  constructor(agentType, probeKey) {
    this.agentType = agentType
    this._probe    = probeKey
    this._pool     = []    // [{ key, status, strikes, cooledAt, lastOk }]
    this._timer    = null
    this._pointer  = 0     // round-robin start index
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /** Replace the pool with a fresh set of non-empty keys. */
  setKeys(rawKeys = []) {
    const keys = rawKeys.filter((k) => k && k.trim())
    this._pool = keys.map((key) => ({
      key,
      status:   STATUS.ACTIVE,
      strikes:  0,
      cooledAt: null,
      lastOk:   null
    }))
    this._pointer = 0
    this._startHealthCheck()
  }

  /**
   * Return the best available key object, or null if all are cooling.
   * Picks first active key starting from the internal pointer (round-robin).
   */
  getBestKey() {
    const len = this._pool.length
    if (len === 0) return null

    for (let i = 0; i < len; i++) {
      const idx  = (this._pointer + i) % len
      const slot = this._pool[idx]
      if (slot.status === STATUS.ACTIVE) return slot
    }
    // All cooling — return the one that cooled earliest as a last resort
    const byAge = [...this._pool].sort((a, b) => (a.cooledAt ?? 0) - (b.cooledAt ?? 0))
    return byAge[0] ?? null
  }

  /** Call after a successful LLM response for a given key. */
  recordSuccess(slot) {
    if (!slot) return
    slot.strikes = 0
    slot.status  = STATUS.ACTIVE
    slot.lastOk  = Date.now()
  }

  /**
   * Call when an LLM call errors.
   * @param {object} slot    — key slot returned by getBestKey()
   * @param {boolean} is429  — whether the error was a 429/quota error
   */
  recordError(slot, is429) {
    if (!slot) return
    if (is429) {
      slot.strikes += 1
      if (slot.strikes >= MAX_STRIKES) {
        this._cool(slot)
      }
    }
    // Advance the round-robin pointer so next call starts from a different key
    this._advancePointer()
  }

  /** How many keys are currently active (not cooling). */
  get activeCount() {
    return this._pool.filter((s) => s.status === STATUS.ACTIVE).length
  }

  /** Full pool snapshot — used by the UI health indicator. */
  get snapshot() {
    return this._pool.map((s) => ({
      masked:   this._mask(s.key),
      status:   s.status,
      strikes:  s.strikes,
      cooledAt: s.cooledAt,
      lastOk:   s.lastOk
    }))
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  _cool(slot) {
    slot.status   = STATUS.COOLING
    slot.cooledAt = Date.now()
    console.warn(`[KeyPoolManager:${this.agentType}] Key ${this._mask(slot.key)} cooled after ${slot.strikes} strikes.`)
  }

  _advancePointer() {
    if (this._pool.length > 0) {
      this._pointer = (this._pointer + 1) % this._pool.length
    }
  }

  _mask(key = '') {
    if (!key) return '(empty)'
    return key.length <= 8 ? '***' : `${key.slice(0, 4)}…${key.slice(-4)}`
  }

  // ── Background health check ─────────────────────────────────────────────────

  _startHealthCheck() {
    clearInterval(this._timer)
    if (this._pool.length === 0) return
    // Run once immediately, then on interval
    this._runHealthCheck()
    this._timer = setInterval(() => this._runHealthCheck(), HEALTH_INTERVAL_MS)
  }

  async _runHealthCheck() {
    const now = Date.now()
    for (const slot of this._pool) {
      if (slot.status === STATUS.COOLING) {
        // Only re-test after cooldown period
        if (slot.cooledAt && now - slot.cooledAt < COOL_DOWN_MS) continue
      }
      // Probe in background — do not await all at once to avoid rate-limiting the checker itself
      this._checkSlot(slot).catch(() => {})
    }
  }

  async _checkSlot(slot) {
    const healthy = await this._probe(slot.key)
    if (healthy) {
      if (slot.status === STATUS.COOLING) {
        console.info(`[KeyPoolManager:${this.agentType}] Key ${this._mask(slot.key)} recovered — marking active.`)
      }
      slot.status  = STATUS.ACTIVE
      slot.strikes = 0
      slot.lastOk  = Date.now()
    } else {
      // Still unhealthy — push cooldown timer forward
      slot.cooledAt = Date.now()
      slot.status   = STATUS.COOLING
    }
  }

  destroy() {
    clearInterval(this._timer)
    this._timer = null
  }
}

// ── Probe implementations ─────────────────────────────────────────────────────

async function probeGemini(key) {
  try {
    const res = await fetch(GEMINI_PROBE_URL(key), { method: 'GET' })
    if (res.status === 429) return false
    if (res.status === 200) return true
    // 401/403 = bad key (treat as not-429 so we don't hide misconfiguration)
    return res.status !== 429
  } catch {
    return true // network error doesn't mean the key is bad
  }
}

async function probeOpenAI(key) {
  try {
    const res = await fetch(OPENAI_PROBE_URL, {
      method: 'GET',
      headers: { Authorization: `Bearer ${key}` }
    })
    if (res.status === 429) return false
    return true
  } catch {
    return true
  }
}

// ── Singleton pools ───────────────────────────────────────────────────────────
export const geminiPool  = new KeyPoolManager('gemini',  probeGemini)
export const chatgptPool = new KeyPoolManager('chatgpt', probeOpenAI)

/**
 * Helper — detect if an error is a 429 / quota error.
 * @param {Error} err
 * @returns {boolean}
 */
export function isRateLimitError(err) {
  return (
    err?.status === 429 ||
    err?.message?.includes('429') ||
    err?.message?.includes('quota') ||
    err?.message?.toLowerCase?.().includes('rate limit') ||
    err?.message?.toLowerCase?.().includes('rate_limit')
  )
}
