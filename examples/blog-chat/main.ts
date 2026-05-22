import { createRuntime } from '@browser-chat-runtime/core'
import { webllm } from '@browser-chat-runtime/model-webllm'
import { localRAG, loadAndInitRAG } from '@browser-chat-runtime/rag-local'
import { webComponent } from '@browser-chat-runtime/ui-component'
import { blogChat } from '@browser-chat-runtime/skills'

const rag = localRAG({ topK: 3 })

const ui = webComponent({
  theme: 'auto',
  placeholder: 'Ask a question about the blog...',
})

const runtime = createRuntime({
  model: webllm({ tier: 'standard' }),
  rag,
  skills: [blogChat({ siteName: "Kevin's Blog" })],
  ui,
  downloadPolicy: 'prompt',
  systemPrompt:
    'You are a helpful assistant that answers questions about this blog. ' +
    'Use the provided context to give accurate, concise answers. ' +
    'Cite sources when possible.',
})

async function init() {
  const container = document.getElementById('chat-container')
  if (!container) return

  try {
    await loadAndInitRAG(rag, './content-index.json')
  } catch (e) {
    console.warn('Failed to load content index:', e)
  }

  ui.mount(container, runtime)
}

void init()
