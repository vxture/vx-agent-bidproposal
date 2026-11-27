"use client";
import type {ReactNode} from "react";
import {Icon} from "@vxture/design-system";
import {resourceCategoryLabel,isTemplate,resourceTitle,type ResourceData} from "../resources";

export function ResourceArtwork({children,className=""}:{children:ReactNode;className?:string}) {
  return <div className={"jadera-resource-preview "+className} aria-hidden><i/><i/><div>{children}</div></div>;
}

export function ResourcePreview({
  item,
  tenantLabel,
}: {
  item: Pick<ResourceData, "name" | "shortName" | "category" | "categoryLabel" | "coverStyle">;
  tenantLabel?: string;
}) {
  const template = isTemplate(item.category);
  return (
    <div
      className={
        "jadera-document-art " +
        (template
          ? "template"
          : (item.coverStyle === "certificate" || (!item.coverStyle && item.category === "certificate"))
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

        {template ? tenantLabel || "\u5f53\u524d\u79df\u6237" : resourceCategoryLabel(item)}
      </span>
      <strong>
        {resourceTitle(item)}
      </strong>
      <span>{resourceCategoryLabel(item)}</span>
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
