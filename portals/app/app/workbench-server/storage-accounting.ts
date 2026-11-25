/**
 * Durable coalesced gauge delivery in the existing encrypted library container.
 * @package @bidproposal/app
 * @layer Application
 * @category StorageAccounting
 * @author AI-Generated
 * @date 2026-11-25
 */
import type { GaugeReporter, StorageObservation } from "../usage/lib/gauge";
import { WorkbenchError } from "./identity";

interface RecordStore {
  getProductDocument(
    product: string,
    id: string,
  ): { markdown: string; revision: number } | undefined;
  putProductDocument(
    product: string,
    id: string,
    markdown: string,
    revision: number,
  ): unknown;
}
interface Snapshot {
  value: number;
  observedAt: string;
}
interface State {
  current?: Snapshot;
  acknowledged?: Snapshot;
}
const recordId = "runtime_auth_storage_accounting";

// --- Persistent observations ----------------------------------------------
export class StorageAccounting {
  private closed = false;
  private pending?: Promise<void>;
  private timer?: ReturnType<typeof setTimeout>;
  private failures = 0;
  constructor(
    private readonly store: RecordStore,
    private readonly workspaceId: string,
    private readonly report: GaugeReporter,
    private readonly now = Date.now,
    private readonly retryMs = 1_000,
  ) {}
  private read(): State {
    const record = this.store.getProductDocument("bidproposal", recordId);
    if (!record) return {};
    const state = JSON.parse(record.markdown) as State;
    for (const snapshot of [state.current, state.acknowledged]) {
      if (
        snapshot &&
        (!Number.isSafeInteger(snapshot.value) ||
          snapshot.value < 0 ||
          !Number.isFinite(Date.parse(snapshot.observedAt)))
      )
        throw Error("Invalid storage accounting record");
    }
    return state;
  }
  private save(state: State): void {
    if (this.closed) return;
    const old = this.store.getProductDocument("bidproposal", recordId);
    if (
      !this.store.putProductDocument(
        "bidproposal",
        recordId,
        JSON.stringify(state),
        old?.revision ?? 0,
      )
    )
      throw Error("Storage accounting revision changed");
  }
  /** Persist actual logical bytes, excluding temporary parse/render reservations. */
  observe(value: number): void {
    if (this.closed) return;
    if (!Number.isSafeInteger(value) || value < 0)
      throw Error("Invalid retained byte count");
    const state = this.read();
    if (state.current?.value !== value) {
      state.current = { value, observedAt: this.nextTime(state) };
      this.save(state);
    }
    this.schedule(0);
  }
  private nextTime(state: State, floor = 0): string {
    return new Date(
      Math.max(
        this.now(),
        floor + 1,
        state.current ? Date.parse(state.current.observedAt) + 1 : 0,
        state.acknowledged ? Date.parse(state.acknowledged.observedAt) + 1 : 0,
      ),
    ).toISOString();
  }

  // --- Bounded single-flight delivery and shutdown -------------------------
  private needsReport(state: State): boolean {
    return (
      !!state.current &&
      (state.current.value !== state.acknowledged?.value ||
        state.current.observedAt !== state.acknowledged.observedAt)
    );
  }
  private schedule(delay: number): void {
    if (this.closed || this.timer || !this.needsReport(this.read())) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.flush().catch(() => undefined);
    }, delay);
    this.timer.unref();
  }
  /** Admission waits for current inventory to reach the shared gauge before fresh C2. */
  flush(): Promise<void> {
    if (this.closed) return Promise.reject(Error("Storage accounting closed"));
    if (this.pending) return this.pending;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.pending = this.deliver()
      .then(() => {
        this.failures = 0;
      })
      .catch(() => {
        this.failures++;
        throw new WorkbenchError(
          503,
          "STORAGE_ACCOUNTING_UNAVAILABLE",
          "Storage accounting is temporarily unavailable; retry shortly",
        );
      })
      .finally(() => {
        this.pending = undefined;
        this.schedule(
          Math.min(60_000, this.retryMs * 2 ** Math.min(this.failures, 6)),
        );
      });
    return this.pending;
  }
  private async deliver(): Promise<void> {
    for (let attempt = 0; attempt < 4 && !this.closed; attempt++) {
      const state = this.read();
      if (!this.needsReport(state)) return;
      const sent = state.current!;
      const observation: StorageObservation = {
        workspace_id: this.workspaceId,
        product: "bidproposal",
        metric: "storage.bytes",
        value: String(sent.value),
        observed_at: sent.observedAt,
      };
      const receipt = await this.report(observation);
      if (this.closed) return;
      const latest = this.read();
      if (
        receipt.value === observation.value &&
        Date.parse(receipt.observed_at) === Date.parse(sent.observedAt)
      ) {
        latest.acknowledged = sent;
      } else {
        latest.current = {
          value: latest.current!.value,
          observedAt: this.nextTime(latest, Date.parse(receipt.observed_at)),
        };
      }
      this.save(latest);
    }
    if (!this.closed && this.needsReport(this.read()))
      throw Error("Storage observations are still pending");
  }
  close(): void {
    this.closed = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }
}
