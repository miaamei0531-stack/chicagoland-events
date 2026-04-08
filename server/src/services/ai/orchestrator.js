/**
 * AI Orchestrator — central router for all Claude API calls.
 * All agents in /agents/ go through this module.
 * Manages: API key, error handling, model selection.
 */

const Anthropic = require('@anthropic-ai/sdk');

let client = null;

function getClient() {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
    client = new Anthropic({ apiKey });
  }
  return client;
}

/**
 * callClaude(systemPrompt, userMessage, options)
 * Returns the text content of Claude's response.
 */
async function callClaude(systemPrompt, userMessage, options = {}) {
  const { model = 'claude-sonnet-4-6', maxTokens = 2048 } = options;
  const anthropic = getClient();

  const message = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  return message.content[0]?.text ?? '';
}

/**
 * callClaudeJSON(systemPrompt, userMessage, options)
 * Calls Claude and parses the response as JSON.
 * Throws if the response is not valid JSON.
 */
async function callClaudeJSON(systemPrompt, userMessage, options = {}) {
  const text = await callClaude(systemPrompt, userMessage, options);

  // Strip markdown code fences if present
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(`Claude returned non-JSON response: ${text.slice(0, 200)}`);
  }
}

module.exports = { callClaude, callClaudeJSON };
