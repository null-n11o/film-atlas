import {expect,it} from 'vitest';
import {orderEvents} from '../../src/lib/timeline/order';
import {entity} from '../fixtures/make-dataset';
const event=(id:string,start:number|null,worldId:string|null=null,end=start)=>entity(id,{type:'event',domain:worldId?'story':'history',worldId,start,end,dateLabel:start===0?'紀元前1年':'年代',certainty:start===null?'unknown':'range',evidenceRefs:[]},id);
it('keeps year zero distinct from unknown and separates worlds and domains',()=>{const groups=orderEvents([event('unknown',null),event('b',0),event('a',-1),event('c',2,'world-a'),event('d',1,'world-b')]);expect(groups.find(g=>g.key==='history:earth')!.items.map(x=>x.id)).toEqual(['a','b']);expect(groups.find(g=>g.key==='history:earth:unknown')!.items.map(x=>x.id)).toEqual(['unknown']);expect(groups.some(g=>g.key==='story:world-a')).toBe(true);expect(groups.some(g=>g.key==='story:world-b')).toBe(true);});
it('orders overlapping ranges stably without changing labels',()=>{expect(orderEvents([event('b',1,null,3),event('a',1,null,3),event('c',1,null,2)])[0].items.map(x=>x.id)).toEqual(['c','a','b']);expect(orderEvents([])).toEqual([]);});
