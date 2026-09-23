import {mountSpoilers} from '../lib/spoilers/controller';
const data=document.querySelector<HTMLScriptElement>('#page-data');
const root=document.querySelector<HTMLElement>('[data-reading-root]');
if(data&&root){const {page,base,groups}=JSON.parse(data.textContent!);mountSpoilers(root,page,base,groups);}
