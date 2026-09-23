import {canView} from '../spoilers/policy';
import type {PageRef,PublicEntity,PublishedGraph} from '../content/types';
import type {PageView} from './types';
export const key=(x:{kind:string;id:string})=>`${x.kind}:${x.id}`;
export function href(e:PublicEntity){const prefix={work:'works',background:'backgrounds',person:'people'}[e.kind as PageRef['kind']];return prefix&&e.slug?`/${prefix}/${e.slug}/`:null;}
export function label(e:PublicEntity){return e.payload.type==='work'?`${e.title.text}（${e.payload.releaseYear}）`:e.title.text;}
export function projectPage(graph:PublishedGraph,page:PageRef,allowed:ReadonlySet<string>):PageView{
 const entities=graph.entities.filter(e=>canView(e.spoilerWorkIds,allowed));
 const index=new Map(entities.map(e=>[key(e),e]));
 const owner=index.get(key(page));
 const visible=graph.statements.filter(s=>canView(s.spoilerWorkIds,allowed)&&index.has(key(s.owner)));
 const statements=new Map(visible.map(s=>[s.id,s]));
 const relations=entities.filter(e=>e.payload.type==='relation'&&index.has(key(e.payload.from))&&index.has(key(e.payload.to)));
 const direct=relations.filter(e=>e.payload.type==='relation'&&(key(e.payload.from)===key(page)||key(e.payload.to)===key(page)));
 const contexts=new Set<string>(page.kind==='background'?[page.id]:[]);
 if(page.kind==='work')for(const r of direct){const p=r.payload;if(p.type==='relation'&&p.relationKind==='context'&&p.to.kind==='background')contexts.add(p.to.id);}
 const view:PageView={title:owner?.title.text??'背景を読む',summary:owner?.safeSummary??'',pageKind:page.kind,blocks:[],references:[],links:[],places:[],events:[],contextLinks:{},readingMinutes:1};
 const evidenceIds=new Set<string>();
 for(const s of visible.filter(s=>key(s.owner)===key(page))){
  view.blocks.push({id:s.id,kind:s.kind,section:s.section,html:s.html,evidenceIds:s.evidenceRefs,workLabels:s.workIds.map(id=>index.get(`work:${id}`)).filter((x):x is PublicEntity=>!!x).map(label),quote:s.quote?`${s.quote.speaker} / ${s.quote.locator}${s.quote.translated?' / 翻訳あり':''}`:null});
  s.evidenceRefs.forEach(id=>evidenceIds.add(id));
 }
 for(const r of direct){const p=r.payload;if(p.type!=='relation')continue;const other=index.get(key(key(p.from)===key(page)?p.to:p.from));if(!other)continue;const url=href(other);if(!url)continue;
  const reasons=p.reasonStatementIds.map(id=>statements.get(id)).filter(x=>!!x);
  const refs=[...p.evidenceRefs,...reasons.flatMap(s=>s.evidenceRefs)];refs.forEach(id=>evidenceIds.add(id));
  view.links.push({label:label(other),href:url,kind:p.relationKind,reason:reasons.map(s=>s.html).join(''),evidenceIds:refs,targetKind:other.kind});
 }
 for(const r of relations){const p=r.payload;if(p.type!=='relation'||p.from.kind!=='background'||!contexts.has(p.from.id)||!['location','chronology'].includes(p.relationKind))continue;
  const e=index.get(key(p.to)),b=index.get(key(p.from));if(!e||!b)continue;
  const list=e.kind==='place'?view.places:view.events;if(!list.some(x=>key(x)===key(e)))list.push(e);
  (view.contextLinks[key(e)]??=[]).push({label:b.title.text,href:href(b)!});
  if(e.payload.type==='place'||e.payload.type==='event')e.payload.evidenceRefs.forEach(id=>evidenceIds.add(id));
  p.evidenceRefs.forEach(id=>evidenceIds.add(id));
 }
 for(const id of evidenceIds){const e=index.get(`evidence:${id}`);if(e?.payload.type!=='evidence')continue;const source=index.get(`source:${e.payload.sourceId}`);if(source?.payload.type!=='source')continue;view.references.push({id,title:source.title.text,author:source.payload.author,locator:e.payload.locator,url:source.payload.url,bibliography:source.payload.bibliography,accessedOn:source.payload.accessedOn});}
 const plain=view.blocks.map(x=>x.html.replace(/<[^>]*>/g,'').replace(/&[^;]+;/g,'x')).join('');view.readingMinutes=Math.max(1,Math.ceil(Array.from(plain).length/500));
 return view;
}
