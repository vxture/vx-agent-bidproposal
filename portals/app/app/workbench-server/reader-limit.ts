/**
 * @package @bidproposal/app
 * @layer Infrastructure
 * @category RuntimeLimits
 * @author AI-Generated
 * @date 2026-11-25
 */
import type { SourceReader } from "@vxture/ruyin-node-runtime";

/** Bound parser processes across all active workspaces, including queued work. */
export function limitReaders(
  reader: SourceReader,
  concurrency = 2,
  capacity = 32,
): SourceReader {
  let active = 0;
  const queue: Array<() => void> = [];
  const drain = () => {
    while (active < concurrency && queue.length) {
      active++;
      queue.shift()!();
    }
  };
  return async (bytes, format, start, unit, signal) => {
    signal?.throwIfAborted();
    if (queue.length + active >= capacity)
      throw Error("The document reader is busy; retry shortly");
    await new Promise<void>((resolve, reject) => {
      const launch = () => {
        signal?.removeEventListener("abort", abort);
        resolve();
      };
      const abort = () => {
        const index = queue.indexOf(launch);
        if (index >= 0) queue.splice(index, 1);
        reject(Error("Reading cancelled before dispatch"));
      };
      signal?.addEventListener("abort", abort, { once: true });
      queue.push(launch);
      drain();
    });
    try {
      signal?.throwIfAborted();
      await reader(bytes, format, start, unit, signal);
    } finally {
      active--;
      drain();
    }
  };
}
