import {expect,it} from 'vitest';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import { stagePublication } from '../../scripts/build';
import {makeDataset} from '../fixtures/make-dataset';
it('replaces previous data and refuses test data in production',async()=>{const dir=await mkdtemp(join(tmpdir(),'atlas-build-'));try{await writeFile(join(dir,'old.json'),'OLD');const d=makeDataset();await stagePublication(d,dir,'e2e');await expect(readFile(join(dir,'old.json'))).rejects.toThrow();expect(await readFile(join(dir,'manifest.json'),'utf8')).toContain('test-work-a');const work=d.entities.find(x=>x.id==='w2')!;work.status='withdrawn';await stagePublication(d,dir,'e2e');expect(await readFile(join(dir,'manifest.json'),'utf8')).not.toContain('test-work-b');await expect(stagePublication(d,dir,'production')).rejects.toThrow('TEST_ONLY');}finally{await rm(dir,{recursive:true,force:true});}});
