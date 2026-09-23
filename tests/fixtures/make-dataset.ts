import type { Dataset, Entity, Payload, Ref, Statement } from '../../src/lib/content/types';
export const base = () => ({ revision: 1, status: 'published' as const, review: { by: 'テスト専用の架空確認者', date: '2026-09-23', revision: 1 }, spoilerWorkIds: [] as string[] });
export function entity<P extends Payload>(id:string, payload:P, title:string, slug:string|null=null):Entity & {payload:P} {
 return {...base(),id,kind:payload.type,slug,safeTitle:title,safeSummary:'TEST_ONLY 動作確認のための架空資料。',title:{text:title,spoilerWorkIds:[]},payload};
}
export function addEvidence(data:Dataset,id:string,target:Ref|{kind:'content-statement';id:string},sourceId='s1'){
 data.entities.push(entity(id,{type:'evidence',sourceId,target,locator:'テスト用の1ページ',verificationNote:'PRIVATE_REVIEW_NOTE',support:'fact'},'テスト専用根拠'));
}
export function addStatement(data:Dataset,id:string,owner:Ref,markdown:string,kind:Statement['kind']='history'){
 const evidenceId=id==='st1'?'v1':`ev-${id}`;
 data.statements.push({...base(),id,owner,kind,section:'background',workIds:[],evidenceRefs:[evidenceId],markdown,quote:null});
 addEvidence(data,evidenceId,{kind:'content-statement',id});
}
export function addRelation(data:Dataset,id:string,from:Ref,to:Ref,relationKind:Extract<Payload,{type:'relation'}>['relationKind']){
 const reason=`reason-${id}`,evidence=`ev-${id}`;
 data.entities.push(entity(id,{type:'relation',from,to,relationKind,reasonStatementIds:[reason],evidenceRefs:[evidence]},'テスト専用の関係'));
 addStatement(data,reason,{kind:'relation',id},'TEST_ONLY 資料で確認した接点。');
 addEvidence(data,evidence,{kind:'relation',id});
}
export function makeDataset(): Dataset {
 const data:Dataset={entities:[2000,2001].map((year,i)=>entity(`w${i+1}`,{type:'work',jaTitle:'テスト専用作品',originalTitle:'Test film',releaseYear:year},'テスト専用作品',`test-work-${i?'b':'a'}`)),statements:[]};
 data.entities.push(
 entity('b1',{type:'background',category:'history'},'テスト専用背景','test-background'),
 entity('p1',{type:'person',name:'テスト専用人物',disambiguation:'架空の制作者'},'テスト専用人物','test-person'),
 entity('l1',{type:'place',space:'earth',worldId:null,coordinates:{lat:35,lon:139},period:'テスト用の時代',precision:'approximate',evidenceRefs:['ev-l1']},'テスト専用の場所'),
 entity('e1',{type:'event',domain:'history',worldId:null,start:0,end:0,dateLabel:'紀元前1年',certainty:'exact',evidenceRefs:['ev-e1']},'テスト専用の出来事'),
 entity('s1',{type:'source',author:'架空の発行者',url:null,bibliography:'架空のテスト資料',accessedOn:'2026-09-23'},'テスト専用資料'));
 addStatement(data,'st1',{kind:'background',id:'b1'},'TEST_ONLY 背景説明');
 addEvidence(data,'ev-l1',{kind:'place',id:'l1'});addEvidence(data,'ev-e1',{kind:'event',id:'e1'});
 addRelation(data,'r1',{kind:'work',id:'w1'},{kind:'background',id:'b1'},'context');
 addRelation(data,'r2',{kind:'background',id:'b1'},{kind:'place',id:'l1'},'location');
 addRelation(data,'r3',{kind:'background',id:'b1'},{kind:'event',id:'e1'},'chronology');
 addRelation(data,'r4',{kind:'person',id:'p1'},{kind:'work',id:'w1'},'participation');
 addStatement(data,'spoiler-w1',{kind:'work',id:'w1'},'SPOILER_SENTINEL','depiction');
 data.statements.at(-1)!.spoilerWorkIds=['w1'];
 const source=entity('s-secret',{type:'source',author:'架空の発行者',url:null,bibliography:'架空の資料',accessedOn:'2026-09-23'},'SPOILER_SOURCE');source.spoilerWorkIds=['w1'];data.entities.push(source);
 const ev=data.entities.find(x=>x.id==='ev-spoiler-w1')!;if(ev.payload.type==='evidence')ev.payload.sourceId='s-secret';
 const place=entity('l-secret',{type:'place',space:'earth',worldId:null,coordinates:{lat:-20,lon:-100},period:'架空の検証時代',precision:'approximate',evidenceRefs:['ev-l-secret']},'SPOILER_PLACE');place.spoilerWorkIds=['w1'];data.entities.push(place);addEvidence(data,'ev-l-secret',{kind:'place',id:'l-secret'});
 addRelation(data,'r-secret-place',{kind:'background',id:'b1'},{kind:'place',id:'l-secret'},'location');
 addRelation(data,'r-related',{kind:'work',id:'w1'},{kind:'work',id:'w2'},'comparison');
 const reason=data.statements.find(x=>x.id==='reason-r-related')!;reason.markdown='SPOILER_RELATED';reason.spoilerWorkIds=['w1','w2'];
 const event=entity('e-secret',{type:'event',domain:'story',worldId:null,start:2000,end:2000,dateLabel:'テスト用2000年',certainty:'exact',evidenceRefs:['ev-e-secret']},'SPOILER_EVENT');event.spoilerWorkIds=['w1'];data.entities.push(event);addEvidence(data,'ev-e-secret',{kind:'event',id:'e-secret'});addRelation(data,'r-secret-event',{kind:'background',id:'b1'},{kind:'event',id:'e-secret'},'chronology');
 return data;
}
