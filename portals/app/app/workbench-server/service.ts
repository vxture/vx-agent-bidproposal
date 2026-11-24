/**
 * @package @bidproposal/app
 * @layer Application
 * @category Runtime
 * @author AI-Generated
 * @date 2026-11-25
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, randomUUID } from "node:crypto";
import { join } from "node:path";
import {
  ProjectRuntime,
  type StoragePort,
  type ProjectStore,
  type AIGatewayPort,
  type TaskInstanceRecord,
} from "@vxture/ruyin-core";
import type { RuyinContract } from "@vxture/ruyin-contract-schema";
import {
  SqliteStoragePort,
  TaskRunner,
  EventBus,
  BackgroundJobs,
  DocumentReadings,
  DocumentRenders,
  ProductLibrary,
  mediaTypeOf,
  type SourceReader,
  type LayoutOutput,
  type LayoutFields,
  type JobDocuments,
} from "@vxture/ruyin-node-runtime";
import type { WorkbenchAccess, Principal } from "./identity";
import {
  samePrincipal,
  namespaceFor,
  authorizeExecution,
  WorkbenchError,
} from "./identity";
import { serverKeys } from "./keys";
import { getTurnResolver, validateTurnRequest } from "../capability/turn";
import { getBidPlanPolicy } from "../entitlement/bid-plan-policy";
import type { Entitlement } from "../entitlement/types";

// --- Durable host composition --------------------------------------------
interface Options {
  root: string;
  masterHex: string;
  principal: Principal;
  contract: RuyinContract;
  reader: SourceReader;
  layout: (
    bytes: Uint8Array,
    template?: Buffer,
    fields?: LayoutFields,
  ) => Promise<LayoutOutput>;
  gateway?: AIGatewayPort;
}
const internalAuth = "runtime_auth_";
const validId = (id: string) => /^[A-Za-z0-9_-]{1,100}$/.test(id);
export class BidRuntime {
  readonly storage: SqliteStoragePort;
  readonly runtime: ProjectRuntime;
  readonly tasks: TaskRunner;
  readonly events = new EventBus();
  readonly jobs: BackgroundJobs;
  readonly readings: DocumentReadings;
  readonly renders: DocumentRenders;
  readonly library: ProductLibrary;
  readonly documents: JobDocuments;
  private readonly principal = new AsyncLocalStorage<Principal>();
  private readonly cancelled = new Set<string>();
  private readonly namespace: string;
  private readonly workspaceId: string;
  private readonly contract: RuyinContract;
  private mutation: Promise<unknown> = Promise.resolve();
  private readonly renderReservations = new Map<
    string,
    { pid: string; hashes: Map<string, number> }
  >();
  private ready: Promise<void>;

  constructor(options: Options) {
    this.namespace = namespaceFor(options.principal);
    this.workspaceId = options.principal.workspaceId;
    this.contract = options.contract;
    const root = join(options.root, this.namespace);
    this.storage = new SqliteStoragePort(
      root,
      serverKeys(root, this.namespace, options.masterHex),
    );
    this.storage.selfCheck();
    const wrap = (pid: string, store: ProjectStore): ProjectStore =>
      new Proxy(store, {
        get: (target, property) => {
          if (property === "putTaskInstance")
            return async (id: string, raw: string) => {
              const record = JSON.parse(raw) as TaskInstanceRecord;
              const host = this.storage.openHostStore(pid)!;
              const authId = internalAuth + "task_" + id;
              if (!host.getProductDocument("bidproposal", authId)) {
                const jobId = /^job:([a-f0-9-]{36}):/.exec(
                  record.requestKey ?? "",
                )?.[1];
                const saved = jobId
                  ? host.getProductDocument(
                      "bidproposal",
                      internalAuth + "job_" + jobId,
                    )
                  : undefined;
                const pinned = saved
                  ? (JSON.parse(saved.markdown) as Principal)
                  : this.principal.getStore();
                if (!pinned || namespaceFor(pinned) !== this.namespace)
                  throw new WorkbenchError(
                    403,
                    "TASK_SCOPE_REQUIRED",
                    "Task identity is unavailable",
                  );
                host.putProductDocument(
                  "bidproposal",
                  authId,
                  JSON.stringify(pinned),
                  0,
                );
              }
              await target.putTaskInstance(id, raw);
            };
          const value = Reflect.get(target, property);
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
    const storage: StoragePort = {
      createProjectStore: async (pid) =>
        wrap(pid, await this.storage.createProjectStore(pid)),
      openProjectStore: async (pid) => {
        const store = await this.storage.openProjectStore(pid);
        return store && wrap(pid, store);
      },
      listProjectIds: () => this.storage.listProjectIds(),
    };
    const gateway: AIGatewayPort = options.gateway ?? {
      turn: async (request) => {
        const saved = this.storage
          .openHostStore(request.workspace)
          ?.getProductDocument(
            "bidproposal",
            internalAuth + "task_" + request.taskId,
          );
        if (!saved || request.product !== "bidproposal")
          throw new WorkbenchError(
            403,
            "TASK_SCOPE_REQUIRED",
            "Task identity is unavailable",
          );
        const caller = await authorizeExecution(
          JSON.parse(saved.markdown) as Principal,
        );
        return getTurnResolver().turn(
          validateTurnRequest({ ...request, projectId: request.workspace }),
          request.capability,
          caller,
        );
      },
    };
    this.documents = {
      get: (pid, product, id) =>
        this.storage.openHostStore(pid)?.getProductDocument(product, id),
      put: (pid, product, id, markdown, revision) =>
        this.storage
          .openHostStore(pid)
          ?.putProductDocument(product, id, markdown, revision),
      list: (pid, product, prefix) =>
        this.storage
          .openHostStore(pid)
          ?.listProductDocuments(product, prefix) ?? [],
    };
    this.runtime = new ProjectRuntime({
      storage,
      projectDocuments: this.documents,
      gateway,
      clock: {
        now: () => new Date().toISOString(),
        sleep: (ms) => new Promise((done) => setTimeout(done, ms)),
      },
      id: {
        newId: (prefix) => prefix + "_" + randomUUID().replaceAll("-", ""),
      },
      crypto: {
        sha256: (value) => createHash("sha256").update(value).digest("hex"),
        base64: (bytes) => Buffer.from(bytes).toString("base64"),
      },
      isCancelled: (id) => this.cancelled.has(id),
      contextBudgetBytes: 4 * 1024 * 1024,
      tools: {
        supports: () => false,
        execute: async () => {
          throw Error("This server does not execute native filesystem tools");
        },
      },
    });
    this.tasks = new TaskRunner(this.runtime, this.cancelled, this.events, {
      maxConcurrent: 2,
    });
    this.jobs = new BackgroundJobs(
      this.runtime,
      this.tasks,
      this.documents,
      this.events,
    );
    const files = {
      get: (pid: string, id: string) =>
        this.storage.openHostStore(pid)?.getFile(id),
      read: async (pid: string, id: string) => {
        const record = this.storage.openHostStore(pid)?.getFile(id),
          area = this.storage.openFileStore(pid);
        if (!record || !area)
          throw new WorkbenchError(404, "NOT_FOUND", "Source unavailable");
        return area.read(record.hash);
      },
    };
    this.readings = new DocumentReadings(
      this.runtime,
      this.documents,
      files,
      options.reader,
    );
    this.renders = new DocumentRenders(
      this.runtime,
      this.documents,
      files,
      async (...args) => {
        const output = await options.layout(...args);
        await this.serial(async () => {
          const active = (await this.runtime.listProjects()).flatMap(
            (project) =>
              this.renders
                .list(project.id, "bidproposal")
                .filter((job) => job.state === "running")
                .map((job) => ({ project, job })),
          );
          if (active.length !== 1)
            throw Error("The active render scope is unavailable");
          const { project, job } = active[0]!,
            budget = this.documents.get(
              project.id,
              "bidproposal",
              internalAuth + "render_" + job.id,
            );
          if (!budget) throw Error("Render storage admission is unavailable");
          const limit = (JSON.parse(budget.markdown) as { limit: number })
            .limit;
          const content = await this.retainedContent();
          for (const bytes of [output.docx, output.pdf])
            content.set(
              createHash("sha256").update(bytes).digest("hex"),
              bytes.length,
            );
          if (
            limit !== -1 &&
            [...content.values()].reduce((a, b) => a + b, 0) > limit
          )
            throw Error(
              "The workspace storage limit cannot retain this export",
            );
          this.renderReservations.set(job.id, {
            pid: project.id,
            hashes: new Map(
              [output.docx, output.pdf].map((bytes) => [
                createHash("sha256").update(bytes).digest("hex"),
                bytes.length,
              ]),
            ),
          });
        });
        return output;
      },
    );
    this.library = new ProductLibrary(this.storage, options.reader);
    this.ready = this.recover();
  }
  private async recover(): Promise<void> {
    await this.readings.recoverAll();
    await this.renders.recoverAll();
    await this.library.readings.recoverAll();
    await this.tasks.recoverAll();
    await this.jobs.recoverAll();
  }
  async run<T>(
    access: WorkbenchAccess,
    operation: () => Promise<T>,
  ): Promise<T> {
    if (namespaceFor(access.principal) !== this.namespace)
      throw new WorkbenchError(404, "NOT_FOUND", "Workspace unavailable");
    await this.ready;
    return this.principal.run(access.principal, operation);
  }
  private serial<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.mutation.then(operation, operation);
    this.mutation = next.catch(() => undefined);
    return next;
  }
  async checkProject(id: string, write = false) {
    if (!validId(id))
      throw new WorkbenchError(404, "NOT_FOUND", "Project unavailable");
    const view = await this.runtime.openProject(id);
    if (
      view.meta.workspaceId !== this.workspaceId ||
      view.meta.productId !== "bidproposal"
    )
      throw new WorkbenchError(404, "NOT_FOUND", "Project unavailable");
    if (write && view.meta.archivedAt)
      throw new WorkbenchError(
        409,
        "PROJECT_ARCHIVED",
        "Restore the archived project before editing",
      );
    return view;
  }
  async create(name: string, entitlement: Entitlement) {
    return this.serial(async () => {
      if (typeof name !== "string" || !name.trim() || name.trim().length > 120)
        throw new WorkbenchError(
          400,
          "INVALID_INPUT",
          "Enter a project name (1-120 characters)",
        );
      const policy = getBidPlanPolicy(entitlement),
        count = (await this.runtime.listProjects()).length;
      if (
        !policy ||
        (policy.proposalLimit !== -1 && count >= policy.proposalLimit)
      )
        throw new WorkbenchError(
          403,
          "PROPOSAL_LIMIT",
          "The workspace proposal limit has been reached",
        );
      return this.runtime.createProject(
        this.contract,
        name.trim(),
        this.workspaceId,
      );
    });
  }

  // --- Project files and documents ---------------------------------------
  private async retainedContent(): Promise<Map<string, number>> {
    const content = new Map<string, number>();
    for (const scope of this.storage.listLibraryScopes())
      for (const file of this.storage
        .openLibraryStore(scope.workspaceId, scope.productId)
        .store.listFiles())
        content.set(file.hash, file.bytes);
    for (const pid of await this.storage.listProjectIds()) {
      const store = this.storage.openHostStore(pid)!;
      for (const file of store.listFiles()) content.set(file.hash, file.bytes);
      for (const document of store.listProductDocuments(
        "bidproposal",
        "runtime_output_",
      )) {
        const outputs = JSON.parse(document.markdown) as {
          docx: string;
          pdf: string;
        };
        for (const value of [outputs.docx, outputs.pdf]) {
          const bytes = Buffer.from(value, "base64");
          content.set(
            createHash("sha256").update(bytes).digest("hex"),
            bytes.length,
          );
        }
      }
    }
    for (const [id, reserved] of this.renderReservations) {
      if (
        this.documents.get(
          reserved.pid,
          "bidproposal",
          "runtime_output_" + id,
        ) ||
        this.renders.get(reserved.pid, "bidproposal", id)?.state === "failed"
      ) {
        this.renderReservations.delete(id);
        continue;
      }
      for (const [hash, bytes] of reserved.hashes) content.set(hash, bytes);
    }
    return content;
  }
  async storageBytes(): Promise<number> {
    return [...(await this.retainedContent()).values()].reduce(
      (a, b) => a + b,
      0,
    );
  }
  async storageMutation<T>(
    bytes: Buffer,
    limit: number,
    operation: () => Promise<T>,
  ): Promise<T> {
    return this.serial(async () => {
      const content = await this.retainedContent();
      content.set(
        createHash("sha256").update(bytes).digest("hex"),
        bytes.length,
      );
      if (
        limit !== -1 &&
        [...content.values()].reduce((a, b) => a + b, 0) > limit
      )
        throw new WorkbenchError(
          403,
          "STORAGE_LIMIT",
          "The workspace storage limit has been reached",
        );
      return operation();
    });
  }
  async createRender(pid: string, body: { id: string }, limit: number) {
    await this.checkProject(pid, true);
    if (!/^[a-f0-9-]{36}$/.test(body.id))
      throw new WorkbenchError(400, "INVALID_INPUT", "Invalid render ID");
    const key = internalAuth + "render_" + body.id,
      old = this.documents.get(pid, "bidproposal", key);
    if (!old)
      this.documents.put(pid, "bidproposal", key, JSON.stringify({ limit }), 0);
    return this.renders.create(pid, "bidproposal", body);
  }
  async upload(id: string, name: string, bytes: Buffer, storageLimit: number) {
    return this.serial(async () => {
      await this.checkProject(id, true);
      if (
        !name ||
        name.length > 200 ||
        /[\\/\x00-\x1f]/.test(name) ||
        !/\.(pdf|docx|md)$/i.test(name) ||
        !bytes.length ||
        bytes.length > 20 * 1024 * 1024
      )
        throw new WorkbenchError(
          400,
          "INVALID_FILE",
          "Select a PDF, DOCX or Markdown file up to 20 MiB",
        );
      const store = this.storage.openHostStore(id)!,
        area = this.storage.openFileStore(id)!;
      const hash = createHash("sha256").update(bytes).digest("hex");
      const content = await this.retainedContent();
      content.set(hash, bytes.length);
      if (
        storageLimit !== -1 &&
        [...content.values()].reduce((a, b) => a + b, 0) > storageLimit
      )
        throw new WorkbenchError(
          403,
          "STORAGE_LIMIT",
          "The workspace storage limit has been reached",
        );
      const stored = await area.putBytes(bytes),
        file = {
          ...stored,
          id: "file_" + randomUUID().replaceAll("-", ""),
          name,
          mediaType: mediaTypeOf(name),
          addedAt: new Date().toISOString(),
        };
      store.addFile(file);
      this.events.publish({ kind: "project", projectId: id });
      return file;
    });
  }
  async document(
    id: string,
    key: string,
    body?: { markdown: string; revision: number },
  ) {
    await this.checkProject(id, body !== undefined);
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(key) || key.startsWith(internalAuth))
      throw new WorkbenchError(404, "NOT_FOUND", "Document unavailable");
    if (!body) {
      const value = this.documents.get(id, "bidproposal", key);
      if (!value)
        throw new WorkbenchError(404, "NOT_FOUND", "Document unavailable");
      return value;
    }
    if (
      key.startsWith("runtime_") ||
      this.jobs.owns(id, "bidproposal", undefined, key)
    )
      throw new WorkbenchError(
        409,
        "DOCUMENT_LOCKED",
        "A background job owns this document",
      );
    if (
      typeof body.markdown !== "string" ||
      Buffer.byteLength(body.markdown) > 1024 * 1024 ||
      !Number.isSafeInteger(body.revision) ||
      body.revision < 0
    )
      throw new WorkbenchError(
        400,
        "INVALID_INPUT",
        "Invalid document or revision",
      );
    const value = this.documents.put(
      id,
      "bidproposal",
      key,
      body.markdown,
      body.revision,
    );
    if (!value)
      throw new WorkbenchError(
        409,
        "DOCUMENT_CONFLICT",
        "The document changed; reload and merge",
      );
    this.events.publish({ kind: "project", projectId: id });
    return value;
  }
  async startJob(id: string, body: { id: string }, principal: Principal) {
    await this.checkProject(id, true);
    if (!/^[a-f0-9-]{36}$/.test(body.id))
      throw new WorkbenchError(400, "INVALID_INPUT", "Invalid job ID");
    const store = this.storage.openHostStore(id)!,
      key = internalAuth + "job_" + body.id,
      old = store.getProductDocument("bidproposal", key);
    if (old && !samePrincipal(JSON.parse(old.markdown) as Principal, principal))
      throw new WorkbenchError(
        409,
        "JOB_SCOPE_CHANGED",
        "The job belongs to another execution session",
      );
    if (!old)
      store.putProductDocument(
        "bidproposal",
        key,
        JSON.stringify(principal),
        0,
      );
    return this.jobs.create(id, "bidproposal", body);
  }
  scope() {
    return this.library.scope(this.workspaceId, "bidproposal");
  }
  close() {
    this.jobs.close();
    this.readings.close();
    this.renders.close();
    this.library.close();
    this.storage.closeAll();
  }
}
