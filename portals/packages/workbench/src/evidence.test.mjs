/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Tests
 * @author AI-Generated
 * @date 2026-11-25
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractionPlan,extractContext,parseFacts,factFlags,matchingPlan,matchContext,parseMatches,mergeMatches,EvidenceSession} from './evidence.mjs';
import {Requirements} from './requirements.mjs';

export const source={id:'synthetic-resource',version:1,hash:'a'.repeat(64),fileId:'file-one',readingId:'read-one',name:'SYNTHETIC-enterprise.md',category:'qualification'};
export const sourceText='SYNTHETIC Pine holds grade A. Valid until 2031-12-31. Product Sample has capacity 8 units.';
const unit={index:0,text:sourceText,location:{page:2},flags:[],tables:[]};
const units=new Map([[source.readingId,[unit]]]);
const fact=(input,patch={})=>({kind:'qualification',subject:'SYNTHETIC Pine',attribute:'certificate grade',value:'grade A',segmentId:input.segments[0].id,quote:'SYNTHETIC Pine holds grade A.',validity:'dated',validUntil:'2031-12-31',dateQuote:'Valid until 2031-12-31.',uncertainty:'',...patch});
export const factReply=input=>({...input,processedSegmentIds:input.segments.map(s=>s.id),facts:[fact(input),fact(input,{kind:'product',subject:'Product Sample',attribute:'capacity',value:'8 units',quote:'Product Sample has capacity 8 units.',validity:'not_applicable',validUntil:null,dateQuote:''})]});
export function rig(){
  const docs=new Map(),jobs=new Map();let selection={revision:1,items:[structuredClone(source)]},lose=false,posts=0;
  const bridge={request:async(method,path,body)=>{
    if(path==='/library-selection')return {ok:true,body:structuredClone(selection)};
    if(path==='/readings/'+source.readingId)return {ok:true,body:{id:source.readingId,fileId:source.fileId,hash:source.hash,units:1,state:'completed'}};
    if(path.includes('/units/'))return {ok:true,body:structuredClone(unit)};
    if(path==='/jobs'&&method==='POST'){posts++;if(!jobs.has(body.id))jobs.set(body.id,{...structuredClone(body),state:'running',steps:body.steps.map(s=>({...s,state:'pending'}))});if(lose){lose=false;throw Error('Lost response');}return {ok:true,body:structuredClone(jobs.get(body.id))};}
    if(path.startsWith('/jobs/')){const job=jobs.get(path.split('/')[2]);if(method==='POST'&&path.endsWith('/control')){job.state='running';}return job?{ok:true,body:structuredClone(job)}:{ok:false,status:404};}
    const id=path.split('/').at(-1),old=docs.get(id);if(method==='GET')return old?{ok:true,body:structuredClone(old)}:{ok:false,status:404};
    if((old?.revision||0)!==body.revision)return {ok:false,status:409,error:{message:'Storage conflict'}};
    const d={id,markdown:body.markdown,revision:body.revision+1};docs.set(id,d);return {ok:true,body:structuredClone(d)};
  }};
  const finish=(job,patch)=>{for(const step of job.steps){if(step.state==='done')continue;const input=JSON.parse(step.context.markdown),value=step.taskId==='extract_enterprise_facts'?factReply(input):{...input,recommendations:input.requirements.map((r,index)=>({requirementId:r.id,status:index===1?'missing':'potential',factIds:index===1?[]:[input.facts[0].id],reason:index===1?'No case proof found in this partition.':'Grade A is directly relevant; eligibility is not certified.'}))};step.state='done';step.resultDocument='result-'+job.id+'-'+step.id;docs.set(step.resultDocument,{revision:1,markdown:JSON.stringify({verified:true,content:{requirement_analysis:JSON.stringify(patch?patch(value):value)}})});}job.state='completed';};
  return {bridge,docs,jobs,finish,lose(){lose=true;},get posts(){return posts;},selection(value){selection=value;}};
}
const requirements=[{id:'r1',category:'commercial',text:'Require grade A qualification',quote:'Require grade A qualification',location:'Section 1'},{id:'r2',category:'technical',text:'Provide a past project case',quote:'Provide a past project case',location:'Section 2'}];
export async function prepared(r){const m=new Requirements(r.bridge);await m.load();for(const requirement of requirements)m.add(requirement);await m.save();const s=new EvidenceSession(r.bridge);await s.startExtraction();r.finish(r.jobs.get(s.extract.job.id));await s.load();return s;}

test('enterprise batches retain all exact text, table cells, offsets and immutable resource versions',async()=>{
  const large={...unit,text:'\u4f01\u4e1a\u8d44\u6599\ud83d\ude00'.repeat(5000),tables:[{rows:[['grade A',null,'2031-12-31']]}]};
  const plan=await extractionPlan([source],new Map([[source.readingId,[large]]]),{budget:18000});assert.ok(plan.batches.length>2);
  const segments=plan.batches.flatMap(b=>b.segments),parts=segments.filter(s=>s.kind==='text');assert.equal(parts.map(p=>p.text).join(''),large.text);assert.deepEqual(segments.find(s=>s.kind==='table-row').cells,large.tables[0].rows[0]);
  for(const b of plan.batches)assert.ok(Buffer.byteLength(JSON.stringify(extractContext(plan,b)))<=18000);assert.equal(plan.sources[0].version,1);
  await assert.rejects(extractionPlan([],new Map()));await assert.rejects(extractionPlan([source],new Map([[source.readingId,[]]])));
});
test('fact validation rejects foreign envelopes, omitted sources, forged quotes and unsupported expiry dates',async()=>{
  const p=await extractionPlan([source],units),input=extractContext(p,p.batches[0]),v=factReply(input);assert.equal(parseFacts(JSON.stringify(v),input).length,2);
  for(const key of ['runId','inputDigest','batchId'])assert.throws(()=>parseFacts(JSON.stringify({...v,[key]:'foreign'}),input));
  for(const patch of [{quote:'grade B'},{segmentId:'foreign'},{validUntil:'2032-12-31'},{validUntil:'2031-02-31'},{validity:'not_applicable',validUntil:null,dateQuote:''}])assert.throws(()=>parseFacts(JSON.stringify({...v,facts:[{...v.facts[0],...patch}]}),input));
  assert.throws(()=>parseFacts(JSON.stringify({...v,processedSegmentIds:[]}),input));assert.throws(()=>parseFacts(JSON.stringify({...v,facts:Array(40).fill(v.facts[0])}),input));
  assert.equal(parseFacts(JSON.stringify({...v,facts:[]}),input).length,0);
});
test('expired, undated and conflicting facts stay distinct even with matching names',async()=>{
  const p=await extractionPlan([source],units),input=extractContext(p,p.batches[0]),f=parseFacts(JSON.stringify(factReply(input)),input)[0];
  const rows=factFlags([{...f,id:'expired',validUntil:'2020-01-01'},{...f,id:'unknown',validity:'unknown',validUntil:null,value:'grade B'},{...f,id:'person',subject:'Another person',attribute:'role',value:'engineer'}],'2026-11-20');
  assert.deepEqual(rows[0].flags,['expired','conflict']);assert.deepEqual(rows[1].flags,['undated','conflict']);assert.deepEqual(rows[2].flags,[]);
});
test('bounded matching crosses all fact partitions and never reports missing while any partition is pending',async()=>{
  const p=await extractionPlan([source],units),input=extractContext(p,p.batches[0]),f=parseFacts(JSON.stringify(factReply(input)),input)[0],facts=Array.from({length:77},(_,i)=>({...f,id:'fact-'+i,value:'value '+i}));
  const plan=await matchingPlan(requirements,facts,{extraction:'x',decisions:0,requirements:1});assert.equal(plan.batches.length,3);for(const b of plan.batches)assert.ok(Buffer.byteLength(JSON.stringify(matchContext(plan,b)))<=26000);
  const results=plan.batches.map(b=>({batchId:b.id,items:b.requirements.map(r=>({requirementId:r.id,status:'missing',factIds:[],reason:'Not in partition'}))}));
  assert.ok(mergeMatches(plan,results.slice(1),facts).every(r=>r.status==='pending'));assert.ok(mergeMatches(plan,results,facts).every(r=>r.status==='missing'));
  results[2].items[0]={requirementId:'r1',status:'potential',factIds:[facts[76].id],reason:'Relevant final partition'};assert.equal(mergeMatches(plan,results,facts)[0].status,'review');facts[76].decision={action:'adopt'};assert.equal(mergeMatches(plan,results,facts)[0].status,'available');facts[76].flags=['expired'];assert.equal(mergeMatches(plan,results,facts)[0].status,'review');
});
test('match results require every requirement once and cannot cite foreign evidence or fabricate a missing result',async()=>{
  const p=await extractionPlan([source],units),i=extractContext(p,p.batches[0]),facts=parseFacts(JSON.stringify(factReply(i)),i),plan=await matchingPlan(requirements,facts,{}),input=matchContext(plan,plan.batches[0]),value={...input,recommendations:requirements.map(r=>({requirementId:r.id,status:'potential',factIds:[facts[0].id],reason:'Relevant evidence'}))};
  assert.equal(parseMatches(JSON.stringify(value),input).length,2);
  for(const recommendations of [value.recommendations.slice(1),[value.recommendations[0],value.recommendations[0]],value.recommendations.map(r=>({...r,factIds:['foreign']})),value.recommendations.map(r=>({...r,status:'missing'}))])assert.throws(()=>parseMatches(JSON.stringify({...value,recommendations}),input));
});
test('requirements for proposed methods can need no existing enterprise proof without becoming false gaps',async()=>{
  const plan=await matchingPlan(requirements,[],{}),input=matchContext(plan,plan.batches[0]),value={...input,recommendations:requirements.map(r=>({requirementId:r.id,status:'not_required',factIds:[],reason:'This clause concerns a proposed method, not existing certification.'}))};
  const items=parseMatches(JSON.stringify(value),input);assert.ok(mergeMatches(plan,[{batchId:input.batchId,items}],[]).every(r=>r.status==='not_required'));
});
test('lost admission, page departure and reopening reuse durable jobs and keep adopted facts separate from tender requirements',async()=>{
  const r=rig();r.lose();const first=new EvidenceSession(r.bridge);await assert.rejects(first.startExtraction(),/Lost response/);const posts=r.posts,id=first.extract.value.spec.id;r.finish(r.jobs.get(id));
  const reopened=await new EvidenceSession(r.bridge).load();assert.equal(r.posts,posts);assert.equal(reopened.facts.length,2);assert.equal(reopened.complete,true);await reopened.decide(reopened.facts.map(f=>f.id),{action:'adopt'});assert.equal(r.docs.has('bid_requirements'),false);
  await reopened.startExtraction();assert.equal(r.posts,posts);const again=await new EvidenceSession(r.bridge).load();assert.ok(again.facts.every(f=>f.decision.action==='adopt'));
});
test('decisions retain operator corrections, require exception notes, preserve flags and invalidate previous matching',async()=>{
  const r=rig(),s=await prepared(r),matrix=r.docs.get('bid_requirements').markdown;await s.startMatching();r.finish(r.jobs.get(s.match.job.id));await s.load();assert.equal(s.recommendations[0].status,'review');
  await assert.rejects(s.decide([s.facts[0].id],{action:'adopt',value:'operator supplement'}));await s.decide([s.facts[0].id],{action:'adopt',value:'operator supplement',note:'Operator records a separate unverified value.'});assert.equal(s.facts[0].value,'grade A');assert.equal(s.facts[0].effectiveValue,'operator supplement');assert.ok(s.facts[0].flags.includes('operator-supplement'));assert.equal(s.matchStale,true);
  await s.decide([s.facts[0].id],{action:'exclude',note:'Not used for this bid.'});assert.equal(s.decisions[s.facts[0].id].history.length,1);assert.equal(r.docs.get('bid_requirements').markdown,matrix);
});
test('selection version changes and requirement edits keep historical results and refuse stale fact adoption',async()=>{
  const r=rig(),s=await prepared(r);await s.startMatching();const job=r.jobs.get(s.match.job.id);r.finish(job);await s.load();const retained=JSON.stringify(s.facts);r.selection({revision:2,items:[{...source,version:2}]});await s.load();assert.equal(s.extractStale,true);assert.equal(s.matchStale,true);assert.equal(JSON.stringify(s.facts),retained);await assert.rejects(s.decide([s.facts[0].id],{action:'adopt'}));
  r.selection({revision:1,items:[source]});const m=new Requirements(r.bridge);await m.load();m.edit('r1',{text:'Changed grade threshold'});await m.save();await s.load();assert.equal(s.matchStale,true);assert.equal(s.match.job.id,job.id);
});
test('unverified or malformed model output is saved for inspection but never becomes an adoptable fact',async()=>{
  const r=rig(),s=new EvidenceSession(r.bridge);await s.startExtraction();r.finish(r.jobs.get(s.extract.job.id),v=>({...v,facts:[{...v.facts[0],quote:'fabricated source'}]}));await s.load();assert.equal(s.facts.length,0);assert.equal(s.errors.length,1);assert.equal(s.complete,false);await assert.rejects(s.decide(['foreign'],{action:'adopt'}));
});
