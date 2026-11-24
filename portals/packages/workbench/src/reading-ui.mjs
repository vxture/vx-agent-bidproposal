/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category BusinessUi
 * @author AI-Generated
 * @date 2026-11-25
 */
import {Readings,readingState,flagLabel} from './reading.mjs';
import {autoSave} from './autosave.mjs';
export async function mountReading(bridge){
 const panel=document.createElement('section');panel.id='reading-panel';panel.className='reading-studio';panel.hidden=true;
 panel.innerHTML=`<div class="reading-hero"><p class="eyebrow">01 / &#25307;&#26631;&#35299;&#35835;</p><h1>&#20174;&#21407;&#20214;&#65292;&#24314;&#31435;&#21487;&#26680;&#23545;&#30340;&#38656;&#27714;</h1><p class="muted">&#20808;&#35835;&#21462;&#25307;&#26631;&#25991;&#20214;&#12290;&#21407;&#25991;&#21644;&#20301;&#32622;&#33258;&#21160;&#20445;&#23384;&#65292;&#20026;&#21518;&#32493;&#26234;&#33021;&#35299;&#35835;&#20445;&#30041;&#20381;&#25454;&#12290;</p></div>
 <div class="reading-toolbar"><label for="reading-file">&#25307;&#26631;&#36164;&#26009;</label><select id="reading-file"></select><button id="reading-start" class="primary">&#35835;&#21462;&#24182;&#20445;&#23384;&#21407;&#25991;</button><button id="reading-refresh">&#21047;&#26032;</button><button id="reading-toggle" aria-expanded="false">&#20301;&#32622;&#19982;&#24453;&#26680;&#23545;&#39033;</button></div>
 <p id="reading-notice" class="reading-notice" role="status"></p>
 <div class="reading-version"><label for="reading-version">&#24050;&#20445;&#23384;&#30340;&#29256;&#26412;</label><select id="reading-version"></select><span id="reading-progress"></span></div>
 <div class="reading-layout"><article class="reading-document"><div class="reading-pagebar"><strong id="reading-location">&#21407;&#25991;&#24555;&#29031;</strong><button id="reading-prev" aria-label="&#19978;&#19968;&#39029;">&#8592;</button><label for="reading-page">&#39029; / &#22359;</label><input id="reading-page" type="number" min="1" value="1"><span id="reading-total"></span><button id="reading-next" aria-label="&#19979;&#19968;&#39029;">&#8594;</button></div><pre id="reading-text"></pre><div id="reading-tables"></div></article>
 <aside id="reading-info" class="reading-info" hidden><h2>&#21407;&#25991;&#20301;&#32622;&#19982;&#24453;&#26680;&#23545;&#39033;</h2><p id="reading-source"></p><p id="reading-hash"></p><div id="reading-flags"></div><details><summary>&#35835;&#21462;&#29256;&#26412;</summary><pre id="reading-engine"></pre></details><p class="muted">&#36825;&#26159;&#21407;&#25991;&#36716;&#20889;&#65292;&#22270;&#29255;&#21450;&#22797;&#26434;&#34920;&#26684;&#38656;&#23545;&#29031;&#21407;&#20214;&#12290;&#35835;&#21462;&#23436;&#25104;&#19981;&#20195;&#34920;&#25152;&#26377;&#38656;&#27714;&#24050;&#23436;&#25972;&#35299;&#35835;&#12290;</p></aside></div>`;
 document.getElementById('requirements-panel').before(panel);
 const sourceConfig=document.createElement('details');sourceConfig.className='reading-source-config';const sourceSummary=document.createElement('summary');sourceSummary.textContent='\u62db\u6807\u539f\u4ef6\u4e0e\u7248\u672c';sourceConfig.append(sourceSummary);panel.querySelector('.reading-toolbar').before(sourceConfig);for(const selector of ['.reading-toolbar','#reading-notice','.reading-version'])sourceConfig.append(panel.querySelector(selector));let configInitialized=false;
 const $=id=>document.getElementById(id),model=new Readings(bridge);let selected=null,index=0,requestVersion=0,timer,stopped=false,visible=false,lastUnitKey='';
 const say=s=>{$('reading-notice').textContent=s;};
 const selectionSaver=autoSave(()=>model.remember(selected),{onState:(state,e)=>{if(state==='error')say(e.message);}});
 function render(){
  const fileId=$('reading-file').value;$('reading-file').replaceChildren();
  for(const f of model.files){const o=new Option(f.name,f.id);$('reading-file').add(o);}if(model.files.some(f=>f.id===(fileId||model.selection?.fileId)))$('reading-file').value=fileId||model.selection.fileId;
  const version=$('reading-version');version.replaceChildren();for(const j of model.jobs){const o=new Option(j.name+' / '+new Date(j.createdAt).toLocaleString()+' / '+readingState(j),j.id);version.add(o);}
  if(!model.jobs.some(j=>j.id===selected)){selected=model.jobs.find(j=>j.id===model.selection?.readingId)?.id||model.jobs[0]?.id;index=0;}version.value=selected||'';
  const j=model.jobs.find(j=>j.id===selected),active=model.jobs.some(j=>['queued','running'].includes(j.state));
  if(!configInitialized){sourceConfig.open=!j||j.state!=='completed';configInitialized=true;}sourceSummary.textContent=j?j.name+' \u00b7 '+j.units+(j.format==='pdf'?' \u9875':' \u5757')+' \u00b7 '+readingState(j):'\u9009\u62e9\u62db\u6807\u539f\u4ef6\u5f00\u59cb';
  $('reading-start').disabled=active||!model.files.length;$('reading-file').disabled=active;$('reading-start').textContent=active?'\u6b63\u5728\u540e\u53f0\u8bfb\u53d6\u2026':'\u8bfb\u53d6\u5e76\u4fdd\u5b58\u539f\u6587';
  $('reading-progress').textContent=j?readingState(j)+' \u00b7 '+j.units+'/'+(j.total??'\u2026')+(j.format==='pdf'?' \u9875':' \u5757'):'';
  if(!model.files.length)say('\u8bf7\u5148\u5728\u57fa\u7840\u914d\u7f6e\u7684\u9879\u76ee\u6587\u4ef6\u4e2d\u5bfc\u5165 PDF\u3001DOCX \u6216 Markdown\u3002');
  else if(j?.state==='failed')say((j.error||'\u8bfb\u53d6\u672a\u5b8c\u6210')+' \u5df2\u4fdd\u5b58\u7684\u539f\u6587\u5757\u4ecd\u53ef\u67e5\u770b\uff0c\u53ef\u65b0\u5efa\u5feb\u7167\u91cd\u8bd5\u3002');
  else if(active)say('\u6b63\u5728\u540e\u53f0\u8bfb\u53d6\u5e76\u81ea\u52a8\u4fdd\u5b58\uff0c\u53ef\u4ee5\u79bb\u5f00\u9875\u9762\u3002');
  else if(j)say('\u539f\u6587\u5feb\u7167\u5df2\u4fdd\u5b58\u3002\u56fe\u7247\u4e0e\u8868\u683c\u5f02\u5e38\u4f1a\u4fdd\u7559\u5f85\u6838\u5bf9\u63d0\u793a\uff1b\u53ef\u542f\u52a8\u4e0b\u65b9\u7684\u667a\u80fd\u5206\u6279\u89e3\u8bfb\u3002');
  else say('\u9009\u62e9\u62db\u6807\u539f\u4ef6\u5f00\u59cb\u3002\u6392\u7248\u6a21\u677f\u4e0d\u9700\u8981\u5728\u8fd9\u91cc\u8bfb\u53d6\u3002');
  index=Math.max(0,Math.min(index,(j?.units||1)-1));$('reading-page').value=index+1;$('reading-page').max=j?.units||1;$('reading-total').textContent='/ '+(j?.units||0);$('reading-prev').disabled=!j||index===0;$('reading-next').disabled=!j||index>=j.units-1;$('reading-page').disabled=!j?.units;
  $('reading-source').textContent=j?j.name+'\n'+(j.sourceAvailable===false?'\u539f\u5bfc\u5165\u7248\u672c\u5df2\u79fb\u9664\uff0c\u5feb\u7167\u4ecd\u4fdd\u7559':'\u5df2\u7ed1\u5b9a\u5bfc\u5165\u65f6\u7684\u7248\u672c'):'';
  $('reading-hash').textContent=j?'SHA256 '+j.hash:'';$('reading-engine').textContent=JSON.stringify(j?.engine||{},null,2);
  const f=model.files.find(f=>f.id===$('reading-file').value);if(f&&model.versions(f).length&&!active)say('\u540c\u540d\u6587\u4ef6\u5b58\u5728\u4e0d\u540c\u7248\u672c\u3002\u65b0\u8bfb\u53d6\u4f1a\u5355\u72ec\u4fdd\u5b58\uff0c\u65e7\u5feb\u7167\u548c\u9700\u6c42\u4fdd\u7559\u3002');
  void showUnit(j);
 }
 async function showUnit(j){const key=(j?.id||'')+':'+index;if(key===lastUnitKey)return;const token=++requestVersion;lastUnitKey=key;$('reading-tables').replaceChildren();$('reading-flags').replaceChildren();
  if(!j?.units){$('reading-text').textContent='\u8bfb\u53d6\u540e\uff0c\u539f\u6587\u4f1a\u663e\u793a\u5728\u8fd9\u91cc\u3002';lastUnitKey='';return;}
  try{const u=await model.unit(j.id,index);if(token!==requestVersion)return;
   const l=u.location;$('reading-location').textContent=l.page?'\u539f\u6587\u7b2c '+l.page+' \u9875':l.block?'\u6bb5\u843d / \u8868\u683c '+l.block:'\u539f\u6587\u7b2c '+l.lineStart+'\u2013'+l.lineEnd+' \u884c';
   $('reading-text').textContent=u.text||'\u8be5\u9875\u65e0\u53ef\u63d0\u53d6\u6587\u5b57\uff0c\u8bf7\u5bf9\u7167\u539f\u4ef6\u3002';
   const flags=new Set([...(j.format==='docx'?j.flags||[]:[]),...u.flags]);
   for(const flag of flags){const p=document.createElement('p');p.className='reading-warning';p.textContent=flagLabel(flag);$('reading-flags').append(p);}
   if(!flags.size){const p=document.createElement('p');p.textContent='\u672c\u5757\u672a\u62a5\u544a\u63d0\u53d6\u5f02\u5e38\uff0c\u4e0d\u4ee3\u8868\u5df2\u4eba\u5de5\u6838\u5bf9\u3002';$('reading-flags').append(p);}
   (u.tables||[]).forEach((t,i)=>{const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='\u8868\u683c '+(i+1)+' \u00b7 '+t.rows.length+' \u884c\uff08\u63d0\u53d6\u7ed3\u6784\uff09';details.append(summary);const table=document.createElement('table');table.className='reading-grid';for(const row of t.rows){const tr=document.createElement('tr');for(const v of row){const td=document.createElement('td');td.textContent=v===null?'\u2196 \u5408\u5e76\u4f4d\u7f6e':v;tr.append(td);}table.append(tr);}details.append(table);$('reading-tables').append(details);});
  }catch(e){if(token===requestVersion){lastUnitKey='';say(e.message);}}
 }
 function schedule(){clearTimeout(timer);if(visible&&!stopped&&model.jobs.some(j=>['queued','running'].includes(j.state)))timer=setTimeout(()=>refresh().catch(e=>{say(e.message);schedule();}),1500);}
 async function refresh(){await model.load();render();schedule();}
 $('reading-refresh').onclick=()=>refresh().catch(e=>say(e.message));$('reading-file').onchange=render;
 $('reading-version').onchange=()=>{selected=$('reading-version').value;index=0;selectionSaver.change();render();};
 $('reading-start').onclick=async()=>{try{const f=model.files.find(f=>f.id===$('reading-file').value);if(!f)return;$('reading-start').disabled=true;const j=await model.start(f);selected=j.id;index=0;await refresh();selectionSaver.change();await selectionSaver.flush();}catch(e){say(e.message);$('reading-start').disabled=false;}};
 $('reading-prev').onclick=()=>{index--;render();};$('reading-next').onclick=()=>{index++;render();};$('reading-page').onchange=()=>{const page=Number($('reading-page').value);index=Number.isSafeInteger(page)?page-1:0;render();};
 $('reading-toggle').onclick=()=>{const info=$('reading-info');info.hidden=!info.hidden;panel.classList.toggle('reading-with-info',!info.hidden);$('reading-toggle').setAttribute('aria-expanded',String(!info.hidden));};
 bridge.onStage(section=>{const next=section==='analysis';if(next===visible)return;visible=next;if(visible)void refresh().catch(e=>say(e.message));else clearTimeout(timer);});
 window.addEventListener('pagehide',()=>{stopped=true;clearTimeout(timer);void selectionSaver.flush().catch(()=>{});});
 try{await refresh();}catch(e){say(e.status===503?'\u5f53\u524d\u8fd0\u884c\u73af\u5883\u672a\u5b89\u88c5\u672c\u5730\u8bfb\u53d6\u80fd\u529b\uff0c\u8bf7\u66f4\u65b0 RUYIN\u3002':e.message);$('reading-start').disabled=true;}
 return {flushSelection:()=>selectionSaver.flush()};
}
