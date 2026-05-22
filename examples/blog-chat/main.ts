import { createRuntime } from '@browser-chat-runtime/core'
import { webllm } from '@browser-chat-runtime/model-webllm'
import { localRAG } from '@browser-chat-runtime/rag-local'
import { blogChat } from '@browser-chat-runtime/skills'

const runtime = createRuntime({
  model: webllm(),
  rag: localRAG({ indexUrl: './content-index.json' }),
  skills: [blogChat({ siteName: "Kevin's Blog" })],
  downloadPolicy: 'prompt',
  systemPrompt: 'You are a helpful assistant that answers questions about this blog.',
})

runtime.on((event) => {
  if (event.type === 'generation:token') {
    // TODO: Wire to UI component
  }
})

void runtime
