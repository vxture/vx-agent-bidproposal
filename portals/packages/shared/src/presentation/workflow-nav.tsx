"use client";
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  type AnchorHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { Icon, Progress, ShellSidebarNav } from "@vxture/design-system";
export interface WorkflowStep {
  id: string;
  label: string;
  state?: "pending" | "active" | "complete" | "blocked";
  startedAt?: string;
  completedAt?: string;
}
const labels = {
  pending: "\u672a\u5f00\u59cb",
  active: "\u8fdb\u884c\u4e2d",
  complete: "\u5df2\u5b8c\u6210",
  blocked: "\u5f85\u5904\u7406",
};
const Context = createContext<{ steps: WorkflowStep[]; collapsed: boolean }>({
  steps: [],
  collapsed: false,
});
const time = (value?: string) =>
  value
    ? new Date(value).toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "\u2014";
const duration = (start?: string, end?: string) => {
  if (!start || !end) return "\u2014";
  const seconds = Math.max(
    0,
    Math.round((Date.parse(end) - Date.parse(start)) / 1000),
  );
  return seconds < 60
    ? seconds + " \u79d2"
    : Math.round(seconds / 60) + " \u5206\u949f";
};
function WorkflowLink({
  href,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const { steps, collapsed } = useContext(Context),
    index = steps.findIndex((step) => href?.endsWith("/" + step.id)),
    step = steps[index];
  if (!step)
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  const parts = Children.map(children, (child, childIndex) => {
    if (!isValidElement(child)) return child;
    const element = child as ReactElement<Record<string, unknown>>;
    if (childIndex !== 0) return child;
    return cloneElement(
      element,
      {},
      <span
        className={
          "jadera-flow-symbol " + (props["aria-current"] ? "selected" : "")
        }
      >
        {collapsed ? (
          step.state === "complete" ? (
            <Icon name="check" size="sm" />
          ) : (
            index + 1
          )
        ) : (
          (element.props.children as ReactNode)
        )}
      </span>,
    );
  });
  return (
    <div
      className={
        "jadera-flow-item " +
        (collapsed ? "collapsed " : "") +
        (step.state || "pending")
      }
    >
      <a
        href={href}
        {...props}
        aria-label={step.label + " \u00b7 " + labels[step.state || "pending"]}
      >
        {parts}
        {!collapsed && (
          <span className="jadera-flow-status">
            {labels[step.state || "pending"]}
          </span>
        )}
      </a>
      <div
        className="jadera-step-time"
        aria-label={step.label + "\u7684\u73af\u8282\u65f6\u95f4"}
      >
        <span title={"\u5f00\u59cb " + time(step.startedAt)}>
          <Icon name="play" size="xs" />
          <time>{time(step.startedAt)}</time>
        </span>
        <span title={"\u5b8c\u6210 " + time(step.completedAt)}>
          <Icon name="stop" size="xs" />
          <time>{time(step.completedAt)}</time>
        </span>
        <span title={"\u8017\u65f6"}>
          <Icon name="timer" size="xs" />
          {duration(step.startedAt, step.completedAt)}
        </span>
      </div>
    </div>
  );
}
export function WorkflowNavigation({
  steps,
  projectId,
  activeId,
  collapsed,
  onToggle,
  pending,
}: {
  steps: WorkflowStep[];
  projectId: string;
  activeId: string;
  collapsed: boolean;
  onToggle: () => void;
  pending: number;
}) {
  const completed = steps.filter((step) => step.state === "complete").length,
    current = steps.find((step) => step.id === activeId);
  const total = steps.reduce(
    (sum, step) =>
      sum +
      (step.startedAt && step.completedAt
        ? Math.max(0, Date.parse(step.completedAt) - Date.parse(step.startedAt))
        : 0),
    0,
  );
  const icons = [
    "file-text",
    "list-checks",
    "tree-structure",
    "edit",
    "clipboard",
    "download",
  ] as const;
  return (
    <Context.Provider value={{ steps, collapsed }}>
      <div className="jadera-workflow-navigation" data-collapsed={collapsed}>
        <ShellSidebarNav
          domainName={"\u9879\u76ee\u6d41\u7a0b"}
          sections={[
            {
              title: "\u7f16\u5236\u6d41\u7a0b",
              items: [
                {
                  href: "#ws/" + projectId + "/overview",
                  label: "\u7f16\u5236\u8981\u6c42",
                  icon: "settings",
                },
                ...steps.map((step, i) => ({
                  href: "#ws/" + projectId + "/product/" + step.id,
                  label: step.label,
                  icon: icons[i]!,
                })),
              ],
            },
          ]}
          collapsed={collapsed}
          onToggleCollapsed={onToggle}
          isActive={(href) => href.endsWith("/" + activeId)}
          linkComponent={WorkflowLink}
          storageKeyPrefix="jadera-workflow"
          labels={{
            collapseNav: "\u6536\u8d77\u6d41\u7a0b\u5bfc\u822a",
            expandNav: "\u5c55\u5f00\u6d41\u7a0b\u5bfc\u822a",
            collapseAllGroups: "\u6536\u8d77\u5168\u90e8\u5206\u7ec4",
            expandAllGroups: "\u5c55\u5f00\u5168\u90e8\u5206\u7ec4",
          }}
          footer={
            !collapsed ? (
              <div className="jadera-flow-footer">
                <div>
                  <span>
                    {"\u9879\u76ee\u8fdb\u5c55 "}
                    <strong>{completed} / 6</strong>
                  </span>
                  <span
                    title={
                      "\u5df2\u5b8c\u6210\u73af\u8282\u7d2f\u8ba1\u8017\u65f6"
                    }
                  >
                    <Icon name="timer" size="xs" />
                    {total
                      ? Math.round(total / 60000) + " \u5206\u949f"
                      : "\u2014"}
                  </span>
                </div>
                <Progress value={(completed / 6) * 100} />
                <p>
                  {current?.label || "\u7f16\u5236\u8981\u6c42"}
                  {pending
                    ? " \u00b7 " + pending + " \u9879\u5f85\u786e\u8ba4"
                    : " \u00b7 \u6309\u73af\u8282\u7ee7\u7eed\u7f16\u5236"}
                </p>
              </div>
            ) : (
              <span
                className="jadera-collapsed-progress"
                title={"\u9879\u76ee\u8fdb\u5c55 " + completed + " / 6"}
              >
                {completed}/6
              </span>
            )
          }
        />
      </div>
    </Context.Provider>
  );
}
