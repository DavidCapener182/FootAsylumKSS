/** Lazy imports cache rejected promises, so resetting React cannot retry them. */
export function isChunkLoadError(error: Pick<Error, 'name' | 'message'>): boolean {
  return error.name === 'ChunkLoadError'
    || /Loading (?:CSS )?chunk .+ failed|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(error.message)
}

export function recoverFromClientError(
  error: Pick<Error, 'name' | 'message'>,
  reset: () => void,
  reload: () => void,
): void {
  if (isChunkLoadError(error)) {
    reload()
    return
  }
  reset()
}
