"use client";
import { useEffect, useState } from "react";
import { Button } from "@vxture/design-system";
import type { ResourceReference } from "../resources";
import {usePageRefresh} from "./page-refresh";
import { ResourcePersonLabel } from "./resource-person";
export function ResourceReferences({id,updatedAt,load,onOpenProject}:{
 id:string;updatedAt:string;
 load(id:string,signal:AbortSignal):Promise<ResourceReference[]>;
 onOpenProject?(id:string):void;
}){
 const[items,setItems]=useState<ResourceReference[]>([]),[state,setState]=useState("loading"),[retry,setRetry]=useState(0);
 usePageRefresh(()=>setRetry(value=>value+1));
 useEffect(()=>{const controller=new AbortController();if(items.length===0)setState("loading");void load(id,controller.signal).then(value=>{if(!controller.signal.aborted){setItems(value);setState("ready");}}).catch(()=>{if(!controller.signal.aborted)setState("failed");});return()=>controller.abort();},[id,updatedAt,load,retry]);
 return <section className="jadera-resource-references" aria-labelledby="resource-references-title">
  <h2 className="jadera-resource-section-title" id="resource-references-title">{"\u5f15\u7528\u8bb0\u5f55"}{state==="ready"&&<small>{items.length}</small>}</h2>
  {state==="loading"?<p className="jadera-resource-help" role="status">{"\u6b63\u5728\u8bfb\u53d6\u5f15\u7528\u8bb0\u5f55\u2026"}</p>:state==="failed"?<div role="status"><p className="jadera-resource-help">{"\u5f15\u7528\u8bb0\u5f55\u8bfb\u53d6\u5931\u8d25"}</p><Button variant="ghost" onClick={()=>setRetry(value=>value+1)}>{"\u91cd\u8bd5"}</Button></div>:items.length===0?<p className="jadera-resource-help">{"\u6682\u65e0\u9879\u76ee\u5f15\u7528"}</p>:<ul>{items.map(entry=><li key={entry.projectId}>
    {onOpenProject?<button type="button" className="jadera-reference-project" onClick={()=>onOpenProject(entry.projectId)}>{entry.projectName}</button>:<strong className="jadera-reference-project">{entry.projectName}</strong>}
    <div className="jadera-reference-meta"><span>{entry.compilationLabel}</span><span>{"\u5f15\u7528 v"}{entry.version}</span>{entry.archived&&<span>{"\u5df2\u5f52\u6863"}</span>}</div>
    <div className="jadera-reference-owner"><span>{"\u8d1f\u8d23\u4eba"}</span><ResourcePersonLabel person={entry.owner}/></div>
    <time dateTime={entry.referencedAt}>{new Date(entry.referencedAt).toLocaleString("zh-CN")}</time>
  </li>)}</ul>}
 </section>;
}
