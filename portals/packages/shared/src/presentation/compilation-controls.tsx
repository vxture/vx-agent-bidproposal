"use client";
import { useState } from "react";
import {
  Button,
  Icon,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Input,
  Label,
  NativeSelect,
  Textarea,
  Checkbox,
} from "@vxture/design-system";
import {
  DEFAULT_REQUIREMENTS,
  requirementsComplete,
  type CompilationList,
  type CompilationBrief,
  type WritingRequirements,
} from "../compilations";
import { NameDialog } from "./name-dialog";

export function RequirementsFields({
  value,
  onChange,
  disabled,
}: {
  value: WritingRequirements;
  onChange: (value: WritingRequirements) => void;
  disabled?: boolean;
}) {
  const set = (key: keyof WritingRequirements, v: string | number) =>
    onChange({ ...value, [key]: v });
  return (
    <fieldset disabled={disabled} className="jadera-requirements-fields">
      <Label>
        {"\u76ee\u6807\u9875\u6570"}
        <Input
          aria-label={"\u76ee\u6807\u9875\u6570"}
          type="number"
          min={1}
          max={3000}
          value={value.pages}
          onChange={(e) => set("pages", Number(e.target.value))}
        />
      </Label>
      <Label>
        {"\u6807\u4e66\u7c7b\u578b"}
        <NativeSelect
          aria-label={"\u6807\u4e66\u7c7b\u578b"}
          value={value.volume}
          onChange={(e) => set("volume", e.target.value)}
        >
          <option value="combined">{"\u7efc\u5408\u6807"}</option>
          <option value="technical">{"\u6280\u672f\u6807"}</option>
          <option value="commercial">{"\u5546\u52a1\u6807"}</option>
        </NativeSelect>
      </Label>
      <Label>
        {"\u56fe\u8868\u5bc6\u5ea6"}
        <NativeSelect
          aria-label={"\u56fe\u8868\u5bc6\u5ea6"}
          value={value.figures}
          onChange={(e) => set("figures", e.target.value)}
        >
          <option value="none">{"\u4ee5\u6587\u5b57\u4e3a\u4e3b"}</option>
          <option value="selective">{"\u9002\u91cf\u56fe\u8868"}</option>
          <option value="rich">{"\u4e30\u5bcc\u56fe\u8868"}</option>
        </NativeSelect>
      </Label>
      <Label>
        {"\u8d28\u91cf\u76ee\u6807"}
        <NativeSelect
          aria-label={"\u8d28\u91cf\u76ee\u6807"}
          value={value.quality}
          onChange={(e) => set("quality", e.target.value)}
        >
          <option value="normal">{"\u6807\u51c6"}</option>
          <option value="high">{"\u9ad8"}</option>
          <option value="very-high">{"\u66f4\u9ad8"}</option>
        </NativeSelect>
      </Label>
      <Label>
        {"\u7f16\u5236\u65b9\u5f0f"}
        <NativeSelect
          aria-label={"\u7f16\u5236\u65b9\u5f0f"}
          value={value.mode}
          onChange={(e) =>
            onChange({
              ...value,
              mode: e.target.value as WritingRequirements["mode"],
              providers: "",
            })
          }
        >
          <option value="metrics">{"\u6309\u6307\u6807\u54cd\u5e94"}</option>
          <option value="providers">
            {"\u6309\u4f9b\u5e94\u65b9\u7ec4\u7ec7"}
          </option>
        </NativeSelect>
      </Label>
      {value.mode === "providers" && (
        <Label className="jadera-requirements-wide">
          {"\u4f9b\u5e94\u65b9\u4e0e\u5206\u5de5"}
          <Textarea
            maxLength={4000}
            value={value.providers}
            onChange={(e) => set("providers", e.target.value)}
          />
        </Label>
      )}
      <Label className="jadera-requirements-wide">
        {"\u672c\u7248\u7f16\u5236\u8981\u6c42"}
        <Textarea
          rows={5}
          maxLength={4000}
          value={value.brief}
          placeholder={
            "\u8bf4\u660e\u672c\u7248\u7684\u54cd\u5e94\u91cd\u70b9\u3001\u884c\u6587\u98ce\u683c\u548c\u7279\u522b\u7ea6\u675f"
          }
          onChange={(e) => set("brief", e.target.value)}
        />
      </Label>
    </fieldset>
  );
}
export function CompilationSelector({
  data,
  selectedId,
  collapsed,
  loading,
  failed,
  onReload,
  onSelect,
  onCreate,
  onRetry,
  readOnly = false,
  onRename,
}: {
  data?: CompilationList;
  selectedId: string;
  collapsed: boolean;
  loading: boolean;
  failed: boolean;
  onReload: () => void;
  onSelect: (id: string) => void;
  onCreate: (input: {
    label: string;
    requirements: WritingRequirements;
    reuseLibrary: boolean;
    requestId: string;
    revision: number;
  }) => Promise<void>;
  onRetry?: (id: string) => Promise<void>;
  readOnly?: boolean;
  onRename?: (name: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false),
    [create, setCreate] = useState(false),
    [label, setLabel] = useState(""),
    [value, setValue] = useState({ ...DEFAULT_REQUIREMENTS }),
    [reuse, setReuse] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [requestId, setRequestId] = useState("");
  const [renaming, setRenaming] = useState(false);
  const current = data?.items.find((item) => item.id === selectedId);
  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className={
              "jadera-version-trigger " + (collapsed ? "collapsed" : "")
            }
            aria-label={"\u9009\u62e9\u7f16\u5236\u7248\u672c"}
          >
            <span className="jadera-version-anchor">
              <Icon name="stack" size="sm" />
            </span>
            {!collapsed && (
              <>
                <span>
                  {loading
                    ? "\u8bfb\u53d6\u7248\u672c\u2026"
                    : current?.label || "\u7f16\u5236\u7248\u672c"}
                </span>
                <Icon name="chevron-down" size="xs" />
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="jadera-version-popover">
          <Button
            variant="ghost"
            className="jadera-version-create"
            disabled={!data || loading || readOnly}
            onClick={() => {
              setLabel(
                "V" + String((data?.items.length ?? 0) + 1).padStart(2, "0"),
              );
              setError("");
              setRequestId(crypto.randomUUID());
              setValue({ ...DEFAULT_REQUIREMENTS });
              setOpen(false);
              setCreate(true);
            }}
          >
            <Icon name="plus" size="sm" />
            {"\u65b0\u5efa\u7f16\u5236\u7248\u672c"}
          </Button>
          {failed && (
            <Button variant="ghost" onClick={onReload}>
              {
                "\u7248\u672c\u672a\u80fd\u8bfb\u53d6\uff0c\u70b9\u51fb\u91cd\u8bd5"
              }
            </Button>
          )}
          <div className="jadera-version-list">
            {[...(data?.items ?? [])].reverse().map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                className="jadera-version-option"
                disabled={
                  busy || (item.state !== "ready" && (!onRetry || readOnly))
                }
                aria-current={item.id === selectedId ? "true" : undefined}
                onClick={async () => {
                  if (item.state === "creating" && onRetry) {
                    setBusy(true);
                    setError("");
                    try {
                      await onRetry(item.id);
                      setOpen(false);
                    } catch (err) {
                      setError(
                        err instanceof Error
                          ? err.message
                          : "\u91cd\u8bd5\u672a\u5b8c\u6210",
                      );
                    } finally {
                      setBusy(false);
                    }
                  } else {
                    onSelect(item.id);
                    setOpen(false);
                  }
                }}
              >
                <Icon
                  name={item.id === selectedId ? "check" : "file-text"}
                  size="sm"
                />
                <span>
                  <strong>{item.label}</strong>
                  <small>
                    {new Date(item.createdAt).toLocaleString("zh-CN", {
                      hour12: false,
                    })}
                  </small>
                </span>
                <small>
                  {item.state === "creating"
                    ? "\u70b9\u51fb\u91cd\u8bd5"
                    : "V" + String(item.number).padStart(2, "0")}
                </small>
              </Button>
            ))}
          </div>
          {onRename && current && (
            <Button
              variant="ghost"
              className="jadera-version-create"
              disabled={readOnly || busy}
              onClick={() => {
                setOpen(false);
                setRenaming(true);
              }}
            >
              <Icon name="edit" size="sm" />
              {"\u91cd\u547d\u540d\u5f53\u524d\u7248\u672c"}
            </Button>
          )}
          {error && <p role="alert">{error}</p>}
        </PopoverContent>
      </Popover>
      {renaming && current && onRename && (
        <NameDialog
          title={"\u91cd\u547d\u540d\u7f16\u5236\u7248\u672c"}
          initialName={current.label}
          maxLength={60}
          onClose={() => setRenaming(false)}
          onSave={onRename}
        />
      )}
      <Dialog
        open={create}
        onOpenChange={(next) => {
          if (!busy) setCreate(next);
        }}
      >
        <DialogContent className="jadera-compilation-dialog">
          <DialogHeader>
            <DialogTitle>{"\u65b0\u5efa\u7f16\u5236\u7248\u672c"}</DialogTitle>
            <DialogDescription>
              {
                "\u6bcf\u4e2a\u7248\u672c\u72ec\u7acb\u7f16\u5236\u3002\u5df2\u9009\u77e5\u8bc6\u8d44\u6599\u53ef\u590d\u7528\uff0c\u62db\u6807\u539f\u4ef6\u8bf7\u5728\u65b0\u7248\u672c\u9009\u7528\u6216\u4e0a\u4f20\u3002"
              }
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!data || busy) return;
              setBusy(true);
              setError("");
              try {
                await onCreate({
                  label,
                  requirements: value,
                  reuseLibrary: reuse,
                  requestId,
                  revision: data.revision,
                });
                setCreate(false);
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "\u521b\u5efa\u672a\u5b8c\u6210",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <Label>
              {"\u7248\u672c\u540d\u79f0"}
              <Input
                required
                maxLength={60}
                value={label}
                disabled={busy}
                onChange={(e) => setLabel(e.target.value)}
              />
            </Label>
            <RequirementsFields
              value={value}
              onChange={setValue}
              disabled={busy}
            />
            <Label className="jadera-version-reuse">
              <Checkbox
                checked={reuse}
                disabled={busy}
                onCheckedChange={(next) => setReuse(next === true)}
              />
              {
                "\u590d\u7528\u5f53\u524d\u7248\u672c\u5df2\u9009\u77e5\u8bc6\u8d44\u6599\u53ca\u6a21\u677f\u7684\u56fa\u5b9a\u7248\u672c"
              }
            </Label>
            {error && <p role="alert">{error}</p>}
            <div className="jadera-requirements-actions">
              <Button type="submit" disabled={busy}>
                {busy ? "\u521b\u5efa\u4e2d\u2026" : "\u521b\u5efa\u7248\u672c"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
export function CompilationRequirements({
  snapshot,
  loading,
  failed,
  onReload,
  onSave,
  versionLabel,
  readOnly = false,
}: {
  snapshot?: CompilationBrief;
  loading: boolean;
  failed: boolean;
  versionLabel?: string;
  readOnly?: boolean;
  onReload: () => void;
  onSave: (value: WritingRequirements, revision: number) => Promise<void>;
}) {
  const [value, setValue] = useState<WritingRequirements>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const draft = value ?? snapshot?.value;
  return (
    <section className="jadera-compilation-requirements">
      <div className="jadera-requirements-heading">
        <Icon name="settings" size="lg" />
        <div>
          <h1>{"\u7f16\u5236\u8981\u6c42"}</h1>
          <p>
            {versionLabel}
            {
              " \u00b7 \u8bbe\u5b9a\u672c\u7248\u7684\u5185\u5bb9\u8303\u56f4\u4e0e\u7f16\u5199\u91cd\u70b9"
            }
          </p>
        </div>
      </div>
      {loading ? (
        <p role="status">{"\u6b63\u5728\u8bfb\u53d6\u2026"}</p>
      ) : failed || !draft || !snapshot ? (
        <Button onClick={onReload}>
          {"\u672a\u80fd\u8bfb\u53d6\uff0c\u91cd\u8bd5"}
        </Button>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (readOnly) return;
            setBusy(true);
            setError("");
            setSaved(false);
            try {
              await onSave(draft, snapshot.revision);
              setValue(undefined);
              setSaved(true);
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : "\u4fdd\u5b58\u672a\u5b8c\u6210",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <p className="jadera-requirements-note">
            {"\u5b8c\u6574\u5ea6 " +
              requirementsComplete(draft) +
              "/5 \u00b7 \u4fdd\u5b58\u540e\u5c06\u66f4\u65b0\u672c\u7248\u7f16\u5199\u89c4\u5212\uff0c\u5df2\u6709\u89c4\u5212\u9700\u91cd\u65b0\u786e\u8ba4\u3002"}
          </p>
          {readOnly && (
            <p className="jadera-requirements-note">
              {
                "\u9879\u76ee\u5df2\u5f52\u6863\uff0c\u5f53\u524d\u4e3a\u53ea\u8bfb\u3002\u53ef\u4ece\u9879\u76ee\u64cd\u4f5c\u4e2d\u6062\u590d\u540e\u7ee7\u7eed\u7f16\u5236\u3002"
              }
            </p>
          )}
          <RequirementsFields
            value={draft}
            disabled={busy || readOnly}
            onChange={(next) => {
              setValue(next);
              setSaved(false);
            }}
          />
          {error && <p role="alert">{error}</p>}
          {saved && (
            <p role="status">
              {"\u5df2\u4fdd\u5b58\u672c\u7248\u7f16\u5236\u8981\u6c42"}
            </p>
          )}
          <div className="jadera-requirements-actions">
            <Button type="submit" disabled={busy || readOnly}>
              {busy
                ? "\u4fdd\u5b58\u4e2d\u2026"
                : "\u4fdd\u5b58\u7f16\u5236\u8981\u6c42"}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
