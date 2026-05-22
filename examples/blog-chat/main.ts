import { createRuntime } from '@edgekit/core'
import { webllm } from '@edgekit/model-webllm'
import { localRAG, loadAndInitRAG } from '@edgekit/rag-local'
import { webComponent } from '@edgekit/ui-component'
import { blogChat } from '@edgekit/skills'

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
