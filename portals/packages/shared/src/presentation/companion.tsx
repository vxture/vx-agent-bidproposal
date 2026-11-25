"use client";

import { Button } from "@vxture/design-system";

/** A host-supplied image and callback keep this entry usable on both surfaces. */
export function HomeCompanion({
  imageSrc,
  onOpen,
}: {
  imageSrc: string;
  onOpen: () => void;
}) {
  return (
    <div className="jadera-home-motif">
      <svg viewBox="0 0 280 170" fill="none" aria-hidden="true">
        <g stroke="currentColor">
          <path d="M106 14h60l29 29v91a7 7 0 0 1-7 7h-82a7 7 0 0 1-7-7V21a7 7 0 0 1 7-7Z" />
          <path d="M166 14v22a7 7 0 0 0 7 7h22M116 59h59M116 74h59M116 89h42M116 104h50" />
        </g>
      </svg>
      <Button
        variant="ghost"
        className="jadera-home-companion"
        onClick={onOpen}
        aria-label={
          "AI \u7f16\u6807\u642d\u6863\uff0c\u6253\u5f00 AI \u52a9\u624b"
        }
      >
        <img src={imageSrc} alt="" />
        <span>
          <small>{"AI \u7f16\u6807\u642d\u6863"}</small>
          <strong>
            {
              "\u8d44\u6599\u4e00\u8d77\u7406\uff0c\u6807\u4e66\u4e00\u8d77\u5199\u3002"
            }
          </strong>
        </span>
      </Button>
    </div>
  );
}
