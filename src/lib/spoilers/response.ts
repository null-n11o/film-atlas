import {z} from 'zod';
import {entitySchema,statementSchema,payloadSchema} from '../content/schema';
import type {PayloadGroup} from '../content/types';
const publicPayload=z.union([payloadSchema.options[0],payloadSchema.options[1],payloadSchema.options[2],payloadSchema.options[3],payloadSchema.options[4],payloadSchema.options[5],payloadSchema.options[6],payloadSchema.options[7].omit({verificationNote:true}),payloadSchema.options[8].omit({path:true,checkedBy:true}).extend({publicUrl:z.string().regex(/^\/assets\/[a-f0-9]+\.[a-z0-9]+$/)})]);
// Only markup emitted by the constrained Markdown renderer crosses this boundary.
const html=z.string().refine(value=>!/<(?!\/?(?:p|strong|em|ul|ol|li|blockquote|code|br)(?:\s*\/?>))[^>]*>/i.test(value),'Unexpected HTML');
const entity=z.strictObject(entitySchema.shape).omit({review:true,revision:true,status:true,payload:true}).extend({payload:publicPayload}).refine(e=>e.kind===e.payload.type);
const statement=statementSchema.omit({review:true,revision:true,status:true,markdown:true}).extend({html});
const group=z.strictObject({token:z.string().regex(/^[a-f0-9]{24}$/),requires:z.array(z.string()),graph:z.strictObject({entities:z.array(entity),statements:z.array(statement)})});
export function parseGroup(value:unknown,expected:{token:string;requires:string[]}):PayloadGroup{
 const out=group.parse(value);
 if(out.token!==expected.token||JSON.stringify([...out.requires].sort())!==JSON.stringify([...expected.requires].sort()))throw Error('GROUP_MISMATCH');
 for(const item of [...out.graph.entities,...out.graph.statements])if(!expected.requires.every(id=>item.spoilerWorkIds.includes(id)))throw Error('GROUP_CONDITIONS_MISMATCH');
 return out;
}
