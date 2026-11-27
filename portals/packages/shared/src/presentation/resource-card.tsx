"use client";
import { useRef, type ReactNode, type MouseEvent } from "react";
import { Button, Card, CardFooter, Icon, StatusBadge } from "@vxture/design-system";
import { ResourceArtwork } from "./resource-preview";

/** The card navigates to the resource; explicit actions operate on its file. */
export function ResourceVisualCard({title,category,version,updatedAt,status,onDetails,onOpenFile,actions,preview}:{
 title:string;category:string;version?:number;updatedAt:string;status?:string;
 onDetails?():void;onOpenFile():void;actions?:ReactNode;preview?:ReactNode;
}) {
 const date=new Date(updatedAt),displayTitle=title.replace(/[.](pdf|docx|xlsx|pptx|md)$/i,"");
 const pointer=useRef<{x:number;y:number;dragged:boolean} | undefined>(undefined);
 const navigateDetails=(event:MouseEvent<HTMLElement>)=>{
  if(!onDetails||(event.detail!==0&&pointer.current?.dragged))return;
  const card=event.currentTarget.closest('.jadera-resource-card')||event.currentTarget;
  const selection=window.getSelection();
  if(selection&&!selection.isCollapsed&&(card.contains(selection.anchorNode)||card.contains(selection.focusNode)))return;
  onDetails();
 };
 const activateDetails=(event:MouseEvent<HTMLDivElement>)=>{
  const target=event.target;
  if(!onDetails||event.defaultPrevented||!(target instanceof Element)||!event.currentTarget.contains(target)||target.closest('button,a,input,select,textarea,summary,[role="menuitem"],[data-card-actions]')||pointer.current?.dragged)return;
  navigateDetails(event);
 };
 return <Card className="jadera-resource-card" data-details-enabled={!!onDetails}
  onClick={activateDetails}
  onPointerDown={event=>{pointer.current={x:event.clientX,y:event.clientY,dragged:false};}}
  onPointerMove={event=>{const start=pointer.current;if(start&&Math.hypot(event.clientX-start.x,event.clientY-start.y)>6)start.dragged=true;}}
  onPointerCancel={()=>{if(pointer.current)pointer.current.dragged=true;}}>
  {status&&<StatusBadge className="jadera-resource-status" tone="neutral" dot>{status}</StatusBadge>}
  <ResourceArtwork>{preview||<><Icon name="file-text" size="lg"/><strong>{displayTitle}</strong><span>{category}</span><hr/><hr/></>}</ResourceArtwork>
  <CardFooter className="jadera-resource-copy">
   <div className="jadera-resource-title"><h3 title={title}>{onDetails?<button type="button" className="jadera-resource-title-link" onClick={navigateDetails} aria-label={"\u8d44\u6599\u8be6\u60c5\uff1a"+title}>{displayTitle}</button>:displayTitle}</h3></div>
   <div className="jadera-resource-meta">
    <span>{version===undefined?category:`v${version}`}<time dateTime={updatedAt} title={date.toLocaleString("zh-CN")}>{Number.isFinite(date.getTime())?date.toLocaleDateString("zh-CN",{month:"2-digit",day:"2-digit"}):""}</time></span>
    <div data-card-actions>
     <Button className="jadera-resource-open" size="md" variant="default" onClick={onOpenFile} disabled={version===undefined} aria-label={"\u6253\u5f00\u6587\u4ef6\uff1a"+title+(version===undefined?"":` v${version}`)} title={version===undefined?"\u5c1a\u65e0\u539f\u4ef6":"\u6253\u5f00\u6587\u4ef6 v"+version}>{"\u6253\u5f00"}</Button>
     {actions}
    </div>
   </div>
  </CardFooter>
 </Card>;
}
