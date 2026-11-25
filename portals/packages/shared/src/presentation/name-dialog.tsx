"use client";
import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Input,
  Label,
} from "@vxture/design-system";
export function NameDialog({
  title,
  initialName,
  maxLength,
  onClose,
  onSave,
}: {
  title: string;
  initialName: string;
  maxLength: number;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(initialName),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next && !busy) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {
              "\u4ec5\u4fee\u6539\u663e\u793a\u540d\u79f0\uff0c\u5df2\u4fdd\u5b58\u7684\u6587\u7a3f\u548c\u5386\u53f2\u6210\u679c\u4fdd\u6301\u539f\u6837\u3002"
            }
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy || !name.trim()) return;
            setBusy(true);
            setError("");
            try {
              await onSave(name.trim());
              onClose();
            } catch (error) {
              setError(
                error instanceof Error
                  ? error.message
                  : "\u91cd\u547d\u540d\u672a\u5b8c\u6210",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <Label>
            {"\u540d\u79f0"}
            <Input
              aria-label={"\u540d\u79f0"}
              required
              maxLength={maxLength}
              value={name}
              disabled={busy}
              onChange={(event) => setName(event.target.value)}
            />
          </Label>
          {error && <p role="alert">{error}</p>}
          <div className="jadera-requirements-actions">
            <Button type="submit" disabled={busy || !name.trim()}>
              {busy ? "\u4fdd\u5b58\u4e2d\u2026" : "\u4fdd\u5b58\u540d\u79f0"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
