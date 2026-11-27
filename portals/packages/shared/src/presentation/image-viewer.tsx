"use client";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@vxture/design-system";

/** Source URLs are supplied by the authenticated host, never a public converter. */
export function ImageViewer({ src, name, animated = false, toolbarTarget, onFailure }: { src: string; name: string; animated?: boolean; toolbarTarget?: HTMLElement | null; onFailure?(message:string):void }) {
  const [zoom, setZoom] = useState(1), [rotation, setRotation] = useState(0);
  const [paused, setPaused] = useState(false), [failed, setFailed] = useState(false);
  const image = useRef<HTMLImageElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => { setZoom(1); setRotation(0); setPaused(false); setFailed(false); }, [src]);
  const pause = () => {
    if (!paused && image.current && canvas.current) {
      const picture = image.current, frame = canvas.current;
      frame.width = picture.naturalWidth; frame.height = picture.naturalHeight;
      try { frame.getContext("2d")!.drawImage(picture, 0, 0); } catch { setFailed(true); return; }
    }
    setPaused(!paused);
  };
  const tools=<div className="jadera-file-tools" role="toolbar" aria-label="\u56fe\u7247\u64cd\u4f5c">
      <Button variant="ghost" onClick={() => { setZoom(1); setRotation(0); }}>{"\u9002\u5e94\u7a97\u53e3"}</Button>
      <Button variant="ghost" disabled={zoom <= .25} onClick={() => setZoom(Math.max(.25, zoom - .25))}>{"\u7f29\u5c0f"}</Button>
      <span aria-live="polite">{Math.round(zoom * 100)}%</span>
      <Button variant="ghost" disabled={zoom >= 4} onClick={() => setZoom(Math.min(4, zoom + .25))}>{"\u653e\u5927"}</Button>
      <Button variant="ghost" onClick={() => setRotation((rotation + 90) % 360)}>{"\u65cb\u8f6c"}</Button>
      {animated && <Button variant="ghost" onClick={pause}>{paused ? "\u64ad\u653e" : "\u6682\u505c"}</Button>}
      {!toolbarTarget&&<a href={src} download={name}>{"\u4e0b\u8f7d\u539f\u56fe"}</a>}
    </div>;
  return <div className="jadera-image-viewer">
    {toolbarTarget?createPortal(tools,toolbarTarget):tools}
    {failed ? <p role="alert">{"\u56fe\u7247\u52a0\u8f7d\u5931\u8d25"}</p> : <div className="jadera-image-stage" data-page-scroll>
      <div style={{ transform: `scale(${zoom}) rotate(${rotation}deg)`, transformOrigin: "center" }}>
        <img ref={image} src={src} alt={name} hidden={paused} onError={() => {if(onFailure)onFailure("Image unavailable");else setFailed(true);}} />
        <canvas ref={canvas} hidden={!paused} role="img" aria-label={name} />
      </div>
    </div>}
  </div>;
}
