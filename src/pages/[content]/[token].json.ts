import {manifest} from '../../lib/content/manifest';
import type {PayloadGroup} from '../../lib/content/types';
export function getStaticPaths(){return manifest().groups.map(group=>({params:{content:"_content",token:group.token},props:{group}}));}
export function GET({props}:{props:{group:PayloadGroup}}){return new Response(JSON.stringify(props.group),{headers:{'Content-Type':'application/json','X-Robots-Tag':'noindex'}});}
