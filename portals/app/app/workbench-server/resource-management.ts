import type { BidRuntime } from "./service";
import { WorkbenchError } from "./identity";
import { isTemplate, type ResourceData, type ResourceChangeSource, type ResourceReference } from "@bidproposal/shared/resources";
import { randomUUID } from "node:crypto";
import { fileFormat } from "@bidproposal/shared/file-formats";
import { assertResourceType, resourceTypes, resourceMembers } from "./resource-configuration";

const UUID = /^(?:[a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i;
/** Reverse the existing immutable pins; never infer use from names or text. */
export async function resourceReferences(service: BidRuntime, id: string): Promise<ResourceReference[]> {
  managedResource(service, id);
  const result: ResourceReference[] = [];
  for (const project of await service.listProjects()) {
    try { await service.checkProject(project.id); }
    catch (error) { if (error instanceof WorkbenchError && [403, 404].includes(error.status)) continue; throw error; }
    const compilations = await service.compilations.list(project.id);
    for (const entry of compilations.items.filter(item => item.state === "ready")) {
      const view = await service.checkProject(entry.id);
      const pin = service.library.selections(entry.id, "bidproposal").items.find(item => item.id === id);
      if (pin) result.push({ projectId: entry.id, projectName: project.name, compilationLabel: entry.label,
        owner: project.owner || project.creator, version: pin.version, referencedAt: pin.selectedAt,
        archived: !!view.meta.archivedAt });
    }
  }
  return result.sort((a, b) => b.referencedAt.localeCompare(a.referencedAt));
}
function allocateResourceNumber(service: BidRuntime, category: string) {
  const scope = service.scope(), store = service.storage.openLibraryStore(scope.workspaceId, scope.productId).store;
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format().replace(/\D/g, "");
  const key = "resource_sequence_" + date;
  for (let attempt = 0; attempt < 20; attempt++) {
    const saved = store.getProductDocument(scope.productId, key);
    const value = Number(saved ? JSON.parse(saved.markdown).value : 0) + 1;
    if (!store.putProductDocument(scope.productId, key, JSON.stringify({ value }), saved?.revision || 0)) continue;
    const number = `${isTemplate(category) ? "TPL" : "DOC"}-${date}-${String(value).padStart(4, "0")}`;
    if (!service.library.list(scope).some(item => (JSON.parse(store.getProductDocument(scope.productId, "library_item_" + item.id)?.markdown || "{}").resourceNumber) === number)) return number;
  }
  throw new WorkbenchError(409, "RESOURCE_CONFLICT", "Resource number allocation busy; retry");
}

export async function importResource(service: BidRuntime, input: Record<string, unknown>, actorId: string, actorName?: string, context: { source?: ResourceChangeSource; avatarSrc?: string } = {}) {
  const actor = { id: actorId, ...(actorName ? { name: actorName } : {}), ...(context.avatarSrc ? { avatarSrc: context.avatarSrc } : {}) };
  const source = context.source || "upload";
  const scope = service.scope();
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const format = fileFormat(name);
  if (!format || !name || name.length > 200 || /[\x00-\x1f\\/]/.test(name))
    throw new WorkbenchError(400, "INVALID_FILE", "Unsupported file or resource type");
  assertResourceType(service,input.category);
  const old = typeof input.id === "string" ? managedResource(service, input.id) : undefined;
  if (old && (input.expectedVersion !== old.versions.length || input.revision !== old.revision || input.category !== old.category))
    throw new WorkbenchError(409, "RESOURCE_CONFLICT", "Resource changed; reload before uploading");
  if (["docx", "pdf", "md"].includes(format.extension)) {
    const area = service.storage.openLibraryStore(scope.workspaceId, scope.productId);
    const before = old && area.store.getProductDocument(scope.productId, "library_item_" + old.id);
    const item = await service.library.import(scope, input);
    const prior = before ? JSON.parse(before.markdown) : {};
    const saved = area.store.getProductDocument(scope.productId, "library_item_" + item.id)!;
    const current = JSON.parse(saved.markdown);
    const next = { ...current, name: old?.name || current.name,
      resourceNumber: prior.resourceNumber, shortName: prior.shortName,
      description: prior.description || "", usageNotes: prior.usageNotes || "", tags: prior.tags || [],
      createdAt: prior.createdAt || current.versions[0]?.addedAt,
      createdBy: prior.createdBy || (!old ? actor : undefined), updatedBy: actor,
      createdVia: prior.createdVia || (!old ? source : undefined), updatedVia: source,
      metadataHistory: prior.metadataHistory || [],
      versions: current.versions.map((entry: ResourceData["versions"][number], index: number) => ({ ...entry,
        uploadedBy: prior.versions?.[index]?.uploadedBy || (index >= (old?.versions.length || 0) ? actor : undefined),
        source: prior.versions?.[index]?.source || (index >= (old?.versions.length || 0) ? source : undefined) })) };
    if (!area.store.putProductDocument(scope.productId, "library_item_" + item.id, JSON.stringify(next), saved.revision))
      throw new WorkbenchError(409, "RESOURCE_CONFLICT", "Resource changed; reload before uploading");
    return managedResource(service, item.id);
  }
  const bytes = Buffer.from(String(input.base64), "base64");
  if (!bytes.length || bytes.length > 20 * 1024 * 1024 || bytes.toString("base64") !== input.base64)
    throw new WorkbenchError(400, "INVALID_FILE", "Invalid file bytes");
  const valid = format.extension === "png" ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    : ["jpg", "jpeg"].includes(format.extension) ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : format.extension === "gif" ? /^GIF8[79]a$/.test(bytes.subarray(0, 6).toString())
    : format.extension === "webp" ? bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP"
    : bytes[0] === 80 && bytes[1] === 75;
  if (!valid) throw new WorkbenchError(400, "INVALID_FILE", "File contents do not match its format");
  const mime = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation" };
  const area = service.storage.openLibraryStore(scope.workspaceId, scope.productId);
  const stored = await area.files.putBytes(bytes);
  if (old?.versions.at(-1)?.hash === stored.hash) return old;
  const at = new Date().toISOString(), id = old?.id || randomUUID();
  const version = { ...stored, fileId: "file_" + randomUUID().replaceAll("-", ""), readingId: "", name, mediaType: mime[format.extension as keyof typeof mime], addedAt: at, uploadedBy: actor, source, version: (old?.versions.length || 0) + 1 };
  area.store.addFile({ id: version.fileId, hash: version.hash, bytes: version.bytes, name, mediaType: version.mediaType, addedAt: at });
  const saved = area.store.getProductDocument(scope.productId, "library_item_" + id);
  const prior = saved ? JSON.parse(saved.markdown) : undefined;
  const next = { ...prior, id, name: old?.name || name, category: input.category, versions: [...(old?.versions || []), version], updatedAt: at,
    createdAt: prior?.createdAt || old?.versions[0]?.addedAt || at,
    createdBy: prior?.createdBy || (!old ? actor : undefined), updatedBy: actor,
    createdVia: prior?.createdVia || (!old ? source : undefined), updatedVia: source };
  if (!area.store.putProductDocument(scope.productId, "library_item_" + id, JSON.stringify(next), saved?.revision || 0))
    throw new WorkbenchError(409, "RESOURCE_CONFLICT", "Resource changed; reload before uploading");
  return managedResource(service, id);
}

/** Product metadata adapter over the runtime's durable resource record. */
export function managedResource(service: BidRuntime, id: string) {
  const scope = service.scope();
  const item = service.library.get(scope, id);
  if (!item) throw new WorkbenchError(404, "NOT_FOUND", "Resource unavailable");
  const store = service.storage.openLibraryStore(scope.workspaceId, scope.productId).store;
  let saved = store.getProductDocument(scope.productId, "library_item_" + id);
  if (saved) {
    const record = JSON.parse(saved.markdown);
    if (!record.resourceNumber || UUID.test(record.resourceNumber)) {
      record.resourceNumber = allocateResourceNumber(service, record.category);
      if (!store.putProductDocument(scope.productId, "library_item_" + id, JSON.stringify(record), saved.revision))
        throw new WorkbenchError(409, "RESOURCE_CONFLICT", "Resource changed; reload before reading");
      saved = store.getProductDocument(scope.productId, "library_item_" + id);
    }
  }
  const metadata = JSON.parse(saved?.markdown || "{}") as ResourceData;
  const type=resourceTypes(service).items.find(type=>type.id===item.category);
  return { ...item, versions: item.versions.map(entry => ({ ...entry,
      uploadedBy: metadata.versions?.find(version => version.version === entry.version)?.uploadedBy,
      source: metadata.versions?.find(version => version.version === entry.version)?.source })),
    categoryLabel:type?.label,coverStyle:type?.coverStyle||"document",
    resourceNumber: metadata.resourceNumber, shortName: metadata.shortName || "", description: metadata.description || "", usageNotes: metadata.usageNotes || "", tags: metadata.tags || [],
    createdAt: metadata.createdAt, createdBy: metadata.createdBy, updatedBy: metadata.updatedBy,
    createdVia: metadata.createdVia, updatedVia: metadata.updatedVia, revision: saved?.revision || 0 };
}

export function updateResource(service: BidRuntime, id: string, input: Record<string, unknown>, actorId: string, actorName?: string, actorAvatarSrc?: string) {
  const scope = service.scope();
  const store = service.storage.openLibraryStore(scope.workspaceId, scope.productId).store;
  const saved = store.getProductDocument(scope.productId, "library_item_" + id);
  if (!saved) throw new WorkbenchError(404, "NOT_FOUND", "Resource unavailable");
  if (!Number.isSafeInteger(input.revision) || input.revision !== saved.revision)
    throw new WorkbenchError(409, "RESOURCE_CONFLICT", "Resource changed; reload before saving");
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name || name.length > 200 || /[\x00-\x1f\\/]/.test(name))
    throw new WorkbenchError(400, "INVALID_INPUT", "Enter a name and valid resource type");
  assertResourceType(service,input.category);
  const item = JSON.parse(saved.markdown);
  if(Object.hasOwn(input,"updatedBy")||Object.hasOwn(input,"updatedAt")||Object.hasOwn(input,"createdBy")||Object.hasOwn(input,"createdAt"))throw new WorkbenchError(400,"ACTOR_READ_ONLY","Actor records are server-managed");
  let creator=item.createdBy;
  if(Object.hasOwn(input,"createdById")){
    if(item.createdBy?.id)throw new WorkbenchError(409,"CREATOR_LOCKED","Creator is already recorded");
    creator=resourceMembers(service).items.find(member=>member.id===input.createdById);
    if(!creator)throw new WorkbenchError(400,"INVALID_CREATOR","Select a known member of this workspace");
  }
  if (isTemplate(item.category) !== isTemplate(String(input.category)))
    throw new WorkbenchError(400, "COLLECTION_MISMATCH", "Choose a type in the same collection");
  const fields = { resourceNumber: item.resourceNumber || allocateResourceNumber(service, item.category), shortName: item.shortName || "", description: item.description || "", usageNotes: item.usageNotes || "", tags: item.tags || [] };
  if (Object.hasOwn(input, "resourceNumber")) {
    const number = typeof input.resourceNumber === "string" ? input.resourceNumber.trim().toUpperCase() : "";
    if (!/^[A-Z0-9][A-Z0-9._-]{1,47}$/.test(number) || UUID.test(number))
      throw new WorkbenchError(400, "INVALID_INPUT", "Use a business number of 2-48 letters, numbers, dots, dashes or underscores");
    if (service.library.list(scope).some(other => other.id !== id && (JSON.parse(store.getProductDocument(scope.productId, "library_item_" + other.id)?.markdown || "{}").resourceNumber || "").toUpperCase() === number))
      throw new WorkbenchError(409, "NUMBER_CONFLICT", "This resource number is already in use");
    fields.resourceNumber = number;
  }
  if (Object.hasOwn(input, "shortName")) {
    if (typeof input.shortName !== "string" || input.shortName.trim().length > 60 || /[\x00-\x1f]/.test(input.shortName))
      throw new WorkbenchError(400, "INVALID_INPUT", "Use a document short name up to 60 characters");
    fields.shortName = input.shortName.trim();
  }
  for (const [key, limit] of [["description", 1000], ["usageNotes", 2000]] as const) {
    if (!Object.hasOwn(input, key)) continue;
    if (typeof input[key] !== "string" || input[key].length > limit)
      throw new WorkbenchError(400, "INVALID_INPUT", "Resource description or usage notes are too long");
    fields[key] = input[key].trim();
  }
  if (Object.hasOwn(input, "tags")) {
    if (!Array.isArray(input.tags) || input.tags.length > 10 || input.tags.some(tag => typeof tag !== "string" || !tag.trim() || tag.trim().length > 24 || /[\x00-\x1f]/.test(tag)))
      throw new WorkbenchError(400, "INVALID_INPUT", "Use up to ten tags of 24 characters each");
    fields.tags = [...new Set(input.tags.map(tag => tag.trim()))];
  }
  const previous = { name: item.name, category: item.category, resourceNumber: item.resourceNumber || "", shortName: item.shortName || "", description: item.description || "", usageNotes: item.usageNotes || "", tags: item.tags || [] };
  const changed = { name, category: input.category, ...fields };
  if (JSON.stringify(previous) === JSON.stringify(changed)&&JSON.stringify(creator)===JSON.stringify(item.createdBy)) return managedResource(service, id);
  const next = { ...item, ...changed,...(creator?{createdBy:creator}:{}), updatedAt: new Date().toISOString(), updatedBy: { id: actorId, ...(actorName ? { name: actorName } : {}), ...(actorAvatarSrc ? { avatarSrc: actorAvatarSrc } : {}) }, updatedVia: "metadata",
    metadataHistory: [...(item.metadataHistory || []), { actorId, at: new Date().toISOString(), before: {...previous,createdBy:item.createdBy}, after: {...changed,createdBy:creator} }] };
  if (!store.putProductDocument(scope.productId, "library_item_" + id, JSON.stringify(next), saved.revision))
    throw new WorkbenchError(409, "RESOURCE_CONFLICT", "Resource changed; reload before saving");
  return managedResource(service, id);
}
