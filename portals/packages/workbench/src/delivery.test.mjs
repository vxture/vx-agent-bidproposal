/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Tests
 * @author AI-Generated
 * @date 2026-11-25
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {assemble,DeliverySession} from './delivery.mjs';
import {Requirements} from './requirements.mjs';
import {PlanSession} from './plan.mjs';
import {DraftSession} from './draft.mjs';
test('assembly follows approved order, excludes unadopted content and preserves code and tables',()=>{
 const plan={approved:true,outline:[{id:'b',title:'Business'},{id:'a',title:'Technical'}]};const draft=[{id:'a',body:'# Subsection\n\n| A | B |\n|---|---|\n|1|2|\n\n```md\n# literal\n```'},{id:'b',body:'Adopted response'},{id:'extra',body:'Never exported'}];const result=assemble(plan,draft,'Bid');assert.ok(result.markdown.indexOf('# Business')<result.markdown.indexOf('# Technical'));assert.match(result.markdown,/## Subsection/);assert.match(result.markdown,/```md\n# literal\n```/);assert.match(result.markdown,/\|1\|2\|/);assert.doesNotMatch(result.markdown,/Never exported/);assert.throws(()=>assemble(plan,draft.slice(0,1),'Bid'));assert.throws(()=>assemble({...plan,approved:false},draft,'Bid'));
});
test('lost render response reopens exact pinned request and source changes mark old delivery stale',async()=>{
 const docs=new Map(),jobs=new Map();let posts=0,lose=true;
 const bridge={request:async(method,path,body)=>{
  if(path==='/project')return{ok:true,body:{name:'Synthetic bid'}};
  if(path==='/files')return{ok:true,body:{items:[]}};
  if(path==='/renders'){if(method==='GET')return {ok:true,body:{items:[...jobs.values()]}};posts++;const job={...body,state:'running',createdAt:new Date().toISOString(),formats:['md']};jobs.set(body.id,job);if(lose){lose=false;throw Error('lost response');}return{ok:true,body:job};}
  const old=docs.get(path);if(method==='GET')return old?{ok:true,body:structuredClone(old)}:{ok:false,status:404};if((old?.revision||0)!==body.revision)return{ok:false,status:409};const next={id:path.split('/').pop(),markdown:body.markdown,revision:body.revision+1};docs.set(path,next);return{ok:true,body:structuredClone(next)};
 }};
 const matrix=new Requirements(bridge);matrix.add({text:'Daily backup',quote:'Backup daily',location:'Section 1'});matrix.confirm();await matrix.save();const plan=new PlanSession(bridge);plan.build(matrix);plan.approve(matrix);await plan.save();const draft=new DraftSession(bridge);draft.chapters=[{id:plan.value.outline[0].id,title:'Saved chapter',body:'Daily backup response'}];await draft.save();
 const first=new DeliverySession(bridge);await first.load();first.settings.fields.documentNumber='SYNTH-001';await assert.rejects(first.create(),/lost/);const canonical=docs.get('/documents/bid_draft').markdown;const reopened=new DeliverySession(bridge);await reopened.load();assert.equal(posts,1);assert.equal(reopened.job.state,'running');assert.equal(reopened.stale,false);assert.equal(reopened.manifest.chapters.length,1);assert.equal(docs.get('/documents/'+reopened.job.source.id).revision,1);assert.match(docs.get('/documents/'+reopened.job.source.id).markdown,/Daily backup response/);assert.equal(docs.get('/documents/bid_draft').markdown,canonical);assert.deepEqual(reopened.manifest.fields,reopened.job.fields);assert.equal(reopened.settings.fields.documentNumber,'SYNTH-001');assert.equal(reopened.settingsChanged,false);reopened.settings.fields.documentNumber='SYNTH-002';assert.equal(reopened.settingsChanged,true);assert.equal(reopened.job.fields.documentNumber,'SYNTH-001');
 draft.chapters[0].body='New adopted text';await draft.save();await reopened.sources();assert.equal(reopened.stale,true);assert.match(docs.get('/documents/'+reopened.job.source.id).markdown,/Daily backup response/);await assert.rejects(reopened.create(),/\u6392\u7248/);
});
test('delivery distinguishes completed jobs from valid audit reports and warns of unresolved findings',async()=>{
 const docs=new Map(),jobs=new Map(),bridge={request:async(method,path,body)=>{if(path.startsWith('/jobs/'))return jobs.has(path.slice(6))?{ok:true,body:structuredClone(jobs.get(path.slice(6)))}:{ok:false,status:404};if(path==='/jobs'&&method==='POST'){const job={...structuredClone(body),state:'running'};jobs.set(body.id,job);return {ok:true,body:job};}const old=docs.get(path);if(method==='GET')return old?{ok:true,body:structuredClone(old)}:{ok:false,status:404};if((old?.revision||0)!==body.revision)return {ok:false,status:409};const doc={markdown:body.markdown,revision:body.revision+1};docs.set(path,doc);return {ok:true,body:doc};}};
 const matrix=new Requirements(bridge);matrix.add({text:'Daily backup',quote:'Backup daily',location:'Synthetic source'});matrix.confirm();await matrix.save();const plan=new PlanSession(bridge);plan.build(matrix);plan.approve(matrix);await plan.save();const draft=new DraftSession(bridge);draft.chapters=[{id:plan.value.outline[0].id,title:'Backup',body:'Daily backup response'}];await draft.save();const {ReviewSession}=await import('./review.mjs'),audit=new ReviewSession(bridge);await audit.start();const job=jobs.get(audit.request.job.id),step=job.steps[0],c=JSON.parse(step.context.markdown);step.state='done';step.resultDocument='synthetic-result';job.state='completed';const result={verified:false,content:{proposal_review:JSON.stringify({...c,evidenceDigest:c.enterpriseAudit.digest,summary:'Check evidence',coverage:c.requirements.map(r=>({requirementId:r.id,status:'partial',quote:''})),findings:[{severity:'warning',category:'evidence_missing',title:'Missing proof',detail:'Proof is missing.',quote:'Daily backup response',requirementIds:[],evidenceIds:[],relatedChapterIds:[],suggestion:'Attach original proof.'}]})}};const save=()=>docs.set('/documents/synthetic-result',{revision:1,markdown:JSON.stringify(result)});save();const delivery=new DeliverySession(bridge);await delivery.sources();assert.ok(delivery.warnings.some(w=>w.includes('\u672a\u901a\u8fc7')));result.verified=true;save();await delivery.sources();assert.ok(!delivery.warnings.some(w=>w.includes('\u672a\u901a\u8fc7')));assert.ok(delivery.warnings.some(w=>w.includes('\u5ba1\u6838\u5efa\u8bae')));assert.equal(docs.get('/documents/bid_draft').revision,1);
});
