"use client";
import { useState } from "react";
import {
  ShellPanelHeader,
  ShellPanelSection,
  ShellPanelRow,
  ShellPanelContent,
  ShellScopePanel,
  Popover,
  PopoverTrigger,
  StatusBadge,
} from "@vxture/design-system";
import { ProductResourceMeter } from "./resource-meter";
import type { HeaderIdentity } from "./header";
import { useMediaQuery } from "./use-media-query";

export interface ProductScopeOption {
  organizationId: string;
  name: string;
  personal: boolean;
  workspaces: { id: string; name: string; isDefault?: boolean }[];
}

/** Product scope overview: platform identity, resource integration and product exits. */
export function ProductOrganizationPanel({
  identity,
}: {
  identity: HeaderIdentity;
}) {
  const [switching, setSwitching] = useState(false);
  const compact = useMediaQuery("(max-width: 1024px)");
  const options =
    identity.scopeOptions ??
    (identity.organizationId && identity.workspaceId
      ? [
          {
            organizationId: identity.organizationId,
            name: identity.organization || identity.name,
            personal: Boolean(identity.personal),
            workspaces: [
              { id: identity.workspaceId, name: identity.workspace || "" },
            ],
          },
        ]
      : []);
  const key = (organizationId: string, workspaceId: string) =>
    JSON.stringify([organizationId, workspaceId]);
  return (
    <>
      <ShellPanelHeader
        className="jadera-organization-identity"
        icon="buildings"
        lead={identity.organizationLogoSrc ? "avatar" : "icon"}
        avatarSrc={identity.organizationLogoSrc}
        avatarAlt={identity.organization}
        title={identity.organization || identity.name}
        titleAside={
          <StatusBadge tone="neutral" size="xs" icon={false}>
            {identity.personal
              ? "\u4e2a\u4eba\u79df\u6237"
              : "\u7ec4\u7ec7\u79df\u6237"}
          </StatusBadge>
        }
        metaRows={[
          ...(identity.workspace
            ? [{ key: "workspace", content: identity.workspace }]
            : []),
        ]}
      />
      <ShellPanelSection title={"\u8d44\u6e90"}>
        <ProductResourceMeter metric={identity.resources?.aiCredit} />
        <ProductResourceMeter storage metric={identity.resources?.storage} />
      </ShellPanelSection>
      <ShellPanelSection>
        <ShellPanelRow
          icon="app-grid"
          label={"\u5e94\u7528\u4e2d\u5fc3"}
          description={"\u8bbf\u95ee\u5168\u90e8\u5e94\u7528"}
          href="https://ruyin.work/"
          newTab
          trailingIcon="external-link"
        />
        <ShellPanelRow
          icon="buildings"
          label={"\u7ec4\u7ec7\u4fe1\u606f"}
          description={"\u67e5\u770b\u7ec4\u7ec7\u8d44\u6599\u4e0e\u8ba4\u8bc1"}
          href="https://console.vxture.com/zh-CN/tenant"
          newTab
          trailingIcon="external-link"
        />
        <Popover open={switching} onOpenChange={setSwitching}>
          <PopoverTrigger asChild>
            <div>
              <ShellPanelRow
                icon="arrow-left-right"
                label={"\u5207\u6362\u7ec4\u7ec7"}
                description={
                  "\u9009\u62e9\u7ec4\u7ec7\u53ca\u5176\u5de5\u4f5c\u7a7a\u95f4"
                }
                active={switching}
                onClick={() => setSwitching(true)}
              />
            </div>
          </PopoverTrigger>
          <ShellPanelContent
            side={compact === false ? "right" : "bottom"}
            align="end"
            collisionPadding={12}
            aria-label={
              "\u5207\u6362\u7ec4\u7ec7\u4e0e\u5de5\u4f5c\u7a7a\u95f4"
            }
          >
            <ShellScopePanel
              ariaLabel={"\u7ec4\u7ec7\u4e0e\u5de5\u4f5c\u7a7a\u95f4"}
              value={
                identity.organizationId && identity.workspaceId
                  ? key(identity.organizationId, identity.workspaceId)
                  : undefined
              }
              groups={options.map((group) => ({
                key: group.organizationId,
                title: group.name,
                icon: group.personal ? "user" : "buildings",
                titleAside: (
                  <StatusBadge size="xs" tone="neutral" icon={false}>
                    {group.personal
                      ? "\u4e2a\u4eba\u79df\u6237"
                      : "\u7ec4\u7ec7\u79df\u6237"}
                  </StatusBadge>
                ),
                options: group.workspaces.map((workspace) => ({
                  key: key(group.organizationId, workspace.id),
                  label: workspace.name,
                  icon: "folder",
                  description: workspace.isDefault
                    ? "\u767b\u5f55\u540e\u9ed8\u8ba4\u8fdb\u5165"
                    : undefined,
                })),
              }))}
              onSelect={(selected) => {
                for (const group of options)
                  for (const workspace of group.workspaces) {
                    if (key(group.organizationId, workspace.id) !== selected)
                      continue;
                    if (
                      group.organizationId === identity.organizationId &&
                      workspace.id === identity.workspaceId
                    ) {
                      setSwitching(false);
                      return;
                    }
                    const target = new URL(
                      "/auth/login",
                      window.location.origin,
                    );
                    target.searchParams.set("tenantId", group.organizationId);
                    target.searchParams.set("workspaceId", workspace.id);
                    window.location.assign(target.href);
                  }
              }}
            />
            {!identity.scopeOptions && (
              <p
                role="status"
                className="px-sm text-body-small text-muted-foreground"
              >
                {
                  "\u5176\u4ed6\u7ec4\u7ec7\u4e0e\u5de5\u4f5c\u7a7a\u95f4\u5217\u8868\u5bf9\u63a5\u4e2d"
                }
              </p>
            )}
          </ShellPanelContent>
        </Popover>
      </ShellPanelSection>
    </>
  );
}
