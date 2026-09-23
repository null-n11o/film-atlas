import {mkdir,rm,writeFile,rename,copyFile,realpath} from 'node:fs/promises';
import {resolve,dirname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build,dev} from 'astro';
import {publish,assetUrl} from '../src/lib/content/publish';
import {loadDataset} from '../src/lib/content/load';
import {auditDist} from './audit-dist';
import type {Dataset} from '../src/lib/content/types';
export type Mode='production'|'e2e';
export async function stagePublication(data:Dataset,dir:string,mode:Mode){
 await rm(dir,{recursive:true,force:true});await mkdir(dir,{recursive:true});
 const publication=publish(data);const text=JSON.stringify({mode,...publication});
 if(mode==='production'&&text.includes('TEST_ONLY'))throw Error('TEST_ONLY in production');
 await writeFile(resolve(dir,'manifest.json'),text);
 return publication;
}
async function prepare(mode:Mode){
 const data=mode==='production'?await loadDataset('content'):(await import('../tests/fixtures/make-dataset')).makeDataset();
 await stagePublication(data,'.runtime/build/data',mode);
 const assetRoot=resolve('content/assets');
 for(const e of data.entities){if(e.status!=='published'||e.payload.type!=='asset')continue;
  const path=await realpath(e.payload.path);if(!path.startsWith((await realpath(assetRoot))+sep))throw Error('INVALID_ASSET_PATH');
  if(!/\.(png|jpg|jpeg|webp|gif|avif|txt)$/i.test(path))throw Error('UNSUPPORTED_ASSET_FORMAT');
  const target=resolve('.runtime/build/assets',assetUrl(e).slice('/assets/'.length));await mkdir(dirname(target),{recursive:true});await copyFile(path,target);
 }
}
export async function buildSite(mode:Mode):Promise<void>{
 const target=mode==='production'?'dist':'.runtime/e2e-dist';
 await rm(target,{recursive:true,force:true});await rm('.runtime/build',{recursive:true,force:true});
 try{await prepare(mode);process.env.FILM_ATLAS_BUILD_MODE=mode;await build({outDir:'.runtime/build/site/'});
 const issues=await auditDist('.runtime/build/site',mode);if(issues.length)throw Error(JSON.stringify(issues));await rename('.runtime/build/site',target);
 }finally{delete process.env.FILM_ATLAS_BUILD_MODE;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const mode=process.argv[2];if(mode==='dev'){await rm('.runtime/build',{recursive:true,force:true});await prepare('production');process.env.FILM_ATLAS_BUILD_MODE='production';await dev({server:{host:'127.0.0.1'}});}
 else if(mode==='production'||mode==='e2e')await buildSite(mode);else throw Error('Expected production, e2e, or dev');
}
