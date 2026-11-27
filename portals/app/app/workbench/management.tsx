"use client";
import {
  Button,
  ViewHeader,
  Icon,
  ShellSidebarNav,
  ContentWidthContainer,
} from "@vxture/design-system";
import {
  ResourceTypeSettings,
  ResourceMemberDirectory,
} from "@bidproposal/shared/presentation";
import { libraryRequest } from "./resource-collection";
import type { ResourceRequest } from "@bidproposal/shared/presentation";
import type { AccessState } from "../access/types";
import { displayNameFor } from "../auth/lib/display";

export function Management({
  access,
  page,
  onNavigate,
  request = libraryRequest,
}: {
  request?: ResourceRequest;
  access: AccessState;
  page: string;
  onNavigate: (hash: string) => void;
}) {
  const user = "user" in access ? access.user : undefined;
  return (
    <ContentWidthContainer className="jadera-management-page" data-page-scroll>
      <ViewHeader
        icon="settings"
        title={
          page === "resource-types"
            ? "\u8d44\u6599\u7c7b\u578b"
            : page === "template-types"
              ? "\u6a21\u677f\u7c7b\u578b"
              : page === "members"
                ? "\u5de5\u4f5c\u533a\u6210\u5458"
                : page === "account"
                  ? "\u4e2a\u4eba\u4fe1\u606f"
                  : "\u914d\u7f6e\u7ba1\u7406"
        }
        description={
          "\u7ef4\u62a4\u5de5\u4f5c\u533a\u8d44\u6599\u5206\u7c7b\u4e0e\u4ea7\u54c1\u4f7f\u7528\u4fe1\u606f\u3002"
        }
        divider
      />
      {page === "resource-types" || page === "template-types" ? (
        <ResourceTypeSettings
          request={request}
          collection={page === "template-types" ? "templates" : "knowledge"}
        />
      ) : page === "members" ? (
        <ResourceMemberDirectory request={request} />
      ) : page === "account" ? (
        <section>
          <h2>{"\u5f53\u524d\u8d26\u53f7"}</h2>
          <dl>
            <div>
              <dt>{"\u7528\u6237\u540d\u79f0"}</dt>
              <dd>{displayNameFor(user, "\u5f53\u524d\u8d26\u53f7")}</dd>
            </div>
            <div>
              <dt>{"\u7ec4\u7ec7"}</dt>
              <dd>
                {user?.activeOrgName ||
                  "\u672a\u63d0\u4f9b\u7ec4\u7ec7\u540d\u79f0"}
              </dd>
            </div>
            <div>
              <dt>{"\u5de5\u4f5c\u533a"}</dt>
              <dd>
                {user?.activeWorkspaceName ||
                  "\u672a\u63d0\u4f9b\u5de5\u4f5c\u533a\u540d\u79f0"}
              </dd>
            </div>
          </dl>
          <Button asChild variant="outline">
            <a
              href="https://accounts.vxture.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              {"\u524d\u5f80\u8d26\u53f7\u4e2d\u5fc3"}
            </a>
          </Button>
        </section>
      ) : (
        <div className="jadera-management-entries">
          {[
            {
              page: "resource-types",
              title: "\u8d44\u6599\u7c7b\u578b",
              description:
                "\u77e5\u8bc6\u8d44\u6599\u7684\u5206\u7c7b\u540d\u79f0\u4e0e\u5c01\u9762\u6837\u5f0f",
              icon: "book-open",
            },
            {
              page: "template-types",
              title: "\u6a21\u677f\u7c7b\u578b",
              description:
                "\u6807\u4e66\u6a21\u677f\u7684\u5206\u7c7b\u4e0e\u7b5b\u9009\u9009\u9879",
              icon: "file-text",
            },
            {
              page: "members",
              title: "\u5de5\u4f5c\u533a\u6210\u5458",
              description:
                "\u8d44\u6599\u5f52\u5c5e\u5019\u9009\u6210\u5458\u4e0e\u5de5\u4f5c\u533a\u7ba1\u7406",
              icon: "users",
            },
            {
              page: "account",
              title: "\u4e2a\u4eba\u4fe1\u606f",
              description:
                "\u5f53\u524d\u8d26\u53f7\u3001\u6240\u5c5e\u7ec4\u7ec7\u4e0e\u5de5\u4f5c\u533a",
              icon: "user",
            },
          ].map((entry) => (
            <button
              key={entry.page}
              type="button"
              onClick={() => onNavigate("#admin/" + entry.page)}
            >
              <Icon
                name={
                  entry.icon as "book-open" | "file-text" | "users" | "user"
                }
                size="lg"
              />
              <span>
                <strong>{entry.title}</strong>
                <small>{entry.description}</small>
              </span>
              <Icon name="chevron-right" size="sm" />
            </button>
          ))}
        </div>
      )}
    </ContentWidthContainer>
  );
}
export function ManagementNavigation({
  page,
  collapsed,
  onToggle,
}: {
  page: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <ShellSidebarNav
      domainName={"\u914d\u7f6e\u7ba1\u7406"}
      sections={[
        {
          title: "\u5de5\u4f5c\u533a",
          items: [
            { href: "#admin", label: "\u6982\u89c8", icon: "home" },
            {
              href: "#admin/resource-types",
              label: "\u8d44\u6599\u7c7b\u578b",
              icon: "book-open",
            },
            {
              href: "#admin/template-types",
              label: "\u6a21\u677f\u7c7b\u578b",
              icon: "file-text",
            },
            {
              href: "#admin/account",
              label: "\u4e2a\u4eba\u4fe1\u606f",
              icon: "user",
            },
            {
              href: "#admin/members",
              label: "\u6210\u5458\u4e0e\u6743\u9650",
              icon: "users",
            },
          ],
        },
      ]}
      collapsed={collapsed}
      onToggleCollapsed={onToggle}
      isActive={(href) =>
        href === (page === "overview" ? "#admin" : "#admin/" + page)
      }
      storageKeyPrefix="jadera-management"
      labels={{
        collapseNav: "\u6536\u8d77\u7ba1\u7406\u5bfc\u822a",
        expandNav: "\u5c55\u5f00\u7ba1\u7406\u5bfc\u822a",
        collapseAllGroups: "\u6536\u8d77\u5168\u90e8\u5206\u7ec4",
        expandAllGroups: "\u5c55\u5f00\u5168\u90e8\u5206\u7ec4",
      }}
    />
  );
}
