/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Tests
 * @author AI-Generated
 * @date 2026-11-25
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTenderBatches} from './batch-analysis.mjs';
import {matchQuote,verifySourceQuote,currentSource,buildSourceReview,reviewContext,parseSourceReview,SourceVerification,checkMatrixSources,manuallyReviewMatrixRow,rowBinding} from './source-verification.mjs';
import {Requirements} from './requirements.mjs';
import {PlanSession} from './plan.mjs';

const unit={index:0,text:'Lot one: budget 12.34.\nSupply >=5 units within 30 days.\nLot two requires supervision.',location:{page:1},flags:[],tables:[{rows:[['Equipment','Quantity','Unit'],['Monitor','5','sets'],['Shared',null,'anchor']]}]};
const reading={id:'r1',fileId:'f1',hash:'a'.repeat(64),name:'synthetic.pdf',units:1,state:'completed'};
const analysis=buildTenderBatches([unit],reading,{runId:'analysis-1'});
const segment=analysis.batches[0].segments[0],rowSegment=analysis.batches[0].segments.find(s=>s.kind==='table-row'&&s.row===1);
const candidate=(text,quote,seg=segment)=>({category:'technical',text,quote,segmentId:seg.id,unit:0,location:seg.location});
const extraction=[{batchId:analysis.batches[0].id,requirements:[candidate('Deliver at least five units','Supply >=5 units within 30 days.'),candidate('Other lot supervision','Lot two requires supervision.'),candidate('Wrong quote','Supply 500 units'),candidate('Supply monitors','Monitor\n5\nsets',rowSegment)],issues:[],step:{resultDocument:'extraction'}}];
function rig(){
 const docs=new Map([['bid_analysis_manifest_'+analysis.runId,{markdown:JSON.stringify(analysis),revision:1}]]),jobs=new Map();let files=[{id:reading.fileId,hash:reading.hash,name:reading.name}],lost=false;
 const bridge={request:async(method,path,body)=>{
  if(path==='/files')return {ok:true,body:{items:files}};
  if(path==='/readings')return {ok:true,body:{items:[reading]}};
  if(path.includes('/units/'))return {ok:true,body:unit};
  if(path==='/jobs'&&method==='POST'){let job=jobs.get(body.id);if(!job){job={...structuredClone(body),state:'running',steps:body.steps.map(s=>({...s,state:'pending'}))};jobs.set(body.id,job);}if(lost){lost=false;throw Error('Lost POST response');}return {ok:true,body:job};}
  if(path.startsWith('/jobs/')){const job=jobs.get(path.split('/')[2]);return job?{ok:true,body:job}:{ok:false,status:404};}
  const id=path.split('/').pop(),old=docs.get(id);if(method==='GET')return old?{ok:true,body:old}:{ok:false,status:404};
  if((old?.revision||0)!==body.revision)return {ok:false,status:409};const next={id,markdown:body.markdown,revision:body.revision+1};docs.set(id,next);return {ok:true,body:next};
 }};
 return {bridge,docs,jobs,setFiles:value=>files=value,lose:()=>lost=true};
}
function complete(session,rig){
 const job=session.request.job;job.state='completed';for(const step of job.steps){step.state='done';step.resultDocument='review-result-'+step.id;const input=JSON.parse(step.context.markdown);const reviews=input.candidates.map((c,i)=>({id:c.id,support:'supported',scope:i===1?'other':'target',reason:i===1?'Explicitly applies to lot two':'Supported by the designated evidence',conflicts:[]}));rig.docs.set(step.resultDocument,{revision:1,markdown:JSON.stringify({verified:true,content:{requirement_analysis:JSON.stringify({...input,reviews})}})});}
}
test('strict quote matching changes only whitespace; digits, operators, location and source offsets remain binding',()=>{
 assert.deepEqual(matchQuote('Price 12.34\r\n>=5','12.34 >=5'),{method:'whitespace',start:6,end:16});
 assert.equal(matchQuote('Price 12.34 >=5','Price 12.34 >5'),null);
 assert.equal(matchQuote('Price 12.34','12.35'),null);assert.equal(matchQuote('abc',' '),null);
 const c=extraction[0].requirements[0];assert.equal(verifySourceQuote(c,segment,unit).ok,true);
 assert.equal(verifySourceQuote({...c,location:{page:2}},segment,unit).ok,false);
 assert.equal(verifySourceQuote(c,{...segment,text:segment.text+'changed'},unit).ok,false);
 assert.equal(verifySourceQuote(extraction[0].requirements[2],segment,unit).ok,false);
});
test('table quotes keep cell/row associations and never cross into the next row or merged anchor',()=>{
 const c=extraction[0].requirements[3],match=verifySourceQuote(c,rowSegment,unit);assert.equal(match.ok,true);assert.deepEqual(match.cells.map(c=>c.column),[0,1,2]);
 assert.equal(verifySourceQuote({...c,quote:'sets\nShared'},rowSegment,unit).ok,false);
 assert.equal(verifySourceQuote(c,{...rowSegment,row:2},unit).ok,false);
 assert.equal(currentSource(analysis,reading,[{id:'f1',hash:'wrong'}])!=null,true);
 assert.ok(currentSource(analysis,reading,[{id:'f1',hash:reading.hash},{id:'new',name:reading.name,hash:'b'.repeat(64)}]));
 assert.equal(currentSource(analysis,reading,[{id:'f1',name:reading.name,hash:reading.hash,addedAt:'2026-11-19T02:00:00Z'},{id:'old',name:reading.name,hash:'b'.repeat(64),addedAt:'2026-11-19T01:00:00Z'}]),null);
});
test('bounded review checks every ID and rejects stale scope/version, duplicates and foreign conflicts',()=>{
 const plan=buildSourceReview(analysis,extraction[0].requirements.map((r,i)=>({...r,id:'c'+i})),[],'Lot one',{id:'review-fixed'}),input=reviewContext(plan,plan.batches[0]);
 const reviews=input.candidates.map(c=>({id:c.id,support:'supported',scope:'shared',reason:'Common bidder obligation',conflicts:[]})),valid={...input,reviews};
 assert.equal(parseSourceReview(JSON.stringify(valid),input).length,4);
 for(const patch of [{sourceHash:'wrong'},{reviews:reviews.slice(1)},{reviews:[reviews[0],reviews[0],...reviews.slice(2)]},{reviews:reviews.map((r,i)=>i? r:{...r,conflicts:['foreign']})}])assert.throws(()=>parseSourceReview(JSON.stringify({...valid,...patch}),input));
 const many=Array.from({length:600},(_,i)=>({...input.candidates[0],id:'candidate-'+i})),large=buildSourceReview(analysis,many,[],'Lot one');assert.equal(large.batches.flatMap(b=>b.candidates).length,600);assert.ok(large.batches.every(b=>b.candidates.length<=40&&Buffer.byteLength(JSON.stringify(reviewContext(large,b)))<=42000));
});
test('reopen recovers a lost submission, blocks forged quotes, excludes other lot and adopts without touching confirmed/manual rows',async()=>{
 const r=rig(),s=new SourceVerification(r.bridge,reading.id);await s.prepare(analysis,extraction);r.lose();await assert.rejects(s.start('Lot one',{id:'bid_analysis_manifest_'+analysis.runId,revision:1}),/Lost/);
 const reopened=new SourceVerification(r.bridge,reading.id);await reopened.prepare(analysis,extraction);await reopened.load();assert.equal(r.jobs.size,1);complete(reopened,r);
 const ready=await reopened.ready();assert.deepEqual(ready.map(r=>r.status),['ready','excluded','source-error','ready']);
 const rows=await reopened.adoptable(),matrix=new Requirements(r.bridge);await matrix.load();matrix.add({text:'Manual fact',quote:'Manual basis',location:'Company declaration'});matrix.confirm();assert.equal(matrix.adopt(rows),2);assert.equal(matrix.rows[0].confirmed,true);await matrix.save();
 const loaded=new Requirements(r.bridge);await loaded.load();assert.equal(loaded.rows.length,3);assert.equal(loaded.sourceProblems.size,0);loaded.confirm();assert.equal(loaded.adopt(rows),0);
 const old=loaded.rows[1].text;loaded.edit(loaded.rows[1].id,{text:old+' reviewed'});assert.throws(()=>loaded.confirm());await manuallyReviewMatrixRow(r.bridge,loaded.rows[1],'Manually checked the original metric and target scope');await loaded.recheck();loaded.confirm();
 r.setFiles([]);await loaded.recheck();assert.equal(loaded.rows[0].confirmed,true);assert.equal(loaded.rows[1].confirmed,false);assert.throws(()=>loaded.confirm());
});
test('manual exception records cannot approve absent quotes and survive reload with a specific scope and note',async()=>{
 const r=rig(),s=new SourceVerification(r.bridge,reading.id);await s.prepare(analysis,extraction);const id=s.candidates[2].id;
 await assert.rejects(s.decide(id,{text:'Supply units',quote:'forged',scope:'target',note:'Confirmed scope'}));
 await s.decide(id,{text:'Deliver >=5 units in 30 days',quote:'Supply >=5 units within 30 days.',scope:'target',note:'Corrected the source quotation and checked lot one'});
 const reopened=new SourceVerification(r.bridge,reading.id);await reopened.prepare(analysis,extraction);await reopened.load();assert.equal((await reopened.ready())[2].status,'ready');
 const rows=await reopened.adoptable();assert.equal(rows[0].evidence.status,'manual-reviewed');assert.equal(rows[0].confirmed,false);
 rows[0].quote='forged';rows[0].evidence.binding=rowBinding(rows[0]);assert.equal((await checkMatrixSources(r.bridge,rows)).size,1);
});
test('a conflict reported by either side blocks both candidates',async()=>{
 const r=rig(),s=new SourceVerification(r.bridge,reading.id);await s.prepare(analysis,extraction);await s.start('Lot one',{id:'bid_analysis_manifest_'+analysis.runId,revision:1});complete(s,r);const step=s.request.job.steps[0],doc=r.docs.get(step.resultDocument),result=JSON.parse(doc.markdown),body=JSON.parse(result.content.requirement_analysis);body.reviews[0].conflicts=[body.reviews[3].id];result.content.requirement_analysis=JSON.stringify(body);doc.markdown=JSON.stringify(result);
 const rows=await s.ready();assert.equal(rows[0].status,'review');assert.equal(rows[3].status,'review');assert.equal((await s.adoptable()).length,0);
});
test('later exclusion and a new scope review invalidate previously adopted requirements without changing manual rows',async()=>{
 const r=rig(),s=new SourceVerification(r.bridge,reading.id);await s.prepare(analysis,extraction);await s.start('Lot one',{id:'bid_analysis_manifest_'+analysis.runId,revision:1});complete(s,r);const matrix=new Requirements(r.bridge);await matrix.load();matrix.adopt(await s.adoptable());await matrix.recheck();matrix.confirm();await matrix.save();
 await s.decide(s.candidates[0].id,{text:s.candidates[0].text,quote:s.candidates[0].quote,scope:'other',note:'Rechecked the target and excluded this candidate'});await matrix.recheck();assert.equal(matrix.rows[0].confirmed,false);assert.ok(matrix.sourceProblems.has(matrix.rows[0].id));assert.equal(matrix.rows[1].confirmed,true);
 const pointer=r.docs.get('bid_source_review_'+reading.id);const value=JSON.parse(pointer.markdown);value.spec.id='another-review';pointer.markdown=JSON.stringify(value);await matrix.recheck();assert.equal(matrix.rows.every(r=>!r.confirmed),true);
});
test('persisted metadata cannot replace an excluded model finding with a forged verified status',async()=>{
 const r=rig(),s=new SourceVerification(r.bridge,reading.id);await s.prepare(analysis,extraction);await s.start('Lot one',{id:'bid_analysis_manifest_'+analysis.runId,revision:1});complete(s,r);const rows=await s.adoptable(),forged=structuredClone(rows[0]),other=s.candidates[1];forged.text=other.text;forged.quote=other.quote;forged.evidence.candidateId=other.id;const {evidenceDigest}=await import('./source-verification.mjs');forged.evidence.binding=await evidenceDigest(forged);assert.equal((await checkMatrixSources(r.bridge,[forged])).size,1);
});
test('a reviewed primary location and supplemental references are individually checked, retained and rechecked after adoption',async()=>{
 const r=rig(),s=new SourceVerification(r.bridge,reading.id);await s.prepare(analysis,extraction);await s.start('Lot one',{id:'bid_analysis_manifest_'+analysis.runId,revision:1});complete(s,r);
 const id=s.candidates[2].id,decision={text:'Provide 5 monitor sets',quote:'Monitor\n5\nsets',segmentId:rowSegment.id,scope:'target',note:'Assistant inspected the equipment row and preserved both source references',reviewer:'assistant',references:[{segmentId:segment.id,quote:'Supply >=5 units within 30 days.'}]};
 await assert.rejects(s.decide(id,{...decision,references:[{segmentId:segment.id,quote:'Supply 999 units'}]}));assert.equal(s.decisionRevision,0);
 await s.decide(id,decision);const resolved=(await s.ready()).find(c=>c.id===id);assert.equal(resolved.status,'ready');assert.equal(resolved.segmentId,rowSegment.id);assert.equal(resolved.check.references.length,1);
 const matrix=new Requirements(r.bridge);await matrix.load();matrix.adopt(await s.adoptable());await matrix.save();const reopened=new Requirements(r.bridge);await reopened.load();assert.equal(reopened.sourceProblems.size,0);const row=reopened.rows.find(r=>r.evidence.candidateId===id);assert.equal(row.evidence.manualReview.reviewer,'assistant');assert.equal(row.evidence.references.length,1);
 await manuallyReviewMatrixRow(r.bridge,row,'User rechecked the equipment row and its supplemental evidence');await reopened.recheck();assert.equal(reopened.sourceProblems.size,0);await reopened.save();const reviewed=new Requirements(r.bridge);await reviewed.load();assert.equal(reviewed.sourceProblems.size,0);assert.equal(reviewed.rows.find(r=>r.id===row.id).evidence.references.length,1);
 row.evidence.references[0].quote='forged supplemental text';await assert.rejects(manuallyReviewMatrixRow(r.bridge,row,'Recheck must reject a forged supplemental quotation'),/Supplemental evidence changed/);assert.equal((await checkMatrixSources(r.bridge,[row])).size,1);
});
test('clarification is durable, cannot be adopted or bypassed by matrix confirmation, and preserves decision history',async()=>{
 const r=rig(),s=new SourceVerification(r.bridge,reading.id);await s.prepare(analysis,extraction);await s.start('Lot one',{id:'bid_analysis_manifest_'+analysis.runId,revision:1});complete(s,r);const candidate=s.candidates[0],decision={text:candidate.text,quote:candidate.quote,scope:'target',note:'Original source contains an unresolved boundary; procurement clarification is required',disposition:'clarification',reviewer:'assistant'};await s.decide(candidate.id,decision);
 const reopened=new SourceVerification(r.bridge,reading.id);await reopened.prepare(analysis,extraction);await reopened.load();assert.equal((await reopened.ready())[0].status,'clarification');assert.ok(!(await reopened.adoptable()).some(row=>row.evidence.candidateId===candidate.id));
 const matrix=new Requirements(r.bridge);await matrix.load();matrix.adopt(await reopened.adoptable());await matrix.save();await matrix.recheck();assert.ok(matrix.unresolvedSources.some(c=>c.id===candidate.id));matrix.confirm();await matrix.save();const plan=new PlanSession(r.bridge);assert.throws(()=>plan.context(matrix));assert.throws(()=>plan.build(matrix));
 await reopened.decide(candidate.id,{...decision,disposition:'resolved',note:'Received explicit clarification and checked the original threshold'});assert.equal(reopened.decisions[candidate.id].history.length,1);assert.equal(reopened.decisions[candidate.id].history[0].disposition,'clarification');assert.equal((await reopened.ready())[0].status,'ready');
});
test('an operator can record an optional external inquiry and continue; planning retains the unresolved interpretation note',async()=>{
 const r=rig(),s=new SourceVerification(r.bridge,reading.id);await s.prepare(analysis,extraction);await s.start('Lot one',{id:'bid_analysis_manifest_'+analysis.runId,revision:1});complete(s,r);const candidate=s.candidates[2],note='Bidder may ask the purchaser; proceed with the quoted source wording and keep unknown quantities pending. Sending an inquiry is a human decision.';await assert.rejects(s.decide(candidate.id,{text:candidate.text,quote:'Forged replacement quote',scope:'target',note,disposition:'recorded'}));await s.decide(candidate.id,{text:'Deliver units according to the quoted clause; the uncertain interpretation remains recorded.',quote:'Supply >=5 units within 30 days.',scope:'target',note,disposition:'recorded'});assert.equal((await s.ready())[2].status,'ready');const matrix=new Requirements(r.bridge);await matrix.load();matrix.adopt(await s.adoptable());await matrix.save();await matrix.recheck();assert.equal(matrix.unresolvedSources.length,0);matrix.confirm();await matrix.save();const plan=new PlanSession(r.bridge);const context=plan.context(matrix);assert.equal(context.requirements.find(r=>r.clarification)?.clarification.note,note);plan.build(matrix);plan.approve(matrix);await plan.save();assert.equal(plan.writingTasks(matrix).flatMap(t=>t.requirements).find(r=>r.clarification)?.clarification.disposition,'recorded');
});
