import type { UIProvider, Runtime } from '@browser-chat-runtime/core'

export interface WebComponentConfig {
  readonly theme?: 'light' | 'dark' | 'auto'
  readonly placeholder?: string
}

export function webComponent(config: WebComponentConfig = {}): UIProvider {
  void config

  return {
    mount(_container: HTMLElement, _runtime: Runtime) {
      // TODO: Register <edge-chat> custom element via Lit
      throw new Error('Not implemented — Phase 3')
    },

    unmount() {
      // TODO: Remove custom element
    },
  }
}
