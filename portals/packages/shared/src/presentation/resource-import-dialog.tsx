"use client";
import {
  Button,
  Icon,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  FileTrigger,
  Label,
  NativeSelect,
} from "@vxture/design-system";
import { FILE_ACCEPT } from "../file-formats";
import type { ResourceType } from "../resources";
export function ResourceImportDialog({
  open,
  onOpenChange,
  title,
  description,
  file,
  onFile,
  busy,
  error,
  category,
  onCategory,
  types,
  submitLabel,
  onSubmit,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  title: string;
  description?: string;
  file?: File;
  onFile(file?: File): void;
  busy: boolean;
  error?: string;
  category?: string;
  onCategory?(value: string): void;
  types?: ResourceType[];
  submitLabel?: string;
  onSubmit(): void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next);
      }}
    >
      <DialogContent
        className="jadera-resource-import-dialog"
        onInteractOutside={(e) => {
          if (busy) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description ||
              "\u9009\u62e9\u539f\u59cb\u6587\u4ef6\u5e76\u4e0a\u4f20\uff0c\u5386\u53f2\u7248\u672c\u548c\u9879\u76ee\u5df2\u6709\u5f15\u7528\u5c06\u4fdd\u7559\u3002"}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (file && !busy) onSubmit();
          }}
        >
          {types && (
            <Label className="jadera-import-type">
              {"\u8d44\u6599\u7c7b\u578b"}
              <NativeSelect
                value={category}
                disabled={busy || !onCategory}
                onChange={(e) => onCategory?.(e.target.value)}
              >
                {types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </NativeSelect>
            </Label>
          )}
          <div className="jadera-import-picker">
            <Icon name="file-text" size="lg" />
            <strong>
              {file
                ? file.name
                : "\u9009\u62e9\u8981\u4e0a\u4f20\u7684\u6587\u4ef6"}
            </strong>
            <p>
              {file
                ? (file.size / 1024 / 1024).toFixed(2) + " MiB"
                : "Office\u3001PDF\u3001Markdown\u3001\u56fe\u7247 \u00b7 \u6700\u5927 20 MiB"}
            </p>
            <FileTrigger
              accept={FILE_ACCEPT}
              disabled={busy}
              onSelect={(files) => onFile(files[0])}
              variant="outline"
            >
              {file ? "\u91cd\u65b0\u9009\u62e9" : "\u9009\u62e9\u6587\u4ef6"}
            </FileTrigger>
          </div>
          {error && <p role="alert">{error}</p>}
          {busy && (
            <div role="status" className="jadera-import-progress">
              <progress aria-label={"\u4e0a\u4f20\u4e2d"} />
              <span>
                {"\u6b63\u5728\u4e0a\u4f20\u5e76\u4fdd\u5b58\u539f\u4ef6\u2026"}
              </span>
            </div>
          )}
          <footer>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              {"\u53d6\u6d88"}
            </Button>
            <Button
              type="submit"
              disabled={busy || !file || (!!types && !category)}
            >
              {busy
                ? "\u4e0a\u4f20\u4e2d\u2026"
                : submitLabel || "\u786e\u8ba4\u4e0a\u4f20"}
            </Button>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  );
}
