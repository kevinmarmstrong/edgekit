import { maybeAvailability, maybeCreateSessionWithProgress, readableError } from '../shared'
import { createModelProvider, type ModelProvider } from '../cascade'

export type ChromeAIOutputLanguage = 'de' | 'en' | 'es' | 'fr' | 'ja'

export interface ChromeAIOptions {
  /**
   * Prompt API output language contract for browser-native text sessions.
   * Defaults to English so Chrome can optimize output quality and safety
   * attestation. Set to null only when the host has a browser/runtime reason
   * to omit the output language contract.
   */
  outputLanguage?: ChromeAIOutputLanguage | null
}

const supportedOutputLanguages = new Set<ChromeAIOutputLanguage>(['de', 'en', 'es', 'fr', 'ja'])

export function chromeAI(options: ChromeAIOptions = {}): ModelProvider {
  return createModelProvider({
    id: 'chrome-ai',
    label: 'Chrome AI',
    resolve: async context => {
      try {
        const { browserAI, doesBrowserSupportBrowserAI } = await import('@browser-ai/core')
        if (!doesBrowserSupportBrowserAI()) return null

        const model = browserAI('text', chromeAISettings(options))
        const availability = await maybeAvailability(model)
        if (availability === 'unavailable') return null

        if (availability === 'available' || availability === 'readily') {
          return model
        }

        const approved = await context.requestDownload({
          provider: 'chrome-ai',
          message: 'Enable built-in browser AI for smarter answers?',
        })
        if (!approved) return null

        context.emitStatus({
          provider: 'chrome-ai',
          status: 'downloading',
          progress: 0,
          message: 'Preparing Chrome AI...',
        })
        await maybeCreateSessionWithProgress(model, progress => {
          context.emitStatus({
            provider: 'chrome-ai',
            status: 'downloading',
            progress,
            message: `Preparing Chrome AI... ${Math.round(progress * 100)}%`,
          })
        })
        return model
      } catch (error) {
        context.emitStatus({
          provider: 'chrome-ai',
          status: 'error',
          message: readableError(error),
        })
        return null
      }
    },
  })
}

function chromeAISettings(options: ChromeAIOptions) {
  const outputLanguage = options.outputLanguage === undefined ? 'en' : options.outputLanguage
  if (outputLanguage === null) return undefined
  if (!supportedOutputLanguages.has(outputLanguage)) {
    throw new Error(
      `Unsupported Chrome AI outputLanguage "${outputLanguage}". Supported languages: ${[...supportedOutputLanguages].join(', ')}.`,
    )
  }

  return {
    expectedOutputs: [{ type: 'text', languages: [outputLanguage] }],
  }
}
