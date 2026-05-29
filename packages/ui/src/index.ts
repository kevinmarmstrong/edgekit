import { chromeAI, webLLM } from '@kevinmarmstrong/edgekit'
import { setEdgeChatDefaultAgentOptions } from './component'

setEdgeChatDefaultAgentOptions(() => ({
  model: [chromeAI(), webLLM()],
}))

export * from './component'
