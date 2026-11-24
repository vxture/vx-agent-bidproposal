/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Business
 * @author AI-Generated
 * @date 2026-11-25
 */
// Model output is the primary surface; editing remains an optional fallback.
export function renderPlanResult(target,{plan,candidate,matrix,locked,confirm,discard}) {
 target.replaceChildren();
 const text=(tag,value,cls)=>{const el=document.createElement(tag);el.textContent=value;if(cls)el.className=cls;return el;};
 const pending=!!candidate.value;const stale=pending&&(plan.dirty||candidate.value.planRevision!==plan.revision);
 let chapters=plan.value.outline,error;
 if(pending)try{chapters=candidate.preview(plan,matrix);}catch(e){chapters=[];error=e.message;}
 const head=document.createElement('div');head.className='plan-result-heading';
 head.append(text('div',pending?'\u667a\u80fd\u4f53\u5efa\u8bae\u65b9\u6848':plan.value.approved?'\u5df2\u786e\u8ba4\u7684\u7f16\u5199\u65b9\u6848':'\u7f16\u5199\u65b9\u6848','section-label'));
 head.append(text('span',pending?'\u5f85\u4f60\u786e\u8ba4':plan.value.approved?'\u5df2\u786e\u8ba4':'\u8349\u6848','plan-state-chip'));target.append(head);
 if(error)target.append(text('p',error,'error'));
 if(!chapters.length){target.append(text('h2','\u5148\u8ba9\u667a\u80fd\u4f53\u505a\u4e00\u4efd\u597d\u7684\u7f16\u5199\u8ba1\u5212'));target.append(text('p','\u6839\u636e\u5df2\u786e\u8ba4\u7684\u5546\u52a1\u3001\u6280\u672f\u9700\u6c42\uff0c\u751f\u6210\u76ee\u5f55\u5e76\u5b89\u6392\u5206\u7ae0\u4efb\u52a1\u3002\u4f60\u53ea\u9700\u786e\u8ba4\u65b9\u5411\uff0c\u4e0d\u5fc5\u9010\u9879\u642d\u5efa\u76ee\u5f55\u3002','muted'));return;}
 const scope=matrix.rows.filter(r=>plan.value.volume==='combined'||r.category===plan.value.volume);
 const covered=new Set(chapters.flatMap(c=>c.requirementIds));
 const metrics=document.createElement('div');metrics.className='plan-result-metrics';
 for(const [value,label]of [[chapters.length,'\u7ae0\u7f16\u5199\u4efb\u52a1'],[scope.filter(r=>covered.has(r.id)).length+'/'+scope.length,'\u9879\u9700\u6c42\u5df2\u8986\u76d6'],[plan.value.pages,'\u9875\u76ee\u6807\uff08\u4f30\u7b97\uff09']]){const item=document.createElement('div');item.append(text('strong',String(value)),text('span',label));metrics.append(item);}target.append(metrics);let strategy=plan.value.summary||'';if(pending)try{strategy=JSON.parse(candidate.value.content.trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'')).summary||'';}catch{}if(typeof strategy==='string'&&strategy){const intro=document.createElement('div');intro.className='plan-strategy';intro.append(text('p',strategy.slice(0,150)+(strategy.length>150?'\u2026':'')));if(strategy.length>150){const full=document.createElement('details');full.append(text('summary','\u5c55\u5f00\u5b8c\u6574\u89c4\u5212\u601d\u8def'),text('p',strategy));intro.append(full);}target.append(intro);}if(stale)target.append(text('p','\u7f16\u5199\u76ee\u6807\u5df2\u6539\u53d8\uff0c\u8bf7\u6309\u65b0\u8981\u6c42\u91cd\u65b0\u89c4\u5212\u540e\u786e\u8ba4\u3002','plan-warning'));
 target.append(text('p','\u786e\u8ba4\u540e\u6309\u4ee5\u4e0b\u987a\u5e8f\u5206\u7ae0\u7f16\u5199\uff0c\u6bcf\u7ae0\u7ed1\u5b9a\u539f\u59cb\u9700\u6c42\uff1b\u540e\u7eed\u53ef\u5355\u72ec\u91cd\u5199\u3002','muted'));
 const outline=document.createElement('ol');outline.className='plan-result-outline';
 for(const [i,c]of chapters.entries()){
  const row=document.createElement('li');const body=document.createElement('div');row.append(text('span',String(i+1).padStart(2,'0'),'plan-result-number'));body.append(text('h3',c.title));if(c.purpose)body.append(text('p',c.purpose,'plan-chapter-purpose'));
  const requirements=c.requirementIds.map(id=>matrix.rows.find(r=>r.id===id)).filter(Boolean);
  body.append(text('p',requirements.map(r=>r.text).join(' / '),'plan-requirement-summary'));
  const detail=document.createElement('details');detail.append(text('summary','\u9700\u6c42\u4f9d\u636e\u00b7 '+requirements.length+' \u9879'));
  for(const r of requirements){const evidence=document.createElement('div');evidence.className='plan-evidence';evidence.append(text('strong',r.text),text('blockquote',r.quote||''),text('small',r.location||''));detail.append(evidence);}body.append(detail);row.append(body);outline.append(row);
 }target.append(outline);
 const footer=document.createElement('div');footer.className='plan-result-actions';const approve=text('button',pending?'\u786e\u8ba4\u6b64\u65b9\u6848':'\u786e\u8ba4\u76ee\u5f55\u5e76\u4fdd\u5b58','primary');approve.disabled=locked||!!error||stale||!!candidate.value?.review?.invalid;approve.onclick=confirm;footer.append(approve);
 if(pending){const reject=text('button',candidate.value?.review&&!candidate.value.review.invalid?'\u67e5\u770b\u5904\u7406\u9009\u9879':'\u653e\u5f03\u5019\u9009','quiet');reject.disabled=locked;reject.onclick=discard;footer.append(reject);}
 if(!pending&&plan.value.approved){approve.hidden=true;footer.append(text('span','\u89c4\u5212\u5df2\u4fdd\u5b58\uff0c\u540e\u7eed\u6309\u6b64\u65b9\u6848\u8fdb\u5165\u6807\u4e66\u7f16\u5199','muted'));}target.append(footer);
 if(pending&&plan.value.outline.length){const previous=document.createElement('details');previous.className='plan-previous';previous.append(text('summary','\u67e5\u770b\u5f53\u524d\u76ee\u5f55\uff08\u786e\u8ba4\u524d\u4fdd\u6301\u4e0d\u53d8\uff09'));const list=document.createElement('ol');for(const c of plan.value.outline)list.append(text('li',c.title));previous.append(list);target.append(previous);}
}
