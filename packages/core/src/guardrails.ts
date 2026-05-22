import type { GuardrailsConfig } from './providers.js'

export function validateInput(
  input: string,
  config: GuardrailsConfig | undefined,
): { readonly valid: boolean; readonly reason?: string } {
  if (!config) return { valid: true }

  if (input.trim().length === 0) {
    return { valid: false, reason: 'Input cannot be empty' }
  }

  if (config.maxInputTokens) {
    const estimatedTokens = Math.ceil(input.length / 4)
    if (estimatedTokens > config.maxInputTokens) {
      return {
        valid: false,
        reason: `Input too long (estimated ${estimatedTokens} tokens, max ${config.maxInputTokens})`,
      }
    }
  }

  if (config.blockedPatterns) {
    for (const pattern of config.blockedPatterns) {
      if (pattern.test(input)) {
        return { valid: false, reason: 'Input contains blocked content' }
      }
    }
  }

  return { valid: true }
}
