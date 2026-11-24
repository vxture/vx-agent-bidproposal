/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Business
 * @author AI-Generated
 * @date 2026-11-25
 */
import {marked} from './vendor-marked.mjs';
import DOMPurify from './vendor-dompurify.mjs';

export function renderMarkdown(target,markdown){
 // No remote images, links or active HTML are fetched/executed from model text.
 target.innerHTML=DOMPurify.sanitize(marked.parse(markdown,{gfm:true,breaks:false}),{USE_PROFILES:{html:true},FORBID_TAGS:['img','iframe','video','audio','source','form','input','button','style'],FORBID_ATTR:['style','src','srcset','href','action','target']});
}
