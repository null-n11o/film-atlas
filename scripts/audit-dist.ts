import {readdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import type {Issue} from '../src/lib/content/types';
export async function auditDist(dir:string,mode:'production'|'e2e'):Promise<Issue[]>{
 const issues:Issue[]=[];
 async function scan(folder:string){for(const file of await readdir(folder,{withFileTypes:true})){const path=join(folder,file.name);if(file.isDirectory()){await scan(path);continue;}if(!/\.(html|json|js)$/.test(path))continue;const text=await readFile(path,'utf8');for(const sentinel of ['PRIVATE_REVIEW_NOTE',...(mode==='production'?['TEST_ONLY']:[])])if(text.includes(sentinel))issues.push({code:'PRIVATE_CONTENT',ref:path,message:sentinel});if(path.endsWith('.html')&&text.includes('SPOILER_SENTINEL'))issues.push({code:'SPOILER_LEAK',ref:path,message:'initial HTML'});}}
 await scan(dir);return issues;
}
