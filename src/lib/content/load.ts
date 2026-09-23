import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';
import { parseEntity, parseStatement } from './schema';
import type { Dataset } from './types';
export function readStatement(text:string){const p=matter(text);return parseStatement(p.data,p.content);}
async function files(dir:string,ext:string){try{return (await readdir(dir)).filter(x=>x.endsWith(ext)).sort();}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return [];throw e;}}
export async function loadDataset(root:string):Promise<Dataset>{
 const data:Dataset={entities:[],statements:[]};
 for(const [folder,ext] of [['entities','.json'],['statements','.md']]){
  for(const file of await files(join(root,folder),ext)){
   try{const raw=await readFile(join(root,folder,file),'utf8');if(folder==='entities')data.entities.push(parseEntity(JSON.parse(raw)));else data.statements.push(readStatement(raw));}
   catch(e){throw Error(`${folder}/${file}: ${String(e)}`);}
  }
 }
 const keys=new Set<string>();
 for(const item of [...data.entities.map(x=>({key:`${x.kind}:${x.id}`})),...data.statements.map(x=>({key:`content-statement:${x.id}`}))]){if(keys.has(item.key))throw Error(`DUPLICATE_ID ${item.key}`);keys.add(item.key);}
 return data;
}
