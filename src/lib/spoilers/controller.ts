import type {PageRef,PublishedGraph} from '../content/types';
import {projectPage,key} from '../view/project';
import {renderPageBody} from '../view/render';
import {canView} from './policy';
import {readAllowed,writeAllowed} from './store';
import {parseGroup} from './response';
export function mountSpoilers(root:HTMLElement,page:PageRef,base:PublishedGraph,groups:{token:string;requires:string[]}[]):()=>void{
 const content=root.querySelector<HTMLElement>('#page-content')!;
 const buttons=[...root.querySelectorAll<HTMLButtonElement>('button[data-work]')];
 const status=root.querySelector<HTMLElement>('[data-spoiler-status]')!;
 const retry=root.querySelector<HTMLButtonElement>('[data-retry]')!;
 const storageNote=root.querySelector<HTMLElement>('[data-storage-note]')!;
 let allowed=new Set<string>(),generation=0,disposed=false;
 const cached=new Map<string,PublishedGraph>();
 function restore(){try{allowed=readAllowed(window.sessionStorage);}catch{allowed=new Set();}}
 function persist(){let saved=false;try{saved=writeAllowed(window.sessionStorage,allowed);}catch{}storageNote.hidden=saved;}
 function render(graph:PublishedGraph){
  content.innerHTML=renderPageBody(projectPage(graph,page,allowed));
  for(const button of buttons){const active=allowed.has(button.dataset.work!);button.textContent=`${button.dataset.label}のネタバレを${active?'隠す':'表示'}`;button.setAttribute('aria-pressed',String(active));}
 }
 function merge(){const es=new Map(base.entities.map(e=>[key(e),e])),ss=new Map(base.statements.map(s=>[s.id,s]));for(const group of groups){if(!canView(group.requires,allowed))continue;const graph=cached.get(group.token);if(!graph)continue;for(const e of graph.entities)if(canView(e.spoilerWorkIds,allowed))es.set(key(e),e);for(const s of graph.statements)if(canView(s.spoilerWorkIds,allowed))ss.set(s.id,s);}return {entities:[...es.values()],statements:[...ss.values()]};}
 async function update(){
  const current=++generation;render(merge());retry.hidden=true;status.textContent='';
  const needed=groups.filter(g=>canView(g.requires,allowed)&&!cached.has(g.token));if(!needed.length)return;
  status.textContent='許可した内容を読み込んでいます。';
  try{const results=await Promise.all(needed.map(async group=>{const response=await fetch(`/_content/${group.token}.json`);if(!response.ok)throw Error('CONTENT_FETCH_FAILED');return parseGroup(await response.json(),group);}));
   if(disposed||current!==generation)return;
   for(const group of results)if(canView(group.requires,allowed))cached.set(group.token,group.graph);
   render(merge());status.textContent='許可した内容を表示しました。';
  }catch{if(disposed||current!==generation)return;render(base);status.textContent='追加の内容を読み込めませんでした。安全な内容を表示しています。';retry.hidden=false;}
 }
 function click(event:Event){const button=event.currentTarget as HTMLButtonElement;const id=button.dataset.work!;if(allowed.has(id)){allowed.delete(id);if(content.contains(document.activeElement))button.focus();}else allowed.add(id);persist();void update();}
 function again(){void update();}
 function hide(){generation++;allowed=new Set();cached.clear();render(base);status.textContent='';retry.hidden=true;}
 function show(){restore();void update();}
 for(const b of buttons){b.disabled=false;b.addEventListener('click',click);}
 retry.addEventListener('click',again);window.addEventListener('pagehide',hide);window.addEventListener('pageshow',show);show();
 return ()=>{disposed=true;hide();for(const b of buttons)b.removeEventListener('click',click);retry.removeEventListener('click',again);window.removeEventListener('pagehide',hide);window.removeEventListener('pageshow',show);};
}
