/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Tests
 * @author AI-Generated
 * @date 2026-11-25
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {Readings} from './reading.mjs';
test('selected tender snapshot survives newer enterprise readings and recovers legacy analysis without guessing filenames',async()=>{
 const docs=new Map(),jobs=[{id:'enterprise',fileId:'e',name:'A.md'},{id:'tender',fileId:'t',name:'B.md'}];let posts=0;
 const bridge={request:async(method,path,body)=>{if(path==='/files')return {ok:true,body:{items:[{id:'e',name:'A.md'},{id:'t',name:'B.md'}]}};if(path==='/readings')return {ok:true,body:{items:jobs}};const old=docs.get(path);if(method==='GET')return old?{ok:true,body:old}:{ok:false,status:404};posts++;if((old?.revision||0)!==body.revision)return {ok:false,status:409};const next={revision:body.revision+1,markdown:body.markdown};docs.set(path,next);return {ok:true,body:next};}};
 docs.set('/documents/bid_analysis_pending',{revision:1,markdown:JSON.stringify({id:'job'})});docs.set('/documents/bid_analysis_submission_job',{revision:1,markdown:JSON.stringify({steps:[{context:{markdown:JSON.stringify({readingId:'tender'})}}]})});
 const first=new Readings(bridge);await first.load();assert.equal(first.selection.readingId,'tender');assert.equal(posts,0);await first.remember('tender');assert.equal(posts,1);const reopened=new Readings(bridge);await reopened.load();assert.deepEqual(reopened.selection,{readingId:'tender',fileId:'t'});await reopened.remember('tender');assert.equal(posts,1);await assert.rejects(reopened.remember('missing'));jobs.splice(1,1);await reopened.load();assert.ok(!reopened.jobs.some(j=>j.id===reopened.selection.readingId));
});
