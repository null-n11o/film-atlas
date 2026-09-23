import {readFileSync} from 'node:fs';
import type {Publication,PublicEntity} from './types';
export function manifest():Publication & {mode:'production'|'e2e'}{return JSON.parse(readFileSync('.runtime/build/data/manifest.json','utf8'));}
export function pages(kind:string):PublicEntity[]{const m=manifest();const entries=new Map<string,PublicEntity>();for(const e of [...m.base.entities,...m.groups.flatMap(g=>g.graph.entities)])if(e.kind===kind&&!entries.has(e.id))entries.set(e.id,e);return [...entries.values()];}
