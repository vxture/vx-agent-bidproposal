"use client";
/** Host-independent product chrome. Identity and navigation are supplied by the host. */
import {
  useState,
  useLayoutEffect,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import {
  Button,
  Icon,
  Popover,
  PopoverTrigger,
  PopoverContent,
  ShellHeader,
  ShellIconButton,
  ShellAgentButton,
  ShellIconGroup,
  ShellScopeButton,
  ShellPanelContent,
  ShellPanelRow,
  ShellUserMenu,
  ShellThemeToggle,
  ShellFullscreenToggle,
  useTheme,
} from "@vxture/design-system";

import { refreshCurrentPage } from "./page-refresh";
import { ProductOrganizationPanel } from "./organization-panel";
import type { ProductScopeOption } from "./organization-panel";
import { ProductPreferences } from "./preferences";
import type { WorkspaceResourceUsage } from "./resource-meter";

const navigation = [
  ["home", "\u9996\u9875"],
  ["projects", "\u6807\u4e66\u9879\u76ee"],
  ["knowledge", "\u77e5\u8bc6\u8d44\u6599"],
  ["templates", "\u6a21\u677f\u7ba1\u7406"],
] as const;
function phoneParts(raw: string) {
  const phone = parsePhoneNumberFromString(
    raw.trim().replace(/^00(?=\d)/, "+"),
    "CN",
  );
  if (!phone?.isValid()) return { number: raw };
  const national = String(phone.nationalNumber);
  return {
    callingCode: "+" + phone.countryCallingCode,
    number:
      phone.countryCallingCode === "86" && /^1\d{10}$/.test(national)
        ? national.slice(0, 3) +
          " " +
          national.slice(3, 7) +
          " " +
          national.slice(7)
        : phone
            .formatInternational()
            .slice(phone.countryCallingCode.length + 2),
  };
}
export interface HeaderIdentity {
  phone?: string;
  realNameVerified?: boolean;
  name: string;
  organization?: string;
  organizationShortName?: string;
  organizationLogoSrc?: string;
  workspace?: string;
  email?: string;
  account?: string;
  avatarSrc?: string;
  personal?: boolean;
  resources?: WorkspaceResourceUsage;
  organizationId?: string;
  workspaceId?: string;
  scopeOptions?: ProductScopeOption[];
}
export function ApplicationHeader({
  brand,
  identity,
  page,
  onNavigate,
  onSignOut,
  onAssistant,
  assistantOpen = false,
  search,
}: {
  brand: ReactNode;
  identity: HeaderIdentity;
  page: string;
  projectCount: number;
  onNavigate: (page: string) => void;
  onSignOut: () => void;
  onAssistant: () => void;
  assistantOpen?: boolean;
  search?: ReactNode;
}) {
  const [refreshing, setRefreshing] = useState(false),
    [refreshNotice, setRefreshNotice] = useState("");
  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshNotice("");
    try {
      const refreshed = await refreshCurrentPage();
      setRefreshNotice(
        refreshed
          ? ""
          : "\u8bf7\u5148\u4fdd\u5b58\u6216\u653e\u5f03\u5f53\u524d\u4fee\u6539\uff0c\u518d\u5237\u65b0\u3002",
      );
    } catch {
      setRefreshNotice(
        "\u6682\u65f6\u65e0\u6cd5\u5237\u65b0\uff0c\u73b0\u6709\u5185\u5bb9\u5df2\u4fdd\u7559\u3002",
      );
    } finally {
      setRefreshing(false);
    }
  };
  const refreshAction = useRef(refresh);
  refreshAction.current = refresh;
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        !event.shiftKey &&
        (event.key === "F5" ||
          ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "r"))
      ) {
        event.preventDefault();
        void refreshAction.current();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (!refreshNotice) return;
    const timer = setTimeout(() => setRefreshNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [refreshNotice]);
  const [launcher, setLauncher] = useState(false),
    [scopeOpen, setScopeOpen] = useState(false),
    theme = useTheme();
  const go = (target: string) => {
    setLauncher(false);
    setScopeOpen(false);
    onNavigate(target);
  };
  const leading = useRef<HTMLDivElement>(null),
    tools = useRef<HTMLDivElement>(null),
    nav = useRef<HTMLElement>(null);
  const [navigationCollapsed, setNavigationCollapsed] = useState(false);
  useLayoutEffect(() => {
    const header = leading.current?.closest(".jadera-header");
    if (!(header instanceof HTMLElement) || !tools.current || !nav.current)
      return;
    const update = () => {
      if (
        !header.clientWidth ||
        !nav.current ||
        !leading.current ||
        !tools.current
      )
        return;
      const style = getComputedStyle(header),
        rowStyle = getComputedStyle(leading.current);
      const fixed = Array.from(leading.current.children).filter(
        (child) =>
          child !== nav.current && getComputedStyle(child).display !== "none",
      );
      const required =
        fixed.reduce(
          (total, child) => total + child.getBoundingClientRect().width,
          0,
        ) +
        Math.max(
          nav.current.scrollWidth,
          nav.current.getBoundingClientRect().width,
        ) +
        (parseFloat(rowStyle.columnGap) || 0) * fixed.length;
      const available =
        header.clientWidth -
        (parseFloat(style.paddingLeft) || 0) -
        (parseFloat(style.paddingRight) || 0) -
        (parseFloat(style.columnGap) || 0) -
        tools.current.getBoundingClientRect().width;
      setNavigationCollapsed(required > available);
    };
    const observer = new ResizeObserver(update);
    for (const element of [
      header,
      tools.current,
      nav.current,
      ...Array.from(leading.current!.children),
    ])
      observer.observe(element);
    update();
    void document.fonts?.ready.then(update);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [
    identity.organization,
    identity.organizationShortName,
    identity.workspace,
  ]);
  const active = page === "business" ? "projects" : page;
  return (
    <>
      <ShellHeader
        height="md"
        className="jadera-header"
        leading={
          <div className="jadera-leading" ref={leading}>
            <Popover open={launcher} onOpenChange={setLauncher}>
              <PopoverTrigger asChild>
                <ShellIconButton
                  icon="app-grid"
                  label={"\u529f\u80fd\u677f\u5757"}
                  className="jadera-launcher-trigger"
                >
                  <Icon name="app-grid" size="lg" />
                </ShellIconButton>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={8}
                className="jadera-launcher"
                aria-label={"\u529f\u80fd\u677f\u5757"}
              >
                <div className="jadera-launcher-top">
                  <ShellPanelRow
                    className="jadera-launcher-home"
                    icon="home"
                    label={"\u9996\u9875"}
                    chevron={false}
                    onClick={() => go("home")}
                  />
                  <span>{"\u745c\u7ae0\u5de5\u4f5c\u677f\u5757"}</span>
                </div>
                <div className="jadera-launcher-columns">
                  <section>
                    <h2>{"\u9879\u76ee\u7f16\u5236"}</h2>
                    <ShellPanelRow
                      icon="file-text"
                      label={"\u6807\u4e66\u9879\u76ee"}
                      description={
                        "\u9879\u76ee\u3001\u7f16\u5236\u7248\u672c\u4e0e\u5b8c\u6574\u6d41\u7a0b"
                      }
                      active={active === "projects"}
                      onClick={() => go("projects")}
                    />
                  </section>
                  <section>
                    <h2>{"\u5206\u6790\u8bc4\u5ba1"}</h2>
                    <ShellPanelRow
                      icon="arrow-left-right"
                      label={
                        <>
                          {"\u6807\u4e66\u5bf9\u6bd4 "}
                          <small>{"\u89c4\u5212"}</small>
                        </>
                      }
                      description={
                        "\u5bf9\u7167\u7248\u672c\u5dee\u5f02\u4e0e\u54cd\u5e94\u5185\u5bb9"
                      }
                      disabled
                    />
                    <ShellPanelRow
                      icon="chart-bar"
                      label={
                        <>
                          {"\u6a21\u62df\u6253\u5206 "}
                          <small>{"\u89c4\u5212"}</small>
                        </>
                      }
                      description={
                        "\u6309\u8bc4\u5ba1\u6807\u51c6\u68c0\u67e5\u5f97\u5206\u4e0e\u7f3a\u53e3"
                      }
                      disabled
                    />
                  </section>
                  <section>
                    <h2>{"\u516c\u5171\u8d44\u6e90"}</h2>
                    <ShellPanelRow
                      icon="book-open"
                      label={"\u77e5\u8bc6\u8d44\u6599"}
                      description={
                        "\u8d44\u8d28\u3001\u6848\u4f8b\u4e0e\u9879\u76ee\u7ecf\u9a8c"
                      }
                      active={active === "knowledge"}
                      onClick={() => go("knowledge")}
                    />
                    <ShellPanelRow
                      icon="file-text"
                      label={"\u6a21\u677f\u7ba1\u7406"}
                      description={
                        "\u6309\u7c7b\u578b\u7ef4\u62a4\u4e0e\u9009\u7528\u6a21\u677f"
                      }
                      active={active === "templates"}
                      onClick={() => go("templates")}
                    />
                  </section>
                </div>
              </PopoverContent>
            </Popover>
            <Button
              variant="ghost"
              className="jadera-brand-button"
              onClick={() => go("home")}
              aria-label={"\u745c\u7ae0\u9996\u9875"}
            >
              {brand}
            </Button>
            <span className="jadera-header-divider" aria-hidden />
            <Popover open={scopeOpen} onOpenChange={setScopeOpen}>
              <PopoverTrigger asChild>
                <ShellScopeButton
                  icon="buildings"
                  ariaLabel={"\u5f53\u524d\u7ec4\u7ec7\u4e0e\u5de5\u4f5c\u533a"}
                  className="jadera-scope"
                  active={scopeOpen}
                  label={
                    <>
                      <span
                        className="jadera-organization-name"
                        title={identity.organization}
                      >
                        {identity.organizationShortName ||
                          identity.organization ||
                          identity.name}
                      </span>
                      {identity.workspace && (
                        <span className="jadera-workspace">
                          {" "}
                          {"\u00b7"} {identity.workspace}
                        </span>
                      )}
                    </>
                  }
                />
              </PopoverTrigger>
              <ShellPanelContent
                align="start"
                aria-label={"\u7ec4\u7ec7\u4e0e\u5de5\u4f5c\u7a7a\u95f4"}
              >
                <ProductOrganizationPanel identity={identity} />
              </ShellPanelContent>
            </Popover>
            <nav
              ref={nav}
              data-collapsed={navigationCollapsed}
              aria-hidden={navigationCollapsed}
              inert={navigationCollapsed}
              className="jadera-global-nav"
              aria-label={"\u4ea7\u54c1\u5bfc\u822a"}
            >
              {navigation.map(([id, label]) => (
                <Button
                  key={id}
                  variant="ghost"
                  aria-current={active === id ? "page" : undefined}
                  className={active === id ? "selected" : ""}
                  onClick={() => go(id)}
                >
                  {label}
                </Button>
              ))}
            </nav>
          </div>
        }
        trailing={
          <div className="jadera-header-tools" ref={tools}>
            {search}
            <ShellAgentButton
              label={"AI \u52a9\u624b"}
              className="jadera-assistant-trigger"
              onClick={onAssistant}
              active={assistantOpen}
              size="xl"
              running
            />
            <ShellIconGroup
              label={"\u663e\u793a\u4e0e\u914d\u7f6e"}
              className="jadera-header-button-group"
            >
              <ShellThemeToggle
                currentTheme={theme.mode}
                buttonLabel={"\u5207\u6362\u4e3b\u9898"}
                onThemeChange={theme.setMode}
              />
              <ShellFullscreenToggle
                targetId="jadera-application"
                enterLabel={"\u5168\u5c4f\u663e\u793a"}
                exitLabel={"\u9000\u51fa\u5168\u5c4f"}
              />
              <ShellIconButton
                icon="help"
                label={"\u4f7f\u7528\u5e2e\u52a9"}
                onClick={() => go("help")}
              />
              <ShellIconButton
                icon="refresh"
                label={
                  refreshing
                    ? "\u6b63\u5728\u5237\u65b0"
                    : "\u5237\u65b0\u5f53\u524d\u9875\u9762"
                }
                className={
                  refreshing
                    ? "jadera-page-refresh refreshing"
                    : "jadera-page-refresh"
                }
                onClick={() => void refresh()}
                disabled={refreshing}
              />
              <ShellIconButton
                icon="settings"
                label={"\u914d\u7f6e\u7ba1\u7406"}
                onClick={() => go("admin")}
              />
            </ShellIconGroup>
            <ShellUserMenu
              contentClassName="jadera-user-panel"
              openLabel={"\u8d26\u53f7\u83dc\u5355"}
              online
              user={{
                displayName: identity.name,
                avatarSrc: identity.avatarSrc,
                ...(identity.phone
                  ? { phone: phoneParts(identity.phone) }
                  : { uniqueLine: "\u624b\u673a\u53f7\u5f85\u540c\u6b65" }),
                statusTag: {
                  label:
                    identity.realNameVerified === true
                      ? "\u5df2\u5b9e\u540d"
                      : identity.realNameVerified === false
                        ? "\u672a\u5b9e\u540d"
                        : "\u72b6\u6001\u672a\u77e5",
                  verified: identity.realNameVerified === true,
                },
              }}
              settings={<ProductPreferences />}
              links={[
                {
                  key: "profile",
                  label: "\u8d26\u53f7\u4e2d\u5fc3",
                  href: "https://accounts.vxture.com/",
                  icon: "user",
                  newTab: true,
                },
              ]}
              actions={[
                {
                  key: "switch-user",
                  label: "\u5207\u6362\u7528\u6237",
                  icon: "users",
                  onClick: () => {
                    window.location.assign(
                      "/auth/login?selectAccount=true&returnTo=%2F",
                    );
                  },
                },
                {
                  key: "signout",
                  label: "\u9000\u51fa\u767b\u5f55",
                  icon: "sign-out",
                  danger: true,
                  onClick: onSignOut,
                },
              ]}
            />
          </div>
        }
      />
      {refreshNotice && (
        <p className="jadera-refresh-feedback" role="status">
          {refreshNotice}
        </p>
      )}
    </>
  );
}
