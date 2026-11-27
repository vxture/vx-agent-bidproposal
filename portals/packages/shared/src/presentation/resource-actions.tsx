"use client";
import { Button, Icon, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@vxture/design-system";
export function ResourceActionsMenu({title,onEdit,onUpload,onVersions,onReferences,onDownload,downloadLabel}: {
 title:string;onEdit?():void;onUpload?():void;onVersions?():void;onReferences?():void;onDownload?():void;downloadLabel?:string;
}) {
 return <DropdownMenu><DropdownMenuTrigger asChild>
  <Button className="jadera-resource-more" variant="ghost" size="icon-md" aria-label={title+"\u7684\u66f4\u591a\u64cd\u4f5c"} title={"\u66f4\u591a\u64cd\u4f5c"}><Icon name="more-vertical" size="lg"/></Button>
 </DropdownMenuTrigger><DropdownMenuContent align="end" onClick={event=>event.stopPropagation()}>
  {onEdit&&<DropdownMenuItem onSelect={onEdit}>{"\u7f16\u8f91\u8d44\u6599"}</DropdownMenuItem>}
  {onUpload&&<DropdownMenuItem onSelect={onUpload}>{"\u4e0a\u4f20\u65b0\u7248\u672c"}</DropdownMenuItem>}
  {onVersions&&<DropdownMenuItem onSelect={onVersions}>{"\u7248\u672c\u4fe1\u606f"}</DropdownMenuItem>}
  {onReferences&&<DropdownMenuItem onSelect={onReferences}>{"\u5f15\u7528\u8bb0\u5f55"}</DropdownMenuItem>}
  {onDownload&&<>{(onEdit||onUpload||onVersions||onReferences)&&<DropdownMenuSeparator/>}<DropdownMenuItem onSelect={onDownload}>{downloadLabel||"\u4e0b\u8f7d\u5f53\u524d\u7248\u672c"}</DropdownMenuItem></>}
 </DropdownMenuContent></DropdownMenu>;
}
