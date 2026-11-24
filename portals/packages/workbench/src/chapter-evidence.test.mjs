/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Tests
 * @author AI-Generated
 * @date 2026-11-25
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {chapterEvidence,saveChapterEvidence,readChapterEvidence,loadChapterEvidence} from './chapter-evidence.mjs';
import {WritingSession,parseChapter} from './writing.mjs';
import {PlanSession} from './plan.mjs';
import {Requirements} from './requirements.mjs';

const fact=(id,requirement='r1',patch={})=>({id,kind:'qualification',subject:'SYNTHETIC Pine',attribute:'grade',value:'A',quote:'SYNTHETIC Pine holds grade A.',validity:'dated',validUntil:'2031-12-31',dateQuote:'2031-12-31',source:{id:'synthetic',version:1,hash:'a'.repeat(64),fileId:'file',readingId:'reading',name:'SYNTHETIC.md',category:'qualification'},segment:{unit:0,location:{page:2},flags:[]},flags:[],decision:{action:'adopt',note:'',value:'',at:'2026-11-20'},requirement,...patch});
const task={requirementIds:['r1'],requirements:[{id:'r1',text:'Require grade A'}]};
const state=(facts,status='available')=>({state:'ready',facts,recommendations:[{requirement:{id:'r1'},factIds:facts.filter(f=>f.requirement==='r1').map(f=>f.id),status,reasons:['A grade is relevant; check scope.']}]});
function storage(){const docs=new Map();return {docs,bridge:{request:async(method,path,body)=>{const old=docs.get(path);if(method==='GET')return old?{ok:true,body:structuredClone(old)}:{ok:false,status:404};if((old?.revision||0)!==body.revision)return {ok:false,status:409};const doc={revision:body.revision+1,markdown:body.markdown};docs.set(path,doc);return {ok:true,body:structuredClone(doc)};}}};}
test('chapter evidence contains only linked adopted facts; unsafe, excluded and unrelated facts cannot become proven capability',async()=>{
 const facts=[fact('valid'),fact('unrelated','r2'),fact('pending','r1',{decision:null}),fact('excluded','r1',{decision:{action:'exclude'}}),fact('expired','r1',{flags:['expired']}),fact('supplement','r1',{decision:{action:'adopt',note:'Operator adds unsupported value',value:'B'},flags:['operator-supplement']})];
 const snapshot=await chapterEvidence(state(facts),task);assert.deepEqual(snapshot.facts.map(f=>f.id),['valid']);assert.deepEqual(snapshot.cautions.map(f=>f.id),['expired','supplement']);assert.equal(snapshot.facts[0].source.version,1);assert.equal(snapshot.facts[0].location.page,2);
 const changed=await chapterEvidence({...state(facts),state:'changed',recommendations:[]},task);assert.equal(changed.facts.length,0);assert.equal(changed.requirements[0].status,'gap');
});
test('bounded evidence refuses oversized chapters rather than discarding facts or source quotes',async()=>{
 await assert.rejects(chapterEvidence(state([fact('big','r1',{quote:'x'.repeat(30000)})]),task),/\u672a\u622a\u65ad/);
 const noSource=await chapterEvidence({state:'not_prepared',facts:[],recommendations:[]},task);assert.equal(noSource.requirements[0].status,'gap');assert.equal(noSource.facts.length,0);
});
test('snapshot digests remain stable for unrelated facts and old snapshots cannot be replaced without detection',async()=>{
 const s=storage(),snapshot=await chapterEvidence(state([fact('one')]),task),same=await chapterEvidence(state([fact('one'),fact('other','r2')]),task);assert.equal(snapshot.digest,same.digest);
 const ref=await saveChapterEvidence(s.bridge,snapshot);assert.deepEqual(await readChapterEvidence(s.bridge,ref),snapshot);s.docs.get('/documents/'+ref.id).markdown=s.docs.get('/documents/'+ref.id).markdown.replace('grade A','grade B');await assert.rejects(readChapterEvidence(s.bridge,ref),/changed/);
});
test('chapter result citations bind exact input digest, allowed facts and verbatim output passages',async()=>{
 const snapshot=await chapterEvidence(state([fact('one'),fact('old','r1',{flags:['expired']})]),task),markdown='## Enterprise capability\n\nSYNTHETIC Pine holds grade A. We will provide the original certificate for verification.';
 const expected={requestId:'request',chapterId:'chapter',planRevision:1,requirementsRevision:1,requirementIds:['r1'],enterpriseEvidence:snapshot},good={...expected,markdown,summary:'summary',materialGaps:[],coveredRequirementIds:['r1'],evidenceDigest:snapshot.digest,usedEvidence:[{factId:'one',quote:'SYNTHETIC Pine holds grade A.'}]};
 assert.equal(parseChapter(JSON.stringify(good),expected).usedEvidence.length,1);
 for(const patch of [{evidenceDigest:'foreign'},{usedEvidence:[{factId:'old',quote:'SYNTHETIC Pine holds grade A.'}]},{usedEvidence:[{factId:'foreign',quote:'SYNTHETIC Pine holds grade A.'}]},{usedEvidence:[{factId:'one',quote:'SYNTHETIC Pine holds grade B.'}]},{usedEvidence:[good.usedEvidence[0],good.usedEvidence[0]]},{usedEvidence:null}])assert.throws(()=>parseChapter(JSON.stringify({...good,...patch}),expected));
});
async function writingRig(){
 const s=storage(),jobs=new Map();let posts=0;const bridge={request:async(method,path,body)=>{
  if(path==='/jobs'&&method==='POST'){posts++;jobs.set(body.id,{...structuredClone(body),state:'running',steps:body.steps.map(s=>({...s,state:'pending'}))});return {ok:true,body:structuredClone(jobs.get(body.id))};}
  if(path.startsWith('/jobs/')){const job=jobs.get(path.split('/')[2]);if(!job)return {ok:false,status:404};if(path.endsWith('/control')){job.paused=body.action!=='resume';if(body.action==='cancel')job.state='cancelled';}return {ok:true,body:structuredClone(job)};}
  return s.bridge.request(method,path,body);
 }};
 const matrix=new Requirements(bridge);matrix.add({id:'r1',text:'Grade A',quote:'Grade A',location:'Synthetic tender 1'});matrix.add({id:'r2',text:'Gateway capacity 128',quote:'Gateway capacity 128',location:'Synthetic tender 2'});matrix.confirm();await matrix.save();
 const plan=new PlanSession(bridge);await plan.load();plan.build(matrix);plan.add();plan.assign(plan.value.outline[0].id,'r2',false);plan.assign(plan.value.outline[1].id,'r2',true);plan.approve(matrix);await plan.save();
 let evidence=state([fact('one'),fact('two','r2',{kind:'product',attribute:'capacity',value:'256',quote:'Gateway capacity is 256.'})]);evidence.recommendations.push({requirement:{id:'r2'},factIds:['two'],status:'available',reasons:['Capacity exceeds requested 128.']});
 const run=new WritingSession(bridge);run.backgroundEnabled=true;const original=run.sources.bind(run);run.sources=async()=>{const tasks=await original();run.enterpriseState=evidence;return tasks;};
 const finish=job=>{for(const step of job.steps){if(step.state==='done')continue;const c=JSON.parse(step.context.markdown),f=c.enterpriseEvidence.facts[0],quote=f?.quote||'Enterprise material is required.',body='## Source-backed implementation\n\n'+quote+' We will verify the original source and record acceptance before implementation.';
  step.state='done';step.taskInstanceId='task-'+step.id;step.resultDocument='result-'+job.id+'-'+step.id;s.docs.set('/documents/'+step.resultDocument,{revision:1,markdown:JSON.stringify({verified:true,content:{proposal_generation:JSON.stringify({...c,markdown:body,summary:'Evidence-backed synthetic chapter',materialGaps:[],coveredRequirementIds:c.chapter.requirementIds,evidenceDigest:c.enterpriseEvidence.digest,usedEvidence:f?[{factId:f.id,quote}]:[]})}})});}job.state='completed';};
 return {...s,bridge,jobs,run,plan,matrix,finish,get posts(){return posts;},update(value){evidence=value;},get evidence(){return evidence;}};
}
test('background chapter jobs pin independent sources, survive page departure, and reopening does not regenerate',async()=>{
 const r=await writingRig();await r.run.start();await r.run.step();const job=r.jobs.get(r.run.value.jobId);assert.equal(job.steps.length,2);const contexts=job.steps.map(s=>JSON.parse(s.context.markdown));assert.deepEqual(contexts.map(c=>c.enterpriseEvidence.facts.map(f=>f.id)),[['one'],['two']]);
 r.finish(job);const count=r.posts;await r.run.step();assert.equal(r.run.complete,true);assert.equal(r.posts,count);assert.equal(r.run.value.items[0].usedEvidence[0].factId,'one');assert.equal(r.run.value.items[1].usedEvidence[0].factId,'two');
 const reopened=new WritingSession(r.bridge);await reopened.load();assert.equal(reopened.value.items[0].evidenceRef.digest,contexts[0].enterpriseEvidence.digest);assert.ok(await reopened.evidenceSnapshot(reopened.value.items[0].id));
});
test('new evidence single-chapter rewrite retains old body and source history and never changes the other chapter',async()=>{
 const r=await writingRig();await r.run.start();await r.run.step();r.finish(r.jobs.get(r.run.value.jobId));await r.run.step();const [first,second]=r.run.value.items,oldFirst=structuredClone(first),oldOther=r.run.draft.chapters.find(c=>c.id===second.id).body,otherRef=structuredClone(second.evidenceRef);
 const next=structuredClone(r.evidence);next.facts[0].value='A+';next.facts[0].quote='SYNTHETIC Pine now holds grade A+.';next.facts[0].source.version=2;r.update(next);
 await r.run.rewriteWithEvidence(first.id,'Use the newly supplied certificate');await r.run.step();const job=r.jobs.get(r.run.value.jobId);assert.equal(job.steps.length,1);r.finish(job);await r.run.step();assert.equal(first.state,'candidate');assert.match(r.run.draft.chapters[0].body,/holds grade A\./);
 await r.run.accept(first.id);assert.match(r.run.draft.chapters[0].body,/grade A\+/);assert.equal(r.run.draft.chapters[1].body,oldOther);assert.deepEqual(second.evidenceRef,otherRef);assert.equal(r.run.value.paused,true);
 const history=JSON.parse(r.docs.get('/documents/'+first.history[0]).markdown);assert.equal(history.evidenceRef.digest,oldFirst.evidenceRef.digest);assert.equal(history.usedEvidence[0].factId,'one');assert.match(history.body,/grade A\./);
});
test('evidence changes during generation preserve both candidate and old draft and forbid stale adoption',async()=>{
 const r=await writingRig();await r.run.start();await r.run.step();r.finish(r.jobs.get(r.run.value.jobId));await r.run.step();const first=r.run.value.items[0],before=r.docs.get('/documents/bid_draft').markdown;await r.run.rewriteWithEvidence(first.id);await r.run.step();r.finish(r.jobs.get(r.run.value.jobId));await r.run.step();
 const next=structuredClone(r.evidence);next.facts[0].decision={...next.facts[0].decision,note:'A new operator decision'};r.update(next);await assert.rejects(r.run.accept(first.id),/\u5df2\u66f4\u65b0/);assert.ok(first.candidate);assert.equal(r.docs.get('/documents/bid_draft').markdown,before);
});
test('invalid background citations become a retryable chapter error without deleting the saved model result',async()=>{
 const r=await writingRig();await r.run.start();await r.run.step();const job=r.jobs.get(r.run.value.jobId);r.finish(job);const key='/documents/'+job.steps[0].resultDocument,raw=JSON.parse(r.docs.get(key).markdown),value=JSON.parse(raw.content.proposal_generation);value.usedEvidence=[{factId:'foreign',quote:'Not in chapter'}];raw.content.proposal_generation=JSON.stringify(value);r.docs.get(key).markdown=JSON.stringify(raw);const saved=r.docs.get(key).markdown;await r.run.step();
 assert.equal(r.run.value.items[0].state,'error');assert.equal(r.run.value.items[1].state,'done');assert.equal(r.docs.get(key).markdown,saved);await r.run.retry(r.run.value.items[0].id);await r.run.step();assert.equal(r.jobs.get(r.run.value.jobId).steps.length,1);assert.equal(r.docs.get(key).markdown,saved);
});
test('rebuilding a writing batch preserves source records for chapters whose accepted text remains unchanged',async()=>{
 const r=await writingRig();await r.run.start();await r.run.step();r.finish(r.jobs.get(r.run.value.jobId));await r.run.step();const refs=r.run.value.items.map(i=>structuredClone(i.evidenceRef)),draft=r.docs.get('/documents/bid_draft').markdown;
 await r.run.reset();assert.deepEqual(r.run.value.items.map(i=>i.evidenceRef),refs);assert.equal(r.docs.get('/documents/bid_draft').markdown,draft);assert.ok(r.run.value.items.every(i=>i.state==='pending'));
});
test('completed but unverified chapter becomes retryable instead of staying running forever',async()=>{
 const r=await writingRig();await r.run.start();await r.run.step();const job=r.jobs.get(r.run.value.jobId);r.finish(job);const key='/documents/'+job.steps[0].resultDocument,raw=JSON.parse(r.docs.get(key).markdown);raw.verified=false;r.docs.get(key).markdown=JSON.stringify(raw);const saved=r.docs.get(key).markdown;await r.run.step();assert.equal(r.run.value.items[0].state,'error');assert.equal(r.run.value.items[1].state,'done');assert.equal(r.run.value.jobId,undefined);assert.ok(!r.run.draft.chapters.some(c=>c.id===job.steps[0].id));assert.equal(r.docs.get(key).markdown,saved);await r.run.retry(job.steps[0].id);await r.run.step();assert.equal(r.jobs.get(r.run.value.jobId).steps.length,1);
});
test('cancelled background writing retains completed chapters and explicitly retries only an unfinished chapter',async()=>{
 const r=await writingRig();await r.run.start();await r.run.step();const job=r.jobs.get(r.run.value.jobId);r.finish(job);job.steps[1].state='running';job.state='cancelled';await r.run.step();assert.equal(r.run.value.items[0].state,'done');assert.equal(r.run.value.items[1].state,'error');assert.equal(r.run.value.jobId,undefined);const first=r.run.draft.chapters[0].body;await r.run.retry(job.steps[1].id);await r.run.step();const retried=r.jobs.get(r.run.value.jobId);assert.equal(retried.steps.length,1);assert.equal(retried.steps[0].id,job.steps[1].id);assert.equal(r.run.draft.chapters[0].body,first);
});
test('completion time comes from the matching finished task, never page viewing or an automatically recreated job',async()=>{
 const r=await writingRig();await r.run.start();await r.run.step();const job=r.jobs.get(r.run.value.jobId);r.finish(job);job.updatedAt='2026-11-20T01:05:00.000Z';await r.run.step();const reopened=new WritingSession(r.bridge);await reopened.load();assert.equal(await reopened.completionTime(),job.updatedAt);const posts=r.posts;r.jobs.clear();assert.equal(await reopened.completionTime(),null);assert.equal(r.posts,posts);r.jobs.set(job.id,job);reopened.value.planRevision++;assert.equal(await reopened.completionTime(),null);
});
test('legacy projects without extraction records generate explicit gaps without reading another project or inventing sources',async()=>{
 const r=storage();assert.equal((await loadChapterEvidence(r.bridge)).state,'not_prepared');const snapshot=await chapterEvidence(await loadChapterEvidence(r.bridge),task);assert.equal(snapshot.requirements.length,1);assert.equal(snapshot.facts.length,0);assert.ok(snapshot.digest);
});
