import { LitElement, html, css, type TemplateResult } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'
import type { Runtime, RuntimeEvent, Chunk } from '@edgekit/core'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderMarkdown(src: string): string {
  const lines = src.split('\n')
  const out: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]!

    if (line.startsWith('```')) {
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i]!.startsWith('```')) {
        codeLines.push(escapeHtml(lines[i]!))
        i++
      }
      i++
      out.push(`<pre><code>${codeLines.join('\n')}</code></pre>`)
      continue
    }

    if (line.trim() === '') {
      i++
      continue
    }

    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1]!.length
      out.push(`<h${level}>${inlineFormat(headingMatch[2]!)}</h${level}>`)
      i++
      continue
    }

    const ulMatch = line.match(/^[-*]\s+(.+)$/)
    if (ulMatch) {
      const items: string[] = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i]!)) {
        items.push(`<li>${inlineFormat(lines[i]!.replace(/^[-*]\s+/, ''))}</li>`)
        i++
      }
      out.push(`<ul>${items.join('')}</ul>`)
      continue
    }

    const olMatch = line.match(/^\d+\.\s+(.+)$/)
    if (olMatch) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i]!)) {
        items.push(`<li>${inlineFormat(lines[i]!.replace(/^\d+\.\s+/, ''))}</li>`)
        i++
      }
      out.push(`<ol>${items.join('')}</ol>`)
      continue
    }

    out.push(`<p>${inlineFormat(line)}</p>`)
    i++
  }

  return out.join('')
}

function inlineFormat(text: string): string {
  let result = escapeHtml(text)
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>')
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  return result
}

interface ChatMessage {
  readonly role: 'user' | 'assistant'
  readonly content: string
  readonly citations?: readonly Chunk[]
}

@customElement('edge-chat')
export class EdgeChat extends LitElement {
  @property({ type: Object }) runtime: Runtime | null = null
  @property({ type: String }) placeholder = 'Ask a question...'
  @property({ type: String }) theme: 'light' | 'dark' | 'auto' = 'auto'

  @state() private messages: readonly ChatMessage[] = []
  @state() private streamingText = ''
  @state() private isGenerating = false
  @state() private isDownloading = false
  @state() private downloadProgress = 0
  @state() private pendingCitations: Chunk[] = []
  @state() private error: string | null = null
  @state() private showDownloadPrompt = false

  private unsubscribe: (() => void) | null = null

  static override styles = css`
    :host {
      display: block;
      height: 100%;
      font-family: system-ui, -apple-system, sans-serif;
      --ec-bg: #ffffff;
      --ec-fg: #111111;
      --ec-border: #e0e0e0;
      --ec-accent: #0066cc;
      --ec-user-bg: #f0f7ff;
      --ec-cite-bg: #f8f9fa;
      --ec-error-bg: #fff0f0;
      --ec-error-fg: #cc0000;
      --ec-radius: 8px;
    }

    :host([theme="dark"]) {
      --ec-bg: #1a1a1a;
      --ec-fg: #e0e0e0;
      --ec-border: #333333;
      --ec-accent: #4da6ff;
      --ec-user-bg: #1a2a3a;
      --ec-cite-bg: #222222;
      --ec-error-bg: #2a1515;
      --ec-error-fg: #ff6666;
    }

    .container {
      background: var(--ec-bg);
      color: var(--ec-fg);
      border: 1px solid var(--ec-border);
      border-radius: var(--ec-radius);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 100%;
      max-height: inherit;
    }

    .messages {
      flex: 1 1 0;
      overflow-y: auto;
      padding: 1rem;
      min-height: 0;
    }

    .message {
      margin-bottom: 1rem;
      line-height: 1.6;
    }

    .message.user {
      background: var(--ec-user-bg);
      padding: 0.75rem 1rem;
      border-radius: var(--ec-radius);
    }

    .message .label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ec-accent);
      margin-bottom: 0.25rem;
    }

    .message .content h1,
    .message .content h2,
    .message .content h3,
    .message .content h4 {
      margin: 0.75rem 0 0.25rem;
      line-height: 1.3;
    }
    .message .content h1 { font-size: 1.15rem; }
    .message .content h2 { font-size: 1.05rem; }
    .message .content h3 { font-size: 0.95rem; }
    .message .content p {
      margin: 0.4rem 0;
    }
    .message .content ul,
    .message .content ol {
      margin: 0.4rem 0;
      padding-left: 1.5rem;
    }
    .message .content li {
      margin-bottom: 0.2rem;
    }
    .message .content pre {
      background: var(--ec-cite-bg);
      padding: 0.6rem 0.75rem;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 0.85rem;
      margin: 0.5rem 0;
    }
    .message .content code {
      background: var(--ec-cite-bg);
      padding: 0.1rem 0.3rem;
      border-radius: 3px;
      font-size: 0.88em;
    }
    .message .content pre code {
      background: none;
      padding: 0;
    }
    .message .content strong {
      font-weight: 600;
    }

    .citations {
      margin-top: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: var(--ec-cite-bg);
      border-radius: 4px;
      font-size: 0.8rem;
    }

    .citation {
      margin-bottom: 0.15rem;
      opacity: 0.8;
    }

    .input-row {
      display: flex;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border-top: 1px solid var(--ec-border);
    }

    input {
      flex: 1;
      padding: 0.6rem 0.75rem;
      border: 1px solid var(--ec-border);
      border-radius: 6px;
      font-size: 0.95rem;
      background: var(--ec-bg);
      color: var(--ec-fg);
      outline: none;
    }

    input:focus {
      border-color: var(--ec-accent);
    }

    button {
      padding: 0.6rem 1.2rem;
      background: var(--ec-accent);
      color: #ffffff;
      border: none;
      border-radius: 6px;
      font-size: 0.95rem;
      cursor: pointer;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .download-bar {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--ec-border);
      font-size: 0.85rem;
    }

    progress {
      width: 100%;
      height: 4px;
      border-radius: 2px;
      margin-top: 0.5rem;
    }

    .download-prompt {
      padding: 1rem;
      text-align: center;
      border-bottom: 1px solid var(--ec-border);
    }

    .download-prompt p {
      margin: 0 0 0.75rem;
      font-size: 0.9rem;
    }

    .download-prompt .actions {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
    }

    .download-prompt .secondary {
      background: transparent;
      color: var(--ec-fg);
      border: 1px solid var(--ec-border);
    }

    .error {
      padding: 0.75rem 1rem;
      background: var(--ec-error-bg);
      color: var(--ec-error-fg);
      font-size: 0.85rem;
      border-bottom: 1px solid var(--ec-border);
    }

    .cursor {
      display: inline-block;
      width: 2px;
      height: 1em;
      background: var(--ec-accent);
      animation: blink 1s step-end infinite;
      vertical-align: text-bottom;
    }

    @keyframes blink {
      50% { opacity: 0; }
    }
  `

  override connectedCallback(): void {
    super.connectedCallback()
    if (this.runtime) this.subscribe()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.unsubscribe?.()
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('runtime') && this.runtime) {
      this.unsubscribe?.()
      this.subscribe()
    }
  }

  private subscribe(): void {
    if (!this.runtime) return
    this.unsubscribe = this.runtime.on((event: RuntimeEvent) => {
      this.handleEvent(event)
    })
  }

  private handleEvent(event: RuntimeEvent): void {
    switch (event.type) {
      case 'model:download:start':
        this.isDownloading = true
        this.downloadProgress = 0
        break
      case 'model:download:progress':
        this.downloadProgress = event.progress
        break
      case 'model:download:complete':
        this.isDownloading = false
        break
      case 'retrieval:complete':
        this.pendingCitations = [...event.chunks]
        break
      case 'generation:token':
        this.streamingText += event.token
        this.scrollToBottom()
        break
      case 'generation:complete':
        this.messages = [
          ...this.messages,
          {
            role: 'assistant',
            content: event.text,
            citations: this.pendingCitations.length > 0 ? [...this.pendingCitations] : undefined,
          },
        ]
        this.streamingText = ''
        this.pendingCitations = []
        this.isGenerating = false
        break
      case 'error':
        this.error = event.error.message
        this.isGenerating = false
        break
    }
  }

  private async handleSubmit(): Promise<void> {
    const input = this.shadowRoot?.querySelector('input') as HTMLInputElement | null
    const value = input?.value.trim()
    if (!value || !this.runtime || this.isGenerating) return

    input!.value = ''
    this.error = null
    this.isGenerating = true
    this.messages = [...this.messages, { role: 'user', content: value }]

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _token of this.runtime.query(value)) {
        // Events handle UI updates
      }
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'An error occurred'
      this.isGenerating = false
    }
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !this.isGenerating) {
      void this.handleSubmit()
    }
  }

  private handleDownloadAccept(): void {
    this.showDownloadPrompt = false
    this.dispatchEvent(new CustomEvent('download-accept'))
  }

  private handleDownloadDecline(): void {
    this.showDownloadPrompt = false
    this.dispatchEvent(new CustomEvent('download-decline'))
  }

  private scrollToBottom(): void {
    requestAnimationFrame(() => {
      const el = this.shadowRoot?.querySelector('.messages')
      if (el) el.scrollTop = el.scrollHeight
    })
  }

  override render(): TemplateResult {
    return html`
      <div class="container">
        ${this.error ? html`<div class="error">${this.error}</div>` : ''}
        ${this.isDownloading ? this.renderDownloadBar() : ''}
        ${this.showDownloadPrompt ? this.renderDownloadPrompt() : ''}

        <div class="messages">
          ${this.messages.map((m) => this.renderMessage(m))}
          ${this.streamingText ? this.renderStreaming() : ''}
        </div>

        <div class="input-row">
          <input
            type="text"
            .placeholder=${this.placeholder}
            ?disabled=${this.isGenerating || this.isDownloading}
            @keydown=${this.handleKeydown}
          />
          <button
            ?disabled=${this.isGenerating || this.isDownloading}
            @click=${this.handleSubmit}
          >Send</button>
        </div>
      </div>
    `
  }

  private renderMessage(msg: ChatMessage): TemplateResult {
    const uniqueCitations = msg.citations
      ? [...new Map(msg.citations.map((c) => [c.metadata.title ?? c.metadata.source, c])).values()]
      : []

    return html`
      <div class="message ${msg.role}">
        <div class="label">${msg.role === 'user' ? 'You' : 'Assistant'}</div>
        <div class="content">${msg.role === 'assistant' ? unsafeHTML(renderMarkdown(msg.content)) : msg.content}</div>
        ${uniqueCitations.length > 0 ? html`
          <div class="citations">
            ${uniqueCitations.map((c) => html`
              <div class="citation">${c.metadata.title ?? c.metadata.source}</div>
            `)}
          </div>
        ` : ''}
      </div>
    `
  }

  private renderStreaming(): TemplateResult {
    const uniqueCitations = this.pendingCitations.length > 0
      ? [...new Map(this.pendingCitations.map((c) => [c.metadata.title ?? c.metadata.source, c])).values()]
      : []

    return html`
      <div class="message assistant">
        <div class="label">Assistant</div>
        <div class="content">${unsafeHTML(renderMarkdown(this.streamingText))}<span class="cursor"></span></div>
        ${uniqueCitations.length > 0 ? html`
          <div class="citations">
            ${uniqueCitations.map((c) => html`
              <div class="citation">${c.metadata.title ?? c.metadata.source}</div>
            `)}
          </div>
        ` : ''}
      </div>
    `
  }

  private renderDownloadBar(): TemplateResult {
    const pct = Math.round(this.downloadProgress * 100)
    return html`
      <div class="download-bar">
        Downloading AI model... ${pct}%
        <progress value=${pct} max="100"></progress>
      </div>
    `
  }

  private renderDownloadPrompt(): TemplateResult {
    return html`
      <div class="download-prompt">
        <p>Enable smarter answers by downloading a small AI model to your device. No data leaves your browser.</p>
        <div class="actions">
          <button @click=${this.handleDownloadAccept}>Download Model</button>
          <button class="secondary" @click=${this.handleDownloadDecline}>No Thanks</button>
        </div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'edge-chat': EdgeChat
  }
}
