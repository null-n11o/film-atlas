import {defineConfig} from 'astro/config';
import {readFile,cp} from 'node:fs/promises';
export default defineConfig({output:'static',trailingSlash:'always',publicDir:'.runtime/build/assets-public',integrations:[{name:'reviewed-content-gate',hooks:{
 'astro:config:setup':async({command})=>{if(command==='preview'||command==='sync')return;const mode=process.env.FILM_ATLAS_BUILD_MODE;if(!['production','e2e'].includes(mode))throw Error('Use npm run build or npm run dev to validate content first');const manifest=JSON.parse(await readFile('.runtime/build/data/manifest.json','utf8'));if(manifest.mode!==mode)throw Error('CONTENT_MODE_MISMATCH');},
 'astro:build:done':async({dir})=>{try{await cp('.runtime/build/assets',new URL('assets/',dir),{recursive:true});}catch(e){if(e.code!=='ENOENT')throw e;}}
}}]});
