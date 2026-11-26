"use client";

import type { ReactNode } from "react";
import {
  Button,
  Card,
  CardFooter,
  Icon,
  StatusBadge,
} from "@vxture/design-system";

/** Knowledge and templates share a card contract; the host owns their data and actions. */
export function ResourceVisualCard({
  title,
  category,
  version,
  updatedAt,
  status,
  onOpen,
  actions,
  preview,
}: {
  title: string;
  category: string;
  version?: number;
  updatedAt: string;
  status?: string;
  onOpen: () => void;
  actions?: ReactNode;
  preview?: ReactNode;
}) {
  const date = new Date(updatedAt);
  const displayTitle = title.replace(/[.](pdf|docx|md)$/i, "");
  return (
    <Card className="jadera-resource-card">
      <div className="jadera-resource-preview" aria-hidden>
        <i />
        <i />
        <div>
          {preview || (
            <>
              <Icon name="file-text" size="lg" />
              <strong>{displayTitle}</strong>
              <span>{category}</span>
              <hr />
              <hr />
            </>
          )}
        </div>
      </div>
      <CardFooter className="jadera-resource-copy">
        <div className="jadera-resource-title">
          <h3 title={title}>{displayTitle}</h3>
          {status && (
            <StatusBadge tone="neutral" dot>
              {status}
            </StatusBadge>
          )}
        </div>
        <div className="jadera-resource-meta">
          <span>
            {version === undefined ? category : `v${version}`}
            <time dateTime={updatedAt}>
              {Number.isFinite(date.getTime())
                ? date.toLocaleDateString("zh-CN", {
                    month: "2-digit",
                    day: "2-digit",
                  })
                : ""}
            </time>
          </span>
          <div>
            <Button
              size="md"
              variant="ghost"
              onClick={onOpen}
              aria-label={"\u67e5\u770b" + title}
            >
              <Icon name="eye" size="xs" />{"\u67e5\u770b"}</Button>
            {actions}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
