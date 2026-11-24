/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Business
 * @author AI-Generated
 * @date 2026-11-25
 */
import {DocumentError} from './errors.mjs';
export const readingState=j=>({queued:'\u7b49\u5f85\u8bfb\u53d6',running:'\u6b63\u5728\u8bfb\u53d6',completed:'\u539f\u6587\u5df2\u4fdd\u5b58',failed:'\u8bfb\u53d6\u672a\u5b8c\u6210'}[j.state]||j.state);
export const flagLabel=flag=>({
 'sparse-text-needs-review':'\u6587\u5b57\u8f83\u5c11\uff0c\u9700\u5bf9\u7167\u539f\u9875',
 'images-not-transcribed':'\u56fe\u7247\u5185\u5bb9\u5c1a\u672a\u8bc6\u522b',
 'table-boundaries-need-review':'\u8868\u683c\u8fb9\u754c\u4e0e\u8de8\u9875\u5f52\u5c5e\u9700\u6838\u5bf9',
 'single-row-table':'\u5355\u884c\u8868\u683c\uff0c\u8bf7\u7559\u610f\u524d\u540e\u9875\u7eed\u8868',
 'unmapped-characters':'\u5b58\u5728\u65e0\u6cd5\u8bc6\u522b\u7684\u5b57\u7b26',
 'word-pagination-unavailable':'Word \u4ee5\u6bb5\u843d\u6216\u8868\u683c\u5b9a\u4f4d\uff0c\u65e0\u56fa\u5b9a\u9875\u7801',
 'automatic-numbering-not-rendered':'\u81ea\u52a8\u7f16\u53f7\u672a\u5c55\u5f00\uff0c\u9700\u5bf9\u7167\u539f\u4ef6',
 'merged-table-grid-needs-review':'\u5408\u5e76\u5355\u5143\u683c\u9700\u6838\u5bf9',
 'fields-not-evaluated':'\u57df\u4e0e\u76ee\u5f55\u672a\u91cd\u65b0\u8ba1\u7b97',
 'tracked-changes-need-review':'\u4fee\u8ba2\u8bb0\u5f55\u9700\u6838\u5bf9',
 'text-boxes-need-review':'\u6587\u672c\u6846\u5185\u5bb9\u9700\u6838\u5bf9',
 'notes-need-review':'\u811a\u6ce8\u6216\u5c3e\u6ce8\u9700\u6838\u5bf9'
 ,'nested-tables-need-review':'\u5d4c\u5957\u8868\u683c\u9700\u5bf9\u7167\u539f\u4ef6'
}[flag]||flag);
export class Readings{
 constructor(bridge){this.bridge=bridge;this.jobs=[];this.files=[];this.selection=null;this.selectionRevision=0;this.selectionLoaded=false;}
 async request(method,path,body){const r=await this.bridge.request(method,path,body);if(!r.ok)throw new DocumentError(r);return r.body;}
 async load(){const [files,jobs]=await Promise.all([this.request('GET','/files'),this.request('GET','/readings')]);this.files=files.items.filter(f=>/\.(pdf|docx|md)$/i.test(f.name));this.jobs=jobs.items;if(!this.selectionLoaded){const doc=await this.bridge.request('GET','/documents/bid_reading_selection');if(!doc.ok&&doc.status!==404)throw new DocumentError(doc);if(doc.ok){this.selection=JSON.parse(doc.body.markdown);this.selectionRevision=doc.body.revision;}else{const pending=await this.bridge.request('GET','/documents/bid_analysis_pending');if(!pending.ok&&pending.status!==404)throw new DocumentError(pending);if(pending.ok){const id=JSON.parse(pending.body.markdown).id,saved=await this.bridge.request('GET','/documents/bid_analysis_submission_'+id);if(!saved.ok&&saved.status!==404)throw new DocumentError(saved);if(saved.ok){const spec=JSON.parse(saved.body.markdown),readingId=JSON.parse(spec.steps[0].context.markdown).readingId,reading=this.jobs.find(j=>j.id===readingId);if(reading)this.selection={readingId,fileId:reading.fileId};}}}this.selectionLoaded=true;}}
 async remember(id){const job=this.jobs.find(j=>j.id===id);if(!job)throw Error('Selected source snapshot is unavailable');const value={readingId:id,fileId:job.fileId};if(JSON.stringify(value)===JSON.stringify(this.selection)&&this.selectionRevision)return;const doc=await this.request('PUT','/documents/bid_reading_selection',{markdown:JSON.stringify(value),revision:this.selectionRevision});this.selection=value;this.selectionRevision=doc.revision;}
 async start(file){if(!this.files.some(f=>f.id===file.id&&f.hash===file.hash))throw Error('Source revision changed');return this.request('POST','/readings',{id:crypto.randomUUID(),fileId:file.id,hash:file.hash});}
 async unit(id,index){return this.request('GET','/readings/'+encodeURIComponent(id)+'/units/'+index);}
 versions(file){return this.jobs.filter(j=>j.name===file.name&&j.hash!==file.hash);}
}
