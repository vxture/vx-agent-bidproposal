/**
 * @package @bidproposal/desktop
 * @layer Presentation
 * @category RuntimeTransport
 * @author AI-Generated
 * @date 2026-11-25
 */
export class BridgeClient {
 constructor(hostOrigin,hostWindow=window.parent,events=window){
  this.hostOrigin=hostOrigin;this.hostWindow=hostWindow;this.events=events;this.pending=new Map();
  this.listener=e=>{if(e.source!==this.hostWindow||e.origin!==this.hostOrigin)return;const d=e.data;if(!d||d.ns!=='ruyin.bridge'||d.kind!=='response')return;const p=this.pending.get(d.id);if(!p)return;clearTimeout(p.timer);this.pending.delete(d.id);p.resolve(d);};
  events.addEventListener('message',this.listener);
 }
 request(method,path,body){return new Promise((resolve,reject)=>{const id=crypto.randomUUID();const timer=setTimeout(()=>{this.pending.delete(id);reject(Error('RUYIN bridge timeout'));},15000);this.pending.set(id,{resolve,reject,timer});this.hostWindow.postMessage({ns:'ruyin.bridge',kind:'request',id,method,path,body},this.hostOrigin);});}
 review(taskInstanceId){if(typeof taskInstanceId!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(taskInstanceId))throw Error('Invalid review task');this.hostWindow.postMessage({ns:'ruyin.review',kind:'request',taskInstanceId},this.hostOrigin);}
 close(){this.events.removeEventListener('message',this.listener);for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error('Bridge closed'));}this.pending.clear();}
}
