"use client";
import type {ReactNode} from "react";
import {Icon} from "@vxture/design-system";
import {RESOURCE_CATEGORIES,isTemplate,resourceTitle,type ResourceData} from "../resources";

export function ResourceArtwork({children,className=""}:{children:ReactNode;className?:string}) {
  return <div className={"jadera-resource-preview "+className} aria-hidden><i/><i/><div>{children}</div></div>;
}

export function ResourcePreview({
  item,
  tenantLabel,
}: {
  item: Pick<ResourceData, "name" | "shortName" | "category">;
  tenantLabel?: string;
}) {
  const template = isTemplate(item.category);
  return (
    <div
      className={
        "jadera-document-art " +
        (template
          ? "template"
          : item.category === "qualification"
            ? "certificate"
            : "case")
      }
    >
      <span className="jadera-document-eyebrow">
      <Icon
        name={
          template
            ? "file-text"
            : item.category === "qualification"
              ? "certificate"
              : "buildings"
        }
        size="xs"
      />

        {template ? tenantLabel || "\u5f53\u524d\u79df\u6237" : RESOURCE_CATEGORIES[item.category as keyof typeof RESOURCE_CATEGORIES] || item.category}
      </span>
      <strong>
        {resourceTitle(item)}
      </strong>
      <span>{RESOURCE_CATEGORIES[item.category as keyof typeof RESOURCE_CATEGORIES] || "\u77e5\u8bc6\u8d44\u6599"}</span>
      <div className="jadera-document-lines">
        <i />
        <i />
        <i />
      </div>
      <span className="jadera-document-seal" aria-hidden>
        {"\u7ae0"}
      </span>
    </div>
  );
}
