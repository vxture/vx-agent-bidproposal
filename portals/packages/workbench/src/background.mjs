/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Business
 * @author AI-Generated
 * @date 2026-11-25
 */
import {DocumentError} from './errors.mjs';
export const checked=reply=>{if(!reply.ok)throw new DocumentError(reply);return reply.body;};
export class BackgroundRequest {
 constructor(bridge,documentId){this.bridge=bridge;this.documentId=documentId;this.revision=0;this.value=null;this.job=null;}
 async load(){const r=await this.bridge.request('GET','/documents/'+this.documentId);if(!r.ok&&r.status!==404)throw new DocumentError(r);if(r.ok){this.revision=r.body.revision;this.value=JSON.parse(r.body.markdown);}return this;}
 async save(){const r=checked(await this.bridge.request('PUT','/documents/'+this.documentId,{markdown:JSON.stringify(this.value),revision:this.revision}));this.revision=r.revision;}
 async start(spec,{reviewMode}={}){this.value={spec,...(reviewMode==='business'?{reviewMode}: {})};await this.save();return this.sync();}
 async sync(){if(!this.value)return null;const spec=this.value.spec;let r=await this.bridge.request('GET','/jobs/'+spec.id);if(r.status===404)r=await this.bridge.request('POST','/jobs',spec);this.job=checked(r);return this.job;}
 async result(step){if(!step?.resultDocument)return null;return JSON.parse(checked(await this.bridge.request('GET','/documents/'+step.resultDocument)).markdown);}
 async control(action){if(!this.value)return;this.job=checked(await this.bridge.request('POST','/jobs/'+this.value.spec.id+'/control',{action}));return this.job;}
}
