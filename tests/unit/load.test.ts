import { expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseEntity } from '../../src/lib/content/schema';
import { loadDataset, readStatement } from '../../src/lib/content/load';
import { makeDataset } from '../fixtures/make-dataset';
it('requires explicit spoiler conditions and rejects unknown fields and mismatched payload', () => {
 const entity = makeDataset().entities[0];
 const {spoilerWorkIds, ...missing} = entity;
 expect(() => parseEntity(missing)).toThrow();
 expect(() => parseEntity({...entity, extra: true})).toThrow();
 expect(() => parseEntity({...entity, kind: 'person'})).toThrow();
 expect(() => parseEntity({...entity, review:{by:'x',date:'2026-02-30',revision:1}})).toThrow();
 expect(parseEntity(entity).safeTitle).toBe('テスト専用作品');
});
it('rejects missing frontmatter', () => expect(() => readStatement('本文だけ')).toThrow());
it('loads sorted JSON, ignores other extensions, rejects typed duplicate IDs and reports filenames', async () => {
 const root=await mkdtemp(join(tmpdir(),'atlas-'));
 try {
 await mkdir(join(root,'entities'));
 const e=makeDataset().entities[0];
 await writeFile(join(root,'entities','a.json'),JSON.stringify(e));
 await writeFile(join(root,'entities','ignored.txt'),'not JSON');
 expect((await loadDataset(root)).entities).toHaveLength(1);
 await writeFile(join(root,'entities','b.json'),JSON.stringify({...e,kind:'person',payload:{type:'person',name:'人',disambiguation:'テスト'}}));
 expect((await loadDataset(root)).entities).toHaveLength(2);
 await writeFile(join(root,'entities','b.json'),JSON.stringify(e));
 await expect(loadDataset(root)).rejects.toThrow(/DUPLICATE_ID/);
 await writeFile(join(root,'entities','b.json'),'{');
 await expect(loadDataset(root)).rejects.toThrow(/b.json/);
 } finally {await rm(root,{recursive:true,force:true});}
});
