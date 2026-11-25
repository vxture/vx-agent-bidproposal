"use client";
import { useMemo, useState, type ReactNode } from "react";
import {
  Button,
  Input,
  NativeSelect,
  ViewModeSwitch,
  Icon,
  Card,
  Label,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState,
} from "@vxture/design-system";

export interface ProjectRecord {
  stage: string;
  stageIndex: number;
  completed: number;
  completedStages?: number[];
  recordedAt?: string;
  complete: boolean;
}
export interface ProjectCardData {
  id: string;
  name: string;
  createdAt: string;
  archivedAt?: string;
  workspaceId?: string;
  productId: string;
  record?: ProjectRecord;
  versionLabel?: string;
}
const date = (value: string) => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed)
    ? new Date(parsed).toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "\u672a\u8bb0\u5f55";
};
function ProjectCard({
  project,
  onOpen,
  current,
}: {
  project: ProjectCardData;
  onOpen: (id: string) => void;
  current: boolean;
}) {
  const record = project.record,
    tone = project.archivedAt
      ? "archived"
      : record?.complete
        ? "complete"
        : record
          ? "running"
          : "pending";
  return (
    <Card className={"jadera-project-card " + tone}>
      <Button
        variant="ghost"
        className="jadera-project-card-button"
        onClick={() => onOpen(project.id)}
        aria-label={"\u6253\u5f00" + project.name}
      >
        <span className="jadera-project-card-top">
          <Icon name="file-text" size="sm" />
          <span>{project.versionLabel || "\u6807\u4e66\u9879\u76ee"}</span>
          {current && <small>{"\u5f53\u524d\u9879\u76ee"}</small>}
        </span>
        <strong title={project.name}>{project.name}</strong>
        <span className="jadera-project-stage">
          <span>
            {project.archivedAt
              ? "\u5df2\u5f52\u6863"
              : record?.stage || "\u5c1a\u65e0\u6d41\u7a0b\u8bb0\u5f55"}
          </span>
          {record && (
            <small>{String(record.stageIndex + 1).padStart(2, "0")} / 06</small>
          )}
        </span>
        <span className="jadera-project-track" aria-hidden>
          {Array.from({ length: 6 }, (_, i) => (
            <i
              key={i}
              className={
                i === record?.stageIndex
                  ? "current"
                  : record?.completedStages?.includes(i)
                    ? "done"
                    : ""
              }
            />
          ))}
        </span>
        <span className="jadera-project-status">
          {project.archivedAt
            ? "\u53ef\u67e5\u770b\u4e0e\u5bfc\u51fa"
            : record?.complete
              ? "\u6709\u5b8c\u6210\u8bb0\u5f55"
              : record
                ? "\u5df2\u6709\u5de5\u4f5c\u8bb0\u5f55"
                : "\u5f85\u5f00\u59cb\u7f16\u5236"}
        </span>
        <span className="jadera-project-card-foot">
          <time dateTime={record?.recordedAt || project.createdAt}>
            {record?.recordedAt
              ? "\u6700\u8fd1\u8bb0\u5f55 "
              : "\u521b\u5efa\u4e8e "}
            {date(record?.recordedAt || project.createdAt)}
          </time>
          <span>
            <Icon name="arrow-right" size="sm" />
            {"\u6253\u5f00\u9879\u76ee"}
          </span>
        </span>
      </Button>
    </Card>
  );
}
export function ProjectCollection({
  projects,
  state,
  catalog,
  currentId,
  onOpen,
  onCreate,
  onCatalog,
  onReload,
  onContinue,
  brand,
  resources,
  companion,
}: {
  projects: ProjectCardData[];
  state: "loading" | "failed" | "ready";
  catalog: boolean;
  currentId?: string;
  onOpen: (id: string) => void;
  onCreate: (name: string) => Promise<void>;
  onCatalog: () => void;
  onReload: () => void;
  onContinue?: () => void;
  brand: ReactNode;
  resources?: ReactNode;
  companion?: ReactNode;
}) {
  const [query, setQuery] = useState(""),
    [scope, setScope] = useState("current"),
    [mode, setMode] = useState<"cards" | "list">("cards");
  const [creating, setCreating] = useState(false),
    [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const rows = useMemo(
    () =>
      projects
        .filter(
          (project) =>
            (catalog
              ? scope === "all" ||
                (scope === "archived"
                  ? !!project.archivedAt
                  : !project.archivedAt)
              : !project.archivedAt) &&
            (!catalog ||
              project.name
                .toLocaleLowerCase()
                .includes(query.trim().toLocaleLowerCase())),
        )
        .sort((a, b) =>
          (b.record?.recordedAt || b.createdAt).localeCompare(
            a.record?.recordedAt || a.createdAt,
          ),
        ),
    [projects, catalog, query, scope],
  );
  const create = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      await onCreate(name.trim());
      setCreating(false);
      setName("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "\u521b\u5efa\u672a\u5b8c\u6210",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="jadera-home-scroll">
      <div className="jadera-home-wrap">
        {catalog ? (
          <header className="jadera-collection-heading">
            <div>
              <span>{"\u5de5\u4f5c\u533a\u9879\u76ee"}</span>
              <h1>{"\u6807\u4e66\u9879\u76ee"}</h1>
              <p>
                {
                  "\u9009\u62e9\u4e00\u4efd\u6807\u4e66\uff0c\u63a5\u7740\u5df2\u6709\u8fdb\u5c55\u7ee7\u7eed\u3002"
                }
              </p>
            </div>
            <Button
              disabled={state !== "ready"}
              onClick={() => setCreating(true)}
            >
              <Icon name="plus" size="sm" />
              {"\u65b0\u5efa\u6807\u4e66"}
            </Button>
          </header>
        ) : (
          <section className="jadera-home-hero">
            <div>
              <div className="jadera-home-kicker">{brand}</div>
              <h1>
                {
                  "\u4ece\u62db\u6807\u8d44\u6599\uff0c\u5230\u5b8c\u6574\u6807\u4e66"
                }
              </h1>
              <p>
                {
                  "\u89e3\u8bfb\u9700\u6c42\u3001\u7ec4\u7ec7\u8d44\u6599\u3001\u5206\u7ae0\u7f16\u5199\uff0c\u8ba9\u4e13\u4e1a\u5224\u65ad\u8d2f\u7a7f\u6bcf\u4e00\u6b65\u3002"
                }
              </p>
              <div className="jadera-home-actions">
                <Button
                  disabled={state !== "ready"}
                  onClick={() => setCreating(true)}
                >
                  <Icon name="plus" size="sm" />
                  {"\u65b0\u5efa\u6807\u4e66"}
                </Button>
                {onContinue && (
                  <Button variant="outline" onClick={onContinue}>
                    <Icon name="arrow-right" size="sm" />
                    {"\u7ee7\u7eed\u5f53\u524d\u9879\u76ee"}
                  </Button>
                )}
              </div>
            </div>
            {companion}
          </section>
        )}
        {creating && (
          <form
            className="jadera-project-create"
            onSubmit={(e) => {
              e.preventDefault();
              void create();
            }}
          >
            <Label htmlFor="jadera-project-name">
              {"\u6807\u4e66\u540d\u79f0"}
            </Label>
            <Input
              id="jadera-project-name"
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <Button disabled={busy || !name.trim()} type="submit">
              {busy ? "\u521b\u5efa\u4e2d\u2026" : "\u521b\u5efa\u6807\u4e66"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => setCreating(false)}
            >
              {"\u53d6\u6d88"}
            </Button>
          </form>
        )}
        {error && <p role="alert">{error}</p>}
        {state === "loading" ? (
          <p role="status">{"\u6b63\u5728\u8bfb\u53d6\u9879\u76ee\u2026"}</p>
        ) : state === "failed" ? (
          <section className="jadera-empty" role="alert">
            <h2>{"\u9879\u76ee\u672a\u80fd\u52a0\u8f7d"}</h2>
            <p>
              {
                "\u73b0\u6709\u9879\u76ee\u4fdd\u7559\uff0c\u8bf7\u91cd\u65b0\u8bfb\u53d6\u3002"
              }
            </p>
            <Button variant="outline" onClick={onReload}>
              {"\u91cd\u65b0\u8bfb\u53d6"}
            </Button>
          </section>
        ) : (
          <section className="jadera-projects-section">
            {catalog ? (
              <div className="jadera-collection-toolbar">
                <div>
                  <ViewModeSwitch
                    ariaLabel={"\u9879\u76ee\u5c55\u793a\u65b9\u5f0f"}
                    value={mode}
                    onChange={setMode}
                    labels={{
                      cards: "\u5361\u7247\u89c6\u56fe",
                      list: "\u5217\u8868\u89c6\u56fe",
                    }}
                  />
                  <span>
                    {rows.length}
                    {" \u4e2a\u9879\u76ee"}
                  </span>
                </div>
                <div>
                  <Input
                    aria-label={"\u641c\u7d22\u6807\u4e66\u9879\u76ee"}
                    placeholder={"\u641c\u7d22\u6807\u4e66\u9879\u76ee"}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <NativeSelect
                    aria-label={"\u9879\u76ee\u8303\u56f4"}
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                  >
                    <option value="current">
                      {"\u5728\u7528\u9879\u76ee"}
                    </option>
                    <option value="archived">
                      {"\u5f52\u6863\u9879\u76ee"}
                    </option>
                    <option value="all">{"\u5168\u90e8\u9879\u76ee"}</option>
                  </NativeSelect>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setQuery("");
                      setScope("current");
                    }}
                  >
                    {"\u590d\u4f4d"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="jadera-section-heading">
                <div>
                  <h2>{"\u6700\u8fd1\u9879\u76ee"}</h2>
                  <p>
                    {"\u6309\u6700\u8fd1\u5de5\u4f5c\u8bb0\u5f55\u6392\u5217"}
                  </p>
                </div>
                <Button variant="ghost" onClick={onCatalog}>
                  {"\u5168\u90e8\u9879\u76ee"}
                  <Icon name="arrow-right" size="sm" />
                </Button>
              </div>
            )}
            {!rows.length ? (
              <EmptyState
                icon="file-text"
                title={
                  projects.length
                    ? "\u6ca1\u6709\u5339\u914d\u7684\u9879\u76ee"
                    : "\u521b\u5efa\u7b2c\u4e00\u4efd\u6807\u4e66"
                }
                description={
                  projects.length
                    ? "\u8c03\u6574\u641c\u7d22\u6216\u7b5b\u9009\u6761\u4ef6\u3002"
                    : "\u4ece\u62db\u6807\u8d44\u6599\u5f00\u59cb\uff0c\u9010\u6b65\u5b8c\u6210\u4e13\u4e1a\u65b9\u6848\u3002"
                }
                className="jadera-empty"
              />
            ) : catalog && mode === "list" ? (
              <div className="jadera-project-table">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{"\u6807\u4e66\u540d\u79f0"}</TableHead>
                      <TableHead>
                        {"\u6700\u8fd1\u73af\u8282\u8bb0\u5f55"}
                      </TableHead>
                      <TableHead>{"\u8bb0\u5f55\u65f6\u95f4"}</TableHead>
                      <TableHead>
                        <span className="sr-only">{"\u64cd\u4f5c"}</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell>{project.name}</TableCell>
                        <TableCell>
                          {project.archivedAt
                            ? "\u5df2\u5f52\u6863"
                            : project.record?.stage ||
                              "\u5c1a\u65e0\u6d41\u7a0b\u8bb0\u5f55"}
                        </TableCell>
                        <TableCell>
                          {date(
                            project.record?.recordedAt || project.createdAt,
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            onClick={() => onOpen(project.id)}
                          >
                            {"\u6253\u5f00\u9879\u76ee"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="jadera-project-grid">
                {(catalog ? rows : rows.slice(0, 3)).map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    current={project.id === currentId}
                    onOpen={onOpen}
                  />
                ))}
              </div>
            )}
          </section>
        )}
        {!catalog && resources}
      </div>
    </main>
  );
}
