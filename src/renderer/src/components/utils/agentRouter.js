/**
 * agentRouter.js
 * Parses slash-command prefixes from user input and routes to the correct agent.
 * The routing prefix is ALWAYS stripped before the clean text is sent to the LLM.
 */

/** All available agent routes shown in the drop-up command palette. */
export const AGENT_ROUTES = [
  {
    command: '/chatgpt',
    label: 'ChatGPT',
    description: 'Route to GPT-4o via OpenAI',
    agent: 'chatgpt',
    color: '#10a37f',       // OpenAI green
    shortLabel: 'GPT-4o'
  },
  {
    command: '/',
    label: 'Gemini',
    description: 'Route to Gemini 2.5 Flash (default)',
    agent: 'gemini',
    color: '#4285f4',       // Google blue
    shortLabel: 'Gemini'
  }
]

/**
 * Parse the slash command from raw textarea input.
 * Returns { agent, cleanText } where cleanText has the routing prefix stripped.
 *
 * Examples:
 *   "/chatgpt explain DP"  → { agent: 'chatgpt', cleanText: 'explain DP' }
 *   "/explain DP"          → { agent: 'gemini',  cleanText: 'explain DP' }
 *   "/explain DP"          → { agent: 'gemini',  cleanText: 'explain DP' }
 *   "explain DP"           → { agent: 'gemini',  cleanText: 'explain DP' }
 *
 * @param {string} raw - Raw textarea value
 * @returns {{ agent: string, cleanText: string }}
 */
export function parseSlashCommand(raw = '') {
  const text = raw.trim()

  // Must be more specific first — /chatgpt before bare /
  for (const route of AGENT_ROUTES) {
    if (route.command === '/') continue  // handle bare "/" last
    if (text.toLowerCase().startsWith(route.command)) {
      // Strip the command prefix and any following whitespace
      const cleanText = text.slice(route.command.length).trimStart()
      return { agent: route.agent, cleanText }
    }
  }

  // Bare "/" prefix → gemini, strip the leading slash
  if (text.startsWith('/')) {
    const cleanText = text.slice(1).trimStart()
    return { agent: 'gemini', cleanText }
  }

  // No slash → default gemini, full text
  return { agent: 'gemini', cleanText: text }
}

/**
 * Return route suggestions for the drop-up menu based on what the user has typed.
 * Only triggers when the input starts with "/".
 *
 * @param {string} raw - Current textarea value
 * @returns {Array} matching AGENT_ROUTES entries
 */
/**
 * Returns true when the user has typed exactly a full command followed by a
 * space (e.g. "/chatgpt ") — meaning they've confirmed the route and the
 * drop-up should close.
 *
 * @param {string} raw
 * @returns {boolean}
 */
export function isCommandComplete(raw = '') {
  const text = raw.trimStart()
  // Must start with a slash
  if (!text.startsWith('/')) return false
  // Check if the text STARTS WITH a known command followed by a space
  for (const route of AGENT_ROUTES) {
    if (route.command === '/') continue
    if (text.toLowerCase().startsWith(route.command + ' ')) return true
    // If they typed the full command exactly (no trailing content yet), still show
  }
  return false
}

export function getSlashSuggestions(raw = '') {
  const text = raw.trimStart()
  if (!text.startsWith('/')) return []

  // If a complete route was already selected (e.g. "/chatgpt hello"), close the menu
  if (isCommandComplete(text)) return []

  const typed = text.toLowerCase()
  return AGENT_ROUTES.filter((r) => r.command.startsWith(typed) || typed === '/')
}

/**
 * Given the current raw input, return the route that currently applies.
 * Used for the live agent badge display.
 *
 * @param {string} raw
 * @returns {object} matching AGENT_ROUTES entry (defaults to Gemini)
 */
export function getActiveRoute(raw = '') {
  const { agent } = parseSlashCommand(raw)
  return AGENT_ROUTES.find((r) => r.agent === agent) ?? AGENT_ROUTES.find((r) => r.agent === 'gemini')
}
