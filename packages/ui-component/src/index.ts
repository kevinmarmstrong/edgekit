import type { UIProvider, Runtime } from '@browser-chat-runtime/core'

export interface WebComponentConfig {
  readonly theme?: 'light' | 'dark' | 'auto'
  readonly placeholder?: string
}

export function webComponent(config: WebComponentConfig = {}): UIProvider {
  let element: HTMLElement | null = null

  return {
    mount(container: HTMLElement, runtime: Runtime) {
      import('./edge-chat.js')

      const el = document.createElement('edge-chat')
      el.setAttribute('theme', config.theme ?? 'auto')
      if (config.placeholder) {
        el.setAttribute('placeholder', config.placeholder)
      }

      ;(el as unknown as { runtime: Runtime }).runtime = runtime

      container.appendChild(el)
      element = el
    },

    unmount() {
      if (element) {
        element.remove()
        element = null
      }
    },
  }
}

export { EdgeChat } from './edge-chat.js'
