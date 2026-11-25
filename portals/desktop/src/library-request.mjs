/** The native library credential can reach only the host's existing item routes. */
export function createLibraryRequest(runtime) {
  return async (path = '', { method = 'GET', body, signal } = {}) => {
    const match = /^(?:\/([a-f0-9-]{36})(?:\/versions\/([1-9]\d*)(?:\/units\/(0|[1-9]\d*)|\/(retry))?)?)?$/.exec(path);
    if (!match || !['GET', 'POST'].includes(method) ||
        (method === 'POST' && path && !match[4]) ||
        (method === 'GET' && (body !== undefined || match[4])))
      throw new Error('Invalid library request');
    const input = body === undefined ? undefined : JSON.parse(body);
    if (input !== undefined && (!input || typeof input !== 'object' || Array.isArray(input)))
      throw new Error('Invalid library body');
    signal?.throwIfAborted();
    // Aborting a view stops its delivery, not an already submitted host operation.
    let onAbort;
    const operation = runtime.request(method, '/items' + path, input);
    try {
      const result = signal ? await Promise.race([
        operation,
        new Promise((_, reject) => {
          onAbort = () => reject(signal.reason);
          signal.addEventListener('abort', onAbort, { once: true });
          if (signal.aborted) onAbort();
        }),
      ]) : await operation;
      signal?.throwIfAborted();
      if (!result.ok) throw new Error(result.error?.message || 'Library request failed');
      return result.body;
    } finally {
      if (onAbort) signal.removeEventListener('abort', onAbort);
    }
  };
}
