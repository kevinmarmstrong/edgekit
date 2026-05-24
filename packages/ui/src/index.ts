import { css, html, LitElement } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import {
  actionsToEdgeView,
  applyRedactors,
  createAgent,
  resolveSessionContext,
  type AgentEvent,
  type EdgeActivityEvent,
  type EdgeAction,
  type EdgeActionContext,
  type EdgeField,
  type EdgeToolExecutionContext,
  type CreateAgentOptions,
  type DownloadPromptEvent,
  type EdgeAgent,
  type EdgeTelemetryEvent,
  type EdgeTelemetryEventName,
  type EdgeViewNode,
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

export type EdgeActionProvider = (context: EdgeActionContext) => EdgeAction[] | null | undefined

type EdgeFormView = Extract<EdgeViewNode, { type: 'form' }>

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

    .activity-list {
      display: grid;
      gap: 7px;
      justify-self: start;
      width: min(580px, 92%);
    }

    .activity {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #42534d;
      border: 1px solid #dfe9e4;
      border-radius: 8px;
      background: #f7faf8;
      padding: 8px 10px;
      font-size: 12px;
      line-height: 1.35;
    }

    .activity::before {
      content: "";
      width: 8px;
      height: 8px;
      flex: 0 0 auto;
      border-radius: 999px;
      background: #177e58;
    }

    .activity.completed::before {
      background: #7a8a84;
    }

    .activity.failed::before {
      background: #b6463a;
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

    .view-card {
      display: grid;
      gap: 12px;
      justify-self: start;
      max-width: min(580px, 92%);
      border: 1px solid #cfe0d8;
      border-radius: 8px;
      background: #ffffff;
      padding: 14px;
      box-shadow: 0 12px 28px rgb(29 43 38 / 8%);
    }

    .view-title {
      font-size: 14px;
      font-weight: 700;
      line-height: 1.35;
    }

    .view-description {
      color: #5f6f69;
      font-size: 12px;
      line-height: 1.4;
    }

    .view-fields {
      display: grid;
      gap: 10px;
    }

    .view-field {
      display: grid;
      gap: 5px;
      color: #42534d;
      font-size: 12px;
      font-weight: 700;
    }

    .view-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    .view-table th,
    .view-table td {
      border-bottom: 1px solid #e6eeea;
      padding: 7px 6px;
      text-align: left;
    }

    .view-chart {
      display: grid;
      gap: 8px;
    }

    .view-bar-row {
      display: grid;
      grid-template-columns: 90px 1fr auto;
      gap: 8px;
      align-items: center;
      font-size: 12px;
    }

    .view-bar {
      height: 10px;
      border-radius: 999px;
      background: #177e58;
    }

    select {
      min-width: 0;
      border: 1px solid #cdd9d4;
      border-radius: 8px;
      background: #ffffff;
      padding: 9px 10px;
      font: inherit;
      font-size: 14px;
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

  @property({ type: Boolean, attribute: 'show-tool-events' })
  showToolEvents = false

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

  @state()
  private views: EdgeViewNode[] = []

  @state()
  private activities: EdgeActivityEvent[] = []

  private tools: CreateAgentOptions['tools'] = {}
  private actionProviders: EdgeActionProvider[] = []
  private config: Partial<CreateAgentOptions> = {}
  private agent: EdgeAgent | null = null
  private agentIsExternal = false

  configure(options: Partial<CreateAgentOptions>) {
    this.config = { ...this.config, ...options }
    this.agent = null
    this.agentIsExternal = false
  }

  registerTools(tools: CreateAgentOptions['tools']) {
    this.tools = tools
    if (!this.agentIsExternal) this.agent = null
  }

  useAgent(agent: EdgeAgent) {
    this.agent = agent
    this.agentIsExternal = true
  }

  registerActions(provider: EdgeActionProvider | EdgeAction[]) {
    const nextProvider = Array.isArray(provider) ? () => provider : provider
    this.actionProviders = [...this.actionProviders, nextProvider]
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
          ${this.activities.length > 0
            ? html`<div class="activity-list" data-testid="activity-list">
                ${this.activities.map(
                  activity => html`<div class="activity ${activity.status}" data-testid="activity-item">
                    ${activity.label}${activity.detail ? `: ${activity.detail}` : ''}
                  </div>`,
                )}
              </div>`
            : null}
          ${this.views.map(view => this.renderView(view))}
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
      this.agentIsExternal = false
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
    this.views = []
    this.activities = []
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
    } else if (event.type === 'activity') {
      this.applyActivity(event.activity)
    } else if (event.type === 'tool-call') {
      if (this.showToolEvents) this.messages = [...this.messages, { role: 'tool', text: `Tool: ${event.toolName}` }]
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
    } else if (event.type === 'tool-result') {
      this.addSuggestedActions({
        toolName: event.toolName,
        input: undefined,
        output: event.output,
      })
    } else if (event.type === 'view') {
      this.views = [...this.views, ...(Array.isArray(event.view) ? event.view : [event.view])]
    } else if (event.type === 'error') {
      this.pendingPrompt = null
      this.pendingApproval = null
      this.appendToAssistant(`Something went wrong: ${String(event.error)}`)
    } else if (event.type === 'done') {
      this.pendingPrompt = null
      this.activities = this.activities.filter(activity => activity.status === 'failed')
    } else if (event.type === 'status') {
      this.statusText = event.event.message
    }
  }

  private applyActivity(activity: EdgeActivityEvent) {
    this.statusText = activity.detail ?? activity.label
    const existing = this.activities.filter(candidate => candidate.id !== activity.id)
    const next = [...existing, activity]
    this.activities = next
      .filter(candidate => candidate.status === 'started' || candidate.status === 'failed')
      .slice(-4)
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

  private renderView(view: EdgeViewNode): unknown {
    if (view.type === 'text') return html`<div class="message assistant">${view.text}</div>`

    if (view.type === 'card') {
      return html`<div class="view-card" data-testid="action-card">
        <div>
          <div class="view-title">${view.title}</div>
          ${view.description ? html`<div class="view-description">${view.description}</div>` : null}
        </div>
        ${view.children?.map(child => this.renderView(child))}
      </div>`
    }

    if (view.type === 'form') {
      return html`${view.fields?.length
          ? html`<div class="view-fields">${view.fields.map(field => this.renderFormField(view, field))}</div>`
          : null}
        <div class="prompt-actions">
          <button type="button" data-testid="action-run-button" @click=${() => this.runForm(view)}>
            ${view.submitLabel}
          </button>
        </div>`
    }

    if (view.type === 'table') {
      return html`<div class="view-card">
        <table class="view-table">
          <thead>
            <tr>${view.columns.map(column => html`<th>${column.label}</th>`)}</tr>
          </thead>
          <tbody>
            ${view.rows.map(row => html`<tr>${view.columns.map(column => html`<td>${String(row[column.key] ?? '')}</td>`)}</tr>`)}
          </tbody>
        </table>
      </div>`
    }

    if (view.type === 'chart') {
      const max = Math.max(1, ...view.data.map(point => point.value))
      return html`<div class="view-card">
        ${view.title ? html`<div class="view-title">${view.title}</div>` : null}
        <div class="view-chart">
          ${view.data.map(
            point => html`<div class="view-bar-row">
              <span>${point.label}</span>
              <span class="view-bar" style=${`width: ${(point.value / max) * 100}%`}></span>
              <span>${point.value}</span>
            </div>`,
          )}
        </div>
      </div>`
    }

    return null
  }

  private renderFormField(form: EdgeFormView, field: EdgeField): unknown {
    const id = `${form.id}-${field.name}`
    return html`<label class="view-field" for=${id}>
      ${field.label}
      ${field.type === 'select'
        ? html`<select
            id=${id}
            data-testid=${`action-field-${field.name}`}
            data-action-id=${form.id}
            data-field-name=${field.name}
          >
            ${field.options?.map(
              option => html`<option value=${option.value} ?selected=${option.value === String(field.value ?? '')}>
                ${option.label}
              </option>`,
            )}
          </select>`
        : html`<input
            id=${id}
            data-testid=${`action-field-${field.name}`}
            data-action-id=${form.id}
            data-field-name=${field.name}
            type=${field.type}
            .value=${String(field.value ?? '')}
            ?required=${field.required}
          />`}
    </label>`
  }

  private addSuggestedActions(context: EdgeActionContext) {
    if (this.actionProviders.length === 0) return
    const actions = this.actionProviders.flatMap(provider => provider(context) ?? [])
    if (actions.length === 0) return
    const actionViews = actionsToEdgeView(actions)
    const existingIds = new Set(this.views.map(view => view.id).filter(Boolean))
    this.views = [...this.views, ...actionViews.filter(view => !view.id || !existingIds.has(view.id))]
  }

  private async runForm(form: EdgeFormView) {
    const input = { ...(form.input ?? {}) }
    for (const field of form.fields ?? []) {
      const selector = `[data-action-id="${form.id}"][data-field-name="${field.name}"]`
      const element = this.renderRoot.querySelector<HTMLInputElement | HTMLSelectElement>(selector)
      const rawValue = element?.value ?? ''
      if (field.required && rawValue.length === 0) {
        this.statusText = `${field.label} is required.`
        return
      }
      if (rawValue.length > 0) {
        input[field.name] = field.type === 'number' ? Number(rawValue) : rawValue
      }
    }

    this.busy = true
    this.views = this.views.filter(candidate => candidate.id !== `${form.id}-card` && candidate.id !== form.id)
    try {
      await this.emitUiTelemetry('ui-action', { toolName: form.toolName, data: { stage: 'start', input } })
      await this.config.auditTrail?.record({
        action: 'ui-action',
        sessionId: this.config.sessionId ?? 'edge-chat',
        toolName: form.toolName,
        input,
      })
      const session = await resolveSessionContext(this.config)
      const toolContext: EdgeToolExecutionContext = {
        session,
        identity: session.identity,
        auth: session.auth,
        state: session.state,
      }
      const output = await this.executeTool(form.toolName, input, toolContext)
      const redactedOutput = await applyRedactors(output, this.config.redactors, {
        ...toolContext,
        toolName: form.toolName,
        phase: 'ui-action',
      })
      await this.emitUiTelemetry('tool-result', { toolName: form.toolName, data: redactedOutput })
      await this.config.auditTrail?.record({
        action: 'tool-result',
        sessionId: this.config.sessionId ?? 'edge-chat',
        toolName: form.toolName,
        input,
        output: redactedOutput,
      })
      this.messages = [
        ...this.messages,
        {
          role: 'assistant',
          text: this.formSuccessText(form, redactedOutput, input),
        },
      ]
    } catch (error) {
      await this.emitUiTelemetry('error', { toolName: form.toolName, data: error })
      this.messages = [...this.messages, { role: 'assistant', text: `Something went wrong: ${String(error)}` }]
    } finally {
      this.busy = false
    }
  }

  private async executeTool(toolName: string, input: Record<string, unknown>, context: EdgeToolExecutionContext) {
    const candidate = (this.tools ?? {})[toolName] as {
      execute?: (input: Record<string, unknown>, context?: EdgeToolExecutionContext) => unknown | Promise<unknown>
    }
    if (!candidate?.execute) throw new Error(`${toolName} is not executable.`)
    return candidate.execute(input, context)
  }

  private formSuccessText(form: EdgeFormView, output: unknown, input: Record<string, unknown>) {
    if (typeof form.successMessage === 'function') return form.successMessage(output, input)
    if (form.successMessage) return form.successMessage
    return `${form.submitLabel} complete.`
  }

  private async emitUiTelemetry(name: EdgeTelemetryEventName, event: Partial<EdgeTelemetryEvent>) {
    const telemetry = this.config.telemetry
    if (!telemetry) return
    const sinks = Array.isArray(telemetry) ? telemetry : [telemetry]
    const payload: EdgeTelemetryEvent = {
      id: `ui_${Math.random().toString(36).slice(2, 10)}`,
      sessionId: this.config.sessionId ?? 'edge-chat',
      timestamp: new Date().toISOString(),
      name,
      ...event,
    }
    await Promise.all(
      sinks.map(async sink => {
        try {
          if (typeof sink === 'function') await sink(payload)
          else await sink.record(payload)
        } catch {
          // Telemetry should never block an app-owned action.
        }
      }),
    )
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
