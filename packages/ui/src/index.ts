import { css, html, LitElement } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import {
  createAgent,
  type AgentEvent,
  type CreateAgentOptions,
  type DownloadPromptEvent,
  type EdgeAgent,
  type ModelStatusEvent,
  type NoModelEvent,
} from '@kevinmarmstrong/edgekit'

type ChatMessage = {
  role: 'user' | 'assistant' | 'system' | 'tool'
  text: string
}

type PendingPrompt = {
  message: string
  resolve: (accepted: boolean) => void
}

type PendingApproval = {
  approvalId: string
  toolName: string
  input: unknown
}

@customElement('edge-chat')
export class EdgeChat extends LitElement {
  static styles = css`
    :host {
      display: block;
      color: #15201d;
      font-family:
        Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .shell {
      border: 1px solid #d9e2de;
      border-radius: 8px;
      background: #ffffff;
      box-shadow: 0 18px 45px rgb(29 43 38 / 10%);
      overflow: hidden;
    }

    header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
      padding: 16px 18px;
      border-bottom: 1px solid #e7eeeb;
      background: #f7faf8;
    }

    .title {
      font-size: 14px;
      font-weight: 700;
      line-height: 1.2;
    }

    .subtitle {
      margin-top: 3px;
      color: #5f6f69;
      font-size: 12px;
      line-height: 1.3;
    }

    .status {
      color: #2b6b50;
      font-size: 12px;
      line-height: 1.3;
      text-align: right;
    }

    .messages {
      display: grid;
      gap: 12px;
      min-height: 280px;
      max-height: 460px;
      overflow: auto;
      padding: 18px;
      background: #fbfcfb;
    }

    .message {
      width: fit-content;
      max-width: min(580px, 86%);
      border-radius: 8px;
      padding: 11px 13px;
      font-size: 14px;
      line-height: 1.45;
      white-space: pre-wrap;
    }

    .user {
      justify-self: end;
      background: #163d31;
      color: #ffffff;
    }

    .assistant {
      background: #ffffff;
      border: 1px solid #e1e9e5;
      color: #15201d;
    }

    .system,
    .tool {
      justify-self: start;
      color: #5f6f69;
      background: #eef5f2;
      font-size: 12px;
    }

    .prompt {
      display: grid;
      gap: 10px;
      border: 1px solid #cfe0d8;
      border-radius: 8px;
      background: #f2faf6;
      padding: 12px;
    }

    .approval-summary {
      color: #5f6f69;
      font-size: 12px;
      word-break: break-word;
    }

    .prompt-actions {
      display: flex;
      gap: 8px;
    }

    form {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 10px;
      padding: 14px;
      border-top: 1px solid #e7eeeb;
      background: #ffffff;
    }

    input {
      min-width: 0;
      border: 1px solid #cdd9d4;
      border-radius: 8px;
      padding: 11px 12px;
      font: inherit;
      font-size: 14px;
    }

    button {
      border: 0;
      border-radius: 8px;
      padding: 10px 14px;
      color: #ffffff;
      background: #177e58;
      font: inherit;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
    }

    button.secondary {
      color: #24453a;
      background: #dcebe5;
    }

    button:disabled,
    input:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  `

  @property({ attribute: 'system-prompt' })
  systemPrompt = 'You are a helpful assistant.'

  @property({ attribute: 'placeholder' })
  placeholder = 'Ask the agent...'

  @state()
  private messages: ChatMessage[] = [
    {
      role: 'system',
      text: 'Ready. Ask for product help and the agent will use registered tools.',
    },
  ]

  @state()
  private statusText = 'Browser agent'

  @state()
  private busy = false

  @state()
  private pendingPrompt: PendingPrompt | null = null

  @state()
  private pendingApproval: PendingApproval | null = null

  private tools: CreateAgentOptions['tools'] = {}
  private config: Partial<CreateAgentOptions> = {}
  private agent: EdgeAgent | null = null

  configure(options: Partial<CreateAgentOptions>) {
    this.config = { ...this.config, ...options }
    this.agent = null
  }

  registerTools(tools: CreateAgentOptions['tools']) {
    this.tools = tools
    this.agent = null
  }

  protected render() {
    return html`
      <section class="shell" data-testid="edge-chat">
        <header>
          <div>
            <div class="title">edgekit agent</div>
            <div class="subtitle">Browser-native sidecar with tool calling</div>
          </div>
          <div class="status" data-testid="agent-status">${this.statusText}</div>
        </header>
        <div class="messages" data-testid="chat-messages">
          ${this.messages.map(
            message => html`<div class="message ${message.role}" data-testid="message">${message.text}</div>`,
          )}
          ${this.pendingPrompt
            ? html`<div class="message assistant prompt" data-testid="download-prompt">
                <div>${this.pendingPrompt.message}</div>
                <div class="prompt-actions">
                  <button type="button" @click=${() => this.answerPrompt(true)}>Enable</button>
                  <button class="secondary" type="button" @click=${() => this.answerPrompt(false)}>
                    Not now
                  </button>
                </div>
              </div>`
            : null}
          ${this.pendingApproval
            ? html`<div class="message assistant prompt" data-testid="approval-prompt">
                <div>Approve ${this.pendingApproval.toolName}?</div>
                <div class="approval-summary">${this.summarizeInput(this.pendingApproval.input)}</div>
                <div class="prompt-actions">
                  <button
                    type="button"
                    data-testid="approve-button"
                    @click=${() => this.answerApproval(true)}
                  >
                    Approve
                  </button>
                  <button
                    class="secondary"
                    type="button"
                    data-testid="reject-button"
                    @click=${() => this.answerApproval(false)}
                  >
                    Reject
                  </button>
                </div>
              </div>`
            : null}
        </div>
        <form @submit=${this.submit}>
          <input
            data-testid="chat-input"
            .placeholder=${this.placeholder}
            ?disabled=${this.busy}
            autocomplete="off"
          />
          <button data-testid="send-button" ?disabled=${this.busy}>Send</button>
        </form>
      </section>
    `
  }

  private getAgent() {
    if (!this.agent) {
      this.agent = createAgent({
        systemPrompt: this.systemPrompt,
        tools: this.tools,
        onDownloadPrompt: (event: DownloadPromptEvent) => this.askDownload(event.message),
        onModelStatus: (event: ModelStatusEvent) => {
          this.statusText = event.message
          return event.message
        },
        onNoModel: (event: NoModelEvent) => event.message,
        ...this.config,
      })
    }
    return this.agent
  }

  private async submit(event: Event) {
    event.preventDefault()
    const input = this.renderRoot.querySelector<HTMLInputElement>('[data-testid="chat-input"]')
    const text = input?.value.trim()
    if (!text) return

    if (input) input.value = ''
    this.busy = true
    this.messages = [...this.messages, { role: 'user', text }, { role: 'assistant', text: '' }]

    try {
      for await (const agentEvent of this.getAgent().send(text)) {
        this.applyAgentEvent(agentEvent)
      }
    } finally {
      this.busy = false
      await this.updateComplete
      input?.focus()
    }
  }

  private applyAgentEvent(event: AgentEvent) {
    if (event.type === 'text-delta') {
      this.appendToAssistant(event.text)
    } else if (event.type === 'tool-call') {
      this.messages = [...this.messages, { role: 'tool', text: `Tool: ${event.toolName}` }]
    } else if (event.type === 'approval-request') {
      const toolCall = event.toolCall as { toolName?: string; input?: unknown } | undefined
      this.pendingApproval = {
        approvalId: event.approvalId,
        toolName: toolCall?.toolName ?? 'action',
        input: toolCall?.input,
      }
      this.statusText = 'Waiting for approval'
    } else if (event.type === 'no-model') {
      this.pendingPrompt = null
      this.appendToAssistant(event.message)
      this.statusText = event.message === 'AI is not available in this browser.' ? 'No local model' : 'Basic mode'
    } else if (event.type === 'error') {
      this.pendingPrompt = null
      this.pendingApproval = null
      this.appendToAssistant(`Something went wrong: ${String(event.error)}`)
    } else if (event.type === 'done') {
      this.pendingPrompt = null
    } else if (event.type === 'status') {
      this.statusText = event.event.message
    }
  }

  private appendToAssistant(text: string) {
    const next = [...this.messages]
    const lastAssistant = [...next].reverse().find(message => message.role === 'assistant')
    if (lastAssistant) lastAssistant.text += text
    this.messages = next
  }

  private askDownload(message: string) {
    return new Promise<boolean>(resolve => {
      this.pendingPrompt = { message, resolve }
    })
  }

  private answerPrompt(accepted: boolean) {
    this.pendingPrompt?.resolve(accepted)
    this.pendingPrompt = null
  }

  private async answerApproval(approved: boolean) {
    if (!this.pendingApproval) return

    const approval = this.pendingApproval
    this.pendingApproval = null
    this.busy = true
    this.messages = [
      ...this.messages,
      {
        role: 'system',
        text: approved
          ? `Approved ${approval.toolName}. Continuing.`
          : `Rejected ${approval.toolName}. Continuing without that action.`,
      },
      { role: 'assistant', text: '' },
    ]

    try {
      for await (const agentEvent of this.getAgent().respondToApproval(approval.approvalId, approved)) {
        this.applyAgentEvent(agentEvent)
      }
    } finally {
      this.busy = false
    }
  }

  private summarizeInput(input: unknown) {
    if (input == null) return 'No input details.'
    const text = typeof input === 'string' ? input : JSON.stringify(input)
    return text.length > 140 ? `${text.slice(0, 137)}...` : text
  }
}

export function mountChat(target: string | HTMLElement, options: Partial<CreateAgentOptions> = {}) {
  const host = typeof target === 'string' ? document.querySelector(target) : target
  if (!host) throw new Error('edgekit mount target not found')
  const chat = document.createElement('edge-chat') as EdgeChat
  chat.configure(options)
  host.appendChild(chat)
  return chat
}

declare global {
  interface HTMLElementTagNameMap {
    'edge-chat': EdgeChat
  }
}
