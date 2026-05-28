export type EdgeFieldOption = {
  label: string
  value: string
}

export type EdgeField = {
  name: string
  label: string
  type: 'select' | 'text' | 'number'
  options?: EdgeFieldOption[]
  required?: boolean
  value?: string | number
}

export type EdgeAction = {
  id: string
  label: string
  toolName: string
  description?: string
  input?: Record<string, unknown>
  fields?: EdgeField[]
  successMessage?: string | ((output: unknown, input: Record<string, unknown>) => string)
}

export type EdgeActionContext = {
  toolName: string
  input: unknown
  output: unknown
}

export type EdgeViewNode =
  | { type: 'text'; id?: string; text: string }
  | { type: 'card'; id?: string; title: string; description?: string; children?: EdgeViewNode[] }
  | {
      type: 'form'
      id: string
      toolName: string
      submitLabel: string
      input?: Record<string, unknown>
      fields?: EdgeField[]
      successMessage?: string | ((output: unknown, input: Record<string, unknown>) => string)
    }
  | { type: 'table'; id?: string; columns: Array<{ key: string; label: string }>; rows: Array<Record<string, unknown>> }
  | {
      type: 'chart'
      id?: string
      chartType: 'bar'
      title?: string
      data: Array<{ label: string; value: number }>
    }

export function actionsToEdgeView(actions: EdgeAction[]): EdgeViewNode[] {
  return actions.map(action => ({
    type: 'card',
    id: `${action.id}-card`,
    title: action.label,
    description: action.description,
    children: [
      {
        type: 'form',
        id: action.id,
        toolName: action.toolName,
        submitLabel: action.label,
        input: action.input,
        fields: action.fields,
        successMessage: action.successMessage,
      },
    ],
  }))
}
