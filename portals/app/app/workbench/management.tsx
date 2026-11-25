"use client";
import {
  Button,
  ShellSidebarNav,
  ShellPageContainer,
} from "@vxture/design-system";
import type { AccessState } from "../access/types";
import { displayNameFor } from "../auth/lib/display";

export function Management({
  access,
  page,
  onNavigate,
}: {
  access: AccessState;
  page: string;
  onNavigate: (hash: string) => void;
}) {
  const user = "user" in access ? access.user : undefined;
  return (
    <ShellPageContainer className="jadera-management-page" width="wide-2xl">
      <header>
        <span>{"\u914d\u7f6e\u7ba1\u7406"}</span>
        <h1>
          {page === "account"
            ? "\u4e2a\u4eba\u4fe1\u606f"
            : page === "members"
              ? "\u6210\u5458\u4e0e\u6743\u9650"
              : "\u6982\u89c8"}
        </h1>
        <p>
          {
            "\u5f53\u524d\u5de5\u4f5c\u533a\u7684\u4ea7\u54c1\u8d44\u6e90\u4e0e\u7ba1\u7406\u8303\u56f4\u3002"
          }
        </p>
      </header>
      {page === "account" ? (
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
      ) : page === "members" ? (
        <section>
          <h2>{"\u6210\u5458\u4e0e\u6743\u9650"}</h2>
          <p>
            {
              "\u7ec4\u7ec7\u6210\u5458\u5173\u7cfb\u3001\u5de5\u4f5c\u533a\u6743\u9650\u4e0e\u672c\u4ea7\u54c1\u4f7f\u7528\u8d44\u683c\u5206\u522b\u7ba1\u7406\u3002\u9879\u76ee\u8bbf\u95ee\u7ee7\u7eed\u7531\u5f53\u524d\u5de5\u4f5c\u533a\u4e0e\u4ea7\u54c1\u8eab\u4efd\u6821\u9a8c\u3002"
            }
          </p>
          <Button asChild variant="outline">
            <a
              href="https://console.vxture.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              {"\u524d\u5f80\u5de5\u4f5c\u533a\u7ba1\u7406"}
            </a>
          </Button>
        </section>
      ) : (
        <section>
          <h2>
            {user?.activeWorkspaceName || "\u5f53\u524d\u5de5\u4f5c\u533a"}
          </h2>
          <p>
            {
              "\u77e5\u8bc6\u8d44\u6599\u4e0e\u6807\u4e66\u9879\u76ee\u5c5e\u4e8e\u524d\u53f0\u5de5\u4f5c\u6a21\u5757\u3002\u5957\u9910\u3001\u6743\u76ca\u548c\u8d26\u5355\u7ee7\u7eed\u5728\u5e73\u53f0\u5de5\u4f5c\u533a\u7ba1\u7406\u3002"
            }
          </p>
          <div className="jadera-management-actions">
            <Button variant="outline" onClick={() => onNavigate("#projects")}>
              {"\u67e5\u770b\u6807\u4e66\u9879\u76ee"}
            </Button>
            <Button variant="outline" onClick={() => onNavigate("#library")}>
              {"\u67e5\u770b\u77e5\u8bc6\u8d44\u6599"}
            </Button>
          </div>
        </section>
      )}
    </ShellPageContainer>
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
