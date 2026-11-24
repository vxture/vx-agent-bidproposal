/**
 * @package @bidproposal/desktop
 * @layer Presentation
 * @category Tests
 * @author AI-Generated
 * @date 2026-11-25
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { BridgeClient } from './bridge.mjs';
test('document bridge ignores foreign sources and origins and never sends wildcard content',async()=>{
 let listener,sent;const host={postMessage:(data,origin)=>{sent={data,origin};}};
 const events={addEventListener:(_,f)=>listener=f,removeEventListener:()=>{}};
 const b=new BridgeClient('http://127.0.0.1:7420',host,events);
 const pending=b.request('PUT','/documents/bid_draft',{markdown:'private draft',revision:0});
 assert.equal(sent.origin,'http://127.0.0.1:7420');
 const data={ns:'ruyin.bridge',kind:'response',id:sent.data.id,ok:true,status:200,body:{revision:1}};
 listener({source:host,origin:'https://wrong.invalid',data});assert.equal(b.pending.size,1);
 listener({source:{},origin:sent.origin,data});assert.equal(b.pending.size,1);
 listener({source:host,origin:sent.origin,data});assert.equal((await pending).body.revision,1);b.close();
});
