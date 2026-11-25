"use client";
import {
  ResourceCollection as SharedResourceCollection,
  type ResourceCollectionProps,
  type ResourceRequestOptions,
} from "@bidproposal/shared/presentation";
export { ResourcePreview } from "@bidproposal/shared/presentation";

export async function libraryRequest(path = "", init?: ResourceRequestOptions) {
  const r = await fetch("/api/workbench/library" + path, {
    ...init,
    headers: { "content-type": "application/json" },
    redirect: "error",
    credentials: "same-origin",
    cache: "no-store",
  });
  const value = await r.json();
  if (!r.ok)
    throw Error(
      value.message ||
        "\u8d44\u6599\u64cd\u4f5c\u672a\u5b8c\u6210\uff0c\u8bf7\u91cd\u8bd5",
    );
  return value;
}
export function ResourceCollection({
  request = libraryRequest,
  ...props
}: Omit<ResourceCollectionProps, "request"> & {
  request?: ResourceCollectionProps["request"];
}) {
  return <SharedResourceCollection {...props} request={request} />;
}
