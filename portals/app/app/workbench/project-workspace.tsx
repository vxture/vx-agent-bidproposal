"use client";
import { useEffect, useState, type ReactNode } from "react";
import {
  ContentWidthContainer,
  Button,
  Icon,
  ShellDock,
  ShellIconButton,
  Tabs,
  TabsList,
  TabsTrigger,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@vxture/design-system";
import {
  Api,
  ProjectPanel,
  ProjectFilesSection,
  PRODUCT_REVIEW_EVENT,
} from "@vxture/ruyin-workbench-ui";
import type { TabId } from "@vxture/ruyin-workbench-ui/workspace-tabs";
import { NameDialog, useContainerWidth, usePanelFocus } from "@bidproposal/shared/presentation";
export function ProjectWorkspace({
  api,
  id,
  name,
  tab,
  section,
  iframe,
  frame,
  onPending,
  onNavigate,
  upload,
  assistantOpen,
  onReview,
  requirementsView,
  versionLabel,
  archived,
  onProjectChanged,
  onRename,
}: {
  api: Api;
  id: string;
  name: string;
  tab: TabId;
  section: string;
  iframe: ReactNode;
  frame: React.RefObject<HTMLIFrameElement | null>;
  onPending: (count: number) => void;
  onNavigate: (hash: string) => void;
  upload: (file: File) => Promise<void>;
  assistantOpen: boolean;
  onReview: () => void;
  requirementsView?: ReactNode;
  versionLabel?: string;
  archived?: boolean;
  onProjectChanged?: () => Promise<void>;
  onRename?: (name: string) => Promise<void>;
}) {
  const [contextOpen, setContextOpen] = useState(false),
    [rightTab, setRightTab] = useState("tasks");
  const [operationBusy, setOperationBusy] = useState(false),
    [operationError, setOperationError] = useState("");
  const [renaming, setRenaming] = useState(false);
  const region = useContainerWidth();
  const drawer = region.width !== undefined && region.width <= 1100;
  const visibleContext = contextOpen && !assistantOpen;
  const panel = usePanelFocus(visibleContext, drawer, () => setContextOpen(false));
  useEffect(() => {
    setContextOpen(false);
  }, [id]);
  useEffect(() => {
    const show = (event: Event) => {
      if ((event as CustomEvent).detail?.projectId !== id) return;
      setContextOpen(true);
      setRightTab("tasks");
      onReview();
    };
    window.addEventListener(PRODUCT_REVIEW_EVENT, show);
    return () => window.removeEventListener(PRODUCT_REVIEW_EVENT, show);
  }, [id, onReview]);
  const exportView = (
    <a
      className="bid-workbench-download"
      href={"/api/workbench/host/projects/" + id + "/export"}
      download
    >
      {"\u4e0b\u8f7d\u9879\u76ee\u8bb0\u5f55"}
    </a>
  );
  return (
    <div className="jadera-project-workspace" ref={region.ref} data-context-drawer={drawer}>
      <div className="jadera-business-column">
        <div className="jadera-business-scroll" data-page-scroll>
          <ContentWidthContainer className="jadera-center-content">
        <div className="jadera-project-context">
          <Button variant="ghost" onClick={() => onNavigate("#projects")}>
            {"\u6807\u4e66\u9879\u76ee"}
          </Button>
          <Icon name="chevron-right" size="xs" />
          <strong>{name}</strong>
          {versionLabel && (
            <span className="jadera-context-version">{versionLabel}</span>
          )}
          <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  disabled={operationBusy}
                  aria-label={"\u9879\u76ee\u64cd\u4f5c"}
                >
                  <span>{"\u9879\u76ee\u64cd\u4f5c"}</span>
                  <Icon name="chevron-down" size="xs" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onRename && (
                  <DropdownMenuItem
                    disabled={archived}
                    onSelect={() => setRenaming(true)}
                  >
                    {"\u91cd\u547d\u540d\u9879\u76ee"}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onSelect={() => onNavigate("#ws/" + id + "/overview")}
                >
                  {"\u7f16\u5236\u8981\u6c42"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => onNavigate("#ws/" + id + "/audit")}
                >
                  {"\u64cd\u4f5c\u8bb0\u5f55"}
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a
                    href={"/api/workbench/host/projects/" + id + "/export"}
                    download
                  >
                    {"\u4e0b\u8f7d\u672c\u7248\u9879\u76ee\u8bb0\u5f55"}
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={operationBusy}
                  onSelect={() => {
                    setOperationBusy(true);
                    setOperationError("");
                    void (
                      archived ? api.restoreProject(id) : api.archiveProject(id)
                    )
                      .then(async () => {
                        await onProjectChanged?.();
                      })
                      .catch((error) =>
                        setOperationError(
                          error instanceof Error
                            ? error.message
                            : "\u9879\u76ee\u64cd\u4f5c\u672a\u5b8c\u6210",
                        ),
                      )
                      .finally(() => setOperationBusy(false));
                  }}
                >
                  {archived
                    ? "\u6062\u590d\u9879\u76ee"
                    : "\u5f52\u6863\u6574\u4efd\u6807\u4e66"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {renaming && onRename && (
          <NameDialog
            title={"\u91cd\u547d\u540d\u9879\u76ee"}
            initialName={name}
            maxLength={120}
            onClose={() => setRenaming(false)}
            onSave={onRename}
          />
        )}
        {operationError && (
          <p role="alert" className="jadera-project-operation-error">
            {operationError}
          </p>
        )}
          <div
            hidden={tab !== "product"}
            className="jadera-business-frame-slot"
          >
            {iframe}
          </div>
          {tab === "overview" && requirementsView
            ? requirementsView
            : tab !== "product" && (
                <ProjectPanel
                  api={api}
                  id={id}
                  tab={tab}
                  exportView={exportView}
                />
              )}
          </ContentWidthContainer>
        </div>

      </div>
      {drawer && visibleContext && <button className="jadera-drawer-backdrop" aria-label={"\u5173\u95ed\u8f85\u52a9\u680f"} onClick={() => setContextOpen(false)} tabIndex={-1} />}
      <div
        ref={panel}
        tabIndex={-1}
        role={drawer ? "dialog" : "complementary"}
        aria-modal={drawer && visibleContext ? true : undefined}
        aria-label={"\u4efb\u52a1\u4e0e\u8d44\u6599"}
        hidden={!visibleContext}
        className="jadera-context-slot"
      >
        <ShellDock mode="narrow" className="jadera-context-dock">
          <header className="jadera-dock-header">
            <Tabs value={rightTab} onValueChange={setRightTab}>
              <TabsList>
                <TabsTrigger value="tasks">{"\u4efb\u52a1"}</TabsTrigger>
                <TabsTrigger value="files">{"\u8d44\u6599"}</TabsTrigger>
              </TabsList>
            </Tabs>
            <ShellIconButton
              icon="x"
              label={"\u5173\u95ed\u8f85\u52a9\u680f"}
              onClick={() => setContextOpen(false)}
            />
          </header>
          <div className="jadera-context-body">
            <div hidden={rightTab !== "tasks"}>
              <ProjectPanel
                api={api}
                id={id}
                tab="tasks"
                surface={{ productId: "bidproposal", available: true }}
                onPending={onPending}
                productView={<span />}
              />
            </div>
            <div hidden={rightTab !== "files"}>
              <ProjectFilesSection
                api={api}
                projectId={id}
                grants={[]}
                uploadFile={upload}
              />
            </div>
          </div>
        </ShellDock>
      </div>
      {!contextOpen && !assistantOpen && (
        <Button
          className="jadera-context-edge"
          variant="ghost"
          aria-label={"\u5c55\u5f00\u4efb\u52a1\u4e0e\u8d44\u6599"}
          onClick={() => setContextOpen(true)}
        >
          <Icon name="sidebar" size="sm" />
        </Button>
      )}
    </div>
  );
}
