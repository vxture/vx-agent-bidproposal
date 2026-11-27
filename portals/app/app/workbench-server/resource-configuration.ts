import { randomUUID } from "node:crypto";
import type { BidRuntime } from "./service";
import type { Principal } from "./identity";
import { WorkbenchError } from "./identity";
import {
  DEFAULT_RESOURCE_TYPES,
  isTemplate,
  type ResourceType,
  type ResourcePerson,
  type ResourceData,
} from "@bidproposal/shared/resources";

const typeKey = "resource_type_configuration",
  memberKey = "resource_member_directory";
const storeFor = (service: BidRuntime) => {
  const scope = service.scope();
  return {
    scope,
    store: service.storage.openLibraryStore(scope.workspaceId, scope.productId)
      .store,
  };
};
export function resourceTypes(service: BidRuntime) {
  const { scope, store } = storeFor(service),
    saved = store.getProductDocument(scope.productId, typeKey);
  const items: ResourceType[] = saved
    ? JSON.parse(saved.markdown).items
    : DEFAULT_RESOURCE_TYPES;
  const resources = service.library.list(scope);
  return {
    revision: saved?.revision || 0,
    items: items.map((item) => ({
      ...item,
      usage: resources.filter((resource) => resource.category === item.id)
        .length,
    })),
  };
}
export function changeResourceTypes(
  service: BidRuntime,
  principal: Principal,
  input: Record<string, unknown>,
  id?: string,
  remove = false,
) {
  if (!principal.canManage)
    throw new WorkbenchError(
      403,
      "CONFIGURATION_FORBIDDEN",
      "\u5de5\u4f5c\u533a\u7ba1\u7406\u6743\u9650\u4e0d\u8db3",
    );
  const { scope, store } = storeFor(service),
    current = resourceTypes(service);
  if (input.revision !== current.revision)
    throw new WorkbenchError(
      409,
      "CONFIGURATION_CONFLICT",
      "\u7c7b\u578b\u914d\u7f6e\u5df2\u66f4\u65b0\uff0c\u8bf7\u5237\u65b0\u540e\u91cd\u8bd5",
    );
  const before = current.items.find((item) => item.id === id);
  if (id && !before)
    throw new WorkbenchError(
      404,
      "NOT_FOUND",
      "\u7c7b\u578b\u4e0d\u5b58\u5728",
    );
  let changedId = id;
  let items = current.items.map(({ usage, ...item }) => item);
  if (remove) {
    if (before!.usage)
      throw new WorkbenchError(
        409,
        "TYPE_IN_USE",
        "\u6b64\u7c7b\u578b\u5df2\u6709\u8d44\u6599\u4f7f\u7528\uff0c\u8bf7\u5148\u8c03\u6574\u8d44\u6599\u7c7b\u578b",
      );
    items = items.filter((item) => item.id !== id);
  } else {
    const label = typeof input.label === "string" ? input.label.trim() : "",
      collection = before?.collection || input.collection;
    if (
      !label ||
      label.length > 40 ||
      /[\x00-\x1f]/.test(label) ||
      !["knowledge", "templates"].includes(String(collection))
    )
      throw new WorkbenchError(
        400,
        "INVALID_INPUT",
        "\u8bf7\u8f93\u5165\u4e0d\u8d85\u8fc740\u5b57\u7684\u7c7b\u578b\u540d\u79f0",
      );
    if (
      items.some(
        (item) =>
          item.id !== id &&
          item.collection === collection &&
          item.label.toLocaleLowerCase() === label.toLocaleLowerCase(),
      )
    )
      throw new WorkbenchError(
        409,
        "TYPE_NAME_EXISTS",
        "\u7c7b\u578b\u540d\u79f0\u5df2\u5b58\u5728",
      );
    if (
      input.coverStyle !== undefined &&
      !["document", "certificate"].includes(String(input.coverStyle))
    )
      throw new WorkbenchError(
        400,
        "INVALID_INPUT",
        "\u5c01\u9762\u6837\u5f0f\u65e0\u6548",
      );
    if (collection === "templates" && input.coverStyle === "certificate")
      throw new WorkbenchError(
        400,
        "INVALID_INPUT",
        "\u6a21\u677f\u4f7f\u7528\u6587\u6863\u5c01\u9762",
      );
    const coverStyle =
      collection === "templates"
        ? "document"
        : input.coverStyle || before?.coverStyle || "document";
    const entry = {
      id:
        id ||
        (collection === "templates" ? "template_custom_" : "resource_") +
          randomUUID().replaceAll("-", "").slice(0, 12),
      label,
      collection,
      coverStyle,
    } as ResourceType;
    changedId = entry.id;
    if (before) items = items.map((item) => (item.id === id ? entry : item));
    else {
      if (items.length >= 100)
        throw new WorkbenchError(
          400,
          "TYPE_LIMIT",
          "\u6700\u591a\u914d\u7f6e100\u4e2a\u7c7b\u578b",
        );
      items.push(entry);
    }
  }
  const saved = store.getProductDocument(scope.productId, typeKey),
    prior = saved ? JSON.parse(saved.markdown) : {};
  if (
    !store.putProductDocument(
      scope.productId,
      typeKey,
      JSON.stringify({
        items,
        history: [
          ...(prior.history || []),
          {
            at: new Date().toISOString(),
            actorId: principal.sub,
            operation: remove ? "delete" : id ? "update" : "create",
            id: changedId,
            before,
            after: items.find((item) => item.id === changedId),
          },
        ],
      }),
      current.revision,
    )
  )
    throw new WorkbenchError(
      409,
      "CONFIGURATION_CONFLICT",
      "\u7c7b\u578b\u914d\u7f6e\u5df2\u66f4\u65b0\uff0c\u8bf7\u5237\u65b0\u540e\u91cd\u8bd5",
    );
  return resourceTypes(service);
}
export function rememberResourceMember(
  service: BidRuntime,
  principal: Principal,
) {
  if (!principal.displayName?.trim()) return;
  const { scope, store } = storeFor(service),
    saved = store.getProductDocument(scope.productId, memberKey);
  const items: ResourcePerson[] = saved ? JSON.parse(saved.markdown) : [];
  const entry = {
    id: principal.sub,
    name: principal.displayName,
    ...(principal.avatarSrc ? { avatarSrc: principal.avatarSrc } : {}),
  };
  const old = items.find((item) => item.id === entry.id);
  if (JSON.stringify(old) === JSON.stringify(entry)) return;
  store.putProductDocument(
    scope.productId,
    memberKey,
    JSON.stringify([...items.filter((item) => item.id !== entry.id), entry]),
    saved?.revision || 0,
  );
}
/** Historical attribution candidates, not an authoritative live membership roster. */
export function resourceMembers(service: BidRuntime) {
  const { scope, store } = storeFor(service),
    saved = store.getProductDocument(scope.productId, memberKey);
  const people = new Map<string, ResourcePerson>();
  const add = (person?: ResourcePerson) => {
    if (person?.id && person.name?.trim() && !people.has(person.id))
      people.set(person.id, person);
  };
  if (saved) for (const person of JSON.parse(saved.markdown)) add(person);
  for (const row of store.listProductDocuments(
    scope.productId,
    "library_item_",
  )) {
    const resource = JSON.parse(row.markdown) as ResourceData;
    add(resource.createdBy);
    add(resource.updatedBy);
    for (const version of resource.versions || []) add(version.uploadedBy);
  }
  return {
    items: [...people.values()].sort((a, b) =>
      (a.name || "").localeCompare(b.name || ""),
    ),
    complete: false,
  };
}
export function assertResourceType(service: BidRuntime, category: unknown) {
  if (
    typeof category !== "string" ||
    !resourceTypes(service).items.some((item) => item.id === category)
  )
    throw new WorkbenchError(
      400,
      "INVALID_TYPE",
      "\u8d44\u6599\u7c7b\u578b\u4e0d\u5b58\u5728\uff0c\u8bf7\u5237\u65b0\u540e\u9009\u62e9",
    );
  return category;
}
