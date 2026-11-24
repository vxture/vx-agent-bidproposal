/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Business
 * @author AI-Generated
 * @date 2026-11-25
 */
/** Serializes snapshots: edits arriving during a write are saved in the next turn. */
export function autoSave(save,{onState=()=>{},delay=450}={}){
 let timer,chain=Promise.resolve(),changed=0,saved=0,failed=null;
 const flush=()=>{clearTimeout(timer);timer=null;chain=chain.catch(()=>{}).then(async()=>{if(failed)throw failed;while(changed!==saved){const version=changed;onState('saving');try{await save();saved=version;onState(changed===saved?'saved':'pending');}catch(e){failed=e;onState('error',e);throw e;}}});return chain;};
 return {change(){changed++;onState('pending');clearTimeout(timer);timer=setTimeout(()=>void flush().catch(()=>{}),delay);},flush,retry(){failed=null;return flush();},get pending(){return changed!==saved;}};
}
