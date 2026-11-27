"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Icon } from "@vxture/design-system";

interface HintState { visible: boolean; bottom: boolean; x: number; y: number }
/** Observe the main page, never scroll boxes belonging to auxiliary panels. */
export function PageScrollHint({ scopeRef, frameRef, frameActive = false }: {
  scopeRef?: RefObject<HTMLElement | null>;
  frameRef?: RefObject<HTMLIFrameElement | null>;
  frameActive?: boolean;
}) {
  const hint = useRef<HTMLDivElement>(null);
  const [state,setState] = useState<HintState>({visible:false,bottom:false,x:0,y:6});
  useEffect(() => {
    const scope=scopeRef?.current || hint.current?.parentElement;
    if(!scope)return;
    let frame=0,disposed=false,scrollTarget:EventTarget | undefined;
    const observed=new Set<Element>();
    const schedule=()=>{if(!disposed&&!frame)frame=requestAnimationFrame(measure);};
    const resize=new ResizeObserver(schedule);
    function measure(){
      frame=0;
      if(disposed)return;
      let target:Element | undefined,viewport:Element | undefined,doc:Document | undefined;
      if(frameActive){
        try{doc=frameRef?.current?.contentDocument || undefined;target=doc?.scrollingElement || undefined;viewport=frameRef?.current || undefined;}catch{/* Cross-origin readers own their scroll state. */}
      }else{
        target=Array.from(scope!.querySelectorAll<HTMLElement>('[data-page-scroll]')).find(element=>!element.closest('[hidden]')&&element.getBoundingClientRect().height>0);
        viewport=target;
      }
      const eventTarget=doc || target;
      if(eventTarget!==scrollTarget){scrollTarget?.removeEventListener('scroll',schedule);scrollTarget=eventTarget;scrollTarget?.addEventListener('scroll',schedule,{passive:true});}
      const desired=new Set<Element>([scope!,...(target?[target,...Array.from(target.children)]:[]),...(viewport?[viewport]:[]),...(doc?.body?[doc.body]:[])]);
      for(const element of observed)if(!desired.has(element)){resize.unobserve(element);observed.delete(element);}
      for(const element of desired)if(!observed.has(element)){observed.add(element);resize.observe(element);}
      const box=viewport?.getBoundingClientRect(),bounds=scope!.getBoundingClientRect();
      if(!target||!box||target.clientHeight<=0||box.width<=0||box.height<=0){setState(previous=>previous.visible?{...previous,visible:false}:previous);return;}
      const left=Math.max(box.left,bounds.left),right=Math.min(box.right,bounds.right),bottom=Math.min(box.bottom,bounds.bottom);
      const next={visible:right>left&&bottom>Math.max(box.top,bounds.top),bottom:target.scrollHeight-target.clientHeight-Math.max(0,target.scrollTop)<=4,x:Math.round((left+right)/2-bounds.left),y:Math.max(6,Math.round(bounds.bottom-bottom+6))};
      setState(previous=>previous.visible===next.visible&&previous.bottom===next.bottom&&previous.x===next.x&&previous.y===next.y?previous:next);
    }
    const mutations=new MutationObserver(records=>{if(records.some(record=>{const element=record.target instanceof Element?record.target:record.target.parentElement;return !element?.closest('[data-page-scroll-hint]');}))schedule();});
    mutations.observe(scope,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','style','hidden']});
    // Same-origin project contents can change independently of the host tree.
    let frameMutations:MutationObserver | undefined;
    const frameLoaded=()=>{frameMutations?.disconnect();try{const body=frameRef?.current?.contentDocument?.body;if(body){frameMutations=new MutationObserver(schedule);frameMutations.observe(body,{subtree:true,childList:true,characterData:true});}}catch{}schedule();};
    frameRef?.current?.addEventListener('load',frameLoaded);
    scope.addEventListener('load',schedule,true);
    window.addEventListener('resize',schedule,{passive:true});
    frameLoaded();
    return()=>{disposed=true;cancelAnimationFrame(frame);resize.disconnect();mutations.disconnect();frameMutations?.disconnect();scrollTarget?.removeEventListener('scroll',schedule);scope.removeEventListener('load',schedule,true);window.removeEventListener('resize',schedule);frameRef?.current?.removeEventListener('load',frameLoaded);};
  },[scopeRef,frameRef,frameActive]);
  return <div ref={hint} className="jadera-page-scroll-hint" data-page-scroll-hint data-state={state.bottom?"end":"more"} hidden={!state.visible} aria-hidden="true" style={{left:state.x,bottom:state.y}}>
    {state.bottom?<span>{"\u2014 \u5df2\u5230\u9875\u9762\u5e95\u90e8 \u2014"}</span>:<Icon name="chevron-down" size="sm"/>}
  </div>;
}
