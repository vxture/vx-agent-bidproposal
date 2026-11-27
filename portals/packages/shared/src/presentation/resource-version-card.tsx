"use client";
import { Button, Card, Icon } from "@vxture/design-system";
import type { ResourceData } from "../resources";
import { fileFormat } from "../file-formats";
import { ResourcePersonLabel } from "./resource-person";
import { ResourceActionsMenu } from "./resource-actions";
/** Compact record for one immutable version; the current cover remains primary. */
export function ResourceVersionCard({entry,onOpen,onDownload}:{
  entry:ResourceData["versions"][number];onOpen():void;onDownload?():void;
}){
  const format=fileFormat(entry.name)?.extension.toUpperCase(),date=entry.addedAt?new Date(entry.addedAt):undefined;
  return <Card className="jadera-resource-version-card" data-version={entry.version}>
    <div className="jadera-resource-version-identity"><strong>v{entry.version}</strong></div>
    <h3 title={entry.name}><Icon name="file-text" size="sm"/><span>{entry.name}</span></h3>
    <p className="jadera-resource-version-file">{format}{" \u00b7 "}{(entry.bytes/1024).toFixed(1)} KB</p>
    <div className="jadera-resource-version-person"><ResourcePersonLabel person={entry.uploadedBy} via={entry.source}/></div>
    <div className="jadera-resource-version-footer"><time dateTime={entry.addedAt} title={date?.toLocaleString("zh-CN")}>{date?.toLocaleString("zh-CN")||"\u672a\u8bb0\u5f55"}</time><div>
      <Button className="jadera-resource-open" size="md" onClick={onOpen} aria-label={"\u6253\u5f00 v"+entry.version+"\uff1a"+entry.name}>{"\u6253\u5f00"}</Button>
      {onDownload&&<ResourceActionsMenu title={"v"+entry.version+" "+entry.name} onDownload={onDownload} downloadLabel={"\u4e0b\u8f7d\u6b64\u7248\u672c"}/>}
    </div></div>
  </Card>;
}
