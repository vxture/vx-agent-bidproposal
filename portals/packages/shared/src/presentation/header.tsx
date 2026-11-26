"use client";
/** Host-independent product chrome. Identity and navigation are supplied by the host. */
import { useState, type ReactNode } from "react";
import {
  Button,
  Icon,
  Popover,
  PopoverTrigger,
  PopoverContent,
  ShellHeader,
  ShellIconButton,
  ShellIconGroup,
  ShellScopeButton,
  ShellPanelContent,
  ShellPanelHeader,
  ShellPanelSection,
  ShellPanelRow,
  ShellUserMenu,
  ShellPreferencePanel,
  ShellThemeToggle,
  ShellFullscreenToggle,
  useTheme,
} from "@vxture/design-system";

const navigation = [
  ["home", "\u9996\u9875"],
  ["projects", "\u6807\u4e66\u9879\u76ee"],
  ["knowledge", "\u77e5\u8bc6\u8d44\u6599"],
  ["templates", "\u6a21\u677f\u7ba1\u7406"],
] as const;
export interface HeaderIdentity {
  name: string;
  organization?: string;
  organizationShortName?: string;
  workspace?: string;
  email?: string;
  avatarSrc?: string;
  personal?: boolean;
}
export function ApplicationHeader({
  brand,
  identity,
  page,
  onNavigate,
  onSignOut,
  onAssistant,
  search,
}: {
  brand: ReactNode;
  identity: HeaderIdentity;
  page: string;
  projectCount: number;
  onNavigate: (page: string) => void;
  onSignOut: () => void;
  onAssistant: () => void;
  search?: ReactNode;
}) {
  const [launcher, setLauncher] = useState(false),
    [scopeOpen, setScopeOpen] = useState(false),
    theme = useTheme();
  const go = (target: string) => {
    setLauncher(false);
    setScopeOpen(false);
    onNavigate(target);
  };
  const active = page === "business" ? "projects" : page;
  return (
    <ShellHeader
      height="md"
      className="jadera-header"
      leading={
        <div className="jadera-leading">
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
                <Button variant="ghost" onClick={() => go("home")}>
                  <Icon name="home" size="sm" />
                  {"\u9996\u9875"}
                </Button>
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
                label={
                  <>
                    <span title={identity.organization}>{identity.organizationShortName || identity.organization || identity.name}</span>
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
            <ShellPanelContent align="start" aria-label={"\u7ec4\u7ec7\u4e0e\u5de5\u4f5c\u7a7a\u95f4"}>
              <ShellPanelHeader
                icon="buildings"
                title={identity.organization || identity.name}
                titleAside={<span className="jadera-scope-type">{identity.personal ? "\u4e2a\u4eba\u79df\u6237" : "\u7ec4\u7ec7\u79df\u6237"}</span>}
                metaRows={[
                  ...(identity.workspace
                    ? [{ key: "workspace", content: identity.workspace }]
                    : []),
                ]}
              />
              <ShellPanelSection title={"\u8d44\u6e90"}>
                <ShellPanelRow
                  icon="sparkles"
                  label={"AI \u70b9\u6570"}
                  description="workspace"
                  value={<span title={"\u5c1a\u672a\u63a5\u5165\u5de5\u4f5c\u7a7a\u95f4\u8d44\u6e90\u6570\u636e"}>{"\u6682\u4e0d\u53ef\u7528"}</span>}
                />
                <ShellPanelRow
                  icon="database"
                  label={"\u5b58\u50a8\u5bb9\u91cf"}
                  description="workspace"
                  value={<span title={"\u5c1a\u672a\u63a5\u5165\u5de5\u4f5c\u7a7a\u95f4\u8d44\u6e90\u6570\u636e"}>{"\u6682\u4e0d\u53ef\u7528"}</span>}
                />
              </ShellPanelSection>
              <ShellPanelSection>
                <ShellPanelRow
                  icon="app-grid"
                  label={"\u5e94\u7528\u4e2d\u5fc3"}
                  description={"\u8bbf\u95ee\u5168\u90e8\u5e94\u7528"}
                  href="https://cospace.ruyin.work/apps"
                  newTab
                />
                <ShellPanelRow
                  icon="buildings"
                  label={"\u7ec4\u7ec7\u4fe1\u606f"}
                  description={"\u7ba1\u7406\u7ec4\u7ec7\u4e0e\u7a7a\u95f4"}
                  href="https://console.vxture.com/zh-CN/tenant"
                  newTab
                />
              </ShellPanelSection>
            </ShellPanelContent>
          </Popover>
          <nav
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
        <div className="jadera-header-tools">
          {search}
          <ShellIconButton
            icon="sparkles"
            label={"AI \u52a9\u624b"}
            className="jadera-assistant-trigger"
            onClick={onAssistant}
          >
            <Icon name="sparkles" size="lg" />
          </ShellIconButton>
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
              icon="settings"
              label={"\u914d\u7f6e\u7ba1\u7406"}
              onClick={() => go("admin")}
            />
          </ShellIconGroup>
          <ShellUserMenu
            openLabel={"\u8d26\u53f7\u83dc\u5355"}
            online
            user={{
              displayName: identity.name,
              avatarSrc: identity.avatarSrc,
              uniqueLine: identity.email,
            }}
            settings={
              <ShellPreferencePanel
                locale="zh-CN"
                localeOptions={[
                  { locale: "zh-CN", label: "\u7b80\u4f53\u4e2d\u6587" },
                ]}
                onLocaleChange={() => {}}
                theme={theme.mode}
                onThemeChange={theme.setMode}
                density={theme.density}
                onDensityChange={theme.setDensity}
                fontSize={theme.fontSize}
                onFontSizeChange={theme.setFontSize}
                labels={{
                  title: "\u504f\u597d\u8bbe\u7f6e",
                  locale: "\u8bed\u8a00",
                  theme: "\u5916\u89c2",
                  density: "\u754c\u9762\u5bc6\u5ea6",
                  fontSize: "\u6587\u5b57\u5927\u5c0f",
                  themeOptions: {
                    system: "\u8ddf\u968f\u7cfb\u7edf",
                    light: "\u6d45\u8272",
                    dark: "\u6df1\u8272",
                  },
                  densityOptions: {
                    compact: "\u7d27\u51d1",
                    default: "\u9ed8\u8ba4",
                    comfortable: "\u5bbd\u677e",
                  },
                  fontSizeOptions: {
                    small: "\u8f83\u5c0f",
                    default: "\u9ed8\u8ba4",
                    large: "\u8f83\u5927",
                  },
                }}
              />
            }
            links={[
              {
                key: "profile",
                label: "\u8d26\u53f7\u4e2d\u5fc3",
                href: "https://accounts.vxture.com/",
                icon: "user",
                newTab: true,
              },
              {
                key: "workspace",
                label: "\u5de5\u4f5c\u533a\u4e0e\u6743\u76ca",
                href: "https://console.vxture.com/",
                icon: "buildings",
                newTab: true,
              },
            ]}
            actions={[
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
  );
}
