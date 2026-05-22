export interface CLIConfig {
  readonly contentDir: string
  readonly outputDir: string
  readonly embeddingModel?: string
}

export async function buildIndex(_config: CLIConfig): Promise<void> {
  // TODO: Read markdown files → chunk → embed → write JSON index with content hash
  throw new Error('Not implemented — Phase 2')
}

export async function initProject(_dir: string): Promise<void> {
  // TODO: Create config file in target directory
  throw new Error('Not implemented — Phase 2')
}
