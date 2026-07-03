export type JobHandler = (payload: unknown) => Promise<void>

const registry = new Map<string, JobHandler>()

export function registerHandler(type: string, handler: JobHandler) {
  if (registry.has(type)) {
    throw new Error(`Job handler "${type}" is already registered`)
  }
  registry.set(type, handler)
}

export function getHandler(type: string): JobHandler | null {
  return registry.get(type) ?? null
}

// Test-only escape hatch so each test starts from a clean registry.
export function clearHandlers() {
  registry.clear()
}

// Builtins are registered explicitly by the worker entrypoint (not at import
// time) so tests control registry state.
export function registerBuiltinHandlers() {
  // No-op job that proves the enqueue → claim → run → complete pipeline
  // end-to-end, on a schedule, in production.
  registerHandler("heartbeat", async () => {})
}
