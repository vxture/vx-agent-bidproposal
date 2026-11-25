"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Button,
  Icon,
  ShellDock,
  ShellIconButton,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@vxture/design-system";
import {
  Api,
  ProjectPanel,
  ProjectFilesSection,
  PRODUCT_REVIEW_EVENT,
} from "@vxture/ruyin-workbench-ui";
import type { TabId } from "@vxture/ruyin-workbench-ui/workspace-tabs";
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
}) {
  const [contextOpen, setContextOpen] = useState(true),
    [rightTab, setRightTab] = useState("tasks"),
    [atBottom, setAtBottom] = useState(true),
    [scrollable, setScrollable] = useState(false);
  const content = useRef<HTMLDivElement>(null);
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
  useEffect(() => {
    const outer = content.current,
      iframeElement = frame.current;
    if (!outer) return;
    let cleanup = () => {};
    const attach = () => {
      cleanup();
      const doc =
          tab === "product" ? iframeElement?.contentDocument : undefined,
        root = doc?.scrollingElement || outer;
      const update = () => {
        setScrollable(root.scrollHeight - root.clientHeight > 8);
        setAtBottom(
          root.scrollHeight - root.clientHeight - root.scrollTop <= 8,
        );
      };
      const target = doc || outer;
      target.addEventListener("scroll", update, true);
      const observer = new ResizeObserver(update);
      observer.observe(doc?.body || outer);
      update();
      cleanup = () => {
        target.removeEventListener("scroll", update, true);
        observer.disconnect();
      };
    };
    attach();
    iframeElement?.addEventListener("load", attach);
    return () => {
      cleanup();
      iframeElement?.removeEventListener("load", attach);
    };
  }, [tab, section, id]);
  const scroll = () => {
    const target =
      tab === "product"
        ? frame.current?.contentDocument?.scrollingElement
        : content.current;
    target?.scrollBy({
      top: Math.max(180, target.clientHeight * 0.65),
      behavior: "smooth",
    });
  };
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
    <div className="jadera-project-workspace">
      <div className="jadera-business-column">
        <div className="jadera-project-context">
          <Button variant="ghost" onClick={() => onNavigate("#projects")}>
            {"\u6807\u4e66\u9879\u76ee"}
          </Button>
          <Icon name="chevron-right" size="xs" />
          <strong>{name}</strong>
          <div>
            <Button
              variant="ghost"
              onClick={() => onNavigate("#ws/" + id + "/audit")}
            >
              {"\u64cd\u4f5c\u8bb0\u5f55"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => onNavigate("#ws/" + id + "/overview")}
            >
              {"\u7f16\u5236\u8981\u6c42"}
            </Button>
          </div>
        </div>
        <div ref={content} className="jadera-business-scroll">
          <div
            hidden={tab !== "product"}
            className="jadera-business-frame-slot"
          >
            {iframe}
          </div>
          {tab !== "product" && (
            <ProjectPanel api={api} id={id} tab={tab} exportView={exportView} />
          )}
        </div>
        <div className="jadera-content-scroll-cue">
          {scrollable && !atBottom ? (
            <Button
              variant="ghost"
              size="icon-md"
              onClick={scroll}
              aria-label={
                "\u5411\u4e0b\u6eda\u52a8\u67e5\u770b\u540e\u7eed\u5185\u5bb9"
              }
            >
              <Icon name="caret-double-down" size="sm" />
            </Button>
          ) : (
            <span>
              <i />
              {"\u5df2\u7ecf\u5230\u5e95\u90e8"}
              <i />
            </span>
          )}
        </div>
      </div>
      <div
        hidden={!contextOpen || assistantOpen}
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
