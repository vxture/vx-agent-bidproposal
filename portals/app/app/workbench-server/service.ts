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
import { runtimeFailure } from "./runtime-errors";
import { StorageAccounting } from "./storage-accounting";
import { AssistantSessions } from "./assistant";
import {
  CompilationVersions,
  encodePlan,
  readPlan,
  writingRequirements,
} from "./compilations";
import { admitStorage, storageBudget } from "./storage-policy";
import type { GaugeReporter } from "../usage/lib/gauge";

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
  layoutCacheVersion: string;
  storageAccess: (principal: Principal) => Promise<Entitlement>;
  reportStorage: GaugeReporter;
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
  readonly assistant: AssistantSessions;
  readonly compilations: CompilationVersions;
  readonly documents: JobDocuments;
  private readonly accounting: StorageAccounting;
  private readonly storageAccess: Options["storageAccess"];
  private closed = false;
  private readonly principal = new AsyncLocalStorage<Principal>();
  private readonly compilationId = new AsyncLocalStorage<string>();
  private readonly cancelled = new Set<string>();
  private readonly namespace: string;
  private readonly workspaceId: string;
  private readonly contract: RuyinContract;
  private mutation: Promise<unknown> = Promise.resolve();
  private readonly projectMutations = new Map<string, Promise<void>>();
  private readonly renderReservations = new Map<
    string,
    { pid: string; hashes: Map<string, number> }
  >();
  private readonly ready: Promise<void>;

  constructor(options: Options) {
    if (!/^[a-f0-9]{64}$/.test(options.layoutCacheVersion))
      throw Error("A fixed layout policy fingerprint is required");
    this.namespace = namespaceFor(options.principal);
    this.workspaceId = options.principal.workspaceId;
    this.contract = options.contract;
    const root = join(options.root, this.namespace);
    this.storage = new SqliteStoragePort(
      root,
      serverKeys(root, this.namespace, options.masterHex),
    );
    this.storage.selfCheck();
    this.storageAccess = options.storageAccess;
    this.accounting = new StorageAccounting(
      this.storage.openLibraryStore(this.workspaceId, "bidproposal").store,
      this.workspaceId,
      options.reportStorage,
    );
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
      createProjectStore: async (pid) => {
        const pending =
          this.compilationId.getStore() === pid
            ? await this.storage.openProjectStore(pid)
            : undefined;
        return wrap(
          pid,
          pending ?? (await this.storage.createProjectStore(pid)),
        );
      },
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
        try {
          const caller = await authorizeExecution(
            JSON.parse(saved.markdown) as Principal,
          );
          return await getTurnResolver().turn(
            validateTurnRequest({ ...request, projectId: request.workspace }),
            request.capability,
            caller,
          );
        } catch (error) {
          throw runtimeFailure(error);
        }
      },
    };
    this.documents = {
      get: (pid, product, id) =>
        this.storage.openHostStore(pid)?.getProductDocument(product, id),
      put: (pid, product, id, markdown, revision) => {
        const saved = this.storage
          .openHostStore(pid)
          ?.putProductDocument(product, id, markdown, revision);
        if (saved && id.startsWith("runtime_output_"))
          void this.serial(() => this.observeStorage()).catch(() =>
            console.warn("Bid storage observation is pending reconciliation"),
          );
        return saved;
      },
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
        newId: (prefix) =>
          (prefix === "prj" && this.compilationId.getStore()) ||
          prefix + "_" + randomUUID().replaceAll("-", ""),
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
        const context = await this.renderContext(options.layoutCacheVersion);
        const output =
          this.reusableOutput(context) ?? (await options.layout(...args));
        await this.serial(async () => {
          const { pid, job, principal, cacheKey } = context;
          const content = await this.retainedContent();
          const before = sumBytes(content);
          for (const bytes of [output.docx, output.pdf])
            content.set(
              createHash("sha256").update(bytes).digest("hex"),
              bytes.length,
            );
          await this.admit(principal, before, sumBytes(content), true);
          const key = internalAuth + "render_" + job.id,
            saved = this.documents.get(pid, "bidproposal", key)!;
          if (
            !this.documents.put(
              pid,
              "bidproposal",
              key,
              JSON.stringify({ principal, cacheKey }),
              saved.revision,
            )
          )
            throw Error("Render identity changed during retention");
          this.renderReservations.set(job.id, {
            pid,
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
    this.compilations = new CompilationVersions(
      this.storage.openLibraryStore(this.workspaceId, "bidproposal").store,
      this.runtime,
      this.documents,
      async (id, name) => {
        const store = await this.storage.openProjectStore(id),
          meta = await store?.getMeta();
        if (meta) {
          if (
            meta.workspaceId !== this.workspaceId ||
            meta.productId !== "bidproposal"
          )
            throw new WorkbenchError(
              404,
              "NOT_FOUND",
              "Compilation unavailable",
            );
          if (
            (await store!.getContract()) &&
            (await store!.getBusinessState()) &&
            (await store!.listAuditEvents()).length
          )
            return meta;
        }
        return this.compilationId.run(id, () =>
          this.runtime.createProject(this.contract, name, this.workspaceId),
        );
      },
      async (id, resource) =>
        this.library.pin(this.runtime, this.scope(), id, {
          ...resource,
          revision: this.library.selections(id, "bidproposal").revision,
        }),
    );
    this.assistant = new AssistantSessions(
      this.storage.openLibraryStore(this.workspaceId, "bidproposal").store,
      async (messages, principal, projectId) => {
        const context = [];
        if (projectId) {
          const view = await this.checkProject(projectId);
          context.push({
            type: "project",
            name: view.meta.name,
            content: { name: view.meta.name },
            origin: { kind: "caller" as const },
          });
        }
        const caller = await authorizeExecution(principal);
        const result = await getTurnResolver().turn(
          validateTurnRequest({
            taskId: "assistant-" + randomUUID(),
            projectId,
            objective:
              "Assist the user with preparing a source-grounded bid proposal.",
            constraints: [
              "Reply in the user's language. Distinguish facts from suggestions.",
              "Do not claim to have edited documents, approved requirements, run scoring or exported files. These actions require their existing project workflow.",
              "Only the explicitly supplied project name and conversation are available. Ask the user for needed source excerpts; do not invent enterprise qualifications.",
            ],
            context,
            messages: messages
              .slice(-20)
              .map(({ role, content }) => ({ role, content })),
            tools: [],
          }),
          "bid_assistant",
          caller,
        );
        if (result.kind !== "content")
          throw new WorkbenchError(
            502,
            "ASSISTANT_RESPONSE",
            "Assistant returned an unsupported response",
          );
        return result.content;
      },
    );
    this.ready = this.recover();
  }

  // --- Identical export reuse without changing historical output ------------
  private async renderContext(policy: string) {
    const active = (await this.runtime.listProjects()).flatMap((project) =>
      this.renders
        .list(project.id, "bidproposal")
        .filter((job) => job.state === "running")
        .map((job) => ({ pid: project.id, job })),
    );
    if (active.length !== 1)
      throw Error("The active render scope is unavailable");
    const { pid, job } = active[0]!;
    const auth = this.documents.get(
      pid,
      "bidproposal",
      internalAuth + "render_" + job.id,
    );
    const principal =
      auth &&
      (JSON.parse(auth.markdown) as { principal?: Principal }).principal;
    if (!principal || namespaceFor(principal) !== this.namespace)
      throw Error("Render identity is unavailable; submit a new version");
    const input = this.documents.get(
      pid,
      "bidproposal",
      "runtime_input_" + job.id,
    );
    if (!input) throw Error("The pinned render input is unavailable");
    const source = JSON.parse(input.markdown) as {
      markdown: string;
      template?: string;
    };
    const cacheKey = createHash("sha256")
      .update(
        JSON.stringify([
          policy,
          source.markdown,
          source.template ?? null,
          job.title,
          job.fields ?? null,
        ]),
      )
      .digest("hex");
    return { pid, job, principal, cacheKey };
  }
  private reusableOutput(
    context: Awaited<ReturnType<BidRuntime["renderContext"]>>,
  ): LayoutOutput | undefined {
    for (const job of this.renders.list(context.pid, "bidproposal")) {
      if (
        job.id === context.job.id ||
        job.state !== "completed" ||
        !job.pages ||
        !job.engine
      )
        continue;
      const auth = this.documents.get(
        context.pid,
        "bidproposal",
        internalAuth + "render_" + job.id,
      );
      if (
        !auth ||
        (JSON.parse(auth.markdown) as { cacheKey?: string }).cacheKey !==
          context.cacheKey
      )
        continue;
      const saved = this.documents.get(
        context.pid,
        "bidproposal",
        "runtime_output_" + job.id,
      );
      if (!saved) continue;
      const output = JSON.parse(saved.markdown) as {
        docx: string;
        pdf: string;
      };
      return {
        docx: Buffer.from(output.docx, "base64"),
        pdf: Buffer.from(output.pdf, "base64"),
        pages: job.pages,
        engine: job.engine,
      };
    }
  }
  private async recover(): Promise<void> {
    await this.compilations.recover();
    await this.readings.recoverAll();
    await this.renders.recoverAll();
    await this.library.readings.recoverAll();
    await this.tasks.recoverAll();
    await this.jobs.recoverAll();
    await this.observeStorage();
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
  async projectMutation<T>(
    id: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const root = this.compilations.rootId(id);
    const next = (this.projectMutations.get(root) ?? Promise.resolve()).then(
      operation,
    );
    const tail = next.then(
      () => undefined,
      () => undefined,
    );
    this.projectMutations.set(root, tail);
    try {
      return await next;
    } finally {
      if (this.projectMutations.get(root) === tail)
        this.projectMutations.delete(root);
    }
  }
  async checkProject(id: string, write = false) {
    if (!validId(id))
      throw new WorkbenchError(404, "NOT_FOUND", "Project unavailable");
    if (this.compilations.isCreating(id))
      throw new WorkbenchError(
        409,
        "COMPILATION_PENDING",
        "Compilation initialization is pending; retry creation",
      );
    const view = await this.runtime.openProject(id);
    if (
      view.meta.workspaceId !== this.workspaceId ||
      view.meta.productId !== "bidproposal"
    )
      throw new WorkbenchError(404, "NOT_FOUND", "Project unavailable");
    const rootId = this.compilations.rootId(id);
    const archived =
      view.meta.archivedAt ||
      (rootId !== id &&
        (await this.runtime.openProject(rootId)).meta.archivedAt);
    if (write && archived)
      throw new WorkbenchError(
        409,
        "PROJECT_ARCHIVED",
        "Restore the archived project before editing",
      );
    return {
      ...view,
      meta: {
        ...view.meta,
        name: this.compilations.group(id)?.projectName ?? view.meta.name,
        ...(archived ? { archivedAt: archived } : {}),
      },
    };
  }
  async listProjects() {
    const hidden = this.compilations.hiddenIds();
    return (await this.runtime.listProjects())
      .filter((project) => !hidden.has(project.id))
      .map((project) => ({
        ...project,
        name: this.compilations.group(project.id)?.projectName ?? project.name,
      }));
  }
  async renameCompilation(id: string, body: Record<string, unknown>) {
    return this.serial(async () => {
      await this.checkProject(id, true);
      const principal = this.principal.getStore();
      if (!principal)
        throw new WorkbenchError(
          403,
          "SCOPE_REQUIRED",
          "Signed-in identity required",
        );
      const result = await this.compilations.rename(
        id,
        {
          revision: body.revision as number,
          projectName: body.projectName,
          label: body.label,
        },
        principal.sub,
      );
      this.events.publish({ kind: "project", projectId: id });
      return result;
    });
  }
  async createCompilation(id: string, body: Record<string, unknown>) {
    return this.serial(async () => {
      await this.checkProject(id, true);
      const selected =
        body.reuseLibrary === true
          ? this.library.selections(id, "bidproposal").items
          : [];
      const result = await this.compilations.create(id, {
        label: body.label as string,
        requestId: body.requestId as string,
        revision: body.revision as number,
        requirements: body.requirements,
        selections: selected.map((item) => ({
          id: item.id,
          version: item.version,
        })),
      });
      await this.observeStorage();
      return result;
    });
  }
  async retryCompilation(id: string, versionId: string) {
    return this.serial(async () => {
      await this.checkProject(id, true);
      const result = await this.compilations.retry(id, versionId);
      await this.observeStorage();
      return result;
    });
  }
  async compilationBrief(
    id: string,
    input?: { revision: number; value: unknown },
  ) {
    await this.checkProject(id, !!input);
    const saved = this.documents.get(id, "bidproposal", "bid_plan");
    const plan = readPlan(saved?.markdown);
    if (!input)
      return {
        revision: saved?.revision ?? 0,
        value: writingRequirements({ ...plan, brief: plan.brief ?? "" }),
      };
    const value = writingRequirements(input.value);
    if (input.revision !== (saved?.revision ?? 0))
      throw new WorkbenchError(
        409,
        "DOCUMENT_CONFLICT",
        "Requirements changed; reload and merge",
      );
    const same =
      JSON.stringify(value) ===
      JSON.stringify(writingRequirements({ ...plan, brief: plan.brief ?? "" }));
    if (same) return { revision: saved?.revision ?? 0, value };
    if (await this.compilationBusy(id))
      throw new WorkbenchError(
        409,
        "COMPILATION_BUSY",
        "Wait for or cancel this version's active tasks before editing requirements",
      );
    const next = await this.document(id, "bid_plan", {
      markdown: encodePlan({ ...plan, ...value, approved: false }),
      revision: input.revision,
    });
    return { revision: next.revision, value };
  }
  async backgroundTaskRunning(id: string) {
    return (
      (await this.runtime.listTaskInstances(id)).some((task) =>
        ["selecting", "executing", "verifying", "finalizing"].includes(task.state),
      ) ||
      this.jobs.list(id, "bidproposal").some((job) => job.state === "running") ||
      this.renders.list(id, "bidproposal").some((job) => job.state === "running") ||
      this.readings.list(id, "bidproposal").some((job) => job.state === "running")
    );
  }
  private async compilationBusy(id: string) {
    return (
      (await this.runtime.listTaskInstances(id)).some(
        (task) => !["completed", "failed", "cancelled"].includes(task.state),
      ) ||
      this.jobs
        .list(id, "bidproposal")
        .some(
          (job) => !["completed", "error", "cancelled"].includes(job.state),
        ) ||
      this.renders
        .list(id, "bidproposal")
        .some((job) => ["queued", "running"].includes(job.state)) ||
      this.readings
        .list(id, "bidproposal")
        .some((job) => ["queued", "running"].includes(job.state))
    );
  }
  async archiveCompilationProject(id: string, restore = false) {
    return this.serial(async () => {
      const rootId = this.compilations.rootId(id),
        group = await this.compilations.list(rootId);
      if (!restore)
        for (const entry of group.items) {
          if (
            entry.state === "creating" ||
            (await this.compilationBusy(entry.id))
          )
            throw new WorkbenchError(
              409,
              "COMPILATION_BUSY",
              "Finish or cancel all compilation tasks before archiving this project",
            );
        }
      // The root is the logical lifecycle gate for every child container.
      return restore
        ? this.runtime.restoreProject(rootId)
        : this.runtime.archiveProject(rootId);
    });
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
        count = (await this.listProjects()).length;
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
  private async retainedContent(
    includeReservations = true,
  ): Promise<Map<string, number>> {
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
      if (includeReservations)
        for (const [hash, bytes] of reserved.hashes) content.set(hash, bytes);
    }
    return content;
  }
  async storageBytes(): Promise<number> {
    return sumBytes(await this.retainedContent(false));
  }
  private async observeStorage(): Promise<void> {
    if (!this.closed) this.accounting.observe(await this.storageBytes());
  }
  /** Reconcile actual inventory before reading shared remaining capacity afresh. */
  private async admit(
    principal: Principal,
    before: number,
    proposed: number,
    paid = false,
  ): Promise<void> {
    if (this.closed || namespaceFor(principal) !== this.namespace)
      throw new WorkbenchError(
        403,
        "SCOPE_CHANGED",
        "Original workspace unavailable",
      );
    const actual = await this.storageBytes();
    this.accounting.observe(actual);
    await this.accounting.flush();
    const entitlement = await this.storageAccess(principal);
    if (
      entitlement.workspace_id !== this.workspaceId ||
      entitlement.product !== "bidproposal"
    )
      throw new WorkbenchError(
        403,
        "SCOPE_CHANGED",
        "Original workspace unavailable",
      );
    if (paid && (!entitlement.tier || entitlement.tier === "free"))
      throw new WorkbenchError(
        403,
        "PLAN_REQUIRED",
        "This operation requires a paid plan",
      );
    admitStorage(storageBudget(entitlement), actual, before, proposed);
  }
  /** Explicit flush is also used by the product's operational reconciliation checks. */
  async flushStorage(): Promise<void> {
    await this.ready;
    return this.serial(async () => {
      await this.observeStorage();
      await this.accounting.flush();
    });
  }
  async storageMutation<T>(
    bytes: Buffer,
    principal: Principal,
    operation: () => Promise<T>,
  ): Promise<T> {
    return this.serial(async () => {
      const content = await this.retainedContent();
      const before = sumBytes(content);
      content.set(
        createHash("sha256").update(bytes).digest("hex"),
        bytes.length,
      );
      await this.admit(principal, before, sumBytes(content));
      const result = await operation();
      await this.observeStorage();
      return result;
    });
  }
  async createRender(pid: string, body: { id: string }, principal: Principal) {
    await this.checkProject(pid, true);
    if (!/^[a-f0-9-]{36}$/.test(body.id))
      throw new WorkbenchError(400, "INVALID_INPUT", "Invalid render ID");
    const key = internalAuth + "render_" + body.id,
      old = this.documents.get(pid, "bidproposal", key);
    if (!old)
      this.documents.put(
        pid,
        "bidproposal",
        key,
        JSON.stringify({ principal }),
        0,
      );
    return this.renders.create(pid, "bidproposal", body);
  }
  async upload(id: string, name: string, bytes: Buffer, principal: Principal) {
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
      const before = sumBytes(content);
      content.set(hash, bytes.length);
      await this.admit(principal, before, sumBytes(content));
      const stored = await area.putBytes(bytes),
        file = {
          ...stored,
          id: "file_" + randomUUID().replaceAll("-", ""),
          name,
          mediaType: mediaTypeOf(name),
          addedAt: new Date().toISOString(),
        };
      store.addFile(file);
      await this.observeStorage();
      this.events.publish({ kind: "project", projectId: id });
      return file;
    });
  }
  async removeFile(pid: string, id: string) {
    return this.serial(async () => {
      await this.checkProject(pid, true);
      const store = this.storage.openHostStore(pid)!,
        file = store.getFile(id);
      if (!file)
        throw new WorkbenchError(404, "NOT_FOUND", "Source unavailable");
      const removed = store.removeFile(id);
      if (!removed.stillReferenced)
        this.storage.openFileStore(pid)!.remove(file.hash);
      await this.observeStorage();
      this.events.publish({ kind: "project", projectId: pid });
      return { removed: id };
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
  /** Reauthorize only an explicit continuation by the original subject and scope. */
  reauthorizeJob(id: string, jobId: string, principal: Principal) {
    const key = internalAuth + "job_" + jobId;
    const saved = this.documents.get(id, "bidproposal", key);
    if (
      !saved ||
      !samePrincipal(JSON.parse(saved.markdown) as Principal, principal)
    )
      throw new WorkbenchError(
        403,
        "JOB_SCOPE_CHANGED",
        "Only the original member can continue this job",
      );
    this.documents.put(
      id,
      "bidproposal",
      key,
      JSON.stringify(principal),
      saved.revision,
    );
    const job = this.jobs.get(id, "bidproposal", jobId);
    for (const step of job?.steps ?? []) {
      if (!step.taskInstanceId) continue;
      this.reauthorizeTask(id, step.taskInstanceId, principal);
    }
  }
  /** Browser visits never silently replace a task's pinned product session. */
  reauthorizeTask(id: string, taskId: string, principal: Principal) {
    const key = internalAuth + "task_" + taskId;
    const saved = this.documents.get(id, "bidproposal", key);
    if (
      !saved ||
      !samePrincipal(JSON.parse(saved.markdown) as Principal, principal)
    )
      throw new WorkbenchError(
        403,
        "TASK_SCOPE_CHANGED",
        "Only the original member can continue this task",
      );
    this.documents.put(
      id,
      "bidproposal",
      key,
      JSON.stringify(principal),
      saved.revision,
    );
  }
  scope() {
    return this.library.scope(this.workspaceId, "bidproposal");
  }
  close() {
    this.closed = true;
    this.accounting.close();
    this.jobs.close();
    this.readings.close();
    this.renders.close();
    this.library.close();
    this.storage.closeAll();
  }
}

function sumBytes(content: Map<string, number>): number {
  return [...content.values()].reduce((a, b) => a + b, 0);
}
