"use client";
import { UserAvatar } from "@vxture/design-system";
import type { ResourcePerson, ResourceChangeSource } from "../resources";
const sourceLabels: Record<ResourceChangeSource, string> = {
  upload: "\u6587\u4ef6\u4e0a\u4f20", local_import: "\u672c\u5730\u5bfc\u5165",
  metadata: "\u8d44\u6599\u7ef4\u62a4", office: "\u5728\u7ebf\u7f16\u8f91", api: "\u63a5\u53e3\u5bfc\u5165",
};
/** The person is the actor; the import/edit mechanism is a separate attribute. */
export function ResourcePersonLabel({ person, via }: { person?: ResourcePerson; via?: ResourceChangeSource }) {
  return <span className="jadera-resource-person">
    <UserAvatar src={person?.avatarSrc} alt={person?.name || ""} className="size-icon-md" />
    <span>{person?.name || "\u672a\u8bb0\u5f55"}</span>
    {via && <span className="jadera-resource-person-source">{"\uff08"}{sourceLabels[via]}{"\uff09"}</span>}
  </span>;
}
