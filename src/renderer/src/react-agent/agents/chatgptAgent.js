import { ChatOpenAI } from '@langchain/openai'

const MODEL_NAME = 'gpt-4o'

/**
 * Create a ChatOpenAI instance for streaming.
 * @param {string} apiKey - OpenAI API key (sk-...)
 * @returns {ChatOpenAI}
 */
export function createChatGPTChat(apiKey) {
  return new ChatOpenAI({
    model: MODEL_NAME,
    temperature: 0,
    maxRetries: 1,
    apiKey,
    streaming: true
  })
}
