/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Business
 * @author AI-Generated
 * @date 2026-11-25
 */
import {DocumentError} from './errors.mjs';
const encoder=new TextEncoder(),bytes=s=>encoder.encode(s).byteLength;
const limit=1048576;
const checked=r=>{if(!r.ok)throw new DocumentError(r);return r.body;};
/** Split on Unicode code points and bound encoded JSON, retaining exact offsets. */
function chunks(text,maxBytes=6000){
 const out=[];let start=0,part='',size=2,offset=0;
 for(const ch of text){const n=bytes(JSON.stringify(ch))-2;if(size+n>maxBytes&&part){out.push({text:part,start,end:offset});start=offset;part='';size=2;}part+=ch;size+=n;offset+=ch.length;}
 if(part||!out.length)out.push({text:part,start,end:offset});return out;
}
export function batchContext(plan,batch){return {runId:plan.runId,readingId:plan.readingId,sourceHash:plan.sourceHash,batchId:batch.id,segments:batch.segments};}
/** Exact source text, row grids, null anchors and extraction flags are never omitted. */
export function buildTenderBatches(units,reading,{runId=crypto.randomUUID(),batchBytes=24000}={}){
 if(reading.state!=='completed'||!units.length||units.length!==reading.units||units.some((u,i)=>u.index!==i))throw Error('\u539f\u6587\u5feb\u7167\u4e0d\u5b8c\u6574\uff0c\u4e0d\u80fd\u5f00\u59cb\u89e3\u8bfb');
 if(!Number.isSafeInteger(batchBytes)||batchBytes<8000||batchBytes>100000)throw Error('Invalid batch budget');
 const segments=[];
 for(const u of units){
  const base={unit:u.index,location:u.location,flags:u.flags||[]};
  chunks(u.text||'').forEach((p,i)=>segments.push({...base,id:'u'+u.index+'-text-'+i,kind:'text',...p}));
  (u.tables||[]).forEach((t,ti)=>t.rows.forEach((row,ri)=>{
   const ref={...base,table:ti,row:ri,bbox:t.bbox};
   if(bytes(JSON.stringify(row))<6000)segments.push({...ref,id:'u'+u.index+'-t'+ti+'-r'+ri,kind:'table-row',cells:row});
   else row.forEach((cell,ci)=>chunks(cell===null?'':cell).forEach((p,pi)=>segments.push({...ref,id:'u'+u.index+'-t'+ti+'-r'+ri+'-c'+ci+'-'+pi,kind:'table-cell',column:ci,merged:cell===null,...p})));
  }));
 }
 const plan={schema:1,runId,readingId:reading.id,sourceHash:reading.hash,fileId:reading.fileId,name:reading.name,unitCount:units.length,batches:[]};
 let current={id:'batch-1',segments:[]};
 for(const s of segments){let next={...current,segments:[...current.segments,s]};if(bytes(JSON.stringify(batchContext(plan,next)))>batchBytes&&current.segments.length){plan.batches.push(current);current={id:'batch-'+(plan.batches.length+1),segments:[]};next={...current,segments:[s]};}
  if(bytes(JSON.stringify(batchContext(plan,next)))>batchBytes)throw Error('\u539f\u6587\u5757\u8d85\u51fa\u4e0a\u4e0b\u6587\u9884\u7b97\uff0c\u672a\u622a\u65ad\u8d44\u6599');current=next;
 }
 if(current.segments.length)plan.batches.push(current);
 if(plan.batches.length>80||bytes(JSON.stringify(plan))>limit)throw Error('\u8d44\u6599\u8d85\u51fa\u672c\u6279\u5904\u7406\u4e0a\u9650\uff0c\u672a\u622a\u65ad\u8d44\u6599');
 return plan;
}
export function parseBatchResult(text,expected){
 if(typeof text!=='string'||bytes(text)>1000000)throw Error('\u6279\u6b21\u7ed3\u679c\u683c\u5f0f\u65e0\u6548');
 const value=JSON.parse(text.trim().replace(/^\x60{3}(?:json)?\s*/,'').replace(/\s*\x60{3}$/,''));
 for(const k of ['runId','readingId','sourceHash','batchId'])if(value?.[k]!==expected[k])throw Error('\u6279\u6b21\u7ed3\u679c\u4e0e\u539f\u6587\u7248\u672c\u4e0d\u4e00\u81f4');
 const ids=expected.segments.map(s=>s.id),got=value.processedSegmentIds;
 if(!Array.isArray(got)||got.length!==ids.length||new Set(got).size!==ids.length||got.some(id=>!ids.includes(id)))throw Error('\u6279\u6b21\u7ed3\u679c\u672a\u8986\u76d6\u5168\u90e8\u539f\u6587\u5757');
 if(!Array.isArray(value.requirements)||value.requirements.length>80||!Array.isArray(value.issues)||value.issues.length>300)throw Error('\u6279\u6b21\u9700\u6c42\u7ed3\u679c\u683c\u5f0f\u65e0\u6548');
 const requirements=value.requirements.map(r=>{
  if(!r||!['commercial','technical'].includes(r.category)||!ids.includes(r.segmentId)||['text','quote'].some(k=>typeof r[k]!=='string'||!r[k].trim()||r[k].length>4000))throw Error('\u6279\u6b21\u9700\u6c42\u7f3a\u5c11\u6709\u6548\u6765\u6e90\u6216\u5f15\u6587');
  const segment=expected.segments.find(s=>s.id===r.segmentId);
  return {category:r.category,text:r.text.trim(),quote:r.quote,segmentId:r.segmentId,unit:segment.unit,location:segment.location};
 });
 const issues=value.issues.map(r=>{if(!r||!ids.includes(r.segmentId)||typeof r.detail!=='string'||!r.detail.trim()||r.detail.length>4000)throw Error('\u6279\u6b21\u5f02\u5e38\u7f3a\u5c11\u6709\u6548\u6765\u6e90');return {segmentId:r.segmentId,detail:r.detail};});
 if(requirements.length===80)issues.push({segmentId:ids[0],detail:'\u672c\u6279\u5019\u9009\u5df2\u8fbe\u6570\u91cf\u4e0a\u9650\uff0c\u9700\u8fdb\u4e00\u6b65\u62c6\u7ec6\u6838\u5bf9\uff0c\u4e0d\u80fd\u636e\u6b64\u786e\u8ba4\u9700\u6c42\u5b8c\u6574\u3002'});
 return {requirements,issues};
}
export class BatchAnalysisSession{
 constructor(bridge){this.bridge=bridge;this.plan=null;this.job=null;this.jobs=[];this.cache=new Map();}
 async request(method,path,body){return checked(await this.bridge.request(method,path,body));}
 async load(readingId){
  const pending=await this.bridge.request('GET','/documents/bid_analysis_pending');
  if(!pending.ok&&pending.status!==404)throw new DocumentError(pending);
  if(pending.ok){const pointer=JSON.parse(pending.body.markdown);const known=await this.bridge.request('GET','/jobs/'+pointer.id);if(!known.ok&&known.status===404)await this.recover(pointer.id);else if(!known.ok)throw new DocumentError(known);}
  const items=(await this.request('GET','/jobs')).items;
  this.jobs=items.filter(j=>j.steps.every(s=>s.taskId==='analyze_tender_batch')&&j.sources.some(s=>s.id.startsWith('bid_analysis_manifest_'))).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
  const job=[...this.jobs].reverse().find(j=>!readingId||JSON.parse(j.steps[0].context.markdown).readingId===readingId);
  if(!job){this.plan=null;this.job=null;return;}
  this.job=job;
  const source=job.sources.find(s=>s.id.startsWith('bid_analysis_manifest_'));
  const doc=await this.request('GET','/documents/'+source.id);
  if(doc.revision!==source.revision)throw Error('\u6279\u6b21\u8f93\u5165\u6e05\u5355\u7248\u672c\u5df2\u53d8\u5316');
  this.plan=JSON.parse(doc.markdown);
 }
 async start(reading,units){
  const plan=buildTenderBatches(units,reading),id='bid_analysis_manifest_'+plan.runId;
  const doc=await this.request('PUT','/documents/'+id,{markdown:JSON.stringify(plan),revision:0});
  this.plan=plan;
  return this.submit(plan.batches,[{id,revision:doc.revision}],plan.runId);
 }
 async submit(batches,sources,id=crypto.randomUUID()){
  const spec={id,label:('\u62db\u6807\u5206\u6279\u89e3\u8bfb \u00b7 '+this.plan.name).slice(0,120),sources,steps:batches.map(b=>({id:b.id,taskId:'analyze_tender_batch',context:{id:'bid_tender_batch_context',markdown:JSON.stringify(batchContext(this.plan,b))}}))};
  if(bytes(JSON.stringify(spec))>limit)throw Error('\u4efb\u52a1\u8d85\u51fa\u4fdd\u5b58\u9884\u7b97\uff0c\u672a\u622a\u65ad\u8d44\u6599');
  const requestId='bid_analysis_submission_'+id;
  await this.request('PUT','/documents/'+requestId,{markdown:JSON.stringify(spec),revision:0});
  const pointer=await this.bridge.request('GET','/documents/bid_analysis_pending');
  if(!pointer.ok&&pointer.status!==404)throw new DocumentError(pointer);
  await this.request('PUT','/documents/bid_analysis_pending',{markdown:JSON.stringify({id}),revision:pointer.ok?pointer.body.revision:0});
  this.job=await this.request('POST','/jobs',spec);this.jobs.push(this.job);return this.job;
 }
 async recover(id){
  const doc=await this.request('GET','/documents/bid_analysis_submission_'+id);
  this.job=await this.request('POST','/jobs',JSON.parse(doc.markdown));return this.job;
 }
 async refresh(){if(this.job)this.job=await this.request('GET','/jobs/'+this.job.id);return this.job;}
 async control(action){if(this.job)this.job=await this.request('POST','/jobs/'+this.job.id+'/control',{action});return this.job;}
 async results(){
  const out=[];if(!this.plan)return out;
  const jobs=[...this.jobs.filter(j=>j.id!==this.job?.id),...(this.job?[this.job]:[])].filter(j=>JSON.parse(j.steps[0].context.markdown).runId===this.plan.runId);
  for(const job of jobs)for(const step of job.steps){
   if(step.state!=='done'||!step.resultDocument)continue;
   const batch=this.plan.batches.find(b=>b.id===step.id);if(!batch)throw Error('Unknown saved batch');
   const key=step.resultDocument;let result=this.cache.get(key);
   if(!result){const stored=JSON.parse((await this.request('GET','/documents/'+key)).markdown);
    try{if(!stored.verified)throw Error('\u4efb\u52a1\u7ed3\u679c\u5c1a\u672a\u5b8c\u6210');result={batchId:batch.id,...parseBatchResult(stored.content.requirement_analysis,batchContext(this.plan,batch)),step};}
    catch(e){result={batchId:batch.id,error:e.message,step};}this.cache.set(key,result);
   }
   const previous=out.findIndex(r=>r.batchId===batch.id);if(previous>=0)out[previous]=result;else out.push(result);
  }return out;
 }
 async retryInvalid(){const bad=(await this.results()).filter(r=>r.error).map(r=>this.plan.batches.find(b=>b.id===r.batchId));if(!bad.length)return;return this.submit(bad,this.job.sources);}
}
