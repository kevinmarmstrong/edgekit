import { css, html, LitElement } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import {
  actionsToEdgeView,
  createAgent,
  filterToolManifestsForSession,
  resolveSessionContext,
  toolsFromManifests,
  type AgentEvent,
  type CascadeReadinessSnapshot,
  type EdgeActivityEvent,
  type EdgeAction,
  type EdgeCascadeReadinessController,
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
} from '@kevinmarmstrong/edgekit/lite'
import { applyRedactors } from '@kevinmarmstrong/edgekit-governance'
import {
  applyMissionProfile,
  validateMissionProfile as validateEdgeMissionProfile,
  type EdgeMissionProfile,
  type EdgeProfileValidationResult,
} from '@kevinmarmstrong/edgekit-skills'

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

type EdgeExecutableInputSchema = {
  parse?: (input: unknown) => unknown
  safeParse?: (input: unknown) => unknown
  validate?: (input: unknown) => unknown | Promise<unknown>
}

type EdgeChatDefaultAgentOptions = () => Partial<CreateAgentOptions>

let edgeChatDefaultAgentOptions: EdgeChatDefaultAgentOptions | null = null

export function setEdgeChatDefaultAgentOptions(defaults: EdgeChatDefaultAgentOptions | null) {
  edgeChatDefaultAgentOptions = defaults
}

@customElement('edge-cascade-wizard')
export class EdgeCascadeWizard extends LitElement {
  static styles = css`
    :host {
      display: block;
      color: #15201d;
      font-family:
        Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .wizard {
      display: grid;
      gap: 12px;
      border: 1px solid #d9e2de;
      border-radius: 8px;
      background: #ffffff;
      padding: 14px;
      box-shadow: 0 14px 34px rgb(29 43 38 / 8%);
    }

    .topline {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: start;
    }

    .eyebrow {
      color: #5f6f69;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    h3 {
      margin: 4px 0 0;
      font-size: 15px;
      line-height: 1.25;
    }

    p {
      margin: 0;
      color: #42534d;
      font-size: 13px;
      line-height: 1.45;
    }

    .mode {
      border-radius: 999px;
      background: #edf6f2;
      color: #176247;
      padding: 5px 8px;
      font-size: 11px;
      font-weight: 800;
      white-space: nowrap;
    }

    .providers,
    .capabilities {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .pill {
      border: 1px solid #d9e2de;
      border-radius: 999px;
      padding: 5px 8px;
      background: #f8fbf9;
      color: #42534d;
      font-size: 11px;
      font-weight: 700;
    }

    .pill.ready {
      border-color: #b7dac9;
      background: #edf8f3;
      color: #176247;
    }

    .pill.blocked {
      border-color: #edd8d4;
      background: #fff5f3;
      color: #9b392e;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    button {
      border: 0;
      border-radius: 8px;
      padding: 9px 11px;
      color: #ffffff;
      background: #177e58;
      font: inherit;
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
    }

    button.secondary {
      color: #24453a;
      background: #dcebe5;
    }
  `

  @property({ attribute: false })
  controller: EdgeCascadeReadinessController | null = null

  @state()
  private snapshot: CascadeReadinessSnapshot | null = null

  private unsubscribe: (() => void) | null = null

  connectedCallback() {
    super.connectedCallback()
    this.bindController()
  }

  disconnectedCallback() {
    this.unsubscribe?.()
    this.unsubscribe = null
    super.disconnectedCallback()
  }

  updated(changed: Map<PropertyKey, unknown>) {
    if (changed.has('controller')) this.bindController()
  }

  configure(controller: EdgeCascadeReadinessController) {
    this.controller = controller
  }

  protected render() {
    const snapshot = this.snapshot
    if (!snapshot) return html`<section class="wizard"><p>Checking agent capabilities...</p></section>`

    return html`
      <section class="wizard" data-testid="cascade-wizard" data-mode=${snapshot.mode}>
        <div class="topline">
          <div>
            <div class="eyebrow">Cascade readiness</div>
            <h3>${snapshot.recommendedAction.label}</h3>
          </div>
          <div class="mode">${snapshot.mode}</div>
        </div>
        <p>${snapshot.message}</p>
        <div class="providers" aria-label="Provider status">
          ${snapshot.providers.length === 0
            ? html`<span class="pill">No provider check yet</span>`
            : snapshot.providers.map(
                provider => html`<span class="pill ${this.providerClass(provider.status)}">
                  ${provider.label}: ${provider.status}${provider.progress != null
                    ? ` ${Math.round(provider.progress * 100)}%`
                    : ''}
                </span>`,
              )}
        </div>
        <div class="capabilities" aria-label="Capabilities">
          ${snapshot.requiredCapabilities.length > 0
            ? snapshot.requiredCapabilities.map(
                capability => html`<span
                  class="pill ${snapshot.missingCapabilities.includes(capability) ? 'blocked' : 'ready'}"
                >
                  ${capability}
                </span>`,
              )
            : html`<span class="pill">No required capability gate</span>`}
        </div>
        <div class="actions">
          ${this.renderPrimaryAction(snapshot)}
          <button class="secondary" type="button" @click=${() => this.controller?.retry()}>Recheck</button>
          <button class="secondary" type="button" @click=${() => this.hide()}>Hide agent</button>
        </div>
      </section>
    `
  }

  private bindController() {
    this.unsubscribe?.()
    this.unsubscribe = null
    if (!this.controller) return
    this.unsubscribe = this.controller.subscribe(snapshot => {
      this.snapshot = snapshot
      this.dispatchEvent(new CustomEvent('edgekit-cascade-snapshot', {
        detail: { snapshot },
        bubbles: true,
        composed: true,
      }))
    })
  }

  private renderPrimaryAction(snapshot: CascadeReadinessSnapshot) {
    const action = snapshot.recommendedAction
    if (action.type === 'prompt') {
      return html`<button type="button" @click=${() => this.promptDownload(action.provider)}>
        ${action.label}
      </button>`
    }
    if (action.type === 'fallback') {
      return html`<button type="button" @click=${() => this.useFallback()}>${action.label}</button>`
    }
    if (action.type === 'retry') {
      return html`<button type="button" @click=${() => this.controller?.retry()}>${action.label}</button>`
    }
    return html`<button type="button" @click=${() => this.dispatchAction(action.type)}>${action.label}</button>`
  }

  private async promptDownload(provider?: string) {
    await this.controller?.promptDownload(provider)
    this.dispatchAction('prompt')
  }

  private useFallback() {
    this.controller?.useFallback()
    this.dispatchAction('fallback')
  }

  private hide() {
    this.controller?.hideAgent()
    this.dispatchAction('hide')
  }

  private dispatchAction(type: string) {
    this.dispatchEvent(new CustomEvent('edgekit-cascade-action', {
      detail: { type, snapshot: this.snapshot },
      bubbles: true,
      composed: true,
    }))
  }

  private providerClass(status: CascadeReadinessSnapshot['providers'][number]['status']) {
    if (status === 'ready') return 'ready'
    if (status === 'error' || status === 'unavailable' || status === 'denied' || status === 'skipped') return 'blocked'
    return ''
  }
}

@customElement('edge-chat')
export class EdgeChat extends LitElement {
  static styles = css`
    :host {
      display: block;
      color: var(--edge-chat-foreground, #15201d);
      font-family:
        var(--edge-chat-font-family, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
    }

    .shell {
      border: 1px solid var(--edge-chat-border, #d9e2de);
      border-radius: var(--edge-chat-radius, 8px);
      background: var(--edge-chat-surface, #ffffff);
      box-shadow: var(--edge-chat-shadow, 0 18px 45px rgb(29 43 38 / 10%));
      overflow: hidden;
    }

    header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
      padding: 16px 18px;
      border-bottom: 1px solid var(--edge-chat-border-muted, #e7eeeb);
      background: var(--edge-chat-header-background, #f7faf8);
    }

    .title {
      font-size: 14px;
      font-weight: 700;
      line-height: 1.2;
    }

    .subtitle {
      margin-top: 3px;
      color: var(--edge-chat-muted, #5f6f69);
      font-size: 12px;
      line-height: 1.3;
    }

    .status {
      color: var(--edge-chat-status, #2b6b50);
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
      background: var(--edge-chat-background, #fbfcfb);
    }

    .message {
      width: fit-content;
      max-width: min(580px, 86%);
      border-radius: var(--edge-chat-message-radius, var(--edge-chat-radius, 8px));
      padding: 11px 13px;
      font-size: 14px;
      line-height: 1.45;
      white-space: pre-wrap;
    }

    .user {
      justify-self: end;
      background: var(--edge-chat-user-background, #163d31);
      color: var(--edge-chat-user-foreground, #ffffff);
    }

    .assistant {
      background: var(--edge-chat-message-background, #ffffff);
      border: 1px solid var(--edge-chat-border-muted, #e1e9e5);
      color: var(--edge-chat-foreground, #15201d);
    }

    .system,
    .tool {
      justify-self: start;
      color: var(--edge-chat-muted, #5f6f69);
      background: var(--edge-chat-system-background, #eef5f2);
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
      color: var(--edge-chat-body, #42534d);
      border: 1px solid var(--edge-chat-border-muted, #dfe9e4);
      border-radius: var(--edge-chat-radius, 8px);
      background: var(--edge-chat-header-background, #f7faf8);
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
      background: var(--edge-chat-accent, #177e58);
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
      border: 1px solid var(--edge-chat-border, #cfe0d8);
      border-radius: var(--edge-chat-radius, 8px);
      background: var(--edge-chat-prompt-background, #f2faf6);
      padding: 12px;
    }

    .approval-summary {
      color: var(--edge-chat-muted, #5f6f69);
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
      border: 1px solid var(--edge-chat-border, #cfe0d8);
      border-radius: var(--edge-chat-radius, 8px);
      background: var(--edge-chat-surface, #ffffff);
      padding: 14px;
      box-shadow: 0 12px 28px rgb(29 43 38 / 8%);
    }

    .view-title {
      font-size: 14px;
      font-weight: 700;
      line-height: 1.35;
    }

    .view-description {
      color: var(--edge-chat-muted, #5f6f69);
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
      color: var(--edge-chat-body, #42534d);
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
      border-bottom: 1px solid var(--edge-chat-border-muted, #e6eeea);
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
      background: var(--edge-chat-accent, #177e58);
    }

    select {
      min-width: 0;
      border: 1px solid var(--edge-chat-input-border, #cdd9d4);
      border-radius: var(--edge-chat-radius, 8px);
      background: var(--edge-chat-surface, #ffffff);
      padding: 9px 10px;
      font: inherit;
      font-size: 14px;
    }

    form {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 10px;
      padding: 14px;
      border-top: 1px solid var(--edge-chat-border-muted, #e7eeeb);
      background: var(--edge-chat-surface, #ffffff);
    }

    input {
      min-width: 0;
      border: 1px solid var(--edge-chat-input-border, #cdd9d4);
      border-radius: var(--edge-chat-radius, 8px);
      padding: 11px 12px;
      font: inherit;
      font-size: 14px;
    }

    button {
      border: 0;
      border-radius: var(--edge-chat-radius, 8px);
      padding: 10px 14px;
      color: var(--edge-chat-accent-foreground, #ffffff);
      background: var(--edge-chat-accent, #177e58);
      font: inherit;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
    }

    button.secondary {
      color: var(--edge-chat-secondary-foreground, #24453a);
      background: var(--edge-chat-secondary-background, #dcebe5);
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

  @property({ attribute: 'ready-message' })
  readyMessage = 'Ready. Ask for product help and the agent will use registered tools.'

  @property({ attribute: 'agent-title' })
  agentTitle = 'edgekit agent'

  @property({ attribute: 'agent-subtitle' })
  agentSubtitle = 'Browser-native agent with tool calling'

  @property({ attribute: 'status-text' })
  statusText = 'Browser agent'

  @property({ type: Boolean, attribute: 'show-tool-events' })
  showToolEvents = false

  @state()
  private messages: ChatMessage[] = []

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
  private trustedActionForms = new WeakSet<EdgeFormView>()
  private config: Partial<CreateAgentOptions> = {}
  private agent: EdgeAgent | null = null
  private agentIsExternal = false
  private lastSubmittedInput = ''
  private formDomIds = new WeakMap<EdgeFormView, string>()

  connectedCallback() {
    super.connectedCallback()
    if (this.messages.length === 0) {
      this.messages = [{ role: 'system', text: this.readyMessage }]
    }
  }

  configure(options: Partial<CreateAgentOptions>) {
    this.config = { ...this.config, ...options }
    this.agent = null
    this.agentIsExternal = false
  }

  registerTools(tools: CreateAgentOptions['tools']) {
    this.tools = tools
    if (!this.agentIsExternal) this.agent = null
  }

  /**
   * applyMissionProfile
   *
   * Preferred high-level API for applying a Mission Profile.
   * Safer than manually calling configure(profileToAgentOptions(profile))
   * because it uses the hardened merging logic.
   */
  applyMissionProfile(profile: EdgeMissionProfile) {
    this.configure(applyMissionProfile(profile))
  }

  validateMissionProfile(profile: EdgeMissionProfile): EdgeProfileValidationResult {
    return validateEdgeMissionProfile(profile, { registeredTools: this.tools ?? {} })
  }

  useAgent(agent: EdgeAgent) {
    this.agent = agent
    this.agentIsExternal = true
  }

  useCascadeReadiness(controller: EdgeCascadeReadinessController) {
    this.configure({ cascadeReadiness: controller })
  }

  registerActions(provider: EdgeActionProvider | EdgeAction[]) {
    const nextProvider = Array.isArray(provider) ? () => provider : provider
    this.actionProviders = [...this.actionProviders, nextProvider]
  }

  protected render() {
    return html`
      <section class="shell" part="shell" data-testid="edge-chat">
        <header part="header">
          <div>
            <div class="title" part="title">${this.agentTitle}</div>
            <div class="subtitle" part="subtitle">${this.agentSubtitle}</div>
          </div>
          ${this.statusText
            ? html`<div class="status" part="status" data-testid="agent-status">${this.statusText}</div>`
            : null}
        </header>
        <div class="messages" part="messages" data-testid="chat-messages">
          ${this.messages.map(
            message => html`<div
              class="message ${message.role}"
              part=${`message ${message.role}`}
              data-testid="message"
            >
              ${message.text}
            </div>`,
          )}
          ${this.pendingPrompt
            ? html`<div class="message assistant prompt" part="message assistant prompt" data-testid="download-prompt">
                <div>${this.pendingPrompt.message}</div>
                <div class="prompt-actions">
                  <button part="button" type="button" @click=${() => this.answerPrompt(true)}>Enable</button>
                  <button part="button secondary-button" class="secondary" type="button" @click=${() => this.answerPrompt(false)}>
                    Not now
                  </button>
                </div>
              </div>`
            : null}
          ${this.pendingApproval
            ? html`<div class="message assistant prompt" part="message assistant prompt" data-testid="approval-prompt">
                <div>Approve ${this.pendingApproval.toolName}?</div>
                <div class="approval-summary">${this.summarizeInput(this.pendingApproval.input)}</div>
                <div class="prompt-actions">
                  <button
                    part="button"
                    type="button"
                    data-testid="approve-button"
                    @click=${() => this.answerApproval(true)}
                  >
                    Approve
                  </button>
                  <button
                    part="button secondary-button"
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
                  activity => html`<div class="activity ${activity.status}" part="activity" data-testid="activity-item">
                    ${activity.label}${activity.detail ? `: ${activity.detail}` : ''}
                  </div>`,
                )}
              </div>`
            : null}
          ${this.views.map(view => this.renderView(view))}
        </div>
        <form part="form" @submit=${this.submit}>
          <input
            part="input"
            data-testid="chat-input"
            .placeholder=${this.placeholder}
            ?disabled=${this.busy}
            autocomplete="off"
          />
          <button part="button send-button" data-testid="send-button" ?disabled=${this.busy}>Send</button>
        </form>
      </section>
    `
  }

	  private getAgent() {
	    if (!this.agent) {
	      const tools = { ...(this.config.tools ?? {}), ...(this.tools ?? {}) }
	      this.agent = createAgent({
	        systemPrompt: this.systemPrompt,
        onDownloadPrompt: (event: DownloadPromptEvent) => this.askDownload(event.message),
        onModelStatus: (event: ModelStatusEvent) => {
          this.statusText = event.message
          return event.message
        },
	        onNoModel: (event: NoModelEvent) => event.message,
	        ...(edgeChatDefaultAgentOptions?.() ?? {}),
	        ...this.config,
	        tools,
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
    this.lastSubmittedInput = text
    this.busy = true
    this.views = []
    this.trustedActionForms = new WeakSet<EdgeFormView>()
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
    if (view.type === 'text') return html`<div class="message assistant" part="message assistant">${view.text}</div>`

    if (view.type === 'card') {
      return html`<div class="view-card" part="view-card" data-testid="action-card">
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
          <button part="button action-button" type="button" data-testid="action-run-button" @click=${() => this.runForm(view)}>
            ${view.submitLabel}
          </button>
        </div>`
    }

    if (view.type === 'table') {
      return html`<div class="view-card" part="view-card">
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
      return html`<div class="view-card" part="view-card">
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
    const id = `${this.formDomId(form)}-${field.name}`
    const instanceId = this.formDomId(form)
    return html`<label class="view-field" for=${id}>
      ${field.label}
      ${field.type === 'select'
        ? html`<select
            id=${id}
            data-testid=${`action-field-${field.name}`}
            data-action-instance=${instanceId}
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
            data-action-instance=${instanceId}
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
    collectForms(actionViews).forEach(form => this.trustedActionForms.add(form))
    const existingIds = new Set(this.views.map(view => view.id).filter(Boolean))
    this.views = [...this.views, ...actionViews.filter(view => !view.id || !existingIds.has(view.id))]
  }

  private async runForm(form: EdgeFormView) {
    const input = { ...(form.input ?? {}) }
    const instanceId = this.formDomId(form)
    for (const field of form.fields ?? []) {
      const selector = `[data-action-instance="${instanceId}"][data-field-name="${field.name}"]`
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
      const session = await resolveSessionContext(this.config)
      const toolContext: EdgeToolExecutionContext = {
        session,
        identity: session.identity,
        auth: session.auth,
        state: session.state,
      }
      const isTrustedActionForm = this.trustedActionForms.has(form)
      const candidate = await this.resolveFormTool(form, input, session, isTrustedActionForm)
      const validatedInput = await this.validateToolInput(form.toolName, candidate, input, { strict: !isTrustedActionForm })
      await this.emitUiTelemetry('ui-action', { toolName: form.toolName, data: { stage: 'start', input: validatedInput } })
      await this.config.auditTrail?.record({
        action: 'ui-action',
        sessionId: this.config.sessionId ?? 'edge-chat',
        toolName: form.toolName,
        input: validatedInput,
      })
      if (await toolNeedsApproval(candidate, validatedInput, toolContext, { trustedActionForm: isTrustedActionForm })) {
        if (!isTrustedActionForm) {
          throw new Error(`${form.toolName} requires approval and cannot be executed from an untrusted generated form.`)
        }
        await this.emitUiTelemetry('approval-decision', {
          toolName: form.toolName,
          approved: true,
          data: { source: 'trusted-action-form' },
        })
        await this.config.auditTrail?.record({
          action: 'approval-decision',
          sessionId: this.config.sessionId ?? 'edge-chat',
          toolName: form.toolName,
          approved: true,
          input: validatedInput,
          reason: 'trusted-action-form',
        })
      }
      const output = await this.executeTool(form.toolName, validatedInput, toolContext, candidate)
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
        input: validatedInput,
        output: redactedOutput,
      })
      this.messages = [
        ...this.messages,
        {
          role: 'assistant',
          text: this.formSuccessText(form, redactedOutput, validatedInput),
        },
      ]
    } catch (error) {
      await this.emitUiTelemetry('error', { toolName: form.toolName, data: error })
      this.messages = [...this.messages, { role: 'assistant', text: `Something went wrong: ${String(error)}` }]
    } finally {
      this.busy = false
      this.trustedActionForms.delete(form)
    }
  }

  private formDomId(form: EdgeFormView) {
    const existing = this.formDomIds.get(form)
    if (existing) return existing
    const next = `form_${Math.random().toString(36).slice(2, 10)}`
    this.formDomIds.set(form, next)
    return next
  }

  private async resolveFormTool(
    form: EdgeFormView,
    input: Record<string, unknown>,
    session: Awaited<ReturnType<typeof resolveSessionContext>>,
    trustedActionForm: boolean,
  ) {
    const providerInput = trustedActionForm
      ? `${form.submitLabel} ${form.toolName} ${JSON.stringify(input)}`
      : this.lastSubmittedInput
    const registeredTools = { ...(this.tools ?? {}), ...(this.config.tools ?? {}) }
    const activeTools = this.config.toolProvider
      ? await this.config.toolProvider({ session, input: providerInput, phase: 'send' })
      : this.config.toolManifests
        ? toolsFromManifests(filterToolManifestsForSession(this.config.toolManifests, session))
        : registeredTools
    const candidate = activeTools[form.toolName] as {
      execute?: (input: Record<string, unknown>, context?: EdgeToolExecutionContext) => unknown | Promise<unknown>
      inputSchema?: EdgeExecutableInputSchema
      needsApproval?: boolean | ((input: Record<string, unknown>, options?: Record<string, unknown>) => boolean | Promise<boolean>)
    } | undefined
    if (!candidate?.execute) throw new Error(`${form.toolName} is not available for this session.`)
    return candidate
  }

  private async validateToolInput(
    toolName: string,
    candidate: { inputSchema?: EdgeExecutableInputSchema },
    input: Record<string, unknown>,
    options: { strict?: boolean } = {},
  ): Promise<Record<string, unknown>> {
    const schema = candidate.inputSchema
    if (!schema) return input
    if (typeof schema.safeParse === 'function') {
      const result = schema.safeParse(input)
      if (isSafeParseFailure(result)) throw new Error(`${toolName} input failed validation: ${formatSchemaError(result.error)}`)
      return isRecord(result) && isRecord(result.data) ? result.data : input
    }
    if (typeof schema.parse === 'function') {
      const parsed = schema.parse(input)
      return isRecord(parsed) ? parsed : input
    }
    if (typeof schema.validate === 'function') {
      const result = await schema.validate(input)
      if (isSafeParseFailure(result)) throw new Error(`${toolName} input failed validation: ${formatSchemaError(result.error)}`)
      if (isRecord(result) && result.success === true) {
        if (isRecord(result.value)) return result.value
        if (isRecord(result.data)) return result.data
        throw new Error(`${toolName} input validation returned a non-object success payload.`)
      }
      if (result === false || isValidationFailureShape(result)) {
        throw new Error(`${toolName} input failed validation: ${formatSchemaError(result)}`)
      }
      return isRecord(result) ? result : input
    }
    if (options.strict) throw new Error(`${toolName} input schema is not executable in generated form validation.`)
    return input
  }

  private async executeTool(
    toolName: string,
    input: Record<string, unknown>,
    context: EdgeToolExecutionContext,
    candidate: { execute?: (input: Record<string, unknown>, context?: EdgeToolExecutionContext) => unknown | Promise<unknown> },
  ) {
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

function collectForms(views: EdgeViewNode[]): EdgeFormView[] {
  return views.flatMap(view => {
    if (view.type === 'form') return [view]
    if (view.type === 'card') return collectForms(view.children ?? [])
    return []
  })
}

async function toolNeedsApproval(
  candidate: {
    needsApproval?: boolean | ((input: Record<string, unknown>, options?: Record<string, unknown>) => boolean | Promise<boolean>)
  },
  input: Record<string, unknown>,
  context: EdgeToolExecutionContext,
  options: { trustedActionForm?: boolean } = {},
) {
  if (typeof candidate.needsApproval === 'function') {
    const needsApproval = candidate.needsApproval
    const approvalOptions = createApprovalOptions(input, context)
    const outcome = await toSettledCall(() => needsApproval(input, approvalOptions))
    if (outcome.status === 'rejected') {
      if (options.trustedActionForm) throw outcome.reason
      return true
    }
    return Boolean(outcome.value)
  }
  return candidate.needsApproval === true
}

function createApprovalOptions(input: Record<string, unknown>, context: EdgeToolExecutionContext) {
  return {
    args: input,
    toolCallId: `ui_${Math.random().toString(36).slice(2, 10)}`,
    messages: [],
    experimental_context: context,
    context,
    session: context.session,
    identity: context.identity,
    auth: context.auth,
    state: context.state,
  }
}

function toSettledCall<T>(call: () => T | Promise<T>): Promise<PromiseSettledResult<T>> {
  return Promise.resolve()
    .then(call)
    .then(result => ({ status: 'fulfilled', value: result }) as PromiseFulfilledResult<T>)
    .catch((reason: unknown) => ({ status: 'rejected', reason }) as PromiseRejectedResult)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isSafeParseFailure(value: unknown): value is { success: false; error: unknown } {
  return isRecord(value) && value.success === false
}

function isValidationFailureShape(value: unknown) {
  return isRecord(value) && (
    Array.isArray(value.issues)
    || Array.isArray(value.errors)
    || 'error' in value
  )
}

function formatSchemaError(error: unknown) {
  if (isRecord(error) && typeof error.message === 'string') return error.message
  return String(error)
}

export interface EdgeChatMountOptions extends Partial<CreateAgentOptions> {
  missionProfile?: EdgeMissionProfile
  placeholder?: string
  readyMessage?: string
  agentTitle?: string
  agentSubtitle?: string
  statusText?: string
  showToolEvents?: boolean
}

export function mountChat(target: string | HTMLElement, options: EdgeChatMountOptions = {}) {
  const host = typeof target === 'string' ? document.querySelector(target) : target
  if (!host) throw new Error('edgekit mount target not found')
  const {
    missionProfile,
    placeholder,
    readyMessage,
    agentTitle,
    agentSubtitle,
    statusText,
    showToolEvents,
    tools,
    ...agentOptions
  } = options
  const chat = document.createElement('edge-chat') as EdgeChat
  if (placeholder != null) chat.placeholder = placeholder
  if (readyMessage != null) chat.readyMessage = readyMessage
  if (agentTitle != null) chat.agentTitle = agentTitle
  if (agentSubtitle != null) chat.agentSubtitle = agentSubtitle
  if (statusText != null) chat.statusText = statusText
  if (showToolEvents != null) chat.showToolEvents = showToolEvents
  if (missionProfile) chat.applyMissionProfile(missionProfile)
  if (tools) chat.registerTools(tools)
  chat.configure(agentOptions)
  host.appendChild(chat)
  return chat
}

declare global {
  interface HTMLElementTagNameMap {
    'edge-cascade-wizard': EdgeCascadeWizard
    'edge-chat': EdgeChat
  }
}
