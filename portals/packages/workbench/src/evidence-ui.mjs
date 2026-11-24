/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category BusinessUi
 * @author AI-Generated
 * @date 2026-11-25
 */
import {EvidenceSession} from './evidence.mjs';
import {checked} from './background.mjs';
import {autoSave} from './autosave.mjs';

const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
const flags={expired:'\u5df2\u8fc7\u671f',undated:'\u6709\u6548\u671f\u672a\u6807\u660e',conflict:'\u4fe1\u606f\u51b2\u7a81',uncertain:'\u9700\u8981\u6838\u5bf9','source-warning':'\u539f\u6587\u8bfb\u53d6\u6709\u63d0\u793a','operator-supplement':'\u4eba\u5de5\u4fee\u8ba2',excluded:'\u5df2\u6392\u9664'};
const statuses={available:'\u53ef\u7528\u5019\u9009',review:'\u5f85\u6838\u5bf9',missing:'\u672a\u627e\u5230\u8bc1\u636e',not_required:'\u65e0\u9700\u4f01\u4e1a\u8bc1\u660e',pending:'\u5339\u914d\u4e2d'};
const jobStates={running:'\u540e\u53f0\u6267\u884c\u4e2d',waiting:'\u7b49\u5f85 RUYIN \u8d44\u6599\u6388\u6743',paused:'\u5df2\u6682\u505c',completed:'\u5df2\u5b8c\u6210',error:'\u4efb\u52a1\u5931\u8d25',cancelled:'\u5df2\u53d6\u6d88'};
const running=r=>r.job&&!['completed','error','cancelled'].includes(r.job.state);
const location=f=>[f.source.name+' \u00b7 v'+f.source.version,f.segment.location?.page?'\u7b2c '+f.segment.location.page+' \u9875':'\u7ed3\u6784\u5757 '+(f.segment.unit+1),f.segment.table!==undefined?'\u8868 '+(f.segment.table+1)+' / \u884c '+(f.segment.row+1):''].filter(Boolean).join(' / ');
export async function mountEvidence(bridge,{target=document.querySelector('.matrix-heading'),beforeStart=async()=>{}}={}){
  const session=new EvidenceSession(bridge),entry=el('button','\u4f01\u4e1a\u8bc1\u636e','evidence-entry');target.append(entry);
  const backdrop=el('div',null,'evidence-backdrop'),panel=el('aside',null,'evidence-panel');backdrop.hidden=true;panel.setAttribute('aria-label','\u4f01\u4e1a\u8bc1\u636e');backdrop.append(panel);document.body.append(backdrop);
  const head=el('header',null,'evidence-heading'),intro=el('div'),close=el('button','\u5173\u95ed\u4f01\u4e1a\u8bc1\u636e');intro.append(el('p','\u4f01\u4e1a\u8d44\u6599 \u2192 \u9700\u6c42\u8bc1\u636e','eyebrow'),el('h2','\u8ba9\u6bcf\u4e00\u9879\u4f01\u4e1a\u9648\u8ff0\u6709\u4f9d\u636e'));head.append(intro,close);
  const hint=el('p',null,'evidence-hint'),actions=el('div',null,'evidence-actions'),notice=el('p',null,'evidence-notice');notice.setAttribute('role','status');
  const tabs=el('div',null,'evidence-tabs'),factTab=el('button','\u4e8b\u5b9e\u6574\u7406'),matchTab=el('button','\u9700\u6c42\u5339\u914d'),adoptAll=el('button','\u6279\u91cf\u91c7\u7eb3\u65e0\u5f02\u5e38\u4e8b\u5b9e');tabs.append(factTab,matchTab,adoptAll);
  const toolbar=el('div',null,'evidence-toolbar'),filter=el('select'),search=el('input');filter.setAttribute('aria-label','\u8bc1\u636e\u72b6\u6001');search.placeholder='\u641c\u7d22\u4e8b\u5b9e\u6216\u9700\u6c42';search.setAttribute('aria-label',search.placeholder);toolbar.append(filter,search);
  const layout=el('div',null,'evidence-layout'),list=el('div',null,'evidence-list'),detail=el('section',null,'evidence-detail');detail.setAttribute('aria-label','\u8bc1\u636e\u8be6\u60c5');layout.append(list,detail);panel.append(head,hint,actions,notice,tabs,toolbar,layout);
  let view='facts',selected=null,busy=false,timer,stopped=false,visible=false,edited=false,renderKey='',detailKey='';
  const say=s=>notice.textContent=s;
  let noteDrafts={},noteRevision=0,notesLoaded=false;
  const saver=autoSave(async()=>{const markdown=JSON.stringify(noteDrafts);if(new TextEncoder().encode(markdown).byteLength>850000)throw Error('Evidence note drafts exceed the storage budget');const doc=checked(await bridge.request('PUT','/documents/bid_evidence_note_drafts',{markdown,revision:noteRevision}));noteRevision=doc.revision;},{onState:(state,error)=>{if(state==='saved'){edited=false;say('\u5904\u7406\u8bf4\u660e\u8349\u7a3f\u5df2\u81ea\u52a8\u4fdd\u5b58');}if(state==='error')say(error.message+' / \u672c\u5730\u8f93\u5165\u4ecd\u4fdd\u7559');}});
  async function loadNotes(){if(notesLoaded)return;const doc=await session.doc('bid_evidence_note_drafts');noteRevision=doc?.revision||0;noteDrafts=doc?JSON.parse(doc.markdown):{};notesLoaded=true;}
  async function act(fn){if(busy)return;busy=true;render();try{await saver.flush();await beforeStart();await fn();edited=false;await refresh();say('\u5df2\u81ea\u52a8\u4fdd\u5b58\u5230\u5f53\u524d\u9879\u76ee');}catch(e){say(e.message);}finally{busy=false;render();}}
  function schedule(){clearTimeout(timer);if(!stopped&&visible&&!document.hidden&&(running(session.extract)||running(session.match)))timer=setTimeout(()=>void refresh().catch(e=>say(e.message)),2200);}
  async function refresh(){await session.load();render();schedule();}
  function renderActions(){actions.replaceChildren();for(const [request,title,label,start,disabled]of [[session.extract,'01 \u6574\u7406\u4f01\u4e1a\u8d44\u6599','\u667a\u80fd\u6574\u7406',()=>session.startExtraction(),!session.selection.items.length||running(session.match)],[session.match,'02 \u5339\u914d\u62db\u6807\u9700\u6c42','\u5339\u914d\u62db\u6807\u9700\u6c42',()=>session.startMatching(),!session.complete||!session.matrix.rows.length]]){
      const box=el('section'),summary=el('p',null,'evidence-job-state'),button=el('button',label,'primary'),job=request.job;
      const current=request===session.extract?session.complete:job?.state==='completed'&&!session.matchStale&&!session.errors.some(e=>e.phase==='results');
      if(current)button.textContent=request===session.extract?'\u8d44\u6599\u5df2\u6574\u7406':'\u9700\u6c42\u5df2\u5339\u914d';else if(job)button.textContent=request===session.extract?'\u91cd\u65b0\u6574\u7406':'\u91cd\u65b0\u5339\u914d';
      box.append(el('h3',title));summary.textContent=job?(jobStates[job.state]||job.state)+' \u00b7 '+job.steps.filter(s=>s.state==='done').length+'/'+job.steps.length+' \u6279':'\u7531\u667a\u80fd\u4f53\u5206\u6279\u5b8c\u6210';button.disabled=busy||disabled||running(request)||current;button.onclick=()=>void act(start);box.append(summary,button);
      if(job&&['error','paused','running','waiting'].includes(job.state)){const control=el('button',job.state==='error'?'\u91cd\u8bd5\u4efb\u52a1':job.state==='paused'?'\u7ee7\u7eed\u4efb\u52a1':'\u6682\u505c\u540e\u7eed\u6279\u6b21');control.disabled=busy;control.onclick=()=>void act(()=>request.control(job.state==='error'?'retry':job.state==='paused'?'resume':'pause'));box.append(control);}
      if(job?.error)box.append(el('p',job.error,'evidence-warning'));actions.append(box);
    }}
  function render(){
    if(!visible)return;
    const facts=session.facts,rows=session.recommendations;
    hint.textContent='\u5df2\u9009\u7528 '+session.selection.items.length+' \u4efd\u8d44\u6599 \u00b7 '+facts.length+' \u6761\u4e8b\u5b9e\u5019\u9009\u3002\u540e\u53f0\u4efb\u52a1\u53ef\u79bb\u9875\u6267\u884c\uff0c\u91c7\u7eb3\u4e0d\u4ee3\u8868\u5df2\u6ee1\u8db3\u6295\u6807\u6761\u4ef6\u3002';
    renderActions();factTab.setAttribute('aria-pressed',String(view==='facts'));matchTab.setAttribute('aria-pressed',String(view==='matches'));
    const eligible=facts.filter(f=>!f.flags.length&&!f.decision);adoptAll.disabled=busy||!session.complete||!eligible.length||running(session.match);adoptAll.hidden=view!=='facts';
    const options=view==='facts'?[['all','\u5168\u90e8\u4e8b\u5b9e'],['pending','\u5f85\u91c7\u7eb3'],['adopted','\u5df2\u91c7\u7eb3'],['attention','\u5f02\u5e38\u4e0e\u7f3a\u53e3']]:[['all','\u5168\u90e8\u9700\u6c42'],...Object.entries(statuses)];
    if(filter.dataset.view!==view){filter.replaceChildren(...options.map(([value,label])=>{const n=el('option',label);n.value=value;return n;}));filter.dataset.view=view;}
    const historical=view==='facts'?session.extractStale:session.matchStale;
    const warnings=[...(historical?['\u8f93\u5165\u5df2\u66f4\u65b0\uff0c\u4ee5\u4e0b\u662f\u5386\u53f2\u7ed3\u679c\uff0c\u8bf7\u91cd\u65b0\u6574\u7406\u6216\u5339\u914d']:[]),...session.errors.map(e=>e.batchId+'\uff1a'+e.message)];
    panel.querySelectorAll('.evidence-problem').forEach(n=>n.remove());if(warnings.length){const warning=el('p',warnings.join('\n'),'evidence-problem');notice.after(warning);}
    const query=search.value.trim().toLowerCase();let items=view==='facts'?facts.filter(f=>(filter.value==='all'||filter.value==='pending'&&!f.decision||filter.value==='adopted'&&f.decision?.action==='adopt'||filter.value==='attention'&&f.flags.length)&&[f.subject,f.attribute,f.value,f.source.name].join(' ').toLowerCase().includes(query)):rows.filter(r=>(filter.value==='all'||r.status===filter.value)&&r.requirement.text.toLowerCase().includes(query));
    const key=JSON.stringify([view,items,selected,busy,historical]);
    if(key!==renderKey){renderKey=key;list.replaceChildren();if(!items.length)list.append(el('p',view==='facts'?'\u5148\u5728\u5de6\u4fa7\u57fa\u7840\u914d\u7f6e\u9009\u7528\u8d44\u6599\uff0c\u518d\u8ba9\u667a\u80fd\u4f53\u6574\u7406\u3002\u672a\u627e\u5230\u7b26\u5408\u5f53\u524d\u7b5b\u9009\u7684\u4e8b\u5b9e\u3002':'\u6574\u7406\u5b8c\u6210\u540e\u53ef\u5339\u914d\u9700\u6c42\u3002\u6ca1\u6709\u8bc1\u636e\u4e0d\u963b\u6b62\u7ee7\u7eed\u7f16\u5199\u8349\u7a3f\u3002','evidence-empty'));
      for(const item of items){const id=view==='facts'?item.id:item.requirement.id,row=el('button',null,'evidence-row');row.setAttribute('aria-current',String(selected===id));row.append(el('small',view==='facts'?(item.flags.map(f=>flags[f]).join(' / ')||'\u539f\u6587\u5df2\u5b9a\u4f4d')+(item.decision?' \u00b7 '+(item.decision.action==='adopt'?'\u5df2\u91c7\u7eb3':'\u5df2\u6392\u9664'):''):statuses[item.status]),el('strong',view==='facts'?item.subject+' \u00b7 '+item.attribute:item.requirement.text),el('span',view==='facts'?item.effectiveValue||item.value:item.factIds.length+' \u6761\u5173\u8054\u4e8b\u5b9e'));row.onclick=()=>{if(edited){say('\u8bf7\u5148\u4fdd\u5b58\u5f53\u524d\u5904\u7406\u8bf4\u660e');return;}selected=id;detailKey='';render();};list.append(row);}
    }
    const item=view==='facts'?facts.find(f=>f.id===selected):rows.find(r=>r.requirement.id===selected),dkey=JSON.stringify([view,item,busy,historical,session.complete,session.match.job?.state]);
    if(dkey===detailKey||edited)return;detailKey=dkey;detail.replaceChildren();if(!item){detail.append(el('p','\u9009\u62e9\u5de6\u4fa7\u4e00\u9879\uff0c\u67e5\u770b\u539f\u6587\u548c\u667a\u80fd\u4f53\u8bf4\u660e','evidence-empty'));return;}
    if(view==='matches'){
      detail.append(el('p',historical?'\u5386\u53f2\u63a8\u8350':statuses[item.status],'eyebrow'),el('h3',item.requirement.text),el('blockquote',item.requirement.quote),el('p',item.requirement.location,'muted'));
      for(const reason of item.reasons)detail.append(el('p',reason));
      for(const id of item.factIds){const fact=facts.find(f=>f.id===id);if(!fact)continue;const b=el('button',fact.subject+' / '+fact.attribute+' \u00b7 '+fact.source.name,'evidence-reference');b.onclick=()=>{view='facts';selected=id;renderKey=detailKey='';render();};detail.append(b);}
      detail.append(el('p','\u6a21\u578b\u63a8\u8350\u4ec5\u8bf4\u660e\u53ef\u80fd\u76f8\u5173\u3002\u6709\u6548\u6027\u3001\u9002\u7528\u8303\u56f4\u548c\u6295\u6807\u8d44\u683c\u4ecd\u9700\u6838\u5bf9\u3002','muted'));return;
    }
    const f=item;detail.append(el('p',location(f),'eyebrow'),el('h3',f.subject+' \u00b7 '+f.attribute),el('p',f.effectiveValue||f.value,'evidence-value'),el('h4','\u4f9d\u636e\u539f\u6587'),el('blockquote',f.quote));
    if(f.validUntil)detail.append(el('p','\u6709\u6548\u671f\u81f3 '+f.validUntil+(f.dateQuote?'\uff1a'+f.dateQuote:'')));
    if(f.flags.length)detail.append(el('p',f.flags.map(v=>flags[v]).join(' / '),'evidence-warning'));if(f.uncertainty)detail.append(el('p',f.uncertainty));
    const source=el('button','\u67e5\u770b\u5b8c\u6574\u539f\u6587\u5757'),sourceArea=el('div',null,'evidence-source');sourceArea.hidden=true;source.onclick=async()=>{try{const unit=checked(await bridge.request('GET','/readings/'+f.source.readingId+'/units/'+f.segment.unit));sourceArea.replaceChildren(el('pre',unit.text));for(const table of unit.tables||[])sourceArea.append(el('pre',table.rows.map(r=>r.map(c=>c??'\u5408\u5e76\u4f4d\u7f6e').join(' | ')).join('\n')));sourceArea.hidden=false;}catch(e){say(e.message);}};detail.append(source,sourceArea);
    const note=el('textarea'),value=el('input'),adjust=el('details'),adjustTitle=el('summary','\u4eba\u5de5\u8865\u5145\u6216\u4fee\u8ba2\u8868\u8ff0');note.maxLength=1600;note.placeholder='\u5904\u7406\u8bf4\u660e\uff1a\u5f02\u5e38\u6216\u4fee\u8ba2\u5fc5\u586b\uff0c\u539f\u6587\u4fdd\u6301\u4e0d\u53d8';note.setAttribute('aria-label','\u4e8b\u5b9e\u5904\u7406\u8bf4\u660e');note.value=noteDrafts[f.id]?.note??f.decision?.note??'';value.maxLength=1500;value.setAttribute('aria-label','\u4eba\u5de5\u4fee\u8ba2\u8868\u8ff0');value.value=noteDrafts[f.id]?.value??f.decision?.value??'';value.placeholder='\u53ef\u9009\uff1a\u4eba\u5de5\u8865\u5145\u503c\uff0c\u4e0e\u539f\u6587\u4e8b\u5b9e\u5206\u5f00\u8bb0\u5f55';adjust.append(adjustTitle,value);note.oninput=value.oninput=()=>{edited=true;noteDrafts[f.id]={note:note.value,value:value.value};saver.change();};
    const buttons=el('div',null,'evidence-decisions');for(const [action,label]of [['adopt','\u91c7\u7eb3\u5e76\u4fdd\u5b58'],['exclude','\u6392\u9664\u5e76\u8bb0\u5f55']]){const b=el('button',label,action==='adopt'?'primary':'');b.disabled=busy||!session.complete||historical||running(session.match);b.onclick=()=>void act(()=>session.decide([f.id],{action,note:note.value,value:value.value}));buttons.append(b);}detail.append(el('h4','\u6295\u6807\u65b9\u5904\u7406'),note,adjust,buttons);
    if(f.decision){const history=el('details'),summary=el('summary','\u5df2\u4fdd\u5b58\u8bb0\u5f55\uff08'+(f.decision.history.length+1)+'\uff09');history.append(summary);for(const record of [f.decision,...f.decision.history].reverse())history.append(el('p',new Date(record.at).toLocaleString()+' \u00b7 '+(record.action==='adopt'?'\u91c7\u7eb3':'\u6392\u9664')+' / '+record.note+(record.value?' / '+record.value:'')));detail.append(history);}
  }
  entry.onclick=()=>void act(async()=>{await loadNotes();visible=true;backdrop.hidden=false;await refresh();});
  window.addEventListener('bid.evidence.open',()=>entry.click());
  close.onclick=()=>{void saver.flush().then(()=>{visible=false;backdrop.hidden=true;clearTimeout(timer);}).catch(e=>say(e.message));};
  const switchView=next=>{if(edited){say('\u8bf7\u5148\u4fdd\u5b58\u5f53\u524d\u5904\u7406\u8bf4\u660e');return;}view=next;selected=null;renderKey=detailKey='';render();};factTab.onclick=()=>switchView('facts');matchTab.onclick=()=>switchView('matches');filter.onchange=search.oninput=()=>{renderKey='';render();};
  adoptAll.onclick=()=>void act(()=>session.decide(session.facts.filter(f=>!f.flags.length&&!f.decision).map(f=>f.id),{action:'adopt'}));
  window.addEventListener('pagehide',()=>{stopped=true;clearTimeout(timer);void saver.flush().catch(()=>{});});document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTimeout(timer);else if(visible)void refresh().catch(e=>say(e.message));});
  window.addEventListener('beforeunload',e=>{if(edited){e.preventDefault();e.returnValue='';}});
  return {session,refresh,panel,entry};
}
